import type { IWorkspaceRepository } from './IWorkspaceRepository';
import type { Collection, NodeAnnotation, UserPreferences } from '../../types';

export class WorkspaceService {
  private repository: IWorkspaceRepository;

  constructor(repository: IWorkspaceRepository) {
    this.repository = repository;
  }

  async toggleSaveNode(nodeId: string): Promise<boolean> {
    const isSaved = await this.repository.isNodeSaved(nodeId);
    if (isSaved) {
      await this.repository.unsaveNode(nodeId);
      return false;
    } else {
      await this.repository.saveNode(nodeId);
      return true;
    }
  }

  async getSavedNodeIds(): Promise<string[]> {
    return this.repository.getSavedNodes();
  }

  async getCollections(): Promise<Collection[]> {
    return this.repository.getCollections();
  }

  async getCollection(collectionId: string): Promise<Collection | null> {
    return this.repository.getCollectionById(collectionId);
  }

  async createCollection(name: string, description?: string, initialNodeIds?: string[], initialEdgeIds?: string[]): Promise<Collection> {
    if (!name.trim()) throw new Error('Collection name cannot be empty');
    return this.repository.createCollection(name, description, initialNodeIds, initialEdgeIds);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    return this.repository.deleteCollection(collectionId);
  }

  async addNodeToCollection(collectionId: string, nodeId: string): Promise<void> {
    return this.repository.addToCollection(collectionId, nodeId);
  }

  async removeNodeFromCollection(collectionId: string, nodeId: string): Promise<void> {
    return this.repository.removeFromCollection(collectionId, nodeId);
  }

  async addEdgeToCollection(collectionId: string, edgeId: string): Promise<void> {
    return this.repository.addEdgeToCollection(collectionId, edgeId);
  }

  async removeEdgeFromCollection(collectionId: string, edgeId: string): Promise<void> {
    return this.repository.removeEdgeFromCollection(collectionId, edgeId);
  }

  async saveAnnotation(nodeId: string, note: string): Promise<void> {
    return this.repository.annotateNode(nodeId, note);
  }

  async getAnnotation(nodeId: string): Promise<string | null> {
    return this.repository.getNodeAnnotation(nodeId);
  }

  async getAllAnnotations(): Promise<NodeAnnotation[]> {
    return this.repository.getAnnotations();
  }

  async recordNodeVisit(nodeId: string): Promise<void> {
    return this.repository.trackRecentlyViewed(nodeId);
  }

  async getRecentHistory(limit?: number): Promise<string[]> {
    return this.repository.getRecentlyViewed(limit);
  }

  async loadPreferences(): Promise<UserPreferences> {
    return this.repository.getPreferences();
  }

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.repository.setPreferences(prefs);
  }
}
