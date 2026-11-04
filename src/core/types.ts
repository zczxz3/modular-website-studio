export type ProjectFile = { kind: 'text'; content: string } | { kind: 'asset'; content: string };
export interface StudioModule {
  id: string; version: string; name: string; description: string;
  html: string; css: string; permissions: string[]; dependencies: Record<string, string>;
}
export interface Project {
  format: 'mws-project'; version: 1; name: string; entry: string;
  files: Record<string, ProjectFile>; modules: StudioModule[];
}
export interface SourceLocation {startOffset: number; endOffset: number; startLine: number; startCol: number; endLine: number; endCol: number;}
export interface ElementLocation extends SourceLocation {startTag?: SourceLocation; endTag?: SourceLocation; attrs?: Record<string, SourceLocation>;}
export interface HtmlNode {
  nodeName: string; tagName?: string; value?: string; data?: string;
  attrs?: {name: string; value: string}[]; childNodes?: HtmlNode[];
  parentNode?: HtmlNode; sourceCodeLocation?: ElementLocation;
}
export interface ElementInfo {id: string; tag: string; label: string; depth: number; parentId: string | null; node: HtmlNode; loc: ElementLocation;}
export interface Diagnostic {file: string; message: string; line: number; column: number;}
export type WireNode = {kind: 'text' | 'comment'; text: string} | {kind: 'element'; id: string; tag: string; attrs: Record<string,string>; children: WireNode[]};
export type EditCommand =
  | {type:'text'; id:string; text:string}
  | {type:'style'; id:string; property:string; value:string}
  | {type:'attribute'; id:string; name:string; value:string}
  | {type:'move'; id:string; parentId:string; beforeId?:string}
  | {type:'insert'; parentId:string; html:string}
  | {type:'delete'; id:string}
  | {type:'duplicate'; id:string};
export const ID_ATTR = 'data-mws-id';
export const STYLE_FILE = 'studio.css';
