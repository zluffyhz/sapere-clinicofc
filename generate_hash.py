#!/usr/bin/env python3
import subprocess
import sys

# Instalar bcrypt se não estiver instalado
try:
    import bcrypt
except ImportError:
    print("Instalando bcrypt...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "bcrypt", "-q"])
    import bcrypt

password = "Sapere2026!"
hash_bytes = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
hash_str = hash_bytes.decode()

print(f"Senha temporária: {password}")
print(f"Hash bcrypt: {hash_str}")
