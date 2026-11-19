# Desenvolvimento

Use uma branch por mudança e siga o [guia de contribuição](../CONTRIBUTING.md). A CI usa Node 24, instala o lockfile e executa os mesmos comandos usados localmente.

## Convenções

- Preserve a separação entre rotas, componentes e regras de negócio. Mantenha funções puras de domínio em `lib/` e efeitos em ações, adaptadores ou store.
- Use TypeScript estrito, nomes em inglês para contratos e identificadores, e português brasileiro nos textos da interface e na documentação. Nomeie rotas conforme o vocabulário do produto.
- Valide as entradas de rede e do usuário com Zod. Use `Result<T>` para falhas esperadas. Valide novamente permissões e invariantes no banco quando a operação for privilegiada.
- Use os componentes compartilhados e tokens CSS existentes. Preserve foco, estados vazios, carregamento e mensagens de erro.
- Trate o instante de um agendamento como ISO 8601 com offset ou UTC. Use data civil AAAA-MM-DD para consultar dias da agenda e valores monetários inteiros em centavos.
- O ESLint usa flat config com as regras Next.js e TypeScript compatíveis com a versão instalada. A linha 9 é mantida aqui pela compatibilidade com os peers de `eslint-config-next@16.4.6`. Revise a compatibilidade antes da atualização de major.

## Alterar uma regra

1. Identifique as rotas e componentes no [mapa do código](codebase-guide.md).
2. Ajuste o contrato em `lib/model.ts` e a implementação demonstrativa em `lib/`.
3. Para o modo conectado, crie uma nova migração quando o schema publicado já tiver sido aplicado. Atualize `lib/supabase/database.ts` e a ação do servidor. Revise os privilégios com a sessão de proprietário e com uma conta sem vínculo.
4. Atualize os casos correspondentes em `tests/` com dados determinísticos ou sintéticos. Atualize a referência e as capturas se a experiência visível mudar.
5. Rode `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Mudanças de SQL e autorização pedem também a [integração local](testing.md).
