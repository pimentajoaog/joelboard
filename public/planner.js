/* Joelboard Planner — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. */
var DATA=null, plannerGrid={}, authDone=false, openPlanId=null, homeQuery='', _pbooted=false, _edMenuOpen=false, _focusDay='';
var _stPlHome=false, _stPlTl={};
var _linkOpen={}, _linkSnaps={}, _linkTarget=null;
var _editPlanId=null, _editDayId=null, _editEvtId=null, _editEvtDayId=null, _plEvtMer='', newStart='', newEnd='', newIcon='✈️';
var _rowCache={};
var PL_TABS=[
  ['Planos',['Titulo','Subtitulo','Inicio','Fim','Icone','Criado','Atualizado','ID','Listas']],
  ['Dias',['PlanoID','Data','Titulo','Icone','Ordem','ID','Listas']],
  ['Eventos',['DiaID','Hora','HoraMin','Titulo','Nota','Icone','Tag','TagCor','Ordem','ID']],
  ['Config',['Chave','Valor']],
  ['Compartilhadas',['Titulo','SheetID','Papel','Owner','PlanoID','Atualizado']]
];
var PL_DAY_ICONS=['✈️','🏔️','🍷','🍽️','🌆','🚶','🎉','🏠','🌅','🌊','🎿','☕','🎵','🛍️','🏛️','🌴','📝','⭐','🚗','🛏️'];
var PL_EVT_ICONS=['','✈️','🍽️','☕','🏨','🚶','🍷','🎵','🛍️','🌅','🎉','📍','🚗','🎿'];
var PL_ICON_EXTRAS=['📅','📌','🎯','💡','📚','🐶','🐱','💼','🎁','🍕','🌱','💪','🎨','📷','💊','🎮','❤️','🔥','🌈','📎','🗂️','💬','🔔','⏰','🏋️','🧘','🛠️','📦','🌸','🍀','🎬','🏖️','🧁','🍳','🏨','📍'];
var PL_TAG_COLORS=[{k:'warn',hex:'#fb923c'},{k:'ok',hex:'#34d399'},{k:'mute',hex:'#7b85a0'}];
var PL_WD=['dom','seg','ter','qua','qui','sex','sáb'];
var PL_PERIODS={
  madrugada:180, manha:540, 'manhã':540, manhã:540, morning:540,
  'meio-dia':720, meiodia:720, 'meio dia':720, noon:720, almoco:750, 'almoço':750,
  tarde:900, afternoon:900, 'fim de tarde':1020, noite:1200, evening:1200, night:1200,
  'meia-noite':0, meianoite:0, 'meia noite':0, midnight:0
};
var PL_TOUR=[
  { title:'Joelboard Planner', body:'Monte roteiros, encontros e viagens — um plano por vez, no seu ritmo.' },
  { sel:'#fab', title:'Novo plano', body:'Título, vibe e as datas. Cole qualquer emoji no ícone — como no Notes. Os dias aparecem sozinhos na linha do tempo.' },
  { go:function(){}, sel:'#main', title:'Linha do tempo', body:'Toque num dia para o título, num horário para o evento. Tudo é opcional — inclusive o horário.' }
];

function $(id){ return document.getElementById(id); }
function uuid(){ return 'xxxxxxxxxxxx4xxychxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function loadingHtml(h){ $('loading').style.display='block'; $('loading').innerHTML=h; }
function toast(m){ JB.toast(m); }
function plWriteErr(e){ toast(JB.writeErrMessage ? JB.writeErrMessage(e) : ('Erro: '+((e&&e.message)||'falha ao salvar'))); }
function plRowErr(tab){ return new Error('Registro não encontrado em '+tab+' — atualize a página.'); }
function body(rows){ return (rows||[]).slice(1); }

function plParseYmd(x){
  var s=String(x||'').trim();
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  var d=new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  if(d.getFullYear()!==Number(m[1]) || d.getMonth()!==Number(m[2])-1 || d.getDate()!==Number(m[3])) return null;
  return d;
}
function plYmd(d){
  var y=d.getFullYear(), m=d.getMonth()+1, day=d.getDate();
  return y+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day;
}
function plTodayYmd(){ return (JB.todayYmd && JB.todayYmd()) || plYmd(new Date()); }
function plAddDays(ymd, n){
  var d=plParseYmd(ymd); if(!d) return '';
  d.setDate(d.getDate()+n);
  return plYmd(d);
}
function plDaysFromRange(start, end){
  var a=plParseYmd(start), b=plParseYmd(end);
  if(!a || !b || b<a) return [];
  var out=[], cur=new Date(a.getTime()), i=0;
  while(cur<=b && i<366){
    out.push({ date:plYmd(cur), ordem:i });
    cur.setDate(cur.getDate()+1);
    i++;
  }
  return out;
}
function plNights(start, end){
  var days=plDaysFromRange(start, end);
  return days.length ? days.length-1 : 0;
}
function plFmtHoraLabel(min, approx){
  var h=Math.floor(Number(min)/60), m=Number(min)%60;
  var label=h+'h'+(m?((m<10?'0':'')+m):'');
  return (approx?'~':'')+label;
}
function plApplyMeridiem(h, mer){
  if(h<1 || h>12) return -1;
  if(mer==='night') return h===12?0:h+12;
  if(mer==='am') return h===12?0:h;
  if(mer==='pm') return h===12?12:h+12;
  return -1;
}
function plParseHora(raw, merHint){
  var original=String(raw==null?'':raw).trim();
  if(!original) return { ok:true, ask:false, label:'', min:'' };
  var approx=/^[~≈～]/.test(original) || /^(cerca de|por volta d[aeos]*|uns)\s+/i.test(original);
  var s=original.toLowerCase()
    .replace(/^[~≈～]+\s*/,'')
    .replace(/^(cerca de|por volta d[aeos]*|uns)\s+/,'')
    .replace(/^(às|as|at)\s+/,'')
    .replace(/\s+/g,' ')
    .trim();
  if(PL_PERIODS[s]!=null) return { ok:true, ask:false, label:original, min:PL_PERIODS[s] };
  var mer='';
  var merM=s.match(/\s*(a\.?\s*m\.?|p\.?\s*m\.?|da manh[aã]|de manh[aã]|da tarde|da noite|da madrugada)$/);
  if(merM){
    var w=merM[1].replace(/[\s.]/g,'');
    if(w==='danoite') mer='night';
    else if(w.charAt(0)==='p' || w==='datarde') mer='pm';
    else mer='am';
    s=s.slice(0, merM.index).trim();
  } else {
    var glue=s.match(/^(.*?)(a\.?m\.?|p\.?m\.?)$/);
    if(glue && /[0-9]/.test(glue[1])){
      mer=glue[2].charAt(0)==='p'?'pm':'am';
      s=glue[1].replace(/[\s.]+$/,'');
    }
  }
  s=s.replace(/\s*(horas?|hs)$/,'').trim();
  var h=-1, mi=0, clock=false, bareHour=false, m;
  m=s.match(/^(\d{1,2})\s*[h:.](\d{2})\s*h?s?$/);
  if(m){ h=+m[1]; mi=+m[2]; clock=true; }
  else {
    m=s.match(/^(\d{1,2})\s*h\s*s?$/);
    if(m){ h=+m[1]; mi=0; clock=true; }
    else {
      m=s.match(/^(\d{1,2})$/);
      if(m){ h=+m[1]; mi=0; clock=true; bareHour=m[1].length<2; }
    }
  }
  if(!clock){
    if(/[0-9]/.test(original) || mer) return { ok:false, ask:false, label:original, min:'' };
    return { ok:true, ask:false, label:original, min:'' };
  }
  if(mi<0 || mi>59) return { ok:false, ask:false, label:original, min:'' };
  if(mer){
    h=plApplyMeridiem(h, mer);
    if(h<0) return { ok:false, ask:false, label:original, min:'' };
  } else {
    if(bareHour) return { ok:false, ask:false, label:original, min:'' };
    if(h<0 || h>23) return { ok:false, ask:false, label:original, min:'' };
    var ambiguous=h>=1 && h<=12;
    var hint=(merHint==='am'||merHint==='pm')?merHint:'';
    if(ambiguous && !hint){
      var prov=h*60+mi;
      return { ok:true, ask:true, label:plFmtHoraLabel(prov, approx), min:prov, hour:h, mi:mi, approx:approx };
    }
    if(ambiguous && hint){
      h=plApplyMeridiem(h, hint);
      if(h<0) return { ok:false, ask:true, label:original, min:'' };
      var resolved=h*60+mi;
      return { ok:true, ask:true, label:plFmtHoraLabel(resolved, approx), min:resolved, hour:h, mi:mi, approx:approx };
    }
  }
  var min=h*60+mi;
  return { ok:true, ask:false, label:plFmtHoraLabel(min, approx), min:min };
}
function plHoraMinFromLabel(raw){
  var p=plParseHora(raw);
  return p.ok?p.min:'';
}
function plEventMin(e){
  if(!e) return 1e9;
  if(e.horaMin!=='' && e.horaMin!=null && isFinite(Number(e.horaMin))) return Number(e.horaMin);
  var p=plParseHora(e.hora||'');
  return (p.ok && p.min!=='')?Number(p.min):1e9;
}
function plSortEvents(list){
  return (list||[]).slice().sort(function(a,b){
    var am=plEventMin(a), bm=plEventMin(b);
    if(am!==bm) return am-bm;
    if((a.ordem||0)!==(b.ordem||0)) return (a.ordem||0)-(b.ordem||0);
    return String(a.titulo||'').localeCompare(String(b.titulo||''));
  });
}
function plWeekday(ymd){ var d=plParseYmd(ymd); return d?PL_WD[d.getDay()]:''; }
function plFmtDay(ymd){
  var d=plParseYmd(ymd); if(!d) return ymd||'';
  return (d.getDate()<10?'0':'')+d.getDate()+'/'+((d.getMonth()+1)<10?'0':'')+(d.getMonth()+1);
}
function plFmtRange(start, end){
  if(!start && !end) return '';
  if(start && end) return plFmtDay(start)+' – '+plFmtDay(end);
  return plFmtDay(start||end);
}
function plRangeHint(start, end){
  var days=plDaysFromRange(start, end);
  if(!days.length) return 'Escolha um intervalo válido.';
  var n=days.length-1;
  return days.length+' '+(days.length===1?'dia':'dias')+(n?(' · '+n+(n===1?' noite':' noites')):'');
}
function plNormIcon(s){
  var p=Array.from(String(s||'').trim());
  return p.length?p.slice(0,2).join(''):'';
}

function rowCacheKeySid(sid, tab){ return sid+'|'+tab; }
function seedRowCacheForSid(sid, tab, rows, idCol){
  var map={};
  for(var i=1;i<(rows||[]).length;i++){ var id=String((rows[i]||[])[idCol]); if(id) map[id]=i+1; }
  _rowCache[rowCacheKeySid(sid, tab)]=map;
}
function invalidateRowCacheForSid(sid, tab){ delete _rowCache[rowCacheKeySid(sid, tab)]; }
function findRowInSid(sid, tab, idCol, id){
  var key=rowCacheKeySid(sid, tab), cached=_rowCache[key];
  if(cached && cached[String(id)]!=null) return Promise.resolve(cached[String(id)]);
  return JB.api('GET', plSheetUrl(sid, '/values/'+encodeURIComponent(tab)+'?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    seedRowCacheForSid(sid, tab, res.values||[], idCol);
    var row=_rowCache[key]?_rowCache[key][String(id)]:null;
    return row!=null?row:-1;
  });
}

function plSheetUrl(sid, p){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+sid+p; }
function plSidForPlan(p){ if(p&&p.collabSheetId) return p.collabSheetId; return JB.getSheetId('planner'); }
function plPlanTab(p){ return (p&&p.collabSheetId)?'Meta':'Planos'; }
function plGridForPlan(p){ if(p&&p.collabSheetId) return (typeof collabGrids!=='undefined'&&collabGrids[p.collabSheetId])||{}; return plannerGrid; }
function personalSsUrl(p){ return plSheetUrl(JB.getSheetId('planner'), p); }
function ssUrl(p){ return plSheetUrl(plSidForPlan(plan(openPlanId)), p); }

function plRejectCollabAsPersonal(grid){
  return typeof plIsCollabSpreadsheetGrid==='function' && plIsCollabSpreadsheetGrid(grid);
}

function startAuth(){
  if (JB.isGhost && JB.isGhost()) {
    authDone=true;
    var fx=JB.ghostFixture&&JB.ghostFixture('planner');
    plannerGrid=(fx&&fx.grid)||{ Planos:0, Dias:1, Eventos:2, Config:3, Compartilhadas:4 };
    DATA=(fx&&fx.data)||{ planos:[], dias:[], eventos:[], config:{} };
    show();
    return;
  }
  if (JB.cachedToken()){ afterAuth(); return; }
  if (JB.bootAuthIfExpired(function(){ authDone=false; showSignIn(true); }, function(){ authDone=true; afterAuth(); })) {
    loadingHtml('<div class="gate"><div class="gt">📅 Joelboard Planner</div><div class="gs">Carregando…</div></div>');
    return;
  }
  loadingHtml('<div class="gate"><div class="gt">📅 Joelboard Planner</div><div class="gs">Entrando…</div></div>');
  JB.requestToken(false).then(function(){ authDone=true; afterAuth(); }).catch(showSignIn);
  setTimeout(function(){ if(!authDone && !JB.cachedToken()) showSignIn(); }, 16000);
}
JB.onSessionExpired(function(){ authDone=false; showSignIn(true); });
JB.onAuthRestored(function(){ if(!JB.isSignedIn()||authDone) return; authDone=true; afterAuth(); });
function showSignIn(expired){ loadingHtml('<div class="gate"><div class="gt">📅 Joelboard Planner</div><div class="gs">'+(expired?'Sua sessão expirou. Entre de novo com Google para continuar.':'Roteiros e encontros — juntos ou só seus.')+'</div><button class="btn" onclick="doSignIn()">Entrar com Google</button></div>'); }
function doSignIn(){ JB.signIn({ onSuccess: function(){ authDone=true; afterAuth(); } }); }
function plSignOut(){ JB.signOut(); location.reload(); }
function afterAuth(){ loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Carregando…</div></div>'); JB.fetchEmail().then(bootSheet); }

function createPersonalPlannerSpreadsheet(){
  var title='📝 Joelboard Planner — '+(JB.email()?JB.email().split('@')[0]:'Pessoal');
  return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets',{ properties:{title:title}, sheets:PL_TABS.map(function(t){return {properties:{title:t[0]}};}) })
    .then(function(ss){
      JB.setSheetId('planner',ss.spreadsheetId);
      var data=PL_TABS.map(function(t){return {range:t[0]+'!A1',values:[t[1]]};});
      return JB.api('POST',plSheetUrl(ss.spreadsheetId,'/values:batchUpdate'),{valueInputOption:'RAW',data:data}).then(function(){
        return JB.sheetTabs(ss.spreadsheetId).then(function(grid){ plannerGrid=grid; return grid; });
      });
    });
}
function ensurePersonalPlannerSheet(){
  var id=JB.getSheetId('planner');
  if(!id) return createPersonalPlannerSpreadsheet();
  return JB.sheetTabs(id).then(function(grid){
    if(plRejectCollabAsPersonal(grid) || !grid['Planos']){
      JB.clearSheetId('planner');
      return createPersonalPlannerSpreadsheet();
    }
    plannerGrid=grid;
    return ensureTabs().then(function(){ return plannerGrid; });
  });
}
function bootSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Procurando seus planos…</div></div>');
  JB.resolveSheet({ app:'planner', namePart:'Joelboard Planner', requiredTabs: ['Planos'] })
    .then(function(ctx){
      if(plRejectCollabAsPersonal(ctx.grid)){
        JB.clearSheetId('planner');
        plPersonalGate('A planilha conectada é de um plano compartilhado. Crie ou conecte uma planilha pessoal.');
        return;
      }
      plannerGrid=ctx.grid;
      return ensureTabs().then(ensurePlannerLinkHeaders).then(loadData);
    })
    .catch(function(e){ var m=String((e&&e.message)||''); if(m.indexOf('silent_timeout')>-1||m.indexOf('auth_failed')>-1||m.indexOf('401')>-1||m.indexOf('cancelled')>-1){ showSignIn(); return; } if(m==='JB_NEED_SHEET'){ var f=(e.files||[]); if(f.length>1) offerLink(f[0]); else gate(); return; } loadingHtml(JB.bootRetryHtml('bootSheet()', { inputId:'plUrl', pasteCall:'linkSheet()', errId:'plErr', msg:(JB.isTransientErr&&JB.isTransientErr(e))?undefined:('Erro: '+m) })); });
}
function ensureTabs(){
  var missing=PL_TABS.filter(function(t){ return plannerGrid[t[0]]==null; });
  if(!missing.length) return Promise.resolve();
  return JB.api('POST', personalSsUrl(':batchUpdate'), { requests: missing.map(function(t){ return { addSheet:{ properties:{ title:t[0] } } }; }) })
    .then(function(res){ (res.replies||[]).forEach(function(rep){ if(rep&&rep.addSheet){ plannerGrid[rep.addSheet.properties.title]=rep.addSheet.properties.sheetId; } });
      return JB.api('POST', personalSsUrl('/values:batchUpdate'), { valueInputOption:'RAW', data: missing.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; }) }); });
}
function plPersonalGate(msg){
  loadingHtml('<div class="gate"><div class="gt">📅 Seus planos pessoais</div><div class="gs">'+(msg||'Planos privados ficam numa planilha só sua — separada dos compartilhados.')+'</div>'
    + '<button class="btn-primary" onclick="createSheet()">✨ Criar minha planilha pessoal</button>'
    + '<div style="color:var(--muted);font-size:12px;margin:16px 0 10px">— ou já tem uma? —</div>'
    + '<input class="field" id="plUrl" placeholder="Cole o link da planilha pessoal"><button class="btn ghost" style="width:100%;margin-top:10px" onclick="linkSheet()">Conectar planilha</button>'
    + '<div id="plErr" style="color:var(--primary);font-size:12px;margin-top:10px"></div></div>');
}
function gate(){ plPersonalGate(); }
function offerLink(f){ loadingHtml('<div class="gate"><div class="gt">Encontramos seus planos 🎉</div><div class="gs">'+esc(f.name)+'</div><button class="btn-primary" onclick="pick(\''+f.id+'\')">Vincular e abrir</button><button class="del" onclick="gate()">usar outro / criar novo</button></div>'); }
function pick(id){ JB.setSheetId('planner',id); bootSheet(); }
function createSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando seus planos…</div></div>');
  createPersonalPlannerSpreadsheet().then(bootSheet).catch(function(e){ loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro ao criar: '+esc(e.message)+'</div></div>'); });
}
function linkSheet(){
  var u=($('plUrl').value||'').trim(); var m=u.match(/[a-zA-Z0-9_-]{30,}/);
  if(!m){ var err=$('plErr'); if(err) err.textContent='Link inválido.'; return; }
  var id=m[0];
  JB.sheetTabs(id).then(function(grid){
    if(plRejectCollabAsPersonal(grid)){
      var err2=$('plErr'); if(err2) err2.textContent='Esta é uma planilha de plano compartilhado. Crie ou conecte sua planilha pessoal.';
      return;
    }
    if(!grid['Planos']){
      var err3=$('plErr'); if(err3) err3.textContent='Planilha precisa ter a aba Planos (planilha pessoal do Planner).';
      return;
    }
    JB.setSheetId('planner',id); bootSheet();
  }).catch(function(){ var err4=$('plErr'); if(err4) err4.textContent='Não foi possível abrir a planilha.'; });
}

function plIds(s){ return (window.JB&&JB.link)?JB.link.parseIds(s):String(s||'').split(',').filter(Boolean); }
function plFmtIds(arr){ return (window.JB&&JB.link)?JB.link.formatIds(arr):(arr||[]).join(','); }
function ensurePlannerLinkHeaders(){
  var jobs=[];
  if(plannerGrid['Planos']!=null){
    jobs.push(JB.api('GET', personalSsUrl('/values/'+encodeURIComponent('Planos!1:1'))).then(function(res){
      var h=(res.values&&res.values[0])||[];
      if(h[8]==='Listas') return;
      return JB.api('PUT', personalSsUrl('/values/'+encodeURIComponent('Planos!I1')+'?valueInputOption=RAW'), { values:[['Listas']] });
    }).catch(function(){}));
  }
  if(plannerGrid['Dias']!=null){
    jobs.push(JB.api('GET', personalSsUrl('/values/'+encodeURIComponent('Dias!1:1'))).then(function(res){
      var h=(res.values&&res.values[0])||[];
      if(h[6]==='Listas') return;
      return JB.api('PUT', personalSsUrl('/values/'+encodeURIComponent('Dias!G1')+'?valueInputOption=RAW'), { values:[['Listas']] });
    }).catch(function(){}));
  }
  return jobs.length?Promise.all(jobs):Promise.resolve();
}
function parsePlanos(rows){
  return body(rows).filter(function(r){return r[7];}).map(function(r){
    return { id:String(r[7]), titulo:String(r[0]||''), subtitulo:String(r[1]||''), inicio:String(r[2]||''), fim:String(r[3]||''), icone:String(r[4]||'📅'), criado:String(r[5]||''), atualizado:String(r[6]||''), listaIds:plIds(r[8]) };
  });
}
function parseDias(rows){
  return body(rows).filter(function(r){return r[5];}).map(function(r){
    return { id:String(r[5]), planoId:String(r[0]||''), data:String(r[1]||''), titulo:String(r[2]||''), icone:String(r[3]||''), ordem:Number(r[4])||0, listaIds:plIds(r[6]) };
  });
}
function parseEventos(rows){
  return body(rows).filter(function(r){return r[9];}).map(function(r){
    var hora=String(r[1]||'');
    var hm=r[2];
    var horaMin=(hm===''||hm==null)?'':Number(hm);
    if(horaMin==='' || !isFinite(horaMin)){
      var parsed=plParseHora(hora);
      if(parsed.ok && parsed.min!=='') horaMin=parsed.min;
    }
    return { id:String(r[9]), diaId:String(r[0]||''), hora:hora, horaMin:horaMin, titulo:String(r[3]||''), nota:String(r[4]||''), icone:String(r[5]||''), tag:String(r[6]||''), tagCor:String(r[7]||'warn'), ordem:Number(r[8])||0 };
  });
}
function buildPlanner(t){
  var config={}; body(t.Config).forEach(function(r){ if(r[0]) config[r[0]]=r[1]; });
  return { planos:parsePlanos(t.Planos), dias:parseDias(t.Dias), eventos:parseEventos(t.Eventos), config:config };
}
function loadData(){
  loadingHtml(JB.skeletonHtml('planner'));
  var want=PL_TABS.map(function(t){return t[0];}).filter(function(t){return plannerGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  return JB.api('GET', personalSsUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    if(by.Planos) seedRowCacheForSid(JB.getSheetId('planner'),'Planos',by.Planos,7);
    if(by.Dias) seedRowCacheForSid(JB.getSheetId('planner'),'Dias',by.Dias,5);
    if(by.Eventos) seedRowCacheForSid(JB.getSheetId('planner'),'Eventos',by.Eventos,9);
    DATA=buildPlanner(by);
    var collabLoad=(typeof plLoadCollabPlans==='function')?plLoadCollabPlans():Promise.resolve();
    return collabLoad.then(show).catch(show);
  }).catch(function(e){ var m=String(e.message||''); if(m.indexOf('403')>-1||m.indexOf('404')>-1||m.indexOf('PERMISSION')>-1){ JB.clearSheetId('planner'); bootSheet(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(e.message)+'</div></div>'); });
}
function show(){
  $('loading').style.display='none'; $('app').style.display='block';
  if(DATA&&DATA.config&&JB.adoptLegacyProfile) JB.adoptLegacyProfile(DATA.config.perfil_nome, DATA.config.perfil_icone, 'Planner');
  if(typeof plPaintAcct==='function') plPaintAcct();
  else if(JB.paintAcct) JB.paintAcct();
  else $('acctEmail').textContent='👤 '+(JB.email()||'');
  if(!_pbooted){
    try{
      var q=new URLSearchParams(location.search);
      var pid=q.get('p'); if(pid && plan(pid)) openPlanId=pid;
      var did=q.get('d'); if(did) _focusDay=did;
    }catch(_){}
    if(JB.ensureProfile && !JB.profileReady()) JB.ensureProfile(function(){ if(typeof plPaintAcct==='function') plPaintAcct(); });
  }
  plBindLinkClicks();
  if(openPlanId) plRefreshLinks(); else render();
  if(!_pbooted){
    _pbooted=true;
    if(typeof plCheckJoinParam==='function') plCheckJoinParam();
    if(typeof plStartCollabPoll==='function') plStartCollabPoll();
    if(JB.onRoute) JB.onRoute(plannerApplyRoute);
    if(!JB.tourDone('planner')) setTimeout(function(){ JB.tour('planner', PL_TOUR); }, 600);
  }
  if(!window._jbTabSync){ window._jbTabSync=1; JB.onTabVisible(refreshData); JB.watchSheet('planner', refreshData); }
}
function refreshData(){
  if(JB.isGhost&&JB.isGhost()) return;
  if(!$('app') || $('app').style.display==='none' || !DATA) return;
  if(typeof plRefreshCollabOnly==='function' && openPlanId && plan(openPlanId) && plan(openPlanId).collabSheetId){
    plRefreshCollabOnly(true).then(function(res){ if(typeof plHandlePollResult==='function') plHandlePollResult(res); else if(res && res.changed) render(); }).catch(function(){});
    return;
  }
  var want=PL_TABS.map(function(t){return t[0];}).filter(function(t){return plannerGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.syncWrap(JB.api('GET', personalSsUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildPlanner(by);
    var collabLoad=(typeof plLoadCollabPlans==='function')?plLoadCollabPlans():Promise.resolve();
    collabLoad.then(function(){ if(openPlanId) plRefreshLinks(); else render(); }).catch(function(){ if(openPlanId) plRefreshLinks(); else render(); });
  })).catch(function(){});
}

function plan(id){ return (DATA.planos||[]).find(function(p){return p.id===id;}); }
function daysOf(planId){ return (DATA.dias||[]).filter(function(d){return d.planoId===planId;}).slice().sort(function(a,b){ return String(a.data).localeCompare(String(b.data)) || (a.ordem-b.ordem); }); }
function eventsOf(diaId){ return plSortEvents((DATA.eventos||[]).filter(function(e){return e.diaId===diaId;})); }
function eventsOfPlan(planId){
  var ids={}; daysOf(planId).forEach(function(d){ ids[d.id]=1; });
  return (DATA.eventos||[]).filter(function(e){ return ids[e.diaId]; });
}

function render(){
  var ed=!!(openPlanId&&plan(openPlanId));
  $('fab').style.display=ed?'none':'flex';
  if(ed) renderTimeline(); else renderHome();
  plScrollFocusDay();
}
function plScrollFocusDay(){
  if(!_focusDay) return;
  var el=document.getElementById('pl-day-'+_focusDay);
  if(!el) return;
  el.classList.add('pl-day-focus');
  try{ el.scrollIntoView({ block:'start', behavior:'smooth' }); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
  _focusDay='';
}
function openPlan(id, opts){
  opts=opts||{};
  openPlanId=id; _edMenuOpen=false;
  if(typeof plSetCollabWatch==='function'){ var p=plan(id); plSetCollabWatch(p&&p.collabSheetId?p.collabSheetId:null); }
  if(!opts.fromRoute && JB.qsPatch){
    var cur=JB.qsGet('p');
    var patch={ p:id };
    if(!_focusDay) patch.d=null;
    else patch.d=_focusDay;
    JB.qsPatch(patch, { replace: cur===id });
  }
  plRefreshLinks(); window.scrollTo(0,0);
}
function backHome(opts){
  opts=opts||{};
  function go(){
    openPlanId=null; _edMenuOpen=false;
    if(typeof plSetCollabWatch==='function') plSetCollabWatch(null);
    if(!opts.fromRoute && JB.qsPatch) JB.qsPatch({ p:null, d:null }, { replace:true });
    render();
  }
  if(!opts.fromRoute && JB.routeBack && openPlanId && JB.qsGet('p')){
    if(JB.routeBack({ p:null, d:null })) return;
  }
  go();
}
function plannerApplyRoute(){
  var pid=JB.qsGet?JB.qsGet('p'):'';
  var did=JB.qsGet?JB.qsGet('d'):'';
  if(did) _focusDay=did;
  if(pid && plan(pid)){
    if(openPlanId!==pid) openPlan(pid, { fromRoute:true });
    else if(_focusDay) plScrollFocusDay();
    return;
  }
  if(openPlanId) backHome({ fromRoute:true });
}

function renderHome(){
  var list=(DATA.planos||[]).slice().sort(function(a,b){ return String(b.atualizado||b.criado||'').localeCompare(String(a.atualizado||a.criado||'')); });
  if(homeQuery){ var q=homeQuery.toLowerCase(); list=list.filter(function(p){ return (p.titulo+' '+p.subtitulo).toLowerCase().indexOf(q)>-1; }); }
  var shared=list.filter(function(p){return p.collabSheetId;}), priv=list.filter(function(p){return !p.collabSheetId;});
  $('main').innerHTML='<div class="jb-search searchbar">'
    +'<input class="field jb-search-input" id="homeSearch" type="search" placeholder="Buscar planos…" value="'+escAttr(homeQuery)+'" oninput="onHomeSearch(this.value)" onfocus="JB.searchFocus(this)" onblur="JB.searchBlur(this)">'
    +'<button type="button" class="jb-search-clear" id="homeSearchClear" onclick="clearHomeSearch()" aria-label="Limpar busca" style="display:'+(homeQuery?'flex':'none')+'">✕</button>'
    +'</div><div id="homeList"></div>';
  var el=$('homeList');
  if(!list.length){
    el.innerHTML=(DATA.planos&&DATA.planos.length)? JB.emptyState({ icon:'🔎', title:'Nada encontrado', hint:'Tente outro termo.' }) : JB.emptyState({ icon:'📅', title:'Nenhum plano ainda', hint:'Crie um roteiro, um fim de semana ou um encontro.', action:'+ Novo plano', onclick:'openNew()' });
    return;
  }
  var html='';
  if(shared.length){ html+='<div class="secbar"><div class="sect">Compartilhados</div></div><div class="jb-stagger-list">'+shared.map(planCard).join('')+'</div>'; }
  if(priv.length){ html+='<div class="secbar"><div class="sect">'+(shared.length?'Seus planos':'Planos')+'</div></div><div class="jb-stagger-list">'+priv.map(planCard).join('')+'</div>'; }
  el.innerHTML=html;
  if(!_stPlHome && !homeQuery && window.JB && JB.staggerChildren){
    _stPlHome=true;
    el.querySelectorAll('.jb-stagger-list').forEach(function(l,i){ JB.staggerChildren(l, 'pl-home-'+i); });
  }
}
function planCard(p){
  var av=(typeof plMemberAvatarsHtml==='function'&&p.collabSheetId)?plMemberAvatarsHtml(p):'';
  var n=plNights(p.inicio,p.fim);
  var meta=plFmtRange(p.inicio,p.fim)+(n?(' · '+n+(n===1?' noite':' noites')):'');
  return '<div class="planc'+(p.collabSheetId?' planc-shared':'')+'" onclick="openPlan(\''+p.id+'\')">'
    +'<div class="pc-top"><div class="pc-ico">'+esc(p.icone||'📅')+'</div><div><div class="pc-title">'+esc(p.titulo||'(sem título)')+'</div>'
    +(p.subtitulo?'<div class="pc-sub">'+esc(p.subtitulo)+'</div>':'')+'</div></div>'
    +'<div class="pc-meta">'    +(p.collabSheetId?'<span class="pl-shared">Compartilhado</span>':'')
    +(plIds(p.listaIds).length?'<span class="pl-link-chip" title="Lista do Notes">lista</span>':'')
    +'<span class="rg" style="margin:0">'+esc(meta)+'</span>'+av+'</div></div>';
}
function onHomeSearch(v){ homeQuery=v; JB.searchClearVis('homeSearch','homeSearchClear',!!v); renderHome(); }
function clearHomeSearch(){ homeQuery=''; var i=$('homeSearch'); if(i) i.value=''; JB.searchClearVis('homeSearch','homeSearchClear',false); renderHome(); }

function renderTimeline(){
  var p=plan(openPlanId); if(!p){ backHome(); return; }
  var days=daysOf(p.id);
  var n=plNights(p.inicio,p.fim);
  var sub=p.subtitulo || (n? (n+' '+(n===1?'noite':'noites')+' · '+plFmtRange(p.inicio,p.fim)) : plFmtRange(p.inicio,p.fim));
  var av=(typeof plMemberAvatarsHtml==='function'&&p.collabSheetId)?('<div class="ed-head-avatars">'+plMemberAvatarsHtml(p)+'</div>'):'';
  var shareBtn=p.collabSheetId
    ?'<button type="button" class="ed-menu-item" onclick="closeEdMenu();plOpenShare()">👥 Compartilhar</button>'
    :'<button type="button" class="ed-menu-item" onclick="closeEdMenu();plShareFromPrivate()">👥 Tornar compartilhado</button>';
  var leaveLabel=p.collabSheetId?(p.collabRole==='owner'?'Excluir plano compartilhado':'Sair do plano'):'Excluir plano';
  var leaveFn=p.collabSheetId?'plLeaveOrDelete()':'deletePlan()';
  var html='<div class="tl-head"><div class="tl-kicker"><button class="tl-back" onclick="backHome()">← Planos</button>'
    +'<div class="tl-menu-wrap"><button class="tl-menu-btn" onclick="toggleEdMenu()" aria-label="Menu">⋯</button>'
    +'<div class="tl-menu'+(_edMenuOpen?' open':'')+'" id="tlMenu">'
    +'<button type="button" class="ed-menu-item" onclick="closeEdMenu();openEditPlan()">✏ Editar plano</button>'
    +'<button type="button" class="ed-menu-item" onclick="closeEdMenu();openLinkPicker(\'plan\',\''+p.id+'\')">📌 Colar lista do Notes</button>'
    +shareBtn
    +'<button type="button" class="ed-menu-item" onclick="closeEdMenu();'+leaveFn+'">'+esc(leaveLabel)+'</button>'
    +'</div></div></div>'
    +'<div class="tl-title">'+esc(p.titulo||'(sem título)')+'</div>'
    +(sub?'<div class="tl-sub">'+esc(sub)+'</div>':'')+av
    +plPeekBlock(p.listaIds,'plan',p.id,false)+'</div>';
  html+='<div class="pl-spine jb-stagger-list">'+days.map(function(d){ return dayBlock(d); }).join('')+'</div>';
  $('main').innerHTML=html;
  if(!_stPlTl[p.id] && window.JB && JB.staggerChildren){
    _stPlTl[p.id]=true;
    var spine=$('main').querySelector('.pl-spine');
    if(spine) JB.staggerChildren(spine, 'pl-tl-'+p.id);
  }
}
function dayBlock(d){
  var evs=eventsOf(d.id);
  var evHtml=evs.length?evs.map(eventRow).join(''):'<div class="pl-empty-day">Nada neste dia — toque + para um horário.</div>';
  return '<div class="pl-day" id="pl-day-'+esc(d.id)+'">'
    +'<div class="pl-rail"><div class="pl-dd">'+esc(plFmtDay(d.data))+'</div>'
    +'<button type="button" class="pl-dico" onclick="openDayEdit(\''+d.id+'\')" title="Editar dia">'+esc(d.icone||'📅')+'</button>'
    +'<div class="pl-wd">'+esc(plWeekday(d.data))+'</div></div>'
    +'<div class="pl-card"><div class="pl-card-h"><button type="button" class="pl-card-t" onclick="openDayEdit(\''+d.id+'\')">'+(d.titulo?esc(d.titulo):'<span style="color:var(--muted);font-weight:700">Sem título</span>')+'</button>'
    +'<button type="button" class="pl-pin" onclick="openLinkPicker(\'day\',\''+d.id+'\')" title="Colar lista neste dia">📌</button>'
    +'<button type="button" class="pl-add" onclick="openEvtEdit(\'\',\''+d.id+'\')" title="Adicionar evento">+</button></div>'
    +plPeekBlock(d.listaIds,'day',d.id,true)
    +evHtml+'</div></div>';
}
function eventRow(e){
  var pill=e.tag?'<span class="pl-pill '+esc(e.tagCor||'warn')+'">'+esc(e.tag)+'</span>':'';
  var title=(e.icone?esc(e.icone)+' ':'')+esc(e.titulo||'(sem título)');
  return '<div class="pl-evt" onclick="openEvtEdit(\''+e.id+'\',\''+e.diaId+'\')"><div class="pl-time">'+esc(e.hora||'—')+'</div>'
    +'<div><div class="pl-et">'+title+'</div>'+(e.nota?'<div class="pl-en">'+esc(e.nota)+'</div>':'')+pill+'</div></div>';
}

function toggleEdMenu(){ _edMenuOpen=!_edMenuOpen; var m=$('tlMenu'); if(m) m.classList.toggle('open', _edMenuOpen); }
function closeEdMenu(){ _edMenuOpen=false; var m=$('tlMenu'); if(m) m.classList.remove('open'); }

function plLinkIds(){
  var p=plan(openPlanId); if(!p) return [];
  var ids=plIds(p.listaIds);
  daysOf(p.id).forEach(function(d){ ids=ids.concat(plIds(d.listaIds)); });
  return (window.JB&&JB.link)?JB.link.uniq(ids):ids;
}
function plRefreshLinks(){
  var p=plan(openPlanId);
  if(!p){ render(); return; }
  var ids=plLinkIds();
  var apply=function(snaps){
    _linkSnaps={};
    (snaps||[]).forEach(function(s){ _linkSnaps[s.id]=s; });
    render();
  };
  if(window.JB&&JB.link&&JB.link.loadSnapshots) JB.link.loadSnapshots(ids).then(apply);
  else apply([]);
}
function plShareHint(){
  var p=plan(openPlanId);
  return (p&&p.collabSheetId)?'Esta lista é só sua. Compartilhe no Notes se o grupo precisar.':'';
}
function plPeekBlock(ids, kind, ownerId, compact){
  ids=plIds(ids);
  if(!ids.length || !window.JB || !JB.link || !JB.link.peekHtml) return '';
  var hint=plShareHint();
  return ids.map(function(id){
    var snap=_linkSnaps[id];
    var key=kind+'|'+ownerId+'|'+id;
    if(!snap){
      return '<div class="jb-link-wrap'+(compact?' compact':'')+'"><div class="jb-link-sticker'+(compact?' compact':'')+'"><span class="jb-link-hue" aria-hidden="true"></span><span class="jb-link-title">Lista anexada</span></div></div>';
    }
    return JB.link.peekHtml(snap, { open:!!_linkOpen[key], key:key, compact:!!compact, shareHint:hint, canUnlink:true, unlinkKey:key });
  }).join('');
}
function toggleLinkPeek(key){
  _linkOpen[key]=!_linkOpen[key];
  render();
}
function unlinkList(key){
  var parts=String(key||'').split('|');
  if(parts.length<3) return;
  var kind=parts[0], ownerId=parts[1], noteId=parts.slice(2).join('|');
  var p=plan(openPlanId); if(!p) return;
  if(kind==='plan' && p.id===ownerId){
    p.listaIds=plIds(p.listaIds).filter(function(id){ return id!==noteId; });
    persistListaTarget('plan', p);
    return;
  }
  var d=(DATA.dias||[]).find(function(x){ return x.id===ownerId; });
  if(!d) return;
  d.listaIds=plIds(d.listaIds).filter(function(id){ return id!==noteId; });
  persistListaTarget('day', d);
}
function persistListaTarget(kind, obj){
  if(JB.isGhost&&JB.isGhost()){ plRefreshLinks(); return; }
  var p=kind==='plan'?obj:plan(obj.planoId);
  var go=function(){
    if(kind==='plan'){ touchPlan(obj); plRefreshLinks(); return; }
    persistDay(obj, { onSuccess: function(){ if(p) touchPlan(p); plRefreshLinks(); } });
  };
  if(p&&p.collabSheetId&&typeof ensureCollabLinkHeaders==='function'){
    ensureCollabLinkHeaders(p.collabSheetId).then(go).catch(go);
    return;
  }
  go();
}
function plBindLinkClicks(){
  var main=$('main'); if(!main || main._linkBound) return;
  main._linkBound=1;
  main.addEventListener('click', function(ev){
    var u=ev.target.closest && ev.target.closest('[data-link-unlink]');
    if(u){ ev.preventDefault(); ev.stopPropagation(); unlinkList(u.getAttribute('data-link-unlink')); return; }
    var t=ev.target.closest && ev.target.closest('[data-link-toggle]');
    if(t){ ev.preventDefault(); ev.stopPropagation(); toggleLinkPeek(t.getAttribute('data-link-toggle')); }
  });
}
function openLinkPicker(kind, id){
  _linkTarget={ kind:kind, id:id };
  var title=$('linkModalTitle');
  if(title) title.textContent=kind==='day'?'Colar lista neste dia':'Colar lista no plano';
  var box=$('linkPickerList');
  if(box) box.innerHTML='<div class="rg">Carregando listas…</div>';
  $('linkOverlay').classList.add('open');
  var attached={};
  if(kind==='plan'){ var p=plan(id); plIds(p&&p.listaIds).forEach(function(x){ attached[x]=1; }); }
  else { var d=(DATA.dias||[]).find(function(x){ return x.id===id; }); plIds(d&&d.listaIds).forEach(function(x){ attached[x]=1; }); }
  var hint=plan(openPlanId)&&plan(openPlanId).collabSheetId
    ? '<div class="rg" style="margin-top:10px">O plano é compartilhado. A lista continua pessoal até você compartilhá-la no Notes.</div>'
    : '';
  var paint=function(snaps){
    snaps=snaps||[];
    var presets=snaps.filter(function(s){ return s.preset && !attached[s.id]; });
    var lists=snaps.filter(function(s){ return !s.preset && s.sticker && !attached[s.id]; });
    var html='';
    if(presets.length){
      html+='<div class="sect" style="margin:4px 0 8px">✦ Presets</div>';
      html+=presets.map(function(s){
        return '<button type="button" class="pl-pick-row" onclick="pickLinkedList(\''+escAttr(s.id)+'\',true)"><span>'+esc(s.icon||'🧳')+' '+esc(s.titulo)+'</span><span class="rg">clonar</span></button>';
      }).join('');
    }
    if(lists.length){
      html+='<div class="sect" style="margin:12px 0 8px">Liberadas no Planner</div>';
      html+=lists.map(function(s){
        var prog=s.total?(s.done+'/'+s.total):'';
        return '<button type="button" class="pl-pick-row" onclick="pickLinkedList(\''+escAttr(s.id)+'\',false)"><span>'+esc(s.icon||'✅')+' '+esc(s.titulo)+'</span><span class="rg">'+esc(prog)+'</span></button>';
      }).join('');
    }
    if(!html) html='<div class="rg">Nenhuma lista liberada. No Notes, no menu ⋯ da lista, toque em Liberar no Planner — ou use um preset.</div>';
    box.innerHTML=html+hint;
  };
  if(window.JB&&JB.link&&JB.link.loadCatalog) JB.link.loadCatalog().then(paint).catch(function(){ paint([]); });
  else paint([]);
}
function closeLinkPicker(){ $('linkOverlay').classList.remove('open'); _linkTarget=null; }
function pickLinkedList(noteId, fromPreset){
  var tgt=_linkTarget; if(!tgt) return;
  var attach=function(id){
    if(tgt.kind==='plan'){
      var p=plan(tgt.id); if(!p) return;
      p.listaIds=plIds(p.listaIds).concat([id]);
      if(window.JB&&JB.link) p.listaIds=JB.link.uniq(p.listaIds);
      closeLinkPicker();
      persistListaTarget('plan', p);
      if(p.collabSheetId) toast('Lista colada. Ela continua só sua — compartilhe no Notes se o grupo precisar.');
      else toast('✓ Lista colada no plano');
      return;
    }
    var d=(DATA.dias||[]).find(function(x){ return x.id===tgt.id; }); if(!d) return;
    d.listaIds=plIds(d.listaIds).concat([id]);
    if(window.JB&&JB.link) d.listaIds=JB.link.uniq(d.listaIds);
    closeLinkPicker();
    persistListaTarget('day', d);
    var planObj=plan(openPlanId);
    if(planObj&&planObj.collabSheetId) toast('Lista colada. Ela continua só sua — compartilhe no Notes se o grupo precisar.');
    else toast('✓ Lista colada no dia');
  };
  if(!fromPreset){ attach(noteId); return; }
  if(!window.JB||!JB.link||!JB.link.clonePreset){ toast('Não deu para clonar o preset'); return; }
  var p=tgt.kind==='plan'?plan(tgt.id):plan(openPlanId);
  var cloneOpts={ sticker:true, planTitle:p&&p.titulo||'', inicio:p&&p.inicio||'' };
  if(tgt.kind==='day'){
    var day=(DATA.dias||[]).find(function(x){ return x.id===tgt.id; });
    if(day){
      var dayTitle=(day.titulo||'').trim();
      if(!dayTitle) dayTitle=((plWeekday(day.data)||'')+' '+plFmtDay(day.data)).trim();
      cloneOpts.dayTitle=dayTitle;
    }
  }
  JB.link.clonePreset(noteId, cloneOpts).then(function(snap){
    if(!snap||!snap.id){ toast('Não deu para clonar o preset'); return; }
    attach(snap.id);
  }).catch(function(){ toast('Abra o Notes uma vez para criar a planilha, depois cole o preset.'); });
}

function plIconDefault(kind){ return kind==='evt'?'':kind==='day'?'📅':'✈️'; }
function plIconPresets(kind){ return kind==='evt'?PL_EVT_ICONS:PL_DAY_ICONS; }
function plIconExtras(kind){
  var seen={};
  plIconPresets(kind).forEach(function(ic){ if(ic) seen[ic]=1; });
  return PL_ICON_EXTRAS.filter(function(ic){ return ic && !seen[ic]; });
}
function plIconGet(kind){
  if(kind==='plan') return newIcon||'';
  if(kind==='day') return window._plDayIcon||'';
  return window._plEvtIcon||'';
}
function plIconSet(kind, ic){
  if(kind==='plan') newIcon=ic;
  else if(kind==='day') window._plDayIcon=ic;
  else window._plEvtIcon=ic;
}
function plIconWrapId(kind){ return kind==='plan'?'newIconWrap':kind==='day'?'dayIconWrap':'evtIconWrap'; }
function plIconPreview(ic){ return ic||'∅'; }
function plIconIsPreset(kind, ic){
  var list=plIconPresets(kind);
  for(var i=0;i<list.length;i++) if(list[i]===ic) return true;
  return false;
}
function plIconPickerHtml(kind, cur){
  var presets=plIconPresets(kind), extras=plIconExtras(kind);
  var customVal=plIconIsPreset(kind,cur)?'':cur;
  var h='<div class="icon-pick"><div class="icon-pick-preview" data-pl-ico-preview>'+plIconPreview(cur)+'</div>';
  h+='<div class="icon-pick-label">Presets</div><div class="icon-pick-grid">';
  presets.forEach(function(ic,i){
    h+='<button type="button" class="icon-pick-btn'+(ic===cur?' on':'')+'" data-pl-ico="preset" data-i="'+i+'" onclick="plPickIcon(\''+kind+'\',\'preset\','+i+')">'+plIconPreview(ic)+'</button>';
  });
  h+='</div><div class="icon-pick-label">Mais</div><div class="icon-pick-grid icon-pick-grid-sm">';
  extras.forEach(function(ic,i){
    h+='<button type="button" class="icon-pick-btn'+(ic===cur?' on':'')+'" data-pl-ico="extra" data-i="'+i+'" onclick="plPickIcon(\''+kind+'\',\'extra\','+i+')">'+ic+'</button>';
  });
  h+='</div><div class="icon-pick-custom"><label class="fl">Outro emoji</label>';
  h+='<input class="field" id="plIconCustom-'+kind+'" maxlength="8" placeholder="Cole ou digite…" value="'+escAttr(customVal)+'" oninput="plPickIconCustom(\''+kind+'\',this.value)"></div>';
  if(cur!==plIconDefault(kind)) h+='<button type="button" class="btn ghost icon-pick-reset" onclick="plPickIconReset(\''+kind+'\')">Ícone padrão</button>';
  return h+'</div>';
}
function plPaintIconPicker(kind){
  var el=$(plIconWrapId(kind));
  if(el) el.innerHTML=plIconPickerHtml(kind, plIconGet(kind));
}
function plSyncIconPicker(kind){
  var wrap=$(plIconWrapId(kind));
  if(!wrap) return;
  var cur=plIconGet(kind);
  var prev=wrap.querySelector('[data-pl-ico-preview]');
  if(prev) prev.textContent=plIconPreview(cur);
  var presets=plIconPresets(kind), extras=plIconExtras(kind);
  var btns=wrap.querySelectorAll('.icon-pick-btn');
  for(var i=0;i<btns.length;i++){
    var b=btns[i], t=b.getAttribute('data-pl-ico'), idx=+b.getAttribute('data-i');
    var ic=t==='extra'?extras[idx]:presets[idx];
    b.classList.toggle('on', ic===cur);
  }
  var reset=wrap.querySelector('.icon-pick-reset');
  var wantReset=cur!==plIconDefault(kind);
  if(wantReset && !reset){
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='btn ghost icon-pick-reset';
    btn.setAttribute('onclick','plPickIconReset(\''+kind+'\')');
    btn.textContent='Ícone padrão';
    wrap.querySelector('.icon-pick').appendChild(btn);
  } else if(!wantReset && reset) reset.remove();
}
function plPickIcon(kind, src, idx){
  var ic=src==='extra'?plIconExtras(kind)[idx]:plIconPresets(kind)[idx];
  if(ic==null) return;
  plIconSet(kind, ic);
  plPaintIconPicker(kind);
}
function plPickIconCustom(kind, val){
  plIconSet(kind, plNormIcon(val));
  plSyncIconPicker(kind);
}
function plPickIconReset(kind){
  plIconSet(kind, plIconDefault(kind));
  plPaintIconPicker(kind);
}
function plFocusField(id, select){
  setTimeout(function(){ var t=$(id); if(!t) return; t.focus(); if(select) t.select(); },60);
}
function openNew(){
  _editPlanId=null; newIcon='✈️'; newStart=plTodayYmd(); newEnd=plAddDays(newStart,4);
  $('newModalTitle').textContent='Novo plano';
  var save=$('newSaveBtn'); if(save) save.textContent='Criar';
  $('newTitle').value=''; $('newSub').value='';
  plPaintIconPicker('plan'); renderNewDates();
  $('newOverlay').classList.add('open');
  plFocusField('newTitle');
}
function openEditPlan(){
  var p=plan(openPlanId); if(!p) return;
  _editPlanId=p.id; newIcon=p.icone||'✈️'; newStart=p.inicio; newEnd=p.fim;
  $('newModalTitle').textContent='Editar plano';
  var save=$('newSaveBtn'); if(save) save.textContent='Salvar';
  $('newTitle').value=p.titulo||''; $('newSub').value=p.subtitulo||'';
  plPaintIconPicker('plan'); renderNewDates();
  $('newOverlay').classList.add('open');
  plFocusField('newTitle', true);
}
function closeNew(){ $('newOverlay').classList.remove('open'); _editPlanId=null; }
function pickNewIcon(ic){ newIcon=ic; plPaintIconPicker('plan'); }
function pickNewStart(){ JB.datePicker(newStart, function(iso){ newStart=iso; if(newEnd && plParseYmd(newEnd)<plParseYmd(iso)) newEnd=iso; renderNewDates(); }); }
function pickNewEnd(){ JB.datePicker(newEnd||newStart, function(iso){ newEnd=iso; if(newStart && plParseYmd(iso)<plParseYmd(newStart)) newStart=iso; renderNewDates(); }); }
function renderNewDates(){
  var a=$('newStartBtn'), b=$('newEndBtn'), h=$('newRangeHint');
  if(a){ a.textContent=newStart?plFmtDay(newStart):'Escolher data…'; a.classList.toggle('empty',!newStart); }
  if(b){ b.textContent=newEnd?plFmtDay(newEnd):'Escolher data…'; b.classList.toggle('empty',!newEnd); }
  if(h) h.textContent=(newStart&&newEnd)?plRangeHint(newStart,newEnd):'';
}

function planRowVals(p){ return [p.titulo,p.subtitulo||'',p.inicio,p.fim,p.icone||'',p.criado,p.atualizado,p.id,plFmtIds(p.listaIds)]; }
function dayRowVals(d){ return [d.planoId,d.data,d.titulo||'',d.icone||'',d.ordem,d.id,plFmtIds(d.listaIds)]; }
function evtRowVals(e){ return [e.diaId,e.hora||'',e.horaMin===''||e.horaMin==null?'':e.horaMin,e.titulo||'',e.nota||'',e.icone||'',e.tag||'',e.tagCor||'warn',e.ordem,e.id]; }
function metaRowVals(p){ return [p.titulo,p.subtitulo||'',p.inicio,p.fim,p.icone||'',p.criado,p.atualizado,p.id,p.collabOwner||'',plFmtIds(p.listaIds)]; }

function plPersistForPlan(p, opts){
  opts=opts||{};
  var track=!!(p&&p.collabSheetId);
  if(track && typeof plWriteBegin==='function') plWriteBegin();
  var os=opts.onSuccess, oe=opts.onError;
  opts.onSuccess=function(r){ if(track && typeof plWriteEnd==='function') plWriteEnd(); if(os) os(r); };
  opts.onError=function(e){ if(track && typeof plWriteEnd==='function') plWriteEnd(); if(oe) oe(e); };
  return JB.persist(opts);
}

function saveNewPlan(){
  var t=($('newTitle').value||'').trim();
  if(!newStart||!newEnd||!plDaysFromRange(newStart,newEnd).length){ toast('Escolha as datas'); return; }
  if(!t) t=(newIcon?newIcon+' ':'')+plFmtDay(newStart)+(newStart!==newEnd?('–'+plFmtDay(newEnd)):'');
  if(_editPlanId){ applyPlanDates(_editPlanId, t, ($('newSub').value||'').trim(), newStart, newEnd, newIcon); closeNew(); return; }
  var now=new Date().toISOString();
  var p={ id:uuid(), titulo:t, subtitulo:($('newSub').value||'').trim(), inicio:newStart, fim:newEnd, icone:newIcon||'✈️', criado:now, atualizado:now, listaIds:[] };
  var days=plDaysFromRange(newStart,newEnd).map(function(x,i){
    return { id:uuid(), planoId:p.id, data:x.date, titulo:'', icone:i===0?'✈️':(i===x.ordem && i===plDaysFromRange(newStart,newEnd).length-1?'✈️':'📅'), ordem:x.ordem, listaIds:[] };
  });
  if(days.length===1) days[0].icone=newIcon||'📅';
  else { days[0].icone=newIcon||'✈️'; days[days.length-1].icone='✈️'; days.forEach(function(d,i){ if(i&&i<days.length-1 && !d.icone) d.icone='📅'; }); }
  DATA.planos=DATA.planos||[]; DATA.planos.push(p);
  DATA.dias=(DATA.dias||[]).concat(days);
  closeNew();
  plPersistForPlan(p, {
    run: function(){
      return JB.api('POST', personalSsUrl('/values/Planos:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[planRowVals(p)] })
        .then(function(){
          if(!days.length) return;
          return JB.api('POST', personalSsUrl('/values/Dias:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:days.map(dayRowVals) });
        });
    },
    onSuccess: function(){ invalidateRowCacheForSid(JB.getSheetId('planner'),'Planos'); invalidateRowCacheForSid(JB.getSheetId('planner'),'Dias'); openPlan(p.id); toast('✓ Plano criado'); },
    onError: function(e){ DATA.planos=DATA.planos.filter(function(x){return x.id!==p.id;}); DATA.dias=DATA.dias.filter(function(d){return d.planoId!==p.id;}); plWriteErr(e); render(); }
  });
}

function applyPlanDates(id, titulo, subtitulo, start, end, icone){
  var p=plan(id); if(!p) return;
  var oldDays=daysOf(id);
  var wanted=plDaysFromRange(start, end);
  var wantSet={}; wanted.forEach(function(w){ wantSet[w.date]=w; });
  var keep={}, extra=[];
  oldDays.forEach(function(d){ if(wantSet[d.data]) keep[d.data]=d; else extra.push(d); });
  var extraHasEvt=extra.some(function(d){ return eventsOf(d.id).length; });
  function go(){
    var add=wanted.filter(function(w){ return !keep[w.date]; }).map(function(w){
      return { id:uuid(), planoId:id, data:w.date, titulo:'', icone:'📅', ordem:w.ordem, listaIds:[] };
    });
    extra.forEach(function(d){
      DATA.eventos=(DATA.eventos||[]).filter(function(e){ return e.diaId!==d.id; });
      DATA.dias=(DATA.dias||[]).filter(function(x){ return x.id!==d.id; });
    });
    DATA.dias=(DATA.dias||[]).concat(add);
    daysOf(id).forEach(function(d){ var w=wantSet[d.data]; if(w) d.ordem=w.ordem; });
    p.titulo=titulo; p.subtitulo=subtitulo; p.inicio=start; p.fim=end; p.icone=icone||p.icone; p.atualizado=new Date().toISOString();
    persistPlanShape(p, extra, add);
    render();
  }
  if(extraHasEvt){
    JB.confirm('Encurtar o plano?','Dias que saírem do intervalo (e seus eventos) serão removidos.', go, { yes:'Remover dias', no:'Cancelar', danger:true });
    return;
  }
  go();
}

function persistPlanShape(p, removedDays, addedDays){
  var sid=plSidForPlan(p), grid=plGridForPlan(p), tab=plPlanTab(p);
  plPersistForPlan(p, {
    run: function(){
      var chain=Promise.resolve();
      if(removedDays && removedDays.length){
        chain=chain.then(function(){
          return deleteDayRows(p, removedDays);
        });
      }
      if(addedDays && addedDays.length){
        chain=chain.then(function(){
          return JB.api('POST', plSheetUrl(sid, '/values/Dias:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:addedDays.map(dayRowVals) });
        });
      }
      return chain.then(function(){
        return findRowInSid(sid, tab, p.collabSheetId?7:7, p.id).then(function(row){
          if(row<0) throw plRowErr(tab);
          var vals=p.collabSheetId?metaRowVals(p):planRowVals(p);
          var last=p.collabSheetId?'J':'I';
          return JB.api('PUT', plSheetUrl(sid, '/values/'+encodeURIComponent(tab+'!A'+row+':'+last+row)+'?valueInputOption=RAW'), { values:[vals] });
        });
      }).then(function(){
        var kept=daysOf(p.id);
        return Promise.all(kept.map(function(d){
          return findRowInSid(sid,'Dias',5,d.id).then(function(row){
            if(row<0) return;
            return JB.api('PUT', plSheetUrl(sid, '/values/'+encodeURIComponent('Dias!A'+row+':G'+row)+'?valueInputOption=RAW'), { values:[dayRowVals(d)] });
          });
        }));
      });
    },
    onSuccess: function(){ invalidateRowCacheForSid(sid,'Dias'); invalidateRowCacheForSid(sid,'Eventos'); invalidateRowCacheForSid(sid,tab); toast('✓ Plano atualizado'); },
    onError: plWriteErr
  });
}

function deleteDayRows(p, days){
  var sid=plSidForPlan(p), grid=plGridForPlan(p);
  var ids=days.map(function(d){return d.id;});
  return JB.api('GET', plSheetUrl(sid, '/values/Eventos?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var v=res.values||[], evRows=[], reqs=[];
    for(var i=1;i<v.length;i++){ if(ids.indexOf(String((v[i]||[])[0]))>-1) evRows.push(i+1); }
    evRows.sort(function(a,b){return b-a;});
    evRows.forEach(function(r){ reqs.push({ deleteDimension:{ range:{ sheetId:grid['Eventos'], dimension:'ROWS', startIndex:r-1, endIndex:r } } }); });
    return JB.api('GET', plSheetUrl(sid, '/values/Dias?valueRenderOption=UNFORMATTED_VALUE')).then(function(res2){
      var v2=res2.values||[], dRows=[];
      for(var j=1;j<v2.length;j++){ if(ids.indexOf(String((v2[j]||[])[5]))>-1) dRows.push(j+1); }
      dRows.sort(function(a,b){return b-a;});
      dRows.forEach(function(r){ reqs.push({ deleteDimension:{ range:{ sheetId:grid['Dias'], dimension:'ROWS', startIndex:r-1, endIndex:r } } }); });
      if(!reqs.length) return;
      return JB.api('POST', plSheetUrl(sid, ':batchUpdate'), { requests:reqs });
    });
  });
}

function touchPlan(p){
  p.atualizado=new Date().toISOString();
  if(typeof plBumpCollabActivity==='function') plBumpCollabActivity();
  var sid=plSidForPlan(p), tab=plPlanTab(p);
  plPersistForPlan(p, {
    run: function(){
      return findRowInSid(sid, tab, 7, p.id).then(function(row){
        if(row<0) throw plRowErr(tab);
        var vals=p.collabSheetId?metaRowVals(p):planRowVals(p);
        var last=p.collabSheetId?'J':'I';
        return JB.api('PUT', plSheetUrl(sid, '/values/'+encodeURIComponent(tab+'!A'+row+':'+last+row)+'?valueInputOption=RAW'), { values:[vals] });
      });
    },
    onError: plWriteErr
  });
}

function openDayEdit(id){
  var d=daysOf(openPlanId).find(function(x){return x.id===id;}); if(!d) return;
  _editDayId=id;
  $('dayTitle').value=d.titulo||'';
  window._plDayIcon=d.icone||'📅';
  plPaintIconPicker('day');
  $('dayOverlay').classList.add('open');
  plFocusField('dayTitle');
}
function pickDayIcon(ic){ window._plDayIcon=ic; plPaintIconPicker('day'); }
function closeDayEdit(){ $('dayOverlay').classList.remove('open'); _editDayId=null; }
function persistDay(d, opts){
  opts=opts||{};
  var p=plan(d.planoId)||plan(openPlanId);
  if(!p) return;
  if(JB.isGhost&&JB.isGhost()){ if(opts.onSuccess) opts.onSuccess(); return; }
  var sid=plSidForPlan(p);
  plPersistForPlan(p, {
    run: function(){
      return findRowInSid(sid,'Dias',5,d.id).then(function(row){
        if(row<0) throw plRowErr('Dias');
        return JB.api('PUT', plSheetUrl(sid, '/values/'+encodeURIComponent('Dias!A'+row+':G'+row)+'?valueInputOption=RAW'), { values:[dayRowVals(d)] });
      });
    },
    onSuccess: opts.onSuccess,
    onError: opts.onError||plWriteErr
  });
}
function commitDayEdit(){
  var d=(DATA.dias||[]).find(function(x){return x.id===_editDayId;}); if(!d) return;
  d.titulo=($('dayTitle').value||'').trim();
  d.icone=window._plDayIcon||d.icone;
  var p=plan(openPlanId);
  persistDay(d, { onSuccess: function(){ if(p) touchPlan(p); closeDayEdit(); render(); } });
}

function openEvtEdit(id, dayId){
  _editEvtId=id||'';
  _editEvtDayId=dayId;
  var e=id && (DATA.eventos||[]).find(function(x){return x.id===id;});
  $('evtModalTitle').textContent=e?'Editar evento':'Novo evento';
  $('evtTitle').value=e?e.titulo:'';
  $('evtHora').value=e?e.hora:'';
  _plEvtMer='';
  if(e && e.horaMin!=='' && e.horaMin!=null){
    var peek=plParseHora(e.hora,'');
    if(peek.ask) _plEvtMer=Number(e.horaMin)>=12*60?'pm':'am';
  }
  renderEvtHoraHint();
  $('evtNote').value=e?e.nota:'';
  $('evtTag').value=e?e.tag:'';
  window._plEvtIcon=e?e.icone:'';
  window._plEvtTagCor=(e&&e.tagCor)||'warn';
  plPaintIconPicker('evt');
  renderTagColors();
  $('evtDelBtn').style.display=e?'block':'none';
  $('evtOverlay').classList.add('open');
  plFocusField('evtTitle', !!e);
}
function pickEvtIcon(ic){ window._plEvtIcon=ic; plPaintIconPicker('evt'); }
function pickTagCor(k){ window._plEvtTagCor=k; renderTagColors(); }
function renderTagColors(){
  $('evtTagColors').innerHTML=PL_TAG_COLORS.map(function(c){
    return '<button type="button" class="pl-tag-sw'+(c.k===window._plEvtTagCor?' on':'')+'" style="background:'+c.hex+'" onclick="pickTagCor(\''+c.k+'\')"></button>';
  }).join('');
}
function closeEvtEdit(){ $('evtOverlay').classList.remove('open'); _editEvtId=null; _editEvtDayId=null; _plEvtMer=''; }
function pickEvtMer(k){ _plEvtMer=(k==='am'||k==='pm')?k:''; renderEvtHoraHint(); }
function renderEvtAmPm(show, mer){
  var el=$('evtAmPm'); if(!el) return;
  if(!show){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='flex';
  el.innerHTML='<button type="button" class="pl-ampm-btn'+(mer==='am'?' on':'')+'" onclick="pickEvtMer(\'am\')">AM</button>'
    +'<button type="button" class="pl-ampm-btn'+(mer==='pm'?' on':'')+'" onclick="pickEvtMer(\'pm\')">PM</button>';
}
function renderEvtHoraHint(){
  var el=$('evtHoraHint'); if(!el) return;
  var raw=(($('evtHora')||{}).value||'').trim();
  if(!raw){ el.textContent=''; el.classList.remove('err'); renderEvtAmPm(false); return; }
  var peek=plParseHora(raw,'');
  if(!peek.ask) _plEvtMer='';
  var p=plParseHora(raw, _plEvtMer);
  renderEvtAmPm(!!p.ask, _plEvtMer);
  if(!p.ok){ el.textContent='Horário incompleto — use 16h, 16:00 ou 4 PM.'; el.classList.add('err'); return; }
  el.classList.remove('err');
  if(p.ask && !_plEvtMer){ el.textContent='Esse horário é AM ou PM? Fica só no app — o plano grava em 24h.'; return; }
  el.textContent=(p.min!=='' && p.label && p.label!==raw)?('Vira '+p.label):'';
}
function commitEvtEdit(){
  var p=plan(openPlanId); if(!p) return;
  var title=($('evtTitle').value||'').trim();
  if(!title){ toast('Dê um título ao evento'); return; }
  var parsed=plParseHora(($('evtHora').value||'').trim(), _plEvtMer);
  if(!parsed.ok){ toast('Horário incompleto — use 16h, 16:00 ou 4 PM.'); renderEvtHoraHint(); return; }
  if(parsed.ask && !_plEvtMer){ toast('Esse horário é AM ou PM?'); renderEvtHoraHint(); return; }
  var hora=parsed.label;
  var nota=($('evtNote').value||'').trim();
  var tag=($('evtTag').value||'').trim();
  var sid=plSidForPlan(p);
  if(_editEvtId){
    var e=(DATA.eventos||[]).find(function(x){return x.id===_editEvtId;}); if(!e) return;
    e.titulo=title; e.hora=hora; e.horaMin=parsed.min; e.nota=nota; e.icone=window._plEvtIcon||''; e.tag=tag; e.tagCor=window._plEvtTagCor||'warn';
    plPersistForPlan(p, {
      run: function(){
        return findRowInSid(sid,'Eventos',9,e.id).then(function(row){
          if(row<0) throw plRowErr('Eventos');
          return JB.api('PUT', plSheetUrl(sid, '/values/'+encodeURIComponent('Eventos!A'+row+':J'+row)+'?valueInputOption=RAW'), { values:[evtRowVals(e)] });
        });
      },
      onSuccess: function(){ touchPlan(p); closeEvtEdit(); render(); },
      onError: plWriteErr
    });
    return;
  }
  var ord=1; eventsOf(_editEvtDayId).forEach(function(x){ if(x.ordem>=ord) ord=x.ordem+1; });
  var ev={ id:uuid(), diaId:_editEvtDayId, hora:hora, horaMin:parsed.min, titulo:title, nota:nota, icone:window._plEvtIcon||'', tag:tag, tagCor:window._plEvtTagCor||'warn', ordem:ord };
  DATA.eventos=DATA.eventos||[]; DATA.eventos.push(ev);
  plPersistForPlan(p, {
    run: function(){
      return JB.api('POST', plSheetUrl(sid, '/values/Eventos:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[evtRowVals(ev)] });
    },
    onSuccess: function(){ invalidateRowCacheForSid(sid,'Eventos'); touchPlan(p); closeEvtEdit(); render(); },
    onError: function(e2){ DATA.eventos=DATA.eventos.filter(function(x){return x.id!==ev.id;}); plWriteErr(e2); render(); }
  });
}
function deleteEditingEvt(){
  var id=_editEvtId; if(!id) return;
  JB.confirm('Excluir evento?','Ele some do dia para todo mundo neste plano.', function(){
    var p=plan(openPlanId); var sid=plSidForPlan(p), grid=plGridForPlan(p);
    plPersistForPlan(p, {
      run: function(){
        return findRowInSid(sid,'Eventos',9,id).then(function(row){
          if(row<0) throw plRowErr('Eventos');
          return JB.api('POST', plSheetUrl(sid, ':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:grid['Eventos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] });
        });
      },
      onSuccess: function(){ DATA.eventos=(DATA.eventos||[]).filter(function(x){return x.id!==id;}); invalidateRowCacheForSid(sid,'Eventos'); touchPlan(p); closeEvtEdit(); render(); toast('✓ Evento removido'); },
      onError: plWriteErr
    });
  }, { yes:'Excluir', no:'Cancelar', danger:true });
}

function deletePlan(){
  var p=plan(openPlanId); if(!p) return;
  if(p.collabSheetId && typeof plLeaveOrDelete==='function'){ plLeaveOrDelete(); return; }
  JB.confirm('Excluir plano?','"'+ (p.titulo||'') +'" e todos os dias serão removidos.', function(){
    var sid=plSidForPlan(p), grid=plGridForPlan(p);
    var days=daysOf(p.id);
    plPersistForPlan(p, {
      run: function(){
        return deleteDayRows(p, days).then(function(){
          return findRowInSid(sid,'Planos',7,p.id).then(function(row){
            if(row<0) throw plRowErr('Planos');
            return JB.api('POST', plSheetUrl(sid, ':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:grid['Planos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] });
          });
        });
      },
      onSuccess: function(){
        DATA.eventos=(DATA.eventos||[]).filter(function(e){ return days.every(function(d){ return d.id!==e.diaId; }); });
        DATA.dias=(DATA.dias||[]).filter(function(d){ return d.planoId!==p.id; });
        DATA.planos=(DATA.planos||[]).filter(function(x){ return x.id!==p.id; });
        openPlanId=null; render(); toast('✓ Excluído');
      },
      onError: plWriteErr
    });
  }, { yes:'Excluir', no:'Cancelar', danger:true });
}

function saveConfig(k,v){
  DATA.config=DATA.config||{};
  DATA.config[k]=v;
  JB.persist({
    run: function(){
      return JB.api('GET', personalSsUrl('/values/Config?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
        var vals=res.values||[];
        for(var i=1;i<vals.length;i++){
          if(String((vals[i]||[])[0])===k) return JB.api('PUT', personalSsUrl('/values/'+encodeURIComponent('Config!B'+(i+1))+'?valueInputOption=RAW'), {values:[[v]]});
        }
        return JB.api('POST', personalSsUrl('/values/Config:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {values:[[k,v]]});
      });
    },
    onError: plWriteErr
  });
}

function openSettings(){ $('setOverlay').classList.add('open'); JB.renderSkinPicker('planner',$('setSkins')); if(typeof plInitProfileSettings==='function') plInitProfileSettings(); switchSet('tema'); }
function closeSettings(){ $('setOverlay').classList.remove('open'); }
function switchSet(name){
  document.querySelectorAll('#setOverlay .set-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-st')===name); });
  document.querySelectorAll('#setOverlay .set-pane').forEach(function(p){ p.style.display=p.getAttribute('data-pane')===name?'block':'none'; });
}
function plVerTutorial(){ closeSettings(); JB.tour('planner', PL_TOUR); }

JB.applySkin('planner');
startAuth();
