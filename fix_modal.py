with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

old_modal_start = """          {/* Payload Details Modal (TRUE PORTAL MODAL) */}
          {detailRecord && createPortal(
              <div 
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex-center z-50 p-4 sm:p-6" 
                  onClick={(e) => { if(e.target === e.currentTarget) setDetailRecord(null); }}
              >
                  <div 
                      className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-auto overflow-hidden border border-slate-200" 
                      onClick={e => e.stopPropagation()}
                  >"""

new_modal_start = """          {/* Payload Details Modal (TRUE PORTAL MODAL) */}
          {detailRecord && createPortal(
              <div 
                  className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" 
                  style={{ zIndex: 99999 }}
              >
                  {/* Backdrop */}
                  <div 
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                      onClick={() => setDetailRecord(null)}
                  ></div>
                  
                  {/* Modal Content */}
                  <div 
                      className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 relative z-10" 
                  >"""

content = content.replace(old_modal_start, new_modal_start)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Modal fixed")
