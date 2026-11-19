# Auditoria do repositório

Base inspecionada: MVP 0.1.0 do AgendaFlow no commit `6ca56f7`, mais as mudanças de manutenção desta proposta. O repositório GitHub usa `main` como branch padrão. Na inspeção, estava privado, sem licença registrada e sem URL de demonstração informada. O histórico tinha dois commits no branch do MVP. Titularidade de contribuições e possíveis contratos externos exigem confirmação do mantenedor.

## Inventário técnico

| Área | Estado observado |
| --- | --- |
| Linguagens | TypeScript/TSX, JavaScript ESM para configuração, CSS, SQL, TOML, YAML e Markdown |
| Runtime e build | Node.js ≥22, Next.js 16.4.6 App Router, React 19.3.1, TypeScript 5.9.3, Webpack no build |
| UI | Tailwind CSS 4.3.5, componentes locais no padrão shadcn/ui, Radix UI 1.8.1, Lucide 1.76.0, Recharts 3.11.0 |
| Formulários | React Hook Form 7.92.0, resolvers 7.0.7, Zod 4.6.7 |
| Datas | date-fns 4.4.0 e @date-fns/tz 1.5.0 |
| Integrações | Supabase JS 2.119.2, Supabase SSR 0.12.7, Supabase CLI local 3.2.0 e PostgreSQL 17 no ambiente da CLI |
| Operações | Server Actions em `app/actions.ts`, Supabase RPC, consultas administrativas com PostgREST e Supabase Auth |
| Dados | PostgreSQL para o modo conectado, `localStorage` e memória para demonstração, cookies para sessão |
| Componentes compartilhados | `Button`, `Dialog`, `Brand`, `Alert`, `Empty`, `Loading` e `Footer` |
| Testes | Seis cenários unitários com Node Test Runner e uma suíte de integração com Supabase local |
| Ambiente | URL, chave publicável e slug, declarados em `.env.example`. Chave secreta usada somente na preparação de testes e no provisionamento local |
| Entrega | Build Node.js; workflow de CI valida lint, tipos, testes, audit de dependências de runtime e build. Deploy segue o [guia operacional](deployment.md) |
| Arquivos e dependências | Nenhum arquivo vazio de código encontrado no MVP. Artefatos locais, cache e arquivos de ambiente ficam fora do Git. Next.js gera `next-env.d.ts` |

As versões correspondem ao lockfile. O audit npm de dependências de produção estava sem alertas na checagem inicial. Trata-se de uma leitura da base de advisories naquele momento.

## Riscos e pontos de atenção

| Achado | Impacto e estado |
| --- | --- |
| Reserva pública sem controle de frequência no aplicativo | Pode receber spam. A operação só funciona se o estabelecimento publicar o catálogo. Limitação operacional a avaliar antes de uso aberto |
| E-mail usado para deduplicar cliente | A identidade informada no checkout não é verificada por e-mail. O registro existente mantém os dados cadastrais originais |
| Funções SQL privilegiadas | `SECURITY DEFINER` exige revisão de grants, `search_path`, filtros de empresa e autorização a cada alteração |
| Lock por estabelecimento | Serializa escrituras de agenda do salão. Favorece consistência em troca de concorrência de gravação |
| Painel carrega o conjunto de dados | A leitura pagina no servidor em lotes de 500, mas materializa e envia o conjunto para os componentes clientes |
| Schema duplicado no modo demo | Zod e os tipos descrevem contratos, mas as regras de disponibilidade têm implementação TS e SQL. Mudanças precisam revisar ambas |
| Dependências | A ausência de alertas do npm não cobre falhas de lógica, configuração do host ou PostgreSQL |
| Evidências de entrega | O workflow de CI é versionado em Git. Sua execução remota só pode ser confirmada após envio da alteração ao GitHub |

## Pendências documentais tratadas

O README original concentrava instalação e regras básicas. Este conjunto registra os contratos de ações e RPCs, ERD, jornada, configuração de Auth, regressões cobertas, deploy de referência e processo de contribuição. A proposta MIT e a confirmação do canal privado seguem as condições descritas na [política de segurança](../SECURITY.md) e na [decisão de licença](decisions/mit-license-proposal.md).
