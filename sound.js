// Original, local melodies: [MIDI pitch, start, duration, gain].
export const SOUND_PATTERNS={success:[[76,0,.23,.065],[79,.10,.25,.065],[84,.22,.42,.07],[72,.22,.40,.025]],finish:[[60,0,.18,.045],[64,.12,.20,.045],[67,.24,.22,.05],[72,.38,.27,.06],[76,.56,.25,.05],[79,.70,.28,.055],[84,.9,.72,.055],[79,.9,.72,.035],[76,.9,.72,.035],[72,.9,.72,.03],[60,.9,.72,.025]]};
SOUND_PATTERNS.key=[[86,0,.035,.018]];
// Soft pitch glides give the companion a small, voice-like reaction.
SOUND_PATTERNS.retry=[[78,0,.14,.045,74],[90,0,.13,.012,86],[75,.105,.19,.043,81]];
SOUND_PATTERNS.recover=[[74,0,.13,.045,81],[86,0,.13,.012,93],[81,.10,.27,.05,86]];
SOUND_PATTERNS.memory=[[72,0,.13,.05],[76,.09,.14,.05],[79,.18,.16,.055],[84,.29,.34,.055],[76,.29,.34,.028]];
SOUND_PATTERNS.select=[[79,0,.075,.013]];
SOUND_PATTERNS.open=[[69,0,.095,.014],[76,.049,.13,.012]];
SOUND_PATTERNS.next=[[74,0,.085,.011],[79,.046,.09,.009]];
SOUND_PATTERNS.build=[[67,0,.06,.015],[84,.07,.105,.014]];
SOUND_PATTERNS.landmark=[[64,.8,.14,.043],[67,.9,.17,.05],[72,1.01,.2,.055],[76,1.13,.22,.052],
  [84,1.27,.44,.062],[79,1.27,.41,.038],[72,1.27,.46,.029],[60,1.27,.49,.033]];
const lightSounds=new Set(['key','select','open','next','build']);
const worlds=new Set(['city','moon','island']);

function ambienceBuffer(context,world) {
  const rate=16000, duration=16;
  const buffer=context.createBuffer(1,rate*duration,rate);
  const samples=buffer.getChannelData(0);
  const tau=Math.PI*2;
  let seed=7231, low=0, mid=0;
  for (let i=0;i<samples.length;i++) {
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*.025;
    mid+=(noise-mid)*.13;
    let value;
    if (world==='island') {
      const wave=.17+.69*(.5-.5*Math.cos(t*tau/4))**2;
      value=wave*(low*1.8+mid*.75+noise*.11);
    } else if (world==='moon') {
      value=low*.53+mid*.12+.085*Math.sin(t*tau*56)*(.8+.2*Math.cos(t*tau/8));
    } else {
      value=(.78+.22*Math.sin(t*tau/8))*(low*.93+mid*.17);
    }
    const seam=Math.min(1,t*3,(duration-t)*3);
    samples[i]=value*seam;
  }
  const calls=world==='city' ? [[1.9,1550],[2.16,1790],[7.4,1850],[7.69,1580],[12.33,1710]]
    : world==='island' ? [[6.2,920],[12.6,1060]] : [[4.25,392],[4.49,466],[11.2,330]];
  const length=world==='island'?.42:.15;
  for (const [start,pitch] of calls) {
    const count=Math.round(length*rate);
    const first=Math.round(start*rate);
    for (let i=0;i<count;i++) {
      const t=i/rate,p=i/count;
      const envelope=Math.sin(Math.PI*p)**2;
      samples[first+i]+=(world==='city'?.11:.065)*envelope*Math.sin(tau*(pitch*t-.5*pitch*t*p*.29));
    }
  }
  return buffer;
}

export function createSoundPlayer(getContext=()=>new(window.AudioContext||window.webkitAudioContext)()){
  let context,voices=[],generation=0,ambience,ambienceGeneration=0;
  const buffers=new Map();
  function stopVoices(){generation++;for(const v of voices){try{v.osc.stop();v.osc.disconnect();v.gain.disconnect();}catch{}}voices=[];}
  function unlock(){try{context||=getContext();return context.resume();}catch{return Promise.resolve();}}
  function stopAmbience() {
    ambienceGeneration++;
    if (!ambience) return;
    const {source,gain}=ambience;
    ambience=null;
    try {
      const now=context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(.0001,now,.033);
      source.stop(now+.16);
    } catch {
      source.disconnect();
      gain.disconnect();
    }
  }
  async function startAmbience(world) {
    if (ambience?.world===world) return true;
    stopAmbience();
    if (!worlds.has(world)) return false;
    const token=ambienceGeneration;
    try {
      await unlock();
      if (!context || token!==ambienceGeneration) return false;
      if (!buffers.has(world)) buffers.set(world,ambienceBuffer(context,world));
      const source=context.createBufferSource(), gain=context.createGain(), now=context.currentTime;
      source.buffer=buffers.get(world);
      source.loop=true;
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.linearRampToValueAtTime(.07,now+.55);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended=()=>{ source.disconnect(); gain.disconnect(); };
      source.start();
      ambience={world,source,gain};
      return true;
    } catch { return false; }
  }
  function stop(){ stopVoices(); stopAmbience(); }
  function play(kind,enabled=true){
    if(!lightSounds.has(kind))stopVoices();if(!enabled||!SOUND_PATTERNS[kind])return;const token=generation;
    unlock().then(()=>{
      if(!context||token!==generation)return;const now=context.currentTime+(kind==='key'?0:.015);
      for(const[midi,offset,duration,volume,endMidi]of SOUND_PATTERNS[kind]){
        const osc=context.createOscillator(),gain=context.createGain();osc.type=kind==='finish'||kind==='key'?'triangle':'sine';osc.frequency.setValueAtTime(440*2**((midi-69)/12),now+offset);
        if(endMidi)osc.frequency.exponentialRampToValueAtTime(440*2**((endMidi-69)/12),now+offset+duration*.75);
        gain.gain.setValueAtTime(.0001,now+offset);gain.gain.exponentialRampToValueAtTime(volume,now+offset+(kind==='key'?.003:.014));gain.gain.exponentialRampToValueAtTime(.0001,now+offset+duration);
        osc.connect(gain);gain.connect(context.destination);osc.start(now+offset);osc.stop(now+offset+duration+.03);
        const voice={osc,gain};voices.push(voice);osc.onended=()=>{voices=voices.filter(x=>x!==voice);try{osc.disconnect();gain.disconnect();}catch{}};
      }
    }).catch(()=>{});
  }return{play,stop,unlock,startAmbience,stopAmbience};
}
