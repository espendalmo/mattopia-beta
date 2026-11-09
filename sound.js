import {ambienceBuffer,ACTIVITY_SOUNDS,soundClip} from './sound-art.js';

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
SOUND_PATTERNS.tap=[[79,0,.061,.012]];
SOUND_PATTERNS.back=[[72,0,.082,.013,68]];
SOUND_PATTERNS.hint=[[72,0,.11,.023],[81,.075,.17,.025,83]];
SOUND_PATTERNS.finale=[[60,.45,.18,.043],[67,.55,.19,.045],[72,.72,.23,.055],[76,.91,.27,.054],
  [79,1.09,.28,.049],[84,1.29,.67,.06],[79,1.29,.64,.036],[76,1.29,.65,.029],[60,1.29,.65,.032]];
const lightSounds=new Set(['key','select','open','next','build','tap','back','hint']);
const worlds=new Set(['city','moon','island']);
export const AMBIENCE_LEVEL=.75;
const floor=.0001;

function playbackSession() {
  const device=globalThis.navigator;
  const appleTouch=device?.maxTouchPoints>0&&/^(iPhone|iPad|iPod|MacIntel)$/.test(device.platform);
  return appleTouch?device.audioSession:null;
}

export function createSoundPlayer(getContext=()=>new(window.AudioContext||window.webkitAudioContext)(), getSession=playbackSession) {
  let context,voices=[],generation=0,ambience,ambienceGeneration=0,session;
  const beds=new Map(),clips=new Map();

  function stopVoices() {
    generation++;
    for (const {source,gain} of voices) {
      try { source.stop(); source.disconnect(); gain.disconnect(); } catch {}
    }
    voices=[];
  }
  function unlock() {
    try {
      const next=getSession();
      if (next&&next!==session) {
        try { next.type='playback'; session=next; } catch {}
      }
      context||=getContext();
      return context.resume();
    } catch { return Promise.resolve(); }
  }
  function stopAmbience() {
    ambienceGeneration++;
    if (!ambience) return;
    const {source,gain}=ambience;
    ambience=null;
    try {
      const now=context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(floor,now,.038);
      source.stop(now+.2);
    } catch {
      source.disconnect();
      gain.disconnect();
    }
  }

  async function startAmbience(scene,{delay=0,duration=Infinity}={}) {
    const world=typeof scene==='string'?scene:scene?.id;
    const buildings=Math.min(4,Math.ceil((scene?.soundscape?.buildings??Object.keys(scene?.landmarks??{}).length)/4));
    const fun=Math.min(2,scene?.soundscape?.fun??0);
    const key=`${world}:${buildings}:${fun}`;
    const limited=Number.isFinite(duration);
    if (ambience?.key===key&&!ambience.limited&&!limited) return true;
    stopAmbience();
    if (!worlds.has(world)) return false;
    const token=ambienceGeneration;
    try {
      await unlock();
      if (!context || token!==ambienceGeneration) return false;
      if (!beds.has(key)) {
        beds.set(key,ambienceBuffer(context,world,buildings,fun));
        if (beds.size>8) beds.delete(beds.keys().next().value);
      }
      const source=context.createBufferSource(),gain=context.createGain();
      const start=context.currentTime+delay,end=start+duration;
      source.buffer=beds.get(key);
      source.loop=true;
      // Ambient sounds share the same 75% bus, separate from the UI effects and fanfares.
      gain.gain.setValueAtTime(floor,start);
      gain.gain.linearRampToValueAtTime(.07*AMBIENCE_LEVEL,start+.55);
      if (limited) {
        gain.gain.setValueAtTime(.07*AMBIENCE_LEVEL,end-1.1);
        gain.gain.linearRampToValueAtTime(floor,end);
      }
      source.connect(gain);
      gain.connect(context.destination);
      const mix={key,source,gain,start,end,limited,heard:new Map()};
      source.onended=()=>{
        if (ambience===mix) ambience=null;
        source.disconnect();
        gain.disconnect();
      };
      source.start(start);
      if (limited) source.stop(end+.04);
      ambience=mix;
      return true;
    } catch { return false; }
  }

  function sample(kind,time,volume,destination=context.destination,voice=true,length) {
    if (!context.createBufferSource) return;
    if (!clips.has(kind)) clips.set(kind,soundClip(context,kind));
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=clips.get(kind);
    gain.gain.setValueAtTime(volume,time);
    source.connect(gain);
    gain.connect(destination);
    const record={source,gain};
    if (voice) voices.push(record);
    source.onended=()=>{
      if (voice) voices=voices.filter(item=>item!==record);
      source.disconnect(); gain.disconnect();
    };
    if (length) {
      gain.gain.linearRampToValueAtTime(volume,time+length-.14);
      gain.gain.linearRampToValueAtTime(floor,time+length);
    }
    if (length) source.start(time,0,length);
    else source.start(time);
  }

  function activity(kind,intensity=1) {
    const clip=ACTIVITY_SOUNDS[kind];
    if (!clip||!ambience||!context) return false;
    const now=context.currentTime;
    if (now<ambience.start||now>ambience.end-.8) return false;
    if (now-(ambience.heard.get(kind)??-Infinity)<clip[0]+1.6) return true;
    try {
      sample(kind,now,clip[1]*Math.max(0,Math.min(1,intensity))/.07,ambience.gain,false);
      ambience.heard.set(kind,now);
      return true;
    } catch { return false; }
  }

  function melody(kind,now) {
    for (const [midi,offset,duration,volume,endMidi] of SOUND_PATTERNS[kind]) {
      const source=context.createOscillator(),gain=context.createGain(),start=now+offset;
      source.type=kind==='finish'||kind==='finale'||kind==='key'?'triangle':'sine';
      source.frequency.setValueAtTime(440*2**((midi-69)/12),start);
      if (endMidi) source.frequency.exponentialRampToValueAtTime(440*2**((endMidi-69)/12),start+duration*.75);
      gain.gain.setValueAtTime(floor,start);
      gain.gain.exponentialRampToValueAtTime(volume,start+(kind==='key'?.003:.014));
      gain.gain.exponentialRampToValueAtTime(floor,start+duration);
      source.connect(gain); gain.connect(context.destination);
      const voice={source,gain};
      voices.push(voice);
      source.onended=()=>{
        voices=voices.filter(item=>item!==voice);
        source.disconnect(); gain.disconnect();
      };
      source.start(start); source.stop(start+duration+.03);
    }
  }

  function stop() {
    stopVoices();
    stopAmbience();
    if (session) {
      try { session.type='auto'; } catch {}
      session=null;
    }
  }
  function play(kind,enabled=true) {
    if (!lightSounds.has(kind)) stopVoices();
    if (!enabled||!SOUND_PATTERNS[kind]) return;
    const token=generation;
    unlock().then(()=>{
      if (!context||token!==generation) return;
      const now=context.currentTime+(kind==='key'?0:.015);
      melody(kind,now);
      if (kind==='landmark'||kind==='finale') sample('applause',now+1.2,kind==='finale'?.13:.092);
    }).catch(()=>{});
  }

  function playBuild(scene,enabled=true,{finale=false,tail=true}={}) {
    if (!enabled) return;
    if (tail) stopAmbience();
    const finished=Boolean(scene?.finished);
    play(finale?'finale':finished?'landmark':'finish');
    if (!scene?.world) return;
    const token=generation;
    unlock().then(()=>{
      if (!context||token!==generation) return;
      const start=context.currentTime+(finished?.06:scene.roadBuild?1.05:.66);
      sample(scene.id==='moon'?'build-moon':'build-earth',start,finished?.07:.13,context.destination,true,finished?.63:undefined);
    }).catch(()=>{});
    if (tail) startAmbience(scene,{delay:finished?2.4:2.25,duration:4.65});
  }

  return {play,stop,unlock,startAmbience,stopAmbience,activity,playBuild};
}
