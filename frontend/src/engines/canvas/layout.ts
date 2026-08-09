import type { GraphNode } from '../../types';

export interface NodePosition {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export type LayoutAlgorithm = 'force-directed' | 'circular' | 'grid' | 'hierarchical';

export function computeLayout(
  nodes: GraphNode[],
  algorithm: LayoutAlgorithm = 'circular',
  width: number = 800,
  height: number = 600
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const count = nodes.length;

  if (count === 0) return positions;

  switch (algorithm) {
    case 'circular': {
      const radius = Math.min(width, height) / 3;
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
      const stepX = width / (cols + 1);
      const stepY = height / (cols + 1);
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
        const dist = 50 + idx * 15;
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
