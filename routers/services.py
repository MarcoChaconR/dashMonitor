from fastapi import APIRouter, Depends, HTTPException
from services.auth_service import require_auth
from services.service_service import get_services, manage_service

router = APIRouter(prefix="/api", tags=["services"])


@router.get("/services")
async def list_services(username: str = Depends(require_auth)):
    return get_services()


@router.post("/services/{name}/{action}")
async def control_service(name: str, action: str, username: str = Depends(require_auth)):
    if action not in ("start", "stop", "restart"):
        raise HTTPException(400, f"Acción no soportada: {action}")
    try:
        return manage_service(name, action)
    except ValueError as e:
        raise HTTPException(400, str(e))
