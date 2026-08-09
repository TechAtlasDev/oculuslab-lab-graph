import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { GraphNode, GraphEdge, Collection } from '../types';
import { computeLayout } from '../engines/canvas/layout';
import type { LayoutAlgorithm, NodePosition } from '../engines/canvas/layout';
import { cullNodes } from '../engines/canvas/culling';
import type { Viewport } from '../engines/canvas/culling';
import { renderGraphToCanvas } from '../engines/canvas/renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MagnifyingGlass,
  BookmarkSimple,
  PlusCircle,
  Bookmarks,
  Check,
  Hand,
  Plus,
  Minus,
  ArrowsOut,
  Sparkle,
} from '@phosphor-icons/react';

export const ExplorerPage: React.FC = () => {
  const { graphDataService, workspaceService } = useDomainServices();

  // Estados del Grafo
  const [query, setQuery] = useState<string>('TP53');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [layoutAlg, setLayoutAlg] = useState<LayoutAlgorithm>('infinite-mesh');

  // Estado del Viewport de la Pizarra Excalidraw (Pan y Zoom)
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: 900,
    height: 600,
    zoom: 1,
  });

  // Estados de Interacción (Drag / Pan)
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Control de Renderizado bajo Demanda al Desplazarse
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [loadingNeighbors, setLoadingNeighbors] = useState<boolean>(false);

  // Modal para agregar a colección
  const [isAddToColOpen, setIsAddToColOpen] = useState<boolean>(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Carga e Inicialización del Grafo
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const searchResults = await graphDataService.searchGraph(searchQuery);
    if (searchResults.length > 0) {
      const root = searchResults[0];
      setSelectedNode(root);
      await workspaceService.recordNodeVisit(root.id);

      const neighborEdges = await graphDataService.fetchNeighbors(root.id);
      const neighborIds = Array.from(new Set(neighborEdges.flatMap((e: GraphEdge) => [e.source, e.target])));

      const subgraph = await graphDataService.fetchSubgraph([root.id, ...neighborIds]);
      const initialPositions = computeLayout(subgraph.nodes, layoutAlg, viewport.width, viewport.height);

      setNodes(subgraph.nodes);
      setEdges(subgraph.edges);
      setPositions(initialPositions);
      setExpandedNodeIds(new Set([root.id]));

      // Centrar viewport
      setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));
    } else {
      setNodes([]);
      setEdges([]);
      setPositions(new Map());
      setSelectedNode(null);
    }
  }, [graphDataService, workspaceService, layoutAlg, viewport.width, viewport.height]);

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    void executeSearch(query);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      if (active) {
        await executeSearch('TP53');
      }
    })();
    return () => {
      active = false;
    };
  }, [executeSearch]);

  // Cambiar layout de nodos
  const handleLayoutChange = (newAlg: LayoutAlgorithm) => {
    setLayoutAlg(newAlg);
    if (nodes.length > 0) {
      const computed = computeLayout(nodes, newAlg, viewport.width, viewport.height);
      setPositions(computed);
    }
  };

  // Actualizar guardado de nodo seleccionado
  useEffect(() => {
    if (selectedNode) {
      void workspaceService.getSavedNodeIds().then((saved: string[]) => {
        setIsSaved(saved.includes(selectedNode.id));
      });
    }
  }, [selectedNode, workspaceService]);

  // 2. Expansión Dinámica de Nodos al Desplazarse o Hacer Clic (Renderizado Infinito)
  const expandVisibleNodesNeighbors = useCallback(async (visibleIds: Set<string>) => {
    if (loadingNeighbors) return;
    const newToExpand: string[] = [];

    visibleIds.forEach((id) => {
      if (!expandedNodeIds.has(id)) {
        newToExpand.push(id);
      }
    });

    if (newToExpand.length === 0) return;

    setLoadingNeighbors(true);
    const allNewEdges: GraphEdge[] = [];
    const newNeighborIds = new Set<string>();

    for (const nodeId of newToExpand) {
      const neighbors = await graphDataService.fetchNeighbors(nodeId);
      allNewEdges.push(...neighbors);
      neighbors.forEach(e => {
        newNeighborIds.add(e.source);
        newNeighborIds.add(e.target);
      });
    }

    if (newNeighborIds.size > 0) {
      const fetchedSubgraph = await graphDataService.fetchSubgraph(Array.from(newNeighborIds));

      setNodes(prevNodes => {
        const existingIds = new Set(prevNodes.map(n => n.id));
        const addedNodes = fetchedSubgraph.nodes.filter(n => !existingIds.has(n.id));
        const updated = [...prevNodes, ...addedNodes];

        // Recalcular posiciones del mapa infinito para incluir nuevos nodos
        const newPositions = computeLayout(updated, layoutAlg, viewport.width, viewport.height);
        setPositions(newPositions);

        return updated;
      });

      setEdges(prevEdges => {
        const existingEdgeIds = new Set(prevEdges.map(e => e.id));
        const addedEdges = allNewEdges.filter(e => !existingEdgeIds.has(e.id));
        return [...prevEdges, ...addedEdges];
      });

      setExpandedNodeIds(prev => {
        const updated = new Set(prev);
        newToExpand.forEach(id => updated.add(id));
        return updated;
      });
    }

    setLoadingNeighbors(false);
  }, [expandedNodeIds, loadingNeighbors, graphDataService]);

  // 3. Loop de Renderizado en Canvas Engine (Excalidraw Style + Culling)
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Actualizar dimensiones físicas del Canvas
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      setViewport(prev => ({ ...prev, width: rect.width, height: rect.height }));
    }

    const visibleIds = cullNodes(positions, viewport);
    renderGraphToCanvas(ctx, nodes, edges, positions, visibleIds, viewport, {
      nodeRadius: 22,
      showLabels: true,
      selectedNodeId: selectedNode?.id,
    });

    // Expandir nodos visibles dinámicamente conforme te desplazas
    void expandVisibleNodesNeighbors(visibleIds);
  }, [nodes, edges, positions, viewport, selectedNode, expandVisibleNodesNeighbors]);

  // 4. Interacciones del Canvas Excalidraw (Pan & Zoom & Selección)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Clic izquierdo
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Verificar si se hizo clic en un nodo existente en coordenadas del mundo
    const worldX = (clickX - viewport.x) / viewport.zoom;
    const worldY = (clickY - viewport.y) / viewport.zoom;

    let clickedNode: GraphNode | null = null;
    positions.forEach((pos, id) => {
      const dist = Math.hypot(pos.x - worldX, pos.y - worldY);
      if (dist <= 25) {
        const found = nodes.find(n => n.id === id);
        if (found) clickedNode = found;
      }
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
    } else {
      // Iniciar Pan/Desplazamiento
      setIsPanning(true);
      setPanStart({ x: clickX - viewport.x, y: clickY - viewport.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setViewport(prev => ({
      ...prev,
      x: currentX - panStart.x,
      y: currentY - panStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.3), 3);

    setViewport(prev => ({
      ...prev,
      zoom: newZoom,
    }));
  };

  const handleZoomIn = () => setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }));
  const handleZoomOut = () => setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.3) }));
  const handleResetPan = () => setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));

  // Modal para agregar subgrafo a colección
  const loadCollectionsForModal = useCallback(async () => {
    const cols = await workspaceService.getCollections();
    setCollections(cols);
    if (cols.length > 0 && !targetCollectionId) {
      setTargetCollectionId(cols[0].id);
    }
  }, [workspaceService, targetCollectionId]);

  const handleOpenAddToCol = () => {
    void loadCollectionsForModal();
    setAddedSuccess(false);
    setIsAddToColOpen(true);
  };

  const handleAddGraphToCollection = async () => {
    if (!targetCollectionId) return;

    for (const node of nodes) {
      await workspaceService.addNodeToCollection(targetCollectionId, node.id);
    }
    for (const edge of edges) {
      await workspaceService.addEdgeToCollection(targetCollectionId, edge.id);
    }

    setAddedSuccess(true);
    setTimeout(() => {
      setIsAddToColOpen(false);
      setAddedSuccess(false);
    }, 1200);
  };

  const toggleSave = async () => {
    if (!selectedNode) return;
    const newState = await workspaceService.toggleSaveNode(selectedNode.id);
    setIsSaved(newState);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Navegador Infinito Excalidraw</h1>
          <p className="text-muted-foreground text-lg">
            Pizarra infinita con renderizado dinámico al desplazarte, paneo, zoom y expansión de nodos.
          </p>
        </div>

        {/* Buscador */}
        <form onSubmit={handleSearchForm} className="flex gap-3">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar gen, proteína, enfermedad..."
            className="w-64 text-base"
          />
          <Button type="submit" className="gap-2 text-base font-medium">
            <MagnifyingGlass size={20} />
            Buscar
          </Button>
        </form>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Canvas Engine Pizarra Excalidraw Display */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Hand size={22} className="text-primary" />
                Pizarra Infinita ({nodes.length} Nodos Renderizados)
              </h2>
              {loadingNeighbors && (
                <Badge variant="secondary" className="gap-2 text-base animate-pulse">
                  <Sparkle size={14} className="animate-spin" /> Cargando Nodos...
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleOpenAddToCol} variant="secondary" className="gap-2 text-base font-medium">
                <Bookmarks size={20} />
                Guardar Grafo
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-base text-muted-foreground">Layout:</span>
                <Select
                  value={layoutAlg}
                  onValueChange={(val) => handleLayoutChange(val as LayoutAlgorithm)}
                >
                  <SelectTrigger className="w-40 text-base">
                    <SelectValue placeholder="Seleccionar layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infinite-mesh" className="text-base">Malla Infinita</SelectItem>
                    <SelectItem value="circular" className="text-base">Circular</SelectItem>
                    <SelectItem value="grid" className="text-base">Grid</SelectItem>
                    <SelectItem value="force-directed" className="text-base">Fuerza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Área de Lienzo Interactivo con Controles flotantes */}
          <div className="relative border border-border rounded-lg bg-slate-950 overflow-hidden select-none">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-96 cursor-grab active:cursor-grabbing"
            />

            {/* Controles de Zoom y Paneo Flotantes Estilo Excalidraw */}
            <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur border border-border rounded-lg p-2 flex items-center gap-2 shadow-lg">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Alejar (Zoom Out)">
                <Minus size={18} />
              </Button>
              <span className="text-base font-mono font-semibold px-2 text-foreground">
                {Math.round(viewport.zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Acercar (Zoom In)">
                <Plus size={18} />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" onClick={handleResetPan} title="Centrar Pizarra">
                <ArrowsOut size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Inspección de Nodo Seleccionado */}
        <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Detalle de la Entidad</h2>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="text-base font-medium">
                  {selectedNode.label}
                </Badge>
                <h3 className="text-2xl font-bold text-foreground mt-2">{selectedNode.name}</h3>
                <p className="text-base text-muted-foreground mt-1">{selectedNode.description}</p>
              </div>

              <div className="p-4 bg-muted/40 rounded-lg space-y-2 border border-border">
                <h4 className="text-base font-semibold text-foreground">Propiedades:</h4>
                <ul className="text-base space-y-1 text-muted-foreground">
                  {Object.entries(selectedNode.properties).map(([k, v]) => (
                    <li key={k}>
                      <strong className="text-foreground">{k}:</strong> {String(v)}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={toggleSave}
                variant={isSaved ? "outline" : "default"}
                className="w-full h-auto py-3 gap-2 text-base font-medium"
              >
                {isSaved ? <BookmarkSimple size={22} weight="fill" /> : <PlusCircle size={22} />}
                {isSaved ? 'Guardado en Workspace' : 'Guardar Nodo en Workspace'}
              </Button>
            </div>
          ) : (
            <p className="text-base text-muted-foreground">Haz clic en cualquier nodo de la pizarra para inspeccionar sus datos.</p>
          )}
        </div>
      </div>

      {/* Modal para Añadir Grafo a Colección */}
      <Dialog open={isAddToColOpen} onOpenChange={setIsAddToColOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Guardar Grafo en Colección</DialogTitle>
            <DialogDescription className="text-base">
              Guarda los {nodes.length} nodos y {edges.length} aristas de la pizarra en una colección.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {collections.length === 0 ? (
              <p className="text-base text-muted-foreground">
                No tienes colecciones creadas. Ve al Workspace para crear una nueva colección.
              </p>
            ) : (
              <div>
                <label className="block text-base font-medium text-foreground mb-1">Selecciona la Colección</label>
                <Select value={targetCollectionId} onValueChange={(val) => setTargetCollectionId(val || '')}>
                  <SelectTrigger className="w-full text-base">
                    <SelectValue placeholder="Elegir colección destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id} className="text-base">
                        {col.name} ({col.nodeIds.length} nodos guardados)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addedSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-md flex items-center gap-2 text-base font-medium">
                <Check size={20} />
                ¡Grafo agregado a la colección exitosamente!
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsAddToColOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddGraphToCollection}
              disabled={collections.length === 0 || addedSuccess}
              className="gap-2 text-base font-medium"
            >
              Guardar Grafo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
