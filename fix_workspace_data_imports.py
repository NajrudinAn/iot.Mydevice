with open("frontend/src/pages/WorkspaceData.jsx", "r") as f:
    content = f.read()

imports = "import { useAuth } from '../context/AuthContext';\nimport { useSSE } from '../hooks/useSSE';\n"

if "useAuth" not in content[:500]:
    content = content.replace("import Spinner from '../components/ui/Spinner';", "import Spinner from '../components/ui/Spinner';\n" + imports)

with open("frontend/src/pages/WorkspaceData.jsx", "w") as f:
    f.write(content)

print("Fixed imports in WorkspaceData.jsx")
