import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AgendaPage() {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedTherapistId, setSelectedTherapistId] = useState<number | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patientId: 0,
    therapistId: 0,
    therapyType: "psicologia" as "fonoaudiologia" | "psicologia" | "terapia_ocupacional" | "psicopedagogia" | "outro",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "09:50",
    notes: "",
  });

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

  const utils = trpc.useUtils();
  
  const { data: appointments, isLoading } = trpc.appointments.listByDateRange.useQuery({
    startDate,
    endDate,
  });

  const { data: patients } = trpc.patients.list.useQuery();
  const { data: therapists } = trpc.admin.listUsers.useQuery();

  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado e adicionado ao calendário!");
      setIsModalOpen(false);
      // Reset form
      setNewAppointment({
        patientId: 0,
        therapistId: 0,
        therapyType: "psicologia",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "09:50",
        notes: "",
      });
      // Invalidate and refetch appointments
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar agendamento: ${error.message}`);
    },
  });

  const handleCreateAppointment = () => {
    if (!newAppointment.patientId || !newAppointment.therapistId) {
      toast.error("Selecione o paciente e o terapeuta.");
      return;
    }

    const startDateTime = new Date(`${newAppointment.date}T${newAppointment.startTime}:00`);
    const endDateTime = new Date(`${newAppointment.date}T${newAppointment.endTime}:00`);

    createAppointmentMutation.mutate({
      patientId: newAppointment.patientId,
      therapyType: newAppointment.therapyType,
      startTime: startDateTime,
      endTime: endDateTime,
      notes: newAppointment.notes || undefined,
    });
  };

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((apt) => {
        const matchesDate = isSameDay(new Date(apt.startTime), selectedDate);
        const matchesTherapist = selectedTherapistId === null || apt.therapistUserId === selectedTherapistId;
        return matchesDate && matchesTherapist;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, selectedDate, selectedTherapistId]);

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
    neuropsicologia: "Neuropsicologia",
    outro: "Outro",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendada",
    completed: "Concluída",
    cancelled: "Cancelada",
    rescheduled: "Remarcada",
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-2">
            Visualize suas sessões de terapia agendadas
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* New Appointment Button - Admin Only */}
          {isAdmin && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para criar um novo agendamento.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Patient Selection */}
                  <div className="grid gap-2">
                    <Label htmlFor="patient">Paciente *</Label>
                    <Select
                      value={newAppointment.patientId ? newAppointment.patientId.toString() : ""}
                      onValueChange={(value) =>
                        setNewAppointment({ ...newAppointment, patientId: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Therapist Selection */}
                  <div className="grid gap-2">
                    <Label htmlFor="therapist">Terapeuta *</Label>
                    <Select
                      value={newAppointment.therapistId ? newAppointment.therapistId.toString() : ""}
                      onValueChange={(value) =>
                        setNewAppointment({ ...newAppointment, therapistId: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o terapeuta" />
                      </SelectTrigger>
                      <SelectContent>
                        {therapists
                          ?.filter((u) => u.role === "therapist" || u.role === "admin")
                          .map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id.toString()}>
                              {therapist.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Therapy Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="therapyType">Tipo de Terapia *</Label>
                    <Select
                      value={newAppointment.therapyType}
                      onValueChange={(value: any) =>
                        setNewAppointment({ ...newAppointment, therapyType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fonoaudiologia">Fonoaudiologia</SelectItem>
                        <SelectItem value="psicologia">Psicologia</SelectItem>
                        <SelectItem value="terapia_ocupacional">Terapia Ocupacional</SelectItem>
                        <SelectItem value="psicopedagogia">Psicopedagogia</SelectItem>
                        
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newAppointment.date}
                      onChange={(e) =>
                        setNewAppointment({ ...newAppointment, date: e.target.value })
                      }
                    />
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">Horário Início *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newAppointment.startTime}
                        onChange={(e) =>
                          setNewAppointment({ ...newAppointment, startTime: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime">Horário Fim *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newAppointment.endTime}
                        onChange={(e) =>
                          setNewAppointment({ ...newAppointment, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações adicionais (opcional)"
                      value={newAppointment.notes}
                      onChange={(e) =>
                        setNewAppointment({ ...newAppointment, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateAppointment}
                    disabled={createAppointmentMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {createAppointmentMutation.isPending ? "Salvando..." : "Salvar Agendamento"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Therapist Filter */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedTherapistId?.toString() || "all"}
              onValueChange={(value) =>
                setSelectedTherapistId(value === "all" ? null : parseInt(value))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os terapeutas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os terapeutas</SelectItem>
                {therapists
                  ?.filter((u) => u.role === "therapist")
                  .map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id.toString()}>
                      {therapist.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-6 w-px bg-border" />
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
                {isAdmin && (
                  <Button 
                    className="mt-4 bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setNewAppointment({
                        ...newAppointment,
                        date: format(selectedDate, "yyyy-MM-dd"),
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar para este dia
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateAppointments.map((apt) => {
                  const patient = patients?.find((p) => p.id === apt.patientId);
                  const therapist = therapists?.find((t) => t.id === apt.therapistUserId);
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
                          {therapist && (
                            <p className="text-sm text-muted-foreground">
                              Terapeuta: {therapist.name}
                            </p>
                          )}
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
