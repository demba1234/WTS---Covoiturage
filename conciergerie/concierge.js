(function(){
'use strict';
var CFG=window.WTS_CONFIG||{};
var STATUS=['Reçue','En cours','À valider','Confirmé'];
var STEPS=['Demande reçue','Antoine s’en occupe','Proposition prête','Confirmé'];
var MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
var root=document.getElementById('root'), toastEl=document.getElementById('toast'), toastT=null;
var sb=(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase)?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
var S={view:'boot',me:null,reqs:[],profiles:{},filter:'open',sel:null,draft:null,dirty:false,busy:false,error:''};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function toast(t){toastEl.textContent=t;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on');},2400);}
function when(iso){if(!iso)return '';var d=new Date(iso),n=new Date(),t=d.getHours()+'h'+String(d.getMinutes()).padStart(2,'0');
  return d.toDateString()===n.toDateString()?'Aujourd’hui '+t:d.getDate()+' '+MOIS[d.getMonth()]+' '+t;}
function num(r){return String(r.num).padStart(4,'0');}
function must(r){if(r.error)throw r.error;return r.data;}
function who(r){var p=S.profiles[r.user_id]||{};return ((p.first_name||'')+' '+(p.last_name||'')).trim()||'Client';}
function current(){return S.reqs.filter(function(r){return r.id===S.sel;})[0];}

/* ---------- données ---------- */
function load(){
  return Promise.all([
    sb.from('requests').select('*').order('num',{ascending:false}).then(must),
    sb.from('profiles').select('*').then(must)
  ]).then(function(r){
    S.reqs=r[0];S.profiles={};r[1].forEach(function(p){S.profiles[p.id]=p;});
  });
}
function openSession(session){
  return sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle().then(must).then(function(p){
    if(!p||p.role!=='concierge'){S.view='denied';return;}
    S.me=p;S.view='main';return load().then(live);
  });
}
var rt=null,poll=null;
function live(){
  if(rt)return;
  rt=sb.channel('concierge').on('postgres_changes',{event:'*',schema:'public',table:'requests'},refresh).subscribe();
  poll=setInterval(refresh,CFG.POLL_MS||20000);
}
function stopLive(){if(rt){sb.removeChannel(rt);rt=null;}clearInterval(poll);poll=null;}
function refresh(){
  if(S.view!=='main'||S.busy)return;
  load().then(function(){
    var r=current();
    if(r&&!S.dirty)S.draft=draftOf(r);
    paint(true);
  }).catch(function(){});
}

/* ---------- affichage ---------- */
function paintLogin(msg){
  root.innerHTML='<div class="c-login"><div class="eyebrow">Espace concierge</div><h1 class="display d44" style="margin:10px 0 24px">WTS Conciergerie</h1>'+
  '<form id="login" class="form" style="padding:0" novalidate><div class="fld"><label for="e">Email</label><input type="email" id="e" autocomplete="email" value="'+esc(S.email||'')+'"></div>'+
  '<div class="fld"><label for="p">Mot de passe</label><input type="password" id="p" autocomplete="current-password"></div>'+
  '<div class="msg" id="err" role="alert" style="display:'+(msg?'block':'none')+'">'+esc(msg||'')+'</div>'+
  '<button class="cta" type="submit">Se connecter</button></form></div>';
}
function paintDenied(){
  root.innerHTML='<div class="c-login"><div class="eyebrow">Accès réservé</div><h1 class="display d36" style="margin:10px 0 14px">Cet espace est réservé au concierge.</h1>'+
  '<button class="cta ghost" data-a="logout">Se déconnecter</button></div>';
}
function listHTML(){
  var rows=S.reqs.filter(function(r){return S.filter==='all'||r.step<3||r.id===S.sel;});
  var open=S.reqs.filter(function(r){return r.step<3;}).length;
  return '<div class="c-tabs"><button class="chip" data-a="filter" data-v="open" aria-pressed="'+(S.filter==='open')+'">À traiter · '+open+'</button>'+
    '<button class="chip" data-a="filter" data-v="all" aria-pressed="'+(S.filter==='all')+'">Toutes · '+S.reqs.length+'</button></div>'+
    (rows.length?rows.map(function(r){
      return '<button class="c-item" data-a="sel" data-v="'+r.id+'" aria-current="'+(r.id===S.sel)+'"><span class="r"><span class="t">'+esc(r.title)+'</span>'+
        '<span class="badge'+(r.step===2?'':' line')+'" style="'+(r.step===2?'background:var(--inv-bg);color:var(--inv-fg)':'')+'">'+STATUS[r.step]+'</span></span>'+
        '<span class="s" style="display:block">Nº '+num(r)+' · '+esc(who(r))+' · '+esc(when(r.created_at))+'</span></button>';
    }).join(''):'<p class="empty">Aucune demande à traiter.</p>');
}
function draftOf(r){
  var n=r.notes||['','','',''], p=r.proposal||{};
  return {step:r.step,n1:n[1]||'',n2:n[2]||'',n3:n[3]||'',pt:p.t||'',pd:p.d||'',pp:p.p||''};
}
function detailHTML(){
  var r=current(); if(!r)return '<p class="empty">Choisissez une demande.</p>';
  var p=S.profiles[r.user_id]||{}, d=S.draft, t=r.step_times||[];
  var recap=(r.recap||[]).map(function(k){return '<div><span class="k">'+esc(k[0])+'</span><span class="v">'+esc(k[1])+'</span></div>';}).join('');
  var att=(r.attachments||[]).map(function(a,i){return '<a class="cta ghost" style="display:inline-block;width:auto;padding:10px 16px" href="#" data-a="file" data-v="'+esc(a.path)+'">'+esc(a.label)+' · '+esc(a.name)+'</a>';}).join('');
  var steps=STEPS.map(function(l,i){return '<div class="c-times">'+esc(l)+' : '+(t[i]?esc(when(t[i])):'—')+'</div>';}).join('');
  return '<button class="link" data-a="back" style="display:none" id="backbtn">← Demandes</button>'+
  '<div class="eyebrow">'+esc(r.kind)+' · Nº '+num(r)+'</div><h1 class="display d36" style="margin:8px 0 16px">'+esc(r.title)+'</h1>'+
  '<div class="c-box"><h2>Client</h2><div class="kv"><div><span class="k">Nom</span><span class="v">'+esc(who(r))+'</span></div>'+
  '<div><span class="k">Téléphone</span><span class="v"><a href="tel:'+esc(p.tel||'')+'">'+esc(p.tel||'')+'</a></span></div></div></div>'+
  '<div class="c-box"><h2>Sa demande</h2><div class="kv">'+(recap||'<div><span class="k">—</span></div>')+'</div>'+(att?'<div class="c-att" style="margin-top:12px">'+att+'</div>':'')+'</div>'+
  '<div class="c-box"><h2>Suivi</h2><form id="edit" class="form" style="padding:0" novalidate>'+
  '<div class="fld"><div class="lab">Statut</div><div class="chips">'+STATUS.map(function(l,i){return '<button type="button" class="chip" data-a="step" data-v="'+i+'" aria-pressed="'+(d.step===i)+'">'+l+'</button>';}).join('')+'</div></div>'+
  '<div class="fld"><label for="n1">Message « Antoine s’en occupe »</label><input type="text" id="n1" data-k="n1" value="'+esc(d.n1)+'" placeholder="ex. Vol, hôtel et transfert aéroport"></div>'+
  '<div class="fld"><label for="n2">Message « Proposition prête »</label><input type="text" id="n2" data-k="n2" value="'+esc(d.n2)+'" placeholder="ex. En attente de votre validation"></div>'+
  '<div class="fld"><label for="pt">Proposition : titre'+(d.step===2?' *':'')+'</label><input type="text" id="pt" data-k="pt" value="'+esc(d.pt)+'" placeholder="ex. Air Sénégal + Hôtel Opéra"></div>'+
  '<div class="fld"><label for="pd">Proposition : détail</label><textarea id="pd" data-k="pd" placeholder="ex. Vol aller-retour · 7 nuits · transferts">'+esc(d.pd)+'</textarea></div>'+
  '<div class="fld"><label for="pp">Proposition : prix'+(d.step===2?' *':'')+'</label><input type="text" id="pp" data-k="pp" value="'+esc(d.pp)+'" placeholder="ex. 1 950 000 FCFA"></div>'+
  '<div class="fld"><label for="n3">Message « Confirmé »</label><input type="text" id="n3" data-k="n3" value="'+esc(d.n3)+'" placeholder="ex. Rendez-vous consulaire · mar. 14 oct."></div>'+
  '<div class="msg" id="err" role="alert" style="display:'+(S.error?'block':'none')+'">'+esc(S.error)+'</div>'+
  '<div class="c-dirty" id="dirty">Le client a modifié cette demande pendant que vous éditiez. Enregistrer écrase ses changements.</div>'+
  '<button class="cta" data-a="save"'+(S.busy?' disabled':'')+'>'+(S.busy?'Enregistrement…':'Enregistrer')+'</button></form>'+
  '<div style="margin-top:14px">'+steps+'</div></div>';
}
function paint(keepFocus){
  if(S.view==='boot'){root.innerHTML='';return;}
  if(S.view==='login')return paintLogin(S.error);
  if(S.view==='denied')return paintDenied();
  var active=keepFocus&&document.activeElement&&document.activeElement.id, pos=active&&document.activeElement.selectionStart;
  root.innerHTML='<div class="c-bar"><span class="brand">WTS CONCIERGERIE · ESPACE CONCIERGE</span><span class="row-flex"><span class="link">'+esc(S.me.first_name||'')+'</span><button class="link" data-a="logout">Se déconnecter</button></span></div>'+
    '<div class="c-grid'+(S.sel?' open':'')+'"><div class="c-list">'+listHTML()+'</div><div class="c-detail">'+detailHTML()+'</div></div>';
  var b=document.getElementById('backbtn'); if(b&&window.matchMedia('(max-width:760px)').matches)b.style.display='inline-block';
  if(active){var el=document.getElementById(active);if(el){el.focus();if(pos!=null&&el.setSelectionRange)try{el.setSelectionRange(pos,pos);}catch(e){}}}
}

/* ---------- actions ---------- */
function save(){
  var r=current(); if(!r||S.busy)return;
  var d=S.draft;
  if(d.step===2&&(!d.pt.trim()||!d.pp.trim())){S.error='Pour passer à « À valider », renseignez le titre et le prix de la proposition.';paint(true);return;}
  S.error='';S.busy=true;paint(true);
  var prop=d.pt.trim()?{t:d.pt.trim(),d:d.pd.trim(),p:d.pp.trim()}:null;
  sb.rpc('concierge_update_request',{p_id:r.id,p_step:d.step,p_notes:['',d.n1.trim(),d.n2.trim(),d.n3.trim()],p_proposal:prop}).then(must).then(function(u){
    S.reqs=S.reqs.map(function(x){return x.id===u.id?u:x;});S.draft=draftOf(u);S.dirty=false;S.busy=false;paint();toast('Enregistré · le client est prévenu');
  }).catch(function(e){S.busy=false;S.error=/réservé|proposition|invalide/i.test(e&&e.message||'')?e.message:'Enregistrement impossible. Réessayez.';paint(true);});
}
root.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]'); if(!b)return;
  var a=b.getAttribute('data-a'), v=b.getAttribute('data-v');
  if(a==='filter'){S.filter=v;paint();}
  else if(a==='sel'){S.sel=v;S.draft=draftOf(current());S.dirty=false;S.error='';paint();window.scrollTo(0,0);}
  else if(a==='back'){S.sel=null;paint();}
  else if(a==='step'){S.draft.step=parseInt(v,10);S.dirty=true;S.error='';paint(true);}
  else if(a==='save'){e.preventDefault();save();}
  else if(a==='file'){e.preventDefault();sb.storage.from('documents').createSignedUrl(v,120).then(must).then(function(x){window.open(x.signedUrl,'_blank','noopener');}).catch(function(){toast('Fichier introuvable');});}
  else if(a==='logout'){stopLive();sb.auth.signOut().then(function(){S=Object.assign(S,{view:'login',me:null,reqs:[],sel:null,draft:null,error:''});paint();});}
});
root.addEventListener('input',function(e){var k=e.target.getAttribute&&e.target.getAttribute('data-k');if(k&&S.draft){S.draft[k]=e.target.value;S.dirty=true;}});
root.addEventListener('submit',function(e){
  e.preventDefault();
  if(e.target.id==='edit'){save();return;}
  if(e.target.id!=='login')return;
  var em=document.getElementById('e').value.trim(), pw=document.getElementById('p').value;
  S.email=em;
  if(!em||!pw){S.error='Saisissez votre email et votre mot de passe.';paint();return;}
  sb.auth.signInWithPassword({email:em,password:pw}).then(function(r){
    if(r.error)throw r.error;S.error='';return openSession(r.data.session);
  }).then(function(){paint();}).catch(function(err){S.error=/invalid login/i.test(err&&err.message||'')?'Email ou mot de passe incorrect.':'Connexion impossible. Réessayez.';S.view='login';paint();});
});

/* ---------- démarrage ---------- */
if(!sb){root.innerHTML='<div class="c-login"><div class="eyebrow">Espace concierge</div><h1 class="display d36" style="margin-top:10px">Renseignez config.js pour activer cet espace.</h1></div>';return;}
sb.auth.getSession().then(function(r){
  if(r.data&&r.data.session)return openSession(r.data.session);
  S.view='login';
}).catch(function(){S.view='login';}).then(function(){paint();});
})();
