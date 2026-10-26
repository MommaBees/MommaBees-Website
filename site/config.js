// Public browser settings ONLY. This file points to the owner-verified MommaBees Supabase project.
// The publishable (or legacy anon) key is safe in a browser WITH the accompanying RLS policies.
// NEVER put a Supabase secret/service-role key, Stripe secret key, or SMTP key in this file.
window.MAMMA_BEES_CONFIG = {
  supabaseUrl: 'https://ryqcfojzdncrshinlpue.supabase.co',
  supabasePublishableKey: 'sb_publishable_075tPyE6T8nqG9KesL6-bA_EI2-JibJ',
  bakeryTimeZone: 'America/Chicago',
  currency: 'USD',
  turnstileSiteKey: '0x4AAAAAAFnN8HMmQNmK9UG-' // Required to accept anonymous messages; see Cloudflare Turnstile
};
