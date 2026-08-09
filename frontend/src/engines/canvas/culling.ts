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
  margin: number = 100
): Set<string> {
  const visible = new Set<string>();

  // Convertir límites de la pantalla a coordenadas del mundo infinito del lienzo
  const worldLeft = (-viewport.x - margin) / viewport.zoom;
  const worldRight = (-viewport.x + viewport.width + margin) / viewport.zoom;
  const worldTop = (-viewport.y - margin) / viewport.zoom;
  const worldBottom = (-viewport.y + viewport.height + margin) / viewport.zoom;

  positions.forEach((pos, id) => {
    if (pos.x >= worldLeft && pos.x <= worldRight && pos.y >= worldTop && pos.y <= worldBottom) {
      visible.add(id);
    }
  });

  return visible;
}
