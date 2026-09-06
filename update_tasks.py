import os

task_content = """- [ ] Create `buildTreeFromLiveData` function in `WorkspaceDataDeviceView.jsx`
- [ ] Create `LiveMetricTreeRenderer` recursive component
- [ ] Replace the flat mapping in the "Live Data" tab with the tree renderer
- [ ] Ensure formatting logic for Array and Objects is bulletproof
- [ ] Test the changes by building and verifying with live simulator data
"""

with open("/Users/najrudin/.gemini/antigravity-ide/brain/c7a38e07-ea97-43c2-bc5b-3b29e2d2cb46/task.md", "w") as f:
    f.write(task_content)

print("Tasks updated.")
