# Installation Guide

# Linux Installation Guide

Below are all the steps needed to clone the **IDS_Demo** repository (with API in `risk_api/` and front-end in `risk-dashboard/`), install dependencies, configure the database, and run both back-end and front-end on a Linux server.

---

### 1 Prerequisites on a Linux Server

1. SSH into your Linux server (Linux).
2. Update package lists:

   ```bash
   sudo apt update
   ```

3. Install system packages:

   ```bash
   sudo apt install -y \
     python3 python3-venv python3-pip \
     postgresql postgresql-contrib \
     nodejs npm \
     git
   ```

   - **python3, python3-venv, python3-pip**: for the FastAPI backend
   - **postgresql, postgresql-contrib**: for the PostgreSQL database
   - **nodejs, npm**: for building the React front-end
   - **git**: to clone the repository

---

### 2 Clone the IDS_Demo Repository

1. Choose a location to host the code, for example:

   ```bash
   cd /home/ossec
   ```

2. Clone from GitHub (replace with your actual repo URL if different):

   ```bash
   git clone https://github.com/your-org/IDS_Demo.git
   cd IDS_Demo
   ```

3. You should now have two key folders:

   ```
   /home/ossec/IDS_Demo/
   ├── risk_api/         ← FastAPI back-end
   └── risk-dashboard/   ← React + Vite + Tailwind front-end
   ```

---

### 3 Configure PostgreSQL for the API

> We’ll create a database named `riskdb` and a role `riskuser` with full privileges.

1. Switch to the `postgres` superuser:

   ```bash
   sudo -u postgres psql
   ```

2. Create database and user (run each line in the `psql` prompt):

   ```sql
   CREATE DATABASE riskdb;
   CREATE USER riskuser WITH PASSWORD 'riskpassword';
   GRANT ALL PRIVILEGES ON DATABASE riskdb TO riskuser;
   \q
   ```

3. Grant `public` schema permissions (still as `postgres`):

   ```bash
   sudo -u postgres psql -d riskdb -c "GRANT USAGE ON SCHEMA public TO riskuser;"
   sudo -u postgres psql -d riskdb -c "GRANT CREATE ON SCHEMA public TO riskuser;"
   ```

---

### 4 Set Up Environment Variables

In order for the API to connect to Postgres (and to VirusTotal if used), set these in your shell (e.g., add to `~/.bashrc` or `~/.profile`):

```bash
# In bash / zsh on the Wazuh server:
echo 'export DATABASE_URL="postgresql+asyncpg://riskuser:riskpassword@localhost:5432/riskdb"' >> ~/.bashrc
# If using VirusTotal, also add:
echo 'export VT_API_KEY="your_virustotal_api_key_here"' >> ~/.bashrc
# Reload the file:
source ~/.bashrc
```

- **DATABASE_URL** must match the credentials you created above
- **VT_API_KEY** is only needed if you enabled VT enrichment in the API

---

### 5 Install & Run the FastAPI Back-end

1. Enter the back-end folder:

   ```bash
   cd /home/ossec/IDS_Demo/risk_api
   ```

2. Create and activate a Python virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install Python dependencies:

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install httpx             # if not already in requirements.txt
   ```

4. Apply any schema changes (if you’ve added `vt_score` to the model):

   - If this is a fresh install, tables will be created automatically on startup by SQLAlchemy.
   - If re-deploying over existing data, ensure `alerts` has `vt_score`:

     ```bash
     sudo -u postgres psql -d riskdb -c "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS vt_score INTEGER;"
     ```

5. Start the API server (keep this running in a dedicated tmux/screen):

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   - Listens on all interfaces so the front-end (served on port 80/3000) can reach it at `http://127.0.0.1:8000`
   - The API should now be reachable at `http://<WAZUH_IP>:8000`

---

### 6 Build & Serve the React Front-end

1. Open a new shell (or a new tmux pane) on the Wazuh server.
2. Install front-end dependencies (inside `risk-dashboard`):

   ```bash
   cd /home/ossec/IDS_Demo/risk-dashboard
   npm install
   ```

3. Build a production bundle:

   ```bash
   npm run build
   ```

   - This outputs static files into `risk-dashboard/dist/`

4. Install a static-file server (we’ll use `serve` for simplicity) or configure Nginx:

   ```bash
   sudo npm install -g serve
   ```

5. Run a local static server on port 3000:

   ```bash
   serve -s dist -l 3000
   ```

   - The front-end will now be accessible at `http://<WAZUH_IP>:3000`

> **Optional Nginx configuration** (instead of `serve`):
>
> Create `/etc/nginx/sites-available/risk_dashboard` with:
>
> ```nginx
> server {
>   listen 80;
>   server_name _;
>   root /home/ossec/IDS_Demo/risk-dashboard/dist;
>   index index.html;
>   location / {
>     try_files $uri /index.html;
>   }
> }
> ```
>
> Then:
>
> ```bash
> sudo ln -s /etc/nginx/sites-available/risk_dashboard /etc/nginx/sites-enabled/
> sudo nginx -t
> sudo systemctl restart nginx
> ```
>
> Now visiting `http://<WAZUH_IP>/` serves your React app.

---

### 7 Verify End-to-End Connectivity

1. Confirm the API is up by running on the Wazuh server:

   ```bash
   curl http://127.0.0.1:8000/alerts/recent?limit=1
   ```

   You should see `[]` or a JSON array (no errors).

2. Confirm the front-end is served:

   - If using `serve`: visit `http://<WAZUH_IP>:3000` in a browser.
   - If using Nginx: visit `http://<WAZUH_IP>/`.
     You should see the “IDS Demo Dashboard” header on a dark background.

3. Trigger a test alert to validate data flow:

   ```bash
   curl -X POST http://127.0.0.1:8000/ingest \
     -H "Content-Type: application/json" \
     --data-binary '{
       "timestamp":"2025-06-01T12:00:00Z",
       "src_ip":"10.0.0.5",
       "dest_ip":"10.0.0.10",
       "signature":"ET TEST ALERT",
       "severity":3,
       "proto":"TCP"
     }'
   ```

   - In the browser, refresh the front-end; you should see:

     - **KPI Bar** update (precision = 100 %, etc.)
     - **Risk Gauge** move to 30 %
     - **Leaderboard** list `10.0.0.5` with avg 30, count 1
     - **Timeline** show a bar at the 12:00 bucket

4. (Optional) Enable Wazuh → API forwarding:
   On the Wazuh server (in a background tmux/screen session), run:

   ```bash
   tail -F /var/ossec/logs/alerts/alerts.json \
     | jq -c '{
         timestamp: (.timestamp | sub("\\.\d+\+";"Z")),
         src_ip: .data.srcip,
         dest_ip: .data.dstip,
         signature: .rule.description,
         severity: .rule.level,
         proto: .data.proto // "N/A",
         vt_score: (
           (.integration_output.virustotal // "")
           | capture("(?<mal>\d+)/\d+")
           | (.mal | tonumber // 0)
           | if . == 0 then 0 elif . <= 4 then 50 else 100 end
         )
       }' \
     | while read -r PAYLOAD; do
         curl -s -X POST http://127.0.0.1:8000/ingest \
              -H "Content-Type: application/json" \
              --data-binary "$PAYLOAD" \
              >/dev/null
       done
   ```

   - This ensures Suricata alerts (already ingested by Wazuh) flow into your API.

---

### 8 Run Both Services in the Background (Optional)

To keep both API and front-end running after you log out, use `tmux` or `screen`, or run each with `nohup &`:

- **API** (inside `risk_api/`):

  ```bash
  nohup bash -c "source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000" > /home/ossec/api.log 2>&1 &
  ```

- **Front-end** (inside `risk-dashboard/` if using `serve`):

  ```bash
  nohup serve -s dist -l 3000 > /home/ossec/frontend.log 2>&1 &
  ```

---

### 9 Summary

1. **Install system packages**: Python3, Postgres, NodeJS, git.
2. **Clone** `IDS_Demo` → folders `risk_api/` & `risk-dashboard/`.
3. **Create Postgres DB/user** (`riskdb`, `riskuser`), grant schema privileges.
4. **Set env vars**: `DATABASE_URL` (and optionally `VT_API_KEY`) in `~/.bashrc`.
5. **Back-end**:

   - `cd risk_api` → `python3 -m venv venv` → `source venv/bin/activate` → `pip install -r requirements.txt` → `uvicorn main:app --host 0.0.0.0 --port 8000`

6. **Front-end**:

   - `cd risk-dashboard` → `npm install` → `npm run build` → `serve -s dist -l 3000` (or configure Nginx to serve `dist/`)

7. **Verify**: `curl http://127.0.0.1:8000/alerts/recent?limit=1` and browse to `http://<WAZUH_IP>:3000` (or port 80).
8. **Wire Wazuh → API**: tail `alerts.json` & POST into `http://127.0.0.1:8000/ingest`.

After completing these steps, your Wazuh server will host both the API and the production-built React front-end. Suricata alerts (with VirusTotal data) flow into the API, and the React dashboard visualizes them in real time.

# Installation Guide (Windows)

Below are all the steps needed to clone the **IDS_Demo** repository (with API in `risk_api/` and front-end in `risk-dashboard/`), install dependencies, configure the database, and run both back-end and front-end on a Windows machine.

---

### 1 Prerequisites on Windows

1. **Install Git:**
   Download and install from [https://git-scm.com/download/win](https://git-scm.com/download/win). During installation, allow Git to be used from PowerShell/Command Prompt.

2. **Install Node.js (and npm):**
   Download the latest LTS installer from [https://nodejs.org](https://nodejs.org) and run it. This includes npm.
   After installation, verify in PowerShell:

   ```powershell
   node --version
   npm --version
   ```

3. **Install Python 3.10+ (with pip):**
   Download the installer from [https://www.python.org/downloads/windows/](https://www.python.org/downloads/windows/) and run it.

   - During setup, check “Add Python to PATH.”
   - In PowerShell, verify:

     ```powershell
     python --version
     pip --version
     ```

4. **Install PostgreSQL:**
   Download the Windows installer from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).

   - In the installer, ensure you check “PostgreSQL Server,” “pgAdmin 4,” and “Command Line Tools (psql),” and leave others unchecked.
   - During installation, note the **postgres** password you set and leave the port set to 5432.

5. **(Optional) Install ngrok or SSH server** if you ever need to expose the API externally. Not required for local development.

---

### 2 Clone the IDS_Demo Repository

1. Open **PowerShell** and choose a directory where you want the code, for example:

   ```powershell
   cd C:\Users\<YourUser>\Projects
   ```

2. Clone the repo (replace with your actual URL):

   ```powershell
   git clone https://github.com/your-org/IDS_Demo.git
   cd IDS_Demo
   ```

3. Inside this folder, you should see:

   ```
   C:\Users\<YourUser>\Projects\IDS_Demo\
   ├── risk_api\         ← FastAPI back-end
   └── risk-dashboard\   ← React + Vite + Tailwind front-end
   ```

---

### 3 Configure PostgreSQL for the API

> We’ll create a database named `riskdb` and a role `riskuser` with full privileges.

1. Open **pgAdmin 4** (installed with PostgreSQL).

2. In the left pane, expand **Servers → localhost → Databases**. Right-click **Databases → Create → Database…**

   - Name: `riskdb`
   - Owner: `postgres` (or select `postgres`)
   - Click **Save**.

3. Expand **Login/Group Roles** under **localhost**. Right-click → **Create → Login/Group Role…**

   - Role Name: `riskuser`
   - In **Definition** tab, set Password: `riskpassword` (or choose your own).
   - In **Privileges** tab, ensure **Can login?** is checked. Click **Save**.

4. Grant privileges on `riskdb` to `riskuser`:

   - Right-click **riskdb** → **Query Tool**. In the SQL editor, type:

     ```sql
     GRANT ALL PRIVILEGES ON DATABASE riskdb TO riskuser;
     GRANT USAGE ON SCHEMA public TO riskuser;
     GRANT CREATE ON SCHEMA public TO riskuser;
     ```

   - Press the green “Execute” ▶ button. You should see “Query returned successfully.”

5. Alternatively, use **psql (SQL Shell)**:

   - Launch **SQL Shell (psql)** from the Start menu.
   - When prompted:

     ```
     Server [localhost]:  (press Enter)
     Database [postgres]: riskdb
     Port [5432]:         (press Enter)
     Username [postgres]: postgres
     Password for user postgres:  (type your postgres password)
     ```

   - Then run:

     ```sql
     CREATE USER riskuser WITH PASSWORD 'riskpassword';
     GRANT ALL PRIVILEGES ON DATABASE riskdb TO riskuser;
     GRANT USAGE ON SCHEMA public TO riskuser;
     GRANT CREATE ON SCHEMA public TO riskuser;
     \q
     ```

---

### 4 Set Up Environment Variables

1. Open **Start** → type **“Edit environment variables”** → **“Edit the system environment variables.”**
2. In the **System Properties** window, click **Environment Variables…**
3. Under **User variables for \<YourUser>**, click **New…**:

   - Variable name: `DATABASE_URL`
   - Variable value:

     ```
     postgresql+asyncpg://riskuser:riskpassword@localhost:5432/riskdb
     ```

   - Click **OK**.

4. (If you use VirusTotal in the API) Click **New…** again:

   - Variable name: `VT_API_KEY`
   - Variable value: your VirusTotal API key (long hex string)
   - Click **OK**.

5. Click **OK** on all dialogs to close.
6. Restart PowerShell (or open a new one) so these variables take effect.

To verify:

```powershell
echo $env:DATABASE_URL
echo $env:VT_API_KEY   # (if set)
```

You should see the connection string (and VT key if used).

---

### 5 Install & Run the FastAPI Back-end

1. In PowerShell, navigate to the back-end folder:

   ```powershell
   cd C:\Users\<YourUser>\Projects\IDS_Demo\risk_api
   ```

2. Create and activate a Python virtual environment:

   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate
   ```

   Your prompt should now show `(venv)` at the front.

3. Upgrade pip and install Python dependencies:

   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install httpx
   ```

4. If this is your first time or you’ve added the `vt_score` column, ensure the database schema is up to date:

   - If it’s brand-new, SQLAlchemy’s `create_all()` will create both tables automatically on startup.
   - If you’re updating an existing database, open **pgAdmin** or **psql**, then run:

     ```sql
     ALTER TABLE alerts ADD COLUMN IF NOT EXISTS vt_score INTEGER;
     ```

   - Ensure no errors appear.

5. Start the FastAPI server (keep this PowerShell open or use a separate window):

   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   - The API will listen on `0.0.0.0:8000`.
   - You should see logs like:

     ```
     INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
     INFO:     Application startup complete.
     ```

6. Verify the API is up by opening a new PowerShell tab and running:

   ```powershell
   Invoke-RestMethod -Uri http://localhost:8000/alerts/recent?limit=1
   ```

   You should get `[]` (an empty JSON array) or similar.

---

### 6 Build & Serve the React Front-end

1. Open a **new PowerShell** (leave the back-end terminal open).

2. Navigate to the front-end folder:

   ```powershell
   cd C:\Users\<YourUser>\Projects\IDS_Demo\risk-dashboard
   ```

3. Install front-end dependencies (if you have not already in this folder):

   ```powershell
   npm install
   ```

   > If you need to add any missing packages, run:
   >
   > ```powershell
   > npm install axios recharts react-gauge-chart @radix-ui/react-dialog lucide-react date-fns --legacy-peer-deps
   > ```
   >
   > This ensures packages like `react-gauge-chart` install properly under React 19.

4. To run the front-end in development mode (hot reload):

   ```powershell
   npm run dev
   ```

   - Vite will start a dev server, usually at `http://localhost:5173`.
   - Open your browser to **[http://localhost:5173](http://localhost:5173)**. You should see the “IDS Demo Dashboard” layout.

5. To build a production bundle:

   ```powershell
   npm run build
   ```

   - This creates a `dist\` folder with static assets.

6. To serve the static build locally (optional):

   - Install a static server if you don’t have one:

     ```powershell
     npm install -g serve
     ```

   - Serve the built files from `dist` on port 3000:

     ```powershell
     serve -s dist -l 3000
     ```

   - Open **[http://localhost:3000](http://localhost:3000)** in your browser to see the production build.

> If you plan to host both API and front-end on the same Windows box for demo, you can use `serve` for the front-end and `uvicorn` for the API and access the dashboard at `http://localhost:3000` and it will call `http://localhost:8000` for API data.

---

### 7 Verify End-to-End Locally

1. **Trigger a test alert** (using API directly):

   ```powershell
   Invoke-RestMethod -Method Post -Uri http://localhost:8000/ingest `
     -ContentType "application/json" `
     -Body '{
       "timestamp": "2025-06-01T12:00:00Z",
       "src_ip": "10.0.0.5",
       "dest_ip": "10.0.0.10",
       "signature": "ET TEST ALERT",
       "severity": 3,
       "proto": "TCP"
     }'
   ```

   - You should see JSON with `"id"`, `"score"`, and `"vt_score"`.

2. **Refresh the front-end** (either `http://localhost:5173` for dev or `http://localhost:3000` for production). You should see:

   - **KPI Bar** update (precision = 100%, detection_rate = 100%, etc.)
   - **Risk Gauge** move to 30%
   - **Leaderboard** show `10.0.0.5` with avg_score 30, count 1
   - **Timeline** display a bar at the 12:00 bucket

3. **Check PostgreSQL** (optional):

   - Open **SQL Shell (psql)** or **pgAdmin**, connect to `riskdb` and run:

     ```sql
     SELECT id, src_ip, signature, score, vt_score FROM alerts ORDER BY id DESC LIMIT 1;
     ```

   - Verify that the row matches your test alert.

---

### 8 (If Needed) Forward Wazuh Alerts into the API

If you have Wazuh running on the same Windows machine (or can reach the API from Wazuh), set up a PowerShell or Bash‐style pipeline to read Wazuh’s JSON alerts file and POST into your API. For example, in PowerShell (using WSL or Git Bash) or Linux:

```bash
tail -F /var/ossec/logs/alerts/alerts.json \
  | jq -c '{
      timestamp: ( .timestamp | sub("\\.\\d+\\+"; "Z") ),
      src_ip: .data.srcip,
      dest_ip: .data.dstip,
      signature: .rule.description,
      severity: .rule.level,
      proto: .data.proto // "N/A",
      vt_score: (
        (.integration_output.virustotal // "")
        | capture("(?<malicious_count>\\d+)/\\d+")
        | (.malicious_count | tonumber // 0)
        | if . == 0 then 0 elif . <= 4 then 50 else 100 end
      )
    }' \
  | while read -r PAYLOAD; do
      curl -s -X POST http://localhost:8000/ingest \
           -H "Content-Type: application/json" \
           --data-binary "$PAYLOAD" \
           >/dev/null
    done
```

- Adjust the path to `alerts.json` if needed.
- If running entirely in Windows, use PowerShell’s equivalent of `tail -F`, or run within **WSL**.

---

### 9 Running Both Services in the Background

To keep both API and front-end running after you close PowerShell, you can use Windows Task Scheduler or wrap each command in a `start /B` call, or use **Windows Terminal** panes that remain open:

- **API** (inside `risk_api\`):

  ```powershell
  # In a dedicated PowerShell window:
  .\venv\Scripts\Activate
  uvicorn main:app --host 0.0.0.0 --port 8000
  ```

  Leave that window open.

- **Front-end** (inside `risk-dashboard\`):

  ```powershell
  npm run dev                  # for development
  # or
  serve -s dist -l 3000        # for serving the built files
  ```

  Leave that window open.

Alternatively, create two separate **Windows Terminal** profiles or tabs, one for each service.

---

### 10 Summary

1. Install **Git**, **Node.js**, **Python 3**, and **PostgreSQL** on Windows.
2. Clone the repo into `C:\Users\<YourUser>\Projects\IDS_Demo`.
3. Create a PostgreSQL database `riskdb` and user `riskuser` via **pgAdmin** or **psql**, grant privileges.
4. Set environment variables `DATABASE_URL` (and `VT_API_KEY` if used) via **System → Environment Variables**.
5. In PowerShell:

   - `cd risk_api` → `python -m venv venv` → `.\venv\Scripts\Activate` → `pip install -r requirements.txt httpx` → `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

6. In a new PowerShell:

   - `cd risk-dashboard` → `npm install` → `npm run dev` (for dev) or `npm run build` → `serve -s dist -l 3000` (for production).

7. Verify by sending a test POST to `/ingest` and refreshing `http://localhost:5173` (dev) or `http://localhost:3000` (prod).
8. (Optional) Set up a file‐tailing pipeline so Wazuh’s enriched alerts automatically POST to `http://localhost:8000/ingest`.

After completing these steps, your Windows machine will run both the FastAPI back-end and the React front-end. You can now develop and demo your IDS dashboard locally on Windows.
