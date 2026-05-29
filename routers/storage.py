from fastapi import APIRouter, Depends
from services.auth_service import require_auth
from services.storage_service import get_storage

router = APIRouter(prefix="/api", tags=["storage"])


@router.get("/storage")
async def storage_info(username: str = Depends(require_auth)):
    return get_storage()
