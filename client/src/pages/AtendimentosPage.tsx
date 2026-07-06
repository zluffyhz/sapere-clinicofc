import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  User,
  FileDown,
  Filter,
} from "lucide-react";

const therapyTypeLabels: Record<string, string> = {
  fonoaudiologia: "Fonoaudiologia",
  psicologia: "Psicologia",
  terapia_ocupacional: "Terapia Ocupacional",
  psicopedagogia: "Psicopedagogia",
  musicoterapia: "Musicoterapia",
  fisioterapia: "Fisioterapia",
  neuropsicopedagogia: "Neuropsicopedagogia",
  nutricao: "Nutrição",
  psicomotricidade: "Psicomotricidade",
  aplicadora_denver_aba: "Aplicadora Denver/ABA",
  assistente_terapeutico: "Assistente Terapêutico",
  outro: "Outro",
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDayOfWeek(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { weekday: "short" });
}

export default function AtendimentosPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      let url = `/api/atendimentos/relatorio-pdf?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedTherapistId !== "all") {
        url += `&therapistId=${selectedTherapistId}`;
      }
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Erro ao gerar PDF. Tente novamente.");
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `relatorio-atendimentos-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert("Erro ao gerar PDF. Verifique sua conexão e tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const { data: atendimentos, isLoading } = trpc.analytics.atendimentosMensal.useQuery({
    month: selectedMonth,
    year: selectedYear,
  }, {
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Agrupar por terapeuta (todos os dados)
  const groupedByTherapist = useMemo(() => {
    if (!atendimentos?.records) return [];

    const groups: Record<number, {
      therapistId: number;
      therapistName: string;
      records: typeof atendimentos.records;
      total: number;
      byTherapyType: Record<string, number>;
    }> = {};

    for (const record of atendimentos.records) {
      if (!groups[record.therapistUserId]) {
        groups[record.therapistUserId] = {
          therapistId: record.therapistUserId,
          therapistName: record.therapistName,
          records: [],
          total: 0,
          byTherapyType: {},
        };
      }
      groups[record.therapistUserId].records.push(record);
      groups[record.therapistUserId].total++;
      const tType = record.therapyType;
      groups[record.therapistUserId].byTherapyType[tType] = (groups[record.therapistUserId].byTherapyType[tType] || 0) + 1;
    }

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [atendimentos]);

  // Filtrar por terapeuta selecionado
  const filteredGroups = useMemo(() => {
    if (selectedTherapistId === "all") return groupedByTherapist;
    return groupedByTherapist.filter(g => String(g.therapistId) === selectedTherapistId);
  }, [groupedByTherapist, selectedTherapistId]);

  // Calcular totais baseados no filtro
  const filteredTotalAtendimentos = useMemo(() => {
    return filteredGroups.reduce((sum, g) => sum + g.total, 0);
  }, [filteredGroups]);

  const totalTerapeutas = groupedByTherapist.length;

  // Opções de terapeutas para o filtro (ordem alfabética)
  const therapistOptions = useMemo(() => {
    const sorted = [...groupedByTherapist].sort((a, b) =>
      a.therapistName.localeCompare(b.therapistName, 'pt-BR', { sensitivity: 'base' })
    );
    const options: { value: string; label: string }[] = [
      { value: "all", label: "Todos os terapeutas" },
    ];
    for (const group of sorted) {
      options.push({
        value: String(group.therapistId),
        label: `${group.therapistName} (${group.total})`,
      });
    }
    return options;
  }, [groupedByTherapist]);

  // Meses disponíveis (a partir de maio 2026)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const startYear = 2026;
    const startMonth = 5; // Maio
    const now = new Date();
    
    let year = startYear;
    let month = startMonth;
    
    while (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1)) {
      const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long" });
      options.push({
        value: `${year}-${month}`,
        label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
      });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    return options;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análise de Atendimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quantificação de atendimentos realizados por terapeuta (baseado em evoluções registradas)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <NativeSelect
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-");
              setSelectedYear(parseInt(y));
              setSelectedMonth(parseInt(m));
            }}
            className="w-[180px]"
            options={monthOptions}
          />
          <Button
            onClick={handleExportPDF}
            disabled={isExporting || filteredTotalAtendimentos === 0}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 bg-white border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <FileDown className="h-4 w-4" />
            {isExporting ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* Filtro por Terapeuta */}
      {groupedByTherapist.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
          <Filter className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          <NativeSelect
            value={selectedTherapistId}
            onChange={(e) => setSelectedTherapistId(e.target.value)}
            className="w-[260px]"
            options={therapistOptions}
          />
          {selectedTherapistId !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTherapistId("all")}
              className="text-xs text-orange-600 hover:text-orange-800"
            >
              Limpar filtro
            </Button>
          )}
        </div>
      )}

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedTherapistId === "all" ? "Total de Atendimentos" : "Atendimentos do Terapeuta"}
            </CardTitle>
            <ClipboardCheck className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "..." : filteredTotalAtendimentos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTherapistId === "all" ? "Evoluções registradas no mês" : "Evoluções deste terapeuta"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Terapeutas Ativos</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "..." : totalTerapeutas}</div>
            <p className="text-xs text-muted-foreground mt-1">Com atendimentos no mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média por Terapeuta</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "..." : totalTerapeutas > 0 ? Math.round((atendimentos?.totalCount ?? 0) / totalTerapeutas) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Atendimentos/terapeuta</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Agrupada por Terapeuta */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum atendimento registrado neste mês.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os atendimentos são contabilizados quando o terapeuta registra a evolução do paciente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <Card key={group.therapistId}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.therapistName}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(group.byTherapyType).map(([type, count]) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {therapyTypeLabels[type] || type}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-orange-600">{group.total}</span>
                    <span className="text-sm text-muted-foreground">atendimentos</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Data</th>
                        <th className="pb-2 font-medium text-muted-foreground">Dia</th>
                        <th className="pb-2 font-medium text-muted-foreground">Horário</th>
                        <th className="pb-2 font-medium text-muted-foreground">Paciente</th>
                        <th className="pb-2 font-medium text-muted-foreground">Terapia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.records.map((record: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(record.sessionDate)}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 capitalize text-muted-foreground">
                            {formatDayOfWeek(record.sessionDate)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatTime(record.sessionDate)}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 font-medium">{record.patientName}</td>
                          <td className="py-2.5">
                            <Badge variant="outline" className="text-xs">
                              {therapyTypeLabels[record.therapyType] || record.therapyType}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
