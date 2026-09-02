import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileCode, FileJson, FileText, Keyboard, Search, Settings, Terminal } from 'lucide-react';
import { useCommandPaletteStore } from '../stores/commandPaletteStore';
import { useRepoStore } from '../stores/repoStore';

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
  'apps/web/src/App.tsx',
  'apps/web/src/pages/WorkspacePage.tsx',
  'apps/web/src/components/ChatPanel.tsx',
  'docker-compose.yml',
  'requirements.txt',
  'README.md',
];

type CommandEntry = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  type: 'file' | 'action' | 'nav';
  action: () => void;
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'py') return <span className="text-sky-400 font-bold text-[9px] font-mono">PY</span>;
  if (ext === 'ts' || ext === 'tsx') return <span className="text-blue-400 font-bold text-[9px] font-mono">TS</span>;
  if (ext === 'json' || ext === 'yml') return <FileJson size={12} className="text-emerald-400" />;
  if (ext === 'md') return <FileText size={12} className="text-indigo-400" />;
  return <FileCode size={12} className="text-slate-400" />;
};

export const CommandPalette: React.FC = () => {
  const { isOpen, close } = useCommandPaletteStore();
  const selectFile = useRepoStore((s) => s.selectFile);

  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command list
  const allCommands = useMemo<CommandEntry[]>(() => {
    const fileCommands: CommandEntry[] = DEMO_FILES.map((f) => ({
      id: f,
      label: f.split('/').pop()!,
      description: f,
      icon: getFileIcon(f.split('/').pop()!),
      type: 'file',
      action: () => {
        selectFile(f);
        close();
      },
    }));

    const actions: CommandEntry[] = [
      {
        id: 'open-settings',
        label: 'AI Gateway Settings',
        description: 'Configure LLM provider and retrieval parameters',
        icon: <Settings size={12} className="text-indigo-400" />,
        type: 'action',
        action: () => close(),
      },
      {
        id: 'open-terminal',
        label: 'View Indexing Progress',
        description: 'Check current AST parsing & embedding progress',
        icon: <Terminal size={12} className="text-amber-400" />,
        type: 'action',
        action: () => close(),
      },
    ];

    return [...fileCommands, ...actions];
  }, [selectFile, close]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allCommands;
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [query, allCommands]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        filtered[activeIdx]?.action();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, close, filtered, activeIdx]);

  // Auto-scroll active item
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => close()}
    >
      <div
        className="w-full max-w-2xl bg-[#0c1120]/98 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-palette-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command Palette"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to file, search actions..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-sans"
          />
          <kbd className="text-[10px] text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            <>
              {filtered.some((f) => f.type === 'file') && (
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Files
                </div>
              )}
              {filtered.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === activeIdx
                      ? 'bg-indigo-600/20 text-white'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{cmd.label}</div>
                    {cmd.description && cmd.description !== cmd.label && (
                      <div className="text-[10px] text-slate-500 truncate font-mono">{cmd.description}</div>
                    )}
                  </div>
                  {idx === activeIdx && (
                    <kbd className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono shrink-0">↵</kbd>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5"><Keyboard size={10} /> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-white/5 border border-white/10 px-1 rounded">↑↓</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="bg-white/5 border border-white/10 px-1 rounded">↵</kbd> Open</span>
          <span className="flex items-center gap-1"><kbd className="bg-white/5 border border-white/10 px-1 rounded">ESC</kbd> Close</span>
          <span className="ml-auto">{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
};
