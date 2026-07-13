import React, { useMemo } from 'react';
import { useGraphStore } from '../store';

export const StatsBar: React.FC = () => {
  const { graph, activeLayer } = useGraphStore();

  const stats = useMemo(() => {
    if (!graph) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        totalFiles: 0,
        layers: {} as Record<string, number>,
        nodeTypes: {} as Record<string, number>
      };
    }

    const layers: Record<string, number> = {};
    const nodeTypes: Record<string, number> = {};
    let totalFiles = 0;

    graph.nodes.forEach(node => {
      // Count by layer
      const layer = node.layer || 'unknown';
      layers[layer] = (layers[layer] || 0) + 1;

      // Count by type
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;

      // Count files
      if (node.type === 'file') {
        totalFiles++;
      }
    });

    return {
      totalNodes: graph.nodes.size,
      totalEdges: graph.edges.size,
      totalFiles,
      layers,
      nodeTypes
    };
  }, [graph]);

  return (
    <div className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 z-30">
      <div className="flex items-center justify-between">
        {/* Project info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {graph?.projectName || 'Knowledge Graph'}
            </span>
          </div>
          
          {activeLayer !== 'all' && (
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-medium rounded">
              Filtering: {activeLayer}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {/* Nodes */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalNodes}</span> nodes
            </span>
          </div>

          {/* Edges */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalEdges}</span> edges
            </span>
          </div>

          {/* Files */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalFiles}</span> files
            </span>
          </div>

          {/* Language */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded">
              {graph?.language?.toUpperCase() || 'TypeScript'}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4">
          {/* Layer breakdown tooltip trigger */}
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <span>Layers</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Tooltip */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Nodes by Layer
              </h4>
              <div className="space-y-1">
                {Object.entries(stats.layers)
                  .sort(([, a], [, b]) => b - a)
                  .map(([layer, count]) => (
                    <div key={layer} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {layer}
                      </span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button className="px-3 py-1 text-xs font-medium text-white bg-indigo-500 rounded">
              Graph
            </button>
            <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded">
              List
            </button>
            <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded">
              Tree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
