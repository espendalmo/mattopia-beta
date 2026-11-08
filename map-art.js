import {box,rounded,tube,dome,beam,placeParts,pointOnSite,coasterActor} from './scenery.js';
import {regionSurface} from './regions.js';
import {COASTER_TRACK,WHEEL_HUB} from './world-landmarks.js';
import {randomGenerator} from './worlds.js';

const paint='#e3ae55';
const rust='#bf8651';
const metal='#667988';
const chalk='#f2e0b8';

function barriers() {
  return [-2.35,.1,2.55].flatMap(x=>[
    box(x-.59,4.48,.13,.18,.6,metal,.05),box(x+.59,4.48,.13,.18,.6,metal,.05),
    rounded(x,4.49,1.53,.16,.32,chalk,.27),
    ...[-.52,0,.52].map(dx=>box(x+dx,4.59,.21,.04,.3,'#d99758',.29)),
  ]);
}

function digger() {
  return [
    ...[-.47,.47].flatMap(x=>[rounded(x,1.96,.42,1.43,.32,'#52616a',.04),
      ...[-.45,0,.45].map(z=>tube(x*1.29,1.96+z,.09,.19,.19,metal,.11,'x'))]),
    rounded(0,1.94,1.13,1.14,.32,paint,.36),
    rounded(-.25,2.06,.52,.73,.59,'#8caeb2',.61),
    box(-.25,2.06,.58,.77,.095,paint,1.17),
    beam([.29,.63,2.07],[.57,1.34,2.98],.2,paint),
    beam([.57,1.34,2.98],[.58,.51,3.53],.17,paint),
    beam([.29,.79,2.13],[.57,1.16,2.82],.068,chalk),
    rounded(.58,3.61,.52,.46,.25,rust,.31),
  ];
}

function towerCrane(height) {
  const x=-4.13,z=2.58;
  const posts=[[-.23,-.23],[.23,-.23],[.23,.23],[-.23,.23]];
  const braces=Array.from({length:Math.floor(height/.75)},(_,i)=>.45+i*.75);
  return [
    rounded(x,z,1.32,1.23,.19,'#a8a798',.045),
    ...posts.map(([a,b])=>beam([x+a,.22,z+b],[x+a,height,z+b],.1,rust)),
    ...braces.flatMap(y=>posts.flatMap(([a,b],i)=>{
      const [c,d]=posts[(i+1)%posts.length];
      return [beam([x+a,y,z+b],[x+c,y,z+d],.085,paint),
        beam([x+a,y,z+b],[x+c,y+.59,z+d],.073,paint)];
    })),
    rounded(x,z,.79,.84,.37,paint,height-.07),
    rounded(x+.31,z+.18,.46,.53,.43,'#94b6bf',height+.27),
    beam([x-1.16,height+.74,z],[x+5.58,height+.74,z],.15,paint),
    beam([x-1.13,height+.74,z],[x,height+1.29,z],.09,chalk),
    beam([x,height+1.29,z],[x+5.38,height+.74,z],.085,chalk),
    box(x-.92,z,.48,.49,.42,metal,height+.32),
    beam([x+4.6,height+.74,z],[x+4.6,height-1.24,z],.045,metal),
    rounded(x+4.6,z,.22,.17,.19,paint,height-1.36),
  ];
}

function scaffold(height) {
  const side=-2.51,front=3.56;
  const bars=[];
  for (const x of [side,side+1.65,side+3.3]) {
    for (const z of [front,front-.56]) bars.push(beam([x,.14,z],[x,height,z],.082,metal));
  }
  for (let y=1.03;y<height;y+=.92) {
    bars.push(box(side+1.65,front-.29,3.5,.69,.085,'#ccac7f',y));
    bars.push(beam([side,y+.15,front],[side+3.3,y+.15,front],.068,metal));
    bars.push(beam([side,y-.76,front],[side+1.65,y+.13,front],.069,metal));
    bars.push(beam([side+1.65,y+.13,front],[side+3.3,y-.76,front],.069,metal));
  }
  return bars;
}

export function constructionYard(layout,plot,phase,height) {
  const bank=plot.waterfront&&plot.entries?.[0];
  if (bank) {
    const {x,z}=bank;
    const site={x,z,y:regionSurface(layout,x,z).y+.08,yaw:plot.kind==='bridge'?Math.PI:plot.yaw+Math.PI};
    return placeParts([...digger(),...barriers().slice(0,7)],site);
  }
  const gravel=[[-3.41,3.34],[3.39,2.48],[3.04,3.91]].map(([x,z],i)=>dome(x,z,1.15+i*.16,1.12,.36,'#baa283',.04));
  const earth=phase===1?[rounded(0,0,8.4,7.8,.045,layout.theme==='moon'?'#ae9db2':'#c6ad87',-.025)]:[];
  const details=phase===1?digger():scaffold(Math.min(3.6,Math.max(1.7,height*.62)));
  return placeParts([...earth,...gravel,...barriers(),...details,...towerCrane(Math.min(8.8,3.35+height*.59))],plot);
}

export function rideModels(plot,stages) {
  if (plot.kind==='wheel') {
    const [hx,hy,hz]=WHEEL_HUB;
    const parts=placeParts(stages.flat().filter(part=>part.wheel),{x:-hx,y:-hy,z:-hz})
      .map(part=>({...part,hinge:part.hinge?.map((value,i)=>value-WHEEL_HUB[i])}));
    const [x,y,z]=pointOnSite(WHEEL_HUB,plot);
    return [{kind:'wheel',x,y,z,yaw:plot.yaw,parts}];
  }
  if (plot.kind==='coaster') {
    const points=COASTER_TRACK.map(([x,y,z])=>pointOnSite([x,y+.11,z],plot));
    return ['#da866a','#70aeb0'].map((color,i)=>coasterActor([
      rounded(0,0,.68,.91,.24,color,.013),rounded(0,-.19,.64,.32,.19,'#f3dbb3',.22),
      box(0,.16,.57,.095,.12,'#596f7d',.13),
    ],points,.23+i*.039));
  }
  return [];
}

const ridge=(rng,start,base,shade,amplitude)=>`<path fill="${shade}" d="M0 ${base} ${Array.from({length:17},(_,i)=>`L${i*63} ${(start-rng()*amplitude).toFixed(1)}`).join(' ')} L1008 ${base} Z"/>`;

export function horizonImage({id,seed,amount},sky) {
  const rng=randomGenerator(seed^0x18a32df7);
  let art;
  if (id==='moon') {
    const stars=Array.from({length:67},()=>{
      const x=(rng()*1000).toFixed(1),y=(12+rng()*210).toFixed(1),r=(.63+rng()*2.22).toFixed(2);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff5db" opacity="${(.28+rng()*.67).toFixed(2)}"/>`;
    }).join('');
    art=`<defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#263453"/><stop offset=".53" stop-color="#7a80ab"/><stop offset="1" stop-color="${sky}"/></linearGradient>
      <radialGradient id="planet" cx=".31" cy=".29"><stop stop-color="#d9f0e9"/><stop offset=".62" stop-color="#7cc6cf"/><stop offset="1" stop-color="#4a789f"/></radialGradient></defs>
      <rect width="1000" height="311" fill="url(#g)"/>${stars}<circle cx="812" cy="109" r="46" fill="url(#planet)"/>
      <path d="M775 109q18-38 49-28l-16 12 8 16-14 16-21-1zm48 15 21-19 11 11q-12 27-31 29z" fill="#9bd0ae" opacity=".76"/>`;
  } else if (id==='island') {
    const sparkles=Array.from({length:26},(_,i)=>{
      const x=(360+rng()*440).toFixed(1),y=(181+i*2.6).toFixed(1);
      return `<path d="M${x} ${y}h${(10+rng()*54).toFixed(1)}" stroke="#fff0c9" stroke-width="1.5" opacity=".5"/>`;
    }).join('');
    art=`<defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#a7d6d9"/><stop offset=".54" stop-color="#f1dcc3"/><stop offset=".545" stop-color="#71b9bd"/><stop offset="1" stop-color="${sky}"/></linearGradient></defs>
      <rect width="1000" height="320" fill="url(#g)"/><circle cx="708" cy="144" r="30" fill="#fff2ce"/>
      <path d="M0 174h1000" stroke="#f4e5cf" opacity=".75"/>${sparkles}`;
  } else {
    art=`<defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#afc9ca"/><stop offset=".56" stop-color="#eedec1"/><stop offset="1" stop-color="${sky}"/></linearGradient>
      <linearGradient id="f" x2="0" y2="1"><stop stop-color="${sky}" stop-opacity="0"/><stop offset="1" stop-color="${sky}"/></linearGradient></defs>
      <rect width="1000" height="320" fill="url(#g)"/><circle cx="764" cy="107" r="34" fill="#fff0c9"/>
      ${ridge(rng,191,294,'#9cafb2',53)}${ridge(rng,225,290,'#8ba5a6',53)}
      ${ridge(rng,254,321,'#a0b9ab',42)}<rect y="193" width="1000" height="132" fill="url(#f)"/>`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" preserveAspectRatio="none"><rect width="1000" height="600" fill="${sky}"/><g opacity="${amount.toFixed(3)}">${art}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
