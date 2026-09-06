with open("backend/src/services/sseEmitter.js", "r") as f:
    content = f.read()

if "console.log(`[SSE Emit] Workspace" not in content:
    content = content.replace("this.emit(`workspace:${workspaceId}:status`, deviceData);", 
        "console.log(`[SSE Emit] Workspace ${workspaceId}:`, deviceData);\n        this.emit(`workspace:${workspaceId}:status`, deviceData);")

with open("backend/src/services/sseEmitter.js", "w") as f:
    f.write(content)

with open("backend/src/controllers/deviceController.js", "r") as f:
    content2 = f.read()
    
if "console.log(`[SSE Client Connected] Workspace" not in content2:
    content2 = content2.replace("const eventName = `workspace:${workspace_id}:status`;",
        "const eventName = `workspace:${workspace_id}:status`;\n        console.log(`[SSE Client Connected] Workspace ${workspace_id} by User ${userId}`);")
    
if "console.log(`[SSE Pushed] to client:" not in content2:
    content2 = content2.replace("res.write(`event: device-status\\ndata: ${JSON.stringify(deviceData)}\\n\\n`);",
        "console.log(`[SSE Pushed] to client:`, deviceData);\n            res.write(`event: device-status\\ndata: ${JSON.stringify(deviceData)}\\n\\n`);")
        
with open("backend/src/controllers/deviceController.js", "w") as f:
    f.write(content2)

print("Injected console.logs")
