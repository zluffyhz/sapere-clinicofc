import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AgendaPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Calculate date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === "week") {
      return {
        startDate: startOfWeek(selectedDate, { locale: ptBR }),
        endDate: endOfWeek(selectedDate, { locale: ptBR }),
      };
    } else {
      return {
        startDate: startOfMonth(selectedDate),
        endDate: endOfMonth(selectedDate),
      };
    }
  }, [selectedDate, viewMode]);

  const { data: appointments, isLoading } = trpc.appointments.listByDateRange.useQuery({
    startDate,
    endDate,
  });

  const { data: patients } = trpc.patients.list.useQuery();

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((apt) => isSameDay(new Date(apt.startTime), selectedDate))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, selectedDate]);

  // Get dates with appointments for calendar highlighting
  const datesWithAppointments = useMemo(() => {
    if (!appointments) return new Set<string>();
    return new Set(
      appointments.map((apt) => format(new Date(apt.startTime), "yyyy-MM-dd"))
    );
  }, [appointments]);

  const therapyTypeLabels: Record<string, string> = {
    fonoaudiologia: "Fonoaudiologia",
    psicologia: "Psicologia",
    terapia_ocupacional: "Terapia Ocupacional",
    psicopedagogia: "Psicopedagogia",
    outro: "Outro",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendada",
    completed: "Concluída",
    cancelled: "Cancelada",
    rescheduled: "Remarcada",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-2">
            Visualize suas sessões de terapia agendadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
          >
            Mês
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => setViewMode("week")}
          >
            Semana
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Calendário</CardTitle>
            <CardDescription>Selecione uma data para ver os agendamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
              modifiers={{
                hasAppointment: (date) =>
                  datesWithAppointments.has(format(date, "yyyy-MM-dd")),
              }}
              modifiersStyles={{
                hasAppointment: {
                  fontWeight: "bold",
                  textDecoration: "underline",
                  textDecorationColor: "oklch(0.65 0.18 50)",
                },
              }}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Datas sublinhadas possuem agendamentos</p>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <CardDescription>
                  {selectedDateAppointments.length} sessão(ões) agendada(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando agendamentos...
              </div>
            ) : selectedDateAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma sessão agendada para esta data
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateAppointments.map((apt) => {
                  const patient = patients?.find((p) => p.id === apt.patientId);
                  return (
                    <div
                      key={apt.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {therapyTypeLabels[apt.therapyType] || apt.therapyType}
                            </h3>
                            <Badge
                              variant={
                                apt.status === "scheduled"
                                  ? "default"
                                  : apt.status === "completed"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {statusLabels[apt.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Paciente: {patient?.name || "Não identificado"}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {format(new Date(apt.startTime), "HH:mm")} -{" "}
                              {format(new Date(apt.endTime), "HH:mm")}
                            </span>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Observações: {apt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary by Therapy Type */}
      {appointments && appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
            <CardDescription>
              {format(startDate, "dd/MM", { locale: ptBR })} -{" "}
              {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {Object.entries(
                appointments.reduce((acc, apt) => {
                  acc[apt.therapyType] = (acc[apt.therapyType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="p-4 rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">
                    {therapyTypeLabels[type] || type}
                  </p>
                  <p className="text-2xl font-bold mt-2">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">sessões</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
