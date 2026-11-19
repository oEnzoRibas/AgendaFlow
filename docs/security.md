# Segurança da aplicação

O navegador é uma fronteira de confiança. Seleção de rota, dados de formulário, parâmetros de ações e dados do localStorage podem ser adulterados. Zod valida a entrada das Server Actions. O PostgreSQL controla autorização, consistência de vínculos e concorrência. O isolamento da demo serve para a experiência de portfólio, sem acesso ao banco conectado.

- **Credenciais.** Variáveis `NEXT_PUBLIC_*` contêm somente URL e chave publicável. A chave secreta deve permanecer nos processos de provisionamento ou teste. `.env.local`, caches e builds ficam fora do Git.
- **Sessão.** Supabase Auth valida credenciais. O proxy renova cookies, páginas e ações conferem claims e RLS limita leitura ao proprietário. `manage_agenda` confirma escopo antes da escrita.
- **Dados de clientes.** O catálogo retorna apenas dados públicos de estabelecimento, oferta e equipe. Vagas retornam intervalos e preço. A confirmação omite dados de outros clientes. As leituras de contatos usam sessão autorizada.
- **Agendamento concorrente.** As funções SQL validam a vaga com lock de estabelecimento. FKs compostas e constraint GiST oferecem proteção adicional na gravação.
- **Superfície pública.** A reserva aberta aceita contato informado pelo usuário. Avalie limites de frequência e monitoramento de abuso na borda antes de divulgação ampla. Proteções externas precisam abranger as chamadas ao PostgREST, pois a RPC pública aceita o papel anônimo quando o catálogo está aberto.
- **Operação.** Use ambientes distintos, HTTPS e políticas adequadas de retenção e backup. Preserve a validação do lado do servidor ao configurar proxies e caches. O projeto não possui trilha de auditoria de mutações ou notificação automática.
- **Dependências.** CI consulta advisories do npm. Dependabot mantém propostas de atualização no GitHub quando o recurso está disponível. Revise lockfile e código das dependências antes de aceitar mudanças de major.

Siga a [política de reporte](../SECURITY.md) para comunicações sensíveis.
