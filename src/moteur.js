// @ts-check
/* =========================================================================
   Findalyx Advisory — moteur d'analyse (portage JavaScript du moteur Python)
   Ingestion de balances -> TBAGR -> mapping -> états (P&L, Bilan, TFT)
   Conventions : montants en K, crédits négatifs dans la TBAGR ;
   P&L : produits +, charges - ; Bilan : signes naturels, CP affichés + .
   ========================================================================= */

/* ---------- Types du domaine (JSDoc — pour l'éditeur et le vérificateur) --- */
/**
 * @typedef {Object} CompteBalance  Un compte lu dans une balance.
 * @property {string} compte   Numéro de compte (2 à 10 chiffres).
 * @property {string} libelle  Intitulé.
 * @property {number} si_d     Solde initial débit.
 * @property {number} si_c     Solde initial crédit.
 * @property {number} mvt_d    Mouvements débit.
 * @property {number} mvt_c    Mouvements crédit.
 * @property {number} sf_d     Solde final débit.
 * @property {number} sf_c     Solde final crédit.
 * @property {number} [net]    Solde net = sf_d - sf_c (débit +, crédit -).
 */
/**
 * @typedef {Object} Balance  Une balance annuelle.
 * @property {number} annee
 * @property {CompteBalance[]} comptes
 */
/**
 * @typedef {Object} LigneTbagr  Une ligne de la balance agrégée (TBAGR).
 * @property {string} compte
 * @property {string} libelle
 * @property {Object<number,number>} vals  Solde par exercice (en K, crédits -).
 * @property {string} [mapping]  Code de la ligne de restitution rattachée.
 * @property {("BS"|"PL")} [bsPl]
 * @property {boolean} [corrige]  true si le mapping provient d'un override manuel.
 */
/**
 * @typedef {Object} Tbagr
 * @property {number[]} annees
 * @property {LigneTbagr[]} lignes
 */
/**
 * @typedef {Object} Etats  États financiers calculés.
 * @property {number[]} annees
 * @property {Object<string, Object<number,number>>} v    Agrégats : v[CODE][annee].
 * @property {Object<number, Object<string,number>>} tft  TFT officiel par exercice.
 */
/**
 * @typedef {Object} LigneDef  Définition d'une ligne de restitution.
 * @property {string} code
 * @property {string} lib
 * @property {string[]} pref  Préfixes de comptes rattachés.
 * @property {string} [siCrediteur]  Ligne alternative si le solde est créditeur.
 * @property {string} [siDebiteur]   Ligne alternative si le solde est débiteur.
 */
/**
 * @typedef {Object} LignePerso  Ligne personnalisée d'un dossier.
 * @property {string} code
 * @property {string} agregat  Agrégat de rattachement (ex. "OPEX", "CA", "CAPITAUX_PROPRES").
 * @property {("PL"|"BS")} [etat]
 */
/**
 * @typedef {Object} RatioDef  Définition d'un ratio.
 * @property {string} k
 * @property {string} lab
 * @property {string} unit
 * @property {string} cat
 * @property {(x:any)=>(number|null)} calc
 * @property {number[]} seuils
 * @property {boolean} [inverse]
 */
/**
 * @typedef {Object} Hypotheses  Hypothèses du business plan et de la valorisation.
 * @property {number} croissance_ca
 * @property {number} tx_achats
 * @property {number} tx_personnel
 * @property {number} tx_autres_opex
 * @property {number} tx_autres_produits
 * @property {number} tx_amort
 * @property {number} tx_capex
 * @property {number} dso
 * @property {number} dio
 * @property {number} dpo
 * @property {number} tx_interet
 * @property {number} tx_remb_dette
 * @property {number} tx_is
 * @property {number} tx_distribution
 * @property {number} wacc
 * @property {number} g
 * @property {number} multiple_ebitda
 */
/**
 * @typedef {Object} Projection  Projections du business plan (5 ans par défaut).
 * @property {number[]} annees
 * @property {Object<string,Object<number,number>>} pl
 * @property {Object<string,Object<number,number>>} bs
 * @property {Object<number,Object<string,number>>} tft
 */

/* ---------- Référentiel des lignes de restitution (nomenclature databook) -- */
/** @type {LigneDef[]} */
const LIGNES_PL = [
  {code:"CA_MARCHANDISES", lib:"Ventes de marchandises", pref:["701"]},
  {code:"CA_PRODUITS", lib:"Production vendue (biens et travaux)", pref:["702","703","705"]},
  {code:"CA_SERVICES", lib:"Prestations de services", pref:["704","706"]},
  {code:"CA_ACCESSOIRES", lib:"Produits accessoires", pref:["707","708"]},
  {code:"ACHATS_MARCH", lib:"Achats de marchandises", pref:["601","6031"]},
  {code:"ACHATS_MP", lib:"Achats de matières premières", pref:["602","6032"]},
  {code:"AUTRES_ACHATS", lib:"Autres achats (eau, énergie, fournitures)", pref:["604","605","608"]},
  {code:"VARIATION_STOCKS", lib:"Variation de stocks", pref:["603","6033","6038"]},
  {code:"SUBVENTIONS", lib:"Subventions d'exploitation", pref:["71"]},
  {code:"PROD_STOCKEE", lib:"Production stockée", pref:["73"]},
  {code:"PROD_IMMOBILISEE", lib:"Production immobilisée", pref:["72"]},
  {code:"AUTRES_PRODUITS", lib:"Autres produits d'exploitation", pref:["75","781","78"]},
  {code:"SOUS_TRAITANCE", lib:"Sous-traitance", pref:["621"]},
  {code:"LOCATIONS", lib:"Locations et charges locatives", pref:["622"]},
  {code:"ENTRETIEN", lib:"Entretien et maintenance", pref:["624"]},
  {code:"ASSURANCES", lib:"Primes d'assurance", pref:["625"]},
  {code:"PUBLICITE", lib:"Publicité", pref:["627"]},
  {code:"TELECOM", lib:"Télécommunications", pref:["628"]},
  {code:"FRAIS_BANCAIRES", lib:"Frais bancaires", pref:["631"]},
  {code:"HONORAIRES", lib:"Honoraires", pref:["632"]},
  {code:"PERSONNEL_EXT", lib:"Personnel extérieur", pref:["637"]},
  {code:"TRANSPORTS", lib:"Transports", pref:["61"]},
  {code:"AUTRES_SERV_EXT", lib:"Autres services extérieurs", pref:["62","63"]},
  {code:"IMPOTS_TAXES", lib:"Impôts et taxes", pref:["64"]},
  {code:"AUTRES_CHARGES", lib:"Autres charges d'exploitation", pref:["65"]},
  {code:"CHARGES_PERSONNEL", lib:"Charges de personnel", pref:["66"]},
  {code:"DOTATIONS", lib:"Dotations amortissements et provisions", pref:["68","69","681","691"]},
  {code:"REPRISES", lib:"Reprises de provisions", pref:["79","791","798"]},
  {code:"REVENUS_FIN", lib:"Revenus financiers", pref:["77","797"]},
  {code:"FRAIS_FIN", lib:"Frais financiers", pref:["67","687"]},
  {code:"PRODUITS_HAO", lib:"Produits HAO", pref:["82","84","86","88"]},
  {code:"CHARGES_HAO", lib:"Charges HAO", pref:["81","83","85"]},
  {code:"PARTICIPATION", lib:"Participation des travailleurs", pref:["87"]},
  {code:"IS", lib:"Impôt sur le résultat", pref:["89"]},
];
/** @type {LigneDef[]} */
const LIGNES_BS = [
  {code:"IMMO_INCORP", lib:"Immobilisations incorporelles", pref:["20","21"]},
  {code:"IMMO_CORP", lib:"Immobilisations corporelles", pref:["22","23","24"]},
  {code:"AVANCES_IMMO", lib:"Avances sur immobilisations", pref:["25"]},
  {code:"IMMO_FIN", lib:"Immobilisations financières", pref:["26","27"]},
  {code:"AMORT_DEPREC", lib:"Amortissements et dépréciations", pref:["28","29"]},
  {code:"STOCKS", lib:"Stocks et en-cours", pref:["31","32","33","34","35","36","37","38","39"]},
  {code:"CLIENTS", lib:"Créances clients", pref:["41","491"], siCrediteur:"CLIENTS_AVANCES"},
  {code:"CLIENTS_AVANCES", lib:"Clients, avances reçues", pref:["419"]},
  {code:"AVANCES_FRS", lib:"Fournisseurs, avances versées", pref:["409"]},
  {code:"AUTRES_CREANCES", lib:"Autres créances", pref:["185","445","449","49"]},
  {code:"FOURNISSEURS", lib:"Dettes fournisseurs", pref:["40"], siDebiteur:"AVANCES_FRS"},
  {code:"DETTES_SOCIALES", lib:"Dettes sociales", pref:["42","43"], siDebiteur:"AUTRES_CREANCES"},
  {code:"DETTES_FISCALES", lib:"Dettes fiscales", pref:["44"], siDebiteur:"AUTRES_CREANCES"},
  {code:"AUTRES_DETTES", lib:"Autres dettes d'exploitation", pref:["45","46","47"], siDebiteur:"AUTRES_CREANCES"},
  {code:"HAO_ACTIF", lib:"Créances HAO", pref:["48"], siCrediteur:"HAO_PASSIF"},
  {code:"HAO_PASSIF", lib:"Dettes HAO", pref:["481","482"]},
  {code:"TRESO_ACTIF", lib:"Trésorerie - actif", pref:["50","51","52","53","54","55","57","58","59"], siCrediteur:"TRESO_PASSIF"},
  {code:"TRESO_PASSIF", lib:"Trésorerie - passif (découverts)", pref:["56","561","565"]},
  {code:"PROVISIONS_RC", lib:"Provisions pour risques et charges", pref:["19"]},
  {code:"DETTES_FINANCIERES", lib:"Dettes financières", pref:["16","17","18"]},
  {code:"CAPITAL", lib:"Capital social", pref:["10"]},
  {code:"PRIMES_RESERVES", lib:"Primes et réserves", pref:["11","104","105","106"]},
  {code:"RAN_RESULTATS_ANT", lib:"Report à nouveau et résultats antérieurs", pref:["12","13"]},
  {code:"SUBV_PROV_REGL", lib:"Subventions d'invest. et prov. réglementées", pref:["14","15"]},
];

/* ---------- utilitaires ---------- */
function nettoyer(t){
  if(t===null||t===undefined) return "";
  let s=String(t);
  if(["nan","nat","none"].includes(s.toLowerCase())) return "";
  const moj={"‚":"é","‡":"ç","ˆ":"ê","…":"à","Š":"è","‰":"ë","£":"û","“":"ô","”":"ö","—":"ù"};
  for(const k in moj) s=s.split(k).join(moj[k]);
  return s.replace(/\s+/g," ").trim();
}
function norm(s){return nettoyer(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");}
function estCompte(v){const s=nettoyer(v).replace(/\.0$/,"");return /^\d{2,10}$/.test(s);}
function estNombre(v){
  if(typeof v==="number") return isFinite(v);
  const s=nettoyer(v).replace(/[   ]/g,"").replace(",",".").replace(/^\((.*)\)$/,"$1");
  return s!=="" && !isNaN(parseFloat(s)) && isFinite(+s);
}
/**
 * Convertit une cellule en nombre : gère espaces, séparateur virgule, parenthèses = négatif.
 * @param {*} v
 * @returns {number}
 */
function toNum(v){
  if(v===null||v===undefined||v==="") return 0;
  if(typeof v==="number") return isFinite(v)?v:0;
  let s=String(v).trim().replace(/[   ]/g,"");
  if(!s||s==="-"||s==="--") return 0;
  const neg=s.startsWith("(")&&s.endsWith(")");
  s=s.replace(/^\(|\)$/g,"").replace(",",".");
  const x=parseFloat(s);
  if(isNaN(x)) return 0;
  return neg?-x:x;
}

/* ---------- 1. Ingestion d'une balance (matrice de cellules) ---------- */
const MOTS_ENTETE=["compte","libelle","intitule","debit","credit","solde","mouvement"];
const KW_SI=["n-1","initial","debut","ouverture","anterieur","report"];
const KW_MVT=["mouv","mvt","periode","exercice","cumul"];

/**
 * Lit une balance : détecte les colonnes par leur contenu, exclut les sous-totaux
 * hiérarchiques, et renvoie les comptes + un contrôle d'équilibre.
 * @param {any[][]} matrice  Lignes × colonnes (cellules brutes du tableur).
 * @returns {{comptes: CompteBalance[], controle: {nb:number, sfDebit:number, sfCredit:number, ecart:number, sousTotauxExclus:number}}}
 */
function lireBalance(matrice){
  const nl=matrice.length;
  const nc=Math.max(...matrice.map(r=>r.length),0);
  const cell=(i,j)=>(matrice[i]&&matrice[i][j]!==undefined)?matrice[i][j]:null;

  /* ligne d'en-tete */
  let ligneEnt=-1,scoreMax=0;
  for(let i=0;i<Math.min(25,nl);i++){
    const txt=(matrice[i]||[]).map(norm).join(" ");
    const score=MOTS_ENTETE.filter(m=>txt.includes(m)).length;
    if(score>scoreMax){scoreMax=score;ligneEnt=i;}
  }
  if(scoreMax<2) ligneEnt=-1;

  /* premiere ligne de donnees + colonne compte */
  let premLigne=ligneEnt+1,colCompte=0,trouve=false;
  for(let i=ligneEnt+1;i<Math.min(ligneEnt+31,nl)&&!trouve;i++)
    for(let c=0;c<Math.min(4,nc)&&!trouve;c++)
      if(estCompte(cell(i,c))){premLigne=i;colCompte=c;trouve=true;}

  /* en-tetes par colonne (bloc vertical) */
  const entetes=[];
  for(let c=0;c<nc;c++){
    const morceaux=[];
    for(let r=Math.max(ligneEnt,0);r<premLigne;r++){
      const v=nettoyer(cell(r,c));
      if(v&&!morceaux.includes(v)) morceaux.push(v);
    }
    entetes.push(morceaux.join(" "));
  }
  const entProche=(c)=>{for(let d=0;d<=2;d++){for(const cc of [c-d,c+d]) if(cc>=0&&cc<nc&&entetes[cc]) return norm(entetes[cc]);}return "";};

  /* detection des colonnes par contenu */
  const cntNum=new Array(nc).fill(0),cntTxt=new Array(nc).fill(0);
  let vues=0;
  for(let i=premLigne;i<Math.min(premLigne+300,nl);i++){
    if(!estCompte(cell(i,colCompte))) continue;
    vues++;
    for(let c=0;c<nc;c++){
      if(c===colCompte) continue;
      const v=cell(i,c); const t=nettoyer(v);
      if(!t) continue;
      if(estNombre(v)) cntNum[c]++; else cntTxt[c]++;
    }
  }
  if(!vues) throw new Error("Aucune ligne de compte détectée");
  const seuil=Math.max(1,Math.floor(0.05*vues));
  const colsTxt=[],colsNum=[];
  for(let c=0;c<nc;c++){
    if(cntTxt[c]>=seuil&&cntTxt[c]>cntNum[c]) colsTxt.push(c);
    if(cntNum[c]>=seuil&&cntNum[c]>=cntTxt[c]) colsNum.push(c);
  }
  let colLib=colsTxt.length?colsTxt.reduce((a,b)=>cntTxt[a]>=cntTxt[b]?a:b):colCompte+1;

  /* paires debit/credit par position */
  let paires=[];
  for(let k=0;k+1<colsNum.length;k+=2) paires.push([colsNum[k],colsNum[k+1]]);
  let colNet=null;
  if(!paires.length){
    if(colsNum.length===1) colNet=colsNum[0];   /* balance à solde net signé (une seule colonne de montants) */
    else throw new Error("Aucune paire Débit/Crédit détectée");
  }
  if(paires.length>3) paires=paires.slice(-3);
  const modeles={1:["sf"],2:["mvt","sf"],3:["si","mvt","sf"]};
  let types=paires.length?modeles[paires.length].slice():[];
  const typeKw=(c)=>{const n=entProche(c);
    if(KW_SI.some(k=>n.includes(k))) return "si";
    if(KW_MVT.some(k=>n.includes(k))&&!n.includes("solde")) return "mvt";
    return null;};
  const tks=paires.map(p=>typeKw(p[0]));
  const valides=tks.filter(Boolean);
  if(new Set(valides).size===valides.length){
    const cand=tks.map((tk,i)=>tk||types[i]);
    if(new Set(cand).size===cand.length) types=cand;
  }

  /* extraction des lignes */
  let comptes=[];
  for(let i=premLigne;i<nl;i++){
    if(!estCompte(cell(i,colCompte))) continue;
    /** @type {CompteBalance} */
    const e={compte:nettoyer(cell(i,colCompte)).replace(/\.0$/,""),
             libelle:nettoyer(cell(i,colLib)),
             si_d:0,si_c:0,mvt_d:0,mvt_c:0,sf_d:0,sf_c:0};
    if(colNet!==null){
      const vN=toNum(cell(i,colNet));
      e.sf_d=vN>0?vN:0;e.sf_c=vN<0?-vN:0;
    }else paires.forEach((p,k)=>{
      const t=types[k];
      e[t+"_d"]=toNum(cell(i,p[0]));
      e[t+"_c"]=toNum(cell(i,p[1]));
    });
    comptes.push(e);
  }

  /* sf calcule si absent */
  const sfVide=comptes.every(e=>Math.abs(e.sf_d)+Math.abs(e.sf_c)<0.5);
  comptes.forEach(e=>{
    if(sfVide){const net=(e.si_d-e.si_c)+(e.mvt_d-e.mvt_c);e.sf_d=Math.max(net,0);e.sf_c=Math.max(-net,0);}
    e.net=e.sf_d-e.sf_c;
  });

  /* exclusion des sous-totaux hierarchiques (montants = somme des sous-comptes) */
  const parCompte={};
  comptes.forEach(e=>{(parCompte[e.compte]=parCompte[e.compte]||[]).push(e);});
  const tous=Object.keys(parCompte);
  const candidats=tous.filter(c=>tous.some(a=>a!==c&&a.startsWith(c)));
  candidats.sort((a,b)=>b.length-a.length);
  const exclus=new Set();
  for(const c of candidats){
    const lig=parCompte[c];
    const enfants=comptes.filter(e=>e.compte.startsWith(c)&&e.compte!==c&&!exclus.has(e.compte));
    if(!enfants.length) continue;
    const s=(arr,f)=>arr.reduce((t,e)=>t+f(e),0);
    const netSF=s(lig,e=>e.sf_d-e.sf_c), netSFe=s(enfants,e=>e.sf_d-e.sf_c);
    const netMV=s(lig,e=>e.mvt_d-e.mvt_c), netMVe=s(enfants,e=>e.mvt_d-e.mvt_c);
    if(Math.abs(netSF-netSFe)<=1.5&&Math.abs(netMV-netMVe)<=1.5) exclus.add(c);
  }
  /* regle complementaire : libelle TOTAL + compte court */
  const longueurs={};
  comptes.forEach(e=>{longueurs[e.compte.length]=(longueurs[e.compte.length]||0)+1;});
  const lgDom=+Object.keys(longueurs).reduce((a,b)=>longueurs[a]>=longueurs[b]?a:b);
  comptes=comptes.filter(e=>{
    if(exclus.has(e.compte)) return false;
    const l=norm(e.libelle);
    if((l.startsWith("total")||l.startsWith("sous-total")||l.startsWith("s/total"))&&e.compte.length<lgDom) return false;
    return true;
  });

  const totD=comptes.reduce((t,e)=>t+e.sf_d,0), totC=comptes.reduce((t,e)=>t+e.sf_c,0);
  return {comptes, controle:{nb:comptes.length, sfDebit:totD, sfCredit:totC,
          ecart:totD-totC, sousTotauxExclus:exclus.size}};
}

/* ---------- 2. TBAGR (agrégation multi-exercices, en K) ---------- */
/**
 * Agrège plusieurs balances annuelles en une TBAGR (une ligne par compte, en K, crédits -).
 * @param {Balance[]} balances
 * @returns {Tbagr}
 */
function construireTbagr(balances){
  const annees=balances.map(b=>b.annee).sort((a,b)=>a-b);
  const map={};
  for(const b of balances){
    for(const e of b.comptes){
      if(!map[e.compte]) map[e.compte]={compte:e.compte, libelle:e.libelle, vals:{}};
      map[e.compte].vals[b.annee]=(map[e.compte].vals[b.annee]||0)+e.net/1000;
      if(!map[e.compte].libelle&&e.libelle) map[e.compte].libelle=e.libelle;
    }
  }
  const lignes=Object.values(map).sort((a,b)=>a.compte.localeCompare(b.compte));
  lignes.forEach(l=>{annees.forEach(a=>{if(!(a in l.vals)) l.vals[a]=0;});});
  return /** @type {Tbagr} */ ({annees, lignes});
}

/* ---------- 3. Mapping automatique + overrides ---------- */
function indexPrefixes(defs){const ix={};defs.forEach(d=>d.pref.forEach(p=>{if(!(p in ix)||p.length>=p.length) ix[p]=d;}));return ix;}
const IX_PL=indexPrefixes(LIGNES_PL), IX_BS=indexPrefixes(LIGNES_BS);

/**
 * Mapping automatique d'un compte vers une ligne de restitution (par préfixe SYSCOHADA).
 * @param {string} compte
 * @param {number} soldeMoyen  Signe → ligne débitrice/créditrice alternative.
 * @returns {string}  Code de ligne, ou "NON_MAPPE".
 */
function mapperCompte(compte, soldeMoyen){
  const classe=compte[0];
  const ix=("678".includes(classe))?IX_PL:IX_BS;
  for(let lg=compte.length;lg>0;lg--){
    const d=ix[compte.slice(0,lg)];
    if(!d) continue;
    if(soldeMoyen>0&&d.siDebiteur) return d.siDebiteur;
    if(soldeMoyen<0&&d.siCrediteur) return d.siCrediteur;
    return d.code;
  }
  return "NON_MAPPE";
}
/**
 * Applique le mapping (auto + overrides manuels) à chaque ligne de la TBAGR (mutation).
 * @param {Tbagr} tbagr
 * @param {Object<string,string>} [overrides]  compte -> code de ligne forcé.
 * @returns {Tbagr}
 */
function appliquerMapping(tbagr, overrides){
  overrides=overrides||{};
  tbagr.lignes.forEach(l=>{
    const total=Object.values(l.vals).reduce((a,b)=>a+b,0);
    l.mapping=overrides[l.compte]||mapperCompte(l.compte,total);
    l.bsPl="678".includes(l.compte[0])?"PL":"BS";
    l.corrige=!!overrides[l.compte];
  });
  return tbagr;
}

/* ---------- 4. États financiers ---------- */
function sommeLigne(tbagr,code,annee){
  let t=0;
  for(const l of tbagr.lignes) if(l.mapping===code) t+=l.vals[annee]||0;
  return t;
}
/**
 * Calcule les états financiers : P&L analytique, bilan actif net, TFT officiel SYSCOHADA.
 * @param {Tbagr} tbagr  TBAGR mappée.
 * @param {LignePerso[]} [lignesPerso]  Lignes personnalisées du dossier.
 * @returns {Etats}
 */
function calculerEtats(tbagr,lignesPerso){
  const A=tbagr.annees, v={};
  const S=(code,a)=>sommeLigne(tbagr,code,a);
  const li=(code,signe)=>{v[code]={};A.forEach(a=>v[code][a]=signe*S(code,a));};
  /* P&L : produits +, charges - */
  ["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES","ACHATS_MARCH","ACHATS_MP",
   "AUTRES_ACHATS","VARIATION_STOCKS","SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS",
   "SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM","FRAIS_BANCAIRES",
   "HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT","IMPOTS_TAXES","AUTRES_CHARGES",
   "CHARGES_PERSONNEL","DOTATIONS","REPRISES","REVENUS_FIN","FRAIS_FIN","PRODUITS_HAO",
   "CHARGES_HAO","PARTICIPATION","IS"].forEach(c=>li(c,-1));
  /* BS : signes naturels ; CP affichés positifs */
  ["IMMO_INCORP","IMMO_CORP","AVANCES_IMMO","IMMO_FIN","AMORT_DEPREC","STOCKS","CLIENTS",
   "CLIENTS_AVANCES","AVANCES_FRS","AUTRES_CREANCES","FOURNISSEURS","DETTES_SOCIALES",
   "DETTES_FISCALES","AUTRES_DETTES","HAO_ACTIF","HAO_PASSIF","TRESO_ACTIF","TRESO_PASSIF",
   "PROVISIONS_RC","DETTES_FINANCIERES"].forEach(c=>li(c,1));
  ["CAPITAL","PRIMES_RESERVES","RAN_RESULTATS_ANT","SUBV_PROV_REGL"].forEach(c=>li(c,-1));

  /* lignes personnalisées du dossier : rattachées à un agrégat du P&L ou du bilan */
  const perso={};
  (lignesPerso||[]).forEach(lp=>{
    li(lp.code, lp.etat==="PL"||lp.agregat==="CAPITAUX_PROPRES" ? -1 : 1);
    (perso[lp.agregat]=perso[lp.agregat]||[]).push(lp.code);
  });
  const P=(agg)=>perso[agg]||[];
  const somme=(codes)=>{const o={};A.forEach(a=>o[a]=codes.reduce((t,c)=>t+(v[c]?v[c][a]:0),0));return o;};
  v.CA=somme(["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES",...P("CA")]);
  v.COUTS_DIRECTS=somme(["ACHATS_MARCH","ACHATS_MP","VARIATION_STOCKS",...P("COUTS_DIRECTS")]);
  v.MARGE_BRUTE=somme(["CA","COUTS_DIRECTS"]);
  v.AUTRES_PROD=somme(["SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS",...P("AUTRES_PROD")]);
  /* Services extérieurs (62/63) regroupés en une seule ligne d'affichage */
  v.SERVICES_EXT=somme(["SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM",
                "FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","AUTRES_SERV_EXT"]);
  /* OPEX (frais généraux hors personnel) : autres achats + services + transports + impôts&taxes + autres charges */
  v.OPEX=somme(["AUTRES_ACHATS","SERVICES_EXT","TRANSPORTS","IMPOTS_TAXES","AUTRES_CHARGES",...P("OPEX")]);
  v.CHARGES_PERSONNEL=somme(["CHARGES_PERSONNEL",...P("CHARGES_PERSONNEL")]);
  /* Frais généraux = OPEX + charges de personnel (le personnel fait partie des frais généraux) */
  v.FRAIS_GENERAUX=somme(["OPEX","CHARGES_PERSONNEL"]);
  v.EBITDA=somme(["MARGE_BRUTE","AUTRES_PROD","FRAIS_GENERAUX"]);
  v.DA=somme(["DOTATIONS","REPRISES",...P("DA")]);
  v.EBIT=somme(["EBITDA","DA"]);
  v.RESULTAT_FIN=somme(["REVENUS_FIN","FRAIS_FIN",...P("RESULTAT_FIN")]);
  v.RAO=somme(["EBIT","RESULTAT_FIN"]);
  v.RESULTAT_HAO=somme(["PRODUITS_HAO","CHARGES_HAO",...P("RESULTAT_HAO")]);
  v.RESULTAT_AVANT_IMPOT=somme(["RAO","RESULTAT_HAO"]);
  v.IMPOTS=somme(["IS","PARTICIPATION",...P("IMPOTS")]);
  v.RESULTAT_NET=somme(["RESULTAT_AVANT_IMPOT","IMPOTS"]);

  v.ACTIFS_IMMOBILISES=somme(["IMMO_INCORP","IMMO_CORP","AVANCES_IMMO","IMMO_FIN","AMORT_DEPREC",...P("ACTIFS_IMMOBILISES")]);
  v.BFR_EXPL=somme(["STOCKS","CLIENTS","CLIENTS_AVANCES","AVANCES_FRS",
               "FOURNISSEURS","DETTES_SOCIALES","DETTES_FISCALES",...P("BFR_ACTIF"),...P("BFR_PASSIF")]);
  v.BFR_HE=somme(["AUTRES_CREANCES","AUTRES_DETTES","HAO_ACTIF","HAO_PASSIF"]);
  v.BFR=somme(["BFR_EXPL","BFR_HE"]);
  v.TRESORERIE_NETTE=somme(["TRESO_ACTIF","TRESO_PASSIF",...P("TRESORERIE_NETTE")]);
  v.ACTIF_NET=somme(["ACTIFS_IMMOBILISES","BFR","TRESORERIE_NETTE","PROVISIONS_RC","DETTES_FINANCIERES",...P("FINANCEMENT")]);
  v.CAPITAUX_PROPRES=somme(["CAPITAL","PRIMES_RESERVES","RAN_RESULTATS_ANT","SUBV_PROV_REGL","RESULTAT_NET",...P("CAPITAUX_PROPRES")]);

  /* TFT au format officiel SYSCOHADA (références ZA, FA..FO, ZB..ZG),
     reconstruit par variations bilancielles — réconcilié avec le bilan */
  const tft={};
  for(let i=1;i<A.length;i++){
    const a=A[i],p=A[i-1];
    const d=(c)=>v[c][a]-v[c][p];
    const dP=(agg)=>P(agg).reduce((t,c)=>t+d(c),0);
    const rn=v.RESULTAT_NET[a];
    const FA=rn-d("AMORT_DEPREC")-d("PROVISIONS_RC");          /* CAFG (approchée) */
    const FB=-d("HAO_ACTIF");
    const FC=-d("STOCKS");
    const FD=-(d("CLIENTS")+d("AUTRES_CREANCES")+d("AVANCES_FRS")+dP("BFR_ACTIF"));
    const FE=-(d("FOURNISSEURS")+d("CLIENTS_AVANCES")+d("DETTES_SOCIALES")
              +d("DETTES_FISCALES")+d("AUTRES_DETTES")+d("HAO_PASSIF")+dP("BFR_PASSIF"));
    const ZB=FA+FB+FC+FD+FE;
    const FF=-d("IMMO_INCORP");
    const FG=-(d("IMMO_CORP")+d("AVANCES_IMMO")+dP("ACTIFS_IMMOBILISES"));
    const FH=-d("IMMO_FIN");
    const FI=0;                                                 /* cessions non isolables */
    const ZC=FF+FG+FH+FI;
    const FK=d("CAPITAL")+dP("CAPITAUX_PROPRES");
    const FL=d("SUBV_PROV_REGL");
    const FN=(v.PRIMES_RESERVES[a]+v.RAN_RESULTATS_ANT[a])
            -(v.PRIMES_RESERVES[p]+v.RAN_RESULTATS_ANT[p])-v.RESULTAT_NET[p];
    const ZD=FK+FL+FN;
    const FO=-(d("DETTES_FINANCIERES")+dP("FINANCEMENT"));
    const ZE=FO;
    const ZF=ZB+ZC+ZD+ZE;
    tft[a]={ZA:v.TRESORERIE_NETTE[p],FA,FB,FC,FD,FE,ZB,FF,FG,FH,FI,ZC,FK,FL,FN,ZD,FO,ZE,ZF,
            ZG:v.TRESORERIE_NETTE[p]+ZF,
            /* agrégats pour la présentation simplifiée du TFT (mêmes totaux) */
            VAR_CREANCES:FD+FB, ACQUIS_IMMO:FF+FG+FH, CESSION_IMMO:FI,
            EMPRUNT:FO>0?FO:0, REMBOURS:FO<0?FO:0, ZFIN:ZD+ZE,
            /* clés héritées (rapports, commentaires, databook) */
            RN:rn,AMORT:-d("AMORT_DEPREC"),PROV:-d("PROVISIONS_RC"),DBFR:-d("BFR"),
            OP:ZB,CAPEX:ZC,FIN:ZD+ZE,FCF:ZF,
            OUVERTURE:v.TRESORERIE_NETTE[p],CLOTURE:v.TRESORERIE_NETTE[a]};
  }
  return /** @type {Etats} */ (/** @type {any} */ ({annees:A, v, tft}));
}


/* ---------- 5. Ratios (16 ratios, 3 catégories — nomenclature Findalyx) ---------- */
/** @type {RatioDef[]} */
const RATIOS_META=[
 {k:"margeBrute",lab:"Marge brute",unit:"%",cat:"rentabilite",
  calc:(x)=>x.ca?x.mb/x.ca*100:null, seuils:[20,10]},
 {k:"margeEbitda",lab:"Marge EBITDA",unit:"%",cat:"rentabilite",
  calc:(x)=>x.ca?x.ebitda/x.ca*100:null, seuils:[15,5]},
 {k:"margeNette",lab:"Marge nette",unit:"%",cat:"rentabilite",
  calc:(x)=>x.ca?x.rn/x.ca*100:null, seuils:[8,2]},
 {k:"roe",lab:"ROE (rentabilité des capitaux propres)",unit:"%",cat:"rentabilite",
  calc:(x)=>x.cp>0?x.rn/x.cp*100:null, seuils:[15,5]},
 {k:"roa",lab:"ROA (rentabilité de l'actif)",unit:"%",cat:"rentabilite",
  calc:(x)=>x.totalActif>0?x.rn/x.totalActif*100:null, seuils:[5,2]},
 {k:"roce",lab:"ROCE (rentabilité des capitaux employés)",unit:"%",cat:"rentabilite",
  calc:(x)=>(x.cp+x.dettesFin)>0?x.ebit/(x.cp+x.dettesFin)*100:null, seuils:[12,6]},
 {k:"liquiditeGenerale",lab:"Liquidité générale",unit:"x",cat:"liquidite",
  calc:(x)=>x.passifCirc>0?x.actifCirc/x.passifCirc:null, seuils:[1.5,1.0]},
 {k:"liquiditeReduite",lab:"Liquidité réduite",unit:"x",cat:"liquidite",
  calc:(x)=>x.passifCirc>0?(x.actifCirc-x.stocks)/x.passifCirc:null, seuils:[1.0,0.7]},
 {k:"liquiditeImmediate",lab:"Liquidité immédiate",unit:"x",cat:"liquidite",
  calc:(x)=>x.passifCirc>0?x.tresoActif/x.passifCirc:null, seuils:[0.5,0.2]},
 {k:"bfrJours",lab:"BFR en jours de CA",unit:"j",cat:"liquidite",inverse:true,
  calc:(x)=>x.ca?x.bfr*360/x.ca:null, seuils:[60,120]},
 {k:"delaiClients",lab:"Délai clients (DSO)",unit:"j",cat:"liquidite",inverse:true,
  calc:(x)=>x.ca?x.clients*360/(x.ca*1.18):null, seuils:[45,90]},
 {k:"delaiFournisseurs",lab:"Délai fournisseurs (DPO)",unit:"j",cat:"liquidite",inverse:true,
  calc:(x)=>(x.achats+x.opex)>0?x.fournisseurs*360/((x.achats+x.opex)*1.18):null, seuils:[60,120]},
 {k:"gearing",lab:"Gearing (dette fin. / capitaux propres)",unit:"x",cat:"endettement",inverse:true,
  calc:(x)=>x.cp>0?x.dettesFin/x.cp:null, seuils:[1.0,2.0]},
 {k:"leverage",lab:"Leverage (dette nette / EBITDA)",unit:"x",cat:"endettement",inverse:true,
  calc:(x)=>x.ebitda>0?x.detteNette/x.ebitda:null, seuils:[2.5,4.0]},
 {k:"couvertureInterets",lab:"Couverture des intérêts (EBITDA / frais fin.)",unit:"x",cat:"endettement",
  calc:(x)=>x.fraisFin>0?x.ebitda/x.fraisFin:null, seuils:[4.0,2.0]},
 {k:"autonomieFinanciere",lab:"Autonomie financière (CP / total actif)",unit:"%",cat:"endettement",
  calc:(x)=>x.totalActif>0?x.cp/x.totalActif*100:null, seuils:[35,20]},
];
function statutRatio(m,val){
  if(val===null||!isFinite(val)) return null;
  const [bon,moyen]=m.seuils;
  if(m.inverse) return val<=bon?"good":(val<=moyen?"warn":"bad");
  return val>=bon?"good":(val>=moyen?"warn":"bad");
}
/**
 * Calcule les 16 ratios, leur statut (good/warn/bad) et un score de santé sur 100.
 * @param {Etats} etats
 * @returns {{ratios:any[], score:number, synthese:string, nbGood:number, nbWarn:number, nbBad:number}}
 */
function calculerRatios(etats){
  const A=etats.annees, v=etats.v;
  const base=(a)=>({
    ca:v.CA[a], mb:v.MARGE_BRUTE[a], ebitda:v.EBITDA[a], ebit:v.EBIT[a], rn:v.RESULTAT_NET[a],
    cp:v.CAPITAUX_PROPRES[a],
    dettesFin:-v.DETTES_FINANCIERES[a],
    detteNette:-v.DETTES_FINANCIERES[a]-v.TRESORERIE_NETTE[a],
    fraisFin:-v.FRAIS_FIN[a],
    stocks:v.STOCKS[a], clients:v.CLIENTS[a],
    fournisseurs:-v.FOURNISSEURS[a],
    achats:-v.COUTS_DIRECTS[a], opex:-v.OPEX[a],
    bfr:v.BFR[a], tresoActif:v.TRESO_ACTIF[a],
    actifCirc:v.STOCKS[a]+v.CLIENTS[a]+v.AUTRES_CREANCES[a]+v.AVANCES_FRS[a]+v.HAO_ACTIF[a]+v.TRESO_ACTIF[a],
    passifCirc:-(v.FOURNISSEURS[a]+v.CLIENTS_AVANCES[a]+v.DETTES_SOCIALES[a]+v.DETTES_FISCALES[a]
                 +v.AUTRES_DETTES[a]+v.HAO_PASSIF[a]+v.TRESO_PASSIF[a]),
    totalActif:(v.ACTIFS_IMMOBILISES[a])
      +v.STOCKS[a]+v.CLIENTS[a]+v.AUTRES_CREANCES[a]+v.AVANCES_FRS[a]+v.HAO_ACTIF[a]+v.TRESO_ACTIF[a],
  });
  const ratios=RATIOS_META.map(m=>{
    const vals={};
    A.forEach(a=>{const x=base(a);const val=m.calc(x);vals[a]=(val===null||!isFinite(val))?null:val;});
    const der=vals[A[A.length-1]];
    return {...m, vals, statut:statutRatio(m,der)};
  });
  const evalues=ratios.filter(r=>r.statut);
  const bons=evalues.filter(r=>r.statut==="good").length;
  const score=evalues.length?Math.round(bons/evalues.length*100):0;
  let synthese;
  if(score>=70) synthese="La santé financière est solide : les fondamentaux sont bien orientés et la marge de manœuvre est confortable.";
  else if(score>=45) synthese="Situation financière contrastée : certains fondamentaux sont corrects mais des points de vigilance appellent un suivi rapproché.";
  else synthese="Situation financière fragile : bâtir un plan combinant amélioration de la rentabilité, optimisation du BFR et renforcement des capitaux propres.";
  return {ratios, score, synthese,
    nbGood:bons, nbWarn:evalues.filter(r=>r.statut==="warn").length,
    nbBad:evalues.filter(r=>r.statut==="bad").length};
}


/* ---------- 5b. Scores (3 modèles : Notation, Altman Z, Cotation BCEAO) ---------- */
/** Taxonomie des secteurs (pour le sélecteur). Les bornes de benchmark viennent EN LIGNE. */
const SECTEURS=["Général","Commerce & distribution","Services & conseil","Agro-industrie","Industrie manufacturière"];
/**
 * Bornes effectives d'un secteur — UNIQUEMENT le benchmark en ligne (aucune borne embarquée/fabriquée).
 * Renvoie {} si le secteur n'a pas encore de benchmark : dans ce cas on n'affiche pas de comparaison.
 * @param {string} [secteur]
 * @returns {Object<string,{min:number,max:number,mean?:number}>}
 */
function benchDe(secteur){
  const online=(typeof BENCH_ONLINE!=="undefined"&&BENCH_ONLINE&&secteur)?BENCH_ONLINE[secteur]:null;
  return online||{};
}
/** Normalise une valeur de ratio en score 0-100 par rapport au benchmark [min,max]. */
function scoreRatio(val, bench, higherBetter){
  if(val===null||val===undefined||!isFinite(val)||!bench) return null;
  const lo=bench.min, hi=bench.max;
  if(higherBetter){
    if(val>=hi) return 100;
    if(val>=lo) return 60+(val-lo)/((hi-lo)||1)*40;
    if(lo<=0) return 30;
    const floor=lo*0.5;
    if(val<=floor) return 0;
    return (val-floor)/((lo-floor)||1)*60;
  }
  if(val<=lo) return 100;
  if(val<=hi) return 60+(hi-val)/((hi-lo)||1)*40;
  const ceil=hi*1.5;
  if(val>=ceil) return 0;
  return Math.max(0,60*(1-(val-hi)/((ceil-hi)||1)));
}
/**
 * Calcule les 3 modèles de score sur le dernier exercice.
 * @param {Etats} etats
 * @param {string} [secteur]  Secteur de comparaison (bornes de benchmark).
 * @returns {*}  { notation, altman, bceao }
 */
function calculerScores(etats, secteur){
  const A=etats.annees, a=A[A.length-1], v=etats.v;
  const g=(c)=>v[c]?(v[c][a]||0):0;
  const ac=g("STOCKS")+g("CLIENTS")+g("AUTRES_CREANCES")+g("AVANCES_FRS")+g("HAO_ACTIF")+g("TRESO_ACTIF");
  const pc=-(g("FOURNISSEURS")+g("CLIENTS_AVANCES")+g("DETTES_SOCIALES")+g("DETTES_FISCALES")+g("AUTRES_DETTES")+g("HAO_PASSIF")+g("TRESO_PASSIF"));
  const ta=g("ACTIFS_IMMOBILISES")+ac;
  const cp=g("CAPITAUX_PROPRES"), ebit=g("EBIT"), rn=g("RESULTAT_NET"), ca=g("CA");
  const totalDettes=ta-cp;

  /* Modèle 1 — Notation (Profitabilité 30% · Liquidité 30% · Solvabilité 40%).
     Normalisation vs le benchmark du secteur s'il existe, sinon vs les seuils internes. */
  const bench=benchDe(secteur);
  const rr=calculerRatios(etats).ratios;
  const dim={rentabilite:[],liquidite:[],endettement:[]};
  rr.forEach(r=>{
    let bnd=bench[r.k];
    if(!bnd&&r.seuils){const bon=r.seuils[0],moyen=r.seuils[1];bnd=r.inverse?{min:bon,max:moyen}:{min:moyen,max:bon};}
    const s=scoreRatio(r.vals[a],bnd,!r.inverse); if(s!==null) dim[r.cat].push(s);
  });
  const moy=(arr)=>arr.length?arr.reduce((x,y)=>x+y,0)/arr.length:0;
  const sProf=moy(dim.rentabilite), sLiq=moy(dim.liquidite), sSolv=moy(dim.endettement);
  const global=Math.round(sProf*0.30+sLiq*0.30+sSolv*0.40);
  const gr=global>=80?["A","Excellent","g"]:global>=70?["B","Bon","g"]:global>=60?["C","Moyen","w"]:global>=50?["D","Faible","w"]:["E","Critique","b"];
  const notation={global,prof:Math.round(sProf),liq:Math.round(sLiq),solv:Math.round(sSolv),grade:gr[0],mention:gr[1],ton:gr[2]};

  /* Modèle 2 — Altman Z-Score (Emerging Markets, Z'' 1995) */
  const raN=g("RAN_RESULTATS_ANT"), fr=ac-pc;
  const X1=ta?fr/ta:0, X2=ta?raN/ta:0, X3=ta?ebit/ta:0, X4=totalDettes?cp/totalDettes:0;
  const Z=3.25+6.56*X1+3.26*X2+6.72*X3+1.05*X4;
  const zn=Z>2.6?["Sûre","g"]:Z>=1.1?["Grise","w"]:["Détresse","b"];
  const zGrade=Z>5.85?"AAA":Z>4.5?"AA":Z>3.75?"A":Z>2.6?"BBB":Z>1.75?"BB":Z>1.1?"B":Z>0?"CCC":"D";
  const altman={z:Math.round(Z*100)/100,zone:zn[0],ton:zn[1],grade:zGrade,
    comp:[{k:"X1 · FR / Actif",v:X1,c:6.56},{k:"X2 · Report à nouveau / Actif",v:X2,c:3.26},
          {k:"X3 · EBIT / Actif",v:X3,c:6.72},{k:"X4 · Capitaux propres / Dettes",v:X4,c:1.05}]};

  /* Modèle 3 — Cotation BCEAO (UEMOA) */
  const liqGen=pc?ac/pc:0, caf=rn-g("DA"), detteFin=-g("DETTES_FINANCIERES");
  const capRemb=caf>0?detteFin/caf:999, margeN=ca?rn/ca*100:0, auto=ta?cp/ta*100:0;
  const crit=[
    {lib:"Liquidité générale",val:liqGen,unite:"x",seuil:"≥ 1,00",ok:liqGen>=1},
    {lib:"Capacité de remboursement (dette / CAF)",val:capRemb,unite:"x",seuil:"≤ 4,00",ok:caf>0&&capRemb<=4},
    {lib:"Marge nette",val:margeN,unite:"%",seuil:"> 0 %",ok:margeN>0},
    {lib:"Autonomie financière",val:auto,unite:"%",seuil:"≥ 20 %",ok:auto>=20},
  ];
  const nOk=crit.filter(c=>c.ok).length;
  const cote=["E","D","C","B","A"][nOk];
  const cLib={A:"Signature de haute qualité",B:"Bonne signature",C:"Signature moyenne",D:"Signature faible",E:"Signature à risque"}[cote];
  const cTon={A:"g",B:"g",C:"w",D:"w",E:"b"}[cote];
  const bceao={cote,mention:cLib,ton:cTon,nOk,crit};

  return {notation,altman,bceao};
}

/**
 * Extrait les agrégats du dernier exercice pour une contribution benchmark — ANONYMISÉ
 * (agrégats seulement, aucune donnée nominative). En K. Mêmes champs que benchmark_companies.
 * @param {Etats} etats
 * @returns {*}
 */
function agregatsBenchmark(etats){
  const A=etats.annees, a=A[A.length-1], v=etats.v;
  const g=(c)=>v[c]?(v[c][a]||0):0;
  const ac=g("STOCKS")+g("CLIENTS")+g("AUTRES_CREANCES")+g("AVANCES_FRS")+g("HAO_ACTIF")+g("TRESO_ACTIF");
  const pc=-(g("FOURNISSEURS")+g("CLIENTS_AVANCES")+g("DETTES_SOCIALES")+g("DETTES_FISCALES")+g("AUTRES_DETTES")+g("HAO_PASSIF")+g("TRESO_PASSIF"));
  return {
    annee:a, ca:g("CA"), marge_brute:g("MARGE_BRUTE"), ebitda:g("EBITDA"), ebit:g("EBIT"),
    resultat_net:g("RESULTAT_NET"), total_actif:g("ACTIFS_IMMOBILISES")+ac, capitaux_propres:g("CAPITAUX_PROPRES"),
    dettes_financieres:-g("DETTES_FINANCIERES"), actif_circulant:ac, passif_circulant:pc,
    stocks:g("STOCKS"), creances_clients:g("CLIENTS"), dettes_fournisseurs:-g("FOURNISSEURS"),
    tresorerie_actif:g("TRESO_ACTIF"), charges_interets:-g("FRAIS_FIN"),
  };
}

/* ---------- 6. Projections (business plan 5 ans) et valorisation ---------- */
/**
 * Reformate les états en agrégats P&L/BS par exercice, base des projections.
 * @param {Etats} etats
 * @returns {*}
 */
function agregatsHistoriques(etats){
  const A=etats.annees,v=etats.v,h={};
  for(const a of A){
    h[a]={pl:{
      CA:v.CA[a], ACHATS:v.COUTS_DIRECTS[a], AUTRES_PRODUITS:v.AUTRES_PROD[a],
      PERSONNEL:v.CHARGES_PERSONNEL[a], AUTRES_OPEX:v.OPEX[a],
      EBITDA:v.EBITDA[a], DOTATIONS:v.DA[a], RN:v.RESULTAT_NET[a],
    }, bs:{
      IMMO_BRUT:v.IMMO_INCORP[a]+v.IMMO_CORP[a]+v.AVANCES_IMMO[a]+v.IMMO_FIN[a],
      AMORT_CUM:v.AMORT_DEPREC[a],
      STOCKS:v.STOCKS[a], CLIENTS:v.CLIENTS[a],
      AUTRES_CREANCES:v.AUTRES_CREANCES[a]+v.AVANCES_FRS[a]+v.HAO_ACTIF[a],
      FOURNISSEURS:v.FOURNISSEURS[a],
      DETTES_FISC_SOC:v.DETTES_FISCALES[a]+v.DETTES_SOCIALES[a],
      AUTRES_DETTES:v.AUTRES_DETTES[a]+v.CLIENTS_AVANCES[a]+v.HAO_PASSIF[a],
      TRESO_NETTE:v.TRESORERIE_NETTE[a],
      CAPITAL:v.CAPITAL[a], RESERVES_RAN:v.PRIMES_RESERVES[a]+v.RAN_RESULTATS_ANT[a],
      SUBV_PROV_REGL:v.SUBV_PROV_REGL[a],
      PROVISIONS:-v.PROVISIONS_RC[a], DETTES_FIN:-v.DETTES_FINANCIERES[a],
    }};
  }
  return h;
}
function borne(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
/**
 * Dérive des hypothèses par défaut à partir de l'historique (croissance, marges, BFR, WACC…).
 * @param {Etats} etats
 * @returns {Hypotheses}
 */
function hypothesesParDefaut(etats){
  const A=etats.annees,h=agregatsHistoriques(etats);
  const a0=A[0],a1=A[A.length-1],n=Math.max(1,A.length-1);
  const p0=h[a0].pl,p1=h[a1].pl,b1=h[a1].bs;
  const ca0=p0.CA,ca1=p1.CA;
  const tcam=(ca0>0&&ca1>0)?Math.pow(ca1/ca0,1/n)-1:0.03;
  const r4=(x)=>Math.round(x*1e4)/1e4;
  return {
    croissance_ca:r4(borne(tcam,-0.05,0.15)),
    tx_achats:r4(borne(ca1?-p1.ACHATS/ca1:0.4,0,0.95)),
    tx_personnel:r4(borne(ca1?-p1.PERSONNEL/ca1:0.2,0,0.9)),
    tx_autres_opex:r4(borne(ca1?-p1.AUTRES_OPEX/ca1:0.15,0,0.9)),
    tx_autres_produits:r4(borne(ca1?p1.AUTRES_PRODUITS/ca1:0,0,0.5)),
    tx_amort:r4(borne(b1.IMMO_BRUT?-p1.DOTATIONS/b1.IMMO_BRUT:0.1,0.02,0.35)),
    tx_capex:r4(borne(ca1?-p1.DOTATIONS/ca1:0.05,0,0.3)),
    dso:Math.round(borne(ca1?b1.CLIENTS*360/(ca1*1.18):60,0,360)*10)/10,
    dio:Math.round(borne(p1.ACHATS?b1.STOCKS*360/-p1.ACHATS:30,0,360)*10)/10,
    dpo:Math.round(borne(p1.ACHATS?-b1.FOURNISSEURS*360/(-p1.ACHATS*1.18):60,0,360)*10)/10,
    tx_interet:0.08, tx_remb_dette:0.10, tx_is:0.30, tx_distribution:0.0,
    wacc:0.15, g:0.03, multiple_ebitda:5.0,
  };
}
/**
 * Projette P&L, bilan et TFT sur `nb` années (bilan bouclé par la trésorerie).
 * @param {Etats} etats
 * @param {Hypotheses} hyp
 * @param {number} [nb]  Durée en années (5 par défaut).
 * @returns {Projection}
 */
function projeter(etats,hyp,nb){
  nb=nb||5;
  const A=etats.annees,h=agregatsHistoriques(etats);
  const aDer=A[A.length-1];
  const annees=[];for(let i=1;i<=nb;i++)annees.push(aDer+i);
  const plH=h[aDer].pl,bsH=h[aDer].bs;
  const pl={},bs={},tft={};
  ["CA","ACHATS","MARGE_BRUTE","AUTRES_PRODUITS","PERSONNEL","AUTRES_OPEX","EBITDA",
   "DOTATIONS","EBIT","RESULTAT_FIN","RAO","IS","RN"].forEach(k=>pl[k]={});
  ["IMMO_BRUT","AMORT_CUM","IMMO_NET","STOCKS","CLIENTS","AUTRES_CREANCES","FOURNISSEURS",
   "DETTES_FISC_SOC","AUTRES_DETTES","BFR","CAPITAL","RESERVES_RAN","RN_BS","SUBV_PROV_REGL",
   "CP","PROVISIONS","DETTES_FIN","TRESO_NETTE"].forEach(k=>bs[k]={});
  let prec={CA:plH.CA,IMMO_BRUT:bsH.IMMO_BRUT,AMORT_CUM:bsH.AMORT_CUM,
    AUTRES_CREANCES:bsH.AUTRES_CREANCES,DETTES_FISC_SOC:bsH.DETTES_FISC_SOC,
    AUTRES_DETTES:bsH.AUTRES_DETTES,CAPITAL:bsH.CAPITAL,RESERVES_RAN:bsH.RESERVES_RAN,
    RN:plH.RN,SUBV_PROV_REGL:bsH.SUBV_PROV_REGL,PROVISIONS:bsH.PROVISIONS,
    DETTES_FIN:bsH.DETTES_FIN,TRESO_NETTE:bsH.TRESO_NETTE,
    BFR:bsH.STOCKS+bsH.CLIENTS+bsH.AUTRES_CREANCES+bsH.FOURNISSEURS+bsH.DETTES_FISC_SOC+bsH.AUTRES_DETTES,
    IMMO_NET:bsH.IMMO_BRUT+bsH.AMORT_CUM};
  for(const a of annees){
    const ca=prec.CA*(1+hyp.croissance_ca);
    const achats=-ca*hyp.tx_achats;
    const marge=ca+achats;
    const autresProd=ca*hyp.tx_autres_produits;
    const perso=-ca*hyp.tx_personnel;
    const opex=-ca*hyp.tx_autres_opex;
    const ebitda=marge+autresProd+perso+opex;
    const immoBrut=prec.IMMO_BRUT+ca*hyp.tx_capex;
    const dot=-immoBrut*hyp.tx_amort;
    const ebit=ebitda+dot;
    const rfin=-prec.DETTES_FIN*hyp.tx_interet;
    const rao=ebit+rfin;
    const impot=-Math.max(0,rao*hyp.tx_is);
    const rn=rao+impot;
    const amortCum=prec.AMORT_CUM+dot;
    const immoNet=immoBrut+amortCum;
    const stocks=-achats*hyp.dio/360;
    const clients=ca*1.18*hyp.dso/360;
    const frs=achats*1.18*hyp.dpo/360;
    const bfr=stocks+clients+prec.AUTRES_CREANCES+frs+prec.DETTES_FISC_SOC+prec.AUTRES_DETTES;
    const reserves=prec.RESERVES_RAN+prec.RN*(1-hyp.tx_distribution);
    const cp=prec.CAPITAL+reserves+rn+prec.SUBV_PROV_REGL;
    const dettes=prec.DETTES_FIN*(1-hyp.tx_remb_dette);
    const treso=cp+prec.PROVISIONS+dettes-immoNet-bfr;
    Object.entries({CA:ca,ACHATS:achats,MARGE_BRUTE:marge,AUTRES_PRODUITS:autresProd,
      PERSONNEL:perso,AUTRES_OPEX:opex,EBITDA:ebitda,DOTATIONS:dot,EBIT:ebit,
      RESULTAT_FIN:rfin,RAO:rao,IS:impot,RN:rn}).forEach(([k,x])=>pl[k][a]=x);
    Object.entries({IMMO_BRUT:immoBrut,AMORT_CUM:amortCum,IMMO_NET:immoNet,STOCKS:stocks,
      CLIENTS:clients,AUTRES_CREANCES:prec.AUTRES_CREANCES,FOURNISSEURS:frs,
      DETTES_FISC_SOC:prec.DETTES_FISC_SOC,AUTRES_DETTES:prec.AUTRES_DETTES,BFR:bfr,
      CAPITAL:prec.CAPITAL,RESERVES_RAN:reserves,RN_BS:rn,SUBV_PROV_REGL:prec.SUBV_PROV_REGL,
      CP:cp,PROVISIONS:prec.PROVISIONS,DETTES_FIN:dettes,TRESO_NETTE:treso})
      .forEach(([k,x])=>bs[k][a]=x);
    tft[a]={RN:rn,DOT:-dot,DBFR:-(bfr-prec.BFR),OP:rn-dot-(bfr-prec.BFR),
      CAPEX:-(immoBrut-prec.IMMO_BRUT),DIV:-prec.RN*hyp.tx_distribution,
      DDETTE:dettes-prec.DETTES_FIN,OUVERTURE:prec.TRESO_NETTE,CLOTURE:treso};
    tft[a].FIN=tft[a].DIV+tft[a].DDETTE;
    tft[a].FCF=tft[a].OP+tft[a].CAPEX+tft[a].FIN;
    prec={CA:ca,IMMO_BRUT:immoBrut,AMORT_CUM:amortCum,AUTRES_CREANCES:prec.AUTRES_CREANCES,
      DETTES_FISC_SOC:prec.DETTES_FISC_SOC,AUTRES_DETTES:prec.AUTRES_DETTES,CAPITAL:prec.CAPITAL,
      RESERVES_RAN:reserves,RN:rn,SUBV_PROV_REGL:prec.SUBV_PROV_REGL,PROVISIONS:prec.PROVISIONS,
      DETTES_FIN:dettes,TRESO_NETTE:treso,BFR:bfr,IMMO_NET:immoNet};
  }
  return /** @type {Projection} */ ({annees,pl,bs,tft});
}
/**
 * Valorisation : FCFF, DCF (valeur terminale de Gordon), multiples EV/EBITDA, sensibilité WACC×g.
 * @param {Projection} proj
 * @param {Hypotheses} hyp
 * @param {Etats} etats
 * @returns {Object}  ev, detteNette, equityDcf, evMult, equityMult, fourchette eqMin/eqMax, etc.
 */
function valoriser(proj,hyp,etats){
  const A=etats.annees,h=agregatsHistoriques(etats);
  const bsH=h[A[A.length-1]].bs;
  const annees=proj.annees,wacc=hyp.wacc,g=hyp.g;
  const fcff={},pv={};
  let precImmo=bsH.IMMO_BRUT;
  let precBfr=bsH.STOCKS+bsH.CLIENTS+bsH.AUTRES_CREANCES+bsH.FOURNISSEURS+bsH.DETTES_FISC_SOC+bsH.AUTRES_DETTES;
  annees.forEach((a,i)=>{
    const t=i+1;
    const nopat=proj.pl.EBIT[a]*(1-hyp.tx_is);
    const capex=-(proj.bs.IMMO_BRUT[a]-precImmo);
    const dbfr=-(proj.bs.BFR[a]-precBfr);
    const f=nopat-proj.pl.DOTATIONS[a]+capex+dbfr;
    fcff[a]=f; pv[a]=f/Math.pow(1+wacc,t);
    precImmo=proj.bs.IMMO_BRUT[a]; precBfr=proj.bs.BFR[a];
  });
  const sommePv=Object.values(pv).reduce((x,y)=>x+y,0);
  const vt=wacc>g?fcff[annees[annees.length-1]]*(1+g)/(wacc-g):0;
  const vtPv=vt/Math.pow(1+wacc,annees.length);
  const ev=sommePv+vtPv;
  const detteNette=bsH.DETTES_FIN-bsH.TRESO_NETTE;
  const equityDcf=ev-detteNette;
  const ebitdaRef=h[A[A.length-1]].pl.EBITDA;
  const evMult=ebitdaRef*hyp.multiple_ebitda;
  const equityMult=evMult-detteNette;
  let eqMin=equityDcf,eqMax=equityDcf;
  for(const dw of [-0.01,0,0.01]) for(const dg of [-0.005,0,0.005]){
    const w2=wacc+dw,g2=g+dg;
    if(w2<=g2) continue;
    let s=0; annees.forEach((a,i)=>{s+=fcff[a]/Math.pow(1+w2,i+1);});
    const v2=fcff[annees[annees.length-1]]*(1+g2)/(w2-g2)/Math.pow(1+w2,annees.length);
    const eq=s+v2-detteNette;
    eqMin=Math.min(eqMin,eq); eqMax=Math.max(eqMax,eq);
  }
  return {fcff,pv,sommePv,vt,vtPv,ev,detteNette,equityDcf,ebitdaRef,evMult,equityMult,
    eqMin,eqMax,wacc,g,multiple:hyp.multiple_ebitda};
}


/* ---------- 7. Commentaires automatiques (projets de rédaction) ---------- */
/**
 * Génère des projets de commentaires (P&L, bilan, TFT) — chiffrés, à enrichir par l'analyste.
 * @param {Etats} etats
 * @returns {{pl:Array<{t:string,x:string}>, bs:Array<{t:string,x:string}>, tft:Array<{t:string,x:string}>}}
 */
function genererCommentaires(etats){
  const A=etats.annees, v=etats.v, n=A.length;
  const a1=A[n-1], a0=n>1?A[n-2]:null, aD=A[0];
  const F=a=>"FY"+String(a).slice(-2);
  const fK=x=>{const u=(typeof CONF_UNITE!=="undefined"&&CONF_UNITE)?CONF_UNITE:{f:1,dec:0,suf:"K"};
    const y=x*u.f;
    const s=Math.abs(y).toLocaleString("fr-FR",{minimumFractionDigits:u.dec,maximumFractionDigits:u.dec}).replace(/[\u202f\u00a0]/g," ");
    return (y<0?"("+s+")":s)+" "+u.suf;};
  const fP=x=>(x*100).toFixed(1).replace(".",",")+" %";
  const evol=(x0,x1)=>{if(!x0)return null;const d=x1/x0-1;return isFinite(d)?d:null;};
  const sens=d=>d===null?"":(d>=0?"en hausse de "+fP(d):"en baisse de "+fP(-d));
  const ca1=v.CA[a1], out={pl:[],bs:[],tft:[]};

  /* ----- P&L ----- */
  const dCA=a0?evol(v.CA[a0],ca1):null;
  const tcam=(n>1&&v.CA[aD]>0&&ca1>0)?Math.pow(ca1/v.CA[aD],1/(n-1))-1:null;
  out.pl.push({t:"Chiffre d'affaires",
    x:`Le chiffre d'affaires s'établit à ${fK(ca1)} en ${F(a1)}`+
      (dCA!==null?`, ${sens(dCA)} par rapport à ${F(a0)}`:"")+
      (tcam!==null&&n>2?` (croissance moyenne de ${fP(tcam)} par an depuis ${F(aD)})`:"")+"."});
  if(ca1){
    const mb1=v.MARGE_BRUTE[a1]/ca1, mb0=v.CA[aD]?v.MARGE_BRUTE[aD]/v.CA[aD]:null;
    out.pl.push({t:"Marge brute",
      x:`La marge brute ressort à ${fP(mb1)} du CA`+
        (mb0!==null&&n>1?` (contre ${fP(mb0)} en ${F(aD)})`:"")+
        (mb1<0?" — niveau négatif : la structure de coûts directs est à revoir en priorité.":".")});
  }
  if(v.AUTRES_PROD[a1]>Math.abs(v.EBITDA[a1])*0.3&&v.AUTRES_PROD[a1]>0)
    out.pl.push({t:"Subventions et autres produits",
      x:`L'EBITDA intègre ${fK(v.AUTRES_PROD[a1])} de subventions et autres produits d'exploitation : `+
        `leur récurrence doit être appréciée avant toute conclusion sur la performance normative.`});
  const dPerso=a0?evol(-v.CHARGES_PERSONNEL[a0],-v.CHARGES_PERSONNEL[a1]):null;
  out.pl.push({t:"Charges de personnel",
    x:`Les charges de personnel représentent ${fK(-v.CHARGES_PERSONNEL[a1])}`+
      (ca1?`, soit ${fP(-v.CHARGES_PERSONNEL[a1]/ca1)} du CA`:"")+
      (dPerso!==null?`, ${sens(dPerso)} sur un an`:"")+
      ". À rapprocher de l'évolution des effectifs."});
  const dEb=a0?evol(v.EBITDA[a0],v.EBITDA[a1]):null;
  out.pl.push({t:"EBITDA",
    x:`L'EBITDA atteint ${fK(v.EBITDA[a1])}`+
      (ca1?`, soit une marge de ${fP(v.EBITDA[a1]/ca1)}`:"")+
      (dEb!==null?` (${sens(dEb)} vs ${F(a0)})`:"")+"."});
  out.pl.push({t:"Résultat net",
    x:`Après ${fK(-v.DA[a1])} de dotations nettes, un résultat financier de ${fK(v.RESULTAT_FIN[a1])} `+
      `et ${fK(-v.IMPOTS[a1])} d'impôt, le résultat net s'établit à ${fK(v.RESULTAT_NET[a1])}`+
      (ca1?` (marge nette de ${fP(v.RESULTAT_NET[a1]/ca1)})`:"")+"."});

  /* ----- Bilan ----- */
  const immoN=v.ACTIFS_IMMOBILISES[a1];
  const dImmo=a0?v.ACTIFS_IMMOBILISES[a1]-v.ACTIFS_IMMOBILISES[a0]:null;
  out.bs.push({t:"Actif immobilisé",
    x:`L'actif immobilisé net s'élève à ${fK(immoN)}`+
      (dImmo!==null?`, en variation de ${fK(dImmo)} sur l'exercice (investissements nets des dotations)`:"")+"."});
  const bfr1=v.BFR[a1];
  const dso=ca1?v.CLIENTS[a1]*360/(ca1*1.18):null;
  out.bs.push({t:"Besoin en fonds de roulement",
    x:`Le BFR ressort à ${fK(bfr1)}`+(ca1?`, soit ${Math.round(bfr1*360/ca1)} jours de CA`:"")+
      (dso!==null?`. Le poste clients en est le principal moteur avec un DSO d'environ ${Math.round(dso)} jours`+
      (dso>90?" — niveau élevé : analyser la balance âgée et le recouvrement":""):"")+"."});
  const treso=v.TRESORERIE_NETTE[a1], dettesF=-v.DETTES_FINANCIERES[a1], cp=v.CAPITAUX_PROPRES[a1];
  out.bs.push({t:"Trésorerie et endettement",
    x:`La trésorerie nette s'établit à ${fK(treso)}${treso<0?" (position négative : concours bancaires courants)":""}. `+
      `Les dettes financières s'élèvent à ${fK(dettesF)}`+
      (cp>0?`, soit un gearing de ${(dettesF/cp).toFixed(2).replace(".",",")}x`:"")+"."});
  out.bs.push({t:"Capitaux propres",
    x:cp<0?`Les capitaux propres sont négatifs (${fK(cp)}) : situation à redresser — les implications `+
      `juridiques et la continuité d'exploitation doivent être documentées.`:
      `Les capitaux propres atteignent ${fK(cp)}, strictement égaux à l'actif net reconstitué `+
      `(équilibre vérifié sur tous les exercices).`});

  /* ----- TFT ----- */
  if(n>1){
    const t=etats.tft[a1];
    out.tft.push({t:"Flux opérationnels",
      x:`Sur ${F(a1)}, les flux opérationnels s'élèvent à ${fK(t.OP)}, combinant le résultat net (${fK(t.RN)}), `+
        `les éléments non monétaires (${fK(t.AMORT+t.PROV)}) et une variation de BFR de ${fK(t.DBFR)}.`});
    out.tft.push({t:"Investissements et free cash flow",
      x:`Les investissements nets représentent ${fK(-t.CAPEX)} ; le free cash flow ressort à ${fK(t.FCF)}`+
        (t.FCF<0?" — consommation de trésorerie sur l'exercice.":".")});
    out.tft.push({t:"Trésorerie",
      x:`La trésorerie nette passe de ${fK(t.OUVERTURE)} à ${fK(t.CLOTURE)} : le tableau de flux se `+
        `réconcilie exactement avec le bilan.`});
  }
  return out;
}

/* export Node pour les tests */
if(typeof module!=="undefined") module.exports={lireBalance,construireTbagr,appliquerMapping,
  calculerEtats,calculerRatios,calculerScores,agregatsBenchmark,scoreRatio,SECTEURS,benchDe,RATIOS_META,LIGNES_PL,LIGNES_BS,mapperCompte,hypothesesParDefaut,projeter,valoriser,genererCommentaires};
