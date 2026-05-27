# Next Steps — Instaworm CRM

## Vision

Instaworm CRM becomes the single platform for managing the entire Instagram outreach cycle — from finding and qualifying leads, to sending personalised DMs, tracking replies, and converting prospects into clients. The Chrome extension handles all Instagram interaction invisibly in the background; the user never leaves the CRM.

---

## Immediate: Chrome Extension Integration

### What the extension does
The Instaworm Chrome extension automates Instagram actions (send DMs, look up profiles, search users) using Instagram's private API via the user's existing session cookie. No tab opens. No Instagram UI interaction. The user stays in the CRM.

### Architecture
```
Nousify CRM (web app)
        |
        | chrome.runtime.sendMessage(extensionId, command)
        ↓
Extension background service worker
        |
        | fetch() using session cookies
        ↓
Instagram private API
```

### Message protocol (contract between CRM and extension)
```ts
type ExtensionCommand =
  | { action: 'send_dm';      handle: string; message: string }
  | { action: 'get_profile';  handle: string }
  | { action: 'search_users'; query: string; limit?: number }

type ExtensionResponse =
  | { success: true;  data: unknown }
  | { success: false; error: string }
```

### What needs to be built

**Extension repo (prerequisite):**
- Refactor each action (send DM, get profile, search) from DOM navigation to private API calls in the background service worker
- Add `chrome.runtime.onMessageExternal` listener implementing the command protocol above
- Add `externally_connectable` to the manifest with the CRM's origin

**This repo (once extension is ready):**
- `lib/extension.ts` — typed wrapper around `chrome.runtime.sendMessage` with graceful error handling (extension not installed, not logged in, Instagram rate limit, etc.)
- Outreach module UI (see below)

### User setup (one-time)
1. Install extension from Chrome Web Store
2. Log into Instagram in the same browser
3. Done — no API keys, no configuration

---

## Outreach Module (`/outreach`)

The Outreach module is where users run structured Instagram DM campaigns.

### Core concept: Sequences

A **sequence** is an ordered list of message steps with delays between them:

- Step 1: Initial DM — send immediately
- Step 2: First follow-up — 3 days after no reply
- Step 3: Final follow-up — 5 days after that

Users create sequences once and reuse them across leads.

### Daily workflow

1. User opens Outreach → sees a **queue** of leads due for action today
2. Each item shows the lead's name, which sequence they're in, and which step is due
3. User clicks a lead → Claude generates a personalised message based on the lead's record
4. User edits if needed → clicks **Send**
5. Extension fires the DM via Instagram's API
6. Lead advances to the next step in the sequence (or exits if complete)
7. A `dm_sent` activity entry is auto-logged on the lead's timeline

### Key design decisions
- **No auto-sending** — every message requires manual user approval (keeps volume low, reduces ToS risk)
- **Claude-generated messages** — personalised per lead using their name, company, job title, notes
- **Full audit trail** — every DM logged in the activity timeline with timestamp and message content

### Screens to build
- Sequences list — create/edit/delete sequences and their steps
- Queue — leads due for action, grouped by sequence and step
- Send modal — message preview, edit, send, skip
- Outreach settings — extension connection status, Instagram account, daily send limit

---

## Conversations Module (`/conversations`)

When a lead replies to a DM, the conversation thread surfaces here.

- Inbox view of all active Instagram DM threads with leads in the CRM
- Replies fetched via extension using Instagram's private API
- User can respond directly from the CRM
- Replies auto-logged to the lead's activity timeline
- Leads with unread replies shown with a badge in the sidebar

---

## Other Planned Modules

| Module | Notes |
|--------|-------|
| Intelligence | Analytics and reporting on lead/pipeline/outreach performance |
| AI Assistant | Chat interface for querying CRM data and drafting content |
| Content | Instagram content planning and scheduling |
| Calendar | Scheduling follow-ups and tasks |
| Documents | Shared document storage per lead/client |
| Integrations | Webhooks, Zapier, and third-party connections |

---

## Notes on Instagram ToS

Automated DMs at scale violate Meta's terms of service. The mitigation here is:
- One message at a time, manually approved
- Claude-generated personalisation (not bulk blasts)
- User controls daily volume

This is lower risk than bulk blast tools, but users should be aware that accounts can be flagged at high volumes.
