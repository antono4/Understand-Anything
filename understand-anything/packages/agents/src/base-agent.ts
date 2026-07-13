// Base Agent Interface
import type { KnowledgeGraph, KGNode, KGEdge, AnalysisConfig, LLMAnalysis, LayerType } from '@understand-anything/core';

export interface AgentContext {
  projectPath: string;
  config: AnalysisConfig;
  graph: KnowledgeGraph;
  llmApiKey?: string;
  llmModel?: string;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export abstract class BaseAgent {
  protected name: string;
  protected description: string;
  protected context: AgentContext | null = null;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  // Initialize agent with context
  initialize(context: AgentContext): void {
    this.context = context;
  }

  // Get agent info
  getInfo(): { name: string; description: string } {
    return {
      name: this.name,
      description: this.description
    };
  }

  // Abstract method - must be implemented by subclasses
  abstract execute(input: unknown): Promise<AgentResult>;
  
  // Common helper methods
  protected log(message: string): void {
    if (this.context?.config.verbose) {
      console.log(`[${this.name}] ${message}`);
    }
  }

  protected async callLLM(prompt: string): Promise<string> {
    // In production, this would call OpenAI/Anthropic API
    // For now, return a placeholder
    this.log(`LLM call: ${prompt.substring(0, 100)}...`);
    return JSON.stringify({
      summary: 'Generated summary',
      layer: 'service',
      tags: ['analyzed']
    });
  }

  protected filterNodesByType(type: KGNode['type']): KGNode[] {
    if (!this.context) return [];
    return Array.from(this.context.graph.nodes.values())
      .filter(n => n.type === type);
  }

  protected filterNodesByLayer(layer: LayerType): KGNode[] {
    if (!this.context) return [];
    return Array.from(this.context.graph.nodes.values())
      .filter(n => n.layer === layer);
  }

  protected getRelatedNodes(nodeId: string): KGNode[] {
    if (!this.context) return [];
    
    const related: KGNode[] = [];
    this.context.graph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        const target = this.context!.graph.nodes.get(edge.target);
        if (target) related.push(target);
      }
      if (edge.target === nodeId) {
        const source = this.context!.graph.nodes.get(edge.source);
        if (source) related.push(source);
      }
    });
    return related;
  }
}

// Agent registry for managing multiple agents
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  register(agent: BaseAgent): void {
    this.agents.set(agent.getInfo().name, agent);
  }

  get(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  list(): { name: string; description: string }[] {
    return this.getAll().map(a => a.getInfo());
  }
}

// Pipeline executor for running agents in sequence
export class PipelineExecutor {
  private agents: BaseAgent[] = [];

  addAgent(agent: BaseAgent): this {
    this.agents.push(agent);
    return this;
  }

  async execute(
    context: AgentContext,
    onProgress?: (agent: string, progress: number) => void
  ): Promise<{ results: AgentResult[]; finalGraph: KnowledgeGraph }> {
    const results: AgentResult[] = [];
    
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      agent.initialize(context);
      
      onProgress?.(agent.getInfo().name, (i / this.agents.length) * 100);
      
      const result = await agent.execute(context.graph);
      results.push(result);
      
      if (result.success && result.data) {
        // Update context with new graph if returned
        if (result.metadata?.graph) {
          context.graph = result.metadata.graph as KnowledgeGraph;
        }
      }
    }
    
    onProgress?.('complete', 100);
    
    return {
      results,
      finalGraph: context.graph
    };
  }
}
