var synth=(()=>{var w=Object.defineProperty;var N=Object.getOwnPropertyDescriptor;var V=Object.getOwnPropertyNames;var G=Object.prototype.hasOwnProperty;var H=(t,e)=>{for(var r in e)w(t,r,{get:e[r],enumerable:!0})},j=(t,e,r,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of V(e))!G.call(t,n)&&n!==r&&w(t,n,{get:()=>e[n],enumerable:!(a=N(e,n))||a.enumerable});return t};var J=t=>j(w({},"__esModule",{value:!0}),t);var X={};H(X,{Allocators:()=>Q,ExamplePlugins:()=>K,WorkletHelper:()=>x,createSampleSAB:()=>k,createSampleView:()=>M,createWorkletBlob:()=>S,gainClamped:()=>B,gainDecibels:()=>z,hex2str:()=>P,hexToPacked:()=>E,packRGBA:()=>R,packedToHex:()=>U,playSamples:()=>C,rmsGetDecibels:()=>$,sampleToSeconds:()=>D,str2hex:()=>L,struct:()=>I,sumBlocks:()=>F,sumTracks:()=>_,unpackRGBA:()=>q});function v(t){switch(t){case"u8":case"i8":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function b(t,e,r,a){let n=e.buffer,o=e.byteOffset+r;switch(t){case"u8":return new Uint8Array(n,o,a);case"i8":return new Int8Array(n,o,a);case"u16":return new Uint16Array(n,o,a);case"i16":return new Int16Array(n,o,a);case"u32":return new Uint32Array(n,o,a);case"i32":return new Int32Array(n,o,a);case"f32":return new Float32Array(n,o,a);case"f64":return new Float64Array(n,o,a);default:throw new Error(`Unsupported type ${t}`)}}function I(t){let e=0,r={},a=[];for(let[o,u]of Object.entries(t)){let p,s=1,m=u.match(/^([a-z0-9]+)\[(\d+)\]$/i);m?(p=m[1],s=parseInt(m[2],10)):p=u;let f=v(p)*s;r[o]={type:u,offset:e,size:f,arrayLength:s>1?s:void 0},a.push(o),e+=f}let n={_size:e,_fields:r,fieldOrder:a,Make(o,u,p){let s=p??o.malloc(n._size),m=s.ptr,f=!1,h=new Proxy({ptr:m,region:s,_type:n,read(l){if(f)throw new Error("Accessing freed struct");let i=r[l];if(!i)throw new Error("Invalid field "+l);if(i.arrayLength){let c=i.type.replace(/\[\d+\]$/,"");return b(c,s,i.offset,i.arrayLength)}else{let c=i.type;return b(c,s,i.offset,1)[0]}},write(l,i){if(f)throw new Error("Writing to freed struct");let c=r[l];if(!c)throw new Error("Invalid field "+l);if(c.arrayLength){let d=c.type.replace(/\[\d+\]$/,""),T=Array.isArray(i)?i:Array.from(i);if(T.length!==c.arrayLength)throw new Error(`Field ${l} expects array of length ${c.arrayLength}`);for(let y=0;y<c.arrayLength;y++){let W=b(d,s,c.offset+y*v(d),1);W[0]=T[y]}}else{let d=b(c.type,s,c.offset,1);d[0]=i}},free(){if(!f)o.free(s),f=!0;else throw new Error("Struct already freed")}},{get(l,i){return i in l?l[i]:l.read(i.toString())},set(l,i,c){return l.write(i.toString(),c),!0}});if(u)for(let[l,i]of Object.entries(u))h.write(l,i);return h}};return n}var g=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let r=Object.keys(this.allocTable).map(n=>+n).sort((n,o)=>n-o);if(r.length===0){this.allocTable[0]=e;let n=this.view.subarray(0,e);return n.ptr=0,n}if(r[0]>=e){this.allocTable[0]=e;let n=this.view.subarray(0,e);return n.ptr=0,n}for(let n=0;n<r.length;n++){let o=r[n],u=this.allocTable[o],p=n+1<r.length?r[n+1]:this.view.length,s=u;if(p-s>=e){this.allocTable[s]=s+e;let h=this.view.subarray(s,s+e);return h.ptr=s,h}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,r){return e.Make(this,r,this.malloc(e._size))}};var A=class{wantsMic;pluginName;type;phase;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.phase=0}process128(e){this.phase===void 0&&(this.phase=0);let o=2*Math.PI*430/44100;for(let u=0;u<e.length;u++)e[u]=Math.sin(this.phase)*.25,this.phase+=o,this.phase>2*Math.PI&&(this.phase-=2*Math.PI)}};var Y=`
class SABWaveProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.blockSize = 128;
    this.queueLength = options.processorOptions.queueLength || 4;
    this.sampleBuffer = null;
    this.readIndex = 0;
    this.paused = false;
    this.globalSampleIndex = 0;
    this.counterView = null;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'waveBuffer' && data.buffer instanceof SharedArrayBuffer) {
        this.sampleBuffer = new Float32Array(data.buffer);
      } else if (data.type === 'pause') {
        this.paused = true;
        if (this.sampleBuffer) this.sampleBuffer.fill(0);
      } else if (data.type === 'unpause') {
        this.paused = false;
      } else if (data.type === 'scrub' && typeof data.sampleIndex === 'number') {
        this.globalSampleIndex = data.sampleIndex;
        this.readIndex = Math.floor(this.globalSampleIndex / this.blockSize);
        if (this.sampleBuffer) this.sampleBuffer.fill(0);
      } else if (data.type === 'sampleCounter' && data.buffer instanceof SharedArrayBuffer) {
        this.counterView = new Uint32Array(data.buffer);
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const channel = output[0];

    if (this.paused || !this.sampleBuffer) {
      channel.fill(0);
      return true;
    }

    const blockOffset = (this.readIndex % this.queueLength) * this.blockSize;
    for (let i = 0; i < this.blockSize; i++) {
      channel[i] = this.sampleBuffer[blockOffset + i];
    }

    this.port.postMessage({ type: 'requestBuffer', blockIndex: this.readIndex });

    this.readIndex++;
    this.globalSampleIndex += this.blockSize;

    if (this.counterView) {
      this.counterView[0] = this.globalSampleIndex;
    }

    return true;
  }
}

registerProcessor('SABWaveProcessor', SABWaveProcessor);
`;function S(){let t=new Blob([Y],{type:"application/javascript"});return URL.createObjectURL(t)}function k(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function M(t){return new Float32Array(t)}var x=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,r){this.queueLength=e,this.audioCtx=r||new AudioContext({sampleRate:44100});let a=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(a)}async init(){let e=S();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=r=>{if(r.data.type==="requestBuffer"){let a=r.data.blockIndex%this.queueLength;this.onRequest(a)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node?.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};function L(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function P(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(r=>parseInt(r,16))))}function C(t,e=44100){let r=new(window.AudioContext||window.webkitAudioContext),a=r.createBuffer(1,t.length,e);a.copyToChannel(t,0,0);let n=r.createBufferSource();n.buffer=a,n.connect(r.destination),n.start()}function E(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),r=parseInt(t.slice(2,4),16),a=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|a<<16|r<<8|e}function U(t){let e=(t&255).toString(16).padStart(2,"0"),r=(t>>>8&255).toString(16).padStart(2,"0"),a=(t>>>16&255).toString(16).padStart(2,"0"),n=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${r}${a}${n}`}function R(t,e,r,a=255){return(a&255)<<24|(r&255)<<16|(e&255)<<8|t&255}function q(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var O={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function F(t,e,r){if(!(r in O))throw new Error(`Invalid block size: ${r}`);let a=O[r];if(a.length!==r)throw new Error("Buffer length mismatch");a.fill(0);for(let n of t)for(let o=0;o<r;o++){let u=e+o;u<n.length&&(a[o]+=n[u])}for(let n=0;n<r;n++){let o=a[n];a[n]=o>1?1:o<-1?-1:o}return a}function _(t,e){if(t.length===0)return new Float32Array(0);let r=Math.max(...t.map(o=>o.length)),a=Math.ceil(r/e),n=new Float32Array(r);for(let o=0;o<a;o++){let u=o*e,p=F(t,u,e);for(let s=0;s<p.length&&u+s<r;s++)n[u+s]=p[s]}return n}function B(t,e){for(let r=0;r<t.length;r++)t[r]*=e,t[r]=Math.max(-1,Math.min(1,t[r]))}function z(t,e){let r=Math.pow(10,e/20);B(t,r)}function $(t){let e=0;for(let n=0;n<t.length;n++)e+=t[n]*t[n];let r=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(r,1e-12))}function D(t,e){return t/e}var K={Sine:A},Q={FreeList_Heap:g};return J(X);})();
