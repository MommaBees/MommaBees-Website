> **Account migration notice (2026-10-30):** The Stripe sandbox account ID and catalog references in this historical document describe the legacy sandbox. The active MommaBee sandbox is `acct_1UWAEICv9zp633CV`. See `docs/MBB_PAY_003_STRIPE_SANDBOX_MIGRATION_V1_0.md` for the current integration and outstanding acceptance gates. This notice does not retroactively certify any payment test.

# MommaBees Sandbox Checkout API Parameter Compatibility

**Document ID:** MBB-PAY-001  
**Project:** MommaBees Website  
**Version:** 1.0  
**Date:** 2026-10-27 (America/Chicago)  
**Filename:** MBB_PAY_001_SANDBOX_PAYMENT_COMPATIBILITY_V1_0.md  
**Type:** Markdown  
**Source location:** MommaBees/MommaBees-Website/docs (main)  
**Google Drive location:** Not established  
**Status:** Code compatibility correction; real card acceptance pending  
**Dependencies:** Stripe sandbox account acct_1UUtoDJF02bajTTM, Cloudflare secret bindings, sandbox webhook, Admin demo checkout  

## Finding
In a real Stripe TEST Checkout Session API call, `payment_method_types` was rejected as unsupported, while `allowed_payment_method_types` was accepted. The MommaBees Admin demo-checkout handler used the rejected parameter.

## Correction
Use `allowed_payment_method_types[0]=card` in the Admin demo checkout, preserving its existing TEST key guard, six fixed sandbox catalog prices, Owner/Admin authorization, sandbox metadata and demo ledger. Regression assertion prevents reintroducing the rejected parameter.

## Acceptance boundaries
Three Stripe-only sessions were created for separate success, decline and refund scenarios, but are unpaid as of this record. They do not create application demo checkout ledger records. End-to-end Owner/Admin payment tests through `/api/admin/demo-checkout` remain necessary. Refund and order-inventory accounting require separate verification. No live payments or database mutations were performed by this fix.

---
Footer: MBB-PAY-001 | v1.0 | MommaBees
