# Plan zur Umsetzung: free@home SysAP 2 Addon für Somfy 1870755 (Connectivity Kit)

Dieses Dokument beschreibt den detaillierten Umsetzungsplan für das Busch-Jaeger free@home SysAP 2 Addon zur Einbindung von Somfy Rollläden, Fenstern und Markisen über das Somfy 1870755 Connectivity Kit.

## Zielsetzung & Funktionsumfang
1. **Somfy 1870755 Integration**:
   - Anbindung des Somfy 1870755 Connectivity Kit über die Somfy Cloud / Overkiz API.
   - Einbindung von **Rollläden** (Roller Shutters / io & RTS).
   - Einbindung von **Fenstern** (Windows / Velux / Fensterkontakte & Fensterantriebe).
   - Einbindung von **Markisen** (Awnings / Pergola / io & RTS).
2. **free@home SysAP 2 Virtuelle Geräte**:
   - Automatische Registrierung virtueller Geräte im free@home System Access Point.
   - Map-Typen: `BlindActuator` (für Rollläden & Markisen) und `Window` / `WindowSensor` (für Fenster).
   - Birektionale Synchronisation (Steuerung via free@home Taster/App -> Somfy API & Somfy Statusänderungen -> free@home UI).
3. **Web-Konfigurations-UI**:
   - Integrierte Admin-Oberfläche im Addon zur Eingabe der Somfy Zugangsdaten und Auswahl zu synchronisierender Geräte.
4. **Fortschrittsdokumentation & Recovery**:
   - Nachverfolgung aller Teilerfolge in `PROGRESS.md`.
5. **GitHub Release Automation**:
   - Entwurf und Erstellung des GitHub-Repositories.
   - GitHub Actions Workflow (`.github/workflows/release.yml`) zur automatischen Erstellung und Bereitstellung der installierbaren `.zip` Dateien bei Release-Tags.

## Phasen der Umsetzung

### Phase 1: Projektstruktur & Metadata (Initialisierung)
- Node.js / TypeScript Projekt-Setup (`package.json`, `tsconfig.json`, `free-at-home-metadata.json`).
- Erstellung von `IMPLEMENTATION_PLAN.md` und `PROGRESS.md`.

### Phase 2: Somfy Overkiz API Client Engine
- Implementierung der Somfy Overkiz API Authentifizierung (Somfy Europe Endpunkt).
- Abfragen aller Geräte und Kategorisierung nach Rollladen (`RollerShutter`), Fenster (`Window`), Markise (`Awning`).
- Befehlsausführung (`open`, `close`, `stop`, `setPosition`).

### Phase 3: free@home SysAP Virtual Device Integration
- Einbindung der `@busch-jaeger/free-at-home` API / SysAP REST & WebSocket API.
- Registrierung und Verwaltung virtueller Aktoren (`BlindActuator`, `Window`).
- Bi-direktionaler Datenpunktaustausch (`idp0000`, `idp0002`, `odp0000`, `odp0001`, `odp0002`).

### Phase 4: Web Konfigurations-Interface
- Express Webserver mit Konfigurations-UI auf Port 8080.
- Zugangsdaten-Speicherung & Gerätediscovery-Status.

### Phase 5: GitHub Actions & ZIP-Release Packaging
- GitHub Actions `.github/workflows/release.yml` für automatische ZIP-Bündelung.
- Erstellen der Ausführungs- und Installationsanleitung (`README.md`).

### Phase 6: Veröffentlichung & Fortschrittsprotokollierung
- Zusammenfassung aller Erfolge in `PROGRESS.md`.
