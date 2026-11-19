# Diagnóstico

| Sintoma | Verificação e recuperação |
| --- | --- |
| Comando npm bloqueado no PowerShell | Use `npm.cmd` e `npx.cmd` |
| Porta 3000 abre outro sistema | Rode `npm run dev -- --port 3320` e confirme o título AgendaFlow |
| Login desabilitado | Verifique as duas variáveis Supabase e reinicie o Next.js |
| Login válido, painel sem vínculo | Compare o UUID de Auth com `businesses.owner_id` e confira o slug |
| Catálogo real indisponível | Verifique URL, chave publicável, migração, slug e `public_booking` |
| Sem vagas para um profissional | Confira vínculo e status do serviço, expediente, turno, bloqueios, agendamentos, duração e fuso |
| Conflito ao confirmar | Recarregue as vagas e escolha outra. O PostgreSQL pode rejeitar uma vaga ocupada entre consulta e confirmação |
| Dados da demo desapareceram | A base muda com o dia em São Paulo. Navegação privada, limpeza das configurações ou falta de localStorage afetam persistência |
| Integração falha ao provisionar conta | Confira os containers e use chaves do mesmo projeto local. Evite imprimir o JSON do status em logs compartilhados |
| Build falha após interrupção | Encerre processos Next.js do checkout. Remova ou mova apenas o diretório gerado `.next` e execute `npm run build` |
| CI falha no audit | Leia o aviso, confirme o caminho da dependência e atualize o pacote ou registre a mitigação antes de aceitar a mudança |

Ao abrir uma issue, informe rota, modo, ambiente e passos mínimos com dados sintéticos. Relatos sensíveis seguem o [canal privado](../SECURITY.md).
