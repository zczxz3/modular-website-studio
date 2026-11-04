// Test-only types for the subset of the installed jsdom runtime used below.
// Production code does not import jsdom or depend on this declaration.
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?:string,options?:{
      runScripts?:'dangerously'|'outside-only';
      resources?:'usable';
      url?:string;
      beforeParse?:(window:Window & typeof globalThis)=>void;
    });
    readonly window:Window & typeof globalThis & Record<string,unknown>;
  }
}
