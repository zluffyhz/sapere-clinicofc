# Sistema de Notificações para Evoluções Incompletas

**Data:** 10 de fevereiro de 2026  
**Objetivo:** Alertar terapeutas sobre evoluções com campos não preenchidos, enviando notificações diárias até completarem o preenchimento.

---

## Requisitos Validados

1. **Campos Obrigatórios:** Todos os 6 campos da evolução devem estar preenchidos para considerar completa:
   - `sessionSummary` (Resumo da Sessão)
   - `patientMood` (Humor do Paciente)
   - `patientBehavior` (Atividades Realizadas)
   - `goalsAchieved` (Notas de Progresso)
   - `nextSessionPlan` (Objetivos para Próxima Sessão)
   - `collaborationLevel` (Nível de Colaboração)

2. **Timing de Notificações:** Sistema envia notificações diariamente às 8h da manhã para evoluções incompletas criadas há mais de 24h.

3. **Interface:** 
   - Integração com sino de notificações existente no header
   - Badge de alerta discreto na página de Prontuários
   - Design limpo e não-intrusivo

4. **Comportamento:** Notificação desaparece imediatamente ao completar todos os campos da evolução.

---

## Arquitetura

### Backend

**1. Tabela de Notificações**
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  evolutionId INT,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (evolutionId) REFERENCES evolutions(id)
);
```

**2. Função de Validação de Completude**
```typescript
function isEvolutionComplete(evolution: Evolution): boolean {
  return !!(
    evolution.sessionSummary?.trim() &&
    evolution.patientMood?.trim() &&
    evolution.patientBehavior?.trim() &&
    evolution.goalsAchieved?.trim() &&
    evolution.nextSessionPlan?.trim() &&
    evolution.collaborationLevel
  );
}
```

**3. Job Agendado (Cron)**
- Endpoint: `/api/cron/check-incomplete-evolutions`
- Frequência: Diariamente às 8h (0 0 8 * * *)
- Lógica:
  1. Buscar evoluções criadas há mais de 24h que estão incompletas
  2. Para cada evolução, verificar se já existe notificação não-lida
  3. Se não existir, criar notificação para a terapeuta criadora
  4. Usar API de notificações do Manus (já integrada)

**4. tRPC Procedures**
- `notifications.getMyNotifications` - lista notificações da terapeuta logada
- `notifications.markAsRead` - marca notificação como lida
- `notifications.getIncompleteEvolutionsCount` - conta evoluções incompletas
- `evolutions.update` - ao salvar, valida completude e marca notificação como lida se completa

---

## Frontend

### Componentes

**1. Sistema de Notificações Existente (Header)**
- Aproveitar sino existente no header
- Adicionar notificações de evoluções incompletas ao dropdown
- Formato: "⚠️ Evolução incompleta: [Nome do Paciente] - Sessão de [Data]"
- Ao clicar: navegar para prontuário do paciente

**2. Badge na Página de Prontuários**
- Adicionar badge laranja/amarelo (⚠️) ao lado do botão "Ver Prontuário"
- Tooltip: "Evolução incompleta pendente"
- Visível apenas para prontuários com evoluções incompletas da terapeuta logada

**3. Atualização em Tempo Real**
- Ao salvar evolução completa, atualizar UI imediatamente:
  - Remover badge do prontuário
  - Marcar notificação como lida
  - Atualizar contador do sino

---

## Fluxo de Dados

### Criação de Notificação (Cron Job - 8h)
```
1. Cron executa às 8h
2. Backend busca evoluções incompletas (>24h)
3. Para cada evolução:
   - Verifica se já existe notificação não-lida
   - Se não: cria notificação via API Manus
4. Frontend recebe notificações via tRPC query
```

### Completar Evolução (Terapeuta)
```
1. Terapeuta edita evolução e preenche todos campos
2. Ao salvar, backend valida completude
3. Se completa:
   - Marca notificação relacionada como lida
   - Retorna flag isComplete: true
4. Frontend atualiza UI (remove badges)
```

---

## Implementação

### Fase 1: Backend
1. Adicionar tabela `notifications` ao schema Drizzle
2. Criar função `isEvolutionComplete()`
3. Implementar tRPC procedures de notificações
4. Criar endpoint de cron `/api/cron/check-incomplete-evolutions`
5. Integrar validação de completude ao salvar evolução

### Fase 2: Frontend
1. Adicionar query de notificações ao header existente
2. Implementar badge de alerta na página de Prontuários
3. Adicionar lógica de remoção automática ao completar evolução
4. Testar fluxo completo

### Fase 3: Testes
1. Criar evolução incompleta e verificar notificação no dia seguinte
2. Completar evolução e verificar remoção imediata de alertas
3. Testar múltiplas evoluções incompletas
4. Validar que notificações não duplicam

---

## Considerações de Design

- **Não-intrusivo:** Alertas discretos que não comprometem o design limpo
- **Acionável:** Cada notificação leva direto ao prontuário relevante
- **Automático:** Sistema gerencia completude sem intervenção manual
- **Persistente:** Notificações continuam até resolução do problema
- **Integrado:** Usa infraestrutura existente (sino, API Manus)
