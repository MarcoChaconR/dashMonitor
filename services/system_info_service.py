import os
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
    name = _get_distro_name()
    return {
        "name": name,
        "kernel": platform.release(),
        "hostname": socket.gethostname(),
        "architecture": platform.machine(),
    }


def _get_distro_name():
    if os.path.exists("/etc/alpine-release"):
        ver = _run(["cat", "/etc/alpine-release"])
        return f"Alpine Linux {ver}"

    if os.path.exists("/etc/os-release"):
        data = {}
        with open("/etc/os-release") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    data[k] = v.strip('"')
        return data.get("PRETTY_NAME") or data.get("NAME", "Linux")

    return platform.system() or "Linux"


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
    from services import distro_utils
    return len(distro_utils.package_list())
