#!/usr/bin/env node
/* =========================================================================
   Findalyx Advisory — conformité des livrables au moteur.

   Chaque livrable (classeurs Excel en formules, rapports) RÉIMPLÉMENTE les
   calculs du moteur. Un écart y est invisible à l'œil : le fichier reste
   cohérent en interne, simplement faux. Ce contrôle compare donc ligne à
   ligne, année par année, ce que produit chaque livrable à ce que produit le
   moteur, sur plusieurs variantes de dossier.

   Les formules Excel sont évaluées par src/xlcalc.js, dont la conformité au
   calcul d'Excel lui-même se vérifie séparément (tools/verif-excel.ps1).

   Usage : node tools/verif-conformite.js [--dump] [--variante=nom] [dossier.json]
   Sortie : 0 si tout concorde, 1 sinon. Les lignes non couvertes sont listées.
   ========================================================================= */
const fs=require("fs"), path=require("path");
const RACINE=path.join(__dirname,".."), SRC=path.join(RACINE,"src");
let ExcelJS;
try{ ExcelJS=require(path.join(RACINE,"node_modules","exceljs")); }
catch(e){ console.error("exceljs introuvable : npm install exceljs --no-save"); process.exit(2); }
const charge=f=>fs.readFileSync(path.join(SRC,f),"utf8");
const ARGS=process.argv.slice(2);
const DUMP=ARGS.indexOf("--dump")>=0;
const SEULE=(ARGS.filter(a=>a.indexOf("--variante=")===0)[0]||"").split("=")[1];
const FICHIER=ARGS.filter(a=>a.indexOf("--")!==0)[0];

/* ---------- chargement de l'application dans le réalm hôte ----------
   new Function et non vm : les tableaux passés à ExcelJS doivent appartenir au
   même réalm, sinon addRow perd silencieusement les libellés. */
function chargerApp(){
  let capture=null;
  const doc={createElement:()=>({click(){},set href(v){},set download(v){},style:{},
      appendChild(){},setAttribute(){},getContext:()=>null}),
    getElementById:()=>({style:{},textContent:"",innerHTML:""}),
    addEventListener(){},head:{appendChild(){}},body:{appendChild(){}}};
  const corps=
    "var licDemarrer=function(){},licControler=function(){return true},LIC_ETAT=null,"+
    "licJoursRestants=function(){return null},licAjouterSociete=function(){return Promise.resolve({ok:true})},"+
    "licRetirerSociete=function(){},licSyncSocietes=function(){},licOpSociete=function(){return Promise.resolve({})};\n"+
    /* PNG 1×1 valide : ExcelJS refuse une image vide (« Unsupported media ») */
    "var PNG1='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+dbbLAAAAAElFTkSuQmCC';\n"+
    "var LOGO_FINDALYX=PNG1,LOGO_FINDALYX_BLANC=PNG1,LOGO_FINDALYX_CLAIR=PNG1;\n"+
    "var module=undefined;\n"+
    charge("moteur.js")+"\n"+charge("bp.js")+"\n"+charge("xlcalc.js")+"\n"+
    charge("databook.js")+"\n"+charge("ui.js")+"\n"+charge("bpui.js")+"\n"+
    charge("bpxl.js")+"\n"+charge("etatsxl.js")+"\n"+
    "return {G:function(n){return eval(n);},pose:function(d){DOSSIER=d;uni();recalculer();}};";
  const run=new Function("ExcelJS","localStorage","document","URL","Blob","navigator","window",
    "console","toast","alert","confirm","requestAnimationFrame",corps);
  const api=run(ExcelJS,{getItem:()=>null,setItem(){},removeItem(){}},doc,
    {createObjectURL:()=>"blob:x",revokeObjectURL(){}},
    class{constructor(p){capture=p&&p[0];}},{userAgent:"node"},{},console,
    function(){},function(){},function(){return true;},function(f){if(f)f();});
  return {G:api.G,pose:api.pose,lire:()=>capture,raz:()=>{capture=null;}};
}

/* ---------- collecte des écarts ---------- */
const PB=[], NONCOUV=[];
let nbOk=0, nbLignes=0;
const pb=(ctx,msg)=>PB.push("["+ctx+"] "+msg);
const proche=(a,b,tol)=>Math.abs(a-b)<=(tol!==undefined?tol:Math.max(0.02,Math.abs(b)*1e-6));
const libCell=v=>(typeof v==="string")?v.trim():(v&&v.richText?v.richText.map(x=>x.text).join("").trim():"");
const rx=s=>new RegExp("^"+String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"$");

function feuille(wb,nom){const ws=wb.getWorksheet(nom);if(!ws)throw new Error("feuille absente : "+nom);return ws;}
/* Un même libellé peut apparaître deux fois (en-tête de section puis total) : on retient la
   ligne PORTEUSE DE CHIFFRES, sinon la première. */
function indexer(ws){
  const idx={},ordre=[];
  ws.eachRow(r=>{const t=libCell(r.getCell(2).value);
    if(!t)return; ordre.push({lib:t,n:r.number});
    let chiffre=false;
    for(let c=3;c<=10;c++) if(typeof r.getCell(c).value==="number")chiffre=true;
    if(idx[t]===undefined||(chiffre&&!idx[t+"~chiffre"])){idx[t]=r.number;if(chiffre)idx[t+"~chiffre"]=true;}});
  return {idx:idx,ordre:ordre,vus:{}};
}
/* Compare une ligne à une série attendue. uf = facteur d'unité du classeur. */
function ligne(ctx,ws,ix,lib,col0,attendu,uf,tol,occurrence){
  const rn=occurrence?(ix.ordre.filter(o=>o.lib===lib)[occurrence-1]||{}).n:ix.idx[lib];
  if(rn===undefined){pb(ctx,"ligne « "+lib+" » absente de "+ws.name);return;}
  ix.vus[lib]=true; nbLignes++;
  attendu.forEach((att,i)=>{
    const brut=ws.getCell(rn,col0+i).value;
    const v=(typeof brut==="number")?brut/uf:((brut===null||brut===undefined||brut==="")?0:NaN);
    if(isNaN(v)){pb(ctx,ws.name+" « "+lib+" » col "+(i+1)+" : valeur non numérique "+JSON.stringify(brut));return;}
    if(!proche(v,att,tol)) pb(ctx,ws.name+" « "+lib+" » an "+(i+1)+" : classeur "+(Math.round(v*100)/100)+
      " vs moteur "+(Math.round(att*100)/100)+" (écart "+(Math.round((v-att)*100)/100)+")");
    else nbOk++;
  });
}
/* Toute ligne chiffrée non comparée est signalée : la couverture doit être explicite. */
function couverture(ctx,ws,ix,col0,nCol,ignorer){
  ix.ordre.forEach(o=>{
    if(ix.vus[o.lib])return;
    if((ignorer||[]).some(r=>(r instanceof RegExp)?r.test(o.lib):o.lib===r))return;
    let chiffre=false;
    for(let c=col0;c<col0+nCol;c++) if(typeof ws.getCell(o.n,c).value==="number")chiffre=true;
    if(chiffre)NONCOUV.push(ws.name+" ligne "+o.n+" « "+o.lib.slice(0,58)+" »");
  });
}
async function classeurDe(app,appel){
  app.raz(); await appel();
  const buf=app.lire(); if(!buf) throw new Error("aucun classeur produit");
  const wb=new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(buf));
  const r=app.G("xlValoriser")(wb);
  (r.soucis||[]).slice(0,5).forEach(s=>PB.push("[évaluation] formule non évaluable : "+s));
  return wb;
}
function dumpFeuilles(wb){
  wb.worksheets.forEach(ws=>{
    console.log("\n--- "+ws.name+" ---");
    ws.eachRow(r=>{const t=libCell(r.getCell(2).value); if(!t)return;
      const vals=[3,4,5,6,7,8].map(c=>{const v=r.getCell(c).value;
        return (typeof v==="number")?Math.round(v*10)/10:"";}).join(" ");
      console.log("   "+String(r.number).padStart(3)+" | "+t.slice(0,60).padEnd(60)+" | "+vals);});
  });
}

/* =========================================================================
   VARIANTES — le dossier de démonstration intégré (aucune donnée client) et
   ses déclinaisons, choisies pour activer les branches du moteur.
   ========================================================================= */
function variantes(G){
  const base=()=>JSON.parse(JSON.stringify(G("dossierDemo")()));
  const v=(nom,f)=>{const d=base();f(d,d.modele);return {nom:nom,d:d};};
  return [
    v("base (démo)",function(){}),
    v("sans dette cible",function(d,M){M.valo.poidsDette=0;}),
    v("dette cible 35 %",function(d,M){M.valo.poidsDette=0.35;}),
    v("g = 0",function(d,M){M.valo.g=0;}),
    v("mi-année",function(d,M){M.valo.midYear=true;}),
    v("multiple de sortie",function(d,M){M.valo.tvMode="exit";M.valo.exitMultiple=6;}),
    v("construction 2 ans",function(d,M){M.dureeConstruction=2;M.financement.emprunt.grace=2;}),
    v("situation d'ouverture",function(d,M){M.ouverture={treso:5000000,creances:9000000,tauxRecouv:0.8,
      dettesFrn:3000000,dettesFiscSoc:1500000,dureeRecouv:2,dureeReglement:2};}),
    v("découvert (capital réduit)",function(d,M){M.financement.capital=5000000;M.financement.primes=0;M.financement.plug="cca";}),
    v("CCA rémunéré et amorti",function(d,M){M.financement.plug="capital";M.financement.apports=12000000;
      M.financement.ccaMode="lineaire";M.financement.ccaDuree=4;M.financement.ccaTaux=0.05;}),
    v("dividendes 40 %",function(d,M){M.dividendes_payout=0.4;M.dividendes_seuilCash=2000000;}),
    v("TVA 0 et IMF",function(d,M){M.tva=0;M.imf_taux=0.01;}),
    v("CA exonéré de TVA",function(d,M){M.tva=0.19;M.tvaExonere=true;}),
    v("CA assujetti à 19 %",function(d,M){M.tva=0.19;M.tvaExonere=false;}),
    v("séries annuelles",function(d,M){(M.revenus||[]).forEach(function(L){L.prix={mode:"yearly",vals:[300000,320000,340000,360000,380000]};});
      (M.chargesFixes||[]).forEach(function(c){c.mode="yearly";c.vals=[c.montant||1000000,1100000,1200000,1300000,1400000];});}),
    v("unité FCFA",function(d){d.unite="F";}),
    v("horizon 7 ans",function(d,M){M.nb=7;}),
  ];
}

/* =========================================================================
   classeur « Modèle » (BP projet) vs projeterModele / valoriserBP
   ========================================================================= */
async function verifModele(app,G,ctx,dossier){
  app.pose(dossier);
  const M=G("assurerModele")(), P=G("projeterModele")(M);
  const ET=G("etatsFromModele")(P);
  let VAL=null;
  try{ VAL=G("valoriserBP")(ET,{is_taux:M.is_taux,valo:M.valo},P); }
  catch(e){ pb(ctx,"valoriserBP a échoué : "+e.message); }
  const uf=G("uni")().f, AP=P.annees, N=AP.length, C0=3, soc=rx(dossier.societe);
  const S=f=>AP.map(f);
  const wb=await classeurDe(app,()=>G("exporterExcelModele")());
  if(DUMP){dumpFeuilles(wb);return;}
  const UNI=/^(Millions|Milliers|FCFA)/;

  /* --- P&L --- */
  {
    const ws=feuille(wb,"P&L prévisionnel"), ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
    const CAD=P.pl.CA_DETAIL||{}, CDI=P.pl.CDIND_DETAIL||{}, OPD=P.pl.OPEX_DETAIL||{};
    Object.keys(CAD).forEach(k=>L(CAD[k].lib,S(a=>CAD[k].vals[a]||0)));
    Object.keys(CDI).forEach(k=>L(CDI[k].lib,S(a=>CDI[k].vals[a]||0)));
    Object.keys(OPD).forEach(k=>L(OPD[k].lib,S(a=>OPD[k].vals[a]||0)));
    L("Chiffre d'affaires",S(a=>P.pl.CA[a]));
    L("Coûts directs (total)",S(a=>P.pl.COUTS_DIRECTS[a]));
    L("Marge brute",S(a=>P.pl.MARGE_BRUTE[a]));
    if(ix.idx["Autres produits d'exploitation"]!==undefined)L("Autres produits d'exploitation",S(a=>P.pl.AUTRES_PROD[a]));
    L("Charges du personnel",S(a=>P.pl.CHARGES_PERSONNEL[a]));
    L("Total frais généraux",S(a=>(P.pl.OPEX_TOTAL[a]||0)+(P.pl.CHARGES_PERSONNEL[a]||0)));
    L("EBITDA",S(a=>P.pl.EBITDA[a]));
    L("Dotations aux amortissements",S(a=>P.pl.DA[a]));
    L("EBIT",S(a=>P.pl.EBIT[a]));
    L("Intérêts sur emprunts",S(a=>P.dette[a].construction?0:-(P.dette[a].interets||0)));
    L("Intérêts sur découvert",S(a=>-(P.dette[a].interetsCT||0)));
    L("Intérêts sur comptes courants d'associés",S(a=>-(P.dette[a].ccaInterets||0)));
    L("Résultat financier",S(a=>P.pl.RESULTAT_FIN[a]));
    L("Résultat avant impôt",S(a=>P.pl.EBT[a]));
    L("Impôt sur les sociétés",S(a=>P.pl.IS[a]));
    L("Résultat net",S(a=>P.pl.RN[a]));
    couverture(ctx,ws,ix,C0,N,[/^Produits d'exploitation$/,/^Coûts directs$/,/^Frais généraux$/,UNI,
      /^Chaque ligne/,/^Compte de résultat/,soc]);
  }
  /* --- Bilan --- */
  {
    const ws=feuille(wb,"Bilan prévisionnel"), ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
    L("Immobilisations brutes",S(a=>P.bs.IMMO_BRUT[a]));
    L("Amortissements cumulés",S(a=>P.bs.AMORT_CUM[a]));
    L("Actifs immobilisés (nets)",S(a=>P.bs.IMMO_NET[a]));
    L("Stocks",S(a=>P.bs.STOCKS[a]));
    L("Créances clients",S(a=>P.bs.CLIENTS[a]));
    L("Créances antérieures à recouvrer (ouverture)",S(a=>P.bs.AUTRES_CREANCES[a]));
    L("Dettes fournisseurs",S(a=>P.bs.FOURNISSEURS[a]));
    L("Dettes d'ouverture à régler",S(a=>P.bs.AUTRES_DETTES[a]));
    L("Besoin en fonds de roulement global",S(a=>P.bs.BFR[a]));
    L("Trésorerie active",S(a=>P.bs.TRESO_ACTIVE[a]));
    L("Concours bancaires courants (découvert)",S(a=>-(P.bs.LIGNE_CT[a]||0)));
    L("Trésorerie nette",S(a=>P.bs.TRESO[a]));
    L("Dettes financières",S(a=>-P.bs.DETTE[a]));
    L("Comptes courants d'associés",S(a=>-((P.bs.CCA&&P.bs.CCA[a])||0)));
    L("Résultat net de l'exercice",S(a=>P.pl.RN[a]));
    L("Capitaux propres",S(a=>P.bs.CP[a]));
    L("Actif net",S(a=>P.bs.IMMO_NET[a]+P.bs.BFR[a]+P.bs.TRESO[a]-P.bs.PROVISIONS[a]-P.bs.DETTE[a]-((P.bs.CCA&&P.bs.CCA[a])||0)));
    L("Contrôle : actif net − capitaux propres (= 0)",S(()=>0));
    couverture(ctx,ws,ix,C0,N,[/^Actif immobilisé$/,/^Besoin en fonds de roulement$/,/^Trésorerie$/,
      /^Capitaux propres$/,UNI,/^Actifs immobilisés \(nets\) \+/,/^Capital social$/,/^Primes/,/^Subventions/,
      /^Situation nette/,/^Report à nouveau/,/^Bilan prévisionnel/,soc]);
  }
  /* --- TFT --- */
  {
    const ws=feuille(wb,"TFT prévisionnel"), ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
    const T=a=>P.tft[a];
    L("Trésorerie nette à l'ouverture",S(a=>T(a).ZA));
    L("Capacité d'autofinancement (CAFG)",S(a=>T(a).FA));
    L("Variation des stocks",S(a=>T(a).FC));
    /* le classeur isole l'encaissement des créances d'ouverture ; le moteur l'inclut dans FD/FE.
       On vérifie donc l'identité de somme, seule invariante entre les deux présentations. */
    {
      const li=["Variation des créances","Variation des dettes d'exploitation",
        "Encaissement des créances antérieures et règlement des dettes d'ouverture"];
      const som=AP.map((a,i)=>li.reduce((s,lib)=>{
        const rn=ix.idx[lib]; if(rn===undefined)return s;
        ix.vus[lib]=true; const v=ws.getCell(rn,C0+i).value;
        return s+((typeof v==="number")?v/uf:0);},0));
      nbLignes++;
      AP.forEach((a,i)=>{const att=T(a).FD+T(a).FE;
        if(!proche(som[i],att)) pb(ctx,"TFT variation du BFR (créances + dettes + ouverture) an "+(i+1)+
          " : classeur "+Math.round(som[i]*100)/100+" vs moteur "+Math.round(att*100)/100);
        else nbOk++;});
    }
    L("Flux opérationnels",S(a=>T(a).ZB));
    L("Flux d'investissement",S(a=>T(a).ZC));
    L("Augmentation de capital",S(a=>T(a).FK));
    L("Subvention",S(a=>T(a).FL));
    L("Emprunts nouveaux",S(a=>T(a).EMPRUNT));
    L("Remboursements",S(a=>T(a).REMBOURS));
    L("Apport en comptes courants d'associés",S(a=>T(a).CCA_TIR));
    L("Remboursement des comptes courants",S(a=>T(a).CCA_REMB));
    L("Dividendes versés",S(a=>T(a).FN));
    L("Flux de financement",S(a=>T(a).ZFIN));
    L("Variation nette de trésorerie",S(a=>T(a).ZF));
    L("Trésorerie nette à la clôture",S(a=>T(a).ZG));
    couverture(ctx,ws,ix,C0,N,[UNI,/^En période de construction/,/^Tableau des flux/,soc]);
  }
  /* --- Dette --- */
  {
    const ws=feuille(wb,"Dette"), ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
    const D=a=>P.dette[a];
    L("Tirages",S(a=>D(a).tirage||0));
    L("Intérêts de construction capitalisés (IDC)",S(a=>D(a).idc||0));
    L("Remboursements",S(a=>D(a).remboursement||0));
    L("Intérêts payés",S(a=>D(a).construction?0:(D(a).interets||0)));
    L("Encours à la clôture",S(a=>D(a).cloture!==undefined?D(a).cloture:P.bs.DETTE[a]));
    L("Apport (année 1)",S(a=>D(a).ccaTirage||0));
    L("Solde à la clôture",S(a=>(P.bs.CCA&&P.bs.CCA[a])||0));
    L("Intérêts sur CCA",S(a=>D(a).ccaInterets||0));
    /* deuxième ligne « Remboursements » de la feuille : celle du CCA */
    ligne(ctx,ws,ix,"Remboursements",C0,S(a=>D(a).ccaRemb||0),uf,undefined,2);
    couverture(ctx,ws,ix,C0,N,[UNI,/^IDC = /,/^Emprunt bancaire$/,/^Comptes courants/,/^Tableau de la dette/,soc]);
  }
  /* --- Valorisation --- */
  if(VAL){
    const ws=feuille(wb,"Valorisation"), ix=indexer(ws);
    const L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
    const T=(lib,att)=>ligne(ctx,ws,ix,lib,C0,[att],1,1e-9);   /* taux : sans facteur d'unité */
    T("= Coût des fonds propres (ke)",VAL.ke);
    T("Coût de la dette après IS (kd)",VAL.kd);
    T("= WACC",VAL.wacc);
    L("EBIT (Modèle)",S(a=>VAL.detailFcff[a].ebit));
    L("(−) Impôt théorique sur l'EBIT (taux d'IS des Hypothèses)",S(a=>VAL.detailFcff[a].impotTheorique));
    L("= NOPAT (résultat d'exploitation après impôt)",S(a=>VAL.detailFcff[a].nopat));
    L("(+) Dotations aux amortissements (Modèle)",S(a=>VAL.detailFcff[a].dot));
    L("(−) Variation du BFR (Modèle)",S(a=>VAL.detailFcff[a].dbfr));
    L("(−) Investissements — CAPEX (Modèle)",S(a=>VAL.detailFcff[a].capex));
    L("= Flux de trésorerie disponible (FCFF)",S(a=>VAL.fcff[a]));
    L("FCFF actualisés (au WACC)",S(a=>VAL.pv[a]));
    L("Somme des FCFF actualisés",[VAL.sommePv]);
    L("Valeur terminale actualisée (Gordon g, ou multiple de sortie)",[VAL.vtPv]);
    L("= Valeur d'entreprise (EV)",[VAL.ev]);
    L("(−) Dette nette fin de plan (dette + CCA − trésorerie, Modèle)",[-VAL.detteNette]);
    L("Valeur des fonds propres (DCF)",[VAL.equityDcf]);
    L("EBITDA de référence (dernière année du plan, Modèle)",[VAL.ebitdaRef]);
    const prefix={comp:"Multiples boursiers",trans:"Multiples de transactions",anr:"Actif net"};
    (VAL.methodes||[]).forEach(me=>{
      let cible=(me.id==="dcf")?"DCF (flux actualisés)":null;
      if(!cible){const p=prefix[me.id]; if(p){const t=ix.ordre.filter(o=>o.lib.indexOf(p)===0)[0]; cible=t&&t.lib;}}
      if(cible)ligne(ctx,ws,ix,cible,C0,[me.min,me.central,me.max],uf);
    });
    if(VAL.fourchette)ligne(ctx,ws,ix,"Valeur retenue (moyenne pondérée — poids en Hypothèses)",C0+1,[VAL.fourchette.retenue],uf);
    /* grille de sensibilité 5 × 5 : lignes = WACC, colonnes = g ou multiple de sortie */
    if(VAL.sensi&&VAL.sensiAxes){
      const rAx=(ix.ordre.filter(o=>o.lib.indexOf("WACC \\ g")===0)[0]||{}).n;
      if(rAx===undefined) pb(ctx,"grille de sensibilité introuvable dans la feuille Valorisation");
      else{
        VAL.sensiAxes.wacc.forEach((w,j)=>{
          const rn=rAx+1+j, bx=ws.getCell(rn,2).value;
          if(typeof bx!=="number"||Math.abs(bx-w)>1e-9)
            pb(ctx,"grille : axe WACC ligne "+(j+1)+" classeur "+bx+" vs moteur "+w);
          VAL.sensiAxes.col.forEach((x,k)=>{
            const ax=ws.getCell(rAx,3+k).value;
            if(typeof ax!=="number"||Math.abs(ax-x)>1e-9)
              pb(ctx,"grille : axe colonne "+(k+1)+" ("+VAL.sensiAxes.colType+") classeur "+ax+" vs moteur "+x);
            const v=ws.getCell(rn,3+k).value, att=VAL.sensi[j][k];
            nbLignes++;
            if(typeof v!=="number"||!proche(v/uf,att))
              pb(ctx,"grille de sensibilité ["+(j+1)+","+(k+1)+"] : classeur "+
                (typeof v==="number"?Math.round(v/uf):JSON.stringify(v))+" vs moteur "+Math.round(att));
            else nbOk++;
          });
        });
      }
    }
    couverture(ctx,ws,ix,C0,Math.max(N,5),[/^Coût du capital/,/^Construction des flux/,/^Passage à la valeur/,
      /^Synthèse par méthode$/,/^Sensibilité/,UNI,/^L'amplitude/,/^Méthode$/,/^WACC/,/^\d/,/^Taux sans risque/,
      /^Prime de/,/^EBITDA de la dernière année/,/^\(\+\) Ajustements/,/^Évaluation des fonds propres/,soc]);
  }
  /* --- Sources & Emplois --- */
  {
    const ws=feuille(wb,"Sources & Emplois"), ix=indexer(ws), F=P.financement||{};
    const un=(lib,att)=>{ if(att!==undefined&&att!==null) ligne(ctx,ws,ix,lib,C0,[att],uf); };
    /* en montage automatique le libellé porte la part de fonds propres : « Capital social (50 %) » */
    {const t=ix.ordre.filter(o=>o.lib.indexOf("Capital social")===0)[0];
     if(t) un(t.lib,F.capital); else pb(ctx,"ligne « Capital social » absente de Sources & Emplois");}
    un("Primes liées au capital",F.primes||0);
    un("Comptes courants d'associés (CCA)",F.cca||0);
    un("Subvention",F.subvention||F.subv||0);
    if(ix.idx["Dette"]!==undefined) un("Dette",F.dette);
    else un("Dette (dont IDC, instantané)",F.detteAvecIDC!==undefined?F.detteAvecIDC:F.dette);
    if(ix.idx["Intérêts de construction (IDC)"]!==undefined) un("Intérêts de construction (IDC)",F.idc||0);
    if(ix.idx["Investissements (jusqu'à la mise en service)"]!==undefined) un("Investissements (jusqu'à la mise en service)",F.capexFinance);
    if(ix.idx["BFR de démarrage (mois × charges de l'année 1)"]!==undefined) un("BFR de démarrage (mois × charges de l'année 1)",F.bfrDemarrage);
    if(ix.idx["Total emplois"]!==undefined) un("Total emplois",F.emplois);
    if(ix.idx["Total ressources"]!==undefined) un("Total ressources",F.sources);
    couverture(ctx,ws,ix,C0,1,[/^EMPLOIS$/,/^RESSOURCES$/,/^Rubrique$/,/^Durée de construction/,
      /^Trésorerie d'ouverture/,/^Sources & Emplois/,soc]);
  }
}

/* =========================================================================
   classeur « états + BP » (dossier AVEC historique) : etatsxl vs calculerEtats,
   bpxl vs projeterBP / valoriserBP
   ========================================================================= */
function dossierHistorique(G){
  const fx=require(path.join(RACINE,"tests","fixtures.js"));
  /* 3e exercice = 2024 dilaté de 15 % sur les comptes de gestion, pour un TCAM calculable */
  const b3={annee:2025,comptes:fx.balances[1].comptes.map(c=>({compte:c.compte,libelle:c.libelle,
    net:/^[67]/.test(c.compte)?Math.round(c.net*1.15):c.net}))};
  const som=b3.comptes.filter(c=>c.compte!=="52").reduce((t,c)=>t+c.net,0);
  b3.comptes=b3.comptes.map(c=>c.compte==="52"?{compte:c.compte,libelle:c.libelle,net:-som}:c);
  return {id:"hist",societe:"SOCIETE TEST SARL",secteur:"Services & conseil",unite:"K",
    balances:fx.balances.concat([b3]),overrides:{},infos:{}};
}
async function verifEtatsBP(app,G,ctx,dossier,exonere){
  app.pose(dossier);
  const ET=G("ETATS"); if(!ET){pb(ctx,"ETATS non calculés : balances non ingérées");return;}
  const H=G("assurerBP")();
  if(exonere){H.tva=0.19;H.tvaExonere=true;}
  const P=G("projeterBP")(ET,H);
  let VAL=null; try{VAL=G("valoriserBP")(ET,H,P);}catch(e){pb(ctx,"valoriserBP a échoué : "+e.message);}
  const uf=G("uni")().f, A=ET.annees, AP=P.annees, C0=3, soc=rx(dossier.societe);
  const S=f=>AP.map(f), SH=f=>A.map(f);
  const wb=await classeurDe(app,()=>G("exporterExcel")());
  if(DUMP){dumpFeuilles(wb);return;}
  const UNI=/^(Millions|Milliers|FCFA|KFCFA|MFCFA)/;
  const v=ET.v;
  /* --- états historiques (etatsxl) --- */
  {
    const ws=wb.getWorksheet("P&L"); if(ws){ const ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
      L("Chiffre d'affaires",SH(a=>v.CA[a]));
      L("Marge brute",SH(a=>v.MARGE_BRUTE[a]));
      L("EBITDA",SH(a=>v.EBITDA[a]));
      L("Résultat net",SH(a=>v.RESULTAT_NET[a]));
    }
  }
  {
    const ws=wb.getWorksheet("Bilan"); if(ws){ const ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,C0,att,uf);
      L("Actif net",SH(a=>v.ACTIF_NET[a]));
      L("Capitaux propres",SH(a=>v.CAPITAUX_PROPRES[a]));
    }
  }
  /* --- projections (bpxl) : colonnes = exercices historiques PUIS projections --- */
  const CP=C0+A.length;
  {
    const ws=wb.getWorksheet("P&L prévisionnel"); if(!ws)pb(ctx,"feuille « P&L prévisionnel » absente");
    else{ const ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,CP,att,uf);
      L("Chiffre d'affaires",S(a=>P.pl.CA[a]));
      L("Coûts directs",S(a=>P.pl.COUTS_DIRECTS[a]));
      L("Marge brute",S(a=>P.pl.MARGE_BRUTE[a]));
      L("Total frais généraux",S(a=>P.pl.OPEX_TOTAL[a]));
      L("Charges de personnel",S(a=>P.pl.CHARGES_PERSONNEL[a]));
      L("EBITDA",S(a=>P.pl.EBITDA[a]));
      L("Dotations aux amortissements",S(a=>P.pl.DA[a]));
      L("EBIT",S(a=>P.pl.EBIT[a]));
      L("Résultat financier",S(a=>P.pl.RESULTAT_FIN[a]));
      L("Résultat avant impôt",S(a=>P.pl.EBT[a]));
      L("Impôt sur les sociétés (report déficitaire imputé)",S(a=>P.pl.IS[a]));
      L("Résultat net",S(a=>P.pl.RN[a]));
      /* les colonnes historiques doivent reproduire les états */
      ligne(ctx,ws,ix,"Chiffre d'affaires",C0,SH(a=>v.CA[a]),uf);
      ligne(ctx,ws,ix,"EBITDA",C0,SH(a=>v.EBITDA[a]),uf);
      ligne(ctx,ws,ix,"Résultat net",C0,SH(a=>v.RESULTAT_NET[a]),uf);
    }
  }
  {
    const ws=wb.getWorksheet("Bilan prévisionnel");
    if(!ws)pb(ctx,"feuille « Bilan prévisionnel » absente");
    else{ const ix=indexer(ws), L=(lib,att)=>ligne(ctx,ws,ix,lib,CP,att,uf);
      L("Immobilisations nettes",S(a=>P.bs.IMMO_NET[a]));
      L("Stocks",S(a=>P.bs.STOCKS[a]));
      L("Créances clients",S(a=>P.bs.CLIENTS[a]));
      L("Dettes fournisseurs",S(a=>P.bs.FOURNISSEURS[a]));
      L("Besoin en fonds de roulement",S(a=>P.bs.BFR[a]));
      L("Capitaux propres",S(a=>P.bs.CP[a]));
      L("Résultat net de l'exercice",S(a=>P.pl.RN[a]));
      L("Dettes financières",S(a=>P.bs.DETTE[a]));
      L("Trésorerie nette (bouclage)",S(a=>P.bs.TRESO[a]));
      L("— dont trésorerie active",S(a=>P.bs.TRESO_ACTIVE[a]));
      L("— dont concours bancaires courants (découvert)",S(a=>P.bs.LIGNE_CT[a]||0));
      L("Contrôle : actif - passif (doit être 0)",S(()=>0));
    }
  }
  {
    const ws=wb.getWorksheet("TFT prévisionnel");
    if(ws){ const ix=indexer(ws), T=a=>P.tft[a];
      const L=(lib,att)=>ligne(ctx,ws,ix,lib,CP,att,uf);
      if(ix.idx["Flux des activités opérationnelles"]!==undefined)L("Flux des activités opérationnelles",S(a=>T(a).ZB));
      if(ix.idx["Trésorerie nette de clôture"]!==undefined)L("Trésorerie nette de clôture",S(a=>T(a).ZG));
    }
  }
  if(VAL){
    const ws=wb.getWorksheet("Valorisation");
    if(!ws)pb(ctx,"feuille « Valorisation » absente");
    else{ const ix=indexer(ws);
      ligne(ctx,ws,ix,"WACC",C0,[VAL.wacc],1,1e-9);
      ligne(ctx,ws,ix,"Coût de la dette net d'IS",C0,[VAL.kd],1,1e-9);
      ligne(ctx,ws,ix,"FCFF",C0+1,S(a=>VAL.fcff[a]),uf);
      ligne(ctx,ws,ix,"FCFF actualisés",C0+1,S(a=>VAL.pv[a]),uf);
      ligne(ctx,ws,ix,"Somme des FCFF actualisés",C0,[VAL.sommePv],uf);
      ligne(ctx,ws,ix,"Valeur terminale actualisée",C0,[VAL.vtPv],uf);
      ligne(ctx,ws,ix,"Valeur d'entreprise (EV)",C0,[VAL.ev],uf);
      /* ce classeur affiche la dette nette telle quelle et la soustrait */
      ligne(ctx,ws,ix,"(–) Dette nette (dernier exercice réel)",C0,[VAL.detteNette],uf);
      ligne(ctx,ws,ix,"Valeur des fonds propres (DCF)",C0,[VAL.equityDcf],uf);
      /* grille de sensibilité : lignes « WACC xx % » */
      if(VAL.sensi){
        const lignesW=ix.ordre.filter(o=>/^WACC\s/.test(o.lib));
        if(lignesW.length!==VAL.sensi.length) pb(ctx,"grille de sensibilité : "+lignesW.length+" ligne(s) au lieu de "+VAL.sensi.length);
        else lignesW.forEach((o,j)=>VAL.sensi[j].forEach((att,k)=>{
          const val=ws.getCell(o.n,C0+k).value; nbLignes++;
          if(typeof val!=="number"||!proche(val/uf,att))
            pb(ctx,"grille de sensibilité ["+(j+1)+","+(k+1)+"] : classeur "+
              (typeof val==="number"?Math.round(val/uf):JSON.stringify(val))+" vs moteur "+Math.round(att));
          else nbOk++;}));
      }
      (VAL.methodes||[]).forEach(me=>{
        const p={dcf:"DCF (sensibilité",comp:"Multiples boursiers",trans:"Multiples de transactions",anr:"Actif net"}[me.id];
        const t=ix.ordre.filter(o=>o.lib.indexOf(p)===0)[0];
        if(!t)return;
        if(me.id==="anr")ligne(ctx,ws,ix,t.lib,C0+1,[me.central],uf);
        else ligne(ctx,ws,ix,t.lib,C0,[me.min,me.central,me.max],uf);
      });
    }
  }
}

/* ========================= exécution ========================= */
(async()=>{
  const app=chargerApp(), G=app.G;
  let liste;
  if(FICHIER){ const d=JSON.parse(fs.readFileSync(FICHIER,"utf8"));
    liste=[{nom:path.basename(FICHIER),d:(d.dossiers?d.dossiers[0]:d)}]; }
  else liste=variantes(G).filter(v=>!SEULE||v.nom.indexOf(SEULE)>=0);
  console.log("Conformité des livrables — "+liste.length+" variante(s)\n");
  for(const item of liste){
    const avant=PB.length;
    try{ await verifModele(app,G,item.nom,item.d); }
    catch(e){ pb(item.nom,"exception : "+e.message); }
    if(DUMP)return;
    console.log((PB.length===avant?"  OK    ":"  ÉCART ")+"classeur Modèle · "+item.nom+
      (PB.length===avant?"":"  ("+(PB.length-avant)+")"));
  }
  if(!FICHIER){
    for(const cas of [{nom:"historique (3 exercices)",ex:false},{nom:"historique · CA exonéré de TVA",ex:true}]){
      const avant=PB.length, dh=dossierHistorique(G);
      if(cas.ex){dh.bp=null;}
      try{ await verifEtatsBP(app,G,cas.nom,dh,cas.ex); }
      catch(e){ pb(cas.nom,"exception : "+e.message); }
      if(DUMP)return;
      console.log((PB.length===avant?"  OK    ":"  ÉCART ")+"classeur états + BP · "+cas.nom+
        (PB.length===avant?"":"  ("+(PB.length-avant)+")"));
    }
  }
  console.log("\n"+nbLignes+" lignes comparées · "+nbOk+" valeurs conformes · "+PB.length+" écart(s)");
  if(NONCOUV.length){
    const uniq=[...new Set(NONCOUV)];
    console.log("\nLignes chiffrées NON couvertes ("+uniq.length+") :");
    uniq.slice(0,40).forEach(x=>console.log("   "+x));
  }
  if(PB.length){
    console.log("\nÉCARTS ("+PB.length+") :");
    PB.slice(0,60).forEach(x=>console.log("   "+x));
    if(PB.length>60)console.log("   … "+(PB.length-60)+" autres");
    process.exit(1);
  }
  console.log("\nOK — le classeur reproduit le moteur sur toutes les variantes.");
})().catch(e=>{console.error("ERREUR :",e.message,"\n"+(e.stack||"").split("\n").slice(1,5).join("\n"));process.exit(1);});
