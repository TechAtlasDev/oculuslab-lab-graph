from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.graph import (
    GraphNode,
    GraphEdge,
    Subgraph,
    Metapath,
    GraphSchema,
    SubgraphRequest,
)
from app.services.graph_engine import graph_engine

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("/schema", response_model=GraphSchema)
async def get_schema():
    """Retorna las estadísticas del grafo (conteo por tipo de nodo y arista)."""
    return graph_engine.get_schema()

@router.get("/search", response_model=List[GraphNode])
async def search_nodes(
    q: str = Query(..., description="Término de búsqueda"),
    limit: int = Query(20, ge=1, le=100),
    nodeTypes: Optional[str] = Query(None, description="Tipos de nodo separados por coma"),
):
    """Busca entidades en el grafo por ID, nombre o propiedades."""
    types_list = [t.strip() for t in nodeTypes.split(",") if t.strip()] if nodeTypes else None
    return graph_engine.search_nodes(query_str=q, node_types=types_list, limit=limit)

@router.get("/nodes/{node_id}", response_model=GraphNode)
async def get_node(node_id: str):
    """Obtiene un nodo por su ID."""
    node = graph_engine.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Nodo '{node_id}' no encontrado.")
    return node

@router.get("/nodes/{node_id}/neighbors", response_model=List[GraphEdge])
async def get_neighbors(
    node_id: str,
    direction: Optional[str] = Query(None, pattern="^(in|out|both)$"),
    limit: int = Query(50, ge=1, le=200),
    edgeTypes: Optional[str] = Query(None, description="Tipos de relación separados por coma"),
):
    """Obtiene las aristas adyacentes de un nodo."""
    types_list = [t.strip() for t in edgeTypes.split(",") if t.strip()] if edgeTypes else None
    return graph_engine.get_neighbors(
        node_id=node_id,
        direction=direction,
        edge_types=types_list,
        limit=limit,
    )

@router.post("/subgraph", response_model=Subgraph)
async def get_subgraph(request: SubgraphRequest):
    """Obtiene el subgrafo conexo inducido por una lista de IDs de nodos."""
    return graph_engine.get_subgraph(request.nodeIds)

@router.get("/metapath", response_model=List[Metapath])
async def get_metapaths(
    fromId: str = Query(..., description="ID del nodo origen"),
    toId: str = Query(..., description="ID del nodo destino"),
    maxLength: int = Query(3, ge=1, le=5),
):
    """Calcula metapaths y rutas semánticas entre dos entidades."""
    return graph_engine.get_metapaths(from_id=fromId, to_id=toId, max_length=maxLength)
