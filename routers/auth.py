from fastapi import APIRouter, Request, HTTPException, Depends
from models.schemas import LoginRequest, ConsolePinRequest, TokenResponse, ConsoleTokenResponse
from services.auth_service import (
    authenticate_user, check_rate_limit, create_token, verify_token,
    verify_console_pin, require_auth
)
from config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_HOURS, CONSOLE_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: Request, body: LoginRequest):
    client_key = f"{body.username}:{req.client.host}"
    check_rate_limit(client_key)
    ok, msg = authenticate_user(body.username, body.password)
    if not ok:
        raise HTTPException(401, msg)
    access_token = create_token(body.username, "access", ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token = create_token(body.username, "refresh", REFRESH_TOKEN_EXPIRE_HOURS * 60)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(req: Request, body: dict | None = None):
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Token requerido")
    token_str = auth_header.split(" ", 1)[1]
    payload = verify_token(token_str, "refresh")
    if not payload:
        raise HTTPException(401, "Refresh token inválido o expirado")
    username = payload["sub"]
    access_token = create_token(username, "access", ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token = create_token(username, "refresh", REFRESH_TOKEN_EXPIRE_HOURS * 60)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/console-auth", response_model=ConsoleTokenResponse)
async def console_auth(body: ConsolePinRequest, username: str = Depends(require_auth)):
    if not verify_console_pin(body.pin):
        raise HTTPException(401, "PIN inválido")
    console_token = create_token(username, "console", CONSOLE_TOKEN_EXPIRE_MINUTES)
    return ConsoleTokenResponse(
        console_token=console_token,
        expires_in=CONSOLE_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout(username: str = Depends(require_auth)):
    return {"message": "Sesión cerrada"}
