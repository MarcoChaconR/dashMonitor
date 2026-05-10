#!/bin/sh
set -e

if [ "$(id -u)" -ne 0 ]; then
    echo "Este script debe ejecutarse como root"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/11] Instalando dependencias del sistema..."
apk update && apk add python3 py3-pip python3-dev gcc musl-dev linux-pam linux-pam-dev

echo "[2/11] Creando directorio /opt/dashmonitor/..."
mkdir -p /opt/dashmonitor

echo "[3/11] Copiando archivos del proyecto..."
cp -r "$SCRIPT_DIR"/* /opt/dashmonitor/
rm -f /opt/dashmonitor/install.sh /opt/dashmonitor/dashmonitor.openrc

echo "[4/11] Creando entorno virtual..."
python3 -m venv /opt/dashmonitor/venv

echo "[5/11] Instalando dependencias Python..."
. /opt/dashmonitor/venv/bin/activate
pip install -r /opt/dashmonitor/requirements.txt

echo "[6/11] Generando SECRET_KEY..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

echo "[7/11] Configurando PIN de consola..."
PIN=""
PIN_CONFIRM=""
while true; do
    printf "Ingrese el PIN de consola (6-32 caracteres): "
    stty -echo; read PIN; stty echo; echo
    printf "Confirme el PIN: "
    stty -echo; read PIN_CONFIRM; stty echo; echo
    if [ "$PIN" != "$PIN_CONFIRM" ]; then
        echo "Error: los PIN no coinciden. Intente de nuevo."
    elif [ ${#PIN} -lt 6 ]; then
        echo "Error: el PIN debe tener al menos 6 caracteres."
    else
        break
    fi
done

PIN_HASH=$(. /opt/dashmonitor/venv/bin/activate && python3 -c "
import sys
from passlib.hash import bcrypt
sys.stdout.write(bcrypt.hash(sys.argv[1]))
" "$PIN")

echo "[8/11] Escribiendo .env..."
cat > /opt/dashmonitor/.env << EOF
SECRET_KEY=$SECRET_KEY
CONSOLE_PIN_HASH=$PIN_HASH
ALLOWED_GROUP=wheel
HOST=0.0.0.0
PORT=9090
ENV=production
EOF
chmod 600 /opt/dashmonitor/.env

echo "[9/11] Instalando servicio OpenRC..."
cp "$SCRIPT_DIR/dashmonitor.openrc" /etc/init.d/dashmonitor
chmod +x /etc/init.d/dashmonitor

echo "[10/11] Agregando servicio al inicio..."
rc-update add dashmonitor default

echo "[11/11] Iniciando servicio..."
rc-service dashmonitor start

ACCESS_URL="http://$(hostname -I | awk '{print $1}'):9090"
echo ""
echo "=================================="
echo "  Instalación completada"
echo "  Acceda en: $ACCESS_URL"
echo "=================================="
