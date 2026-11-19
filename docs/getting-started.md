# Instalação e configuração

## Demonstração

Use Node.js ≥22, npm e Git. A CI usa Node.js 24. No Windows, use `npm.cmd` e `npx.cmd` se o PowerShell restringir scripts `.ps1`.

```bash
git clone https://github.com/oEnzoRibas/AgendaFlow.git
cd AgendaFlow
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Se a porta estiver ocupada, escolha outra com `npm run dev -- --port 3320` e abra a URL correspondente.

## Supabase local

Com Docker ativo, execute a partir da raiz:

```bash
npx --yes supabase@3.2.0 start --exclude studio,storage-api,imgproxy,edge-runtime,logflare,vector,realtime,postgres-meta,supavisor
```

A CLI aplica a migração e a carga de catálogo fictício. A API usa a porta 55321 e o PostgreSQL, a 55322. Copie `.env.example` para `.env.local` e preencha os campos com os valores locais.

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API local ou hospedada |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável da API. Permissões reais vêm de grants e RLS |
| `AGENDAFLOW_BUSINESS_SLUG` | Estabelecimento selecionado. O padrão é `studio-bloom` |

Crie uma conta sintética confirmada para testar o login. O cadastro público é desabilitado na configuração local. Exemplo em PowerShell 7:

```powershell
$supabase = npx.cmd --yes supabase@3.2.0 status -o json | ConvertFrom-Json
$senha = Read-Host 'Senha da conta local' -MaskInput
$conta = Invoke-RestMethod -Method Post -Uri "$($supabase.API_URL)/auth/v1/admin/users" `
  -Headers @{ apikey = $supabase.SECRET_KEY; Authorization = "Bearer $($supabase.SECRET_KEY)" } `
  -ContentType 'application/json' `
  -Body (@{ email = 'admin@example.com'; password = $senha; email_confirm = $true } | ConvertTo-Json)
$conta.id
```

No Supabase hospedado, crie o usuário em **Authentication → Users**. Aplique a migração conforme o [guia de deploy](deployment.md) antes do vínculo.

## Ativar a conta e as reservas

Pelo SQL Editor ou `psql`, substitua o marcador pelo UUID da conta. A ativação do catálogo é opcional para a administração.

```sql
update public.businesses
set owner_id = '<UUID da conta>'::uuid,
    public_booking = true
where slug = 'studio-bloom';
```

Reinicie o Next.js. Use `/login` para a área administrativa, `/estudio?modo=real` para o catálogo e `/agendar?modo=real` para reservar. Encerre o ambiente local com `npx --yes supabase@3.2.0 stop` quando terminar.

[Documentação oficial da CLI](https://supabase.com/docs/guides/local-development).
