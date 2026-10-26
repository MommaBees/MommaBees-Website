// Public navigation helpers. Never use this UI check as the security boundary.
// Supabase RLS and server-side staff permission checks enforce real access.
export const isBackOfficeRole = role => ['owner','admin','moderator'].includes(role);
export const backOfficeNavigation = role => {
  if(role==='owner'||role==='admin')return '<a href="#admin">Admin</a>';
  if(role==='moderator')return '<a href="#admin">Moderation</a>';
  return '';
};
