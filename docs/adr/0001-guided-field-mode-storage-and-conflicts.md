# ADR 0001: Browser Drafts and Timestamp-Checked Driving Record Writes

- Status: Accepted
- Date: 2026-09-07

## Decision

Driving Drafts are stored as versioned localStorage entries keyed by project and pile, with a central browser index. The server remains the source of truth for submitted Driving Records. Online writes carry the observed `updatedAt`; stale writes return 409, while overwrites require an explicit confirmation and the latest server timestamp.

The service worker caches only static assets and the last opened Drive page. It does not cache API writes or create an offline submission queue.

## Rationale

This preserves the existing Prisma schema and API payload, supports a reliable field draft workflow without an external dependency, and avoids silently replacing a newer engineering record. A per-pile latest Draft keeps the Dashboard inbox understandable and the bounded cache avoids pretending that the entire application is offline-capable.

## Consequences

- Drafts are device-local and are not shared across users or devices.
- A browser/device reset can remove Drafts.
- Offline users can capture and reload the last cached Drive page but must return online to submit.
- A conflict requires an explicit server/local choice before the record can be written.
