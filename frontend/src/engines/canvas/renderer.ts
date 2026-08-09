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
  // 1. Fondo Blanco Puro Excalidraw
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  // Patrón de Puntos de la Cuadrícula Infinita (Gris Suave)
  drawExcalidrawGrid(ctx, viewport);

  ctx.save();
  // Aplicar Transformación de Paneo y Zoom (Cámara Excalidraw)
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.zoom, viewport.zoom);

  // 2. Renderizar Aristas / Conexiones
  edges.forEach((edge) => {
    const srcPos = positions.get(edge.source);
    const tgtPos = positions.get(edge.target);

    if (srcPos && tgtPos && (visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target))) {
      ctx.beginPath();
      ctx.moveTo(srcPos.x, srcPos.y);
      ctx.lineTo(tgtPos.x, tgtPos.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cbd5e1'; // slate-300
      ctx.stroke();

      if (viewport.zoom > 0.6) {
        const midX = (srcPos.x + tgtPos.x) / 2;
        const midY = (srcPos.y + tgtPos.y) / 2;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#64748b'; // slate-500
        ctx.textAlign = 'center';
        ctx.fillText(edge.type, midX, midY - 6);
      }
    }
  });

  // 3. Renderizar Nodos / Tarjetas de Entidad con la Paleta del Proyecto
  nodes.forEach((node) => {
    if (!visibleNodeIds.has(node.id)) return;
    const pos = positions.get(node.id);
    if (!pos) return;

    const isSelected = config.selectedNodeId === node.id;
    const radius = isSelected ? config.nodeRadius + 4 : config.nodeRadius;

    // Sombra proyectada suave estilo Excalidraw
    ctx.beginPath();
    ctx.arc(pos.x + 3, pos.y + 3, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fill();

    // Círculo del Nodo usando la paleta oficial
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node.label);
    ctx.fill();
    ctx.lineWidth = isSelected ? 3.5 : 2;
    ctx.strokeStyle = isSelected ? '#0284c7' : '#ffffff'; // sky-600 al seleccionar
    ctx.stroke();

    // Nombre y Etiqueta del Nodo (Alta legibilidad sobre fondo blanco)
    if (config.showLabels) {
      ctx.font = isSelected ? 'bold 15px sans-serif' : '14px sans-serif';
      ctx.fillStyle = isSelected ? '#0369a1' : '#0f172a'; // slate-900
      ctx.textAlign = 'center';
      ctx.fillText(node.name, pos.x, pos.y + radius + 18);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#64748b'; // slate-500
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
  ctx.fillStyle = '#cbd5e1'; // slate-300 para puntos sobre blanco

  for (let x = offsetX; x < viewport.width; x += gridSize) {
    for (let y = offsetY; y < viewport.height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Paleta de Colores del Proyecto (Harmonious Tailored Colors)
function getNodeColor(label: string): string {
  switch (label) {
    case 'Gene': return '#2563eb';           // Azul primario genómico
    case 'Protein': return '#059669';        // Verde esmeralda proteico
    case 'Disease': return '#dc2626';        // Rojo patología
    case 'Drug': return '#7c3aed';           // Violeta farmacológico
    case 'Pathway': return '#d97706';        // Ámbar ruta metabólica
    case 'BiologicalProcess': return '#0891b2'; // Cian proceso biológico
    default: return '#475569';
  }
}
