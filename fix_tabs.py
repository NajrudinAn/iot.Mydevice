with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

old_tabs = """                      className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
                          activeTab === tab 
                          ? 'bg-white text-blue shadow-sm border border-slate-200/60' 
                          : 'text-muted hover:text-main hover:bg-slate-100'
                      }`}"""

new_tabs = """                      className={`px-5 py-2 text-sm font-medium rounded-md transition-all border ${
                          activeTab === tab 
                          ? 'bg-white text-blue shadow-sm border-blue' 
                          : 'text-muted hover:text-main hover:bg-slate-100 border-transparent'
                      }`}"""

content = content.replace(old_tabs, new_tabs)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Tabs fixed.")
