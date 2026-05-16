#!/bin/sh
set -e

REPO_URL="https://github.com/MarcoChaconR/dashMonitor.git"
INSTALL_DIR="/opt/dashmonitor"
SERVICE_USER="root"
PORT="${PORT:-9050}"

# ---------- helpers ----------
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }
die()   { red "$*"; exit 1; }

# ---------- root check ----------
[ "$(id -u)" -eq 0 ] || die "Este script debe ejecutarse como root"

# ---------- detect distro ----------
detect_distro() {
    if [ -f /etc/alpine-release ]; then
        echo "alpine"
    elif command -v apt-get >/dev/null 2>&1; then
        echo "debian"
    elif command -v dnf >/dev/null 2>&1; then
        echo "fedora"
    elif command -v yum >/dev/null 2>&1; then
        echo "rhel"
    elif command -v pacman >/dev/null 2>&1; then
        echo "arch"
    else
        echo "unknown"
    fi
}

DISTRO=$(detect_distro)

# ---------- install system deps ----------
install_deps() {
    blue "=== Instalando dependencias del sistema ($DISTRO) ==="

    case "$DISTRO" in
        alpine)
            apk update
            apk add python3 py3-pip python3-dev gcc musl-dev linux-pam linux-pam-dev git
            ;;
        debian)
            apt-get update -qq
            apt-get install -y -qq python3 python3-pip python3-venv python3-dev gcc libpam0g-dev git
            ;;
        fedora)
            dnf install -y python3 python3-pip python3-devel gcc pam-devel git
            ;;
        rhel)
            yum install -y epel-release
            yum install -y python3 python3-pip python3-devel gcc pam-devel git
            ;;
        arch)
            pacman -Sy --noconfirm python python-pip python-virtualenv gcc pam git
            ;;
        *)
            die "Distribucion no soportada ($DISTRO). Instale python3, pip, gcc y PAM manualmente."
            ;;
    esac
}

# ---------- clone / copy repo ----------
setup_project() {
    blue "=== Copiando archivos del proyecto ==="
    mkdir -p "$INSTALL_DIR"

    # If run locally (not piped), copy from script dir
    if [ -n "$BASH_SOURCE" ] && [ -f "$(dirname "$0")/main.py" ]; then
        cp -r "$(dirname "$0")"/* "$INSTALL_DIR/"
    else
        # Download from GitHub
        command -v git >/dev/null 2>&1 || die "git no esta instalado"
        git clone --depth 1 "$REPO_URL" /tmp/dashmonitor-repo
        cp -r /tmp/dashmonitor-repo/* "$INSTALL_DIR/"
        rm -rf /tmp/dashmonitor-repo
    fi

    rm -f "$INSTALL_DIR/install.sh"
    [ -f "$INSTALL_DIR/dashmonitor.openrc" ] && rm -f "$INSTALL_DIR/dashmonitor.openrc"
    [ -f "$INSTALL_DIR/dashmonitor.service" ] && rm -f "$INSTALL_DIR/dashmonitor.service"
}

# ---------- venv + pip ----------
setup_venv() {
    blue "=== Creando entorno virtual ==="
    python3 -m venv "$INSTALL_DIR/venv"
    . "$INSTALL_DIR/venv/bin/activate"
    pip install -q -r "$INSTALL_DIR/requirements.txt"
}

# ---------- configure .env ----------
setup_env() {
    blue "=== Configurando variables de entorno ==="

    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

    while true; do
        printf "Ingrese el PIN de consola (6-32 caracteres): "
        stty -echo; read PIN; stty echo; echo
        printf "Confirme el PIN: "
        stty -echo; read PIN_CONFIRM; stty echo; echo
        [ "$PIN" = "$PIN_CONFIRM" ] || { echo "Error: los PIN no coinciden"; continue; }
        [ ${#PIN} -ge 6 ] || { echo "Error: minimo 6 caracteres"; continue; }
        break
    done

    PIN_HASH=$(. "$INSTALL_DIR/venv/bin/activate" && python3 -c "
import sys
from passlib.hash import bcrypt
sys.stdout.write(bcrypt.hash(sys.argv[1]))
" "$PIN")

    cat > "$INSTALL_DIR/.env" << EOF
SECRET_KEY=$SECRET_KEY
CONSOLE_PIN_HASH=$PIN_HASH
ALLOWED_GROUP=wheel
HOST=0.0.0.0
PORT=$PORT
ENV=production
EOF
    chmod 600 "$INSTALL_DIR/.env"
}

# ---------- install service ----------
install_service() {
    blue "=== Instalando servicio ==="

    case "$DISTRO" in
        alpine)
            cat > /etc/init.d/dashmonitor << 'EOSCRIPT'
#!/sbin/openrc-run

name="dashmonitor"
description="dashMonitor system monitoring dashboard"
command="/opt/dashmonitor/venv/bin/uvicorn"
command_args="main:app --host 0.0.0.0 --port 9050 --workers 1"
command_background="yes"
command_user="root"
directory="/opt/dashmonitor"
pidfile="/run/dashmonitor.pid"
output_log="/var/log/dashmonitor.log"
error_log="/var/log/dashmonitor.log"

depend() { need net; }

start_pre() {
    export $(grep -v '^#' /opt/dashmonitor/.env | xargs)
}
EOSCRIPT
            chmod +x /etc/init.d/dashmonitor
            rc-update add dashmonitor default 2>/dev/null || true
            rc-service dashmonitor start
            ;;

        debian|fedora|rhel|arch)
            cat > /etc/systemd/system/dashmonitor.service << 'EOSERVICE'
[Unit]
Description=dashMonitor system monitoring dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/dashmonitor
EnvironmentFile=/opt/dashmonitor/.env
ExecStart=/opt/dashmonitor/venv/bin/uvicorn main:app --host 0.0.0.0 --port 9050 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOSERVICE
            systemctl daemon-reload
            systemctl enable dashmonitor
            systemctl start dashmonitor
            ;;
    esac
}

# ---------- get IP ----------
get_ip() {
    command -v hostname >/dev/null 2>&1 && hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
}

# ---------- main ----------
echo ""
blue "=================================="
blue "  dashMonitor - Instalacion"
blue "=================================="
echo ""

install_deps
setup_project
setup_venv
setup_env
install_service

ACCESS_URL="http://$(get_ip):$PORT"
echo ""
green "=================================="
green "  Instalacion completada"
green "  Acceda en: $ACCESS_URL"
green "=================================="
echo ""
blue "  Usuarios del grupo 'wheel' pueden iniciar sesion"
blue "  con su password del sistema + el PIN de consola configurado."
echo ""
