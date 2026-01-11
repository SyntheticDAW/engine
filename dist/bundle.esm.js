function S(e){switch(e){case"u8":case"i8":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function g(e,t,r,i){let n=t.buffer,a=t.byteOffset+r;switch(e){case"u8":return new Uint8Array(n,a,i);case"i8":return new Int8Array(n,a,i);case"u16":return new Uint16Array(n,a,i);case"i16":return new Int16Array(n,a,i);case"u32":return new Uint32Array(n,a,i);case"i32":return new Int32Array(n,a,i);case"f32":return new Float32Array(n,a,i);case"f64":return new Float64Array(n,a,i);case"u64":return new BigUint64Array(n,a,i);case"i64":return new BigInt64Array(n,a,i)}}function A(e,t){if(typeof e=="bigint")return e;if(!Number.isSafeInteger(e))throw new Error("Number cannot safely fit in 64 bits");if(t){if(e<-9223372036854776e3||e>9223372036854776e3)throw new Error("Number out of i64 range")}else if(e<0||e>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(e)}function L(e){let t=0,r={},i=[];for(let[a,u]of Object.entries(e)){let f,o=1,d=u.match(/^([a-z0-9]+)\[(\d+)\]$/i);d?(f=d[1],o=parseInt(d[2],10)):f=u;let m=S(f)*o;S(f)===8&&(t=t+7&-8),r[a]={type:u,offset:t,size:m,arrayLength:o>1?o:void 0},i.push(a),t+=m}let n={_size:t,_fields:r,fieldOrder:i,Make(a,u,f){let o=f??a.malloc(n._size),d=o.ptr,m=!1,b=new Proxy({ptr:d,region:o,_type:n,read(l){if(m)throw new Error("Accessing destroyed struct");let s=r[l];if(!s)throw new Error("Invalid field "+l);let c=s.arrayLength?s.type.replace(/\[\d+\]$/,""):s.type;if(s.arrayLength)return g(c,o,s.offset,s.arrayLength);let p=g(c,o,s.offset,1);return p[0]},write(l,s){if(m)throw new Error("Writing to destroyed struct");let c=r[l];if(!c)throw new Error("Invalid field "+l);let p=c.arrayLength?c.type.replace(/\[\d+\]$/,""):c.type;if(c.arrayLength){let h=Array.isArray(s)?s:Array.from(s);if(h.length!==c.arrayLength)throw new Error(`Field ${l} expects array of length ${c.arrayLength}`);for(let y=0;y<c.arrayLength;y++){let F=g(p,o,c.offset+y*S(p),1);p==="u64"?F[0]=A(h[y],!1):p==="i64"?F[0]=A(h[y],!0):F[0]=h[y]}}else{let h=g(p,o,c.offset,1);p==="u64"?h[0]=A(s,!1):p==="i64"?h[0]=A(s,!0):h[0]=s}},destroy(){if(!m)a.free(o),m=!0;else throw new Error("Struct already destroyed")}},{get(l,s){return s in l?l[s]:l.read(s.toString())},set(l,s,c){return l.write(s.toString(),c),!0}});if(u)for(let[l,s]of Object.entries(u))b.write(l,s);return b}};return n}var x=class{arrayBuffer;view;allocTable;constructor(t){this.arrayBuffer=new ArrayBuffer(t),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(t){let r=Object.keys(this.allocTable).map(n=>+n).sort((n,a)=>n-a);if(r.length===0){this.allocTable[0]=t;let n=this.view.subarray(0,t);return n.ptr=0,n}if(r[0]>=t){this.allocTable[0]=t;let n=this.view.subarray(0,t);return n.ptr=0,n}for(let n=0;n<r.length;n++){let a=r[n],u=this.allocTable[a],f=n+1<r.length?r[n+1]:this.view.length,o=u;if(f-o>=t){this.allocTable[o]=o+t;let b=this.view.subarray(o,o+t);return b.ptr=o,b}}throw new Error("Out of memory")}free(t){if(!this.allocTable[t.ptr])throw new Error("double free");delete this.allocTable[t.ptr]}new(t,r){let i=this.malloc(t._size);return i.fill(0),t.Make(this,r,i)}};var w=class{wantsMic;pluginName;type;phase;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.phase=0}process128(t){this.phase===void 0&&(this.phase=0);let a=2*Math.PI*430/44100;for(let u=0;u<t.length;u++)t[u]=Math.sin(this.phase)*.25,this.phase+=a,this.phase>2*Math.PI&&(this.phase-=2*Math.PI)}};var M=`
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
`;function I(){let e=new Blob([M],{type:"application/javascript"});return URL.createObjectURL(e)}function P(e){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*e)}function U(e){return new Float32Array(e)}var B=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(t=4,r){this.queueLength=t,this.audioCtx=r||new AudioContext({sampleRate:44100});let i=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(i)}async init(){let t=I();await this.audioCtx.audioWorklet.addModule(t),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=r=>{if(r.data.type==="requestBuffer"){let i=r.data.blockIndex%this.queueLength;this.onRequest(i)}}}setSAB(t){this.sampleBuffer=new Float32Array(t),this.node?.port.postMessage({type:"waveBuffer",buffer:t})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(t){this.node?.port.postMessage({type:"scrub",sampleIndex:t}),this.sampleCounter[0]=t}connect(t){t?this.node?.connect(t):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};function E(e){return[...new TextEncoder().encode(e)].map(t=>t.toString(16).padStart(2,"0")).join("")}function C(e){let t=e.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(t.map(r=>parseInt(r,16))))}function R(e,t=44100){let r=new(window.AudioContext||window.webkitAudioContext),i=r.createBuffer(1,e.length,t);i.copyToChannel(e,0,0);let n=r.createBufferSource();n.buffer=i,n.connect(r.destination),n.start()}function q(e){e=e.replace(/^#/,"");let t=parseInt(e.slice(0,2),16),r=parseInt(e.slice(2,4),16),i=parseInt(e.slice(4,6),16);return(e.length===8?parseInt(e.slice(6,8),16):255)<<24|i<<16|r<<8|t}function O(e){let t=(e&255).toString(16).padStart(2,"0"),r=(e>>>8&255).toString(16).padStart(2,"0"),i=(e>>>16&255).toString(16).padStart(2,"0"),n=(e>>>24&255).toString(16).padStart(2,"0");return`#${t}${r}${i}${n}`}function _(e,t,r,i=255){return(i&255)<<24|(r&255)<<16|(t&255)<<8|e&255}function z(e){return[e&255,e>>>8&255,e>>>16&255,e>>>24&255]}var T={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function k(e,t,r){if(!(r in T))throw new Error(`Invalid block size: ${r}`);let i=T[r];if(i.length!==r)throw new Error("Buffer length mismatch");i.fill(0);for(let n of e)for(let a=0;a<r;a++){let u=t+a;u<n.length&&(i[a]+=n[u])}for(let n=0;n<r;n++){let a=i[n];i[n]=a>1?1:a<-1?-1:a}return i}function D(e,t){if(e.length===0)return new Float32Array(0);let r=Math.max(...e.map(a=>a.length)),i=Math.ceil(r/t),n=new Float32Array(r);for(let a=0;a<i;a++){let u=a*t,f=k(e,u,t);for(let o=0;o<f.length&&u+o<r;o++)n[u+o]=f[o]}return n}function v(e,t){for(let r=0;r<e.length;r++)e[r]*=t,e[r]=Math.max(-1,Math.min(1,e[r]))}function N(e,t){let r=Math.pow(10,t/20);v(e,r)}function W(e){let t=0;for(let n=0;n<e.length;n++)t+=e[n]*e[n];let r=Math.sqrt(t/e.length);return 20*Math.log10(Math.max(r,1e-12))}function $(e,t){return e/t}var oe={Sine:w},se={UseList_Heap:x};export{se as Allocators,oe as ExamplePlugins,B as WorkletHelper,P as createSampleSAB,U as createSampleView,I as createWorkletBlob,v as gainClamped,N as gainDecibels,C as hex2str,q as hexToPacked,_ as packRGBA,O as packedToHex,R as playSamples,W as rmsGetDecibels,$ as sampleToSeconds,E as str2hex,L as struct,k as sumBlocks,D as sumTracks,z as unpackRGBA};
