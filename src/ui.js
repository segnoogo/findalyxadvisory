/* =========================================================================
   Findalyx Advisory — interface (design : outil liasses fiscales Findalyx)
   ========================================================================= */
let DOSSIER=null;            /* dossier courant en memoire */
let VUE="accueil";
let ETATS=null;              /* resultats calcules */
let charts=[];

/* ---------- persistance (localStorage) ---------- */
const ACTIF_KEY="fx_conseil_actif";
function chargerDossiers(){try{return JSON.parse(localStorage.getItem("fx_conseil_dossiers")||"[]");}catch(e){return [];}}
function sauverDossiers(l){localStorage.setItem("fx_conseil_dossiers",JSON.stringify(l));}
function sauverDossier(){
  if(!DOSSIER) return;
  const l=chargerDossiers();
  const i=l.findIndex(d=>d.id===DOSSIER.id);
  if(i>=0) l[i]=DOSSIER; else l.push(DOSSIER);
  sauverDossiers(l);
}

/* ---------- formats ---------- */
/* unité d'affichage : F = FCFA, K = milliers (défaut), M = millions — par dossier */
const UNITES={F:{f:1000,dec:0,lib:"FCFA",suf:"F"},K:{f:1,dec:0,lib:"KFCFA",suf:"K"},M:{f:1/1000,dec:1,lib:"MFCFA",suf:"M"}};
function uni(){const u=UNITES[(DOSSIER&&DOSSIER.unite)||"K"];globalThis.CONF_UNITE=u;return u;}
const fmt=v=>{if(v===null||v===undefined)return "-";
  const u=uni(),x=v*u.f;
  if(Math.abs(x)<(u.dec?0.05:0.5))return "-";
  const s=Math.abs(x).toLocaleString("fr-FR",{minimumFractionDigits:u.dec,maximumFractionDigits:u.dec}).replace(/[\u202f\u00a0]/g," ");
  return x<0?`(${s})`:s;};
const fpct=v=>{if(v===null||!isFinite(v))return "-";if(Math.abs(v)>9.99)return "n.s.";
  const s=Math.round(Math.abs(v*100))+"%";return v<0?`(${s})`:s;};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* ---------- calcul ---------- */
function recalculer(){
  if(!DOSSIER||!DOSSIER.balances.length){ETATS=null;return;}
  const tb=appliquerMapping(construireTbagr(DOSSIER.balances),DOSSIER.overrides||{});
  DOSSIER.tbagr=tb;
  ETATS=calculerEtats(tb,DOSSIER.lignesPerso||[]);
}

/* ---------- shell ---------- */
const NAV=[
  {id:"accueil",lab:"Accueil",ic:"M3 12l9-9 9 9M5 10v10h14V10"},
  {id:"import",lab:"Balances",ic:"M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"},
  {id:"mapping",lab:"Mapping",ic:"M4 6h16M4 12h10M4 18h7"},
  {id:"etats",lab:"États financiers",ic:"M4 4h16v16H4zM4 10h16M10 4v16"},
  {id:"analyse",lab:"Analyse",ic:"M4 20V10m6 10V4m6 16v-7"},
  {id:"ratios",lab:"Ratios",ic:"M12 3a9 9 0 109 9h-9V3zM15 3a9 9 0 016 6h-6V3"},
  {id:"bp",lab:"Business plan",ic:"M4 17l5-6 4 3 7-9M16 5h4v4"},
  {id:"valo",lab:"Valorisation",ic:"M12 3v18M7 8h10M5 13h14M8 18h8"},
  {id:"params",lab:"Paramètres",ic:"M12 8a4 4 0 100 8 4 4 0 000-8zM3 12h2m14 0h2M12 3v2m0 14v2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"},
  {id:"exports",lab:"Exports",ic:"M12 15V3m0 12l-4-4m4 4l4-4M4 21h16"},
];
function icone(d){return `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;}
function shell(){
  const items=NAV.map(n=>`<div class="item ${VUE===n.id?"active":""}" onclick="aller('${n.id}')">${icone(n.ic)}${n.lab}</div>`).join("");
  document.getElementById("app").innerHTML=`
  <div class="side">
    <div class="logo"><img class="brand-logo" src="${LOGO_FINDALYX}" alt="Findalyx">
    <div class="brandsub">Advisory — Due diligence · BP · Valorisation</div></div>
    <div class="nav">${items}</div>
    ${(LIC_ETAT&&(LIC_ETAT.produit==="tous"||LIC_ETAT.mode==="proprietaire"))?`
    <div class="item bascule" onclick="window.open(URL_SYSCO,'_blank')" title="Votre licence couvre les deux applications">
      ${icone("M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4")}Liasse fiscale (SYSCO) ↗</div>`:""}
    <div class="sfoot">Les données restent sur cet ordinateur.<br>Findalyx — Dakar</div>
    <div class="lic-foot" onclick="licChanger()" title="Cliquer pour changer de code">
      ${LIC_ETAT?("Licence : "+esc(LIC_ETAT.customer||"active")+(LIC_ETAT.exp?" · expire le "+esc(LIC_ETAT.exp):" · propriétaire")):"Licence non vérifiée"}</div>
  </div>
  <div class="main">
    <div class="top">
      <div><div class="name">${DOSSIER?esc(DOSSIER.societe):"Aucun dossier ouvert"}</div>
      <div class="sub">${DOSSIER&&DOSSIER.balances.length?DOSSIER.balances.map(b=>"FY"+b.annee).join(" · ")+" — montants en "+uni().lib:"créez ou ouvrez un dossier"}</div></div>
      <div class="right">${DOSSIER?selecteurUnite():""}${selecteurSocietes()}${DOSSIER?`<span class="chip ${chipMapping().cls}">${chipMapping().txt}</span>`:""}</div>
    </div>
    <div class="view" id="vue"></div>
  </div><div id="modal"></div>`;
  rendre();
}
function selecteurUnite(){
  const u=(DOSSIER&&DOSSIER.unite)||"K";
  return `<select class="sel" title="Unité d'affichage" onchange="changerUnite(this.value)">
    <option value="F" ${u==="F"?"selected":""}>FCFA</option>
    <option value="K" ${u==="K"?"selected":""}>K FCFA</option>
    <option value="M" ${u==="M"?"selected":""}>M FCFA</option></select>`;
}
function changerUnite(x){if(!DOSSIER)return;DOSSIER.unite=x;sauverDossier();shell();toast("Affichage en "+UNITES[x].lib);}
function selecteurSocietes(){
  const l=chargerDossiers();
  if(!l.length)return "";
  const placeholder=DOSSIER?"":'<option value="" selected disabled>— Choisir une société —</option>';
  const opts=l.map(d=>`<option value="${d.id}" ${DOSSIER&&DOSSIER.id===d.id?"selected":""}>${esc(d.societe)}</option>`).join("");
  return `<select class="sel" onchange="if(this.value)ouvrirDossier(this.value,true)"
    title="Changer de société">${placeholder}${opts}</select>`;
}
function chipMapping(){
  if(!DOSSIER||!DOSSIER.tbagr) return {cls:"muted",txt:"—"};
  const nm=DOSSIER.tbagr.lignes.filter(l=>l.mapping==="NON_MAPPE").length;
  return nm? {cls:"bad",txt:nm+" compte(s) à mapper"} : {cls:"ok",txt:"Mapping 100 %"};
}
function aller(v){
  if(v!=="accueil"&&!DOSSIER){toast("Ouvrez d'abord un dossier");return;}
  VUE=v;shell();
}
function toast(t){const m=document.getElementById("toast");m.textContent=t;m.style.display="block";
  setTimeout(()=>m.style.display="none",3000);}

/* ---------- vues ---------- */
function rendre(){
  const _t=document.querySelector(".top");
  if(_t&&_t.offsetHeight) document.documentElement.style.setProperty("--topH",(_t.offsetHeight-1)+"px");

  charts.forEach(c=>c.destroy());charts=[];
  const el=document.getElementById("vue");
  if(VUE==="accueil") el.innerHTML=vueAccueil();
  else if(VUE==="import") el.innerHTML=vueImport();
  else if(VUE==="mapping") el.innerHTML=vueMapping();
  else if(VUE==="etats") el.innerHTML=vueEtats();
  else if(VUE==="analyse"){el.innerHTML=vueAnalyse();dessinerGraphs();}
  else if(VUE==="ratios") el.innerHTML=vueRatios();
  else if(VUE==="bp") el.innerHTML=vueBP();
  else if(VUE==="valo"){el.innerHTML=vueValo();dessinerFootball();}
  else if(VUE==="params") el.innerHTML=vueParams();
  else if(VUE==="exports") el.innerHTML=vueExports();
  else if(VUE==="wizard") el.innerHTML=vueWizard();
  document.querySelectorAll("#vue select[data-compte]").forEach(s=>{s.value=s.dataset.val;});
}

/* --- accueil --- */
/* Catégories de restitution — partagées par le mapping, le moteur et le databook */
const GROUPES_MAP=[
 {etat:"PL",lib:"Chiffre d'affaires",agregat:"CA",codes:["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES"]},
 {etat:"PL",lib:"Coûts directs",agregat:"COUTS_DIRECTS",codes:["ACHATS_MARCH","ACHATS_MP","AUTRES_ACHATS"]},
 {etat:"PL",lib:"Subventions et autres produits",agregat:"AUTRES_PROD",codes:["SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS"]},
 {etat:"PL",lib:"Frais généraux",agregat:"OPEX",codes:["SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT","IMPOTS_TAXES","AUTRES_CHARGES"]},
 {etat:"PL",lib:"Charges de personnel",agregat:"CHARGES_PERSONNEL",codes:["CHARGES_PERSONNEL"]},
 {etat:"PL",lib:"Amortissements et provisions",agregat:"DA",codes:["DOTATIONS","REPRISES"]},
 {etat:"PL",lib:"Résultat financier",agregat:"RESULTAT_FIN",codes:["REVENUS_FIN","FRAIS_FIN"]},
 {etat:"PL",lib:"HAO",agregat:"RESULTAT_HAO",codes:["PRODUITS_HAO","CHARGES_HAO"]},
 {etat:"PL",lib:"Impôts",agregat:"IMPOTS",codes:["IS","PARTICIPATION"]},
 {etat:"BS",lib:"Immobilisations",agregat:"ACTIFS_IMMOBILISES",codes:["IMMO_INCORP","IMMO_CORP","AVANCES_IMMO","IMMO_FIN","AMORT_DEPREC"]},
 {etat:"BS",lib:"BFR — actif",agregat:"BFR_ACTIF",codes:["STOCKS","CLIENTS","AVANCES_FRS","AUTRES_CREANCES","HAO_ACTIF"]},
 {etat:"BS",lib:"BFR — passif",agregat:"BFR_PASSIF",codes:["FOURNISSEURS","CLIENTS_AVANCES","DETTES_SOCIALES","DETTES_FISCALES","AUTRES_DETTES","HAO_PASSIF"]},
 {etat:"BS",lib:"Trésorerie",agregat:"TRESORERIE_NETTE",codes:["TRESO_ACTIF","TRESO_PASSIF"]},
 {etat:"BS",lib:"Financement",agregat:"FINANCEMENT",codes:["PROVISIONS_RC","DETTES_FINANCIERES"]},
 {etat:"BS",lib:"Capitaux propres",agregat:"CAPITAUX_PROPRES",codes:["CAPITAL","PRIMES_RESERVES","RAN_RESULTATS_ANT","SUBV_PROV_REGL"]}];
function persoDe(agregat){return (DOSSIER&&DOSSIER.lignesPerso||[]).filter(x=>x.agregat===agregat);}
function libLigne(code){
  const d=[...LIGNES_PL,...LIGNES_BS].find(x=>x.code===code);
  if(d) return d.lib;
  const lp=(DOSSIER&&DOSSIER.lignesPerso||[]).find(x=>x.code===code);
  return lp?lp.lib:code;
}
function chargerLogo(inp){
  const f=inp.files&&inp.files[0];
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      /* redimensionner à 400 px max pour rester léger dans le stockage local */
      const k=Math.min(1,400/Math.max(img.width,img.height));
      const cv=document.createElement("canvas");
      cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
      DOSSIER.logo=cv.toDataURL("image/png");
      sauverDossier();rendre();toast("Logo enregistré — repris sur les pages de garde");
    };
    img.src=r.result;
  };
  r.readAsDataURL(f);
}
function controlesDossier(){
  if(!DOSSIER||!ETATS) return [];
  const A=ETATS.annees,v=ETATS.v,C=[];
  const des=A.filter(a=>Math.abs(DOSSIER.tbagr.lignes.reduce((t,l)=>t+(l.vals[a]||0),0))>1);
  C.push({lib:"Équilibre des balances (Σ débits = Σ crédits)",ok:!des.length,
    det:des.length?"Écart sur FY"+des.map(a=>String(a).slice(-2)).join(", FY"):A.map(a=>"FY"+String(a).slice(-2)).join(" · ")+" équilibrées"});
  const nm=DOSSIER.tbagr.lignes.filter(l=>!l.mapping).length;
  C.push({lib:"Mapping des comptes vers les états",ok:!nm,
    det:nm?nm+" compte(s) sans mapping — onglet Mapping":DOSSIER.tbagr.lignes.length+" comptes mappés"});
  const db=A.filter(a=>Math.abs(v.ACTIF_NET[a]-v.CAPITAUX_PROPRES[a])>1);
  C.push({lib:"Équilibre du bilan (actif net = capitaux propres)",ok:!db.length,
    det:db.length?"Écart sur FY"+db.map(a=>String(a).slice(-2)).join(", FY"):"vérifié sur tous les exercices"});
  if(A.length>1){
    const a=A[A.length-1],ec=ETATS.tft[a].ZG-v.TRESORERIE_NETTE[a];
    C.push({lib:"TFT réconcilié avec la trésorerie du bilan",ok:Math.abs(ec)<1,
      det:Math.abs(ec)<1?"écart nul (ZG = trésorerie de clôture)":"écart de "+fmt(ec)+" "+uni().suf});
  }
  const no=Object.keys(DOSSIER.overrides||{}).length;
  C.push({lib:"Corrections manuelles de mapping",ok:true,
    det:no?no+" compte(s) reclassé(s) manuellement":"aucune — mapping automatique intégral"});
  return C;
}
let ACC_LISTE=false;
function vueAccueil(){
  const l=chargerDossiers();
  const cartes=l.map(d=>`
    <div class="card doss">
      <div><b>${esc(d.societe)}</b><div class="mut">${d.balances.length} balance(s)
      ${d.balances.length?"— FY"+Math.min(...d.balances.map(b=>b.annee))+" à FY"+Math.max(...d.balances.map(b=>b.annee)):""}</div></div>
      <div><button class="btn primary sm" onclick="ouvrirDossier('${d.id}')">Ouvrir</button>
      <button class="btn sm" onclick="supprimerDossier('${d.id}')">Supprimer</button></div>
    </div>`).join("");
  let synth="";
  if(DOSSIER&&ETATS){
    const AN=ETATS.annees,a1=AN[AN.length-1],a0=AN.length>1?AN[AN.length-2]:null,v=ETATS.v;
    const ca1=v.CA[a1];
    const ctl=controlesDossier().map(c=>`<div class="ctl"><div>${c.lib}
      <div class="mut">${c.det||""}</div></div>
      <span class="st ${c.ok?"ok":"warn"}">${c.ok?"OK":"À vérifier"}</span></div>`).join("");
    const logoCtl=`<span class="row" style="gap:8px">
      ${DOSSIER.logo?`<img src="${DOSSIER.logo}" style="height:40px;border:1px solid #eceff3;border-radius:6px;padding:2px;background:#fff">`:""}
      <label class="btn sm">${DOSSIER.logo?"Changer le logo":"Ajouter le logo de la société"}
        <input type="file" accept="image/*" style="display:none" onchange="chargerLogo(this)"></label>
      ${DOSSIER.logo?`<button class="btn sm" onclick="DOSSIER.logo=null;sauverDossier();rendre()">Retirer</button>`:""}</span>`;
    synth=`<div class="sec-titre" style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span>Société sélectionnée — ${esc(DOSSIER.societe)}
      <span class="mut" style="font-weight:400">· ${AN.length} exercice(s) · ${DOSSIER.tbagr.lignes.length} comptes · dernier FY${String(a1).slice(-2)}</span></span>${logoCtl}</div>
    <div class="kpis">
      ${kpiCard("Chiffre d'affaires FY"+String(a1).slice(-2),fmt(ca1)+" "+uni().suf,"",a0?fdelta(v.CA[a0],v.CA[a1]):"","chart","#224289")}
      ${kpiCard("EBITDA",fmt(v.EBITDA[a1])+" "+uni().suf,ca1?Math.round(v.EBITDA[a1]/ca1*100)+"% du CA":"",a0?fdelta(v.EBITDA[a0],v.EBITDA[a1]):"","coins","#FA6706")}
      ${kpiCard("Résultat net",fmt(v.RESULTAT_NET[a1])+" "+uni().suf,ca1?Math.round(v.RESULTAT_NET[a1]/ca1*100)+"% du CA":"",a0?fdelta(v.RESULTAT_NET[a0],v.RESULTAT_NET[a1]):"","file","#172554")}
      ${kpiCard("Trésorerie nette",fmt(v.TRESORERIE_NETTE[a1])+" "+uni().suf,v.TRESORERIE_NETTE[a1]<0?"négative":"",a0?fdelta(Math.abs(v.TRESORERIE_NETTE[a0])||1,v.TRESORERIE_NETTE[a1]):"","wallet","#16904E")}
    </div>
    <div class="sec-titre">Contrôles du dossier</div>
    <div class="card" style="padding:0">${ctl}</div>`;
  }
  const ouverte=ACC_LISTE||!DOSSIER;
  const nb=l.length;
  const barre=`<div class="card" style="display:flex;align-items:center;gap:10px">
    <b>Mes sociétés</b><span class="chip">${nb}</span>
    <button class="btn sm" onclick="ACC_LISTE=!ACC_LISTE;rendre()">${ouverte?"Replier la liste":"Afficher la liste"}</button>
    <button class="btn sm primary" style="margin-left:auto" onclick="ouvrirWizard()">+ Nouvelle société</button>
  </div>`;
  const creation=`<div class="card">
    <b>Nouveau dossier</b>
    <div class="mut" style="margin:6px 0 12px">Assistant guidé en 4 étapes : secteur de comparaison, informations de la société, balances, puis lancement de l'analyse.</div>
    <button class="btn primary" onclick="ouvrirWizard()">Créer une société (assistant)</button>
  </div>`;
  return `<h1>Accueil</h1>
  ${synth}
  ${barre}
  ${ouverte?creation+(cartes||'<div class="mut" style="padding:14px 4px">Aucun dossier. Créez le premier ci-dessus.</div>'):""}`;
}
async function creerDossier(){
  const nom=document.getElementById("nouvNom").value.trim();
  if(!nom){toast("Entrez un nom de société");return;}
  const idNouveau="d"+Date.now();
  const q=await licAjouterSociete(idNouveau,nom);
  if(!q.ok){
    toast("Quota atteint : votre licence permet "+q.max+" société(s) ("+q.used+" utilisées). Contactez Findalyx pour l'augmenter.");
    return;
  }
  const sect=(document.getElementById("nouvSecteur")||{}).value||"Général";
  DOSSIER={id:idNouveau,societe:nom,secteur:sect,balances:[],overrides:{}};
  sauverDossier();localStorage.setItem(ACTIF_KEY,DOSSIER.id);VUE="import";shell();
}
function ouvrirDossier(id,garderVue){
  const d=chargerDossiers().find(x=>x.id===id);
  if(!d)return;
  DOSSIER=d;
  localStorage.setItem(ACTIF_KEY,id);
  recalculer();
  if(!garderVue)VUE=DOSSIER.balances.length?"etats":"import";
  shell();
}
function supprimerDossier(id){
  if(!confirm("Supprimer ce dossier ?"))return;
  try{licRetirerSociete(id);}catch(e){}
  sauverDossiers(chargerDossiers().filter(d=>d.id!==id));
  if(DOSSIER&&DOSSIER.id===id){DOSSIER=null;ETATS=null;localStorage.removeItem(ACTIF_KEY);}
  shell();
}

/* ---------- assistant nouveau dossier (wizard) ---------- */
var WIZ=null;
function ouvrirWizard(){WIZ={step:1,nom:"",secteur:"Général",infos:{},showInfos:false,balances:[]};VUE="wizard";shell();}
function wizStepper(){
  return `<div class="wiz-steps">`+["Secteur","Société","Balances","Récap"].map((lab,i)=>{
    const n=i+1,cls=n<WIZ.step?"done":(n===WIZ.step?"active":"todo");
    return `<div class="wiz-step ${cls}"><span class="wnum">${n<WIZ.step?"✓":n}</span>${lab}</div>`;
  }).join(`<span class="wiz-sep"></span>`)+`</div>`;
}
function wizEtapeSecteur(){
  const cartes=SECTEURS.map((s,i)=>`<div class="wiz-card ${WIZ.secteur===s?"on":""}" onclick="wizSetSecteur(${i})">
    <b>${esc(s)}</b>${s==="Général"?'<span class="chip muted">défaut</span>':""}</div>`).join("");
  return `<b>Secteur de comparaison (benchmark)</b>
   <div class="mut" style="margin:6px 0 12px">Sert à comparer les ratios et la notation à un groupe de pairs. « Général » = médiane de toutes les sociétés. <b>Ce n'est pas le métier exact</b> de la société — celui-ci se renseigne à l'étape suivante (facultatif). Modifiable ensuite dans Paramètres.</div>
   <div class="wiz-grid">${cartes}</div>`;
}
function wizSetSecteur(i){WIZ.secteur=SECTEURS[i]||"Général";rendre();}
function wizEtapeSociete(){
  const f=WIZ.infos||{};
  const renderGrp=grp=>{
    const lignes=grp[2].map(c=>{
      const k=c[0], lab=c[1], ph=c[2], type=c[3];
      return type==="zone"
        ?`<label style="grid-column:1/-1">${esc(lab)}<textarea id="wiz_${k}" class="sel" rows="2" placeholder="${esc(ph)}">${esc(f[k]||"")}</textarea></label>`
        :`<label>${esc(lab)}<input id="wiz_${k}" class="sel" value="${esc(f[k]||"")}" placeholder="${esc(ph)}"></label>`;
    }).join("");
    return `<div class="wiz-sub"><div class="wiz-subttl">${esc(grp[1])}</div><div class="wiz-form">${lignes}</div></div>`;
  };
  const base=renderGrp(INFOS_CHAMPS[0]);
  const reste=WIZ.showInfos?INFOS_CHAMPS.slice(1).map(renderGrp).join(""):"";
  const nbAutres=INFOS_CHAMPS.slice(1).reduce((n,g)=>n+g[2].filter(c=>f[c[0]]).length,0);
  const btn=`<button class="btn sm" style="margin-top:12px" onclick="wizToggleInfos()">${WIZ.showInfos?"▴ Masquer les informations complémentaires":"▾ Plus d'informations (activité, dirigeants, mission…)"+(nbAutres?" · "+nbAutres+" rempli(s)":"")}</button>`;
  return `<b>Fiche société</b>
   <div class="mut" style="margin:6px 0 12px">Seul le <b>nom</b> est requis. Le reste est facultatif (aussi modifiable ensuite dans Paramètres) et alimente les rapports.</div>
   <div class="wiz-form"><label style="grid-column:1/-1">Nom de la société *<input id="wizNom" class="sel" value="${esc(WIZ.nom||"")}" placeholder="ex. COSAMA SA"></label></div>
   ${base}
   ${btn}${reste}`;
}
function wizToggleInfos(){ wizLire(); WIZ.showInfos=!WIZ.showInfos; rendre(); }
function wizEtapeBalances(){
  const bal=(WIZ.balances||[]).slice().sort((a,b)=>a.annee-b.annee).map(b=>{
    const eq=Math.abs(b.controle.ecart)<1;
    return `<tr><td>FY${b.annee}</td><td>${esc(b.fichier)}</td>
      <td><span class="chip ${eq?"ok":"bad"}">${eq?"équilibrée":"écart "+fmt(b.controle.ecart/1000)}</span></td>
      <td><button class="btn sm" onclick="retirerBalance(${b.annee})">Retirer</button></td></tr>`;
  }).join("");
  return `<b>Charger les balances générales</b>
   <div class="mut" style="margin:6px 0 12px">Un fichier par exercice (xlsx, xls, csv) — colonnes détectées automatiquement. Vous pouvez en importer plusieurs.</div>
   <div class="row">
     <input type="file" id="fBal" class="sel" accept=".xlsx,.xls,.csv">
     <input type="number" id="fAnnee" class="sel" placeholder="Exercice (ex. 2023)" style="width:150px">
     <select id="fFeuille" class="sel" style="min-width:160px"><option value="">Feuille…</option></select>
     <button class="btn primary" onclick="importerBalance()">Importer</button>
   </div>
   <table class="tb" style="margin-top:12px"><tr><th>Exercice</th><th>Fichier</th><th>Contrôle</th><th></th></tr>
   ${bal||'<tr><td colspan="4" class="mut">Aucune balance importée pour l’instant.</td></tr>'}</table>`;
}
function wizEtapeRecap(){
  const f=WIZ.infos||{},nb=(WIZ.balances||[]).length;
  const bal=(WIZ.balances||[]).slice().sort((a,b)=>a.annee-b.annee).map(b=>{
    const eq=Math.abs(b.controle.ecart)<1;return `FY${b.annee} <span class="chip ${eq?"ok":"bad"}">${eq?"OK":"écart"}</span>`;}).join(" · ");
  const info=[["secteur","Secteur d'activité"],["formeJuridique","Forme juridique"],["dirigeant","Dirigeant"],["adresse","Implantation"]]
    .filter(x=>f[x[0]]).map(x=>`<div><span class="mut">${x[1]}</span>${esc(f[x[0]])}</div>`).join("");
  return `<b>Récapitulatif</b>
   <div class="wiz-recap" style="margin-top:8px">
     <div><span class="mut">Société</span><b>${esc(WIZ.nom||"—")}</b></div>
     <div><span class="mut">Secteur (benchmark)</span><b>${esc(WIZ.secteur||"Général")}</b></div>
     ${info}
     <div><span class="mut">Balances</span><span>${bal||'<span class="chip bad">aucune</span>'}</span></div>
   </div>
   <div class="mut" style="margin-top:12px">${nb?"Clique « Lancer l'analyse » : la société sera créée et l'analyse s'ouvrira.":"Reviens à l'étape « Balances » pour importer au moins un exercice."}</div>`;
}
function vueWizard(){
  if(!WIZ)return '<div class="mut">…</div>';
  const s=WIZ.step;
  const corps=s===1?wizEtapeSecteur():s===2?wizEtapeSociete():s===3?wizEtapeBalances():wizEtapeRecap();
  const gauche=`<button class="btn" onclick="wizAnnuler()">Annuler</button>`+(s>1?`<button class="btn" onclick="wizPrecedent()">← Précédent</button>`:"");
  const droite=s<4?`<button class="btn primary" style="margin-left:auto" onclick="wizSuivant()">Suivant →</button>`
    :`<button class="btn primary" style="margin-left:auto" onclick="wizLancer()">Lancer l'analyse →</button>`;
  return `<h1>Nouvelle société</h1>${wizStepper()}
   <div class="card">${corps}</div>
   <div class="row wiz-nav">${gauche}${droite}</div>`;
}
function wizLire(){
  if(WIZ.step===2){
    const e=document.getElementById("wizNom"); if(e) WIZ.nom=e.value.trim();
    const inf=Object.assign({}, WIZ.infos||{});
    INFOS_CHAMPS.forEach(grp=>grp[2].forEach(c=>{
      const el=document.getElementById("wiz_"+c[0]);
      if(el){ const v=el.value.trim(); if(v) inf[c[0]]=v; else delete inf[c[0]]; }
    }));
    WIZ.infos=inf;
  }
}
function wizSuivant(){
  wizLire();
  if(WIZ.step===2 && !WIZ.nom){toast("Entrez le nom de la société");return;}
  WIZ.step=Math.min(4,WIZ.step+1);shell();
}
function wizPrecedent(){wizLire();WIZ.step=Math.max(1,WIZ.step-1);shell();}
function wizAnnuler(){WIZ=null;VUE="accueil";shell();}
async function wizLancer(){
  wizLire();
  if(!WIZ.nom){toast("Renseignez le nom de la société (étape « Société »).");WIZ.step=2;shell();return;}
  if(!WIZ.balances||!WIZ.balances.length){toast("Importez au moins une balance.");WIZ.step=3;shell();return;}
  const id="d"+Date.now();
  const q=await licAjouterSociete(id,WIZ.nom);
  if(!q.ok){toast("Quota atteint : licence "+q.max+" société(s), "+q.used+" utilisées. Contactez Findalyx.");return;}
  DOSSIER={id,societe:WIZ.nom,secteur:WIZ.secteur,infos:WIZ.infos,balances:WIZ.balances,overrides:{}};
  localStorage.setItem(ACTIF_KEY,id);
  recalculer();sauverDossier();
  WIZ=null;VUE="analyse";shell();
}

/* --- import --- */
function vueImport(){
  const lignes=DOSSIER.balances.sort((a,b)=>a.annee-b.annee).map(b=>{
    const eq=Math.abs(b.controle.ecart)<1;
    return `<tr><td>FY${b.annee}</td><td>${esc(b.fichier)}</td><td>${esc(b.feuille||"1ʳᵉ feuille")}</td>
    <td>${b.controle.nb}</td>
    <td><span class="chip ${eq?"ok":"bad"}">${eq?"équilibrée":"écart "+fmt(b.controle.ecart/1000)+" "+uni().suf}</span></td>
    <td><button class="btn sm" onclick="retirerBalance(${b.annee})">Retirer</button></td></tr>`;
  }).join("");
  return `<h1>Balances générales</h1>
  <div class="card">
    <b>Importer une balance</b>
    <div class="mut">Formats : xlsx, xls, csv — détection automatique des colonnes, exclusion des sous-totaux.</div>
    <div class="row" style="margin-top:10px">
      <input type="file" id="fBal" class="sel" accept=".xlsx,.xls,.csv">
      <input type="number" id="fAnnee" class="sel" placeholder="Exercice (ex. 2023)" style="width:150px">
      <select id="fFeuille" class="sel" style="min-width:160px"><option value="">Feuille…</option></select>
      <button class="btn primary" onclick="importerBalance()">Importer</button>
    </div>
  </div>
  <div class="card"><b>Balances du dossier</b>
  <table class="tb"><tr><th>Exercice</th><th>Fichier</th><th>Feuille</th><th>Comptes</th><th>Contrôle</th><th></th></tr>
  ${lignes||'<tr><td colspan="6" class="mut">Aucune balance importée.</td></tr>'}</table></div>`;
}
let FICHIER_WB=null;
document.addEventListener("change",e=>{
  if(e.target&&e.target.id==="fBal"){
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      FICHIER_WB=XLSX.read(ev.target.result,{type:"array"});
      const sel=document.getElementById("fFeuille");
      /* value = index : les noms de feuilles peuvent contenir des espaces
         de fin que le HTML supprime — on ne se fie jamais au texte */
      sel.innerHTML=FICHIER_WB.SheetNames.map((n,i)=>`<option value="${i}">${esc(n.trim())}</option>`).join("");
      const m=f.name.match(/20\d\d/); if(m) document.getElementById("fAnnee").value=m[0];
    };
    r.readAsArrayBuffer(f);
  }
});
function importerBalance(){
  const annee=parseInt(document.getElementById("fAnnee").value);
  const fichier=document.getElementById("fBal").files[0];
  if(!FICHIER_WB||!fichier){toast("Choisissez un fichier");return;}
  if(!annee){toast("Indiquez l'exercice");return;}
  const idx=document.getElementById("fFeuille").value;
  const feuille=FICHIER_WB.SheetNames[idx===""?0:parseInt(idx)];
  const ws=FICHIER_WB.Sheets[feuille];
  if(!ws){toast("Feuille introuvable dans le fichier");return;}
  try{
    const mat=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
    const res=lireBalance(mat);
    const b={annee,fichier:fichier.name,feuille,comptes:res.comptes,controle:res.controle};
    if(WIZ&&VUE==="wizard"){
      WIZ.balances=WIZ.balances.filter(x=>x.annee!==annee);WIZ.balances.push(b);shell();
      toast("Balance FY"+annee+" ajoutée ("+res.controle.nb+" comptes)");return;
    }
    DOSSIER.balances=DOSSIER.balances.filter(x=>x.annee!==annee);
    DOSSIER.balances.push(b);
    recalculer();sauverDossier();shell();
    toast("Balance FY"+annee+" importée ("+res.controle.nb+" comptes)");
  }catch(err){toast("Erreur : "+err.message);}
}
function retirerBalance(annee){
  if(WIZ&&VUE==="wizard"){WIZ.balances=WIZ.balances.filter(b=>b.annee!==annee);shell();return;}
  DOSSIER.balances=DOSSIER.balances.filter(b=>b.annee!==annee);
  recalculer();sauverDossier();shell();
}

/* --- mapping --- */
function vueMapping(){
  if(!DOSSIER.tbagr) return '<div class="mut">Importez d\'abord des balances.</div>';
  const A=DOSSIER.tbagr.annees;
  const libDe=libLigne;
  const avecPerso=g=>[g.lib,[...g.codes,...persoDe(g.agregat).map(x=>x.code)]];
  const GROUPES_PL=GROUPES_MAP.filter(g=>g.etat==="PL").map(avecPerso);
  const GROUPES_BS=GROUPES_MAP.filter(g=>g.etat==="BS").map(avecPerso);
  const construireOpts=groupes=>groupes.map(([titre,codes])=>
    `<optgroup label="${titre}">${codes.map(c=>`<option value="${c}">${esc(libDe(c))}</option>`).join("")}</optgroup>`
  ).join("");
  const NM='<option value="NON_MAPPE">— Non mappé —</option>';
  const optsPL=construireOpts(GROUPES_PL)+NM;
  const optsBS=construireOpts(GROUPES_BS)+NM;
  const optsTous='<option value="" selected disabled>Reclasser la sélection vers…</option>'
    +construireOpts(GROUPES_PL)+construireOpts(GROUPES_BS)+NM;
  const CLASSES={1:"Comptes de ressources durables",2:"Actif immobilisé",3:"Stocks",
    4:"Comptes de tiers",5:"Trésorerie",6:"Charges",7:"Produits",8:"HAO",9:"Analytique / engagements"};
  const nbCols=5+A.length;
  const tries=DOSSIER.tbagr.lignes.slice().sort((a,b)=>a.compte.localeCompare(b.compte));
  let classeCourante=null;
  const lignes=tries.map(l=>{
    const cl=l.compte[0];
    let sep="";
    if(cl!==classeCourante){
      classeCourante=cl;
      sep=`<tr class="grp" data-grp="${cl}"><td colspan="${nbCols}">Classe ${cl} — ${CLASSES[cl]||""}</td></tr>`;
    }
    return sep+`<tr class="${l.mapping==="NON_MAPPE"?"nm":""}" data-cl="${cl}" data-txt="${esc((l.compte+" "+l.libelle).toLowerCase())}" data-nm="${l.mapping==="NON_MAPPE"}">
      <td><input type="checkbox" class="mSel" data-compte="${l.compte}" onchange="majSelection()"></td>
      <td>${l.compte}${l.corrige?' <span title="corrigé manuellement" style="color:var(--orange)">•</span>':""}</td>
      <td>${esc(l.libelle.slice(0,42))}</td><td>${l.bsPl}</td>
      ${A.map(a=>`<td class="num">${fmt(l.vals[a])}</td>`).join("")}
      <td><select class="sel" data-compte="${l.compte}" data-val="${l.mapping}"
        onchange="corrigerMapping('${l.compte}',this.value)">${l.bsPl==="PL"?optsPL:optsBS}</select></td></tr>`;
  }).join("");
  return `<h1>Mapping des comptes</h1>
  <div class="mut" style="margin-bottom:10px">Chaque compte est rattaché automatiquement à une ligne de
  restitution. Corrigez avec la liste déroulante — les choix sont groupés par destination
  (Coûts directs, Frais généraux, BFR…) et limités à l'état du compte : classes 1 à 5 → bilan,
  classes 6 à 8 → compte de résultat. Le point orange signale vos corrections. Montants en K.</div>
  <div class="row" style="margin-bottom:10px">
    <input id="mRech" class="sel" placeholder="Rechercher…" style="width:260px" oninput="filtrerMapping()">
    <label class="mut"><input type="checkbox" id="mNM" onchange="filtrerMapping()"> non mappés seulement</label>
    <span class="mut" id="mEtat"></span>
  </div>
  <div class="row" style="margin-bottom:10px">
    <span class="mut" id="mNbSel">0 compte coché</span>
    <select id="mDest" class="sel" style="min-width:280px">${optsTous}</select>
    <button class="btn primary" onclick="reclasserSelection()">Reclasser la sélection</button>
    <button class="btn" onclick="ouvrirLignesPerso()">+ Lignes personnalisées</button>
  </div>
  <div class="card" style="padding:0;overflow:auto;max-height:66vh">
  <table class="tb" id="tMap"><tr><th><input type="checkbox" id="mToutCocher" onchange="toutCocher(this.checked)" title="Cocher tous les comptes affichés"></th><th>Compte</th><th>Libellé</th><th></th>
  ${A.map(a=>`<th class="num">FY${String(a).slice(-2)}</th>`).join("")}<th>Ligne de restitution</th></tr>
  ${lignes}</table></div>`;
}
function ouvrirLignesPerso(){
  const L=DOSSIER.lignesPerso||[];
  const opts=GROUPES_MAP.map((g,i)=>`<option value="${i}">${g.etat==="PL"?"Compte de résultat":"Bilan"} — ${g.lib}</option>`).join("");
  const items=L.map(pp=>{
    const n=DOSSIER.tbagr.lignes.filter(l=>l.mapping===pp.code).length;
    return `<div class="ctl"><div><b>${esc(pp.lib)}</b>
      <div class="mut">${pp.etat==="PL"?"Compte de résultat":"Bilan"} — ${esc(pp.groupe)} · ${n} compte(s) rattaché(s)</div></div>
      <button class="btn sm" onclick="supprimerLignePerso('${pp.code}')">Supprimer</button></div>`;
  }).join("")||'<div class="mut" style="padding:10px 14px">Aucune ligne personnalisée pour ce dossier.</div>';
  document.getElementById("modal").innerHTML=`<div class="voile" onclick="fermerModal(event)">
    <div class="fenetre card" onclick="event.stopPropagation()">
      <h3 style="margin-top:0">Lignes personnalisées</h3>
      <div class="mut" style="margin-bottom:10px">Créez vos propres libellés (ex. « Charges d'enseignants »),
      rattachés à la catégorie de votre choix du P&L ou du bilan. Ils apparaissent ensuite dans les listes
      de mapping, les états, le databook et les exports — uniquement pour ce dossier.</div>
      <div class="row" style="margin-bottom:12px">
        <input id="lpLib" class="sel" placeholder="Libellé (ex. Charges d'enseignants)" style="width:250px">
        <select id="lpGrp" class="sel" style="max-width:260px">${opts}</select>
        <button class="btn primary" onclick="creerLignePerso()">Créer</button>
      </div>
      <div class="card" style="padding:0">${items}</div>
      <div style="text-align:right;margin-top:12px"><button class="btn" onclick="fermerModal()">Fermer</button></div>
    </div></div>`;
}
function creerLignePerso(){
  const lib=document.getElementById("lpLib").value.trim();
  if(!lib){toast("Entrez un libellé");return;}
  const g=GROUPES_MAP[+document.getElementById("lpGrp").value];
  DOSSIER.lignesPerso=DOSSIER.lignesPerso||[];
  if(DOSSIER.lignesPerso.some(x=>x.lib.toLowerCase()===lib.toLowerCase())){toast("Ce libellé existe déjà");return;}
  DOSSIER.lignesPerso.push({code:"PERSO_"+Date.now(),lib,etat:g.etat,agregat:g.agregat,groupe:g.lib});
  recalculer();sauverDossier();rendre();ouvrirLignesPerso();
  toast("Ligne « "+lib+" » créée — "+g.lib);
}
function supprimerLignePerso(code){
  const n=DOSSIER.tbagr.lignes.filter(l=>l.mapping===code).length;
  if(n&&!confirm(n+" compte(s) sont rattachés à cette ligne. Ils reviendront à leur mapping automatique. Continuer ?"))return;
  Object.keys(DOSSIER.overrides||{}).forEach(c=>{if(DOSSIER.overrides[c]===code)delete DOSSIER.overrides[c];});
  DOSSIER.lignesPerso=(DOSSIER.lignesPerso||[]).filter(x=>x.code!==code);
  recalculer();sauverDossier();rendre();ouvrirLignesPerso();
}
function toutCocher(coche){
  document.querySelectorAll("#tMap tr[data-txt]").forEach(tr=>{
    if(tr.style.display!=="none") tr.querySelector(".mSel").checked=coche;
  });
  majSelection();
}
function majSelection(){
  const n=document.querySelectorAll("#tMap .mSel:checked").length;
  const e=document.getElementById("mNbSel");
  if(e) e.textContent=n+" compte"+(n>1?"s":"")+" coché"+(n>1?"s":"");
}
function reclasserSelection(){
  const dest=document.getElementById("mDest").value;
  if(!dest){toast("Choisissez d'abord une ligne de destination");return;}
  const coches=[...document.querySelectorAll("#tMap .mSel:checked")].map(c=>c.dataset.compte);
  if(!coches.length){toast("Cochez d'abord des comptes dans le tableau");return;}
  const lpD=(DOSSIER.lignesPerso||[]).find(x=>x.code===dest);
  const estPL=lpD?lpD.etat==="PL":LIGNES_PL.some(l=>l.code===dest);
  let faits=0,ignores=0;
  DOSSIER.overrides=DOSSIER.overrides||{};
  coches.forEach(compte=>{
    const l=DOSSIER.tbagr.lignes.find(x=>x.compte===compte);
    if(!l) return;
    if(dest==="NON_MAPPE"||(estPL&&l.bsPl==="PL")||(!estPL&&l.bsPl==="BS")){
      DOSSIER.overrides[compte]=dest;faits++;
    }else ignores++;
  });
  recalculer();sauverDossier();rendre();
  toast(faits+" compte(s) reclassé(s) vers « "+libLigne(dest)+" »"
    +(ignores?" — "+ignores+" ignoré(s) : état incompatible":""));
}
function corrigerMapping(compte,ligne){
  DOSSIER.overrides=DOSSIER.overrides||{};
  DOSSIER.overrides[compte]=ligne;
  recalculer();sauverDossier();
  toast(compte+" → "+ligne);
  document.querySelector(".top .right").innerHTML=`<span class="chip ${chipMapping().cls}">${chipMapping().txt}</span>`;
}
function filtrerMapping(){
  const q=document.getElementById("mRech").value.toLowerCase();
  const nm=document.getElementById("mNM").checked;
  let n=0;
  const visiblesParClasse={};
  document.querySelectorAll("#tMap tr[data-txt]").forEach(tr=>{
    const ok=(!q||tr.dataset.txt.includes(q))&&(!nm||tr.dataset.nm==="true");
    tr.style.display=ok?"":"none";
    if(ok){n++;visiblesParClasse[tr.dataset.cl]=true;}
  });
  document.querySelectorAll("#tMap tr.grp").forEach(tr=>{
    tr.style.display=visiblesParClasse[tr.dataset.grp]?"":"none";
  });
  document.getElementById("mEtat").textContent=n+" compte(s)";
}

/* --- composition des lignes (drill-down vers les comptes) --- */
const COMPOSITION={
  BFR_EXPL:["STOCKS","CLIENTS","CLIENTS_AVANCES","AVANCES_FRS","FOURNISSEURS","DETTES_SOCIALES","DETTES_FISCALES"],
  BFR_HE:["AUTRES_CREANCES","AUTRES_DETTES","HAO_ACTIF","HAO_PASSIF"],
  CA:["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES"],
  COUTS_DIRECTS:["ACHATS_MARCH","ACHATS_MP","AUTRES_ACHATS"],
  MARGE_BRUTE:["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES","ACHATS_MARCH","ACHATS_MP","AUTRES_ACHATS"],
  AUTRES_PROD:["SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS"],
  OPEX:["SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM",
        "FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT",
        "IMPOTS_TAXES","AUTRES_CHARGES"],
  CHARGES_PERSONNEL:["CHARGES_PERSONNEL"],
  DA:["DOTATIONS","REPRISES"],
  RESULTAT_FIN:["REVENUS_FIN","FRAIS_FIN"],
  RESULTAT_HAO:["PRODUITS_HAO","CHARGES_HAO"],
  IMPOTS:["IS","PARTICIPATION"],
  ACTIFS_IMMOBILISES:["IMMO_INCORP","IMMO_CORP","AVANCES_IMMO","IMMO_FIN","AMORT_DEPREC"],
  BFR:["STOCKS","CLIENTS","CLIENTS_AVANCES","AVANCES_FRS","AUTRES_CREANCES","FOURNISSEURS",
       "DETTES_SOCIALES","DETTES_FISCALES","AUTRES_DETTES","HAO_ACTIF","HAO_PASSIF"],
  TRESORERIE_NETTE:["TRESO_ACTIF","TRESO_PASSIF"],
  CAPITAUX_PROPRES:["CAPITAL","PRIMES_RESERVES","RAN_RESULTATS_ANT","SUBV_PROV_REGL"],
};
function codesDe(code){
  const base=COMPOSITION[code]||[code];
  const persoL=DOSSIER&&DOSSIER.lignesPerso||[];
  const extra=persoL.filter(pp=>pp.agregat===code
    ||(GROUPES_MAP.find(g=>g.agregat===pp.agregat)||{codes:[]}).codes.some(c=>base.includes(c))
  ).map(pp=>pp.code);
  return [...base,...extra];
}
const AGGS_PL=new Set(["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","OPEX","CHARGES_PERSONNEL",
  "EBITDA","DA","EBIT","RESULTAT_FIN","RESULTAT_HAO","IMPOTS","RESULTAT_NET"]);
function detailLigne(code,libelle){
  const codes=codesDe(code);
  const A=ETATS.annees;
  /* présentation P&L : signe inversé (charges négatives, produits positifs) ; bilan : signes naturels */
  const sg=AGGS_PL.has(code)?-1:1;
  const lignes=DOSSIER.tbagr.lignes.filter(l=>codes.includes(l.mapping))
    .map(l=>({...l,vals:Object.fromEntries(A.map(a=>[a,sg*(l.vals[a]||0)]))}))
    .sort((a,b)=>Math.abs(b.vals[A[A.length-1]])-Math.abs(a.vals[A[A.length-1]]));
  const n=A.length;
  const deltasDe=vals=>A.slice(1).map((a,i)=>vals[i]?fpct(vals[i+1]/vals[i]-1):"-");
  const corps=lignes.map(l=>{
    const vals=A.map(a=>l.vals[a]||0);
    return `<tr><td>${l.compte}</td><td>${esc(l.libelle.slice(0,48))}</td>
    ${vals.map(v=>`<td class="num">${fmt(v)}</td>`).join("")}
    ${deltasDe(vals).map(x=>`<td class="num delta">${x}</td>`).join("")}</tr>`;
  }).join("");
  const totVals=A.map(a=>lignes.reduce((s,l)=>s+(l.vals[a]||0),0));
  const totaux=totVals.map(v=>fmt(v));
  document.getElementById("modal").innerHTML=`
  <div class="voile" onclick="fermerModal(event)">
    <div class="fenetre card" onclick="event.stopPropagation()">
      <div class="f-titre"><b>${esc(libelle)}</b> — ${lignes.length} compte(s)
        <button class="btn sm" style="float:right" onclick="fermerModal()">Fermer ✕</button></div>
      <div class="mut" style="margin:4px 0 10px">Montants en ${uni().lib}${AGGS_PL.has(code)?" — présentation P&L : produits positifs, charges négatives":" — signes comptables naturels (dettes et crédits négatifs)"}. Pour reclasser un compte, utilisez l'onglet Mapping.</div>
      <div style="overflow:auto;max-height:60vh">
      <table class="tb"><tr><th>Compte</th><th>Libellé</th>
        ${A.map(a=>`<th class="num">FY${String(a).slice(-2)}</th>`).join("")}
        ${A.slice(1).map((a,i)=>`<th class="num delta">Δ${String(A[i]).slice(-2)}-${String(a).slice(-2)}</th>`).join("")}</tr>
        ${corps||'<tr><td colspan="9" class="mut">Aucun compte rattaché.</td></tr>'}
        <tr style="font-weight:700"><td colspan="2">Total</td>
        ${totaux.map(t=>`<td class="num">${t}</td>`).join("")}
        ${deltasDe(totVals).map(x=>`<td class="num delta">${x}</td>`).join("")}</tr>
      </table></div>
    </div>
  </div>`;
}
function fermerModal(e){if(!e||e.target.classList.contains("voile"))document.getElementById("modal").innerHTML="";
  if(!e)document.getElementById("modal").innerHTML="";}

/* --- états financiers --- */
let SOUS_ETAT="pl";
function tableEtat(defs,titre){
  const A=ETATS.annees;
  const n=A.length;
  const th=A.map(a=>`<th class="num">FY${String(a).slice(-2)}</th>`).join("")
    +A.slice(1).map((a,i)=>`<th class="num delta">Δ${String(A[i]).slice(-2)}-${String(a).slice(-2)}</th>`).join("")
    +(n>2?'<th class="num delta">CAGR</th>':"");
  const lignes=(PL_VUE==="detail"?defs:defs.filter(d=>!d.detail)).map(d=>{
    if(d.type==="pct"){
      const cells=A.map(a=>{const ca=ETATS.v.CA[a];return `<td class="num pctl">${ca?Math.round(ETATS.v[d.code][a]/ca*100)+"%":"-"}</td>`;}).join("");
      return `<tr class="pct"><td>% ${esc(d.lib)}/CA</td>${cells}${'<td class="delta"></td>'.repeat(n-1+(n>2?1:0))}</tr>`;
    }
    const vals=A.map(a=>ETATS.v[d.code][a]);
    if(vals.every(v=>Math.abs(v)<0.5)&&!d.toujours) return "";
    const deltas=A.slice(1).map((a,i)=>vals[i]?fpct(vals[i+1]/vals[i]-1):"-");
    const cagr=n>2?(vals[0]>0&&vals[n-1]>0?fpct(Math.pow(vals[n-1]/vals[0],1/(n-1))-1):"-"):null;
    return `<tr class="${d.st||""}${d.detail?" det":""} cliquable" onclick="detailLigne('${d.code}','${d.lib.replace(/'/g,"\\'")}')" title="Voir les comptes">
      <td>${esc(d.lib)}<span class="chev">›</span></td>
      ${vals.map(v=>`<td class="num">${fmt(v)}</td>`).join("")}
      ${deltas.map(x=>`<td class="num delta">${x}</td>`).join("")}
      ${cagr!==null?`<td class="num delta">${cagr}</td>`:""}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — ${titre}</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${uni().lib}</th>${th}</tr>${lignes}</table></div></div>`;
}
let PL_VUE="synth";   /* "synth" (défaut) | "detail" — bascule d'affichage du P&L */
const DEF_PL=[
  /* — Chiffre d'affaires — */
  {code:"CA_MARCHANDISES",lib:"Ventes de marchandises",detail:true},
  {code:"CA_PRODUITS",lib:"Production vendue (biens et travaux)",detail:true},
  {code:"CA_SERVICES",lib:"Prestations de services",detail:true},
  {code:"CA_ACCESSOIRES",lib:"Produits accessoires",detail:true},
  {code:"CA",lib:"Chiffre d'affaires",st:"titre",toujours:true},
  /* — Coûts directs (601/602 + variation de stocks) — */
  {code:"ACHATS_MARCH",lib:"Achats de marchandises",detail:true},
  {code:"ACHATS_MP",lib:"Achats de matières premières",detail:true},
  {code:"VARIATION_STOCKS",lib:"Variation de stocks",detail:true},
  {code:"COUTS_DIRECTS",lib:"Coûts directs",st:"stot",toujours:true},
  {code:"MARGE_BRUTE",lib:"Marge brute",st:"total",toujours:true},
  {code:"MARGE_BRUTE",lib:"Marge brute",type:"pct"},
  /* — Autres produits (repliés en une ligne) — */
  {code:"AUTRES_PROD",lib:"Autres produits",toujours:true},
  /* — Frais généraux (personnel inclus) — */
  {code:"AUTRES_ACHATS",lib:"Autres achats (604/605/608)",detail:true},
  {code:"TRANSPORTS",lib:"Transports",detail:true},
  {code:"SERVICES_EXT",lib:"Services extérieurs (62/63)",detail:true},
  {code:"IMPOTS_TAXES",lib:"Impôts et taxes",detail:true},
  {code:"AUTRES_CHARGES",lib:"Autres charges",detail:true},
  {code:"CHARGES_PERSONNEL",lib:"Charges de personnel",detail:true},
  {code:"FRAIS_GENERAUX",lib:"Frais généraux",st:"stot",toujours:true},
  /* — EBITDA — */
  {code:"EBITDA",lib:"EBITDA",st:"total",toujours:true},
  {code:"EBITDA",lib:"EBITDA",type:"pct"},
  {code:"DA",lib:"Dotations et reprises (nettes)",toujours:true},
  {code:"EBIT",lib:"EBIT",st:"total",toujours:true},
  {code:"EBIT",lib:"EBIT",type:"pct"},
  /* — Résultat financier — */
  {code:"REVENUS_FIN",lib:"Produits financiers",detail:true},
  {code:"FRAIS_FIN",lib:"Charges financières",detail:true},
  {code:"RESULTAT_FIN",lib:"Résultat financier",st:"stot",toujours:true},
  {code:"RAO",lib:"Résultat des activités ordinaires",st:"total",toujours:true},
  /* — HAO — */
  {code:"PRODUITS_HAO",lib:"Produits HAO",detail:true},
  {code:"CHARGES_HAO",lib:"Charges HAO",detail:true},
  {code:"RESULTAT_HAO",lib:"Résultat HAO",st:"stot",toujours:true},
  {code:"RESULTAT_AVANT_IMPOT",lib:"Résultat avant impôt",st:"total",toujours:true},
  {code:"IMPOTS",lib:"Impôt sur le résultat",toujours:true},
  {code:"RESULTAT_NET",lib:"Résultat net",st:"total",toujours:true},
  {code:"RESULTAT_NET",lib:"Résultat net",type:"pct"},
];
const DEF_BS=[
  {code:"ACTIFS_IMMOBILISES",lib:"Actifs immobilisés",st:"total"},
  {code:"STOCKS",lib:"Stocks"},
  {code:"CLIENTS",lib:"Créances clients"},
  {code:"AVANCES_FRS",lib:"Fournisseurs, avances versées"},
  {code:"FOURNISSEURS",lib:"Dettes fournisseurs"},
  {code:"CLIENTS_AVANCES",lib:"Clients, avances reçues"},
  {code:"DETTES_FISCALES",lib:"Dettes fiscales"},
  {code:"DETTES_SOCIALES",lib:"Dettes sociales"},
  {code:"BFR_EXPL",lib:"BFR d'exploitation",st:"total",toujours:true},
  {code:"AUTRES_CREANCES",lib:"Autres créances"},
  {code:"AUTRES_DETTES",lib:"Autres dettes"},
  {code:"HAO_ACTIF",lib:"Créances HAO"},{code:"HAO_PASSIF",lib:"Dettes HAO"},
  {code:"BFR_HE",lib:"BFR hors exploitation",st:"total",toujours:true},
  {code:"BFR",lib:"Besoin en fonds de roulement global",st:"total",toujours:true},
  {code:"TRESORERIE_NETTE",lib:"Trésorerie nette",st:"total",toujours:true},
  {code:"PROVISIONS_RC",lib:"Provisions pour risques et charges"},
  {code:"DETTES_FINANCIERES",lib:"Dettes financières"},
  {code:"ACTIF_NET",lib:"Actif net",st:"titre",toujours:true},
  {code:"CAPITAL",lib:"Capital social"},
  {code:"PRIMES_RESERVES",lib:"Primes et réserves"},
  {code:"RAN_RESULTATS_ANT",lib:"Report à nouveau et résultats antérieurs"},
  {code:"SUBV_PROV_REGL",lib:"Subventions et provisions réglementées"},
  {code:"RESULTAT_NET",lib:"Résultat net de l'exercice"},
  {code:"CAPITAUX_PROPRES",lib:"Capitaux propres",st:"titre",toujours:true},
];
const TFT_DEF=[
  ["ZA","Trésorerie nette à l'ouverture","total"],
  [null,"Flux de trésorerie des activités opérationnelles"],
  ["FA","Capacité d'autofinancement globale (CAFG)"],
  ["VAR_CREANCES","Variation des créances"],
  ["FC","Variation des stocks"],
  ["FE","Variation des dettes d'exploitation"],
  ["ZB","Flux de trésorerie des activités opérationnelles","total"],
  [null,"Flux de trésorerie des activités d'investissement"],
  ["ACQUIS_IMMO","Acquisitions d'immobilisations"],
  ["CESSION_IMMO","Cessions d'immobilisations"],
  ["ZC","Flux de trésorerie des activités d'investissement","total"],
  [null,"Flux de trésorerie des activités de financement"],
  ["FK","Augmentation de capital"],
  ["FL","Subvention d'investissement"],
  ["FN","Dividendes versés"],
  ["EMPRUNT","Emprunts nouveaux"],
  ["REMBOURS","Remboursement d'emprunts"],
  ["ZFIN","Flux de trésorerie des activités de financement","total"],
  ["ZF","VARIATION DE LA TRÉSORERIE NETTE DE LA PÉRIODE","total"],
  ["ZG","Trésorerie nette à la clôture","total"]];
function tableTFT(){
  const A=ETATS.annees;
  if(A.length<2) return '<div class="mut">Il faut au moins deux exercices pour le tableau de flux.</div>';
  const cols=A.slice(1);
  const nd=cols.length-1;
  const dTft=code=>cols.slice(1).map((a,i)=>{
    const v0=ETATS.tft[cols[i]][code],v1=ETATS.tft[a][code];
    return `<td class="num delta">${v0?fpct(v1/v0-1):"-"}</td>`;
  }).join("");
  const lignes=TFT_DEF.map(([code,lib,st])=>{
    if(!code) return `<tr class="sec"><td colspan="${cols.length+1+nd}">${lib}</td></tr>`;
    return `<tr class="${st||""}"><td>${lib}</td>
      ${cols.map(a=>`<td class="num">${fmt(ETATS.tft[a][code])}</td>`).join("")}${nd>0?dTft(code):""}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Tableau des flux de trésorerie (modèle officiel SYSCOHADA)</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${uni().lib}</th>
    ${cols.map(a=>`<th class="num">FY${String(a).slice(-2)}</th>`).join("")}
    ${cols.slice(1).map((a,i)=>`<th class="num delta">Δ${String(cols[i]).slice(-2)}-${String(a).slice(-2)}</th>`).join("")}</tr>${lignes}</table></div></div>
  <div class="mut" style="margin-top:8px">CAFG approchée (résultat net + dotations nettes) ; flux reconstruits par
  variations bilancielles — réconciliés exactement avec la trésorerie du bilan. Reconstruits en <b>net</b> depuis les
  bilans : les cessions d'immobilisations et les remboursements d'emprunts ne sont pas isolables des acquisitions /
  emprunts nouveaux (l'une des deux lignes de chaque couple ressort à 0 selon le sens de la variation).</div>`;
}
function blocCommentaires(){
  const C=genererCommentaires(ETATS)[SOUS_ETAT]||[];
  if(!C.length) return "";
  const items=C.map(c=>`<li><b>${esc(c.t)}</b> — ${esc(c.x)}</li>`).join("");
  DOSSIER.notes=DOSSIER.notes||{};
  const note=DOSSIER.notes[SOUS_ETAT]||"";
  return `<div class="card comm">
    <div class="comm-titre">Commentaires <span class="mut">(projet généré automatiquement — à enrichir)</span></div>
    <ul class="comm-liste">${items}</ul>
    <div class="comm-titre" style="margin-top:12px">Vos notes <span class="mut">(conservées avec le dossier, reprises dans l'export)</span></div>
    <textarea class="comm-note" rows="3" placeholder="Compléments de l'analyste…"
      oninput="DOSSIER.notes['${SOUS_ETAT}']=this.value;sauverDossier()">${esc(note)}</textarea>
  </div>`;
}
function vueEtats(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const tabs=[["pl","Compte de résultat"],["bs","Bilan (actif net)"],["tft","Flux de trésorerie"],["adj","EBITDA ajusté & BFR normatif"]]
    .map(([id,lab])=>`<button class="btn ${SOUS_ETAT===id?"primary":""}" onclick="SOUS_ETAT='${id}';rendre()">${lab}</button>`).join(" ");
  let corps="";
  if(SOUS_ETAT==="pl") corps=tableEtat(DEF_PL,"Compte de résultat analytique");
  else if(SOUS_ETAT==="bs") corps=tableEtat(DEF_BS,"Bilan — présentation actif net");
  else if(SOUS_ETAT==="tft") corps=tableTFT();
  else corps=vueAjustements();
  const vueBtn=SOUS_ETAT==="pl"?`<div class="segvue">
    <button class="${PL_VUE==="synth"?"on":""}" onclick="PL_VUE='synth';rendre()">Synthétique</button>
    <button class="${PL_VUE==="detail"?"on":""}" onclick="PL_VUE='detail';rendre()">Détaillée</button></div>`:"";
  return `<h1>États financiers</h1>
  <div class="row" style="margin-bottom:12px;align-items:center">${tabs}${vueBtn}</div>${corps}${blocCommentaires()}`;
}

/* --- cartes KPI (style liasses fiscales) --- */
const IC={chart:"M4 20V10m6 10V4m6 16v-7",coins:"M12 8c4 0 7-1 7-3s-3-3-7-3-7 1-7 3 3 3 7 3zm7 2c0 2-3 3-7 3s-7-1-7-3m14 5c0 2-3 3-7 3s-7-1-7-3",
file:"M6 3h9l4 4v14H6zM14 3v5h5",wallet:"M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h13M16 13h.01",
scale:"M12 3v18M5 7l7-4 7 4M5 7l-3 7a4 4 0 006 0zM19 7l3 7a4 4 0 01-6 0z",
trend:"M4 17l5-6 4 3 7-9M16 5h4v4"};
function kpiCard(lab,val,sub,delta,ic,col){
  col=col||"#172554";
  return `<div class="kpi"><div class="kpi-top"><span class="l">${lab}</span>
    <span class="kpi-ic" style="color:${col};background:${col}1f">${icone(IC[ic]||IC.chart)}</span></div>
    <div class="v">${val}</div>
    <div class="bas">${delta||""}${sub?`<span class="n">${sub}</span>`:""}</div></div>`;
}

/* --- analyse --- */
function fdelta(v0,v1){
  if(!v0||v1===undefined||v1===null) return "";
  const d=v1/v0-1;
  if(!isFinite(d)) return "";
  const cls=d>=0?"up":"down";
  return `<span class="d ${cls}">${Math.abs(Math.round(d*100))}%</span>`;
}
function vueAnalyse(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const A=ETATS.annees,a1=A[A.length-1],a0=A.length>1?A[A.length-2]:null,v=ETATS.v;
  const R=calculerRatios(ETATS), Sc=calculerScores(ETATS, DOSSIER&&DOSSIER.secteur);
  const ca1=v.CA[a1],U=uni();

  /* KPI clés avec variation vs N-1 */
  const kpis=[
    kpiCard("Chiffre d'affaires FY"+String(a1).slice(-2),fmt(ca1)+" "+U.suf,"",a0?fdelta(v.CA[a0],v.CA[a1]):"","chart","#224289"),
    kpiCard("EBITDA",fmt(v.EBITDA[a1])+" "+U.suf,ca1?Math.round(v.EBITDA[a1]/ca1*100)+"% du CA":"",a0?fdelta(v.EBITDA[a0],v.EBITDA[a1]):"","coins","#FA6706"),
    kpiCard("Résultat net",fmt(v.RESULTAT_NET[a1])+" "+U.suf,ca1?Math.round(v.RESULTAT_NET[a1]/ca1*100)+"% du CA":"",a0?fdelta(v.RESULTAT_NET[a0],v.RESULTAT_NET[a1]):"","file","#172554"),
    kpiCard("Trésorerie nette",fmt(v.TRESORERIE_NETTE[a1])+" "+U.suf,v.TRESORERIE_NETTE[a1]<0?"négative":"",a0?fdelta(Math.abs(v.TRESORERIE_NETTE[a0])||1,v.TRESORERIE_NETTE[a1]):"","wallet","#16904E"),
  ].join("");

  /* Forces & points de vigilance (auto-détectés) */
  const forces=[],vig=[];
  const dCA=a0&&v.CA[a0]?v.CA[a1]/v.CA[a0]-1:null;
  const mEb=ca1?v.EBITDA[a1]/ca1:null, mEb0=a0&&v.CA[a0]?v.EBITDA[a0]/v.CA[a0]:null;
  const put=(c,arr,t)=>{if(c&&arr.length<5)arr.push(t);};
  put(dCA!==null&&dCA>0.02,forces,`Croissance du CA de ${Math.round(dCA*100)}% sur un an`);
  put(mEb!==null&&mEb>0.15,forces,`Marge EBITDA solide (${Math.round(mEb*100)}% du CA)`);
  put(v.TRESORERIE_NETTE[a1]>0,forces,"Trésorerie nette positive");
  put(v.CAPITAUX_PROPRES[a1]>0&&-v.DETTES_FINANCIERES[a1]/Math.max(1,v.CAPITAUX_PROPRES[a1])<0.5,forces,"Endettement financier maîtrisé");
  R.ratios.filter(r=>r.statut==="good").forEach(r=>put(true,forces,`${r.lab} au vert`));
  put(v.CAPITAUX_PROPRES[a1]<0,vig,"Capitaux propres négatifs — continuité d'exploitation à documenter");
  put(v.TRESORERIE_NETTE[a1]<0,vig,"Trésorerie nette négative (concours bancaires courants)");
  put(v.RESULTAT_NET[a1]<0,vig,"Résultat net déficitaire");
  put(v.EBITDA[a1]<0,vig,"EBITDA négatif — rentabilité d'exploitation à redresser");
  put(mEb!==null&&mEb0!==null&&mEb<mEb0-0.02,vig,`Érosion de la marge EBITDA (${Math.round(mEb0*100)}% → ${Math.round(mEb*100)}%)`);
  put(dCA!==null&&dCA<-0.02,vig,`Recul du CA de ${Math.round(-dCA*100)}% sur un an`);
  R.ratios.filter(r=>r.statut==="bad").forEach(r=>put(true,vig,`${r.lab} en zone critique`));
  const liste=(arr,cls,vide)=>arr.length?`<ul class="diag ${cls}">${arr.map(t=>`<li>${t}</li>`).join("")}</ul>`:`<div class="mut" style="margin-top:8px">${vide}</div>`;
  const diag=`<div class="deux">
    <div class="card"><b>Forces</b>${liste(forces,"good","—")}</div>
    <div class="card"><b>Points de vigilance</b>${liste(vig,"bad","Aucun point de vigilance majeur détecté.")}</div>
  </div>`;

  /* Commentaires automatiques */
  const com=genererCommentaires(ETATS);
  const blocCom=(t,arr)=>arr.length?`<div class="comm"><div class="comm-titre">${t}</div><ul class="comm-liste">${arr.map(c=>`<li><b>${c.t}.</b> ${c.x}</li>`).join("")}</ul></div>`:"";
  const commentaires=`<div class="card"><b>Lecture de l'analyste — projets de commentaires</b>
    ${blocCom("Compte de résultat",com.pl)}${blocCom("Bilan",com.bs)}${blocCom("Flux de trésorerie",com.tft)}</div>`;

  /* 3 modèles de score (à la fin — support, pas cœur de l'analyse) */
  const bar=(lab,val)=>`<div class="sc-dim"><span>${lab}</span><div class="sc-dbar"><span style="width:${Math.max(0,Math.min(100,val))}%"></span></div><b>${val}</b></div>`;
  const N=Sc.notation, Z=Sc.altman, B=Sc.bceao;
  const carteScore=`<div class="scores3">
    <div class="card sc"><div class="sc-haut"><div><div class="sc-lab">Notation financière</div><div class="sc-sub">Profitabilité · Liquidité · Solvabilité</div></div>
      <div class="sc-grade ${N.ton}">${N.grade}<span>${N.global}/100</span></div></div>
      <div class="sc-mention ${N.ton}">${N.mention}</div>
      ${bar("Profitabilité",N.prof)}${bar("Liquidité",N.liq)}${bar("Solvabilité",N.solv)}</div>
    <div class="card sc"><div class="sc-haut"><div><div class="sc-lab">Altman Z-Score</div><div class="sc-sub">Risque de défaillance (EMS 1995)</div></div>
      <div class="sc-grade ${Z.ton}">${Z.grade}<span>Z = ${Z.z}</span></div></div>
      <div class="sc-mention ${Z.ton}">Zone ${Z.zone}</div>
      ${Z.comp.map(c=>`<div class="sc-dim"><span>${c.k}</span><b>${(Math.round(c.v*100)/100).toFixed(2)}</b></div>`).join("")}</div>
    <div class="card sc"><div class="sc-haut"><div><div class="sc-lab">Cotation BCEAO</div><div class="sc-sub">Bankabilité — normes UEMOA</div></div>
      <div class="sc-grade ${B.ton}">${B.cote}<span>${B.nOk}/4</span></div></div>
      <div class="sc-mention ${B.ton}">${B.mention}</div>
      ${B.crit.map(c=>`<div class="sc-crit"><span>${c.ok?"✓":"✕"} ${c.lib}</span><em>${c.seuil}</em></div>`).join("")}</div>
  </div>`;

  return `<h1>Analyse</h1>
  <div class="kpis k4">${kpis}</div>
  ${diag}
  <div class="deux">
    <div class="card"><b>Soldes de gestion</b><canvas id="g1" height="230"></canvas></div>
    <div class="card"><b>Marges en % du CA</b><canvas id="g3" height="230"></canvas></div>
    <div class="card"><b>Structure des charges</b><canvas id="g4" height="230"></canvas></div>
    <div class="card"><b>BFR et trésorerie nette</b><canvas id="g2" height="230"></canvas></div>
  </div>
  ${rappelSecteur()}
  <h2 class="h2" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>Scores &amp; notation</span><button class="btn sm" onclick="contribuerBenchmark()">Contribuer au benchmark (anonyme)</button></h2>
  ${carteScore}
  ${commentaires}`;
}
function changerSecteur(s){if(!DOSSIER)return;DOSSIER.secteur=s;sauverDossier();rendre();}
function anneeCibleBench(){
  return (ETATS&&ETATS.annees.length)?ETATS.annees[ETATS.annees.length-1]
    :((DOSSIER&&DOSSIER.balances.length)?Math.max(...DOSSIER.balances.map(b=>b.annee)):null);
}
function rappelSecteur(){
  const an=anneeCibleBench();
  if(an&&an!==_benchAnnee)chargerBenchmarksEnLigne(an);
  const cur=(DOSSIER&&DOSSIER.secteur)||"Général";
  const millesime=_benchAnneeUtil||_benchAnnee;
  const suf=millesime?` (benchmark ${millesime})`:"";
  return `<div class="mut" style="margin-bottom:12px">Comparaison sectorielle : <b style="color:var(--navy)">${cur}</b>${suf} — modifiable dans <b>Paramètres</b>.</div>`;
}
var BENCH_FN=(typeof LIC_FN!=="undefined"&&LIC_FN)?LIC_FN.replace("verifier-licence","benchmark"):"";
var BENCH_ONLINE=null, _benchAnnee=null, _benchAnneeUtil=null;
function _benchConvertir(secteurs){const o={};for(const s in secteurs){if(secteurs[s]&&secteurs[s].ratios)o[s]=secteurs[s].ratios;}return o;}
function _benchMillesime(secteurs){for(const s in secteurs){if(secteurs[s]&&secteurs[s].annee)return secteurs[s].annee;}return null;}
async function chargerBenchmarksEnLigne(annee){
  const cle=annee!=null?("fx_bench_cache_"+annee):"fx_bench_cache";
  _benchAnnee=annee!=null?annee:_benchAnnee;
  try{const c=JSON.parse(localStorage.getItem(cle)||"null");if(c&&c.secteurs){BENCH_ONLINE=_benchConvertir(c.secteurs);_benchAnneeUtil=_benchMillesime(c.secteurs)||annee||null;}}catch(e){}
  if(!BENCH_FN)return;
  try{
    const r=await fetch(BENCH_FN,{method:"POST",headers:{"Content-Type":"application/json","apikey":LIC_KEY,"Authorization":"Bearer "+LIC_KEY},body:JSON.stringify(annee!=null?{op:"benchmarks",annee}:{op:"benchmarks"})});
    const d=await r.json();
    if(d&&d.ok&&d.secteurs){
      localStorage.setItem(cle,JSON.stringify({t:Date.now(),annee:annee!=null?annee:null,secteurs:d.secteurs}));
      BENCH_ONLINE=_benchConvertir(d.secteurs);
      _benchAnneeUtil=_benchMillesime(d.secteurs)||annee||null;
      if(VUE==="ratios"||VUE==="analyse")rendre();
    }
  }catch(e){}
}
function contribuerBenchmark(){
  if(!ETATS||!DOSSIER)return;
  const ag=agregatsBenchmark(ETATS), sect=DOSSIER.secteur||"Général", U=uni();
  const champs=[["Chiffre d'affaires","ca"],["Marge brute","marge_brute"],["EBITDA","ebitda"],["EBIT","ebit"],
    ["Résultat net","resultat_net"],["Total actif","total_actif"],["Capitaux propres","capitaux_propres"],
    ["Dettes financières","dettes_financieres"],["Actif circulant","actif_circulant"],["Passif circulant","passif_circulant"],
    ["Stocks","stocks"],["Créances clients","creances_clients"],["Dettes fournisseurs","dettes_fournisseurs"],
    ["Trésorerie","tresorerie_actif"],["Charges d'intérêts","charges_interets"]];
  const lignes=champs.map(([lab,k])=>`<div class="hyp-l"><span>${lab}</span><b>${fmt(ag[k])} ${U.suf}</b></div>`).join("");
  document.getElementById("modal").innerHTML=`<div class="voile" onclick="fermerModal(event)"><div class="fenetre card">
    <div class="f-titre">Contribuer au benchmark — secteur « ${esc(sect)} » · exercice ${ag.annee}</div>
    <div class="mut" style="margin:8px 0 12px">Agrégats <b>anonymisés</b> (aucun nom, aucune ligne de compte) pour enrichir les bornes du secteur. Le nom « <b>${esc(DOSSIER.societe)}</b> » n'est <b>pas</b> transmis.</div>
    <div style="max-height:44vh;overflow:auto">${lignes}</div>
    <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="fermerModal()">Annuler</button>
      <button class="btn primary" onclick="envoyerContribution()">Envoyer</button>
    </div>
  </div></div>`;
}
async function envoyerContribution(){
  if(!ETATS||!DOSSIER){fermerModal();return;}
  const ag=agregatsBenchmark(ETATS), sect=DOSSIER.secteur||"Général";
  fermerModal(); toast("Envoi en cours…");
  if(!BENCH_FN){toast("Endpoint benchmark non configuré.");return;}
  try{
    const r=await fetch(BENCH_FN,{method:"POST",headers:{"Content-Type":"application/json","apikey":LIC_KEY,"Authorization":"Bearer "+LIC_KEY},body:JSON.stringify(Object.assign({op:"contribuer",secteur:sect},ag))});
    const d=await r.json();
    if(d&&d.ok){toast("Merci — société ajoutée au benchmark (anonyme).");const an=anneeCibleBench();try{localStorage.removeItem(an!=null?"fx_bench_cache_"+an:"fx_bench_cache");}catch(e){}chargerBenchmarksEnLigne(an!=null?an:undefined);}
    else toast("Échec : "+((d&&d.raison)||"réponse serveur"));
  }catch(e){toast("Envoi impossible (hors ligne ?).");}
}
function vueRatios(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const A=ETATS.annees,a1=A[A.length-1];
  const R=calculerRatios(ETATS);
  const fRatio=(r,a)=>{
    const x=r.vals[a];
    if(x===null||x===undefined) return "-";
    return (r.unit==="x"?x.toFixed(2):Math.round(x))+(r.unit==="%"?"%":r.unit==="j"?" j":"x");
  };
  /* BENCH est défini dans moteur.js (global, partagé avec les 3 scores) */
  const barreRatio=(r,a)=>{
    const v=r.vals[a], b=benchDe(DOSSIER&&DOSSIER.secteur)[r.k];
    if(v===null||v===undefined||!isFinite(v)) return "";
    if(!b) return `<div class="rbar"><div class="rbar-track rbar-neutre"></div><div class="rbar-ticks"></div></div>`;
    const min=b.min, max=b.max, moy=(min+max)/2, w=(max-min)||1;
    const lo=min-w*0.75, hi=max+w*0.75;              /* min à 30%, moy à 50%, max à 70% */
    const p=Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
    const R="#f6ccc7",Y="#fbe4c8",G="#c9e9d5";
    const grad=r.inverse                              /* plus bas = mieux -> vert à gauche */
      ?`linear-gradient(90deg,${G} 0 30%,${Y} 30% 70%,${R} 70% 100%)`
      :`linear-gradient(90deg,${R} 0 30%,${Y} 30% 70%,${G} 70% 100%)`;
    const fs=(x)=>r.unit==="x"?x.toFixed(1)+"x":(r.unit==="j"?Math.round(x)+" j":(Math.round(x*10)/10)+"%");
    return `<div class="rbar" title="Position vs benchmark sectoriel (min · moyenne · max)">`+
      `<div class="rbar-track" style="background:${grad}"><span class="rbar-cur" style="left:${p.toFixed(1)}%"></span></div>`+
      `<div class="rbar-ticks"><span style="left:30%">${fs(min)}</span><span class="moy" style="left:50%">${fs(moy)}</span><span style="left:70%">${fs(max)}</span></div></div>`;
  };
  const cats=[["rentabilite","Rentabilité"],["liquidite","Liquidité & BFR"],["endettement","Structure & endettement"]];
  const blocs=cats.map(([cat,titre])=>{
    const icCat={rentabilite:["chart","#224289"],liquidite:["wallet","#16904E"],endettement:["coins","#FA6706"]};
    const cartes=R.ratios.filter(r=>r.cat===cat).map(r=>{
      const [ic,col]=icCat[cat]||["chart","#172554"];
      const badge=`<span class="kpi-ic" style="color:${col};background:${col}1f">${icone(IC[ic]||IC.chart)}</span>`;
      const hist=A.slice(0,-1).map(a=>`FY${String(a).slice(-2)} ${fRatio(r,a)}`).join(" · ");
      return `<div class="ratio">
        <div class="r-haut"><span class="r-lab">${r.lab}</span>${badge}</div>
        <div class="r-val">${fRatio(r,a1)}</div>
        <div class="r-hist">${hist||"&nbsp;"}</div>
        ${barreRatio(r,a1)}
      </div>`;
    }).join("");
    return `<h2 class="h2">${titre}</h2><div class="ratios">${cartes}</div>`;
  }).join("");
  return `<h1>Ratios</h1>
  <div class="mut" style="margin-bottom:12px">16 ratios calculés sur le dernier exercice (FY${String(a1).slice(-2)}),
  avec l'historique des exercices précédents — l'interprétation reste à l'appréciation de l'analyste.</div>
  ${rappelSecteur()}
  ${blocs}`;
}
function dessinerGraphs(){
  if(!ETATS||typeof Chart==="undefined") return;
  const A=ETATS.annees,v=ETATS.v;
  const labels=A.map(a=>"FY"+String(a).slice(-2));
  const NAVY="#172554",ORANGE="#FA6706",BLEU="#4a6fb5",GRIS="#9ca3af",VERT="#16904E";
  const opts={responsive:true,plugins:{legend:{position:"bottom",labels:{boxWidth:12,font:{size:11}}}}};
  const mk=(id,cfg)=>{const el=document.getElementById(id);if(el)charts.push(new Chart(el,cfg));};
  mk("g1",{type:"bar",data:{labels,datasets:[
    {label:"Chiffre d'affaires",data:A.map(a=>Math.round(v.CA[a])),backgroundColor:NAVY},
    {label:"Marge brute",data:A.map(a=>Math.round(v.MARGE_BRUTE[a])),backgroundColor:BLEU},
    {label:"EBITDA",data:A.map(a=>Math.round(v.EBITDA[a])),backgroundColor:ORANGE},
    {label:"Résultat net",data:A.map(a=>Math.round(v.RESULTAT_NET[a])),backgroundColor:GRIS}]},options:opts});
  mk("g3",{type:"line",data:{labels,datasets:[
    {label:"% Marge brute",data:A.map(a=>v.CA[a]?+(v.MARGE_BRUTE[a]/v.CA[a]*100).toFixed(1):null),borderColor:BLEU,backgroundColor:BLEU},
    {label:"% EBITDA",data:A.map(a=>v.CA[a]?+(v.EBITDA[a]/v.CA[a]*100).toFixed(1):null),borderColor:ORANGE,backgroundColor:ORANGE},
    {label:"% Résultat net",data:A.map(a=>v.CA[a]?+(v.RESULTAT_NET[a]/v.CA[a]*100).toFixed(1):null),borderColor:VERT,backgroundColor:VERT}]},options:opts});
  mk("g4",{type:"bar",data:{labels,datasets:[
    {label:"Coûts directs",data:A.map(a=>Math.round(-v.COUTS_DIRECTS[a])),backgroundColor:NAVY},
    {label:"Charges de personnel",data:A.map(a=>Math.round(-v.CHARGES_PERSONNEL[a])),backgroundColor:ORANGE},
    {label:"Frais généraux",data:A.map(a=>Math.round(-v.OPEX[a])),backgroundColor:BLEU},
    {label:"Amortissements (nets)",data:A.map(a=>Math.round(-v.DA[a])),backgroundColor:GRIS}]},
    options:{...opts,scales:{x:{stacked:true},y:{stacked:true}}}});
  mk("g2",{type:"line",data:{labels,datasets:[
    {label:"BFR",data:A.map(a=>Math.round(v.BFR[a])),borderColor:NAVY,backgroundColor:NAVY},
    {label:"Trésorerie nette",data:A.map(a=>Math.round(v.TRESORERIE_NETTE[a])),borderColor:ORANGE,backgroundColor:ORANGE}]},options:opts});
}


/* --- projections & valorisation --- */
let projChart=null;
function vueExports(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const carte=(titre,desc,action,bouton)=>`<div class="card"><b>${titre}</b>
    <div class="mut">${desc}</div>
    <button class="btn primary" onclick="${action}">${bouton}</button></div>`;
  return `<h1>Exports</h1>
  <div class="sec-titre">Classeurs Excel</div>
  <div class="grille-exp">
    ${carte("Databook DD (formules)","TBAGR avec mapping modifiable, P&amp;L / Bilan / TFT en formules vivantes, détails par poste avec recherche, contrôles, commentaires, balances sources.","genererDatabook()","Télécharger")}
    ${carte("Classeur états + BP","P&amp;L, bilan actif net, TFT, TBAGR, hypothèses, plan d'affaires 5 ans et valorisation DCF — en valeurs, prêt à retravailler.","exporterExcel()","Télécharger")}
    ${carte("Balance mappée (TBAGR)","Tous les comptes, tous les exercices, avec la ligne de restitution retenue — pour audit du mapping.","exporterExcel(true)","Télécharger")}
  </div>
  <div class="sec-titre">Document PDF</div>
  <div class="grille-exp">
    ${carte("États financiers &amp; analyse (PDF)","Page de garde avec logos, P&amp;L, bilan, TFT officiel, ratios, synthèse du business plan et de la valorisation, commentaires — prêt à diffuser.","exporterPDF()","Générer")}
  </div>
  <div class="sec-titre">Rapports PowerPoint</div>
  <div class="mut" style="margin:-4px 0 10px">Style banque d'affaires Findalyx — natif PowerPoint, entièrement retouchable.
  Les rapports reprennent vos hypothèses (Projections &amp; Valo) et vos corrections de mapping.</div>
  <div class="grille-exp">
    ${carte("Due diligence","Synthèse, performances historiques, situation nette, flux de trésorerie, observations rédigées.","genererRapport('dd')","Générer")}
    ${carte("Business plan","Résumé exécutif, hypothèses, P&amp;L prévisionnel 5 ans, trajectoire de trésorerie.","genererRapport('bp')","Générer")}
    ${carte("Valorisation","Fourchette DCF et multiples, flux actualisés, hypothèses de valorisation.","genererRapport('valo')","Générer")}
  </div>`;
}
function styliserEntete(row,texteCols){
  texteCols=texteCols||1;
  row.eachCell((c,col)=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF172554"}};
    if(col>texteCols)c.alignment={horizontal:"right"};});
}
const NUMFMT='#,##0;(#,##0);"-"';
function nomOnglet(etat){return etat.slice(0,31);}  /* le nom de la société est dans le titre des tableaux */
function finaliserClasseur(wb){
  wb.eachSheet(ws=>{
    ws.views=[{showGridLines:false}];
    if(!ws.getColumn(1).width||ws.getColumn(1).width>3)ws.getColumn(1).width=3;
    ws.eachRow({includeEmpty:false},r=>r.eachCell({includeEmpty:false},c=>{
      c.font=Object.assign({name:"Arial Narrow",size:10},c.font||{});
    }));
  });
}
/* Page d'accueil du classeur (cartouche + navigation) — même style que le databook. */
function construireAccueilClasseur(ws,wb){
  ws.views=[{showGridLines:false}];
  const u=uni();
  const fy=ETATS.annees.map(a=>"FY"+String(a).slice(-2));
  const dateGen=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  let lt=6;
  if(DOSSIER.logo){
    try{
      const ext=(DOSSIER.logo.match(/image\/(png|jpeg|jpg|gif)/)||[,"png"])[1].replace("jpg","jpeg");
      const img=wb.addImage({base64:DOSSIER.logo.split(",")[1],extension:ext});
      ws.addImage(img,{tl:{col:1.1,row:2},ext:{width:170,height:170}});
      lt=14;
    }catch(e){}
  }
  const met=(rn,txt,taille,couleur,gras)=>{const c=ws.getCell(rn,2);c.value=txt;
    c.font={name:"Arial Narrow",size:taille,bold:!!gras,color:{argb:couleur}};};
  met(lt,DOSSIER.societe,30,"FF172554",true);
  met(lt+1,"Modèle financier — états, plan d'affaires et valorisation",16,"FF6B7280");
  met(lt+3,"Exercices "+fy.join(" · ")+"   —   montants en "+u.lib,12,"FF172554");
  const infosG=[(DOSSIER.infos||{}).secteur,(DOSSIER.infos||{}).adresse].filter(Boolean).join(" — ");
  met(lt+4,infosG||"États en formules vivantes reliés à la balance agrégée (TBAGR)",11,"FF6B7280");
  met(lt+6,"Généré le "+dateGen+" par Findalyx Advisory",11,"FF6B7280");
  /* navigation cliquable vers les onglets */
  const ln=lt+9;
  met(ln,"NAVIGATION",12,"FF172554",true);
  let r=ln+1;
  wb.worksheets.forEach(sh=>{
    if(sh===ws||sh.name==="Accueil")return;
    const c=ws.getCell(r,2);
    c.value={text:"▸  "+sh.name,hyperlink:"#'"+sh.name.replace(/'/g,"''")+"'!A1"};
    c.font={name:"Arial Narrow",size:11,color:{argb:"FF0563C1"},underline:true};
    r++;
  });
  /* mode d'emploi */
  const lm=r+1;
  met(lm,"MODE D'EMPLOI",12,"FF172554",true);
  [["1. La colonne Mapping de l'onglet TBAGR (jaune) est modifiable : toute correction recalcule les états."],
   ["2. P&L, Bilan et TFT sont en FORMULES vivantes reliées à la TBAGR."],
   ["3. Les cellules jaunes des Hypothèses BP pilotent le plan d'affaires et la valorisation."],
   ["4. Cliquez sur une ligne de la navigation ci-dessus pour ouvrir l'onglet correspondant."]]
    .forEach((x,k)=>met(lm+1+k,x[0],11,"FF404040"));
  try{
    const lf=wb.addImage({base64:LOGO_FINDALYX_CLAIR.split(",")[1],extension:"png"});
    ws.addImage(lf,{tl:{col:1.1,row:lm+7},ext:{width:150,height:44}});
  }catch(e){}
  ws.columns=[{width:3},{width:110}];
  ws.getRow(lt).height=36;
}
function titreLiasse(ws,sousTitre){
  const r1=ws.addRow([null,DOSSIER.societe]);
  r1.getCell(2).font={bold:true,size:13,color:{argb:"FF172554"}};
  const r2=ws.addRow([null,sousTitre]);
  r2.getCell(2).font={size:10,color:{argb:"FF6B7280"}};
  ws.addRow([]);
}
const FOND_TOTAL={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
async function exporterExcel(seulementTbagr){
  const u=uni(),UF=u.f;
  const NF=u.dec?'#,##0.0;(#,##0.0);"-"':NUMFMT;
  const mnt=x=>(x===null||x===undefined)?null:(u.dec?Math.round(x*UF*10)/10:Math.round(x*UF));
  const wb=new ExcelJS.Workbook();
  const A=ETATS.annees;
  const wsAccueil=seulementTbagr?null:wb.addWorksheet("Accueil");  /* 1er onglet — rempli en fin de génération */
  const entTb=[null,"Mapping","BS/PL","Compte","Libellé",...A.map(a=>"FY"+String(a).slice(-2))];
  const wsT=wb.addWorksheet(nomOnglet("TBAGR"));
  titreLiasse(wsT,"Balance générale agrégée (TBAGR) — "+u.lib);
  styliserEntete(wsT.addRow(entTb),5);
  DOSSIER.tbagr.lignes.forEach(l=>{
    const r=wsT.addRow([null,l.mapping,l.bsPl,l.compte,l.libelle,...A.map(a=>Math.round((l.vals[a]||0)*UF*1000)/1000)]);
    for(let i=6;i<6+A.length;i++)r.getCell(i).numFmt=NF;
  });
  wsT.columns=[{width:3},{width:22},{width:8},{width:14},{width:40},...A.map(()=>({width:14}))];
  if(!seulementTbagr){
    construireEtatsFormules(wb);
  }
  /* ---- Ajustements DD : EBITDA ajusté & BFR normatif ---- */
  if(!seulementTbagr){
    const adj=DOSSIER.adj||{ebitda:[],bfr:[]};
    const wsA=wb.addWorksheet(nomOnglet("Ajustements DD"));
    titreLiasse(wsA,"EBITDA ajusté et BFR normatif — retraitements de due diligence — "+u.lib);
    const JA={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};
    let rn=4;
    const bloc=(titre,baseLib,baseFn,lignes,resLib,pctLib,pctFn)=>{
      const hd=wsA.getRow(rn);
      hd.values=[null,titre,...A.map(a=>"FY"+String(a).slice(-2))];
      styliserEntete(hd,2);rn++;
      const rBase=rn;
      wsA.getRow(rn).values=[null,baseLib,...A.map(a=>mnt(baseFn(a)))];rn++;
      const r0=rn;
      lignes.forEach(l=>{
        const lie=l.comptes&&l.comptes.length;
        const r=wsA.getRow(rn);
        r.values=[null,l.lib+(lie?"  (Σ "+l.comptes.length+" comptes"+(l.sens===-1?", inversé":"")+")":""),
          ...A.map(a=>mnt(valeurAdj(l,a)))];
        if(!lie)for(let c=3;c<3+A.length;c++)r.getCell(c).fill=JA;
        rn++;
      });
      const rTot=rn;
      const rT=wsA.getRow(rn);rT.getCell(2).value="Total des retraitements";
      A.forEach((a,i)=>{const cl=String.fromCharCode(67+i);
        rT.getCell(3+i).value={formula:lignes.length?`SUM(${cl}${r0}:${cl}${rTot-1})`:"0"};});
      rn++;
      const rRes=wsA.getRow(rn);rRes.getCell(2).value=resLib;
      A.forEach((a,i)=>{const cl=String.fromCharCode(67+i);
        rRes.getCell(3+i).value={formula:`${cl}${rBase}+${cl}${rTot}`};});
      rRes.font={bold:true,color:{argb:"FF172554"}};
      for(let c=2;c<3+A.length;c++)rRes.getCell(c).fill=FOND_TOTAL;
      const rRes_=rn;rn++;
      const rP2=wsA.getRow(rn);rP2.getCell(2).value=pctLib;
      A.forEach((a,i)=>{const cl=String.fromCharCode(67+i);
        rP2.getCell(3+i).value={formula:pctFn(cl,rRes_,a)};
        rP2.getCell(3+i).numFmt=pctLib.includes("jours")?'0" j"':'0.0%;(0.0%)';});
      rP2.font={italic:true,color:{argb:"FF808080"}};
      rn+=2;
      for(let r=rBase;r<rn-1;r++)for(let c=3;c<3+A.length;c++)
        if(!wsA.getCell(r,c).numFmt||wsA.getCell(r,c).numFmt==="General")wsA.getCell(r,c).numFmt=NF;
    };
    bloc("EBITDA AJUSTÉ","EBITDA reporté",a=>ETATS.v.EBITDA[a],adj.ebitda,"EBITDA ajusté",
      "% EBITDA ajusté / CA",(cl,r,a)=>`IF(${mnt(ETATS.v.CA[a])}=0,"",${cl}${r}/${mnt(ETATS.v.CA[a])})`);
    bloc("BFR NORMATIF","BFR d'exploitation reporté",a=>ETATS.v.BFR_EXPL[a],adj.bfr,"BFR normatif",
      "BFR normatif en jours de CA",(cl,r,a)=>`IF(${mnt(ETATS.v.CA[a])}=0,"",${cl}${r}/${mnt(ETATS.v.CA[a])}*360)`);
    wsA.columns=[{width:3},{width:52},...A.map(()=>({width:14}))];
  }
  /* ---- Business plan : modèle à FORMULES VIVANTES (bpxl.js) ---- */
  if(!seulementTbagr) construireFeuillesBP(wb);
  if(!seulementTbagr){
    const wsC=wb.addWorksheet(nomOnglet("Commentaires"));
    styliserEntete(wsC.addRow([null,"État","Thème","Commentaire (projet à enrichir)"]),4);
    const C=genererCommentaires(ETATS);
    const noms={pl:"Compte de résultat",bs:"Bilan",tft:"Flux de trésorerie"};
    for(const k of ["pl","bs","tft"]){
      (C[k]||[]).forEach(c=>{const r=wsC.addRow([null,noms[k],c.t,c.x]);r.getCell(4).alignment={wrapText:true};});
      const note=(DOSSIER.notes||{})[k];
      if(note){const r=wsC.addRow([null,noms[k],"Notes de l'analyste",note]);
        r.font={italic:true};r.getCell(4).alignment={wrapText:true};}
    }
    wsC.columns=[{width:3},{width:20},{width:26},{width:110}];
  }
  if(wsAccueil)construireAccueilClasseur(wsAccueil,wb);
  finaliserClasseur(wb);
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=(seulementTbagr?"TBAGR_":"Etats_financiers_")+DOSSIER.societe.replace(/\W+/g,"_")+".xlsx";
  a.click();
  toast("Fichier téléchargé");
}

/* ---------- démarrage : licence d'abord, puis restauration de la société active ---------- */
function demarrerApp(){
  const id=localStorage.getItem(ACTIF_KEY);
  if(id){
    const d=chargerDossiers().find(x=>x.id===id);
    if(d){DOSSIER=d;recalculer();}
  }
  shell();
}
licDemarrer();
