/**
 * Utilitário de feriados para Manaus/AM/Brasil
 * Inclui feriados nacionais, estaduais (AM) e municipais (Manaus)
 */

type HolidayInfo = {
  name: string;
  scope: "nacional" | "estadual" | "municipal";
};

/**
 * Calcula a data da Páscoa para um determinado ano
 * Algoritmo de Meeus/Jones/Butcher
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Retorna todos os feriados de um determinado ano
 */
function getHolidaysForYear(year: number): Map<string, HolidayInfo> {
  const holidays = new Map<string, HolidayInfo>();

  // Helper para criar chave no formato "YYYY-MM-DD"
  const key = (month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // --- Feriados Nacionais (fixos) ---
  holidays.set(key(1, 1), { name: "Ano Novo", scope: "nacional" });
  holidays.set(key(4, 21), { name: "Tiradentes", scope: "nacional" });
  holidays.set(key(5, 1), { name: "Dia do Trabalho", scope: "nacional" });
  holidays.set(key(9, 7), { name: "Independência do Brasil", scope: "nacional" });
  holidays.set(key(10, 12), { name: "Nossa Senhora Aparecida", scope: "nacional" });
  holidays.set(key(11, 2), { name: "Finados", scope: "nacional" });
  holidays.set(key(11, 15), { name: "Proclamação da República", scope: "nacional" });
  holidays.set(key(11, 20), { name: "Consciência Negra", scope: "nacional" });
  holidays.set(key(12, 25), { name: "Natal", scope: "nacional" });

  // --- Feriado Estadual do Amazonas (fixo) ---
  holidays.set(key(9, 5), { name: "Elevação do Amazonas", scope: "estadual" });

  // --- Feriados Municipais de Manaus (fixos) ---
  holidays.set(key(10, 24), { name: "Aniversário de Manaus", scope: "municipal" });
  holidays.set(key(12, 8), { name: "N. Sra. da Conceição", scope: "municipal" });

  // --- Feriados Móveis (baseados na Páscoa) ---
  const easter = getEasterDate(year);

  // Carnaval (terça) = Páscoa - 47 dias
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  holidays.set(
    `${year}-${String(carnival.getMonth() + 1).padStart(2, "0")}-${String(carnival.getDate()).padStart(2, "0")}`,
    { name: "Carnaval", scope: "municipal" }
  );

  // Sexta-feira Santa = Páscoa - 2 dias
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.set(
    `${year}-${String(goodFriday.getMonth() + 1).padStart(2, "0")}-${String(goodFriday.getDate()).padStart(2, "0")}`,
    { name: "Sexta-feira Santa", scope: "nacional" }
  );

  // Corpus Christi = Páscoa + 60 dias
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.set(
    `${year}-${String(corpusChristi.getMonth() + 1).padStart(2, "0")}-${String(corpusChristi.getDate()).padStart(2, "0")}`,
    { name: "Corpus Christi", scope: "municipal" }
  );

  return holidays;
}

// Cache por ano para evitar recálculos
const cache = new Map<number, Map<string, HolidayInfo>>();

/**
 * Verifica se uma data é feriado e retorna informações
 * @param date - Data a verificar
 * @returns HolidayInfo se for feriado, undefined caso contrário
 */
export function getHoliday(date: Date): HolidayInfo | undefined {
  const year = date.getFullYear();
  if (!cache.has(year)) {
    cache.set(year, getHolidaysForYear(year));
  }
  const key = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return cache.get(year)!.get(key);
}

/**
 * Verifica se uma data (string "YYYY-MM-DD") é feriado
 */
export function getHolidayByKey(dateKey: string): HolidayInfo | undefined {
  const year = parseInt(dateKey.substring(0, 4));
  if (!cache.has(year)) {
    cache.set(year, getHolidaysForYear(year));
  }
  return cache.get(year)!.get(dateKey);
}

/**
 * Retorna true se a data for feriado
 */
export function isHoliday(date: Date): boolean {
  return getHoliday(date) !== undefined;
}
