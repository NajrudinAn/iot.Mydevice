with open("frontend/src/pages/WorkspaceData.jsx", "r") as f:
    content = f.read()

old_badge = """                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>"""

new_badge = """                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border shrink-0 w-fit ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                    <span className="text-xs font-medium whitespace-nowrap leading-none">{isOnline ? 'Online' : 'Offline'}</span>
                                </div>"""

content = content.replace(old_badge, new_badge)

with open("frontend/src/pages/WorkspaceData.jsx", "w") as f:
    f.write(content)

print("Badge fixed.")
