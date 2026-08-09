export type NodeLabel = 'Gene' | 'Protein' | 'Disease' | 'Drug' | 'Pathway' | 'BiologicalProcess' | 'Phenotype';

export interface GraphNode {
  id: string;
  label: NodeLabel;
  name: string;
  description?: string;
  properties: Record<string, unknown>;
  createdAt?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Metapath {
  nodes: NodeLabel[];
  edges: string[];
  score?: number;
}

export interface GraphSchema {
  nodeTypes: Array<{ type: NodeLabel; count: number }>;
  edgeTypes: Array<{ type: string; count: number }>;
  totalNodes: number;
  totalEdges: number;
}

// Pipeline & Analysis Types
export type JobType = 'PROJECTION' | 'SUBGRAPH_EXTRACTION' | 'PATH_FINDING' | 'EVIDENCE_SCORING';

export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface PipelineJob<T = unknown> {
  id: string;
  type: JobType;
  params: Record<string, unknown>;
  status: JobStatus;
  progress?: number;
  result?: T;
  error?: string;
  createdAt: string;
}

// Workspace Types
export interface Collection {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeAnnotation {
  nodeId: string;
  note: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  canvasLayout: 'force-directed' | 'circular' | 'grid' | 'hierarchical';
  maxRenderedNodes: number;
  showLabels: boolean;
}
