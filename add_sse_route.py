with open("backend/src/routes/workspaces.js", "r") as f:
    content = f.read()

route_str = "router.get('/:workspace_id/devices/live-status', deviceController.streamLiveStatus);\n"
if "live-status" not in content:
    # insert after getDevices
    content = content.replace("router.get('/:workspace_id/devices', deviceController.getDevices);", 
                              "router.get('/:workspace_id/devices', deviceController.getDevices);\n" + route_str)

with open("backend/src/routes/workspaces.js", "w") as f:
    f.write(content)

print("Added SSE route to workspaces.js")
