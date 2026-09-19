# Feedback Intelligence – synthetischer Staging-One-Shot v0.3

Der freigegebene Einmalzyklus ist abgeschlossen und vollständig zurückgebaut.
Der erste v0.2-Versuch stoppte vor Replay-Headern, Request-ID, Budgetverbrauch
und Netzwerk, weil ein leerer Keychain-Wert erkannt wurde. Dieser Zustand bleibt
als eigener, bytegepinnter Abort-Nachweis erhalten; es gab keinen Retry in
diesem Zyklus.

Der getrennte v0.3-Zyklus nutzte einen neuen Runtime- und Keychain-Namespace.
Der Schlüssel gelangte ausschließlich über stdin in einen Swift-Helfer auf
Basis von Security.framework und wurde vor dem Armieren zurückgelesen. Genau
ein synthetischer DE-Staging-Request erhielt HTTP 200 und validierte 825 Items
über alle 55 Fragen gegen Export v0.2 und Founder-Semantik v0.3. Die Response
blieb im Arbeitsspeicher; Rohresponse, Rohtexte und subject_reference wurden
nicht persistiert.

Nach dem Request wurden alle vier Edge-Secrets entfernt, das Reader-Passwort
auf NULL gesetzt, alle Consumer-/Synthetic-/Machine-/Production-Gates
geschlossen, sämtliche Fixture-Zeilen entfernt und der lokale Keychain-Eintrag
gelöscht. Der abschließende metadata-only Audit bestätigt weiterhin exakt eine
Reader-RPC sowie keine Relationen-, Sequenz- oder PUBLIC-Nebenrechte.

Dieses Paket ist ein sanitiserter Staging-Nachweis. Es aktiviert weder
Production noch Echtdaten, Push oder Merge und ersetzt keine Legal-, Privacy-,
Minor- oder App-Store-Freigabe.
