const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend', 'src', 'pages', 'UserPortal.jsx');
let content = fs.readFileSync(file, 'utf8');

const newStyles = `
  const customStyles = \`
    .hover-lift {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .hover-lift:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .pill-badge-viewer { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .pill-badge-operator { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .icon-box-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .icon-box-orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
    .icon-box-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .icon-box-yellow { background: rgba(234, 179, 8, 0.1); color: #eab308; }
    .icon-box-purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
    
    /* Missing utilities */
    .bg-transparent { background-color: transparent !important; }
    .border-none { border: none !important; outline: none !important; }
    .cursor-pointer { cursor: pointer; }
    .hover-text-main:hover { color: var(--text-main) !important; }
    .hover-text-primary-hover:hover { color: var(--primary-hover) !important; }
    
    .ds-icon-button {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
      padding: 0.25rem;
    }
    .ds-icon-button:hover {
      background: rgba(0,0,0,0.05);
      color: var(--text-main);
    }
    
    .ds-text-button {
      background: transparent;
      border: none;
      color: var(--blue);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.5rem;
      transition: all 0.2s;
    }
    .ds-text-button:hover {
      color: var(--primary-hover);
      background: rgba(59, 130, 246, 0.05);
      border-radius: var(--radius-sm);
    }
    
    .tab-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      border: none;
      background: transparent;
      font-weight: 500;
      font-size: 0.95rem;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
      color: var(--text-muted);
    }
    .tab-button.active {
      background: rgba(59, 130, 246, 0.1);
      color: var(--blue);
      font-weight: 600;
    }
    .tab-button:hover:not(.active) {
      background: rgba(0,0,0,0.03);
      color: var(--text-main);
    }
  \`;
`;

content = content.replace(/const customStyles = `[\s\S]*?`;/, newStyles.trim());

// Update the MoreVertical button
content = content.replace(/<button className="text-muted bg-transparent border-none cursor-pointer hover:text-main"><MoreVertical size={18} \/><\/button>/g, '<button className="ds-icon-button"><MoreVertical size={18} /></button>');

// Update the "Open Workspace" and "Open Application" buttons
content = content.replace(/<button\s*className="text-blue text-sm font-medium flex-align gap-2 cursor-pointer w-full flex-center bg-transparent border-none hover:text-primary-hover"\s*/g, '<button className="ds-text-button" style={{ gap: "0.5rem" }} ');
content = content.replace(/<button\s*className="text-blue text-sm font-medium flex-align gap-2 cursor-pointer bg-transparent border-none hover:text-primary-hover"\s*/g, '<button className="ds-text-button" style={{ width: "auto", gap: "0.5rem", flexShrink: 0 }} ');

fs.writeFileSync(file, content, 'utf8');
