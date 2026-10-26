import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {verifyStripeSignature} from '../functions/_lib/stripe.js';
import {onRequestPost as checkout} from '../functions/api/checkout.js';
import {onRequestPost as contact} from '../functions/api/contact.js';
import {onRequestPost as orderStatus} from '../functions/api/order-status.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const required=['site/account.js','site/message-center.js','functions/_lib/turnstile.js','functions/api/auth/login.js','functions/api/auth/register.js','supabase/migrations/20261026_customer_profiles_message_photos.sql','README.md','site/index.html','site/styles.css','site/config.js','site/app.js','site/api.js','site/admin.js','functions/api/checkout.js','functions/api/stripe-webhook.js','functions/api/order-status.js','functions/api/contact.js','functions/api/reconcile.js','supabase/schema.sql','docs/Mamma_Bees_Bakery_V1_Master_Project_Requirements.md'];
test('repository contains the complete expected source layout',()=>{for(const p of required)assert.equal(existsSync(path.join(root,p)),true,'missing '+p);});
test('JavaScript source files parse without syntax errors',()=>{
 const walk=dir=>readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(dir+'/'+item.name):item.name.endsWith('.js')?[dir+'/'+item.name]:[]);
 const js=[...walk('site'),...walk('functions')];
 for(const p of js){const r=spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});assert.equal(r.status,0,p+'\n'+r.stderr);}
});
test('client config contains no apparent private credentials',()=>{
 const s=read('site/config.js'); assert.doesNotMatch(s,/sk_(?:test|live)_[A-Za-z0-9]{12}/);
 assert.doesNotMatch(s,/sb_secret_[A-Za-z0-9]{12}/);assert.doesNotMatch(s,/whsec_[A-Za-z0-9]{12}/);
});
test('SQL enables RLS on public tables and requires explicit server privilege for checkout',()=>{
 const s=read('supabase/schema.sql');assert.match(s,/alter table public\.staff_roles enable row level security|foreach t in array array\['staff_roles'/i);
 assert.match(s,/revoke all on function public\.reserve_checkout\(/);assert.match(s,/grant execute on function public\.reserve_checkout\(/);
 assert.match(s,/checkout_enabled boolean not null default false/);
 assert.match(s,/grant update\(status,note\) on public\.orders to authenticated/);
});
test('Stripe webhook signatures verify valid HMAC and reject modified/expired signatures',async()=>{
 const secret='whsec_this_is_only_a_test_example'; const raw='{"id":"evt_test","type":"checkout.session.completed"}';const ts=Math.floor(Date.now()/1000);
 const signature=createHmac('sha256',secret).update(ts+'.'+raw).digest('hex');
 const req=s=>new Request('https://example.org/api/stripe-webhook',{headers:{'Stripe-Signature':s}});
 assert.equal(await verifyStripeSignature(req(`t=${ts},v1=${signature}`),secret,raw),true);
 assert.equal(await verifyStripeSignature(req(`t=${ts},v1=${signature}`),secret,raw+'x'),false);
 assert.equal(await verifyStripeSignature(req(`t=${ts-3600},v1=${signature}`),secret,raw),false);
});
test('checkout refuses live processing until explicitly authorized',async()=>{
 const request=new Request('https://example.org/api/checkout',{method:'POST',body:JSON.stringify({items:[]})});
 const r=await checkout({request,env:{STRIPE_SECRET_KEY:'sk_live_EXAMPLE_ONLY'}});
 assert.equal(r.status,503);assert.match((await r.json()).error,/Live payments are disabled/);
});
test('checkout refuses unset Stripe Tax configuration',async()=>{
 const request=new Request('https://example.org/api/checkout',{method:'POST',body:JSON.stringify({items:[]})});
 const r=await checkout({request,env:{STRIPE_SECRET_KEY:'sk_test_EXAMPLE_ONLY'}});
 assert.equal(r.status,503);assert.match((await r.json()).error,/Tax setup is not verified/);
});
test('guest contact refuses traffic without human verification setup',async()=>{
 const request=new Request('https://example.org/api/contact',{method:'POST',body:JSON.stringify({})});
 const r=await contact({request,env:{}});assert.equal(r.status,503);
});
test('order-status requires an unpredictable format for tracking token',async()=>{
 const request=new Request('https://example.org/api/order-status',{method:'POST',body:JSON.stringify({token:'small'})});
 const r=await orderStatus({request,env:{}});assert.equal(r.status,400);
});

test('account and messaging enhancements enforce CAPTCHA and private storage',()=>{
 const account=read('site/account.js'), auth=read('functions/_lib/turnstile.js'), migration=read('supabase/migrations/20261026_customer_profiles_message_photos.sql');
 assert.match(account,/captchaToken/); assert.match(auth,/siteverify/);
 assert.match(migration,/create table if not exists public.message_photos/i);
 assert.match(migration,/Maximum five photos per message/);
 assert.match(migration,/message-photos','message-photos',false/);
 assert.match(migration,/create unique index if not exists customer_profiles_username_ci_unique/);
});
