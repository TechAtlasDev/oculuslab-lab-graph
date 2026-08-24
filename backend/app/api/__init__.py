from fastapi import APIRouter
from app.api.graph import router as graph_router
from app.api.analysis import router as analysis_router

api_router = APIRouter()
api_router.include_router(graph_router)
api_router.include_router(analysis_router)

__all__ = ["api_router"]
