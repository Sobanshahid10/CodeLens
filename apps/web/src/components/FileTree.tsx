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
  X,
} from 'lucide-react';
import { useRepoStore } from '../stores/repoStore';
import { useCommandPaletteStore } from '../stores/commandPaletteStore';

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

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':  return <span className="text-sky-400 font-bold text-[9px] font-mono leading-none">PY</span>;
    case 'ts':
    case 'tsx': return <span className="text-blue-400 font-bold text-[9px] font-mono leading-none">TS</span>;
    case 'js':
    case 'jsx': return <span className="text-amber-400 font-bold text-[9px] font-mono leading-none">JS</span>;
    case 'go':  return <span className="text-cyan-400 font-bold text-[9px] font-mono leading-none">GO</span>;
    case 'rs':  return <span className="text-orange-400 font-bold text-[9px] font-mono leading-none">RS</span>;
    case 'json': return <FileJson size={12} className="text-emerald-400" />;
    case 'yml':
    case 'yaml': return <Settings size={12} className="text-purple-400" />;
    case 'md':  return <FileText size={12} className="text-indigo-400" />;
    case 'sql': return <span className="text-rose-400 font-bold text-[9px] font-mono leading-none">SQL</span>;
    case 'sh':  return <span className="text-amber-300 font-bold text-[9px] font-mono leading-none">SH</span>;
    default:    return <FileCode size={12} className="text-slate-400" />;
  }
};

const DEMO_FILES = [
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
  'apps/web/src/components/ChatPanel.tsx',
  'apps/web/src/components/CodeViewer.tsx',
  'apps/web/src/components/FileTree.tsx',
  'docker-compose.yml',
  'requirements.txt',
  'README.md',
];

export const FileTree: React.FC<FileTreeProps> = ({ files = [], onSelectFile }) => {
  const selectedFile = useRepoStore((s) => s.selectedFile);
  const selectFileStore = useRepoStore((s) => s.selectFile);
  const openPalette = useCommandPaletteStore((s) => s.open);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
    apps: true,
    'apps/api': true,
    'apps/api/app': true,
    packages: true,
  });

  const effectiveFiles = useMemo(() => {
    return files.length > 0 ? files : DEMO_FILES;
  }, [files]);

  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return effectiveFiles;
    return effectiveFiles.filter((f) => f.toLowerCase().includes(q));
  }, [effectiveFiles, searchTerm]);

  // Build tree
  const rootNode = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };
    filteredFiles.forEach((filePath) => {
      const parts = filePath.split('/');
      let current = root;
      parts.forEach((part, i) => {
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');
        if (!current.children) current.children = {};
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
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
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

  const collapseAll = () => setExpandedFolders({ root: true });

  const handleFileClick = (filePath: string) => {
    selectFileStore(filePath);
    onSelectFile?.(filePath);
  };

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    if (node.name === 'root') {
      return (
        <div className="space-y-px">
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
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
            className="w-full flex items-center gap-1.5 py-[5px] pr-2 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded transition-all text-left group"
          >
            {isExpanded
              ? <ChevronDown size={12} className="text-slate-500 shrink-0" />
              : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
            {isExpanded
              ? <FolderOpen size={13} className="text-indigo-400/80 shrink-0" />
              : <Folder size={13} className="text-indigo-400/60 shrink-0" />}
            <span className="truncate font-medium text-slate-300">{node.name}</span>
          </button>

          {isExpanded && node.children && (
            <div className="border-l border-white/[0.04] ml-[18px]">
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
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        className={`w-full flex items-center gap-2 py-[5px] pr-2 text-[11px] rounded transition-all text-left group ${
          isSelected
            ? 'bg-indigo-600/15 text-indigo-300 border-l-2 border-indigo-500 font-semibold shadow-sm shadow-indigo-900/30'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
        }`}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {getFileIcon(node.name)}
        </div>
        <span className="truncate font-mono">{node.name}</span>
      </button>
    );
  };

  return (
    <aside className="h-full flex flex-col bg-[#0b0f1c] border-r border-white/[0.06] overflow-hidden" aria-label="Repository File Tree">
      {/* Header */}
      <div className="h-11 px-3 bg-[#0b0f1c] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
          <FolderTree size={13} className="text-indigo-400" />
          <span>Explorer</span>
          <span className="text-[10px] text-slate-600 font-mono">({filteredFiles.length})</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={expandAll} title="Expand All" className="text-[10px] text-slate-600 hover:text-indigo-400 px-1.5 py-0.5 rounded hover:bg-white/[0.05] font-mono transition-colors">+</button>
          <button onClick={collapseAll} title="Collapse All" className="text-[10px] text-slate-600 hover:text-indigo-400 px-1.5 py-0.5 rounded hover:bg-white/[0.05] font-mono transition-colors">-</button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 pt-2 pb-1.5 border-b border-white/[0.05] shrink-0">
        <div className="relative group">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Filter files…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-6 py-1.5 rounded-lg bg-[#0f1520] border border-white/[0.06] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 font-sans">
        {renderNode(rootNode)}
        {filteredFiles.length === 0 && (
          <div className="text-center py-8 text-[11px] text-slate-600">
            No files match &ldquo;{searchTerm}&rdquo;
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-[#07090e] border-t border-white/[0.05] shrink-0">
        <button
          onClick={openPalette}
          className="w-full flex items-center justify-between text-[10px] text-slate-600 hover:text-slate-400 transition-colors group"
        >
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
            <span>Tree-Sitter Parsed · AST Ready</span>
          </span>
          <kbd className="opacity-50 group-hover:opacity-100 transition-opacity">⌘K</kbd>
        </button>
      </div>
    </aside>
  );
};
