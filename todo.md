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

## Correção de Bugs na Tela de Login
- [x] Identificar causa do travamento na página de login
- [x] Simplificar LoginPage removendo redirecionamentos desnecessários
- [x] Corrigir loop de redirecionamento entre SapereLayout e LoginPage
- [x] Separar rotas públicas (login) de rotas protegidas (dashboard)
- [x] Testar fluxo completo de login

## Correção de Tela Branca nas Abas
- [x] Verificar logs do navegador para erros
- [x] Revisar estrutura de rotas no App.tsx
- [x] Corrigir problema de rotas aninhadas com wouter
- [x] Criar componente ProtectedRoute para encapsular SapereLayout
- [x] Remover Switch aninhado que causava conflito
- [x] Testar todas as abas (Início, Agenda, Documentos, Pacientes, etc)

## Correção da Aba de Prontuário
- [x] Verificar rota de prontuário no App.tsx
- [x] Verificar se ProntuarioPage está recebendo parâmetros corretamente
- [x] Corrigir ProtectedRoute para passar props para componentes
- [x] Testar navegação para prontuário

## Busca e Filtros na Página de Pacientes
- [x] Adicionar campo de busca por nome na PacientesPage
- [x] Adicionar filtro por tipo de terapia (Fonoaudiologia, Psicologia, etc)
- [x] Implementar lógica de filtro no frontend
- [x] Adicionar indicador visual de filtros ativos com badges
- [x] Adicionar botão de limpar filtros
- [x] Mostrar badges de tipo de terapia em cada paciente
- [x] Testar busca e filtros com diferentes combinações

## Correção da Página de Prontuários
- [x] Verificar rota /prontuarios no menu de navegação
- [x] Criar página de listagem de prontuários
- [x] A rota /prontuarios/:id funciona, mas /prontuarios não tem página
- [x] Implementar página que lista todos os pacientes para acessar prontuários
- [x] Adicionar busca por nome na listagem
- [x] Testar navegação para a aba Prontuários

## Remoção de Dados Mock
- [x] Identificar dados mock de pacientes no banco
- [x] Remover pacientes de teste do banco de dados
- [x] Limpar agendamentos relacionados aos pacientes mock
- [x] Limpar registros de sessão relacionados
- [x] Limpar documentos relacionados
- [x] Limpar notificações relacionadas
- [x] Limpar anamnese relacionada
- [x] Verificar se sistema funciona com banco vazio

## Melhoria na Vinculação de Pacientes a Usuários
- [x] Adicionar coluna ID na tabela de usuários do admin
- [x] Substituir campo de input manual por dropdown na página de pacientes
- [x] Criar query para listar usuários do tipo "family"
- [x] Implementar Select com busca de usuários
- [x] Mostrar nome, email e ID do usuário no dropdown
- [x] Testar criação de paciente com novo dropdown

## Visualização de Agenda por Terapeuta
- [x] Criar query para listar terapeutas ativos
- [x] Adicionar dropdown de seleção de terapeuta na página de agenda
- [x] Implementar filtro de agendamentos por terapeuta
- [x] Adicionar opção "Todos os terapeutas" no filtro
- [x] Contador de sessões já mostra sessões filtradas
- [x] Testar filtro com múltiplos terapeutas

## Correção do Botão de Novo Paciente
- [x] Verificar implementação do botão nas ações rápidas da dashboard
- [x] Corrigir navegação do botão (de /pacientes/novo para /pacientes)
- [x] Testar clique no botão de novo paciente

## Contador de Notificações Não Lidas
- [x] Query tRPC para contar notificações não lidas já existe
- [x] Badge de contador no ícone de sino do SapereLayout já implementado
- [x] Atualização automática a cada 30 segundos já configurada
- [x] Estilizar badge com cor laranja da identidade visual Sapere
- [x] Badge aparece apenas quando há notificações não lidas

## Correção de Tags <a> Aninhadas
- [x] Identificar onde há Link com <a> dentro no SapereLayout
- [x] Remover tag <a> redundante do ícone de notificações
- [x] Mover className="relative" para o Button
- [x] Procurar outras instâncias de Link com <a> aninhado
- [x] Corrigir tag <a> aninhada no logo do SapereLayout
- [x] Testar se erro foi completamente eliminado

## Timer de Sessão para Terapeutas
- [x] Criar componente SessionTimer com cronômetro
- [x] Adicionar campo de texto para evolução durante a sessão
- [x] Implementar botões de iniciar, pausar e finalizar sessão
- [x] Adicionar autosave do texto de evolução
- [x] Criar página de seleção de paciente para iniciar sessão
- [x] Integrar com backend para salvar registro de sessão
- [x] Adicionar botão "Iniciar Sessão" na dashboard do terapeuta
- [x] Salvar duração da sessão em minutos
- [x] Mostrar histórico de sessões no prontuário
- [x] Adicionar rotas /session e /session/:patientId
- [x] Testar fluxo completo de iniciar e finalizar sessão

## Correção de Tag <a> Aninhada nas Ações Rápidas
- [x] Verificar TherapistDashboard nas ações rápidas
- [x] Substituir Link+Button por Button com onClick
- [x] Criar componente QuickActionButton para ações rápidas
- [x] Adicionar useLocation para navegação programada
- [x] Testar se erro foi eliminado

## Correção do Select de Usuário Responsável
- [x] Verificar implementação do Select na PacientesPage
- [x] Corrigir bug mudando valor inicial de 0 para undefined
- [x] Ajustar lógica do Select para aceitar valor vazio
- [x] Testar cadastro de paciente com seleção de responsável

## Sistema de Frequência/Presença
- [x] Criar tabela de presenças no schema (attendance)
- [x] Executar migração do banco de dados
- [x] Implementar rotas backend para CRUD de presenças
- [x] Criar interface de marcação de presença para admin/recepção
- [x] Desenvolver dashboard de frequência para portal da família
- [x] Adicionar estatísticas visuais (gráficos, calendário)
- [x] Escrever testes vitest para validar funcionalidade (13 novos testes)
- [x] Testar fluxo completo (admin marca → família visualiza)

## Sistema de Gamificação com Medalhas
- [x] Definir medalhas por sequência de presença (5, 10, 25, 50, 100 sessões)
- [x] Definir conquistas especiais (primeira sessão, mês perfeito, etc)
- [x] Implementar lógica de cálculo de conquistas no backend
- [x] Criar componentes visuais de medalhas com animações
- [x] Adicionar seção de conquistas ao dashboard de frequência
- [x] Adicionar cards de maior sequência e meses perfeitos
- [x] Testar sistema de gamificação (7 novos testes, total 46)

## Redesign das Insígnias com Corujas
- [x] Criar SVGs de corujas estilizadas para cada tier (Bronze, Prata, Ouro, Platina, Diamante)
- [x] Implementar componente OwlBadge com visual elaborado
- [x] Adicionar animações e efeitos visuais nas insígnias (brilho, hover, sparkles)
- [x] Integrar novas insígnias ao dashboard de frequência
- [x] Testar visual em diferentes tamanhos de tela

## Bug: Terapeutas não visualizam dados criados por admin
- [x] Investigar queries de listagem de pacientes
- [x] Investigar queries de listagem de agendamentos
- [x] Corrigir filtros de permissão para terapeutas (agora todos veem todos)
- [x] Adicionar função getAllPatients no db.ts
- [x] Testar visualização de dados entre diferentes perfis (46 testes passando)

## Notificações em Tempo Real para Terapeutas
- [x] Criar notificação ao marcar presença de paciente
- [x] Enviar notificação para terapeuta responsável
- [x] Implementar polling mais frequente (a cada 10s)
- [x] Adicionar alerta sonoro quando nova notificação chegar (Web Audio API)
- [x] Adicionar tipo 'attendance' ao enum de notificações
- [x] Testar fluxo completo (46 testes passando)

## Remover "Novo Paciente" para Terapeutas
- [x] Localizar componente de ações rápidas no dashboard
- [x] Adicionar verificação de role para mostrar "Novo Paciente" apenas para admins
- [x] Aplicada condição {user?.role === 'admin'} no TherapistDashboard

## Permitir Visualização de Pacientes para Terapeutas
- [x] Modificar PacientesPage para ocultar botão "Novo Paciente" para terapeutas
- [x] Alterada condição de {isTherapist} para {isAdmin}
- [x] Terapeutas podem visualizar lista e detalhes, mas não cadastrar

## Relatório de Frequência em PDF
- [x] Instalar biblioteca PDF (pdfkit)
- [x] Criar helper generateFrequencyReportPDF
- [x] Criar rota backend attendance.generateReport
- [x] Implementar geração de PDF com estatísticas e histórico
- [x] Upload automático para S3
- [x] Adicionar botão de exportação na página de frequência da família
- [x] Adicionar seletores de mês e ano
- [x] Testes passando (46 testes)

## Exportação PDF para Administradores
- [x] Adicionar botão de exportação PDF na página de Presença (admin)
- [x] Adicionar seletor de paciente para escolher qual relatório gerar
- [x] Adicionar seletores de mês e ano
- [x] Testes passando (46 testes)

## Substituir Anamnese por Dados do Paciente
- [x] Renomear tabela anamnesis para patient_data no schema
- [x] Atualizar campos: mainComplaints, allergies, currentMedications, therapyGoals, additionalNotes
- [x] Executar migração do banco de dados (rename table + alter columns)
- [x] Atualizar rotas backend (criar aliases legacy)
- [x] Atualizar interface frontend: renomear aba para "Dados do Paciente"
- [x] Simplificar formulário com apenas 5 campos
- [x] Atualizar testes para usar novos campos
- [x] Todos os 46 testes passando
- [x] Limpar 32 usuários de teste

## Modal de Notificações Completo
- [x] Criar componente NotificationsModal com lista de notificações
- [x] Adicionar filtros por tipo (attendance, appointment, document)
- [x] Implementar botão de marcar como lida individualmente
- [x] Rota backend notifications.markAsRead já existia
- [x] Rota backend notifications.markAllAsRead já existia
- [x] Integrar modal ao ícone de sininho no SapereLayout
- [x] Testar fluxo completo de notificações

## Validação de Conflitos de Horário
- [x] Criar função backend checkScheduleConflicts no db.ts
- [x] Validar conflitos ao criar novo agendamento
- [x] Validar conflitos ao editar agendamento existente
- [x] Bloquear criação/edição com mensagem de erro quando houver conflito
- [x] Verificar conflitos de terapeuta e paciente separadamente
- [x] Corrigir função checkScheduleConflicts para lidar corretamente com excludeAppointmentId opcional
- [x] Criar 5 testes vitest para validação de conflitos (appointments.conflicts.test.ts)
- [x] Ajustar testes existentes para usar horários únicos e evitar conflitos
- [x] Testar validação com diferentes cenários (51 testes passando)

## Limpeza de Dados Mock dos Testes
- [x] Identificar usuários mock criados pelos testes (22 usuários encontrados)
- [x] Identificar pacientes mock criados pelos testes
- [x] Remover agendamentos relacionados aos dados mock
- [x] Remover 15 agendamentos de teste com datas em 2030
- [x] Remover registros de presença relacionados
- [x] Remover notificações relacionadas
- [x] Remover dados de pacientes relacionados
- [x] Remover documentos relacionados
- [x] Remover usuários mock (22 usuários removidos)
- [x] Verificar que apenas 4 usuários reais permanecem
- [x] Confirmar integridade do banco de dados (7 pacientes, 4 usuários)

## Remover Pacientes "Paciente para Anamnese"
- [x] Identificar pacientes com nome "Paciente para Anamnese" (6 pacientes encontrados)
- [x] Remover agendamentos relacionados
- [x] Remover registros de presença relacionados
- [x] Remover dados de pacientes relacionados
- [x] Remover documentos relacionados
- [x] Remover os 6 pacientes
- [x] Verificar integridade do banco (apenas 1 paciente real restante: Antonella Salles romanini)

## Transformar Modal de Notificações em Dropdown
- [x] Criar novo componente NotificationsDropdown usando DropdownMenu
- [x] Substituir Dialog por DropdownMenu com posicionamento align="end"
- [x] Manter funcionalidades de filtros (Todas, Presença, Agenda, Docs)
- [x] Manter botões de marcar como lida individual e todas
- [x] Ajustar largura para 400px e altura para 400px com scroll
- [x] Reduzir tamanhos de fonte e espaçamentos para caber no dropdown
- [x] Integrar dropdown ao SapereLayout substituindo modal
- [x] Testar interação e usabilidade

## Criar Usuário Administrador Recepção
- [x] Gerar hash bcrypt da senha sapere0926S*
- [x] Inserir usuário sapererecepcao@gmail.com com role admin
- [x] Verificar criação no banco de dados
- [x] Usuário criado: Recepção Sapere (sapererecepcao@gmail.com) - Admin

## Redesign da Tela de Login
- [ ] Analisar tela de login de referência (cmldevtest.manus.space)
- [ ] Criar novo design vibrante e humanizado
- [ ] Usar fonte Aileron
- [ ] Suavizar cores de texto (evitar preto puro)
- [ ] Otimizar para mobile-first
- [ ] Adicionar textos acolhedores e humanizados
- [ ] Integrar cores da Clínica Sapere (laranja/amarelo)
- [ ] Testar responsividade em diferentes tamanhos de tela

## Redesign da Tela de Login Sapere
- [x] Analisar tela de login de referência (cmldevtest.manus.space/login)
- [x] Criar novo design vibrante e humanizado para LoginPage.tsx
- [x] Usar fonte Aileron em todo o site (configurado em index.css e index.html)
- [x] Suavizar cores de texto (usando gray-100, gray-300, gray-400)
- [x] Otimizar layout para mobile-first (split-screen responsivo)
- [x] Adicionar textos acolhedores e humanizados
- [x] Integrar paleta de cores Sapere (gradiente laranja/amarelo vibrante)
- [x] Criar painel informativo com 3 cards de funcionalidades
- [x] Adicionar indicadores de segurança e links úteis
- [x] Testar responsividade em diferentes dispositivos (layout split-screen funciona perfeitamente)

## Textos Humanizados na Tela de Login
- [x] Alterar título para "Bem-vindo ao App Sapere"
- [x] Alterar descrição principal para foco em transformação do futuro das crianças
- [x] Card 1: "Agendamentos" → "Acompanhamento" com texto sobre agenda na palma da mão
- [x] Card 2: "Prontuários" → "Desenvolvimento" com texto sobre registro de especialistas
- [x] Card 3: "Pacientes" → "Inovação" com texto sobre segurança e web app sob medida

## Screenshots com Dados Mock (Temporário)
- [ ] Criar 5-8 pacientes mock com dados realistas
- [ ] Criar 10-15 agendamentos mock para próximos dias
- [ ] Criar registros de presença mock
- [ ] Criar prontuários mock com sessões
- [ ] Criar documentos mock
- [ ] Capturar screenshots desktop (1920x1080) de todas as telas
- [ ] Capturar screenshots mobile (375x812) de todas as telas
- [ ] Remover TODOS os dados mock criados
- [ ] Verificar que sistema voltou ao estado original

## Screenshots Mobile com Dados Mock
- [x] Recriar 7 pacientes mock temporários (Miguel, Sofia, Lucas, Isabella, Gabriel, Valentina, Heitor)
- [x] Recriar 7 agendamentos mock (3 hoje, 2 amanhã, 2 depois de amanhã)
- [x] Recriar 5 documentos mock (relatórios e laudos)
- [x] Criar usuário Lúcio Almeida (família) com dados completos do filho Miguel
- [x] Usuário capturou screenshots mobile pelo celular
- [x] Remover todos os dados mock (7 pacientes, agendamentos, documentos, sessões, presenças, usuário Lúcio)
- [x] Verificar que sistema voltou ao estado original (5 usuários, 1 paciente, 0 agendamentos)

## Guias de Uso em PDF
- [x] Criar guia para pais/responsáveis em Markdown (linguagem acessível, sem termos capacitistas)
- [x] Criar guia para terapeutas em Markdown (linguagem profissional e generalista)
- [x] Converter ambos os guias para PDF usando WeasyPrint
- [x] Entregar PDFs ao usuário (guia-pais.pdf 18KB, guia-terapeutas.pdf 19KB)

## Correção dos Guias em PDF
- [x] Remover assinatura "Desenvolvido por Manus AI" de ambos os guias
- [x] Capturar 4 screenshots das principais telas (Dashboard, Agenda, Documentos, Notificações)
- [x] Adicionar prints ao guia para pais com legendas explicativas
- [x] Regenerar ambos os PDFs (guia-pais.pdf 350KB com imagens, guia-terapeutas.pdf 16KB)
- [x] Entregar guias corrigidos

## Recapturar Screenshots com Perspectiva de Família
- [ ] Recriar usuário Lúcio Almeida (família) com dados mock
- [ ] Fazer login como pai/responsável
- [ ] Capturar screenshots da visão de família (Dashboard, Agenda, Documentos, Notificações)
- [ ] Atualizar guia-pais.md com screenshots corretos
- [ ] Regenerar guia-pais.pdf
- [ ] Remover dados mock
- [ ] Entregar guia corrigido


## Recapturar Screenshots com Perspectiva de Família
- [x] Recriar usuário Lúcio Almeida (família) e paciente Miguel com dados mock
- [x] Corrigir hash de senha do Lúcio para permitir login
- [x] Fazer login como Lúcio e capturar screenshots corretos
- [x] Capturar 4 screenshots: Dashboard, Agenda, Documentos, Notificações
- [x] Atualizar guia-pais.md com screenshots corretos (family-*.webp)
- [x] Regenerar guia-pais.pdf com screenshots da perspectiva de família
- [x] Remover dados mock (usuário Lúcio, paciente Miguel, agendamentos)
- [x] Verificar estado final (5 usuários, 1 paciente, 0 agendamentos)

## Adicionar Logo da Sapere no Guia para Pais
- [x] Localizar arquivo do logo da Sapere (logo-sapere.webp)
- [x] Copiar logo para pasta guia-screenshots
- [x] Adicionar logo no topo do guia-pais.md
- [x] Regenerar PDF com logo centralizado (200px)
- [x] Entregar PDF atualizado

## Transformar Registros de Sessão em Evoluções Privadas
- [ ] Renomear tabela sessionRecords para evolutions no schema
- [ ] Adicionar campo collaborationLevel (enum: full, partial, none) ao schema
- [ ] Executar migração do banco de dados
- [ ] Atualizar rotas backend (sessionRecords → evolutions)
- [ ] Restringir acesso às evoluções (apenas therapist e admin)
- [ ] Renomear no frontend: "Registros de Sessão" → "Evoluções"
- [ ] Remover evoluções do portal da família
- [ ] Garantir que documentos continuem visíveis para pais
- [ ] Adicionar formulário obrigatório ao finalizar sessão
- [ ] Implementar seleção de nível de colaboração (3 opções)
- [ ] Enviar notificação automática aos pais com nível de colaboração
- [ ] Testar fluxo completo (terapeuta finaliza → pais recebem notificação)
- [ ] Atualizar testes vitest

## Renomeação de Registros de Sessão para Evoluções
- [x] Renomear tabela sessionRecords para evolutions no schema
- [x] Adicionar campo obrigatório collaborationLevel (full, partial, none)
- [x] Atualizar backend (routers.ts e db.ts) para usar evolutions
- [x] Atualizar frontend (ProntuarioPage.tsx) para usar evolutions
- [x] Adicionar formulário obrigatório de nível de colaboração
- [x] Restringir acesso de famílias às evoluções (apenas terapeutas/admins)
- [x] Atualizar SessionTimer para incluir collaborationLevel
- [x] Corrigir todos os erros TypeScript relacionados
- [x] Criar segundo terapeuta para testes de conflito
- [x] Limpar agendamentos de teste do banco (ano 2030)
- [x] Executar e validar todos os 51 testes vitest
