var synth=(()=>{var B=Object.defineProperty;var V=Object.getOwnPropertyDescriptor;var G=Object.getOwnPropertyNames;var H=Object.prototype.hasOwnProperty;var j=(t,e)=>{for(var n in e)B(t,n,{get:e[n],enumerable:!0})},J=(t,e,n,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of G(e))!H.call(t,r)&&r!==n&&B(t,r,{get:()=>e[r],enumerable:!(i=V(e,r))||i.enumerable});return t};var Y=t=>J(B({},"__esModule",{value:!0}),t);var Z={};j(Z,{Allocators:()=>X,ExamplePlugins:()=>Q,WorkletHelper:()=>F,createSampleSAB:()=>M,createSampleView:()=>P,createWorkletBlob:()=>T,gainClamped:()=>v,gainDecibels:()=>N,hex2str:()=>E,hexToPacked:()=>R,packRGBA:()=>O,packedToHex:()=>q,playSamples:()=>C,rmsGetDecibels:()=>W,sampleToSeconds:()=>$,str2hex:()=>U,struct:()=>L,sumBlocks:()=>k,sumTracks:()=>D,unpackRGBA:()=>_});function I(t){switch(t){case"u8":case"i8":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function g(t,e,n,i){let r=e.buffer,a=e.byteOffset+n;switch(t){case"u8":return new Uint8Array(r,a,i);case"i8":return new Int8Array(r,a,i);case"u16":return new Uint16Array(r,a,i);case"i16":return new Int16Array(r,a,i);case"u32":return new Uint32Array(r,a,i);case"i32":return new Int32Array(r,a,i);case"f32":return new Float32Array(r,a,i);case"f64":return new Float64Array(r,a,i);case"u64":return new BigUint64Array(r,a,i);case"i64":return new BigInt64Array(r,a,i)}}function A(t,e){if(typeof t=="bigint")return t;if(!Number.isSafeInteger(t))throw new Error("Number cannot safely fit in 64 bits");if(e){if(t<-9223372036854776e3||t>9223372036854776e3)throw new Error("Number out of i64 range")}else if(t<0||t>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(t)}function L(t){let e=0,n={},i=[];for(let[a,u]of Object.entries(t)){let f,o=1,d=u.match(/^([a-z0-9]+)\[(\d+)\]$/i);d?(f=d[1],o=parseInt(d[2],10)):f=u;let m=I(f)*o;I(f)===8&&(e=e+7&-8),n[a]={type:u,offset:e,size:m,arrayLength:o>1?o:void 0},i.push(a),e+=m}let r={_size:e,_fields:n,fieldOrder:i,Make(a,u,f){let o=f??a.malloc(r._size),d=o.ptr,m=!1,b=new Proxy({ptr:d,region:o,_type:r,read(l){if(m)throw new Error("Accessing destroyed struct");let s=n[l];if(!s)throw new Error("Invalid field "+l);let c=s.arrayLength?s.type.replace(/\[\d+\]$/,""):s.type;if(s.arrayLength)return g(c,o,s.offset,s.arrayLength);let p=g(c,o,s.offset,1);return p[0]},write(l,s){if(m)throw new Error("Writing to destroyed struct");let c=n[l];if(!c)throw new Error("Invalid field "+l);let p=c.arrayLength?c.type.replace(/\[\d+\]$/,""):c.type;if(c.arrayLength){let h=Array.isArray(s)?s:Array.from(s);if(h.length!==c.arrayLength)throw new Error(`Field ${l} expects array of length ${c.arrayLength}`);for(let y=0;y<c.arrayLength;y++){let S=g(p,o,c.offset+y*I(p),1);p==="u64"?S[0]=A(h[y],!1):p==="i64"?S[0]=A(h[y],!0):S[0]=h[y]}}else{let h=g(p,o,c.offset,1);p==="u64"?h[0]=A(s,!1):p==="i64"?h[0]=A(s,!0):h[0]=s}},destroy(){if(!m)a.free(o),m=!0;else throw new Error("Struct already destroyed")}},{get(l,s){return s in l?l[s]:l.read(s.toString())},set(l,s,c){return l.write(s.toString(),c),!0}});if(u)for(let[l,s]of Object.entries(u))b.write(l,s);return b}};return r}var x=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,a)=>r-a);if(n.length===0){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}if(n[0]>=e){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}for(let r=0;r<n.length;r++){let a=n[r],u=this.allocTable[a],f=r+1<n.length?n[r+1]:this.view.length,o=u;if(f-o>=e){this.allocTable[o]=o+e;let b=this.view.subarray(o,o+e);return b.ptr=o,b}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,n){let i=this.malloc(e._size);return i.fill(0),e.Make(this,n,i)}};var w=class{wantsMic;pluginName;type;phase;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.phase=0}process128(e){this.phase===void 0&&(this.phase=0);let a=2*Math.PI*430/44100;for(let u=0;u<e.length;u++)e[u]=Math.sin(this.phase)*.25,this.phase+=a,this.phase>2*Math.PI&&(this.phase-=2*Math.PI)}};var K=`
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
`;function T(){let t=new Blob([K],{type:"application/javascript"});return URL.createObjectURL(t)}function M(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function P(t){return new Float32Array(t)}var F=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,n){this.queueLength=e,this.audioCtx=n||new AudioContext({sampleRate:44100});let i=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(i)}async init(){let e=T();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let i=n.data.blockIndex%this.queueLength;this.onRequest(i)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node?.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};function U(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function E(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(n=>parseInt(n,16))))}function C(t,e=44100){let n=new(window.AudioContext||window.webkitAudioContext),i=n.createBuffer(1,t.length,e);i.copyToChannel(t,0,0);let r=n.createBufferSource();r.buffer=i,r.connect(n.destination),r.start()}function R(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),i=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|i<<16|n<<8|e}function q(t){let e=(t&255).toString(16).padStart(2,"0"),n=(t>>>8&255).toString(16).padStart(2,"0"),i=(t>>>16&255).toString(16).padStart(2,"0"),r=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${n}${i}${r}`}function O(t,e,n,i=255){return(i&255)<<24|(n&255)<<16|(e&255)<<8|t&255}function _(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var z={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function k(t,e,n){if(!(n in z))throw new Error(`Invalid block size: ${n}`);let i=z[n];if(i.length!==n)throw new Error("Buffer length mismatch");i.fill(0);for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(i[a]+=r[u])}for(let r=0;r<n;r++){let a=i[r];i[r]=a>1?1:a<-1?-1:a}return i}function D(t,e){if(t.length===0)return new Float32Array(0);let n=Math.max(...t.map(a=>a.length)),i=Math.ceil(n/e),r=new Float32Array(n);for(let a=0;a<i;a++){let u=a*e,f=k(t,u,e);for(let o=0;o<f.length&&u+o<n;o++)r[u+o]=f[o]}return r}function v(t,e){for(let n=0;n<t.length;n++)t[n]*=e,t[n]=Math.max(-1,Math.min(1,t[n]))}function N(t,e){let n=Math.pow(10,e/20);v(t,n)}function W(t){let e=0;for(let r=0;r<t.length;r++)e+=t[r]*t[r];let n=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(n,1e-12))}function $(t,e){return t/e}var Q={Sine:w},X={UseList_Heap:x};return Y(Z);})();
