import subprocess
import json


def get_storage():
    blocks = _get_lsblk()
    usage = _get_df()
    fstab = _get_fstab()
    return {"blocks": blocks, "usage": usage, "fstab": fstab}


def _get_lsblk():
    try:
        r = subprocess.run(
            ["lsblk", "-o", "NAME,FSTYPE,SIZE,UUID,LABEL,MOUNTPOINT,MODEL", "-J"],
            capture_output=True, text=True, timeout=10
        )
        data = json.loads(r.stdout)
        return _flatten_lsblk(data.get("blockdevices", []))
    except Exception:
        return []


def _flatten_lsblk(devices, prefix=""):
    entries = []
    for d in devices:
        name = d.get("name", "")
        full = prefix + name if not prefix else name
        entries.append({
            "name": full,
            "fstype": d.get("fstype"),
            "size": d.get("size"),
            "uuid": d.get("uuid"),
            "label": d.get("label"),
            "mountpoint": d.get("mountpoint"),
            "model": d.get("model"),
        })
        if "children" in d:
            entries.extend(_flatten_lsblk(d["children"], full + "-"))
    return entries


def _get_df():
    try:
        r = subprocess.run(["df", "-h", "--output=source,fstype,size,used,avail,pcent,target"],
                           capture_output=True, text=True, timeout=10)
        lines = r.stdout.strip().split("\n")[1:]
        entries = []
        for line in lines:
            parts = line.split(None, 6)
            if len(parts) >= 7:
                entries.append({
                    "source": parts[0],
                    "fstype": parts[1],
                    "size": parts[2],
                    "used": parts[3],
                    "avail": parts[4],
                    "use_pct": parts[5],
                    "target": parts[6],
                })
        return entries
    except Exception:
        return []


def _get_fstab():
    try:
        with open("/etc/fstab", "r") as f:
            entries = []
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split(None, 5)
                if len(parts) >= 2:
                    entries.append({
                        "device": parts[0],
                        "mountpoint": parts[1],
                        "fstype": parts[2] if len(parts) > 2 else "",
                        "options": parts[3] if len(parts) > 3 else "",
                        "dump": parts[4] if len(parts) > 4 else "",
                        "passno": parts[5] if len(parts) > 5 else "",
                    })
        return entries
    except Exception:
        return []
