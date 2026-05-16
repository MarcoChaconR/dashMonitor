import os
import glob
import subprocess
import platform
import re


def _run(cmd, default=""):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return r.stdout.strip() if r.returncode == 0 else default
    except Exception:
        return default


def _subrun(cmd, timeout=10):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except Exception:
        return subprocess.CompletedProcess(cmd, -1, "", "")


def _has_cmd(cmd: str) -> bool:
    return subprocess.run(["which", cmd], capture_output=True).returncode == 0


def _detect():
    if os.path.exists("/etc/alpine-release"):
        ver = _run(["cat", "/etc/alpine-release"])
        return "alpine", "alpine", ver
    os_release = "/etc/os-release"
    if os.path.exists(os_release):
        data = {}
        with open(os_release) as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    data[k] = v.strip('"')
        dist_id = data.get("ID", "linux").lower()
        like = data.get("ID_LIKE", dist_id).lower()
        ver = data.get("VERSION_ID", "")
        return dist_id, like, ver
    return platform.system().lower(), "", ""


DISTRO_ID, DISTRO_LIKE, DISTRO_VERSION = _detect()

PACKAGE_MANAGER = "unknown"
if _has_cmd("apk"):
    PACKAGE_MANAGER = "apk"
elif _has_cmd("dpkg"):
    PACKAGE_MANAGER = "dpkg"
elif _has_cmd("rpm"):
    PACKAGE_MANAGER = "rpm"
elif _has_cmd("pacman"):
    PACKAGE_MANAGER = "pacman"


def default_group() -> str:
    if DISTRO_ID in ("alpine", "fedora", "rhel", "centos", "arch", "opensuse"):
        return "wheel"
    return "sudo"


def package_list() -> list[dict]:
    if PACKAGE_MANAGER == "apk":
        return _parse_apk_installed(_run(["apk", "list", "-I"]))
    if PACKAGE_MANAGER == "dpkg":
        return _parse_dpkg_installed(_run(["dpkg", "--list"]))
    if PACKAGE_MANAGER == "rpm":
        return _parse_rpm_installed(_run(["rpm", "-qa", "--queryformat", "%{NAME} %{VERSION}-%{RELEASE}\n"]))
    if PACKAGE_MANAGER == "pacman":
        return _parse_pacman_installed(_run(["pacman", "-Q"]))
    return []


def package_updates() -> list[dict]:
    if PACKAGE_MANAGER == "apk":
        return _parse_apk_updates(_run(["apk", "list", "-u"]))
    if PACKAGE_MANAGER == "dpkg":
        return _parse_apt_updates(_subrun(["apt", "list", "--upgradable"], timeout=30).stdout)
    if PACKAGE_MANAGER == "rpm":
        if _has_cmd("dnf"):
            out = _subrun(["dnf", "check-update", "-q"], timeout=30).stdout
        else:
            out = _subrun(["yum", "check-update", "-q"], timeout=30).stdout
        return _parse_rpm_updates(out)
    if PACKAGE_MANAGER == "pacman":
        return _parse_pacman_updates(_run(["pacman", "-Qu"]))
    return []


def last_update_time():
    paths = {
        "apk": "/var/cache/apk/APKINDEX.*.tar.gz",
        "dpkg": "/var/lib/apt/lists/*",
        "rpm": "/var/lib/rpm/Packages",
        "pacman": "/var/lib/pacman/sync/*.db",
    }
    pattern = paths.get(PACKAGE_MANAGER)
    if not pattern:
        return None
    latest = None
    for f in sorted(glob.glob(pattern)):
        ts = _run(["stat", "-c", "%y", f])
        if ts:
            latest = max(latest or "", ts)
    return latest


# ---- parsers ----

def _parse_apk_installed(output: str) -> list[dict]:
    pkgs = []
    for line in output.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if not parts:
            continue
        m = re.match(r'(.+)-(\d[\w.]*(?:-\w+)*)', parts[0])
        pkgs.append({
            "name": m.group(1) if m else parts[0],
            "version": m.group(2) if m else (parts[1] if len(parts) > 1 else ""),
        })
    return pkgs


def _parse_apk_updates(output: str) -> list[dict]:
    updates = []
    for line in output.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if not parts:
            continue
        m = re.match(r'(.+)-(\d[\w.]*(?:-\w+)*)', parts[0])
        name = m.group(1) if m else parts[0]
        current = m.group(2) if m else ""
        new_ver = parts[1] if len(parts) > 1 else ""
        updates.append({"name": name, "current_version": current, "new_version": new_ver})
    return updates


def _parse_dpkg_installed(output: str) -> list[dict]:
    pkgs = []
    for line in output.strip().split("\n"):
        if not line or line.startswith("|") or line.startswith("+++"):
            continue
        parts = line.split()
        if len(parts) >= 3:
            pkgs.append({"name": parts[1], "version": parts[2].split(":")[-1]})
    return pkgs


def _parse_rpm_installed(output: str) -> list[dict]:
    pkgs = []
    for line in output.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 1)
        pkgs.append({"name": parts[0], "version": parts[1] if len(parts) > 1 else ""})
    return pkgs


def _parse_apt_updates(output: str) -> list[dict]:
    updates = []
    for line in output.strip().split("\n"):
        if not line or line.startswith("List") or "..." in line:
            continue
        if "/" in line:
            parts = line.split()
            if len(parts) >= 2:
                name = parts[0].split("/")[0]
                new_ver = parts[1].strip("()")
                updates.append({"name": name, "current_version": "", "new_version": new_ver})
    return updates


def _parse_rpm_updates(output: str) -> list[dict]:
    updates = []
    for line in output.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("Last") or line.startswith("Depend"):
            continue
        parts = line.split()
        if len(parts) >= 2:
            name = parts[0].rsplit(".", 1)[0] if "." in parts[0] else parts[0]
            updates.append({"name": name, "current_version": "", "new_version": parts[1]})
    return updates


def _parse_pacman_installed(output: str) -> list[dict]:
    pkgs = []
    for line in output.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            pkgs.append({"name": parts[0], "version": parts[1]})
    return pkgs


def _parse_pacman_updates(output: str) -> list[dict]:
    updates = []
    for line in output.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            updates.append({"name": parts[0], "current_version": parts[1], "new_version": ""})
    return updates
