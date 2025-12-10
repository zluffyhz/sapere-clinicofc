import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface EmailMessage {
  to: string[];
  subject: string;
  content: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Send email using Gmail MCP server
 * This function uses the manus-mcp-cli to send emails via Gmail
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    const messageJson = JSON.stringify({
      messages: [
        {
          to: message.to,
          subject: message.subject,
          content: message.content,
          cc: message.cc,
          bcc: message.bcc,
        },
      ],
    });

    const command = `manus-mcp-cli tool call gmail_send_messages --server gmail --input '${messageJson.replace(/'/g, "'\\''")}'`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes("Warning")) {
      console.error("[Email] Error sending email:", stderr);
      return false;
    }
    
    console.log("[Email] Email sent successfully:", stdout);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

/**
 * Send notification email to family when a new document is uploaded
 */
export async function sendNewDocumentEmail(
  familyEmail: string,
  patientName: string,
  documentTitle: string
): Promise<boolean> {
  return sendEmail({
    to: [familyEmail],
    subject: `Sapere - Novo documento disponível para ${patientName}`,
    content: `Olá,

Um novo documento foi adicionado ao prontuário de ${patientName}.

Documento: ${documentTitle}

Acesse a plataforma Sapere para visualizar e baixar o documento.

Atenciosamente,
Equipe Sapere`,
  });
}

/**
 * Send notification email to family when schedule changes
 */
export async function sendScheduleChangeEmail(
  familyEmail: string,
  patientName: string,
  therapyType: string,
  appointmentDate: Date
): Promise<boolean> {
  const formattedDate = appointmentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendEmail({
    to: [familyEmail],
    subject: `Sapere - Alteração na agenda de ${patientName}`,
    content: `Olá,

Houve uma alteração na agenda de terapia de ${patientName}.

Tipo de terapia: ${therapyType.replace(/_/g, " ")}
Data e horário: ${formattedDate}

Acesse a plataforma Sapere para mais detalhes.

Atenciosamente,
Equipe Sapere`,
  });
}

/**
 * Send notification email to family when a new session record is created
 */
export async function sendNewSessionRecordEmail(
  familyEmail: string,
  patientName: string,
  sessionDate: Date
): Promise<boolean> {
  const formattedDate = sessionDate.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to: [familyEmail],
    subject: `Sapere - Novo registro de sessão para ${patientName}`,
    content: `Olá,

Um novo registro de sessão foi adicionado ao prontuário de ${patientName}.

Data da sessão: ${formattedDate}

Acesse a plataforma Sapere para visualizar o registro completo da evolução.

Atenciosamente,
Equipe Sapere`,
  });
}
