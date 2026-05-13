from fastapi import APIRouter, Depends
from services.auth_service import require_auth
from services.firewall_service import get_firewall_rules

router = APIRouter(prefix="/api/firewall", tags=["firewall"], dependencies=[Depends(require_auth)])


@router.get("/rules")
async def firewall_rules():
    return get_firewall_rules()
