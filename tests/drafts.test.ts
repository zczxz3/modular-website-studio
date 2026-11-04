import {describe,it,expect,vi} from 'vitest';
import {strFromU8} from 'fflate';
import {saveLocalDraft} from '../src/core/drafts';
import {RECENT_KEY,readRecent} from '../src/core/recent';
import {createBlank} from '../src/core/catalog';
import {transaction,ownStyle} from '../src/core/commands';
import {elements,sourceText} from '../src/core/source';
import {exportWebsite,readZip,parseProjectJson,saveProject} from '../src/core/io';
import type {Project} from '../src/core/types';

function memoryStorage(){
  const values=new Map<string,string>();
  return {values,getItem:vi.fn((key:string)=>values.get(key)??null),setItem:vi.fn((key:string,value:string)=>{values.set(key,value);})};
}
const heading=(project:Project)=>elements(sourceText(project)).find(node=>node.tag==='h1')!;

describe('local drafts use a single validated recent-project snapshot',()=>{
  it('updates one project without duplicating its assets or replacing another project',()=>{
    const storage=memoryStorage(),a=createBlank(),b=createBlank();a.name='林间';b.name='陈同学';
    a.files['assets/photo.png']={kind:'asset',content:'data:image/png;base64,AQID'};
    saveLocalDraft(storage,a);saveLocalDraft(storage,b);
    const edited=transaction(a,[{type:'text',id:heading(a).id,text:'我的第一件作品'}]);
    const rows=saveLocalDraft(storage,edited);
    expect(rows.map(row=>row.id)).toEqual([a.id,b.id]);
    expect([...storage.values.keys()]).toEqual([RECENT_KEY]);
    expect(storage.values.get(RECENT_KEY)!.match(/data:image\/png;base64,AQID/g)).toHaveLength(1);
    expect(readRecent(storage).map(row=>row.project)).toEqual([edited,b]);
    expect(sourceText(a)).not.toContain('我的第一件作品');
    edited.files['index.html']={kind:'text',content:'later unsaved mutation'};
    expect(sourceText(readRecent(storage)[0].project)).toContain('我的第一件作品');
  });

  it('retains the last saved bytes when browser quota or storage access fails',()=>{
    const storage=memoryStorage(),first=createBlank();saveLocalDraft(storage,first);
    const saved=storage.values.get(RECENT_KEY),changed=transaction(first,[{type:'text',id:heading(first).id,text:'尚未存下的编辑'}]);
    storage.setItem.mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError');});
    expect(()=>saveLocalDraft(storage,changed)).toThrow('下载可编辑工程备份');
    expect(storage.values.get(RECENT_KEY)).toBe(saved);
    expect(readRecent(storage)[0].project).toEqual(first);
    const denied={getItem:()=>{throw new DOMException('Denied','SecurityError');},setItem:vi.fn()};
    expect(()=>saveLocalDraft(denied,changed)).toThrow('浏览器未能保存草稿');
    expect(denied.setItem).not.toHaveBeenCalled();
  });

  it('rejects invalid source, missing identities and project-limit violations before storage changes',()=>{
    const storage=memoryStorage(),saved=createBlank();saveLocalDraft(storage,saved);
    const before=storage.values.get(RECENT_KEY);storage.setItem.mockClear();
    const invalid={...saved,files:{...saved.files,'broken.css':{kind:'text' as const,content:'h1 {'}}};
    const excessive={...saved,files:{...saved.files,...Object.fromEntries(Array.from({length:501},(_,i)=>[`notes/${i}.txt`,{kind:'text' as const,content:'note'}]))}};
    for(const project of [invalid,{...saved,id:undefined},excessive])expect(()=>saveLocalDraft(storage,project)).toThrow('草稿未保存');
    expect(storage.setItem).not.toHaveBeenCalled();expect(storage.values.get(RECENT_KEY)).toBe(before);
  });

  it('keeps two button designs independent through draft reload, project reopen and website export',()=>{
    let project=createBlank();const main=elements(sourceText(project)).find(node=>node.tag==='main')!;
    project=transaction(project,[{type:'insert',parentId:main.id,html:'<button type="button">蓝色主按钮</button>'}]);
    const first=elements(sourceText(project)).find(node=>node.tag==='button')!;
    project=transaction(project,[{type:'style',id:first.id,property:'background-color',value:'#2463eb'},{type:'duplicate',id:first.id}]);
    const second=elements(sourceText(project)).filter(node=>node.tag==='button')[1];
    project=transaction(project,[{type:'text',id:second.id,text:'白色次按钮'},{type:'style',id:second.id,property:'background-color',value:'#ffffff'}]);
    const storage=memoryStorage();saveLocalDraft(storage,project);
    const reopened=parseProjectJson(saveProject(readRecent(storage)[0].project));
    expect(ownStyle(reopened,first.id,'background-color')).toBe('#2463eb');
    expect(ownStyle(reopened,second.id,'background-color')).toBe('#ffffff');
    expect(first.id).not.toBe(second.id);
    const output=readZip(exportWebsite(reopened)),html=strFromU8(output['index.html']),css=strFromU8(output['studio.css']);
    expect(html).toContain('蓝色主按钮');expect(html).toContain('白色次按钮');
    expect(css).toContain(first.id);expect(css).toContain(second.id);
    expect(css).toContain('#2463eb');expect(css).toContain('#ffffff');
  });
});
