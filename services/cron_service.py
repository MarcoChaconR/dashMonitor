import subprocess
import re
import os

CRONTAB_SOURCES = {
    "system": "/etc/crontab",
    "cron.d": "/etc/cron.d",
    "root": None,
}


def get_cron_jobs(source="system"):
    if source == "root":
        return _parse_crontab_output(_run(["crontab", "-l"]))
    elif source == "cron.d":
        jobs = []
        if os.path.isdir("/etc/cron.d"):
            for fname in sorted(os.listdir("/etc/cron.d")):
                path = os.path.join("/etc/cron.d", fname)
                if os.path.isfile(path):
                    for job in _parse_crontab_file(path):
                        job["source"] = f"cron.d/{fname}"
                        jobs.append(job)
        return jobs
    else:
        return _parse_crontab_file("/etc/crontab")


def add_cron_job(schedule, command, source="root"):
    if not _validate_schedule(schedule):
        raise ValueError(f"Formato cron inválido: {schedule}")

    if source == "system":
        line = f"{schedule}\troot\t{command}\n"
        _append_to_file("/etc/crontab", line)
    else:
        existing = _run(["crontab", "-l"])
        crontab = existing.strip()
        if crontab and not crontab.endswith("\n"):
            crontab += "\n"
        crontab += f"{schedule} {command}\n"
        _run_with_input(["crontab", "-"], crontab)

    return {"message": "Tarea agregada exitosamente"}


def delete_cron_job(line_index, source="root"):
    if source == "system":
        lines = _read_file("/etc/crontab").split("\n")
        if 0 <= line_index < len(lines):
            lines.pop(line_index)
            with open("/etc/crontab", "w") as f:
                f.write("\n".join(lines) + "\n")
            return {"message": "Tarea eliminada"}
        raise ValueError("Índice de línea inválido")
    else:
        existing = _run(["crontab", "-l"]).strip().split("\n")
        if 0 <= line_index < len(existing):
            existing.pop(line_index)
            new_crontab = "\n".join(existing) + "\n" if existing else ""
            _run_with_input(["crontab", "-"], new_crontab)
            return {"message": "Tarea eliminada"}
        raise ValueError("Índice de línea inválido")


def run_cron_job(command):
    r = _run_timeout(command, timeout=30)
    return {
        "stdout": r["stdout"],
        "stderr": r["stderr"],
        "exit_code": r["exit_code"],
    }


def _parse_crontab_file(path):
    jobs = []
    if not os.path.isfile(path):
        return jobs
    with open(path, "r") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            job = _parse_cron_line(line)
            if job:
                job["source"] = "system"
                job["file"] = path
                jobs.append(job)
    return jobs


def _parse_crontab_output(output):
    jobs = []
    for i, line in enumerate(output.strip().split("\n")):
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("no crontab"):
            continue
        job = _parse_cron_line(line)
        if job:
            job["source"] = "root"
            job["line_index"] = i
            jobs.append(job)
    return jobs


def _parse_cron_line(line):
    parts = line.split(None, 5)
    if len(parts) < 6:
        return None
    schedule = " ".join(parts[:5])
    user_or_cmd = parts[5]
    if re.match(r"^[a-z_][a-z0-9_-]*$", user_or_cmd, re.IGNORECASE) and len(parts) >= 7:
        user = user_or_cmd
        command = " ".join(parts[6:])
    else:
        user = ""
        command = " ".join(parts[5:])
    return {"schedule": schedule, "user": user, "command": command}


def _validate_schedule(schedule):
    parts = schedule.split()
    if len(parts) != 5:
        return False
    valid = r"^(?:\*|[\d]+(?:-[?\d]+)?(?:/[\d]+)?(?:,[\d,\-*/]+)*)$"
    return all(re.match(valid, p) for p in parts)


def _run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return ""


def _run_timeout(cmd, timeout=30):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return {"stdout": r.stdout, "stderr": r.stderr, "exit_code": r.returncode}
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": f"Timeout ({timeout}s)", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}


def _run_with_input(cmd, stdin_text):
    try:
        r = subprocess.run(cmd, input=stdin_text, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return ""


def _append_to_file(path, line):
    with open(path, "a") as f:
        f.write(line)


def _read_file(path):
    try:
        with open(path, "r") as f:
            return f.read()
    except Exception:
        return ""
