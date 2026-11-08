import {actorPose,MAX_ACTORS} from './scenery.js';
import {horizonImage} from './map-art.js';

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

function baseFaces({shape,x,y,z,w,d,h,outline,profile,axis='y',angle=0,from,to,width,phase=0}) {
  if (shape==='landscape'||shape==='terrain') return [outline];
  if (shape==='support') return ringFaces([outline,outline.map(([x,,z])=>[x,y+h,z])]);
  if (shape==='beam') {
    const delta=difference(to,from);
    const perpendicular=cross(delta,Math.abs(delta[1])>Math.hypot(delta[0],delta[2])?[1,0,0]:[0,1,0]);
    const normal=v=>v.map(value=>value/Math.hypot(...v)*width*.5);
    const a=normal(perpendicular),b=normal(cross(delta,perpendicular));
    return ringFaces([from,to].map(point=>[[-1,1],[1,1],[1,-1],[-1,-1]]
      .map(([u,v])=>point.map((value,i)=>value+a[i]*u+b[i]*v))));
  }
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
  if (shape==='boulder') {
    const rings=[[0,.84],[.39,1],[.81,.73],[1,.28]].map(([level,radius],j)=>
      Array.from({length:7},(_,i)=>{
        const theta=i*Math.PI*2/7;
        const r=radius*(.81+.21*Math.sin(i*4.2+phase)+.13*Math.cos(i*2.4+phase));
        return [x+Math.cos(theta)*w*r*.5+w*j*.032,y+h*(level+(j>0&&j<3?.105*Math.sin(i*1.9+phase):0)),
          z+Math.sin(theta)*d*r*.5-d*j*.035];
      }));
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

function partFaces(part) {
  const faces=baseFaces(part);
  if (!part.angle||['dome','landscape','terrain','beam','support'].includes(part.shape)) return faces;
  const c=Math.cos(part.angle),s=Math.sin(part.angle);
  return faces.map(face=>face.map(([x,y,z])=>[
    part.x+(x-part.x)*c-(z-part.z)*s,y,part.z+(x-part.x)*s+(z-part.z)*c,
  ]));
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
  const light=scene.illustrated?[-.47,.77,.43]:[.28,.84,.43];
  const latest=new Set(scene.latest);
  const haze=backgroundRGB(scene.background??'#e5f0e8');
  const layers=[scene.parts, ...(scene.ambient ?? []).map(actor=>actor.parts)];
  return layers.flatMap((parts,layerIndex)=>parts.flatMap(part=>[part,...studs(part)].flatMap(piece=>{
    const rgb=piece.color.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255);
    const shaded=normal=>{
      const illumination=Math.max(0,dot(normal,light));
      const reflection=Math.max(0,illumination-.72)**2*.34;
      if (scene.illustrated) {
        const tint=scene.id==='moon'?[.023,.027,.054]:[.027,.042,.049];
        const sun=[.077,.055,.023];
        return rgb.map((value,i)=>clamp(value*(.63+.32*illumination)+tint[i]*(1-illumination)+sun[i]*illumination+reflection,0,1));
      }
      return rgb.map(value=>Math.min(1,value*(.62+.37*illumination)+reflection));
    };
    return partFaces(piece).map((points,faceIndex)=>{
      const landscape=piece.shape==='landscape';
      const sign=faceIndex===0?1:-1;
      const normal=landscape ? [0,1,0] : piece.shape==='plate' ? [-sign*Math.sin(piece.angle??0),0,sign*Math.cos(piece.angle??0)]
        : cross(difference(points[1],points[0]),difference(points[2],points[0]));
      const length=Math.hypot(...normal);
      const unit=normal.map(value=>value/length);
      const fade=color=>color.map((value,i)=>value+(haze[i]-value)*(piece.fog??0));
      const vertexColors=piece.colors??(piece.shape==='dome'&&faceIndex>0 ? points.map(point=>fade(shaded(domeNormal(piece,point)))) : null);
      const color=landscape ? fade(rgb) : vertexColors ? rgb.map((_,i)=>vertexColors.reduce((sum,vertex)=>sum+vertex[i],0)/points.length) : fade(shaded(unit));
      return {points,normal:unit,color,vertexColors,alphas:piece.alphas,smooth:Boolean(piece.colors),layer:part.layer??Infinity,hinge:piece.hinge,
        origin:landscape||piece.radial ? [piece.x,piece.y,piece.z] : null,
        group:layerIndex?layerIndex+1:latest.has(part)?1:0,stride:part.stride??0};
    });
  })));
}

function backgroundRGB(hex) {
  return hex.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255);
}

function triangleGradient(context,points,colors,alphas,solid,paintColor) {
  const [[ax,ay],[bx,by],[cx,cy]]=points;
  const determinant=(bx-ax)*(cy-ay)-(cx-ax)*(by-ay);
  if (Math.abs(determinant)<.05) return solid;
  // Terrain tint and mist vary gradually over each triangle.
  const values=alphas&&Math.max(...alphas)-Math.min(...alphas)>.01?alphas:colors.map(([r,g,b])=>.29*r+.53*g+.18*b);
  const low=Math.min(...values),high=Math.max(...values);
  if (high-low<.005) return solid;
  const dx=((values[1]-values[0])*(cy-ay)-(values[2]-values[0])*(by-ay))/determinant;
  const dy=((bx-ax)*(values[2]-values[0])-(cx-ax)*(values[1]-values[0]))/determinant;
  const span=(high-low)/(dx*dx+dy*dy);
  const [x,y]=points[values.indexOf(low)];
  const gradient=context.createLinearGradient(x,y,x+dx*span,y+dy*span);
  colors.forEach((color,i)=>gradient.addColorStop((values[i]-low)/(high-low),paintColor(color,alphas?.[i])));
  return gradient;
}

function splitWideFace(face) {
  const points=face.points;
  if (Number.isFinite(face.layer)||face.group>=2||face.vertexColors||points.length<3) return [face];
  const spans=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))-Math.min(...points.map(p=>p[i])));
  if (spans.filter(span=>span>2.8).length<2) return [face];
  const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  if (points.length===4) {
    const [a,b,c,d]=points;
    const along=Math.ceil(Math.hypot(...difference(b,a))/2.5);
    const across=Math.ceil(Math.hypot(...difference(d,a))/2.5);
    const point=(u,v)=>blend(blend(a,b,u),blend(d,c,u),v);
    return Array.from({length:along*across},(_,i)=>{
      const u=(i%along)/along,v=Math.floor(i/along)/across;
      const endU=u+1/along,endV=v+1/across;
      return {...face,points:[point(u,v),point(endU,v),point(endU,endV),point(u,endV)]};
    });
  }
  const center=[0,1,2].map(i=>points.reduce((sum,p)=>sum+p[i],0)/points.length);
  return points.map((point,i)=>({...face,points:[center,point,points[(i+1)%points.length]]}));
}

function canvasPainter(canvas, faces, background, transparent) {
  const context=canvas.getContext('2d');
  if (!context) return null;
  const paintColor=(color,alpha=1)=>`rgba(${color.map(channel=>Math.round(channel*255)).join(',')},${alpha})`;
  // Smaller surfaces keep thin signs, roofs and ride tracks sorted correctly in Canvas.
  const flat=faces.flatMap(splitWideFace).map(face=>{
    const alpha=face.alphas ? face.alphas.reduce((sum,value)=>sum+value,0)/face.alphas.length : 1;
    return {...face,paint:paintColor(face.color,alpha)};
  });
  const terrain=flat.filter(face=>Number.isFinite(face.layer));
  const objects=flat.filter(face=>!Number.isFinite(face.layer));
  const backing=terrain.length?canvas.ownerDocument.createElement('canvas'):null;
  const groundContext=backing?.getContext('2d');
  let viewKey;

  return (width,height,camera,scale,center,effects)=>{
    const cos=Math.cos(camera.yaw), sin=Math.sin(camera.yaw);
    const rise=Math.sin(camera.pitch), slope=Math.cos(camera.pitch);
    const facing=[sin*slope,rise,cos*slope];
    function drawFaces(surface,list) {
      const polygons=[];
      for (const face of list) {
        const actor=face.group>=2?effects.actors[face.group-2]:null;
        let [nx,ny,nz]=face.normal;
        if (actor&&!face.hinge&&(actor.rollCos!==1||actor.rollSin)) {
          [nx,ny]=[nx*actor.rollCos-ny*actor.rollSin,nx*actor.rollSin+ny*actor.rollCos];
        }
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
            if (actor.rollCos!==1||actor.rollSin) {
              const [px,py]=face.hinge??[x,y];
              x+=px*actor.rollCos-py*actor.rollSin-px;
              y+=px*actor.rollSin+py*actor.rollCos-py;
            }
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
        polygons.push({points,depth:depth/points.length,paint,layer:face.layer,colors:face.smooth?face.vertexColors:null,alphas:face.alphas});
      }
      polygons.sort((a,b)=>(a.layer-b.layer)||a.depth-b.depth);
      for (const {points,paint,colors,alphas} of polygons) {
        surface.beginPath();
        points.forEach(([x,y],i)=>i?surface.lineTo(x,y):surface.moveTo(x,y));
        surface.closePath();
        surface.fillStyle=surface.strokeStyle=colors?triangleGradient(surface,points,colors,alphas,paint,paintColor):paint;
        surface.lineWidth=alphas&&Math.min(...alphas)<.98?.21:.65;
        surface.fill();
        surface.stroke();
      }
    }
    const sx=canvas.width/width,sy=canvas.height/height;
    context.setTransform(sx,0,0,sy,0,0);
    if (groundContext) {
      // Actors can move while the same projected landscape is reused.
      const key=[canvas.width,canvas.height,width,height,camera.yaw,camera.pitch,camera.x,camera.y,scale,center].join(',');
      if (key!==viewKey) {
        if (backing.width!==canvas.width||backing.height!==canvas.height) {
          backing.width=canvas.width; backing.height=canvas.height;
        }
        groundContext.setTransform(sx,0,0,sy,0,0);
        if (transparent) groundContext.clearRect(0,0,width,height);
        else { groundContext.fillStyle=background; groundContext.fillRect(0,0,width,height); }
        drawFaces(groundContext,terrain);
        viewKey=key;
      }
      if (transparent) context.clearRect(0,0,width,height);
      context.drawImage(backing,0,0,width,height);
      drawFaces(context,objects);
    } else {
      if (transparent) context.clearRect(0,0,width,height);
      else { context.fillStyle=background; context.fillRect(0,0,width,height); }
      drawFaces(context,flat);
    }
  };
}

function webGLPainter(canvas, faces, background, transparent, illustrated) {
  const gl=canvas.getContext('webgl',{alpha:transparent,antialias:true});
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
    attribute vec3 hinge;
    attribute float alpha;
    uniform vec2 yaw;
    uniform vec2 pitch;
    uniform vec2 zoom;
    uniform vec2 pan;
    uniform float center;
    uniform vec4 reveal;
    uniform vec4 actorPose[${MAX_ACTORS}];
    uniform vec4 actorMotion[${MAX_ACTORS}];
    varying mediump vec3 shade;
    varying mediump float modelHeight;
    varying mediump float latest;
    varying mediump float coverage;
    void main() {
      vec3 pos = position;
      latest = group == 1.0 ? 1.0 : 0.0;
      modelHeight = pos.y;
      if (latest == 1.0) pos.y = reveal.z + (pos.y-reveal.z)*reveal.y + reveal.x;
      for (int i = 0; i < ${MAX_ACTORS}; i++) {
        if (group == 2.0+float(i)) {
          vec4 pose = actorPose[i];
          vec4 motion = actorMotion[i];
          vec2 pivot = hinge.z > .5 ? hinge.xy : pos.xy;
          pos.xy += vec2(pivot.x*motion.z-pivot.y*motion.w,pivot.x*motion.w+pivot.y*motion.z)-pivot;
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
      coverage = alpha;
    }
  `);
  const fragment=shader(gl.FRAGMENT_SHADER,`
    precision mediump float;
    varying mediump vec3 shade;
    varying mediump float modelHeight;
    varying mediump float latest;
    varying mediump float coverage;
    uniform vec2 shine;
    void main() {
      float sweep = max(0.0,1.0-abs(modelHeight-shine.y)/.7)*.36;
      vec3 color = mix(shade,vec3(1.0,.86,.46),latest*min(.58,shine.x+sweep));
      ${illustrated?'color += (fract(52.9829 * fract(dot(gl_FragCoord.xy,vec2(.06711,.00583))))-.5)*.022;':''}
      gl_FragColor = vec4(color,coverage);
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
  for (const {points,color,vertexColors,group,origin,stride,hinge,alphas} of faces) {
    const pivot=hinge?[...hinge,1]:[0,0,0];
    for (let i=origin?0:1;i<(origin?points.length:points.length-1);i++) {
      const next=(i+1)%points.length;
      data.push(...(origin??points[0]),...(vertexColors?.[0]??color),group,stride,...pivot,alphas?.[0]??1,
        ...points[i],...(vertexColors?.[i]??color),group,stride,...pivot,alphas?.[i]??1,
        ...points[next],...(vertexColors?.[next]??color),group,stride,...pivot,alphas?.[next]??1);
    }
  }
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  for (const [name,size,offset] of [['position',3,0],['color',3,12],['group',1,24],['stride',1,28],['hinge',3,32],['alpha',1,44]]) {
    const location=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,size,gl.FLOAT,false,48,offset);
  }
  const uniforms=Object.fromEntries(['yaw','pitch','zoom','pan','center','reveal','shine','actorPose[0]','actorMotion[0]']
    .map(name=>[name,gl.getUniformLocation(program,name)]));
  const actorPositions=new Float32Array(MAX_ACTORS*4),actorMovement=new Float32Array(MAX_ACTORS*4);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  if (transparent) {
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  }
  gl.clearColor(...(transparent?[0,0,0,0]:[...backgroundRGB(background),1]));
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
      effects.actors.forEach(({x,y,z,cos,sin,stride,rollCos,rollSin},i)=>{
        actorPositions.set([x,y,z,cos],i*4);
        actorMovement.set([sin,stride,rollCos,rollSin],i*4);
      });
      gl.uniform4fv(uniforms['actorPose[0]'],actorPositions);
      gl.uniform4fv(uniforms['actorMotion[0]'],actorMovement);
      gl.drawArrays(gl.TRIANGLES,0,data.length/12);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

const MAX_ZOOM=4.5;
const turnToward=(from,to)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from));

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

export function projectCameras(scene,target=null) {
  const initial={yaw:scene.world?-Math.PI/4:scene.yaw,pitch:scene.world?.6155:scene.pitch,zoom:1,
    x:0,y:0,anchorX:scene.anchorX??0,anchorZ:scene.anchorZ??0,center:scene.center};
  const maxZoom=Math.max(1.15,MAX_ZOOM*scene.size/(scene.closeSize??scene.size));
  const latest=scene.latest??[];
  if (!scene.world||(!target&&!latest.length)) {
    return {initial,maxZoom,context:initial,detail:{...initial,zoom:scene.world?1:1.12}};
  }
  const average=key=>latest.reduce((sum,part)=>sum+part[key],0)/latest.length;
  const point=target??scene.latestTarget??{x:average('x'),y:Math.max(0,average('y')-.6),z:average('z'),height:4.2};
  const close={...initial,zoom:maxZoom,anchorX:point.x,anchorZ:point.z,center:point.y+(point.height??6)*.37};
  const neighbor=Object.values(scene.landmarks??{}).filter(other=>Math.hypot(other.x-point.x,other.z-point.z)>.7)
    .reduce((nearest,other)=>!nearest||Math.hypot(other.x-point.x,other.z-point.z)<Math.hypot(nearest.x-point.x,nearest.z-point.z)?other:nearest,null);
  const context={...initial,zoom:clamp(scene.size/41,1,maxZoom),center:point.y+1.35,
    anchorX:neighbor?point.x*.77+neighbor.x*.23:point.x,
    anchorZ:neighbor?point.z*.77+neighbor.z*.23:point.z};
  return {initial,maxZoom,context,detail:target||scene.finished?close:context};
}

export function finishTransition(elapsed) {
  const t=clamp((elapsed-190)/910,0,1);
  return {travel: t*t*(3-2*t),opacity:1-.31*Math.sin(Math.PI*t)};
}

export function mountProjectView(container, scene, interactive=false, {closeUp=false, reveal=false, demo=false,target=null,still=false}={}) {
  let canvas=container.querySelector('canvas');
  const faces=projectFaces(scene);
  const transparent=Boolean(scene.horizon);
  let engine;
  if (interactive || scene.world && !still) {
    try { engine=webGLPainter(canvas,faces,scene.background,transparent,scene.illustrated); }
    catch {
      const fallback=canvas.cloneNode();
      canvas.replaceWith(fallback);
      canvas=fallback;
    }
  }
  if (transparent) {
    canvas.style.backgroundImage=horizonImage(scene.horizon,scene.background);
    canvas.style.backgroundSize='100% 100%';
  } else {
    canvas.style.removeProperty('background-image');
    canvas.style.removeProperty('background-size');
  }
  const paint=engine?.draw || canvasPainter(canvas,faces,scene.background,transparent);
  if (!paint) return ()=>{};
  const {initial,maxZoom,context,detail}=projectCameras(scene,target);
  const latest=scene.latest ?? [];
  const heights=faces.filter(face=>face.group===1).flatMap(face=>face.points.map(point=>point[1]));
  const low=heights.length ? Math.min(...heights) : 0;
  const high=heights.length ? Math.max(...heights) : 0;
  const camera={...initial};
  const pointers=new Map();
  let mode='move',frame=0,width=0,height=0;
  const events=new AbortController();
  const listen=(node,name,handler,options={})=>node.addEventListener(name,handler,{...options,signal:events.signal});
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let marked=reveal&&latest.length>0, started=null, from={...camera}, visible=true, lastFrame=-Infinity;
  const completedBuild=scene.world&&Boolean(scene.finished)&&!target;
  if (target || closeUp && (!reveal || motion.matches || demo&&!scene.world)) Object.assign(camera,detail);
  else if (reveal&&scene.world) Object.assign(camera,context);
  from={...camera};
  if (marked && !motion.matches) started=performance.now();

  function draw(now=performance.now()) {
    frame=0;
    if (!visible || document.hidden) return;
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    if (!width || !height) return;
    const playing=!motion.matches && started!==null;
    const alive=!still && !motion.matches && scene.ambient?.length;
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
      const finish=completedBuild?finishTransition(elapsed):null;
      const ease=finish?.travel??(1-(1-clamp(elapsed/680,0,1))**3);
      for (const key of Object.keys(detail)) {
        const target=key==='yaw'?turnToward(from.yaw,detail.yaw):detail[key];
        camera[key]=from[key]+(target-from[key])*ease;
      }
      if (finish) canvas.style.opacity=finish.opacity.toFixed(3);
      if (elapsed>=1950) stopTransition();
    }
    const effects=buildMotion(scene.world,elapsed,low,high,marked);
    effects.actors=(scene.ambient??[]).map(actor=>actorPose(actor,still||motion.matches?0:now/1000));
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
    if (mode==='rotate'&&!scene.world) {
      camera.yaw+=dx*.009;
      camera.pitch=clamp(camera.pitch-dy*.006,.06,1.36);
    } else {
      camera.x+=dx;
      camera.y+=dy;
      limitPan();
    }
  }
  function setMode(value) {
    mode=scene.world?'move':value;
    container.dataset.dragMode=mode;
    for (const button of container.querySelectorAll('[data-project-mode]')) {
      button.setAttribute('aria-pressed',String(button.dataset.projectMode===mode));
    }
    container.querySelector('[data-project-instructions]').textContent=mode==='rotate'
      ? 'Dra for å rotere. Klyp eller bruk pluss og minus for å zoome.'
      : 'Dra for å flytte. Klyp eller bruk pluss og minus for å zoome.';
  }
  function stopTransition() {
    started=null;
    canvas.style.removeProperty('opacity');
  }
  function overview() {
    stopTransition();
    marked=false;
    Object.assign(camera,initial);
  }
  listen(container,'click',event=>{
    if (!event.target.closest('[data-project-latest]')) return;
    if (!interactive) canvas.scrollIntoView({block:'nearest'});
    if (completedBuild) Object.assign(camera,context);
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
      stopTransition();
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
      stopTransition();
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
      stopTransition();
      event.preventDefault();
      schedule();
    });
    listen(container,'click',event=>{
      const control=event.target.closest('button');
      if (control?.dataset.projectMode) setMode(control.dataset.projectMode);
      if (control?.dataset.projectZoom) { stopTransition(); zoom(Number(control.dataset.projectZoom)); }
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
      stopTransition();
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
