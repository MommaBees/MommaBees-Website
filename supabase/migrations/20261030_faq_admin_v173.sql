-- MommaBees public FAQs with protected Owner/Admin editing.
-- Existing approved answers remain verbatim in customer-faq.js until edited by staff.
create table if not exists public.faq_entries (
 id uuid primary key default gen_random_uuid(),
 source_index integer unique,
 question text not null check (char_length(question) between 5 and 220),
 answer text check (answer is null or char_length(answer) between 1 and 4000),
 sort_order integer not null default 100,
 published boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.faq_entries enable row level security;
revoke all on public.faq_entries from public, anon, authenticated;
grant select,insert,update,delete on public.faq_entries to service_role;
create index if not exists faq_entries_sort_idx on public.faq_entries(sort_order,id);
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(0,'What is the difference between ready-to-sell and preorder items?',null,10,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(1,'When is an order confirmed?',null,20,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(2,'Where do I pick up an order?',null,30,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(3,'Where does MommaBees deliver?',null,40,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(4,'What happens if I miss pickup or delivery?',null,50,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(5,'Can I request a different date or custom order?',null,60,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(6,'Will my order look exactly like a photograph?',null,70,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(7,'How do I check ingredients, allergens, and storage instructions?',null,80,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(8,'Can customers visit animals or other parts of the property?',null,90,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(9,'How can I cancel, request a refund, or report an incorrect order?',null,100,true)
on conflict (source_index) do nothing;
insert into public.faq_entries(source_index,question,answer,sort_order,published)
values(10,'How does the website use personal information and cookies?',null,110,true)
on conflict (source_index) do nothing;