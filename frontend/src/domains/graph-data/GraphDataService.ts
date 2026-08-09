import type { IGraphRepository, GetNeighborsOptions, SearchOptions } from './IGraphRepository';
import type { GraphNode, GraphEdge, Subgraph, Metapath, GraphSchema } from '../../types';

export class GraphDataService {
  private cache: Map<string, GraphNode> = new Map();
  private repository: IGraphRepository;

  constructor(repository: IGraphRepository) {
    this.repository = repository;
  }

  async fetchNode(id: string): Promise<GraphNode | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const node = await this.repository.getNode(id);
    if (node) {
      this.cache.set(node.id, node);
    }
    return node;
  }

  async fetchNeighbors(id: string, options?: GetNeighborsOptions): Promise<GraphEdge[]> {
    return this.repository.getNeighbors(id, options);
  }

  async searchGraph(query: string, options?: SearchOptions): Promise<GraphNode[]> {
    if (!query.trim()) return [];
    const results = await this.repository.search(query, options);
    results.forEach(node => this.cache.set(node.id, node));
    return results;
  }

  async fetchSubgraph(nodeIds: string[]): Promise<Subgraph> {
    const subgraph = await this.repository.getSubgraph(nodeIds);
    subgraph.nodes.forEach(n => this.cache.set(n.id, n));
    return subgraph;
  }

  async fetchMetapaths(fromId: string, toId: string, maxLength?: number): Promise<Metapath[]> {
    return this.repository.getMetapath(fromId, toId, maxLength);
  }

  async fetchSchema(): Promise<GraphSchema> {
    return this.repository.getSchema();
  }

  clearCache(): void {
    this.cache.clear();
  }
}
