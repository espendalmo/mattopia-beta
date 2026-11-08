const box = (x,z,w,d,h,color,y=0,studs=0) => ({shape:'box',x,z,w,d,h,color,y,studs});
const tube = (x,z,w,d,h,color,y=0) => ({shape:'tube',x,z,w,d,h,color,y});
const roof = (x,z,w,d,h,color,y) => ({shape:'roof',x,z,w,d,h,color,y});
const stage = (label, ...parts) => ({label,parts:parts.flat()});

export const PROJECTS = {
  armor:{name:'Rustningshelten', icon:'⚡', description:'En rød og gyllen helt med lys i brystet.', total:24},
  spider:{name:'Edderkopphelten', icon:'🕷️', description:'En rød og blå helt med store maskeøyne.', total:24},
  shield:{name:'Skjoldhelten', icon:'🛡️', description:'En blå helt med stjerne og klosseskjold.', total:24},
  city:{name:'Elvebyen', icon:'🏙️', description:'En by med elv, broer, skole, mølle og fotballbane.', total:120},
  moon:{name:'Månebasen', icon:'🌙', description:'En base med raketter, kupler, rovere og solcellefelt.', total:120},
  island:{name:'Palmeøya', icon:'🌴', description:'Et feriested med strand, hotell, iskrembar og dansegulv.', total:120},
};

export function projectById(id) {
  return Object.hasOwn(PROJECTS,id) ? PROJECTS[id] : null;
}

export function restoreProjects(raw, total) {
  return Object.fromEntries(Object.keys(PROJECTS).map(id => {
    const saved = raw?.[id];
    return [id,Number.isSafeInteger(saved) && saved>0 ? Math.min(saved,total,PROJECTS[id].total) : 0];
  }));
}

const HERO_PALETTES = {
  armor:{main:'#bd3749', light:'#ecaf4c', dark:'#783047', trim:'#6fe1f2', ground:'#67859e', rim:'#325169'},
  spider:{main:'#c64251', light:'#e65b60', dark:'#315d99', trim:'#f6f6ea', ground:'#7776ad', rim:'#4e4d7b'},
  shield:{main:'#356bac', light:'#568ad0', dark:'#263c6c', trim:'#f6f3dc', ground:'#779d9d', rim:'#456f79'},
};

function heroScene(id) {
  const {main,light,dark,trim,ground,rim} = HERO_PALETTES[id];
  const foot = x => box(x,.54,2.75,3.4,1.15,main,.36,2);
  const leg = (x,y,color) => box(x,0,2.1,2.2,1.55,color,y,2);
  const arm = (x,y,color,w=1.55) => box(x,0,w,2.05,1.45,color,y,1);
  const emblem = id==='armor' ? [tube(0,1.54,1.55,.7,.64,trim,10.31),box(0,1.49,2.32,.34,1.16,dark,10.04)]
    : id==='spider' ? [box(0,1.51,.42,.2,1.28,dark,10.13),box(0,1.51,1.53,.22,.22,dark,10.33),box(0,1.51,1.9,.22,.22,dark,10.82)]
    : [box(0,1.5,.36,.25,1.42,trim,10.09),box(0,1.5,1.52,.25,.36,trim,10.6),box(0,1.51,.76,.27,.75,trim,10.43)];
  const finalPart = id==='shield'
    ? [box(-4.7,1.2,3.25,.37,3.4,'#c34e57',7.4),box(-4.7,1.45,2.47,.26,2.63,trim,7.79),box(-4.7,1.65,1.59,.2,1.74,main,8.25),box(-4.7,1.79,.74,.18,.8,trim,8.72)]
    : id==='armor'
      ? [box(0,-1.56,4.6,.95,3.1,dark,8.52,3),box(-1.32,-1.85,1.2,1.2,2.8,light,8.73,1),box(1.32,-1.85,1.2,1.2,2.8,light,8.73,1),box(-1.32,-1.85,.8,1.05,.33,trim,8.4),box(1.32,-1.85,.8,1.05,.33,trim,8.4)]
      : [box(0,-1.36,1.5,.28,1.34,light,9.76),box(0,-1.48,2.78,.22,.25,light,10.35),box(0,-1.51,2.09,.19,.22,light,10.9)];
  const steps = [
    stage('Venstre støvel',foot(-1.52)),
    stage('Høyre støvel',foot(1.52)),
    stage('Venstre legg',leg(-1.52,1.51,dark)),
    stage('Høyre legg',leg(1.52,1.51,dark)),
    stage('Venstre kneplate',leg(-1.52,3.06,main),box(-1.52,1.16,1.35,.45,.75,light,3.35)),
    stage('Høyre kneplate',leg(1.52,3.06,main),box(1.52,1.16,1.35,.45,.75,light,3.35)),
    stage('Venstre lår',leg(-1.52,4.61,id==='armor'?light:dark)),
    stage('Høyre lår',leg(1.52,4.61,id==='armor'?light:dark)),
    stage('Hoftene',box(0,0,5.34,2.4,1.31,dark,6.16,4)),
    stage('Beltet',box(0,0,5.55,2.56,.55,id==='shield'?'#be4755':main,7.47,4),box(0,1.35,1.21,.29,.43,light,7.54)),
    stage('Nedre del av drakten',box(0,0,5.63,2.53,1.43,main,8.02,4)),
    stage('Brystplaten',box(0,0,6.48,2.92,2.25,main,9.45,4),box(0,.01,5.65,2.6,.53,light,11.7,3)),
    stage('Merket på brystet',emblem),
    stage('Venstre skulder',box(-3.83,0,1.76,2.63,1.35,light,10.74,2)),
    stage('Høyre skulder',box(3.83,0,1.76,2.63,1.35,light,10.74,2)),
    stage('Venstre overarm',arm(-4.06,9.29,dark)),
    stage('Høyre overarm',arm(4.06,9.29,dark)),
    stage('Venstre hanske',arm(-4.06,7.84,main,1.82),box(-4.06,.18,1.67,1.98,.62,light,7.22)),
    stage('Høyre hanske',arm(4.06,7.84,main,1.82),box(4.06,.18,1.67,1.98,.62,light,7.22)),
    stage('Kragen',box(0,0,3.04,2.3,.74,dark,12.23,2)),
    stage('Hjelmen',box(0,0,4.22,3.36,2.74,main,12.97,3),box(0,0,3.4,2.86,.6,main,15.71,3)),
    stage('Masken',box(0,1.68,3.7,.46,1.92,id==='armor'?light:main,13.34),box(0,1.75,2.81,.48,.49,id==='armor'?light:main,12.99)),
    stage('Øynene på masken',box(-.92,1.97,1.18,.24,id==='spider'?.74:.35,trim,14.47),box(.92,1.97,1.18,.24,id==='spider'?.74:.35,trim,14.47),...(id==='spider'?[]:[box(0,1.94,1.54,.18,.13,dark,13.73)])),
    stage(id==='armor'?'Rakettpakken':id==='spider'?'Edderkoppmerket på ryggen':'Det store skjoldet',finalPart),
  ];
  return {
    base:[box(0,0,12.7,8.25,.31,rim,-.54),box(0,0,12.3,7.85,.59,ground,-.23,6),box(0,3.93,5,.41,.28,light,-.11)],
    steps, background:'#e7eef3', yaw:-.46, pitch:.25, world:false,
  };
}

const THEMES = {
  city:{grass:'#85ac75', edge:'#65845d', road:'#657888', white:'#f3eddd', foundation:'#b9bea9', leaves:'#4e986b', dark:'#405768', sky:'#e6f1ea'},
  moon:{grass:'#9a98a9', edge:'#5f657e', road:'#6d718c', white:'#ece9f3', foundation:'#c4c3ce', leaves:'#59b4aa', dark:'#404565', sky:'#e8e7f3'},
  island:{grass:'#8cc078', edge:'#c0a477', road:'#c6a57b', white:'#fff2ce', foundation:'#e2d0a2', leaves:'#409567', dark:'#405e66', sky:'#def1ec'},
};

const PLACES = {
  city:[
    ['Bakeriet','house','#edba66','#bd635a'],['Skolen','school','#e2a36e','#8f625c'],['Mølla','mill','#e5c27c','#b47b52'],['Fotballbanen','field','#58a067'],
    ['Biblioteket','school','#e9c58e','#648eae'],['Hotellet','tower','#94abc8','#596f9b'],['Kirka','church','#e9e4d3','#718491'],['Parken','park','#85ac75'],
    ['Butikken','house','#82b0a5','#5c7fa1'],['Brannstasjonen','school','#d4796d','#774b59'],['Torget','square','#cfbd9c'],['Svømmehallen','pool','#73bed4'],
    ['Verkstedet','house','#9eb59a','#676c86'],['Kafeen','house','#e7a295','#ad6365'],['Kulturhuset','tower','#99a6c9','#646a91'],['Elveparken','park','#85ac75'],
  ],
  moon:[
    ['Landingsplassen','launch','#c5bfd6','#7e83b3'],['Beboelsesmodulen','dome','#e6e1e8','#7697be'],['Solcellefeltet','solar','#6578b6'],['Rovergarasjen','hangar','#c5d0df','#7494b1'],
    ['Drivhuset','dome','#9dd6b9','#60aaac'],['Vannstasjonen','tank','#7db8cd','#50628b'],['Laboratoriet','hangar','#d1cbdc','#9b87ba'],['Observatoriet','dome','#c8b0d3','#77639c'],
    ['Radiostasjonen','tower','#bab9d8','#53618d'],['Verkstedet','hangar','#b9b6cc','#7a6ca1'],['Batteriparken','solar','#6c85c4'],['Forskningsfeltet','park','#a6a3ba'],
    ['Lasteterminalen','hangar','#b8c5db','#637d9e'],['Islageret','tank','#99cadd','#5b99b4'],['Satellittplassen','tower','#cbbddb','#6a5d90'],['Den andre landingsplassen','launch','#c8b7ce','#796f9a'],
  ],
  island:[
    ['Strandhotellet','tower','#f5cd86','#dd986b'],['Iskrembaren','house','#f0a8b1','#cf6d9c'],['Badebukta','pool','#63bdce'],['Surfeskolen','house','#83c6c8','#52a6ac'],
    ['Restauranten','school','#f3b576','#da846c'],['Palmeparken','park','#98c284'],['Dansegulvet','dance','#b493cf'],['Moloen','dock','#c9a17b'],
    ['Kveldsmarkedet','square','#ecc695'],['Badehotellet','tower','#f0d497','#649fa9'],['Strandkafeen','house','#ddac9b','#ab6d85'],['Spaet','pool','#79c6d4'],
    ['Utsiktstårnet','tower','#ddd2a6','#c38770'],['Hengekøyehagen','park','#98c284'],['Fruktboden','house','#f1ac7c','#ca7768'],['Feriestedets torg','square','#e7c49c'],
  ],
};

function tree(x,z,theme) {
  const trunk = box(x,z,.45,.48,1.85,'#9f7961');
  return theme==='island'
    ? [trunk,box(x,z,2.52,.72,.32,'#489c62',1.82),box(x,z,.74,2.34,.31,'#73b870',1.92),box(x+.19,z-.12,1.13,1.14,.53,'#8abf75',2.08)]
    : [trunk,tube(x,z,1.7,1.64,1.2,THEMES[theme].leaves,1.11),tube(x,z,1.15,1.05,.73,'#86b68a',2.31)];
}

function beacon(x,z,color) {
  return [box(x,z,.23,.23,1.35,'#62728a'),box(x,z,.55,.49,.27,color,1.33)];
}

function landscape(x,z,w,d,y,color,phase=0) {
  const outline=Array.from({length:40},(_,i)=>{
    const a=-i*Math.PI/20;
    const radius=1+.07*Math.sin(a*3+phase)+.043*Math.cos(a*5+phase);
    return [x+Math.cos(a)*w*radius/2,y,z+Math.sin(a)*d*radius/2];
  });
  return {shape:'landscape',outline,x,y,z,w,d,h:0,color};
}

function mixColor(from,to,amount) {
  const channels=color=>color.slice(1).match(/../g).map(value=>parseInt(value,16));
  const target=channels(to);
  return '#'+channels(from).map((value,i)=>Math.round(value+(target[i]-value)*amount).toString(16).padStart(2,'0')).join('');
}

function landscapeEdge(color,sky) {
  return Array.from({length:25},(_,i)=>landscape(0,0,146-i*2.7,132-i*2.45,-.62+i*.0175,
    mixColor(sky,color,(i/24)**1.7)));
}

function river(ground,sky) {
  const bend=z=>.82*Math.sin(z*.095);
  return Array.from({length:40},(_,i)=>{
    const z=-60+i*3, next=z+3;
    const color=mixColor('#5caac3',mixColor(ground,sky,.48),Math.max(0,(Math.abs(z+1.5)-32)/26));
    return {shape:'landscape',x:bend(z+1.5),y:.027,z:z+1.5,h:0,color,
      outline:[[bend(z)-3.7,.027,z],[bend(next)-3.7,.027,next],
        [bend(next)+3.7,.027,next],[bend(z)+3.7,.027,z]]};
  });
}

function groundTexture(theme) {
  const p=THEMES[theme];
  return Array.from({length:95},(_,i)=>{
    const x=((i*137)%607)/10-30.3, z=((i*113+21)%573)/10-28.6;
    if (theme==='city' && Math.abs(x)<4.25) return null;
    const onIsland=(x/22)**2+(z/18)**2<1;
    if (theme==='island' && !onIsland && (x/33)**2+(z/30)**2<1) return null;
    const color=theme==='island'&&!onIsland?'#72c2cd':p.grass;
    const y=theme==='island'?(onIsland?.451:-.196):.003;
    return box(x,z,.31+(i%6)*.19,.11+(i%5)*.13,.012,mixColor(color,i%3===0?p.dark:p.white,.1+i%5*.027),y);
  }).filter(Boolean);
}

function terrain(theme) {
  const p=THEMES[theme];
  const floor=(...parts)=>parts.map((part,layer)=>({...part,layer}));
  if(theme==='city') return [
    ...floor(...landscapeEdge(p.grass,p.sky),landscape(0,0,81,73,0,p.grass),...groundTexture(theme),
      ...river(p.grass,p.sky),
      ...Array.from({length:26},(_,i)=>box((i*11%27-13)/6,-36+i*2.8,1.02+i%4*.3,.12+i%3*.055,.01,i%3===0?'#6fb6ca':'#82c6d6',.036)),
      ...[-16,16].flatMap(x=>[box(x,0,2.25,51.7,.1,p.road,.02),...Array.from({length:12},(_,i)=>box(x,-23+i*4,.14,1.35,.02,p.white,.13))]),
      ...[0,11].flatMap(z=>[box(0,z,56.4,1.9,.17,p.road,.11),box(0,z-.91,8.8,.22,.25,p.white,.24),box(0,z+.91,8.8,.22,.25,p.white,.24)])),
    box(-7,-12,3.5,3.1,1.73,'#e9c39a',0,2),roof(-7,-12,4,3.4,1,'#ad6c62',1.73),
    box(7,-17,3.1,3,1.65,'#e9d1a2',0,2),roof(7,-17,3.55,3.5,.95,'#688ba3',1.65),...tree(-5.4,-8,'city'),...tree(6.4,14,'city'),
  ];
  if(theme==='moon') return [
    ...floor(...landscapeEdge(p.grass,p.sky),landscape(0,0,81,73,0,p.grass,1.4),...groundTexture(theme),
      ...[-15,15].map(x=>box(x,0,2.1,51,.07,p.road,.01)),
      ...[-.75,11].map(z=>box(0,z,56.2,1.75,.08,p.road,.1)),
      ...[[-2,-18],[0,7],[.7,19]].flatMap(([x,z])=>[tube(x,z,5.9,5.5,.2,'#7d7a91',.01),tube(x,z,4.7,4.35,.12,'#646881',.21),tube(x-.23,z+.2,3.75,3.45,.13,'#6f6d83',.33)])),
    box(-6.4,1,3.7,3.05,1.23,'#c3c8dc',.06,2),tube(-6.4,1,2.6,2.1,.91,'#a6bbd4',1.28),
    ...[[-6,-4],[5,1],[-8,13],[6,17]].flatMap(([x,z])=>beacon(x,z,'#92dfdf')),
  ];
  return [
    ...floor(...landscapeEdge('#72c2cd',p.sky),
      landscape(0,0,65,58,.02,'#8bd3d7',1),landscape(0,0,60,53,.16,'#e7c58d',1),
      landscape(0,-.9,54.6,46.5,.45,p.grass,1),...groundTexture(theme),
      ...Array.from({length:32},(_,i)=>{
        const a=i*2.39996, spread=1.21+(i%8)*.049;
        return box(Math.cos(a)*29*spread,Math.sin(a)*25*spread,1.6+i%4*.5,.11,.013,
          mixColor('#72c2cd','#e2f8f2',.13+i%4*.035),-.186);
      }),
      ...[-15,15].map(x=>box(x,-.25,1.65,40.6,.07,p.road,.46)),
      ...[.85,11].map(z=>box(0,z,48.3,1.5,.09,p.road,.46)),
      ...[-17,-9,3,14].map(x=>box(x,24.8,3.34,.24,.05,'#c5eef1',.025))),
    ...[[-3,18],[0,18],[3,18],[-1,-17],[-4,-17],[3,-17],[1,7]].flatMap(([x,z])=>tree(x,z,'island').map(part=>({...part,y:part.y+.43}))),
    box(0,-10,4.15,3,1.85,'#efcb91',.44,3),roof(0,-10,4.75,3.55,1.04,'#c47f71',2.28),
  ];
}

function ambientParts(theme) {
  if (theme==='island') return [
    box(-7,-16,.47,.37,.22,'#f7f2dc',5.6),box(-7.5,-16,.69,.14,.11,'#f7f2dc',5.66),
    box(-6.5,-16,.69,.14,.11,'#f7f2dc',5.66),box(-7,-16.17,.17,.18,.14,'#e5bd80',5.64),
  ];
  const x=theme==='city'?-16.46:-15.4;
  const y=theme==='city'?.13:.08;
  return [box(x,0,1.05,1.84,.37,'#5d606d',y),box(x,0,1.16,1.72,.35,theme==='city'?'#eab061':'#dfdbec',y+.27),
    box(x,.19,.82,.8,.4,'#92b9cc',y+.59),box(x,.19,.89,.81,.13,'#edf0df',y+.94)];
}

const plot = (index, theme) => {
  const x = [-21,-9,9,21][index%4], z = [-18,-6,6,18][Math.floor(index/4)];
  const shoreline = theme==='island' && Math.abs(z)===18 && Math.abs(x)>18;
  return [shoreline?Math.sign(x)*17.8:x, shoreline?Math.sign(z)*15.4:z];
};

function landmark(theme, index, definition) {
  const [label, type, color, accent='#698ba7']=definition;
  const [x,z]=plot(index,theme);
  const p=THEMES[theme], y=theme==='island'?.45:.04;
  const wide=['school','hangar','tower'].includes(type);
  const w=wide?6.55:5.45, d=wide?5.8:4.68;
  const wall=type==='tower'?4.1:type==='dome'?1.55:2.17;
  const flat=['field','park','square','pool','dance','dock','solar','launch'].includes(type);
  const B=(dx,dz,bw,bd,h,c,dy=0,studs=0)=>box(x+dx,z+dz,bw,bd,h,c,y+dy,studs);
  const T=(dx,dz,bw,bd,h,c,dy=0)=>tube(x+dx,z+dz,bw,bd,h,c,y+dy);
  const R=(dx,dz,bw,bd,h,c,dy)=>roof(x+dx,z+dz,bw,bd,h,c,y+dy);
  const stages = [[B(0,0,w+1.8,d+1.65,.2,p.foundation)],[],[],[],[],[]];
  if (!flat) {
    stages[1]=[B(0,0,w,d,wall,color,.2,3)];
    stages[2]=[B(0,0,w+.3,d+.25,.26,p.white,wall+.12),...[-1.75,0,1.75].flatMap(dx=>
      [B(dx,d/2+.04,1.12,.14,.75,'#6d9daf',.99),B(dx-w/2+.12,-d/2-.04,.81,.17,.63,'#6d9daf',1.03)])];
    stages[3]=type==='house'||type==='church'||type==='mill'
      ? [R(0,0,w+.6,d+.52,1.32,accent,wall+.39)]
      : type==='dome'||type==='tank'
        ? [T(0,0,w-.46,d-.34,.66,accent,wall+.36),T(0,0,w-1.43,d-1.2,.68,color,wall+.98),T(0,0,w-2.47,d-2.15,.32,accent,wall+1.6)]
        : [B(0,0,w+.59,d+.45,.4,accent,wall+.37,3),...(type==='tower'?[B(0,0,w-.75,d-.79,1.2,color,wall+.77,3),B(0,0,w-.39,d-.43,.29,accent,wall+1.97,2)]:[])];
    stages[4]=[B(0,d/2+.14,1.11,.22,1.42,p.dark,.28),B(0,d/2+.29,2.03,.89,.15,p.white,1.86)];
    if(type==='tower') stages[4].push(...[-1.7,0,1.7].map(dx=>B(dx,d/2+.03,1.04,.16,.75,'#7aa7bd',2.7)),B(1.23,-.7,.19,.2,1.25,p.dark,wall+2.2),B(1.24,-.7,.55,.27,.18,'#f4d577',wall+3.28));
    if(type==='mill') stages[4].push(B(0,d/2+.28,.37,.4,4.16,p.white,1.31),B(0,d/2+.31,4.26,.37,.39,p.white,3.29),T(0,d/2+.43,.6,.51,.49,accent,3.24));
    if(type==='church') stages[4].push(B(-1.35,.78,1.64,1.66,2.16,color,wall+.45),R(-1.35,.78,1.94,1.96,.97,accent,wall+2.61));
    if(type==='tank') stages[4].push(T(-1.6,1.36,1.51,1.42,2.4,accent,.38),T(1.6,1.36,1.51,1.42,2.4,accent,.38));
  } else {
    stages[1]=[B(0,0,w,d,.14,color,.22)];
    if(type==='field') {
      stages[2]=[B(0,0,.12,d,.02,p.white,.37),...[-1,1].flatMap(s=>[B(s*(w/2-.2),0,.11,d-.2,.02,p.white,.37),B(0,s*(d/2-.17),w-.35,.11,.02,p.white,.37)])];
      stages[3]=[-1,1].flatMap(s=>[B(s*2.42,0,.14,1.93,.13,p.white,.98),...[-.87,.87].map(dz=>B(s*2.42,dz,.17,.15,.63,p.white,.37))]);
      stages[4]=[B(0,-3.05,3.64,.43,.32,'#d6a765',.22),B(0,-3.29,3.64,.27,.35,'#e6c17d',.47)];
    } else if(type==='pool') {
      stages[2]=[B(0,0,w-.81,d-.68,.12,'#62b8d1',.31),B(0,d/2-.28,w,.28,.23,p.white,.31)];
      stages[3]=[-1,1].map(s=>B(s*1.08,.16,.12,d-1,.028,'#a2e3e6',.44));
      stages[4]=[T(2.42,2.3,1.44,1.44,.23,'#edb669',1.48),B(2.42,2.3,.12,.12,1.29,p.dark,.27)];
    } else if(type==='launch') {
      stages[2]=[T(0,0,4.35,4.1,.13,'#909ab9',.31),T(0,0,3.52,3.37,.14,'#6e789c',.44)];
      stages[3]=[T(0,0,1.58,1.58,2.97,'#e0e6ef',.55),T(0,0,1.68,1.68,.24,'#da927e',1.43)];
      stages[4]=[T(0,0,1.48,1.48,.35,accent,3.51),T(0,0,1.01,1,.38,'#e3c3a8',3.86),T(0,0,.48,.48,.38,p.white,4.24),...[-1,1].map(s=>B(s*.68,0,.57,.76,.85,accent,.57))];
    } else if(type==='solar') {
      stages[2]=[-1.68,0,1.68].map(dx=>B(dx,0,.27,.28,1.12,p.dark,.29));
      stages[3]=[-1.68,0,1.68].map(dx=>B(dx,0,1.33,3.25,.28,'#4e68a3',1.31));
      stages[4]=[-1.68,0,1.68].flatMap(dx=>[-1,0,1].map(dz=>B(dx,dz,1.2,.09,.028,'#9cb6e1',1.6)));
    } else if(type==='dock') {
      stages[2]=[-2,0,2].map(dx=>B(dx,.8,.37,.37,.95,'#91705e',.18));
      stages[3]=Array.from({length:7},(_,i)=>B(-2.22+i*.74,.85,.7,2.7,.23,'#c69f76',1.02));
      stages[4]=[B(.2,1.83,2.27,.2,.25,'#fff0ce',1.24),B(-2.2,-1.71,2.1,1.04,.42,'#6cb7c5',.35),B(-2.2,-1.71,1.15,.71,.37,'#f8dbac',.77)];
    } else if(type==='dance') {
      stages[2]=Array.from({length:12},(_,i)=>B((i%4-1.5)*.95,(Math.floor(i/4)-1)*.92,.87,.84,.16,['#f6bb78','#ac9acf','#8ecab1','#e992b1'][i%4],.32));
      stages[3]=[B(0,-2.1,4.3,1.12,.54,'#6e638c',.28),B(0,-2.1,1.89,.72,.55,'#e4aad0',.81)];
      stages[4]=[-2.22,2.22].flatMap(dx=>[B(dx,-2.1,.42,.51,2.09,p.dark,.3),B(dx,-2.1,.92,.75,.4,'#eed183',2.37)]);
    } else {
      stages[2]=[B(0,0,1.21,d-.14,.08,p.white,.35),B(0,0,w-.25,1.04,.09,p.white,.36)];
      stages[3]=[T(0,0,2.3,2.25,.23,accent,.47),T(0,0,1.64,1.62,.27,theme==='moon'?'#8db8ca':'#77bed0',.68)];
      stages[4]=theme==='moon' ? [B(-1.67,-1.37,1.08,1.19,1.02,'#c8b8d8',.33,1),B(1.67,-1.37,1.18,1.19,.73,'#adc6d5',.33,1)]
        : [...tree(x-1.83,z-1.42,theme).map(a=>({...a,y:a.y+y+.33})),...tree(x+1.83,z-1.42,theme).map(a=>({...a,y:a.y+y+.33}))];
    }
  }
  const edges = theme==='moon' ? [...beacon(x-w/2-.42,z+d/2,'#a2dcde'),...beacon(x+w/2+.42,z+d/2,'#f5ce94')]
    : [...tree(x-w/2-.49,z+d/2,theme),...beacon(x+w/2+.42,z+d/2,'#f4d787')];
  stages[5]=edges.map(part=>({...part,y:part.y+y}));
  const labels = flat ? ['grunnen','flaten','merkingen','utstyret','detaljene','omgivelsene']
    : ['grunnmuren','veggene','fasaden','taket','inngangen og detaljene','omgivelsene'];
  return stages.map((parts,i)=>stage(`${label} · ${labels[i]}`,parts));
}

function worldDetail(theme,i) {
  const x=[-26,26,-5.6,5.6][i%4], z=-21+Math.floor(i/4)*8.3;
  const p=THEMES[theme], y=theme==='island'?.45:.06;
  const xPos=theme==='island'&&Math.abs(x)>20 ? Math.sign(x)*22.4 : x;
  const colors=['#edb275','#dd8695','#82b8d0','#9ba2c9'];
  const color=colors[i%colors.length];
  if(i%6===1 || i%6===5) {
    const name=theme==='moon'?'En rover':theme==='city'?'Et kjøretøy':'En strandvogn';
    return stage(name,box(xPos,z,1.55,2.45,.35,p.dark,y+.04),box(xPos,z,1.66,2.23,.41,color,y+.32),box(xPos,z-.32,1.17,1.11,.5,'#c9e0e4',y+.72));
  }
  if(i%6===2 || i%6===4) {
    return stage(theme==='moon'?'Et nytt lyspunkt':'Et nytt hvilested',...beacon(xPos,z,'#f6d997').map(part=>({...part,y:part.y+y})),
      box(xPos+.88,z,.92,1.39,.26,color,y+.09),box(xPos+.88,z-.53,.94,.22,.36,p.dark,y+.24));
  }
  return stage(theme==='moon'?'En liten forsyningsstasjon':theme==='island'?'En palme ved stien':'Et tre langs elva',
    theme==='moon' ? [box(xPos,z,1.94,1.72,.76,color,y,2),box(xPos,z,1.18,1.28,.21,p.white,y+.76,1)]
      : tree(xPos,z,theme).map(part=>({...part,y:part.y+y})));
}

function worldScene(theme) {
  const steps=[];
  PLACES[theme].forEach((definition,i)=>{
    steps.push(...landmark(theme,i,definition));
    steps.push(worldDetail(theme,i));
    if(i%2===1) steps.push(worldDetail(theme,16+Math.floor(i/2)));
  });
  return {base:terrain(theme),ambient:ambientParts(theme),steps,background:THEMES[theme].sky,yaw:-.62,pitch:.57,world:true};
}

const catalog = new Map();
export function projectScene(id, completed=0) {
  const project=projectById(id);
  if(!project) return null;
  if(!catalog.has(id)) catalog.set(id, Object.hasOwn(HERO_PALETTES,id) ? heroScene(id) : worldScene(id));
  const {base,ambient,steps,background,yaw,pitch,world}=catalog.get(id);
  const built=Math.max(0,Math.min(steps.length,completed));
  const parts=base.concat(steps.slice(0,built).flatMap(step=>step.parts));
  const height=Math.max(...parts.map(part=>part.y+part.h));
  return {
    parts, ambient, background, yaw, pitch, world, id,
    latest:steps[built-1]?.parts ?? [],
    center:world ? 1 : Math.max(0,height*.43),
    size:world ? 79 : Math.max(14,height*1.38),
    last:steps[built-1]?.label, next:steps[built]?.label,
  };
}
