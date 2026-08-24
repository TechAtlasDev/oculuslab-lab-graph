import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { GraphNode, GraphEdge, Collection } from '../types';
import { ForceGraphPhysicsEngine } from '../engines/canvas/ForceGraphPhysicsEngine';
import { cullNodes } from '../engines/canvas/culling';
import type { Viewport } from '../engines/canvas/culling';
import { renderGraphToCanvas, hitTestEdge, type SelectionBox } from '../engines/canvas/renderer';
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
  X,
  Camera,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CheckSquare,
  Gear,
  Selection,
  Sliders,
  CaretDown,
  CaretRight as CaretRightIcon,
  Info,
  Trash,
  GitFork,
} from '@phosphor-icons/react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// Formateador robusto de propiedades para no mostrar [object Object]
function renderPropertyValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground italic">None</span>;
  if (typeof value === 'boolean') return value ? 'Verdadero' : 'Falso';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return (
        <a href={trimmed} target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary/80 break-all">
          {trimmed} ↗
        </a>
      );
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">Vacío</span>;
    // Si son elementos primitivos simples
    if (typeof value[0] === 'string' || typeof value[0] === 'number') {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.slice(0, 10).map((item, idx) => (
            <Badge key={idx} variant="outline" className="text-base font-normal">
              {String(item)}
            </Badge>
          ))}
          {value.length > 10 && (
            <span className="text-base text-muted-foreground">+{value.length - 10} más</span>
          )}
        </div>
      );
    }
    // Si son objetos complejos dentro del array
    return (
      <div className="space-y-2 mt-2">
        {value.slice(0, 3).map((item, idx) => (
          <div key={idx} className="p-2 bg-muted/40 rounded border border-border text-base font-mono">
            {typeof item === 'object' && item !== null
              ? Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ')
              : String(item)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="space-y-2 mt-2 pl-3 border-l-2 border-border text-base">
        {Object.entries(value as Record<string, unknown>).slice(0, 6).map(([subK, subV]) => (
          <div key={subK} className="flex flex-col">
            <span className="font-semibold text-slate-800 capitalize">{subK}:</span>
            <span className="text-slate-600 font-mono">
              {typeof subV === 'object' && subV !== null ? JSON.stringify(subV) : String(subV)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

export type CanvasInteractionMode = 'select' | 'pan';

export interface CandidatePath {
  path: string[];
  hops: number;
  summary: string;
  bridgeNames: string[];
}

export const ExplorerPage: React.FC = () => {
  const { graphDataService, workspaceService, analysisService } = useDomainServices();

  // Estados del Grafo y Búsqueda en Vivo
  const [query, setQuery] = useState<string>('TP53');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Cargar estado inicial desde localStorage para persistencia al navegar entre pestañas
  const [nodes, setNodes] = useState<GraphNode[]>(() => {
    try {
      const saved = localStorage.getItem('optimuskg_explorer_nodes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [edges, setEdges] = useState<GraphEdge[]>(() => {
    try {
      const saved = localStorage.getItem('optimuskg_explorer_edges');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistir nodos y aristas en localStorage cada vez que cambien
  useEffect(() => {
    try {
      localStorage.setItem('optimuskg_explorer_nodes', JSON.stringify(nodes));
    } catch (e) {
      console.warn('Error guardando nodos en localStorage:', e);
    }
  }, [nodes]);

  useEffect(() => {
    try {
      localStorage.setItem('optimuskg_explorer_edges', JSON.stringify(edges));
    } catch (e) {
      console.warn('Error guardando aristas en localStorage:', e);
    }
  }, [edges]);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  
  // Modo de Interacción (Por Defecto: 'select') y Selección Múltiple
  const [activeMode, setActiveMode] = useState<CanvasInteractionMode>('select');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  
  // Estado de cálculo de Rutas Múltiples (Estilo Google Maps)
  const [isFindingPath, setIsFindingPath] = useState<boolean>(false);
  const [candidatePaths, setCandidatePaths] = useState<CandidatePath[]>([]);
  const [allPathNodes, setAllPathNodes] = useState<GraphNode[]>([]);
  const [allPathEdges, setAllPathEdges] = useState<GraphEdge[]>([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
  const [isRoutesModalOpen, setIsRoutesModalOpen] = useState<boolean>(false);

  // Caja de Selección Marquee (Click & Drag en el fondo)
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  
  // Panel lateral desplegable de propiedades
  const [isPropertiesOpen, setIsPropertiesOpen] = useState<boolean>(false);
  
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

  // Estado del Viewport (Pan y Zoom) con persistencia en localStorage
  const [viewport, setViewport] = useState<Viewport>(() => {
    try {
      const saved = localStorage.getItem('optimuskg_explorer_viewport');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          x: typeof parsed.x === 'number' ? parsed.x : 0,
          y: typeof parsed.y === 'number' ? parsed.y : 0,
          width: window.innerWidth,
          height: window.innerHeight,
          zoom: typeof parsed.zoom === 'number' ? parsed.zoom : 1,
        };
      }
    } catch {}
    return {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      zoom: 1,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('optimuskg_explorer_viewport', JSON.stringify({
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      }));
    } catch {}
  }, [viewport.x, viewport.y, viewport.zoom]);

  // Estados de Arrastre
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Cerrar sugerencias de búsqueda al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en vivo con debounce al escribir en el buscador
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await graphDataService.searchGraph(query, { limit: 12 });
        setSearchResults(results);
        setIsSearchDropdownOpen(results.length > 0);
      } catch (err) {
        console.error('Error buscando entidades:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, graphDataService]);

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
      selectedEdgeId: selectedEdge?.id,
      selectionBox: selectionBox,
    });
  }, [nodes, edges, viewport, selectedNode, selectedNodeIds, selectedEdge, selectionBox]);

  // Suscribir callback de tick de la física D3
  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.onTick(() => {
        renderFrame();
      });
    }
  }, [renderFrame]);

  // Carga / Adición de un Nodo Específico al Grafo (conservando los existentes o agregando el nuevo)
  const addNodeToGraph = useCallback(async (rootNode: GraphNode) => {
    setSelectedNode(rootNode);
    setSelectedEdge(null);
    setIsSearchDropdownOpen(false);
    await workspaceService.recordNodeVisit(rootNode.id);

    setNodes(prevNodes => {
      const exists = prevNodes.some(n => n.id === rootNode.id);
      const updatedNodes = exists ? prevNodes : [...prevNodes, rootNode];
      
      setEdges(prevEdges => {
        physicsEngineRef.current?.updateGraph(updatedNodes, prevEdges, viewport.width, viewport.height);
        return prevEdges;
      });

      return updatedNodes;
    });

    setSelectedNodeIds(new Set([rootNode.id]));
  }, [workspaceService, viewport.width, viewport.height]);

  // Expansión de Vecinos Conectados para un Nodo Seleccionado
  const expandNodeNeighbors = useCallback(async (nodeId: string) => {
    try {
      const neighborEdges = await graphDataService.fetchNeighbors(nodeId, { limit: 15 });
      const neighborNodeIds = Array.from(
        new Set(neighborEdges.flatMap(e => [e.source, e.target]))
      );

      const fetchedNodes = await Promise.all(
        neighborNodeIds.map(id => graphDataService.fetchNode(id))
      );
      const validNodes = fetchedNodes.filter((n): n is GraphNode => n !== null);

      setNodes(prevNodes => {
        const existingIds = new Set(prevNodes.map(n => n.id));
        const newNodes = validNodes.filter(n => !existingIds.has(n.id));
        const updatedNodes = [...prevNodes, ...newNodes];

        setEdges(prevEdges => {
          const existingEdgeIds = new Set(prevEdges.map(e => e.id));
          const newEdges = neighborEdges.filter(e => !existingEdgeIds.has(e.id));
          const updatedEdges = [...prevEdges, ...newEdges];

          physicsEngineRef.current?.updateGraph(updatedNodes, updatedEdges, viewport.width, viewport.height);
          return updatedEdges;
        });

        return updatedNodes;
      });
    } catch (err) {
      console.error('Error expandiendo vecinos:', err);
    }
  }, [graphDataService, viewport.width, viewport.height]);

  // Eliminar Nodos Seleccionados de la Pizarra
  const removeNodesFromCanvas = useCallback((nodeIdsToRemove: Set<string> | string[]) => {
    const removeSet = new Set(nodeIdsToRemove);
    setSelectedNode(prev => (prev && removeSet.has(prev.id) ? null : prev));
    setSelectedEdge(prev => (prev && (removeSet.has(prev.source) || removeSet.has(prev.target)) ? null : prev));

    setNodes(prevNodes => {
      const updatedNodes = prevNodes.filter(n => !removeSet.has(n.id));

      setEdges(prevEdges => {
        const updatedEdges = prevEdges.filter(
          e => !removeSet.has(e.source) && !removeSet.has(e.target)
        );

        physicsEngineRef.current?.updateGraph(updatedNodes, updatedEdges, viewport.width, viewport.height);
        return updatedEdges;
      });

      return updatedNodes;
    });

    setSelectedNodeIds(prev => {
      const updated = new Set(prev);
      removeSet.forEach(id => updated.delete(id));
      return updated;
    });
  }, [viewport.width, viewport.height]);

  // Encontrar Múltiples Rutas Alternativas entre 2 Nodos Seleccionados (Estilo Google Maps)
  const findRelationshipBetweenSelected = useCallback(async () => {
    if (selectedNodeIds.size !== 2) return;
    const [fromId, toId] = Array.from(selectedNodeIds);

    setIsFindingPath(true);
    setSelectedEdge(null);

    try {
      const jobId = await analysisService.runPathFinding(fromId, toId, 4);
      const result = await analysisService.pollJobUntilDone<{
        paths: CandidatePath[];
        totalPaths: number;
        nodes: GraphNode[];
        edges: GraphEdge[];
        algorithm: string;
      }>(jobId);

      if (result && result.paths && result.paths.length > 0) {
        setCandidatePaths(result.paths);
        setAllPathNodes(result.nodes || []);
        setAllPathEdges(result.edges || []);
        setSelectedPathIndex(0);
        setIsRoutesModalOpen(true);

        // Por defecto, renderizar la primera ruta sugerida en la pizarra
        const firstPath = result.paths[0];
        const pathNodeSet = new Set(firstPath.path);
        const pathNodes = (result.nodes || []).filter(n => pathNodeSet.has(n.id));
        const pathEdges = (result.edges || []).filter(e => pathNodeSet.has(e.source) && pathNodeSet.has(e.target));

        setNodes(prevNodes => {
          const existingIds = new Set(prevNodes.map(n => n.id));
          const addedNodes = pathNodes.filter(n => !existingIds.has(n.id));
          const updatedNodes = [...prevNodes, ...addedNodes];

          setEdges(prevEdges => {
            const existingEdgeIds = new Set(prevEdges.map(e => e.id));
            const addedEdges = pathEdges.filter(e => !existingEdgeIds.has(e.id));
            const updatedEdges = [...prevEdges, ...addedEdges];

            physicsEngineRef.current?.updateGraph(updatedNodes, updatedEdges, viewport.width, viewport.height);
            return updatedEdges;
          });

          return updatedNodes;
        });
      } else {
        setCandidatePaths([]);
        setIsRoutesModalOpen(true);
      }
    } catch (err) {
      console.error('Error calculando rutas alternativas:', err);
    } finally {
      setIsFindingPath(false);
    }
  }, [selectedNodeIds, analysisService, viewport.width, viewport.height]);

  // Aplicar una ruta específica de la lista de rutas alternativas
  const applyCandidatePath = useCallback((idx: number) => {
    setSelectedPathIndex(idx);
    const candidate = candidatePaths[idx];
    if (!candidate) return;

    const pathNodeSet = new Set(candidate.path);
    const pathNodes = allPathNodes.filter(n => pathNodeSet.has(n.id));
    const pathEdges = allPathEdges.filter(e => pathNodeSet.has(e.source) && pathNodeSet.has(e.target));

    setNodes(prevNodes => {
      const existingIds = new Set(prevNodes.map(n => n.id));
      const addedNodes = pathNodes.filter(n => !existingIds.has(n.id));
      const updatedNodes = [...prevNodes, ...addedNodes];

      setEdges(prevEdges => {
        const existingEdgeIds = new Set(prevEdges.map(e => e.id));
        const addedEdges = pathEdges.filter(e => !existingEdgeIds.has(e.id));
        const updatedEdges = [...prevEdges, ...addedEdges];

        physicsEngineRef.current?.updateGraph(updatedNodes, updatedEdges, viewport.width, viewport.height);
        return updatedEdges;
      });

      return updatedNodes;
    });
  }, [candidatePaths, allPathNodes, allPathEdges, viewport.width, viewport.height]);

  // Cargar todas las rutas simultáneamente en la pizarra
  const applyAllCandidatePaths = useCallback(() => {
    setNodes(prevNodes => {
      const existingIds = new Set(prevNodes.map(n => n.id));
      const addedNodes = allPathNodes.filter(n => !existingIds.has(n.id));
      const updatedNodes = [...prevNodes, ...addedNodes];

      setEdges(prevEdges => {
        const existingEdgeIds = new Set(prevEdges.map(e => e.id));
        const addedEdges = allPathEdges.filter(e => !existingEdgeIds.has(e.id));
        const updatedEdges = [...prevEdges, ...addedEdges];

        physicsEngineRef.current?.updateGraph(updatedNodes, updatedEdges, viewport.width, viewport.height);
        return updatedEdges;
      });

      return updatedNodes;
    });
    setIsRoutesModalOpen(false);
  }, [allPathNodes, allPathEdges, viewport.width, viewport.height]);

  // Limpiar todo el lienzo
  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setSelectedNodeIds(new Set());
    setCandidatePaths([]);
    setAllPathNodes([]);
    setAllPathEdges([]);
    localStorage.removeItem('optimuskg_explorer_nodes');
    localStorage.removeItem('optimuskg_explorer_edges');
    physicsEngineRef.current?.updateGraph([], [], viewport.width, viewport.height);
  }, [viewport.width, viewport.height]);

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      void addNodeToGraph(searchResults[0]);
    }
  };

  // Atajos de teclado: Ctrl+K / Cmd+K para enfocar buscador, Delete / Backspace para borrar
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // 1. Ctrl + K / Cmd + K para enfocar buscador
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('graph-search-input');
        searchInput?.focus();
        return;
      }

      // Si se está escribiendo en un input, no procesar Delete de nodos
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // 2. Delete / Backspace para eliminar nodos seleccionados
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          removeNodesFromCanvas(selectedNodeIds);
        } else if (selectedNode) {
          e.preventDefault();
          removeNodesFromCanvas([selectedNode.id]);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [selectedNodeIds, selectedNode, removeNodesFromCanvas]);

  useEffect(() => {
    if (selectedNode) {
      void workspaceService.getSavedNodeIds().then((saved: string[]) => {
        setIsSaved(saved.includes(selectedNode.id));
      });
    }
  }, [selectedNode, workspaceService]);

  // Loop de Redimensionamiento y Sincronización Inicial del Motor Físico
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      setViewport(prev => ({ ...prev, width, height }));
    }

    if (nodes.length > 0) {
      getPhysicsEngine().updateGraph(nodes, edges, width, height);
    }
  }, [nodes, edges, getPhysicsEngine]);

  // Manejo de Interacción del Ratón (Clic Central / Rueda / Espacio / Marquee Selection / Hit Testing de Nodos y Aristas)
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
      if (found) {
        setSelectedNode(found);
        setSelectedEdge(null);
      }

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
      // Hit testing de aristas / conexiones (vértices)
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
        // Clic en el Fondo en Modo Selección -> Iniciar Rectángulo de Selección Marquee Box
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

  // Prevenir zoom por defecto del navegador en Ctrl+Wheel usando un listener nativo no-pasivo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // 1. Ctrl + Rueda: Zoom In / Zoom Out
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setViewport(prev => {
          const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.3), 3);
          return { ...prev, zoom: newZoom };
        });
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

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

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

    const targetNodeIds = new Set(targetNodes.map(n => n.id));

    // 1. Guardar todos los nodos
    for (const node of targetNodes) {
      await workspaceService.addNodeToCollection(targetCollectionId, node.id);
    }

    // 2. Guardar todas las aristas activas en el lienzo entre estos nodos
    for (const edge of edges) {
      if (targetNodeIds.has(edge.source) && targetNodeIds.has(edge.target)) {
        await workspaceService.addEdgeToCollection(targetCollectionId, edge.id);
      }
    }

    // 3. Obtener subgrafo completo inducido para garantizar que ninguna relación biológica se pierda
    try {
      if (targetNodes.length > 1) {
        const subgraph = await graphDataService.fetchSubgraph(Array.from(targetNodeIds));
        for (const edge of subgraph.edges) {
          await workspaceService.addEdgeToCollection(targetCollectionId, edge.id);
        }
      }
    } catch (e) {
      console.warn('No se pudieron obtener aristas inducidas adicionales:', e);
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
                <p className="text-base font-bold text-slate-900 leading-tight">{contextMenuTargetNode.name}</p>
                <Badge variant="secondary" className="text-base font-medium mt-1">{contextMenuTargetNode.label}</Badge>
              </div>

              <ContextMenuItem
                onClick={() => void expandNodeNeighbors(contextMenuTargetNode.id)}
                className="gap-2 text-base font-medium cursor-pointer"
              >
                <PlusCircle size={18} className="text-primary" />
                Expandir Vecinos Inmediatos
              </ContextMenuItem>

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
                Añadir a Colección ({selectedNodeIds.size || 1})
              </ContextMenuItem>

              {selectedNodeIds.size === 2 && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => void findRelationshipBetweenSelected()}
                    className="gap-2 text-base font-medium text-primary focus:text-primary cursor-pointer"
                  >
                    <GitFork size={18} />
                    Encontrar Relación
                  </ContextMenuItem>
                </>
              )}

              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => removeNodesFromCanvas(selectedNodeIds.size > 0 ? selectedNodeIds : [contextMenuTargetNode.id])}
                className="gap-2 text-base font-medium text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash size={18} />
                Eliminar de la Pizarra (Supr)
              </ContextMenuItem>
            </>
          ) : (
            <>
              {selectedNodeIds.size === 2 && (
                <>
                  <ContextMenuItem
                    onClick={() => void findRelationshipBetweenSelected()}
                    className="gap-2 text-base font-medium text-primary focus:text-primary cursor-pointer"
                  >
                    <GitFork size={18} />
                    Encontrar Relación entre Seleccionados
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              )}

              <div className="px-3 py-1.5 text-base font-semibold text-muted-foreground">
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
                Centrar Pizarra
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleTakeSnapshot} className="gap-2 text-base font-medium cursor-pointer">
                <Camera size={18} className="text-primary" />
                Tomar Foto / Exportar PNG
              </ContextMenuItem>
              {nodes.length > 0 && (
                <>
                  <ContextMenuItem onClick={handleOpenAddToCol} className="gap-2 text-base font-medium cursor-pointer">
                    <Bookmarks size={18} />
                    Guardar Nodos ({selectedNodeIds.size || nodes.length})
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={clearCanvas}
                    className="gap-2 text-base font-medium text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash size={18} />
                    Limpiar Toda la Pizarra
                  </ContextMenuItem>
                </>
              )}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Mensaje de Bienvenida cuando el Lienzo está Vacío */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-6">
          <div className="bg-white/95 backdrop-blur border border-border p-8 rounded-2xl shadow-xl max-w-lg text-center space-y-4 pointer-events-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <MagnifyingGlass size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">Lienzo de Grafo en Blanco</h2>
              <p className="text-base text-slate-600">
                Usa el buscador para añadir únicamente las entidades biomédicas que deseas analizar.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('graph-search-input');
                  input?.focus();
                }}
                className="inline-flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-base transition-colors cursor-pointer"
              >
                <span>Presiona</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-base font-mono shadow-sm">
                  Ctrl + K
                </kbd>
                <span>o haz clic aquí para buscar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Flotante con la Ruta Activa Seleccionada */}
      {candidatePaths.length > 0 && candidatePaths[selectedPathIndex] && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-primary/30 p-3 rounded-2xl shadow-2xl z-30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-lg">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <GitFork size={20} />
          </div>
          <div className="flex-1 text-base text-slate-800 font-medium leading-snug truncate">
            <span className="font-bold text-slate-900 mr-1.5">Ruta {selectedPathIndex + 1}/{candidatePaths.length}:</span>
            {candidatePaths[selectedPathIndex].summary}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsRoutesModalOpen(true)}
            className="text-base font-medium shrink-0"
          >
            Cambiar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCandidatePaths([])}
            className="shrink-0"
            title="Ocultar indicador de ruta"
          >
            <X size={18} />
          </Button>
        </div>
      )}

      {/* Barra Flotante Superior: Buscador Inteligente con Sugerencias y Popover de Configuración */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none z-20">
        <div ref={searchContainerRef} className="relative pointer-events-auto w-full max-w-md">
          <form onSubmit={handleSearchForm} className="flex gap-2 bg-white/95 backdrop-blur border border-border p-2 rounded-xl shadow-lg">
            <Input
              id="graph-search-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setIsSearchDropdownOpen(true);
              }}
              placeholder="Buscar entidad (ej. Alzheimer, TP53, TGFBR2)... [Ctrl+K]"
              className="flex-1 text-base bg-white"
            />
            <Button type="submit" className="gap-2 text-base font-medium shrink-0">
              <MagnifyingGlass size={18} />
              Buscar
            </Button>
          </form>

          {/* Menú Desplegable con Sugerencias Inteligentes de Búsqueda */}
          {isSearchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-2xl max-h-80 overflow-y-auto z-30 divide-y divide-border">
              {isSearching ? (
                <div className="p-4 text-center text-base text-muted-foreground animate-pulse">
                  Buscando en OptimusKG...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-base text-muted-foreground">
                  No se encontraron entidades coincidentes.
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void addNodeToGraph(item)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-base font-bold text-slate-900 truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-base text-slate-500 line-clamp-1">{item.description}</p>
                      )}
                      <p className="text-base font-mono text-muted-foreground">{item.id}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-base font-medium">
                      {item.label}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pointer-events-auto bg-white/95 backdrop-blur border border-border p-2 rounded-xl shadow-lg">
          {/* Botón de Encontrar Relación entre 2 Nodos Seleccionados */}
          {selectedNodeIds.size === 2 && (
            <Button
              onClick={() => void findRelationshipBetweenSelected()}
              disabled={isFindingPath}
              className="gap-2 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              <GitFork size={20} />
              {isFindingPath ? 'Buscando Rutas...' : 'Encontrar Relaciones'}
            </Button>
          )}

          {candidatePaths.length > 0 && selectedNodeIds.size !== 2 && (
            <Button
              onClick={() => setIsRoutesModalOpen(true)}
              variant="outline"
              className="gap-2 text-base font-medium border-primary/40 text-primary hover:bg-primary/5"
            >
              <GitFork size={18} />
              Ver Rutas ({candidatePaths.length})
            </Button>
          )}

          {selectedNodeIds.size > 0 && (
            <Badge variant="outline" className="gap-2 text-base font-semibold border-primary text-primary">
              <CheckSquare size={16} /> {selectedNodeIds.size} Seleccionados
            </Badge>
          )}

          {/* Menú Popover de Configuración y Leyenda Integrada */}
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

              {/* Leyenda Compacta Vertical */}
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

              {/* Regulador de Distancia entre Nodos */}
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

      {/* Panel Lateral de Inspección de Nodo con Scroll y Acordeón Desplegable */}
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

          {/* Contenido Scrollable */}
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

            {/* Acordeón / Colapsable para Evidencias & Propiedades */}
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
                onClick={() => void expandNodeNeighbors(selectedNode.id)}
                variant="secondary"
                className="gap-2 text-base font-medium"
                title="Cargar nodos conectados"
              >
                <PlusCircle size={18} />
                Expandir
              </Button>
              <Button
                onClick={toggleSave}
                variant={isSaved ? "outline" : "default"}
                className="gap-2 text-base font-medium"
              >
                {isSaved ? <BookmarkSimple size={18} weight="fill" /> : <BookmarkSimple size={18} />}
                {isSaved ? 'Guardado' : 'Guardar'}
              </Button>
            </div>
            <Button
              onClick={() => removeNodesFromCanvas([selectedNode.id])}
              variant="ghost"
              className="w-full gap-2 text-base font-medium text-destructive hover:bg-destructive/10"
              title="Quitar nodo del lienzo"
            >
              <Trash size={18} />
              Quitar de la Pizarra (Supr)
            </Button>
          </div>
        </div>
      )}

      {/* Panel Lateral de Inspección de Arista / Relación Seleccionada */}
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

          {/* Contenido Scrollable de la Arista */}
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

            {/* Propiedades de la Relación */}
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
          title="Modo Desplazamiento (o mantén Rueda/Espacio)"
        >
          <Hand size={20} />
        </Button>
      </div>

      {/* Modal para Guardar Selección en Colección */}
      <Dialog open={isAddToColOpen} onOpenChange={setIsAddToColOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Añadir Selección a Colección</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Guarda los nodos seleccionados en una de tus colecciones locales para analizarlos después.
            </DialogDescription>
          </DialogHeader>

          {collections.length === 0 ? (
            <div className="p-4 text-center text-base text-muted-foreground">
              No tienes colecciones creadas. Ve a la pestaña de Workspace para crear una.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-base font-semibold text-slate-800">Selecciona la Colección:</label>
                <Select value={targetCollectionId} onValueChange={(val) => setTargetCollectionId(val || '')}>
                  <SelectTrigger className="w-full text-base">
                    <SelectValue placeholder="Elige una colección" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id} className="text-base">
                        {col.name} ({col.nodeIds.length} nodos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {addedSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-base bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <Check size={18} /> ¡Añadido a la colección exitosamente!
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddToColOpen(false)} className="text-base font-medium">
              Cerrar
            </Button>
            {collections.length > 0 && (
              <Button onClick={handleAddGraphToCollection} className="text-base font-medium">
                Guardar en Colección
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Interactivo de Rutas Alternativas (Estilo Google Maps) */}
      <Dialog open={isRoutesModalOpen} onOpenChange={setIsRoutesModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GitFork size={22} className="text-primary" />
              Rutas Encontradas ({candidatePaths.length})
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {candidatePaths.length > 0
                ? 'Selecciona la ruta biológica que deseas proyectar en la pizarra o carga todas simultáneamente.'
                : 'No se encontraron rutas directas dentro del límite de 4 saltos.'}
            </DialogDescription>
          </DialogHeader>

          {candidatePaths.length > 0 && (
            <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
              {candidatePaths.map((cand, idx) => (
                <div
                  key={idx}
                  onClick={() => applyCandidatePath(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedPathIndex === idx
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">Ruta {idx + 1}</span>
                      <Badge variant={selectedPathIndex === idx ? "default" : "secondary"} className="text-base">
                        {cand.hops} {cand.hops === 1 ? 'salto' : 'saltos'}
                      </Badge>
                    </div>
                    <p className="text-base text-slate-600 truncate">{cand.summary}</p>
                  </div>
                  {selectedPathIndex === idx && (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check size={14} weight="bold" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRoutesModalOpen(false)}
              className="text-base font-medium"
            >
              Cerrar
            </Button>
            {candidatePaths.length > 1 && (
              <Button
                type="button"
                onClick={applyAllCandidatePaths}
                className="gap-2 text-base font-medium"
              >
                Cargar Todas las Rutas ({candidatePaths.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
