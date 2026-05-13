import subprocess
import platform
import socket
import psutil
from datetime import datetime


def get_system_info():
    return {
        "os": _get_os_info(),
        "hardware": _get_hardware_info(),
        "storage": _get_storage_info(),
        "total_packages": _get_package_count(),
        "total_processes": len(psutil.pids()),
        "datetime": datetime.now().isoformat(),
    }


def _run(cmd: list[str]) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return ""


def _get_os_info():
    release = _run(["cat", "/etc/alpine-release"])
    if not release:
        release = _run(["cat", "/etc/os-release"]).split("\n")[0] if _run(["cat", "/etc/os-release"]) else ""
    return {
        "name": f"Alpine Linux {release}" if release else platform.system(),
        "kernel": platform.release(),
        "hostname": socket.gethostname(),
        "architecture": platform.machine(),
    }


def _get_hardware_info():
    cpu_model = _run(["sh", "-c", "grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2"]).strip()
    if not cpu_model:
        cpu_model = platform.processor()
    mem = psutil.virtual_memory()
    return {
        "cpu_model": cpu_model,
        "cpu_cores_physical": psutil.cpu_count(logical=False),
        "cpu_cores_logical": psutil.cpu_count(logical=True),
        "ram_total_gb": round(mem.total / (1024 ** 3), 2),
    }


def _get_storage_info():
    disks = []
    for p in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(p.mountpoint)
            disks.append({
                "device": p.device,
                "mountpoint": p.mountpoint,
                "fstype": p.fstype,
                "total_gb": round(usage.total / (1024 ** 3), 2),
            })
        except Exception:
            pass
    return disks


def _get_package_count():
    output = _run(["apk", "list", "-I"])
    return len([l for l in output.split("\n") if l.strip()])
