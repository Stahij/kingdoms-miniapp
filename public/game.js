'use strict';
(() => {
const canvas=document.getElementById('scene'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const STORE='kingdoms-crusader-save-v1';
let state=load(),mode='castle',selected=null,offset={x:0,y:0},zoom=1,drag=null,lastPinch=0,world={players:[],alliances:[],marches:[],forts:[]},socket=null,player=null,alliance=null;
const COLORS={sand:'#c5a66b',light:'#e2ca91',stone:'#a89a7b',shadow:'#66543b',wood:'#70502e',green:'#7b8548',water:'#3e8491'};
const TYPES={keep:'Замок',hut:'Хижина',woodcutter:'Лесопилка',farm:'Ферма',mill:'Мельница',bakery:'Пекарня',quarry:'Каменоломня',ox:'Волы',blacksmith:'Кузница',barracks:'Казармы',fort:'Форт'};
function load(){try{const x=JSON.parse(localStorage.getItem(STORE));if(x&&x.buildings&&x.resources)return x;}catch(e){}return Economy.initial();}
function save(){localStorage.setItem(STORE,JSON.stringify(state));toast('Сохранение записано на этом устройстве.');}
function toast(s){const el=$('toast');el.textContent=s;el.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.display='none',2600);}
function resize(){const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(innerWidth*d);canvas.height=Math.floor(innerHeight*d);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);draw();}
addEventListener('resize',resize);
function project(x,y){const cx=innerWidth*.54+offset.x,cy=innerHeight*.48+offset.y,s=zoom*28;return{x:cx+(x-y)*s,y:cy+(x+y)*s*.48};}
function polygon(points,fill,stroke,lw=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function diamond(x,y,w,h,fill,stroke){polygon([{x,y:y-h/2},{x:x+w/2,y},{x,y:y+h/2},{x:x-w/2,y}],fill,stroke,.7);}
function isoRect(x,y,w,h,color,side){const p=project(x,y),sx=zoom*28,sy=sx*.48,a={x:p.x-w*sx/2,y:p.y-h*sy/2},b={x:p.x+w*sx/2,y:p.y-h*sy/2},c={x:p.x+w*sx/2,y:p.y+h*sy/2},d={x:p.x-w*sx/2,y:p.y+h*sy/2};polygon([a,b,c,d],color,'#655640');polygon([d,c,{x:c.x,y:c.y+zoom*9},{x:d.x,y:d.y+zoom*9}],side||'#75634a','#4c402d');}
function text(str,x,y,size=11,color='#fff0c9'){ctx.font='bold '+size+'px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#282016c9';ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);}
function seeded(x,y,n=0){let v=Math.sin(x*127.1+y*311.7+n*74.7)*43758.5453;return v-Math.floor(v);}
function shadow(x,y,rx,ry){ctx.save();ctx.fillStyle='rgba(48,35,19,.24)';ctx.beginPath();ctx.ellipse(x+zoom*4,y+zoom*5,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();}
const TILE_PALETTES={sand:['#d4a574','#c5a66b','#b89860','#d9b77e'],grass:['#7b8548','#6b7a3c','#879052','#788345'],stone:['#a89a7b','#8a8a7a','#b4a68b'],dirt:['#9d8054','#ad8b5b','#8e744d'],water:['#3e8491','#2b6b7a','#4b9299'],road:['#b79b70','#c7ac7b','#a68c64']};
function drawTile(x,y,type='sand',variant=0){const p=project(x,y),s=zoom,w=60*s,h=30*s,pal=TILE_PALETTES[type]||TILE_PALETTES.sand,c=pal[Math.floor(seeded(x,y,variant)*pal.length)];polygon([{x:p.x,y:p.y-h/2},{x:p.x+w/2,y:p.y},{x:p.x,y:p.y+h/2},{x:p.x-w/2,y:p.y}],c,'rgba(82,66,42,.25)',.7*s);
 const r=seeded(x,y,variant+5);ctx.save();ctx.lineCap='round';
 if(type==='sand'){for(let i=0;i<4;i++){const dx=(seeded(x,y,i+3)-.5)*w*.7,dy=(seeded(y,x,i+8)-.5)*h*.5;ctx.strokeStyle=i%2?'rgba(255,229,174,.28)':'rgba(116,78,39,.14)';ctx.lineWidth=s;ctx.beginPath();ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx+5*s,p.y+dy-1.4*s);ctx.stroke();}if(r>.68){ctx.fillStyle='#90764b';ctx.beginPath();ctx.ellipse(p.x+(r-.5)*w*.45,p.y-h*.04,2*s,1*s,-.2,0,7);ctx.fill();}}
 else if(type==='grass'){for(let i=0;i<5;i++){const dx=(seeded(x,y,i+1)-.5)*w*.7,dy=(seeded(y,x,i+2)-.5)*h*.55;ctx.strokeStyle=i%2?'rgba(46,74,35,.35)':'rgba(220,207,133,.35)';ctx.lineWidth=.8*s;ctx.beginPath();ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx-1.4*s,p.y+dy-3*s);ctx.stroke();}}
 else if(type==='stone'||type==='road'){for(let i=0;i<4;i++){const dx=(i-1.5)*7*s,dy=(seeded(x,y,i+10)-.5)*8*s;ctx.strokeStyle='rgba(72,64,49,.23)';ctx.beginPath();ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx+4*s,p.y+dy-1*s);ctx.stroke();}}
 else if(type==='water'){const phase=(Date.now()/700+x*19+y*11)%6;for(let i=0;i<3;i++){const dx=(i-1)*10*s;ctx.strokeStyle='rgba(182,229,213,.45)';ctx.lineWidth=1*s;ctx.beginPath();ctx.moveTo(p.x+dx-3*s,p.y+(i-1)*3*s);ctx.quadraticCurveTo(p.x+dx+phase*s,p.y+(i-1)*3*s-2*s,p.x+dx+4*s,p.y+(i-1)*3*s);ctx.stroke();}}
 ctx.restore();}
function drawTree(x,y,kind=0){const p=project(x,y),s=zoom;shadow(p.x,p.y,9*s,4*s);ctx.fillStyle='#61482c';ctx.beginPath();ctx.moveTo(p.x-2*s,p.y);ctx.lineTo(p.x-1*s,p.y-18*s);ctx.lineTo(p.x+2*s,p.y-18*s);ctx.lineTo(p.x+4*s,p.y);ctx.fill();const layers=kind===1?2:3;for(let i=0;i<layers;i++){const yy=p.y-(13+i*7)*s,ww=(kind===1?9:12-i)*s;polygon([{x:p.x,y:yy-13*s},{x:p.x-ww,y:yy+5*s},{x:p.x+ww,y:yy+5*s}],['#536b37','#657a3e','#788849'][i%3],'#40542e',.6*s);ctx.strokeStyle='rgba(210,196,126,.24)';ctx.beginPath();ctx.moveTo(p.x,p.y-(16+i*7)*s);ctx.lineTo(p.x-ww*.45,p.y-(7+i*7)*s);ctx.stroke();}}
function shrub(x,y,i=0){const p=project(x,y),s=zoom;shadow(p.x,p.y,5*s,2*s);for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(p.x+(j-1)*3*s,p.y-j%2*2*s,4*s,3*s,0,0,7);ctx.fillStyle=['#596d35','#718342','#83904a'][(i+j)%3];ctx.fill();}}
function flag(x,y,color='#a83d2e'){const s=zoom;ctx.strokeStyle='#473321';ctx.lineWidth=1.2*s;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-19*s);ctx.stroke();polygon([{x,y:y-19*s},{x:x+10*s,y:y-16*s},{x,y:y-12*s}],color,'#5b3322',.6*s);}
function drawSprite(name,x,y,width,height){const s=zoom;ctx.save();ctx.translate(x,y);ctx.scale(width/60,height/60);if(name==='barrel'){ctx.fillStyle='#78502e';ctx.beginPath();ctx.ellipse(30,45,12,5,0,0,7);ctx.fill();ctx.fillStyle='#98683b';ctx.fillRect(18,25,24,20);ctx.fillStyle='#c1a06b';ctx.fillRect(18,29,24,3);ctx.fillRect(18,40,24,3);ctx.beginPath();ctx.ellipse(30,25,12,5,0,0,7);ctx.fillStyle='#b1814c';ctx.fill();}else if(name==='hay'){for(let i=0;i<3;i++){ctx.fillStyle=['#c5a34f','#d4b760','#a98a40'][i];ctx.beginPath();ctx.ellipse(30+(i-1)*6,43-i*4,15,7,0,0,7);ctx.fill();}}else if(name==='guard'){ctx.fillStyle='#5c4b35';ctx.fillRect(25,30,10,20);ctx.fillStyle='#a7a08b';ctx.fillRect(22,29,16,13);ctx.fillStyle='#d6b98a';ctx.beginPath();ctx.arc(30,23,7,0,7);ctx.fill();ctx.fillStyle='#6e6a5d';ctx.beginPath();ctx.arc(30,21,8,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(22,21,16,3);ctx.fillStyle='#8b5130';ctx.fillRect(23,39,14,3);}ctx.restore();}
function drawHouseBody(p,w,h,wall,roof,kind){const s=zoom;shadow(p.x,p.y,w*19*s,7*s);polygon([{x:p.x-w*15*s,y:p.y-7*s},{x:p.x,y:p.y+2*s},{x:p.x+w*15*s,y:p.y-7*s},{x:p.x,y:p.y-16*s}], '#8e7856','#5b4a34',.8*s);
 // front and side walls, with warm lit face
 polygon([{x:p.x-w*15*s,y:p.y-7*s},{x:p.x,y:p.y+2*s},{x:p.x,y:p.y-h*s},{x:p.x-w*15*s,y:p.y-(h+8)*s}],wall,'#604b32',.8*s);
 polygon([{x:p.x,y:p.y+2*s},{x:p.x+w*15*s,y:p.y-7*s},{x:p.x+w*15*s,y:p.y-(h+8)*s},{x:p.x,y:p.y-h*s}],shade(wall,.78),'#604b32',.8*s);
 if(kind==='log'){for(let i=0;i<Math.floor(h/4);i++){ctx.strokeStyle='rgba(77,48,26,.45)';ctx.lineWidth=1*s;ctx.beginPath();ctx.moveTo(p.x-w*14*s,p.y-(9+i*4)*s);ctx.lineTo(p.x-1*s,p.y-(1+i*4)*s);ctx.stroke();}}
 polygon([{x:p.x-w*18*s,y:p.y-(h+7)*s},{x:p.x,y:p.y-(h+21)*s},{x:p.x+w*18*s,y:p.y-(h+7)*s},{x:p.x,y:p.y-(h-1)*s}],roof,'#5a3c27',1*s);
 ctx.strokeStyle='rgba(232,190,120,.34)';ctx.lineWidth=s;for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(p.x-w*16*s+i*w*8*s,p.y-(h+8+i%2*2)*s);ctx.lineTo(p.x-w*2*s+i*w*2*s,p.y-(h-1)*s);ctx.stroke();}
 // door and window
 ctx.fillStyle='#493020';ctx.fillRect(p.x-3*s,p.y-13*s,6*s,14*s);ctx.fillStyle='#c5a66b';ctx.fillRect(p.x+1*s,p.y-7*s,1.2*s,1.2*s);
 ctx.fillStyle='#4a3a29';ctx.fillRect(p.x-w*10*s,p.y-(h-2)*s,5*s,5*s);ctx.fillStyle='#dfc88e';ctx.fillRect(p.x-w*10*s+1*s,p.y-(h-1)*s,3*s,3*s);ctx.strokeStyle='#634a2e';ctx.strokeRect(p.x-w*10*s,p.y-(h-2)*s,5*s,5*s);
}
function shade(hex,f){const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return '#8d795b';const n=parseInt(m[1],16);return '#'+[16,8,0].map(k=>Math.max(0,Math.min(255,Math.round(((n>>k)&255)*f))).toString(16).padStart(2,'0')).join('');}
function drawKeep(b,isFort=false){const p=project(b.x,b.y),s=zoom,w=isFort?20:27,h=isFort?25:38;shadow(p.x,p.y,w*s,8*s);
 // thick castle curtain walls with visible side faces
 polygon([{x:p.x-w*s,y:p.y-8*s},{x:p.x,y:p.y+4*s},{x:p.x+w*s,y:p.y-8*s},{x:p.x+w*s,y:p.y-24*s},{x:p.x,y:p.y-12*s},{x:p.x-w*s,y:p.y-24*s}], '#8b897a','#555246',1*s);
 polygon([{x:p.x-w*s,y:p.y-24*s},{x:p.x,y:p.y-12*s},{x:p.x,y:p.y-h*s},{x:p.x-w*s,y:p.y-(h+12)*s}], '#aaa28d','#666052',1*s);
 polygon([{x:p.x,y:p.y-12*s},{x:p.x+w*s,y:p.y-24*s},{x:p.x+w*s,y:p.y-(h+12)*s},{x:p.x,y:p.y-h*s}], '#817f71','#555246',1*s);
 // stone courses and merlons
 for(let k=0;k<4;k++){ctx.strokeStyle='rgba(68,61,49,.35)';ctx.lineWidth=.8*s;ctx.beginPath();ctx.moveTo(p.x-w*s,p.y-(27+k*6)*s);ctx.lineTo(p.x,p.y-(15+k*6)*s);ctx.lineTo(p.x+w*s,p.y-(27+k*6)*s);ctx.stroke();}
 for(let i=0;i<5;i++){ctx.fillStyle='#b8b09a';ctx.fillRect(p.x-w*s+i*w*.48*s,p.y-(h+15)*s,5*s,6*s);ctx.fillRect(p.x+i*w*.48*s,p.y-(h+15)*s,5*s,6*s);}
 // central keep tower
 ctx.fillStyle='#b8ad95';ctx.fillRect(p.x-10*s,p.y-(h+19)*s,20*s,h*.65);ctx.fillStyle='#8b8574';ctx.fillRect(p.x,p.y-(h+19)*s,10*s,h*.65);
 for(let i=0;i<4;i++){ctx.fillStyle='#c5baa0';ctx.fillRect(p.x-11*s+i*6*s,p.y-(h+23)*s,4*s,5*s);}
 ctx.fillStyle='#4c3424';ctx.fillRect(p.x-4*s,p.y-16*s,8*s,17*s);ctx.fillStyle='#d0b77e';ctx.fillRect(p.x+2*s,p.y-9*s,1.4*s,1.4*s);
 // arrow slits
 for(const dx of [-w*.58,w*.58])for(let j=0;j<2;j++){ctx.fillStyle='#4b4a40';ctx.fillRect(p.x+dx*s-1*s,p.y-(h*.45+j*8)*s,2*s,5*s);}
 flag(p.x+3*s,p.y-(h+25)*s,isFort?'#a9a13d':'#a83d2e');
}
function building(b){const p=project(b.x,b.y),s=zoom;if(b.type==='keep'||b.type==='fort'){drawKeep(b,b.type==='fort');text(b.type==='keep'?'КРЕПОСТЬ':'ФОРТ',p.x,p.y-(b.type==='keep'?61:47)*s,10*s);return;}
 const defs={
 hut:{w:.9,h:16,wall:'#c0a477',roof:'#8b5130',kind:'thatch',label:'Хижина'},
 woodcutter:{w:1.2,h:19,wall:'#ad8956',roof:'#705035',kind:'log',label:'Лесопилка'},
 farm:{w:1.3,h:7,wall:'#a4a05a',roof:'#a7a05a',kind:'field',label:'Ферма'},
 mill:{w:1.05,h:30,wall:'#c1a16c',roof:'#795035',kind:'mill',label:'Мельница'},
 bakery:{w:1,h:15,wall:'#cbb58a',roof:'#8d5734',kind:'house',label:'Пекарня'},
 quarry:{w:1.3,h:9,wall:'#a6a294',roof:'#77766b',kind:'stone',label:'Каменоломня'},
 ox:{w:1,h:8,wall:'#b6a17d',roof:'#69513c',kind:'ox',label:'Волы'},
 blacksmith:{w:1.1,h:17,wall:'#a7a08b',roof:'#56433a',kind:'smith',label:'Кузница'},
 barracks:{w:1.35,h:21,wall:'#aaa18a',roof:'#625b4a',kind:'house',label:'Казармы'}
 };const q=defs[b.type]||defs.hut;
 if(q.kind==='field'){shadow(p.x,p.y,25*s,7*s);polygon([{x:p.x-27*s,y:p.y},{x:p.x,y:p.y-12*s},{x:p.x+27*s,y:p.y},{x:p.x,y:p.y+12*s}],'#96914c','#635d36',.8*s);for(let i=-3;i<=3;i++){ctx.strokeStyle='#c5b36b';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(p.x+i*6*s,p.y-7*s);ctx.lineTo(p.x+i*6*s+7*s,p.y+6*s);ctx.stroke();}for(let i=0;i<4;i++){ctx.strokeStyle='#65733a';ctx.beginPath();ctx.moveTo(p.x+(i-2)*9*s,p.y);ctx.lineTo(p.x+(i-2)*9*s+2*s,p.y-5*s);ctx.stroke();}}
 else if(q.kind==='stone'){shadow(p.x,p.y,25*s,7*s);for(let i=0;i<5;i++){const xx=p.x+(i-2)*9*s,yy=p.y-(i%2)*5*s;polygon([{x:xx-7*s,y:yy},{x:xx-4*s,y:yy-8*s},{x:xx+3*s,y:yy-11*s},{x:xx+8*s,y:yy-3*s},{x:xx+5*s,y:yy+2*s}],['#8e8c7d','#aaa795','#77786c'][i%3],'#625f52',.8*s);}ctx.fillStyle='#6b5941';ctx.fillRect(p.x-4*s,p.y-8*s,8*s,8*s);}
 else if(q.kind==='ox'){drawHouseBody(p,q.w,q.h,q.wall,q.roof,'house');ctx.fillStyle='#604832';ctx.fillRect(p.x+9*s,p.y-9*s,13*s,7*s);ctx.fillStyle='#d1c0a0';ctx.fillRect(p.x+11*s,p.y-13*s,8*s,5*s);ctx.fillStyle='#473c2c';ctx.beginPath();ctx.arc(p.x+22*s,p.y-7*s,4*s,0,7);ctx.fill();drawSprite('hay',p.x+4*s,p.y-2*s,23*s,18*s);}
 else {drawHouseBody(p,q.w,q.h,q.wall,q.roof,q.kind==='log'?'log':'house');
 if(q.kind==='mill'){ctx.strokeStyle='#e0d2aa';ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(p.x+13*s,p.y-22*s,10*s,0,7);ctx.moveTo(p.x+3*s,p.y-22*s);ctx.lineTo(p.x+23*s,p.y-22*s);ctx.moveTo(p.x+13*s,p.y-32*s);ctx.lineTo(p.x+13*s,p.y-12*s);ctx.moveTo(p.x+6*s,p.y-29*s);ctx.lineTo(p.x+20*s,p.y-15*s);ctx.moveTo(p.x+6*s,p.y-15*s);ctx.lineTo(p.x+20*s,p.y-29*s);ctx.stroke();ctx.fillStyle='#8c6b42';ctx.fillRect(p.x-9*s,p.y-(q.h+9)*s,6*s,10*s);}
 if(q.kind==='smith'){ctx.fillStyle='#45372c';ctx.fillRect(p.x+8*s,p.y-(q.h+7)*s,7*s,13*s);ctx.fillStyle='#8b3b22';ctx.beginPath();ctx.ellipse(p.x+11*s,p.y-(q.h+5)*s,4*s,3*s,0,0,7);ctx.fill();if(Math.floor(Date.now()/450)%2===0){ctx.fillStyle='rgba(230,190,112,.5)';ctx.beginPath();ctx.arc(p.x+11*s,p.y-(q.h+5)*s,7*s,0,7);ctx.fill();}}
 if(q.kind==='log'){drawSprite('barrel',p.x-22*s,p.y-8*s,17*s,20*s);drawSprite('hay',p.x+15*s,p.y-3*s,22*s,18*s);}
 if(b.type==='bakery'){ctx.fillStyle='#66513a';ctx.beginPath();ctx.ellipse(p.x+10*s,p.y-9*s,7*s,5*s,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#d8b46a';ctx.beginPath();ctx.arc(p.x+10*s,p.y-10*s,3*s,0,7);ctx.fill();}
 if(b.type==='barracks'){for(let i=0;i<2;i++){ctx.strokeStyle='#5c4631';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(p.x+(i*8-3)*s,p.y-16*s);ctx.lineTo(p.x+(i*8-3)*s,p.y-5*s);ctx.stroke();}}
 }
 text(q.label,p.x,p.y-(q.h+24)*s,9*s,'#fff0c9');}
function castleScene(){const s=zoom;const sky=ctx.createLinearGradient(0,0,0,innerHeight);sky.addColorStop(0,'#a7c0bf');sky.addColorStop(.48,'#e4c997');sky.addColorStop(1,'#c6a66d');ctx.fillStyle=sky;ctx.fillRect(0,0,innerWidth,innerHeight);
 // soft desert horizon clouds
 for(let i=0;i<5;i++){const x=((i*251+Date.now()*.004)% (innerWidth+150))-60,y=48+(i%3)*19;ctx.fillStyle='rgba(255,242,210,.18)';ctx.beginPath();ctx.ellipse(x,y,48,9,0,0,7);ctx.ellipse(x+20,y-3,27,10,0,0,7);ctx.fill();}
 // dunes, gradient-lit ridges and sand ripples
 for(let i=0;i<17;i++){const x=(i*149)%innerWidth,y=120+(i*83)%(Math.max(100,innerHeight-180)),rx=65+(i*31)%85;const g=ctx.createLinearGradient(x,y-16,x,y+17);g.addColorStop(0,i%2?'#dfc38b':'#d4b578');g.addColorStop(1,'#a98950');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,15+(i%3)*3,-.05,0,7);ctx.fill();ctx.strokeStyle='rgba(244,218,163,.4)';ctx.beginPath();ctx.ellipse(x-5,y-3,rx*.8,7,-.05,Math.PI,Math.PI*2);ctx.stroke();}
 // tiled sand base and path
 for(let x=-14;x<=14;x++)for(let y=-12;y<=12;y++)drawTile(x,y,'sand',(x+y)&3);
 for(let i=0;i<11;i++){const p=project(-.6+i*.1,8-i*.7);drawTile(Math.round(-.6+i*.1),Math.round(8-i*.7),'road',i);}
 // oasis with layered bank, turquoise shallows, ripple
 const pool=project(4,-3);shadow(pool.x,pool.y,93*s,31*s);ctx.beginPath();ctx.ellipse(pool.x,pool.y,91*s,39*s,-.18,0,7);const bank=ctx.createLinearGradient(pool.x,pool.y-35*s,pool.x,pool.y+35*s);bank.addColorStop(0,'#d6bf85');bank.addColorStop(1,'#8c8955');ctx.fillStyle=bank;ctx.fill();ctx.strokeStyle='#e3ce96';ctx.lineWidth=3*s;ctx.stroke();
 ctx.beginPath();ctx.ellipse(pool.x,pool.y-2*s,82*s,31*s,-.18,0,7);const water=ctx.createLinearGradient(pool.x,pool.y-30*s,pool.x,pool.y+25*s);water.addColorStop(0,'#59a1a0');water.addColorStop(1,'#276a79');ctx.fillStyle=water;ctx.fill();
 for(let i=0;i<9;i++){const xx=pool.x+Math.sin(i*2.1+Date.now()/1800)*52*s,yy=pool.y+Math.cos(i*1.6)*17*s;ctx.strokeStyle='rgba(202,239,219,.5)';ctx.lineWidth=.9*s;ctx.beginPath();ctx.ellipse(xx,yy,(4+i%3)*s,(1+i%2)*s,-.2,0,7);ctx.stroke();}
 for(let i=0;i<8;i++)drawTree(2.7+i*.48,-3.4+(i%3)*.38,i%4===0?1:0);
 // perimeter walls, heavy shaded stone courses and crenellations
 for(let x=-3;x<=3;x++){if(Math.abs(x)>1){buildingWall(x,-3);buildingWall(x,3);}}
 for(let y=-2;y<=2;y++){buildingWall(-3,y);buildingWall(3,y);}
 for(const [x,y] of [[-3,-3],[3,-3],[-3,3],[3,3]]){const p=project(x,y);drawKeep({x,y,type:'fort'},true);for(let i=0;i<3;i++){ctx.fillStyle='#4c4b41';ctx.fillRect(p.x-3*s+i*3*s,p.y-20*s,1.5*s,4*s);}flag(p.x,p.y-31*s,'#a83d2e');}
 // deep wooden gate, iron straps, dark passage
 const gate=project(0,3);polygon([{x:gate.x-19*s,y:gate.y-28*s},{x:gate.x,y:gate.y-18*s},{x:gate.x+19*s,y:gate.y-28*s},{x:gate.x+19*s,y:gate.y-4*s},{x:gate.x,y:gate.y+4*s},{x:gate.x-19*s,y:gate.y-4*s}],'#9d927a','#504a3c',1.3*s);ctx.fillStyle='#38291f';ctx.fillRect(gate.x-10*s,gate.y-23*s,20*s,25*s);ctx.fillStyle='#6f492b';ctx.fillRect(gate.x-8*s,gate.y-22*s,16*s,23*s);for(let i=0;i<4;i++){ctx.fillStyle='#b7a17b';ctx.fillRect(gate.x-8*s,gate.y+(-19+i*6)*s,16*s,1.5*s);}for(let i=-1;i<=1;i++)ctx.fillStyle='#34312b',ctx.fillRect(gate.x+i*6*s,gate.y-19*s,1.5*s,19*s);
 // road of individual cobbles
 for(let i=0;i<9;i++){const p=project((i%3-1)*.12,4+i*.62);polygon([{x:p.x-5*s,y:p.y},{x:p.x,y:p.y-2*s},{x:p.x+5*s,y:p.y+1*s},{x:p.x,y:p.y+3*s}],i%2?'#b7a17b':'#9c8a67','#7e6e52',.5*s);}
 // shrubs, rocks and oasis edge tufts
 for(let i=0;i<34;i++){const x=((i*7)%19)-9,y=((i*11)%19)-9;if(Math.abs(x)>4||Math.abs(y)>4){if(i%4===0){const p=project(x,y);shadow(p.x,p.y,5*s,2*s);polygon([{x:p.x-5*s,y:p.y},{x:p.x-2*s,y:p.y-7*s},{x:p.x+2*s,y:p.y-6*s},{x:p.x+6*s,y:p.y}],i%8?'#858a4a':'#8e9870','#606b3a',.5*s);}else shrub(x,y,i);}}
 const bs=state.buildings.filter(b=>b.type!=='keep').slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));for(const b of bs)building(b);building(state.buildings.find(b=>b.type==='keep')||{type:'keep',x:0,y:0});
 // tiny sentries with helmets on wall walk
 for(let i=0;i<6;i++){const p=project(-2.4+i*.95,-3);drawSprite('guard',p.x-5*s,p.y-13*s,11*s,17*s);}
}
function buildingWall(x,y){const p=project(x,y),s=zoom;shadow(p.x,p.y,15*s,4*s);polygon([{x:p.x-14*s,y:p.y-3*s},{x:p.x,y:p.y+4*s},{x:p.x+14*s,y:p.y-3*s},{x:p.x+14*s,y:p.y-17*s},{x:p.x,y:p.y-10*s},{x:p.x-14*s,y:p.y-17*s}],'#8c8878','#5c5648',.8*s);polygon([{x:p.x-14*s,y:p.y-17*s},{x:p.x,y:p.y-10*s},{x:p.x,y:p.y-14*s},{x:p.x-14*s,y:p.y-21*s}],'#b4ad98','#716855',.5*s);for(let i=0;i<4;i++){ctx.fillStyle='#bdb49c';ctx.fillRect(p.x-13*s+i*8*s,p.y-23*s,5*s,6*s);}for(let i=0;i<3;i++){ctx.strokeStyle='rgba(65,58,46,.4)';ctx.beginPath();ctx.moveTo(p.x-13*s,p.y-12*s+i*4*s);ctx.lineTo(p.x-1*s,p.y-6*s+i*4*s);ctx.stroke();}}
function worldScene(){const s=zoom;const bg=ctx.createLinearGradient(0,0,0,innerHeight);bg.addColorStop(0,'#c6c8a0');bg.addColorStop(1,'#b6a773');ctx.fillStyle=bg;ctx.fillRect(0,0,innerWidth,innerHeight);
 // textured grass/desert tile field
 for(let x=-19;x<=19;x++)for(let y=-19;y<=19;y++){let type='grass';const r=seeded(x,y,7);if(r>.72)type='sand';if(r<.08)type='stone';drawTile(x,y,type,(x*3+y*5)&7);if(r>.9)shrub(x,y,Math.floor(r*10));}
 // river as broad natural winding water with banks, animated highlights and stones
 const riverPts=[];for(let i=-22;i<=22;i++){const p=project(i,Math.sin(i*.23)*3.1+4);riverPts.push(p);}
 ctx.beginPath();riverPts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#b4a078';ctx.lineWidth=zoom*39;ctx.lineJoin='round';ctx.stroke();
 ctx.beginPath();riverPts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#2d707d';ctx.lineWidth=zoom*30;ctx.lineJoin='round';ctx.stroke();
 for(let i=0;i<riverPts.length;i+=2){const p=riverPts[i];ctx.strokeStyle='rgba(164,220,208,.58)';ctx.lineWidth=1.3*s;ctx.beginPath();ctx.moveTo(p.x-5*s,p.y-3*s);ctx.quadraticCurveTo(p.x,p.y-5*s,p.x+7*s,p.y-2*s);ctx.stroke();if(i%6===0){ctx.fillStyle='#817e6a';ctx.beginPath();ctx.ellipse(p.x+16*s,p.y+17*s,4*s,2.5*s,.25,0,7);ctx.fill();}}
 // road links between settlements
 for(const f of world.forts){const p=project(f.x,f.y);ctx.strokeStyle='rgba(157,125,76,.55)';ctx.lineWidth=zoom*4;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(innerWidth*.54+offset.x,innerHeight*.48+offset.y);ctx.stroke();}
 // forts are actual tiny fortified silhouettes
 for(const f of world.forts){const p=project(f.x,f.y),ss=zoom;shadow(p.x,p.y,19*ss,6*ss);for(const [dx,dy] of [[-12,-2],[12,-2],[-12,5],[12,5]]){ctx.fillStyle='#a59d86';ctx.fillRect(p.x+dx*ss-3*ss,p.y+dy*ss-16*ss,6*ss,17*ss);ctx.fillStyle='#c1b59a';for(let k=0;k<3;k++)ctx.fillRect(p.x+dx*ss-3*ss+k*2.5*ss,p.y+dy*ss-19*ss,1.8*ss,4*ss);}polygon([{x:p.x-13*ss,y:p.y-2*ss},{x:p.x,y:p.y+5*ss},{x:p.x+13*ss,y:p.y-2*ss},{x:p.x+13*ss,y:p.y-7*ss},{x:p.x,y:p.y},{x:p.x-13*ss,y:p.y-7*ss}],'#817f70','#514d42',.7*ss);flag(p.x+1*ss,p.y-29*ss,'#b13b2d');text('Форт',p.x,p.y+14*ss,9*ss);}
 // player settlements with alliance-color standards
 for(const pl of world.players){const p=project(pl.x,pl.y),ss=zoom;shadow(p.x,p.y,24*ss,8*ss);drawKeep({x:pl.x,y:pl.y,type:'keep'},false);const allianceData=world.alliances.find(a=>a.id===pl.allianceId);if(allianceData)flag(p.x+15*ss,p.y-53*ss,'#d2b54e');text((allianceData?'['+allianceData.tag+'] ':'')+pl.name,p.x,p.y-65*ss,10*ss,pl.id===player?.id?'#fff0a6':'#fff');}
 // moving columns: trail, soldiers, supply cart and pennant
 for(const m of world.marches){if(m.status!=='marching')continue;const a=project(m.from.x,m.from.y),b=project(m.to.x,m.to.y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(132,53,37,.75)';ctx.lineWidth=2*s;ctx.setLineDash([4*s,4*s]);ctx.stroke();ctx.setLineDash([]);const t=Math.max(0,Math.min(1,(Date.now()-m.startedAt)/(m.arrivesAt-m.startedAt))),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;shadow(x,y,15*s,5*s);for(let i=0;i<5;i++){const xx=x+(i-2)*4*s,yy=y+(i%2)*3*s;ctx.fillStyle=i%2?'#8b3b2c':'#5e6741';ctx.fillRect(xx-1.5*s,yy-7*s,3*s,8*s);ctx.fillStyle='#d3b98b';ctx.beginPath();ctx.arc(xx,yy-9*s,2.5*s,0,7);ctx.fill();ctx.fillStyle='#777365';ctx.beginPath();ctx.arc(xx,yy-10*s,2.8*s,Math.PI,Math.PI*2);ctx.fill();}ctx.fillStyle='#705035';ctx.fillRect(x+9*s,y-7*s,9*s,7*s);ctx.fillStyle='#b89b6d';ctx.fillRect(x+8*s,y-9*s,11*s,3*s);flag(x+2*s,y-12*s,'#a83d2e');}
 text('КАРТА МИРА · координаты ±500',innerWidth/2,innerHeight-92,12,'#3b3523');
}
function drawIcon(x,y,icon,size){ctx.font=size+'px serif';ctx.textAlign='center';ctx.fillText(icon,x,y);}
function draw(){if(!ctx)return;ctx.clearRect(0,0,innerWidth,innerHeight);if(mode==='castle')castleScene();else worldScene();}
function updateHUD(){
 const r=state.resources;for(const k of ['wood','stone','food','gold'])$(k).textContent=Math.floor(r[k]||0);
 $('pop').textContent=state.popularity;$('popBar').style.width=state.popularity+'%';$('people').textContent=state.population+' / '+(8+state.buildings.filter(b=>b.type==='hut').length*8);
 $('taxLabel').textContent=Economy.TAX[state.tax].name;$('rationLabel').textContent=Economy.RATIONS[state.ration].name;
 $('workers').textContent=state.buildings.filter(b=>b.workers>0).length;$('modeTitle').textContent=mode==='castle'?'Моё владение':'Глобальная карта';
 $('hint').textContent=mode==='castle'?'Выбери здание снизу, затем место на песке. Перетаскивай карту; щипок — масштаб.':'Коснись точки карты, чтобы отправить марш. Кнопка «Форт альянса» ставит форт по выбранной координате.';
 document.querySelectorAll('[data-build]').forEach(b=>b.classList.toggle('active',selected===b.dataset.build));
}
function choose(type){selected=selected===type?null:type;updateHUD();toast(selected?'Выбрано: '+Economy.LABELS[selected]:'Выбор отменён.');}
const buildsMenu=$('builds'), buildMenuBtn=$('buildMenuBtn'), ownershipBtn=$('ownershipBtn'), ownershipPanel=document.querySelector('.left');
function toggleBuildMenu(open){buildsMenu.classList.toggle('open',open);buildMenuBtn.setAttribute('aria-expanded',String(open));}
buildMenuBtn.addEventListener('click',()=>toggleBuildMenu(!buildsMenu.classList.contains('open')));
$('closeBuildMenu').addEventListener('click',()=>toggleBuildMenu(false));
ownershipBtn.addEventListener('click',()=>{const open=ownershipPanel.style.display!=='block';ownershipPanel.style.display=open?'block':'none';ownershipBtn.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('[data-build]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.build)));
function cellAt(px,py){const cx=innerWidth*.54+offset.x,cy=innerHeight*.48+offset.y,s=zoom*28;const dx=(px-cx)/s,dy=(py-cy)/(s*.48);return {x:Math.round((dx+dy)/2),y:Math.round((dy-dx)/2)};}
function tap(px,py){
 if(mode==='castle'){
  const c=cellAt(px,py);if(!selected){toast('Выбери постройку на панели снизу.');return;}
  if(Math.abs(c.x)>7||Math.abs(c.y)>7){toast('Строить можно в пределах владения.');return;}
  const result=Economy.build(state,selected,c.x,c.y);toast(result.message);if(result.ok){selected=null;toggleBuildMenu(false);saveSilent();updateHUD();draw();}return;
 }
 const c=cellAt(px,py);
 if(selected==='fort'){if(!alliance){toast('Сначала вступи или создай альянс.');return;}if(socket?.connected)socket.emit('fort:build',c);else toast('Для онлайн-форта нужен запущенный сервер.');selected=null;return;}
 if(socket?.connected)socket.emit('march:start',c);else toast('Оффлайн: марши станут доступны после запуска сервера.'); 
}
function saveSilent(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){}}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y,moved:false,id:e.pointerId};});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;if(drag.moved){offset.x=drag.ox+dx;offset.y=drag.oy+dy;draw();}});
canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved)tap(e.clientX,e.clientY);drag=null;});
canvas.addEventListener('wheel',e=>{zoom=Math.max(.45,Math.min(1.8,zoom*(e.deltaY<0?1.1:.9)));draw();},{passive:true});
$('skirmishBtn').onclick=()=>{mode='castle';$('skirmishBtn').classList.add('active');$('worldBtn').classList.remove('active');selected=null;draw();updateHUD();};
$('worldBtn').onclick=()=>{mode='world';$('worldBtn').classList.add('active');$('skirmishBtn').classList.remove('active');selected=null;draw();updateHUD();};
$('saveBtn').onclick=save;
$('taxBtn').onclick=()=>{state.tax=(state.tax+1)%Economy.TAX.length;updateHUD();toast('Налог: '+Economy.TAX[state.tax].name);saveSilent();};
$('rationBtn').onclick=()=>{state.ration=(state.ration+1)%Economy.RATIONS.length;updateHUD();toast('Рацион: '+Economy.RATIONS[state.ration].name);saveSilent();};
$('tradeBtn').onclick=()=>{if(state.resources.wood>=10){state.resources.wood-=10;state.resources.gold+=18;updateHUD();saveSilent();toast('Продано 10 дерева за 18 монет.');}else toast('Нужно минимум 10 дерева.');};
function showModal(title,body,actions){$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalActions').replaceChildren();for(const a of actions){const b=document.createElement('button');b.textContent=a.label;b.onclick=()=>a.run();$('modalActions').append(b);}$('modal').classList.add('show');}
function closeModal(){$('modal').classList.remove('show');}
$('allianceBtn').onclick=()=>{
 const online=socket?.connected;
 let body='<p>'+(online?'Онлайн-сервер подключён.':'Сервер не подключён. Создание альянса будет доступно после запуска Node.js сервера.')+'</p>';
 body+='<label>Имя правителя</label><input id="playerName" maxlength="20" placeholder="Лорд пустыни" value="'+(player?.name||'Лорд пустыни')+'">';
 body+='<label>Название альянса</label><input id="allianceName" maxlength="28" placeholder="Орден Пустыни"><label>Тег (2–5 знаков)</label><input id="allianceTag" maxlength="5" placeholder="DES">';
 body+='<div class="log" id="allianceList"></div><p><b>Чат альянса</b></p><div class="log" id="allianceChatLog" style="min-height:45px"></div><input id="allianceChatInput" maxlength="240" placeholder="Сообщение альянсу">';
 showModal('Альянс и дипломатия',body,[{label:'Войти',run:()=>{if(!socket?.connected){toast('Сервер не подключён.');return;}socket.emit('player:join',{name:$('playerName').value});closeModal();}},{label:'Создать альянс',run:()=>{if(!socket?.connected){toast('Сервер не подключён.');return;}if(!player)socket.emit('player:join',{name:$('playerName').value});socket.emit('alliance:create',{name:$('allianceName').value,tag:$('allianceTag').value});}},{label:'Отправить в чат',run:()=>{const input=$('allianceChatInput');if(!socket?.connected){toast('Сервер не подключён.');return;}socket.emit('alliance:chat',{text:input.value});input.value='';}},{label:'Закрыть',run:closeModal}]);
 renderAllianceList();
};
function appendChat(name,message){const el=$('allianceChatLog');if(!el)return;const row=document.createElement('div');row.textContent='['+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'] '+name+': '+message;el.prepend(row);}
function renderAllianceList(){const el=$('allianceList');if(!el)return;el.innerHTML='<p><b>Доступные альянсы</b></p>'+world.alliances.map(a=>'<div>'+escapeHTML('['+a.tag+'] '+a.name+' · '+a.members+' участн.')+' <button data-join="'+a.id+'">Вступить</button></div>').join('');el.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>{if(socket?.connected)socket.emit('alliance:join',{id:b.dataset.join});else toast('Сервер не подключён.');});}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
if(typeof window.io==='function'){
 socket=window.io();
 socket.on('connect',()=>toast('Связь с игровым сервером установлена.'));
 socket.on('disconnect',()=>toast('Нет связи с сервером. Оффлайн-замок продолжает работать.'));
 socket.on('world:snapshot',w=>{world=w;draw();});
 socket.on('world:update',w=>{world=w;draw();renderAllianceList();});
 socket.on('player:ready',p=>{player=p;toast('Добро пожаловать, '+p.name+'!');});
 socket.on('alliance:joined',d=>{alliance=d.alliance;state.allianceId=d.alliance.id;saveSilent();toast('Вы в альянсе ['+d.alliance.tag+'].');renderAllianceList();});
 socket.on('alliance:left',()=>{alliance=null;state.allianceId=null;saveSilent();toast('Вы покинули альянс.');});
 socket.on('alliance:notice',d=>{toast(d.text);appendChat('СИСТЕМА',d.text);});
 socket.on('alliance:chat',d=>appendChat(d.name,d.text));
 socket.on('game:error',d=>toast(d.message));
 socket.on('march:update',m=>{if(m.ownerId===player?.id)toast(m.status==='arrived'?'Марш прибыл к цели.':'Армия выступила в поход.');});
}else{
 // GitHub Pages has no Socket.io server; offline castle play remains available.
}
setInterval(()=>{Economy.tick(state);updateHUD();draw();saveSilent();},5000);
resize();updateHUD();
})();