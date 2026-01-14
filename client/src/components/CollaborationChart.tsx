import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CollaborationData {
  id: number;
  patientId: number;
  sessionDate: Date;
  collaborationLevel: "full" | "partial" | "none";
  patientName: string;
}

interface CollaborationChartProps {
  data: CollaborationData[];
  patients: Array<{ id: number; name: string }>;
  selectedPatientId?: number;
  selectedDays: number;
  onPatientChange: (patientId: number | undefined) => void;
  onDaysChange: (days: number) => void;
}

export function CollaborationChart({ 
  data, 
  patients,
  selectedPatientId,
  selectedDays,
  onPatientChange,
  onDaysChange 
}: CollaborationChartProps) {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Colaboração</CardTitle>
              <CardDescription>Evolução do nível de colaboração</CardDescription>
            </div>
            <div className="flex gap-2">
              {patients.length > 1 && (
                <Select
                  value={selectedPatientId?.toString() || "all"}
                  onValueChange={(value) => onPatientChange(value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos os pacientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pacientes</SelectItem>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={selectedDays.toString()}
                onValueChange={(value) => onDaysChange(parseInt(value))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma sessão registrada no período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Histórico de Colaboração</CardTitle>
            <CardDescription>
              Evolução do nível de colaboração nos últimos {selectedDays} dias
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {patients.length > 1 && (
              <Select
                value={selectedPatientId?.toString() || "all"}
                onValueChange={(value) => onPatientChange(value === "all" ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os pacientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pacientes</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={selectedDays.toString()}
              onValueChange={(value) => onDaysChange(parseInt(value))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
