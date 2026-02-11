import * as db from "./db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Cron job to check for incomplete evolutions and create notifications
 * Should be called daily at 8 AM
 */
export async function checkIncompleteEvolutions() {
  console.log("[Cron] Checking for incomplete evolutions...");
  
  try {
    const incompleteEvolutions = await db.getIncompleteEvolutions();
    console.log(`[Cron] Found ${incompleteEvolutions.length} incomplete evolutions`);
    
    for (const evolution of incompleteEvolutions) {
      // Check if there's already an unread notification for this evolution
      const hasNotification = await db.hasUnreadNotificationForEvolution(
        evolution.therapistUserId,
        evolution.id
      );
      
      if (hasNotification) {
        console.log(`[Cron] Skipping evolution ${evolution.id} - notification already exists`);
        continue;
      }
      
      // Get patient name
      const patient = await db.getPatientById(evolution.patientId);
      const patientName = patient?.name || "Paciente Desconhecido";
      const sessionDate = format(new Date(evolution.sessionDate), "dd/MM/yyyy", { locale: ptBR });
      
      // Create notification
      await db.createNotification({
        userId: evolution.therapistUserId,
        type: "incomplete_evolution",
        title: "Evolução Incompleta",
        message: `Evolução incompleta: ${patientName} - Sessão de ${sessionDate}`,
        evolutionId: evolution.id,
        relatedId: evolution.patientId,
        isRead: false,
      });
      
      console.log(`[Cron] Created notification for evolution ${evolution.id}`);
    }
    
    console.log("[Cron] Incomplete evolutions check completed");
    return { success: true, count: incompleteEvolutions.length };
  } catch (error) {
    console.error("[Cron] Error checking incomplete evolutions:", error);
    throw error;
  }
}
