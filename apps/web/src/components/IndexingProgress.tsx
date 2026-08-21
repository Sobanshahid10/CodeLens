import React from 'react';
import {
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FileCode2,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useIndexingProgress } from '../hooks/useIndexingProgress';

interface IndexingProgressProps {
  repoId: string;
  initialProgress?: number;
  initialStatus?: string;
  onComplete?: () => void;
}

export const IndexingProgress: React.FC<IndexingProgressProps> = ({
  repoId,
  initialProgress = 0,
  initialStatus = 'pending',
}) => {
  const { progress, stage, message, isConnected } = useIndexingProgress(repoId);

  const effectiveProgress = progress > 0 ? progress : initialProgress;
  const effectiveStage = stage !== 'idle' ? stage : initialStatus;

  const getStageBadge = () => {
    switch (effectiveStage) {
      case 'cloning':
        return (
          <span className="flex items-center gap-1 text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded text-[11px] font-medium">
            <Download size={11} className="animate-bounce" /> Cloning Repo
          </span>
        );
      case 'parsing':
        return (
          <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-medium">
            <FileCode2 size={11} /> Parsing AST Chunks
          </span>
        );
      case 'embedding':
        return (
          <span className="flex items-center gap-1 text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px] font-medium">
            <Cpu size={11} className="animate-spin" /> Embedding & Vectorizing
          </span>
        );
      case 'complete':
        return (
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-medium">
            <CheckCircle2 size={11} /> Ready
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-slate-400 bg-slate-800/60 border border-white/5 px-2 py-0.5 rounded text-[11px] font-medium">
            <Clock size={11} /> {effectiveStage}
          </span>
        );
    }
  };

  const isFinished = effectiveStage === 'complete' || effectiveProgress >= 100;

  return (
    <div className="w-full bg-[#161d2f]/70 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-md backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStageBadge()}
          <span className="text-xs font-semibold text-slate-200">
            {isFinished ? '100%' : `${effectiveProgress}%`}
          </span>
        </div>

        {/* WebSocket Connection indicator */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400" title={isConnected ? 'WebSocket live stream active' : 'Connecting to live updates...'}>
          {isConnected ? (
            <Wifi size={12} className="text-emerald-400" />
          ) : (
            <WifiOff size={12} className="text-amber-400 animate-pulse" />
          )}
          <span className="text-[10px]">{isConnected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(5, Math.min(100, effectiveProgress))}%` }}
        />
      </div>

      {/* Message Output */}
      {message ? (
        <p className="text-[11px] font-mono text-slate-400 truncate">
          {message}
        </p>
      ) : !isFinished ? (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Loader2 size={11} className="animate-spin text-indigo-400" />
          <span>Processing AST nodes and generating dense vectors...</span>
        </div>
      ) : (
        <p className="text-[11px] font-medium text-emerald-400/90 flex items-center gap-1">
          <CheckCircle2 size={12} /> AST parsing and vector embeddings indexed into Qdrant.
        </p>
      )}
    </div>
  );
};
