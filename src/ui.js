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
function sauverDossiers(l){
  try{localStorage.setItem("fx_conseil_dossiers",JSON.stringify(l));return true;}
  catch(e){
    /* QuotaExceededError (ou stockage indisponible) : ne pas perdre le travail en silence */
    if(typeof toast==="function")toast("⚠ Sauvegarde impossible : espace de stockage saturé. Exportez une sauvegarde (Paramètres) puis supprimez d'anciens dossiers.");
    try{console.error("localStorage indisponible/saturé",e);}catch(_){}
    return false;
  }
}
function sauverDossier(){
  if(!DOSSIER) return;
  const l=chargerDossiers();
  const i=l.findIndex(d=>d.id===DOSSIER.id);
  /* tbagr est dérivé (reconstruit par recalculer au chargement) : on ne le sérialise pas (évite le double-persist) */
  const {tbagr,...persistable}=DOSSIER;
  if(i>=0) l[i]=persistable; else l.push(persistable);
  sauverDossiers(l);
}
/* ---------- sauvegarde / restauration (les dossiers ne vivent que sur ce poste) ---------- */
function exporterDossiersJSON(){
  const l=chargerDossiers();
  if(!l.length){toast("Aucun dossier à sauvegarder");return;}
  const paquet={format:"findalyx-advisory",version:1,date:new Date().toISOString(),dossiers:l};
  const blob=new Blob([JSON.stringify(paquet)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="Findalyx_sauvegarde_"+new Date().toISOString().slice(0,10)+".json";a.click();
  toast(l.length+" dossier(s) exporté(s)");
}
function importerDossiersJSON(input){
  const f=input.files&&input.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      const arr=Array.isArray(data)?data:(data&&Array.isArray(data.dossiers)?data.dossiers:null);
      if(!arr) throw new Error("format non reconnu (attendu : sauvegarde Findalyx .json)");
      const valides=arr.filter(d=>d&&d.id&&typeof d.societe==="string");
      if(!valides.length) throw new Error("aucun dossier valide dans le fichier");
      const l=chargerDossiers();
      let ajoutes=0,remplaces=0;
      valides.forEach(d=>{const {tbagr,...net}=d;const i=l.findIndex(x=>x.id===net.id);
        if(i>=0){l[i]=net;remplaces++;}else{l.push(net);ajoutes++;}});
      if(sauverDossiers(l)!==false){
        /* si le dossier ouvert vient d'être remplacé, le recharger pour refléter la sauvegarde */
        if(DOSSIER){const maj=chargerDossiers().find(x=>x.id===DOSSIER.id);if(maj){DOSSIER=maj;recalculer();}}
        toast(ajoutes+" dossier(s) ajouté(s), "+remplaces+" remplacé(s)");
        shell();
      }
    }catch(err){toast("Import impossible : "+err.message);}
    input.value="";
  };
  r.readAsText(f);
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
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

/* ---------- calcul ---------- */
function recalculer(){
  if(!DOSSIER)  {ETATS=null;return;}
  if(DOSSIER.sansHistorique){ /* BP sans balance : ETATS synthétique dérivé du modèle d'inducteurs */
    try{ETATS=etatsFromModele(projeterModele(assurerModele()));}catch(e){ETATS=null;}
    return; }
  if(!Array.isArray(DOSSIER.balances)) DOSSIER.balances=[];   /* dossier legacy/corrompu : pas d'écran blanc */
  if(!DOSSIER.balances.length){ETATS=null;return;}
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
  /* en mode « sans balance », les vues d'analyse historique n'ont pas de sens : nav réduite */
  const navList=(DOSSIER&&DOSSIER.sansHistorique)
    ?[NAV[0],{id:"modele",lab:"Business plan",ic:NAV[6].ic},NAV[8],NAV[9]]
    :NAV;
  const items=navList.map(n=>`<div class="item ${VUE===n.id?"active":""}" onclick="aller('${n.id}')">${icone(n.ic)}${n.lab}</div>`).join("");
  document.getElementById("app").innerHTML=`
  <div class="side">
    <div class="logo"><img class="brand-logo" src="${LOGO_FINDALYX}" alt="Findalyx">
    <div class="brandsub">Advisory — Due diligence · BP · Valorisation</div></div>
    <div class="nav">${items}</div>
    <div class="sfoot">Les données restent sur cet ordinateur.</div>
    ${(LIC_ETAT&&LIC_ETAT.exp&&licJoursRestants(LIC_ETAT.exp)!==null&&licJoursRestants(LIC_ETAT.exp)<30)?`
    <div class="lic-foot" onclick="aller('licence')" title="Licence bientôt expirée — voir la licence">
      ⚠ Licence : expire dans ${licJoursRestants(LIC_ETAT.exp)} j</div>`:""}
  </div>
  <div class="main">
    <div class="top">
      <div><div class="name">${DOSSIER?esc(DOSSIER.societe):"Aucun dossier ouvert"}</div>
      <div class="sub">${DOSSIER&&DOSSIER.sansHistorique?"Business plan — projet · saisie en FCFA · affichage en "+uni().lib:(DOSSIER&&DOSSIER.balances.length?DOSSIER.balances.map(b=>"FY"+b.annee).join(" · ")+" — montants en "+uni().lib:"créez ou ouvrez un dossier")}</div></div>
      <div class="right">${barreDroite()}</div>
    </div>
    <div class="view" id="vue"></div>
  </div><div id="modal"></div>`;
  if(!window.__profClose){window.__profClose=true;document.addEventListener("click",function(e){document.querySelectorAll("details.profil[open]").forEach(function(d){var s=d.querySelector("summary");if(s&&s.contains(e.target))return;d.open=false;});});}
  /* accessibilité : Échap ferme la modale ouverte (sinon referme les menus déroulants) */
  if(!window.__escClose){window.__escClose=true;document.addEventListener("keydown",function(e){if(e.key!=="Escape")return;
    var m=document.getElementById("modal");
    if(m&&m.innerHTML.trim()){fermerModal();}
    else{document.querySelectorAll("details.profil[open]").forEach(function(d){d.open=false;});}});}
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
  if(!DOSSIER||!DOSSIER.tbagr) return null;
  const nm=DOSSIER.tbagr.lignes.filter(l=>l.mapping==="NON_MAPPE").length;
  return nm? {cls:"bad",txt:nm+" compte(s) à mapper"} : null;   /* rien quand tout est mappé */
}
/* contenu de la barre d'outils (.top .right) : sélecteurs + chip mapping + avatar.
   Factorisé pour que la mise à jour après un reclassement ne détruise pas les sélecteurs/avatar. */
function barreDroite(){
  const c=chipMapping();
  return `${DOSSIER?selecteurUnite():""}${selecteurSocietes()}${c?`<span class="chip ${c.cls}">${c.txt}</span>`:""}${avatarMenu()}`;
}
/* jours restants avant expiration de la licence */
function licJoursRestants(exp){
  if(!exp) return null;
  const d=Math.ceil((new Date(exp+"T00:00:00")-new Date())/86400000);
  return isFinite(d)?d:null;
}
/* bloc d'infos licence — partagé par le profil (avatar) et les Paramètres */
function infosLicenceHTML(){
  const L=LIC_ETAT;
  if(!L) return '<div class="mut">Licence non vérifiée.</div>';
  const modeLib={proprietaire:"Propriétaire",secours:"Hors ligne (secours)"}[L.mode]||"En ligne";
  const jr=licJoursRestants(L.exp), used=chargerDossiers().length, max=L.maxSoc||0;
  const r=(k,v,cls)=>`<div class="lic-row"><span class="lic-k">${k}</span><span class="lic-v ${cls||""}">${v}</span></div>`;
  return `<div class="lic-info">
    ${r("Titulaire de la licence",esc(L.customer||"—"))}
    ${r("Statut","Actif","ok")}
    ${r("Vérification",modeLib,"ok")}
    ${L.exp?r("Expire le",esc(L.exp)):""}
    ${jr!==null?r("Jours restants",jr+" jour"+(jr>1?"s":""),jr<30?"warn":""):""}
    ${max?r("Sociétés analysées",used+" / "+max):""}</div>`;
}
function initialesLic(){
  const n=(LIC_ETAT&&LIC_ETAT.customer||"").trim();
  if(!n) return "FX";
  const p=n.split(/\s+/);
  return ((p[0][0]||"")+(p.length>1?p[p.length-1][0]:(p[0][1]||""))).toUpperCase();
}
function avatarMenu(){
  const sysco=(LIC_ETAT&&(LIC_ETAT.produit==="tous"||LIC_ETAT.mode==="proprietaire"))?`<a class="pm-item" onclick="window.open(URL_SYSCO,'_blank')">Ouvrir Findalyx Sysco ↗</a>`:"";
  return `<details class="profil"><summary class="avatar" title="Profil et licence">${initialesLic()}</summary>
    <div class="profil-menu">
      <div class="pm-head">${esc(nomCabinet()||(LIC_ETAT&&LIC_ETAT.customer)||"Findalyx")}</div>
      <a class="pm-item" onclick="aller('licence')">Licence &amp; cabinet</a>
      ${sysco}
      <div class="pm-sep"></div>
      <a class="pm-item pm-danger" onclick="deconnexion()">Déconnexion</a>
    </div></details>`;
}
function deconnexion(){
  if(!confirm("Se déconnecter ? La licence sera oubliée sur cet appareil (vos dossiers restent enregistrés)."))return;
  try{localStorage.removeItem("fxc_licence");}catch(e){}
  location.reload();
}
/* ---------- cabinet : coordonnées de l'analyste, reprises dans les exports ---------- */
function chargerCabinet(){try{return JSON.parse(localStorage.getItem("fxc_cabinet")||"{}")||{};}catch(e){return {};}}
function majCabinet(k,val){const c=chargerCabinet();c[k]=typeof val==="string"?val.trim():val;try{localStorage.setItem("fxc_cabinet",JSON.stringify(c));}catch(e){}}
function nomCabinet(){return chargerCabinet().cabinet||"";}
/* nom à afficher dans les exports : cabinet configuré, sinon titulaire de la licence */
function cabinetExport(){return nomCabinet()||((typeof LIC_ETAT!=="undefined"&&LIC_ETAT&&LIC_ETAT.customer)||"");}
/* logo du cabinet pour les exports : {data (PNG), ratio largeur/hauteur} ou null */
function logoCab(){const c=chargerCabinet();return c.logo?{data:c.logo,ratio:c.logoRatio||3.4}:null;}
function chargerLogoCabinet(inp){
  const f=inp.files&&inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{const img=new Image();img.onload=()=>{
    const k=Math.min(1,400/Math.max(img.width,img.height));
    const cv=document.createElement("canvas");
    cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    majCabinet("logo",cv.toDataURL("image/png"));majCabinet("logoRatio",cv.width/cv.height);
    rendre();toast("Logo du cabinet enregistré — repris dans les exports");
  };img.src=r.result;};
  r.readAsDataURL(f);
}
function carteCabinet(){
  const c=chargerCabinet();
  const logoCtl=`<div class="row" style="margin-bottom:14px">
    ${c.logo?`<img src="${c.logo}" style="height:46px;border:1px solid #eceff3;border-radius:6px;padding:3px;background:#fff">`:'<span class="mut">Aucun logo de cabinet.</span>'}
    <label class="btn sm">${c.logo?"Changer le logo":"Charger un logo"}<input type="file" accept="image/*" style="display:none" onchange="chargerLogoCabinet(this)"></label>
    ${c.logo?`<button class="btn sm" onclick="majCabinet('logo','');majCabinet('logoRatio','');rendre()">Retirer</button>`:""}</div>`;
  const champs=[["cabinet","Cabinet / raison sociale","ex. Cabinet Sawadogo & Associés"],
    ["analyste","Analyste / signataire","ex. Salif Sawadogo"],
    ["adresse","Adresse","ex. Dakar, Sénégal"],
    ["telephone","Téléphone","ex. +221 …"],
    ["email","E-mail","ex. contact@moncabinet.com"]];
  const lignes=champs.map(([k,lab,ph])=>`<div class="hyp-l"><span>${lab}</span>
    <input class="sel" style="width:52%" placeholder="${esc(ph)}" value="${esc(c[k]||"")}"
      onchange="majCabinet('${k}',this.value)"></div>`).join("");
  return `<div class="card"><div class="sec-titre" style="margin-top:0">Mon cabinet — logo &amp; coordonnées dans les exports</div>
    <div class="mut" style="margin-bottom:10px">Logo, cabinet, analyste et coordonnées apparaissent sur les pages de garde et pieds de page des rapports (PDF, PowerPoint, databook), à la place de « Findalyx ». Laissez vide pour ne rien afficher.</div>
    ${logoCtl}${lignes}</div>`;
}
function cleLicence(){try{return localStorage.getItem("fxc_licence")||"";}catch(e){return "";}}
function copierCleFallback(k){
  const t=document.createElement("textarea");t.value=k;t.style.position="fixed";t.style.opacity="0";
  document.body.appendChild(t);t.select();
  try{document.execCommand("copy");toast("Clé de licence copiée");}catch(e){toast("Copie impossible — sélectionnez puis copiez à la main");}
  document.body.removeChild(t);
}
function copierCle(){
  const k=cleLicence();
  if(!k){toast("Aucune clé enregistrée");return;}
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(k).then(()=>toast("Clé de licence copiée"),()=>copierCleFallback(k));
  else copierCleFallback(k);
}
function afficherCle(btn){const i=document.getElementById("licKeyInput");if(!i)return;if(i.type==="password"){i.type="text";btn.textContent="Masquer";}else{i.type="password";btn.textContent="Afficher";}}
function vueLicence(){
  return `<h1>Licence &amp; cabinet</h1>
  <div class="deux">
    <div class="card"><div class="sec-titre" style="margin-top:0">Abonnement Findalyx</div>
      ${infosLicenceHTML()}
      <div style="margin-top:12px">
        <div class="lic-k" style="margin-bottom:5px">Clé de licence</div>
        <div style="display:flex;gap:8px">
          <input id="licKeyInput" class="sel" type="password" style="flex:1;font-family:monospace;font-size:11px" readonly value="${esc(cleLicence())}" onclick="this.select()" title="Cliquez pour tout sélectionner">
          <button class="btn sm" onclick="afficherCle(this)">Afficher</button>
          <button class="btn sm" onclick="copierCle()">Copier</button></div></div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn sm" onclick="licChanger()">Renouveler / nouvelle clé</button>
        <button class="btn sm danger" onclick="deconnexion()">Déconnexion</button></div></div>
    ${carteCabinet()}
  </div>`;
}
function aller(v){
  if(v!=="accueil"&&v!=="licence"&&!DOSSIER){toast("Ouvrez d'abord un dossier");return;}
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
  else if(VUE==="bp"){el.innerHTML=vueBP();if(SOUS_BP==="analyse")dessinerBPGraphs();}
  else if(VUE==="valo"){el.innerHTML=vueValo();dessinerFootball();}
  else if(VUE==="params") el.innerHTML=vueParams();
  else if(VUE==="licence") el.innerHTML=vueLicence();
  else if(VUE==="exports") el.innerHTML=vueExports();
  else if(VUE==="wizard") el.innerHTML=vueWizard();
  else if(VUE==="modele"){el.innerHTML=vueModele();if(SOUS_MODELE==="valo")dessinerFootball();}
  document.querySelectorAll("#vue select[data-compte]").forEach(s=>{s.value=s.dataset.val;});
}

/* --- accueil --- */
/* Catégories de restitution — partagées par le mapping, le moteur et le databook */
const GROUPES_MAP=[
 {etat:"PL",lib:"Chiffre d'affaires",agregat:"CA",codes:["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES"]},
 {etat:"PL",lib:"Coûts directs",agregat:"COUTS_DIRECTS",codes:["ACHATS_MARCH","ACHATS_MP","VARIATION_STOCKS"]},
 {etat:"PL",lib:"Subventions et autres produits",agregat:"AUTRES_PROD",codes:["SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS"]},
 {etat:"PL",lib:"Frais généraux",agregat:"OPEX",codes:["AUTRES_ACHATS","SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT","IMPOTS_TAXES","AUTRES_CHARGES"]},
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
      <div><b>${esc(d.societe)}</b><div class="mut">${d.sansHistorique?"Business plan — projet":(d.balances.length+" balance(s)"+(d.balances.length?" — FY"+Math.min(...d.balances.map(b=>b.annee))+" à FY"+Math.max(...d.balances.map(b=>b.annee)):""))}</div></div>
      <div><button class="btn primary sm" onclick="ouvrirDossier('${d.id}')">Ouvrir</button>
      <button class="btn sm" onclick="renommerDossier('${d.id}')">Renommer</button>
      <button class="btn sm" onclick="supprimerDossier('${d.id}')">Supprimer</button></div>
    </div>`).join("");
  let synth="";
  if(DOSSIER&&ETATS&&!DOSSIER.sansHistorique){
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
    <button class="btn sm" style="margin-left:auto" onclick="creerModelePrompt()">+ Projet</button>
    <button class="btn sm primary" onclick="ouvrirWizard()">+ Nouvelle société</button>
  </div>`;
  const creation=`<div class="card">
    <b>Dossier avec comptabilité</b>
    <div class="mut" style="margin:6px 0 12px">Assistant guidé : secteur, informations, balances, puis lancement de l'analyse (due diligence, business plan, valorisation).</div>
    <button class="btn primary" onclick="ouvrirWizard()">Créer avec des balances (assistant)</button>
  </div>`;
  const creationModele=`<div class="card">
    <b>Business plan — projet</b>
    <div class="mut" style="margin:6px 0 12px">Pas de comptabilité à importer ? Construisez le plan à partir d'inducteurs (volumes, prix, coûts) — idéal pour une startup ou un projet nouveau.</div>
    <div class="row" style="gap:8px"><input id="nouvNomModele" class="sel" placeholder="Nom de la société" style="flex:1">
    <button class="btn primary" onclick="creerModele()">Créer le projet</button></div>
  </div>`;
  return `<h1>Accueil</h1>
  ${synth}
  ${barre}
  ${ouverte?`<div class="deux">${creation}${creationModele}</div>`+(cartes||'<div class="mut" style="padding:14px 4px">Aucun dossier. Créez le premier ci-dessus.</div>'):""}`;
}
function creerModelePrompt(){
  const nom=prompt("Nom de la société (business plan — projet) :");
  if(nom&&nom.trim())creerModele(nom.trim());
}
async function creerModele(nom){
  if(!nom){const el=document.getElementById("nouvNomModele");nom=el?el.value.trim():"";}
  if(!nom){toast("Entrez un nom de société");return;}
  const id="d"+Date.now();
  const q=await licAjouterSociete(id,nom);
  if(!q.ok){toast("Quota atteint : votre licence permet "+q.max+" société(s) ("+q.used+" utilisées).");return;}
  DOSSIER={id:id,societe:nom,secteur:"Général",balances:[],overrides:{},sansHistorique:true,modele:modeleParDefaut()};
  recalculer();sauverDossier();localStorage.setItem(ACTIF_KEY,DOSSIER.id);SOUS_MODELE="rev";VUE="modele";shell();
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
  /* aligner la vue sur le type de dossier (évite d'ouvrir « modèle » sur un dossier avec balances et vice-versa) */
  if(!garderVue || (DOSSIER.sansHistorique&&VUE!=="modele"&&VUE!=="params") || (!DOSSIER.sansHistorique&&VUE==="modele"))
    VUE=DOSSIER.sansHistorique?"modele":(DOSSIER.balances.length?"etats":"import");
  shell();
}
function supprimerDossier(id){
  if(!confirm("Supprimer ce dossier ?"))return;
  try{licRetirerSociete(id);}catch(e){}
  sauverDossiers(chargerDossiers().filter(d=>d.id!==id));
  if(DOSSIER&&DOSSIER.id===id){DOSSIER=null;ETATS=null;localStorage.removeItem(ACTIF_KEY);}
  shell();
}
/* renommer la société : dossier actif → via DOSSIER + sauverDossier ; sinon met à jour la liste persistée */
function renommerDossier(id){
  const actif=(DOSSIER&&DOSSIER.id===id);
  const l=chargerDossiers(), d=l.find(x=>x.id===id);
  if(!actif && !d)return;
  const n=prompt("Nouveau nom de la société :",(actif?DOSSIER.societe:d.societe)||"");
  if(n==null)return;
  const nom=n.trim(); if(!nom){toast("Nom vide : renommage annulé");return;}
  if(actif){ DOSSIER.societe=nom; sauverDossier(); }
  else { d.societe=nom; sauverDossiers(l); }
  rendre();
}
function mRenommer(val){ if(!DOSSIER)return; const n=(val||"").trim(); if(!n){toast("Nom vide ignoré");rendre();return;} DOSSIER.societe=n; sauverDossier(); rendre(); }

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
   ${blocFormatBalance()}
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
    <td><span class="chip ${eq?"ok":"bad"}">${eq?"équilibrée":"écart "+fmt(b.controle.ecart/1000)+" "+uni().suf}</span>${b.controle.lignesIgnorees?` <span class="chip bad" title="${esc((b.controle.echIgnorees||[]).join(' · '))}">⚠ ${b.controle.lignesIgnorees} ignorée(s)</span>`:""}</td>
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
    ${blocFormatBalance()}
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
      toast("Balance FY"+annee+" ajoutée ("+res.controle.nb+" comptes)"+msgIgnorees(res.controle));return;
    }
    DOSSIER.balances=DOSSIER.balances.filter(x=>x.annee!==annee);
    DOSSIER.balances.push(b);
    recalculer();sauverDossier();
    /* le business plan est calibré sur l'historique : s'il a changé, proposer de le recalculer */
    if(typeof bpDesynchronise==="function"&&bpDesynchronise()&&confirm("Les données historiques ont changé. Recalculer les hypothèses du business plan depuis le nouvel historique ?\n\n(Vos éventuelles saisies manuelles du BP seront remplacées ; sinon un rappel restera dans l'onglet Business plan.)")){
      DOSSIER.bp=null;assurerBP();sauverDossier();
    }
    shell();
    toast("Balance FY"+annee+" importée ("+res.controle.nb+" comptes)"+msgIgnorees(res.controle));
  }catch(err){toast("Erreur : "+err.message);}
}
/* message d'alerte quand des lignes porteuses de montants n'ont pas été importées (compte non reconnu) */
function msgIgnorees(ctl){
  if(!ctl||!ctl.lignesIgnorees) return "";
  return " — ⚠ "+ctl.lignesIgnorees+" ligne(s) avec montant non importée(s) : n° de compte non reconnu";
}
function retirerBalance(annee){
  if(WIZ&&VUE==="wizard"){WIZ.balances=WIZ.balances.filter(b=>b.annee!==annee);shell();return;}
  DOSSIER.balances=DOSSIER.balances.filter(b=>b.annee!==annee);
  recalculer();sauverDossier();shell();
}
/* Aide « format attendu » + bouton de modèle, partagé par les 2 écrans d'import. */
function blocFormatBalance(){
  return `<div class="row" style="margin-top:8px">
    <button class="btn" onclick="telechargerModeleBalance()">⬇ Télécharger un modèle de balance</button>
  </div>
  <details style="margin-top:8px">
    <summary class="mut" style="cursor:pointer">Format attendu &amp; colonnes nécessaires</summary>
    <div class="mut" style="margin-top:8px;line-height:1.6">
      <b>Colonnes minimales</b> (les intitulés sont reconnus automatiquement, l'ordre ci-dessous est recommandé) :<br>
      • <b>Compte</b> — numéro à <b>2 à 10 chiffres</b> (ex. 601100), sans lettres, points ni tirets<br>
      • <b>Libellé</b> — intitulé du compte<br>
      • <b>Débit</b> et <b>Crédit</b> — le solde, en <b>nombres simples</b> (pas de « FCFA » ni symbole ; un compte a un solde au débit <i>ou</i> au crédit)<br>
      <b>Variantes acceptées :</b> une seule colonne <b>Solde</b> signé (crédit en négatif) ; ou balance détaillée à <b>8 colonnes</b> (SI / Mouvement / Solde, chacun en débit &amp; crédit).<br>
      Les sous-totaux (libellés « TOTAL… ») et comptes-chapeaux sont exclus automatiquement. Le total des débits doit égaler le total des crédits.
    </div>
  </details>`;
}
/* Génère un classeur modèle de balance (feuille à remplir + format détaillé + instructions). */
async function telechargerModeleBalance(){
  if(typeof ExcelJS==="undefined"){toast("Bibliothèque Excel non chargée");return;}
  const wb=new ExcelJS.Workbook(), NF='#,##0;(#,##0);"-"', navy="FF172554";
  const ent=(row,n)=>row.eachCell((c,col)=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:navy}};if(col>n)c.alignment={horizontal:"right"};});
  /* comptes d'exemple SYSCOHADA — équilibrés (total débit = total crédit) */
  const D=[
    ["101000","Capital social",0,50000000],["106000","Réserves",0,10000000],
    ["211000","Frais de développement",3000000,0],["241000","Matériel et outillage",40000000,0],
    ["284100","Amortissements du matériel",0,12000000],["311000","Stocks de marchandises",15000000,0],
    ["401000","Fournisseurs",0,18000000],["411000","Clients",28000000,0],
    ["521000","Banques",9000000,0],["571000","Caisse",1000000,0],
    ["601000","Achats de marchandises",73000000,0],["605000","Autres achats",8000000,0],
    ["622000","Locations",6000000,0],["631000","Frais bancaires",1500000,0],
    ["641000","Impôts et taxes",2500000,0],["661000","Charges de personnel",22000000,0],
    ["671000","Charges financières",3000000,0],["681000","Dotations aux amortissements",6000000,0],
    ["701000","Ventes de marchandises",0,120000000],["706000","Prestations de services",0,8000000],
  ];
  /* Feuille 1 — Balance (simple, à remplir) */
  const ws=wb.addWorksheet("Balance"); ws.views=[{state:"frozen",ySplit:1}];
  ent(ws.addRow(["Compte","Libellé","Débit","Crédit"]),2);
  D.forEach(r=>{const row=ws.addRow(r);row.getCell(3).numFmt=NF;row.getCell(4).numFmt=NF;});
  const tot=ws.addRow(["","TOTAL (doit être équilibré)",{formula:`SUM(C2:C${D.length+1})`},{formula:`SUM(D2:D${D.length+1})`}]);
  tot.font={bold:true};tot.getCell(3).numFmt=NF;tot.getCell(4).numFmt=NF;
  ws.columns=[{width:12},{width:40},{width:18},{width:18}];
  /* Feuille 2 — Format détaillé (8 colonnes) */
  const ws2=wb.addWorksheet("Format détaillé"); ws2.views=[{state:"frozen",ySplit:1}];
  ent(ws2.addRow(["Compte","Libellé","SI débit","SI crédit","Mouvement débit","Mouvement crédit","Solde débit","Solde crédit"]),2);
  D.forEach(r=>{const row=ws2.addRow([r[0],r[1],0,0,r[2],r[3],r[2],r[3]]);for(let c=3;c<=8;c++)row.getCell(c).numFmt=NF;});
  ws2.columns=[{width:12},{width:40},...Array(6).fill({width:15})];
  /* Feuille 3 — Instructions */
  const wi=wb.addWorksheet("Instructions"); wi.views=[{showGridLines:false}];
  const H=(rn,t,sz,co,gr)=>{const c=wi.getCell(rn,2);c.value=t;c.font={name:"Arial",size:sz,bold:!!gr,color:{argb:co}};};
  H(2,"Modèle de balance générale — Findalyx Advisory",16,navy,true);
  ["",
   "COLONNES NÉCESSAIRES (feuille « Balance ») :",
   "• Compte — numéro de compte : 2 à 10 CHIFFRES uniquement (ex. 601100). Pas de lettres, points ni tirets.",
   "• Libellé — intitulé du compte (texte).",
   "• Débit — solde débiteur, en nombre simple (pas de « FCFA » ni symbole).",
   "• Crédit — solde créditeur. Un compte a un solde au débit OU au crédit.",
   "",
   "VARIANTES ACCEPTÉES :",
   "• Solde signé : une seule colonne « Solde » (débit positif, crédit négatif).",
   "• Balance détaillée : 8 colonnes (feuille « Format détaillé ») — SI / Mouvement / Solde, en débit et crédit.",
   "",
   "RÈGLES :",
   "• Un fichier (ou une feuille) = un exercice.",
   "• Les intitulés de colonnes sont détectés automatiquement ; l'ordre ci-dessus est recommandé.",
   "• Les sous-totaux (libellés « TOTAL… ») et comptes-chapeaux sont exclus automatiquement.",
   "• Le total des débits doit égaler le total des crédits (contrôle affiché après l'import).",
   "",
   "→ Remplacez les lignes d'exemple de la feuille « Balance » par vos comptes, puis importez le fichier dans Findalyx Advisory.",
  ].forEach((t,i)=>{const sect=/:$/.test(t);H(4+i,t,11,sect?navy:"FF404040",sect);});
  wi.columns=[{width:3},{width:120}];
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="Modele_balance_Findalyx.xlsx";a.click();
  toast("Modèle de balance téléchargé");
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
  const br=document.querySelector(".top .right");   /* rebâtir toute la barre (chip gardé) sans effacer sélecteurs/avatar */
  if(br)br.innerHTML=barreDroite();
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
  AUTRES_CREANCES_HE:["AUTRES_CREANCES","HAO_ACTIF"],
  AUTRES_DETTES_HE:["AUTRES_DETTES","HAO_PASSIF"],
  CA:["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES"],
  COUTS_DIRECTS:["ACHATS_MARCH","ACHATS_MP","VARIATION_STOCKS"],
  MARGE_BRUTE:["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES","ACHATS_MARCH","ACHATS_MP","VARIATION_STOCKS"],
  AUTRES_PROD:["SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS"],
  SERVICES_EXT:["SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM",
        "FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","AUTRES_SERV_EXT"],
  OPEX:["AUTRES_ACHATS","SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM",
        "FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT",
        "IMPOTS_TAXES","AUTRES_CHARGES"],
  FRAIS_GENERAUX:["AUTRES_ACHATS","SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM",
        "FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT",
        "IMPOTS_TAXES","AUTRES_CHARGES","CHARGES_PERSONNEL"],
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
    ||(COMPOSITION[code]&&(GROUPES_MAP.find(g=>g.agregat===pp.agregat)||{codes:[]}).codes.some(c=>base.includes(c)))
  ).map(pp=>pp.code);
  return [...base,...extra];
}
/* une ligne n'est cliquable que si sa composition résout vers au moins un compte réel de la balance
   (sinon un sous-total calculé — EBITDA, EBIT, résultat net… — ouvrirait un drill-down vide) */
function drillable(code){
  if(!DOSSIER||!DOSSIER.tbagr) return false;
  const cs=codesDe(code);
  return DOSSIER.tbagr.lignes.some(l=>cs.includes(l.mapping));
}
const AGGS_PL=new Set(["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","SERVICES_EXT","OPEX","FRAIS_GENERAUX","CHARGES_PERSONNEL",
  "EBITDA","DA","EBIT","RESULTAT_FIN","RAO","RESULTAT_HAO","RESULTAT_AVANT_IMPOT","IMPOTS","RESULTAT_NET"]);
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
    const dr=drillable(d.code);
    return `<tr class="${d.st||""}${d.detail?" det":""}${dr?" cliquable":""}"${dr?` onclick="detailLigne('${d.code}','${d.lib.replace(/'/g,"\\'")}')" title="Voir les comptes"`:""}>
      <td>${esc(d.lib)}${dr?'<span class="chev">›</span>':""}</td>
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
  /* — Autres produits (repliés en une ligne) — */
  {code:"AUTRES_PROD",lib:"Autres produits",toujours:true},
  /* — Frais généraux (personnel inclus) — */
  {code:"AUTRES_ACHATS",lib:"Autres achats",detail:true},
  {code:"TRANSPORTS",lib:"Transports",detail:true},
  {code:"SERVICES_EXT",lib:"Services extérieurs",detail:true},
  {code:"IMPOTS_TAXES",lib:"Impôts et taxes",detail:true},
  {code:"AUTRES_CHARGES",lib:"Autres charges",detail:true},
  {code:"CHARGES_PERSONNEL",lib:"Charges de personnel",detail:true},
  {code:"FRAIS_GENERAUX",lib:"Frais généraux",st:"stot",toujours:true},
  /* — EBITDA — */
  {code:"EBITDA",lib:"EBITDA",st:"total",toujours:true},
  {code:"DA",lib:"Dotations et reprises (nettes)",toujours:true},
  {code:"EBIT",lib:"EBIT",st:"total",toujours:true},
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
];
/* DEF_PL avec les lignes personnalisées insérées avant le sous-total de leur agrégat
   (mêmes règles que le databook) — visibles en vue détaillée. */
function defPL(){
  const perso=(DOSSIER&&DOSSIER.lignesPerso||[]).filter(x=>x.etat==="PL");
  if(!perso.length) return DEF_PL;
  const CIBLE={CA:"CA",COUTS_DIRECTS:"COUTS_DIRECTS",AUTRES_PROD:"EBITDA",OPEX:"FRAIS_GENERAUX",
    CHARGES_PERSONNEL:"FRAIS_GENERAUX",DA:"EBIT",RESULTAT_FIN:"RESULTAT_FIN",
    RESULTAT_HAO:"RESULTAT_HAO",IMPOTS:"RESULTAT_NET"};
  const out=DEF_PL.slice();
  perso.forEach(pp=>{
    const cible=CIBLE[pp.agregat]||"EBITDA";
    const i=out.findIndex(d=>d.code===cible&&d.st);
    if(i>=0) out.splice(i,0,{code:pp.code,lib:pp.lib,detail:true});
  });
  return out;
}
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
  {code:"AUTRES_CREANCES_HE",lib:"Autres créances"},
  {code:"AUTRES_DETTES_HE",lib:"Autres dettes"},
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
/* --- blocs de ratios (même style que le P&L : FY + Δ, sous chaque état) --- */
function fmtRatioV(v,unit){
  if(v===null||v===undefined||!isFinite(v)) return "-";
  if(unit==="j") return Math.round(v)+" j";
  const dec=unit==="%"?1:2;
  return (Math.round(v*Math.pow(10,dec))/Math.pow(10,dec)).toString().replace(".",",")+(unit==="%"?" %":" ×");
}
function fmtRatioD(prev,next,unit){
  if(prev===null||next===null||prev===undefined||next===undefined||!isFinite(prev)||!isFinite(next)) return "-";
  const d=next-prev;
  if(unit==="%"){const pb=Math.round(d*100);return (pb>0?"+":"")+pb+" pb";}
  if(unit==="j"){const j=Math.round(d);return (j>0?"+":"")+j+" j";}
  const x=Math.round(d*100)/100;return (x>0?"+":"")+x.toString().replace(".",",")+" ×";
}
function blocRatios(titre,items,annees){
  const A=annees||ETATS.annees, n=A.length;
  if(!items.length||n<1) return "";
  const th=A.map(a=>`<th class="num">FY${String(a).slice(-2)}</th>`).join("")
    +A.slice(1).map((a,i)=>`<th class="num delta">Δ${String(A[i]).slice(-2)}-${String(a).slice(-2)}</th>`).join("")
    +(n>2?'<th class="num delta">CAGR</th>':"");
  const lignes=items.map(it=>{
    const m=A.map(a=>it.vals[a]===undefined?null:it.vals[a]);
    const fy=m.map(v=>`<td class="num">${fmtRatioV(v,it.unit)}</td>`).join("");
    const dl=A.slice(1).map((a,i)=>`<td class="num delta">${fmtRatioD(m[i],m[i+1],it.unit)}</td>`).join("");
    return `<tr class="pct"><td>${esc(it.lab)}</td>${fy}${dl}${n>2?'<td class="num delta"></td>':""}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0;margin-top:12px">
    <div class="bande">${esc(titre)}</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${uni().lib}</th>${th}</tr>${lignes}</table></div></div>`;
}
function blocRatiosMarge(){
  const A=ETATS.annees, v=ETATS.v;
  const px=fn=>{const o={};A.forEach(a=>{const x=fn(a);o[a]=(x===null||x===undefined||!isFinite(x))?null:x;});return o;};
  const surCA=code=>px(a=>v.CA[a]?v[code][a]/v.CA[a]*100:null);
  return blocRatios("Ratios du compte de résultat",[
    {lab:"Marge brute / CA",unit:"%",vals:surCA("MARGE_BRUTE")},
    {lab:"Marge d'EBITDA",unit:"%",vals:surCA("EBITDA")},
    {lab:"Marge d'exploitation (EBIT)",unit:"%",vals:surCA("EBIT")},
    {lab:"Marge nette",unit:"%",vals:surCA("RESULTAT_NET")},
    {lab:"Frais généraux (overhead) / CA",unit:"%",vals:px(a=>v.CA[a]?-v.FRAIS_GENERAUX[a]/v.CA[a]*100:null)},
    {lab:"Charges de personnel / CA",unit:"%",vals:px(a=>v.CA[a]?-v.CHARGES_PERSONNEL[a]/v.CA[a]*100:null)},
    {lab:"Taux d'impôt effectif",unit:"%",vals:px(a=>v.RESULTAT_AVANT_IMPOT[a]?-v.IS[a]/v.RESULTAT_AVANT_IMPOT[a]*100:null)}]);
}
function blocRatiosBilan(){
  const R=calculerRatios(ETATS).ratios.filter(r=>!["margeBrute","margeEbitda","margeNette"].includes(r.k));
  return blocRatios("Ratios de structure, rentabilité et liquidité",
    R.map(r=>({lab:r.lab,unit:r.unit,vals:r.vals})));
}
function blocRatiosTFT(){
  const A=ETATS.annees; if(A.length<2) return "";
  const cols=A.slice(1), v=ETATS.v, t=ETATS.tft;
  const mk=fn=>{const o={};cols.forEach(a=>{const x=fn(a);o[a]=(x===null||x===undefined||!isFinite(x))?null:x;});return o;};
  return blocRatios("Ratios de flux et de trésorerie",[
    {lab:"Capacité d'autofinancement (CAFG) / CA",unit:"%",vals:mk(a=>v.CA[a]?t[a].FA/v.CA[a]*100:null)},
    {lab:"Conversion en cash (flux d'exploitation / EBITDA)",unit:"%",vals:mk(a=>v.EBITDA[a]?t[a].ZB/v.EBITDA[a]*100:null)},
    {lab:"Free cash flow / CA (exploitation + investissement)",unit:"%",vals:mk(a=>v.CA[a]?(t[a].ZB+t[a].ZC)/v.CA[a]*100:null)},
    {lab:"Capacité de remboursement (dette financière / CAFG)",unit:"x",vals:mk(a=>t[a].FA>0?-v.DETTES_FINANCIERES[a]/t[a].FA:null)},
    {lab:"Couverture des investissements (flux d'exploitation / investissements)",unit:"x",vals:mk(a=>t[a].ZC?t[a].ZB/Math.abs(t[a].ZC):null)}],cols);
}
function vueEtats(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const tabs=[["pl","Compte de résultat"],["bs","Bilan (actif net)"],["tft","Flux de trésorerie"],["adj","EBITDA ajusté & BFR normatif"]]
    .map(([id,lab])=>`<button class="btn ${SOUS_ETAT===id?"primary":""}" onclick="SOUS_ETAT='${id}';rendre()">${lab}</button>`).join(" ");
  let corps="";
  if(SOUS_ETAT==="pl") corps=tableEtat(defPL(),"Compte de résultat analytique");
  else if(SOUS_ETAT==="bs") corps=tableEtat(DEF_BS,"Bilan — présentation actif net");
  else if(SOUS_ETAT==="tft") corps=tableTFT();
  else corps=vueAjustements();
  const vueBtn=SOUS_ETAT==="pl"?`<div class="segvue">
    <button class="${PL_VUE==="synth"?"on":""}" onclick="PL_VUE='synth';rendre()">Synthétique</button>
    <button class="${PL_VUE==="detail"?"on":""}" onclick="PL_VUE='detail';rendre()">Détaillée</button></div>`:"";
  return `<h1>États financiers</h1>
  <div class="row" style="margin-bottom:12px;align-items:center">${tabs}${vueBtn}</div>${corps}${SOUS_ETAT==="pl"?blocRatiosMarge():SOUS_ETAT==="bs"?blocRatiosBilan():SOUS_ETAT==="tft"?blocRatiosTFT():""}${blocCommentaires()}`;
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
    <div class="card sc"><div class="sc-haut"><div><div class="sc-lab">Notation Findalyx <span class="sc-info" data-tip="Score propriétaire Findalyx sur 100 : moyenne pondérée de la Profitabilité (30 %), la Liquidité (30 %) et la Solvabilité (40 %). Chaque dimension agrège ses ratios, normalisés sur le benchmark sectoriel ou, à défaut, des seuils internes. Note de A (excellent) à E (critique).">!</span></div><div class="sc-sub">Profitabilité · Liquidité · Solvabilité</div></div>
      <div class="sc-grade ${N.ton}">${N.grade}<span>${N.global}/100</span></div></div>
      <div class="sc-mention ${N.ton}">${N.mention}</div>
      ${bar("Profitabilité",N.prof)}${bar("Liquidité",N.liq)}${bar("Solvabilité",N.solv)}</div>
    <div class="card sc"><div class="sc-haut"><div><div class="sc-lab">Altman Z-Score <span class="sc-info" data-tip="Modèle d'Altman version marchés émergents (Z'' 1995), estime le risque de défaillance : Z = 3,25 + 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4, où X1 = fonds de roulement / actif, X2 = report à nouveau / actif, X3 = EBIT / actif, X4 = capitaux propres / dettes. Zone sûre au-delà de 2,6 ; grise de 1,1 à 2,6 ; détresse en-deçà.">!</span></div><div class="sc-sub">Risque de défaillance (EMS 1995)</div></div>
      <div class="sc-grade ${Z.ton}">${Z.grade}<span>Z = ${Z.z}</span></div></div>
      <div class="sc-mention ${Z.ton}">Zone ${Z.zone}</div>
      ${Z.comp.map(c=>`<div class="sc-dim"><span>${c.k}</span><b>${(Math.round(c.v*100)/100).toFixed(2)}</b></div>`).join("")}</div>
    <div class="card sc"><div class="sc-haut"><div><div class="sc-lab">Cotation BCEAO <span class="sc-info" data-tip="Grille de bankabilité inspirée des normes BCEAO / UEMOA : 4 critères — liquidité générale ≥ 1, capacité de remboursement ≤ 4 ans, marge nette positive, autonomie financière ≥ 20 %. La cote (A à E) correspond au nombre de critères respectés (4 à 0).">!</span></div><div class="sc-sub">Bankabilité — normes UEMOA</div></div>
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
  const carte=(titre,desc,action,bouton)=>`<div class="card"><b>${titre}</b>
    <div class="mut">${desc}</div>
    <button class="btn primary" onclick="${action}">${bouton}</button></div>`;
  if(DOSSIER&&DOSSIER.sansHistorique){
    return `<h1>Exports</h1>
    <div class="mut" style="margin-bottom:12px">Business plan — projet : les exports reprennent vos inducteurs, le montage de financement (Sources &amp; Emplois) et la valorisation. Les analyses historiques (due diligence, databook, balance mappée) ne s'appliquent pas ici.</div>
    <div class="sec-titre">Classeur Excel</div>
    <div class="grille-exp">
    ${carte("Business plan + Valorisation (Excel)","P&amp;L, bilan, TFT et dette prévisionnels, Sources &amp; Emplois du montage et valorisation multi-méthodes — en valeurs, prêt à retravailler.","exporterExcelModele()","Télécharger")}
    </div>
    <div class="sec-titre">Rapports PowerPoint</div>
    <div class="mut" style="margin:-4px 0 10px">Style banque d'affaires Findalyx — natif PowerPoint, entièrement retouchable.</div>
    <div class="grille-exp">
    ${carte("Business plan","Résumé exécutif, hypothèses du modèle, P&amp;L / bilan / trésorerie prévisionnels, seuil de rentabilité et covenants.","genererRapport('bp')","Générer")}
    ${carte("Valorisation","Fourchette DCF et multiples, flux actualisés, build-up MEDAF (risque pays Damodaran), sensibilité.","genererRapport('valo')","Générer")}
    ${carte("Business plan + Valorisation","Document unique : le plan (hypothèses, projections, covenants) puis l'évaluation des fonds propres — l'usage courant pour un dossier bancaire ou investisseur.","genererRapport('bpvalo')","Générer")}
    </div>`;
  }
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
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
    ${carte("Business plan + Valorisation","Document unique : le plan (hypothèses, projections, covenants) puis l'évaluation des fonds propres — l'usage courant pour un dossier bancaire ou investisseur.","genererRapport('bpvalo')","Générer")}
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
    /* préserver un volet figé (state:frozen) déjà posé par une feuille ; on ne fait qu'ajouter showGridLines:false */
    const vue=(ws.views&&ws.views[0])||{};
    ws.views=[Object.assign({},vue,{showGridLines:false})];
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
    const _lc=logoCab();
    const lf=wb.addImage({base64:(_lc?_lc.data:LOGO_FINDALYX_CLAIR).split(",")[1],extension:"png"});
    ws.addImage(lf,{tl:{col:1.1,row:lm+7},ext:_lc?{width:150,height:Math.round(150/_lc.ratio)}:{width:150,height:44}});
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
  if(!DOSSIER||!ETATS||!DOSSIER.tbagr||!(DOSSIER.tbagr.lignes||[]).length){
    toast("Aucun état à exporter — importez d'abord une balance.");return;
  }
  try{
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
  }catch(err){
    toast("Export impossible : "+((err&&err.message)||err));
    try{console.error("exporterExcel",err);}catch(_){}
  }
}

/* ---------- Classeur Excel du MODÈLE (sans historique) : à FORMULES VIVANTES ----------
   Accueil (navigation) + Hypothèses (jaune = modifiable) + Calculs (récurrence annuelle avec
   phase construction/exploitation + IDC) + P&L / Bilan / TFT / Dette / Sources & Emplois /
   Valorisation qui référencent Calculs. Reproduit les équations de projeterModele. */
async function exporterExcelModele(){
  if(!DOSSIER||!DOSSIER.sansHistorique){toast("Réservé au business plan — projet");return;}
  if(typeof ExcelJS==="undefined"){toast("Bibliothèque Excel non chargée (connexion requise)");return;}
  try{
    const M=assurerModele();
    const P=projeterModele(M);
    ETATS=etatsFromModele(P);
    let val=null; try{val=valoriserBP(ETATS,{is_taux:M.is_taux,valo:M.valo},P);}catch(e){}
    /* Le classeur « Modèle » est une feuille de travail EN KFCFA : toutes les formules divisent déjà par 1000 (CA = volume × prix / 1000, etc.).
       On fige donc l'unité à KFCFA quel que soit le sélecteur d'affichage → format entier (pas de virgule décimale), amorçage cohérent (pas de facteur d'unité qui décalerait CAPEX/charges d'un facteur 1000 vs le CA), libellés honnêtes. uni() est appelé pour son effet de bord (CONF_UNITE). */
    const u=(uni(),{f:1,dec:0,lib:"KFCFA",suf:"K"}),UF=u.f,NF=NUMFMT,PCT2="0.00%",PCT="0.0%";
    const QF='#,##0;(#,##0);"-"',RF="0.0%";   /* QF = montants/quantités/prix : format comptable (milliers espacés, négatifs entre parenthèses, zéro = tiret) ; RF = ratio en % */
    const mnt=x=>(x==null)?0:(u.dec?Math.round(x*UF*10)/10:Math.round(x*UF));   /* FCFA→unité, en valeur d'amorçage des cellules jaunes */
    const N=P.annees.length, fyp=P.annees.map(a=>"FY"+String(a).slice(-2)+"p");
    const ncPh=(P.financement&&P.financement.dureeConstruction)||0;                          /* années de construction (en-têtes) */
    const fypPh=P.annees.map((a,i)=>"FY"+String(a).slice(-2)+"p"+(i<ncPh?" (constr.)":""));  /* en-tête présentation : phase marquée */
    const CL=i=>String.fromCharCode(67+i);              /* colonne de l'année i (0-based) : C, D, … */
    const scn=(M.scenarios&&M.scenario&&M.scenarios[M.scenario])||{dCA:0,dMarge:0,dJours:0};
    const fCA=1+(+scn.dCA||0), fCout=1-(+scn.dMarge||0), fJours=1+(+scn.dJours||0);
    const JAUNE={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};
    const wb=new ExcelJS.Workbook();
    const nA="Accueil",nH=nomOnglet("Hypothèses"),nC=nomOnglet("Modèle"),
      nP=nomOnglet("P&L prévisionnel"),nB=nomOnglet("Bilan prévisionnel"),nT=nomOnglet("TFT prévisionnel"),
      nD=nomOnglet("Dette"),nSU=nomOnglet("Sources & Emplois"),nV=nomOnglet("Valorisation");
    const q=s=>"'"+s.replace(/'/g,"''")+"'";
    const rH=q(nH), rC=q(nC);
    const wsA=wb.addWorksheet(nA);wsA.views=[{showGridLines:false}];   /* 1er onglet — rempli en fin de génération */

    /* ================= HYPOTHÈSES (jaune = modifiable) ================= */
    const wsH=wb.addWorksheet(nH);
    titreLiasse(wsH,"Hypothèses du modèle — cellules jaunes modifiables — scénario "+((M.scenarios&&M.scenario&&M.scenarios[M.scenario]&&M.scenarios[M.scenario].lab)||"Central")+" intégré");
    const GC=CL(N);   /* colonne « Croissance %/an » (juste après les N colonnes d'années) */
    styliserEntete(wsH.addRow([null,"Hypothèse",...fyp,"Croiss. %/an"]),2);
    let hr=wsH.rowCount, hSecFirst=true;   /* dernière ligne écrite */
    const H={};            /* adresses des cellules d'hypothèses */
    /* en-tête de section : bandeau + 2 lignes vides avant (blocs bien séparés) */
    const sec=t=>{ if(!hSecFirst)hr+=2; hSecFirst=false; hr++; const r=wsH.getRow(hr); r.getCell(2).value=t;
      for(let c=2;c<=3+N;c++){const cc=r.getCell(c);cc.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF213768"}};cc.font={bold:true,color:{argb:"FFFFFFFF"},size:10.5};} };
    const one=(lib,v,fmt)=>{hr++;wsH.getCell(hr,2).value=lib;const c=wsH.getCell(hr,3);c.value=v;if(fmt)c.numFmt=fmt;c.fill=JAUNE;return "$C$"+hr;};
    const ser=(lib,vals,fmt)=>{hr++;wsH.getCell(hr,2).value=lib;for(let i=0;i<N;i++){const c=wsH.getCell(hr,3+i);c.value=(vals[i]==null?0:vals[i]);if(fmt)c.numFmt=fmt;c.fill=JAUNE;}return hr;};
    /* base (an 1) + croissance %/an — AUCUN calcul dans les hypothèses ; l'évolution est faite dans le Modèle */
    const grow2=(lib,base,g,bfmt)=>{hr++;wsH.getCell(hr,2).value=lib;const c=wsH.getCell(hr,3);c.value=(base==null?0:base);c.numFmt=bfmt||QF;c.fill=JAUNE;const d=wsH.getCell(hr,3+N);d.value=(g==null?0:g);d.numFmt=PCT2;d.fill=JAUNE;return {b:"$C$"+hr,g:"$"+GC+"$"+hr};};
    const rng=row=>`${rH}!$C$${row}:$${CL(N-1)}$${row}`;   /* plage horizontale d'une série (par année d'exploitation) */
    const Nc=Math.max(0,Math.min((M.dureeConstruction!=null?Math.round(+M.dureeConstruction):0),N-1));
    /* ---- UNITÉ D'AFFICHAGE : diviseur piloté par une liste déroulante (reflète le sélecteur d'unité de l'app).
       Toutes les valeurs monétaires sont saisies en FCFA dans les Hypothèses ; le Modèle les divise par ce diviseur.
       Changer la liste dans Excel recalcule tout le classeur (impact automatique). ---- */
    const uLabels={F:"FCFA",K:"Milliers (KFCFA)",M:"Millions (MFCFA)"};
    sec("UNITÉ D'AFFICHAGE — pilote toutes les valeurs monétaires du classeur");
    hr++; wsH.getCell(hr,2).value="Unité (liste déroulante)";
    const cUn=wsH.getCell(hr,3); cUn.value=(uLabels[(DOSSIER&&DOSSIER.unite)||"K"]||uLabels.K); cUn.fill=JAUNE;
    cUn.dataValidation={type:"list",allowBlank:false,showErrorMessage:true,formulae:['"FCFA,Milliers (KFCFA),Millions (MFCFA)"']};
    H.unite="$C$"+hr;
    hr++; wsH.getCell(hr,2).value="Diviseur appliqué dans les formules (FCFA ÷)";
    const cDv=wsH.getCell(hr,3); cDv.value={formula:`IF(${H.unite}="FCFA",1,IF(${H.unite}="Millions (MFCFA)",1000000,1000))`}; cDv.numFmt=QF;
    cDv.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFEFEFEF"}}; cDv.font={italic:true,color:{argb:"FF6B7280"}};
    H.div="$C$"+hr;
    const DIV=`${rH}!${H.div}`;   /* réf. absolue du diviseur, utilisée dans toutes les formules monétaires du Modèle/états */
    sec("CALENDRIER & FISCALITÉ");
    H.nc=one("Durée de construction (années)",Nc,"0");
    H.is=one("Taux d'IS",M.is_taux!=null?M.is_taux:0.30,PCT2);
    H.imf=one("Impôt minimum forfaitaire (% du CA)",M.imf_taux||0,PCT2);
    H.tva=one("TVA (créances & dettes en TTC)",(M.tva!=null?+M.tva:0.18),PCT2);
    H.infl=one("Inflation des coûts unitaires",M.inflation||0.03,PCT2);
    H.dec=one("Taux du découvert (ligne court terme)",M.decouvert_taux||0.12,PCT2);
    sec("REVENUS — inducteurs de volume × prix, par produit");
    H.rev=[];H.lignes=(M.revenus||[]);
    const idToK={};
    H.lignes.forEach((L,k)=>{ idToK[L.id||("L"+k)]=k;
      /* AUCUN calcul ici : soit valeur an 1 (base) + croissance %/an, soit valeurs saisies par année.
         L'évolution (base × croissance) est faite dans la feuille Modèle. */
      hr++;wsH.getCell(hr,2).value="Ligne "+(k+1)+" — "+(L.name||"Revenus");wsH.getCell(hr,2).font={italic:true,color:{argb:"FF224289"}};
      const inds=[];
      (L.rows||[]).forEach((r,j)=>{
        const pct=String(r.unit||"").indexOf("%")>=0, factor=(j===0?fCA:1);
        const nm=(r.name||("Inducteur "+(j+1)))+(pct?" (ratio %)":""), lib="   "+((r.op==='d')?"÷ ":"× ")+nm;
        if(r.mode==='yearly'){ const vals=[]; for(let y=0;y<N;y++){ let v=(+((r.vals||[])[y])||0); if(pct)v/=100; vals.push(v*factor); } inds.push({mode:'yearly',row:ser(lib,vals,pct?RF:QF),op:(r.op==='d'?'d':'x'),name:nm,pct:pct}); }
        else { let base=(+r.val||0); if(pct)base/=100; base*=factor; const gg=grow2(lib,base,(+r.g||0)/100,pct?RF:QF); inds.push({mode:'grow',b:gg.b,g:gg.g,op:(r.op==='d'?'d':'x'),name:nm,pct:pct}); }
      });
      if(!inds.length){ const gg=grow2("   Quantité (volume)",0,0); inds.push({mode:'grow',b:gg.b,g:gg.g,op:'x',name:"Quantité (volume)"}); }
      let prixInfo;
      if((L.prix&&L.prix.mode)==='yearly'){ const pv=[]; for(let y=0;y<N;y++)pv.push(+((L.prix.vals||[])[y])||0); prixInfo={mode:'yearly',row:ser("   Prix unitaire (FCFA)",pv,QF)}; }
      else { const gg=grow2("   Prix unitaire (FCFA)",(+((L.prix||{}).val)||0),(+((L.prix||{}).g||0))/100,QF); prixInfo={mode:'grow',b:gg.b,g:gg.g}; }
      H.rev[k]={inds:inds,prix:prixInfo};
    });
    /* coûts directs UNIFIÉS : % (d'une ligne ou de l'ensemble), coût unitaire × volume d'une ligne, ou inducteurs */
    H.cd=[]; H.coutInd=(M.coutsDirects||[]).slice();
    /* sécurité : normaliser d'éventuels anciens L.cout non migrés */
    H.lignes.forEach((L,k)=>{ if(L.cout){ H.coutInd.push({name:(L.name||'Ligne')+' — coût direct',m:(L.cout.m==='unit'?'unit':'pct'),scope:(L.id||("L"+k)),pct:(L.cout.m==='unit'?0:(+L.cout.val||0)),val:(L.cout.m==='unit'?(+L.cout.val||0):0)}); } });
    if(H.coutInd.length){ sec("COÛTS DIRECTS — % du CA · coût unitaire × volume · inducteurs");
      H.coutInd.forEach((cl,k)=>{
        const m=(cl.m||"ind"), scope=(cl.scope||"all"), info={m:m,scope:scope,kLine:idToK[scope]};
        wsH.getCell(++hr,2).value="Coût "+(k+1)+" — "+(cl.name||"Coût")+(m==="ind"?"":(m==="unit"?" (coût unitaire × volume)":(scope==="all"?" (% du CA total)":" (% d'une ligne)")));wsH.getCell(hr,2).font={italic:true,color:{argb:"FF224289"}};
        if(m==="pct"){ info.pct=one("   Coûts directs (% du CA)",((+cl.pct||0)/100)*fCout,PCT2); }
        else if(m==="unit"){ info.val=one("   Coût direct unitaire (FCFA / unité)",(+cl.val||0)*fCout,QF); }
        else { const inds=[];
          (cl.rows||[]).forEach((r,j)=>{ const pct=String(r.unit||"").indexOf("%")>=0, nm=(r.name||("Inducteur "+(j+1)))+(pct?" (ratio %)":""), lib="   "+((r.op==='d')?"÷ ":"× ")+nm;
            if(r.mode==='yearly'){ const vals=[];for(let y=0;y<N;y++){let v=(+((r.vals||[])[y])||0);if(pct)v/=100;vals.push(v);} inds.push({mode:'yearly',row:ser(lib,vals,pct?RF:QF),op:(r.op==='d'?'d':'x'),name:nm}); }
            else { let base=(+r.val||0); if(pct)base/=100; const gg=grow2(lib,base,(+r.g||0)/100,pct?RF:QF); inds.push({mode:'grow',b:gg.b,g:gg.g,op:(r.op==='d'?'d':'x'),name:nm}); } });
          if(!inds.length){ const gg=grow2("   Quantité",0,0); inds.push({mode:'grow',b:gg.b,g:gg.g,op:'x',name:"Quantité"}); }
          let taux; if((cl.prix&&cl.prix.mode)==='yearly'){ const tv=[];for(let y=0;y<N;y++)tv.push((+((cl.prix.vals||[])[y])||0)*fCout); taux={mode:'yearly',row:ser("   Taux unitaire (FCFA)",tv,QF)}; }
            else { const gg=grow2("   Taux unitaire (FCFA)",(+((cl.prix||{}).val)||0)*fCout,(+((cl.prix||{}).g||0))/100,QF); taux={mode:'grow',b:gg.b,g:gg.g}; }
          info.inds=inds; info.taux=taux; }
        H.cd[k]=info;
      });
    }
    sec("FRAIS GÉNÉRAUX — charges fixes annuelles (hors personnel)");
    H.opex=[];
    (M.chargesFixes||[]).forEach(c=>{ if(c.personnel)return;
      if(c.mode==='yearly'){ const vals=[];for(let j=0;j<N;j++)vals.push(+((c.vals||[])[j])||0); H.opex.push({mode:'yearly',row:ser("   "+(c.name||"Charge")+" (FCFA)",vals,NF),name:c.name||"Charge"}); }
      else { const gg=grow2("   "+(c.name||"Charge")+" (FCFA)",(+(c.montant!=null?c.montant:c.val)||0),(+c.g||0)/100,NF); H.opex.push({mode:'grow',b:gg.b,g:gg.g,name:c.name||"Charge"}); }
    });
    /* personnel granulaire : par poste = effectif × salaire mensuel × 12 (cellules jaunes vivantes) */
    H.persPostes=[];
    const persList=(M.personnel||[]).slice();
    (M.chargesFixes||[]).forEach(c=>{ if(c.personnel)persList.push({poste:(c.name||"Personnel"),effectif:1,salaireMensuel:(+c.montant|| +c.val||0)/12,g:(+c.g||0)}); });
    if(persList.length){ sec("CHARGES DE PERSONNEL — par poste (effectif × salaire mensuel × 12)");
      persList.forEach((pp,k)=>{
        wsH.getCell(++hr,2).value="Poste "+(k+1)+" — "+(pp.poste||"Personnel");wsH.getCell(hr,2).font={italic:true,color:{argb:"FF224289"}};
        const eff=one("   Effectif",(+pp.effectif||0),QF);
        const sal=one("   Salaire mensuel (FCFA)",(+pp.salaireMensuel||0),QF);
        const gg=one("   Croissance /an",((+pp.g||0)/100),PCT2);
        H.persPostes.push({eff:eff,sal:sal,g:gg,name:pp.poste||("Poste "+(k+1))});
      });
    }
    sec("INVESTISSEMENTS (CAPEX)");
    H.capM=[];H.capDur=[];H.capAn=[];
    (M.capex||[]).forEach((c,k)=>{
      hr++;wsH.getCell(hr,2).value="CAPEX "+(k+1)+" — "+(c.name||"Investissement");
      const cm=wsH.getCell(hr,3);cm.value=(c.montant!=null?+c.montant:0);cm.numFmt=NF;cm.fill=JAUNE;H.capM[k]="$C$"+hr;
      const cd=wsH.getCell(hr,4);cd.value=+c.duree||5;cd.numFmt="0";cd.fill=JAUNE;H.capDur[k]="$D$"+hr;
      const ca=wsH.getCell(hr,5);ca.value=Math.max(1,Math.round(+c.annee||1));ca.numFmt="0";ca.fill=JAUNE;H.capAn[k]="$E$"+hr;
      wsH.getCell(hr,6).value="montant (FCFA) / durée / année";wsH.getCell(hr,6).font={italic:true,size:9,color:{argb:"FF808080"}};
    });
    sec("FINANCEMENT — montage initial (tiré en année 1)");
    H.capital=one("Fonds propres (capital + apports) (FCFA)",Math.round((P.financement.capital||0)*1000),NF);
    H.subv=one("Subvention (FCFA)",Math.round((P.financement.subvention||0)*1000),NF);
    H.dette=one("Dette de base (hors IDC) (FCFA)",Math.round((P.financement.dette||0)*1000),NF);
    H.taux=one("Taux d'intérêt de la dette",(M.financement&&M.financement.emprunt&&+M.financement.emprunt.taux)||0.08,PCT2);
    H.dur=one("Durée de remboursement (ans)",(M.financement&&M.financement.emprunt&&+M.financement.emprunt.duree)||5,"0");
    sec("BESOIN EN FONDS DE ROULEMENT (jours)");
    const b=M.bfr||{};
    H.dso=one("Délai clients (DSO)",Math.round((b.dso||0)*fJours),"0");
    H.dio=one("Rotation des stocks (DIO)",Math.round((b.dio||0)*fJours),"0");
    H.dpo=one("Délai fournisseurs (DPO)",Math.round((b.dpo||0)*fJours),"0");
    sec("COÛT DU CAPITAL & VALORISATION");
    const V=M.valo||{};
    H.rf=one("Taux sans risque (rf)",V.rf||0.06,PCT2);
    H.pm=one("Prime de risque marché",V.primeMarche||0.055,PCT2);
    H.beta=one("Beta",V.beta||1,"0.00");
    H.ppays=one("Prime de risque pays"+(V.pays?" ("+V.pays+")":""),V.primePays||0,PCT2);
    H.ptaille=one("Prime de taille",V.primeTaille||0,PCT2);
    H.pilliq=one("Prime d'illiquidité",V.primeIlliquidite||0,PCT2);
    H.kd=one("Coût de la dette (brut)",V.coutDette||0.09,PCT2);
    H.wd=one("Poids de la dette (structure cible)",V.poidsDette||0.35,PCT);
    H.g=one("Croissance à l'infini (g)",V.g||0.03,PCT2);
    H.mc=one("Multiple boursier central (× EBITDA)",(V.multiplesComparables&&V.multiplesComparables.central)||5.5,"0.0");
    H.mt=one("Multiple de transactions central (× EBITDA)",(V.multiplesTransactions&&V.multiplesTransactions.central)||6.5,"0.0");
    wsH.columns=[{width:3},{width:44},...fyp.map(()=>({width:13})),{width:12}];

    /* ================= MODÈLE (feuille financière détaillée, par section) ================= */
    const wsC=wb.addWorksheet(nC);
    titreLiasse(wsC,"Modèle financier — dérivation par section (construction → exploitation, IDC capitalisés)");
    { const cHdr=wsC.addRow([null,"",...fyp]); styliserEntete(cHdr,1); cHdr.getCell(2).value={formula:`${rH}!${H.unite}`}; }
    let cr=wsC.rowCount;
    const R={};   /* n° de ligne par code */
    /* collecte les lignes ; on écrira en DEUX PASSES pour que toute réf croisée (avant/arrière) résolve.
       6ᵉ élément = en-tête de section (bandeau, sans valeurs). */
    const CROWS=[];
    let secN=0;
    let mSecFirst=true;
    const row=(code,lib,ff,fmt,st)=>{CROWS.push([code,lib,ff,fmt||NF,st,false,false]);};
    /* en-tête de section = bandeau ; 2 lignes vides avant chaque bloc (sauf le 1er) pour bien séparer */
    const sec2=(titre)=>{ if(!mSecFirst){CROWS.push(["_B"+secN+"a","",null,NF,false,false,true]);CROWS.push(["_B"+secN+"b","",null,NF,false,false,true]);} mSecFirst=false; CROWS.push(["_S"+(secN++),titre,null,NF,false,true,false]);};
    const rr=code=>R[code];                 /* n° de ligne */
    const pRef=(code,i)=>i>0?(CL(i-1)+rr(code)):"0";
    const OI=(X)=>`MAX(1,${X}${rr("IDX")}-${rH}!${H.nc})`;   /* indice d'année d'exploitation (1-based) */

    sec2("PHASAGE — construction → exploitation");
    row("IDX","Année (indice)",(i)=>String(i+1),"0");
    row("FC","Flag construction (1 = en construction)",(i,X)=>`IF(${X}${rr("IDX")}<=${rH}!${H.nc},1,0)`,"0");
    row("FO","Flag exploitation (1 = en exploitation)",(i,X)=>`IF(${X}${rr("IDX")}>${rH}!${H.nc},1,0)`,"0");

    /* ---- CHIFFRE D'AFFAIRES : par produit, volume × prix unitaire, puis total ---- */
    sec2("CHIFFRE D'AFFAIRES — volume × prix unitaire par produit");
    H.lignes.forEach((L,k)=>{ const nm=(L.name||("Ligne "+(k+1))), inds=H.rev[k].inds, pr=H.rev[k].prix;
      inds.forEach((ind,j)=>{ const lbl="   "+((ind.op==='d')?"÷ ":"× ")+ind.name;
        if(ind.mode==='grow') row("IND"+k+"_"+j,lbl,(i,X)=>`${rH}!${ind.b}*(1+${rH}!${ind.g})^(${OI(X)}-1)`,ind.pct?RF:QF);
        else row("IND"+k+"_"+j,lbl,(i,X)=>`INDEX(${rng(ind.row)},${OI(X)})`,ind.pct?RF:QF); });
      row("VOL"+k,"   = Volume — "+nm,(i,X)=>{ let e=""; inds.forEach((ind,j)=>{const ref=`${X}${rr("IND"+k+"_"+j)}`; if(j===0)e=(ind.op==='d')?`1/${ref}`:ref; else e+=(ind.op==='d')?`/${ref}`:`*${ref}`;}); return `IFERROR(${X}${rr("FO")}*(${e||"0"}),0)`; },QF);
      if(pr.mode==='grow') row("PRIX"+k,"   × Prix unitaire — "+nm+" (FCFA)",(i,X)=>`${rH}!${pr.b}*(1+${rH}!${pr.g})^(${OI(X)}-1)`,QF);
      else row("PRIX"+k,"   × Prix unitaire — "+nm+" (FCFA)",(i,X)=>`INDEX(${rng(pr.row)},${OI(X)})`,QF);
      row("CAL"+k,"   = Chiffre d'affaires — "+nm,(i,X)=>`${X}${rr("VOL"+k)}*${X}${rr("PRIX"+k)}/${DIV}`,NF);
    });
    row("CA","Chiffre d'affaires total",(i,X)=>H.lignes.length?H.lignes.map((_,k)=>`${X}${rr("CAL"+k)}`).join("+"):"0",NF,true);

    /* ---- COÛTS DIRECTS : % du CA (ligne/ensemble), coût unitaire × volume, ou inducteurs ---- */
    sec2("COÛTS DIRECTS");
    (H.coutInd||[]).forEach((cl,k)=>{
      const info=H.cd[k], nom=(cl.name||("Coût "+(k+1)));
      if(info.m==="pct"){
        const lib="   Coûts directs — "+nom+(info.scope==="all"?" (% du CA total)":" (% d'une ligne)");
        if(info.scope==="all"){ row("CDI"+k,lib,(i,X)=>`-${X}${rr("FO")}*${X}${rr("CA")}*${rH}!${info.pct}`,NF); }
        else { const kk=(info.kLine!=null?info.kLine:0); row("CDI"+k,lib,(i,X)=>`-${X}${rr("FO")}*${X}${rr("CAL"+kk)}*${rH}!${info.pct}`,NF); }
      } else if(info.m==="unit"){
        const kk=(info.kLine!=null?info.kLine:0);
        row("CDI"+k,"   Coûts directs — "+nom+" (coût unitaire × volume)",(i,X)=>`-${X}${rr("VOL"+kk)}*${rH}!${info.val}*(1+${rH}!${H.infl})^(${OI(X)}-1)/${DIV}`,NF);
      } else {
        row("CDI"+k,"   Coûts directs — "+nom+" (inducteurs)",(i,X)=>{
          let e=""; (info.inds||[]).forEach((ind,j)=>{ const t=(ind.mode==='grow')?`${rH}!${ind.b}*(1+${rH}!${ind.g})^(${OI(X)}-1)`:`INDEX(${rng(ind.row)},${OI(X)})`; if(j===0)e=(ind.op==='d')?`1/(${t})`:`(${t})`; else e+=(ind.op==='d')?`/(${t})`:`*(${t})`; });
          const tx=(info.taux.mode==='grow')?`${rH}!${info.taux.b}*(1+${rH}!${info.taux.g})^(${OI(X)}-1)`:`INDEX(${rng(info.taux.row)},${OI(X)})`;
          return `-IFERROR(${X}${rr("FO")}*(${e||"0"})*(${tx}),0)/${DIV}`;
        },NF);
      }
    });
    row("CD","Coûts directs (total)",(i,X)=>{const t=(H.coutInd||[]).map((_,k)=>`${X}${rr("CDI"+k)}`);return t.length?t.join("+"):"0";},NF,true);
    row("MB","Marge brute",(i,X)=>`${X}${rr("CA")}+${X}${rr("CD")}`,NF,true);

    /* ---- FRAIS GÉNÉRAUX & PERSONNEL : chaque charge (base évoluée) + personnel par poste ---- */
    sec2("FRAIS GÉNÉRAUX & CHARGES DE PERSONNEL");
    H.opex.forEach((o,k)=>{
      if(o.mode==='grow') row("OPL"+k,"   Frais généraux — "+o.name,(i,X)=>`-${X}${rr("FO")}*${rH}!${o.b}/${DIV}*(1+${rH}!${o.g})^(${OI(X)}-1)`,NF);
      else row("OPL"+k,"   Frais généraux — "+o.name,(i,X)=>`-${X}${rr("FO")}*INDEX(${rng(o.row)},${OI(X)})/${DIV}`,NF);
    });
    (H.persPostes||[]).forEach((pp,k)=>row("PEL"+k,"   Personnel — "+pp.name+" (effectif × salaire × 12)",(i,X)=>`-${X}${rr("FO")}*${rH}!${pp.eff}*${rH}!${pp.sal}*12*(1+${rH}!${pp.g})^(${OI(X)}-1)/${DIV}`,NF));
    row("PERS","   Charges du personnel (sous-total)",(i,X)=>(H.persPostes||[]).length?H.persPostes.map((_,k)=>`${X}${rr("PEL"+k)}`).join("+"):"0",NF);
    row("FGT","Frais généraux (dont personnel) — total",(i,X)=>{const t=[...H.opex.map((_,k)=>`${X}${rr("OPL"+k)}`),((H.persPostes||[]).length?`${X}${rr("PERS")}`:null)].filter(Boolean);return t.length?t.join("+"):"0";},NF,true);
    row("EBITDA","EBITDA",(i,X)=>`${X}${rr("MB")}+${X}${rr("FGT")}`,NF,true);

    /* ---- INVESTISSEMENTS, AMORTISSEMENTS & VNC (pour le bilan) ---- */
    sec2("INVESTISSEMENTS, AMORTISSEMENTS & VALEUR NETTE COMPTABLE");
    row("CAPEX","Investissements de l'année (CAPEX)",(i,X)=>(M.capex||[]).length?(M.capex||[]).map((_,k)=>`IF(${rH}!${H.capAn[k]}=${X}${rr("IDX")},${rH}!${H.capM[k]}/${DIV},0)`).join("+"):"0",NF);
    (M.capex||[]).forEach((c,k)=>{
      row("AM"+k,"   Dotation amort. — "+(c.name||("CAPEX "+(k+1))),(i,X)=>{const mes=`MAX(${rH}!${H.capAn[k]},${rH}!${H.nc}+1)`;return `IF(AND(${X}${rr("IDX")}>=${mes},${X}${rr("IDX")}<${mes}+${rH}!${H.capDur[k]}),${rH}!${H.capM[k]}/${DIV}/${rH}!${H.capDur[k]},0)`;},NF);
    });
    row("AMIDC","   Dotation amort. — intérêts de construction (IDC)",(i,X)=>{const mes=`(${rH}!${H.nc}+1)`;return `IF(AND(${X}${rr("IDX")}>=${mes},${X}${rr("IDX")}<${mes}+${rH}!${H.dur}),${CL(N-1)}${rr("IDCTOT")}/${rH}!${H.dur},0)`;},NF);
    row("DOT","Dotations aux amortissements (total)",(i,X)=>`${(M.capex||[]).map((_,k)=>`${X}${rr("AM"+k)}`).concat(`${X}${rr("AMIDC")}`).join("+")||"0"}`,NF,true);
    row("DA","Dotations (report au P&L, négatif)",(i,X)=>`-${X}${rr("DOT")}`,NF);
    row("BRUT","Immobilisations brutes (cumul CAPEX + IDC)",(i,X)=>`${pRef("BRUT",i)}+${X}${rr("CAPEX")}+${X}${rr("IDC")}`,NF);
    row("AMC","Amortissements cumulés",(i,X)=>`${pRef("AMC",i)}+${X}${rr("DOT")}`,NF);
    row("IMN","Immobilisations nettes — VNC (brut − amort. cumulés)",(i,X)=>`${X}${rr("BRUT")}-${X}${rr("AMC")}`,NF,true);

    /* ---- FINANCEMENT & DETTE : tirage, IDC (période de grâce), intérêts, remboursements ---- */
    sec2("FINANCEMENT & DETTE — période de grâce en construction");
    const amAn=`(${rH}!${H.dette}/${DIV}*(1+${rH}!${H.taux})^${rH}!${H.nc})/${rH}!${H.dur}`;   /* annuité = (dette + IDC à la mise en service) / durée */
    row("TIR","Tirage de dette (année 1)",(i,X)=>`IF(${X}${rr("IDX")}=1,${rH}!${H.dette}/${DIV},0)`,NF);
    row("IDC","Intérêts capitalisés (IDC — période de grâce/construction)",(i,X)=>`${X}${rr("FC")}*${rH}!${H.taux}*(${pRef("DETTE",i)}+${X}${rr("TIR")})`,NF);
    row("IDCTOT","   IDC cumulés (à amortir dès la mise en service)",(i,X)=>`${pRef("IDCTOT",i)}+${X}${rr("IDC")}`,NF);
    row("REMB","Remboursement du capital (dès l'exploitation)",(i,X)=>`IF(${X}${rr("FO")}=1,MIN(${amAn},${pRef("DETTE",i)}+${X}${rr("TIR")}+${X}${rr("IDC")}),0)`,NF);
    row("DETTE","Dette financière — solde de clôture",(i,X)=>`${pRef("DETTE",i)}+${X}${rr("TIR")}+${X}${rr("IDC")}-${X}${rr("REMB")}`,NF,true);
    row("INT","Intérêts sur emprunt (exploitation)",(i,X)=>`${X}${rr("FO")}*${rH}!${H.taux}*(${pRef("DETTE",i)}+${X}${rr("DETTE")})/2`,NF);
    row("INTCT","Intérêts du découvert (ligne court terme)",(i,X)=>`${rH}!${H.dec}*${pRef("LCT",i)}`,NF);

    /* ---- COMPTE DE RÉSULTAT : cascade EBIT → résultat net ---- */
    sec2("COMPTE DE RÉSULTAT — cascade");
    row("EBIT","EBIT (EBITDA − dotations)",(i,X)=>`${X}${rr("EBITDA")}+${X}${rr("DA")}`,NF,true);
    row("RFIN","Résultat financier",(i,X)=>`-${X}${rr("INT")}-${X}${rr("INTCT")}`,NF);
    row("EBT","Résultat avant impôt",(i,X)=>`${X}${rr("EBIT")}+${X}${rr("RFIN")}`,NF,true);
    row("USE","   Déficit antérieur imputé",(i,X)=>`MIN(${pRef("CARRY",i)},MAX(0,${X}${rr("EBT")}))`,NF);
    row("CARRY","   Déficits reportables (stock)",(i,X)=>`${pRef("CARRY",i)}-${X}${rr("USE")}+MAX(0,-${X}${rr("EBT")})`,NF);
    row("IS","Impôt sur les sociétés (max IS / IMF)",(i,X)=>`-MAX(${rH}!${H.is}*(MAX(0,${X}${rr("EBT")})-${X}${rr("USE")}),${rH}!${H.imf}*${X}${rr("CA")})`,NF);
    row("RN","Résultat net",(i,X)=>`${X}${rr("EBT")}+${X}${rr("IS")}`,NF,true);

    /* ---- BESOIN EN FONDS DE ROULEMENT ---- */
    sec2("BESOIN EN FONDS DE ROULEMENT");
    row("CLI","Créances clients (CA TTC × DSO)",(i,X)=>`${X}${rr("FO")}*${X}${rr("CA")}*(1+${rH}!${H.tva})*${rH}!${H.dso}/360`,NF);
    row("STK","Stocks (coûts directs × DIO)",(i,X)=>`${X}${rr("FO")}*(-${X}${rr("CD")})*${rH}!${H.dio}/360`,NF);
    row("FRN","Dettes fournisseurs (hors personnel, TTC × DPO)",(i,X)=>`-${X}${rr("FO")}*(-${X}${rr("CD")}-${X}${rr("FGT")}+${X}${rr("PERS")})*(1+${rH}!${H.tva})*${rH}!${H.dpo}/360`,NF);
    row("BFR","Besoin en fonds de roulement",(i,X)=>`${X}${rr("CLI")}+${X}${rr("STK")}+${X}${rr("FRN")}`,NF,true);

    /* ---- BILAN — bouclage par la trésorerie (actif net = capitaux propres) ---- */
    sec2("BILAN — bouclage (actif net = capitaux propres)");
    row("CAPSOC","   Capital social",(i,X)=>`${rH}!${H.capital}/${DIV}`,NF);
    row("SUBVR","   Subventions d'investissement",(i,X)=>`${rH}!${H.subv}/${DIV}`,NF);
    row("RANR","   Report à nouveau & résultats antérieurs",(i,X)=>`${X}${rr("CP")}-${rH}!${H.capital}/${DIV}-${rH}!${H.subv}/${DIV}-${X}${rr("RN")}`,NF);
    row("CP","Capitaux propres",(i,X)=>`${pRef("CP",i)}+${X}${rr("RN")}+IF(${X}${rr("IDX")}=1,(${rH}!${H.capital}+${rH}!${H.subv})/${DIV},0)`,NF,true);
    row("TRES","Trésorerie nette (bouclage du bilan)",(i,X)=>`${X}${rr("CP")}+${X}${rr("DETTE")}-${X}${rr("IMN")}-${X}${rr("BFR")}`,NF,true);
    row("LCT","   Découvert (si trésorerie négative)",(i,X)=>`MAX(0,-${X}${rr("TRES")})`,NF);
    row("DETTEN","   Dettes financières (−, présentation actif net)",(i,X)=>`-${X}${rr("DETTE")}`,NF);
    row("AN","Actif net = Immo nettes + BFR + Trésorerie − Dettes",(i,X)=>`${X}${rr("IMN")}+${X}${rr("BFR")}+${X}${rr("TRES")}-${X}${rr("DETTE")}`,NF,true);
    row("CTRL","Contrôle : actif net − capitaux propres (= 0)",(i,X)=>`${X}${rr("AN")}-${X}${rr("CP")}`,NF);

    /* ---- TABLEAU DE FLUX DE TRÉSORERIE ---- */
    sec2("TABLEAU DE FLUX DE TRÉSORERIE");
    row("ZA","Trésorerie à l'ouverture",(i,X)=>i>0?`${CL(i-1)}${rr("TRES")}`:"0",NF);
    row("FA","Capacité d'autofinancement (CAFG)",(i,X)=>`${X}${rr("RN")}+${X}${rr("DOT")}`,NF);
    row("VCR","   Variation des créances",(i,X)=>`-(${X}${rr("CLI")}-${pRef("CLI",i)})`,NF);
    row("VST","   Variation des stocks",(i,X)=>`-(${X}${rr("STK")}-${pRef("STK",i)})`,NF);
    row("VFR","   Variation des dettes d'exploitation",(i,X)=>`-(${X}${rr("FRN")}-${pRef("FRN",i)})`,NF);
    row("ZB","Flux de trésorerie opérationnels",(i,X)=>`${X}${rr("FA")}+${X}${rr("VCR")}+${X}${rr("VST")}+${X}${rr("VFR")}`,NF,true);
    row("ZC","Flux d'investissement",(i,X)=>`-${X}${rr("CAPEX")}`,NF,true);
    row("FK","   Augmentation de capital",(i,X)=>`IF(${X}${rr("IDX")}=1,${rH}!${H.capital}/${DIV},0)`,NF);
    row("FL","   Subvention",(i,X)=>`IF(${X}${rr("IDX")}=1,${rH}!${H.subv}/${DIV},0)`,NF);
    row("ZFIN","Flux de financement",(i,X)=>`${X}${rr("FK")}+${X}${rr("FL")}+${X}${rr("TIR")}-${X}${rr("REMB")}`,NF,true);
    row("ZF","Variation nette de trésorerie",(i,X)=>`${X}${rr("ZB")}+${X}${rr("ZC")}+${X}${rr("ZFIN")}`,NF,true);
    row("ZG","Trésorerie à la clôture",(i,X)=>`${X}${rr("ZA")}+${X}${rr("ZF")}`,NF,true);
    row("ECART","Contrôle (clôture TFT − trésorerie bilan = 0)",(i,X)=>`${X}${rr("ZG")}-${X}${rr("TRES")}`,NF);

    /* ---- POSTES DE DÉTAIL (alimentent les états détaillés & la valorisation) ---- */
    sec2("POSTES DE DÉTAIL (états & valorisation)");
    row("FCFF","Flux de trésorerie disponible (FCFF)",(i,X)=>`${X}${rr("EBIT")}*(1-IF(${X}${rr("EBIT")}>0,${rH}!${H.is},0))+${X}${rr("DOT")}-(${X}${rr("BFR")}-${pRef("BFR",i)})-${X}${rr("CAPEX")}`,NF);
    row("INTP","Intérêts sur emprunts (charge)",(i,X)=>`-${X}${rr("INT")}`,NF);
    row("DECP","Intérêts sur découvert (charge)",(i,X)=>`-${X}${rr("INTCT")}`,NF);
    row("AMCN","Amortissements cumulés (−)",(i,X)=>`-${X}${rr("AMC")}`,NF);
    row("TRA","Trésorerie active",(i,X)=>`${X}${rr("TRES")}+${X}${rr("LCT")}`,NF);
    row("DECN","Concours bancaires (découvert, −)",(i,X)=>`-${X}${rr("LCT")}`,NF);
    row("FRNP","Dettes fournisseurs (passif)",(i,X)=>`${X}${rr("FRN")}`,NF);

    /* PASSE 1 : réserver tous les n° de ligne ; PASSE 2 : écrire libellés, en-têtes de section & formules */
    CROWS.forEach((d,idx)=>{R[d[0]]=cr+1+idx;});
    CROWS.forEach(d=>{if(d[6])return;   /* ligne vide de séparation */
      const rn=R[d[0]];const r=wsC.getRow(rn);r.getCell(2).value=d[1];
      if(d[5]){ for(let c=2;c<3+N;c++){const cc=r.getCell(c);cc.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF213768"}};cc.font={bold:true,color:{argb:"FFFFFFFF"},size:10.5};} return; }
      for(let i=0;i<N;i++){const c=r.getCell(3+i);c.value={formula:d[2](i,CL(i))};c.numFmt=d[3];}
      if(d[4]){r.font={bold:true,color:{argb:"FF172554"}};for(let c=2;c<3+N;c++)r.getCell(c).fill=FOND_TOTAL;}});
    wsC.columns=[{width:3},{width:52},...fyp.map(()=>({width:13}))];

    /* ================= feuilles de présentation (référencent Calculs) ================= */
    const feuille=(nom,sousTitre,defs,note)=>{
      const ws=wb.addWorksheet(nom);
      titreLiasse(ws,sousTitre);
      { const hdr=ws.addRow([null,"",...fypPh]); styliserEntete(hdr,1); hdr.getCell(2).value={formula:`${rH}!${H.unite}`}; }
      defs.forEach(d=>{
        const r=ws.addRow([null,d[0]]);
        if(d[1]==null){r.getCell(2).font={bold:true,italic:true,color:{argb:"FF224289"}};return;}   /* en-tête de section */
        for(let i=0;i<N;i++){const c=r.getCell(3+i);c.value={formula:`${rC}!${CL(i)}${rr(d[1])}`};c.numFmt=d[3]||NF;}
        if(d[2]){r.font={bold:true,color:{argb:"FF172554"}};for(let c=2;c<3+N;c++)r.getCell(c).fill=FOND_TOTAL;}
      });
      if(note){ws.addRow([]);const r2=ws.addRow([null,note]);r2.getCell(2).font={italic:true,size:9,color:{argb:"FF808080"}};}
      ws.columns=[{width:3},{width:42},...fyp.map(()=>({width:13}))];
      return ws;
    };
    /* ---- P&L DÉTAILLÉ : chaque ligne de revenus / coûts, chaque charge dépliée, résultat financier décomposé ---- */
    const plDefs=[["Produits d'exploitation",null]];
    H.lignes.forEach((L,k)=>plDefs.push(["   Ventes — "+(L.name||"Ligne "+(k+1)),"CAL"+k]));
    plDefs.push(["Chiffre d'affaires","CA",1]);
    (H.coutInd||[]).forEach((cl,k)=>plDefs.push(["   Coûts directs — "+(cl.name||"Coût "+(k+1)),"CDI"+k]));
    plDefs.push(["Coûts directs (total)","CD"]);
    plDefs.push(["Marge brute","MB",1]);
    /* frais généraux = postes hors personnel dépliés + UNE ligne « Charges du personnel », un seul total */
    if(H.opex.length||(H.persPostes||[]).length){
      plDefs.push(["Frais généraux",null]);
      H.opex.forEach((o,k)=>plDefs.push(["   "+o.name,"OPL"+k]));
      if((H.persPostes||[]).length)plDefs.push(["   Charges du personnel","PERS"]);
      plDefs.push(["Total frais généraux","FGT"]);
    }
    plDefs.push(["EBITDA","EBITDA",1]);
    plDefs.push(["Dotations aux amortissements","DA"]);
    plDefs.push(["EBIT","EBIT",1]);
    plDefs.push(["   Intérêts sur emprunts","INTP"]);
    plDefs.push(["   Intérêts sur découvert","DECP"]);
    plDefs.push(["Résultat financier","RFIN",1]);
    plDefs.push(["Résultat avant impôt","EBT",1]);
    plDefs.push(["Impôt sur les sociétés","IS"]);
    plDefs.push(["Résultat net","RN",1]);
    feuille(nP,"Compte de résultat prévisionnel détaillé",plDefs,
      "Chaque ligne de revenus, de coûts et chaque charge est dépliée. Cellules calculées à partir des Hypothèses (jaune) via Calculs.");
    /* ---- BILAN DÉTAILLÉ (présentation actif net) ---- */
    const bsDefs=[
      ["Actif immobilisé",null],
      ["   Immobilisations brutes","BRUT"],["   Amortissements cumulés","AMCN"],["Actifs immobilisés (nets)","IMN",1],
      ["Besoin en fonds de roulement",null],
      ["   Stocks","STK"],["   Créances clients","CLI"],["   Dettes fournisseurs","FRNP"],["Besoin en fonds de roulement global","BFR",1],
      ["Trésorerie",null],
      ["   Trésorerie active","TRA"],["   Concours bancaires courants (découvert)","DECN"],["Trésorerie nette","TRES",1],
      ["Dettes financières","DETTEN"],
      ["Actif net","AN",1],
      ["Capitaux propres",null],
      ["   Capital social","CAPSOC"],["   Subventions d'investissement","SUBVR"],
      ["   Report à nouveau et résultats antérieurs","RANR"],["   Résultat net de l'exercice","RN"],["Capitaux propres","CP",1],
      ["Contrôle : actif net − capitaux propres (= 0)","CTRL"]];
    feuille(nB,"Bilan prévisionnel détaillé — présentation actif net",bsDefs,
      "Actifs immobilisés (nets) + BFR + trésorerie nette − dettes financières = Actif net = Capitaux propres. La trésorerie boucle le bilan ; la ligne de contrôle doit être nulle.");
    feuille(nT,"Tableau des flux de trésorerie",[
      ["Trésorerie nette à l'ouverture","ZA"],["Capacité d'autofinancement (CAFG)","FA"],
      ["Variation des créances","VCR"],["Variation des stocks","VST"],["Variation des dettes d'exploitation","VFR"],
      ["Flux opérationnels","ZB",1],["Flux d'investissement","ZC",1],["Augmentation de capital","FK"],
      ["Subvention","FL"],["Emprunts nouveaux","TIR"],["Remboursements","REMB"],["Flux de financement","ZFIN",1],
      ["Variation nette de trésorerie","ZF",1],["Trésorerie nette à la clôture","ZG",1]],
      "En période de construction, capital / emprunt / investissement apparaissent dans l'année concernée ; l'exploitation démarre après.");
    feuille(nD,"Tableau de la dette financière",[
      ["Encours à l'ouverture (année précédente)","DETTE"],
      ["Tirages","TIR"],["Intérêts de construction capitalisés (IDC)","IDC"],
      ["Remboursements","REMB"],["Intérêts payés","INT"],["Encours à la clôture","DETTE",1]],
      "IDC = intérêts capitalisés pendant la construction (dette croissante, remboursement différé).");

    /* Sources & Emplois (valeurs de synthèse) */
    const Pf=P.financement, wsSU=wb.addWorksheet(nSU);
    titreLiasse(wsSU,"Sources & Emplois du montage");
    { const suHdr=wsSU.addRow([null,"Rubrique",""]); styliserEntete(suHdr,1); suHdr.getCell(3).value={formula:`"Montant ("&${rH}!${H.unite}&")"`}; }
    const suRow=(lib,x,tot)=>{const r=wsSU.addRow([null,lib]);r.getCell(3).value={formula:`${Math.round((x||0)*1000)}/${DIV}`};r.getCell(3).numFmt=NF;if(tot){r.font={bold:true,color:{argb:"FF172554"}};r.getCell(2).fill=FOND_TOTAL;r.getCell(3).fill=FOND_TOTAL;}return r;};
    wsSU.addRow([null,"EMPLOIS"]).getCell(2).font={bold:true,color:{argb:"FF224289"}};
    suRow("Investissements (jusqu'à la mise en service)",Pf.capexFinance);
    suRow("BFR de démarrage",Pf.bfrDemarrage);
    if(Pf.idc>0.01)suRow("Intérêts de construction (IDC)",Pf.idc);
    const rEmp=wsSU.rowCount+1;suRow("Total emplois",Pf.emplois,true);
    wsSU.addRow([]);
    wsSU.addRow([null,"RESSOURCES"]).getCell(2).font={bold:true,color:{argb:"FF224289"}};
    suRow("Fonds propres ("+Math.round(Pf.partFP*100)+" %)",Pf.capital);
    if(Pf.subvention>0.01)suRow("Subvention",Pf.subvention);
    suRow("Dette"+(Pf.idc>0.01?" (dont IDC)":""),Pf.detteAvecIDC);
    suRow("Total ressources",Pf.sources,true);
    wsSU.addRow([]);
    const rNote=wsSU.addRow([null,"Durée de construction : "+(Pf.dureeConstruction||0)+" an(s) ; exploitation à partir de l'année "+Pf.anneeExploit+"."]);
    rNote.getCell(2).font={italic:true,size:9,color:{argb:"FF808080"}};
    wsSU.columns=[{width:3},{width:48},{width:16}];

    /* Valorisation (build-up en formules ref. Hypothèses ; FCFF ref. Calculs ; synthèse par méthode) */
    const wsV=wb.addWorksheet(nV);
    titreLiasse(wsV,"Évaluation des fonds propres (multi-méthodes)");
    const vLab=(l)=>{const r=wsV.addRow([null,l]);r.getCell(2).font={bold:true,color:{argb:"FF224289"}};return r;};
    const vF=(l,f,fmt,tot)=>{const r=wsV.addRow([null,l]);const c=r.getCell(3);c.value={formula:f};c.numFmt=fmt||NF;if(tot){r.font={bold:true,color:{argb:"FF172554"}};r.getCell(2).fill=FOND_TOTAL;c.fill=FOND_TOTAL;}return r.number;};
    vLab("Coût du capital (CAPM)");
    const rke=wsV.rowCount+1;
    vF("Taux sans risque (rf)",`${rH}!${H.rf}`,PCT2);
    vF("Prime de marché × β",`${rH}!${H.beta}*${rH}!${H.pm}`,PCT2);
    vF("Prime de risque pays + taille + illiquidité",`${rH}!${H.ppays}+${rH}!${H.ptaille}+${rH}!${H.pilliq}`,PCT2);
    const rKe=wsV.rowCount+1; vF("= Coût des fonds propres (ke)",`${rH}!${H.rf}+${rH}!${H.beta}*${rH}!${H.pm}+${rH}!${H.ppays}+${rH}!${H.ptaille}+${rH}!${H.pilliq}`,PCT2,true);
    const rKd=wsV.rowCount+1; vF("Coût de la dette après IS (kd)",`${rH}!${H.kd}*(1-${rH}!${H.is})`,PCT2);
    const rWacc=wsV.rowCount+1; vF("= WACC",`C${rKe}*(1-${rH}!${H.wd})+C${rKd}*${rH}!${H.wd}`,PCT2,true);
    wsV.addRow([]);
    vLab("Flux de trésorerie disponibles (FCFF) & actualisation");
    const eFCFF=wsV.addRow([null,"",...fyp]);styliserEntete(eFCFF,1);eFCFF.getCell(2).value={formula:`${rH}!${H.unite}`};
    const rFCFF=wsV.rowCount+1;{const r=wsV.getRow(rFCFF);r.getCell(2).value="FCFF";for(let i=0;i<N;i++){const c=r.getCell(3+i);c.value={formula:`${rC}!${CL(i)}${rr("FCFF")}`};c.numFmt=NF;}}
    const rPV=wsV.rowCount+1;{const r=wsV.getRow(rPV);r.getCell(2).value="FCFF actualisés";for(let i=0;i<N;i++){const c=r.getCell(3+i);c.value={formula:`${CL(i)}${rFCFF}/(1+C${rWacc})^${i+1}`};c.numFmt=NF;}}
    wsV.addRow([]);
    vLab("Passage à la valeur des fonds propres");
    const rSum=wsV.rowCount+1; vF("Somme des FCFF actualisés",`SUM(C${rPV}:${CL(N-1)}${rPV})`,NF);
    const rVT=wsV.rowCount+1; vF("Valeur terminale actualisée (Gordon g)",`(${CL(N-1)}${rFCFF}*(1+${rH}!${H.g})/(C${rWacc}-${rH}!${H.g}))/(1+C${rWacc})^${N}`,NF);
    const rEV=wsV.rowCount+1; vF("= Valeur d'entreprise (EV)",`C${rSum}+C${rVT}`,NF,true);
    const dnF=Math.round((val?val.detteNette:0)*1000), dnX=`${dnF}/${DIV}`;   /* dette nette FCFA ÷ diviseur (rescale live) */
    const rDN=wsV.rowCount+1; vF("(−) Dette nette",`-${dnX}`,NF);
    const rEq=wsV.rowCount+1; vF("Valeur des fonds propres (DCF)",`C${rEV}+C${rDN}`,NF,true);
    wsV.addRow([]);
    vLab("Synthèse par méthode");
    styliserEntete(wsV.addRow([null,"Méthode","Bas","Central","Haut"]),1);
    const ebRefX=`(${Math.round((val?val.ebitdaRef:P.pl.EBITDA[P.annees[P.annees.length-1]])*1000)}/${DIV})`;   /* EBITDA de réf. FCFA ÷ diviseur */
    const dcfLoX=`${Math.round((val?Math.min.apply(null,val.sensi.flat()):0)*1000)}/${DIV}`, dcfHiX=`${Math.round((val?Math.max.apply(null,val.sensi.flat()):0)*1000)}/${DIV}`;
    const dcfRow=wsV.rowCount+1;{const r=wsV.getRow(dcfRow);r.getCell(2).value="DCF (flux actualisés)";r.getCell(3).value={formula:dcfLoX};r.getCell(4).value={formula:`C${rEq}`};r.getCell(5).value={formula:dcfHiX};[3,4,5].forEach(c=>r.getCell(c).numFmt=NF);}
    const compRow=wsV.rowCount+1;{const r=wsV.getRow(compRow);r.getCell(2).value="Multiples boursiers (× EBITDA)";r.getCell(3).value={formula:`(${rH}!${H.mc}*0.85)*${ebRefX}-${dnX}`};r.getCell(4).value={formula:`${rH}!${H.mc}*${ebRefX}-${dnX}`};r.getCell(5).value={formula:`(${rH}!${H.mc}*1.15)*${ebRefX}-${dnX}`};[3,4,5].forEach(c=>r.getCell(c).numFmt=NF);}
    const transRow=wsV.rowCount+1;{const r=wsV.getRow(transRow);r.getCell(2).value="Multiples de transactions (× EBITDA)";r.getCell(3).value={formula:`(${rH}!${H.mt}*0.85)*${ebRefX}-${dnX}`};r.getCell(4).value={formula:`${rH}!${H.mt}*${ebRefX}-${dnX}`};r.getCell(5).value={formula:`(${rH}!${H.mt}*1.15)*${ebRefX}-${dnX}`};[3,4,5].forEach(c=>r.getCell(c).numFmt=NF);}
    const anrRow=wsV.rowCount+1;{const anrX=`${Math.round((val&&val.methodes?(val.methodes.find(m=>m.id==="anr")||{}).central:P.bs.CP[P.annees[P.annees.length-1]])*1000)}/${DIV}`;const r=wsV.getRow(anrRow);r.getCell(2).value="Actif net";r.getCell(3).value={formula:anrX};r.getCell(4).value={formula:anrX};r.getCell(5).value={formula:anrX};[3,4,5].forEach(c=>r.getCell(c).numFmt=NF);}
    const rRet=wsV.rowCount+1;{const p=(M.valo&&M.valo.poids)||{dcf:45,comp:20,trans:20,anr:15};const w=(p.dcf||0)+(p.comp||0)+(p.trans||0)+(p.anr||0)||1;
      const r=wsV.getRow(rRet);r.getCell(2).value="Valeur retenue (moyenne pondérée)";
      r.getCell(4).value={formula:`(D${dcfRow}*${p.dcf||0}+D${compRow}*${p.comp||0}+D${transRow}*${p.trans||0}+D${anrRow}*${p.anr||0})/${w}`};
      r.getCell(4).numFmt=NF;r.font={bold:true,color:{argb:"FF172554"}};for(let c=2;c<=5;c++)r.getCell(c).fill=FOND_TOTAL;}
    wsV.columns=[{width:3},{width:44},{width:15},{width:15},{width:15}];

    /* ================= ACCUEIL (navigation) — rempli maintenant, feuille déjà en 1er ================= */
    wsA.getCell("B2").value=DOSSIER.societe;wsA.getCell("B2").font={bold:true,size:18,color:{argb:"FF172554"}};
    wsA.getCell("B3").value="Business plan — projet — modèle financier";wsA.getCell("B3").font={size:11,color:{argb:"FF6B7280"}};
    wsA.getCell("B4").value="Généré le "+new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+" · "+(cabinetExport()||"Findalyx Advisory");wsA.getCell("B4").font={size:9,color:{argb:"FF808080"}};
    wsA.getCell("B6").value="Feuilles du classeur";wsA.getCell("B6").font={bold:true,color:{argb:"FF224289"}};
    const nav=[["Hypothèses",nH,"Cellules jaunes modifiables — tout le classeur se recalcule."],
      ["Modèle",nC,"Modèle financier détaillé par section (CA, coûts, charges, amortissements & VNC, dette, résultat, BFR, bilan, trésorerie)."],
      ["P&L prévisionnel",nP,"Compte de résultat sur l'horizon du plan."],
      ["Bilan prévisionnel",nB,"Grandes masses, bouclé par la trésorerie."],
      ["TFT prévisionnel",nT,"Flux de trésorerie (modèle officiel)."],
      ["Dette",nD,"Échéancier, IDC, remboursement."],
      ["Sources & Emplois",nSU,"Montage de financement (boucle)."],
      ["Valorisation",nV,"DCF, multiples, actif net, valeur retenue."]];
    let ar=7;
    nav.forEach(([lib,feu,desc])=>{ar++;const c=wsA.getCell(ar,2);c.value={text:lib,hyperlink:"#"+q(feu)+"!A1"};c.font={color:{argb:"FF2E5AAC"},underline:true,bold:true};
      wsA.getCell(ar,4).value=desc;wsA.getCell(ar,4).font={size:9,color:{argb:"FF6B7280"}};});
    wsA.columns=[{width:3},{width:24},{width:2},{width:60}];

    finaliserClasseur(wb);
    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download="BP_Modele_"+DOSSIER.societe.replace(/\W+/g,"_")+".xlsx";a.click();
    toast("Classeur du modèle téléchargé");
  }catch(err){toast("Export impossible : "+((err&&err.message)||err));try{console.error("exporterExcelModele",err);}catch(_){}}
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
