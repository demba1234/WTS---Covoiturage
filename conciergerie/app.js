(function(){
'use strict';

/* ============ Catalogue : champs repris des maquettes ============ */
var CATS = [
  {id:'voyages',    label:'Voyages & séjours',      services:['billetterie','hotel','transfert','assurance','circuits']},
  {id:'visas',      label:'Visas & démarches',      services:['visas']},
  {id:'livraisons', label:'Livraisons',             services:['livraisons']},
  {id:'assistance', label:'Assistance personnelle', services:['location','lavage']}
];

var DEVIS_NOTE = 'Notre équipe vous communiquera le tarif exact sous 30 minutes.';

var SERVICES = {
  billetterie:{rtitle:function(v){return 'Vol '+v.depart+' → '+v.dest;}, name:'Billetterie', kind:'Voyage', title:'Votre billet d’avion', sub:'Agence agréée IATA · accès GDS Amadeus', hint:'Agence agréée IATA', mode:'cart', priceLabel:'Sur devis',
    fields:[
      {row:[{id:'depart',label:'Ville de départ',type:'text',req:1,val:'Dakar'},{id:'dest',label:'Destination',type:'text',req:1,val:'Paris'}]},
      {row:[{id:'aller',label:'Date de départ',type:'date',req:1,val:'2026-10-17'},{id:'retour',label:'Date de retour (optionnel)',type:'date',val:'2026-10-24'}]},
      {id:'pax',label:'Nombre de passagers',type:'num',req:1,val:2,unit:['passager','passagers']},
      {id:'classe',label:'Classe',type:'chips',req:1,val:'Économique',opts:['Économique','Affaires','Première']}
    ],
    summary:function(v){return v.depart+' → '+v.dest+' · '+range(v.aller,v.retour)+' · '+plural(v.pax,'passager','passagers');}
  },
  hotel:{rtitle:function(v){return 'Hôtel à '+v.ville;}, name:'Hôtel', kind:'Voyage', title:'Réservation hôtel', sub:'', hint:'Attestation de réservation : 5 000 FCFA', mode:'cart', price:5000, priceLabel:'5 000 FCFA',
    fields:[
      {type:'note',b:'Attestation de réservation : 5 000 FCFA',t:'Ce tarif couvre les frais de recherche et de réservation de votre hébergement.'},
      {id:'ville',label:'Destination / Ville',type:'text',req:1,ph:'ex. Dakar, Saly, Marrakech...'},
      {row:[{id:'arrivee',label:'Date d’arrivée',type:'date',req:1,val:'2026-10-17'},{id:'depart',label:'Date de départ',type:'date',req:1,val:'2026-10-20'}]},
      {id:'pers',label:'Nombre de personnes',type:'num',req:1,val:2,unit:['personne','personnes']},
      {id:'chambre',label:'Type de chambre',type:'chips',req:1,val:'Double',opts:['Simple','Double','Suite','Familiale']},
      {id:'etoiles',label:'Nombre d’étoiles souhaité',type:'chips',req:1,val:'4 étoiles',opts:['1 étoile','2 étoiles','3 étoiles','4 étoiles','5 étoiles','Pas de préférence']},
      {id:'budget',label:'Budget approximatif (optionnel)',type:'text',ph:'ex. 50 000 - 100 000 FCFA'},
      {id:'infos',label:'Informations complémentaires (optionnel)',type:'area',ph:'ex. Vue mer, proche du centre-ville...'}
    ],
    summary:function(v){return v.ville+' · '+range(v.arrivee,v.depart)+' · '+plural(v.pers,'personne','personnes');}
  },
  visas:{rtitle:function(v){return 'Visa '+v.pays;}, name:'Visas', kind:'Visa', title:'Votre demande de visa', sub:'Accompagnement à partir de 25 000 FCFA par dossier', hint:'À partir de 25 000 FCFA par dossier', mode:'confirm',
    fields:[
      {id:'pays',label:'Pays de destination',type:'text',req:1,val:'France'},
      {id:'type',label:'Type de visa',type:'chips',req:1,val:'Tourisme',opts:['Tourisme','Affaires','Études','Transit']},
      {id:'date',label:'Date de voyage prévue',type:'date',req:1,val:'2026-10-17'},
      {id:'com',label:'Commentaire (optionnel)',type:'area'}
    ],
    summary:function(v){return v.pays+' · '+v.type+' · départ le '+fdate(v.date);}
  },
  transfert:{rtitle:function(){return 'Transfert aéroport';}, name:'Transfert Aéroport', kind:'Transfert', title:'Votre transfert', sub:'À partir de 20 000 FCFA le trajet', hint:'À partir de 20 000 FCFA le trajet', mode:'cart', priceLabel:'À partir de 20 000 FCFA',
    fields:[
      {row:[{id:'date',label:'Date du transfert',type:'date',req:1,val:'2026-10-17'},{id:'heure',label:'Heure',type:'time',req:1,val:'06:30'}]},
      {id:'prise',label:'Lieu de prise en charge',type:'text',req:1,val:'Almadies, Dakar'},
      {id:'dest',label:'Destination',type:'text',req:1,val:'Aéroport AIBD'},
      {id:'pers',label:'Nombre de personnes',type:'num',req:1,val:2,unit:['personne','personnes']}
    ],
    summary:function(v){return v.prise+' → '+v.dest+' · '+fdate(v.date)+' à '+ftime(v.heure);}
  },
  livraisons:{rtitle:function(){return 'Livraison';}, name:'Livraisons', kind:'Livraison', title:'Votre livraison', sub:'À partir de 3 000 FCFA par course', hint:'À partir de 3 000 FCFA par course', mode:'confirm',
    fields:[
      {id:'collecte',label:'Position de collecte',type:'text',req:1,val:'Almadies, route de Ngor',loc:'Utiliser ma position actuelle'},
      {id:'livraison',label:'Position de livraison',type:'text',req:1,ph:'Saisir une adresse',loc:'Utiliser ma position actuelle'},
      {id:'tel',label:'Téléphone du destinataire',type:'tel',req:1,val:'+221 77 000 00 00'},
      {id:'desc',label:'Description de la course',type:'text',req:1,val:'Récupérer un colis chez le tailleur'},
      {id:'date',label:'Date souhaitée',type:'date',req:1,val:'2026-10-08'}
    ],
    summary:function(v){return v.desc+' · '+fdate(v.date);}
  },
  lavage:{rtitle:function(){return 'Lavage auto';}, name:'Lavage Auto sans Eau', kind:'Lavage', title:'Votre lavage', sub:'À partir de 8 000 FCFA par lavage', hint:'À partir de 8 000 FCFA par lavage', mode:'confirm',
    fields:[
      {id:'lieu',label:'Votre localisation',type:'text',req:1,val:'Mermoz, Dakar',loc:'Partager ma position actuelle'},
      {id:'vehicule',label:'Type de véhicule',type:'chips',req:1,val:'SUV',opts:['Citadine','Berline','SUV','4x4']},
      {id:'quand',label:'Date et heure souhaitées',type:'datetime-local',req:1,val:'2026-10-09T10:00'}
    ],
    summary:function(v){return v.vehicule+' · '+v.lieu+' · '+fdatetime(v.quand);}
  },
  assurance:{rtitle:function(){return 'Assurance voyage';}, name:'Assurance Voyage', kind:'Assurance', title:'Votre assurance', sub:'Sur devis', hint:'Sur devis', mode:'devis',
    fields:[
      {type:'note',b:'Tarif calculé selon votre destination',t:DEVIS_NOTE},
      {id:'passeport',label:'Copie du passeport',type:'file',req:1},
      {id:'pays',label:'Destination / Pays',type:'text',req:1,ph:'ex. France, Maroc, Émirats Arabes Unis...'},
      {row:[{id:'aller',label:'Date de départ',type:'date',req:1,val:'2026-10-17'},{id:'retour',label:'Date de retour',type:'date',req:1,val:'2026-10-24'}]},
      {id:'pax',label:'Nombre de voyageurs',type:'num',req:1,val:1,unit:['voyageur','voyageurs']},
      {type:'note',b:'Couverture complète incluse',t:'Annulation · Rapatriement · Bagages · Santé · Assistance 24h/7j'},
      {id:'infos',label:'Informations complémentaires (optionnel)',type:'area',ph:'ex. Conditions médicales, activités à risque prévues...'}
    ],
    summary:function(v){return v.pays+' · '+range(v.aller,v.retour)+' · '+plural(v.pax,'voyageur','voyageurs');}
  },
  location:{rtitle:function(){return 'Véhicule avec chauffeur';}, name:'Location Véhicule avec Chauffeur', short:'Location avec chauffeur', kind:'Location', title:'Votre véhicule', sub:'Sur devis', hint:'Sur devis', mode:'devis',
    fields:[
      {type:'note',b:'Tarif variable selon le véhicule et la durée de location.',t:DEVIS_NOTE},
      {id:'vehicule',label:'Type de véhicule',type:'chips',req:1,val:'SUV (6 places)',opts:['Berline (4 places)','SUV (6 places)','Bus 14 places']},
      {id:'prise',label:'Lieu de prise en charge',type:'text',req:1,ph:'Saisir une adresse',loc:'Utiliser ma position'},
      {id:'itin',label:'Destination / Itinéraire',type:'text',req:1,ph:'ex. Dakar - Saly, mise à disposition journée...'},
      {row:[{id:'date',label:'Date de début',type:'date',req:1,val:'2026-10-17'},{id:'heure',label:'Heure de début',type:'time',req:1,val:'09:00'}]},
      {id:'duree',label:'Durée de location',type:'chips',req:1,val:'Journée complète (8h)',opts:['Demi-journée (4h)','Journée complète (8h)','Plusieurs jours']},
      {id:'motif',label:'Occasion / Motif (optionnel)',type:'chips',val:'Mariage / Cérémonie',opts:['Aéroport','Mariage / Cérémonie','Excursion / Tourisme','Transport d’équipe','Autre']},
      {id:'pax',label:'Nombre de passagers',type:'num',req:1,val:4,unit:['passager','passagers']},
      {id:'infos',label:'Informations complémentaires (optionnel)',type:'area',ph:'ex. Bagages volumineux, siège bébé...'}
    ],
    summary:function(v){return v.vehicule+' · '+v.duree+' · '+fdate(v.date)+' à '+ftime(v.heure);}
  },
  circuits:{rtitle:function(){return 'Île de Gorée';}, name:'Circuits Touristiques', kind:'Circuit', title:'Île de Gorée', sub:'À partir de 30 000 FCFA par personne', hint:'Île de Gorée · à partir de 30 000 FCFA par personne', mode:'confirm',
    fields:[
      {id:'date',label:'Date souhaitée',type:'date',req:1,val:'2026-10-18'},
      {id:'pers',label:'Nombre de personnes',type:'num',req:1,val:3,unit:['personne','personnes']},
      {id:'com',label:'Commentaire (optionnel)',type:'area'}
    ],
    summary:function(v){return 'Île de Gorée · '+fdate(v.date)+' · '+plural(v.pers,'personne','personnes');}
  }
};

var CTA = {cart:'Ajouter au panier', confirm:'Confirmer la demande →', devis:'Demander un devis →'};
var STEPS = ['Demande reçue','Antoine s’en occupe','Proposition prête','Confirmé'];
var STATUS = ['Reçue','En cours','À valider','Confirmé'];

/* ============ Helpers ============ */
var MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fdate(iso){if(!iso)return '';var p=String(iso).slice(0,10).split('-');return parseInt(p[2],10)+' '+MOIS[parseInt(p[1],10)-1];}
function ftime(t){return t?String(t).replace(':','h'):'';}
function fdatetime(v){if(!v)return '';var p=String(v).split('T');return fdate(p[0])+' à '+ftime(p[1]);}
function range(a,b){return b?fdate(a)+' – '+fdate(b):fdate(a);}
function plural(n,s,p){return n+' '+(n>1?p:s);}
function money(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' FCFA';}
function nowTime(){var d=new Date();return d.getHours()+'h'+String(d.getMinutes()).padStart(2,'0');}
function today(){var s=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});return s.charAt(0).toUpperCase()+s.slice(1);}
function allFields(svc){var out=[];svc.fields.forEach(function(f){if(f.row)f.row.forEach(function(g){out.push(g);});else if(f.id)out.push(f);});return out;}
function defaults(svc){var v={};allFields(svc).forEach(function(f){v[f.id]=f.val!=null?f.val:'';});return v;}

/* ============ État (données d'exemple — étape 1) ============ */
var S = {
  user:{name:'Aminata Diop',first:'Aminata',initials:'AD',tel:'+221 77 000 00 00'},
  tab:'home', stack:[], cart:[], draft:{}, seq:413, unread:false,
  requests:[
    {id:'0412',kind:'Voyage',title:'Séjour à Paris',sub:'17–24 octobre · 2 personnes',step:2,
      notes:['Lun 14h02','Vol, hôtel et transfert aéroport','En attente de votre validation',''],
      proposal:{t:'Air Sénégal + Hôtel Opéra',d:'Vol aller-retour DSS–CDG · 7 nuits · Transfert AIBD et Roissy',p:'1 950 000 FCFA'}},
    {id:'0405',kind:'Visa',title:'Visa Schengen',sub:'Rendez-vous consulaire · mar. 14 oct.',step:3,
      notes:['Reçue par WTS','Dossier constitué','Rendez-vous proposé','Rendez-vous consulaire · mar. 14 oct.']}
  ],
  chat:[
    {day:'Aujourd’hui'},
    {me:'Pourriez-vous nous trouver un vol Dakar–Paris vendredi ? Deux personnes.'},
    {him:'Bien sûr. J’ai deux options en attente jusqu’à 18h. Laquelle préférez-vous ?'},
    {opts:[{t:'Air Sénégal',d:'Départ 23h45 · AIBD'},{t:'Air France',d:'Départ 09h10 · AIBD'}],held:null}
  ]
};

var INIT = JSON.stringify(S);
var app = document.getElementById('app');
var toastTimer = null;

/* ============ Navigation ============ */
function top(){return S.stack[S.stack.length-1]||null;}
function go(tab){S.tab=tab;S.stack=[];if(tab==='messages')S.unread=false;render();}
function push(screen,params){S.stack.push({screen:screen,p:params||{}});render();}
function back(){S.stack.pop();render();}
function toast(t){
  var el=app.querySelector('.toast');if(!el)return;
  el.textContent=t;el.classList.add('on');
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove('on');},2200);
}

/* ============ Écrans ============ */
function tabs(){
  var items=[['home','Accueil'],['requests','Demandes'],['messages','Messages'],['profile','Profil']];
  return '<nav class="tabs" aria-label="Navigation principale">'+items.map(function(i){
    return '<button class="tab" data-a="tab" data-v="'+i[0]+'"'+(S.tab===i[0]?' aria-current="page"':'')+'>'+i[1]+
      (i[0]==='messages'&&S.unread?'<span class="dot" aria-label="Nouveau message"></span>':'')+'</button>';
  }).join('')+'</nav>';
}
function cartLink(){return '<button class="link" data-a="open-cart">Panier'+(S.cart.length?' · '+S.cart.length:'')+'</button>';}
function topBack(label){return '<div class="top"><button class="link" data-a="back">← '+esc(label||'Retour')+'</button>'+cartLink()+'</div>';}
function reqCard(r,inverse){
  var cls=inverse?'current':'card req';
  return '<button class="'+cls+'" data-a="open-req" data-v="'+r.id+'"><span><span class="t" style="display:block">'+esc(r.title)+'</span><span class="s" style="display:block">'+esc(r.sub)+'</span></span>'+
    '<span class="badge'+(inverse||r.step===2?'':' line')+'">'+STATUS[r.step]+'</span></button>';
}

function vHome(){
  var cur=S.requests.filter(function(r){return r.step===2;})[0]||S.requests.filter(function(r){return r.step<3;})[0];
  return '<div class="top"><span class="brand">WTS CONCIERGERIE<span class="demo">DÉMO</span></span>'+cartLink()+'</div>'+
  '<div class="scroll"><div class="pad" style="padding-top:20px">'+
    '<div class="date">'+esc(today())+'</div>'+
    '<h1 class="display d44" style="margin-top:8px">À votre<br>service, '+esc(S.user.first)+'.</h1></div>'+
  '<div class="pad" style="margin-top:18px"><button class="concierge" data-a="tab" data-v="messages">'+
    '<span class="avatar lg"></span><span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:600">Antoine</span>'+
    '<span class="avail"><i></i>Votre concierge · disponible</span></span><span class="pill-o">Écrire</span></button></div>'+
  (cur?'<div class="pad" style="margin-top:18px"><p class="group-h">En cours</p>'+reqCard(cur,true)+'</div>':'')+
  '<div class="pad home-rows" style="margin-top:18px"><div class="rows">'+CATS.map(function(c,i){
    return '<button class="row" data-a="open-cat" data-v="'+c.id+'"><span class="n">0'+(i+1)+'</span><span class="l">'+esc(c.label)+'</span><span class="a">→</span></button>';
  }).join('')+'</div></div>'+
  '<div style="padding:16px 20px 14px;margin-top:auto"><button class="cta" data-a="open-cat" data-v="all">Faire une demande</button></div>'+
  '</div>'+tabs();
}

function svcRow(id){
  var s=SERVICES[id];
  return '<button class="row" data-a="open-svc" data-v="'+id+'"><span class="l">'+esc(s.short||s.name)+'<span class="h">'+esc(s.hint)+'</span></span><span class="a">→</span></button>';
}
function vCat(p){
  var all=p.id==='all', cats=all?CATS:CATS.filter(function(c){return c.id===p.id;});
  var body=cats.map(function(c){
    return '<div class="pad" style="margin-top:22px">'+(all?'<p class="group-h">'+esc(c.label)+'</p>':'')+
      '<div class="rows">'+c.services.map(svcRow).join('')+'</div></div>';
  }).join('');
  return topBack('Accueil')+'<div class="scroll"><div class="pad" style="padding-top:22px"><div class="eyebrow">'+(all?'Nouvelle demande':'Services')+'</div>'+
    '<h1 class="display d36" style="margin-top:8px">'+(all?'Que pouvons-nous<br>faire pour vous ?':esc(cats[0].label))+'</h1></div>'+body+'<div style="height:24px;flex:none"></div></div>';
}

function fieldHTML(sid,f,v){
  var id='f-'+sid+'-'+f.id, lab=esc(f.label)+(f.req?' *':''), val=v[f.id];
  var h='<div class="fld" data-f="'+f.id+'">';
  if(f.type==='chips'){
    h+='<div class="lab" id="'+id+'-l">'+lab+'</div><div class="chips" role="group" aria-labelledby="'+id+'-l">'+f.opts.map(function(o){
      return '<button type="button" class="chip" data-a="chip" data-f="'+f.id+'" data-v="'+esc(o)+'" aria-pressed="'+(val===o)+'">'+esc(o)+'</button>';}).join('')+'</div>';
  }else if(f.type==='num'){
    h+='<div class="lab" id="'+id+'-l">'+lab+'</div><div class="stepper" role="group" aria-labelledby="'+id+'-l"><span class="u">'+esc(val>1?f.unit[1]:f.unit[0])+'</span>'+
      '<span class="ctl"><button type="button" data-a="step" data-f="'+f.id+'" data-v="-1" aria-label="Retirer un">−</button><output id="'+id+'">'+val+'</output>'+
      '<button type="button" data-a="step" data-f="'+f.id+'" data-v="1" aria-label="Ajouter un">+</button></span></div>';
  }else if(f.type==='area'){
    h+='<label for="'+id+'">'+lab+'</label><textarea id="'+id+'" data-f="'+f.id+'" placeholder="'+esc(f.ph||'')+'">'+esc(val)+'</textarea>';
  }else if(f.type==='file'){
    h+='<div class="lab">'+lab+'</div><label class="filebtn" for="'+id+'"><span data-fname>'+(val?esc(val)+' · modifier':'Ajouter une photo ou un PDF')+'</span></label>'+
      '<input class="sr" type="file" id="'+id+'" data-f="'+f.id+'" accept="image/*,application/pdf">';
  }else{
    h+='<label for="'+id+'">'+lab+'</label><input type="'+f.type+'" id="'+id+'" data-f="'+f.id+'" value="'+esc(val)+'" placeholder="'+esc(f.ph||'')+'"'+(f.type==='tel'?' inputmode="tel"':'')+'>';
    if(f.loc)h+='<button type="button" class="locbtn" data-a="loc" data-f="'+f.id+'">◎ '+esc(f.loc)+'</button>';
  }
  return h+'<div class="msg" role="alert"></div></div>';
}
function vForm(p){
  var s=SERVICES[p.id], v=S.draft[p.id]||(S.draft[p.id]=defaults(s));
  var fields=s.fields.map(function(f){
    if(f.type==='note')return '<div class="note"><b>'+esc(f.b)+'</b><span>'+esc(f.t)+'</span></div>';
    if(f.row)return '<div class="two">'+f.row.map(function(g){return fieldHTML(p.id,g,v);}).join('')+'</div>';
    return fieldHTML(p.id,f,v);
  }).join('');
  var cta=CTA[s.mode]+(s.price?' — '+money(s.price):'');
  return '<div class="top"><button class="iconbtn" data-a="back" aria-label="Fermer">✕</button><span class="brand-sm">WTS CONCIERGERIE</span></div>'+
    '<div class="scroll"><div class="pad" style="padding-top:18px"><div class="eyebrow">'+esc(s.short||s.name)+'</div>'+
    '<h1 class="display d32" style="margin-top:6px">'+esc(s.title)+'</h1>'+(s.sub?'<div class="sub">'+esc(s.sub)+'</div>':'')+'</div>'+
    '<form class="form" id="svc-form" data-sid="'+p.id+'" novalidate>'+
    '<div class="who"><b>'+S.user.initials+'</b>'+esc(S.user.name)+' · '+S.user.tel+'</div>'+fields+'</form></div>'+
    '<div class="foot"><button class="cta" data-a="submit" data-v="'+p.id+'">'+esc(cta)+'</button></div>';
}

function vCart(){
  var fixed=S.cart.reduce(function(n,i){return n+(SERVICES[i.sid].price||0);},0);
  var items=S.cart.map(function(i,ix){
    var s=SERVICES[i.sid];
    return '<div class="card"><div class="req"><span><span class="eyebrow" style="display:block">'+esc(s.name)+'</span>'+
      '<span class="s" style="display:block;font-size:13px;color:var(--fg);margin-top:4px">'+esc(s.summary(i.v))+'</span></span></div>'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:10px"><button class="item-x" data-a="rm" data-v="'+ix+'">Retirer</button><span class="price">'+esc(s.priceLabel)+'</span></div></div>';
  }).join('');
  return topBack('Retour').replace(cartLink(),'<span></span>')+
    '<div class="scroll"><div class="pad" style="padding-top:22px"><div class="eyebrow">Panier</div>'+
    '<h1 class="display d36" style="margin-top:8px">'+(S.cart.length?plural(S.cart.length,'prestation','prestations'):'Votre panier<br>est vide.')+'</h1></div>'+
    '<div class="pad stack" style="margin-top:20px">'+(items||'<p class="empty">Ajoutez un billet, un hôtel ou un transfert pour les envoyer ensemble à Antoine.</p>')+'</div>'+
    (S.cart.length?'<div class="pad" style="margin-top:18px;padding-bottom:20px"><div class="kv"><div><span class="k">Frais fixes</span><span class="v">'+(fixed?money(fixed):'Aucun')+'</span></div>'+
      '<div><span class="k">Tarifs sur devis</span><span class="v">Confirmés par Antoine</span></div></div></div>':'')+
    '</div><div class="foot">'+(S.cart.length?'<button class="cta" data-a="send-cart">Envoyer à Antoine</button>':'<button class="cta" data-a="open-cat" data-v="all">Faire une demande</button>')+'</div>';
}

function vDone(p){
  var many=p.ids.length>1;
  return '<div class="top"><span></span><span class="brand-sm">WTS CONCIERGERIE</span></div>'+
    '<div class="scroll"><div class="pad" style="margin-top:auto;margin-bottom:auto;padding-block:30px"><div class="eyebrow">'+(many?plural(p.ids.length,'demande','demandes'):esc(p.label)+' · Nº '+p.ids[0])+'</div>'+
    '<h1 class="display d44" style="margin-top:10px">'+(p.devis?'Devis<br>demandé.':(many?'Demandes<br>envoyées.':'Demande<br>envoyée.'))+'</h1>'+
    '<p style="margin:14px 0 0;color:var(--muted);max-width:30ch">'+(p.devis?'Antoine vous communique le tarif exact sous 30 minutes.':'Antoine a bien reçu votre demande et revient vers vous.')+'</p>'+
    '<div class="concierge" style="margin-top:26px"><span class="avatar lg"></span><span style="flex:1"><span style="display:block;font-size:14px;font-weight:600">Antoine</span><span class="avail"><i></i>Votre concierge · disponible</span></span></div>'+
    '</div></div><div class="foot">'+
    (many?'<button class="cta" data-a="tab" data-v="requests">Voir mes demandes</button>':'<button class="cta" data-a="track" data-v="'+p.ids[0]+'">Suivre ma demande</button>')+
    '<button class="cta ghost" data-a="tab" data-v="home">Retour à l’accueil</button></div>';
}

function vRequests(){
  var open=S.requests.filter(function(r){return r.step<3;}), done=S.requests.filter(function(r){return r.step===3;});
  function block(t,l){return l.length?'<div class="pad" style="margin-top:22px"><p class="group-h">'+t+'</p><div class="stack">'+l.map(function(r){return reqCard(r);}).join('')+'</div></div>':'';}
  return '<div class="top"><span class="brand">WTS CONCIERGERIE</span>'+cartLink()+'</div>'+
    '<div class="scroll"><div class="pad" style="padding-top:26px"><h1 class="display d36">Vos demandes</h1></div>'+
    block('En cours',open)+block('Confirmées',done)+
    '<div style="padding:24px 20px 22px;margin-top:auto"><button class="cta ghost" data-a="open-cat" data-v="all">Faire une demande</button></div></div>'+tabs();
}

function vReq(p){
  var r=S.requests.filter(function(x){return x.id===p.id;})[0];
  var steps=STEPS.map(function(label,i){
    var st=i<r.step||(r.step===3&&i===3)?'done':(i===r.step?'now':'todo');
    var extra='';
    if(i===2&&r.proposal&&r.step>=2){
      extra='<div class="prop"><div class="t">'+esc(r.proposal.t)+'</div><div class="d">'+esc(r.proposal.d)+'</div><div class="b"><span class="p">'+esc(r.proposal.p)+'</span>'+
        (r.step===2?'<button data-a="validate" data-v="'+r.id+'">Valider</button>':'<span class="okd">Validée ✓</span>')+'</div></div>';
    }
    return '<div class="step '+st+'"><div class="rail"><i></i>'+(i<3?'<em></em>':'')+'</div><div class="body"><div class="h">'+label+'</div>'+
      (r.notes[i]&&st!=='todo'?'<div class="d">'+esc(r.notes[i])+'</div>':'')+extra+'</div></div>';
  }).join('');
  var recap=r.recap?'<div class="pad" style="margin-top:6px;padding-bottom:20px"><p class="group-h">Votre demande</p><div class="kv">'+r.recap.map(function(k){
    return '<div><span class="k">'+esc(k[0])+'</span><span class="v">'+esc(k[1])+'</span></div>';}).join('')+'</div></div>':'';
  return '<div class="top"><button class="link" data-a="tab" data-v="requests">← Demandes</button><span></span></div>'+
    '<div class="scroll"><div class="pad" style="padding-top:20px"><div class="eyebrow">'+esc(r.kind)+' · Nº '+r.id+'</div>'+
    '<h1 class="display d36" style="margin-top:8px">'+esc(r.title)+'</h1><div class="sub" style="font-size:13px;margin-top:8px">'+esc(r.sub)+'</div></div>'+
    '<div class="pad tl" style="margin-top:26px">'+steps+'</div>'+recap+'</div>'+
    '<div class="foot"><button class="cta ghost" data-a="tab" data-v="messages">Écrire à Antoine</button></div>';
}

function vMessages(){
  var msgs=S.chat.map(function(m,mi){
    if(m.day)return '<div class="day">'+esc(m.day)+'</div>';
    if(m.me)return '<div class="me">'+esc(m.me)+'</div>';
    if(m.him)return '<div class="him">'+esc(m.him)+'</div>';
    return '<div class="opts">'+m.opts.map(function(o,oi){
      var on=m.held===oi;
      return '<div class="opt"><div><div class="t">'+esc(o.t)+'</div><div class="d">'+esc(o.d)+'</div></div>'+
        '<button data-a="hold" data-v="'+mi+':'+oi+'" aria-pressed="'+on+'">'+(on?'Retenu ✓':'Retenir')+'</button></div>';}).join('')+'</div>';
  }).join('');
  return '<div class="chat-h"><span class="avatar md"></span><div style="flex:1;min-width:0"><div class="n">Antoine</div><div class="s">Répond en 2 min environ</div></div><span class="brand-sm">WTS CONCIERGERIE</span></div>'+
    '<div class="thread" id="thread">'+msgs+'</div>'+
    '<div class="quick"><button data-a="open-svc" data-v="visas">Visa</button><button data-a="open-svc" data-v="livraisons">Livraison</button><button data-a="open-cat" data-v="assistance">Assistance</button><button data-a="open-svc" data-v="billetterie">Billet d’avion</button></div>'+
    '<form class="compose" id="compose"><label class="sr" for="chat-input">Votre message</label><input id="chat-input" type="text" autocomplete="off" placeholder="Écrire à Antoine…"><button type="submit" aria-label="Envoyer">↑</button></form>'+tabs();
}

function vProfile(){
  return '<div class="top"><span class="brand">WTS CONCIERGERIE</span>'+cartLink()+'</div>'+
    '<div class="scroll"><div class="pad" style="padding-top:26px"><div class="eyebrow">Profil</div><h1 class="display d36" style="margin-top:8px">'+esc(S.user.name)+'</h1></div>'+
    '<div class="pad" style="margin-top:22px"><div class="kv"><div><span class="k">Téléphone</span><span class="v">'+S.user.tel+'</span></div>'+
    '<div><span class="k">Concierge attitré</span><span class="v">Antoine</span></div>'+
    '<div><span class="k">Demandes</span><span class="v">'+S.requests.length+'</span></div></div></div>'+
    '<div class="pad" style="margin-top:22px"><div class="note"><b>Prototype cliquable</b><span>Le profil, les demandes et les réponses d’Antoine sont des exemples. Rien n’est réellement envoyé ni facturé.</span></div></div>'+
    '<div style="padding:24px 20px 22px;margin-top:auto"><button class="cta ghost" data-a="reset">Réinitialiser la démo</button></div></div>'+tabs();
}

function render(){
  var t=top(), h;
  if(t){h={cat:vCat,form:vForm,cart:vCart,done:vDone,req:vReq}[t.screen](t.p);}
  else{h={home:vHome,requests:vRequests,messages:vMessages,profile:vProfile}[S.tab]();}
  app.innerHTML=h+'<div class="toast" role="status" aria-live="polite"></div>';
  var th=document.getElementById('thread');if(th)th.scrollTop=th.scrollHeight;
}

/* ============ Actions ============ */
function fieldDef(sid,fid){return allFields(SERVICES[sid]).filter(function(f){return f.id===fid;})[0];}
function currentSid(){var f=document.getElementById('svc-form');return f?f.getAttribute('data-sid'):null;}

function validate(sid){
  var s=SERVICES[sid], v=S.draft[sid], first=null;
  allFields(s).forEach(function(f){
    var box=app.querySelector('.fld[data-f="'+f.id+'"]'), bad='';
    var val=v[f.id];
    if(f.req&&(val===''||val==null))bad=f.type==='file'?'Ajoutez la copie du passeport.':(f.type==='chips'?'Choisissez une option.':'Ce champ est obligatoire.');
    if(!bad&&f.type==='tel'&&val&&String(val).replace(/\D/g,'').length<9)bad='Numéro incomplet. Exemple : +221 77 000 00 00';
    box.classList.toggle('bad',!!bad);
    box.querySelector('.msg').textContent=bad;
    if(bad&&!first)first=box;
  });
  if(!first&&bad2(s,v)){
    var hotel=s===SERVICES.hotel, late=app.querySelector('.fld[data-f="'+(hotel?'depart':'retour')+'"]');
    late.classList.add('bad');late.querySelector('.msg').textContent=hotel?'Le départ doit suivre l’arrivée.':'Le retour doit suivre le départ.';first=late;
  }
  if(!first)return true;
  first.scrollIntoView({block:'center',behavior:'smooth'});
  return false;
}
/* Cohérence des dates aller / retour */
function bad2(s,v){
  if(s===SERVICES.hotel)return v.arrivee&&v.depart&&v.depart<=v.arrivee;
  if(s===SERVICES.billetterie||s===SERVICES.assurance)return v.aller&&v.retour&&v.retour<v.aller;
  return false;
}

function recapOf(sid,v){
  return allFields(SERVICES[sid]).filter(function(f){return v[f.id]!==''&&v[f.id]!=null;}).map(function(f){
    var val=v[f.id];
    if(f.type==='date')val=fdate(val);else if(f.type==='time')val=ftime(val);else if(f.type==='datetime-local')val=fdatetime(val);
    return [f.label.replace(' (optionnel)',''),String(val)];
  });
}
function createRequest(sid,v){
  var s=SERVICES[sid], id=String(S.seq++).padStart(4,'0');
  S.requests.unshift({id:id,kind:s.kind,title:s.rtitle(v),sub:s.summary(v),step:0,
    notes:['Aujourd’hui '+nowTime(),'','',''],recap:recapOf(sid,v)});
  return id;
}
function antoine(text,delay){
  setTimeout(function(){
    S.chat.push({him:text});
    if(S.tab==='messages'&&!top())render();else{S.unread=true;if(!top())render();}
  },delay||900);
}

app.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]');if(!b)return;
  var a=b.getAttribute('data-a'), v=b.getAttribute('data-v'), sid, f, d;
  switch(a){
    case 'tab': go(v);break;
    case 'back': back();break;
    case 'open-cat': push('cat',{id:v});break;
    case 'open-svc': push('form',{id:v});break;
    case 'open-cart': push('cart');break;
    case 'open-req': push('req',{id:v});break;
    case 'track': S.tab='requests';S.stack=[{screen:'req',p:{id:v}}];render();break;
    case 'chip':
      sid=currentSid();f=fieldDef(sid,b.getAttribute('data-f'));d=S.draft[sid];
      d[f.id]=(d[f.id]===v&&!f.req)?'':v;
      b.parentNode.querySelectorAll('.chip').forEach(function(c){c.setAttribute('aria-pressed',String(c.getAttribute('data-v')===d[f.id]));});
      break;
    case 'step':
      sid=currentSid();f=fieldDef(sid,b.getAttribute('data-f'));d=S.draft[sid];
      d[f.id]=Math.max(1,Math.min(20,d[f.id]+parseInt(v,10)));
      var box=b.closest('.stepper');box.querySelector('output').textContent=d[f.id];box.querySelector('.u').textContent=d[f.id]>1?f.unit[1]:f.unit[0];
      break;
    case 'loc':
      sid=currentSid();f=b.getAttribute('data-f');S.draft[sid][f]='Almadies, Dakar';
      app.querySelector('input[data-f="'+f+'"]').value='Almadies, Dakar';
      toast('Position d’exemple utilisée');
      break;
    case 'submit':
      e.preventDefault();
      if(!validate(v))break;
      var s=SERVICES[v], vals=S.draft[v];
      delete S.draft[v];
      if(s.mode==='cart'){S.cart.push({sid:v,v:vals});S.stack=[{screen:'cart',p:{}}];render();toast('Ajouté au panier');}
      else{var id=createRequest(v,vals);S.stack=[{screen:'done',p:{ids:[id],label:s.short||s.name,devis:s.mode==='devis'}}];render();}
      break;
    case 'rm': S.cart.splice(parseInt(v,10),1);render();toast('Retiré du panier');break;
    case 'send-cart':
      var ids=S.cart.map(function(i){return createRequest(i.sid,i.v);}).reverse();
      var label=SERVICES[S.cart[0].sid].name;S.cart=[];
      S.stack=[{screen:'done',p:{ids:ids,label:label}}];render();
      break;
    case 'validate':
      var r=S.requests.filter(function(x){return x.id===v;})[0];
      r.step=3;r.notes[2]='Validée par vous';r.notes[3]='Aujourd’hui '+nowTime();
      render();toast('Proposition validée');
      break;
    case 'hold':
      var p=v.split(':'), m=S.chat[parseInt(p[0],10)], oi=parseInt(p[1],10);
      if(m.held===oi)break;
      m.held=oi;render();
      antoine('C’est noté. Je retiens '+m.opts[oi].t+' pour deux personnes jusqu’à 18h.');
      break;
    case 'reset': S=JSON.parse(INIT);render();toast('Démo réinitialisée');break;
  }
});

app.addEventListener('input',function(e){
  var el=e.target, sid=currentSid();
  if(!sid||!el.hasAttribute('data-f')||el.type==='file')return;
  S.draft[sid][el.getAttribute('data-f')]=el.value;
  var box=el.closest('.fld');if(box)box.classList.remove('bad');
});
app.addEventListener('change',function(e){
  var el=e.target, sid=currentSid();
  if(!sid||el.type!=='file')return;
  var name=el.files&&el.files[0]?el.files[0].name:'';
  S.draft[sid][el.getAttribute('data-f')]=name;
  var box=el.closest('.fld');box.classList.remove('bad');
  box.querySelector('[data-fname]').textContent=name?name+' · modifier':'Ajouter une photo ou un PDF';
});
app.addEventListener('submit',function(e){
  e.preventDefault();
  if(e.target.id==='svc-form'){var b=app.querySelector('[data-a="submit"]');if(b)b.click();return;}
  if(e.target.id!=='compose')return;
  var inp=document.getElementById('chat-input'), t=inp.value.trim();
  if(!t)return;
  S.chat.push({me:t});render();
  var again=document.getElementById('chat-input');if(again)again.focus();
  antoine('Bien reçu, '+S.user.first+'. Je m’en occupe et je reviens vers vous.');
});

render();

if('serviceWorker' in navigator){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
}
})();
