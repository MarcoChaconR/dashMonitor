from fastapi import APIRouter, Query, Depends, HTTPException
from services.auth_service import require_auth
from services.file_service import list_directory, read_file

router = APIRouter(prefix="/api", tags=["files"])


@router.get("/files")
async def browse(path: str = Query("/etc"), username: str = Depends(require_auth)):
    try:
        return list_directory(path)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/files/read")
async def view(path: str = Query(...), username: str = Depends(require_auth)):
    try:
        return read_file(path)
    except ValueError as e:
        raise HTTPException(400, str(e))
