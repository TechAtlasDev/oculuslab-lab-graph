import type { GraphNode, GraphEdge } from '../../types';
import type { NodePosition } from './layout';
import type { Viewport } from './culling';

export interface RenderConfig {
  nodeRadius: number;
  showLabels: boolean;
}

export function renderGraphToCanvas(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, NodePosition>,
  visibleNodeIds: Set<string>,
  viewport: Viewport,
  config: RenderConfig = { nodeRadius: 18, showLabels: true }
): void {
  ctx.save();
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  ctx.scale(viewport.zoom, viewport.zoom);
  ctx.translate(-viewport.x, -viewport.y);

  // Render Edges
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';

  edges.forEach((edge) => {
    const srcPos = positions.get(edge.source);
    const tgtPos = positions.get(edge.target);

    if (srcPos && tgtPos && (visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target))) {
      ctx.beginPath();
      ctx.moveTo(srcPos.x, srcPos.y);
      ctx.lineTo(tgtPos.x, tgtPos.y);
      ctx.stroke();
    }
  });

  // Render Nodes
  nodes.forEach((node) => {
    if (!visibleNodeIds.has(node.id)) return;
    const pos = positions.get(node.id);
    if (!pos) return;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, config.nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node.label);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    if (config.showLabels) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, pos.x, pos.y + config.nodeRadius + 16);
    }
  });

  ctx.restore();
}

function getNodeColor(label: string): string {
  switch (label) {
    case 'Gene': return '#3b82f6';
    case 'Protein': return '#10b981';
    case 'Disease': return '#ef4444';
    case 'Drug': return '#8b5cf6';
    case 'Pathway': return '#f59e0b';
    default: return '#6b7280';
  }
}
