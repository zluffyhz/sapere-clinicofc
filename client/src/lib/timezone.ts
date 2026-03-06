/**
 * Utilitário de timezone para a Clínica Sapere.
 * Todos os horários são exibidos no fuso horário de Brasília (America/Sao_Paulo),
 * independente do timezone configurado no dispositivo do usuário.
 */
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const CLINIC_TIMEZONE = "America/Sao_Paulo";

/**
 * Formata uma data UTC para exibição no timezone da clínica (Brasília).
 * Substitui o `format` do date-fns em todos os contextos de exibição de horário.
 */
export function formatBRT(date: Date | string | number, fmt: string): string {
  return formatInTimeZone(new Date(date), CLINIC_TIMEZONE, fmt, { locale: ptBR });
}

/**
 * Converte uma string de data/hora local (ex: "2026-03-06T15:00:00")
 * interpretando-a como horário de Brasília, e retorna um Date UTC correto.
 * Usado ao criar/editar agendamentos a partir de inputs de formulário.
 */
export function parseBRTDateTime(dateStr: string, timeStr: string): Date {
  // Combina "2026-03-06" + "15:00" como se fosse horário de Brasília
  const localDateTimeStr = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(localDateTimeStr, CLINIC_TIMEZONE);
}

/**
 * Extrai a data no formato "yyyy-MM-dd" no timezone de Brasília.
 */
export function getBRTDateString(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), CLINIC_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Extrai o horário no formato "HH:mm" no timezone de Brasília.
 */
export function getBRTTimeString(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), CLINIC_TIMEZONE, "HH:mm");
}

/**
 * Verifica se duas datas são o mesmo dia no timezone de Brasília.
 */
export function isSameDayBRT(date1: Date | string | number, date2: Date | string | number): boolean {
  return getBRTDateString(date1) === getBRTDateString(date2);
}
