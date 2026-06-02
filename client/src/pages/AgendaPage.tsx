import { useState, useMemo, useEffect } from "react";
import { PatientSearchInput } from "@/components/PatientSearchInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRT, parseBRTDateTime, getBRTDateString, getBRTTimeString, isSameDayBRT, CLINIC_TIMEZONE } from "@/lib/timezone";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Plus, Pencil, Trash2, X, Repeat, UserPlus, Search, Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  therapyType: "fonoaudiologia" | "psicologia" | "terapia_ocupacional" | "psicopedagogia" | "musicoterapia" | "fisioterapia" | "neuropsicopedagogia" | "nutricao" | "psicomotricidade" | "aplicadora_denver_aba" | "outro";
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status?: "scheduled" | "completed" | "cancelled" | "rescheduled";
  replicateWeekly?: boolean;
  isJointSession?: boolean;
  coTherapistIds?: number[];
  alsoLinkTherapist?: boolean;
};

export default function AgendaPage() {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedTherapistId, setSelectedTherapistId] = useState<number | null>(null);
  const [showMyPatientsOnly, setShowMyPatientsOnly] = useState(true); // Padrão: mostrar apenas meus pacientes
  
  // Modal state for creating
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Modal state for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  
  // Delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<number | null>(null);
  
  // Cancel confirmation dialog
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState<any | null>(null);
  const [cancelSeriesMode, setCancelSeriesMode] = useState<"single" | "all">("single");
  
  // Series edit/delete state
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [editSeriesMode, setEditSeriesMode] = useState<"single" | "all">("single");
  const [deleteSeriesMode, setDeleteSeriesMode] = useState<"single" | "all">("single");

  // Co-therapists state
  const [coTherapistSearch, setCoTherapistSearch] = useState("");

  // Dual session state
  const [isDualSession, setIsDualSession] = useState(false);
  const [secondPatientId, setSecondPatientId] = useState<number>(0);
  // dualPatientSearch removed - PatientSearchInput now uses value:number (controlled by secondPatientId)

  // Primary patient search state for appointment form
  // primaryPatientSearch removed - PatientSearchInput now uses value:number (controlled by formData.patientId)
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: 0,
    therapistId: 0,
    therapyType: "psicologia",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "09:50",
    notes: "",
    status: "scheduled",
    replicateWeekly: false,
    isJointSession: false,
    coTherapistIds: [],
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
    showAllPatients: user?.role === 'therapist' ? !showMyPatientsOnly : undefined,
  });

  const { data: patients } = trpc.patients.list.useQuery();
  const { data: therapists } = trpc.admin.listUsers.useQuery();

  // Sync co-therapists mutation — invalidate AFTER sync completes so co-therapists are already in DB
  const syncCoTherapistsMutation = trpc.appointments.syncCoTherapists.useMutation({
    onSuccess: () => {
      utils.appointments.listByDateRange.invalidate();
    },
  });

  // Create mutation
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: (data) => {
      if (data.replicatedCount && data.replicatedCount > 0) {
        toast.success(`Agendamento criado com sucesso! ${data.replicatedCount} agendamentos adicionais foram replicados para as próximas ${data.replicatedCount} semanas.`);
      } else {
        toast.success("Agendamento criado e adicionado ao calendário!");
      }
      setIsCreateModalOpen(false);
      // Sync co-therapists if joint session — invalidation happens in syncCoTherapistsMutation.onSuccess
      if (formData.isJointSession && formData.coTherapistIds && formData.coTherapistIds.length > 0) {
        syncCoTherapistsMutation.mutate({
          appointmentId: data.id,
          therapistUserIds: formData.coTherapistIds,
          isJointSession: true,
        });
      } else {
        // No co-therapists to sync, invalidate immediately
        utils.appointments.listByDateRange.invalidate();
      }
      resetForm();
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
      setEditingSeriesId(null);
      resetForm();
      // Invalidation is handled by syncCoTherapistsMutation.onSuccess when there are co-therapists
      // For non-joint sessions, invalidate immediately
      if (!formData.isJointSession) {
        utils.appointments.listByDateRange.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar agendamento: ${error.message}`);
    },
  });
  
  // Update series mutation
  const updateSeriesMutation = trpc.appointments.updateSeries.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} agendamentos da série atualizados com sucesso!`);
      setIsEditModalOpen(false);
      setEditingAppointmentId(null);
      setEditingSeriesId(null);
      resetForm();
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar série: ${error.message}`);
    },
  });
  
  // Cancel series mutation
  const cancelSeriesMutation = trpc.appointments.cancelSeries.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.cancelledCount} agendamentos da série cancelados com sucesso!`);
      setIsDeleteDialogOpen(false);
      setDeletingAppointmentId(null);
      setEditingSeriesId(null);
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar série: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteAppointmentMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingAppointmentId(null);
      setEditingSeriesId(null);
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir agendamento: ${error.message}`);
    },
  });

  // Reactivate (un-cancel) mutation
  const reactivateAppointmentMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Agendamento reativado com sucesso!");
      utils.appointments.listByDateRange.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao reativar agendamento: ${error.message}`);
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
      isJointSession: false,
      coTherapistIds: [],
    });
    setCoTherapistSearch("");
    setIsDualSession(false);
    setSecondPatientId(0);
    // search strings removed - PatientSearchInput is now ID-controlled
  };

  // Create dual session mutation
  const createDualMutation = trpc.appointments.createDual.useMutation({
    onSuccess: () => {
      toast.success("Atendimento em dupla criado com sucesso!");
      setIsCreateModalOpen(false);
      utils.appointments.listByDateRange.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar atendimento em dupla: ${error.message}`);
    },
  });

  const handleCreateAppointment = () => {
    if (!formData.patientId || !formData.therapistId) {
      toast.error("Selecione o paciente e o terapeuta.");
      return;
    }

    // Interpreta os horários digitados como horário de Brasília (America/Sao_Paulo)
    const startDateTime = parseBRTDateTime(formData.date, formData.startTime);
    const endDateTime = parseBRTDateTime(formData.date, formData.endTime);

    // If dual session, use createDual mutation
    if (isDualSession) {
      if (!secondPatientId) {
        toast.error("Selecione o segundo paciente para o atendimento em dupla.");
        return;
      }
      if (secondPatientId === formData.patientId) {
        toast.error("O segundo paciente deve ser diferente do primeiro.");
        return;
      }
      createDualMutation.mutate({
        patientId: formData.patientId,
        therapistUserId: formData.therapistId || undefined,
        therapyType: formData.therapyType,
        startTime: startDateTime,
        endTime: endDateTime,
        notes: formData.notes || undefined,
        secondPatientId,
      });
      return;
    }

    createAppointmentMutation.mutate({
      patientId: formData.patientId,
      therapistUserId: formData.therapistId || undefined,
      therapyType: formData.therapyType,
      startTime: startDateTime,
      endTime: endDateTime,
      notes: formData.notes || undefined,
      replicateWeekly: formData.replicateWeekly || false,
      alsoLinkTherapist: formData.alsoLinkTherapist || false,
    });
  };

  const handleEditAppointment = () => {
    if (!editingAppointmentId) return;

    // Interpreta os horários digitados como horário de Brasília (America/Sao_Paulo)
    const startDateTime = parseBRTDateTime(formData.date, formData.startTime);
    const endDateTime = parseBRTDateTime(formData.date, formData.endTime);

    // Sync co-therapists
    syncCoTherapistsMutation.mutate({
      appointmentId: editingAppointmentId,
      therapistUserIds: formData.isJointSession ? (formData.coTherapistIds || []) : [],
      isJointSession: formData.isJointSession || false,
    });

    // If editing all in series, use updateSeries mutation
    // NOTE: status is intentionally NOT sent to updateSeries.
    // Cancelling a series must use the dedicated cancel flow (Ban button).
    if (editSeriesMode === "all" && editingSeriesId) {
      updateSeriesMutation.mutate({
        seriesId: editingSeriesId,
        therapyType: formData.therapyType,
        notes: formData.notes || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
      });
    } else {
      // Edit only this appointment
      updateAppointmentMutation.mutate({
        id: editingAppointmentId,
        therapyType: formData.therapyType,
        startTime: startDateTime,
        endTime: endDateTime,
        status: formData.status,
        notes: formData.notes || undefined,
      });
    }
  };

  const openEditModal = async (apt: any) => {
    setEditingAppointmentId(apt.id);
    setEditingSeriesId(apt.seriesId || null);
    setEditSeriesMode("single"); // reset to single every time modal opens
    // Load existing co-therapists
    let coTherapistIds: number[] = [];
    try {
      const coTherapists = await utils.appointments.getCoTherapists.fetch({ appointmentId: apt.id });
      coTherapistIds = coTherapists.map((ct: any) => ct.therapistUserId);
    } catch {}
    setFormData({
      patientId: apt.patientId,
      therapistId: apt.therapistUserId,
      therapyType: apt.therapyType,
      date: getBRTDateString(apt.startTime),
      startTime: getBRTTimeString(apt.startTime),
      endTime: getBRTTimeString(apt.endTime),
      notes: apt.notes || "",
      status: apt.status,
      isJointSession: apt.isJointSession || coTherapistIds.length > 0,
      coTherapistIds,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (apt: any) => {
    setDeletingAppointmentId(apt.id);
    setEditingSeriesId(apt.seriesId || null);
    setDeleteSeriesMode("single"); // reset to single every time dialog opens
    setIsDeleteDialogOpen(true);
  };

  const openCancelDialog = (apt: any) => {
    setCancellingAppointment(apt);
    setCancelSeriesMode("single"); // always reset to single when opening
    setIsCancelDialogOpen(true);
  };

  const handleCancelAppointment = () => {
    if (!cancellingAppointment) return;
    
    // If series mode "all" and appointment belongs to a series, cancel the whole series
    if (cancelSeriesMode === "all" && cancellingAppointment.seriesId) {
      cancelSeriesMutation.mutate(
        { seriesId: cancellingAppointment.seriesId },
        {
          onSuccess: (data) => {
            setIsCancelDialogOpen(false);
            setCancellingAppointment(null);
            toast.success(`${data.cancelledCount} agendamentos da série cancelados.`);
          },
          onError: (err) => {
            toast.error(`Erro ao cancelar série: ${err.message}`);
          },
        }
      );
    } else {
      // Cancel only this single appointment
      updateAppointmentMutation.mutate(
        { id: cancellingAppointment.id, status: "cancelled" },
        {
          onSuccess: () => {
            setIsCancelDialogOpen(false);
            setCancellingAppointment(null);
            toast.success("Atendimento marcado como cancelado.");
          },
          onError: (err) => {
            toast.error(`Erro ao cancelar: ${err.message}`);
          },
        }
      );
    }
  };

  const handleDeleteAppointment = () => {
    if (deleteSeriesMode === "all" && editingSeriesId) {
      cancelSeriesMutation.mutate({ seriesId: editingSeriesId });
    } else if (deletingAppointmentId) {
      deleteAppointmentMutation.mutate({ id: deletingAppointmentId });
    }
  };

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((apt) => {
        // Show all except rescheduled; cancelled are shown with visual indicator
        if (apt.status === 'rescheduled') return false;
        const matchesDate = isSameDayBRT(new Date(apt.startTime), selectedDate);
        // Match if therapist is the primary OR a co-therapist on this appointment
        const coIds: number[] = (apt as any).coTherapistIds || [];
        const matchesTherapist =
          selectedTherapistId === null ||
          apt.therapistUserId === selectedTherapistId ||
          coIds.includes(selectedTherapistId);
        return matchesDate && matchesTherapist;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, selectedDate, selectedTherapistId]);

  // Get dates with appointments for calendar highlighting
  const datesWithAppointments = useMemo(() => {
    if (!appointments) return new Set<string>();
    return new Set(
      appointments
        .filter((apt) => apt.status !== 'cancelled' && apt.status !== 'rescheduled')
        .map((apt) => getBRTDateString(apt.startTime))
    );
  }, [appointments]);

  const therapyTypeLabels: Record<string, string> = {
    fonoaudiologia: "Fonoaudiologia",
    psicologia: "Psicologia",
    terapia_ocupacional: "Terapia Ocupacional",
    psicopedagogia: "Psicopedagogia",
    psicomotricidade: "Psicomotricidade",
    musicoterapia: "Musicoterapia",
    fisioterapia: "Fisioterapia",
    neuropsicopedagogia: "Neuropsicopedagogia",
    nutricao: "Nutrição",
    aplicadora_denver_aba: "Aplicadora Denver/ABA",
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

  // PatientSearchInput is imported from @/components/PatientSearchInput
  // It must be defined outside this component to prevent remount on every render

  // Dual session partner badge - only for therapists/admins
  const DualPartnerBadge = ({ appointmentId }: { appointmentId: number }) => {
    const { data: partner } = trpc.appointments.getDualPartner.useQuery(
      { appointmentId },
      { enabled: !!appointmentId }
    );
    if (!partner) return null;
    return (
      <p className="text-sm text-purple-700 font-medium">
        👥 Em dupla com: {partner.patientName}
      </p>
    );
  };

  // Co-therapists display component
  const CoTherapistsList = ({ appointmentId, therapists: allTherapists }: { appointmentId: number; therapists: any[] }) => {
    const { data: coTherapists } = trpc.appointments.getCoTherapists.useQuery({ appointmentId }, { enabled: !!appointmentId });
    if (!coTherapists || coTherapists.length === 0) return null;
    return (
      <p className="text-sm text-blue-700">
        Co-terapeutas: {coTherapists.map((ct: any) => ct.therapistName || `ID ${ct.therapistUserId}`).join(", ")}
      </p>
    );
  };

  // Appointment Form Component (reused for create and edit)
  const AppointmentForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      {/* Patient Selection - disabled in edit mode */}
      <div className="grid gap-2">
        <Label htmlFor="patient">Paciente *</Label>
        {isEdit ? (
          <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted text-sm text-muted-foreground">
            {(patients || []).find((p) => p.id === formData.patientId)?.name || "Paciente não encontrado"}
          </div>
        ) : (
          <PatientSearchInput
            value={formData.patientId}
            onChange={(id: number) => {
              setFormData({ ...formData, patientId: id });
            }}
            patients={(patients || [])}
          />
        )}
        {!isEdit && formData.patientId > 0 && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span>✓</span>
            {(patients || []).find((p) => p.id === formData.patientId)?.name} selecionado
          </p>
        )}
      </div>

      {/* Therapist Selection - disabled in edit mode */}
      {!isEdit && (
        <div className="grid gap-2">
          <Label htmlFor="therapist">Terapeuta *</Label>
          <SearchableSelect
            value={formData.therapistId ? formData.therapistId.toString() : ""}
            onChange={(val) => {
              const therapistId = parseInt(val);
              const selectedTherapist = therapists?.find((t) => t.id === therapistId);
              let autoTherapyType = formData.therapyType;
              if (selectedTherapist?.specialties) {
                try {
                  const specialties: string[] = JSON.parse(selectedTherapist.specialties);
                  if (specialties.length > 0) {
                    const validTypes = ["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"];
                    const firstValid = specialties.find((s) => validTypes.includes(s));
                    if (firstValid) autoTherapyType = firstValid as typeof formData.therapyType;
                  }
                } catch {}
              }
              setFormData({ ...formData, therapistId: therapistId || 0, therapyType: autoTherapyType });
            }}
            placeholder="Selecione o terapeuta"
            searchPlaceholder="Buscar terapeuta..."
            options={(therapists || [])
              .filter((u) => u.role === "therapist" || u.role === "admin")
              .map((t) => ({ value: t.id.toString(), label: t.name ?? "" }))}
          />
        </div>
      )}

      {/* Therapy Type */}
      <div className="grid gap-2">
        <Label htmlFor="therapyType">Tipo de Terapia *</Label>
        <NativeSelect
          value={formData.therapyType}
          onChange={(e) => setFormData({ ...formData, therapyType: e.target.value as any })}
          options={[
            { value: "fonoaudiologia", label: "Fonoaudiologia" },
            { value: "psicologia", label: "Psicologia" },
            { value: "terapia_ocupacional", label: "Terapia Ocupacional" },
            { value: "psicopedagogia", label: "Psicopedagogia" },
            { value: "psicomotricidade", label: "Psicomotricidade" },
            { value: "musicoterapia", label: "Musicoterapia" },
            { value: "fisioterapia", label: "Fisioterapia" },
            { value: "neuropsicopedagogia", label: "Neuropsicopedagogia" },
            { value: "nutricao", label: "Nutrição" },
            { value: "aplicadora_denver_aba", label: "Aplicadora Denver/ABA" },
            { value: "outro", label: "Outro" },
          ]}
        />
      </div>

      {/* Status - only in edit mode and only when editing a single appointment (not the whole series) */}
      {isEdit && editSeriesMode !== "all" && (
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: "scheduled", label: "Agendada" },
              { value: "completed", label: "Concluída" },
              { value: "cancelled", label: "Cancelada" },
              { value: "rescheduled", label: "Remarcada" },
            ]}
          />
        </div>
      )}
      {/* When editing whole series, show info that status changes must use the cancel button */}
      {isEdit && editSeriesMode === "all" && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            Para cancelar agendamentos da série, use o botão de cancelamento (icone de proibido) em cada agendamento individualmente.
          </p>
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
          defaultValue={formData.notes}
          onBlur={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
        />
      </div>
      
      {/* Joint Session - Admin Only */}
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="isJointSession"
              checked={formData.isJointSession || false}
              onChange={(e) => {
                setFormData({ ...formData, isJointSession: e.target.checked, coTherapistIds: e.target.checked ? formData.coTherapistIds : [] });
                setCoTherapistSearch("");
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <Label htmlFor="isJointSession" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Atendimento em Conjunto
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Vincule outras terapeutas a esta sessão</p>
            </div>
          </div>

          {/* Co-therapist selector */}
          {formData.isJointSession && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <Label className="text-sm font-medium text-gray-900">Co-terapeutas</Label>
              {/* Search */}
              <Input
                placeholder="Buscar terapeuta..."
                value={coTherapistSearch}
                onChange={(e) => setCoTherapistSearch(e.target.value)}
                className="h-8 text-sm"
              />
              {/* Therapist list */}
              <div className="max-h-40 overflow-y-auto space-y-1">
                {(therapists || [])
                  .filter((t) => (t.role === "therapist" || t.role === "admin") && t.id !== formData.therapistId)
                  .filter((t) => !coTherapistSearch || (t.name || "").toLowerCase().includes(coTherapistSearch.toLowerCase()))
                  .map((t) => {
                    const isSelected = (formData.coTherapistIds || []).includes(t.id);
                    return (
                      <label key={t.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-100 border border-blue-300" : "hover:bg-white border border-transparent"
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const ids = formData.coTherapistIds || [];
                            setFormData({
                              ...formData,
                              coTherapistIds: e.target.checked
                                ? [...ids, t.id]
                                : ids.filter((id) => id !== t.id),
                            });
                          }}
                          className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm">{t.name}</span>
                        {isSelected && <span className="ml-auto text-xs text-blue-600 font-medium">Selecionado</span>}
                      </label>
                    );
                  })}
              </div>
              {/* Selected summary */}
              {(formData.coTherapistIds || []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {(formData.coTherapistIds || []).map((id) => {
                    const t = therapists?.find((th) => th.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                        {t?.name || id}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, coTherapistIds: (formData.coTherapistIds || []).filter((i) => i !== id) })}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dual Session - Admin Only, only in create mode */}
      {!isEdit && isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <input
              type="checkbox"
              id="isDualSession"
              checked={isDualSession}
              onChange={(e) => {
                setIsDualSession(e.target.checked);
                if (!e.target.checked) { setSecondPatientId(0); }
              }}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <div>
              <Label htmlFor="isDualSession" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Atendimento em Dupla
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Dois pacientes atendidos juntos na mesma sessão</p>
            </div>
          </div>

          {/* Second patient selector */}
          {isDualSession && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
              <Label className="text-sm font-medium text-gray-900">Segundo Paciente *</Label>
              {secondPatientId > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                    {patients?.find((p) => p.id === secondPatientId)?.name || `Paciente ${secondPatientId}`}
                    <button type="button" onClick={() => { setSecondPatientId(0); }} className="hover:text-purple-900 ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              ) : (
                <PatientSearchInput
                  value={secondPatientId}
                  onChange={(id: number) => { setSecondPatientId(id); }}
                  patients={(patients || []).filter((p) => p.id !== formData.patientId)}
                  placeholder="Selecionar segundo paciente..."
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Link Therapist Permanently - Admin Only, only in create mode */}
      {!isEdit && isAdmin && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <input
            type="checkbox"
            id="alsoLinkTherapist"
            checked={formData.alsoLinkTherapist || false}
            onChange={(e) =>
              setFormData({ ...formData, alsoLinkTherapist: e.target.checked })
            }
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <div>
            <Label htmlFor="alsoLinkTherapist" className="text-sm font-medium text-gray-900 cursor-pointer">
              Vincular terapeuta ao paciente permanentemente
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">Marque se este terapeuta passará a atender este paciente regularmente</p>
          </div>
        </div>
      )}

      {/* Replicate Weekly - Admin Only, only in create mode */}
      {!isEdit && isAdmin && (
        <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="replicateWeekly"
            checked={formData.replicateWeekly || false}
            onChange={(e) =>
              setFormData({ ...formData, replicateWeekly: e.target.checked })
            }
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
          <Label htmlFor="replicateWeekly" className="text-sm font-medium text-gray-900 cursor-pointer">
            Replicar este agendamento semanalmente pelos próximos 30 dias (4 semanas)
          </Label>
        </div>
      )}

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
              <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Novo Agendamento</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para criar um novo agendamento.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-1">
                  <AppointmentForm isEdit={false} />
                </div>
                <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
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
          
          {/* Patient Filter - Only for therapists */}
          {user?.role === 'therapist' && (
            <>
              <div className="flex items-center gap-2">
                <NativeSelect
                  className="w-[200px]"
                  value={showMyPatientsOnly ? "my" : "all"}
                  onChange={(e) => setShowMyPatientsOnly(e.target.value === "my")}
                  options={[
                    { value: "my", label: "Meus Pacientes" },
                    { value: "all", label: "Todos os Pacientes" },
                  ]}
                />
              </div>
              <div className="h-6 w-px bg-border" />
            </>
          )}
          
          {/* Therapist Filter - Only for admins */}
          {user?.role !== 'therapist' && (
            <>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <NativeSelect
                  className="w-[200px]"
                  value={selectedTherapistId?.toString() || "all"}
                  onChange={(e) => setSelectedTherapistId(e.target.value === "all" ? null : parseInt(e.target.value))}
                  options={[
                    { value: "all", label: "Todos os terapeutas" },
                    ...((therapists || []).filter((u) => u.role === "therapist").map((t) => ({ value: t.id.toString(), label: t.name ?? "" }))),
                  ]}
                />
              </div>
              <div className="h-6 w-px bg-border" />
            </>
          )}
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
                  const therapistDisplayName = therapist?.name || (apt as any).therapistName || null;
                  return (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-lg border-l-4 transition-colors ${
                        apt.status === 'cancelled'
                          ? 'bg-gray-50 border-gray-300 opacity-60'
                          : apt.status === 'completed' 
                          ? 'bg-green-50 border-green-500' 
                          : `${therapyTypeColors[apt.therapyType]?.bg || "bg-gray-50"} ${
                              therapyTypeColors[apt.therapyType]?.border || "border-gray-300"
                            }`
                      } hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {therapyTypeLabels[apt.therapyType] || apt.therapyType}
                            </h3>
                            <Badge
                              className={
                                apt.status === "completed"
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : apt.status === "cancelled"
                                  ? "bg-red-100 text-red-700 border border-red-300"
                                  : ""
                              }
                              variant={
                                apt.status === "scheduled"
                                  ? "default"
                                  : apt.status === "completed"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {apt.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {apt.status === "cancelled" && <Ban className="h-3 w-3 mr-1" />}
                              {statusLabels[apt.status]}
                            </Badge>
                            {apt.seriesId && (
                              <div 
                                className="flex items-center gap-1 text-xs text-muted-foreground bg-amber-100 px-2 py-1 rounded"
                                title="Este agendamento faz parte de uma série recorrente"
                              >
                                <Repeat className="h-3 w-3" />
                                Série
                              </div>
                            )}
                          {apt.isJointSession && (
                              <div 
                                className="flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded"
                                title="Atendimento em conjunto com múltiplas terapeutas"
                              >
                                <UserPlus className="h-3 w-3" />
                                Em Conjunto
                              </div>
                            )}
                            {(apt as any).isDualSession && (user?.role === 'admin' || user?.role === 'therapist') && (
                              <div
                                className="flex items-center gap-1 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded"
                                title="Atendimento em dupla com dois pacientes"
                              >
                                <Users className="h-3 w-3" />
                                Dupla
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Paciente: {patient?.name || "Não identificado"}
                          </p>
                          {therapistDisplayName && (
                            <p className="text-sm text-muted-foreground">
                              Terapeuta: {therapistDisplayName}
                            </p>
                          )}
                          {apt.isJointSession && (
                            <CoTherapistsList appointmentId={apt.id} therapists={therapists || []} />
                          )}
                          {(apt as any).isDualSession && (user?.role === 'admin' || user?.role === 'therapist') && (
                            <DualPartnerBadge appointmentId={apt.id} />
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {formatBRT(apt.startTime, "HH:mm")} -{" "}
                              {formatBRT(apt.endTime, "HH:mm")}
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
                            {apt.status !== 'cancelled' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditModal(apt)}
                                  title="Editar agendamento"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {apt.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => openCancelDialog(apt)}
                                    className="text-orange-600 hover:text-orange-700 hover:border-orange-400"
                                    title="Marcar como cancelado"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openDeleteDialog(apt)}
                                  className="text-destructive hover:text-destructive"
                                  title="Excluir agendamento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {apt.status === 'cancelled' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => reactivateAppointmentMutation.mutate({ id: apt.id, status: 'scheduled' })}
                                  className="text-green-600 hover:text-green-700 hover:border-green-400"
                                  title="Reativar agendamento"
                                  disabled={reactivateAppointmentMutation.isPending}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openDeleteDialog(apt)}
                                  className="text-destructive hover:text-destructive"
                                  title="Excluir agendamento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
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
        <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere os dados do agendamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Series edit options */}
            {editingSeriesId && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-900">Este agendamento faz parte de uma série recorrente:</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMode"
                      checked={editSeriesMode === "single"}
                      onChange={() => setEditSeriesMode("single")}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm">Editar apenas este agendamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMode"
                      checked={editSeriesMode === "all"}
                      onChange={() => setEditSeriesMode("all")}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold">Editar toda a série</span>
                  </label>
                </div>
              </div>
            )}
            
            <AppointmentForm isEdit={true} />
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditAppointment}
              disabled={updateAppointmentMutation.isPending || updateSeriesMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(updateAppointmentMutation.isPending || updateSeriesMutation.isPending)
                ? (editSeriesMode === "all" ? "Salvando série..." : "Salvando...")
                : (editSeriesMode === "all" && editingSeriesId ? "Salvar toda a série" : "Salvar Alterações")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              O agendamento continuará visível na agenda com o status "Cancelado".
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Series cancel options — shown only when appointment belongs to a series */}
          {cancellingAppointment?.seriesId && (
            <div className="px-6 pb-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-900">Este agendamento faz parte de uma série recorrente:</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cancelMode"
                      checked={cancelSeriesMode === "single"}
                      onChange={() => setCancelSeriesMode("single")}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm">Cancelar apenas <strong>este</strong> agendamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cancelMode"
                      checked={cancelSeriesMode === "all"}
                      onChange={() => setCancelSeriesMode("all")}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-destructive">Cancelar <strong>toda a série</strong></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateAppointmentMutation.isPending || cancelSeriesMutation.isPending}>Voltar</AlertDialogCancel>
            <Button
              onClick={handleCancelAppointment}
              disabled={updateAppointmentMutation.isPending || cancelSeriesMutation.isPending}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {(updateAppointmentMutation.isPending || cancelSeriesMutation.isPending)
                ? "Cancelando..."
                : cancelSeriesMode === "all" && cancellingAppointment?.seriesId
                  ? "Cancelar toda a série"
                  : "Cancelar este agendamento"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Series delete options */}
          {editingSeriesId && (
            <div className="px-6 pb-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-900">Este agendamento faz parte de uma série recorrente:</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteSeriesMode === "single"}
                      onChange={() => setDeleteSeriesMode("single")}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm">Excluir apenas este agendamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteSeriesMode === "all"}
                      onChange={() => setDeleteSeriesMode("all")}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-destructive">Cancelar toda a série</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAppointmentMutation.isPending || cancelSeriesMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleDeleteAppointment}
              disabled={deleteAppointmentMutation.isPending || cancelSeriesMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(deleteAppointmentMutation.isPending || cancelSeriesMutation.isPending)
                ? (deleteSeriesMode === "all" ? "Cancelando série..." : "Excluindo...")
                : (deleteSeriesMode === "all" && editingSeriesId ? "Cancelar toda a série" : "Excluir")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
