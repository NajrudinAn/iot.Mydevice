# MyDevice Production Deployment & Fresh Server Setup

## 1. Overview

MyDevice is a full-stack IoT platform consisting of a React frontend, a Node.js/Express backend, a PostgreSQL database, and a native Mosquitto MQTT broker. 

### Architecture Flow

```text
Internet
  |
  v
Cloudflare DNS
  |
  v
Nginx HTTPS :443
  |
  +--> Static React/Vite frontend (/var/www/html)
  |
  +--> /api/ -> Node.js/Express backend (:3000)
  |
  +--> /hosted/ -> hosted applications
  |
  +--> wildcard application subdomains
  |
  v
Node.js backend :3000
  |
  +--> PostgreSQL
  |
  +--> Native Mosquitto MQTT :1883
  |
  +--> Hosted application storage
```

### MQTT Architecture

```text
IoT Device
  |
  | MQTT TCP 1883
  | username = Device ID
  | password = Device Secret Key
  v
Mosquitto
  |
  v
Node.js MQTT client
  |
  v
MyDevice backend
  |
  v
PostgreSQL
```

**Important Notes:**
- **Mosquitto is a native system service** running via systemd on the host. It is **NOT** a Docker container.
- Nginx handles all HTTPS/web HTTP traffic. MQTT remains raw MQTT over TCP (`port 1883`) and is **not** routed through Nginx or WebSockets. Devices connect directly to the Mosquitto broker on TCP port 1883.

---

## 2. Requirements

The verified production environment requires:
- **OS:** Ubuntu 22.04 LTS (or similar modern Linux)
- **CPU/RAM:** Minimum 1 vCPU, 1GB RAM (2GB+ recommended for large workloads)
- **Software:**
  - Git
  - Node.js (v18+) & npm
  - PostgreSQL (v14+)
  - Mosquitto (native binary)
  - Nginx
  - PM2
  - Certbot
  - Python 3 (only for simulators/testing in `scratch/`)

**Verify Installed Versions:**
```bash
lsb_release -a
node --version
npm --version
psql --version
mosquitto -h 2>&1 | head
nginx -v
pm2 --version
certbot --version
```

---

## 3. Repository Layout

Key project directories:
- `backend/` - Node.js Express API and MQTT handling service.
- `frontend/` - React/Vite web dashboard.
- `connector/` - Custom integrations.
- `scratch/` - Simulator and load-test files.
- `mosquitto/` - Project-level configuration and runtime data for Mosquitto.
- `docs/` - SDK references and documentation.

### Critical Production Distinction

The repository contains a project-level mosquitto directory:
`/home/ubuntu/iot.Mydevice/mosquitto/`

The production Mosquitto systemd service is explicitly configured to use:
`/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.conf`

It also relies on project-local runtime data:
- `/home/ubuntu/iot.Mydevice/mosquitto/data/` (Persistence DB)
- `/home/ubuntu/iot.Mydevice/mosquitto/log/` (Logs)

**DANGER:**
This directory contains production Mosquitto runtime data (the persistence database, password files, and logs). It **MUST NOT** be deleted by normal Git cleanup commands.

Running:
```bash
git clean -fd
```
will permanently delete your persistence database and device passwords if they are untracked. Ensure runtime files are ignored or avoid using aggressive clean commands on the production server.

---

## 4. Initial Server Preparation

For a fresh Ubuntu server:

```bash
sudo apt update
sudo apt upgrade -y
```

Install the required packages:
```bash
sudo apt install -y git curl nginx postgresql mosquitto certbot python3-certbot-nginx
```

Install Node.js (via NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Create the application directory (assuming the user is `ubuntu`):
```bash
mkdir -p /home/ubuntu/iot.Mydevice
```

Clone the repository into the directory (do not hardcode GitHub tokens, use SSH keys or a secure clone method):
```bash
git clone git@github.com:NajrudinAn/iot.Mydevice.git /home/ubuntu/iot.Mydevice
```
Ensure the `/home/ubuntu/iot.Mydevice` directory is owned by the `ubuntu` user.

---

## 5. Node.js Backend Setup

Navigate to the backend:
```bash
cd /home/ubuntu/iot.Mydevice/backend
npm install
```

### Environment Configuration
Create the `.env` file (`/home/ubuntu/iot.Mydevice/backend/.env`). 

Required variables (DO NOT copy these exactly, use secure values):
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=postgres://<DB_USER>:<DB_PASSWORD>@localhost:5432/mydevice`
- `JWT_SECRET=<YOUR_SECURE_JWT_SECRET>`
- `MQTT_BROKER_URL=mqtt://localhost:1883`
- `MQTT_USERNAME=mydevice_backend`
- `MQTT_PASSWORD=<MQTT_BACKEND_PASSWORD>`
- `FRONTEND_URL=https://<DOMAIN>`
- `PLATFORM_DOMAIN=<DOMAIN>`
- `SMTP_HOST=<SMTP_SERVER>`
- `SMTP_PORT=465`
- `SMTP_USER=<SMTP_USERNAME>`
- `SMTP_PASS=<SMTP_PASSWORD>`
- `SMTP_FROM=noreply@<DOMAIN>`

### PM2 Configuration

Start the backend API using PM2:
```bash
pm2 start src/index.js --name mydevice-api
```

Manage the process:
```bash
pm2 status
pm2 logs mydevice-api
pm2 restart mydevice-api
```

**IMPORTANT:**
Never run `pm2 restart all` for normal deployments. Only restart `mydevice-api` specifically. The backend is configured to gracefully shutdown and safely disconnect from the MQTT broker upon receiving SIGTERM.

---

## 6. PostgreSQL Setup

Switch to the postgres user to create the database and user:
```bash
sudo -u postgres psql
```

Inside the PostgreSQL prompt:
```sql
CREATE DATABASE mydevice;
CREATE USER mydevice_user WITH ENCRYPTED PASSWORD '<DB_PASSWORD>';
GRANT ALL PRIVILEGES ON DATABASE mydevice TO mydevice_user;
\q
```

Initialize the database schema and migrations:
```bash
cd /home/ubuntu/iot.Mydevice/backend
npm run db:init
```

### PostgreSQL Backup Before Production Changes
To backup the database:
```bash
pg_dump -U mydevice_user -h localhost -d mydevice -F c -f /home/ubuntu/db_backup.dump
```

---

## 7. Mosquitto Complete Setup

MyDevice relies heavily on Mosquitto for device telemetry.

**Current Architecture:**
- Native Mosquitto running via `systemd`.
- Exposing TCP port 1883.
- Anonymous access is **disabled**.
- Uses an explicit `password_file` and `acl_file`.
- Maintains a persistent database and log file inside the project directory.
- The Node.js backend connects using a dedicated backend MQTT user (`mydevice_backend`).

Configure your Mosquitto configuration file at `/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.conf` to match this exact pattern:

```conf
listener 1883 0.0.0.0
protocol mqtt
allow_anonymous false

password_file /home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.passwd
acl_file /home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.acl

persistence true
persistence_location /home/ubuntu/iot.Mydevice/mosquitto/data/

log_dest file /home/ubuntu/iot.Mydevice/mosquitto/log/mosquitto.log

log_type error
log_type warning
log_type notice
log_type information

connection_messages true
```

*(Note: Adjust the `/home/ubuntu/iot.Mydevice` path if your project is deployed elsewhere).*

---

## 8. Mosquitto Systemd Configuration

Because the production installation uses the system-installed Mosquitto binary, you must override the default systemd unit to point to the project's configuration.

Locate the binary and status:
```bash
which mosquitto
systemctl status mosquitto
```

Create a systemd override safely:
```bash
sudo systemctl edit mosquitto
```

Add the following exact lines (the blank `ExecStart=` is strictly necessary to clear the default startup command before replacing it):
```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/mosquitto -c /home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.conf
```

Reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
sudo systemctl status mosquitto
```

Verify it is listening:
```bash
sudo ss -lntp | grep ':1883'
```

---

## 9. Mosquitto Password Authentication

`allow_anonymous false` must remain enabled to protect the IoT platform.

There are two types of MQTT credentials:
1. **Backend MQTT Credentials:** Used by Node.js to read all topics.
2. **Device Credentials:** Auto-generated when devices are registered in the UI.

Create the backend user in the password file:
```bash
sudo mosquitto_passwd -c /home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.passwd mydevice_backend
```
*(You will be prompted for the password. Ensure this matches `MQTT_PASSWORD` in your backend `.env`).*

**WARNING:** The `-c` flag creates or **overwrites** the file. DO NOT use `-c` on a live production server if device passwords already exist in the file. To add users without overwriting, omit the `-c` flag:
```bash
sudo mosquitto_passwd /home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.passwd new_user
```

---

## 10. Mosquitto ACL

The Access Control List defines who can read/write to what topics.
Create or edit `/home/ubuntu/iot.Mydevice/mosquitto/config/mosquitto.acl`.

Ensure the backend user has broad access required to orchestrate the platform:
```text
user mydevice_backend
topic readwrite #
```
Device credentials (which are dynamically appended to this ACL by the provisioning helper) will be restricted to `devices/{device_id}/#`.

---

## 11. MyDevice Device Provisioning

Device MQTT credentials (username = Device ID, password = Device Secret) are generated dynamically when a user registers a device in the UI. 

Because Mosquitto password and ACL files require strict permissions (often root/mosquitto user owned), the Node.js backend relies on a **provisioning helper script**:
`/usr/local/bin/mqtt_provision_helper.sh` (VERIFY DURING DEPLOYMENT).

**Characteristics:**
- Owned by `root`, highly restrictive permissions.
- Safely appends/removes device credentials from `mosquitto.passwd`.
- Safely appends ACL entries for devices (`topic readwrite devices/DEVICE_ID/#`).
- Handles idempotency and file locking to prevent corruption.
- Does NOT log plain-text passwords.
- Reloads Mosquitto gracefully (`kill -HUP`) rather than restarting it.

The backend invokes this script via `sudo`. Ensure the `ubuntu` user has passwordless sudo permission specifically for this script via `visudo`.

**VERY IMPORTANT:** Application startup or PM2 restarts must **not** attempt to rewrite Mosquitto credentials or regenerate all device passwords. The helper is intentionally invoked only during device creation/deletion.

---

## 12. Device MQTT Protocol

The platform relies on the following topic hierarchy:

- `devices/{device_id}/data` (Device publishes telemetry)
- `devices/{device_id}/status` (Device publishes online/offline status)
- `devices/{device_id}/capabilities` (Device publishes JSON blueprint/schema on connect)
- `devices/{device_id}/command` (Backend publishes commands for the device)
- `devices/+/command/ack` (Device publishes completion acknowledgements for commands back to the backend)

**Authentication:**
- Devices: `username` = Device ID, `password` = Device Secret Key.
- Backend: `username` = `mydevice_backend`, `password` = Backend Secret.

---

## 13. MQTT Verification on a Fresh Server

Verify the service is running:
```bash
sudo systemctl status mosquitto
```

Check the TCP port:
```bash
sudo ss -lntp | grep ':1883'
```

Check the logs:
```bash
sudo tail -f /home/ubuntu/iot.Mydevice/mosquitto/log/mosquitto.log
```

Test an anonymous connection (it MUST be rejected):
```bash
mosquitto_sub -h localhost -p 1883 -t "#"
# Expected: Connection error: Connection Refused: not authorised.
```

Test an authenticated backend connection:
```bash
mosquitto_sub -h localhost -p 1883 -u "mydevice_backend" -P "<MQTT_BACKEND_PASSWORD>" -t "#"
```

---

## 14. Node.js MQTT Backend Connection

The backend connects to Mosquitto via the configuration in `backend/src/mqtt/client.js`.

- **Broker URL:** `mqtt://localhost:1883` (Local communication between Node.js and systemd Mosquitto).
- **Username:** `mydevice_backend`.
- **Password:** Sourced from `.env` (`MQTT_PASSWORD`).

Expected backend PM2 startup logs:
```text
Subscribed to device data: devices/+/data
Subscribed to device status: devices/+/status
Subscribed to device command acks: devices/+/command/ack
Subscribed to device capabilities: devices/+/capabilities
```

---

## 15. Frontend Build and Deployment

The React/Vite frontend must be compiled into static files before deployment to Nginx.

```bash
cd /home/ubuntu/iot.Mydevice/frontend
npm install
npm run build
```
This produces optimized static assets in `frontend/dist/`.

**Safe Deployment Procedure:**
1. Verify the Git SHA matches `origin/main`.
2. Build the project: `npm run build`.
3. Create a backup of `/var/www/html/` just in case.
4. Copy the files: `sudo cp -a dist/. /var/www/html/`
5. Verify `index.html` and asset hashes reflect your update.
6. Test HTTPS in the browser.

*(Note: Frontend-only UI changes do **not** require a PM2 restart of the backend).*

---

## 16. Backend Deployment Procedure

Safe production update procedure for Node.js backend code:

```bash
cd /home/ubuntu/iot.Mydevice
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main

# Verify that HEAD is what you expect before resetting
git reset --hard origin/main
```

**For Backend Changes:**
```bash
cd backend
npm install
pm2 restart mydevice-api
```
*(Do not use `pm2 restart all`).*

**For Mosquitto Changes:**
Handle separately through `sudo systemctl restart mosquitto`. Do not restart Mosquitto during normal backend deployments.

---

## 17. Nginx Setup

Nginx acts as the secure edge gateway for HTTP traffic.

**Architecture:**
- Main Domain: `<DOMAIN>` (e.g., `mydevice.in`)
- Canonical redirect: `www.<DOMAIN> -> https://<DOMAIN>`
- Hosted App wildcard: `*.<DOMAIN>`

**Routing:**
- HTTP port 80 redirects universally to HTTPS port 443.
- `/` serves static React files from `/var/www/html/`.
- `/api/` reverse-proxies to `http://localhost:3000/api/` (Node.js).
- `/hosted/` proxies to hosted static applications.

**Note:** Nginx handles CORS for web applications. MQTT TCP traffic does **not** pass through Nginx unless explicitly reconfigured with a WebSocket listener.

*(VERIFY DURING DEPLOYMENT: Review your `/etc/nginx/sites-available/` config to ensure wildcard routing block `server_name *.<DOMAIN>;` properly maps to the Node.js backend's hosted apps router).*

---

## 18. DNS and Cloudflare

Set up Cloudflare DNS records to route traffic to the server:

```text
A     <DOMAIN>           -> <SERVER_IP>
CNAME www.<DOMAIN>       -> <DOMAIN>
A     *.<DOMAIN>         -> <SERVER_IP> (Required for wildcard hosted applications)
```
Ensure proxy status (orange cloud) is configured properly, though MQTT port 1883 must bypass Cloudflare's HTTP proxy.

---

## 19. TLS Certificate Setup

Certificates are issued via Certbot using a Cloudflare DNS challenge (required to validate wildcard domains).

```bash
# Cloudflare API token must be stored securely (e.g., /etc/letsencrypt/cloudflare.ini)
# Ensure file permissions are 600
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini -d <DOMAIN> -d *.<DOMAIN>
```

Update your Nginx SSL paths to point to `/etc/letsencrypt/live/<DOMAIN>/fullchain.pem`.
*(The Cloudflare API credential should be scoped as narrowly as possible: Zone > DNS > Edit).*

---

## 20. Firewall/Network Requirements

The server requires specific inbound ports to be open. Verify via `sudo ufw status verbose` and your cloud provider's security lists (AWS Security Groups, Oracle Cloud VCN, etc.).

- `22`: SSH
- `80`: HTTP (Redirects to HTTPS)
- `443`: HTTPS (Nginx Web Traffic & API)
- `1883`: MQTT TCP (Direct device telemetry)

**Note:** Port 1883 should only be internet-exposed because devices connect directly from remote networks. If devices were entirely local to the server, this would be locked down.

---

## 21. Application Hosted Deployment

MyDevice supports hosting static web applications built on top of the API.
- Applications exist at `<application-slug>.<DOMAIN>`.
- The backend handles wildcard subdomain routing to serve these static hosted files.
- Hosted applications consist purely of static frontend content and **do not** execute arbitrary server-side code.
- Path traversal protections are in place in the backend router.

---

## 22. Environment Variables and Secrets

| Variable | Purpose | Secret? | Example |
| -------- | ------- | ------- | ------- |
| `NODE_ENV` | Environment scope | No | `production` |
| `PORT` | Node API port | No | `3000` |
| `DATABASE_URL` | Postgres connection string | **Yes** | `postgres://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Signing token for Auth | **Yes** | `<LONG_RANDOM_STRING>` |
| `MQTT_BROKER_URL` | Node.js broker binding | No | `mqtt://localhost:1883` |
| `MQTT_USERNAME` | Backend MQTT identity | No | `mydevice_backend` |
| `MQTT_PASSWORD` | Backend MQTT password | **Yes** | `<SECURE_PASSWORD>` |
| `FRONTEND_URL` | Base URL for CORS/Emails | No | `https://mydevice.in` |
| `PLATFORM_DOMAIN` | Domain for wildcard apps | No | `mydevice.in` |
| `SMTP_HOST` | Email provider host | No | `smtp.mailgun.org` |
| `SMTP_USER` | Email provider username | **Yes** | `postmaster@mydevice.in` |
| `SMTP_PASS` | Email provider password | **Yes** | `<SMTP_SECRET>` |

---

## 23. Email/SMTP Setup

`backend/src/services/emailService.js` handles platform emails (like password resets).
- Reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Includes an embedded CID logo attachment.

**Critical Path Warning:**
The logo attachment resolves to `<PROJECT_ROOT>/frontend/public/logo.png`.
It must resolve relative to the project (`path.join(__dirname, '../../../../frontend/public/logo.png')`), not a hardcoded absolute server path, so it survives directory changes.

Verify the file exists:
```bash
ls -l /home/ubuntu/iot.Mydevice/frontend/public/logo.png
```

---

## 24. Password Reset Email Verification

To safely verify email functionality:
1. Go to the frontend login page and request a password reset.
2. The Node.js backend generates the token and contacts SMTP.
3. Verify the email arrives in your inbox.
4. Verify the MyDevice logo successfully attached and rendered via CID.
5. Verify the reset URL directs to your active production domain.
6. Verify clicking the link loads the reset page.

*(Never expose reset tokens or query the database directly for user passwords).*

---

## 25. PM2 Production Setup

To ensure the backend API starts automatically when the Ubuntu server reboots:

```bash
pm2 save
pm2 startup
```
Follow the output instructions provided by PM2 to execute the required `systemd` enable command.

---

## 26. Complete Fresh-Server Installation Order

Follow this exact sequence for a flawless setup:

1. Provision Ubuntu server & configure Cloud Firewall
2. Update OS (`apt update && apt upgrade`)
3. Install Git, Node.js, PostgreSQL, Mosquitto, Nginx, PM2, Certbot
4. Clone MyDevice repository
5. Configure backend `.env` variables
6. Configure PostgreSQL users and database
7. Run `npm run db:init`
8. Create Mosquitto `config`, `data`, and `log` directories in the project root if missing
9. Configure `mosquitto.conf`
10. Configure systemd Mosquitto override
11. Create Mosquitto backend account via `mosquitto_passwd`
12. Configure Mosquitto ACL
13. Install provisioning helper script (VERIFY DURING DEPLOYMENT)
14. Configure sudo permissions for the helper
15. Start Mosquitto
16. Verify MQTT (Check port 1883 and logs)
17. Start Node.js backend via PM2
18. Verify Node/MQTT/PostgreSQL connection logs
19. Build frontend (`npm run build`)
20. Deploy frontend to Nginx (`/var/www/html/`)
21. Configure Nginx virtual hosts
22. Configure DNS
23. Configure TLS via Certbot
24. Configure Cloudflare proxy (orange cloud on HTTP, grey cloud on MQTT if split)
25. Configure PM2 startup
26. Perform Final Production Smoke Test

---

## 27. Production Smoke Test

Use this checklist before declaring the server live:

- [ ] HTTPS works
- [ ] www redirects to bare domain
- [ ] Frontend dashboard loads
- [ ] User login works
- [ ] PostgreSQL connected (backend logs)
- [ ] Backend online
- [ ] MQTT connected (backend logs)
- [ ] Anonymous MQTT rejected
- [ ] Authenticated MQTT works
- [ ] Device registration successfully generates credentials
- [ ] Real/Simulated device connects successfully
- [ ] Telemetry received and stored
- [ ] Device status correctly updates online/offline
- [ ] Capabilities JSON successfully parsed on connect
- [ ] Command successfully sent from UI
- [ ] ACK received from device
- [ ] API routes functioning
- [ ] Hosted application subdomain loads
- [ ] Password reset email sent successfully
- [ ] Email logo loads properly
- [ ] Server reboot recovery works (Mosquitto & PM2 auto-start)

---

## 28. Troubleshooting

### Backend Won't Start
```bash
pm2 status
pm2 logs mydevice-api
```

### MQTT Not Connecting
```bash
sudo systemctl status mosquitto
sudo ss -lntp | grep ':1883'
sudo tail -n 100 /home/ubuntu/iot.Mydevice/mosquitto/log/mosquitto.log
```

### MQTT Not Authorized
Check the username, password in `.env`, verify `mosquitto.passwd` exists, verify `mosquitto.acl` grants `readwrite #` to `mydevice_backend`.

### Device Can't Connect
Check port 1883 reachability (Ubuntu UFW and Cloud Firewall). Check device credentials against the generated password file.

### Frontend Not Updated
Check Git SHA, rebuild via `npm run build`, copy accurately to `/var/www/html`, and hard-refresh browser cache.

### Nginx Errors
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -n 100 /var/log/nginx/error.log
```

*(Note: Express rate-limit `X-Forwarded-For` warnings are a reverse-proxy configuration issue. Ensure Nginx passes real IP headers, but do not blindly set `app.set('trust proxy', true)` without verifying Nginx topology).*

---

## 29. Backup and Recovery

- **PostgreSQL:** Back up via `pg_dump`.
- **Mosquitto:** Back up `/home/ubuntu/iot.Mydevice/mosquitto/data/mosquitto.db` and the `.passwd`/`.acl` files.
- **Environment:** Maintain a secure offline backup of the `.env` secrets.
- **Code:** Rely on the GitHub repository.

Secrets should NEVER be committed to Git.

---

## 30. Security Checklist

- Anonymous MQTT disabled.
- Secrets completely isolated from source control.
- Restrictive permissions on `mosquitto.passwd` and provisioning helper.
- TLS enabled, HTTP upgrades to HTTPS.
- API authentication and JWT expiration active.
- Command authorization validates application roles.
- Path traversal protection on hosted app serving.
- Cloudflare API token scoped to minimum privileges.

---

## 31. Portable vs Production-Specific

| Item | Portable | Production-Specific |
| :--- | :--- | :--- |
| Node backend code | Yes | |
| React frontend code | Yes | |
| PostgreSQL schema | Yes | |
| Mosquitto architecture | Yes | |
| MQTT topic structure | Yes | |
| Domain Name | | Yes |
| Server IP | | Yes |
| Cloudflare DNS config | | Yes |
| TLS Certificate | | Yes |
| SMTP credentials | | Yes |
| JWT Secret | | Yes |
| Database Password | | Yes |
| MQTT Backend Password | | Yes |

---

## 32. Fresh Server Quick Reference

**Check everything:**
```bash
pm2 status
sudo systemctl status mosquitto
sudo systemctl status nginx
sudo ss -lntp
```

**Restart Backend:**
```bash
pm2 restart mydevice-api
pm2 logs mydevice-api
```

**Restart Mosquitto:**
```bash
sudo systemctl restart mosquitto
sudo systemctl status mosquitto
```

**Nginx Reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Git Update & Frontend Build:**
```bash
git fetch origin
git reset --hard origin/main

cd frontend
npm install
npm run build
sudo cp -a dist/. /var/www/html/
```

---

## 33. Final Important Warnings

1. Never run `git clean -fd` blindly on production, as it destroys local Mosquitto runtime data.
2. Never delete the project Mosquitto data directory.
3. Never put production secrets in Git.
4. Never run `pm2 restart all` for a normal deployment.
5. Do not restart Mosquitto for frontend/backend-only changes.
6. Do not expose MQTT credentials in logs.
7. Do not assume a frontend rebuild updates backend code.
8. Do not assume a backend restart updates static frontend files.
9. Always verify `HEAD` matches `origin/main` before deployment.
10. Always make a backup before replacing production frontend files.
11. Do not overwrite Mosquitto password files with `mosquitto_passwd -c` on an existing production server without understanding the consequences.
12. Do not copy the production server's actual secrets into this README.
