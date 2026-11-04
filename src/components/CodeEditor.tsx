import { useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/language/html/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/css/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import type { Diagnostic, ElementInfo } from '../core/types';

self.MonacoEnvironment={getWorker(_id,label){if(label==='html')return new HtmlWorker();if(label==='css')return new CssWorker();if(label==='json')return new JsonWorker();if(label==='typescript'||label==='javascript')return new TsWorker();return new EditorWorker();}};
loader.config({monaco});
interface Props {file:string;content:string;onChange:(value:string)=>void;onCursor:(offset:number)=>void;selection?:ElementInfo;diagnostics:Diagnostic[];}
export default function CodeEditor({file,content,onChange,onCursor,selection,diagnostics}:Props){
  const editor=useRef<monaco.editor.IStandaloneCodeEditor|null>(null);const callbacks=useRef({onCursor});callbacks.current={onCursor};
  const decorations=useRef<monaco.editor.IEditorDecorationsCollection|null>(null);
  useEffect(()=>{const ed=editor.current;const model=ed?.getModel();if(!ed||!model||!selection||! /\.html?$/.test(file))return;
    const start=model.getPositionAt(selection.loc.startOffset);const end=model.getPositionAt(selection.loc.startTag!.endOffset);
    ed.revealLineInCenterIfOutsideViewport(start.lineNumber);decorations.current?.clear();decorations.current=ed.createDecorationsCollection([{range:new monaco.Range(start.lineNumber,start.column,end.lineNumber,end.column),options:{className:'source-selection'}}]);
  },[selection,file]);
  useEffect(()=>{const model=editor.current?.getModel();if(model)monaco.editor.setModelMarkers(model,'mws',diagnostics.filter(d=>d.file===file).map(d=>({severity:monaco.MarkerSeverity.Error,message:d.message,startLineNumber:d.line,endLineNumber:d.line,startColumn:d.column,endColumn:d.column+1})));},[diagnostics,file,content]);
  return <Editor path={file} value={content} language={file.endsWith('.css')?'css':file.endsWith('.ts')?'typescript':/\.m?js$/.test(file)?'javascript':file.endsWith('.json')?'json':'html'} theme="vs-dark" onChange={v=>onChange(v??'')} onMount={ed=>{editor.current=ed;ed.onDidChangeCursorPosition(()=>{const pos=ed.getPosition();if(pos&&ed.hasTextFocus())callbacks.current.onCursor(ed.getModel()!.getOffsetAt(pos));});}} options={{fontSize:12,minimap:{enabled:false},padding:{top:12},scrollBeyondLastLine:false,automaticLayout:true,wordWrap:'on',tabSize:2,ariaLabel:'项目源代码',stickyScroll:{enabled:false}}} loading={<div className="empty">正在加载本地 Monaco 编辑器…</div>}/>;
}
