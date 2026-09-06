with open("frontend/src/pages/WorkspaceDeviceDetails.jsx", "r") as f:
    content = f.read()

content = content.replace("device.status === 'online'", "device.status?.toUpperCase() === 'ONLINE'")

with open("frontend/src/pages/WorkspaceDeviceDetails.jsx", "w") as f:
    f.write(content)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

content = content.replace("device.status === 'ONLINE'", "device.status?.toUpperCase() === 'ONLINE'")

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Other pages fixed.")
