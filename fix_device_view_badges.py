with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

# Fix Online/Offline Badge
old_status = """                          <span className="flex-align gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                              <span className={isOnline ? 'text-green-700 font-medium' : 'text-muted'}>
                                  {isOnline ? 'Online' : 'Offline'}
                              </span>
                          </span>"""

new_status = """                          <div 
                              className={`flex items-center rounded border shrink-0 ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                              style={{ padding: '0.125rem 0.5rem', gap: '0.375rem', width: 'max-content' }}
                          >
                              <div 
                                  className={`rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                                  style={{ width: '0.375rem', height: '0.375rem' }}
                              ></div>
                              <span className="text-xs font-medium whitespace-nowrap leading-none" style={{ lineHeight: 1 }}>{isOnline ? 'Online' : 'Offline'}</span>
                          </div>"""

content = content.replace(old_status, new_status)

# Fix "fields" badge in the source cards
old_fields_badge = """                            <span className="bg-slate-50 text-slate-500 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-100">
                                {sourcesMap[src].length} fields
                            </span>"""

new_fields_badge = """                            <div 
                                className="bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0"
                                style={{ padding: '0.25rem 0.625rem', lineHeight: 1 }}
                            >
                                {sourcesMap[src].length} fields
                            </div>"""

content = content.replace(old_fields_badge, new_fields_badge)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Badges in DeviceView fixed.")
