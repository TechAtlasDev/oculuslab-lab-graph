import pytest
from app.services.graph_engine import GraphEngine

def test_graph_engine_initialization():
    engine = GraphEngine()
    assert engine.con is not None

def test_graph_engine_get_schema():
    engine = GraphEngine()
    schema = engine.get_schema()
    assert schema.totalNodes > 0
    assert schema.totalEdges > 0
    assert len(schema.nodeTypes) > 0

def test_graph_engine_search_and_get_node():
    engine = GraphEngine()
    # Buscar por texto real existente en OptimusKG
    results = engine.search_nodes(query_str="hernia", limit=5)
    assert len(results) > 0
    first_node = results[0]
    assert first_node.id is not None
    assert first_node.label is not None
    
    # Recuperar nodo directo por ID
    retrieved = engine.get_node(first_node.id)
    assert retrieved is not None
    assert retrieved.id == first_node.id

def test_graph_engine_get_neighbors():
    engine = GraphEngine()
    # Tomar un nodo representativo
    results = engine.search_nodes(query_str="ENSG00000000003", limit=1)
    if not results:
        results = engine.search_nodes(query_str="GEN", limit=1)
    node_id = results[0].id
    
    neighbors = engine.get_neighbors(node_id, limit=10)
    assert isinstance(neighbors, list)
    for edge in neighbors:
        assert edge.source == node_id or edge.target == node_id
        assert edge.type is not None

def test_graph_engine_subgraph():
    engine = GraphEngine()
    results = engine.search_nodes(query_str="GEN", limit=3)
    ids = [n.id for n in results]
    subgraph = engine.get_subgraph(ids)
    assert len(subgraph.nodes) == len(ids)
    assert isinstance(subgraph.edges, list)
