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
    /* bloc ratios de marge en bas de la feuille P&L */
    wsP._rn++;
    const rhn=wsP._rn++;
    wsP.getCell(rhn,2).value="Ratios de marge (% du chiffre d'affaires)";
    wsP.getRow(rhn).font={bold:true,color:{argb:"FF172554"}};
    [["MARGE_BRUTE","Marge brute / CA"],["EBITDA","Marge d'EBITDA"],
     ["EBIT","Marge d'exploitation (EBIT)"],["RESULTAT_NET","Marge nette"]].forEach(([c,lib])=>{
      if(rc[c]) ligneF(wsP,lib,i=>`IF(${L(3+i)}${rc["CA"]}=0,"",${L(3+i)}${rc[c]}/${L(3+i)}${rc["CA"]})`,{pct:1});
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
  bs("ACR","Autres créances",["AUTRES_CREANCES"]);
  bs("ADT","Autres dettes",["AUTRES_DETTES"]);
  bs("HAA","Créances HAO",["HAO_ACTIF"]);
  bs("HAP","Dettes HAO",["HAO_PASSIF"]);
  rB.BFRH=ligneF(wsB,"BFR hors exploitation",somme([rB.ACR,rB.ADT,rB.HAA,rB.HAP]),{st:1});
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
      F(rt.VAR_CREANCES,`-(${dR(rB.CLI,i)}+${dR(rB.ACR,i)}+${dR(rB.AVF,i)}+${dR(rB.HAA,i)}${persoBA.map((x,k)=>"+"+dR(rB["PBA"+k],i)).join("")})`);
      F(rt.FC,`-${dR(rB.STK,i)}`);
      F(rt.FE,`-(${dR(rB.FRN,i)}+${dR(rB.CAV,i)}+${dR(rB.DSO,i)}+${dR(rB.DFI,i)}+${dR(rB.ADT,i)}+${dR(rB.HAP,i)}${persoBP.map((x,k)=>"+"+dR(rB["PBP"+k],i)).join("")})`);
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
    ws.columns=[{width:3},{width:56},...Array(m).fill({width:14}),...Array(m-1).fill({width:9})];
  }
}
