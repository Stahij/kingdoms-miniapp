(()=>{'use strict';
if(!window.THREE)return;
const THREE=window.THREE;
const base=document.getElementById('scene');
const canvas=document.createElement('canvas');canvas.id='scene3d';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
document.body.insertBefore(canvas,base);if(base)base.style.opacity='0';
const mobile=matchMedia('(max-width:800px)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.25:1.6));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb9a477);scene.fog=new THREE.Fog(0xb9a477,42,95);
const viewSize=mobile?19:17;
const camera=new THREE.OrthographicCamera(-viewSize*innerWidth/innerHeight/2,viewSize*innerWidth/innerHeight/2,viewSize/2,-viewSize/2,.1,180);
const target=new THREE.Vector3(0,0,0);
scene.add(new THREE.HemisphereLight(0xffe7bd,0x5b4630,1.05));
const sun=new THREE.DirectionalLight(0xffd29a,2.6);sun.position.set(-16,24,12);sun.castShadow=true;sun.shadow.mapSize.set(mobile?768:1536,mobile?768:1536);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.bias=-.0003;scene.add(sun);
const fill=new THREE.DirectionalLight(0xe2e8ff,.45);fill.position.set(12,9,-8);scene.add(fill);
const root=new THREE.Group();scene.add(root);const modelCache={};let lastSignature='';
const modelSpecs={wall:'wall-fortified.glb',tower:'tower.glb',towerTop:'tower-top.glb',tree:'tree-large.glb'};
if(THREE.GLTFLoader){const loader=new THREE.GLTFLoader();for(const key of Object.keys(modelSpecs)){loader.load(new URL('assets/kenney/Models/GLB%20format/'+modelSpecs[key],new URL('three-renderer.js',location.href)).href,g=>{modelCache[key]=g.scene;lastSignature='';},undefined,e=>console.warn('Kenney model fallback:',key,e&&e.message));}}
function material(color,roughness=1,opts={}){return new THREE.MeshStandardMaterial({color,roughness,...opts})}
const M={
 sand:[0xc5a16a,0xd1b47e,0xb99158,0xd9bd87].map(c=>material(c)),
 dune:material(0xdcc38f),darkSand:material(0x9f7949),grass:material(0x667746),
 stone:material(0xaaa18c),stoneLight:material(0xc9bea6),stoneDark:material(0x6b6254),
 mortar:material(0x827766),wood:material(0x54341f),woodLight:material(0x8c5c30),
 roof:material(0x873d27),roofLight:material(0xb65c32),tile:material(0x9c482b),
 door:material(0x33231a),iron:material(0x45433b,0.65,{metalness:.35}),
 crop:material(0xb99b42),leaf:[0x536b32,0x6d813b,0x85934b].map(c=>material(c)),
 water:material(0x467d82,.35),gold:material(0xd3b46b)
};
function mesh(geo,mat,x,y,z,parent=root){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(w,h,d,mat,x,y,z,parent=root){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent)}
function grp(x=0,z=0,parent=root){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);return g}
function cylinder(rt,rb,h,mat,x,y,z,parent=root,n=8){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z,parent)}
function roof(g,w,d,h,mat,y){const a=mesh(new THREE.ConeGeometry(Math.max(w,d)*.76,h,4),mat,0,y,0,g);a.rotation.y=Math.PI/4;return a}
function addModel(key,x,z,scale,parent=root,rot=0){if(!modelCache[key])return false;const o=modelCache[key].clone(true);o.position.set(x,0,z);o.scale.setScalar(scale);o.rotation.y=rot;o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true}});parent.add(o);return true}
function createSandTexture(){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#c9a76f';ctx.fillRect(0,0,512,512);let seed=9321;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let i=0;i<21000;i++){const v=Math.floor(105+rnd()*90);ctx.fillStyle='rgba('+v+','+Math.floor(v*.78)+','+Math.floor(v*.5)+','+(rnd()*.22)+')';const s=rnd()*2.2+.3;ctx.fillRect(rnd()*512,rnd()*512,s,s)}for(let i=0;i<130;i++){const x=rnd()*512,y=rnd()*512;ctx.strokeStyle='rgba(105,75,39,.13)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5+rnd()*14,y-2+rnd()*5);ctx.stroke()}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.colorSpace=THREE.SRGBColorSpace;return t}
const sandMat=material(0xffffff,1,{map:createSandTexture()});
function createTileBoard(mode){const half=mode==='world'?17:11;const ground=mesh(new THREE.PlaneGeometry(half*2+1,half*2+1),sandMat,0,-.16,0,root);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
const tileMat=material(0x9a774c,.95,{transparent:true,opacity:.15});for(let i=-half;i<=half;i++){const a=box(half*2+.9,.012,.018,tileMat,0,-.075,i,root);const b=box(.018,.012,half*2+.9,tileMat,i,-.075,0,root)}
for(let i=0;i<55;i++){const x=Math.sin(i*73.11)*half*.92,z=Math.cos(i*23.51)*half*.92;const rock=mesh(new THREE.DodecahedronGeometry(.035+(i%4)*.018,0),M.darkSand,x,-.07,z,root);rock.scale.y=.45}
if(mode==='world'){const river=box(2.5,.018,half*2,M.water,4,-.08,0,root);river.rotation.y=-.23;for(let i=0;i<9;i++){const x=4+Math.sin(i*.8)*1.5,z=-8+i*2;const b=box(.5,.08,.32,M.stoneDark,x,-.04,z,root);b.rotation.y=-.23}}
}
function tower(g,x,z,scale=1){if(addModel('tower',x,z,scale,g))return;const s=scale;box(.98*s,1.7*s,.98*s,M.stone,x,.85*s,z,g);box(1.06*s,.13*s,1.06*s,M.stoneDark,x,1.68*s,z,g);box(1.04*s,.38*s,1.04*s,M.stoneLight,x,1.91*s,z,g);for(let i=0;i<4;i++)for(let j=0;j<2;j++)box(.2*s,.23*s,.22*s,M.stoneLight,x-.39*s+i*.26*s,2.17*s,z-.36*s+j*.72*s,g);box(.2*s,.45*s,.055*s,M.door,x,.24*s,z+.5*s,g);box(.12*s,.45*s,.12*s,M.iron,x+.25*s,.35*s,z+.5*s,g)}
function wallSegment(x,z,rot=0){if(addModel('wall',x,z,1,root,rot))return;const g=grp(x,z);g.rotation.y=rot;box(2,.92,.42,M.stone,0,.46,0,g);box(2.02,.11,.45,M.stoneDark,0,.94,0,g);for(let i=0;i<5;i++)box(.26,.27,.48,M.stoneLight,-.84+i*.42,1.12,0,g);for(let i=0;i<3;i++)box(.05,.04,.02,M.mortar,-.6+i*.6,.6,.218,g)}
function perimeter(){const g=grp();for(let x=-3;x<=3;x++){if(x!==0)wallSegment(x*1.65,-4.5,0);wallSegment(x*1.65,4.5,0)}for(let z=-2;z<=2;z++){wallSegment(-5,z*1.65,Math.PI/2);wallSegment(5,z*1.65,Math.PI/2)}tower(g,-5,-4.5,.9);tower(g,5,-4.5,.9);tower(g,-5,4.5,.9);tower(g,5,4.5,.9);tower(g,-1.65,-4.5,.78);tower(g,1.65,-4.5,.78); // gatehouse and open gate
box(2.8,1.15,.9,M.stoneDark,0,.58,4.5,g);box(1.12,1.4,.16,M.door,0,.7,4.03,g);box(3,.13,1,M.stoneLight,0,1.22,4.5,g);for(let i=-2;i<=2;i++)box(.3,.28,.42,M.stoneLight,i*.52,1.42,4.5,g)}
function keep(x,z,s=1){const g=grp(x,z);box(2.5*s,1.65*s,2.2*s,M.stone,0,.82*s,0,g);box(2.62*s,.13*s,2.32*s,M.stoneDark,0,1.67*s,0,g);for(let i=0;i<5;i++){box(.32*s,.24*s,.28*s,M.stoneLight,-.98*s+i*.49*s,1.83*s,1.05*s,g);box(.32*s,.24*s,.28*s,M.stoneLight,-.98*s+i*.49*s,1.83*s,-1.05*s,g)}box(.32*s,.24*s,2.1*s,M.stoneLight,-1.25*s,1.83*s,0,g);box(.32*s,.24*s,2.1*s,M.stoneLight,1.25*s,1.83*s,0,g);
box(1.1*s,2.45*s,1.05*s,M.stoneLight,0,2.15*s,-.1*s,g);box(1.16*s,.12*s,1.12*s,M.stoneDark,0,3.4*s,-.1*s,g);roof(g,1.1*s,1.1*s,.9*s,M.roof,3.9*s);box(.3*s,.7*s,.06*s,M.door,0,.35*s,1.11*s,g);for(let i=-1;i<=1;i++){box(.14*s,.35*s,.06*s,M.iron,i*.63*s,1.05*s,1.11*s,g)}for(const [x1,z1] of [[-1,-.85],[1,-.85],[-1,.85],[1,.85]])tower(g,x1*s,z1*s,.44*s)}
function hut(x,z){const g=grp(x,z);box(1.15,.88,.95,M.wood,0,.44,0,g);box(1.24,.12,1.04,M.woodLight,0,.87,0,g);const r=roof(g,1.35,1.1,.76,M.roof,1.26);r.scale.set(1.1,1,1);box(.22,.43,.06,M.door,0,.22,.49,g);box(.19,.23,.06,M.iron,-.31,.57,.49,g);box(.19,.23,.06,M.iron,.31,.57,.49,g);for(let i=0;i<3;i++)box(.045,.85,.045,M.woodLight,-.42+i*.42,.44,.51,g)}
function workshop(x,z,type){const g=grp(x,z);const stone=['mill','bakery','quarry','blacksmith'].includes(type);box(1.25,stone?1.05:.85,1.1,stone?M.stone:M.wood,0,stone?.52:.42,0,g);roof(g,1.45,1.3,.7,stone?M.roofLight:M.roof,stone?1.35:1.1);box(.2,.45,.06,M.door,0,.22,.57,g);if(type==='woodcutter'){for(let i=0;i<3;i++){const log=cylinder(.12,.12,.85,M.woodLight,-.75+i*.18,.12,.68,g,8);log.rotation.z=Math.PI/2}}if(type==='mill'){const pole=box(.08,1.8,.08,M.woodLight,.82,1.1,-.2,g);pole.rotation.z=.25;for(let i=0;i<4;i++){const sail=box(.12,.75,.06,M.stoneLight,.82,1.2,-.2,g);sail.rotation.z=i*Math.PI/2}}
if(type==='quarry')for(let i=0;i<4;i++)mesh(new THREE.DodecahedronGeometry(.2,0),M.stoneLight,-.5+i*.28,.13,.72,g);
if(type==='blacksmith')box(.35,.3,.3,M.iron,.72,.18,.25,g)}
function farm(x,z){const g=grp(x,z);box(1.9,.04,1.55,M.grass,0,.015,0,g);for(let i=0;i<6;i++){const row=box(.075,.09,1.35,M.crop,-.78+i*.31,.08,0,g);row.rotation.y=.08}for(let i=0;i<3;i++)box(.05,.11,1.38,M.woodLight,-.9+i*.9,.07,0,g)}
function tree(x,z,s=1){if(addModel('tree',x,z,s))return;const g=grp(x,z);cylinder(.12*s,.18*s,.7*s,M.wood,0,.35*s,0,g,7);for(let i=0;i<3;i++){const c=mesh(new THREE.ConeGeometry((.58-i*.1)*s,.92*s,7),M.leaf[i],0,(.75+i*.43)*s,0,g);c.rotation.y=.25}}
function building(b){const x=Number(b.x)||0,z=Number(b.y)||0;switch(b.type){case'keep':keep(x,z,.95);break;case'fort':keep(x,z,.72);break;case'hut':hut(x,z);break;case'farm':farm(x,z);break;case'woodcutter':case'quarry':case'mill':case'bakery':case'blacksmith':workshop(x,z,b.type);break;case'barracks':workshop(x,z,'barracks');break;case'ox':{const g=grp(x,z);box(.85,.42,.38,M.wood,0,.4,0,g);cylinder(.22,.22,.5,M.stoneLight,.42,.57,0,g,7);for(let i=0;i<4;i++)box(.08,.32,.08,M.wood,-.28+(i%2)*.56,.16,(i<2?-.13:.13),g);break}}}
function rebuild(state,mode,world){while(root.children.length)root.remove(root.children[0]);createTileBoard(mode);if(mode!=='world'){perimeter();if(state&&Array.isArray(state.buildings)){for(const b of state.buildings)building(b)}else if(state&&state.buildings&&typeof state.buildings==='object'){for(const [key,type] of Object.entries(state.buildings)){const [x,y]=key.split(',').map(Number);building({type,x,y})}}}else{if(world&&world.forts){for(const f of world.forts)keep(Number(f.x)||0,Number(f.y)||0,.68)}for(let i=0;i<40;i++){const x=Math.sin(i*31.2)*15,z=Math.cos(i*13.8)*15;tree(x,z,.55+(i%3)*.15)}}for(let i=0;i<(mode==='world'?12:18);i++){const x=Math.sin(i*41.7)*(mode==='world'?15:10),z=Math.cos(i*19.3)*(mode==='world'?15:10);if(Math.abs(x)>6||Math.abs(z)>6)tree(x,z,.5+(i%4)*.12)}}
function render(state,mode,world,offset,zoom){const sig=JSON.stringify([mode,state&&state.buildings,world&&world.forts]);if(sig!==lastSignature){rebuild(state,mode,world);lastSignature=sig}target.set(-(offset?.x||0)*.012,0,-(offset?.y||0)*.012);const dist=mode==='world'?30:24;camera.position.set(target.x+dist*.8,target.y+dist*1.1,target.z+dist*.8);camera.lookAt(target);const zf=Math.max(.65,Math.min(1.8,zoom||1));camera.zoom=zf;camera.updateProjectionMatrix();renderer.render(scene,camera)}
function resize(){camera.left=-viewSize*innerWidth/innerHeight/2;camera.right=viewSize*innerWidth/innerHeight/2;camera.top=viewSize/2;camera.bottom=-viewSize/2;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);lastSignature='';}
addEventListener('resize',resize);
function cellAt(px,py,mode,offset,zoom){const pointer=new THREE.Vector2(px/innerWidth*2-1,-py/innerHeight*2+1);const raycaster=new THREE.Raycaster();raycaster.setFromCamera(pointer,camera);const ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);const hit=new THREE.Vector3();if(!raycaster.ray.intersectPlane(ground,hit))return null;return{x:Math.round(hit.x),y:Math.round(hit.z)}}
window.Kingdoms3D={render,cellAt};
})();