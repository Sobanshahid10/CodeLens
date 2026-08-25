import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  GitBranch,
  Network,
} from 'lucide-react';
import { ChatPanel } from '../components/ChatPanel';
import { CodeViewer } from '../components/CodeViewer';
import { FileTree } from '../components/FileTree';
import { useRepoStore } from '../stores/repoStore';
import { UserMenu } from '../components/UserMenu';

export const WorkspacePage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();

  const currentRepo = useRepoStore((state) => state.currentRepo);
  const setCurrentRepo = useRepoStore((state) => state.setCurrentRepo);
  const selectedFile = useRepoStore((state) => state.selectedFile);

  useEffect(() => {
    if (repoId) {
      setCurrentRepo(repoId);
    }
  }, [repoId, setCurrentRepo]);

  if (!repoId) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#07090e] text-slate-300">
        <p>No repository selected.</p>
        <Link to="/dashboard" className="text-indigo-400 mt-2 text-xs hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="workspace-grid selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header Bar (grid-column: 1 / -1) */}
      <header className="workspace-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="p-1 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-sm">
              <Code2 size={13} />
            </div>
            <span className="font-bold text-white tracking-tight">
              {currentRepo?.github_full_name || 'CodeLens Workspace'}
            </span>

            {currentRepo?.default_branch && (
              <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <GitBranch size={10} /> {currentRepo.default_branch}
              </span>
            )}

            <ChevronRight size={13} className="text-slate-600" />

            <span className="text-indigo-300 font-mono text-[11px] truncate max-w-xs">
              {selectedFile || 'welcome.py'}
            </span>
          </div>
        </div>

        {/* Center / Right Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            to={`/repo/${repoId}/graph`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-200 text-xs font-semibold border border-purple-500/30 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Network size={14} className="text-purple-400" />
            <span>Dependency Graph</span>
          </Link>

          <div className="h-4 w-px bg-white/10" />

          {/* Indexing Status Chip */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AST Ready (157 Chunks)</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* User Profile & Settings Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Left Panel: File Explorer */}
      <FileTree />

      {/* Center Panel: Monaco Code Viewer */}
      <CodeViewer />

      {/* Right Panel: AI Assistant Chat */}
      <ChatPanel />
    </div>
  );
};
