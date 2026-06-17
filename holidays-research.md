# Pesquisa: Feriados para a Agenda da Sapere Clinic (Manaus/AM)

## Fontes
- Governo Federal: Portaria MGI nº 11.460/2025 (calendário oficial 2026)
- Prefeitura de Manaus: DOM edição 6251 de 11/02/2026
- Lei Estadual nº 25/1977 (feriado estadual 5 de setembro)
- Lei Orgânica do Município de Manaus (art. 437)

## Feriados Nacionais (fixos, recorrentes todo ano)
| Data | Nome |
|------|------|
| 01/01 | Confraternização Universal (Ano Novo) |
| 21/04 | Tiradentes |
| 01/05 | Dia do Trabalho |
| 07/09 | Independência do Brasil |
| 12/10 | Nossa Senhora Aparecida |
| 02/11 | Finados |
| 15/11 | Proclamação da República |
| 20/11 | Consciência Negra |
| 25/12 | Natal |

## Feriados Nacionais (móveis - variam por ano)
| Data 2026 | Nome | Regra |
|-----------|------|-------|
| 03/04/2026 | Sexta-feira Santa (Paixão de Cristo) | Sexta antes da Páscoa |

## Feriado Estadual do Amazonas (fixo)
| Data | Nome |
|------|------|
| 05/09 | Elevação do Amazonas à categoria de Província |

## Feriados Municipais de Manaus (fixos)
| Data | Nome |
|------|------|
| 24/10 | Elevação de Manaus à categoria de Cidade |
| 08/12 | Dia de Nossa Senhora da Conceição (Padroeira de Manaus) |

## Feriados Religiosos observados em Manaus (fixos por lei municipal)
| Data | Nome |
|------|------|
| Terça de Carnaval (móvel) | Carnaval (Lei Municipal nº 448/1998) |
| Corpus Christi (móvel) | Corpus Christi (Lei Municipal nº 970/2006) |

## Resumo para implementação (datas fixas + móveis)

### Datas fixas (dia/mês, todo ano):
1. 01/01 - Ano Novo (Nacional)
2. 21/04 - Tiradentes (Nacional)
3. 01/05 - Dia do Trabalho (Nacional)
4. 05/09 - Elevação do Amazonas (Estadual)
5. 07/09 - Independência do Brasil (Nacional)
6. 12/10 - Nossa Senhora Aparecida (Nacional)
7. 24/10 - Aniversário de Manaus (Municipal)
8. 02/11 - Finados (Nacional)
9. 15/11 - Proclamação da República (Nacional)
10. 20/11 - Consciência Negra (Nacional)
11. 25/12 - Natal (Nacional)
12. 08/12 - Nossa Senhora da Conceição (Municipal)

### Datas móveis (calculadas pela Páscoa):
1. Carnaval (terça) = Páscoa - 47 dias
2. Sexta-feira Santa = Páscoa - 2 dias
3. Corpus Christi = Páscoa + 60 dias

### Cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher):
A Páscoa é calculada anualmente. Para os próximos anos:
- 2025: 20 de abril
- 2026: 5 de abril
- 2027: 28 de março
- 2028: 16 de abril
- 2029: 1 de abril
- 2030: 21 de abril
