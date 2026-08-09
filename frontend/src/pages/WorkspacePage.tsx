import React, { useEffect, useState } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { Collection, GraphNode, UserPreferences } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, Trash, BookmarkSimple, SlidersHorizontal } from '@phosphor-icons/react';

export const WorkspacePage: React.FC = () => {
  const { workspaceService, graphDataService } = useDomainServices();
  const [savedNodes, setSavedNodes] = useState<GraphNode[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [newColName, setNewColName] = useState<string>('');

  const fetchWorkspaceData = async () => {
    const [savedIds, cols, prefs] = await Promise.all([
      workspaceService.getSavedNodeIds(),
      workspaceService.getCollections(),
      workspaceService.loadPreferences(),
    ]);

    setCollections(cols);
    setPreferences(prefs);

    const nodePromises = savedIds.map((id: string) => graphDataService.fetchNode(id));
    const nodes = (await Promise.all(nodePromises)).filter((n: GraphNode | null): n is GraphNode => n !== null);
    setSavedNodes(nodes);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const [savedIds, cols, prefs] = await Promise.all([
        workspaceService.getSavedNodeIds(),
        workspaceService.getCollections(),
        workspaceService.loadPreferences(),
      ]);

      if (!active) return;
      setCollections(cols);
      setPreferences(prefs);

      const nodePromises = savedIds.map((id: string) => graphDataService.fetchNode(id));
      const nodes = (await Promise.all(nodePromises)).filter((n: GraphNode | null): n is GraphNode => n !== null);
      if (active) {
        setSavedNodes(nodes);
      }
    })();

    return () => {
      active = false;
    };
  }, [workspaceService, graphDataService]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await workspaceService.createCollection(newColName);
    setNewColName('');
    await fetchWorkspaceData();
  };

  const handleDeleteCollection = async (id: string) => {
    await workspaceService.deleteCollection(id);
    await fetchWorkspaceData();
  };

  const handlePreferenceChange = async (key: keyof UserPreferences, value: unknown) => {
    const updated = await workspaceService.updatePreferences({ [key]: value });
    setPreferences(updated);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Folder size={36} className="text-primary" />
          Workspace del Usuario
        </h1>
        <p className="text-muted-foreground text-lg">
          Gestión de nodos guardados, colecciones personalizadas y preferencias de sesión local.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Nodos Guardados */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-card border border-border rounded-xl space-y-4 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BookmarkSimple size={24} />
              Nodos Guardados ({savedNodes.length})
            </h2>
            {savedNodes.length === 0 ? (
              <p className="text-base text-muted-foreground">No tienes nodos guardados en tu espacio de trabajo.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedNodes.map((node) => (
                  <div key={node.id} className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">{node.name}</span>
                      <Badge variant="secondary" className="text-base">
                        {node.label}
                      </Badge>
                    </div>
                    <p className="text-base text-muted-foreground line-clamp-2">{node.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colecciones */}
          <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Folder size={24} />
                Colecciones ({collections.length})
              </h2>
              <form onSubmit={handleCreateCollection} className="flex gap-2">
                <Input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Nueva colección..."
                  className="w-48 text-base"
                />
                <Button type="submit" className="text-base fmedium_r">
                  Crear
                </Button>
              </form>
            </div>

            <div className="space-y-3">
              {collections.map((col) => (
                <div key={col.id} className="p-4 bg-muted/20 border border-border rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{col.name}</h3>
                    <p className="text-base text-muted-foreground">
                      {col.description || 'Sin descripción'} • {col.nodeIds.length} Nodos
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCollection(col.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Eliminar colección"
                  >
                    <Trash size={20} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preferencias del Usuario */}
        <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm h-fit">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <SlidersHorizontal size={24} />
            Preferencias Locales
          </h2>

          {preferences && (
            <div className="space-y-4">
              <div>
                <label className="block text-base fmedium_r text-foreground mb-1">Layout Predeterminado</label>
                <Select
                  value={preferences.canvasLayout}
                  onValueChange={(val) => handlePreferenceChange('canvasLayout', val)}
                >
                  <SelectTrigger className="w-full text-base">
                    <SelectValue placeholder="Seleccionar layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circular" className="text-base">Circular</SelectItem>
                    <SelectItem value="grid" className="text-base">Grid</SelectItem>
                    <SelectItem value="force-directed" className="text-base">Fuerza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-base fmedium_r text-foreground mb-1">Máximo Nodos Renderizados</label>
                <Input
                  type="number"
                  value={preferences.maxRenderedNodes}
                  onChange={(e) => handlePreferenceChange('maxRenderedNodes', Number(e.target.value))}
                  className="w-full text-base"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-base fmedium_r text-foreground">Mostrar Etiquetas</span>
                <input
                  type="checkbox"
                  checked={preferences.showLabels}
                  onChange={(e) => handlePreferenceChange('showLabels', e.target.checked)}
                  className="w-5 h-5 rounded border-border"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
