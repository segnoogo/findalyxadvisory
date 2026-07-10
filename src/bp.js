/* ============================================================
   Findalyx Advisory — Business Plan v2 & Valorisation v2
   Modèle financier complet : P&L détaillé, bilan bouclé par la
   trésorerie, TFT officiel prévisionnel, dette avec tableau
   d'amortissement, scénarios, valorisation multi-méthodes.
   Montants internes en K FCFA.
   ============================================================ */

/* ---------- hypothèses par défaut, dérivées de l'historique ---------- */
function hypothesesBP(etats, lignesPerso){
  const A=etats.annees, v=etats.v, n=A.length, a1=A[n-1], a0=n>1?A[n-2]:a1;
  const ca1=v.CA[a1]||1;
  const born=(x,mn,mx,def)=>isFinite(x)?Math.min(mx,Math.max(mn,x)):def;
  const tcam=n>1&&v.CA[A[0]]>0&&ca1>0?Math.pow(ca1/v.CA[A[0]],1/(n-1))-1:0.05;

  /* frais généraux ligne par ligne (standards + personnalisées OPEX) */
  const OPEX_STD=["AUTRES_ACHATS","SOUS_TRAITANCE","LOCATIONS","ENTRETIEN","ASSURANCES","PUBLICITE","TELECOM",
    "FRAIS_BANCAIRES","HONORAIRES","PERSONNEL_EXT","TRANSPORTS","AUTRES_SERV_EXT","IMPOTS_TAXES","AUTRES_CHARGES"];
  const persoOpex=(lignesPerso||[]).filter(p=>p.agregat==="OPEX").map(p=>p.code);
  const libOf=c=>{
    const d=(typeof LIGNES_PL!=="undefined"?LIGNES_PL:[]).find(x=>x.code===c);
    if(d)return d.lib;
    const lp=(lignesPerso||[]).find(x=>x.code===c);
    return lp?lp.lib:c;
  };
  const opex=[...OPEX_STD,...persoOpex]
    .map(c=>({code:c,lib:libOf(c),hist:v[c]?v[c][a1]:0}));

  const brut=Math.max(v.ACTIFS_IMMOBILISES[a1]-v.AMORT_DEPREC[a1],0);  /* base BRUTE (net + amort. cumulés) — le taux d'amort. s'applique au brut */
  const dotHist=-(v.DA[a1]||0);
  const detteH=-v.DETTES_FINANCIERES[a1];
  const fraisFinH=-(v.RESULTAT_FIN[a1]<0?v.RESULTAT_FIN[a1]:0);
  const cd=v.COUTS_DIRECTS[a1], op=v.OPEX[a1];
  const rao=v.EBIT[a1]+v.RESULTAT_FIN[a1];
  /* provisions pour risques & charges (montant positif) : passif assimilé à de la dette
     dans le pont valeur d'entreprise → fonds propres */
  const provRC=Math.max(0,-((v.PROVISIONS_RC&&v.PROVISIONS_RC[a1])||0));

  return {
    nb:5, scenario:"base",
    scenarios:{
      base:{lab:"Central",dCA:0,dMarge:0,dJours:0},
      haut:{lab:"Optimiste",dCA:0.03,dMarge:0.02,dJours:-10},
      bas:{lab:"Prudent",dCA:-0.03,dMarge:-0.02,dJours:10}
    },
    /* activité */
    inflation:0.03,
    caCroiss:Array(5).fill(born(tcam,-0.3,0.5,0.05)),
    coutsDirects_pct:born(ca1?-cd/ca1:0.3,0,0.95,0.3),
    autresProd_montant:v.AUTRES_PROD[a1], autresProd_croiss:0,
    personnel_croiss:born(n>1&&v.CHARGES_PERSONNEL[a0]<0?v.CHARGES_PERSONNEL[a1]/v.CHARGES_PERSONNEL[a0]-1:0.03,-0.2,0.3,0.03),
    opex:opex.map(o=>({code:o.code,lib:o.lib,mode:"inflation",
      pct:born(ca1?Math.abs(o.hist)/ca1:0.02,0,0.6,0.02),croiss:0.03,base:Math.abs(o.hist)})),
    /* investissement & amortissements */
    capex:Array(5).fill(Math.round(Math.max(dotHist,0))),
    amort_taux:born(brut>0?dotHist/brut:0.1,0.02,0.4,0.10),
    /* BFR en jours. DSO/DPO exprimés en jours de CA/achats TTC (TVA 18 %), cohérents avec
       les ratios affichés et l'ancien moteur ; DIO en jours de coûts HT (stocks au coût). */
    convTTC:true,
    dso:born(v.CLIENTS[a1]/(ca1*1.18)*360,0,360,45),
    dio:born(cd?v.STOCKS[a1]/Math.abs(cd)*360:0,0,360,30),
    dpo:born((cd+op)?-v.FOURNISSEURS[a1]/(Math.abs(cd+op)*1.18)*360:0,0,360,30),
    /* dettes fiscales & sociales = exploitation → projetées en % du CA (croissent avec l'activité) */
    dettesFiscSoc_pct:born(ca1?-(v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1])/ca1:0.03,0,1,0.03),
    /* autres créances/dettes = hors exploitation (HAO inclus) → FIGÉES à leur niveau historique.
       Un BP projette le cycle d'exploitation, pas le résiduel non piloté par l'activité. */
    autresCreances_fixe:v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1]+v.HAO_ACTIF[a1],
    autresDettes_fixe:v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_PASSIF[a1],
    /* trésorerie & financement court terme : la ligne CT (découvert) couvre le besoin
       sous le seuil de cash ; intérêts sur solde d'ouverture (bouclage non circulaire) */
    seuilCash:0,
    decouvert_taux:born((detteH>0?fraisFinH/detteH:0.08)+0.03,0.03,0.25,0.12),
    /* report déficitaire : stock initial de déficits imputables sur les bénéfices futurs */
    reportDeficitaire:0,
    reportDef_horizon:3,   /* péremption : les déficits ordinaires se reportent sur 3 exercices (UEMOA/OHADA) */
    imf_taux:0.005,        /* impôt minimum forfaitaire (part du CA HT) — dû même en cas de perte */
    /* financement */
    dette_taux:born(detteH>0?fraisFinH/detteH:0.08,0.02,0.2,0.08),
    dette_dureeResiduelle:5,
    nouveauxEmprunts:Array(5).fill(0),
    emprunt_taux:0.08, emprunt_duree:5,
    produitsFin_montant:v.RESULTAT_FIN[a1]>0?v.RESULTAT_FIN[a1]:0,
    dividendes_payout:0,
    /* impôt */
    is_taux:born(rao>0?-v.IMPOTS[a1]/rao:0.30,0.15,0.40,0.30),
    /* valorisation */
    valo:{
      rf:0.06, primeMarche:0.07, beta:1.0,
      /* build-up du coût des fonds propres adapté PME OHADA : prime de risque pays
         (spread souverain), prime de taille, prime d'illiquidité (non cotée) */
      primePays:0.03, primeTaille:0.02, primeIlliquidite:0.015,
      coutDette:born(detteH>0?fraisFinH/detteH:0.08,0.02,0.2,0.08),
      poidsDette:born(detteH/((detteH+Math.max(v.CAPITAUX_PROPRES[a1],1))||1),0,0.8,0.2),
      g:0.03, midYear:false,   /* convention d'actualisation : fin d'année (défaut) ou mi-année */
      /* valeur terminale : "gordon" (croissance perpétuelle g) ou "exit" (multiple de sortie EV/EBITDA) */
      tvMode:"gordon", exitMultiple:5.5,
      multiplesComparables:{min:4,central:5.5,max:7},
      multiplesTransactions:{min:5,central:6.5,max:8},
      /* pondération des méthodes retenues (DCF, comparables, transactions, actif net) — en % */
      poids:{dcf:45,comp:20,trans:20,anr:15},
      /* pont valeur d'entreprise → fonds propres (ajustements hors dette nette).
         Pré-rempli avec les provisions R&C (dette-like) ; l'utilisateur peut l'éditer/retirer. */
      bridge: provRC>0.5?[{lib:"Provisions pour risques & charges",montant:-Math.round(provRC)}]:[],
      anrAjustements:[]
    }
  };
}

/* ---------- projection complète ---------- */
function projeterBP(etats,H,scenario){
  const sc=H.scenarios[scenario||H.scenario]||H.scenarios.base;
  const A0=etats.annees, v=etats.v, a1=A0[A0.length-1];
  const N=H.nb||5;
  const AP=Array.from({length:N},(_,i)=>a1+1+i);
  const P={annees:AP, scenario:sc.lab,
    pl:{}, bs:{}, tft:{}, dette:{}};
  const pl=c=>P.pl[c]={}, bs=c=>P.bs[c]={};
  ["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","OPEX_TOTAL","CHARGES_PERSONNEL",
   "EBITDA","DA","EBIT","PRODUITS_FIN","FRAIS_FIN","RESULTAT_FIN","EBT","IS","RN"].forEach(pl);
  P.pl.OPEX_DETAIL={};
  H.opex.forEach(o=>P.pl.OPEX_DETAIL[o.code]={lib:o.lib,vals:{}});
  ["IMMO_BRUT","AMORT_CUM","IMMO_NET","STOCKS","CLIENTS","AUTRES_CREANCES",
   "FOURNISSEURS","DETTES_FISC_SOC","AUTRES_DETTES","BFR","CP","DETTE","PROVISIONS","TRESO",
   "LIGNE_CT","TRESO_ACTIVE"].forEach(bs);

  /* point de départ (dernier exercice réel) */
  let caP=v.CA[a1];
  let persP=v.CHARGES_PERSONNEL[a1];        /* négatif */
  let autresProdP=H.autresProd_montant;
  let brut=v.ACTIFS_IMMOBILISES[a1]-v.AMORT_DEPREC[a1]; /* brut = net - amortissements (négatifs) */
  let amortCum=-v.AMORT_DEPREC[a1];         /* positif */
  let cp=v.CAPITAUX_PROPRES[a1];
  let detteExist=-v.DETTES_FINANCIERES[a1]; /* positif */
  const provisions=-v.PROVISIONS_RC[a1];
  let bfrP=(v.CLIENTS[a1]+v.STOCKS[a1]+v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1]
           +v.FOURNISSEURS[a1]+v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1]
           +v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_ACTIF[a1]+v.HAO_PASSIF[a1]);
  let tresoP=v.TRESORERIE_NETTE[a1];
  let rnPrec=v.RESULTAT_NET[a1];
  const amortAnnuelExist=H.dette_dureeResiduelle>0?detteExist/H.dette_dureeResiduelle:detteExist;
  const emprunts=[];                        /* {solde,taux,amort} des nouveaux emprunts */
  let ligneCT=0;                            /* concours bancaires courants (découvert), positif */
  const seuilCash=H.seuilCash||0;
  /* déficits reportables avec péremption : chaque poche garde son nombre d'exercices restants */
  const horizonDef=H.reportDef_horizon||3;
  let deficits=(H.reportDeficitaire>0)?[{montant:H.reportDeficitaire,resteAns:horizonDef}]:[];

  AP.forEach((a,i)=>{
    /* --- P&L --- */
    caP=caP*(1+(H.caCroiss[i]||0)+sc.dCA);
    const cd=-caP*Math.min(0.98,Math.max(0,H.coutsDirects_pct-sc.dMarge));
    autresProdP=i===0?H.autresProd_montant*(1+H.autresProd_croiss):autresProdP*(1+H.autresProd_croiss);
    persP=persP*(1+H.personnel_croiss);
    let opexTot=0;
    H.opex.forEach(o=>{
      const tx=o.mode==="inflation"?(H.inflation||0):o.croiss;
      const m=o.mode==="pctCA"?-caP*o.pct:-o.base*Math.pow(1+tx,i+1);
      P.pl.OPEX_DETAIL[o.code].vals[a]=m;opexTot+=m;
    });
    /* immobilisations & dotations */
    const capex=H.capex[i]||0;
    brut+=capex;
    const dot=Math.min(H.amort_taux*brut,Math.max(brut-amortCum,0));
    amortCum+=dot;
    /* dette : existante + nouveaux emprunts */
    const soldeExistDebut=detteExist;
    const rembExist=Math.min(amortAnnuelExist,detteExist);
    detteExist-=rembExist;
    const nouveau=H.nouveauxEmprunts[i]||0;
    if(nouveau>0)emprunts.push({solde:nouveau,taux:H.emprunt_taux,amort:nouveau/(H.emprunt_duree||5)});
    let interets=H.dette_taux*(soldeExistDebut+detteExist)/2;
    let rembNouv=0, soldeNouv=0;
    emprunts.forEach(e=>{
      const sDebut=e.solde;
      const r=Math.min(e.amort,e.solde);
      /* le nouvel emprunt de l'année n'est remboursé qu'à partir de l'année suivante */
      const rEff=(e.solde===nouveau&&H.nouveauxEmprunts[i]>0&&sDebut===nouveau)?0:r;
      interets+=e.taux*(sDebut+(sDebut-rEff))/2;
      e.solde-=rEff;rembNouv+=rEff;soldeNouv+=e.solde;
    });
    const interetsCT=H.decouvert_taux*ligneCT;   /* intérêts du découvert sur solde d'ouverture */
    const dette=detteExist+soldeNouv;
    const ebitda=caP+cd+autresProdP+opexTot+persP;
    const ebit=ebitda-dot;
    const pf=H.produitsFin_montant;
    const rf=pf-interets-interetsCT;
    const ebt=ebit+rf;
    /* report déficitaire : impute les pertes antérieures (FIFO) sur le bénéfice imposable */
    let baseIS=ebt;
    if(ebt>0){let dispo=ebt;
      deficits.forEach(d=>{const im=Math.min(d.montant,dispo);d.montant-=im;dispo-=im;});
      deficits=deficits.filter(d=>d.montant>0.01);baseIS=dispo;}
    /* impôt dû = max(IS sur le bénéfice imposable, impôt minimum forfaitaire sur le CA) :
       l'IMF est un plancher qui s'applique même en exercice déficitaire */
    const isBenef=baseIS>0?H.is_taux*baseIS:0;
    const imf=(H.imf_taux||0)*caP;
    const impots=-Math.max(isBenef,imf);
    const rn=ebt+impots;
    /* vieillissement : les poches perdent un exercice et périment ; la perte de l'année entre après */
    deficits.forEach(d=>d.resteAns--);
    deficits=deficits.filter(d=>d.resteAns>0);
    if(ebt<0)deficits.push({montant:-ebt,resteAns:horizonDef});
    /* --- BFR --- */
    const clients=caP*1.18*(H.dso+sc.dJours)/360;                    /* DSO en jours de CA TTC (TVA 18 %) */
    const stocks=Math.abs(cd)*H.dio/360;                             /* DIO en jours de coûts HT (stocks au coût) */
    const fournisseurs=-(Math.abs(cd)+Math.abs(opexTot))*1.18*H.dpo/360;  /* DPO en jours d'achats TTC */
    const dettesFiscSoc=-caP*H.dettesFiscSoc_pct;   /* exploitation : croît avec le CA */
    const autresCr=H.autresCreances_fixe;            /* hors exploitation : figé (HAO inclus) */
    const autresDet=H.autresDettes_fixe;             /* hors exploitation : figé (HAO inclus) */
    const bfr=clients+stocks+fournisseurs+dettesFiscSoc+autresCr+autresDet;
    /* --- capitaux propres & dividendes --- */
    const div=H.dividendes_payout>0&&rnPrec>0?H.dividendes_payout*rnPrec:0;
    cp=cp+rn-div;
    /* --- trésorerie = bouclage du bilan (position nette) --- */
    const immoNet=brut-amortCum;
    const tresoNette=cp+dette+provisions-immoNet-bfr;
    /* financement du besoin : la ligne CT (découvert) couvre le manque sous le seuil de cash ;
       cash-sweep automatique quand la trésorerie repasse au-dessus (ligneCT ramenée à 0) */
    ligneCT=tresoNette<seuilCash?seuilCash-tresoNette:0;
    const tresoActive=tresoNette+ligneCT;   /* = seuilCash si tiré, sinon la position nette */
    const treso=tresoNette;                 /* trésorerie NETTE = variable de bouclage (inchangée) */
    /* --- TFT officiel prévisionnel --- */
    const dBfr=bfr-bfrP;
    P.tft[a]={ZA:tresoP,FA:rn+dot,FB:0,FC:-(stocks-(P.bs.STOCKS[AP[i-1]]!==undefined?P.bs.STOCKS[AP[i-1]]:v.STOCKS[a1])),
      FD:null,FE:null,ZB:rn+dot-dBfr,
      FF:0,FG:-capex,FH:0,FI:0,ZC:-capex,
      FK:0,FL:0,FN:-div,ZD:-div,
      FO:nouveau-rembExist-rembNouv,ZE:nouveau-rembExist-rembNouv,
      ZF:0,ZG:0,
      RN:rn,AMORT:dot,PROV:0,DBFR:-dBfr,OP:rn+dot-dBfr,CAPEX:-capex,
      FIN:-div+nouveau-rembExist-rembNouv,FCF:0,OUVERTURE:tresoP,CLOTURE:treso};
    const t=P.tft[a];
    t.FD=-((clients+autresCr)-((P.bs.CLIENTS[AP[i-1]]!==undefined)
        ?(P.bs.CLIENTS[AP[i-1]]+P.bs.AUTRES_CREANCES[AP[i-1]])
        :(v.CLIENTS[a1]+v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1]+v.HAO_ACTIF[a1])));
    t.FE=-(((fournisseurs+dettesFiscSoc+autresDet))-((P.bs.FOURNISSEURS[AP[i-1]]!==undefined)
        ?(P.bs.FOURNISSEURS[AP[i-1]]+P.bs.DETTES_FISC_SOC[AP[i-1]]+P.bs.AUTRES_DETTES[AP[i-1]])
        :(v.FOURNISSEURS[a1]+v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1]+v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1]+v.HAO_PASSIF[a1])));
    /* autres créances/dettes (HAO inclus) figées → aucune bascule HAO à opérer */
    t.FB=0;
    t.ZB=t.FA+t.FB+t.FC+t.FD+t.FE;
    t.ZF=t.ZB+t.ZC+t.ZD+t.ZE;
    t.ZG=t.ZA+t.ZF;
    /* agrégats présentation simplifiée du TFT (le prévisionnel connaît le brut emprunt/remb.) */
    t.VAR_CREANCES=t.FD+t.FB; t.ACQUIS_IMMO=t.FF+t.FG+t.FH; t.CESSION_IMMO=t.FI;
    t.EMPRUNT=nouveau; t.REMBOURS=-(rembExist+rembNouv); t.ZFIN=t.ZD+t.ZE;
    t.FCF=t.ZF;t.OP=t.ZB;
    /* --- stocker --- */
    P.pl.CA[a]=caP;P.pl.COUTS_DIRECTS[a]=cd;P.pl.MARGE_BRUTE[a]=caP+cd;
    P.pl.AUTRES_PROD[a]=autresProdP;P.pl.OPEX_TOTAL[a]=opexTot;P.pl.CHARGES_PERSONNEL[a]=persP;
    P.pl.EBITDA[a]=ebitda;P.pl.DA[a]=-dot;P.pl.EBIT[a]=ebit;
    P.pl.PRODUITS_FIN[a]=pf;P.pl.FRAIS_FIN[a]=-(interets+interetsCT);P.pl.RESULTAT_FIN[a]=rf;
    P.pl.EBT[a]=ebt;P.pl.IS[a]=impots;P.pl.RN[a]=rn;
    P.bs.IMMO_BRUT[a]=brut;P.bs.AMORT_CUM[a]=-amortCum;P.bs.IMMO_NET[a]=immoNet;
    P.bs.STOCKS[a]=stocks;P.bs.CLIENTS[a]=clients;P.bs.AUTRES_CREANCES[a]=autresCr;
    P.bs.FOURNISSEURS[a]=fournisseurs;P.bs.DETTES_FISC_SOC[a]=dettesFiscSoc;P.bs.AUTRES_DETTES[a]=autresDet;P.bs.BFR[a]=bfr;
    P.bs.CP[a]=cp;P.bs.DETTE[a]=dette;P.bs.PROVISIONS[a]=provisions;P.bs.TRESO[a]=treso;
    P.bs.LIGNE_CT[a]=ligneCT;P.bs.TRESO_ACTIVE[a]=tresoActive;
    P.dette[a]={ouverture:soldeExistDebut+ (soldeNouv+rembNouv-nouveau),tirage:nouveau,
      remboursement:rembExist+rembNouv,interets,interetsCT,ligneCT,cloture:dette,div};
    /* contrôle de bouclage */
    P.tft[a].ECART=t.ZG-treso;
    bfrP=bfr;tresoP=treso;rnPrec=rn;
  });
  /* alias de compatibilité (rapports, anciens exports) */
  P.pl.AUTRES_PRODUITS=P.pl.AUTRES_PROD;P.pl.PERSONNEL=P.pl.CHARGES_PERSONNEL;
  P.pl.AUTRES_OPEX=P.pl.OPEX_TOTAL;P.pl.DOTATIONS=P.pl.DA;P.pl.ACHATS=P.pl.COUTS_DIRECTS;
  P.bs.TRESO_NETTE=P.bs.TRESO;
  return P;
}

/* ===========================================================================
   BP SANS HISTORIQUE — projection à partir d'un modèle d'inducteurs.
   Produit le MÊME objet P que projeterBP (mêmes clés pl/bs/tft/dette) : tout
   l'aval (valorisation, covenants, seuil, exports) est réutilisé tel quel.
   Réutilise les formules de bouclage/TFT prouvées de projeterBP (mirroring).
   =========================================================================== */
/* volume d'une ligne = enchaînement d'inducteurs (× ou ÷) ; unité contenant « % » = ratio */
function volInducteurs(rows,i){
  var v=1;
  (rows||[]).forEach(function(r){
    var pct=String(r.unit||"").indexOf("%")>=0, base;
    if(r.mode==="yearly"){ var x=(r.vals&&r.vals[i]!=null)?+r.vals[i]:0; base=pct?x/100:x; }
    else { var b=pct?(+r.val||0)/100:(+r.val||0); base=b*Math.pow(1+(+r.g||0)/100,i); }
    v=(r.op==="d")?(base?v/base:0):v*base;
  });
  return v;
}
/* valeur d'un poste (prix, charge…) : saisie par année ou valeur an 1 + croissance */
function valAnnee(o,i){
  if(!o) return 0;
  if(o.mode==="yearly") return (o.vals&&o.vals[i]!=null)?+o.vals[i]:0;
  return (+o.val||0)*Math.pow(1+(+o.g||0)/100,i);
}
function projeterModele(M,scenario){
  var N=M.nb||5, startY=M.anneeDepart||2025;
  var AP=Array.from({length:N},function(_,i){return startY+i;});
  /* scénario : facteur global sur le volume (CA), l'efficience des coûts et les délais du BFR.
     scenario (param) permet de projeter un scénario précis sans changer le scénario actif du dossier. */
  var scKey=scenario||M.scenario||"central";
  var SCN=(M.scenarios&&M.scenarios[scKey])||{lab:"Central",dCA:0,dMarge:0,dJours:0};
  var scLab=SCN.lab||"Central";
  var fCA=1+(+SCN.dCA||0), fCout=1-(+SCN.dMarge||0), fJours=1+(+SCN.dJours||0);
  var P={annees:AP,scenario:scLab,scenarioKey:scKey,pl:{},bs:{},tft:{},dette:{}};
  ["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","OPEX_TOTAL","CHARGES_PERSONNEL","EBITDA","DA","EBIT","PRODUITS_FIN","FRAIS_FIN","RESULTAT_FIN","EBT","IS","RN"].forEach(function(c){P.pl[c]={};});
  P.pl.OPEX_DETAIL={};
  ["IMMO_BRUT","AMORT_CUM","IMMO_NET","STOCKS","CLIENTS","AUTRES_CREANCES","FOURNISSEURS","DETTES_FISC_SOC","AUTRES_DETTES","BFR","CP","DETTE","PROVISIONS","TRESO","LIGNE_CT","TRESO_ACTIVE"].forEach(function(c){P.bs[c]={};});
  var infl=M.inflation||0.03, bfrH=M.bfr||{dso:30,dio:45,dpo:30};
  var isTx=(M.is_taux!=null?M.is_taux:0.30);
  /* Les montants du modèle sont SAISIS EN FCFA (prix unitaires, charges, CAPEX, financement).
     La base interne de l'app est le KFCFA (uni().f : F=1000, K=1, M=1/1000, fmt = valeur×f).
     → on convertit tout montant FCFA en base KFCFA (÷1000) pour que l'affichage soit correct
     dans TOUTES les unités (sinon tout est 1000× trop grand, invisible en K mais faux en M). */
  var SC=1000;
  var fin=M.financement||{};
  var dTaux=(fin.emprunt&&+fin.emprunt.taux)||0.08, dDuree=(fin.emprunt&&+fin.emprunt.duree)||5;
  var partFP=(fin.partFP!=null?+fin.partFP:0.30);
  var moisBFR=(fin.moisBFR!=null?+fin.moisBFR:3);
  /* Période de construction (années) : 0 = pas de construction (CAPEX en année 1, exploitation dès l'année 1).
     Pendant la construction : investissements + financement, PAS de revenus/charges ; amortissement et
     remboursement DIFFÉRÉS à la mise en service ; les intérêts courent et sont CAPITALISÉS dans la dette (IDC).
     AUCUN bilan d'ouverture : tout se construit à partir de l'année 1 (project-finance simplifié). */
  var Nc=Math.max(0,Math.min((M.dureeConstruction!=null?Math.round(+M.dureeConstruction):0),N-1));
  var anneeExploit=Nc+1;   /* 1ʳᵉ année d'exploitation (base 1 dans AP) */
  /* CAPEX : {montant,duree,annee}. annee>=1 (0 hérité → 1). Amortissement à partir de max(annee, mise en service). */
  var capex=(M.capex||[]).map(function(c){var an=Math.round(+c.annee||0); if(an<1)an=1; return {montant:(c.montant!=null?+c.montant:(+c.nombre||0)*(+c.coutUnitaire||0))/SC,duree:+c.duree||5,annee:an,amorti:0,mes:Math.max(an,anneeExploit)};});
  /* coûts de la 1ʳᵉ année d'exploitation → BFR de démarrage (mode auto) */
  var coutsD1=0, charges1=0;
  (M.revenus||[]).forEach(function(L){ var vol=volInducteurs(L.rows,0)*fCA, prix=valAnnee(L.prix,0), caL=vol*prix/SC; var cm=(L.cout&&L.cout.m)||"pct", cv=+((L.cout||{}).val)||0; coutsD1+=((cm==="unit")?vol*cv/SC:caL*cv/100)*fCout; });
  (M.chargesFixes||[]).forEach(function(c){ charges1+=valAnnee({val:(c.montant!=null?c.montant:c.val),g:c.g,mode:c.mode,vals:c.vals},0)/SC; });
  var bfrDem=(moisBFR/12)*(coutsD1+charges1);
  /* montage initial = CAPEX jusqu'à la mise en service (incluse) + BFR de démarrage ; subvention en déduction */
  var capexFinance=capex.filter(function(c){return c.annee<=anneeExploit;}).reduce(function(s,c){return s+c.montant;},0);
  var subv=(+fin.subvention||0)/SC;
  var capital, detteBase;
  if(fin.mode==="auto"){ var baseBesoin=Math.max(0,capexFinance+bfrDem-subv); capital=baseBesoin*partFP; detteBase=baseBesoin*(1-partFP); }
  else { capital=((+fin.capital||0)+(+fin.apports||0))/SC; detteBase=((fin.emprunt&&+fin.emprunt.montant)||0)/SC; }

  var brut=0, amortCum=0, cp=0, provisions=0, detteSolde=0, ligneCT=0, bfrP=0, tresoP=0;
  var idcTotal=0, idcAmorti=0, idcDuree=(dDuree>0?dDuree:5), amortAnnuel=0;
  var horizonDef=M.reportDef_horizon||3;
  var deficits=(M.reportDeficitaire>0)?[{montant:+M.reportDeficitaire,resteAns:horizonDef}]:[];

  AP.forEach(function(a,i){
    var py=i+1;                 /* année du plan (base 1) */
    var isOp=(py>=anneeExploit);
    var oi=py-Nc-1;             /* indice d'exploitation (0-based), utilisé si isOp */
    /* --- financement tiré en année 1 : capital + subvention en CP, dette de base --- */
    var capInj=0, subvInj=0, tirageDette=0;
    if(py===1){ capInj=capital; subvInj=subv; tirageDette=detteBase; cp+=capital+subv; detteSolde+=detteBase; }
    /* --- revenus & coûts directs (uniquement en exploitation) --- */
    var ca=0, coutsD=0;
    if(isOp){ (M.revenus||[]).forEach(function(L){
      var vol=volInducteurs(L.rows,oi)*fCA, prix=valAnnee(L.prix,oi), caL=vol*prix/SC;
      ca+=caL;
      var cm=(L.cout&&L.cout.m)||"pct", cv=+((L.cout||{}).val)||0;
      coutsD += ((cm==="unit") ? vol*cv*Math.pow(1+infl,oi)/SC : caL*cv/100)*fCout;
    }); }
    var cd=-coutsD;
    var autresProd=isOp?valAnnee(M.autresProd,oi)/SC:0;
    /* --- charges fixes (uniquement en exploitation) → OPEX / personnel --- */
    var opexTot=0, persTot=0;
    if(isOp){ (M.chargesFixes||[]).forEach(function(c,ci){ var m=-valAnnee({val:(c.montant!=null?c.montant:c.val),g:c.g,mode:c.mode,vals:c.vals},oi)/SC;
      if(c.personnel)persTot+=m;
      else { opexTot+=m; var code="CF"+ci; if(!P.pl.OPEX_DETAIL[code])P.pl.OPEX_DETAIL[code]={lib:(c.name||("Charge "+(ci+1))),vals:{}}; P.pl.OPEX_DETAIL[code].vals[a]=m; }
    }); }
    /* --- CAPEX de l'année --- */
    var capexAn=capex.filter(function(c){return c.annee===py;}).reduce(function(s,c){return s+c.montant;},0);
    brut+=capexAn;
    /* --- IDC : intérêts pendant la construction, capitalisés dans la dette ET l'immo (immo en cours) --- */
    var idc=0;
    if(!isOp){ idc=dTaux*detteSolde; detteSolde+=idc; brut+=idc; idcTotal+=idc; }
    /* échéancier de la dette figé à la mise en service (dette = base + IDC capitalisés) */
    if(py===anneeExploit){ amortAnnuel=(dDuree>0?detteSolde/dDuree:detteSolde); }
    /* --- amortissements : chaque poste à partir de sa mise en service ; IDC à partir de l'exploitation --- */
    var dot=0;
    capex.forEach(function(c){ if(py>=c.mes){ var restant=c.montant-c.amorti; if(restant>0.01){ var d=Math.min(c.montant/c.duree,restant); c.amorti+=d; dot+=d; } } });
    if(isOp && idcTotal>0.01 && idcAmorti<idcTotal-0.01){ var di=Math.min(idcTotal/idcDuree, idcTotal-idcAmorti); idcAmorti+=di; dot+=di; }
    amortCum+=dot;
    /* --- dette : remboursement à partir de l'exploitation ; en construction, IDC (pas d'intérêts payés) --- */
    var soldeDebut=detteSolde, remb=0;
    if(isOp){ remb=Math.min(amortAnnuel,detteSolde); detteSolde-=remb; }
    var interets=isOp?dTaux*(soldeDebut+detteSolde)/2:0;
    var interetsCT=(M.decouvert_taux||0.12)*ligneCT;
    var dette=detteSolde;
    /* --- cascade P&L --- */
    var ebitda=ca+cd+autresProd+opexTot+persTot;
    var ebit=ebitda-dot;
    var pf=isOp?valAnnee(M.produitsFin,oi)/SC:0;
    var rf=pf-interets-interetsCT;
    var ebt=ebit+rf;
    var baseIS=ebt;
    if(ebt>0){var dispo=ebt; deficits.forEach(function(d){var im=Math.min(d.montant,dispo);d.montant-=im;dispo-=im;}); deficits=deficits.filter(function(d){return d.montant>0.01;}); baseIS=dispo;}
    var isBenef=baseIS>0?isTx*baseIS:0, imf=(M.imf_taux||0)*ca;
    var impots=-Math.max(isBenef,imf);
    var rn=ebt+impots;
    deficits.forEach(function(d){d.resteAns--;}); deficits=deficits.filter(function(d){return d.resteAns>0;});
    if(ebt<0)deficits.push({montant:-ebt,resteAns:horizonDef});
    /* --- BFR (uniquement en exploitation) --- */
    var clients=isOp?ca*1.18*((bfrH.dso||0)*fJours)/360:0;
    var stocks=isOp?Math.abs(cd)*((bfrH.dio||0)*fJours)/360:0;
    var fournisseurs=isOp?-(Math.abs(cd)+Math.abs(opexTot)+Math.abs(persTot))*1.18*(bfrH.dpo||0)/360:0;
    var bfr=clients+stocks+fournisseurs;
    /* --- CP & trésorerie de bouclage --- */
    var div=0; cp=cp+rn-div;
    var immoNet=brut-amortCum;
    var tresoNette=cp+dette+provisions-immoNet-bfr;
    ligneCT=tresoNette<0?-tresoNette:0;
    var tresoActive=tresoNette+ligneCT, treso=tresoNette;
    /* --- TFT --- */
    var prevStk=(P.bs.STOCKS[AP[i-1]]!==undefined)?P.bs.STOCKS[AP[i-1]]:0;
    var prevCliCr=(P.bs.CLIENTS[AP[i-1]]!==undefined)?(P.bs.CLIENTS[AP[i-1]]+P.bs.AUTRES_CREANCES[AP[i-1]]):0;
    var prevFrnDet=(P.bs.FOURNISSEURS[AP[i-1]]!==undefined)?(P.bs.FOURNISSEURS[AP[i-1]]+P.bs.DETTES_FISC_SOC[AP[i-1]]+P.bs.AUTRES_DETTES[AP[i-1]]):0;
    var dBfr=bfr-bfrP;
    var t={ZA:tresoP,FA:rn+dot,FB:0,FC:-(stocks-prevStk),FD:-(clients-prevCliCr),FE:-(fournisseurs-prevFrnDet),ZB:0,
      FF:0,FG:-capexAn,FH:0,FI:0,ZC:0,FK:capInj,FL:subvInj,FN:-div,ZD:0,EMPRUNT:tirageDette,REMBOURS:-remb,ZE:0,ZFIN:0,ZF:0,ZG:0,
      RN:rn,AMORT:dot,PROV:0,DBFR:-dBfr,OP:0,CAPEX:-capexAn,FIN:0,FCF:0,IDC:idc,OUVERTURE:tresoP,CLOTURE:treso};
    t.ZB=t.FA+t.FB+t.FC+t.FD+t.FE; t.ZC=t.FF+t.FG+t.FH+t.FI;
    t.ZD=t.FK+t.FL+t.FN; t.ZE=t.EMPRUNT+t.REMBOURS; t.ZFIN=t.ZD+t.ZE;
    t.ZF=t.ZB+t.ZC+t.ZFIN; t.ZG=t.ZA+t.ZF;
    t.VAR_CREANCES=t.FD+t.FB; t.ACQUIS_IMMO=t.FF+t.FG+t.FH; t.CESSION_IMMO=t.FI; t.FCF=t.ZF; t.OP=t.ZB;
    /* --- stocker --- */
    P.pl.CA[a]=ca;P.pl.COUTS_DIRECTS[a]=cd;P.pl.MARGE_BRUTE[a]=ca+cd;
    P.pl.AUTRES_PROD[a]=autresProd;P.pl.OPEX_TOTAL[a]=opexTot;P.pl.CHARGES_PERSONNEL[a]=persTot;
    P.pl.EBITDA[a]=ebitda;P.pl.DA[a]=-dot;P.pl.EBIT[a]=ebit;
    P.pl.PRODUITS_FIN[a]=pf;P.pl.FRAIS_FIN[a]=-(interets+interetsCT);P.pl.RESULTAT_FIN[a]=rf;
    P.pl.EBT[a]=ebt;P.pl.IS[a]=impots;P.pl.RN[a]=rn;
    P.bs.IMMO_BRUT[a]=brut;P.bs.AMORT_CUM[a]=-amortCum;P.bs.IMMO_NET[a]=immoNet;
    P.bs.STOCKS[a]=stocks;P.bs.CLIENTS[a]=clients;P.bs.AUTRES_CREANCES[a]=0;
    P.bs.FOURNISSEURS[a]=fournisseurs;P.bs.DETTES_FISC_SOC[a]=0;P.bs.AUTRES_DETTES[a]=0;P.bs.BFR[a]=bfr;
    P.bs.CP[a]=cp;P.bs.DETTE[a]=dette;P.bs.PROVISIONS[a]=provisions;P.bs.TRESO[a]=treso;
    P.bs.LIGNE_CT[a]=ligneCT;P.bs.TRESO_ACTIVE[a]=tresoActive;
    P.dette[a]={ouverture:soldeDebut,tirage:tirageDette,remboursement:remb,interets:(isOp?interets:idc),interetsCT:interetsCT,ligneCT:ligneCT,cloture:dette,div:div,idc:(isOp?0:idc),construction:!isOp};
    P.tft[a]=t; P.tft[a].ECART=t.ZG-treso;
    bfrP=bfr;tresoP=treso;rnPrec=rn;
  });
  /* synthèse Sources & Emplois (base KFCFA) — pas de bilan d'ouverture */
  P.financement={mode:(fin.mode||"manuel"),partFP:partFP,moisBFR:moisBFR,dureeConstruction:Nc,anneeExploit:anneeExploit,
    capexFinance:capexFinance,bfrDemarrage:bfrDem,idc:idcTotal,subvention:subv,
    capital:capital,dette:detteBase,detteAvecIDC:detteBase+idcTotal,
    sources:capital+subv+detteBase+idcTotal,emplois:capexFinance+bfrDem+idcTotal,taux:dTaux,duree:dDuree};
  P.pl.AUTRES_PRODUITS=P.pl.AUTRES_PROD;P.pl.PERSONNEL=P.pl.CHARGES_PERSONNEL;
  P.pl.AUTRES_OPEX=P.pl.OPEX_TOTAL;P.pl.DOTATIONS=P.pl.DA;P.pl.ACHATS=P.pl.COUTS_DIRECTS;
  P.bs.TRESO_NETTE=P.bs.TRESO;
  return P;
}

/* ---------- valorisation multi-méthodes ---------- */
function valoriserBP(etats,H,P){
  const V=H.valo, v=etats.v, A0=etats.annees, a1=A0[A0.length-1];
  const AP=P.annees, N=AP.length;
  const t=H.is_taux;
  const primeSpe=(V.primePays||0)+(V.primeTaille||0)+(V.primeIlliquidite||0)+((V.primePays===undefined&&V.primeSpecifique)?V.primeSpecifique:0);
  const ke=V.rf+V.beta*V.primeMarche+primeSpe;
  const kd=V.coutDette*(1-t);
  const wacc=ke*(1-V.poidsDette)+kd*V.poidsDette;
  const my=!!V.midYear;   /* convention mi-année : flux explicites actualisés à t−0,5 */
  /* FCFF ligne à ligne */
  const fcff={},detailFcff={};
  AP.forEach((a,i)=>{
    const ebit=P.pl.EBIT[a];
    const nopat=ebit*(1-(ebit>0?t:0));
    const dot=-P.pl.DA[a];
    const dbfr=P.tft[a].DBFR;          /* négatif si hausse du BFR */
    const capex=P.tft[a].CAPEX;        /* négatif */
    fcff[a]=nopat+dot+dbfr+capex;
    detailFcff[a]={ebit,impotTheorique:ebit>0?-t*ebit:0,nopat,dot,dbfr,capex,fcff:fcff[a]};
  });
  const pv={};let sommePv=0;
  AP.forEach((a,i)=>{pv[a]=fcff[a]/Math.pow(1+wacc,my?i+0.5:i+1);sommePv+=pv[a];});
  const fcffN=fcff[AP[N-1]];
  const ebitdaTerm=P.pl.EBITDA[AP[N-1]];
  /* valeur terminale : Gordon (croissance g) vs multiple de sortie (EV/EBITDA) */
  const vtGordon=wacc>V.g?fcffN*(1+V.g)/(wacc-V.g):0;
  const vtExit=(V.exitMultiple||0)*ebitdaTerm;
  const tvMode=V.tvMode==="exit"?"exit":"gordon";
  const vt=tvMode==="exit"?vtExit:vtGordon;
  /* actualisation de la valeur terminale : mi-année → N−0,5 pour Gordon (perpétuité de flux
     mi-année), mais N pour le multiple de sortie (cession datée en fin d'exercice N) */
  const tvExp=(my&&tvMode!=="exit")?N-0.5:N;
  const vtPv=vt/Math.pow(1+wacc,tvExp);
  const ev=sommePv+vtPv;
  const detteNette=-v.DETTES_FINANCIERES[a1]-v.TRESORERIE_NETTE[a1];
  /* pont EV → fonds propres : ajustements hors dette nette (minoritaires, provisions, actifs hors exploitation…) */
  const bridgeAjust=(V.bridge||[]).reduce((s,x)=>s+(+x.montant||0),0);
  const equityDcf=ev-detteNette+bridgeAjust;
  /* sensibilité : lignes = WACC ; colonnes = le pilote de la valeur terminale actif —
     la croissance g en mode Gordon, le multiple de sortie en mode exit (faire varier g
     en exit serait sans effet sur la VT et rendrait la valeur centrale hors fourchette).
     Pont dette nette + ajustements inclus, donc cohérent avec equityDcf. */
  const dwAxis=[-0.01,-0.005,0,0.005,0.01];
  const colAxis=tvMode==="exit"?[-1,-0.5,0,0.5,1]:[-0.01,-0.005,0,0.005,0.01];
  const sensi=[];
  dwAxis.forEach(dw=>{
    const ligne=[];
    colAxis.forEach(dx=>{
      const w=wacc+dw;
      let s=0;AP.forEach((a,i)=>s+=fcff[a]/Math.pow(1+w,my?i+0.5:i+1));
      let tv;
      if(tvMode==="exit"){const mm=(V.exitMultiple||0)+dx;tv=mm*ebitdaTerm/Math.pow(1+w,N);}
      else{const g=V.g+dx;tv=w>g?fcffN*(1+g)/(w-g)/Math.pow(1+w,my?N-0.5:N):0;}
      ligne.push(s+tv-detteNette+bridgeAjust);
    });
    sensi.push(ligne);
  });
  const sensiAxes={wacc:dwAxis.map(d=>wacc+d),colType:tvMode==="exit"?"multiple":"g",
    col:colAxis.map(d=>tvMode==="exit"?(V.exitMultiple||0)+d:V.g+d)};
  /* méthodes analogiques */
  const ebitdaRef=v.EBITDA[a1]+((V.useAdj&&isFinite(V.adjEbitda))?V.adjEbitda:0);
  const ebitRef=v.EBIT[a1], caRef=v.CA[a1], rnRef=v.RESULTAT_NET[a1];
  const mc=V.multiplesComparables, mt=V.multiplesTransactions;
  const eqEV=(m,ref)=>m*ref-detteNette+bridgeAjust;   /* multiple d'EV → fonds propres */
  const eqComp=m=>eqEV(m,ebitdaRef);
  const band=(f,c)=>({min:f(c*0.85),central:f(c),max:f(c*1.15)});
  const anrBase=v.CAPITAUX_PROPRES[a1];
  const anrAjust=(V.anrAjustements||[]).reduce((s,x)=>s+(+x.montant||0),0);
  /* méthodes retenues = les plus utilisées : DCF, multiples boursiers, multiples de transactions, actif net */
  const methodes=[
    {id:"dcf",lib:"DCF (flux actualisés)",min:Math.min(...sensi.flat()),max:Math.max(...sensi.flat()),central:equityDcf},
    {id:"comp",lib:"Multiples boursiers ("+mc.min+"–"+mc.max+"× EBITDA)",min:eqComp(mc.min),max:eqComp(mc.max),central:eqComp(mc.central)},
    {id:"trans",lib:"Multiples de transactions ("+mt.min+"–"+mt.max+"× EBITDA)",min:eqComp(mt.min),max:eqComp(mt.max),central:eqComp(mt.central)},
    {id:"anr",lib:"Actif net "+(anrAjust?"réévalué":"comptable"),min:anrBase+Math.min(0,anrAjust),max:anrBase+Math.max(0,anrAjust),central:anrBase+anrAjust}
  ];
  /* valeur retenue = moyenne pondérée des valeurs centrales (poids en %) */
  const poids=V.poids||{dcf:40,comp:20,trans:15,ebit:5,ca:0,per:5,anr:15};
  const wsum=methodes.reduce((s,m)=>s+(poids[m.id]||0),0);
  const retenue=wsum>0?methodes.reduce((s,m)=>s+(poids[m.id]||0)*m.central,0)/wsum:(equityDcf+eqComp(mc.central))/2;
  const ponderees=methodes.filter(m=>(poids[m.id]||0)>0).map(m=>m.central);
  const centrauxAll=methodes.map(m=>m.central);
  return {ke,kd,wacc,g:V.g,primeSpe,fcff,detailFcff,pv,sommePv,vt,vtGordon,vtExit,tvMode,ebitdaTerm,vtPv,ev,detteNette,bridgeAjust,
    equityDcf,ebitdaRef,ebitRef,caRef,rnRef,sensi,sensiAxes,methodes,poids,
    multiple:mc.central,equityMult:eqComp(mc.central),
    eqMin:Math.min(...centrauxAll),eqMax:Math.max(...centrauxAll),
    fourchette:{min:Math.min(...(ponderees.length?ponderees:centrauxAll)),max:Math.max(...(ponderees.length?ponderees:centrauxAll)),retenue}};
}

/* exports Node (tests) */
if(typeof module!=="undefined"&&module.exports){
  module.exports.hypothesesBP=hypothesesBP;
  module.exports.projeterBP=projeterBP;
  module.exports.valoriserBP=valoriserBP;
  module.exports.projeterModele=projeterModele;
  module.exports.volInducteurs=volInducteurs;
}
