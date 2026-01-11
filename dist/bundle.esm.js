function B(t){switch(t){case"u8":case"i8":case"bool":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function w(t,e,n,o){let r=e.buffer,a=e.byteOffset+n;switch(t){case"u8":return new Uint8Array(r,a,o);case"i8":return new Int8Array(r,a,o);case"bool":return new Uint8Array(r,a,o);case"u16":return new Uint16Array(r,a,o);case"i16":return new Int16Array(r,a,o);case"u32":return new Uint32Array(r,a,o);case"i32":return new Int32Array(r,a,o);case"f32":return new Float32Array(r,a,o);case"f64":return new Float64Array(r,a,o);case"u64":return new BigUint64Array(r,a,o);case"i64":return new BigInt64Array(r,a,o)}}function x(t,e){if(typeof t=="bigint")return t;if(!Number.isSafeInteger(t))throw new Error("Number cannot safely fit in 64 bits");if(e){if(t<-9223372036854776e3||t>9223372036854776e3)throw new Error("Number out of i64 range")}else if(t<0||t>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(t)}function U(t){let e=0,n={},o=[];for(let[a,u]of Object.entries(t)){let p,i=1,d=u.match(/^([a-z0-9]+)\[(\d+)\]$/i);d?(p=d[1],i=parseInt(d[2],10)):p=u;let h=B(p)*i;B(p)===8&&(e=e+7&-8),n[a]={type:u,offset:e,size:h,arrayLength:i>1?i:void 0},o.push(a),e+=h}let r={_size:e,_fields:n,fieldOrder:o,Make(a,u,p){let i=p??a.malloc(r._size),d=i.ptr,h=!1,y=new Proxy({ptr:d,region:i,_type:r,get destroyed(){return h},read(c){if(h)throw new Error("Accessing destroyed struct");let s=n[c];if(!s)throw new Error("Invalid field "+c);let l=s.arrayLength?s.type.replace(/\[\d+\]$/,""):s.type;if(s.arrayLength)return w(l,i,s.offset,s.arrayLength);let f=w(l,i,s.offset,1);return l==="bool"?!!(Number(f[0])^0):f[0]},write(c,s){if(h)throw new Error("Writing to destroyed struct");let l=n[c];if(!l)throw new Error("Invalid field "+c);let f=l.arrayLength?l.type.replace(/\[\d+\]$/,""):l.type;if(l.arrayLength){let m=Array.isArray(s)?s:Array.from(s);if(m.length!==l.arrayLength)throw new Error(`Field ${c} expects array of length ${l.arrayLength}`);for(let b=0;b<l.arrayLength;b++){let A=w(f,i,l.offset+b*B(f),1);f==="bool"?A[0]=m[b]?1:0:f==="u64"?A[0]=x(m[b],!1):f==="i64"?A[0]=x(m[b],!0):A[0]=m[b]}}else{let m=w(f,i,l.offset,1);f==="bool"?m[0]=s?1:0:f==="u64"?m[0]=x(s,!1):f==="i64"?m[0]=x(s,!0):m[0]=s}},destroy(){if(h)throw new Error("Struct already destroyed");a.free(i),h=!0}},{get(c,s){return s in c?c[s]:c.read(s.toString())},set(c,s,l){return s in c||c.write(s.toString(),l),!0}});if(u)for(let[c,s]of Object.entries(u))y.write(c,s);return y}};return r}var q=-1,k=class{id;plugin;active;buffer;constructor(e){this.id=++q,this.plugin=e,this.buffer=new Float32Array(128),this.active=!0}process128(e){return this.plugin.process128(this.buffer,e)}};function I(t,e,n,o){if(o.length<n)throw new Error("Output buffer too small");for(let r=0;r<n;r++)o[r]=0;for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(o[a]+=r[u])}for(let r=0;r<n;r++){let a=o[r];o[r]=a>1?1:a<-1?-1:a}}var C=`
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
`;function M(){let t=new Blob([C],{type:"application/javascript"});return URL.createObjectURL(t)}function T(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function v(t){return new Float32Array(t)}var g=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,n){this.queueLength=e,this.audioCtx=n||new AudioContext({sampleRate:44100});let o=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(o)}async init(){let e=M();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.onprocessorerror=n=>{console.error("Error in worklet processor:",n)},this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let o=n.data.blockIndex;this.onRequest(o)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};var _=class{mainWorklet;queue_length;sample_sab;counter_sab;sample_view;current_sample;tracks;constructor(e){this.queue_length=e+1,this.mainWorklet=new g(this.queue_length),this.sample_sab=T(this.queue_length),this.sample_view=v(this.sample_sab),this.counter_sab=new SharedArrayBuffer(4),this.current_sample=0,this.tracks=[]}async init(){await this.mainWorklet.init(),this.mainWorklet.onRequest=e=>{console.log("blockIndex",e);let n=e%this.queue_length,o=[];for(let a=0;a<this.tracks.length;a++)this.tracks[a].plugin.process128(this.tracks[a].buffer,this.current_sample),this.tracks[a].active&&o.push(this.tracks[a].buffer);let r=n*128;I(o,r,128,this.sample_view.subarray(r,r+128)),this.current_sample+=128},this.mainWorklet.setSAB(this.sample_sab)}async start(){await this.mainWorklet.connect(),await this.mainWorklet.start(),await this.mainWorklet.unpause()}pause(){this.mainWorklet.pause()}unpause(){this.mainWorklet.unpause()}setLatency(e){this.queue_length=e+1}addTrack(e){this.tracks.push(e)}scrub(e){this.current_sample=e,this.mainWorklet.scrub(this.current_sample)}};var F=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,a)=>r-a);if(n.length===0){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}if(n[0]>=e){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}for(let r=0;r<n.length;r++){let a=n[r],u=this.allocTable[a],p=r+1<n.length?n[r+1]:this.view.length,i=u;if(p-i>=e){this.allocTable[i]=i+e;let y=this.view.subarray(i,i+e);return y.ptr=i,y}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,n){let o=this.malloc(e._size);return o.fill(0),e.Make(this,n,o)}};var S=class{wantsMic;pluginName;type;freq;amp;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.freq=440,this.amp=.25}process128(e,n){console.log("startSample",n);let r=2*Math.PI*this.freq/44100;for(let a=0;a<e.length;a++){let u=(n+a)*r;e[a]=Math.sin(u)*this.amp}}};function R(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function W(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(n=>parseInt(n,16))))}function O(t,e=44100){let n=new(window.AudioContext||window.webkitAudioContext),o=n.createBuffer(1,t.length,e);o.copyToChannel(t,0,0);let r=n.createBufferSource();r.buffer=o,r.connect(n.destination),r.start()}function D(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),o=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|o<<16|n<<8|e}function N(t){let e=(t&255).toString(16).padStart(2,"0"),n=(t>>>8&255).toString(16).padStart(2,"0"),o=(t>>>16&255).toString(16).padStart(2,"0"),r=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${n}${o}${r}`}function $(t,e,n,o=255){return(o&255)<<24|(n&255)<<16|(e&255)<<8|t&255}function z(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var L={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function E(t,e,n){if(!(n in L))throw new Error(`Invalid block size: ${n}`);let o=L[n];if(o.length!==n)throw new Error("Buffer length mismatch");o.fill(0);for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(o[a]+=r[u])}for(let r=0;r<n;r++){let a=o[r];o[r]=a>1?1:a<-1?-1:a}return o}function H(t,e){if(t.length===0)return new Float32Array(0);let n=Math.max(...t.map(a=>a.length)),o=Math.ceil(n/e),r=new Float32Array(n);for(let a=0;a<o;a++){let u=a*e,p=E(t,u,e);for(let i=0;i<p.length&&u+i<n;i++)r[u+i]=p[i]}return r}function P(t,e){for(let n=0;n<t.length;n++)t[n]*=e,t[n]=Math.max(-1,Math.min(1,t[n]))}function V(t,e){let n=Math.pow(10,e/20);P(t,n)}function G(t){let e=0;for(let r=0;r<t.length;r++)e+=t[r]*t[r];let n=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(n,1e-12))}function j(t,e){return t/e}var be={Sine:S},de={UseList_Heap:F};export{de as Allocators,be as ExamplePlugins,k as Track,g as WorkletHelper,_ as Workspace,T as createSampleSAB,v as createSampleView,M as createWorkletBlob,P as gainClamped,V as gainDecibels,W as hex2str,D as hexToPacked,$ as packRGBA,N as packedToHex,O as playSamples,G as rmsGetDecibels,j as sampleToSeconds,R as str2hex,U as struct,E as sumBlocks,I as sumBlocksMutate,H as sumTracks,z as unpackRGBA};
