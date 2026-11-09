function triangleDepth(point,a,b,c) {
  const [x,y]=point;
  const dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1];
  const determinant=dx*ey-dy*ex;
  if (Math.abs(determinant)<.0001) return -Infinity;
  const u=((x-a[0])*ey-(y-a[1])*ex)/determinant;
  const v=(dx*(y-a[1])-dy*(x-a[0]))/determinant;
  if (u<0||v<0||u+v>1) return -Infinity;
  return a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);
}

export function landmarkAt(faces,view,x,y) {
  if (!view||!view.scale) return null;
  const {camera,scale,width,height,effects}=view;
  const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw);
  const rise=Math.sin(camera.pitch),slope=Math.cos(camera.pitch);
  const direction=[s*slope,rise,c*slope];
  const point=[(x-width*.5-camera.x)/scale,(height*.5+camera.y-y)/scale];
  let nearest=null,depth=-Infinity;
  for (const face of faces) {
    if (!Number.isInteger(face.landmark)||face.group===1&&effects.growth===0) continue;
    if (face.normal.reduce((sum,v,i)=>sum+v*direction[i],0)<=0) continue;
    const project=([x,y,z])=>{
      const forward=x*s+z*c;
      const drawn=face.group===1?effects.ground+(y-effects.ground)*effects.growth+effects.lift:y;
      const top=drawn-camera.center;
      return [x*c-z*s,top*slope-forward*rise,top*rise+forward*slope];
    };
    const points=face.points.map(project);
    const origin=face.origin?project(face.origin):points[0];
    if (!face.origin&&point.some((value,i)=>points.every(p=>p[i]>value)||points.every(p=>p[i]<value))) continue;
    for (let i=face.origin?0:1;i<(face.origin?points.length:points.length-1);i++) {
      const distance=triangleDepth(point,origin,points[i],points[(i+1)%points.length]);
      if (distance>depth) {
        nearest=face.landmark;
        depth=distance;
      }
    }
  }
  return nearest;
}
