const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#171e24");
}

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");

const state = {
  food: 1000, wood: 800, stone: 500, gold: 300,
  zoom: 1, camX: 0, camY: 0,
  dragging: false, lastX: 0, lastY: 0,
  selected: null
};

const kingdoms = [
  {x:0,y:0,name:"Твоё королевство",color:"#d6a84b",player:true,power:100},
  {x:-430,y:-170,name:"Северный союз",color:"#b64d4d",power:72},
  {x:380,y:-250,name:"Волчьи земли",color:"#9b5bb5",power:91},
  {x:510,y:300,name:"Каменная держава",color:"#4e82b8",power:118},
  {x:-390,y:360,name:"Зелёное княжество",color:"#4d9b63",power:64},
];

const resources = [];
for(let i=0;i<90;i++){
  resources.push({
    x:(Math.random()-0.5)*1800,
    y:(Math.random()-0.5)*1200,
    type:["tree","stone","food"][Math.floor(Math.random()*3)]
  });
}

function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=canvas.clientWidth*dpr;
  canvas.height=canvas.clientHeight*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}
window.addEventListener("resize",resize);

function worldToScreen(x,y){
  return {
    x:canvas.clientWidth/2+(x-state.camX)*state.zoom,
    y:canvas.clientHeight/2+(y-state.camY)*state.zoom
  };
}

function draw(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  ctx.fillStyle="#17251b";ctx.fillRect(0,0,w,h);

  const grid=64*state.zoom;
  ctx.strokeStyle="#24402b";ctx.lineWidth=1;
  const ox=(( -state.camX*state.zoom)%grid+w)%grid;
  const oy=(( -state.camY*state.zoom)%grid+h)%grid;
  for(let x=ox;x<w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=oy;y<h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}

  resources.forEach(r=>{
    const p=worldToScreen(r.x,r.y);
    if(p.x<-30||p.x>w+30||p.y<-30||p.y>h+30)return;
    ctx.font=`${Math.max(13,18*state.zoom)}px sans-serif`;
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(r.type==="tree"?"🌲":r.type==="stone"?"🪨":"🌾",p.x,p.y);
  });

  kingdoms.forEach(k=>{
    const p=worldToScreen(k.x,k.y);
    if(p.x<-100||p.x>w+100||p.y<-100||p.y>h+100)return;
    const s=Math.max(26,42*state.zoom);
    ctx.fillStyle=k.color;
    ctx.beginPath();ctx.arc(p.x,p.y,s/2,0,Math.PI*2);ctx.fill();
    ctx.font=`${Math.max(18,26*state.zoom)}px sans-serif`;
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(k.player?"🏰":"🏯",p.x,p.y);
    ctx.font="bold 12px Arial";ctx.fillStyle="#fff";
    ctx.fillText(k.name,p.x,p.y+s/2+15);
  });

  ctx.fillStyle="#fff8";
  ctx.font="11px Arial";
  ctx.textAlign="left";
  ctx.fillText("Перемещай карту пальцем • Нажми на поселение",12,18);
}

function selectKingdom(k){
  state.selected=k;
  info.classList.remove("hidden");
  info.innerHTML = k.player
    ? "<b>🏰 Твоя столица</b><br>Сила: "+k.power+"<br><small>Здесь позже появятся здания, армия и производство.</small>"
    : "<b>🏯 "+k.name+"</b><br>Сила: "+k.power+"<br><button id='attackBtn'>⚔️ Разведать</button>";
  document.getElementById("attackBtn")?.addEventListener("click",()=>{
    info.innerHTML="<b>🔭 Разведка завершена</b><br>"+k.name+" имеет силу "+k.power+".";
  });
}

canvas.addEventListener("pointerdown",e=>{
  state.dragging=true;state.lastX=e.clientX;state.lastY=e.clientY;
});
canvas.addEventListener("pointermove",e=>{
  if(!state.dragging)return;
  state.camX-=(e.clientX-state.lastX)/state.zoom;
  state.camY-=(e.clientY-state.lastY)/state.zoom;
  state.lastX=e.clientX;state.lastY=e.clientY;draw();
});
canvas.addEventListener("pointerup",()=>state.dragging=false);
canvas.addEventListener("pointercancel",()=>state.dragging=false);
canvas.addEventListener("click",e=>{
  const rect=canvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left-canvas.clientWidth/2)/state.zoom+state.camX;
  const my=(e.clientY-rect.top-canvas.clientHeight/2)/state.zoom+state.camY;
  let nearest=null,dist=Infinity;
  kingdoms.forEach(k=>{const d=Math.hypot(k.x-mx,k.y-my);if(d<dist){dist=d;nearest=k}});
  if(nearest && dist<65/state.zoom)selectKingdom(nearest);
});

document.getElementById("center").onclick=()=>{
  state.camX=0;state.camY=0;state.zoom=1;draw();
};
document.getElementById("build").onclick=()=>{
  info.classList.remove("hidden");
  info.innerHTML="<b>🏗️ Строительство</b><br>В первой версии здесь будут: ферма, лесопилка, каменоломня и казармы.";
};
document.getElementById("army").onclick=()=>{
  info.classList.remove("hidden");
  info.innerHTML="<b>⚔️ Армия</b><br>Пока доступна разведка. Следующим этапом добавим войска и походы.";
};
document.getElementById("menuBtn").onclick=()=>{
  info.classList.remove("hidden");
  info.innerHTML="<b>☰ Kingdoms</b><br>Версия 0.1 — первый прототип.";
};

const user= tg?.initDataUnsafe?.user;
if(user){
  document.getElementById("welcome").textContent="Правитель "+(user.first_name||"игрок");
}

resize();
