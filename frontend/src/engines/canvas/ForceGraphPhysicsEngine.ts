import * as d3 from 'd3-force';
import type { GraphNode, GraphEdge } from '../../types';

export interface PhysicsNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  name: string;
  description?: string;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface PhysicsLink extends d3.SimulationLinkDatum<PhysicsNode> {
  id: string;
  source: string | PhysicsNode;
  target: string | PhysicsNode;
  type: string;
}

export class ForceGraphPhysicsEngine {
  private simulation: d3.Simulation<PhysicsNode, PhysicsLink>;
  private nodesMap: Map<string, PhysicsNode> = new Map();
  private links: PhysicsLink[] = [];
  private onTickCallback?: () => void;

  constructor(width: number = 1000, height: number = 800) {
    this.simulation = d3.forceSimulation<PhysicsNode, PhysicsLink>()
      .force('charge', d3.forceManyBody<PhysicsNode>().strength(-350))
      .force('center', d3.forceCenter<PhysicsNode>(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide<PhysicsNode>().radius(45).strength(0.8))
      .force('link', d3.forceLink<PhysicsNode, PhysicsLink>()
        .id((d) => d.id)
        .distance(140)
        .strength(0.4)
      )
      .alphaDecay(0.02)
      .alphaTarget(0.005);

    this.simulation.on('tick', () => {
      if (this.onTickCallback) {
        this.onTickCallback();
      }
    });
  }

  public updateGraph(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number): void {
    const currentPhysicsNodes = this.simulation.nodes();
    const existingMap = new Map<string, PhysicsNode>(currentPhysicsNodes.map(n => [n.id, n]));

    // 1. Mapear nodos manteniendo posiciones existentes para animación fluida
    const newPhysicsNodes: PhysicsNode[] = nodes.map((node, idx) => {
      const existing = existingMap.get(node.id);
      if (existing) {
        return existing;
      } else {
        // Inicializar cerca del centro con pequeña varianza
        const angle = idx * 0.5;
        const radius = 50 + (idx % 5) * 20;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      }
    });

    this.nodesMap = new Map(newPhysicsNodes.map(n => [n.id, n]));

    // 2. Mapear aristas (links)
    const newLinks: PhysicsLink[] = edges
      .filter(e => this.nodesMap.has(e.source) && this.nodesMap.has(e.target))
      .map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      }));

    this.links = newLinks;

    // 3. Actualizar fuerzas de la simulación
    this.simulation.nodes(newPhysicsNodes);

    const linkForce = this.simulation.force<d3.ForceLink<PhysicsNode, PhysicsLink>>('link');
    if (linkForce) {
      linkForce.links(this.links);
    }

    const centerForce = this.simulation.force<d3.ForceCenter<PhysicsNode>>('center');
    if (centerForce) {
      centerForce.x(width / 2).y(height / 2);
    }

    // Reiniciar alfa para que los nuevos nodos se acomoden suavemente
    this.simulation.alpha(0.3).restart();
  }

  public onTick(callback: () => void): void {
    this.onTickCallback = callback;
  }

  public getPositions(): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    this.simulation.nodes().forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        positions.set(node.id, { x: node.x, y: node.y });
      }
    });
    return positions;
  }

  public dragStart(nodeId: string): void {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
      this.simulation.alphaTarget(0.3).restart();
    }
  }

  public drag(nodeId: string, x: number, y: number): void {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }

  public dragEnd(nodeId: string): void {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
      this.simulation.alphaTarget(0.005);
    }
  }

  public stop(): void {
    this.simulation.stop();
  }
}
