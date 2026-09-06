import os
with open("backend/src/index.js", "r") as f:
    content = f.read()

if "const deviceMonitor = require('./services/deviceMonitor');" not in content:
    content = "const deviceMonitor = require('./services/deviceMonitor');\n" + content
    
if "deviceMonitor.start();" not in content:
    # insert before app.listen
    content = content.replace("app.listen(", "deviceMonitor.start();\napp.listen(")
    
with open("backend/src/index.js", "w") as f:
    f.write(content)

print("DeviceMonitor injected into src/index.js")
