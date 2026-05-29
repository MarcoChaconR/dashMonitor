import subprocess


def _detect_init():
    if subprocess.run(["which", "systemctl"], capture_output=True).returncode == 0:
        return "systemd"
    if subprocess.run(["which", "rc-service"], capture_output=True).returncode == 0:
        return "openrc"
    return "unknown"


INIT_SYSTEM = _detect_init()


def get_services():
    if INIT_SYSTEM == "systemd":
        return _list_systemd()
    elif INIT_SYSTEM == "openrc":
        return _list_openrc()
    return []


def manage_service(name, action):
    if INIT_SYSTEM == "systemd":
        return _systemd_action(name, action)
    elif INIT_SYSTEM == "openrc":
        return _openrc_action(name, action)
    raise ValueError(f"Sistema de init no soportado: {INIT_SYSTEM}")


def _list_systemd():
    result = _run(["systemctl", "list-units", "--type=service", "--all", "--no-legend", "--no-pager"])
    services = []
    for line in result.split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 4)
        if len(parts) < 4:
            continue
        name = parts[0].replace(".service", "")
        status = _systemd_status(parts)
        services.append({
            "name": name,
            "status": status,
            "description": parts[4] if len(parts) > 4 else "",
        })
    services.sort(key=lambda s: (s["status"] != "active", s["name"]))
    return services


def _systemd_status(parts):
    load = parts[1] if len(parts) > 1 else ""
    active = parts[2] if len(parts) > 2 else ""
    sub = parts[3] if len(parts) > 3 else ""
    if load == "not-found":
        return "not-found"
    if active == "active":
        return "active"
    if active == "inactive":
        return "inactive"
    if sub == "failed":
        return "failed"
    return active if active else "unknown"


def _list_openrc():
    result = _run(["rc-status", "--list"])
    running = set()
    for line in result.split("\n"):
        line = line.strip()
        if line:
            running.add(line)

    all_services = _run(["rc-service", "--list"])
    services = []
    for name in all_services.split("\n"):
        name = name.strip()
        if not name:
            continue
        services.append({
            "name": name,
            "status": "active" if name in running else "inactive",
            "description": "",
        })
    return services


def _systemd_action(name, action):
    if action in ("start", "stop", "restart"):
        result = _run(["systemctl", action, f"{name}.service"])
        return {"message": result or f"Servicio {name}: {action} ejecutado"}
    raise ValueError(f"Acción no soportada: {action}")


def _openrc_action(name, action):
    result = _run(["rc-service", name, action])
    return {"message": result or f"Servicio {name}: {action} ejecutado"}


def _run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip()
    except Exception:
        return ""
