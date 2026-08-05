/* Joelboard Fit — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var DATA=null, fitGrid={}, editingEx=null, authDone=false, _stFitEx=false, _stFitTr=false;
var FIT_TABS=[['Exercicios',['Nome','Grupo','ID']],['Treinos',['Nome','Itens','ID']],['Sessoes',['Data','Treino','Notas','ID']],['Series',['Sessao ID','Exercicio ID','Serie','Reps','Peso','ID']],['Config',['Chave','Valor']],['Peso',['Data','Peso','ID']],['MacroFoods',['Nome','P/100g','C/100g','G/100g','K/100g','F/100g','Fs/100g','ID']],['MacroLog',['Data','Refeicao','Alimento','Gramas','Proteina','Carbs','Gordura','Fibras','FibSol','Kcal','Ref','Fonte','ID']]];
var DEFAULT_TAGS=['Peito','Costas','Pernas','Glúteos','Ombros','Bíceps','Tríceps','Core','Panturrilha','Cardio','Outro'];
var STARTER=[['Supino reto','Peito'],['Supino inclinado','Peito'],['Crucifixo','Peito'],['Crossover','Peito'],['Flexão','Peito'],['Puxada alta','Costas'],['Remada curvada','Costas'],['Remada baixa','Costas'],['Barra fixa','Costas'],['Levantamento terra','Costas'],['Agachamento','Pernas'],['Leg press','Pernas'],['Cadeira extensora','Pernas'],['Mesa flexora','Pernas'],['Afundo','Pernas'],['Hip thrust','Glúteos'],['Desenvolvimento','Ombros'],['Elevação lateral','Ombros'],['Elevação frontal','Ombros'],['Encolhimento','Ombros'],['Rosca direta','Bíceps'],['Rosca alternada','Bíceps'],['Rosca martelo','Bíceps'],['Tríceps na polia','Tríceps'],['Tríceps testa','Tríceps'],['Mergulho','Tríceps'],['Prancha','Core'],['Abdominal','Core'],['Panturrilha em pé','Panturrilha'],['Esteira','Cardio'],['Bicicleta','Cardio'],['Barra australiana','Costas'],['Chin-up (supinado)','Bíceps'],['Muscle-up','Costas'],['Flexão diamante','Tríceps'],['Flexão declinada','Peito'],['Pistol squat','Pernas'],['Agachamento búlgaro','Pernas'],['Ponte de glúteo','Glúteos'],['Elevação de pernas suspensa','Core'],['L-sit','Core'],['Prancha lateral','Core'],['Superman','Costas'],['Burpee','Cardio'],['Mountain climber','Core'],['Polichinelo','Cardio'],['Step-up (subida no banco)','Pernas'],['Dips de banco','Tríceps']];
function $(id){ return document.getElementById(id); }
function uuid(){ return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}); }
function loadingHtml(h){ $('loading').style.display='block'; $('loading').innerHTML=h; }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function toast(m){ JB.toast(m); }
function fitWriteErr(e){ toast('Erro: '+((e&&e.message)||'falha ao salvar')); }
/* ---- auth (shared core) ---- */
function startAuth(){
  if (JB.cachedToken()){ afterAuth(); return; }
  if (JB.bootAuthIfExpired(function(){ authDone=false; showSignIn(true); }, function(){ authDone=true; afterAuth(); })) return;
  loadingHtml('<div class="gate"><div class="gt">💪 Joelboard Fit</div><div class="gs">Entrando…</div></div>');
  JB.requestToken(false).then(function(){ authDone=true; afterAuth(); }).catch(showSignIn);
  setTimeout(function(){ if(!authDone && !JB.cachedToken()) showSignIn(); }, 16000);
}
JB.onSessionExpired(function(){ authDone=false; showSignIn(true); });
JB.onAuthRestored(function(){ if(!JB.isSignedIn()||authDone) return; authDone=true; afterAuth(); });
function showSignIn(expired){ loadingHtml('<div class="gate"><div class="gt">💪 Joelboard Fit</div><div class="gs">'+(expired?'Sua sessão expirou. Entre de novo com Google para continuar.':'Treinos e progressão de carga.')+'</div><button class="btn" onclick="doSignIn()">Entrar com Google</button></div>'); }
function doSignIn(){ JB.signIn({ onSuccess: function(){ authDone=true; afterAuth(); } }); }
function fitSignOut(){ JB.signOut(); location.reload(); }
function afterAuth(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Carregando…</div></div>');
  JB.fetchEmail().then(bootSheet);
}

/* ---- sheet bootstrap ---- */
function bootSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Procurando seu treino…</div></div>');
  JB.resolveSheet({ app:'fit', namePart:'Joelboard', requiredTabs: FIT_TABS.map(function(t){return t[0];}) })
    .then(function(ctx){ fitGrid=ctx.grid; ensureTabs().then(loadData); })
    .catch(function(e){ var m=String((e&&e.message)||''); if(m.indexOf('silent_timeout')>-1||m.indexOf('auth_failed')>-1||m.indexOf('401')>-1||m.indexOf('cancelled')>-1){ showSignIn(); return; } if(m==='JB_NEED_SHEET'){ var f=(e.files||[]); if(f.length>1) offerLink(f[0]); else gate(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(m)+'</div></div>'); });
}
function ensureTabs(){
  var missing=FIT_TABS.filter(function(t){ return fitGrid[t[0]]==null; });
  if(!missing.length) return Promise.resolve();
  return JB.api('POST', ssUrl(':batchUpdate'), { requests: missing.map(function(t){ return { addSheet:{ properties:{ title:t[0] } } }; }) })
    .then(function(res){ (res.replies||[]).forEach(function(rep){ if(rep&&rep.addSheet){ fitGrid[rep.addSheet.properties.title]=rep.addSheet.properties.sheetId; } });
      return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption:'RAW', data: missing.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; }) }); })
    .then(function(){}).catch(function(){});
}
function gate(){
  loadingHtml('<div class="gate"><div class="gt">💪 Vamos treinar</div><div class="gs">Crie sua planilha de treino — ela fica no seu Google Drive.</div>'
    + '<button class="btn-primary" onclick="createSheet()">✨ Criar meu treino</button>'
    + '<div style="color:var(--muted);font-size:12px;margin:16px 0 10px">— ou já tem uma? —</div>'
    + '<input class="field" id="fitUrl" placeholder="Cole o link da planilha"><button class="btn ghost" style="width:100%;margin-top:10px" onclick="linkSheet()">Conectar planilha</button>'
    + '<div id="fitErr" style="color:var(--primary);font-size:12px;margin-top:10px"></div></div>');
}
function offerLink(f){ loadingHtml('<div class="gate"><div class="gt">Encontramos seu treino 🎉</div><div class="gs">'+esc(f.name)+'</div><button class="btn-primary" onclick="pick(\''+f.id+'\')">Vincular e abrir</button><button class="del" onclick="gate()">usar outro / criar novo</button></div>'); }
function pick(id){ JB.setSheetId('fit',id); bootSheet(); }
function linkSheet(){ var u=($('fitUrl').value||'').trim(); var m=u.match(/[a-zA-Z0-9_-]{30,}/); if(!m){ $('fitErr').textContent='Link inválido.'; return; } JB.setSheetId('fit',m[0]); bootSheet(); }
function createSheet(){
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando seu treino…</div></div>');
  var title='💪 Joelboard Fit — '+(JB.email()?JB.email().split('@')[0]:'Pessoal');
  JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets',{ properties:{title:title}, sheets:FIT_TABS.map(function(t){return {properties:{title:t[0]}};}) })
    .then(function(ss){ JB.setSheetId('fit',ss.spreadsheetId);
      var data=FIT_TABS.map(function(t){return {range:t[0]+'!A1',values:[t[1]]};});
      data.push({range:'Exercicios!A2',values:STARTER.map(function(e){return [e[0],e[1],uuid()];})});
      data.push({range:'Config!A2',values:[['unit','kg'],['tags',JSON.stringify(DEFAULT_TAGS)]]});
      return JB.api('POST','https://sheets.googleapis.com/v4/spreadsheets/'+ss.spreadsheetId+'/values:batchUpdate',{valueInputOption:'RAW',data:data});
    }).then(bootSheet).catch(function(e){ loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro ao criar: '+esc(e.message)+'</div></div>'); });
}

/* ---- load ---- */
function ssUrl(p){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+JB.getSheetId('fit')+p; }
function loadData(){
  loadingHtml(JB.skeletonHtml('fit'));
  var want=FIT_TABS.map(function(t){return t[0];}).filter(function(t){return fitGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.api('GET', ssUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildFit(by); render();
  }).catch(function(e){ var m=String(e.message||''); if(m.indexOf('403')>-1||m.indexOf('404')>-1||m.indexOf('PERMISSION')>-1){ JB.clearSheetId('fit'); bootSheet(); return; } loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro: '+esc(e.message)+'</div></div>'); });
}
function body(rows){ return (rows||[]).slice(1); }
function buildFit(t){
  var config={ unit:'kg' };
  body(t.Config).forEach(function(r){ if(r[0]) config[r[0]]=r[1]; });
  config.tags=(function(){ try{ var v=JSON.parse(config.tags); return (v&&v.length)?v:DEFAULT_TAGS; }catch(e){ return DEFAULT_TAGS; } })();
  config.rest=Number(config.rest)||90; config.inc=Number(config.inc)||2.5;
  config.schedule=(function(){ try{ var v=JSON.parse(config.schedule); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.volgoals=(function(){ try{ var v=JSON.parse(config.volgoals); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.exmodes=(function(){ try{ var v=JSON.parse(config.exmodes); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.macromeals=(function(){ try{ var v=JSON.parse(config.macromeals); return (v&&v.length)?v:[]; }catch(e){ return []; } })();
  config.macrogoals=(function(){ try{ var v=JSON.parse(config.macrogoals); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.macroshow=(function(){ try{ var v=JSON.parse(config.macroshow); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.macrofavs=(function(){ try{ var v=JSON.parse(config.macrofavs); return (v&&v.length)?v:[]; }catch(e){ return []; } })();
  config.macrowaterlog=(function(){ try{ var v=JSON.parse(config.macrowaterlog); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.macroprofile=(function(){ try{ var v=JSON.parse(config.macroprofile); return (v&&typeof v==='object')?v:{}; }catch(e){ return {}; } })();
  config.macrocalcdismissed=config.macrocalcdismissed==='1'||config.macrocalcdismissed===true;
  return {
    exercicios: body(t.Exercicios).filter(function(r){return r[0];}).map(function(r){ return { id:r[2], name:r[0], group:r[1]||'' }; }),
    treinos: body(t.Treinos).filter(function(r){return r[0];}).map(function(r){ var it=[]; try{it=JSON.parse(r[1]||'[]');}catch(e){} return { id:r[2], name:r[0], items:normItems(it) }; }),
    sessoes: body(t.Sessoes).filter(function(r){return r[0];}).map(function(r){ return { id:r[3], date:String(r[0]), treino:r[1]||'', notas:r[2]||'' }; }),
    series: body(t.Series).filter(function(r){return r[0]&&r[1];}).map(function(r){ return { id:r[5], sessaoId:String(r[0]), exId:String(r[1]), serie:Number(r[2])||0, reps:Number(r[3])||0, peso:Number(r[4])||0 }; }),
    pesos: body(t.Peso||[]).filter(function(r){return r[0];}).map(function(r){ return { id:r[2], date:String(r[0]), kg:Number(r[1])||0 }; }),
    macrofoods: body(t.MacroFoods||[]).filter(function(r){return r[0];}).map(function(r){ return macroParseFood(r); }),
    macrolog: body(t.MacroLog||[]).filter(function(r){return r[0];}).map(function(r){ return macroParseLog(r); }),
    config: config
  };
}

/* ---- render ---- */
function render(){ $('loading').style.display='none'; $('app').style.display='block'; $('acctEmail').textContent='👤 '+(JB.email()||''); renderExercicios(); renderTreinos(); renderHoje(); renderProgresso(); if(document.getElementById('p-macros')) renderMacros(); if(!_fbooted){ _fbooted=true; if(!JB.tourDone('fit')) setTimeout(function(){ JB.tour('fit', FIT_TOUR); }, 600); } if(!window._jbTabSync){ window._jbTabSync=1; JB.onTabVisible(refreshData); JB.watchSheet('fit', refreshData); } }
function refreshData(){
  if(!$('app') || $('app').style.display==='none' || !DATA) return;
  var want=FIT_TABS.map(function(t){return t[0];}).filter(function(t){return fitGrid[t]!=null;});
  var ranges=want.map(function(t){return 'ranges='+encodeURIComponent(t);}).join('&');
  JB.syncWrap(JB.api('GET', ssUrl('/values:batchGet?'+ranges+'&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER')).then(function(res){
    var by={}; (res.valueRanges||[]).forEach(function(vr,i){ by[want[i]]=vr.values||[]; });
    DATA=buildFit(by); renderExercicios(); renderTreinos(); renderHoje(); renderProgresso(); if(document.querySelector('#p-macros.on')) renderMacros();
  })).catch(function(){});
}
function tab(name){
  ['hoje','treinos','exercicios','progresso','macros'].forEach(function(n){ $('p-'+n).classList.toggle('on', n===name); });
  document.querySelectorAll('.tabb').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-tab')===name); });
  $('fab').style.display = (name==='exercicios'||name==='treinos') ? 'flex' : 'none';
  if(name==='hoje') renderHoje(); else if(name==='treinos') renderTreinos(); else if(name==='exercicios') renderExercicios(); else if(name==='progresso'){ progEx=null; renderProgresso(); } else if(name==='macros') renderMacros();
}
function renderExercicios(){
  var el=$('exList'); var ex=(DATA.exercicios||[]);
  if(!ex.length){ el.innerHTML=JB.emptyState({ icon:'🏋️', title:'Nenhum exercício ainda', hint:'Monte sua biblioteca de movimentos.', action:'+ Adicionar', onclick:'openExercise()' }); return; }
  el.innerHTML = ex.slice().sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(x){
    return '<div class="row" onclick="openExercise(\''+x.id+'\')"><div><div class="rn">'+esc(x.name)+modeBadge(x.id)+'</div>'+(x.group?'<div class="rg">'+esc(x.group)+'</div>':'')+'</div><span style="color:var(--muted)">›</span></div>';
  }).join('');
  if (!_stFitEx) { _stFitEx = true; JB.staggerChildren(el, 'fit-ex'); }
}

/* ---- exercise CRUD (via shared JB.api) ---- */
function fitFindRow(tab,idCol,id){ return JB.api('GET', ssUrl('/values/'+encodeURIComponent(tab)+'?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var v=res.values||[]; for(var i=1;i<v.length;i++){ if(String((v[i]||[])[idCol])===String(id)) return i+1; } return -1; }); }
function openExercise(id){
  editingEx = id || null;
  var ex = id ? (DATA.exercicios||[]).find(function(x){return x.id===id;}) : null;
  $('exTitle').textContent = ex ? 'Editar exercício' : 'Novo exercício';
  $('exName').value = ex ? ex.name : '';
  fillGroupSelect(ex ? ex.group : '');
  $('exMode').value = (id ? exMode(id) : 'load');
  $('exDel').style.display = ex ? 'block' : 'none';
  $('exOverlay').classList.add('open');
}
function closeEx(){ $('exOverlay').classList.remove('open'); }
function saveExercise(){
  var name=($('exName').value||'').trim(), group=($('exGroup').value||'').trim();
  if(!name){ $('exName').focus(); return; }
  if(editingEx){
    var x=(DATA.exercicios||[]).find(function(e){return e.id===editingEx;}); if(x){ x.name=name; x.group=group; } setExMode(editingEx, ($('exMode').value||'load'));
    var id=editingEx; renderExercicios(); closeEx(); toast('✓ Salvo');
    fitFindRow('Exercicios',2,id).then(function(row){ if(row<0) throw new Error('not found'); return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Exercicios!A'+row+':C'+row)+'?valueInputOption=RAW'), { values:[[name,group,id]] }); }).catch(function(){ toast('Erro ao salvar'); reload(); });
  } else {
    var nid=uuid(); DATA.exercicios.push({ id:nid, name:name, group:group }); setExMode(nid, ($('exMode').value||'load')); renderExercicios(); closeEx(); toast('✓ Adicionado');
    JB.api('POST', ssUrl('/values/'+encodeURIComponent('Exercicios')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[[name,group,nid]] }).catch(function(){ toast('Erro ao adicionar'); reload(); });
  }
}
function deleteExercise(){
  if(!editingEx) return; var id=editingEx;
  DATA.exercicios=(DATA.exercicios||[]).filter(function(e){return e.id!==id;}); renderExercicios(); closeEx(); toast('✓ Excluído');
  fitFindRow('Exercicios',2,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:fitGrid['Exercicios'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){ toast('Erro ao excluir'); reload(); });
}
function reload(){
  refreshData();
}

var editingTreino=null, trSel=[], trSortable=null;
function exName(id){ var x=(DATA.exercicios||[]).find(function(e){return e.id===id;}); return x?x.name:'—'; }
function fabAdd(){ var on=document.querySelector('.page.on'); var t=on?on.id.replace('p-',''):''; if(t==='treinos') openTreino(); else openExercise(); }
function renderTreinos(){
  var el=$('treinoList'); if(!el) return; var tr=(DATA.treinos||[]);
  if(!tr.length){ el.innerHTML=JB.emptyState({ icon:'📋', title:'Nenhum treino ainda', hint:'Crie um split com os exercícios da biblioteca.', action:'+ Adicionar', onclick:'openTreino()' }); return; }
  el.innerHTML=tr.map(function(r){ var items=(r.items||[]); var prev=items.slice(0,3).map(function(it){ return exName(it.ex)+' '+it.sets+'×'+it.rmin+(it.rmax&&it.rmax!==it.rmin?('-'+it.rmax):''); }).join(' · ')+(items.length>3?(' +'+(items.length-3)):''); return '<div class="row" onclick="openTreino(\''+r.id+'\')"><div><div class="rn">'+esc(r.name)+'</div><div class="rg">'+(items.length?esc(prev):'sem exercícios')+'</div></div><span style="color:var(--muted)">›</span></div>'; }).join('');
  if (!_stFitTr) { _stFitTr = true; JB.staggerChildren(el, 'fit-tr'); }
}
function openTreino(id){
  if(!(DATA.exercicios||[]).length){ toast('Adicione exercícios primeiro'); tab('exercicios'); return; }
  editingTreino=id||null;
  var r= id?(DATA.treinos||[]).find(function(x){return x.id===id;}):null;
  $('trTitle').textContent= r?'Editar treino':'Novo treino';
  $('trName').value= r?r.name:'';
  trSel= r?(r.items||[]).map(function(it){return {ex:it.ex,sets:it.sets,rmin:it.rmin,rmax:it.rmax,rest:it.rest};}):[];
  $('trDel').style.display= r?'block':'none';
  $('trSearch').value=''; renderTrEditor(); $('trOverlay').classList.add('open');
}
function renderTrEditor(){ renderTrSelList(); initTrSort(); renderTrAdd(); }
function renderTrSelList(){
  var el=$('trSelList');
  if(!trSel.length){ el.innerHTML='<div class="rg" style="padding:8px 2px">Nenhum exercício ainda — adicione abaixo.</div>'; return; }
  el.innerHTML=trSel.map(function(it){ var ex=it.ex; return '<div class="selrow" data-id="'+ex+'"><span class="dh">☰</span><div style="flex:1;min-width:0"><div class="selname">'+esc(exName(ex))+modeBadge(ex)+'</div><div class="targrow"><input class="ti" type="number" inputmode="numeric" value="'+it.sets+'" oninput="setTarget(\''+ex+'\',\'sets\',this.value)"><span class="tl">×</span><input class="ti" type="number" inputmode="numeric" value="'+it.rmin+'" oninput="setTarget(\''+ex+'\',\'rmin\',this.value)"><span class="tl">–</span><input class="ti" type="number" inputmode="numeric" value="'+it.rmax+'" oninput="setTarget(\''+ex+'\',\'rmax\',this.value)"><span class="tl">'+(exMode(ex)==='time'?'seg':'reps')+'</span><span class="tl" style="margin-left:3px">⏱</span><input class="ti" type="number" inputmode="numeric" placeholder="'+restDefault()+'" value="'+(it.rest!=null?it.rest:'')+'" oninput="setTarget(\''+ex+'\',\'rest\',this.value)"><span class="tl">s</span></div></div><button class="rm" onclick="removeTrEx(\''+ex+'\')">✕</button></div>'; }).join('');
}
function initTrSort(){ if(trSortable){ try{trSortable.destroy();}catch(e){} trSortable=null; } var el=$('trSelList'); if(window.Sortable && trSel.length){ trSortable=Sortable.create(el,{ animation:150, handle:'.dh', onEnd:function(){ var order=Array.prototype.slice.call(el.querySelectorAll('[data-id]')).map(function(n){return n.getAttribute('data-id');}); trSel=order.map(function(id){ return trSel.find(function(i){return i.ex===id;}); }).filter(Boolean); } }); } }
function renderTrAdd(){
  var raw=($('trSearch').value||'').trim(), q=raw.toLowerCase();
  var avail=(DATA.exercicios||[]).filter(function(x){ return !trSel.some(function(i){return i.ex===x.id;}) && (!q || x.name.toLowerCase().indexOf(q)>-1); }).sort(function(a,b){return a.name.localeCompare(b.name);});
  var html=avail.map(function(x){ return '<div class="addrow" onclick="addTrEx(\''+x.id+'\')"><span>'+esc(x.name)+'</span><span class="plus">+</span></div>'; }).join('');
  if(raw && !(DATA.exercicios||[]).some(function(x){return x.name.toLowerCase()===q;})){ html+='<div class="addrow create" onclick="createTrEx()"><span>Criar “'+esc(raw)+'”</span><span class="plus">＋ novo</span></div>'; }
  if(!html) html='<div class="rg" style="padding:8px 2px">Tudo já adicionado.</div>';
  $('trAddList').innerHTML=html;
}
function addTrEx(id){ if(!trSel.some(function(i){return i.ex===id;})) trSel.push({ex:id,sets:3,rmin:8,rmax:12,rest:null}); $('trSearch').value=''; renderTrEditor(); }
function removeTrEx(id){ trSel=trSel.filter(function(i){return i.ex!==id;}); renderTrEditor(); }
function createTrEx(){ var name=($('trSearch').value||'').trim(); if(!name) return; var nid=uuid(); DATA.exercicios.push({id:nid,name:name,group:''}); trSel.push({ex:nid,sets:3,rmin:8,rmax:12,rest:null}); renderExercicios(); $('trSearch').value=''; renderTrEditor(); toast('✓ Exercício criado'); JB.api('POST', ssUrl('/values/'+encodeURIComponent('Exercicios')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[[name,'',nid]] }).catch(function(){ toast('Erro ao criar exercício'); }); }
function closeTr(){ $('trOverlay').classList.remove('open'); }
function saveTreino(){
  var name=($('trName').value||'').trim(); if(!name){ $('trName').focus(); return; }
  var items=trSel.slice();
  if(editingTreino){
    var r=(DATA.treinos||[]).find(function(x){return x.id===editingTreino;}); if(r){r.name=name;r.items=items;}
    var id=editingTreino; renderTreinos(); closeTr(); toast('✓ Salvo');
    fitFindRow('Treinos',2,id).then(function(row){ if(row<0) throw new Error('nf'); return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Treinos!A'+row+':C'+row)+'?valueInputOption=RAW'), { values:[[name,JSON.stringify(items),id]] }); }).catch(function(){ toast('Erro ao salvar'); });
  } else {
    var nid=uuid(); DATA.treinos.push({id:nid,name:name,items:items}); renderTreinos(); closeTr(); toast('✓ Treino criado');
    JB.api('POST', ssUrl('/values/'+encodeURIComponent('Treinos')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[[name,JSON.stringify(items),nid]] }).catch(function(){ toast('Erro ao criar'); });
  }
}
function deleteTreino(){
  if(!editingTreino) return; var id=editingTreino;
  DATA.treinos=(DATA.treinos||[]).filter(function(x){return x.id!==id;}); renderTreinos(); closeTr(); toast('✓ Excluído');
  fitFindRow('Treinos',2,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:fitGrid['Treinos'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); }).catch(function(){ toast('Erro ao excluir'); });
}
var sess=null;
function unit(){ return (DATA.config&&DATA.config.unit)||'kg'; }
function toggleUnit(){ DATA.config=DATA.config||{}; DATA.config.unit= unit()==='kg'?'lb':'kg'; renderHoje(); saveConfig('unit',DATA.config.unit); }
function saveConfig(k,v){ JB.api('GET', ssUrl('/values/Config?valueRenderOption=UNFORMATTED_VALUE')).then(function(res){ var vals=res.values||[]; for(var i=1;i<vals.length;i++){ if(String((vals[i]||[])[0])===k) return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Config!B'+(i+1))+'?valueInputOption=RAW'), {values:[[v]]}); } return JB.api('POST', ssUrl('/values/Config:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {values:[[k,v]]}); }).catch(fitWriteErr); }
function fmtLast(l,mode){ return l.sets.map(function(s){return mode==='bw'?(''+s.reps):(s.reps+'×'+s.peso);}).join(' · '); }
function lastFor(exId){ var ss=(DATA.series||[]).filter(function(x){return x.exId===exId;}); if(!ss.length) return null; var dateOf={}; (DATA.sessoes||[]).forEach(function(s){dateOf[s.id]=s.date;}); var best=null,bd='-'; ss.forEach(function(x){ var d=dateOf[x.sessaoId]||''; if(d>=bd){bd=d;best=x.sessaoId;} }); var sets=ss.filter(function(x){return x.sessaoId===best;}).sort(function(a,b){return a.serie-b.serie;}); return {date:bd,sets:sets}; }
function recentHtml(){ var s=(DATA.sessoes||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');}).slice(0,5); if(!s.length) return ''; return '<div class="sect" style="margin:26px 0 10px">Últimos treinos</div>'+s.map(function(x){ var c=(DATA.series||[]).filter(function(y){return y.sessaoId===x.id;}).length; return '<div class="row" style="cursor:default"><div><div class="rn">'+esc(x.treino||'Avulso')+'</div><div class="rg">'+esc(x.date)+' · '+c+' séries</div></div><button class="rm" onclick="deleteSession(\''+x.id+'\')" title="Excluir">🗑</button></div>'; }).join(''); }
function weightCardHtml(){
  var ps=(DATA.pesos||[]).slice().sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
  var last=ps.length?ps[ps.length-1]:null, prev=ps.length>1?ps[ps.length-2]:null;
  var u=unit(), goal=parseFloat((DATA.config&&DATA.config.weightGoal))||0;
  var sub;
  if(last){ var s='Último: <b>'+last.kg+' '+u+'</b>';
    if(prev){ var dd=Math.round((last.kg-prev.kg)*10)/10; if(dd) s+=' · '+(dd>0?'+':'')+dd+' '+u; }
    if(goal){ var df=Math.round((last.kg-goal)*10)/10; s+=' · '+(df===0?'na meta 🎯':(Math.abs(df)+' '+u+(df>0?' acima':' abaixo'))); }
    sub=s;
  } else { sub='Registre seu peso para acompanhar a evolução.'; }
  return '<div class="wcard"><div class="wlbl">⚖️ Seu peso<button class="wgoal" onclick="openWGoal()">'+(goal?('meta '+goal+' '+u+' ✎'):'definir meta')+'</button></div>'
    +'<div class="wrow"><input class="field wfield" id="wInput" type="number" inputmode="decimal" step="0.1" placeholder="ex.: 68.5"><button class="btn wbtn" onclick="logWeight()">Registrar</button></div>'
    +'<div class="wsub">'+sub+'</div></div>';
}
function logWeight(){ var raw=(($('wInput')&&$('wInput').value)||'').replace(',','.'); var v=parseFloat(raw); if(!(v>0)){ toast('Peso inválido'); return; } v=Math.round(v*10)/10;
  var today=JB.todayYmd(); DATA.pesos=DATA.pesos||[];
  var ex=DATA.pesos.filter(function(p){return p.date===today;})[0];
  if(ex){ ex.kg=v; renderHoje(); if(!progEx) renderProgresso(); toast('✓ Peso atualizado');
    fitFindRow('Peso',2,ex.id).then(function(row){ if(row<0) return; return JB.api('PUT', ssUrl('/values/'+encodeURIComponent('Peso!A'+row+':C'+row)+'?valueInputOption=RAW'), { values:[[today,v,ex.id]] }); }).catch(function(){ toast('Erro ao salvar'); });
  } else { var id=uuid(); DATA.pesos.push({id:id,date:today,kg:v}); renderHoje(); if(!progEx) renderProgresso(); toast('✓ Peso registrado');
    JB.api('POST', ssUrl('/values/Peso:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[[today,v,id]] }).catch(function(){ toast('Erro ao salvar'); }); }
}
function openWGoal(){ var g=parseFloat((DATA.config&&DATA.config.weightGoal))||''; $('wGoalInput').value=g||''; $('wGoalOverlay').classList.add('open'); setTimeout(function(){ var i=$('wGoalInput'); if(i) i.focus(); },50); }
function closeWGoal(){ $('wGoalOverlay').classList.remove('open'); }
function saveWGoal(){ var raw=($('wGoalInput').value||'').replace(',','.'); var v=parseFloat(raw); DATA.config=DATA.config||{}; DATA.config.weightGoal=(v>0?String(Math.round(v*10)/10):''); saveConfig('weightGoal', DATA.config.weightGoal); closeWGoal(); renderHoje(); if(!progEx) renderProgresso(); toast('✓ Meta salva'); }
function weightSecHtml(){
  var ps=(DATA.pesos||[]).slice().sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
  if(!ps.length) return '';
  var u=unit(), goal=parseFloat((DATA.config&&DATA.config.weightGoal))||0;
  var last=ps[ps.length-1], first=ps[0]; var delta=Math.round((last.kg-first.kg)*10)/10;
  var stats='<div class="prg"><div class="prc"><div class="prl">Atual</div><div class="prv">'+last.kg+' '+u+'</div></div><div class="prc"><div class="prl">Variação</div><div class="prv">'+(delta>0?'+':'')+delta+' '+u+'</div></div>'+(goal?('<div class="prc"><div class="prl">Meta</div><div class="prv">'+goal+' '+u+'</div></div>'):'')+'</div>';
  return '<div class="secbar"><div class="sect">⚖️ Peso corporal</div><span class="rg" style="font-size:11px">'+ps.length+' registro'+(ps.length===1?'':'s')+'</span></div>'+stats+weightChartHtml(ps,goal);
}
function weightChartHtml(ps,goal){
  var pts=ps.slice(-14); if(pts.length<2) return '';
  var W=320,H=120,pad=14; var vals=pts.map(function(p){return p.kg;}); if(goal) vals=vals.concat([goal]);
  var mx=Math.max.apply(null,vals), mn=Math.min.apply(null,vals); if(mx===mn)mx=mn+1;
  var step=(W-2*pad)/(pts.length-1);
  var co=pts.map(function(p,i){ return [pad+i*step, H-pad-((p.kg-mn)/(mx-mn))*(H-2*pad)]; });
  var line=co.map(function(c,i){return (i?'L':'M')+c[0].toFixed(1)+' '+c[1].toFixed(1);}).join(' ');
  var dots=co.map(function(c){return '<circle cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="3" style="fill:var(--primary)"/>';}).join('');
  var goalLine=''; if(goal){ var gy=H-pad-((goal-mn)/(mx-mn))*(H-2*pad); goalLine='<line x1="'+pad+'" y1="'+gy.toFixed(1)+'" x2="'+(W-pad)+'" y2="'+gy.toFixed(1)+'" stroke-dasharray="4 4" style="stroke:var(--success)" stroke-width="1.5"/>'; }
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:6px"><svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="none" style="height:120px;display:block">'+goalLine+'<path d="'+line+'" fill="none" style="stroke:var(--primary)" stroke-width="2" stroke-linejoin="round"/>'+dots+'</svg></div>';
}
function renderHoje(){
  var el=$('hoje'); if(!el) return;
  var today=new Date().getDay(); var rid=schedFor(today); var trToday=rid?(DATA.treinos||[]).find(function(x){return x.id===rid;}):null;
  var heroHtml;
  if(trToday){
    var hi=trToday.items||[]; var prev=hi.slice(0,4).map(function(it){return esc(exName(it.ex));}).join(' · ')+(hi.length>4?(' +'+(hi.length-4)):'');
    heroHtml='<div class="herocard"><div class="herolbl">Hoje · '+wdName(today)+'</div><div class="heroname">'+esc(trToday.name)+'</div><div class="herometa">'+hi.length+' exercício'+(hi.length===1?'':'s')+'</div>'+(hi.length?('<div class="heroprev">'+prev+'</div>'):'')+'<button class="herobtn" onclick="startSession(\''+trToday.id+'\')">Começar treino ▶</button></div>';
  } else {
    heroHtml='<div class="herocard rest"><div class="herolbl">Hoje · '+wdName(today)+'</div><div class="heroname">Dia de descanso 😌</div><div class="heroprev">Aproveite pra recuperar — ou escolha um treino abaixo se quiser ir mesmo assim.</div></div>';
  }
  var switchLink='<button class="lnk swlink" onclick="openSwitch()">'+(trToday?'Trocar treino ▾':'Escolher um treino ▾')+'</button>';
  el.innerHTML=heroHtml+switchLink+weightCardHtml()+volNudgeHtml()+recentHtml();
}
var BW_NAMES=['flexão','barra fixa','barra australiana','chin-up','muscle-up','mergulho','prancha','abdominal','elevação de pernas','l-sit','superman','pistol','búlgaro','ponte de glúteo','burpee','mountain climber','polichinelo'];
var VARMAP={'flexão':'Flexão diamante','flexão declinada':'Flexão diamante','flexão diamante':'Flexão archer','barra australiana':'Barra fixa','barra fixa':'Muscle-up','chin-up (supinado)':'Muscle-up','mergulho':'Mergulho com peso','prancha':'Prancha lateral','prancha lateral':'Prancha com elevação de perna','abdominal':'Elevação de pernas suspensa','agachamento búlgaro':'Pistol squat','ponte de glúteo':'Elevação pélvica unilateral','pistol squat':'Pistol squat com salto'};
var TIME_NAMES=['prancha','plank','l-sit','hollow','superman','wall sit','cadeira na parede','isometr','dead hang','suspens','barra estática','ponte isom'];
function autoMode(name){ var n=(name||'').toLowerCase(); if(TIME_NAMES.some(function(k){return n.indexOf(k)>-1;})) return 'time'; return BW_NAMES.some(function(k){return n.indexOf(k)>-1;})?'bw':'load'; }
function modeBadge(id){ var m=exMode(id); if(m==='bw') return ' <span class="modebadge">corporal</span>'; if(m==='bwload') return ' <span class="modebadge">carga+corp</span>'; if(m==='time') return ' <span class="modebadge">tempo</span>'; return ''; }
function exMode(id){ var ov=(DATA.config&&DATA.config.exmodes)||{}; if(ov[id]) return ov[id]; return autoMode(exName(id)); }
function setExMode(id,mode){ DATA.config=DATA.config||{}; var m=DATA.config.exmodes||{}; m[id]=mode; DATA.config.exmodes=m; saveConfig('exmodes', JSON.stringify(m)); }
function sessMetrics(d){ var W=d.top||0; var ts=d.sets.filter(function(s){return (Number(s.peso)||0)>=W-0.001;}); var rm=ts.length?Math.min.apply(null,ts.map(function(s){return Number(s.reps)||0;})):0; return { W:W, repsMin:rm, nSets:d.sets.length }; }
function suggestProg(exId,item){
  var rmin=Number(item.rmin)||8, rmax=Number(item.rmax)||12, tSets=Number(item.sets)||3, rest=(item.rest!=null?Number(item.rest):restDefault());
  var mode=exMode(exId); var h=progData(exId);
  if(!h.length) return { mode:mode, kind:'new', weight:'', sets:tSets, rest:rest };
  if(mode==='time') return { mode:mode, kind:'time', weight:'', sets:tSets, rest:rest };
  var m=sessMetrics(h[h.length-1]); var W=m.W; var capped=m.repsMin>=rmax;
  if(mode==='bw'){
    if(!capped) return { mode:mode, kind:'bw-reps', weight:'', sets:tSets, rest:rest };
    if(m.nSets<5) return { mode:mode, kind:'bw-set', weight:'', sets:tSets, nextSets:m.nSets+1, rest:rest };
    if(rest>45) return { mode:mode, kind:'bw-rest', weight:'', sets:tSets, rest:Math.max(45,rest-15) };
    return { mode:mode, kind:'bw-harder', weight:'', sets:tSets, rest:rest, harder:(VARMAP[(exName(exId)||'').toLowerCase()]||'') };
  }
  var inc=incDefault();
  if(capped){ var to=Math.round((W+inc)*100)/100; return { mode:mode, kind:'up', weight:to, from:W, to:to, sets:tSets, rest:rest }; }
  var stalled=false;
  if(h.length>=3){ stalled=true; for(var i=h.length-3;i<h.length;i++){ var mm=sessMetrics(h[i]); if(mm.W!==W||mm.repsMin>=rmax){ stalled=false; break; } } }
  if(stalled){ var dl=Math.round((W*0.9)*2)/2; return { mode:mode, kind:'stall', weight:dl, from:W, to:dl, sets:tSets, rest:rest }; }
  return { mode:mode, kind:'hold', weight:W, from:W, sets:tSets, rest:rest };
}
function progHint(sg,rmax){ if(!sg||!sg.kind) return ''; var u=unit();
  if(sg.kind==='up') return '<div class="pghint up">⬆ Subir carga: '+sg.from+' → '+sg.to+u+' — você bateu '+rmax+' reps!</div>';
  if(sg.kind==='hold') return '<div class="pghint hold">➡ Manter '+sg.from+u+' — busque chegar a '+rmax+' reps</div>';
  if(sg.kind==='stall') return '<div class="pghint stall">⚠ Empacado há 3 sessões — tente deload p/ '+sg.to+u+' ou uma variação mais difícil</div>';
  if(sg.kind==='bw-reps') return '<div class="pghint hold">➡ Peso corporal — aumente as reps (alvo '+rmax+')</div>';
  if(sg.kind==='bw-set') return '<div class="pghint up">⬆ Você dominou! Na próxima sessão, considere '+(sg.nextSets!=null?sg.nextSets:(Number(sg.sets)||0)+1)+' séries</div>';
  if(sg.kind==='bw-rest') return '<div class="pghint up">⬆ Mais densidade — descanse só '+sg.rest+'s</div>';
  if(sg.kind==='bw-harder') return '<div class="pghint up">⬆ Hora de evoluir'+(sg.harder?(': tente <b>'+esc(sg.harder)+'</b>'):' p/ uma variação mais difícil')+'</div>';
  if(sg.kind==='time') return '<div class="pghint hold">⏱ Segure pelo tempo alvo</div>';
  return ''; }
function buildRunItem(ex,sets,rmin,rmax,rest){ rmin=Number(rmin)||8; rmax=Number(rmax)||12; var baseSets=Number(sets)||3; var baseRest=(rest!=null?Number(rest):null); var sg=suggestProg(ex,{rmin:rmin,rmax:rmax,sets:baseSets,rest:(baseRest!=null?baseRest:restDefault())}); var nSets=baseSets; var pw=(sg.weight!==''&&sg.weight!=null)?sg.weight:''; var arr=[]; for(var i=0;i<nSets;i++){ arr.push({reps:'',peso:pw,done:false}); } return { ex:ex, name:exName(ex), mode:sg.mode, sets:arr, rmin:rmin, rmax:rmax, rest:(sg.rest!=null?sg.rest:baseRest), sg:sg }; }
function startSession(tid){ var date=JB.todayYmd(); var name='Avulso', items=[]; if(tid){ var r=(DATA.treinos||[]).find(function(x){return x.id===tid;}); if(r){ name=r.name; items=(r.items||[]).map(function(it){ return buildRunItem(it.ex,it.sets,it.rmin,it.rmax,it.rest); }); } } sess={ treinoName:name, date:date, cur:0, items:items }; runPhase='ready'; stopRest(); $('runOverlay').classList.add('open'); renderRun(); }
var runPhase='ready';
function restFor(it){ return (it&&it.rest!=null)?it.rest:restDefault(); }
var rest={id:null,secs:0,tot:0,endsAt:0,label:''};
var restDoneTimer=null;
var work={id:null,secs:0,tot:0,endsAt:0};
var loadEdit=false;
function fitTimerRemaining(endsAt){ if(!endsAt) return 0; return Math.max(0, Math.ceil((endsAt-Date.now())/1000)); }
function fitAskNotif(){ if(!('Notification' in window)||Notification.permission!=='default') return; Notification.requestPermission().catch(function(){}); }
function fitClearRestNotif(){ if(restDoneTimer){ clearTimeout(restDoneTimer); restDoneTimer=null; } if('serviceWorker' in navigator){ navigator.serviceWorker.ready.then(function(reg){ return reg.getNotifications({ tag:'joelboard-fit-rest' }); }).then(function(list){ list.forEach(function(n){ n.close(); }); }).catch(function(){}); } }
function fitScheduleRestDoneNotif(){ fitClearRestNotif(); if(!rest.endsAt) return; var ms=Math.max(0, rest.endsAt-Date.now()); restDoneTimer=setTimeout(function(){ restDoneTimer=null; fitShowRestDoneNotif(); }, ms); }
function fitShowRestDoneNotif(){ if(!('Notification' in window)||Notification.permission!=='granted') return; var title='Descanso terminou'; var body=rest.label?('Próxima série — '+rest.label):'Hora da próxima série'; var opts={ body:body, tag:'joelboard-fit-rest', renotify:true, icon:'/icon-192.png' }; if('serviceWorker' in navigator){ navigator.serviceWorker.ready.then(function(reg){ return reg.showNotification(title, opts); }).catch(function(){ try{ new Notification(title, opts); }catch(e){} }); } else { try{ new Notification(title, opts); }catch(e){} } }
function fitUpdateMediaSession(title, artist){ if(!('mediaSession' in navigator)) return; try{ navigator.mediaSession.metadata=new MediaMetadata({ title:title, artist:artist||'Joelboard Fit', artwork:[{ src:'/icon-192.png', sizes:'192x192', type:'image/png' }] }); navigator.mediaSession.playbackState='playing'; }catch(e){} }
function fitClearMediaSession(){ if(!('mediaSession' in navigator)) return; try{ navigator.mediaSession.playbackState='none'; navigator.mediaSession.metadata=null; }catch(e){} }
function tickRest(){ if(!rest.endsAt) return false; rest.secs=fitTimerRemaining(rest.endsAt); if(rest.secs<=0){ rest.secs=0; var wasRest=runPhase==='rest'; stopRest(); beep(); if(wasRest) rNextSet(); else if(runPhase==='log') renderRun(); return true; } fitUpdateMediaSession(fmtT(rest.secs)+' — Descanso', rest.label); return false; }
function startRest(secs){ stopRest(); rest.secs=Number(secs)||0; rest.tot=rest.secs; if(rest.secs<=0) return; rest.endsAt=Date.now()+rest.secs*1000; rest.label=(sess&&sess.items[sess.cur])?sess.items[sess.cur].name:''; fitAskNotif(); fitScheduleRestDoneNotif(); fitUpdateMediaSession(fmtT(rest.secs)+' — Descanso', rest.label); rest.id=setInterval(function(){ if(tickRest()) return; if(runPhase==='log'){ var lt=$('logTimer'); if(lt) lt.textContent=(rest.secs>0?('Descanso · ⏱ '+fmtT(rest.secs)):'Registrar série'); } else { renderRun(); } },1000); }
function stopRest(){ if(rest.id){ clearInterval(rest.id); rest.id=null; } rest.secs=0; rest.tot=0; rest.endsAt=0; rest.label=''; fitClearRestNotif(); fitClearMediaSession(); }
function tickWork(){ if(!work.endsAt) return false; work.secs=fitTimerRemaining(work.endsAt); if(work.secs<=0){ work.secs=0; stopWork(); beep(); rConcluir(); return true; } fitUpdateMediaSession(fmtT(work.secs)+' — Segure', (sess&&sess.items[sess.cur])?sess.items[sess.cur].name:''); return false; }
function startWork(secs){ stopWork(); work.tot=Number(secs)||0; work.secs=work.tot; if(work.secs<=0) return; work.endsAt=Date.now()+work.secs*1000; fitUpdateMediaSession(fmtT(work.secs)+' — Segure', (sess&&sess.items[sess.cur])?sess.items[sess.cur].name:''); work.id=setInterval(function(){ if(tickWork()) return; renderRun(); },1000); }
function stopWork(){ if(work.id){ clearInterval(work.id); work.id=null; } work.secs=0; work.tot=0; work.endsAt=0; if(!rest.endsAt) fitClearMediaSession(); }
function rAdd30(){ if(!rest.endsAt) return; rest.endsAt+=30000; rest.tot+=30; rest.secs=fitTimerRemaining(rest.endsAt); fitScheduleRestDoneNotif(); renderRun(); }
function rSkip(){ stopRest(); rNextSet(); }
function firstPending(it){ for(var i=0;i<it.sets.length;i++){ if(!it.sets[i].done) return i; } return -1; }
function ringSvg(pct,color){ var C=2*Math.PI*112; return '<svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="none" style="stroke:var(--surface2)" stroke-width="8"/>'+(pct>0?('<circle cx="120" cy="120" r="112" fill="none" style="stroke:'+color+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C*(1-pct))+'"/>'):'')+'</svg>'; }
function fmtT(s){ var m=Math.floor(s/60),x=s%60; return m+':'+(x<10?'0':'')+x; }
function renderRun(){
  if(!sess) return;
  var stage=$('runStage'), btm=$('runBtm'), top=$('runTop');
  var total=sess.items.length;
  top.innerHTML='<button class="rx" onclick="rDiscard()">✕</button><span class="rc">'+esc(sess.treinoName)+(total?(' · '+Math.min(sess.cur+1,total)+'/'+total):'')+'</span><button class="rfin" onclick="rFinish()">Finalizar</button>';
  if(!total){ stage.innerHTML='<div class="rkick">Treino avulso</div><div class="rname">Monte na hora</div><div class="small" style="color:var(--muted);margin-top:14px">Adicione exercícios para começar.</div>'; btm.innerHTML='<button class="rcta start" onclick="openSessPick()">+ Adicionar exercício</button>'; return; }
  if(sess.cur>=total){ return rFinish(); }
  var it=sess.items[sess.cur]; var bw=(it.mode==='bw'); var timed=(it.mode==='time'); var fp=firstPending(it); var setNo=(fp<0?it.sets.length:fp+1);
  if(runPhase==='rest'){
    var pct=rest.tot?rest.secs/rest.tot:0; var nextTxt=(fp<0)?(sess.cur<total-1?'novo exercício':'fim do treino'):('série '+(fp+1));
    stage.innerHTML='<div class="rkick">Descanso</div><div class="rname">'+esc(it.name)+'</div><div class="disc2">'+ringSvg(pct,'var(--primary)')+'<div class="face"><div class="big">'+fmtT(rest.secs)+'</div><div class="small">próxima: '+nextTxt+'</div></div></div>';
    btm.innerHTML='<button class="rcta ghost" onclick="rAdd30()">+30s descanso</button><button class="rsub" onclick="rSkip()">Estou pronto →</button>';
    return;
  }
  if(runPhase==='log'){
    var st=it.sets[fp]||{}; var resting=(rest.endsAt&&rest.secs>0);
    var loadBox=(bw||timed)?'':'<div class="sbox grow" id="loadWrap">'+loadBoxInner()+'</div>';
    var repBox='<div class="sbox"><div class="lbl">'+(timed?'Segundos':'Reps')+'</div><div class="sctl"><button onclick="rBump(\'reps\',-1)">−</button><span class="v" id="vReps">'+(st.reps||0)+'</span><button onclick="rBump(\'reps\',1)">+</button></div></div>';
    stage.innerHTML='<div class="rkick" id="logTimer">'+(resting?('Descanso · ⏱ '+fmtT(rest.secs)):'Registrar série')+'</div><div class="rname">'+esc(it.name)+'</div><div class="small" style="color:var(--muted);margin:16px 0 12px">Série '+setNo+' — quanto fez?</div><div class="rsteps">'+repBox+loadBox+'</div>';
    btm.innerHTML='<button class="rcta save" onclick="rSalvar()">Salvar ✓</button>';
    return;
  }
  if(runPhase==='active'){
    if(timed){
      stage.innerHTML='<div class="rkick">Série '+setNo+' / '+it.sets.length+'</div><div class="rname">'+esc(it.name)+'</div><div class="pulse2"><div class="face"><div class="rgo" style="font-size:46px;font-variant-numeric:tabular-nums">'+fmtT(work.secs)+'</div><div class="small">segure! ⏱</div></div></div>';
      btm.innerHTML='<button class="rcta finish" onclick="rConcluir()">Concluir agora ✓</button>';
      return;
    }
    var sw=(it.sets[fp]||{}).peso; if(sw===''||sw==null){ sw=(it.sg&&it.sg.weight!==''&&it.sg.weight!=null)?it.sg.weight:null; }
    var goSub=it.rmin+'–'+it.rmax+' reps'+((!bw&&sw!=null)?(' · '+sw+' kg'):'');
    stage.innerHTML='<div class="rkick">Série '+setNo+' / '+it.sets.length+'</div><div class="rname">'+esc(it.name)+'</div><div class="pulse2"><div class="face"><div class="rgo">GO</div><div class="small">'+goSub+'</div></div></div>';
    btm.innerHTML='<button class="rcta finish" onclick="rConcluir()">Concluir série ✓</button>';
    return;
  }
  var st0=it.sets[fp>=0?fp:0]||{}; var loadStr=(!bw&&!timed&&st0.peso!==''&&st0.peso!=null)?(' · '+st0.peso+' kg'):''; var hint=progHint(it.sg||{}, it.rmax);
  var dots=''; for(var i=0;i<it.sets.length;i++){ dots+='<div class="rdot'+(it.sets[i].done?' done':(i===fp?' cur':''))+'"></div>'; }
  stage.innerHTML='<div class="rkick">Série '+setNo+' / '+it.sets.length+'</div><div class="rname">'+esc(it.name)+'</div>'+(bw?'<div class="rbwt">peso corporal</div>':(timed?'<div class="rbwt">por tempo</div>':''))+'<div class="rdots">'+dots+'</div><div class="disc2">'+ringSvg(0,'var(--primary)')+'<div class="face"><div class="big" style="font-size:38px">'+(timed?fmtT(Number(it.rmax)||Number(it.rmin)||0):(it.rmin+'–'+it.rmax))+'</div><div class="small">'+(timed?'segure':('reps'+loadStr))+'</div></div></div>'+(hint?('<div class="rhint">'+hint+'</div>'):'');
  btm.innerHTML='<button class="rcta start" onclick="rIniciar()">Iniciar série ▶</button><button class="rsub" onclick="openSessPick()">＋ exercício avulso</button>';
}
function rIniciar(){ runPhase='active'; var it=sess.items[sess.cur]; if(it&&it.mode==='time'){ startWork(Number(it.rmax)||Number(it.rmin)||30); } renderRun(); }
function rIsLast(it,fp){ return sess.cur>=sess.items.length-1 && fp>=it.sets.length-1; }
function rConcluir(){ loadEdit=false; var it=sess.items[sess.cur]; var fp=firstPending(it); if(fp<0) return; var st=it.sets[fp]; if(it.mode==='time'){ var held=(work.endsAt?Math.max(1,work.tot-fitTimerRemaining(work.endsAt)):work.tot)||Number(it.rmax)||Number(it.rmin)||0; stopWork(); st.reps=held; st.peso=0; } else { if(st.reps===''||st.reps==null) st.reps=it.rmin; if(st.peso===''||st.peso==null) st.peso=(it.sg&&it.sg.weight!==''&&it.sg.weight!=null)?it.sg.weight:0; } runPhase='log'; if(rIsLast(it,fp)){ stopRest(); } else { startRest(restFor(it)); } renderRun(); }
function rBump(f,d){ var it=sess.items[sess.cur]; var fp=firstPending(it); var st=it.sets[fp]; if(!st) return; if(f==='reps'){ st.reps=Math.max(0,(Number(st.reps)||0)+d); var v=$('vReps'); if(v) v.textContent=st.reps; } else { st.peso=Math.max(0,Math.round(((Number(st.peso)||0)+d)*10)/10); var v2=$('vLoad'); if(v2) v2.textContent=st.peso; } }
function parseNum(v){ var n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?0:Math.round(n*10)/10; }
function curRunSet(){ if(!sess) return null; var it=sess.items[sess.cur]; if(!it) return null; return it.sets[firstPending(it)]||null; }
function loadOpts(cur){ cur=Math.round((Number(cur)||0)*10)/10; var inc=incDefault()||2.5; var max=Math.max(120,cur+30); var seen={}, arr=[]; for(var w=0;w<=max+0.001;w=Math.round((w+inc)*100)/100){ if(!seen[w]){ seen[w]=1; arr.push(w); } } if(!seen[cur]) arr.push(cur); arr.sort(function(a,b){return a-b;}); return arr.map(function(w){ return '<div class="jb-dd-opt'+(w===cur?' is-sel':'')+'" onclick="rPickLoad('+w+')">'+w+' kg</div>'; }).join(''); }
function loadBoxInner(){ var st=curRunSet()||{}; var cur=Math.round((Number(st.peso)||0)*10)/10; var head='<div class="lbl">Carga kg</div>'; if(loadEdit){ return head+'<div class="loadpick"><input class="field wload" id="vLoadInput" type="text" inputmode="decimal" value="'+cur+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();rLoadConfirm();}"><button class="loadpen ok" onclick="rLoadConfirm()" title="Confirmar">✓</button></div>'; } return head+'<div class="loadpick"><div class="jb-dd up" style="flex:1;min-width:0"><button type="button" class="jb-dd-btn" onclick="JB.ddToggle(this)"><span>'+cur+' kg</span><span class="jb-dd-caret">▾</span></button><div class="jb-dd-menu">'+loadOpts(cur)+'</div></div><button class="loadpen" onclick="rLoadPencil()" title="Digitar valor">✎</button></div>'; }
function renderLoadBox(){ var el=$('loadWrap'); if(el) el.innerHTML=loadBoxInner(); }
function rPickLoad(v){ var st=curRunSet(); if(st) st.peso=parseNum(v); if(window.JB&&JB.ddClose) JB.ddClose(); renderLoadBox(); }
function rLoadPencil(){ loadEdit=true; renderLoadBox(); setTimeout(function(){ var i=$('vLoadInput'); if(i){ i.focus(); if(i.select) i.select(); } },30); }
function rLoadConfirm(){ var i=$('vLoadInput'); if(i){ var st=curRunSet(); if(st) st.peso=parseNum(i.value); } loadEdit=false; renderLoadBox(); }
function rSalvar(){ var it=sess.items[sess.cur]; var fp=firstPending(it); if(fp<0) return; var st=it.sets[fp]; st.done=true; for(var j=fp+1;j<it.sets.length;j++){ if(!it.sets[j].done){ if(st.peso!==''&&st.peso!=null) it.sets[j].peso=st.peso; if(st.reps!==''&&st.reps!=null) it.sets[j].reps=st.reps; } } if(rest.endsAt&&rest.secs>0){ runPhase='rest'; renderRun(); } else { rNextSet(); } }
function rNextSet(){ stopRest(); var it=sess.items[sess.cur]; if(firstPending(it)<0){ if(sess.cur<sess.items.length-1){ sess.cur++; runPhase='ready'; renderRun(); } else { rFinish(); } } else { runPhase='ready'; renderRun(); } }
function rClose(){ stopRest(); stopWork(); sess=null; $('runOverlay').classList.remove('open'); renderHoje(); }
function rCapturedCount(){ var n=0; if(sess) sess.items.forEach(function(it){ it.sets.forEach(function(st){ if(st.done&&((Number(st.reps)||0)>0||(Number(st.peso)||0)>0)) n++; }); }); return n; }
function rDiscard(){ if(!sess) return; stopWork(); if(rCapturedCount()===0){ rClose(); return; } JB.confirm('Descartar treino?','O que você registrou não será salvo.', rClose, { yes:'Descartar', no:'Continuar', danger:true }); }
function beep(){ try{ if(navigator.vibrate) navigator.vibrate([200,80,200]); }catch(e){} try{ var A=window.AudioContext||window.webkitAudioContext; if(!A) return; var a=new A(); var o=a.createOscillator(), g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=880; g.gain.value=0.08; o.start(); setTimeout(function(){ try{o.stop();a.close();}catch(e){} },300); }catch(e){} }
function openSwitch(){ var rows=(DATA.treinos||[]).map(function(r){ return '<div class="row" onclick="startFromSwitch(\''+r.id+'\')"><div><div class="rn">'+esc(r.name)+'</div><div class="rg">'+((r.items||[]).length)+' exercícios</div></div><span style="color:var(--primary)">▶</span></div>'; }).join(''); rows+='<div class="row" style="border-style:dashed" onclick="startFromSwitch(\'\')"><div class="rn">Treino avulso</div><span style="color:var(--primary)">▶</span></div>'; $('switchList').innerHTML=rows||'<div class="empty">Nenhum treino. Crie um na aba Treinos.</div>'; $('switchOverlay').classList.add('open'); }
function closeSwitch(){ $('switchOverlay').classList.remove('open'); }
function startFromSwitch(id){ closeSwitch(); startSession(id||undefined); }
function openSessPick(){ $('sessPickList').innerHTML=(DATA.exercicios||[]).slice().sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(x){ return '<div onclick="addSessEx(\''+x.id+'\')" style="padding:11px 12px;border-radius:8px;cursor:pointer;font-size:14px">'+esc(x.name)+'</div>'; }).join('')||'<div class="empty">Sem exercícios.</div>'; $('sessPickOverlay').classList.add('open'); }
function addSessEx(id){ sess.items.push(buildRunItem(id,3,8,12,null)); sess.cur=sess.items.length-1; runPhase='ready'; $('sessPickOverlay').classList.remove('open'); renderRun(); }
function rFinish(){
  if(!sess) return; stopWork();
  var c=rCapturedCount();
  if(c===0){ JB.confirm('Finalizar treino?','Nada foi registrado ainda. Sair sem salvar?', rClose, { yes:'Sair', no:'Continuar' }); return; }
  JB.confirm('Finalizar treino?','Salvar '+c+' série'+(c>1?'s':'')+' e encerrar o treino?', rSave, { yes:'Salvar', no:'Continuar' });
}
function rSave(){
  if(!sess) return;
  var sid=uuid(); var rows=[];
  sess.items.forEach(function(it){ var n=0; it.sets.forEach(function(st){ var reps=Number(st.reps)||0, peso=Number(st.peso)||0; if(st.done&&(reps>0||peso>0)){ n++; rows.push([sid, it.ex, n, reps, peso, uuid()]); } }); });
  if(!rows.length){ rClose(); return; }
  var date=sess.date, tname=sess.treinoName;
  DATA.sessoes.push({ id:sid, date:date, treino:tname, notas:'' });
  rows.forEach(function(r){ DATA.series.push({ id:r[5], sessaoId:sid, exId:r[1], serie:r[2], reps:r[3], peso:r[4] }); });
  rClose(); toast('✓ Treino salvo!');
  JB.api('POST', ssUrl('/values/Sessoes:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:[[date,tname,'',sid]] })
    .then(function(){ return JB.api('POST', ssUrl('/values/Series:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values:rows }); })
    .catch(function(){ toast('Erro ao salvar — recarregue'); });
}
var progEx=null;
function exHasData(id){ return (DATA.series||[]).some(function(x){return x.exId===id;}); }
function progData(exId){
  var dateOf={}; (DATA.sessoes||[]).forEach(function(s){dateOf[s.id]=s.date;});
  var bySes={}; (DATA.series||[]).filter(function(x){return x.exId===exId;}).forEach(function(x){ (bySes[x.sessaoId]=bySes[x.sessaoId]||[]).push(x); });
  return Object.keys(bySes).map(function(sid){ var sets=bySes[sid]; var top=0,e1=0,tr=0; sets.forEach(function(st){ if(st.peso>top)top=st.peso; if(st.reps>tr)tr=st.reps; var e=st.peso*(1+st.reps/30); if(e>e1)e1=e; }); return { date:dateOf[sid]||'', top:top, topReps:tr, e1rm:Math.round(e1), sets:sets.slice().sort(function(a,b){return a.serie-b.serie;}) }; }).filter(function(d){return d.date;}).sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
}
function progChart(d,fld){ fld=fld||'top';
  var pts=d.slice(-12); if(pts.length<2) return '';
  var W=320,H=120,pad=12; var ws=pts.map(function(p){return p[fld];}); var mx=Math.max.apply(null,ws), mn=Math.min.apply(null,ws); if(mx===mn)mx=mn+1;
  var step=(W-2*pad)/(pts.length-1);
  var co=pts.map(function(p,i){ return [pad+i*step, H-pad-((p[fld]-mn)/(mx-mn))*(H-2*pad)]; });
  var line=co.map(function(c,i){return (i?'L':'M')+c[0].toFixed(1)+' '+c[1].toFixed(1);}).join(' ');
  var dots=co.map(function(c){return '<circle cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="3" style="fill:var(--primary)"/>';}).join('');
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:6px"><div class="rg" style="margin-bottom:8px">Carga máx. por sessão ('+unit()+')</div><svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="none" style="height:118px;display:block"><path d="'+line+'" fill="none" style="stroke:var(--primary)" stroke-width="2" stroke-linejoin="round"/>'+dots+'</svg></div>';
}
function progHdr(name){ return '<div class="secbar"><div style="display:flex;align-items:center;gap:8px"><button class="lnk" onclick="backProg()">‹ Voltar</button><div class="rn">'+esc(name)+'</div></div></div>'; }
function openProg(id){ progEx=id; renderProgresso(); window.scrollTo(0,0); }
function backProg(){ progEx=null; renderProgresso(); }
function exTarget(exId){ var found=null,pname=''; (DATA.treinos||[]).forEach(function(r){ (r.items||[]).forEach(function(it){ if(it.ex===exId && !found){ found=it; pname=r.name; } }); }); if(found) return { sets:Number(found.sets)||3, rmin:Number(found.rmin)||8, rmax:Number(found.rmax)||12, rest:(found.rest!=null?found.rest:restDefault()), prog:pname }; return { sets:3, rmin:8, rmax:12, rest:restDefault(), prog:'' }; }
function modeLabel(m){ return m==='bw'?'Peso corporal':(m==='bwload'?'Carga + corporal':(m==='time'?'Por tempo':'Carga')); }
function progNextMsg(sg,t){ var u=unit(); switch(sg.kind){
  case 'up': return 'Você bateu o topo! Próxima sessão: <b>subir p/ '+sg.to+u+'</b>.';
  case 'hold': return 'Agora: <b>'+sg.from+u+'</b> — busque <b>'+t.rmax+' reps</b> em todas as séries. Ao completar → <b>'+(Math.round((sg.from+incDefault())*100)/100)+u+'</b>.';
  case 'stall': return 'Travado há 3 sessões em '+sg.from+u+'. Sugestão: <b>deload p/ '+sg.to+u+'</b> ou variação mais difícil.';
  case 'bw-reps': return 'Agora: subir reps até <b>'+t.rmax+'</b> em todas as séries. Ao completar, considere <b>+1 série</b> na próxima sessão.';
  case 'bw-set': return 'Você dominou! Próxima sessão: considere <b>'+(sg.nextSets!=null?sg.nextSets:(t.sets+1))+' séries</b> (ajuste no treino se quiser).';
  case 'bw-rest': return 'Você dominou! Próxima sessão: <b>reduza o descanso p/ '+sg.rest+'s</b>.';
  case 'bw-harder': return 'Você dominou! Próximo: <b>'+esc(sg.harder||'uma variação mais difícil')+'</b>.';
  default: return 'Registre uma sessão para ver a sugestão.';
} }
function progPreviewHtml(exId){
  var t=exTarget(exId), mode=exMode(exId), sg=suggestProg(exId,t), u=unit();
  var h=progData(exId), m=h.length?sessMetrics(h[h.length-1]):null;
  var pct=m?Math.min(100,Math.round((m.repsMin/Math.max(t.rmax,1))*100)):0;
  var barCls=(m&&m.repsMin>=t.rmax)?'in':'under';
  var bar=m?('<div class="voltrack" style="margin-top:10px"><div class="volbar '+barCls+'" style="width:'+pct+'%"></div></div><div class="ppvstat">Última: '+m.repsMin+'/'+t.rmax+' reps'+(mode!=='bw'?(' @ '+m.W+u):'')+(m.nSets?(' · '+m.nSets+' séries'):'')+'</div>'):'<div class="ppvstat">Sem sessões ainda.</div>';
  var ladder='';
  if(mode==='bw'){ var stages=['+Reps','+Série','−Descanso','Variação']; var cur=sg.kind==='bw-set'?1:sg.kind==='bw-rest'?2:sg.kind==='bw-harder'?3:0; ladder='<div class="ppvlad">'+stages.map(function(st,i){ return '<div class="ppvstep'+(i===cur?' on':'')+(i<cur?' done':'')+'">'+st+'</div>'; }).join('')+'</div>'; }
  return '<div class="ppv"><div class="ppvh"><span class="ppvt">Próxima progressão</span><span class="modebadge">'+modeLabel(mode)+'</span></div>'
    +'<div class="ppvtarget">Alvo: '+t.sets+' × '+t.rmin+'–'+t.rmax+' reps · ⏱ '+t.rest+'s'+(t.prog?(' · '+esc(t.prog)):'')+'</div>'
    +bar+ladder
    +'<div class="ppvnextlbl">Próximo passo</div><div class="ppvnext">'+progNextMsg(sg,t)+'</div></div>';
}
function renderProgresso(){
  var el=$('prog'); if(!el) return;
  if(progEx){
    var name=exName(progEx); var d=progData(progEx);
    if(!d.length){ el.innerHTML=progHdr(name)+JB.emptyState({ icon:'📈', title:'Sem registros ainda', hint:'Complete treinos na aba Hoje para ver evolução.' }); return; }
    var mode=exMode(progEx);
    var prTop=0,prE=0,prReps=0; d.forEach(function(x){ if(x.top>prTop)prTop=x.top; if(x.e1rm>prE)prE=x.e1rm; x.sets.forEach(function(s){ if((Number(s.reps)||0)>prReps) prReps=Number(s.reps)||0; }); });
    var cards = (mode==='time') ? ('<div class="prg"><div class="prc"><div class="prl">Melhor tempo</div><div class="prv">'+fmtT(prReps)+'</div></div><div class="prc"><div class="prl">Sessões</div><div class="prv">'+d.length+'</div></div></div>') : (mode==='bw') ? ('<div class="prg"><div class="prc"><div class="prl">Melhor série</div><div class="prv">'+prReps+' reps</div></div><div class="prc"><div class="prl">Sessões</div><div class="prv">'+d.length+'</div></div></div>') : ('<div class="prg"><div class="prc"><div class="prl">Melhor carga</div><div class="prv">'+prTop+' '+unit()+'</div></div><div class="prc"><div class="prl">1RM estim.</div><div class="prv">'+prE+' '+unit()+'</div></div><div class="prc"><div class="prl">Sessões</div><div class="prv">'+d.length+'</div></div></div>');
    var hist=d.slice().reverse().map(function(x){ return '<div class="row" style="cursor:default"><div><div class="rn">'+x.date+'</div><div class="rg">'+x.sets.map(function(s){return mode==='time'?fmtT(s.reps):(mode==='bw'?(''+s.reps):(s.reps+'×'+s.peso));}).join(' · ')+'</div></div><div style="font-weight:800;color:var(--primary)">'+(mode==='time'?fmtT(Math.max.apply(null,x.sets.map(function(s){return Number(s.reps)||0;}))):(mode==='bw'?(Math.max.apply(null,x.sets.map(function(s){return Number(s.reps)||0;}))+' reps'):(x.top+' '+unit())))+'</div></div>'; }).join('');
    el.innerHTML=progHdr(name)+cards+(mode==='time'?'':progPreviewHtml(progEx))+(mode==='time'?progChart(d,'topReps'):(mode==='bw'?'':progChart(d)))+'<div class="sect" style="margin:22px 0 10px">Histórico</div>'+hist;
    return;
  }
  var volSec='<div class="secbar"><div class="sect">Volume da semana</div><span class="rg" style="font-size:11px">séries / grupo</span></div><div class="volwrap">'+volPanelHtml()+'</div>';
  var exs=(DATA.exercicios||[]).filter(function(x){return exHasData(x.id);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  var exSec='<div class="secbar" style="margin-top:24px"><div class="sect">Progresso por exercício</div></div>'+(exs.length?exs.map(function(x){ return '<div class="row" onclick="openProg(\''+x.id+'\')"><div class="rn">'+esc(x.name)+'</div><span style="color:var(--muted)">›</span></div>'; }).join(''):JB.emptyState({ icon:'📊', title:'Nenhum histórico', hint:'Registre treinos para acompanhar carga e reps.' }));
  el.innerHTML=weightSecHtml()+volSec+exSec;
}
function fillGroupSelect(val){ var sel=$('exGroup'); var tags=(DATA.config&&DATA.config.tags)||DEFAULT_TAGS; var opts='<option value="">— sem grupo —</option>'; if(val && tags.indexOf(val)<0) opts+='<option value="'+esc(val)+'">'+esc(val)+'</option>'; opts+=tags.map(function(t){return '<option value="'+esc(t)+'">'+esc(t)+'</option>';}).join(''); sel.innerHTML=opts; sel.value=val||''; }
function openSettings(tab){ renderSettings(); switchSet(tab||'geral'); $('setOverlay').classList.add('open'); }
function closeSettings(){ $('setOverlay').classList.remove('open'); }
function renderSettings(){
  var u=unit();
  JB.renderSkinPicker('fit', $('setSkins'));
  $('setUnit').innerHTML = '<div class="unit-seg" role="group" aria-label="Unidade de peso">'
    + ['kg', 'lb'].map(function (x) {
      return '<button type="button" class="unit-seg-btn' + (x === u ? ' on' : '') + '" onclick="setUnitS(\'' + x + '\')">' + x + '</button>';
    }).join('')
    + '</div><div class="unit-seg-hint">Peso corporal e cargas nos treinos</div>';
  var tags=(DATA.config&&DATA.config.tags)||DEFAULT_TAGS;
  $('setTags').innerHTML=tags.map(function(t,i){ return '<span class="tagchip">'+esc(t)+'<span class="tx" onclick="removeTag('+i+')">✕</span></span>'; }).join('')||'<div class="rg">Nenhum grupo.</div>';
  if($('setRest')) $('setRest').value=restDefault(); if($('setInc')) $('setInc').value=incDefault();
  renderSched(); renderVolGoals();
  if(typeof renderMacroSettingsPanel==='function') renderMacroSettingsPanel();
}
function switchSet(name){ document.querySelectorAll('#setOverlay .set-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-st')===name); }); document.querySelectorAll('#setOverlay .set-pane').forEach(function(p){ var on=p.getAttribute('data-pane')===name; p.style.display=on?'':'none'; p.classList.toggle('active', on); }); if(name==='macros'&&typeof initMacroMealsSort==='function') initMacroMealsSort(); }
function loadDefaults(){ var have={}; (DATA.exercicios||[]).forEach(function(e){ have[(e.name||'').toLowerCase()]=1; }); var add=STARTER.filter(function(e){ return !have[e[0].toLowerCase()]; }); if(!add.length){ toast('Biblioteca já está completa ✓'); return; } var rows=add.map(function(e){ var id=uuid(); DATA.exercicios.push({id:id,name:e[0],group:e[1]}); return [e[0],e[1],id]; }); renderExercicios(); renderSettings(); toast('+'+add.length+' exercícios adicionados'); JB.api('POST', ssUrl('/values/'+encodeURIComponent('Exercicios')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {values:rows}).catch(function(){ toast('Erro ao salvar — recarregue'); }); }
function setUnitS(u){ DATA.config=DATA.config||{}; DATA.config.unit=u; saveConfig('unit',u); renderSettings(); renderHoje(); }
function persistTags(){ saveConfig('tags', JSON.stringify(DATA.config.tags||[])); }
function addTag(){ var v=($('newTag').value||'').trim(); if(!v) return; DATA.config=DATA.config||{}; if(!DATA.config.tags) DATA.config.tags=DEFAULT_TAGS.slice(); if(DATA.config.tags.indexOf(v)<0) DATA.config.tags.push(v); $('newTag').value=''; persistTags(); renderSettings(); }
function removeTag(i){ if(!DATA.config||!DATA.config.tags) return; DATA.config.tags.splice(i,1); persistTags(); renderSettings(); }
function deleteSession(id){
  fitConfirm('Excluir treino?','Remove este treino e suas séries do histórico.', function(){ doDeleteSession(id); });
}
function doDeleteSession(id){
  DATA.sessoes=(DATA.sessoes||[]).filter(function(s){return s.id!==id;});
  DATA.series=(DATA.series||[]).filter(function(x){return x.sessaoId!==id;});
  renderHoje(); if(progEx) renderProgresso(); toast('✓ Treino excluído');
  fitFindRow('Sessoes',3,id).then(function(row){ if(row<0) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:[{ deleteDimension:{ range:{ sheetId:fitGrid['Sessoes'], dimension:'ROWS', startIndex:row-1, endIndex:row } } }] }); })
    .then(function(){ return JB.api('GET', ssUrl('/values/Series?valueRenderOption=UNFORMATTED_VALUE')); })
    .then(function(res){ var v=res.values||[]; var reqs=[]; for(var i=v.length-1;i>=1;i--){ if(String((v[i]||[])[0])===String(id)) reqs.push({ deleteDimension:{ range:{ sheetId:fitGrid['Series'], dimension:'ROWS', startIndex:i, endIndex:i+1 } } }); } if(!reqs.length) return; return JB.api('POST', ssUrl(':batchUpdate'), { requests:reqs }); })
    .catch(function(){ toast('Erro ao excluir — recarregue'); });
}
function normItems(arr){ return (arr||[]).map(function(it){ if(typeof it==='string') return {ex:it,sets:3,rmin:8,rmax:12,rest:null}; return {ex:it.ex,sets:Number(it.sets)||3,rmin:Number(it.rmin)||8,rmax:Number(it.rmax)||12,rest:(it.rest!=null&&it.rest!==''?Number(it.rest):null)}; }); }
function restDefault(){ return Number(DATA.config&&DATA.config.rest)||90; }
function incDefault(){ return Number(DATA.config&&DATA.config.inc)||2.5; }
/* ---- weekly volume (sets per muscle group, Sunday–Saturday) ---- */
function weekBounds(){ var d=new Date(); d.setHours(12,0,0,0); var st=new Date(d); st.setDate(d.getDate()-d.getDay()); var en=new Date(st); en.setDate(st.getDate()+6); return [JB.ymd(st),JB.ymd(en)]; }
function weeklyVolume(){ var b=weekBounds(); var dateOf={}; (DATA.sessoes||[]).forEach(function(s){ dateOf[s.id]=s.date; }); var grpOf={}; (DATA.exercicios||[]).forEach(function(e){ grpOf[e.id]=e.group||'Outro'; }); var vol={}; (DATA.series||[]).forEach(function(x){ var d=dateOf[x.sessaoId]; if(!d||d<b[0]||d>b[1]) return; var g=grpOf[x.exId]||'Outro'; vol[g]=(vol[g]||0)+1; }); return vol; }
function volGoals(){ return (DATA.config&&DATA.config.volgoals)||{}; }
function volGoal(g){ var v=volGoals()[g]; if(v&&v.length===2&&(Number(v[0])||Number(v[1]))) return [Number(v[0])||0,Number(v[1])||0]; return [10,20]; }
function volStatus(n,g){ var mm=volGoal(g); if(n<mm[0]) return 'under'; if(n>mm[1]) return 'over'; return 'in'; }
function volPanelHtml(){ var vol=weeklyVolume(); var tags=((DATA.config&&DATA.config.tags)||DEFAULT_TAGS).slice(); Object.keys(vol).forEach(function(g){ if(tags.indexOf(g)<0) tags.push(g); }); var rows=tags.filter(function(g){ return (vol[g]||0)>0; }).sort(function(a,b){ return (vol[b]||0)-(vol[a]||0); }); if(!rows.length) return '<div class="rg" style="padding:2px 0">Nenhuma série registrada nesta semana ainda.</div>'; return rows.map(function(g){ var n=vol[g]||0; var mm=volGoal(g); var st=volStatus(n,g); var pct=Math.min(100,Math.round(n/Math.max(mm[1],1)*100)); return '<div class="volrow"><div class="volhd"><span class="volg">'+esc(g)+'</span><span class="voln '+st+'">'+n+' <span class="volt">/ '+mm[0]+'–'+mm[1]+'</span></span></div><div class="voltrack"><div class="volbar '+st+'" style="width:'+pct+'%"></div></div></div>'; }).join(''); }
function volNudgeHtml(){ var vol=weeklyVolume(); var groups=Object.keys(vol).filter(function(g){return vol[g]>0;}); if(!groups.length) return ''; var hit=groups.filter(function(g){ return vol[g]>=volGoal(g)[0]; }).length; var under=groups.filter(function(g){ return vol[g]<volGoal(g)[0]; }).sort(function(a,b){return vol[a]-vol[b];}); var sub=under.length ? ('Faltam séries: '+under.slice(0,3).map(function(g){ return esc(g)+' '+vol[g]+'/'+volGoal(g)[0]; }).join(' · ')) : 'Todos os grupos no mínimo da meta 💪'; return '<div class="volnudge" onclick="tab(\'progresso\')"><div class="vnh"><span>Volume da semana</span><span class="vnc">'+hit+'/'+groups.length+' no alvo ›</span></div><div class="vns">'+sub+'</div></div>'; }
function renderVolGoals(){ if(!$('setVol')) return; var tags=(DATA.config&&DATA.config.tags)||DEFAULT_TAGS; $('setVol').innerHTML='<div class="rg" style="font-size:11px;margin-bottom:8px">Padrão 10–20 séries/semana. Ajuste por grupo se quiser.</div>'+tags.map(function(g,i){ var mm=volGoal(g); return '<div class="volgrow"><span class="volgname">'+esc(g)+'</span><input class="field vmini" type="number" inputmode="numeric" value="'+mm[0]+'" onchange="setVolGoal('+i+',0,this.value)"><span class="vdash">–</span><input class="field vmini" type="number" inputmode="numeric" value="'+mm[1]+'" onchange="setVolGoal('+i+',1,this.value)"></div>'; }).join(''); }
function setVolGoal(i,which,val){ var tags=(DATA.config&&DATA.config.tags)||DEFAULT_TAGS; var g=tags[i]; if(g==null) return; DATA.config=DATA.config||{}; var vg=DATA.config.volgoals||{}; var cur=vg[g]||[10,20]; cur=[Number(cur[0])||10,Number(cur[1])||20]; var n=Number(val); if(!(n>=0)) n=(which?20:10); cur[which]=n; if(cur[1]<cur[0]) cur[1]=cur[0]; vg[g]=cur; DATA.config.volgoals=vg; saveConfig('volgoals', JSON.stringify(vg)); }
function saveDefault(k,v){ DATA.config=DATA.config||{}; var n=Number(v); if(!n||n<0) n=(k==='rest'?90:2.5); DATA.config[k]=n; saveConfig(k,String(n)); }
function setTarget(ex,f,v){ var it=(trSel||[]).find(function(i){return i.ex===ex;}); if(!it) return; if(f==='rest'){ it.rest=(v===''?null:Number(v)); } else { it[f]=Number(v)||0; } }
var WD=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function wdName(i){ return WD[i]||''; }
function schedFor(wd){ var s=(DATA.config&&DATA.config.schedule)||{}; return s[wd]||s[String(wd)]||''; }
function setSchedule(wd,rid){ DATA.config=DATA.config||{}; DATA.config.schedule=DATA.config.schedule||{}; if(rid) DATA.config.schedule[wd]=rid; else delete DATA.config.schedule[wd]; saveConfig('schedule', JSON.stringify(DATA.config.schedule)); renderHoje(); }
function renderSched(){ if(!$('setSched')) return; var sc=(DATA.config&&DATA.config.schedule)||{}; var sh=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']; $('setSched').innerHTML=sh.map(function(d,i){ var cur=sc[i]||sc[String(i)]||''; var opts='<option value="">Descanso</option>'+(DATA.treinos||[]).map(function(r){ return '<option value="'+r.id+'"'+(cur===r.id?' selected':'')+'>'+esc(r.name)+'</option>'; }).join(''); return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span style="width:32px;color:var(--muted);font-size:13px;font-weight:700">'+d+'</span><select class="field" style="flex:1" onchange="setSchedule('+i+',this.value)">'+opts+'</select></div>'; }).join(''); }
function fitConfirm(title,msg,onYes){ JB.confirm(title, msg, onYes); }
var _fbooted=false;
var FIT_TOUR=[
  { title:'Bem-vindo ao Fit 💪', body:'Um tour rápido pelas funções.' },
  { go:function(){ tab('hoje'); }, sel:'#hoje', title:'Hoje', body:'Seu treino do dia — comece o treino e registre as séries por aqui.' },
  { go:function(){ tab('treinos'); }, sel:'#p-treinos .btn', title:'Treinos', body:'Monte seus treinos (splits) com exercícios, séries e descanso.' },
  { go:function(){ tab('exercicios'); }, sel:'#p-exercicios .btn', title:'Exercícios', body:'Sua biblioteca — carga, peso corporal ou por tempo (ex.: prancha).' },
  { go:function(){ tab('progresso'); }, sel:'#p-progresso', title:'Progresso', body:'Evolução de carga, peso corporal e tempo por exercício.' },
  { go:function(){ tab('macros'); }, sel:'#p-macros', title:'Macros', body:'Contador de macros por refeição — busque alimentos, ajuste gramas e acompanhe metas diárias.' },
  { sel:'.acct .lnk', title:'Ajustes', body:'Tema, programa e este tutorial ficam aqui.' }
];
function verTutorial(){ closeSettings(); setTimeout(function(){ JB.tour('fit', FIT_TOUR); }, 250); }
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState!=='visible') return;
  if(rest.endsAt){
    if(tickRest()){ if(runPhase==='log') renderRun(); return; }
    if(runPhase==='rest'||(runPhase==='log'&&rest.secs>0)) renderRun();
  }
  if(work.endsAt){
    if(tickWork()) return;
    renderRun();
  }
});
JB.applySkin('fit');
startAuth();
