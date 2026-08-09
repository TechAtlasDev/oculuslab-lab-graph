import type { GraphNode } from '../../types';

export interface NodePosition {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export type LayoutAlgorithm = 'force-directed' | 'circular' | 'grid' | 'infinite-mesh';

export function computeLayout(
  nodes: GraphNode[],
  algorithm: LayoutAlgorithm = 'infinite-mesh',
  width: number = 1000,
  height: number = 800
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const count = nodes.length;

  if (count === 0) return positions;

  switch (algorithm) {
    case 'infinite-mesh': {
      // Disposición de malla expansiva (tipo mapa mental Excalidraw)
      const cols = Math.ceil(Math.sqrt(count * 1.5));
      const spacingX = 220;
      const spacingY = 180;
      const centerX = width / 2;
      const centerY = height / 2;

      nodes.forEach((node, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        // Perturbación aleatoria suave para evitar alineación rígida estilo boceto
        const jitterX = (Math.sin(idx * 7) * 20);
        const jitterY = (Math.cos(idx * 11) * 20);

        positions.set(node.id, {
          x: centerX + (col - cols / 2) * spacingX + jitterX,
          y: centerY + (row - Math.ceil(count / cols) / 2) * spacingY + jitterY,
        });
      });
      break;
    }
    case 'circular': {
      const radius = Math.min(width, height) / 2.5;
      const centerX = width / 2;
      const centerY = height / 2;
      nodes.forEach((node, idx) => {
        const angle = (idx / count) * 2 * Math.PI;
        positions.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      });
      break;
    }
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(count));
      const stepX = 200;
      const stepY = 160;
      nodes.forEach((node, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        positions.set(node.id, {
          x: (col + 1) * stepX,
          y: (row + 1) * stepY,
        });
      });
      break;
    }
    case 'force-directed':
    default: {
      const centerX = width / 2;
      const centerY = height / 2;
      nodes.forEach((node, idx) => {
        const angle = idx * 0.5;
        const dist = 80 + idx * 25;
        positions.set(node.id, {
          x: centerX + dist * Math.cos(angle),
          y: centerY + dist * Math.sin(angle),
        });
      });
      break;
    }
  }

  return positions;
}
