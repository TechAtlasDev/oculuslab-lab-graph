from typing import Any, List
from fastapi import APIRouter, HTTPException

from app.models.analysis import (
    JobSubmitRequest,
    JobSubmitResponse,
    JobStatusResponse,
    PipelineJob,
)
from app.services.analysis_engine import analysis_engine

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/jobs", response_model=JobSubmitResponse)
async def submit_job(request: JobSubmitRequest):
    """Encola un nuevo trabajo de análisis computacional."""
    job_id = analysis_engine.submit_job(job_type=request.type, params=request.params)
    return JobSubmitResponse(jobId=job_id)

@router.get("/jobs", response_model=List[PipelineJob])
async def list_jobs():
    """Lista todos los jobs registrados."""
    return analysis_engine.list_jobs()

@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Obtiene el estado de ejecución de un job."""
    job = analysis_engine.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' no encontrado.")
    return JobStatusResponse(status=job.status, progress=job.progress)

@router.get("/jobs/{job_id}/result")
async def get_job_result(job_id: str) -> Any:
    """Obtiene el resultado procesado de un job."""
    job = analysis_engine.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' no encontrado.")
    if job.status == "error":
        raise HTTPException(status_code=500, detail=job.error or "Error en ejecución del job.")
    return job.result
