var synth=(()=>{var p=Object.defineProperty;var q=Object.getOwnPropertyDescriptor;var R=Object.getOwnPropertyNames;var P=Object.prototype.hasOwnProperty;var v=(e,t)=>{for(var r in t)p(e,r,{get:t[r],enumerable:!0})},T=(e,t,r,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of R(t))!P.call(e,n)&&n!==r&&p(e,n,{get:()=>t[n],enumerable:!(o=q(t,n))||o.enumerable});return e};var E=e=>T(p({},"__esModule",{value:!0}),e);var N={};v(N,{ExamplePlugins:()=>W,WorkletHelper:()=>l,createSampleSAB:()=>m,createSampleView:()=>x,createWorkletBlob:()=>c,gainClamped:()=>h,gainDecibels:()=>C,hex2str:()=>g,hexToPacked:()=>A,packRGBA:()=>S,packedToHex:()=>B,playSamples:()=>y,rmsGetDecibels:()=>I,sampleToSeconds:()=>M,str2hex:()=>b,sumBlocks:()=>f,sumTracks:()=>k,unpackRGBA:()=>F});var u=class{wantsMic;pluginName;type;phase;constructor(){this.wantsMic=!1,this.pluginName="example sine #01",this.type=0,this.phase=0}process128(t){this.phase===void 0&&(this.phase=0);let a=2*Math.PI*430/44100;for(let s=0;s<t.length;s++)t[s]=Math.sin(this.phase)*.25,this.phase+=a,this.phase>2*Math.PI&&(this.phase-=2*Math.PI)}};var L=`
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
`;function c(){let e=new Blob([L],{type:"application/javascript"});return URL.createObjectURL(e)}function m(e){return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT*128*e)}function x(e){return new Float32Array(e)}var l=class{node;audioCtx;sampleBuffer=null;sampleCounter;queueLength;blockSize=128;onRequest=()=>{};constructor(t=4,r){this.queueLength=t,this.audioCtx=r||new AudioContext({sampleRate:44100});let o=new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);this.sampleCounter=new Uint32Array(o)}async init(){let t=c();await this.audioCtx.audioWorklet.addModule(t),this.node=new AudioWorkletNode(this.audioCtx,"SABWaveProcessor",{processorOptions:{queueLength:this.queueLength}}),this.node.port.postMessage({type:"sampleCounter",buffer:this.sampleCounter.buffer}),this.node.port.onmessage=r=>{if(r.data.type==="requestBuffer"){let o=r.data.blockIndex%this.queueLength;this.onRequest(o)}}}setSAB(t){this.sampleBuffer=new Float32Array(t),this.node?.port.postMessage({type:"waveBuffer",buffer:t})}pause(){this.node?.port.postMessage({type:"pause"})}unpause(){this.node?.port.postMessage({type:"unpause"})}scrub(t){this.node?.port.postMessage({type:"scrub",sampleIndex:t}),this.sampleCounter[0]=t}connect(t){t?this.node?.connect(t):this.node?.connect(this.audioCtx.destination)}disconnect(){this.node?.disconnect()}async start(){this.audioCtx.state!=="running"&&await this.audioCtx.resume()}getCurrentSampleIndex(){return this.sampleCounter[0]}};function b(e){return[...new TextEncoder().encode(e)].map(t=>t.toString(16).padStart(2,"0")).join("")}function g(e){let t=e.match(/.{1,2}/g);return new TextDecoder().decode(new Uint8Array(t.map(r=>parseInt(r,16))))}function y(e,t=44100){let r=new(window.AudioContext||window.webkitAudioContext),o=r.createBuffer(1,e.length,t);o.copyToChannel(e,0,0);let n=r.createBufferSource();n.buffer=o,n.connect(r.destination),n.start()}function A(e){e=e.replace(/^#/,"");let t=parseInt(e.slice(0,2),16),r=parseInt(e.slice(2,4),16),o=parseInt(e.slice(4,6),16);return(e.length===8?parseInt(e.slice(6,8),16):255)<<24|o<<16|r<<8|t}function B(e){let t=(e&255).toString(16).padStart(2,"0"),r=(e>>>8&255).toString(16).padStart(2,"0"),o=(e>>>16&255).toString(16).padStart(2,"0"),n=(e>>>24&255).toString(16).padStart(2,"0");return`#${t}${r}${o}${n}`}function S(e,t,r,o=255){return(o&255)<<24|(r&255)<<16|(t&255)<<8|e&255}function F(e){return[e&255,e>>>8&255,e>>>16&255,e>>>24&255]}var w={128:new Float32Array(128),256:new Float32Array(256),384:new Float32Array(384),512:new Float32Array(512)};function f(e,t,r){if(!(r in w))throw new Error(`Invalid block size: ${r}`);let o=w[r];if(o.length!==r)throw new Error("Buffer length mismatch");o.fill(0);for(let n of e)for(let a=0;a<r;a++){let s=t+a;s<n.length&&(o[a]+=n[s])}for(let n=0;n<r;n++){let a=o[n];o[n]=a>1?1:a<-1?-1:a}return o}function k(e,t){if(e.length===0)return new Float32Array(0);let r=Math.max(...e.map(a=>a.length)),o=Math.ceil(r/t),n=new Float32Array(r);for(let a=0;a<o;a++){let s=a*t,d=f(e,s,t);for(let i=0;i<d.length&&s+i<r;i++)n[s+i]=d[i]}return n}function h(e,t){for(let r=0;r<e.length;r++)e[r]*=t,e[r]=Math.max(-1,Math.min(1,e[r]))}function C(e,t){let r=Math.pow(10,t/20);h(e,r)}function I(e){let t=0;for(let n=0;n<e.length;n++)t+=e[n]*e[n];let r=Math.sqrt(t/e.length);return 20*Math.log10(Math.max(r,1e-12))}function M(e,t){return e/t}var W={Sine:u};return E(N);})();
