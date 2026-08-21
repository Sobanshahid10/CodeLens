import React from 'react';
import { redirectToGitHubOAuth } from '../lib/auth';
import {
  Code2,
  Cpu,
  GitBranch,
  MessageSquare,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
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

export const LoginPage: React.FC = () => {
  const handleGitHubLogin = () => {
    redirectToGitHubOAuth();
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/20 text-white">
            <Code2 size={22} />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            CodeLens
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <GithubIcon size={14} /> GitHub
          </a>
        </div>
      </header>

      {/* Main Hero & Auth CTA */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6 animate-pulse-subtle">
          <Sparkles size={13} className="text-indigo-400" />
          <span>Production AI-Powered Codebase Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight mb-6">
          Understand Any Codebase in{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Seconds
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Deep AST code chunking, hybrid vector retrieval, real-time SSE streaming chat,
          interactive Monaco line highlighting, and D3.js dependency graphs.
        </p>

        {/* GitHub Login CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button
            onClick={handleGitHubLogin}
            className="flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <GithubIcon size={18} />
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left">
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 w-fit">
              <MessageSquare size={20} />
            </div>
            <h3 className="text-base font-semibold text-white">SSE Streaming Chat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Token-by-token streaming RAG with exact function citations and line references.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400 w-fit">
              <Network size={20} />
            </div>
            <h3 className="text-base font-semibold text-white">D3.js Dependency Graph</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Force-directed visualization of module imports, chunk distributions, and language topology.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 w-fit">
              <Cpu size={20} />
            </div>
            <h3 className="text-base font-semibold text-white">Monaco Line Highlighting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              One-click citation navigation that jumps directly to the cited code snippet with green background highlights.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 relative z-10 gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>In-memory JWT token authentication. Row-level security strictly enforced.</span>
        </div>
        <div className="flex items-center gap-4">
          <span>CodeLens v1.0.0</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <GitBranch size={12} />
            <span>Day 4 Frontend Workspace</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
