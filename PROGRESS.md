# Fortschrittsdokumentation (PROGRESS.md)

Dieses Dokument dient der Protokollierung aller erreichten Meilensteine und Erfolge beim Erstellen des **free@home SysAP 2 Addons für Somfy 1870755 (Connectivity Kit)**. Bei etwaigen Unterbrechungen kann die Arbeit hier anknüpfend fortgesetzt werden.

---

## Meilensteine & Erfolge

### [x] Meilenstein 1: Recherche & Architekturentwurf
- **Erfolgreich umgesetzt**:
  - Technische Analyse des Somfy Connectivity Kit 1870755 (Cloud-native Overkiz API Anbindung für io-homecontrol & RTS Geräte).
  - Ermittlung der Struktur für Busch-Jaeger free@home SysAP 2.0 / 3.0 Addons (`free-at-home-metadata.json`, `@busch-jaeger/free-at-home` API, virtuelle Geräte `BlindActuator` & `Window`).
  - Erstellung der initialen Umsetzungspläne (`IMPLEMENTATION_PLAN.md` & `implementation_plan.md`).

---

### [x] Meilenstein 2: Nativer SysAP Upload Fix (.tar.gz & Validierungs-Schema)
- **Erfolgreich umgesetzt**:
  - **Upload-Erfolg erreicht**: Korrektur von `free-at-home-metadata.json` (`"type": "app"`, `"entryPoint": "dist/index.js"`, lokalisierte `description`-Objekte, `id: "de.movingllama.somfy"`).
  - Duales Verpacken in `.tar.gz` und `.zip` in [.github/workflows/release.yml](file:///home/stefan-seyerl/repos/somfy@free@home/.github/workflows/release.yml). Der SysAP entpackt das Addon nun nativ ohne Fehler!

---

### [x] Meilenstein 3: Native SysAP Addon Konfiguration (Parameters UI)
- **Erfolgreich umgesetzt**:
  - `free-at-home-metadata.json` um den Key `"parameters"` erweitert: Das SysAP rendert im Web-UI (*Einstellungen -> Addons -> Einstellungen*) nun native Eingabefelder für:
    - **Somfy E-Mail / Benutzername** (`somfyUsername`)
    - **Somfy Passwort** (`somfyPassword` mit Sternchen-Maskierung)
    - **Abfrage-Intervall** in Sekunden (`pollingInterval`)
  - [src/freeathome/manager.ts](file:///home/stefan-seyerl/repos/somfy@free@home/src/freeathome/manager.ts) reagiert live auf Parameteränderungen im SysAP-UI (`configurationChanged` / `parameterChanged` Events).

---

### [x] Meilenstein 4: Robustes Overkiz Login & Multi-Endpoint Fallback
- **Erfolgreich umgesetzt**:
  - [src/somfy/client.ts](file:///home/stefan-seyerl/repos/somfy@free@home/src/somfy/client.ts): Automatische Anmeldung über primäre und sekundäre Overkiz Endpunkte (`ha101-1.overkiz.com`, `ha201-1.overkiz.com`).
  - Automatischer Re-Login bei Cookie/Session-Ablauf (401/403 HTTP Fehler) während Hintergrundabfragen oder Befehlsausführungen.

---

### [x] Meilenstein 5: Autor (MovingLlama) & Dynamische Release-Versionssynchronisation
- **Erfolgreich umgesetzt**:
  - Herausgeber / Autor in `free-at-home-metadata.json` und `package.json` auf **`MovingLlama`** umgestellt.
  - Automatischer Sync der Manifest-Version im Release-Workflow: Die Version im Manifest entspricht nun bei jedem GitHub-Release exakt der GitHub-Release-Tag-Version (z. B. `1.0.1.8`).
