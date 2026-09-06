import os
with open("backend/src/controllers/deviceController.js", "r") as f:
    content = f.read()

sse_import = "const sseEmitter = require('../services/sseEmitter');\n"
if sse_import not in content:
    content = sse_import + content

sse_method = """
const streamLiveStatus = async (req, res, next) => {
    try {
        const { workspace_id } = req.params;
        const userId = req.user.id;
        
        // Authorize: Must have access to workspace
        const Workspace = require('../models/workspace');
        const ws = await Workspace.findByIdAndOwnerId(workspace_id, userId);
        if (!ws) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Set SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Flush headers
        res.flushHeaders();

        // Listen for events specific to this workspace
        const eventName = `workspace:${workspace_id}:status`;
        
        const listener = (deviceData) => {
            res.write(`event: device-status\\ndata: ${JSON.stringify(deviceData)}\\n\\n`);
        };
        
        sseEmitter.on(eventName, listener);

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\\n\\n');
        }, 15000);

        // Cleanup on client disconnect
        req.on('close', () => {
            sseEmitter.off(eventName, listener);
            clearInterval(heartbeat);
        });

    } catch (err) {
        next(err);
    }
};
"""

if "streamLiveStatus =" not in content:
    content = content.replace("module.exports = {", sse_method + "\nmodule.exports = {\n    streamLiveStatus,")

with open("backend/src/controllers/deviceController.js", "w") as f:
    f.write(content)

print("Added streamLiveStatus to deviceController.js")
