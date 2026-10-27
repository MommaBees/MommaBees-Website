import {escapeHtml as e} from './api.js';
// Uses calendar dates, never local milliseconds as date identifiers.
const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monthText=(y,m)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(Date.UTC(y,m,1)));
const plusDays=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function mountPickupCalendar({days,selectId='date',feeEnabled=false,feeCents=0}){
 const root=document.getElementById('pickup-calendar');
 const dropdown=document.getElementById(selectId);
 if(!root||!dropdown)return;
 const valid=new Map(days.map(d=>[d.date,d]));
 const now=todayISO(),max=plusDays(now,180);
 let shown=dropdown.value||now;
 function draw(){
  const y=Number(shown.slice(0,4)),m=Number(shown.slice(5,7))-1;
  const first=new Date(Date.UTC(y,m,1)).getUTCDay();
  const length=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const cells=[];
  for(let p=0;p<first;p++)cells.push('<span class="calendar-blank" aria-hidden="true"></span>');
  for(let d=1;d<=length;d++){
   const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
   const eligible=valid.has(iso),past=iso<now||iso>max;
   const chosen=dropdown.value===iso;
   cells.push('<button type="button" class="calendar-day'+(eligible?' calendar-available':' calendar-unavailable')+
     (chosen?' calendar-selected':'')+'" data-pickup-day="'+iso+'"'+
     (past?' disabled':'')+' aria-label="'+iso+(eligible?', pickup available':', not an available baking day')+
     '" aria-pressed="'+chosen+'">'+d+'</button>');
  }
  root.innerHTML='<div class="calendar-month-header"><button type="button" class="button secondary" id="calendar-prev" aria-label="Previous month">‹</button>'+
    '<strong>'+monthText(y,m)+'</strong><button type="button" class="button secondary" id="calendar-next" aria-label="Next month">›</button></div>'+
    '<div class="calendar-weekdays">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>'<span>'+x+'</span>').join('')+'</div>'+
    '<div class="calendar-days">'+cells.join('')+'</div>'+
    '<p class="small"><span class="calendar-legend-dot"></span> Outlined dates are available pickup or fair days. Other dates require a special-order inquiry.</p>';
  root.querySelector('#calendar-prev').onclick=()=>{shown=new Date(Date.UTC(y,m-1,1)).toISOString().slice(0,10);draw();};
  root.querySelector('#calendar-next').onclick=()=>{shown=new Date(Date.UTC(y,m+1,1)).toISOString().slice(0,10);draw();};
  root.querySelectorAll('[data-pickup-day]').forEach(b=>b.onclick=()=>{
   const iso=b.dataset.pickupDay;
   if(!valid.has(iso)){
    const dialog=document.getElementById('unavailable-day-dialog');
    document.getElementById('requested-special-date').textContent=iso;
    document.getElementById('special-fee-explanation').textContent=feeEnabled
      ?'An additional convenience fee of $'+(feeCents/100).toFixed(2)+' may apply only if the bakery approves a special order for this date. This is not a confirmed order.'
      :'You can ask about a special order, but this date is not currently available for checkout.';
    document.getElementById('request-special-day').onclick=()=>{
      sessionStorage.setItem('mb_requested_special_date',iso);
      dialog.close();location.hash='#contact';
    };
    dialog.showModal();
    return;
   }
   dropdown.value=iso;dropdown.dispatchEvent(new Event('change',{bubbles:true}));draw();
  });
 }
 dropdown.addEventListener('change',()=>{if(dropdown.value)shown=dropdown.value;draw();});
 draw();
}
