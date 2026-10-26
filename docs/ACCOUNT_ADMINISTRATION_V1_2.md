# Mamma Bee's Bakery — Account Administration & Moderation Specification

**Document ID:** MBB-ADMIN-ACCOUNTS-001
**Filename:** `docs/ACCOUNT_ADMINISTRATION_V1_2.md`
**File type:** Markdown
**Project:** Mamma Bee's Bakery — Nixa, Missouri
**Repository location:** `MommaBees/MommaBees-Website` → `docs/` on `main`
**Google Drive location:** Not established. GitHub is the current project source of truth.
**Version:** 1.2
**Date:** 2026-10-26
**Status:** Source implemented, Supabase migration applied; authenticated browser acceptance pending.
**Purpose:** Define safe account administration, access delegation, bans, audit, and retention.
**Dependencies:** MommaBees Supabase Auth, Postgres, Cloudflare Pages, existing customer and Admin accounts.

## User management in Admin
- View registered accounts from Supabase Auth together with the unique bakery Account ID, username, name, email, role, and suspension status; paginate 50 per page and search within the current page.
- Invite customers by email. New invitees choose their own password. Email delivery depends on Supabase Auth mail configuration.
- Select a registered customer from the list and set their role to Moderator or, if performed by the Owner, Admin. Returning a user to Customer removes their elevated role.
- Suspend an account with an audit reason; restore when appropriate.
- Owner may attempt permanent deletion only after typed DELETE + exact email confirmation. Deletion is blocked when orders, reviews, or messages exist. Storage ownership can independently block removal.
- All successful role, invitation, ban, restoration and deletion actions write a server-side audit event.

## Role authority
| Role | Capabilities |
|---|---|
| Owner | Complete management including assigning Admin roles and removing accounts |
| Admin | Manage existing operations; invite users, assign or remove Moderator roles, suspend or restore customers/moderators |
| Moderator | View and moderate customer reviews, view conversation photos, respond to messages, no financial or role-management access |
| Customer | Order, manage personal data, send private messages, review products |
| Staff (legacy role) | No account-management authorization until assigned a defined modern role |

**Safety decisions:** An Admin cannot grant Admin status, modify existing Admins, or modify the Owner. Owner account cannot be banned, deleted, demoted, or changed by the application endpoints. All self-role and self-ban operations are denied.

## Security architecture
- All high-privilege account actions run through authenticated Pages Functions `/api/admin/users` and `/api/admin/moderate`.
- The browser never receives `SUPABASE_SECRET_KEY`; Supabase Auth Admin calls run on the server.
- Authorization checks use verified Supabase Auth sessions plus current database `staff_roles` and `customer_profiles.banned_at`, never user-provided metadata.
- Ban updates Supabase Auth and the private bakery account state. Restrictive RLS policies prevent access to customer data from an otherwise unexpired signed-in token.
- Owner-only account audit table has RLS and no client write permission.
- Moderator database permissions allow reading messages, photos, and reviews; write actions are narrowly handled by role-validated server endpoints.
- Account removal preserves financial and customer-service evidence: users with order, message, or review history cannot be deleted by the current workflow. Storage object ownership may independently block deletion.
- An account ban prevents account access; it does not make the publicly viewable shop inaccessible to someone as an anonymous visitor.

## Deployment/verification requirements
1. Confirm the new database migration is registered and Owner account remains intact.
2. Confirm GitHub Actions passes JavaScript syntax and unauthenticated management endpoint denial tests.
3. Confirm restrictive RLS prevents a banned user with a still-valid token from accessing their profile/role.
4. Browser test Owner account list, invitation, promotion to Moderator, Moderator restrictions, Admin promotion, ban/unban, deletion safeguards, and audit history.
5. Confirm invitation emails can actually be delivered before inviting real customers.
6. Confirm no real customer accounts were modified by implementation tests.

## Limitations
- End-to-end browser verification requires an authenticated Owner session and test user; no real customer records should be created or changed solely to manufacture a pass.
- The separate Supabase native Auth CAPTCHA and leaked-password protection review remains outstanding.
- Live payments remain disabled.

## Revision History
| Date | Version | Change | Approval status |
|---|---|---|---|
| 2026-10-26 | 1.2 | Added scoped Account Management, invites, admin/moderator delegation, bans, deletion safety and audit | Requested by Owner; implementation verification underway |

**Footer:** Mamma Bee's Bakery · MBB-ADMIN-ACCOUNTS-001 · Version 1.2 · Controlled in GitHub
