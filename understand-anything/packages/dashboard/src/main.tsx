import React from 'react';
import ReactDOM from 'react-dom/client';
import { KnowledgeGraphDashboard } from './components';
import { useGraphStore } from './store';
import type { KnowledgeGraph } from '@understand-anything/core';

// Import styles
import './styles/index.css';

interface DashboardOptions {
  container?: HTMLElement;
  initialGraph?: KnowledgeGraph;
  onNodeSelect?: (nodeId: string) => void;
  onGraphChange?: (graph: KnowledgeGraph) => void;
}

class KnowledgeGraphDashboardApp {
  private container: HTMLElement;
  private root: ReactDOM.Root;

  constructor(options: DashboardOptions = {}) {
    const container = options.container || document.getElementById('root');
    if (!container) {
      throw new Error('Root container not found');
    }
    
    this.container = container;
    this.root = ReactDOM.createRoot(container);

    // Initialize with graph if provided
    if (options.initialGraph) {
      useGraphStore.getState().setGraph(options.initialGraph);
    }
  }

  render() {
    this.root.render(
      <React.StrictMode>
        <KnowledgeGraphDashboard />
      </React.StrictMode>
    );
  }

  loadGraph(graph: KnowledgeGraph) {
    useGraphStore.getState().setGraph(graph);
  }

  selectNode(nodeId: string) {
    useGraphStore.getState().selectNode(nodeId);
  }

  setLayer(layer: string) {
    useGraphStore.getState().setActiveLayer(layer as any);
  }

  startTour(tour: any) {
    useGraphStore.getState().startTour(tour);
  }

  destroy() {
    this.root.unmount();
  }
}

// Export for different module systems
export { KnowledgeGraphDashboard };
export { KnowledgeGraphDashboardApp };
export default KnowledgeGraphDashboard;

// Export hooks
export { useGraphStore, useLocaleStore, useUIStore } from './store';
export type { DashboardOptions } from './main';
