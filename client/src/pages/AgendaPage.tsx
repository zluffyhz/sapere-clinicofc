import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Plus, Pencil, Trash2, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type AppointmentFormData = {
  patientId: number;
  therapistId: number;
  therapyType: "fonoaudiologia" | "psicologia" | "terapia_ocupacional" | "psicopedagogia" | "musicoterapia" | "fisioterapia" | "neuropsicopedagogia" | "nutricao" | "outro";
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status?: "scheduled" | "completed" | "cancelled" | "rescheduled";
};

export default function AgendaPage() {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedTherapistId, setSelectedTherapistId] = useState<number | null>(null);
  
  // Modal state for creating
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Modal state for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  
  // Delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: 0,
    therapistId: 0,
    therapyType: "psicologia",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "09:50",
    notes: "",
    status: "scheduled",
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

  // Create mutation
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado e adicionado ao calendário!");
      setIsCreateModalOpen(false);
      resetForm();
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar agendamento: ${error.message}`);
    },
  });

  // Update mutation
  const updateAppointmentMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Agendamento atualizado com sucesso!");
      setIsEditModalOpen(false);
      setEditingAppointmentId(null);
      resetForm();
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar agendamento: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteAppointmentMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingAppointmentId(null);
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir agendamento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      patientId: 0,
      therapistId: 0,
      therapyType: "psicologia",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "09:50",
      notes: "",
      status: "scheduled",
    });
  };

  const handleCreateAppointment = () => {
    if (!formData.patientId || !formData.therapistId) {
      toast.error("Selecione o paciente e o terapeuta.");
      return;
    }

    const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

    createAppointmentMutation.mutate({
      patientId: formData.patientId,
      therapistUserId: formData.therapistId || undefined,
      therapyType: formData.therapyType,
      startTime: startDateTime,
      endTime: endDateTime,
      notes: formData.notes || undefined,
    });
  };

  const handleEditAppointment = () => {
    if (!editingAppointmentId) return;

    const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

    updateAppointmentMutation.mutate({
      id: editingAppointmentId,
      therapyType: formData.therapyType,
      startTime: startDateTime,
      endTime: endDateTime,
      status: formData.status,
      notes: formData.notes || undefined,
    });
  };

  const openEditModal = (apt: any) => {
    setEditingAppointmentId(apt.id);
    setFormData({
      patientId: apt.patientId,
      therapistId: apt.therapistUserId,
      therapyType: apt.therapyType,
      date: format(new Date(apt.startTime), "yyyy-MM-dd"),
      startTime: format(new Date(apt.startTime), "HH:mm"),
      endTime: format(new Date(apt.endTime), "HH:mm"),
      notes: apt.notes || "",
      status: apt.status,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (aptId: number) => {
    setDeletingAppointmentId(aptId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAppointment = () => {
    if (deletingAppointmentId) {
      deleteAppointmentMutation.mutate({ id: deletingAppointmentId });
    }
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
    musicoterapia: "Musicoterapia",
    fisioterapia: "Fisioterapia",
    neuropsicopedagogia: "Neuropsicopedagogia",
    nutricao: "Nutrição",
    outro: "Outro",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendada",
    completed: "Concluída",
    cancelled: "Cancelada",
    rescheduled: "Remarcada",
  };

  // Cores por tipo de terapia
  const therapyTypeColors: Record<string, { bg: string; border: string; accent: string }> = {
    fonoaudiologia: { bg: "bg-purple-50", border: "border-purple-300", accent: "bg-purple-500" },
    psicologia: { bg: "bg-blue-50", border: "border-blue-300", accent: "bg-blue-500" },
    terapia_ocupacional: { bg: "bg-green-50", border: "border-green-300", accent: "bg-green-500" },
    psicopedagogia: { bg: "bg-orange-50", border: "border-orange-300", accent: "bg-orange-500" },
    musicoterapia: { bg: "bg-pink-50", border: "border-pink-300", accent: "bg-pink-500" },
    fisioterapia: { bg: "bg-teal-50", border: "border-teal-300", accent: "bg-teal-500" },
    neuropsicopedagogia: { bg: "bg-indigo-50", border: "border-indigo-300", accent: "bg-indigo-500" },
    nutricao: { bg: "bg-lime-50", border: "border-lime-300", accent: "bg-lime-600" },
    outro: { bg: "bg-gray-50", border: "border-gray-300", accent: "bg-gray-500" },
  };

  const isAdmin = user?.role === "admin";

  // Appointment Form Component (reused for create and edit)
  const AppointmentForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      {/* Patient Selection - disabled in edit mode */}
      <div className="grid gap-2">
        <Label htmlFor="patient">Paciente *</Label>
        <Select
          value={formData.patientId ? formData.patientId.toString() : ""}
          onValueChange={(value) =>
            setFormData({ ...formData, patientId: parseInt(value) })
          }
          disabled={isEdit}
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

      {/* Therapist Selection - disabled in edit mode */}
      {!isEdit && (
        <div className="grid gap-2">
          <Label htmlFor="therapist">Terapeuta *</Label>
          <Select
            value={formData.therapistId ? formData.therapistId.toString() : ""}
            onValueChange={(value) =>
              setFormData({ ...formData, therapistId: parseInt(value) })
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
      )}

      {/* Therapy Type */}
      <div className="grid gap-2">
        <Label htmlFor="therapyType">Tipo de Terapia *</Label>
        <Select
          value={formData.therapyType}
          onValueChange={(value: any) =>
            setFormData({ ...formData, therapyType: value })
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
            <SelectItem value="musicoterapia">Musicoterapia</SelectItem>
            <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
            <SelectItem value="neuropsicopedagogia">Neuropsicopedagogia</SelectItem>
            <SelectItem value="nutricao">Nutrição</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status - only in edit mode */}
      {isEdit && (
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Agendada</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
              <SelectItem value="rescheduled">Remarcada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date */}
      <div className="grid gap-2">
        <Label htmlFor="date">Data *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData({ ...formData, date: e.target.value })
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
            value={formData.startTime}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endTime">Horário Fim *</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) =>
              setFormData({ ...formData, endTime: e.target.value })
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
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
        />
      </div>
    </div>
  );

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
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
              setIsCreateModalOpen(open);
              if (!open) resetForm();
            }}>
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
                <AppointmentForm isEdit={false} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
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
                      setFormData({
                        ...formData,
                        date: format(selectedDate, "yyyy-MM-dd"),
                      });
                      setIsCreateModalOpen(true);
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
                      className={`p-4 rounded-lg border-l-4 transition-colors ${
                        therapyTypeColors[apt.therapyType]?.bg || "bg-gray-50"
                      } ${
                        therapyTypeColors[apt.therapyType]?.border || "border-gray-300"
                      } hover:shadow-md`}
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
                        
                        {/* Action Buttons - Admin Only */}
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditModal(apt)}
                              title="Editar agendamento"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openDeleteDialog(apt.id)}
                              className="text-destructive hover:text-destructive"
                              title="Excluir agendamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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
                <div 
                  key={type} 
                  className={`p-4 rounded-lg border-l-4 ${therapyTypeColors[type]?.bg || "bg-gray-50"} ${therapyTypeColors[type]?.border || "border-gray-300"}`}
                >
                  <p className="text-sm font-medium text-foreground">
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) {
          setEditingAppointmentId(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere os dados do agendamento.
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditAppointment}
              disabled={updateAppointmentMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateAppointmentMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAppointmentMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
