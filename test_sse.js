const http = require('http');

const payload = JSON.stringify({
  email: 'user.a.app@test.com',
  password: 'password123'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
        const json = JSON.parse(body);
        const token = json.token;
        if (!token) throw new Error("No token returned");
        
        // Find workspace
        http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/workspaces',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, (res2) => {
           let b2 = '';
           res2.on('data', c => b2 += c);
           res2.on('end', () => {
               const json2 = JSON.parse(b2);
               const wsId = json2.workspaces[0].id;
               
               console.log("Connecting to SSE for workspace", wsId);
               const sseReq = http.request({
                 hostname: 'localhost',
                 port: 3000,
                 path: `/api/workspaces/${wsId}/devices/live-status`,
                 method: 'GET',
                 headers: {
                   'Authorization': `Bearer ${token}`,
                   'Accept': 'text/event-stream'
                 }
               }, (sseRes) => {
                 console.log("SSE STATUS:", sseRes.statusCode);
                 sseRes.on('data', c => {
                    console.log("SSE CHUNK RECEIVED:", c.toString());
                 });
               });
               sseReq.end();
           });
        }).end();
        
    } catch (e) {
        console.error(e);
        console.log(body);
    }
  });
});
loginReq.write(payload);
loginReq.end();
