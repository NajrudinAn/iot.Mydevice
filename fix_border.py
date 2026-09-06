with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

# Fix the nested group container classes
# Was: className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50/50' : 'border-gray-200/60 bg-white'} rounded-lg p-3 sm:p-4 mb-3`}
# Should be: className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50' : 'border-gray-100 bg-white'} rounded-lg p-3 sm:p-4 mb-3`}

old_line = "className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50/50' : 'border-gray-200/60 bg-white'} rounded-lg p-3 sm:p-4 mb-3`}"
new_line = "className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50' : 'border-gray-200 bg-white'} rounded-lg p-3 sm:p-4 mb-3`}"
content = content.replace(old_line, new_line)


with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Border fixed.")
