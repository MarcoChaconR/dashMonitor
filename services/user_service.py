import subprocess
import pwd
import grp


def get_users():
    users = []
    for user in pwd.getpwall():
        uid = user.pw_uid
        if uid < 1000 and uid != 0:
            continue

        groups = [g.gr_name for g in grp.getgrall() if user.pw_name in g.gr_mem]
        try:
            primary = grp.getgrgid(user.pw_gid)
            if primary.gr_name not in groups:
                groups.insert(0, primary.gr_name)
        except KeyError:
            pass

        users.append({
            "username": user.pw_name,
            "uid": uid,
            "gid": user.pw_gid,
            "home": user.pw_dir,
            "shell": user.pw_shell,
            "groups": groups,
        })

    users.sort(key=lambda u: u["uid"])
    return users


def create_user(username, password, groups=None):
    try:
        pwd.getpwnam(username)
        raise ValueError(f"El usuario '{username}' ya existe")
    except KeyError:
        pass

    if not password or len(password) < 4:
        raise ValueError("La contraseña debe tener al menos 4 caracteres")

    cmd = ["useradd", "-m", username]
    if groups:
        cmd.extend(["-G", ",".join(groups)])

    result = _run(cmd)
    if result["exit_code"] != 0:
        raise RuntimeError(f"Error al crear usuario: {result['stderr']}")

    p = subprocess.run(
        ["chpasswd"], input=f"{username}:{password}".encode(),
        capture_output=True, text=True, timeout=10
    )
    if p.returncode != 0:
        raise RuntimeError(f"Error al establecer contraseña: {p.stderr}")

    return {"message": f"Usuario '{username}' creado exitosamente"}


def delete_user(username):
    try:
        pwd.getpwnam(username)
    except KeyError:
        raise ValueError(f"El usuario '{username}' no existe")

    if username == "root":
        raise ValueError("No se puede eliminar al usuario root")

    result = _run(["userdel", "-r", username])
    if result["exit_code"] != 0:
        raise RuntimeError(f"Error al eliminar usuario: {result['stderr']}")

    return {"message": f"Usuario '{username}' eliminado"}


def modify_user_groups(username, groups):
    try:
        pwd.getpwnam(username)
    except KeyError:
        raise ValueError(f"El usuario '{username}' no existe")

    if groups:
        cmd = ["usermod", "-G", ",".join(groups), username]
    else:
        cmd = ["usermod", "-G", "", username]

    result = _run(cmd)
    if result["exit_code"] != 0:
        raise RuntimeError(f"Error al modificar grupos: {result['stderr']}")

    return {"message": f"Grupos de '{username}' actualizados"}


def _run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return {"exit_code": r.returncode, "stdout": r.stdout, "stderr": r.stderr}
    except subprocess.TimeoutExpired:
        return {"exit_code": -1, "stdout": "", "stderr": "Timeout"}
    except Exception as e:
        return {"exit_code": -1, "stdout": "", "stderr": str(e)}
