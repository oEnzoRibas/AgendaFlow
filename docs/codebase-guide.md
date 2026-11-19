# Guia do código-fonte

## Rotas e infraestrutura Next.js

| Caminho | Entrada e saída | Efeito e ponto de extensão |
| --- | --- | --- |
| `app/page.tsx` | Landing estática com links para demonstração, estúdio e login | Altere a comunicação do portfólio aqui |
| `app/estudio/page.tsx` | `modo=real` consulta `booking_catalog`; o padrão usa catálogo sintético | Encaminha a seleção para `/agendar` preservando o modo |
| `app/agendar/page.tsx` | `modo=real`, `servico` e catálogo inicial | Exibe indisponibilidade no modo conectado quando o catálogo não carrega |
| `app/login/page.tsx` | Configuração Supabase e sessão atual | Visitante pode abrir a demo. Proprietário autenticado segue para o painel |
| `app/demo/[section]/page.tsx` | Seção permitida e data/reserva opcionais | Renderiza o workspace local. `/demo` redireciona para o painel |
| `app/admin/[section]/page.tsx` | Seção, query e contexto da sessão | Redireciona anônimo, trata conta sem vínculo e carrega `getWorkspace`. `/admin` redireciona para o painel |
| `app/layout.tsx`, `app/loading.tsx`, `app/error.tsx` | Metadados, composição e estados de rota | Layout inclui o rodapé compartilhado. Boundary disponibiliza tentativa novamente |
| `proxy.ts` | Requisições para login e admin | Transfere cookies renovados para o request/render e para a resposta ao navegador. Define cache privado |
| `app/actions.ts` | Dados de formulário e argumentos das operações | É o limite servidor/cliente. Consulte [contratos](api-reference.md) antes de alterar |

Seções aceitas: `painel`, `agenda`, `clientes`, `servicos`, `profissionais` e `configuracoes`. Agenda aceita `dia` e `reserva` para abrir um atendimento específico.

## Componentes

| Elemento | Contrato e responsabilidades |
| --- | --- |
| `Studio` | Recebe catálogo e modo. Na demo assina alterações locais. Filtra o catálogo e liga cada serviço à reserva |
| `Booking` / `BookingFlow` | Recebem catálogo e serviço inicial. Orquestram serviço, profissional, data, identificação e recibo. Validam o formulário com React Hook Form e Zod |
| `useSlots` | Recebe consulta, workspace demonstrativo opcional e sinal administrativo. Calcula localmente ou chama a ação, protege a UI contra respostas obsoletas e fornece `refresh` |
| `WorkspaceView` | Recebe a seção e, no modo conectado, o workspace autorizado. Centraliza validação e encaminha alterações à demo ou à ação administrativa |
| `Overview` | Deriva métricas e séries a partir dos agendamentos e clientes. Exclui cancelados dos indicadores do dia, receita e gráfico |
| `Agenda` / `Details` | Filtram por data, status e profissional. Detalhes consultam nova disponibilidade; mutações atualizam a agenda via `Save` |
| `Clients`, `Services`, `Professionals`, `Settings` | Recebem `Workspace` e `Save`. Compõem comandos discriminados. Form e HoursEditor administram pendência, erro e expediente |
| `LoginForm` | Recebe disponibilidade da integração. Usa `useActionState` para status e erros |
| `Button`, `Dialog` | Primitivas reutilizáveis. `Button` pode estilizar um link via Slot do Radix. `Dialog` fornece overlay e controle de foco |
| `Brand`, `Alert`, `Empty`, `Loading`, `Footer` | Unificam marca, feedback, estados vazios e autoria |

## Domínio e dados

| Elemento | Entrada, saída e invariantes |
| --- | --- |
| `lib/model.ts` | Schemas Zod produzem os tipos de contato, consulta, reserva e comando. `Workspace` reúne catálogo, clientes, agenda, expediente e bloqueios. `Result<T>` diferencia sucesso tipado de falha de domínio |
| `lib/schedule.ts` | `dayIn` e `timeLabel` interpretam instantes no fuso fornecido. `shiftDay` e `startOfWeekKey` operam em datas civis. `localInstant` converte data/hora e zona. `overlaps` usa limites semiabertos. `getSlots` é puro, com relógio injetável |
| `lib/demo.ts` | `makeDemo` gera fixtures relativas ao relógio. `simulateBooking` exige perfil fictício e valida vaga. `simulateManagement` aplica comandos ao workspace e retorna o próximo estado ou erro |
| `lib/demo-store.ts` | `useDemo` assina snapshot. `changeDemo` lê o estado atual, executa a operação e persiste sucesso. `resetDemo` remove o snapshot. A sincronização usa `storage`, foco e eventos locais |
| `lib/supabase/config.ts` | Concentra URL, chave publicável e slug. Sem configuração completa, o modo conectado retorna indisponibilidade |
| `lib/supabase/database.ts` | Descreve tabelas e RPCs utilizadas pelo cliente TypeScript. Atualize junto com a migração |
| `lib/supabase/server.ts` | `publicClient` não usa sessão. `sessionClient` usa cookies. `adminContext` verifica claims e escopo. `getWorkspace` lê as tabelas paginadas e normaliza horas para o formulário |
| `supabase/migrations/` | Fonte de verdade para integridade, autorização e disponibilidade conectada |
| `tests/` | Cobre disponibilidade, fuso, intervalo, bloqueio, concorrência e isolamento. Veja [a matriz de testes](testing.md) |

Ao alterar horário de expediente ou cálculo de disponibilidade, revise `getSlots`, `available_slots`, as duas operações de reserva e a cobertura das fronteiras. Ao adicionar campos às mutações, mantenha os schemas Zod, os tipos e as constraints SQL coerentes.
