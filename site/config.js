// Public browser settings ONLY. Replace these two strings after creating a NEW Supabase project.
// The publishable (or legacy anon) key is safe in a browser WITH the accompanying RLS policies.
// NEVER put a Supabase secret/service-role key, Stripe secret key, or SMTP key in this file.
window.MAMMA_BEES_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY',
  bakeryTimeZone: 'America/Chicago',
  currency: 'USD',
  turnstileSiteKey: '' // Required to accept anonymous messages; see Cloudflare Turnstile
};
