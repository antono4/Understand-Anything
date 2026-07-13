import { glob } from 'glob';
import { readFile, stat } from 'fs/promises';
import { basename, extname, join } from 'path';
import { LANGUAGE_EXTENSIONS, getLanguageFromExtension } from '../languages/parser-factory.js';
import type { Language, KGNode, KGEdge, KnowledgeGraph, AnalysisConfig } from '../types/index.js';

// Generate unique ID
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// Generate node ID
export function generateNodeId(file: string, name: string, type: string): string {
  const normalizedFile = file.replace(/[./\\]/g, '_').replace(/^_|_$/g, '');
  const normalizedName = name.replace(/[./\\]/g, '_');
  return `node_${normalizedFile}_${type}_${normalizedName}`.substring(0, 100);
}

// Generate edge ID
export function generateEdgeId(source: string, target: string, type: string): string {
  return `edge_${source}_${type}_${target}`.substring(0, 100);
}

// File utilities
export async function findFiles(
  projectPath: string,
  includePatterns: string[],
  excludePatterns: string[],
  maxFileSize: number
): Promise<string[]> {
  const files: string[] = [];
  
  for (const pattern of includePatterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: excludePatterns,
      absolute: true,
      nodir: true
    });
    
    for (const file of matches) {
      try {
        const stats = await stat(file);
        if (stats.size <= maxFileSize && stats.isFile()) {
          files.push(file);
        }
      } catch {
        // Skip files we can't stat
      }
    }
  }
  
  return [...new Set(files)];
}

// Read file content
export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Check if file is generated
export function isGeneratedFile(filePath: string): boolean {
  const generatedPatterns = [
    /generated/i,
    /\.d\.ts$/,
    /\.min\./,
    /\.bundle\./,
    /_pb\.go$/,
    /\.g\.py$/,
    /\.(swagger|openapi)\.json$/
  ];
  
  return generatedPatterns.some(pattern => pattern.test(filePath));
}

// Get file language from extension
export function detectLanguage(filePath: string): Language | null {
  return getLanguageFromExtension(filePath);
}

// Get project name from path
export function getProjectName(projectPath: string): string {
  return basename(projectPath).replace(/[._-]*(src|lib|app|packages?)[._-]*/gi, '');
}

// Create empty knowledge graph
export function createEmptyGraph(
  projectPath: string,
  language: Language
): KnowledgeGraph {
  return {
    version: '1.0.0',
    projectPath,
    projectName: getProjectName(projectPath),
    language,
    generatedAt: new Date().toISOString(),
    nodes: new Map(),
    edges: new Map(),
    metadata: {
      totalFiles: 0,
      totalNodes: 0,
      totalEdges: 0,
      languageStats: {} as Record<Language, number>,
      layerStats: {} as Record<KGNode['layer'], number>,
      fileCountByExtension: {}
    }
  };
}

// Deep clone a map
export function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(map);
}

// Serialize graph to JSON-friendly object
export function serializeGraph(graph: KnowledgeGraph): Record<string, unknown> {
  return {
    version: graph.version,
    projectPath: graph.projectPath,
    projectName: graph.projectName,
    language: graph.language,
    generatedAt: graph.generatedAt,
    nodes: Object.fromEntries(graph.nodes),
    edges: Object.fromEntries(graph.edges),
    metadata: graph.metadata
  };
}

// Deserialize JSON to graph
export function deserializeGraph(data: Record<string, unknown>): KnowledgeGraph {
  return {
    version: data.version as string,
    projectPath: data.projectPath as string,
    projectName: data.projectName as string,
    language: data.language as Language,
    generatedAt: data.generatedAt as string,
    nodes: new Map(Object.entries(data.nodes as Record<string, KGNode>)),
    edges: new Map(Object.entries(data.edges as Record<string, KGEdge>)),
    metadata: data.metadata as KnowledgeGraph['metadata']
  };
}

// Calculate complexity score
export function calculateComplexity(node: KGNode): number {
  let complexity = 1;
  
  // Add complexity based on parameters
  if (node.parameters) {
    complexity += node.parameters.length * 0.5;
  }
  
  // Add complexity based on return type (nested generics increase complexity)
  if (node.returnType) {
    complexity += (node.returnType.match(/<|{|\[/g) || []).length * 0.5;
  }
  
  // Add complexity based on decorators/modifiers
  if (node.decorators) {
    complexity += node.decorators.length * 0.3;
  }
  
  return Math.round(complexity * 10) / 10;
}

// Merge graphs
export function mergeGraphs(base: KnowledgeGraph, additional: KnowledgeGraph): KnowledgeGraph {
  const merged = cloneMap(base.nodes);
  
  additional.nodes.forEach((node, id) => {
    if (!merged.has(id)) {
      merged.set(id, node);
    }
  });
  
  const mergedEdges = cloneMap(base.edges);
  
  additional.edges.forEach((edge, id) => {
    if (!mergedEdges.has(id)) {
      mergedEdges.set(id, edge);
    }
  });
  
  return {
    ...base,
    nodes: merged,
    edges: mergedEdges
  };
}

// Filter graph by node IDs
export function filterGraphByNodes(graph: KnowledgeGraph, nodeIds: Set<string>): KnowledgeGraph {
  const filteredNodes = new Map<string, KGNode>();
  const filteredEdges = new Map<string, KGEdge>();
  
  graph.nodes.forEach((node, id) => {
    if (nodeIds.has(id)) {
      filteredNodes.set(id, node);
    }
  });
  
  graph.edges.forEach((edge, id) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      filteredEdges.set(id, edge);
    }
  });
  
  return {
    ...graph,
    nodes: filteredNodes,
    edges: filteredEdges
  };
}

// Get subgraph centered on a node
export function getSubgraph(graph: KnowledgeGraph, centerId: string, depth: number = 2): KnowledgeGraph {
  const includedNodes = new Set<string>([centerId]);
  const frontier = [centerId];
  
  for (let i = 0; i < depth; i++) {
    const nextFrontier: string[] = [];
    
    for (const nodeId of frontier) {
      graph.edges.forEach(edge => {
        if (edge.source === nodeId && !includedNodes.has(edge.target)) {
          includedNodes.add(edge.target);
          nextFrontier.push(edge.target);
        }
        if (edge.target === nodeId && !includedNodes.has(edge.source)) {
          includedNodes.add(edge.source);
          nextFrontier.push(edge.source);
        }
      });
    }
    
    frontier.length = 0;
    frontier.push(...nextFrontier);
  }
  
  return filterGraphByNodes(graph, includedNodes);
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Chunk array for parallel processing
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
