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

### [x] Meilenstein 2: Log-Analyse & Ziel-Audit (Diff-Analyse zu ha-free-at-home-plugin)
- **Erfolgreich umgesetzt**:
  - Exakter Quellcode- & Manifest-Vergleich mit der funktionierenden Referenz-Integration (`piushartmann/ha-free-at-home-plugin`).
  - **Erkenntnis 1 (ID Match)**: `free-at-home-metadata.json` (`"id"`) MUSS 1:1 mit `package.json` (`"name"`) übereinstimmen (`somfy-freeathome-addon`). Ein Mismatch führte zur Entpacker-Ablehnung im SysAP!
  - **Erkenntnis 2 (Keine doppelten Manifeste)**: Entfernen der redundant erstellten `manifest.json`, da doppelte Manifest-Dateien im ZIP-Root als valider Mehrfach-Header-Konflikt vom Parser abgelehnt wurden.
  - **Erkenntnis 3 (Node.js ES2018 Transpilation Target)**: Umstellung des `@vercel/ncc` Bundlers auf `--target es2018`, um neuere JavaScript Syntax (ES2022+), die auf dem älteren SysAP Node-Runtime Environment Syntax-Errors auslöst, auf abwärtskompatibles ES2018 zu transpileren.

---

### [x] Meilenstein 3: Somfy Overkiz Client (API Integration)
- **Erfolgreich umgesetzt**:
  - `src/somfy/types.ts`: Typdefinitionen für Overkiz Geräte, Befehle und Zustände.
  - `src/somfy/client.ts`: `SomfyOverkizClient` mit Somfy Cloud Authentifizierung (`/login` mit JSESSIONID Verwaltung), automatischem Re-Login bei Tokenablauf, Abfragen aller registrierten Somfy 1870755 Geräte sowie Ausführung von Steuerbefehlen (`open`, `close`, `stop`, `setClosure` / `setPosition` / `setDeployment`).
  - `src/mapping/device-mapper.ts`: Zuordnungslogik zur automatischen Kategorisierung von Somfy Widgets in Rollläden (`shutter`), Markisen (`awning`) und Fenster (`window`) sowie Extraktion von Positions- & Öffnungszuständen.

---

### [x] Meilenstein 4: free@home SysAP Virtual Device Manager (Dynamic Method Resolution)
- **Erfolgreich umgesetzt**:
  - `src/freeathome/types.ts`: Typdefinitionen für free@home Datenpunkte.
  - `src/freeathome/manager.ts`: `FreeAtHomeManager` zur nativen Einbindung über `@busch-jaeger/free-at-home` / SysAP API mit dynamischem Method-Matching für `createBlindActuatorDevice` / `createBlindDevice` und `createWindowSensorDevice`.
  - Registrierung virtueller Aktoren (`BlindActuator` für Rollläden & Markisen, `WindowSensor` für Fenster).
  - Bi-direktionale Datenpunkt-Synchronisation: Weiterleitung von Taster- & App-Befehlen aus free@home an das Connectivity Kit sowie Aktualisierung der Datenpunkte (`odp0000`) im free@home SysAP bei Somfy Statusänderungen.

---

### [x] Meilenstein 5: Web UI Konfigurations-Interface & Standalone API Modus
- **Erfolgreich umgesetzt**:
  - `src/web/server.ts`: Express-basierte Admin-Oberfläche auf Port 8080 zur bequemen Eingabe der Somfy Account-Zugangsdaten (E-Mail/Passwort), Verbindungsprüfung und tabellarischen Übersicht aller gekoppelten Somfy Rollläden, Fenster und Markisen.

---

### [x] Meilenstein 6: Clean Filename ZIP & Automated Releases
- **Erfolgreich umgesetzt**:
  - [.github/workflows/release.yml](file:///home/stefan-seyerl/repos/somfy@free@home/.github/workflows/release.yml) erstellt nun ein flaches, ES2018-kompatibles **`somfy-freeathome-addon.zip`** ohne Punkte im Dateinamen.
