from fastapi import APIRouter, Depends
from models.schemas import CommandRequest, CommandResponse
from services.auth_service import require_auth
from services.console_service import run_command

router = APIRouter(prefix="/api", tags=["console"])


@router.post("/console", response_model=CommandResponse)
async def execute_command(body: CommandRequest, username: str = Depends(require_auth)):
    result = run_command(body.command, body.timeout)
    return CommandResponse(**result)
