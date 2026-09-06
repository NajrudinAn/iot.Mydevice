with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

# Replace openModal calls to include stopPropagation
content = content.replace(
    "onClick={() => openModal(record)}",
    "onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(record); }}"
)

old_portal_code = """          {/* Payload Details Modal (TRUE PORTAL MODAL) */}
          {detailRecord && createPortal("""

new_portal_code = """          {/* Payload Details Modal */}
          {detailRecord && ("""

content = content.replace(old_portal_code, new_portal_code)

old_portal_end = """,
              document.body
          )}"""

new_portal_end = """          )}"""

content = content.replace(old_portal_end, new_portal_end)


with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Modal fix 2 applied")
