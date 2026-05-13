import subprocess
import re


def get_firewall_rules():
    return {
        "iptables": _get_iptables_rules(),
        "nftables": _get_nftables_rules(),
        "listening_ports": _get_listening_ports(),
    }


def _run(cmd: list[str]) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return ""


def _get_iptables_rules():
    output = _run(["iptables", "-L", "-n", "-v"])
    if not output:
        return None
    chains = []
    current_chain = None
    for line in output.split("\n"):
        if line.startswith("Chain "):
            m = re.match(r'Chain\s+(\S+)\s+\(policy\s+(\S+)', line)
            if m:
                current_chain = {"name": m.group(1), "policy": m.group(2), "rules": []}
                chains.append(current_chain)
        elif current_chain and line.strip() and not line.startswith("target") and not line.startswith("pkts"):
            parts = line.split()
            if len(parts) >= 9:
                current_chain["rules"].append({
                    "pkts": parts[0], "bytes": parts[1], "target": parts[2],
                    "prot": parts[3], "opt": parts[4], "in_": parts[5],
                    "out": parts[6], "source": parts[7], "destination": parts[8],
                    "extra": " ".join(parts[9:]) if len(parts) > 9 else "",
                })
    return chains


def _get_listening_ports():
    output = _run(["ss", "-tlnp"])
    ports = []
    for line in output.split("\n"):
        if line.startswith("LISTEN"):
            parts = line.split()
            if len(parts) >= 5:
                addr_port = parts[3]
                port_match = re.search(r':(\d+)$', addr_port)
                port = port_match.group(1) if port_match else addr_port
                process = parts[-1] if len(parts) >= 7 else ""
                ports.append({
                    "address": addr_port,
                    "port": int(port) if port.isdigit() else port,
                    "process": process,
                })
    return ports


def _get_nftables_rules():
    output = _run(["nft", "list", "ruleset"])
    return output if output else None
