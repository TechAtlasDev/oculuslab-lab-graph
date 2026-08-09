import React, { useEffect, useState } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { GraphSchema, GraphNode } from '../types';
import { Badge } from '@/components/ui/badge';
import { Graph, MagnifyingGlass, BookmarkSimple, Cpu, CaretRight } from '@phosphor-icons/react';

export const DashboardPage: React.FC = () => {
  const { graphDataService, workspaceService } = useDomainServices();
  const [schema, setSchema] = useState<GraphSchema | null>(null);
  const [recentNodes, setRecentNodes] = useState<GraphNode[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [schemaData, savedIds, recentIds] = await Promise.all([
          graphDataService.fetchSchema(),
          workspaceService.getSavedNodeIds(),
          workspaceService.getRecentHistory(5),
        ]);

        setSchema(schemaData);
        setSavedCount(savedIds.length);

        const nodePromises = recentIds.map(id => graphDataService.fetchNode(id));
        const nodes = (await Promise.all(nodePromises)).filter((n): n is GraphNode => n !== null);
        setRecentNodes(nodes);
      } catch (err) {
        console.error('Error al cargar datos del Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [graphDataService, workspaceService]);

  if (loading) {
    return (
      <div className="p-8 text-foreground">
        <p className="text-xl">Cargando métricas del sistema OptimusKG...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Graph size={36} weight="duotone" className="text-primary" />
          Dashboard de Exploración OptimusKG
        </h1>
        <p className="text-muted-foreground text-lg">
          Resumen cuantitativo del Grafo de Conocimiento Biomédico y estado del Workspace.
        </p>
      </header>

      {/* Grid de Métricas del Grafo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card rounded-xl border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-base fmedium_r">Total Nodos</span>
            <Graph size={28} />
          </div>
          <p className="text-4xl font-bold text-foreground">
            {schema?.totalNodes.toLocaleString()}
          </p>
          <p className="text-base text-muted-foreground">Entidades biomédicas indexadas</p>
        </div>

        <div className="div-card p-6 bg-card rounded-xl border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-base fmedium_r">Total Aristas</span>
            <Cpu size={28} />
          </div>
          <p className="text-4xl font-bold text-foreground">
            {schema?.totalEdges.toLocaleString()}
          </p>
          <p className="text-base text-muted-foreground">Relaciones multimodales</p>
        </div>

        <div className="p-6 bg-card rounded-xl border border-border space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-base fmedium_r">Nodos Guardados</span>
            <BookmarkSimple size={28} />
          </div>
          <p className="text-4xl font-bold text-foreground">{savedCount}</p>
          <p className="text-base text-muted-foreground">En tu colección personal local</p>
        </div>
      </div>

      {/* Distribución por Tipos de Nodos */}
      <div className="p-6 bg-card rounded-xl border border-border space-y-6">
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <MagnifyingGlass size={24} />
          Distribución de Entidades por Categoría
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {schema?.nodeTypes.map((item) => (
            <div key={item.type} className="p-4 bg-muted/40 rounded-lg border border-border space-y-1">
              <span className="text-base font-semibold text-primary">{item.type}</span>
              <p className="text-xl font-bold text-foreground">{item.count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recientemente Visitados */}
      <div className="p-6 bg-card rounded-xl border border-border space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Actividad Reciente</h2>
        {recentNodes.length === 0 ? (
          <p className="text-base text-muted-foreground">No has explorado nodos recientemente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentNodes.map((node) => (
              <li key={node.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg fmedium_r text-foreground">{node.name}</span>
                  <Badge variant="secondary" className="text-base">
                    {node.label}
                  </Badge>
                </div>
                <CaretRight size={20} className="text-muted-foreground" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
