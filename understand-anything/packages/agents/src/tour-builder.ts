// Tour Builder Agent - Generates guided tours for codebase exploration
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import type { KGNode, KnowledgeGraph, Tour, TourStep } from '@understand-anything/core';
import { generateId } from '@understand-anything/core';

interface TourConfig {
  audience?: 'new-developer' | 'senior' | 'domain-expert';
  focus?: 'architecture' | 'api' | 'data-flow' | 'testing';
  maxSteps?: number;
  estimatedMinutes?: number;
}

export class TourBuilderAgent extends BaseAgent {
  constructor() {
    super('tour-builder', 'Generates guided tours for understanding codebase architecture');
  }

  async execute(input: unknown): Promise<AgentResult<{ tours: Tour[] }>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const config = (input as TourConfig) || {};
    const graph = this.context.graph;

    try {
      const tours: Tour[] = [];

      // Generate different tour types
      tours.push(this.buildArchitectureTour(graph, config));
      tours.push(this.buildAPITour(graph, config));
      tours.push(this.buildDataFlowTour(graph, config));
      
      if (config.audience === 'new-developer') {
        tours.push(this.buildOnboardingTour(graph, config));
      }
      
      if (config.audience === 'domain-expert') {
        tours.push(this.buildBusinessLogicTour(graph, config));
      }

      this.log(`Generated ${tours.length} tours`);

      return {
        success: true,
        data: { tours },
        metadata: { graph }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tour generation failed'
      };
    }
  }

  private buildArchitectureTour(graph: KnowledgeGraph, config: TourConfig): Tour {
    const maxSteps = config.maxSteps || 5;
    const layers = this.getLayersInOrder(graph);
    const steps: TourStep[] = [];

    for (const layer of layers.slice(0, maxSteps)) {
      const layerNodes = this.getNodesByLayer(graph, layer);
      if (layerNodes.length === 0) continue;

      const entryPoint = this.selectEntryPoint(layerNodes);
      if (!entryPoint) continue;

      steps.push({
        nodeId: entryPoint.id,
        title: this.getLayerTitle(layer),
        content: this.generateLayerDescription(layer, layerNodes),
        highlightConnections: true,
        relatedNodeIds: this.getRelatedNodeIds(graph, entryPoint.id)
      });
    }

    return {
      id: generateId('tour'),
      title: 'Architecture Overview',
      description: 'A guided tour through the codebase architecture layers',
      steps,
      targetAudience: 'all',
      estimatedMinutes: Math.ceil(steps.length * 3)
    };
  }

  private buildAPITour(graph: KnowledgeGraph, config: TourConfig): Tour {
    const apiNodes = this.getNodesByLayer(graph, 'api');
    const maxSteps = config.maxSteps || 6;
    const steps: TourStep[] = [];

    // Start with main entry points
    const entryPoints = apiNodes.filter(n => 
      n.name.includes('index') || n.name.includes('main') || n.name.includes('app')
    );
    
    if (entryPoints.length > 0) {
      steps.push({
        nodeId: entryPoints[0].id,
        title: 'API Entry Point',
        content: `This is the main entry point for the API layer. It handles ${entryPoints[0].description}`,
        highlightConnections: true,
        relatedNodeIds: this.getRelatedNodeIds(graph, entryPoints[0].id)
      });
    }

    // Add route handlers
    const routes = apiNodes
      .filter(n => n.type === 'function' || n.type === 'method')
      .slice(0, maxSteps - steps.length);

    for (const route of routes) {
      steps.push({
        nodeId: route.id,
        title: `Route: ${route.name}`,
        content: this.generateFunctionDescription(route),
        highlightConnections: true,
        relatedNodeIds: this.getRelatedNodeIds(graph, route.id)
      });
    }

    return {
      id: generateId('tour'),
      title: 'API Layer Deep Dive',
      description: 'Explore the API endpoints and request handlers',
      steps,
      targetAudience: 'backend-developers',
      estimatedMinutes: Math.ceil(steps.length * 2)
    };
  }

  private buildDataFlowTour(graph: KnowledgeGraph, config: TourConfig): Tour {
    const steps: TourStep[] = [];
    const maxSteps = config.maxSteps || 5;

    // Find data flow: UI -> Service -> Data
    const uiNodes = this.getNodesByLayer(graph, 'ui').slice(0, 2);
    const serviceNodes = this.getNodesByLayer(graph, 'service').slice(0, 2);
    const dataNodes = this.getNodesByLayer(graph, 'data').slice(0, 2);

    for (const node of [...uiNodes, ...serviceNodes, ...dataNodes].slice(0, maxSteps)) {
      steps.push({
        nodeId: node.id,
        title: node.name,
        content: this.describeDataFlow(node),
        highlightConnections: true,
        relatedNodeIds: this.getRelatedNodeIds(graph, node.id)
      });
    }

    return {
      id: generateId('tour'),
      title: 'Data Flow Journey',
      description: 'Follow how data moves through the application layers',
      steps,
      targetAudience: 'all',
      estimatedMinutes: Math.ceil(steps.length * 4)
    };
  }

  private buildOnboardingTour(graph: KnowledgeGraph, config: TourConfig): Tour {
    const steps: TourStep[] = [];

    // Entry point
    const entryPoints = graph.nodes.values();
    const firstNode = entryPoints.next().value;
    
    if (firstNode) {
      steps.push({
        nodeId: firstNode.id,
        title: 'Getting Started',
        content: `Welcome! Let's explore the ${graph.projectName} codebase. Start by understanding the project structure.`,
        highlightConnections: false,
        relatedNodeIds: []
      });
    }

    // Key files
    const keyFiles = this.findKeyFiles(graph);
    for (const file of keyFiles.slice(0, 3)) {
      steps.push({
        nodeId: file.id,
        title: `Key File: ${file.name}`,
        content: file.description,
        highlightConnections: false,
        relatedNodeIds: []
      });
    }

    // Architecture overview
    steps.push({
      nodeId: '',
      title: 'Architecture Overview',
      content: this.generateArchitectureOverview(graph),
      highlightConnections: false,
      relatedNodeIds: []
    });

    return {
      id: generateId('tour'),
      title: 'Developer Onboarding',
      description: 'Your first journey through the codebase',
      steps,
      targetAudience: 'new-developer',
      estimatedMinutes: 15
    };
  }

  private buildBusinessLogicTour(graph: KnowledgeGraph, config: TourConfig): Tour {
    const steps: TourStep[] = [];
    const serviceNodes = this.getNodesByLayer(graph, 'service');

    for (const node of serviceNodes.slice(0, config.maxSteps || 5)) {
      steps.push({
        nodeId: node.id,
        title: node.name,
        content: `Business logic: ${node.description}`,
        highlightConnections: true,
        relatedNodeIds: this.getRelatedNodeIds(graph, node.id)
      });
    }

    return {
      id: generateId('tour'),
      title: 'Business Logic Deep Dive',
      description: 'Understand the core business rules and logic',
      steps,
      targetAudience: 'domain-expert',
      estimatedMinutes: Math.ceil(steps.length * 5)
    };
  }

  // Helper methods
  private getLayersInOrder(graph: KnowledgeGraph): string[] {
    const layerOrder = ['api', 'service', 'data', 'ui', 'utility'];
    const presentLayers = new Set<string>();
    
    graph.nodes.forEach(node => {
      if (node.layer) presentLayers.add(node.layer);
    });

    return layerOrder.filter(l => presentLayers.has(l as any));
  }

  private getNodesByLayer(graph: KnowledgeGraph, layer: string): KGNode[] {
    return Array.from(graph.nodes.values()).filter(n => n.layer === layer);
  }

  private selectEntryPoint(nodes: KGNode[]): KGNode | null {
    if (nodes.length === 0) return null;
    
    // Prefer files over functions
    const files = nodes.filter(n => n.type === 'file');
    if (files.length > 0) return files[0];

    // Then prefer named exports
    const exports = nodes.filter(n => n.name.includes('index') || n.name.includes('main'));
    if (exports.length > 0) return exports[0];

    return nodes[0];
  }

  private getLayerTitle(layer: string): string {
    const titles: Record<string, string> = {
      api: 'API Layer',
      service: 'Service Layer',
      data: 'Data Layer',
      ui: 'UI Layer',
      utility: 'Utilities',
      config: 'Configuration',
      test: 'Tests'
    };
    return titles[layer] || layer;
  }

  private generateLayerDescription(layer: string, nodes: KGNode[]): string {
    const nodeTypes = new Set(nodes.map(n => n.type));
    const descriptions: Record<string, string> = {
      api: `This layer handles ${nodeTypes.has('function') ? 'request handlers' : 'API endpoints'} and routes.`,
      service: 'Business logic lives here. These components process data and enforce rules.',
      data: 'Data access layer. Handles database operations and data persistence.',
      ui: 'User interface components. Renders the application's visual layer.',
      utility: 'Helper functions and shared utilities used across the codebase.'
    };
    return descriptions[layer] || `${nodes.length} components in the ${layer} layer.`;
  }

  private generateFunctionDescription(node: KGNode): string {
    let desc = node.description;
    
    if (node.parameters && node.parameters.length > 0) {
      const params = node.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
      desc += `\nParameters: ${params}`;
    }
    
    if (node.returnType) {
      desc += `\nReturns: ${node.returnType}`;
    }

    return desc;
  }

  private describeDataFlow(node: KGNode): string {
    const related = this.getRelatedNodeIds(this.context!.graph, node.id);
    if (related.length > 0) {
      return `${node.description} - connects to ${related.length} related components`;
    }
    return node.description;
  }

  private getRelatedNodeIds(graph: KnowledgeGraph, nodeId: string): string[] {
    const related: string[] = [];
    graph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        related.push(edge.target);
      }
      if (edge.target === nodeId) {
        related.push(edge.source);
      }
    });
    return related.slice(0, 5);
  }

  private findKeyFiles(graph: KnowledgeGraph): KGNode[] {
    const files = Array.from(graph.nodes.values()).filter(n => n.type === 'file');
    
    // Prioritize files by name
    return files.sort((a, b) => {
      const priority = ['index', 'main', 'app', 'config', 'package'];
      const aScore = priority.findIndex(p => a.name.includes(p));
      const bScore = priority.findIndex(p => b.name.includes(p));
      return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
    });
  }

  private generateArchitectureOverview(graph: KnowledgeGraph): string {
    const layers = this.getLayersInOrder(graph);
    const layerCounts = layers.map(l => {
      const count = this.getNodesByLayer(graph, l).length;
      return `${this.getLayerTitle(l)}: ${count} nodes`;
    });
    
    return `The codebase has ${layers.length} distinct layers:\n${layerCounts.join('\n')}`;
  }
}
