<img src="readme-banner.png" alt="Visualização do Open Salon" width="100%" />

# Open Salon: Alternativa Open-Source ao Salonist e Fresha

Aplicativo de agendamento e gestão de negócios para salões, spas, barbearias, estúdios de tatuagem e qualquer negócio baseado em agendamentos. Parte do ecossistema [OpenClaw](https://github.com/openclaw/openclaw). Zero dependências de nuvem — roda localmente com SQLite.

Construído com **Preact + Tailwind CSS v4 + shadcn/ui + Hono + SQLite**. Inclui calendário diário com colunas de equipe, agendamento de compromissos, banco de dados de clientes, catálogo de serviços, estoque de produtos e horários bloqueados.

## O Que É?

Open Salon é uma plataforma de agendamento pronta para produção, projetada para a comunidade OpenClaw. Pense nele como uma alternativa open-source ao **Salonist**, **Fresha**, **Square Appointments**, **Vagaro** ou **Booksy** — um sistema completo de agendamento e gestão de equipe que você pode auto-hospedar, customizar e incorporar em qualquer produto SaaS.

Diferente do Salonist ou Fresha, este roda inteiramente na sua própria infraestrutura. Sem taxas por usuário, sem comissões por agendamento, sem dependência de fornecedor. Gerencie toda a sua operação baseada em agendamentos, do agendamento ao estoque.

## Feito para Negócios Baseados em Agendamentos

Open Salon é **agnóstico de vertical** — configure serviços, preços e equipe para qualquer indústria:

| Indústria | Exemplos de Serviços |
|-----------|---------------------|
| **Barbearias** | Corte de cabelo, barba, Navalha, alinhamento, coloração, corte infantil |
| **Salões de Cabelo** | Corte e penteado, escova, balayage, luzes, tratamento de queratina, extensões |
| **Spas e Massagens** | Massagem sueca, massagem profunda, pedra quente, facial, envolvimento corporal, aromaterapia |
| **Estúdios de Tatuagem** | Consulta, tattoo pequena, peça grande, cobertura, retoques, piercing |
| **Salões de Unhas** | Manicure, pedicure, unhas em gel, acrílico, nail art, dip powder |
| **Estúdios de Cílios e Sobrancelhas** | Extensão de cílios, lift de cílios, laminação de sobrancelhas, microblading, tingimento |
| **Med Spas e Estética** | Botox, preenchimentos, peel químico, tratamento a laser, microneedling, terapia IV |
| **Personal Trainers e Academias** | Sessão de PT, aula em grupo, avaliação, consulta nutricional, sessão de recuperação |
| **Estúdios de Yoga e Pilates** | Aula em grupo, sessão particular, workshop, formação de professores, meditação |
| **Fisioterapia e Quiropraxia** | Avaliação inicial, retorno, terapia manual, dry needling, sessão de reabilitação |
| **Repetição e Coaching** | Sessão individual, sessão em grupo, avaliação, preparação para provas, mentoria |
| **Banho e Tosa de Pets** | Banho e escovação, tosa completa, corte de unhas, limpeza dentária, dessedimentação, introdução para filhotes |

## Funcionalidades

- **Visualização de calendário diário** — agenda visual com colunas de equipe, blocos de agendamento coloridos e navegação por dia (como Salonist/Square)
- **Agendamento de compromissos** — crie compromissos com cliente, equipe, data/hora e múltiplos serviços; calcula automaticamente duração e preço total
- **Horários bloqueados** — marque pausas, horário de almoço ou dias de folga por membro da equipe diretamente no calendário
- **Gestão de clientes** — banco de dados completo com informações de contato, observações, preferências e histórico de agendamentos
- **Gestão de equipe** — diretório da equipe com codificação por cores, cargos/funções, ativar/desativar e contagem de agendamentos
- **Catálogo de serviços** — serviços configuráveis com duração, preço, cor e agrupamento por categoria
- **Estoque de produtos** — rastreie produtos de varejo com custo/preço, níveis de estoque, alertas de estoque baixo, marca e SKU
- **Agendamentos multi-serviço** — selecione múltiplos serviços por agendamento com cálculo automático de duração e preço
- **Fluxo de status** — agendado → confirmado → em andamento → concluído (ou cancelado/não compareceu)
- **Notas de atividade** — notas com carimbo de data/hora em cada agendamento para comunicação interna
- **Painel** — KPIs de relance: agendamentos de hoje, contagem de próximos, faturamento, contagem de clientes, alertas de estoque baixo
- **Busca e filtro** — encontre agendamentos por status, busque clientes por nome/e-mail/telefone
- **Roteamento por URL** — páginas favoritáveis (`/calendar`, `/appointments/123`, `/clients`, `/staff`, `/services`, `/products`)
- **UI modo duplo** — otimizada para humanos + otimizada para agentes de IA (`?agent`)

## Início Rápido

```bash
git clone https://github.com/clawnify/open-salon.git
cd open-salon
pnpm install
pnpm run dev
```

Abra `http://localhost:5174` no seu navegador. Os dados persistem em `data.db`.

### Modo Agente (para OpenClaw / Claude Code)

Adicione `?agent` à URL:

```
http://localhost:5174/?agent
```

Isso ativa uma UI amigável a agentes com:
- Botões de excluir/ação sempre visíveis (sem hover para revelar)
- Alvos de clique grandes para automação confiável do navegador
- Todos os controles acessíveis sem interações de arrastar

### Usando com Claude Code

O Claude Code pode interagir com o salão através da API REST:

```bash
# Criar um cliente
curl -X POST http://localhost:3004/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name": "Maria Silva", "phone": "555-0100", "email": "maria@exemplo.com"}'

# Agendar um compromisso com múltiplos serviços
curl -X POST http://localhost:3004/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"client_id": 1, "staff_id": 1, "scheduled_date": "2025-01-15", "start_time": "10:00", "service_ids": [1, 2]}'

# Bloquear um horário para almoço
curl -X POST http://localhost:3004/api/blocked-slots \
  -H "Content-Type: application/json" \
  -d '{"staff_id": 1, "blocked_date": "2025-01-15", "start_time": "12:00", "end_time": "13:00", "reason": "Almoço"}'
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Preact, TypeScript, Vite |
| **Estilo** | Tailwind CSS v4, shadcn/ui |
| **Backend** | Hono, Node.js |
| **Banco de Dados** | SQLite (better-sqlite3) |
| **Validação** | Zod, @hono/zod-openapi |
| **Ícones** | Lucide |

### Pré-requisitos

- Node.js 20+
- pnpm (ou npm/yarn)

## Arquitetura

```
src/
  server/
    schema.sql  — Schema SQLite (clients, staff, services, appointments, products)
    db.ts       — Wrapper SQLite (query, get, run, transaction)
    index.ts    — API REST Hono com schemas OpenAPI
    dev.ts      — Servidor de desenvolvimento com service de arquivos estáticos
  client/
    app.tsx           — Componente raiz com roteamento por URL
    context.tsx       — Contexto da aplicação (interface de estado)
    lib/
      utils.ts        — Utilitário cn() para merge de classes Tailwind
    hooks/
      use-app.ts      — Gestão de estado, operações CRUD, chamadas API
      use-router.ts   — Roteamento por pushState URL
    components/
      ui/                    — Primitivas shadcn/ui (button, card, dialog, etc.)
      sidebar.tsx            — Navegação com contagens de agendamento/clientes
      dashboard.tsx          — Cards de estatísticas + agenda de hoje
      calendar-view.tsx      — Calendário diário com colunas de equipe
      appointment-list.tsx   — Lista paginada de agendamentos com filtros de status
      appointment-detail.tsx — Detalhe do agendamento com serviços, observações
      create-appointment.tsx — Dialog de novo agendamento com seletor de serviços
      client-list.tsx        — Lista paginada de clientes com busca
      client-detail.tsx      — Perfil do cliente + histórico de agendamentos
      create-client.tsx      — Dialog de novo cliente
      staff-list.tsx         — Grid de cards da equipe com avatares coloridos
      create-staff.tsx       — Dialog de novo membro da equipe com seletor de cor
      service-list.tsx       — Catálogo de serviços com agrupamento por categoria
      create-service.tsx     — Dialog de novo serviço
      product-list.tsx       — Estoque de produtos com alertas de estoque baixo
      create-product.tsx     — Dialog de novo produto
      status-badge.tsx       — Badges de status do agendamento
      pagination.tsx         — Controles de paginação
      error-banner.tsx       — Exibição de erro estilo toast
```

### Modelo de Dados

```sql
clients              (id, name, email, phone, notes)
staff                (id, name, email, phone, title, color, active)
services             (id, name, description, duration, price, color, category, active)
appointments         (id, identifier, client_id, staff_id, status, scheduled_date,
                      start_time, end_time, total_price, notes, is_recurring,
                      recurrence_interval)
appointment_services (id, appointment_id, service_id, price, duration)
appointment_notes    (id, appointment_id, content)
blocked_slots        (id, staff_id, blocked_date, start_time, end_time, reason)
products             (id, name, brand, category, sku, price, cost, stock,
                      low_stock_alert)
```

### Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/stats` | Estatísticas do painel |
| GET | `/api/calendar` | Agendamentos + horários bloqueados para período |
| GET | `/api/appointments` | Listar agendamentos (paginado, filtrável) |
| POST | `/api/appointments` | Criar agendamento com IDs de serviços |
| GET | `/api/appointments/:id` | Detalhe do agendamento com serviços e observações |
| PUT | `/api/appointments/:id` | Atualizar agendamento |
| DELETE | `/api/appointments/:id` | Excluir agendamento |
| POST | `/api/appointments/:id/notes` | Adicionar observação ao agendamento |
| DELETE | `/api/notes/:id` | Excluir uma observação |
| GET | `/api/clients` | Listar clientes (paginado, pesquisável) |
| GET | `/api/clients/all` | Todos os clientes para dropdowns de busca |
| POST | `/api/clients` | Criar um cliente |
| GET | `/api/clients/:id` | Detalhe do cliente com histórico de agendamentos |
| PUT | `/api/clients/:id` | Atualizar um cliente |
| DELETE | `/api/clients/:id` | Excluir um cliente |
| GET | `/api/staff` | Listar equipe com contagem de agendamentos |
| GET | `/api/staff/all` | Equipe ativa para dropdowns de busca |
| POST | `/api/staff` | Criar membro da equipe |
| PUT | `/api/staff/:id` | Atualizar membro da equipe |
| DELETE | `/api/staff/:id` | Excluir membro da equipe |
| GET | `/api/services` | Listar serviços |
| POST | `/api/services` | Criar um serviço |
| PUT | `/api/services/:id` | Atualizar um serviço |
| DELETE | `/api/services/:id` | Excluir um serviço |
| POST | `/api/blocked-slots` | Criar horário bloqueado |
| DELETE | `/api/blocked-slots/:id` | Excluir horário bloqueado |
| GET | `/api/products` | Listar produtos (paginado, pesquisável) |
| POST | `/api/products` | Criar um produto |
| PUT | `/api/products/:id` | Atualizar um produto |
| DELETE | `/api/products/:id` | Excluir um produto |

## Palavras-chave SEO

Software open-source de gestão de salão, software gratuito de agendamento, alternativa open-source ao Salonist, alternativa open-source ao Fresha, software gratuito de agendamento para barbearia, alternativa open-source ao Square Appointments, alternativa open-source ao Vagaro, software gratuito de gestão de spa, alternativa open-source ao Booksy, aplicativo de agendamento de salão, software de agendamento, software de escalonamento de equipe, gestão de salão de beleza, sistema de agendamento open-source, software gratuito para salão de unhas, gestão de estúdio de tatuagem, software de banho e tosa de pets, agendamento auto-hospedado, POS open-source de salão, software gratuito para estúdio de yoga, software de agendamento para fisioterapia, software de agendamento para repetição, software de gestão de med spa.

## Comunidade e Contribuições

Este projeto faz parte do ecossistema [OpenClaw](https://github.com/openclaw/openclaw). Contribuições são bem-vindas — abra uma issue ou envie um PR.

## Licença

AGPL-3.0
