/* Finance — Sheets API data layer. Loads after joelboard.js + finance-math.js. */
/* ===== JB-DATA-LAYER ===== */
/* ===================== Joelboard web data layer (Sheets API) ===================== */
var JB_CLIENT_ID = '49262188240-l70ka2666t315gb2gmsvu357f2h7769i.apps.googleusercontent.com';
var JB_SCOPES = 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
var JB_LS_SHEET = 'joelboard_sheet_id';
var JB_TABS = ['Transactions','Budget','Goals','Recurring','Allocations','Bundles','Categories','Debts','WorkLog','Payments','Settings'];
var jbToken = '', jbTokenClient = null, jbEmail = '', jbGrid = {}, jbAuthDone = false;
function jbLoadingHtml(h){ var el = document.getElementById('loading'); if (el){ el.style.display='block'; el.innerHTML = h; } }
/* ----- write layer: Sheets API ops (JB_IMPL + jbRun) ----- */
function jbUuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){ var r=Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8); return v.toString(16); }); }
function jbColLetter(n){ return FinMath.colLetter(n); }
function jbReq(method,url,body){ return JB.api(method,url,body); }
function jbSid(){ return JB.getSheetId('finance'); }
function jbValuesUrl(a1){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+jbSid()+'/values/'+encodeURIComponent(a1); }
function jbBatchUrl(){ return 'https://sheets.googleapis.com/v4/spreadsheets/'+jbSid()+':batchUpdate'; }
function jbAppend(tab,row){ return jbReq('POST', jbValuesUrl(tab)+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { values:[row] }); }
function jbPutRange(a1,values){ return jbReq('PUT', jbValuesUrl(a1)+'?valueInputOption=RAW', { values:values }); }
function jbGetVals(tab){ return jbApi(jbValuesUrl(tab)+'?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER').then(function(res){ return res.values||[]; }); }
function jbDeleteRow(tab,rowNum){ return jbReq('POST', jbBatchUrl(), { requests:[{ deleteDimension:{ range:{ sheetId:jbGrid[tab], dimension:'ROWS', startIndex:rowNum-1, endIndex:rowNum } } }] }); }
function jbFindRow(tab,idColIdx,id){ return jbGetVals(tab).then(function(vals){ for(var i=1;i<vals.length;i++){ if(String((vals[i]||[])[idColIdx])===String(id)) return i+1; } return -1; }); }
function jbCsvCell(v){ return FinMath.csvCell(v); }
function jbCascade(tab,colIdx,oldName,newName){ return jbGetVals(tab).then(function(vals){ var data=[]; for(var i=1;i<vals.length;i++){ if(String((vals[i]||[])[colIdx])===oldName) data.push({ range:tab+'!'+jbColLetter(colIdx)+(i+1), values:[[newName]] }); } if(!data.length) return {}; return jbReq('POST','https://sheets.googleapis.com/v4/spreadsheets/'+jbSid()+'/values:batchUpdate',{ valueInputOption:'RAW', data:data }); }); }

var JB_TAB = { transactions:'Transactions', budget:'Budget', goals:'Goals', recurring:'Recurring', allocations:'Allocations', bundles:'Bundles', categories:'Categories', debts:'Debts' };
var JB_DATACOLS = { transactions:6, budget:2, goals:5, recurring:7, allocations:4, bundles:3, categories:2, debts:8 };
var JB_COLS = {
  transactions: function(d,id){ return [d.date, d.description, d.category, parseFloat(d.amount), d.type, (d.pending===true||d.pending==='true'), id]; },
  budget: function(d,id){ return [d.category, parseFloat(d.budget), id]; },
  goals: function(d,id){ return [d.name, parseFloat(d.target), parseFloat(d.current)||0, d.deadline||'', d.color||'#818cf8', id]; },
  recurring: function(d,id){ var c=parseInt(d.installments,10), has=c&&c>0; return [d.name, parseFloat(d.amount), parseInt(d.dueDay,10)||1, d.frequency||'Monthly', d.category, has?c:'', d.startMonth||'', id]; },
  allocations: function(d,id){ var c=parseInt(d.installments,10), has=c&&c>0; return [d.goalId, parseFloat(d.amount), has?c:'', d.startMonth, id]; },
  bundles: function(d,id){ return [d.name, d.payee||'', JSON.stringify(d.items||[]), id]; },
  categories: function(d,id){ return [d.name, d.color||'', id]; },
  debts: function(d,id){ return [String(d.splitId||''), Number(d.created)||Date.now(), d.title||'', d.person||'', parseFloat(d.amount)||0, (d.paid===true||d.paid==='true'), (d.paidDate?Number(d.paidDate):''), (d.mine===true||d.mine==='true'), id]; }
};

var JB_IMPL = {
  addRecord: function(type,data){ var id=jbUuid(); return jbAppend(JB_TAB[type], JB_COLS[type](data,id)).then(function(){ return { success:true, id:id }; }); },
  updateRecord: function(type,id,data){ var arr=JB_COLS[type](data,id); return jbFindRow(JB_TAB[type], JB_DATACOLS[type], id).then(function(row){ if(row<0) throw new Error('Registro não encontrado — atualize.'); return jbPutRange(JB_TAB[type]+'!A'+row+':'+jbColLetter(arr.length-1)+row, [arr]); }).then(function(){ return {success:true}; }); },
  deleteRecord: function(type,id){ return jbFindRow(JB_TAB[type], JB_DATACOLS[type], id).then(function(row){ if(row<0) throw new Error('Registro não encontrado.'); return jbDeleteRow(JB_TAB[type], row); }).then(function(){ return {success:true}; }); },
  addSplit: function(rows){ var ch=Promise.resolve(); (rows||[]).forEach(function(d){ if(!d||!d.person) return; ch=ch.then(function(){ return jbAppend('Debts', JB_COLS.debts(d, d.id||jbUuid())); }); }); return ch.then(function(){ return {success:true}; }); },
  setDebtPaid: function(id,paid,paidDate){ return jbFindRow('Debts',8,id).then(function(row){ if(row<0) throw new Error('não encontrado'); var on=(paid===true||paid==='true'); return jbPutRange('Debts!F'+row+':G'+row, [[on, on?(Number(paidDate)||Date.now()):'']]); }).then(function(){ return {success:true}; }); },
  deleteSplit: function(splitId){ return jbGetVals('Debts').then(function(vals){ var reqs=[]; for(var i=vals.length-1;i>=1;i--){ if(String((vals[i]||[])[0])===String(splitId)) reqs.push({ deleteDimension:{ range:{ sheetId:jbGrid['Debts'], dimension:'ROWS', startIndex:i, endIndex:i+1 } } }); } if(!reqs.length) return {}; return jbReq('POST', jbBatchUrl(), { requests:reqs }); }).then(function(){ return {success:true}; }); },
  setWorkDay: function(date,worked,hours,otHours){ var arr=[date,(worked===true||worked==='true'),Number(hours),Number(otHours)||0]; return jbGetVals('WorkLog').then(function(vals){ for(var i=1;i<vals.length;i++){ var dv=(vals[i]||[])[0]; var ds=(typeof dv==='number')?jbDate(dv):String(dv); if(ds===date) return jbPutRange('WorkLog!A'+(i+1)+':D'+(i+1), [arr]); } return jbAppend('WorkLog', arr); }).then(function(){ return {success:true}; }); },
  clearWorkDay: function(date){ return jbGetVals('WorkLog').then(function(vals){ for(var i=1;i<vals.length;i++){ var dv=(vals[i]||[])[0]; var ds=(typeof dv==='number')?jbDate(dv):String(dv); if(ds===date) return jbDeleteRow('WorkLog', i+1); } return {}; }).then(function(){ return {success:true}; }); },
  setPaid: function(month,type,itemId,paid,actualAmount,paidDate){ var on=(paid===true||paid==='true'); var amt=(actualAmount===undefined||actualAmount===null||actualAmount==='')?'':Number(actualAmount); var pd=(paidDate===undefined||paidDate===null)?'':String(paidDate); return jbGetVals('Payments').then(function(vals){ var row=-1; for(var i=1;i<vals.length;i++){ var r=vals[i]||[]; var m=String(r[0]).replace(/^m/,'').slice(0,7); if(m===month && String(r[1])===String(type) && String(r[2])===String(itemId)){ row=i+1; break; } } if(on){ var rr=['m'+month,type,String(itemId),true,amt,pd]; return row<0 ? jbAppend('Payments',rr) : jbPutRange('Payments!A'+row+':F'+row,[rr]); } return row>0 ? jbDeleteRow('Payments',row) : {}; }).then(function(){ return {success:true}; }); },
  setBillSkip: function(month,id){ return jbAppend('Payments', ['m'+month,'skip',String(id),true,'','']).then(function(){ return {success:true}; }); },
  setBillOverride: function(month,id,amount){
    var fam=['bill','recurring','installment'];
    return jbGetVals('Payments').then(function(vals){
      var row=-1, wasPaid=false, paidDate='';
      for(var i=1;i<vals.length;i++){
        var r=vals[i]||[];
        var m=String(r[0]).replace(/^m/,'').slice(0,7);
        if(m===month && fam.indexOf(String(r[1]))>-1 && String(r[2])===String(id)){
          row=i+1; wasPaid=jbBool(r[3]); paidDate=r[5];
          break;
        }
      }
      var rr=['m'+month,'bill',String(id), wasPaid?true:'', Number(amount), wasPaid?(typeof paidDate==='number'?jbDate(paidDate):(paidDate||'')):''];
      return row<0 ? jbAppend('Payments', rr) : jbPutRange('Payments!A'+row+':F'+row, [rr]);
    }).then(function(){ return {success:true}; });
  },
  setAllocOverride: function(month,id,amount){
    return jbGetVals('Payments').then(function(vals){
      var row=-1, wasPaid=false, paidDate='';
      for(var i=1;i<vals.length;i++){
        var r=vals[i]||[];
        var m=String(r[0]).replace(/^m/,'').slice(0,7);
        if(m===month && String(r[1])==='allocation' && String(r[2])===String(id)){
          row=i+1; wasPaid=jbBool(r[3]); paidDate=r[5];
          break;
        }
      }
      var rr=['m'+month,'allocation',String(id), wasPaid?true:'', Number(amount), wasPaid?(typeof paidDate==='number'?jbDate(paidDate):(paidDate||'')):''];
      return row<0 ? jbAppend('Payments', rr) : jbPutRange('Payments!A'+row+':F'+row, [rr]);
    }).then(function(){ return {success:true}; });
  },
  saveSetting: function(key,value){ return jbGetVals('Settings').then(function(vals){ for(var i=1;i<vals.length;i++){ if(String((vals[i]||[])[0])===String(key)) return jbPutRange('Settings!B'+(i+1), [[value]]); } return jbAppend('Settings', [key,value]); }).then(function(){ return {success:true}; }); },
  saveProfile: function(data){ var ch=Promise.resolve(); Object.keys(data).forEach(function(k){ var v=data[k]; if(k==='off_weekdays' && Object.prototype.toString.call(v)==='[object Array]') v=v.map(function(d){ return 'd'+d; }).join(','); ch=ch.then(function(){ return JB_IMPL.saveSetting(k,v); }); }); return ch.then(function(){ return {success:true}; }); },
  savingsMove: function(newBase,tx){ return JB_IMPL.saveSetting('savings_balance',newBase).then(function(){ return JB_IMPL.addRecord('transactions',tx); }).then(function(){ return {success:true}; }); },
  logMonthlySalary: function(targetMonth,data){ return jbGetVals('Transactions').then(function(vals){ var reqs=[]; for(var i=vals.length-1;i>=1;i--){ var r=vals[i]||[]; var dv=r[0]; var ym=(typeof dv==='number')?jbDate(dv).slice(0,7):String(dv).slice(0,7); if(String(r[4])==='Income' && String(r[2])===String(data.category) && ym===targetMonth) reqs.push({ deleteDimension:{ range:{ sheetId:jbGrid['Transactions'], dimension:'ROWS', startIndex:i, endIndex:i+1 } } }); } return reqs.length ? jbReq('POST', jbBatchUrl(), { requests:reqs }) : {}; }).then(function(){ var id=jbUuid(); return jbAppend('Transactions', JB_COLS.transactions(data,id)).then(function(){ return {success:true,id:id}; }); }); },
  importTransactions: function(rows){ var ch=Promise.resolve(); var n=0; (rows||[]).forEach(function(d){ if(!d||!d.date||!(Number(d.amount)>0)) return; n++; ch=ch.then(function(){ return jbAppend('Transactions', JB_COLS.transactions(d, jbUuid())); }); }); return ch.then(function(){ return {success:true,count:n}; }); },
  renameCategory: function(id,newName){ newName=String(newName||'').trim(); if(!newName) return Promise.reject(new Error('Nome não pode ser vazio.')); var oldName=''; return jbGetVals('Categories').then(function(vals){ var row=-1, names=[]; for(var i=1;i<vals.length;i++){ var r=vals[i]||[]; names.push(String(r[0])); if(String(r[2])===String(id)){ row=i+1; oldName=String(r[0]); } } if(row<0) throw new Error('Categoria não encontrada.'); if(oldName===newName) return 'skip'; if(names.indexOf(newName)>-1) throw new Error('Já existe uma categoria com esse nome.'); return jbPutRange('Categories!A'+row, [[newName]]).then(function(){ return 'go'; }); }).then(function(st){ if(st==='skip') return {success:true}; return jbCascade('Transactions',2,oldName,newName).then(function(){ return jbCascade('Recurring',4,oldName,newName); }).then(function(){ return jbCascade('Budget',0,oldName,newName); }).then(function(){ return {success:true}; }); }); },
  exportBackup: function(){ var tabs=['Transactions','Budget','Goals','Recurring','Allocations','Bundles','Categories','Debts','WorkLog','Payments','Settings']; var out=[]; var ch=Promise.resolve(); tabs.forEach(function(tb){ ch=ch.then(function(){ return jbGetVals(tb).then(function(vals){ if(!vals.length) return; out.push('### '+tb); vals.forEach(function(row){ out.push((row||[]).map(jbCsvCell).join(',')); }); out.push(''); }).catch(function(){}); }); }); return ch.then(function(){ var csv='﻿'+out.join('\r\n'); var url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); return { url:url, name:'joelboard-backup-'+new Date().toISOString().slice(0,10)+'.csv' }; }); },
  createUserSheet: function(){
    var title = '💰 Joelboard — ' + (jbEmail ? jbEmail.split('@')[0] : 'Pessoal');
    var body = { properties:{ title:title }, sheets: JB_HEADERS.map(function(t){ return { properties:{ title:t[0] } }; }) };
    return jbReq('POST','https://sheets.googleapis.com/v4/spreadsheets', body).then(function(ss){
      JB.setSheetId('finance', ss.spreadsheetId);
      var data = JB_HEADERS.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; });
      data.push({ range:'Categories!A2', values: JB_DEFAULT_CATS.map(function(n){ return [n,'',jbUuid()]; }) });
      data.push({ range:'Settings!A2', values:[['hourly_rate',0],['exchange_rate',0],['off_weekdays','d0,d6'],['mode','hourly'],['monthly_salary',0],['daily_hours',8],['overtime_mode','off'],['overtime_mult',1.5],['convert_enabled','true'],['currency_from','USD'],['currency_to','BRL'],['profile_set','false'],['schema_version',3]] });
      return jbReq('POST','https://sheets.googleapis.com/v4/spreadsheets/'+ss.spreadsheetId+'/values:batchUpdate', { valueInputOption:'RAW', data:data });
    }).then(function(){
      return JB.resolveSheet({ app:'finance', namePart:'Joelboard', requiredTabs: JB_TABS });
    }).then(function(ctx){ jbGrid = ctx.grid; return jbLoad(); });
  },
  linkExistingSheet: function(url){
    url = String(url||'').trim();
    var m = url.match(/[a-zA-Z0-9_-]{30,}/);
    if (!m) return Promise.reject(new Error('invalid link'));
    JB.setSheetId('finance', m[0]);
    return JB.resolveSheet({ app:'finance', namePart:'Joelboard', requiredTabs: JB_TABS }).then(function(ctx){
      jbGrid = ctx.grid;
      return jbLoad();
    });
  }
};

function jbRun(method){
  var args = [].slice.call(arguments, 1);
  var fn = JB_IMPL[method];
  if (!fn) return Promise.reject(new Error('Unknown method: ' + method));
  return Promise.resolve().then(function(){ return fn.apply(JB_IMPL, args); });
}
function jbSaveSetting(key, val){
  jbRun('saveSetting', key, val).catch(function(e){ showToast(t('err.prefix')+e.message,'error'); });
}
function jbSaveProfile(data){
  jbRun('saveProfile', data).catch(function(e){ showToast(t('err.prefix')+e.message,'error'); });
}

function jbCachedToken(){ return JB.cachedToken(); }
function jbLogout(){ JB.signOut(); location.reload(); }
function jbStartAuth(){
  if (JB.cachedToken()){ jbEmail = JB.email(); jbAfterSignIn(); return; }
  jbLoadingHtml('<div style="text-align:center;padding:44px;color:var(--muted)">Entrando…</div>');
  JB.requestToken(false).then(function(){ jbAuthDone = true; jbAfterSignIn(); }).catch(function(){ jbShowSignIn(); });
  setTimeout(function(){ if (!jbAuthDone && !JB.cachedToken()) jbShowSignIn(); }, 16000);
}
JB.onSessionExpired(function(){ jbAuthDone=false; jbShowSignIn(true); });
function jbShowSignIn(expired){ jbLoadingHtml('<div style="text-align:center;padding:48px 20px"><div style="font-size:24px;font-weight:800;letter-spacing:-.5px">💰 Joelboard</div><div style="color:var(--muted);font-size:13px;margin:6px 0 26px">'+(expired?'Sua sessão expirou. Entre de novo com Google para continuar.':'Suas finanças pessoais')+'</div><button onclick="jbSignIn()" style="background:#fff;color:#1f2430;border:none;border-radius:12px;padding:13px 22px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">Entrar com Google</button></div>'); }
function jbSignIn(){ JB.signIn({ onSuccess: function(){ jbAuthDone = true; jbAfterSignIn(); } }); }
function jbAfterSignIn(){
  jbLoadingHtml('<div style="text-align:center;padding:40px;color:var(--muted)">Carregando…</div>');
  function go(){ jbBootSheet(); }
  if (JB.email()){ jbEmail = JB.email(); go(); return; }
  JB.fetchEmail().then(function(em){ jbEmail = em; }).then(go);
}
function jbBootSheet(){
  jbLoadingHtml('<div style="text-align:center;padding:44px;color:var(--muted)">Procurando sua planilha…</div>');
  JB.resolveSheet({ app:'finance', namePart:'Joelboard', requiredTabs: JB_TABS }).then(function(ctx){
    jbGrid = ctx.grid; jbLoadAndBoot();
  }).catch(function(e){
    var m = String((e&&e.message)||'');
    if (m.indexOf('silent_timeout')>-1 || m.indexOf('auth_failed')>-1 || m.indexOf('401')>-1 || m.indexOf('cancelled')>-1) { jbShowSignIn(); return; }
    if (m === 'JB_NEED_SHEET'){ var f=(e.files||[]); if (f.length>1) jbOfferPick(f); else jbShowLink(); return; }
    jbLoadingHtml('<div style="text-align:center;padding:30px;color:var(--expense)">Erro ao carregar: ' + m + '<br><br><button onclick="jbUnlink()" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:8px 14px;cursor:pointer;font-family:inherit">Trocar planilha</button></div>');
  });
}
function jbPick(id){ JB.setSheetId('finance', id); jbBootSheet(); }
function jbOfferPick(files){
  var items = files.map(function(f){ return '<button onclick="jbPick(\'' + f.id + '\')" style="display:block;width:100%;text-align:left;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;font-family:inherit;font-size:14px">📊 ' + esc(f.name) + '</button>'; }).join('');
  jbLoadingHtml('<div style="max-width:430px;margin:0 auto;padding:44px 20px"><div style="font-size:18px;font-weight:800;margin-bottom:14px;text-align:center">Qual planilha?</div>' + items + '<button onclick="jbShowLink()" style="background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;cursor:pointer;font-family:inherit;display:block;margin:8px auto 0">criar nova / colar link</button></div>');
}
function jbShowLink(){
  jbLoadingHtml('<div style="max-width:430px;margin:0 auto;padding:42px 20px;text-align:center">'
    + '<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px">💰 Joelboard</div>'
    + '<div style="color:var(--muted);font-size:13px;margin-bottom:24px">Vamos configurar suas finanças.</div>'
    + '<button onclick="jbCreateSheet()" style="background:var(--primary);color:var(--on-brand);border:none;border-radius:12px;padding:13px 18px;font-weight:700;cursor:pointer;width:100%;font-family:inherit;font-size:15px">✨ Criar nova planilha</button>'
    + '<div style="color:var(--muted);font-size:12px;margin:18px 0 12px">— ou já tem uma? —</div>'
    + '<input id="jbSheetUrl" placeholder="Cole o link da planilha" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px;color:var(--text);font-size:14px;margin-bottom:10px;font-family:inherit">'
    + '<button onclick="jbLink()" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer;width:100%;font-family:inherit">Conectar planilha existente</button>'
    + '<div id="jbLinkErr" style="color:var(--expense);font-size:12px;margin-top:10px"></div>'+ '<details style="margin-top:16px;text-align:left"><summary style="cursor:pointer;color:var(--primary);font-size:12px;font-weight:700;list-style:none">Como encontro o link da planilha?</summary>'+ '<ol style="color:var(--muted);font-size:12.5px;line-height:1.7;margin:10px 0 0;padding-left:18px">'+ '<li>Abra seu <a href="https://drive.google.com" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600">Google Drive</a>.</li>'+ '<li>Ache a planilha <b style="color:var(--text)">\u201c\ud83d\udcb0 Joelboard \u2014 \u2026\u201d</b> (ou \u201cFinan\u00e7as/Financeboard\u201d, se for antiga).</li>'+ '<li>Abra ela e copie o endere\u00e7o (URL) l\u00e1 de cima do navegador.</li>'+ '<li>Cole aqui em cima. \u2728</li>'+ '</ol></details></div>');
}
var JB_DEFAULT_CATS = ['🍔 Alimentação','🚌 Transporte','🏠 Moradia e Contas','🎬 Entretenimento','💊 Saúde','🛍️ Compras','💼 Salário','💻 Freelance','✂️ Cuidados Pessoais','🙏 Espiritual','📚 Educação','💡 Contas','🎮 Jogos e Tecnologia','❓ Outros'];
var JB_HEADERS = [
  ['Transactions',['Date','Description','Category','Amount','Type','Pending','ID']],
  ['Budget',['Category','Monthly Budget','ID']],
  ['Goals',['Goal Name','Target Amount','Current Amount','Deadline','Color','ID']],
  ['Recurring',['Name','Amount','Due Day','Frequency','Category','Installments','Start Month','ID']],
  ['Allocations',['Goal ID','Amount','Installments','Start Month','ID']],
  ['Bundles',['Name','Payee','Items','ID']],
  ['Categories',['Name','Color','ID']],
  ['Debts',['Split ID','Date','Title','Person','Amount','Paid','Paid Date','Mine','ID']],
  ['WorkLog',['Date','Worked','Hours','OT Hours']],
  ['Payments',['Month','Type','Item ID','Paid','Actual Amount','Paid Date']],
  ['Settings',['Key','Value']]
];
function jbCreateSheet(){
  jbLoadingHtml('<div style="text-align:center;padding:44px;color:var(--muted)">Criando sua planilha…</div>');
  var title = '💰 Joelboard — ' + (jbEmail ? jbEmail.split('@')[0] : 'Pessoal');
  var body = { properties:{ title:title }, sheets: JB_HEADERS.map(function(t){ return { properties:{ title:t[0] } }; }) };
  jbReq('POST','https://sheets.googleapis.com/v4/spreadsheets', body).then(function(ss){
    JB.setSheetId('finance', ss.spreadsheetId);
    var data = JB_HEADERS.map(function(t){ return { range:t[0]+'!A1', values:[t[1]] }; });
    data.push({ range:'Categories!A2', values: JB_DEFAULT_CATS.map(function(n){ return [n,'',jbUuid()]; }) });
    data.push({ range:'Settings!A2', values:[['hourly_rate',0],['exchange_rate',0],['off_weekdays','d0,d6'],['mode','hourly'],['monthly_salary',0],['daily_hours',8],['overtime_mode','off'],['overtime_mult',1.5],['convert_enabled','true'],['currency_from','USD'],['currency_to','BRL'],['profile_set','false'],['schema_version',3]] });
    return jbReq('POST','https://sheets.googleapis.com/v4/spreadsheets/'+ss.spreadsheetId+'/values:batchUpdate', { valueInputOption:'RAW', data:data });
  }).then(function(){ jbBootSheet(); }).catch(function(e){ jbLoadingHtml('<div style="text-align:center;padding:30px;color:var(--expense)">Erro ao criar: '+e.message+'</div>'); });
}
function jbLink(){ var url=(document.getElementById('jbSheetUrl').value||'').trim(); var m=url.match(/[a-zA-Z0-9_-]{30,}/); if(!m){ document.getElementById('jbLinkErr').textContent='Link inválido.'; return; } JB.setSheetId('finance', m[0]); jbBootSheet(); }
function jbUnlink(){ JB.clearSheetId('finance'); location.reload(); }
function jbApi(url){ return JB.api('GET', url); }
function jbLoad(){
  var id = JB.getSheetId('finance');
  if (!id) return Promise.reject(new Error('no sheet'));
  var want = JB_TABS.filter(function(tb){ return jbGrid && jbGrid[tb] != null; });
  var ranges = want.map(function(tb){ return 'ranges=' + encodeURIComponent(tb); }).join('&');
  return jbApi('https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values:batchGet?' + ranges + '&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER').then(function(res){
    var byTitle = {}; (res.valueRanges || []).forEach(function(vr, i){ byTitle[want[i]] = vr.values || []; });
    return jbBuildData(byTitle);
  });
}
var jbRecovered=false;
function jbLoadAndBoot(){ jbLoadingHtml('<div style="text-align:center;padding:40px;color:var(--muted)">Carregando seus dados…</div>'); jbLoad().then(function(data){ jbRecovered=false; boot(data); }).catch(function(e){ var m=String((e&&e.message)||''); if ((m.indexOf('403')>-1 || m.indexOf('404')>-1 || m.indexOf('PERMISSION')>-1 || m.indexOf('not found')>-1) && !jbRecovered) { jbRecovered=true; try{ JB.clearSheetId('finance'); }catch(_){} jbBootSheet(); return; } jbLoadingHtml('<div style="text-align:center;padding:30px;color:var(--expense)">Erro ao carregar: ' + e.message + '<br><br><button onclick="jbUnlink()" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:8px 14px;cursor:pointer;font-family:inherit">Trocar planilha</button></div>'); }); }
function jbBool(v){ return FinMath.jbBool(v); }
function jbNum(v){ return FinMath.jbNum(v); }
function jbDate(v){ return FinMath.jbDate(v); }
function jbMonth(v){ return FinMath.jbMonth(v); }
function jbBody(rows){ return (rows || []).slice(1); }
function jbBuildData(t){
  var transactions = jbBody(t.Transactions).filter(function(r){ return r[1]; }).map(function(r){ return { id:r[6], date:jbDate(r[0]), description:r[1], category:r[2], amount:jbNum(r[3]), type:r[4], pending:jbBool(r[5]) }; });
  var budget = jbBody(t.Budget).filter(function(r){ return r[0]; }).map(function(r){ return { id:r[2], category:r[0], budget:jbNum(r[1]) }; });
  var goals = jbBody(t.Goals).filter(function(r){ return r[0]; }).map(function(r){ return { id:r[5], name:r[0], target:jbNum(r[1]), current:jbNum(r[2]), deadline:(typeof r[3]==='number'?jbDate(r[3]):(r[3]?String(r[3]):'')), color:r[4] || '#818cf8' }; });
  var recurring = jbBody(t.Recurring).filter(function(r){ return r[0]; }).map(function(r){ return { id:r[7], name:r[0], amount:jbNum(r[1]), dueDay:jbNum(r[2])||1, frequency:r[3]||'Monthly', category:r[4], installments:jbNum(r[5])||0, startMonth:jbMonth(r[6]) }; });
  var allocations = jbBody(t.Allocations).filter(function(r){ return r[0]; }).map(function(r){ return { id:r[4], goalId:r[0], amount:jbNum(r[1]), installments:jbNum(r[2])||0, startMonth:jbMonth(r[3]) }; });
  var bundles = jbBody(t.Bundles).filter(function(r){ return r[0]; }).map(function(r){ var items=[]; try{ items=JSON.parse(r[2]||'[]'); }catch(e){ items=[]; } return { id:r[3], name:r[0], payee:r[1]||'', items:items }; });
  var categories = jbBody(t.Categories).filter(function(r){ return r[0]; }).map(function(r){ return { id:r[2], name:r[0], color:r[1]||'' }; });
  var debts = jbBody(t.Debts).filter(function(r){ return r[3]; }).map(function(r){ return { id:r[8], splitId:String(r[0]), created:jbNum(r[1]), title:r[2]||'', person:r[3], amount:jbNum(r[4]), paid:jbBool(r[5]), paidDate:jbNum(r[6]), mine:jbBool(r[7]) }; });
  var workLog = jbBody(t.WorkLog).filter(function(r){ return r[0]; }).map(function(r){ return { date:jbDate(r[0]), worked:jbBool(r[1]), hours:jbNum(r[2]), otHours:jbNum(r[3]) }; });
  var payments = jbBody(t.Payments).filter(function(r){ return r[0] && r[2]; }).map(function(r){ return { month:String(r[0]).replace(/^m/,'').slice(0,7), type:r[1], itemId:String(r[2]), paid:jbBool(r[3]), actualAmount:(r[4]===''||r[4]==null)?null:jbNum(r[4]), paidDate:(typeof r[5]==='number'?jbDate(r[5]):(r[5]?String(r[5]).slice(0,10):'')) }; });
  var settings = { hourly_rate:0, exchange_rate:0, off_weekdays:[0,6], mode:'hourly', monthly_salary:0, daily_hours:8, overtime_mode:'off', overtime_mult:1.5, convert_enabled:'true', currency_from:'USD', currency_to:'BRL', profile_set:'true' };
  jbBody(t.Settings).forEach(function(r){ if (!r[0]) return; if (r[0]==='off_weekdays'){ var mm=String(r[1]).match(/\d+/g); settings.off_weekdays = mm?mm.map(Number):[]; } else { var n=Number(r[1]); settings[r[0]]=(r[1]===''||isNaN(n))?r[1]:n; } });
  return { transactions:transactions, budget:budget, goals:goals, recurring:recurring, allocations:allocations, bundles:bundles, categories:categories, debts:debts, workLog:workLog, payments:payments, settings:settings, email:jbEmail };
}
/* ============================ end Joelboard data layer ============================ */