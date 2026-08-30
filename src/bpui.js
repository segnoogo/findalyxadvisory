/* ============ Business plan & Valorisation — vues ============ */
let SOUS_BP="hyp";
let SOUS_BPH="ca";   /* sous-onglet des hypotheses (dossier avec historique) */
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

/* ================= CATALOGUE DE MODÈLES SECTORIELS =================
   Au démarrage d'un business plan, l'utilisateur choisit un SECTEUR : l'outil
   charge un modèle complet pré-rempli (lignes de revenus + inducteurs + coûts
   typiques + personnel + CAPEX) et SUGGÈRE les hypothèses clés à renseigner.
   Tout reste 100 % modifiable ensuite — c'est un point de départ, pas un carcan.
   Réutilise M_PRESETS + le moteur projeterModele existant (aucun calcul nouveau).
   Chaque entrée : {id, lab, grp, desc, cles[], build()→M (schéma de modeleDemo)}.
   Les montants sont des ORDRES DE GRANDEUR indicatifs : c'est la STRUCTURE qui compte. */
function _pz(id){return JSON.parse(JSON.stringify((M_PRESETS[id]||M_PRESETS.quantite).rows));}
function _secM(over){
  var M=modeleParDefaut();M.revenus=[];M.coutsDirects=[];M.chargesFixes=[];M.personnel=[];M.capex=[];
  Object.keys(over).forEach(function(k){M[k]=over[k];});
  if(!over.financement){   /* auto-dimensionne le montage à partir du CAPEX : 20 % fonds propres, 45 % emprunt, le reste équilibré en compte courant associés (plug) — remplaçable */
    var cx=(M.capex||[]).reduce(function(s,c){return s+(+c.montant||0);},0);
    var cap=Math.round(cx*0.20/1e6)*1e6||20000000, emp=Math.round(cx*0.45/1e6)*1e6||30000000;
    M.financement={mode:"manuel",partFP:0.35,moisBFR:2,capital:cap,primes:0,apports:0,plug:"cca",ccaTaux:0,ccaMode:"maintenu",ccaDuree:5,subvention:0,emprunt:{montant:emp,taux:0.09,duree:7,grace:1}};
  }
  return M;
}
var MODELES_SECTORIELS=[
  {id:"industrie",lab:"Industrie / transformation",grp:"Industrie & énergie",
   desc:"Usine de transformation (métallurgie, plasturgie, matériaux…) : le CA remonte de la capacité de production, ligne par ligne.",
   cles:["Capacité de production par ligne (tonnes ou unités/an)","Taux d'utilisation et taux d'écoulement (%)","Prix de vente par produit/famille (FCFA/t ou /u)","Coût des matières premières (% du CA)","Investissement en équipements et durée d'amortissement","Structure de financement (fonds propres / emprunt)"],
   build:function(){return _secM({
     revenus:[{name:"Production principale",tpl:"production",rows:[{op:"x",name:"Capacité installée",val:80000,unit:"t/an",g:0},{op:"x",name:"Taux d'utilisation",val:90,unit:"%",g:0},{op:"x",name:"Taux d'écoulement (marché)",val:100,unit:"%",g:0}],prix:{val:650000,unit:"FCFA/t",g:2}},
              {name:"Produits de diversification",tpl:"quantite",rows:[{op:"x",name:"Quantité",val:0,unit:"u/an",g:0}],prix:{val:50000,unit:"FCFA",g:2}}],
     coutsDirects:[{name:"Matières premières",m:"pct",scope:"all",pct:68,val:0},{name:"Énergie et consommables",m:"pct",scope:"all",pct:6,val:0}],
     chargesFixes:[{name:"Maintenance et pièces",montant:120000000,g:3},{name:"Transport et logistique",montant:60000000,g:3},{name:"Assurances, sécurité, administratif",montant:40000000,g:3}],
     personnel:[{poste:"Ouvriers de production",effectif:40,salaireMensuel:120000,g:3},{poste:"Encadrement et maintenance",effectif:8,salaireMensuel:350000,g:3},{poste:"Administration et commercial",effectif:6,salaireMensuel:250000,g:3}],
     capex:[{name:"Lignes de production et équipements",montant:6000000000,duree:10,annee:1},{name:"Bâtiments et aménagements",montant:2000000000,duree:20,annee:1}],
     bfr:{dso:45,dio:60,dpo:45}});}},
  {id:"agro",lab:"Agro-alimentaire (transformation)",grp:"Industrie & énergie",
   desc:"Transformation agroalimentaire (minoterie, huilerie, jus, laiterie…) : capacité de production × prix, matière première dominante.",
   cles:["Capacité de transformation (tonnes ou litres/an)","Taux d'utilisation (%)","Prix de vente du produit fini","Coût de la matière première agricole (% du CA)","Emballage et pertes","Chaîne du froid / logistique"],
   build:function(){return _secM({
     revenus:[{name:"Produit fini transformé",tpl:"production",rows:[{op:"x",name:"Capacité de transformation",val:2000000,unit:"L/an",g:0},{op:"x",name:"Taux d'utilisation",val:85,unit:"%",g:0}],prix:{val:900,unit:"FCFA/L",g:2}}],
     coutsDirects:[{name:"Matière première agricole",m:"pct",scope:"all",pct:55,val:0},{name:"Emballage",m:"pct",scope:"all",pct:6,val:0}],
     chargesFixes:[{name:"Énergie et chaîne du froid",montant:36000000,g:4},{name:"Transport et distribution",montant:24000000,g:3},{name:"Qualité, hygiène, administratif",montant:18000000,g:3}],
     personnel:[{poste:"Opérateurs de production",effectif:15,salaireMensuel:110000,g:3},{poste:"Qualité et logistique",effectif:4,salaireMensuel:250000,g:3},{poste:"Commercial et administration",effectif:4,salaireMensuel:230000,g:3}],
     capex:[{name:"Ligne de transformation",montant:400000000,duree:10,annee:1},{name:"Chaîne du froid et utilités",montant:120000000,duree:8,annee:1}],
     bfr:{dso:30,dio:45,dpo:40}});}},
  {id:"negoce",lab:"Négoce / distribution",grp:"Commerce",
   desc:"Achat-revente (grossiste, semi-grossiste, points de vente) : le CA vient du volume vendu, la marge se fait sur le coût d'achat.",
   cles:["Nombre de points de vente","Ventes moyennes par point et par jour","Jours d'ouverture par an","Prix de vente moyen","Coût d'achat des marchandises (% du CA)","Délais clients / fournisseurs et stock (BFR)"],
   build:function(){return _secM({
     revenus:[{name:"Ventes de marchandises",tpl:"negoce",rows:_pz("negoce"),prix:{val:5000,unit:"FCFA",g:2}}],
     coutsDirects:[{name:"Coût d'achat des marchandises",m:"pct",scope:"all",pct:78,val:0}],
     chargesFixes:[{name:"Loyer des locaux et dépôts",montant:24000000,g:2},{name:"Transport et manutention",montant:12000000,g:3},{name:"Marketing et administratif",montant:9000000,g:3}],
     personnel:[{poste:"Vendeurs et caissiers",effectif:8,salaireMensuel:110000,g:3},{poste:"Magasiniers et livreurs",effectif:4,salaireMensuel:120000,g:3},{poste:"Gérance et comptabilité",effectif:2,salaireMensuel:300000,g:3}],
     capex:[{name:"Aménagement des points de vente",montant:60000000,duree:8,annee:1},{name:"Véhicules de livraison",montant:35000000,duree:5,annee:1}],
     bfr:{dso:20,dio:60,dpo:35}});}},
  {id:"restauration",lab:"Restauration",grp:"Services",
   desc:"Restaurant, maquis, traiteur : couverts servis × ticket moyen ; les matières (food cost) sont le poste clé.",
   cles:["Couverts par jour et jours d'ouverture","Taux de remplissage (%)","Ticket moyen (FCFA)","Food cost — coût des matières (% du CA)","Loyer et énergie","Investissement cuisine et salle"],
   build:function(){return _secM({
     revenus:[{name:"Ventes de couverts",tpl:"restauration",rows:_pz("restauration"),prix:{val:4500,unit:"FCFA",g:2}}],
     coutsDirects:[{name:"Matières (food cost)",m:"pct",scope:"all",pct:33,val:0},{name:"Boissons",m:"pct",scope:"all",pct:6,val:0}],
     chargesFixes:[{name:"Loyer et charges",montant:18000000,g:2},{name:"Énergie, eau, gaz",montant:9000000,g:4},{name:"Marketing et divers",montant:6000000,g:3}],
     personnel:[{poste:"Cuisine",effectif:5,salaireMensuel:130000,g:3},{poste:"Salle et service",effectif:6,salaireMensuel:110000,g:3},{poste:"Gérance",effectif:1,salaireMensuel:350000,g:3}],
     capex:[{name:"Équipement de cuisine",montant:40000000,duree:7,annee:1},{name:"Aménagement de la salle",montant:30000000,duree:8,annee:1}],
     bfr:{dso:2,dio:10,dpo:25}});}},
  {id:"hotellerie",lab:"Hôtellerie",grp:"Services",
   desc:"Hôtel, résidence : nuitées vendues (chambres × occupation × jours) × prix moyen ; F&B en complément.",
   cles:["Nombre de chambres","Taux d'occupation (%)","Prix moyen de la nuitée (FCFA)","Coûts opérationnels des chambres (% du CA)","Personnel (réception, étages, restauration)","Investissement bâtiment et rénovation"],
   build:function(){return _secM({
     revenus:[{name:"Hébergement (nuitées)",tpl:"hotellerie",rows:_pz("hotellerie"),prix:{val:35000,unit:"FCFA",g:2}},
              {name:"Restauration et bar",tpl:"quantite",rows:[{op:"x",name:"Couverts/an",val:0,unit:"couv.",g:0}],prix:{val:6000,unit:"FCFA",g:2}}],
     coutsDirects:[{name:"Coûts opérationnels des chambres",m:"pct",scope:"all",pct:18,val:0}],
     chargesFixes:[{name:"Énergie, eau, internet",montant:30000000,g:4},{name:"Maintenance et blanchisserie",montant:18000000,g:3},{name:"Commercialisation (OTA, marketing)",montant:15000000,g:3}],
     personnel:[{poste:"Réception et administration",effectif:6,salaireMensuel:180000,g:3},{poste:"Étages et entretien",effectif:8,salaireMensuel:110000,g:3},{poste:"Restauration",effectif:6,salaireMensuel:130000,g:3}],
     capex:[{name:"Bâtiment et aménagement",montant:800000000,duree:20,annee:1},{name:"Mobilier et équipements",montant:120000000,duree:8,annee:1}],
     bfr:{dso:10,dio:15,dpo:30}});}},
  {id:"ecole",lab:"École / formation",grp:"Services",
   desc:"Établissement scolaire ou centre de formation : élèves inscrits × frais de scolarité, coûts d'enseignement pilotés par la capacité.",
   cles:["Effectif d'élèves par niveau (par an)","Taux de remplissage / remises (%)","Frais de scolarité par niveau (FCFA)","Enseignants (nombre de classes × heures)","Loyer et charges de fonctionnement","Investissement (bâtiment, mobilier, informatique)"],
   build:function(){return _secM({
     revenus:[{name:"Scolarités",tpl:"ecole",rows:_pz("ecole"),prix:{val:400000,unit:"FCFA",g:3}}],
     coutsDirects:[{name:"Enseignants (masse salariale pédagogique)",m:"pct",scope:"all",pct:35,val:0},{name:"Fournitures et supports",m:"pct",scope:"all",pct:3,val:0}],
     chargesFixes:[{name:"Loyer des locaux",montant:18000000,g:0},{name:"Électricité, eau, internet",montant:6000000,g:4},{name:"Communication et recrutement",montant:4000000,g:3}],
     personnel:[{poste:"Direction",effectif:1,salaireMensuel:600000,g:3},{poste:"Administration et scolarité",effectif:3,salaireMensuel:250000,g:3},{poste:"Surveillance et entretien",effectif:4,salaireMensuel:120000,g:3}],
     capex:[{name:"Aménagement des bâtiments",montant:40000000,duree:10,annee:1},{name:"Mobilier et informatique",montant:20000000,duree:5,annee:1}],
     bfr:{dso:30,dio:0,dpo:30}});}},
  {id:"sante",lab:"Santé (clinique / cabinet)",grp:"Services",
   desc:"Clinique, cabinet, laboratoire : nombre d'actes × tarif moyen ; consommables et plateau technique.",
   cles:["Nombre d'actes par jour et jours d'ouverture","Tarif moyen par acte (FCFA)","Consommables et médicaments (% du CA)","Personnel médical et paramédical","Investissement en équipement médical","Délais de paiement (assurances, mutuelles)"],
   build:function(){return _secM({
     revenus:[{name:"Actes et consultations",tpl:"sante",rows:_pz("sante"),prix:{val:15000,unit:"FCFA",g:2}}],
     coutsDirects:[{name:"Consommables et médicaments",m:"pct",scope:"all",pct:22,val:0}],
     chargesFixes:[{name:"Loyer et maintenance",montant:24000000,g:2},{name:"Énergie et fluides médicaux",montant:12000000,g:4},{name:"Assurances et administratif",montant:9000000,g:3}],
     personnel:[{poste:"Médecins",effectif:3,salaireMensuel:800000,g:3},{poste:"Infirmiers et techniciens",effectif:8,salaireMensuel:200000,g:3},{poste:"Accueil et administration",effectif:4,salaireMensuel:150000,g:3}],
     capex:[{name:"Équipement médical",montant:250000000,duree:7,annee:1},{name:"Aménagement des locaux",montant:80000000,duree:10,annee:1}],
     bfr:{dso:45,dio:30,dpo:30}});}},
  {id:"agriculture",lab:"Agriculture (production végétale)",grp:"Agriculture & élevage",
   desc:"Exploitation agricole : superficie × rendement × taux de commercialisation × prix de vente à la tonne.",
   cles:["Superficie cultivée (ha)","Rendement (t/ha)","Taux de commercialisation (%)","Prix de vente (FCFA/t)","Intrants (semences, engrais, phyto — % du CA)","Mécanisation et irrigation (CAPEX)"],
   build:function(){return _secM({
     revenus:[{name:"Ventes de récolte",tpl:"agriculture",rows:_pz("agriculture"),prix:{val:200000,unit:"FCFA/t",g:2}}],
     coutsDirects:[{name:"Intrants (semences, engrais, phyto)",m:"pct",scope:"all",pct:35,val:0},{name:"Récolte et transport",m:"pct",scope:"all",pct:8,val:0}],
     chargesFixes:[{name:"Location foncière et eau",montant:9000000,g:2},{name:"Carburant et entretien matériel",montant:12000000,g:4},{name:"Gardiennage et divers",montant:6000000,g:3}],
     personnel:[{poste:"Ouvriers agricoles permanents",effectif:6,salaireMensuel:90000,g:3},{poste:"Chef de culture",effectif:1,salaireMensuel:350000,g:3}],
     capex:[{name:"Matériel agricole (tracteur, outils)",montant:120000000,duree:7,annee:1},{name:"Irrigation et magasin de stockage",montant:80000000,duree:10,annee:1}],
     bfr:{dso:15,dio:30,dpo:20}});}},
  {id:"energie",lab:"Énergie solaire (IPP)",grp:"Industrie & énergie",
   desc:"Centrale solaire / producteur d'électricité : puissance × facteur de charge × heures × tarif du kWh.",
   cles:["Puissance installée (kWc)","Facteur de charge (%)","Tarif de rachat du kWh (FCFA)","Coûts d'exploitation et maintenance (% du CA)","Investissement centrale et durée (20-25 ans)","Financement long terme (dette projet)"],
   build:function(){return _secM({
     revenus:[{name:"Vente d'électricité",tpl:"energie",rows:[{op:"x",name:"Puissance installée",val:5000,unit:"kWc",g:0},{op:"x",name:"Facteur de charge",val:18,unit:"%",g:0},{op:"x",name:"Heures",val:8760,unit:"h/an",g:0}],prix:{val:85,unit:"FCFA/kWh",g:1}}],
     coutsDirects:[{name:"Exploitation et maintenance (O&M)",m:"pct",scope:"all",pct:8,val:0}],
     chargesFixes:[{name:"Assurances et location du site",montant:24000000,g:2},{name:"Administration et supervision",montant:18000000,g:3}],
     personnel:[{poste:"Techniciens d'exploitation",effectif:5,salaireMensuel:250000,g:3},{poste:"Direction et administration",effectif:2,salaireMensuel:500000,g:3}],
     capex:[{name:"Centrale (panneaux, onduleurs, poste)",montant:3500000000,duree:20,annee:1},{name:"Raccordement et génie civil",montant:500000000,duree:20,annee:1}],
     bfr:{dso:60,dio:0,dpo:30}});}},
  {id:"transport",lab:"Transport",grp:"Services",
   desc:"Transport de personnes ou de marchandises : flotte × rotations × remplissage × prix.",
   cles:["Nombre de véhicules et trajets/jour","Places par véhicule et taux de remplissage","Prix moyen du billet ou de la course","Carburant et entretien (% du CA)","Renouvellement de la flotte (CAPEX)","Assurances et taxes"],
   build:function(){return _secM({
     revenus:[{name:"Transport (billets/courses)",tpl:"transport",rows:_pz("transport"),prix:{val:2500,unit:"FCFA",g:2}}],
     coutsDirects:[{name:"Carburant",m:"pct",scope:"all",pct:28,val:0},{name:"Entretien et pneumatiques",m:"pct",scope:"all",pct:12,val:0}],
     chargesFixes:[{name:"Assurances et taxes",montant:24000000,g:3},{name:"Gare, dépôt, administratif",montant:15000000,g:3}],
     personnel:[{poste:"Chauffeurs",effectif:12,salaireMensuel:130000,g:3},{poste:"Mécaniciens et logistique",effectif:4,salaireMensuel:160000,g:3},{poste:"Administration",effectif:3,salaireMensuel:220000,g:3}],
     capex:[{name:"Flotte de véhicules",montant:300000000,duree:5,annee:1},{name:"Atelier et équipements",montant:40000000,duree:8,annee:1}],
     bfr:{dso:10,dio:15,dpo:25}});}},
  {id:"immobilier",lab:"Immobilier locatif",grp:"Immobilier",
   desc:"Programme locatif (résidentiel, commercial) : lots × taux d'occupation × loyer mensuel.",
   cles:["Nombre de lots et surfaces","Taux d'occupation (%)","Loyer mensuel moyen par lot (FCFA)","Charges non récupérables (% du CA)","Coût de construction et durée d'amortissement","Financement (fonds propres / crédit)"],
   build:function(){return _secM({
     revenus:[{name:"Revenus locatifs",tpl:"immobilier",rows:_pz("immobilier"),prix:{val:600000,unit:"FCFA/mois",g:2}}],
     coutsDirects:[{name:"Charges non récupérables et entretien",m:"pct",scope:"all",pct:15,val:0}],
     chargesFixes:[{name:"Gestion locative et administratif",montant:9000000,g:2},{name:"Assurances et taxes foncières",montant:12000000,g:3}],
     personnel:[{poste:"Gardiennage et entretien",effectif:4,salaireMensuel:100000,g:3},{poste:"Gestion",effectif:1,salaireMensuel:300000,g:3}],
     capex:[{name:"Construction / acquisition des lots",montant:1000000000,duree:25,annee:1}],
     bfr:{dso:10,dio:0,dpo:20}});}},
  {id:"service",lab:"Services / conseil / prestations",grp:"Services",
   desc:"Cabinet, agence, prestataire : capacité de production de services (postes × heures × occupation) × prix de la prestation.",
   cles:["Nombre de postes / consultants","Heures facturables et taux d'occupation (%)","Prix moyen de la prestation (FCFA)","Sous-traitance (% du CA)","Masse salariale (le poste dominant)","Délais de paiement clients"],
   build:function(){return _secM({
     revenus:[{name:"Prestations facturées",tpl:"service",rows:_pz("service"),prix:{val:15000,unit:"FCFA",g:3}}],
     coutsDirects:[{name:"Sous-traitance et frais de mission",m:"pct",scope:"all",pct:18,val:0}],
     chargesFixes:[{name:"Loyer et bureau",montant:12000000,g:2},{name:"Logiciels, télécoms, administratif",montant:6000000,g:3},{name:"Marketing et développement",montant:5000000,g:3}],
     personnel:[{poste:"Consultants / experts",effectif:6,salaireMensuel:450000,g:4},{poste:"Support et administration",effectif:2,salaireMensuel:220000,g:3}],
     capex:[{name:"Aménagement des bureaux",montant:25000000,duree:8,annee:1},{name:"Matériel informatique",montant:15000000,duree:3,annee:1}],
     bfr:{dso:45,dio:0,dpo:30}});}}
];
var MODELES_SECTORIELS_GRP=["Industrie & énergie","Agriculture & élevage","Commerce","Services","Immobilier"];
function secteurModele(id){var s=null;MODELES_SECTORIELS.forEach(function(x){if(x.id===id)s=x;});return s;}
/* charge un modèle sectoriel dans le dossier (conserve horizon, valorisation et scénarios) */
function mAppliquerSecteur(id){
  if(!DOSSIER)return;
  if(!id){DOSSIER.secteurModele="";sauverDossier();rendre();return;}
  var s=secteurModele(id);if(!s)return;
  var M=assurerModele();
  var vierge=(M.revenus&&M.revenus.length===1&&M.revenus[0].name==="Produit / service 1"&&!DOSSIER.secteurModele);
  if(!vierge && !confirm("Charger le modèle sectoriel « "+s.lab+" » ?\n\nIl remplace les lignes de revenus, les coûts, le personnel et les CAPEX actuels. Le nom de la société, l'horizon, les scénarios et la valorisation sont conservés."))return;
  var neuf=s.build();
  neuf.nb=M.nb;neuf.anneeDepart=M.anneeDepart;neuf.valo=M.valo;neuf.scenarios=M.scenarios;neuf.scenario=M.scenario;
  if(M.dureeConstruction)neuf.dureeConstruction=M.dureeConstruction;
  DOSSIER.modele=neuf;DOSSIER.secteurModele=id;
  if(DOSSIER.infos&&!DOSSIER.infos.secteur)DOSSIER.infos.secteur=s.lab;
  sauverDossier();SOUS_MODELE="rev";rendre();
  if(typeof toast==="function")toast("Modèle « "+s.lab+" » chargé — ajuste les hypothèses suggérées.");
}
/* bloc « point de départ » affiché en tête de l'onglet Revenus */
function mBlocSecteur(){
  var cur=(DOSSIER&&DOSSIER.secteurModele)||"";
  var groupes=MODELES_SECTORIELS_GRP.map(function(g){
    var items=MODELES_SECTORIELS.filter(function(s){return s.grp===g;})
      .map(function(s){return '<option value="'+s.id+'"'+(s.id===cur?' selected':'')+'>'+esc(s.lab)+'</option>';}).join("");
    return items?'<optgroup label="'+esc(g)+'">'+items+'</optgroup>':"";
  }).join("");
  var s=secteurModele(cur);
  var desc=s?'<div class="mut" style="margin-top:8px">'+esc(s.desc)+'</div>':'';
  var sugg=s?('<div style="margin-top:10px;padding:10px 12px;background:#fff7ee;border:1px solid #f5d9b8;border-radius:8px">'
      +'<b style="color:#b45309">Hypothèses clés à renseigner pour ce secteur</b>'
      +'<ul style="margin:6px 0 0;padding-left:18px">'+s.cles.map(function(c){return '<li>'+esc(c)+'</li>';}).join("")+'</ul></div>')
    :'<div class="mut" style="margin-top:8px">Choisis ton secteur ci-dessus pour partir d\'un modèle adapté ; sinon, compose librement tes lignes de revenus.</div>';
  return '<div class="card" style="background:#f6f8fc;border:1px solid #dfe6f1;border-radius:10px;padding:14px 16px;margin-bottom:16px">'
    +'<div style="font-weight:600;color:#172554">Point de départ — modèle sectoriel</div>'
    +'<div class="mut" style="margin:4px 0 10px">L\'outil pré-remplit les lignes de revenus, les inducteurs et les coûts typiques du secteur ; tu ajustes ensuite tout librement.</div>'
    +'<select class="sel" style="max-width:460px" onchange="mAppliquerSecteur(this.value)">'
    +'<option value="">— Choisir un secteur / une industrie —</option>'+groupes+'</select>'
    +desc+sugg+'</div>';
}
/* ============================================================
   DOSSIER D'EXEMPLE — créé au premier lancement pour que l'outil
   soit navigable sans rien saisir. Supprimable comme un dossier
   normal (il ne consomme aucune société de la licence).
   Il montre volontairement TOUTES les mécaniques du modèle :
   inducteurs de volume, coût piloté par la capacité (référence
   d'effectif ÷ places ⌈arrondi⌉), coût en % du CA, charges,
   personnel par poste, CAPEX à durées distinctes, montage
   capital + primes + CCA avec source d'équilibrage, emprunt à
   différé, dividendes plafonnés par la trésorerie.
   ============================================================ */
function modeleDemo(){
  var y=2026; try{y=new Date().getFullYear();}catch(e){}
  var niveau=function(id,nom,eff,frais,net){
    return {id:id,name:nom,tpl:"ecole",
      rows:[{op:'x',name:"Élèves inscrits",mode:"yearly",vals:eff,val:eff[0],unit:"élèves",g:0},
            {op:'x',name:"Part nette après remises accordées",val:net,unit:"%",g:0}],
      prix:{val:frais,unit:"FCFA",g:3}};
  };
  var ens=function(nom,ref,heures,tarif){
    return {name:nom,m:"ind",scope:"all",
      rows:[{op:'x',name:"Élèves du niveau",refLigne:ref},
            {op:'d',name:"Élèves par classe",val:30,unit:"élèves",g:0,ceil:true},
            {op:'x',name:"Heures de cours par classe et par an",val:heures,unit:"h/an",g:0}],
      prix:{val:tarif,unit:"FCFA/h",g:3}};
  };
  return {nb:5,anneeDepart:y,tva:0.18,is_taux:0.30,imf_taux:0.005,inflation:0.03,reportDef_horizon:3,
    decouvert_taux:0.12,dureeConstruction:0,_seq:3,
    dividendes_payout:0.30,dividendes_seuilCash:15000000,
    revenus:[
      niveau("L1","Primaire",[120,150,185,220,260],350000,92),
      niveau("L2","Collège",[90,115,140,170,200],450000,90),
      niveau("L3","Lycée",[60,80,100,120,140],550000,90)],
    coutsDirects:[
      ens("Enseignants — primaire","L1",900,4000),
      ens("Enseignants — collège","L2",1000,5000),
      ens("Enseignants — lycée","L3",1100,6000),
      {name:"Fournitures et supports pédagogiques",m:"pct",scope:"all",pct:3,val:0}],
    autresProd:{val:6000000,g:5},
    chargesFixes:[
      {name:"Loyer des locaux",montant:18000000,g:0},
      {name:"Électricité, eau et internet",montant:6000000,g:4},
      {name:"Communication et recrutement d'élèves",montant:4000000,g:3},
      {name:"Entretien, nettoyage et gardiennage",montant:3000000,g:3},
      {name:"Assurances et honoraires",montant:1500000,g:3},
      {name:"Autres charges de fonctionnement",montant:2000000,g:3}],
    personnel:[
      {poste:"Direction générale",effectif:1,salaireMensuel:600000,g:3},
      {poste:"Administration et scolarité",effectif:3,salaireMensuel:250000,g:3},
      {poste:"Surveillance et entretien",effectif:4,salaireMensuel:120000,g:3}],
    capex:[
      {name:"Aménagement des bâtiments",montant:40000000,duree:10,annee:1},
      {name:"Mobilier scolaire",montant:15000000,duree:10,annee:1},
      {name:"Matériel informatique",montant:8000000,duree:3,annee:1},
      {name:"Bus scolaire",montant:25000000,duree:5,annee:2}],
    financement:{mode:"manuel",partFP:0.50,moisBFR:2,
      capital:35000000,primes:15000000,apports:0,plug:"cca",
      ccaTaux:0,ccaMode:"maintenu",ccaDuree:5,subvention:0,
      emprunt:{montant:20000000,taux:0.09,duree:7,grace:1}},
    bfr:{dso:45,dio:0,dpo:30},
    valo:modeleValoDefaut(),
    scenario:"central",scenarios:modeleScenariosDefaut()};
}
function dossierDemo(){
  return {id:"demo-exemple",societe:"Institut Horizon (exemple)",secteur:"Services & conseil",
    unite:"M",balances:[],overrides:{},sansHistorique:true,demo:true,
    infos:{secteur:"Enseignement privé — primaire, collège, lycée",
      formeJuridique:"SARL (exemple)",creation:String((function(){try{return new Date().getFullYear()-6;}catch(e){return 2020;}})()),
      effectif:"270 élèves à l'ouverture du plan · 8 permanents · enseignants vacataires",
      description:"Dossier d'exemple fourni avec Findalyx Advisory pour découvrir l'outil : établissement scolaire privé de trois cycles, locaux loués, classes de 30 élèves. Toutes les valeurs sont fictives — modifiez-les, ou supprimez ce dossier depuis l'accueil.",
      services:"Scolarités des trois cycles ; produits annexes (cantine, location de salles).",
      marche:"Familles urbaines ; recrutement par bouche-à-oreille et campagnes locales.",
      dirigeant:"Direction générale (exemple)",actionnariat:"Fondateurs 100 % (exemple)",
      adresse:"Exemple — zone urbaine",
      contexteMission:"Exemple de business plan à 5 ans et de valorisation : les coûts d'enseignement sont pilotés par la capacité (élèves ÷ 30 par classe, arrondi à la classe entière), le montage combine capital, primes d'émission et compte courant d'associés équilibrant le besoin."},
    modele:modeleDemo()};
}
function assurerModele(){
  if(!DOSSIER.modele)DOSSIER.modele=modeleParDefaut();
  var M=DOSSIER.modele;
  if(!M.valo)M.valo=modeleValoDefaut();
  if(!M.scenarios){M.scenarios=modeleScenariosDefaut();M.scenario="central";}
  if(!M.coutsDirects)M.coutsDirects=[];
  if(!M.ouverture)M.ouverture={};   /* situation d'ouverture (entreprise existante) — vide = projet neuf */
  /* ligne de crédit renouvelable — plafond 0 = illimité (comportement historique) */
  if(!M.revolver)M.revolver={plafond:0,taux:(M.decouvert_taux!=null?M.decouvert_taux:0.12),commission:0,seuil:0};
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
function mScenDelta(k,champ,val){var s=assurerModele().scenarios[k];if(!s)return;var x=numFR(val);if(x!==null)s[champ]=x/100;sauverDossier();rendre();}
function mScenLab(k,val){var s=assurerModele().scenarios[k];if(s&&String(val).trim()){s.lab=String(val).trim();sauverDossier();rendre();}}
function mDivSeuil(v){var M=assurerModele();if(String(v).trim()==='')delete M.dividendes_seuilCash;else{var x=numFR(v);if(x!==null)M.dividendes_seuilCash=x;}sauverDossier();rendre();}
function mHNb(n){var M=assurerModele();M.nb=Math.max(3,Math.min(10,Math.round(+n)||5));
  /* les séries « par année » suivent la nouvelle durée : la dernière valeur saisie est reconduite (modifiable) */
  var comp=function(r){if(r&&r.mode==='yearly'){r.vals=r.vals||[];var d=r.vals.length?valSerie(r.vals,r.vals.length):(+r.val||0);while(r.vals.length<M.nb)r.vals.push(d);}};
  (M.revenus||[]).forEach(function(L){(L.rows||[]).forEach(comp);});
  (M.coutsDirects||[]).forEach(function(c){(c.rows||[]).forEach(comp);});
  sauverDossier();rendre();}
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
  s('CAPITAUX_PROPRES',P.bs.CP[aL]);s('DETTES_FINANCIERES',-(P.bs.DETTE[aL]+((P.bs.CCA&&P.bs.CCA[aL])||0)));s('TRESORERIE_NETTE',P.bs.TRESO[aL]);s('PROVISIONS_RC',-P.bs.PROVISIONS[aL]);
  s('RESULTAT_FIN',P.pl.RESULTAT_FIN[aL]);s('BFR',P.bs.BFR[aL]);s('ACTIF_NET',P.bs.CP[aL]);
  s('ACTIFS_IMMOBILISES',P.bs.IMMO_NET[aL]);s('CLIENTS',P.bs.CLIENTS[aL]);s('STOCKS',P.bs.STOCKS[aL]);s('FOURNISSEURS',P.bs.FOURNISSEURS[aL]);
  /* capitaux propres décomposés à partir du montage (capital + subventions figés, le report à nouveau
     absorbe les résultats accumulés) → décomposition CP correcte en mode modèle (pas de bilan d'ouverture) */
  var mtg=P.financement||{};
  s('CAPITAL',mtg.capital||0);s('PRIMES_RESERVES',mtg.primes||0);s('SUBV_PROV_REGL',mtg.subvention||0);
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
function mCoutIndRef(ci,ri,v){var r=mCoutIndInit(mCoutsArr()[ci]).rows[ri];if(v){r.refLigne=v;delete r.unit;}else delete r.refLigne;sauverDossier();rendre();}
function mCoutIndCeil(ci,ri){var r=mCoutIndInit(mCoutsArr()[ci]).rows[ri];r.ceil=!r.ceil;sauverDossier();rendre();}
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
/* Une charge fixe accepte, comme un inducteur, soit « an 1 + croissance », soit une
   valeur par année (le moteur lit déjà c.mode / c.vals via valAnnee). */
function mFixeMode(i,mode){var M=assurerModele(),c=M.chargesFixes[i],N=M.nb||5;
  if(mode==='yearly'&&c.mode!=='yearly'){c.mode='yearly';c.vals=[];
    for(var k=0;k<N;k++)c.vals.push(Math.round((+c.montant||0)*Math.pow(1+(+c.g||0)/100,k)));}
  else if(mode!=='yearly'){c.mode='grow';if(c.vals&&c.vals.length)c.montant=c.vals[0];}
  sauverDossier();rendre();}
function mFixeYv(i,k,val){var c=assurerModele().chargesFixes[i];if(!c.vals)c.vals=[];
  var x=numFR(val);if(x!==null)c.vals[k]=x;sauverDossier();rendre();}
function mFixeFill(i){var M=assurerModele(),c=M.chargesFixes[i],N=M.nb||5;
  if(c.mode!=='yearly')return;var v=valSerie(c.vals,0);c.vals=[];
  for(var k=0;k<N;k++)c.vals.push(v);sauverDossier();rendre();}
function gFixeVal(c,i){ if(c&&c.mode==='yearly')return valSerie(c.vals,i);
  return (+((c&&c.montant))||0)*Math.pow(1+(+((c&&c.g))||0)/100,i); }
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
    if(r.mode==='yearly'){var cells='';for(var k=0;k<N;k++){var yv=valSerie(r.vals,k);cells+='<span class="mind-yv"><label>An '+(k+1)+'</label><input class="nin ninm" value="'+mAmt(yv)+'" oninput="mSep(this)" onchange="mIndYv('+li+','+ri+','+k+',this.value)"></span>';}vals='<div class="mind-vals">'+cells+'</div>';}
    else vals='<div class="mind-vals"><span class="mind-f"><label>Valeur an 1</label><input class="nin ninm" value="'+mAmt(r.val)+'" oninput="mSep(this)" onchange="mInd('+li+','+ri+',\'val\',this.value)"></span><span class="mind-f"><label>Croissance %/an</label><input class="nin" value="'+r.g+'" onchange="mInd('+li+','+ri+',\'g\',this.value)"></span></div>';
    return '<div class="mind">'
      +'<div class="mind-top"><button class="btn sm mind-op" title="× ou ÷ — bascule l\'opérateur" onclick="mIndOp('+li+','+ri+')">'+(r.op==='d'?'÷':'×')+'</button>'
      +'<input class="sel" style="flex:1;min-width:130px" placeholder="Nom de l\'inducteur" value="'+esc(r.name)+'" onchange="mInd('+li+','+ri+',\'name\',this.value)">'
      +'<input class="nin" style="width:78px" placeholder="unité" value="'+esc(r.unit)+'" onchange="mInd('+li+','+ri+',\'unit\',this.value)">'
      +'<span class="segvue"><button class="'+(r.mode==='yearly'?'':'on')+'" onclick="mIndMode('+li+','+ri+',\'grow\')">Croissance</button><button class="'+(r.mode==='yearly'?'on':'')+'" onclick="mIndMode('+li+','+ri+',\'yearly\')">Par année</button></span>'
      +'<button class="btn sm" title="Retirer" onclick="mDelInd('+li+','+ri+')">✕</button></div>'
      +vals+'</div>';
  }).join('');
  var vol=volInducteurs(L.rows,0), prix=(L.prix&&L.prix.val)||0, ca=vol*prix;
  return '<div class="mrev">'
    +'<div class="mrev-h"><div class="lft"><div class="mrev-eyebrow"><span class="dot"></span>Ligne de revenus</div>'
    +'<input class="mrev-titre" value="'+esc(L.name)+'" onchange="mLigneNom('+li+',this.value)"></div>'
    +'<div class="rgt"><span class="mrev-chip">Modèle <select onchange="mTpl('+li+',this.value)">'+opts+'</select></span>'
    +'<button class="mghost" title="Supprimer la ligne" onclick="mDelLigne('+li+')">Retirer</button></div></div>'
    +'<div class="mrev-b">'
    +'<div class="mrev-sect">Inducteurs de volume <span>× ou ÷ · une unité en % = ratio</span></div>'
    +rows
    +'<button class="btn sm" style="margin-top:2px" onclick="mAddInd('+li+')">+ inducteur</button>'
    +'<div class="mind-res"><div class="mind-price"><span class="x">=</span> <span class="mind-lbl">Volume an&nbsp;1</span> <b style="font-size:15px">'+Math.round(vol).toLocaleString("fr-FR").replace(/[  ]/g," ")+'</b> <span class="mut">unités (pas des FCFA)</span></div>'
    +'<div class="mind-price"><span class="x">×</span> <span class="mut">Prix an 1 (FCFA)</span> <input class="nin ninm" value="'+mAmt(prix)+'" oninput="mSep(this)" onchange="mPrix('+li+',\'val\',this.value)"><input class="nin" style="width:70px" value="'+esc(L.prix.unit||'')+'" onchange="mPrix('+li+',\'unit\',this.value)">'
    +'<span class="mut">croissance</span> <input class="nin" style="width:60px" value="'+(L.prix.g||0)+'" onchange="mPrix('+li+',\'g\',this.value)"> %'
    +'<span class="mind-ca">CA an 1 · '+fmt(ca/1000)+' '+uni().suf+'</span></div></div>'
    +'<div class="mrev-note">Les coûts directs se paramètrent dans l\'onglet <b>Coûts directs</b> (choix du périmètre : cette ligne, l\'ensemble, ou indépendant).</div>'
    +'</div></div>';
}
/* =====================================================================
   GRILLE DES HYPOTHÈSES DE REVENUS — une LIGNE par inducteur, une COLONNE
   par année. Reprend les partis pris des outils FP&A de référence (Causal,
   Runway, Pigment, Jirav) : la formule est VISIBLE (colonne dédiée), les
   années sont côte à côte, et la BORDURE dit si la cellule est saisie ou
   calculée. Aucun changement du moteur : les valeurs affichées sont celles
   que projeterModele consomme (mêmes helpers volInducteurs / valAnnee).
   ===================================================================== */
var G_FX=true, G_CLOSED={};
function mFxToggle(){G_FX=!G_FX;rendre();}
function mPlier(id){G_CLOSED[id]=!G_CLOSED[id];rendre();}
function mPlierTout(ouvrir){var M=assurerModele();(M.revenus||[]).forEach(function(L,li){G_CLOSED[L.id||('L'+li)]=!ouvrir;});rendre();}
/* valeur BRUTE d'un inducteur à l'année i (90 pour « 90 % », pas 0,9) */
function gIndVal(r,i){ if(r&&r.mode==='yearly')return valSerie(r.vals,i); return (+((r&&r.val))||0)*Math.pow(1+(+((r&&r.g))||0)/100,i); }
/* =====================================================================
   ANNULER / RÉTABLIR — l'absence d'annulation est LE reproche récurrent des
   utilisateurs des outils concurrents. Plutôt que d'instrumenter les ~25
   gestionnaires de saisie, on photographie le modèle À CHAQUE RENDU : deux
   états successifs suffisent à remonter le temps.
   ===================================================================== */
var G_UNDO=[], G_REDO=[], G_KEYS=false;
function mSnapshot(M){
  try{ var s=JSON.stringify(M);
    if(!G_UNDO.length||G_UNDO[G_UNDO.length-1]!==s){
      G_UNDO.push(s); G_REDO=[];              /* une saisie neuve invalide le « rétablir » */
      if(G_UNDO.length>40)G_UNDO.shift();
    }
  }catch(e){}
}
function mRestaurer(s,msg){
  try{ DOSSIER.modele=JSON.parse(s); }catch(e){ return; }
  sauverDossier(); rendre(); if(typeof toast==='function')toast(msg);
}
function mUndo(){
  if(G_UNDO.length<2){ if(typeof toast==='function')toast('Rien à annuler'); return; }
  G_REDO.push(G_UNDO.pop());
  mRestaurer(G_UNDO[G_UNDO.length-1],'Modification annulée');
}
function mRedo(){
  if(!G_REDO.length){ if(typeof toast==='function')toast('Rien à rétablir'); return; }
  var s=G_REDO.pop(); G_UNDO.push(s); mRestaurer(s,'Modification rétablie');
}
/* Le montage est PRÉ-REMPLI (valeurs par défaut d'un projet neuf, ou dimensionnement
   automatique au chargement d'un modèle sectoriel : 20 % du CAPEX en fonds propres,
   45 % en emprunt). Ces deux boutons rendent ce pré-remplissage explicite et réversible :
   sans eux, l'utilisateur voit des montants qu'il n'a jamais saisis. */
function mFinReset(){
  if(!confirm("Remettre le montage à zéro ?\n\nCapital, primes, apports, subvention et emprunt seront vidés — vous saisirez vos propres montants. Les investissements et le reste du plan ne changent pas."))return;
  var f=assurerModele().financement||{};
  f.capital=0; f.primes=0; f.apports=0; f.subvention=0;
  if(!f.emprunt)f.emprunt={}; f.emprunt.montant=0;
  f.pct={}; f.plug=""; f.mode="manuel";      /* tout redevient saisi, plus aucun pilotage en % ni solde */
  sauverDossier(); rendre(); if(typeof toast==='function')toast("Montage remis à zéro");
}
function mFinRedim(){
  var M=assurerModele(), f=M.financement||{};
  var cx=(M.capex||[]).reduce(function(s,c){return s+(+c.montant||0);},0);
  if(!(cx>0)){ if(typeof toast==='function')toast("Renseignez d'abord vos investissements"); return; }
  f.capital=Math.round(cx*0.20/1e6)*1e6;
  if(!f.emprunt)f.emprunt={};
  f.emprunt.montant=Math.round(cx*0.45/1e6)*1e6;
  f.pct={}; f.plug="cca"; f.mode="manuel";   /* montants imposés, le CCA absorbe le solde */
  sauverDossier(); rendre();
  if(typeof toast==='function')toast("Re-dimensionné sur "+fmt(cx/1000)+" "+uni().suf+" d'investissements : 20 % fonds propres, 45 % emprunt");
}
/* =====================================================================
   MONTAGE FINANCIER — % ET MONTANT SONT LA MEME CHOSE, VUE DES DEUX COTES
   Chaque ressource se pilote indifféremment par son POURCENTAGE du besoin
   ou par son MONTANT : saisir l'un recalcule l'autre. La ligne saisie est
   la source (cadre plein), l'autre est calculée (barre pointillée).
   Une ligne peut être désignée « solde » : elle absorbe exactement le reste.
   ===================================================================== */
var M_FINCLE={capital:"capital",primes:"primes",cca:"apports"};
function mFinF(){
  var M=assurerModele(); if(!M.financement)M.financement={};
  var f=M.financement;
  /* Un dossier enregistré sous l'ancien mode « automatique » n'a que partFP. Au premier
     geste sur cet écran on le convertit en pourcentages par ligne — conversion NEUTRE :
     le moteur calcule exactement la même chose pour {mode:auto,partFP} et pour
     {pct:{capital:partFP,dette:1-partFP}}. Sans elle, les montants sauteraient sur les
     valeurs pré-remplies du modèle par défaut au lieu de rester où ils sont. */
  if(f.mode==="auto"&&!f.pct){
    var pf=(f.partFP!=null?+f.partFP:0.30);
    f.pct={capital:pf,primes:0,cca:0,dette:1-pf};
    f.plug=""; f.mode="manuel";
  }
  return f;
}
function mFinPct(k,val){                 /* saisir un % → la ligne devient pilotée par le pourcentage */
  var v=numFR(val); if(v===null)return;
  var f=mFinF(); if(!f.pct)f.pct={};
  f.pct[k]=v/100; f.mode="manuel";
  if(f.plug===k)f.plug="";               /* on ne peut pas être à la fois « solde » et piloté */
  sauverDossier(); rendre();
}
function mFinMt(k,val){                  /* saisir un montant → le pourcentage redevient calculé */
  var v=numFR(val); if(v===null)return;
  var f=mFinF();
  if(f.pct)delete f.pct[k];
  f.mode="manuel";
  if(f.plug===k)f.plug="";
  if(k==="dette"){ if(!f.emprunt)f.emprunt={}; f.emprunt.montant=v; }
  else f[M_FINCLE[k]]=v;
  sauverDossier(); rendre();
}
function mFinSolde(k){                   /* désigne (ou libère) la ligne qui absorbe le reste */
  var f=mFinF();
  f.plug=(f.plug===k)?"":k; f.mode="manuel";
  if(f.pct)delete f.pct[k];
  sauverDossier(); rendre();
}
/* Bascule GLOBALE — l'ancien couple « automatique / manuel » : tout en %, ou tout en montants.
   Ce n'est plus un mode exclusif, seulement une application en bloc du réglage par ligne. */
function mFinToutPct(){
  var M=assurerModele(), F=projeterModele(M).financement||{}, f=mFinF();
  var B=F.besoinBase||0;
  if(!(B>0)){ if(typeof toast==='function')toast("Renseignez d'abord vos investissements"); return; }
  f.pct={capital:(F.capital||0)/B,primes:(F.primes||0)/B,cca:(F.cca||0)/B,dette:(F.dette||0)/B};
  f.plug=""; f.mode="manuel"; sauverDossier(); rendre();
  if(typeof toast==='function')toast("Montage piloté en pourcentage : les montants suivront désormais vos investissements");
}
function mFinToutMt(){
  var M=assurerModele(), F=projeterModele(M).financement||{}, f=mFinF();
  f.capital=Math.round((F.capital||0)*1000); f.primes=Math.round((F.primes||0)*1000);
  f.apports=Math.round((F.cca||0)*1000);
  if(!f.emprunt)f.emprunt={}; f.emprunt.montant=Math.round((F.dette||0)*1000);
  f.pct={}; f.plug=""; f.mode="manuel"; sauverDossier(); rendre();
  if(typeof toast==='function')toast("Montants figés : ils ne bougeront plus si les investissements changent");
}
/* Préréglage « part de fonds propres cible » : capital = x %, emprunt = le solde.
   C'est très exactement l'ancien mode automatique, mais chaque ligne reste modifiable. */
function mFinCible(val){
  var v=numFR(val); if(v===null)return;
  v=Math.max(0,Math.min(100,v))/100;
  var f=mFinF();
  f.partFP=v; f.mode="manuel"; f.plug="dette";
  f.pct={capital:v,primes:0,cca:0};
  sauverDossier(); rendre();
  if(typeof toast==='function')toast("Cible appliquée : "+Math.round(v*100)+" % de fonds propres, le reste en emprunt");
}
function mBtnUndo(){
  return '<button class="btn sm" title="Annuler la dernière modification (Ctrl+Z)"'+(G_UNDO.length<2?' disabled style="opacity:.45"':'')+' onclick="mUndo()">&#8630;</button>'
    +'<button class="btn sm" title="Rétablir (Ctrl+Y)"'+(G_REDO.length?'':' disabled style="opacity:.45"')+' onclick="mRedo()">&#8631;</button>';
}
function mBindClavier(){
  if(G_KEYS||typeof document==='undefined')return; G_KEYS=true;
  document.addEventListener('keydown',function(e){
    if(!(e.ctrlKey||e.metaKey)||!modeleMode())return;
    var k=String(e.key||'').toLowerCase();
    if(k==='z'&&!e.shiftKey){ e.preventDefault(); mUndo(); }
    else if(k==='y'||(k==='z'&&e.shiftKey)){ e.preventDefault(); mRedo(); }
  });
}
/* Collage depuis un tableur : une ligne de valeurs séparées par des tabulations
   (ou des retours à la ligne) remplit les années d'un coup. Son absence est la
   critique la plus concrète adressée aux outils du marché. */
function mCollerSerie(ev,kind,a,b){
  var t=''; try{ t=((ev.clipboardData||window.clipboardData).getData('text')||''); }catch(e){}
  if(!t||!/[\t\r\n;]/.test(t))return;         /* une seule valeur → collage normal */
  ev.preventDefault();
  var vals=t.split(/[\t\r\n;]+/).map(function(x){return numFR(x);}).filter(function(x){return x!==null;});
  if(!vals.length)return;
  var M=assurerModele(), N=M.nb||5, r;
  try{ r=(kind==='rev')?M.revenus[a].rows[b]:mCoutIndInit(M.coutsDirects[a]).rows[b]; }catch(e){ return; }
  r.mode='yearly'; r.vals=[];
  for(var k=0;k<N;k++) r.vals.push(k<vals.length?vals[k]:vals[vals.length-1]);
  sauverDossier(); rendre();
  if(typeof toast==='function')toast(vals.length+' valeur(s) collée(s) — saisie année par année');
}
function gEstPct(r){ return String((r&&r.unit)||'').indexOf('%')>=0; }
/* Rend EXPLICITE la règle du moteur « unité contenant % = ratio (÷100) » : au lieu de
   devoir deviner qu'il faut taper « % » dans l'unité, on bascule l'inducteur d'un clic. */
/* Un inducteur est SOIT une quantité (avec son unité libre : t/an, élèves, h…),
   SOIT un pourcentage. C'est le même réglage : l'unité « % » EST ce qui fait le ratio.
   D'où un contrôle unique — afficher une unité ET un bouton % était redondant. */
/* `_u` mémorise l'unité d'origine : basculer en % puis revenir ne fait pas perdre « élèves ». */
function gBasculeType(r,t){
  if(t==='pct'){ if(!gEstPct(r)){ if(r.unit)r._u=r.unit; r.unit='%'; } }
  else if(gEstPct(r)){ r.unit=r._u||''; delete r._u; }
}
function mIndType(li,ri,t){ gBasculeType(assurerModele().revenus[li].rows[ri],t); sauverDossier();rendre(); }
function mCoutIndType(ci,ri,t){ gBasculeType(mCoutIndInit(assurerModele().coutsDirects[ci]).rows[ri],t); sauverDossier();rendre(); }
function gSegType(kind,a,b,pct){
  var f=(kind==='rev')?('mIndType('+a+','+b+',') : ('mCoutIndType('+a+','+b+',');
  return '<span class="gseg" title="Quantité (avec son unité) ou pourcentage — un pourcentage est appliqué comme un ratio">'
    +'<button class="'+(pct?'':'on')+'" onclick="'+f+'\'qte\')">123</button>'
    +'<button class="'+(pct?'on':'')+'" onclick="'+f+'\'pct\')">%</button></span>';
}
/* recopie la valeur de l'an 1 sur toutes les années (mode « année par année ») */
function mIndFill(li,ri){ var M=assurerModele(), r=M.revenus[li].rows[ri], N=M.nb||5;
  if(r.mode!=='yearly')return; var v=valSerie(r.vals,0); r.vals=[];
  for(var k=0;k<N;k++)r.vals.push(v); sauverDossier();rendre(); }
/* ---------------------------------------------------------------------
   CONTRÔLES DE COHÉRENCE DES HYPOTHÈSES — non bloquants.
   Aucun des outils concurrents étudiés ne le fait : on signale ce qui cloche
   AVANT que l'analyste ne défende son plan devant un banquier.
   --------------------------------------------------------------------- */
function mControlesHyp(M,P){
  var out=[], A=P.annees, N=A.length, i, u=uni();
  var ca1=P.pl.CA[A[0]]||0, caL=P.pl.CA[A[N-1]]||0;
  if(!(caL>0)) out.push(['err',"Aucun chiffre d'affaires : renseigne le volume et le prix d'au moins une ligne de revenus."]);
  for(i=0;i<N;i++){ if((P.pl.CA[A[i]]||0)>0 && P.pl.MARGE_BRUTE[A[i]]<0){
    out.push(['err','Marge brute négative en an '+(i+1)+" : les coûts directs dépassent le chiffre d'affaires."]); break; } }
  for(i=0;i<N;i++){ if(P.bs.TRESO[A[i]]<0){
    out.push(['err','Trésorerie négative en an '+(i+1)+' ('+fmt(P.bs.TRESO[A[i]])+' '+u.suf+') : renforce le financement ou étale les investissements.']); break; } }
  var jamais=true; for(i=0;i<N;i++) if((P.pl.EBITDA[A[i]]||0)>=0) jamais=false;
  if(jamais&&caL>0) out.push(['warn',"EBITDA négatif sur toute la durée : le plan n'atteint jamais l'équilibre d'exploitation."]);
  if(ca1>0&&N>1){ var g=Math.pow(caL/ca1,1/(N-1))-1;
    if(g>1) out.push(['warn','Croissance du CA de '+Math.round(g*100)+' %/an : très élevée, prépare une justification.']); }
  var b=M.bfr||{};
  [['dso','délai de paiement clients (DSO)'],['dio','rotation des stocks (DIO)'],['dpo','délai fournisseurs (DPO)']].forEach(function(x){
    if((+b[x[0]]||0)>365) out.push(['warn','Le '+x[1]+' dépasse une année ('+Math.round(b[x[0]])+' jours).']); });
  var nb=0;
  (M.revenus||[]).forEach(function(L){ (L.rows||[]).forEach(function(r){
    if(nb<2&&gEstPct(r)){ var v=gIndVal(r,0); if(v>100){ nb++;
      out.push(['warn','« '+esc(r.name||'inducteur')+' » vaut '+gN(v)+" % : au-delà de 100 %, vérifie l'unité ou la valeur."]); } } }); });
  if(P.revolver&&P.revolver.sature) out.push(['err',"Plafond de la ligne de crédit insuffisant : le besoin de trésorerie le dépasse — le plan n'est pas finançable en l'état."]);
  var is=(M.is_taux!=null?+M.is_taux:0.30);
  if(is<0||is>0.6) out.push(['warn',"Taux d'impôt sur les sociétés à "+Math.round(is*100)+' % : hors des valeurs usuelles.']);
  if(!(M.capex||[]).length&&caL>0) out.push(['warn',"Aucun investissement saisi : vérifie que l'activité ne nécessite pas d'équipement."]);
  return out;
}
function mBandeControles(M,P){
  var c; try{ c=mControlesHyp(M,P); }catch(e){ return ''; }
  if(!c.length)return '';
  return '<div class="gchk"><b>'+c.length+' point'+(c.length>1?'s':'')+' à vérifier dans les hypothèses</b><ul>'
    +c.slice(0,8).map(function(x){return '<li'+(x[0]==='err'?' class="err"':'')+'>'+x[1]+'</li>';}).join('')
    +'</ul></div>';
}
function gN(v){ v=+v||0; var r=(Math.abs(v)>=100)?Math.round(v):Math.round(v*100)/100;
  return r.toLocaleString('fr-FR').replace(/[  ]/g,' '); }
function mTableRevenus(M){
  var N=M.nb||5, nc=(M.dureeConstruction||0), u=uni(), i;
  var head='<tr><th class="l gc1">Inducteur</th>'+(G_FX?'<th class="l gc2">Formule</th>':'');
  for(i=0;i<N;i++)head+='<th>An '+(i+1)+(i<nc?' · constr.':'')+'</th>';
  head+='</tr>';
  var tot=[]; for(i=0;i<N;i++)tot.push(0);
  var body='';
  (M.revenus||[]).forEach(function(L,li){
    var id=L.id||('L'+li), ferme=!!G_CLOSED[id], vols=[], prixs=[], cas=[], j;
    for(j=0;j<N;j++){ var v=volInducteurs(L.rows,j), p=valAnnee(L.prix,j);
      vols.push(v); prixs.push(p); cas.push(v*p); tot[j]+=v*p; }
    /* --- ligne produit : le CA de la ligne (sert aussi de résumé quand c'est replié) --- */
    body+='<tr class="grp"><td class="l gc1"><div class="ghead"><span class="gcar" onclick="mPlier(\''+id+'\')" title="Plier / déplier">'+(ferme?'&#9656;':'&#9662;')+'</span>'
      +'<input class="gnm big" value="'+esc(L.name||'')+'" onchange="mLigneNom('+li+',this.value)">'
      +'<button class="gx" title="Retirer cette ligne de revenus" onclick="mDelLigne('+li+')">&#10005;</button></div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx"><span class="gchip">Volume</span><span class="xx">&times;</span><span class="gchip">Prix</span></span></td>':'')
      +cas.map(function(c){return '<td class="num">'+fmt(c/1000)+'</td>';}).join('')+'</tr>';
    if(ferme)return;
    /* --- un inducteur par ligne --- */
    (L.rows||[]).forEach(function(r,ri){
      var yearly=(r.mode==='yearly'), cells='';
      for(var k=0;k<N;k++){
        var val=gIndVal(r,k);
        if(yearly||k===0)
          cells+='<td><input class="gcell gin num" value="'+mAmt(val)+'" oninput="mSep(this)" onpaste="mCollerSerie(event,\'rev\','+li+','+ri+')" onchange="'
            +(yearly?('mIndYv('+li+','+ri+','+k+',this.value)'):('mInd('+li+','+ri+',\'val\',this.value)'))+'"></td>';
        else
          cells+='<td><span class="gcell gcalc num" title="Calculé depuis l&#39;an 1 — cliquer pour saisir année par année" onclick="mIndMode('+li+','+ri+',\'yearly\')">'+gN(val)+'</span></td>';
      }
      var fx=yearly
        ? '<span class="gfx">année par année <button class="gx" title="Recopier l&#39;an 1 sur toutes les années" onclick="mIndFill('+li+','+ri+')">&#8594;</button>'
          +'<button class="gx" title="Repasser en croissance" onclick="mIndMode('+li+','+ri+',\'grow\')">&#8634;</button></span>'
        : '<span class="gfx">an 1, puis <input value="'+(r.g||0)+'" onchange="mInd('+li+','+ri+',\'g\',this.value)"> %/an</span>';
      body+='<tr><td class="l gc1"><div class="gdrv"><button class="gop" title="Basculer &times; / &divide;" onclick="mIndOp('+li+','+ri+')">'+(r.op==='d'?'&divide;':'&times;')+'</button>'
        +'<input class="gnm" placeholder="Nom" value="'+esc(r.name||'')+'" onchange="mInd('+li+','+ri+',\'name\',this.value)">'
        +gSegType('rev',li,ri,gEstPct(r))
        +(gEstPct(r)?'':'<input class="gnm u" placeholder="unité" value="'+esc(r.unit||'')+'" onchange="mInd('+li+','+ri+',\'unit\',this.value)">')
        +'<button class="gx" title="Retirer cet inducteur" onclick="mDelInd('+li+','+ri+')">&#10005;</button></div></td>'
        +(G_FX?'<td class="l gc2">'+fx+'</td>':'')+cells+'</tr>';
    });
    /* --- volume = produit des inducteurs --- */
    var chips=(L.rows||[]).map(function(r,ri){
      return (ri?'<span class="xx">'+(r.op==='d'?'&divide;':'&times;')+'</span>':'')
        +'<span class="gchip">'+esc(r.name||('inducteur '+(ri+1)))+'</span>';}).join('');
    body+='<tr class="gres"><td class="l gc1"><div class="gdrv"><span class="gop eq">=</span> Volume</div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx">'+chips+'</span></td>':'')
      +vols.map(function(v){return '<td><span class="gcell gcalc num">'+gN(v)+'</span></td>';}).join('')+'</tr>';
    /* --- prix : an 1 saisi, années suivantes indexées --- */
    var pcells='';
    for(j=0;j<N;j++){
      if(j===0)pcells+='<td><input class="gcell gin num" value="'+mAmt(prixs[0])+'" oninput="mSep(this)" onchange="mPrix('+li+',\'val\',this.value)"></td>';
      else pcells+='<td><span class="gcell gcalc num" title="Prix de l&#39;an 1 indexé">'+gN(prixs[j])+'</span></td>';
    }
    body+='<tr><td class="l gc1"><div class="gdrv"><span class="gop">&times;</span> Prix de vente'
      +'<input class="gnm u" placeholder="unité" value="'+esc((L.prix&&L.prix.unit)||'')+'" onchange="mPrix('+li+',\'unit\',this.value)"></div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx">an 1, puis <input value="'+((L.prix&&L.prix.g)||0)+'" onchange="mPrix('+li+',\'g\',this.value)"> %/an</span></td>':'')
      +pcells+'</tr>';
    body+='<tr><td class="l gc1" style="padding-top:2px;padding-bottom:6px"><button class="gdash" onclick="mAddInd('+li+')">+ inducteur</button></td>'
      +(G_FX?'<td class="gc2"></td>':'')+'<td colspan="'+N+'"></td></tr>';
  });
  body+='<tr class="gtot"><td class="l gc1">Chiffre d\'affaires total</td>'
    +(G_FX?'<td class="l gc2" style="font-size:11px;color:var(--muted)">&Sigma; des lignes &middot; '+u.lib+'</td>':'')
    +tot.map(function(c){return '<td class="num v">'+fmt(c/1000)+'</td>';}).join('')+'</tr>';
  var opts=M_GROUPS.map(function(g){return '<optgroup label="'+g[0]+'">'+g[1].map(function(k){
    return '<option value="'+k+'">'+M_PRESETS[k].lab+'</option>';}).join('')+'</optgroup>';}).join('');
  return '<div class="gbar"><span class="gt">Lignes de revenus</span>'
    +'<button class="gh sm btn'+(G_FX?' primary':'')+'" onclick="mFxToggle()" title="Afficher / masquer la colonne Formule">Formules</button>'
    +'<button class="btn sm" onclick="mPlierTout(true)">Tout déplier</button>'
    +'<button class="btn sm" onclick="mPlierTout(false)">Tout replier</button>'
    +'<span class="push"></span><button class="btn sm primary" onclick="mAddLigne()">+ Ligne de revenus</button></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span>Cliquer une valeur <b>calculée</b> la passe en saisie année par année.</span>'
    +'<span style="margin-left:auto">Les coûts directs se paramètrent dans leur onglet.</span></div></div>'
    +'<div class="glg"><span><i class="a"></i>à saisir</span><span><i class="b"></i>calculé</span>'
    +'<span style="margin-left:6px">Modèle de départ pour une nouvelle ligne : <select class="sel" style="width:auto;font-size:11.5px;padding:4px 8px" onchange="mAddLigneTpl(this.value)"><option value="">— choisir —</option>'+opts+'</select></span></div>';
}
/* =====================================================================
   GRILLE DES COÛTS DIRECTS — même langage visuel que les revenus.
   Les montants affichés viennent de P.pl.CDIND_DETAIL, c'est-à-dire du
   MOTEUR lui-même (scénario appliqué) : aucune reproduction de formule ici.
   ===================================================================== */
function gCoutIndVal(r,i,revs){
  if(r&&r.refLigne){ var L=null;(revs||[]).forEach(function(x,k){if((x.id||('L'+k))===r.refLigne)L=x;});
    return L?volPhysique(L,i):0; }
  return gIndVal(r,i);
}
function mTableCouts(M,P){
  var N=M.nb||5, CD=(M.coutsDirects||[]), revs=(M.revenus||[]), A=P.annees, u=uni(), i;
  var head='<tr><th class="l gc1">Coût direct</th>'+(G_FX?'<th class="l gc2">Méthode</th>':'');
  for(i=0;i<N;i++)head+='<th>An '+(i+1)+'</th>';
  head+='</tr>';
  var tot=[]; for(i=0;i<N;i++)tot.push(0);
  var body='';
  if(!CD.length) body='<tr><td class="l gc1" colspan="'+(N+(G_FX?2:1))+'" style="color:var(--muted)">Aucun coût direct pour l\'instant.</td></tr>';
  CD.forEach(function(cl,ci){
    var m=(cl.m||'ind'), scope=(cl.scope||'all'), id='C'+ci, ferme=!!G_CLOSED[id];
    var det=(P.pl.CDIND_DETAIL||{})['CDI'+ci]||{vals:{}};
    var vals=[]; for(var k=0;k<N;k++){ var v=Math.abs(+det.vals[A[k]]||0); vals.push(v); tot[k]+=v; }
    var opts=(m==='pct'?('<option value="all"'+(scope==='all'?' selected':'')+'>l\'ensemble du CA</option>'):'');
    revs.forEach(function(L,k){var lid=L.id||('L'+k);
      opts+='<option value="'+lid+'"'+(scope===lid?' selected':'')+'>'+esc(L.name||'Ligne')+'</option>';});
    var meth;
    if(m==='pct') meth='<span class="gfx"><input value="'+(cl.pct!=null?cl.pct:0)+'" onchange="mCoutPct('+ci+',this.value)"> % de '
      +'<select class="gsel" onchange="mCoutScope('+ci+',this.value)">'+opts+'</select></span>';
    else if(m==='unit') meth='<span class="gfx"><input style="width:66px" value="'+mAmt(cl.val||0)+'" onchange="mCoutVal('+ci+',this.value)"> F &times; volume de '
      +'<select class="gsel" onchange="mCoutScope('+ci+',this.value)">'+opts+'</select></span>';
    else { var nbi=(cl.rows||[]).length;
      meth='<span class="gfx"><span class="gchip">'+nbi+' inducteur'+(nbi>1?'s':'')+'</span>'
        +'<span class="xx">&times;</span><span class="gchip sys">taux</span>'
        +(ferme?' <span style="color:var(--muted)">— déplier pour éditer</span>':'')+'</span>'; }
    body+='<tr class="grp"><td class="l gc1"><div class="ghead">'
      +(m==='ind'?'<span class="gcar" onclick="mPlier(\''+id+'\')" title="Plier / déplier">'+(ferme?'&#9656;':'&#9662;')+'</span>':'<span class="gcar"></span>')
      +'<input class="gnm big" value="'+esc(cl.name||'')+'" onchange="mCoutNom('+ci+',this.value)">'
      +'<select class="gsel" title="Méthode de calcul" onchange="mCoutMethode('+ci+',this.value)">'
      +'<option value="pct"'+(m==='pct'?' selected':'')+'>% du CA</option>'
      +'<option value="unit"'+(m==='unit'?' selected':'')+'>coût unitaire</option>'
      +'<option value="ind"'+(m==='ind'?' selected':'')+'>inducteurs</option></select>'
      +'<button class="gx" title="Retirer ce coût" onclick="mDelCout('+ci+')">&#10005;</button></div></td>'
      +(G_FX?'<td class="l gc2">'+meth+'</td>':'')
      +vals.map(function(v){return '<td class="num">'+fmt(v)+'</td>';}).join('')+'</tr>';
    if(m!=='ind'||ferme)return;
    (cl.rows||[]).forEach(function(r,ri){
      var ref=!!r.refLigne, yearly=(r.mode==='yearly'), cells='';
      for(var k2=0;k2<N;k2++){
        var val=gCoutIndVal(r,k2,revs);
        if(ref||(!yearly&&k2>0))
          cells+='<td><span class="gcell gcalc num"'+(ref?'':' title="Calculé depuis l&#39;an 1 — cliquer pour saisir année par année" onclick="mCoutIndMode('+ci+','+ri+',\'yearly\')"')+'>'+gN(val)+'</span></td>';
        else
          cells+='<td><input class="gcell gin num" value="'+mAmt(val)+'" oninput="mSep(this)" onpaste="mCollerSerie(event,\'cout\','+ci+','+ri+')" onchange="'
            +(yearly?('mCoutIndYv('+ci+','+ri+','+k2+',this.value)'):('mCoutInd('+ci+','+ri+',\'val\',this.value)'))+'"></td>';
      }
      var refSel='<select class="gsel" onchange="mCoutIndRef('+ci+','+ri+',this.value)"><option value="">valeur saisie</option>'
        +revs.map(function(L,k3){var lid=L.id||('L'+k3);
          return '<option value="'+lid+'"'+(r.refLigne===lid?' selected':'')+'>effectif — '+esc(L.name||'Ligne')+'</option>';}).join('')+'</select>';
      var fx=ref?('<span class="gfx">'+refSel+'</span>')
        :(yearly?'<span class="gfx">année par année <button class="gx" title="Repasser en croissance" onclick="mCoutIndMode('+ci+','+ri+',\'grow\')">&#8634;</button>'+refSel+'</span>'
                :'<span class="gfx">an 1, puis <input value="'+(r.g||0)+'" onchange="mCoutInd('+ci+','+ri+',\'g\',this.value)"> %/an '+refSel+'</span>');
      body+='<tr><td class="l gc1"><div class="gdrv"><button class="gop" title="Basculer &times; / &divide;" onclick="mCoutIndOp('+ci+','+ri+')">'+(r.op==='d'?'&divide;':'&times;')+'</button>'
        +'<input class="gnm" placeholder="Nom" value="'+esc(r.name||'')+'" onchange="mCoutInd('+ci+','+ri+',\'name\',this.value)">'
        +(ref?'':gSegType('cout',ci,ri,gEstPct(r))
          +(gEstPct(r)?'':'<input class="gnm u" placeholder="unité" value="'+esc(r.unit||'')+'" onchange="mCoutInd('+ci+','+ri+',\'unit\',this.value)">'))
        +'<button class="gpct'+(r.ceil?' on':'')+'" title="Arrondi supérieur du produit courant (ex. nombre de classes)" onclick="mCoutIndCeil('+ci+','+ri+')">&#8968;</button>'
        +'<button class="gx" title="Retirer cet inducteur" onclick="mDelCoutInd('+ci+','+ri+')">&#10005;</button></div></td>'
        +(G_FX?'<td class="l gc2">'+fx+'</td>':'')+cells+'</tr>';
    });
    var qte=[],tx=[];
    for(i=0;i<N;i++){ qte.push(volInducteurs(cl.rows,i,{revenus:revs,fCA:1})); tx.push(valAnnee(cl.prix,i)); }
    body+='<tr class="gres"><td class="l gc1"><div class="gdrv"><span class="gop eq">=</span> Quantité</div></td>'
      +(G_FX?'<td class="gc2"></td>':'')
      +qte.map(function(v){return '<td><span class="gcell gcalc num">'+gN(v)+'</span></td>';}).join('')+'</tr>';
    var tcells='';
    for(i=0;i<N;i++) tcells+=(i===0)
      ? '<td><input class="gcell gin num" value="'+mAmt(tx[0])+'" oninput="mSep(this)" onchange="mCoutTaux('+ci+',\'val\',this.value)"></td>'
      : '<td><span class="gcell gcalc num">'+gN(tx[i])+'</span></td>';
    body+='<tr><td class="l gc1"><div class="gdrv"><span class="gop">&times;</span> Taux unitaire'
      +'<input class="gnm u" placeholder="unité" value="'+esc((cl.prix&&cl.prix.unit)||'')+'" onchange="mCoutTaux('+ci+',\'unit\',this.value)"></div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx">an 1, puis <input value="'+((cl.prix&&cl.prix.g)||0)+'" onchange="mCoutTaux('+ci+',\'g\',this.value)"> %/an</span></td>':'')
      +tcells+'</tr>';
    body+='<tr><td class="l gc1" style="padding-bottom:6px"><button class="gdash" onclick="mAddCoutInd('+ci+')">+ inducteur</button></td>'
      +(G_FX?'<td class="gc2"></td>':'')+'<td colspan="'+N+'"></td></tr>';
  });
  body+='<tr class="gtot"><td class="l gc1">Total des coûts directs</td>'
    +(G_FX?'<td class="l gc2" style="font-size:11px;color:var(--muted)">&Sigma; des lignes &middot; '+u.lib+'</td>':'')
    +tot.map(function(c){return '<td class="num v" style="color:var(--red)">'+fmt(c)+'</td>';}).join('')+'</tr>';
  return '<div class="gbar"><span class="gt">Coûts directs</span>'
    +'<button class="btn sm'+(G_FX?' primary':'')+'" onclick="mFxToggle()" title="Afficher / masquer la colonne Méthode">Méthodes</button>'
    +'<span class="push"></span><button class="btn sm primary" onclick="mAddCout()">+ Coût direct</button></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span><b>% du CA</b> : part du chiffre d\'affaires &middot; <b>coût unitaire</b> : montant &times; volume vendu &middot; <b>inducteurs</b> : chaîne indépendante du CA.</span></div></div>';
}
/* =====================================================================
   CHARGES FIXES / PERSONNEL / INVESTISSEMENTS / BFR — mêmes grilles que les
   revenus : une ligne par poste, une COLONNE PAR ANNÉE, pour voir la
   projection pendant qu'on saisit. Montants en FCFA (comme la saisie) ;
   seule la projection du BFR est en unité d'affichage (elle vient du bilan).
   ===================================================================== */
function gHead(N,nc,lib1,lib2){
  var h='<tr><th class="l gc1">'+lib1+'</th>'+(G_FX?'<th class="l gc2">'+lib2+'</th>':'');
  for(var i=0;i<N;i++)h+='<th>An '+(i+1)+(i<nc?' · constr.':'')+'</th>';
  return h+'</tr>';
}
function mTableFixes(M){
  var N=M.nb||5, nc=(M.dureeConstruction||0), CF=(M.chargesFixes||[]), i, tot=[];
  for(i=0;i<N;i++)tot.push(0);
  var body=CF.length?'':'<tr><td class="l gc1" colspan="'+(N+(G_FX?2:1))+'" style="color:var(--muted)">Aucune charge fixe.</td></tr>';
  CF.forEach(function(c,ci){
    var yearly=(c.mode==='yearly'), cells='';
    for(var k=0;k<N;k++){
      var v=gFixeVal(c,k); tot[k]+=v;
      cells+=(yearly||k===0)
        ? '<td><input class="gcell gin num" value="'+mAmt(v)+'" oninput="mSep(this)" onchange="'
          +(yearly?('mFixeYv('+ci+','+k+',this.value)'):('mFixe('+ci+',\'montant\',this.value)'))+'"></td>'
        : '<td><span class="gcell gcalc num" title="Calculé depuis l&#39;an 1 — cliquer pour saisir année par année" onclick="mFixeMode('+ci+',\'yearly\')">'+gN(v)+'</span></td>';
    }
    var fx=yearly
      ? '<span class="gfx">année par année <button class="gx" title="Recopier l&#39;an 1" onclick="mFixeFill('+ci+')">&#8594;</button><button class="gx" title="Repasser en croissance" onclick="mFixeMode('+ci+',\'grow\')">&#8634;</button></span>'
      : '<span class="gfx">an 1, puis <input value="'+(c.g||0)+'" onchange="mFixe('+ci+',\'g\',this.value)"> %/an</span>';
    body+='<tr><td class="l gc1"><div class="ghead"><input class="gnm big" value="'+esc(c.name||'')+'" onchange="mFixe('+ci+',\'name\',this.value)">'
      +'<button class="gx" title="Retirer" onclick="mDelFixe('+ci+')">&#10005;</button></div></td>'
      +(G_FX?'<td class="l gc2">'+fx+'</td>':'')+cells+'</tr>';
  });
  body+='<tr class="gtot"><td class="l gc1">Total frais généraux</td>'+(G_FX?'<td class="gc2"></td>':'')
    +tot.map(function(v){return '<td class="num v">'+gN(v)+'</td>';}).join('')+'</tr>';
  return '<div class="gbar"><span class="gt">Frais généraux</span><span class="mut">hors personnel · en FCFA</span>'
    +'<span class="push"></span><button class="btn sm primary" onclick="mAddFixe()">+ Charge</button></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+gHead(N,nc,'Poste','Évolution')+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span>Cliquer une valeur calculée la passe en saisie année par année (utile pour un loyer qui change à une date connue).</span></div></div>';
}
function mTablePersonnel(M){
  var N=M.nb||5, nc=(M.dureeConstruction||0), PE=(M.personnel||[]), i, tot=[], eff=0;
  for(i=0;i<N;i++)tot.push(0);
  var body=PE.length?'':'<tr><td class="l gc1" colspan="'+(N+(G_FX?2:1))+'" style="color:var(--muted)">Aucun poste.</td></tr>';
  PE.forEach(function(p,pi){
    var cells=''; eff+=(+p.effectif||0);
    for(var k=0;k<N;k++){
      var v=(+p.effectif||0)*(+p.salaireMensuel||0)*12*Math.pow(1+(+p.g||0)/100,k); tot[k]+=v;
      cells+='<td><span class="gcell gcalc num">'+gN(v)+'</span></td>';
    }
    body+='<tr><td class="l gc1"><div class="ghead"><input class="gnm big" value="'+esc(p.poste||'')+'" onchange="mPoste('+pi+',\'poste\',this.value)">'
      +'<button class="gx" title="Retirer" onclick="mDelPoste('+pi+')">&#10005;</button></div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx"><input style="width:44px" value="'+(p.effectif||0)+'" onchange="mPoste('+pi+',\'effectif\',this.value)" title="Effectif"> pers. <span class="xx">&times;</span> <input style="width:78px" value="'+mAmt(p.salaireMensuel||0)+'" oninput="mSep(this)" onchange="mPoste('+pi+',\'salaireMensuel\',this.value)" title="Salaire mensuel"> F/mois <span class="xx">&times;</span> 12 <span class="mut">· +</span><input style="width:38px" value="'+(p.g||0)+'" onchange="mPoste('+pi+',\'g\',this.value)"> %/an</span></td>':'')
      +cells+'</tr>';
  });
  body+='<tr class="gtot"><td class="l gc1">Total personnel <span class="mut" style="font-weight:400">· '+eff+' pers.</span></td>'+(G_FX?'<td class="gc2"></td>':'')
    +tot.map(function(v){return '<td class="num v">'+gN(v)+'</td>';}).join('')+'</tr>';
  return '<div class="gbar" style="margin-top:18px"><span class="gt">Charges de personnel</span><span class="mut">par poste · en FCFA</span>'
    +'<span class="push"></span><button class="btn sm primary" onclick="mAddPoste()">+ Poste</button></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+gHead(N,nc,'Poste','Effectif × salaire × 12')+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span>Le total alimente la ligne « Charges du personnel », comprise dans les frais généraux du P&amp;L.</span></div></div>';
}
/* Réplique EXACTEMENT la mécanique du moteur (bp.js) : mise en service = max(année
   d'investissement, fin de construction), puis amortissement linéaire
   `min(montant/durée, restant)` poste par poste. Sert au détail par ligne ET au
   tableau des immobilisations. */
function gCapexSeries(M){
  var N=M.nb||5, anExp=(M.dureeConstruction||0)+1;
  return (M.capex||[]).map(function(c){
    var an=Math.max(1,Math.round(+c.annee||1)), mt=(+c.montant||0), du=Math.max(1,Math.round(+c.duree||5));
    var mes=Math.max(an,anExp), restant=mt, acc=0, dot=[], cum=[], brut=[], vnc=[];
    for(var k=0;k<N;k++){
      var py=k+1, d=0;
      if(py>=mes&&restant>0.01){ d=Math.min(mt/du,restant); restant-=d; }
      acc+=d; dot.push(d); cum.push(acc);
      var b=(py>=an)?mt:0; brut.push(b); vnc.push(b-acc);
    }
    return {name:(c.name||''),annee:an,duree:du,mes:mes,montant:mt,dot:dot,cum:cum,brut:brut,vnc:vnc};
  });
}
/* ---- 1) LES INVESTISSEMENTS : la liste, puis le total ---- */
function mTableCapex(M){
  var N=M.nb||5, nc=(M.dureeConstruction||0), CX=(M.capex||[]), S=gCapexSeries(M), i, tot=[];
  for(i=0;i<N;i++)tot.push(0);
  var body=CX.length?'':'<tr><td class="l gc1" colspan="'+(N+(G_FX?2:1))+'" style="color:var(--muted)">Aucun investissement.</td></tr>';
  CX.forEach(function(c,ci){
    var s=S[ci], cells='';
    for(var k=0;k<N;k++){
      var py=k+1; if(py===s.annee)tot[k]+=s.montant;
      cells+=(py===s.annee)
        ? '<td><input class="gcell gin num" value="'+mAmt(s.montant)+'" oninput="mSep(this)" onchange="mCapex('+ci+',\'montant\',this.value)"></td>'
        : '<td><span class="gcell gcalc num" title="Investissement placé en an '+s.annee+'">&ndash;</span></td>';
    }
    body+='<tr><td class="l gc1"><div class="ghead"><input class="gnm big" value="'+esc(c.name||'')+'" onchange="mCapex('+ci+',\'name\',this.value)">'
      +'<button class="gx" title="Retirer" onclick="mDelCapex('+ci+')">&#10005;</button></div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx">an <input style="width:38px" value="'+s.annee+'" onchange="mCapex('+ci+',\'annee\',this.value)"> <span class="mut">· amorti sur</span> <input style="width:38px" value="'+s.duree+'" onchange="mCapex('+ci+',\'duree\',this.value)"> ans</span></td>':'')
      +cells+'</tr>';
  });
  body+='<tr class="gtot"><td class="l gc1">Total des investissements</td>'+(G_FX?'<td class="gc2"></td>':'')
    +tot.map(function(v){return '<td class="num v">'+(v?gN(v):'&ndash;')+'</td>';}).join('')+'</tr>';
  return '<div class="gbar"><span class="gt">1 · Investissements</span><span class="mut">CAPEX · en FCFA</span>'
    +'<span class="push"></span><button class="btn sm primary" onclick="mAddCapex()">+ Investissement</button></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+gHead(N,nc,'Poste','Année · durée')+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span>Chaque investissement tombe dans son année. Saisir le montant directement dans la colonne de l\'année.</span></div></div>';
}
/* ---- 2) LES AMORTISSEMENTS : la dotation de chaque poste, puis le total ---- */
function mTableAmort(M){
  var N=M.nb||5, nc=(M.dureeConstruction||0), S=gCapexSeries(M), i, tot=[];
  for(i=0;i<N;i++)tot.push(0);
  if(!S.length)return '';
  var body=S.map(function(s){
    for(var k=0;k<N;k++)tot[k]+=s.dot[k];
    return '<tr><td class="l gc1"><div class="ghead" style="padding-left:3px">'+esc(s.name||'Poste')+'</div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx"><span class="gchip">'+gN(s.montant)+'</span> &divide; '+s.duree+' ans'+(s.mes>s.annee?'<span class="mut"> · dès l\'an '+s.mes+'</span>':'')+'</span></td>':'')
      +s.dot.map(function(v){return '<td><span class="gcell gcalc num"'+(v<=0.01?' style="color:var(--muted)"':'')+'>'+(v>0.01?gN(v):'&ndash;')+'</span></td>';}).join('')+'</tr>';
  }).join('');
  body+='<tr class="gtot"><td class="l gc1">Total des dotations</td>'+(G_FX?'<td class="gc2"></td>':'')
    +tot.map(function(v){return '<td class="num v">'+(v?gN(v):'&ndash;')+'</td>';}).join('')+'</tr>';
  return '<div class="gbar" style="margin-top:18px"><span class="gt">2 · Amortissements</span><span class="mut">dotation de l\'exercice · en FCFA</span></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+gHead(N,nc,'Poste','Base &divide; durée')+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span>Amortissement linéaire, à partir de la mise en service (fin de la période de construction). Le total alimente la ligne « Dotations » du compte de résultat.</span></div></div>';
}
/* ---- 3) LA VNC : tableau de variation — la clôture d'une année ouvre la suivante ---- */
function mTableVNC(M){
  var N=M.nb||5, nc=(M.dureeConstruction||0), S=gCapexSeries(M), i;
  if(!S.length)return '';
  var inv=[],dot=[],ouv=[],clo=[];
  for(i=0;i<N;i++){inv.push(0);dot.push(0);}
  S.forEach(function(s){ for(var k=0;k<N;k++){ if(k+1===s.annee)inv[k]+=s.montant; dot[k]+=s.dot[k]; } });
  var solde=0;
  for(i=0;i<N;i++){ ouv.push(solde); solde=solde+inv[i]-dot[i]; clo.push(solde); }
  function ligne(cls,op,lib,serie,coul,titre){
    return '<tr'+(cls?' class="'+cls+'"':'')+'><td class="l gc1">'
      +(op?'<div class="gdrv"><span class="gop'+(op==='='?' eq':'')+'">'+op+'</span> '+lib+'</div>':lib)+'</td>'
      +(G_FX?'<td class="l gc2"'+(titre?' style="font-size:11px;color:var(--muted)"':'')+'>'+(titre||'')+'</td>':'')
      +serie.map(function(v){return cls==='gtot'
        ? '<td class="num v">'+gN(v)+'</td>'
        : '<td><span class="gcell gcalc num"'+(coul?' style="color:'+coul+'"':'')+'>'+(Math.abs(v)>0.01?gN(v):'&ndash;')+'</span></td>';}).join('')+'</tr>';
  }
  var body=ligne('','','<b>Solde d\'ouverture</b>',ouv,'','VNC à la clôture de l\'exercice précédent')
    +ligne('','+','Investissements de l\'exercice',inv,'#16904E','')
    +ligne('','&minus;','Dotations aux amortissements',dot,'#c0392b','')
    +ligne('gtot','','Valeur nette comptable à la clôture',clo,'','devient le solde d\'ouverture suivant');
  return '<div class="gbar" style="margin-top:18px"><span class="gt">3 · Valeur nette comptable</span><span class="mut">tableau de variation · en FCFA</span></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+gHead(N,nc,'','')+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span><b>Solde d\'ouverture + investissements &minus; dotations = VNC de clôture</b>, qui devient le solde d\'ouverture de l\'exercice suivant. '
    +'La VNC est la base du <b>coût du capital</b> (VNC × WACC) et de l\'actif net. Les <b>intérêts de construction</b> capitalisés, s\'il y en a, s\'ajoutent aux immobilisations du bilan sans figurer ici.</span></div></div>';
}
/* ---- BFR : les délais saisis à gauche, le besoin projeté depuis le BILAN ---- */
function mTableBfr(M,P){
  var N=M.nb||5, nc=(M.dureeConstruction||0), A=P.annees, b=M.bfr||{}, u=uni();
  function serie(cle){ return A.map(function(a){ var v=((P.bs[cle]&&P.bs[cle][a])||0);
    return '<td><span class="gcell gcalc num">'+fmt(v)+'</span></td>'; }).join(''); }
  var body=''
    +'<tr><td class="l gc1"><div class="gdrv"><span class="gop">+</span> Créances clients</div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx"><input value="'+(b.dso||0)+'" onchange="mSet(&#39;bfr.dso&#39;,this.value,1)"> jours de CA <span class="mut">(DSO)</span></span></td>':'')
      +serie('CLIENTS')+'</tr>'
    +'<tr><td class="l gc1"><div class="gdrv"><span class="gop">+</span> Stocks</div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx"><input value="'+(b.dio||0)+'" onchange="mSet(&#39;bfr.dio&#39;,this.value,1)"> jours d&#39;achats <span class="mut">(DIO)</span></span></td>':'')
      +serie('STOCKS')+'</tr>'
    +'<tr><td class="l gc1"><div class="gdrv"><span class="gop">&minus;</span> Dettes fournisseurs</div></td>'
      +(G_FX?'<td class="l gc2"><span class="gfx"><input value="'+(b.dpo||0)+'" onchange="mSet(&#39;bfr.dpo&#39;,this.value,1)"> jours d&#39;achats <span class="mut">(DPO)</span></span></td>':'')
      +serie('FOURNISSEURS')+'</tr>'
    +'<tr class="gtot"><td class="l gc1">Besoin en fonds de roulement</td>'+(G_FX?'<td class="l gc2" style="font-size:11px;color:var(--muted)">'+u.lib+'</td>':'')
      +A.map(function(a){return '<td class="num v">'+fmt((P.bs.BFR&&P.bs.BFR[a])||0)+'</td>';}).join('')+'</tr>'
    +'<tr class="gres"><td class="l gc1"><div class="gdrv"><span class="gop eq">&Delta;</span> Variation <span class="mut" style="margin-left:5px">· ce qui pèse sur la trésorerie</span></div></td>'
      +(G_FX?'<td class="gc2"></td>':'')
      +A.map(function(a,i){ var v=((P.bs.BFR&&P.bs.BFR[a])||0)-(i?((P.bs.BFR&&P.bs.BFR[A[i-1]])||0):0);
        return '<td><span class="gcell gcalc num" style="color:'+(v>0?'#c0392b':'#16904E')+'">'+fmt(-v)+'</span></td>'; }).join('')+'</tr>';
  return '<div class="gbar"><span class="gt">Besoin en fonds de roulement</span><span class="mut">délais en jours · montants en '+u.lib+'</span></div>'
    +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>'+gHead(N,nc,'Poste','Délai')+'</thead><tbody>'+body+'</tbody></table></div>'
    +'<div class="gfoot"><span>Le BFR n&#39;est pas une ligne du tableau de flux : sa <b>variation</b> se lit dans les activités opérationnelles. Une variation positive du BFR consomme de la trésorerie.</span></div></div>';
}
function mAddLigneTpl(tpl){ if(!tpl)return; var M=assurerModele();
  M.revenus.push({name:M_PRESETS[tpl].lab,tpl:tpl,rows:JSON.parse(JSON.stringify(M_PRESETS[tpl].rows)),prix:{val:1000,unit:"FCFA",g:2}});
  sauverDossier();rendre(); }
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
      var refSel='<select class="sel" style="width:auto;max-width:180px" onchange="mCoutIndRef('+ci+','+ri+',this.value)"><option value="">Valeur saisie</option>'
        +revs.map(function(L){return '<option value="'+L.id+'"'+(r.refLigne===L.id?' selected':'')+'>Réf. effectif — '+esc(L.name||'Ligne')+'</option>';}).join('')+'</select>';
      var ceilBtn='<button class="btn sm '+(r.ceil?'primary':'')+'" title="Arrondi supérieur du produit courant (ex. groupes de classes)" onclick="mCoutIndCeil('+ci+','+ri+')" style="min-width:34px;font-weight:700">⌈⌉</button>';
      if(r.refLigne){var Lref=null;revs.forEach(function(L){if(L.id===r.refLigne)Lref=L;});
        var rcells='';for(var kr=0;kr<N;kr++){rcells+='<span class="mind-yv"><label>An '+(kr+1)+'</label><input class="nin ninm" value="'+Math.round(Lref?volPhysique(Lref,kr):0)+'" disabled style="background:#f2f4f8;color:#5a6472"></span>';}
        vals='<div class="mind-vals">'+rcells+'</div><div class="mut" style="padding:2px 0 0 44px">= effectif de « '+esc((Lref&&Lref.name)||'?')+' » (lecture seule — se modifie dans Revenus ; le scénario s\'applique en plus)</div>';}
      else if(r.mode==='yearly'){var cells='';for(var k=0;k<N;k++){var yv=valSerie(r.vals,k);cells+='<span class="mind-yv"><label>An '+(k+1)+'</label><input class="nin ninm" value="'+mAmt(yv)+'" oninput="mSep(this)" onchange="mCoutIndYv('+ci+','+ri+','+k+',this.value)"></span>';}vals='<div class="mind-vals">'+cells+'</div>';}
      else vals='<div class="mind-vals"><span class="mind-f"><label>Valeur an 1</label><input class="nin ninm" value="'+mAmt(r.val)+'" oninput="mSep(this)" onchange="mCoutInd('+ci+','+ri+',\'val\',this.value)"></span><span class="mind-f"><label>Croissance %/an</label><input class="nin" value="'+(r.g||0)+'" onchange="mCoutInd('+ci+','+ri+',\'g\',this.value)"></span></div>';
      var apresCeil='';
      if(r.ceil){var sub=(cl.rows||[]).slice(0,ri+1),cs='';for(var kc=0;kc<N;kc++){cs+=(kc?' · ':'')+Math.round(volInducteurs(sub,kc,{revenus:revs,fCA:1}));}
        apresCeil='<div class="mut" style="padding:2px 0 0 44px">= après arrondi supérieur : <b>'+cs+'</b></div>';}
      return '<div class="mind"><div class="mind-top"><button class="btn sm mind-op" title="× ou ÷" onclick="mCoutIndOp('+ci+','+ri+')">'+(r.op==='d'?'÷':'×')+'</button>'
        +'<input class="sel" style="flex:1;min-width:130px" placeholder="Nom de l\'inducteur" value="'+esc(r.name||'')+'" onchange="mCoutInd('+ci+','+ri+',\'name\',this.value)">'
        +refSel+ceilBtn
        +(r.refLigne?'':'<input class="nin" style="width:78px" placeholder="unité" value="'+esc(r.unit||'')+'" onchange="mCoutInd('+ci+','+ri+',\'unit\',this.value)">'
        +gSegType('cout',ci,ri,gEstPct(r))
        +'<span class="segvue"><button class="'+(r.mode==='yearly'?'':'on')+'" onclick="mCoutIndMode('+ci+','+ri+',\'grow\')">Croissance</button><button class="'+(r.mode==='yearly'?'on':'')+'" onclick="mCoutIndMode('+ci+','+ri+',\'yearly\')">Par année</button></span>')
        +'<button class="btn sm" title="Retirer" onclick="mDelCoutInd('+ci+','+ri+')">✕</button></div>'+vals+apresCeil+'</div>';
    }).join('');
    var q=volInducteurs(cl.rows,0,{revenus:revs,fCA:1}), taux=(cl.prix&&cl.prix.val)||0, cout=q*taux;
    var qS='';for(var kq=0;kq<N;kq++){qS+=(kq?' · ':'')+Math.round(volInducteurs(cl.rows,kq,{revenus:revs,fCA:1})).toLocaleString("fr-FR").replace(/[  ]/g," ");}
    corps='<div class="mrev-sect">Inducteurs de quantité <span>× ou ÷ · une unité en % = ratio</span></div>'
    +rows
    +'<button class="btn sm" style="margin-top:2px" onclick="mAddCoutInd('+ci+')">+ inducteur</button>'
    +'<div class="mind-price"><span class="x">= Quantité par année : <b>'+qS+'</b></span></div>'
    +'<div class="mind-price"><span class="x">×</span> <span class="mut">Taux unitaire an 1 (FCFA)</span> <input class="nin ninm" value="'+mAmt(taux)+'" oninput="mSep(this)" onchange="mCoutTaux('+ci+',\'val\',this.value)"><input class="nin" style="width:70px" value="'+esc((cl.prix&&cl.prix.unit)||'')+'" onchange="mCoutTaux('+ci+',\'unit\',this.value)">'
    +'<span class="mut">croissance</span> <input class="nin" style="width:60px" value="'+((cl.prix&&cl.prix.g)||0)+'" onchange="mCoutTaux('+ci+',\'g\',this.value)"> %'
    +'<span style="margin-left:auto;font-weight:700;color:#c0392b">Coût an 1 : '+fmt(cout/1000)+' '+uni().suf+'</span></div>';
  }
  return '<div class="mrev">'
    +'<div class="mrev-h"><div class="lft"><div class="mrev-eyebrow"><span class="dot"></span>Coût direct</div>'
    +'<input class="mrev-titre" placeholder="Nom du coût" value="'+esc(cl.name||'')+'" onchange="mCoutNom('+ci+',this.value)"></div>'
    +'<div class="rgt"><button class="mghost" title="Supprimer" onclick="mDelCout('+ci+')">Retirer</button></div></div>'
    +'<div class="mrev-b">'+methode+scopeSel+corps
    +'</div></div>';
}
function vueModele(){
  var M=assurerModele();
  mSnapshot(M); mBindClavier();   /* historique d'annulation + raccourcis Ctrl+Z / Ctrl+Y */
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
  var subTabs=enHyp?('<div class="row" style="margin:0 0 12px;flex-wrap:wrap;align-items:center">'+[["rev","Revenus"],["cout","Coûts directs"],["fixe","Charges fixes"],["capex","Investissements"],["fin","Financement"],["bfr","BFR"],["param","Paramètres"]].map(function(t){return '<button class="btn sm '+(SOUS_MODELE===t[0]?"primary":"")+'" onclick="mTab(\''+t[0]+'\')">'+t[1]+'</button>';}).join(" ")
    +'<span style="margin-left:auto;display:inline-flex;gap:6px">'+mBtnUndo()+'</span></div>'):"";
  var rnCum=A.reduce(function(s,a){return s+P.pl.RN[a];},0);
  var kpis='<div class="kpis">'
    +kpiCard("CA fin de plan (An "+A.length+")",fmt(P.pl.CA[aL])+" "+u.suf,"","","chart","#224289")
    +kpiCard("EBITDA fin de plan",fmt(P.pl.EBITDA[aL])+" "+u.suf,(P.pl.CA[aL]?Math.round(P.pl.EBITDA[aL]/P.pl.CA[aL]*100):0)+"% du CA","","coins","#FA6706")
    +kpiCard("Résultat net cumulé",fmt(rnCum)+" "+u.suf,"sur "+A.length+" ans","","file","#172554")
    +kpiCard("Trésorerie fin de plan",fmt(P.bs.TRESO[aL])+" "+u.suf,P.bs.TRESO[aL]<0?"négative":"",P.bs.TRESO[aL]<0?"down":"up","wallet","#16904E")
    +'</div>';
  var corps="";
  if(SOUS_MODELE==="rev"){
    corps=mBlocSecteur()+mTableRevenus(M);
  } else if(SOUS_MODELE==="cout"){
    corps=mTableCouts(M,P);
  } else if(SOUS_MODELE==="__cout_ancien"){
    var CDL=(M.coutsDirects||[]);
    corps='<div class="mut" style="margin-bottom:10px">Tous les coûts directs se paramètrent ici. Pour chaque coût, choisis sa <b>méthode</b> et son <b>périmètre</b> : <b>% du CA</b> (d\'une ligne de produit ou de l\'ensemble), <b>coût unitaire × volume</b> d\'une ligne, ou <b>inducteurs</b> (indépendant du CA — ex. école : <i>Vacataires</i> = Nb classes × Heures/classe/an × 20 000 F/h).</div>'
      +(CDL.length?CDL.map(function(cl,ci){return mCarteCout(cl,ci);}).join(""):'<div class="mut" style="margin-bottom:8px">Aucun coût direct pour l\'instant.</div>')
      +'<button class="btn" onclick="mAddCout()">+ Ajouter un coût direct</button>'
      +'<div class="mut" style="margin-top:10px">Le taux d\'inflation (qui fait évoluer les coûts unitaires et les charges) se règle dans l\'onglet <b>Paramètres</b>.</div>';
  } else if(SOUS_MODELE==="fixe"){
    corps=mTableFixes(M)+mTablePersonnel(M);
  } else if(SOUS_MODELE==="capex"){
    corps=mTableCapex(M)+mTableAmort(M)+mTableVNC(M);
  } else if(SOUS_MODELE==="fin"){
    /* =================================================================
       FINANCEMENT — UN SEUL ÉCRAN
       L'ancien onglet se dédoublait en « automatique » et « manuel » et
       empilait treize champs sans hiérarchie. Il y a en réalité trois
       questions distinctes, et une seule mérite le devant de la scène :
         A. COMBIEN faut-il financer, et QUI apporte quoi   → le montage
         B. À QUELLES CONDITIONS (taux, durées, différés)   → les termes
         C. Ce que la société apporte déjà au premier jour  → l'ouverture
       Dans le montage, % et montant sont deux vues d'une même valeur :
       saisir l'un recalcule l'autre. Piloter au % fait suivre le montant
       quand les investissements changent — c'est l'ancien « automatique »,
       mais ligne par ligne, et toujours modifiable.
       ================================================================= */
    var f=M.financement||{}, e=f.emprunt||{}, Pf=P.financement;
    var BB=(Pf.besoinBase||0), PCTF=(Pf.pct||{}), plugF=(Pf.plug||"");
    var mtF=function(v){ return Math.round((v||0)*1000); };            /* KFCFA → FCFA */
    var pcOf=function(v){ return BB>0?(Math.round((v||0)/BB*1000)/10):0; };
    var pcTx=function(v){ return pcOf(v).toString().replace('.',','); };

    /* ---- A. Ce qu'il faut financer ---- */
    var emplois=(Pf.capexFinance||0)+(Pf.bfrDemarrage||0);
    var tEmp='<div class="gbar"><span class="gt">1 &middot; Ce qu\'il faut financer</span><span class="mut">emplois du montage &middot; en FCFA</span>'
      +'<span class="push"></span><span class="gfx">construction <input style="width:38px" value="'+(M.dureeConstruction||0)+'" onchange="mSet(\'dureeConstruction\',this.value,1)"> an(s)</span></div>'
      +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead><tr><th class="l gc1">Emploi</th><th style="min-width:150px">Montant</th><th class="l" style="min-width:280px">Commentaire</th></tr></thead><tbody>'
      +'<tr><td class="l gc1">Investissements jusqu\'à la mise en service</td><td><span class="gcell gcalc num">'+gN(mtF(Pf.capexFinance))+'</span></td><td class="l mut">onglet Investissements'+(Pf.dureeConstruction>0?' &middot; exploitation à partir de l\'an '+Pf.anneeExploit:'')+'</td></tr>'
      +'<tr><td class="l gc1">BFR de démarrage</td><td><span class="gcell gcalc num">'+gN(mtF(Pf.bfrDemarrage))+'</span></td>'
        +'<td class="l"><span class="gfx"><input style="width:38px" value="'+(f.moisBFR!=null?f.moisBFR:3)+'" onchange="mSet(\'financement.moisBFR\',this.value,1)"> mois de charges d\'exploitation</span></td></tr>'
      +'<tr class="gres"><td class="l gc1">Total des emplois</td><td><span class="gcell gcalc num">'+gN(mtF(emplois))+'</span></td><td class="l mut"></td></tr>'
      +'<tr class="grp"><td class="l gc1">Ressources déjà acquises</td><td></td><td class="l mut">viennent en déduction du besoin</td></tr>'
      +'<tr><td class="l gc1">Subvention d\'investissement</td><td><input class="gcell gin num" value="'+mAmt(f.subvention||0)+'" oninput="mSep(this)" onchange="mSet(\'financement.subvention\',this.value,1)"></td><td class="l mut">non remboursable</td></tr>'
      +'<tr><td class="l gc1">Trésorerie d\'ouverture</td><td><span class="gcell gcalc num">'+gN(mtF((Pf.ouverture&&Pf.ouverture.treso)||0))+'</span></td><td class="l mut">déjà en caisse &middot; carte « Situation d\'ouverture » plus bas</td></tr>'
      +'<tr class="gtot"><td class="l gc1">Besoin à couvrir par le montage</td><td class="num v">'+gN(mtF(BB))+'</td><td class="l mut">base des pourcentages ci-dessous</td></tr>'
      +'</tbody></table></div>'
      +'<div class="gfoot"><span>'+(Pf.idc>0.01
        ?('Les <b>intérêts de construction</b> ('+fmt(Pf.idc)+' '+u.suf+') courent pendant les '+Pf.dureeConstruction+' an(s) de construction : ils sont <b>capitalisés dans la dette et dans les immobilisations</b>, ils ne sont donc pas à financer séparément.')
        :'Le BFR de démarrage sert à <b>calibrer</b> le montage ; dans le tableau de flux, le besoin en fonds de roulement se lit en <b>activités opérationnelles</b> (variation des créances, des stocks et des dettes d\'exploitation) — ce n\'est pas un flux distinct.')
      +'</span></div></div>';

    /* ---- B. Le montage : % et montant, deux vues d'une même valeur ---- */
    var LG=[{k:"capital",lib:"Capital social",v:Pf.capital,cm:"apport en numéraire ou en nature"},
            {k:"primes", lib:"Primes liées au capital",v:Pf.primes,cm:"prime d\'émission / d\'apport"},
            {k:"cca",    lib:"Comptes courants d\'associés",v:Pf.cca,cm:"quasi-fonds propres &middot; juridiquement une dette"},
            {k:"dette",  lib:"Emprunt à terme",v:Pf.dette,cm:"dette bancaire moyen / long terme"}];
    /* LES DEUX COLONNES SE SAISISSENT, TOUJOURS. La version precedente n'affichait un champ
       que sur la colonne « pilote » et attendait un CLIC sur l'autre pour la rendre saisissable :
       affordance invisible — sur un montage saisi en montants, AUCUNE cellule de pourcentage ne
       ressemblait a un champ. Desormais on tape ou on veut ; le style dit seulement laquelle des
       deux decoule de l'autre aujourd'hui. */
    var celPct=function(L){
      var sol=(plugF===L.k), pil=(!sol&&PCTF[L.k]!=null&&PCTF[L.k]!=="");
      var ti=pil?"Saisi : le montant en decoule et suivra vos investissements"
            :(sol?"Calcule — cette ligne absorbe le solde. Saisir un pourcentage ici la libere."
                 :"Calcule a partir du montant. Saisir un pourcentage ici pilote la ligne en %.");
      return '<input class="gcell '+(pil?'gin':'gder')+' num" value="'+pcTx(L.v)+'" onchange="mFinPct(\''+L.k+'\',this.value)" title="'+ti+'">';
    };
    var celMt=function(L){
      var sol=(plugF===L.k), pil=(!sol&&PCTF[L.k]!=null&&PCTF[L.k]!=="");
      var src=(!sol&&!pil);
      var ti=src?"Saisi : le pourcentage en decoule"
            :(sol?"Calcule — cette ligne absorbe le solde. Saisir un montant ici la libere."
                 :"Calcule a partir du pourcentage. Saisir un montant ici fige la ligne.");
      return '<input class="gcell '+(src?'gin':'gder')+' num" value="'+mAmt(mtF(L.v))+'" oninput="mSep(this)" onchange="mFinMt(\''+L.k+'\',this.value)" title="'+ti+'">';
    };
    var celSol=function(k){ return '<span class="gseg"><button class="'+(plugF===k?"on":"")+'" title="Cette ligne absorbe exactement le reste du besoin — le montage boucle" onclick="mFinSolde(\''+k+'\')">= solde</button></span>'; };
    var lgRow=function(L){
      return '<tr><td class="l gc1">'+L.lib+'</td><td>'+celPct(L)+'</td><td>'+celMt(L)+'</td><td class="l">'+celSol(L.k)+' <span class="mut" style="margin-left:7px">'+L.cm+'</span></td></tr>';
    };
    var fpT=(Pf.capital||0)+(Pf.primes||0), qfT=(Pf.cca||0), dtT=(Pf.dette||0);
    var totMontage=fpT+qfT+dtT, ecart=totMontage-BB;
    var grpRow=function(lib,v,coul){ return '<tr class="grp"><td class="l gc1"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+coul+';margin-right:7px"></span>'+lib+'</td>'
      +'<td class="num">'+pcTx(v)+'</td><td class="num">'+gN(mtF(v))+'</td><td></td></tr>'; };
    var coulEc=(Math.abs(ecart)<=0.5?'#16904E':(ecart<0?'#c0392b':'#8a5a00'));
    var tMtg='<div class="gbar" style="margin-top:18px"><span class="gt">2 &middot; Qui apporte quoi</span><span class="mut">le montage &middot; % du besoin ou montant, au choix</span>'
      +'<span class="push"></span><span class="mut" style="margin-right:4px">Tout piloter en</span><span class="gseg">'
        +'<button onclick="mFinToutPct()" title="Chaque ligne devient un % du besoin : les montants suivront vos investissements">pourcentage</button>'
        +'<button onclick="mFinToutMt()" title="Fige les montants actuels : ils ne bougeront plus si les investissements changent">montant</button></span></div>'
      +'<div class="gwrap"><div class="gscroll"><table class="gtab"><thead><tr><th class="l gc1">Ressource</th>'
      +'<th style="min-width:112px">% du besoin</th><th style="min-width:150px">Montant</th><th class="l" style="min-width:280px">Bouclage</th></tr></thead><tbody>'
      +grpRow("Fonds propres",fpT,"#16904E")+lgRow(LG[0])+lgRow(LG[1])
      +grpRow("Quasi-fonds propres",qfT,"#E0913F")+lgRow(LG[2])
      +grpRow("Dette financière",dtT,"#224289")+lgRow(LG[3])
      +((Pf.idc>0.01)?'<tr><td class="l gc1"><span class="mut" style="padding-left:16px">dont intérêts de construction capitalisés</span></td><td></td><td><span class="gcell gcalc num">'+gN(mtF(Pf.idc))+'</span></td><td class="l mut">portent la dette à '+gN(mtF(Pf.detteAvecIDC))+'</td></tr>':'')
      +'<tr class="gtot"><td class="l gc1">Total du montage</td><td class="num v">'+pcTx(totMontage)+'</td><td class="num v">'+gN(mtF(totMontage))+'</td><td class="l mut">'+(BB>0?'':'renseignez vos investissements pour activer les pourcentages')+'</td></tr>'
      +'<tr class="gres"><td class="l gc1">Besoin à couvrir</td><td class="num">'+(BB>0?'100':'0')+'</td><td class="num">'+gN(mtF(BB))+'</td><td class="l mut"></td></tr>'
      +'<tr class="gres"><td class="l gc1"><b>Écart</b></td><td class="num" style="color:'+coulEc+'">'+pcTx(ecart)+'</td>'
        +'<td class="num" style="color:'+coulEc+'"><b>'+gN(mtF(ecart))+'</b></td>'
        +'<td class="l" style="color:'+coulEc+'">'
        +(Math.abs(ecart)<=0.5?'Montage équilibré'
          :(ecart<0?'<b>Besoin non couvert</b> — le manque sera tiré sur la ligne de crédit, ou creusera le découvert'
                   :'<b>Excédent de financement</b> — il vient grossir la trésorerie d\'ouverture du plan'))+'</td></tr>'
      +'</tbody></table></div>'
      +'<div class="gfoot"><span><b>Tapez dans la colonne que vous voulez : les deux se saisissent.</b> '
      +'Saisir un <b>pourcentage</b> fixe la part et laisse le montant suivre vos investissements ; saisir un <b>montant</b> fige le montant et laisse le pourcentage se recalculer. '
      +'Le <b>liseré bleu</b> à gauche d&#39;une cellule signale la valeur qui découle de l&#39;autre aujourd&#39;hui &mdash; y taper suffit à reprendre la main. '
      +'La ligne marquée <b>« = solde »</b> absorbe le reste et boucle le montage au franc près.</span></div></div>';

    /* préréglage rapide = l'ancien mode automatique, ramené à un seul champ */
    var cible=Math.round((f.partFP!=null?f.partFP:0.30)*100);
    var tCible='<div class="gfoot" style="border:1px solid #E3E7EF;border-radius:12px;margin-top:10px;background:#F8FAFC">'
      +'<span><b>Départ rapide</b> — répartir sur une part de fonds propres cible :</span>'
      +'<span class="gfx"><input style="width:44px" value="'+cible+'" onchange="mFinCible(this.value)"> % de fonds propres</span>'
      +'<span class="mut">le capital social prend cette part, l\'emprunt absorbe le reste. Chaque ligne reste modifiable ensuite.</span></div>';

    /* structure du financement : la lecture du prêteur (levier, gearing) */
    var fpTot=fpT+(Pf.subvention||0), ccaTot=qfT, detTot=(Pf.detteAvecIDC||0);
    var baseSt=fpTot+ccaTot+detTot;
    var pSt=function(x){ return baseSt>0?(Math.round((x||0)/baseSt*1000)/10).toString().replace('.',',')+' %':'—'; };
    var larg=function(x){ return baseSt>0?((x||0)/baseSt*100):0; };
    var structBloc=baseSt<=0?'':('<div class="card" style="margin-top:12px"><div class="sec-titre" style="margin-top:0">Structure du financement <span class="mut" style="font-weight:400">&middot; la lecture du prêteur</span></div>'
      +'<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin:2px 0 12px;background:#e6ebf3">'
        +'<div style="width:'+larg(fpTot)+'%;background:#16904E" title="Fonds propres"></div>'
        +(ccaTot?'<div style="width:'+larg(ccaTot)+'%;background:#E0913F" title="Comptes courants d\'associés"></div>':'')
        +'<div style="width:'+larg(detTot)+'%;background:#224289" title="Dette financière"></div></div>'
      +'<div class="hyp-l"><span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#16904E;margin-right:7px"></span>Fonds propres <span class="mut">&middot; capital, primes, subvention</span></span><b>'+fmt(fpTot)+' '+u.suf+' &nbsp;<span style="color:#16904E">'+pSt(fpTot)+'</span></b></div>'
      +(ccaTot?'<div class="hyp-l"><span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#E0913F;margin-right:7px"></span>Comptes courants d\'associés <span class="mut">&middot; quasi-fonds propres</span></span><b>'+fmt(ccaTot)+' '+u.suf+' &nbsp;<span style="color:#8a5a00">'+pSt(ccaTot)+'</span></b></div>':'')
      +'<div class="hyp-l"><span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#224289;margin-right:7px"></span>Dette financière'+(Pf.idc>0.01?' <span class="mut">&middot; dont IDC</span>':'')+'</span><b>'+fmt(detTot)+' '+u.suf+' &nbsp;<span style="color:#224289">'+pSt(detTot)+'</span></b></div>'
      +'<div class="hyp-l" style="border-top:1px solid #dbe3ee;margin-top:4px;padding-top:6px"><span><b>Levier</b> <span class="mut">&middot; dette financière / fonds propres</span></span><b>'
        +(fpTot>0?(Math.round(detTot/fpTot*100)/100).toString().replace('.',',')+' &times;':'—')+'</b></div>'
      +'<div class="hyp-l"><span><b>Gearing</b> <span class="mut">&middot; dette / (dette + fonds propres) — les CCA comptent en dette</span></span><b>'
        +((detTot+ccaTot+fpTot)>0?(Math.round((detTot+ccaTot)/(detTot+ccaTot+fpTot)*1000)/10).toString().replace('.',',')+' %':'—')+'</b></div>'
      +'<div class="mut" style="margin-top:8px">Les <b>comptes courants d\'associés</b> sont juridiquement une dette : ils entrent dans la dette nette de la valorisation. Un prêteur peut accepter de les traiter en quasi-fonds propres s\'ils sont <b>bloqués</b> (convention de blocage ou de subordination) — c\'est une négociation, pas une hypothèse comptable.</div>'
      +'</div>');

    /* BFR : dimensionnement (n mois) contre besoin réellement constitué par les délais */
    var bfrReel=(P.bs.BFR&&P.bs.BFR[A[0]])||0, bfrDim=(Pf.bfrDemarrage||0), ecBfr=bfrReel-bfrDim;
    var bfrNote=((bfrDim>0||bfrReel>0)&&ecBfr>0.5)?('<div class="gchk" style="margin-top:12px"><b>Le BFR de démarrage sous-estime le besoin réel</b><ul>'
      +'<li>Dimensionné à '+fmt(bfrDim)+' '+u.suf+' ('+Pf.moisBFR+' mois de charges), mais vos délais clients / stocks / fournisseurs en constituent '+fmt(bfrReel)+' '+u.suf+' dès la fin de l\'an 1 — soit <b>'+fmt(ecBfr)+' '+u.suf+'</b> d\'écart.</li>'
      +'<li>La différence est absorbée par la trésorerie du plan, ou tirée sur la ligne de crédit. Augmentez le nombre de mois ci-dessus, ou raccourcissez le délai de paiement clients dans l\'onglet BFR.</li></ul></div>'):'';

    /* ---- C. Les conditions : taux, durées, différés ---- */
    var ccaMode=(f.ccaMode||"maintenu");
    var ccaSeg='<span class="segvue" style="margin-left:0">'
      +'<button class="'+(ccaMode==="maintenu"?"on":"")+'" onclick="mSet(\'financement.ccaMode\',\'maintenu\')">Maintenu</button>'
      +'<button class="'+(ccaMode==="infine"?"on":"")+'" onclick="mSet(\'financement.ccaMode\',\'infine\')">In fine</button>'
      +'<button class="'+(ccaMode==="lineaire"?"on":"")+'" onclick="mSet(\'financement.ccaMode\',\'lineaire\')">Linéaire</button></span>';
    var RV=M.revolver||{}, PR=(P.revolver||{});
    var stTit='font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.5px;margin:14px 0 2px';
    var condBloc='<div class="card" style="margin-top:12px"><div class="sec-titre" style="margin-top:0">Conditions des ressources <span class="mut" style="font-weight:400">&middot; taux, durées, différés</span></div>'
      +'<div class="mut" style="'+stTit+';margin-top:6px">Emprunt à terme</div>'
      +'<div class="hyp-g"><span>Taux d\'intérêt</span><input class="sel" value="'+((e.taux||0)*100)+'" onchange="mSet(\'financement.emprunt.taux\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>Durée de remboursement</span><input class="sel" value="'+(e.duree||5)+'" onchange="mSet(\'financement.emprunt.duree\',this.value,1)"><span class="suf">ans</span></div>'
      +'<div class="hyp-g"><span>Différé de remboursement <span class="mut">&middot; grâce : intérêts payés, capital décalé</span></span><input class="sel" value="'+(e.grace||0)+'" onchange="mSet(\'financement.emprunt.grace\',this.value,1)"><span class="suf">ans</span></div>'
      +'<div class="mut" style="'+stTit+'">Comptes courants d\'associés</div>'
      +'<div class="hyp-g"><span>Taux de rémunération <span class="mut">&middot; 0 % = non rémunéré</span></span><input class="sel" value="'+((f.ccaTaux||0)*100)+'" onchange="mSet(\'financement.ccaTaux\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-l"><span>Remboursement</span>'+ccaSeg+'</div>'
      +(ccaMode!=="maintenu"?'<div class="hyp-g"><span>'+(ccaMode==="infine"?'Année de remboursement':'Durée de remboursement')+'</span><input class="sel" value="'+(f.ccaDuree||(M.nb||5))+'" onchange="mSet(\'financement.ccaDuree\',this.value,1)"><span class="suf">'+(ccaMode==="infine"?'(année du plan)':'ans')+'</span></div>':'')
      +'<div class="mut" style="'+stTit+'">Ligne de crédit renouvelable <span style="font-weight:400;text-transform:none;letter-spacing:0">&middot; revolver / découvert autorisé</span></div>'
      +'<div class="mut" style="margin:0 0 6px">Tirée automatiquement quand la trésorerie passe sous le seuil, remboursée dès qu\'elle repasse au-dessus. Plafond à 0 = ligne <b>illimitée</b> (hypothèse optimiste : la trésorerie ne peut jamais manquer).</div>'
      +'<div class="hyp-g"><span>Plafond autorisé <span class="mut">&middot; 0 = illimité</span></span><input class="sel ninm" value="'+mAmt(RV.plafond||0)+'" oninput="mSep(this)" onchange="mSet(\'revolver.plafond\',this.value,1)"><span class="suf">FCFA</span></div>'
      +'<div class="hyp-g"><span>Taux d\'intérêt sur le tiré</span><input class="sel" value="'+((RV.taux!=null?RV.taux:0.12)*100)+'" onchange="mSet(\'revolver.taux\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>Commission d\'engagement <span class="mut">&middot; sur la part non tirée</span></span><input class="sel" value="'+((RV.commission||0)*100)+'" onchange="mSet(\'revolver.commission\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>Trésorerie plancher à maintenir</span><input class="sel ninm" value="'+mAmt(RV.seuil||0)+'" oninput="mSep(this)" onchange="mSet(\'revolver.seuil\',this.value,1)"><span class="suf">FCFA</span></div>'
      +'<div class="hyp-l"><span>Tirage maximal sur le plan</span><b style="color:'+(PR.sature?'#c0392b':'#224289')+'">'+fmt(PR.tirageMax||0)+' '+u.suf+'</b></div>'
      +(PR.sature?'<div class="gchk" style="margin-top:8px"><b>Plafond insuffisant</b><ul><li>Le besoin de trésorerie dépasse le plafond autorisé : la trésorerie reste négative et le plan n\'est pas finançable en l\'état. Relevez le plafond, renforcez les fonds propres, ou étalez les investissements.</li></ul></div>':'')
      +'<div class="mut" style="'+stTit+'">Distribution aux associés</div>'
      +'<div class="hyp-g"><span>Dividendes <span class="mut">&middot; % du résultat net N&minus;1, si bénéficiaire</span></span><input class="sel" value="'+((M.dividendes_payout||0)*100)+'" onchange="mSet(\'dividendes_payout\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>Trésorerie minimale avant distribution <span class="mut">&middot; le dividende est toujours plafonné par la trésorerie d\'ouverture (vide = plancher 0)</span></span><input class="sel ninm" value="'+(M.dividendes_seuilCash!=null?mAmt(M.dividendes_seuilCash):'')+'" oninput="mSep(this)" onchange="mDivSeuil(this.value)"><span class="suf">FCFA</span></div>'
      +'</div>';

    /* ---- D. Situation d'ouverture : entreprise déjà en activité ---- */
    var O=M.ouverture||{}, PO=(Pf.ouverture||{}), aOuv=(PO.actif||PO.passif);
    var ouvBloc='<div class="card" style="margin-top:12px"><div class="sec-titre" style="margin-top:0">Situation d\'ouverture <span class="mut" style="font-weight:400">&middot; entreprise déjà en activité — laisser vide pour un projet neuf</span></div>'
      +'<div class="mut" style="margin:-4px 0 10px">Le plan démarre sinon à zéro. Renseignez ce que la société apporte au premier jour : ces éléments alimentent le bilan et la trésorerie <b>sans passer par le compte de résultat</b> (le produit a déjà été constaté sur les exercices antérieurs).</div>'
      +'<div class="mut" style="'+stTit+';margin-top:10px">Actif</div>'
      +'<div class="hyp-g"><span>Trésorerie disponible (banque + caisse)</span><input class="sel ninm" value="'+mAmt(O.treso||0)+'" oninput="mSep(this)" onchange="mSet(\'ouverture.treso\',this.value,1)"><span class="suf"></span></div>'
      +'<div class="hyp-g"><span>Créances à recouvrer (facturé non encaissé)</span><input class="sel ninm" value="'+mAmt(O.creances||0)+'" oninput="mSep(this)" onchange="mSet(\'ouverture.creances\',this.value,1)"><span class="suf"></span></div>'
      +'<div class="hyp-g"><span>… part jugée recouvrable <span class="mut">&middot; le reste n\'est pas porté à l\'actif</span></span><input class="sel" value="'+((O.tauxRecouv!=null?O.tauxRecouv:1)*100)+'" onchange="mSet(\'ouverture.tauxRecouv\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>… étalement de l\'encaissement</span><input class="sel" value="'+(O.dureeRecouv||1)+'" onchange="mSet(\'ouverture.dureeRecouv\',this.value,1)"><span class="suf">ans</span></div>'
      +'<div class="mut" style="'+stTit+'">Passif</div>'
      +'<div class="hyp-g"><span>Dettes fournisseurs et autres dettes d\'exploitation</span><input class="sel ninm" value="'+mAmt(O.dettesFrn||0)+'" oninput="mSep(this)" onchange="mSet(\'ouverture.dettesFrn\',this.value,1)"><span class="suf"></span></div>'
      +'<div class="hyp-g"><span>Dettes fiscales et sociales</span><input class="sel ninm" value="'+mAmt(O.dettesFiscSoc||0)+'" oninput="mSep(this)" onchange="mSet(\'ouverture.dettesFiscSoc\',this.value,1)"><span class="suf"></span></div>'
      +'<div class="hyp-g"><span>… étalement du règlement</span><input class="sel" value="'+(O.dureeDettes||1)+'" onchange="mSet(\'ouverture.dureeDettes\',this.value,1)"><span class="suf">ans</span></div>'
      +(aOuv?('<div class="hyp-l" style="border-top:2px solid #224289;padding-top:6px;margin-top:8px"><span><b>Situation nette apportée</b> <span class="mut">&middot; report à nouveau d\'ouverture</span></span><b style="color:'+(PO.net<0?"#c0392b":"#16904E")+'">'+fmt(PO.net)+' '+u.suf+'</b></div>'
        +(PO.creancesBrut>PO.creances?'<div class="hyp-l"><span class="mut">dont créances retenues '+fmt(PO.creances)+' '+u.suf+' sur '+fmt(PO.creancesBrut)+' '+u.suf+' facturés (décote de recouvrement)</span></div>':'')
        +(PO.actif&&!PO.passif?'<div class="gchk" style="margin-top:8px"><b>Actif renseigné sans aucun passif</b><ul><li>Un acquéreur lira une situation d\'ouverture asymétrique — donc suspecte. Renseignez les dettes connues (fournisseurs, impôts, charges sociales, arriérés de salaires), même approximatives, ou justifiez leur absence dans le rapport.</li></ul></div>':'')
        +'<div class="mut" style="margin-top:8px;font-style:italic">À reprendre dans les livrables : éléments <b>déclarés par la direction, non audités et non exhaustifs</b> ; l\'écart éventuel relève d\'une garantie d\'actif et de passif (cession de titres) ou d\'un ajustement de prix au closing.</div>'):'')
      +'</div>';

    /* note de transparence : ces montants sont un point de départ, pas une saisie */
    var cxT=(M.capex||[]).reduce(function(s,c){return s+(+c.montant||0);},0);
    var notePre='<div style="border:1px solid #cfe0f5;background:#F2F7FF;border-radius:9px;padding:11px 13px;margin:0 0 14px">'
      +'<b style="color:#224289;font-size:12.5px">Ces montants sont un point de départ, pas une saisie</b>'
      +'<div class="mut" style="margin-top:4px">'+(DOSSIER.secteurModele
        ? 'Au chargement du modèle sectoriel, le montage a été dimensionné sur vos investissements'+(cxT>0?' ('+fmt(cxT/1000)+' '+uni().suf+')':'')+' : <b>20 % en fonds propres, 45 % en emprunt</b>, le solde en compte courant d\'associés.'
        : 'Un projet neuf démarre avec un montage par défaut (capital et emprunt pré-remplis).')
      +' Remplacez chaque montant par le vôtre, ou repartez de zéro.</div>'
      +'<div class="row" style="gap:8px;margin-top:9px">'
      +'<button class="btn sm" onclick="mFinReset()">Repartir de zéro</button>'
      +'<button class="btn sm" onclick="mFinRedim()" title="Recalcule 20 % / 45 % sur le total des investissements actuels">Re-dimensionner sur les investissements</button>'
      +'</div></div>';

    corps=notePre+tEmp+tMtg+tCible+bfrNote+structBloc+condBloc+ouvBloc;
  } else if(SOUS_MODELE==="bfr"){
    corps=mTableBfr(M,P);
  } else if(SOUS_MODELE==="param"){
    corps='<div class="card"><div class="sec-titre" style="margin-top:0">Paramètres du modèle</div>'
      +'<div class="hyp-g"><span>Nom de la société</span><input class="sel" value="'+esc(DOSSIER.societe||"")+'" onchange="mRenommer(this.value)"><span class="suf"></span></div>'
      +'<div class="hyp-g"><span>Année de départ</span><input class="sel" value="'+(M.anneeDepart||2025)+'" onchange="mSet(\'anneeDepart\',this.value,1)"><span class="suf"></span></div>'
      +'<div class="hyp-l"><span>Type d\'exercice <span class="mut">· libellé des périodes</span></span><span class="segvue">'
        +'<button class="'+(M.exerciceCheval?"":"on")+'" onclick="mSet(\'exerciceCheval\',false)">Année civile (FY26)</button>'
        +'<button class="'+(M.exerciceCheval?"on":"")+'" onclick="mSet(\'exerciceCheval\',true)">À cheval (2026/27)</button></span></div>'
      +(M.exerciceCheval?'<div class="mut" style="margin:-2px 0 10px;font-style:italic">'+MENTION_CHEVAL+'</div>':'')
      +'<div class="hyp-g"><span>Horizon</span><input class="sel" value="'+(M.nb||5)+'" onchange="mSet(\'nb\',this.value,1)"><span class="suf">années</span></div>'
      +'<div class="hyp-g"><span>Durée de construction <span class="mut">· 0 = dès l\'an 1</span></span><input class="sel" value="'+(M.dureeConstruction||0)+'" onchange="mSet(\'dureeConstruction\',this.value,1)"><span class="suf">années</span></div>'
      +'<div class="hyp-g"><span>TVA <span class="mut">· taux de droit commun</span></span><input class="sel" value="'+((M.tva||0)*100)+'" onchange="mSet(\'tva\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      /* activité exonérée : le CA est facturé HT (créances sans TVA) mais les achats restent TTC,
         la TVA d'amont n'étant pas déductible — les charges doivent alors être saisies TTC */
      +'<div class="hyp-l"><span>Chiffre d\'affaires exonéré de TVA <span class="mut">· enseignement, santé…</span></span>'
        +'<span class="segvue">'
        +'<button class="'+(M.tvaExonere?"":"on")+'" onclick="mSet(\'tvaExonere\',false)">Assujetti</button>'
        +'<button class="'+(M.tvaExonere?"on":"")+'" onclick="mSet(\'tvaExonere\',true)">Exonéré</button></span></div>'
      +'<div class="mut" style="margin:-2px 0 10px;font-style:italic">'
        +(M.tvaExonere
          ?'Ventes facturées HT : les créances clients ne portent pas de TVA. Les achats en portent toujours une et elle n\'est pas déductible — saisissez les coûts et charges <b>TTC</b>, la TVA d\'amont étant un coût définitif.'
          :'Ventes facturées TTC : les créances clients incluent la TVA collectée, les dettes fournisseurs la TVA déductible.')+'</div>'
      +'<div class="hyp-g"><span>Impôt sur les sociétés</span><input class="sel" value="'+((M.is_taux||0)*100)+'" onchange="mSet(\'is_taux\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>Impôt minimum forfaitaire (% du CA)</span><input class="sel" value="'+((M.imf_taux||0)*100)+'" onchange="mSet(\'imf_taux\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div>'
      +'<div class="hyp-g"><span>Inflation <span class="mut">· fait évoluer charges & coûts unitaires</span></span><input class="sel" value="'+((M.inflation||0)*100)+'" onchange="mSet(\'inflation\',(numFR(this.value)||0)/100)"><span class="suf">%</span></div></div>'
      /* paramètres des scénarios : jusqu'ici codés en dur (seul le classeur Excel les exposait) */
      +'<div class="card"><div class="sec-titre" style="margin-top:0">Scénarios — sensibilité</div>'
      +'<div class="mut" style="margin:-4px 0 10px">Écarts appliqués au scénario central : le volume agit sur le chiffre d\'affaires, la marge sur les coûts directs, les délais sur le BFR (DSO, DIO, DPO). Le scénario actif se choisit en haut de chaque vue.</div>'
      +'<div class="tscroll"><table class="tb etat"><tr><th>Scénario</th><th class="num">Δ Volume / CA</th><th class="num">Δ Marge</th><th class="num">Δ Délais BFR</th></tr>'
      +Object.keys(M.scenarios||{}).map(function(k){var s=M.scenarios[k];
        var ch=function(champ){return '<td class="num"><input class="nin" style="width:76px" value="'+(Math.round((+s[champ]||0)*1000)/10)+'" onchange="mScenDelta(\''+k+'\',\''+champ+'\',this.value)"><span class="mut"> %</span></td>';};
        return '<tr><td><input class="sel" value="'+esc(s.lab||k)+'" onchange="mScenLab(\''+k+'\',this.value)"'+(k==="central"?' ':'')+'></td>'
          +ch('dCA')+ch('dMarge')+ch('dJours')+'</tr>';}).join("")
      +'</table></div>'
      +'<div class="mut" style="margin-top:8px">Un Δ marge positif <b>réduit</b> les coûts directs (marge améliorée) ; un Δ délais positif <b>allonge</b> les délais, donc alourdit le BFR. Le scénario central est habituellement laissé à 0.</div></div>';
  } else if(SOUS_MODELE==="pl"){ corps=vueBPPl(P);
  } else if(SOUS_MODELE==="bs"){ corps=vueBPBs(P);
  } else if(SOUS_MODELE==="tft"){
    /* Le revolver n'apparaît PAS dans « Emprunts nouveaux » : en SYSCOHADA les concours
       bancaires courants sont de la trésorerie-PASSIF, donc compris dans la trésorerie
       nette sur laquelle le tableau ouvre et clôture. On l'écrit, sinon le lecteur
       cherche en vain la contrepartie du découvert dans les flux de financement. */
    var ctMax=0, ctFin=0;
    A.forEach(function(a){ var x=(P.bs.LIGNE_CT&&P.bs.LIGNE_CT[a])||0; if(x>ctMax)ctMax=x; ctFin=x; });
    corps=vueBPTft(P)+(ctMax>0.5
      ?('<div class="card" style="background:#f6f8fc;margin-top:12px"><div class="sec-titre" style="margin-top:0">Où lire la ligne de crédit ?</div>'
        +'<div class="mut">Les tirages du revolver ne figurent <b>pas</b> dans « Emprunts nouveaux » — cette ligne ne porte que les <b>emprunts à terme</b>. En SYSCOHADA, les <b>concours bancaires courants</b> sont de la <b>trésorerie-passif</b> : ils sont donc <b>compris dans la trésorerie nette</b> sur laquelle ce tableau ouvre et clôture. Une trésorerie de clôture négative <b>est</b> le découvert.</div>'
        +'<div class="hyp-l" style="margin-top:8px"><span>Tirage maximal sur la durée du plan</span><b style="color:#c0392b">'+fmt(ctMax)+' '+u.suf+'</b></div>'
        +'<div class="hyp-l"><span>Encours à la clôture du plan</span><b style="color:'+(ctFin>0.5?'#c0392b':'#16904E')+'">'+fmt(ctFin)+' '+u.suf+'</b></div>'
        +'<div class="mut" style="margin-top:6px">Le détail figure au <b>bilan prévisionnel</b> (ligne « Concours bancaires courants ») ; les intérêts et la commission d\'engagement sont dans les <b>frais financiers</b> du compte de résultat.</div></div>')
      :'');
  } else if(SOUS_MODELE==="dette"){ corps=vueBPDette(P);
  } else if(SOUS_MODELE==="analyse"){ corps=vueModeleAnalyse(P);
  } else if(SOUS_MODELE==="valo"){
    try{ var Vv=valoriserBP(etatsFromModele(P),{is_taux:M.is_taux,valo:M.valo},P);
      /* texte aligné sur le moteur depuis la correction des dates de référence : la dette nette
         et l'actif net sont pris à la DATE DE VALORISATION (situation d'ouverture), l'EBITDA de
         référence est celui de la 1re année du plan — et non plus ceux de la dernière année. */
      corps='<div class="mut" style="margin-bottom:8px">Référence : situation d\'ouverture pour la dette nette et l\'actif net, 1<sup>re</sup> année du plan pour l\'EBITDA. Cliquez sur <b>« Modifier les hypothèses »</b> pour le build-up MEDAF (risque pays Damodaran), les multiples et la valeur terminale.</div>'+vueValoCorps(M,P,Vv);
    }catch(e){ corps='<div class="mut">Valorisation indisponible ('+esc(e.message)+').</div>'; }
  }
  return '<h1>Business plan <span class="chip" style="background:#fff4e8;color:#b45608">Projet</span></h1>'
    +pillsScenariosModele(M)
    +kpis
    +(enHyp?mBandeControles(M,P):'')
    +'<div class="row" style="margin:14px 0 12px;align-items:center;flex-wrap:wrap">'+barre+vueBtn+'</div>'
    +subTabs
    +(enHyp?'<div class="mhyp">'+corps+'</div>':corps);
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
    +rowScen("Chiffre d'affaires ("+libFY(aF,true)+")",function(c){return c.caF;})
    +rowScen("EBITDA ("+libFY(aF,true)+")",function(c){return c.ebF;})
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
  const nCh=AP.length+(mm?0:1), cg=nCh>2;   /* colonnes chiffrées + colonne de variation (TCAM) */
  const th=(mm?"":`<th class="num" style="opacity:.75">${libFY(a1)}</th>`)
    +AP.map((a,i)=>`<th class="num">${libFY(a,true)}${i<nc?'<div style="font-size:9px;font-weight:700;color:#b45608;letter-spacing:.02em">construction</div>':''}</th>`).join("")
    +(cg?'<th class="num delta">TCAM</th>':"");
  const lignes=defs.map(d=>{
    if(d.sec!==undefined) return `<tr class="sec"><td colspan="${nCh+1+(cg?1:0)}">${d.sec}</td></tr>`;
    if(d.type==="pct"){
      const arr=mm?AP.map(a=>d.proj(a)):[d.hist,...AP.map(a=>d.proj(a))];
      const cells=arr.map(x=>`<td class="num pctl">${x===null?"-":Math.round(x*100)+"%"}</td>`).join("");
      return `<tr class="pct"><td>${d.lib}</td>${cells}${cg?'<td class="delta"></td>':""}</tr>`;
    }
    const vals=mm?AP.map(a=>d.proj(a)):[d.hist,...AP.map(a=>d.proj(a))];
    const histCell=mm?"":`<td class="num" style="opacity:.75">${d.hist!==undefined&&d.hist!==null?fmt(d.hist):"-"}</td>`;
    return `<tr class="${d.st||""}${d.clic?" cliquable":""}"${d.clic?` onclick="${d.clic}" title="Voir le détail"`:""}><td>${d.lib}${d.clic?' <span class="chev">›</span>':""}</td>${histCell}
      ${AP.map(a=>`<td class="num">${fmt(d.proj(a))}</td>`).join("")}
      ${cg?`<td class="num delta">${cagrCell(vals,fpct)}</td>`:""}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — ${titre} <span style="opacity:.7">· scénario ${P.scenario}</span></div>
    <div class="tscroll"><table class="tb etat fixe">${colsEtat(nCh+(cg?1:0))}
    <tr><th>${uni().lib}</th>${th}</tr>${lignes}</table></div></div>`;
}

function vueBP(){
  if(!ETATS) return '<div class="mut">Importez d\'abord des balances.</div>';
  const H=assurerBP(),P=projeterBP(ETATS,H);
  const A0=ETATS.annees,a1=A0[A0.length-1],AP=P.annees,aF=AP[AP.length-1],v=ETATS.v;
  const tabs=[["hyp","Hypothèses"],["pl","P&L prévisionnel"],["bs","Bilan prévisionnel"],["tft","Flux de trésorerie"],["dette","Dette"],["analyse","Analyse & covenants"]]
    .map(([id,lab])=>`<button class="btn ${SOUS_BP===id?"primary":""}" onclick="SOUS_BP='${id}';rendre()">${lab}</button>`).join(" ");
  const kpis=`<div class="kpis">
    ${kpiCard("CA fin de plan ("+libFY(aF,true)+")",fmt(P.pl.CA[aF])+" "+uni().suf,"",fdelta(v.CA[a1],P.pl.CA[aF]),"chart","#224289")}
    ${kpiCard("EBITDA fin de plan",fmt(P.pl.EBITDA[aF])+" "+uni().suf,(P.pl.CA[aF]?Math.round(P.pl.EBITDA[aF]/P.pl.CA[aF]*100):0)+"% du CA","","coins","#FA6706")}
    ${kpiCard("Résultat net cumulé",fmt(AP.reduce((s,a)=>s+P.pl.RN[a],0))+" "+uni().suf,"sur "+AP.length+" ans","","file","#172554")}
    ${kpiCard("Trésorerie fin de plan",fmt(P.bs.TRESO[aF])+" "+uni().suf,"",P.bs.TRESO[aF]<0?'<span class="d down">négative</span>':'<span class="d up">positive</span>',"wallet","#16904E")}
  </div>`;
  let corps="";
  if(SOUS_BP==="hyp") corps=vueBPHyp(H,P);
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

/* =====================================================================
   CHIFFRE D'AFFAIRES PROJETÉ DEPUIS L'HISTORIQUE — VOLUMES × PRIX
   Un taux de croissance global écrase deux décisions distinctes : vendre
   plus, et vendre plus cher. Elles n'ont ni les mêmes déterminants (part
   de marché, capacité) ni les mêmes limites (inflation, concurrence), et
   un lecteur de business plan les challenge séparément.
   Ce mode part du CA du DERNIER EXERCICE RÉEL, le décompose en volume et
   prix moyen — le prix étant le plus souvent DÉDUIT (CA comptable ÷
   quantité vendue), puisque c'est ce qu'on connaît — et projette chacun
   par un taux de croissance ou année par année.
   ===================================================================== */
function hCaMode(m){
  const H=assurerBP();
  H.caMode=m;
  if(m==="volumePrix"&&(!H.revenus||!H.revenus.length))
    H.revenus=hypothesesBP(ETATS,DOSSIER.lignesPerso||[]).revenus;
  sauverDossier();rendre();
}
function hRev(li,champ,val,div){
  const L=(assurerBP().revenus||[])[li]; if(!L)return;
  if(champ==="name"||champ==="uniteVol"){L[champ]=val;sauverDossier();rendre();return;}
  const x=numFR(val); if(x===null){rendre();return;}
  L[champ]=x/(div||1); sauverDossier(); rendre();
}
/* prix du dernier exercice réel : déduit du CA comptable, ou saisi.
   En passant de « déduit » à « saisi » on part de la valeur déduite : rien ne saute. */
function hRevPrixMode(li,m){
  const L=(assurerBP().revenus||[])[li]; if(!L)return;
  if(m==="saisi"&&L.prixMode!=="saisi")L.prixBase=prixBaseLigne(L);
  L.prixMode=m; sauverDossier(); rendre();
}
/* règle de projection : un taux de croissance, ou une valeur par année.
   En passant en « par année » on pré-remplit avec la trajectoire courante — l'utilisateur
   corrige les années qui s'écartent au lieu de tout ressaisir. */
function hRevProjMode(li,quoi,m){
  const H=assurerBP(),L=(H.revenus||[])[li]; if(!L)return;
  const o=L[quoi]||(L[quoi]={mode:"croissance",croiss:0,vals:[]});
  if(m==="annuel"&&o.mode!=="annuel"){
    const base=(quoi==="volProj")?(+L.volBase||0):prixBaseLigne(L);
    o.vals=Array.from({length:H.nb||5},(_,i)=>Math.round(base*Math.pow(1+(+o.croiss||0),i+1)*100)/100);
  }
  o.mode=m; sauverDossier(); rendre();
}
function hRevCroiss(li,quoi,val){
  const L=(assurerBP().revenus||[])[li]; if(!L||!L[quoi])return;
  const x=numFR(val); if(x===null){rendre();return;}
  L[quoi].croiss=x/100; sauverDossier(); rendre();
}
function hRevVal(li,quoi,i,val){
  const L=(assurerBP().revenus||[])[li]; if(!L||!L[quoi])return;
  const x=numFR(val); if(x===null){rendre();return;}
  (L[quoi].vals=L[quoi].vals||[])[i]=x; sauverDossier(); rendre();
}
function hRevAdd(){
  const H=assurerBP();
  (H.revenus=H.revenus||[]).push({name:"Nouvelle ligne de revenus",caHist:0,volBase:0,uniteVol:"unité",
    prixMode:"saisi",prixBase:0,
    volProj:{mode:"croissance",croiss:0.05,vals:[]},
    prixProj:{mode:"croissance",croiss:H.inflation||0.03,vals:[]}});
  sauverDossier();rendre();
}
function hRevDel(li){
  const H=assurerBP(); if(!H.revenus||H.revenus.length<2){
    if(typeof toast==='function')toast("Gardez au moins une ligne de revenus");return;}
  H.revenus.splice(li,1); sauverDossier(); rendre();
}
/* Répartit le CA comptable du dernier exercice au prorata du poids actuel de chaque ligne :
   l'écart de réconciliation retombe à zéro sans écraser la structure voulue. Le levier
   dépend du mode de la ligne — on ajuste le CA de référence quand le prix en est déduit,
   le prix lui-même quand il est saisi. Sinon le bouton ne refermerait l'écart que sur la
   moitié des lignes, ce qui est pire que de ne rien faire. */
function hRevCaler(){
  const H=assurerBP(),A0=ETATS.annees,a1=A0[A0.length-1],reel=ETATS.v.CA[a1]||0;
  const R=H.revenus||[]; if(!R.length)return;
  const poids=R.map(L=>(+L.volBase||0)*prixBaseLigne(L)/1000);
  const som=poids.reduce((s,x)=>s+x,0);
  R.forEach((L,i)=>{
    const part=(som>0)?(poids[i]/som*reel):(reel/R.length);
    L.caHist=part;
    if(L.prixMode==="saisi")L.prixBase=(+L.volBase>0)?(part*1000/(+L.volBase)):0;
  });
  sauverDossier();rendre();
  if(typeof toast==='function')toast("Lignes calées sur le CA comptable de "+libFY(a1));
}
function tableRevenusBP(H){
  const u=uni(),A0=ETATS.annees,a1=A0[A0.length-1],reel=ETATS.v.CA[a1]||0;
  const N=H.nb||5,R=H.revenus||[];
  const AP=Array.from({length:N},(_,i)=>a1+1+i);
  const det=Array.from({length:N},(_,i)=>caLignesBP(H,i));
  const nCols=N+3;
  const seg=(on,lab,fn,ti)=>`<button class="${on?"on":""}"${ti?` title="${ti}"`:""} onclick="${fn}">${lab}</button>`;
  const calc=(txt,ti,fn)=>`<span class="gcell gcalc num"${ti?` title="${ti}"`:""}${fn?` onclick="${fn}"`:""}>${txt}</span>`;
  const inp=(val,fn,ti)=>`<input class="gcell gin num" value="${val}" oninput="mSep(this)" onchange="${fn}"${ti?` title="${ti}"`:""}>`;

  const corps=R.map((L,li)=>{
    const vP=L.volProj||{mode:"croissance",croiss:0,vals:[]};
    const pP=L.prixProj||{mode:"croissance",croiss:0,vals:[]};
    const vAn=(vP.mode==="annuel"),pAn=(pP.mode==="annuel");
    const pDed=(L.prixMode!=="saisi");
    const pBase=prixBaseLigne(L);
    const caBase=(+L.volBase||0)*pBase/1000;
    const part=reel?Math.round(caBase/reel*1000)/10:0;

    /* règle de projection, colonne « Projection » */
    const regle=(quoi,o,an)=>`<span class="gfx">`
      +`<span class="gseg">${seg(!an,"croissance",`hRevProjMode(${li},'${quoi}','croissance')`,"Un taux unique appliqué chaque année")}`
      +`${seg(an,"par année",`hRevProjMode(${li},'${quoi}','annuel')`,"Une valeur saisie pour chaque exercice")}</span>`
      +(an?`<span class="mut">valeurs ci-contre</span>`
          :`<input style="width:46px" value="${+((+o.croiss||0)*100).toFixed(1)}" onchange="hRevCroiss(${li},'${quoi}',this.value)"> %/an`)
      +`</span>`;

    const ligneVol=`<tr><td class="l gc1"><div class="ghead"><span style="padding-left:10px">Volume</span>`
      +`<input class="gnm u" style="width:74px" value="${esc(L.uniteVol||"unité")}" title="Unité du volume" onchange="hRev(${li},'uniteVol',this.value)"></div></td>`
      +`<td class="l gc2">${regle("volProj",vP,vAn)}</td>`
      +`<td class="reelc">${inp(mAmt(+L.volBase||0),`hRev(${li},'volBase',this.value,1)`,"Quantité vendue sur le dernier exercice réel")}</td>`
      +det.map((d,k)=>`<td>${vAn
        ?inp(mAmt(Math.round(d.lignes[li].vol*100)/100),`hRevVal(${li},'volProj',${k},this.value)`)
        :calc(gN(d.lignes[li].vol),"Calculé : volume réel × croissance")}</td>`).join("")+`</tr>`;

    const lignePrix=`<tr><td class="l gc1"><span style="padding-left:10px">Prix moyen</span> <span class="mut">· FCFA</span></td>`
      +`<td class="l gc2">${regle("prixProj",pP,pAn)}</td>`
      +`<td class="reelc">${pDed
        ?calc(gN(pBase),"Déduit : chiffre d'affaires réel de la ligne ÷ volume réel. Cliquer pour saisir un prix.",`hRevPrixMode(${li},'saisi')`)
        :inp(mAmt(Math.round(pBase*100)/100),`hRev(${li},'prixBase',this.value,1)`,"Prix moyen saisi")}</td>`
      +det.map((d,k)=>`<td>${pAn
        ?inp(mAmt(Math.round(d.lignes[li].prix*100)/100),`hRevVal(${li},'prixProj',${k},this.value)`)
        :calc(gN(d.lignes[li].prix),"Calculé : prix réel × croissance")}</td>`).join("")+`</tr>`;

    const ligneCA=`<tr class="gres"><td class="l gc1"><div class="gdrv"><span class="gop eq">=</span> Chiffre d'affaires <span class="mut">· ${u.suf}</span></div></td>`
      +`<td class="l gc2"><span class="gseg">${seg(pDed,"CA réel saisi",`hRevPrixMode(${li},'deduit')`,"Le prix moyen se déduit de ce chiffre d'affaires")}`
      +`${seg(!pDed,"volume × prix",`hRevPrixMode(${li},'saisi')`,"Le chiffre d'affaires résulte du volume et du prix saisis")}</span></td>`
      +`<td class="reelc">${pDed
        ?inp(mAmt(Math.round((+L.caHist||0)*u.f*100)/100),`hRev(${li},'caHist',this.value,${u.f})`,"Part du chiffre d'affaires comptable portée par cette ligne")
        :calc(fmt(caBase),"Calculé : volume × prix moyen")}</td>`
      +det.map(d=>`<td>${calc(fmt(d.lignes[li].ca))}</td>`).join("")+`</tr>`;

    return `<tr class="grp"><td class="l gc1"><div class="ghead"><input class="gnm big" value="${esc(L.name||"")}" onchange="hRev(${li},'name',this.value)">`
      +(R.length>1?`<button class="gx" title="Retirer cette ligne" onclick="hRevDel(${li})">&#10005;</button>`:"")+`</div></td>`
      +`<td class="l gc2 mut">${part} % du CA réel</td><td class="reelc"></td>`
      +det.map(()=>`<td></td>`).join("")+`</tr>`
      +ligneVol+lignePrix+ligneCA;
  }).join("");

  const totBase=R.reduce((s,L)=>s+(+L.volBase||0)*prixBaseLigne(L)/1000,0);
  const ecart=totBase-reel;
  const coulEc=(Math.abs(ecart)<=0.01?"#16904E":"#c0392b");
  const totaux=`<tr class="gtot"><td class="l gc1">Total du chiffre d'affaires</td><td class="gc2"></td>`
    +`<td class="reelc num v">${fmt(totBase)}</td>`
    +det.map(d=>`<td class="num v">${fmt(d.total)}</td>`).join("")+`</tr>`
    +`<tr class="gres"><td class="l gc1">Chiffre d'affaires comptable <span class="mut">· ${libFY(a1)}</span></td><td class="gc2 mut">états financiers</td>`
    +`<td class="reelc num">${fmt(reel)}</td>`+det.map(()=>`<td></td>`).join("")+`</tr>`
    +`<tr class="gres"><td class="l gc1"><b>Écart de réconciliation</b></td><td class="l gc2" style="color:${coulEc}">`
    +(Math.abs(ecart)<=0.01?"Réconcilié avec les comptes":"À corriger avant de projeter")+`</td>`
    +`<td class="reelc num" style="color:${coulEc}"><b>${Math.abs(ecart)<=0.01?"0":fmt(ecart)}</b></td>`+det.map(()=>`<td></td>`).join("")+`</tr>`;

  return `<div class="gbar"><span class="gt">Chiffre d'affaires — volumes &times; prix</span>`
    +`<span class="mut">volumes en unités &middot; prix en FCFA &middot; chiffre d'affaires en ${u.suf}</span>`
    +`<span class="push"></span>`
    +(Math.abs(ecart)>0.01?`<button class="btn sm" onclick="hRevCaler()" title="Répartit le chiffre d'affaires comptable au prorata des lignes">Caler sur les comptes</button>`:"")
    +`<button class="btn sm primary" onclick="hRevAdd()">+ Ligne de revenus</button></div>`
    +`<div class="gwrap"><div class="gscroll"><table class="gtab"><thead><tr>`
    +`<th class="l gc1">Ligne de revenus</th><th class="l gc2">Projection</th>`
    +`<th class="reelc" style="min-width:120px">${libFY(a1)} <span style="font-weight:400">réel</span></th>`
    +AP.map(a=>`<th style="min-width:112px">${libFY(a,true)}</th>`).join("")
    +`</tr></thead><tbody>${corps}${totaux}</tbody></table></div>`
    +`<div class="gfoot"><span><b>Le prix moyen n'est presque jamais connu : il se déduit.</b> `
    +`Saisissez la quantité réellement vendue en ${libFY(a1)} et le chiffre d'affaires comptable de la ligne — le prix moyen tombe tout seul, `
    +`et sert de base à la projection. Basculez sur <b>volume × prix</b> si vous connaissez votre tarif et préférez que le chiffre d'affaires en découle. `
    +`Volume et prix se projettent séparément : c'est le point du mode, un plan qui gagne 10 % de volume ne dit pas la même chose qu'un plan qui augmente ses prix de 10 %. `
    +`Les colonnes affichent le scénario <b>central</b> ; la dérive de scénario s'applique par-dessus.</span></div></div>`;
}
/* =====================================================================
   HYPOTHÈSES DU BUSINESS PLAN (dossier AVEC historique)
   L'écran empilait trois cartes dont le rangement ne suivait aucune
   logique : la fiscalité était rangée dans « Activité et marges », les
   INVESTISSEMENTS étaient collés à la fin de la carte « Besoin en fonds
   de roulement », et quatre langages visuels cohabitaient. Surtout,
   aucune projection n'était visible : on saisissait un taux sans jamais
   voir ce qu'il produisait.
   Il reprend donc la structure de l'onglet Modèle : des sous-onglets,
   une grille par sujet, une COLONNE PAR EXERCICE, et la colonne du
   dernier exercice RÉEL comme ancre à gauche des projections.
   ===================================================================== */
const BPH_ONGLETS=[["ca","Chiffre d'affaires"],["marge","Coûts et marges"],["fg","Frais généraux"],
  ["capex","Investissements"],["bfr","BFR"],["fin","Financement"],["fisc","Fiscalité"]];
function hBPH(t){SOUS_BPH=t;rendre();}

/* en-tête commun : libellé, règle de projection, exercice réel, puis les exercices projetés */
function bphHead(lib1,lib2,a1,AP){
  return `<tr><th class="l gc1">${lib1}</th><th class="l gc2">${lib2}</th>`
    +`<th class="reelc" style="min-width:118px">${libFY(a1)} <span style="font-weight:400">réel</span></th>`
    +AP.map(a=>`<th style="width:124px;min-width:124px">${libFY(a,true)}</th>`).join("")+`</tr>`;
}
function bphWrap(titre,soustitre,head,corps,note,actions){
  return `<div class="gbar"><span class="gt">${titre}</span><span class="mut">${soustitre}</span>`
    +(actions?`<span class="push"></span>${actions}`:"")+`</div>`
    +`<div class="gwrap"><div class="gscroll"><table class="gtab"><thead>${head}</thead><tbody>${corps}</tbody></table></div>`
    +(note?`<div class="gfoot"><span>${note}</span></div>`:"")+`</div>`;
}
/* cellules : m = montant dans l'unité d'affichage, n = nombre brut */
const bphM=(v,cls)=>`<span class="gcell gcalc num"${cls?` style="${cls}"`:""}>${fmt(v)}</span>`;
const bphVide=()=>`<td class="reelc"></td>`;
/* Nombre affiche dans un champ de saisie : separateur decimal FRANCAIS. « 12.3 » dans une
   application en francais se lit mal — et se lit surtout comme autre chose qu'un taux.
   numFR() accepte les deux a la ressaisie, l'aller-retour est donc sur. */
function nFR(x,d){
  var n=+x||0, s=(d==null)?String(n):n.toFixed(d);
  if(s.indexOf('.')>=0) s=s.replace(/\.?0+$/,'');
  return s.replace('.',',');
}
/* champ de saisie compact posé dans la colonne « Règle » */
const bphIn=(val,fn,suf,w,amt)=>`<input style="width:${w||46}px" value="${amt?mAmt(val):((typeof val==="number")?nFR(val):val)}"${amt?' oninput="mSep(this)"':""} onchange="${fn}">${suf?` ${suf}`:""}`;

function vueBPHyp(H,P){
  const A0=ETATS.annees,a1=A0[A0.length-1],v=ETATS.v;
  const AP=P.annees,N=AP.length,u=uni();
  const IDX=Array.from({length:N},(_,i)=>i);
  const nCols=N+3;
  if(BPH_ONGLETS.every(t=>t[0]!==SOUS_BPH))SOUS_BPH="ca";
  const barre=`<div class="row" style="margin:0 0 12px;flex-wrap:wrap;align-items:center">`
    +BPH_ONGLETS.map(([id,lab])=>`<button class="btn sm ${SOUS_BPH===id?"primary":""}" onclick="hBPH('${id}')">${lab}</button>`).join(" ")
    +`</div>`;

  /* ---------------- 1 · CHIFFRE D'AFFAIRES ---------------- */
  function ongletCA(){
    const volPrix=(H.caMode==="volumePrix");
    const methode=`<div class="gbar"><span class="gt">Chiffre d'affaires</span><span class="mut">la façon dont vous le projetez</span>`
      +`<span class="push"></span><span class="gseg">`
      +`<button class="${volPrix?"":"on"}" onclick="hCaMode('croissance')">Taux de croissance</button>`
      +`<button class="${volPrix?"on":""}" onclick="hCaMode('volumePrix')">Volumes &times; prix</button></span></div>`
      +`<div class="mut" style="margin:-4px 0 12px;max-width:96ch">${volPrix
        ? `Le chiffre d'affaires est reconstruit ligne par ligne à partir des <b>quantités vendues</b> et du <b>prix moyen</b> du dernier exercice réel, chacun projeté séparément. Les coûts directs restent un pourcentage du chiffre d'affaires ainsi obtenu.`
        : `Le chiffre d'affaires du dernier exercice réel est reconduit avec un taux par année. Simple, mais il mélange effet volume et effet prix : passez en <b>volumes &times; prix</b> si votre activité se pilote en quantités (tonnes, élèves, chambres, abonnés…) ou si un prêteur va challenger vos hypothèses de tarif.`}</div>`;
    if(volPrix) return methode+tableRevenusBP(H);
    /* mode taux de croissance : une grille, taux saisi et CA qui en découle */
    const corps=`<tr><td class="l gc1">Taux de croissance <span class="mut">&middot; % par an</span></td><td class="l gc2 mut">appliqué au chiffre d'affaires de l'année précédente</td>`
      +`<td class="reelc"></td>`
      +IDX.map(i=>`<td><span class="gpair"><input class="gcell gin num" value="${nFR((H.caCroiss[i]||0)*100,1)}" onchange="hBPa('caCroiss',${i},this.value,100)"><span class="gsuf">%</span></span></td>`).join("")+`</tr>`
      +`<tr class="gtot"><td class="l gc1">Chiffre d'affaires</td><td class="gc2"></td>`
      +`<td class="reelc num">${fmt(v.CA[a1])}</td>`
      +AP.map(a=>`<td class="num v">${fmt(P.pl.CA[a])}</td>`).join("")+`</tr>`;
    return methode+bphWrap("Croissance par exercice","en % — le chiffre d'affaires projeté apparaît dessous, en "+u.suf,
      bphHead("Hypothèse","Portée",a1,AP),corps,
      `Le taux s'applique en cascade : chaque exercice part du précédent. La <b>dérive de scénario</b> (prudent / optimiste) s'ajoute par-dessus et n'apparaît donc pas dans la ligne saisie.`);
  }

  /* ---------------- 2 · COÛTS ET MARGES ---------------- */
  function ongletMarge(){
    const pc=(a,x)=>P.pl.CA[a]?`<span class="gcell gcalc num">${(x/P.pl.CA[a]*100).toFixed(1).replace(".",",")} %</span>`:`<span class="gcell gcalc num">&ndash;</span>`;
    const pcH=x=>v.CA[a1]?`<span class="gcell gcalc num">${(x/v.CA[a1]*100).toFixed(1).replace(".",",")} %</span>`:"";
    const corps=
      `<tr class="grp"><td class="l gc1">Chiffre d'affaires</td><td class="gc2 mut">onglet précédent</td>`
        +`<td class="reelc num">${fmt(v.CA[a1])}</td>`+AP.map(a=>`<td class="num">${fmt(P.pl.CA[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Coûts directs</td>`
        +`<td class="l gc2"><span class="gfx">${bphIn(+(H.coutsDirects_pct*100).toFixed(2),"hBP('coutsDirects_pct',this.value,100)","% du chiffre d'affaires",52)}</span></td>`
        +`<td class="reelc num">${fmt(v.COUTS_DIRECTS[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.COUTS_DIRECTS[a])}</td>`).join("")+`</tr>`
      +`<tr class="gres"><td class="l gc1"><div class="gdrv"><span class="gop eq">=</span> Marge brute</div></td><td class="gc2"></td>`
        +`<td class="reelc num">${fmt(v.MARGE_BRUTE[a1])}</td>`
        +AP.map(a=>`<td class="num">${fmt(P.pl.MARGE_BRUTE[a])}</td>`).join("")+`</tr>`
      +`<tr class="gres" style="font-style:italic"><td class="l gc1"><span class="mut" style="padding-left:16px">en % du chiffre d'affaires</span></td><td class="gc2"></td>`
        +`<td class="reelc">${pcH(v.MARGE_BRUTE[a1])}</td>`+AP.map(a=>`<td>${pc(a,P.pl.MARGE_BRUTE[a])}</td>`).join("")+`</tr>`
      +`<tr class="grp"><td class="l gc1">Charges d'exploitation</td><td class="gc2"></td><td class="reelc"></td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Charges de personnel</td>`
        +`<td class="l gc2"><span class="gfx">croissance ${bphIn(+(H.personnel_croiss*100).toFixed(1),"hBP('personnel_croiss',this.value,100)","%/an")}</span></td>`
        +`<td class="reelc num">${fmt(v.CHARGES_PERSONNEL[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.CHARGES_PERSONNEL[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Frais généraux</td>`
        +`<td class="l gc2"><span class="mut">ligne par ligne &middot; <a href="#" onclick="hBPH('fg');return false;" style="color:var(--pri)">onglet Frais généraux</a></span></td>`
        +`<td class="reelc num">${fmt(v.OPEX[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.OPEX_TOTAL[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Autres produits et subventions</td>`
        +`<td class="l gc2"><span class="gfx">an 1 : ${bphIn(Math.round(H.autresProd_montant*u.f*100)/100,`hBP('autresProd_montant',this.value,${u.f})`,u.lib,70,true)} puis ${bphIn(+(H.autresProd_croiss*100).toFixed(1),"hBP('autresProd_croiss',this.value,100)","%/an")}</span></td>`
        +`<td class="reelc num">${fmt(v.AUTRES_PROD[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.AUTRES_PROD[a])}</td>`).join("")+`</tr>`
      +`<tr class="gtot"><td class="l gc1">EBITDA</td><td class="gc2"></td>`
        +`<td class="reelc num">${fmt(v.EBITDA[a1])}</td>`
        +AP.map(a=>`<td class="num v">${fmt(P.pl.EBITDA[a])}</td>`).join("")+`</tr>`
      +`<tr class="gres" style="font-style:italic"><td class="l gc1"><span class="mut" style="padding-left:16px">en % du chiffre d'affaires</span></td><td class="gc2"></td>`
        +`<td class="reelc">${pcH(v.EBITDA[a1])}</td>`+AP.map(a=>`<td>${pc(a,P.pl.EBITDA[a])}</td>`).join("")+`</tr>`;
    return bphWrap("Coûts et marges","charges d'exploitation &middot; en "+u.suf,bphHead("Poste","Règle de projection",a1,AP),corps,
      `Les charges sont affichées <b>au signe du compte de résultat</b> (négatives), pour se recouper directement avec le P&amp;L prévisionnel. La colonne <b>${libFY(a1)} réel</b> vient des états financiers : c'est le point de départ que vos règles font évoluer.`);
  }

  /* ---------------- 3 · FRAIS GÉNÉRAUX ---------------- */
  function ongletFG(){
    const OD=P.pl.OPEX_DETAIL||{};
    const lignes=H.opex.filter(o=>o.base>0||o.pct>0);
    const sel=o=>`<select class="gsel" onchange="hOpex('${o.code}','mode',this.value)">`
      +`<option value="inflation"${o.mode==="inflation"?" selected":""}>inflation</option>`
      +`<option value="pctCA"${o.mode==="pctCA"?" selected":""}>% du CA</option>`
      +`<option value="croissance"${o.mode==="croissance"?" selected":""}>croissance propre</option></select>`;
    const regle=o=>`<span class="gfx">${sel(o)}`
      +(o.mode==="pctCA"?` ${bphIn(+(o.pct*100).toFixed(2),`hOpex('${o.code}','pct',this.value,100)`,"% du CA",52)}`
       :o.mode==="croissance"?` ${bphIn(+(o.croiss*100).toFixed(1),`hOpex('${o.code}','croiss',this.value,100)`,"%/an")}`
       :` <span class="mut">${+((H.inflation||0.03)*100).toFixed(1)} %/an</span>`)+`</span>`;
    const corps=(lignes.length?lignes.map(o=>
      `<tr><td class="l gc1">${esc(o.lib)}</td><td class="l gc2">${regle(o)}</td>`
      +`<td class="reelc num">${fmt(-o.base)}</td>`
      +AP.map(a=>`<td>${bphM(OD[o.code]?OD[o.code].vals[a]:0)}</td>`).join("")+`</tr>`).join("")
      :`<tr><td class="l gc1" colspan="${nCols}" style="color:var(--muted)">Aucun poste de frais généraux dans l'historique.</td></tr>`)
      +`<tr class="gtot"><td class="l gc1">Total des frais généraux</td><td class="gc2"></td>`
      +`<td class="reelc num">${fmt(v.OPEX[a1])}</td>`
      +AP.map(a=>`<td class="num v">${fmt(P.pl.OPEX_TOTAL[a])}</td>`).join("")+`</tr>`;
    const actions=`<span class="gfx">inflation par défaut ${bphIn(+((H.inflation||0.03)*100).toFixed(1),"hBP('inflation',this.value,100)","%/an")}</span>`;
    return bphWrap("Frais généraux","poste par poste &middot; en "+u.suf,bphHead("Poste","Règle de projection",a1,AP),corps,
      `Chaque poste suit par défaut le <b>taux d'inflation</b> appliqué à sa base réelle. Passez-le en <b>% du chiffre d'affaires</b> s'il varie avec l'activité (commissions, transport sur ventes), ou donnez-lui une <b>croissance propre</b> si vous connaissez son évolution (un bail indexé, un contrat renégocié).`,actions);
  }

  /* ---------------- 4 · INVESTISSEMENTS ---------------- */
  function ongletCapex(){
    const brutH=Math.max(v.ACTIFS_IMMOBILISES[a1]-v.AMORT_DEPREC[a1],0), amcH=-v.AMORT_DEPREC[a1];
    const t1=`<tr><td class="l gc1">Investissements de l'exercice</td><td class="l gc2 mut">saisis exercice par exercice</td>`
      +`<td class="reelc"></td>`
      +IDX.map(i=>`<td><input class="gcell gin num" value="${mAmt(Math.round((H.capex[i]||0)*u.f*100)/100)}" oninput="mSep(this)" onchange="hBPa('capex',${i},this.value,${u.f})"></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Dotation aux amortissements</td>`
      +`<td class="l gc2"><span class="gfx">${bphIn(+(H.amort_taux*100).toFixed(2),"hBP('amort_taux',this.value,100)","% des immobilisations brutes",52)}</span></td>`
      +`<td class="reelc num">${fmt(v.DA[a1])}</td>`
      +AP.map(a=>`<td>${bphM(P.pl.DA[a])}</td>`).join("")+`</tr>`;
    /* variation de la valeur nette comptable : la clôture d'un exercice ouvre le suivant */
    const ouv=a=>{const i=AP.indexOf(a);return i===0?(brutH-amcH):P.bs.IMMO_NET[AP[i-1]];};
    const t2=`<tr><td class="l gc1"><b>Solde d'ouverture</b></td><td class="l gc2 mut">valeur nette à la clôture précédente</td>`
      +`<td class="reelc"></td>`
      +AP.map(a=>`<td>${bphM(ouv(a))}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1"><div class="gdrv"><span class="gop">+</span> Investissements de l'exercice</div></td><td class="gc2"></td><td class="reelc"></td>`
      +IDX.map(i=>`<td>${bphM(H.capex[i]||0,"color:#16904E")}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1"><div class="gdrv"><span class="gop">&minus;</span> Dotations aux amortissements</div></td><td class="gc2"></td><td class="reelc"></td>`
      +AP.map(a=>`<td>${bphM(-P.pl.DA[a],"color:#c0392b")}</td>`).join("")+`</tr>`
      +`<tr class="gtot"><td class="l gc1">Valeur nette comptable à la clôture</td><td class="gc2 mut">ouvre l'exercice suivant</td>`
      +`<td class="reelc num">${fmt(brutH-amcH)}</td>`
      +AP.map(a=>`<td class="num v">${fmt(P.bs.IMMO_NET[a])}</td>`).join("")+`</tr>`;
    return bphWrap("1 &middot; Investissements et amortissements","CAPEX et dotation &middot; en "+u.suf,
        bphHead("Poste","Règle de projection",a1,AP),t1,
        `Le taux d'amortissement s'applique aux <b>immobilisations brutes</b> (valeur nette + amortissements cumulés), et la dotation est plafonnée par la valeur restant à amortir. C'est un taux <b>moyen de parc</b> : il ne distingue pas les durées d'usage par catégorie.`)
      +`<div style="height:18px"></div>`
      +bphWrap("2 &middot; Valeur nette comptable","tableau de variation &middot; en "+u.suf,
        bphHead("","",a1,AP),t2,
        `<b>Solde d'ouverture + investissements &minus; dotations = valeur nette de clôture</b>, qui devient le solde d'ouverture de l'exercice suivant. La colonne <b>${libFY(a1)} réel</b> reprend la valeur nette du bilan historique.`);
  }

  /* ---------------- 5 · BFR ---------------- */
  function ongletBfr(){
    const bfrH=v.CLIENTS[a1]+v.STOCKS[a1]+v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1]
      +v.FOURNISSEURS[a1]+v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1]
      +v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_ACTIF[a1]+v.HAO_PASSIF[a1];
    const jrs=(a)=>P.pl.CA[a]?`<span class="gcell gcalc num">${Math.round(P.bs.BFR[a]/P.pl.CA[a]*360)} j</span>`:"";
    const corps=
      `<tr class="grp"><td class="l gc1">Actif circulant</td><td class="gc2"></td><td class="reelc"></td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Créances clients</td>`
        +`<td class="l gc2"><span class="gfx">DSO ${bphIn(Math.round(H.dso),"hBP('dso',this.value,1)","jours de CA TTC")}</span></td>`
        +`<td class="reelc num">${fmt(v.CLIENTS[a1])}</td>`+AP.map(a=>`<td>${bphM(P.bs.CLIENTS[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Stocks</td>`
        +`<td class="l gc2"><span class="gfx">DIO ${bphIn(Math.round(H.dio),"hBP('dio',this.value,1)","jours de coûts HT")}</span></td>`
        +`<td class="reelc num">${fmt(v.STOCKS[a1])}</td>`+AP.map(a=>`<td>${bphM(P.bs.STOCKS[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Autres créances <span class="mut">&middot; hors exploitation</span></td>`
        +`<td class="l gc2"><span class="gfx">figées à ${bphIn(Math.round(H.autresCreances_fixe*u.f*100)/100,`hBP('autresCreances_fixe',this.value,${u.f})`,u.lib,70,true)}</span></td>`
        +`<td class="reelc num">${fmt(v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1]+v.HAO_ACTIF[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.bs.AUTRES_CREANCES[a])}</td>`).join("")+`</tr>`
      +`<tr class="grp"><td class="l gc1">Passif circulant</td><td class="gc2"></td><td class="reelc"></td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Dettes fournisseurs</td>`
        +`<td class="l gc2"><span class="gfx">DPO ${bphIn(Math.round(H.dpo),"hBP('dpo',this.value,1)","jours d'achats TTC")}</span></td>`
        +`<td class="reelc num">${fmt(v.FOURNISSEURS[a1])}</td>`+AP.map(a=>`<td>${bphM(P.bs.FOURNISSEURS[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Dettes fiscales et sociales</td>`
        +`<td class="l gc2"><span class="gfx">${bphIn(+(H.dettesFiscSoc_pct*100).toFixed(2),"hBP('dettesFiscSoc_pct',this.value,100)","% du chiffre d'affaires",52)}</span></td>`
        +`<td class="reelc num">${fmt(v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.bs.DETTES_FISC_SOC[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Autres dettes <span class="mut">&middot; hors exploitation</span></td>`
        +`<td class="l gc2"><span class="gfx">figées à ${bphIn(Math.round(H.autresDettes_fixe*u.f*100)/100,`hBP('autresDettes_fixe',this.value,${u.f})`,u.lib,70,true)}</span></td>`
        +`<td class="reelc num">${fmt(v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_PASSIF[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.bs.AUTRES_DETTES[a])}</td>`).join("")+`</tr>`
      +`<tr class="gtot"><td class="l gc1">Besoin en fonds de roulement</td><td class="gc2"></td>`
        +`<td class="reelc num">${fmt(bfrH)}</td>`+AP.map(a=>`<td class="num v">${fmt(P.bs.BFR[a])}</td>`).join("")+`</tr>`
      +`<tr class="gres" style="font-style:italic"><td class="l gc1"><span class="mut" style="padding-left:16px">en jours de chiffre d'affaires</span></td><td class="gc2"></td>`
        +`<td class="reelc">${v.CA[a1]?`<span class="gcell gcalc num">${Math.round(bfrH/v.CA[a1]*360)} j</span>`:""}</td>`
        +AP.map(a=>`<td>${jrs(a)}</td>`).join("")+`</tr>`;
    return bphWrap("Besoin en fonds de roulement","délais d'exploitation &middot; en "+u.suf,bphHead("Poste du bilan","Règle de projection",a1,AP),corps,
      `<b>DSO</b> (jours de crédit client) et <b>DPO</b> (jours de crédit fournisseur) s'expriment en jours de flux <b>TTC</b>, comme les ratios de l'analyse ; le <b>DIO</b> (rotation des stocks) est en jours de coûts HT, les stocks étant valorisés au coût. Les postes <b>hors exploitation</b> sont figés : un business plan projette le cycle d'exploitation, pas le résiduel que l'activité ne pilote pas.`);
  }

  /* ---------------- 6 · FINANCEMENT ---------------- */
  function ongletFin(){
    const detteH=-v.DETTES_FINANCIERES[a1];
    const corps=
      `<tr class="grp"><td class="l gc1">Dette existante</td><td class="gc2 mut">celle du bilan de clôture</td>`
        +`<td class="reelc num">${fmt(detteH)}</td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Remboursements</td>`
        +`<td class="l gc2"><span class="gfx">amortie sur ${bphIn(H.dette_dureeResiduelle,"hBP('dette_dureeResiduelle',this.value,1)","ans")} &middot; taux ${bphIn(+(H.dette_taux*100).toFixed(2),"hBP('dette_taux',this.value,100)","%",44)}</span></td>`
        +`<td class="reelc"></td>`+AP.map(a=>`<td>${bphM(-P.dette[a].remboursement,"color:#c0392b")}</td>`).join("")+`</tr>`
      +`<tr class="grp"><td class="l gc1">Nouveaux emprunts</td><td class="gc2"></td><td class="reelc"></td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Montant tiré dans l'exercice</td>`
        +`<td class="l gc2"><span class="gfx">taux ${bphIn(+(H.emprunt_taux*100).toFixed(2),"hBP('emprunt_taux',this.value,100)","%",44)} &middot; sur ${bphIn(H.emprunt_duree,"hBP('emprunt_duree',this.value,1)","ans")}</span></td>`
        +`<td class="reelc"></td>`
        +IDX.map(i=>`<td><input class="gcell gin num" value="${mAmt(Math.round((H.nouveauxEmprunts[i]||0)*u.f*100)/100)}" oninput="mSep(this)" onchange="hBPa('nouveauxEmprunts',${i},this.value,${u.f})"></td>`).join("")+`</tr>`
      +`<tr class="gres"><td class="l gc1"><div class="gdrv"><span class="gop eq">=</span> Encours de dette à la clôture</div></td><td class="gc2"></td>`
        +`<td class="reelc num">${fmt(detteH)}</td>`+AP.map(a=>`<td class="num">${fmt(P.bs.DETTE[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Charges d'intérêts</td><td class="gc2 mut">dette et découvert</td>`
        +`<td class="reelc num">${fmt(v.RESULTAT_FIN[a1]<0?v.RESULTAT_FIN[a1]:0)}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.FRAIS_FIN[a])}</td>`).join("")+`</tr>`
      +`<tr class="grp"><td class="l gc1">Trésorerie et découvert</td><td class="gc2"></td><td class="reelc"></td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Découvert / ligne court terme tirée</td>`
        +`<td class="l gc2"><span class="gfx">plancher ${bphIn(Math.round((H.seuilCash||0)*u.f*100)/100,`hBP('seuilCash',this.value,${u.f})`,u.lib,70,true)} &middot; taux ${bphIn(+((H.decouvert_taux||0.12)*100).toFixed(2),"hBP('decouvert_taux',this.value,100)","%",44)}</span></td>`
        +`<td class="reelc"></td>`+AP.map(a=>`<td>${bphM(P.bs.LIGNE_CT[a],P.bs.LIGNE_CT[a]>0.5?"color:#c0392b":"")}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Produits financiers</td>`
        +`<td class="l gc2"><span class="gfx">${bphIn(Math.round(H.produitsFin_montant*u.f*100)/100,`hBP('produitsFin_montant',this.value,${u.f})`,u.lib+"/an",70,true)}</span></td>`
        +`<td class="reelc num">${fmt(v.RESULTAT_FIN[a1]>0?v.RESULTAT_FIN[a1]:0)}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.PRODUITS_FIN[a])}</td>`).join("")+`</tr>`
      +`<tr class="gtot"><td class="l gc1">Trésorerie nette à la clôture</td><td class="gc2"></td>`
        +`<td class="reelc num">${fmt(v.TRESORERIE_NETTE[a1])}</td>`
        +AP.map(a=>`<td class="num" style="color:${P.bs.TRESO[a]<0?"#c0392b":"var(--green)"};font-weight:750">${fmt(P.bs.TRESO[a])}</td>`).join("")+`</tr>`
      +`<tr class="grp"><td class="l gc1">Distribution aux associés</td><td class="gc2"></td><td class="reelc"></td>`+AP.map(()=>`<td></td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Dividendes versés</td>`
        +`<td class="l gc2"><span class="gfx">${bphIn(+(H.dividendes_payout*100).toFixed(1),"hBP('dividendes_payout',this.value,100)","% du résultat net N&minus;1",44)}</span></td>`
        +`<td class="reelc"></td>`+AP.map(a=>`<td>${bphM(P.tft[a].FN)}</td>`).join("")+`</tr>`;
    return bphWrap("Financement","dette, trésorerie et distribution &middot; en "+u.suf,bphHead("Poste","Règle de projection",a1,AP),corps,
      `Le <b>découvert</b> se tire tout seul dès que la trésorerie passe sous le plancher, et se rembourse dès qu'elle repasse au-dessus : il n'y a rien à saisir, c'est la variable de bouclage. Une ligne rouge signale les exercices où le plan ne tient que par ce découvert — c'est le premier point qu'un prêteur regardera.`);
  }

  /* ---------------- 7 · FISCALITÉ ---------------- */
  function ongletFisc(){
    const tef=a=>P.pl.EBT[a]>0?`<span class="gcell gcalc num">${(-P.pl.IS[a]/P.pl.EBT[a]*100).toFixed(1).replace(".",",")} %</span>`:`<span class="gcell gcalc num">&ndash;</span>`;
    const corps=
      `<tr><td class="l gc1">Résultat avant impôt</td><td class="gc2 mut">après charges financières</td>`
        +`<td class="reelc num">${fmt(v.EBIT[a1]+v.RESULTAT_FIN[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.EBT[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Déficits reportables imputables</td>`
        +`<td class="l gc2"><span class="gfx">stock ${bphIn(Math.round((H.reportDeficitaire||0)*u.f*100)/100,`hBP('reportDeficitaire',this.value,${u.f})`,u.lib,70,true)} &middot; report ${bphIn(H.reportDef_horizon||3,"hBP('reportDef_horizon',this.value,1)","ans")}</span></td>`
        +`<td class="reelc"></td>`
        +AP.map(a=>`<td>${bphM(P.pl.REPORT_DEF?(P.pl.REPORT_DEF[a]||0):0)}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Impôt sur les sociétés</td>`
        +`<td class="l gc2"><span class="gfx">${bphIn(+(H.is_taux*100).toFixed(2),"hBP('is_taux',this.value,100)","% du bénéfice imposable",52)}</span></td>`
        +`<td class="reelc num">${fmt(v.IMPOTS[a1])}</td>`
        +AP.map(a=>`<td>${bphM(P.pl.IS[a])}</td>`).join("")+`</tr>`
      +`<tr><td class="l gc1">Impôt minimum forfaitaire <span class="mut">&middot; plancher</span></td>`
        +`<td class="l gc2"><span class="gfx">${bphIn(+((H.imf_taux!==undefined?H.imf_taux:0.005)*100).toFixed(3),"hBP('imf_taux',this.value,100)","% du chiffre d'affaires",52)}</span></td>`
        +`<td class="reelc"></td>`
        +AP.map(a=>`<td>${bphM(-(H.imf_taux||0)*P.pl.CA[a])}</td>`).join("")+`</tr>`
      +`<tr class="gres" style="font-style:italic"><td class="l gc1"><span class="mut" style="padding-left:16px">taux effectif d'imposition</span></td><td class="gc2"></td>`
        +`<td class="reelc"></td>`+AP.map(a=>`<td>${tef(a)}</td>`).join("")+`</tr>`
      +`<tr class="gtot"><td class="l gc1">Résultat net</td><td class="gc2"></td>`
        +`<td class="reelc num">${fmt(v.RESULTAT_NET[a1])}</td>`
        +AP.map(a=>`<td class="num v">${fmt(P.pl.RN[a])}</td>`).join("")+`</tr>`;
    return bphWrap("Fiscalité","impôt et déficits reportables &middot; en "+u.suf,bphHead("Poste","Règle de projection",a1,AP),corps,
      `L'impôt retenu est le <b>plus élevé</b> des deux : l'IS sur le bénéfice imposable, ou l'<b>impôt minimum forfaitaire</b> assis sur le chiffre d'affaires — ce dernier est dû même en exercice déficitaire. Les <b>déficits reportables</b> s'imputent sur les bénéfices futurs et <b>périment</b> après le nombre d'exercices indiqué (3 ans dans l'espace UEMOA / OHADA).`);
  }

  const corps={ca:ongletCA,marge:ongletMarge,fg:ongletFG,capex:ongletCapex,
               bfr:ongletBfr,fin:ongletFin,fisc:ongletFisc}[SOUS_BPH]();
  return barre+corps;
}
/* postes de frais généraux (mêmes codes que bp.js OPEX_STD / moteur SERVICES_EXT) */
const BP_OPEX_STD=["AUTRES_ACHATS","SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT","IMPOTS_TAXES","AUTRES_CHARGES"];
const BP_SERVICES_EXT=["SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","AUTRES_SERV_EXT"];
/* détail (modale) des services extérieurs prévisionnels — chaque sous-poste modélisé séparément */
function detailBPServices(){
  const H=assurerBP(),P=projeterBP(ETATS,H),v=ETATS.v;
  const a1=ETATS.annees[ETATS.annees.length-1],AP=P.annees,OD=P.pl.OPEX_DETAIL||{};
  const th=`<th class="num">${libFY(a1)}</th>`+AP.map(a=>`<th class="num">${libFY(a,true)}</th>`).join("");
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
    if(det&&d.code==="CA"&&Object.keys(P.pl.CA_DETAIL||{}).length){
      /* Déplier le chiffre d'affaires par ligne de revenus. Vrai pour le modèle (ventes par
         produit) comme pour un dossier avec historique projeté en volumes x prix : dans les
         deux cas CA_DETAIL porte la même forme. La colonne historique reçoit le chiffre
         d'affaires réel affecté à la ligne — vide s'il n'est pas connu. */
      const CAD=P.pl.CA_DETAIL||{}, RVH=(!mm&&typeof assurerBP==="function")?(assurerBP().revenus||[]):[];
      Object.keys(CAD).forEach((c,ci)=>defs.push({lib:CAD[c].lib,st:"det",
        hist:mm?0:(RVH[ci]?(+RVH[ci].caHist||0):null),
        proj:a=>CAD[c].vals[a]||0}));
    }
    if(det&&mm&&d.code==="COUTS_DIRECTS"){
      /* modèle : tous les coûts directs (unifiés dans coutsDirects) dépliés par ligne de coût */
      const CDI=P.pl.CDIND_DETAIL||{};
      Object.keys(CDI).forEach(c=>defs.push({lib:CDI[c].lib,st:"det",hist:0,proj:a=>CDI[c].vals[a]||0}));
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
  return tableBP(P,defs,"Compte de résultat prévisionnel")+blocRatiosBPPl(P);
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
  /* mode projet avec situation d'ouverture : les « autres créances / dettes » portent les résidus déclarés */
  const mOuv=(typeof modeleMode==="function"&&modeleMode()&&(P.financement&&P.financement.ouverture&&(P.financement.ouverture.actif||P.financement.ouverture.passif)));
  const defs=[
    {lib:"Actifs immobilisés",st:"total",hist:v.ACTIFS_IMMOBILISES[a1],proj:a=>P.bs.IMMO_NET[a]},
    {lib:"Stocks",hist:v.STOCKS[a1],proj:a=>P.bs.STOCKS[a]},
    {lib:"Créances clients",hist:v.CLIENTS[a1],proj:a=>P.bs.CLIENTS[a]},
    {lib:mOuv?"Créances antérieures à recouvrer (ouverture)":"Autres créances",hist:hAutresCr,proj:a=>P.bs.AUTRES_CREANCES[a]},
    {lib:"Dettes fournisseurs",hist:v.FOURNISSEURS[a1],proj:a=>P.bs.FOURNISSEURS[a]},
    {lib:"Dettes fiscales",hist:v.DETTES_FISCALES[a1],proj:a=>P.bs.DETTES_FISC_SOC[a]*fiscFrac},
    {lib:"Dettes sociales",hist:v.DETTES_SOCIALES[a1],proj:a=>P.bs.DETTES_FISC_SOC[a]*socFrac},
    {lib:mOuv?"Dettes d'ouverture restant à régler":"Autres dettes",hist:v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_PASSIF[a1],proj:a=>P.bs.AUTRES_DETTES[a]},
    {lib:"Besoin en fonds de roulement global",st:"total",hist:v.BFR[a1],proj:a=>P.bs.BFR[a]},
    {lib:"Trésorerie active",hist:v.TRESO_ACTIF[a1],proj:a=>P.bs.TRESO_ACTIVE[a]},
    {lib:"Concours bancaires courants (découvert)",hist:v.TRESO_PASSIF[a1],proj:a=>-P.bs.LIGNE_CT[a]},
    {lib:"Trésorerie nette",st:"total",hist:v.TRESORERIE_NETTE[a1],proj:a=>P.bs.TRESO[a]},
    {lib:"Provisions pour risques et charges",hist:v.PROVISIONS_RC[a1],proj:a=>-P.bs.PROVISIONS[a]},
    {lib:"Dettes financières",hist:v.DETTES_FINANCIERES[a1],proj:a=>-P.bs.DETTE[a]},
    {lib:"Comptes courants d'associés",hist:0,proj:a=>-((P.bs.CCA&&P.bs.CCA[a])||0)},
    {lib:"Actif net",st:"titre",hist:hActifNet,proj:a=>P.bs.IMMO_NET[a]+P.bs.BFR[a]+P.bs.TRESO[a]-P.bs.PROVISIONS[a]-P.bs.DETTE[a]-((P.bs.CCA&&P.bs.CCA[a])||0)},
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
  `<div class="mut" style="margin-top:8px">Présentation en actif net, identique à la due diligence : Actifs immobilisés + BFR + trésorerie − provisions − dettes financières = Actif net = Capitaux propres (la trésorerie boucle le bilan). BFR d'exploitation projeté (stocks, clients, fournisseurs, dettes fiscales et sociales) ; autres créances et dettes hors exploitation (HAO inclus) figées à leur niveau historique.
  ${mOuv?"<b>Situation d'ouverture</b> : éléments déclarés par la direction, non audités et non exhaustifs — l'écart éventuel relève d'une garantie d'actif et de passif (cession de titres) ou d'un ajustement de prix au closing.":""}</div>`
  +blocRatiosBPBs(P);
}
function vueBPTft(P){
  const AP=P.annees, cg=AP.length>2;
  const lignes=TFT_DEF.map(([code,lib,st])=>{
    if(!code) return `<tr class="sec"><td colspan="${AP.length+1+(cg?1:0)}">${lib}</td></tr>`;
    const vals=AP.map(a=>P.tft[a][code]);
    return `<tr class="${st||""}"><td>${lib}</td>
      ${vals.map(v=>`<td class="num">${fmt(v)}</td>`).join("")}
      ${cg?`<td class="num delta">${cagrCell(vals,fpct)}</td>`:""}</tr>`;
  }).join("");
  return `<div class="card" style="padding:0">
    <div class="bande">${esc(DOSSIER.societe.toUpperCase())} — TFT prévisionnel (modèle officiel) · scénario ${P.scenario}</div>
    <div class="tscroll"><table class="tb etat fixe">${colsEtat(AP.length+(cg?1:0))}
    <tr><th>${uni().lib}</th>
    ${AP.map(a=>`<th class="num">${libFY(a,true)}</th>`).join("")}
    ${cg?'<th class="num delta">TCAM</th>':""}</tr>${lignes}</table></div></div>`
    +blocRatiosBPTft(P);
}
/* --- blocs de ratios sous les états prévisionnels ---------------------------------------
   Mêmes blocs que la due diligence (blocRatiosMarge / blocRatiosBilan / blocRatiosTFT), mais
   alimentés par la projection. Pour le bilan on réutilise RATIOS_META : les formules et les
   seuils sont donc strictement ceux de la due diligence, appliqués aux années projetées. */
function baseRatiosBP(P,a){
  const trA=(P.bs.TRESO_ACTIVE[a]!==undefined?P.bs.TRESO_ACTIVE[a]:Math.max(0,P.bs.TRESO[a]));
  const ct=P.bs.LIGNE_CT[a]||0;
  const dettesFin=P.bs.DETTE[a]+((P.bs.CCA&&P.bs.CCA[a])||0)+ct;
  const actifCirc=P.bs.STOCKS[a]+P.bs.CLIENTS[a]+P.bs.AUTRES_CREANCES[a]+trA;
  return {ca:P.pl.CA[a], mb:P.pl.MARGE_BRUTE[a], ebitda:P.pl.EBITDA[a], ebit:P.pl.EBIT[a], rn:P.pl.RN[a],
    cp:P.bs.CP[a], dettesFin:dettesFin, detteNette:dettesFin-trA, fraisFin:-(P.pl.FRAIS_FIN[a]||0),
    stocks:P.bs.STOCKS[a], clients:P.bs.CLIENTS[a], fournisseurs:-P.bs.FOURNISSEURS[a],
    achats:-P.pl.COUTS_DIRECTS[a], opex:-((P.pl.OPEX_TOTAL[a]||0)+(P.pl.CHARGES_PERSONNEL[a]||0)),
    bfr:P.bs.BFR[a], tresoActif:trA, actifCirc:actifCirc,
    passifCirc:-(P.bs.FOURNISSEURS[a]+P.bs.DETTES_FISC_SOC[a]+P.bs.AUTRES_DETTES[a])+ct,
    totalActif:P.bs.IMMO_NET[a]+actifCirc};
}
/* Axe des colonnes identique à tableBP : colonne historique (hors mode modèle) puis projections.
   L'année historique n'appartient pas à P : les accesseurs ci-dessous détectent la source. */
function bpAxes(P,sansHist){
  const h=!sansHist&&!(typeof modeleMode==="function"&&modeleMode());   /* colonne historique de tableBP */
  const a1=ETATS.annees[ETATS.annees.length-1];
  return {hist:h,a1:a1,
    annees:h?[a1].concat(P.annees):P.annees.slice(),
    libs:(h?[libFY(a1)]:[]).concat(P.annees.map(a=>libFY(a,true)))};
}
function bpSerie(ax,fn){const o={};ax.annees.forEach(a=>{const x=fn(a);o[a]=(x===null||x===undefined||!isFinite(x))?null:x;});return o;}
function blocRatiosBPPl(P){
  const ax=bpAxes(P),v=ETATS.v;
  /* agrégats du compte de résultat, projetés ou historiques selon la colonne */
  const b=a=>(P.pl.CA[a]===undefined)
    ?{ca:v.CA[a],mb:v.MARGE_BRUTE[a],ebitda:v.EBITDA[a],ebit:v.EBIT[a],rn:v.RESULTAT_NET[a],
      fg:v.FRAIS_GENERAUX[a],pers:v.CHARGES_PERSONNEL[a],ebt:v.RESULTAT_AVANT_IMPOT[a],is:v.IMPOTS[a]}
    :{ca:P.pl.CA[a],mb:P.pl.MARGE_BRUTE[a],ebitda:P.pl.EBITDA[a],ebit:P.pl.EBIT[a],rn:P.pl.RN[a],
      fg:(P.pl.OPEX_TOTAL[a]||0)+(P.pl.CHARGES_PERSONNEL[a]||0),pers:P.pl.CHARGES_PERSONNEL[a],
      ebt:P.pl.EBT[a],is:P.pl.IS[a]};
  const surCA=fn=>bpSerie(ax,a=>{const x=b(a);return x.ca?fn(x)/x.ca*100:null;});
  return blocRatios("Ratios du compte de résultat prévisionnel",[
    {lab:"Marge brute / CA",unit:"%",vals:surCA(x=>x.mb)},
    {lab:"Marge d'EBITDA",unit:"%",vals:surCA(x=>x.ebitda)},
    {lab:"Marge d'exploitation (EBIT)",unit:"%",vals:surCA(x=>x.ebit)},
    {lab:"Marge nette",unit:"%",vals:surCA(x=>x.rn)},
    {lab:"Frais généraux (overhead) / CA",unit:"%",vals:surCA(x=>-x.fg)},
    {lab:"Charges de personnel / CA",unit:"%",vals:surCA(x=>-x.pers)},
    {lab:"Croissance du chiffre d'affaires",unit:"%",vals:bpSerie(ax,a=>{
      const i=ax.annees.indexOf(a),p=i>0?b(ax.annees[i-1]).ca:null;return p?(b(a).ca/p-1)*100:null;})},
    {lab:"Taux d'impôt effectif",unit:"%",vals:bpSerie(ax,a=>{const x=b(a);return x.ebt>0?-x.is/x.ebt*100:null;})}],
    ax.annees,ax.libs);
}
function blocRatiosBPBs(P){
  if(typeof RATIOS_META==="undefined") return "";
  const ax=bpAxes(P);
  /* colonne historique : on reprend telle quelle la valeur calculée par la due diligence */
  let hist=null; if(!ax.mm){try{hist=calculerRatios(ETATS).ratios;}catch(e){hist=null;}}
  const items=RATIOS_META.filter(m=>["margeBrute","margeEbitda","margeNette"].indexOf(m.k)<0)
    .map(m=>({lab:m.lab,unit:m.unit,vals:bpSerie(ax,a=>{
      if(P.bs.CP[a]===undefined){const h=hist&&hist.filter(r=>r.k===m.k)[0];return h?h.vals[a]:null;}
      return m.calc(baseRatiosBP(P,a));})}));
  return blocRatios("Ratios prévisionnels de structure, rentabilité et liquidité",items,ax.annees,ax.libs);
}
function blocRatiosBPTft(P){
  const ax=bpAxes(P,true),v=ETATS.v;   /* le TFT prévisionnel n'a pas de colonne historique */
  /* flux projetés ou historiques ; l'historique n'a pas de TFT sur son premier exercice */
  const b=a=>{const pj=(P.tft[a]!==undefined),t=pj?P.tft[a]:(ETATS.tft&&ETATS.tft[a]);
    if(!t) return null;
    return {ca:pj?P.pl.CA[a]:v.CA[a], eb:pj?P.pl.EBITDA[a]:v.EBITDA[a],
      ch:pj?-((P.pl.COUTS_DIRECTS[a]||0)+(P.pl.OPEX_TOTAL[a]||0)+(P.pl.CHARGES_PERSONNEL[a]||0))
           :-((v.COUTS_DIRECTS[a]||0)+(v.OPEX[a]||0)+(v.CHARGES_PERSONNEL[a]||0)),
      fa:t.FA, zb:t.ZB, zc:t.ZC, inv:t.ACQUIS_IMMO, clot:pj?t.CLOTURE:t.ZG};};
  const pc=fn=>bpSerie(ax,a=>{const x=b(a);return (x&&x.ca)?fn(x)/x.ca*100:null;});
  return blocRatios("Ratios de flux et de trésorerie prévisionnels",[
    {lab:"Capacité d'autofinancement (CAFG) / CA",unit:"%",vals:pc(x=>x.fa)},
    {lab:"Conversion en cash (flux d'exploitation / EBITDA)",unit:"%",vals:bpSerie(ax,a=>{
      const x=b(a);
      /* un EBITDA proche de zéro rend le taux de conversion non significatif */
      if(!x||!(x.eb>0.02*Math.abs(x.ca||0))) return null;
      const c=x.zb/x.eb*100;return Math.abs(c)<=300?c:null;})},
    {lab:"Free cash flow / CA (exploitation + investissement)",unit:"%",vals:pc(x=>x.zb+x.zc)},
    {lab:"Investissements / CA",unit:"%",vals:pc(x=>-x.inv)},
    {lab:"Couverture des investissements (flux d'exploitation / CAPEX)",unit:"x",
     vals:bpSerie(ax,a=>{const x=b(a);return (x&&x.zc)?x.zb/Math.abs(x.zc):null;})},
    {lab:"Trésorerie de clôture (mois de charges d'exploitation)",unit:"mois",
     vals:bpSerie(ax,a=>{const x=b(a);return (x&&x.clot>0&&x.ch>0)?x.clot*12/x.ch:null;})}],
    ax.annees,ax.libs);
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
    ${AP.map(a=>`<th class="num">${libFY(a,true)}</th>`).join("")}</tr>${lignes}</table></div></div>
  <div class="mut" style="margin-top:8px">Dette existante amortie sur sa durée résiduelle ; chaque nouvel emprunt est amorti
  linéairement sur sa durée à partir de l'année suivant son tirage. Les dividendes versés apparaissent dans le TFT.</div>`;
}

/* ---------- Analyse : seuil de rentabilité, covenants, sensibilité ---------- */
/* Seuil de rentabilité + covenants — dépend UNIQUEMENT de la projection P (réutilisable modèle/historique) */
function analyseSeuilCov(P){
  const AP=P.annees,u=uni();
  const th=`<th>${u.lib}</th>${AP.map(a=>`<th class="num">${libFY(a,true)}</th>`).join("")}`;
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
    const detteFin=P.bs.DETTE[a]+((P.bs.CCA&&P.bs.CCA[a])||0)+(P.bs.LIGNE_CT[a]||0);
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
  const th=`<th>${u.lib}</th>${AP.map(a=>`<th class="num">${libFY(a,true)}</th>`).join("")}`;
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
    const detteFin=P.bs.DETTE[a]+((P.bs.CCA&&P.bs.CCA[a])||0)+(P.bs.LIGNE_CT[a]||0);
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
    /* En volumes x prix, caCroiss n'est plus lu par le moteur : muter cette clé donnerait
       une sensibilité NULLE, donc un tornado qui ment. Le levier porte alors sur le volume,
       là où se joue réellement la croissance d'activité. */
    {lib:(H.caMode==="volumePrix"?"Croissance annuelle des volumes":"Croissance annuelle du CA"),unit:"±3 pts",
     mut:(H2,s)=>{ if(H2.caMode==="volumePrix"){
         (H2.revenus||[]).forEach(Lg=>{ const o=Lg.volProj||(Lg.volProj={mode:"croissance",croiss:0,vals:[]});
           if(o.mode==="annuel") o.vals=(o.vals||[]).map((x,i)=>x*Math.pow(1+s*0.03,i+1));
           else o.croiss=(+o.croiss||0)+s*0.03; });
       } else H2.caCroiss=H.caCroiss.map(x=>x+s*0.03); }},
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
    ${rowScen("Chiffre d'affaires ("+libFY(aF,true)+")",c=>c.caF)}
    ${rowScen("EBITDA ("+libFY(aF,true)+")",c=>c.ebF)}
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
  const det=yrs.map(a=>(pr(a)?P.bs.DETTE[a]+((P.bs.CCA&&P.bs.CCA[a])||0)+(P.bs.LIGNE_CT[a]||0):-v.DETTES_FINANCIERES[a])*u.f);
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
    <span class="chip">Multiples ${Vh.multiplesComparables.central}x / ${Vh.multiplesTransactions.central}x — EBITDA de référence ${fmt(V.ebitdaRef)}${V.multOk?"":" · non significatif"}</span>
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
      ${AP.map(a=>`<th class="num">${libFY(a,true)}</th>`).join("")}</tr>
    ${lF.map(([k,lib])=>`<tr class="${k==="fcff"||k==="nopat"?"total":""}"><td>${lib}</td>
      ${AP.map(a=>`<td class="num">${fmt(V.detailFcff[a][k])}</td>`).join("")}</tr>`).join("")}
    <tr><td>Facteur d'actualisation</td>${AP.map((a,i)=>`<td class="num pctl">${(1/Math.pow(1+V.wacc,i+1)).toFixed(3)}</td>`).join("")}</tr>
    <tr class="total"><td>FCFF actualisés</td>${AP.map(a=>`<td class="num">${fmt(V.pv[a])}</td>`).join("")}</tr>
    </table></div></div>`;
  /* bridge */
  const evLbl=V.tvMode==="exit"?"Valeur terminale ("+(Vh.exitMultiple||0)+"× EBITDA terminal)":"Valeur terminale (g = "+pc(V.g)+")";
  const pontRows=[["Somme des FCFF actualisés",V.sommePv],[evLbl,V.vt],
     ["Valeur terminale actualisée",V.vtPv],["Valeur d'entreprise (EV)",V.ev],
     ["(–) Dette nette à la date de valorisation"+(V.dateValo==="ouverture"?" (situation d'ouverture)":" ("+ETATS.annees[ETATS.annees.length-1]+")"),-V.detteNette]];
  if(Math.abs(V.bridgeAjust)>0.5)pontRows.push(["± Ajustements du pont",V.bridgeAjust]);
  pontRows.push(["Valeur des fonds propres (DCF)",V.equityDcf]);
  /* rappel de méthode : la valeur d'entreprise est une valeur d'AUJOURD'HUI ; ajouter la
     trésorerie de fin de plan la compterait deux fois (elle est déjà dans les flux actualisés) */
  const noteDate=V.dateValo==="ouverture"
    ?"Dette nette prise à la date de valorisation (trésorerie déjà en caisse et emprunts déjà tirés) : la trésorerie générée par le plan est déjà contenue dans les flux actualisés, l'ajouter ici la compterait deux fois."
    :"Dette nette prise au dernier exercice réel, qui est la date de valorisation.";
  const bridge=`<div class="deux"><div class="card">
    <div class="sec-titre" style="margin-top:0">De la valeur d'entreprise à la valeur des fonds propres</div>
    <table class="tb">${pontRows.map(([l,x])=>{const tot=/entreprise|fonds propres/.test(l);return `<tr class="${tot?"total":""}"${/fonds propres/.test(l)?' style="font-weight:700"':""}><td>${l}</td><td class="num">${fmt(x)}</td></tr>`;}).join("")}</table>
    <div class="sec-titre">Pont — ajustements (hors dette nette)</div>
    ${(Vh.bridge||[]).map((x,i)=>`<div class="row" style="margin-bottom:6px">
       <input class="sel" style="flex:1" value="${esc(x.lib)}" onchange="majBridge(${i},'lib',this.value)">
       <input type="text" inputmode="decimal" class="nin large" value="${Math.round((x.montant||0)*u.f*100)/100}" step="any" onchange="majBridge(${i},'montant',this.value)">
       <span class="mut">${u.lib}</span><button class="btn sm" onclick="supBridge(${i})">✕</button></div>`).join("")}
    <button class="btn sm" onclick="ajBridge()">+ Ajouter un ajustement</button>
    <div class="mut" style="margin-top:6px">Ex. : − intérêts minoritaires, − provisions (retraite, litiges), + actifs hors exploitation. VT Gordon ${fmt(V.vtGordon)} · VT multiple de sortie ${fmt(V.vtExit)} ${u.suf}.</div>
    <div class="mut" style="margin-top:6px;font-style:italic">${noteDate}</div></div>
    <div class="card"><div class="sec-titre" style="margin-top:0">Sensibilité — WACC × ${V.tvMode==="exit"?"multiple de sortie":"croissance g"}</div>
    <table class="tb"><tr><th>${u.lib}</th>${(V.sensiAxes?V.sensiAxes.col:[-0.01,-0.005,0,0.005,0.01].map(dg=>V.g+dg)).map(cv=>`<th class="num">${V.tvMode==="exit"?(Math.round(cv*10)/10)+"×":"g "+pc(cv)}</th>`).join("")}</tr>
    ${V.sensi.map((ligne,i)=>{const dw=[-0.01,-0.005,0,0.005,0.01][i];
      return `<tr class="${dw===0?"total":""}"><td>WACC ${pc(V.wacc+dw)}</td>${ligne.map((x,j)=>`<td class="num" ${dw===0&&j===2?'style="font-weight:700"':""}>${fmt(x)}</td>`).join("")}</tr>`;}).join("")}
    </table></div></div>`;
  /* football field */
  const methLabels={dcf:"DCF",comp:"Mult. boursiers",trans:"Mult. transactions",ebit:"EV/EBIT",ca:"EV/CA",per:"PER",anr:"Actif net"};
  const horsJeu=V.methodes.filter(m=>!m.applicable);
  const poidsEd=`<div class="sec-titre">Pondération des méthodes (valeur retenue)</div>
    <div class="row" style="flex-wrap:wrap;gap:10px">${V.methodes.map(m=>`<span class="ctl-h" ${m.applicable?"":'style="opacity:.45" title="Méthode écartée : '+esc(m.motif||"")+'"'}><span class="mut" style="margin-right:4px">${methLabels[m.id]||m.id}</span><input type="text" inputmode="decimal" class="nin" style="width:48px" value="${V.poids[m.id]||0}" ${m.applicable?"":"disabled"} onchange="hValoM('poids','${m.id}',this.value,1)"><span class="mut">%</span></span>`).join("")}</div>
    ${horsJeu.length?`<div class="mut" style="margin-top:6px;font-style:italic">Méthode(s) écartée(s) de la valeur retenue : ${horsJeu.map(m=>(methLabels[m.id]||m.id)+" — "+esc(m.motif||"")).join(" · ")}. Leur poids est redistribué sur les méthodes applicables.</div>`:""}`;
  const ff=`<div class="card">
    <div class="sec-titre" style="margin-top:0">Synthèse des méthodes — fourchette de valorisation</div>
    <div style="height:${60+V.methodes.filter(m=>m.applicable).length*46}px"><canvas id="gFF"></canvas></div>
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
  /* seules les méthodes applicables figurent dans le football-field : une méthode écartée
     n'a pas de valeur à représenter (EBITDA de référence négatif, pas de bilan d'ouverture) */
  const MFF=V.methodes.filter(m=>m.applicable);
  const etiquettesFF={id:"etiquettesFF",afterDatasetsDraw(chart){
    const {ctx}=chart;
    const meta=chart.getDatasetMeta(0);
    ctx.save();
    ctx.font="600 11px Calibri, Arial";
    ctx.textBaseline="middle";
    meta.data.forEach((barre,i)=>{
      const m=MFF[i], y=barre.y;
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
    data:{labels:MFF.map(m=>m.lib),
      datasets:[
        {data:MFF.map(m=>[m.min*u.f,m.max*u.f]),backgroundColor:"#4a6fb5",borderRadius:4,barPercentage:0.55},
        {data:MFF.map(m=>[m.central*u.f*0.998,m.central*u.f*1.002]),backgroundColor:"#FA6706",barPercentage:0.75,grouped:false}
      ]},
    options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,
      layout:{padding:{left:70,right:70,top:14}},
      plugins:{legend:{display:false},
        tooltip:{enabled:true,displayColors:false,
          backgroundColor:"#172554",titleFont:{weight:"700"},
          callbacks:{
            title:items=>MFF[items[0].dataIndex].lib,
            label:item=>{
              const m=MFF[item.dataIndex];
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
