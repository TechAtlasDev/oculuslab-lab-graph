# Arquitectura de Dominios de Servicios - Plataforma OptimusKG

Esta documentación especifica la arquitectura modular del frontend de la plataforma de exploración del grafo biomédico **OptimusKG** (190,939 nodos, 21,818,752 aristas, 27 tipos de relación).

---

## 1. Principios de Arquitectura

El diseño sigue el principio de **desacoplamiento de persistencia** y **cohesión por naturaleza de datos**:
- **¿Qué hace vs. Dónde vive?**: Las vistas y componentes consumen servicios de dominio de alto nivel. Estos servicios delegan la persistencia a repositorios abstractos ([IGraphRepository](file:///home/techatlasdev/Proyectos/OculusLab/grafos/laboratorio3/frontend/src/domains/graph-data/IGraphRepository.ts), [IPipelineRunner](file:///home/techatlasdev/Proyectos/OculusLab/grafos/laboratorio3/frontend/src/domains/analysis/IPipelineRunner.ts), [IWorkspaceRepository](file:///home/techatlasdev/Proyectos/OculusLab/grafos/laboratorio3/frontend/src/domains/workspace/IWorkspaceRepository.ts)).
- **Migración transparente**: El frontend funciona localmente con `Mock` y `LocalStorage`. El paso a backend de producción (Neo4j/Parquet/FastAPI) se realiza inyectando la implementación `Api` correspondiente sin alterar los componentes UI.

---

## 2. Los 3 Dominios de Servicios + Engine

```
                                +-------------------+
                                |  Componentes UI   |
                                +---------+---------+
                                          |
                                          v
                              +-----------------------+
                              | DomainProvider        |
                              +-----------+-----------+
                                          |
         +--------------------------------+--------------------------------+
         |                                |                                |
         v                                v                                v
+------------------+            +-------------------+            +--------------------+
| GraphDataDomain  |            |  AnalysisDomain   |            |  WorkspaceDomain   |
| (GraphDataServ)  |            | (AnalysisService) |            | (WorkspaceService) |
+--------+---------+            +---------+---------+            +---------+----------+
         |                                |                                |
         v                                v                                v
+------------------+            +-------------------+            +--------------------+
| IGraphRepository |            |  IPipelineRunner  |            |IWorkspaceRepository|
+--------+---------+            +---------+---------+            +---------+----------+
         |                                |                                |
   +-----+-----+                    +-----+-----+                    +-----+-----+
   |           |                    |           |                    |           |
   v           v                    v           v                    v           v
 Mock         Api                 Mock         Api              LocalStorage    Cloud (futuro)
```

### 3.1. Graph Data Domain (`src/domains/graph-data/`)
* **Propósito**: Información objetiva y de solo lectura sobre las entidades y estructura del grafo (nodos, aristas, esquema).
* **Naturaleza del dato**: Determinista y global.
* **Componentes**:
  - `IGraphRepository.ts`: Contrato de acceso a datos.
  - `MockGraphRepository.ts`: Simulación con datos precargados.
  - `ApiGraphRepository.ts`: Conector para API REST/GraphQL.
  - `GraphDataService.ts`: Orquestador con caché en memoria.

### 3.2. Analysis / Pipeline Domain (`src/domains/analysis/`)
* **Propósito**: Computación derivada o transformaciones complejas (path finding, embeddings, evidencia PaperQA3, scoring).
* **Naturaleza del dato**: Asíncrono por definición (Jobs).
* **Componentes**:
  - `IPipelineRunner.ts`: Contrato para envío y sondeo de ejecuciones.
  - `MockPipelineRunner.ts`: Simula ejecución asíncrona mediante temporizadores y resultados sintetizados.
  - `ApiPipelineRunner.ts`: Conector con colas de tareas/WebSockets del backend.
  - `AnalysisService.ts`: Orquestador que expone métodos como `runPathFinding` y sondeo automático.

### 3.3. Workspace Domain (`src/domains/workspace/`)
* **Propósito**: Estado personal del usuario (nodos guardados, colecciones, anotaciones, historial y preferencias).
* **Naturaleza del dato**: Local al cliente.
* **Componentes**:
  - `IWorkspaceRepository.ts`: Contrato de persistencia del workspace.
  - `LocalStorageWorkspaceRepository.ts`: Persistencia síncrona en `localStorage`.
  - `WorkspaceService.ts`: Servicio de gestión del workspace personal.

### 3.4. Motor de Canvas (`src/engines/canvas/`)
* **Propósito**: Cómputo matemático de layout, culling por viewport y renderizado visual en HTML5 Canvas. No posee persistencia ni lógica transaccional de negocio.

---

## 3. Matriz de Clasificación para Nuevas Funcionalidades

Ante cualquier nuevo requerimiento, la clasificación se realiza con la siguiente regla:

| Funcionalidad | Dominio Asignado | Justificación |
| :--- | :--- | :--- |
| **Búsqueda / Filtros de Nodos** | `Graph Data` | Consulta directa de información objetiva. |
| **Guardar Nodo como Favorito** | `Workspace` | Estado exclusivo del usuario local. |
| **Cálculo de Rutas / Caminos** | `Analysis / Pipeline` | Procesamiento derivado potencialmente costoso. |
| **Renderizado / Zoom del Canvas** | `Canvas Engine` | Presentación matemática pura. |
