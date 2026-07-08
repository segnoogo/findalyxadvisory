/* ============ Databook DD à formules (port du moteur Python) ============ */
const DB_PL=[
 {"code": "CA_MARCHANDISES", "lib": "Ventes de marchandises"},
 {"code": "CA_PRODUITS", "lib": "Production vendue (biens et travaux)"},
 {"code": "CA_SERVICES", "lib": "Prestations de services"},
 {"code": "CA_ACCESSOIRES", "lib": "Produits accessoires"},
 {"code": "CA", "lib": "Chiffre d'affaires", "type": "sous_total", "somme": ["CA_MARCHANDISES", "CA_PRODUITS", "CA_SERVICES", "CA_ACCESSOIRES"]},
 {"code": "ACHATS_MARCH", "lib": "Achats de marchandises"},
 {"code": "ACHATS_MP", "lib": "Achats de matières premières"},
 {"code": "VARIATION_STOCKS", "lib": "Variation de stocks"},
 {"code": "COUTS_DIRECTS", "lib": "Coûts directs", "type": "sous_total", "somme": ["ACHATS_MARCH", "ACHATS_MP", "VARIATION_STOCKS"]},
 {"code": "MARGE_BRUTE", "lib": "Marge brute", "type": "sous_total", "somme": ["CA", "COUTS_DIRECTS"]}, {"code": "AUTRES_PROD", "lib": "Autres produits", "codes": ["SUBVENTIONS", "PROD_STOCKEE", "PROD_IMMOBILISEE", "AUTRES_PRODUITS"]},
 {"code": "AUTRES_ACHATS", "lib": "Autres achats"},
 {"code": "TRANSPORTS", "lib": "Transports"},
 {"code": "SERVICES_EXT", "lib": "Services extérieurs", "codes": ["SOUS_TRAITANCE", "LOCATIONS", "ENTRETIEN", "ASSURANCES", "PUBLICITE", "TELECOM", "FRAIS_BANCAIRES", "HONORAIRES", "PERSONNEL_EXT", "AUTRES_SERV_EXT"]},
 {"code": "IMPOTS_TAXES", "lib": "Impôts et taxes"},
 {"code": "AUTRES_CHARGES", "lib": "Autres charges"},
 {"code": "CHARGES_PERSONNEL", "lib": "Charges de personnel"},
 {"code": "FRAIS_GENERAUX", "lib": "Frais généraux", "type": "sous_total", "somme": ["AUTRES_ACHATS", "TRANSPORTS", "SERVICES_EXT", "IMPOTS_TAXES", "AUTRES_CHARGES", "CHARGES_PERSONNEL"]},
 {"code": "EBITDA", "lib": "EBITDA", "type": "sous_total", "somme": ["MARGE_BRUTE", "AUTRES_PROD", "FRAIS_GENERAUX"]}, {"code": "DOTATIONS", "lib": "Dotations aux amortissements et provisions"},
 {"code": "REPRISES", "lib": "Reprises de provisions"},
 {"code": "EBIT", "lib": "EBIT (résultat d'exploitation)", "type": "sous_total", "somme": ["EBITDA", "DOTATIONS", "REPRISES"]}, {"code": "REVENUS_FIN", "lib": "Produits financiers"},
 {"code": "FRAIS_FIN", "lib": "Charges financières"},
 {"code": "RESULTAT_FINANCIER", "lib": "Résultat financier", "type": "sous_total", "somme": ["REVENUS_FIN", "FRAIS_FIN"]},
 {"code": "RAO", "lib": "Résultat des activités ordinaires", "type": "sous_total", "somme": ["EBIT", "RESULTAT_FINANCIER"]},
 {"code": "PRODUITS_HAO", "lib": "Produits HAO"},
 {"code": "CHARGES_HAO", "lib": "Charges HAO"},
 {"code": "RESULTAT_HAO", "lib": "Résultat HAO", "type": "sous_total", "somme": ["PRODUITS_HAO", "CHARGES_HAO"]},
 {"code": "RESULTAT_AVANT_IMPOT", "lib": "Résultat avant impôt", "type": "sous_total", "somme": ["RAO", "RESULTAT_HAO"]},
 {"code": "PARTICIPATION", "lib": "Participation des travailleurs"},
 {"code": "IS", "lib": "Impôt sur le résultat"},
 {"code": "RESULTAT_NET", "lib": "Résultat net", "type": "sous_total", "somme": ["RESULTAT_AVANT_IMPOT", "PARTICIPATION", "IS"]}
];
const DB_BS=[
 {"code": "IMMO_INCORP", "lib": "Immobilisations incorporelles", "section": "IMMOBILISATIONS"},
 {"code": "IMMO_CORP", "lib": "Immobilisations corporelles", "section": "IMMOBILISATIONS"},
 {"code": "AVANCES_IMMO", "lib": "Avances et acomptes sur immobilisations", "section": "IMMOBILISATIONS"},
 {"code": "IMMO_FIN", "lib": "Immobilisations financières", "section": "IMMOBILISATIONS"},
 {"code": "AMORT_DEPREC", "lib": "Amortissements et dépréciations", "section": "IMMOBILISATIONS"},
 {"code": "ACTIFS_IMMOBILISES", "lib": "Actifs immobilisés", "type": "sous_total", "somme": ["IMMO_INCORP", "IMMO_CORP", "AVANCES_IMMO", "IMMO_FIN", "AMORT_DEPREC"], "section": "IMMOBILISATIONS"},
 {"code": "STOCKS", "lib": "Stocks et en-cours", "section": "BFR"},
 {"code": "CLIENTS", "lib": "Créances clients", "section": "BFR"},
 {"code": "CLIENTS_AVANCES", "lib": "Clients, avances reçues", "section": "BFR"},
 {"code": "AVANCES_FRS", "lib": "Fournisseurs, avances versées", "section": "BFR"},
 {"code": "FOURNISSEURS", "lib": "Dettes fournisseurs", "section": "BFR"},
 {"code": "DETTES_SOCIALES", "lib": "Dettes sociales", "section": "BFR"},
 {"code": "DETTES_FISCALES", "lib": "Dettes fiscales", "section": "BFR"},
 {"code": "BFR_EXPLOITATION", "lib": "BFR d'exploitation", "type": "sous_total", "somme": ["STOCKS", "CLIENTS", "CLIENTS_AVANCES", "AVANCES_FRS", "FOURNISSEURS", "DETTES_SOCIALES", "DETTES_FISCALES"], "section": "BFR"},
 {"code": "AUTRES_CREANCES", "lib": "Autres créances", "codes": ["AUTRES_CREANCES", "HAO_ACTIF"], "section": "BFR"},
 {"code": "AUTRES_DETTES", "lib": "Autres dettes", "codes": ["AUTRES_DETTES", "HAO_PASSIF"], "section": "BFR"},
 {"code": "BFR_HORS_EXPL", "lib": "BFR hors exploitation", "type": "sous_total", "somme": ["AUTRES_CREANCES", "AUTRES_DETTES"], "section": "BFR"},
 {"code": "BFR_TOTAL", "lib": "Besoin en fonds de roulement global", "type": "sous_total", "somme": ["BFR_EXPLOITATION", "BFR_HORS_EXPL"], "section": "BFR"},
 {"code": "TRESO_ACTIF", "lib": "Trésorerie - actif (banques, caisse)", "section": "TRESORERIE"},
 {"code": "TRESO_PASSIF", "lib": "Trésorerie - passif (découverts)", "section": "TRESORERIE"},
 {"code": "TRESORERIE_NETTE", "lib": "Trésorerie nette", "type": "sous_total", "somme": ["TRESO_ACTIF", "TRESO_PASSIF"], "section": "TRESORERIE"},
 {"code": "PROVISIONS_RC", "lib": "Provisions pour risques et charges", "section": "FINANCEMENT"},
 {"code": "DETTES_FINANCIERES", "lib": "Dettes financières (emprunts)", "section": "FINANCEMENT"},
 {"code": "ACTIF_NET", "lib": "Actif net", "type": "sous_total", "somme": ["ACTIFS_IMMOBILISES", "BFR_TOTAL", "TRESORERIE_NETTE", "PROVISIONS_RC", "DETTES_FINANCIERES"], "section": "FINANCEMENT"},
 {"code": "CAPITAL", "lib": "Capital social", "section": "CAPITAUX_PROPRES"},
 {"code": "PRIMES_RESERVES", "lib": "Primes et réserves", "section": "CAPITAUX_PROPRES"},
 {"code": "RAN_RESULTATS_ANT", "lib": "Report à nouveau et résultats en instance", "section": "CAPITAUX_PROPRES"},
 {"code": "SUBV_PROV_REGL", "lib": "Subventions d'investissement et prov. réglementées", "section": "CAPITAUX_PROPRES"},
 {"code": "RESULTAT_NET_BS", "lib": "Résultat net de l'exercice", "type": "reference_pl", "ref": "RESULTAT_NET", "section": "CAPITAUX_PROPRES"},
 {"code": "CAPITAUX_PROPRES", "lib": "Capitaux propres", "type": "sous_total", "somme": ["CAPITAL", "PRIMES_RESERVES", "RAN_RESULTATS_ANT", "SUBV_PROV_REGL", "RESULTAT_NET_BS"], "section": "CAPITAUX_PROPRES"}
];

let DB_NUMFMT='#,##0;(#,##0);"-"';
function dbEntete(row,texteCols){
  texteCols=texteCols||1;
  row.eachCell((c,col)=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF172554"}};
    if(col>texteCols)c.alignment={horizontal:"right"};});}
/* Bloc de ratios sous un état (Bilan / TFT), en formules — mêmes ratios que l'app.
   items:[{lab,unit:"%"|"x"|"j",f:(colLettre)=>formuleBrute}] ; show:[{col,cell}] ; deltas:[{cell,c1,c2}]. */
function dbBlocRatios(ws,titre,items,show,deltas){
  ws.addRow([]);
  const rh=ws.addRow([null,titre]);
  rh.getCell(2).font={bold:true,color:{argb:"FF172554"}};
  const fmtV=u=>u==="%"?'0.0%;(0.0%);"-"':u==="j"?'#,##0" j";(#,##0)" j";"-"':'#,##0.00" ×";(#,##0.00)" ×";"-"';
  const fmtD=u=>u==="%"?'+#,##0" pb";-#,##0" pb";0" pb"':u==="j"?'+#,##0" j";-#,##0" j";0" j"':'+0.00" ×";-0.00" ×";0" ×"';
  items.forEach(it=>{
    const r=ws.addRow([null,it.lab]);
    r.font={italic:true,color:{argb:"FF808080"}};
    const num=r.number, fv=fmtV(it.unit), fd=fmtD(it.unit);
    show.forEach(s=>{const c=r.getCell(s.cell);c.value={formula:it.f(s.col)};c.numFmt=fv;});
    deltas.forEach(d=>{const cd=r.getCell(d.cell);
      const e=it.unit==="%"?`(${d.c2}${num}-${d.c1}${num})*10000`:`(${d.c2}${num}-${d.c1}${num})`;
      cd.value={formula:`IFERROR(${e},"")`};cd.numFmt=fd;cd.alignment={horizontal:"right"};});
  });
}

async function genererDatabook(){
  if(!ETATS||!DOSSIER.tbagr){toast("Importez d'abord des balances");return;}
  if(typeof ExcelJS==="undefined"){toast("Bibliothèque Excel non chargée");return;}
  toast("Génération du databook…");
  const wb=new ExcelJS.Workbook();
  const A=ETATS.annees;
  const fy=A.map(a=>"FY"+String(a).slice(-2));
  const lignesT=DOSSIER.tbagr.lignes;
  const finT=lignesT.length+4;               /* 3 lignes de titre + en-tête */               /* dernière ligne de données TBAGR */
  const colFY=i=>String.fromCharCode(74+i);  /* colonne A vide : années dès J */
  /* onglets préfixés par la société (limite Excel : 31 caractères) */
  const ong=(n)=>n.slice(0,31);
  const q=(n)=>"'"+n.replace(/'/g,"''")+"'";
  const ongT=ong("TBAGR"),ongPL=ong("P&L"),ongBS=ong("BS");
  /* lignes personnalisées : insérées avant le sous-total de leur catégorie,
     et ajoutées à sa formule de somme (autonome — table interne agrégat → sous-total) */
  const UNI=(typeof CONF_UNITE!=="undefined"&&CONF_UNITE)?CONF_UNITE:{f:1,dec:0,lib:"KFCFA"};
  DB_NUMFMT=UNI.dec?'#,##0.0;(#,##0.0);"-"':'#,##0;(#,##0);"-"';
  const persoL=DOSSIER.lignesPerso||[];
  const AG_ST={PL:{CA:"CA",COUTS_DIRECTS:"COUTS_DIRECTS",AUTRES_PROD:"EBITDA",OPEX:"FRAIS_GENERAUX",
      CHARGES_PERSONNEL:"FRAIS_GENERAUX",DA:"EBIT",RESULTAT_FIN:"RESULTAT_FINANCIER",
      RESULTAT_HAO:"RESULTAT_HAO",IMPOTS:"RESULTAT_NET"},
    BS:{ACTIFS_IMMOBILISES:"ACTIFS_IMMOBILISES",BFR_ACTIF:"BFR_EXPLOITATION",
      BFR_PASSIF:"BFR_EXPLOITATION",TRESORERIE_NETTE:"TRESORERIE_NETTE",
      FINANCEMENT:"ACTIF_NET",CAPITAUX_PROPRES:"CAPITAUX_PROPRES"}};
  function integrerPerso(defs,etat){
    if(!persoL.length) return defs;
    const out=defs.map(l=>Object.assign({},l,l.somme?{somme:l.somme.slice()}:{}));
    persoL.filter(pp=>pp.etat===etat).forEach(pp=>{
      const st=AG_ST[etat][pp.agregat];
      const i=out.findIndex(l=>l.code===st&&l.type==="sous_total");
      if(i<0) throw new Error("Databook : catégorie inconnue pour la ligne personnalisée « "+pp.lib+" »");
      out[i].somme.push(pp.code);
      out.splice(i,0,{code:pp.code,lib:pp.lib,section:out[i].section});
    });
    return out;
  }
  const dPL=integrerPerso(DB_PL,"PL"), dBS=integrerPerso(DB_BS,"BS");  /* I, J, K, ... (colonne 9 = I) */

  /* ---- Accueil : page de garde ---- */
  const wsL=wb.addWorksheet("Accueil");
  wsL.views=[{showGridLines:false}];
  const dateGen=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  let ligneT=6;
  /* logo de la société (chargé dans l'application, onglet Accueil) */
  if(DOSSIER.logo){
    try{
      const ext=(DOSSIER.logo.match(/image\/(png|jpeg|jpg|gif)/)||[,"png"])[1].replace("jpg","jpeg");
      const img=wb.addImage({base64:DOSSIER.logo.split(",")[1],extension:ext});
      wsL.addImage(img,{tl:{col:1.1,row:2},ext:{width:170,height:170}});
      ligneT=14;
    }catch(e){}
  }
  const met=(rn,txt,taille,couleur,gras)=>{
    const c=wsL.getCell(rn,2);c.value=txt;
    c.font={name:"Arial Narrow",size:taille,bold:!!gras,color:{argb:couleur}};
  };
  met(ligneT,DOSSIER.societe,30,"FF172554",true);
  met(ligneT+1,"Databook de due diligence financière",16,"FF6B7280");
  met(ligneT+3,"Exercices "+fy.join(" · ")+"   —   montants en "+UNI.lib,12,"FF172554");
  const infosG=[(DOSSIER.infos||{}).secteur,(DOSSIER.infos||{}).adresse].filter(Boolean).join(" — ");
  met(ligneT+4,infosG||"Scénario comptable SYSCOHADA — balance agrégée, états en formules, détails par poste",11,"FF6B7280");
  met(ligneT+6,"Généré le "+dateGen+" par "+(cabinetExport()||"Findalyx Advisory"),11,"FF6B7280");
  const lm=ligneT+9;
  met(lm,"MODE D'EMPLOI",12,"FF172554",true);
  [["1. La colonne B de l'onglet TBAGR (Mapping) est modifiable par liste déroulante."],
   ["2. P&L, BS et TFT sont en FORMULES : toute correction du mapping recalcule les états."],
   ["3. Les montants des onglets Détail sont des formules de recherche vers TBAGR ; la composition des blocs reste celle de la génération."],
   ["4. Contrôles : équilibres et cohérences ; Commentaires : projets à enrichir + vos notes."]].forEach((r,k)=>met(lm+1+k,r[0],11,"FF404040"));
  /* logo (cabinet si configuré, sinon Findalyx) en bas */
  try{
    const _lc=logoCab();
    const lf=wb.addImage({base64:(_lc?_lc.data:LOGO_FINDALYX_CLAIR).split(",")[1],extension:"png"});
    wsL.addImage(lf,{tl:{col:1.1,row:lm+7},ext:_lc?{width:150,height:Math.round(150/_lc.ratio)}:{width:150,height:44}});
  }catch(e){}
  wsL.columns=[{width:3},{width:110}];
  wsL.getRow(ligneT).height=36;

  /* ---- Lignes (référentiel) ---- */
  const wsRef=wb.addWorksheet("Lignes");
  titreLiasse(wsRef,"Nomenclature des lignes de restitution");
  dbEntete(wsRef.addRow([null,"Code","Libellé","État"]),4);
  const codesValides=[];
  const refPL=(typeof LIGNES_PL!=="undefined"?LIGNES_PL:[]), refBS=(typeof LIGNES_BS!=="undefined"?LIGNES_BS:[]);
  [...refPL.map(l=>[l,"P&L"]),...refBS.map(l=>[l,"BS"]),...persoL.map(l=>[l,l.etat==="PL"?"P&L":"BS"])].forEach(([l,e])=>{
    wsRef.addRow([null,l.code,l.lib,e]);codesValides.push(l.code);
  });
  wsRef.addRow([null,"NON_MAPPE","— Non mappé —",""]);codesValides.push("NON_MAPPE");
  wsRef.columns=[{width:3},{width:26},{width:48},{width:8}];

  /* ---- TBAGR ---- */
  const wsT=wb.addWorksheet(ongT);
  titreLiasse(wsT,"Balance générale agrégée (TBAGR) — "+UNI.lib);
  dbEntete(wsT.addRow([null,"Mapping","BS/PL","No1","No2","No3","No4","Compte","Libellé",...fy]),9);
  lignesT.forEach(l=>{
    const r=wsT.addRow([null,l.mapping,l.bsPl,l.compte[0],l.compte.slice(0,2),l.compte.slice(0,3),
      l.compte.slice(0,4),l.compte,l.libelle,...A.map(a=>Math.round((l.vals[a]||0)*UNI.f*1000)/1000)]);
    r.getCell(2).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};
    for(let i=10;i<10+A.length;i++)r.getCell(i).numFmt=DB_NUMFMT;
    r.getCell(2).dataValidation={type:"list",allowBlank:false,
      formulae:["Lignes!$B$5:$B$"+(codesValides.length+4)]};
  });
  wsT.columns=[{width:3},{width:26},{width:7},{width:5},{width:5},{width:6},{width:7},
    {width:13},{width:40},...A.map(()=>({width:13}))];
  wsT.views=[{state:"frozen",ySplit:1}];

  /* ---- P&L et BS en formules ---- */
  const rows={};
  function ecrireEtat(nom,defs,signeDetail,sousTitre){
    const ws=wb.addWorksheet(nom);
    titreLiasse(ws,sousTitre);
    const n=A.length;
    const deltas=A.slice(1).map((a,i)=>"Δ"+String(A[i]).slice(-2)+"-"+String(a).slice(-2));
    const avecCagr=n>2;
    const nbCols=1+n+(n-1)+(avecCagr?1:0);
    const hd=ws.addRow([null,UNI.lib,...fy,...deltas,...(avecCagr?["CAGR"]:[])]);
    dbEntete(hd,2);
    for(let c=3+n;c<=nbCols+1;c++)hd.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF3D5486"}};
    const local={};
    defs.forEach(l=>{
      const r=ws.addRow([null,l.lib]);
      const idx=r.number;
      if(!l.type){
        const signe=signeDetail(l);
        const cods=l.codes||[l.code];
        A.forEach((a,j)=>{
          r.getCell(3+j).value={formula:`${signe}(`+cods.map(c=>`SUMIF(${q(ongT)}!$B$5:$B$${finT},"${c}",${q(ongT)}!${colFY(j)}$5:${colFY(j)}$${finT})`).join("+")+`)`};
        });
      }else if(l.type==="sous_total"){
        A.forEach((a,j)=>{
          const refs=l.somme.filter(c=>local[c]).map(c=>String.fromCharCode(67+j)+local[c]);
          r.getCell(3+j).value={formula:refs.join("+")||"0"};
        });
        r.font={bold:true,color:{argb:"FF172554"}};
      }else if(l.type==="pourcentage"){
        A.forEach((a,j)=>{
          const col=String.fromCharCode(67+j);
          r.getCell(3+j).value={formula:`IF(${col}${local["CA"]}=0,"",${col}${local[l.num]}/${col}${local["CA"]})`};
          r.getCell(3+j).numFmt='0.0%;(0.0%)';
        });
        r.font={italic:true,color:{argb:"FF808080"}};
      }else if(l.type==="reference_pl"){
        A.forEach((a,j)=>{
          r.getCell(3+j).value={formula:`${q(ongPL)}!${String.fromCharCode(67+j)}${rows["PL_"+l.ref]}`};
        });
      }
      if(l.type!=="pourcentage"){
        for(let j=0;j<n;j++)r.getCell(3+j).numFmt=DB_NUMFMT;
        A.slice(1).forEach((a,i)=>{
          const c1=String.fromCharCode(67+i),c2=String.fromCharCode(68+i);
          r.getCell(3+n+i).value={formula:`IF(${c1}${idx}=0,"na",${c2}${idx}/${c1}${idx}-1)`};
          r.getCell(3+n+i).numFmt='0%;(0%)';
          r.getCell(3+n+i).alignment={horizontal:"right"};
        });
        if(avecCagr){
          const cd=String.fromCharCode(67+n-1);
          r.getCell(2+2*n).value={formula:`IF(AND(C${idx}<>0,${cd}${idx}<>0,SIGN(C${idx})=SIGN(${cd}${idx})),(ABS(${cd}${idx})/ABS(C${idx}))^(1/${n-1})-1,"na")`};
          r.getCell(2+2*n).numFmt='0%;(0%)';
          r.getCell(2+2*n).alignment={horizontal:"right"};
        }
      }
      if(l.type==="sous_total"){
        for(let c=2;c<=nbCols+1;c++)
          r.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
      }
      local[l.code]=idx;
      rows[(nom===ongPL?"PL_":"BS_")+l.code]=idx;
    });
    /* bloc ratios de marge en bas (feuille P&L uniquement) */
    if(local["CA"]){
      ws.addRow([]);
      const rh=ws.addRow([null,"Ratios du compte de résultat"]);
      rh.getCell(2).font={bold:true,color:{argb:"FF172554"}};
      [["Marge brute / CA","MARGE_BRUTE","CA",""],["Marge d'EBITDA","EBITDA","CA",""],
       ["Marge d'exploitation (EBIT)","EBIT","CA",""],["Marge nette","RESULTAT_NET","CA",""],
       ["Frais généraux (overhead) / CA","FRAIS_GENERAUX","CA","-"],
       ["Charges de personnel / CA","CHARGES_PERSONNEL","CA","-"],
       ["Taux d'impôt effectif","IS","RESULTAT_AVANT_IMPOT","-"]].forEach(([lib,num,den,sg])=>{
        if(!local[num]||!local[den])return;
        const r=ws.addRow([null,lib]);r.font={italic:true,color:{argb:"FF808080"}};
        const rn=r.number;
        A.forEach((a,j)=>{const col=String.fromCharCode(67+j);
          r.getCell(3+j).value={formula:`IF(${col}${local[den]}=0,"",${sg}${col}${local[num]}/${col}${local[den]})`};
          r.getCell(3+j).numFmt='0.0%;(0.0%)';});
        A.slice(1).forEach((a,i)=>{const c1=String.fromCharCode(67+i),c2=String.fromCharCode(68+i);
          const cd=r.getCell(3+n+i);
          cd.value={formula:`IFERROR((${c2}${rn}-${c1}${rn})*10000,"")`};
          cd.numFmt='+#,##0" pb";-#,##0" pb";0" pb"';cd.alignment={horizontal:"right"};});
      });
    }
    ws.columns=[{width:3},{width:44},...A.map(()=>({width:14})),...A.slice(1).map(()=>({width:9})),...(avecCagr?[{width:9}]:[])];
    return local;
  }
  const localPL=ecrireEtat(ongPL,dPL,()=>"-","Compte de résultat analytique — "+UNI.lib);
  const localBS=ecrireEtat(ongBS,dBS,(l)=>l.section==="CAPITAUX_PROPRES"?"-":"+","Bilan — présentation actif net — "+UNI.lib);
  /* contrôle actif net = capitaux propres */
  const wsBS=wb.getWorksheet(ongBS);
  const rc=wsBS.addRow([null,"Contrôle : Actif net - Capitaux propres (doit être 0)"]);
  rc.font={bold:true};
  A.forEach((a,j)=>{
    const c=String.fromCharCode(67+j);
    rc.getCell(3+j).value={formula:`${c}${localBS["ACTIF_NET"]}-${c}${localBS["CAPITAUX_PROPRES"]}`};
    rc.getCell(3+j).numFmt=DB_NUMFMT;
  });

  /* ---- Ratios de structure, rentabilité et liquidité (bas du bilan) ---- */
  {
    const c0=67;                                 /* colonne C = 1re année */
    const PL=(code,c)=>`${q(ongPL)}!${c}${localPL[code]}`;
    const BS=(code,c)=>`${c}${localBS[code]}`;   /* même feuille : pas de préfixe */
    const ca=c=>PL("CA",c), ebitda=c=>PL("EBITDA",c), ebit=c=>PL("EBIT",c), rn=c=>PL("RESULTAT_NET",c);
    const cp=c=>BS("CAPITAUX_PROPRES",c);
    const dettesFin=c=>`(-${BS("DETTES_FINANCIERES",c)})`;
    const detteNette=c=>`(-${BS("DETTES_FINANCIERES",c)}-${BS("TRESORERIE_NETTE",c)})`;
    const fraisFin=c=>`(-${PL("FRAIS_FIN",c)})`;
    const stocks=c=>BS("STOCKS",c), clients=c=>BS("CLIENTS",c), tresoA=c=>BS("TRESO_ACTIF",c);
    const fournisseurs=c=>`(-${BS("FOURNISSEURS",c)})`;
    const achats=c=>`(-${PL("COUTS_DIRECTS",c)})`;
    const opex=c=>`(${PL("CHARGES_PERSONNEL",c)}-${PL("FRAIS_GENERAUX",c)})`;   /* = -OPEX (hors personnel) */
    const bfr=c=>BS("BFR_TOTAL",c);
    const actifCirc=c=>`(${BS("STOCKS",c)}+${BS("CLIENTS",c)}+${BS("AUTRES_CREANCES",c)}+${BS("AVANCES_FRS",c)}+${BS("TRESO_ACTIF",c)})`;
    const passifCirc=c=>`(-(${BS("FOURNISSEURS",c)}+${BS("CLIENTS_AVANCES",c)}+${BS("DETTES_SOCIALES",c)}+${BS("DETTES_FISCALES",c)}+${BS("AUTRES_DETTES",c)}+${BS("TRESO_PASSIF",c)}))`;
    const totalActif=c=>`(${BS("ACTIFS_IMMOBILISES",c)}+${actifCirc(c)})`;
    const items=[
      {lab:"ROE (rentabilité des capitaux propres)",unit:"%",f:c=>`IF(${cp(c)}<=0,"",${rn(c)}/${cp(c)})`},
      {lab:"ROA (rentabilité de l'actif)",unit:"%",f:c=>`IF(${totalActif(c)}<=0,"",${rn(c)}/${totalActif(c)})`},
      {lab:"ROCE (rentabilité des capitaux employés)",unit:"%",f:c=>`IF((${cp(c)}+${dettesFin(c)})<=0,"",${ebit(c)}/(${cp(c)}+${dettesFin(c)}))`},
      {lab:"Liquidité générale",unit:"x",f:c=>`IF(${passifCirc(c)}<=0,"",${actifCirc(c)}/${passifCirc(c)})`},
      {lab:"Liquidité réduite",unit:"x",f:c=>`IF(${passifCirc(c)}<=0,"",(${actifCirc(c)}-${stocks(c)})/${passifCirc(c)})`},
      {lab:"Liquidité immédiate",unit:"x",f:c=>`IF(${passifCirc(c)}<=0,"",${tresoA(c)}/${passifCirc(c)})`},
      {lab:"BFR en jours de CA",unit:"j",f:c=>`IF(${ca(c)}=0,"",${bfr(c)}*360/${ca(c)})`},
      {lab:"Délai clients (DSO)",unit:"j",f:c=>`IF(${ca(c)}=0,"",${clients(c)}*360/(${ca(c)}*1.18))`},
      {lab:"Délai fournisseurs (DPO)",unit:"j",f:c=>`IF((${achats(c)}+${opex(c)})<=0,"",${fournisseurs(c)}*360/((${achats(c)}+${opex(c)})*1.18))`},
      {lab:"Gearing (dette fin. / capitaux propres)",unit:"x",f:c=>`IF(${cp(c)}<=0,"",${dettesFin(c)}/${cp(c)})`},
      {lab:"Leverage (dette nette / EBITDA)",unit:"x",f:c=>`IF(${ebitda(c)}<=0,"",${detteNette(c)}/${ebitda(c)})`},
      {lab:"Couverture des intérêts (EBITDA / frais fin.)",unit:"x",f:c=>`IF(${fraisFin(c)}<=0,"",${ebitda(c)}/${fraisFin(c)})`},
      {lab:"Autonomie financière (CP / total actif)",unit:"%",f:c=>`IF(${totalActif(c)}<=0,"",${cp(c)}/${totalActif(c)})`},
    ];
    const nA=A.length;
    const show=A.map((a,j)=>({col:String.fromCharCode(c0+j),cell:3+j}));
    const deltas=A.slice(1).map((a,i)=>({cell:3+nA+i,c1:String.fromCharCode(c0+i),c2:String.fromCharCode(c0+i+1)}));
    dbBlocRatios(wsBS,"Ratios de structure, rentabilité et liquidité",items,show,deltas);
  }

  /* ---- TFT en formules ---- */
  if(A.length>1){
    const ws=wb.addWorksheet(ong("TFT"));
    titreLiasse(ws,"Tableau des flux de trésorerie (formules, méthode indirecte) — "+UNI.lib);
    const mT=A.length-1;              /* colonnes de flux */
    const dT=fy.slice(2).map((f,i)=>"Δ"+fy.slice(1)[i].slice(-2)+"-"+f.slice(-2));
    const hdT=ws.addRow([null,UNI.lib,...fy.slice(1),...dT]);
    dbEntete(hdT,2);
    for(let c=3+mT;c<=2+mT+(mT-1);c++)hdT.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF3D5486"}};
    const pl=(code,j)=>`${q(ongPL)}!${String.fromCharCode(67+j)}${localPL[code]}`;
    const bs=(code,j,d)=>`${q(ongBS)}!${String.fromCharCode(67+j-(d||0))}${localBS[code]}`;
    const delta=(code,j)=>`(${bs(code,j)}-${bs(code,j,1)})`;
    const defs=[
      ["Capacité d'autofinancement globale (CAFG)",
       j=>`${pl("RESULTAT_NET",j)}-${delta("AMORT_DEPREC",j)}-${delta("PROVISIONS_RC",j)}`],
      ["Variation des créances",
       j=>`-(${delta("CLIENTS",j)}+${delta("AUTRES_CREANCES",j)}+${delta("AVANCES_FRS",j)})`],
      ["Variation des stocks",j=>`-${delta("STOCKS",j)}`],
      ["Variation des dettes d'exploitation",
       j=>`-(${delta("FOURNISSEURS",j)}+${delta("CLIENTS_AVANCES",j)}+${delta("DETTES_SOCIALES",j)}+${delta("DETTES_FISCALES",j)}+${delta("AUTRES_DETTES",j)})`],
      ["Flux de trésorerie des activités opérationnelles","OP"],
      ["Acquisitions d'immobilisations",
       j=>`-((${bs("ACTIFS_IMMOBILISES",j)}-${bs("AMORT_DEPREC",j)})-(${bs("ACTIFS_IMMOBILISES",j,1)}-${bs("AMORT_DEPREC",j,1)}))`],
      ["Cessions d'immobilisations",j=>`0`],
      ["Flux de trésorerie des activités d'investissement","INV"],
      ["Augmentation de capital",j=>`${delta("CAPITAL",j)}`],
      ["Subvention d'investissement",j=>`${delta("SUBV_PROV_REGL",j)}`],
      ["Dividendes versés",
       j=>`(${bs("PRIMES_RESERVES",j)}+${bs("RAN_RESULTATS_ANT",j)})-(${bs("PRIMES_RESERVES",j,1)}+${bs("RAN_RESULTATS_ANT",j,1)})-${pl("RESULTAT_NET",j-1)}`],
      ["Emprunts nouveaux",j=>`MAX(0,-${delta("DETTES_FINANCIERES",j)})`],
      ["Remboursement d'emprunts",j=>`MIN(0,-${delta("DETTES_FINANCIERES",j)})`],
      ["Flux de trésorerie des activités de financement","FIN"],
      ["Variation nette de trésorerie de la période","FCF"],
      ["Trésorerie nette d'ouverture (BS)",j=>bs("TRESORERIE_NETTE",j,1)],
      ["Trésorerie de clôture calculée","CLO"],
      ["Trésorerie nette de clôture (BS)",j=>bs("TRESORERIE_NETTE",j)],
      ["Écart de réconciliation (doit être 0)","ECART"]];
    const idx={}; let cafgRow;
    defs.forEach(([lib,f])=>{
      const r=ws.addRow([null,lib]);
      const num=r.number;
      if(cafgRow==null)cafgRow=num;                 /* 1re ligne = CAFG */
      for(let j=1;j<A.length;j++){
        const cl=String.fromCharCode(66+j);
        let v;
        if(typeof f==="function")v=f(j);
        else if(f==="OP")v=`SUM(${cl}${num-4}:${cl}${num-1})`;
        else if(f==="INV")v=`SUM(${cl}${num-2}:${cl}${num-1})`;
        else if(f==="FIN")v=`SUM(${cl}${num-5}:${cl}${num-1})`;
        else if(f==="FCF")v=`${cl}${idx.OP}+${cl}${idx.INV}+${cl}${idx.FIN}`;
        else if(f==="CLO")v=`${cl}${idx.FCF}+${cl}${num-1}`;
        else v=`${cl}${idx.CLO}-${cl}${num-1}`;
        r.getCell(2+j).value={formula:v};
        r.getCell(2+j).numFmt=DB_NUMFMT;
      }
      for(let i=1;i<mT;i++){
        const c1=String.fromCharCode(67+i-1),c2=String.fromCharCode(67+i);
        r.getCell(2+mT+i).value={formula:`IF(${c1}${num}=0,"na",${c2}${num}/${c1}${num}-1)`};
        r.getCell(2+mT+i).numFmt='0%;(0%)';
        r.getCell(2+mT+i).alignment={horizontal:"right"};
      }
      if(typeof f==="string"){idx[f]=num;
        r.font={bold:true,color:{argb:"FF172554"}};
        for(let c=2;c<=(mT>1?1+2*mT:2+mT);c++)
          r.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
      }
    });
    /* ---- Ratios de flux et de trésorerie (bas du TFT) ---- */
    {
      const CA=c=>`${q(ongPL)}!${c}${localPL["CA"]}`;
      const EBITDA=c=>`${q(ongPL)}!${c}${localPL["EBITDA"]}`;
      const DFIN=c=>`${q(ongBS)}!${c}${localBS["DETTES_FINANCIERES"]}`;
      const cE=cT=>String.fromCharCode(cT.charCodeAt(0)+1);   /* colonne année sur P&L/BS (décalée de 1 vs TFT) */
      const items=[
        {lab:"Capacité d'autofinancement (CAFG) / CA",unit:"%",f:c=>`IF(${CA(cE(c))}=0,"",${c}${cafgRow}/${CA(cE(c))})`},
        {lab:"Conversion en cash (flux d'exploitation / EBITDA)",unit:"%",f:c=>`IF(${EBITDA(cE(c))}=0,"",${c}${idx.OP}/${EBITDA(cE(c))})`},
        {lab:"Free cash flow / CA (exploitation + investissement)",unit:"%",f:c=>`IF(${CA(cE(c))}=0,"",(${c}${idx.OP}+${c}${idx.INV})/${CA(cE(c))})`},
        {lab:"Capacité de remboursement (dette financière / CAFG)",unit:"x",f:c=>`IF(${c}${cafgRow}<=0,"",(-${DFIN(cE(c))})/${c}${cafgRow})`},
        {lab:"Couverture des investissements (flux d'exploitation / investissements)",unit:"x",f:c=>`IF(${c}${idx.INV}=0,"",${c}${idx.OP}/ABS(${c}${idx.INV}))`},
      ];
      const show=[]; for(let j=1;j<A.length;j++)show.push({col:String.fromCharCode(66+j),cell:2+j});
      const deltas=[]; for(let i=1;i<mT;i++)deltas.push({cell:2+mT+i,c1:String.fromCharCode(66+i),c2:String.fromCharCode(67+i)});
      dbBlocRatios(ws,"Ratios de flux et de trésorerie",items,show,deltas);
    }
    ws.columns=[{width:3},{width:48},...A.slice(1).map(()=>({width:14})),...A.slice(2).map(()=>({width:9}))];
  }

  /* ---- Détails par poste ---- */
  function detail(nom,defs,signeDetail){
    const n=A.length, avecCagr=n>2;
    const dLibs=A.slice(1).map((a,i)=>"Δ"+String(A[i]).slice(-2)+"-"+String(a).slice(-2));
    const ecrireVariations=(r,num)=>{
      A.slice(1).forEach((a,i)=>{
        const c1=String.fromCharCode(68+i),c2=String.fromCharCode(69+i);
        const c=r.getCell(4+n+i);
        c.value={formula:`IF(${c1}${num}=0,"na",${c2}${num}/${c1}${num}-1)`};
        c.numFmt='0%;(0%)';c.alignment={horizontal:"right"};
      });
      if(avecCagr){
        const cd=String.fromCharCode(67+n);
        const c=r.getCell(3+2*n);
        c.value={formula:`IF(AND(D${num}<>0,${cd}${num}<>0,SIGN(D${num})=SIGN(${cd}${num})),(ABS(${cd}${num})/ABS(D${num}))^(1/${n-1})-1,"na")`};
        c.numFmt='0%;(0%)';c.alignment={horizontal:"right"};
      }
    };
    const nbColsD=2+n+(n-1)+(avecCagr?1:0);
    const ws=wb.addWorksheet(nom);
    titreLiasse(ws,(nom.includes("P&L")?"Détail des postes du compte de résultat — ":"Détail des postes du bilan — ")+UNI.lib);
    let rn=4;
    defs.forEach(l=>{
      if(l.type)return;
      const cods=l.codes||[l.code];
      const bloc=lignesT.filter(t=>cods.includes(t.mapping));
      if(!bloc.length)return;
      const s=signeDetail(l)==="-"?-1:1;
      for(let i=2;i<=nbColsD+1;i++)
        ws.getCell(rn,i).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFEFF3FA"}};
      ws.getCell(rn,2).value=l.lib;
      ws.getCell(rn,2).font={bold:true,size:11,color:{argb:"FF172554"}};rn++;
      ws.getRow(rn).values=[null,"Compte","Libellé",...fy,...dLibs,...(avecCagr?["CAGR"]:[])];
      dbEntete(ws.getRow(rn),3);
      for(let c=4+n;c<=nbColsD+1;c++)ws.getRow(rn).getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF3D5486"}};
      rn++;
      bloc.sort((x,y)=>Math.abs(y.vals[A[A.length-1]])-Math.abs(x.vals[A[A.length-1]]));
      const debutBloc=rn;
      bloc.forEach(t=>{
        const r=ws.getRow(rn);
        r.getCell(2).value=t.compte;
        r.getCell(3).value=t.libelle;
        A.forEach((a,j)=>{
          /* RECHERCHE par numéro de compte dans TBAGR (colonne H), robuste aux tris */
          r.getCell(4+j).value={formula:`${s<0?"-":""}SUMIF(${q(ongT)}!$H$5:$H$${finT},$B${rn},${q(ongT)}!${colFY(j)}$5:${colFY(j)}$${finT})`};
          r.getCell(4+j).numFmt=DB_NUMFMT;
        });
        ecrireVariations(r,rn);
        rn++;
      });
      const r=ws.getRow(rn);
      r.getCell(3).value="Total "+l.lib;
      A.forEach((a,j)=>{
        const cl=String.fromCharCode(68+j);
        r.getCell(4+j).value={formula:`SUM(${cl}${debutBloc}:${cl}${rn-1})`};
        r.getCell(4+j).numFmt=DB_NUMFMT;
      });
      ecrireVariations(r,rn);
      r.font={bold:true,color:{argb:"FF172554"}};
      for(let i=2;i<=nbColsD+1;i++)
        r.getCell(i).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
      rn+=2;
    });
    ws.columns=[{width:3},{width:14},{width:42},...A.map(()=>({width:13})),...A.slice(1).map(()=>({width:9})),...(avecCagr?[{width:9}]:[])];
  }
  /* ============ Feuilles analytiques (synthèse, QoE, common-size, ponts) ============ */
  const colE=i=>String.fromCharCode(67+i);                 /* colonnes années sur P&L/BS (C, D, …) */
  const celPL=(code,i)=>`${q(ongPL)}!${colE(i)}${localPL[code]}`;
  const celBS=(code,i)=>`${q(ongBS)}!${colE(i)}${localBS[code]}`;

  /* --- Synthèse exécutive : indicateurs clés --- */
  {
    const ws=wb.addWorksheet(ong("Synthèse"));
    titreLiasse(ws,"Synthèse exécutive — indicateurs clés — "+UNI.lib);
    dbEntete(ws.addRow([null,"Indicateur",...fy]),2);
    const kpi=(lib,fn,fmtStr,st)=>{const r=ws.addRow([null,lib]);
      A.forEach((a,i)=>{const c=r.getCell(3+i);c.value={formula:fn(i)};c.numFmt=fmtStr;});
      if(st){r.font={bold:true,color:{argb:"FF172554"}};for(let c=2;c<=2+A.length;c++)r.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};}
      else if(fmtStr!==DB_NUMFMT)r.font={italic:true,color:{argb:"FF808080"}};};
    const croiss=(code,i)=>i===0?`"na"`:`IF(${celPL(code,i-1)}=0,"na",${celPL(code,i)}/${celPL(code,i-1)}-1)`;
    kpi("Chiffre d'affaires",i=>celPL("CA",i),DB_NUMFMT,1);
    kpi("Croissance du CA",i=>croiss("CA",i),'0.0%;(0.0%)');
    kpi("EBITDA",i=>celPL("EBITDA",i),DB_NUMFMT,1);
    kpi("Marge d'EBITDA",i=>`IF(${celPL("CA",i)}=0,"",${celPL("EBITDA",i)}/${celPL("CA",i)})`,'0.0%;(0.0%)');
    kpi("Résultat net",i=>celPL("RESULTAT_NET",i),DB_NUMFMT,1);
    kpi("Marge nette",i=>`IF(${celPL("CA",i)}=0,"",${celPL("RESULTAT_NET",i)}/${celPL("CA",i)})`,'0.0%;(0.0%)');
    kpi("Besoin en fonds de roulement",i=>celBS("BFR_TOTAL",i),DB_NUMFMT,1);
    kpi("BFR en jours de CA",i=>`IF(${celPL("CA",i)}=0,"",${celBS("BFR_TOTAL",i)}*360/${celPL("CA",i)})`,'0" j";(0)" j"');
    kpi("Trésorerie nette",i=>celBS("TRESORERIE_NETTE",i),DB_NUMFMT,1);
    kpi("Dettes financières",i=>`-${celBS("DETTES_FINANCIERES",i)}`,DB_NUMFMT,1);
    kpi("Gearing (dette fin. / capitaux propres)",i=>`IF(${celBS("CAPITAUX_PROPRES",i)}<=0,"",-${celBS("DETTES_FINANCIERES",i)}/${celBS("CAPITAUX_PROPRES",i)})`,'0.0"x"');
    ws.columns=[{width:3},{width:44},...A.map(()=>({width:14}))];
  }

  /* --- Normalisation de l'EBITDA (Quality of Earnings) --- */
  {
    const ws=wb.addWorksheet(ong("Normalisations"));
    titreLiasse(ws,"Normalisation de l'EBITDA et du BFR (Quality of Earnings) — "+UNI.lib);
    dbEntete(ws.addRow([null,UNI.lib,...fy]),2);
    const retr=(DOSSIER.adj&&DOSSIER.adj.ebitda)||[];
    const vAdj=(l,a)=>l.comptes&&l.comptes.length
      ?(l.sens||1)*lignesT.filter(t=>l.comptes.includes(t.compte)).reduce((q2,t)=>q2+(t.vals[a]||0),0)
      :(l.vals&&l.vals[a]||0);
    const rEb=ws.addRow([null,"EBITDA reporté"]);rEb.font={bold:true};
    A.forEach((a,i)=>{const c=rEb.getCell(3+i);c.value={formula:celPL("EBITDA",i)};c.numFmt=DB_NUMFMT;});
    retr.forEach(l=>{const r=ws.addRow([null,"  retraitement : "+(l.lib||"—")]);
      A.forEach((a,i)=>{const c=r.getCell(3+i);c.value=Math.round(vAdj(l,a)*UNI.f*1000)/1000;c.numFmt=DB_NUMFMT;});});
    const first=rEb.number,last=rEb.number+retr.length;
    const rNo=ws.addRow([null,"EBITDA normalisé"]);rNo.font={bold:true,color:{argb:"FF172554"}};
    A.forEach((a,i)=>{const c=rNo.getCell(3+i);c.value={formula:`SUM(${colE(i)}${first}:${colE(i)}${last})`};c.numFmt=DB_NUMFMT;});
    for(let c=2;c<=2+A.length;c++)rNo.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
    const rM=ws.addRow([null,"Marge d'EBITDA normalisée (% du CA)"]);rM.font={italic:true,color:{argb:"FF808080"}};
    A.forEach((a,i)=>{const c=rM.getCell(3+i);c.value={formula:`IF(${celPL("CA",i)}=0,"",${colE(i)}${rNo.number}/${celPL("CA",i)})`};c.numFmt='0.0%';});
    if(!retr.length)ws.addRow([null,"(Aucun retraitement d'EBITDA défini — voir l'onglet Retraitements de l'application.)"]);
    /* --- Normalisation du BFR (BFR normatif) --- */
    ws.addRow([]);
    const secB=ws.addRow([null,"Normalisation du BFR"]);secB.getCell(2).font={bold:true,color:{argb:"FF172554"}};
    const retB=(DOSSIER.adj&&DOSSIER.adj.bfr)||[];
    const rBe=ws.addRow([null,"BFR d'exploitation reporté"]);rBe.font={bold:true};
    A.forEach((a,i)=>{const c=rBe.getCell(3+i);c.value={formula:celBS("BFR_EXPLOITATION",i)};c.numFmt=DB_NUMFMT;});
    retB.forEach(l=>{const r=ws.addRow([null,"  retraitement : "+(l.lib||"—")]);
      A.forEach((a,i)=>{const c=r.getCell(3+i);c.value=Math.round(vAdj(l,a)*UNI.f*1000)/1000;c.numFmt=DB_NUMFMT;});});
    const fB=rBe.number,lB=rBe.number+retB.length;
    const rBn=ws.addRow([null,"BFR normatif"]);rBn.font={bold:true,color:{argb:"FF172554"}};
    A.forEach((a,i)=>{const c=rBn.getCell(3+i);c.value={formula:`SUM(${colE(i)}${fB}:${colE(i)}${lB})`};c.numFmt=DB_NUMFMT;});
    for(let c=2;c<=2+A.length;c++)rBn.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};
    const rBj=ws.addRow([null,"BFR normatif en jours de CA"]);rBj.font={italic:true,color:{argb:"FF808080"}};
    A.forEach((a,i)=>{const c=rBj.getCell(3+i);c.value={formula:`IF(${celPL("CA",i)}=0,"",${colE(i)}${rBn.number}*360/${celPL("CA",i)})`};c.numFmt='#,##0" j"';});
    if(!retB.length)ws.addRow([null,"(Aucun retraitement de BFR défini.)"]);
    ws.columns=[{width:3},{width:48},...A.map(()=>({width:14}))];
  }

  /* --- États en common-size (analyse verticale) --- */
  {
    const ws=wb.addWorksheet(ong("Common-size"));
    titreLiasse(ws,"États en pourcentage (analyse verticale) — P&L / CA · Bilan / actif net");
    dbEntete(ws.addRow([null,"% vertical",...fy]),2);
    const secT=t=>{const r=ws.addRow([null,t]);r.font={bold:true,color:{argb:"FF172554"}};for(let c=2;c<=2+A.length;c++)r.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};};
    secT("Compte de résultat (% du chiffre d'affaires)");
    dPL.filter(l=>l.type!=="pourcentage").forEach(l=>{const r=ws.addRow([null,l.lib]);if(l.type==="sous_total")r.font={bold:true};
      A.forEach((a,i)=>{const c=r.getCell(3+i);c.value={formula:`IF(${celPL("CA",i)}=0,"",${celPL(l.code,i)}/${celPL("CA",i)})`};c.numFmt='0.0%;(0.0%)';});});
    secT("Bilan (% de l'actif net)");
    dBS.filter(l=>l.type!=="pourcentage"&&l.type!=="reference_pl").forEach(l=>{const r=ws.addRow([null,l.lib]);if(l.type==="sous_total")r.font={bold:true};
      A.forEach((a,i)=>{const c=r.getCell(3+i);c.value={formula:`IF(${celBS("ACTIF_NET",i)}=0,"",${celBS(l.code,i)}/${celBS("ACTIF_NET",i)})`};c.numFmt='0.0%;(0.0%)';});});
    ws.columns=[{width:3},{width:46},...A.map(()=>({width:12}))];
  }

  /* --- Ponts de variation (walk CA & EBITDA, transitions en colonnes) --- */
  if(A.length>1){
    const ws=wb.addWorksheet(ong("Ponts de variation"));
    titreLiasse(ws,"Ponts de variation d'une année sur l'autre — "+UNI.lib);
    const trans=A.slice(1).map((a,k)=>fy[k]+" → "+fy[k+1]);
    dbEntete(ws.addRow([null,UNI.lib,...trans]),2);
    const pont=(lib,fn,st)=>{const r=ws.addRow([null,lib]);
      A.slice(1).forEach((a,k)=>{const c=r.getCell(3+k);c.value={formula:fn(k,k+1)};c.numFmt=DB_NUMFMT;});
      if(st){r.font={bold:true,color:{argb:"FF172554"}};for(let c=2;c<=2+trans.length;c++)r.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7F9FC"}};}};
    pont("CA (départ)",(p,c)=>celPL("CA",p),1);
    pont("  Variation du chiffre d'affaires",(p,c)=>`${celPL("CA",c)}-${celPL("CA",p)}`);
    pont("CA (arrivée)",(p,c)=>celPL("CA",c),1);
    ws.addRow([]);
    pont("EBITDA (départ)",(p,c)=>celPL("EBITDA",p),1);
    pont("  Effet marge brute",(p,c)=>`${celPL("MARGE_BRUTE",c)}-${celPL("MARGE_BRUTE",p)}`);
    pont("  Effet autres produits & frais généraux",(p,c)=>`(${celPL("EBITDA",c)}-${celPL("MARGE_BRUTE",c)})-(${celPL("EBITDA",p)}-${celPL("MARGE_BRUTE",p)})`);
    pont("EBITDA (arrivée)",(p,c)=>celPL("EBITDA",c),1);
    ws.columns=[{width:3},{width:44},...trans.map(()=>({width:16}))];
  }

  detail(ong("Détail P&L"),dPL,()=>"-");
  detail(ong("Détail BS"),dBS,(l)=>l.section==="CAPITAUX_PROPRES"?"-":"+");

  /* ---- Contrôles ---- */
  const wsC=wb.addWorksheet("Controles");
  titreLiasse(wsC,"Contrôles de cohérence");
  dbEntete(wsC.addRow([null,"Contrôle","Valeur","Statut","Règle"]),5);
  DOSSIER.balances.slice().sort((a,b)=>a.annee-b.annee).forEach(b=>{
    const rEq=wsC.addRow([null,"Équilibre balance FY"+b.annee,Math.round(b.controle.ecart),
      Math.abs(b.controle.ecart)<1?"OK":"ÉCART","somme débits = somme crédits"]);
    rEq.getCell(3).numFmt=DB_NUMFMT;
  });
  const nm=lignesT.filter(l=>l.mapping==="NON_MAPPE").length;
  wsC.addRow([null,"Comptes non rattachés au référentiel",nm,nm===0?"OK":"À MAPPER",
    "corriger la colonne Mapping de TBAGR"]);
  wsC.addRow([null,"Actif net = Capitaux propres","voir onglet BS","","contrôle en bas de l'onglet BS"]);
  wsC.columns=[{width:3},{width:50},{width:16},{width:12},{width:44}];

  /* ---- Commentaires ---- */
  const wsCom=wb.addWorksheet("Commentaires");
  titreLiasse(wsCom,"Commentaires et notes de l'analyste");
  dbEntete(wsCom.addRow([null,"État","Thème","Commentaire (projet à enrichir)"]),4);
  const C=genererCommentaires(ETATS);
  const noms={pl:"Compte de résultat",bs:"Bilan",tft:"Flux de trésorerie"};
  ["pl","bs","tft"].forEach(k=>{
    (C[k]||[]).forEach(c=>{const r=wsCom.addRow([null,noms[k],c.t,c.x]);
      r.getCell(4).alignment={wrapText:true};});
    const note=(DOSSIER.notes||{})[k];
    if(note){const r=wsCom.addRow([null,noms[k],"Notes de l'analyste",note]);
      r.font={italic:true};r.getCell(4).alignment={wrapText:true};}
  });
  wsCom.columns=[{width:3},{width:20},{width:26},{width:110}];

  /* ---- BG par exercice ---- */
  DOSSIER.balances.slice().sort((a,b)=>a.annee-b.annee).forEach(b=>{
    const ws=wb.addWorksheet("BG_"+b.annee);
    titreLiasse(ws,"Balance générale FY"+b.annee+" — données source (FCFA)");
    dbEntete(ws.addRow([null,"Compte","Libellé","SI débit","SI crédit","Mvt débit","Mvt crédit",
      "SF débit","SF crédit","Solde net"]),3);
    b.comptes.forEach(e=>{
      const r=ws.addRow([null,e.compte,e.libelle,e.si_d,e.si_c,e.mvt_d,e.mvt_c,e.sf_d,e.sf_c,e.net]);
      for(let i=4;i<=10;i++)r.getCell(i).numFmt=DB_NUMFMT;
    });
    ws.columns=[{width:3},{width:13},{width:42},...Array(7).fill({width:14})];
  });

  finaliserClasseur(wb);
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="Databook_DD_"+DOSSIER.societe.replace(/\W+/g,"_")+".xlsx";
  a.click();
  toast("Databook téléchargé");
}
