/* ============ Business plan & Valorisation — vues ============ */
let SOUS_BP="hyp";
function assurerBP(){
  const base=hypothesesBP(ETATS,DOSSIER.lignesPerso||[]);
  if(!DOSSIER.bp){DOSSIER.bp=base;}
  else{
    /* migration DSO/DPO : anciens dossiers stockaient les délais en jours HT ; on passe en TTC
       (÷1,18) pour aligner l'affichage sur les ratios. La projection est inchangée : projeterBP
       multiplie désormais par 1,18, les deux facteurs se compensent. DOIT précéder la copie des
       clés (sinon convTTC serait recopié depuis la base et la migration serait sautée). */
    if(!DOSSIER.bp.convTTC){
      if(typeof DOSSIER.bp.dso==="number") DOSSIER.bp.dso/=1.18;
      if(typeof DOSSIER.bp.dpo==="number") DOSSIER.bp.dpo/=1.18;
      DOSSIER.bp.convTTC=true;
    }
    if(DOSSIER.bp.inflation===undefined){
      DOSSIER.bp.inflation=0.03;
      (DOSSIER.bp.opex||[]).forEach(o=>{if(o.mode==="pctCA")o.mode="inflation";});
    }
    for(const k in base) if(DOSSIER.bp[k]===undefined) DOSSIER.bp[k]=base[k];
    /* migration : ancienne prime spécifique unique → build-up pays/taille/illiquidité (préserve le ke existant) */
    if(DOSSIER.bp.valo&&DOSSIER.bp.valo.primeSpecifique!==undefined&&DOSSIER.bp.valo.primePays===undefined){
      DOSSIER.bp.valo.primePays=DOSSIER.bp.valo.primeSpecifique;DOSSIER.bp.valo.primeTaille=0;DOSSIER.bp.valo.primeIlliquidite=0;
    }
    for(const k in base.valo) if(DOSSIER.bp.valo[k]===undefined) DOSSIER.bp.valo[k]=base.valo[k];
    base.opex.forEach(o=>{if(!DOSSIER.bp.opex.find(x=>x.code===o.code))DOSSIER.bp.opex.push(o);});
    DOSSIER.bp.opex=DOSSIER.bp.opex.filter(o=>base.opex.find(x=>x.code===o.code));
    /* BFR hors exploitation figé : suit l'historique corrigé par défaut, ne se fige que si saisi manuellement
       (rattrape les dossiers créés avant le correctif de mapping 49 / État créditeur → autres dettes) */
    if(!DOSSIER.bp.autresCreances_fixeManuel) DOSSIER.bp.autresCreances_fixe=base.autresCreances_fixe;
    if(!DOSSIER.bp.autresDettes_fixeManuel)   DOSSIER.bp.autresDettes_fixe=base.autresDettes_fixe;
  }
  /* référence EBITDA ajusté pour la valorisation */
  const aA=ETATS?ETATS.annees[ETATS.annees.length-1]:null;
  if(aA!==null&&DOSSIER.adj&&DOSSIER.adj.ebitda&&DOSSIER.tbagr)
    DOSSIER.bp.valo.adjEbitda=DOSSIER.adj.ebitda.reduce((s2,l)=>s2+valeurAdj(l,aA),0);
  /* empreinte de l'historique ayant servi à calibrer le BP : sert à détecter un ré-import de balances */
  if(DOSSIER.bp._sig===undefined) DOSSIER.bp._sig=histSig();
  return DOSSIER.bp;
}
/* signature de l'historique (années + CA/EBITDA/actif net arrondis) — change dès qu'une balance est ré-importée ou re-mappée */
function histSig(){
  if(!ETATS) return "";
  const v=ETATS.v;
  return ETATS.annees.map(a=>a+":"+Math.round(v.CA[a]||0)+"/"+Math.round(v.EBITDA[a]||0)+"/"+Math.round(v.ACTIF_NET[a]||0)).join("|");
}
function bpDesynchronise(){return !!(DOSSIER&&DOSSIER.bp&&DOSSIER.bp._sig&&DOSSIER.bp._sig!==histSig());}

/* ==================== BP SANS HISTORIQUE — écran « Modèle » ==================== */
var SOUS_MODELE="rev";
var M_PRESETS={
  quantite:{lab:"Quantité directe",rows:[{op:'x',name:'Quantité',val:100000,unit:'u/an',g:0}]},
  vierge:{lab:"Vierge (à composer)",rows:[{op:'x',name:'',val:0,unit:'',g:0}]},
  production:{lab:"Production (capacité)",rows:[{op:'x',name:'Capacité',val:12000000,unit:'L/an',g:0},{op:'x',name:"Taux d'utilisation",val:92,unit:'%',g:0},{op:'x',name:"Taux d'écoulement",val:55,unit:'%',g:0}]},
  mine:{lab:"Extraction (mine)",rows:[{op:'x',name:'Tonnage extrait',val:300000,unit:'t/an',g:2},{op:'x',name:'Teneur',val:2.5,unit:'g/t',g:0},{op:'x',name:'Taux de récupération',val:88,unit:'%',g:0}]},
  energie:{lab:"Énergie (production)",rows:[{op:'x',name:'Puissance installée',val:1000,unit:'kWc',g:0},{op:'x',name:'Facteur de charge',val:18,unit:'%',g:0},{op:'x',name:'Heures',val:8760,unit:'h/an',g:0}]},
  agriculture:{lab:"Agriculture (surface)",rows:[{op:'x',name:'Superficie',val:500,unit:'ha',g:0},{op:'x',name:'Rendement',val:3,unit:'t/ha',g:0},{op:'x',name:'Taux de commercialisation',val:90,unit:'%',g:0}]},
  elevage:{lab:"Élevage (cheptel)",rows:[{op:'x',name:'Effectif',val:10000,unit:'têtes',g:0},{op:'x',name:'Production / tête',val:250,unit:'u/an',g:0},{op:'x',name:'Taux de réussite',val:92,unit:'%',g:0}]},
  negoce:{lab:"Négoce / distribution",rows:[{op:'x',name:'Points de vente',val:3,unit:'PDV',g:0},{op:'x',name:'Ventes / PDV / jour',val:200,unit:'u',g:0},{op:'x',name:'Jours / an',val:300,unit:'j',g:0}]},
  service:{lab:"Service (capacité)",rows:[{op:'x',name:'Nb postes',val:4,unit:'poste',g:0},{op:'x',name:'Heures / jour',val:8,unit:'h',g:0},{op:'x',name:'Jours / an',val:300,unit:'j',g:0},{op:'x',name:"Taux d'occupation",val:60,unit:'%',g:0},{op:'d',name:'Temps / client',val:0.5,unit:'h',g:0}]},
  ecole:{lab:"École / formation",rows:[{op:'x',name:'Effectif élèves',val:400,unit:'élèves',g:5},{op:'x',name:'Taux de remplissage',val:85,unit:'%',g:0}]},
  restauration:{lab:"Restauration",rows:[{op:'x',name:'Couverts / jour',val:120,unit:'couv.',g:0},{op:'x',name:'Jours / an',val:330,unit:'j',g:0},{op:'x',name:'Taux de remplissage',val:70,unit:'%',g:0}]},
  hotellerie:{lab:"Hôtellerie",rows:[{op:'x',name:'Chambres',val:30,unit:'ch.',g:0},{op:'x',name:"Taux d'occupation",val:60,unit:'%',g:0},{op:'x',name:'Jours / an',val:365,unit:'j',g:0}]},
  sante:{lab:"Santé (actes)",rows:[{op:'x',name:'Actes / jour',val:40,unit:'actes',g:0},{op:'x',name:'Jours / an',val:300,unit:'j',g:0}]},
  abonnement:{lab:"Abonnements (ARPU)",rows:[{op:'x',name:'Abonnés',val:5000,unit:'ab.',g:8},{op:'x',name:'Mois',val:12,unit:'mois',g:0}]},
  immobilier:{lab:"Immobilier locatif",rows:[{op:'x',name:'Nombre de lots',val:20,unit:'lots',g:0},{op:'x',name:"Taux d'occupation",val:90,unit:'%',g:0},{op:'x',name:'Mois',val:12,unit:'mois',g:0}]},
  transport:{lab:"Transport",rows:[{op:'x',name:'Véhicules',val:10,unit:'véh.',g:0},{op:'x',name:'Trajets / jour',val:6,unit:'traj.',g:0},{op:'x',name:'Jours / an',val:300,unit:'j',g:0},{op:'x',name:'Places',val:15,unit:'pl.',g:0},{op:'x',name:'Taux de remplissage',val:70,unit:'%',g:0}]}
};
var M_GROUPS=[["Générique",["quantite","vierge"]],["Industrie / production",["production","mine","energie"]],["Agriculture / élevage",["agriculture","elevage"]],["Commerce",["negoce"]],["Services",["service","ecole","restauration","hotellerie","sante","abonnement"]],["Immobilier / transport",["immobilier","transport"]]];
function modeleValoDefaut(){return {rf:0.06,primeMarche:0.055,beta:1.0,pays:"Sénégal",primePays:0.07,primeTaille:0.02,primeIlliquidite:0.015,coutDette:0.09,poidsDette:0.35,g:0.03,midYear:false,tvMode:"gordon",exitMultiple:5.5,multiplesComparables:{min:4,central:5.5,max:7},multiplesTransactions:{min:5,central:6.5,max:8},poids:{dcf:45,comp:20,trans:20,anr:15},bridge:[],anrAjustements:[]};}
/* Risque pays — méthode Damodaran (prime de risque « actions » du pays = spread souverain × volatilité
   relative actions/obligations). Valeurs INDICATIVES à valider/actualiser (Damodaran publie chaque année).
   La prime pays s'ADDITIONNE au build-up : ke = rf + β·(prime marché mûr) + prime pays + taille + illiquidité. */
const PAYS_RISQUE_SRC="Primes indicatives — méthode Damodaran (réf. janv. 2025), à valider/actualiser";
const PAYS_RISQUE=[
  ["UEMOA (zone franc · XOF)",[["Sénégal","Ba3",0.070],["Côte d'Ivoire","Ba2",0.055],["Bénin","B1",0.079],["Burkina Faso","CCC+",0.133],["Mali","Caa2",0.133],["Niger","—",0.133],["Togo","B3",0.096],["Guinée-Bissau","—",0.160]]],
  ["CEMAC (zone franc · XAF)",[["Cameroun","B2",0.096],["Gabon","Caa1",0.115],["Congo","Caa2",0.133],["Tchad","—",0.160],["Guinée équatoriale","—",0.110],["Centrafrique","—",0.180]]],
  ["Autres Afrique",[["Nigeria","Caa1",0.115],["Ghana","défaut",0.180],["Maroc","Ba1",0.036],["Kenya","Caa1",0.115],["Afrique du Sud","Ba2",0.059],["Égypte","Caa1",0.115],["RD Congo","B3",0.133],["Guinée","—",0.133]]],
  ["Références",[["France","Aa2",0.007],["États-Unis (marché mûr)","Aaa",0.000]]]
];
function paysCRP(nom){for(var i=0;i<PAYS_RISQUE.length;i++){var l=PAYS_RISQUE[i][1];for(var j=0;j<l.length;j++)if(l[j][0]===nom)return l[j][2];}return null;}
function hValoPays(nom){var H=assurerValoH();if(nom){var c=paysCRP(nom);if(c!=null)H.valo.primePays=c;}H.valo.pays=nom;sauverDossier();rendre();}
function modeleParDefaut(){
  var y=(typeof CONF_ANNEE!=="undefined"&&CONF_ANNEE)||2025;
  try{y=new Date().getFullYear();}catch(e){}
  return {nb:5,anneeDepart:y,tva:0.18,is_taux:0.30,imf_taux:0.005,inflation:0.03,reportDef_horizon:3,decouvert_taux:0.12,dureeConstruction:0,
    revenus:[{name:"Produit / service 1",tpl:"quantite",rows:JSON.parse(JSON.stringify(M_PRESETS.quantite.rows)),prix:{val:1000,unit:"FCFA",g:2},cout:{m:"pct",val:40}}],
    chargesFixes:[{name:"Loyer & charges",montant:8000000,g:2}],
    personnel:[{poste:"Personnel",effectif:3,salaireMensuel:400000,g:3}],
    capex:[{name:"Investissement initial",montant:50000000,duree:5,annee:1}],
    financement:{mode:"auto",partFP:0.30,moisBFR:3,capital:20000000,apports:0,subvention:0,emprunt:{montant:30000000,taux:0.09,duree:5}},
    bfr:{dso:30,dio:45,dpo:30}, valo:modeleValoDefaut(),
    scenario:"central",
    scenarios:{central:{lab:"Central",dCA:0,dMarge:0,dJours:0},
      optimiste:{lab:"Optimiste",dCA:0.10,dMarge:0.05,dJours:-0.10},
      prudent:{lab:"Prudent",dCA:-0.10,dMarge:-0.05,dJours:0.10}}};
}
function modeleScenariosDefaut(){return {central:{lab:"Central",dCA:0,dMarge:0,dJours:0},optimiste:{lab:"Optimiste",dCA:0.10,dMarge:0.05,dJours:-0.10},prudent:{lab:"Prudent",dCA:-0.10,dMarge:-0.05,dJours:0.10}};}
function assurerModele(){
  if(!DOSSIER.modele)DOSSIER.modele=modeleParDefaut();
  var M=DOSSIER.modele;
  if(!M.valo)M.valo=modeleValoDefaut();
  if(!M.scenarios){M.scenarios=modeleScenariosDefaut();M.scenario="central";}
  if(!M.coutsDirects)M.coutsDirects=[];
  /* ids stables sur les lignes de revenus (référencés par le périmètre des coûts directs) */
  (M.revenus||[]).forEach(function(L){ if(!L.id){ M._seq=(M._seq||0)+1; L.id='L'+M._seq; } });
  /* MIGRATION : le coût qui était au bas de chaque ligne de revenus (L.cout) devient une ligne
     de coût direct à part entière, de périmètre = cette ligne de produit. Idempotent (supprime L.cout). */
  (M.revenus||[]).forEach(function(L){
    if(L.cout){
      var cm=(L.cout.m==='unit')?'unit':'pct';
      M.coutsDirects.push({name:(L.name||'Ligne')+' — coût direct',m:cm,scope:L.id,
        pct:(cm==='pct'?(+L.cout.val||0):0),val:(cm==='unit'?(+L.cout.val||0):0)});
      delete L.cout;
    }
  });
  /* MIGRATION personnel : les charges fixes marquées « personnel » deviennent des POSTES
     (effectif × salaire mensuel). Idempotent (retirées de chargesFixes). */
  if(!M.personnel)M.personnel=[];
  var _reste=[];
  (M.chargesFixes||[]).forEach(function(c){
    if(c.personnel){ M.personnel.push({poste:(c.name||'Personnel'),effectif:1,salaireMensuel:Math.round((+c.montant||0)/12),g:(+c.g||0)}); }
    else _reste.push(c);
  });
  M.chargesFixes=_reste;
  return M;
}
function mScenario(k){assurerModele().scenario=k;sauverDossier();rendre();}
function mHNb(n){var M=assurerModele();M.nb=Math.max(3,Math.min(10,Math.round(+n)||5));sauverDossier();rendre();}
function pillsScenariosModele(M){
  return '<div class="row" style="margin-bottom:12px"><span class="mut">Scénario :</span>'
    +Object.keys(M.scenarios).map(function(k){return '<button class="btn sm '+(M.scenario===k?"primary":"")+'" onclick="mScenario(\''+k+'\')">'+esc(M.scenarios[k].lab)+'</button>';}).join("")
    +'<span class="mut" style="margin-left:14px">Durée du plan :</span>'
    +'<input type="text" inputmode="decimal" class="nin" style="width:56px" value="'+(M.nb||5)+'" onchange="mHNb(this.value)"><span class="mut">ans</span></div>';
}
/* ETATS synthétique (année de référence = dernière projetée) pour la valo et les lecteurs de ETATS */
function etatsFromModele(P){
  var aL=P.annees[P.annees.length-1], v={};
  var s=function(k,x){v[k]={};v[k][aL]=x;};
  s('CA',P.pl.CA[aL]);s('EBITDA',P.pl.EBITDA[aL]);s('EBIT',P.pl.EBIT[aL]);s('RESULTAT_NET',P.pl.RN[aL]);s('MARGE_BRUTE',P.pl.MARGE_BRUTE[aL]);
  s('CAPITAUX_PROPRES',P.bs.CP[aL]);s('DETTES_FINANCIERES',-P.bs.DETTE[aL]);s('TRESORERIE_NETTE',P.bs.TRESO[aL]);s('PROVISIONS_RC',-P.bs.PROVISIONS[aL]);
  s('RESULTAT_FIN',P.pl.RESULTAT_FIN[aL]);s('BFR',P.bs.BFR[aL]);s('ACTIF_NET',P.bs.CP[aL]);
  s('ACTIFS_IMMOBILISES',P.bs.IMMO_NET[aL]);s('CLIENTS',P.bs.CLIENTS[aL]);s('STOCKS',P.bs.STOCKS[aL]);s('FOURNISSEURS',P.bs.FOURNISSEURS[aL]);
  /* capitaux propres décomposés à partir du montage (capital + subventions figés, le report à nouveau
     absorbe les résultats accumulés) → décomposition CP correcte en mode modèle (pas de bilan d'ouverture) */
  var mtg=P.financement||{};
  s('CAPITAL',mtg.capital||0);s('SUBV_PROV_REGL',mtg.subvention||0);
  ['COUTS_DIRECTS','AUTRES_PROD','OPEX','CHARGES_PERSONNEL','DA','IMPOTS','AMORT_DEPREC','AUTRES_CREANCES','AVANCES_FRS','HAO_ACTIF','HAO_PASSIF','DETTES_SOCIALES','DETTES_FISCALES','AUTRES_DETTES','CLIENTS_AVANCES','TRESO_ACTIF','TRESO_PASSIF','PRIMES_RESERVES','RAN_RESULTATS_ANT','RESULTAT_AVANT_IMPOT','PRODUITS_FIN','FRAIS_FIN'].forEach(function(k){if(!v[k])s(k,0);});
  return {annees:[aL],v:v,tft:P.tft||{}};
}
function modeleMode(){return !!(DOSSIER&&DOSSIER.sansHistorique);}

/* ---- handlers ---- */
function mTab(t){SOUS_MODELE=t;rendre();}
function mSet(path,val,num){var M=assurerModele();var p=path.split('.');var o=M;for(var i=0;i<p.length-1;i++)o=o[p[i]];var k=p[p.length-1];o[k]=num?(numFR(val)===null?o[k]:numFR(val)):val;sauverDossier();rendre();}
function mAddLigne(){var M=assurerModele();M.revenus.push({name:"Nouvelle ligne",tpl:"quantite",rows:JSON.parse(JSON.stringify(M_PRESETS.quantite.rows)),prix:{val:1000,unit:"FCFA",g:2},cout:{m:"pct",val:40}});sauverDossier();rendre();}
function mDelLigne(li){var M=assurerModele();M.revenus.splice(li,1);sauverDossier();rendre();}
function mLigneNom(li,val){assurerModele().revenus[li].name=val;sauverDossier();rendre();}
function mTpl(li,tpl){var L=assurerModele().revenus[li];L.tpl=tpl;L.rows=JSON.parse(JSON.stringify(M_PRESETS[tpl].rows));sauverDossier();rendre();}
function mAddInd(li){assurerModele().revenus[li].rows.push({op:'x',name:'',val:1,unit:'',g:0});sauverDossier();rendre();}
function mDelInd(li,ri){var L=assurerModele().revenus[li];if(L.rows.length>1)L.rows.splice(ri,1);sauverDossier();rendre();}
function mIndOp(li,ri){var r=assurerModele().revenus[li].rows[ri];r.op=r.op==='d'?'x':'d';sauverDossier();rendre();}
function mInd(li,ri,champ,val){var r=assurerModele().revenus[li].rows[ri];if(champ==='name'||champ==='unit')r[champ]=val;else{var x=numFR(val);if(x!==null)r[champ]=x;}sauverDossier();rendre();}
function mIndMode(li,ri,mode){var r=assurerModele().revenus[li].rows[ri];if(mode==='yearly'&&r.mode!=='yearly'){r.mode='yearly';r.vals=[];var N=assurerModele().nb||5;for(var k=0;k<N;k++)r.vals.push(Math.round((r.val||0)*Math.pow(1+(r.g||0)/100,k)*1000)/1000);}else if(mode!=='yearly'){r.mode='grow';if(r.vals&&r.vals.length)r.val=r.vals[0];}sauverDossier();rendre();}
function mIndYv(li,ri,k,val){var r=assurerModele().revenus[li].rows[ri];if(!r.vals)r.vals=[];var x=numFR(val);if(x!==null)r.vals[k]=x;sauverDossier();rendre();}
function mPrix(li,champ,val){var P=assurerModele().revenus[li].prix;if(champ==='unit')P.unit=val;else{var x=numFR(val);if(x!==null)P[champ]=x;}sauverDossier();rendre();}
/* (le coût direct par ligne de revenus a été déplacé dans l'onglet Coûts directs — voir mCarteCout / mCout*) */
/* ---- coûts directs pilotés par inducteurs (chaîne × taux, indépendants des revenus) : mêmes gestes que les revenus ---- */
function mCoutsArr(){var M=assurerModele();if(!M.coutsDirects)M.coutsDirects=[];return M.coutsDirects;}
function mAddCout(){mCoutsArr().push({name:"Nouveau coût direct",m:'pct',scope:'all',pct:40,val:0,rows:[{op:'x',name:'Quantité',val:1,unit:'',g:0}],prix:{val:1000,unit:'FCFA',g:2}});sauverDossier();rendre();}
function mDelCout(ci){mCoutsArr().splice(ci,1);sauverDossier();rendre();}
function mCoutNom(ci,val){mCoutsArr()[ci].name=val;sauverDossier();rendre();}
/* garantit la structure inducteurs (les lignes de coût migrées n'ont ni rows ni prix) */
function mCoutIndInit(cl){ if(!cl.rows||!cl.rows.length)cl.rows=[{op:'x',name:'Quantité',val:1,unit:'',g:0}]; if(!cl.prix)cl.prix={val:0,unit:'FCFA',g:0}; return cl; }
function mAddCoutInd(ci){var cl=mCoutIndInit(mCoutsArr()[ci]);cl.rows.push({op:'x',name:'',val:1,unit:'',g:0});sauverDossier();rendre();}
function mDelCoutInd(ci,ri){var cl=mCoutsArr()[ci];if(cl.rows&&cl.rows.length>1)cl.rows.splice(ri,1);sauverDossier();rendre();}
function mCoutIndOp(ci,ri){var r=mCoutIndInit(mCoutsArr()[ci]).rows[ri];r.op=r.op==='d'?'x':'d';sauverDossier();rendre();}
function mCoutInd(ci,ri,champ,val){var r=mCoutIndInit(mCoutsArr()[ci]).rows[ri];if(champ==='name'||champ==='unit')r[champ]=val;else{var x=numFR(val);if(x!==null)r[champ]=x;}sauverDossier();rendre();}
function mCoutIndMode(ci,ri,mode){var r=mCoutIndInit(mCoutsArr()[ci]).rows[ri];if(mode==='yearly'&&r.mode!=='yearly'){r.mode='yearly';r.vals=[];var N=assurerModele().nb||5;for(var k=0;k<N;k++)r.vals.push(Math.round((r.val||0)*Math.pow(1+(r.g||0)/100,k)*1000)/1000);}else if(mode!=='yearly'){r.mode='grow';if(r.vals&&r.vals.length)r.val=r.vals[0];}sauverDossier();rendre();}
function mCoutIndYv(ci,ri,k,val){var r=mCoutIndInit(mCoutsArr()[ci]).rows[ri];if(!r.vals)r.vals=[];var x=numFR(val);if(x!==null)r.vals[k]=x;sauverDossier();rendre();}
function mCoutTaux(ci,champ,val){var pr=mCoutIndInit(mCoutsArr()[ci]).prix;if(champ==='unit')pr.unit=val;else{var x=numFR(val);if(x!==null)pr[champ]=x;}sauverDossier();rendre();}
function mCoutMethode(ci,m){var cl=mCoutsArr()[ci];cl.m=m;
  /* le coût unitaire a BESOIN d'une ligne de produit (son volume) → périmètre par défaut = 1ʳᵉ ligne */
  if(m==='unit'){var revs=assurerModele().revenus||[];if(cl.scope==='all'||!cl.scope)cl.scope=(revs[0]&&revs[0].id)||'all';}
  else if(m==='pct'&&!cl.scope)cl.scope='all';
  else if(m==='ind')mCoutIndInit(cl);   /* crée une 1ʳᵉ ligne d'inducteur + le taux → l'utilisateur voit quoi saisir */
  sauverDossier();rendre();}
function mCoutScope(ci,val){mCoutsArr()[ci].scope=val;sauverDossier();rendre();}
function mCoutPct(ci,val){var x=numFR(val);if(x!==null)mCoutsArr()[ci].pct=x;sauverDossier();rendre();}
function mCoutVal(ci,val){var x=numFR(val);if(x!==null)mCoutsArr()[ci].val=x;sauverDossier();rendre();}
function mAddFixe(){assurerModele().chargesFixes.push({name:"Charge fixe",montant:0,g:0});sauverDossier();rendre();}
function mDelFixe(i){assurerModele().chargesFixes.splice(i,1);sauverDossier();rendre();}
function mFixe(i,champ,val){var c=assurerModele().chargesFixes[i];if(champ==='name')c.name=val;else if(champ==='personnel')c.personnel=val;else{var x=numFR(val);if(x!==null)c[champ]=x;}sauverDossier();rendre();}
/* personnel granulaire : postes {poste, effectif, salaireMensuel, g} → total charges de personnel */
function mPersArr(){var M=assurerModele();if(!M.personnel)M.personnel=[];return M.personnel;}
function mAddPoste(){mPersArr().push({poste:"Nouveau poste",effectif:1,salaireMensuel:200000,g:3});sauverDossier();rendre();}
function mDelPoste(i){mPersArr().splice(i,1);sauverDossier();rendre();}
function mPoste(i,champ,val){var p=mPersArr()[i];if(champ==='poste')p.poste=val;else{var x=numFR(val);if(x!==null)p[champ]=x;}sauverDossier();rendre();}
function mAddCapex(){assurerModele().capex.push({name:"Investissement",montant:0,duree:5,annee:1});sauverDossier();rendre();}
function mDelCapex(i){assurerModele().capex.splice(i,1);sauverDossier();rendre();}
function mCapex(i,champ,val){var c=assurerModele().capex[i];if(champ==='name')c.name=val;else{var x=numFR(val);if(x!==null)c[champ]=x;}sauverDossier();rendre();}

/* ---- séparateurs de milliers dans les champs de saisie (on voit ce qu'on tape) ---- */
function mAmt(x){ if(x==null||x==='')return ''; var n=(typeof x==='number')?x:numFR(x); if(n==null||isNaN(n))return String(x);
  return n.toLocaleString('fr-FR',{maximumFractionDigits:6}); }   /* espace fine insécable fr-FR */
function mSep(el){
  var raw=el.value, caret=(el.selectionStart==null)?raw.length:el.selectionStart;
  var digitsBefore=(raw.slice(0,caret).match(/\d/g)||[]).length;
  var neg=/^\s*-/.test(raw);
  var body=raw.replace(/[^\d.,]/g,'');
  var sepIdx=Math.max(body.lastIndexOf('.'),body.lastIndexOf(','));   /* dernier séparateur = décimal */
  var intp,dec=null;
  if(sepIdx>=0){intp=body.slice(0,sepIdx).replace(/[.,]/g,'');dec=body.slice(sepIdx+1).replace(/[.,]/g,'');}
  else intp=body.replace(/[.,]/g,'');
  intp=intp.replace(/^0+(?=\d)/,'');
  var out=intp.replace(/\B(?=(\d{3})+(?!\d))/g,' ');
  if(dec!==null)out=(out||'0')+','+dec;
  if(neg&&out!=='')out='-'+out;
  el.value=out;
  var np=0;
  if(digitsBefore>0){var seen=0;for(np=0;np<out.length;np++){if(/\d/.test(out.charAt(np))){seen++;if(seen===digitsBefore){np++;break;}}}}
  try{el.setSelectionRange(np,np);}catch(e){}
}

/* ---- rendu ---- */
function mCarteRevenu(L,li){
  var N=assurerModele().nb||5;
  var opts=M_GROUPS.map(function(g){return '<optgroup label="'+g[0]+'">'+g[1].map(function(k){return '<option value="'+k+'"'+(k===L.tpl?' selected':'')+'>'+M_PRESETS[k].lab+'</option>';}).join('')+'</optgroup>';}).join('');
  var rows=(L.rows||[]).map(function(r,ri){
    var vals;
    if(r.mode==='yearly'){var cells='';for(var k=0;k<N;k++){var yv=(r.vals&&r.vals[k]!=null)?r.vals[k]:0;cells+='<span class="mind-yv"><label>An '+(k+1)+'</label><input class="nin ninm" value="'+mAmt(yv)+'" oninput="mSep(this)" onchange="mIndYv('+li+','+ri+','+k+',this.value)"></span>';}vals='<div class="mind-vals">'+cells+'</div>';}
    else vals='<div class="mind-vals"><span class="mind-f"><label>Valeur an 1</label><input class="nin ninm" value="'+mAmt(r.val)+'" oninput="mSep(this)" onchange="mInd('+li+','+ri+',\'val\',this.value)"></span><span class="mind-f"><label>Croissance %/an</label><input class="nin" value="'+r.g+'" onchange="mInd('+li+','+ri+',\'g\',this.value)"></span></div>';
    return '<div class="mind">'
      +'<div class="mind-top"><button class="btn sm" title="× ou ÷" onclick="mIndOp('+li+','+ri+')" style="min-width:34px;font-weight:700">'+(r.op==='d'?'÷':'×')+'</button>'
      +'<input class="sel" style="flex:1;min-width:130px" placeholder="Nom de l\'inducteur" value="'+esc(r.name)+'" onchange="mInd('+li+','+ri+',\'name\',this.value)">'
      +'<input class="nin" style="width:78px" placeholder="unité" value="'+esc(r.unit)+'" onchange="mInd('+li+','+ri+',\'unit\',this.value)">'
      +'<span class="segvue"><button class="'+(r.mode==='yearly'?'':'on')+'" onclick="mIndMode('+li+','+ri+',\'grow\')">Croissance</button><button class="'+(r.mode==='yearly'?'on':'')+'" onclick="mIndMode('+li+','+ri+',\'yearly\')">Par année</button></span>'
      +'<button class="btn sm" title="Retirer" onclick="mDelInd('+li+','+ri+')">✕</button></div>'
      +vals+'</div>';
  }).join('');
  var vol=volInducteurs(L.rows,0), prix=(L.prix&&L.prix.val)||0, ca=vol*prix;
  return '<div class="card" style="padding:0">'
    +'<div class="bande" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><input class="sel" style="flex:1;min-width:160px;font-weight:700" value="'+esc(L.name)+'" onchange="mLigneNom('+li+',this.value)">'
    +'<span class="mut">Modèle</span><select class="sel" style="width:auto" onchange="mTpl('+li+',this.value)">'+opts+'</select>'
    +'<button class="btn sm" title="Supprimer la ligne" onclick="mDelLigne('+li+')">Supprimer</button></div>'
    +'<div style="padding:12px 14px">'
    +'<div class="mut" style="text-transform:uppercase;letter-spacing:.5px;font-size:11px;font-weight:700;margin-bottom:8px">Inducteurs de volume (× ou ÷ · unité % = ratio)</div>'
    +rows
    +'<button class="btn sm" style="margin-top:2px" onclick="mAddInd('+li+')">+ inducteur</button>'
    +'<div class="mind-price"><span class="x">= Volume an 1 : <b>'+Math.round(vol).toLocaleString("fr-FR").replace(/[  ]/g," ")+'</b> <span class="mut">(en volume, pas en FCFA)</span></span></div>'
    +'<div class="mind-price"><span class="x">×</span> <span class="mut">Prix an 1 (FCFA)</span> <input class="nin ninm" value="'+mAmt(prix)+'" oninput="mSep(this)" onchange="mPrix('+li+',\'val\',this.value)"><input class="nin" style="width:70px" value="'+esc(L.prix.unit||'')+'" onchange="mPrix('+li+',\'unit\',this.value)">'
    +'<span class="mut">croissance</span> <input class="nin" style="width:60px" value="'+(L.prix.g||0)+'" onchange="mPrix('+li+',\'g\',this.value)"> %'
    +'<span style="margin-left:auto;font-weight:700;color:#16904E">CA an 1 : '+fmt(ca/1000)+' '+uni().suf+'</span></div>'
    +'<div class="mut" style="border-top:1px dashed #e3e9f2;padding-top:8px;margin-top:6px;font-size:12px">Les coûts directs se paramètrent dans l\'onglet <b>Coûts directs</b> (choix du périmètre : cette ligne, l\'ensemble, ou indépendant).</div>'
    +'</div></div>';
}
function mCarteCout(cl,ci){
  /* coût direct additionnel : soit % du CA, soit chaîne d'inducteurs (× ou ÷) × taux unitaire */
  var Mm=assurerModele(), N=Mm.nb||5, m=(cl.m||'ind'), scope=(cl.scope||'all'), revs=(Mm.revenus||[]);
  var methode='<div class="mind-price" style="border-bottom:1px dashed #e3e9f2;padding-bottom:8px;margin-bottom:8px"><span class="mut">Méthode</span> '
    +'<span class="segvue">'
    +'<button class="'+(m==='pct'?'on':'')+'" onclick="mCoutMethode('+ci+',\'pct\')">% du CA</button>'
    +'<button class="'+(m==='unit'?'on':'')+'" onclick="mCoutMethode('+ci+',\'unit\')">Coût unitaire × volume</button>'
    +'<button class="'+(m==='ind'?'on':'')+'" onclick="mCoutMethode('+ci+',\'ind\')">Inducteurs (indépendant)</button></span></div>';
  var scopeSel='';
  if(m==='pct'||m==='unit'){
    var opts=(m==='pct'?('<option value="all"'+(scope==='all'?' selected':'')+'>L\'ensemble du CA</option>'):'');
    revs.forEach(function(L){opts+='<option value="'+L.id+'"'+(scope===L.id?' selected':'')+'>'+esc(L.name||'Ligne')+'</option>';});
    scopeSel='<div class="mind-price"><span class="mut">S\'applique à</span> <select class="sel" style="width:auto" onchange="mCoutScope('+ci+',this.value)">'+opts+'</select></div>';
  }
  var corps;
  if(m==='pct'){
    corps='<div class="mind-price"><span class="mut">Coût = </span><input class="nin" style="width:66px" value="'+(cl.pct!=null?cl.pct:0)+'" onchange="mCoutPct('+ci+',this.value)"> <span class="mut">% du CA '+(scope==='all'?'total':'de la ligne choisie')+'</span></div>';
  } else if(m==='unit'){
    corps='<div class="mind-price"><span class="mut">Coût unitaire = </span><input class="nin ninm" value="'+mAmt(cl.val||0)+'" oninput="mSep(this)" onchange="mCoutVal('+ci+',this.value)"> <span class="mut">FCFA par unité de volume de la ligne choisie (inflaté)</span></div>';
  } else {
    var rows=(cl.rows||[]).map(function(r,ri){
      var vals;
      if(r.mode==='yearly'){var cells='';for(var k=0;k<N;k++){var yv=(r.vals&&r.vals[k]!=null)?r.vals[k]:0;cells+='<span class="mind-yv"><label>An '+(k+1)+'</label><input class="nin ninm" value="'+mAmt(yv)+'" oninput="mSep(this)" onchange="mCoutIndYv('+ci+','+ri+','+k+',this.value)"></span>';}vals='<div class="mind-vals">'+cells+'</div>';}
      else vals='<div class="mind-vals"><span class="mind-f"><label>Valeur an 1</label><input class="nin ninm" value="'+mAmt(r.val)+'" oninput="mSep(this)" onchange="mCoutInd('+ci+','+ri+',\'val\',this.value)"></span><span class="mind-f"><label>Croissance %/an</label><input class="nin" value="'+(r.g||0)+'" onchange="mCoutInd('+ci+','+ri+',\'g\',this.value)"></span></div>';
      return '<div class="mind"><div class="mind-top"><button class="btn sm" title="× ou ÷" onclick="mCoutIndOp('+ci+','+ri+')" style="min-width:34px;font-weight:700">'+(r.op==='d'?'÷':'×')+'</button>'
        +'<input class="sel" style="flex:1;min-width:130px" placeholder="Nom de l\'inducteur" value="'+esc(r.name||'')+'" onchange="mCoutInd('+ci+','+ri+',\'name\',this.value)">'
        +'<input class="nin" style="width:78px" placeholder="unité" value="'+esc(r.unit||'')+'" onchange="mCoutInd('+ci+','+ri+',\'unit\',this.value)">'
        +'<span class="segvue"><button class="'+(r.mode==='yearly'?'':'on')+'" onclick="mCoutIndMode('+ci+','+ri+',\'grow\')">Croissance</button><button class="'+(r.mode==='yearly'?'on':'')+'" onclick="mCoutIndMode('+ci+','+ri+',\'yearly\')">Par année</button></span>'
        +'<button class="btn sm" title="Retirer" onclick="mDelCoutInd('+ci+','+ri+')">✕</button></div>'+vals+'</div>';
    }).join('');
    var q=volInducteurs(cl.rows,0), taux=(cl.prix&&cl.prix.val)||0, cout=q*taux;
    corps='<div class="mut" style="text-transform:uppercase;letter-spacing:.5px;font-size:11px;font-weight:700;margin-bottom:8px">Inducteurs de quantité (× ou ÷ · unité % = ratio)</div>'
    +rows
    +'<button class="btn sm" style="margin-top:2px" onclick="mAddCoutInd('+ci+')">+ inducteur</button>'
    +'<div class="mind-price"><span class="x">= Quantité an 1 : <b>'+Math.round(q).toLocaleString("fr-FR").replace(/[  ]/g," ")+'</b></span></div>'
    +'<div class="mind-price"><span class="x">×</span> <span class="mut">Taux unitaire an 1 (FCFA)</span> <input class="nin ninm" value="'+mAmt(taux)+'" oninput="mSep(this)" onchange="mCoutTaux('+ci+',\'val\',this.value)"><input class="nin" style="width:70px" value="'+esc((cl.prix&&cl.prix.unit)||'')+'" onchange="mCoutTaux('+ci+',\'unit\',this.value)">'
    +'<span class="mut">croissance</span> <input class="nin" style="width:60px" value="'+((cl.prix&&cl.prix.g)||0)+'" onchange="mCoutTaux('+ci+',\'g\',this.value)"> %'
    +'<span style="margin-left:auto;font-weight:700;color:#c0392b">Coût an 1 : '+fmt(cout/1000)+' '+uni().suf+'</span></div>';
  }
  return '<div class="card" style="padding:0">'
    +'<div class="bande" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><input class="sel" style="flex:1;min-width:160px;font-weight:700" value="'+esc(cl.name||'')+'" onchange="mCoutNom('+ci+',this.value)">'
    +'<button class="btn sm" title="Supprimer" onclick="mDelCout('+ci+')">Supprimer</button></div>'
    +'<div style="padding:12px 14px">'+methode+scopeSel+corps
    +'</div></div>';
}
function vueModele(){
  var M=assurerModele();
  var P=projeterModele(M), A=P.annees, a0=A[0], aL=A[A.length-1], u=uni();
  ETATS=etatsFromModele(P);   /* aligne l'ETATS synthétique sur la projection affichée (les vues BP réutilisées lisent ETATS) */
  /* Même présentation qu'un dossier avec historique : Hypothèses (constructeur) + P&L / Bilan /
     Flux / Dette / Analyse & covenants / Valorisation en onglets séparés ; scénarios en tête. */
  var HK=["rev","cout","fixe","capex","fin","bfr","param"];   /* sous-onglets de « Hypothèses » */
  if(!SOUS_MODELE||(HK.indexOf(SOUS_MODELE)<0&&["pl","bs","tft","dette","analyse","valo"].indexOf(SOUS_MODELE)<0))SOUS_MODELE="rev";
  var enHyp=HK.indexOf(SOUS_MODELE)>=0;
  var topTabs=[["hyp","Hypothèses",enHyp],["pl","P&L prévisionnel",SOUS_MODELE==="pl"],["bs","Bilan prévisionnel",SOUS_MODELE==="bs"],["tft","Flux de trésorerie",SOUS_MODELE==="tft"],["dette","Dette",SOUS_MODELE==="dette"],["analyse","Analyse & covenants",SOUS_MODELE==="analyse"],["valo","Valorisation",SOUS_MODELE==="valo"]];
  var barre=topTabs.map(function(t){return '<button class="btn '+(t[2]?"primary":"")+'" onclick="mTab(\''+(t[0]==="hyp"?"rev":t[0])+'\')">'+t[1]+'</button>';}).join(" ");
  var vueBtn=SOUS_MODELE==="pl"?'<div class="segvue" style="margin-left:6px"><button class="'+(PL_VUE!=="detail"?"on":"")+'" onclick="PL_VUE=\'synth\';rendre()">Synthétique</button><button class="'+(PL_VUE==="detail"?"on":"")+'" onclick="PL_VUE=\'detail\';rendre()">Détaillée</button></div>':"";
  var subTabs=enHyp?('<div class="row" style="margin:0 0 12px;flex-wrap:wrap">'+[["rev","Revenus"],["cout","Coûts directs"],["fixe","Charges fixes"],["capex","Investissements"],["fin","Financement"],["bfr","BFR"],["param","Paramètres"]].map(function(t){return '<button class="btn sm '+(SOUS_MODELE===t[0]?"primary":"")+'" onclick="mTab(\''+t[0]+'\')">'+t[1]+'</button>';}).join(" ")+'</div>'):"";
  var rnCum=A.reduce(function(s,a){return s+P.pl.RN[a];},0);
  var kpis='<div class="kpis">'
    +kpiCard("CA fin de plan (An "+A.length+")",fmt(P.pl.CA[aL])+" "+u.suf,"","","chart","#224289")
    +kpiCard("EBITDA fin de plan",fmt(P.pl.EBITDA[aL])+" "+u.suf,(P.pl.CA[aL]?Math.round(P.pl.EBITDA[aL]/P.pl.CA[aL]*100):0)+"% du CA","","coins","#FA6706")
    +kpiCard("Résultat net cumulé",fmt(rnCum)+" "+u.suf,"sur "+A.length+" ans","","file","#172554")
    +kpiCard("Trésorerie fin de plan",fmt(P.bs.TRESO[aL])+" "+u.suf,P.bs.TRESO[aL]<0?"négative":"",P.bs.TRESO[aL]<0?"down":"up","wallet","#16904E")
    +'</div>';
  var corps="";
  if(SOUS_MODELE==="rev"){
    corps='<div class="mut" style="margin-bottom:10px">Chaque ligne construit son volume avec ses propres inducteurs (× ou ÷), puis × prix = CA. Les modèles sont des points de départ modifiables.</div>'
      +M.revenus.map(function(L,li){return mCarteRevenu(L,li);}).join("")
      +'<button class="btn" onclick="mAddLigne()">+ Ajouter une ligne de revenus</button>';
  } else if(SOUS_MODELE==="cout"){
    var CDL=(M.coutsDirects||[]);
    corps='<div class="mut" style="margin-bottom:10px">Tous les coûts directs se paramètrent ici. Pour chaque coût, choisis sa <b>méthode</b> et son <b>périmètre</b> : <b>% du CA</b> (d\'une ligne de produit ou de l\'ensemble), <b>coût unitaire × volume</b> d\'une ligne, ou <b>inducteurs</b> (indépendant du CA — ex. école : <i>Vacataires</i> = Nb classes × Heures/classe/an × 20 000 F/h).</div>'
      +(CDL.length?CDL.map(function(cl,ci){return mCarteCout(cl,ci);}).join(""):'<div class="mut" style="margin-bottom:8px">Aucun coût direct pour l\'instant.</div>')
      +'<button class="btn" onclick="mAddCout()">+ Ajouter un coût direct</button>'
      +'<div class="card" style="margin-top:14px"><div class="hyp-l"><span>Inflation des coûts unitaires <span class="mut">(méthode « coût unitaire × volume »)</span></span><input class="sel" style="width:46%" value="'+((M.inflation||0)*100)+'" onchange="mSet(\'inflation\',(numFR(this.value)||0)/100)"> %</div></div>';
  } else if(SOUS_MODELE==="fixe"){
    var pers=(M.personnel||[]), persTot1=pers.reduce(function(s,p){return s+(+p.effectif||0)*(+p.salaireMensuel||0)*12;},0);
    corps='<div class="card" style="padding:0"><div class="bande">Frais généraux (hors personnel)</div><div class="tscroll"><table class="tb etat"><tr><th>Poste</th><th class="num">Montant / an</th><th class="num">Croissance %/an</th><th></th></tr>'
      +M.chargesFixes.map(function(c,i){return '<tr><td><input class="sel" value="'+esc(c.name)+'" onchange="mFixe('+i+',\'name\',this.value)"></td>'
        +'<td class="num"><input class="nin ninm" value="'+mAmt(c.montant||0)+'" oninput="mSep(this)" onchange="mFixe('+i+',\'montant\',this.value)"></td>'
        +'<td class="num"><input class="nin" style="width:60px" value="'+(c.g||0)+'" onchange="mFixe('+i+',\'g\',this.value)"></td>'
        +'<td><button class="btn sm" onclick="mDelFixe('+i+')">✕</button></td></tr>';}).join("")
      +'</table></div><div style="padding:10px 14px"><button class="btn sm" onclick="mAddFixe()">+ Ajouter une charge</button></div></div>'
      +'<div class="card" style="padding:0;margin-top:14px"><div class="bande">Charges de personnel — par poste</div>'
      +'<div class="mut" style="padding:8px 14px 0">Effectif × salaire mensuel × 12 = charge annuelle du poste. Le total alimente la ligne « Charges du personnel » (comprise dans les frais généraux du P&L).</div>'
      +'<div class="tscroll"><table class="tb etat"><tr><th>Poste</th><th class="num">Effectif</th><th class="num">Salaire mensuel (FCFA)</th><th class="num">Croissance %/an</th><th class="num">Charge / an</th><th></th></tr>'
      +pers.map(function(p,i){var ann=(+p.effectif||0)*(+p.salaireMensuel||0)*12;return '<tr><td><input class="sel" value="'+esc(p.poste||"")+'" onchange="mPoste('+i+',\'poste\',this.value)"></td>'
        +'<td class="num"><input class="nin" style="width:64px" value="'+(p.effectif||0)+'" onchange="mPoste('+i+',\'effectif\',this.value)"></td>'
        +'<td class="num"><input class="nin ninm" value="'+mAmt(p.salaireMensuel||0)+'" oninput="mSep(this)" onchange="mPoste('+i+',\'salaireMensuel\',this.value)"></td>'
        +'<td class="num"><input class="nin" style="width:60px" value="'+(p.g||0)+'" onchange="mPoste('+i+',\'g\',this.value)"></td>'
        +'<td class="num"><b>'+fmt(ann/1000)+' '+uni().suf+'</b></td>'
        +'<td><button class="btn sm" onclick="mDelPoste('+i+')">✕</button></td></tr>';}).join("")
      +'<tr class="total"><td><b>Total charges de personnel (an 1)</b></td><td></td><td></td><td></td><td class="num"><b>'+fmt(persTot1/1000)+' '+uni().suf+'</b></td><td></td></tr>'
      +'</table></div><div style="padding:10px 14px"><button class="btn sm" onclick="mAddPoste()">+ Ajouter un poste</button></div></div>';
  } else if(SOUS_MODELE==="capex"){
    corps='<div class="card" style="padding:0"><div class="bande">Investissements (CAPEX)</div><div class="tscroll"><table class="tb etat"><tr><th>Poste</th><th class="num">Montant</th><th class="num">Durée (ans)</th><th class="num">Année (1 = 1ʳᵉ)</th><th></th></tr>'
      +M.capex.map(function(c,i){return '<tr><td><input class="sel" value="'+esc(c.name||'')+'" onchange="mCapex('+i+',\'name\',this.value)"></td>'
        +'<td class="num"><input class="nin ninm" value="'+mAmt(c.montant||0)+'" oninput="mSep(this)" onchange="mCapex('+i+',\'montant\',this.value)"></td>'
        +'<td class="num"><input class="nin" style="width:60px" value="'+(c.duree||5)+'" onchange="mCapex('+i+',\'duree\',this.value)"></td>'
        +'<td class="num"><input class="nin" style="width:60px" value="'+(c.annee||1)+'" onchange="mCapex('+i+',\'annee\',this.value)"></td>'
        +'<td><button class="btn sm" onclick="mDelCapex('+i+')">✕</button></td></tr>';}).join("")
      +'</table></div><div style="padding:10px 14px"><button class="btn sm" onclick="mAddCapex()">+ Ajouter un investissement</button><div class="mut" style="margin-top:6px">Amortissement linéaire par poste, à partir de sa mise en service (fin de construction). Année 1 = 1ʳᵉ année du plan ; pendant la construction, l\'investissement est financé mais pas encore amorti.</div></div></div>';
  } else if(SOUS_MODELE==="fin"){
    var f=M.financement||{}, e=f.emprunt||{}, Pf=P.financement, auto=(f.mode==="auto");
    var modeSeg='<div class="hyp-l"><span>Mode de financement</span><span class="segvue">'
      +'<button class="'+(auto?"on":"")+'" onclick="mSet(\'financement.mode\',\'auto\')">Automatique</button>'
      +'<button class="'+(auto?"":"on")+'" onclick="mSet(\'financement.mode\',\'manuel\')">Manuel</button></span></div>';
    var consLigne='<div class="hyp-l"><span>Durée de construction</span><input class="sel" style="width:46%" value="'+(M.dureeConstruction||0)+'" onchange="mSet(\'dureeConstruction\',this.value,1)"> ans <span class="mut">— 0 = exploitation dès l\'année 1</span></div>';
    var empBloc='<div class="hyp-l"><span>Emprunt — taux d\'intérêt</span><input class="sel" style="width:46%" value="'+((e.taux||0)*100)+'" onchange="mSet(\'financement.emprunt.taux\',(numFR(this.value)||0)/100)"> %</div>'
      +'<div class="hyp-l"><span>Emprunt — durée de remboursement</span><input class="sel" style="width:46%" value="'+(e.duree||5)+'" onchange="mSet(\'financement.emprunt.duree\',this.value,1)"> ans</div>';
    var su='<div class="card" style="background:#f6f8fc;margin-top:12px"><div class="sec-titre" style="margin-top:0">Sources & Emplois du montage</div>'
      +'<div class="mut" style="margin:-4px 0 10px">'+(Pf.dureeConstruction>0?('Construction sur '+Pf.dureeConstruction+' an(s) ; exploitation à partir de l\'année '+Pf.anneeExploit+'. Intérêts de construction (IDC) capitalisés dans la dette.'):'Pas de période de construction : investissement et exploitation dès l\'année 1.')+'</div>'
      +'<div class="row" style="gap:24px;flex-wrap:wrap;align-items:flex-start">'
        +'<div style="flex:1;min-width:230px"><div class="mut" style="font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.5px;margin-bottom:4px">Emplois</div>'
          +'<div class="hyp-l"><span>Investissements (jusqu\'à la mise en service)</span><b>'+fmt(Pf.capexFinance)+' '+u.suf+'</b></div>'
          +'<div class="hyp-l"><span>BFR de démarrage ('+Pf.moisBFR+' mois)</span><b>'+fmt(Pf.bfrDemarrage)+' '+u.suf+'</b></div>'
          +(Pf.idc>0.01?'<div class="hyp-l"><span>Intérêts de construction (IDC)</span><b>'+fmt(Pf.idc)+' '+u.suf+'</b></div>':'')
          +'<div class="hyp-l" style="border-top:2px solid #224289;padding-top:6px"><span><b>Total emplois</b></span><b>'+fmt(Pf.emplois)+' '+u.suf+'</b></div></div>'
        +'<div style="flex:1;min-width:230px"><div class="mut" style="font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.5px;margin-bottom:4px">Ressources</div>'
          +'<div class="hyp-l"><span>Fonds propres ('+Math.round(Pf.partFP*100)+' %)</span><b style="color:#16904E">'+fmt(Pf.capital)+' '+u.suf+'</b></div>'
          +(Pf.subvention?'<div class="hyp-l"><span>Subvention</span><b>'+fmt(Pf.subvention)+' '+u.suf+'</b></div>':'')
          +'<div class="hyp-l"><span>Dette'+(Pf.idc>0.01?' (dont IDC)':'')+'</span><b style="color:#224289">'+fmt(Pf.detteAvecIDC)+' '+u.suf+'</b></div>'
          +'<div class="hyp-l" style="border-top:2px solid #224289;padding-top:6px"><span><b>Total ressources</b></span><b>'+fmt(Pf.sources)+' '+u.suf+'</b></div></div>'
      +'</div></div>';
    if(auto){
      corps='<div class="card"><div class="sec-titre" style="margin-top:0">Financement — automatique</div>'+modeSeg+consLigne
        +'<div class="hyp-l"><span>Part de fonds propres (gearing cible)</span><input class="sel" style="width:46%" value="'+(Math.round((f.partFP!=null?f.partFP:0.30)*1000)/10)+'" onchange="mSet(\'financement.partFP\',(numFR(this.value)||0)/100)"> %</div>'
        +'<div class="hyp-l"><span>BFR de démarrage</span><input class="sel" style="width:46%" value="'+(f.moisBFR!=null?f.moisBFR:3)+'" onchange="mSet(\'financement.moisBFR\',this.value,1)"> mois de charges</div>'
        +'<div class="hyp-l"><span>Subvention (optionnel)</span><input class="sel ninm" style="width:46%" value="'+mAmt(f.subvention||0)+'" oninput="mSep(this)" onchange="mSet(\'financement.subvention\',this.value,1)"></div>'
        +empBloc+su
        +'<div class="mut" style="margin-top:8px">Le besoin (investissements + BFR de démarrage + IDC) est réparti fonds propres / dette selon la part choisie ; amortissement et remboursement démarrent à la mise en service.</div></div>';
    } else {
      corps='<div class="card"><div class="sec-titre" style="margin-top:0">Financement — manuel</div>'+modeSeg+consLigne
        +'<div class="hyp-l"><span>Capital social</span><input class="sel ninm" style="width:46%" value="'+mAmt(f.capital||0)+'" oninput="mSep(this)" onchange="mSet(\'financement.capital\',this.value,1)"></div>'
        +'<div class="hyp-l"><span>Apports en compte courant</span><input class="sel ninm" style="width:46%" value="'+mAmt(f.apports||0)+'" oninput="mSep(this)" onchange="mSet(\'financement.apports\',this.value,1)"></div>'
        +'<div class="hyp-l"><span>Subvention</span><input class="sel ninm" style="width:46%" value="'+mAmt(f.subvention||0)+'" oninput="mSep(this)" onchange="mSet(\'financement.subvention\',this.value,1)"></div>'
        +'<div class="hyp-l"><span>Emprunt — montant</span><input class="sel ninm" style="width:46%" value="'+mAmt(e.montant||0)+'" oninput="mSep(this)" onchange="mSet(\'financement.emprunt.montant\',this.value,1)"></div>'
        +empBloc+su
        +'<div class="mut" style="margin-top:8px">Le financement est tiré en année 1 ; en cas de construction, les intérêts courent et sont capitalisés dans la dette (IDC). Aucun bilan d\'ouverture.</div></div>';
    }
  } else if(SOUS_MODELE==="bfr"){
    var b=M.bfr;
    corps='<div class="card"><div class="sec-titre" style="margin-top:0">Besoin en fonds de roulement (en jours)</div>'
      +'<div class="hyp-l"><span>Délai clients (DSO)</span><input class="sel" style="width:46%" value="'+(b.dso||0)+'" onchange="mSet(\'bfr.dso\',this.value,1)"> j</div>'
      +'<div class="hyp-l"><span>Rotation stocks (DIO)</span><input class="sel" style="width:46%" value="'+(b.dio||0)+'" onchange="mSet(\'bfr.dio\',this.value,1)"> j</div>'
      +'<div class="hyp-l"><span>Délai fournisseurs (DPO)</span><input class="sel" style="width:46%" value="'+(b.dpo||0)+'" onchange="mSet(\'bfr.dpo\',this.value,1)"> j</div></div>';
  } else if(SOUS_MODELE==="param"){
    corps='<div class="card"><div class="sec-titre" style="margin-top:0">Paramètres du modèle</div>'
      +'<div class="hyp-l"><span>Nom de la société</span><input class="sel" style="width:46%" value="'+esc(DOSSIER.societe||"")+'" onchange="mRenommer(this.value)"></div>'
      +'<div class="hyp-l"><span>Année de départ</span><input class="sel" style="width:46%" value="'+(M.anneeDepart||2025)+'" onchange="mSet(\'anneeDepart\',this.value,1)"></div>'
      +'<div class="hyp-l"><span>Horizon (années)</span><input class="sel" style="width:46%" value="'+(M.nb||5)+'" onchange="mSet(\'nb\',this.value,1)"></div>'
      +'<div class="hyp-l"><span>Durée de construction (années)</span><input class="sel" style="width:46%" value="'+(M.dureeConstruction||0)+'" onchange="mSet(\'dureeConstruction\',this.value,1)"> <span class="mut">0 = exploitation dès l\'année 1</span></div>'
      +'<div class="hyp-l"><span>TVA</span><input class="sel" style="width:46%" value="'+((M.tva||0)*100)+'" onchange="mSet(\'tva\',(numFR(this.value)||0)/100)"> %</div>'
      +'<div class="hyp-l"><span>Impôt sur les sociétés</span><input class="sel" style="width:46%" value="'+((M.is_taux||0)*100)+'" onchange="mSet(\'is_taux\',(numFR(this.value)||0)/100)"> %</div>'
      +'<div class="hyp-l"><span>Impôt minimum forfaitaire (% du CA)</span><input class="sel" style="width:46%" value="'+((M.imf_taux||0)*100)+'" onchange="mSet(\'imf_taux\',(numFR(this.value)||0)/100)"> %</div></div>';
  } else if(SOUS_MODELE==="pl"){ corps=vueBPPl(P);
  } else if(SOUS_MODELE==="bs"){ corps=vueBPBs(P);
  } else if(SOUS_MODELE==="tft"){ corps=vueBPTft(P);
  } else if(SOUS_MODELE==="dette"){ corps=vueBPDette(P);
  } else if(SOUS_MODELE==="analyse"){ corps=vueModeleAnalyse(P);
  } else if(SOUS_MODELE==="valo"){
    try{ var Vv=valoriserBP(etatsFromModele(P),{is_taux:M.is_taux,valo:M.valo},P);
      corps='<div class="mut" style="margin-bottom:8px">Référence : dernière année projetée (EBITDA, dette nette de clôture). Cliquez sur <b>« Modifier les hypothèses »</b> pour le build-up MEDAF (risque pays Damodaran), les multiples et la valeur terminale.</div>'+vueValoCorps(M,P,Vv);
    }catch(e){ corps='<div class="mut">Valorisation indisponible ('+esc(e.message)+').</div>'; }
  }
  return '<h1>Business plan <span class="chip" style="background:#fff4e8;color:#b45608">Projet</span></h1>'
    +pillsScenariosModele(M)
    +kpis
    +'<div class="row" style="margin:14px 0 12px;align-items:center;flex-wrap:wrap">'+barre+vueBtn+'</div>'
    +subTabs
    +corps;
}
/* Analyse & covenants du modèle : seuil de rentabilité + covenants (mutualisés avec le BP historique)
   + comparaison des 3 scénarios (recalculés via projeterModele sans changer le scénario actif). */
function vueModeleAnalyse(P){
  var M=assurerModele(),u=uni(),aF=P.annees[P.annees.length-1];
  var seuilCov=analyseSeuilCov(P);
  var ordre=[["prudent","Prudent"],["central","Central"],["optimiste","Optimiste"]].filter(function(o){return M.scenarios&&M.scenarios[o[0]];});
  var cols=ordre.map(function(o){
    var Pi=projeterModele(M,o[0]), aL=Pi.annees[Pi.annees.length-1], eq=null;
    try{eq=valoriserBP(etatsFromModele(Pi),{is_taux:M.is_taux,valo:M.valo},Pi).fourchette.retenue;}catch(e){}
    return {lab:o[1],key:o[0],caF:Pi.pl.CA[aL],ebF:Pi.pl.EBITDA[aL],rnCum:Pi.annees.reduce(function(s,a){return s+Pi.pl.RN[a];},0),trF:Pi.bs.TRESO[aL],eq:eq};
  });
  var rowScen=function(lib,f){return '<tr><td>'+lib+'</td>'+cols.map(function(c){return '<td class="num"'+(c.key===M.scenario?' style="font-weight:700"':'')+'>'+fmt(f(c))+'</td>';}).join("")+'</tr>';};
  var tabScen='<div class="card" style="padding:0;margin-top:14px"><div class="bande">'+esc(DOSSIER.societe.toUpperCase())+' — Comparaison des scénarios</div>'
    +'<div class="tscroll"><table class="tb etat"><tr><th>'+u.lib+'</th>'+cols.map(function(c){return '<th class="num">'+c.lab+(c.key===M.scenario?" ★":"")+'</th>';}).join("")+'</tr>'
    +rowScen("Chiffre d'affaires (FY"+String(aF).slice(-2)+"p)",function(c){return c.caF;})
    +rowScen("EBITDA (FY"+String(aF).slice(-2)+"p)",function(c){return c.ebF;})
    +rowScen("Résultat net cumulé sur l'horizon",function(c){return c.rnCum;})
    +rowScen("Trésorerie nette finale",function(c){return c.trF;})
    +rowScen("Valeur des fonds propres (retenue)",function(c){return c.eq;})
    +'</table></div><div class="mut" style="margin:8px 12px">Facteurs de scénario (réglables dans les scénarios) : volume du CA ±, efficience des coûts ±, délais du BFR ±. ★ = scénario actif pour toutes les autres vues.</div></div>';
  return seuilCov+tabScen;
}
function resetBP(){if(!confirm("Réinitialiser toutes les hypothèses depuis l'historique ?"))return;
  DOSSIER.bp=null;assurerBP();sauverDossier();rendre();}
function hBP(k,val,div){const H=assurerBP();const x=numFR(val);
  if(x===null){rendre();return;}H[k]=x/(div||1);
  if(k==="autresCreances_fixe"||k==="autresDettes_fixe")H[k+"Manuel"]=true;
  sauverDossier();rendre();}
function hBPa(k,i,val,div){const H=assurerBP();const x=numFR(val);
  if(x===null){rendre();return;}H[k][i]=x/(div||1);sauverDossier();rendre();}
function hOpex(code,champ,val,div){const H=assurerBP();const o=H.opex.find(x=>x.code===code);
  if(!o)return;
  if(champ==="mode"){o.mode=val;sauverDossier();rendre();return;}
  const x=numFR(val);if(x===null){rendre();return;}
  o[champ]=x/(div||1);sauverDossier();rendre();}
/* hypothèses de valo partagées : dossier avec historique (assurerBP) OU modèle sans balance (assurerModele) */
function assurerValoH(){return (typeof modeleMode==="function"&&modeleMode())?assurerModele():assurerBP();}
function hValo(k,val,div){const H=assurerValoH();const x=numFR(val);
  if(x===null){rendre();return;}H.valo[k]=x/(div||1);sauverDossier();rendre();}
function hValoM(grp,k,val,div){const H=assurerValoH();const x=numFR(val);
  if(x===null){rendre();return;}H.valo[grp][k]=x/(div||1);sauverDossier();rendre();}
function choisirScenario(s){assurerBP().scenario=s;sauverDossier();rendre();}
function hNbPlan(n){
  const H=assurerBP();
  n=Math.max(3,Math.min(10,Math.round(+n)||5));
  ["caCroiss","capex","nouveauxEmprunts"].forEach(k=>{
    const arr=(H[k]||[]).slice(0,n);
    while(arr.length<n)arr.push(k==="nouveauxEmprunts"?0:(arr.length?arr[arr.length-1]:0));
    H[k]=arr;
  });
  H.nb=n;sauverDossier();rendre();
  toast("Plan sur "+n+" ans — séries annuelles ajustées");
}
function ajAnr(){assurerValoH().valo.anrAjustements.push({lib:"Réévaluation…",montant:0});sauverDossier();rendre();}
function majAnr(i,champ,val){const l=assurerValoH().valo.anrAjustements[i];
  if(l){l[champ]=champ==="montant"?(+val)/uni().f:val;sauverDossier();if(champ==="montant")rendre();}}
function supAnr(i){assurerValoH().valo.anrAjustements.splice(i,1);sauverDossier();rendre();}
function ajBridge(){const V=assurerValoH().valo;(V.bridge=V.bridge||[]).push({lib:"Ajustement…",montant:0});sauverDossier();rendre();}
function majBridge(i,champ,val){const l=assurerValoH().valo.bridge[i];
  if(l){l[champ]=champ==="montant"?(+val)/uni().f:val;sauverDossier();if(champ==="montant")rendre();}}
function supBridge(i){assurerValoH().valo.bridge.splice(i,1);sauverDossier();rendre();}
function setTVMode(m){assurerValoH().valo.tvMode=m;sauverDossier();rendre();}

/* champs de saisie */
const inPct=(fn,val,step)=>`<span class="ctl-h"><input type="text" inputmode="decimal" class="nin" value="${+(val*100).toFixed(2)}" step="${step||0.5}" onchange="${fn}(this.value,100)"><span class="mut" style="width:34px">%</span></span>`;
const inJ=(fn,val)=>`<span class="ctl-h"><input type="text" inputmode="decimal" class="nin" value="${Math.round(val)}" step="1" onchange="${fn}(this.value,1)"><span class="mut" style="width:34px">j</span></span>`;
const inN=(fn,val,suf)=>`<span class="ctl-h"><input type="text" inputmode="decimal" class="nin" value="${+val}" step="any" onchange="${fn}(this.value,1)"><span class="mut" style="width:34px">${suf||""}</span></span>`;
const inK=(fn,val)=>{const u=uni();
  return `<span class="ctl-h"><input type="text" inputmode="decimal" class="nin large" value="${Math.round(val*u.f*100)/100}" step="any" onchange="${fn}(this.value,${u.f})"><span class="mut" style="width:52px">${u.lib}</span></span>`;};
const hypLigne=(lab,champ)=>`<div class="hyp-l"><span>${lab}</span>${champ}</div>`;

function pillsScenarios(H){
  return `<div class="row" style="margin-bottom:12px"><span class="mut">Scénario :</span>
  ${Object.entries(H.scenarios).map(([id,s])=>
    `<button class="btn sm ${H.scenario===id?"primary":""}" onclick="choisirScenario('${id}')">${s.lab}</button>`).join("")}
  <span class="mut" style="margin-left:14px">Durée du plan :</span>
  <input type="text" inputmode="decimal" class="nin" style="width:56px" min="3" max="10" step="1" value="${H.nb||5}"
    onchange="hNbPlan(this.value)"><span class="mut">ans</span>
  <button class="btn sm" style="margin-left:auto" onclick="resetBP()">Réinitialiser depuis l'historique</button></div>`;
}

/* table générique hist + prévisionnel */
function tableBP(P,defs,titre){
  const A0=ETATS.annees,a1=A0[A0.length-1],AP=P.annees,v=ETATS.v;
  const mm=(typeof modeleMode==="function"&&modeleMode());   /* pas de colonne « historique » en mode modèle */
  const nc=(mm&&P.financement&&P.financement.dureeConstruction)||0;   /* années de construction (badge dans l'en-tête) */
  const th=(mm?"":`<th class="num" style="opacity:.75">FY${String(a1).slice(-2)}</th>`)
    +AP.map((a,i)=>`<th class="num">FY${String(a).slice(-2)}p${i<nc?'<div style="font-size:9px;font-weight:700;color:#b45608;letter-spacing:.02em">construction</div>':''}</th>`).join("");
  const lignes=defs.map(d=>{
    if(d.sec!==undefined) return `<tr class="sec"><td colspan="${AP.length+(mm?1:2)}">${d.sec}</td></tr>`;
    if(d.type==="pct"){
      const arr=mm?AP.map(a=>d.proj(a)):[d.hist,...AP.map(a=>d.proj(a))];
      const cells=arr.map(x=>`<td class="num pctl">${x===null?"-":Math.round(x*100)+"%"}</td>`).join("");
      return `<tr class="pct"><td>${d.lib}</td>${cells}</tr>`;
    }
    const histCell=mm?"":`<td class="num" style="opacity:.75">${d.hist!==undefined&&d.hist!==null?fmt(d.hist):"-"}</td>`;
    return `<tr class="${d.st||""}${d.clic?" cliquable":""}"${d.clic?` onclick="${d.clic}" title="Voir le détail"`:""}><td>${d.lib}${d.clic?' <span class="chev">›</span>':""}</td>${histCell}
      ${AP.map(a=>`<td class="num">${fmt(d.proj(a))}</td>`).join("")}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — ${titre} <span style="opacity:.7">· scénario ${P.scenario}</span></div>
    <div class="tscroll"><table class="tb etat"><tr><th>${uni().lib}</th>${th}</tr>${lignes}</table></div></div>`;
}

function vueBP(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const H=assurerBP(),P=projeterBP(ETATS,H);
  const A0=ETATS.annees,a1=A0[A0.length-1],AP=P.annees,aF=AP[AP.length-1],v=ETATS.v;
  const tabs=[["hyp","Hypothèses"],["pl","P&L prévisionnel"],["bs","Bilan prévisionnel"],["tft","Flux de trésorerie"],["dette","Dette"],["analyse","Analyse & covenants"]]
    .map(([id,lab])=>`<button class="btn ${SOUS_BP===id?"primary":""}" onclick="SOUS_BP='${id}';rendre()">${lab}</button>`).join(" ");
  const kpis=`<div class="kpis">
    ${kpiCard("CA fin de plan (FY"+String(aF).slice(-2)+"p)",fmt(P.pl.CA[aF])+" "+uni().suf,"",fdelta(v.CA[a1],P.pl.CA[aF]),"chart","#224289")}
    ${kpiCard("EBITDA fin de plan",fmt(P.pl.EBITDA[aF])+" "+uni().suf,(P.pl.CA[aF]?Math.round(P.pl.EBITDA[aF]/P.pl.CA[aF]*100):0)+"% du CA","","coins","#FA6706")}
    ${kpiCard("Résultat net cumulé",fmt(AP.reduce((s,a)=>s+P.pl.RN[a],0))+" "+uni().suf,"sur "+AP.length+" ans","","file","#172554")}
    ${kpiCard("Trésorerie fin de plan",fmt(P.bs.TRESO[aF])+" "+uni().suf,"",P.bs.TRESO[aF]<0?'<span class="d down">négative</span>':'<span class="d up">positive</span>',"wallet","#16904E")}
  </div>`;
  let corps="";
  if(SOUS_BP==="hyp") corps=vueBPHyp(H);
  else if(SOUS_BP==="pl") corps=vueBPPl(P);
  else if(SOUS_BP==="bs") corps=vueBPBs(P);
  else if(SOUS_BP==="tft") corps=vueBPTft(P);
  else if(SOUS_BP==="analyse") corps=vueBPAnalyse(P);
  else corps=vueBPDette(P);
  const vueBtn=SOUS_BP==="pl"?`<div class="segvue">
    <button class="${PL_VUE==="synth"?"on":""}" onclick="PL_VUE='synth';rendre()">Synthétique</button>
    <button class="${PL_VUE==="detail"?"on":""}" onclick="PL_VUE='detail';rendre()">Détaillée</button></div>`:"";
  const banner=bpDesynchronise()?`<div class="card" style="border-left:4px solid #b26b00;background:#fff8ec;display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap">
    <span>⚠ Les hypothèses de ce business plan ont été calculées sur un historique antérieur ; des balances ont changé depuis. Elles ne se recalculent pas automatiquement pour préserver vos saisies.</span>
    <button class="btn sm primary" onclick="resetBP()">Recalculer depuis l'historique</button></div>`:"";
  return `<h1>Business plan</h1>${banner}${pillsScenarios(H)}${kpis}
  <div class="row" style="margin:14px 0 12px;align-items:center">${tabs}${vueBtn}</div>${corps}`;
}

function vueBPHyp(H){
  const AP=Array.from({length:H.nb},(_,i)=>i);
  const a1s=ETATS.annees[ETATS.annees.length-1];
  const anneesIn=(k,vals,argent)=>{
    const titres={caCroiss:"Croissance du CA par année",capex:"Investissements (CAPEX) par année",
      nouveauxEmprunts:"Nouveaux emprunts par année"};
    return `<div class="hyp-l" style="align-items:flex-start"><span>${titres[k]}</span>
    <span class="serie">${AP.map(i=>`<span class="an"><em>FY${String(a1s+1+i).slice(-2)}p</em>${argent
      ?`<input type="text" inputmode="decimal" class="nin large" value="${Math.round(vals[i]*uni().f*100)/100}" step="any" onchange="hBPa('${k}',${i},this.value,${uni().f})">`
      :`<input type="text" inputmode="decimal" class="nin" value="${+(vals[i]*100).toFixed(1)}" step="0.5" onchange="hBPa('${k}',${i},this.value,100)">`}</span>`).join("")}
    <span class="an"><em>&nbsp;</em><span class="mut" style="line-height:30px">${argent?uni().lib:"%"}</span></span></span></div>`;
  };
  const opexRows=H.opex.filter(o=>o.base>0||o.pct>0).map(o=>`<tr>
    <td>${esc(o.lib)}</td>
    <td><select class="sel" onchange="hOpex('${o.code}','mode',this.value)">
      <option value="inflation" ${o.mode==="inflation"?"selected":""}>inflation</option>
      <option value="pctCA" ${o.mode==="pctCA"?"selected":""}>% du CA</option>
      <option value="croissance" ${o.mode==="croissance"?"selected":""}>croissance propre</option></select></td>
    <td class="num">${o.mode==="pctCA"
      ?`<input type="text" inputmode="decimal" class="nin" value="${+(o.pct*100).toFixed(2)}" step="0.1" onchange="hOpex('${o.code}','pct',this.value,100)"> %`
      :o.mode==="croissance"
      ?`<input type="text" inputmode="decimal" class="nin" value="${+(o.croiss*100).toFixed(1)}" step="0.5" onchange="hOpex('${o.code}','croiss',this.value,100)"> %`
      :`<span class="mut">${+((H.inflation||0.03)*100).toFixed(1)} % (inflation)</span>`}</td>
    <td class="num mut">${fmt(-o.base)}</td></tr>`).join("");
  return `<div class="deux">
  <div class="card"><div class="sec-titre" style="margin-top:0">Activité et marges</div>
    ${anneesIn("caCroiss",H.caCroiss)}
    ${hypLigne("Coûts directs (% du CA)",inPct("hBP.bind(null,'coutsDirects_pct')",H.coutsDirects_pct))}
    ${hypLigne("Autres produits et subventions (an 1)",inK("hBP.bind(null,'autresProd_montant')",H.autresProd_montant))}
    ${hypLigne("… croissance annuelle",inPct("hBP.bind(null,'autresProd_croiss')",H.autresProd_croiss))}
    ${hypLigne("Taux d'inflation (défaut des frais généraux)",inPct("hBP.bind(null,'inflation')",H.inflation||0.03))}
    ${hypLigne("Croissance des charges de personnel",inPct("hBP.bind(null,'personnel_croiss')",H.personnel_croiss))}
    ${hypLigne("Taux d'IS effectif",inPct("hBP.bind(null,'is_taux')",H.is_taux))}
    ${hypLigne("Impôt minimum forfaitaire (% du CA)",inPct("hBP.bind(null,'imf_taux')",H.imf_taux!==undefined?H.imf_taux:0.005))}
    ${hypLigne("Déficits reportables — stock initial",inK("hBP.bind(null,'reportDeficitaire')",H.reportDeficitaire||0))}
    ${hypLigne("Déficits reportables — durée (années)",`<input type="text" inputmode="numeric" class="nin" value="${H.reportDef_horizon||3}" onchange="hBP('reportDef_horizon',this.value,1)"> ans`)}
  </div>
  <div class="card"><div class="sec-titre" style="margin-top:0">Besoin en fonds de roulement</div>
    ${hypLigne("Délai clients — DSO",inJ("hBP.bind(null,'dso')",H.dso))}
    ${hypLigne("Rotation des stocks — DIO",inJ("hBP.bind(null,'dio')",H.dio))}
    ${hypLigne("Délai fournisseurs — DPO",inJ("hBP.bind(null,'dpo')",H.dpo))}
    ${hypLigne("Dettes fiscales & sociales (% du CA)",inPct("hBP.bind(null,'dettesFiscSoc_pct')",H.dettesFiscSoc_pct))}
    ${hypLigne("Autres créances — hors exploitation (figées)",inK("hBP.bind(null,'autresCreances_fixe')",H.autresCreances_fixe))}
    ${hypLigne("Autres dettes — hors exploitation (figées)",inK("hBP.bind(null,'autresDettes_fixe')",H.autresDettes_fixe))}
    <div class="sec-titre">Investissements</div>
    ${anneesIn("capex",H.capex,true)}
    ${hypLigne("Taux d'amortissement (sur brut)",inPct("hBP.bind(null,'amort_taux')",H.amort_taux))}
  </div>
  </div>
  <div class="card"><div class="sec-titre" style="margin-top:0">Frais généraux — ligne par ligne</div>
    <div class="mut" style="margin-bottom:8px">Par défaut chaque ligne suit le taux d'inflation sur sa base ; vous pouvez la passer en % du chiffre d'affaires ou lui donner une croissance propre. Base FY${String(ETATS.annees[ETATS.annees.length-1]).slice(-2)} (dernière colonne).</div>
    <table class="tb"><tr><th>Ligne</th><th>Mode</th><th class="num">Valeur</th><th class="num">Base réelle</th></tr>${opexRows}</table>
  </div>
  <div class="card"><div class="sec-titre" style="margin-top:0">Financement et distribution</div>
   <div class="deux" style="margin-bottom:0">
    <div>
    ${hypLigne("Taux d'intérêt de la dette existante",inPct("hBP.bind(null,'dette_taux')",H.dette_taux,0.25))}
    ${hypLigne("Durée résiduelle de la dette existante",inN("hBP.bind(null,'dette_dureeResiduelle')",H.dette_dureeResiduelle,"ans"))}
    ${hypLigne("Produits financiers annuels",inK("hBP.bind(null,'produitsFin_montant')",H.produitsFin_montant))}
    ${hypLigne("Seuil de trésorerie minimum",inK("hBP.bind(null,'seuilCash')",H.seuilCash||0))}
    ${hypLigne("Taux du découvert / ligne court terme",inPct("hBP.bind(null,'decouvert_taux')",H.decouvert_taux||0.12,0.25))}
    </div><div>
    ${hypLigne("Taux des nouveaux emprunts",inPct("hBP.bind(null,'emprunt_taux')",H.emprunt_taux,0.25))}
    ${hypLigne("Durée des nouveaux emprunts",inN("hBP.bind(null,'emprunt_duree')",H.emprunt_duree,"ans"))}
    ${hypLigne("Dividendes (% du résultat N-1)",inPct("hBP.bind(null,'dividendes_payout')",H.dividendes_payout,5))}
    </div></div>
   ${anneesIn("nouveauxEmprunts",H.nouveauxEmprunts,true)}
  </div>`;
}
/* postes de frais généraux (mêmes codes que bp.js OPEX_STD / moteur SERVICES_EXT) */
const BP_OPEX_STD=["AUTRES_ACHATS","SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT","IMPOTS_TAXES","AUTRES_CHARGES"];
const BP_SERVICES_EXT=["SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","AUTRES_SERV_EXT"];
/* détail (modale) des services extérieurs prévisionnels — chaque sous-poste modélisé séparément */
function detailBPServices(){
  const H=assurerBP(),P=projeterBP(ETATS,H),v=ETATS.v;
  const a1=ETATS.annees[ETATS.annees.length-1],AP=P.annees,OD=P.pl.OPEX_DETAIL||{};
  const th=`<th class="num">FY${String(a1).slice(-2)}</th>`+AP.map(a=>`<th class="num">FY${String(a).slice(-2)}p</th>`).join("");
  const lignes=BP_SERVICES_EXT.filter(c=>OD[c]).map(c=>`<tr><td>${esc(OD[c].lib)}</td>
    <td class="num" style="opacity:.75">${fmt((v[c]&&v[c][a1])||0)}</td>
    ${AP.map(a=>`<td class="num">${fmt(OD[c].vals[a])}</td>`).join("")}</tr>`).join("");
  const tot=a=>BP_SERVICES_EXT.reduce((s,c)=>s+(OD[c]?(OD[c].vals[a]||0):0),0);
  document.getElementById("modal").innerHTML=`<div class="voile" onclick="fermerModal(event)">
    <div class="fenetre card" onclick="event.stopPropagation()">
      <div class="f-titre"><b>Services extérieurs — détail prévisionnel</b>
        <button class="btn sm" style="float:right" onclick="fermerModal()">Fermer ✕</button></div>
      <div class="mut" style="margin:4px 0 10px">Chaque sous-poste est modélisé séparément (onglet Hypothèses → Frais généraux ligne par ligne). Montants en ${uni().lib}.</div>
      <div style="overflow:auto;max-height:60vh"><table class="tb"><tr><th>Poste</th>${th}</tr>
      ${lignes||'<tr><td colspan="9" class="mut">Aucun sous-poste.</td></tr>'}
      <tr style="font-weight:700"><td>Services extérieurs</td><td class="num">${fmt((v.SERVICES_EXT&&v.SERVICES_EXT[a1])||0)}</td>${AP.map(a=>`<td class="num">${fmt(tot(a))}</td>`).join("")}</tr>
      </table></div>
    </div></div>`;
}
function vueBPPl(P){
  /* MÊME structure que la Due Diligence : on réutilise DEF_PL (vue synthétique) et on
     mappe chaque agrégat vers sa projection. Cascade identique (RAO, HAO, etc.).
     Bascule Synthétique/Détaillée partagée (PL_VUE) : en Détaillée on déplie les frais
     généraux (ligne par ligne, comme dans les hypothèses) et le résultat financier. */
  const v=ETATS.v,a1=ETATS.annees[ETATS.annees.length-1];
  const rf=a=>(P.pl.PRODUITS_FIN[a]||0)+(P.pl.FRAIS_FIN[a]||0);
  const proj={
    CA:a=>P.pl.CA[a], COUTS_DIRECTS:a=>P.pl.COUTS_DIRECTS[a], MARGE_BRUTE:a=>P.pl.MARGE_BRUTE[a],
    AUTRES_PROD:a=>P.pl.AUTRES_PROD[a],
    FRAIS_GENERAUX:a=>(P.pl.OPEX_TOTAL[a]||0)+(P.pl.CHARGES_PERSONNEL[a]||0),
    EBITDA:a=>P.pl.EBITDA[a], DA:a=>P.pl.DA[a], EBIT:a=>P.pl.EBIT[a],
    RESULTAT_FIN:rf, RAO:a=>P.pl.EBIT[a]+rf(a), RESULTAT_HAO:a=>0,
    RESULTAT_AVANT_IMPOT:a=>P.pl.EBT[a], IMPOTS:a=>P.pl.IS[a], RESULTAT_NET:a=>P.pl.RN[a]};
  const det=(typeof PL_VUE!=="undefined"&&PL_VUE==="detail");
  const mm=(typeof modeleMode==="function"&&modeleMode());
  const defs=[];
  DEF_PL.filter(d=>!d.detail).forEach(d=>{
    if(det&&mm&&d.code==="CA"){
      /* modèle : déplier le chiffre d'affaires par ligne de revenus (ventes par produit) */
      const CAD=P.pl.CA_DETAIL||{};
      Object.keys(CAD).forEach(c=>defs.push({lib:"Ventes — "+CAD[c].lib,st:"det",hist:0,proj:a=>CAD[c].vals[a]||0}));
    }
    if(det&&mm&&d.code==="COUTS_DIRECTS"){
      /* modèle : tous les coûts directs (unifiés dans coutsDirects) dépliés par ligne de coût */
      const CDI=P.pl.CDIND_DETAIL||{};
      Object.keys(CDI).forEach(c=>defs.push({lib:"Coûts directs — "+CDI[c].lib,st:"det",hist:0,proj:a=>CDI[c].vals[a]||0}));
    }
    if(det&&d.code==="FRAIS_GENERAUX"){
      const OD=P.pl.OPEX_DETAIL||{}, od=(c,a)=>OD[c]?(OD[c].vals[a]||0):0;
      if(typeof modeleMode==="function"&&modeleMode()){
        /* modèle sans balance : postes hors personnel dépliés + UNE ligne « Charges du personnel »
           (le personnel EST une composante des frais généraux, pas un sous-total séparé). */
        Object.keys(OD).forEach(c=>defs.push({lib:OD[c].lib,st:"det",hist:0,proj:a=>od(c,a)}));
        if(P.pl.PERS_DETAIL&&Object.keys(P.pl.PERS_DETAIL).length)
          defs.push({lib:"Charges du personnel",st:"det",hist:0,proj:a=>P.pl.CHARGES_PERSONNEL[a]});
      } else {
        /* mêmes catégories que la DD : les services extérieurs sont REGROUPÉS en une ligne
           (cliquable pour voir les sous-postes), pas dépliés. Les lignes personnalisées OPEX
           sont montrées séparément (pas fondues dans les services extérieurs). */
        const push=(code,lib,pr,clic)=>defs.push({lib:lib,st:"det",clic:clic,hist:(v[code]&&v[code][a1])||0,proj:pr});
        push("AUTRES_ACHATS","Autres achats",a=>od("AUTRES_ACHATS",a));
        push("TRANSPORTS","Transports",a=>od("TRANSPORTS",a));
        push("SERVICES_EXT","Services extérieurs",a=>BP_SERVICES_EXT.reduce((s,c)=>s+od(c,a),0),"detailBPServices()");
        push("IMPOTS_TAXES","Impôts et taxes",a=>od("IMPOTS_TAXES",a));
        push("AUTRES_CHARGES","Autres charges",a=>od("AUTRES_CHARGES",a));
        Object.keys(OD).filter(c=>BP_OPEX_STD.indexOf(c)<0).forEach(c=>
          defs.push({lib:OD[c].lib,st:"det",hist:(v[c]&&v[c][a1])||0,proj:a=>od(c,a)}));
        defs.push({lib:"Charges de personnel",st:"det",hist:v.CHARGES_PERSONNEL[a1],proj:a=>P.pl.CHARGES_PERSONNEL[a]});
      }
    }
    if(det&&d.code==="RESULTAT_FIN"){
      defs.push({lib:"Produits financiers",st:"det",hist:(v.REVENUS_FIN&&v.REVENUS_FIN[a1])||0,proj:a=>P.pl.PRODUITS_FIN[a]});
      defs.push({lib:"Charges financières",st:"det",hist:(v.FRAIS_FIN&&v.FRAIS_FIN[a1])||0,proj:a=>P.pl.FRAIS_FIN[a]});
    }
    defs.push({lib:d.lib,st:d.st,hist:(v[d.code]&&v[d.code][a1])||0,proj:proj[d.code]||(a=>0)});
  });
  return tableBP(P,defs,"Compte de résultat prévisionnel");
}
function vueBPBs(P){
  /* MÊME présentation que la Due Diligence (actif net = capitaux propres), en agrégé.
     Créances/dettes HAO fusionnées dans les autres créances/dettes (le HAO reste au P&L).
     Signes : provisions et dettes financières négatives. */
  const v=ETATS.v,a1=ETATS.annees[ETATS.annees.length-1];
  const hAutresCr=v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1]+v.HAO_ACTIF[a1];
  /* dettes fiscales & sociales = exploitation : le prévisionnel projette leur agrégat
     (% du CA) ; on le répartit fiscales / sociales selon leur poids historique */
  const socfisc=v.DETTES_FISCALES[a1]+v.DETTES_SOCIALES[a1];
  const fiscFrac=socfisc?v.DETTES_FISCALES[a1]/socfisc:0, socFrac=socfisc?v.DETTES_SOCIALES[a1]/socfisc:0;
  const hActifNet=v.ACTIFS_IMMOBILISES[a1]+v.BFR[a1]+v.TRESORERIE_NETTE[a1]+v.PROVISIONS_RC[a1]+v.DETTES_FINANCIERES[a1];
  const defs=[
    {lib:"Actifs immobilisés",st:"total",hist:v.ACTIFS_IMMOBILISES[a1],proj:a=>P.bs.IMMO_NET[a]},
    {lib:"Stocks",hist:v.STOCKS[a1],proj:a=>P.bs.STOCKS[a]},
    {lib:"Créances clients",hist:v.CLIENTS[a1],proj:a=>P.bs.CLIENTS[a]},
    {lib:"Autres créances",hist:hAutresCr,proj:a=>P.bs.AUTRES_CREANCES[a]},
    {lib:"Dettes fournisseurs",hist:v.FOURNISSEURS[a1],proj:a=>P.bs.FOURNISSEURS[a]},
    {lib:"Dettes fiscales",hist:v.DETTES_FISCALES[a1],proj:a=>P.bs.DETTES_FISC_SOC[a]*fiscFrac},
    {lib:"Dettes sociales",hist:v.DETTES_SOCIALES[a1],proj:a=>P.bs.DETTES_FISC_SOC[a]*socFrac},
    {lib:"Autres dettes",hist:v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_PASSIF[a1],proj:a=>P.bs.AUTRES_DETTES[a]},
    {lib:"Besoin en fonds de roulement global",st:"total",hist:v.BFR[a1],proj:a=>P.bs.BFR[a]},
    {lib:"Trésorerie active",hist:v.TRESO_ACTIF[a1],proj:a=>P.bs.TRESO_ACTIVE[a]},
    {lib:"Concours bancaires courants (découvert)",hist:v.TRESO_PASSIF[a1],proj:a=>-P.bs.LIGNE_CT[a]},
    {lib:"Trésorerie nette",st:"total",hist:v.TRESORERIE_NETTE[a1],proj:a=>P.bs.TRESO[a]},
    {lib:"Provisions pour risques et charges",hist:v.PROVISIONS_RC[a1],proj:a=>-P.bs.PROVISIONS[a]},
    {lib:"Dettes financières",hist:v.DETTES_FINANCIERES[a1],proj:a=>-P.bs.DETTE[a]},
    {lib:"Actif net",st:"titre",hist:hActifNet,proj:a=>P.bs.IMMO_NET[a]+P.bs.BFR[a]+P.bs.TRESO[a]-P.bs.PROVISIONS[a]-P.bs.DETTE[a]},
    /* capitaux propres décomposés comme la DD : capital/primes/subventions constants
       (pas d'augmentation de capital ni nouvelle subvention modélisée), report à nouveau
       qui accumule les résultats mis en réserve, résultat net = résultat de l'exercice projeté */
    {lib:"Capital social",hist:v.CAPITAL[a1],proj:a=>v.CAPITAL[a1]},
    {lib:"Primes et réserves",hist:v.PRIMES_RESERVES[a1],proj:a=>v.PRIMES_RESERVES[a1]},
    {lib:"Report à nouveau et résultats antérieurs",hist:v.RAN_RESULTATS_ANT[a1],proj:a=>P.bs.CP[a]-v.CAPITAL[a1]-v.PRIMES_RESERVES[a1]-v.SUBV_PROV_REGL[a1]-P.pl.RN[a]},
    {lib:"Subventions et provisions réglementées",hist:v.SUBV_PROV_REGL[a1],proj:a=>v.SUBV_PROV_REGL[a1]},
    {lib:"Résultat net de l'exercice",hist:v.RESULTAT_NET[a1],proj:a=>P.pl.RN[a]},
    {lib:"Capitaux propres",st:"titre",hist:v.CAPITAUX_PROPRES[a1],proj:a=>P.bs.CP[a]}];
  return tableBP(P,defs,"Bilan prévisionnel")+
  `<div class="mut" style="margin-top:8px">Présentation en actif net, identique à la due diligence : Actifs immobilisés + BFR + trésorerie − provisions − dettes financières = Actif net = Capitaux propres (la trésorerie boucle le bilan). BFR d'exploitation projeté (stocks, clients, fournisseurs, dettes fiscales et sociales) ; autres créances et dettes hors exploitation (HAO inclus) figées à leur niveau historique.</div>`;
}
function vueBPTft(P){
  const AP=P.annees;
  const lignes=TFT_DEF.map(([code,lib,st])=>{
    if(!code) return `<tr class="sec"><td colspan="${AP.length+1}">${lib}</td></tr>`;
    return `<tr class="${st||""}"><td>${lib}</td>
      ${AP.map(a=>`<td class="num">${fmt(P.tft[a][code])}</td>`).join("")}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — TFT prévisionnel (modèle officiel) · scénario ${P.scenario}</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${uni().lib}</th>
    ${AP.map(a=>`<th class="num">FY${String(a).slice(-2)}p</th>`).join("")}</tr>${lignes}</table></div></div>`;
}
function vueBPDette(P){
  const AP=P.annees;
  const defs=[["ouverture","Encours à l'ouverture"],["tirage","Nouveaux emprunts tirés"],
    ["remboursement","Remboursements (-)"],["interets","Intérêts de la période (-)"],["cloture","Encours à la clôture"]];
  const lignes=defs.map(([k,lib],i)=>`<tr class="${k==="cloture"?"total":""}"><td>${lib}</td>
    ${AP.map(a=>`<td class="num">${fmt(k==="remboursement"||k==="interets"?-P.dette[a][k]:P.dette[a][k])}</td>`).join("")}</tr>`).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Tableau de la dette financière</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${uni().lib}</th>
    ${AP.map(a=>`<th class="num">FY${String(a).slice(-2)}p</th>`).join("")}</tr>${lignes}</table></div></div>
  <div class="mut" style="margin-top:8px">Dette existante amortie sur sa durée résiduelle ; chaque nouvel emprunt est amorti
  linéairement sur sa durée à partir de l'année suivant son tirage. Les dividendes versés apparaissent dans le TFT.</div>`;
}

/* ---------- Analyse : seuil de rentabilité, covenants, sensibilité ---------- */
/* Seuil de rentabilité + covenants — dépend UNIQUEMENT de la projection P (réutilisable modèle/historique) */
function analyseSeuilCov(P){
  const AP=P.annees,u=uni();
  const th=`<th>${u.lib}</th>${AP.map(a=>`<th class="num">FY${String(a).slice(-2)}p</th>`).join("")}`;
  const x1=x=>(x===null||!isFinite(x))?"n.s.":(Math.round(x*100)/100).toLocaleString("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:2})+"×";
  const pc=x=>(x===null||!isFinite(x))?"n.s.":Math.round(x*100)+" %";
  const jr=x=>(x===null||!isFinite(x))?"n.s.":Math.round(x)+" j";
  const cell=(txt,ok)=>`<td class="num"${ok===true?' style="color:#16904E;font-weight:700"':ok===false?' style="color:#c0392b;font-weight:700"':''}>${txt}</td>`;
  const sr=a=>{const ca=P.pl.CA[a],taux=ca?P.pl.MARGE_BRUTE[a]/ca:0;
    const fixes=-(P.pl.AUTRES_PROD[a]+P.pl.OPEX_TOTAL[a]+P.pl.CHARGES_PERSONNEL[a]+P.pl.DA[a]);
    const seuil=taux?fixes/taux:0;
    return{ca,taux,fixes,seuil,pm:ca?seuil/ca*360:NaN,marge:ca?(ca-seuil)/ca:NaN,levier:P.pl.EBIT[a]?P.pl.MARGE_BRUTE[a]/P.pl.EBIT[a]:NaN};};
  const rowSR=(lib,f,fmtf,st)=>`<tr class="${st||""}"><td>${lib}</td>${AP.map(a=>`<td class="num">${fmtf(f(sr(a)))}</td>`).join("")}</tr>`;
  const tabSR=`<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Seuil de rentabilité (point mort d'exploitation)</div>
    <div class="tscroll"><table class="tb etat"><tr>${th}</tr>
    ${rowSR("Chiffre d'affaires",x=>x.ca,fmt)}
    ${rowSR("Taux de marge sur coûts variables",x=>x.taux,pc)}
    ${rowSR("Charges fixes (nettes des autres produits)",x=>x.fixes,fmt)}
    ${rowSR("Seuil de rentabilité (CA critique)",x=>x.seuil,fmt,"total")}
    ${rowSR("Point mort (en jours de CA)",x=>x.pm,jr)}
    ${rowSR("Marge de sécurité",x=>x.marge,pc)}
    ${rowSR("Levier opérationnel",x=>x.levier,x1)}
    </table></div>
    <div class="mut" style="margin:8px 12px">Point mort où le résultat d'exploitation s'annule : coûts directs = charges variables, tout le reste (frais généraux, personnel, dotations) = charges fixes.</div></div>`;
  const cov=a=>{
    const service=(P.dette[a].remboursement||0)+(P.dette[a].interets||0)+(P.dette[a].interetsCT||0);
    const cfads=P.pl.EBITDA[a]+P.pl.IS[a]+(P.tft[a]?P.tft[a].DBFR:0);
    const detteFin=P.bs.DETTE[a]+(P.bs.LIGNE_CT[a]||0);
    const detteNette=detteFin-(P.bs.TRESO_ACTIVE[a]!==undefined?P.bs.TRESO_ACTIVE[a]:Math.max(0,P.bs.TRESO[a]));
    const acCirc=P.bs.STOCKS[a]+P.bs.CLIENTS[a]+P.bs.AUTRES_CREANCES[a]+(P.bs.TRESO_ACTIVE[a]||Math.max(0,P.bs.TRESO[a]));
    const paCirc=-(P.bs.FOURNISSEURS[a]+P.bs.DETTES_FISC_SOC[a]+P.bs.AUTRES_DETTES[a])+(P.bs.LIGNE_CT[a]||0);
    return {dscr:service>0.5?cfads/service:null, lev:P.pl.EBITDA[a]>0?detteNette/P.pl.EBITDA[a]:null,
      gear:P.bs.CP[a]>0?detteFin/P.bs.CP[a]:null, couv:P.pl.FRAIS_FIN[a]<0?P.pl.EBITDA[a]/-P.pl.FRAIS_FIN[a]:null,
      liq:paCirc>0?acCirc/paCirc:null};
  };
  const rowCov=(lib,key,test)=>`<tr><td>${lib}</td>${AP.map(a=>{const val=cov(a)[key];return cell(x1(val),val==null?null:test(val));}).join("")}</tr>`;
  const tabCov=`<div class="card" style="padding:0;margin-top:14px">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Ratios prévisionnels & covenants bancaires</div>
    <div class="tscroll"><table class="tb etat"><tr>${th}</tr>
    ${rowCov("DSCR — couverture du service de la dette","dscr",v=>v>=1.2)}
    ${rowCov("Dette nette / EBITDA","lev",v=>v<=3.5)}
    ${rowCov("Gearing (dette fin. / capitaux propres)","gear",v=>v<=1.5)}
    ${rowCov("Couverture des intérêts (EBITDA / frais fin.)","couv",v=>v>=3)}
    ${rowCov("Liquidité générale","liq",v=>v>=1)}
    </table></div>
    <div class="mut" style="margin:8px 12px">Vert = seuil bancaire usuel respecté (DSCR ≥ 1,2 · dette nette/EBITDA ≤ 3,5 · gearing ≤ 1,5 · couverture des intérêts ≥ 3 · liquidité ≥ 1). CFADS = EBITDA − impôt − variation du BFR ; service de la dette = remboursements + intérêts (dette et découvert).</div></div>`;
  return tabSR+tabCov;
}
function vueBPAnalyse(P){
  const AP=P.annees,H=assurerBP(),u=uni(),aF=AP[AP.length-1];
  const th=`<th>${u.lib}</th>${AP.map(a=>`<th class="num">FY${String(a).slice(-2)}p</th>`).join("")}`;
  const x1=x=>(x===null||!isFinite(x))?"n.s.":(Math.round(x*100)/100).toLocaleString("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:2})+"×";
  const pc=x=>(x===null||!isFinite(x))?"n.s.":Math.round(x*100)+" %";
  const jr=x=>(x===null||!isFinite(x))?"n.s.":Math.round(x)+" j";
  const cell=(txt,ok)=>`<td class="num"${ok===true?' style="color:#16904E;font-weight:700"':ok===false?' style="color:#c0392b;font-weight:700"':''}>${txt}</td>`;

  /* --- Seuil de rentabilité (point mort d'exploitation, EBIT=0) --- */
  const sr=a=>{const ca=P.pl.CA[a],taux=ca?P.pl.MARGE_BRUTE[a]/ca:0;
    const fixes=-(P.pl.AUTRES_PROD[a]+P.pl.OPEX_TOTAL[a]+P.pl.CHARGES_PERSONNEL[a]+P.pl.DA[a]);
    const seuil=taux?fixes/taux:0;
    return{ca,taux,fixes,seuil,pm:ca?seuil/ca*360:NaN,marge:ca?(ca-seuil)/ca:NaN,levier:P.pl.EBIT[a]?P.pl.MARGE_BRUTE[a]/P.pl.EBIT[a]:NaN};};
  const rowSR=(lib,f,fmtf,st)=>`<tr class="${st||""}"><td>${lib}</td>${AP.map(a=>`<td class="num">${fmtf(f(sr(a)))}</td>`).join("")}</tr>`;
  const tabSR=`<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Seuil de rentabilité (point mort d'exploitation)</div>
    <div class="tscroll"><table class="tb etat"><tr>${th}</tr>
    ${rowSR("Chiffre d'affaires",x=>x.ca,fmt)}
    ${rowSR("Taux de marge sur coûts variables",x=>x.taux,pc)}
    ${rowSR("Charges fixes (nettes des autres produits)",x=>x.fixes,fmt)}
    ${rowSR("Seuil de rentabilité (CA critique)",x=>x.seuil,fmt,"total")}
    ${rowSR("Point mort (en jours de CA)",x=>x.pm,jr)}
    ${rowSR("Marge de sécurité",x=>x.marge,pc)}
    ${rowSR("Levier opérationnel",x=>x.levier,x1)}
    </table></div>
    <div class="mut" style="margin:8px 12px">Point mort où le résultat d'exploitation s'annule : coûts directs = charges variables, tout le reste (frais généraux, personnel, dotations) = charges fixes.</div></div>`;

  /* --- Ratios prévisionnels & covenants bancaires --- */
  const cov=a=>{
    const service=(P.dette[a].remboursement||0)+(P.dette[a].interets||0)+(P.dette[a].interetsCT||0);
    const cfads=P.pl.EBITDA[a]+P.pl.IS[a]+(P.tft[a]?P.tft[a].DBFR:0);
    const detteFin=P.bs.DETTE[a]+(P.bs.LIGNE_CT[a]||0);
    const detteNette=detteFin-(P.bs.TRESO_ACTIVE[a]!==undefined?P.bs.TRESO_ACTIVE[a]:Math.max(0,P.bs.TRESO[a]));
    const acCirc=P.bs.STOCKS[a]+P.bs.CLIENTS[a]+P.bs.AUTRES_CREANCES[a]+(P.bs.TRESO_ACTIVE[a]||Math.max(0,P.bs.TRESO[a]));
    const paCirc=-(P.bs.FOURNISSEURS[a]+P.bs.DETTES_FISC_SOC[a]+P.bs.AUTRES_DETTES[a])+(P.bs.LIGNE_CT[a]||0);
    return {dscr:service>0.5?cfads/service:null, lev:P.pl.EBITDA[a]>0?detteNette/P.pl.EBITDA[a]:null,
      gear:P.bs.CP[a]>0?detteFin/P.bs.CP[a]:null, couv:P.pl.FRAIS_FIN[a]<0?P.pl.EBITDA[a]/-P.pl.FRAIS_FIN[a]:null,
      liq:paCirc>0?acCirc/paCirc:null};
  };
  const rowCov=(lib,key,test)=>`<tr><td>${lib}</td>${AP.map(a=>{const val=cov(a)[key];return cell(x1(val),val==null?null:test(val));}).join("")}</tr>`;
  const tabCov=`<div class="card" style="padding:0;margin-top:14px">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Ratios prévisionnels & covenants bancaires</div>
    <div class="tscroll"><table class="tb etat"><tr>${th}</tr>
    ${rowCov("DSCR — couverture du service de la dette","dscr",v=>v>=1.2)}
    ${rowCov("Dette nette / EBITDA","lev",v=>v<=3.5)}
    ${rowCov("Gearing (dette fin. / capitaux propres)","gear",v=>v<=1.5)}
    ${rowCov("Couverture des intérêts (EBITDA / frais fin.)","couv",v=>v>=3)}
    ${rowCov("Liquidité générale","liq",v=>v>=1)}
    </table></div>
    <div class="mut" style="margin:8px 12px">Vert = seuil bancaire usuel respecté (DSCR ≥ 1,2 · dette nette/EBITDA ≤ 3,5 · gearing ≤ 1,5 · couverture des intérêts ≥ 3 · liquidité ≥ 1). CFADS = EBITDA − impôt − variation du BFR ; service de la dette = remboursements + intérêts (dette et découvert).</div></div>`;

  /* --- Sensibilité de la trésorerie fin de plan (tornado) --- */
  function reproj(mut,s){const H2=JSON.parse(JSON.stringify(H));mut(H2,s);const P2=projeterBP(ETATS,H2);return P2.bs.TRESO[P2.annees[P2.annees.length-1]];}
  const drivers=[
    {lib:"Croissance annuelle du CA",unit:"±3 pts",mut:(H2,s)=>H2.caCroiss=H.caCroiss.map(x=>x+s*0.03)},
    {lib:"Coûts directs (% du CA)",unit:"±2 pts",mut:(H2,s)=>H2.coutsDirects_pct=H.coutsDirects_pct+s*0.02},
    {lib:"Délai clients (DSO)",unit:"±15 j",mut:(H2,s)=>H2.dso=H.dso+s*15},
    {lib:"Investissements (CAPEX)",unit:"±20 %",mut:(H2,s)=>H2.capex=H.capex.map(x=>x*(1+s*0.2))},
    {lib:"Taux d'intérêt de la dette",unit:"±2 pts",mut:(H2,s)=>H2.dette_taux=H.dette_taux+s*0.02}
  ];
  const base=P.bs.TRESO[aF];
  const sens=drivers.map(d=>{const lo=reproj(d.mut,-1),hi=reproj(d.mut,1);return {lib:d.lib,unit:d.unit,mn:Math.min(lo,hi),mx:Math.max(lo,hi),amp:Math.abs(hi-lo)};}).sort((a,b)=>b.amp-a.amp);
  const tabSens=`<div class="card" style="margin-top:14px">
    <div class="sec-titre" style="margin-top:0">Sensibilité de la trésorerie fin de plan (FY${String(aF).slice(-2)}p)</div>
    <div class="mut" style="margin-bottom:8px">Trésorerie nette centrale : <b>${fmt(base)} ${u.suf}</b>. Impact d'une variation isolée de chaque hypothèse (les autres inchangées).</div>
    <table class="tb"><tr><th>Hypothèse</th><th>Variation</th><th class="num">Trésorerie basse</th><th class="num">Trésorerie haute</th><th class="num">Amplitude</th></tr>
    ${sens.map(s=>`<tr><td>${s.lib}</td><td class="mut">${s.unit}</td><td class="num">${fmt(s.mn)}</td><td class="num">${fmt(s.mx)}</td><td class="num" style="font-weight:700">${fmt(s.amp)}</td></tr>`).join("")}
    </table></div>`;

  const graphs=`<div class="deux" style="margin-top:14px">
    <div class="card"><b>Chiffre d'affaires, EBITDA et résultat net</b><div style="height:260px;margin-top:8px"><canvas id="g_bp1"></canvas></div></div>
    <div class="card"><b>Trésorerie nette et dette financière</b><div style="height:260px;margin-top:8px"><canvas id="g_bp2"></canvas></div></div>
  </div>`;

  /* --- Comparaison des scénarios (prudent / central / optimiste) --- */
  const ordreScen=[["bas","Prudent"],["base","Central"],["haut","Optimiste"]];
  const colsScen=ordreScen.map(([id,lab])=>{
    const Pi=projeterBP(ETATS,H,id), Vi=valoriserBP(ETATS,H,Pi), aL=Pi.annees[Pi.annees.length-1];
    return {lab,caF:Pi.pl.CA[aL],ebF:Pi.pl.EBITDA[aL],rnCum:Pi.annees.reduce((s,a)=>s+Pi.pl.RN[a],0),
      trF:Pi.bs.TRESO[aL],eq:Vi.fourchette.retenue};
  });
  const rowScen=(lib,f)=>`<tr><td>${lib}</td>${colsScen.map(c=>`<td class="num">${fmt(f(c))}</td>`).join("")}</tr>`;
  const tabScen=`<div class="card" style="padding:0;margin-top:14px">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — Comparaison des scénarios</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${u.lib}</th>${colsScen.map(c=>`<th class="num">${c.lab}</th>`).join("")}</tr>
    ${rowScen("Chiffre d'affaires (FY"+String(aF).slice(-2)+"p)",c=>c.caF)}
    ${rowScen("EBITDA (FY"+String(aF).slice(-2)+"p)",c=>c.ebF)}
    ${rowScen("Résultat net cumulé sur l'horizon",c=>c.rnCum)}
    ${rowScen("Trésorerie nette finale",c=>c.trF)}
    ${rowScen("Valeur des fonds propres (retenue)",c=>c.eq)}
    </table></div>
    <div class="mut" style="margin:8px 12px">Scénarios paramétrés dans les hypothèses (variation du CA, de la marge et des délais). Le scénario actif pour les autres vues reste « ${(H.scenarios[H.scenario]||H.scenarios.base).lab} ».</div></div>`;

  return tabSR+tabCov+tabScen+tabSens+graphs;
}
function dessinerBPGraphs(){
  if(!ETATS||typeof Chart==="undefined")return;
  const H=assurerBP(),P=projeterBP(ETATS,H),v=ETATS.v,u=uni();
  const A0=ETATS.annees,AP=P.annees,yrs=[...A0,...AP],pr=a=>AP.indexOf(a)>=0;
  const lab=yrs.map(a=>"FY"+String(a).slice(-2)+(pr(a)?"p":""));
  const ca=yrs.map(a=>(pr(a)?P.pl.CA[a]:v.CA[a])*u.f);
  const eb=yrs.map(a=>(pr(a)?P.pl.EBITDA[a]:v.EBITDA[a])*u.f);
  const rn=yrs.map(a=>(pr(a)?P.pl.RN[a]:v.RESULTAT_NET[a])*u.f);
  const tr=yrs.map(a=>(pr(a)?P.bs.TRESO[a]:v.TRESORERIE_NETTE[a])*u.f);
  const det=yrs.map(a=>(pr(a)?P.bs.DETTE[a]+(P.bs.LIGNE_CT[a]||0):-v.DETTES_FINANCIERES[a])*u.f);
  const opt=t=>({responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{boxWidth:12}},title:{display:false}},scales:{y:{ticks:{callback:v2=>v2.toLocaleString("fr-FR")}}}});
  const g1=document.getElementById("g_bp1");
  if(g1)charts.push(new Chart(g1,{type:"bar",data:{labels:lab,datasets:[
    {label:"Chiffre d'affaires",data:ca,backgroundColor:"#c9d6ef",order:3},
    {type:"line",label:"EBITDA",data:eb,borderColor:"#FA6706",backgroundColor:"#FA6706",tension:.3,order:1},
    {type:"line",label:"Résultat net",data:rn,borderColor:"#16904E",backgroundColor:"#16904E",tension:.3,order:0}
  ]},options:opt()}));
  const g2=document.getElementById("g_bp2");
  if(g2)charts.push(new Chart(g2,{type:"line",data:{labels:lab,datasets:[
    {label:"Trésorerie nette",data:tr,borderColor:"#16904E",backgroundColor:"rgba(22,144,78,.12)",fill:true,tension:.3},
    {label:"Dette financière (incl. découvert)",data:det,borderColor:"#c0392b",backgroundColor:"#c0392b",tension:.3}
  ]},options:opt()}));
}

/* ---------- Valorisation ---------- */
let VALO_CACHE=null;
let VALO_HYP_OUVERT=false;
function vueValo(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const H=assurerBP(),P=projeterBP(ETATS,H),V=valoriserBP(ETATS,H,P);
  return `<h1>Valorisation</h1>${pillsScenarios(H)}${vueValoCorps(H,P,V)}`;
}
/* corps de valorisation RÉUTILISABLE : dossier avec historique OU modèle sans balance
   (build-up CAPM éditable, table risque-pays Damodaran, FCFF, pont VE→FP, sensibilité, football-field) */
function vueValoCorps(H,P,V){
  VALO_CACHE=V;
  const u=uni(),AP=P.annees,Vh=H.valo;
  const pc=x=>(x*100).toFixed(2).replace(/\.?0+$/,"")+" %";
  /* hypothèses CAPM */
  const resume=`<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span class="chip ok">Coût des fonds propres ${pc(V.ke)}</span>
    <span class="chip ok">Coût de la dette net ${pc(V.kd)}</span>
    <span class="chip" style="background:#172554;color:#fff">WACC ${pc(V.wacc)}</span>
    <span class="chip">g ${pc(V.g)}</span>
    <span class="chip">Multiples ${Vh.multiplesComparables.central}x / ${Vh.multiplesTransactions.central}x — EBITDA ${Vh.useAdj?"ajusté":"reporté"} ${fmt(V.ebitdaRef)}</span>
    <button class="btn sm ${VALO_HYP_OUVERT?"primary":""}" style="margin-left:auto"
      onclick="VALO_HYP_OUVERT=!VALO_HYP_OUVERT;rendre()">${VALO_HYP_OUVERT?"Masquer les hypothèses":"Modifier les hypothèses"}</button></div>`;
  const capm=`<div class="deux"><div class="card">
    <div class="sec-titre" style="margin-top:0">Coût du capital (CAPM)</div>
    ${hypLigne("Taux sans risque",inPct("hValo.bind(null,'rf')",Vh.rf,0.25))}
    ${hypLigne("Prime de risque marché",inPct("hValo.bind(null,'primeMarche')",Vh.primeMarche,0.25))}
    ${hypLigne("Beta",inN("hValo.bind(null,'beta')",Vh.beta,""))}
    ${hypLigne("Pays (risque souverain — Damodaran)",`<select class="sel" style="max-width:230px" onchange="hValoPays(this.value)"><option value="">— personnalisé —</option>${PAYS_RISQUE.map(g=>`<optgroup label="${g[0]}">${g[1].map(p=>`<option value="${esc(p[0])}"${Vh.pays===p[0]?" selected":""}>${esc(p[0])} · ${p[1]} · ${(p[2]*100).toFixed(1)}%</option>`).join("")}</optgroup>`).join("")}</select>`)}
    ${hypLigne("Prime de risque pays (CRP)",inPct("hValo.bind(null,'primePays')",Vh.primePays||0,0.25))}
    <div class="mut" style="margin:-4px 0 6px;font-size:11px">${PAYS_RISQUE_SRC}</div>
    ${hypLigne("Prime de taille (petite entreprise)",inPct("hValo.bind(null,'primeTaille')",Vh.primeTaille||0,0.25))}
    ${hypLigne("Prime d'illiquidité (non cotée)",inPct("hValo.bind(null,'primeIlliquidite')",Vh.primeIlliquidite||0,0.25))}
    ${hypLigne("Coût de la dette (brut)",inPct("hValo.bind(null,'coutDette')",Vh.coutDette,0.25))}
    ${hypLigne("Poids de la dette (structure cible)",inPct("hValo.bind(null,'poidsDette')",Vh.poidsDette,5))}
    ${hypLigne("Valeur terminale",`<span class="segvue"><button class="${(Vh.tvMode||'gordon')==='gordon'?'on':''}" onclick="setTVMode('gordon')">Gordon</button><button class="${Vh.tvMode==='exit'?'on':''}" onclick="setTVMode('exit')">Mult. sortie</button></span>`)}
    ${(Vh.tvMode||'gordon')==='gordon'
      ?hypLigne("Croissance à l'infini (g)",inPct("hValo.bind(null,'g')",Vh.g,0.25))
      :hypLigne("Multiple de sortie (× EBITDA terminal)",`<span class="ctl-h"><input type="text" inputmode="decimal" class="nin" value="${Vh.exitMultiple||0}" step="0.5" onchange="hValo('exitMultiple',this.value,1)"><span class="mut" style="width:34px">×</span></span>`)}
    ${hypLigne("Convention d'actualisation",`<span class="segvue"><button class="${!Vh.midYear?'on':''}" onclick="assurerValoH().valo.midYear=false;sauverDossier();rendre()">Fin d'année</button><button class="${Vh.midYear?'on':''}" onclick="assurerValoH().valo.midYear=true;sauverDossier();rendre()">Mi-année</button></span>`)}
    <div class="row" style="margin-top:10px">
      <span class="chip ok">Coût des fonds propres : ${pc(V.ke)}</span>
      <span class="chip ok">Coût de la dette net d'IS : ${pc(V.kd)}</span>
      <span class="chip" style="background:#172554;color:#fff">WACC : ${pc(V.wacc)}</span></div>
  </div>
  <div class="card">
    <div class="sec-titre" style="margin-top:0">Méthodes analogiques</div>
    <table class="tb"><tr><th></th><th class="num">Bas</th><th class="num">Central</th><th class="num">Haut</th></tr>
    <tr><td>Multiples boursiers (× EBITDA)</td>
      ${["min","central","max"].map(k=>`<td class="num"><input type="text" inputmode="decimal" class="nin" value="${Vh.multiplesComparables[k]}" step="0.5" onchange="hValoM('multiplesComparables','${k}',this.value,1)"></td>`).join("")}</tr>
    <tr><td>Multiples de transactions (× EBITDA)</td>
      ${["min","central","max"].map(k=>`<td class="num"><input type="text" inputmode="decimal" class="nin" value="${Vh.multiplesTransactions[k]}" step="0.5" onchange="hValoM('multiplesTransactions','${k}',this.value,1)"></td>`).join("")}</tr>
    </table>
    <div class="mut" style="margin-top:4px">Multiples appliqués à l'EBITDA de référence ; fourchette bas / central / haut.</div>
    <div class="sec-titre">Actif net réévalué — ajustements</div>
    ${ (Vh.anrAjustements||[]).map((x,i)=>`<div class="row" style="margin-bottom:6px">
       <input class="sel" style="flex:1" value="${esc(x.lib)}" onchange="majAnr(${i},'lib',this.value)">
       <input type="text" inputmode="decimal" class="nin large" value="${Math.round((x.montant||0)*u.f*100)/100}" step="any" onchange="majAnr(${i},'montant',this.value)">
       <span class="mut">${u.lib}</span>
       <button class="btn sm" onclick="supAnr(${i})">✕</button></div>`).join("") }
    <button class="btn sm" onclick="ajAnr()">+ Ajouter un ajustement</button>
    <div class="mut" style="margin-top:8px">Base : capitaux propres comptables du dernier exercice (${fmt(ETATS.v.CAPITAUX_PROPRES[ETATS.annees[ETATS.annees.length-1]])} ${u.suf}).</div>
  </div></div>`;
  /* construction du FCFF */
  const lF=[["ebit","EBIT"],["impotTheorique","Impôt théorique sur l'EBIT"],["nopat","NOPAT"],
    ["dot","+ Dotations aux amortissements"],["dbfr","± Variation du BFR"],["capex","– Investissements"],["fcff","FCFF"]];
  const fcffT=`<div class="card" style="padding:0">
    <div class="bande">Construction des flux de trésorerie disponibles (FCFF) · scénario ${P.scenario}</div>
    <div class="tscroll"><table class="tb etat"><tr><th>${u.lib}</th>
      ${AP.map(a=>`<th class="num">FY${String(a).slice(-2)}p</th>`).join("")}</tr>
    ${lF.map(([k,lib])=>`<tr class="${k==="fcff"||k==="nopat"?"total":""}"><td>${lib}</td>
      ${AP.map(a=>`<td class="num">${fmt(V.detailFcff[a][k])}</td>`).join("")}</tr>`).join("")}
    <tr><td>Facteur d'actualisation</td>${AP.map((a,i)=>`<td class="num pctl">${(1/Math.pow(1+V.wacc,i+1)).toFixed(3)}</td>`).join("")}</tr>
    <tr class="total"><td>FCFF actualisés</td>${AP.map(a=>`<td class="num">${fmt(V.pv[a])}</td>`).join("")}</tr>
    </table></div></div>`;
  /* bridge */
  const evLbl=V.tvMode==="exit"?"Valeur terminale ("+(Vh.exitMultiple||0)+"× EBITDA terminal)":"Valeur terminale (g = "+pc(V.g)+")";
  const pontRows=[["Somme des FCFF actualisés",V.sommePv],[evLbl,V.vt],
     ["Valeur terminale actualisée",V.vtPv],["Valeur d'entreprise (EV)",V.ev],
     ["(–) Dette nette au "+ETATS.annees[ETATS.annees.length-1],-V.detteNette]];
  if(Math.abs(V.bridgeAjust)>0.5)pontRows.push(["± Ajustements du pont",V.bridgeAjust]);
  pontRows.push(["Valeur des fonds propres (DCF)",V.equityDcf]);
  const bridge=`<div class="deux"><div class="card">
    <div class="sec-titre" style="margin-top:0">De la valeur d'entreprise à la valeur des fonds propres</div>
    <table class="tb">${pontRows.map(([l,x])=>{const tot=/entreprise|fonds propres/.test(l);return `<tr class="${tot?"total":""}"${/fonds propres/.test(l)?' style="font-weight:700"':""}><td>${l}</td><td class="num">${fmt(x)}</td></tr>`;}).join("")}</table>
    <div class="sec-titre">Pont — ajustements (hors dette nette)</div>
    ${(Vh.bridge||[]).map((x,i)=>`<div class="row" style="margin-bottom:6px">
       <input class="sel" style="flex:1" value="${esc(x.lib)}" onchange="majBridge(${i},'lib',this.value)">
       <input type="text" inputmode="decimal" class="nin large" value="${Math.round((x.montant||0)*u.f*100)/100}" step="any" onchange="majBridge(${i},'montant',this.value)">
       <span class="mut">${u.lib}</span><button class="btn sm" onclick="supBridge(${i})">✕</button></div>`).join("")}
    <button class="btn sm" onclick="ajBridge()">+ Ajouter un ajustement</button>
    <div class="mut" style="margin-top:6px">Ex. : − intérêts minoritaires, − provisions (retraite, litiges), + actifs hors exploitation. VT Gordon ${fmt(V.vtGordon)} · VT multiple de sortie ${fmt(V.vtExit)} ${u.suf}.</div></div>
    <div class="card"><div class="sec-titre" style="margin-top:0">Sensibilité — WACC × ${V.tvMode==="exit"?"multiple de sortie":"croissance g"}</div>
    <table class="tb"><tr><th>${u.lib}</th>${(V.sensiAxes?V.sensiAxes.col:[-0.01,-0.005,0,0.005,0.01].map(dg=>V.g+dg)).map(cv=>`<th class="num">${V.tvMode==="exit"?(Math.round(cv*10)/10)+"×":"g "+pc(cv)}</th>`).join("")}</tr>
    ${V.sensi.map((ligne,i)=>{const dw=[-0.01,-0.005,0,0.005,0.01][i];
      return `<tr class="${dw===0?"total":""}"><td>WACC ${pc(V.wacc+dw)}</td>${ligne.map((x,j)=>`<td class="num" ${dw===0&&j===2?'style="font-weight:700"':""}>${fmt(x)}</td>`).join("")}</tr>`;}).join("")}
    </table></div></div>`;
  /* football field */
  const methLabels={dcf:"DCF",comp:"Mult. boursiers",trans:"Mult. transactions",ebit:"EV/EBIT",ca:"EV/CA",per:"PER",anr:"Actif net"};
  const poidsEd=`<div class="sec-titre">Pondération des méthodes (valeur retenue)</div>
    <div class="row" style="flex-wrap:wrap;gap:10px">${V.methodes.map(m=>`<span class="ctl-h"><span class="mut" style="margin-right:4px">${methLabels[m.id]||m.id}</span><input type="text" inputmode="decimal" class="nin" style="width:48px" value="${V.poids[m.id]||0}" onchange="hValoM('poids','${m.id}',this.value,1)"><span class="mut">%</span></span>`).join("")}</div>`;
  const ff=`<div class="card">
    <div class="sec-titre" style="margin-top:0">Synthèse des méthodes — fourchette de valorisation</div>
    <div style="height:${60+V.methodes.length*46}px"><canvas id="gFF"></canvas></div>
    ${poidsEd}
    <div class="row" style="margin-top:10px">
      <span class="chip" style="background:#172554;color:#fff">Fourchette (méthodes pondérées) : ${fmt(V.fourchette.min)} – ${fmt(V.fourchette.max)} ${u.suf}</span>
      <span class="chip ok">Valeur retenue (moyenne pondérée) : ${fmt(V.fourchette.retenue)} ${u.suf}</span></div>
  </div>`;
  return `${resume}${VALO_HYP_OUVERT?capm:""}${fcffT}${bridge}${ff}`;
}
function dessinerFootball(){
  const el=document.getElementById("gFF");
  if(!el||typeof Chart==="undefined"||!VALO_CACHE)return;
  const V=VALO_CACHE,u=uni();
  const fmtFF=x=>Math.round(x).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g," ");
  /* étiquettes min / central / max dessinées sur le graphique */
  const etiquettesFF={id:"etiquettesFF",afterDatasetsDraw(chart){
    const {ctx}=chart;
    const meta=chart.getDatasetMeta(0);
    ctx.save();
    ctx.font="600 11px Calibri, Arial";
    ctx.textBaseline="middle";
    meta.data.forEach((barre,i)=>{
      const m=V.methodes[i], y=barre.y;
      const largeur=barre.x-barre.base;
      const memeVal=Math.abs(m.max-m.min)<=Math.max(1,Math.abs(m.max)*0.005);
      ctx.fillStyle="#172554";
      if(largeur>=60){
        /* barre large : min à gauche, max à droite */
        ctx.textAlign="right"; ctx.fillText(fmtFF(m.min*u.f),barre.base-6,y);
        ctx.textAlign="left";  ctx.fillText(fmtFF(m.max*u.f),barre.x+6,y);
      }else{
        /* barre étroite : fourchette regroupée à droite (évite le chevauchement avec l'axe) */
        ctx.textAlign="left";
        ctx.fillText(memeVal?fmtFF(m.max*u.f):fmtFF(m.min*u.f)+" – "+fmtFF(m.max*u.f),barre.x+6,y);
      }
      /* valeur centrale (orange) au-dessus — sauf doublon quand la barre est réduite à un point */
      if(!(largeur<60&&memeVal)){
        const xC=chart.scales.x.getPixelForValue(m.central*u.f);
        ctx.fillStyle="#FA6706"; ctx.textAlign="center";
        ctx.fillText(fmtFF(m.central*u.f),xC,y-barre.height/2-6);
      }
    });
    ctx.restore();
  }};
  charts.push(new Chart(el,{type:"bar",
    data:{labels:V.methodes.map(m=>m.lib),
      datasets:[
        {data:V.methodes.map(m=>[m.min*u.f,m.max*u.f]),backgroundColor:"#4a6fb5",borderRadius:4,barPercentage:0.55},
        {data:V.methodes.map(m=>[m.central*u.f*0.998,m.central*u.f*1.002]),backgroundColor:"#FA6706",barPercentage:0.75,grouped:false}
      ]},
    options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,
      layout:{padding:{left:70,right:70,top:14}},
      plugins:{legend:{display:false},
        tooltip:{enabled:true,displayColors:false,
          backgroundColor:"#172554",titleFont:{weight:"700"},
          callbacks:{
            title:items=>V.methodes[items[0].dataIndex].lib,
            label:item=>{
              const m=V.methodes[item.dataIndex];
              if(item.datasetIndex===0)
                return "Fourchette : "+fmtFF(m.min*u.f)+" – "+fmtFF(m.max*u.f)+" "+u.lib;
              return "Valeur centrale : "+fmtFF(m.central*u.f)+" "+u.lib;
            }}}},
      scales:{x:{ticks:{callback:v=>fmtFF(v)}},y:{grid:{display:false}}}},
    plugins:[etiquettesFF]}));
}

/* ============ Ajustements de due diligence : EBITDA ajusté & BFR normatif ============ */
function numFR(v){
  v=String(v).replace(/[\s\u00a0\u202f]/g,"").replace(",",".");
  if(v==="")return null;
  const x=parseFloat(v);
  return isFinite(x)?x:null;
}
function assurerAdj(){
  DOSSIER.adj=DOSSIER.adj||{ebitda:[],bfr:[]};
  return DOSSIER.adj;
}
function ajouterAdj(cat){
  assurerAdj()[cat].push({lib:cat==="ebitda"?"Retraitement (ex. rémunération dirigeant, éléments non récurrents)…":"Retraitement (ex. créance exceptionnelle, saisonnalité)…",vals:{}});
  sauverDossier();rendre();
}
function majAdj(cat,i,champ,val,annee){
  const l=assurerAdj()[cat][i];if(!l)return;
  if(champ==="lib"){l.lib=val;sauverDossier();return;}
  const x=numFR(val);
  if(x===null)delete l.vals[annee];       /* saisie vide ou invalide : on ne stocke rien */
  else l.vals[annee]=x/uni().f;
  sauverDossier();
  majAffichageAdj();                       /* mise à jour ciblée : le champ garde le focus */
}
function majAffichageAdj(){
  const A=ETATS.annees;
  ["ebitda","bfr"].forEach(cat=>{
    const res=cat==="ebitda"?ebitdaAjuste:bfrNormatif;
    A.forEach(a=>{
      const eT=document.getElementById("adjT_"+cat+"_"+a);
      if(eT)eT.textContent=fmt(totalAdj(cat,a));
      const eR=document.getElementById("adjR_"+cat+"_"+a);
      if(eR)eR.textContent=fmt(res(a));
      const eP=document.getElementById("adjP_"+cat+"_"+a);
      if(eP)eP.textContent=cat==="ebitda"
        ?(ETATS.v.CA[a]?Math.round(res(a)/ETATS.v.CA[a]*100)+"%":"-")
        :(ETATS.v.CA[a]?Math.round(res(a)/ETATS.v.CA[a]*360)+" j":"-");
    });
    const eM=document.getElementById("adjMoy");
    if(eM)eM.textContent="BFR normatif moyen : "+fmt(A.reduce((s2,a)=>s2+bfrNormatif(a),0)/A.length)+" "+uni().suf;
    const eE=document.getElementById("adjEA");
    const a1=A[A.length-1];
    if(eE)eE.textContent="EBITDA ajusté FY"+String(a1).slice(-2)+" : "+fmt(ebitdaAjuste(a1))+" "+uni().suf;
  });
}
function supAdj(cat,i){assurerAdj()[cat].splice(i,1);sauverDossier();rendre();}
function valeurAdj(l,a){
  if(l.comptes&&l.comptes.length){
    const somme=DOSSIER.tbagr.lignes.filter(t=>l.comptes.includes(t.compte))
      .reduce((q,t)=>q+(t.vals[a]||0),0);
    return (l.sens||1)*somme;
  }
  return l.vals[a]||0;
}
function totalAdj(cat,a){return assurerAdj()[cat].reduce((s,l)=>s+valeurAdj(l,a),0);}
function ebitdaAjuste(a){return ETATS.v.EBITDA[a]+totalAdj("ebitda",a);}
function bfrNormatif(a){return ETATS.v.BFR_EXPL[a]+totalAdj("bfr",a);}

function tableAdj(cat,titre,base,baseLib,resLib){
  const A=ETATS.annees,u=uni();
  const adj=assurerAdj()[cat];
  const ligne=(lib,fn,st,idp)=>`<tr class="${st||""}"><td>${lib}</td>
    ${A.map(a=>`<td class="num"${idp?` id="${idp}_${a}"`:""}>${fmt(fn(a))}</td>`).join("")}<td></td></tr>`;
  const edits=adj.map((l,i)=>{
    const lie=l.comptes&&l.comptes.length;
    const cellules=lie
      ?A.map(a=>`<td class="num">${fmt(valeurAdj(l,a))}</td>`).join("")
      :A.map(a=>`<td class="num"><input type="text" inputmode="decimal" class="nin large" step="any"
        value="${l.vals[a]?Math.round(l.vals[a]*u.f*100)/100:""}"
        onchange="majAdj('${cat}',${i},'val',this.value,${a})"></td>`).join("");
    return `<tr>
    <td><input class="sel" style="width:60%" value="${esc(l.lib)}" onchange="majAdj('${cat}',${i},'lib',this.value)">
      <button class="btn sm" onclick="ouvrirComptesAdj('${cat}',${i})">${lie?"Σ "+l.comptes.length+" compte(s)":"Comptes…"}</button>
      ${lie?`<select class="sel" onchange="const l=assurerAdj()['${cat}'][${i}];l.sens=+this.value;sauverDossier();rendre()">
        <option value="1" ${(l.sens||1)===1?"selected":""}>+ tel quel</option>
        <option value="-1" ${l.sens===-1?"selected":""}>− inversé</option></select>
      <button class="btn sm" title="Délier — repasser en saisie manuelle"
        onclick="const l=assurerAdj()['${cat}'][${i}];l.comptes=null;sauverDossier();rendre()">Délier</button>`:""}</td>
    ${cellules}
    <td><button class="btn sm" onclick="supAdj('${cat}',${i})">✕</button></td></tr>`;}).join("");
  const res=cat==="ebitda"?ebitdaAjuste:bfrNormatif;
  const pctRow=cat==="ebitda"
    ?`<tr class="pct"><td>% EBITDA ajusté / CA</td>${A.map(a=>`<td class="num pctl" id="adjP_${cat}_${a}">${ETATS.v.CA[a]?Math.round(res(a)/ETATS.v.CA[a]*100)+"%":"-"}</td>`).join("")}<td></td></tr>`
    :`<tr class="pct"><td>BFR normatif en jours de CA</td>${A.map(a=>`<td class="num pctl" id="adjP_${cat}_${a}">${ETATS.v.CA[a]?Math.round(res(a)/ETATS.v.CA[a]*360)+" j":"-"}</td>`).join("")}<td></td></tr>`;
  return `<div class="card" style="padding:0">
    <div class="bande">${titre} <span style="opacity:.7">· montants en ${u.lib}</span></div>
    <div style="padding:0 0 10px">
    <table class="tb etat"><tr><th>${u.lib}</th>${A.map(a=>`<th class="num">FY${String(a).slice(-2)}</th>`).join("")}<th style="width:40px"></th></tr>
    ${ligne(baseLib,a=>base(a),"titre")}
    ${edits||'<tr><td colspan="'+(A.length+2)+'" class="mut" style="padding:10px">Aucun retraitement — ajoutez vos lignes ci-dessous.</td></tr>'}
    ${ligne("Total des retraitements",a=>totalAdj(cat,a),"","adjT_"+cat)}
    ${ligne(resLib,res,"total","adjR_"+cat)}
    ${pctRow}
    </table>
    <div style="padding:10px 14px"><button class="btn sm primary" onclick="ajouterAdj('${cat}')">+ Ajouter un retraitement</button></div>
    </div></div>`;
}
let ADJ_SEL=null,ADJ_CIBLE=null;
function ouvrirComptesAdj(cat,i){
  const A=ETATS.annees,aD=A[A.length-1];
  const l=assurerAdj()[cat][i];
  ADJ_SEL=new Set(l.comptes||[]);ADJ_CIBLE=[cat,i];
  /* EBITDA : comptes de gestion (classes 6-8) ; BFR : comptes bilantiels (classes 1-5) */
  const base=DOSSIER.tbagr.lignes.filter(t=>cat==="ebitda"?t.bsPl==="PL":t.bsPl==="BS");
  const lignes=base.slice().sort((a,b)=>a.compte.localeCompare(b.compte)).map(t=>
    `<tr data-txt="${esc((t.compte+" "+t.libelle).toLowerCase())}">
      <td><input type="checkbox" data-c="${t.compte}" ${ADJ_SEL.has(t.compte)?"checked":""} onchange="cocherCompteAdj(this)"></td>
      <td>${t.compte}</td><td>${esc(t.libelle.slice(0,44))}</td><td class="mut">${t.bsPl}</td>
      <td class="num">${fmt(t.vals[aD])}</td></tr>`).join("");
  document.getElementById("modal").innerHTML=`<div class="voile" onclick="fermerModal(event)">
    <div class="fenetre card" onclick="event.stopPropagation()">
      <div class="f-titre"><b>Comptes liés à « ${esc(l.lib)} »</b>
        <button class="btn sm" style="float:right" onclick="fermerModal()">Annuler ✕</button></div>
      <div class="row" style="margin:8px 0">
        <input class="sel" placeholder="Rechercher un compte ou un libellé…" style="width:320px"
          oninput="filtrerComptesAdj(this.value)">
        <span class="mut" id="adjNb"></span>
      </div>
      <div style="overflow:auto;max-height:48vh">
      <table class="tb" id="tAdjC"><tr><th></th><th>Compte</th><th>Libellé</th><th></th>
        <th class="num">FY${String(aD).slice(-2)}</th></tr>${lignes}</table></div>
      <div class="row" style="margin-top:12px">
        <span class="chip" id="adjTot" style="background:#172554;color:#fff"></span>
        <button class="btn primary" style="margin-left:auto" onclick="validerComptesAdj()">Valider la sélection</button>
      </div>
    </div></div>`;
  majTotalAdjModal();
}
function filtrerComptesAdj(q){
  q=q.toLowerCase();
  document.querySelectorAll("#tAdjC tr[data-txt]").forEach(tr=>{
    tr.style.display=(!q||tr.dataset.txt.includes(q))?"":"none";
  });
}
function cocherCompteAdj(cb){
  if(cb.checked)ADJ_SEL.add(cb.dataset.c);else ADJ_SEL.delete(cb.dataset.c);
  majTotalAdjModal();
}
function majTotalAdjModal(){
  const A=ETATS.annees,aD=A[A.length-1];
  const somme=DOSSIER.tbagr.lignes.filter(t=>ADJ_SEL.has(t.compte)).reduce((q,t)=>q+(t.vals[aD]||0),0);
  const nBase=document.querySelectorAll("#tAdjC tr[data-txt]").length;
  const e=document.getElementById("adjTot");
  if(e)e.textContent="Sélection : "+ADJ_SEL.size+" compte(s) — Σ FY"+String(aD).slice(-2)+" = "+fmt(somme)+" "+uni().suf;
  const n=document.getElementById("adjNb");
  if(n)n.textContent=nBase+" comptes "+(ADJ_CIBLE&&ADJ_CIBLE[0]==="ebitda"?"de gestion (classes 6-8)":"bilantiels (classes 1-5)");
}
function validerComptesAdj(){
  const [cat,i]=ADJ_CIBLE;const l=assurerAdj()[cat][i];
  l.comptes=[...ADJ_SEL];
  if(!l.comptes.length)l.comptes=null;
  else if(l.sens===undefined)l.sens=cat==="bfr"?-1:1;
  sauverDossier();fermerModal();rendre();
}
function vueAjustements(){
  const A=ETATS.annees,a1=A[A.length-1];
  const moy=A.reduce((s,a)=>s+bfrNormatif(a),0)/A.length;
  return `<div class="mut" style="margin-bottom:10px">Retraitements de due diligence : éléments non récurrents,
  rémunérations hors marché, charges/produits exceptionnels pour l'EBITDA ; créances et dettes atypiques,
  effets de saisonnalité pour le BFR. Les montants se saisissent en ${uni().lib} (signe : + améliore l'EBITDA, + augmente le BFR).</div>
  ${tableAdj("ebitda","EBITDA AJUSTÉ",a=>ETATS.v.EBITDA[a],"EBITDA reporté","EBITDA ajusté")}
  ${tableAdj("bfr","BFR NORMATIF",a=>ETATS.v.BFR_EXPL[a],"BFR d'exploitation reporté","BFR normatif")}
  <div class="row">
    <span class="chip" style="background:#172554;color:#fff" id="adjMoy">BFR normatif moyen : ${fmt(moy)} ${uni().suf}</span>
    <span class="chip ok" id="adjEA">EBITDA ajusté FY${String(a1).slice(-2)} : ${fmt(ebitdaAjuste(a1))} ${uni().suf}</span>
    <label class="mut" style="display:flex;align-items:center;gap:6px;margin-left:8px">
      <input type="checkbox" ${assurerBP().valo.useAdj?"checked":""}
        onchange="assurerBP().valo.useAdj=this.checked;sauverDossier();toast('Référence des multiples : EBITDA '+(this.checked?'ajusté':'reporté'))">
      utiliser l'EBITDA ajusté comme référence des multiples (valorisation)</label>
  </div>`;
}

/* ============ Paramètres : fiche société ============ */
const INFOS_CHAMPS=[
 ["identite","Identité",[
   ["secteur","Secteur d'activité","ex. Enseignement supérieur privé, Distribution, BTP…"],
   ["formeJuridique","Forme juridique","ex. SA, SARL, SAS…"],
   ["creation","Année de création","ex. 2008"],
   ["effectif","Effectifs","ex. 120 salariés"]]],
 ["activite","Activité",[
   ["description","Description de l'activité","Quelques phrases : que fait la société, pour qui, comment…","zone"],
   ["services","Produits et services","ex. Formation initiale, formation continue, prestations de conseil…","zone"],
   ["marche","Marché et clients","ex. Étudiants de la sous-région, entreprises pharmaceutiques…","zone"]]],
 ["organisation","Organisation",[
   ["dirigeant","Dirigeant principal","ex. Dr Amadou Ba, Directeur général"],
   ["actionnariat","Actionnariat","ex. Famille fondatrice 80 %, cadres 20 %"],
   ["adresse","Implantation","ex. Dakar, Sénégal — 2 campus"],
   ["siteWeb","Site web","ex. www.societe.sn"]]],
 ["mission","Mission",[
   ["contexteMission","Contexte de la mission","ex. Due diligence financière dans le cadre d'une ouverture de capital…","zone"]]]];
function majInfo(champ,val){
  DOSSIER.infos=DOSSIER.infos||{};
  DOSSIER.infos[champ]=val;
  sauverDossier();
}
function vueParams(){
  if(!DOSSIER) return '<div class="mut">Créez ou ouvrez d\'abord un dossier.</div>';
  const I=DOSSIER.infos||{};
  const groupes=INFOS_CHAMPS.map(([id,titre,champs])=>{
    const lignes=champs.map(([k,lab,ph,type])=>type==="zone"
      ?`<div style="margin-bottom:12px"><div class="mut" style="margin-bottom:4px">${lab}</div>
         <textarea class="comm-note" rows="3" placeholder="${esc(ph)}"
           onchange="majInfo('${k}',this.value)">${esc(I[k]||"")}</textarea></div>`
      :`<div class="hyp-l"><span>${lab}</span>
         <input class="sel" style="width:46%" placeholder="${esc(ph)}" value="${esc(I[k]||"")}"
           onchange="majInfo('${k}',this.value)"></div>`).join("");
    return `<div class="card"><div class="sec-titre" style="margin-top:0">${titre}</div>${lignes}</div>`;
  });
  const logoCtl=`<div class="card"><div class="sec-titre" style="margin-top:0">Logo de la société</div>
    <div class="row">
    ${DOSSIER.logo?`<img src="${DOSSIER.logo}" style="height:52px;border:1px solid #eceff3;border-radius:6px;padding:3px;background:#fff">`:'<span class="mut">Aucun logo chargé.</span>'}
    <label class="btn sm">${DOSSIER.logo?"Changer":"Charger un logo"}
      <input type="file" accept="image/*" style="display:none" onchange="chargerLogo(this)"></label>
    ${DOSSIER.logo?`<button class="btn sm" onclick="DOSSIER.logo=null;sauverDossier();rendre()">Retirer</button>`:""}
    </div>
    <div class="mut" style="margin-top:8px">Repris sur les pages de garde du databook, des rapports PowerPoint et du PDF.</div></div>`;
  const secteurCtl=`<div class="card"><div class="sec-titre" style="margin-top:0">Secteur d'activité (benchmark)</div>
    <div class="hyp-l"><span>Secteur de comparaison des ratios et de la notation</span>
      <select class="sel" style="width:46%" onchange="changerSecteur(this.value)">${SECTEURS.map(s=>`<option${s===(DOSSIER.secteur||"Général")?" selected":""}>${s}</option>`).join("")}</select></div>
    <div class="mut" style="margin-top:8px">Détermine la comparaison sectorielle des ratios et le calcul de la Notation. Le benchmark provient de la base en ligne — aucune borne n'est affichée tant que le secteur n'a pas assez de sociétés.</div></div>`;
  const sauvegardeCtl=`<div class="card"><div class="sec-titre" style="margin-top:0">Sauvegarde &amp; restauration</div>
    <div class="mut" style="margin-bottom:8px">Les dossiers sont stockés uniquement sur cet ordinateur (aucun serveur).
    Exportez régulièrement une sauvegarde <code>.json</code> pour les protéger ou les transférer sur un autre poste.
    L'import <b>fusionne</b> : un dossier de même identifiant est remplacé, les autres sont ajoutés.</div>
    <div class="row">
      <button class="btn" onclick="exporterDossiersJSON()">⬇ Exporter tous les dossiers (.json)</button>
      <label class="btn">⬆ Importer une sauvegarde
        <input type="file" accept="application/json,.json" style="display:none" onchange="importerDossiersJSON(this)"></label>
    </div></div>`;
  return `<h1>Paramètres — fiche société</h1>
  <div class="mut" style="margin-bottom:12px">Ces informations alimentent automatiquement les rapports
  (présentation de la société, contexte de mission) et les pages de garde. Tout est facultatif — les
  rubriques laissées vides restent « à compléter » dans les rapports.</div>
  ${secteurCtl}
  <div class="deux">${groupes[0]}${groupes[2]}</div>
  ${groupes[1]}
  <div class="deux">${groupes[3]}${logoCtl}</div>
  ${sauvegardeCtl}`;
}
