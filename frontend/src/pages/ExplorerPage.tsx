import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { GraphNode, GraphEdge, Collection } from '../types';
import { ForceGraphPhysicsEngine } from '../engines/canvas/ForceGraphPhysicsEngine';
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
  X,
  Play,
  Pause,
} from '@phosphor-icons/react';

export const ExplorerPage: React.FC = () => {
  const { graphDataService, workspaceService } = useDomainServices();

  // Estados del Grafo
  const [query, setQuery] = useState<string>('TP53');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Instancia Persistente del Motor Físico D3 (Inicialización segura)
  const physicsEngineRef = useRef<ForceGraphPhysicsEngine | null>(null);
  if (physicsEngineRef.current == null) {
    physicsEngineRef.current = new ForceGraphPhysicsEngine(window.innerWidth, window.innerHeight);
  }

  // Estado del Viewport (Pan y Zoom)
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 1,
  });

  // Estados de Arrastre (Drag de Nodo vs Pan de Fondo)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Control de Carga Dinámica al Desplazarse
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [loadingNeighbors, setLoadingNeighbors] = useState<boolean>(false);

  // Modal para guardar en colección
  const [isAddToColOpen, setIsAddToColOpen] = useState<boolean>(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Expansión Automática de Nodos al Desplazarte por la Pizarra
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
        const updatedNodes = [...prevNodes, ...addedNodes];

        setEdges(prevEdges => {
          const existingEdgeIds = new Set(prevEdges.map(e => e.id));
          const addedEdges = allNewEdges.filter(e => !existingEdgeIds.has(e.id));
          const updatedEdges = [...prevEdges, ...addedEdges];

          // Actualizar Simulación Física en Vivo
          physicsEngineRef.current?.updateGraph(updatedNodes, updatedEdges, viewport.width, viewport.height);
          return updatedEdges;
        });

        return updatedNodes;
      });

      setExpandedNodeIds(prev => {
        const updated = new Set(prev);
        newToExpand.forEach(id => updated.add(id));
        return updated;
      });
    }

    setLoadingNeighbors(false);
  }, [expandedNodeIds, loadingNeighbors, graphDataService, viewport.width, viewport.height]);

  // Renderizar en Canvas usando las Posiciones Físicas en Real-Time
  const renderFrame = useCallback(() => {
    if (!canvasRef.current || !physicsEngineRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const positions = physicsEngineRef.current.getPositions();
    const visibleIds = cullNodes(positions, viewport);

    renderGraphToCanvas(ctx, nodes, edges, positions, visibleIds, viewport, {
      nodeRadius: 24,
      showLabels: true,
      selectedNodeId: selectedNode?.id,
    });

    void expandVisibleNodesNeighbors(visibleIds);
  }, [nodes, edges, viewport, selectedNode, expandVisibleNodesNeighbors]);

  // Suscribir callback de tick de la física D3
  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.onTick(() => {
        renderFrame();
      });
    }
  }, [renderFrame]);

  // Carga Inicial del Grafo
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

      setNodes(subgraph.nodes);
      setEdges(subgraph.edges);
      setExpandedNodeIds(new Set([root.id]));

      // Actualizar Motor Físico con los nuevos nodos y aristas
      physicsEngineRef.current?.updateGraph(subgraph.nodes, subgraph.edges, viewport.width, viewport.height);

      // Centrar el viewport
      setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));
    } else {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  }, [graphDataService, workspaceService, viewport.width, viewport.height]);

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

  // Actualizar el estado guardado del nodo seleccionado
  useEffect(() => {
    if (selectedNode) {
      void workspaceService.getSavedNodeIds().then((saved: string[]) => {
        setIsSaved(saved.includes(selectedNode.id));
      });
    }
  }, [selectedNode, workspaceService]);

  // Loop de Redimensionamiento
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      setViewport(prev => ({ ...prev, width, height }));
    }
  }, []);

  // Interacciones Táctiles / Drag & Drop Físico de Nodos y Paneo de Cámara
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas || !physicsEngineRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = (clickX - viewport.x) / viewport.zoom;
    const worldY = (clickY - viewport.y) / viewport.zoom;

    const positions = physicsEngineRef.current.getPositions();
    let clickedNodeId: string | null = null;

    positions.forEach((pos, id) => {
      const dist = Math.hypot(pos.x - worldX, pos.y - worldY);
      if (dist <= 28) {
        clickedNodeId = id;
      }
    });

    if (clickedNodeId) {
      const found = nodes.find(n => n.id === clickedNodeId);
      if (found) setSelectedNode(found);

      // Iniciar Arrastre Físico del Nodo
      setDraggedNodeId(clickedNodeId);
      physicsEngineRef.current.dragStart(clickedNodeId);
    } else {
      // Iniciar Desplazamiento de Cámara (Pan)
      setIsPanning(true);
      setPanStart({ x: clickX - viewport.x, y: clickY - viewport.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (draggedNodeId && physicsEngineRef.current) {
      // Arrastrar Nodo en Coordenadas del Mundo Físico
      const worldX = (currentX - viewport.x) / viewport.zoom;
      const worldY = (currentY - viewport.y) / viewport.zoom;
      physicsEngineRef.current.drag(draggedNodeId, worldX, worldY);
      renderFrame();
    } else if (isPanning) {
      // Desplazar Cámara
      setViewport(prev => ({
        ...prev,
        x: currentX - panStart.x,
        y: currentY - panStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId && physicsEngineRef.current) {
      physicsEngineRef.current.dragEnd(draggedNodeId);
      setDraggedNodeId(null);
    }
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.3), 3);

    setViewport(prev => ({ ...prev, zoom: newZoom }));
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
    <div ref={containerRef} className="relative w-full h-full bg-white overflow-hidden select-none">
      {/* Canvas Fullscreen con Pizarra de Física Automática en Vivo */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Barra Flotante Superior: Buscador y Controles */}
      <div className="absolute top-4 left-4 right-4 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
        <form onSubmit={handleSearchForm} className="flex gap-2 pointer-events-auto bg-white/90 backdrop-blur border border-border p-2 rounded-xl shadow-md">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el grafo..."
            className="w-56 text-base bg-white"
          />
          <Button type="submit" className="gap-2 text-base font-medium">
            <MagnifyingGlass size={18} />
            Buscar
          </Button>
        </form>

        <div className="flex items-center gap-3 pointer-events-auto bg-white/90 backdrop-blur border border-border p-2 rounded-xl shadow-md">
          {loadingNeighbors && (
            <Badge variant="secondary" className="gap-2 text-base animate-pulse">
              <Sparkle size={14} className="animate-spin text-primary" /> Auto-organizándose...
            </Badge>
          )}

          <Button onClick={handleOpenAddToCol} variant="secondary" className="gap-2 text-base font-medium">
            <Bookmarks size={18} />
            Guardar Grafo
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsSimulating(!isSimulating)}
            className="gap-2 text-base font-medium"
          >
            {isSimulating ? <Pause size={18} /> : <Play size={18} />}
            {isSimulating ? 'Pausar Física' : 'Activar Física'}
          </Button>
        </div>
      </div>

      {/* Panel Flotante Lateral de Inspección de Nodo Seleccionado */}
      {selectedNode && (
        <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur border border-border rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <Badge variant="secondary" className="text-base font-medium">
              {selectedNode.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} title="Cerrar panel">
              <X size={18} />
            </Button>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">{selectedNode.name}</h3>
            <p className="text-base text-slate-600 mt-1">{selectedNode.description}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 border border-slate-200">
            <h4 className="text-base font-semibold text-slate-900">Propiedades:</h4>
            <ul className="text-base space-y-1 text-slate-600">
              {Object.entries(selectedNode.properties).map(([k, v]) => (
                <li key={k}>
                  <strong className="text-slate-900">{k}:</strong> {String(v)}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={toggleSave}
            variant={isSaved ? "outline" : "default"}
            className="w-full gap-2 text-base font-medium"
          >
            {isSaved ? <BookmarkSimple size={20} weight="fill" /> : <PlusCircle size={20} />}
            {isSaved ? 'Guardado' : 'Guardar Nodo'}
          </Button>
        </div>
      )}

      {/* Controles Flotantes de Zoom y Paneo Estilo Excalidraw (Abajo a la Derecha) */}
      <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur border border-border rounded-xl p-2 flex items-center gap-2 shadow-xl">
        <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Alejar (Zoom Out)">
          <Minus size={18} />
        </Button>
        <span className="text-base font-mono font-semibold px-2 text-slate-800">
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

      {/* Indicador Flotante de Paneo e Interactividad Físico (Abajo a la Izquierda) */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur border border-border rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-md">
        <Hand size={18} className="text-primary" />
        <span className="text-base text-slate-600 font-medium">
          Arrastra nodos o desplázate • {nodes.length} Nodos Auto-Organizados
        </span>
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
