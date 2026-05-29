import os
import pwd
import stat
import time

ALLOWED_ROOTS = ["/etc", "/var/log", "/home"]
MAX_FILE_SIZE = 1_000_000


def list_directory(path):
    path = _sanitize(path)
    _check_allowed(path)

    if not os.path.isdir(path):
        raise ValueError(f"Ruta no es un directorio: {path}")

    entries = []
    try:
        for name in sorted(os.listdir(path), key=lambda n: (not os.path.isdir(os.path.join(path, n)), n.lower())):
            full = os.path.join(path, name)
            try:
                st = os.lstat(full)
            except OSError:
                continue

            is_dir = stat.S_ISDIR(st.st_mode)
            try:
                owner = pwd.getpwuid(st.st_uid).pw_name
            except KeyError:
                owner = str(st.st_uid)

            entries.append({
                "name": name,
                "path": full,
                "is_dir": is_dir,
                "size": st.st_size if not is_dir else None,
                "mode": stat.filemode(st.st_mode),
                "owner": owner,
                "mtime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(st.st_mtime)),
                "readable": os.access(full, os.R_OK),
            })
    except PermissionError:
        raise ValueError(f"Permiso denegado: {path}")

    return {
        "path": path,
        "entries": entries,
        "parent": _parent(path),
    }


def read_file(path):
    path = _sanitize(path)
    _check_allowed(path)

    if not os.path.isfile(path):
        raise ValueError(f"Ruta no es un archivo: {path}")

    if not os.access(path, os.R_OK):
        raise ValueError(f"Permiso denegado: {path}")

    size = os.path.getsize(path)
    if size > MAX_FILE_SIZE:
        raise ValueError(f"Archivo demasiado grande ({size} bytes, máximo {MAX_FILE_SIZE})")

    with open(path, "r", errors="replace") as f:
        content = f.read()

    try:
        owner = pwd.getpwuid(os.stat(path).st_uid).pw_name
    except KeyError:
        owner = "?"

    return {
        "path": path,
        "name": os.path.basename(path),
        "size": size,
        "mode": stat.filemode(os.stat(path).st_mode),
        "owner": owner,
        "mtime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(path))),
        "content": content,
    }


def _sanitize(path):
    resolved = os.path.realpath(os.path.normpath(path))
    if ".." in resolved:
        raise ValueError("Ruta inválida")
    return resolved


def _check_allowed(path):
    for root in ALLOWED_ROOTS:
        if path == root or path.startswith(root + os.sep):
            return
    raise ValueError(f"Ruta fuera de directorios permitidos: {', '.join(ALLOWED_ROOTS)}")


def _parent(path):
    parent = os.path.dirname(path)
    if parent == path:
        return None
    for root in ALLOWED_ROOTS:
        if parent == root or parent.startswith(root + os.sep):
            return parent
    return None
