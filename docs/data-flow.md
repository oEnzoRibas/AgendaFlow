# Fluxos de dados

## Jornada da reserva

```mermaid
flowchart TD
    E["Landing ou /estudio"] --> A["/agendar: escolher serviço"]
    A --> P["Escolher profissional vinculado"]
    P --> H["Selecionar data e horário"]
    H --> M{"Modo"}
    M -->|Demo| D["Selecionar perfil fictício"]
    M -->|Conectado| C["Preencher nome, e-mail e telefone"]
    D --> S["Confirmar"]
    C --> S
    S --> R{"Vaga permanece disponível?"}
    R -->|Sim| F["Mostrar resumo e referência"]
    R -->|Não| H
    F -->|Demo| G["Abrir detalhes em /demo/agenda"]
```

A demonstração revalida em TypeScript com o snapshot atual. O modo conectado carrega catálogo no servidor, consulta disponibilidade por ação e envia a confirmação para PostgreSQL. Em caso de conflito, a interface retorna à seleção e atualiza as vagas.

## Dados por origem e destino

```mermaid
flowchart LR
    C["Catálogo e seleção da reserva"] --> Q["useSlots"]
    Q -->|Demo| M["Workspace sintético"]
    Q -->|Conectado| A["listSlots"]
    M <--> L["localStorage / memória"]
    A --> R["available_slots"]
    R --> T["Expediente, bloqueios e agendamentos"]
    C --> F["Checkout validado"]
    F -->|Demo| D["simulateBooking via changeDemo"]
    F -->|Conectado| B["submitBooking"]
    D --> L
    B --> P["create_booking"]
    P --> X["clients + appointments"]
```

A persistência demonstrativa é isolada por origem do navegador e retorna à base inicial quando o snapshot do dia deixa de ser válido. A instalação conectada guarda registros em PostgreSQL. Somente a leitura administrativa autorizada recebe contatos cadastrados.

## Sequência de reserva conectada

```mermaid
sequenceDiagram
    actor Cliente
    participant B as BookingFlow
    participant N as Server Actions
    participant P as PostgreSQL
    Cliente->>B: Seleciona serviço, profissional e dia
    B->>N: listSlots
    N->>P: available_slots
    P-->>B: Instantes e preços
    Cliente->>B: Confirma dados e início
    B->>N: submitBooking
    N->>N: Valida bookingSchema
    N->>P: create_booking
    P->>P: Bloqueia a linha do estabelecimento
    P->>P: Consulta vaga e valida relógio e contato
    alt Vaga válida
        P->>P: Localiza ou insere cliente e insere agendamento
        P-->>N: Confirmação
        N-->>B: Referência, horários e preço
    else Vaga indisponível
        P-->>N: SQLSTATE 23P01
        N-->>B: Mensagem e atualização da lista
    end
```

A confirmação apresenta apenas os campos necessários ao resumo. A associação a cliente existente usa o e-mail normalizado no mesmo estabelecimento.
