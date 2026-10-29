// Sitewide side-menu control. Click to pin; hover to preview; a link never unpins.
// Pin state intentionally survives SPA hash-route re-renders.
let pinned=false;
export function sideNavigationPinned(){return pinned;}
export function resetSideNavigationPin(){pinned=false;}
export function bindSideNavigation(root=document){
 const shell=root.querySelector('[data-side-navigation]');
 const trigger=root.querySelector('#mobile-nav-toggle');
 const panel=root.querySelector('#primary-navigation');
 if(!shell||!trigger||!panel)return;
 let hovered=false,focused=false;
 const present=()=>{
  const opened=pinned||hovered||focused;
  panel.hidden=!opened;
  panel.classList.toggle('mobile-open',opened);
  shell.classList.toggle('is-open',opened);
  shell.classList.toggle('is-pinned',pinned);
  trigger.setAttribute('aria-expanded',String(opened));
  trigger.setAttribute('aria-pressed',String(pinned));
  trigger.setAttribute('aria-label',pinned?'Close pinned navigation':'Open navigation menu (click to keep open)');
 };
 const pinToggle=()=>{
  pinned=!pinned;
  if(!pinned){hovered=false;focused=false;}
  present();
 };
 trigger.addEventListener('click',pinToggle);
 shell.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;present();}});
 shell.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch'){hovered=false;present();}});
 shell.addEventListener('focusin',()=>{focused=true;present();});
 shell.addEventListener('focusout',event=>{if(!shell.contains(event.relatedTarget)){focused=false;present();}});
 panel.addEventListener('click',event=>{
  // Clicking empty panel space pins or unpins; clicking a navigation link leaves pin state intact.
  if(event.target===panel)pinToggle();
 });
 shell.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   pinned=false;hovered=false;focused=false;present();
   trigger.focus();
  }
 });
 // Newly mounted headers inherit a deliberately pinned state.
 present();
}
