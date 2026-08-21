import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  GitBranch,
  Layers,
  Network,
} from 'lucide-react';
import { DependencyGraph } from '../components/DependencyGraph';
import { useRepoStore } from '../stores/repoStore';

export const GraphPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();

  const currentRepo = useRepoStore((state) => state.currentRepo);
  const setCurrentRepo = useRepoStore((state) => state.setCurrentRepo);
  const selectFile = useRepoStore((state) => state.selectFile);

  useEffect(() => {
    if (repoId) {
      setCurrentRepo(repoId);
    }
  }, [repoId, setCurrentRepo]);

  if (!repoId) {
    navigate('/dashboard');
    return null;
  }

  const handleSelectFileFromGraph = (filePath: string) => {
    selectFile(filePath);
    navigate(`/repo/${repoId}`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0d14] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 px-6 bg-[#0f1422] border-b border-white/5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/repo/${repoId}`)}
            title="Return to Workspace"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 text-xs font-medium border border-white/5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Workspace</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400">
              <Network size={16} />
            </div>
            <div>
              <h1 className="text-xs font-bold text-white tracking-tight">
                {currentRepo?.github_full_name || 'Dependency Graph'}
              </h1>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <GitBranch size={9} /> {currentRepo?.default_branch || 'main'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <Layers size={13} className="text-indigo-400" />
            <span>AST Import & Call Topology</span>
          </div>
        </div>
      </header>

      {/* D3 Graph View Canvas */}
      <main className="flex-1 w-full relative overflow-hidden" aria-label="Interactive Dependency Graph">
        <DependencyGraph
          repoId={repoId}
          onSelectFile={handleSelectFileFromGraph}
        />
      </main>
    </div>
  );
};
