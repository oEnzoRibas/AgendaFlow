# Demonstração com armazenamento do navegador

**Estado:** implementada.

O portfólio precisava permitir que o visitante concluísse a jornada sem conta. A demo monta um `Workspace` sintético relativo ao relógio, persiste por origem e reinicia em um novo dia de São Paulo. Web Locks serializa gravações entre abas quando disponível. Sem armazenamento persistente, o estado fica na memória da página.

O custo é manter paridade das regras entre a simulação TypeScript e o PostgreSQL, e aceitar que a demo é descartável e específica do navegador. Essa escolha reduz o risco de expor dados reais e mantém o fluxo acessível sem credenciais.
