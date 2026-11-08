import {box,dome,tube,beam,placeParts,regionActors,MAX_ACTORS} from './scenery.js';
import {regionLayout,planRegion,regionVisibility,regionSurface,roadElevation,riverAt,riverWidth} from './regions.js';
import {WORLD_BUILD_STEPS,randomGenerator,worldStatus} from './worlds.js';
import {planStreetRegion} from './street-grid.js';
import {constructionYard,rideModels} from './map-art.js';

const SHADES={
  city:{ground:'#93ae77',shade:'#628c68',high:'#b2bd81',bank:'#c6c295',deep:'#5a93a8',shallow:'#85c5bf'},
  island:{ground:'#9ab980',shade:'#659570',high:'#bbc284',bank:'#ead1a1',deep:'#4d9eac',shallow:'#91d3c4'},
  moon:{ground:'#9f9eb8',shade:'#737492',high:'#c1b6c8',bank:'#b3abc5',deep:'#6d789e',shallow:'#9eabc9'},
};
const STREET_TONES={
  city:['#c3c4ad','#647686','#f3e1b3'],
  island:['#e3cfa6','#c3a478','#f6dfb8'],
  moon:['#b7b4c6','#767d9d','#d7d9e9'],
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
    const water=blend(rgb(palette.deep),rgb(palette.shallow),shallow*.88+variation*.10);
    return blend(water,rgb(palette.bank),clamp(1+tile.bank/.89)*.5);
  }
  let ground=blend(rgb(palette.shade),rgb(palette.ground),variation*.45+.4);
  ground=blend(ground,rgb(palette.high),clamp(tile.relief*.083+variation*.37));
  if (layout.theme==='moon'&&tile.basin<0) {
    ground=blend(ground,rgb(palette.shade),clamp(-tile.basin*.095+.2));
  }
  const beach=clamp(1-tile.bank/(layout.theme==='island'?3.8:1.22));
  return blend(ground,rgb(palette.bank),beach*.88);
}

function regionGround(layout,plan,sky,full,transparent) {
  const background=rgb(sky);
  const grid=layout.grid.map(tile=>{
    const {x,y,z}=tile;
    const visibility=regionVisibility(plan,x,z,full);
    const point=[x,y,z];
    const color=surfaceColor(tile,layout);
    return {point,color:transparent?color:blend(background,color,visibility),visibility};
  });
  const row=Math.sqrt(grid.length), ground=[];
  for (let i=0;i<grid.length-row;i++) {
    if (i%row===row-1) continue;
    const [a,b,c,d]=[grid[i],grid[i+1],grid[i+row],grid[i+row+1]];
    if (Math.max(a.visibility,b.visibility,c.visibility,d.visibility)<.008) continue;
    for (const triangle of [[a,c,b],[b,c,d]]) {
      const tile=face(triangle.map(v=>v.point),sky,0,triangle.map(v=>v.color));
      if (transparent) tile.alphas=triangle.map(v=>v.visibility);
      ground.push(tile);
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

const streetWidth=theme=>theme==='island'?1.02:1.22;

function pavedRoute(layout,path,theme) {
  const lanes=STREET_TONES[theme];
  const width=streetWidth(theme);
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
      parts.push(patch([A[0],A[1],B[1],B[0]],lanes[2],5));
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

function crossroads(layout,junctions) {
  const width=streetWidth(layout.theme);
  const [curb,road,mark]=STREET_TONES[layout.theme];
  return junctions.flatMap(({x,z,degree})=>{
    const y=roadElevation(layout,x,z);
    const tile=(r,height,color,layer)=>face([[x-r,height,z-r],[x-r,height,z+r],[x+r,height,z+r],[x+r,height,z-r]],color,layer);
    return [tile(width+.27,y-.035,curb,3),tile(width+.02,y+.021,road,5),
      ...(layout.theme!=='island'&&degree>2?[-.57,-.19,.19,.57].map(dx=>({
        ...box(x+dx,z+.95,.18,.39,.008,mark,y+.035),layer:6,
      })):[])];
  });
}

function groundShadow(layout,x,z,rx,rz,amount=.23,corners=8) {
  const tint=layout.theme==='moon'?[.37,.39,.53]:[.33,.42,.39];
  const make=(dx,dz,strength)=>{
    const a=x+dx,b=z+dz;
    const tile=regionSurface(layout,a,b);
    return {point:[a,tile.y+.035,b],color:blend(surfaceColor(tile,layout),tint,strength)};
  };
  const points=Array.from({length:corners},(_,i)=>{
    const a=-i*Math.PI*2/corners,c=Math.cos(a),s=Math.sin(a);
    return [make(rx*c,rz*s,0),make(rx*c*.67,rz*s*.67,amount*.79)];
  });
  const center=make(0,0,amount);
  const triangles=points.flatMap(([edge,inside],i)=>{
    const [next,inner]=points[(i+1)%points.length];
    return [[center,inside,inner],[inside,edge,next],[inside,next,inner]];
  });
  return triangles.map(triangle=>face(triangle.map(v=>v.point),'#81927f',2,triangle.map(v=>v.color)));
}

function naturePlant(theme,x,y,z,rng) {
  const height=1.65+rng()*1.72;
  const kind=rng(),lean=.12+rng()*.43;
  const stem=beam([x,y,z],[x+lean,y+height,z+.05],kind>.72?.17:.24,'#9c7857');
  if (theme==='island'&&kind<.72) {
    const fan=kind<.26,count=fan?7:5;
    return [stem,...Array.from({length:count},(_,i)=>{
      const a=i*2*Math.PI/count+.2;
      return dome(x+lean+.67*Math.cos(a),z+.06+.67*Math.sin(a),fan?1.52:2.06,fan?.73:.43,.33,
        i%2?'#83b96c':'#4e996e',y+height-.15,a);
    }),...[-.18,.11,.31].map(dx=>dome(x+lean+dx,z+.13,.28,.28,.29,'#b88b5d',y+height-.22))];
  }
  if (theme==='city'&&kind<.24) {
    const cones=[0,1,2].map(i=>({
      ...dome(x+lean*.4,z,2.05-i*.44,1.96-i*.42,.93,'#528668',y+height-.92+i*.58),
    }));
    return [stem,...cones];
  }
  const tones=theme==='island'?['#5d9b6d','#7eab69','#9fb96d']:kind>.72?['#7a9b56','#9cb471','#b0bf7e']:['#4d8b60','#6da26a','#8db573'];
  return [stem,...[[-.5,0,0],[.49,-.31,.27],[.02,.38,.43]].map(([dx,dz,dy],i)=>
    dome(x+lean+dx,z+dz,1.78-i*.09,1.53,1.01+i*.22,tones[i],y+height-.59+dy))];
}

function roughRocks(theme,x,y,z,rng) {
  const tone=theme==='moon'?['#727e9d','#9b9fb8','#b0adc3']:['#849184','#b3ab91','#a5a795'];
  return Array.from({length:2+Math.floor(rng()*3)},(_,i)=>{
    const angle=rng()*6.28,rad=rng()*1.5,scale=.43+rng()*1.5;
    return {...dome(x+Math.cos(angle)*rad,z+Math.sin(angle)*rad,scale*1.53,scale,.24+scale*.56,tone[i%3],y-.065,angle),
      shape:'boulder',phase:rng()*6.28};
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
    if ([plan.origin,...plan.plots].some(site=>Math.hypot(x-site.x,z-site.z)<6.55) ||
      Object.values(layout.berths).some(site=>Math.hypot(x-site.x,z-site.z)<(site.span??8.5)) ||
      routes.some(point=>Math.hypot(x-point.x,z-point.z)<2.18)) continue;
    const rocky=theme==='moon'||tile.relief>1.26&&random()<.56;
    const group=rocky?roughRocks(theme,x,tile.y,z,random):naturePlant(theme,x,tile.y,z,random);
    marks.push(...group.map(part=>({...part,fog:1-visibility})));
    if (visibility>.82&&spotSeed%3!==0) marks.push(...groundShadow(layout,x+.48,z-.36,rocky?1.25:1.67,1.05,.14,6));
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
  const plan=(map.layout===3?planStreetRegion(layout,buildings):null)??planRegion(layout,buildings);
  const horizon=clamp((status.built-18)/6);
  const parts=[
    ...regionGround(layout,plan,palette.sky,status.full,horizon>0),
    ...plan.paths.flatMap(path=>pavedRoute(layout,path,id)),
    ...crossroads(layout,plan.junctions??[]),
    ...landscapeDetails(layout,plan,status.full),
  ];
  let latest=[],last,finished=null,latestTarget=null;
  const landmarks={}, rides=[];
  plan.plots.forEach((plot,i)=>{
    const amount=Math.min(WORLD_BUILD_STEPS,map.progress-i*WORLD_BUILD_STEPS);
    const {name}=buildingInfo(plot.index);
    const steps=buildingParts(plot.index,plot);
    const height=Math.max(...steps.flatMap(step=>step.map(part=>part.y+part.h)));
    const done=amount===WORLD_BUILD_STEPS;
    latestTarget={...plot,height};
    if (!plot.waterfront) parts.push(...groundShadow(layout,plot.x+1.92,plot.z-1.47,7.35,6.18,amount===1?.15:.27,12));
    for (let j=0;j<amount;j++) {
      latest=placeParts(steps[j].filter(part=>!(done&&part.wheel)),plot).map(part=>fitFoundation(layout,part));
      parts.push(...latest);
    }
    last=`${name} · ${PHASES[amount-1]}`;
    finished=done?name:null;
    if (done) {
      landmarks[plot.index]=latestTarget;
      rides.push(...rideModels(plot,steps));
    } else parts.push(...constructionYard(layout,plot,amount,height));
  });
  const completedPlots=plan.plots.slice(0,status.built);
  return {
    id,parts,latest,last,finished,landmarks,latestTarget,world:true,illustrated:true,background:palette.sky,yaw:-Math.PI/4,pitch:.6155,center:1.1,closeSize:76,
    horizon:horizon?{id,seed:map.seed,amount:horizon}:null,
    ...viewBounds(plan,status.full),
    ambient:[...rides,...regionActors(id,layout,plan,completedPlots)].slice(0,MAX_ACTORS),
    next:status.building!==null?`${buildingInfo(status.building).name} · ${PHASES[status.phase]}`:null,
  };
}
