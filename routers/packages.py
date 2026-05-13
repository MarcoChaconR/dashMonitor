from fastapi import APIRouter, Depends, Query
from services.auth_service import require_auth
from services.package_service import get_package_info

router = APIRouter(prefix="/api/packages", tags=["packages"], dependencies=[Depends(require_auth)])


@router.get("/info")
async def package_info(refresh: bool = Query(False)):
    return get_package_info(force_refresh=refresh)
