#!/usr/bin/env python3
"""
Backup completo do banco de dados de produção da Clínica Sapere
Exporta todos os dados em formato JSON para restauração futura
"""

import os
import json
import subprocess
from datetime import datetime

# Configuração do banco de dados
DB_URL = os.environ.get('DATABASE_URL', '')

# Extrair informações da connection string
# mysql://user:pass@host:port/database
parts = DB_URL.replace('mysql://', '').split('@')
user_pass = parts[0].split(':')
host_db = parts[1].split('/')

DB_USER = user_pass[0]
DB_PASS = user_pass[1]
DB_HOST = host_db[0].split(':')[0]
DB_PORT = host_db[0].split(':')[1] if ':' in host_db[0] else '3306'
DB_NAME = host_db[1].split('?')[0]

# Diretório de backup
BACKUP_DIR = '/home/ubuntu/sapere-clinic/backups'
os.makedirs(BACKUP_DIR, exist_ok=True)

# Nome do arquivo de backup
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_file = f'{BACKUP_DIR}/backup_{timestamp}.json'

print(f"🔄 Iniciando backup do banco de dados...")
print(f"📅 Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"🗄️  Banco: {DB_NAME}")
print(f"🖥️  Host: {DB_HOST}")

# Tabelas para fazer backup
tables = [
    'users',
    'patients',
    'appointments',
    'evolutions',
    'documents',
    'patient_therapist_assignments',
    'attendance_records'
]

backup_data = {
    'timestamp': timestamp,
    'database': DB_NAME,
    'tables': {}
}

for table in tables:
    print(f"📦 Exportando tabela: {table}...")
    
    # Executar query usando mysql client
    query = f"SELECT * FROM {table}"
    cmd = [
        'mysql',
        '-h', DB_HOST,
        '-P', DB_PORT,
        '-u', DB_USER,
        f'-p{DB_PASS}',
        '-D', DB_NAME,
        '--ssl-mode=REQUIRED',
        '-e', query,
        '--batch',
        '--raw',
        '--skip-column-names'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        rows = []
        for line in result.stdout.strip().split('\n'):
            if line:
                rows.append(line.split('\t'))
        
        backup_data['tables'][table] = {
            'row_count': len(rows),
            'data': rows
        }
        print(f"  ✅ {len(rows)} registros exportados")
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Erro ao exportar {table}: {e.stderr}")
        backup_data['tables'][table] = {
            'row_count': 0,
            'data': [],
            'error': str(e)
        }

# Salvar backup em JSON
print(f"\n💾 Salvando backup em: {backup_file}")
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(backup_data, f, indent=2, ensure_ascii=False, default=str)

# Estatísticas
total_records = sum(t['row_count'] for t in backup_data['tables'].values())
file_size = os.path.getsize(backup_file)
file_size_mb = file_size / (1024 * 1024)

print(f"\n✅ Backup concluído com sucesso!")
print(f"📊 Total de registros: {total_records}")
print(f"📁 Tamanho do arquivo: {file_size_mb:.2f} MB")
print(f"📂 Localização: {backup_file}")

# Limpar backups antigos (manter apenas os últimos 7)
print(f"\n🧹 Limpando backups antigos...")
backup_files = sorted([f for f in os.listdir(BACKUP_DIR) if f.startswith('backup_') and f.endswith('.json')])
if len(backup_files) > 7:
    for old_backup in backup_files[:-7]:
        old_path = os.path.join(BACKUP_DIR, old_backup)
        os.remove(old_path)
        print(f"  🗑️  Removido: {old_backup}")

print(f"\n✅ Processo de backup finalizado!")
