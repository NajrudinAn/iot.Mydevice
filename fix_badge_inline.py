with open("frontend/src/pages/WorkspaceData.jsx", "r") as f:
    content = f.read()

old_badge = """                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border shrink-0 w-fit ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                    <span className="text-xs font-medium whitespace-nowrap leading-none">{isOnline ? 'Online' : 'Offline'}</span>
                                </div>"""

new_badge = """                                <div 
                                    className={`flex items-center rounded border shrink-0 ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                    style={{ padding: '0.25rem 0.625rem', gap: '0.375rem', width: 'max-content' }}
                                >
                                    <div 
                                        className={`rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                                        style={{ width: '0.375rem', height: '0.375rem' }}
                                    ></div>
                                    <span className="text-xs font-medium whitespace-nowrap leading-none" style={{ lineHeight: 1 }}>{isOnline ? 'Online' : 'Offline'}</span>
                                </div>"""

content = content.replace(old_badge, new_badge)

with open("frontend/src/pages/WorkspaceData.jsx", "w") as f:
    f.write(content)

print("Badge inline styles applied.")
