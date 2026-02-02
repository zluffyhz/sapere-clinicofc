#!/bin/bash

# Script de Restauração de Backup - Sapere Clinic
# Este script restaura um backup específico do banco de dados

BACKUP_DIR="/home/ubuntu/sapere-clinic/backups"

echo "🔄 Sistema de Restauração de Backup - Sapere Clinic"
echo "=================================================="
echo ""

# Verificar se DATABASE_URL está definida
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

# Listar backups disponíveis
echo "📚 Backups disponíveis:"
echo ""
ls -lh "$BACKUP_DIR"/sapere_backup_*.sql.gz 2>/dev/null | nl | awk '{print $1 ") " $10 " (" $6 ") - " $8 " " $7}'

if [ $? -ne 0 ] || [ $(ls -1 "$BACKUP_DIR"/sapere_backup_*.sql.gz 2>/dev/null | wc -l) -eq 0 ]; then
    echo "❌ Nenhum backup encontrado em $BACKUP_DIR"
    exit 1
fi

echo ""
echo "⚠️  ATENÇÃO: A restauração irá SOBRESCREVER todos os dados atuais!"
echo ""
read -p "Digite o número do backup que deseja restaurar (ou 'q' para sair): " choice

if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

# Validar escolha
if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
    echo "❌ Escolha inválida"
    exit 1
fi

# Obter arquivo de backup selecionado
BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/sapere_backup_*.sql.gz 2>/dev/null | sed -n "${choice}p")

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Backup não encontrado"
    exit 1
fi

echo ""
echo "📦 Backup selecionado: $(basename $BACKUP_FILE)"
echo "🗄️  Banco de destino: $DB_NAME"
echo "🖥️  Host: $DB_HOST:$DB_PORT"
echo ""
read -p "Digite 'CONFIRMAR' para prosseguir com a restauração: " confirm

if [ "$confirm" != "CONFIRMAR" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🔄 Iniciando restauração..."

# Descompactar e restaurar
gunzip -c "$BACKUP_FILE" | mysql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASS"

if [ $? -eq 0 ]; then
    echo "✅ Backup restaurado com sucesso!"
    echo "📅 Data/Hora: $(date)"
else
    echo "❌ Erro ao restaurar backup"
    exit 1
fi
