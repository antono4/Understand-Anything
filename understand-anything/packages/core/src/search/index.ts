import Fuse from 'fuse.js';
import type { KGNode, SearchResult, SearchMatch, KnowledgeGraph } from '../types/index.js';

// Fuse.js options for fuzzy search
const DEFAULT_FUSE_OPTIONS: Fuse.IFuseOptions<KGNode> = {
  keys: [
    { name: 'name', weight: 2.0 },
    { name: 'displayName', weight: 1.5 },
    { name: 'description', weight: 1.0 },
    { name: 'tags', weight: 1.5 },
    { name: 'signature', weight: 0.8 },
    { name: 'file', weight: 0.5 }
  ],
  threshold: 0.4,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  useExtendedSearch: true,
  ignoreLocation: true,
  findAllMatches: true
};

export class GraphSearch {
  private fuse: Fuse<KGNode>;
  private nodes: KGNode[];
  private graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
    this.nodes = Array.from(graph.nodes.values());
    this.fuse = new Fuse(this.nodes, DEFAULT_FUSE_OPTIONS);
  }

  // Basic fuzzy search
  search(query: string, limit: number = 20): SearchResult[] {
    const results = this.fuse.search(query, { limit });
    
    return results.map(result => ({
      node: result.item,
      score: 1 - (result.score || 0),
      matches: this.extractMatches(result.matches || []),
      context: this.generateContext(result.item)
    }));
  }

  // Search by type
  searchByType(query: string, nodeType: KGNode['type'], limit: number = 20): SearchResult[] {
    const typeFiltered = this.nodes.filter(n => n.type === nodeType);
    const typeFuse = new Fuse(typeFiltered, DEFAULT_FUSE_OPTIONS);
    const results = typeFuse.search(query, { limit });

    return results.map(result => ({
      node: result.item,
      score: 1 - (result.score || 0),
      matches: this.extractMatches(result.matches || []),
      context: this.generateContext(result.item)
    }));
  }

  // Search by layer
  searchByLayer(query: string, layer: KGNode['layer'], limit: number = 20): SearchResult[] {
    const layerFiltered = this.nodes.filter(n => n.layer === layer);
    const layerFuse = new Fuse(layerFiltered, DEFAULT_FUSE_OPTIONS);
    const results = layerFuse.search(query, { limit });

    return results.map(result => ({
      node: result.item,
      score: 1 - (result.score || 0),
      matches: this.extractMatches(result.matches || []),
      context: this.generateContext(result.item)
    }));
  }

  // Search by tags
  searchByTags(tags: string[], limit: number = 20): SearchResult[] {
    const tagFiltered = this.nodes.filter(n => 
      tags.some(tag => n.tags.includes(tag))
    );
    
    return tagFiltered.slice(0, limit).map(node => ({
      node,
      score: 1.0,
      matches: [],
      context: this.generateContext(node)
    }));
  }

  // Search in file
  searchInFile(query: string, filePath: string, limit: number = 20): SearchResult[] {
    const fileFiltered = this.nodes.filter(n => n.file.includes(filePath));
    const fileFuse = new Fuse(fileFiltered, DEFAULT_FUSE_OPTIONS);
    const results = fileFuse.search(query, { limit });

    return results.map(result => ({
      node: result.item,
      score: 1 - (result.score || 0),
      matches: this.extractMatches(result.matches || []),
      context: this.generateContext(result.item)
    }));
  }

  // Semantic search (simulated - in production would use embeddings)
  semanticSearch(query: string, limit: number = 20): SearchResult[] {
    // Expand query with related terms
    const expandedQueries = this.expandQuery(query);
    const allResults: Map<string, SearchResult> = new Map();

    for (const expanded of expandedQueries) {
      const results = this.search(expanded, limit);
      results.forEach(result => {
        if (allResults.has(result.node.id)) {
          const existing = allResults.get(result.node.id)!;
          existing.score = Math.max(existing.score, result.score);
        } else {
          allResults.set(result.node.id, result);
        }
      });
    }

    return Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Get related nodes
  getRelatedNodes(nodeId: string, limit: number = 10): KGNode[] {
    const related: Map<string, number> = new Map();

    // Find edges where this node is source or target
    this.graph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        related.set(edge.target, edge.weight);
      }
      if (edge.target === nodeId) {
        related.set(edge.source, edge.weight);
      }
    });

    return Array.from(related.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.graph.nodes.get(id))
      .filter(Boolean) as KGNode[];
  }

  // Get nodes by layer
  getNodesByLayer(layer: KGNode['layer']): KGNode[] {
    return this.nodes.filter(n => n.layer === layer);
  }

  // Get all layers present in graph
  getLayers(): KGNode['layer'][] {
    const layers = new Set<KGNode['layer']>();
    this.nodes.forEach(n => {
      if (n.layer) layers.add(n.layer);
    });
    return Array.from(layers);
  }

  // Extract matches for display
  private extractMatches(matches: readonly Fuse.FuseResultMatch[]): SearchMatch[] {
    return matches.map(match => ({
      field: match.key || '',
      value: match.value || '',
      indices: match.indices as [number, number][]
    }));
  }

  // Generate context snippet
  private generateContext(node: KGNode): string {
    const parts: string[] = [];
    
    if (node.type !== 'file') {
      parts.push(`${node.type}: ${node.displayName}`);
    }
    
    if (node.signature) {
      parts.push(node.signature);
    }
    
    if (node.description) {
      parts.push(node.description.slice(0, 100));
    }
    
    if (node.tags.length > 0) {
      parts.push(`Tags: ${node.tags.join(', ')}`);
    }
    
    return parts.join(' | ');
  }

  // Expand query with related terms
  private expandQuery(query: string): string[] {
    const base = query.toLowerCase();
    const expansions: Set<string> = new Set([base]);

    // Common variations
    const synonyms: Record<string, string[]> = {
      'get': ['fetch', 'retrieve', 'load', 'read'],
      'set': ['update', 'write', 'assign', 'store'],
      'create': ['add', 'new', 'make', 'generate'],
      'delete': ['remove', 'destroy', 'drop', 'erase'],
      'auth': ['authenticate', 'login', 'verify'],
      'config': ['configuration', 'settings', 'options'],
      'api': ['endpoint', 'route', 'handler'],
      'db': ['database', 'storage', 'repository'],
      'service': ['service', 'business', 'logic'],
      'model': ['entity', 'schema', 'data'],
    };

    for (const [word, variants] of Object.entries(synonyms)) {
      if (base.includes(word)) {
        variants.forEach(v => expansions.add(base.replace(word, v)));
      }
    }

    return Array.from(expansions);
  }

  // Update search index when graph changes
  updateIndex(): void {
    this.nodes = Array.from(this.graph.nodes.values());
    this.fuse = new Fuse(this.nodes, DEFAULT_FUSE_OPTIONS);
  }
}

// Export singleton factory
export function createSearch(graph: KnowledgeGraph): GraphSearch {
  return new GraphSearch(graph);
}
