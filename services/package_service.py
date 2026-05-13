import subprocess
import time
import re
from datetime import datetime

_cache: dict | None = None
_cache_time: float = 0
CACHE_TTL = 300

def _run_apk(args: list[str]) -> str:
    result = subprocess.run(
        ["apk"] + args,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return result.stdout

def _get_last_update_time() -> str | None:
    try:
        result = subprocess.run(
            ["stat", "-c", "%y", "/var/cache/apk/APKINDEX.a818cff0.tar.gz"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None

def _parse_package_list(output: str) -> list[dict]:
    packages = []
    for line in output.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 1:
            name_part = parts[0]
            version = parts[1] if len(parts) > 1 else ""
            match = re.match(r'(.+)-(\d[\w.]*(?:-\w+)*)', name_part)
            name = match.group(1) if match else name_part
            packages.append({
                "name": name,
                "version": version,
            })
    return packages

def _parse_update_list(output: str) -> list[dict]:
    updates = []
    for line in output.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 1:
            name_part = parts[0]
            match = re.match(r'(.+)-(\d[\w.]*(?:-\w+)*)', name_part)
            if match:
                name = match.group(1)
                current_version = match.group(2)
            else:
                name = name_part
                current_version = ""
            new_version = parts[1] if len(parts) > 1 else ""
            updates.append({
                "name": name,
                "current_version": current_version,
                "new_version": new_version,
            })
    return updates

def get_package_info(force_refresh: bool = False) -> dict:
    global _cache, _cache_time
    now = time.time()
    if not force_refresh and _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    total_output = _run_apk(["list", "-I"])
    total_count = len([l for l in total_output.strip().split("\n") if l.strip()])

    update_output = _run_apk(["list", "-u"])
    updates = _parse_update_list(update_output)

    last_update = _get_last_update_time()

    result = {
        "total_packages": total_count,
        "updates_available": len(updates),
        "updates": updates,
        "last_update_time": last_update,
        "cached_at": datetime.utcnow().isoformat() + "Z",
    }
    _cache = result
    _cache_time = now
    return result
