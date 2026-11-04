import {useEffect,useState} from 'react';
import {Sparkles,ChevronDown,Image,Type,Smartphone,Check} from 'lucide-react';
import type {Project} from '../core/types';
import {studentProfile} from '../core/profile';
interface Props {project:Project;locked:boolean;onName:(name:string)=>void;onCover:()=>void;onEffect:()=>void;onMobile:()=>void;}
export default function StudentGuide(p:Props){
  const profile=studentProfile(p.project),[name,setName]=useState(profile?.name||''),[open,setOpen]=useState(true);
  useEffect(()=>setName(profile?.name||''),[p.project.id,profile?.name]);
  if(!profile)return null;
  return <section className={'student-guide '+(open?'':'is-collapsed')} aria-label="创作步骤">
    <button className="guide-toggle" aria-label="创作指引" aria-expanded={open} onClick={()=>setOpen(!open)}><span className="guide-icon"><Sparkles size={17}/></span><span>快速开始<small>{open?'让模板成为你的作品':'展开创作步骤'}</small></span><ChevronDown size={14}/></button>
    {open&&<><form onSubmit={e=>{e.preventDefault();if(!p.locked)p.onName(name);}}><label>你的姓名<input aria-label="你的姓名" value={name} onChange={e=>setName(e.target.value)} disabled={p.locked} placeholder="填上自己的名字"/></label><button disabled={p.locked||!name.trim()}><Check size={14}/>应用姓名</button></form><nav aria-label="第一次创作"><button disabled={p.locked} onClick={p.onCover}><Image size={15}/>换作品封面</button><button disabled={p.locked} onClick={p.onEffect}><Type size={15}/>给标题加特效</button><button disabled={p.locked} onClick={p.onMobile}><Smartphone size={15}/>390px 手机预览</button></nav></>}
  </section>;
}
