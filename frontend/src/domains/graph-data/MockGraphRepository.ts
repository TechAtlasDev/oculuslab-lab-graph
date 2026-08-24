import type { IGraphRepository, GetNeighborsOptions, SearchOptions } from './IGraphRepository';
import type { GraphNode, GraphEdge, Subgraph, Metapath, GraphSchema } from '../../types';

const MOCK_NODES: GraphNode[] = [
  {
    id: 'node-hernia',
    label: 'Disease',
    name: 'Inguinal Hernia',
    description: 'Protrusion of abdominal-cavity contents through the inguinal canal',
    properties: { omim: '609204', mondo: '0005086', category: 'Phenotype / Disease' }
  },
  {
    id: 'node-tgfbr2',
    label: 'Gene',
    name: 'TGFBR2',
    description: 'Transforming Growth Factor Beta Receptor 2, critical in extracellular matrix homeostasis',
    properties: { chromosome: '3p24.1', hgnc: '11773', omim: '190182', ncbiGene: '7048' }
  },
  {
    id: 'node-tgfbr2-protein',
    label: 'Protein',
    name: 'TGF-beta Receptor Type 2',
    description: 'Transmembrane serine/threonine kinase receptor for TGF-beta',
    properties: { uniprot: 'P37173', mass: '64.6 kDa' }
  },
  {
    id: 'node-tgfbeta-pathway',
    label: 'Pathway',
    name: 'TGF-beta Signaling Pathway',
    description: 'Regulates cell proliferation, differentiation, and extracellular matrix formation',
    properties: { reactomeId: 'R-HSA-170834', kegg: 'hsa04350' }
  },
  {
    id: 'node-galunisertib',
    label: 'Drug',
    name: 'Galunisertib',
    description: 'Small molecule inhibitor targeting TGF-beta receptor type I/II kinase',
    properties: { chembl: '2103848', phase: 'Clinical Trial (Phase II)', targetType: 'Kinase Inhibitor' }
  },
  {
    id: 'node-pirfenidone',
    label: 'Drug',
    name: 'Pirfenidone',
    description: 'Antifibrotic agent that suppresses TGF-beta pathway expression',
    properties: { chembl: '1422', phase: 'Approved', approvalYear: '2014' }
  },
  {
    id: 'node-fbn1',
    label: 'Gene',
    name: 'FBN1',
    description: 'Fibrillin 1, key structural component of connective tissue microfibrils',
    properties: { chromosome: '15q21.1', hgnc: '3601', omim: '134797' }
  },
  { id: 'node-1', label: 'Gene', name: 'TP53', description: 'Tumor Protein P53, key regulator in DNA repair', properties: { chromosome: '17', organism: 'Homo sapiens' } },
  { id: 'node-2', label: 'Protein', name: 'p53 Protein', description: 'Cellular tumor antigen p53', properties: { mass: '53 kDa' } },
  { id: 'node-3', label: 'Disease', name: 'Li-Fraumeni Syndrome', description: 'Rare hereditary cancer predisposition syndrome', properties: { omim: '151623' } },
  { id: 'node-4', label: 'Drug', name: 'Advexin', description: 'Gene therapy targeting TP53 deficient tumors', properties: { phase: 'Clinical' } },
  { id: 'node-5', label: 'Pathway', name: 'Apoptosis Cascade', description: 'Programmed cell death pathway', properties: { reactomeId: 'R-HSA-109581' } },
  { id: 'node-6', label: 'Gene', name: 'MDM2', description: 'E3 ubiquitin-protein ligase MDM2', properties: { chromosome: '12' } },
  { id: 'node-7', label: 'Disease', name: 'Glioblastoma Multiforme', description: 'Aggressive brain tumor', properties: { mesh: 'D005909' } },
];

const MOCK_EDGES: GraphEdge[] = [
  { id: 'edge-hernia-tgfbr2', source: 'node-hernia', target: 'node-tgfbr2', type: 'ASSOCIATED_WITH', weight: 0.96 },
  { id: 'edge-tgfbr2-protein', source: 'node-tgfbr2', target: 'node-tgfbr2-protein', type: 'ENCODES', weight: 1.0 },
  { id: 'edge-tgfbr2-pathway', source: 'node-tgfbr2', target: 'node-tgfbeta-pathway', type: 'PARTICIPATES_IN', weight: 0.98 },
  { id: 'edge-galunisertib-tgfbr2', source: 'node-galunisertib', target: 'node-tgfbr2', type: 'TARGETS', weight: 0.92 },
  { id: 'edge-pirfenidone-pathway', source: 'node-pirfenidone', target: 'node-tgfbeta-pathway', type: 'TARGETS', weight: 0.89 },
  { id: 'edge-hernia-fbn1', source: 'node-hernia', target: 'node-fbn1', type: 'ASSOCIATED_WITH', weight: 0.88 },
  { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'ENCODES' },
  { id: 'edge-2', source: 'node-1', target: 'node-3', type: 'ASSOCIATED_WITH' },
  { id: 'edge-3', source: 'node-4', target: 'node-1', type: 'TARGETS' },
  { id: 'edge-4', source: 'node-1', target: 'node-5', type: 'PARTICIPATES_IN' },
  { id: 'edge-5', source: 'node-6', target: 'node-1', type: 'REGULATES' },
  { id: 'edge-6', source: 'node-1', target: 'node-7', type: 'ASSOCIATED_WITH' },
];

export class MockGraphRepository implements IGraphRepository {
  private nodes: Map<string, GraphNode> = new Map(MOCK_NODES.map(n => [n.id, n]));
  private edges: GraphEdge[] = [...MOCK_EDGES];

  async getNode(id: string): Promise<GraphNode | null> {
    await this.delay(60);
    return this.nodes.get(id) || null;
  }

  async getNeighbors(id: string, options?: GetNeighborsOptions): Promise<GraphEdge[]> {
    await this.delay(80);
    let matched = this.edges.filter(e => {
      if (options?.direction === 'in') return e.target === id;
      if (options?.direction === 'out') return e.source === id;
      return e.source === id || e.target === id;
    });

    if (options?.edgeTypes && options.edgeTypes.length > 0) {
      matched = matched.filter(e => options.edgeTypes?.includes(e.type));
    }

    if (options?.limit && options.limit > 0) {
      matched = matched.slice(0, options.limit);
    }

    return matched;
  }

  async search(query: string, options?: SearchOptions): Promise<GraphNode[]> {
    await this.delay(100);
    const q = query.toLowerCase();
    let results = Array.from(this.nodes.values()).filter(node => 
      node.name.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q) ||
      (node.description && node.description.toLowerCase().includes(q))
    );

    if (options?.nodeTypes && options.nodeTypes.length > 0) {
      results = results.filter(n => options.nodeTypes?.includes(n.label));
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getSubgraph(nodeIds: string[]): Promise<Subgraph> {
    await this.delay(120);
    const idSet = new Set(nodeIds);
    const nodes = Array.from(this.nodes.values()).filter(n => idSet.has(n.id));
    const edges = this.edges.filter(e => idSet.has(e.source) && idSet.has(e.target));
    return { nodes, edges };
  }

  async getMetapath(fromId: string, toId: string): Promise<Metapath[]> {
    await this.delay(150);
    const source = this.nodes.get(fromId);
    const target = this.nodes.get(toId);
    if (!source || !target) return [];

    return [
      {
        nodes: [source.label, 'Protein', target.label],
        edges: ['ENCODES', 'ASSOCIATED_WITH'],
        score: 0.94,
      },
      {
        nodes: [source.label, 'Pathway', target.label],
        edges: ['PARTICIPATES_IN', 'ALTERED_IN'],
        score: 0.88,
      }
    ];
  }

  async getSchema(): Promise<GraphSchema> {
    await this.delay(50);
    return {
      nodeTypes: [
        { type: 'Gene', count: 4200 },
        { type: 'Protein', count: 8100 },
        { type: 'Disease', count: 1200 },
        { type: 'Drug', count: 950 },
        { type: 'Pathway', count: 340 },
      ],
      edgeTypes: [
        { type: 'ENCODES', count: 12000 },
        { type: 'ASSOCIATED_WITH', count: 45000 },
        { type: 'TARGETS', count: 3200 },
        { type: 'PARTICIPATES_IN', count: 15000 },
      ],
      totalNodes: 190939,
      totalEdges: 21818752,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
