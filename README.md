# Nousify CRM — Internal Tool

An internal CRM for Nousify, initially focused on lead and pipeline management. Designed to grow into a full SaaS product.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS**
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Storage**: `localStorage` via a swappable `StorageAdapter` interface — migrating to a database requires only a new adapter in `lib/storage.ts`

---

## Running Locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
app/
  layout.tsx                Root layout (dark sidebar + main content area)
  page.tsx                  Redirects to /leads
  leads/
    page.tsx                Leads list — table, search, filters, sort, pagination
    [id]/page.tsx           Lead detail page (two-column: info + activity feed)
  pipelines/page.tsx        Kanban pipeline board
  opportunities/page.tsx    Placeholder
  clients/page.tsx          Placeholder
  content/page.tsx          Placeholder
  ai-assistant/page.tsx     Placeholder
  analytics/page.tsx        Placeholder
  integrations/page.tsx     Placeholder
  settings/page.tsx         Leads configuration (custom fields)

components/
  layout/
    Sidebar.tsx             Fixed dark sidebar navigation
  leads/
    LeadsTable.tsx          Table with search, filters, sort, column toggle, pagination
    LeadSlideOver.tsx       Right-drawer — create/edit a lead; wires activity logging
    ActivityTimeline.tsx    Chronological activity feed (notes, docs, stage changes)
    ActivityEntryForm.tsx   Modal form — add/edit notes and documents
    TimelineSlideOver.tsx   Tasks drawer (used from pipeline board cards)
    LeadsConfigModal.tsx    Custom field management
    DeleteConfirmDialog.tsx Reusable delete confirmation dialog
  pipelines/
    PipelinesView.tsx       Pipeline tab bar, summary stats, modal orchestration
    PipelineBoard.tsx       DnD context — handles drag-start, drag-end, stage moves
    StageColumn.tsx         Individual Kanban column with droppable zone
    LeadCard.tsx            Sortable card — name, quality badge, estimated value
    CreatePipelineModal.tsx
    EditPipelineModal.tsx
    ManageStagesModal.tsx   Stage CRUD + colour picker
    AddLeadModal.tsx        Add an existing lead to a stage
    PostMoveNoteModal.tsx   Optional note prompt after a drag-move
    stageColors.ts          Shared colour constants (10 palette keys)
  ui/
    SlideOver.tsx           Right-drawer wrapper (md / lg sizes)
    Modal.tsx               Centred modal wrapper
    Button.tsx
    Badge.tsx               LeadQualityBadge + generic Badge
    Pagination.tsx

lib/
  storage.ts                StorageAdapter interface + localStorage implementation
  leads.ts                  Lead CRUD helpers + filter/sort
  pipelines.ts              Pipeline, stage, and entry CRUD helpers
  activities.ts             Activity entry CRUD + convenience creators

types/
  index.ts                  All shared TypeScript types
```

---

## Modules

### Leads

**Fields**: First Name, Last Name, Email, Phone, Website, Company, Job Title, Pipeline, Stage, Lead Quality, Estimated Value, plus any custom fields.

**Custom fields**: Add text / number / date / select fields from the Configure modal. They appear as table columns and in the create/edit form.

**Interaction pattern**:
- "New lead" or row "Edit" → `LeadSlideOver` drawer
- Row "Tasks" → `/leads/[id]` full detail page
- Creating a lead auto-logs a `lead_created` activity entry; optional initial note and document can also be captured at creation time

### Activity Timeline

Every lead has a chronological activity feed:

| Type | Description |
|------|-------------|
| `lead_created` | Auto-created when a lead is saved for the first time |
| `stage_change` | Auto-created on every pipeline/stage assignment or move |
| `note` | User-created free-text note |
| `document` | User-created entry with a linked file/URL |

System-generated entries (`lead_created`, `stage_change`) are read-only. User entries can be edited and deleted.

### Pipelines

- Create multiple named pipelines, each with ordered stages
- Each stage has a configurable colour (set via the Configure modal)
- Drag cards between stages or reorder within a stage — both trigger activity log entries
- After a drag move, an optional `PostMoveNoteModal` lets the user attach context

---

## Architecture Notes

### Swapping localStorage for a database

All data access goes through `StorageAdapter` in `lib/storage.ts`. To move to a real database:

1. Implement a new adapter (e.g. `supabaseAdapter`) backed by Next.js API routes or Server Actions
2. Export it from `lib/storage.ts` in place of `localStorageAdapter`
3. Nothing else in the codebase changes

### Multi-tenancy (when this becomes a SaaS product)

> **Every table must have an `organizationId` column from day one.**

Add `organizationId` to all tables when defining the database schema. Retrofitting it onto a live product is the one decision that is genuinely painful to reverse. Everything else — auth, billing, roles, subdomain routing — is additive.

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — breaking changes to data schema or module contracts
- **MINOR** — new features (new modules, new fields, new UI flows)
- **PATCH** — bug fixes and visual/UX polish

| Version | Description |
|---------|-------------|
| v1.0.0  | Leads module (CRUD, custom fields, activity timeline) + Pipelines module (Kanban board, drag-and-drop, stage colours, post-move notes) |

---

## Roadmap

### Phase 1 — MVP ✅
- [x] Leads module: table, CRUD, filters, sort, pagination, custom fields
- [x] Activity timeline per lead (notes, documents, auto-logged stage changes)
- [x] Pipelines module: multi-pipeline Kanban, drag-and-drop, stage colour configuration
- [x] Lead detail page (two-column: info panel + activity feed)
- [x] Dark sidebar navigation

### Phase 2 — Database
- [ ] Supabase (or similar) integration
- [ ] Authentication (NextAuth or Clerk)
- [ ] Replace localStorage adapter with DB adapter

### Phase 3 — Additional Modules
- [ ] Opportunities
- [ ] Clients
- [ ] Content
- [ ] AI Assistant
- [ ] Analytics

### Phase 4 — SaaS
- [ ] Multi-tenancy (`organizationId` everywhere)
- [ ] Team collaboration and roles
- [ ] Billing (Stripe)
