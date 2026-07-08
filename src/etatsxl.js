/* ============================================================
   États HISTORIQUES en formules vivantes (classeur états + BP)
   P&L / Bilan / TFT branchés sur la TBAGR par SUMIF ;
   TFT officiel dérivé du bilan, réconcilié à 0.
   ============================================================ */
function construireEtatsFormules(wb){
  const u=uni(),UF=u.f;
  const NF=u.dec?'#,##0.0;(#,##0.0);"-"':'#,##0;(#,##0);"-"';
  const A=ETATS.annees,v=ETATS.v,n=A.length;
  const nT=DOSSIER.tbagr.lignes.length;
  const finT=4+nT;                                  /* données TBAGR : lignes 5..4+nT */
  const refT="'"+nomOnglet("TBAGR").replace(/'/g,"''")+"'";
  const colT=i=>String.fromCharCode(70+i);          /* années TBAGR dès la colonne F */
  const L=i=>String.fromCharCode(64+i);
  const persoDe2=ag=>(DOSSIER.lignesPerso||[]).filter(x=>x.agregat===ag);
  const su=(codes,i,signe)=>(signe==="-"?"-(":"(")+codes.map(c=>
    `SUMIF(${refT}!$B$5:$B$${finT},"${c}",${refT}!${colT(i)}$5:${colT(i)}$${finT})`).join("+")+")";
  const avecCagr=n>2, nbCols=1+n+(n-1)+(avecCagr?1:0);
  const DELTA_FILL={type:"pattern",pattern:"solid",fgColor:{argb:"FF3D5486"}};

  function feuilleEtat(nom,sousTitre){
    const ws=wb.addWorksheet(nomOnglet(nom));
    titreLiasse(ws,sousTitre);
    const deltas=A.slice(1).map((a,i)=>"Δ"+String(A[i]).slice(-2)+"-"+String(a).slice(-2));
    const hd=ws.addRow([null,u.lib,...A.map(a=>"FY"+String(a).slice(-2)),...deltas,...(avecCagr?["CAGR"]:[])]);
    styliserEntete(hd,2);
    for(let c=3+n;c<=nbCols+1;c++)hd.getCell(c).fill=DELTA_FILL;
    ws._rn=5;
    return ws;
  }
  function variations(ws,rn){
    A.slice(1).forEach((a,i)=>{
      const c1=L(3+i),c2=L(4+i);
      const cl=ws.getCell(rn,3+n+i);
      cl.value={formula:`IF(${c1}${rn}=0,"na",${c2}${rn}/${c1}${rn}-1)`};
      cl.numFmt='0%;(0%)';cl.alignment={horizontal:"right"};
    });
    if(avecCagr){
      const cd=L(2+n);
      const cl=ws.getCell(rn,2+2*n);
      cl.value={formula:`IF(AND(C${rn}<>0,${cd}${rn}<>0,SIGN(C${rn})=SIGN(${cd}${rn})),(ABS(${cd}${rn})/ABS(C${rn}))^(1/${n-1})-1,"na")`};
      cl.numFmt='0%;(0%)';cl.alignment={horizontal:"right"};
    }
  }
  function ligneF(ws,lib,fn,opt){
    opt=opt||{};
    const rn=ws._rn++;
    ws.getCell(rn,2).value=lib;
    A.forEach((a,i)=>{
      const cl=ws.getCell(rn,3+i);
      cl.value=typeof fn==="function"?{formula:fn(i,a)}:fn;
      cl.numFmt=opt.pct?'0.0%;(0.0%)':NF;
    });
    if(!opt.pct)variations(ws,rn);
    if(opt.pct){const r=ws.getRow(rn);r.font={italic:true,color:{argb:"FF808080"}};}
    if(opt.st){const r=ws.getRow(rn);r.font={bold:true,color:{argb:"FF172554"}};
      for(let c=2;c<=nbCols+1;c++)r.getCell(c).fill=FOND_TOTAL;}
    return rn;
  }
  const somme=(rows)=>(i)=>rows.map(r=>`${L(3+i)}${r}`).join("+");

  /* ================= P&L (détaillé SYSCOHADA — même nomenclature que le databook) ================= */
  const wsP=feuilleEtat("P&L","Compte de résultat analytique — FORMULES (recalculé depuis la TBAGR) — "+u.lib);
  const rP={};
  {
    /* lignes personnalisées insérées avant le sous-total de leur agrégat (comme le databook) */
    const AG_ST_PL={CA:"CA",COUTS_DIRECTS:"COUTS_DIRECTS",AUTRES_PROD:"EBITDA",OPEX:"FRAIS_GENERAUX",
      CHARGES_PERSONNEL:"FRAIS_GENERAUX",DA:"EBIT",RESULTAT_FIN:"RESULTAT_FINANCIER",
      RESULTAT_HAO:"RESULTAT_HAO",IMPOTS:"RESULTAT_NET"};
    const dPL=DB_PL.map(l=>Object.assign({},l,l.somme?{somme:l.somme.slice()}:{}));
    (DOSSIER.lignesPerso||[]).filter(pp=>pp.etat==="PL").forEach(pp=>{
      const st=AG_ST_PL[pp.agregat], i=dPL.findIndex(l=>l.code===st&&l.type==="sous_total");
      if(i>=0){dPL[i].somme.push(pp.code);dPL.splice(i,0,{code:pp.code,lib:pp.lib});}
    });
    const rc={};
    dPL.forEach(l=>{
      let rn;
      if(!l.type) rn=ligneF(wsP,l.lib,i=>su(l.codes||[l.code],i,"-"));
      else if(l.type==="sous_total"){
        const parts=l.somme.filter(c=>rc[c]).map(c=>rc[c]);
        rn=ligneF(wsP,l.lib,parts.length?somme(parts):()=>"0",{st:1});
      }else if(l.type==="pourcentage")
        rn=ligneF(wsP,l.lib,i=>`IF(${L(3+i)}${rc["CA"]}=0,"",${L(3+i)}${rc[l.num]}/${L(3+i)}${rc["CA"]})`,{pct:1});
      rc[l.code]=rn;
    });
    rP.RN=rc["RESULTAT_NET"];
    ["CA","EBITDA","EBIT","FRAIS_FIN","COUTS_DIRECTS","CHARGES_PERSONNEL","FRAIS_GENERAUX"].forEach(k=>{if(rc[k])rP[k]=rc[k];});
    /* bloc ratios de marge en bas de la feuille P&L */
    wsP._rn++;
    const rhn=wsP._rn++;
    wsP.getCell(rhn,2).value="Ratios du compte de résultat";
    wsP.getRow(rhn).font={bold:true,color:{argb:"FF172554"}};
    [["Marge brute / CA","MARGE_BRUTE","CA",""],["Marge d'EBITDA","EBITDA","CA",""],
     ["Marge d'exploitation (EBIT)","EBIT","CA",""],["Marge nette","RESULTAT_NET","CA",""],
     ["Frais généraux (overhead) / CA","FRAIS_GENERAUX","CA","-"],
     ["Charges de personnel / CA","CHARGES_PERSONNEL","CA","-"],
     ["Taux d'impôt effectif","IS","RESULTAT_AVANT_IMPOT","-"]].forEach(([lib,num,den,sg])=>{
      if(!rc[num]||!rc[den])return;
      const rn=wsP._rn++;
      wsP.getCell(rn,2).value=lib;wsP.getRow(rn).font={italic:true,color:{argb:"FF808080"}};
      A.forEach((a,i)=>{const cl=wsP.getCell(rn,3+i);
        cl.value={formula:`IF(${L(3+i)}${rc[den]}=0,"",${sg}${L(3+i)}${rc[num]}/${L(3+i)}${rc[den]})`};
        cl.numFmt='0.0%;(0.0%)';});
      A.slice(1).forEach((a,i)=>{const cd=wsP.getCell(rn,3+n+i);
        cd.value={formula:`IFERROR((${L(4+i)}${rn}-${L(3+i)}${rn})*10000,"")`};
        cd.numFmt='+#,##0" pb";-#,##0" pb";0" pb"';cd.alignment={horizontal:"right"};});
    });
  }
  wsP.columns=[{width:3},{width:46},...Array(n).fill({width:14}),...Array(n-1).fill({width:9}),...(avecCagr?[{width:9}]:[])];
  const refP="'"+nomOnglet("P&L").replace(/'/g,"''")+"'";

  /* ================= Bilan ================= */
  const wsB=feuilleEtat("Bilan","Bilan — présentation actif net — FORMULES — "+u.lib);
  const rB={};
  const bs=(k,lib,codes,signe,opt)=>{rB[k]=ligneF(wsB,lib,i=>su(codes,i,signe||"+"),opt);};
  bs("BRI","Immobilisations incorporelles (brutes)",["IMMO_INCORP"]);
  bs("BRC","Immobilisations corporelles et avances (brutes)",["IMMO_CORP","AVANCES_IMMO",...persoDe2("ACTIFS_IMMOBILISES").map(x=>x.code)]);
  bs("BRF","Immobilisations financières",["IMMO_FIN"]);
  bs("AMC","Amortissements et dépréciations cumulés",["AMORT_DEPREC"]);
  rB.IMN=ligneF(wsB,"Actifs immobilisés (nets)",somme([rB.BRI,rB.BRC,rB.BRF,rB.AMC]),{st:1});
  bs("STK","Stocks",["STOCKS"]);
  bs("CLI","Créances clients",["CLIENTS"]);
  bs("AVF","Fournisseurs, avances versées",["AVANCES_FRS"]);
  bs("FRN","Dettes fournisseurs",["FOURNISSEURS"]);
  bs("CAV","Clients, avances reçues",["CLIENTS_AVANCES"]);
  bs("DFI","Dettes fiscales",["DETTES_FISCALES"]);
  bs("DSO","Dettes sociales",["DETTES_SOCIALES"]);
  const persoBA=persoDe2("BFR_ACTIF"),persoBP=persoDe2("BFR_PASSIF");
  persoBA.forEach((x,k)=>bs("PBA"+k,x.lib,[x.code]));
  persoBP.forEach((x,k)=>bs("PBP"+k,x.lib,[x.code]));
  rB.BFRE=ligneF(wsB,"BFR d'exploitation",
    somme([rB.STK,rB.CLI,rB.AVF,rB.FRN,rB.CAV,rB.DFI,rB.DSO,
      ...persoBA.map((x,k)=>rB["PBA"+k]),...persoBP.map((x,k)=>rB["PBP"+k])]),{st:1});
  bs("ACR","Autres créances",["AUTRES_CREANCES","HAO_ACTIF"]);
  bs("ADT","Autres dettes",["AUTRES_DETTES","HAO_PASSIF"]);
  rB.BFRH=ligneF(wsB,"BFR hors exploitation",somme([rB.ACR,rB.ADT]),{st:1});
  rB.BFR=ligneF(wsB,"Besoin en fonds de roulement global",somme([rB.BFRE,rB.BFRH]),{st:1});
  bs("TN","Trésorerie nette",["TRESO_ACTIF","TRESO_PASSIF",...persoDe2("TRESORERIE_NETTE").map(x=>x.code)],"+",{st:1});
  bs("PRV","Provisions pour risques et charges",["PROVISIONS_RC"]);
  bs("DET","Dettes financières",["DETTES_FINANCIERES",...persoDe2("FINANCEMENT").map(x=>x.code)]);
  rB.AN=ligneF(wsB,"Actif net",somme([rB.IMN,rB.BFR,rB.TN,rB.PRV,rB.DET]),{st:1});
  bs("CAP","Capital social",["CAPITAL"],"-");
  bs("PRI","Primes et réserves",["PRIMES_RESERVES"],"-");
  bs("RAN","Report à nouveau et résultats antérieurs",["RAN_RESULTATS_ANT"],"-");
  bs("SUB","Subventions et provisions réglementées",["SUBV_PROV_REGL"],"-");
  const persoCP=persoDe2("CAPITAUX_PROPRES");
  persoCP.forEach((x,k)=>bs("PCP"+k,x.lib,[x.code],"-"));
  rB.RNB=ligneF(wsB,"Résultat net de l'exercice",i=>`${refP}!${L(3+i)}${rP.RN}`);
  rB.CP=ligneF(wsB,"Capitaux propres",
    somme([rB.CAP,rB.PRI,rB.RAN,rB.SUB,...persoCP.map((x,k)=>rB["PCP"+k]),rB.RNB]),{st:1});
  ligneF(wsB,"Contrôle : actif net - capitaux propres (doit être 0)",somme([rB.AN]).length?i=>`${L(3+i)}${rB.AN}-${L(3+i)}${rB.CP}`:null,{pct:0});
  {
    const PL=(row,c)=>`${refP}!${c}${row}`, BS=(row,c)=>`${c}${row}`;
    const ca=c=>PL(rP.CA,c), ebitda=c=>PL(rP.EBITDA,c), ebit=c=>PL(rP.EBIT,c), rnr=c=>PL(rP.RN,c);
    const cp=c=>BS(rB.CP,c), dfin=c=>`(-${BS(rB.DET,c)})`, dnet=c=>`(-${BS(rB.DET,c)}-${BS(rB.TN,c)})`;
    const achats=c=>`(-${PL(rP.COUTS_DIRECTS,c)})`, opex=c=>`(${PL(rP.CHARGES_PERSONNEL,c)}-${PL(rP.FRAIS_GENERAUX,c)})`;
    const actC=c=>`(${BS(rB.STK,c)}+${BS(rB.CLI,c)}+${BS(rB.AVF,c)}+${BS(rB.ACR,c)}+MAX(0,${BS(rB.TN,c)}))`;
    const pasC=c=>`(-(${BS(rB.FRN,c)}+${BS(rB.CAV,c)}+${BS(rB.DSO,c)}+${BS(rB.DFI,c)}+${BS(rB.ADT,c)})+MAX(0,-${BS(rB.TN,c)}))`;
    const totA=c=>`(${BS(rB.IMN,c)}+${actC(c)})`;
    const items=[
      {lab:"ROE (rentabilité des capitaux propres)",unit:"%",f:c=>`IF(${cp(c)}<=0,"",${rnr(c)}/${cp(c)})`},
      {lab:"ROA (rentabilité de l'actif)",unit:"%",f:c=>`IF(${totA(c)}<=0,"",${rnr(c)}/${totA(c)})`},
      {lab:"ROCE (rentabilité des capitaux employés)",unit:"%",f:c=>`IF((${cp(c)}+${dfin(c)})<=0,"",${ebit(c)}/(${cp(c)}+${dfin(c)}))`},
      {lab:"Liquidité générale",unit:"x",f:c=>`IF(${pasC(c)}<=0,"",${actC(c)}/${pasC(c)})`},
      {lab:"Liquidité réduite",unit:"x",f:c=>`IF(${pasC(c)}<=0,"",(${actC(c)}-${BS(rB.STK,c)})/${pasC(c)})`},
      {lab:"Liquidité immédiate",unit:"x",f:c=>`IF(${pasC(c)}<=0,"",MAX(0,${BS(rB.TN,c)})/${pasC(c)})`},
      {lab:"BFR en jours de CA",unit:"j",f:c=>`IF(${ca(c)}=0,"",${BS(rB.BFR,c)}*360/${ca(c)})`},
      {lab:"Délai clients (DSO)",unit:"j",f:c=>`IF(${ca(c)}=0,"",${BS(rB.CLI,c)}*360/(${ca(c)}*1.18))`},
      {lab:"Délai fournisseurs (DPO)",unit:"j",f:c=>`IF((${achats(c)}+${opex(c)})<=0,"",(-${BS(rB.FRN,c)})*360/((${achats(c)}+${opex(c)})*1.18))`},
      {lab:"Gearing (dette fin. / capitaux propres)",unit:"x",f:c=>`IF(${cp(c)}<=0,"",${dfin(c)}/${cp(c)})`},
      {lab:"Leverage (dette nette / EBITDA)",unit:"x",f:c=>`IF(${ebitda(c)}<=0,"",${dnet(c)}/${ebitda(c)})`},
      {lab:"Couverture des intérêts (EBITDA / frais fin.)",unit:"x",f:c=>`IF((-${PL(rP.FRAIS_FIN,c)})<=0,"",${ebitda(c)}/(-${PL(rP.FRAIS_FIN,c)}))`},
      {lab:"Autonomie financière (CP / total actif)",unit:"%",f:c=>`IF(${totA(c)}<=0,"",${cp(c)}/${totA(c)})`}
    ];
    const show=A.map((a,j)=>({col:L(3+j),cell:3+j}));
    const deltas=A.slice(1).map((a,i)=>({cell:3+n+i,c1:L(3+i),c2:L(4+i)}));
    dbBlocRatios(wsB,"Ratios de structure, rentabilité et liquidité",items,show,deltas);
  }
  wsB.columns=[{width:3},{width:44},...Array(n).fill({width:14}),...Array(n-1).fill({width:9}),...(avecCagr?[{width:9}]:[])];
  const refB="'"+nomOnglet("Bilan").replace(/'/g,"''")+"'";

  /* ================= TFT officiel (dérivé du bilan) ================= */
  if(n>1){
    const ws=wb.addWorksheet(nomOnglet("TFT"));
    titreLiasse(ws,"Tableau des flux de trésorerie — FORMULES — modèle officiel SYSCOHADA — "+u.lib);
    const cols=A.slice(1),m=cols.length;
    const dT=cols.slice(1).map((a,i)=>"Δ"+String(cols[i]).slice(-2)+"-"+String(a).slice(-2));
    const hd=ws.addRow([null,u.lib,...cols.map(a=>"FY"+String(a).slice(-2)),...dT]);
    styliserEntete(hd,2);
    for(let c=3+m;c<=2+m+(m-1);c++)hd.getCell(c).fill=DELTA_FILL;
    const rt={};let rn=5;
    TFT_DEF.forEach(([code,lib,st])=>{
      if(!code){const r=ws.addRow([null,lib]);r.font={bold:true,italic:true,color:{argb:"FF172554"}};rn++;return;}
      rt[code]=rn;ws.getCell(rn,2).value=lib;
      if(st==="total"){const r=ws.getRow(rn);r.font={bold:true,color:{argb:"FF172554"}};
        for(let c=2;c<=2+m+(m-1);c++)r.getCell(c).fill=FOND_TOTAL;}
      rn++;
    });
    const rtE=rn;ws.getCell(rtE,2).value="Écart de réconciliation (doit être 0)";
    ws.getRow(rtE).font={italic:true,color:{argb:"FF808080"}};
    const B_=(row,i)=>`${refB}!${L(4+i)}${row}`;      /* colonne hist i+1 du bilan */
    const Bp_=(row,i)=>`${refB}!${L(3+i)}${row}`;     /* colonne hist i (précédente) */
    const P_=(row,i)=>`${refP}!${L(4+i)}${row}`;
    const Pp_=(row,i)=>`${refP}!${L(3+i)}${row}`;
    const dR=(row,i)=>`(${B_(row,i)}-${Bp_(row,i)})`;
    cols.forEach((a,i)=>{
      const c=3+i,Lc=L(c);
      const F=(row,f)=>{const cl=ws.getCell(row,c);cl.value={formula:f};cl.numFmt=NF;};
      F(rt.ZA,i===0?`${refB}!${L(3)}${rB.TN}`:`${L(c-1)}${rt.ZG}`);
      F(rt.FA,`${P_(rP.RN,i)}-${dR(rB.AMC,i)}-${dR(rB.PRV,i)}`);
      F(rt.VAR_CREANCES,`-(${dR(rB.CLI,i)}+${dR(rB.ACR,i)}+${dR(rB.AVF,i)}${persoBA.map((x,k)=>"+"+dR(rB["PBA"+k],i)).join("")})`);
      F(rt.FC,`-${dR(rB.STK,i)}`);
      F(rt.FE,`-(${dR(rB.FRN,i)}+${dR(rB.CAV,i)}+${dR(rB.DSO,i)}+${dR(rB.DFI,i)}+${dR(rB.ADT,i)}${persoBP.map((x,k)=>"+"+dR(rB["PBP"+k],i)).join("")})`);
      F(rt.ZB,`SUM(${Lc}${rt.FA}:${Lc}${rt.FE})`);
      F(rt.ACQUIS_IMMO,`-(${dR(rB.BRI,i)}+${dR(rB.BRC,i)}+${dR(rB.BRF,i)})`);
      F(rt.CESSION_IMMO,`0`);
      F(rt.ZC,`SUM(${Lc}${rt.ACQUIS_IMMO}:${Lc}${rt.CESSION_IMMO})`);
      F(rt.FK,`${dR(rB.CAP,i)}${persoCP.map((x,k)=>"+"+dR(rB["PCP"+k],i)).join("")}`);
      F(rt.FL,`${dR(rB.SUB,i)}`);
      F(rt.FN,`(${B_(rB.PRI,i)}+${B_(rB.RAN,i)})-(${Bp_(rB.PRI,i)}+${Bp_(rB.RAN,i)})-${Pp_(rP.RN,i)}`);
      F(rt.EMPRUNT,`MAX(0,-${dR(rB.DET,i)})`);
      F(rt.REMBOURS,`MIN(0,-${dR(rB.DET,i)})`);
      F(rt.ZFIN,`SUM(${Lc}${rt.FK}:${Lc}${rt.REMBOURS})`);
      F(rt.ZF,`${Lc}${rt.ZB}+${Lc}${rt.ZC}+${Lc}${rt.ZFIN}`);
      F(rt.ZG,`${Lc}${rt.ZA}+${Lc}${rt.ZF}`);
      F(rtE,`${Lc}${rt.ZG}-${B_(rB.TN,i)}`);
      /* variations */
      if(i>0){const cl=ws.getCell(rt.ZF,c+m);/* rien : Δ ci-dessous */}
    });
    /* colonnes Δ du TFT */
    Object.values(rt).forEach(row=>{
      cols.slice(1).forEach((a,i)=>{
        const c1=L(3+i),c2=L(4+i);
        const cl=ws.getCell(row,3+m+i);
        cl.value={formula:`IF(${c1}${row}=0,"na",${c2}${row}/${c1}${row}-1)`};
        cl.numFmt='0%;(0%)';cl.alignment={horizontal:"right"};
      });
    });
    {
      const items=[
        {lab:"CAFG / CA",unit:"%",f:c=>{const p=String.fromCharCode(c.charCodeAt(0)+1);return `IF(${refP}!${p}${rP.CA}=0,"",${c}${rt.FA}/${refP}!${p}${rP.CA})`;}},
        {lab:"Conversion en cash (flux d'exploitation / EBITDA)",unit:"%",f:c=>{const p=String.fromCharCode(c.charCodeAt(0)+1);return `IF(${refP}!${p}${rP.EBITDA}=0,"",${c}${rt.ZB}/${refP}!${p}${rP.EBITDA})`;}},
        {lab:"Free cash flow / CA (exploitation + investissement)",unit:"%",f:c=>{const p=String.fromCharCode(c.charCodeAt(0)+1);return `IF(${refP}!${p}${rP.CA}=0,"",(${c}${rt.ZB}+${c}${rt.ZC})/${refP}!${p}${rP.CA})`;}},
        {lab:"Capacité de remboursement (dette fin. / CAFG)",unit:"x",f:c=>{const p=String.fromCharCode(c.charCodeAt(0)+1);return `IF(${c}${rt.FA}<=0,"",(-${refB}!${p}${rB.DET})/${c}${rt.FA})`;}},
        {lab:"Couverture des investissements (flux exploit. / invest.)",unit:"x",f:c=>`IF(${c}${rt.ZC}=0,"",${c}${rt.ZB}/ABS(${c}${rt.ZC}))`}
      ];
      const show=cols.map((a,i)=>({col:L(3+i),cell:3+i}));
      const deltas=cols.slice(1).map((a,i)=>({cell:3+m+i,c1:L(3+i),c2:L(4+i)}));
      dbBlocRatios(ws,"Ratios de flux et de trésorerie",items,show,deltas);
    }
    ws.columns=[{width:3},{width:56},...Array(m).fill({width:14}),...Array(m-1).fill({width:9})];
  }
}
