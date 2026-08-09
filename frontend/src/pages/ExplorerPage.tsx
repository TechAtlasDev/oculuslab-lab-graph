import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { GraphNode, GraphEdge, Collection } from '../types';
import { ForceGraphPhysicsEngine } from '../engines/canvas/ForceGraphPhysicsEngine';
import { cullNodes } from '../engines/canvas/culling';
import type { Viewport } from '../engines/canvas/culling';
import { renderGraphToCanvas, type SelectionBox } from '../engines/canvas/renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  Camera,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CheckSquare,
  Gear,
  Selection,
  Sliders,
} from '@phosphor-icons/react';

export type CanvasInteractionMode = 'select' | 'pan';

export const ExplorerPage: React.FC = () => {
  const { graphDataService, workspaceService } = useDomainServices();

  // Estados del Grafo
  const [query, setQuery] = useState<string>('TP53');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Modo de Interacción (Por Defecto: 'select') y Selección Múltiple
  const [activeMode, setActiveMode] = useState<CanvasInteractionMode>('select');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  
  // Caja de Selección Marquee (Click & Drag en el fondo)
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  
  // Instancia Persistente del Motor Físico D3 (Inicialización Lazy)
  const physicsEngineRef = useRef<ForceGraphPhysicsEngine | null>(null);

  const getPhysicsEngine = useCallback(() => {
    if (physicsEngineRef.current == null) {
      physicsEngineRef.current = new ForceGraphPhysicsEngine(window.innerWidth, window.innerHeight);
    }
    return physicsEngineRef.current;
  }, []);

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [nodeDistance, setNodeDistance] = useState<number>(() => {
    const saved = localStorage.getItem('optimuskg_node_distance');
    return saved ? Number(saved) : 140;
  });

  // Tecla Espacio Mantenida para Paneo Temporal Estilo Figma/Excalidraw
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Context Menu State
  const [contextMenuTargetNode, setContextMenuTargetNode] = useState<GraphNode | null>(null);

  const handleDistanceChange = (dist: number) => {
    setNodeDistance(dist);
    localStorage.setItem('optimuskg_node_distance', String(dist));
    getPhysicsEngine().setDistance(dist);
  };

  useEffect(() => {
    getPhysicsEngine().setDistance(nodeDistance);
  }, [nodeDistance, getPhysicsEngine]);

  // Estado del Viewport (Pan y Zoom)
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 1,
  });

  // Estados de Arrastre
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

  // Ref para rastrear estado de tecla Espacio sin re-suscribir listeners
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressedRef.current && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Expansión Automática de Nodos al Desplazarte
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

  // Renderizar en Canvas
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
      selectedNodeIds: selectedNodeIds,
      selectionBox: selectionBox,
    });

    void expandVisibleNodesNeighbors(visibleIds);
  }, [nodes, edges, viewport, selectedNode, selectedNodeIds, selectionBox, expandVisibleNodesNeighbors]);

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
      setSelectedNodeIds(new Set());

      physicsEngineRef.current?.updateGraph(subgraph.nodes, subgraph.edges, viewport.width, viewport.height);
      setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));
    } else {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedNodeIds(new Set());
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

  // Manejo de Interacción del Ratón (Clic Central / Rueda / Espacio / Marquee Selection)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !physicsEngineRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. Paneo con Clic Central (Boton 1), Tecla Espacio Mantenida, o Modo Paneo explícito
    if (e.button === 1 || isSpacePressed || (activeMode === 'pan' && e.button === 0)) {
      setIsPanning(true);
      setPanStart({ x: clickX - viewport.x, y: clickY - viewport.y });
      return;
    }

    if (e.button !== 0) return; // Ignorar otros botones (ej. Clic Derecho manejado por ContextMenu)

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

      // Selección individual / múltiple con Shift
      if (e.shiftKey) {
        setSelectedNodeIds(prev => {
          const updated = new Set(prev);
          if (updated.has(clickedNodeId!)) {
            updated.delete(clickedNodeId!);
          } else {
            updated.add(clickedNodeId!);
          }
          return updated;
        });
      } else if (!selectedNodeIds.has(clickedNodeId)) {
        setSelectedNodeIds(new Set([clickedNodeId]));
      }

      setDraggedNodeId(clickedNodeId);
      physicsEngineRef.current.dragStart(clickedNodeId);
    } else {
      // Clic en el Fondo en Modo Selección -> Iniciar Rectángulo de Selección Marquee Box
      if (activeMode === 'select') {
        if (!e.shiftKey) {
          setSelectedNodeIds(new Set());
        }
        setIsSelecting(true);
        setSelectionBox({ startX: clickX, startY: clickY, currentX: clickX, currentY: clickY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (draggedNodeId && physicsEngineRef.current) {
      // Arrastrar Nodo en Coordenadas Físicas
      const worldX = (currentX - viewport.x) / viewport.zoom;
      const worldY = (currentY - viewport.y) / viewport.zoom;
      physicsEngineRef.current.drag(draggedNodeId, worldX, worldY);
      renderFrame();
    } else if (isSelecting && selectionBox && physicsEngineRef.current) {
      // Actualizar Rectángulo de Selección Marquee Box
      const updatedBox = { ...selectionBox, currentX, currentY };
      setSelectionBox(updatedBox);

      // Calcular Nodos Abarcados por el Rectángulo
      const xMin = Math.min(updatedBox.startX, currentX);
      const xMax = Math.max(updatedBox.startX, currentX);
      const yMin = Math.min(updatedBox.startY, currentY);
      const yMax = Math.max(updatedBox.startY, currentY);

      const positions = physicsEngineRef.current.getPositions();
      const newlySelected = new Set<string>(e.shiftKey ? selectedNodeIds : []);

      positions.forEach((pos, id) => {
        const screenX = pos.x * viewport.zoom + viewport.x;
        const screenY = pos.y * viewport.zoom + viewport.y;

        if (screenX >= xMin && screenX <= xMax && screenY >= yMin && screenY <= yMax) {
          newlySelected.add(id);
        }
      });

      setSelectedNodeIds(newlySelected);
      renderFrame();
    } else if (isPanning) {
      // Paneo de Cámara
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
    setIsSelecting(false);
    setSelectionBox(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // 1. Ctrl + Rueda: Zoom In / Zoom Out
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.3), 3);
      setViewport(prev => ({ ...prev, zoom: newZoom }));
    } else if (e.shiftKey) {
      // 2. Shift + Rueda: Paneo Horizontal (Eje X)
      const panSpeed = 1.2;
      setViewport(prev => ({ ...prev, x: prev.x - e.deltaY * panSpeed }));
    } else {
      // 3. Rueda Solamente: Paneo Vertical (Eje Y)
      const panSpeed = 1.2;
      setViewport(prev => ({ ...prev, y: prev.y - e.deltaY * panSpeed }));
    }
  };

  // Manejador del Clic Derecho para ContextMenu
  const handleContextMenuTrigger = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      setContextMenuTargetNode(found || null);
      setSelectedNodeIds(prev => new Set(prev).add(clickedNodeId!));
    } else {
      setContextMenuTargetNode(null);
    }
  };

  // Capturar Imagen del Lienzo (Tomar Foto)
  const handleTakeSnapshot = () => {
    if (!canvasRef.current) return;
    const imageURI = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `optimuskg-pizarra-${Date.now()}.png`;
    link.href = imageURI;
    link.click();
  };

  const handleZoomIn = () => setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }));
  const handleZoomOut = () => setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.3) }));
  const handleResetPan = () => setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));

  // Modal para agregar subgrafo o nodos seleccionados a colección
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

    const targetNodes = selectedNodeIds.size > 0
      ? nodes.filter(n => selectedNodeIds.has(n.id))
      : nodes;

    for (const node of targetNodes) {
      await workspaceService.addNodeToCollection(targetCollectionId, node.id);
    }
    for (const edge of edges) {
      if (selectedNodeIds.size === 0 || (selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target))) {
        await workspaceService.addEdgeToCollection(targetCollectionId, edge.id);
      }
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
      {/* ContextMenu de Pizarra Excalidraw */}
      <ContextMenu>
        <ContextMenuTrigger className="w-full h-full block">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={handleContextMenuTrigger}
            className={`w-full h-full block ${
              isPanning || isSpacePressed ? 'cursor-grabbing' : activeMode === 'select' ? 'cursor-crosshair' : 'cursor-grab'
            }`}
          />
        </ContextMenuTrigger>

        {/* Menú Desplegable de Clic Derecho */}
        <ContextMenuContent className="w-64 bg-white border border-border rounded-xl p-2 shadow-2xl z-50">
          {contextMenuTargetNode ? (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-base font-bold text-slate-900">{contextMenuTargetNode.name}</p>
                <Badge variant="secondary" className="text-base font-medium mt-1">{contextMenuTargetNode.label}</Badge>
              </div>
              <ContextMenuItem
                onClick={async () => {
                  await workspaceService.toggleSaveNode(contextMenuTargetNode.id);
                  setIsSaved(true);
                }}
                className="gap-2 text-base font-medium cursor-pointer"
              >
                <BookmarkSimple size={18} />
                Guardar Nodo en Workspace
              </ContextMenuItem>
              <ContextMenuItem onClick={handleOpenAddToCol} className="gap-2 text-base font-medium cursor-pointer">
                <Bookmarks size={18} />
                Añadir Selección a Colección ({selectedNodeIds.size || 1})
              </ContextMenuItem>
            </>
          ) : (
            <>
              <div className="px-3 py-2 text-base font-semibold text-muted-foreground uppercase tracking-wider">
                Acciones de Pizarra
              </div>
              <ContextMenuItem onClick={handleZoomIn} className="gap-2 text-base font-medium cursor-pointer">
                <MagnifyingGlassPlus size={18} />
                Acercar (Zoom In)
              </ContextMenuItem>
              <ContextMenuItem onClick={handleZoomOut} className="gap-2 text-base font-medium cursor-pointer">
                <MagnifyingGlassMinus size={18} />
                Alejar (Zoom Out)
              </ContextMenuItem>
              <ContextMenuItem onClick={handleResetPan} className="gap-2 text-base font-medium cursor-pointer">
                <ArrowsOut size={18} />
                Centrar Vista de Pizarra
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleTakeSnapshot} className="gap-2 text-base font-medium cursor-pointer">
                <Camera size={18} className="text-primary" />
                Tomar Foto / Exportar PNG
              </ContextMenuItem>
              <ContextMenuItem onClick={handleOpenAddToCol} className="gap-2 text-base font-medium cursor-pointer">
                <Bookmarks size={18} />
                Guardar Nodos Seleccionados ({selectedNodeIds.size || nodes.length})
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Barra Flotante Superior: Buscador y Popover de Configuración con Ícono Animado */}
      <div className="absolute top-4 left-4 right-4 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none z-10">
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

          {selectedNodeIds.size > 0 && (
            <Badge variant="outline" className="gap-2 text-base font-semibold border-primary text-primary">
              <CheckSquare size={16} /> {selectedNodeIds.size} Seleccionados
            </Badge>
          )}

          {/* Menú Desplegable con Ícono Config (Popover que se desliza suavemente) */}
          <Popover>
            <PopoverTrigger
              className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all cursor-pointer"
              title="Configuración de Pizarra"
            >
              <Gear size={20} className="text-slate-700 hover:rotate-90 transition-transform duration-300" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 bg-white border border-border rounded-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                  <Sliders size={18} className="text-primary" /> Configuración de Pizarra
                </div>
              </div>

              {/* Regulador de Distancia entre Nodos */}
              <div className="space-y-2">
                <div className="flex justify-between text-base font-medium text-slate-800">
                  <span>Distancia entre Nodos:</span>
                  <span className="font-mono text-muted-foreground">{nodeDistance}px</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={350}
                  step={10}
                  value={nodeDistance}
                  onChange={(e) => {
                    const dist = Number(e.target.value);
                    handleDistanceChange(dist);
                  }}
                  className="w-full cursor-pointer accent-primary h-2 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              <div className="pt-2 border-t border-border flex flex-col gap-2">
                <Button onClick={handleTakeSnapshot} variant="secondary" className="w-full gap-2 text-base font-medium">
                  <Camera size={18} /> Tomar Foto / Exportar PNG
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Panel Flotante Lateral de Inspección de Nodo Seleccionado */}
      {selectedNode && (
        <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur border border-border rounded-xl p-5 shadow-2xl space-y-4 z-10">
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

      {/* Controles Flotantes de Zoom, Paneo y Tomar Foto (Abajo a la Derecha) */}
      <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur border border-border rounded-xl p-2 flex items-center gap-2 shadow-xl z-10">
        <Button variant="ghost" size="icon" onClick={handleTakeSnapshot} title="Tomar Foto de Pizarra (Exportar PNG)">
          <Camera size={18} className="text-primary" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
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

      {/* Barra Minimalista de Modos con Íconos (Abajo a la Izquierda) */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur border border-border rounded-xl p-2 flex items-center gap-2 shadow-xl z-10">
        <Button
          variant={activeMode === 'select' ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveMode('select')}
          title="Modo Selección Marquee Box (Por Defecto)"
        >
          <Selection size={20} />
        </Button>

        <Button
          variant={activeMode === 'pan' ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveMode('pan')}
          title="Modo Desplazamiento (O mantén presionada la Rueda/Espacio)"
        >
          <Hand size={20} />
        </Button>

        {selectedNodeIds.size > 0 && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="outline"
              onClick={handleOpenAddToCol}
              className="gap-2 text-base font-medium text-primary border-primary"
            >
              <Bookmarks size={18} />
              Guardar ({selectedNodeIds.size})
            </Button>
          </>
        )}
      </div>

      {/* Modal para Añadir Grafo a Colección */}
      <Dialog open={isAddToColOpen} onOpenChange={setIsAddToColOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Guardar en Colección</DialogTitle>
            <DialogDescription className="text-base">
              Guarda los {selectedNodeIds.size > 0 ? selectedNodeIds.size : nodes.length} nodos en una colección específica.
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
                ¡Agregado a la colección exitosamente!
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
              Guardar en Colección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
