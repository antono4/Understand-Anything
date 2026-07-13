#!/usr/bin/env node

/**
 * Understand-Anything CLI
 * Command-line interface for knowledge graph analysis
 */

import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
  createAnalyzer, 
  createSearch,
  serializeGraph,
  deserializeGraph
} from '@understand-anything/core';
import {
  AgentRegistry,
  PipelineExecutor,
  ProjectScannerAgent,
  FileAnalyzerAgent,
  ArchitectureAnalyzerAgent,
  TourBuilderAgent,
  GraphReviewerAgent,
  DomainAnalyzerAgent,
  ArticleAnalyzerAgent
} from '@understand-anything/agents';
import type { KnowledgeGraph, AnalysisConfig } from '@understand-anything/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Version
const VERSION = '1.0.0';

// Colors for CLI output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue');
}

// Initialize agent registry
function initializeAgents() {
  const registry = new AgentRegistry();
  
  registry.register(new ProjectScannerAgent());
  registry.register(new FileAnalyzerAgent());
  registry.register(new ArchitectureAnalyzerAgent());
  registry.register(new TourBuilderAgent());
  registry.register(new GraphReviewerAgent());
  registry.register(new DomainAnalyzerAgent());
  registry.register(new ArticleAnalyzerAgent());
  
  return registry;
}

// CLI Commands
const program = new Command();

program
  .name('understand-anything')
  .description('Transform codebases into interactive knowledge graphs')
  .version(VERSION);

// Analyze command
program
  .command('analyze')
  .description('Analyze a codebase and generate knowledge graph')
  .argument('<path>', 'Path to the codebase to analyze')
  .option('-o, --output <file>', 'Output file path', '.understand-anything/knowledge-graph.json')
  .option('-l, --language <lang>', 'Primary language', 'typescript')
  .option('-i, --include <patterns>', 'Include patterns (comma separated)')
  .option('-e, --exclude <patterns>', 'Exclude patterns (comma separated)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (path: string, options: any) => {
    log(`Analyzing codebase: ${path}`, 'cyan');
    
    const config: AnalysisConfig = {
      projectPath: path,
      includePatterns: options.include?.split(',') || ['**/*'],
      excludePatterns: options.exclude?.split(',') || [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.min.js'
      ],
      maxFileSize: 1024 * 1024,
      maxConcurrentFiles: 5,
      languages: [options.language],
      skipGenerated: true,
      useIncremental: true,
      verbose: options.verbose
    };

    try {
      const analyzer = createAnalyzer(config);
      await analyzer.initialize();
      
      log('Starting analysis...', 'yellow');
      const result = await analyzer.analyze();

      if (result.success) {
        // Ensure output directory exists
        const outputDir = dirname(options.output);
        await mkdir(outputDir, { recursive: true });
        
        // Serialize and save graph
        const serialized = serializeGraph(result.graph);
        await writeFile(options.output, JSON.stringify(serialized, null, 2));
        
        logSuccess(`Analysis complete!`);
        log(`  Files processed: ${result.stats.filesProcessed}`, 'dim');
        log(`  Nodes created: ${result.stats.nodesCreated}`, 'dim');
        log(`  Edges created: ${result.stats.edgesCreated}`, 'dim');
        log(`  Duration: ${result.stats.duration}ms`, 'dim');
        log(`  Output: ${options.output}`, 'dim');
        
        if (result.errors.length > 0) {
          log(`  Errors: ${result.errors.length}`, 'red');
        }
        if (result.warnings.length > 0) {
          log(`  Warnings: ${result.warnings.length}`, 'yellow');
        }
      } else {
        logError('Analysis failed');
        result.errors.forEach(err => {
          log(`  ${err.file}: ${err.message}`, 'red');
        });
        process.exit(1);
      }
    } catch (error) {
      logError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Search command
program
  .command('search')
  .description('Search the knowledge graph')
  .argument('<graph>', 'Path to knowledge graph file')
  .argument('<query>', 'Search query')
  .option('-n, --limit <number>', 'Maximum results', '10')
  .option('-t, --type <type>', 'Filter by node type')
  .option('-l, --layer <layer>', 'Filter by layer')
  .action(async (graphPath: string, query: string, options: any) => {
    try {
      const data = await readFile(graphPath, 'utf-8');
      const graph = deserializeGraph(JSON.parse(data));
      const search = createSearch(graph);

      const results = search.search(query, parseInt(options.limit));
      
      if (results.length === 0) {
        logInfo('No results found');
        return;
      }

      log(`Found ${results.length} results:`, 'cyan');
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.node.displayName}`);
        console.log(`   Type: ${result.node.type}`);
        console.log(`   File: ${result.node.file}`);
        console.log(`   Score: ${(result.score * 100).toFixed(0)}%`);
        if (result.node.description) {
          console.log(`   ${result.node.description.substring(0, 80)}...`);
        }
      });
    } catch (error) {
      logError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Agents command
program
  .command('agents')
  .description('List available analysis agents')
  .action(() => {
    const registry = initializeAgents();
    const agents = registry.list();

    log('Available agents:', 'cyan');
    agents.forEach(agent => {
      console.log(`\n  ${colors.bright}${agent.name}${colors.reset}`);
      console.log(`  ${agent.description}`);
    });
  });

// Generate tour command
program
  .command('tour')
  .description('Generate a guided tour')
  .argument('<graph>', 'Path to knowledge graph file')
  .option('-o, --output <file>', 'Output file', 'tour.json')
  .option('-a, --audience <type>', 'Target audience', 'new-developer')
  .action(async (graphPath: string, options: any) => {
    try {
      const data = await readFile(graphPath, 'utf-8');
      const graph = deserializeGraph(JSON.parse(data));

      const agent = new TourBuilderAgent();
      agent.initialize({
        projectPath: graph.projectPath,
        config: {} as any,
        graph
      });

      const result = await agent.execute({
        audience: options.audience
      });

      if (result.success && result.data) {
        await writeFile(options.output, JSON.stringify(result.data.tours, null, 2));
        logSuccess(`Generated ${result.data.tours.length} tours`);
        log(`  Output: ${options.output}`, 'dim');
      } else {
        logError('Tour generation failed');
        process.exit(1);
      }
    } catch (error) {
      logError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Review graph command
program
  .command('review')
  .description('Review knowledge graph quality')
  .argument('<graph>', 'Path to knowledge graph file')
  .action(async (graphPath: string) => {
    try {
      const data = await readFile(graphPath, 'utf-8');
      const graph = deserializeGraph(JSON.parse(data));

      const agent = new GraphReviewerAgent();
      agent.initialize({
        projectPath: graph.projectPath,
        config: {} as any,
        graph
      });

      const result = await agent.execute(null);

      if (result.success && result.data) {
        const { score, issues, suggestions } = result.data;
        
        log(`Graph Quality Score: ${score}/100`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
        
        if (issues.length > 0) {
          log(`\nFound ${issues.length} issues:`, 'yellow');
          issues.slice(0, 10).forEach(issue => {
            const color = issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'yellow' : 'dim';
            log(`  [${issue.severity}] ${issue.description}`, color as any);
          });
        }
        
        if (suggestions.length > 0) {
          log(`\nSuggestions:`, 'cyan');
          suggestions.forEach(suggestion => {
            console.log(`  • ${suggestion}`);
          });
        }
      }
    } catch (error) {
      logError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Analyze domains command
program
  .command('domains')
  .description('Analyze business domains in the codebase')
  .argument('<graph>', 'Path to knowledge graph file')
  .action(async (graphPath: string) => {
    try {
      const data = await readFile(graphPath, 'utf-8');
      const graph = deserializeGraph(JSON.parse(data));

      const agent = new DomainAnalyzerAgent();
      agent.initialize({
        projectPath: graph.projectPath,
        config: {} as any,
        graph
      });

      const result = await agent.execute(null);

      if (result.success && result.data) {
        log('Detected domains:', 'cyan');
        result.data.domains.forEach(domain => {
          console.log(`\n  ${colors.bright}${domain.domainName}${colors.reset}`);
          console.log(`  ${domain.description}`);
          console.log(`  Nodes: ${domain.nodes.length}`);
        });
        
        if (result.data.crossDomainDependencies.length > 0) {
          log(`\nCross-domain dependencies:`, 'yellow');
          result.data.crossDomainDependencies.slice(0, 5).forEach(dep => {
            console.log(`  ${dep.sourceDomain} → ${dep.targetDomain} (${dep.nodeIds.length} connections)`);
          });
        }
      }
    } catch (error) {
      logError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Analyze wiki/knowledge base command
program
  .command('wiki')
  .description('Analyze wiki/documentation knowledge base')
  .argument('<path>', 'Path to wiki/documentation directory')
  .option('-o, --output <file>', 'Output file', 'knowledge-base.json')
  .action(async (path: string, options: any) => {
    try {
      const agent = new ArticleAnalyzerAgent();
      agent.initialize({
        projectPath: path,
        config: {} as any,
        graph: {
          version: '1.0.0',
          projectPath: path,
          projectName: 'Knowledge Base',
          language: 'markdown',
          generatedAt: new Date().toISOString(),
          nodes: new Map(),
          edges: new Map(),
          metadata: {} as any
        }
      });

      const result = await agent.execute(path);

      if (result.success && result.data) {
        await writeFile(options.output, JSON.stringify(result.data, null, 2));
        logSuccess(`Analyzed ${result.data.articles.length} articles`);
        log(`  Entities: ${result.data.entityGraph.nodes.length}`, 'dim');
        log(`  Concepts: ${result.data.concepts.length}`, 'dim');
        log(`  Output: ${options.output}`, 'dim');
      }
    } catch (error) {
      logError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Dashboard command
program
  .command('dashboard')
  .description('Open the interactive knowledge graph dashboard')
  .argument('[graph]', 'Path to knowledge graph file', '.understand-anything/knowledge-graph.json')
  .option('-p, --port <port>', 'Port number', '3000')
  .action(async (graphPath: string, options: any) => {
    log('Starting dashboard server...', 'cyan');
    log(`Graph: ${graphPath}`, 'dim');
    log(`Port: ${options.port}`, 'dim');
    log('\nDashboard will be available at:', 'green');
    log(`  http://localhost:${options.port}`, 'bright');
    log('\nPress Ctrl+C to stop the server', 'dim');
    
    // Note: In a full implementation, this would start an Express/Vite dev server
    // For now, just show the message
    log('\n(Dashboard server implementation pending...)', 'yellow');
  });

// Parse and execute
program.parse();
