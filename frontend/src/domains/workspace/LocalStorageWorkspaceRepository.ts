import type { IWorkspaceRepository } from './IWorkspaceRepository';
import type { Collection, NodeAnnotation, UserPreferences } from '../../types';

const STORAGE_KEYS = {
  SAVED_NODES: 'optimuskg_saved_nodes',
  COLLECTIONS: 'optimuskg_collections',
  ANNOTATIONS: 'optimuskg_annotations',
  RECENT_NODES: 'optimuskg_recent_nodes',
  PREFERENCES: 'optimuskg_preferences',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  canvasLayout: 'force-directed',
  maxRenderedNodes: 500,
  showLabels: true,
};

export class LocalStorageWorkspaceRepository implements IWorkspaceRepository {
  async getSavedNodes(): Promise<string[]> {
    return this.readJson<string[]>(STORAGE_KEYS.SAVED_NODES, []);
  }

  async saveNode(nodeId: string): Promise<void> {
    const nodes = await this.getSavedNodes();
    if (!nodes.includes(nodeId)) {
      nodes.push(nodeId);
      this.writeJson(STORAGE_KEYS.SAVED_NODES, nodes);
    }
  }

  async unsaveNode(nodeId: string): Promise<void> {
    const nodes = await this.getSavedNodes();
    const filtered = nodes.filter(id => id !== nodeId);
    this.writeJson(STORAGE_KEYS.SAVED_NODES, filtered);
  }

  async isNodeSaved(nodeId: string): Promise<boolean> {
    const nodes = await this.getSavedNodes();
    return nodes.includes(nodeId);
  }

  async getCollections(): Promise<Collection[]> {
    return this.readJson<Collection[]>(STORAGE_KEYS.COLLECTIONS, [
      {
        id: 'col-clinical-demo',
        name: 'Caso Clínico: Inguinal Hernia - TGFBR2',
        description: 'Análisis de asociación gen-enfermedad y candidatos terapéuticos (Figura 3a del Paper)',
        icon: 'Dna',
        nodeIds: ['node-hernia', 'node-tgfbr2', 'node-tgfbr2-protein', 'node-tgfbeta-pathway', 'node-galunisertib', 'node-pirfenidone', 'node-fbn1'],
        edgeIds: ['edge-hernia-tgfbr2', 'edge-tgfbr2-protein', 'edge-tgfbr2-pathway', 'edge-galunisertib-tgfbr2', 'edge-pirfenidone-pathway', 'edge-hernia-fbn1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'col-default',
        name: 'Oncology Targets',
        description: 'Key genes associated with cancer research',
        icon: 'Atom',
        nodeIds: ['node-1', 'node-3', 'node-6'],
        edgeIds: ['edge-2', 'edge-5'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]);
  }

  async getCollectionById(collectionId: string): Promise<Collection | null> {
    const collections = await this.getCollections();
    return collections.find(c => c.id === collectionId) || null;
  }

  async createCollection(
    name: string, 
    description?: string, 
    icon?: string, 
    initialNodeIds: string[] = [], 
    initialEdgeIds: string[] = []
  ): Promise<Collection> {
    const collections = await this.getCollections();
    const newCollection: Collection = {
      id: `col-${Date.now()}`,
      name,
      description,
      icon,
      nodeIds: initialNodeIds,
      edgeIds: initialEdgeIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    collections.push(newCollection);
    this.writeJson(STORAGE_KEYS.COLLECTIONS, collections);
    return newCollection;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const collections = await this.getCollections();
    const filtered = collections.filter(c => c.id !== collectionId);
    this.writeJson(STORAGE_KEYS.COLLECTIONS, filtered);
  }

  async addToCollection(collectionId: string, nodeId: string): Promise<void> {
    const collections = await this.getCollections();
    const target = collections.find(c => c.id === collectionId);
    if (target && !target.nodeIds.includes(nodeId)) {
      target.nodeIds.push(nodeId);
      target.updatedAt = new Date().toISOString();
      this.writeJson(STORAGE_KEYS.COLLECTIONS, collections);
    }
  }

  async removeFromCollection(collectionId: string, nodeId: string): Promise<void> {
    const collections = await this.getCollections();
    const target = collections.find(c => c.id === collectionId);
    if (target) {
      target.nodeIds = target.nodeIds.filter(id => id !== nodeId);
      target.updatedAt = new Date().toISOString();
      this.writeJson(STORAGE_KEYS.COLLECTIONS, collections);
    }
  }

  async addEdgeToCollection(collectionId: string, edgeId: string): Promise<void> {
    const collections = await this.getCollections();
    const target = collections.find(c => c.id === collectionId);
    if (target) {
      if (!target.edgeIds) target.edgeIds = [];
      if (!target.edgeIds.includes(edgeId)) {
        target.edgeIds.push(edgeId);
        target.updatedAt = new Date().toISOString();
        this.writeJson(STORAGE_KEYS.COLLECTIONS, collections);
      }
    }
  }

  async removeEdgeFromCollection(collectionId: string, edgeId: string): Promise<void> {
    const collections = await this.getCollections();
    const target = collections.find(c => c.id === collectionId);
    if (target && target.edgeIds) {
      target.edgeIds = target.edgeIds.filter(id => id !== edgeId);
      target.updatedAt = new Date().toISOString();
      this.writeJson(STORAGE_KEYS.COLLECTIONS, collections);
    }
  }

  async getAnnotations(): Promise<NodeAnnotation[]> {
    return this.readJson<NodeAnnotation[]>(STORAGE_KEYS.ANNOTATIONS, []);
  }

  async annotateNode(nodeId: string, note: string): Promise<void> {
    const annotations = await this.getAnnotations();
    const existingIndex = annotations.findIndex(a => a.nodeId === nodeId);
    if (existingIndex >= 0) {
      annotations[existingIndex] = { nodeId, note, updatedAt: new Date().toISOString() };
    } else {
      annotations.push({ nodeId, note, updatedAt: new Date().toISOString() });
    }
    this.writeJson(STORAGE_KEYS.ANNOTATIONS, annotations);
  }

  async getNodeAnnotation(nodeId: string): Promise<string | null> {
    const annotations = await this.getAnnotations();
    const item = annotations.find(a => a.nodeId === nodeId);
    return item ? item.note : null;
  }

  async getRecentlyViewed(limit: number = 10): Promise<string[]> {
    const list = this.readJson<string[]>(STORAGE_KEYS.RECENT_NODES, ['node-1', 'node-2']);
    return list.slice(0, limit);
  }

  async trackRecentlyViewed(nodeId: string): Promise<void> {
    let list = await this.getRecentlyViewed(50);
    list = [nodeId, ...list.filter(id => id !== nodeId)];
    this.writeJson(STORAGE_KEYS.RECENT_NODES, list);
  }

  async getPreferences(): Promise<UserPreferences> {
    return this.readJson<UserPreferences>(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  }

  async setPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    this.writeJson(STORAGE_KEYS.PREFERENCES, updated);
    return updated;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Failed to write to localStorage key ${key}`, err);
    }
  }
}
