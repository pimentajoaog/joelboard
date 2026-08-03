/* Joelboard Study — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var DATA=null, studyGrid={}, authDone=false, _stStudyCal=false, _stStudyMat=false;
var STUDY_TABS=[['Materias',['Nome','Cor','Total','Feitas','ID']],['Eventos',['Titulo','Tipo','Data','Hora','MateriaID','Concluido','Notas','ID']],['Anexos',['MateriaID','EventoID','Nome','URL','FileID','ID']],['Foco',['Data','MateriaID','Minutos','ID']],['Modulos',['MateriaID','Nome','Feito','ID']],['Config',['Chave','Valor']]];
var EVENT_TYPES=['Prova','Trabalho','Atividade','Outro'];
var SUBJECT_COLORS=['#a78bfa','#60a5fa','#22d3ee','#34d399','#a3e635','#fbbf24','#fb923c','#fb7185','#f472b6','#94a3b8'];
var WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'], MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var MOFULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function $(id){ return document.getElementById(id); }
function uuid(){ return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function loadingHtml(h){ $('loading').style.display='block'; $('loading').innerHTML=h; }
function toast(m){ JB.toast(m); }
function studyWriteErr(e){ toast('Erro: '+((e&&e.message)||'falha ao salvar')); }

/* ---- dates ---- */
function pad(n){ return (n<10?'0':'')+n; }
function isoDate(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseISO(s){ var p=String(s||'').split('-'); return new Date(Number(p[0]),Number(p[1])-1,Number(p[2])||1); }
function todayISO(){ return isoDate(new Date()); }
function daysUntil(iso){ var t=new Date(); t.setHours(0,0,0,0); return Math.round((parseISO(iso)-t)/86400000); }
function fmtBR(iso){ var d=parseISO(iso); return WD[d.getDay()]+', '+d.getDate()+' '+MO[d.getMonth()]; }
function relLabel(iso){ var n=daysUntil(iso); if(n<0) return 'atrasado'; if(n===0) return 'hoje'; if(n===1) return 'amanhã'; return 'em '+n+' dias'; }
function nearClass(iso,done){ if(done) return ''; var n=daysUntil(iso); if(n<0) return 'over'; if(n<=2) return 'soon'; if(n<=7) return 'warn'; return ''; }

/* ---- auth (shared core) ---- */
function startAuth(){
  if (JB.cachedToken()){ afterAuth(); return; }
  if (JB.bootAuthIfExpired(function(){ authDone=false; showSignIn(true); }, function(){ authDone=true; afterAuth(); })) return;
  loadingHtml('<div class="gate"><div class="gt">📚 Joelboard Study</div><div class="gs">Entrando…</div></div>');
  JB.requestToken(false).then(function(){ authDone=true; afterAuth(); }).catch(showSignIn);
  setTimeout(function(){ if(!authDone && !JB.cachedToken()) showSignIn(); }, 16000);
}
JB.onSessionExpired(function(){ authDone=false; showSignIn(true); });
function showSignIn(expired){ loadingHtml('<div class="gate"><div class="gt">📚 Joelboard Study</div><div class="gs">'+(expired?'Sua sessão expirou. Entre de novo com Google para continuar.':'Provas, trabalhos e matérias num lugar só.')+'</div><button class="btn" onclick="doSignIn()">Entrar com Google</button></div>'); }
function doSignIn(){ JB.signIn({ onSuccess: function(){ authDone=true; afterAuth(); } }); }
function studySignOut(){ JB.signOut(); location.reload(); }
function afterAuth(){ loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Carregando…</div></div>'); JB.fetchEmail().then(bootSheet); }

/* ---- sheet bootstrap ---- */
function bootSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Procurando seus estudos…</div></div>');
  JB.resolveSheet({ app:'study', namePart:'Joelboard', requiredTabs: ['Materias','Eventos'] })  /* distinctive tabs only — Config is shared by all apps */
    .then(function(ctx){ studyGrid=ctx.grid; ensureTabs().then(loadData); })
    .catch(function(e){ var m=String((e&&e.message)||''); if(m.indexOf('silent_timeout')>-1||m.indexOf('auth_failed')>-1||m.indexOf('401')>-1||m.indexOf('cancelled')>-1){ showSignIn(); return; } if(m==='JB_NEED_SHEET'){ var f=(e.files||[]); if(f.length>1) offerLink(f[0]); else gate(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(m)+'</div></div>'); });
}
function ensureTabs(){
  var missing=STUDY_TABS.filter(function(t){ return studyGrid[t[0]]==null; });
  if(!missing.length) return Promise.resolve();
  return JB.api('POST', ssUrl(':batchUpdate'), { requests: missing.map(function(t){ return { addSheet:{ properties:{ title:t[0] } } }; }) })
    .then(function(res){ (res.replies||[]).forEach(function(rep){ if(rep&&rep.addSheet){ studyGrid[rep.addSheet.properties.title]=rep.addSheet.properties.sheetId; } });
      return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data: missing.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; }) }); })
    .then(function(){}).catch(function(){});
}
function gate(){
  loadingHtml('<div class="gate"><div class="gt">📚 Comece a organizar</div><div class="gs">Crie sua planilha de estudos — ela fica no seu Google Drive.</div>'
    + '<button class="btn-primary" onclick="createSheet()">✨ Criar meus estudos</button>'
    + '<div style="color:var(--muted);font-size:12px;margin:16px 0 10px">— ou já tem uma? —</div>'
    + '<input class="field" id="studyUrl" placeholder="Cole o link da planilha"><button class="btn ghost" style="width:100%;margin-top:10px" onclick="linkSheet()">Conectar planilha</button>'
    + '<div id="studyErr" style="color:var(--primary);font-size:12px;margin-top:10px"></div></div>');
}
function offerLink(f){ loadingHtml('<div class="gate"><div class="gt">Encontramos seus estudos 🎉</div><div class="gs">'+esc(f.name)+'</div><button class="btn-primary" onclick="pick(\''+f.id+'\')">Vincular e abrir</button><button class="del" onclick="gate()">usar outro / criar novo</button></div>'); }
function pick(id){ JB.setSheetId('study',id); bootSheet(); }
function linkSheet(){ var u=($('studyUrl').value||'').trim(); var m=u.match(/[a-zA-Z0-9_-]{30,}/); if(!m){ $('studyErr').textContent='Link inválido.'; return; } JB.setSheetId('study',m[0]); bootSheet(); }
function createSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando seus estudos…</div></div>');
  var title='📚 Joelboard Study — '+(JB.email()?JB.email().split('@')[0]:'Pessoal');
  JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets',{ properties:{title:title}, sheets:STUDY_TABS.map(function(t){return {properties:{title:t[0]}};}) })
    .then(function(ss){ JB.setSheetId('study',ss.spreadsheetId);
      var data=STUDY_TABS.map(function(t){return {range:t[0]+'!A1',values:[t[1]]};});
      return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets/'+ss.spreadsheetId+'/values:batchUpdate',{valueInputOption:'RAW',data:data});
    }).then(bootSheet).catch(function(e){ loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro ao criar: '+esc(e.message)+'</div></div>'); });
}

/* ---- load ---- */
function ssUrl(p){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+JB.getSheetId('study')+p; }
function body(rows){ return (rows||[]).slice(1); }
function loadData(){
  loadingHtml(JB.skeletonHtml('study'));
  var want=STUDY_TABS.map(function(t){return t[0];}).filter(function(t){return studyGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.api('GET', ssUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildStudy(by); show();
  }).catch(function(e){ var m=String(e.message||''); if(m.indexOf('403')>-1||m.indexOf('404')>-1||m.indexOf('PERMISSION')>-1){ JB.clearSheetId('study'); bootSheet(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(e.message)+'</div></div>'); });
}
function buildStudy(t){
  var config={}; body(t.Config).forEach(function(r){ if(r[0]) config[r[0]]=r[1]; });
  return {
    materias: body(t.Materias).filter(function(r){return r[0];}).map(function(r){ return { id:r[4], nome:String(r[0]), cor:r[1]||SUBJECT_COLORS[0], total:Number(r[2])||0, feitas:Number(r[3])||0 }; }),
    eventos: body(t.Eventos).filter(function(r){return r[0]||r[2];}).map(function(r){ return { id:r[7], titulo:String(r[0]||''), tipo:r[1]||'Outro', data:String(r[2]||''), hora:String(r[3]||''), materiaIds:String(r[4]||'').split(',').filter(Boolean), concluido:!!r[5], notas:String(r[6]||'') }; }),
    anexos: body(t.Anexos||[]).filter(function(r){return r[3];}).map(function(r){ return { materiaId:String(r[0]||''), eventoId:String(r[1]||''), nome:String(r[2]||''), url:String(r[3]||''), fileId:String(r[4]||''), id:r[5] }; }),
    focos: body(t.Foco||[]).filter(function(r){return r[2];}).map(function(r){ return { data:String(r[0]||''), materiaId:String(r[1]||''), min:Number(r[2])||0, id:r[3] }; }),
    modulos: body(t.Modulos||[]).filter(function(r){return r[1];}).map(function(r){ return { materiaId:String(r[0]||''), nome:String(r[1]||''), feito:!!r[2], id:r[3] }; }),
    config: config
  };
}
function show(){ $('loading').style.display='none'; $('app').style.display='block'; $('acctEmail').textContent='👤 '+(JB.email()||''); render(); if(!_sbooted){ _sbooted=true; if(!JB.tourDone('study')) setTimeout(function(){ JB.tour('study', STUDY_TOUR); }, 600); } if(!window._jbTabSync){ window._jbTabSync=1; JB.onTabVisible(refreshData); JB.watchSheet('study', refreshData); } }
function refreshData(){
  if(!$('app') || $('app').style.display==='none' || !DATA) return;
  var want=STUDY_TABS.map(function(t){return t[0];}).filter(function(t){return studyGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.syncWrap(JB.api('GET', ssUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildStudy(by); render();
  })).catch(function(){});
}
function render(){ renderCal(); renderMaterias(); }
function tab(name){ matDetail=null; ['calendario','materias'].forEach(function(t){ var p=$('p-'+t); if(p) p.classList.toggle('on',t===name); }); var bs=document.querySelectorAll('.tabb'); for(var i=0;i<bs.length;i++) bs[i].classList.toggle('on',bs[i].getAttribute('data-tab')===name); $('fab').style.display = (name==='calendario')?'flex':'none'; }
function mat(id){ return (DATA.materias||[]).find(function(m){return m.id===id;}); }
function matColor(id){ var m=mat(id); return m?m.cor:'var(--muted)'; }

/* ---- calendar ---- */
var calNow=new Date(), calY=calNow.getFullYear(), calM=calNow.getMonth(), selDate=todayISO();
function calNav(d){ calM+=d; if(calM<0){calM=11;calY--;} if(calM>11){calM=0;calY++;} renderCal(); }
function calToday(){ calY=calNow.getFullYear(); calM=calNow.getMonth(); selDate=todayISO(); renderCal(); }
function selectDay(iso){ selDate=iso; renderCal(); }
function evtsOn(iso){ return (DATA.eventos||[]).filter(function(e){return e.data===iso;}).sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');}); }
function renderCal(){
  var el=$('cal'); if(!el) return;
  var first=new Date(calY,calM,1).getDay(), dim=new Date(calY,calM+1,0).getDate(), todayIso=todayISO();
  var cells='';
  for(var i=0;i<first;i++) cells+='<div class="cd empty"></div>';
  for(var d=1;d<=dim;d++){
    var iso=calY+'-'+pad(calM+1)+'-'+pad(d); var evs=evtsOn(iso);
    var dots=evs.slice(0,4).map(function(e){ return '<span class="cdot" style="background:'+((e.materiaIds&&e.materiaIds[0])?matColor(e.materiaIds[0]):'var(--muted)')+(e.concluido?';opacity:.4':'')+'"></span>'; }).join('');
    cells+='<div class="cd'+(iso===todayIso?' today':'')+(iso===selDate?' sel':'')+(evs.length?' has':'')+'" onclick="selectDay(\''+iso+'\')"><span class="cdn">'+d+'</span><span class="cdots">'+dots+'</span></div>';
  }
  var head=WD.map(function(w){return '<div class="cwd">'+w[0]+'</div>';}).join('');
  el.innerHTML='<div class="calhead"><button class="navb" onclick="calNav(-1)">‹</button><button class="calmonth" onclick="calToday()">'+MOFULL[calM]+' '+calY+'</button><button class="navb" onclick="calNav(1)">›</button></div>'
    +'<div class="calgrid calwd">'+head+'</div><div class="calgrid" id="calCells">'+cells+'</div>'
    +'<button class="focuslaunch" onclick="openFoco()">🍅 Modo foco</button>'
    + dayPanelHtml() + proximosHtml();
  if (!_stStudyCal) {
    _stStudyCal = true;
    el.querySelectorAll('.jb-stagger-list').forEach(function (l) { JB.staggerChildren(l, 'study-cal'); });
  }
}
function dayPanelHtml(){
  var evs=evtsOn(selDate);
  var rows = evs.length ? evs.map(evtRow).join('') : JB.emptyState({ icon:'📅', title:'Nada nesse dia', hint:'Adicione provas, trabalhos ou atividades.' });
  return '<div class="secbar" style="margin-top:22px"><div class="sect">'+esc(fmtBR(selDate))+'</div><button class="btn" onclick="openEvt(null)">+ Adicionar</button></div><div class="jb-stagger-list">'+rows+'</div>';
}
function proximosHtml(){
  var up=(DATA.eventos||[]).filter(function(e){ return !e.concluido && daysUntil(e.data)>=0; }).sort(function(a,b){ return (a.data+a.hora).localeCompare(b.data+b.hora); }).slice(0,12);
  if(!up.length) return '';
  return '<div class="secbar" style="margin-top:26px"><div class="sect">⏳ Próximos</div></div><div class="jb-stagger-list">'+up.map(function(e){return evtRow(e,true);}).join('')+'</div>';
}
function evtRow(e,showDate){
  var subs=(e.materiaIds||[]).map(mat).filter(Boolean); var col=subs[0]?subs[0].cor:'var(--muted)', nc=nearClass(e.data,e.concluido);
  var meta=(subs.length?subs.map(function(x){return esc(x.nome);}).join(', ')+' · ':'')+'<span class="etype">'+esc(e.tipo)+'</span>'+(e.hora?(' · '+esc(e.hora)):'')+(evtAnexos(e.id).length?' · 📎':'');
  var flag = showDate ? ('<span class="eflag '+nc+'">'+esc(relLabel(e.data))+'</span>') : '';
  return '<div class="erow'+(e.concluido?' done':'')+'" onclick="openEvt(\''+e.id+'\')"><span class="ebar" style="background:'+col+'"></span>'
    +'<div class="einfo"><div class="etitle">'+esc(e.titulo||'(sem título)')+'</div><div class="emeta">'+meta+(showDate?(' · '+esc(fmtBR(e.data))):'')+'</div></div>'
    + flag + '<button class="echk'+(e.concluido?' on':'')+'" onclick="event.stopPropagation();toggleDone(\''+e.id+'\')" title="Concluir">'+(e.concluido?'✓':'')+'</button></div>';
}
function toggleDone(id){ var e=(DATA.eventos||[]).find(function(x){return x.id===id;}); if(!e) return; e.concluido=!e.concluido; render(); saveEvtRow(e); }

/* ---- event modal ---- */
var editingEvt=null, evtTipo='Prova', evtMaterias=[];
function openEvt(id){
  var e=id?(DATA.eventos||[]).find(function(x){return x.id===id;}):null;
  editingEvt=id||null;
  $('evtTitle').textContent = e?'Editar item':'Novo item';
  $('evtTitulo').value = e?e.titulo:'';
  JB.dpSet('evtData', e?e.data:selDate);
  $('evtHora').value = e?e.hora:'';
  $('evtNotas').value = e?e.notas:'';
  evtTipo = e?e.tipo:'Prova'; evtMaterias = e?((e.materiaIds||[]).slice()):[];
  $('evtConcluido').classList.toggle('on', !!(e&&e.concluido));
  $('evtDel').style.display = e?'block':'none';
  renderEvtTipo(); renderEvtMateria();
  $('evtAnexosWrap').style.display = id?'block':'none'; if(id) renderEvtAnexos(id);
  $('evtOverlay').classList.add('open');
}
function closeEvt(){ $('evtOverlay').classList.remove('open'); }
function toggleEvtDone(){ $('evtConcluido').classList.toggle('on'); }
function renderEvtTipo(){ var el=$('evtTipoWrap'); if(!el) return; el.innerHTML='<div class="jb-dd"><button type="button" class="jb-dd-btn" onclick="JB.ddToggle(this)"><span>'+esc(evtTipo)+'</span><span class="jb-dd-caret">▾</span></button><div class="jb-dd-menu">'+EVENT_TYPES.map(function(t){return '<div class="jb-dd-opt'+(t===evtTipo?' is-sel':'')+'" onclick="pickEvtTipo(\''+t+'\')">'+t+'</div>';}).join('')+'</div></div>'; }
function pickEvtTipo(t){ evtTipo=t; if(window.JB&&JB.ddClose)JB.ddClose(); renderEvtTipo(); }
function renderEvtMateria(){ var el=$('evtMatWrap'); if(!el) return; var ms=(DATA.materias||[]); if(!ms.length){ el.innerHTML='<div class="rg">Crie matérias na aba Matérias para vincular.</div>'; return; } el.innerHTML='<div class="matchips">'+ms.map(function(m){ var on=evtMaterias.indexOf(m.id)>-1; return '<button type="button" class="matchip'+(on?' on':'')+'" style="'+(on?('border-color:'+m.cor):'')+'" onclick="toggleEvtMat(\''+m.id+'\')"><span class="dotc" style="background:'+m.cor+'"></span>'+esc(m.nome)+'</button>'; }).join('')+'</div>'; }
function toggleEvtMat(id){ var i=evtMaterias.indexOf(id); if(i>-1) evtMaterias.splice(i,1); else evtMaterias.push(id); renderEvtMateria(); }
function saveEvt(){
  var titulo=($('evtTitulo').value||'').trim(); var data=JB.dpGet('evtData');
  if(!titulo){ $('evtTitulo').focus(); return; }
  if(!data){ toast('Escolha uma data'); return; }
  var concl=$('evtConcluido').classList.contains('on');
  var e;
  if(editingEvt){ e=(DATA.eventos||[]).find(function(x){return x.id===editingEvt;}); if(!e) return; }
  else { e={id:uuid()}; DATA.eventos.push(e); }
  e.titulo=titulo; e.tipo=evtTipo; e.data=data; e.hora=($('evtHora').value||''); e.materiaIds=evtMaterias.slice(); e.concluido=concl; e.notas=($('evtNotas').value||'').trim();
  closeEvt(); render(); toast('✓ Salvo');
  if(editingEvt){ saveEvtRow(e); } else {
    JB.api('POST', ssUrl('/values/Eventos:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[evtRowVals(e)] }).catch(function(){ toast('Erro ao salvar'); });
  }
}
function evtRowVals(e){ return [e.titulo,e.tipo,e.data,e.hora,(e.materiaIds||[]).join(','),e.concluido?'1':'',e.notas,e.id]; }
function saveEvtRow(e){ findRow('Eventos',7,e.id).then(function(row){ if(row<0) return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Eventos!A'+row+':H'+row)+'?valueInputOption=RAW'), { values:[evtRowVals(e)] }); }).catch(function(){ toast('Erro ao salvar'); }); }
function deleteEvt(){ if(!editingEvt) return; var id=editingEvt; JB.confirm('Excluir item?','Esse agendamento será removido.', function(){
  DATA.eventos=(DATA.eventos||[]).filter(function(x){return x.id!==id;}); closeEvt(); render(); toast('✓ Excluído');
  findRow('Eventos',7,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:studyGrid['Eventos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){ toast('Erro ao excluir'); });
}, { yes:'Excluir', no:'Cancelar', danger:true }); }

/* ---- matérias ---- */
var matDetail=null;
function modulos(matId){ return (DATA.modulos||[]).filter(function(x){return x.materiaId===matId;}); }
function modProgress(matId){ var mods=modulos(matId); if(mods.length){ var d=mods.filter(function(x){return x.feito;}).length; return { done:d, total:mods.length, pct:Math.round(d/mods.length*100), mod:true }; } var m=mat(matId); var t=m?(m.total||0):0, f=m?(m.feitas||0):0; return { done:f, total:t, pct:t>0?Math.min(100,Math.round(f/t*100)):0, mod:false }; }
function openMatDetail(id){ matDetail=id; renderMaterias(); window.scrollTo(0,0); }
function backMat(){ matDetail=null; renderMaterias(); }
function modRowVals(m){ return [m.materiaId, m.nome, m.feito?'1':'', m.id]; }
function modSave(m){ findRow('Modulos',3,m.id).then(function(row){ if(row<0) return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Modulos!A'+row+':D'+row)+'?valueInputOption=RAW'), { values:[modRowVals(m)] }); }).catch(studyWriteErr); }
function addModulo(matId){ var inp=$('detModInput'); if(!inp) return; var nome=(inp.value||'').trim(); if(!nome) return; var mod={ id:uuid(), materiaId:matId, nome:nome, feito:false }; DATA.modulos=DATA.modulos||[]; DATA.modulos.push(mod); inp.value=''; renderMaterias(); JB.api('POST', ssUrl('/values/Modulos:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[modRowVals(mod)] }).catch(studyWriteErr); setTimeout(function(){ var i=$('detModInput'); if(i) i.focus(); },30); }
function toggleModulo(id){ var m=(DATA.modulos||[]).find(function(x){return x.id===id;}); if(!m) return; m.feito=!m.feito; renderMaterias(); modSave(m); }
function removeModulo(id){ DATA.modulos=(DATA.modulos||[]).filter(function(x){return x.id!==id;}); renderMaterias(); findRow('Modulos',3,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:studyGrid['Modulos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(studyWriteErr); }
function openEvtForMat(matId){ openEvt(null); evtMaterias=[matId]; renderEvtMateria(); }
function matDetailHtml(matId){
  var m=mat(matId); if(!m) return ''; var pr=modProgress(matId), mods=modulos(matId), sm=studyMin(matId);
  var evs=(DATA.eventos||[]).filter(function(e){return (e.materiaIds||[]).indexOf(matId)>-1;}).sort(function(a,b){return (a.data+a.hora).localeCompare(b.data+b.hora);});
  return '<button class="lnk" onclick="backMat()">← Matérias</button>'
    +'<div class="matdet-head"><span class="dotc lg" style="background:'+m.cor+'"></span><div class="matdet-name">'+esc(m.nome)+'</div><button class="lnk" onclick="openMat(\''+matId+'\')" title="Editar">✎</button></div>'
    +'<div class="matsub" style="margin-top:0">'+pr.done+' / '+(pr.total||'—')+(pr.mod?' módulos':' aulas')+(sm?(' · ⏱ '+fmtStudy(sm)):'')+'</div>'
    +'<div class="pbar"><span style="width:'+pr.pct+'%;background:'+m.cor+'"></span></div>'
    +'<div class="secbar" style="margin-top:24px"><div class="sect">Módulos / Aulas</div></div>'
    +(mods.length?mods.map(function(x){ return '<div class="modrow'+(x.feito?' done':'')+'"><button class="echk'+(x.feito?' on':'')+'" onclick="toggleModulo(\''+x.id+'\')">'+(x.feito?'✓':'')+'</button><span class="modname">'+esc(x.nome)+'</span><button class="anexx" onclick="removeModulo(\''+x.id+'\')">✕</button></div>'; }).join(''):'<div class="rg">Liste os módulos/aulas do curso e marque conforme avança.</div>')
    +'<div class="modadd"><input class="field" id="detModInput" placeholder="ex.: Módulo 1 — Limites" onkeydown="if(event.key===\'Enter\')addModulo(\''+matId+'\')"><button class="btn" onclick="addModulo(\''+matId+'\')">+</button></div>'
    +'<div class="secbar" style="margin-top:26px"><div class="sect">Provas & trabalhos</div><button class="btn" onclick="openEvtForMat(\''+matId+'\')">+ Adicionar</button></div>'
    +(evs.length?evs.map(function(e){return evtRow(e,true);}).join(''):JB.emptyState({ icon:'📚', title:'Nada agendado', hint:'Vincule provas e trabalhos a esta matéria.' }))
    +'<div class="secbar" style="margin-top:26px"><div class="sect">Materiais</div></div>'
    +matAnexosHtml(matId);
}
function renderMaterias(){
  var el=$('matList'); if(!el) return;
  if(matDetail){ if(mat(matDetail)){ el.innerHTML=matDetailHtml(matDetail); return; } matDetail=null; }
  var ms=(DATA.materias||[]);
  if(!ms.length){ el.innerHTML=JB.emptyState({ icon:'📖', title:'Nenhuma matéria ainda', hint:'Organize cursos, módulos e provas por disciplina.', action:'+ Adicionar', onclick:'openMat()' }); return; }
  el.innerHTML=ms.map(function(m){
    var pr=modProgress(m.id);
    var cnt=(DATA.eventos||[]).filter(function(e){return (e.materiaIds||[]).indexOf(m.id)>-1 && !e.concluido && daysUntil(e.data)>=0;}).length; var anx=subjAnexos(m.id).length;
    return '<div class="matc" onclick="openMatDetail(\''+m.id+'\')"><div class="matrow"><span class="dotc lg" style="background:'+m.cor+'"></span><div class="matname">'+esc(m.nome)+'</div>'
      +(pr.mod?'<span class="rg" style="flex:0 0 auto">›</span>':'<button class="aulabtn" onclick="event.stopPropagation();addAula(\''+m.id+'\')">+1 aula</button>')+'</div>'
      +'<div class="matsub">'+pr.done+' / '+(pr.total||'—')+(pr.mod?' módulos':' aulas')+(cnt?(' · '+cnt+' próximo'+(cnt>1?'s':'')):'')+(anx?(' · 📎 '+anx):'')+studyTimeStr(m.id)+'</div>'
      +'<div class="pbar"><span style="width:'+pr.pct+'%;background:'+m.cor+'"></span></div></div>';
  }).join('');
  if (!_stStudyMat) { _stStudyMat = true; JB.staggerChildren(el, 'study-mat'); }
}
function addAula(id){ var m=mat(id); if(!m) return; if(m.total&&m.feitas>=m.total){ toast('Todas as aulas concluídas ✓'); return; } m.feitas=(m.feitas||0)+1; renderMaterias(); saveMatRow(m); }
var editingMat=null, matCor=SUBJECT_COLORS[0];
function openMat(id){
  var m=id?mat(id):null; editingMat=id||null;
  $('matTitle').textContent = m?'Editar matéria':'Nova matéria';
  $('matNome').value = m?m.nome:'';
  $('matTotal').value = m?(m.total||''):'';
  $('matFeitas').value = m?(m.feitas||0):0;
  matCor = m?m.cor:SUBJECT_COLORS[0];
  $('matDel').style.display = m?'block':'none';
  renderMatColors();
  $('matAnexosWrap').style.display='none';
  $('matOverlay').classList.add('open');
}
function closeMat(){ $('matOverlay').classList.remove('open'); }
function renderMatColors(){ var el=$('matColors'); if(!el) return; el.innerHTML=SUBJECT_COLORS.map(function(c){ return '<button type="button" class="cswatch'+(c===matCor?' on':'')+'" style="background:'+c+'" onclick="pickMatColor(\''+c+'\')"></button>'; }).join(''); }
function pickMatColor(c){ matCor=c; renderMatColors(); }
function saveMat(){
  var nome=($('matNome').value||'').trim(); if(!nome){ $('matNome').focus(); return; }
  var total=Number($('matTotal').value)||0, feitas=Math.max(0,Number($('matFeitas').value)||0);
  var m;
  if(editingMat){ m=mat(editingMat); if(!m) return; } else { m={id:uuid()}; DATA.materias.push(m); }
  m.nome=nome; m.cor=matCor; m.total=total; m.feitas=feitas;
  closeMat(); render(); toast('✓ Salvo');
  if(editingMat){ var sf=studyFolders(); if(sf.subs&&sf.subs[m.id]){ JB.api('PATCH','https://www.googleapis.com/drive/v3/files/'+sf.subs[m.id],{ name:m.nome }).catch(studyWriteErr); } saveMatRow(m); } else {
    JB.api('POST', ssUrl('/values/Materias:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[matRowVals(m)] }).catch(function(){ toast('Erro ao salvar'); });
  }
}
function matRowVals(m){ return [m.nome,m.cor,m.total,m.feitas,m.id]; }
function saveMatRow(m){ findRow('Materias',4,m.id).then(function(row){ if(row<0) return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Materias!A'+row+':E'+row)+'?valueInputOption=RAW'), { values:[matRowVals(m)] }); }).catch(function(){ toast('Erro ao salvar'); }); }
function deleteMat(){ if(!editingMat) return; var id=editingMat; JB.confirm('Excluir matéria?','A matéria será removida (os itens ligados a ela ficam sem matéria).', function(){
  DATA.materias=(DATA.materias||[]).filter(function(x){return x.id!==id;});
  (DATA.eventos||[]).forEach(function(e){ var i=(e.materiaIds||[]).indexOf(id); if(i>-1){ e.materiaIds.splice(i,1); saveEvtRow(e); } });
  (DATA.modulos||[]).filter(function(x){return x.materiaId===id;}).forEach(function(x){ findRow('Modulos',3,x.id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:studyGrid['Modulos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(studyWriteErr); });
  DATA.modulos=(DATA.modulos||[]).filter(function(x){return x.materiaId!==id;});
  closeMat(); render(); toast('✓ Excluído');
  findRow('Materias',4,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:studyGrid['Materias'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){ toast('Erro ao excluir'); });
}, { yes:'Excluir', no:'Cancelar', danger:true }); }

/* ---- helpers / settings ---- */
function findRow(tab,idCol,id){ return JB.api('GET', ssUrl('/values/'+encodeURIComponent(tab)+'?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; for(var i=1;i<v.length;i++){ if(String((v[i]||[])[idCol])===String(id)) return i+1; } return -1; }); }
function fab(){ openEvt(null); }
function openSettings(){ switchSet('tema'); JB.renderSkinPicker('study', $('setSkins')); var c=focCfg(); $('focoMin').value=c.foco; $('pausaMin').value=c.pausa; $('longMin').value=c.long; $('cycLong').value=c.cyc; $('setOverlay').classList.add('open'); }
function closeSettings(){ $('setOverlay').classList.remove('open'); }
function switchSet(name){ var ts=document.querySelectorAll('#setOverlay .set-tab'); for(var i=0;i<ts.length;i++) ts[i].classList.toggle('active',ts[i].getAttribute('data-st')===name); var ps=document.querySelectorAll('#setOverlay .set-pane'); for(var j=0;j<ps.length;j++){ var on=ps[j].getAttribute('data-pane')===name; ps[j].style.display=on?'':'none'; ps[j].classList.toggle('active', on); } }

/* ---- config + Drive folders + attachments ---- */
function saveConfig(k,v){ DATA.config=DATA.config||{}; DATA.config[k]=v; JB.api('GET', ssUrl('/values/Config?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var vals=res.values||[]; for(var i=1;i<vals.length;i++){ if(String((vals[i]||[])[0])===k) return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Config!B'+(i+1))+'?valueInputOption=RAW'), {values:[[v]]}); } return JB.api('POST', ssUrl('/values/Config:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {values:[[k,v]]}); }).catch(studyWriteErr); }
function studyFolders(){ try{ var v=JSON.parse((DATA.config&&DATA.config.studyFolders)||'{}'); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } }
function saveFolders(sf){ saveConfig('studyFolders', JSON.stringify(sf)); }
function ensureRoot(){ var sf=studyFolders(); if(sf.root) return Promise.resolve(sf.root); return JB.api('POST','https://www.googleapis.com/drive/v3/files?fields=id',{ name:'Joelboard Study — Anexos', mimeType:'application/vnd.google-apps.folder' }).then(function(f){ sf.root=f.id; saveFolders(sf); return f.id; }); }
function ensureSub(matId){ return ensureRoot().then(function(root){ if(!matId) return root; var sf=studyFolders(); sf.subs=sf.subs||{}; if(sf.subs[matId]) return sf.subs[matId]; var m=mat(matId); return JB.api('POST','https://www.googleapis.com/drive/v3/files?fields=id',{ name:(m?m.nome:'Matéria'), mimeType:'application/vnd.google-apps.folder', parents:[root] }).then(function(f){ sf.subs[matId]=f.id; saveFolders(sf); return f.id; }); }); }
function uploadFile(file, folderId){
  var boundary='jbs'+Date.now()+Math.floor(Math.random()*1e6);
  var meta={ name:file.name }; if(folderId) meta.parents=[folderId];
  var pre='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')+'\r\n\r\n';
  var post='\r\n--'+boundary+'--';
  var blob=new Blob([pre, file, post], { type:'multipart/related; boundary='+boundary });
  var url='https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  function attempt(tok, retry){ return fetch(url, { method:'POST', headers:{ Authorization:'Bearer '+tok }, body:blob }).then(function(r){ if(r.status===401 && retry){ return JB.requestToken(false).then(function(nt){ return attempt(nt,false); }); } if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP '+r.status); }); return r.json(); }); }
  var t=JB.cachedToken();
  return (t?Promise.resolve(t):JB.requestToken(false)).then(function(tok){ return attempt(tok,true); });
}
function subjAnexos(matId){ return (DATA.anexos||[]).filter(function(a){return a.materiaId===matId && !a.eventoId;}); }
function evtAnexos(evtId){ return (DATA.anexos||[]).filter(function(a){return a.eventoId===evtId;}); }
function anexoRowVals(a){ return [a.materiaId,a.eventoId,a.nome,a.url,a.fileId,a.id]; }
var uploadCtx=null;
function pickFileFor(kind,id){ uploadCtx={kind:kind,id:id}; var fi=$('fileInput'); fi.value=''; fi.click(); }
function onFilePicked(){ var fi=$('fileInput'); var file=fi.files&&fi.files[0]; if(file) doUpload(file); }
function doUpload(file){
  if(!uploadCtx) return; var ctx=uploadCtx;
  var matId = ctx.kind==='mat' ? ctx.id : (function(){ var e=(DATA.eventos||[]).find(function(x){return x.id===ctx.id;}); return (e&&e.materiaIds&&e.materiaIds[0])?e.materiaIds[0]:''; })();
  toast('Enviando '+file.name+'…');
  ensureSub(matId).then(function(folderId){ return uploadFile(file, folderId); }).then(function(f){
    var a={ id:uuid(), materiaId:matId, eventoId:(ctx.kind==='evt'?ctx.id:''), nome:(f.name||file.name), url:(f.webViewLink||''), fileId:(f.id||'') };
    DATA.anexos=DATA.anexos||[]; DATA.anexos.push(a);
    JB.api('POST', ssUrl('/values/Anexos:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[anexoRowVals(a)] }).catch(function(){ toast('Anexado, mas erro ao salvar o link'); });
    if(ctx.kind==='mat') renderMatAnexos(ctx.id); else renderEvtAnexos(ctx.id);
    renderMaterias(); renderCal(); toast('✓ Anexado');
  }).catch(function(e){ toast('Erro ao enviar arquivo'); });
}
function anexoRow(a,kind,ctxId){ return '<div class="anexrow"><a class="anexlink" href="'+esc(a.url)+'" target="_blank" rel="noopener">📄 '+esc(a.nome)+'</a><button class="anexx" onclick="removeAnexo(\''+a.id+'\',\''+kind+'\',\''+ctxId+'\')" title="Remover">✕</button></div>'; }
function matAnexosHtml(matId){ var list=subjAnexos(matId); return (list.length?list.map(function(a){return anexoRow(a,'mat',matId);}).join(''):'<div class="rg">Nenhum material ainda.</div>')+'<button class="btn ghost anexbtn" onclick="pickFileFor(\'mat\',\''+matId+'\')">📎 Anexar arquivo</button>'; }
function renderMatAnexos(matId){ var el=$('matAnexos'); if(el) el.innerHTML=matAnexosHtml(matId); }
function renderEvtAnexos(evtId){ var el=$('evtAnexos'); if(!el) return; var list=evtAnexos(evtId); var e=(DATA.eventos||[]).find(function(x){return x.id===evtId;}); var subs=e?((e.materiaIds||[]).map(mat).filter(Boolean)):[]; var matLink=subs.length?('<div class="rg" style="margin-top:8px">📚 Materiais: '+subs.map(function(m){return '<a class="anexlink" style="display:inline" onclick="closeEvt();tab(\'materias\');openMat(\''+m.id+'\')">'+esc(m.nome)+'</a>';}).join(' · ')+'</div>'):''; el.innerHTML=(list.length?list.map(function(a){return anexoRow(a,'evt',evtId);}).join(''):'<div class="rg">Nenhum anexo neste item.</div>')+'<div style="display:flex;gap:8px;margin-top:4px"><button class="btn ghost anexbtn" style="margin-top:0" onclick="pickFileFor(\'evt\',\''+evtId+'\')">📎 Anexar arquivo</button><button class="btn ghost anexbtn" style="margin-top:0" onclick="openLinkPicker(\''+evtId+'\')">🔗 Vincular material</button></div>'+matLink; }
var linkEvtId=null;
function openLinkPicker(evtId){ linkEvtId=evtId; var have={}; evtAnexos(evtId).forEach(function(a){ have[a.fileId||a.url]=1; }); var avail=(DATA.anexos||[]).filter(function(a){ return !a.eventoId && !have[a.fileId||a.url]; }); var el=$('linkList');
  if(!avail.length){ el.innerHTML='<div class="empty" style="padding:22px">Nenhum material disponível. Anexe arquivos a uma matéria primeiro.</div>'; }
  else { var byM={}; avail.forEach(function(a){ (byM[a.materiaId]=byM[a.materiaId]||[]).push(a); }); var html=''; Object.keys(byM).forEach(function(mid){ var m=mat(mid); html+='<div class="linkhdr"><span class="dotc" style="background:'+(m?m.cor:'var(--muted)')+'"></span>'+esc(m?m.nome:'Sem matéria')+'</div>'+byM[mid].map(function(a){ return '<div class="anexrow" style="cursor:pointer" onclick="linkExisting(\''+a.id+'\')"><span class="anexlink">📄 '+esc(a.nome)+'</span><span style="color:var(--primary);font-weight:800;font-size:13px">+ Vincular</span></div>'; }).join(''); }); el.innerHTML=html; }
  $('linkOverlay').classList.add('open'); }
function closeLink(){ $('linkOverlay').classList.remove('open'); }
function linkExisting(srcId){ var src=(DATA.anexos||[]).find(function(a){return a.id===srcId;}); if(!src||!linkEvtId) return; var a={ id:uuid(), materiaId:src.materiaId, eventoId:linkEvtId, nome:src.nome, url:src.url, fileId:src.fileId }; JB.persist({ run: function(){ return JB.api('POST', ssUrl('/values/Anexos:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[anexoRowVals(a)] }); }, onSuccess: function(){ DATA.anexos.push(a); closeLink(); renderEvtAnexos(linkEvtId); renderCal(); toast('✓ Vinculado'); }, onError: studyWriteErr }); }
function removeAnexo(id,kind,ctxId){ JB.confirm('Remover anexo?','O arquivo continua no seu Google Drive.', function(){ JB.persist({ run: function(){ return findRow('Anexos',5,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:studyGrid['Anexos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }); }, onSuccess: function(){ DATA.anexos=(DATA.anexos||[]).filter(function(a){return a.id!==id;}); if(kind==='mat') renderMatAnexos(ctxId); else renderEvtAnexos(ctxId); renderMaterias(); renderCal(); }, onError: studyWriteErr }); }, { yes:'Remover', no:'Cancelar', danger:true }); }
function fmtT(x){ var m=Math.floor(x/60),s=x%60; return m+':'+(s<10?'0':'')+s; }
function studyMin(matId){ return (DATA.focos||[]).filter(function(f){return f.materiaId===matId;}).reduce(function(a,f){return a+(f.min||0);},0); }
function fmtStudy(m){ if(!m) return ''; var h=Math.floor(m/60), mm=m%60; var s=h?(h+'h'):''; if(mm||!h) s+=(s?' ':'')+mm+'m'; return s; }
function studyTimeStr(matId){ var m=studyMin(matId); return m?(' · ⏱ '+fmtStudy(m)):''; }
function ping(){ try{ if(navigator.vibrate) navigator.vibrate([180,70,180]); }catch(e){} try{ var A=window.AudioContext||window.webkitAudioContext; if(!A) return; var a=new A(); var o=a.createOscillator(), g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=760; g.gain.value=0.07; o.start(); setTimeout(function(){ try{o.stop();a.close();}catch(e){} },340); }catch(e){} }

/* ---- focus mode (Pomodoro) ---- */
function focCfg(){ var c=DATA.config||{}; return { foco:Number(c.focoMin)||25, pausa:Number(c.pausaMin)||5, long:Number(c.longMin)||15, cyc:Number(c.cycLong)||4 }; }
function saveFocoCfg(){ saveConfig('focoMin', String(Math.max(1,Number($('focoMin').value)||25))); saveConfig('pausaMin', String(Math.max(1,Number($('pausaMin').value)||5))); saveConfig('longMin', String(Math.max(1,Number($('longMin').value)||15))); saveConfig('cycLong', String(Math.max(1,Number($('cycLong').value)||4))); }
var focState={active:false,running:false,phase:'foco',secs:0,tot:0,cycle:1,longb:false,matId:''}, focMat='', focInt=null;
function openFoco(){ if(focState.active){ $('focoOverlay').classList.add('open'); renderFoco(); return; } focMat=(DATA.materias&&DATA.materias[0])?DATA.materias[0].id:''; focState={active:false,running:false,phase:'foco',secs:0,tot:0,cycle:1,longb:false,matId:''}; renderFoco(); $('focoOverlay').classList.add('open'); }
function closeFoco(){ $('focoOverlay').classList.remove('open'); }
function renderFocMat(){ var el=$('focMatWrap'); if(!el) return; var cur=mat(focMat); var btn=cur?('<span class="dotc" style="background:'+cur.cor+'"></span>'+esc(cur.nome)):'— sem matéria —'; var opts='<div class="jb-dd-opt'+(focMat===''?' is-sel':'')+'" onclick="pickFocMat(\'\')">— sem matéria —</div>'+(DATA.materias||[]).map(function(m){return '<div class="jb-dd-opt'+(m.id===focMat?' is-sel':'')+'" onclick="pickFocMat(\''+m.id+'\')"><span class="dotc" style="background:'+m.cor+'"></span>'+esc(m.nome)+'</div>';}).join(''); el.innerHTML='<div class="jb-dd"><button type="button" class="jb-dd-btn" onclick="JB.ddToggle(this)"><span>'+btn+'</span><span class="jb-dd-caret">▾</span></button><div class="jb-dd-menu">'+opts+'</div></div>'; }
function pickFocMat(id){ focMat=id; if(window.JB&&JB.ddClose)JB.ddClose(); renderFocMat(); }
function startFocoRun(){ var c=focCfg(); focState={active:true,running:true,phase:'foco',tot:c.foco*60,secs:c.foco*60,cycle:1,longb:false,matId:focMat}; clearInterval(focInt); focInt=setInterval(focTick,1000); renderFoco(); }
function focTick(){ if(!focState.running) return; focState.secs--; if(focState.secs<=0){ ping(); if(focState.phase==='foco') logFocoBlock(); advanceFoc(); return; } var el=$('focSecs'); if(el) el.textContent=fmtT(focState.secs); }
function advanceFoc(){ var c=focCfg(); if(focState.phase==='foco'){ var long=(focState.cycle % c.cyc===0); focState.phase='pausa'; focState.longb=long; focState.tot=(long?c.long:c.pausa)*60; focState.secs=focState.tot; } else { focState.cycle++; focState.phase='foco'; focState.tot=c.foco*60; focState.secs=focState.tot; } renderFoco(); }
function pauseFoco(){ focState.running=!focState.running; renderFoco(); }
function skipFoco(){ if(focState.phase==='foco') logFocoBlock(); advanceFoc(); }
function endFoco(){ if(focState.active && focState.phase==='foco') logFocoBlock(); clearInterval(focInt); focState.active=false; $('focoOverlay').classList.remove('open'); render(); }
function logFocoBlock(){ var mins=Math.round((focState.tot-focState.secs)/60); if(mins>=1 && focState.matId) logFoco(focState.matId, mins); }
function logFoco(matId,mins){ var f={id:uuid(),data:todayISO(),materiaId:matId,min:mins}; DATA.focos=DATA.focos||[]; DATA.focos.push(f); JB.api('POST', ssUrl('/values/Foco:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[[f.data,f.materiaId,f.min,f.id]] }).catch(studyWriteErr); }
function renderFoco(){
  var top=$('focTop'), stage=$('focStage'), btm=$('focBtm'); if(!stage) return;
  if(!focState.active){
    top.innerHTML='<button class="focx" onclick="closeFoco()">✕</button><span class="foctitle">Modo foco</span><span style="width:36px"></span>';
    stage.innerHTML='<div class="fockick">🍅 Pomodoro</div><div class="focpick"><label class="fl" style="text-align:left">O que vai estudar?</label><div id="focMatWrap"></div></div><div class="focdur">'+focCfg().foco+' min foco · '+focCfg().pausa+' min pausa</div>';
    btm.innerHTML='<button class="focbtn" onclick="startFocoRun()">Iniciar ▶</button>';
    renderFocMat(); return;
  }
  var m=mat(focState.matId), mname=m?m.nome:'', isFoco=focState.phase==='foco';
  top.innerHTML='<button class="focx" onclick="endFoco()">✕</button><span class="foctitle">'+esc(mname||'Foco')+'</span><span style="width:36px"></span>';
  stage.innerHTML='<div class="fockick">'+(isFoco?'🍅 Foco':(focState.longb?'☕ Pausa longa':'☕ Pausa'))+' · ciclo '+focState.cycle+'</div>'+(mname?'<div class="focname">'+esc(mname)+'</div>':'')+'<div class="focdisc '+(isFoco?'work':'rest')+'"><div class="focsecs" id="focSecs">'+fmtT(focState.secs)+'</div></div>';
  btm.innerHTML='<button class="focbtn" onclick="pauseFoco()">'+(focState.running?'⏸ Pausar':'▶ Retomar')+'</button><button class="focsub" onclick="skipFoco()">Pular fase →</button>';
}

var _sbooted=false;
var STUDY_TOUR=[
  { title:'Bem-vindo ao Study 📚', body:'Organize provas, trabalhos e matérias.' },
  { go:function(){ tab('calendario'); }, sel:'#calCells', title:'Calendário', body:'Toque num dia para agendar provas e trabalhos; os pontos mostram os itens.' },
  { go:function(){ tab('calendario'); }, sel:'.focuslaunch', title:'Modo foco', body:'Inicie um Pomodoro e registre seu tempo de estudo por matéria.' },
  { go:function(){ tab('materias'); }, sel:'#p-materias .btn', title:'Matérias', body:'Crie matérias, acompanhe aulas e anexe materiais (PDFs, Docs).' },
  { go:function(){ tab('calendario'); }, sel:'#fab', title:'Adicionar', body:'Toque no + para agendar um item.' },
  { sel:'.acct .lnk', title:'Ajustes', body:'Tema e este tutorial ficam aqui.' }
];
function studyVerTutorial(){ closeSettings(); setTimeout(function(){ JB.tour('study', STUDY_TOUR); }, 250); }
JB.applySkin('study');
startAuth();
