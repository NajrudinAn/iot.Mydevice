with open("backend/src/controllers/deviceController.js", "r") as f:
    content = f.read()

old_headers = """        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');"""

new_headers = """        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');"""

content = content.replace(old_headers, new_headers)

with open("backend/src/controllers/deviceController.js", "w") as f:
    f.write(content)

print("Updated headers to prevent proxy buffering")
