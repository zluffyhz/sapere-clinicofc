import PDFDocument from "pdfkit";
import type { Response } from "express";

const THERAPY_TYPE_LABELS: Record<string, string> = {
  fonoaudiologia: "Fonoaudiologia",
  psicologia: "Psicologia",
  terapia_ocupacional: "Terapia Ocupacional",
  psicopedagogia: "Psicopedagogia",
  musicoterapia: "Musicoterapia",
  fisioterapia: "Fisioterapia",
  neuropsicopedagogia: "Neuropsicopedagogia",
  nutricao: "Nutrição",
  psicomotricidade: "Psicomotricidade",
  aplicadora_denver_aba: "Aplicadora Denver/ABA",
  outro: "Outro",
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface AtendimentoRecord {
  id: number;
  therapistName: string;
  patientName: string;
  sessionDate: Date | string;
  therapyType: string;
}

interface TherapistGroup {
  therapistName: string;
  total: number;
  byTherapyType: Record<string, number>;
  records: AtendimentoRecord[];
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function formatDayOfWeek(date: Date | string): string {
  const d = new Date(date);
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days[d.getDay()];
}

export function gerarRelatorioPDF(
  res: Response,
  records: AtendimentoRecord[],
  month: number,
  year: number
): void {
  // Agrupar por terapeuta
  const groups: Record<string, TherapistGroup> = {};
  for (const record of records) {
    const key = record.therapistName;
    if (!groups[key]) {
      groups[key] = {
        therapistName: record.therapistName,
        total: 0,
        byTherapyType: {},
        records: [],
      };
    }
    groups[key].records.push(record);
    groups[key].total++;
    const t = record.therapyType;
    groups[key].byTherapyType[t] = (groups[key].byTherapyType[t] || 0) + 1;
  }

  const sortedGroups = Object.values(groups).sort((a, b) => b.total - a.total);
  const totalGeral = records.length;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  // Configurar PDF
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Relatório de Atendimentos - ${monthLabel}`,
      Author: "Clínica Sapere",
    },
  });

  // Configurar resposta HTTP
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="relatorio-atendimentos-${year}-${String(month).padStart(2, "0")}.pdf"`
  );
  doc.pipe(res);

  const pageWidth = doc.page.width - 100; // margens
  const ORANGE = "#E8610A";
  const GRAY = "#6B7280";
  const LIGHT_GRAY = "#F3F4F6";
  const DARK = "#111827";

  // ─── CABEÇALHO ───────────────────────────────────────────────────────────────
  // Faixa laranja no topo
  doc.rect(0, 0, doc.page.width, 80).fill(ORANGE);

  doc.fillColor("white")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("Clínica Sapere", 50, 22);

  doc.fillColor("white")
    .fontSize(11)
    .font("Helvetica")
    .text("Relatório de Atendimentos", 50, 48);

  // Mês/ano no canto direito do cabeçalho
  doc.fillColor("white")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(monthLabel, 50, 30, { align: "right" });

  doc.moveDown(3);

  // ─── RESUMO GERAL ────────────────────────────────────────────────────────────
  const summaryY = 100;
  doc.rect(50, summaryY, pageWidth, 60).fill(LIGHT_GRAY).stroke("#E5E7EB");

  doc.fillColor(DARK).fontSize(10).font("Helvetica").text("Total de Atendimentos", 70, summaryY + 10);
  doc.fillColor(ORANGE).fontSize(24).font("Helvetica-Bold").text(String(totalGeral), 70, summaryY + 22);

  doc.fillColor(DARK).fontSize(10).font("Helvetica").text("Terapeutas Ativos", 220, summaryY + 10);
  doc.fillColor(ORANGE).fontSize(24).font("Helvetica-Bold").text(String(sortedGroups.length), 220, summaryY + 22);

  const media = sortedGroups.length > 0 ? Math.round(totalGeral / sortedGroups.length) : 0;
  doc.fillColor(DARK).fontSize(10).font("Helvetica").text("Média por Terapeuta", 370, summaryY + 10);
  doc.fillColor(ORANGE).fontSize(24).font("Helvetica-Bold").text(String(media), 370, summaryY + 22);

  doc.moveDown(1);
  let currentY = summaryY + 80;

  // ─── TABELAS POR TERAPEUTA ───────────────────────────────────────────────────
  for (const group of sortedGroups) {
    // Verificar se precisa de nova página (cabeçalho do terapeuta + pelo menos 2 linhas)
    if (currentY > doc.page.height - 150) {
      doc.addPage();
      currentY = 50;
    }

    // Cabeçalho do terapeuta
    doc.rect(50, currentY, pageWidth, 28).fill(ORANGE);
    doc.fillColor("white")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(group.therapistName, 60, currentY + 8);
    doc.fillColor("white")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(`${group.total} atendimentos`, 60, currentY + 8, { align: "right", width: pageWidth - 20 });

    currentY += 28;

    // Especialidades resumidas
    const specialties = Object.entries(group.byTherapyType)
      .map(([type, count]) => `${THERAPY_TYPE_LABELS[type] || type}: ${count}`)
      .join("  |  ");

    doc.rect(50, currentY, pageWidth, 18).fill("#FFF7ED").stroke("#FED7AA");
    doc.fillColor(GRAY)
      .fontSize(8)
      .font("Helvetica")
      .text(specialties, 60, currentY + 5, { width: pageWidth - 20 });

    currentY += 18;

    // Cabeçalho da tabela
    doc.rect(50, currentY, pageWidth, 20).fill("#F9FAFB").stroke("#E5E7EB");
    doc.fillColor(GRAY).fontSize(8).font("Helvetica-Bold");
    doc.text("DATA", 60, currentY + 6);
    doc.text("DIA", 130, currentY + 6);
    doc.text("HORÁRIO", 165, currentY + 6);
    doc.text("PACIENTE", 225, currentY + 6);
    doc.text("TERAPIA", 420, currentY + 6);

    currentY += 20;

    // Linhas da tabela
    for (let i = 0; i < group.records.length; i++) {
      const record = group.records[i];

      // Nova página se necessário
      if (currentY > doc.page.height - 80) {
        doc.addPage();
        currentY = 50;

        // Repetir cabeçalho da tabela na nova página
        doc.rect(50, currentY, pageWidth, 20).fill("#F9FAFB").stroke("#E5E7EB");
        doc.fillColor(GRAY).fontSize(8).font("Helvetica-Bold");
        doc.text("DATA", 60, currentY + 6);
        doc.text("DIA", 130, currentY + 6);
        doc.text("HORÁRIO", 165, currentY + 6);
        doc.text("PACIENTE", 225, currentY + 6);
        doc.text("TERAPIA", 420, currentY + 6);
        currentY += 20;
      }

      const rowBg = i % 2 === 0 ? "white" : "#F9FAFB";
      doc.rect(50, currentY, pageWidth, 18).fill(rowBg).stroke("#E5E7EB");

      doc.fillColor(DARK).fontSize(8).font("Helvetica");
      doc.text(formatDate(record.sessionDate), 60, currentY + 5);
      doc.text(formatDayOfWeek(record.sessionDate), 130, currentY + 5);
      doc.text(formatTime(record.sessionDate), 165, currentY + 5);
      doc.text(record.patientName, 225, currentY + 5, { width: 185, ellipsis: true });
      doc.text(THERAPY_TYPE_LABELS[record.therapyType] || record.therapyType, 420, currentY + 5, { width: 120, ellipsis: true });

      currentY += 18;
    }

    currentY += 16; // espaço entre terapeutas
  }

  // ─── RODAPÉ ──────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 40;
  doc.rect(0, footerY, doc.page.width, 40).fill(LIGHT_GRAY);
  doc.fillColor(GRAY)
    .fontSize(8)
    .font("Helvetica")
    .text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — Clínica Sapere`,
      50,
      footerY + 14,
      { align: "center", width: pageWidth }
    );

  doc.end();
}
