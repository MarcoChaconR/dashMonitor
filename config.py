from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
CONSOLE_PIN_HASH = os.getenv("CONSOLE_PIN_HASH")
ALLOWED_GROUP = os.getenv("ALLOWED_GROUP", "wheel")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 9050))
ENV = os.getenv("ENV", "production")

ACCESS_TOKEN_EXPIRE_MINUTES = 480
REFRESH_TOKEN_EXPIRE_HOURS = 24
CONSOLE_TOKEN_EXPIRE_MINUTES = 30
ALGORITHM = "HS256"

PROTECTED_PIDS: set[int] = set()
