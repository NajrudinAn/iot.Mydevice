import glob
import os

files_to_fix = [
    "frontend/src/pages/WorkspaceDeviceDetails.jsx",
    "frontend/src/pages/ApplicationsList.jsx",
    "frontend/src/pages/WorkspaceDevices.jsx",
    "frontend/src/pages/WorkspaceData.jsx"
]

for file_path in files_to_fix:
    with open(file_path, "r") as f:
        content = f.read()

    # The useSSE call looks like: useSSE(..., token, (event) => {
    # We want to change it to: useSSE(..., token, (event, eventType) => {
    # and add a check: if (eventType !== 'device-status') return;

    if ", token, (event) => {" in content:
        new_content = content.replace(
            ", token, (event) => {", 
            ", token, (event, eventType) => {\n    if (eventType !== 'device-status') return;"
        )
        with open(file_path, "w") as f:
            f.write(new_content)
        print(f"Fixed {file_path}")

