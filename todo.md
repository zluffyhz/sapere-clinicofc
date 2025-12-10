# Sapere Clinic - TODO

## Banco de Dados e Modelos
- [x] Estender schema com tabela de pacientes
- [x] Criar tabela de terapeutas vinculados a usuários
- [x] Criar tabela de agendamentos (appointments)
- [x] Criar tabela de documentos com referência S3
- [x] Criar tabela de anamnese
- [x] Criar tabela de registros de sessão (evoluções)
- [x] Criar tabela de notificações
- [x] Executar db:push para aplicar schema

## Identidade Visual
- [x] Copiar logo Sapere para diretório public
- [x] Configurar cores laranja e amarelo no index.css
- [x] Configurar tipografia moderna no index.html
- [x] Logo Sapere configurada no sistema

## Backend - APIs tRPC
- [x] Criar helpers de banco de dados em server/db.ts
- [x] Implementar router de pacientes (CRUD)
- [x] Implementar router de agendamentos (CRUD + listagem por data)
- [x] Implementar router de documentos (upload S3, listagem, download)
- [x] Implementar router de anamnese (criar, atualizar, visualizar)
- [x] Implementar router de registros de sessão (criar, listar)
- [x] Implementar router de notificações (criar, listar, marcar como lida)
- [x] Adicionar middleware therapistProcedure e familyProcedure
- [x] Implementar lógica de controle de acesso baseado em roles

## Portal da Família
- [x] Criar página de dashboard da família
- [x] Implementar calendário interativo para visualizar agenda
- [x] Criar área de documentos com listagem e download
- [x] Implementar sistema de notificações visuais na dashboard
- [x] Adicionar filtros por tipo de terapia no calendário

## Portal do Terapeuta
- [x] Criar página de dashboard do terapeuta
- [x] Implementar formulário de anamnese com autosave
- [x] Criar interface de registro de sessão (evolução)
- [x] Implementar gestão de agenda com visão semanal
- [x] Implementar gestão de agenda com visão diária
- [x] Adicionar funcionalidade de upload de documentos
- [x] Criar listagem de pacientes do terapeuta

## Sistema de Notificações
- [x] Implementar envio de email quando novos documentos são adicionados
- [x] Implementar envio de email quando agenda é alterada
- [x] Criar componente de notificações visuais no frontend
- [x] Implementar badge de contagem de notificações não lidas

## Armazenamento S3
- [x] Configurar upload de documentos para S3
- [x] Implementar geração de URLs públicas para download
- [x] Adicionar validação de tipos de arquivo permitidos
- [x] Implementar controle de acesso aos documentos

## Testes
- [x] Criar testes para router de pacientes
- [x] Criar testes para router de agendamentos
- [x] Criar testes para router de notificações
- [x] Criar testes para controle de acesso baseado em roles
- [x] Validar fluxo completo de upload e download de documentos

## Layout e Navegação
- [x] Criar SapereLayout customizado com cores Sapere
- [x] Implementar navegação específica para família
- [x] Implementar navegação específica para terapeuta
- [x] Configurar rotas em App.tsx
- [x] Garantir responsividade mobile-first

## Painel de Administração de Usuários
- [x] Criar router de administração para gerenciar usuários
- [x] Implementar criação de novos usuários pelo admin
- [x] Implementar listagem de todos os usuários
- [x] Implementar edição de perfil de usuário (família/terapeuta)
- [x] Implementar exclusão de usuários
- [x] Criar página de administração de usuários no frontend
- [x] Adicionar formulário de criação de usuário
- [x] Adicionar tabela de listagem de usuários com ações
- [x] Adicionar rota de administração na navegação (somente para admin)
- [x] Criar testes para funcionalidades de administração

## Sistema de Autenticação por Senha
- [x] Adicionar campo passwordHash ao schema de usuários
- [x] Instalar biblioteca bcrypt para hash de senhas
- [x] Criar helpers de hash e verificação de senha
- [x] Atualizar createUser para gerar senha temporária
- [x] Implementar endpoint de login com email/senha
- [x] Criar página de login com formulário email/senha
- [x] Adicionar funcionalidade de alterar senha
- [x] Implementar página de alteração de senha
- [x] Criar testes para autenticação por senha
- [x] Mostrar senha temporária ao admin após criar usuário

## Correção de Fluxo de Login
- [x] Modificar SapereLayout para redirecionar para /login ao invés de OAuth
- [x] Remover botão OAuth da página de login
- [x] Simplificar fluxo de login para usar apenas email/senha
