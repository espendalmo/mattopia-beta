import {box as b,rounded as r,dome as d,tube as t,roof,beam,worldSign,placeParts} from './scenery.js';

const cream='#f3e5c8', stone='#c9bda6', dark='#344451', glass='#68a4ba', ice='#a1dae2';
const brass='#e5bc68', teal='#347e81', rose='#c86173';
const pair=[-1,1];

const base=(w,d,color=stone)=>[
  {...b(0,0,w-.24,d-.24,1.32,color,-1.25),support:true},
  r(0,0,w,d,.27,color,.04),
  b(0,0,w-.3,d-.3,.085,cream,.292),
];

function entrance(z,width=1.55,height=1.72) {
  return [r(0,z,width,.14,height,dark,.36),b(-width*.21,z+.09,.08,.037,height*.7,brass,.46),
    b(width*.21,z+.09,.08,.037,height*.7,brass,.46),r(0,z+.31,width+.62,.72,.125,cream,.225)];
}

function glazing(xs,ys,z,{w=.72,h=.74,color=glass}={}) {
  return ys.flatMap(y=>xs.flatMap(x=>[
    b(x,z,w+.16,.123,h+.14,cream,y-.055),b(x,z+.079,w,.071,h,color,y),
    b(x-w*.26,z+.12,w*.18,.024,h*.78,ice,y+.077),
  ]));
}

function flankWindows(distance,zs,ys,options) {
  return pair.flatMap(side=>placeParts(glazing(zs.map(z=>-z*side),ys,distance,options),
    {x:0,y:0,z:0,yaw:side*Math.PI/2}));
}

function hotelLetters(y,z,color) {
  const strokes=[
    [[0,0,0,1],[1,0,1,1],[0,.5,1,.5]],
    [[0,0,0,1],[1,0,1,1],[0,0,1,0],[0,1,1,1]],
    [[0,1,1,1],[.5,0,.5,1]],
    [[0,0,0,1],[0,0,1,0],[0,.5,.85,.5],[0,1,1,1]],
    [[0,0,0,1],[0,0,1,0]],
  ];
  return strokes.flatMap((letter,i)=>letter.map(([a,b,c,d])=>{
    const x=-.89+i*.37;
    return beam([x+a*.26,y+b*.37,z],[x+c*.26,y+d*.37,z],.055,color);
  }));
}

function shrub(x,z,color='#5f9565',height=.48) {
  return [t(x,z,.79,.75,.22,'#c08467',.35),d(x,z,.96,.86,height,color,.56)];
}

function palm(x,z,height=2.5) {
  return [beam([x,.35,z],[x+.28,height,z],.22,'#a17851'),
    ...Array.from({length:5},(_,i)=>{
      const a=i*Math.PI*2/5;
      return d(x+.28+.51*Math.cos(a),z+.51*Math.sin(a),1.63,.51,.29,i%2?'#7fb66c':'#459265',height-.08,a);
    })];
}

function umbrella(x,z,color=rose) {
  return [t(x,z,.095,.095,1.62,'#8b7265',.35),d(x,z,1.31,1.25,.35,color,1.87),
    t(x,z,.89,.89,.075,cream,1.05),r(x,z+.68,.42,.39,.3,'#ac7651',.34)];
}

function grandHotel(tropical) {
  const walls=tropical?'#e4a479':'#aaa6c0', roofColor=tropical?'#9c5463':'#435c86';
  const podium=tropical?'#d8ad7b':'#b0b6c1';
  const ground=base(10.8,9.4,podium);
  const main=[
    r(0,-1.08,7.76,4.25,1.62,walls,.36),r(0,-1.14,6.1,4.1,3.92,walls,1.92),
    ...pair.map(s=>r(s*3.57,-1.04,1.8,3.87,2.6,tropical?'#d8916c':'#797e9d',1.88)),
    b(0,-1.12,6.48,4.4,.25,cream,5.76),r(0,-1.51,4.92,3.22,1.04,walls,6),
    tropical?roof(0,-1.51,5.45,3.7,.84,roofColor,7.04):d(0,-1.51,5.27,3.52,.97,roofColor,7.02),
  ];
  const details=[
    ...glazing([-2.35,-1.2,0,1.2,2.35],[2.35,3.48,4.62],.92,{w:.66,h:.83}),
    ...[2.31,3.44,4.58].flatMap(y=>[b(0,1.33,6.5,.96,.12,cream,y-.11),
      b(0,1.77,6.42,.09,.095,brass,y+.45),
      ...[-3,-1.53,0,1.53,3].map(x=>b(x,1.77,.085,.08,.54,brass,y-.02))]),
    ...glazing([-3.64,3.64],[2.48,3.57],.93),
    ...glazing([-1.45,0,1.45],[6.16],.12,{w:.82,h:.63}),
    ...flankWindows(3.04,[-2.5,-1.4,-.26],[4.74],{w:.65,h:.69}),
    ...flankWindows(4.49,[-2.21,-.65],[2.46,3.48],{w:.63,h:.72}),
    ...pair.flatMap(s=>[b(s*4.47,-1.04,.21,3.97,.14,cream,4.41),b(s*4.48,-1.04,.17,3.96,.1,brass,3.28)]),
    ...entrance(1.08,1.93,1.42),r(0,1.89,3.15,1.86,.25,roofColor,1.86),
    ...pair.flatMap(s=>[t(s*1.36,2.53,.16,.16,1.6,brass,.3),
      ...(tropical?palm(s*4.32,2.49,2.67):shrub(s*3.64,2.42,'#639079',.73))]),
    ...worldSign('bed',0,6.85,.38,roofColor),
    r(0,2.77,2.22,.16,.61,roofColor,2.03),...hotelLetters(2.17,2.88,'#f6dfa2'),
  ];
  if (tropical) details.push(r(1.23,3.32,5.22,1.85,.21,cream,.35),
    b(1.23,3.32,4.85,1.48,.055,'#54bdcd',.57),
    b(1.8,3.48,3.3,.078,.014,'#a2e3da',.631),
    ...umbrella(-2.42,3.4,'#f2b761'),...umbrella(4.11,3.45,'#ed8f8e'));
  else details.push(...pair.map(s=>b(s*2.97,1.63,1.09,.14,.14,brass,5.66)),t(0,-1.5,.13,.13,1.1,brass,7.8),
    b(.31,-1.5,.62,.072,.29,'#cc6c75',8.51),
    ...pair.flatMap(s=>[r(s*2.86,2.7,1.15,.58,.25,'#c9b7ab',.34),r(s*2.86,2.7,1.02,.45,.31,'#7a9f75',.56),
      b(s*1.39,2.67,.14,.12,.18,'#ffe1a0',1.59)]));
  return [ground,main,details];
}

function civic(bank) {
  const trim=bank?'#bdc0b6':'#e9cca3', walls=bank?'#d6d4c4':'#ce8e70', top=bank?'#527f7a':'#8b4e58';
  const deck=base(bank?9.1:10.4,8.6,bank?'#a1aca8':'#b8ab91');
  const main=[
    r(0,-.78,7.4,4.91,3.03,walls,.34),b(0,-.8,7.7,5.13,.26,trim,3.28),
    roof(0,-.8,7.87,5.25,1.17,top,3.5),r(0,1.51,4.85,2.16,2.35,trim,.35),
    roof(0,1.55,5.27,2.34,1.02,top,2.64),
    ...(bank?[t(0,-.9,3.45,2.69,.54,'#a3b0a6',4.17),d(0,-.9,3.46,2.68,1.38,top,4.68)]
      :[r(0,-1.05,2.48,2.45,2.51,walls,3.55),b(0,-1.05,2.66,2.62,.21,trim,5.88),
        roof(0,-1.05,2.78,2.74,1.57,top,6.05)]),
  ];
  const columnX=bank?[-2.19,-1.42,1.42,2.19]:[-2.18,-1.55,1.55,2.18];
  const details=[
    ...columnX.flatMap(x=>[t(x,2.64,.29,.29,2.17,cream,.36),b(x,2.65,.45,.45,.18,trim,.34),
      b(x,2.65,.45,.45,.15,cream,2.4)]),
    ...entrance(2.64,1.55,1.96),...glazing([-3.05,3.05],[.74,1.89],1.71,{h:.91}),
    ...flankWindows(3.7,[-2.48,-.92,.6],[1.36],{w:.86,h:1.31,color:bank?'#87a9a6':'#75a3ae'}),
    ...pair.flatMap(s=>[b(s*3.71,-.8,.15,4.91,.15,trim,2.86),b(s*3.71,-.8,.15,4.9,.105,trim,.53)]),
    ...[0,1,2].map(i=>b(0,3.07+i*.24,4.67+i*.17,.59,.15,trim,.31-i*.10)),
    ...shrub(-3.73,2.78,'#618b6c'),...shrub(3.73,2.78,'#618b6c'),
  ];
  if (bank) details.push(...worldSign('battery',0,3.17,2.57,'#506b65'),t(0,-.9,.18,.18,.68,brass,5.94),
    t(0,-.9,.48,.48,.12,brass,6.43));
  else details.push(t(0,.207,1.37,.18,1.37,dark,4.66,'z'),t(0,.32,1.12,.08,1.12,cream,4.785,'z'),
    beam([0,5.34,.38],[.01,5.71,.38],.075,dark),beam([0,5.34,.39],[.28,5.23,.39],.075,dark),
    ...pair.flatMap(s=>[t(s*3.2,2.51,.12,.12,3.25,trim,.24),b(s*3.2+.37,2.51,.77,.059,.42,s<0?'#ad5161':'#557d91',3.08)]));
  return [deck,main,details];
}

function cinema() {
  const walls='#82a9a3',accent='#527f8c',light='#e8ba76';
  return [
    base(9.9,8.1,'#b8b4b3'),
    [r(0,-.78,7.97,4.88,3.03,walls,.34),r(0,1.15,5.41,2.08,2.74,'#668b95',.35),
      ...pair.flatMap(s=>[r(s*3.17,1.11,1.51,2.1,3.6,walls,.35),r(s*3.17,1.09,1.2,1.7,.49,accent,3.9)]),
      r(0,-.42,4.2,2.83,.53,accent,3.34),r(0,1.12,2.77,1.75,1.43,accent,3.28)],
    [...entrance(2.21,2.41,1.56),r(0,2.6,5.58,1.4,.27,'#7b4d69',2.03),
      b(0,3.22,5.43,.17,.13,light,2.13),...Array.from({length:12},(_,i)=>d(-2.49+i*.45,3.27,.13,.13,.1,'#fff1a7',2.28)),
      ...glazing([-3.16,3.16],[.81,2.45],2.19,{w:.58,h:1.14,color:'#d29a91'}),
      ...worldSign('music',0,3.98,2.03,'#85516a'),t(-1.41,2.33,.56,.13,.53,light,3.06,'z'),
      t(1.41,2.33,.56,.13,.53,light,3.06,'z')],
  ];
}

function prison() {
  const masonry='#a9a29a', roofColor='#586678';
  return [base(10,9.9,'#b8b8a9'),
    [r(0,-1.76,6.04,3.72,2.59,masonry,.35),roof(0,-1.74,6.46,4.03,1.23,roofColor,2.91),
      ...pair.flatMap(s=>[b(s*4,0,.49,7.5,1.54,masonry,.32),r(s*4,-3.19,1.64,1.61,2.83,masonry,.36),
        roof(s*4,-3.19,1.88,1.86,.72,roofColor,3.12),b(s*2.63,3.67,2.77,.49,1.52,masonry,.32)]),
      b(0,2.92,5.74,1.8,.047,'#9da594',.37)],
    [...[-2.11,-.73,.73,2.11].flatMap(x=>[b(x,.145,.61,.12,1.04,dark,1.13),
      ...[-.18,0,.18].map(dx=>b(x+dx,.225,.06,.076,1.06,cream,1.13))]),
      ...Array.from({length:9},(_,i)=>b(-1.26+i*.315,3.7,.092,.12,1.55,dark,.39)),
      b(0,3.71,2.66,.15,.12,dark,1.92),b(0,3.7,2.7,.12,.085,brass,1.23),
      ...pair.flatMap(s=>[b(s*2.32,1.85,1.13,.35,.27,'#ad8168',.39),t(s*4.1,3.75,.18,.18,2.08,dark,.31),
        r(s*4.1,3.75,.43,.43,.24,brass,2.23)])],
  ];
}

function dining(tropical) {
  const walls=tropical?'#f2b16f':'#d59977',tiles=tropical?'#589688':'#a15e56';
  return [base(10,9.5,tropical?'#e0c79a':'#c6b79a'),
    [r(-.7,-1.65,6.13,3.82,2.34,walls,.34),roof(-.71,-1.65,6.64,4.37,1.46,tiles,2.63),
      r(2.99,-1.2,2.08,3.28,1.81,'#efc9a1',.35),roof(2.99,-1.2,2.35,3.62,.94,tiles,2.13),
      r(.22,1.46,8.37,2.34,.22,'#cc9d6f',.34),r(0,.76,5.86,1.22,.15,'#efdbaa',2.52)],
    [...entrance(.29,1.71,1.62),...glazing([-2.72,-1.48,1.48],[.85],.285,{w:1,h:1.11}),
      ...Array.from({length:9},(_,i)=>b(-2.62+i*.65,.76,.63,1.42,.12,i%2?tiles:cream,2.54)),
      ...umbrella(-2.75,2.57,tropical?'#eda268':'#b56871'),...umbrella(.11,2.96,'#e7b95f'),...umbrella(2.74,2.34,'#70b5a0'),
      ...worldSign('fork',0,3.15,.66,tiles),...shrub(-4.01,1.33),...shrub(4.03,1.18)],
  ];
}

function gardens(tropical,bandstand=false) {
  const grass=tropical?'#83b67b':'#89ae77', pond=tropical?'#50afc2':'#5998b2';
  return [base(10.7,9.8,'#a6b194'),
    [b(0,0,10.36,9.45,.07,grass,.35),t(.58,-.45,4.2,3.4,.13,'#d8d8bd',.42),
      t(.58,-.45,3.77,3,.095,pond,.533),
      ...pair.flatMap(s=>[b(s*3.02,0,.71,8.95,.03,'#e1cba3',.44),b(0,s*3.26,7.8,.63,.03,'#e1cba3',.441)]),
      bandstand?t(-2.24,-2.5,2.64,2.54,.27,stone,.44):t(.57,-.47,.65,.63,.66,cream,.58)],
    [...(bandstand?[d(-2.24,-2.5,2.89,2.74,.66,tropical?'#cb837c':'#879f9a',2.37),
      ...pair.flatMap(s=>pair.map(q=>t(-2.24+s*.81,-2.5+q*.79,.12,.12,1.69,cream,.71)))]
      :[t(.57,-.47,.07,.07,.88,'#d2f0eb',1.13),d(.57,-.47,1.1,1.06,.25,'#8fd4d9',1.87)]),
      ...pair.flatMap(s=>[r(s*1.69,2.41,.92,.4,.23,'#bf8c64',.45),b(s*1.69,2.22,.93,.12,.41,'#bf8c64',.5),
        ...(tropical?palm(s*4.22,-.86+s*1.7,2.65):[t(s*4.16,s*2.7,.28,.28,1.43,'#916c52',.4),d(s*4.16,s*2.7,2.25,1.91,1.67,'#679b69',1.39)])]),
      ...[-1.9,-.8,.8,1.9].flatMap(x=>[d(x,3.94,.7,.64,.27,'#5c9a65',.42),d(x+.1,3.94,.24,.24,.16,'#e29189',.59)])],
  ];
}

function harbor(theme,style) {
  const broad=style==='quay'||style==='marina', length=theme==='island'?8.6:5.85;
  const width=broad?6.8:3.55;
  const deck=broad?'#bdb8aa':'#be956b', rim=broad?'#e4d4b2':'#986e55';
  return [
    [r(0,-1.9,width+.46,2.92,.38,stone,-.27),...pair.flatMap(s=>[-1.04,length*.37,length-2.35].map(z=>t(s*(width*.5-.38),z,.35,.37,.96,'#797b72',-.82)))],
    [b(0,length*.5-2.32,width,length,.19,deck,.025),
      ...Array.from({length:Math.floor(length/.53)},(_,i)=>b(0,-2.15+i*.53,width-.22,.045,.012,rim,.22)),
      ...pair.map(s=>b(s*(width*.5-.16),length*.5-2.32,.18,length,.19,rim,.2)),
      ...(broad?[r(-1.46,-.92,2.55,2.15,1.34,'#d6a27d',.2),roof(-1.46,-.92,2.8,2.34,.68,'#7b8797',1.5)]:[])],
    [...pair.flatMap(s=>[t(s*(width*.5-.37),length-2.73,.35,.35,.46,dark,.22),d(s*(width*.5-.37),length-2.73,.44,.44,.13,brass,.59),
      t(s*(width*.5-.27),.08,.13,.13,1.85,dark,.23),r(s*(width*.5-.27),.08,.47,.38,.26,'#f3dc9e',1.89)]),
      ...worldSign('boat',0,1.12,-1.36,teal),
      ...(broad?[r(2,-.72,1.06,1.02,.57,'#a68161',.2),r(1.42,.45,.88,.76,.46,'#b98b66',.21)]:[])],
  ];
}

function suspension(span=14.6) {
  const towers=span*.275, vermilion='#bd5553', highlight='#e68465', deck='#5c6879';
  const zRails=pair.map(s=>s*1.25);
  return [
    pair.flatMap(s=>[r(s*towers,0,1.57,3.27,.52,'#a99992',-.53),...zRails.map(z=>b(s*towers,z,.64,.62,1.08,vermilion,-.32))]),
    [b(0,0,span,2.78,.36,vermilion,.04),b(0,0,span,2.49,.12,deck,.394),
      ...pair.flatMap(s=>[...zRails.map(z=>r(s*towers,z,.54,.6,5.21,vermilion,.25)),
        ...[2.32,4.27,5.27].map(y=>b(s*towers,0,.56,2.69,.27,highlight,y)),
        ...zRails.map(z=>b(s*towers,z,.73,.76,.32,highlight,5.39))])],
    [...zRails.flatMap(z=>{
      const points=Array.from({length:21},(_,i)=>{
        const x=(i/20-.5)*span;
        const y=Math.abs(x)<towers ? 1.83+3.87*(x/towers)**2 : 5.68-(Math.abs(x)-towers)/(span*.5-towers)*4.75;
        return [x,y,z];
      });
      return [...points.slice(1).map((point,i)=>beam(points[i],point,.15,highlight)),
        ...points.filter((_,i)=>i>0&&i<20&&i%2===1).map(([x,y,z])=>beam([x,.56,z],[x,y,z],.06,'#f0a17f')),
        b(0,z,span,.12,.18,cream,.65)];
    }),
    ...Array.from({length:10},(_,i)=>b((i-4.5)*span/11,0,.52,.085,.018,'#e5d3ae',.516))],
  ];
}

export const WHEEL_HUB=[.44,4.72,-.45];
function ferris(tropical) {
  const wheelColor=tropical?'#e9a25d':'#b4667c', colors=['#dd8d8c','#e6b96b','#71aabd','#8abb83'];
  const hub=WHEEL_HUB;
  const rim=Array.from({length:16},(_,i)=>{
    const a=i*Math.PI/8;
    return [hub[0]+Math.cos(a)*3.29,hub[1]+Math.sin(a)*3.29,hub[2]];
  });
  return [base(10.2,8.6,'#bdb29e'),
    [...pair.flatMap(s=>[beam([s*2.86,.34,-1.78],hub,.25,cream),beam([s*2.86,.34,.84],hub,.25,cream)]),
      ...rim.map((point,i)=>({...beam(point,rim[(i+1)%rim.length],.19,wheelColor),wheel:true})),
      ...rim.filter((_,i)=>i%2===0).map(point=>({...beam(hub,point,.094,'#decfba'),wheel:true})),
      t(hub[0],hub[2]+.065,.83,.39,.83,wheelColor,hub[1]-.41,'z')],
    [...rim.filter((_,i)=>i%2===0).flatMap(([x,y,z],i)=>[b(x,z,.078,.08,.46,cream,y-.45),
      r(x,z,.84,.67,.42,colors[i%4],y-.73),b(x,z+.356,.66,.06,.17,ice,y-.6),
      d(x,z,.94,.77,.27,colors[i%4],y-.32)].map(part=>({...part,wheel:true,hinge:[x,y]}))),
      r(-3.33,2.29,1.77,1.59,1.27,'#e1ab86',.35),roof(-3.33,2.29,2.04,1.87,.66,rose,1.57),
      ...worldSign('flag',-3.34,1.22,3.19,'#9b617d'),...shrub(3.59,2.5),...umbrella(2.37,2.56,'#e6bb72')],
  ];
}

const COASTER_POSTS=[[-3,.73,2.4],[-3.7,2.1,.05],[-2.65,4.2,-2.52],[-.1,4.82,-3.03],
  [2.9,3.3,-2.23],[3.89,1.82,-.14],[2.48,1.07,2.43],[-.4,1.17,3.01]];
export const COASTER_TRACK=COASTER_POSTS.flatMap((point,i)=>{
  const previous=COASTER_POSTS.at(i-1),next=COASTER_POSTS[(i+1)%COASTER_POSTS.length];
  return [point.map((v,j)=>.22*previous[j]+.78*v),
    point.map((v,j)=>.065*previous[j]+.87*v+.065*next[j]),
    point.map((v,j)=>.78*v+.22*next[j])];
});
function coaster() {
  const rail=(point,i,side)=>{
    const before=COASTER_TRACK.at(i-1),after=COASTER_TRACK[(i+1)%COASTER_TRACK.length];
    const yaw=Math.atan2(after[0]-before[0],after[2]-before[2]);
    return [point[0]+side*.27*Math.cos(yaw),point[1],point[2]-side*.27*Math.sin(yaw)];
  };
  return [base(10.9,10,'#d9ba87'),
    [...COASTER_POSTS.flatMap(([x,y,z])=>[t(x,z,.16,.16,y-.27,'#698a95',.31),b(x,z,.6,.55,.15,'#98a0a0',.32)]),
      ...pair.flatMap(side=>COASTER_TRACK.map((point,i)=>{
        const next=(i+1)%COASTER_TRACK.length;
        return beam(rail(point,i,side),rail(COASTER_TRACK[next],next,side),.115,'#d37766');
      }))],
    [...COASTER_TRACK.map((point,i)=>beam(rail(point,i,-1),rail(point,i,1),.074,cream)),
      r(-1.79,2.12,1.4,1.77,1.24,'#edb186',.34),roof(-1.79,2.12,1.67,1.99,.67,'#699681',1.51),
      ...glazing([-1.8],[.81],3.01,{w:.71,h:.46}),b(-1.79,3.12,1.04,.36,.095,'#bd9770',.78),
      r(.74,.18,2.81,2.4,.065,'#a9bd82',.38),
      ...[.4,1.49,2.58,3.67].flatMap(x=>[t(x,3.63,.095,.095,.76,'#b18062',.34),d(x,3.63,.19,.19,.12,brass,1.08)]),
      b(2.04,3.63,3.33,.09,.10,'#d4a179',.89),
      ...palm(3.48,3.49,2.18),...palm(-4.34,-.79,2.19),...umbrella(1.03,-.28,'#e6bd75')],
  ];
}

function fitness() {
  return [base(9.75,8.25,'#e4c799'),
    [r(0,-1.3,6.88,4.02,2.49,'#c4d8bd',.35),r(0,-1.27,7.4,4.31,.26,'#607f7d',2.78),
      r(0,-1.44,5.72,3.39,.64,'#a7bdb0',3.02),b(0,1.92,8.22,2.51,.08,'#a5ac91',.354)],
    [...entrance(.75,1.66,1.78),...glazing([-2.45,2.45],[.71],.768,{w:1.49,h:1.65,color:'#79b9b3'}),
      ...pair.flatMap(s=>[b(s*2.05,2.23,1.61,.82,.16,'#6b8289',.45),
        beam([s*2.68,.62,1.9],[s*2.68,1.62,1.9],.118,dark),
        beam([s*2.68,1.62,1.9],[s*2.01,1.62,2.5],.094,dark),
        ...palm(s*4.18,.81,2.31)]),
      ...worldSign('ball',0,2.65,.97,teal)],
  ];
}

function beachClub() {
  return [base(10.7,9.1,'#d7bf91'),
    [r(0,-1.88,7.8,3.65,.23,'#d0a673',.35),roof(0,-1.89,8.1,3.9,1.17,'#588f84',2.45),
      ...[-3.6,-1.2,1.2,3.6].flatMap(x=>pair.map(side=>t(x,-1.88+side*1.57,.18,.18,2.1,'#ab7852',.39))),
      r(1.83,2.13,4.68,2.57,.18,cream,.35),r(1.83,2.13,4.37,2.31,.085,'#6cbfc6',.532)],
    [r(0,-2.83,5.93,.59,.91,'#b78767',.57),b(0,-2.52,6.02,.15,.099,cream,1.44),
      ...[-2.2,-1.1,0,1.1,2.2].map(x=>t(x,-2.1,.38,.39,.61,'#98bc9e',.58)),
      ...palm(-4.36,1.48,2.56),...umbrella(-2.74,2.56,'#e69f75'),...umbrella(-1.08,1.43,'#d6909e'),
      ...worldSign('music',0,2.76,.21,'#5c9083')],
  ];
}

function sunsetHotel() {
  const coral='#cf8f79',tile='#578d8e';
  return [base(10.7,9.5,'#d4b890'),
    [r(0,-2.14,8.64,3.64,3.51,coral,.34),r(0,-2.16,8.9,3.93,.28,cream,3.78),
      r(0,-2.27,6.4,3.05,1.36,'#dbab91',4.04),roof(0,-2.26,6.85,3.44,.73,tile,5.37),
      ...pair.map(s=>r(s*3.14,.99,2.44,4.35,2.36,coral,.36)),
      r(0,.53,3.88,3.88,.24,'#f4e1b6',.35),r(0,.56,3.54,3.41,.069,'#62c2c7',.595)],
    [...glazing([-3.1,-1.6,0,1.6,3.1],[.91,2.2,3.17],-.27,{w:.8,h:.63}),
      ...glazing([-2.2,-.72,.72,2.2],[4.4],-.71,{w:.83,h:.66}),
      ...pair.flatMap(s=>[...glazing([s*3.15],[.75,1.86],3.2,{w:1.35,h:.56}),
        b(s*3.15,3.28,2.51,.32,.19,cream,2.45),
        ...palm(s*4.15,3.79,2.31)]),
      ...umbrella(-1.31,3.13,'#f0bc73'),...umbrella(1.11,3.13,'#dc8f85'),
      ...worldSign('bed',0,5.53,-.64,tile)],
  ];
}

function biodome() {
  const tealGlass='#64b7ae';
  const ribs=Array.from({length:11},(_,i)=>[-3.6+i*.72,.63+3.13*Math.sqrt(Math.max(0,1-((-3.6+i*.72)/3.64)**2)),.63]);
  return [base(10.45,9.35,'#b7bbcf'),
    [t(0,-.86,7.76,6.35,.42,'#c1d2ca',.34),d(0,-.86,7.62,6.23,3.35,tealGlass,.7),
      r(0,2.36,2.82,2.82,1.78,'#92b5b3',.35),d(0,2.4,2.86,2.76,.67,'#b0d8ce',2.11),
      ...ribs.slice(1).map((to,i)=>beam(ribs[i],to,.095,'#b8e0d0'))],
    [...entrance(3.81,1.55,1.37),...[-2.56,-1.36,1.36,2.56].flatMap(x=>[
      r(x,2.06,1.02,.67,.29,'#4c747c',.34),d(x-.17,2.06,.68,.59,.75,'#83c36f',.58),d(x+.22,2.04,.53,.53,.56,'#a7d67b',.56),
      t(x,.54,.09,.09,1.22,'#cae9d8',.78),
    ]),
    ...worldSign('leaf',0,2.55,3.57,'#427e7d'),...pair.map(s=>t(s*3.81,-.64,.19,.19,1.68,'#d5e8e2',.39))],
  ];
}

function habitat(hotel=false) {
  const skins=hotel?['#a5c5d9','#d4c6e1','#bcb8d3']:['#86acc6','#b9b7d4','#acc9d3'];
  const pods=[[-2.43,-.73,2.45],[2.32,-.61,2.82],[0,1.62,2.31]];
  return [base(10.5,9.23,'#aeb1cc'),
    [...pods.flatMap(([x,z,w],i)=>[t(x,z,w+.28,w+.18,.83,'#e7e1e1',.35),d(x,z,w,w-.12,hotel?2.1:1.49,skins[i],1.13)]),
      tubeLink(-1.26,.51,2.37,'#c4c9dc'),tubeLink(1.12,.51,2.45,'#aebfd4'),
      ...(hotel?[d(0,-2.72,3.45,2.29,2.48,'#9f90ba',.44)]:[])],
    [...pods.flatMap(([x,z,w])=>[r(x,z+w*.43,w*.7,.23,.52,'#47677f',.83),
      ...[-.46,0,.46].map(dx=>b(x+dx,z+w*.43+.13,.28,.064,.32,ice,.94))]),
      ...entrance(2.8,1.18,1.06),...worldSign(hotel?'bed':'home',0,2.37,2.38,'#5b7198'),
      ...pair.flatMap(s=>[t(s*3.82,1.84,.11,.11,2.41,'#bcc4d8',.38),
        d(s*3.82,1.84,.48,.45,.23,'#f3d193',2.61)])],
  ];
}
function tubeLink(x,z,length,color) { return t(x,z,1.2,length,1.18,color,.44,'z'); }

function utility(kind) {
  const oxygen=kind==='oxygen', main=oxygen?'#9dc7ca':kind==='refinery'?'#b99ab0':'#9ca9cf';
  const accent=oxygen?'#5b99aa':kind==='refinery'?'#936783':'#716e9c';
  return [base(9.9,8.78,'#b2b1c7'),
    [r(-1.63,-.67,4.15,3.45,2.08,main,.36),d(-1.62,-.68,4.35,3.63,1.02,accent,2.39),
      ...[-.18,1.67].flatMap(z=>[t(2.32,z,2.01,1.62,2.49,main,.35),d(2.32,z,2.02,1.63,.71,accent,2.8),
        t(2.32,z,2.07,1.67,.17,cream,1.26)]),
      ...pair.map(s=>t(-1.5+s*.73,-1.45,.38,.38,2.37,cream,2.56))],
    [...glazing([-2.78,-1.63,-.49],[.82,1.68],1.1,{w:.64,h:.51}),
      ...[-.18,1.67].map(z=>beam([.33,1.68,z],[2.25,1.68,z],.23,'#5bc8c0')),
      ...pair.map(s=>beam([-1.5+s*.73,4.7,-1.44],[-1.5+s*.73,4.99,-1.44],.47,brass)),
      ...worldSign(oxygen?'drop':kind==='refinery'?'gear':'battery',-1.64,2.51,1.34,accent),
      ...[-3,-1.5,0].map(x=>r(x,2.42,1.1,.81,.63,'#b5a3c8',.36))],
  ];
}

function generator() {
  return [base(10.4,9.3,'#a6abc6'),
    [r(-2.23,-1.45,4.22,3.49,2.3,'#a4a4c7',.34),roof(-2.23,-1.46,4.6,3.79,.83,'#676994',2.57),
      t(1.79,.1,3.82,3.82,.51,'#9ca6c1',.34),t(1.79,.1,2.35,2.35,2.63,'#909ec2',.84),
      ...[1.17,1.72,2.29,2.85].map(y=>t(1.79,.1,2.73,2.73,.24,'#e2c48a',y)),
      d(1.79,.1,2.4,2.4,.77,'#8599bc',3.41),
      ...[-3.18,-1.49].map(x=>b(x,2.16,1.48,2.59,.23,'#5f7da6',.67))],
    [...[-3.18,-1.49].flatMap(x=>[-.75,0,.75].map(z=>b(x,2.16+z,1.39,.05,.032,ice,.908))),
      ...[-2.7,2.6].map(z=>beam([1.79,1.28,.12],[1.79,.76,z],.23,'#78b9c3')),
      ...glazing([-2.98,-1.52],[1.08],.32,{color:'#92b7d1'}),
      ...worldSign('battery',-2.23,2.58,.49,'#7374a0')],
  ];
}

function craterLab() {
  return [base(10.25,9.32,'#a7b2c7'),
    [r(-1.37,-.89,5.93,4.56,1.72,'#bdc9d2',.34),r(-1.37,-.92,5.72,4.36,.36,'#778da8',2.01),
      d(2.92,-.77,2.67,2.8,1.91,'#b2a4c5',.34),t(2.92,-.76,2.59,2.67,.24,'#9dadd0',.36),
      r(0,2.45,7.2,2.4,.19,'#8e9aaf',.32),t(-2.86,-1.91,.18,.18,2.8,'#bacadb',2.18)],
    [...glazing([-3.35,-1.37,.61],[.9],1.43,{w:.93,h:.66}),...worldSign('flask',-1.33,2.19,1.61,'#8c7fa1'),
      ...[-2.18,0,2.1].flatMap((x,i)=>[r(x,2.45,1.34,1.21,.28,'#b5aab6',.52),
        d(x,2.45,.76,.64,.43,['#d6b39c','#b6adc8','#989db8'][i],.76,i*.45)]),
      d(-2.86,-1.91,.94,.79,.27,'#dfca9b',4.87),...entrance(1.49,1.34,1.37)],
  ];
}

function supplyDepot() {
  return [base(10.63,9.28,'#a7abc4'),
    [t(0,-1.16,6.9,5.27,.28,'#aab7ca',.34),d(0,-1.16,6.91,5.38,2.89,'#87a3bf',.59),
      r(0,.72,4.13,2.05,1.85,'#b7bccd',.34),
      ...pair.map(side=>r(side*3.58,1.28,1.12,2.52,.69,'#7f8fac',.34))],
    [...entrance(1.82,3.12,1.42),...worldSign('crate',0,2.66,1.83,'#7b799b'),
      ...[-2.89,-1.69,1.69,2.89].flatMap((x,i)=>[r(x,2.73,1.02,.91,.61,i%2?'#b7a9c8':'#cdad8a',.35),
        b(x,2.73,1.07,.94,.082,cream,.91)]),
      ...pair.map(side=>d(side*3.57,2.48,.46,.46,.25,'#e6bc78',1.03))],
  ];
}

function spaceField() {
  return [base(10.58,9.46,'#b5b3cf'),
    [b(0,0,8.86,7.78,.11,'#579f94',.34),t(0,0,2.27,2.27,.022,cream,.459),
      t(0,0,2.08,2.08,.022,'#579f94',.485),b(0,0,.075,7.44,.025,cream,.501),
      ...pair.flatMap(s=>[b(0,s*3.68,8.51,.085,.024,cream,.473),b(s*4.24,0,.085,7.4,.023,cream,.471),
        b(s*3.48,0,1.26,.085,.021,cream,.493)])],
    [...pair.flatMap(s=>[...pair.map(q=>t(s*4.37,q*3.88,.15,.15,2.73,'#6e769b',.35)),
      ...pair.map(q=>r(s*4.37,q*3.88,.58,.39,.23,'#f5d595',2.89)),
      ...pair.map(q=>b(s*4.21,q*1.13,.11,.11,.96,cream,.46)),
      b(s*4.21,0,.12,2.37,.1,cream,1.35)]),
      ...worldSign('ball',0,1.33,4.2,'#587990')],
  ];
}

function rocketPort() {
  return [base(10.3,9.77,'#a5acc6'),
    [t(-.63,-.29,6.1,6.05,.27,'#7789a7',.36),t(-.63,-.29,2.16,2.15,5.24,'#e5e0dd',.62),
      t(-.63,-.29,2.25,2.23,.35,rose,2.25),d(-.63,-.29,2.16,2.15,1.46,rose,5.81),
      ...pair.map(s=>roof(-.63+s*1.05,-.34,1.46,.67,2.02,'#a66682',.7)),
      ...pair.map(s=>beam([2.34,.41,-.38+s*.73],[2.34,6.79,-.38+s*.73],.23,'#a1b5ca')),
      ...[1.15,2.36,3.58,4.82,6.42].map(y=>b(2.34,-.39,.66,1.76,.12,brass,y))],
    [b(.66,-.34,2.52,.63,.11,'#d6be83',4.41),t(-.63,.8,.86,.12,.82,dark,3.59,'z'),
      t(-.63,.89,.64,.07,.63,ice,3.68,'z'),
      ...[0,1,2,3,4].map(i=>beam([2.33,.7+i*1.19,-1.1],[2.33,1.87+i*1.19,.32],.098,'#b3c8de')),
      ...worldSign('rocket',-3.29,1.15,2.7,'#81638e'),
      ...pair.map(s=>d(s*3.63,3.03,.47,.47,.21,'#efca87',.44))],
  ];
}

function telescope() {
  return [base(9.82,8.92,'#b8b6ca'),
    [t(0,-.69,5.84,5.24,.38,'#97a9bb',.34),r(0,-.68,3.83,3.38,1.9,'#bcc5d4',.67),
      t(0,-.69,1.71,1.7,2.33,'#8090aa',1.4),d(0,-.68,6.12,5.89,1.46,'#d0ccd8',3.49),
      t(0,-.54,5.65,5.41,.14,'#8195b8',3.52)],
    [beam([0,4.03,-.68],[.02,6.03,-.67],.19,'#cba96f'),d(.02,-.67,.55,.55,.27,brass,5.92),
      ...pair.flatMap(s=>[beam([s*1.52,4.16,-.67],[.02,5.8,-.67],.091,cream),
        beam([0,4.17,-.67+s*1.59],[.02,5.8,-.67],.091,cream)]),
      ...entrance(1.03,1.25,1.13),...worldSign('radio',0,2.37,1.24,'#637798'),
      ...pair.map(s=>r(s*3.57,2.58,1.1,.94,.83,'#a1aec6',.36))],
  ];
}

const art={
  hotel:()=>grandHotel(false),resort:()=>grandHotel(true),hall:()=>civic(false),bank:()=>civic(true),cinema,prison,
  restaurant:theme=>dining(theme==='island'),garden:theme=>gardens(theme==='island'),bandstand:theme=>gardens(theme==='island',true),
  pier:(theme)=>harbor(theme,'pier'),quay:theme=>harbor(theme,'quay'),marina:theme=>harbor(theme,'marina'),
  bridge:(_,site)=>suspension(site?.span),wheel:theme=>ferris(theme==='island'),coaster,fitness,biodome,
  habitat:()=>habitat(),moonHotel:()=>habitat(true),oxygen:()=>utility('oxygen'),generator,
  refinery:()=>utility('refinery'),spaceField,rocketPort,telescope,craterLab,supplyDepot,beachClub,sunsetHotel,
};

export const NEW_LANDMARKS={
  city:{
    5:['Grand Hotel','Suiter, balkonger og en gyllen inngang.','hotel'],
    7:['Fonteneparken','Stier og benker rundt en fontene.','garden'],
    13:['Restauranten','Bord ute under stripete markiser.','restaurant'],
    15:['Elveparken','En musikkpaviljong ved en liten dam.','bandstand'],
    16:['Rådhuset','Klokketårn, flagg og en bred trapp.','hall'],
    17:['Banken','En staselig bank med søyler og kuppel.','bank'],
    18:['Kinoen','Lysende skilt og store glassdører.','cinema'],
    19:['Fengselet','Murer, luftegård og to vakttårn.','prison'],
    20:['Elvebrygga','En trebrygge der en seilbåt kan legge til.','pier'],
    21:['Havnekaia','Kaikant, lagerhus og en liten fraktebåt.','quay'],
    22:['Rødspennbroa','En rød hengebro med høye tårn over elva.','bridge'],
    23:['Tivoliet','Et stort pariserhjul med fargerike vogner.','wheel'],
  },
  moon:{
    0:['Rakettbasen','En rakett med serviceplattform og signalmerker.','rocketPort'],
    1:['Måneboligene','Tre boligkupler med tunneler imellom.','habitat'],
    4:['Biodomen','En grønn kuppel med planter og vekstlys.','biodome'],
    7:['Observatoriet','En stor skål som lytter ut i rommet.','telescope'],
    16:['Oksygenfabrikken','Lyse rør og tanker med oksygen.','oxygen'],
    17:['Kraftverket','En generator som gir strøm til basen.','generator'],
    18:['Astronautbanen','Fotballmål og flomlys på månen.','spaceField'],
    19:['Månehotellet','Store vinduer med utsikt mot jorda.','moonHotel'],
    20:['Kraterlaboratoriet','Instrumenter for å studere månestein.','craterLab'],
    21:['Mineralraffineriet','Sorterer og lagrer stein fra kratrene.','refinery'],
    22:['Forsyningskuppelen','En stor port og et lager for romdrakter og utstyr.','supplyDepot'],
    23:['Romstasjonen','En høy rakett klar for neste oppdrag.','rocketPort'],
  },
  island:{
    0:['Palmeresorten','Et stort hotell med balkonger, basseng og palmer.','resort'],
    4:['Strandrestauranten','Bord under parasoller og middag ved stranden.','restaurant'],
    5:['Palmeparken','En sti som slynger seg rundt en liten lagune.','garden'],
    7:['Strandbrygga','En brygge for seilbåter ute i bukta.','pier'],
    13:['Hengekøyehagen','Palmer, en liten dam og skygge i paviljongen.','bandstand'],
    16:['Treningssenteret','Store vinduer og en terrasse med treningsutstyr.','fitness'],
    17:['Marinaen','En kai med havnebod og en båt som seiler forbi.','marina'],
    18:['Strandtivoliet','Et pariserhjul med utsikt over havet.','wheel'],
    19:['Fornøyelsesparken','En berg-og-dal-bane mellom palmer og boder.','coaster'],
    20:['Havterrassen','Et sted å spise med utsikt over bukta.','restaurant'],
    21:['Laguneparken','Fargerike planter og en paviljong ved vannet.','bandstand'],
    22:['Ferieklubben','En åpen paviljong med palmer og et lite basseng.','beachClub'],
    23:['Solhotellet','Et hotell med fløyer rundt et basseng.','sunsetHotel'],
  },
};

export const landmarkStages=(theme,style,site)=>art[style]?.(theme,site);
