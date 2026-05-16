import os
import glob
from collections import OrderedDict

from services import distro_utils

LOG_DIRS = ["/var/log"]

KNOWN_SOURCES = OrderedDict()

def _init_sources():
    global KNOWN_SOURCES
    distro = distro_utils.DISTRO_ID
    like = distro_utils.DISTRO_LIKE
    pm = distro_utils.PACKAGE_MANAGER

    base = [
        ("dashmonitor", "/var/log/dashmonitor.log"),
        ("messages", "/var/log/messages"),
        ("dmesg", "/var/log/dmesg"),
    ]

    if distro == "alpine":
        base += [
            ("apk", "/var/log/apk.log"),
            ("acpid", "/var/log/acpid.log"),
        ]
    elif distro in ("debian", "ubuntu") or "debian" in like:
        base += [
            ("syslog", "/var/log/syslog"),
            ("auth", "/var/log/auth.log"),
            ("kern", "/var/log/kern.log"),
            ("dpkg", "/var/log/dpkg.log"),
            ("apt", "/var/log/apt/term.log"),
        ]
    elif distro in ("fedora", "rhel", "centos") or "fedora" in like:
        base += [
            ("secure", "/var/log/secure"),
            ("maillog", "/var/log/maillog"),
            ("cron", "/var/log/cron"),
            ("dnf", "/var/log/dnf.log"),
            ("boot", "/var/log/boot.log"),
        ]
    elif distro == "arch":
        base += [
            ("pacman", "/var/log/pacman.log"),
        ]

    if pm == "dpkg":
        base.append(("dpkg", "/var/log/dpkg.log"))
    elif pm == "rpm":
        base.append(("dnf", "/var/log/dnf.log"))

    KNOWN_SOURCES = OrderedDict()
    for name, path in base:
        if name not in KNOWN_SOURCES:
            KNOWN_SOURCES[name] = path


_init_sources()


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
