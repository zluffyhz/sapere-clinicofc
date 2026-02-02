# Sistema de Backup Automático - Sapere Clinic

## 📋 Visão Geral

O sistema de backup automático do Sapere Clinic garante que todos os dados do banco de dados sejam salvos diariamente, com retenção de 7 dias de histórico. Isso protege contra perda acidental de dados e permite restauração rápida em caso de problemas.

## 🔧 Componentes

### 1. Script de Backup (`scripts/backup-database.sh`)

Script Bash que:
- Exporta todo o banco de dados MySQL/TiDB usando `mysqldump`
- Comprime o backup com `gzip` para economizar espaço
- Mantém apenas os últimos 7 backups (remove backups mais antigos automaticamente)
- Registra logs detalhados de cada execução

**Localização:** `/home/ubuntu/sapere-clinic/scripts/backup-database.sh`

### 2. Diretório de Backups

Todos os backups são armazenados em:
```
/home/ubuntu/sapere-clinic/backups/
```

**Formato dos arquivos:**
```
sapere_backup_YYYYMMDD_HHMMSS.sql.gz
```

Exemplo: `sapere_backup_20260202_030000.sql.gz`

## 🚀 Configuração Inicial

### Passo 1: Verificar Dependências

Certifique-se de que o `mysqldump` está instalado:

```bash
which mysqldump
```

Se não estiver instalado:

```bash
# Ubuntu/Debian
sudo apt-get install mysql-client

# CentOS/RHEL
sudo yum install mysql
```

### Passo 2: Testar Backup Manual

Execute o script manualmente para verificar se funciona:

```bash
cd /home/ubuntu/sapere-clinic
./scripts/backup-database.sh
```

Você deve ver uma saída similar a:

```
🔄 Iniciando backup do banco de dados...
📅 Data/Hora: Seg Fev 02 10:30:00 GMT 2026
🗄️  Banco: sapere_clinic
🖥️  Host: database.example.com:3306
✅ Backup criado com sucesso!
📦 Arquivo: sapere_backup_20260202_103000.sql.gz
📊 Tamanho: 2.3M
🧹 Limpando backups antigos (retenção: 7 dias)...
📚 Backups disponíveis: 1
✅ Processo de backup concluído!
```

### Passo 3: Configurar Execução Automática (Cron)

Para executar o backup automaticamente todos os dias às 03:00 da manhã:

1. Abra o crontab:
```bash
crontab -e
```

2. Adicione a seguinte linha:
```bash
0 3 * * * cd /home/ubuntu/sapere-clinic && ./scripts/backup-database.sh >> /home/ubuntu/sapere-clinic/logs/backup.log 2>&1
```

3. Salve e feche o editor.

**Explicação do cron:**
- `0 3 * * *` = Executar às 03:00 todos os dias
- `cd /home/ubuntu/sapere-clinic` = Navegar para o diretório do projeto
- `./scripts/backup-database.sh` = Executar o script de backup
- `>> /home/ubuntu/sapere-clinic/logs/backup.log 2>&1` = Salvar logs em arquivo

### Passo 4: Criar Diretório de Logs

```bash
mkdir -p /home/ubuntu/sapere-clinic/logs
```

## 📊 Monitoramento

### Verificar Backups Disponíveis

```bash
ls -lh /home/ubuntu/sapere-clinic/backups/
```

### Verificar Logs de Execução

```bash
tail -f /home/ubuntu/sapere-clinic/logs/backup.log
```

### Verificar Último Backup

```bash
ls -lt /home/ubuntu/sapere-clinic/backups/ | head -2
```

## 🔄 Restauração de Backup

### Restaurar Backup Completo

1. Escolha o arquivo de backup:
```bash
ls -lh /home/ubuntu/sapere-clinic/backups/
```

2. Descompacte o backup:
```bash
gunzip -c /home/ubuntu/sapere-clinic/backups/sapere_backup_YYYYMMDD_HHMMSS.sql.gz > restore.sql
```

3. Restaure no banco de dados:
```bash
mysql -h <HOST> -P <PORT> -u <USER> -p <DATABASE> < restore.sql
```

**⚠️ ATENÇÃO:** A restauração sobrescreve todos os dados atuais!

### Restaurar Tabela Específica

Se precisar restaurar apenas uma tabela:

1. Descompacte o backup:
```bash
gunzip -c backup.sql.gz > backup.sql
```

2. Extraia apenas a tabela desejada:
```bash
sed -n '/CREATE TABLE `nome_da_tabela`/,/UNLOCK TABLES/p' backup.sql > tabela.sql
```

3. Restaure a tabela:
```bash
mysql -h <HOST> -P <PORT> -u <USER> -p <DATABASE> < tabela.sql
```

## 🛡️ Segurança

### Proteção dos Backups

Os backups contêm dados sensíveis. Recomendações:

1. **Permissões restritas:**
```bash
chmod 700 /home/ubuntu/sapere-clinic/backups
chmod 600 /home/ubuntu/sapere-clinic/backups/*.sql.gz
```

2. **Backup offsite:** Considere copiar backups para armazenamento externo:
```bash
# Exemplo: rsync para servidor remoto
rsync -avz /home/ubuntu/sapere-clinic/backups/ user@backup-server:/backups/sapere-clinic/
```

3. **Criptografia:** Para backups muito sensíveis, considere criptografar:
```bash
gpg --encrypt --recipient your-email@example.com backup.sql.gz
```

## 📈 Configurações Avançadas

### Alterar Retenção de Backups

Edite o script `backup-database.sh` e modifique a variável:

```bash
RETENTION_DAYS=14  # Manter backups por 14 dias
```

### Alterar Horário de Execução

Edite o crontab (`crontab -e`) e ajuste o horário:

```bash
# Executar às 02:00
0 2 * * * cd /home/ubuntu/sapere-clinic && ./scripts/backup-database.sh >> logs/backup.log 2>&1

# Executar duas vezes ao dia (02:00 e 14:00)
0 2,14 * * * cd /home/ubuntu/sapere-clinic && ./scripts/backup-database.sh >> logs/backup.log 2>&1
```

### Notificações por Email

Para receber emails quando o backup falhar, adicione ao script:

```bash
# No final do script backup-database.sh
if [ $? -ne 0 ]; then
    echo "Backup falhou em $(date)" | mail -s "Erro no Backup Sapere Clinic" admin@example.com
fi
```

## 🔍 Troubleshooting

### Problema: "mysqldump: command not found"

**Solução:** Instale o cliente MySQL:
```bash
sudo apt-get install mysql-client
```

### Problema: "Access denied for user"

**Solução:** Verifique as credenciais no `DATABASE_URL`:
```bash
echo $DATABASE_URL
```

### Problema: Backups muito grandes

**Solução:** O script já comprime com gzip. Para compressão adicional:
```bash
# Usar bzip2 (mais lento, mas comprime melhor)
bzip2 backup.sql
```

### Problema: Espaço em disco insuficiente

**Solução:** 
1. Reduza o `RETENTION_DAYS`
2. Mova backups antigos para armazenamento externo
3. Aumente o espaço em disco do servidor

## 📝 Checklist de Manutenção

- [ ] Testar backup manual mensalmente
- [ ] Verificar logs de backup semanalmente
- [ ] Testar restauração de backup trimestralmente
- [ ] Revisar política de retenção anualmente
- [ ] Verificar espaço em disco mensalmente

## 🆘 Suporte

Em caso de problemas com o sistema de backup:

1. Verifique os logs: `tail -100 /home/ubuntu/sapere-clinic/logs/backup.log`
2. Execute o backup manualmente para ver erros: `./scripts/backup-database.sh`
3. Verifique permissões: `ls -la /home/ubuntu/sapere-clinic/backups/`
4. Contate o suporte técnico com os logs de erro

---

**Última atualização:** 02/02/2026  
**Versão:** 1.0
