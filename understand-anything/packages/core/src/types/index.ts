// Core type definitions for Understand-Anything

export type Language = 
  | 'javascript' | 'typescript' | 'python' | 'go' | 'rust'
  | 'java' | 'c' | 'cpp' | 'csharp' | 'php' | 'ruby'
  | 'json' | 'yaml' | 'markdown' | 'html' | 'css';

export type LayerType = 
  | 'api'        // API/Controller layer
  | 'service'    // Business logic layer
  | 'data'       // Data access layer
  | 'ui'         // User interface layer
  | 'utility'    // Utilities/helpers
  | 'config'     // Configuration
  | 'test'       // Tests
  | 'unknown';   // Uncategorized

export type NodeType = 
  | 'file'
  | 'function'
  | 'class'
  | 'interface'
  | 'method'
  | 'module'
  | 'constant'
  | 'type'
  | 'variable';

export type Accessibility = 'public' | 'private' | 'protected' | 'internal';

// Position in source code
export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
  file: string;
}

// Knowledge Graph Node
export interface KGNode {
  id: string;
  type: NodeType;
  name: string;
  displayName: string;
  description: string;
  file: string;
  location: SourceLocation;
  layer?: LayerType;
  language: Language;
  accessibility?: Accessibility;
  tags: string[];
  signature?: string;
  decorators?: string[];
  modifiers?: string[];
  complexity?: number;
  parameters?: Parameter[];
  returnType?: string;
  extends?: string[];
  implements?: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Knowledge Graph Edge
export interface KGEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type EdgeType = 
  | 'imports'
  | 'exports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'uses'
  | 'contains'
  | 'depends-on'
  | 'type-annotation';

// Parameter definition
export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

// Import/Export information
export interface ImportInfo {
  source: string;
  imported: string[];
  alias: Record<string, string>;
  isDefault: boolean;
  isDynamic: boolean;
}

// Call graph information
export interface CallInfo {
  caller: string;
  callee: string;
  line: number;
}

// Function/Method definition
export interface FunctionDef {
  name: string;
  location: SourceLocation;
  parameters: Parameter[];
  returnType?: string;
  isAsync: boolean;
  isGenerator: boolean;
  calls: string[];
}

// Class definition
export interface ClassDef {
  name: string;
  location: SourceLocation;
  methods: FunctionDef[];
  properties: PropertyDef[];
  extends?: string;
  implements?: string[];
}

// Property definition
export interface PropertyDef {
  name: string;
  type?: string;
  accessibility: Accessibility;
  isStatic: boolean;
  initializer?: string;
}

// Full Knowledge Graph
export interface KnowledgeGraph {
  version: string;
  projectPath: string;
  projectName: string;
  language: Language;
  generatedAt: string;
  nodes: Map<string, KGNode>;
  edges: Map<string, KGEdge>;
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  totalFiles: number;
  totalNodes: number;
  totalEdges: number;
  languageStats: Record<Language, number>;
  layerStats: Record<LayerType, number>;
  fileCountByExtension: Record<string, number>;
}

// Project analysis configuration
export interface AnalysisConfig {
  projectPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  maxConcurrentFiles: number;
  languages: Language[];
  skipGenerated: boolean;
  useIncremental: boolean;
  baseGraph?: KnowledgeGraph;
  llmApiKey?: string;
  llmModel?: string;
  verbose: boolean;
}

// Analysis result
export interface AnalysisResult {
  success: boolean;
  graph: KnowledgeGraph;
  errors: AnalysisError[];
  warnings: AnalysisWarning[];
  stats: {
    duration: number;
    filesProcessed: number;
    nodesCreated: number;
    edgesCreated: number;
  };
}

export interface AnalysisError {
  file: string;
  message: string;
  code: string;
  fatal: boolean;
}

export interface AnalysisWarning {
  file: string;
  message: string;
  code: string;
}

// Search result
export interface SearchResult {
  node: KGNode;
  score: number;
  matches: SearchMatch[];
  context: string;
}

export interface SearchMatch {
  field: string;
  value: string;
  indices: [number, number][];
}

// LLM Analysis result
export interface LLMAnalysis {
  nodeId: string;
  summary: string;
  layer: LayerType;
  tags: string[];
  relationships: {
    type: EdgeType;
    targetId: string;
    description: string;
  }[];
  confidence: number;
}

// Domain analysis
export interface DomainAnalysis {
  domainName: string;
  nodes: string[];
  description: string;
  subdomains: DomainAnalysis[];
}

// Tour for guided exploration
export interface Tour {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
  targetAudience?: string;
  estimatedMinutes?: number;
}

export interface TourStep {
  nodeId: string;
  title: string;
  content: string;
  highlightConnections: boolean;
  relatedNodeIds?: string[];
}

// Diff analysis
export interface DiffAnalysis {
  added: DiffItem[];
  removed: DiffItem[];
  modified: DiffItem[];
  impactAssessment: ImpactAssessment;
}

export interface DiffItem {
  type: 'node' | 'edge';
  id: string;
  description: string;
}

export interface ImpactAssessment {
  highImpactNodes: string[];
  mediumImpactNodes: string[];
  affectedTours: string[];
  affectedDomains: string[];
}
