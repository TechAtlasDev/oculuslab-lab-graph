import type { GraphNode, GraphEdge } from '../../types';
import type { NodePosition } from './layout';
import type { Viewport } from './culling';

export interface RenderConfig {
  nodeRadius: number;
  showLabels: boolean;
  selectedNodeId?: string | null;
}

export function renderGraphToCanvas(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, NodePosition>,
  visibleNodeIds: Set<string>,
  viewport: Viewport,
  config: RenderConfig = { nodeRadius: 22, showLabels: true }
): void {
  ctx.save();
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  // 1. Fondo de Grid Excalidraw (Patrón de puntos o cuadrícula)
  drawExcalidrawGrid(ctx, viewport);

  ctx.save();
  // Aplicar Zoom y Pan (Transformación del viewport)
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.zoom, viewport.zoom);

  // 2. Renderizar Aristas / Vértices con estilo Sketch/Excalidraw
  edges.forEach((edge) => {
    const srcPos = positions.get(edge.source);
    const tgtPos = positions.get(edge.target);

    if (srcPos && tgtPos && (visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target))) {
      ctx.beginPath();
      ctx.moveTo(srcPos.x, srcPos.y);
      ctx.lineTo(tgtPos.x, tgtPos.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.stroke();

      // Etiqueta de la arista opcional
      if (viewport.zoom > 0.7) {
        const midX = (srcPos.x + tgtPos.x) / 2;
        const midY = (srcPos.y + tgtPos.y) / 2;
        ctx.font = '11px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(edge.type, midX, midY - 4);
      }
    }
  });

  // 3. Renderizar Nodos / Entidades con tarjeta Excalidraw
  nodes.forEach((node) => {
    if (!visibleNodeIds.has(node.id)) return;
    const pos = positions.get(node.id);
    if (!pos) return;

    const isSelected = config.selectedNodeId === node.id;
    const radius = isSelected ? config.nodeRadius + 4 : config.nodeRadius;

    // Sombra suave Excalidraw
    ctx.beginPath();
    ctx.arc(pos.x + 3, pos.y + 3, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fill();

    // Círculo del Nodo
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node.label);
    ctx.fill();
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeStyle = isSelected ? '#38bdf8' : '#ffffff';
    ctx.stroke();

    // Etiqueta principal del nodo
    if (config.showLabels) {
      ctx.font = isSelected ? 'bold 15px sans-serif' : '14px sans-serif';
      ctx.fillStyle = isSelected ? '#38bdf8' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, pos.x, pos.y + radius + 18);

      // Subetiqueta de tipo
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`(${node.label})`, pos.x, pos.y + radius + 32);
    }
  });

  ctx.restore();
  ctx.restore();
}

function drawExcalidrawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  const gridSize = 30 * viewport.zoom;
  const offsetX = viewport.x % gridSize;
  const offsetY = viewport.y % gridSize;

  ctx.save();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';

  for (let x = offsetX; x < viewport.width; x += gridSize) {
    for (let y = offsetY; y < viewport.height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
}

function getNodeColor(label: string): string {
  switch (label) {
    case 'Gene': return '#2563eb';
    case 'Protein': return '#059669';
    case 'Disease': return '#dc2626';
    case 'Drug': return '#7c3aed';
    case 'Pathway': return '#d97706';
    case 'BiologicalProcess': return '#0891b2';
    default: return '#475569';
  }
}
