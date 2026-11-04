declare module 'grapick' {
  interface Picker {setValue(value:string):void;getValue():string;setDirection(value:string):void;on(name:string,callback:()=>void):void;destroy():void;}
  export default function Grapick(options:{el:HTMLElement;height?:string;emptyColor?:string}):Picker;
}
