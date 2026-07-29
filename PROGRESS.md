# Fortschrittsdokumentation (PROGRESS.md)

Dieses Dokument dient der Protokollierung aller erreichten Meilensteine und Erfolge beim Erstellen des **free@home SysAP 2 Addons für Somfy 1870755 (Connectivity Kit)**. bei etwaigen Unterbrechungen kann die Arbeit hier anknüpfend fortgesetzt werden.

---

## Meilensteine & Erfolge

### [x] Meilenstein 1: Recherche & Architekturentwurf
- **Erfolgreich umgesetzt**:
  - Technische Analyse des Somfy Connectivity Kit 1870755 (Cloud-native Overkiz API Anbindung für io-homecontrol & RTS Geräte).
  - Ermittlung der Struktur für Busch-Jaeger free@home SysAP 2.0 / 3.0 Addons (`free-at-home-metadata.json`, `@busch-jaeger/free-at-home` API, virtuelle Geräte `BlindActuator` & `Window`).
  - Erstellung der initialen Umsetzungspläne (`IMPLEMENTATION_PLAN.md` & `implementation_plan.md`).

---

### [x] Meilenstein 2: Projekt-Setup & Manifest-Erstellung
- **Erfolgreich umgesetzt**:
  - Node.js & TypeScript Projekt-Konfiguration (`package.json`, `tsconfig.json`).
  - Erstellung der SysAP Addon-Manifestdatei `free-at-home-metadata.json` mit ID `somfy-connectivity-kit-addon`, Admin-Web-UI Konfiguration (Port 8080) und Deklaration der virtuellen Gerätetypen (`BlindActuator`, `WindowSensor`).

---

### [x] Meilenstein 3: Somfy Overkiz Client (API Integration)
- **Erfolgreich umgesetzt**:
  - `src/somfy/types.ts`: Typdefinitionen für Overkiz Geräte, Befehle und Zustände.
  - `src/somfy/client.ts`: `SomfyOverkizClient` mit Somfy Cloud Authentifizierung (`/login` mit JSESSIONID Verwaltung), automatischem Re-Login bei Tokenablauf, Abfragen aller registrierten Somfy 1870755 Geräte sowie Ausführung von Steuerbefehlen (`open`, `close`, `stop`, `setClosure` / `setPosition` / `setDeployment`).
  - `src/mapping/device-mapper.ts`: Zuordnungslogik zur automatischen Kategorisierung von Somfy Widgets in Rollläden (`shutter`), Markisen (`awning`) und Fenster (`window`) sowie Extraktion von Positions- & Öffnungszuständen.

---

### [x] Meilenstein 4: free@home SysAP Virtual Device Manager
- **Erfolgreich umgesetzt**:
  - `src/freeathome/types.ts`: Typdefinitionen für free@home Datenpunkte.
  - `src/freeathome/manager.ts`: `FreeAtHomeManager` zur nativen Einbindung über `@busch-jaeger/free-at-home` / SysAP API.
  - Registrierung virtueller Aktoren (`BlindActuator` für Rollläden & Markisen, `WindowSensor` für Fenster).
  - Bi-direktionale Datenpunkt-Synchronisation: Weiterleitung von Taster- & App-Befehlen aus free@home an das Connectivity Kit sowie Aktualisierung der Datenpunkte (`odp0000`) im free@home SysAP bei Somfy Statusänderungen.

---

### [x] Meilenstein 5: Web UI Konfigurations-Interface
- **Erfolgreich umgesetzt**:
  - `src/web/server.ts`: Express-basierte Admin-Oberfläche auf Port 8080 zur bequemen Eingabe der Somfy Account-Zugangsdaten (E-Mail/Passwort), Verbindungsprüfung und tabellarischen Übersicht aller gekoppelten Somfy Rollläden, Fenster und Markisen.

---

### [x] Meilenstein 6: Hauptsteuerung & GitHub Actions Release Packaging (.zip)
- **Erfolgreich umgesetzt**:
  - `src/index.ts`: Orchestrierung aller Komponenten, Laden/Speichern von Zugangsdaten, periodisches State-Polling (alle 30s) und Befehlsrouting.
  - `.github/workflows/release.yml`: GitHub Actions Workflow zur automatischen Kompilierung und Bündelung des Addons in installierbare `.zip`-Dateien bei Veröffentlichung von Release-Tags (z.B. `v1.0.0`).
  - `README.md`: Ausführliche Installations- und Bedienungsanleitung für das Busch-Jaeger free@home SysAP 2 System.
