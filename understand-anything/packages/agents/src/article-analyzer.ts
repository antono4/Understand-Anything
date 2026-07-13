// Article Analyzer Agent - Analyzes wiki/documentation for knowledge base
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import { generateId } from '@understand-anything/core';

interface Article {
  id: string;
  title: string;
  path: string;
  content: string;
  summary: string;
  entities: ArticleEntity[];
  links: ArticleLink[];
  tags: string[];
  language: string;
}

interface ArticleEntity {
  name: string;
  type: 'person' | 'concept' | 'term' | 'code' | 'system';
  mentions: number;
  definition?: string;
}

interface ArticleLink {
  target: string;
  type: 'internal' | 'external' | 'code-ref';
  anchor?: string;
}

interface KnowledgeBaseAnalysis {
  articles: Article[];
  entityGraph: EntityGraph;
  concepts: Concept[];
  toc: TableOfContents;
}

interface EntityGraph {
  nodes: EntityNode[];
  edges: EntityEdge[];
}

interface EntityNode {
  id: string;
  name: string;
  type: ArticleEntity['type'];
  articleCount: number;
}

interface EntityEdge {
  source: string;
  target: string;
  weight: number;
  cooccurrences: number;
}

interface Concept {
  name: string;
  description: string;
  relatedEntities: string[];
  articleCount: number;
}

interface TableOfContents {
  sections: TOCSection[];
  categoryTree: CategoryNode;
}

interface TOCSection {
  title: string;
  level: number;
  articleId?: string;
}

interface CategoryNode {
  name: string;
  children: CategoryNode[];
  articles: string[];
}

// Common documentation file extensions
const DOC_EXTENSIONS = ['.md', '.mdx', '.txt', '.rst', '.adoc'];

export class ArticleAnalyzerAgent extends BaseAgent {
  constructor() {
    super('article-analyzer', 'Analyzes wiki and documentation for knowledge extraction');
  }

  async execute(input: unknown): Promise<AgentResult<KnowledgeBaseAnalysis>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const wikiPath = (input as string) || this.context.projectPath;

    try {
      // Find all documentation files
      const docFiles = await this.findDocumentationFiles(wikiPath);
      
      if (docFiles.length === 0) {
        return {
          success: true,
          data: {
            articles: [],
            entityGraph: { nodes: [], edges: [] },
            concepts: [],
            toc: { sections: [], categoryTree: { name: 'root', children: [], articles: [] } }
          },
          warnings: ['No documentation files found']
        };
      }

      // Parse each article
      const articles: Article[] = [];
      for (const file of docFiles) {
        const article = await this.parseArticle(file);
        if (article) {
          articles.push(article);
        }
      }

      // Build entity graph
      const entityGraph = this.buildEntityGraph(articles);
      
      // Extract concepts
      const concepts = this.extractConcepts(articles);
      
      // Build table of contents
      const toc = this.buildTableOfContents(articles);

      this.log(`Analyzed ${articles.length} articles`);

      return {
        success: true,
        data: { articles, entityGraph, concepts, toc }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Article analysis failed'
      };
    }
  }

  private async findDocumentationFiles(path: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await readdir(path, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(path, entry.name);
        
        if (entry.isDirectory()) {
          // Skip hidden directories and common non-doc directories
          if (!entry.name.startsWith('.') && 
              !['node_modules', 'build', 'dist'].includes(entry.name)) {
            const subFiles = await this.findDocumentationFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (DOC_EXTENSIONS.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return files;
  }

  private async parseArticle(filePath: string): Promise<Article | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const title = this.extractTitle(content, filePath);
      const summary = this.generateSummary(content);
      const entities = this.extractEntities(content);
      const links = this.extractLinks(content);
      const tags = this.extractTags(content);

      return {
        id: generateId('article'),
        title,
        path: filePath,
        content,
        summary,
        entities,
        links,
        tags,
        language: this.detectLanguage(content)
      };
    } catch {
      return null;
    }
  }

  private extractTitle(content: string, filePath: string): string {
    // Try to find title from markdown heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Fall back to filename
    return basename(filePath, extname(filePath))
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateSummary(content: string): string {
    // Remove markdown formatting
    const cleanContent = content
      .replace(/^#+\s+/gm, '') // Remove headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/[*_`~]/g, '') // Remove formatting
      .replace(/\n+/g, ' ') // Collapse newlines
      .trim();

    // Take first 200 characters
    return cleanContent.substring(0, 200).trim() + '...';
  }

  private extractEntities(content: string): ArticleEntity[] {
    const entities: Map<string, ArticleEntity> = new Map();

    // Extract code references (words in backticks)
    const codeMatches = content.match(/`([^`]+)`/g) || [];
    codeMatches.forEach(match => {
      const name = match.slice(1, -1);
      this.addEntity(entities, name, 'code');
    });

    // Extract capitalized terms (potential proper nouns)
    const capitalized = content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    const termCounts = new Map<string, number>();
    capitalized.forEach(term => {
      if (term.length > 2 && !this.isCommonWord(term)) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    });

    termCounts.forEach((count, term) => {
      if (count >= 2) {
        this.addEntity(entities, term, 'concept');
      }
    });

    // Extract terms from specific sections
    const glossaryMatch = content.match(/##\s+Glossary\n([\s\S]+?)(?:\n##|$)/i);
    if (glossaryMatch) {
      const terms = glossaryMatch[1].match(/^\*\*([^*]+)\*\*/gm) || [];
      terms.forEach(term => {
        const name = term.replace(/\*\*/g, '');
        this.addEntity(entities, name, 'term');
      });
    }

    return Array.from(entities.values())
      .sort((a, b) => b.mentions - a.mentions);
  }

  private addEntity(
    entities: Map<string, ArticleEntity>,
    name: string,
    type: ArticleEntity['type']
  ): void {
    const existing = entities.get(name);
    if (existing) {
      existing.mentions++;
    } else {
      entities.set(name, { name, type, mentions: 1 });
    }
  }

  private extractLinks(content: string): ArticleLink[] {
    const links: ArticleLink[] = [];

    // Extract markdown links
    const mdLinks = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    mdLinks.forEach(link => {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, anchor, target] = match;
        const type = target.startsWith('http') ? 'external' : 'internal';
        links.push({ target, type, anchor });
      }
    });

    // Extract code references
    const codeRefs = content.match(/`([^`]+)`/g) || [];
    codeRefs.forEach(ref => {
      const target = ref.slice(1, -1);
      links.push({ target, type: 'code-ref', anchor: target });
    });

    return links;
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Extract from frontmatter
    const frontmatter = content.match(/^---\n([\s\S]+?)\n---/);
    if (frontmatter) {
      const tagMatch = frontmatter[1].match(/tags:\s*\[([^\]]+)\]/);
      if (tagMatch) {
        tags.push(...tagMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')));
      }
    }

    // Extract from bottom of file
    const bottomTags = content.match(/tags?\s*:?\s*([\s\S]+)$/i);
    if (bottomTags) {
      const extracted = bottomTags[1]
        .split(/[,#]/)
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0 && t.length < 30);
      tags.push(...extracted);
    }

    return [...new Set(tags)];
  }

  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const samples: Record<string, string[]> = {
      en: ['the', 'and', 'is', 'are', 'this', 'that', 'for', 'with'],
      zh: ['的', '是', '在', '和', '了', '我', '有', '个'],
      ja: ['の', 'は', 'に', 'を', 'て', 'が', 'と', 'し'],
      ko: ['의', '은', '가', '에', '를', '와', '한', '을']
    };

    const contentLower = content.toLowerCase();
    let bestLang = 'en';
    let bestScore = 0;

    for (const [lang, words] of Object.entries(samples)) {
      const score = words.filter(w => contentLower.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }

  private buildEntityGraph(articles: Article[]): EntityGraph {
    const nodes: Map<string, EntityNode> = new Map();
    const edgeCounts: Map<string, number> = new Map();

    // Count entity occurrences across articles
    articles.forEach(article => {
      const articleEntities = new Set(article.entities.map(e => e.name));
      
      articleEntities.forEach(entityName => {
        const existing = nodes.get(entityName);
        if (existing) {
          existing.articleCount++;
        } else {
          const entity = article.entities.find(e => e.name === entityName);
          nodes.set(entityName, {
            id: generateId('entity'),
            name: entityName,
            type: entity?.type || 'concept',
            articleCount: 1
          });
        }
      });

      // Create co-occurrence edges
      const entityArray = Array.from(articleEntities);
      for (let i = 0; i < entityArray.length; i++) {
        for (let j = i + 1; j < entityArray.length; j++) {
          const edgeKey = `${entityArray[i]}|${entityArray[j]}`;
          edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1);
        }
      }
    });

    // Build edges
    const edges: EntityEdge[] = [];
    edgeCounts.forEach((count, key) => {
      const [source, target] = key.split('|');
      edges.push({
        source: nodes.get(source)?.id || source,
        target: nodes.get(target)?.id || target,
        weight: Math.min(1, count / 10),
        cooccurrences: count
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges: edges.sort((a, b) => b.weight - a.weight).slice(0, 100)
    };
  }

  private extractConcepts(articles: Article[]): Concept[] {
    const conceptMap = new Map<string, Set<string>>();

    // Group by tags
    articles.forEach(article => {
      article.tags.forEach(tag => {
        if (!conceptMap.has(tag)) {
          conceptMap.set(tag, new Set());
        }
        conceptMap.get(tag)!.add(article.id);
      });
    });

    // Create concepts
    return Array.from(conceptMap.entries())
      .map(([name, articleIds]) => ({
        name,
        description: `Related to ${name}`,
        relatedEntities: this.findRelatedEntities(articles, name),
        articleCount: articleIds.size
      }))
      .filter(c => c.articleCount >= 1)
      .sort((a, b) => b.articleCount - a.articleCount);
  }

  private findRelatedEntities(articles: Article[], tag: string): string[] {
    const entities: Set<string> = new Set();
    
    articles
      .filter(a => a.tags.includes(tag))
      .forEach(a => {
        a.entities.forEach(e => {
          if (e.type === 'concept' || e.type === 'term') {
            entities.add(e.name);
          }
        });
      });

    return Array.from(entities).slice(0, 10);
  }

  private buildTableOfContents(articles: Article[]): TableOfContents {
    const sections: TOCSection[] = [];
    const categoryTree: CategoryNode = {
      name: 'root',
      children: [],
      articles: []
    };

    // Extract sections from content
    articles.forEach(article => {
      const headings = article.content.match(/^#{1,6}\s+(.+)$/gm) || [];
      headings.forEach(heading => {
        const match = heading.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          sections.push({
            title: match[2].trim(),
            level: match[1].length,
            articleId: article.id
          });
        }
      });

      // Organize by directory structure
      const pathParts = article.path.split('/');
      if (pathParts.length > 1) {
        // Use second-to-last directory as category
        const categoryName = pathParts[pathParts.length - 2];
        let category = categoryTree.children.find(c => c.name === categoryName);
        if (!category) {
          category = { name: categoryName, children: [], articles: [] };
          categoryTree.children.push(category);
        }
        category.articles.push(article.id);
      }
    });

    return { sections, categoryTree };
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'The', 'This', 'That', 'These', 'Those', 'Which', 'Where', 'When',
      'What', 'How', 'Why', 'From', 'With', 'Into', 'This', 'Such',
      'Also', 'Same', 'Other', 'Another', 'Each', 'Every', 'Most',
      'Some', 'Any', 'All', 'Both', 'Few', 'More', 'Most', 'None'
    ]);
    return commonWords.has(word);
  }
}
