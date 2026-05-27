# Instaworm CRM — Internal Tool

An internal CRM for Instaworm, focused on lead management, pipeline tracking, and client relationships. Designed to grow into a full outreach automation platform.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Database**: Supabase (Postgres) with Row Level Security
- **Auth**: Supabase Auth
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Data access**: Server Components for reads, Server Actions for mutations

---

## Running Locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never prefix it with `NEXT_PUBLIC_`.

---

## Database Setup

Run `supabase/schema.sql` in the Supabase SQL Editor to create all tables, RLS policies, and constraints.

---

## Project Structure

```
app/
  (app)/
    layout.tsx                Root layout (dark sidebar + main content area)
    leads/page.tsx            Leads list — table, search, filters, sort, pagination
    pipelines/page.tsx        Kanban pipeline board
    clients/page.tsx          Clients table with status tracking
    settings/page.tsx         Currency and app configuration
  actions/
    leads.ts                  Lead CRUD server actions
    clients.ts                Client CRUD server actions
    pipelines.ts              Pipeline + stage server actions
    activities.ts             Activity entry server actions
    custom-fields.ts          Custom field definition server actions
    settings.ts               Settings server actions

components/
  layout/
    Sidebar.tsx               Fixed dark sidebar navigation
  leads/
    LeadsTable.tsx            Table with search, filters, sort, column toggle, pagination, bulk actions
    LeadSlideOver.tsx         Right-drawer — create/edit a lead
    ActivityTimeline.tsx      Chronological activity feed
    ActivityEntryForm.tsx     Modal — add/edit notes and documents
    TimelineSlideOver.tsx     Timeline drawer (used from leads table and pipeline board)
    LeadsConfigModal.tsx      Custom field management
    ImportLeadsModal.tsx      CSV bulk import
    DeleteConfirmDialog.tsx   Reusable delete confirmation
  pipelines/
    PipelinesView.tsx         Pipeline tab bar, summary stats, modal orchestration
    PipelineBoard.tsx         DnD context — drag-start, drag-end, stage moves
    StageColumn.tsx           Individual Kanban column
    LeadCard.tsx              Sortable card — name, quality badge, estimated value
    CreatePipelineModal.tsx
    EditPipelineModal.tsx
    ManageStagesModal.tsx     Stage CRUD + colour picker
    AddLeadModal.tsx          Add an existing lead to a stage
    PostMoveNoteModal.tsx     Optional note prompt after a drag-move
    stageColors.ts            Shared colour constants
  clients/
    ClientsTable.tsx          Clients table with status filter and bulk actions
    ClientSlideOver.tsx       Right-drawer — view/edit a client record
    AddClientModal.tsx        Two-step modal — search leads → confirm client details
    ClientsConfigModal.tsx    Client custom field management
  ui/
    SlideOver.tsx             Right-drawer wrapper (md / lg sizes)
    Modal.tsx                 Centred modal wrapper
    Button.tsx
    Badge.tsx                 LeadQualityBadge + ClientStatusBadge + generic Badge
    Pagination.tsx

lib/
  supabase-server.ts          Async server Supabase client (Server Components + Actions)
  supabase.ts                 Browser Supabase client
  db-mappers.ts               Row ↔ TypeScript mappers for all tables
  currencies.ts               Currency symbol lookup

types/
  index.ts                    All shared TypeScript types

supabase/
  schema.sql                  Complete database schema with RLS policies
```

---

## Modules

### Leads

**Fields**: First Name, Last Name, Email, Phone, Website, Company, Job Title, Pipeline, Stage, Lead Quality, Estimated Value, plus any user-defined custom fields.

**Custom fields**: Add text / number / date / select fields from the Configure modal. They appear as table columns and in the create/edit form.

**Locked columns**: Name and Email are always visible and cannot be hidden from the column picker.

**Bulk actions**: Select multiple leads to delete or move to a pipeline stage in bulk.

**CSV import**: Import leads from a spreadsheet. Duplicate emails are detected and skipped.

### Activity Timeline

Every lead has a chronological activity feed:

| Type | Description |
|------|-------------|
| `lead_created` | Auto-created when a lead is saved for the first time |
| `stage_change` | Auto-created on every pipeline/stage assignment or move |
| `client_converted` | Auto-created when a lead is converted to a client |
| `note` | User-created free-text note |
| `document` | User-created entry with a linked file/URL |

System-generated entries are read-only. User entries can be edited and deleted.

### Pipelines

- Create multiple named pipelines, each with ordered stages
- Each stage has a configurable colour
- Drag cards between stages — triggers automatic activity log entries
- After a drag move, an optional note prompt lets the user attach context

### Clients

- Leads are converted to clients from the Clients module
- Client records track: contract value, client since date, renewal date, status (Active / At Risk / Churned)
- Converted leads show a purple "Client" badge in the Leads table
- Full activity timeline shared between lead and client views
- Bulk status updates and bulk delete supported

### Settings

- Currency selection (applied to estimated values and contract values across all modules)

---

## Architecture

### Data access pattern

- **Server Components** fetch initial data and pass it as props
- **Client Components** seed `useState` from those props and own interactive state
- **Server Actions** handle all mutations — no API routes

### Security

- All tables have Row Level Security: `USING (user_id = auth.uid())`
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never exposed to the browser

---

## Versioning

| Version | Description |
|---------|-------------|
| v1.0.0 | Leads module + Pipelines module |
| v1.0.1 | Clients module, CSV import, bulk actions, Settings |
| v1.0.2 | Supabase migration — full Server Actions architecture, Supabase Postgres replacing localStorage |
