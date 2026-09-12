import {Match,GAMES,COLORS,NAMES,clamp,partySchedule} from './simulation.js';
import {RoomClient,parseRoomCode,roomLink,remapSnapshot,renderSnapshot,makeViewMatch,predictLocal} from './network.js';
import {applyPublicMatch} from './net-state.js';
import {MULTIPLAYER_URL} from './multiplayer-config.js';
import {bindPointerControls,readKeyboardInputs} from './controls.js';
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults={name:'Toi',color:0,skin:0,hair:0,coins:0,dances:[0],dance:0,sound:false};
let prefs={...defaults};try{const saved=JSON.parse(localStorage.getItem('bitemoji-party-v1')||'{}');prefs={...defaults,...saved};prefs.name=String(prefs.name||'Toi').slice(0,16);for(const k of ['color','skin','hair'])prefs[k]=clamp(Number(prefs[k])||0,0,k==='color'?7:k==='skin'?5:3);prefs.coins=Math.max(0,Number(prefs.coins)||0);if(!Array.isArray(prefs.dances))prefs.dances=[0];if(!prefs.dances.includes(prefs.dance))prefs.dance=0;}catch{}
let world,screen='loading',match=null,humans=1,roster=[],campaign=false,round=0,order=['pool','zombie','kick','spin'],masters=[],totals=Array(8).fill(0),pendingGame='pool',pausedFrom='playing',count=0,danceUntil=0,lobbyPhase=0,toastUntil=0,eventUntil=0,last=0,accumulator=0,hudAt=0,lastSurvivors='',audioContext;
let online=null,onlineState=null,onlinePhase='',onlineRound=-1,onlinePaused=false,pendingReverse=false;
const keys=new Set();let controls=null,pendingPoolShot=null,pendingKick=null,shotSequence=0;
const touchInput=()=>matchMedia('(any-pointer:coarse)').matches;
const save=()=>{try{localStorage.setItem('bitemoji-party-v1',JSON.stringify(prefs));}catch{}};
function setScreen(s){screen=s;document.body.dataset.screen=s;$('lobby').hidden=s!=='lobby';$('topbar').hidden=s!=='lobby';$('hud').hidden=!['playing','countdown','paused'].includes(s);$('countdown').hidden=s!=='countdown';}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function clearInputs(){keys.clear();controls?.clear();pendingPoolShot=null;pendingKick=null;pendingReverse=false;}
function toast(t){$('toast').textContent=t;$('toast').classList.add('visible');toastUntil=performance.now()+2800;}
function eventToast(t){$('event-toast').textContent=t;$('event-toast').classList.add('visible');eventUntil=performance.now()+2300;}
function sound(freq=440,duration=.10,type='sine',volume=.045){if(!prefs.sound)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.6,audioContext.currentTime+duration);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}catch{}}
function updateSoundButton(){$('sound').textContent=prefs.sound?'♫':'♪';$('sound').setAttribute('aria-label',prefs.sound?'Couper le son':'Activer le son');$('sound').title=prefs.sound?'Couper le son':'Activer le son';$('sound').style.opacity=prefs.sound?'1':'.7';}
function makeRoster(){roster=NAMES.map((name,i)=>({id:i,name:i===0?prefs.name:i===1&&humans===2?'Joueur 2':name,color:i===0?COLORS[prefs.color]:COLORS[i],x:i===0?0:Math.cos(i/7*Math.PI*2)*4.5,z:i===0?3:Math.sin(i/7*Math.PI*2)*3.5,angle:0,walk:0,jump:0,alive:true}));}
function lobby(rebuild=true){$('next-round').disabled=false;$('result-home').textContent='Retour à la fête';match=null;closeDialogs();clearInputs();setScreen('lobby');makeRoster();if(rebuild)world.build('lobby',roster,null,prefs.skin,prefs.hair);$('coins').textContent=prefs.coins;$('players-info').textContent=humans===2?'2 joueurs sur le même clavier + 6 bots':'Toi + 7 bots';$('player-display').textContent=prefs.name.toUpperCase();$('roster-preview').innerHTML=roster.map(p=>`<span style="background:${p.color}" title="${escapeHtml(p.name)}${p.id>=humans?' · bot':''}">${escapeHtml(p.name[0])}</span>`).join('');$('play-party').querySelector('span').textContent=campaign&&round>0&&round<4?'Manche suivante':'Lancer la party';$('party-caption').textContent=campaign&&round>0&&round<4?`À suivre : ${GAMES[order[round]].name} · manche ${round+1} / 4`:'Les 4 mini-jeux · environ 3 minutes';}
function fullParty(){if(!(campaign&&round>0&&round<4)){campaign=true;round=0;totals.fill(0);const schedule=partySchedule();order=schedule.games;masters=schedule.masters;}prepare(order[round]);}
function prepare(game){pendingGame=game;closeDialogs();clearInputs();setScreen('intro');$('role-picker').hidden=campaign;if(!campaign)document.querySelector('input[name="practice-role"][value="runner"]').checked=true;loadRound();$('intro-dialog').showModal();}
function poolControls(master,touch=false){
 const gm=touch?'Glisse la balle jaune vers le bas, puis relâche pour lancer.':'Souris : attrape la balle jaune, tire vers le bas puis relâche.';
 const runner=touch?'Joystick : bouger · Sauter : changer de pièce':'<kbd>ZQSD</kbd> / <kbd>WASD</kbd> : bouger · <kbd>Espace</kbd> : sauter';
 return (master===0?gm:runner)+(humans===2?(master===1?'<br>J2 Game Master : '+gm:'<br>J2 : <kbd>Flèches</kbd> + <kbd>Entrée</kbd> pour sauter'):'');
}
function spinControls(master,touch=false){
 const runner=touch?'Maintiens le joystick à gauche ou à droite, à contre-sens.':'<kbd>Q</kbd> / <kbd>A</kbd> : gauche · <kbd>D</kbd> : droite, à contre-sens';
 const boostRule=' · Recharge 5 s · Inverse entre deux boosts';
 const gm=(touch?'Inverser : change le sens · Accélérer : piège les joueurs':'<kbd>F</kbd> : inverser · <kbd>Espace</kbd> : accélérer')+boostRule;
 return (master===0?gm:runner)+(humans===2?(master===1?'<br>J2 : <kbd>Maj droite</kbd> inverser · <kbd>Entrée</kbd> accélérer'+boostRule:'<br>J2 : <kbd>←</kbd> / <kbd>→</kbd> à contre-sens'):'');
}
function kickControls(master,touch=false){
 const runner=touch?'Sauter : un appui, un saut. Observe la hauteur et la vitesse du pied.':'<kbd>Espace</kbd> : sauter · Bas / lent : saute au passage · Haut : reste au sol';
 const gm=touch?'Choisis En bas, En haut ou Lent. Un seul tour par attaque.':'<kbd>1</kbd> En bas · <kbd>2</kbd> En haut · <kbd>3</kbd> Lent';
 return (master===0?gm:runner)+(humans===2?(master===1?'<br>J2 Game Master : <kbd>↓</kbd> En bas · <kbd>↑</kbd> En haut · <kbd>→</kbd> Lent':'<br>J2 : <kbd>Entrée</kbd> sauter'):'');
}
function loadRound(){clearInputs();const game=pendingGame;const gm=campaign?masters[round]:document.querySelector('input[name="practice-role"]:checked').value==='master'?0:7;match=new Match({game,master:gm,humans,names:roster.map(r=>r.name),colors:roster.map(r=>r.color)});world.build(game,roster,match,prefs.skin,prefs.hair);const conf=GAMES[game];$('intro-icon').textContent=conf.icon;$('intro-icon').style.setProperty('--accent',conf.color);$('intro-round').textContent=campaign?`MANCHE ${round+1} SUR 4`:'PARTIE RAPIDE';$('intro-title').textContent=conf.name;$('intro-subtitle').textContent=conf.subtitle;$('intro-role').textContent=gm===0?'★ TU ES LE GAME MASTER':`${roster[gm].name.toUpperCase()} EST LE GAME MASTER`;$('intro-rule').textContent=gm===0?conf.master:conf.runner;
 const touch=touchInput();$('intro-controls').innerHTML=touch?'Joystick pour bouger · bouton à droite pour agir':`<kbd>ZQSD</kbd> / <kbd>WASD</kbd> pour ${gm===0&&game!=='zombie'?'viser':'bouger'}<br><kbd>Espace</kbd> : ${(gm===0?conf.masterAction:conf.action).toLowerCase()}${gm===0&&game==='spin'?' · <kbd>F</kbd> : inverser':''}${humans===2?'<br>J2 : <kbd>Flèches</kbd> + <kbd>Entrée</kbd>':''}`;
 if(game==='pool')$('intro-controls').innerHTML=poolControls(gm,touch);
 if(game==='kick')$('intro-controls').innerHTML=kickControls(gm,touch);
 if(game==='spin')$('intro-controls').innerHTML=spinControls(gm,touch);
 if(humans===2){const p=document.createElement('div');p.textContent=gm===1?'Joueur 2 : tu es le Game Master. '+conf.master:'Joueur 2 : '+conf.runner;p.className='second-role';$('intro-controls').append(p);}
 lastSurvivors='';refreshHud();}
function beginCountdown(){closeDialogs();clearInputs();count=3;setScreen('countdown');$('countdown').textContent='3';sound(600,.12);}
function refreshHud(){if(!match)return;const c=match.config,p=match.players[0],gm=match.master===0;const remaining=match.players.filter(p=>p.id!==match.master&&p.alive&&(match.game!=='zombie'||!p.infected)).length;
 $('round-label').textContent=campaign?`MANCHE ${round+1} / 4`:'PARTIE RAPIDE';$('game-title').textContent=c.name;$('timer').textContent=String(Math.max(0,Math.ceil(c.duration-match.time))).padStart(2,'0');$('timer').classList.toggle('urgent',c.duration-match.time<10);$('remaining').textContent=`${remaining} ${remaining===1?'survivant':'survivants'} / 7`;
 $('role').textContent=match.game==='zombie'?p.infected?'☣ TU ES UN ZOMBIE':'☀ SURVIS AU MANOIR':gm?'★ GAME MASTER':p.alive?'★ RESTE DANS LA PARTIE':'ÉLIMINÉ · REGARDE LA SUITE';$('role').classList.toggle('master',gm||p.infected);
 const states=match.players.map(p=>[p.alive,p.infected].join(',')).join(';');if(states!==lastSurvivors){lastSurvivors=states;$('survivors').innerHTML=match.players.filter(p=>p.id!==match.master).map(p=>`<span class="survivor ${!p.alive||p.infected?'out':''}" style="--color:${p.color}" title="${escapeHtml(p.name)}${p.infected?' · zombie':!p.alive?' · éliminé':''}">${escapeHtml(p.name[0])}</span>`).join('');}
 document.body.dataset.game=match.game;
 $('kick-controls').hidden=!(match.game==='kick'&&match.master<humans);
 const kickBusy=match.players[match.master].cooldown;
 document.querySelectorAll('[data-kick]').forEach(b=>b.disabled=screen!=='playing'||kickBusy>0);
 $('kick-status').textContent=kickBusy>0?'Tour en cours · '+kickBusy.toFixed(1)+' s':'Choisis ton attaque';
 $('action-button').hidden=(match.game==='kick'&&(gm||!p.alive))||(match.game==='spin'&&!gm)||(match.game==='pool'&&gm);
 $('joystick').hidden=match.game==='kick'||!p.alive||(gm&&['pool','spin'].includes(match.game));
 $('joystick').querySelector('span').textContent='DÉPLACER';
 $('joystick').setAttribute('aria-label','Joystick de déplacement');
 const poolMaster=match.game==='pool'&&match.master<humans,gmCooldown=match.players[match.master].cooldown;
 $('sling-control').hidden=!poolMaster;$('sling').disabled=gmCooldown>0||screen!=='playing';
 $('sling-status').textContent=gmCooldown>0?`Recharge · ${gmCooldown.toFixed(1)} s`:'Tire vers le bas, puis relâche';
 const action=gm?c.masterAction:c.action;$('action-label').textContent=action.toUpperCase();$('action-icon').textContent=match.game==='zombie'?'ϟ':gm?match.game==='spin'?'↻':'◎':'↑';const needsReverse=gm&&match.game==='spin'&&match.boostNeedsReverse;$('action-button').classList.toggle('charging',p.cooldown>0||needsReverse);$('action-button').setAttribute('aria-disabled',String(needsReverse||p.cooldown>0));$('cooldown-label').textContent=p.cooldown>.1?`${p.cooldown.toFixed(1)} s`:needsReverse?'INVERSE D’ABORD':touchInput()?'PRÊT':'ESPACE';$('reverse').hidden=!(gm&&match.game==='spin');$('split-labels').hidden=!(humans===2&&match.game==='zombie');
 const touch=touchInput();$('game-help').innerHTML=touch?`${gm?c.master:c.runner}`:humans===2?'J1 <kbd>ZQSD</kbd> <kbd>Espace</kbd> · J2 <kbd>↑ ← ↓ →</kbd> <kbd>Entrée</kbd>':`<kbd>ZQSD</kbd> / <kbd>WASD</kbd> ${gm&&match.game!=='zombie'?'viser':'bouger'} · <kbd>Espace</kbd> ${action.toLowerCase()}${gm&&match.game==='spin'?' · <kbd>F</kbd> inverser':''}`;
 if(match.game==='pool')$('game-help').innerHTML=poolControls(match.master,touch);
 if(match.game==='kick')$('game-help').innerHTML=kickControls(match.master,touch);
 if(match.game==='spin')$('game-help').innerHTML=spinControls(match.master,touch);
 if(online&&!onlineState?.canPlay){for(const id of ['joystick','action-button','sling-control','kick-controls','reverse'])$(id).hidden=true;$('role').textContent='SPECTATEUR · TU JOUES À LA PROCHAINE MANCHE';}
 if(online)$('emote').hidden=true;else $('emote').hidden=false;
}
function pause(){if(online){clearInputs();onlinePaused=true;online.setAway(true);$('pause-message').textContent='La partie continue. Un bot prend le relais jusqu’à ton retour.';$('pause-dialog').showModal();return;}$('pause-message').textContent='Les bots t’attendent aussi.';if(!['playing','countdown'].includes(screen))return;pausedFrom=screen;clearInputs();setScreen('paused');$('pause-dialog').showModal();}
function resume(){$('pause-dialog').close();clearInputs();if(online){onlinePaused=false;online.setAway(document.hidden||onlinePaused);return;}setScreen(pausedFrom);refreshHud();}
function finish(){const results=match.results();results.forEach(r=>totals[r.id]+=r.points);const earned=10+Math.floor(results.find(r=>r.id===0).points/5);prefs.coins+=earned;save();sound(800,.3,'triangle');setScreen('results');const final=campaign&&round===3;
 $('result-caption').textContent=final?'LES 4 MANCHES SONT TERMINÉES':campaign?`RÉSULTAT · MANCHE ${round+1} / 4`:'PARTIE RAPIDE TERMINÉE';
 const ordered=final?roster.map(p=>({...p,points:totals[p.id]})).sort((a,b)=>b.points-a.points):results;
 const top=ordered[0],tied=ordered.filter(p=>p.points===top.points).length;
 $('result-title').textContent=final?(top.id===0?'La couronne est à toi !':`${top.name} remporte la party !`):match.masterWon?(match.game==='zombie'?'Les zombies ont tout mangé !':'Le Game Master l’emporte !'):'Les survivants l’emportent !';
 $('result-subtitle').textContent=final?(tied>1?`${tied} ex æquo à ${top.points} points.`:`${top.points} points. Une belle brochette de champions.`):campaign?'Les points s’ajoutent au classement de la party.':'Bien joué ! On prend notre revanche ?';
 $('result-reward').textContent=`● +${earned} pièces · ${prefs.coins} dans ta poche`;
 $('leaderboard').innerHTML=ordered.map((r,i)=>`<li class="${r.id<humans?'me':''}"><span class="rank">${i+1}</span><span class="chip" style="background:${r.color}">${escapeHtml(r.name[0])}</span><span class="name">${escapeHtml(r.name)}${r.id>=humans?' <small class="point-label">BOT</small>':''}</span>${r.gm?'<span class="gm">★ GM</span>':''}<span class="pts">${r.points}</span><span class="point-label">pts${campaign&&!final?` · ${totals[r.id]} total`:''}</span></li>`).join('');
 $('next-round').innerHTML=final?'Rejouer une party <span>↻</span>':campaign?'Retour sur la piste <span>→</span>':'Rejouer ce mini-jeu <span>↻</span>';$('results-dialog').showModal();clearInputs();}
function events(){for(const e of match.events){const p=match.players[e.id];if(e.type==='infect'){eventToast(p.id===0?'Booouh ! À ton tour de chasser les humains.':`${p.name} a rejoint les zombies !`);sound(140,.25,'sawtooth',.022);}if(e.type==='out'){eventToast(p.id===0?'Oups ! Tu es éliminé. La manche continue.':`${p.name} est tombé !`);sound(220,.18,'triangle');}if(e.type==='jump')sound(500,.08);if(e.type==='bump')sound(100,.16,'triangle',.07);if(e.type==='splash')sound(190,.18,'sawtooth',.018);if(e.type==='attack')sound(320,.08,'triangle');if(e.type==='boost')eventToast('Ça accélère !');if(e.type==='reverse')eventToast('Changement de sens !');}match.events.length=0;}
function getInputs(){
 const input=readKeyboardInputs(keys,controls?.state,match);
 if(pendingPoolShot&&match?.game==='pool'&&match.master<humans){input[match.master].shot=pendingPoolShot;pendingPoolShot=null;}
 if(pendingKick&&match?.game==='kick'&&match.master<humans){input[match.master].kick=pendingKick;pendingKick=null;pendingReverse=false;}
 if(online&&pendingReverse){input[0].reverse=true;pendingReverse=false;}
 return input;
}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.08,Math.max(0,(now-(last||now))/1000));last=now;if(toastUntil&&now>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}if(eventUntil&&now>eventUntil){$('event-toast').classList.remove('visible');eventUntil=0;}
 if(!online&&screen==='countdown'){const prev=Math.ceil(count);count-=dt;if(count<=0){setScreen('playing');clearInputs();refreshHud();sound(960,.18);}else if(Math.ceil(count)!==prev){$('countdown').textContent=Math.ceil(count);$('countdown').style.animation='none';void $('countdown').offsetWidth;$('countdown').style.animation='';sound(600,.1);}}
 if(online&&onlineState){
  if(!document.hidden){online.setInput(screen==='playing'&&onlineState.canPlay?getInputs()[0]:{});online.flush();}
  const snapshot=renderSnapshot(online,now);
  if(snapshot?.match&&match&&snapshot.roundId===onlineRound){applyPublicMatch(match,snapshot.match);predictLocal(match,online,now);}
  if(now-hudAt>100){if(match)refreshHud();refreshOnline();hudAt=now;}
 }else if(screen==='playing'&&match){accumulator+=dt;let steps=0;while(accumulator>=1/60&&steps++<6){match.step(1/60,getInputs());accumulator-=1/60;}events();if(match.done){finish();accumulator=0;}if(now-hudAt>100){refreshHud();hudAt=now;}}
 else accumulator=0;
 if(screen==='lobby'&&!online){lobbyPhase+=dt;const input=getInputs()[0];const p=roster[0];if(!document.querySelector('dialog[open]')){p.x=clamp(p.x+input.x*dt*4.3,-6.5,6.5);p.z=clamp(p.z+input.z*dt*4.3,-5.5,5.5);if(Math.hypot(input.x,input.z)>.05){p.angle=Math.atan2(input.x,input.z);p.walk=(p.walk||0)+dt*12;}else p.walk=0;}}
 if(world)world.update(match,roster,screen==='paused'?(match?.time||0):now/1000,{lobby:screen==='lobby',dance:screen==='lobby'&&now<danceUntil?prefs.dance+1:0,two:humans===2});
}
function avatarOptions(){$('nickname').value=prefs.name;const skins=['#f1b485','#b97650','#ffd0a1','#d99768','#8e583b','#efc099'];for(const [id,values,key] of [['color-options',COLORS,'color'],['skin-options',skins,'skin']]){$(id).innerHTML=values.map((c,i)=>`<button class="${prefs[key]===i?'selected':''}" style="background:${c}" aria-label="${key==='color'?'Couleur':'Teint'} ${i+1}" aria-pressed="${prefs[key]===i}" data-option="${key}" data-value="${i}"></button>`).join('');}$('hair-options').innerHTML=['Ébouriffé','Carré','Mèche','Brun'].map((h,i)=>`<button class="${prefs.hair===i?'selected':''}" aria-pressed="${prefs.hair===i}" data-option="hair" data-value="${i}">${h}</button>`).join('');}
function danceList(){const dances=[['🕺','Le petit groove','La base. Indémodable.',0],['💫','La toupie','Tourner, c’est un style.',60],['🤖','Le robot','À chacun son déhanché.',100]];$('dance-list').innerHTML=dances.map(([icon,name,desc,price],i)=>`<div class="dance-item"><span class="dance-icon">${icon}</span><div><b>${name}</b><small>${desc}</small></div><button data-dance="${i}" class="${prefs.dance===i?'active':''}" ${!prefs.dances.includes(i)&&prefs.coins<price?'disabled':''}>${prefs.dances.includes(i)?prefs.dance===i?'Danser !':'Choisir':`● ${price}`}</button></div>`).join('');}
function wire(){
 wireOnline();
 $('game-cards').innerHTML=Object.entries(GAMES).map(([id,g])=>`<button class="game-card" data-game="${id}" style="--accent:${g.color}"><span class="card-icon">${g.icon}</span><span class="card-body"><b>${g.name}</b><small>${id==='zombie'?'Manoir XXL · 60 s':id==='pool'?'Tous à l’eau · 30 s':id==='kick'?'Ça va valser · 30 s':'Garde l’équilibre · 30 s'}</small></span><span class="card-arrow">▶</span></button>`).join('');
 $('game-cards').addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(!b)return;campaign=false;round=0;totals.fill(0);prepare(b.dataset.game);});
 $('play-party').onclick=fullParty;
 $('solo').onclick=()=>{humans=1;campaign=false;round=0;$('solo').classList.add('selected');$('duo').classList.remove('selected');$('solo').setAttribute('aria-pressed','true');$('duo').setAttribute('aria-pressed','false');lobby();};
 $('duo').onclick=()=>{humans=2;campaign=false;round=0;$('duo').classList.add('selected');$('solo').classList.remove('selected');$('duo').setAttribute('aria-pressed','true');$('solo').setAttribute('aria-pressed','false');lobby();toast('J1 : ZQSD + Espace · J2 : flèches + Entrée');};
 document.querySelectorAll('input[name="practice-role"]').forEach(r=>r.onchange=loadRound);
 $('start-round').onclick=beginCountdown;$('intro-back').onclick=()=>{if(online){leaveOnline();return;}campaign=false;round=0;lobby();};
 $('pause').onclick=pause;$('resume').onclick=resume;$('quit').onclick=()=>{if(online){leaveOnline();return;}campaign=false;round=0;lobby();};
 $('next-round').onclick=()=>{if(online){if(onlineState?.phase==='results'&&onlineState.ownerId===onlineState.selfId)online.start(onlineState.order.length===4?'party':onlineState.order[0]);return;}if(campaign){if(round===3){round=0;totals.fill(0);campaign=false;lobby();fullParty();}else{round++;lobby();danceUntil=performance.now()+5000;toast(`Intermission · ${GAMES[order[round]].name} t’attend !`);}}else prepare(pendingGame);};
 $('result-home').onclick=()=>{if(online){$('results-dialog').close();$('room-dialog').showModal();refreshOnline();return;}campaign=false;round=0;lobby();};
 $('home').onclick=()=>{if(online){leaveOnline();return;}campaign=false;round=0;lobby();};
 $('sound').onclick=()=>{prefs.sound=!prefs.sound;save();updateSoundButton();sound(700,.1);toast(prefs.sound?'Son activé':'Son coupé');};
 $('help').onclick=()=>$('help-dialog').showModal();$('credits').onclick=()=>$('credits-dialog').showModal();
 $('customize').onclick=()=>{avatarOptions();$('avatar-dialog').showModal();};
 $('avatar-dialog').addEventListener('click',e=>{const b=e.target.closest('[data-option]');if(!b)return;prefs.name=$('nickname').value.trim()||'Toi';prefs[b.dataset.option]=Number(b.dataset.value);save();makeRoster();world.build('lobby',roster,null,prefs.skin,prefs.hair);avatarOptions();});
 $('save-avatar').onclick=()=>{prefs.name=$('nickname').value.trim()||'Toi';save();lobby();toast('Nouvelle tête, mêmes ambitions !');};
 $('shop').onclick=()=>{danceList();$('shop-dialog').showModal();};
 $('dance-list').addEventListener('click',e=>{const b=e.target.closest('[data-dance]');if(!b)return;const i=Number(b.dataset.dance),cost=[0,60,100][i];if(!prefs.dances.includes(i)){if(prefs.coins<cost)return;prefs.coins-=cost;prefs.dances.push(i);}prefs.dance=i;save();$('shop-dialog').close();$('coins').textContent=prefs.coins;danceUntil=performance.now()+7000;toast(['Le petit groove !','Place à la toupie !','Mode robot activé !'][i]);});
 $('photo').onclick=()=>{world.update(null,roster,performance.now()/1000,{lobby:true,dance:prefs.dance+1});const a=document.createElement('a');a.href=world.photo();a.download='bitemoji-party-photo.png';a.click();$('flash').classList.remove('flash');void $('flash').offsetWidth;$('flash').classList.add('flash');sound(1600,.05);toast('Photo de la party téléchargée !');};
 const dance=()=>{if(screen==='lobby')danceUntil=performance.now()+5000;else if(match&&screen==='playing')match.players[0].emote=2;};$('emote').onclick=dance;
 document.querySelectorAll('[data-kick]').forEach(b=>b.onclick=()=>{if(screen==='playing'&&match?.game==='kick'&&match.master<humans&&match.players[match.master].cooldown<=0)pendingKick=b.dataset.kick;});
 $('reverse').onclick=()=>{if(match?.master===0&&match.game==='spin'&&screen==='playing'){if(online)pendingReverse=true;else match.reverseSpin();}};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 $('intro-dialog').addEventListener('cancel',e=>{e.preventDefault();campaign=false;round=0;lobby();});$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});$('results-dialog').addEventListener('cancel',e=>{e.preventDefault();if(online){$('results-dialog').close();$('room-dialog').showModal();return;}campaign=false;round=0;lobby();});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'){if(screen==='playing'||screen==='countdown'){e.preventDefault();pause();}return;}if(document.querySelector('dialog[open]'))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)dance();if(e.code==='KeyP'&&!e.repeat)pause();});
 document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{clearInputs();if(online)online.setAway(true);else pause();});window.addEventListener('focus',()=>{if(online)online.setAway(document.hidden||onlinePaused);});document.addEventListener('visibilitychange',()=>{if(online){clearInputs();online.setAway(document.hidden||onlinePaused);}else if(document.hidden){clearInputs();pause();}});
 controls=bindPointerControls({canvas:$('world'),joystick:$('joystick'),stick:$('stick'),action:$('action-button'),sling:$('sling'),ball:$('sling-ball'),elastic:$('sling-elastic'),
  getState:()=>({playing:screen==='playing'&&(!online||onlineState?.canPlay)&&!document.querySelector('dialog[open]'),game:match?.game,master:match?.master,humans,alive:match?.players[0].alive,cooldown:match?.players[match.master].cooldown||0,match}),
  aimAt:(x,y)=>world.pointer(x,y),onShot:shot=>{pendingPoolShot={...shot,id:++shotSequence};}
 });
 window.addEventListener('resize',()=>{clearInputs();world.resize();});
 matchMedia('(any-pointer:coarse)').addEventListener('change',()=>{clearInputs();refreshHud();});$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();toast('Le rendu 3D a été interrompu. Recharge la page pour reprendre.');});
}
function onlineEndpoint(){return ['localhost','127.0.0.1','terminal.local'].includes(location.hostname)?location.origin:MULTIPLAYER_URL;}
function onlineProfile(){return {name:prefs.name==='Toi'?'Joueur '+Math.floor(10+Math.random()*90):prefs.name,color:COLORS[prefs.color],skin:prefs.skin,hair:prefs.hair};}
async function connectOnline(code=null){
 if(online)return;
 $('room-dialog').showModal();$('room-status').textContent='Connexion…';$('room-error').textContent='';
 const endpoint=onlineEndpoint();if(!endpoint){$('room-status').textContent='Le multijoueur est indisponible pour le moment.';return;}
 $('room-create').disabled=true;$('room-join').disabled=true;
 online=new RoomClient({endpoint,profile:onlineProfile(),onSnapshot:receiveOnline,onStatus:status=>{$('room-status').textContent=status;$('network-status').textContent=status;},onError:error=>{$('room-error').textContent=error;toast(error);}});
 const client=online;
 try{if(code)await client.join(code);else await client.create();}
 catch(error){if(online===client){$('room-error').textContent=error.message;client.stop();online=null;}}
 finally{if(!online||online===client){$('room-create').disabled=false;$('room-join').disabled=false;}}
}
function leaveOnline(send=true){
 if(online){if(send)online.leave();else online.stop();}online=null;onlineState=null;onlinePhase='';onlineRound=-1;onlinePaused=false;humans=1;campaign=false;round=0;
 $('network-status').hidden=true;$('room-active').hidden=true;$('room-connect').hidden=false;$('room-error').textContent='';$('room-status').textContent='Un code ou un lien suffit.';
 const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);lobby();
}
function receiveOnline(snapshot){
 if(snapshot.notice&&snapshot.notice!==onlineState?.notice)toast(snapshot.notice);
 onlineState=snapshot;
 if(snapshot.phase==='closed'){toast(snapshot.notice||'Room fermée.');leaveOnline(false);return;}
 const mapped=remapSnapshot(snapshot),newRound=snapshot.roundId!==onlineRound;
 $('network-status').hidden=false;
 history.replaceState(null,'',roomLink(snapshot.code));
 if(snapshot.phase==='waiting'||(!mapped.match&&snapshot.phase==='results')){
  if(onlinePhase!==snapshot.phase){closeDialogs();setScreen('room');match=null;roster=Array.from({length:8},(_,id)=>({id,name:snapshot.members[id]?.name||NAMES[id],color:snapshot.members[id]?.color||COLORS[id],x:Math.cos(id/8*Math.PI*2)*4.5,z:Math.sin(id/8*Math.PI*2)*4.5,alive:true}));world.build('lobby',roster);$('room-dialog').showModal();}
 }else if(mapped.match){
  if(newRound){
   clearInputs();humans=1;campaign=mapped.order.length===4;round=mapped.round;order=mapped.order;totals=mapped.totals;roster=mapped.roster;
   match=makeViewMatch(mapped);world.build(match.game,roster,match,prefs.skin,prefs.hair);onlineRound=snapshot.roundId;lastSurvivors='';
  }
  if(onlinePhase!==snapshot.phase||newRound){
   closeDialogs();
   if(['countdown','playing'].includes(snapshot.phase)){setScreen(snapshot.phase);refreshHud();}
   else if(['intermission','results'].includes(snapshot.phase)){setScreen('results');$('results-dialog').showModal();}
  }
 }
 onlinePhase=snapshot.phase;if(onlinePaused&&!$('pause-dialog').open)$('pause-dialog').showModal();refreshOnline();
}
function refreshOnline(){
 if(!onlineState)return;const s=onlineState;
 $('room-connect').hidden=true;$('room-active').hidden=false;$('room-code').textContent=s.code;$('room-link').value=roomLink(s.code);
 const joined=s.members.filter(Boolean).length;$('room-count').textContent=`${joined} joueur${joined>1?'s':''} + ${8-joined} bot${joined<7?'s':''}`;
 $('room-members').innerHTML=Array.from({length:8},(_,id)=>{const m=s.members[id];return `<li><span style="background:${m?.color||COLORS[id]}">${escapeHtml(m?.name?.[0]||'B')}</span><b>${escapeHtml(m?.name||'Bot')}</b><small>${m?(m.owner?'Créateur · ':'')+(m.id===s.selfId?'Toi':m.connected?'Connecté':'Reconnexion…'):'Complète la partie'}</small></li>`;}).join('');
 const owner=s.selfId===s.ownerId;$('room-start').disabled=!owner||!['waiting','results'].includes(s.phase);$('room-game').disabled=!owner;
 $('room-launch-help').textContent=owner?'Lance quand tout le monde est là. Les places libres seront remplies par des bots.':'Seul le créateur peut lancer la partie.';
 const serverNow=s.serverTime+Math.max(0,performance.now()-(online?.receivedAt||performance.now()));
 if(s.phase==='countdown')$('countdown').textContent=String(Math.max(1,Math.ceil((s.phaseUntil-serverNow)/1000)));
 if(['intermission','results'].includes(s.phase)){
  const mapped=remapSnapshot(s),final=s.phase==='results',results=final?mapped.roster.map(p=>({...p,points:mapped.totals[p.id]})).sort((a,b)=>b.points-a.points):mapped.results||[];
  $('result-caption').textContent=final?'PARTIE TERMINÉE':`MANCHE ${s.round+1} / ${s.order.length}`;
  $('result-title').textContent=final?'Le classement de la room':s.match.masterWon?'Le Game Master l’emporte !':'Les survivants l’emportent !';
  $('result-subtitle').textContent=final?'Rejouez dans cette room ou partagez son lien.':s.notice||'Les points sont conservés pour la suite.';$('result-reward').textContent='ROOM '+s.code;
  $('leaderboard').innerHTML=results.map((r,i)=>`<li class="${r.id===0?'me':''}"><span class="rank">${i+1}</span><span class="chip" style="background:${r.color}">${escapeHtml(r.name[0])}</span><span class="name">${escapeHtml(r.name)}${mapped.roster[r.id]?.human?'':' <small>BOT</small>'}</span><span class="pts">${r.points}</span><small>pts</small></li>`).join('');
  $('next-round').disabled=!final||!owner;$('next-round').textContent=final?(owner?'Rejouer':'En attente du créateur'):`Manche suivante dans ${Math.max(1,Math.ceil((s.phaseUntil-serverNow)/1000))} s`;
  $('result-home').textContent='Voir la room';
 }
}
function wireOnline(){
 $('online-open').onclick=()=>{$('room-dialog').showModal();};
 $('room-create').onclick=()=>connectOnline();
 $('room-join').onclick=()=>{const code=parseRoomCode($('room-input').value);if(!code){$('room-error').textContent='Entre un code à 6 chiffres ou un lien de room.';return;}connectOnline(code);};
 $('room-input').addEventListener('keydown',e=>{if(e.key==='Enter'){$('room-join').click();e.preventDefault();}});
 $('room-start').onclick=()=>online?.start($('room-game').value);
 $('room-leave').onclick=()=>{if(online)leaveOnline();else $('room-dialog').close();};
 $('room-dialog').addEventListener('cancel',e=>{if(online){e.preventDefault();if(['playing','countdown'].includes(onlineState?.phase))$('room-dialog').close();}});
 $('room-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('room-link').value);toast('Lien copié !');}catch{$('room-link').select();toast('Sélectionne puis copie le lien.');}};
}
try{const {World}=await import('./world.js');world=new World($('world'));wire();updateSoundButton();lobby();$('loading').hidden=true;requestAnimationFrame(loop);const code=parseRoomCode(new URL(location.href).searchParams.get('room'));if(code)connectOnline(code);}catch(error){console.error(error);$('loading-text').textContent='Le rendu 3D n’a pas pu démarrer. Vérifie que l’accélération graphique est activée, puis recharge la page.';const b=document.createElement('button');b.className='primary';b.style.width='auto';b.textContent='Réessayer';b.onclick=()=>location.reload();$('loading').append(b);}
