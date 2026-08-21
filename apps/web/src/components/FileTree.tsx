import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Search,
} from 'lucide-react';
import { useRepoStore } from '../stores/repoStore';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: Record<string, TreeNode>;
}

interface FileTreeProps {
  files?: string[];
  onSelectFile?: (filePath: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ files = [], onSelectFile }) => {
  const selectedFile = useRepoStore((state) => state.selectedFile);
  const selectFileStore = useRepoStore((state) => state.selectFile);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
  });

  // Default sample files if tree is empty (e.g. before full repository tree fetch)
  const effectiveFiles = useMemo(() => {
    if (files.length > 0) return files;
    return [
      'src/main.py',
      'src/config.py',
      'src/models/user.py',
      'src/models/repo.py',
      'src/services/auth.py',
      'src/services/indexer.py',
      'src/services/search.py',
      'tests/test_auth.py',
      'tests/test_indexer.py',
      'README.md',
    ];
  }, [files]);

  // Build hierarchical tree structure from flat file paths
  const rootNode = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };

    effectiveFiles.forEach((filePath) => {
      const parts = filePath.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        if (!current.children) {
          current.children = {};
        }

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            children: !isLast ? {} : undefined,
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }, [effectiveFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }));
  };

  const handleFileClick = (filePath: string) => {
    selectFileStore(filePath);
    if (onSelectFile) {
      onSelectFile(filePath);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'go':
      case 'rs':
      case 'java':
        return <FileCode size={14} className="text-indigo-400 shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText size={14} className="text-amber-400 shrink-0" />;
      default:
        return <FileCode size={14} className="text-slate-400 shrink-0" />;
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.name === 'root') {
      return Object.values(node.children || {}).map((child) => renderNode(child, depth));
    }

    // Filter by search query
    if (searchTerm) {
      if (!node.path.toLowerCase().includes(searchTerm.toLowerCase())) {
        return null;
      }
    }

    const isExpanded = expandedFolders[node.path] ?? true;
    const isSelected = selectedFile === node.path;

    if (node.isFolder) {
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="flex items-center gap-1.5 py-1 px-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 rounded cursor-pointer transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="text-amber-400" />
            ) : (
              <Folder size={14} className="text-amber-400" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {Object.values(node.children).map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        onClick={() => handleFileClick(node.path)}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        className={`flex items-center gap-2 py-1 px-2 text-xs font-mono rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-indigo-600/30 text-indigo-300 font-semibold border-l-2 border-indigo-500'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
        }`}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <aside className="h-full flex flex-col bg-[#0f1422] border-r border-white/5 overflow-hidden" aria-label="Repository File Explorer">
      {/* File Explorer Header & Search */}
      <div className="p-2.5 border-b border-white/5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Files
        </div>
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161d2f] text-xs text-slate-200 pl-7 pr-2 py-1 rounded border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Tree Node Container */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 font-sans">
        {renderNode(rootNode)}
      </div>
    </aside>
  );
};
