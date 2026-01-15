import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CollaborationDataPoint {
  id: number;
  patientId: number;
  patientName: string;
  sessionDate: Date;
  collaborationLevel: 'full' | 'partial' | 'none';
}

interface CollaborationChartProps {
  data: CollaborationDataPoint[];
  patients: Array<{ id: number; name: string }>;
  selectedPatientId: number | undefined;
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
  onDaysChange,
}: CollaborationChartProps) {
  // Transform data for chart
  const chartData = data.map(item => ({
    date: new Date(item.sessionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    colaboração: item.collaborationLevel === 'full' ? 3 : item.collaborationLevel === 'partial' ? 2 : 1,
    paciente: item.patientName,
  })).reverse(); // Reverse to show oldest first

  const collaborationColors = {
    full: '#10b981', // green
    partial: '#f59e0b', // yellow/orange
    none: '#ef4444', // red
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Histórico de Colaboração</h3>
          <div className="flex gap-4">
            <Select
              value={selectedPatientId?.toString() || 'all'}
              onValueChange={(value) => onPatientChange(value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os pacientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pacientes</SelectItem>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDays.toString()}
              onValueChange={(value) => onDaysChange(parseInt(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
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

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma evolução registrada no período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis 
                domain={[0, 3.5]}
                ticks={[1, 2, 3]}
                tickFormatter={(value) => {
                  if (value === 3) return 'Total';
                  if (value === 2) return 'Parcial';
                  if (value === 1) return 'Nenhuma';
                  return '';
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const level = payload[0].value === 3 ? 'Colaborou totalmente' : 
                                 payload[0].value === 2 ? 'Colaborou parcialmente' : 
                                 'Não colaborou';
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-semibold">{payload[0].payload.date}</p>
                        <p className="text-sm">{payload[0].payload.paciente}</p>
                        <p className="text-sm">{level}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                formatter={() => 'Nível de Colaboração'}
              />
              <Line 
                type="monotone" 
                dataKey="colaboração" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: collaborationColors.full }} />
            <span>Colaborou totalmente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: collaborationColors.partial }} />
            <span>Colaborou parcialmente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: collaborationColors.none }} />
            <span>Não colaborou</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
