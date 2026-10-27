// Mamma Bee's Bakery: account controls shared across every customer and staff page.
// No auth identifiers or personal email addresses are exposed in the navigation.
export const ACCOUNT_MENU_OPEN_MS=150;
export const ACCOUNT_MENU_CLOSE_MS=350;

export function accountNavigationMarkup(isSignedIn){
 if(!isSignedIn)return '<a href="#account" class="nav-account-signin">Sign In</a>';
 return '<div class="account-dropdown" data-account-menu>'+
  '<button type="button" class="account-dropdown-trigger" aria-expanded="false" aria-haspopup="true" '+
   'aria-controls="account-dropdown-panel" aria-label="Open account menu">'+
   '<span class="account-avatar" aria-hidden="true">B</span><span>My Account</span>'+
   '<span class="account-chevron" aria-hidden="true">⌄</span></button>'+
  '<div class="account-dropdown-panel" id="account-dropdown-panel" data-account-panel hidden>'+
   '<div class="account-dropdown-heading">Your bakery account</div>'+
   '<a href="#account">Account Overview</a>'+
   '<a href="#account/profile">Profile</a>'+
   '<a href="#account/settings">Settings</a>'+
   '<div class="account-dropdown-divider" aria-hidden="true"></div>'+
   '<button type="button" class="account-signout" data-nav-signout>Sign Out</button>'+
  '</div></div>';
}

let previousCleanup=null;

export function bindAccountNavigation({onSignOut,root=document}){
 previousCleanup?.();
 previousCleanup=null;
 const menu=root.querySelector('[data-account-menu]');
 if(!menu)return ()=>{};
 const trigger=menu.querySelector('.account-dropdown-trigger');
 const panel=menu.querySelector('[data-account-panel]');
 const signOutButton=menu.querySelector('[data-nav-signout]');
 if(!trigger||!panel||!signOutButton)throw Error('Account dropdown markup is incomplete');
 let openTimer=null,closeTimer=null,signingOut=false;
 const stopTimers=()=>{clearTimeout(openTimer);clearTimeout(closeTimer);openTimer=null;closeTimer=null;};
 const setOpen=opened=>{
  if(signingOut)return;
  stopTimers();
  panel.hidden=!opened;
  trigger.setAttribute('aria-expanded',String(opened));
  menu.classList.toggle('account-dropdown-open',opened);
 };
 const queueOpen=()=>{
  clearTimeout(closeTimer);clearTimeout(openTimer);
  openTimer=setTimeout(()=>setOpen(true),ACCOUNT_MENU_OPEN_MS);
 };
 const queueClose=()=>{
  clearTimeout(openTimer);clearTimeout(closeTimer);
  closeTimer=setTimeout(()=>{
   if(!menu.contains(document.activeElement))setOpen(false);
  },ACCOUNT_MENU_CLOSE_MS);
 };
 const pointerEnter=event=>{if(event.pointerType!=='touch')queueOpen();};
 const pointerLeave=event=>{if(event.pointerType!=='touch')queueClose();};
 const toggle=()=>setOpen(panel.hidden);
 const onFocusIn=()=>{clearTimeout(closeTimer);};
 const onFocusOut=event=>{
  if(!menu.contains(event.relatedTarget))queueClose();
 };
 const onDocPointer=event=>{if(!menu.contains(event.target))setOpen(false);};
 const onDocKey=event=>{
  if(event.key==='Escape'&&!panel.hidden){
   setOpen(false);
   trigger.focus();
  }
 };
 const onLinkClick=()=>setOpen(false);
 const handleSignOut=async()=>{
  if(signingOut)return;
  signingOut=true;
  stopTimers();
  signOutButton.disabled=true;
  signOutButton.textContent='Signing out…';
  try{await onSignOut();}
  catch(error){
   signingOut=false;signOutButton.disabled=false;
   signOutButton.textContent='Sign Out';
   throw error;
  }
 };
 menu.addEventListener('pointerenter',pointerEnter);
 menu.addEventListener('pointerleave',pointerLeave);
 menu.addEventListener('focusin',onFocusIn);
 menu.addEventListener('focusout',onFocusOut);
 trigger.addEventListener('click',toggle);
 panel.querySelectorAll('a').forEach(link=>link.addEventListener('click',onLinkClick));
 signOutButton.addEventListener('click',handleSignOut);
 document.addEventListener('pointerdown',onDocPointer);
 document.addEventListener('keydown',onDocKey);
 const cleanup=()=>{
  stopTimers();
  menu.removeEventListener('pointerenter',pointerEnter);
  menu.removeEventListener('pointerleave',pointerLeave);
  menu.removeEventListener('focusin',onFocusIn);
  menu.removeEventListener('focusout',onFocusOut);
  trigger.removeEventListener('click',toggle);
  panel.querySelectorAll('a').forEach(link=>link.removeEventListener('click',onLinkClick));
  signOutButton.removeEventListener('click',handleSignOut);
  document.removeEventListener('pointerdown',onDocPointer);
  document.removeEventListener('keydown',onDocKey);
  if(previousCleanup===cleanup)previousCleanup=null;
 };
 previousCleanup=cleanup;
 return cleanup;
}
