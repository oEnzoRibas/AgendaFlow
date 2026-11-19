# Testes e validação

| Comando | Verificação |
| --- | --- |
| `npm run lint` | Regras Next.js, React e TypeScript |
| `npm run typecheck` | Tipos TypeScript sem emissão |
| `npm test` | Seis cenários unitários em `tests/schedule.test.ts` |
| `npm run test:integration` | Cenário completo contra Supabase local |
| `npm audit --omit=dev --audit-level=high` | Advisories de dependências de produção |
| `npm run build` | Compilação e páginas de produção com Webpack |

Os testes unitários cobrem fuso e data civil, expediente e turno, duração e horizonte, bloqueio e intervalo, profissional/serviço inativo ou sem vínculo, conflitos, remarcação, cancelamento e validação de entradas. O relógio é injetado para estabilizar os casos.

A integração cria um estabelecimento isolado e duas contas sintéticas. Verifica claims, leitura do proprietário, isolamento de outra conta e de visitantes, bloqueio de escrita direta, acesso para remarcação, disputa por horário, rollback de cliente, bloqueio, remarcação e cancelamento. O caso limpa seus registros ao terminar e rejeita URLs que não sejam HTTP em loopback.

## Integração local

Inicie o Supabase pelo [guia de instalação](getting-started.md). Exemplo em PowerShell:

```powershell
$supabase = npx.cmd --yes supabase@3.2.0 status -o json | ConvertFrom-Json
$env:AGENDAFLOW_TEST_SUPABASE_URL = $supabase.API_URL
$env:AGENDAFLOW_TEST_PUBLISHABLE_KEY = $supabase.PUBLISHABLE_KEY
$env:AGENDAFLOW_TEST_SECRET_KEY = $supabase.SECRET_KEY
try { npm.cmd run test:integration }
finally {
  Remove-Item Env:AGENDAFLOW_TEST_SUPABASE_URL,Env:AGENDAFLOW_TEST_PUBLISHABLE_KEY,Env:AGENDAFLOW_TEST_SECRET_KEY
}
```

O workflow de CI roda sem banco. As verificações manuais úteis incluem concluir uma reserva fictícia, abrir o recibo e a agenda, alternar a semana, remarcar, cancelar e verificar o crédito em telas estreitas. No modo conectado, confira o redirecionamento sem sessão e teste o proprietário com conta sintética.
