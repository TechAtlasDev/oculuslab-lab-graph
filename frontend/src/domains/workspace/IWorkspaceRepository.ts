import type { Collection, NodeAnnotation, UserPreferences } from '../../types';

export interface IWorkspaceRepository {
  // Saved Nodes
  getSavedNodes(): Promise<string[]>;
  saveNode(nodeId: string): Promise<void>;
  unsaveNode(nodeId: string): Promise<void>;
  isNodeSaved(nodeId: string): Promise<boolean>;

  // Collections
  getCollections(): Promise<Collection[]>;
  getCollectionById(collectionId: string): Promise<Collection | null>;
  createCollection(name: string, description?: string, icon?: string, initialNodeIds?: string[], initialEdgeIds?: string[]): Promise<Collection>;
  deleteCollection(collectionId: string): Promise<void>;
  addToCollection(collectionId: string, nodeId: string): Promise<void>;
  removeFromCollection(collectionId: string, nodeId: string): Promise<void>;
  addEdgeToCollection(collectionId: string, edgeId: string): Promise<void>;
  removeEdgeFromCollection(collectionId: string, edgeId: string): Promise<void>;

  // Annotations
  getAnnotations(): Promise<NodeAnnotation[]>;
  annotateNode(nodeId: string, note: string): Promise<void>;
  getNodeAnnotation(nodeId: string): Promise<string | null>;

  // History
  getRecentlyViewed(limit?: number): Promise<string[]>;
  trackRecentlyViewed(nodeId: string): Promise<void>;

  // Preferences
  getPreferences(): Promise<UserPreferences>;
  setPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences>;
}
