import React, { useMemo } from 'react';
import { useGraphStore, selectSelectedNode } from '../store';
import clsx from 'clsx';

export const NodeDetailPanel: React.FC = () => {
  const { selectedNodeId, selectNode, graph } = useGraphStore();
  const selectedNode = useGraphStore(selectSelectedNode);

  // Get related nodes
  const relatedNodes = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    
    const related: { id: string; node: any; edgeType: string }[] = [];
    
    graph.edges.forEach(edge => {
      if (edge.source === selectedNodeId) {
        const target = graph.nodes.get(edge.target);
        if (target) {
          related.push({ id: edge.target, node: target, edgeType: edge.type });
        }
      }
      if (edge.target === selectedNodeId) {
        const source = graph.nodes.get(edge.source);
        if (source) {
          related.push({ id: edge.source, node: source, edgeType: edge.type });
        }
      }
    });
    
    return related.slice(0, 10);
  }, [selectedNodeId, graph]);

  if (!selectedNode) {
    return null;
  }

  return (
    <div className="absolute top-4 right-64 w-96 max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-slide-in-right z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-2 rounded-lg',
              getNodeTypeBg(selectedNode.type)
            )}>
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedNode.displayName}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {selectedNode.type}
              </p>
            </div>
          </div>
          <button
            onClick={() => selectNode(null)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {/* Layer Badge */}
        {selectedNode.layer && selectedNode.layer !== 'unknown' && (
          <div className="mb-4">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: getLayerColor(selectedNode.layer) }}
            >
              {selectedNode.layer.toUpperCase()} Layer
            </span>
          </div>
        )}

        {/* Description */}
        {selectedNode.description && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Description
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {selectedNode.description}
            </p>
          </div>
        )}

        {/* Signature */}
        {selectedNode.signature && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Signature
            </h4>
            <pre className="code-block text-xs">
              {selectedNode.signature}
            </pre>
          </div>
        )}

        {/* Parameters */}
        {selectedNode.parameters && selectedNode.parameters.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Parameters
            </h4>
            <div className="space-y-1">
              {selectedNode.parameters.map((param: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {param.name}
                  </code>
                  <span className="text-gray-400">:</span>
                  <span className="text-blue-600 dark:text-blue-400">{param.type}</span>
                  {param.optional && (
                    <span className="text-xs text-gray-400">(optional)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Return Type */}
        {selectedNode.returnType && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Returns
            </h4>
            <span className="text-sm text-green-600 dark:text-green-400">
              {selectedNode.returnType}
            </span>
          </div>
        )}

        {/* Tags */}
        {selectedNode.tags && selectedNode.tags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Location
          </h4>
          <div className="text-sm">
            <p className="text-gray-700 dark:text-gray-300 truncate">
              {selectedNode.file}
            </p>
            <p className="text-gray-400">
              Line {selectedNode.location.start.line} - {selectedNode.location.end.line}
            </p>
          </div>
        </div>

        {/* Related Nodes */}
        {relatedNodes.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Related ({relatedNodes.length})
            </h4>
            <div className="space-y-2">
              {relatedNodes.map(({ id, node, edgeType }) => (
                <button
                  key={id}
                  onClick={() => selectNode(id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                >
                  <span className={clsx(
                    'px-1.5 py-0.5 text-xs rounded',
                    getEdgeTypeColor(edgeType)
                  )}>
                    {edgeType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {node.displayName}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {node.type}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Complexity */}
        {selectedNode.complexity && selectedNode.complexity > 1 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Complexity
            </h4>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'w-4 h-2 rounded-full',
                      i < Math.ceil(selectedNode.complexity)
                        ? 'bg-amber-400'
                        : 'bg-gray-200 dark:bg-gray-600'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedNode.complexity.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
        <button className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
          View in Editor
        </button>
        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
          Copy Link
        </button>
      </div>
    </div>
  );
};

function getNodeTypeBg(type: string): string {
  const colors: Record<string, string> = {
    file: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
    function: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
    method: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300',
    class: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
    interface: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
    module: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
  };
  return colors[type] || 'bg-gray-100 text-gray-600';
}

function getNodeIcon(type: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    file: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    function: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    class: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )
  };
  return icons[type] || icons.file;
}

function getLayerColor(layer: string): string {
  const colors: Record<string, string> = {
    api: '#8b5cf6',
    service: '#3b82f6',
    data: '#10b981',
    ui: '#f59e0b',
    utility: '#6b7280',
    config: '#ec4899',
    test: '#14b8a6',
    unknown: '#9ca3af'
  };
  return colors[layer] || '#6366f1';
}

function getEdgeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    imports: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    calls: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    extends: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    contains: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    uses: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

export default NodeDetailPanel;
