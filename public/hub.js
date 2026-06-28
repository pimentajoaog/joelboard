/* Joelboard Hub — app logic. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module); loads after /joelboard.js. Edit behavior here, markup in the .html. */
var greetEl=document.getElementById("greet"), btnEl=document.getElementById("authbtn");
function setGreet(){ var em=JB.email(); var on=!!JB.cachedToken()&&!!em; greetEl.textContent= on?("Olá, "+em.split("@")[0]+" 👋"):"Olá 👋"; btnEl.textContent= on?"Sair":"Entrar"; btnEl.onclick= on?doOut:doIn; showFbTile(); }
function doIn(){ JB.requestToken(true).then(function(t){ return JB.fetchEmail(t); }).then(setGreet).catch(function(){}); }
function doOut(){ JB.signOut(); setGreet(); }
/* ---- Feedback viewer (owner-only; reads the form-response sheet via Sheets API) ---- */
var FB_SHEET='1vgpn1qRuKys8TYQD-Dx49cDjcOqJDZyqS0fZAvfxchs', FB_GID=749060366, FB_OWNER='joaogabrielpabarbosa@gmail.com';
var FB_STATUS=['New','Acknowledged','Fixed',"Won't fix"];
var fbEntries=[], fbFilter='all', fbOpenOnly=true, fbSearchStr='', fbTitle='', fbStatusCol=-1;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fbOwner(){ return (JB.email()||'').toLowerCase()===FB_OWNER; }
function showFbTile(){ var t=document.getElementById('fbTile'); if(t) t.style.display=fbOwner()?'':'none'; }
function openFB(){ document.getElementById('fbViewer').classList.add('open'); loadFB(); }
function closeFB(){ document.getElementById('fbViewer').classList.remove('open'); }
function loadFB(){
  var el=document.getElementById('fbList'); el.innerHTML='<div class="empty">Carregando…</div>';
  JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+FB_SHEET+'?fields=sheets.properties(sheetId,title)')
    .then(function(meta){ var a=(meta.sheets||[]); var sh=a.find(function(x){return x.properties.sheetId===FB_GID;})||a[0]; fbTitle=sh.properties.title; return JB.api('GET','https://sheets.googleapis.com/v4/spreadsheets/'+FB_SHEET+'/values/'+encodeURIComponent(fbTitle)+'?valueRenderOption=FORMATTED_VALUE'); })
    .then(function(res){ fbEntries=parseFB(res.values||[]); renderFB(); })
    .catch(function(e){ document.getElementById('fbList').innerHTML='<div class="empty">Erro ao carregar: '+esc(e.message||'')+'</div>'; });
}
function parseFB(rows){
  if(!rows.length) return [];
  var hdr=rows[0].map(function(h){return String(h||'').trim().toLowerCase();});
  function col(){ for(var i=0;i<arguments.length;i++){ for(var j=0;j<hdr.length;j++){ if(hdr[j].indexOf(arguments[i])>-1) return j; } } return -1; }
  var ci={ ts:col('timestamp','carimbo','data'), name:col('name','nome'), type:col('type','tipo'), app:col('app'), msg:col('message','mensag'), status:col('status') };
  fbStatusCol=ci.status;
  var out=[];
  for(var r=1;r<rows.length;r++){
    var row=rows[r]||[]; var msg=String((ci.msg>-1?row[ci.msg]:'')||'');
    var tag=msg.match(/^\[([^\]]+)\]\s*/); var app=(ci.app>-1&&row[ci.app])?String(row[ci.app]):(tag?tag[1]:'');
    var text=tag?msg.slice(tag[0].length):msg; text=text.replace(/\s*—\s*[\w.+-]+@[\w.-]+\s*$/,'').trim();
    var ts=String((ci.ts>-1?row[ci.ts]:'')||'');
    if(!text && !ts) continue;
    var type=String((ci.type>-1?row[ci.type]:'')||'');
    out.push({ row:r+1, ts:ts, name:String((ci.name>-1?row[ci.name]:'')||'Anônimo'), type:type, app:app, msg:text, status:String((ci.status>-1&&row[ci.status])||'New'), isBug:/bug/i.test(type), isFeature:/feature|ideia|recurso/i.test(type) });
  }
  return out.reverse();
}
var FB_LABEL={all:'Tudo',fit:'Fit',hub:'Hub',finance:'Finance',bugs:'Bugs',features:'Ideias'};
function fbInChip(e,f){ switch(f){ case 'fit':return /fit/i.test(e.app); case 'hub':return /hub/i.test(e.app); case 'finance':return /finance/i.test(e.app); case 'bugs':return e.isBug; case 'features':return e.isFeature; default:return true; } }
function fbInOpen(e){ return e.status==='New'||e.status==='Acknowledged'; }
function fbInSearch(e){ if(!fbSearchStr) return true; var q=fbSearchStr.toLowerCase(); return (e.name+' '+e.msg+' '+e.app+' '+e.type).toLowerCase().indexOf(q)>-1; }
function fbOnSearch(v){ fbSearchStr=v; renderFB(); }
function fbToggleOpen(btn){ fbOpenOnly=!fbOpenOnly; btn.classList.toggle('on',fbOpenOnly); renderFB(); }
function fbAppCls(a){ a=String(a||'').toLowerCase(); if(a.indexOf('fit')>-1)return 'fit'; if(a.indexOf('finance')>-1)return 'finance'; return 'hub'; }
function fbColL(n){ var s=''; while(n>0){ var m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
function renderFB(){
  document.getElementById('fbStatNew').textContent=fbEntries.filter(function(e){return e.status==='New';}).length;
  document.getElementById('fbStatBug').textContent=fbEntries.filter(function(e){return e.isBug;}).length;
  document.getElementById('fbStatFeat').textContent=fbEntries.filter(function(e){return e.isFeature;}).length;
  var base=fbEntries.filter(function(e){ return (!fbOpenOnly||fbInOpen(e)) && fbInSearch(e); });
  var cats=['all','fit','hub','finance','bugs','features'], counts={};
  cats.forEach(function(c){ counts[c]=base.filter(function(e){return fbInChip(e,c);}).length; });
  var chips=document.querySelectorAll('#fbChips .fbchip'); for(var k=0;k<chips.length;k++){ var cf=chips[k].getAttribute('data-f'); chips[k].textContent=FB_LABEL[cf]+' '+counts[cf]; }
  var vis=base.filter(function(e){return fbInChip(e,fbFilter);}), el=document.getElementById('fbList');
  if(!vis.length){ el.innerHTML='<div class="empty">Nada por aqui ainda.</div>'; return; }
  var canStatus=fbStatusCol>-1;
  el.innerHTML=vis.map(function(e){
    var ini=(e.name||'?').trim().split(/\s+/).slice(0,2).map(function(p){return (p[0]||'').toUpperCase();}).join('')||'?';
    var sel=canStatus?('<div class="fbfoot"><select class="field fbsel" onchange="updateFB('+e.row+',this.value)">'+FB_STATUS.map(function(s){return '<option'+(s===e.status?' selected':'')+'>'+s+'</option>';}).join('')+'</select></div>'):'';
    return '<div class="fbcard"><div class="fbtop"><div class="fbav">'+esc(ini)+'</div><div><div class="fbname">'+esc(e.name)+'</div><div class="fbwhen">'+esc(e.ts)+'</div></div></div><div class="fbbadges"><span class="fbbadge '+(e.isBug?'bug':'feat')+'">'+esc(e.type||'—')+'</span><span class="fbbadge '+fbAppCls(e.app)+'">'+esc(String(e.app||'—').replace(/^Joelboard\s+/i,''))+'</span></div><div class="fbmsg">'+esc(e.msg)+'</div>'+sel+'</div>';
  }).join('');
}
function updateFB(row,status){
  var e=fbEntries.find(function(x){return x.row===row;}); if(e) e.status=status; renderFB();
  if(fbStatusCol<0) return;
  var rng=fbTitle+'!'+fbColL(fbStatusCol+1)+row;
  JB.api('PUT','https://sheets.googleapis.com/v4/spreadsheets/'+FB_SHEET+'/values/'+encodeURIComponent(rng)+'?valueInputOption=RAW',{values:[[status]]}).catch(function(){ if(JB.toast)JB.toast('Erro ao salvar status'); });
}
function fbSetFilter(f,btn){ fbFilter=f; var c=document.querySelectorAll('#fbChips .fbchip'); for(var i=0;i<c.length;i++) c[i].classList.toggle('on',c[i]===btn); renderFB(); }
function openHubSet(){ var em=JB.email(); var on=!!JB.cachedToken()&&!!em; document.getElementById("hubAcct").textContent = on?("Conectado: "+em):"Você não está conectado."; document.getElementById("hubAuthBtn").textContent = on?"Sair":"Entrar com Google"; document.getElementById("hubSet").classList.add("open"); }
function closeHubSet(){ document.getElementById("hubSet").classList.remove("open"); }
function hubAuth(){ var on=!!JB.cachedToken()&&!!JB.email(); closeHubSet(); if(on) doOut(); else doIn(); }
setGreet();
