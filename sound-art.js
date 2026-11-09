const TAU=2*Math.PI;
const loopLength=16;
const unit=value=>Math.max(0,Math.min(1,value));
const wave=(time,pitch)=>Math.sin(TAU*time*pitch);

function synthesize(context,length,sample) {
  const rate=16000,buffer=context.createBuffer(1,Math.round(rate*length),rate);
  const samples=buffer.getChannelData(0);
  let seed=7231,low=0,mid=0;
  for (let i=0;i<samples.length;i++) {
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*.025;
    mid+=(noise-mid)*.13;
    samples[i]=sample(t,noise,low,mid);
  }
  return buffer;
}

function chirp(t,length,pitch) {
  if (t<0||t>=length) return 0;
  return Math.sin(Math.PI*t/length)**2*wave(t,pitch*(1-.145*t/length));
}

export function ambienceBuffer(context,world,buildings,fun) {
  const calls=world==='city'?[[1.9,1550],[2.16,1790],[7.4,1850],[7.69,1580],[12.33,1710]]
    :world==='island'?[[6.2,920],[12.6,1060]]:[[4.25,392],[4.49,466],[11.2,330]];
  return synthesize(context,loopLength,(t,noise,low,mid)=>{
    let bed;
    if (world==='island') {
      const wave=.17+.69*(.5-.5*Math.cos(t*TAU/4))**2;
      bed=wave*(low*1.8+mid*.75+noise*.11);
    } else if (world==='moon') {
      bed=low*.53+mid*.12+.085*wave(t,56)*(.8+.2*Math.cos(t*TAU/8));
    } else bed=(.78+.22*wave(t,1/8))*(low*.93+mid*.17);
    for (const [at,pitch] of calls) {
      bed+=(world==='city'?.11:.065)*chirp(t-at,world==='island'?.42:.15,pitch);
    }
    // The street noise and the little fairground sounds are barely audible until the map is busy.
    const passes=(.4+.32*wave(t,1/8)+.23*wave(t,3/16))**2;
    const street=buildings*.075*passes*(low*1.2+wave(t,world==='moon'?86:62)*.32);
    const voices=fun*.031*(mid*.88*passes+chirp(t-5.3,.31,494)+chirp(t-5.55,.39,587));
    return (bed+street+voices)*Math.min(1,t*3,(loopLength-t)*3);
  });
}

export const ACTIVITY_SOUNDS=Object.freeze({
  rocket:[2.05,.19],
  plane:[1.5,.125],
  helicopter:[2.15,.125],
  train:[1.48,.17],
  monorail:[1.2,.125],
});

export function soundClip(context,kind) {
  if (kind==='applause') {
    const length=2.26, claps=Array.from({length:34},(_,i)=>({
      time:i*.056+(i*13%8)*.014,amplitude:.37+(i*23%11)*.059,
    }));
    return synthesize(context,length,(t,noise,low,mid)=>{
      let energy=0;
      for (const {time,amplitude} of claps) {
        const age=t-time;
        if (age>=0&&age<.135) energy+=amplitude*unit(age/.006)*Math.exp(-age*35);
      }
      const fade=unit(t/.18)*unit((length-t)/.62);
      return (noise*.6+mid*.7+low*.46)*energy*fade*.34;
    });
  }
  if (kind==='build-earth'||kind==='build-moon') {
    const moon=kind==='build-moon';
    return synthesize(context,1.66,(t,noise,low,mid)=>{
      let knocks=0;
      for (const start of [.08,.25,.49,1.14,1.37]) {
        const age=t-start;
        if (age>=0&&age<.16) knocks+=Math.exp(-age*31)*unit(age/.003)*(low*.94+mid*.6+wave(age,moon?112:164)*.31);
      }
      const work=unit((t-.54)*13)*unit((1.11-t)*10);
      const tool=moon
        ? (wave(t,530+t*510)+.5*wave(t,1090-t*250))*(.61+.3*wave(t,27))*.27
        : (.65+.31*wave(t,7))*(mid*.62+noise*.24);
      return knocks*.73+work*tool*.8;
    });
  }
  const [length]=ACTIVITY_SOUNDS[kind];
  return synthesize(context,length,(t,noise,low,mid)=>{
    const pass=Math.sin(Math.PI*t/length)**1.5;
    if (kind==='rocket') return pass*(1.2*low+.4*mid+.18*noise+.14*wave(t,42+18*t));
    if (kind==='plane') return pass*(low*.8+mid*.32+.18*wave(t,102-27*t));
    if (kind==='helicopter') return pass*(.42+.55*wave(t,11)**2)*(low*.9+mid*.32+.29*wave(t,56));
    if (kind==='train') return pass*(low*.65+(.5+.49*wave(t,6)**4)*(mid*.44+noise*.095)+chirp(t-.5,.53,357)*.13);
    return pass*(low*.31+.22*wave(t,94+t*9)+chirp(t-.13,.75,442)*.21);
  });
}
