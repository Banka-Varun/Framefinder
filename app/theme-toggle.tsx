'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Monitor,Moon,Sun} from 'lucide-react';
type Appearance='system'|'light'|'dark';
const isAppearance=(value:unknown):value is Appearance=>['system','light','dark'].includes(String(value));
const ThemeContext=createContext<{appearance:Appearance;choose:(value:Appearance)=>void}>({appearance:'system',choose:()=>{}});
export function ThemeProvider({children}:{children:ReactNode}){
 const[appearance,setAppearance]=useState<Appearance>('system');
 useEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const read=():Appearance=>{try{const value=localStorage.getItem('ff-theme');return isAppearance(value)?value:'system';}catch{return 'system';}};
  let preference=read();
  const apply=()=>{document.documentElement.dataset.theme=preference==='system'?(media.matches?'dark':'light'):preference;setAppearance(preference);};
  const changed=(event:Event)=>{if(event instanceof StorageEvent&&event.key!==null&&event.key!=='ff-theme')return;preference=event instanceof CustomEvent&&isAppearance(event.detail)?event.detail:read();apply();};
  apply();media.addEventListener('change',apply);window.addEventListener('storage',changed);window.addEventListener('ff-appearance',changed);
  return()=>{media.removeEventListener('change',apply);window.removeEventListener('storage',changed);window.removeEventListener('ff-appearance',changed);};
 },[]);
 function choose(value:Appearance){setAppearance(value);document.documentElement.dataset.theme=value==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):value;try{localStorage.setItem('ff-theme',value);}catch{}window.dispatchEvent(new CustomEvent('ff-appearance',{detail:value}));}
 return <ThemeContext.Provider value={{appearance,choose}}>{children}</ThemeContext.Provider>;
}
export function AppearanceSettings(){const{appearance,choose}=useContext(ThemeContext);return <section className="panel appearance-settings" id="appearance"><h2>Appearance</h2><p className="muted">Choose a theme for this browser, or follow your device.</p><fieldset><legend>App theme</legend><div className="appearance-options">{([{value:'system',label:'System',detail:'Match your device',Icon:Monitor},{value:'light',label:'Light',detail:'Always use light mode',Icon:Sun},{value:'dark',label:'Dark',detail:'Always use dark mode',Icon:Moon}] as const).map(({value,label,detail,Icon})=><label className="appearance-choice" key={value}><input type="radio" name="appearance" value={value} checked={appearance===value} onChange={()=>choose(value)}/><span className={'appearance-preview '+value} aria-hidden="true"><span/><span/><span/></span><strong><Icon size={17}/>{label}</strong><small>{detail}</small></label>)}</div></fieldset><p className="small" role="status">{appearance==='system'?'Theme follows your device automatically.':(appearance==='light'?'Light':'Dark')+' theme selected.'}</p></section>;}
