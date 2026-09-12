import AVFoundation
import Capacitor
import Foundation
import Speech
import UIKit

private enum OnDeviceSpeechPermission: String {
    case granted
    case denied
    case prompt
}

@objc(OnDeviceSpeechPlugin)
public final class OnDeviceSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OnDeviceSpeechPlugin"
    public let jsName = "OnDeviceSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise)
    ]

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var speechRecognizer: SFSpeechRecognizer?
    private var hasInstalledTap = false
    private var isActive = false
    private var lastTranscript = ""
    private var activeSessionID = UUID()

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc public func getAvailability(_ call: CAPPluginCall) {
        let language = call.getString("language") ?? Locale.current.identifier
        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language))
        let supportsOnDevice = recognizer?.supportsOnDeviceRecognition ?? false

        call.resolve([
            "available": supportsOnDevice && (recognizer?.isAvailable ?? false),
            "supportsOnDevice": supportsOnDevice,
            "language": language
        ])
    }

    @objc public func start(_ call: CAPPluginCall) {
        guard !isActive else {
            call.reject("Speech recognition is already active.", "ALREADY_ACTIVE")
            return
        }

        guard permissionState == .granted else {
            call.reject("Speech recognition permission is not granted.", "PERMISSION_DENIED")
            return
        }

        let language = call.getString("language") ?? Locale.current.identifier
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)) else {
            call.reject("The selected language is not supported.", "UNSUPPORTED_LANGUAGE")
            return
        }

        guard recognizer.supportsOnDeviceRecognition else {
            call.reject("On-device speech recognition is unavailable.", "ON_DEVICE_UNAVAILABLE")
            return
        }

        guard recognizer.isAvailable else {
            call.reject("Speech recognition is temporarily unavailable.", "RECOGNIZER_UNAVAILABLE")
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        request.contextualStrings = (call.getArray("contextualStrings", String.self) ?? [])
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        if #available(iOS 16.0, *) {
            request.addsPunctuation = true
        }

        let sessionID = UUID()
        activeSessionID = sessionID
        lastTranscript = ""
        speechRecognizer = recognizer
        recognitionRequest = request

        do {
            try configureAudioSession()
            try installAudioTap(for: request)
        } catch {
            finishSession(cancelTask: true, notifyStopped: false)
            call.reject(
                "Unable to start on-device speech recognition.",
                "AUDIO_START_FAILED",
                error
            )
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, self.isActive, self.activeSessionID == sessionID else {
                    return
                }

                if let result {
                    let transcript = result.bestTranscription.formattedString
                        .trimmingCharacters(in: .whitespacesAndNewlines)

                    if !transcript.isEmpty {
                        self.lastTranscript = transcript
                        self.notifyListeners("transcript", data: [
                            "transcript": transcript,
                            "isFinal": result.isFinal
                        ])
                    }

                    if result.isFinal {
                        self.finishSession(cancelTask: false, notifyStopped: true)
                        return
                    }
                }

                if let error {
                    self.notifyListeners("speechError", data: [
                        "code": self.errorCode(for: error),
                        "message": error.localizedDescription
                    ])
                    self.finishSession(cancelTask: true, notifyStopped: true)
                }
            }
        }

        isActive = true
        notifyListeners("stateChange", data: ["state": "listening"])
        call.resolve(["listening": true])
    }

    @objc public func stop(_ call: CAPPluginCall) {
        let transcript = lastTranscript
        finishSession(cancelTask: true, notifyStopped: true)
        call.resolve(["transcript": transcript])
    }

    @objc public func cancel(_ call: CAPPluginCall) {
        finishSession(cancelTask: true, notifyStopped: true)
        call.resolve()
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["speechRecognition": permissionState.rawValue])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                DispatchQueue.main.async {
                    call.resolve(["speechRecognition": OnDeviceSpeechPermission.denied.rawValue])
                }
                return
            }

            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    let result: OnDeviceSpeechPermission = granted ? .granted : .denied
                    call.resolve(["speechRecognition": result.rawValue])
                }
            }
        }
    }

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(
            .playAndRecord,
            mode: .spokenAudio,
            options: [.duckOthers, .allowBluetoothHFP]
        )
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func installAudioTap(for request: SFSpeechAudioBufferRecognitionRequest) throws {
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        hasInstalledTap = true

        audioEngine.prepare()
        try audioEngine.start()
    }

    private func finishSession(cancelTask: Bool, notifyStopped: Bool) {
        let wasActive = isActive
        isActive = false

        if audioEngine.isRunning {
            audioEngine.stop()
        }

        if hasInstalledTap {
            audioEngine.inputNode.removeTap(onBus: 0)
            hasInstalledTap = false
        }

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        if cancelTask {
            recognitionTask?.cancel()
        }
        recognitionTask = nil
        speechRecognizer = nil

        do {
            try AVAudioSession.sharedInstance().setActive(
                false,
                options: .notifyOthersOnDeactivation
            )
        } catch {
            // Best-effort cleanup; recognition is already stopped locally.
        }

        if notifyStopped && wasActive {
            notifyListeners("stateChange", data: ["state": "stopped"])
        }
    }

    @objc private func handleAppWillResignActive() {
        finishSession(cancelTask: true, notifyStopped: true)
    }

    private var permissionState: OnDeviceSpeechPermission {
        let speechStatus = SFSpeechRecognizer.authorizationStatus()
        let microphoneStatus = AVAudioSession.sharedInstance().recordPermission

        if speechStatus == .denied ||
            speechStatus == .restricted ||
            microphoneStatus == .denied {
            return .denied
        }

        if speechStatus == .notDetermined || microphoneStatus == .undetermined {
            return .prompt
        }

        return .granted
    }

    private func errorCode(for error: Error) -> String {
        let nativeError = error as NSError
        let domain = nativeError.domain
            .replacingOccurrences(
                of: "[^A-Za-z0-9]+",
                with: "_",
                options: .regularExpression
            )
            .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
            .uppercased()

        return domain.isEmpty ? "IOS_\(nativeError.code)" : "\(domain)_\(nativeError.code)"
    }
}
