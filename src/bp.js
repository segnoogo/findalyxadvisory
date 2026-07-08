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
    /* BFR en jours */
    dso:born(v.CLIENTS[a1]/ca1*360,0,360,45),
    dio:born(cd?v.STOCKS[a1]/Math.abs(cd)*360:0,0,360,30),
    dpo:born((cd+op)?-v.FOURNISSEURS[a1]/Math.abs(cd+op)*360:0,0,360,30),
    autresCreances_pct:born(ca1?(v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1])/ca1:0.05,0,1,0.05),
    autresDettes_pct:born(ca1?-(v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1]+v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1])/ca1:0.05,0,1,0.05),
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
      rf:0.06, primeMarche:0.07, beta:1.0, primeSpecifique:0.03,
      coutDette:born(detteH>0?fraisFinH/detteH:0.08,0.02,0.2,0.08),
      poidsDette:born(detteH/((detteH+Math.max(v.CAPITAUX_PROPRES[a1],1))||1),0,0.8,0.2),
      g:0.03,
      multiplesComparables:{min:4,central:5.5,max:7},
      multiplesTransactions:{min:5,central:6.5,max:8},
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
   "FOURNISSEURS","AUTRES_DETTES","BFR","CP","DETTE","PROVISIONS","TRESO"].forEach(bs);

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
    const dette=detteExist+soldeNouv;
    const ebitda=caP+cd+autresProdP+opexTot+persP;
    const ebit=ebitda-dot;
    const pf=H.produitsFin_montant;
    const rf=pf-interets;
    const ebt=ebit+rf;
    const impots=ebt>0?-H.is_taux*ebt:0;
    const rn=ebt+impots;
    /* --- BFR --- */
    const clients=caP*(H.dso+sc.dJours)/360;
    const stocks=Math.abs(cd)*H.dio/360;
    const fournisseurs=-(Math.abs(cd)+Math.abs(opexTot))*H.dpo/360;
    const autresCr=caP*H.autresCreances_pct;
    const autresDet=-caP*H.autresDettes_pct;
    const bfr=clients+stocks+fournisseurs+autresCr+autresDet;
    /* --- capitaux propres & dividendes --- */
    const div=H.dividendes_payout>0&&rnPrec>0?H.dividendes_payout*rnPrec:0;
    cp=cp+rn-div;
    /* --- trésorerie = bouclage du bilan --- */
    const immoNet=brut-amortCum;
    const treso=cp+dette+provisions-immoNet-bfr;
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
        :(v.CLIENTS[a1]+v.AUTRES_CREANCES[a1]+v.AVANCES_FRS[a1])));
    t.FE=-(((fournisseurs+autresDet))-((P.bs.FOURNISSEURS[AP[i-1]]!==undefined)
        ?(P.bs.FOURNISSEURS[AP[i-1]]+P.bs.AUTRES_DETTES[AP[i-1]])
        :(v.FOURNISSEURS[a1]+v.DETTES_SOCIALES[a1]+v.DETTES_FISCALES[a1]+v.AUTRES_DETTES[a1]+v.CLIENTS_AVANCES[a1])));
    /* FB : bascule HAO du réel vers 0 en première année de plan */
    t.FB=i===0?-(0-(v.HAO_ACTIF[a1]+v.HAO_PASSIF[a1])):0;
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
    P.pl.PRODUITS_FIN[a]=pf;P.pl.FRAIS_FIN[a]=-interets;P.pl.RESULTAT_FIN[a]=rf;
    P.pl.EBT[a]=ebt;P.pl.IS[a]=impots;P.pl.RN[a]=rn;
    P.bs.IMMO_BRUT[a]=brut;P.bs.AMORT_CUM[a]=-amortCum;P.bs.IMMO_NET[a]=immoNet;
    P.bs.STOCKS[a]=stocks;P.bs.CLIENTS[a]=clients;P.bs.AUTRES_CREANCES[a]=autresCr;
    P.bs.FOURNISSEURS[a]=fournisseurs;P.bs.AUTRES_DETTES[a]=autresDet;P.bs.BFR[a]=bfr;
    P.bs.CP[a]=cp;P.bs.DETTE[a]=dette;P.bs.PROVISIONS[a]=provisions;P.bs.TRESO[a]=treso;
    P.dette[a]={ouverture:soldeExistDebut+ (soldeNouv+rembNouv-nouveau),tirage:nouveau,
      remboursement:rembExist+rembNouv,interets,cloture:dette,div};
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

/* ---------- valorisation multi-méthodes ---------- */
function valoriserBP(etats,H,P){
  const V=H.valo, v=etats.v, A0=etats.annees, a1=A0[A0.length-1];
  const AP=P.annees, N=AP.length;
  const t=H.is_taux;
  const ke=V.rf+V.beta*V.primeMarche+V.primeSpecifique;
  const kd=V.coutDette*(1-t);
  const wacc=ke*(1-V.poidsDette)+kd*V.poidsDette;
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
  AP.forEach((a,i)=>{pv[a]=fcff[a]/Math.pow(1+wacc,i+1);sommePv+=pv[a];});
  const fcffN=fcff[AP[N-1]];
  const vt=wacc>V.g?fcffN*(1+V.g)/(wacc-V.g):0;
  const vtPv=vt/Math.pow(1+wacc,N);
  const ev=sommePv+vtPv;
  const detteNette=-v.DETTES_FINANCIERES[a1]-v.TRESORERIE_NETTE[a1];
  const equityDcf=ev-detteNette;
  /* sensibilité WACC × g */
  const sensi=[];
  [-0.01,-0.005,0,0.005,0.01].forEach(dw=>{
    const ligne=[];
    [-0.01,-0.005,0,0.005,0.01].forEach(dg=>{
      const w=wacc+dw,g=V.g+dg;
      let s=0;AP.forEach((a,i)=>s+=fcff[a]/Math.pow(1+w,i+1));
      const tv=w>g?fcffN*(1+g)/(w-g)/Math.pow(1+w,N):0;
      ligne.push(s+tv-detteNette);
    });
    sensi.push(ligne);
  });
  /* méthodes complémentaires */
  const ebitdaRef=v.EBITDA[a1]+((V.useAdj&&isFinite(V.adjEbitda))?V.adjEbitda:0);
  const mc=V.multiplesComparables, mt=V.multiplesTransactions;
  const eqComp=m=>m*ebitdaRef-detteNette;
  const anrBase=v.CAPITAUX_PROPRES[a1];
  const anrAjust=(V.anrAjustements||[]).reduce((s,x)=>s+(+x.montant||0),0);
  const methodes=[
    {id:"dcf",lib:"DCF (flux actualisés)",min:Math.min(...sensi.flat()),max:Math.max(...sensi.flat()),central:equityDcf},
    {id:"comp",lib:"Multiples boursiers ("+mc.min+"x – "+mc.max+"x EBITDA)",min:eqComp(mc.min),max:eqComp(mc.max),central:eqComp(mc.central)},
    {id:"trans",lib:"Multiples de transactions ("+mt.min+"x – "+mt.max+"x EBITDA)",min:eqComp(mt.min),max:eqComp(mt.max),central:eqComp(mt.central)},
    {id:"anr",lib:"Actif net "+(anrAjust?"réévalué":"comptable"),min:anrBase+Math.min(0,anrAjust),max:anrBase+Math.max(0,anrAjust),central:anrBase+anrAjust}
  ];
  const centraux=methodes.map(m=>m.central);
  return {ke,kd,wacc,g:V.g,fcff,detailFcff,pv,sommePv,vt,vtPv,ev,detteNette,
    equityDcf,ebitdaRef,sensi,methodes,
    multiple:mc.central,equityMult:eqComp(mc.central),
    eqMin:Math.min(...centraux),eqMax:Math.max(...centraux),
    fourchette:{min:Math.min(...centraux),max:Math.max(...centraux),
      retenue:(equityDcf+eqComp(mc.central))/2}};
}

/* exports Node (tests) */
if(typeof module!=="undefined"&&module.exports){
  module.exports.hypothesesBP=hypothesesBP;
  module.exports.projeterBP=projeterBP;
  module.exports.valoriserBP=valoriserBP;
}
