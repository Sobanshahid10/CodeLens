import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Code2,
  GitBranch,
  Layers,
  Network,
} from 'lucide-react';
import { DependencyGraph } from '../components/DependencyGraph';
import { useRepoStore } from '../stores/repoStore';
import { useToast } from '../hooks/useToast';

export const GraphPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const setCurrentRepo = useRepoStore((s) => s.setCurrentRepo);
  const selectFile = useRepoStore((s) => s.selectFile);

  const [nodeCount, setNodeCount] = useState<number>(0);
  const [edgeCount, setEdgeCount] = useState<number>(0);

  useEffect(() => {
    if (repoId) setCurrentRepo(repoId);
  }, [repoId, setCurrentRepo]);

  if (!repoId) {
    navigate('/dashboard');
    return null;
  }

  const handleSelectFileFromGraph = (filePath: string) => {
    selectFile(filePath);
    toast.info('File selected', filePath.split('/').pop());
    navigate(`/repo/${repoId}`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#07090f] text-slate-100 overflow-hidden">
      {/* Header */}
      <header
        className="px-5 bg-[#090c18]/90 border-b border-white/[0.06] flex items-center justify-between z-10 shrink-0 backdrop-blur-xl"
        style={{ height: '52px' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/repo/${repoId}`)}
            title="Return to Workspace"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium border border-white/[0.06] transition-all"
          >
            <ArrowLeft size={13} />
            <span>Workspace</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 border border-purple-500/30 text-purple-400">
              <Network size={15} />
            </div>
            <div>
              <h1 className="text-xs font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
                {currentRepo?.github_full_name || 'Dependency Graph'}
              </h1>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                <GitBranch size={9} /> {currentRepo?.default_branch || 'main'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Node/Edge stats */}
          {(nodeCount > 0 || edgeCount > 0) && (
            <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                <Code2 size={11} className="text-indigo-400" />
                <span>{nodeCount} nodes</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                <Layers size={11} className="text-purple-400" />
                <span>{edgeCount} edges</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.06] text-[11px] text-slate-400">
            <Layers size={12} className="text-indigo-400" />
            <span className="hidden sm:inline">AST Import &amp; Call Topology</span>
          </div>
        </div>
      </header>

      {/* D3 Canvas */}
      <main className="flex-1 w-full relative overflow-hidden" aria-label="Interactive Dependency Graph">
        <DependencyGraph
          repoId={repoId}
          onSelectFile={handleSelectFileFromGraph}
          onGraphLoaded={(nodes, edges) => {
            setNodeCount(nodes);
            setEdgeCount(edges);
          }}
        />
      </main>
    </div>
  );
};
