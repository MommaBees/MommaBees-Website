-- Mamma Bee's Bakery: usernames are chosen at sign-up and managed thereafter by Owner/Admin only.
-- Do not revoke the ability to edit other customer profile fields.
revoke update (username) on public.customer_profiles from authenticated;
alter table public.account_admin_audit drop constraint if exists account_admin_audit_operation_check;
alter table public.account_admin_audit add constraint account_admin_audit_operation_check
 check(operation in ('invite','grant_role','remove_role','ban','unban','delete','change_username'));
