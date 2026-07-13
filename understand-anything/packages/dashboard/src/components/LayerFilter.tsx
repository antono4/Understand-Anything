import React, { useState } from 'react';
import { useGraphStore } from '../store';
import clsx from 'clsx';
import type { LayerType } from '@understand-anything/core';

const LAYERS: (LayerType | 'all')[] = [
  'all',
  'api',
  'service',
  'data',
  'ui',
  'utility',
  'config',
  'test',
  'unknown'
];

const LAYER_COLORS: Record<LayerType | 'all', string> = {
  all: '#6366f1',
  api: '#8b5cf6',
  service: '#3b82f6',
  data: '#10b981',
  ui: '#f59e0b',
  utility: '#6b7280',
  config: '#ec4899',
  test: '#14b8a6',
  unknown: '#9ca3af'
};

const LAYER_LABELS: Record<LayerType | 'all', string> = {
  all: 'All Layers',
  api: 'API',
  service: 'Service',
  data: 'Data',
  ui: 'UI',
  utility: 'Utils',
  config: 'Config',
  test: 'Tests',
  unknown: 'Unknown'
};

export const LayerFilter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { graph, activeLayer, setActiveLayer } = useGraphStore();

  // Count nodes per layer
  const layerCounts = React.useMemo(() => {
    if (!graph) return {};
    
    const counts: Record<string, number> = { all: graph.nodes.size };
    
    graph.nodes.forEach(node => {
      const layer = node.layer || 'unknown';
      counts[layer] = (counts[layer] || 0) + 1;
    });
    
    return counts;
  }, [graph]);

  const handleLayerSelect = (layer: LayerType | 'all') => {
    setActiveLayer(layer);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border',
          'border-gray-200 dark:border-gray-700 shadow-sm',
          'hover:border-gray-300 dark:hover:border-gray-600 transition-colors'
        )}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: LAYER_COLORS[activeLayer] }}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {LAYER_LABELS[activeLayer]}
        </span>
        <svg
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl z-50 animate-fade-in">
          <div className="p-2">
            {LAYERS.map(layer => {
              const count = layerCounts[layer] || 0;
              const isActive = layer === activeLayer;

              return (
                <button
                  key={layer}
                  onClick={() => handleLayerSelect(layer)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                    'hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors',
                    isActive && 'bg-indigo-50 dark:bg-indigo-900/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: LAYER_COLORS[layer] }}
                    />
                    <span className={clsx(
                      'text-sm font-medium',
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {LAYER_LABELS[layer]}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stats summary */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {layerCounts[activeLayer] || 0} of {graph?.nodes.size || 0} nodes
            </div>
          </div>
        </div>
      )}

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-1 mt-2">
        {LAYERS.slice(1).map(layer => (
          <button
            key={layer}
            onClick={() => setActiveLayer(layer)}
            className={clsx(
              'px-2 py-1 text-xs rounded-full transition-all',
              activeLayer === layer
                ? 'ring-2 ring-offset-1'
                : 'opacity-60 hover:opacity-100'
            )}
            style={{
              backgroundColor: LAYER_COLORS[layer],
              color: 'white',
              ringColor: LAYER_COLORS[layer]
            }}
          >
            {LAYER_LABELS[layer]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LayerFilter;
