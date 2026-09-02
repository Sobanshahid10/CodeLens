import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  GitBranch,
  Keyboard,
  Network,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { ChatPanel } from '../components/ChatPanel';
import { CodeViewer } from '../components/CodeViewer';
import { FileTree } from '../components/FileTree';
import { useRepoStore } from '../stores/repoStore';
import { UserMenu } from '../components/UserMenu';
import { useCommandPaletteStore } from '../stores/commandPaletteStore';

export const WorkspacePage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const setCurrentRepo = useRepoStore((s) => s.setCurrentRepo);
  const selectedFile = useRepoStore((s) => s.selectedFile);
  const openPalette = useCommandPaletteStore((s) => s.open);

  const [explorerOpen, setExplorerOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);

  useEffect(() => {
    if (repoId) setCurrentRepo(repoId);
  }, [repoId, setCurrentRepo]);

  // Keyboard: B = toggle explorer, J = toggle chat, K = palette
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setExplorerOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') { e.preventDefault(); setChatOpen((v) => !v); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  // Grid class
  const gridClass = [
    'workspace-grid',
    !explorerOpen ? 'explorer-collapsed' : '',
    !chatOpen ? 'chat-collapsed' : '',
    !explorerOpen && !chatOpen ? 'both-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!repoId) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#07090e] text-slate-300 gap-3">
        <p className="text-sm">No repository selected.</p>
        <Link to="/dashboard" className="text-indigo-400 text-xs hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={gridClass + ' selection:bg-indigo-500/30 selection:text-indigo-200'}>
      {/* ── Header ── */}
      <header className="workspace-header">
        <div className="flex items-center gap-2">
          {/* Back */}
          <button
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all text-xs font-semibold"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Explorer toggle */}
          <button
            onClick={() => setExplorerOpen((v) => !v)}
            title="Toggle Explorer (⌘B)"
            className={`p-1.5 rounded-lg transition-all text-xs ${
              explorerOpen ? 'text-indigo-400 bg-indigo-600/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <PanelLeft size={15} />
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="p-1 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-sm">
              <Code2 size={12} />
            </div>
            <span className="font-bold text-white tracking-tight truncate max-w-[140px]">
              {currentRepo?.github_full_name || 'CodeLens'}
            </span>

            {currentRepo?.default_branch && (
              <span className="text-[10px] text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <GitBranch size={9} /> {currentRepo.default_branch}
              </span>
            )}

            {selectedFile && (
              <>
                <ChevronRight size={12} className="text-slate-700" />
                <span className="text-indigo-300 font-mono text-[11px] truncate max-w-[200px]">
                  {selectedFile.split('/').pop()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Cmd+K */}
          <button
            onClick={openPalette}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-slate-400 hover:text-slate-200 text-[11px] transition-all"
          >
            <span>Go to file</span>
            <kbd className="text-[9px]">⌘K</kbd>
          </button>

          <Link
            to={`/repo/${repoId}/graph`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-200 text-xs font-semibold border border-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Network size={13} className="text-purple-400" />
            <span className="hidden sm:inline">Graph</span>
          </Link>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* AST status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/25 text-[10px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AST Ready</span>
          </div>

          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen((v) => !v)}
            title="Toggle Chat (⌘J)"
            className={`p-1.5 rounded-lg transition-all ${
              chatOpen ? 'text-indigo-400 bg-indigo-600/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <PanelRight size={15} />
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Shortcuts */}
          <button
            onClick={() => setShowShortcutsHint((v) => !v)}
            title="Keyboard shortcuts"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors relative"
          >
            <Keyboard size={14} />
          </button>

          <UserMenu />
        </div>
      </header>

      {/* Shortcuts hint overlay */}
      {showShortcutsHint && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShortcutsHint(false)}
        >
          <div
            className="bg-[#0c1120]/98 border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white mb-4 font-display">Keyboard Shortcuts</h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              {[
                ['Toggle Explorer', '⌘B'],
                ['Toggle Chat', '⌘J'],
                ['File Finder', '⌘K'],
                ['Send Chat Message', 'Enter'],
                ['New Line in Chat', 'Shift+Enter'],
              ].map(([action, key]) => (
                <div key={action} className="flex items-center justify-between">
                  <span>{action}</span>
                  <kbd>{key}</kbd>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowShortcutsHint(false)}
              className="mt-5 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ width: explorerOpen ? undefined : 0, display: explorerOpen ? undefined : 'none' }}
      >
        <FileTree />
      </div>

      {/* Center Panel */}
      <CodeViewer />

      {/* Right Panel */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ display: chatOpen ? undefined : 'none' }}
      >
        <ChatPanel />
      </div>
    </div>
  );
};
