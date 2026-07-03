/* ============================================================
   Modèle financier Excel à FORMULES VIVANTES
   Hypothèses (cellules jaunes éditables) → P&L / Bilan / TFT
   prévisionnels, dette par millésime, valorisation DCF.
   Reproduit exactement les équations de bp.js.
   ============================================================ */
function construireFeuillesBP(wb){
  const H=assurerBP();
  const sc=H.scenarios[H.scenario]||H.scenarios.base;
  const u=uni(),UF=u.f;
  const NF=u.dec?'#,##0.0;(#,##0.0);"-"':'#,##0;(#,##0);"-"';
  const PCT="0.0%",PCT2="0.00%";
  const mnt=x=>(x===null||x===undefined)?null:(u.dec?Math.round(x*UF*10)/10:Math.round(x*UF));
  const A=ETATS.annees,v=ETATS.v,nH=A.length,a1=A[nH-1];
  const N=H.nb||5,AP=Array.from({length:N},(_,i)=>a1+1+i);
  const m=H.opex.length;
  const L=i=>String.fromCharCode(64+i);           /* index colonne → lettre */
  const cH=i=>3+i, cHL=2+nH, cP=i=>3+nH+i;        /* colonnes hist / dernière hist / proj */
  const JAUNE={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};
  const nomH=nomOnglet("Hypothèses BP"),nomP=nomOnglet("P&L prévisionnel"),
        nomB=nomOnglet("Bilan prévisionnel"),nomT=nomOnglet("TFT prévisionnel"),
        nomD=nomOnglet("Dette"),nomV=nomOnglet("Valorisation");
  const q=n=>"'"+n.replace(/'/g,"''")+"'";
  const rH=q(nomH),rP=q(nomP),rB=q(nomB),rD=q(nomD);

  /* ---------- cartes de lignes (déterministes) ---------- */
  const hy={caCroiss:5,cd:6,apMont:7,apCroiss:8,pers:9,infl:10,is:11,opex0:12};
  const hb=12+m;
  Object.assign(hy,{dso:hb,dio:hb+1,dpo:hb+2,ac:hb+3,ad:hb+4,capex:hb+5,amort:hb+6,
    tauxEx:hb+7,durEx:hb+8,empr:hb+9,tauxN:hb+10,durN:hb+11,pfin:hb+12,payout:hb+13,
    rf:hb+15,pm:hb+16,beta:hb+17,ps:hb+18,kd:hb+19,wd:hb+20,g:hb+21,mc:hb+22,mt:hb+23,adjE:hb+24});
  const rp={CA:5,CD:6,MB:7,PMB:8,AP_:9,SEC:10,opex0:11,TFG:11+m,PERS:12+m,EBITDA:13+m,
    PEB:14+m,DA:15+m,EBIT:16+m,PF:17+m,FF:18+m,EBT:19+m,IS:20+m,RN:21+m};
  const rb={BRUT:5,AMC:6,IMN:7,STK:8,CLI:9,ACR:10,FRN:11,ADT:12,BFR:13,CP:14,DIV:15,
    DET:16,PROV:17,TRES:18,CTRL:19};
  const rd={OUV:5,TIR:6,REMB:7,INT:8,CLO:9,EXO:11,EXR:12,EXC:13,EXI:14,
    MR:16,MS:16+N,MI:16+2*N,RN_:16+3*N,SN:17+3*N,IN_:18+3*N};

  /* helpers d'écriture */
  const prep=(ws,libArr)=>{const r=ws.addRow(libArr);return r;};
  const cellF=(ws,rn,c,f,fmt)=>{const cl=ws.getCell(rn,c);cl.value={formula:f};if(fmt)cl.numFmt=fmt;return cl;};
  const cellV=(ws,rn,c,val,fmt)=>{const cl=ws.getCell(rn,c);cl.value=val;if(fmt)cl.numFmt=fmt;return cl;};
  const totalRow=(ws,rn,nb)=>{const r=ws.getRow(rn);r.font={bold:true,color:{argb:"FF172554"}};
    for(let c=2;c<=nb;c++)r.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};};

  /* ================= HYPOTHÈSES (jaune = modifiable) ================= */
  const wsH=wb.addWorksheet(nomH);
  titreLiasse(wsH,"Hypothèses du modèle — cellules jaunes modifiables — scénario "+sc.lab+" intégré");
  styliserEntete(wsH.addRow([null,"Hypothèse","Valeur",...Array(nH-1).fill(""),...AP.map(a=>"FY"+String(a).slice(-2)+"p")]),2);
  const hRow=(rn,lib)=>{cellV(wsH,rn,2,lib);};
  const hVal=(rn,val,fmt)=>{const c=cellV(wsH,rn,3,val,fmt);c.fill=JAUNE;};
  const hSer=(rn,vals,fmt,scale)=>{vals.forEach((x,i)=>{const c=cellV(wsH,rn,cP(i),scale?mnt(x):x,fmt);c.fill=JAUNE;});};
  hRow(hy.caCroiss,"Croissance du CA par année");hSer(hy.caCroiss,H.caCroiss.map(x=>x+sc.dCA),PCT);
  hRow(hy.cd,"Coûts directs (% du CA)");hVal(hy.cd,Math.max(0,H.coutsDirects_pct-sc.dMarge),PCT2);
  hRow(hy.apMont,"Autres produits — an 1 (montant)");hVal(hy.apMont,mnt(H.autresProd_montant),NF);
  hRow(hy.apCroiss,"Autres produits — croissance");hVal(hy.apCroiss,H.autresProd_croiss,PCT);
  hRow(hy.pers,"Croissance des charges de personnel");hVal(hy.pers,H.personnel_croiss,PCT);
  hRow(hy.infl,"Taux d'inflation (défaut frais généraux)");hVal(hy.infl,H.inflation||0.03,PCT2);
  hRow(hy.is,"Taux d'IS effectif");hVal(hy.is,H.is_taux,PCT2);
  H.opex.forEach((o,j)=>{
    hRow(hy.opex0+j,o.lib+(o.mode==="pctCA"?" (% du CA)":o.mode==="croissance"?" (croissance propre)":" (inflation)"));
    if(o.mode==="inflation"){
      const c=cellF(wsH,hy.opex0+j,3,"$C$"+hy.infl,PCT2);c.fill=JAUNE;
    }else hVal(hy.opex0+j,o.mode==="pctCA"?o.pct:o.croiss,PCT2);
  });
  hRow(hy.dso,"Délai clients — DSO (jours)");hVal(hy.dso,H.dso+sc.dJours,"0");
  hRow(hy.dio,"Rotation des stocks — DIO (jours)");hVal(hy.dio,H.dio,"0");
  hRow(hy.dpo,"Délai fournisseurs — DPO (jours)");hVal(hy.dpo,H.dpo,"0");
  hRow(hy.ac,"Autres créances (% du CA)");hVal(hy.ac,H.autresCreances_pct,PCT2);
  hRow(hy.ad,"Autres dettes (% du CA)");hVal(hy.ad,H.autresDettes_pct,PCT2);
  hRow(hy.capex,"Investissements (CAPEX) par année");hSer(hy.capex,H.capex,NF,true);
  hRow(hy.amort,"Taux d'amortissement (sur brut)");hVal(hy.amort,H.amort_taux,PCT2);
  hRow(hy.tauxEx,"Taux d'intérêt — dette existante");hVal(hy.tauxEx,H.dette_taux,PCT2);
  hRow(hy.durEx,"Durée résiduelle dette existante (ans)");hVal(hy.durEx,H.dette_dureeResiduelle,"0");
  hRow(hy.empr,"Nouveaux emprunts par année");hSer(hy.empr,H.nouveauxEmprunts,NF,true);
  hRow(hy.tauxN,"Taux des nouveaux emprunts");hVal(hy.tauxN,H.emprunt_taux,PCT2);
  hRow(hy.durN,"Durée des nouveaux emprunts (ans)");hVal(hy.durN,H.emprunt_duree,"0");
  hRow(hy.pfin,"Produits financiers annuels");hVal(hy.pfin,mnt(H.produitsFin_montant),NF);
  hRow(hy.payout,"Dividendes (% du résultat N-1)");hVal(hy.payout,H.dividendes_payout,PCT);
  cellV(wsH,hb+14,2,"— Valorisation —").font={bold:true,color:{argb:"FF172554"}};
  hRow(hy.rf,"Taux sans risque");hVal(hy.rf,H.valo.rf,PCT2);
  hRow(hy.pm,"Prime de risque marché");hVal(hy.pm,H.valo.primeMarche,PCT2);
  hRow(hy.beta,"Beta");hVal(hy.beta,H.valo.beta,"0.00");
  hRow(hy.ps,"Prime spécifique");hVal(hy.ps,H.valo.primeSpecifique,PCT2);
  hRow(hy.kd,"Coût de la dette (brut)");hVal(hy.kd,H.valo.coutDette,PCT2);
  hRow(hy.wd,"Poids de la dette");hVal(hy.wd,H.valo.poidsDette,PCT);
  hRow(hy.g,"Croissance à l'infini (g)");hVal(hy.g,H.valo.g,PCT2);
  hRow(hy.mc,"Multiples boursiers (bas/central/haut)");
  ["min","central","max"].forEach((k,i)=>{const c=cellV(wsH,hy.mc,3+i,H.valo.multiplesComparables[k],"0.0");c.fill=JAUNE;});
  hRow(hy.mt,"Multiples de transactions (bas/central/haut)");
  ["min","central","max"].forEach((k,i)=>{const c=cellV(wsH,hy.mt,3+i,H.valo.multiplesTransactions[k],"0.0");c.fill=JAUNE;});
  hRow(hy.adjE,"Ajustement d'EBITDA (référence des multiples)");
  hVal(hy.adjE,mnt((H.valo.useAdj&&H.valo.adjEbitda)?H.valo.adjEbitda:0),NF);
  wsH.columns=[{width:3},{width:46},...Array(nH).fill({width:12}),...AP.map(()=>({width:12}))];

  /* références Hypothèses */
  const h1=(rn)=>`${rH}!$C$${rn}`;
  const hp=(rn,i)=>`${rH}!${L(cP(i))}$${rn}`;

  /* ================= squelette d'une feuille d'état ================= */
  function feuille(nom,sousTitre,defs){
    const ws=wb.addWorksheet(nom);
    titreLiasse(ws,sousTitre);
    styliserEntete(ws.addRow([null,u.lib,...A.map(a=>"FY"+String(a).slice(-2)),...AP.map(a=>"FY"+String(a).slice(-2)+"p")]),2);
    defs.forEach(d=>{
      const rn=d.rn;
      cellV(ws,rn,2,d.lib);
      if(d.hist)A.forEach((a,i)=>cellV(ws,rn,cH(i),d.pct?d.hist(a):mnt(d.hist(a)),d.pct?PCT:NF));
      if(d.f)AP.forEach((a,i)=>cellF(ws,rn,cP(i),d.f(i,a),d.pct?PCT:NF));
      if(d.sec){const r=ws.getRow(rn);r.getCell(2).font={bold:true,italic:true,color:{argb:"FF172554"}};}
      if(d.pctRow){const r=ws.getRow(rn);r.font={italic:true,color:{argb:"FF808080"}};}
      if(d.st)totalRow(ws,rn,2+nH+N);
    });
    ws.columns=[{width:3},{width:42},...Array(nH+N).fill({width:13})];
    return ws;
  }
  const P=(row,i)=>`${rP}!${L(cP(i))}${row}`;      /* cellule proj P&L */
  const Pp=(row,i)=>i===0?`${rP}!${L(cHL)}${row}`:`${rP}!${L(cP(i-1))}${row}`; /* précédent (an1 → hist) */
  const B=(row,i)=>`${rB}!${L(cP(i))}${row}`;
  const Bp=(row,i)=>i===0?`${rB}!${L(cHL)}${row}`:`${rB}!${L(cP(i-1))}${row}`;
  const D=(row,i)=>`${rD}!${L(cP(i))}${row}`;
  const S=(row)=>`${L(cP(0))}${row}:${L(cP(N-1))}${row}`;

  /* ================= P&L prévisionnel ================= */
  const defsP=[
   {rn:rp.CA,lib:"Chiffre d'affaires",st:1,hist:a=>v.CA[a],
    f:i=>`${Pp(rp.CA,i)}*(1+${hp(hy.caCroiss,i)})`},
   {rn:rp.CD,lib:"Coûts directs",hist:a=>v.COUTS_DIRECTS[a],
    f:i=>`-${P(rp.CA,i)}*${h1(hy.cd)}`},
   {rn:rp.MB,lib:"Marge brute",st:1,hist:a=>v.MARGE_BRUTE[a],
    f:i=>`${P(rp.CA,i)}+${P(rp.CD,i)}`},
   {rn:rp.PMB,lib:"% Marge brute / CA",pct:1,pctRow:1,hist:a=>v.CA[a]?v.MARGE_BRUTE[a]/v.CA[a]:null,
    f:i=>`IF(${P(rp.CA,i)}=0,"",${P(rp.MB,i)}/${P(rp.CA,i)})`},
   {rn:rp.AP_,lib:"Subventions et autres produits",hist:a=>v.AUTRES_PROD[a],
    f:i=>i===0?`${h1(hy.apMont)}*(1+${h1(hy.apCroiss)})`:`${Pp(rp.AP_,i)}*(1+${h1(hy.apCroiss)})`},
   {rn:rp.SEC,lib:"Frais généraux — détail",sec:1},
   ...H.opex.map((o,j)=>({rn:rp.opex0+j,lib:o.lib,hist:a=>v[o.code]?v[o.code][a]:0,
    f:o.mode==="pctCA"
      ?(i=>`-${P(rp.CA,i)}*${h1(hy.opex0+j)}`)
      :(i=>`${Pp(rp.opex0+j,i)}*(1+${h1(hy.opex0+j)})`)})),
   {rn:rp.TFG,lib:"Total frais généraux",st:1,hist:a=>v.OPEX[a],
    f:i=>`SUM(${L(cP(i))}${rp.opex0}:${L(cP(i))}${rp.opex0+m-1})`},
   {rn:rp.PERS,lib:"Charges de personnel",hist:a=>v.CHARGES_PERSONNEL[a],
    f:i=>`${Pp(rp.PERS,i)}*(1+${h1(hy.pers)})`},
   {rn:rp.EBITDA,lib:"EBITDA",st:1,hist:a=>v.EBITDA[a],
    f:i=>`${P(rp.MB,i)}+${P(rp.AP_,i)}+${P(rp.TFG,i)}+${P(rp.PERS,i)}`},
   {rn:rp.PEB,lib:"% EBITDA / CA",pct:1,pctRow:1,hist:a=>v.CA[a]?v.EBITDA[a]/v.CA[a]:null,
    f:i=>`IF(${P(rp.CA,i)}=0,"",${P(rp.EBITDA,i)}/${P(rp.CA,i)})`},
   {rn:rp.DA,lib:"Dotations aux amortissements",hist:a=>v.DA[a],
    f:i=>`-MIN(${h1(hy.amort)}*${B(rb.BRUT,i)},${B(rb.BRUT,i)}+${Bp(rb.AMC,i)})`},
   {rn:rp.EBIT,lib:"EBIT",st:1,hist:a=>v.EBIT[a],
    f:i=>`${P(rp.EBITDA,i)}+${P(rp.DA,i)}`},
   {rn:rp.PF,lib:"Produits financiers",hist:a=>v.RESULTAT_FIN[a]>0?v.RESULTAT_FIN[a]:0,
    f:i=>`${h1(hy.pfin)}`},
   {rn:rp.FF,lib:"Frais financiers",hist:a=>v.RESULTAT_FIN[a]<0?v.RESULTAT_FIN[a]:0,
    f:i=>`-${D(rd.INT,i)}`},
   {rn:rp.EBT,lib:"Résultat avant impôt",st:1,hist:a=>v.EBIT[a]+v.RESULTAT_FIN[a],
    f:i=>`${P(rp.EBIT,i)}+${P(rp.PF,i)}+${P(rp.FF,i)}`},
   {rn:rp.IS,lib:"Impôt sur les sociétés",hist:a=>v.IMPOTS[a],
    f:i=>`IF(${P(rp.EBT,i)}>0,-${h1(hy.is)}*${P(rp.EBT,i)},0)`},
   {rn:rp.RN,lib:"Résultat net",st:1,hist:a=>v.RESULTAT_NET[a],
    f:i=>`${P(rp.EBT,i)}+${P(rp.IS,i)}`}];
  feuille(nomP,"Compte de résultat prévisionnel — FORMULES — scénario "+sc.lab+" — "+u.lib,defsP);

  /* ================= Bilan prévisionnel ================= */
  const defsB=[
   {rn:rb.BRUT,lib:"Immobilisations brutes",hist:a=>v.ACTIFS_IMMOBILISES[a]-v.AMORT_DEPREC[a],
    f:i=>`${Bp(rb.BRUT,i)}+${hp(hy.capex,i)}`},
   {rn:rb.AMC,lib:"Amortissements cumulés",hist:a=>v.AMORT_DEPREC[a],
    f:i=>`${Bp(rb.AMC,i)}+${P(rp.DA,i)}`},
   {rn:rb.IMN,lib:"Immobilisations nettes",st:1,hist:a=>v.ACTIFS_IMMOBILISES[a],
    f:i=>`${B(rb.BRUT,i)}+${B(rb.AMC,i)}`},
   {rn:rb.STK,lib:"Stocks",hist:a=>v.STOCKS[a],
    f:i=>`-${P(rp.CD,i)}*${h1(hy.dio)}/360`},
   {rn:rb.CLI,lib:"Créances clients",hist:a=>v.CLIENTS[a],
    f:i=>`${P(rp.CA,i)}*${h1(hy.dso)}/360`},
   {rn:rb.ACR,lib:"Autres créances",hist:a=>v.AUTRES_CREANCES[a]+v.AVANCES_FRS[a]+v.HAO_ACTIF[a],
    f:i=>`${P(rp.CA,i)}*${h1(hy.ac)}`},
   {rn:rb.FRN,lib:"Dettes fournisseurs",hist:a=>v.FOURNISSEURS[a],
    f:i=>`(${P(rp.CD,i)}+${P(rp.TFG,i)})*${h1(hy.dpo)}/360`},
   {rn:rb.ADT,lib:"Autres dettes",hist:a=>v.DETTES_SOCIALES[a]+v.DETTES_FISCALES[a]+v.AUTRES_DETTES[a]+v.CLIENTS_AVANCES[a]+v.HAO_PASSIF[a],
    f:i=>`-${P(rp.CA,i)}*${h1(hy.ad)}`},
   {rn:rb.BFR,lib:"Besoin en fonds de roulement",st:1,hist:a=>v.BFR[a],
    f:i=>`SUM(${L(cP(i))}${rb.STK}:${L(cP(i))}${rb.ADT})`},
   {rn:rb.CP,lib:"Capitaux propres",hist:a=>v.CAPITAUX_PROPRES[a],
    f:i=>`${Bp(rb.CP,i)}+${P(rp.RN,i)}-${B(rb.DIV,i)}`},
   {rn:rb.DIV,lib:"Dividendes versés (mémo)",pctRow:1,hist:()=>0,
    f:i=>`MAX(0,${h1(hy.payout)}*${Pp(rp.RN,i)})`},
   {rn:rb.DET,lib:"Dettes financières",hist:a=>-v.DETTES_FINANCIERES[a],
    f:i=>`${D(rd.CLO,i)}`},
   {rn:rb.PROV,lib:"Provisions pour risques et charges",hist:a=>-v.PROVISIONS_RC[a],
    f:i=>`${Bp(rb.PROV,i)}`},
   {rn:rb.TRES,lib:"Trésorerie nette (bouclage)",st:1,hist:a=>v.TRESORERIE_NETTE[a],
    f:i=>`${B(rb.CP,i)}+${B(rb.DET,i)}+${B(rb.PROV,i)}-${B(rb.IMN,i)}-${B(rb.BFR,i)}`},
   {rn:rb.CTRL,lib:"Contrôle : actif - passif (doit être 0)",pctRow:1,hist:()=>0,
    f:i=>`${B(rb.IMN,i)}+${B(rb.BFR,i)}+${B(rb.TRES,i)}-${B(rb.CP,i)}-${B(rb.DET,i)}-${B(rb.PROV,i)}`}];
  feuille(nomB,"Bilan prévisionnel — FORMULES — bouclé par la trésorerie — "+u.lib,defsB);

  /* ================= Dette (par millésime) ================= */
  const wsD=wb.addWorksheet(nomD);
  titreLiasse(wsD,"Dette financière — FORMULES — existante et nouveaux emprunts par millésime — "+u.lib);
  styliserEntete(wsD.addRow([null,u.lib,...Array(nH-1).fill(""),"",...AP.map(a=>"FY"+String(a).slice(-2)+"p")]),2);
  const dl=(rn,lib)=>cellV(wsD,rn,2,lib);
  dl(rd.OUV,"Encours à l'ouverture");dl(rd.TIR,"Nouveaux emprunts tirés");
  dl(rd.REMB,"Remboursements");dl(rd.INT,"Intérêts de la période");dl(rd.CLO,"Encours à la clôture");
  cellV(wsD,rd.EXO-1,2,"— Dette existante —").font={bold:true,italic:true,color:{argb:"FF172554"}};
  dl(rd.EXO,"Existante — ouverture");dl(rd.EXR,"Existante — remboursement");
  dl(rd.EXC,"Existante — clôture");dl(rd.EXI,"Existante — intérêts");
  cellV(wsD,rd.MR-1,2,"— Nouveaux emprunts : remboursements / soldes / intérêts par millésime —").font={bold:true,italic:true,color:{argb:"FF172554"}};
  const D0=`${rB}!${L(cHL)}$${rb.DET}`;           /* dette existante initiale (hist) */
  AP.forEach((a,i)=>{
    const c=cP(i),Lc=L(c);
    cellF(wsD,rd.EXO,c,i===0?`${D0}`:`${L(cP(i-1))}${rd.EXC}`,NF);
    cellF(wsD,rd.EXR,c,`MIN(${Lc}${rd.EXO},${D0}/${h1(hy.durEx)})`,NF);
    cellF(wsD,rd.EXC,c,`${Lc}${rd.EXO}-${Lc}${rd.EXR}`,NF);
    cellF(wsD,rd.EXI,c,`${h1(hy.tauxEx)}*(${Lc}${rd.EXO}+${Lc}${rd.EXC})/2`,NF);
    for(let k=0;k<N;k++){
      const T=hp(hy.empr,k);
      /* remboursement du millésime k+1 l'année i+1 */
      cellF(wsD,rd.MR+k,c,(i>k)?`IF(${i+1}<=${k+1}+${h1(hy.durN)},${T}/${h1(hy.durN)},0)`:`0`,NF);
      /* solde fin */
      cellF(wsD,rd.MS+k,c,(i>=k)?`MAX(0,${T}-SUM(${L(cP(k))}${rd.MR+k}:${Lc}${rd.MR+k}))`:`0`,NF);
      /* intérêts : taux × (solde début + solde fin)/2 ; solde début = solde fin précédent + tirage l'année k */
      const sDeb=(i===k)?T:((i>k)?`${L(cP(i-1))}${rd.MS+k}`:"0");
      cellF(wsD,rd.MI+k,c,(i>=k)?`${h1(hy.tauxN)}*(${sDeb}+${Lc}${rd.MS+k})/2`:`0`,NF);
      if(i===0){cellV(wsD,rd.MR+k,2,"Remb. millésime an "+(k+1));
        cellV(wsD,rd.MS+k,2,"Solde millésime an "+(k+1));
        cellV(wsD,rd.MI+k,2,"Intérêts millésime an "+(k+1));}
    }
    cellF(wsD,rd.RN_,c,`SUM(${Lc}${rd.MR}:${Lc}${rd.MR+N-1})`,NF);
    cellF(wsD,rd.SN,c,`SUM(${Lc}${rd.MS}:${Lc}${rd.MS+N-1})`,NF);
    cellF(wsD,rd.IN_,c,`SUM(${Lc}${rd.MI}:${Lc}${rd.MI+N-1})`,NF);
    /* agrégats */
    cellF(wsD,rd.OUV,c,i===0?`${D0}`:`${L(cP(i-1))}${rd.CLO}`,NF);
    cellF(wsD,rd.TIR,c,`${hp(hy.empr,i)}`,NF);
    cellF(wsD,rd.REMB,c,`${Lc}${rd.EXR}+${Lc}${rd.RN_}`,NF);
    cellF(wsD,rd.INT,c,`${Lc}${rd.EXI}+${Lc}${rd.IN_}`,NF);
    cellF(wsD,rd.CLO,c,`${Lc}${rd.EXC}+${Lc}${rd.SN}`,NF);
  });
  cellV(wsD,rd.RN_,2,"Total remboursements nouveaux");
  cellV(wsD,rd.SN,2,"Total soldes nouveaux");
  cellV(wsD,rd.IN_,2,"Total intérêts nouveaux");
  totalRow(wsD,rd.CLO,2+nH+N);
  wsD.columns=[{width:3},{width:34},...Array(nH+N).fill({width:12})];

  /* ================= TFT prévisionnel ================= */
  const wsT=wb.addWorksheet(nomT);
  titreLiasse(wsT,"TFT prévisionnel — FORMULES — modèle officiel SYSCOHADA — "+u.lib);
  styliserEntete(wsT.addRow([null,u.lib,...AP.map(a=>"FY"+String(a).slice(-2)+"p")]),2);
  const rt={};let rnT=5;
  TFT_DEF.forEach(([code,lib,st])=>{
    if(!code){const r=wsT.addRow([null,lib]);r.font={bold:true,italic:true,color:{argb:"FF172554"}};rnT++;return;}
    rt[code]=rnT;cellV(wsT,rnT,2,lib);
    if(st==="total")totalRow(wsT,rnT,2+N);
    rnT++;
  });
  const rtE=rnT;cellV(wsT,rtE,2,"Écart de réconciliation (doit être 0)");
  wsT.getRow(rtE).font={italic:true,color:{argb:"FF808080"}};
  AP.forEach((a,i)=>{
    const c=3+i,Lc=L(c);  /* TFT : colonnes proj seulement, dès C+... non — dès colonne 3 */
    const F=(row,f)=>cellF(wsT,row,c,f,NF);
    const pc=r=>`${L(c-1)}${r}`;
    F(rt.ZA,i===0?`${rB}!${L(cHL)}${rb.TRES}`:pc(rt.ZG));
    F(rt.FA,`${P(rp.RN,i)}-${P(rp.DA,i)}`);
    F(rt.FB,`0`);
    F(rt.FC,`-(${B(rb.STK,i)}-${Bp(rb.STK,i)})`);
    F(rt.FD,`-((${B(rb.CLI,i)}+${B(rb.ACR,i)})-(${Bp(rb.CLI,i)}+${Bp(rb.ACR,i)}))`);
    F(rt.FE,`-((${B(rb.FRN,i)}+${B(rb.ADT,i)})-(${Bp(rb.FRN,i)}+${Bp(rb.ADT,i)}))`);
    F(rt.ZB,`SUM(${Lc}${rt.FA}:${Lc}${rt.FE})`);
    F(rt.FF,`0`);F(rt.FG,`-${hp(hy.capex,i)}`);F(rt.FH,`0`);F(rt.FI,`0`);
    F(rt.ZC,`SUM(${Lc}${rt.FF}:${Lc}${rt.FI})`);
    F(rt.FK,`0`);F(rt.FL,`0`);F(rt.FN,`-${B(rb.DIV,i)}`);
    F(rt.ZD,`SUM(${Lc}${rt.FK}:${Lc}${rt.FN})`);
    F(rt.FO,`${D(rd.TIR,i)}-${D(rd.REMB,i)}`);
    F(rt.ZE,`${Lc}${rt.FO}`);
    F(rt.ZF,`${Lc}${rt.ZB}+${Lc}${rt.ZC}+${Lc}${rt.ZD}+${Lc}${rt.ZE}`);
    F(rt.ZG,`${Lc}${rt.ZA}+${Lc}${rt.ZF}`);
    F(rtE,`${Lc}${rt.ZG}-${B(rb.TRES,i)}`);
  });
  wsT.columns=[{width:3},{width:56},...AP.map(()=>({width:14}))];

  /* ================= Valorisation ================= */
  const wsV=wb.addWorksheet(nomV);
  titreLiasse(wsV,"Valorisation — FORMULES — DCF, multiples, ANR — "+u.lib);
  const rv={KE:5,KD:6,WACC:7,SEC:9,EBIT:10,IMP:11,NOP:12,DOT:13,DBF:14,CPX:15,FCF:16,PV:17,
    SPV:19,VT:20,VTP:21,EV:22,DN:23,EQ:24};
  cellV(wsV,rv.KE,2,"Coût des fonds propres (CAPM)");
  cellF(wsV,rv.KE,3,`${h1(hy.rf)}+${h1(hy.beta)}*${h1(hy.pm)}+${h1(hy.ps)}`,PCT2);
  cellV(wsV,rv.KD,2,"Coût de la dette net d'IS");
  cellF(wsV,rv.KD,3,`${h1(hy.kd)}*(1-${h1(hy.is)})`,PCT2);
  cellV(wsV,rv.WACC,2,"WACC");
  cellF(wsV,rv.WACC,3,`C${rv.KE}*(1-${h1(hy.wd)})+C${rv.KD}*${h1(hy.wd)}`,PCT2);
  totalRow(wsV,rv.WACC,3);
  const W=`$C$${rv.WACC}`,G=h1(hy.g);
  styliserEntete(wsV.addRow([null,"Construction du FCFF",...Array(1).fill(""),...AP.map(a=>"FY"+String(a).slice(-2)+"p")]),2);
  /* NB : la ligne d'en-tête ci-dessus atterrit après rv.EQ… on la place manuellement : */
  const vLibs=[[rv.EBIT,"EBIT"],[rv.IMP,"Impôt théorique sur l'EBIT"],[rv.NOP,"NOPAT"],
    [rv.DOT,"+ Dotations aux amortissements"],[rv.DBF,"± Variation du BFR"],
    [rv.CPX,"– Investissements"],[rv.FCF,"FCFF"],[rv.PV,"FCFF actualisés"]];
  vLibs.forEach(([rn,lib])=>cellV(wsV,rn,2,lib));
  AP.forEach((a,i)=>{
    const c=4+i,Lc=L(c);
    const F=(row,f)=>cellF(wsV,row,c,f,NF);
    F(rv.EBIT,`${P(rp.EBIT,i)}`);
    F(rv.IMP,`IF(${Lc}${rv.EBIT}>0,-${h1(hy.is)}*${Lc}${rv.EBIT},0)`);
    F(rv.NOP,`${Lc}${rv.EBIT}+${Lc}${rv.IMP}`);
    F(rv.DOT,`-${P(rp.DA,i)}`);
    F(rv.DBF,`-(${B(rb.BFR,i)}-${Bp(rb.BFR,i)})`);
    F(rv.CPX,`-${hp(hy.capex,i)}`);
    F(rv.FCF,`${Lc}${rv.NOP}+${Lc}${rv.DOT}+${Lc}${rv.DBF}+${Lc}${rv.CPX}`);
    F(rv.PV,`${Lc}${rv.FCF}/(1+${W})^${i+1}`);
  });
  totalRow(wsV,rv.FCF,3+N);
  const fcffRange=`${L(4)}${rv.FCF}:${L(3+N)}${rv.FCF}`;
  const lastF=`${L(3+N)}${rv.FCF}`;
  const bridge=[[rv.SPV,"Somme des FCFF actualisés",`SUM(${L(4)}${rv.PV}:${L(3+N)}${rv.PV})`],
    [rv.VT,"Valeur terminale",`${lastF}*(1+${G})/(${W}-${G})`],
    [rv.VTP,"Valeur terminale actualisée",`C${rv.VT}/(1+${W})^${N}`],
    [rv.EV,"Valeur d'entreprise (EV)",`C${rv.SPV}+C${rv.VTP}`],
    [rv.DN,"Dette nette (dernier exercice réel)",`${rB}!${L(cHL)}${rb.DET}-${rB}!${L(cHL)}${rb.TRES}`],
    [rv.EQ,"Valeur des fonds propres (DCF)",`C${rv.EV}-C${rv.DN}`]];
  bridge.forEach(([rn,lib,f])=>{cellV(wsV,rn,2,lib);cellF(wsV,rn,3,f,NF);});
  totalRow(wsV,rv.EV,3);totalRow(wsV,rv.EQ,3);
  /* sensibilité */
  const rs=rv.EQ+2;
  cellV(wsV,rs,2,"Sensibilité (fonds propres)").font={bold:true,color:{argb:"FF172554"}};
  [-0.01,-0.005,0,0.005,0.01].forEach((dg,jx)=>{
    cellF(wsV,rs,3+jx,`"g "&TEXT(${G}+${dg},"0.0%")`,undefined);
  });
  [-0.01,-0.005,0,0.005,0.01].forEach((dw,ix)=>{
    const rn=rs+1+ix;
    cellF(wsV,rn,2,`"WACC "&TEXT(${W}+${dw},"0.0%")`);
    [-0.01,-0.005,0,0.005,0.01].forEach((dg,jx)=>{
      const w=`(${W}+${dw})`,g=`(${G}+${dg})`;
      cellF(wsV,rn,3+jx,
        `SUMPRODUCT(${fcffRange}*(1+${w})^-(COLUMN(${fcffRange})-COLUMN(${L(4)}${rv.FCF})+1))`+
        `+${lastF}*(1+${g})/(${w}-${g})/(1+${w})^${N}-$C$${rv.DN}`,NF);
    });
  });
  /* méthodes */
  const rm=rs+7;
  cellV(wsV,rm,2,"Méthode").font={bold:true,color:{argb:"FF172554"}};
  ["Bas","Central","Haut"].forEach((t,i)=>cellV(wsV,rm,3+i,t).font={bold:true,color:{argb:"FF172554"}});
  const ebR=`(${rP}!${L(cHL)}$${rp.EBITDA}+${h1(hy.adjE)})`;
  cellV(wsV,rm+1,2,"DCF (sensibilité min / central / max)");
  cellF(wsV,rm+1,3,`MIN(${L(3)}${rs+1}:${L(7)}${rs+5})`,NF);
  cellF(wsV,rm+1,4,`C${rv.EQ}`,NF);
  cellF(wsV,rm+1,5,`MAX(${L(3)}${rs+1}:${L(7)}${rs+5})`,NF);
  cellV(wsV,rm+2,2,"Multiples boursiers (× EBITDA)");
  ["C","D","E"].forEach((col,i)=>cellF(wsV,rm+2,3+i,`${rH}!$${col}$${hy.mc}*${ebR}-$C$${rv.DN}`,NF));
  cellV(wsV,rm+3,2,"Multiples de transactions (× EBITDA)");
  ["C","D","E"].forEach((col,i)=>cellF(wsV,rm+3,3+i,`${rH}!$${col}$${hy.mt}*${ebR}-$C$${rv.DN}`,NF));
  const nAdj=(H.valo.anrAjustements||[]).length;
  cellV(wsV,rm+4,2,"Actif net réévalué (CP + ajustements ci-dessous)");
  cellF(wsV,rm+4,4,`${rB}!${L(cHL)}${rb.CP}${nAdj?`+SUM($C$${rm+7}:$C$${rm+6+nAdj})`:""}`,NF);
  const rF2=rm+5;
  cellV(wsV,rF2,2,"Fourchette retenue (min / moyenne DCF-multiples / max)");
  cellF(wsV,rF2,3,`MIN(D${rm+1}:D${rm+4})`,NF);
  cellF(wsV,rF2,4,`(D${rm+1}+D${rm+2})/2`,NF);
  cellF(wsV,rF2,5,`MAX(D${rm+1}:D${rm+4})`,NF);
  totalRow(wsV,rF2,5);
  if(nAdj){
    cellV(wsV,rm+6,2,"Ajustements ANR (modifiables) :").font={italic:true};
    (H.valo.anrAjustements||[]).forEach((x,i)=>{
      cellV(wsV,rm+7+i,2,x.lib);
      const c=cellV(wsV,rm+7+i,3,mnt(x.montant||0),NF);c.fill=JAUNE;
    });
  }
  wsV.columns=[{width:3},{width:46},...Array(Math.max(N+1,6)).fill({width:14})];
}
