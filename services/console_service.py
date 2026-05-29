import os
import subprocess
import re
import time
from fastapi import HTTPException

BLOCKED_PATTERNS = [
    r"\brm\s+-rf\b", r"\bmkfs\b", r"\bdd\s+if=/dev/zero\b",
    r"\bdd\s+if=/dev/random\b", r"\bshutdown\b", r"\breboot\b",
    r"\bhalt\b", r"\bpoweroff\b", r">\s*/dev/sd",
    r"\bpasswd\b", r">\s*/etc/shadow", r">\s*/etc/passwd",
]


def run_command(command: str, timeout: int = 30) -> dict:
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            raise HTTPException(400, {"message": "Comando bloqueado", "pattern": pattern})

    start = time.time()
    safe_env = {
        "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        "HOME": os.environ.get("HOME", "/root"),
        "TERM": os.environ.get("TERM", "xterm"),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
    }
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True,
            timeout=timeout,
            env=safe_env
        )
        return {
            "stdout": result.stdout[:50000],
            "stderr": result.stderr[:10000],
            "exit_code": result.returncode,
            "execution_ms": int((time.time() - start) * 1000),
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(408, f"Timeout después de {timeout}s")
