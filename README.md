# Somfy 1870755 free@home SysAP 2 Addon

Busch-Jaeger free@home System Access Point 2 Addon zur Einbindung des **Somfy Connectivity Kit (1870755)**. 

Mit diesem Addon lassen sich Somfy **Rollläden**, **Fenster** und **Markisen** (io-homecontrol und RTS) nahtlos als virtuelle Geräte im Busch-Jaeger free@home System betreiben.

---

## Funktionen

- 🔄 **Bi-direktionale Steuerung**:
  - Steuerung über free@home Wandtaster, Touchpanels und die free@home Next App.
  - Rückmeldung von Status- & Positionsänderungen in Echtzeit / Polling.
- 🪟 **Unterstützte Gerätetypen**:
  - **Rollläden** (`RollerShutter` -> free@home `BlindActuator`: Auf/Zu, Stopp, Position 0-100%).
  - **Markisen** (`Awning` / `Pergola` -> free@home `BlindActuator`: Ausfahren/Einfahren, Stopp, Position).
  - **Fenster** (`WindowOpener` / `WindowHandle` -> free@home `WindowSensor`: Offen, Geschlossen, Gekippt).
- 🌐 **Web-Konfigurations-Oberfläche**:
  - Einfache Einrichtung der Somfy Zugangsdaten über die integrierte Web-Oberfläche auf Port 8080.
- 📦 **Automatische Releases**:
  - GitHub Actions baut bei jedem Release automatisch das installierbare `.zip`-Paket für den SysAP.

---

## Installation auf dem free@home System Access Point (SysAP 2.0 / 3.0)

1. Lade das neueste Release-Archiv (`somfy-freeathome-addon-vX.Y.Z.zip`) von der [GitHub Release Seite](../../releases) herunter.
2. Öffne die free@home Benutzeroberfläche deines System Access Points in deinem Browser.
3. Navigiere zu **Einstellungen -> System-Einstellungen -> Erweiterungen / Addons**.
4. Klicke auf **Addon hochladen / Addon installieren** und wähle die heruntergeladene `.zip`-Datei aus.
5. Nach der Installation starte das Addon und öffne die Addon-Konfigurationsseite.
6. Gib deine Somfy Benutzerdaten (E-Mail & Passwort) ein und klicke auf **Speichern & Verbinden**.
7. Deine Rollläden, Fenster und Markisen werden automatisch als virtuelle Aktoren im free@home System registriert.

---

## Entwicklung & Lokales Bauen

```bash
# Repository klonen
git clone https://github.com/<your-user>/somfy-freeathome-addon.git
cd somfy-freeathome-addon

# Abhängigkeiten installieren
npm install

# TypeScript kompilieren
npm run build

# Addon ZIP Paket manuell erstellen
npm run package
```

---

## Lizenz
MIT License
