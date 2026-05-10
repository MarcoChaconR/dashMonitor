from datetime import datetime, timedelta
import uuid
import time
import pam
import grp
import pwd

from jose import jwt, JWTError
from passlib.hash import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

from config import SECRET_KEY, ALGORITHM, ALLOWED_GROUP, ACCESS_TOKEN_EXPIRE_MINUTES

security = HTTPBearer()

_login_attempts: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 300
RATE_LIMIT_MAX = 5


def _user_in_group(username: str, groupname: str) -> bool:
    try:
        group = grp.getgrnam(groupname)
        if username in group.gr_mem:
            return True
        user_info = pwd.getpwnam(username)
        return user_info.pw_gid == group.gr_gid
    except KeyError:
        return False


def authenticate_user(username: str, password: str) -> tuple[bool, str]:
    if not _user_in_group(username, ALLOWED_GROUP):
        return False, "Usuario no autorizado"
    p = pam.pam()
    if p.authenticate(username, password, service='login'):
        return True, ""
    return False, "Credenciales inválidas"


def check_rate_limit(key: str):
    now = time.time()
    if key not in _login_attempts:
        _login_attempts[key] = []
    _login_attempts[key] = [t for t in _login_attempts[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_login_attempts[key]) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "Demasiados intentos. Intente de nuevo en 5 minutos.")
    _login_attempts[key].append(now)


def create_token(subject: str, token_type: str, expires_minutes: int) -> str:
    payload = {
        "sub": subject,
        "type": token_type,
        "jti": str(uuid.uuid4()),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str, expected_type: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


def verify_console_pin(pin: str) -> bool:
    from config import CONSOLE_PIN_HASH
    return bcrypt.verify(pin, CONSOLE_PIN_HASH)


async def require_auth(token=Depends(security)) -> str:
    payload = verify_token(token.credentials, "access")
    if not payload:
        raise HTTPException(401, "Token inválido o expirado")
    return payload["sub"]


async def require_console_auth(token=Depends(security)) -> str:
    payload = verify_token(token.credentials, "console")
    if not payload:
        raise HTTPException(401, "Console token requerido")
    return payload["sub"]
