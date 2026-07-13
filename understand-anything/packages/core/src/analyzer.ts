import { init, Parser } from 'web-tree-sitter';
import { readFile } from 'fs/promises';
import {
  AnalysisConfig,
  AnalysisResult,
  KGNode,
  KGEdge,
  KnowledgeGraph,
  Language,
  SourceLocation,
  LayerType,
  ImportInfo,
  AnalysisError,
  AnalysisWarning
} from './types/index.js';
import {
  getLanguageFromExtension,
  getParser,
  ParserContext,
  LANGUAGE_EXTENSIONS
} from './languages/parser-factory.js';
import {
  generateId,
  generateNodeId,
  generateEdgeId,
  findFiles,
  isGeneratedFile,
  createEmptyGraph,
  calculateComplexity,
  chunk,
  formatDuration
} from './utils/index.js';

export class CodeAnalyzer {
  private parser: Parser | null = null;
  private config: AnalysisConfig;
  private graph: KnowledgeGraph;
  private errors: AnalysisError[] = [];
  private warnings: AnalysisWarning[] = [];

  constructor(config: AnalysisConfig) {
    this.config = config;
    this.graph = createEmptyGraph(config.projectPath, 'typescript');
  }

  async initialize(): Promise<void> {
    // Initialize tree-sitter
    await init();
    this.parser = new Parser();
  }

  async analyze(): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    if (!this.parser) {
      await this.initialize();
    }

    try {
      // Find all files
      const files = await this.findFiles();
      
      // Process files in batches
      const batches = chunk(files, this.config.maxConcurrentFiles);
      
      for (const batch of batches) {
        await Promise.all(batch.map(file => this.processFile(file)));
      }

      // Calculate metadata
      this.calculateMetadata();

      return {
        success: true,
        graph: this.graph,
        errors: this.errors,
        warnings: this.warnings,
        stats: {
          duration: Date.now() - startTime,
          filesProcessed: files.length,
          nodesCreated: this.graph.nodes.size,
          edgesCreated: this.graph.edges.size
        }
      };
    } catch (error) {
      this.errors.push({
        file: this.config.projectPath,
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'ANALYSIS_FAILED',
        fatal: true
      });

      return {
        success: false,
        graph: this.graph,
        errors: this.errors,
        warnings: this.warnings,
        stats: {
          duration: Date.now() - startTime,
          filesProcessed: 0,
          nodesCreated: 0,
          edgesCreated: 0
        }
      };
    }
  }

  private async findFiles(): Promise<string[]> {
    const includePatterns = this.config.includePatterns.length > 0 
      ? this.config.includePatterns 
      : ['**/*'];
    
    const extensions = this.config.languages.flatMap(lang => 
      LANGUAGE_EXTENSIONS[lang] || []
    );

    const allFiles = await findFiles(
      this.config.projectPath,
      includePatterns,
      this.config.excludePatterns,
      this.config.maxFileSize
    );

    // Filter by language
    const languageFiltered = allFiles.filter(file => {
      const lang = getLanguageFromExtension(file);
      return lang && this.config.languages.includes(lang);
    });

    // Skip generated files if configured
    const filtered = this.config.skipGenerated
      ? languageFiltered.filter(file => !isGeneratedFile(file))
      : languageFiltered;

    return filtered;
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const language = getLanguageFromExtension(filePath);
      
      if (!language || !this.parser) return;

      // Set language parser
      try {
        const lang = await this.loadLanguage(language);
        this.parser.setLanguage(lang);
      } catch {
        // Language not supported, skip
        this.warnings.push({
          file: filePath,
          message: `Language ${language} parser not available`,
          code: 'LANGUAGE_UNSUPPORTED'
        });
        return;
      }

      // Parse the file
      const tree = this.parser.parse(content);
      
      // Create file node
      const fileNode = this.createFileNode(filePath, content, language);
      this.graph.nodes.set(fileNode.id, fileNode);

      // Get language-specific parser
      const langParser = getParser(language);
      if (!langParser) return;

      const ctx: ParserContext = {
        filePath,
        content,
        tree,
        language
      };

      // Extract code elements
      const result = langParser(ctx);

      // Create nodes for functions
      for (const func of result.functions) {
        const node = this.createFunctionNode(fileNode, func, content, language);
        this.graph.nodes.set(node.id, node);
        
        // Create edges for calls
        for (const call of func.calls) {
          const edge = this.createCallEdge(node.id, call, filePath);
          if (edge) {
            this.graph.edges.set(edge.id, edge);
          }
        }
      }

      // Create nodes for classes
      for (const cls of result.classes) {
        const node = this.createClassNode(fileNode, cls, content, language);
        this.graph.nodes.set(node.id, node);

        // Create contains edge from file
        const containsEdge = this.createContainsEdge(fileNode.id, node.id);
        this.graph.edges.set(containsEdge.id, containsEdge);

        // Create extends edges
        if (cls.extends) {
          const extendsEdge = this.createExtendsEdge(node.id, cls.extends);
          this.graph.edges.set(extendsEdge.id, extendsEdge);
        }

        // Create method nodes
        for (const method of cls.methods) {
          const methodNode = this.createMethodNode(node, method, content, language);
          this.graph.nodes.set(methodNode.id, methodNode);

          // Create edge from class to method
          const methodEdge = this.createContainsEdge(node.id, methodNode.id);
          this.graph.edges.set(methodEdge.id, methodEdge);
        }
      }

      // Create edges for imports
      for (const imp of result.imports) {
        const edge = this.createImportEdge(fileNode.id, imp);
        this.graph.edges.set(edge.id, edge);
      }

      tree.delete();
    } catch (error) {
      this.errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : 'Failed to process file',
        code: 'FILE_PROCESSING_ERROR',
        fatal: false
      });
    }
  }

  private async loadLanguage(language: Language): Promise<any> {
    const langMap: Partial<Record<Language, () => Promise<any>>> = {
      javascript: () => import('tree-sitter-javascript'),
      typescript: () => import('tree-sitter-typescript'),
      python: () => import('tree-sitter-python'),
      go: () => import('tree-sitter-go'),
      rust: () => import('tree-sitter-rust'),
      java: () => import('tree-sitter-java'),
      c: () => import('tree-sitter-c'),
      cpp: () => import('tree-sitter-cpp'),
      csharp: () => import('tree-sitter-c-sharp'),
      php: () => import('tree-sitter-php'),
      ruby: () => import('tree-sitter-ruby'),
      json: () => import('tree-sitter-json'),
      yaml: () => import('tree-sitter-yaml'),
      html: () => import('tree-sitter-html'),
      css: () => import('tree-sitter-css')
    };

    const loader = langMap[language];
    if (!loader) {
      throw new Error(`Language ${language} not supported`);
    }

    const lang = await loader();
    return lang.default;
  }

  private createFileNode(filePath: string, content: string, language: Language): KGNode {
    const lines = content.split('\n').length;
    const size = content.length;
    
    return {
      id: generateNodeId(filePath, 'file', 'file'),
      type: 'file',
      name: filePath.split('/').pop() || 'unknown',
      displayName: filePath.split('/').pop() || 'unknown',
      description: `${lines} lines, ${Math.round(size / 1024)}KB`,
      file: filePath,
      location: {
        start: { line: 1, column: 0 },
        end: { line: lines, column: 0 },
        file: filePath
      },
      language,
      tags: [language, 'source'],
      metadata: {
        lines,
        size,
        path: filePath
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private createFunctionNode(
    fileNode: KGNode,
    func: { name: string; location: SourceLocation; parameters: any[]; returnType?: string; isAsync: boolean; isGenerator: boolean },
    content: string,
    language: Language
  ): KGNode {
    const id = generateNodeId(fileNode.file, func.name, 'function');
    const signature = this.buildSignature(func.name, func.parameters, func.returnType, func.isAsync);
    
    return {
      id,
      type: 'function',
      name: func.name,
      displayName: func.name,
      description: func.isAsync ? `Async function ${func.name}` : `Function ${func.name}`,
      file: fileNode.file,
      location: { ...func.location, file: fileNode.file },
      language,
      tags: ['function', func.isAsync ? 'async' : 'sync'],
      signature,
      parameters: func.parameters,
      returnType: func.returnType,
      complexity: this.calculateComplexityFromParams(func.parameters),
      metadata: {
        isAsync: func.isAsync,
        isGenerator: func.isGenerator
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private createClassNode(
    fileNode: KGNode,
    cls: { name: string; location: SourceLocation; methods: any[]; properties: any[]; extends?: string },
    content: string,
    language: Language
  ): KGNode {
    const id = generateNodeId(fileNode.file, cls.name, 'class');
    
    return {
      id,
      type: 'class',
      name: cls.name,
      displayName: cls.name,
      description: `Class ${cls.name}${cls.extends ? ` extends ${cls.extends}` : ''}`,
      file: fileNode.file,
      location: { ...cls.location, file: fileNode.file },
      language,
      tags: ['class'],
      extends: cls.extends ? [cls.extends] : undefined,
      metadata: {
        methodCount: cls.methods.length,
        propertyCount: cls.properties.length
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private createMethodNode(
    classNode: KGNode,
    method: { name: string; location: SourceLocation; parameters: any[]; returnType?: string; isAsync: boolean },
    content: string,
    language: Language
  ): KGNode {
    const id = generateNodeId(classNode.file, `${classNode.name}.${method.name}`, 'method');
    const signature = this.buildSignature(method.name, method.parameters, method.returnType, method.isAsync);
    
    return {
      id,
      type: 'method',
      name: method.name,
      displayName: `${classNode.name}.${method.name}`,
      description: `Method ${method.name}`,
      file: classNode.file,
      location: { ...method.location, file: classNode.file },
      language,
      tags: ['method', method.isAsync ? 'async' : 'sync'],
      signature,
      parameters: method.parameters,
      returnType: method.returnType,
      metadata: {
        class: classNode.name,
        isAsync: method.isAsync
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private buildSignature(
    name: string,
    params: any[],
    returnType?: string,
    isAsync?: boolean
  ): string {
    const prefix = isAsync ? 'async ' : '';
    const paramStr = params.map(p => `${p.name}: ${p.type}`).join(', ');
    const suffix = returnType ? `: ${returnType}` : '';
    return `${prefix}${name}(${paramStr})${suffix}`;
  }

  private calculateComplexityFromParams(params: any[]): number {
    return calculateComplexity({ parameters: params } as KGNode);
  }

  private createCallEdge(sourceId: string, callee: string, filePath: string): KGEdge | null {
    const id = generateEdgeId(sourceId, callee, 'calls');
    return {
      id,
      source: sourceId,
      target: callee, // Target will be resolved later
      type: 'calls',
      weight: 1.0,
      description: `calls ${callee}`,
      metadata: { file: filePath },
      createdAt: new Date().toISOString()
    };
  }

  private createContainsEdge(sourceId: string, targetId: string): KGEdge {
    return {
      id: generateEdgeId(sourceId, targetId, 'contains'),
      source: sourceId,
      target: targetId,
      type: 'contains',
      weight: 1.0,
      description: 'contains',
      metadata: {},
      createdAt: new Date().toISOString()
    };
  }

  private createExtendsEdge(classId: string, parentClass: string): KGEdge {
    return {
      id: generateEdgeId(classId, parentClass, 'extends'),
      source: classId,
      target: parentClass,
      type: 'extends',
      weight: 1.0,
      description: `extends ${parentClass}`,
      metadata: {},
      createdAt: new Date().toISOString()
    };
  }

  private createImportEdge(fileId: string, imp: ImportInfo): KGEdge {
    return {
      id: generateEdgeId(fileId, imp.source, 'imports'),
      source: fileId,
      target: imp.source,
      type: 'imports',
      weight: 0.5,
      description: `imports from ${imp.source}`,
      metadata: { imported: imp.imported },
      createdAt: new Date().toISOString()
    };
  }

  private calculateMetadata(): void {
    const languageStats: Record<string, number> = {};
    const layerStats: Record<string, number> = {};
    const fileCountByExtension: Record<string, number> = {};
    
    this.graph.nodes.forEach(node => {
      // Count by language
      languageStats[node.language] = (languageStats[node.language] || 0) + 1;
      
      // Count by layer
      if (node.layer) {
        layerStats[node.layer] = (layerStats[node.layer] || 0) + 1;
      }
      
      // Count by extension
      const ext = '.' + node.file.split('.').pop();
      fileCountByExtension[ext] = (fileCountByExtension[ext] || 0) + 1;
    });

    // Count files (node type = file)
    const totalFiles = Array.from(this.graph.nodes.values())
      .filter(n => n.type === 'file').length;

    this.graph.metadata = {
      totalFiles,
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      languageStats: languageStats as any,
      layerStats: layerStats as any,
      fileCountByExtension
    };
  }

  // Get current graph
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  // Detect layer based on path and name
  detectLayer(node: KGNode): LayerType {
    const filePath = node.file.toLowerCase();
    const name = node.name.toLowerCase();

    // API/Controller patterns
    if (filePath.includes('api') || filePath.includes('controller') || 
        filePath.includes('route') || filePath.includes('endpoint')) {
      return 'api';
    }
    
    // Service patterns
    if (filePath.includes('service') || filePath.includes('business')) {
      return 'service';
    }
    
    // Data patterns
    if (filePath.includes('repository') || filePath.includes('dao') ||
        filePath.includes('model') || filePath.includes('entity') ||
        filePath.includes('db')) {
      return 'data';
    }
    
    // UI patterns
    if (filePath.includes('ui') || filePath.includes('component') ||
        filePath.includes('view') || filePath.includes('page')) {
      return 'ui';
    }
    
    // Config patterns
    if (filePath.includes('config') || filePath.includes('.env') ||
        name.includes('config') || name.includes('settings')) {
      return 'config';
    }
    
    // Test patterns
    if (filePath.includes('test') || filePath.includes('spec') ||
        filePath.includes('__tests__')) {
      return 'test';
    }
    
    // Utility patterns
    if (filePath.includes('util') || filePath.includes('helper') ||
        filePath.includes('lib')) {
      return 'utility';
    }

    return 'unknown';
  }
}

// Factory function
export function createAnalyzer(config: AnalysisConfig): CodeAnalyzer {
  return new CodeAnalyzer(config);
}
