import type { GraphNode, GraphEdge, Subgraph, Metapath, GraphSchema, NodeLabel } from '../../types';

export interface GetNeighborsOptions {
  edgeTypes?: string[];
  direction?: 'in' | 'out' | 'both';
  limit?: number;
}

export interface SearchOptions {
  nodeTypes?: NodeLabel[];
  limit?: number;
}

export interface IGraphRepository {
  getNode(id: string): Promise<GraphNode | null>;
  getNeighbors(id: string, options?: GetNeighborsOptions): Promise<GraphEdge[]>;
  search(query: string, options?: SearchOptions): Promise<GraphNode[]>;
  getSubgraph(nodeIds: string[]): Promise<Subgraph>;
  getMetapath(fromId: string, toId: string, maxLength?: number): Promise<Metapath[]>;
  getSchema(): Promise<GraphSchema>;
}
