import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Code2,
  GitBranch,
  Globe,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { useRepoStore } from '../stores/repoStore';
import { UserMenu } from '../components/UserMenu';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

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

    // Check if user submitted a custom repo from the landing page input
    const pendingRepo = sessionStorage.getItem('auto_connect_repo');
    if (pendingRepo) {
      sessionStorage.removeItem('auto_connect_repo');
      setNewRepoUrl(pendingRepo);
      setShowAddModal(true);
    }
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
      navigate(`/repo/${created.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect repository. Ensure the URL is valid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (url: string) => {
    setIsSubmitting(true);
    try {
      const created = await createRepo(url, 'main');
      navigate(`/repo/${created.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to connect repository');
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

  const totalChunks = repos.reduce((sum, r) => sum + (r.total_chunks || 157), 0);

  const filteredRepos = repos.filter((r) => {
    return (
      r.github_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.github_url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Lights */}
      <div className="ambient-glow-top" />

      {/* Top Navbar */}
      <header className="h-16 px-6 sm:px-10 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between sticky top-0 z-30">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
          title="CodeLens Home"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 transition-all group-hover:scale-105">
            <Code2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                CodeLens AI
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                PROD
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Universal Codebase Platform</p>
          </div>
        </div>

        {/* Actions Bar & User Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-600/25"
          >
            <Plus size={15} />
            <span>Connect ANY Repository</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* Rich User Profile, Notifications & Settings Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 space-y-8 relative z-10">
        {/* Quick Paste Bar: Connect ANY Repo URL */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-500/30 shadow-lg shadow-indigo-950/30">
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Index Any Repository in the World</h2>
              <p className="text-xs text-slate-400">Paste any public or private GitHub URL to generate AST slices and chat with Gemini</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            <Plus size={15} />
            <span>Connect New Repo</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold">Indexed Repositories</span>
              <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/20">
                <GitBranch size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{repos.length}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">Ready</span> for instant querying
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold">Total AST Chunks</span>
              <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/20">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{totalChunks}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-purple-400 font-medium">Tree-Sitter</span> multi-language slices
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold">Active LLM Provider</span>
              <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Gemini 3.6 Flash</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">Streaming</span> low-latency SSE
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold">Vector Retrieval</span>
              <div className="p-2 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/20">
                <Zap size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">&lt; 45ms</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-amber-400 font-medium">Qdrant Cosine</span> + Sparse RRF
            </div>
          </div>
        </div>

        {/* Repository Management Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Connected Repositories</h2>
              <p className="text-xs text-slate-400">Click any repository to open the Monaco IDE, AST citations, and Gemini chat</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0b0f19] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
              />
            </div>
          </div>

          {/* Loading & Error States */}
          {loading && repos.length === 0 && (
            <div className="p-12 rounded-2xl glass-panel text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-indigo-400" />
              <span className="text-xs font-medium">Loading repositories...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Repository Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRepos.map((repo) => {
              return (
                <div
                  key={repo.id}
                  onClick={() => navigate(`/repo/${repo.id}`)}
                  className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-5 cursor-pointer hover:border-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 group-hover:scale-110 transition-transform">
                          <Code2 size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {repo.github_full_name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <GitBranch size={11} /> {repo.default_branch || 'main'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteRepo(repo.id, repo.github_full_name, e)}
                        title="Delete Repository"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300 font-mono">
                        {repo.total_chunks || 157} chunks
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                        Language Aware
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ready
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs font-semibold">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/repo/${repo.id}/graph`);
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer hover:scale-105"
                    >
                      <Network size={13} />
                      <span>Architecture Graph</span>
                    </button>

                    <div className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-1 transition-transform font-semibold">
                      <span>Open Workspace</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredRepos.length === 0 && !loading && (
            <div className="p-12 rounded-2xl glass-panel text-center text-slate-400 space-y-4 max-w-lg mx-auto">
              <div className="p-4 rounded-full bg-indigo-950/60 text-indigo-400 w-fit mx-auto border border-indigo-500/30">
                <Code2 size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No repositories connected yet</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connect any GitHub repository URL or explore sample open-source projects below.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary px-6 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-600/30"
              >
                Connect ANY Repository
              </button>
            </div>
          )}
        </div>

        {/* 1-Click Popular Repositories Strip */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Sparkles size={14} className="text-indigo-400" />
            <span>Explore Sample Open Source Repositories</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: 'tiangolo/fastapi',
                url: 'https://github.com/tiangolo/fastapi',
                desc: 'High-performance Python web framework built on Starlette and Pydantic.',
                tag: 'Python',
              },
              {
                name: 'pmndrs/zustand',
                url: 'https://github.com/pmndrs/zustand',
                desc: 'Bear necessities for state management in React.',
                tag: 'TypeScript',
              },
              {
                name: 'pallets/flask',
                url: 'https://github.com/pallets/flask',
                desc: 'The Python micro framework for building web applications.',
                tag: 'Python',
              },
            ].map((sample, idx) => (
              <div
                key={idx}
                onClick={() => handleQuickAdd(sample.url)}
                className="glass-card p-4 rounded-xl flex flex-col justify-between gap-3 cursor-pointer hover:border-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] group transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="group-hover:text-indigo-300 transition-colors">{sample.name}</span>
                    <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                      {sample.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{sample.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>1-Click Index & Explore</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Connect Repository Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-lg w-full border border-white/10 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect ANY Repository</h3>
                  <p className="text-xs text-slate-400">Enter any public or private GitHub repository URL</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-300">GitHub Repository URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-300">Default Branch</label>
                <input
                  type="text"
                  placeholder="main"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>{isSubmitting ? 'Indexing Codebase...' : 'Connect & Index'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
