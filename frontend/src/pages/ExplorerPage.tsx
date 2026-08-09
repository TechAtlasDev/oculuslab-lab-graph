import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { GraphNode, GraphEdge, Collection } from '../types';
import { computeLayout } from '../engines/canvas/layout';
import type { LayoutAlgorithm } from '../engines/canvas/layout';
import { cullNodes } from '../engines/canvas/culling';
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
import { MagnifyingGlass, BookmarkSimple, PlusCircle, Bookmarks, Check } from '@phosphor-icons/react';

export const ExplorerPage: React.FC = () => {
  const { graphDataService, workspaceService } = useDomainServices();
  const [query, setQuery] = useState<string>('TP53');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [layoutAlg, setLayoutAlg] = useState<LayoutAlgorithm>('circular');

  // Modal para agregar subgrafo / nodo a colección específica
  const [isAddToColOpen, setIsAddToColOpen] = useState<boolean>(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const executeSearch = async (searchQuery: string) => {
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
    } else {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  };

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    void executeSearch(query);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const searchResults = await graphDataService.searchGraph('TP53');
      if (!active) return;
      if (searchResults.length > 0) {
        const root = searchResults[0];
        setSelectedNode(root);
        await workspaceService.recordNodeVisit(root.id);

        const neighborEdges = await graphDataService.fetchNeighbors(root.id);
        const neighborIds = Array.from(new Set(neighborEdges.flatMap((e: GraphEdge) => [e.source, e.target])));

        const subgraph = await graphDataService.fetchSubgraph([root.id, ...neighborIds]);
        if (active) {
          setNodes(subgraph.nodes);
          setEdges(subgraph.edges);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [graphDataService, workspaceService]);

  useEffect(() => {
    if (selectedNode) {
      void workspaceService.getSavedNodeIds().then((saved: string[]) => {
        setIsSaved(saved.includes(selectedNode.id));
      });
    }
  }, [selectedNode, workspaceService]);

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

    // Agregar todos los nodos actuales del grafo visualizado a la colección elegida
    for (const node of nodes) {
      await workspaceService.addNodeToCollection(targetCollectionId, node.id);
    }
    // Agregar todas las aristas actuales a la colección
    for (const edge of edges) {
      await workspaceService.addEdgeToCollection(targetCollectionId, edge.id);
    }

    setAddedSuccess(true);
    setTimeout(() => {
      setIsAddToColOpen(false);
      setAddedSuccess(false);
    }, 1200);
  };

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const positions = computeLayout(nodes, layoutAlg, width, height);
    const viewport = { x: 0, y: 0, width, height, zoom: 1 };
    const visibleIds = cullNodes(positions, viewport);

    renderGraphToCanvas(ctx, nodes, edges, positions, visibleIds, viewport);
  }, [nodes, edges, layoutAlg]);

  const toggleSave = async () => {
    if (!selectedNode) return;
    const newState = await workspaceService.toggleSaveNode(selectedNode.id);
    setIsSaved(newState);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Navegador del Grafo OptimusKG</h1>
          <p className="text-muted-foreground text-lg">
            Exploración de subgrafos, consulta de vecinos y almacenamiento directo en colecciones.
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
        {/* Canvas Engine Display */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">Canvas de Visualización</h2>

            <div className="flex items-center gap-3">
              <Button onClick={handleOpenAddToCol} variant="secondary" className="gap-2 text-base font-medium">
                <Bookmarks size={20} />
                Añadir Grafo a Colección
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-base text-muted-foreground">Layout:</span>
                <Select
                  value={layoutAlg}
                  onValueChange={(val) => setLayoutAlg(val as LayoutAlgorithm)}
                >
                  <SelectTrigger className="w-36 text-base">
                    <SelectValue placeholder="Seleccionar layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circular" className="text-base">Circular</SelectItem>
                    <SelectItem value="grid" className="text-base">Grid</SelectItem>
                    <SelectItem value="force-directed" className="text-base">Fuerza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-background overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} width={700} height={450} className="w-full h-96" />
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
            <p className="text-base text-muted-foreground">Selecciona o busca un nodo para inspeccionar sus datos.</p>
          )}
        </div>
      </div>

      {/* Modal para Añadir Grafo a Colección */}
      <Dialog open={isAddToColOpen} onOpenChange={setIsAddToColOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Guardar Grafo en Colección</DialogTitle>
            <DialogDescription className="text-base">
              Guarda los {nodes.length} nodos y {edges.length} aristas visualizadas actualmente en una colección específica.
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
