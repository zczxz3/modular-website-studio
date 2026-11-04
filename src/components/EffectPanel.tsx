import {XYZ_PRESETS,applyXyz} from '../core/xyz';
import {ownStyle} from '../core/commands';
import {useEffect,useRef,useState} from 'react';
import type {Project} from '../core/types';
import {attr,getElement} from '../core/source';
import {applyReveal,DEFAULT_REVEAL,revealFor,type Reveal} from '../core/workbench';
import {AOS_EFFECTS,DEFAULT_AOS,AOS_ATTRIBUTES,aosFor,aosDependencies,applyAos,type AosConfig} from '../core/aos';
import {applicableEffects,applyCssEffect,cssEffectFor,type CssEffectId} from '../core/effects';

interface Props {project:Project;id:string;locked:boolean;onChange:(project:Project,label:string)=>void;onReplay:()=>void;onPreview:()=>void;}
function NumberField({label,value,onCommit}:{label:string;value:number;onCommit:(value:number)=>void}){
  const [local,setLocal]=useState(String(value)),cancel=useRef(false);useEffect(()=>setLocal(String(value)),[value]);
  const commit=()=>{if(cancel.current){cancel.current=false;return;}if(local!==String(value))onCommit(Number(local));};
  return <label className="field"><span>{label}</span><input aria-label={label} type="number" value={local} onChange={e=>setLocal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){cancel.current=true;setLocal(String(value));e.currentTarget.blur();}}}/></label>;
}
const speeds=[{value:1000,label:'舒缓'},{value:650,label:'自然'},{value:350,label:'轻快'}];
const strengths=[{value:0,label:'轻 · 只淡入'},{value:24,label:'中 · 轻轻上移'},{value:48,label:'强 · 更明显'}];

export default function EffectPanel({project,id,locked,onChange,onReplay,onPreview}:Props){
  const [error,setError]=useState('');useEffect(()=>setError(''),[id]);
  const node=getElement(project,id),aos=aosFor(project,id),motion=revealFor(project,id),effects=applicableEffects(project,id),effect=cssEffectFor(project,id);
  const canReveal=node.tag!=='body'&&!['script','style','link'].includes(node.tag);
  const change=(create:()=>Project,label:string)=>{try{onChange(create(),label);setError('');}catch(problem){setError((problem as Error).message);}};
  const update=(config:Reveal|null)=>change(()=>applyReveal(project,id,config),config?'设置入场效果':'移除入场效果');
  const updateAos=(next:AosConfig|null)=>change(()=>applyAos(project,id,next),next?'设置滚动动画':'移除滚动动画');
  const apply=(next:CssEffectId|null)=>change(()=>applyCssEffect(project,id,next),next?'应用外观效果':'移除外观效果');
  return <fieldset disabled={locked} className="effect-panel"><legend>适用特效 · 可添加</legend>
    {canReveal&&<><label className="field"><span>组合动效</span><select aria-label="组合动效" value={attr(node.node,'data-mws-xyz')||''} onChange={e=>change(()=>applyXyz(project,id,e.target.value),'设置组合动效')}><option value="">不添加</option>{XYZ_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{attr(node.node,'data-mws-xyz')&&<><NumberField label="组合时长（毫秒）" value={parseFloat(ownStyle(project,id,'--xyz-duration'))||650} onCommit={v=>change(()=>applyXyz(project,id,attr(node.node,'data-mws-xyz')!,v,parseFloat(ownStyle(project,id,'--xyz-delay'))||0),'调整组合时长')}/><NumberField label="组合延迟（毫秒）" value={parseFloat(ownStyle(project,id,'--xyz-delay'))||0} onCommit={v=>change(()=>applyXyz(project,id,attr(node.node,'data-mws-xyz')!,parseFloat(ownStyle(project,id,'--xyz-duration'))||650,v),'调整组合延迟')}/><button onClick={onPreview}>预览组合动效</button><p className="hint">AnimXYZ 本地 CSS · 页面打开时播放，导出后独立运行。画布保持可见。</p></>}</>}
    {canReveal&&<>
      <label className="field"><span>滚动动画</span><select aria-label="滚动动画" value={aos?.effect||''} onChange={e=>updateAos(e.target.value?{...(aos||DEFAULT_AOS),effect:e.target.value}:null)}><option value="">不添加</option>{AOS_EFFECTS.map(effect=><option key={effect.value} value={effect.value}>{effect.label}</option>)}{aos&&!AOS_EFFECTS.some(effect=>effect.value===aos.effect)&&<option value={aos.effect}>{aos.effect} · 导入配置</option>}</select></label>
      {aos&&<>
        <NumberField label="动画时长（毫秒）" value={aos.duration} onCommit={duration=>updateAos({...aos,duration})}/>
        <NumberField label="延迟（毫秒）" value={aos.delay} onCommit={delay=>updateAos({...aos,delay})}/>
        <NumberField label="触发距离（像素）" value={aos.offset} onCommit={offset=>updateAos({...aos,offset})}/>
        <label className="effect-once"><input type="checkbox" aria-label="只播放一次" checked={aos.once} onChange={e=>updateAos({...aos,once:e.target.checked})}/>只播放一次</label>
        <div className="row-actions"><button onClick={onPreview}>预览滚动效果</button><button onClick={()=>updateAos(null)}>移除滚动动画</button></div>
        <details className="effect-details"><summary>查看 HTML 配置与依赖</summary><code className="effect-source">{AOS_ATTRIBUTES.map(name=>`${name}="${attr(node.node,name)||''}"`).join('\n')}</code><ul>{aosDependencies(project).map(path=><li key={path}><code>{path}</code></li>)}</ul></details>
        <p className="hint">滚动效果由 AOS 提供，预览与导出时运行。画布中保持可见，方便拖动和改字。</p>
      </>}
    </>}
    {canReveal&&!aos&&<>
      {!motion?<button className="wide-button" onClick={()=>update(DEFAULT_REVEAL)}>应用淡入并上移</button>:<>
        <label className="field"><span>触发时机</span><select aria-label="触发时机" value={motion.trigger} onChange={e=>update({...motion,trigger:e.target.value as Reveal['trigger']})}><option value="enter">进入屏幕</option><option value="load">页面打开</option></select></label>
        <label className="field"><span>快慢</span><select aria-label="快慢" value={speeds.some(item=>item.value===motion.duration)?String(motion.duration):'custom'} onChange={e=>{if(e.target.value!=='custom')update({...motion,duration:Number(e.target.value)});}}>{speeds.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}{!speeds.some(item=>item.value===motion.duration)&&<option value="custom">自定义</option>}</select></label>
        <label className="field"><span>强弱</span><select aria-label="强弱" value={strengths.some(item=>item.value===motion.distance)?String(motion.distance):'custom'} onChange={e=>{if(e.target.value!=='custom')update({...motion,distance:Number(e.target.value)});}}>{strengths.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}{!strengths.some(item=>item.value===motion.distance)&&<option value="custom">自定义</option>}</select></label>
        <div className="row-actions"><button onClick={onReplay}>重播效果</button><button onClick={()=>update(null)}>删除效果</button></div>
        <details key={id} className="effect-details"><summary>精细设置</summary><NumberField label="速度（毫秒）" value={motion.duration} onCommit={duration=>update({...motion,duration})}/><NumberField label="延迟（毫秒）" value={motion.delay} onCommit={delay=>update({...motion,delay})}/><NumberField label="上移距离（像素）" value={motion.distance} onCommit={distance=>update({...motion,distance})}/></details>
      </>}
    </>}
    {effects.length>0&&<><label className="field"><span>外观效果</span><select aria-label="外观效果" value={effect||''} onChange={e=>apply(e.target.value?e.target.value as CssEffectId:null)}><option value="">保持原样</option>{effects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{effect&&<><p className="hint">{effects.find(item=>item.id===effect)?.description}</p><button className="wide-button" onClick={()=>apply(null)}>移除外观效果</button></>}</>}
    {error&&<p role="alert" className="hint">{error}</p>}
    {!canReveal&&!effects.length?<p className="hint">请选择标题、封面或页面区块添加特效。</p>:<p className="hint">这些效果会随作品一起导出。系统开启“减少动态效果”时，自动减少移动。</p>}
  </fieldset>;
}
