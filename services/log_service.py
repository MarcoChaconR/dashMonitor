import os
import glob
from collections import OrderedDict

LOG_DIRS = ["/var/log"]
KNOWN_SOURCES = OrderedDict([
    ("messages", "/var/log/messages"),
    ("dmesg", "/var/log/dmesg"),
    ("apk", "/var/log/apk.log"),
    ("dashmonitor", "/var/log/dashmonitor.log"),
    ("acpid", "/var/log/acpid.log"),
])


def discover_log_sources() -> list[dict]:
    sources = []
    seen = set()
    for name, path in KNOWN_SOURCES.items():
        if os.path.isfile(path) and os.access(path, os.R_OK):
            size = os.path.getsize(path)
            sources.append({"name": name, "path": path, "size_bytes": size})
            seen.add(path)
    for log_dir in LOG_DIRS:
        for f in sorted(glob.glob(os.path.join(log_dir, "*.log"))):
            if f not in seen and os.path.isfile(f) and os.access(f, os.R_OK):
                name = os.path.splitext(os.path.basename(f))[0]
                size = os.path.getsize(f)
                sources.append({"name": name, "path": f, "size_bytes": size})
                seen.add(f)
    return sources


def read_log(path: str, lines: int = 50, filter_str: str = "") -> dict:
    if not os.path.isfile(path):
        return {"error": f"Archivo no encontrado: {path}", "lines": [], "total": 0}
    if not os.access(path, os.R_OK):
        return {"error": f"Sin permisos de lectura: {path}", "lines": [], "total": 0}
    try:
        with open(path, "r", errors="replace") as f:
            all_lines = f.readlines()
        if filter_str:
            all_lines = [l for l in all_lines if filter_str.lower() in l.lower()]
        total = len(all_lines)
        tail = all_lines[-lines:]
        return {"path": path, "lines": tail, "total": total, "showing": min(lines, total)}
    except Exception as e:
        return {"error": str(e), "lines": [], "total": 0}
