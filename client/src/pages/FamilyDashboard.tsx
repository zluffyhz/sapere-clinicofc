import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Bell, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FamilyDashboard() {
  const { user } = useAuth();
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery();
  
  // Get upcoming appointments for the next 7 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  
  const { data: appointments, isLoading: appointmentsLoading } = trpc.appointments.listByDateRange.useQuery({
    startDate,
    endDate,
  });

  const recentNotifications = notifications?.slice(0, 5) || [];
  const upcomingAppointments = appointments?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo, {user?.name || "Família"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe as terapias e documentos dos seus pacientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Sessões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Nos próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications?.filter(n => !n.isRead).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Não lidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Sessões</CardTitle>
            <CardDescription>Suas sessões agendadas para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sessão agendada
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => {
                  const patient = patients?.find(p => p.id === apt.patientId);
                  return (
                    <div key={apt.id} className="flex items-start gap-4 p-3 rounded-lg border">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {apt.therapyType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient?.name || "Paciente"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(apt.startTime), "PPP 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        apt.status === 'scheduled' ? 'bg-primary/10 text-primary' :
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {apt.status === 'scheduled' ? 'Agendada' :
                         apt.status === 'completed' ? 'Concluída' :
                         apt.status === 'cancelled' ? 'Cancelada' : 'Remarcada'}
                      </div>
                    </div>
                  );
                })}
                <Link href="/agenda">
                  <Button variant="outline" className="w-full">Ver Agenda Completa</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações Recentes</CardTitle>
            <CardDescription>Atualizações sobre terapias e documentos</CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <div className="space-y-4">
                {recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border ${
                      !notif.isRead ? "bg-accent/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.createdAt), "PPP", { locale: ptBR })}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                  </div>
                ))}
                <Link href="/notificacoes">
                  <Button variant="outline" className="w-full">Ver Todas</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patients List */}
      {patients && patients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meus Pacientes</CardTitle>
            <CardDescription>Pacientes cadastrados em seu nome</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{patient.name}</p>
                    {patient.dateOfBirth && (
                      <p className="text-xs text-muted-foreground">
                        Nascimento: {format(new Date(patient.dateOfBirth), "PP", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Link href={`/pacientes/${patient.id}`}>
                    <Button variant="ghost" size="sm">Ver Detalhes</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
