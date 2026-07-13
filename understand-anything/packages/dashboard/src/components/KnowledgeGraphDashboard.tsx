import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore, selectFilteredNodes, selectFilteredEdges } from '../store';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { SearchPanel } from './SearchPanel';
import { LayerFilter } from './LayerFilter';
import { NodeDetailPanel } from './NodeDetailPanel';
import { TourOverlay } from './TourOverlay';
import { StatsBar } from './StatsBar';
import type { KGNode, KGEdge, LayerType } from '@understand-anything/core';

// Node types for React Flow
const nodeTypes: NodeTypes = {
  graphNode: GraphNode
};

// Edge types for React Flow
const edgeTypes: EdgeTypes = {
  graphEdge: GraphEdge
};

// Layer to color mapping
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

export const KnowledgeGraphDashboard: React.FC = () => {
  const {
    graph,
    selectedNodeId,
    selectNode,
    activeLayer,
    showMinimap,
    showControls,
    selectedTour,
    startTour
  } = useGraphStore();

  const filteredNodes = useGraphStore(selectFilteredNodes);
  const filteredEdges = useGraphStore(selectFilteredEdges);

  // Convert KG nodes to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    return filteredNodes.map((node, index) => ({
      id: node.id,
      type: 'graphNode',
      position: { x: (index % 10) * 150, y: Math.floor(index / 10) * 150 },
      data: {
        ...node,
        layerColor: LAYER_COLORS[node.layer || 'unknown']
      },
      selected: node.id === selectedNodeId
    }));
  }, [filteredNodes, selectedNodeId]);

  // Convert KG edges to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    return filteredEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'graphEdge',
      data: {
        edgeType: edge.type,
        weight: edge.weight
      },
      animated: edge.type === 'calls',
      style: {
        stroke: getEdgeColor(edge.type),
        strokeWidth: Math.max(1, edge.weight * 3)
      }
    }));
  }, [filteredEdges]);

  // State for React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync with filtered data
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Handle connection
  const onConnect = useCallback((connection: Connection) => {
    // Handle edge creation (future feature)
    console.log('Connection:', connection);
  }, []);

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse-subtle">
            <svg className="w-16 h-16 mx-auto text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Knowledge Graph...</h2>
          <p className="text-gray-500 mt-2">Analyzing codebase structure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[var(--color-bg-secondary)]">
      {/* Stats Bar */}
      <StatsBar />

      {/* Main Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'graphEdge'
        }}
      >
        {/* Background */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        {/* Controls */}
        {showControls && (
          <Controls
            position="bottom-right"
            showInteractive={false}
          />
        )}

        {/* Mini Map */}
        {showMinimap && (
          <MiniMap
            position="bottom-left"
            nodeColor={(node) => (node.data as any)?.layerColor || '#6366f1'}
            maskColor="rgba(0, 0, 0, 0.1)"
            pannable
            zoomable
          />
        )}

        {/* Panels */}
        <Panel position="top-left">
          <SearchPanel />
        </Panel>

        <Panel position="top-right">
          <LayerFilter />
        </Panel>
      </ReactFlow>

      {/* Node Detail Panel */}
      <NodeDetailPanel />

      {/* Tour Overlay */}
      {selectedTour && <TourOverlay />}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 p-3 panel">
        <h4 className="text-xs font-semibold text-gray-500 mb-2">LAYERS</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(LAYER_COLORS)
            .filter(([key]) => key !== 'all')
            .map(([layer, color]) => (
              <div key={layer} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs capitalize">{layer}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Helper function for edge colors
function getEdgeColor(type: string): string {
  const colors: Record<string, string> = {
    imports: '#94a3b8',
    calls: '#f59e0b',
    extends: '#8b5cf6',
    implements: '#a855f7',
    contains: '#64748b',
    uses: '#22c55e',
    'depends-on': '#ef4444',
    'type-annotation': '#06b6d4'
  };
  return colors[type] || '#94a3b8';
}

export default KnowledgeGraphDashboard;
