// Graph Reviewer Agent - Validates and improves knowledge graph quality
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import type { KGNode, KGEdge, KnowledgeGraph } from '@understand-anything/core';

interface ReviewResult {
  issues: GraphIssue[];
  suggestions: string[];
  metrics: GraphMetrics;
  score: number;
}

interface GraphIssue {
  type: 'missing-link' | 'orphan-node' | 'duplicate' | 'inconsistent' | 'incomplete';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedNodes: string[];
  recommendation: string;
}

interface GraphMetrics {
  density: number;
  completeness: number;
  consistency: number;
  connectivity: number;
}

export class GraphReviewerAgent extends BaseAgent {
  constructor() {
    super('graph-reviewer', 'Validates graph completeness and suggests improvements');
  }

  async execute(input: unknown): Promise<AgentResult<ReviewResult>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const graph = this.context.graph;

    try {
      const issues: GraphIssue[] = [];
      
      // Check for orphan nodes
      issues.push(...this.findOrphanNodes(graph));
      
      // Check for missing links
      issues.push(...this.findMissingLinks(graph));
      
      // Check for duplicates
      issues.push(...this.findDuplicates(graph));
      
      // Check consistency
      issues.push(...this.checkConsistency(graph));
      
      // Calculate metrics
      const metrics = this.calculateMetrics(graph);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(issues, metrics);
      
      // Calculate overall score
      const score = this.calculateScore(metrics, issues);

      this.log(`Found ${issues.length} issues, score: ${score}/100`);

      return {
        success: true,
        data: { issues, suggestions, metrics, score },
        metadata: { graph }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Review failed'
      };
    }
  }

  private findOrphanNodes(graph: KnowledgeGraph): GraphIssue[] {
    const issues: GraphIssue[] = [];
    const connectedNodes = new Set<string>();

    graph.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    graph.nodes.forEach((node, id) => {
      if (!connectedNodes.has(id)) {
        issues.push({
          type: 'orphan-node',
          severity: node.type === 'file' ? 'low' : 'medium',
          description: `Node "${node.name}" has no connections to other nodes`,
          affectedNodes: [id],
          recommendation: 'Connect this node to related nodes or add relevant edges'
        });
      }
    });

    return issues;
  }

  private findMissingLinks(graph: KnowledgeGraph): GraphIssue[] {
    const issues: GraphIssue[] = [];

    // Check if imported modules have corresponding nodes
    graph.edges.forEach(edge => {
      if (edge.type === 'imports') {
        const importedExists = graph.nodes.has(edge.target);
        if (!importedExists) {
          issues.push({
            type: 'missing-link',
            severity: 'low',
            description: `Import target "${edge.target}" not found in graph`,
            affectedNodes: [edge.source],
            recommendation: 'Ensure imported modules are part of the analyzed codebase'
          });
        }
      }
    });

    // Check function calls resolve to actual functions
    graph.edges.forEach(edge => {
      if (edge.type === 'calls') {
        // Target might be a simple name that should be resolved
        // This is informational only
      }
    });

    return issues;
  }

  private findDuplicates(graph: KnowledgeGraph): GraphIssue[] {
    const issues: GraphIssue[] = [];
    const nodeNames = new Map<string, string[]>();

    graph.nodes.forEach((node, id) => {
      const key = `${node.type}:${node.name}`;
      if (!nodeNames.has(key)) {
        nodeNames.set(key, []);
      }
      nodeNames.get(key)!.push(id);
    });

    nodeNames.forEach((ids, key) => {
      if (ids.length > 1) {
        const firstNode = graph.nodes.get(ids[0]);
        issues.push({
          type: 'duplicate',
          severity: 'low',
          description: `Multiple nodes with same name and type: ${key}`,
          affectedNodes: ids,
          recommendation: 'Consider consolidating or renaming duplicate definitions'
        });
      }
    });

    return issues;
  }

  private checkConsistency(graph: KnowledgeGraph): GraphIssue[] {
    const issues: GraphIssue[] = [];

    graph.nodes.forEach((node, id) => {
      // Check for nodes without descriptions
      if (!node.description || node.description.length < 5) {
        issues.push({
          type: 'incomplete',
          severity: 'low',
          description: `Node "${node.name}" has no or minimal description`,
          affectedNodes: [id],
          recommendation: 'Add a description to improve understanding'
        });
      }

      // Check for functions without return types
      if (node.type === 'function' && !node.returnType && !node.name.startsWith('set')) {
        // Async functions should have return types
        const isAsync = node.metadata?.isAsync;
        if (isAsync) {
          issues.push({
            type: 'inconsistent',
            severity: 'low',
            description: `Async function "${node.name}" missing return type`,
            affectedNodes: [id],
            recommendation: 'Add explicit return type annotation'
          });
        }
      }

      // Check for uncategorized nodes
      if (node.type !== 'file' && !node.layer) {
        issues.push({
          type: 'incomplete',
          severity: 'medium',
          description: `Node "${node.name}" has no layer classification`,
          affectedNodes: [id],
          recommendation: 'Classify this node into an architectural layer'
        });
      }
    });

    return issues;
  }

  private calculateMetrics(graph: KnowledgeGraph): GraphMetrics {
    const totalNodes = graph.nodes.size;
    const totalEdges = graph.edges.size;

    // Density: ratio of actual edges to possible edges
    const possibleEdges = totalNodes * (totalNodes - 1);
    const density = possibleEdges > 0 ? totalEdges / possibleEdges : 0;

    // Completeness: percentage of nodes with descriptions and layer
    let complete = 0;
    graph.nodes.forEach(node => {
      if (node.description && node.description.length > 5 && node.layer) {
        complete++;
      }
    });
    const completeness = totalNodes > 0 ? complete / totalNodes : 0;

    // Consistency: how well nodes follow patterns
    let consistent = 0;
    graph.nodes.forEach(node => {
      if (node.type === 'function' || node.type === 'method') {
        if (node.returnType || node.name.startsWith('set')) {
          consistent++;
        }
      } else {
        consistent++;
      }
    });
    const consistency = totalNodes > 0 ? consistent / totalNodes : 0;

    // Connectivity: percentage of nodes with at least one edge
    const connectedNodes = new Set<string>();
    graph.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    const connectivity = totalNodes > 0 ? connectedNodes.size / totalNodes : 0;

    return {
      density: Math.round(density * 1000) / 1000,
      completeness: Math.round(completeness * 1000) / 1000,
      consistency: Math.round(consistency * 1000) / 1000,
      connectivity: Math.round(connectivity * 1000) / 1000
    };
  }

  private generateSuggestions(issues: GraphIssue[], metrics: GraphMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.connectivity < 0.8) {
      suggestions.push('Consider adding more connections between nodes to improve graph navigation');
    }

    if (metrics.completeness < 0.7) {
      suggestions.push('Add descriptions and layer classifications to more nodes');
    }

    if (metrics.density < 0.01) {
      suggestions.push('Graph is sparse - consider analyzing more files or adding relationship detection');
    }

    const highSeverity = issues.filter(i => i.severity === 'high');
    if (highSeverity.length > 0) {
      suggestions.push(`Address ${highSeverity.length} high-severity issues first`);
    }

    const orphanNodes = issues.filter(i => i.type === 'orphan-node');
    if (orphanNodes.length > totalNodes * 0.1) {
      suggestions.push('Too many orphan nodes - consider restructuring the codebase analysis');
    }

    if (suggestions.length === 0) {
      suggestions.push('Graph quality is good - maintain current analysis patterns');
    }

    return suggestions;
  }

  private calculateScore(metrics: GraphMetrics, issues: GraphIssue[]): number {
    let score = 100;

    // Deduct for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 1; break;
      }
    });

    // Weight by metrics
    score = score * metrics.connectivity;
    score = score * (0.5 + metrics.completeness * 0.5);

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

const totalNodes = 0; // Will be set in context
