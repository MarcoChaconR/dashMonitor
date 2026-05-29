from fastapi import APIRouter, Depends, HTTPException
from services.auth_service import require_auth
from services.user_service import get_users, create_user, delete_user, modify_user_groups

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users")
async def list_users(username: str = Depends(require_auth)):
    return get_users()


@router.post("/users")
async def create_new_user(body: dict, username: str = Depends(require_auth)):
    try:
        return create_user(body["username"], body["password"], body.get("groups"))
    except KeyError as e:
        raise HTTPException(400, f"Campo requerido: {e}")
    except (ValueError, RuntimeError) as e:
        raise HTTPException(400, str(e))


@router.delete("/users/{target}")
async def remove_user(target: str, username: str = Depends(require_auth)):
    try:
        return delete_user(target)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(400, str(e))


@router.put("/users/{target}/groups")
async def update_user_groups(target: str, body: dict, username: str = Depends(require_auth)):
    try:
        return modify_user_groups(target, body.get("groups", []))
    except (ValueError, RuntimeError) as e:
        raise HTTPException(400, str(e))
