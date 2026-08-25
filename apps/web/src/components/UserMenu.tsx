import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  Database,
  ExternalLink,
  GitBranch,
  Key,
  Layers,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');

  const menuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.github_login === 'demo-developer' ? 'Muhammad Soban' : (user?.github_login || 'Muhammad Soban');
  const displayEmail = user?.email || 'sobanshahid25@gmail.com';

  return (
    <div className="flex items-center gap-2.5 relative">
      {/* 1. AI Engine Health Pill */}
      <div
        onClick={() => setShowSettingsModal(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-[11px] text-indigo-300 font-medium cursor-pointer transition-all duration-200 hover:scale-105"
        title="Click to view AI Gateway status"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
        <span className="font-semibold text-white">Gemini 3.6 Flash</span>
        <span className="text-indigo-400 font-mono text-[10px]">Active</span>
      </div>

      {/* 2. Notification Bell with Activity Feed */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          title="Recent System Activity"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#030712]" />
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 rounded-2xl glass-panel p-4 border border-white/10 shadow-2xl z-50 animate-fade-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-400" /> System Activity
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Live Feed</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#070a12] border border-emerald-500/20 text-slate-300 flex items-start gap-2.5">
                <div className="p-1 rounded bg-emerald-950/80 text-emerald-400 shrink-0 mt-0.5">
                  <Check size={12} />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-white text-[11px]">157 Code Chunks Indexed</div>
                  <div className="text-[10px] text-slate-400">Tree-Sitter parsed and embedded into Qdrant</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070a12] border border-indigo-500/20 text-slate-300 flex items-start gap-2.5">
                <div className="p-1 rounded bg-indigo-950/80 text-indigo-400 shrink-0 mt-0.5">
                  <Bot size={12} />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-white text-[11px]">Gemini 3.6 Flash Online</div>
                  <div className="text-[10px] text-slate-400">Low-latency SSE stream router active</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070a12] border border-white/[0.06] text-slate-300 flex items-start gap-2.5">
                <div className="p-1 rounded bg-purple-950/80 text-purple-400 shrink-0 mt-0.5">
                  <Database size={12} />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-white text-[11px]">Hybrid RRF Search Engine</div>
                  <div className="text-[10px] text-slate-400">Dense vectors + lexical token matching</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* 3. Interactive User Profile Widget & Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className="w-7 h-7 rounded-lg ring-1 ring-white/20 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 border border-white/20 flex items-center justify-center font-bold text-white text-xs shadow-inner">
              {displayName[0].toUpperCase()}
            </div>
          )}

          <div className="hidden sm:flex flex-col text-left">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                {displayName}
              </span>
              <ShieldCheck size={12} className="text-indigo-400" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Pro Developer</span>
          </div>

          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-72 rounded-2xl glass-panel p-2 border border-white/10 shadow-2xl z-50 animate-fade-in divide-y divide-white/[0.06] text-xs">
            {/* User Header */}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{displayName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold font-mono">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">{displayEmail}</div>
            </div>

            {/* Quick Engine Status */}
            <div className="p-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">
                Connected Infrastructure
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-400" /> LLM Model
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Gemini 3.6 Flash</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Database size={13} className="text-purple-400" /> Vector Database
                </span>
                <span className="text-[10px] font-mono text-slate-300">Qdrant v1.13</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-400" /> AST Parser
                </span>
                <span className="text-[10px] font-mono text-slate-300">Tree-Sitter</span>
              </div>
            </div>

            {/* Actions & Settings */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSettingsModal(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
              >
                <Settings size={14} className="text-slate-400" />
                <span>AI & Workspace Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/dashboard');
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
              >
                <GitBranch size={14} className="text-slate-400" />
                <span>All Repositories</span>
              </button>

              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-2">
                  <Key size={14} className="text-slate-400" />
                  <span>Gemini API Console</span>
                </span>
                <ExternalLink size={12} className="text-slate-500" />
              </a>
            </div>

            {/* Logout */}
            <div className="p-2">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors cursor-pointer text-left font-medium"
              >
                <LogOut size={14} className="text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-white/10 space-y-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI Gateway Settings</h3>
                  <p className="text-xs text-slate-400">Configure LLM routing and retrieval parameters</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-200">Active LLM Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gemini', label: 'Gemini 3.6', active: true },
                    { id: 'openai', label: 'OpenAI GPT-4', active: false },
                    { id: 'anthropic', label: 'Claude 3.5', active: false },
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() => setSelectedProvider(prov.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                        selectedProvider === prov.id
                          ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {prov.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-200">Vector Retrieval Top-K</label>
                <div className="p-3 rounded-xl bg-[#070a12] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">AST Slices per Query</span>
                  <span className="font-mono font-bold text-indigo-300">5 Chunks (RRF Re-ranked)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-200">Embedding Engine</label>
                <div className="p-3 rounded-xl bg-[#070a12] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">Embedding Dimensions</span>
                  <span className="font-mono text-emerald-400">3072 dims (Cosine Distance)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="btn-primary px-5 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer hover:scale-105 active:scale-95"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
