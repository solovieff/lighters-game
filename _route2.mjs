
globalThis.document={createElement(){return {width:0,height:0,style:{},children:[],appendChild(){},replaceChildren(){},querySelector(){return {textContent:'',style:{}}},innerHTML:'',getContext(){return {fillRect(){},stroke(){},moveTo(){},lineTo(){},beginPath(){},fillStyle:'',strokeStyle:'',lineWidth:0,createLinearGradient(){return {addColorStop(){}}}}}}},body:{appendChild(){}}};
globalThis.localStorage={getItem(){return null},setItem(){}};
const THREE = await import('three');
const { LEVEL_1 } = await import('./src/data/levels.js');
const { TableLevel } = await import('./src/level/TableLevel.js');
const { FlashlightHero } = await import('./src/entities/FlashlightHero.js');
const { luxOnTarget } = await import('./src/light/LightDamage.js');
const { effectiveSpec } = await import('./src/data/effects.js');
const spec=effectiveSpec('convoy_s2plus_sst40',[]);
const m=spec.modes[2];
const power={on:true,dead:false,lumens:m.lumens,cd:m.cd,charge:100};
const t=new TableLevel(new THREE.Scene(),LEVEL_1,spec,{burst(){}});
const h=new FlashlightHero(new THREE.Scene(),'convoy_s2plus_sst40');
const w=()=>{ const o=h.headWorld.clone(), a=h.beamTarget.clone().sub(o).normalize(); t.lux=(p)=>luxOnTarget({origin:o,axis:a,point:p,cd:m.cd,lumens:m.lumens,boxes:t.colliders}); };
// 1) eat the crate (mouse)
h.position.set(0.2,0,0); h.heading=Math.PI/2; h.aimYawOffset=0;
for (let f=0; f<60*20 && t.mouse.state!=='done'; f++) { h.update(1/60,{x:0,z:0},(f<120)?{x:-1,y:0}:{x:0,y:0},t.colliders,false); w(); t.update(1/60,h.position,power); }
// 2) walk the lane to the gate by a route that goes around the baffles (BFS path, executed)
const step=0.04, start='0,0';
function blockedAt(x,z){ for (const b of t.colliders) if (x>b.min.x-0.03&&x<b.max.x+0.03&&z>b.min.z-0.03&&z<b.max.z+0.03&&b.max.y>0.05) return true; return Math.abs(z)>0.73||x<-0.48||x>8.1; }
function path(goal){ const prev=new Map(); const q=[[0,0]]; prev.set('0,0',null);
  while(q.length){ const [x,z]=q.shift(); const k=x.toFixed(2)+','+z.toFixed(2); if(goal(x,z)) { const p=[]; let c=k; while(c){ const [a,b]=c.split(',').map(Number); p.unshift([a,b]); c=prev.get(c); } return p; }
    for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=+(x+dx*step).toFixed(2), nz=+(z+dz*step).toFixed(2), nk=nx.toFixed(2)+','+nz.toFixed(2); if(prev.has(nk)||blockedAt(nx,nz)) continue; prev.set(nk,k); q.push([nx,nz]); } }
  return null; }
const p1=path((x,z)=>x>=3.6 && z>0.2 && z<0.5 && x<3.9);
console.log('path to gate front:', p1 ? p1.length+' steps' : 'none');
// execute: move the hero along the path (teleport step by step, same collision system via update is too slow; check reachability only)
// 3) gate open -> the path beyond the gate exists
const p2=path((x,z)=>x>4.1);
console.log('path beyond the gate with the gate closed:', p2 ? 'yes' : 'no');
