import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Code2,
  GitBranch,
  Network,
} from 'lucide-react';
import { ChatPanel } from '../components/ChatPanel';
import { CodeViewer } from '../components/CodeViewer';
import { FileTree } from '../components/FileTree';
import { useAuthStore } from '../stores/authStore';
import { useRepoStore } from '../stores/repoStore';

export const WorkspacePage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const currentRepo = useRepoStore((state) => state.currentRepo);
  const setCurrentRepo = useRepoStore((state) => state.setCurrentRepo);
  const selectFile = useRepoStore((state) => state.selectFile);

  useEffect(() => {
    if (repoId) {
      setCurrentRepo(repoId);
    }
  }, [repoId, setCurrentRepo]);

  if (!repoId) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0d14] text-slate-300">
        <p>No repository selected.</p>
        <Link to="/dashboard" className="text-indigo-400 mt-2 text-xs hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="workspace-grid">
      {/* Top Header Bar (grid-column: 1 / -1) */}
      <header className="workspace-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400">
              <Code2 size={15} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">
                {currentRepo?.github_full_name || 'Repository Workspace'}
              </span>
              {currentRepo?.default_branch && (
                <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                  <GitBranch size={10} /> {currentRepo.default_branch}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            to={`/repo/${repoId}/graph`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/5 transition-colors"
          >
            <Network size={13} className="text-indigo-400" />
            <span>Dependency Graph</span>
          </Link>

          <div className="h-4 w-px bg-white/10" />

          {/* Indexing Status Chip */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AST Ready</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* User Profile */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.github_login}
                className="w-6 h-6 rounded-full ring-1 ring-white/20"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                {user?.github_login?.[0] || 'U'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Left Panel: FileTree */}
      <FileTree onSelectFile={(path) => selectFile(path)} />

      {/* Center Panel: CodeViewer (Monaco Editor) */}
      <main className="h-full w-full overflow-hidden" aria-label="Monaco Code Editor">
        <CodeViewer />
      </main>

      {/* Right Panel: ChatPanel (SSE Streaming + Citations) */}
      <ChatPanel repoId={repoId} />
    </div>
  );
};
