from fastapi import APIRouter, Depends
from services.auth_service import require_auth
from services.network_service import get_network_config

router = APIRouter(prefix="/api/network", tags=["network"], dependencies=[Depends(require_auth)])


@router.get("/config")
async def network_config():
    return get_network_config()
