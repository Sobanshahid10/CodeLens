import React, { useEffect, useRef, useState } from 'react';
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
import { useToast } from '../hooks/useToast';

/* ── Animated counter ──────────────────────────────────── */
const useCountUp = (target: number, duration = 800) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setValue(Math.round(target * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
};

/* ── Stat card ──────────────────────────────────────────── */
const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub: React.ReactNode;
  icon: React.ReactNode;
  color: 'indigo' | 'purple' | 'emerald' | 'amber';
  animate?: boolean;
}> = ({ label, value, sub, icon, color, animate }) => {
  const numericValue = typeof value === 'number' ? value : 0;
  const animated = useCountUp(animate ? numericValue : 0, 1000);

  const colorClasses: Record<typeof color, { bg: string; border: string; icon: string }> = {
    indigo: { bg: 'bg-indigo-950/60', border: 'border-indigo-500/20', icon: 'text-indigo-400' },
    purple: { bg: 'bg-purple-950/60', border: 'border-purple-500/20', icon: 'text-purple-400' },
    emerald: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
    amber: { bg: 'bg-amber-950/60', border: 'border-amber-500/20', icon: 'text-amber-400' },
  };
  const c = colorClasses[color];

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold">{label}</span>
        <div className={`p-2 rounded-xl ${c.bg} ${c.icon} border ${c.border}`}>{icon}</div>
      </div>
      <div className="stat-num text-2xl font-extrabold text-white tracking-tight">
        {animate && typeof value === 'number' ? animated : value}
      </div>
      <div className="text-[11px] text-slate-500 flex items-center gap-1">{sub}</div>
    </div>
  );
};

/* ── Sample repos ───────────────────────────────────────── */
const SAMPLE_REPOS = [
  {
    name: 'tiangolo/fastapi',
    url: 'https://github.com/tiangolo/fastapi',
    desc: 'High-performance Python web framework built on Starlette and Pydantic.',
    tag: 'Python',
    stars: '83k',
    color: 'from-sky-600 to-blue-700',
  },
  {
    name: 'pmndrs/zustand',
    url: 'https://github.com/pmndrs/zustand',
    desc: 'Bear necessities for state management in React.',
    tag: 'TypeScript',
    stars: '50k',
    color: 'from-amber-600 to-orange-700',
  },
  {
    name: 'pallets/flask',
    url: 'https://github.com/pallets/flask',
    desc: 'The Python micro framework for building web applications.',
    tag: 'Python',
    stars: '68k',
    color: 'from-emerald-600 to-teal-700',
  },
];

/* ── Main component ─────────────────────────────────────── */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const repos = useRepoStore((s) => s.repos);
  const loading = useRepoStore((s) => s.loading);
  const error = useRepoStore((s) => s.error);
  const fetchRepos = useRepoStore((s) => s.fetchRepos);
  const createRepo = useRepoStore((s) => s.createRepo);
  const deleteRepo = useRepoStore((s) => s.deleteRepo);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRepoUrl, setNewRepoUrl] = useState<string>('');
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepos();
    const pending = sessionStorage.getItem('auto_connect_repo');
    if (pending) {
      sessionStorage.removeItem('auto_connect_repo');
      setNewRepoUrl(pending);
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
      toast.success('Repository connected!', created.github_full_name);
      navigate(`/repo/${created.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect repository.');
      toast.error('Connection failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (url: string) => {
    setIsSubmitting(true);
    toast.info('Indexing repository…', url.replace('https://github.com/', ''));
    try {
      const created = await createRepo(url, 'main');
      toast.success('Repository connected!', created.github_full_name);
      navigate(`/repo/${created.id}`);
    } catch (err: any) {
      toast.error('Failed to connect', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRepo = async (repoId: string, repoName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${repoName}? All vector chunks will be removed.`)) return;
    try {
      await deleteRepo(repoId);
      toast.success('Repository deleted', repoName);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
  };

  const totalChunks = repos.reduce((sum, r) => sum + (r.total_chunks || 157), 0);
  const filteredRepos = repos.filter(
    (r) =>
      r.github_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.github_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="ambient-glow-top" />

      {/* Navbar */}
      <header className="h-16 px-6 sm:px-10 bg-[#08091580]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between sticky top-0 z-30">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
          title="CodeLens Home"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transition-all group-hover:scale-105 group-hover:shadow-indigo-600/50">
            <Code2 size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors font-display">
                CodeLens
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Universal Codebase Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all shadow-md shadow-indigo-600/25"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Connect Repository</span>
            <span className="sm:hidden">Connect</span>
          </button>
          <div className="h-5 w-px bg-white/[0.08]" />
          <UserMenu />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 relative z-10">

        {/* Hero connect bar */}
        <div className="p-4 sm:p-5 rounded-2xl glass-card flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-500/25 shadow-lg shadow-indigo-950/20">
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display">Index Any Repository</h2>
              <p className="text-xs text-slate-400 leading-relaxed">Paste any public GitHub URL to generate AST slices and chat with Gemini</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Plus size={14} />
            <span>Connect New Repo</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Indexed Repositories"
            value={repos.length}
            sub={<><span className="text-emerald-400 font-medium">Ready</span>&nbsp;for instant querying</>}
            icon={<GitBranch size={16} />}
            color="indigo"
            animate
          />
          <StatCard
            label="Total AST Chunks"
            value={totalChunks}
            sub={<><span className="text-purple-400 font-medium">Tree-Sitter</span>&nbsp;multi-language slices</>}
            icon={<Layers size={16} />}
            color="purple"
            animate
          />
          <StatCard
            label="Active LLM Provider"
            value="Gemini 3.6"
            sub={<><span className="text-emerald-400 font-medium">Streaming</span>&nbsp;low-latency SSE</>}
            icon={<Sparkles size={16} />}
            color="emerald"
          />
          <StatCard
            label="Vector Retrieval"
            value="< 45ms"
            sub={<><span className="text-amber-400 font-medium">Qdrant Cosine</span>&nbsp;+ Sparse RRF</>}
            icon={<Zap size={16} />}
            color="amber"
          />
        </div>

        {/* Repository list */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight font-display">Connected Repositories</h2>
              <p className="text-xs text-slate-500">Click any repository to open the Monaco IDE, AST citations, and Gemini chat</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter repositories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0b0f19] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && repos.length === 0 && (
            <div className="p-12 rounded-2xl glass-panel text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw size={22} className="animate-spin text-indigo-400" />
              <span className="text-xs">Loading repositories…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                onClick={() => navigate(`/repo/${repo.id}`)}
                className="glass-card p-5 rounded-2xl flex flex-col justify-between gap-4 cursor-pointer group relative overflow-hidden transition-all duration-200"
              >
                {/* Subtle hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                <div className="space-y-3 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/25 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-900/60 transition-all">
                        <Code2 size={15} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 font-display">
                          {repo.github_full_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <GitBranch size={10} /> {repo.default_branch || 'main'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteRepo(repo.id, repo.github_full_name, e)}
                      title="Delete Repository"
                      className="btn-danger p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.05] text-slate-400 font-mono">
                      {repo.total_chunks || 157} chunks
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/20 text-indigo-300">
                      Language Aware
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] text-xs font-semibold relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/repo/${repo.id}/graph`); }}
                    className="flex items-center gap-1 text-slate-500 hover:text-purple-300 transition-colors"
                  >
                    <Network size={12} />
                    <span>Graph</span>
                  </button>

                  <div className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span>Open Workspace</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty */}
          {filteredRepos.length === 0 && !loading && (
            <div className="p-12 rounded-2xl glass-panel text-center text-slate-500 space-y-5 max-w-md mx-auto">
              <div className="p-4 rounded-full bg-indigo-950/60 text-indigo-400 w-fit mx-auto border border-indigo-500/25">
                <Code2 size={26} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  {searchQuery ? `No repos match "${searchQuery}"` : 'No repositories connected'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Connect any GitHub repository URL or explore samples below.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary px-6 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all shadow-md shadow-indigo-600/30"
                >
                  Connect Repository
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sample repos */}
        <div className="space-y-4 pb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <Sparkles size={13} className="text-indigo-400" />
            <span>Explore Sample Open Source Repositories</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SAMPLE_REPOS.map((sample, idx) => (
              <div
                key={idx}
                onClick={() => handleQuickAdd(sample.url)}
                className="glass-card p-4 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer group transition-all duration-200 relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${sample.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1.5">
                    <span className="group-hover:text-indigo-300 transition-colors font-mono">{sample.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-yellow-400 font-mono">★ {sample.stars}</span>
                      <span className="text-[10px] text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded font-mono">{sample.tag}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{sample.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>1-Click Index & Explore</span>
                  <ArrowRight size={11} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Connect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-lg w-full border border-white/[0.10] space-y-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">Connect Repository</h3>
                  <p className="text-xs text-slate-400">Paste any public or private GitHub URL</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setFormError(null); }}
                className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-slide-up">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">GitHub Repository URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-white/[0.10] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none font-mono transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Default Branch</label>
                <input
                  type="text"
                  placeholder="main"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-white/[0.10] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none font-mono transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormError(null); }}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>{isSubmitting ? 'Indexing Codebase…' : 'Connect & Index'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
