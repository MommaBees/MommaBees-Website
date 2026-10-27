// MommaBee homepage carousel: server-filtered, Owner-controlled media, accessible controls.
export const DEFAULT_CAROUSEL_INTERVAL_SECONDS=6.5;
export const CAROUSEL_SIZE_OPTIONS=Object.freeze(['extra-small','small','medium','large']);
export function normalizeCarouselSize(size){
 return CAROUSEL_SIZE_OPTIONS.includes(size)?size:'medium';
}
// Minimum provides adequate reading time; maximum bounds accidental misconfiguration.
export function carouselIntervalMilliseconds(seconds){
 const value=Number(seconds);
 return Number.isFinite(value)&&value>=3&&value<=60?Math.round(value*1000):6500;
}
let activeTimer=null;
let currentRoot=null;
let stopHandlers=[];
export function eligibleHomeSlides(slides,now=new Date()){
 const timestamp=+now;
 return (Array.isArray(slides)?slides:[]).filter(s=>s?.published===true&&s.image_url&&s.title&&
  (!s.starts_at||Date.parse(s.starts_at)<=timestamp)&&(!s.ends_at||Date.parse(s.ends_at)>timestamp))
  .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.id).localeCompare(String(b.id)));
}
export function homeCarouselMarkup(slides,escape,photo,size='medium'){
 const count=slides.length;
 if(!count)return '';
 return '<section class="home-carousel home-carousel--'+normalizeCarouselSize(size)+'" role="region" aria-roledescription="carousel" aria-label="Featured bakery stories" tabindex="-1">'+
  '<div class="home-carousel-slides" aria-live="off">'+slides.map((s,i)=>{
   const first=i===0,hidden=first?'':' hidden';
   const img=photo(s.image_url);
   const action=(label,href,secondary=false)=>label&&/^#(shop|ready|preorder|gallery|contact|faq)$/.test(href||'')
     ?'<a class="button'+(secondary?' secondary':'')+'" href="'+escape(href)+'">'+escape(label)+'</a>':'';
   return '<article class="hero home-carousel-slide" data-slide="'+i+'" aria-label="Slide '+(i+1)+' of '+count+'"'+hidden+'>'+
    '<div class="hero-copy"><div class="eyebrow">'+escape(s.eyebrow||'MommaBee Bakery&Farmstand')+'</div>'+
    '<h1>'+escape(s.title)+'</h1><p>'+escape(s.description||'')+'</p>'+
    '<div class="hero-actions">'+action(s.primary_label,s.primary_href)+action(s.secondary_label,s.secondary_href,true)+'</div></div>'+
    '<div class="hero-art has-photo"><img src="'+img+'" alt="'+escape(s.image_alt||'MommaBee Bakery&Farmstand creation')+'" loading="'+(first?'eager':'lazy')+'" decoding="async"></div></article>';
  }).join('')+'</div>'+
  (count>1?'<div class="home-carousel-controls">'+
   '<button type="button" class="home-carousel-prev" aria-label="Previous featured slide">‹</button>'+
   '<div class="home-carousel-dots" role="group" aria-label="Choose a featured slide">'+
   slides.map((s,i)=>'<button type="button" class="home-carousel-dot'+(i===0?' is-active':'')+'" data-carousel-to="'+i+'" aria-label="Show slide '+(i+1)+'" aria-pressed="'+(i===0?'true':'false')+'"></button>').join('')+'</div>'+
   '<button type="button" class="home-carousel-next" aria-label="Next featured slide">›</button>'+
   '<button type="button" class="home-carousel-pause" aria-label="Pause automatic slide changes" aria-pressed="false">Pause</button>'+
   '</div>':'')+'</section>';
}
export function stopHomeCarousel(){
 if(activeTimer!==null){clearInterval(activeTimer);activeTimer=null;}
 stopHandlers.forEach(clean=>clean());stopHandlers=[];currentRoot=null;
}
export function bindHomeCarousel(intervalSeconds=DEFAULT_CAROUSEL_INTERVAL_SECONDS){
 stopHomeCarousel();
 const root=document.querySelector('.home-carousel');if(!root)return;
 currentRoot=root;
 const slides=[...root.querySelectorAll('.home-carousel-slide')];
 if(slides.length<2)return;
 let index=0,manuallyPaused=false,hovered=false,focused=false;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const dots=[...root.querySelectorAll('[data-carousel-to]')],pause=root.querySelector('.home-carousel-pause');
 const show=(next,userAction=false)=>{
  if(userAction)manuallyPaused=true;
  index=(next+slides.length)%slides.length;
  slides.forEach((slide,i)=>{slide.hidden=i!==index;});
  dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===index);dot.setAttribute('aria-pressed',String(i===index));});
  if(userAction)pause.setAttribute('aria-pressed','true');
  if(userAction)pause.textContent='Play';
 };
 const tick=()=>{if(!document.hidden&&!hovered&&!focused&&!manuallyPaused&&currentRoot===root)show(index+1);};
 if(!reduced)activeTimer=setInterval(tick,carouselIntervalMilliseconds(intervalSeconds));
 const on=(target,event,handler)=>{target.addEventListener(event,handler);stopHandlers.push(()=>target.removeEventListener(event,handler));};
 on(root.querySelector('.home-carousel-prev'),'click',()=>show(index-1,true));
 on(root.querySelector('.home-carousel-next'),'click',()=>show(index+1,true));
 dots.forEach(dot=>on(dot,'click',()=>show(Number(dot.dataset.carouselTo),true)));
 on(pause,'click',()=>{manuallyPaused=!manuallyPaused;pause.textContent=manuallyPaused?'Play':'Pause';pause.setAttribute('aria-pressed',String(manuallyPaused));});
 on(root,'mouseenter',()=>{hovered=true;});on(root,'mouseleave',()=>{hovered=false;});
 on(root,'focusin',()=>{focused=true;});
 on(root,'focusout',event=>{if(!root.contains(event.relatedTarget))focused=false;});
 on(root,'keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();show(index+(event.key==='ArrowLeft'?-1:1),true);
  }
 });
 let startX=null;
 on(root,'touchstart',event=>{startX=event.changedTouches?.[0]?.clientX??null;});
 on(root,'touchend',event=>{
  const x=event.changedTouches?.[0]?.clientX;
  if(startX!==null&&Number.isFinite(x)&&Math.abs(startX-x)>60)show(index+(startX>x?1:-1),true);
  startX=null;
 });
}
