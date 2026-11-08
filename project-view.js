const clamp = (value,min,max) => Math.max(min,Math.min(value,max));
const cross = ([ax,ay,az],[bx,by,bz]) => [ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];
const difference = (a,b) => a.map((value,i)=>value-b[i]);
const dot = (a,b) => a.reduce((sum,value,i)=>sum+value*b[i],0);

function partFaces({shape,x,y,z,w,d,h,outline}) {
  if (shape==='landscape') return [outline];
  if (shape==='tube') {
    const lower=Array.from({length:12},(_,i)=>{
      const angle=i*Math.PI/6;
      return [x+w*Math.cos(angle)/2,y,z+d*Math.sin(angle)/2];
    });
    const upper=lower.map(([a,b,c])=>[a,b+h,c]);
    return [lower,[...upper].reverse(),...lower.map((point,i)=>{
      const next=(i+1)%lower.length;
      return [point,upper[i],upper[next],lower[next]];
    })];
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

export function projectFaces(scene) {
  const light=[.24,.88,.4];
  const latest=new Set(scene.latest);
  return [...scene.parts,...(scene.ambient ?? [])].flatMap((part,i)=>[part,...studs(part)].flatMap(piece=>{
    const rgb=piece.color.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255);
    return partFaces(piece).map(points=>{
      const landscape=piece.shape==='landscape';
      const normal=landscape ? [0,1,0] : cross(difference(points[1],points[0]),difference(points[2],points[0]));
      const length=Math.hypot(...normal);
      const unit=normal.map(value=>value/length);
      const shade=landscape ? 1 : .68+.32*Math.max(0,dot(unit,light));
      return {points,normal:unit,color:rgb.map(value=>value*shade),layer:part.layer??Infinity,
        origin:landscape ? [piece.x,piece.y,piece.z] : null,
        group:i>=scene.parts.length?2:latest.has(part)?1:0};
    });
  }));
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
      if (dot(face.normal,facing)<=0) continue;
      let depth=0;
      const points=face.points.map(([x,y,z])=>{
        if (face.group===1) y+=effects.lift;
        if (face.group===2) {
          x+=effects.actor[0]; y+=effects.actor[1]; z+=effects.actor[2];
        }
        const forward=x*sin+z*cos;
        const heightFromCenter=y-center;
        depth+=heightFromCenter*rise+forward*slope;
        return [width/2+camera.x+(x*cos-z*sin)*scale,
          height/2+camera.y-(heightFromCenter*slope-forward*rise)*scale];
      });
      const paint=face.group===1&&effects.highlight ? paintColor(face.color.map((value,i)=>
        value+([1,.8,.24][i]-value)*effects.highlight)) : face.paint;
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
    uniform vec2 yaw;
    uniform vec2 pitch;
    uniform vec2 zoom;
    uniform vec2 pan;
    uniform float center;
    uniform vec2 reveal;
    uniform vec3 actor;
    varying vec3 shade;
    void main() {
      vec3 pos = position;
      if (group == 1.0) pos.y += reveal.x;
      if (group == 2.0) pos += actor;
      float forward = pos.x*yaw.y + pos.z*yaw.x;
      float y = pos.y-center;
      vec2 point = vec2(pos.x*yaw.x-pos.z*yaw.y,y*pitch.x-forward*pitch.y);
      gl_Position = vec4(point*zoom+pan,-(y*pitch.y+forward*pitch.x)/160.0,1.0);
      shade = group == 1.0 ? mix(color,vec3(1.0,.8,.24),reveal.y) : color;
    }
  `);
  const fragment=shader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    varying vec3 shade;
    void main() { gl_FragColor = vec4(shade,1.0); }
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
  for (const {points,color,group,origin} of faces) {
    for (let i=origin?0:1;i<(origin?points.length:points.length-1);i++) {
      for (const point of [origin??points[0],points[i],points[(i+1)%points.length]]) data.push(...point,...color,group);
    }
  }
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  for (const [name,size,offset] of [['position',3,0],['color',3,12],['group',1,24]]) {
    const location=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,size,gl.FLOAT,false,28,offset);
  }
  const uniforms=Object.fromEntries(['yaw','pitch','zoom','pan','center','reveal','actor'].map(name=>[name,gl.getUniformLocation(program,name)]));
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
      gl.uniform2f(uniforms.reveal,effects.lift,effects.highlight);
      gl.uniform3f(uniforms.actor,...effects.actor);
      gl.drawArrays(gl.TRIANGLES,0,data.length/7);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export function mountProjectView(container, scene, interactive=false, {closeUp=false, reveal=false}={}) {
  let canvas=container.querySelector('canvas');
  const faces=projectFaces(scene);
  let engine;
  if (interactive) {
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
  const latest=scene.latest ?? [];
  const average=key=>latest.length ? latest.reduce((sum,part)=>sum+part[key],0)/latest.length : 0;
  const detail=scene.world ? {...initial,zoom:2.25,anchorX:average('x'),anchorZ:average('z'),center:1.8}
    : {...initial,zoom:1.12};
  const camera={...initial};
  const pointers=new Map();
  let mode='move',frame=0,width=0,height=0;
  const events=new AbortController();
  const listen=(node,name,handler,options={})=>node.addEventListener(name,handler,{...options,signal:events.signal});
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let marked=reveal&&latest.length>0, started=null, from={...camera}, visible=true, lastFrame=-Infinity;
  if (closeUp && (!reveal || motion.matches)) Object.assign(camera,detail);
  if (marked && !motion.matches) started=performance.now();

  function draw(now=performance.now()) {
    frame=0;
    if (!visible || document.hidden) return;
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    if (!width || !height) return;
    const playing=!motion.matches && started!==null;
    const alive=!motion.matches && scene.ambient?.length;
    if ((playing||alive) && now-lastFrame<32) { schedule(); return; }
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
    const drop=clamp((elapsed-230)/620,0,1);
    const lift=(scene.world?5:3.8)*(1-drop)**3;
    const highlight=marked ? .19+.45*(1-clamp((elapsed-770)/950,0,1)) : 0;
    const phase=motion.matches ? 0 : now*.00034;
    const actor=scene.id==='island' ? [Math.sin(phase)*13,Math.sin(phase*9)*.25,Math.cos(phase)*5]
      : [Math.sin(phase)*.25,0,Math.sin(phase)*19];
    const scale=Math.min(width,height)*camera.zoom/scene.size;
    const forward=camera.anchorX*Math.sin(camera.yaw)+camera.anchorZ*Math.cos(camera.yaw);
    const position={...camera,
      x:camera.x-(camera.anchorX*Math.cos(camera.yaw)-camera.anchorZ*Math.sin(camera.yaw))*scale,
      y:camera.y-forward*Math.sin(camera.pitch)*scale,
    };
    paint(width,height,position,scale,camera.center,{lift,highlight,actor});
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
    const next=clamp(camera.zoom*factor,.75,4.5);
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
