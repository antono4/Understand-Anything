// File Analyzer Agent - Extracts functions, classes, imports
import { readFile } from 'fs/promises';
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import { CodeAnalyzer, createAnalyzer } from '@understand-anything/core';
import type { KGNode, KGEdge, KnowledgeGraph, AnalysisConfig } from '@understand-anything/core';
import { generateNodeId, generateEdgeId } from '@understand-anything/core';

interface FileAnalysis {
  file: string;
  functions: AnalyzedFunction[];
  classes: AnalyzedClass[];
  imports: AnalyzedImport[];
  exports: string[];
}

interface AnalyzedFunction {
  name: string;
  line: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  calls: string[];
}

interface AnalyzedClass {
  name: string;
  line: number;
  methods: AnalyzedFunction[];
  extends?: string;
}

interface AnalyzedImport {
  source: string;
  imported: string[];
  isDefault: boolean;
}

export class FileAnalyzerAgent extends BaseAgent {
  private analyzer: CodeAnalyzer | null = null;

  constructor() {
    super('file-analyzer', 'Extracts functions, classes, and imports from source files');
  }

  async execute(input: unknown): Promise<AgentResult<{ analyses: FileAnalysis[] }>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const targetFiles = input as string[] | undefined;
    const filesToAnalyze = targetFiles || this.getSourceFiles();

    if (filesToAnalyze.length === 0) {
      return {
        success: true,
        data: { analyses: [] },
        warnings: ['No source files found to analyze']
      };
    }

    const analyses: FileAnalysis[] = [];

    // Initialize analyzer
    this.analyzer = createAnalyzer({
      projectPath: this.context.projectPath,
      includePatterns: filesToAnalyze.map(f => `**/${f}`),
      excludePatterns: this.context.config.excludePatterns,
      maxFileSize: this.context.config.maxFileSize,
      maxConcurrentFiles: this.context.config.maxConcurrentFiles,
      languages: this.context.config.languages,
      skipGenerated: this.context.config.skipGenerated,
      useIncremental: false,
      verbose: this.context.config.verbose
    });

    try {
      await this.analyzer.initialize();
      const result = await this.analyzer.analyze();

      // Convert result to FileAnalysis format
      for (const node of result.graph.nodes.values()) {
        if (node.type === 'file') {
          const analysis = await this.analyzeFileNode(node);
          analyses.push(analysis);
        }
      }

      this.log(`Analyzed ${analyses.length} files, created ${result.graph.nodes.size} nodes`);

      return {
        success: true,
        data: { analyses },
        metadata: {
          graph: result.graph,
          filesAnalyzed: analyses.length,
          nodesCreated: result.stats.nodesCreated,
          edgesCreated: result.stats.edgesCreated
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }

  private getSourceFiles(): string[] {
    if (!this.context) return [];

    const sourceFiles: string[] = [];
    this.context.graph.nodes.forEach(node => {
      if (node.type === 'file' && node.tags.includes('source')) {
        sourceFiles.push(node.file);
      }
    });
    return sourceFiles;
  }

  private async analyzeFileNode(fileNode: KGNode): Promise<FileAnalysis> {
    const analysis: FileAnalysis = {
      file: fileNode.file,
      functions: [],
      classes: [],
      imports: [],
      exports: []
    };

    // Find functions and classes in this file
    this.context!.graph.nodes.forEach(node => {
      if (node.file === fileNode.file) {
        if (node.type === 'function') {
          analysis.functions.push({
            name: node.name,
            line: node.location.start.line,
            parameters: node.parameters?.map(p => p.name) || [],
            returnType: node.returnType,
            isAsync: node.metadata?.isAsync as boolean || false,
            calls: this.getFunctionCalls(node.id)
          });
        }
        if (node.type === 'class') {
          const methods = this.context!.graph.nodes
            .values()
            .filter(n => n.type === 'method' && n.metadata?.class === node.name)
            .map(m => ({
              name: m.name,
              line: m.location.start.line,
              parameters: m.parameters?.map(p => p.name) || [],
              returnType: m.returnType,
              isAsync: m.metadata?.isAsync as boolean || false,
              calls: this.getFunctionCalls(m.id)
            }));

          analysis.classes.push({
            name: node.name,
            line: node.location.start.line,
            methods,
            extends: node.extends?.[0]
          });
        }
      }
    });

    // Find imports
    this.context!.graph.edges.forEach(edge => {
      if (edge.source === fileNode.id && edge.type === 'imports') {
        analysis.imports.push({
          source: edge.target,
          imported: edge.metadata.imported as string[] || [],
          isDefault: false
        });
      }
    });

    return analysis;
  }

  private getFunctionCalls(nodeId: string): string[] {
    if (!this.context) return [];

    const calls: string[] = [];
    this.context.graph.edges.forEach(edge => {
      if (edge.source === nodeId && edge.type === 'calls') {
        calls.push(edge.target);
      }
    });
    return calls;
  }

  // Analyze a single file with LLM enhancement
  async analyzeFileWithLLM(filePath: string): Promise<{
    summary: string;
    tags: string[];
    layer: string;
  }> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const fileName = filePath.split('/').pop() || '';

      // In production, this would call the LLM
      const prompt = `
Analyze this file: ${fileName}

Content (first 2000 chars):
${content.substring(0, 2000)}

Provide a JSON response with:
- summary: Brief description of what this file does
- tags: Relevant tags (e.g., api, auth, database, utils)
- layer: Architectural layer (api, service, data, ui, utility)
`;

      const response = await this.callLLM(prompt);
      
      try {
        return JSON.parse(response);
      } catch {
        return {
          summary: `Source file: ${fileName}`,
          tags: ['source'],
          layer: 'unknown'
        };
      }
    } catch {
      return {
        summary: 'Analysis unavailable',
        tags: [],
        layer: 'unknown'
      };
    }
  }
}
