with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

# Replace rounded-2xl with rounded-xl on the source cards
content = content.replace("rounded-2xl p-6 shadow-sm hover:shadow-xl", "rounded-xl p-6 shadow-sm hover:shadow-lg")

# Fix the Icon container hover class
# Was: group-hover:bg-blue group-hover:text-white transition-colors group-hover:border-blue
# Should use: group-hover:bg-blue-500 group-hover:text-white transition-colors
content = content.replace(
    "bg-slate-50 border border-slate-100 flex-center text-slate-400 group-hover:bg-blue group-hover:text-white transition-colors group-hover:border-blue",
    "bg-slate-50 border border-slate-100 flex-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors border-transparent"
)

# Fix the arrow footer button
# Was: w-8 h-8 rounded-full bg-slate-50 flex-center text-slate-400 group-hover:bg-blue group-hover:text-white transition-all transform group-hover:translate-x-1
# Should use: group-hover:bg-blue-500 group-hover:text-white
content = content.replace(
    "w-8 h-8 rounded-full bg-slate-50 flex-center text-slate-400 group-hover:bg-blue group-hover:text-white transition-all transform group-hover:translate-x-1",
    "w-8 h-8 rounded-full bg-slate-50 flex-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all transform group-hover:translate-x-1"
)

# Fix the "X fields" badge hover
# Was: bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue/5 group-hover:text-blue group-hover:border-blue/20 transition-colors
# Should use: group-hover:bg-blue-100 group-hover:text-blue-500
content = content.replace(
    "bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue/5 group-hover:text-blue group-hover:border-blue/20 transition-colors",
    "bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors"
)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Hover states fixed.")
