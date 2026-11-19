# Referência de operações

O aplicativo usa Server Actions do Next.js como interface interna. Os identificadores gerados pelo framework não são uma API estável para integrações. A API de dados está disponível no PostgREST do projeto Supabase conforme os grants.

## Server Actions

| Ação | Entrada | Sucesso | Falha esperada |
| --- | --- | --- | --- |
| `listSlots(input, administrative = false)` | `serviceId`, `professionalId`, `day` no formato AAAA-MM-DD e `ignoreId` opcional para remarcação de proprietário | `Result<Slot[]>` em ordem de início | Data/IDs inválidos, sessão ausente para consulta administrativa ou erro de integração |
| `submitBooking(input)` | IDs de serviço e profissional, `startsAt` ISO com offset, `contact` com nome, e-mail e telefone | `Result<Confirmation>` com ID, início, fim e preço em centavos | Entrada inválida, catálogo fechado ou vaga indisponível |
| `manage(input, section)` | Comando `{ action, data }` e seção usada para revalidar a rota | `Result<null>` | Conta sem vínculo, dados inválidos, erro de integridade ou conflito |
| `signIn(previous, form)` | FormData com `email` e `password` | Cookie e redirecionamento para `/admin/painel` | Mensagem para `useActionState` |
| `signOut()` | Sessão das cookies | Logout local e redirecionamento para `/login` | A rota de login é usada após a tentativa de encerrar sessão |

`Result<T>` é `{ ok: true, value: T }` ou `{ ok: false, error: string }`. `Slot` contém `starts_at`, `ends_at`, `busy_until` e `price_cents`. Os detalhes de infraestrutura podem lançar erro fora de uma falha esperada.

## RPCs do PostgreSQL

| Função | Argumentos | Acesso e retorno |
| --- | --- | --- |
| `booking_catalog` | `p_slug text` | Anônimo/autenticado. JSON com negócio, serviços e profissionais ativos e vínculos ativos se reservas estiverem abertas |
| `available_slots` | `p_slug text`, `p_service uuid`, `p_professional uuid`, `p_day date`, `p_ignore uuid default null` | Anônimo/autenticado. Linhas de vagas disponíveis. Somente o proprietário pode usar `p_ignore` ou consultar catálogo fechado |
| `create_booking` | Slug, UUIDs de serviço e profissional, `p_start timestamptz`, contato | Anônimo/autenticado para negócio aberto. Retorna JSON com ID, início, fim e preço |
| `manage_agenda` | `p_business uuid`, `p_action text`, `p_data jsonb` | Autenticado e proprietário. Aplica mutação em transação e retorna `void` |

Os comandos administrativos são `client`, `service`, `professional`, `settings`, `block`, `unblock` e `appointment`. IDs são opcionais em cadastros novos. `professional` recebe `service_ids` e `hours`. `settings` recebe horário por dia, nome, descrição, fuso, intervalo e abertura pública. `block` recebe profissional, início, fim e motivo. `appointment` requer ID e operação `reschedule` com novo início, `cancelled` ou `completed`.

| SQLSTATE | Causa tratada pela aplicação |
| --- | --- |
| `23P01` | Horário indisponível ou sobreposição |
| `23505` / `23503` | Cadastro duplicado ou relação inválida |
| `23514` / `22023` | Constraint, parâmetro ou estado inválido |
| `42501` | Acesso insuficiente |

Consulte [o schema Zod](../lib/model.ts) e [a migração](../supabase/migrations/20261119000100_agendaflow.sql) para exemplos de campos e limites exatos.
