from fastapi import APIRouter, Depends
from services.auth_service import require_auth
from services.system_info_service import get_system_info

router = APIRouter(prefix="/api/system", tags=["system"], dependencies=[Depends(require_auth)])


@router.get("/info")
async def system_info():
    return get_system_info()
