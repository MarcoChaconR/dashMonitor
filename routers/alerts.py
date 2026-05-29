from fastapi import APIRouter, Depends, Request
from services.auth_service import require_auth
from services.alert_service import get_config, save_config

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/config")
async def read_config(username: str = Depends(require_auth)):
    return get_config()


@router.put("/config")
async def write_config(body: dict, username: str = Depends(require_auth)):
    save_config(body)
    return {"message": "Configuración guardada", "config": body}
