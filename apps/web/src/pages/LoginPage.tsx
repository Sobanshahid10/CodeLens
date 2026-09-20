import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Code2,
  Cpu,
  Database,
  Globe,
  Layers,
  Loader2,
  MessageSquare,
  Network,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useRepoStore } from '../stores/repoStore';
import { useToast } from '../hooks/useToast';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const loginWithDemo = useAuthStore((state) => state.loginWithDemo);
  const createRepo = useRepoStore((state) => state.createRepo);
  const toast = useToast();

  const [demoLoading, setDemoLoading] = useState(false);
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'graph' | 'chat'>('chat');
  const [activeCitation, setActiveCitation] = useState<number>(1);

  const handleGitHubLogin = () => {
    window.location.href = '/auth/github';
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await loginWithDemo();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Demo login failed:', err);
      toast.error('Login failed', err.message || 'Could not initialize demo session');
    } finally {
      setDemoLoading(false);
    }
  };

  const normalizeGithubUrl = (input: string): string => {
    let clean = input.trim();
    if (!clean) return clean;
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.startsWith('github.com/')) {
        clean = `https://${clean}`;
      } else if (clean.includes('/')) {
        clean = `https://github.com/${clean}`;
      } else {
        clean = `https://github.com/${clean}`;
      }
    }
    return clean;
  };

  const handleCustomRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoUrl.trim()) return;
    setDemoLoading(true);
    try {
      await loginWithDemo();
      const targetUrl = normalizeGithubUrl(customRepoUrl);
      toast.info('Indexing codebase...', targetUrl.replace('https://github.com/', ''));
      const created = await createRepo(targetUrl, 'main');
      toast.success('Repository connected!', created.github_full_name);
      navigate(`/repo/${created.id}`);
    } catch (err: any) {
      console.error('Failed to analyze codebase:', err);
      toast.error('Failed to analyze repository', err.message || 'Check repository URL');
    } finally {
      setDemoLoading(false);
    }
  };

  const quickRepos = [
    { label: 'fastapi/fastapi', url: 'https://github.com/tiangolo/fastapi', lang: 'Python' },
    { label: 'shadcn/ui', url: 'https://github.com/shadcn-ui/ui', lang: 'TypeScript' },
    { label: 'golang/go', url: 'https://github.com/golang/go', lang: 'Go' },
    { label: 'rust-lang/rust', url: 'https://github.com/rust-lang/rust', lang: 'Rust' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#02050e] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Animated Grids & Ambient Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="ambient-glow-top" />
      <div className="ambient-glow-center" />

      {/* Top Navbar */}
      <header className="w-full h-16 px-6 sm:px-12 flex items-center justify-between border-b border-white/[0.08] backdrop-blur-2xl bg-[#02050e]/80 sticky top-0 z-50">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={handleDemoLogin}
          title="Open CodeLens Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 group-hover:from-cyan-400 group-hover:to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Code2 size={18} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-white tracking-tight group-hover:text-cyan-300 transition-colors font-mono">
              CodeLens<span className="text-cyan-400">.ai</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-sm shadow-cyan-500/10">
              AST Engine
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
          <a
            href="#features"
            className="hover:text-cyan-300 transition-colors cursor-pointer"
          >
            Capabilities
          </a>
          <a
            href="#architecture"
            className="hover:text-cyan-300 transition-colors cursor-pointer"
          >
            System Graph
          </a>
          <button
            onClick={handleDemoLogin}
            className="hover:text-cyan-300 transition-colors cursor-pointer text-xs"
          >
            Live Demo
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="relative group px-4 py-1.5 rounded-lg text-xs font-semibold text-white overflow-hidden bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 transition-all duration-300 shadow-md shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5"
          >
            {demoLoading ? <Loader2 size={13} className="animate-spin text-white" /> : <Sparkles size={13} className="text-cyan-200" />}
            <span>Launch Workspace</span>
          </button>

          <button
            onClick={handleGitHubLogin}
            title="Requires GITHUB_CLIENT_ID in .env — see README"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-white/10 hover:border-white/25 bg-white/[0.03] hover:text-white flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <GithubIcon size={14} />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 pb-20 text-center max-w-6xl mx-auto w-full relative z-10">
        {/* Interactive Capability Pill */}
        <div
          onClick={handleDemoLogin}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-200 text-xs font-medium mb-8 cursor-pointer transition-all duration-300 hover:scale-105 shadow-[0_0_20px_-3px_rgba(6,182,212,0.35)]"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="font-bold text-white tracking-wide">AST SEMANTIC INTELLIGENCE</span>
          <span className="text-cyan-500/60">•</span>
          <span className="text-cyan-300/90">Line-Level Citation RAG</span>
          <ArrowRight size={13} className="text-cyan-400" />
        </div>

        {/* Dynamic & Balanced Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.12] mb-5">
          <span className="text-white">Turn Any Repository </span>
          <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            Into an Interactive Map.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-8 leading-relaxed font-normal">
          Engineered for high-complexity repos. AST chunking, hybrid dense/sparse vector retrieval, and instant line-level citations in an interactive 3-panel workspace.
        </p>

        {/* Live Interactive GitHub URL Input */}
        <div className="w-full max-w-2xl mb-4">
          <form
            onSubmit={handleCustomRepoSubmit}
            className="flex flex-col sm:flex-row items-center gap-2 bg-[#090e1a]/90 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400/70 p-2 rounded-2xl shadow-[0_0_35px_-5px_rgba(6,182,212,0.25)] transition-all focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20"
          >
            <div className="flex items-center gap-3 pl-3.5 flex-1 w-full">
              <Globe size={18} className="text-cyan-400 shrink-0 animate-pulse" />
              <input
                type="text"
                placeholder="Paste ANY GitHub URL (e.g. github.com/tiangolo/fastapi)..."
                value={customRepoUrl}
                onChange={(e) => setCustomRepoUrl(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none font-mono py-2"
              />
            </div>
            <button
              type="submit"
              disabled={demoLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-all active:scale-95 shadow-md shadow-cyan-500/30"
            >
              {demoLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <Zap size={14} className="text-cyan-200 fill-cyan-200" />}
              <span>Analyze Now</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick-Click Sample Repos */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
            <span className="text-slate-500 font-mono">Try instantly:</span>
            {quickRepos.map((repo) => (
              <button
                key={repo.label}
                type="button"
                onClick={() => setCustomRepoUrl(repo.url)}
                className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.08] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 font-mono transition-all cursor-pointer"
              >
                {repo.label} <span className="text-slate-500 text-[9px]">{repo.lang}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 mb-16">
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:shadow-[0_0_35px_rgba(255,255,255,0.35)]"
          >
            {demoLoading ? <Loader2 size={15} className="animate-spin text-slate-950" /> : <Sparkles size={15} className="text-slate-950 fill-slate-950" />}
            <span>Explore Interactive Demo Workspace</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Live Interactive Mock Window (Clickable Tabs & Real Preview) */}
        <div
          className="w-full max-w-5xl rounded-2xl bg-[#070b16] border border-cyan-500/30 shadow-[0_20px_80px_-15px_rgba(6,182,212,0.2)] overflow-hidden text-left mb-20 transition-all duration-300"
        >
          {/* Window Header Bar with Interactive View Tabs */}
          <div className="h-12 px-4 bg-[#0a0f1e] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]/80 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]/80 inline-block shadow-sm" />
              <span className="text-xs text-slate-300 font-mono ml-2 font-semibold">CodeLens Live Demo Session</span>
            </div>

            {/* Interactive View Toggles */}
            <div className="flex items-center gap-1 bg-[#040711] p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'chat' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Bot size={12} />
                <span>AI RAG Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'graph' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Network size={12} />
                <span>D3.js Graph</span>
              </button>
            </div>
          </div>

          {/* 3-Column Interactive Workspace Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 h-80 sm:h-96 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] font-sans text-xs">
            {/* Column 1: Explorer */}
            <div className="hidden md:block col-span-3 bg-[#050813] p-3 space-y-2 font-mono text-[11px] overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-cyan-400/80 tracking-wider">AST Symbol Tree</div>
              <div className="space-y-1">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">📁 src/services</div>
                <div className="text-cyan-300 bg-cyan-950/50 p-1.5 rounded-lg border border-cyan-500/40 pl-3 flex items-center justify-between shadow-sm">
                  <span>📄 search.py</span>
                  <span className="text-[9px] font-bold text-cyan-400 font-sans px-1 rounded bg-cyan-500/20">AST</span>
                </div>
                <div className="pl-3 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors py-0.5">📄 auth.py</div>
                <div className="pl-3 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors py-0.5">📄 indexer.py</div>
                <div className="text-slate-300 font-medium flex items-center gap-1.5 pt-1.5">📁 packages/ast_parser</div>
                <div className="pl-3 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors py-0.5">📄 tree_sitter.py</div>
              </div>
            </div>

            {/* Column 2: Code Editor with Line Highlight */}
            <div className="col-span-12 md:col-span-5 bg-[#02050e] p-4 font-mono text-[11px] space-y-1 overflow-hidden">
              <div className="text-slate-500 pb-2 mb-2 border-b border-white/[0.08] font-sans flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-mono font-medium">src/services/search.py</span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  L12–28 Highlighted
                </span>
              </div>
              <div className="text-slate-600">09  class HybridSearchEngine:</div>
              <div className="text-slate-600">10      """Combines Qdrant dense vectors with AST sparse BM25."""</div>
              <div className="text-slate-600">11</div>
              <div className="bg-emerald-950/50 border-l-2 border-emerald-400 pl-2 text-emerald-200 transition-colors">
                12      async def search(self, query: str, repo_id: str) -&gt; list[SearchHit]:
              </div>
              <div className="bg-emerald-950/50 border-l-2 border-emerald-400 pl-2 text-emerald-200 transition-colors">
                13          dense_vec = await self.provider.embed([query])
              </div>
              <div className="bg-emerald-950/50 border-l-2 border-emerald-400 pl-2 text-emerald-200 transition-colors">
                14          return await self._reciprocal_rank_fusion(dense_vec)
              </div>
              <div className="text-slate-600">15</div>
              <div className="text-slate-500">16      def _reciprocal_rank_fusion(self, dense, sparse):</div>
            </div>

            {/* Column 3: AI Assistant Streaming Panel */}
            <div className="hidden md:block col-span-4 bg-[#050813] p-4 space-y-3 font-sans overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Bot size={15} className="text-cyan-400" />
                  <span>CodeLens AI Stream</span>
                </div>
                <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                  Gemini 3.8 Flash
                </span>
              </div>

              {/* Interactive Clickable Citation Cards */}
              <div
                onClick={() => setActiveCitation(1)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${activeCitation === 1 ? 'bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-500/20' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}
              >
                <div className="text-[10px] font-bold text-cyan-300 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} /> Citation #1
                  </span>
                  <span className="font-mono text-slate-400">search.py:12-28</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-[11px]">
                  Hybrid retrieval uses <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded">RRF (k=60)</code> fusing Qdrant HNSW and BM25 keywords.
                </p>
              </div>

              <button
                onClick={handleDemoLogin}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer mt-3"
              >
                <span>Try Live Interactive Chat</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 3 Interactive Feature Bento Cards */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full text-left mb-20">
          <div
            onClick={handleDemoLogin}
            className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-6 cursor-pointer group hover:border-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-900/80 transition-all">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                SSE Streaming Chat
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Token-by-token streaming RAG powered by Google Gemini 3.6 Flash. Query any codebase in natural language.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1.5 transition-transform">
              <span>Open AI Workspace</span>
              <ArrowRight size={13} />
            </div>
          </div>

          <div
            onClick={handleDemoLogin}
            className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-6 cursor-pointer group hover:border-purple-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-900/80 transition-all">
                <Network size={20} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                D3.js Dependency Graph
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive force-directed graph rendering module import networks, circular dependencies, and file relationships.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:translate-x-1.5 transition-transform">
              <span>Explore Architecture</span>
              <ArrowRight size={13} />
            </div>
          </div>

          <div
            onClick={handleDemoLogin}
            className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-6 cursor-pointer group hover:border-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-900/80 transition-all">
                <Cpu size={20} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Monaco Line Highlighting
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1-click citation navigation that jumps directly to the cited code snippet in VS Code Monaco editor with green highlights.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-1.5 transition-transform">
              <span>Inspect Code Slices</span>
              <ArrowRight size={13} />
            </div>
          </div>
        </div>

        {/* Architecture & Tech Strip */}
        <div id="architecture" className="max-w-5xl w-full border-t border-white/[0.06] pt-10 pb-4 text-left">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-6">
            Production System Architecture
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all flex items-start gap-3">
              <Database size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Qdrant Vector DB</div>
                <div className="text-[10px] text-slate-400">Cosine & sparse BM25</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all flex items-start gap-3">
              <Layers size={16} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Tree-Sitter AST</div>
                <div className="text-[10px] text-slate-400">Multi-language parsers</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all flex items-start gap-3">
              <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Celery Workers</div>
                <div className="text-[10px] text-slate-400">Parallel indexing pipelines</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all flex items-start gap-3">
              <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Gemini 3.6 Flash</div>
                <div className="text-[10px] text-slate-400">Low-latency SSE RAG</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 sm:px-12 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 relative z-10">
        <div>© 2026 CodeLens AI. Universal Codebase Intelligence.</div>
        <div className="flex items-center gap-6 text-slate-400">
          <button onClick={handleDemoLogin} className="hover:text-white transition-colors cursor-pointer">
            Explore Workspace
          </button>
          <button onClick={handleGitHubLogin} className="hover:text-white transition-colors cursor-pointer">
            GitHub Sign In
          </button>
          <span>FastAPI • Qdrant • React • Vite • Tailwind</span>
        </div>
      </footer>
    </div>
  );
};
