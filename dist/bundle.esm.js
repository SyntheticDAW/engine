function B(t){switch(t){case"u8":case"i8":case"bool":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function w(t,e,n,i){let r=e.buffer,a=e.byteOffset+n;switch(t){case"u8":return new Uint8Array(r,a,i);case"i8":return new Int8Array(r,a,i);case"bool":return new Uint8Array(r,a,i);case"u16":return new Uint16Array(r,a,i);case"i16":return new Int16Array(r,a,i);case"u32":return new Uint32Array(r,a,i);case"i32":return new Int32Array(r,a,i);case"f32":return new Float32Array(r,a,i);case"f64":return new Float64Array(r,a,i);case"u64":return new BigUint64Array(r,a,i);case"i64":return new BigInt64Array(r,a,i)}}function x(t,e){if(typeof t=="bigint")return t;if(!Number.isSafeInteger(t))throw new Error("Number cannot safely fit in 64 bits");if(e){if(t<-9223372036854776e3||t>9223372036854776e3)throw new Error("Number out of i64 range")}else if(t<0||t>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(t)}function E(t){let e=0,n={},i=[];for(let[a,u]of Object.entries(t)){let p,o=1,d=u.match(/^([a-z0-9]+)\[(\d+)\]$/i);d?(p=d[1],o=parseInt(d[2],10)):p=u;let h=B(p)*o;B(p)===8&&(e=e+7&-8),n[a]={type:u,offset:e,size:h,arrayLength:o>1?o:void 0},i.push(a),e+=h}let r={_size:e,_fields:n,fieldOrder:i,Make(a,u,p){let o=p??a.malloc(r._size),d=o.ptr,h=!1,y=new Proxy({ptr:d,region:o,_type:r,get destroyed(){return h},read(c){if(h)throw new Error("Accessing destroyed struct");let s=n[c];if(!s)throw new Error("Invalid field "+c);let l=s.arrayLength?s.type.replace(/\[\d+\]$/,""):s.type;if(s.arrayLength)return w(l,o,s.offset,s.arrayLength);let f=w(l,o,s.offset,1);return l==="bool"?!!(Number(f[0])^0):f[0]},write(c,s){if(h)throw new Error("Writing to destroyed struct");let l=n[c];if(!l)throw new Error("Invalid field "+c);let f=l.arrayLength?l.type.replace(/\[\d+\]$/,""):l.type;if(l.arrayLength){let m=Array.isArray(s)?s:Array.from(s);if(m.length!==l.arrayLength)throw new Error(`Field ${c} expects array of length ${l.arrayLength}`);for(let b=0;b<l.arrayLength;b++){let A=w(f,o,l.offset+b*B(f),1);f==="bool"?A[0]=m[b]?1:0:f==="u64"?A[0]=x(m[b],!1):f==="i64"?A[0]=x(m[b],!0):A[0]=m[b]}}else{let m=w(f,o,l.offset,1);f==="bool"?m[0]=s?1:0:f==="u64"?m[0]=x(s,!1):f==="i64"?m[0]=x(s,!0):m[0]=s}},destroy(){if(h)throw new Error("Struct already destroyed");a.free(o),h=!0}},{get(c,s){return s in c?c[s]:c.read(s.toString())},set(c,s,l){return s in c||c.write(s.toString(),l),!0}});if(u)for(let[c,s]of Object.entries(u))y.write(c,s);return y}};return r}var C=-1,k=class{id;plugin;active;buffer;constructor(e){this.id=++C,this.plugin=e,this.buffer=new Float32Array(128),this.active=!0}process128(e){return this.plugin.process128(this.buffer,e)}};function _(t,e,n,i){if(i.length<n)throw new Error("Output buffer too small");for(let r=0;r<n;r++)i[r]=0;for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(i[a]+=r[u])}for(let r=0;r<n;r++){let a=i[r];i[r]=a>1?1:a<-1?-1:a}}var q=`
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
`;function L(){let t=new Blob([q],{type:"application/javascript"});return URL.createObjectURL(t)}function I(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function T(t){return new Float32Array(t)}var g=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,n){this.queueLength=e,this.audioCtx=n||new AudioContext({sampleRate:44100});let i=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(i)}async init(){let e=L();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let i=n.data.blockIndex%this.queueLength;this.onRequest(i)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node?.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};var v=class{mainWorklet;queue_length;sample_sab;counter_sab;sample_view;current_sample;tracks;constructor(e){this.queue_length=e+1,this.mainWorklet=new g(this.queue_length),this.sample_sab=I(this.queue_length),this.sample_view=T(this.sample_sab),this.counter_sab=new SharedArrayBuffer(4),this.mainWorklet.setSAB(this.sample_sab),this.current_sample=0,this.tracks=[]}async init(){await this.mainWorklet.init(),this.mainWorklet.onRequest=e=>{let n=e%this.queue_length,i=[];for(let a=0;a<this.tracks.length;a++)this.tracks[a].active&&i.push(this.tracks[a].buffer);let r=e*128;_(i,r,128,this.sample_view.subarray(r,r+128))}}setLatency(e){this.queue_length=e+1}scrub(e){this.current_sample=e,this.mainWorklet.scrub(this.current_sample)}};var F=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,a)=>r-a);if(n.length===0){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}if(n[0]>=e){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}for(let r=0;r<n.length;r++){let a=n[r],u=this.allocTable[a],p=r+1<n.length?n[r+1]:this.view.length,o=u;if(p-o>=e){this.allocTable[o]=o+e;let y=this.view.subarray(o,o+e);return y.ptr=o,y}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,n){let i=this.malloc(e._size);return i.fill(0),e.Make(this,n,i)}};var S=class{wantsMic;pluginName;type;freq;amp;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.freq=430,this.amp=.25}process128(e,n){let r=2*Math.PI*this.freq/44100;for(let a=0;a<e.length;a++){let u=(n+a)*r;e[a]=Math.sin(u)*this.amp}}};function R(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function W(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(n=>parseInt(n,16))))}function O(t,e=44100){let n=new(window.AudioContext||window.webkitAudioContext),i=n.createBuffer(1,t.length,e);i.copyToChannel(t,0,0);let r=n.createBufferSource();r.buffer=i,r.connect(n.destination),r.start()}function D(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),i=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|i<<16|n<<8|e}function N(t){let e=(t&255).toString(16).padStart(2,"0"),n=(t>>>8&255).toString(16).padStart(2,"0"),i=(t>>>16&255).toString(16).padStart(2,"0"),r=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${n}${i}${r}`}function $(t,e,n,i=255){return(i&255)<<24|(n&255)<<16|(e&255)<<8|t&255}function z(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var M={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function P(t,e,n){if(!(n in M))throw new Error(`Invalid block size: ${n}`);let i=M[n];if(i.length!==n)throw new Error("Buffer length mismatch");i.fill(0);for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(i[a]+=r[u])}for(let r=0;r<n;r++){let a=i[r];i[r]=a>1?1:a<-1?-1:a}return i}function H(t,e){if(t.length===0)return new Float32Array(0);let n=Math.max(...t.map(a=>a.length)),i=Math.ceil(n/e),r=new Float32Array(n);for(let a=0;a<i;a++){let u=a*e,p=P(t,u,e);for(let o=0;o<p.length&&u+o<n;o++)r[u+o]=p[o]}return r}function U(t,e){for(let n=0;n<t.length;n++)t[n]*=e,t[n]=Math.max(-1,Math.min(1,t[n]))}function V(t,e){let n=Math.pow(10,e/20);U(t,n)}function G(t){let e=0;for(let r=0;r<t.length;r++)e+=t[r]*t[r];let n=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(n,1e-12))}function j(t,e){return t/e}var be={Sine:S},de={UseList_Heap:F};export{de as Allocators,be as ExamplePlugins,k as Track,g as WorkletHelper,v as Workspace,I as createSampleSAB,T as createSampleView,L as createWorkletBlob,U as gainClamped,V as gainDecibels,W as hex2str,D as hexToPacked,$ as packRGBA,N as packedToHex,O as playSamples,G as rmsGetDecibels,j as sampleToSeconds,R as str2hex,E as struct,P as sumBlocks,H as sumTracks,z as unpackRGBA};
