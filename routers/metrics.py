from fastapi import APIRouter, Depends
from services.auth_service import require_auth
from services.system_metrics import (
    get_cpu_metrics, get_memory_metrics, get_disk_usage,
    get_disk_io_rates, get_network_metrics, get_cpu_temperature,
    get_full_metrics,
)

router = APIRouter(prefix="/api", tags=["metrics"], dependencies=[Depends(require_auth)])


@router.get("/metrics")
async def full_metrics():
    return get_full_metrics()


@router.get("/cpu")
async def cpu_metrics():
    return get_cpu_metrics()


@router.get("/memory")
async def memory_metrics():
    return get_memory_metrics()


@router.get("/disk")
async def disk_metrics():
    disk_usage = get_disk_usage()
    io_rates = get_disk_io_rates()
    for du in disk_usage:
        du["read_mb_s"] = io_rates.get("read_mb_s", 0.0)
        du["write_mb_s"] = io_rates.get("write_mb_s", 0.0)
    return {"disk_usage": disk_usage, "io_rates": io_rates}


@router.get("/network")
async def network_metrics():
    return get_network_metrics()


@router.get("/temperature")
async def temperature_metrics():
    return get_cpu_temperature()
