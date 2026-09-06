with open("frontend/src/hooks/useSSE.js", "r") as f:
    content = f.read()

# Replace the condition to get token
if "const activeToken = token || localStorage.getItem('platform_token');" not in content:
    content = content.replace("        if (!url || !token) return;", 
"""        const activeToken = token || localStorage.getItem('platform_token');
        if (!url || !activeToken) return;""")
        
    content = content.replace("'Authorization': `Bearer ${token}`", "'Authorization': `Bearer ${activeToken}`")

with open("frontend/src/hooks/useSSE.js", "w") as f:
    f.write(content)

print("Fixed useSSE token extraction")
