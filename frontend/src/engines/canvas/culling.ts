import type { NodePosition } from './layout';

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export function cullNodes(
  positions: Map<string, NodePosition>,
  viewport: Viewport,
  margin: number = 50
): Set<string> {
  const visible = new Set<string>();

  const minX = (viewport.x - margin) / viewport.zoom;
  const maxX = (viewport.x + viewport.width + margin) / viewport.zoom;
  const minY = (viewport.y - margin) / viewport.zoom;
  const maxY = (viewport.y + viewport.height + margin) / viewport.zoom;

  positions.forEach((pos, id) => {
    if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
      visible.add(id);
    }
  });

  return visible;
}
