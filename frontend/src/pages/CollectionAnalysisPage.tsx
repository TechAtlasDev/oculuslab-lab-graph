import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { Collection, GraphNode, GraphEdge } from '../types';
import { ForceGraphPhysicsEngine } from '../engines/canvas/ForceGraphPhysicsEngine';
import { cullNodes, type Viewport } from '../engines/canvas/culling';
import { renderGraphToCanvas, hitTestEdge, type SelectionBox } from '../engines/canvas/renderer';
import type { CanvasInteractionMode } from './ExplorerPage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  ArrowLeft,
  Bookmarks,
  Trash,
  Play,
  Hand,
  Plus,
  Minus,
  ArrowsOut,
  Camera,
  CheckSquare,
  Gear,
  Selection,
  Sliders,
  X,
  BookmarkSimple,
  Info,
  CaretDown,
  CaretRight as CaretRightIcon,
} from '@phosphor-icons/react';

interface CollectionAnalysisPageProps {
  collectionId: string;
  onBack: () => void;
}

// Función auxiliar para renderizar propiedades complejas
const renderPropertyValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">N/A</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Sí' : 'No'}</span>;
  if (typeof value === 'number') return <span className="font-mono text-slate-800">{value}</span>;
  if (typeof value === 'string') {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline break-all"
        >
          {value} ↗
        </a>
      );
    }
    return <span className="text-slate-800 break-words">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 italic">Vacío</span>;
    return (
      <ul className="list-disc list-inside space-y-0.5 text-base text-slate-700">
        {value.map((item, idx) => (
          <li key={idx}>{renderPropertyValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 my-1 text-base">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="font-semibold text-slate-700 capitalize">{k}:</span>
            <div className="pl-2">{renderPropertyValue(v)}</div>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
};

export const CollectionAnalysisPage: React.FC<CollectionAnalysisPageProps> = ({
  collectionId,
  onBack,
}) => {
  const { workspaceService, graphDataService, analysisService } = useDomainServices();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Estados de Interacción del Lienzo / Pizarra
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [activeMode, setActiveMode] = useState<CanvasInteractionMode>('select');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState<boolean>(false);

  const [nodeDistance, setNodeDistance] = useState<number>(() => {
    const saved = localStorage.getItem('optimuskg_col_node_distance');
    return saved ? Number(saved) : 140;
  });

  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const isSpacePressedRef = useRef(false);

  const [contextMenuTargetNode, setContextMenuTargetNode] = useState<GraphNode | null>(null);

  const physicsEngineRef = useRef<ForceGraphPhysicsEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getPhysicsEngine = useCallback(() => {
    if (physicsEngineRef.current == null) {
      physicsEngineRef.current = new ForceGraphPhysicsEngine(window.innerWidth, window.innerHeight);
    }
    return physicsEngineRef.current;
  }, []);

  const handleDistanceChange = (dist: number) => {
    setNodeDistance(dist);
    localStorage.setItem('optimuskg_col_node_distance', String(dist));
    getPhysicsEngine().setDistance(dist);
  };

  useEffect(() => {
    getPhysicsEngine().setDistance(nodeDistance);
  }, [nodeDistance, getPhysicsEngine]);

  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 1,
  });

  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const refreshData = useCallback(async () => {
    const col = await workspaceService.getCollection(collectionId);
    if (!col) return;
    setCollection(col);

    const nodePromises = col.nodeIds.map((id: string) => graphDataService.fetchNode(id));
    const loadedNodes = (await Promise.all(nodePromises)).filter((n: GraphNode | null): n is GraphNode => n !== null);
    setNodes(loadedNodes);

    let loadedEdges: GraphEdge[] = [];
    if (loadedNodes.length > 0) {
      const subgraph = await graphDataService.fetchSubgraph(loadedNodes.map(n => n.id));
      loadedEdges = subgraph.edges;
    }
    setEdges(loadedEdges);

    if (physicsEngineRef.current) {
      physicsEngineRef.current.updateGraph(loadedNodes, loadedEdges, viewport.width, viewport.height);
    }
  }, [collectionId, workspaceService, graphDataService, viewport.width, viewport.height]);

  const handleRemoveNode = useCallback(async (nodeId: string) => {
    if (!collection) return;
    await workspaceService.removeNodeFromCollection(collection.id, nodeId);
    await refreshData();
  }, [collection, workspaceService, refreshData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space' && !isSpacePressedRef.current) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveMode('pan');
      } else if (e.key === '+' || e.key === '=') {
        setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }));
      } else if (e.key === '-' || e.key === '_') {
        setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.3) }));
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 0) {
          selectedNodeIds.forEach(id => void handleRemoveNode(id));
          setSelectedNodeIds(new Set());
          setSelectedNode(null);
        } else if (selectedNode) {
          void handleRemoveNode(selectedNode.id);
          setSelectedNode(null);
        }
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
  }, [selectedNode, selectedNodeIds, handleRemoveNode]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const col = await workspaceService.getCollection(collectionId);
      if (!active) return;
      if (!col) {
        setLoading(false);
        return;
      }
      setCollection(col);

      const nodePromises = col.nodeIds.map((id: string) => graphDataService.fetchNode(id));
      const loadedNodes = (await Promise.all(nodePromises)).filter((n: GraphNode | null): n is GraphNode => n !== null);
      if (!active) return;
      setNodes(loadedNodes);

      let loadedEdges: GraphEdge[] = [];
      if (loadedNodes.length > 0) {
        const subgraph = await graphDataService.fetchSubgraph(loadedNodes.map(n => n.id));
        loadedEdges = subgraph.edges;
      }
      if (!active) return;
      setEdges(loadedEdges);
      setLoading(false);

      if (physicsEngineRef.current) {
        physicsEngineRef.current.updateGraph(loadedNodes, loadedEdges, viewport.width, viewport.height);
        setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }));
      }
    })();

    return () => {
      active = false;
    };
  }, [collectionId, workspaceService, graphDataService, viewport.width, viewport.height]);

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
      selectedEdgeId: selectedEdge?.id,
      selectionBox: selectionBox,
    });
  }, [nodes, edges, viewport, selectedNode, selectedNodeIds, selectedEdge, selectionBox]);

  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.onTick(() => {
        renderFrame();
      });
    }
  }, [renderFrame]);

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
      physicsEngineRef.current?.updateGraph(nodes, edges, width, height);
    }
  }, [nodes, edges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setViewport(prev => {
          const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.3), 3);
          return { ...prev, zoom: newZoom };
        });
      } else {
        setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !physicsEngineRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (e.button === 1 || isSpacePressed || (activeMode === 'pan' && e.button === 0)) {
      setIsPanning(true);
      setPanStart({ x: clickX - viewport.x, y: clickY - viewport.y });
      return;
    }

    if (e.button !== 0) return;

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
      if (found) {
        setSelectedNode(found);
        setSelectedEdge(null);
      }

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

      physicsEngineRef.current.dragStart(clickedNodeId);
      // setDraggedNodeId(clickedNodeId); // Optional drag support
    } else {
      let clickedEdge: GraphEdge | null = null;
      for (const edge of edges) {
        const srcPos = positions.get(edge.source);
        const tgtPos = positions.get(edge.target);
        if (srcPos && tgtPos) {
          if (hitTestEdge(worldX, worldY, srcPos.x, srcPos.y, tgtPos.x, tgtPos.y, 8)) {
            clickedEdge = edge;
            break;
          }
        }
      }

      if (clickedEdge) {
        setSelectedEdge(clickedEdge);
        setSelectedNode(null);
        setSelectedNodeIds(new Set());
      } else {
        setSelectedEdge(null);
        if (activeMode === 'select') {
          if (!e.shiftKey) {
            setSelectedNodeIds(new Set());
          }
          setIsSelecting(true);
          setSelectionBox({ startX: clickX, startY: clickY, currentX: clickX, currentY: clickY });
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (isSelecting && selectionBox && physicsEngineRef.current) {
      const updatedBox = { ...selectionBox, currentX, currentY };
      setSelectionBox(updatedBox);

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
      setViewport(prev => ({
        ...prev,
        x: currentX - panStart.x,
        y: currentY - panStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
    setIsPanning(false);
  };

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
      if (dist <= 28) clickedNodeId = id;
    });

    if (clickedNodeId) {
      setContextMenuTargetNode(nodes.find(n => n.id === clickedNodeId) || null);
    } else {
      setContextMenuTargetNode(null);
    }
  };

  const handleTakeSnapshot = () => {
    if (!canvasRef.current) return;
    const imageURI = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `coleccion-${collection?.name || 'coleccion'}-${Date.now()}.png`;
    link.href = imageURI;
    link.click();
  };

  const handleRunSubGraphAnalysis = async () => {
    if (nodes.length === 0) return;
    const jobId = await analysisService.runSubgraphExtraction(nodes.map(n => n.id));
    const res = await analysisService.pollJobUntilDone<{
      nodeCount: number;
      edgeCount: number;
      density: number;
      avgDegree: number;
      topHubs: { id: string; degree: number }[];
    }>(jobId);

    if (res) {
      setAnalysisResult(
        `• Nodos: ${res.nodeCount}\n` +
        `• Aristas: ${res.edgeCount}\n` +
        `• Densidad: ${(res.density * 100).toFixed(2)}%\n` +
        `• Grado Promedio: ${res.avgDegree.toFixed(2)}\n\n` +
        `Nodos Centrales (Hubs):\n` +
        res.topHubs.map(h => ` - ${h.id} (${h.degree} conexiones)`).join('\n')
      );
    }
  };

  const toggleSave = async () => {
    if (!selectedNode) return;
    const newState = await workspaceService.toggleSaveNode(selectedNode.id);
    setIsSaved(newState);
  };

  useEffect(() => {
    if (selectedNode) {
      void workspaceService.getSavedNodeIds().then((saved: string[]) => {
        setIsSaved(saved.includes(selectedNode.id));
      });
    }
  }, [selectedNode, workspaceService]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse text-base">
        Cargando subgrafo de la colección...
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive font-bold text-lg">Colección no encontrada</p>
        <Button onClick={onBack} variant="outline" className="text-base font-medium">
          <ArrowLeft size={18} className="mr-2" /> Volver al Workspace
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white overflow-hidden select-none">
      <ContextMenu>
        <ContextMenuTrigger className="w-full h-full block">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenuTrigger}
            className={`w-full h-full block touch-none ${
              isPanning ? 'cursor-grabbing' : activeMode === 'pan' ? 'cursor-grab' : 'cursor-default'
            }`}
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-white border border-border shadow-2xl rounded-xl">
          {contextMenuTargetNode ? (
            <>
              <div className="px-3 py-2 text-base font-bold text-slate-900 border-b border-border">
                {contextMenuTargetNode.name}
              </div>
              <ContextMenuItem onClick={toggleSave} className="gap-2 text-base font-medium cursor-pointer">
                <BookmarkSimple size={18} />
                Guardar Nodo en Workspace
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => handleRemoveNode(contextMenuTargetNode.id)}
                className="gap-2 text-base font-medium cursor-pointer text-destructive"
              >
                <Trash size={18} />
                Quitar de Colección
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem onClick={handleTakeSnapshot} className="gap-2 text-base font-medium cursor-pointer">
              <Camera size={18} /> Exportar PNG
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none z-10">
        <div className="flex items-center gap-3 pointer-events-auto bg-white/95 backdrop-blur border border-border p-2 rounded-xl shadow-lg">
          <Button onClick={onBack} variant="outline" className="gap-2 text-base font-medium">
            <ArrowLeft size={18} /> Volver
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Bookmarks size={24} className="text-primary" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">{collection.name}</h1>
              <p className="text-base text-muted-foreground mt-0.5">
                {nodes.length} Nodos • {edges.length} Relaciones
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto bg-white/95 backdrop-blur border border-border p-2 rounded-xl shadow-lg">
          {selectedNodeIds.size > 0 && (
            <Badge variant="outline" className="gap-2 text-base font-semibold border-primary text-primary">
              <CheckSquare size={16} /> {selectedNodeIds.size} Seleccionados
            </Badge>
          )}

          <Button onClick={handleRunSubGraphAnalysis} className="gap-2 text-base font-medium">
            <Play size={18} weight="fill" />
            Analizar Subgrafo
          </Button>

          <Popover>
            <PopoverTrigger
              className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all cursor-pointer"
              title="Leyenda y Configuración"
            >
              <Gear size={20} className="text-slate-700 hover:rotate-90 transition-transform duration-300" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 bg-white border border-border rounded-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                  <Sliders size={18} className="text-primary" /> Configuración & Leyenda
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-base font-semibold text-slate-800">Categorías de Nodos:</span>
                <div className="grid grid-cols-2 gap-2 text-base font-medium pt-1">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" /> Gen</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" /> Proteína</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600 shrink-0" /> Enfermedad</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-violet-600 shrink-0" /> Fármaco</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-600 shrink-0" /> Vía</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-600 shrink-0" /> Anatomía</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
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
                  onChange={(e) => handleDistanceChange(Number(e.target.value))}
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

      {selectedNode && (
        <div className="absolute top-20 right-4 bottom-24 w-96 bg-white/95 backdrop-blur border border-border rounded-xl p-5 shadow-2xl flex flex-col gap-4 z-10 overflow-hidden select-text cursor-auto">
          <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
            <Badge variant="secondary" className="text-base font-medium">
              {selectedNode.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} title="Cerrar panel">
              <X size={18} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text">
            <div>
              <h3 className="text-xl font-bold text-slate-900 leading-tight select-text">{selectedNode.name}</h3>
              <p className="text-base font-mono text-muted-foreground mt-0.5 select-text">ID: {selectedNode.id}</p>
              {selectedNode.description && (
                <p className="text-base text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 select-text">
                  {selectedNode.description}
                </p>
              )}
            </div>

            <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70 select-text">
              <CollapsibleTrigger className="w-full p-3 flex items-center justify-between font-semibold text-base text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer">
                <span className="flex items-center gap-2">
                  <Info size={18} className="text-primary" />
                  Propiedades y Evidencias ({Object.keys(selectedNode.properties).length})
                </span>
                {isPropertiesOpen ? <CaretDown size={18} /> : <CaretRightIcon size={18} />}
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 border-t border-slate-200 space-y-3 max-h-72 overflow-y-auto bg-white select-text">
                {Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div key={k} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0 select-text">
                    <span className="block text-base font-bold text-slate-900 capitalize select-text">{k}</span>
                    <div className="mt-0.5 text-base text-slate-700 select-text">
                      {renderPropertyValue(v)}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex flex-col gap-2 shrink-0 mt-auto pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={toggleSave}
                variant={isSaved ? "outline" : "default"}
                className="w-full gap-2 text-base font-medium"
              >
                {isSaved ? <BookmarkSimple size={18} weight="fill" /> : <BookmarkSimple size={18} />}
                {isSaved ? 'Guardado' : 'Guardar'}
              </Button>
              <Button
                onClick={() => handleRemoveNode(selectedNode.id)}
                variant="destructive"
                className="w-full gap-2 text-base font-medium"
                title="Quitar de colección"
              >
                <Trash size={18} />
                Quitar (Supr)
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedEdge && (
        <div className="absolute top-20 right-4 bottom-24 w-96 bg-white/95 backdrop-blur border border-border rounded-xl p-5 shadow-2xl flex flex-col gap-4 z-10 overflow-hidden select-text cursor-auto">
          <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
            <Badge variant="outline" className="text-base font-semibold border-primary text-primary">
              Relación / Vértice
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)} title="Cerrar panel">
              <X size={18} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 select-text">
            <div>
              <span className="text-base uppercase font-mono text-muted-foreground select-text">Tipo de Conexión</span>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5 select-text">{selectedEdge.type}</h3>
              <p className="text-base font-mono text-muted-foreground mt-1 select-text">ID: {selectedEdge.id}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 select-text">
              <div className="text-base font-semibold text-slate-500 uppercase select-text">Extremos Conectados</div>
              <div className="space-y-1.5 text-base select-text">
                <div className="flex justify-between items-center select-text">
                  <span className="font-bold text-slate-700 select-text">Origen:</span>
                  <span className="font-mono text-slate-900 select-text">{nodes.find(n => n.id === selectedEdge.source)?.name || selectedEdge.source}</span>
                </div>
                <div className="flex justify-between items-center select-text">
                  <span className="font-bold text-slate-700 select-text">Destino:</span>
                  <span className="font-mono text-slate-900 select-text">{nodes.find(n => n.id === selectedEdge.target)?.name || selectedEdge.target}</span>
                </div>
              </div>
            </div>

            {selectedEdge.properties && Object.keys(selectedEdge.properties).length > 0 && (
              <Collapsible defaultOpen className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70 select-text">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between font-semibold text-base text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Info size={18} className="text-primary" />
                    Detalles y Evidencia ({Object.keys(selectedEdge.properties).length})
                  </span>
                  <CaretDown size={18} />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 border-t border-slate-200 space-y-3 max-h-64 overflow-y-auto bg-white select-text">
                  {Object.entries(selectedEdge.properties).map(([k, v]) => (
                    <div key={k} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0 select-text">
                      <span className="block text-base font-bold text-slate-900 capitalize select-text">{k}</span>
                      <div className="mt-0.5 text-base text-slate-700 select-text">
                        {renderPropertyValue(v)}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="absolute bottom-20 left-6 max-w-lg bg-white/95 backdrop-blur border border-border rounded-xl p-4 shadow-2xl space-y-2 z-20">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Resultado del Análisis</h3>
            <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)}>
              <X size={16} />
            </Button>
          </div>
          <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-mono max-h-48 overflow-y-auto text-slate-900">
            {analysisResult}
          </pre>
        </div>
      )}

      {/* Controles Flotantes de Zoom, Paneo y Exportar PNG (Abajo a la Derecha) */}
      <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur border border-border rounded-xl p-2 flex items-center gap-2 shadow-xl z-10">
        <Button variant="ghost" size="icon" onClick={handleTakeSnapshot} title="Tomar Foto de Pizarra (Exportar PNG)">
          <Camera size={18} className="text-primary" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.3) }))}
          title="Alejar (Zoom Out)"
        >
          <Minus size={18} />
        </Button>
        <span className="text-base font-mono font-semibold px-2 text-slate-800">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }))}
          title="Acercar (Zoom In)"
        >
          <Plus size={18} />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewport(prev => ({ ...prev, x: prev.width / 4, y: prev.height / 4, zoom: 1 }))}
          title="Centrar Pizarra"
        >
          <ArrowsOut size={18} />
        </Button>
      </div>

      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur border border-border rounded-xl p-2 flex items-center gap-2 shadow-xl z-10">
        <Button
          variant={activeMode === 'select' ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveMode('select')}
          title="Modo Selección"
        >
          <Selection size={20} />
        </Button>
        <Button
          variant={activeMode === 'pan' ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveMode('pan')}
          title="Modo Desplazamiento"
        >
          <Hand size={20} />
        </Button>
      </div>
    </div>
  );
};
