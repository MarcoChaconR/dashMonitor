import os
import signal
import time
from fastapi import APIRouter, Depends, HTTPException, Query
from services.auth_service import require_auth
from services.system_metrics import get_processes
from config import PROTECTED_PIDS

router = APIRouter(prefix="/api", tags=["processes"], dependencies=[Depends(require_auth)])


@router.get("/processes")
async def list_processes(sort: str = Query("cpu"), order: str = Query("desc")):
    return get_processes(sort_by=sort, order=order)


@router.delete("/processes/{pid}")
async def kill_process(pid: int):
    if pid in PROTECTED_PIDS:
        raise HTTPException(403, "No se puede eliminar un proceso protegido")
    try:
        os.kill(pid, signal.SIGTERM)
        time.sleep(3)
        try:
            os.kill(pid, 0)
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        return {"message": f"Proceso {pid} terminado"}
    except ProcessLookupError:
        raise HTTPException(404, f"Proceso {pid} no encontrado")
    except PermissionError:
        raise HTTPException(403, f"No tiene permisos para eliminar el proceso {pid}")
