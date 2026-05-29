from fastapi import APIRouter, Depends, HTTPException
from services.auth_service import require_auth
from services.cron_service import get_cron_jobs, add_cron_job, delete_cron_job, run_cron_job

router = APIRouter(prefix="/api", tags=["cron"])


@router.get("/cron")
async def list_cron(source: str = "root", username: str = Depends(require_auth)):
    try:
        return get_cron_jobs(source)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/cron")
async def create_cron(body: dict, username: str = Depends(require_auth)):
    try:
        return add_cron_job(body["schedule"], body["command"], body.get("source", "root"))
    except KeyError as e:
        raise HTTPException(400, f"Campo requerido: {e}")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/cron/{index}")
async def remove_cron(index: int, source: str = "root", username: str = Depends(require_auth)):
    try:
        return delete_cron_job(index, source)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/cron/run")
async def execute_cron_now(body: dict, username: str = Depends(require_auth)):
    try:
        return run_cron_job(body["command"])
    except KeyError as e:
        raise HTTPException(400, f"Campo requerido: {e}")
