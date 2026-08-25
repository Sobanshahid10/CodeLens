import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  Search,
  Settings,
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
    src: true,
    'src/services': true,
    'src/routes': true,
    'packages/ast_parser': true,
    'packages/llm_gateway': true,
  });

  const effectiveFiles = useMemo(() => {
    if (files.length > 0) return files;
    return [
      'apps/api/app/main.py',
      'apps/api/app/config.py',
      'apps/api/app/routes/auth.py',
      'apps/api/app/routes/repos.py',
      'apps/api/app/routes/chat.py',
      'apps/api/app/routes/search.py',
      'apps/api/app/services/retrieval.py',
      'apps/worker/tasks/indexing.py',
      'packages/ast_parser/src/engine.py',
      'packages/llm_gateway/src/router.py',
      'packages/llm_gateway/src/providers/gemini_provider.py',
      'packages/llm_gateway/src/providers/openai_provider.py',
      'packages/llm_gateway/src/providers/mock_provider.py',
      'apps/web/src/App.tsx',
      'apps/web/src/pages/WorkspacePage.tsx',
      'docker-compose.yml',
      'requirements.txt',
      'README.md',
    ];
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return effectiveFiles;
    return effectiveFiles.filter((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [effectiveFiles, searchTerm]);

  // Build hierarchical tree structure
  const rootNode = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };

    filteredFiles.forEach((filePath) => {
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
  }, [filteredFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = { root: true };
    effectiveFiles.forEach((f) => {
      const parts = f.split('/');
      parts.slice(0, -1).forEach((_, i) => {
        all[parts.slice(0, i + 1).join('/')] = true;
      });
    });
    setExpandedFolders(all);
  };

  const collapseAll = () => {
    setExpandedFolders({ root: true });
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
        return <span className="text-sky-400 font-bold text-[10px]">PY</span>;
      case 'ts':
      case 'tsx':
        return <span className="text-blue-400 font-bold text-[10px]">TS</span>;
      case 'js':
      case 'jsx':
        return <span className="text-amber-400 font-bold text-[10px]">JS</span>;
      case 'json':
        return <FileJson size={13} className="text-emerald-400" />;
      case 'yml':
      case 'yaml':
        return <Settings size={13} className="text-purple-400" />;
      case 'md':
        return <FileText size={13} className="text-indigo-400" />;
      case 'sql':
        return <span className="text-rose-400 font-bold text-[10px]">SQL</span>;
      default:
        return <FileCode size={13} className="text-slate-400" />;
    }
  };

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    if (node.name === 'root') {
      return (
        <div className="space-y-0.5">
          {Object.values(node.children || {}).map((child) => renderNode(child, 0))}
        </div>
      );
    }

    const isExpanded = expandedFolders[node.path] ?? depth < 2;
    const isSelected = selectedFile === node.path;

    if (node.isFolder) {
      return (
        <div key={node.path} className="select-none">
          <button
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            className="w-full flex items-center gap-1.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors text-left group"
          >
            {isExpanded ? (
              <ChevronDown size={13} className="text-slate-400 group-hover:text-white" />
            ) : (
              <ChevronRight size={13} className="text-slate-400 group-hover:text-white" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="text-indigo-400 shrink-0" />
            ) : (
              <Folder size={14} className="text-indigo-400 shrink-0" />
            )}
            <span className="truncate font-medium text-slate-200">{node.name}</span>
          </button>

          {isExpanded && node.children && (
            <div className="border-l border-white/5 ml-3">
              {Object.values(node.children).map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        onClick={() => handleFileClick(node.path)}
        style={{ paddingLeft: `${depth * 14 + 18}px` }}
        className={`w-full flex items-center gap-2 py-1 text-xs rounded-md transition-all text-left ${
          isSelected
            ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 shadow-sm shadow-indigo-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {getFileIcon(node.name)}
        </div>
        <span className="truncate font-mono text-[11px]">{node.name}</span>
      </button>
    );
  };

  return (
    <aside className="h-full flex flex-col bg-[#0c101a] border-r border-white/5 overflow-hidden" aria-label="Repository File Tree">
      {/* Explorer Header */}
      <div className="h-10 px-3 bg-[#0c101a] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <FolderTree size={14} className="text-indigo-400" />
          <span>Explorer</span>
          <span className="text-[10px] text-slate-500 font-mono">({filteredFiles.length})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            title="Expand All"
            className="text-[10px] text-slate-400 hover:text-indigo-300 px-1 py-0.5 rounded hover:bg-white/5 font-mono"
          >
            +all
          </button>
          <button
            onClick={collapseAll}
            title="Collapse All"
            className="text-[10px] text-slate-400 hover:text-indigo-300 px-1 py-0.5 rounded hover:bg-white/5 font-mono"
          >
            -all
          </button>
        </div>
      </div>

      {/* File Search Filter */}
      <div className="p-2 border-b border-white/5 shrink-0 bg-[#07090e]/60">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search files (e.g. search.py)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1 rounded-md bg-[#131927] border border-white/5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-sans">
        {renderNode(rootNode)}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#07090e] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Tree-Sitter Parsed
        </span>
        <span>AST Ready</span>
      </div>
    </aside>
  );
};
