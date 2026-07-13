// Project Scanner Agent - Discovers files and detects languages
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import type { KGNode, Language } from '@understand-anything/core';
import { LANGUAGE_EXTENSIONS } from '@understand-anything/core';
import { generateNodeId } from '@understand-anything/core';

interface ScanResult {
  files: string[];
  languageDistribution: Record<Language, number>;
  projectStructure: DirectoryTree;
}

interface DirectoryTree {
  name: string;
  path: string;
  type: 'directory' | 'file';
  language?: Language;
  children?: DirectoryTree[];
}

export class ProjectScannerAgent extends BaseAgent {
  private scannedFiles: Set<string> = new Set();

  constructor() {
    super('project-scanner', 'Discovers all files in the project and detects languages');
  }

  async execute(input: unknown): Promise<AgentResult<ScanResult>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const { projectPath } = this.context;
    const languageDistribution: Record<Language, number> = {} as Record<Language, number>;
    const projectStructure: DirectoryTree = {
      name: basename(projectPath),
      path: projectPath,
      type: 'directory',
      children: []
    };

    try {
      await this.scanDirectory(projectPath, projectStructure, languageDistribution);
      
      const result: ScanResult = {
        files: Array.from(this.scannedFiles),
        languageDistribution,
        projectStructure
      };

      // Add file nodes to graph
      this.addFileNodesToGraph(result);

      this.log(`Scanned ${this.scannedFiles.size} files`);

      return {
        success: true,
        data: result,
        metadata: {
          totalFiles: this.scannedFiles.size,
          languages: Object.keys(languageDistribution).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scan failed'
      };
    }
  }

  private async scanDirectory(
    dirPath: string,
    tree: DirectoryTree,
    langStats: Record<Language, number>
  ): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      // Skip common skip patterns
      if (this.shouldSkip(entry.name, entry.isDirectory())) {
        continue;
      }

      if (entry.isDirectory()) {
        const subTree: DirectoryTree = {
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: []
        };
        tree.children!.push(subTree);
        await this.scanDirectory(fullPath, subTree, langStats);
      } else if (entry.isFile()) {
        const lang = this.detectLanguage(entry.name);
        if (lang) {
          const fileNode: DirectoryTree = {
            name: entry.name,
            path: fullPath,
            type: 'file',
            language: lang
          };
          tree.children!.push(fileNode);
          this.scannedFiles.add(fullPath);
          langStats[lang] = (langStats[lang] || 0) + 1;
        }
      }
    }
  }

  private shouldSkip(name: string, isDirectory: boolean): boolean {
    const skipDirs = [
      'node_modules', '.git', '.svn', '.hg',
      'dist', 'build', 'out', 'target',
      '__pycache__', '.pytest_cache', '.next',
      '.cache', '.tmp', '.temp'
    ];

    const skipFiles = [
      '.DS_Store', 'Thumbs.db', '.gitignore',
      '.env.example', 'package-lock.json',
      'yarn.lock', 'pnpm-lock.yaml'
    ];

    if (isDirectory && skipDirs.includes(name)) return true;
    if (!isDirectory && skipFiles.includes(name)) return true;
    if (name.startsWith('.') && !name.includes('.')) return true;

    return false;
  }

  private detectLanguage(filename: string): Language | null {
    const ext = extname(filename).toLowerCase();
    
    for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
      if (extensions.includes(ext)) {
        return lang as Language;
      }
    }
    return null;
  }

  private addFileNodesToGraph(result: ScanResult): void {
    if (!this.context) return;

    for (const file of result.files) {
      const lang = this.detectLanguage(file);
      if (!lang) continue;

      const nodeId = generateNodeId(file, 'file', 'file');
      const node: KGNode = {
        id: nodeId,
        type: 'file',
        name: basename(file),
        displayName: basename(file),
        description: `Source file: ${file}`,
        file,
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 0 },
          file
        },
        language: lang,
        tags: [lang, 'source'],
        metadata: {
          path: file,
          discovered: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.context.graph.nodes.set(nodeId, node);
    }
  }
}
