function S(e){switch(e){case"u8":case"i8":case"bool":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function A(e,t,n,o){let r=t.buffer,i=t.byteOffset+n;switch(e){case"u8":return new Uint8Array(r,i,o);case"i8":return new Int8Array(r,i,o);case"bool":return new Uint8Array(r,i,o);case"u16":return new Uint16Array(r,i,o);case"i16":return new Int16Array(r,i,o);case"u32":return new Uint32Array(r,i,o);case"i32":return new Int32Array(r,i,o);case"f32":return new Float32Array(r,i,o);case"f64":return new Float64Array(r,i,o);case"u64":return new BigUint64Array(r,i,o);case"i64":return new BigInt64Array(r,i,o)}}function x(e,t){if(typeof e=="bigint")return e;if(!Number.isSafeInteger(e))throw new Error("Number cannot safely fit in 64 bits");if(t){if(e<-9223372036854776e3||e>9223372036854776e3)throw new Error("Number out of i64 range")}else if(e<0||e>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(e)}function L(e){let t=0,n={},o=[];for(let[i,c]of Object.entries(e)){let p,a=1,y=c.match(/^([a-z0-9]+)\[(\d+)\]$/i);y?(p=y[1],a=parseInt(y[2],10)):p=c;let d=S(p)*a;S(p)===8&&(t=t+7&-8),n[i]={type:c,offset:t,size:d,arrayLength:a>1?a:void 0},o.push(i),t+=d}let r={_size:t,_fields:n,fieldOrder:o,Make(i,c,p){let a=p??i.malloc(r._size),y=a.ptr,d=!1,h=new Proxy({ptr:y,region:a,_type:r,get destroyed(){return d},read(l){if(d)throw new Error("Accessing destroyed struct");let s=n[l];if(!s)throw new Error("Invalid field "+l);let u=s.arrayLength?s.type.replace(/\[\d+\]$/,""):s.type;if(s.arrayLength)return A(u,a,s.offset,s.arrayLength);let f=A(u,a,s.offset,1);return u==="bool"?!!(Number(f[0])^0):f[0]},write(l,s){if(d)throw new Error("Writing to destroyed struct");let u=n[l];if(!u)throw new Error("Invalid field "+l);let f=u.arrayLength?u.type.replace(/\[\d+\]$/,""):u.type;if(u.arrayLength){let m=Array.isArray(s)?s:Array.from(s);if(m.length!==u.arrayLength)throw new Error(`Field ${l} expects array of length ${u.arrayLength}`);for(let b=0;b<u.arrayLength;b++){let g=A(f,a,u.offset+b*S(f),1);f==="bool"?g[0]=m[b]?1:0:f==="u64"?g[0]=x(m[b],!1):f==="i64"?g[0]=x(m[b],!0):g[0]=m[b]}}else{let m=A(f,a,u.offset,1);f==="bool"?m[0]=s?1:0:f==="u64"?m[0]=x(s,!1):f==="i64"?m[0]=x(s,!0):m[0]=s}},destroy(){if(d)throw new Error("Struct already destroyed");i.free(a),d=!0}},{get(l,s){return s in l?l[s]:l.read(s.toString())},set(l,s,u){return s in l||l.write(s.toString(),u),!0}});if(c)for(let[l,s]of Object.entries(c))h.write(l,s);return h}};return r}var w=class{arrayBuffer;view;allocTable;constructor(t){this.arrayBuffer=new ArrayBuffer(t),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(t){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,i)=>r-i);if(n.length===0){this.allocTable[0]=t;let r=this.view.subarray(0,t);return r.ptr=0,r}if(n[0]>=t){this.allocTable[0]=t;let r=this.view.subarray(0,t);return r.ptr=0,r}for(let r=0;r<n.length;r++){let i=n[r],c=this.allocTable[i],p=r+1<n.length?n[r+1]:this.view.length,a=c;if(p-a>=t){this.allocTable[a]=a+t;let h=this.view.subarray(a,a+t);return h.ptr=a,h}}throw new Error("Out of memory")}free(t){if(!this.allocTable[t.ptr])throw new Error("double free");delete this.allocTable[t.ptr]}new(t,n){let o=this.malloc(t._size);return o.fill(0),t.Make(this,n,o)}};var F=class{wantsMic;pluginName;type;freq;amp;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.freq=430,this.amp=.25}process128(t,n){let r=2*Math.PI*this.freq/44100;for(let i=0;i<t.length;i++){let c=(n+i)*r;t[i]=Math.sin(c)*this.amp}}};var U=`
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
`;function I(){let e=new Blob([U],{type:"application/javascript"});return URL.createObjectURL(e)}function M(e){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*e)}function E(e){return new Float32Array(e)}var B=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(t=4,n){this.queueLength=t,this.audioCtx=n||new AudioContext({sampleRate:44100});let o=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(o)}async init(){let t=I();await this.audioCtx.audioWorklet.addModule(t),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let o=n.data.blockIndex%this.queueLength;this.onRequest(o)}}}setSAB(t){this.sampleBuffer=new Float32Array(t),this.node?.port.postMessage({type:"waveBuffer",buffer:t})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(t){this.node?.port.postMessage({type:"scrub",sampleIndex:t}),this.sampleCounter[0]=t}connect(t){t?this.node?.connect(t):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};function C(e){return[...new TextEncoder().encode(e)].map(t=>t.toString(16).padStart(2,"0")).join("")}function P(e){let t=e.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(t.map(n=>parseInt(n,16))))}function R(e,t=44100){let n=new(window.AudioContext||window.webkitAudioContext),o=n.createBuffer(1,e.length,t);o.copyToChannel(e,0,0);let r=n.createBufferSource();r.buffer=o,r.connect(n.destination),r.start()}function q(e){e=e.replace(/^#/,"");let t=parseInt(e.slice(0,2),16),n=parseInt(e.slice(2,4),16),o=parseInt(e.slice(4,6),16);return(e.length===8?parseInt(e.slice(6,8),16):255)<<24|o<<16|n<<8|t}function O(e){let t=(e&255).toString(16).padStart(2,"0"),n=(e>>>8&255).toString(16).padStart(2,"0"),o=(e>>>16&255).toString(16).padStart(2,"0"),r=(e>>>24&255).toString(16).padStart(2,"0");return`#${t}${n}${o}${r}`}function _(e,t,n,o=255){return(o&255)<<24|(n&255)<<16|(t&255)<<8|e&255}function z(e){return[e&255,e>>>8&255,e>>>16&255,e>>>24&255]}var T={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function k(e,t,n){if(!(n in T))throw new Error(`Invalid block size: ${n}`);let o=T[n];if(o.length!==n)throw new Error("Buffer length mismatch");o.fill(0);for(let r of e)for(let i=0;i<n;i++){let c=t+i;c<r.length&&(o[i]+=r[c])}for(let r=0;r<n;r++){let i=o[r];o[r]=i>1?1:i<-1?-1:i}return o}function N(e,t){if(e.length===0)return new Float32Array(0);let n=Math.max(...e.map(i=>i.length)),o=Math.ceil(n/t),r=new Float32Array(n);for(let i=0;i<o;i++){let c=i*t,p=k(e,c,t);for(let a=0;a<p.length&&c+a<n;a++)r[c+a]=p[a]}return r}function v(e,t){for(let n=0;n<e.length;n++)e[n]*=t,e[n]=Math.max(-1,Math.min(1,e[n]))}function D(e,t){let n=Math.pow(10,t/20);v(e,n)}function W(e){let t=0;for(let r=0;r<e.length;r++)t+=e[r]*e[r];let n=Math.sqrt(t/e.length);return 20*Math.log10(Math.max(n,1e-12))}function $(e,t){return e/t}var ae={Sine:F},se={UseList_Heap:w};export{se as Allocators,ae as ExamplePlugins,B as WorkletHelper,M as createSampleSAB,E as createSampleView,I as createWorkletBlob,v as gainClamped,D as gainDecibels,P as hex2str,q as hexToPacked,_ as packRGBA,O as packedToHex,R as playSamples,W as rmsGetDecibels,$ as sampleToSeconds,C as str2hex,L as struct,k as sumBlocks,N as sumTracks,z as unpackRGBA};
