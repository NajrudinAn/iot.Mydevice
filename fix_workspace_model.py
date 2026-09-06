with open("backend/src/models/workspace.js", "r") as f:
    content = f.read()

# Replace status count queries to be case-insensitive
old_online_query = "(SELECT COUNT(*) FROM devices WHERE workspace_id = $1 AND status = 'online') as online_devices,"
new_online_query = "(SELECT COUNT(*) FROM devices WHERE workspace_id = $1 AND UPPER(status) = 'ONLINE') as online_devices,"
content = content.replace(old_online_query, new_online_query)

old_offline_query = "(SELECT COUNT(*) FROM devices WHERE workspace_id = $1 AND status = 'offline') as offline_devices,"
new_offline_query = "(SELECT COUNT(*) FROM devices WHERE workspace_id = $1 AND UPPER(status) = 'OFFLINE') as offline_devices,"
content = content.replace(old_offline_query, new_offline_query)

with open("backend/src/models/workspace.js", "w") as f:
    f.write(content)

print("Workspace model fixed.")
