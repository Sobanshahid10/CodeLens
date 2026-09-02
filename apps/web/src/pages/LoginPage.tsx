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
  const [demoLoading, setDemoLoading] = useState(false);
  const [customRepoUrl, setCustomRepoUrl] = useState('');

  const handleGitHubLogin = () => {
    // Use a relative URL so it goes through the Vite proxy (/auth → :8000)
    // instead of hitting port 8000 directly (which isn't a registered GitHub OAuth App)
    window.location.href = '/auth/github';
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await loginWithDemo();
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login failed:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleCustomRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoUrl.trim()) return;
    setDemoLoading(true);
    try {
      await loginWithDemo();
      // Store custom repo target in session storage to auto-open in dashboard
      sessionStorage.setItem('auto_connect_repo', customRepoUrl.trim());
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to initialize session:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Diffused Ambient Lights */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-center" />

      {/* Top Navbar */}
      <header className="w-full h-16 px-6 sm:px-12 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-xl bg-[#030712]/70 sticky top-0 z-50">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={handleDemoLogin}
          title="Open CodeLens Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 transition-all duration-200 group-hover:scale-105">
            <Code2 size={18} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
              CodeLens
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              Universal AI
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
          <a
            href="#features"
            className="hover:text-white hover:underline underline-offset-4 transition-all cursor-pointer"
          >
            Features
          </a>
          <a
            href="#architecture"
            className="hover:text-white hover:underline underline-offset-4 transition-all cursor-pointer"
          >
            Architecture
          </a>
          <button
            onClick={handleDemoLogin}
            className="hover:text-white hover:underline underline-offset-4 transition-all cursor-pointer text-xs"
          >
            Connect Any Repo
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer hover:border-indigo-500/40 hover:scale-105 active:scale-95"
          >
            {demoLoading ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <Sparkles size={13} className="text-indigo-400" />}
            <span>Explore Demo</span>
          </button>

          <button
            onClick={handleGitHubLogin}
            title="Requires GITHUB_CLIENT_ID in .env — see README"
            className="btn-secondary px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all opacity-60 hover:opacity-90"
          >
            <GithubIcon size={14} />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-14 pb-20 text-center max-w-6xl mx-auto w-full relative z-10">
        {/* Universal Capability Badge */}
        <div
          onClick={handleDemoLogin}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-medium mb-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-white/[0.06] shadow-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="font-semibold text-indigo-300">Works with ANY GitHub repository</span>
          <span className="text-slate-500">•</span>
          <span>Python, TypeScript, Go, Rust, Java & more</span>
          <ArrowRight size={12} className="text-indigo-400" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] max-w-4xl leading-[1.05] mb-6 hero-headline" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
          AI Codebase Intelligence{' '}
          <br className="hidden sm:inline" />
          For Every Repository
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Paste any public or private GitHub repository URL to index AST chunks, query with Gemini 3.6 Flash, inspect interactive line citations, and view force-directed module graphs.
        </p>

        {/* Quick URL Input Bar: Index ANY Repo in the World */}
        <form
          onSubmit={handleCustomRepoSubmit}
          className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-2 bg-[#090d16] border border-white/[0.12] hover:border-indigo-500/50 p-1.5 rounded-2xl shadow-xl shadow-indigo-950/40 mb-8 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
        >
          <div className="flex items-center gap-2 pl-3 flex-1 w-full">
            <Globe size={16} className="text-indigo-400 shrink-0" />
            <input
              type="text"
              placeholder="Paste ANY GitHub URL (e.g. github.com/facebook/react)..."
              value={customRepoUrl}
              onChange={(e) => setCustomRepoUrl(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono py-2"
            />
          </div>
          <button
            type="submit"
            disabled={demoLoading}
            className="btn-primary w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer shrink-0 hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-600/30"
          >
            {demoLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Analyze Codebase</span>
            <ArrowRight size={13} />
          </button>
        </form>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="btn-primary px-6 py-3 rounded-xl text-xs font-semibold text-white flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-600/30"
          >
            {demoLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Explore Workspace with Sample Code</span>
            <ArrowRight size={14} />
          </button>

          {/* GitHub OAuth — requires GITHUB_CLIENT_ID in .env */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleGitHubLogin}
              title="Requires GITHUB_CLIENT_ID configured in .env"
              className="btn-secondary px-6 py-3 rounded-xl text-xs font-semibold text-slate-400 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all hover:border-white/30 opacity-60 hover:opacity-90"
            >
              <GithubIcon size={15} />
              <span>Sign in with GitHub</span>
            </button>
            <span className="text-[10px] text-slate-600">
              Needs <code className="text-slate-500 font-mono">GITHUB_CLIENT_ID</code> in .env
            </span>
          </div>
        </div>

        {/* Universal Application Mock Window */}
        <div
          onClick={handleDemoLogin}
          className="w-full max-w-5xl rounded-xl bg-[#090d16] border border-white/[0.08] hover:border-indigo-500/40 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.8)] overflow-hidden text-left mb-20 cursor-pointer transition-all duration-300 group"
          title="Click to launch interactive workspace"
        >
          {/* Window Header Bar */}
          <div className="h-10 px-4 bg-[#0b0f19] border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]/80 inline-block" />
              <span className="text-xs text-slate-300 font-mono ml-2">CodeLens Workspace — Any Connected Repository</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 group-hover:text-indigo-200 transition-colors">
                Click to Open Interactive IDE →
              </span>
            </div>
          </div>

          {/* 3-Column Workspace Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 h-80 sm:h-96 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] font-sans text-xs">
            {/* Column 1: Explorer */}
            <div className="hidden md:block col-span-3 bg-[#070a12] p-3 space-y-2 font-mono text-[11px] overflow-hidden">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Explorer</div>
              <div className="space-y-1">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">📁 src/services</div>
                <div className="text-indigo-300 bg-indigo-950/40 p-1 rounded border border-indigo-500/30 pl-4 flex items-center justify-between">
                  <span>📄 search.py</span>
                  <span className="text-[9px] text-indigo-400 font-sans">Active</span>
                </div>
                <div className="pl-4 text-slate-400">📄 auth.py</div>
                <div className="pl-4 text-slate-400">📄 indexer.py</div>
                <div className="text-slate-300 font-medium flex items-center gap-1.5 pt-1">📁 packages/ast_parser</div>
                <div className="pl-4 text-slate-400">📄 engine.py</div>
              </div>
            </div>

            {/* Column 2: Code Editor with Line Highlight */}
            <div className="col-span-12 md:col-span-5 bg-[#030712] p-4 font-mono text-[11px] space-y-1 overflow-hidden">
              <div className="text-slate-500 pb-2 mb-2 border-b border-white/[0.06] font-sans flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono">src/services/search.py</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  L12–28 Cited
                </span>
              </div>
              <div className="text-slate-600">09  class HybridSearchEngine:</div>
              <div className="text-slate-600">10      """Combines Qdrant dense vectors with AST sparse BM25."""</div>
              <div className="text-slate-600">11</div>
              <div className="bg-emerald-950/40 border-l-2 border-emerald-500 pl-2 text-emerald-300">
                12      async def search(self, query: str, repo_id: str) -&gt; list[SearchHit]:
              </div>
              <div className="bg-emerald-950/40 border-l-2 border-emerald-500 pl-2 text-emerald-300">
                13          dense_vec = await self.provider.embed([query])
              </div>
              <div className="bg-emerald-950/40 border-l-2 border-emerald-500 pl-2 text-emerald-300">
                14          return await self._reciprocal_rank_fusion(dense_vec)
              </div>
              <div className="text-slate-600">15</div>
              <div className="text-slate-500">16      def _reciprocal_rank_fusion(self, dense, sparse):</div>
            </div>

            {/* Column 3: AI Assistant Streaming Panel */}
            <div className="hidden md:block col-span-4 bg-[#090d16] p-3 space-y-3 font-sans overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Bot size={14} className="text-indigo-400" />
                <span>CodeLens AI</span>
                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/60 px-1 rounded">Gemini 3.6 Flash</span>
              </div>

              {/* Citation badge */}
              <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-indigo-300 flex items-center justify-between">
                  <span>Citation #1</span>
                  <span className="font-mono text-slate-400">search.py:12-28</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  The <code className="text-indigo-300 bg-black/40 px-1 rounded">search()</code> method executes hybrid retrieval across any indexed repository.
                </p>
              </div>

              <div className="text-slate-400 text-[11px] leading-relaxed">
                Click to explore full streaming chat with clickable line citations and Monaco editor jumping.
              </div>
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
