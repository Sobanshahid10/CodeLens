import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowRight,
  Bot,
  FileCode,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { Citation, useSSEChat } from '../hooks/useSSEChat';
import { useRepoStore } from '../stores/repoStore';

export const ChatPanel: React.FC = () => {
  const currentRepo = useRepoStore((state) => state.currentRepo);
  const highlightCitation = useRepoStore((state) => state.highlightCitation);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    isStreaming,
    currentResponse,
    citations,
    status,
    error,
    sendMessage,
    setMessages,
  } = useSSEChat(currentRepo?.id || '');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;
    const query = inputPrompt.trim();
    setInputPrompt('');
    sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    highlightCitation(
      citation.file_path,
      citation.start_line,
      citation.end_line,
      citation.snippet
    );
  };

  const clearChat = () => {
    setMessages([]);
  };

  const renderCitationCard = (cit: Citation, index: number) => {
    const fileName = cit.file_path.split('/').pop() || cit.file_path;
    return (
      <button
        key={index}
        onClick={() => handleCitationClick(cit)}
        className="w-full text-left p-2 rounded-xl bg-[#131927]/90 hover:bg-[#1a233a] border border-indigo-500/20 hover:border-indigo-500/50 transition-all flex flex-col gap-1 group shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 font-mono">
            <FileCode size={13} className="text-indigo-400 shrink-0" />
            <span className="truncate">{fileName}</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 group-hover:text-indigo-200">
            L{cit.start_line}–{cit.end_line}
          </span>
        </div>

        {cit.function_name && (
          <div className="text-[10px] text-slate-400 font-mono">
            fn: <span className="text-amber-300">{cit.function_name}()</span>
          </div>
        )}

        <div className="text-[10px] text-slate-500 font-mono truncate">{cit.file_path}</div>
      </button>
    );
  };

  return (
    <aside
      className="h-full flex flex-col bg-[#0c101a] border-l border-white/5 overflow-hidden"
      aria-label="AI Codebase Assistant Chat"
    >
      {/* Chat Header */}
      <div className="h-10 px-3 bg-[#0c101a] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <div className="p-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Bot size={14} />
          </div>
          <span>AI Assistant</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-500/20">
            Gemini 3.6 Flash
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <div className="flex items-center gap-1 text-[11px] text-indigo-400 animate-pulse font-mono">
              <Loader2 size={11} className="animate-spin" />
              <span>Streaming...</span>
            </div>
          )}
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={clearChat}
              title="Clear Chat History"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Message History Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-950/50">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">
                Ask anything about this repository
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                CodeLens retrieves Tree-Sitter AST chunks and streams answers with interactive line citations.
              </p>
            </div>

            <div className="w-full space-y-1.5 text-left pt-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1">
                Suggested Prompts
              </div>
              {[
                'Explain search.py and how hybrid code search works',
                'What settings are managed in config.py?',
                'Where is user authentication handled?',
                'Explain the AST chunking pipeline',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  className="w-full text-xs text-slate-300 p-2.5 rounded-xl bg-[#131927]/80 hover:bg-[#1a233a] border border-white/5 hover:border-indigo-500/40 text-left transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">"{suggestion}"</span>
                  <ArrowRight size={12} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/30 text-indigo-300'
                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {msg.role === 'user' ? 'You' : 'CodeLens AI'}
              </span>
            </div>

            {/* Citations List for Assistant Message */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="space-y-1.5 my-1 pl-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap size={11} className="text-amber-400" />
                  <span>Citations ({msg.citations.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {msg.citations.map((cit, cIdx) => renderCitationCard(cit, cIdx))}
                </div>
              </div>
            )}

            <div
              className={`text-xs rounded-xl p-3.5 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/20 text-slate-100 border border-indigo-500/30 ml-4 shadow-sm'
                  : 'bg-[#131927]/90 text-slate-200 border border-white/5 shadow-md'
              }`}
            >
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Live Streaming Response */}
        {isStreaming && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <Bot size={13} />
              </div>
              <span className="text-xs font-semibold text-slate-300">CodeLens AI</span>
            </div>

            {citations.length > 0 && (
              <div className="space-y-1.5 my-1 pl-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap size={11} className="text-amber-400" />
                  <span>Retrieved Citations ({citations.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {citations.map((cit, cIdx) => renderCitationCard(cit, cIdx))}
                </div>
              </div>
            )}

            <div className="text-xs rounded-xl p-3.5 leading-relaxed bg-[#131927]/90 text-slate-200 border border-indigo-500/30 shadow-lg shadow-indigo-950/40">
              {currentResponse ? (
                <div className="markdown-body">
                  <ReactMarkdown>{currentResponse}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-indigo-400 text-xs py-1">
                  <Loader2 size={13} className="animate-spin" />
                  <span>{status || 'Retrieving AST vector slices...'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Box */}
      <div className="p-3 bg-[#0c101a] border-t border-white/5 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this codebase... (Enter to send)"
            disabled={isStreaming}
            className="w-full resize-none rounded-xl bg-[#07090e] border border-white/10 p-3 pr-10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isStreaming}
            className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 transition-all duration-150 shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95 disabled:hover:scale-100"
          >
            {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
        <div className="text-[10px] text-slate-500 text-right mt-1.5 font-mono">
          Shift + Enter for new line
        </div>
      </div>
    </aside>
  );
};
