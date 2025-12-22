import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  ClipboardCheck,
  Download
} from "lucide-react";

type AttendanceStatus = "present" | "absent";

const statusConfig: Record<AttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  present: { label: "Presente", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  absent: { label: "Ausente", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-4 h-4" /> },
};

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

export default function AttendancePage() {
  const [selectedStatus, setSelectedStatus] = useState<Record<number, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const utils = trpc.useUtils();
  const { data: todayAppointments, isLoading } = trpc.attendance.todayAppointments.useQuery();
  const { data: patients } = trpc.patients.list.useQuery();
  
  const generateReport = trpc.attendance.generateReport.useMutation({
    onSuccess: (data) => {
      toast.success('Relatório gerado com sucesso!');
      window.open(data.url, '_blank');
      setIsGeneratingPDF(false);
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório: ' + error.message);
      setIsGeneratingPDF(false);
    },
  });
  
  const handleGenerateReport = () => {
    if (!selectedPatientId) {
      toast.error('Selecione um paciente');
      return;
    }
    
    setIsGeneratingPDF(true);
    generateReport.mutate({
      patientId: selectedPatientId,
      month: selectedMonth,
      year: selectedYear,
    });
  };

  const markAttendanceMutation = trpc.attendance.mark.useMutation({
    onSuccess: (_, variables) => {
      utils.attendance.todayAppointments.invalidate();
      toast.success("Presença registrada com sucesso!");
      // Clear the selection for this appointment
      setSelectedStatus(prev => {
        const newState = { ...prev };
        delete newState[variables.appointmentId];
        return newState;
      });
      setNotes(prev => {
        const newState = { ...prev };
        delete newState[variables.appointmentId];
        return newState;
      });
    },
    onError: (error) => {
      toast.error(`Erro ao registrar presença: ${error.message}`);
    },
  });

  const handleMarkAttendance = (appointment: {
    id: number;
    patientId: number;
    familyUserId: number;
    therapistUserId: number;
    therapyType: string;
    startTime: Date;
  }) => {
    const status = selectedStatus[appointment.id] || "present";
    
    markAttendanceMutation.mutate({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      familyUserId: appointment.familyUserId,
      therapistUserId: appointment.therapistUserId,
      therapyType: appointment.therapyType as "fonoaudiologia" | "psicologia" | "terapia_ocupacional" | "psicopedagogia" | "musicoterapia" | "fisioterapia" | "neuropsicopedagogia" | "nutricao" | "outro",
      scheduledDate: new Date(appointment.startTime),
      status,
      notes: notes[appointment.id],
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Controle de Presença</h1>
            <p className="text-gray-500 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPatientId?.toString() || ""} onValueChange={(v) => setSelectedPatientId(parseInt(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map(patient => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Janeiro</SelectItem>
                <SelectItem value="2">Fevereiro</SelectItem>
                <SelectItem value="3">Março</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Maio</SelectItem>
                <SelectItem value="6">Junho</SelectItem>
                <SelectItem value="7">Julho</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateReport} disabled={isGeneratingPDF || !selectedPatientId}>
              <Download className="w-4 h-4 mr-2" />
              {isGeneratingPDF ? 'Gerando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Agendadas</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {todayAppointments?.length || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">Presentes</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {todayAppointments?.filter(a => a.attendance?.status === "present").length || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 mt-1">
              {todayAppointments?.filter(a => !a.attendance).length || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">Ausentes</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">
              {todayAppointments?.filter(a => a.attendance?.status === "absent").length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            Sessões de Hoje
          </CardTitle>
          <CardDescription>
            Marque a presença dos pacientes conforme chegam à clínica
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!todayAppointments || todayAppointments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma sessão agendada para hoje</p>
              <p className="text-sm">As sessões aparecerão aqui quando forem agendadas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    appointment.attendance
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-orange-200 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {appointment.patientName}
                        </span>
                        {appointment.attendance && (
                          <Badge className={statusConfig[appointment.attendance.status as AttendanceStatus].color}>
                            {statusConfig[appointment.attendance.status as AttendanceStatus].icon}
                            <span className="ml-1">
                              {statusConfig[appointment.attendance.status as AttendanceStatus].label}
                            </span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(appointment.startTime)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {therapyTypeLabels[appointment.therapyType] || appointment.therapyType}
                        </Badge>
                      </div>
                    </div>

                    {/* Attendance Controls */}
                    {!appointment.attendance ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Select
                          value={selectedStatus[appointment.id] || "present"}
                          onValueChange={(value) =>
                            setSelectedStatus(prev => ({
                              ...prev,
                              [appointment.id]: value as AttendanceStatus,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {config.icon}
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Textarea
                          placeholder="Observações (opcional)"
                          value={notes[appointment.id] || ""}
                          onChange={(e) =>
                            setNotes(prev => ({
                              ...prev,
                              [appointment.id]: e.target.value,
                            }))
                          }
                          className="h-10 min-h-[40px] resize-none text-sm"
                        />
                        
                        <Button
                          onClick={() => handleMarkAttendance(appointment)}
                          disabled={markAttendanceMutation.isPending}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Registrar
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {appointment.attendance.notes && (
                          <p className="italic">"{appointment.attendance.notes}"</p>
                        )}
                        <p className="text-xs mt-1">
                          Registrado em {new Date(appointment.attendance.createdAt).toLocaleTimeString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
