import { z } from 'zod';

// Language enum
export const LanguageSchema = z.enum([
  'javascript', 'typescript', 'python', 'go', 'rust',
  'java', 'c', 'cpp', 'csharp', 'php', 'ruby',
  'json', 'yaml', 'markdown', 'html', 'css'
]);

// Layer type enum
export const LayerTypeSchema = z.enum([
  'api', 'service', 'data', 'ui', 'utility', 'config', 'test', 'unknown'
]);

// Node type enum
export const NodeTypeSchema = z.enum([
  'file', 'function', 'class', 'interface', 'method',
  'module', 'constant', 'type', 'variable'
]);

// Edge type enum
export const EdgeTypeSchema = z.enum([
  'imports', 'exports', 'calls', 'extends', 'implements',
  'uses', 'contains', 'depends-on', 'type-annotation'
]);

// Accessibility enum
export const AccessibilitySchema = z.enum(['public', 'private', 'protected', 'internal']);

// Position schema
export const PositionSchema = z.object({
  line: z.number().min(1),
  column: z.number().min(0)
});

// Source location schema
export const SourceLocationSchema = z.object({
  start: PositionSchema,
  end: PositionSchema,
  file: z.string()
});

// Parameter schema
export const ParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  optional: z.boolean(),
  defaultValue: z.string().optional()
});

// KGNode schema
export const KGNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  file: z.string(),
  location: SourceLocationSchema,
  layer: LayerTypeSchema.optional(),
  language: LanguageSchema,
  accessibility: AccessibilitySchema.optional(),
  tags: z.array(z.string()),
  signature: z.string().optional(),
  decorators: z.array(z.string()).optional(),
  modifiers: z.array(z.string()).optional(),
  complexity: z.number().optional(),
  parameters: z.array(ParameterSchema).optional(),
  returnType: z.string().optional(),
  extends: z.array(z.string()).optional(),
  implements: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// KGEdge schema
export const KGEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: EdgeTypeSchema,
  weight: z.number().min(0).max(1),
  description: z.string().optional(),
  metadata: z.record(z.unknown()),
  createdAt: z.string()
});

// Knowledge Graph schema
export const KnowledgeGraphSchema = z.object({
  version: z.string(),
  projectPath: z.string(),
  projectName: z.string(),
  language: LanguageSchema,
  generatedAt: z.string(),
  nodes: z.record(KGNodeSchema),
  edges: z.record(KGEdgeSchema),
  metadata: z.object({
    totalFiles: z.number(),
    totalNodes: z.number(),
    totalEdges: z.number(),
    languageStats: z.record(LanguageSchema, z.number()),
    layerStats: z.record(LayerTypeSchema, z.number()),
    fileCountByExtension: z.record(z.string(), z.number())
  })
});

// Analysis config schema
export const AnalysisConfigSchema = z.object({
  projectPath: z.string(),
  includePatterns: z.array(z.string()).default(['**/*']),
  excludePatterns: z.array(z.string()).default([
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '*.min.js',
    '*.map'
  ]),
  maxFileSize: z.number().default(1024 * 1024), // 1MB
  maxConcurrentFiles: z.number().default(5),
  languages: z.array(LanguageSchema).default(Object.values(LanguageSchema._def.values) as string[] as any),
  skipGenerated: z.boolean().default(true),
  useIncremental: z.boolean().default(true),
  baseGraph: KnowledgeGraphSchema.optional(),
  llmApiKey: z.string().optional(),
  llmModel: z.string().default('gpt-4'),
  verbose: z.boolean().default(false)
});

// Analysis result schema
export const AnalysisResultSchema = z.object({
  success: z.boolean(),
  graph: KnowledgeGraphSchema,
  errors: z.array(z.object({
    file: z.string(),
    message: z.string(),
    code: z.string(),
    fatal: z.boolean()
  })),
  warnings: z.array(z.object({
    file: z.string(),
    message: z.string(),
    code: z.string()
  })),
  stats: z.object({
    duration: z.number(),
    filesProcessed: z.number(),
    nodesCreated: z.number(),
    edgesCreated: z.number()
  })
});

// LLM Analysis schema
export const LLMAnalysisSchema = z.object({
  nodeId: z.string(),
  summary: z.string(),
  layer: LayerTypeSchema,
  tags: z.array(z.string()),
  relationships: z.array(z.object({
    type: EdgeTypeSchema,
    targetId: z.string(),
    description: z.string()
  })),
  confidence: z.number().min(0).max(1)
});

// Domain analysis schema
export const DomainAnalysisSchema = z.object({
  domainName: z.string(),
  nodes: z.array(z.string()),
  description: z.string(),
  subdomains: z.lazy(() => DomainAnalysisSchema.array()).optional()
});

// Tour schema
export const TourStepSchema = z.object({
  nodeId: z.string(),
  title: z.string(),
  content: z.string(),
  highlightConnections: z.boolean().default(true),
  relatedNodeIds: z.array(z.string()).optional()
});

export const TourSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  steps: z.array(TourStepSchema),
  targetAudience: z.string().optional(),
  estimatedMinutes: z.number().optional()
});

// Export types
export type LanguageType = z.infer<typeof LanguageSchema>;
export type LayerTypeType = z.infer<typeof LayerTypeSchema>;
export type NodeTypeType = z.infer<typeof NodeTypeSchema>;
export type EdgeTypeType = z.infer<typeof EdgeTypeSchema>;
export type KGNodeType = z.infer<typeof KGNodeSchema>;
export type KGEdgeType = z.infer<typeof KGEdgeSchema>;
export type KnowledgeGraphType = z.infer<typeof KnowledgeGraphSchema>;
export type AnalysisConfigType = z.infer<typeof AnalysisConfigSchema>;
export type AnalysisResultType = z.infer<typeof AnalysisResultSchema>;
export type LLMAnalysisType = z.infer<typeof LLMAnalysisSchema>;
export type DomainAnalysisType = z.infer<typeof DomainAnalysisSchema>;
export type TourType = z.infer<typeof TourSchema>;
export type TourStepType = z.infer<typeof TourStepSchema>;
