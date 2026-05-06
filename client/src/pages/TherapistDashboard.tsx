import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Users, ClipboardList, Timer, ChevronRight, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRT } from "@/lib/timezone";
import { CollaborationChart } from "@/components/CollaborationChart";
import { useState } from "react";

// Quick Action Button Component
function QuickActionButton({
  href,
  icon: Icon,
  label,
  description,
  color = "orange",
}: {
  href: string;
  icon: any;
  label: string;
  description: string;
  color?: "orange" | "blue" | "green" | "purple";
}) {
  const [, setLocation] = useLocation();

  const colorMap = {
    orange: "bg-orange-50 hover:bg-orange-100 border-orange-100 text-orange-600",
    blue: "bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-600",
    green: "bg-green-50 hover:bg-green-100 border-green-100 text-green-600",
    purple: "bg-purple-50 hover:bg-purple-100 border-purple-100 text-purple-600",
  };

  return (
    <button
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 group ${colorMap[color]}`}
      onClick={() => setLocation(href)}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{label}</p>
          <p className="text-xs opacity-70 mt-0.5 leading-tight">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 ml-auto shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" />
      </div>
    </button>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "orange",
  loading = false,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: any;
  accent?: "orange" | "blue" | "green" | "purple";
  loading?: boolean;
}) {
  const accentMap = {
    orange: { border: "border-l-orange-400", icon: "text-orange-500 bg-orange-50" },
    blue: { border: "border-l-blue-400", icon: "text-blue-500 bg-blue-50" },
    green: { border: "border-l-green-400", icon: "text-green-500 bg-green-50" },
    purple: { border: "border-l-purple-400", icon: "text-purple-500 bg-purple-50" },
  };

  const { border, icon: iconStyle } = accentMap[accent];

  return (
    <Card className={`border-l-4 ${border} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            {loading ? (
              <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1 leading-none">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{subtitle}</p>
          </div>
          <div className={`shrink-0 p-2 rounded-lg ${iconStyle}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Admin sees all patients, therapist sees only assigned patients
  const { data: allPatients, isLoading: allPatientsLoading } = trpc.patients.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );
  const { data: myPatients, isLoading: myPatientsLoading } = trpc.patients.getMyPatients.useQuery(
    undefined,
    { enabled: user?.role === "therapist" }
  );

  const patients = user?.role === "admin" ? allPatients : myPatients;
  const patientsLoading = user?.role === "admin" ? allPatientsLoading : myPatientsLoading;

  // Collaboration chart filters
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState(30);

  // Get collaboration history (only for therapists/admins)
  const { data: collaborationData } = trpc.evolutions.getCollaborationHistory.useQuery(
    { days: selectedDays, patientId: selectedPatientId },
    { enabled: !!user && (user.role === "therapist" || user.role === "admin") }
  );

  // Get today's appointments
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [tomorrow] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [weekEnd] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  });

  const { data: todayAppointments } = trpc.appointments.listByDateRange.useQuery({
    startDate: today,
    endDate: tomorrow,
  });

  const { data: weekAppointments } = trpc.appointments.listByDateRange.useQuery({
    startDate: today,
    endDate: weekEnd,
  });

  const scheduledToday = todayAppointments?.filter((a) => a.status === "scheduled").length || 0;
  const completedToday = todayAppointments?.filter((a) => a.status === "completed").length || 0;
  const cancelledToday = todayAppointments?.filter((a) => a.status === "cancelled").length || 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const statusConfig = {
    scheduled: { label: "Agendada", icon: Clock, className: "bg-blue-50 text-blue-700 border-blue-200" },
    completed: { label: "Realizada", icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200" },
    cancelled: { label: "Cancelada", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
    rescheduled: { label: "Remarcada", icon: Clock, className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div
        className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.60 0.20 50) 0%, oklch(0.68 0.18 55) 60%, oklch(0.72 0.16 65) 100%)",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium mb-1">
              {greeting},{" "}
              {user?.role === "therapist" ? "Dr(a)." : ""}
            </p>
            <h1 className="text-2xl font-bold leading-tight">
              {user?.name?.split(" ")[0] || "Usuário"} 👋
            </h1>
            <p className="mt-2 text-orange-100 text-sm">
              {scheduledToday > 0
                ? `${scheduledToday} sess${scheduledToday === 1 ? "ão" : "ões"} agendada${scheduledToday === 1 ? "" : "s"} para hoje`
                : "Nenhuma sessão agendada para hoje"}
              {completedToday > 0 && ` · ${completedToday} realizada${completedToday === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-md flex items-center gap-2 shrink-0 border-0"
            onClick={() => setLocation("/session")}
          >
            <Timer className="h-5 w-5" />
            Iniciar Sessão
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pacientes Ativos"
          value={patients?.length || 0}
          subtitle="Sob seus cuidados"
          icon={Users}
          accent="orange"
          loading={patientsLoading}
        />
        <StatCard
          title="Sessões Hoje"
          value={scheduledToday}
          subtitle="Agendadas para hoje"
          icon={Calendar}
          accent="blue"
        />
        <StatCard
          title="Esta Semana"
          value={weekAppointments?.length || 0}
          subtitle="Próximos 7 dias"
          icon={TrendingUp}
          accent="purple"
        />
        <StatCard
          title="Realizadas Hoje"
          value={completedToday}
          subtitle={cancelledToday > 0 ? `${cancelledToday} cancelada${cancelledToday === 1 ? "" : "s"}` : "Com evolução registrada"}
          icon={CheckCircle2}
          accent="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Agenda de Hoje</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-8"
                onClick={() => setLocation("/agenda")}
              >
                Ver tudo
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!todayAppointments || todayAppointments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma sessão agendada para hoje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((apt) => {
                  const patient = patients?.find((p) => p.id === apt.patientId);
                  const status = statusConfig[apt.status as keyof typeof statusConfig] || statusConfig.scheduled;
                  const StatusIcon = status.icon;
                  const isCancelled = apt.status === "cancelled";

                  return (
                    <div
                      key={apt.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        isCancelled ? "opacity-50 bg-muted/30" : "hover:bg-accent/30"
                      }`}
                    >
                      {/* Time block */}
                      <div className="shrink-0 text-center min-w-[44px]">
                        <p className="text-sm font-bold leading-none">
                          {formatBRT(apt.startTime, "HH:mm")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBRT(apt.endTime, "HH:mm")}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className={`w-0.5 h-8 rounded-full shrink-0 ${
                        apt.status === "completed" ? "bg-green-400" :
                        apt.status === "cancelled" ? "bg-red-300" :
                        "bg-orange-400"
                      }`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCancelled ? "line-through" : ""}`}>
                          {patient?.name || "Paciente"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.therapyType.replace(/_/g, " ")}
                        </p>
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs gap-1 border ${status.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">{status.label}</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients + Quick Actions */}
        <div className="space-y-4">
          {/* Recent Patients */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Pacientes Recentes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Acesso rápido aos prontuários</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-8"
                  onClick={() => setLocation("/pacientes")}
                >
                  Ver todos
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {patientsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : !patients || patients.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum paciente cadastrado</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {patients.slice(0, 4).map((patient) => (
                    <button
                      key={patient.id}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/40 transition-colors text-left group"
                      onClick={() => setLocation(`/prontuarios/${patient.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {patient.name?.charAt(0).toUpperCase() || "P"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{patient.name}</p>
                          {patient.dateOfBirth && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(patient.dateOfBirth), "PP", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {user?.role === "admin" && (
              <QuickActionButton
                href="/pacientes"
                icon={Users}
                label="Novo Paciente"
                description="Cadastrar paciente"
                color="orange"
              />
            )}
            <QuickActionButton
              href="/agenda"
              icon={Calendar}
              label="Agenda"
              description="Gerenciar horários"
              color="blue"
            />
            <QuickActionButton
              href="/prontuarios"
              icon={ClipboardList}
              label="Prontuários"
              description="Registros clínicos"
              color="purple"
            />
            <QuickActionButton
              href="/documentos"
              icon={FileText}
              label="Documentos"
              description="Laudos e relatórios"
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Collaboration Chart */}
      {collaborationData && collaborationData.length > 0 && (
        <CollaborationChart
          data={collaborationData}
          patients={patients || []}
          selectedPatientId={selectedPatientId}
          selectedDays={selectedDays}
          onPatientChange={setSelectedPatientId}
          onDaysChange={setSelectedDays}
        />
      )}
    </div>
  );
}
