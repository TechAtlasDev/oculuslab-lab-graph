import React, { useEffect, useState, useRef } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { Collection, GraphNode, GraphEdge } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { computeLayout } from '../engines/canvas/layout';
import type { LayoutAlgorithm } from '../engines/canvas/layout';
import { cullNodes } from '../engines/canvas/culling';
import { renderGraphToCanvas } from '../engines/canvas/renderer';
import { ArrowLeft, Bookmarks, Graph, Trash, Play } from '@phosphor-icons/react';

interface CollectionAnalysisPageProps {
  collectionId: string;
  onBack: () => void;
}

export const CollectionAnalysisPage: React.FC<CollectionAnalysisPageProps> = ({
  collectionId,
  onBack,
}) => {
  const { workspaceService, graphDataService, analysisService } = useDomainServices();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [layoutAlg, setLayoutAlg] = useState<LayoutAlgorithm>('circular');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const refreshData = async () => {
    const col = await workspaceService.getCollection(collectionId);
    if (!col) return;
    setCollection(col);

    const nodePromises = col.nodeIds.map((id: string) => graphDataService.fetchNode(id));
    const loadedNodes = (await Promise.all(nodePromises)).filter((n: GraphNode | null): n is GraphNode => n !== null);
    setNodes(loadedNodes);

    if (loadedNodes.length > 0) {
      const subgraph = await graphDataService.fetchSubgraph(loadedNodes.map(n => n.id));
      setEdges(subgraph.edges);
    } else {
      setEdges([]);
    }
  };

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

      if (loadedNodes.length > 0) {
        const subgraph = await graphDataService.fetchSubgraph(loadedNodes.map(n => n.id));
        if (active) setEdges(subgraph.edges);
      } else {
        if (active) setEdges([]);
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [collectionId, workspaceService, graphDataService]);

  // Renderizar en Canvas
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

  const handleRemoveNode = async (nodeId: string) => {
    if (!collection) return;
    await workspaceService.removeNodeFromCollection(collection.id, nodeId);
    await refreshData();
  };

  const handleRemoveEdge = async (edgeId: string) => {
    if (!collection) return;
    await workspaceService.removeEdgeFromCollection(collection.id, edgeId);
    await refreshData();
  };

  const handleRunSubGraphAnalysis = async () => {
    if (nodes.length === 0) return;
    const jobId = await analysisService.runSubgraphExtraction(nodes.map(n => n.id));
    setAnalysisResult('Ejecutando análisis de subgrafo...');
    const result = await analysisService.pollJobUntilDone(jobId);
    setAnalysisResult(JSON.stringify(result, null, 2));
  };

  if (loading) {
    return (
      <div className="p-8 text-foreground">
        <p className="text-xl">Cargando análisis de la colección...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-8 space-y-4 text-foreground">
        <p className="text-xl">La colección solicitada no existe.</p>
        <Button onClick={onBack} variant="outline" className="gap-2 text-base font-medium">
          <ArrowLeft size={20} /> Volver a Colecciones
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header con Navegación hacia atrás */}
      <header className="space-y-4">
        <Button onClick={onBack} variant="outline" className="gap-2 text-base font-medium">
          <ArrowLeft size={20} /> Volver al Workspace
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Bookmarks size={32} className="text-primary" />
              <h1 className="text-3xl font-bold text-foreground">{collection.name}</h1>
            </div>
            <p className="text-muted-foreground text-lg mt-1">
              {collection.description || 'Sin descripción'} • Creada el {new Date(collection.createdAt).toLocaleDateString()}
            </p>
          </div>

          <Button onClick={handleRunSubGraphAnalysis} className="gap-2 text-base font-medium">
            <Play size={20} weight="fill" />
            Analizar Subgrafo en Pipeline
          </Button>
        </div>
      </header>

      {/* Visualización en Canvas Engine de la Colección */}
      <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Graph size={24} />
            Lienzo Interactivo de la Colección
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-base text-muted-foreground">Layout:</span>
            <select
              value={layoutAlg}
              onChange={(e) => setLayoutAlg(e.target.value as LayoutAlgorithm)}
              className="px-3 py-1 bg-background border border-border rounded-md text-base text-foreground"
            >
              <option value="circular">Circular</option>
              <option value="grid">Grid</option>
              <option value="force-directed">Fuerza</option>
            </select>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-background overflow-hidden flex items-center justify-center">
          <canvas ref={canvasRef} width={700} height={350} className="w-full h-80" />
        </div>
      </div>

      {/* Tabla de Nodos (Vértices) */}
      <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          Tabla de Nodos Guardados ({nodes.length})
        </h2>

        {nodes.length === 0 ? (
          <p className="text-base text-muted-foreground">No hay nodos guardados en esta colección.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold">ID</TableHead>
                <TableHead className="text-base font-semibold">Nombre</TableHead>
                <TableHead className="text-base font-semibold">Etiqueta / Tipo</TableHead>
                <TableHead className="text-base font-semibold">Descripción</TableHead>
                <TableHead className="text-base font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.id}>
                  <TableCell className="font-mono text-base">{node.id}</TableCell>
                  <TableCell className="font-bold text-base text-foreground">{node.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-base font-medium">
                      {node.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground">{node.description}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveNode(node.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Quitar nodo"
                    >
                      <Trash size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Tabla de Aristas / Vértices de Relación */}
      <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          Tabla de Aristas y Relaciones ({edges.length})
        </h2>

        {edges.length === 0 ? (
          <p className="text-base text-muted-foreground">No se registran aristas de conexión entre estos nodos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold">ID Arista</TableHead>
                <TableHead className="text-base font-semibold">Origen (Source)</TableHead>
                <TableHead className="text-base font-semibold">Relación / Tipo</TableHead>
                <TableHead className="text-base font-semibold">Destino (Target)</TableHead>
                <TableHead className="text-base font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edges.map((edge) => (
                <TableRow key={edge.id}>
                  <TableCell className="font-mono text-base">{edge.id}</TableCell>
                  <TableCell className="text-base font-medium text-foreground">{edge.source}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-base font-semibold">
                      {edge.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-base font-medium text-foreground">{edge.target}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEdge(edge.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Quitar relación"
                    >
                      <Trash size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Resultado del Análisis Asíncrono */}
      {analysisResult && (
        <div className="p-6 bg-card border border-border rounded-xl space-y-3 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Resultado del Análisis de Subgrafo</h2>
          <pre className="p-4 bg-background border border-border rounded-lg text-base font-mono overflow-x-auto text-foreground">
            {analysisResult}
          </pre>
        </div>
      )}
    </div>
  );
};
