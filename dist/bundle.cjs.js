var synth=(()=>{var _=Object.defineProperty;var j=Object.getOwnPropertyDescriptor;var J=Object.getOwnPropertyNames;var Y=Object.prototype.hasOwnProperty;var K=(t,e)=>{for(var n in e)_(t,n,{get:e[n],enumerable:!0})},Q=(t,e,n,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of J(e))!Y.call(t,r)&&r!==n&&_(t,r,{get:()=>e[r],enumerable:!(a=j(e,r))||a.enumerable});return t};var X=t=>Q(_({},"__esModule",{value:!0}),t);var ne={};K(ne,{Allocators:()=>re,ExamplePlugins:()=>te,Track:()=>F,WorkletHelper:()=>y,Workspace:()=>I,createSampleSAB:()=>B,createSampleView:()=>k,createWorkletBlob:()=>L,gainClamped:()=>P,gainDecibels:()=>H,hex2str:()=>C,hexToPacked:()=>W,packRGBA:()=>D,packedToHex:()=>O,playSamples:()=>R,rmsGetDecibels:()=>V,sampleToSeconds:()=>G,str2hex:()=>q,struct:()=>U,sumBlocks:()=>E,sumBlocksMutate:()=>S,sumTracks:()=>z,unpackRGBA:()=>N});function M(t){switch(t){case"u8":case"i8":case"bool":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function w(t,e,n,a){let r=e.buffer,o=e.byteOffset+n;switch(t){case"u8":return new Uint8Array(r,o,a);case"i8":return new Int8Array(r,o,a);case"bool":return new Uint8Array(r,o,a);case"u16":return new Uint16Array(r,o,a);case"i16":return new Int16Array(r,o,a);case"u32":return new Uint32Array(r,o,a);case"i32":return new Int32Array(r,o,a);case"f32":return new Float32Array(r,o,a);case"f64":return new Float64Array(r,o,a);case"u64":return new BigUint64Array(r,o,a);case"i64":return new BigInt64Array(r,o,a)}}function x(t,e){if(typeof t=="bigint")return t;if(!Number.isSafeInteger(t))throw new Error("Number cannot safely fit in 64 bits");if(e){if(t<-9223372036854776e3||t>9223372036854776e3)throw new Error("Number out of i64 range")}else if(t<0||t>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(t)}function U(t){let e=0,n={},a=[];for(let[o,i]of Object.entries(t)){let p,s=1,d=i.match(/^([a-z0-9]+)\[(\d+)\]$/i);d?(p=d[1],s=parseInt(d[2],10)):p=i;let h=M(p)*s;M(p)===8&&(e=e+7&-8),n[o]={type:i,offset:e,size:h,arrayLength:s>1?s:void 0},a.push(o),e+=h}let r={_size:e,_fields:n,fieldOrder:a,Make(o,i,p){let s=p??o.malloc(r._size),d=s.ptr,h=!1,g=new Proxy({ptr:d,region:s,_type:r,get destroyed(){return h},read(c){if(h)throw new Error("Accessing destroyed struct");let u=n[c];if(!u)throw new Error("Invalid field "+c);let l=u.arrayLength?u.type.replace(/\[\d+\]$/,""):u.type;if(u.arrayLength)return w(l,s,u.offset,u.arrayLength);let f=w(l,s,u.offset,1);return l==="bool"?!!(Number(f[0])^0):f[0]},write(c,u){if(h)throw new Error("Writing to destroyed struct");let l=n[c];if(!l)throw new Error("Invalid field "+c);let f=l.arrayLength?l.type.replace(/\[\d+\]$/,""):l.type;if(l.arrayLength){let m=Array.isArray(u)?u:Array.from(u);if(m.length!==l.arrayLength)throw new Error(`Field ${c} expects array of length ${l.arrayLength}`);for(let b=0;b<l.arrayLength;b++){let A=w(f,s,l.offset+b*M(f),1);f==="bool"?A[0]=m[b]?1:0:f==="u64"?A[0]=x(m[b],!1):f==="i64"?A[0]=x(m[b],!0):A[0]=m[b]}}else{let m=w(f,s,l.offset,1);f==="bool"?m[0]=u?1:0:f==="u64"?m[0]=x(u,!1):f==="i64"?m[0]=x(u,!0):m[0]=u}},destroy(){if(h)throw new Error("Struct already destroyed");o.free(s),h=!0}},{get(c,u){return u in c?c[u]:c.read(u.toString())},set(c,u,l){return u in c||c.write(u.toString(),l),!0}});if(i)for(let[c,u]of Object.entries(i))g.write(c,u);return g}};return r}var Z=-1,F=class{id;plugin;active;buffer;constructor(e){this.id=++Z,this.plugin=e,this.buffer=new Float32Array(128),this.active=!0}process128(e){return this.plugin.process128(this.buffer,e)}};function S(t,e,n,a){if(a.length<n)throw new Error("Output buffer too small");for(let r=0;r<n;r++)a[r]=0;for(let r of t)for(let o=0;o<n;o++){let i=e+o;i<r.length&&(a[o]+=r[i])}for(let r=0;r<n;r++){let o=a[r];a[r]=o>1?1:o<-1?-1:o}}var ee=`
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
        if (this.sampleBuffer && this.onRequest) {
          const firstBlock = Math.floor(this.globalSampleIndex / this.blockSize);
          this.onRequest(firstBlock);
        }
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

    this.readIndex++;
    this.globalSampleIndex += this.blockSize;

    if (this.counterView) {
      this.counterView[0] = this.globalSampleIndex;
    }

    const blockOffset = (this.readIndex % this.queueLength) * this.blockSize;
    for (let i = 0; i < this.blockSize; i++) {
      channel[i] = this.sampleBuffer[blockOffset + i];
    }

    this.port.postMessage({ type: 'requestBuffer', blockIndex: this.readIndex });


    return true;
  }
}

registerProcessor('SABWaveProcessor', SABWaveProcessor);
`;function L(){let t=new Blob([ee],{type:"application/javascript"});return URL.createObjectURL(t)}function B(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function k(t){return new Float32Array(t)}var y=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,n){this.queueLength=e,this.audioCtx=n||new AudioContext({sampleRate:44100});let a=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(a)}async init(){let e=L();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.onprocessorerror=n=>{console.error("Error in worklet processor:",n)},this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let a=n.data.blockIndex;this.onRequest(a)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};var I=class{mainWorklet;queue_length;sample_sab;counter_sab;sample_view;current_sample;tracks;constructor(e){this.queue_length=e+1,this.mainWorklet=new y(this.queue_length),this.sample_sab=B(this.queue_length),this.sample_view=k(this.sample_sab),this.counter_sab=new SharedArrayBuffer(4),this.current_sample=0,this.tracks=[]}async init(){await this.mainWorklet.init(),this.mainWorklet.onRequest=e=>{console.log("blockIndex",e);let n=e%this.queue_length,a=[];for(let i=0;i<this.tracks.length;i++)this.tracks[i].plugin.process128(this.tracks[i].buffer,this.current_sample),this.tracks[i].active&&a.push(this.tracks[i].buffer);let r=new Float32Array(128),o=n*128;S(a,0,128,r),this.sample_view.set(r,o),this.current_sample+=128},this.mainWorklet.setSAB(this.sample_sab)}async start(){await this.mainWorklet.connect(),await this.mainWorklet.start(),await this.mainWorklet.unpause()}pause(){this.mainWorklet.pause()}unpause(){this.mainWorklet.unpause()}setLatency(e){this.queue_length=e+1}addTrack(e){this.tracks.push(e)}scrub(e){this.current_sample=e,this.mainWorklet.scrub(this.current_sample)}};var T=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,o)=>r-o);if(n.length===0){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}if(n[0]>=e){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}for(let r=0;r<n.length;r++){let o=n[r],i=this.allocTable[o],p=r+1<n.length?n[r+1]:this.view.length,s=i;if(p-s>=e){this.allocTable[s]=s+e;let g=this.view.subarray(s,s+e);return g.ptr=s,g}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,n){let a=this.malloc(e._size);return a.fill(0),e.Make(this,n,a)}};var v=class{wantsMic;pluginName;type;freq;amp;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.freq=440,this.amp=.25}process128(e,n){console.log("startSample",n);let r=2*Math.PI*this.freq/44100;for(let o=0;o<e.length;o++){let i=(n+o)*r;e[o]=Math.sin(i)*this.amp}}};function q(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function C(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(n=>parseInt(n,16))))}function R(t,e=44100){let n=new(window.AudioContext||window.webkitAudioContext),a=n.createBuffer(1,t.length,e);a.copyToChannel(t,0,0);let r=n.createBufferSource();r.buffer=a,r.connect(n.destination),r.start()}function W(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),a=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|a<<16|n<<8|e}function O(t){let e=(t&255).toString(16).padStart(2,"0"),n=(t>>>8&255).toString(16).padStart(2,"0"),a=(t>>>16&255).toString(16).padStart(2,"0"),r=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${n}${a}${r}`}function D(t,e,n,a=255){return(a&255)<<24|(n&255)<<16|(e&255)<<8|t&255}function N(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var $={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function E(t,e,n){if(!(n in $))throw new Error(`Invalid block size: ${n}`);let a=$[n];if(a.length!==n)throw new Error("Buffer length mismatch");a.fill(0);for(let r of t)for(let o=0;o<n;o++){let i=e+o;i<r.length&&(a[o]+=r[i])}for(let r=0;r<n;r++){let o=a[r];a[r]=o>1?1:o<-1?-1:o}return a}function z(t,e){if(t.length===0)return new Float32Array(0);let n=Math.max(...t.map(o=>o.length)),a=Math.ceil(n/e),r=new Float32Array(n);for(let o=0;o<a;o++){let i=o*e,p=E(t,i,e);for(let s=0;s<p.length&&i+s<n;s++)r[i+s]=p[s]}return r}function P(t,e){for(let n=0;n<t.length;n++)t[n]*=e,t[n]=Math.max(-1,Math.min(1,t[n]))}function H(t,e){let n=Math.pow(10,e/20);P(t,n)}function V(t){let e=0;for(let r=0;r<t.length;r++)e+=t[r]*t[r];let n=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(n,1e-12))}function G(t,e){return t/e}var te={Sine:v},re={UseList_Heap:T};return X(ne);})();
