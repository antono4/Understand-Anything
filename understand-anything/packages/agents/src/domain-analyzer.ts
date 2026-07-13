// Domain Analyzer Agent - Extracts business domains from codebase
import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import type { KGNode, KnowledgeGraph, DomainAnalysis } from '@understand-anything/core';
import { generateId } from '@understand-anything/core';

interface DomainDetectionResult {
  domains: DomainAnalysis[];
  crossDomainDependencies: CrossDomainDependency[];
}

interface CrossDomainDependency {
  sourceDomain: string;
  targetDomain: string;
  nodeIds: string[];
  strength: number;
}

// Domain keywords and patterns
const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  authentication: [
    /auth/i, /login/i, /logout/i, /password/i, /token/i,
    /session/i, /credential/i, /oauth/i, /jwt/i, /sso/i
  ],
  payment: [
    /payment/i, /billing/i, /invoice/i, /transaction/i,
    /stripe/i, /paypal/i, /credit/i, /refund/i, /pricing/i
  ],
  user: [
    /user/i, /profile/i, /account/i, /registration/i,
    /customer/i, /member/i, /subscriber/i, /avatar/i
  ],
  notification: [
    /notification/i, /alert/i, /email/i, /sms/i, /push/i,
    /message/i, /inbox/i, /broadcast/i
  ],
  media: [
    /image/i, /photo/i, /video/i, /upload/i, /file/i,
    /media/i, /asset/i, /thumbnail/i, /gallery/i
  ],
  analytics: [
    /analytics/i, /tracking/i, /metric/i, /dashboard/i,
    /report/i, /statistic/i, /event/i, /insight/i
  ],
  search: [
    /search/i, /filter/i, /query/i, /index/i, /result/i,
    /elasticsearch/i, /solr/i
  ],
  social: [
    /follow/i, /friend/i, /like/i, /share/i, /comment/i,
    /post/i, /feed/i, /timeline/i, /mention/i
  ],
  product: [
    /product/i, /catalog/i, /inventory/i, /sku/i, /order/i,
    /cart/i, /wishlist/i, /category/i
  ],
  content: [
    /content/i, /article/i, /blog/i, /post/i, /page/i,
    /cms/i, /editor/i, /richtext/i, /markdown/i
  ],
  settings: [
    /setting/i, /config/i, /preference/i, /option/i,
    /feature.?flag/i, /toggle/i, /environment/i
  ],
  communication: [
    /chat/i, /message/i, /conversation/i, /thread/i,
    /realtime/i, /websocket/i, /webhook/i
  ]
};

export class DomainAnalyzerAgent extends BaseAgent {
  constructor() {
    super('domain-analyzer', 'Extracts and analyzes business domains from codebase');
  }

  async execute(input: unknown): Promise<AgentResult<DomainDetectionResult>> {
    if (!this.context) {
      return { success: false, error: 'Agent not initialized' };
    }

    const graph = this.context.graph;

    try {
      // Detect domains based on node names and tags
      const domainNodes = this.detectDomains(graph);
      
      // Create domain analyses
      const domains = this.createDomainAnalyses(domainNodes);
      
      // Find cross-domain dependencies
      const crossDomainDeps = this.findCrossDomainDependencies(domains, graph);

      // Update node tags with domain information
      this.tagNodesWithDomains(domains, graph);

      this.log(`Detected ${domains.length} domains`);

      return {
        success: true,
        data: { domains, crossDomainDependencies: crossDomainDeps },
        metadata: { graph }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Domain analysis failed'
      };
    }
  }

  private detectDomains(graph: KnowledgeGraph): Map<string, Set<string>> {
    const domainNodes = new Map<string, Set<string>>();

    // Initialize domains
    for (const domain of Object.keys(DOMAIN_PATTERNS)) {
      domainNodes.set(domain, new Set());
    }

    // Scan nodes for domain patterns
    graph.nodes.forEach((node, id) => {
      const searchText = `${node.name} ${node.tags.join(' ')} ${node.file}`.toLowerCase();

      for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(searchText)) {
            domainNodes.get(domain)!.add(id);
            break;
          }
        }
      }
    });

    // Remove empty domains
    for (const [domain, nodes] of domainNodes) {
      if (nodes.size === 0) {
        domainNodes.delete(domain);
      }
    }

    return domainNodes;
  }

  private createDomainAnalyses(domainNodes: Map<string, Set<string>>): DomainAnalysis[] {
    const analyses: DomainAnalysis[] = [];

    for (const [domainName, nodeIds] of domainNodes) {
      const nodes = Array.from(nodeIds);
      
      analyses.push({
        domainName: this.formatDomainName(domainName),
        nodes,
        description: this.generateDomainDescription(domainName, nodes.length),
        subdomains: this.detectSubdomains(domainName, nodeIds)
      });
    }

    // Sort by number of nodes (largest first)
    return analyses.sort((a, b) => b.nodes.length - a.nodes.length);
  }

  private detectSubdomains(domainName: string, nodeIds: Set<string>): DomainAnalysis[] {
    // Simple subdomain detection based on node name patterns
    const subdomains = new Map<string, string[]>();

    for (const nodeId of nodeIds) {
      const node = this.context!.graph.nodes.get(nodeId);
      if (!node) continue;

      // Look for subcategory patterns
      const words = node.name.split(/[./_-]/);
      if (words.length > 1) {
        const potentialSubdomain = words[0].toLowerCase();
        if (potentialSubdomain !== domainName && potentialSubdomain.length > 2) {
          if (!subdomains.has(potentialSubdomain)) {
            subdomains.set(potentialSubdomain, []);
          }
          subdomains.get(potentialSubdomain)!.push(nodeId);
        }
      }
    }

    // Convert to DomainAnalysis format
    return Array.from(subdomains.entries())
      .filter(([, ids]) => ids.length >= 2) // Only include if 2+ nodes
      .map(([name, ids]) => ({
        domainName: this.formatDomainName(name),
        nodes: ids,
        description: `Subdomain of ${domainName}`,
        subdomains: []
      }));
  }

  private findCrossDomainDependencies(
    domains: DomainAnalysis[],
    graph: KnowledgeGraph
  ): CrossDomainDependency[] {
    const dependencies: CrossDomainDependency[] = [];
    const domainNodeMap = new Map<string, string>();

    // Create quick lookup for node -> domain
    domains.forEach(domain => {
      domain.nodes.forEach(nodeId => {
        domainNodeMap.set(nodeId, domain.domainName);
      });
    });

    // Check edges for cross-domain connections
    const depMap = new Map<string, { source: string; target: string; nodes: string[] }>();

    graph.edges.forEach(edge => {
      const sourceDomain = domainNodeMap.get(edge.source);
      const targetDomain = domainNodeMap.get(edge.target);

      if (sourceDomain && targetDomain && sourceDomain !== targetDomain) {
        const key = `${sourceDomain}->${targetDomain}`;
        if (!depMap.has(key)) {
          depMap.set(key, { source: sourceDomain, target: targetDomain, nodes: [] });
        }
        depMap.get(key)!.nodes.push(edge.source);
      }
    });

    // Convert to CrossDomainDependency format
    depMap.forEach((dep, key) => {
      dependencies.push({
        sourceDomain: dep.source,
        targetDomain: dep.target,
        nodeIds: [...new Set(dep.nodes)],
        strength: Math.min(1, dep.nodes.length / 10)
      });
    });

    // Sort by strength
    return dependencies.sort((a, b) => b.strength - a.strength);
  }

  private tagNodesWithDomains(domains: DomainAnalysis[], graph: KnowledgeGraph): void {
    domains.forEach(domain => {
      domain.nodes.forEach(nodeId => {
        const node = graph.nodes.get(nodeId);
        if (node) {
          if (!node.tags.includes(domain.domainName)) {
            node.tags.push(domain.domainName);
          }
          graph.nodes.set(nodeId, node);
        }
      });
    });
  }

  private formatDomainName(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateDomainDescription(domain: string, nodeCount: number): string {
    const descriptions: Record<string, string> = {
      authentication: 'Handles user authentication, authorization, and session management',
      payment: 'Manages payment processing, billing, and financial transactions',
      user: 'User management, profiles, and account-related functionality',
      notification: 'Sends and manages notifications across multiple channels',
      media: 'Handles file uploads, image processing, and media management',
      analytics: 'Tracks and reports application metrics and user behavior',
      search: 'Provides search functionality and result filtering',
      social: 'Social features like following, sharing, and user interactions',
      product: 'Product catalog, inventory, and order management',
      content: 'Content management, articles, and editorial functionality',
      settings: 'Application configuration and user preferences',
      communication: 'Real-time messaging and communication features'
    };

    return descriptions[domain] || `${nodeCount} components in the ${domain} domain`;
  }

  // Get domain for a specific node
  getDomainForNode(nodeId: string): string | null {
    if (!this.context) return null;

    for (const node of this.context.graph.nodes.values()) {
      if (node.id === nodeId) {
        for (const tag of node.tags) {
          if (DOMAIN_PATTERNS[tag.toLowerCase()]) {
            return tag;
          }
        }
      }
    }
    return null;
  }
}
