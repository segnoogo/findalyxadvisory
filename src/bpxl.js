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
  Object.assign(hy,{dso:hb,dio:hb+1,dpo:hb+2,ac:hb+3,ad:hb+4,dfs:hb+5,capex:hb+6,amort:hb+7,
    tauxEx:hb+8,durEx:hb+9,empr:hb+10,tauxN:hb+11,durN:hb+12,pfin:hb+13,payout:hb+14,
    rf:hb+16,pm:hb+17,beta:hb+18,ppays:hb+19,ptaille:hb+20,pilliq:hb+21,kd:hb+22,wd:hb+23,g:hb+24,mc:hb+25,mt:hb+26,adjE:hb+27,
    exitM:hb+28,mEbit:hb+29,mCA:hb+30,per:hb+31,pdcf:hb+32,pcomp:hb+33,ptrans:hb+34,pebit:hb+35,pca:hb+36,pper:hb+37,panr:hb+38,
    seuil:hb+39,repdef:hb+40,decouvert:hb+41});
  const rp={CA:5,CD:6,MB:7,PMB:8,AP_:9,SEC:10,opex0:11,TFG:11+m,PERS:12+m,EBITDA:13+m,
    PEB:14+m,DA:15+m,EBIT:16+m,PF:17+m,FF:18+m,RFIN:19+m,RAO:20+m,HAO:21+m,EBT:22+m,IS:23+m,RN:24+m,REPDEF:25+m};
  const rb={BRUT:5,AMC:6,IMN:7,STK:8,CLI:9,ACR:10,FRN:11,DFI:12,DSO:13,ADT:14,BFR:15,
    CAP:16,PRI:17,RAN:18,SUB:19,RNB:20,CP:21,DIV:22,DET:23,PROV:24,TRES:25,TRA:26,LCT:27,CTRL:28};
  const rd={OUV:5,TIR:6,REMB:7,INT:8,CLO:9,EXO:11,EXR:12,EXC:13,EXI:14,
    MR:16,MS:16+N,MI:16+2*N,RN_:16+3*N,SN:17+3*N,IN_:18+3*N};

  /* helpers d'écriture */
  const prep=(ws,libArr)=>{const r=ws.addRow(libArr);return r;};
  const cellF=(ws,rn,c,f,fmt)=>{const cl=ws.getCell(rn,c);cl.value={formula:f};if(fmt)cl.numFmt=fmt;return cl;};
  const cellV=(ws,rn,c,val,fmt)=>{const cl=ws.getCell(rn,c);cl.value=val;if(fmt)cl.numFmt=fmt;return cl;};
  /* ---- historique branché sur la TBAGR (SUMIF ; mêmes compositions que les feuilles états) ---- */
  const nT=DOSSIER.tbagr.lignes.length, finT=4+nT;
  const refTB=q(nomOnglet("TBAGR")), colTB=i=>String.fromCharCode(70+i);
  const su=(codes,i,signe)=>(signe==="-"?"-(":"(")+codes.map(c=>
    `SUMIF(${refTB}!$B$5:$B$${finT},"${c}",${refTB}!${colTB(i)}$5:${colTB(i)}$${finT})`).join("+")+")";
  const hc=(row,i)=>`${L(cH(i))}${row}`;
  const pca=ag=>(typeof persoDe==="function"?persoDe(ag):[]).map(x=>x.code);
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
  hRow(hy.ac,"Autres créances hors exploitation (figées)");hVal(hy.ac,mnt(H.autresCreances_fixe),NF);
  hRow(hy.ad,"Autres dettes hors exploitation (figées)");hVal(hy.ad,mnt(H.autresDettes_fixe),NF);
  hRow(hy.dfs,"Dettes fiscales & sociales (% du CA)");hVal(hy.dfs,H.dettesFiscSoc_pct,PCT2);
  hRow(hy.seuil,"Seuil de trésorerie minimum");hVal(hy.seuil,mnt(H.seuilCash||0),NF);
  hRow(hy.decouvert,"Taux du découvert / ligne court terme");hVal(hy.decouvert,H.decouvert_taux||0.12,PCT2);
  hRow(hy.repdef,"Déficits reportables (stock initial)");hVal(hy.repdef,mnt(H.reportDeficitaire||0),NF);
  hRow(hy.capex,"Investissements (CAPEX) par année");hSer(hy.capex,H.capex,NF,true);
  hRow(hy.amort,"Taux d'amortissement (sur brut)");hVal(hy.amort,H.amort_taux,PCT2);
  hRow(hy.tauxEx,"Taux d'intérêt — dette existante");hVal(hy.tauxEx,H.dette_taux,PCT2);
  hRow(hy.durEx,"Durée résiduelle dette existante (ans)");hVal(hy.durEx,H.dette_dureeResiduelle,"0");
  hRow(hy.empr,"Nouveaux emprunts par année");hSer(hy.empr,H.nouveauxEmprunts,NF,true);
  hRow(hy.tauxN,"Taux des nouveaux emprunts");hVal(hy.tauxN,H.emprunt_taux,PCT2);
  hRow(hy.durN,"Durée des nouveaux emprunts (ans)");hVal(hy.durN,H.emprunt_duree,"0");
  hRow(hy.pfin,"Produits financiers annuels");hVal(hy.pfin,mnt(H.produitsFin_montant),NF);
  hRow(hy.payout,"Dividendes (% du résultat N-1)");hVal(hy.payout,H.dividendes_payout,PCT);
  cellV(wsH,hb+15,2,"— Valorisation —").font={bold:true,color:{argb:"FF172554"}};
  hRow(hy.rf,"Taux sans risque");hVal(hy.rf,H.valo.rf,PCT2);
  hRow(hy.pm,"Prime de risque marché");hVal(hy.pm,H.valo.primeMarche,PCT2);
  hRow(hy.beta,"Beta");hVal(hy.beta,H.valo.beta,"0.00");
  hRow(hy.ppays,"Prime de risque pays");hVal(hy.ppays,H.valo.primePays||0,PCT2);
  hRow(hy.ptaille,"Prime de taille");hVal(hy.ptaille,H.valo.primeTaille||0,PCT2);
  hRow(hy.pilliq,"Prime d'illiquidité");hVal(hy.pilliq,H.valo.primeIlliquidite||0,PCT2);
  hRow(hy.kd,"Coût de la dette (brut)");hVal(hy.kd,H.valo.coutDette,PCT2);
  hRow(hy.wd,"Poids de la dette");hVal(hy.wd,H.valo.poidsDette,PCT);
  hRow(hy.g,"Croissance à l'infini (g)");hVal(hy.g,H.valo.g,PCT2);
  hRow(hy.mc,"Multiples boursiers (bas/central/haut)");
  ["min","central","max"].forEach((k,i)=>{const c=cellV(wsH,hy.mc,3+i,H.valo.multiplesComparables[k],"0.0");c.fill=JAUNE;});
  hRow(hy.mt,"Multiples de transactions (bas/central/haut)");
  ["min","central","max"].forEach((k,i)=>{const c=cellV(wsH,hy.mt,3+i,H.valo.multiplesTransactions[k],"0.0");c.fill=JAUNE;});
  hRow(hy.adjE,"Ajustement d'EBITDA (référence des multiples)");
  hVal(hy.adjE,mnt((H.valo.useAdj&&H.valo.adjEbitda)?H.valo.adjEbitda:0),NF);
  hRow(hy.exitM,"Multiple de sortie (× EBITDA terminal)");hVal(hy.exitM,H.valo.exitMultiple||0,"0.0");
  hRow(hy.mEbit,"Multiple EV/EBIT");hVal(hy.mEbit,H.valo.multEbit||0,"0.0");
  hRow(hy.mCA,"Multiple EV/CA");hVal(hy.mCA,H.valo.multCA||0,"0.00");
  hRow(hy.per,"PER (cours / bénéfice)");hVal(hy.per,H.valo.per||0,"0.0");
  const _pds=H.valo.poids||{};
  [["pdcf","Poids DCF","dcf"],["pcomp","Poids multiples boursiers","comp"],["ptrans","Poids multiples transactions","trans"],
   ["pebit","Poids EV/EBIT","ebit"],["pca","Poids EV/CA","ca"],["pper","Poids PER","per"],["panr","Poids actif net","anr"]]
    .forEach(([k,lib,pk])=>{hRow(hy[k],lib+" (%)");hVal(hy[k],(_pds[pk]||0)/100,PCT2);});
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
      if(d.fh)A.forEach((a,i)=>cellF(ws,rn,cH(i),d.fh(i),d.pct?PCT:NF));
      else if(d.hist)A.forEach((a,i)=>cellV(ws,rn,cH(i),d.pct?d.hist(a):mnt(d.hist(a)),d.pct?PCT:NF));
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
  /* ---- bloc de ratios en bas d'une feuille (mêmes ratios que l'historique) ---- */
  const ratFmt=u=>u==="%"?'0.0%;(0.0%);"-"':u==="j"?'#,##0" j";(#,##0)" j";"-"':'#,##0.00" ×";(#,##0.00)" ×";"-"';
  function ratBloc(ws,titre,cols,items){
    ws.addRow([]);
    const rh=ws.addRow([null,titre]);rh.getCell(2).font={bold:true,color:{argb:"FF172554"}};
    for(let c=2;c<=2+cols.length;c++)rh.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
    items.forEach(it=>{const r=ws.addRow([null,it.lab]);r.font={italic:true,color:{argb:"FF808080"}};
      cols.forEach((cm,k)=>{const cl=r.getCell(3+k);cl.value={formula:it.f(cm.own,cm.ref)};cl.numFmt=ratFmt(it.unit);cl.alignment={horizontal:"right"};});});
  }
  const colsHP=[...A.map((a,i)=>({own:L(cH(i)),ref:L(cH(i))})),...AP.map((a,i)=>({own:L(cP(i)),ref:L(cP(i))}))];
  const colsTFT=AP.map((a,i)=>({own:L(3+i),ref:L(cP(i))}));

  /* ================= P&L prévisionnel ================= */
  const priorRep=i=>i===0?h1(hy.repdef):`${L(cP(i-1))}${rp.REPDEF}`;   /* stock de déficits à l'ouverture */
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
   {rn:rp.FF,lib:"Frais financiers (dette + découvert)",hist:a=>v.RESULTAT_FIN[a]<0?v.RESULTAT_FIN[a]:0,
    f:i=>`-${D(rd.INT,i)}+${h1(hy.decouvert)}*${Bp(rb.LCT,i)}`},
   {rn:rp.RFIN,lib:"Résultat financier",st:1,hist:a=>v.RESULTAT_FIN[a],
    f:i=>`${P(rp.PF,i)}+${P(rp.FF,i)}`},
   {rn:rp.RAO,lib:"Résultat des activités ordinaires",st:1,hist:a=>v.EBIT[a]+v.RESULTAT_FIN[a],
    f:i=>`${P(rp.EBIT,i)}+${P(rp.RFIN,i)}`},
   {rn:rp.HAO,lib:"Résultat HAO",hist:a=>v.RESULTAT_HAO?v.RESULTAT_HAO[a]:0,
    f:i=>`0`},
   {rn:rp.EBT,lib:"Résultat avant impôt",st:1,hist:a=>v.EBIT[a]+v.RESULTAT_FIN[a]+(v.RESULTAT_HAO?v.RESULTAT_HAO[a]:0),
    f:i=>`${P(rp.RAO,i)}+${P(rp.HAO,i)}`},
   {rn:rp.IS,lib:"Impôt sur les sociétés (report déficitaire imputé)",hist:a=>v.IMPOTS[a],
    f:i=>`-${h1(hy.is)}*MAX(0,${P(rp.EBT,i)}-${priorRep(i)})`},
   {rn:rp.RN,lib:"Résultat net",st:1,hist:a=>v.RESULTAT_NET[a],
    f:i=>`${P(rp.EBT,i)}+${P(rp.IS,i)}`},
   {rn:rp.REPDEF,lib:"Déficits reportables — solde de clôture",pctRow:1,hist:()=>null,
    f:i=>`${priorRep(i)}-MIN(MAX(0,${P(rp.EBT,i)}),${priorRep(i)})+MAX(0,-${P(rp.EBT,i)})`}];
  /* historique de chaque ligne P&L, branché sur la TBAGR */
  const FHP={};
  FHP[rp.CA]=i=>su(["CA_MARCHANDISES","CA_PRODUITS","CA_SERVICES","CA_ACCESSOIRES",...pca("CA")],i,"-");
  FHP[rp.CD]=i=>su(["ACHATS_MARCH","ACHATS_MP","VARIATION_STOCKS",...pca("COUTS_DIRECTS")],i,"-");
  FHP[rp.MB]=i=>`${hc(rp.CA,i)}+${hc(rp.CD,i)}`;
  FHP[rp.PMB]=i=>`IF(${hc(rp.CA,i)}=0,"",${hc(rp.MB,i)}/${hc(rp.CA,i)})`;
  FHP[rp.AP_]=i=>su(["SUBVENTIONS","PROD_STOCKEE","PROD_IMMOBILISEE","AUTRES_PRODUITS",...pca("AUTRES_PROD")],i,"-");
  H.opex.forEach((o,j)=>{FHP[rp.opex0+j]=i=>su([o.code],i,"-");});
  FHP[rp.TFG]=i=>`SUM(${L(cH(i))}${rp.opex0}:${L(cH(i))}${rp.opex0+m-1})`;
  FHP[rp.PERS]=i=>su(["CHARGES_PERSONNEL",...pca("CHARGES_PERSONNEL")],i,"-");
  FHP[rp.EBITDA]=i=>`${hc(rp.MB,i)}+${hc(rp.AP_,i)}+${hc(rp.TFG,i)}+${hc(rp.PERS,i)}`;
  FHP[rp.PEB]=i=>`IF(${hc(rp.CA,i)}=0,"",${hc(rp.EBITDA,i)}/${hc(rp.CA,i)})`;
  FHP[rp.DA]=i=>su(["DOTATIONS","REPRISES",...pca("DA")],i,"-");
  FHP[rp.EBIT]=i=>`${hc(rp.EBITDA,i)}+${hc(rp.DA,i)}`;
  FHP[rp.PF]=i=>`MAX(0,${su(["REVENUS_FIN","FRAIS_FIN"],i,"-")})`;
  FHP[rp.FF]=i=>`MIN(0,${su(["REVENUS_FIN","FRAIS_FIN"],i,"-")})`;
  FHP[rp.RFIN]=i=>`${hc(rp.PF,i)}+${hc(rp.FF,i)}`;
  FHP[rp.RAO]=i=>`${hc(rp.EBIT,i)}+${hc(rp.RFIN,i)}`;
  FHP[rp.HAO]=i=>su(["PRODUITS_HAO","CHARGES_HAO",...pca("RESULTAT_HAO")],i,"-");
  FHP[rp.EBT]=i=>`${hc(rp.RAO,i)}+${hc(rp.HAO,i)}`;
  FHP[rp.IS]=i=>su(["IS","PARTICIPATION",...pca("IMPOTS")],i,"-");
  FHP[rp.RN]=i=>`${hc(rp.EBT,i)}+${hc(rp.IS,i)}`;
  defsP.forEach(d=>{if(FHP[d.rn])d.fh=FHP[d.rn];});
  const wsPp=feuille(nomP,"Compte de résultat prévisionnel — FORMULES — scénario "+sc.lab+" — "+u.lib,defsP);
  ratBloc(wsPp,"Ratios du compte de résultat",colsHP,[
    {lab:"Marge brute / CA",unit:"%",f:c=>`IF(${c}${rp.CA}=0,"",${c}${rp.MB}/${c}${rp.CA})`},
    {lab:"Marge d'EBITDA",unit:"%",f:c=>`IF(${c}${rp.CA}=0,"",${c}${rp.EBITDA}/${c}${rp.CA})`},
    {lab:"Marge d'exploitation (EBIT)",unit:"%",f:c=>`IF(${c}${rp.CA}=0,"",${c}${rp.EBIT}/${c}${rp.CA})`},
    {lab:"Marge nette",unit:"%",f:c=>`IF(${c}${rp.CA}=0,"",${c}${rp.RN}/${c}${rp.CA})`},
    {lab:"Frais généraux / CA",unit:"%",f:c=>`IF(${c}${rp.CA}=0,"",-(${c}${rp.TFG}+${c}${rp.PERS})/${c}${rp.CA})`},
    {lab:"Charges de personnel / CA",unit:"%",f:c=>`IF(${c}${rp.CA}=0,"",-${c}${rp.PERS}/${c}${rp.CA})`},
    {lab:"Taux d'IS effectif",unit:"%",f:c=>`IF(${c}${rp.EBT}<=0,"",-${c}${rp.IS}/${c}${rp.EBT})`}
  ]);

  /* ================= Bilan prévisionnel ================= */
  const socfisc=v.DETTES_FISCALES[a1]+v.DETTES_SOCIALES[a1];
  const fiscFrac=socfisc?v.DETTES_FISCALES[a1]/socfisc:0.5, socFrac=1-fiscFrac;
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
    f:i=>`${h1(hy.ac)}`},
   {rn:rb.FRN,lib:"Dettes fournisseurs",hist:a=>v.FOURNISSEURS[a],
    f:i=>`(${P(rp.CD,i)}+${P(rp.TFG,i)})*${h1(hy.dpo)}/360`},
   {rn:rb.DFI,lib:"Dettes fiscales",hist:a=>v.DETTES_FISCALES[a],
    f:i=>`-${P(rp.CA,i)}*${h1(hy.dfs)}*${fiscFrac.toFixed(4)}`},
   {rn:rb.DSO,lib:"Dettes sociales",hist:a=>v.DETTES_SOCIALES[a],
    f:i=>`-${P(rp.CA,i)}*${h1(hy.dfs)}*${socFrac.toFixed(4)}`},
   {rn:rb.ADT,lib:"Autres dettes",hist:a=>v.AUTRES_DETTES[a]+v.CLIENTS_AVANCES[a]+v.HAO_PASSIF[a],
    f:i=>`${h1(hy.ad)}`},
   {rn:rb.BFR,lib:"Besoin en fonds de roulement",st:1,hist:a=>v.BFR[a],
    f:i=>`SUM(${L(cP(i))}${rb.STK}:${L(cP(i))}${rb.ADT})`},
   {rn:rb.CAP,lib:"Capital social",hist:a=>-v.CAPITAL[a],
    f:i=>`${Bp(rb.CAP,i)}`},
   {rn:rb.PRI,lib:"Primes et réserves",hist:a=>-v.PRIMES_RESERVES[a],
    f:i=>`${Bp(rb.PRI,i)}`},
   {rn:rb.RAN,lib:"Report à nouveau et résultats antérieurs",hist:a=>-v.RAN_RESULTATS_ANT[a],
    f:i=>`${B(rb.CP,i)}-${B(rb.CAP,i)}-${B(rb.PRI,i)}-${B(rb.SUB,i)}-${B(rb.RNB,i)}`},
   {rn:rb.SUB,lib:"Subventions et provisions réglementées",hist:a=>-v.SUBV_PROV_REGL[a],
    f:i=>`${Bp(rb.SUB,i)}`},
   {rn:rb.RNB,lib:"Résultat net de l'exercice",hist:a=>v.RESULTAT_NET[a],
    f:i=>`${P(rp.RN,i)}`},
   {rn:rb.CP,lib:"Capitaux propres",st:1,hist:a=>v.CAPITAUX_PROPRES[a],
    f:i=>`${Bp(rb.CP,i)}+${P(rp.RN,i)}-${B(rb.DIV,i)}`},
   {rn:rb.DIV,lib:"Dividendes versés (mémo)",pctRow:1,hist:()=>0,
    f:i=>`MAX(0,${h1(hy.payout)}*${Pp(rp.RN,i)})`},
   {rn:rb.DET,lib:"Dettes financières",hist:a=>-v.DETTES_FINANCIERES[a],
    f:i=>`${D(rd.CLO,i)}`},
   {rn:rb.PROV,lib:"Provisions pour risques et charges",hist:a=>-v.PROVISIONS_RC[a],
    f:i=>`${Bp(rb.PROV,i)}`},
   {rn:rb.TRES,lib:"Trésorerie nette (bouclage)",st:1,hist:a=>v.TRESORERIE_NETTE[a],
    f:i=>`${B(rb.CP,i)}+${B(rb.DET,i)}+${B(rb.PROV,i)}-${B(rb.IMN,i)}-${B(rb.BFR,i)}`},
   {rn:rb.TRA,lib:"— dont trésorerie active",pctRow:1,hist:a=>v.TRESO_ACTIF[a],
    f:i=>`${B(rb.TRES,i)}-${B(rb.LCT,i)}`},
   {rn:rb.LCT,lib:"— dont concours bancaires courants (découvert)",pctRow:1,hist:a=>v.TRESO_PASSIF[a],
    f:i=>`-MAX(0,${h1(hy.seuil)}-${B(rb.TRES,i)})`},
   {rn:rb.CTRL,lib:"Contrôle : actif - passif (doit être 0)",pctRow:1,hist:()=>0,
    f:i=>`${B(rb.IMN,i)}+${B(rb.BFR,i)}+${B(rb.TRES,i)}-${B(rb.CP,i)}-${B(rb.DET,i)}-${B(rb.PROV,i)}`}];
  /* historique de chaque ligne du bilan, branché sur la TBAGR */
  const FHB={};
  FHB[rb.BRUT]=i=>su(["IMMO_INCORP","IMMO_CORP","AVANCES_IMMO","IMMO_FIN",...pca("ACTIFS_IMMOBILISES")],i,"+");
  FHB[rb.AMC]=i=>su(["AMORT_DEPREC"],i,"+");
  FHB[rb.IMN]=i=>`${hc(rb.BRUT,i)}+${hc(rb.AMC,i)}`;
  FHB[rb.STK]=i=>su(["STOCKS"],i,"+");
  FHB[rb.CLI]=i=>su(["CLIENTS"],i,"+");
  FHB[rb.ACR]=i=>su(["AUTRES_CREANCES","AVANCES_FRS","HAO_ACTIF"],i,"+");
  FHB[rb.FRN]=i=>su(["FOURNISSEURS"],i,"+");
  FHB[rb.DFI]=i=>su(["DETTES_FISCALES"],i,"+");
  FHB[rb.DSO]=i=>su(["DETTES_SOCIALES"],i,"+");
  FHB[rb.ADT]=i=>su(["AUTRES_DETTES","CLIENTS_AVANCES","HAO_PASSIF"],i,"+");
  FHB[rb.BFR]=i=>`SUM(${L(cH(i))}${rb.STK}:${L(cH(i))}${rb.ADT})`;
  FHB[rb.CAP]=i=>su(["CAPITAL"],i,"-");
  FHB[rb.PRI]=i=>su(["PRIMES_RESERVES"],i,"-");
  FHB[rb.RAN]=i=>su(["RAN_RESULTATS_ANT",...pca("CAPITAUX_PROPRES")],i,"-");
  FHB[rb.SUB]=i=>su(["SUBV_PROV_REGL"],i,"-");
  FHB[rb.RNB]=i=>`${rP}!${L(cH(i))}${rp.RN}`;
  FHB[rb.CP]=i=>`${hc(rb.CAP,i)}+${hc(rb.PRI,i)}+${hc(rb.RAN,i)}+${hc(rb.SUB,i)}+${hc(rb.RNB,i)}`;
  FHB[rb.DET]=i=>su(["DETTES_FINANCIERES",...pca("FINANCEMENT")],i,"-");
  FHB[rb.PROV]=i=>su(["PROVISIONS_RC"],i,"-");
  FHB[rb.TRES]=i=>su(["TRESO_ACTIF","TRESO_PASSIF",...pca("TRESORERIE_NETTE")],i,"+");
  FHB[rb.TRA]=i=>su(["TRESO_ACTIF"],i,"+");
  FHB[rb.LCT]=i=>su(["TRESO_PASSIF"],i,"+");
  FHB[rb.DIV]=()=>`0`;
  FHB[rb.CTRL]=i=>`${hc(rb.IMN,i)}+${hc(rb.BFR,i)}+${hc(rb.TRES,i)}-${hc(rb.CP,i)}-${hc(rb.DET,i)}-${hc(rb.PROV,i)}`;
  defsB.forEach(d=>{if(FHB[d.rn])d.fh=FHB[d.rn];});
  const wsBp=feuille(nomB,"Bilan prévisionnel — FORMULES — bouclé par la trésorerie — "+u.lib,defsB);
  {
    const pl=(row,c)=>`${rP}!${c}${row}`;
    const dfin=c=>`(${c}${rb.DET}-${c}${rb.LCT})`, dnet=c=>`(${c}${rb.DET}-${c}${rb.TRES})`;
    const actC=c=>`(${c}${rb.STK}+${c}${rb.CLI}+${c}${rb.ACR}+${c}${rb.TRA})`;
    const pasC=c=>`(-(${c}${rb.FRN}+${c}${rb.DFI}+${c}${rb.DSO}+${c}${rb.ADT})-${c}${rb.LCT})`;
    const totA=c=>`(${c}${rb.IMN}+${actC(c)})`;
    ratBloc(wsBp,"Ratios de structure, rentabilité et liquidité",colsHP,[
      {lab:"ROE (rentabilité des capitaux propres)",unit:"%",f:c=>`IF(${c}${rb.CP}<=0,"",${pl(rp.RN,c)}/${c}${rb.CP})`},
      {lab:"ROA (rentabilité de l'actif)",unit:"%",f:c=>`IF(${totA(c)}<=0,"",${pl(rp.RN,c)}/${totA(c)})`},
      {lab:"ROCE (rentabilité des capitaux employés)",unit:"%",f:c=>`IF((${c}${rb.CP}+${dfin(c)})<=0,"",${pl(rp.EBIT,c)}/(${c}${rb.CP}+${dfin(c)}))`},
      {lab:"Liquidité générale",unit:"x",f:c=>`IF(${pasC(c)}<=0,"",${actC(c)}/${pasC(c)})`},
      {lab:"Liquidité réduite",unit:"x",f:c=>`IF(${pasC(c)}<=0,"",(${actC(c)}-${c}${rb.STK})/${pasC(c)})`},
      {lab:"Liquidité immédiate",unit:"x",f:c=>`IF(${pasC(c)}<=0,"",${c}${rb.TRA}/${pasC(c)})`},
      {lab:"BFR en jours de CA",unit:"j",f:c=>`IF(${pl(rp.CA,c)}=0,"",${c}${rb.BFR}*360/${pl(rp.CA,c)})`},
      {lab:"Délai clients (DSO)",unit:"j",f:c=>`IF(${pl(rp.CA,c)}=0,"",${c}${rb.CLI}*360/(${pl(rp.CA,c)}*1.18))`},
      {lab:"Délai fournisseurs (DPO)",unit:"j",f:c=>`IF((-${pl(rp.CD,c)}-${pl(rp.TFG,c)})<=0,"",(-${c}${rb.FRN})*360/((-${pl(rp.CD,c)}-${pl(rp.TFG,c)})*1.18))`},
      {lab:"Gearing (dette fin. / capitaux propres)",unit:"x",f:c=>`IF(${c}${rb.CP}<=0,"",${dfin(c)}/${c}${rb.CP})`},
      {lab:"Leverage (dette nette / EBITDA)",unit:"x",f:c=>`IF(${pl(rp.EBITDA,c)}<=0,"",${dnet(c)}/${pl(rp.EBITDA,c)})`},
      {lab:"Couverture des intérêts (EBITDA / frais fin.)",unit:"x",f:c=>`IF((-${pl(rp.FF,c)})<=0,"",${pl(rp.EBITDA,c)}/(-${pl(rp.FF,c)}))`},
      {lab:"Autonomie financière (CP / total actif)",unit:"%",f:c=>`IF(${totA(c)}<=0,"",${c}${rb.CP}/${totA(c)})`}
    ]);
  }

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
    F(rt.VAR_CREANCES,`-((${B(rb.CLI,i)}+${B(rb.ACR,i)})-(${Bp(rb.CLI,i)}+${Bp(rb.ACR,i)}))`);
    F(rt.FC,`-(${B(rb.STK,i)}-${Bp(rb.STK,i)})`);
    F(rt.FE,`-((${B(rb.FRN,i)}+${B(rb.ADT,i)})-(${Bp(rb.FRN,i)}+${Bp(rb.ADT,i)}))`);
    F(rt.ZB,`SUM(${Lc}${rt.FA}:${Lc}${rt.FE})`);
    F(rt.ACQUIS_IMMO,`-${hp(hy.capex,i)}`);F(rt.CESSION_IMMO,`0`);
    F(rt.ZC,`SUM(${Lc}${rt.ACQUIS_IMMO}:${Lc}${rt.CESSION_IMMO})`);
    F(rt.FK,`0`);F(rt.FL,`0`);F(rt.FN,`-${B(rb.DIV,i)}`);
    F(rt.EMPRUNT,`${D(rd.TIR,i)}`);F(rt.REMBOURS,`-${D(rd.REMB,i)}`);
    F(rt.ZFIN,`SUM(${Lc}${rt.FK}:${Lc}${rt.REMBOURS})`);
    F(rt.ZF,`${Lc}${rt.ZB}+${Lc}${rt.ZC}+${Lc}${rt.ZFIN}`);
    F(rt.ZG,`${Lc}${rt.ZA}+${Lc}${rt.ZF}`);
    F(rtE,`${Lc}${rt.ZG}-${B(rb.TRES,i)}`);
  });
  wsT.columns=[{width:3},{width:56},...AP.map(()=>({width:14}))];
  ratBloc(wsT,"Ratios de flux et de trésorerie",colsTFT,[
    {lab:"CAFG / CA",unit:"%",f:(c,r)=>`IF(${rP}!${r}${rp.CA}=0,"",${c}${rt.FA}/${rP}!${r}${rp.CA})`},
    {lab:"Conversion en cash (flux d'exploitation / EBITDA)",unit:"%",f:(c,r)=>`IF(${rP}!${r}${rp.EBITDA}=0,"",${c}${rt.ZB}/${rP}!${r}${rp.EBITDA})`},
    {lab:"Free cash flow / CA (exploitation + investissement)",unit:"%",f:(c,r)=>`IF(${rP}!${r}${rp.CA}=0,"",(${c}${rt.ZB}+${c}${rt.ZC})/${rP}!${r}${rp.CA})`},
    {lab:"Capacité de remboursement (dette fin. / CAFG)",unit:"x",f:(c,r)=>`IF(${c}${rt.FA}<=0,"",(${rB}!${r}${rb.DET}-${rB}!${r}${rb.LCT})/${c}${rt.FA})`},
    {lab:"Couverture des investissements (flux exploit. / invest.)",unit:"x",f:(c,r)=>`IF(${c}${rt.ZC}=0,"",${c}${rt.ZB}/ABS(${c}${rt.ZC}))`}
  ]);

  /* ================= Valorisation ================= */
  const wsV=wb.addWorksheet(nomV);
  titreLiasse(wsV,"Valorisation — FORMULES — DCF, multiples, ANR — "+u.lib);
  const rv={KE:5,KD:6,WACC:7,SEC:9,EBIT:10,IMP:11,NOP:12,DOT:13,DBF:14,CPX:15,FCF:16,PV:17,
    SPV:19,VTG:20,VTX:21,VT:22,VTP:23,EV:24,DN:25,BRG:26,EQ:27};
  cellV(wsV,rv.KE,2,"Coût des fonds propres (build-up : rf + β·prime marché + pays + taille + illiquidité)");
  cellF(wsV,rv.KE,3,`${h1(hy.rf)}+${h1(hy.beta)}*${h1(hy.pm)}+${h1(hy.ppays)}+${h1(hy.ptaille)}+${h1(hy.pilliq)}`,PCT2);
  cellV(wsV,rv.KD,2,"Coût de la dette net d'IS");
  cellF(wsV,rv.KD,3,`${h1(hy.kd)}*(1-${h1(hy.is)})`,PCT2);
  cellV(wsV,rv.WACC,2,"WACC");
  cellF(wsV,rv.WACC,3,`C${rv.KE}*(1-${h1(hy.wd)})+C${rv.KD}*${h1(hy.wd)}`,PCT2);
  totalRow(wsV,rv.WACC,3);
  const W=`$C$${rv.WACC}`,G=h1(hy.g);
  cellV(wsV,rv.SEC,2,"Construction du FCFF");
  AP.forEach((a,i)=>cellV(wsV,rv.SEC,4+i,"FY"+String(a).slice(-2)+"p"));
  styliserEntete(wsV.getRow(rv.SEC),2);
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
  const ebitdaTerm=`${P(rp.EBITDA,N-1)}`;                 /* EBITDA du dernier exercice projeté */
  const tvSel=H.valo.tvMode==="exit"?`C${rv.VTX}`:`C${rv.VTG}`;
  const brdg=H.valo.bridge||[];
  const rBr0=rv.EQ+2;                                     /* liste des ajustements du pont */
  const brgSum=brdg.length?`SUM($C$${rBr0+1}:$C$${rBr0+brdg.length})`:"0";
  const bridge=[[rv.SPV,"Somme des FCFF actualisés",`SUM(${L(4)}${rv.PV}:${L(3+N)}${rv.PV})`],
    [rv.VTG,"Valeur terminale — Gordon (g)",`${lastF}*(1+${G})/(${W}-${G})`],
    [rv.VTX,"Valeur terminale — multiple de sortie",`${h1(hy.exitM)}*${ebitdaTerm}`],
    [rv.VT,"Valeur terminale retenue ("+(H.valo.tvMode==="exit"?"multiple de sortie":"Gordon")+")",tvSel],
    [rv.VTP,"Valeur terminale actualisée",`C${rv.VT}/(1+${W})^${N}`],
    [rv.EV,"Valeur d'entreprise (EV)",`C${rv.SPV}+C${rv.VTP}`],
    [rv.DN,"(–) Dette nette (dernier exercice réel)",`${rB}!${L(cHL)}${rb.DET}-${rB}!${L(cHL)}${rb.TRES}`],
    [rv.BRG,"± Ajustements du pont (hors dette nette)",brgSum],
    [rv.EQ,"Valeur des fonds propres (DCF)",`C${rv.EV}-C${rv.DN}+C${rv.BRG}`]];
  const hb2=cellV(wsV,rv.SPV-1,2,"Passage de la valeur d'entreprise aux fonds propres");hb2.font={bold:true,color:{argb:"FF172554"}};
  bridge.forEach(([rn,lib,f])=>{cellV(wsV,rn,2,lib);cellF(wsV,rn,3,f,NF);});
  totalRow(wsV,rv.EV,3);totalRow(wsV,rv.EQ,3);
  let rBr=rBr0;
  if(brdg.length){
    cellV(wsV,rBr,2,"Ajustements du pont (modifiables) :").font={italic:true};
    brdg.forEach((x,i)=>{cellV(wsV,rBr+1+i,2,x.lib);const c=cellV(wsV,rBr+1+i,3,mnt(x.montant||0),NF);c.fill=JAUNE;});
    rBr=rBr+brdg.length;
  }
  const dnB=`-$C$${rv.DN}+$C$${rv.BRG}`;
  /* sensibilité WACC × g (Gordon) — dette nette + pont inclus */
  const rs=rBr+2;
  cellV(wsV,rs,2,"Sensibilité — fonds propres (WACC × g)").font={bold:true,color:{argb:"FF172554"}};
  [-0.01,-0.005,0,0.005,0.01].forEach((dg,jx)=>{
    const c=cellF(wsV,rs,3+jx,`"g "&TEXT(${G}+${dg},"0.0%")`,undefined);
    c.font={bold:true,color:{argb:"FF172554"}};c.alignment={horizontal:"right"};
  });
  [-0.01,-0.005,0,0.005,0.01].forEach((dw,ix)=>{
    const rn=rs+1+ix;
    cellF(wsV,rn,2,`"WACC "&TEXT(${W}+${dw},"0.0%")`).font={bold:true,color:{argb:"FF172554"}};
    [-0.01,-0.005,0,0.005,0.01].forEach((dg,jx)=>{
      const w=`(${W}+${dw})`,g=`(${G}+${dg})`;
      cellF(wsV,rn,3+jx,
        `SUMPRODUCT(${fcffRange}*(1+${w})^-(COLUMN(${fcffRange})-COLUMN(${L(4)}${rv.FCF})+1))`+
        `+${lastF}*(1+${g})/(${w}-${g})/(1+${w})^${N}${dnB}`,NF);
    });
  });
  /* méthodes + pondération */
  const rm=rs+7;
  cellV(wsV,rm,2,"Méthode").font={bold:true,color:{argb:"FF172554"}};
  ["Bas","Central","Haut","Poids"].forEach((t,i)=>{const c=cellV(wsV,rm,3+i,t);
    c.font={bold:true,color:{argb:"FF172554"}};c.alignment={horizontal:"right"};});
  const ebR=`(${rP}!${L(cHL)}$${rp.EBITDA}+${h1(hy.adjE)})`;
  const ebitR=`${rP}!${L(cHL)}$${rp.EBIT}`, caR=`${rP}!${L(cHL)}$${rp.CA}`, rnR=`${rP}!${L(cHL)}$${rp.RN}`;
  const nAdj=(H.valo.anrAjustements||[]).length;
  const rAnr=rm+9;                                        /* liste des ajustements ANR */
  const anrCentral=`${rB}!${L(cHL)}${rb.CP}${nAdj?`+SUM($C$${rAnr+1}:$C$${rAnr+nAdj})`:""}`;
  const meth=[
    ["DCF (sensibilité min/central/max)",`MIN(${L(3)}${rs+1}:${L(7)}${rs+5})`,`C${rv.EQ}`,`MAX(${L(3)}${rs+1}:${L(7)}${rs+5})`,hy.pdcf],
    ["Multiples boursiers (× EBITDA)",`${rH}!$C$${hy.mc}*${ebR}${dnB}`,`${rH}!$D$${hy.mc}*${ebR}${dnB}`,`${rH}!$E$${hy.mc}*${ebR}${dnB}`,hy.pcomp],
    ["Multiples de transactions (× EBITDA)",`${rH}!$C$${hy.mt}*${ebR}${dnB}`,`${rH}!$D$${hy.mt}*${ebR}${dnB}`,`${rH}!$E$${hy.mt}*${ebR}${dnB}`,hy.ptrans],
    ["EV / EBIT",`${h1(hy.mEbit)}*0.85*${ebitR}${dnB}`,`${h1(hy.mEbit)}*${ebitR}${dnB}`,`${h1(hy.mEbit)}*1.15*${ebitR}${dnB}`,hy.pebit],
    ["EV / Chiffre d'affaires",`${h1(hy.mCA)}*0.85*${caR}${dnB}`,`${h1(hy.mCA)}*${caR}${dnB}`,`${h1(hy.mCA)}*1.15*${caR}${dnB}`,hy.pca],
    ["PER (cours / bénéfice)",`${h1(hy.per)}*0.85*${rnR}+$C$${rv.BRG}`,`${h1(hy.per)}*${rnR}+$C$${rv.BRG}`,`${h1(hy.per)}*1.15*${rnR}+$C$${rv.BRG}`,hy.pper],
    ["Actif net réévalué (CP + ajustements)","",anrCentral,"",hy.panr]];
  meth.forEach((row,i)=>{const rn=rm+1+i;cellV(wsV,rn,2,row[0]);
    if(row[1])cellF(wsV,rn,3,row[1],NF); if(row[2])cellF(wsV,rn,4,row[2],NF); if(row[3])cellF(wsV,rn,5,row[3],NF);
    cellF(wsV,rn,6,h1(row[4]),PCT);});
  const rF2=rm+8, cD=`D${rm+1}:D${rm+7}`, cW=`F${rm+1}:F${rm+7}`;
  cellV(wsV,rF2,2,"Valeur retenue (fourchette pondérée min / moyenne / max)");
  cellF(wsV,rF2,3,`MIN(${cD})`,NF);
  cellF(wsV,rF2,4,`IF(SUM(${cW})=0,AVERAGE(${cD}),SUMPRODUCT(${cD},${cW})/SUM(${cW}))`,NF);
  cellF(wsV,rF2,5,`MAX(${cD})`,NF);
  totalRow(wsV,rF2,5);
  if(nAdj){
    cellV(wsV,rAnr,2,"Ajustements ANR (modifiables) :").font={italic:true};
    (H.valo.anrAjustements||[]).forEach((x,i)=>{
      cellV(wsV,rAnr+1+i,2,x.lib);
      const c=cellV(wsV,rAnr+1+i,3,mnt(x.montant||0),NF);c.fill=JAUNE;
    });
  }
  wsV.columns=[{width:3},{width:52},...Array(Math.max(N+1,6)).fill({width:13})];
}
