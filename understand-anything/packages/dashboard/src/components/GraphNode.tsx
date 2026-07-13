import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { KGNode } from '@understand-anything/core';

interface GraphNodeData extends KGNode {
  layerColor: string;
  onClick?: () => void;
}

export const GraphNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as GraphNodeData;

  const getNodeIcon = () => {
    switch (nodeData.type) {
      case 'file':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'function':
      case 'method':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'class':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'interface':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const getTypeColor = () => {
    const colors: Record<string, string> = {
      file: 'bg-indigo-500',
      function: 'bg-green-500',
      method: 'bg-cyan-500',
      class: 'bg-blue-500',
      interface: 'bg-purple-500',
      module: 'bg-orange-500',
      constant: 'bg-yellow-500',
      type: 'bg-pink-500',
      variable: 'bg-teal-500'
    };
    return colors[nodeData.type] || 'bg-gray-500';
  };

  return (
    <div
      className={clsx(
        'graph-node relative min-w-[150px] max-w-[250px] rounded-lg border-2 bg-white dark:bg-slate-800 shadow-md',
        'transition-all duration-200 cursor-pointer',
        selected ? 'border-indigo-500 shadow-lg scale-105' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Node content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={clsx('p-1 rounded', getTypeColor())}>
            <span className="text-white">{getNodeIcon()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {nodeData.displayName}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {nodeData.type}
            </div>
          </div>
        </div>

        {/* Layer badge */}
        {nodeData.layer && nodeData.layer !== 'unknown' && (
          <div
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white mb-2"
            style={{ backgroundColor: nodeData.layerColor }}
          >
            {nodeData.layer}
          </div>
        )}

        {/* Description preview */}
        {nodeData.description && (
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {nodeData.description}
          </div>
        )}

        {/* Tags */}
        {nodeData.tags && nodeData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {nodeData.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
            {nodeData.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{nodeData.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Complexity indicator */}
        {nodeData.complexity && nodeData.complexity > 1 && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs text-gray-400">Complexity:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(5, Math.ceil(nodeData.complexity)) }).map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    'w-2 h-1 rounded-full',
                    i < Math.ceil(nodeData.complexity)
                      ? 'bg-amber-400'
                      : 'bg-gray-200 dark:bg-gray-600'
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
});

GraphNode.displayName = 'GraphNode';
