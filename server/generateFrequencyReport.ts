import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttendanceRecord {
  id: number;
  date: Date;
  status: string;
  therapyType: string;
}

interface ReportData {
  patientName: string;
  month: number;
  year: number;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

export function generateFrequencyReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Clínica Sapere", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(16)
        .text("Relatório de Frequência", { align: "center" })
        .moveDown(1);

      // Patient Info
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Paciente: ${data.patientName}`, { continued: false })
        .text(`Período: ${getMonthName(data.month)}/${data.year}`)
        .text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`)
        .moveDown(1.5);

      // Statistics Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Estatísticas do Período")
        .moveDown(0.5);

      doc.fontSize(11).font("Helvetica");

      const stats = [
        ["Total de Sessões Agendadas:", data.totalSessions.toString()],
        ["Presenças:", data.presentSessions.toString()],
        ["Faltas:", data.absentSessions.toString()],
        ["Taxa de Frequência:", `${data.attendanceRate.toFixed(1)}%`],
      ];

      stats.forEach(([label, value]) => {
        doc.text(label, 50, doc.y, { continued: true, width: 300 });
        doc.font("Helvetica-Bold").text(value, { align: "right" });
        doc.font("Helvetica").moveDown(0.3);
      });

      doc.moveDown(1);

      // Attendance History
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Histórico de Presenças")
        .moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 150;
      const col3X = 300;
      const col4X = 450;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Data", col1X, tableTop)
        .text("Tipo de Terapia", col2X, tableTop)
        .text("Status", col3X, tableTop);

      doc
        .moveTo(col1X, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .stroke();

      let currentY = tableTop + 25;

      // Table Rows
      doc.fontSize(9).font("Helvetica");

      data.records.forEach((record, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        const dateStr = format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR });
        const therapyLabel = getTherapyTypeLabel(record.therapyType);
        const statusLabel = record.status === "present" ? "Presente" : "Ausente";

        doc
          .text(dateStr, col1X, currentY)
          .text(therapyLabel, col2X, currentY)
          .text(statusLabel, col3X, currentY);

        currentY += 20;

        // Separator line every 5 rows
        if ((index + 1) % 5 === 0) {
          doc
            .moveTo(col1X, currentY - 5)
            .lineTo(545, currentY - 5)
            .stroke();
        }
      });

      // Footer
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          "Este documento foi gerado automaticamente pelo sistema da Clínica Sapere.",
          50,
          750,
          { align: "center", width: 495 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getMonthName(month: number): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return months[month - 1] || "";
}

function getTherapyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fonoaudiologia: "Fonoaudiologia",
    psicologia: "Psicologia",
    terapia_ocupacional: "Terapia Ocupacional",
    psicopedagogia: "Psicopedagogia",
    musicoterapia: "Musicoterapia",
    fisioterapia: "Fisioterapia",
    neuropsicopedagogia: "Neuropsicopedagogia",
    nutricao: "Nutrição",
  };
  return labels[type] || type;
}
