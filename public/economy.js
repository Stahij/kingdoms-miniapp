'use strict';
window.Economy = (() => {
  const COST = {
    hut:{wood:35}, woodcutter:{wood:30}, farm:{wood:25}, mill:{wood:40,stone:10},
    bakery:{wood:25,stone:10}, quarry:{wood:35}, ox:{wood:20}, blacksmith:{wood:35,stone:20},
    barracks:{wood:50,stone:35}, fort:{wood:100,stone:100}
  };
  const LABELS = {hut:'Хижина',woodcutter:'Лесопилка',farm:'Ферма',mill:'Мельница',bakery:'Пекарня',quarry:'Каменоломня',ox:'Воловья упряжка',blacksmith:'Кузница',barracks:'Казармы',fort:'Форт альянса'};
  const initial = () => ({
    resources:{wood:120,stone:90,food:100,gold:250,wheat:0,flour:0,iron:0,weapons:0},
    buildings:[{id:1,type:'keep',x:0,y:0,workers:0},{id:2,type:'hut',x:-3,y:1,workers:0}],
    population:8,popularity:65,tax:1,ration:2,fear:0,foods:['bread'],ticks:0,nextId:3,logs:['Вы основали новое поселение.']
  });
  const TAX=[{name:'Щедрый',gold:-1,pop:8},{name:'Низкий',gold:1,pop:4},{name:'Обычный',gold:3,pop:0},{name:'Высокий',gold:5,pop:-7},{name:'Драконовский',gold:8,pop:-15}];
  const RATIONS=[{name:'Голодный',food:0,pop:-8},{name:'Скудный',food:1,pop:-4},{name:'Обычный',food:2,pop:0},{name:'Обильный',food:3,pop:4},{name:'Пир',food:5,pop:8}];
  function log(s,msg){s.logs.unshift(msg);s.logs=s.logs.slice(0,8);}
  function canBuild(s,type){const c=COST[type];if(!c)return false;return Object.entries(c).every(([k,v])=>(s.resources[k]||0)>=v);}
  function build(s,type,x,y){
    if(!COST[type])return {ok:false,message:'Неизвестная постройка.'};
    if(!canBuild(s,type))return {ok:false,message:'Недостаточно ресурсов.'};
    if(s.buildings.some(b=>Math.hypot(b.x-x,b.y-y)<1.4))return {ok:false,message:'Здесь уже есть постройка.'};
    if(type==='fort'&&!s.allianceId)return {ok:false,message:'Для форта сначала вступи в альянс.'};
    for(const [k,v] of Object.entries(COST[type]))s.resources[k]-=v;
    s.buildings.push({id:s.nextId++,type,x,y,workers:0,progress:0});
    log(s,'Построено: '+LABELS[type]+'.');
    return {ok:true,message:'Построено: '+LABELS[type]};
  }
  function tick(s){
    s.ticks++;
    const workersAvailable=Math.max(0,s.population-s.buildings.filter(b=>b.type==='keep'||b.type==='hut').length*0);
    let assigned=0;
    for(const b of s.buildings){if(['keep','hut','fort','ox'].includes(b.type)){b.workers=0;continue;}b.workers=assigned<workersAvailable?1:0;if(b.workers)assigned++;}
    const count=t=>s.buildings.filter(b=>b.type===t).length;
    const r=s.resources;
    if(s.ticks%2===0){r.wood+=count('woodcutter')*2;r.stone+=count('quarry')*count('ox')*1;r.wheat+=count('farm')*2;r.iron+=count('blacksmith')>0?1:0;}
    if(s.ticks%3===0){const flour=Math.min(r.wheat,count('mill')*2);r.wheat-=flour;r.flour+=flour;const bread=Math.min(r.flour,count('bakery')*2);r.flour-=bread;r.food+=bread*2;}
    if(s.ticks%5===0){
      const tax=TAX[Math.max(0,Math.min(4,s.tax))], ration=RATIONS[Math.max(0,Math.min(4,s.ration))];
      r.gold=Math.max(0,r.gold+Math.max(0,s.population+tax.gold));
      r.food=Math.max(0,r.food-Math.ceil(s.population*ration.food/5));
      let variety=Math.min(3,Math.max(0,(s.foods||[]).length-1));
      let score=50+tax.pop+ration.pop+variety+s.fear;
      if(r.food<=0)score-=12;
      s.popularity=Math.max(0,Math.min(100,Math.round(score)));
      const capacity=8+count('hut')*8;
      if(s.popularity>=50&&s.population<capacity&&s.ticks%10===0){s.population++;log(s,'В поселение прибыл крестьянин.');}
      if(s.popularity<50&&s.population>1&&s.ticks%15===0){s.population--;log(s,'Крестьянин покинул поселение.');}
    }
    for(const k of Object.keys(r))r[k]=Math.max(0,Math.floor(r[k]));
    return s;
  }
  return {COST,LABELS,TAX,RATIONS,initial,canBuild,build,tick,log};
})();