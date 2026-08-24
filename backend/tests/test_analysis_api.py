import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_submit_and_poll_job():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Enviar un job
        submit_res = await ac.post(
            "/api/v1/analysis/jobs",
            json={"type": "PATH_FINDING", "params": {"fromId": "ENSG00000000003", "toId": "UBERON_0000002"}},
        )
        assert submit_res.status_code == 200
        job_id = submit_res.json()["jobId"]
        assert job_id.startswith("job-")

        # 2. Listar jobs
        list_res = await ac.get("/api/v1/analysis/jobs")
        assert list_res.status_code == 200
        jobs = list_res.json()
        assert any(j["id"] == job_id for j in jobs)

        # 3. Esperar finalización del job
        for _ in range(20):
            status_res = await ac.get(f"/api/v1/analysis/jobs/{job_id}/status")
            assert status_res.status_code == 200
            st = status_res.json()["status"]
            if st in ["done", "error"]:
                break
            await asyncio.sleep(0.05)

        assert st == "done"

        # 4. Obtener resultado
        res_res = await ac.get(f"/api/v1/analysis/jobs/{job_id}/result")
        assert res_res.status_code == 200
        result = res_res.json()
        assert "path" in result
        assert "algorithm" in result

@pytest.mark.asyncio
async def test_job_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/analysis/jobs/non_existent_job_123/status")
        assert res.status_code == 404
