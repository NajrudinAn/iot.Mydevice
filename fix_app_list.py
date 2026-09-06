with open("frontend/src/pages/ApplicationsList.jsx", "r") as f:
    content = f.read()

content = content.replace(
    "device.status === 'online'",
    "device.status?.toUpperCase() === 'ONLINE'"
)

with open("frontend/src/pages/ApplicationsList.jsx", "w") as f:
    f.write(content)

print("ApplicationsList fixed.")
