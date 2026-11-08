import {regionSurface,roadElevation,riverAt} from './regions.js';

export const box = (x,z,w,d,h,color,y=0,studs=0) => ({shape:'box',x,y,z,w,d,h,color,studs});
export const tube = (x,z,w,d,h,color,y=0,axis='y') => ({shape:'tube',x,y,z,w,d,h,color,axis});
export const roof = (x,z,w,d,h,color,y) => ({shape:'roof',x,y,z,w,d,h,color});
export const rounded = (x,z,w,d,h,color,y=0) => ({shape:'rounded',x,y,z,w,d,h,color});
export const dome = (x,z,w,d,h,color,y=0,angle=0) => ({shape:'dome',x,y,z,w,d,h,color,angle});
export const at = (parts,x,y,z) => parts.map(part=>({...part,x:part.x+x,y:part.y+y,z:part.z+z}));
export const beam = (from,to,width,color) => ({
  shape:'beam',from,to,width,color,x:(from[0]+to[0])/2,z:(from[2]+to[2])/2,y:Math.min(from[1],to[1]),h:Math.abs(from[1]-to[1])+width,
});
export const MAX_ACTORS=16;

export function pointOnSite([a,b,d],{x,y,z,yaw=0}) {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return [x+a*c+d*s,y+b,z+d*c-a*s];
}

export function placeParts(parts,site) {
  const point=local=>pointOnSite(local,site);
  return parts.map(part=>{
    const [px,py,pz]=point([part.x,part.y,part.z]);
    const placed={...part,x:px,y:py,z:pz,angle:(part.angle??0)-(site.yaw??0)};
    if (part.shape==='beam') {
      placed.from=point(part.from); placed.to=point(part.to);
    } else if (part.outline) {
      placed.outline=part.outline.map(point);
    }
    return placed;
  });
}

// Front-facing plaques use a few simple painted shapes, at the same scale as the buildings.
const cream='#fff2cc', blue='#b4e5ed', apricot='#f5ad6c', rose='#ff9db1', mint='#96dfbc', ink='#324857';
const marks = {
  bread:[['oval',0,0,1.02,.66,apricot],['line',-.23,0,.1,.35,cream],['line',.04,.015,.1,.35,cream],['line',.31,-.01,.09,.28,cream]],
  book:[['line',-.27,0,.48,.66,cream],['line',.27,0,.48,.66,blue],['line',0,0,.07,.65,ink]],
  wind:[['line',0,0,1.05,.17,cream],['line',0,0,.17,1.05,cream],['oval',0,0,.29,.29,apricot]],
  ball:[['oval',0,0,.89,.89,cream],['oval',0,0,.3,.31,ink],['oval',.29,.21,.14,.14,ink],['oval',-.31,-.18,.14,.14,ink]],
  bed:[['line',0,-.19,1.05,.31,cream],['line',-.45,-.07,.15,.66,cream],['oval',-.23,.14,.32,.25,blue]],
  cross:[['line',0,0,.21,1.03,cream],['line',0,.18,.76,.21,cream]],
  leaf:[['oval',-.18,.14,.37,.61,mint],['oval',.22,.25,.4,.58,'#70caa3'],['line',0,-.23,.11,.63,cream]],
  basket:[['line',0,-.08,.91,.42,apricot],['line',0,.27,.49,.14,cream],['oval',-.22,-.41,.13,.13,cream],['oval',.22,-.41,.13,.13,cream]],
  flame:[['poly',[[-.43,-.28],[-.34,.14],[-.1,.57],[.08,.17],[.31,.4],[.43,-.14],[.22,-.42],[-.2,-.42]],apricot],['oval',.02,-.16,.34,.47,cream]],
  flag:[['line',-.36,0,.11,1.03,cream],['poly',[[-.3,.49],[.43,.36],[.26,-.01],[-.3,.08]],rose]],
  wave:[['poly',[[-.51,-.16],[-.18,.24],[.14,.02],[.49,.32],[.5,.03],[.14,-.24],[-.15,-.01],[-.5,-.38]],blue]],
  gear:[['oval',0,0,.74,.74,apricot],['line',0,0,1.05,.22,apricot],['line',0,0,.22,1.05,apricot],['oval',0,0,.3,.3,ink]],
  cup:[['line',-.13,-.14,.62,.55,cream],['oval',.27,-.05,.36,.31,apricot],['line',0,-.45,.93,.12,cream],['line',-.2,.38,.1,.23,blue]],
  music:[['line',.22,.11,.12,.76,cream],['line',.35,.43,.32,.14,cream],['oval',.02,-.28,.43,.34,rose]],
  rocket:[['poly',[[-.23,-.3],[-.2,.2],[0,.56],[.2,.2],[.23,-.3]],cream],['oval',0,.12,.21,.22,blue],['poly',[[-.13,-.3],[.14,-.3],[0,-.58]],apricot]],
  home:[['poly',[[-.48,-.42],[-.48,.06],[0,.49],[.48,.06],[.48,-.42]],cream],['line',.07,-.19,.26,.46,blue]],
  sun:[['oval',0,0,.67,.67,apricot],['line',0,0,1.06,.14,cream],['line',0,0,.14,1.06,cream],['oval',0,0,.64,.64,apricot]],
  wheel:[['oval',0,0,1.02,1.02,cream],['oval',0,0,.65,.65,ink],['line',0,0,.67,.12,blue],['line',0,0,.13,.67,blue]],
  drop:[['poly',[[0,.56],[.31,.14],[.44,-.14],[.28,-.42],[-.28,-.42],[-.44,-.14],[-.31,.14]],blue],['oval',-.13,-.11,.16,.22,cream]],
  flask:[['poly',[[-.44,-.43],[-.36,-.06],[-.14,.18],[-.14,.49],[.14,.49],[.14,.18],[.36,-.06],[.44,-.43]],cream],['line',0,-.22,.58,.21,mint]],
  scope:[['poly',[[-.47,-.16],[.31,.5],[.49,.25],[-.27,-.39]],blue],['line',0,-.29,.15,.43,cream]],
  radio:[['oval',0,.28,.23,.23,apricot],['poly',[[0,.21],[.35,-.45],[-.35,-.45]],cream],['line',0,-.29,.64,.12,ink]],
  battery:[['line',0,-.03,.91,.65,mint],['line',.52,-.03,.1,.22,cream],['line',-.21,-.03,.1,.42,ink],['line',.05,-.03,.1,.42,ink]],
  crate:[['line',0,0,.86,.72,apricot],['line',0,.13,.82,.1,cream],['line',0,-.14,.82,.1,cream],['line',.21,0,.1,.67,ink]],
  snow:[['line',0,0,1.08,.13,blue],['line',0,0,.13,1.06,blue],['oval',0,0,.36,.36,cream]],
  palm:[['line',0,-.22,.17,.66,apricot],['oval',-.23,.21,.51,.25,mint],['oval',.24,.21,.52,.25,mint],['oval',0,.38,.27,.41,mint]],
  board:[['oval',0,0,.38,1.07,cream],['line',0,0,.11,.75,rose]],
  fork:[['line',-.26,0,.13,.98,cream],['line',-.26,.24,.4,.12,cream],['oval',.27,.26,.34,.49,apricot],['line',.27,-.22,.13,.51,apricot]],
  boat:[['poly',[[-.48,-.16],[.48,-.16],[.29,-.45],[-.25,-.45]],apricot],['poly',[[0,.55],[0,-.03],[-.4,-.03]],cream],['poly',[[.08,.4],[.42,-.03],[.08,-.03]],blue]],
  fruit:[['oval',0,-.09,.78,.73,apricot],['oval',.15,.42,.43,.25,mint]],
};

function plaquePart([kind,...data],x,y,z,size,depth) {
  if (kind==='poly') {
    const [points,color]=data;
    return {shape:'plate',x,y,z,w:size,d:.01,h:size,color,
      profile:points.map(([a,b])=>[a*size,b*size])};
  }
  const [dx,dy,w,h,color]=data;
  return (kind==='oval' ? tube : rounded)(x+dx*size,z,w*size,depth,h*size,color,y+(dy-h/2)*size,'z');
}

export function worldSign(mark,x,y,z,accent) {
  if (mark==='ice') {
    // A waffle cone and two scoops are legible even at the default camera angle.
    const face=z+.16;
    const cone={shape:'plate',x,y:y-.13,z:face,w:1.08,d:.01,h:.94,color:'#dba063',
      profile:[[-.54,.48],[.54,.48],[.02,-.48]]};
    return [rounded(x,z,1.67,.31,2.12,'#754762',y-1.05),cone,
      tube(x-.19,face+.033,.91,.13,.8,'#ffd5ac',y+.12,'z'),
      tube(x+.21,face+.035,.86,.13,.78,'#f3a5be',y+.1,'z'),
      tube(x+.01,face+.047,.7,.12,.66,'#fff0d2',y+.54,'z'),
      ...[-.22,.12].map((dx,i)=>rounded(x+dx,face+.08,.075,.04,.24,'#a9774f',y-.21-i*.07))];
  }
  return [rounded(x,z,1.68,.25,1.56,'#f6e4b9',y-.78),rounded(x,z+.15,1.49,.13,1.36,accent,y-.68),
    ...marks[mark].map((shape,i)=>plaquePart(shape,x,y,z+.235+i*.012,1.03,.048))];
}

const wheel = (x,z,diameter,y) => [
  tube(x,z,.27,diameter,diameter,'#38414f',y,'x'),
  tube(x+Math.sign(x)*.145,z,.105,diameter*.52,diameter*.52,'#d6d1c5',y+diameter*.24,'x'),
];

export function vehicle(kind,color) {
  if (kind==='rover') {
    return [
      ...[-.67,.67].flatMap(x=>[-.86,0,.86].flatMap(z=>wheel(x,z,.71,0))),
      rounded(0,0,1.28,2.31,.39,'#b5b7cf',.43),
      rounded(0,-.35,1.08,1.15,.45,color,.78),
      rounded(0,.53,.89,.79,.48,'#e7e6dd',.76),
      box(0,.78,.65,.38,.18,'#52677e',1.14),
      ...[-.42,.42].map(x=>rounded(x,1.12,.21,.16,.17,'#fff3c1',.71)),
      tube(.3,-.66,.10,.1,.75,'#7c829d',1.12),
      dome(.3,-.66,.64,.57,.18,'#e4e3ef',1.8),
      box(-.31,-.61,.45,.6,.11,'#526582',1.15),
    ];
  }
  const cart=kind==='cart';
  return [
    ...[-.53,.53].flatMap(x=>[-.68,.68].flatMap(z=>wheel(x,z,.48,0))),
    rounded(0,0,1.19,2.02,.47,color,.28),
    rounded(0,-.18,.96,1.06,.49,cart?'#fee3a9':'#4a6c80',.72),
    rounded(0,-.21,.93,1.12,.13,cart?'#f5ce81':color,1.15),
    rounded(0,.37,.76,.12,.23,'#acdbe6',.81),
    ...[-.39,.39].flatMap(x=>[
      rounded(x,.99,.25,.13,.18,'#fff0b7',.49),rounded(x,-.99,.23,.12,.15,'#bb4c5c',.5),
    ]),
    rounded(0,1.02,.48,.13,.13,'#40535f',.36),
  ];
}

function walker(kind,coat,skin='#edb88c') {
  const astronaut=kind==='astronaut', alien=kind==='alien';
  const shoes=astronaut?'#78879d':alien?'#529d83':'#46546c';
  const legs=[-.18,.18].map((x,i)=>({...rounded(x,.05,.29,.37,.61,shoes),stride:i===0?1:-1}));
  const body=rounded(0,0,alien?.52:.68,.43,.69,coat,.56);
  const arms=[-.4,.4].map((x,i)=>({...rounded(x,.02,.2,.29,.58,coat,.68),stride:i===0?-1:1}));
  if (astronaut) return [...legs,body,...arms,
    rounded(0,-.31,.62,.36,.72,'#c9cfe1',.62),dome(0,.015,.87,.76,.66,'#f1e8d7',1.18),
    rounded(0,.31,.62,.26,.35,'#354f66',1.37),rounded(-.12,.447,.24,.032,.076,'#a5d8e6',1.57),
    rounded(0,.25,.29,.1,.18,'#df926d',.97)];
  if (alien) return [...legs,body,...arms,rounded(0,.03,.85,.61,.59,'#a8df91',1.19),
    ...[-.24,.24].map(x=>tube(x,.034,.089,.085,.38,'#84c397',1.64)),
    ...[-.24,.24].map(x=>dome(x,.037,.24,.23,.2,'#bde996',1.97)),
    ...[-.18,.18].map(x=>tube(x,.34,.21,.11,.22,'#394b54',1.4,'z'))];
  return [...legs,body,...arms,rounded(0,.03,.56,.55,.57,skin,1.18),
    dome(0,-.035,.67,.65,.27,'#80535a',1.67),
    ...[-.11,.11].map(x=>rounded(x,.31,.061,.039,.071,'#354756',1.46)),
    rounded(-.05,-.24,.47,.24,.53,'#d9a658',.69)];
}

function route(points, corner) {
  const path=points.flatMap(([x,z],i)=>{
    const approach=points.at(i-1), exit=points[(i+1)%points.length];
    const inset=([px,pz])=>{
      const t=Math.min(.35,corner/Math.hypot(px-x,pz-z));
      return [x+(px-x)*t,z+(pz-z)*t];
    };
    const [ax,az]=inset(approach),[bx,bz]=inset(exit);
    return Array.from({length:6},(_,j)=>{
      const t=j/5,u=1-t;
      return [u*u*ax+2*u*t*x+t*t*bx,u*u*az+2*u*t*z+t*t*bz];
    });
  });
  let length=0;
  const segments=path.map(([x,z],i)=>{
    const [nextX,nextZ]=path[(i+1)%path.length];
    const dx=nextX-x,dz=nextZ-z;
    const distance=Math.hypot(dx,dz);
    const start=length;
    length+=distance;
    return {x,z,dx,dz,start,end:length,yaw:Math.atan2(dx,dz)};
  }).filter(segment=>segment.end-segment.start>.0001);
  return {segments,length};
}

function actor(parts,points,{kind,ground,speed,phase=0,corner=.85,roads=[],roadRise=0,elevation}) {
  return {parts,kind,ground,speed,phase,roads,roadRise,elevation,route:route(points,corner)};
}

export function worldActors(theme) {
  if (theme==='city') return [
    actor(vehicle('car','#df9b65'),[[-16,0],[-16,11],[16,11],[16,0]],{kind:'road',ground:.126,speed:3.7,corner:1.15,roads:[0,11],roadRise:.153}),
    actor(walker('human','#ce7779'),[[-14.4,-20],[-13.75,-19],[-13.75,-2],[-14.4,-2]],{kind:'walk',ground:.061,speed:1.22,phase:.08}),
    actor(walker('human','#759ac1','#bf8b67'),[[6,1.5],[13.4,1.5],[14.1,2.6],[6,2.6]],{kind:'walk',ground:.022,speed:.97,phase:.4}),
  ];
  if (theme==='moon') return [
    actor(vehicle('rover','#d5b38e'),[[-15,-13],[-15,11],[15,11],[15,-13]],{kind:'road',ground:.085,speed:2.35,phase:.018,corner:1.25,roads:[-13,-.75,11],roadRise:.102}),
    actor(walker('astronaut','#ebe9e0'),[[-18,-19],[-17.9,-9],[-18.9,-9],[-19,-19]],{kind:'walk',ground:.045,speed:.9,phase:.14}),
    actor(walker('alien','#79b88d'),[[8,-12],[14,-12],[14,-10.8],[8,-10.8]],{kind:'walk',ground:.047,speed:1.1,phase:.24}),
  ];
  const bird=[rounded(0,0,.44,.66,.22,'#f6e9da',.06),dome(0,.32,.33,.35,.26,'#fcf2de',.12),
    ...[-1,1].map(x=>dome(x*.39,-.05,.84,.28,.14,'#eadfd1',.13,x*.32)),rounded(0,.56,.15,.24,.09,'#e8ae70',.15)];
  return [
    actor(bird,[[-29,-12],[-14,-24],[15,-24],[27,-12],[22,11],[-19,16]],{kind:'bird',ground:5.1,speed:4.8,phase:.13,corner:8}),
    actor(walker('human','#78a9a6'),[[6,-10],[7.1,-10],[7.1,1],[6,1]],{kind:'walk',ground:.465,speed:1.2,phase:.38}),
  ];
}

export function districtActors(theme,lots) {
  const starter=lots[0];
  const {left,right,back,front}=starter;
  const adjacent=lots.slice(0,2);
  const west=Math.min(...adjacent.map(lot=>lot.left)), east=Math.max(...adjacent.map(lot=>lot.right));
  const north=Math.min(...adjacent.map(lot=>lot.back)), south=Math.max(...adjacent.map(lot=>lot.front));
  const circuit=[[west,north],[west,south],[east,south],[east,north]];
  const path=[[left+2,front-1.75],[right-2,front-1.75],[right-2,front-1.24],[left+2,front-1.24]];
  const side=[[right-1.95,back+2],[right-1.95,front-2],[right-1.26,front-2],[right-1.26,back+2]];
  if (theme==='city') return [
    actor(vehicle('car','#e2a072'),circuit,{kind:'road',ground:.102,speed:2.55,phase:.11,corner:1.15}),
    actor(walker('human','#ce7779'),path,{kind:'walk',ground:.039,speed:1.04,phase:.2}),
  ];
  if (theme==='moon') return [
    actor(vehicle('rover','#d5b38e'),circuit,{kind:'road',ground:.10,speed:2.25,phase:.19,corner:1.15}),
    actor(walker('astronaut','#ebe9e0'),path,{kind:'walk',ground:.04,speed:.95,phase:.21}),
    actor(walker('alien','#79b88d'),side,{kind:'walk',ground:.04,speed:1.08,phase:.59}),
  ];
  const bird=[rounded(0,0,.44,.66,.22,'#f6e9da',.06),dome(0,.32,.33,.35,.26,'#fcf2de',.12),
    ...[-1,1].map(x=>dome(x*.39,-.05,.84,.28,.14,'#eadfd1',.13,x*.32)),rounded(0,.56,.15,.24,.09,'#e8ae70',.15)];
  return [
    actor(bird,[[west-3,north-4],[west-3,south+4],[east+3,south+4],[east+3,north-4]],{kind:'bird',ground:5.2,speed:4.1,corner:6}),
    actor(walker('human','#78a9a6'),path,{kind:'walk',ground:.465,speed:1.11,phase:.38}),
  ];
}

export function actorPose(actor, seconds) {
  if (actor.kind==='wheel') {
    const {x,y,z,yaw}=actor;
    const roll=seconds*.39;
    return {x,y,z,cos:Math.cos(yaw),sin:Math.sin(yaw),stride:0,rollCos:Math.cos(roll),rollSin:Math.sin(roll)};
  }
  const {segments,length}=actor.route;
  const traveled=seconds*actor.speed;
  const distance=(traveled+length*actor.phase)%length;
  const segment=segments.find(part=>distance<part.end) ?? segments[0];
  const t=(distance-segment.start)/(segment.end-segment.start);
  const x=segment.x+segment.dx*t,z=segment.z+segment.dz*t;
  const yaw=segment.yaw;
  const walking=actor.kind==='walk';
  const nearestRoad=Math.min(...actor.roads.map(row=>Math.abs(row-z)));
  const y=actor.kind==='coaster'?segment.y+segment.dy*t:
    actor.elevation?.(x,z)??(actor.ground+actor.roadRise*Math.max(0,1-Math.max(0,nearestRoad-.85)/.61));
  const bob=actor.kind==='bird' ? Math.sin(traveled*.44)*.35 : actor.kind==='boat' ? Math.sin(traveled*2.1)*.045 : walking ? Math.abs(Math.sin(traveled*6))*.035 : 0;
  return {x,y:y+bob,z,cos:Math.cos(yaw),sin:Math.sin(yaw),stride:walking?Math.sin(traveled*6)*.17:0,rollCos:1,rollSin:0};
}

export function coasterActor(parts,points,phase) {
  let length=0;
  const segments=points.map(([x,y,z],i)=>{
    const [a,b,c]=points[(i+1)%points.length];
    const dx=a-x,dy=b-y,dz=c-z,start=length;
    length+=Math.hypot(dx,dy,dz);
    return {x,y,z,dx,dy,dz,start,end:length,yaw:Math.atan2(dx,dz)};
  });
  return {kind:'coaster',parts,phase,speed:3.4,route:{segments,length},roads:[]};
}

function laneLoop(path,offset) {
  const lane=side=>path.map((point,i)=>{
    const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)];
    const angle=Math.atan2(after.z-before.z,after.x-before.x);
    return [point.x-Math.sin(angle)*side,point.z+Math.cos(angle)*side];
  });
  return [...lane(offset),...lane(-offset).reverse()];
}

function sailboat(cargo) {
  const hull=cargo?'#567a8f':'#af695c';
  const keel=[rounded(0,-.11,1.62,3.04,.48,hull,.01),dome(0,.94,1.55,1.83,.38,hull,.06),
    rounded(0,-.09,1.42,2.8,.14,'#e1ceb0',.48)];
  if (cargo) return [...keel,rounded(0,-.81,1.16,1.15,.7,'#e9dabf',.57),
    box(0,-.2,.78,.075,.26,'#90bbcb',.95),rounded(-.22,.64,.6,.99,.48,'#d38d6e',.61),
    tube(.38,-1.09,.18,.18,.61,'#5a6e7d',1.24)];
  return [...keel,tube(0,-.2,.087,.087,2.64,'#ac8d68',.57),
    {shape:'plate',x:0,y:1.6,z:-.18,w:2.15,d:.02,h:2.55,color:'#fff1d2',profile:[[0,1.38],[0,-.97],[-1.04,-.94]]},
    {shape:'plate',x:.12,y:1.38,z:-.1,w:1.12,d:.02,h:1.9,color:'#e3988e',profile:[[0,1.24],[.92,-.72],[0,-.69]]}];
}

function littleDog() {
  return [rounded(0,0,.41,.87,.41,'#bd8860',.27),dome(0,.37,.53,.59,.46,'#cd9b6d',.49),
    rounded(0,.62,.26,.32,.22,'#e5b78b',.5),dome(0,.77,.19,.19,.14,'#5b4c48',.57),
    ...[-1,1].flatMap(side=>[-.24,.24].map(z=>({...tube(side*.14,z,.10,.11,.34,'#8a5e4f'),stride:side*Math.sign(z)}))),
    beam([0,.52,-.34],[.12,.8,-.66],.105,'#bb8058')];
}

function regionBird(moon) {
  if (moon) return [rounded(0,0,.55,.7,.27,'#d4cecf',.02),dome(0,.14,.32,.31,.22,'#a7d6e5',.18),
    ...[-1,1].map(s=>box(s*.55,0,.69,.46,.11,'#617cab',.075))];
  return [rounded(0,0,.36,.66,.19,'#f9ead1',.06),dome(0,.32,.26,.34,.23,'#f5e9d3',.12),
    ...[-1,1].map(s=>dome(s*.38,-.03,.87,.24,.11,'#e8dbca',.13,s*.2)),
    rounded(0,.56,.12,.22,.08,'#e4ad73',.14)];
}

function boatRoute(theme,layout,plot) {
  if (theme==='city') {
    const sample=Array.from({length:10},(_,i)=>plot.z+(i-4.5)*2.2);
    return [...sample.map(z=>[riverAt(layout,z)-.62,z]),...sample.reverse().map(z=>[riverAt(layout,z)+.62,z])];
  }
  const c=Math.cos(plot.yaw),s=Math.sin(plot.yaw);
  return [[-5,6],[-6,13],[5,14],[8,10],[4,6]].map(([x,z])=>[plot.x+x*c+z*s,plot.z+z*c-x*s]);
}

export function regionActors(theme,layout,plan,completed) {
  if (!completed.length&&!plan.circuits?.length) return [];
  const actors=[], moon=theme==='moon';
  const paths=plan.paths.filter(path=>path.length>=4);
  const colors=['#deaa73','#8eb1c6','#d27d84','#e0bb83'];
  const walkers=moon?['astronaut','alien']:['human'];
  for (const plot of completed.filter(plot=>['pier','quay','marina'].includes(plot.kind))) {
    const cargo=plot.kind==='quay';
    actors.push(actor(sailboat(cargo),boatRoute(theme,layout,plot),{kind:'boat',ground:.06,speed:cargo?1.45:1.85,phase:.35,corner:2}));
  }
  const suspension=completed.find(plot=>plot.kind==='bridge');
  if (suspension) {
    const span=suspension.span;
    const path=Array.from({length:9},(_,i)=>({x:suspension.x+(i/8-.5)*(span+8),z:suspension.z}));
    actors.push(actor(vehicle('car','#82a6b8'),laneLoop(path,.38),{
      kind:'road',elevation:(x,z)=>Math.abs(x-suspension.x)<span*.5?suspension.y+.514:roadElevation(layout,x,z),
      speed:2.7,phase:.1,corner:.65,
    }));
  }
  for (let i=0;i<Math.min(paths.length,suspension?3:4,1+Math.floor(completed.length/5));i++) {
    const path=paths[(paths.length-1-i*3+paths.length*3)%paths.length];
    const circuit=plan.circuits?.[i%plan.circuits.length];
    const points=circuit?circuit.map(({x,z})=>[x,z]):laneLoop(path,.32);
    actors.push(actor(vehicle(moon?'rover':theme==='island'?'cart':'car',colors[i]),points,{
      kind:'road',elevation:(x,z)=>roadElevation(layout,x,z),speed:moon?2.3:2.9,phase:i*.23+.12,corner:1.12,
    }));
  }
  for (let i=0;completed.length&&i<Math.min(paths.length,4,1+Math.floor(completed.length/4));i++) {
    const path=paths[(i*3+1)%paths.length];
    const points=laneLoop(path.slice(0,Math.min(path.length,24)),theme==='island'?1:1.29);
    actors.push(actor(walker(walkers[i%walkers.length],colors[(i+1)%4],i%2?'#a97963':'#edb88c'),points,{
      kind:'walk',elevation:(x,z)=>roadElevation(layout,x,z)+.012,speed:.87+i*.092,phase:.13+i*.17,corner:.52,
    }));
  }
  if (completed.length>=2) {
    const {x,z}=completed.at(-1);
    actors.push(actor(regionBird(moon),[[x-11,z-5],[x+2,z-11],[x+11,z-2],[x+4,z+10],[x-8,z+8]],{
      kind:'bird',ground:moon?7.5:6.5,speed:4.25,phase:.2,corner:5,
    }));
  }
  if (!moon&&completed.length>=4&&paths.length) {
    const path=paths[1%paths.length];
    actors.push(actor(littleDog(),laneLoop(path.slice(0,Math.min(path.length,16)),1.2),{
      kind:'walk',elevation:(x,z)=>regionSurface(layout,x,z).water?roadElevation(layout,x,z):regionSurface(layout,x,z).y+.06,
      speed:1.62,phase:.71,corner:.47,
    }));
  }
  return actors.slice(0,MAX_ACTORS);
}
