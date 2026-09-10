# Nginx Configuration Guide for MyDevice Applications

The issues you are seeing in your screenshots are both caused by **Nginx routing configuration** on your Oracle server.

### 1. Why `mydevice.in/hosted/application` shows a blank page
Nginx is currently sending requests for `/hosted/...` to your React frontend. The React router doesn't know what `/hosted/...` is, so it renders a blank page. 
**Fix:** You need to tell Nginx to proxy `/hosted/` to your NodeJS backend (Port 3000), because the backend serves the uploaded HTML bundles.

### 2. Why `application.mydevice.in` shows "Cannot GET /"
Nginx is currently sending wildcard subdomains (`*.mydevice.in`) directly to the NodeJS backend on the root path `/`. Since NodeJS only serves `/api` and `/hosted`, it returns a 404 error (`Cannot GET /`). 
**Fix:** You need to tell Nginx to serve the React frontend for wildcard subdomains, so the `HostResolver.jsx` file can correctly load the application dashboards.

---

### The Solution: Update Nginx Configuration

You need to update your Nginx configuration (usually located in `/etc/nginx/sites-available/default` or `/etc/nginx/sites-available/mydevice`).

Replace your `server_name` line and add the `/hosted/` location block as shown below:

```nginx
server {
    listen 80;
    
    # 1. ADD WILDCARD SUBDOMAIN HERE
    server_name mydevice.in www.mydevice.in *.mydevice.in;

    # 2. REACT FRONTEND (Handles main site AND subdomains)
    location / {
        # Replace with your actual path to the react build folder
        root /home/ubuntu/iot.Mydevice/frontend/build; 
        try_files $uri $uri/ /index.html;
    }

    # 3. BACKEND API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 4. ADD THIS NEW BLOCK FOR UPLOADED HOSTED APPS
    location /hosted/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Next Steps on the Oracle Server:

1. **Edit the Nginx Config:**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   *(Update the paths and add the blocks as shown above).*

2. **Test Nginx Configuration:**
   ```bash
   sudo nginx -t
   ```
   *(Ensure it says "syntax is ok" and "test is successful").*

3. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

### How it will work after this:
* **Native Dashboards:** When a user visits `https://yourapp.mydevice.in`, Nginx will serve the React frontend. React's `HostResolver.jsx` will detect the subdomain, call the API, and render the native dashboard interface.
* **Custom Uploaded HTML Apps:** When a user visits `https://mydevice.in/hosted/yourapp`, Nginx will forward the request to the NodeJS backend, which will dynamically serve the uploaded `index.html` and assets.
