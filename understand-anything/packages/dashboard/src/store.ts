import { create } from 'zustand';
import type { KGNode, KGEdge, KnowledgeGraph, Tour, SearchResult, LayerType } from '@understand-anything/core';

// Graph visualization state
interface GraphState {
  graph: KnowledgeGraph | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  activeLayer: LayerType | 'all';
  viewMode: 'default' | 'layer' | 'domain';
  zoom: number;
  selectedTour: Tour | null;
  tourStepIndex: number;
  isLoading: boolean;
  error: string | null;
  showMinimap: boolean;
  showControls: boolean;
}

// Actions
interface GraphActions {
  setGraph: (graph: KnowledgeGraph) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setActiveLayer: (layer: LayerType | 'all') => void;
  setViewMode: (mode: 'default' | 'layer' | 'domain') => void;
  setZoom: (zoom: number) => void;
  startTour: (tour: Tour) => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleMinimap: () => void;
  toggleControls: () => void;
  reset: () => void;
}

// Initial state
const initialState: GraphState = {
  graph: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  searchResults: [],
  activeLayer: 'all',
  viewMode: 'default',
  zoom: 1,
  selectedTour: null,
  tourStepIndex: 0,
  isLoading: false,
  error: null,
  showMinimap: true,
  showControls: true
};

// Create store
export const useGraphStore = create<GraphState & GraphActions>((set, get) => ({
  ...initialState,

  setGraph: (graph) => set({ graph }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results) => set({ searchResults: results }),

  setActiveLayer: (layer) => set({ activeLayer: layer }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setZoom: (zoom) => set({ zoom }),

  startTour: (tour) => set({ selectedTour: tour, tourStepIndex: 0 }),

  nextTourStep: () => {
    const { selectedTour, tourStepIndex } = get();
    if (selectedTour && tourStepIndex < selectedTour.steps.length - 1) {
      set({ tourStepIndex: tourStepIndex + 1 });
    }
  },

  prevTourStep: () => {
    const { tourStepIndex } = get();
    if (tourStepIndex > 0) {
      set({ tourStepIndex: tourStepIndex - 1 });
    }
  },

  endTour: () => set({ selectedTour: null, tourStepIndex: 0 }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

  toggleControls: () => set((state) => ({ showControls: !state.showControls })),

  reset: () => set(initialState)
}));

// Selectors
export const selectSelectedNode = (state: GraphState): KGNode | null => {
  if (!state.selectedNodeId || !state.graph) return null;
  return state.graph.nodes.get(state.selectedNodeId) || null;
};

export const selectNodesByLayer = (state: GraphState, layer: LayerType): KGNode[] => {
  if (!state.graph) return [];
  return Array.from(state.graph.nodes.values()).filter(n => n.layer === layer);
};

export const selectFilteredNodes = (state: GraphState): KGNode[] => {
  if (!state.graph) return [];
  const nodes = Array.from(state.graph.nodes.values());
  
  if (state.activeLayer === 'all') return nodes;
  
  return nodes.filter(n => n.layer === state.activeLayer);
};

export const selectFilteredEdges = (state: GraphState): KGEdge[] => {
  if (!state.graph) return [];
  const filteredNodes = new Set(selectFilteredNodes(state).map(n => n.id));
  
  return Array.from(state.graph.edges.values()).filter(
    e => filteredNodes.has(e.source) && filteredNodes.has(e.target)
  );
};

export const selectCurrentTourStep = (state: GraphState) => {
  if (!state.selectedTour) return null;
  return state.selectedTour.steps[state.tourStepIndex] || null;
};

// Language/locale store for UI
interface LocaleState {
  language: 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'tr' | 'ru';
  setLanguage: (lang: LocaleState['language']) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language })
}));

// UI preferences store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  nodeDetailPanelOpen: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: UIState['theme']) => void;
  toggleNodeDetailPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'auto',
  nodeDetailPanelOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  toggleNodeDetailPanel: () => set((state) => ({ 
    nodeDetailPanelOpen: !state.nodeDetailPanelOpen 
  }))
}));
