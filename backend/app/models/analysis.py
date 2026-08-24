from typing import Any, Dict, Optional, Literal
from pydantic import BaseModel, Field

JobType = Literal["PROJECTION", "SUBGRAPH_EXTRACTION", "PATH_FINDING", "EVIDENCE_SCORING"]
JobStatus = Literal["pending", "running", "done", "error"]

class JobSubmitRequest(BaseModel):
    type: JobType
    params: Dict[str, Any] = Field(default_factory=dict)

class JobSubmitResponse(BaseModel):
    jobId: str

class JobStatusResponse(BaseModel):
    status: JobStatus
    progress: Optional[float] = None

class PipelineJob(BaseModel):
    id: str
    type: JobType
    params: Dict[str, Any]
    status: JobStatus
    progress: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    createdAt: str
