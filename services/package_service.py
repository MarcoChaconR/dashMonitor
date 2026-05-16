import time
from datetime import datetime
from services import distro_utils

_cache: dict | None = None
_cache_time: float = 0
CACHE_TTL = 300


def get_package_info(force_refresh: bool = False) -> dict:
    global _cache, _cache_time
    now = time.time()
    if not force_refresh and _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    packages = distro_utils.package_list()
    updates = distro_utils.package_updates()
    last_update = distro_utils.last_update_time()

    result = {
        "total_packages": len(packages),
        "updates_available": len(updates),
        "updates": updates,
        "last_update_time": last_update,
        "cached_at": datetime.utcnow().isoformat() + "Z",
        "package_manager": distro_utils.PACKAGE_MANAGER,
        "distro": distro_utils.DISTRO_ID,
    }
    _cache = result
    _cache_time = now
    return result
