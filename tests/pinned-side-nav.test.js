import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sideNavigationPinned,resetSideNavigationPin,bindSideNavigation} from '../site/side-navigation.js';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function element(){
 const listeners=new Map(),attributes=new Map(),classes=new Set();
 return {hidden:false,classList:{toggle:(name,value)=>{if(value===undefined)value=!classes.has(name);value?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)},
  addEventListener:(type,fn)=>{listeners.set(type,[...(listeners.get(type)||[]),fn]);},
  dispatch:(type,props={})=>{for(const fn of (listeners.get(type)||[]))fn({target:props.target||{},pointerType:props.pointerType,...props});},
  setAttribute:(key,val)=>attributes.set(key,String(val)),attribute:key=>attributes.get(key),
  contains:node=>node===null?false:false,focus:()=>{}
 };
}
function mounted(){
 const shell=element(),button=element(),panel=element();
 const root={querySelector:key=>key==='[data-side-navigation]'?shell:key==='#mobile-nav-toggle'?button:key==='#primary-navigation'?panel:null};
 bindSideNavigation(root);
 return {shell,button,panel};
}
test('side navigation hover reveals then hides without pinning',()=>{
 resetSideNavigationPin();const {shell,panel,button}=mounted();
 assert.equal(panel.hidden,true);
 shell.dispatch('pointerenter',{pointerType:'mouse'});
 assert.equal(panel.hidden,false);assert.equal(sideNavigationPinned(),false);
 assert.equal(button.attribute('aria-expanded'),'true');
 shell.dispatch('pointerleave',{pointerType:'mouse'});
 assert.equal(panel.hidden,true);assert.equal(button.attribute('aria-expanded'),'false');
});
test('click pins menu across pointer exit and route remount, link click does not unpin',()=>{
 resetSideNavigationPin();const first=mounted();first.button.dispatch('click');
 assert.equal(first.panel.hidden,false);assert.equal(sideNavigationPinned(),true);
 first.shell.dispatch('pointerleave',{pointerType:'mouse'});
 first.panel.dispatch('click',{target:{tagName:'A'}});
 assert.equal(sideNavigationPinned(),true);assert.equal(first.panel.hidden,false);
 const next=mounted();
 assert.equal(next.panel.hidden,false);
 next.button.dispatch('click');
 assert.equal(sideNavigationPinned(),false);assert.equal(next.panel.hidden,true);
});
test('empty menu-panel click pins and Escape closes it',()=>{
 resetSideNavigationPin();const {shell,panel}=mounted();
 panel.dispatch('click',{target:panel});
 assert.equal(sideNavigationPinned(),true);assert.equal(panel.hidden,false);
 shell.dispatch('keydown',{key:'Escape'});
 assert.equal(sideNavigationPinned(),false);assert.equal(panel.hidden,true);
});
test('top navigation keeps Home, Cart, Sign In or Account outside side menu',()=>{
 const app=source('site/app.js'),css=source('site/country-home-v2.css');
 const start=app.indexOf("$('#app').innerHTML=`<header"),end=app.indexOf('<main id="main"',start);
 const header=app.slice(start,end);
 assert.match(header,/class="nav-home-link"/);
 assert.match(header,/class="nav-cart-link"/);
 assert.match(header,/class="nav-utilities"/);
 assert.match(header,/accountNavigationMarkup\(Boolean\(currentUser\(\)\),verifiedBackOfficeRole\)/);
 const drawer=header.slice(header.indexOf('<nav id="primary-navigation"'),header.indexOf('</nav>',header.indexOf('<nav id="primary-navigation"')));
 assert.doesNotMatch(drawer,/Cart|Sign In|My Account/);
 assert.match(drawer,/Shop All/);assert.match(drawer,/Homestand Storefront/);
 assert.match(app,/bindSideNavigation\(\)/);
 assert.doesNotMatch(app,/primary\.querySelectorAll\('a'\)\.forEach\(link=>link\.addEventListener\('click',\(\)=>\{primary\.classList\.remove\('mobile-open'/);
 assert.match(css,/\.nav-utilities \.account-dropdown-panel/);
 assert.match(css,/\.nav-side-wrapper #primary-navigation\.navlinks\[hidden\]/);
});
test('all Showcase cards, including homepage, have matching Qty and Add to Cart footprint',()=>{
 const app=source('site/app.js'),css=source('site/country-home-v2.css');
 const card=app.slice(app.indexOf('const showcaseCard='),app.indexOf('function bindQuickCart()'));
 assert.match(card,/quickCartMarkup\(sale\)/);
 assert.match(card,/card-quick-buy is-unavailable/);
 assert.match(card,/disabled>Add to Cart/);
 assert.doesNotMatch(card,/Ask about ordering|Product information/);
 assert.match(app,/view\.products\.map\(card\)/);
 assert.match(app,/\.map\(showcaseCard\)\.join\(''\)/);
 assert.match(css,/\.store-showcase-card>.card-showcase-buy/);
});
