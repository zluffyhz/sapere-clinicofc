import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Users, ClipboardList, Timer } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CollaborationChart } from "@/components/CollaborationChart";
import { useState } from "react";

// Quick Action Button Component
function QuickActionButton({
  href,
  icon: Icon,
  label,
  variant = "outline",
  className = "",
}: {
  href: string;
  icon: any;
  label: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  const [, setLocation] = useLocation();

  return (
    <Button
      variant={variant}
      className={`w-full h-24 flex flex-col gap-2 ${className}`}
      onClick={() => setLocation(href)}
    >
      <Icon className="h-6 w-6" />
      <span>{label}</span>
    </Button>
  );
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();
  
  // Collaboration chart filters
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState(30);
  
  // Get collaboration history (only for therapists/admins)
  const { data: collaborationData } = trpc.evolutions.getCollaborationHistory.useQuery(
    {
      familyUserId: 1, // TODO: Get from selected patient's family
      days: selectedDays,
      patientId: selectedPatientId,
    },
    {
      enabled: !!user && (user.role === 'therapist' || user.role === 'admin'),
    }
  );

  // Get today's appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todayAppointments } = trpc.appointments.listByDateRange.useQuery({
    startDate: today,
    endDate: tomorrow,
  });

  // Get this week's appointments
  const weekStart = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: weekAppointments } = trpc.appointments.listByDateRange.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo{user?.role === 'therapist' ? ', Dr(a).' : ','} {user?.name || "Terapeuta"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie seus pacientes, agendamentos e prontuários
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total sob seus cuidados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAppointments?.filter((a) => a.status === "scheduled").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Agendadas para hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekAppointments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontuários</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Agenda de Hoje</CardTitle>
            <CardDescription>
              {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!todayAppointments || todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sessão agendada para hoje
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments
                  .sort(
                    (a, b) =>
                      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                  )
                  .map((apt) => {
                    const patient = patients?.find((p) => p.id === apt.patientId);
                    return (
                      <div key={apt.id} className="flex items-start gap-4 p-3 rounded-lg border">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {format(new Date(apt.startTime), "HH:mm")} -{" "}
                            {format(new Date(apt.endTime), "HH:mm")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {patient?.name || "Paciente"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.therapyType.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full ${
                            apt.status === "scheduled"
                              ? "bg-primary/10 text-primary"
                              : apt.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {apt.status === "scheduled"
                            ? "Agendada"
                            : apt.status === "completed"
                            ? "Concluída"
                            : apt.status === "cancelled"
                            ? "Cancelada"
                            : "Remarcada"}
                        </div>
                      </div>
                    );
                  })}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/agenda")}
                >
                  Ver Agenda Completa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <CardTitle>Pacientes Recentes</CardTitle>
            <CardDescription>Acesso rápido aos prontuários</CardDescription>
          </CardHeader>
          <CardContent>
            {patientsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !patients || patients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum paciente cadastrado
              </div>
            ) : (
              <div className="space-y-4">
                {patients.slice(0, 5).map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{patient.name}</p>
                      {patient.dateOfBirth && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(patient.dateOfBirth), "PP", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/prontuarios/${patient.id}`)}
                    >
                      Ver Prontuário
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/pacientes")}
                >
                  Ver Todos os Pacientes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse as funcionalidades principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <QuickActionButton
              href="/session"
              icon={Timer}
              label="Iniciar Sessão"
              variant="default"
              className="bg-orange-500 hover:bg-orange-600"
            />
            {user?.role === 'admin' && (
              <QuickActionButton
                href="/pacientes"
                icon={Users}
                label="Novo Paciente"
              />
            )}
            <QuickActionButton
              href="/agenda"
              icon={Calendar}
              label="Gerenciar Agenda"
            />
            <QuickActionButton
              href="/prontuarios"
              icon={ClipboardList}
              label="Prontuários"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
