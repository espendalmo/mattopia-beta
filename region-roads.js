import {beam,box} from './scenery.js';
import {roadElevation,riverAt,riverWidth} from './regions.js';
import {STREET_TURN_RADIUS} from './street-grid.js';

const STREET_TONES={
  city:['#c3c4ad','#647686','#f4edda'],
  island:['#e3cfa6','#c3a478','#f6dfb8'],
  moon:['#b7b4c6','#767d9d','#e1e3f1'],
};
const BRIDGE_TONES=['#d6bea3','#9f8775'];
const key=({x,z})=>`${x}:${z}`;
const length=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
const perpendicular=([ax,az],[bx,bz])=>ax*bx+az*bz===0;

// The two street legs meet a circular bend at its tangents.
function streetArc({x,z},[ax,az],[bx,bz],radius,offset=radius,segments=8) {
  return Array.from({length:segments+1},(_,i)=>{
    const angle=i*Math.PI/2/segments;
    const a=offset-radius*Math.sin(angle),b=offset-radius*Math.cos(angle);
    return {x:x+ax*a+bx*b,z:z+az*a+bz*b,
      tangent:[-ax*Math.cos(angle)+bx*Math.sin(angle),-az*Math.cos(angle)+bz*Math.sin(angle)]};
  });
}

export function roundedStreetPaths(plan) {
  const corners=new Map((plan.junctions??[]).filter(({arms,connector})=>
    !connector&&arms.length===2&&perpendicular(...arms)).map(node=>[key(node),node]));
  if (!corners.size) return plan.paths;

  const trimmed=plan.paths.map(path=>{
    if (path.length<2) return path;
    const first=path[0],last=path.at(-1);
    const trim=(point,other)=>{
      if (!corners.has(key(point))) return point;
      const scale=STREET_TURN_RADIUS/length(point,other);
      return {x:point.x+(other.x-point.x)*scale,z:point.z+(other.z-point.z)*scale};
    };
    const start=trim(first,last),end=trim(last,first);
    return [start,...path.slice(1,-1).filter(point=>
      (start===first||length(first,point)>STREET_TURN_RADIUS+.001)&&
      (end===last||length(last,point)>STREET_TURN_RADIUS+.001)),end];
  });
  return trimmed.concat([...corners.values()].map(node=>streetArc(node,...node.arms,STREET_TURN_RADIUS)));
}

function surface(outline,color,layer) {
  const [x,y,z]=outline[0];
  return {shape:'terrain',outline,color,layer,x,y,z,h:0};
}

function measureRoad(layout,path) {
  const distinct=path.filter((point,i)=>!i||length(path[i-1],point)>.0001);
  let distance=0;
  return distinct.map((point,i)=>{
    const prev=distinct[Math.max(0,i-1)],next=distinct[Math.min(distinct.length-1,i+1)];
    const span=length(prev,next);
    if (i) distance+=length(prev,point);
    return {...point,y:point.y??roadElevation(layout,point.x,point.z),distance,
      tangent:point.tangent??(span?[(next.x-prev.x)/span,(next.z-prev.z)/span]:[1,0])};
  });
}

function across({x,y,z,tangent:[dx,dz]},half,lift) {
  return [[x-dz*half,y+lift,z+dx*half],[x+dz*half,y+lift,z-dx*half]];
}

function rise(a,b,c) {
  return (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
}

function strip(a,b,half,lift,color,layer) {
  const [left,right]=across(a,half,lift),[nextLeft,nextRight]=across(b,half,lift);
  const outline=[nextLeft,nextRight,right,left];
  // Tight bends on older routes and pier approaches can cross their own offsets.
  if (rise(nextLeft,nextRight,right)<=0||rise(nextLeft,right,left)<=0) {
    const x=outline.reduce((sum,point)=>sum+point[0],0)/4,z=outline.reduce((sum,point)=>sum+point[2],0)/4;
    const angle=point=>Math.atan2(point[2]-z,point[0]-x);
    outline.sort((a,b)=>angle(b)-angle(a));
  }
  return surface(outline,color,layer);
}

function along(a,b,distance) {
  const t=(distance-a.distance)/(b.distance-a.distance);
  const mix=(start,end)=>start+(end-start)*t;
  const dx=mix(a.tangent[0],b.tangent[0]),dz=mix(a.tangent[1],b.tangent[1]);
  const span=Math.hypot(dx,dz);
  return {x:mix(a.x,b.x),y:mix(a.y,b.y),z:mix(a.z,b.z),
    tangent:span?[dx/span,dz/span]:a.tangent};
}

function laneMarkings(road,color) {
  const parts=[];
  const total=road.at(-1).distance;
  const dash=1.45,period=3.8;
  const count=Math.max(0,1+Math.floor((total-dash-.68)/period));
  const first=(total-((count-1)*period+dash))/2;
  for (let i=0,segment=1;i<count;i++) {
    const start=first+i*period,end=start+dash;
    while (road[segment].distance<start) segment++;
    while (road[segment-1].distance<end) {
      const a=road[segment-1],b=road[segment];
      const left=along(a,b,Math.max(start,a.distance)),right=along(a,b,Math.min(end,b.distance));
      if (length(left,right)>.0001) parts.push(strip(left,right,.071,.014,color,5));
      if (b.distance>=end) break;
      segment++;
    }
  }
  return parts;
}

function overRiver(layout,a,b) {
  if (layout.theme!=='city') return false;
  const z=(a.z+b.z)*.5,x=(a.x+b.x)*.5;
  return Math.abs(x-riverAt(layout,z))<riverWidth(layout,z)+.78&&Math.abs(z-layout.berths.bridge.z)>5.6;
}

function bridgeSpan(a,b,width,pier) {
  const rims=across(a,width+.18,-.09);
  const end=across(b,width+.18,-.09);
  const rails=across(a,width+.19,.39),railEnd=across(b,width+.19,.39);
  const parts=rims.flatMap((point,i)=>[
    beam(point,end[i],.26,'#96796e'),
    beam(rails[i],railEnd[i],.13,'#efdbc2'),
    beam([rails[i][0],rails[i][1]-.15,rails[i][2]],[railEnd[i][0],railEnd[i][1]-.15,railEnd[i][2]],.075,'#b79479'),
  ]);
  parts.push(...rims.map(([x,y,z])=>box(x,z,.2,.2,.49,'#d1b39b',y+.01)));
  if (pier) parts.push(...rims.map(([x,y,z])=>box(x,z,.46,.46,.37,'#997f78',Math.min(0,y-.29))));
  return parts;
}

function pavedRoute(layout,path,width) {
  const road=measureRoad(layout,path);
  if (road.length<2) return [];
  const [curb,asphalt,mark]=STREET_TONES[layout.theme];
  const parts=[];
  let span=0;
  for (let i=1;i<road.length;i++) {
    const a=road[i-1],b=road[i];
    const bridge=overRiver(layout,a,b);
    const [edge,color]=bridge?BRIDGE_TONES:[curb,asphalt];
    parts.push(strip(a,b,width+.28,-.042,edge,3),strip(a,b,width,0,color,4));
    if (bridge) {
      parts.push(...bridgeSpan(a,b,width,span%3===1));
      if (i===road.length-1||!overRiver(layout,b,road[i+1])) {
        parts.push(...across(b,width+.19,0).map(([x,y,z])=>box(x,z,.2,.2,.42,'#d1b39b',y)));
      }
    }
    span=bridge?span+1:0;
  }
  if (layout.theme!=='island') parts.push(...laneMarkings(road,mark));
  return parts;
}

function intersections(layout,junctions,width) {
  const [curb,road]=STREET_TONES[layout.theme];
  const fillet=.86;
  return junctions.flatMap(node=>{
    const {arms,connector}=node;
    if (arms.length<3&&!connector) return [];
    return arms.flatMap((a,i)=>arms.slice(i+1).filter(b=>perpendicular(a,b)).flatMap(b=>
      [[width+.28,curb,-.042,3],[width,road,.002,4]].flatMap(([half,color,lift,layer])=>{
        const [ax,az]=a,[bx,bz]=b;
        const center={x:node.x+(ax+bx)*half,z:node.z+(az+bz)*half};
        const point=({x,z})=>[x,roadElevation(layout,x,z)+lift,z];
        const rim=streetArc(node,a,b,fillet,half+fillet,5);
        return rim.slice(1).map((end,j)=>{
          const triangle=[point(center),point(rim[j]),point(end)];
          return surface(ax*bz-az*bx<0?triangle:triangle.reverse(),color,layer);
        });
      })));
  });
}

export function regionRoads(layout,plan) {
  const width=layout.theme==='island'?1.02:1.22;
  return [...roundedStreetPaths(plan).flatMap(path=>pavedRoute(layout,path,width)),
    ...intersections(layout,plan.junctions??[],width)];
}
