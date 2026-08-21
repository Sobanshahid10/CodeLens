import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Code,
  FileCode,
  Loader2,
  Square,
  User,
} from 'lucide-react';
import { Citation, useSSEChat } from '../hooks/useSSEChat';
import { useRepoStore } from '../stores/repoStore';

interface ChatPanelProps {
  repoId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ repoId }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    isStreaming,
    currentResponse,
    citations,
    status,
    error,
    sendMessage,
    cancelStream,
  } = useSSEChat(repoId);

  const highlightCitation = useRepoStore((state) => state.highlightCitation);

  // Auto-scroll to bottom of chat as new tokens arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse, citations, status]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const query = inputValue;
    setInputValue('');
    await sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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

  const renderCitationCard = (citation: Citation, index: number) => {
    const fileName = citation.file_path.split('/').pop() || citation.file_path;
    return (
      <div
        key={`${citation.file_path}-${citation.start_line}-${index}`}
        onClick={() => handleCitationClick(citation)}
        className="group flex flex-col gap-1 p-2 rounded-lg bg-[#161d2f]/90 border border-indigo-500/20 hover:border-emerald-500/60 hover:bg-[#1a233a] cursor-pointer transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 truncate">
            <FileCode size={12} className="shrink-0 text-emerald-400" />
            <span className="truncate">{fileName}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0">
            L{citation.start_line}–{citation.end_line}
          </span>
        </div>

        {citation.function_name && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-300">
            <Code size={11} className="text-indigo-400" />
            <span className="truncate">{citation.function_name}()</span>
          </div>
        )}

        {citation.snippet && (
          <p className="text-[11px] font-mono text-slate-400 line-clamp-2 bg-[#0a0d14]/70 p-1.5 rounded border border-white/5 group-hover:text-slate-300 transition-colors">
            {citation.snippet}
          </p>
        )}
      </div>
    );
  };

  return (
    <aside className="h-full flex flex-col bg-[#0f1422] border-l border-white/5 overflow-hidden" aria-label="AI Codebase Assistant Chat">
      {/* Chat Header */}
      <div className="h-9 px-3 bg-[#0f1422] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Bot size={14} className="text-indigo-400" />
          <span>CodeLens AI Assistant</span>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1 text-[11px] text-indigo-400 animate-pulse">
            <Loader2 size={11} className="animate-spin" />
            <span>Generating...</span>
          </div>
        )}
      </div>

      {/* Message History Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <div className="p-3 rounded-full bg-indigo-950/40 border border-indigo-500/20 mb-3 text-indigo-400">
              <Bot size={24} />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">
              Ask anything about this codebase
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              CodeLens retrieves exact AST chunks and displays interactive citations.
            </p>
            <div className="w-full space-y-1.5 text-left">
              {[
                'Where is authentication handled?',
                'Explain how repository indexing works.',
                'What are the core dependencies in this project?',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  className="w-full text-xs text-slate-300 p-2 rounded-lg bg-[#161d2f]/70 hover:bg-[#1a233a] border border-white/5 hover:border-indigo-500/40 text-left transition-all"
                >
                  "{suggestion}"
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
                  msg.role === 'user' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-700/40 text-emerald-400'
                }`}
              >
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {msg.role === 'user' ? 'You' : 'CodeLens'}
              </span>
            </div>

            {/* Citations List for Assistant Message */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="space-y-1.5 my-1 pl-6">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Citations ({msg.citations.length})
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {msg.citations.map((cit, cIdx) => renderCitationCard(cit, cIdx))}
                </div>
              </div>
            )}

            <div
              className={`text-xs rounded-xl p-3 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/20 text-slate-100 border border-indigo-500/30 ml-4'
                  : 'bg-[#161d2f]/80 text-slate-200 border border-white/5'
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
              <div className="p-1 rounded-md bg-slate-700/40 text-emerald-400">
                <Bot size={13} />
              </div>
              <span className="text-xs font-semibold text-slate-300">CodeLens</span>
            </div>

            {/* Live Citations if already returned before tokens */}
            {citations.length > 0 && (
              <div className="space-y-1.5 my-1 pl-6">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Retrieved Citations ({citations.length})
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {citations.map((cit, cIdx) => renderCitationCard(cit, cIdx))}
                </div>
              </div>
            )}

            {/* Status indicator badge during search */}
            {status && (
              <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 p-2 rounded-lg ml-6">
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                <span>{status}</span>
              </div>
            )}

            {currentResponse && (
              <div className="text-xs rounded-xl p-3 bg-[#161d2f]/80 text-slate-200 border border-white/5 leading-relaxed ml-2">
                <div className="markdown-body">
                  <ReactMarkdown>{currentResponse}</ReactMarkdown>
                </div>
                <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-[#0a0d14] border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the code (Shift+Enter for newline)..."
            rows={2}
            className="w-full resize-none bg-[#161d2f] text-xs text-slate-200 p-2.5 pr-10 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[9px]">Enter</kbd> to send
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={cancelStream}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium transition-colors"
              >
                <Square size={11} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-medium transition-colors"
              >
                <span>Send</span>
                <ArrowUp size={12} />
              </button>
            )}
          </div>
        </form>
      </div>
    </aside>
  );
};
