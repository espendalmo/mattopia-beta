import {actorPose} from './scenery.js';

const clamp = (value,min,max) => Math.max(min,Math.min(value,max));
const cross = ([ax,ay,az],[bx,by,bz]) => [ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];
const difference = (a,b) => a.map((value,i)=>value-b[i]);
const dot = (a,b) => a.reduce((sum,value,i)=>sum+value*b[i],0);

function ringFaces(rings) {
  const first=rings[0], last=rings.at(-1);
  return [first,[...last].reverse(),...rings.slice(1).flatMap((upper,j)=>{
    const lower=rings[j];
    return lower.map((point,i)=>{
      const next=(i+1)%lower.length;
      return [point,upper[i],upper[next],lower[next]];
    });
  })];
}

function partFaces({shape,x,y,z,w,d,h,outline,profile,axis='y',angle=0}) {
  if (shape==='landscape') return [outline];
  if (shape==='plate') {
    const area=profile.reduce((sum,[a,b],i)=>{
      const [c,d]=profile[(i+1)%profile.length];
      return sum+a*d-b*c;
    },0);
    const front=(area>0?profile:[...profile].reverse()).map(([a,b])=>[x+a,y+b,z]);
    return [front,[...front].reverse()];
  }
  if (shape==='dome') {
    const rings=[0,.44,.78,1.08,1.38,1.52].map(incline=>{
      const radius=Math.cos(incline)/2;
      return Array.from({length:12},(_,i)=>{
        const a=i*Math.PI/6;
        const px=w*Math.cos(a)*radius, pz=d*Math.sin(a)*radius;
        return [x+px*Math.cos(angle)-pz*Math.sin(angle),y+h*Math.sin(incline),z+px*Math.sin(angle)+pz*Math.cos(angle)];
      });
    });
    return ringFaces(rings);
  }
  if (shape==='rounded' && Math.min(w,d,h)>.2) {
    const bevel=Math.min(.24,w*.13,d*.13,h*.22);
    const rings=[[0,bevel],[bevel,0],[h-bevel,0],[h,bevel]].map(([height,inset])=>
      [[1,1],[-1,1],[-1,-1],[1,-1]].flatMap(([sx,sz],j)=>
        [0,.25,.5].map(turn=>{
          const a=(j*.5+turn)*Math.PI;
          const r=bevel*1.7-inset;
          return [x+sx*(w/2-bevel*1.7)+r*Math.cos(a),y+height,z+sz*(d/2-bevel*1.7)+r*Math.sin(a)];
        })));
    return ringFaces(rings);
  }
  if (shape==='tube') {
    const lower=Array.from({length:12},(_,i)=>{
      const angle=i*Math.PI/6;
      if (axis==='x') return [x+w/2,y+(1+Math.cos(angle))*h/2,z+d*Math.sin(angle)/2];
      if (axis==='z') return [x+w*Math.cos(angle)/2,y+(1-Math.sin(angle))*h/2,z-d/2];
      return [x+w*Math.cos(angle)/2,y,z+d*Math.sin(angle)/2];
    });
    const upper=lower.map(([a,b,c])=>axis==='x'?[a-w,b,c]:axis==='z'?[a,b,c+d]:[a,b+h,c]);
    return ringFaces([lower,upper]);
  }

  const left=x-w/2,right=x+w/2,back=z-d/2,front=z+d/2;
  const a=[left,y,back],b=[right,y,back],c=[right,y,front],d0=[left,y,front];
  if (shape==='roof') {
    const e=[x,y+h,back],f=[x,y+h,front];
    return [[a,b,c,d0],[a,e,b],[d0,c,f],[a,d0,f,e],[b,e,f,c]];
  }
  const e=[left,y+h,back],f=[right,y+h,back],g=[right,y+h,front],u=[left,y+h,front];
  return [[a,b,c,d0],[e,u,g,f],[a,e,f,b],[b,f,g,c],[d0,c,g,u],[a,d0,u,e]];
}

function studs(part) {
  if (!part.studs) return [];
  const {x,y,z,w,d,h,color,studs:columns}=part;
  const rows=d>2.4?2:1;
  const diameter=Math.min(.78,w/columns*.52,d/rows*.55);
  return Array.from({length:columns*rows},(_,i)=>({
    shape:'tube',x:x+((i%columns+.5)/columns-.5)*w,y:y+h-.01,
    z:z+((Math.floor(i/columns)+.5)/rows-.5)*d,w:diameter,d:diameter,h:.18,color,
  }));
}

function domeNormal(part,[x,y,z]) {
  const cos=Math.cos(part.angle), sin=Math.sin(part.angle);
  const dx=x-part.x,dz=z-part.z;
  const localX=(dx*cos+dz*sin)/(part.w*.5)**2;
  const localZ=(-dx*sin+dz*cos)/(part.d*.5)**2;
  const normal=[localX*cos-localZ*sin,(y-part.y)/part.h**2,localX*sin+localZ*cos];
  const length=Math.hypot(...normal);
  return normal.map(value=>value/length);
}

export function projectFaces(scene) {
  const light=[.28,.84,.43];
  const latest=new Set(scene.latest);
  const layers=[scene.parts, ...(scene.ambient ?? []).map(actor=>actor.parts)];
  return layers.flatMap((parts,layerIndex)=>parts.flatMap(part=>[part,...studs(part)].flatMap(piece=>{
    const rgb=piece.color.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255);
    const shaded=normal=>{
      const illumination=Math.max(0,dot(normal,light));
      const reflection=Math.max(0,illumination-.72)**2*.34;
      return rgb.map(value=>Math.min(1,value*(.62+.37*illumination)+reflection));
    };
    return partFaces(piece).map((points,faceIndex)=>{
      const landscape=piece.shape==='landscape';
      const normal=landscape ? [0,1,0] : piece.shape==='plate' ? [0,0,faceIndex===0?1:-1]
        : cross(difference(points[1],points[0]),difference(points[2],points[0]));
      const length=Math.hypot(...normal);
      const unit=normal.map(value=>value/length);
      const vertexColors=piece.shape==='dome'&&faceIndex>0 ? points.map(point=>shaded(domeNormal(piece,point))) : null;
      const color=landscape ? rgb : vertexColors ? rgb.map((_,i)=>vertexColors.reduce((sum,vertex)=>sum+vertex[i],0)/points.length) : shaded(unit);
      return {points,normal:unit,color,vertexColors,layer:part.layer??Infinity,
        origin:landscape||piece.radial ? [piece.x,piece.y,piece.z] : null,
        group:layerIndex?layerIndex+1:latest.has(part)?1:0,stride:part.stride??0};
    });
  })));
}

function backgroundRGB(hex) {
  return hex.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255);
}

function canvasPainter(canvas, faces, background) {
  const context=canvas.getContext('2d');
  if (!context) return null;
  const paintColor=color=>`rgb(${color.map(channel=>Math.round(channel*255)).join(',')})`;
  const flat=faces.map(face=>({...face,paint:paintColor(face.color)}));
  return (width,height,camera,scale,center,effects)=>{
    const cos=Math.cos(camera.yaw), sin=Math.sin(camera.yaw);
    const rise=Math.sin(camera.pitch), slope=Math.cos(camera.pitch);
    const facing=[sin*slope,rise,cos*slope];
    const polygons=[];
    for (const face of flat) {
      const actor=face.group>=2?effects.actors[face.group-2]:null;
      const [nx,ny,nz]=face.normal;
      const facingLight=actor ? (nx*actor.cos+nz*actor.sin)*facing[0]+ny*facing[1]+(nz*actor.cos-nx*actor.sin)*facing[2]
        : dot(face.normal,facing);
      if (facingLight<=0) continue;
      let depth=0;
      let modelY=0;
      const points=face.points.map(([x,y,z])=>{
        if (face.group===1) {
          modelY+=y;
          y=effects.ground+(y-effects.ground)*effects.growth+effects.lift;
        }
        if (actor) {
          const step=actor.stride*face.stride;
          const strideZ=z+step;
          z=actor.z+strideZ*actor.cos-x*actor.sin;
          x=actor.x+x*actor.cos+strideZ*actor.sin;
          y+=actor.y+Math.max(0,step)*.58;
        }
        const forward=x*sin+z*cos;
        const heightFromCenter=y-center;
        depth+=heightFromCenter*rise+forward*slope;
        return [width/2+camera.x+(x*cos-z*sin)*scale,
          height/2+camera.y-(heightFromCenter*slope-forward*rise)*scale];
      });
      if (points.every(([x])=>x<0) || points.every(([x])=>x>width) ||
          points.every(([,y])=>y<0) || points.every(([,y])=>y>height)) continue;
      const shimmer=Math.max(0,1-Math.abs(modelY/points.length-effects.sweep)/.7)*.36;
      const highlight=face.group===1?Math.min(.58,effects.highlight+shimmer):0;
      const paint=highlight ? paintColor(face.color.map((value,i)=>
        value+([1,.86,.46][i]-value)*highlight)) : face.paint;
      polygons.push({points,depth:depth/points.length,paint,layer:face.layer});
    }
    // Broad terrain faces must be drawn before buildings, regardless of their center depth.
    polygons.sort((a,b)=>(a.layer-b.layer)||a.depth-b.depth);
    context.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    context.fillStyle=background;
    context.fillRect(0,0,width,height);
    for (const {points,paint} of polygons) {
      context.beginPath();
      points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));
      context.closePath();
      context.fillStyle=context.strokeStyle=paint;
      context.lineWidth=.65;
      context.fill();
      context.stroke();
    }
  };
}

function webGLPainter(canvas, faces, background) {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true});
  if (!gl) return null;
  const shader=(kind,source)=>{
    const result=gl.createShader(kind);
    gl.shaderSource(result,source);
    gl.compileShader(result);
    return result;
  };
  const vertex=shader(gl.VERTEX_SHADER,`
    attribute vec3 position;
    attribute vec3 color;
    attribute float group;
    attribute float stride;
    uniform vec2 yaw;
    uniform vec2 pitch;
    uniform vec2 zoom;
    uniform vec2 pan;
    uniform float center;
    uniform vec4 reveal;
    uniform vec4 actorPose[3];
    uniform vec2 actorMotion[3];
    varying mediump vec3 shade;
    varying mediump float modelHeight;
    varying mediump float latest;
    void main() {
      vec3 pos = position;
      latest = group == 1.0 ? 1.0 : 0.0;
      modelHeight = pos.y;
      if (latest == 1.0) pos.y = reveal.z + (pos.y-reveal.z)*reveal.y + reveal.x;
      for (int i = 0; i < 3; i++) {
        if (group == 2.0+float(i)) {
          vec4 pose = actorPose[i];
          vec2 motion = actorMotion[i];
          float step = stride*motion.y;
          float z = pos.z+step;
          pos = vec3(pose.x+pos.x*pose.w+z*motion.x,pos.y+pose.y+max(0.0,step)*.58,
            pose.z+z*pose.w-pos.x*motion.x);
        }
      }
      float forward = pos.x*yaw.y + pos.z*yaw.x;
      float y = pos.y-center;
      vec2 point = vec2(pos.x*yaw.x-pos.z*yaw.y,y*pitch.x-forward*pitch.y);
      gl_Position = vec4(point*zoom+pan,-(y*pitch.y+forward*pitch.x)/160.0,1.0);
      shade = color;
    }
  `);
  const fragment=shader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    varying mediump vec3 shade;
    varying mediump float modelHeight;
    varying mediump float latest;
    uniform vec2 shine;
    void main() {
      float sweep = max(0.0,1.0-abs(modelHeight-shine.y)/.7)*.36;
      gl_FragColor = vec4(mix(shade,vec3(1.0,.86,.46),latest*min(.58,shine.x+sweep)),1.0);
    }
  `);
  const program=gl.createProgram();
  gl.attachShader(program,vertex);
  gl.attachShader(program,fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Prosjektvisningen kunne ikke bruke WebGL');
  gl.useProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  const data=[];
  for (const {points,color,vertexColors,group,origin,stride} of faces) {
    for (let i=origin?0:1;i<(origin?points.length:points.length-1);i++) {
      const next=(i+1)%points.length;
      data.push(...(origin??points[0]),...(vertexColors?.[0]??color),group,stride,
        ...points[i],...(vertexColors?.[i]??color),group,stride,
        ...points[next],...(vertexColors?.[next]??color),group,stride);
    }
  }
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  for (const [name,size,offset] of [['position',3,0],['color',3,12],['group',1,24],['stride',1,28]]) {
    const location=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,size,gl.FLOAT,false,32,offset);
  }
  const uniforms=Object.fromEntries(['yaw','pitch','zoom','pan','center','reveal','shine','actorPose[0]','actorMotion[0]']
    .map(name=>[name,gl.getUniformLocation(program,name)]));
  const actorPositions=new Float32Array(12),actorMovement=new Float32Array(6);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(...backgroundRGB(background),1);
  return {
    draw(width,height,camera,scale,center,effects) {
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(uniforms.yaw,Math.cos(camera.yaw),Math.sin(camera.yaw));
      gl.uniform2f(uniforms.pitch,Math.cos(camera.pitch),Math.sin(camera.pitch));
      gl.uniform2f(uniforms.zoom,2*scale/width,2*scale/height);
      gl.uniform2f(uniforms.pan,2*camera.x/width,-2*camera.y/height);
      gl.uniform1f(uniforms.center,center);
      gl.uniform4f(uniforms.reveal,effects.lift,effects.growth,effects.ground,0);
      gl.uniform2f(uniforms.shine,effects.highlight,effects.sweep);
      effects.actors.forEach(({x,y,z,cos,sin,stride},i)=>{
        actorPositions.set([x,y,z,cos],i*4);
        actorMovement.set([sin,stride],i*2);
      });
      gl.uniform4fv(uniforms['actorPose[0]'],actorPositions);
      gl.uniform2fv(uniforms['actorMotion[0]'],actorMovement);
      gl.drawArrays(gl.TRIANGLES,0,data.length/8);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

const MAX_ZOOM=4.5;

export function buildMotion(world, elapsed, ground, top, marked) {
  const t=clamp((elapsed-90)/725,0,1);
  const growing=t*t*(3-2*t);
  const settled=clamp((elapsed-700)/500,0,1);
  return {
    ground,
    growth:world ? Math.max(.012,growing) : 1,
    lift:world ? 0 : 3.8*(1-clamp((elapsed-230)/620,0,1))**3,
    highlight:marked ? .1+.22*(1-settled) : 0,
    sweep:world&&marked&&t>0&&t<1 ? ground+(top-ground)*growing : -999,
  };
}

export function mountProjectView(container, scene, interactive=false, {closeUp=false, reveal=false, demo=false}={}) {
  let canvas=container.querySelector('canvas');
  const faces=projectFaces(scene);
  let engine;
  if ((interactive || scene.world) && !demo) {
    try { engine=webGLPainter(canvas,faces,scene.background); }
    catch {
      const fallback=canvas.cloneNode();
      canvas.replaceWith(fallback);
      canvas=fallback;
    }
  }
  const paint=engine?.draw || canvasPainter(canvas,faces,scene.background);
  if (!paint) return ()=>{};
  const initial={yaw:scene.yaw,pitch:scene.pitch,zoom:1,x:0,y:0,anchorX:0,anchorZ:0,center:scene.center};
  const maxZoom=MAX_ZOOM*scene.size/(scene.closeSize??scene.size);
  const latest=scene.latest ?? [];
  const heights=faces.filter(face=>face.group===1).flatMap(face=>face.points.map(point=>point[1]));
  const low=heights.length ? Math.min(...heights) : 0;
  const high=heights.length ? Math.max(...heights) : 0;
  const average=key=>latest.length ? latest.reduce((sum,part)=>sum+part[key],0)/latest.length : 0;
  const detail=scene.world ? {...initial,zoom:maxZoom,anchorX:average('x'),anchorZ:average('z'),
    center:Math.max(1.8,average('y')+.6)}
    : {...initial,zoom:1.12};
  const camera={...initial};
  const pointers=new Map();
  let mode='move',frame=0,width=0,height=0;
  const events=new AbortController();
  const listen=(node,name,handler,options={})=>node.addEventListener(name,handler,{...options,signal:events.signal});
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let marked=reveal&&latest.length>0, started=null, from={...camera}, visible=true, lastFrame=-Infinity;
  if (closeUp && (!reveal || motion.matches || demo)) Object.assign(camera,detail);
  from={...camera};
  if (marked && !motion.matches) started=performance.now();

  function draw(now=performance.now()) {
    frame=0;
    if (!visible || document.hidden) return;
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    if (!width || !height) return;
    const playing=!motion.matches && started!==null;
    const alive=!motion.matches && scene.ambient?.length;
    if ((playing||alive) && now-lastFrame<(engine||playing?32:48)) { schedule(); return; }
    lastFrame=now;
    const pixelRatio=Math.min(window.devicePixelRatio||1,2);
    const pixelsWide=Math.round(width*pixelRatio),pixelsHigh=Math.round(height*pixelRatio);
    if (canvas.width!==pixelsWide || canvas.height!==pixelsHigh) {
      canvas.width=pixelsWide;
      canvas.height=pixelsHigh;
    }
    const elapsed=playing ? Math.max(0,now-started) : Infinity;
    if (playing) {
      const ease=1-(1-clamp(elapsed/680,0,1))**3;
      for (const key of Object.keys(detail)) camera[key]=from[key]+(detail[key]-from[key])*ease;
      if (elapsed>=1950) started=null;
    }
    const effects=buildMotion(scene.world,elapsed,low,high,marked);
    effects.actors=(scene.ambient??[]).map(actor=>actorPose(actor,motion.matches?0:now/1000));
    const scale=Math.min(width,height)*camera.zoom/scene.size;
    const forward=camera.anchorX*Math.sin(camera.yaw)+camera.anchorZ*Math.cos(camera.yaw);
    const position={...camera,
      x:camera.x-(camera.anchorX*Math.cos(camera.yaw)-camera.anchorZ*Math.sin(camera.yaw))*scale,
      y:camera.y-forward*Math.sin(camera.pitch)*scale,
    };
    paint(width,height,position,scale,camera.center,effects);
    if (started!==null || alive) schedule();
  }
  function schedule() {
    if (!frame) frame=requestAnimationFrame(draw);
  }
  function limitPan() {
    camera.x=clamp(camera.x,-width*camera.zoom*.63,width*camera.zoom*.63);
    camera.y=clamp(camera.y,-height*camera.zoom*.63,height*camera.zoom*.63);
  }
  function zoom(factor,x=width/2,y=height/2) {
    const next=clamp(camera.zoom*factor,.75,maxZoom);
    const ratio=next/camera.zoom;
    const dx=x-width/2, dy=y-height/2;
    camera.x=dx+(camera.x-dx)*ratio;
    camera.y=dy+(camera.y-dy)*ratio;
    camera.zoom=next;
    limitPan();
  }
  function drag(dx,dy) {
    if (mode==='rotate') {
      camera.yaw+=dx*.009;
      camera.pitch=clamp(camera.pitch-dy*.006,.06,1.36);
    } else {
      camera.x+=dx;
      camera.y+=dy;
      limitPan();
    }
  }
  function setMode(value) {
    mode=value;
    container.dataset.dragMode=mode;
    for (const button of container.querySelectorAll('[data-project-mode]')) {
      button.setAttribute('aria-pressed',String(button.dataset.projectMode===mode));
    }
    container.querySelector('[data-project-instructions]').textContent=mode==='rotate'
      ? 'Dra for å rotere. Klyp eller bruk pluss og minus for å zoome.'
      : 'Dra for å flytte. Klyp eller bruk pluss og minus for å zoome.';
  }
  function overview() {
    started=null;
    marked=false;
    Object.assign(camera,initial);
  }
  listen(container,'click',event=>{
    if (!event.target.closest('[data-project-latest]')) return;
    if (!interactive) canvas.scrollIntoView({block:'nearest'});
    from={...camera};
    marked=true;
    if (motion.matches) Object.assign(camera,detail);
    else started=performance.now();
    schedule();
  });

  if (interactive) {
    setMode('move');
    const position=event=>[event.clientX,event.clientY];
    const midpoint=([a,b],[c,d])=>[(a+c)/2,(b+d)/2];
    const distance=([a,b],[c,d])=>Math.hypot(a-c,b-d);
    listen(canvas,'pointerdown',event=>{
      if (event.button!==0 || pointers.size>=2) return;
      started=null;
      pointers.set(event.pointerId,position(event));
      canvas.setPointerCapture(event.pointerId);
    });
    listen(canvas,'pointermove',event=>{
      const old=pointers.get(event.pointerId);
      if (!old) return;
      const current=position(event);
      if (pointers.size===2) {
        const other=[...pointers].find(([id])=>id!==event.pointerId)[1];
        const [oldX,oldY]=midpoint(old,other),[newX,newY]=midpoint(current,other);
        const bounds=canvas.getBoundingClientRect();
        zoom(distance(current,other)/Math.max(1,distance(old,other)),oldX-bounds.left,oldY-bounds.top);
        camera.x+=newX-oldX;
        camera.y+=newY-oldY;
        limitPan();
      } else {
        drag(current[0]-old[0],current[1]-old[1]);
      }
      pointers.set(event.pointerId,current);
      schedule();
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      listen(canvas,name,event=>pointers.delete(event.pointerId));
    }
    listen(canvas,'wheel',event=>{
      event.preventDefault();
      started=null;
      const bounds=canvas.getBoundingClientRect();
      zoom(Math.exp(-clamp(event.deltaY,-130,130)*.0035),event.clientX-bounds.left,event.clientY-bounds.top);
      schedule();
    },{passive:false});
    listen(canvas,'keydown',event=>{
      const directions={ArrowLeft:[-32,0],ArrowRight:[32,0],ArrowUp:[0,-32],ArrowDown:[0,32]};
      if (Object.hasOwn(directions,event.key)) drag(...directions[event.key]);
      else if (event.key==='+' || event.key==='=') zoom(1.25);
      else if (event.key==='-') zoom(1/1.25);
      else if (event.key==='0') overview();
      else return;
      started=null;
      event.preventDefault();
      schedule();
    });
    listen(container,'click',event=>{
      const control=event.target.closest('button');
      if (control?.dataset.projectMode) setMode(control.dataset.projectMode);
      if (control?.dataset.projectZoom) { started=null; zoom(Number(control.dataset.projectZoom)); }
      if (control?.hasAttribute('data-project-reset')) overview();
      schedule();
    });
  }
  const observer=typeof ResizeObserver==='function' ? new ResizeObserver(schedule) : null;
  if (observer) observer.observe(canvas);
  else listen(window,'resize',schedule);
  listen(document,'visibilitychange',schedule);
  listen(motion,'change',()=>{
    if (motion.matches && started!==null) {
      Object.assign(camera,detail);
      started=null;
    }
    schedule();
  });
  const intersection=typeof IntersectionObserver==='function' ? new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if (visible) schedule();
  }) : null;
  intersection?.observe(canvas);
  draw();
  return ()=>{
    events.abort();
    observer?.disconnect();
    intersection?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    engine?.dispose();
  };
}
