# Guía Completa de Servicios y Uso

Esta guía explica detalladamente cómo consumir los servicios de dominio dentro de los componentes React de la plataforma.

---

## 1. Inyección de Servicios con `useDomainServices`

Todos los servicios están disponibles mediante el hook `useDomainServices()`, provisto por `DomainProvider`.

```tsx
import { useDomainServices } from '../context/DomainProvider';

export const MiComponente = () => {
  const { graphDataService, analysisService, workspaceService } = useDomainServices();
  // ...
};
```

---

## 2. GraphDataService

Servicio para consulta de datos del grafo con caché integrado.

### Métodos Disponibles:
- `fetchNode(id: string): Promise<GraphNode | null>`
- `fetchNeighbors(id: string, options?: GetNeighborsOptions): Promise<GraphEdge[]>`
- `searchGraph(query: string, options?: SearchOptions): Promise<GraphNode[]>`
- `fetchSubgraph(nodeIds: string[]): Promise<Subgraph>`
- `fetchMetapaths(fromId: string, toId: string, maxLength?: number): Promise<Metapath[]>`
- `fetchSchema(): Promise<GraphSchema>`

### Ejemplo de Uso:
```tsx
const node = await graphDataService.fetchNode('node-1');
const neighbors = await graphDataService.fetchNeighbors('node-1', { limit: 10 });
```

---

## 3. AnalysisService

Servicio para tareas computacionales derivadas y asíncronas.

### Métodos Disponibles:
- `runPathFinding(fromId: string, toId: string, maxLength?: number): Promise<string>`
- `runProjection(method?: string, dimensions?: number): Promise<string>`
- `runEvidenceScoring(nodeId: string, diseaseId: string): Promise<string>`
- `runSubgraphExtraction(seedNodeIds: string[], depth?: number): Promise<string>`
- `pollJobUntilDone<T>(jobId: string, onProgress?: (status: string) => void): Promise<T | null>`
- `getAllJobs(): Promise<PipelineJob[]>`

### Ejemplo de Uso:
```tsx
const jobId = await analysisService.runPathFinding('node-1', 'node-3');
const result = await analysisService.pollJobUntilDone(jobId, (status) => {
  console.log(`Estado del trabajo: ${status}`);
});
```

---

## 4. WorkspaceService

Servicio para gestión de datos persistidos localmente en `localStorage`.

### Métodos Disponibles:
- `toggleSaveNode(nodeId: string): Promise<boolean>`
- `getSavedNodeIds(): Promise<string[]>`
- `getCollections(): Promise<Collection[]>`
- `createCollection(name: string, description?: string): Promise<Collection>`
- `deleteCollection(collectionId: string): Promise<void>`
- `saveAnnotation(nodeId: string, note: string): Promise<void>`
- `recordNodeVisit(nodeId: string): Promise<void>`
- `loadPreferences(): Promise<UserPreferences>`
- `updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences>`

### Ejemplo de Uso:
```tsx
const isSaved = await workspaceService.toggleSaveNode('node-1');
await workspaceService.createCollection('Genética del Cáncer');
```
