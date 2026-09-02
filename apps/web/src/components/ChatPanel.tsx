import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowRight,
  Bot,
  FileCode,
  Keyboard,
  Loader2,
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { Citation, useSSEChat } from '../hooks/useSSEChat';
import { useRepoStore } from '../stores/repoStore';
import { useToast } from '../hooks/useToast';
import { useCommandPaletteStore } from '../stores/commandPaletteStore';

const SUGGESTIONS = [
  'Explain how hybrid code search works',
  'What settings are managed in config.py?',
  'Where is user authentication handled?',
  'Explain the AST chunking pipeline',
  'How does the Celery worker index repositories?',
];

const CitationCard: React.FC<{
  citation: Citation;
  onClick: (c: Citation) => void;
}> = ({ citation, onClick }) => {
  const fileName = citation.file_path.split('/').pop() || citation.file_path;
  return (
    <button
      onClick={() => onClick(citation)}
      className="w-full text-left p-2.5 rounded-xl bg-[#0f1825]/90 hover:bg-[#1a2540] border border-indigo-500/20 hover:border-indigo-400/50 transition-all flex flex-col gap-1 group shadow-sm hover:shadow-indigo-900/30 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 font-mono truncate">
          <FileCode size={12} className="text-indigo-400 shrink-0" />
          <span className="truncate">{fileName}</span>
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
          L{citation.start_line}–{citation.end_line}
        </span>
      </div>

      {citation.function_name && (
        <div className="text-[10px] text-slate-400 font-mono">
          fn: <span className="text-amber-300">{citation.function_name}()</span>
        </div>
      )}

      <div className="text-[10px] text-slate-500 font-mono truncate">{citation.file_path}</div>

      <div className="flex items-center gap-1 text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
        <span>Jump to code</span>
        <ArrowRight size={9} />
      </div>
    </button>
  );
};

export const ChatPanel: React.FC = () => {
  const currentRepo = useRepoStore((state) => state.currentRepo);
  const highlightCitation = useRepoStore((state) => state.highlightCitation);
  const toast = useToast();
  const openPalette = useCommandPaletteStore((s) => s.open);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    messages,
    isStreaming,
    currentResponse,
    citations,
    status,
    error,
    sendMessage,
    cancelStream,
    setMessages,
  } = useSSEChat(currentRepo?.id || '');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse, status, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;
    const query = inputPrompt.trim();
    setInputPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    highlightCitation(citation.file_path, citation.start_line, citation.end_line, citation.snippet);
    toast.info('Citation jumped', `${citation.file_path.split('/').pop()} L${citation.start_line}–${citation.end_line}`);
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const handleStopStreaming = () => {
    cancelStream();
    toast.info('Stream stopped');
  };

  return (
    <aside
      className="h-full flex flex-col bg-[#0b0f1c] border-l border-white/[0.06] overflow-hidden"
      aria-label="AI Codebase Assistant"
    >
      {/* Header */}
      <div className="h-11 px-3 bg-[#0b0f1c] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <div className="p-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Bot size={14} />
          </div>
          <span>AI Assistant</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/20">
            Gemini 3.6 Flash
          </span>
          {isStreaming && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Streaming
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            title="Keyboard shortcuts"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <Keyboard size={13} />
          </button>

          {isStreaming ? (
            <button
              onClick={handleStopStreaming}
              title="Stop generating"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-[10px] font-semibold transition-all"
            >
              <Square size={11} />
              <span>Stop</span>
            </button>
          ) : (
            messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear Chat"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Shortcuts popup */}
      {showShortcuts && (
        <div className="mx-3 mt-2 p-3 rounded-xl bg-[#0f1825] border border-white/[0.08] text-[10px] text-slate-400 space-y-1.5 animate-slide-up shrink-0">
          <div className="font-bold text-slate-300 text-[11px] mb-2">Keyboard Shortcuts</div>
          <div className="flex items-center justify-between"><span>Submit message</span><kbd>Enter</kbd></div>
          <div className="flex items-center justify-between"><span>New line</span><kbd>Shift+Enter</kbd></div>
          <div className="flex items-center justify-between"><span>Open file finder</span><kbd>⌘K</kbd></div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-purple-950/50 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-950/50">
              <Sparkles size={26} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1 font-display">
                Ask anything about this codebase
              </h4>
              <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
                CodeLens retrieves AST chunks via Qdrant and streams answers with clickable citations.
              </p>
            </div>

            <div className="w-full space-y-1.5 text-left pt-1">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-600 px-1 flex items-center gap-1.5">
                <Zap size={10} className="text-amber-500" /> Suggestions
              </div>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full text-[11px] text-slate-300 p-2.5 rounded-xl bg-[#0f1825]/80 hover:bg-[#182038] border border-white/[0.05] hover:border-indigo-500/35 text-left transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2 leading-relaxed">"{s}"</span>
                  <ArrowRight size={11} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>

            {/* File finder hint */}
            <button
              onClick={openPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] text-[11px] text-slate-400 hover:text-slate-200 transition-all"
            >
              <kbd className="text-[9px]">⌘K</kbd>
              <span>Open file finder</span>
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2 animate-fade-in">
            {/* Role header */}
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/30 text-indigo-300'
                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
              </div>
              <span className="text-[11px] font-semibold text-slate-300">
                {msg.role === 'user' ? 'You' : 'CodeLens AI'}
              </span>
              <span className="text-[9px] text-slate-600 font-mono ml-auto">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="space-y-1.5 my-0.5 pl-4 animate-slide-up">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap size={10} className="text-amber-400" />
                  <span>Citations ({msg.citations.length})</span>
                </div>
                <div className="space-y-1.5">
                  {msg.citations.map((cit, idx) => (
                    <CitationCard key={idx} citation={cit} onClick={handleCitationClick} />
                  ))}
                </div>
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`text-xs rounded-xl p-3.5 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/18 text-slate-100 border border-indigo-500/25 ml-6 shadow-sm'
                  : 'bg-[#0f1825]/90 text-slate-200 border border-white/[0.05] shadow-md'
              }`}
            >
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Live stream */}
        {isStreaming && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <Bot size={12} />
              </div>
              <span className="text-[11px] font-semibold text-slate-300">CodeLens AI</span>
              <Loader2 size={11} className="animate-spin text-indigo-400 ml-1" />
            </div>

            {citations.length > 0 && (
              <div className="space-y-1.5 my-0.5 pl-4 animate-slide-up">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap size={10} className="text-amber-400" />
                  <span>Retrieved ({citations.length})</span>
                </div>
                <div className="space-y-1.5">
                  {citations.map((cit, idx) => (
                    <CitationCard key={idx} citation={cit} onClick={handleCitationClick} />
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs rounded-xl p-3.5 leading-relaxed bg-[#0f1825]/90 text-slate-200 border border-indigo-500/25 shadow-lg shadow-indigo-950/30">
              {currentResponse ? (
                <div className="markdown-body">
                  <ReactMarkdown>{currentResponse}</ReactMarkdown>
                  <span className="stream-cursor" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-indigo-400 text-xs py-0.5">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-slate-400 text-[11px]">{status || 'Retrieving AST slices...'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs animate-slide-up flex items-start gap-2">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[#090c18] border-t border-white/[0.06] shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this codebase…"
            disabled={isStreaming}
            className="w-full resize-none rounded-xl bg-[#07090f] border border-white/[0.09] focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 p-3 pr-12 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none disabled:opacity-50 font-sans leading-relaxed transition-all"
            style={{ minHeight: '64px', maxHeight: '120px' }}
          />
          <button
            type={isStreaming ? 'button' : 'submit'}
            onClick={isStreaming ? handleStopStreaming : undefined}
            disabled={!isStreaming && !inputPrompt.trim()}
            className={`absolute right-2.5 bottom-3 p-2 rounded-lg transition-all duration-150 shadow-md ${
              isStreaming
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : inputPrompt.trim()
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-105 active:scale-95'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isStreaming ? <Square size={14} /> : <Send size={14} />}
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-600 font-mono px-0.5">
          <span>Shift+Enter for new line</span>
          <button onClick={openPalette} className="flex items-center gap-1 hover:text-slate-400 transition-colors">
            <kbd className="text-[9px]">⌘K</kbd>
            <span>File finder</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
