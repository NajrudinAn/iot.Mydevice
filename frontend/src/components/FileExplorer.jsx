import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FileNode = ({ node }) => {
  return (
    <div className="flex items-center gap-3 py-2 px-3 mx-1 my-0.5 hover:bg-slate-100/60 rounded-lg text-sm text-slate-700 transition-colors group cursor-default">
      <File size={16} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
      <span className="flex-1 truncate font-medium">{node.name}</span>
      {node.size !== undefined && <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">{formatSize(node.size)}</span>}
    </div>
  );
};

const FolderNode = ({ node, childrenNodes }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div>
      <div 
        className="flex items-center gap-2 py-2 px-3 mx-1 my-0.5 hover:bg-slate-100/60 rounded-lg cursor-pointer text-sm font-semibold text-slate-800 transition-colors group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <Folder size={18} className="text-blue-500" fill="currentColor" fillOpacity={isOpen ? 0.3 : 0.1} />
        <span>{node.name}</span>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pl-5 ml-4 border-l border-slate-200/60">
          {childrenNodes}
        </div>
      </div>
    </div>
  );
};

export default function FileExplorer({ files }) {
  // Convert flat array of { name, path, type, size } to nested tree
  // Actually, the API returns a flat array, we can just build a tree structure
  const buildTree = (flatFiles) => {
    const root = { type: 'folder', name: 'root', children: {}, files: [] };
    
    flatFiles.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.children[part]) {
          current.children[part] = { type: 'folder', name: part, children: {}, files: [] };
        }
        current = current.children[part];
      }
      
      const fileName = parts[parts.length - 1];
      if (file.type === 'folder') {
        if (!current.children[fileName]) {
            current.children[fileName] = { type: 'folder', name: fileName, children: {}, files: [] };
        }
      } else {
        current.files.push({ ...file, name: fileName });
      }
    });
    
    return root;
  };
  
  const tree = buildTree(files || []);
  
  const renderTree = (node) => {
    const folders = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
    
    return (
      <>
        {folders.map(f => (
          <FolderNode key={f.name} node={f} childrenNodes={renderTree(f)} />
        ))}
        {sortedFiles.map(f => (
          <FileNode key={f.name} node={f} />
        ))}
      </>
    );
  };
  
  if (!files || files.length === 0) {
    return <div className="p-4 text-center text-gray-500 text-sm">No files found.</div>;
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 font-mono overflow-auto max-h-[500px]">
      {renderTree(tree)}
    </div>
  );
}
