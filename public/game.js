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
function project(x,y){const cx=innerWidth*.54+offset.x,cy=innerHeight*.48+offset.y;const s=zoom*28;return {x:cx+(x-y)*s,y:cy+(x+y)*s*.48};}
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function diamond(x,y,w,h,fill,stroke){polygon([{x,y:y-h/2},{x:x+w/2,y},{x,y:y+h/2},{x:x-w/2,y}],fill,stroke);}
function isoRect(x,y,w,h,color,side){const p=project(x,y),sx=zoom*28,sy=sx*.48;const a={x:p.x-w*sx/2,y:p.y-h*sy/2},b={x:p.x+w*sx/2,y:p.y-h*sy/2},c={x:p.x+w*sx/2,y:p.y+h*sy/2},d={x:p.x-w*sx/2,y:p.y+h*sy/2};polygon([a,b,c,d],color,'#55462f');polygon([d,c,{x:c.x,y:c.y+zoom*10},{x:d.x,y:d.y+zoom*10}],side||'#75634a','#4c402d');}
function text(str,x,y,size=11,color='#fff0c9'){ctx.font='bold '+size+'px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#211d15b8';ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);}
function tree(x,y){const p=project(x,y),s=zoom;ctx.fillStyle='#61482c';ctx.fillRect(p.x-2*s,p.y-4*s,4*s,12*s);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(p.x,p.y-(26+i*7)*s);ctx.lineTo(p.x-12*s,p.y-(5+i*7)*s);ctx.lineTo(p.x+12*s,p.y-(5+i*7)*s);ctx.closePath();ctx.fillStyle=['#4c6335','#60763b','#778747'][i];ctx.fill();ctx.strokeStyle='#39472b';ctx.stroke();}}
function building(b){
 const p=project(b.x,b.y),s=zoom;
 if(b.type==='keep'||b.type==='fort'){
  const w=(b.type==='keep'?1.8:1.4)*s,h=(b.type==='keep'?40:29)*s;
  isoRect(b.x,b.y,.9,.9,b.type==='keep'?'#b7a889':'#8d8b7b','#77715e');
  for(const [dx,dy] of [[-w/2,-4*s],[w/2,-4*s],[-w/2,4*s],[w/2,4*s]]){ctx.fillStyle='#b7b09c';ctx.fillRect(p.x+dx-5*s,p.y+dy-h,10*s,h);ctx.fillStyle='#5c5b4d';for(let k=0;k<3;k++)ctx.fillRect(p.x+dx-5*s+k*4*s,p.y+dy-h-3*s,2*s,4*s);}
  ctx.fillStyle='#8c8067';ctx.fillRect(p.x-11*s,p.y-h*.65,22*s,h*.65);ctx.fillStyle='#d1bd8b';ctx.fillRect(p.x-9*s,p.y-h*.65,18*s,h*.65);
  ctx.fillStyle='#4b3524';ctx.fillRect(p.x-3*s,p.y-12*s,6*s,12*s);
  if(b.type==='keep'){ctx.fillStyle='#a83d2e';ctx.beginPath();ctx.moveTo(p.x-8*s,p.y-h*.65);ctx.lineTo(p.x,p.y-h*.9);ctx.lineTo(p.x+8*s,p.y-h*.65);ctx.fill();}
  text(b.type==='keep'?'КРЕПОСТЬ':'ФОРТ',p.x,p.y-h-7*s,10*s,'#fff0c9');return;
 }
 const shapes={
  hut:{w:.9,h:17,roof:'#8b5130',wall:'#b9a078',label:'Хижина'},
  woodcutter:{w:1.15,h:17,roof:'#705035',wall:'#c1a06a',label:'Лесопилка'},
  farm:{w:1.5,h:7,roof:'#a7a05a',wall:'#b7a16b',label:'Поля'},
  mill:{w:1.1,h:30,roof:'#87653d',wall:'#c7b48a',label:'Мельница'},
  bakery:{w:1,h:13,roof:'#8d5734',wall:'#cbb58a',label:'Пекарня'},
  quarry:{w:1.3,h:8,roof:'#77766b',wall:'#aaa99a',label:'Карьер'},
  ox:{w:1,h:6,roof:'#69513c',wall:'#c1b094',label:'Волы'},
  blacksmith:{w:1.1,h:15,roof:'#56433a',wall:'#a7a08b',label:'Кузница'},
  barracks:{w:1.3,h:18,roof:'#625b4a',wall:'#aaa18a',label:'Казармы'}
 };
 const q=shapes[b.type]||shapes.hut;
 if(b.type==='farm'){
  diamond(p.x,p.y,zoom*55,zoom*27,'#8f914e','#635d36');
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(p.x+i*8*s,p.y-10*s);ctx.lineTo(p.x+i*8*s+7*s,p.y+8*s);ctx.strokeStyle='#c1ad62';ctx.lineWidth=2*s;ctx.stroke();}
 }else{
  isoRect(b.x,b.y,q.w,.8,q.wall,'#82745b');
  ctx.fillStyle=q.roof;ctx.beginPath();ctx.moveTo(p.x-q.w*15*s,p.y-8*s);ctx.lineTo(p.x,p.y-q.h*s);ctx.lineTo(p.x+q.w*15*s,p.y-8*s);ctx.closePath();ctx.fill();ctx.strokeStyle='#55422b';ctx.stroke();
  ctx.fillStyle='#4b3425';ctx.fillRect(p.x-3*s,p.y-11*s,6*s,11*s);
  if(b.type==='mill'){ctx.strokeStyle='#e5d8af';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(p.x,p.y-24*s);ctx.lineTo(p.x+13*s,p.y-18*s);ctx.moveTo(p.x,p.y-24*s);ctx.lineTo(p.x-13*s,p.y-18*s);ctx.moveTo(p.x,p.y-24*s);ctx.lineTo(p.x,p.y-10*s);ctx.stroke();}
  if(b.type==='ox'){ctx.fillStyle='#46382a';ctx.fillRect(p.x-10*s,p.y-9*s,12*s,7*s);ctx.fillStyle='#d8c9a8';ctx.fillRect(p.x-8*s,p.y-12*s,7*s,4*s);}
 }
 text(q.label,p.x,p.y-q.h*s-3*s,9*s);
}
function castleScene(){
 ctx.fillStyle='#c6a96e';ctx.fillRect(0,0,innerWidth,innerHeight);
 // desert dunes and stippled sand
 for(let i=0;i<12;i++){const x=(i*173)%innerWidth,y=110+(i*97)%(innerHeight-150);ctx.beginPath();ctx.ellipse(x,y,80+((i*31)%70),12,0,0,Math.PI*2);ctx.fillStyle=i%2?'#d0b77e':'#b99a5c';ctx.fill();}
 // oasis pool
 const pool=project(4,-3);ctx.beginPath();ctx.ellipse(pool.x,pool.y,zoom*85,zoom*35,-.18,0,Math.PI*2);ctx.fillStyle='#3e8491';ctx.fill();ctx.strokeStyle='#8ec0b0';ctx.lineWidth=3;ctx.stroke();
 for(let i=0;i<5;i++)tree(3+i*.5,-3.3+(i%2)*.5);
 // wall perimeter
 for(let x=-3;x<=3;x++){if(Math.abs(x)>2){buildingWall(x,-3);buildingWall(x,3);}}
 for(let y=-2;y<=2;y++){buildingWall(-3,y);buildingWall(3,y);}
 // gate opening, towers
 for(const [x,y] of [[-3,-3],[3,-3],[-3,3],[3,3]]){const p=project(x,y),s=zoom;isoRect(x,y,.9,.9,'#aaa28c','#6f6653');ctx.fillStyle='#bcb39a';ctx.fillRect(p.x-7*s,p.y-32*s,14*s,32*s);ctx.fillStyle='#605b4b';ctx.fillRect(p.x-8*s,p.y-35*s,16*s,5*s);for(let i=0;i<4;i++)ctx.fillRect(p.x-7*s+i*4*s,p.y-39*s,2*s,5*s);}
 // gate
 const gate=project(0,3),s=zoom;ctx.fillStyle='#9b8d6d';ctx.fillRect(gate.x-22*s,gate.y-35*s,44*s,34*s);ctx.fillStyle='#583a26';ctx.fillRect(gate.x-10*s,gate.y-23*s,20*s,23*s);for(let i=-1;i<=1;i++)ctx.fillRect(gate.x+i*7*s,gate.y-22*s,3*s,22*s);
 // winding path
 ctx.beginPath();for(let i=0;i<8;i++){const p=project(-.5+i*.14,7-i);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle='#dfc38a';ctx.lineWidth=zoom*11;ctx.stroke();
 // decorations / shrubs
 for(let i=0;i<28;i++){const x=((i*7)%17)-8,y=((i*11)%17)-8;if(Math.abs(x)>4||Math.abs(y)>4){const p=project(x,y);ctx.beginPath();ctx.ellipse(p.x,p.y,zoom*4,zoom*2,0,0,7);ctx.fillStyle=i%2?'#7b8548':'#8c8c4e';ctx.fill();}}
 const bs=state.buildings.filter(b=>b.type!=='keep').slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));for(const b of bs)building(b);building(state.buildings.find(b=>b.type==='keep')||{type:'keep',x:0,y:0});
 // little guards on walls
 for(let i=0;i<5;i++){const p=project(-2+i, -3);ctx.fillStyle='#9d3026';ctx.fillRect(p.x-2*zoom,p.y-15*zoom,4*zoom,10*zoom);ctx.fillStyle='#d6b98a';ctx.beginPath();ctx.arc(p.x,p.y-17*zoom,3*zoom,0,7);ctx.fill();}
}
function buildingWall(x,y){const p=project(x,y),s=zoom;isoRect(x,y,.92,.48,'#b8ad93','#766b57');ctx.fillStyle='#c9bea3';ctx.fillRect(p.x-13*s,p.y-13*s,26*s,8*s);for(let i=0;i<4;i++)ctx.fillRect(p.x-12*s+i*8*s,p.y-17*s,5*s,5*s);}
function worldScene(){
 ctx.fillStyle='#c6b780';ctx.fillRect(0,0,innerWidth,innerHeight);
 // broad parchment-like terrain tiles
 for(let x=-18;x<=18;x++)for(let y=-18;y<=18;y++){const p=project(x,y);diamond(p.x,p.y,zoom*55,zoom*27,((x*13+y*7)%5===0)?'#b5b77b':((x+y)%3===0?'#c4c28a':'#c0b67d'),'#a7a575');}
 // winding river
 ctx.beginPath();for(let i=-20;i<=20;i++){const p=project(i,Math.sin(i*.25)*3+4);i===-20?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}ctx.strokeStyle='#3e8994';ctx.lineWidth=zoom*30;ctx.stroke();
 for(let i=-5;i<=5;i++){const p=project(i*2,Math.sin(i*.25)*3+4);ctx.fillStyle='#7c8d43';ctx.beginPath();ctx.arc(p.x,p.y,zoom*11,0,7);ctx.fill();}
 // territory rings and forts
 for(const f of world.forts){const p=project(f.x,f.y),s=zoom;ctx.beginPath();ctx.ellipse(p.x,p.y,5*s,2.4*s,0,0,7);ctx.strokeStyle='#e7d49a';ctx.lineWidth=2;ctx.stroke();drawIcon(p.x,p.y,'🏰',14*s);text('Форт',p.x,p.y-17*s,10*s);}
 for(const p of world.players){const q=project(p.x,p.y);drawIcon(q.x,q.y,p.id===player?.id?'🏰':'🏯',19*zoom);text((p.allianceId?'['+(world.alliances.find(a=>a.id===p.allianceId)?.tag||'')+'] ':'')+p.name,q.x,q.y-20*zoom,10*zoom,p.id===player?.id?'#fff0a6':'#fff');}
 for(const m of world.marches){if(m.status!=='marching')continue;const a=project(m.from.x,m.from.y),b=project(m.to.x,m.to.y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#a53525';ctx.lineWidth=3;ctx.stroke();const t=Math.max(0,Math.min(1,(Date.now()-m.startedAt)/(m.arrivesAt-m.startedAt)));drawIcon(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,'⚔️',14*zoom);}
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
document.querySelectorAll('[data-build]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.build)));
function cellAt(px,py){const cx=innerWidth*.54+offset.x,cy=innerHeight*.48+offset.y,s=zoom*28;const dx=(px-cx)/s,dy=(py-cy)/(s*.48);return {x:Math.round((dx+dy)/2),y:Math.round((dy-dx)/2)};}
function tap(px,py){
 if(mode==='castle'){
  const c=cellAt(px,py);if(!selected){toast('Выбери постройку на панели снизу.');return;}
  if(Math.abs(c.x)>7||Math.abs(c.y)>7){toast('Строить можно в пределах владения.');return;}
  const result=Economy.build(state,selected,c.x,c.y);toast(result.message);if(result.ok){selected=null;saveSilent();updateHUD();draw();}return;
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