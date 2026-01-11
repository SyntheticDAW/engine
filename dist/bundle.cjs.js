var synth=(()=>{var B=Object.defineProperty;var V=Object.getOwnPropertyDescriptor;var G=Object.getOwnPropertyNames;var H=Object.prototype.hasOwnProperty;var j=(t,e)=>{for(var n in e)B(t,n,{get:e[n],enumerable:!0})},J=(t,e,n,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of G(e))!H.call(t,r)&&r!==n&&B(t,r,{get:()=>e[r],enumerable:!(o=V(e,r))||o.enumerable});return t};var Y=t=>J(B({},"__esModule",{value:!0}),t);var Z={};j(Z,{Allocators:()=>X,ExamplePlugins:()=>Q,WorkletHelper:()=>S,createSampleSAB:()=>U,createSampleView:()=>M,createWorkletBlob:()=>T,gainClamped:()=>v,gainDecibels:()=>D,hex2str:()=>C,hexToPacked:()=>R,packRGBA:()=>O,packedToHex:()=>q,playSamples:()=>P,rmsGetDecibels:()=>W,sampleToSeconds:()=>$,str2hex:()=>E,struct:()=>L,sumBlocks:()=>k,sumTracks:()=>N,unpackRGBA:()=>_});function I(t){switch(t){case"u8":case"i8":case"bool":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function A(t,e,n,o){let r=e.buffer,i=e.byteOffset+n;switch(t){case"u8":return new Uint8Array(r,i,o);case"i8":return new Int8Array(r,i,o);case"bool":return new Uint8Array(r,i,o);case"u16":return new Uint16Array(r,i,o);case"i16":return new Int16Array(r,i,o);case"u32":return new Uint32Array(r,i,o);case"i32":return new Int32Array(r,i,o);case"f32":return new Float32Array(r,i,o);case"f64":return new Float64Array(r,i,o);case"u64":return new BigUint64Array(r,i,o);case"i64":return new BigInt64Array(r,i,o)}}function x(t,e){if(typeof t=="bigint")return t;if(!Number.isSafeInteger(t))throw new Error("Number cannot safely fit in 64 bits");if(e){if(t<-9223372036854776e3||t>9223372036854776e3)throw new Error("Number out of i64 range")}else if(t<0||t>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(t)}function L(t){let e=0,n={},o=[];for(let[i,c]of Object.entries(t)){let p,a=1,y=c.match(/^([a-z0-9]+)\[(\d+)\]$/i);y?(p=y[1],a=parseInt(y[2],10)):p=c;let d=I(p)*a;I(p)===8&&(e=e+7&-8),n[i]={type:c,offset:e,size:d,arrayLength:a>1?a:void 0},o.push(i),e+=d}let r={_size:e,_fields:n,fieldOrder:o,Make(i,c,p){let a=p??i.malloc(r._size),y=a.ptr,d=!1,h=new Proxy({ptr:y,region:a,_type:r,get destroyed(){return d},read(l){if(d)throw new Error("Accessing destroyed struct");let s=n[l];if(!s)throw new Error("Invalid field "+l);let u=s.arrayLength?s.type.replace(/\[\d+\]$/,""):s.type;if(s.arrayLength)return A(u,a,s.offset,s.arrayLength);let f=A(u,a,s.offset,1);return u==="bool"?!!(Number(f[0])^0):f[0]},write(l,s){if(d)throw new Error("Writing to destroyed struct");let u=n[l];if(!u)throw new Error("Invalid field "+l);let f=u.arrayLength?u.type.replace(/\[\d+\]$/,""):u.type;if(u.arrayLength){let m=Array.isArray(s)?s:Array.from(s);if(m.length!==u.arrayLength)throw new Error(`Field ${l} expects array of length ${u.arrayLength}`);for(let b=0;b<u.arrayLength;b++){let g=A(f,a,u.offset+b*I(f),1);f==="bool"?g[0]=m[b]?1:0:f==="u64"?g[0]=x(m[b],!1):f==="i64"?g[0]=x(m[b],!0):g[0]=m[b]}}else{let m=A(f,a,u.offset,1);f==="bool"?m[0]=s?1:0:f==="u64"?m[0]=x(s,!1):f==="i64"?m[0]=x(s,!0):m[0]=s}},destroy(){if(d)throw new Error("Struct already destroyed");i.free(a),d=!0}},{get(l,s){return s in l?l[s]:l.read(s.toString())},set(l,s,u){return s in l||l.write(s.toString(),u),!0}});if(c)for(let[l,s]of Object.entries(c))h.write(l,s);return h}};return r}var w=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,i)=>r-i);if(n.length===0){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}if(n[0]>=e){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}for(let r=0;r<n.length;r++){let i=n[r],c=this.allocTable[i],p=r+1<n.length?n[r+1]:this.view.length,a=c;if(p-a>=e){this.allocTable[a]=a+e;let h=this.view.subarray(a,a+e);return h.ptr=a,h}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,n){let o=this.malloc(e._size);return o.fill(0),e.Make(this,n,o)}};var F=class{wantsMic;pluginName;type;freq;amp;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.freq=430,this.amp=.25}process128(e,n){let r=2*Math.PI*this.freq/44100;for(let i=0;i<e.length;i++){let c=(n+i)*r;e[i]=Math.sin(c)*this.amp}}};var K=`
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
`;function T(){let t=new Blob([K],{type:"application/javascript"});return URL.createObjectURL(t)}function U(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function M(t){return new Float32Array(t)}var S=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,n){this.queueLength=e,this.audioCtx=n||new AudioContext({sampleRate:44100});let o=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(o)}async init(){let e=T();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let o=n.data.blockIndex%this.queueLength;this.onRequest(o)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node?.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};function E(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function C(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(n=>parseInt(n,16))))}function P(t,e=44100){let n=new(window.AudioContext||window.webkitAudioContext),o=n.createBuffer(1,t.length,e);o.copyToChannel(t,0,0);let r=n.createBufferSource();r.buffer=o,r.connect(n.destination),r.start()}function R(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),o=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|o<<16|n<<8|e}function q(t){let e=(t&255).toString(16).padStart(2,"0"),n=(t>>>8&255).toString(16).padStart(2,"0"),o=(t>>>16&255).toString(16).padStart(2,"0"),r=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${n}${o}${r}`}function O(t,e,n,o=255){return(o&255)<<24|(n&255)<<16|(e&255)<<8|t&255}function _(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var z={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function k(t,e,n){if(!(n in z))throw new Error(`Invalid block size: ${n}`);let o=z[n];if(o.length!==n)throw new Error("Buffer length mismatch");o.fill(0);for(let r of t)for(let i=0;i<n;i++){let c=e+i;c<r.length&&(o[i]+=r[c])}for(let r=0;r<n;r++){let i=o[r];o[r]=i>1?1:i<-1?-1:i}return o}function N(t,e){if(t.length===0)return new Float32Array(0);let n=Math.max(...t.map(i=>i.length)),o=Math.ceil(n/e),r=new Float32Array(n);for(let i=0;i<o;i++){let c=i*e,p=k(t,c,e);for(let a=0;a<p.length&&c+a<n;a++)r[c+a]=p[a]}return r}function v(t,e){for(let n=0;n<t.length;n++)t[n]*=e,t[n]=Math.max(-1,Math.min(1,t[n]))}function D(t,e){let n=Math.pow(10,e/20);v(t,n)}function W(t){let e=0;for(let r=0;r<t.length;r++)e+=t[r]*t[r];let n=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(n,1e-12))}function $(t,e){return t/e}var Q={Sine:F},X={UseList_Heap:w};return Y(Z);})();
