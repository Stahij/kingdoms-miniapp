(()=>{'use strict';
if(!window.THREE)return;
const base=document.getElementById('scene');
const canvas=document.createElement('canvas');canvas.id='scene3d';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';document.body.insertBefore(canvas,base);
base.style.opacity='0';
const mobile=matchMedia('(max-width:800px)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.1:1.4));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9eaa83);scene.fog=new THREE.Fog(0x9eaa83,48,100);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,160);
const target=new THREE.Vector3(0,0,0);
scene.add(new THREE.HemisphereLight(0xfff0d2,0x69503a,1.35));
const sun=new THREE.DirectionalLight(0xffd08a,3.2);sun.position.set(-12,22,14);sun.castShadow=!mobile;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;scene.add(sun);
const root=new THREE.Group();scene.add(root);
const modelCache={};
const modelSpecs={wall:'wall-fortified.glb',tower:'tower.glb',towerTop:'tower-top.glb',tree:'tree-large.glb'};
if(THREE.GLTFLoader){
 const gltfLoader=new THREE.GLTFLoader();
 Object.keys(modelSpecs).forEach(key=>{
  gltfLoader.load('/assets/kenney/Models/GLB%20format/'+modelSpecs[key],gltf=>{
   modelCache[key]=gltf.scene;
   lastSignature='';
  },undefined,error=>console.warn('Kenney GLB failed:',key,error));
 });
}
function addModel(key,x,y,z,scale,parent=root,rotationY=0){
 if(!modelCache[key])return false;
 const object=modelCache[key].clone(true);
 object.position.set(x,y,z);object.scale.setScalar(scale);object.rotation.y=rotationY;
 object.traverse(child=>{if(child.isMesh){child.castShadow=!mobile;child.receiveShadow=true;}});
 parent.add(object);return true;
}
const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const mats={sand:[0xc8a365,0xd7b678,0xc39a5d,0xb58b50].map(c=>mat(c)),grass:[0x8a965b,0x7e8d50,0x9aa16a].map(c=>mat(c)),stone:mat(0xb7b3a4),darkStone:mat(0x6e7068),wood:mat(0x704225),roof:mat(0x9b4f2c),roof2:mat(0x77503a),water:mat(0x347e8c,.35),green:[0x3f6b35,0x547e3d,0x6b8d46].map(c=>mat(c)),gold:mat(0xd5b66e),door:mat(0x3c2b20),white:mat(0xe2d8bd)};
function mesh(geo,material,x,y,z,parent=root){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=!mobile;m.receiveShadow=true;parent.add(m);return m}
function box(w,h,d,material,x,y,z,parent=root){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent)}
function group(x,z){const g=new THREE.Group();g.position.set(x,0,z);root.add(g);return g}
function tree(x,z,s=1){if(addModel('tree',x,0,z,s))return;const g=group(x,z);mesh(new THREE.CylinderGeometry(.11*s,.16*s,.75*s,7),mats.wood,0,.37*s,0,g);for(let i=0;i<3;i++)mesh(new THREE.ConeGeometry((.58-i*.1)*s,.85*s,7),mats.green[i],0,(.8+i*.43)*s,0,g)}
function tower(g,x,z,s=1){box(.9*s,1.6*s,.9*s,mats.stone,x,.8*s,z,g);box(.94*s,.14*s,.94*s,mats.darkStone,x,1.65*s,z,g);for(let i=0;i<4;i++)box(.17*s,.26*s,.2*s,mats.white,x-.34*s+i*.22*s,1.84*s,z,g);box(.19*s,.48*s,.08*s,mats.door,x,.25*s,z+.47*s,g);box(.98*s,.12*s,.98*s,mats.darkStone,x,1.48*s,z,g)}
function keep(x,z,s=1){const g=group(x,z);box(2.3*s,1.5*s,2*s,mats.stone,0,.75*s,0,g);box(2.38*s,.13*s,2.08*s,mats.darkStone,0,1.52*s,0,g);box(.6*s,2.4*s,.6*s,mats.stone,0,1.2*s,-.05*s,g);box(.68*s,.14*s,.68*s,mats.darkStone,0,2.4*s,-.05*s,g);mesh(new THREE.ConeGeometry(.56*s,.7*s,4),mats.roof,0,2.82*s,-.05*s,g);box(.3*s,.65*s,.09*s,mats.door,0,.33*s,1.02*s,g);for(const [tx,tz] of [[-1,-.8],[1,-.8],[-1,.8],[1,.8]]){if(!addModel('tower',tx*s,0,tz*s,.65*s,g))tower(g,tx,tz,.65*s)}for(let i=-1;i<=1;i++){addModel('wall',i*.72*s,0,-1.25*s,.65*s,g);addModel('wall',i*.72*s,0,1.25*s,.65*s,g,Math.PI);addModel('wall',-1.25*s,0,i*.72*s,.65*s,g,-Math.PI/2);addModel('wall',1.25*s,0,i*.72*s,.65*s,g,Math.PI/2)}}
function hut(x,z){const g=group(x,z);box(1.15,.82,.9,mats.wood,0,.41,0,g);box(.08,.65,.08,mats.stone,-.44,.35,.48,g);box(.08,.65,.08,mats.stone,.44,.35,.48,g);mesh(new THREE.ConeGeometry(.92,.7,4),mats.roof,0,1.13,0,g).rotation.y=Math.PI/4;box(.2,.42,.05,mats.door,0,.21,.47,g);box(.13,.18,.06,mats.white,-.28,.55,.47,g)}
function mill(x,z){const g=group(x,z);box(1.2,1.25,1,mats.stone,0,.62,0,g);mesh(new THREE.ConeGeometry(.9,.65,4),mats.roof,0,1.55,0,g).rotation.y=Math.PI/4;box(.16,.5,.07,mats.door,0,.25,.52,g);box(.05,1.8,.05,mats.wood,.3,1.4,-.55,g);box(.05,1.8,.05,mats.wood,-.3,1.4,-.55,g)}
function farm(x,z){const g=group(x,z);box(1.8,.06,1.4,mats.grass[1],0,.04,0,g);for(let i=0;i<5;i++){const r=box(.055,.07,1.1,mats.gold,-.72+i*.36,.09,0,g);r.rotation.y=.12}}
function building(b){const x=Number(b.x)||0,z=Number(b.y)||0;switch(b.type){case'keep':keep(x,z,1.12);break;case'fort':keep(x,z,.85);break;case'hut':hut(x,z);break;case'woodcutter':case'quarry':case'mill':case'bakery':case'blacksmith':mill(x,z);break;case'farm':farm(x,z);break;case'barracks':{const g=group(x,z);box(1.6,1,1.2,mats.stone,0,.5,0,g);mesh(new THREE.ConeGeometry(1.15,.65,4),mats.roof,0,1.3,0,g);box(.24,.5,.06,mats.door,0,.25,.63,g);break}case'ox':{const g=group(x,z);mesh(new THREE.BoxGeometry(.75,.45,.35),mats.wood,0,.45,0,g);mesh(new THREE.SphereGeometry(.22,8,6),mats.wood,.4,.65,0,g);for(let i=0;i<4;i++)box(.08,.38,.08,mats.wood,-.25+(i%2)*.5,.19,(i<2?-.12:.12),g);break}}}
let lastSignature='',tileGroup;
function rebuild(state,mode,world){while(root.children.length)root.remove(root.children[0]);tileGroup=new THREE.Group();root.add(tileGroup);
const half=mode==='world'?15:9;
for(let x=-half;x<=half;x++)for(let z=-half;z<=half;z++){const v=Math.abs(Math.sin(x*17.3+z*71.7));const tile=mesh(new THREE.BoxGeometry(.995,.07,.995),v>.86?mats.grass[Math.floor(v*10)%3]:mats.sand[Math.floor(v*10)%4],x,-.08,z,tileGroup);tile.receiveShadow=true}
if(mode!=='world'){for(let x=-4;x<=4;x++)for(let z=-3;z<=3;z++){if(Math.abs(x)>3||Math.abs(z)>2)box(1,.2,1,mats.darkStone,x,.02,z,tileGroup)}}
else{const river=box(2,.015,40,mats.water,3,-.005,0,tileGroup);river.rotation.y=.28}
if(state&&Array.isArray(state.buildings)){for(const b of state.buildings)building(b)}
else if(state&&state.buildings&&typeof state.buildings==='object'){for(const [key,type] of Object.entries(state.buildings)){const [x,y]=key.split(',').map(Number);building({type,x,y})}}
for(let i=0;i<28;i++){const x=Math.sin(i*41.7)*half*.88,z=Math.cos(i*19.3)*half*.88;tree(x,z,.55+(i%4)*.13)}
if(mode==='world'&&world){for(const f of (world.forts||[])){const x=Number(f.x)||0,z=Number(f.y)||0;keep(x,z,.65)}}
}
function render(state,mode,world,offset,zoom){if(!window.THREE)return;const sig=JSON.stringify([mode,state&&state.buildings,world&&world.forts]);if(sig!==lastSignature){rebuild(state,mode,world);lastSignature=sig}target.set(-(offset?.x||0)*.012,0,-(offset?.y||0)*.012);const dist=(mode==='world'?28:14)/(zoom||1);camera.position.set(target.x+dist*.76,dist*.92,target.z+dist*.9);camera.lookAt(target);renderer.render(scene,camera)}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render(window.__kingdomsState,'castle',{}, {x:0,y:0},1)}
addEventListener('resize',resize);
window.Kingdoms3D={render};
})();
