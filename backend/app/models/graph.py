from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class GraphNode(BaseModel):
    id: str
    label: str
    name: str
    description: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    createdAt: Optional[str] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    weight: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None

class Subgraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class Metapath(BaseModel):
    nodes: List[str]
    edges: List[str]
    score: Optional[float] = None

class NodeTypeCount(BaseModel):
    type: str
    count: int

class EdgeTypeCount(BaseModel):
    type: str
    count: int

class GraphSchema(BaseModel):
    nodeTypes: List[NodeTypeCount]
    edgeTypes: List[EdgeTypeCount]
    totalNodes: int
    totalEdges: int

class SubgraphRequest(BaseModel):
    nodeIds: List[str]
