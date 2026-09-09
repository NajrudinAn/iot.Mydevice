# MyDevice.in Production Deployment Guide
**Optimized for Ubuntu 1vCPU / 1GB RAM Instances (e.g., Oracle Cloud Free Tier)**

This guide walks you through deploying the entire MyDevice platform (Frontend, Backend, PostgreSQL, and Mosquitto) on a low-resource server while preventing Out-of-Memory (OOM) crashes.

---

## 1. Initial Server Setup (Critical for 1GB RAM)

A 1GB RAM server **will crash** when running Node.js and PostgreSQL simultaneously under load if you do not set up a Swap file. A swap file uses your hard drive as emergency RAM.

```bash
# 1. Create a 2GB Swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Make it permanent so it survives reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Optimize swap usage (tells Ubuntu to only use swap when necessary)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

---

## 2. Install Core Dependencies

Update your system and install the required native services. **Do not use Docker**, as it adds unnecessary memory overhead on small servers.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib mosquitto mosquitto-clients
```

### Install Node.js (v20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install Process Manager (PM2)
```bash
sudo npm install -g pm2
```

---

## 3. Database Tuning & Setup (PostgreSQL)

By default, PostgreSQL assumes you have a lot of RAM. We need to restrict it.

```bash
# Edit the PostgreSQL configuration file (version number may vary, e.g., 14, 15, or 16)
sudo nano /etc/postgresql/14/main/postgresql.conf
```
Find and change the following lines to limit memory usage:
```text
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 256MB
```
Restart Postgres to apply:
```bash
sudo systemctl restart postgresql
```

### Create the Database and User
```bash
sudo -u postgres psql

# Run these SQL commands in the prompt:
CREATE DATABASE iot_platform;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE iot_platform TO postgres;
\q
```

---

## 4. Platform Installation

Clone the repository to your server:
```bash
cd ~
git clone https://github.com/NajrudinAn/iot.Mydevice.git
cd iot.Mydevice
```

### Backend Setup
```bash
cd backend
npm install
```

Create your production environment variables:
```bash
nano .env
```
Paste and update the following:
```env
PORT=3000
DATABASE_URL=postgres://postgres:your_secure_password@localhost:5432/iot_platform
JWT_SECRET=your_super_secret_jwt_key

# Mosquitto Infrastructure
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=mydevice_backend
MQTT_PASSWORD=CHANGE_ME

# Mail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=devdeviceaccess@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=info@MyDevice.in
```

### Mosquitto Security Architecture
> **IMPORTANT:** Mosquitto is treated as an external infrastructure dependency. The Node.js application (`mydevice-api`) **never** rewrites the Mosquitto password database or ACL file at startup. 
> 
> Device provisioning is performed exclusively via the Privileged Provisioning Helper Script (`/usr/local/bin/mqtt_provision_helper.sh`), which must be configured in `sudoers` by the sysadmin. For instructions, refer to `MQTT_SPECIFICATION.md`.

Start the backend with PM2, strictly limiting its memory to 350MB so it restarts automatically if a memory leak occurs:
```bash
pm2 start index.js --name "mydevice-api" --max-memory-restart 350M
pm2 save
pm2 startup
```

---

## 5. Frontend Setup

Build the React frontend into static HTML/JS/CSS files.
```bash
cd ../frontend
npm install
npm run build
```
Copy the compiled `dist` folder to Nginx's web directory:
```bash
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
```

---

## 6. Nginx & Domain Configuration

We need Nginx to serve the React frontend, proxy API requests to Node.js, and natively route subdomains (`*.MyDevice.in`) to the dynamic application hosting system.

```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the contents with this production-ready configuration:

```nginx
server {
    listen 80;
    server_name MyDevice.in *.MyDevice.in;

    # Serve the main React Frontend
    root /var/www/html;
    index index.html;

    # GZIP Compression for performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # API Proxy -> Node.js Backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Hosted Apps Proxy -> Node.js Backend
    location /hosted/ {
        proxy_pass http://localhost:3000/hosted/;
        proxy_set_header Host $host;
    }

    # Wildcard Subdomain Routing for Apps (e.g. app1.MyDevice.in)
    # The Node backend middleware reads $host to resolve the application
    location / {
        if ($host != 'MyDevice.in') {
            proxy_pass http://localhost:3000;
            break;
        }
        
        # Fallback to index.html for React Router on the main domain
        try_files $uri $uri/ /index.html;
    }
}
```

Check for syntax errors and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. SSL Certificates (HTTPS)

Secure your platform using Let's Encrypt. Because you are using wildcards (`*.MyDevice.in`), you will need to verify via DNS, or standard HTTP verification for the root domain.

For the root domain:
```bash
sudo certbot --nginx -d MyDevice.in -d api.MyDevice.in
```

*(Note: For wildcard subdomains `*.MyDevice.in` to support dynamic apps over HTTPS automatically, you must use a DNS plugin with Certbot, e.g., `certbot --manual --preferred-challenges dns certonly -d "*.MyDevice.in" -d "MyDevice.in"`)*

---

## 8. Post-Deployment Checks

Once running, verify the status of your services:
- **Node API**: `pm2 status`
- **Postgres**: `sudo systemctl status postgresql`
- **Mosquitto**: `sudo systemctl status mosquitto`
- **RAM/Swap**: `htop` (Watch the Swap usage; it's normal for it to slowly fill up as Linux caches processes).

Congratulations! Your MyDevice IoT platform is now running in a highly optimized, low-resource production environment.
