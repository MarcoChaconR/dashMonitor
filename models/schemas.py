from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class ConsolePinRequest(BaseModel):
    pin: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class ConsoleTokenResponse(BaseModel):
    console_token: str
    expires_in: int


class CommandRequest(BaseModel):
    command: str
    timeout: int = 30


class CommandResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_ms: int


class CpuMetrics(BaseModel):
    percent_total: float
    percent_per_core: list[float]
    frequency_current_mhz: float
    frequency_max_mhz: float
    core_count_logical: int
    core_count_physical: int
    load_avg_1m: float
    load_avg_5m: float
    load_avg_15m: float


class MemoryMetrics(BaseModel):
    total_gb: float
    used_gb: float
    available_gb: float
    percent: float
    swap_total_gb: float
    swap_used_gb: float
    swap_percent: float


class DiskPartition(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    total_gb: float
    used_gb: float
    free_gb: float
    percent: float
    read_mb_s: float
    write_mb_s: float


class NetworkInterface(BaseModel):
    interface: str
    bytes_sent_mb: float
    bytes_recv_mb: float
    sent_rate_kb_s: float
    recv_rate_kb_s: float


class TemperatureMetrics(BaseModel):
    cpu_celsius: float | None
    status: str
    thresholds: dict


class ProcessInfo(BaseModel):
    pid: int
    name: str
    username: str
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    status: str
    command: str


class ProcessList(BaseModel):
    count: int
    processes: list[ProcessInfo]


class FullMetrics(BaseModel):
    timestamp: str
    hostname: str
    uptime_seconds: int
    cpu: CpuMetrics
    memory: MemoryMetrics
    disk: list[DiskPartition]
    network: list[NetworkInterface]
    temperature: TemperatureMetrics
