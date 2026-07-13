import React, { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge
} from '@xyflow/react';

interface GraphEdgeData {
  edgeType: string;
  weight: number;
  description?: string;
}

export const GraphEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  const edgeData = data as GraphEdgeData | undefined;
  const edgeType = edgeData?.edgeType || 'unknown';
  const weight = edgeData?.weight || 0.5;

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25
  });

  // Edge styling based on type
  const getEdgeStyle = () => {
    const baseStyle = {
      strokeWidth: Math.max(1, weight * 4),
      strokeOpacity: selected ? 1 : 0.6
    };

    switch (edgeType) {
      case 'imports':
        return {
          ...baseStyle,
          stroke: '#94a3b8',
          strokeDasharray: '5 5'
        };
      case 'calls':
        return {
          ...baseStyle,
          stroke: '#f59e0b'
        };
      case 'extends':
        return {
          ...baseStyle,
          stroke: '#8b5cf6',
          strokeDasharray: '0'
        };
      case 'implements':
        return {
          ...baseStyle,
          stroke: '#a855f7',
          strokeDasharray: '3 3'
        };
      case 'contains':
        return {
          ...baseStyle,
          stroke: '#64748b',
          strokeWidth: Math.max(1, weight * 2)
        };
      case 'uses':
        return {
          ...baseStyle,
          stroke: '#22c55e'
        };
      case 'depends-on':
        return {
          ...baseStyle,
          stroke: '#ef4444',
          strokeDasharray: '8 4'
        };
      case 'type-annotation':
        return {
          ...baseStyle,
          stroke: '#06b6d4',
          strokeDasharray: '2 2'
        };
      default:
        return {
          ...baseStyle,
          stroke: '#94a3b8'
        };
    }
  };

  const style = getEdgeStyle();

  return (
    <>
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        className={selected ? 'react-flow__edge-path' : ''}
      />

      {/* Animated dots for call edges */}
      {edgeType === 'calls' && (
        <circle r="3" fill="#f59e0b">
          <animateMotion
            dur={`${2 / weight}s`}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}

      {/* Label on hover/selection */}
      {(selected || weight > 0.8) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all'
            }}
            className="nodrag nopan px-2 py-1 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-gray-700 shadow-sm text-xs"
          >
            <span className="capitalize text-gray-600 dark:text-gray-300">
              {edgeType}
            </span>
            {edgeData?.description && (
              <span className="text-gray-400 ml-1">
                {edgeData.description.length > 20
                  ? edgeData.description.substring(0, 20) + '...'
                  : edgeData.description}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

GraphEdge.displayName = 'GraphEdge';

// Custom smoothstep edge variant
export const SmoothStepEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  const edgeData = data as GraphEdgeData | undefined;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.15
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: '#3b82f6',
        strokeWidth: selected ? 3 : 2,
        strokeOpacity: selected ? 1 : 0.4
      }}
    />
  );
});

SmoothStepEdge.displayName = 'SmoothStepEdge';
