# Auditoria de Terapeutas - Especialidades vs Agendamentos

| Terapeuta | Cadastro | Agendamentos | Inconsistência |
|-----------|----------|--------------|----------------|
| Ana Maria Xavier | neuropsicopedagogia | psicologia:41, psicopedagogia:9 | SIM - agendamentos como psicologia e psicopedagogia |
| ANA PAULA GIRARD | terapia_ocupacional | psicologia:5, terapia_ocupacional:137 | SIM - 5 como psicologia |
| ANDREA AFONSO | fonoaudiologia | fonoaudiologia:443, psicologia:9 | SIM - 9 como psicologia |
| DELLANY | psicologia | fonoaudiologia:4, psicologia:229 | SIM - 4 como fonoaudiologia |
| Kayck Pontes dos Santos | assistente_terapeutico | assistente_terapeutico:44, psicologia:1 | SIM - 1 como psicologia |
| MAGNA CRUZ | nutricao | nutricao:1 | OK |
| Majory Pereira Pontes do Nascimento | fonoaudiologia | fonoaudiologia:102 | OK |
| Marcely Almeida Silva | psicopedagogia, neuropsicopedagogia | psicologia:390, TO:107, neuro:111, fono:1180, psicoped:687 | SIM - muitos tipos fora |
| MARCIA RATIS | nutricao | nutricao:189 | OK |
| Marcos Costa | assistente_terapeutico | assistente_terapeutico:9 | OK |
| MARIA VITORIA | terapia_ocupacional | psicologia:2, terapia_ocupacional:248 | SIM - 2 como psicologia |
| MARIANA | fonoaudiologia | fonoaudiologia:121, psicologia:1 | SIM - 1 como psicologia |
| MAX | musicoterapia | musicoterapia:89 | OK |
| MAYARA COHEN | terapia_ocupacional | terapia_ocupacional:377 | OK |
| Monalisa Reis | psicomotricidade | psicomotricidade:114, outro:16 | VERIFICAR - 16 como "outro" |
| Rayana Santos | psicologia | psicologia:251 | OK |
| REGINA MENEZES | terapia_ocupacional | terapia_ocupacional:505 | OK |
| Renata Guimarães | outro | aplicadora_denver_aba:51, outro:118 | VERIFICAR - cadastro como "outro" mas tem denver/aba |
| Tânia Maria de Souza Madeira | psicologia | psicologia:220, terapia_ocupacional:1 | SIM - 1 como TO |
| Vitória Santos Lira | fisioterapia | fisioterapia:287 | OK |

## Correções automáticas (agendamentos com tipo errado para terapeutas com especialidade clara):
- ANA PAULA GIRARD: 5 psicologia → terapia_ocupacional
- ANDREA AFONSO: 9 psicologia → fonoaudiologia
- MARIA VITORIA: 2 psicologia → terapia_ocupacional
- MARIANA: 1 psicologia → fonoaudiologia
- Kayck Pontes: 1 psicologia → assistente_terapeutico
- Tânia Maria: 1 terapia_ocupacional → psicologia
- DELLANY: 4 fonoaudiologia → psicologia

## Precisam de confirmação do Lucas:
- Ana Maria Xavier: cadastro neuropsicopedagogia, mas tem psicologia:41 e psicopedagogia:9
- Marcely Almeida Silva: cadastro psicopedagogia+neuropsicopedagogia, mas tem fono:1180, psicologia:390, TO:107
- Monalisa Reis: cadastro psicomotricidade, mas tem outro:16
- Renata Guimarães: cadastro "outro", mas tem aplicadora_denver_aba:51
