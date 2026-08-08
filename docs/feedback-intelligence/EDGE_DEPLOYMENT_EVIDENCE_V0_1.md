# Feedback Intelligence – Edge Deployment Evidence v0.1

Die Supabase-Deploymentantwort und die nachträgliche reine Metadateninspektion
bestätigen dieselbe Function-ID, Version, Status, `verify_jwt=false` und den
gleichen opaken `ezbr_sha256`-Bundle-Identifier.

Alle sechs von `get_edge_function` zurückgelieferten Dateien wurden bytegenau
gegen die lokalen Gateway-Dateien gehasht. Jeder Einzelhash und der
deterministische Source-Manifest-Hash stimmen. `supabase/config.toml` ist
separat gepinnt und enthält für genau diese Function `verify_jwt = false`; die
Function implementiert deshalb ihre eigene konstante Machine-Key-Prüfung.

Der Supabase-`ezbr_sha256` wird ausdrücklich nicht als lokaler Source-Hash
ausgegeben: Seine Kanonisierung ist ein interner Supabase-Bundle-Mechanismus.
Die lokale/remote Bytegleichheit wird stattdessen durch die sechs
zurückgelesenen Einzeldateien bewiesen.

Es wurden noch keine fünf Runtime-Konfigurationen provisioniert. Es fand keine
HTTP-Invocation statt. Production bleibt `false`.
