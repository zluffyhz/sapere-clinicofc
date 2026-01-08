import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Check, Bell, Calendar, FileText, ClipboardCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsModal({ open, onOpenChange }: NotificationsModalProps) {
  const [filter, setFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(undefined, {
    enabled: open,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("Notificação marcada como lida");
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "attendance":
        return <ClipboardCheck className="h-4 w-4" />;
      case "appointment":
        return <Calendar className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "attendance":
        return "Presença";
      case "appointment":
        return "Agendamento";
      case "document":
        return "Documento";
      default:
        return "Notificação";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Notificações</span>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                Marcar todas como lidas
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex gap-2 pb-4 border-b">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          <Button
            variant={filter === "attendance" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("attendance")}
          >
            Presença
          </Button>
          <Button
            variant={filter === "appointment" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("appointment")}
          >
            Agendamento
          </Button>
          <Button
            variant={filter === "document" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("document")}
          >
            Documento
          </Button>
        </div>

        {/* Lista de notificações */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando notificações...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filter === "all"
                ? "Nenhuma notificação"
                : `Nenhuma notificação de ${getTypeLabel(filter).toLowerCase()}`}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.isRead
                    ? "bg-background"
                    : "bg-accent/50 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      notification.isRead ? "bg-muted" : "bg-primary/10"
                    }`}
                  >
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            markAsReadMutation.mutate({ id: notification.id })
                          }
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(notification.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
