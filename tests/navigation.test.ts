import assert from 'node:assert/strict';
import AppLink from '../app/app-link';

const visits:string[]=[],events:string[]=[];
const previousWindow=(globalThis as any).window;
const previousPopState=(globalThis as any).PopStateEvent;
(globalThis as any).window={history:{pushState:(_:unknown,__:string,url:string)=>visits.push(url)},dispatchEvent:(e:Event)=>events.push(e.type),scrollTo:()=>{}};
(globalThis as any).PopStateEvent=Event;
try{
 function click(props:any,changes:any={}){
  const e={button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...changes};
  const element=AppLink(props);element.props.onClick(e);return e;
 }
 for(const href of ['/films','/my-list','/booking-alerts','/seat-alerts','/tickets','/messages']){
  assert.equal(click({href}).defaultPrevented,true);assert.equal(visits.at(-1),href);assert.equal(events.at(-1),'popstate');
 }
 const count=visits.length;
 for(const change of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{button:1},{defaultPrevented:true}])assert.equal(click({href:'/films'},change).defaultPrevented,!!change.defaultPrevented);
 for(const props of [{href:'https://example.com'},{href:'/films',target:'_blank'},{href:'/export',download:''}])assert.equal(click(props).defaultPrevented,false);
 click({href:'/films',onClick:(e:any)=>e.preventDefault()});assert.equal(visits.length,count);
 console.log('PASS route clicks update native history; new-tab, external and download links retain browser behavior');
}finally{(globalThis as any).window=previousWindow;(globalThis as any).PopStateEvent=previousPopState;}
