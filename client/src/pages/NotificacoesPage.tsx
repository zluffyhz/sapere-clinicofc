import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function NotificacoesPage() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("Todas as notificações foram marcadas como lidas");
    },
  });

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const notificationTypeIcons: Record<string, React.ReactNode> = {
    new_document: <Bell className="h-5 w-5 text-blue-500" />,
    schedule_change: <Bell className="h-5 w-5 text-orange-500" />,
    new_session_record: <Bell className="h-5 w-5 text-green-500" />,
    general: <Bell className="h-5 w-5 text-gray-500" />,
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-2">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação(ões) não lida(s)`
              : "Todas as notificações foram lidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Notificações</CardTitle>
          <CardDescription>
            Acompanhe atualizações sobre agendamentos, documentos e registros de sessão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando notificações...
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    !notif.isRead
                      ? "bg-accent/50 border-primary/50"
                      : "bg-card hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-1">
                      {notificationTypeIcons[notif.type] || notificationTypeIcons.general}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold">{notif.title}</h3>
                        {!notif.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2"></div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.createdAt), "PPP 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                        
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Marcar como lida
                          </Button>
                        )}
                      </div>
                    </div>
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
