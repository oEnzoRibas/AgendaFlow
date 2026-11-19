# AgendaFlow

O AgendaFlow é uma plataforma demonstrativa de agendamentos para pequenos negócios. O Studio Bloom, a equipe e os clientes de demonstração são fictícios.

## Executar a demonstração

Pré-requisito: Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000).

| Rota | Experiência |
| --- | --- |
| `/` | Apresentação do AgendaFlow |
| `/estudio` | Salão e catálogo demonstrativos |
| `/agendar` | Escolha do serviço, profissional, data, horário e perfil fictício |
| `/demo/painel` | Indicadores e acesso a todos os módulos com dados fictícios |
| `/login` | Login administrativo com e-mail e senha |
| `/admin/painel` | Área do proprietário autenticado |
| `/estudio?modo=real` | Salão vinculado ao Supabase |
| `/agendar?modo=real` | Agendamento público vinculado ao Supabase |

A demonstração funciona sem conta e sem variáveis de ambiente. As alterações ficam no navegador. A base fictícia é renovada a cada dia no fuso de São Paulo e pode ser reiniciada pela barra lateral. As reservas demonstrativas usam perfis fictícios e aparecem imediatamente na agenda do mesmo navegador.

## Configurar o Supabase

### Supabase local

1. Inicie o Docker e execute `npx supabase@3.2.0 start --exclude studio,storage-api,imgproxy,edge-runtime,logflare,vector,realtime,postgres-meta,supavisor`. A CLI aplica a migração e a carga inicial. A API usa a porta 55321 e o PostgreSQL, a 55322.
2. Copie `.env.example` para `.env.local`. Preencha `NEXT_PUBLIC_SUPABASE_URL` com o endereço da API local e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave publicável retornada pela CLI. Mantenha `AGENDAFLOW_BUSINESS_SLUG=studio-bloom`.
3. Crie uma conta administrativa de teste no Supabase Auth. A CLI local usa cadastro público desativado. Para provisionar uma conta, use a API administrativa do Auth com uma chave secreta local. Defina `email_confirm: true` para o teste local. Mantenha a chave secreta no ambiente do comando que provisiona a conta.
4. Vincule o UUID da conta ao negócio pelo comando abaixo. Após iniciar ou reiniciar o Next.js, acesse `/login`. Use `/agendar?modo=real` para testar o portal integrado.

Para criar uma conta sintética no Supabase local pelo PowerShell:

```powershell
$supabase = npx.cmd --yes supabase@3.2.0 status -o json | ConvertFrom-Json
$senha = Read-Host 'Senha da conta local' -MaskInput
$conta = Invoke-RestMethod -Method Post -Uri "$($supabase.API_URL)/auth/v1/admin/users" `
  -Headers @{ apikey = $supabase.SECRET_KEY; Authorization = "Bearer $($supabase.SECRET_KEY)" } `
  -ContentType 'application/json' `
  -Body (@{ email = 'admin@example.com'; password = $senha; email_confirm = $true } | ConvertTo-Json)
$conta.id
```

### Projeto hospedado no Supabase

1. No SQL Editor, rode `supabase/migrations/20261119000100_agendaflow.sql` e depois `supabase/seed.sql`. Para aplicar somente a migração via CLI, use `supabase link --project-ref <referência>` e `supabase db push`, a partir da raiz do projeto.
2. Em **Authentication → Users**, crie um usuário com senha e e-mail confirmado. Use seu UUID para vincular a conta. Configure o provedor de e-mail do projeto conforme o processo de criação de contas adotado.
3. Preencha `.env.local` com a URL do projeto, a chave **publishable** e o slug. As únicas credenciais usadas pela aplicação são a chave publicável e a sessão Supabase Auth.

### Vincular conta e abrir reservas

Execute no SQL Editor ou via `psql`, trocando o UUID pelo da conta criada. O vínculo autoriza apenas essa conta a administrar o estabelecimento. O catálogo fica fechado após a carga inicial até que `public_booking` seja habilitado.

```sql
update public.businesses
set owner_id = '<UUID do usuário>'::uuid,
    public_booking = true
where slug = 'studio-bloom';
```

## Funcionamento

- O Next.js App Router reúne o portal público, as páginas administrativas e as operações de servidor. O agendamento usa React Hook Form e Zod. A interface usa Tailwind CSS, componentes no padrão shadcn/ui, Radix UI, Lucide e Recharts.
- PostgreSQL grava os horários como `timestamptz` e calcula a agenda no fuso IANA do salão. As vagas são ofertadas em passos de 15 minutos, com antecedência máxima de 60 dias. Expediente e turnos aceitam um intervalo por dia da semana. O intervalo após o atendimento ocupa a agenda do profissional.
- A reserva revalida o horário e grava cliente e agendamento na mesma transação. A operação bloqueia a linha do estabelecimento enquanto valida e grava a reserva. Uma restrição de exclusão por profissional também impede sobreposições. Reservas e bloqueios usam intervalos com início inclusivo e fim exclusivo. Cancelamentos liberam o horário. Remarcações refazem a validação e preservam o valor contratado.
- RLS restringe leitura administrativa ao proprietário do estabelecimento. As funções públicas entregam catálogo e horários e aceitam novas reservas. As alterações administrativas passam por uma função que verifica a identidade do proprietário. A demonstração usa uma base sintética independente no navegador.
- A receita estimada soma os valores registrados dos atendimentos confirmados e concluídos, incluindo reservas futuras. O gráfico conta os mesmos status no período selecionado.

## Verificação

```bash
npm run typecheck
npm test
npm run build
npm start
```

Para executar a integração em um Supabase **local**, informe a URL e as duas chaves retornadas por `supabase status -o json` às variáveis `AGENDAFLOW_TEST_SUPABASE_URL`, `AGENDAFLOW_TEST_PUBLISHABLE_KEY` e `AGENDAFLOW_TEST_SECRET_KEY`. Em seguida, execute `npm run test:integration`. O teste cria e remove seu próprio negócio e duas contas sintéticas. Ele cobre login, RLS, disputa pelo mesmo horário, bloqueios, remarcação e cancelamento.

A imagem do salão foi criada para o projeto com geração de imagens.
