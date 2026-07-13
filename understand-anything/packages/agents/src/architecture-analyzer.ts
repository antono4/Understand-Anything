// Architecture Analyzer Agent - Identifies architectural layers and patterns
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import type { KGNode, KnowledgeGraph, LayerType } from '@understand-anything/core';

interface ArchitectureAnalysis {
  layers: LayerInfo[];
  patterns: ArchitecturalPattern[];
  dependencies: DependencyGraph;
  recommendations: string[];
}

interface LayerInfo {
  name: LayerType;
  nodes: string[];
  description: string;
  health: 'good' | 'warning' | 'critical';
  metrics: {
    nodeCount: number;
    edgeCount: number;
    avgComplexity: number;
    coupling: number;
  };
}

interface ArchitecturalPattern {
  name: string;
  confidence: number;
  description: string;
  detectedIn: string[];
}

interface DependencyGraph {
  layerDependencies: Record<LayerType, LayerType[]>;
  circularDependencies: string[][];
  violatingLayers: string[];
}

export class ArchitectureAnalyzerAgent extends BaseAgent {
  constructor() {
    super('architecture-analyzer', 'Identifies architectural layers, patterns, and dependencies');
  }

  async execute(input: unknown): Promise<AgentResult<ArchitectureAnalysis>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const graph = this.context.graph;

    try {
      // Detect layers for all nodes
      this.detectLayers(graph);

      // Identify layers
      const layers = this.identifyLayers(graph);

      // Detect architectural patterns
      const patterns = this.detectPatterns(graph);

      // Analyze dependencies
      const dependencies = this.analyzeDependencies(graph, layers);

      // Generate recommendations
      const recommendations = this.generateRecommendations(layers, dependencies, patterns);

      // Update graph metadata
      graph.metadata.layerStats = layers.reduce((acc, l) => {
        acc[l.name] = l.metrics.nodeCount;
        return acc;
      }, {} as Record<LayerType, number>);

      this.log(`Analyzed ${layers.length} layers, detected ${patterns.length} patterns`);

      const result: ArchitectureAnalysis = {
        layers,
        patterns,
        dependencies,
        recommendations
      };

      return {
        success: true,
        data: result,
        metadata: { graph }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Architecture analysis failed'
      };
    }
  }

  private detectLayers(graph: KnowledgeGraph): void {
    graph.nodes.forEach((node, id) => {
      const layer = this.classifyNode(node);
      node.layer = layer;
      graph.nodes.set(id, node);
    });
  }

  private classifyNode(node: KGNode): LayerType {
    const filePath = node.file.toLowerCase();
    const name = node.name.toLowerCase();
    const fileName = filePath.split('/').pop() || '';

    // Layer classification rules
    const rules: { pattern: RegExp | string; layer: LayerType }[] = [
      // API/Controller layer
      { pattern: /\/api[\/]?/, layer: 'api' },
      { pattern: /\/controllers?[\/]?/, layer: 'api' },
      { pattern: /\/routes?[\/]?/, layer: 'api' },
      { pattern: /\/endpoints?[\/]?/, layer: 'api' },
      { pattern: /\/handlers?[\/]?/, layer: 'api' },
      { pattern: /controller\.?/, layer: 'api' },
      { pattern: /route\.?/, layer: 'api' },
      { pattern: /handler\.?/, layer: 'api' },

      // Service layer
      { pattern: /\/services?[\/]?/, layer: 'service' },
      { pattern: /\/business[\/]?/, layer: 'service' },
      { pattern: /\/logic[\/]?/, layer: 'service' },
      { pattern: /service\.?/, layer: 'service' },
      { pattern: /manager\.?/, layer: 'service' },

      // Data layer
      { pattern: /\/models?[\/]?/, layer: 'data' },
      { pattern: /\/repositories?[\/]?/, layer: 'data' },
      { pattern: /\/daos?[\/]?/, layer: 'data' },
      { pattern: /\/entities?[\/]?/, layer: 'data' },
      { pattern: /\/schemas?[\/]?/, layer: 'data' },
      { pattern: /\/db[\/]?/, layer: 'data' },
      { pattern: /repository\.?/, layer: 'data' },
      { pattern: /dao\.?/, layer: 'data' },
      { pattern: /model\.?/, layer: 'data' },

      // UI layer
      { pattern: /\/components?[\/]?/, layer: 'ui' },
      { pattern: /\/views?[\/]?/, layer: 'ui' },
      { pattern: /\/pages?[\/]?/, layer: 'ui' },
      { pattern: /\/screens?[\/]?/, layer: 'ui' },
      { pattern: /\.jsx?$/, layer: 'ui' },
      { pattern: /\.tsx?$/, layer: 'ui' },
      { pattern: /\.vue$/, layer: 'ui' },
      { pattern: /\.svelte$/, layer: 'ui' },

      // Config layer
      { pattern: /\/config[\/]?/, layer: 'config' },
      { pattern: /\/settings[\/]?/, layer: 'config' },
      { pattern: /\.config\./, layer: 'config' },
      { pattern: /\.env/, layer: 'config' },
      { pattern: /settings\.?/, layer: 'config' },

      // Test layer
      { pattern: /\.spec\./, layer: 'test' },
      { pattern: /\.test\./, layer: 'test' },
      { pattern: /\/tests?[\/]?/, layer: 'test' },
      { pattern: /__tests__/, layer: 'test' },
      { pattern: /\/mocks?[\/]?/, layer: 'test' },

      // Utility layer
      { pattern: /\/utils?[\/]?/, layer: 'utility' },
      { pattern: /\/helpers?[\/]?/, layer: 'utility' },
      { pattern: /\/lib[\/]?/, layer: 'utility' },
      { pattern: /util\.?/, layer: 'utility' },
      { pattern: /helper\.?/, layer: 'utility' }
    ];

    // Check file path
    for (const rule of rules) {
      if (typeof rule.pattern === 'string') {
        if (filePath.includes(rule.pattern)) {
          return rule.layer;
        }
      } else {
        if (rule.pattern.test(filePath)) {
          return rule.layer;
        }
      }
    }

    // Check node name for types
    if (node.type === 'function') {
      if (name.startsWith('handle') || name.startsWith('on')) {
        return 'api';
      }
      if (name.startsWith('get') || name.startsWith('fetch') || name.startsWith('load')) {
        return 'data';
      }
      if (name.startsWith('create') || name.startsWith('update') || name.startsWith('delete')) {
        return 'service';
      }
    }

    if (node.type === 'class') {
      if (name.includes('Controller') || name.includes('Route')) {
        return 'api';
      }
      if (name.includes('Service')) {
        return 'service';
      }
      if (name.includes('Repository') || name.includes('Dao')) {
        return 'data';
      }
      if (name.includes('Component') || name.includes('View')) {
        return 'ui';
      }
    }

    return 'unknown';
  }

  private identifyLayers(graph: KnowledgeGraph): LayerInfo[] {
    const layerMap = new Map<LayerType, Set<string>>();

    graph.nodes.forEach((node, id) => {
      if (node.layer) {
        if (!layerMap.has(node.layer)) {
          layerMap.set(node.layer, new Set());
        }
        layerMap.get(node.layer)!.add(id);
      }
    });

    return Array.from(layerMap.entries()).map(([name, nodes]) => {
      const nodeIds = Array.from(nodes);
      const edgeCount = this.countEdgesBetweenNodes(graph, nodeIds);
      const avgComplexity = this.calculateAvgComplexity(graph, nodeIds);
      const coupling = this.calculateCoupling(graph, nodeIds);

      return {
        name,
        nodes: nodeIds,
        description: this.getLayerDescription(name),
        health: this.assessLayerHealth(avgComplexity, coupling),
        metrics: {
          nodeCount: nodeIds.length,
          edgeCount,
          avgComplexity,
          coupling
        }
      };
    });
  }

  private detectPatterns(graph: KnowledgeGraph): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Detect MVC pattern
    const hasControllers = this.hasNodesWithTypeAndLayer(graph, 'class', 'api');
    const hasModels = this.hasNodesWithTypeAndLayer(graph, 'class', 'data');
    const hasViews = this.hasNodesWithLayer(graph, 'ui');
    
    if (hasControllers && hasModels && hasViews) {
      patterns.push({
        name: 'MVC (Model-View-Controller)',
        confidence: 0.8,
        description: 'Classic MVC pattern with separate controller, model, and view layers',
        detectedIn: ['api', 'data', 'ui']
      });
    }

    // Detect Service Layer pattern
    const hasServices = this.hasNodesWithLayer(graph, 'service');
    const hasDAOs = this.hasNodesWithLayer(graph, 'data');
    
    if (hasServices && hasDAOs) {
      patterns.push({
        name: 'Service-Repository Pattern',
        confidence: 0.85,
        description: 'Business logic in services, data access in repositories',
        detectedIn: ['service', 'data']
      });
    }

    // Detect Layered Architecture
    const layers = this.getDistinctLayers(graph);
    if (layers.length >= 3) {
      patterns.push({
        name: 'Layered Architecture',
        confidence: 0.7 + (layers.length * 0.05),
        description: `Clear separation with ${layers.length} distinct layers`,
        detectedIn: layers
      });
    }

    // Detect Microservices hints
    const hasApiRoutes = this.countNodesWithLayer(graph, 'api');
    if (hasApiRoutes >= 5) {
      patterns.push({
        name: 'API-First Design',
        confidence: 0.6,
        description: 'Multiple API endpoints suggest service-oriented approach',
        detectedIn: ['api']
      });
    }

    return patterns;
  }

  private analyzeDependencies(
    graph: KnowledgeGraph,
    layers: LayerInfo[]
  ): DependencyGraph {
    const layerDependencies: Partial<Record<LayerType, LayerType[]>> = {};
    const allLayerTypes: LayerType[] = ['api', 'service', 'data', 'ui', 'utility', 'config', 'test', 'unknown'];

    // Initialize
    allLayerTypes.forEach(l => {
      layerDependencies[l] = [];
    });

    // Analyze edges between layers
    graph.edges.forEach(edge => {
      const sourceNode = graph.nodes.get(edge.source);
      const targetNode = graph.nodes.get(edge.target);

      if (sourceNode?.layer && targetNode?.layer) {
        const sourceLayer = sourceNode.layer;
        const targetLayer = targetNode.layer;

        if (sourceLayer !== targetLayer) {
          if (!layerDependencies[sourceLayer]!.includes(targetLayer)) {
            layerDependencies[sourceLayer]!.push(targetLayer);
          }
        }
      }
    });

    // Detect circular dependencies
    const circularDeps = this.detectCircularDependencies(layerDependencies as Record<LayerType, LayerType[]>);

    // Find violating dependencies (layer depends on layer above it)
    const violatingLayers: string[] = [];
    const idealOrder: LayerType[] = ['api', 'service', 'data', 'utility'];

    for (const [layer, deps] of Object.entries(layerDependencies)) {
      const layerIndex = idealOrder.indexOf(layer as LayerType);
      for (const dep of (deps || [])) {
        const depIndex = idealOrder.indexOf(dep);
        if (depIndex > layerIndex && layerIndex !== -1 && depIndex !== -1) {
          violatingLayers.push(`${layer} -> ${dep}`);
        }
      }
    }

    return {
      layerDependencies: layerDependencies as Record<LayerType, LayerType[]>,
      circularDependencies: circularDeps,
      violatingLayers
    };
  }

  private detectCircularDependencies(deps: Record<LayerType, LayerType[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<LayerType>();
    const recursionStack = new Set<LayerType>();

    const dfs = (node: LayerType, path: LayerType[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const neighbor of deps[node] || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, path);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of Object.keys(deps) as LayerType[]) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  private generateRecommendations(
    layers: LayerInfo[],
    dependencies: DependencyGraph,
    patterns: ArchitecturalPattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing layers
    const hasLayer = (name: LayerType) => layers.some(l => l.name === name);
    
    if (!hasLayer('service') && hasLayer('api') && hasLayer('data')) {
      recommendations.push('Consider adding a service layer to separate business logic from API handlers');
    }

    // Check for circular dependencies
    if (dependencies.circularDependencies.length > 0) {
      recommendations.push(`Warning: ${dependencies.circularDependencies.length} circular dependency detected - refactor to break cycles`);
    }

    // Check for layer violations
    if (dependencies.violatingLayers.length > 0) {
      recommendations.push('Dependency violations detected - UI layer should not depend on utility-only modules');
    }

    // Check layer health
    layers.forEach(layer => {
      if (layer.health === 'critical') {
        recommendations.push(`Layer "${layer.name}" has critical complexity issues - consider refactoring`);
      }
      if (layer.metrics.coupling > 0.8) {
        recommendations.push(`Layer "${layer.name}" has high coupling (${(layer.metrics.coupling * 100).toFixed(0)}%) - reduce dependencies`);
      }
    });

    // General recommendations based on patterns
    patterns.forEach(pattern => {
      if (pattern.name.includes('Layered') && pattern.confidence < 0.7) {
        recommendations.push('Consider enforcing stricter layer boundaries');
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Architecture looks well-structured - maintain current patterns');
    }

    return recommendations;
  }

  // Helper methods
  private hasNodesWithTypeAndLayer(graph: KnowledgeGraph, type: string, layer: LayerType): boolean {
    return Array.from(graph.nodes.values()).some(n => n.type === type && n.layer === layer);
  }

  private hasNodesWithLayer(graph: KnowledgeGraph, layer: LayerType): boolean {
    return Array.from(graph.nodes.values()).some(n => n.layer === layer);
  }

  private countNodesWithLayer(graph: KnowledgeGraph, layer: LayerType): number {
    return Array.from(graph.nodes.values()).filter(n => n.layer === layer).length;
  }

  private getDistinctLayers(graph: KnowledgeGraph): LayerType[] {
    const layers = new Set<LayerType>();
    graph.nodes.forEach(n => {
      if (n.layer) layers.add(n.layer);
    });
    return Array.from(layers);
  }

  private countEdgesBetweenNodes(graph: KnowledgeGraph, nodeIds: string[]): number {
    const nodeSet = new Set(nodeIds);
    let count = 0;
    graph.edges.forEach(e => {
      if (nodeSet.has(e.source) && nodeSet.has(e.target)) {
        count++;
      }
    });
    return count;
  }

  private calculateAvgComplexity(graph: KnowledgeGraph, nodeIds: string[]): number {
    const nodes = nodeIds.map(id => graph.nodes.get(id)).filter(Boolean);
    if (nodes.length === 0) return 0;
    const total = nodes.reduce((sum, n) => sum + (n?.complexity || 1), 0);
    return Math.round((total / nodes.length) * 10) / 10;
  }

  private calculateCoupling(graph: KnowledgeGraph, nodeIds: string[]): number {
    const nodeSet = new Set(nodeIds);
    let internalEdges = 0;
    let externalEdges = 0;

    graph.edges.forEach(e => {
      const sourceInSet = nodeSet.has(e.source);
      const targetInSet = nodeSet.has(e.target);
      if (sourceInSet || targetInSet) {
        if (sourceInSet && targetInSet) {
          internalEdges++;
        } else {
          externalEdges++;
        }
      }
    });

    const total = internalEdges + externalEdges;
    return total > 0 ? Math.round((externalEdges / total) * 100) / 100 : 0;
  }

  private getLayerDescription(layer: LayerType): string {
    const descriptions: Record<LayerType, string> = {
      api: 'API/Controller layer - handles HTTP requests and routing',
      service: 'Service layer - contains business logic',
      data: 'Data layer - manages data access and storage',
      ui: 'UI layer - renders user interface',
      utility: 'Utility layer - provides helper functions',
      config: 'Configuration layer - manages application settings',
      test: 'Test layer - contains test code',
      unknown: 'Uncategorized nodes'
    };
    return descriptions[layer];
  }

  private assessLayerHealth(complexity: number, coupling: number): 'good' | 'warning' | 'critical' {
    if (complexity > 8 || coupling > 0.9) return 'critical';
    if (complexity > 5 || coupling > 0.7) return 'warning';
    return 'good';
  }
}
