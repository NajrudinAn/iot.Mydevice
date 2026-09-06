with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

old_content = """                  {/* Modal Content */}
                  <div 
                      className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 relative z-10" 
                  >"""

new_content = """                  {/* Modal Content */}
                  <div 
                      className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative z-10" 
                      style={{ width: '100%', maxWidth: '56rem', maxHeight: '90vh' }}
                  >"""

content = content.replace(old_content, new_content)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Modal content styles applied")
