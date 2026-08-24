import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_get_schema_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/graph/schema")
        assert res.status_code == 200
        data = res.json()
        assert "totalNodes" in data
        assert "totalEdges" in data
        assert data["totalNodes"] > 0
        assert isinstance(data["nodeTypes"], list)

@pytest.mark.asyncio
async def test_search_nodes_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/graph/search?q=hernia&limit=5")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "label" in data[0]

@pytest.mark.asyncio
async def test_get_node_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        search_res = await ac.get("/api/v1/graph/search?q=hernia&limit=1")
        assert search_res.status_code == 200
        node_id = search_res.json()[0]["id"]

        res = await ac.get(f"/api/v1/graph/nodes/{node_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == node_id

        # 404 para nodo que no existe
        res_404 = await ac.get("/api/v1/graph/nodes/non_existent_node_id_99999")
        assert res_404.status_code == 404

@pytest.mark.asyncio
async def test_get_neighbors_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        search_res = await ac.get("/api/v1/graph/search?q=ENSG&limit=1")
        assert search_res.status_code == 200
        node_id = search_res.json()[0]["id"]

        res = await ac.get(f"/api/v1/graph/nodes/{node_id}/neighbors?limit=10")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_subgraph_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        search_res = await ac.get("/api/v1/graph/search?q=GEN&limit=2")
        ids = [n["id"] for n in search_res.json()]

        res = await ac.post("/api/v1/graph/subgraph", json={"nodeIds": ids})
        assert res.status_code == 200
        data = res.json()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) == len(ids)
