import type { IGraphRepository, GetNeighborsOptions, SearchOptions } from './IGraphRepository';
import type { GraphNode, GraphEdge, Subgraph, Metapath, GraphSchema } from '../../types';

export class ApiGraphRepository implements IGraphRepository {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1/graph') {
    this.baseUrl = baseUrl;
  }

  async getNode(id: string): Promise<GraphNode | null> {
    const res = await fetch(`${this.baseUrl}/nodes/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch node: ${res.statusText}`);
    return res.json();
  }

  async getNeighbors(id: string, options?: GetNeighborsOptions): Promise<GraphEdge[]> {
    const params = new URLSearchParams();
    if (options?.direction) params.append('direction', options.direction);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.edgeTypes) params.append('edgeTypes', options.edgeTypes.join(','));

    const res = await fetch(`${this.baseUrl}/nodes/${id}/neighbors?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch neighbors: ${res.statusText}`);
    return res.json();
  }

  async search(query: string, options?: SearchOptions): Promise<GraphNode[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.nodeTypes) params.append('nodeTypes', options.nodeTypes.join(','));

    const res = await fetch(`${this.baseUrl}/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    return res.json();
  }

  async getSubgraph(nodeIds: string[]): Promise<Subgraph> {
    const res = await fetch(`${this.baseUrl}/subgraph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeIds })
    });
    if (!res.ok) throw new Error(`Failed to fetch subgraph: ${res.statusText}`);
    return res.json();
  }

  async getMetapath(fromId: string, toId: string, maxLength?: number): Promise<Metapath[]> {
    const params = new URLSearchParams({ fromId, toId });
    if (maxLength) params.append('maxLength', maxLength.toString());

    const res = await fetch(`${this.baseUrl}/metapath?${params.toString()}`);
    if (!res.ok) throw new Error(`Metapath calculation failed: ${res.statusText}`);
    return res.json();
  }

  async getSchema(): Promise<GraphSchema> {
    const res = await fetch(`${this.baseUrl}/schema`);
    if (!res.ok) throw new Error(`Schema request failed: ${res.statusText}`);
    return res.json();
  }
}
