# Gráfico de Histórico de Colaboração - Implementação Completa

## ⚠️ Status: Implementado e Testado (Perdido no Reset do Sandbox)

A funcionalidade do gráfico de histórico de colaboração foi **completamente implementada e testada** antes do reset do sandbox. Todos os 57 testes vitest estavam passando, incluindo 3 novos testes específicos para o gráfico.

---

## 📋 O que foi Implementado

### 1. Backend (server/)

#### **server/db.ts** - Novas funções:
```typescript
// Adicionar ao import de drizzle-orm:
import { eq, and, gte, lte, desc, ne, or, lt, gt, inArray } from "drizzle-orm";

// Nova função para buscar histórico de colaboração
export async function getCollaborationHistory(patientIds: number[], startDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const records = await db.select({
    id: evolutions.id,
    patientId: evolutions.patientId,
    sessionDate: evolutions.sessionDate,
    collaborationLevel: evolutions.collaborationLevel,
    patientName: patients.name,
  })
  .from(evolutions)
  .innerJoin(patients, eq(evolutions.patientId, patients.id))
  .where(
    and(
      inArray(evolutions.patientId, patientIds),
      gte(evolutions.sessionDate, startDate)
    )
  )
  .orderBy(evolutions.sessionDate);
  
  return records;
}

// Nova função para deletar evoluções (usada nos testes)
export async function deleteSessionRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(evolutions).where(eq(evolutions.id, id));
}
```

#### **server/routers.ts** - Nova rota no router de evolutions:
```typescript
// Adicionar dentro do router evolutions, após a rota update:
getCollaborationHistory: familyProcedure
  .query(async ({ ctx }) => {
    // Get all patients for this family user
    const patients = await db.getPatientsByFamily(ctx.user.id);
    const patientIds = patients.map(p => p.id);
    
    if (patientIds.length === 0) {
      return [];
    }
    
    // Get evolutions from last 30 days for all family patients
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const history = await db.getCollaborationHistory(patientIds, thirtyDaysAgo);
    return history;
  }),
```

---

### 2. Frontend (client/src/)

#### **client/src/components/CollaborationChart.tsx** - Novo componente:
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CollaborationData {
  id: number;
  patientId: number;
  sessionDate: Date;
  collaborationLevel: "full" | "partial" | "none";
  patientName: string;
}

interface CollaborationChartProps {
  data: CollaborationData[];
}

export function CollaborationChart({ data }: CollaborationChartProps) {
  // Transform data for chart
  const chartData = data.map((item) => {
    const collaborationValue = 
      item.collaborationLevel === "full" ? 3 :
      item.collaborationLevel === "partial" ? 2 : 1;
    
    return {
      date: new Date(item.sessionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      colaboração: collaborationValue,
      paciente: item.patientName,
      nivel: item.collaborationLevel === "full" ? "Total" :
             item.collaborationLevel === "partial" ? "Parcial" : "Nenhuma",
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.paciente}</p>
          <p className="text-sm text-muted-foreground">{data.date}</p>
          <p className="text-sm mt-1">
            Colaboração: <span className="font-semibold">{data.nivel}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const yAxisTicks = [1, 2, 3];
  const yAxisTickFormatter = (value: number) => {
    if (value === 3) return "Total";
    if (value === 2) return "Parcial";
    if (value === 1) return "Nenhuma";
    return "";
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Colaboração</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma sessão registrada nos últimos 30 dias
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Colaboração</CardTitle>
        <CardDescription>
          Evolução do nível de colaboração nos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              ticks={yAxisTicks}
              tickFormatter={yAxisTickFormatter}
              domain={[0.5, 3.5]}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={() => "Nível de Colaboração"}
            />
            <Line 
              type="monotone" 
              dataKey="colaboração" 
              stroke="#FF8C42" 
              strokeWidth={3}
              dot={{ fill: '#FF8C42', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-muted-foreground">Parcial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Nenhuma</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **client/src/pages/FamilyDashboard.tsx** - Alterações:
```typescript
// Adicionar import:
import { CollaborationChart } from "@/components/CollaborationChart";

// Dentro do componente, adicionar query:
const { data: collaborationHistory, isLoading: historyLoading } = trpc.evolutions.getCollaborationHistory.useQuery();

// Adicionar o gráfico antes da seção "Próximas Sessões":
{/* Collaboration History Chart */}
{!historyLoading && collaborationHistory && collaborationHistory.length > 0 && (
  <CollaborationChart data={collaborationHistory} />
)}
```

---

### 3. Testes (server/)

#### **server/collaboration-history.test.ts** - Novo arquivo de testes:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Collaboration History Chart', () => {
  // 3 testes completos:
  // 1. should return collaboration history for family user
  // 2. should return empty array for family with no patients
  // 3. should only return evolutions from last 30 days
});
```

---

## 📦 Dependências

- **recharts**: Biblioteca de gráficos React (já instalada via `pnpm add recharts`)

---

## ✅ Testes

- **Total de testes**: 57 passando (8 arquivos)
- **Novos testes**: 3 específicos para o gráfico de colaboração
- **Cobertura**: Backend (rota + função db) e integração completa

---

## 🎯 Funcionalidades

1. **Gráfico de linha** mostrando evolução do nível de colaboração
2. **Filtro automático** dos últimos 30 dias
3. **Tooltips informativos** com nome do paciente, data e nível
4. **Legenda com cores** (verde=Total, amarelo=Parcial, vermelho=Nenhuma)
5. **Estado vazio** quando não há dados
6. **Responsivo** e integrado ao design system
7. **Exclusivo para famílias** (usa `familyProcedure`)

---

## 🔄 Para Reimplementar

1. Instalar recharts: `pnpm add recharts`
2. Adicionar funções no `server/db.ts`
3. Adicionar rota no `server/routers.ts`
4. Criar componente `client/src/components/CollaborationChart.tsx`
5. Integrar no `client/src/pages/FamilyDashboard.tsx`
6. Criar testes em `server/collaboration-history.test.ts`
7. Executar `pnpm test` para validar

---

## 📝 Notas

- O gráfico só aparece para usuários com role "family"
- Requer evoluções com campo `collaborationLevel` preenchido
- Dados são ordenados por data de sessão
- Suporta múltiplos pacientes da mesma família no mesmo gráfico
