# Presença CEFS — Bloqueio & Reset 20h
- Bloqueio por padrão; só o Aluno de Dia libera
- Reset automático às 20:00 (limpa presenças e volta para bloqueado)
- Abas: TODOS / PRESENTES / AUSENTES
- Live update (evento 'storage' + fallback a cada 1,5s)
- Botão "Recarregar alunos do arquivo" visível somente para @Admin

## Logins
- Aluno de Dia: número + senha **CEFS2025** (marca presença automática)
- Admin: senha **@Admin**

## Passos
npm install
npm run dev

Substitua `src/data/alunos.json` pelo arquivo com 173 alunos.
