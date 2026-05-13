import subprocess
import socket
import psutil


def get_network_config():
    interfaces = _get_interfaces()
    routing = _get_routing()
    dns = _get_dns()
    return {
        "hostname": socket.gethostname(),
        "interfaces": interfaces,
        "routing": routing,
        "dns_servers": dns,
    }


def _get_interfaces():
    stats = psutil.net_if_stats()
    addrs = psutil.net_if_addrs()
    result = []
    for name in sorted(stats.keys()):
        s = stats[name]
        a = addrs.get(name, [])
        ipv4, ipv6, mac = [], [], ""
        for addr in a:
            if addr.family == socket.AF_INET:
                ipv4.append({"address": addr.address, "netmask": addr.netmask, "broadcast": addr.broadcast})
            elif addr.family == socket.AF_INET6:
                ipv6.append({"address": addr.address, "netmask": addr.netmask})
            elif addr.family == psutil.AF_LINK:
                mac = addr.address
        result.append({
            "name": name,
            "state": "UP" if s.isup else "DOWN",
            "mtu": s.mtu,
            "speed": s.speed,
            "mac": mac,
            "ipv4": ipv4,
            "ipv6": ipv6,
        })
    return result


def _run(cmd: list[str]) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return ""


def _get_routing():
    output = _run(["ip", "route", "show"])
    routes = []
    for line in output.split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        route: dict = {"destination": parts[0] if parts else "", "gateway": "", "interface": ""}
        if "via" in parts:
            idx = parts.index("via")
            if idx + 1 < len(parts):
                route["gateway"] = parts[idx + 1]
        if "dev" in parts:
            idx = parts.index("dev")
            if idx + 1 < len(parts):
                route["interface"] = parts[idx + 1]
        routes.append(route)
    return routes


def _get_dns():
    output = _run(["cat", "/etc/resolv.conf"])
    servers = []
    for line in output.split("\n"):
        if line.startswith("nameserver"):
            parts = line.split()
            if len(parts) >= 2:
                servers.append(parts[1])
    return servers
