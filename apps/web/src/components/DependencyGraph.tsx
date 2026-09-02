import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { apiClient } from '../lib/api';
import { Loader2, Maximize2, Minus, Plus, RefreshCw } from 'lucide-react';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label?: string;
  file_path?: string;
  language?: string;
  chunk_count: number;
}

export interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  edge_type?: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links?: GraphEdge[];
  edges?: GraphEdge[];
}

interface DependencyGraphProps {
  repoId: string;
  onSelectFile?: (filePath: string) => void;
  onGraphLoaded?: (nodeCount: number, edgeCount: number) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3776AB',
  typescript: '#3178C6',
  javascript: '#F7DF1E',
  go: '#00ADD8',
  java: '#ED8B00',
  rust: '#CE412B',
  html: '#E34F26',
  css: '#1572B6',
  default: '#94A3B8',
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  repoId,
  onSelectFile,
  onGraphLoaded,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });

  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Fetch graph data from backend API
  useEffect(() => {
    let isMounted = true;

    async function fetchGraph() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<GraphData>(`/api/v1/repos/${repoId}/graph`);
        if (!isMounted) return;

        const rawNodes = data.nodes || [];
        const rawEdges = data.links || data.edges || [];

        // Normalize nodes
        const nodes: GraphNode[] = rawNodes.map((n) => ({
          ...n,
          file_path: n.file_path || n.id,
          label: n.label || n.id.split('/').pop() || n.id,
          language: (n.language || 'python').toLowerCase(),
          chunk_count: n.chunk_count || 1,
        }));

        // Deep copy edges for D3 mutation
        const edges: GraphEdge[] = rawEdges.map((e) => ({
          source: typeof e.source === 'object' ? (e.source as any).id : e.source,
          target: typeof e.target === 'object' ? (e.target as any).id : e.target,
          edge_type: e.edge_type || 'import',
          weight: e.weight || 1,
        }));

        // If no nodes found from API, provide illustrative starter graph
        if (nodes.length === 0) {
          const sampleNodes: GraphNode[] = [
            { id: 'src/main.py', label: 'main.py', file_path: 'src/main.py', language: 'python', chunk_count: 5 },
            { id: 'src/config.py', label: 'config.py', file_path: 'src/config.py', language: 'python', chunk_count: 2 },
            { id: 'src/routes/auth.py', label: 'auth.py', file_path: 'src/routes/auth.py', language: 'python', chunk_count: 4 },
            { id: 'src/routes/repos.py', label: 'repos.py', file_path: 'src/routes/repos.py', language: 'python', chunk_count: 6 },
            { id: 'src/services/indexer.py', label: 'indexer.py', file_path: 'src/services/indexer.py', language: 'python', chunk_count: 8 },
            { id: 'src/models/user.py', label: 'user.py', file_path: 'src/models/user.py', language: 'python', chunk_count: 3 },
          ];
          const sampleEdges: GraphEdge[] = [
            { source: 'src/main.py', target: 'src/config.py' },
            { source: 'src/main.py', target: 'src/routes/auth.py' },
            { source: 'src/main.py', target: 'src/routes/repos.py' },
            { source: 'src/routes/repos.py', target: 'src/services/indexer.py' },
            { source: 'src/routes/auth.py', target: 'src/models/user.py' },
          ];
          setGraphData({ nodes: sampleNodes, edges: sampleEdges });
          onGraphLoaded?.(sampleNodes.length, sampleEdges.length);
        } else {
          setGraphData({ nodes, edges });
          onGraphLoaded?.(nodes.length, edges.length);
        }
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load dependency graph');
        setLoading(false);
      }
    }

    fetchGraph();

    return () => {
      isMounted = false;
    };
  }, [repoId]);

  // Render D3 force-directed simulation
  useEffect(() => {
    if (loading || !svgRef.current || !containerRef.current || graphData.nodes.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', '100%');

    // Create container group for zoom/pan
    const g = svg.append('g').attr('class', 'graph-root');

    // Define Arrow Marker for Directed Edges
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569');

    // Zoom behavior: scaleExtent([0.1, 10])
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Deep clones to prevent simulation object mutation collision
    const nodes: GraphNode[] = graphData.nodes.map((d) => ({ ...d }));
    const edges: GraphEdge[] = graphData.edges.map((d) => ({ ...d }));

    // D3 Force Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance(85)
          .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-220).theta(0.9)) // Barnes-Hut O(n log n)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(25));

    // Render Edges
    const link = g
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.min(4, Math.max(1, (d.weight || 1) * 1.5)))
      .attr('marker-end', 'url(#arrowhead)');

    // Render Nodes (group with circle and text)
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        setSelectedNode(d);
        if (onSelectFile && d.file_path) {
          onSelectFile(d.file_path);
        }
      });

    // Node Circle
    node
      .append('circle')
      .attr('r', (d) => Math.max(6, Math.min(20, (d.chunk_count || 1) * 2)))
      .attr('fill', (d) => LANGUAGE_COLORS[d.language || 'default'] || LANGUAGE_COLORS.default)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('class', 'transition-all duration-150 hover:brightness-125')
      .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))');

    // Node Labels
    node
      .append('text')
      .text((d) => d.label || d.id)
      .attr('x', 14)
      .attr('y', 4)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-family', "'Fira Code', monospace")
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)');

    // Drag behavior: set fx, fy during drag and reset on drag end
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    // Simulation Tick Updates
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, loading, onSelectFile]);

  // Zoom control helpers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0a0d14] overflow-hidden select-none">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0d14]/80 z-20">
          <Loader2 size={32} className="animate-spin text-indigo-400 mb-2" />
          <span className="text-xs text-slate-300">Constructing AST dependency graph...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
          <p className="text-xs text-rose-400 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Zoom / Control Toolbar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#161d2f]/90 border border-white/10 p-1 rounded-xl shadow-lg backdrop-blur-md z-10">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset View"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Language Color Legend */}
      <div className="absolute top-4 left-4 bg-[#161d2f]/90 border border-white/10 rounded-xl p-3 shadow-lg backdrop-blur-md z-10 space-y-2 text-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Languages
        </div>
        <div className="flex flex-col gap-1.5">
          {Object.entries(LANGUAGE_COLORS).map(([lang, color]) => {
            if (lang === 'default') return null;
            return (
              <div key={lang} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="capitalize text-slate-300 text-[11px]">{lang}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute top-4 right-4 max-w-xs bg-[#161d2f]/95 border border-indigo-500/40 rounded-xl p-3.5 shadow-2xl backdrop-blur-md z-10 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-indigo-400 font-semibold truncate">
              {selectedNode.label}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] text-slate-300 font-mono break-all bg-[#0a0d14]/80 p-2 rounded border border-white/5">
            {selectedNode.file_path}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Language: <strong className="text-slate-200 capitalize">{selectedNode.language}</strong></span>
            <span>Chunks: <strong className="text-slate-200">{selectedNode.chunk_count}</strong></span>
          </div>
          {onSelectFile && selectedNode.file_path && (
            <button
              onClick={() => onSelectFile(selectedNode.file_path!)}
              className="w-full mt-2 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Open in Monaco Workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
};
