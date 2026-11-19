# Consistência de agendamentos no PostgreSQL

**Estado:** implementada.

Duração, intervalo, bloqueios e expediente interferem na mesma confirmação. `create_booking` e `manage_agenda` obtêm um lock por estabelecimento, validam o horário dentro da transação e gravam sob a restrição de exclusão por profissional. O PostgreSQL usa intervalos semiabertos e armazena instantes.

A posição da lógica evita depender da atualização instantânea da interface. A granularidade por estabelecimento serializa escritas, inclusive entre profissionais distintos, e simplifica a consistência entre alterações de disponibilidade e reservas.
