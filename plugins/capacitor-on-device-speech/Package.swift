// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "RewireperformCapacitorOnDeviceSpeech",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "RewireperformCapacitorOnDeviceSpeech",
            targets: ["OnDeviceSpeechPlugin"]
        )
    ],
    dependencies: [
        .package(
            url: "https://github.com/ionic-team/capacitor-swift-pm.git",
            exact: "8.4.1"
        )
    ],
    targets: [
        .target(
            name: "OnDeviceSpeechPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/OnDeviceSpeechPlugin"
        )
    ]
)
