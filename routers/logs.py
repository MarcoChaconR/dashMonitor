from fastapi import APIRouter, Depends, Query, HTTPException
from services.auth_service import require_auth
from services.log_service import discover_log_sources, read_log

router = APIRouter(prefix="/api", tags=["logs"], dependencies=[Depends(require_auth)])


@router.get("/logs")
async def list_logs():
    return {"sources": discover_log_sources()}


@router.get("/logs/{source}")
async def get_log(source: str, lines: int = Query(50, ge=1, le=5000), filter: str = Query("")):
    sources = discover_log_sources()
    for s in sources:
        if s["name"] == source:
            return read_log(s["path"], lines, filter)
    raise HTTPException(404, f"Fuente '{source}' no encontrada")


@router.get("/logs-custom")
async def get_custom_log(lines: int = Query(50, ge=1, le=5000), filter: str = Query(""), path: str = Query(...)):
    return read_log(path, lines, filter)
