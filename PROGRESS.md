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

### [x] Meilenstein 2: Log-Analyse & SysAP Reverse Domain ID Fix
- **Erfolgreich umgesetzt**:
  - Auswertung des bereitgestellten SysAP Diagnose-Logs (`freeathome-journal-2026-07-29T10.57.25.txt` & `scripting-journals`).
  - Identifizierung des `mrha_scriptinghost` Systemd-Dienst-Namensschemas (`de.<vendor>.<appname>`).
  - Umstellung der ID in `free-at-home-metadata.json` und `manifest.json` auf **`de.somfy.freeathome`** für Systemd-Kompatibilität.
  - Hinzufügen von `freeathome-app-log*` zu `.gitignore`.

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
  - Standalone-Betrieb unterstützt: Das Addon kann direkt im SysAP ODER extern (z. B. Docker / Raspberry Pi / PC) laufen.

---

### [x] Meilenstein 6: Clean Filename ZIP & Automated Releases
- **Erfolgreich umgesetzt**:
  - [.github/workflows/release.yml](file:///home/stefan-seyerl/repos/somfy@free@home/.github/workflows/release.yml) erstellt nun zusätzlich die Datei **`somfy-freeathome-addon.zip`** ohne Punkte im Dateinamen.
