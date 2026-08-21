import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Code2,
  Cpu,
  ExternalLink,
  GitBranch,
  LogOut,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
import { IndexingProgress } from '../components/IndexingProgress';
import { useAuthStore } from '../stores/authStore';
import { Repository, useRepoStore } from '../stores/repoStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const repos = useRepoStore((state) => state.repos);
  const loading = useRepoStore((state) => state.loading);
  const error = useRepoStore((state) => state.error);
  const fetchRepos = useRepoStore((state) => state.fetchRepos);
  const createRepo = useRepoStore((state) => state.createRepo);
  const deleteRepo = useRepoStore((state) => state.deleteRepo);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRepoUrl, setNewRepoUrl] = useState<string>('');
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const created = await createRepo(newRepoUrl.trim(), defaultBranch.trim() || 'main');
      setShowAddModal(false);
      setNewRepoUrl('');
      // Navigate to workspace for immediate view
      navigate(`/repo/${created.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect repository');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRepo = async (repoId: string, repoName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${repoName}? All vector chunks will be removed.`)) {
      try {
        await deleteRepo(repoId);
      } catch (err: any) {
        alert(err.message || 'Failed to delete repository');
      }
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.github_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.github_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 px-6 bg-[#0f1422] border-b border-white/5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Code2 size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">CodeLens</h1>
            <p className="text-[11px] text-slate-400">Repositories & Codebases</p>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all duration-150"
          >
            <Plus size={14} />
            <span>Connect Repository</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2 text-xs text-slate-300">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.github_login}
                className="w-7 h-7 rounded-full ring-1 ring-white/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs">
                {user?.github_login?.[0] || 'U'}
              </div>
            )}
            <span className="hidden sm:inline font-medium">{user?.github_login || 'Developer'}</span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search your repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161d2f] text-xs text-slate-200 pl-9 pr-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Showing <strong className="text-slate-200">{filteredRepos.length}</strong> repositories</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Repositories Grid */}
        {loading && repos.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#0f1422]/50">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 mb-3">
              <GithubIcon size={28} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No repositories found</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5">
              Connect a GitHub repository to begin AST chunking, semantic vectorization, and interactive exploration.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus size={14} />
              <span>Connect Repository</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRepos.map((repo: Repository) => {
              const isIndexing =
                repo.indexing_status !== 'complete' &&
                repo.indexing_status !== 'failed';

              return (
                <div
                  key={repo.id}
                  onClick={() => navigate(`/repo/${repo.id}`)}
                  className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/20">
                          <GithubIcon size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors truncate max-w-[180px]">
                            {repo.github_full_name}
                          </h3>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <GitBranch size={10} /> {repo.default_branch}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteRepo(repo.id, repo.github_full_name, e)}
                        title="Delete repository"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Live Progress or Chunks Stats */}
                    {isIndexing ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <IndexingProgress
                          repoId={repo.id}
                          initialProgress={repo.indexing_progress}
                          initialStatus={repo.indexing_status}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 py-2 border-y border-white/5 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Cpu size={13} className="text-indigo-400" />
                          <span><strong className="text-slate-200">{repo.total_chunks}</strong> Chunks</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                          <span>Indexed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/repo/${repo.id}/graph`);
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      <Network size={13} />
                      <span>View Graph</span>
                    </button>

                    <span className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium">
                      <span>Open Workspace</span>
                      <ExternalLink size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Connect Repository Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-[#0f1422] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400">
                  <Plus size={16} />
                </div>
                <h3 className="text-sm font-semibold text-white">Connect GitHub Repository</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide a public or authorized GitHub repository URL to initiate cloning, AST parsing, and vector indexing.
            </p>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleConnectRepo} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/fastapi/fastapi"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="w-full bg-[#161d2f] text-xs text-slate-200 px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Default Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  className="w-full bg-[#161d2f] text-xs text-slate-200 px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newRepoUrl.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
                >
                  <Sparkles size={13} />
                  <span>{isSubmitting ? 'Connecting...' : 'Start Indexing'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
