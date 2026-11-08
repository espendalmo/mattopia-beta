import {box,dome,tube,beam,placeParts,regionActors} from './scenery.js';
import {regionLayout,planRegion,regionVisibility,regionSurface,roadElevation,riverAt,riverWidth} from './regions.js';
import {WORLD_BUILD_STEPS,randomGenerator,worldStatus} from './worlds.js';

const SHADES={
  city:{ground:'#8eac76',shade:'#688f66',high:'#a7bb80',bank:'#c1bd8d',deep:'#548eaa',shallow:'#80c1be'},
  island:{ground:'#8db878',shade:'#62976b',high:'#acbb77',bank:'#ecd4a3',deep:'#4d9fad',shallow:'#89d2c9'},
  moon:{ground:'#999db9',shade:'#656c92',high:'#bab5ce',bank:'#b3abc5',deep:'#6d789e',shallow:'#9eabc9'},
};
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const colorCache=new Map();
function rgb(hex) {
  if (!colorCache.has(hex)) colorCache.set(hex,hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255));
  return colorCache.get(hex);
}
function blend(a,b,t) { return a.map((value,i)=>lerp(value,b[i],t)); }

function face(outline,color,layer,colors) {
  const [x,y,z]=outline[0];
  return {shape:'terrain',outline,color,colors,x,y,z,h:0,layer};
}

function patch(points,color,layer) {
  return face(points.reverse(),color,layer);
}

function surfaceColor(tile,layout) {
  const palette=SHADES[layout.theme];
  const variation=clamp(.52+tile.detail*.27);
  if (tile.water) {
    const shallow=clamp(1+tile.bank/(layout.theme==='island'?11:4.7));
    return blend(rgb(palette.deep),rgb(palette.shallow),shallow*.88+variation*.10);
  }
  let ground=blend(rgb(palette.shade),rgb(palette.ground),variation*.45+.4);
  ground=blend(ground,rgb(palette.high),clamp(tile.relief*.083+variation*.37));
  if (layout.theme==='moon'&&tile.basin<0) {
    ground=blend(ground,rgb(palette.shade),clamp(-tile.basin*.095+.2));
  }
  const beach=clamp(1-tile.bank/(layout.theme==='island'?3.8:1.22));
  return blend(ground,rgb(palette.bank),beach*.93);
}

function regionGround(layout,plan,sky,full) {
  const background=rgb(sky);
  const grid=layout.grid.map(tile=>{
    const {x,y,z}=tile;
    const visibility=regionVisibility(plan,x,z,full);
    const point=[x,y,z];
    return {point,color:blend(background,surfaceColor(tile,layout),visibility),visibility};
  });
  const row=Math.sqrt(grid.length), ground=[];
  for (let i=0;i<grid.length-row;i++) {
    if (i%row===row-1) continue;
    const [a,b,c,d]=[grid[i],grid[i+1],grid[i+row],grid[i+row+1]];
    if (Math.max(a.visibility,b.visibility,c.visibility,d.visibility)<.008) continue;
    for (const triangle of [[a,c,b],[b,c,d]]) {
      ground.push(face(triangle.map(v=>v.point),sky,0,triangle.map(v=>v.color)));
    }
  }
  return ground;
}

function across(layout,point,prev,next,half,lift) {
  const angle=Math.atan2(next.z-prev.z,next.x-prev.x);
  const x=Math.sin(angle)*half,z=Math.cos(angle)*half;
  const y=(point.y??roadElevation(layout,point.x,point.z))+lift;
  return [[point.x-x,y,point.z+z],[point.x+x,y,point.z-z]];
}

function pavedRoute(layout,path,theme) {
  const lanes=theme==='island'?['#dfc59e','#c7ab82']:theme==='moon'?['#bab7cc','#747c9c']:['#bdc2ae','#677787'];
  const width=theme==='island'?.83:1.10;
  const parts=[];
  for (const [half,color,lift,layer] of [[width+.28,lanes[0],-.042,3],[width,lanes[1],0,4]]) {
    const rim=path.map((point,i)=>across(layout,point,path[Math.max(i-1,0)],path[Math.min(i+1,path.length-1)],half,lift));
    for (let i=1;i<rim.length;i++) {
      parts.push(patch([rim[i-1][0],rim[i-1][1],rim[i][1],rim[i][0]],color,layer));
    }
  }
  let length=0,lastDash=-2;
  for (let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],span=Math.hypot(b.x-a.x,b.z-a.z);
    length+=span;
    if (theme!=='island'&&length-lastDash>=3.6&&span>.46) {
      const c={x:lerp(a.x,b.x,.12),z:lerp(a.z,b.z,.12)},d={x:lerp(a.x,b.x,.68),z:lerp(a.z,b.z,.68)};
      const A=across(layout,c,a,b,.055,.012),B=across(layout,d,a,b,.055,.012);
      parts.push(patch([A[0],A[1],B[1],B[0]],theme==='moon'?'#cad4eb':'#ecdfb8',5));
      lastDash=length;
    }
    const overRiver=theme==='city'&&Math.abs(a.x-riverAt(layout,a.z))<riverWidth(layout,a.z)+.36
      &&Math.abs(a.z-layout.berths.bridge.z)>5.6;
    if (overRiver&&span>.12) {
      const A=across(layout,a,a,b,width+.14,.25),B=across(layout,b,a,b,width+.14,.25);
      parts.push(...A.map((point,j)=>beam(point,B[j],.13,'#e2cfac')));
      if (i%2===0) parts.push(...A.map(([x,y,z])=>box(x,z,.18,.18,.42,'#e7d6b9',y-.26)));
    }
  }
  return parts;
}

function naturePlant(theme,x,y,z,rng) {
  const height=1.65+rng()*1.72;
  const stem=beam([x,y,z],[x+.22,y+height,z+.05],.22,'#9c7857');
  if (theme==='island') return [stem,...Array.from({length:5},(_,i)=>{
    const a=i*2*Math.PI/5+.2;
    return dome(x+.25+.61*Math.cos(a),z+.06+.61*Math.sin(a),1.85,.47,.32,i%2?'#75b56f':'#4c9769',y+height-.14,a);
  })];
  return [stem,dome(x,z,1.83,1.72,1.28,'#4d8b60',y+height-.73),
    dome(x+.32,z-.16,1.24,1.09,.9,'#83ac6b',y+height-.24)];
}

function roughRocks(theme,x,y,z,rng) {
  const tone=theme==='moon'?['#727e9d','#9b9fb8','#b0adc3']:['#849184','#b3ab91','#a5a795'];
  return Array.from({length:2+Math.floor(rng()*3)},(_,i)=>{
    const angle=rng()*6.28,rad=rng()*1.5,scale=.43+rng()*1.5;
    return dome(x+Math.cos(angle)*rad,z+Math.sin(angle)*rad,scale*1.4,scale,.22+scale*.45,tone[i%3],y-.06,angle);
  });
}

function landscapeDetails(layout,plan,full) {
  const {theme,seed}=layout;
  const rng=randomGenerator((seed^0x36a9bf)>>>0);
  const spread=Array.from({length:320},()=>({x:(rng()-.5)*144,z:(rng()-.5)*135,seed:Math.floor(rng()*2**32)}));
  const marks=[];
  const routes=plan.paths.flat();
  for (const {x,z,seed:spotSeed} of spread) {
    const visibility=regionVisibility(plan,x,z,full);
    if (visibility<.27) continue;
    const random=randomGenerator(spotSeed);
    const tile=regionSurface(layout,x,z);
    if (tile.water) {
      if (visibility<.62||tile.bank< -17) continue;
      marks.push({...box(x,z,.83+random()*1.36,.065,.008,theme==='island'?'#b9dfd8':'#a1cbca',tile.y+.014),layer:2,fog:1-visibility});
      continue;
    }
    if (tile.bank>1.35 && visibility>.38) {
      const ring=Array.from({length:7},(_,i)=>{
        const angle=-i*Math.PI*2/7, width=.58+random()*.61;
        const a=x+Math.cos(angle)*width,b=z+Math.sin(angle)*width*.68;
        return [a,regionSurface(layout,a,b).y+.019,b];
      });
      marks.push({shape:'landscape',outline:ring,x,z,y:tile.y+.019,h:0,
        color:theme==='moon'?'#a6a3bd':theme==='island'?'#99b983':'#98ae7c',layer:1,fog:1-visibility});
    }
    if (layout.sites.some(site=>Math.hypot(x-site.x,z-site.z)<6.4) ||
      Object.values(layout.berths).some(site=>Math.hypot(x-site.x,z-site.z)<(site.span??8.5)) ||
      routes.some(point=>Math.hypot(x-point.x,z-point.z)<2.18)) continue;
    const rocky=theme==='moon'||tile.relief>1.26&&random()<.56;
    const group=rocky?roughRocks(theme,x,tile.y,z,random):naturePlant(theme,x,tile.y,z,random);
    marks.push(...group.map(part=>({...part,fog:1-visibility})));
    if (theme!=='moon'&&random()<.33) {
      marks.push(...[-.32,.15,.47].map((dx,i)=>({...dome(x+dx,z+.72,.21,.19,.16,['#e8bc7f','#d58c8a','#e8cf9d'][i],tile.y+.04),fog:1-visibility})));
    }
  }
  return marks;
}

function viewBounds(plan,full) {
  if (full) return {anchorX:0,anchorZ:0,size:172};
  const points=[plan.origin,...plan.plots,...plan.paths.flat()];
  const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
  const left=Math.min(...xs),right=Math.max(...xs),back=Math.min(...zs),front=Math.max(...zs);
  return {anchorX:(left+right)*.5,anchorZ:(back+front)*.5,size:Math.max(52,Math.hypot(right-left,front-back)*.91+34)};
}

const PHASES=['grunnarbeid','form og fasade','siste detaljer'];

function fitFoundation(layout,part) {
  if (!part.support) return part;
  const {x,y,z,w,d,h,angle}=part;
  const c=Math.cos(angle),s=Math.sin(angle),top=y+h;
  const outline=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>{
    const a=x+u*c-v*s,b=z+u*s+v*c;
    return [a,Math.min(top-.025,regionSurface(layout,a,b).y),b];
  });
  return {...part,shape:'support',outline,y:Math.min(...outline.map(point=>point[1])),
    h:top-Math.min(...outline.map(point=>point[1]))};
}

export function expandedWorldScene(id,map,palette,buildingInfo,buildingParts) {
  const status=worldStatus(map), layout=regionLayout(id,map.seed);
  const opened=map.order.slice(0,Math.ceil(map.progress/WORLD_BUILD_STEPS));
  const buildings=opened.map(index=>({index,kind:buildingInfo(index).kind}));
  const plan=planRegion(layout,buildings);
  const parts=[
    ...regionGround(layout,plan,palette.sky,status.full),
    ...plan.paths.flatMap(path=>pavedRoute(layout,path,id)),
    ...landscapeDetails(layout,plan,status.full),
  ];
  let latest=[],last,finished=null,latestTarget=null;
  const landmarks={};
  plan.plots.forEach((plot,i)=>{
    const amount=Math.min(WORLD_BUILD_STEPS,map.progress-i*WORLD_BUILD_STEPS);
    const {name}=buildingInfo(plot.index);
    const steps=buildingParts(plot.index,plot);
    const height=Math.max(...steps.flatMap(step=>step.map(part=>part.y+part.h)));
    latestTarget={...plot,height};
    for (let j=0;j<amount;j++) {
      latest=placeParts(steps[j],plot).map(part=>fitFoundation(layout,part));
      parts.push(...latest);
    }
    last=`${name} · ${PHASES[amount-1]}`;
    finished=amount===WORLD_BUILD_STEPS?name:null;
    if (finished) landmarks[plot.index]=latestTarget;
  });
  const completedPlots=plan.plots.slice(0,status.built);
  return {
    id,parts,latest,last,finished,landmarks,latestTarget,world:true,background:palette.sky,yaw:-.65,pitch:.59,center:1.1,closeSize:76,
    ...viewBounds(plan,status.full),
    ambient:regionActors(id,layout,plan,completedPlots),
    next:status.building!==null?`${buildingInfo(status.building).name} · ${PHASES[status.phase]}`:null,
  };
}
