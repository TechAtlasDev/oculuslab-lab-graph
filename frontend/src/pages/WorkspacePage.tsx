import React, { useEffect, useState, useCallback } from 'react';
import { useDomainServices } from '../context/useDomainServices';
import type { Collection, NodeAnnotation, GraphNode, UserPreferences } from '../types';
import { CollectionAnalysisPage } from './CollectionAnalysisPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Folder, Trash, NotePencil, SlidersHorizontal, Plus, Bookmarks, Eye } from '@phosphor-icons/react';

export const WorkspacePage: React.FC = () => {
  const { workspaceService, graphDataService } = useDomainServices();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [annotations, setAnnotations] = useState<NodeAnnotation[]>([]);
  const [annotatedNodeDetails, setAnnotatedNodeDetails] = useState<Map<string, GraphNode>>(new Map());
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Navegación hacia el análisis de colección
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Estados de formularios y modal
  const [newColName, setNewColName] = useState<string>('');
  const [newColDesc, setNewColDesc] = useState<string>('');

  const [isAnnotModalOpen, setIsAnnotModalOpen] = useState<boolean>(false);
  const [availableNodes, setAvailableNodes] = useState<GraphNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [annotationNote, setAnnotationNote] = useState<string>('');

  const fetchWorkspaceData = useCallback(async () => {
    const [cols, annots, prefs, savedIds] = await Promise.all([
      workspaceService.getCollections(),
      workspaceService.getAllAnnotations(),
      workspaceService.loadPreferences(),
      workspaceService.getSavedNodeIds(),
    ]);

    setCollections(cols);
    setAnnotations(annots);
    setPreferences(prefs);

    // Obtener detalles de nodos anotados
    const nodeDetailsMap = new Map<string, GraphNode>();
    for (const ann of annots) {
      const node = await graphDataService.fetchNode(ann.nodeId);
      if (node) {
        nodeDetailsMap.set(node.id, node);
      }
    }
    setAnnotatedNodeDetails(nodeDetailsMap);

    // Obtener lista de nodos disponibles
    const nodePromises = savedIds.map((id: string) => graphDataService.fetchNode(id));
    const loadedNodes = (await Promise.all(nodePromises)).filter((n: GraphNode | null): n is GraphNode => n !== null);
    
    if (loadedNodes.length === 0) {
      const fallbackNodes = await graphDataService.searchGraph('a');
      setAvailableNodes(fallbackNodes);
    } else {
      setAvailableNodes(loadedNodes);
    }
  }, [workspaceService, graphDataService]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (active) {
        await fetchWorkspaceData();
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchWorkspaceData]);

  // Si hay una colección seleccionada, renderizar la vista de Análisis
  if (selectedCollectionId) {
    return (
      <CollectionAnalysisPage
        collectionId={selectedCollectionId}
        onBack={() => setSelectedCollectionId(null)}
      />
    );
  }

  // Manejadores de Colección
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await workspaceService.createCollection(newColName.trim(), newColDesc.trim() || undefined);
    setNewColName('');
    setNewColDesc('');
    await fetchWorkspaceData();
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await workspaceService.deleteCollection(id);
    await fetchWorkspaceData();
  };

  // Manejadores de Anotación
  const handleSaveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !annotationNote.trim()) return;
    await workspaceService.saveAnnotation(selectedNodeId, annotationNote.trim());
    setSelectedNodeId('');
    setAnnotationNote('');
    setIsAnnotModalOpen(false);
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
          Gestión de colecciones personalizadas, anotaciones sobre entidades biomédicas y preferencias.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sección de Colecciones */}
          <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Bookmarks size={24} />
                Colecciones ({collections.length})
              </h2>
            </div>

            {/* Formulario de Creación de Nueva Colección */}
            <form onSubmit={handleCreateCollection} className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
              <h3 className="text-base font-semibold text-foreground">Crear Nueva Colección</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Nombre de la colección (ej. Objetos Oncológicos)..."
                  className="text-base"
                />
                <Input
                  type="text"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Descripción opcional..."
                  className="text-base"
                />
              </div>
              <Button type="submit" className="gap-2 text-base font-medium">
                <Plus size={18} />
                Crear Colección
              </Button>
            </form>

            {/* Lista de Colecciones Interactivas */}
            <div className="space-y-3">
              {collections.length === 0 ? (
                <p className="text-base text-muted-foreground">No tienes colecciones creadas.</p>
              ) : (
                collections.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => setSelectedCollectionId(col.id)}
                    className="p-4 bg-muted/20 hover:bg-muted/40 border border-border rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {col.name}
                        <Badge variant="outline" className="text-base font-normal">
                          {col.nodeIds.length} Nodos
                        </Badge>
                      </h3>
                      <p className="text-base text-muted-foreground mt-1">
                        {col.description || 'Sin descripción'} • Actualizada el {new Date(col.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCollectionId(col.id);
                        }}
                        className="gap-2 text-base font-medium"
                      >
                        <Eye size={18} />
                        Analizar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteCollection(col.id, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar colección"
                      >
                        <Trash size={20} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sección de Anotaciones */}
          <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <NotePencil size={24} />
                Anotaciones de Nodos ({annotations.length})
              </h2>
              <Button onClick={() => setIsAnnotModalOpen(true)} className="gap-2 text-base font-medium">
                <Plus size={18} />
                Nueva Anotación
              </Button>
            </div>

            {/* Lista de Anotaciones */}
            <div className="space-y-4">
              {annotations.length === 0 ? (
                <p className="text-base text-muted-foreground">No has añadido notas a ninguna entidad del grafo.</p>
              ) : (
                annotations.map((ann) => {
                  const nodeDetails = annotatedNodeDetails.get(ann.nodeId);
                  return (
                    <div key={ann.nodeId} className="p-4 bg-muted/20 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            {nodeDetails ? nodeDetails.name : ann.nodeId}
                          </span>
                          {nodeDetails && (
                            <Badge variant="secondary" className="text-base">
                              {nodeDetails.label}
                            </Badge>
                          )}
                        </div>
                        <span className="text-base text-muted-foreground">
                          {new Date(ann.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-base text-foreground bg-background p-3 border border-border rounded-md italic">
                        "{ann.note}"
                      </p>
                    </div>
                  );
                })
              )}
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
                <label className="block text-base font-medium text-foreground mb-1">Layout Predeterminado</label>
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
                <label className="block text-base font-medium text-foreground mb-1">Máximo Nodos Renderizados</label>
                <Input
                  type="number"
                  value={preferences.maxRenderedNodes}
                  onChange={(e) => handlePreferenceChange('maxRenderedNodes', Number(e.target.value))}
                  className="w-full text-base"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-base font-medium text-foreground">Mostrar Etiquetas</span>
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

      {/* Modal para Crear Nueva Anotación */}
      <Dialog open={isAnnotModalOpen} onOpenChange={setIsAnnotModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Agregar Anotación a Nodo</DialogTitle>
            <DialogDescription className="text-base">
              Selecciona una entidad del grafo y escribe tu observación de investigación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAnnotation} className="space-y-4 py-2">
            <div>
              <label className="block text-base font-medium text-foreground mb-1">Entidad / Nodo</label>
              <Select value={selectedNodeId} onValueChange={(val) => setSelectedNodeId(val || '')}>
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Selecciona un nodo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id} className="text-base">
                      {node.name} ({node.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-base font-medium text-foreground mb-1">Nota / Observación</label>
              <Textarea
                value={annotationNote}
                onChange={(e) => setAnnotationNote(e.target.value)}
                placeholder="Escribe la observación sobre esta entidad biomédica..."
                className="text-base"
                rows={4}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsAnnotModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 text-base font-medium">
                Guardar Anotación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
