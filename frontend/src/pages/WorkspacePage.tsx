import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDomainServices } from '../context/useDomainServices';
import type { Collection, NodeAnnotation, GraphNode, UserPreferences } from '../types';
import { CollectionAnalysisPage } from './CollectionAnalysisPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Folder,
  Trash,
  NotePencil,
  SlidersHorizontal,
  Plus,
  Bookmarks,
  Eye,
  MagnifyingGlass,
  Dna,
  Atom,
  FirstAid,
  FolderUser,
  Flask,
  TreeStructure,
} from '@phosphor-icons/react';

const ICON_OPTIONS = [
  { name: 'Folder', icon: Folder },
  { name: 'Bookmarks', icon: Bookmarks },
  { name: 'Dna', icon: Dna },
  { name: 'Atom', icon: Atom },
  { name: 'FirstAid', icon: FirstAid },
  { name: 'FolderUser', icon: FolderUser },
  { name: 'Flask', icon: Flask },
  { name: 'TreeStructure', icon: TreeStructure },
];

interface WorkspacePageProps {
  initialTab?: 'all' | 'collections' | 'annotations';
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ initialTab = 'all' }) => {
  const { collectionId: urlCollectionId } = useParams<{ collectionId?: string }>();
  const navigate = useNavigate();
  const { workspaceService, graphDataService } = useDomainServices();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [annotations, setAnnotations] = useState<NodeAnnotation[]>([]);
  const [annotatedNodeDetails, setAnnotatedNodeDetails] = useState<Map<string, GraphNode>>(new Map());
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Modal Crear Colección
  const [isColModalOpen, setIsColModalOpen] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');
  const [newColDesc, setNewColDesc] = useState<string>('');
  const [selectedIconName, setSelectedIconName] = useState<string>('Folder');
  const [nodeSearchQuery, setNodeSearchQuery] = useState<string>('');
  const [allGraphNodes, setAllGraphNodes] = useState<GraphNode[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Modal Crear Anotación
  const [isAnnotModalOpen, setIsAnnotModalOpen] = useState<boolean>(false);
  const [selectedNodeIdForAnnot, setSelectedNodeIdForAnnot] = useState<string>('');
  const [annotationNote, setAnnotationNote] = useState<string>('');

  const fetchWorkspaceData = useCallback(async () => {
    const [cols, annots, prefs, initialNodes] = await Promise.all([
      workspaceService.getCollections(),
      workspaceService.getAllAnnotations(),
      workspaceService.loadPreferences(),
      graphDataService.searchGraph('a'),
    ]);

    setCollections(cols);
    setAnnotations(annots);
    setPreferences(prefs);
    setAllGraphNodes(initialNodes);

    // Obtener detalles de nodos anotados
    const nodeDetailsMap = new Map<string, GraphNode>();
    for (const ann of annots) {
      const node = await graphDataService.fetchNode(ann.nodeId);
      if (node) {
        nodeDetailsMap.set(node.id, node);
      }
    }
    setAnnotatedNodeDetails(nodeDetailsMap);
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

  // Si hay una colección en la URL, renderizar la vista de Análisis
  if (urlCollectionId) {
    return (
      <CollectionAnalysisPage
        collectionId={urlCollectionId}
        onBack={() => navigate('/workspace/collections')}
      />
    );
  }

  // Manejador de Creación de Colección desde Modal
  const handleCreateCollectionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await workspaceService.createCollection(
      newColName.trim(),
      newColDesc.trim() || undefined,
      selectedIconName,
      selectedNodeIds
    );

    // Reiniciar formulario
    setNewColName('');
    setNewColDesc('');
    setSelectedIconName('Folder');
    setSelectedNodeIds([]);
    setIsColModalOpen(false);
    await fetchWorkspaceData();
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await workspaceService.deleteCollection(id);
    await fetchWorkspaceData();
  };

  // Manejador de Anotaciones
  const handleSaveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeIdForAnnot || !annotationNote.trim()) return;
    await workspaceService.saveAnnotation(selectedNodeIdForAnnot, annotationNote.trim());
    setSelectedNodeIdForAnnot('');
    setAnnotationNote('');
    setIsAnnotModalOpen(false);
    await fetchWorkspaceData();
  };

  const handlePreferenceChange = async (key: keyof UserPreferences, value: unknown) => {
    const updated = await workspaceService.updatePreferences({ [key]: value });
    setPreferences(updated);
  };

  const toggleNodeSelection = (id: string) => {
    setSelectedNodeIds(prev =>
      prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]
    );
  };

  const filteredNodesForModal = allGraphNodes.filter(
    node =>
      node.name.toLowerCase().includes(nodeSearchQuery.toLowerCase()) ||
      node.label.toLowerCase().includes(nodeSearchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(nodeSearchQuery.toLowerCase())
  );

  const getCollectionIcon = (iconName?: string) => {
    const found = ICON_OPTIONS.find(i => i.name === iconName);
    const IconComp = found ? found.icon : Folder;
    return <IconComp size={24} className="text-primary" />;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Folder size={36} className="text-primary" />
          Workspace del Usuario {initialTab !== 'all' ? `(${initialTab.toUpperCase()})` : ''}
        </h1>
        <p className="text-muted-foreground text-lg">
          Gestión de colecciones personalizadas con nodos seleccionables, anotaciones y preferencias de sesión local.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sección de Colecciones */}
          {(initialTab === 'all' || initialTab === 'collections') && (
            <div className="p-6 bg-card border border-border rounded-xl space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Bookmarks size={24} />
                  Colecciones ({collections.length})
                </h2>
                <Button onClick={() => setIsColModalOpen(true)} className="gap-2 text-base font-medium">
                  <Plus size={18} />
                  Nueva Colección
                </Button>
              </div>

              {/* Lista de Colecciones Interactivas */}
              <div className="space-y-3">
                {collections.length === 0 ? (
                  <p className="text-base text-muted-foreground">No tienes colecciones creadas.</p>
                ) : (
                  collections.map((col) => (
                    <div
                      key={col.id}
                      onClick={() => navigate(`/workspace/collections/${col.id}`)}
                      className="p-4 bg-muted/20 hover:bg-muted/40 border border-border rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getCollectionIcon(col.icon)}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            {col.name}
                            <Badge variant="outline" className="text-base font-normal">
                              {col.nodeIds.length} Nodos
                            </Badge>
                          </h3>
                          <p className="text-base text-muted-foreground mt-0.5">
                            {col.description || 'Sin descripción'} • Actualizada el {new Date(col.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/workspace/collections/${col.id}`);
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
          )}

          {/* Sección de Anotaciones */}
          {(initialTab === 'all' || initialTab === 'annotations') && (
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
          )}
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

      {/* Modal para Crear Nueva Colección */}
      <Dialog open={isColModalOpen} onOpenChange={setIsColModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Crear Nueva Colección</DialogTitle>
            <DialogDescription className="text-base">
              Asigna un nombre, descripción opcional, ícono representativo y selecciona nodos iniciales.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCollectionModal} className="space-y-4 py-2">
            <div>
              <label className="block text-base font-medium text-foreground mb-1">Nombre de la Colección *</label>
              <Input
                type="text"
                required
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Ej. Oncología Genómica..."
                className="text-base"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-foreground mb-1">Descripción (Opcional)</label>
              <Input
                type="text"
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                placeholder="Observaciones de investigación..."
                className="text-base"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-foreground mb-1">Seleccionar Ícono</label>
              <div className="grid grid-cols-4 gap-2">
                {ICON_OPTIONS.map((item) => {
                  const IconC = item.icon;
                  const isSelected = selectedIconName === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedIconName(item.name)}
                      className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <IconC size={22} />
                      <span className="text-base font-medium">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menú Desplegable con Buscador de Nodos Existentes */}
            <div className="space-y-2">
              <label className="block text-base font-medium text-foreground">
                Asignar Nodos de la Base de Datos ({selectedNodeIds.length} seleccionados)
              </label>
              <div className="relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  value={nodeSearchQuery}
                  onChange={(e) => setNodeSearchQuery(e.target.value)}
                  placeholder="Buscar nodo por nombre o etiqueta..."
                  className="pl-9 text-base"
                />
              </div>

              <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-1 bg-background">
                {filteredNodesForModal.length === 0 ? (
                  <p className="text-base text-muted-foreground p-2">No se encontraron nodos.</p>
                ) : (
                  filteredNodesForModal.map((node) => {
                    const isChecked = selectedNodeIds.includes(node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => toggleNodeSelection(node.id)}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isChecked} onCheckedChange={() => toggleNodeSelection(node.id)} />
                          <span className="text-base font-medium text-foreground">{node.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-base font-medium">
                          {node.label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsColModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 text-base font-medium">
                Crear Colección
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <Select value={selectedNodeIdForAnnot} onValueChange={(val) => setSelectedNodeIdForAnnot(val || '')}>
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Selecciona un nodo..." />
                </SelectTrigger>
                <SelectContent>
                  {allGraphNodes.map((node) => (
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
