/* =========================================================================
   Findalyx Advisory — génération des rapports PowerPoint dans le navigateur
   (PptxGenJS). Style "banque d'affaires" validé : filet bleu nuit, en-tête
   société/CONFIDENTIEL, assertion italique, tableaux denses, OBSERVATIONS,
   cartes façon application, garde et contacts partiellement sombres.
   ========================================================================= */
const RP={NAVY:"172554",BLEU:"224289",ORANGE:"FA6706",PALE:"E9EFF7",
  G_TITRE:"1F2937",G_TXT:"6B7280",G_CLAIR:"9CA3AF",FILET:"D8DCE3",BLANC:"FFFFFF"};
const RP_TINTES={"172554":"E8ECF5","224289":"E5EBF6","FA6706":"FEEBDD","16904E":"E4F3EA"};

const rpU=()=>(typeof CONF_UNITE!=="undefined"&&CONF_UNITE)?CONF_UNITE:{f:1,dec:0,lib:"K"+"FCFA"};
const rpLib=()=>rpU().lib;
function rpFmt(v){if(v===null||v===undefined)return "-";
  const u=rpU(),x=v*u.f;
  if(Math.abs(x)<(u.dec?0.05:0.5))return "-";
  const s=Math.abs(x).toLocaleString("fr-FR",{minimumFractionDigits:u.dec,maximumFractionDigits:u.dec}).replace(/[\u202f\u00a0]/g," ");
  return x<0?`(${s})`:s;}
function rpPct(v){if(v===null||!isFinite(v))return "-";if(Math.abs(v)>9.99)return "n.s.";
  const s=Math.round(Math.abs(v*100))+"%";return v<0?`(${s})`:s;}

/* ---------- éléments de page ---------- */
function rpEnTete(sl, societe, section){
  sl.addShape("rect",{x:0.55,y:0.42,w:12.23,h:0.02,fill:{color:RP.NAVY}});
  sl.addText((societe+" — "+section).toUpperCase(),{x:0.55,y:0.5,w:8.6,h:0.28,
    fontSize:9,bold:true,color:RP.G_TXT,charSpacing:2,fontFace:"Arial"});
  sl.addText("STRICTEMENT CONFIDENTIEL",{x:9.4,y:0.5,w:3.38,h:0.28,align:"right",
    fontSize:9,bold:true,color:RP.G_CLAIR,charSpacing:2,fontFace:"Arial"});
}
function rpTitre(sl,txt){sl.addText(txt,{x:0.55,y:0.92,w:12.2,h:0.45,fontSize:17,
  bold:true,color:RP.NAVY,fontFace:"Arial"});}
function rpAssertion(sl,txt){sl.addText(txt,{x:0.55,y:1.4,w:12.2,h:0.35,fontSize:11,
  italic:true,color:RP.G_TXT,fontFace:"Arial"});}
function rpPied(sl,mention,page){
  sl.addShape("rect",{x:0.55,y:7.02,w:12.23,h:0.015,fill:{color:RP.FILET}});
  sl.addImage({data:LOGO_FINDALYX_CLAIR,x:0.55,y:7.09,h:0.24,w:0.24*4.45});
  sl.addText(mention,{x:2.6,y:7.1,w:8.2,h:0.25,align:"center",fontSize:8,
    color:RP.G_CLAIR,fontFace:"Arial"});
  sl.addText(String(page),{x:12.2,y:7.1,w:0.58,h:0.25,align:"right",fontSize:9,
    color:RP.G_TXT,fontFace:"Arial"});
}
function rpGarde(pptx, societe, titreR, sousTitre, dateTxt, cabinet){
  const sl=pptx.addSlide();
  sl.addImage({data:LOGO_FINDALYX_CLAIR,x:0.7,y:0.7,h:0.5,w:0.5*4.45});
  if(typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.logo)
    sl.addImage({data:DOSSIER.logo,x:11.4,y:1.45,w:1.25,h:1.25,sizing:{type:"contain",w:1.25,h:1.25}});
  sl.addText("STRICTEMENT CONFIDENTIEL",{x:9.0,y:0.8,w:3.6,h:0.3,align:"right",
    fontSize:9.5,bold:true,color:RP.G_CLAIR,charSpacing:2,fontFace:"Arial"});
  sl.addText(dateTxt.toUpperCase(),{x:0.7,y:2.1,w:11.9,h:0.35,fontSize:11,bold:true,
    color:RP.G_TXT,charSpacing:2,fontFace:"Arial"});
  sl.addShape("rect",{x:0,y:3.1,w:13.333,h:4.4,fill:{color:RP.NAVY}});
  sl.addShape("rect",{x:0.72,y:3.72,w:1.7,h:0.045,fill:{color:RP.ORANGE}});
  sl.addText(societe,{x:0.7,y:3.95,w:11.9,h:0.95,fontSize:40,bold:true,color:RP.BLANC,fontFace:"Arial"});
  sl.addText(titreR,{x:0.7,y:5.0,w:11.9,h:0.5,fontSize:19,color:"CADCFC",fontFace:"Arial"});
  sl.addText(sousTitre,{x:0.7,y:5.6,w:11.9,h:0.35,fontSize:12.5,color:"9FB0D6",fontFace:"Arial"});
  sl.addText("Projet de rapport — support de discussion  ·  Préparé par "+cabinet,
    {x:0.7,y:6.8,w:11.9,h:0.3,fontSize:10.5,color:"9FB0D6",fontFace:"Arial"});
}
function rpSection(pptx, numero, titreS, sousSections, mention, page){
  const sl=pptx.addSlide();
  sl.addShape("rect",{x:0.55,y:0.42,w:12.23,h:0.02,fill:{color:RP.NAVY}});
  sl.addText(String(numero).padStart(2,"0"),{x:0.55,y:1.5,w:3.2,h:1.6,fontSize:92,
    bold:true,color:RP.PALE,fontFace:"Arial"});
  sl.addText(titreS,{x:0.62,y:3.3,w:10.5,h:0.7,fontSize:27,bold:true,color:RP.NAVY,fontFace:"Arial"});
  let y=4.25;
  sousSections.forEach((ss,i)=>{
    sl.addText(numero+"."+(i+1),{x:0.65,y:y,w:0.7,h:0.3,fontSize:11,bold:true,color:RP.ORANGE,fontFace:"Arial"});
    sl.addText(ss,{x:1.45,y:y,w:9.5,h:0.3,fontSize:11.5,color:RP.G_TITRE,fontFace:"Arial"});
    y+=0.4;
  });
  rpPied(sl,mention,page);
  return sl;
}
function rpObservations(sl, x, y, w, puces){
  sl.addText("OBSERVATIONS",{x:x,y:y,w:w,h:0.25,fontSize:9.5,bold:true,color:RP.BLEU,
    charSpacing:2,fontFace:"Arial"});
  let yy=y+0.35;
  puces.forEach(([lead,txt])=>{
    sl.addText("▪",{x:x,y:yy,w:0.18,h:0.3,fontSize:9,color:RP.ORANGE,fontFace:"Arial"});
    sl.addText([{text:lead+" — ",options:{bold:true,color:RP.BLEU}},
                {text:txt,options:{color:RP.G_TITRE}}],
      {x:x+0.24,y:yy,w:w-0.24,h:0.9,fontSize:9.5,fontFace:"Arial",valign:"top"});
    yy+=0.22*Math.max(1,Math.ceil(txt.length/52)+1)+0.14;
  });
}
function rpTable(sl, x, y, w, bande, entetes, lignes, styles, colsDelta, largeurs, taille, source){
  taille=taille||8.5;
  if(bande) sl.addText(bande,{x:x,y:y-0.26,w:w,h:0.22,fontSize:9.5,bold:true,
    color:RP.BLEU,charSpacing:1,fontFace:"Arial"});
  const tot=largeurs.reduce((a,b)=>a+b,0);
  const colW=largeurs.map(l=>w*l/tot);
  const rows=[];
  rows.push(entetes.map((h,j)=>({text:String(h||" "),options:{fill:{color:RP.NAVY},
    color:RP.BLANC,bold:true,fontSize:taille,align:j?"right":"left",fontFace:"Arial"}})));
  lignes.forEach((lg,i)=>{
    const st=styles[i];
    rows.push(lg.map((v,j)=>{
      const o={fontSize:taille,align:j?"right":"left",fontFace:"Arial",
        fill:{color:(colsDelta&&colsDelta.has(j))?RP.PALE:RP.BLANC},color:RP.G_TITRE};
      if(st==="titre"||st==="sous_total"){o.bold=true;o.color=RP.NAVY;}
      if(st==="pct"){o.italic=true;o.color=RP.G_CLAIR;}
      return {text:(j===0&&(st==="detail"||st==="pct")?"  ":"")+String(v||" "),options:o};
    }));
  });
  sl.addTable(rows,{x:x,y:y,w:w,colW:colW,border:{type:"none"},rowH:0.24,margin:0.03});
  const fin=y+0.24*(lignes.length+1);
  if(source) sl.addText(source,{x:x,y:fin+0.06,w:w,h:0.22,fontSize:8,italic:true,
    color:RP.G_CLAIR,fontFace:"Arial"});
  return fin;
}
function rpCartes(sl, items, y){
  y=y||1.85;
  const x0=0.55,W=12.23,gap=0.18,n=items.length;
  const w=(W-gap*(n-1))/n,h=1.18;
  const icones=[["chart","224289"],["coins","FA6706"],["file","172554"],["wallet","16904E"]];
  items.forEach((it,i)=>{
    const [lab,val,sub,pilule,ton]=it;
    const genre=it[5]||icones[i%4][0], coul=it[6]||icones[i%4][1];
    const xx=x0+i*(w+gap);
    sl.addShape("roundRect",{x:xx,y:y,w:w,h:h,rectRadius:0.045,fill:{color:RP.BLANC},
      line:{color:"ECEFF3",width:1}});
    sl.addText(lab,{x:xx+0.16,y:y+0.1,w:w-0.55,h:0.32,fontSize:8.5,color:RP.G_TXT,
      fontFace:"Arial",valign:"top"});
    /* icône */
    const ix=xx+w-0.42,iy=y+0.12,t=0.3;
    sl.addShape("roundRect",{x:ix,y:iy,w:t,h:t,rectRadius:0.045,
      fill:{color:RP_TINTES[coul]||"EEF1F5"}});
    const b=(bx,by,bw,bh,forme)=>sl.addShape(forme||"rect",
      {x:bx,y:by,w:bw,h:bh,fill:{color:coul}});
    if(genre==="chart"){b(ix+0.06,iy+0.16,0.045,0.09);b(ix+0.125,iy+0.11,0.045,0.14);
      b(ix+0.19,iy+0.06,0.045,0.19);}
    else if(genre==="coins"){b(ix+0.055,iy+0.06,0.13,0.09,"ellipse");
      b(ix+0.105,iy+0.14,0.13,0.09,"ellipse");}
    else if(genre==="file"){b(ix+0.08,iy+0.055,0.13,0.19);}
    else{b(ix+0.05,iy+0.08,0.19,0.14,"roundRect");b(ix+0.185,iy+0.125,0.05,0.05,"ellipse");}
    sl.addText(val,{x:xx+0.16,y:y+0.42,w:w-0.3,h:0.35,fontSize:15.5,bold:true,
      color:RP.NAVY,fontFace:"Arial"});
    let bx=xx+0.16;
    if(pilule){
      const fonds={up:"E7F4EE",down:"FDECEB",neutre:"EEF1F5"};
      const encres={up:"0F6B3C",down:"A3271B",neutre:"6B7280"};
      const pref={up:"▲ ",down:"▼ ",neutre:""}[ton||"neutre"];
      const lp=0.3+0.09*(pref+pilule).length;
      sl.addShape("roundRect",{x:bx,y:y+0.82,w:lp,h:0.24,rectRadius:0.12,
        fill:{color:fonds[ton||"neutre"]}});
      sl.addText(pref+pilule,{x:bx,y:y+0.815,w:lp,h:0.25,align:"center",fontSize:7.5,
        bold:true,color:encres[ton||"neutre"],fontFace:"Arial",margin:0});
      bx+=lp+0.08;
    }
    if(sub) sl.addText(sub,{x:bx,y:y+0.845,w:xx+w-bx-0.1,h:0.22,fontSize:8.5,
      color:RP.G_CLAIR,fontFace:"Arial"});
  });
  return y+h;
}
function rpInfos(){return (typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.infos)||{};}
const RP_RUBRIQUE_INFO={
  "Historique et actionnariat":"actionnariat",
  "Activités et offre":"description",
  "Organisation et effectifs":"effectif",
  "Marché et positionnement":"marche",
  "Description du projet et du promoteur":"description",
  "Structure juridique et actionnariat":"actionnariat",
  "Motivations et objectifs du financement":"contexteMission"};
/* rubriques composées : combiner plusieurs champs de la fiche */
function rpTexteRubrique(r,I){
  if(r==="Activités et offre")
    return [I.description,I.services].filter(Boolean).join(" ")||null;
  if(r==="Organisation et effectifs")
    return [I.dirigeant,I.effectif?I.effectif:null].filter(Boolean).join(" — ")||null;
  const cle=RP_RUBRIQUE_INFO[r];
  return (cle&&I[cle])?I[cle]:null;
}
function rpPlaceholder(pptx, societe, section, titreS, rubriques, mention, page){
  const sl=pptx.addSlide();
  rpEnTete(sl,societe,section); rpTitre(sl,titreS);
  const I=rpInfos();
  let y=1.62;
  const idBits=[I.secteur,I.formeJuridique,I.creation?("créée en "+I.creation):null,
    I.effectif,I.adresse].filter(Boolean);
  if(idBits.length){
    sl.addText(idBits.join("  ·  "),{x:0.8,y:y,w:11.9,h:0.3,fontSize:11.5,bold:true,
      color:RP.NAVY,fontFace:"Arial"});
    y+=0.46;
  }
  /* deux colonnes, hauteur estimée d'après le texte, jamais au-delà du pied de page */
  const yTop=y, yMax=6.55;
  const cols=[{x:0.8,w:5.75},{x:6.95,w:5.75}];
  let col=0;y=yTop;
  const lignesDe=(txt,w)=>{
    const cpl=Math.max(20,Math.floor(w*16.5));   /* ~16,5 caractères par pouce en Arial 10,5 */
    let n=0;
    String(txt).split(/\n/).forEach(seg=>{n+=Math.max(1,Math.ceil(seg.length/cpl));});
    return n;
  };
  /* préparer les blocs puis les répartir équitablement sur les deux colonnes */
  const cpl=Math.max(20,Math.floor(cols[0].w*16.5));
  const blocs=rubriques.map(r=>{
    let txt=rpTexteRubrique(r,I);
    const estPh=!txt;
    if(estPh)txt="[À COMPLÉTER par l'analyste]";
    let nl=lignesDe(txt,cols[0].w);
    if(nl>9){txt=String(txt).slice(0,9*cpl-2)+"…";nl=9;}
    const hTxt=0.06+nl*0.185;
    return {r,txt,estPh,hTxt,h:0.32+hTxt+0.18};
  });
  const hTot=blocs.reduce((t,b)=>t+b.h,0);
  let cumule=0;
  blocs.forEach(b=>{
    if(col===0&&(cumule>=hTot/2||y+b.h>yMax)){col=1;y=yTop;}
    if(col===1&&y+b.h>yMax)return;
    sl.addText(b.r,{x:cols[col].x,y:y,w:cols[col].w,h:0.28,fontSize:12.5,bold:true,
      color:RP.NAVY,fontFace:"Arial"});
    sl.addText(b.txt,{x:cols[col].x,y:y+0.3,w:cols[col].w,h:b.hTxt,fontSize:10.5,
      italic:b.estPh,color:b.estPh?RP.G_TXT:"333333",fontFace:"Arial",valign:"top"});
    y+=b.h;cumule+=b.h;
  });
  rpPied(sl,mention,page);
}
function rpContacts(pptx, cabinet, mention, page){
  const sl=pptx.addSlide();
  sl.addShape("rect",{x:0,y:0,w:13.333,h:2.3,fill:{color:RP.NAVY}});
  sl.addShape("rect",{x:0.72,y:0.62,w:1.7,h:0.045,fill:{color:RP.ORANGE}});
  sl.addText("Contacts",{x:0.7,y:0.85,w:8.5,h:0.65,fontSize:28,bold:true,color:RP.BLANC,fontFace:"Arial"});
  sl.addText("Vos interlocuteurs restent à votre disposition pour toute question relative à ce rapport.",
    {x:0.7,y:1.55,w:11.0,h:0.35,fontSize:11.5,italic:true,color:"9FB0D6",fontFace:"Arial"});
  sl.addImage({data:LOGO_FINDALYX,x:10.9,y:0.72,h:0.42,w:0.42*4.45});
  sl.addShape("rect",{x:0.7,y:2.9,w:3.95,h:2.5,fill:{color:RP.BLANC},line:{color:RP.FILET,width:1}});
  sl.addShape("rect",{x:0.95,y:3.18,w:0.5,h:0.04,fill:{color:RP.ORANGE}});
  sl.addText("Salif Sawadogo",{x:0.95,y:3.32,w:3.45,h:0.35,fontSize:14,bold:true,color:RP.NAVY,fontFace:"Arial"});
  sl.addText("Financial Advisory — "+cabinet,{x:0.95,y:3.7,w:3.45,h:0.3,fontSize:10.5,color:RP.G_TITRE,fontFace:"Arial"});
  sl.addText("sawadgsalif@gmail.com",{x:0.95,y:4.13,w:3.45,h:0.28,fontSize:10.5,color:RP.BLEU,fontFace:"Arial"});
  sl.addText("[Téléphone à compléter]",{x:0.95,y:4.43,w:3.45,h:0.28,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  sl.addText("Dakar, Sénégal",{x:0.95,y:4.73,w:3.45,h:0.28,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  sl.addText("Findalyx — conseil financier : due diligence, business plans, évaluations d'entreprises et modélisation financière dans l'espace OHADA.",
    {x:0.7,y:5.8,w:11.9,h:0.5,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  rpPied(sl,mention,page);
}

/* ---------- utilitaires de contenu ---------- */
function rpLignesFin(vals, codes, annees, libs, cfg){
  const n=annees.length;
  const fy=annees.map(a=>"FY"+String(a).slice(-2));
  const deltas=annees.slice(1).map((a,i)=>"Δ"+String(annees[i]).slice(-2)+"-"+String(a).slice(-2));
  const entetes=[rpLib(),...fy,...deltas,...(n>2?["CAGR"]:[])];
  const colsDelta=new Set(Array.from({length:entetes.length-1-n},(_,k)=>1+n+k));
  const lignes=[],styles=[];
  const ca=vals.CA;
  codes.forEach(code=>{
    if(!(code in vals)||annees.every(a=>Math.abs(vals[code][a])<0.5))return;
    const v=annees.map(a=>vals[code][a]);
    const row=[libs[code]||code,...v.map(rpFmt)];
    annees.slice(1).forEach((a,i)=>row.push(v[i]?rpPct(v[i+1]/v[i]-1):"-"));
    if(n>2)row.push(v[0]>0&&v[n-1]>0?rpPct(Math.pow(v[n-1]/v[0],1/(n-1))-1):"-");
    lignes.push(row);styles.push(cfg[code]||"detail");
    if(cfg.pctApres&&cfg.pctApres.has(code)&&ca){
      lignes.push(["% "+(libs[code]||code)+"/CA",
        ...annees.map(a=>ca[a]?Math.round(vals[code][a]/ca[a]*100)+"%":"-"),
        ...Array(entetes.length-1-n).fill("")]);
      styles.push("pct");
    }
  });
  const largeurs=[2.6,...Array(n).fill(1.05),...Array(entetes.length-1-n).fill(0.72)];
  return {entetes,lignes,styles,colsDelta,largeurs};
}
const RP_LIBS={CA:"Chiffre d'affaires",COUTS_DIRECTS:"Coûts directs",MARGE_BRUTE:"Marge brute",
  AUTRES_PROD:"Subventions et autres produits",OPEX:"Frais généraux",
  CHARGES_PERSONNEL:"Charges de personnel",EBITDA:"EBITDA",DA:"Amortissements et provisions",
  EBIT:"EBIT",RESULTAT_FIN:"Résultat financier",RESULTAT_HAO:"Résultat HAO",
  IMPOTS:"Impôt sur le résultat",RESULTAT_NET:"Résultat net",
  ACTIFS_IMMOBILISES:"Actifs immobilisés",STOCKS:"Stocks",CLIENTS:"Créances clients",
  AUTRES_CREANCES:"Autres créances",FOURNISSEURS:"Dettes fournisseurs",
  DETTES_FISCALES:"Dettes fiscales",DETTES_SOCIALES:"Dettes sociales",
  AUTRES_DETTES:"Autres dettes",BFR:"Besoin en fonds de roulement",
  TRESORERIE_NETTE:"Trésorerie nette",PROVISIONS_RC:"Provisions pour risques et charges",
  DETTES_FINANCIERES:"Dettes financières",ACTIF_NET:"Actif net",CAPITAUX_PROPRES:"Capitaux propres"};

function rpBase(){
  const A=ETATS.annees,v=ETATS.v;
  const a1=A[A.length-1],a0=A[0],ca1=v.CA[a1];
  const fy=A.map(a=>"FY"+String(a).slice(-2));
  const dateTxt=new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  return {A,v,a1,a0,ca1,fy,dateTxt,societe:DOSSIER.societe,cabinet:"Findalyx"};
}
function rpPilule(v,code,a0p,a1){
  if(!a0p||!v[code][a0p])return [null,"neutre"];
  const d=v[code][a1]/v[code][a0p]-1;
  if(!isFinite(d)||Math.abs(d)>9.99)return [null,"neutre"];
  return [Math.round(Math.abs(d*100))+"%",d>=0?"up":"down"];
}

/* ---------- RAPPORT DD ---------- */
function construireDD(pptx){
  const B=rpBase();
  const {A,v,a1,a0,ca1,fy}=B;
  const mention=B.societe+" - Due diligence financière - "+B.dateTxt+" - Confidentiel";
  let page=1;
  rpGarde(pptx,B.societe,"Due diligence financière — Rapport provisoire",
    "Exercices "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt);
  /* exec summary */
  rpSection(pptx,1,"Executive summary",["Aspects financiers"],mention,++page);
  let sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Executive summary");
  rpTitre(sl,"Synthèse des constats financiers");
  const n=A.length;
  const tcam=(n>1&&v.CA[a0]>0&&ca1>0)?Math.pow(ca1/v.CA[a0],1/(n-1))-1:null;
  rpAssertion(sl,"Le chiffre d'affaires "+fy[fy.length-1]+" s'établit à "+rpFmt(ca1)+
    " "+rpLib()+""+(tcam!==null?" (TCAM "+rpPct(tcam)+")":"")+" ; l'EBITDA ressort à "+
    rpFmt(v.EBITDA[a1])+" "+rpLib()+" et le résultat net à "+rpFmt(v.RESULTAT_NET[a1])+" "+rpLib()+".");
  const a0p=n>1?A[n-2]:null;
  const [pca,tca]=rpPilule(v,"CA",a0p,a1),[peb,teb]=rpPilule(v,"EBITDA",a0p,a1),
        [prn,trn]=rpPilule(v,"RESULTAT_NET",a0p,a1);
  rpCartes(sl,[
    ["Chiffre d'affaires "+fy[fy.length-1],rpFmt(ca1)+" K",
     tcam!==null?"TCAM "+rpPct(tcam):"",pca,tca,"chart","224289"],
    ["EBITDA "+fy[fy.length-1],rpFmt(v.EBITDA[a1])+" K",
     ca1?Math.round(v.EBITDA[a1]/ca1*100)+"% du CA":"",peb,teb,"coins","FA6706"],
    ["Résultat net "+fy[fy.length-1],rpFmt(v.RESULTAT_NET[a1])+" K",
     ca1?Math.round(v.RESULTAT_NET[a1]/ca1*100)+"% du CA":"",prn,trn,"file","172554"],
    ["Trésorerie nette",rpFmt(v.TRESORERIE_NETTE[a1])+" K",
     v.TRESORERIE_NETTE[a1]<0?"position négative":"",null,"neutre","wallet","16904E"],
  ]);
  const syn=rpLignesFin(v,["CA","MARGE_BRUTE","EBITDA","RESULTAT_NET","BFR","TRESORERIE_NETTE",
    "CAPITAUX_PROPRES"],A,RP_LIBS,{CA:"titre",EBITDA:"sous_total",RESULTAT_NET:"sous_total",
    CAPITAUX_PROPRES:"sous_total"});
  rpTable(sl,0.55,3.35,6.9,B.societe.toUpperCase()+" - Synthèse",syn.entetes,syn.lignes,
    syn.styles,syn.colsDelta,syn.largeurs,8.5,
    "Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  const puces=[];
  if(v.MARGE_BRUTE[a1]<0)puces.push(["Marge brute","La marge brute est négative sur le dernier exercice : la structure de coûts directs doit être investiguée en priorité."]);
  if(v.CAPITAUX_PROPRES[a1]<0)puces.push(["Capitaux propres","Les capitaux propres sont négatifs ; les impacts sur la continuité d'exploitation doivent être documentés."]);
  if(v.TRESORERIE_NETTE[a1]<0)puces.push(["Trésorerie nette","La trésorerie nette est négative ("+rpFmt(v.TRESORERIE_NETTE[a1])+" "+rpLib()+"), traduisant une dépendance aux concours bancaires."]);
  if(v.AUTRES_PROD[a1]>Math.abs(v.EBITDA[a1])*0.3&&v.AUTRES_PROD[a1]>0)
    puces.push(["Subventions","L'EBITDA est soutenu par "+rpFmt(v.AUTRES_PROD[a1])+" "+rpLib()+" de subventions et autres produits, dont la récurrence doit être appréciée."]);
  puces.push(["Travaux","Le détail des analyses figure dans les sections suivantes ainsi que dans les exports Excel de l'application."]);
  rpObservations(sl,7.65,3.35,5.15,puces);
  rpPied(sl,mention,++page);
  /* business overview */
  rpSection(pptx,2,"Business overview",["Présentation de la société","Structure organisationnelle"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Business overview","Présentation de la société",
    ["Historique et actionnariat","Activités et offre","Organisation et effectifs",
     "Marché et positionnement","Faits marquants de la période"],mention,++page);
  /* performances historiques */
  rpSection(pptx,3,"Due diligence financière",
    ["Performances historiques","Situation nette","Cash flows"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Due diligence financière");
  rpTitre(sl,"Synthèse des performances historiques");
  rpAssertion(sl,B.societe+" réalise un chiffre d'affaires de "+rpFmt(ca1)+" "+rpLib()+" en "+
    fy[fy.length-1]+" ; la marge brute représente "+(ca1?Math.round(v.MARGE_BRUTE[a1]/ca1*100):0)+
    "% du CA et l'EBITDA "+(ca1?Math.round(v.EBITDA[a1]/ca1*100):0)+"%.");
  const pl=rpLignesFin(v,["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","OPEX",
    "CHARGES_PERSONNEL","EBITDA","DA","EBIT","RESULTAT_FIN","RESULTAT_HAO","IMPOTS","RESULTAT_NET"],
    A,RP_LIBS,{CA:"titre",MARGE_BRUTE:"sous_total",EBITDA:"sous_total",EBIT:"sous_total",
    RESULTAT_NET:"sous_total",pctApres:new Set(["MARGE_BRUTE","EBITDA","RESULTAT_NET"])});
  rpTable(sl,0.55,1.95,7.5,B.societe.toUpperCase()+" - P&L",pl.entetes,pl.lignes,pl.styles,
    pl.colsDelta,pl.largeurs,8,"Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  rpObservations(sl,8.25,1.95,4.55,[
    ["Chiffre d'affaires","Le chiffre d'affaires évolue de "+rpFmt(v.CA[a0])+" "+rpLib()+" en "+fy[0]+
     " à "+rpFmt(ca1)+" "+rpLib()+" en "+fy[fy.length-1]+" ; le mix doit être analysé avec le management."],
    ["Frais généraux","Les frais généraux s'élèvent à "+rpFmt(-v.OPEX[a1])+" "+rpLib()+" ("+
     (ca1?Math.round(-v.OPEX[a1]/ca1*100):0)+"% du CA) ; leur détail figure dans l'application."],
    ["Charges de personnel","Les charges de personnel représentent "+rpFmt(-v.CHARGES_PERSONNEL[a1])+
     " "+rpLib()+" et doivent être rapprochées des effectifs."],
    ["EBITDA","Un EBITDA ajusté des éléments non récurrents devra être construit avec le management."],
  ]);
  rpPied(sl,mention,++page);
  /* situation nette */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Due diligence financière");
  rpTitre(sl,"Situation nette historique");
  rpAssertion(sl,"L'actif net s'établit à "+rpFmt(v.ACTIF_NET[a1])+" "+rpLib()+" à fin "+fy[fy.length-1]+
    ", strictement égal aux capitaux propres reconstitués.");
  const bs=rpLignesFin(v,["ACTIFS_IMMOBILISES","STOCKS","CLIENTS","AUTRES_CREANCES","FOURNISSEURS",
    "DETTES_FISCALES","DETTES_SOCIALES","AUTRES_DETTES","BFR","TRESORERIE_NETTE","PROVISIONS_RC",
    "DETTES_FINANCIERES","ACTIF_NET","CAPITAUX_PROPRES"],A,RP_LIBS,
    {ACTIFS_IMMOBILISES:"sous_total",BFR:"sous_total",TRESORERIE_NETTE:"sous_total",
     ACTIF_NET:"titre",CAPITAUX_PROPRES:"titre"});
  rpTable(sl,0.55,1.95,7.5,B.societe.toUpperCase()+" - Actif net",bs.entetes,bs.lignes,bs.styles,
    bs.colsDelta,bs.largeurs,8,"Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  const dso=ca1?Math.round(v.CLIENTS[a1]*360/(ca1*1.18)):0;
  rpObservations(sl,8.25,1.95,4.55,[
    ["BFR","Le BFR ressort à "+rpFmt(v.BFR[a1])+" "+rpLib()+", soit "+
     (ca1?Math.round(v.BFR[a1]*360/ca1):0)+" jours de CA."],
    ["Créances clients","Le DSO ressort à environ "+dso+" jours de CA TTC ; il doit être croisé avec la balance âgée."],
    ["Capitaux propres",v.CAPITAUX_PROPRES[a1]<0?
     "Les capitaux propres sont négatifs : la situation doit être redressée.":
     "La structure des capitaux propres doit être appréciée au regard de l'endettement financier."],
  ]);
  rpPied(sl,mention,++page);
  /* cash flows */
  if(A.length>1){
    sl=pptx.addSlide();
    rpEnTete(sl,B.societe,"Due diligence financière");
    rpTitre(sl,"Analyse des flux de trésorerie");
    rpAssertion(sl,"Le tableau de flux est reconstruit par variations bilancielles et se réconcilie exactement avec la trésorerie du bilan.");
    const defs=[["RN","Résultat net","detail"],["AMORT","+ Var. amortissements et dépréciations","detail"],
      ["PROV","+ Var. provisions","detail"],["DBFR","+/- Variation du BFR","detail"],
      ["OP","Flux opérationnels","sous_total"],["CAPEX","Investissements nets","detail"],
      ["FIN","Flux de financement","detail"],["FCF","Free cash flow","sous_total"],
      ["OUVERTURE","Trésorerie d'ouverture","detail"],["CLOTURE","Trésorerie de clôture","sous_total"]];
    const lignes=defs.map(([c,lib])=>[lib,...A.slice(1).map(a=>rpFmt(ETATS.tft[a][c]))]);
    rpTable(sl,0.55,1.95,6.9,B.societe.toUpperCase()+" - TFT",
      [rpLib(),...A.slice(1).map(a=>"FY"+String(a).slice(-2))],lignes,defs.map(d=>d[2]),
      new Set(),[3.2,...Array(A.length-1).fill(1.15)],8.5,
      "Source : reconstruction depuis les balances");
    rpObservations(sl,7.65,1.95,5.15,[
      ["Flux opérationnels","La contribution du BFR et la récurrence de la capacité d'autofinancement doivent être analysées sur la période."],
      ["Investissements","Les investissements reconstitués doivent être rapprochés du plan d'investissement de la société."],
    ]);
    rpPied(sl,mention,++page);
  }
  rpContacts(pptx,B.cabinet,mention,++page);
}

/* ---------- RAPPORT BP ---------- */
function construireBP(pptx){
  const B=rpBase();
  const {A,v,a1,fy}=B;
  const hyp=assurerBP();
  const proj=projeterBP(ETATS,hyp);
  const ap=proj.annees;
  const fyp=ap.map(a=>"FY"+String(a).slice(-2)+"p");
  const mention=B.societe+" - Business plan "+ap[0]+"-"+ap[ap.length-1]+" - "+B.dateTxt+" - Confidentiel";
  let page=1;
  rpGarde(pptx,B.societe,"Rapport provisoire de Business Plan "+ap[0]+" – "+ap[ap.length-1],
    "Historique "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt);
  rpSection(pptx,1,"Note de synthèse",["Résumé exécutif"],mention,++page);
  let sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Note de synthèse");
  rpTitre(sl,"Résumé exécutif");
  rpAssertion(sl,"Avec les hypothèses retenues, le chiffre d'affaires atteint "+
    rpFmt(proj.pl.CA[ap[ap.length-1]])+" "+rpLib()+" en "+fyp[fyp.length-1]+
    " et le résultat net "+rpFmt(proj.pl.RN[ap[ap.length-1]])+" "+rpLib()+".");
  rpCartes(sl,[
    ["CA "+fyp[fyp.length-1],rpFmt(proj.pl.CA[ap[ap.length-1]])+" K",
     "croissance "+rpPct(hyp.caCroiss[0])+"/an",null,"neutre","chart","224289"],
    ["EBITDA "+fyp[fyp.length-1],rpFmt(proj.pl.EBITDA[ap[ap.length-1]])+" K",
     proj.pl.CA[ap[ap.length-1]]?Math.round(proj.pl.EBITDA[ap[ap.length-1]]/proj.pl.CA[ap[ap.length-1]]*100)+"% du CA":"",
     null,"neutre","coins","FA6706"],
    ["Résultat net cumulé",rpFmt(ap.reduce((s,a)=>s+proj.pl.RN[a],0))+" K","sur l'horizon du plan",
     null,"neutre","file","172554"],
    ["Trésorerie fin "+fyp[fyp.length-1],rpFmt(proj.bs.TRESO_NETTE[ap[ap.length-1]])+" K",
     proj.bs.TRESO_NETTE[ap[ap.length-1]]<0?"position négative":"",null,
     proj.bs.TRESO_NETTE[ap[ap.length-1]]<0?"down":"up","wallet","16904E"],
  ]);
  const trj=["CA","EBITDA","RN"].map(c=>{
    const lib={CA:"Chiffre d'affaires",EBITDA:"EBITDA",RN:"Résultat net"}[c];
    const ch={CA:"CA",EBITDA:"EBITDA",RN:"RESULTAT_NET"}[c];
    return [lib,rpFmt(v[ch][a1]),...ap.map(a=>rpFmt(proj.pl[c][a]))];
  });
  trj.push(["Trésorerie nette",rpFmt(v.TRESORERIE_NETTE[a1]),...ap.map(a=>rpFmt(proj.bs.TRESO_NETTE[a]))]);
  rpTable(sl,0.55,3.35,6.9,B.societe.toUpperCase()+" - Trajectoire",
    [rpLib(),fy[fy.length-1]+" (réel)",...fyp],trj,
    ["titre","sous_total","sous_total","sous_total"],new Set(),
    [2.6,...Array(1+ap.length).fill(1.15)],8.5,
    "Source : projections Findalyx Advisory (hypothèses modifiables dans l'application)");
  rpObservations(sl,7.65,3.35,5.15,[
    ["Hypothèses","Le plan repose sur une croissance de "+rpPct(hyp.caCroiss[0])+
     " par an, des coûts directs à "+Math.round(hyp.coutsDirects_pct*100)+
     "% du CA et un BFR de "+Math.round(hyp.dso)+" jours de chiffre d'affaires."],
    ["Trésorerie","Le bilan projeté est bouclé par la trésorerie : la trajectoire mesure la capacité du plan à générer du cash."],
    ["À compléter","Les messages du management, la stratégie et le plan d'actions restent à intégrer."],
  ]);
  rpPied(sl,mention,++page);
  rpSection(pptx,2,"Présentation du projet et étude de marché",
    ["Structure du projet","Étude de marché"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Présentation du projet","Projet, structure et motivations",
    ["Description du projet et du promoteur","Structure juridique et actionnariat",
     "Motivations et objectifs du financement","Points d'attention"],mention,++page);
  /* hypothèses */
  rpSection(pptx,3,"Hypothèses",["Hypothèses opérationnelles et financières"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Hypothèses");
  rpTitre(sl,"Hypothèses opérationnelles et financières");
  rpAssertion(sl,"Les valeurs par défaut sont dérivées de l'historique "+fy[0]+" – "+
    fy[fy.length-1]+" et doivent être challengées avec le management.");
  const lignesH=[],stylesH=[];
  const pcH=x=>(x*100).toFixed(1).replace(".0","")+" %";
  const gH=(t,items)=>{lignesH.push([t,""]);stylesH.push("sous_total");
    items.forEach(([l,x])=>{lignesH.push([l,x]);stylesH.push("detail");});};
  gH("Activité et marges",[
    ["Croissance du CA par année",hyp.caCroiss.map(pcH).join(" ; ")],
    ["Coûts directs (% du CA)",pcH(hyp.coutsDirects_pct)],
    ["Croissance des charges de personnel",pcH(hyp.personnel_croiss)+"/an"],
    ["Taux d'IS effectif",pcH(hyp.is_taux)]]);
  gH("Besoin en fonds de roulement",[
    ["Délai clients (DSO)",Math.round(hyp.dso)+" j"],
    ["Rotation des stocks (DIO)",Math.round(hyp.dio)+" j"],
    ["Délai fournisseurs (DPO)",Math.round(hyp.dpo)+" j"]]);
  gH("Investissements et financement",[
    ["CAPEX par année",hyp.capex.map(x=>rpFmt(x)).join(" ; ")],
    ["Taux d'amortissement",pcH(hyp.amort_taux)],
    ["Nouveaux emprunts",hyp.nouveauxEmprunts.some(x=>x>0)?hyp.nouveauxEmprunts.map(x=>rpFmt(x)).join(" ; "):"aucun"],
    ["Dividendes (% du résultat N-1)",pcH(hyp.dividendes_payout)]]);
  gH("Coût du capital",[
    ["WACC",pcH((typeof val!=="undefined"&&val&&val.wacc)||(hyp.valo.rf+hyp.valo.beta*hyp.valo.primeMarche+hyp.valo.primeSpecifique)*(1-hyp.valo.poidsDette)+hyp.valo.coutDette*(1-hyp.is_taux)*hyp.valo.poidsDette)],
    ["Croissance à l'infini (g)",pcH(hyp.valo.g)]]);
  rpTable(sl,0.55,1.95,7.6,B.societe.toUpperCase()+" - Hypothèses",["Hypothèse","Valeur"],
    lignesH,stylesH,new Set(),[5.2,1.4],8);
  rpPied(sl,mention,++page);
  /* projections */
  rpSection(pptx,4,"Projections financières",["Compte de résultat","Bilan et trésorerie"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Projections financières");
  rpTitre(sl,"Compte de résultat prévisionnel");
  rpAssertion(sl,"L'EBITDA évolue de "+rpFmt(v.EBITDA[a1])+" "+rpLib()+" en "+fy[fy.length-1]+
    " à "+rpFmt(proj.pl.EBITDA[ap[ap.length-1]])+" "+rpLib()+" en "+fyp[fyp.length-1]+".");
  const codesP=[["CA","Chiffre d'affaires","titre"],["ACHATS","Coûts directs","detail"],
    ["MARGE_BRUTE","Marge brute","sous_total"],["AUTRES_PRODUITS","Autres produits","detail"],
    ["PERSONNEL","Charges de personnel","detail"],["AUTRES_OPEX","Frais généraux","detail"],
    ["EBITDA","EBITDA","sous_total"],["DOTATIONS","Dotations","detail"],
    ["EBIT","EBIT","sous_total"],["RESULTAT_FIN","Résultat financier","detail"],
    ["IS","Impôt sur les sociétés","detail"],["RN","Résultat net","sous_total"]];
  const histM={CA:"CA",ACHATS:"COUTS_DIRECTS",MARGE_BRUTE:"MARGE_BRUTE",AUTRES_PRODUITS:"AUTRES_PROD",
    PERSONNEL:"CHARGES_PERSONNEL",AUTRES_OPEX:"OPEX",EBITDA:"EBITDA",DOTATIONS:"DA",EBIT:"EBIT",
    RESULTAT_FIN:"RESULTAT_FIN",IS:"IMPOTS",RN:"RESULTAT_NET"};
  const lignesBP=codesP.map(([c,lib])=>[lib,...A.map(a=>rpFmt(v[histM[c]][a])),
    ...ap.map(a=>rpFmt(proj.pl[c][a]))]);
  rpTable(sl,0.55,1.95,12.25,B.societe.toUpperCase()+" - P&L prévisionnel",
    [rpLib(),...fy,...fyp],lignesBP,codesP.map(x=>x[2]),
    new Set(Array.from({length:A.length},(_,k)=>1+k)),
    [2.6,...Array(A.length+ap.length).fill(1.05)],8,
    "Colonnes bleutées : historique reconstitué ; autres : projections.");
  rpPied(sl,mention,++page);
  rpSection(pptx,5,"Annexes",["Sources","Modèle financier"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Annexes","Sources et documents de référence",
    ["Sources des données (balances importées)","Export Excel de l'application (hypothèses, plan, valorisation)",
     "Tableau d'amortissement du financement","Glossaire"],mention,++page);
  rpContacts(pptx,B.cabinet,mention,++page);
}

/* ---------- RAPPORT VALO ---------- */
function construireValo(pptx){
  const B=rpBase();
  const {A,v,a1,fy}=B;
  const hyp=assurerBP();
  const proj=projeterBP(ETATS,hyp);
  const val=valoriserBP(ETATS,hyp,proj);
  const ap=proj.annees;
  const fyp=ap.map(a=>"FY"+String(a).slice(-2)+"p");
  const mention=B.societe+" - Évaluation financière au 31/12/"+a1+" - Confidentiel";
  let page=1;
  rpGarde(pptx,B.societe,"Rapport provisoire d'évaluation financière au 31/12/"+a1,
    "Historique "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt);
  rpSection(pptx,1,"Note de synthèse",["Méthodes d'évaluation","Fourchette de valorisation"],mention,++page);
  let sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Note de synthèse");
  rpTitre(sl,"Fourchette d'évaluation au 31/12/"+a1);
  rpAssertion(sl,"La valeur des fonds propres ressort à "+rpFmt(val.equityDcf)+
    " "+rpLib()+" par le DCF (WACC "+rpPct(val.wacc)+", g "+rpPct(val.g)+") et à "+
    rpFmt(val.equityMult)+" "+rpLib()+" par les multiples ("+val.multiple.toFixed(1)+"x EBITDA).");
  rpCartes(sl,[
    ["Fonds propres — DCF",rpFmt(val.equityDcf)+" K","WACC "+rpPct(val.wacc)+", g "+rpPct(val.g),
     null,"neutre","coins","FA6706"],
    ["Fonds propres — multiples",rpFmt(val.equityMult)+" K","EV/EBITDA "+val.multiple.toFixed(1)+"x",
     null,"neutre","chart","224289"],
    ["Fourchette basse",rpFmt(val.eqMin)+" K","sensibilité WACC/g",null,"neutre","file","172554"],
    ["Fourchette haute",rpFmt(val.eqMax)+" K","sensibilité WACC/g",null,"neutre","wallet","16904E"],
  ]);
  const brg=[["Somme des FCFF actualisés",rpFmt(val.sommePv)],
    ["Valeur terminale actualisée",rpFmt(val.vtPv)],
    ["Valeur d'entreprise (EV)",rpFmt(val.ev)],
    ["(-) Dette nette au 31/12/"+a1,rpFmt(-val.detteNette)],
    ["Valeur des fonds propres (DCF)",rpFmt(val.equityDcf)],
    ["Valeur des fonds propres (multiples)",rpFmt(val.equityMult)]];
  rpTable(sl,0.55,3.35,6.9,B.societe.toUpperCase()+" - Synthèse de valorisation",
    [rpLib(),"Valeur"],brg,["detail","detail","sous_total","detail","sous_total","sous_total"],
    new Set(),[4.4,1.8],9,"Source : DCF et multiples sur projections Findalyx Advisory");
  rpObservations(sl,7.65,3.35,5.15,[
    ["Méthodes","La valorisation repose sur un DCF des flux pour l'entreprise avec valeur terminale de Gordon, contrôlé par une approche par multiples d'EBITDA."],
    ["Sensibilité","La fourchette est obtenue en faisant varier le WACC de ±1 point et g de ±0,5 point."],
    ["À compléter","L'appréciation de l'évaluateur, les actifs hors exploitation et les passifs éventuels restent à intégrer."],
  ]);
  rpPied(sl,mention,++page);
  /* DCF détaillé */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Valorisation financière");
  rpTitre(sl,"Actualisation des flux de trésorerie (DCF)");
  rpAssertion(sl,"La valeur d'entreprise ressort à "+rpFmt(val.ev)+" "+rpLib()+", dont "+
    rpFmt(val.vtPv)+" "+rpLib()+" de valeur terminale actualisée ("+
    (val.ev?Math.round(val.vtPv/val.ev*100):0)+"% de l'EV).");
  const fcf=[["FCFF",...ap.map(a=>rpFmt(val.fcff[a]))],
             ["FCFF actualisés (WACC "+rpPct(val.wacc)+")",...ap.map(a=>rpFmt(val.pv[a]))]];
  rpTable(sl,0.55,1.95,12.25,B.societe.toUpperCase()+" - Flux actualisés",
    [rpLib(),...fyp],fcf,["detail","detail"],new Set(),
    [3.2,...Array(ap.length).fill(1.2)],9);
  const proj4=[["Chiffre d'affaires",...ap.map(a=>rpFmt(proj.pl.CA[a]))],
    ["EBITDA",...ap.map(a=>rpFmt(proj.pl.EBITDA[a]))],
    ["Résultat net",...ap.map(a=>rpFmt(proj.pl.RN[a]))]];
  rpTable(sl,0.55,3.6,12.25,"Projections sous-jacentes "+ap[0]+" - "+ap[ap.length-1],
    [rpLib(),...fyp],proj4,["titre","sous_total","sous_total"],new Set(),
    [3.2,...Array(ap.length).fill(1.2)],9);
  rpObservations(sl,0.55,5.15,12.25,[
    ["WACC","Le taux d'actualisation doit être calé sur la structure financière cible, le bêta sectoriel et la prime de risque pays."],
    ["Dette nette","La dette nette doit être ajustée des provisions, engagements hors bilan et actifs excédentaires."],
  ]);
  rpPied(sl,mention,++page);
  rpSection(pptx,2,"Risques",["Risques majeurs et couverture"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Risques","Risques majeurs et couverture",
    ["Risques de marché et de concurrence","Risques opérationnels",
     "Risques financiers (change, taux, liquidité)","Risques juridiques et fiscaux"],mention,++page);
  rpContacts(pptx,B.cabinet,mention,++page);
}

/* ---------- point d'entrée ---------- */
async function genererRapport(type){
  if(!ETATS){toast("Importez d'abord des balances");return;}
  if(typeof PptxGenJS==="undefined"){toast("Bibliothèque PowerPoint non chargée (connexion requise)");return;}
  toast("Génération du rapport en cours…");
  const pptx=new PptxGenJS();
  pptx.defineLayout({name:"LARGE",width:13.333,height:7.5});
  pptx.layout="LARGE";
  if(type==="dd")construireDD(pptx);
  else if(type==="bp")construireBP(pptx);
  else construireValo(pptx);
  const noms={dd:"Rapport_DD_",bp:"Rapport_BP_",valo:"Rapport_VALO_"};
  await pptx.writeFile({fileName:noms[type]+DOSSIER.societe.replace(/\W+/g,"_")+".pptx"});
  toast("Rapport téléchargé");
}
