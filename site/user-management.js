import {currentSession,currentUser,list,escapeHtml as e} from './api.js';
let page=1;
async function api(payload){
 const token=currentSession()?.access_token;
 if(!token)throw Error('Sign in again to manage accounts');
 const options=payload?{method:'POST',body:JSON.stringify(payload)}:{method:'GET'};
 const r=await fetch('/api/admin/users'+(payload?'':'?page='+page),{
  ...options,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
  cache:'no-store'});
 const json=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(json.error||'Account management is temporarily unavailable');
 return json;
}
const date=v=>v?new Date(v).toLocaleDateString('en-US'):'—';
const field=(label,name,type='text',required=true)=>'<label class="field">'+e(label)+'<input name="'+name+'" type="'+type+'"'+(required?' required':'')+'></label>';
export async function userManagement({showError}){
 const main=document.querySelector('#admin-main');
 if(!main)return;
 main.innerHTML='<div class="box">Loading bakery customer accounts…</div>';
 try{
  const data=await api();
  const isOwner=data.actorRole==='owner';
  const rows=data.users.map(u=>{
   const protectedTarget=u.role==='owner',adminTarget=u.role==='admin',editable=!protectedTarget&&(isOwner||!adminTarget);
   const canChangeUsername=isOwner||(!protectedTarget&&(!adminTarget||u.id===currentUser()?.id));
   const roleOptions=(isOwner?['customer','moderator','admin']:['customer','moderator'])
     .filter(x=>u.role===x||!adminTarget).map(x=>'<option value="'+x+'"'+(x===u.role?' selected':'')+'>'+e(x==='customer'?'Customer':x[0].toUpperCase()+x.slice(1))+'</option>').join('');
   return '<tr><td><strong>'+e(u.full_name||u.username||'New customer')+'</strong>'+
     '<div class="small">'+e(u.email||'')+'</div><div class="tiny muted">Username: '+e(u.username||'Not set')+'</div><div class="tiny muted">'+e(u.account_code||'Account ID pending')+'</div></td>'+
     '<td>'+e(u.role)+'</td><td>'+(u.banned?'<span class="warning">Suspended</span>':'Active')+'</td>'+
     '<td>'+date(u.created_at)+'</td><td><div class="user-actions" data-user="'+e(u.id)+'">'+
       (editable?'<label class="sr-only" for="role-'+e(u.id)+'">Role for '+e(u.email)+'</label>'+
        '<select id="role-'+e(u.id)+'" data-role-select="'+e(u.id)+'">'+roleOptions+'</select>'+
        '<button class="button secondary" data-change="'+e(u.id)+'">Save Role</button>'+
        '<button class="button secondary" data-suspend="'+e(u.id)+'">'+(u.banned?'Restore':'Ban')+'</button>':'<span class="small muted">Protected account</span>')+
       (canChangeUsername?'<button class="button secondary" data-username="'+e(u.id)+'">Change Username</button>':'')+
       (isOwner&&!protectedTarget?'<button class="button ghost" data-delete="'+e(u.id)+'">Delete</button>':'')+
       '</div></td></tr>';
  }).join('');
  main.innerHTML='<section class="box"><div class="section-head"><div><h2>Accounts & Roles</h2>'+
    '<p class="muted">Invite new customers; promote registered users; suspend and restore accounts. The Owner account cannot be changed.</p></div></div>'+
    '<form id="invite-customer" class="filters">'+field('Invite by email','email','email')+
    '<button class="button" type="submit">Send Account Invitation</button></form>'+
    '<p class="small muted">Invited members set their own passwords. Email delivery depends on your Supabase email configuration.</p>'+
    '<div class="filters"><label>Search this page<input type="search" id="filter-users" placeholder="Name, email, Account ID"></label>'+
    '<span class="muted">Page '+page+' · Up to 50 registered users</span></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>'+
    '<tbody id="user-directory">'+(rows||'<tr><td colspan="5">No customer accounts in this page.</td></tr>')+'</tbody></table></div>'+
    '<div class="actions" style="margin-top:15px"><button class="button secondary" id="users-prev"'+(page<=1?' disabled':'')+'>Previous</button>'+
    '<button class="button secondary" id="users-next"'+(!data.hasMore?' disabled':'')+'>Next</button></div>'+
    '<p class="small muted">Admin grants and permanent deletion are restricted to the Owner. Admins can invite users, assign Moderator, and suspend lower-privilege accounts. Customer financial/order records are preserved.</p>'+ (isOwner?'<section id="account-audit"><h3>Account Management Audit History</h3><p class="muted">Loading recent actions…</p></section>':'')+'</section>';
  if(isOwner){
   try{
    const rows=await list('account_admin_audit',{order:'recorded_at.desc',limit:'20'});
    const area=main.querySelector('#account-audit');
    if(area)area.innerHTML='<h3>Account Management Audit History</h3>'+
      (rows.length?'<div class="table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Target ID</th></tr></thead><tbody>'+
      rows.map(a=>'<tr><td>'+date(a.recorded_at)+'</td><td>'+e(a.operation)+'</td><td>'+e(a.target_user_id||'—')+'</td></tr>').join('')+
      '</tbody></table></div>':'<p>No role or account management actions recorded yet.</p>');
   }catch{const area=main.querySelector('#account-audit');if(area)area.innerHTML='<p>Audit records currently unavailable.</p>';}
  }
  const find=id=>data.users.find(u=>u.id===id);
  const run=async (payload,confirmation)=>{
   if(confirmation&&!window.confirm(confirmation))return;
   try{const r=await api(payload);window.alert(r.message||'Account updated');await userManagement({showError});}
   catch(err){showError(err);}
  };
  main.querySelector('#invite-customer').onsubmit=async event=>{
   event.preventDefault();const input=event.target.elements.email;const email=input.value.trim();
   await run({action:'invite',email},'Send a customer account invitation to '+email+'?');
  };
  main.querySelector('#filter-users').oninput=event=>{
   const query=event.target.value.trim().toLowerCase();
   main.querySelectorAll('[data-user]').forEach(row=>{
    const user=find(row.dataset.user),tr=row.closest('tr');
    const hay=[user?.email,user?.full_name,user?.username,user?.account_code].join(' ').toLowerCase();
    tr.hidden=!hay.includes(query);
   });
  };
  main.querySelectorAll('[data-change]').forEach(button=>button.onclick=async()=>{
   const u=find(button.dataset.change),role=main.querySelector('[data-role-select="'+u.id+'"]').value;
   if(role===u.role)return;
   await run({action:'role',user_id:u.id,role},'Change '+u.email+' from '+u.role+' to '+role+'?');
  });
  main.querySelectorAll('[data-username]').forEach(button=>button.onclick=async()=>{
   const u=find(button.dataset.username);
   const next=window.prompt('New username for '+u.email+' (3–30 letters, numbers or underscores):',u.username||'');
   if(next===null)return;
   const name=next.trim();
   if(!/^[A-Za-z0-9_]{3,30}$/.test(name)){showError(Error('Username must contain 3–30 letters, numbers or underscores.'));return;}
   if(name===u.username)return;
   await run({action:'username',user_id:u.id,username:name},'Change username for '+u.email+' to '+name+'?');
  });
  main.querySelectorAll('[data-suspend]').forEach(button=>button.onclick=async()=>{
   const u=find(button.dataset.suspend);
   if(u.banned){await run({action:'unban',user_id:u.id},'Restore account access for '+u.email+'?');return;}
   const reason=window.prompt('Reason for suspending '+u.email+'? (Recorded in Owner audit log)');
   if(reason===null)return;
   if(reason.trim().length<5){showError(Error('Provide a suspension reason of at least five characters.'));return;}
   await run({action:'ban',user_id:u.id,reason:reason.trim()},'Suspend access for '+u.email+'?');
  });
  main.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{
   const u=find(button.dataset.delete);
   if(window.prompt('Permanent deletion. Enter DELETE to continue for '+u.email)!=='DELETE')return;
   const confirmation=window.prompt('Enter the exact email '+u.email+' to confirm irreversible account deletion:');
   if(confirmation!==u.email)return;
   await run({action:'delete',user_id:u.id,confirm:'DELETE',confirm_email:confirmation},
    'Permanently delete '+u.email+'? Accounts with orders/messages/reviews are blocked from deletion.');
  });
  main.querySelector('#users-prev').onclick=()=>{page=Math.max(1,page-1);userManagement({showError});};
  main.querySelector('#users-next').onclick=()=>{page+=1;userManagement({showError});};
 }catch(err){main.innerHTML='<div class="box"><h2>Accounts & Roles</h2><p class="notice error">'+e(err.message)+'</p></div>';}
}
