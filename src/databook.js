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
 {"code": "AUTRES_CREANCES", "lib": "Autres créances", "section": "BFR"},
 {"code": "FOURNISSEURS", "lib": "Dettes fournisseurs", "section": "BFR"},
 {"code": "DETTES_SOCIALES", "lib": "Dettes sociales", "section": "BFR"},
 {"code": "DETTES_FISCALES", "lib": "Dettes fiscales", "section": "BFR"},
 {"code": "AUTRES_DETTES", "lib": "Autres dettes d'exploitation", "section": "BFR"},
 {"code": "BFR_EXPLOITATION", "lib": "BFR d'exploitation", "type": "sous_total", "somme": ["STOCKS", "CLIENTS", "CLIENTS_AVANCES", "AVANCES_FRS", "AUTRES_CREANCES", "FOURNISSEURS", "DETTES_SOCIALES", "DETTES_FISCALES", "AUTRES_DETTES"], "section": "BFR"},
 {"code": "HAO_ACTIF", "lib": "Créances HAO", "section": "BFR"},
 {"code": "HAO_PASSIF", "lib": "Dettes HAO", "section": "BFR"},
 {"code": "BFR_TOTAL", "lib": "Besoin en fonds de roulement total", "type": "sous_total", "somme": ["BFR_EXPLOITATION", "HAO_ACTIF", "HAO_PASSIF"], "section": "BFR"},
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
  met(ligneT+6,"Généré le "+dateGen+" par Findalyx Advisory",11,"FF6B7280");
  const lm=ligneT+9;
  met(lm,"MODE D'EMPLOI",12,"FF172554",true);
  [["1. La colonne B de l'onglet TBAGR (Mapping) est modifiable par liste déroulante."],
   ["2. P&L, BS et TFT sont en FORMULES : toute correction du mapping recalcule les états."],
   ["3. Les montants des onglets Détail sont des formules de recherche vers TBAGR ; la composition des blocs reste celle de la génération."],
   ["4. Contrôles : équilibres et cohérences ; Commentaires : projets à enrichir + vos notes."]].forEach((r,k)=>met(lm+1+k,r[0],11,"FF404040"));
  /* logo Findalyx en bas */
  try{
    const lf=wb.addImage({base64:LOGO_FINDALYX_CLAIR.split(",")[1],extension:"png"});
    wsL.addImage(lf,{tl:{col:1.1,row:lm+7},ext:{width:150,height:44}});
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
      const rh=ws.addRow([null,"Ratios de marge (% du chiffre d'affaires)"]);
      rh.getCell(2).font={bold:true,color:{argb:"FF172554"}};
      [["MARGE_BRUTE","Marge brute / CA"],["EBITDA","Marge d'EBITDA"],
       ["EBIT","Marge d'exploitation (EBIT)"],["RESULTAT_NET","Marge nette"]].forEach(([c,lib])=>{
        if(!local[c])return;
        const r=ws.addRow([null,lib]);r.font={italic:true,color:{argb:"FF808080"}};
        A.forEach((a,j)=>{const col=String.fromCharCode(67+j);
          r.getCell(3+j).value={formula:`IF(${col}${local["CA"]}=0,"",${col}${local[c]}/${col}${local["CA"]})`};
          r.getCell(3+j).numFmt='0.0%;(0.0%)';});
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
       j=>`-(${delta("CLIENTS",j)}+${delta("AUTRES_CREANCES",j)}+${delta("AVANCES_FRS",j)}+${delta("HAO_ACTIF",j)})`],
      ["Variation des stocks",j=>`-${delta("STOCKS",j)}`],
      ["Variation des dettes d'exploitation",
       j=>`-(${delta("FOURNISSEURS",j)}+${delta("CLIENTS_AVANCES",j)}+${delta("DETTES_SOCIALES",j)}+${delta("DETTES_FISCALES",j)}+${delta("AUTRES_DETTES",j)}+${delta("HAO_PASSIF",j)})`],
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
    const idx={};
    defs.forEach(([lib,f])=>{
      const r=ws.addRow([null,lib]);
      const num=r.number;
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
