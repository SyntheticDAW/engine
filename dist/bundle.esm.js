function B(t){switch(t){case"u8":case"i8":case"bool":return 1;case"u16":case"i16":return 2;case"u32":case"i32":case"f32":return 4;case"u64":case"i64":case"f64":return 8}}function w(t,e,n,s){let r=e.buffer,a=e.byteOffset+n;switch(t){case"u8":return new Uint8Array(r,a,s);case"i8":return new Int8Array(r,a,s);case"bool":return new Uint8Array(r,a,s);case"u16":return new Uint16Array(r,a,s);case"i16":return new Int16Array(r,a,s);case"u32":return new Uint32Array(r,a,s);case"i32":return new Int32Array(r,a,s);case"f32":return new Float32Array(r,a,s);case"f64":return new Float64Array(r,a,s);case"u64":return new BigUint64Array(r,a,s);case"i64":return new BigInt64Array(r,a,s)}}function x(t,e){if(typeof t=="bigint")return t;if(!Number.isSafeInteger(t))throw new Error("Number cannot safely fit in 64 bits");if(e){if(t<-9223372036854776e3||t>9223372036854776e3)throw new Error("Number out of i64 range")}else if(t<0||t>18446744073709552e3)throw new Error("Number out of u64 range");return BigInt(t)}function U(t){let e=0,n={},s=[];for(let[a,u]of Object.entries(t)){let p,o=1,d=u.match(/^([a-z0-9]+)\[(\d+)\]$/i);d?(p=d[1],o=parseInt(d[2],10)):p=u;let h=B(p)*o;B(p)===8&&(e=e+7&-8),n[a]={type:u,offset:e,size:h,arrayLength:o>1?o:void 0},s.push(a),e+=h}let r={_size:e,_fields:n,fieldOrder:s,Make(a,u,p){let o=p??a.malloc(r._size),d=o.ptr,h=!1,y=new Proxy({ptr:d,region:o,_type:r,get destroyed(){return h},read(c){if(h)throw new Error("Accessing destroyed struct");let i=n[c];if(!i)throw new Error("Invalid field "+c);let l=i.arrayLength?i.type.replace(/\[\d+\]$/,""):i.type;if(i.arrayLength)return w(l,o,i.offset,i.arrayLength);let f=w(l,o,i.offset,1);return l==="bool"?!!(Number(f[0])^0):f[0]},write(c,i){if(h)throw new Error("Writing to destroyed struct");let l=n[c];if(!l)throw new Error("Invalid field "+c);let f=l.arrayLength?l.type.replace(/\[\d+\]$/,""):l.type;if(l.arrayLength){let m=Array.isArray(i)?i:Array.from(i);if(m.length!==l.arrayLength)throw new Error(`Field ${c} expects array of length ${l.arrayLength}`);for(let b=0;b<l.arrayLength;b++){let A=w(f,o,l.offset+b*B(f),1);f==="bool"?A[0]=m[b]?1:0:f==="u64"?A[0]=x(m[b],!1):f==="i64"?A[0]=x(m[b],!0):A[0]=m[b]}}else{let m=w(f,o,l.offset,1);f==="bool"?m[0]=i?1:0:f==="u64"?m[0]=x(i,!1):f==="i64"?m[0]=x(i,!0):m[0]=i}},destroy(){if(h)throw new Error("Struct already destroyed");a.free(o),h=!0}},{get(c,i){return i in c?c[i]:c.read(i.toString())},set(c,i,l){return i in c||c.write(i.toString(),l),!0}});if(u)for(let[c,i]of Object.entries(u))y.write(c,i);return y}};return r}var q=-1,k=class{id;plugin;active;buffer;constructor(e){this.id=++q,this.plugin=e,this.buffer=new Float32Array(128),this.active=!0}process128(e){return this.plugin.process128(this.buffer,e)}};function I(t,e,n,s){if(s.length<n)throw new Error("Output buffer too small");for(let r=0;r<n;r++)s[r]=0;for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(s[a]+=r[u])}for(let r=0;r<n;r++){let a=s[r];s[r]=a>1?1:a<-1?-1:a}}var C=`
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
    console.log('processing')
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const channel = output[0];

    if (this.paused || !this.sampleBuffer) {
      channel.fill(0);
      return true;
    }
    console.log('made it past this.paused || !this.sampleBuffer')

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
`;function L(){let t=new Blob([C],{type:"application/javascript"});return URL.createObjectURL(t)}function T(t){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*t)}function v(t){return new Float32Array(t)}var g=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(e=4,n){this.queueLength=e,this.audioCtx=n||new AudioContext({sampleRate:44100});let s=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(s)}async init(){let e=L();await this.audioCtx.audioWorklet.addModule(e),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.onprocessorerror=n=>{console.error("Error in worklet processor:",n)},this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=n=>{if(n.data.type==="requestBuffer"){let s=n.data.blockIndex%this.queueLength;this.onRequest(s)}}}setSAB(e){this.sampleBuffer=new Float32Array(e),this.node?.port.postMessage({type:"waveBuffer",buffer:e})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(e){this.node?.port.postMessage({type:"scrub",sampleIndex:e}),this.sampleCounter[0]=e}connect(e){e?this.node?.connect(e):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};var M=class{mainWorklet;queue_length;sample_sab;counter_sab;sample_view;current_sample;tracks;constructor(e){this.queue_length=e+1,this.mainWorklet=new g(this.queue_length),this.sample_sab=T(this.queue_length),this.sample_view=v(this.sample_sab),this.counter_sab=new SharedArrayBuffer(4),this.mainWorklet.setSAB(this.sample_sab),this.current_sample=0,this.tracks=[]}async init(){await this.mainWorklet.init(),this.mainWorklet.onRequest=e=>{let n=e*128,s=[];for(let a=0;a<this.tracks.length;a++)this.tracks[a].plugin.process128(this.tracks[a].buffer,n),this.tracks[a].active&&s.push(this.tracks[a].buffer);let r=e*128;I(s,n,128,this.sample_view.subarray(r,r+128))}}async start(){await this.mainWorklet.connect(),await this.mainWorklet.start(),await this.mainWorklet.unpause()}pause(){this.mainWorklet.pause()}unpause(){this.mainWorklet.unpause()}setLatency(e){this.queue_length=e+1}addTrack(e){this.tracks.push(e)}scrub(e){this.current_sample=e,this.mainWorklet.scrub(this.current_sample)}};var F=class{arrayBuffer;view;allocTable;constructor(e){this.arrayBuffer=new ArrayBuffer(e),this.view=new Uint8Array(this.arrayBuffer),this.allocTable={}}malloc(e){let n=Object.keys(this.allocTable).map(r=>+r).sort((r,a)=>r-a);if(n.length===0){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}if(n[0]>=e){this.allocTable[0]=e;let r=this.view.subarray(0,e);return r.ptr=0,r}for(let r=0;r<n.length;r++){let a=n[r],u=this.allocTable[a],p=r+1<n.length?n[r+1]:this.view.length,o=u;if(p-o>=e){this.allocTable[o]=o+e;let y=this.view.subarray(o,o+e);return y.ptr=o,y}}throw new Error("Out of memory")}free(e){if(!this.allocTable[e.ptr])throw new Error("double free");delete this.allocTable[e.ptr]}new(e,n){let s=this.malloc(e._size);return s.fill(0),e.Make(this,n,s)}};var S=class{wantsMic;pluginName;type;freq;amp;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.freq=430,this.amp=.25}process128(e,n){console.log("is processing 128");let r=2*Math.PI*this.freq/44100;for(let a=0;a<e.length;a++){let u=(n+a)*r;e[a]=Math.sin(u)*this.amp}}};function R(t){return[...new TextEncoder().encode(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function W(t){let e=t.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(e.map(n=>parseInt(n,16))))}function O(t,e=44100){let n=new(window.AudioContext||window.webkitAudioContext),s=n.createBuffer(1,t.length,e);s.copyToChannel(t,0,0);let r=n.createBufferSource();r.buffer=s,r.connect(n.destination),r.start()}function D(t){t=t.replace(/^#/,"");let e=parseInt(t.slice(0,2),16),n=parseInt(t.slice(2,4),16),s=parseInt(t.slice(4,6),16);return(t.length===8?parseInt(t.slice(6,8),16):255)<<24|s<<16|n<<8|e}function N(t){let e=(t&255).toString(16).padStart(2,"0"),n=(t>>>8&255).toString(16).padStart(2,"0"),s=(t>>>16&255).toString(16).padStart(2,"0"),r=(t>>>24&255).toString(16).padStart(2,"0");return`#${e}${n}${s}${r}`}function $(t,e,n,s=255){return(s&255)<<24|(n&255)<<16|(e&255)<<8|t&255}function z(t){return[t&255,t>>>8&255,t>>>16&255,t>>>24&255]}var _={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function E(t,e,n){if(!(n in _))throw new Error(`Invalid block size: ${n}`);let s=_[n];if(s.length!==n)throw new Error("Buffer length mismatch");s.fill(0);for(let r of t)for(let a=0;a<n;a++){let u=e+a;u<r.length&&(s[a]+=r[u])}for(let r=0;r<n;r++){let a=s[r];s[r]=a>1?1:a<-1?-1:a}return s}function H(t,e){if(t.length===0)return new Float32Array(0);let n=Math.max(...t.map(a=>a.length)),s=Math.ceil(n/e),r=new Float32Array(n);for(let a=0;a<s;a++){let u=a*e,p=E(t,u,e);for(let o=0;o<p.length&&u+o<n;o++)r[u+o]=p[o]}return r}function P(t,e){for(let n=0;n<t.length;n++)t[n]*=e,t[n]=Math.max(-1,Math.min(1,t[n]))}function V(t,e){let n=Math.pow(10,e/20);P(t,n)}function G(t){let e=0;for(let r=0;r<t.length;r++)e+=t[r]*t[r];let n=Math.sqrt(e/t.length);return 20*Math.log10(Math.max(n,1e-12))}function j(t,e){return t/e}var be={Sine:S},de={UseList_Heap:F};export{de as Allocators,be as ExamplePlugins,k as Track,g as WorkletHelper,M as Workspace,T as createSampleSAB,v as createSampleView,L as createWorkletBlob,P as gainClamped,V as gainDecibels,W as hex2str,D as hexToPacked,$ as packRGBA,N as packedToHex,O as playSamples,G as rmsGetDecibels,j as sampleToSeconds,R as str2hex,U as struct,E as sumBlocks,I as sumBlocksMutate,H as sumTracks,z as unpackRGBA};
