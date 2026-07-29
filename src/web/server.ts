import express from 'express';
import { OverkizCredentials } from '../somfy/types';

export interface WebServerCallbacks {
  onSaveCredentials: (credentials: OverkizCredentials) => Promise<boolean>;
  onForceSync: () => Promise<void>;
  getStatus: () => any;
}

export class WebServer {
  private app: express.Application;
  private port: number = 8080;

  constructor(callbacks: WebServerCallbacks) {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Status endpoint
    this.app.get('/api/status', (req, res) => {
      res.json(callbacks.getStatus());
    });

    // Config endpoint
    this.app.post('/api/config', async (req, res) => {
      const { username, password, serverUrl } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
      }

      const success = await callbacks.onSaveCredentials({ username, password, serverUrl });
      return res.json({ success });
    });

    // Force sync endpoint
    this.app.post('/api/sync', async (req, res) => {
      await callbacks.onForceSync();
      res.json({ success: true, message: 'Sync triggered' });
    });

    // Modern HTML UI
    this.app.get('/', (req, res) => {
      res.send(this.renderHtmlUI());
    });
  }

  public start(): void {
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`Web Configuration Admin UI running at http://0.0.0.0:${this.port}/`);
    });
  }

  private renderHtmlUI(): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Somfy 1870755 free@home SysAP 2 Addon</title>
  <style>
    :root {
      --primary: #0056b3;
      --bg: #f8f9fa;
      --card-bg: #ffffff;
      --text: #212529;
      --border: #dee2e6;
      --success: #28a745;
      --danger: #dc3545;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #0056b3, #0080ff);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      box-sizing: border-box;
    }
    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }
    .badge-success { background: var(--success); }
    .badge-danger { background: var(--danger); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
    }
    th { background: #f1f3f5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Somfy Connectivity Kit (1870755) Addon</h1>
      <p>Busch-Jaeger free@home SysAP 2 Integration (Rollläden, Fenster, Markisen)</p>
    </div>

    <div class="card">
      <h2>Somfy Zugangsdaten</h2>
      <form id="configForm">
        <div class="form-group">
          <label for="username">Somfy Account E-Mail / Benutzername</label>
          <input type="text" id="username" required placeholder="email@beispiel.de">
        </div>
        <div class="form-group">
          <label for="password">Passwort</label>
          <input type="password" id="password" required placeholder="••••••••">
        </div>
        <button type="submit">Speichern & Verbinden</button>
      </form>
      <div id="statusMsg" style="margin-top: 12px;"></div>
    </div>

    <div class="card">
      <h2>System Status</h2>
      <p>Status: <span id="connStatus" class="badge badge-danger">Nicht verbunden</span></p>
      <p>Synchronisierte Geräte: <strong id="deviceCount">0</strong></p>
      <button id="syncBtn">Geräte jetzt synchronisieren</button>
    </div>

    <div class="card">
      <h2>Erkannte Somfy Geräte</h2>
      <table>
        <thead>
          <tr>
            <th>Gerätename</th>
            <th>Kategorie</th>
            <th>Widget / Typ</th>
            <th>free@home Status</th>
          </tr>
        </thead>
        <tbody id="deviceTable">
          <tr><td colspan="4">Lade Geräte...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function loadStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        document.getElementById('connStatus').className = data.connected ? 'badge badge-success' : 'badge badge-danger';
        document.getElementById('connStatus').innerText = data.connected ? 'Verbunden' : 'Nicht verbunden';
        document.getElementById('deviceCount').innerText = data.devices ? data.devices.length : 0;

        if (data.credentials && data.credentials.username) {
          document.getElementById('username').value = data.credentials.username;
        }

        const tbody = document.getElementById('deviceTable');
        tbody.innerHTML = '';
        if (!data.devices || data.devices.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">Keine Geräte gefunden. Bitte Zugangsdaten prüfen.</td></tr>';
        } else {
          data.devices.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td>\${d.label}</td>
              <td><strong>\${d.category}</strong></td>
              <td>\${d.widget}</td>
              <td><span class="badge badge-success">Gekoppelt</span></td>
            \`;
            tbody.appendChild(tr);
          });
        }
      } catch (err) {
        console.error('Error fetching status:', err);
      }
    }

    document.getElementById('configForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const statusMsg = document.getElementById('statusMsg');

      statusMsg.innerText = 'Verbinde mit Somfy...';
      statusMsg.style.color = '#0056b3';

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await res.json();
      if (result.success) {
        statusMsg.innerText = 'Verbindung erfolgreich!';
        statusMsg.style.color = 'green';
        loadStatus();
      } else {
        statusMsg.innerText = 'Verbindung fehlgeschlagen. Bitte Zugangsdaten prüfen.';
        statusMsg.style.color = 'red';
      }
    });

    document.getElementById('syncBtn').addEventListener('click', async () => {
      await fetch('/api/sync', { method: 'POST' });
      loadStatus();
    });

    loadStatus();
    setInterval(loadStatus, 10000);
  </script>
</body>
</html>`;
  }
}
