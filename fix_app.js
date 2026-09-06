const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let content = fs.readFileSync(file, 'utf8');

const rootRedirect = `
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.is_platform_admin ? <Navigate to="/platform" replace /> : <Navigate to="/portal" replace />;
};
`;

content = content.replace('export default function App() {', rootRedirect + '\nexport default function App() {');
content = content.replace('<Route path="/" element={<Navigate to="/platform" replace />} />', '<Route path="/" element={<RootRedirect />} />');

fs.writeFileSync(file, content, 'utf8');
