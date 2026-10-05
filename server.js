const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const QUESTION_TIME = 15;
const REVEAL_TIME = 2500;
const MAX_PLAYERS = 50;
const rooms = new Map();

const elements = [
  ['H','Hidrogênio'],['He','Hélio'],['Li','Lítio'],['Be','Berílio'],['B','Boro'],['C','Carbono'],['N','Nitrogênio'],['O','Oxigênio'],['F','Flúor'],['Ne','Neônio'],
  ['Na','Sódio'],['Mg','Magnésio'],['Al','Alumínio'],['Si','Silício'],['P','Fósforo'],['S','Enxofre'],['Cl','Cloro'],['Ar','Argônio'],
  ['K','Potássio'],['Ca','Cálcio'],['Sc','Escândio'],['Ti','Titânio'],['V','Vanádio'],['Cr','Cromo'],['Mn','Manganês'],['Fe','Ferro'],['Co','Cobalto'],['Ni','Níquel'],['Cu','Cobre'],['Zn','Zinco'],['Ga','Gálio'],['Ge','Germânio'],['As','Arsênio'],['Se','Selênio'],['Br','Bromo'],['Kr','Criptônio'],
  ['Rb','Rubídio'],['Sr','Estrôncio'],['Y','Ítrio'],['Zr','Zircônio'],['Nb','Nióbio'],['Mo','Molibdênio'],['Tc','Tecnécio'],['Ru','Rutênio'],['Rh','Ródio'],['Pd','Paládio'],['Ag','Prata'],['Cd','Cádmio'],['In','Índio'],['Sn','Estanho'],['Sb','Antimônio'],['Te','Telúrio'],['I','Iodo'],['Xe','Xenônio'],
  ['Cs','Césio'],['Ba','Bário'],['La','Lantânio'],['Ce','Cério'],['Pr','Praseodímio'],['Nd','Neodímio'],['Pm','Promécio'],['Sm','Samário'],['Eu','Európio'],['Gd','Gadolínio'],['Tb','Térbio'],['Dy','Disprósio'],['Ho','Hólmio'],['Er','Érbio'],['Tm','Túlio'],['Yb','Itérbio'],['Lu','Lutécio'],
  ['Hf','Háfnio'],['Ta','Tântalo'],['W','Tungstênio'],['Re','Rênio'],['Os','Ósmio'],['Ir','Irídio'],['Pt','Platina'],['Au','Ouro'],['Hg','Mercúrio'],['Tl','Tálio'],['Pb','Chumbo'],['Bi','Bismuto'],['Po','Polônio'],['At','Astato'],['Rn','Radônio'],
  ['Fr','Frâncio'],['Ra','Rádio'],['Ac','Actínio'],['Th','Tório'],['Pa','Protactínio'],['U','Urânio'],['Np','Netúnio'],['Pu','Plutônio'],['Am','Amerício'],['Cm','Cúrio'],['Bk','Berquélio'],['Cf','Califórnio'],['Es','Einstênio'],['Fm','Férmio'],['Md','Mendelévio'],['No','Nobélio'],['Lr','Laurêncio'],
  ['Rf','Rutherfórdio'],['Db','Dúbnio'],['Sg','Seabórgio'],['Bh','Bóhrio'],['Hs','Hássio'],['Mt','Meitnério'],['Ds','Darmstádio'],['Rg','Roentgênio'],['Cn','Copernício'],['Nh','Nihônio'],['Fl','Fleróvio'],['Mc','Moscóvio'],['Lv','Livermório'],['Ts','Tenessino'],['Og','Oganessônio']
].map(([symbol, name], i) => ({ number: i + 1, symbol, name }));

const definitions = [
  { prompt:'O que é um átomo?', options:['A menor unidade de um elemento químico que mantém suas propriedades químicas.','Uma mistura de vários elementos em partes iguais.','Uma tabela usada para organizar os elementos químicos.','Uma molécula formada obrigatoriamente por dois átomos.'], answer:0, explanation:'Átomo é a menor unidade de um elemento químico que mantém suas propriedades químicas.' },
  { prompt:'O que é a tabela periódica?', options:['Uma lista aleatória de substâncias.','Uma organização dos elementos químicos de acordo com o número atômico e padrões de propriedades.','Uma tabela que mostra apenas os metais.','Um desenho que representa somente átomos estáveis.'], answer:1, explanation:'A tabela periódica organiza os elementos químicos principalmente pelo número atômico e mostra padrões de propriedades.' },
  { prompt:'Qual partícula possui carga elétrica negativa?', options:['Próton','Nêutron','Elétron','Núcleo'], answer:2, explanation:'O elétron possui carga negativa.' },
  { prompt:'Qual partícula possui carga elétrica positiva?', options:['Próton','Nêutron','Elétron','Fóton'], answer:0, explanation:'O próton possui carga positiva e fica no núcleo.' }
];

const TYPES = new Set(['mixed','name-to-symbol','symbol-to-name','definition']);
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function normalize(s){return String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
function question(type){
  const e=elements[Math.floor(Math.random()*elements.length)];
  if(type==='name-to-symbol') return {type,prompt:`Qual é o símbolo químico de <strong>${e.name}</strong>?`,answer:e.symbol,displayAnswer:e.symbol,inputMode:'text',hint:'Ex.: Fe, Na, Au'};
  if(type==='symbol-to-name') return {type,prompt:`Qual elemento corresponde ao símbolo <strong>${e.symbol}</strong>?`,answer:e.name,displayAnswer:e.name,inputMode:'text',hint:'Digite o nome do elemento'};
  if(type==='definition'){const d=definitions[Math.floor(Math.random()*definitions.length)];return {type,prompt:d.prompt,options:d.options,answerIndex:d.answer,displayAnswer:d.options[d.answer],explanation:d.explanation,inputMode:'choice'};}
  if(Math.random()<.5)return {type:'mixed',prompt:`Digite o símbolo de <strong>${e.name}</strong>.`,answer:e.symbol,displayAnswer:`${e.symbol} — ${e.name}`,inputMode:'text',hint:'Ex.: H, O, Cl'};
  return {type:'mixed',prompt:`Digite o nome do elemento <strong>${e.symbol}</strong>.`,answer:e.name,displayAnswer:`${e.symbol} — ${e.name}`,inputMode:'text',hint:'Digite o nome'};
}
function cleanName(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,18);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>100000){req.destroy();reject(new Error('body too large'));}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(new Error('invalid json'));}});req.on('error',reject);});}
function publicRoom(room){return {code:room.code,hostId:room.hostId,started:room.started,finished:!!room.finished,questionNumber:room.questionNumber,totalQuestions:room.questions.length,timeLeft:Math.max(0,Math.ceil((room.deadline-Date.now())/1000)),players:[...room.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,answered:p.answered}))};}
function send(player,event,data){player.clients.forEach(res=>{res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);});}
function broadcast(room,event,data){for(const p of room.players.values())send(p,event,data);}
function broadcastRoom(room){broadcast(room,'room-state',publicRoom(room));}
function safeQuestion(q,n,total,deadline){const out={type:q.type,prompt:q.prompt,inputMode:q.inputMode,number:n,total,deadline};if(q.options)out.options=q.options;if(q.hint)out.hint=q.hint;return out;}
function standings(room){return [...room.players.values()].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'pt-BR')).map((p,i)=>({place:i+1,id:p.id,name:p.name,score:p.score,answered:p.answered}));}
function startRound(room){if(!room.started)return;room.revealed=false;room.questionNumber++;for(const p of room.players.values())p.answered=false;room.startedAt=Date.now();room.deadline=room.startedAt+QUESTION_TIME*1000;const q=room.questions[room.questionNumber-1];broadcast(room,'question',safeQuestion(q,room.questionNumber,room.questions.length,room.deadline));broadcastRoom(room);clearTimeout(room.timer);room.timer=setTimeout(()=>endRound(room),QUESTION_TIME*1000+40);}
function endRound(room){if(!room.started||room.revealed)return;room.revealed=true;clearTimeout(room.timer);const q=room.questions[room.questionNumber-1];broadcast(room,'round-result',{correctAnswer:q.displayAnswer,explanation:q.explanation||null,standings:standings(room),questionNumber:room.questionNumber,totalQuestions:room.questions.length});broadcastRoom(room);if(room.questionNumber>=room.questions.length)setTimeout(()=>finishGame(room),REVEAL_TIME);else setTimeout(()=>startRound(room),REVEAL_TIME);}
function finishGame(room){room.started=false;room.revealed=false;room.finished=true;broadcast(room,'game-over',{standings:standings(room)});broadcastRoom(room);}
function getRoom(code){return rooms.get(String(code||'').trim().toUpperCase());}
function touchPlayer(room,id){const p=room?.players.get(id);if(p)p.lastSeen=Date.now();}
function pruneIdle(){const now=Date.now();for(const room of rooms.values()){for(const p of room.players.values()){if(p.lastSeen && now-p.lastSeen>30000)removePlayer(room,p.id);}}}
setInterval(pruneIdle,5000);
function removePlayer(room,id){const p=room.players.get(id);if(!p)return;for(const r of p.clients){try{r.end();}catch{}}room.players.delete(id);if(room.hostId===id){const next=room.players.values().next().value;room.hostId=next?.id||null;}if(!room.players.size){clearTimeout(room.timer);rooms.delete(room.code);}else{broadcastRoom(room);}}

async function api(req,res,url){
  const body=await readBody(req).catch(()=>null);
  if(body===null)return json(res,400,{ok:false,error:'JSON inválido.'});
  if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true});
  if(req.method==='POST'&&url.pathname==='/api/create'){
    const name=cleanName(body.name);if(!name)return json(res,400,{ok:false,error:'Digite um apelido.'});
    let code;do{code=crypto.randomBytes(3).toString('hex').slice(0,5).toUpperCase();}while(rooms.has(code));
    const count=Math.min(20,Math.max(5,Number(body.questionCount)||10));const mode=TYPES.has(body.mode)?body.mode:'mixed';
    const id=crypto.randomUUID();const room={code,hostId:id,players:new Map(),started:false,finished:false,revealed:false,questionNumber:0,questions:Array.from({length:count},()=>question(mode)),deadline:0,startedAt:0,timer:null};
    room.players.set(id,{id,name,score:0,answered:false,clients:new Set(),lastSeen:Date.now()});rooms.set(code,room);return json(res,200,{ok:true,code,playerId:id,hostId:id,room:publicRoom(room)});
  }
  if(req.method==='POST'&&url.pathname==='/api/join'){
    const code=String(body.code||'').toUpperCase().trim();const name=cleanName(body.name);const room=getRoom(code);
    if(!room)return json(res,404,{ok:false,error:'Sala não encontrada.'});if(room.started)return json(res,409,{ok:false,error:'A partida já começou.'});if(room.players.size>=MAX_PLAYERS)return json(res,409,{ok:false,error:'A sala está cheia.'});if(!name)return json(res,400,{ok:false,error:'Digite um apelido.'});if([...room.players.values()].some(p=>normalize(p.name)===normalize(name)))return json(res,409,{ok:false,error:'Esse apelido já está sendo usado na sala.'});
    const id=crypto.randomUUID();room.players.set(id,{id,name,score:0,answered:false,clients:new Set(),lastSeen:Date.now()});broadcastRoom(room);return json(res,200,{ok:true,code,playerId:id,hostId:room.hostId,room:publicRoom(room)});
  }
  if(req.method==='GET'&&url.pathname==='/api/question'){
    const room=getRoom(url.searchParams.get('code'));const player=room?.players.get(url.searchParams.get('playerId'));
    if(!room||!player)return json(res,404,{ok:false,error:'Sala não encontrada.'});
    touchPlayer(room,player.id);
    if(room.revealed){const q=room.questions[room.questionNumber-1];const payload={roundResult:{correctAnswer:q.displayAnswer,explanation:q.explanation||null,standings:standings(room)}};if(room.questionNumber>=room.questions.length&&!room.started)payload.gameOver={standings:standings(room)};return json(res,200,{ok:true,...payload});}
    if(room.finished)return json(res,200,{ok:true,gameOver:{standings:standings(room)}});
    if(room.started&&room.questionNumber>0){const q=room.questions[room.questionNumber-1];return json(res,200,{ok:true,question:safeQuestion(q,room.questionNumber,room.questions.length,room.deadline)});}
    return json(res,200,{ok:true,question:null});
  }
  if(req.method==='GET'&&url.pathname==='/api/room'){
    const room=getRoom(url.searchParams.get('code'));if(!room)return json(res,404,{ok:false,error:'Sala não encontrada.'});touchPlayer(room,url.searchParams.get('playerId'));return json(res,200,{ok:true,room:publicRoom(room)});
  }
  if(req.method==='POST'&&url.pathname==='/api/start'){
    const room=getRoom(body.code);const player=room?.players.get(body.playerId);if(!room||!player)return json(res,404,{ok:false,error:'Sala não encontrada.'});if(room.hostId!==player.id)return json(res,403,{ok:false,error:'Somente o criador pode iniciar.'});if(room.started)return json(res,409,{ok:false,error:'A partida já começou.'});room.started=true;room.questionNumber=0;for(const p of room.players.values()){p.score=0;p.answered=false;}broadcast(room,'game-started',{});startRound(room);return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url.pathname==='/api/answer'){
    const room=getRoom(body.code);const player=room?.players.get(body.playerId);if(!room||!player||!room.started||room.revealed||player.answered)return json(res,409,{ok:false,error:'Resposta não aceita.'});if(Date.now()>room.deadline)return json(res,409,{ok:false,error:'O tempo acabou.'});const q=room.questions[room.questionNumber-1];let correct;if(q.inputMode==='choice')correct=Number(body.index)===q.answerIndex;else correct=normalize(body.value)===normalize(q.answer);player.answered=true;if(correct){const elapsed=(Date.now()-room.startedAt)/1000;player.score+=100+Math.max(0,Math.round((QUESTION_TIME-elapsed)*4));}broadcastRoom(room);if([...room.players.values()].every(p=>p.answered))endRound(room);return json(res,200,{ok:true,correct,score:player.score});
  }
  return json(res,404,{ok:false,error:'Rota não encontrada.'});
}

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/')){try{return await api(req,res,url);}catch(e){return json(res,500,{ok:false,error:'Erro interno do servidor.'});}}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method Not Allowed');}
  const requested=url.pathname==='/'?'/index.html':url.pathname;const file=path.normalize(path.join(PUBLIC_DIR,requested));if(!file.startsWith(PUBLIC_DIR)){res.writeHead(403);return res.end('Forbidden');}fs.stat(file,(err,st)=>{if(err||!st.isFile())return fs.stat(path.join(PUBLIC_DIR,'index.html'),(_,s)=>{if(_||!s?.isFile()){res.writeHead(404);return res.end('Not found');}const f=path.join(PUBLIC_DIR,'index.html');res.writeHead(200,{'Content-Type':mime['.html'],'Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();fs.createReadStream(f).pipe(res);});const ext=path.extname(file);res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);});
});

server.listen(PORT,'0.0.0.0',()=>console.log(`Batalha Química em http://localhost:${PORT}`));
