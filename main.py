import os
import socket
import psutil
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import HOST, PORT, ENV, PROTECTED_PIDS
from routers import auth, metrics, processes, console, logs, packages, system_info, network, firewall, users, files, cron, services, storage, alerts

app = FastAPI(title="dashMonitor", docs_url=None if ENV == "production" else "/docs",
              redoc_url=None if ENV == "production" else "/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(metrics.router)
app.include_router(processes.router)
app.include_router(console.router)
app.include_router(logs.router)
app.include_router(packages.router)
app.include_router(system_info.router)
app.include_router(network.router)
app.include_router(firewall.router)
app.include_router(users.router)
app.include_router(files.router)
app.include_router(cron.router)
app.include_router(services.router)
app.include_router(storage.router)
app.include_router(alerts.router)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/login")
async def serve_login():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))


@app.get("/health")
async def health():
    return {"status": "ok", "hostname": socket.gethostname()}


@app.on_event("startup")
async def startup():
    psutil.cpu_percent(percpu=True)
    PROTECTED_PIDS.add(os.getpid())
    PROTECTED_PIDS.add(os.getppid())
    PROTECTED_PIDS.add(1)
