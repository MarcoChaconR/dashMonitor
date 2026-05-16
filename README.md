<p align="center">
  <img src="https://img.shields.io/badge/Alpine_Linux-0D597F?style=for-the-badge&logo=alpine-linux&logoColor=white" alt="Alpine Linux">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

<h1 align="center">📊 dashMonitor</h1>

<p align="center">
  <strong>Panel de monitoreo en tiempo real para servidores Alpine Linux</strong>
  <br>
  Administra tu servidor desde el navegador: métricas, procesos, logs, firewall, red, paquetes y más.
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/MarcoChaconR/dashMonitor?style=flat-square" alt="Last Commit">
  <img src="https://img.shields.io/github/license/MarcoChaconR/dashMonitor?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/OpenRC-ready-brightgreen?style=flat-square" alt="OpenRC">
  <img src="https://img.shields.io/badge/Secure-JWT%20%2B%20PAM-blueviolet?style=flat-square" alt="Auth">
</p>

---

## ✨ Funcionalidades

| Categoría | Descripción |
|-----------|-------------|
| 🖥️ **Panel general** | CPU por núcleo, memoria RAM, disco, red y temperatura en tiempo real |
| 📈 **Gráficos** | Sparklines de CPU, dona de RAM, barras de disco, tráfico de red con Chart.js |
| 🔄 **Live polling** | Métricas actualizadas cada 3s, logs en modo tail cada 5s |
| 📋 **Procesos** | Lista ordenable por CPU/memoria/PID, filtro por nombre, kill con confirmación |
| 🧠 **Consola** | Terminal integrada con PIN, historial de comandos, blocklist de comandos peligrosos |
| 📝 **Visor de logs** | Múltiples fuentes, filtro por texto, líneas configurables, ruta personalizada |
| 🔥 **Firewall** | Reglas iptables/nftables, puertos en escucha con proceso asociado |
| 🌐 **Red** | Interfaces, IPs, MAC, MTU, tabla de enrutamiento, servidores DNS |
| 📦 **Paquetes** | Total de paquetes instalados, actualizaciones disponibles vía `apk` |
| ℹ️ **Sistema** | OS, kernel, hostname, CPU, RAM total, discos, procesos activos |
| 👤 **Autenticación** | Login con PAM (usuarios del sistema), JWT con refresh token, rate limiting |
| 🔒 **Seguridad** | Headers HTTP estrictos, console con PIN + JWT, PIDs protegidos |
| 📱 **Responsivo** | Adaptable a desktop y móvil con sidebar colapsable |

---

## 🧱 Requisitos

- **Sistema:** Alpine Linux (corriendo como root)
- **Python:** 3.9+
- **Dependencias del sistema:** `python3`, `py3-pip`, `python3-dev`, `gcc`, `musl-dev`, `linux-pam`, `linux-pam-dev`

---

## 🚀 Instalación

### Instalación automática (recomendada)

```bash
git clone https://github.com/MarcoChaconR/dashMonitor.git
cd dashMonitor
chmod +x install.sh
./install.sh
```

El instalador te pedirá un **PIN de consola** y configurará todo automáticamente:
1. Instala dependencias del sistema
2. Copia archivos a `/opt/dashmonitor/`
3. Crea un entorno virtual Python
4. Instala dependencias pip
5. Genera `SECRET_KEY` y `CONSOLE_PIN_HASH`
6. Crea el archivo `.env` con permisos 600
7. Registra el servicio en OpenRC
8. Inicia el servicio

### Instalación manual

```bash
# 1. Dependencias
apk add python3 py3-pip python3-dev gcc musl-dev linux-pam linux-pam-dev

# 2. Copiar proyecto
mkdir -p /opt/dashmonitor
cp -r * /opt/dashmonitor/
rm /opt/dashmonitor/install.sh /opt/dashmonitor/dashmonitor.openrc

# 3. Entorno virtual
python3 -m venv /opt/dashmonitor/venv
. /opt/dashmonitor/venv/bin/activate
pip install -r /opt/dashmonitor/requirements.txt

# 4. Configurar
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
cat > /opt/dashmonitor/.env << EOF
SECRET_KEY=$SECRET_KEY
CONSOLE_PIN_HASH=<hash_bcrypt_del_pin>
ALLOWED_GROUP=wheel
HOST=0.0.0.0
PORT=9050
ENV=production
EOF
chmod 600 /opt/dashmonitor/.env

# 5. Servicio OpenRC
cp dashmonitor.openrc /etc/init.d/dashmonitor
chmod +x /etc/init.d/dashmonitor
rc-update add dashmonitor default
rc-service dashmonitor start
```

---

## ⚙️ Configuración

Variables de entorno (archivo `/opt/dashmonitor/.env`):

| Variable | Descripción | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta para firmar JWT | *(requerida)* |
| `CONSOLE_PIN_HASH` | Hash bcrypt del PIN de consola | *(requerida)* |
| `ALLOWED_GROUP` | Grupo del sistema con acceso al panel | `wheel` |
| `HOST` | Interfaz de escucha | `0.0.0.0` |
| `PORT` | Puerto del servidor web | `9050` |
| `ENV` | Entorno (`production` oculta `/docs`) | `production` |

---

## 🔌 API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/login` | Iniciar sesión (PAM) | ❌ |
| `POST` | `/auth/refresh` | Renovar tokens | ✅ Refresh |
| `POST` | `/auth/console-auth` | Autenticar PIN de consola | ✅ Access |
| `POST` | `/auth/logout` | Cerrar sesión | ✅ Access |
| `GET` | `/api/metrics` | Métricas completas del sistema | ✅ Access |
| `GET` | `/api/cpu` | CPU: %, frecuencia, load average | ✅ Access |
| `GET` | `/api/memory` | RAM y swap | ✅ Access |
| `GET` | `/api/disk` | Uso de disco + IO rates | ✅ Access |
| `GET` | `/api/network` | Tráfico de red por interfaz | ✅ Access |
| `GET` | `/api/temperature` | Temperatura de CPU | ✅ Access |
| `GET` | `/api/processes` | Lista de procesos (sortable) | ✅ Access |
| `DELETE` | `/api/processes/{pid}` | Terminar un proceso | ✅ Access |
| `POST` | `/api/console` | Ejecutar comando en consola | ✅ Console |
| `GET` | `/api/logs` | Fuentes de log disponibles | ✅ Access |
| `GET` | `/api/logs/{source}` | Leer logs de una fuente | ✅ Access |
| `GET` | `/api/logs-custom` | Leer logs de ruta arbitraria | ✅ Access |
| `GET` | `/api/packages/info` | Paquetes y actualizaciones | ✅ Access |
| `GET` | `/api/system/info` | Información del sistema | ✅ Access |
| `GET` | `/api/network/config` | Configuración de red | ✅ Access |
| `GET` | `/api/firewall/rules` | Reglas de firewall | ✅ Access |
| `GET` | `/health` | Health check | ❌ |
| `GET` | `/docs` | Documentación Swagger (solo dev) | ❌ |

---

## 🏗️ Arquitectura

```
dashMonitor/
├── main.py                 # FastAPI app, middlewares, routers
├── config.py               # Configuración desde variables de entorno
├── models/
│   └── schemas.py          # Pydantic models (request/response)
├── routers/
│   ├── auth.py             # Autenticación y tokens
│   ├── metrics.py          # Métricas del sistema
│   ├── processes.py        # Gestión de procesos
│   ├── console.py          # Ejecución de comandos
│   ├── logs.py             # Visor de logs
│   ├── packages.py         # Información de paquetes
│   ├── system_info.py      # Información del sistema
│   ├── network.py          # Configuración de red
│   └── firewall.py         # Reglas de firewall
├── services/
│   ├── auth_service.py     # PAM, JWT, rate limiting
│   ├── system_metrics.py   # CPU, RAM, disco, red, temperatura
│   ├── console_service.py  # Shell con blocklist
│   ├── log_service.py      # Descubrimiento y lectura de logs
│   ├── package_service.py  # apk wrapper con caché
│   ├── system_info_service.py
│   ├── network_service.py  # Interfaces, routing, DNS
│   └── firewall_service.py # iptables/nftables parsing
├── static/
│   ├── index.html          # SPA principal
│   ├── css/
│   │   └── dashboard.css   # Estilos responsivos
│   └── js/
│       ├── app.js          # Auth, sesión, polling
│       ├── charts.js       # Gráficos Chart.js
│       ├── console.js      # Terminal UI
│       ├── firewall.js     # Firewall UI
│       ├── logs.js         # Log viewer UI
│       ├── network.js      # Network UI
│       ├── packages.js     # Packages UI
│       ├── processes.js    # Process list UI
│       └── system.js       # System info UI
├── requirements.txt        # Dependencias Python
├── install.sh              # Instalador Alpine
├── dashmonitor.openrc      # Servicio OpenRC
└── README.md               # Este archivo
```

---

## 🛠️ Desarrollo

```bash
# Clonar
git clone https://github.com/MarcoChaconR/dashMonitor.git
cd dashMonitor

# Entorno virtual
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Variables de entorno (desarrollo)
cat > .env << EOF
SECRET_KEY=dev-secret-key-change-in-production
CONSOLE_PIN_HASH=<hash_bcrypt>
ALLOWED_GROUP=wheel
HOST=0.0.0.0
PORT=9050
ENV=development
EOF

# Iniciar servidor
uvicorn main:app --reload --host 0.0.0.0 --port 9050
```

Accede a `http://localhost:9050` para el panel y `http://localhost:9050/docs` para Swagger UI.

---

## 🔐 Seguridad

- **Autenticación:** PAM del sistema (usuarios UNIX) + JWT (access/refresh tokens)
- **Consola:** PIN con hash bcrypt + JWT separado con expiración de 30 min
- **Rate limiting:** 5 intentos de login por ventana de 5 minutos
- **Protección:** Headers `X-Content-Type-Options`, `X-Frame-Options`, `Cache-Control`
- **Comandos bloqueados:** `rm -rf`, `mkfs`, `dd`, `shutdown`, `reboot`, etc.
- **PIDs protegidos:** El proceso del panel, su padre y PID 1 no pueden eliminarse
- **Entorno aislado:** `PATH` restringido en ejecución de comandos

---

## 📄 Licencia

Este proyecto está licenciado bajo **GNU General Public License v3.0**.

---

<p align="center">
  <sub>Hecho con ❤️ para la administración de servidores Alpine Linux</sub>
</p>
