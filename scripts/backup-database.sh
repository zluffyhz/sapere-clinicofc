#!/bin/bash

# Script de Backup Automático do Banco de Dados Sapere Clinic
# Este script cria backups diários do banco de dados MySQL/TiDB
# e mantém apenas os últimos 7 backups (retenção de 7 dias)

# Configurações
BACKUP_DIR="/home/ubuntu/sapere-clinic/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sapere_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=7

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

# Extrair informações de conexão da DATABASE_URL
# Formato esperado: mysql://user:password@host:port/database
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "🔄 Iniciando backup do banco de dados..."
echo "📅 Data/Hora: $(date)"
echo "🗄️  Banco: $DB_NAME"
echo "🖥️  Host: $DB_HOST:$DB_PORT"

# Executar mysqldump
mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASS" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --databases "$DB_NAME" \
    > "$BACKUP_DIR/$BACKUP_FILE"

# Verificar se o backup foi criado com sucesso
if [ $? -eq 0 ]; then
    # Comprimir o backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
    echo "✅ Backup criado com sucesso!"
    echo "📦 Arquivo: ${BACKUP_FILE}.gz"
    echo "📊 Tamanho: $BACKUP_SIZE"
else
    echo "❌ Erro ao criar backup"
    exit 1
fi

# Remover backups antigos (manter apenas os últimos 7 dias)
echo "🧹 Limpando backups antigos (retenção: $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "sapere_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Contar backups restantes
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/sapere_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📚 Backups disponíveis: $BACKUP_COUNT"

# Listar backups
echo "📋 Lista de backups:"
ls -lh "$BACKUP_DIR"/sapere_backup_*.sql.gz 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

echo "✅ Processo de backup concluído!"
