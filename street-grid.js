import {connectWaterfront,regionalAnnex,regionalFootprint,regionSurface,riverAt,riverWidth,specialEntrances} from './regions.js';
import {randomGenerator,REGION_PLACES,LARGE_REGION_PLACES} from './worlds.js';
import {joinStreetPaths,streetNetwork} from './street-network.js';

export const STREET_TURN_RADIUS=2.35;
const streets=new WeakMap();
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;

function interpolate(a,b,step=1.9) {
  const count=Math.max(1,Math.ceil(gap(a,b)/step));
  return Array.from({length:count+1},(_,i)=>({
    x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count,
  }));
}

function streetGraph(layout,spacing,shift,maxGrade=2.15) {
  const width=layout.grand?13:11;
  const center=(width-1)/2;
  const rng=randomGenerator(layout.seed^0x5c14a537^Math.imul(shift,0x47c82f31));
  const shiftX=(rng()-.5)*8,shiftZ=(rng()-.5)*8;
  const nodes=Array.from({length:width*width},(_,id)=>{
    const x=(id%width-center)*spacing+shiftX,z=(Math.floor(id/width)-center)*spacing+shiftZ;
    return {id,x,z,...regionSurface(layout,x,z)};
  });
  const links=nodes.map(()=>[]);
  const edges=new Map();
  const connect=(a,b)=>{
    const points=interpolate(nodes[a],nodes[b]);
    const crossRiver=layout.theme==='city'&&nodes[a].z===nodes[b].z
      &&Math.abs(nodes[a].z-layout.berths.bridge.z)>6.4;
    if (points.some(point=>{
      if (layout.regionalSites.some(site=>regionalFootprint(site,point.x,point.z,1.65))) return true;
      const surface=regionSurface(layout,point.x,point.z);
      if (surface.water) return !crossRiver||Math.abs(point.x-riverAt(layout,point.z))>riverWidth(layout,point.z)+.2;
      return layout.theme==='moon'&&surface.basin< -1.65;
    })) return;
    const key=edgeKey(a,b);
    edges.set(key,{a,b,points,key});
    links[a].push(b);links[b].push(a);
  };
  for (const node of nodes) {
    if (node.water) continue;
    const {id}=node, col=id%width,row=Math.floor(id/width);
    if (row<width-1&&!nodes[id+width].water) connect(id,id+width);
    if (col<width-1) {
      const next=nodes[id+1];
      if (!next.water) connect(id,id+1);
      else if (layout.theme==='city'&&col<width-2&&!nodes[id+2].water) connect(id,id+2);
    }
  }
  const lots=[];
  const districtAccess=layout.regionalSites.flatMap(site=>specialEntrances(site));
  for (let row=0;row<width-1;row++) {
    for (let col=0;col<width-1;col++) {
      const nw=row*width+col, ring=[nw,nw+1,nw+width+1,nw+width];
      const x=nodes[nw].x+spacing/2,z=nodes[nw].z+spacing/2;
      if (Math.abs(x)>(layout.grand?73:67)||Math.abs(z)>(layout.grand?72:66)) continue;
      const perimeter=ring.map((id,i)=>edges.get(edgeKey(id,ring[(i+1)%ring.length])));
      const front=perimeter[2],west=perimeter[3];
      if (!front&&!west) continue;
      const corners=[[0,0],[5.4,0],[-5.4,0],[0,5.3],[0,-5.3],[4.1,4.1],[-4.1,4.1],[4.1,-4.1],[-4.1,-4.1]];
      const ground=corners.map(([a,b])=>regionSurface(layout,x+a,z+b));
      const low=Math.min(...ground.map(tile=>tile.y)), high=Math.max(...ground.map(tile=>tile.y));
      if (ground.some(tile=>tile.water||tile.bank<.26||layout.theme==='moon'&&tile.basin<-.65)||high-low>maxGrade) continue;
      if (layout.regionalSites.some(site=>regionalFootprint(site,x,z,6.05))
        ||districtAccess.some(entry=>Math.hypot(entry.x-x,entry.z-z)<6.5)) continue;
      if (Object.entries(layout.berths).some(([kind,site])=>kind!=='lighthouse'&&gap(site,{x,z})<(site.span?site.span*.66+3:8.7))) continue;
      lots.push({x,z,y:high+.045,ring,perimeter,front,west,weight:rng()*4.8,westFirst:rng()>.5});
    }
  }
  lots.sort((a,b)=>gap(a,layout.origin)+a.weight-gap(b,layout.origin)-b.weight);
  const origin=lots.find(lot=>lot.perimeter.every(Boolean));
  if (!origin) return null;
  const component=new Set(origin.ring);
  const queue=[...component];
  for (let i=0;i<queue.length;i++) {
    for (const neighbor of links[queue[i]]) {
      if (component.has(neighbor)) continue;
      component.add(neighbor);queue.push(neighbor);
    }
  }
  const available=[origin,...lots.filter(lot=>lot!==origin&&[lot.front,lot.west].some(edge=>edge&&component.has(edge.a)))];
  return {nodes,links,edges,origin,available};
}

function layoutStreets(layout,requiredLots) {
  const versions=streets.get(layout)??new Map();
  if (versions.has(requiredLots)) return versions.get(requiredLots);
  let graph;
  const attempts=[[15.2,0],[14.3,0],[14.3,1],[13.6,0],[13.6,1],[13.6,2],[13.1,0],[13.1,2],[13.1,3]];
  if (layout.grand) attempts.push([12.9,0],[12.9,1],[12.9,2],[12.9,3],[12.9,4]);
  if (requiredLots>=LARGE_REGION_PLACES) {
    attempts.push(...Array.from({length:12},(_,i)=>[12.9,5+i]));
    if (layout.theme==='island') attempts.push(...Array.from({length:16},(_,i)=>[12.9,i,3.25]));
  }
  for (const [spacing,shift,maxGrade] of attempts) {
    const candidate=streetGraph(layout,spacing,shift,maxGrade);
    if (candidate?.available.length>=requiredLots) { graph=candidate; break; }
  }
  if (graph) {
    const reserved=graph.available.slice(0,(layout.grand?requiredLots:REGION_PLACES)+4);
    const blockedRoad=(x,z)=>reserved.some(site=>Math.hypot(site.x-x,site.z-z)<5.5)
      ||layout.regionalSites.some(site=>regionalFootprint(site,x,z,.8));
    graph.connectorLayout={...layout,blockedRoad,
      grid:layout.grid.map(tile=>({...tile,blocked:blockedRoad(tile.x,tile.z)}))};
  }
  versions.set(requiredLots,graph??null);
  streets.set(layout,versions);
  return graph;
}

function pathToStreet(links,starts,active,avoid) {
  const queue=[...starts], previous=new Map(queue.map(id=>[id,null]));
  for (let i=0;i<queue.length;i++) {
    const here=queue[i];
    if (active.has(here)) {
      const found=[];
      for (let id=here;id!==null;id=previous.get(id)) found.push(id);
      return found;
    }
    for (const neighbor of links[here]) {
      if (previous.has(neighbor)||edgeKey(here,neighbor)===avoid) continue;
      previous.set(neighbor,here);queue.push(neighbor);
    }
  }
  return null;
}

function streetCircuits(nodes,open,links,starter) {
  const result=[starter.map(id=>nodes[id])];
  const used=new Set([starter.slice().sort((a,b)=>a-b).join(',')]);
  for (const {a,b,key} of open.values()) {
    const cycle=pathToStreet(links,[a],new Set([b]),key);
    if (!cycle||cycle.length<4||cycle.length>13) continue;
    const signature=cycle.slice().sort((x,y)=>x-y).join(',');
    if (used.has(signature)) continue;
    used.add(signature);
    result.push(cycle.map(id=>nodes[id]));
  }
  // Join adjacent blocks across their shared edge to make routes through several streets.
  const local=result.slice();
  for (const first of local.slice(0,32)) {
    let circuit=first;
    for (let step=0;step<8;step++) {
      const ids=new Set(circuit.map(node=>node.id));
      let joined;
      for (let i=0;i<circuit.length&&!joined;i++) {
        const a=circuit[i].id,b=circuit[(i+1)%circuit.length].id;
        for (const next of local) {
          const start=next.findIndex(node=>node.id===a);
          if (start<0||next.filter(node=>ids.has(node.id)).length!==2) continue;
          const length=next.length;
          const direction=next[(start+1)%length].id===b?-1:next[(start+length-1)%length].id===b?1:0;
          if (!direction) continue;
          const detour=Array.from({length:length-2},(_,j)=>next[(start+direction*(j+1)+length)%length]);
          joined=circuit.slice(0,i+1).concat(detour,circuit.slice(i+1));
          break;
        }
      }
      if (!joined) break;
      circuit=joined;
    }
    const signature=circuit.map(node=>node.id).sort((a,b)=>a-b).join(',');
    if (!used.has(signature)) { used.add(signature); result.push(circuit); }
  }
  return result;
}

export function planStreetRegion(layout,buildings,requiredLots=REGION_PLACES-Object.keys(layout.berths).length,{starter=false}={}) {
  const graph=layoutStreets(layout,requiredLots+Number(starter))??layoutStreets(layout,requiredLots);
  if (!graph) return null;
  const {nodes,edges,origin,available,links,connectorLayout}=graph;
  const reserveOrigin=starter&&available.length>requiredLots;
  const open=new Map(), active=new Set(), connectors=[],plots=[];
  const gateways=new Set();
  const usedLots=new Set(reserveOrigin?[origin]:[]);
  let latestPaths=new Map();
  let track=false;
  const add=edge=>{
    if (!edge) return;
    if (track&&!open.has(edge.key)) latestPaths.set(edge.points,!active.has(edge.a)&&active.has(edge.b));
    open.set(edge.key,edge);
    active.add(edge.a);active.add(edge.b);
  };
  origin.perimeter.forEach(add);
  const varied=requiredLots>=LARGE_REGION_PLACES;
  if (varied) {
    // The first block has a loop for traffic. Give it a seeded extension,
    // which can be a second loop, a bend, or the beginning of a longer street.
    const adjacent=available.filter(lot=>lot!==origin&&lot.ring.filter(id=>active.has(id)).length===2
      &&lot.perimeter.every(Boolean));
    const start=adjacent[layout.seed%Math.max(1,adjacent.length)];
    if (start) {
      const join=start.perimeter.findIndex(edge=>open.has(edge.key));
      const extension=[1,2,3].map(i=>start.perimeter[(join+i)%4]);
      extension.slice(0,1+(layout.seed>>>5)%3).forEach(add);
    }
  }
  track=true;
  const balanceBanks=layout.theme==='city'&&varied;
  const bankOf=site=>site.x<riverAt(layout,site.z)?0:1;

  const attach=(special,index,kind)=>{
    const entries=specialEntrances(special,kind);
    for (const entry of entries) {
      const side=Math.sign(entry.x-special.x);
      const eligible=point=>kind!=='bridge'||(point.x-riverAt(layout,point.z))*side>riverWidth(layout,point.z)+.6;
      const peer=special.airportDistrict&&plots.find(plot=>plot.airportDistrict)?.entries[0];
      const connect=(start,street=[])=>{
        const path=connectWaterfront(connectorLayout,start,entry,kind==='bridge');
        if (!path||path.length<2) return false;
        for (let i=1;i<street.length;i++) add(edges.get(edgeKey(street[i-1],street[i])));
        connectors.push(path);
        if (special.beach||special.spaceResort||special.airportDistrict) gateways.add(path);
        latestPaths.set(path,false);
        return true;
      };
      if (peer&&connectors.some(path=>gap(path.at(-1),peer)<.01)&&connect(peer)) continue;
      // Open the grid right up to the destination. These streets can serve
      // future plots, with only the last short stretch made to measure.
      const score=point=>gap(point,entry)+.44*Math.min(Math.abs(point.x-entry.x),Math.abs(point.z-entry.z))
        -(active.has(point.id)?2.4:0);
      const nearby=nodes.filter(point=>links[point.id].length&&eligible(point)).sort((a,b)=>score(a)-score(b));
      const connected=nearby.slice(0,18).some(start=>{
        const street=pathToStreet(links,[start.id],active);
        return street&&connect(start,street);
      });
      if (!connected) nearby.filter(point=>active.has(point.id)).slice(0,8).some(start=>connect(start));
    }
    plots.push({...special,index,kind,entries});
  };

  for (const {index,kind} of buildings) {
    latestPaths=new Map();
    const special=regionalAnnex(layout,kind)??layout.berths[kind];
    const reserveLot=special&&kind==='lighthouse';
    if (special&&!reserveLot) {
      attach(special,index,kind);
      continue;
    }

    const banks=[0,0];
    if (balanceBanks) for (const plot of plots) {
      if (!plot.waterfront&&!plot.airfield) banks[bankOf(plot)]++;
    }
    // Keep the centre compact, then let new districts take turns across the river.
    let choice=null;
    for (const lot of available) {
      if (usedLots.has(lot)) continue;
      for (const [edge,yaw] of [[lot.front,0],[lot.west,-Math.PI/2]]) {
        if (!edge) continue;
        const path=pathToStreet(links,[edge.a,edge.b],active);
        if (!path) continue;
        const starter=lot===origin&&usedLots.size===0?-5:0;
        const bank=balanceBanks?bankOf(lot):0;
        const imbalance=banks[bank]-banks[1-bank];
        const riverBias=usedLots.size>=3&&imbalance>1 ? imbalance*9 : 0;
        const score=path.length*6+gap(lot,origin)*.18+lot.weight+starter+riverBias+(lot.westFirst===(yaw!==0)?0:.65);
        if (!choice||score<choice.score) choice={lot,edge,yaw,path,score};
      }
    }
    if (!choice) return null;
    const {lot,edge,yaw,path}=choice;
    usedLots.add(lot);
    for (let i=1;i<path.length;i++) add(edges.get(edgeKey(path[i-1],path[i])));
    add(edge);
    const ringRoad=!varied||usedLots.size<=2||['railwayStation','monorailStation','tramStation','busStation'].includes(kind)||lot.weight<2.1;
    if (ringRoad) lot.perimeter.forEach(add);
    else if (lot.weight>3.5) {
      // A corner plot gets a side street. Quiet parcels need only one frontage.
      const corner=lot.perimeter.find(side=>side&&side!==edge&&!open.has(side.key)
        &&[side.a,side.b].some(id=>id===edge.a||id===edge.b));
      add(corner);
    }
    const offset=varied&&!ringRoad?Math.min(.58,Math.max(0,gap(nodes[lot.ring[0]],nodes[lot.ring[1]])*.5-6.32)):0;
    const x=lot.x-Math.sin(yaw)*offset,z=lot.z-Math.cos(yaw)*offset;
    const entry=yaw===0?{x,z:nodes[lot.ring[2]].z}:{x:nodes[lot.ring[3]].x,z};
    if (reserveLot) attach(special,index,kind);
    else plots.push({x,y:lot.y,z,yaw,index,kind,entries:[entry],
      streetSpan:gap(nodes[lot.ring[0]],nodes[lot.ring[1]])});
  }
  const openLinks=nodes.map(()=>[]);
  for (const {a,b} of open.values()) {
    openLinks[a].push(b);openLinks[b].push(a);
  }
  const roads=joinStreetPaths([...open.values()].map(edge=>edge.points),connectors,latestPaths,gateways);
  const network=streetNetwork(roads.paths,roads.accessPaths);
  return {
    origin,starter:reserveOrigin?{x:origin.x,y:origin.y,z:origin.z,yaw:0}:null,plots,...roads,
    junctions:network.junctions,network,
    circuits:streetCircuits(nodes,open,openLinks,origin.ring),
  };
}
