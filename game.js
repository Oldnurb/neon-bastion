(() => {
"use strict";

const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");
const TAU = Math.PI * 2;
const SPEEDS = [1, 2, 4];

const UI = {
  money:$("money"), runScrap:$("runScrap"), vaultScrap:$("vaultScrap"),
  wave:$("wave"), enemyCount:$("enemyCount"), waveBar:$("waveBar"), waveStatus:$("waveStatus"),
  hudDamage:$("hudDamage"), hudHp:$("hudHp"), hudIncome:$("hudIncome"), hpBar:$("hpBar"),
  shieldLine:$("shieldLine"), heatLabel:$("heatLabel"), speedLabel:$("speedLabel"),
  pauseBtn:$("pauseBtn"), overdriveBtn:$("overdriveBtn"), overdriveLabel:$("overdriveLabel"),
  upgradePanel:$("upgradePanel"),
  augmentDialog:$("augmentDialog"), augmentChoices:$("augmentChoices"),
  extractDialog:$("extractDialog"), extractScrap:$("extractScrap"),
  infoDialog:$("infoDialog"), infoTitle:$("infoTitle"), infoBody:$("infoBody"),
  resultDialog:$("resultDialog"), resultKicker:$("resultKicker"), resultTitle:$("resultTitle"),
  resultText:$("resultText"), finalWave:$("finalWave"), bestWave:$("bestWave"), finalVault:$("finalVault")
};

const enemyTypes = {
  drone:{name:"Drifter",color:"#ff5b78",hp:11,speed:45,damage:7,reward:2,size:8,unlock:1,weight:68},
  runner:{name:"Rusher",color:"#ffe35b",hp:8,speed:88,damage:6,reward:3,size:7,unlock:2,weight:13},
  tank:{name:"Bulwark",color:"#ff9d4a",hp:52,speed:25,damage:18,reward:7,size:12,unlock:3,weight:9},
  swarm:{name:"Swarm",color:"#52ffd0",hp:5,speed:62,damage:4,reward:2,size:5,unlock:4,weight:7},
  sniper:{name:"Spiker",color:"#b67cff",hp:25,speed:30,damage:9,reward:8,size:9,unlock:6,weight:3},
  boss:{name:"Warden",color:"#ff43de",hp:360,speed:20,damage:32,reward:38,size:20,unlock:10,weight:0}
};

const state = {
  running:true, gameOver:false, speedIndex:0, activeTab:"attack",
  money:22, runScrap:0, vaultScrap:Number(localStorage.getItem("nbV2Vault") || 0),
  heat:1, lootMult:1, wave:1, waveActive:false, waveTotal:0, spawned:0, kills:0,
  spawnTimer:0, bossSpawned:false, enemies:[], shots:[], enemyShots:[], pickups:[], particles:[], texts:[],
  combo:0, comboTimer:0, shake:0,
  overdrive:{cooldown:22,timer:0,active:0,duration:6},
  core:{x:0,y:0,hp:100,maxHp:100,shield:0,maxShield:0,shieldRegen:0,armor:0,regen:0,
        damage:7,fireRate:2.15,range:165,critChance:.06,critMult:1.7,multiShot:1,incomeMult:1,
        pickupRadius:42,shotTimer:0,pulseDamage:0,pulseCooldown:7,pulseTimer:0},
  upgrades:{
    damage:0,fireRate:0,critChance:0,critMult:0,range:0,multiShot:0,
    maxHp:0,regen:0,armor:0,shield:0,shieldRegen:0,
    income:0,magnet:0,overdrive:0,pulse:0
  },
  augments:[]
};

const upgradeDefs = {
  attack:[
    {id:"damage",title:"Schaden",base:18,growth:1.34,max:30,value:()=>state.core.damage.toFixed(1),apply:()=>state.core.damage*=1.20},
    {id:"fireRate",title:"Feuerrate",base:25,growth:1.38,max:24,value:()=>`${state.core.fireRate.toFixed(2)}/s`,apply:()=>state.core.fireRate*=1.14},
    {id:"critChance",title:"Krit-Chance",base:15,growth:1.46,max:15,value:()=>`${Math.round(state.core.critChance*100)}%`,apply:()=>state.core.critChance+=.025},
    {id:"critMult",title:"Krit-Faktor",base:24,growth:1.50,max:12,value:()=>`x${state.core.critMult.toFixed(2)}`,apply:()=>state.core.critMult+=.18},
    {id:"range",title:"Reichweite",base:21,growth:1.41,max:16,value:()=>`${Math.round(state.core.range)} px`,apply:()=>state.core.range+=14},
    {id:"multiShot",title:"Mehrfachschuss",base:105,growth:2.0,max:4,value:()=>`${state.core.multiShot} Ziele`,apply:()=>state.core.multiShot+=1}
  ],
  defense:[
    {id:"maxHp",title:"Core-Leben",base:22,growth:1.40,max:25,value:()=>`${Math.round(state.core.maxHp)} HP`,apply:()=>{state.core.maxHp+=25;state.core.hp+=25}},
    {id:"regen",title:"Reparatur",base:34,growth:1.50,max:18,value:()=>`${state.core.regen.toFixed(1)} HP/s`,apply:()=>state.core.regen+=.5},
    {id:"armor",title:"Panzerung",base:38,growth:1.54,max:15,value:()=>`${Math.round(state.core.armor*100)}%`,apply:()=>state.core.armor=Math.min(.62,state.core.armor+.04)},
    {id:"shield",title:"Schild",base:52,growth:1.57,max:16,value:()=>`${Math.round(state.core.maxShield)}`,apply:()=>{state.core.maxShield+=20;state.core.shield+=20}},
    {id:"shieldRegen",title:"Schild-Regen",base:68,growth:1.62,max:12,value:()=>`${state.core.shieldRegen.toFixed(1)}/s`,apply:()=>state.core.shieldRegen+=.65}
  ],
  tech:[
    {id:"income",title:"Beute-Multiplikator",base:40,growth:1.58,max:15,value:()=>`x${state.core.incomeMult.toFixed(2)}`,apply:()=>state.core.incomeMult+=.09},
    {id:"magnet",title:"Salvage-Magnet",base:26,growth:1.45,max:16,value:()=>`${Math.round(state.core.pickupRadius)} px`,apply:()=>state.core.pickupRadius+=16},
    {id:"overdrive",title:"Overdrive-Kühlung",base:50,growth:1.60,max:12,value:()=>`${state.overdrive.cooldown.toFixed(1)}s`,apply:()=>state.overdrive.cooldown=Math.max(9,state.overdrive.cooldown-1.1)},
    {id:"pulse",title:"Nova-Puls",base:82,growth:1.67,max:16,value:()=>`${state.core.pulseDamage.toFixed(0)} Schaden`,apply:()=>{state.core.pulseDamage+=12;state.core.pulseCooldown=Math.max(3,state.core.pulseCooldown-.18)}}
  ]
};

const augmentPool = [
  {name:"Glass Cannon",desc:"+45% Schaden, aber −18% maximale Core-HP.",apply:()=>{state.core.damage*=1.45;state.core.maxHp*=.82;state.core.hp=Math.min(state.core.hp,state.core.maxHp)}},
  {name:"Twin Core",desc:"+1 Mehrfachschuss, −10% Feuerrate.",apply:()=>{state.core.multiShot+=1;state.core.fireRate*=.90}},
  {name:"Overclock",desc:"+35% Feuerrate. Overdrive lädt 20% schneller.",apply:()=>{state.core.fireRate*=1.35;state.overdrive.cooldown*=.80}},
  {name:"Longshot",desc:"+55 Reichweite und +15% Schaden.",apply:()=>{state.core.range+=55;state.core.damage*=1.15}},
  {name:"Executioner",desc:"+12% Krit-Chance und +0.35 Krit-Faktor.",apply:()=>{state.core.critChance+=.12;state.core.critMult+=.35}},
  {name:"Bulwark Protocol",desc:"+45 maximale HP und sofort komplett repariert.",apply:()=>{state.core.maxHp+=45;state.core.hp=state.core.maxHp}},
  {name:"Nanoforge",desc:"+1.5 HP/s Regeneration und +25 Schild.",apply:()=>{state.core.regen+=1.5;state.core.maxShield+=25;state.core.shield+=25}},
  {name:"Scavenger",desc:"+0.30 Beute-Multiplikator und größerer Salvage-Magnet.",apply:()=>{state.core.incomeMult+=.30;state.core.pickupRadius+=35}},
  {name:"Nova Reactor",desc:"+24 Nova-Schaden und kürzerer Puls-Cooldown.",apply:()=>{state.core.pulseDamage+=24;state.core.pulseCooldown=Math.max(2.5,state.core.pulseCooldown-1)}},
  {name:"Fortune Loop",desc:"+0.35 Run-Loot-Multiplikator. Mehr Risiko lohnt sich stärker.",apply:()=>{state.lootMult+=.35}},
  {name:"Emergency Plating",desc:"+12% Panzerung und +20 maximale HP.",apply:()=>{state.core.armor=Math.min(.68,state.core.armor+.12);state.core.maxHp+=20;state.core.hp+=20}},
  {name:"Hyperdrive",desc:"Overdrive dauert +3s und gibt zusätzlich +20% Schaden.",apply:()=>{state.overdrive.duration+=3;state.core.damage*=1.20}}
];

function vaultLevel(){ return Math.floor(state.vaultScrap/50); }
function saveVault(){ localStorage.setItem("nbV2Vault",String(Math.floor(state.vaultScrap))); }

function resize(){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.floor(r.width*dpr);canvas.height=Math.floor(r.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  state.core.x=r.width/2;state.core.y=r.height/2-14;
}
function size(){const r=canvas.getBoundingClientRect();return{w:r.width,h:r.height}}

function rand(min,max){return min+Math.random()*(max-min)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function id(){return crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}

function waveTotal(w){
  if(w%10===0) return 12+Math.floor(w*1.1);
  return 7+Math.floor(w*2.25);
}
function spawnInterval(){
  return Math.max(.18,.78-state.wave*.018);
}
function difficultyScale(){
  const w=state.wave;
  return (1+(w-1)*.145+Math.pow(Math.max(0,w-8),1.13)*.018)*state.heat;
}
function currentRemaining(){return state.enemies.length+Math.max(0,state.waveTotal-state.spawned)}

function chooseEnemy(){
  if(state.wave%10===0&&!state.bossSpawned){state.bossSpawned=true;return"boss"}
  const choices=Object.entries(enemyTypes).filter(([k,v])=>k!=="boss"&&state.wave>=v.unlock);
  const total=choices.reduce((s,[,v])=>s+v.weight,0);
  let r=Math.random()*total;
  for(const[k,v]of choices){r-=v.weight;if(r<=0)return k}
  return"drone";
}

function spawnEnemy(){
  const {w,h}=size(),typeKey=chooseEnemy(),base=enemyTypes[typeKey],scale=difficultyScale();
  const side=Math.floor(Math.random()*4),m=26;let x,y;
  if(side===0){x=Math.random()*w;y=-m}
  if(side===1){x=w+m;y=Math.random()*h}
  if(side===2){x=Math.random()*w;y=h+m}
  if(side===3){x=-m;y=Math.random()*h}
  const elite=typeKey!=="boss"&&Math.random()<Math.min(.18,.025+state.wave*.008);
  let hp=base.hp*scale*(elite?2.5:1);
  let damage=base.damage*(1+(state.wave-1)*.085)*state.heat*(elite?1.35:1);
  state.enemies.push({
    id:id(),typeKey,x,y,hp,maxHp:hp,speed:base.speed*(1+Math.min(.48,(state.wave-1)*.014)),
    damage,reward:base.reward*(elite?2.5:1),size:base.size*(elite?1.28:1),color:base.color,
    elite,angle:Math.random()*TAU,hitFlash:0,shootTimer:rand(.8,1.8)
  });
  state.spawned++;
}

function startWave(){
  state.waveTotal=waveTotal(state.wave);state.spawned=0;state.kills=0;state.spawnTimer=.45;
  state.bossSpawned=false;state.waveActive=true;state.running=true;
}

function fire(){
  const targets=state.enemies.map(e=>({e,d:Math.hypot(e.x-state.core.x,e.y-state.core.y)}))
    .filter(o=>o.d<=state.core.range).sort((a,b)=>a.d-b.d).slice(0,state.core.multiShot);
  for(const {e} of targets){
    const crit=Math.random()<state.core.critChance;
    const dmg=state.core.damage*(crit?state.core.critMult:1)*(state.overdrive.active>0?1.4:1);
    state.shots.push({x:state.core.x,y:state.core.y,targetId:e.id,speed:650,damage:dmg,crit,life:.55});
  }
}

function spawnEnemyShot(e){
  const dx=state.core.x-e.x,dy=state.core.y-e.y,d=Math.hypot(dx,dy)||1;
  state.enemyShots.push({x:e.x,y:e.y,vx:dx/d*210,vy:dy/d*210,damage:e.damage*.45,life:2.5,color:e.color});
}

function damageCore(amount){
  let rem=amount;
  if(state.core.shield>0){const used=Math.min(state.core.shield,rem);state.core.shield-=used;rem-=used}
  if(rem>0)state.core.hp=Math.max(0,state.core.hp-rem*(1-state.core.armor));
  state.shake=Math.min(9,state.shake+3.5);
  if(state.core.hp<=0&&!state.gameOver)failRun();
}

function dropPickup(e){
  const chance=e.typeKey==="boss"?1:e.elite?.75:.18;
  if(Math.random()>chance)return;
  const value=e.typeKey==="boss"?20:e.elite?6:1;
  state.pickups.push({x:e.x,y:e.y,value,life:9,phase:Math.random()*TAU});
}

function killEnemy(e){
  state.kills++;state.combo++;state.comboTimer=2.3;
  const comboMult=1+Math.min(.45,state.combo*.012);
  const money=Math.max(1,Math.round(e.reward*state.core.incomeMult*comboMult));
  state.money+=money;
  dropPickup(e);
  for(let i=0;i<(e.typeKey==="boss"?16:6);i++)state.particles.push({x:e.x,y:e.y,vx:rand(-95,95),vy:rand(-95,95),life:rand(.35,.75),color:e.color});
}

function collectPickup(p){
  const gain=Math.max(1,Math.round(p.value*state.lootMult*state.heat));
  state.runScrap+=gain;
  state.texts.push({x:p.x,y:p.y,text:`+${gain} ◆`,life:.8,color:"#e88cff"});
  p.life=0;
}

function nova(){
  if(state.core.pulseDamage<=0)return;
  state.core.pulseTimer=0;
  for(const e of state.enemies){
    if(Math.hypot(e.x-state.core.x,e.y-state.core.y)<state.core.range*.92){
      e.hp-=state.core.pulseDamage*(state.overdrive.active>0?1.25:1);e.hitFlash=.1;
    }
  }
  state.particles.push({x:state.core.x,y:state.core.y,vx:0,vy:0,life:.46,color:"#a7ff4f",pulse:true});
}

function update(dt){
  if(!state.running||state.gameOver)return;
  dt*=SPEEDS[state.speedIndex];

  if(state.comboTimer>0){state.comboTimer-=dt}else state.combo=0;
  state.core.hp=Math.min(state.core.maxHp,state.core.hp+state.core.regen*dt);
  state.core.shield=Math.min(state.core.maxShield,state.core.shield+state.core.shieldRegen*dt);

  if(state.overdrive.active>0)state.overdrive.active-=dt;
  else state.overdrive.timer=Math.max(0,state.overdrive.timer-dt);

  state.core.shotTimer-=dt;
  if(state.core.shotTimer<=0){
    fire();
    const rate=state.core.fireRate*(state.overdrive.active>0?2.8:1);
    state.core.shotTimer=1/rate;
  }

  state.core.pulseTimer+=dt;
  if(state.core.pulseDamage>0&&state.core.pulseTimer>=state.core.pulseCooldown)nova();

  if(state.waveActive&&state.spawned<state.waveTotal){
    state.spawnTimer-=dt;
    while(state.spawnTimer<=0&&state.spawned<state.waveTotal){
      spawnEnemy();state.spawnTimer+=spawnInterval();
    }
  }

  for(const e of state.enemies){
    e.hitFlash=Math.max(0,e.hitFlash-dt);e.angle+=dt*1.4;
    const dx=state.core.x-e.x,dy=state.core.y-e.y,dist=Math.hypot(dx,dy)||1;

    if(e.typeKey==="sniper"&&dist<175){
      e.shootTimer-=dt;
      if(e.shootTimer<=0){spawnEnemyShot(e);e.shootTimer=1.7}
    }else{
      e.x+=dx/dist*e.speed*dt;e.y+=dy/dist*e.speed*dt;
    }

    if(dist<27+e.size){damageCore(e.damage);e.hp=0}
  }

  for(const s of state.shots){
    const t=state.enemies.find(e=>e.id===s.targetId);
    if(!t){s.life=0;continue}
    const dx=t.x-s.x,dy=t.y-s.y,d=Math.hypot(dx,dy)||1,step=s.speed*dt;
    if(d<=step+t.size){
      t.hp-=s.damage;t.hitFlash=.08;s.life=0;
      if(s.crit)state.texts.push({x:t.x,y:t.y,text:`CRIT ${Math.round(s.damage)}`,life:.55,color:"#ffd65a"});
    }else{s.x+=dx/d*step;s.y+=dy/d*step;s.life-=dt}
  }

  for(const s of state.enemyShots){
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(Math.hypot(s.x-state.core.x,s.y-state.core.y)<25){damageCore(s.damage);s.life=0}
  }

  for(const p of state.pickups){
    p.life-=dt;p.phase+=dt*3;
    const dx=state.core.x-p.x,dy=state.core.y-p.y,d=Math.hypot(dx,dy)||1;
    if(d<state.core.pickupRadius){
      p.x+=dx/d*220*dt;p.y+=dy/d*220*dt;
      if(d<24)collectPickup(p);
    }
  }

  const dead=state.enemies.filter(e=>e.hp<=0);
  dead.forEach(killEnemy);
  state.enemies=state.enemies.filter(e=>e.hp>0);
  state.shots=state.shots.filter(s=>s.life>0);
  state.enemyShots=state.enemyShots.filter(s=>s.life>0);
  state.pickups=state.pickups.filter(p=>p.life>0);

  for(const p of state.particles){p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.life-=dt}
  state.particles=state.particles.filter(p=>p.life>0);
  for(const t of state.texts){t.y-=24*dt;t.life-=dt}
  state.texts=state.texts.filter(t=>t.life>0);

  if(state.waveActive&&state.spawned>=state.waveTotal&&state.enemies.length===0){
    completeWave();
  }
}

function completeWave(){
  state.waveActive=false;state.running=false;
  state.money+=5+state.wave;
  state.runScrap+=Math.max(1,Math.round((2+state.wave*.6)*state.lootMult*state.heat));
  if(state.wave%5===0)showExtraction();
  else showAugments();
}

function pickRandomAugments(){
  const shuffled=[...augmentPool].sort(()=>Math.random()-.5);
  return shuffled.slice(0,3);
}
function showAugments(){
  UI.augmentChoices.innerHTML="";
  for(const a of pickRandomAugments()){
    const b=document.createElement("button");b.className="choice-card";
    b.innerHTML=`<span class="rarity">RUN AUGMENT</span><h3>${a.name}</h3><p>${a.desc}</p><span class="pick">AUSWÄHLEN →</span>`;
    b.addEventListener("click",()=>{
      a.apply();state.augments.push(a.name);UI.augmentDialog.close();
      state.wave++;startWave();renderUpgrades();
    });
    UI.augmentChoices.appendChild(b);
  }
  UI.augmentDialog.showModal();
}
function showExtraction(){
  UI.extractScrap.textContent=state.runScrap;
  UI.extractDialog.showModal();
}
function pushDeeper(){
  UI.extractDialog.close();
  state.heat*=1.24;state.lootMult+=.16;
  state.core.hp=Math.min(state.core.maxHp,state.core.hp+state.core.maxHp*.18);
  showAugments();
}
function extractRun(){
  UI.extractDialog.close();
  state.vaultScrap+=state.runScrap;saveVault();
  finishRun(true,state.runScrap);
}
function failRun(){
  state.gameOver=true;state.running=false;state.waveActive=false;
  const rescued=Math.floor(state.runScrap*.25);
  state.vaultScrap+=rescued;saveVault();
  finishRun(false,rescued);
}
function finishRun(success,banked){
  const best=Math.max(Number(localStorage.getItem("nbV2Best")||1),state.wave);
  localStorage.setItem("nbV2Best",String(best));
  UI.resultKicker.textContent=success?"EXTRACTION COMPLETE":"RUN ENDE";
  UI.resultTitle.textContent=success?"BEUTE GESICHERT":"CORE ZERSTÖRT";
  UI.resultText.innerHTML=success
    ?`Du hast <strong>${banked} ◆</strong> permanent gesichert. Dein Vault-Level stärkt zukünftige Runs leicht.`
    :`Nur die Notfallbergung von <strong>${banked} ◆</strong> wurde gesichert. Der Rest der volatilen Beute ist verloren.`;
  UI.finalWave.textContent=state.wave;UI.bestWave.textContent=best;UI.finalVault.textContent=Math.floor(state.vaultScrap);
  if(!UI.resultDialog.open)UI.resultDialog.showModal();
}

function resetRun(){
  state.running=true;state.gameOver=false;state.speedIndex=0;state.activeTab="attack";
  state.money=22;state.runScrap=0;state.heat=1;state.lootMult=1;state.wave=1;
  state.waveActive=false;state.enemies=[];state.shots=[];state.enemyShots=[];state.pickups=[];state.particles=[];state.texts=[];
  state.combo=0;state.comboTimer=0;state.overdrive={cooldown:22,timer:0,active:0,duration:6};
  state.upgrades={damage:0,fireRate:0,critChance:0,critMult:0,range:0,multiShot:0,maxHp:0,regen:0,armor:0,shield:0,shieldRegen:0,income:0,magnet:0,overdrive:0,pulse:0};
  state.augments=[];
  const lvl=vaultLevel(),perm=Math.min(.30,lvl*.02);
  const hpBonus=Math.min(60,lvl*3);
  Object.assign(state.core,{hp:100+hpBonus,maxHp:100+hpBonus,shield:0,maxShield:0,shieldRegen:0,armor:0,regen:0,
    damage:7*(1+perm),fireRate:2.15,range:165,critChance:.06,critMult:1.7,multiShot:1,incomeMult:1,pickupRadius:42,
    shotTimer:0,pulseDamage:0,pulseCooldown:7,pulseTimer:0});
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab==="attack"));
  startWave();renderUpgrades();updateUI();
}

function upgradeCost(d){const l=state.upgrades[d.id]||0;return Math.floor(d.base*Math.pow(d.growth,l))}
function renderUpgrades(){
  UI.upgradePanel.innerHTML="";
  for(const d of upgradeDefs[state.activeTab]){
    const l=state.upgrades[d.id]||0,c=upgradeCost(d),maxed=l>=d.max;
    const b=document.createElement("button");b.className="upgrade";b.disabled=maxed;
    b.innerHTML=`<div><div class="upgrade-title">${d.title}</div><div class="upgrade-value">${d.value()}</div></div>
      <div class="upgrade-bottom"><span>Level ${l}/${d.max}</span><span class="upgrade-cost">${maxed?"MAX":`$ ${c}`}</span></div>`;
    b.addEventListener("click",()=>{
      const cost=upgradeCost(d);if(state.money<cost||(state.upgrades[d.id]||0)>=d.max)return;
      state.money-=cost;state.upgrades[d.id]=(state.upgrades[d.id]||0)+1;d.apply();renderUpgrades();
    });
    UI.upgradePanel.appendChild(b);
  }
}

function activateOverdrive(){
  if(state.overdrive.timer>0||state.overdrive.active>0||!state.running)return;
  state.overdrive.active=state.overdrive.duration;state.overdrive.timer=state.overdrive.cooldown;
  state.shake=5;
}

function showInfo(){
  const scale=difficultyScale();
  UI.infoTitle.textContent=`Welle ${state.wave} · Heat x${state.heat.toFixed(2)}`;
  const keys=Object.keys(enemyTypes).filter(k=>k!=="boss"||state.wave%10===0);
  UI.infoBody.innerHTML=`<div class="enemy-grid">
    <div class="enemy-row head"><span>Typ</span><span>HP</span><span>Tempo</span><span>Schaden</span></div>
    ${keys.map(k=>{const e=enemyTypes[k];return`<div class="enemy-row" style="${state.wave<e.unlock?"opacity:.35":""}">
      <span><i class="enemy-dot" style="background:${e.color}"></i>${e.name}</span>
      <span>${Math.round(e.hp*scale)}</span><span>${e.speed}</span>
      <span>${Math.round(e.damage*(1+(state.wave-1)*.085)*state.heat)}</span></div>`}).join("")}
  </div>
  <p class="muted">Alle 5 Wellen: Extraction-Entscheidung. Alle 10 Wellen: Warden-Boss. Vault-Level ${vaultLevel()} gibt zukünftigen Runs einen kleinen permanenten Startbonus.</p>`;
  UI.infoDialog.showModal();
}

function drawHex(x,y,r,stroke,fill=null,lw=2,rot=0){
  ctx.beginPath();for(let i=0;i<6;i++){const a=rot+i*Math.PI/3,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}
  ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();
}
function draw(){
  const {w,h}=size();ctx.clearRect(0,0,w,h);
  let ox=0,oy=0;if(state.shake>.1){ox=rand(-state.shake/2,state.shake/2);oy=rand(-state.shake/2,state.shake/2);state.shake*=.86}
  ctx.save();ctx.translate(ox,oy);

  ctx.strokeStyle="rgba(110,231,255,.045)";ctx.lineWidth=1;
  for(let x=0;x<w;x+=38){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=38){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}

  ctx.beginPath();ctx.arc(state.core.x,state.core.y,state.core.range,0,TAU);ctx.fillStyle="rgba(80,216,255,.025)";ctx.fill();ctx.strokeStyle="rgba(80,216,255,.17)";ctx.lineWidth=3;ctx.stroke();

  if(state.overdrive.active>0){
    ctx.beginPath();ctx.arc(state.core.x,state.core.y,state.core.range+8,0,TAU);
    ctx.strokeStyle=`rgba(167,255,79,${.35+.2*Math.sin(performance.now()/90)})`;ctx.lineWidth=3;ctx.stroke();
  }

  for(const p of state.pickups){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.phase);ctx.shadowBlur=15;ctx.shadowColor="#e88cff";
    ctx.strokeStyle="#e88cff";ctx.lineWidth=2;ctx.strokeRect(-5,-5,10,10);ctx.restore();
  }

  for(const s of state.shots){
    ctx.beginPath();ctx.arc(s.x,s.y,s.crit?4.2:3,0,TAU);ctx.fillStyle=s.crit?"#ffd65a":"#86f2ff";ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.fill();ctx.shadowBlur=0;
  }
  for(const s of state.enemyShots){
    ctx.beginPath();ctx.arc(s.x,s.y,4,0,TAU);ctx.fillStyle=s.color;ctx.shadowBlur=10;ctx.shadowColor=s.color;ctx.fill();ctx.shadowBlur=0;
  }

  for(const e of state.enemies){
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.shadowBlur=e.elite?19:11;ctx.shadowColor=e.color;
    const fill=e.hitFlash>0?"#fff":"rgba(5,7,15,.92)";
    if(e.typeKey==="boss"){drawHex(0,0,e.size,e.color,fill,3,Math.PI/6);drawHex(0,0,e.size*.58,e.color,null,2,0)}
    else if(e.typeKey==="tank"){drawHex(0,0,e.size,e.color,fill,e.elite?4:3,Math.PI/6)}
    else if(e.typeKey==="sniper"){ctx.strokeStyle=e.color;ctx.lineWidth=e.elite?4:3;ctx.beginPath();ctx.moveTo(0,-e.size);ctx.lineTo(e.size,e.size);ctx.lineTo(-e.size,e.size);ctx.closePath();ctx.stroke()}
    else{ctx.strokeStyle=e.color;ctx.lineWidth=e.elite?4:3;ctx.strokeRect(-e.size,-e.size,e.size*2,e.size*2)}
    if(e.elite){ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.globalAlpha=.55;ctx.strokeRect(-e.size-4,-e.size-4,(e.size+4)*2,(e.size+4)*2);ctx.globalAlpha=1}
    ctx.shadowBlur=0;ctx.restore();

    const hp=e.hp/e.maxHp;if(e.typeKey==="boss"||e.elite||hp<.999){const bw=e.size*2.7;ctx.fillStyle="rgba(255,255,255,.1)";ctx.fillRect(e.x-bw/2,e.y+e.size+7,bw,4);ctx.fillStyle=e.color;ctx.fillRect(e.x-bw/2,e.y+e.size+7,bw*clamp(hp,0,1),4)}
  }

  if(state.core.maxShield>0&&state.core.shield>0){ctx.beginPath();ctx.arc(state.core.x,state.core.y,31,0,TAU);ctx.strokeStyle=`rgba(116,168,255,${.2+.5*(state.core.shield/state.core.maxShield)})`;ctx.lineWidth=4;ctx.stroke()}
  ctx.shadowBlur=24;ctx.shadowColor="#6ee7ff";drawHex(state.core.x,state.core.y,22,"#9af2ff","rgba(6,13,28,.9)",3,0);ctx.shadowBlur=0;
  drawHex(state.core.x,state.core.y,11,state.overdrive.active>0?"#ffd65a":"#a7ff4f",null,2,Math.PI/6);

  for(const p of state.particles){
    const a=Math.max(0,p.life*1.6);
    if(p.pulse){const prog=1-Math.min(1,p.life/.46);ctx.beginPath();ctx.arc(p.x,p.y,18+state.core.range*prog,0,TAU);ctx.strokeStyle=`rgba(167,255,79,${a*.55})`;ctx.lineWidth=3;ctx.stroke()}
    else{ctx.globalAlpha=a;ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,TAU);ctx.fillStyle=p.color;ctx.fill();ctx.globalAlpha=1}
  }
  for(const t of state.texts){ctx.globalAlpha=clamp(t.life*1.6,0,1);ctx.fillStyle=t.color;ctx.font="800 12px system-ui";ctx.textAlign="center";ctx.fillText(t.text,t.x,t.y);ctx.globalAlpha=1}
  ctx.restore();

  if(!state.running&&!state.gameOver&&!UI.augmentDialog.open&&!UI.extractDialog.open&&!UI.infoDialog.open){
    ctx.fillStyle="rgba(0,0,0,.38)";ctx.fillRect(0,0,w,h);ctx.fillStyle="#effaff";ctx.font="900 28px system-ui";ctx.textAlign="center";ctx.fillText("PAUSE",w/2,h/2)
  }
}

function updateUI(){
  UI.money.textContent=Math.floor(state.money);UI.runScrap.textContent=Math.floor(state.runScrap);UI.vaultScrap.textContent=Math.floor(state.vaultScrap);
  UI.wave.textContent=state.wave;UI.heatLabel.textContent=`x${state.heat.toFixed(2)}`;
  const rem=currentRemaining();UI.enemyCount.textContent=`${rem} übrig`;
  const progress=state.waveTotal?clamp((state.waveTotal-rem)/state.waveTotal,0,1):0;UI.waveBar.style.width=`${progress*100}%`;
  UI.waveStatus.textContent=state.wave%10===0?"WARDEN · Bosswelle":state.wave%5===0?"EXTRACTION-CHECKPOINT":"Elites können zusätzliche Beute droppen";
  UI.hudDamage.textContent=state.core.damage.toFixed(1);UI.hudHp.textContent=`${Math.ceil(state.core.hp)} / ${Math.ceil(state.core.maxHp)}`;
  UI.hudIncome.textContent=`x${state.core.incomeMult.toFixed(2)}`;UI.hpBar.style.width=`${clamp(state.core.hp/state.core.maxHp*100,0,100)}%`;
  UI.shieldLine.textContent=`Schild ${Math.ceil(state.core.shield)} / ${Math.ceil(state.core.maxShield)}`;
  UI.speedLabel.textContent=`x${SPEEDS[state.speedIndex]}`;

  if(state.overdrive.active>0){UI.overdriveLabel.textContent=`AKTIV ${state.overdrive.active.toFixed(1)}s`;UI.overdriveBtn.classList.remove("cooling")}
  else if(state.overdrive.timer>0){UI.overdriveLabel.textContent=`${state.overdrive.timer.toFixed(1)}s`;UI.overdriveBtn.classList.add("cooling")}
  else{UI.overdriveLabel.textContent="READY";UI.overdriveBtn.classList.remove("cooling")}
}

canvas.addEventListener("pointerdown",(ev)=>{
  const r=canvas.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;
  const p=state.pickups.map(p=>({p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];
  if(p&&p.d<32)collectPickup(p.p);
});

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  state.activeTab=tab.dataset.tab;document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));renderUpgrades();
}));
$("speedDown").addEventListener("click",()=>{state.speedIndex=Math.max(0,state.speedIndex-1)});
$("speedUp").addEventListener("click",()=>{state.speedIndex=Math.min(SPEEDS.length-1,state.speedIndex+1)});
UI.pauseBtn.addEventListener("click",()=>{if(state.gameOver)return;state.running=!state.running;UI.pauseBtn.textContent=state.running?"Ⅱ":"▶"});
$("restartBtn").addEventListener("click",()=>{if(confirm("Diesen Run wirklich verwerfen und neu starten?"))resetRun()});
UI.overdriveBtn.addEventListener("click",activateOverdrive);
$("waveInfoBtn").addEventListener("click",()=>{const prev=state.running;state.running=false;showInfo();UI.infoDialog.dataset.resume=prev?"1":"0"});
$("closeInfoBtn").addEventListener("click",()=>{UI.infoDialog.close();if(UI.infoDialog.dataset.resume==="1")state.running=true});
$("pushBtn").addEventListener("click",pushDeeper);
$("extractBtn").addEventListener("click",extractRun);
$("newRunBtn").addEventListener("click",()=>{UI.resultDialog.close();resetRun()});
window.addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();activateOverdrive()}});
window.addEventListener("resize",resize);

let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();updateUI();requestAnimationFrame(loop);
}
resize();resetRun();requestAnimationFrame(loop);
})();
