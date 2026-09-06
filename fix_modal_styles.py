with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

old_modal = """          {/* Payload Details Modal */}
          {detailRecord && (
              <div 
                  className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" 
                  style={{ zIndex: 99999 }}
              >
                  {/* Backdrop */}
                  <div 
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                      onClick={() => setDetailRecord(null)}
                  ></div>"""

new_modal = """          {/* Payload Details Modal */}
          {detailRecord && (
              <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 99999 }}
              >
                  {/* Backdrop */}
                  <div 
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
                      onClick={() => setDetailRecord(null)}
                  ></div>"""

content = content.replace(old_modal, new_modal)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Modal inline styles applied")
