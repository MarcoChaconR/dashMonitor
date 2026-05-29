import os
import json

CONFIG_PATH = "/opt/dashmonitor/alerts.conf"

DEFAULTS = {
    "cpu": {"warning": 80, "critical": 90, "enabled": True},
    "memory": {"warning": 85, "critical": 95, "enabled": True},
    "disk": {"warning": 85, "critical": 95, "enabled": True},
    "temperature": {"warning": 70, "critical": 85, "enabled": True},
}


def get_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return dict(DEFAULTS)


def save_config(config):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def evaluate_thresholds(metrics):
    config = get_config()
    alerts = []

    cpu = config.get("cpu", {})
    if cpu.get("enabled"):
        val = metrics.get("cpu", {}).get("percent_total", 0)
        if val >= cpu.get("critical", 90):
            alerts.append({"type": "cpu", "level": "critical", "value": val, "threshold": cpu["critical"]})
        elif val >= cpu.get("warning", 80):
            alerts.append({"type": "cpu", "level": "warning", "value": val, "threshold": cpu["warning"]})

    mem = config.get("memory", {})
    if mem.get("enabled"):
        val = metrics.get("memory", {}).get("percent", 0)
        if val >= mem.get("critical", 95):
            alerts.append({"type": "memory", "level": "critical", "value": val, "threshold": mem["critical"]})
        elif val >= mem.get("warning", 85):
            alerts.append({"type": "memory", "level": "warning", "value": val, "threshold": mem["warning"]})

    disk = config.get("disk", {})
    if disk.get("enabled"):
        for d in metrics.get("disk", []):
            val = d.get("percent", 0)
            if val >= disk.get("critical", 95):
                alerts.append({"type": "disk", "level": "critical", "value": val, "threshold": disk["critical"], "mountpoint": d.get("mountpoint")})
                break
            elif val >= disk.get("warning", 85):
                alerts.append({"type": "disk", "level": "warning", "value": val, "threshold": disk["warning"], "mountpoint": d.get("mountpoint")})
                break

    temp = config.get("temperature", {})
    if temp.get("enabled"):
        val = metrics.get("temperature", {}).get("cpu_celsius")
        if val is not None:
            if val >= temp.get("critical", 85):
                alerts.append({"type": "temperature", "level": "critical", "value": val, "threshold": temp["critical"]})
            elif val >= temp.get("warning", 70):
                alerts.append({"type": "temperature", "level": "warning", "value": val, "threshold": temp["warning"]})

    return {"alerts": alerts, "config": config}
