import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Check, Bell, Calendar, FileText, ClipboardCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationsDropdownProps {
  children: React.ReactNode;
}

export function NotificationsDropdown({ children }: NotificationsDropdownProps) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-8 text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-1 p-2 border-b">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-7 text-xs flex-1"
          >
            Todas
          </Button>
          <Button
            variant={filter === "attendance" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("attendance")}
            className="h-7 text-xs flex-1"
          >
            Presença
          </Button>
          <Button
            variant={filter === "appointment" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("appointment")}
            className="h-7 text-xs flex-1"
          >
            Agenda
          </Button>
          <Button
            variant={filter === "document" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("document")}
            className="h-7 text-xs flex-1"
          >
            Docs
          </Button>
        </div>

        {/* Lista de notificações */}
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {filter === "all"
                  ? "Nenhuma notificação"
                  : `Nenhuma notificação de ${getTypeLabel(filter).toLowerCase()}`}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    notification.isRead
                      ? "bg-background hover:bg-accent/50"
                      : "bg-accent/50 border-primary/20 hover:bg-accent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`p-1.5 rounded-full ${
                        notification.isRead ? "bg-muted" : "bg-primary/10"
                      }`}
                    >
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-xs ${
                              notification.isRead ? "font-normal" : "font-semibold"
                            } truncate`}
                          >
                            {notification.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate({ id: notification.id });
                            }}
                            disabled={markAsReadMutation.isPending}
                            className="h-6 w-6 p-0 shrink-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
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
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
