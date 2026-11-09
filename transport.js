import {box,rounded,dome,tube,roof,beam,placeParts,pointOnSite} from './scenery.js';
import {regionSurface} from './regions.js';

const cream='#f4e5c6', dark='#455366', glass='#74aab9', steel='#a7b6bb';
const sides=[-1,1];
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{ const t=clamp(value); return t*t*(3-2*t); };
const railZ=-2.45;
const deckHeight=moon=>moon?3.38:2.95;
const pose=(x,y,z,yaw,sound=false)=>({
  x,y,z,cos:Math.cos(yaw),sin:Math.sin(yaw),stride:0,rollCos:1,rollSin:0,sound:Number(sound),
});

function trainModel(moon,carriage=false) {
  const paint=moon?'#70b9c1':'#b96761', stripe=moon?'#f0b979':'#efd2a2';
  const end=carriage?1.31:1.49;
  const drive=moon
    ? [rounded(0,0,.56,2.43,.29,'#638791',-.09)]
    : sides.flatMap(side=>[-.83,.83].map(z=>tube(side*.52,z,.12,.37,.37,dark,.02,'x')));
  return [
    ...drive,rounded(0,0,1.21,end*2,1.07,paint,.18),
    rounded(0,-.06,1.14,end*1.79,.24,moon?'#d3d9e6':'#a4ac9e',1.15),
    ...sides.flatMap(side=>[
      box(side*.602,0,.036,2.54,.14,stripe,.43),
      ...[-.92,-.32,.28,.88].map(z=>rounded(side*.607,z,.054,.43,.32,glass,.75)),
      rounded(side*.39,end,.16,.05,.145,cream,.48),
    ]),
    rounded(0,end-.043,.88,.16,.36,'#4d788c',.73),
    ...(moon||carriage?[]:[tube(0,.7,.17,.19,.29,dark,1.31),rounded(0,1.29,1.24,.52,.29,'#b0a18e',.08)]),
  ];
}

export function transitStation(moon) {
  const level=deckHeight(moon);
  const wall=moon?'#9cabc7':'#c19079', trim=moon?'#d0b2ce':'#e9c89c';
  const canopy=moon?'#638998':'#547d77', platform='#c5c6b7';
  const stairs=Array.from({length:10},(_,i)=>box(2.83,3.77-i*.26,1.38,.54,.18+i*(level-.27)/9,trim,.3));
  const columns=[-4.34,4.34].flatMap(x=>[
    rounded(x,-1.55,1.21,1.14,level,wall,.3),box(x,-1.55,1.52,1.35,.23,trim,level-.14),
  ]);
  return [
    [{...box(0,0,10.32,9.44,1.32,wall,-1.25),support:true},
      rounded(0,0,10.55,9.67,.27,'#d2c9b2',.04)],
    [...columns, ...stairs,box(2.83,.57,1.4,1.98,.21,platform,level-.17),
      rounded(-.87,1.32,4.93,3.11,2.42,wall,.3),
      roof(-.87,1.32,5.16,3.32,.67,canopy,2.64),
      box(-.86,2.894,2.65,.08,1.46,dark,.38),
      ...sides.map(side=>box(-.86+side*.61,2.95,1.03,.055,1.1,glass,.57)),
      rounded(0,-1.11,9.88,1.54,.24,platform,level-.2),
      box(0,-1.8,9.56,.12,.047,cream,level+.043),
      ...[-3.75,0,3.75].flatMap(x=>[
        tube(x,-.8,.15,.15,1.34,steel,level+.025),
        roof(x,-1.2,3.08,1.68,.43,canopy,level+1.28),
      ]),
    ],
    [box(-.86,2.986,2.01,.075,.43,canopy,2.17),
      ...[-.51,0,.51].map(x=>rounded(x-.86,3.037,.3,.06,.15,moon?'#b3f0e6':cream,2.32)),
      ...[-3.02,-1.58,1.4].flatMap(x=>[
        box(x,-1.18,.92,.34,.09,trim,level+.24),
        box(x,-1.18,.72,.25,.21,dark,level+.04),
      ]),
      // The chooser has a short piece of track and a train. On the map the line is generated from the lot.
      ...railTrack([[-5,level,railZ],[5,level,railZ]],moon).map(part=>({...part,transitPreview:true})),
      ...placeParts(trainModel(moon),{x:1.25,y:level,z:railZ,yaw:Math.PI/2}).map(part=>({...part,transitPreview:true})),
    ],
  ];
}

function plate(outline,color) {
  const [x,y,z]=outline[0];
  return {shape:'terrain',outline,color,x,y,z,h:0};
}

function railTrack(points,moon) {
  const deck=moon?'#7f8da3':'#82776e', edge=moon?'#c3c1d3':'#c5a58a';
  const half=moon?.57:.94;
  const sideways=(index,offset,lower=0)=>{
    const [x,y,z]=points[index];
    const before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)];
    const dx=after[0]-before[0],dz=after[2]-before[2],length=Math.hypot(dx,dz);
    return [x-dz/length*offset,y-lower,z+dx/length*offset];
  };
  const parts=[];
  for (let i=1;i<points.length;i++) {
    const a=sideways(i-1,-half,.11),b=sideways(i-1,half,.11);
    const c=sideways(i,half,.11),d=sideways(i,-half,.11);
    parts.push(plate([a,b,c,d],deck));
    for (const side of sides) parts.push(plate([
      sideways(i-1,side*half,.11),sideways(i,side*half,.11),
      sideways(i,side*half,.46),sideways(i-1,side*half,.46),
    ],edge));
    for (const offset of moon?[0]:[-.46,.46]) {
      parts.push(beam(sideways(i-1,offset,.02),sideways(i,offset,.02),moon?.38:.082,moon?'#8ebec9':steel));
    }
    if (!moon) parts.push(beam(sideways(i,-.7,.085),sideways(i,.7,.085),.12,'#58555a'));
  }
  return parts;
}

function portal(moon) {
  const outer=moon?'#a0a5c0':'#a3a192', inset=moon?'#677e92':'#6f7a6b';
  const hood=moon?'#7589a1':'#878d7a';
  return [
    ...sides.flatMap(side=>[
      rounded(side*1.05,-.42,.51,3.36,2.27,outer,-.42),
      box(side*.77,1.24,.21,.1,1.9,inset,-.19),
      rounded(side*.91,1.18,.15,.13,.16,moon?'#9bdfda':'#ead08c',1.37),
    ]),
    rounded(0,-.46,2.63,3.53,.44,hood,1.77),
    beam([-1.07,1.52,1.31],[-.67,1.92,1.31],.22,outer),
    beam([-.67,1.92,1.31],[.67,1.92,1.31],.22,outer),
    beam([.67,1.92,1.31],[1.07,1.52,1.31],.22,outer),
    box(0,-1.98,2.04,.22,2.1,'#394453',-.36),
    box(0,1.25,1.55,.13,.37,outer,1.56),
  ];
}

function roadClearance(paths,x,z) {
  for (const path of paths) {
    for (let i=1;i<path.length;i++) {
      const a=path[i-1],b=path[i];
      const dx=b.x-a.x,dz=b.z-a.z;
      const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));
      if (Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<2.15) return false;
    }
  }
  return true;
}

export function districtRail(layout,plot,paths) {
  const moon=plot.kind==='monorailStation', level=deckHeight(moon);
  const halfStreet=plot.streetSpan?plot.streetSpan*.5:5.9;
  const end=plot.streetSpan?halfStreet*2+3.45:12.3;
  const heightOffset=x=>smooth((Math.abs(x)-5)/4);
  const sample=along=>{
    const turn=heightOffset(along);
    const localZ=railZ+(-halfStreet+.48-railZ)*turn;
    const [x,y,z]=pointOnSite([along,level,localZ],plot);
    const ground=regionSurface(layout,x,z);
    return [x,y+Math.max(0,ground.y-plot.y+.37)*turn,z];
  };
  const count=Math.ceil(end*2/.69);
  const points=Array.from({length:count+1},(_,i)=>sample((i/count*2-1)*end));
  const parts=railTrack(points,moon);
  for (let i=3;i<points.length-1;i+=6) {
    const [x,y,z]=points[i];
    if (Math.hypot(x-plot.x,z-plot.z)<5.6) continue;
    const [nx,,nz]=points[i+1],run=Math.hypot(nx-x,nz-z);
    const bases=roadClearance(paths,x,z)?[[x,z]]:sides
      .map(side=>[x-side*(nz-z)/run*2.69,z+side*(nx-x)/run*2.69])
      .filter(([a,b])=>roadClearance(paths,a,b));
    const column=moon?'#a4aec6':'#b4a48f', cap=moon?'#8394a8':'#a89481';
    for (const [a,b] of bases) {
      const ground=regionSurface(layout,a,b);
      parts.push(rounded(a,b,.58,.61,Math.max(.08,y-ground.y-.39),column,ground.y),
        a===x&&b===z?box(x,z,1.09,.88,.27,cap,y-.54):beam([a,y-.4,b],[x,y-.4,z],.27,cap));
    }
  }
  for (const side of sides) {
    const [x,y,z]=sample(side*(end-1.22));
    const yaw=plot.yaw-side*Math.PI/2;
    parts.push(...placeParts(portal(moon),{x,y,z,yaw}));
    if (roadClearance(paths,x,z)) {
      const {y:ground}=regionSurface(layout,x,z);
      parts.push(rounded(x,z,2.24,2.12,Math.max(.16,y-ground-.44),moon?'#9296ad':'#a39b88',ground));
    }
  }

  const travel=(end+4.5)/(moon?4.3:3.8), dwell=2.25, leg=travel*2+dwell+2.6;
  const actors=[false,true].map(carriage=>({
    kind:carriage?'train-car':moon?'monorail':'train',
    parts:trainModel(moon,carriage),
    pose(seconds) {
      const time=seconds+travel;
      const direction=Math.floor(time/leg)%2===0?1:-1;
      const t=time%leg;
      const progress=t<travel?-((1-t/travel)**2):t<travel+dwell?0:clamp((t-travel-dwell)/travel)**2;
      const along=direction*((end+4.5)*progress-(carriage?3.03:0));
      const [x,y,z]=sample(along);
      const [nx,,nz]=sample(along+.1*direction);
      const audible=!carriage&&Math.abs(along)<end-2&&(t<travel-1.2||t>travel+dwell-.26);
      return pose(x,Math.abs(along)>end-.25?-540:y,z,Math.atan2(nx-x,nz-z),audible);
    },
  }));
  return {parts,points:points.map(([x,y,z])=>({x,y,z})),actors};
}

export const AIRPORT_HELIPAD={x:3.63,y:.48,z:-.48};
export function helipadParts() {
  const {x,z}=AIRPORT_HELIPAD;
  return [
    tube(x,z,3.02,3.02,.12,'#e3c37e',.35),tube(x,z,2.82,2.82,.024,'#657d87',.458),
    ...sides.map(side=>box(x+side*.29,z,.15,.85,.018,cream,.482)),
    box(x,z,.67,.16,.017,cream,.482),
  ];
}

function helicopterBody(island) {
  const paint=island?'#368e96':'#d49465';
  return [
    rounded(0,0,.99,2.04,.74,paint,.25),dome(0,.39,.91,1.17,.5,glass,.54),
    rounded(0,-.29,.91,.84,.12,cream,.71),
    beam([0,.62,-.63],[0,.79,-2.14],.22,paint),
    box(0,-2.09,.092,.44,.51,paint,.65),
    tube(0,-.16,.11,.11,.39,steel,1),
    ...sides.flatMap(side=>[
      beam([side*.32,.3,.55],[side*.52,.075,.52],.09,steel),
      beam([side*.32,.28,-.52],[side*.52,.075,-.48],.09,steel),
      beam([side*.52,.065,-.8],[side*.52,.075,.84],.092,dark),
      beam([side*.52,.075,.84],[side*.52,.184,.99],.091,dark),
      box(side*.488,-.23,.045,.47,.27,glass,.55),
    ]),
    tube(.075,-2.125,.10,.28,.28,dark,.89,'x'),
    box(.133,-2.125,.037,.54,.058,steel,1),
    box(.134,-2.125,.037,.061,.54,steel,.758),
  ];
}

export function helicopterModels(island,plot) {
  const center=island?pointOnSite([AIRPORT_HELIPAD.x,AIRPORT_HELIPAD.y,AIRPORT_HELIPAD.z],plot):[plot.x,plot.y,plot.z];
  const yaw=island?(plot.yaw??0)-Math.PI/4:0;
  const [cx,cy,cz]=center;
  function flight(seconds) {
    const t=seconds%(island?46:58);
    if (island) {
      if (t<4||t>=32) return pose(cx,-540,cz,yaw);
      let distance=0,altitude=0,heading=yaw;
      if (t<13) {
        const incoming=(13-t)/9;
        distance=-143*incoming**2.3;
        altitude=54*incoming**1.42;
      } else if (t>23) {
        const outgoing=(t-23)/9;
        distance=143*outgoing**2.25;
        altitude=53*outgoing**1.44;
      } else heading+=Math.sin((t-13)*.32)*.035;
      return pose(cx+Math.sin(yaw)*distance,cy+altitude,cz+Math.cos(yaw)*distance,heading,t<14||t>23);
    }
    if (t<5||t>=41) return pose(cx,-540,cz,yaw);
    const travel=(t-5)/36, angle=travel*Math.PI*4;
    const distance=11+42*(1-smooth(travel*7)) + 42*smooth((travel-.86)*7.14);
    return pose(cx+Math.cos(angle)*distance,cy+14.2+Math.sin(angle*.5)*1.35,cz+Math.sin(angle)*distance,
      -angle,t>8&&t<38);
  }
  const rotor=[
    tube(0,0,.32,.32,.11,dark,0),
    ...[0,Math.PI/2].flatMap(angle=>[
      {...box(0,0,.136,3.2,.038,dark,.05),angle},
      ...sides.map(side=>({...box(Math.sin(angle)*side*1.51,Math.cos(angle)*side*1.51,.137,.19,.042,cream,.05),angle})),
    ]),
  ];
  return [
    {kind:'helicopter',parts:helicopterBody(island),pose:flight},
    {kind:'helicopter-rotor',parts:rotor,pose(seconds) {
      const base=flight(seconds);
      const speed=island&&base.y===cy?10:23;
      return pose(base.x,base.y+1.37,base.z,seconds*speed);
    }},
  ];
}
