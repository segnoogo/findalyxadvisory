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
  {const _lg=logoCab();sl.addImage(_lg?{data:_lg.data,x:0.55,y:7.09,h:0.24,w:0.24*_lg.ratio}:{data:LOGO_FINDALYX_CLAIR,x:0.55,y:7.09,h:0.24,w:0.24*4.45});}
  sl.addText(mention,{x:2.6,y:7.1,w:8.2,h:0.25,align:"center",fontSize:8,
    color:RP.G_CLAIR,fontFace:"Arial"});
  sl.addText(String(page),{x:12.2,y:7.1,w:0.58,h:0.25,align:"right",fontSize:9,
    color:RP.G_TXT,fontFace:"Arial"});
}
function rpGarde(pptx, societe, titreR, sousTitre, dateTxt, cabinet){
  const sl=pptx.addSlide();
  {const _lg=logoCab();sl.addImage(_lg?{data:_lg.data,x:0.7,y:0.7,h:0.5,w:0.5*_lg.ratio}:{data:LOGO_FINDALYX_CLAIR,x:0.7,y:0.7,h:0.5,w:0.5*4.45});}
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
  {const _lg=logoCab();sl.addImage(_lg?{data:_lg.data,x:10.9,y:0.72,h:0.42,w:0.42*_lg.ratio}:{data:LOGO_FINDALYX,x:10.9,y:0.72,h:0.42,w:0.42*4.45});}
  sl.addShape("rect",{x:0.7,y:2.9,w:3.95,h:2.5,fill:{color:RP.BLANC},line:{color:RP.FILET,width:1}});
  sl.addShape("rect",{x:0.95,y:3.18,w:0.5,h:0.04,fill:{color:RP.ORANGE}});
  const cab=chargerCabinet();
  sl.addText(cab.analyste||cabinet||"Analyste",{x:0.95,y:3.32,w:3.45,h:0.35,fontSize:14,bold:true,color:RP.NAVY,fontFace:"Arial"});
  sl.addText("Financial Advisory — "+cabinet,{x:0.95,y:3.7,w:3.45,h:0.3,fontSize:10.5,color:RP.G_TITRE,fontFace:"Arial"});
  if(cab.email)sl.addText(cab.email,{x:0.95,y:4.13,w:3.45,h:0.28,fontSize:10.5,color:RP.BLEU,fontFace:"Arial"});
  if(cab.telephone)sl.addText(cab.telephone,{x:0.95,y:4.43,w:3.45,h:0.28,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  if(cab.adresse)sl.addText(cab.adresse,{x:0.95,y:4.73,w:3.45,h:0.28,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  sl.addText(cabinet+" — conseil financier : due diligence, business plans, évaluations d'entreprises et modélisation financière dans l'espace OHADA.",
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
  return {A,v,a1,a0,ca1,fy,dateTxt,societe:DOSSIER.societe,cabinet:cabinetExport()||"Findalyx Advisory"};
}
function rpPilule(v,code,a0p,a1){
  if(!a0p||!v[code][a0p])return [null,"neutre"];
  const d=v[code][a1]/v[code][a0p]-1;
  if(!isFinite(d)||Math.abs(d)>9.99)return [null,"neutre"];
  return [Math.round(Math.abs(d*100))+"%",d>=0?"up":"down"];
}

/* ---------- graphiques natifs (PptxGenJS) + contenus enrichis ---------- */
const RP_SERIE=["224289","FA6706","16904E","172554","B45309","6B7280"];
const rq=(x)=>Math.round((x||0)*rpU().f);            /* valeur en unité d'affichage (graphiques) */
const rpPctCA=(x,ca)=>ca?Math.round(x/ca*100)+"%":"-";
const rpPctN=(x,ca)=>ca?Math.round(x/ca*100):null;   /* pourcentage numérique (graphiques) */
function rpTitreG(sl,txt,x,y,w){sl.addText(txt,{x:x,y:y,w:w,h:0.26,fontSize:10,bold:true,color:RP.BLEU,charSpacing:1,fontFace:"Arial"});}
function rpAxeG(){return {catAxisLabelColor:RP.G_TXT,catAxisLabelFontSize:8,catAxisLabelFontFace:"Arial",
  valAxisLabelColor:RP.G_CLAIR,valAxisLabelFontSize:8,valAxisLabelFontFace:"Arial",
  valGridLine:{style:"none"},showTitle:false};}
function rpGraphBarres(sl,x,y,w,h,titre,labels,series,opts){
  opts=opts||{};rpTitreG(sl,titre,x,y,w);
  sl.addChart("bar",series.map(s=>({name:s.name,labels:labels,values:s.values})),Object.assign({
    x:x,y:y+0.32,w:w,h:h-0.32,barDir:"col",barGapWidthPct:45,
    chartColors:series.map((s,i)=>s.color||RP_SERIE[i%RP_SERIE.length]),
    showLegend:series.length>1,legendPos:"b",legendFontSize:8,legendColor:RP.G_TXT,legendFontFace:"Arial",
    showValue:opts.showValue!==false,dataLabelColor:RP.G_TITRE,dataLabelFontSize:7.5,dataLabelFontFace:"Arial",
    dataLabelPosition:"outEnd",dataLabelFormatCode:opts.fmt||"#,##0"},rpAxeG()));
}
function rpGraphLignes(sl,x,y,w,h,titre,labels,series,opts){
  opts=opts||{};rpTitreG(sl,titre,x,y,w);
  sl.addChart("line",series.map(s=>({name:s.name,labels:labels,values:s.values})),Object.assign({
    x:x,y:y+0.32,w:w,h:h-0.32,lineSize:2.25,lineSmooth:false,
    chartColors:series.map((s,i)=>s.color||RP_SERIE[i%RP_SERIE.length]),
    showLegend:series.length>1,legendPos:"b",legendFontSize:8,legendColor:RP.G_TXT,legendFontFace:"Arial",
    showValue:opts.showValue!==false,dataLabelColor:RP.G_TITRE,dataLabelFontSize:7.5,dataLabelFontFace:"Arial",
    dataLabelPosition:"t",dataLabelFormatCode:opts.fmt||'0"%"'},rpAxeG()));
}
function rpGraphAnneau(sl,x,y,w,h,titre,labels,values,colors){
  rpTitreG(sl,titre,x,y,w);
  sl.addChart("doughnut",[{name:titre,labels:labels,values:values}],{
    x:x,y:y+0.32,w:w,h:h-0.32,holeSize:58,chartColors:colors||RP_SERIE,
    showLegend:true,legendPos:"r",legendFontSize:8.5,legendColor:RP.G_TXT,legendFontFace:"Arial",
    showValue:false,showPercent:true,dataLabelColor:RP.BLANC,dataLabelFontSize:8.5,dataLabelFontFace:"Arial",
    showTitle:false});
}
function rpCadreComment(sl,x,y,w,h){
  sl.addText("COMMENTAIRES",{x:x,y:y,w:w,h:0.26,fontSize:9.5,bold:true,color:RP.BLEU,charSpacing:2,fontFace:"Arial"});
  sl.addShape("roundRect",{x:x,y:y+0.32,w:w,h:Math.max(0.5,h-0.32),rectRadius:0.02,fill:{color:"FBFCFE"},line:{color:RP.FILET,width:1}});
  sl.addText("Zone réservée aux commentaires de l'analyste.",{x:x+0.16,y:y+0.46,w:w-0.32,h:0.3,fontSize:9,italic:true,color:RP.G_CLAIR,fontFace:"Arial",valign:"top"});
}
function rpPreambule(pptx,B,mention,page,ctx,base){
  const sl=pptx.addSlide();rpEnTete(sl,B.societe,"Préambule");rpTitre(sl,"Préambule et périmètre d'intervention");
  const fy=B.fy;
  const blocs=[
    ["Contexte de la mission",ctx||("Le présent rapport restitue les constats issus de la revue financière de "+B.societe+" sur les exercices "+fy[0]+" à "+fy[fy.length-1]+". Il constitue un support de discussion préalable aux échanges avec le management, et n'a pas vocation à être diffusé hors de ce cadre.")],
    ["Base de travail",base||"Les analyses sont établies à partir des balances générales importées, retraitées selon le référentiel SYSCOHADA. Les agrégats (marge brute, EBITDA, BFR, flux de trésorerie, ratios) sont reconstitués automatiquement et réconciliés avec le bilan."],
    ["Périmètre et limites","Nos travaux ne constituent ni un audit ni une revue limitée au sens des normes d'exercice professionnel. Les données n'ont pas fait l'objet de vérifications indépendantes : les constats doivent être confirmés avec le management et les pièces justificatives."],
    ["Unité de présentation","Sauf mention contraire, les montants sont exprimés en "+rpLib()+". Les variations annuelles et le taux de croissance annuel moyen (TCAM) figurent dans les tableaux."]];
  let y=1.68;
  blocs.forEach(bl=>{
    sl.addShape("rect",{x:0.55,y:y+0.04,w:0.06,h:0.55,fill:{color:RP.ORANGE}});
    sl.addText(bl[0],{x:0.82,y:y,w:11.7,h:0.3,fontSize:13,bold:true,color:RP.NAVY,fontFace:"Arial"});
    sl.addText(bl[1],{x:0.82,y:y+0.32,w:11.7,h:0.78,fontSize:10.5,color:"333333",fontFace:"Arial",valign:"top"});
    y+=1.3;
  });
  rpPied(sl,mention,page);
}
function rpGlossaire(pptx,B,mention,page){
  const sl=pptx.addSlide();rpEnTete(sl,B.societe,"Annexes");rpTitre(sl,"Glossaire");
  rpAssertion(sl,"Principaux sigles et indicateurs utilisés dans le présent rapport.");
  const G=[["BFR","Besoin en fonds de roulement"],["CAFG","Capacité d'autofinancement globale"],
    ["CAGR / TCAM","Taux de croissance annuel moyen"],["CMPC / WACC","Coût moyen pondéré du capital"],
    ["DSO","Délai moyen de recouvrement des créances clients (jours)"],
    ["DPO","Délai moyen de règlement des fournisseurs (jours)"],
    ["EBE","Excédent brut d'exploitation"],["EBIT","Résultat d'exploitation (avant intérêts et impôts)"],
    ["EBITDA","Résultat avant intérêts, impôts, dotations aux amortissements et provisions"],
    ["HAO","Hors activités ordinaires"],["RAO","Résultat des activités ordinaires"],
    ["ROA","Rentabilité de l'actif (résultat net / total actif)"],
    ["ROE","Rentabilité des capitaux propres"],["ROCE","Rentabilité des capitaux employés"],
    ["TFT","Tableau des flux de trésorerie"],["VAN / TRI","Valeur actuelle nette / Taux de rendement interne"]];
  const mid=Math.ceil(G.length/2);
  const mk=sub=>sub.map(g=>[{text:g[0],options:{bold:true,color:RP.NAVY,fontSize:9,fontFace:"Arial",valign:"top"}},
    {text:g[1],options:{color:RP.G_TITRE,fontSize:9,fontFace:"Arial",valign:"top"}}]);
  sl.addTable(mk(G.slice(0,mid)),{x:0.55,y:2.0,w:6.0,colW:[1.5,4.5],border:{type:"none"},rowH:0.32,margin:0.02});
  sl.addTable(mk(G.slice(mid)),{x:6.95,y:2.0,w:6.0,colW:[1.5,4.5],border:{type:"none"},rowH:0.32,margin:0.02});
  rpPied(sl,mention,page);
}
function rpLexique(pptx,B,mention,page){
  const sl=pptx.addSlide();rpEnTete(sl,B.societe,"Annexes");rpTitre(sl,"Lexique financier");
  const L=[["EBITDA","Mesure la performance opérationnelle avant politique d'amortissement et de financement ; proxy de la génération de trésorerie d'exploitation."],
    ["Besoin en fonds de roulement (BFR)","Trésorerie immobilisée par le cycle d'exploitation (stocks + créances − dettes d'exploitation) ; un BFR élevé pèse sur la trésorerie."],
    ["DSO / DPO","Délais moyens d'encaissement des clients et de paiement des fournisseurs, exprimés en jours de chiffre d'affaires."],
    ["Gearing / Leverage","Niveau d'endettement rapporté aux capitaux propres (gearing) ou à l'EBITDA (leverage) ; mesurent la solvabilité et la soutenabilité de la dette."],
    ["Autonomie financière","Part des capitaux propres dans le total du bilan ; traduit l'indépendance vis-à-vis des créanciers."],
    ["Couverture des intérêts","Capacité de l'EBITDA à couvrir les frais financiers ; en-dessous de 2×, la charge de la dette devient un point d'attention."]];
  let y=1.7;
  L.forEach(l=>{
    sl.addText(l[0],{x:0.6,y:y,w:12.2,h:0.28,fontSize:12,bold:true,color:RP.NAVY,fontFace:"Arial"});
    sl.addText(l[1],{x:0.6,y:y+0.29,w:12.2,h:0.5,fontSize:10.5,color:"333333",fontFace:"Arial",valign:"top"});
    y+=0.86;
  });
  rpPied(sl,mention,page);
}
function rpSlideRatios(pptx,B,mention,page){
  const {A,v,fy}=B;
  if(typeof calculerRatios!=="function")return;
  const R=calculerRatios(ETATS);
  const sl=pptx.addSlide();rpEnTete(sl,B.societe,"Analyse financière");rpTitre(sl,"Ratios financiers clés");
  rpAssertion(sl,"Score de santé financière : "+R.score+"/100 — "+R.nbGood+" indicateur(s) solide(s), "+R.nbWarn+" à surveiller, "+R.nbBad+" fragile(s).");
  const fmtR=(r,a)=>{const val=r.vals[a];if(val===null||val===undefined)return "-";
    return r.unit==="%"?Math.round(val)+"%":(r.unit==="j"?Math.round(val)+" j":val.toFixed(1)+"×");};
  const app={good:"Solide",warn:"À surveiller",bad:"Fragile"};
  const cats=[["rentabilite","Rentabilité"],["liquidite","Liquidité & BFR"],["endettement","Structure financière"]];
  const lignes=[],styles=[];
  cats.forEach(c=>{
    const rs=R.ratios.filter(r=>r.cat===c[0]);if(!rs.length)return;
    lignes.push([c[1],...A.map(()=>""),""]);styles.push("titre");
    rs.forEach(r=>{lignes.push([r.lab,...A.map(a=>fmtR(r,a)),r.statut?app[r.statut]:"—"]);styles.push("detail");});
  });
  rpTable(sl,0.55,2.0,8.5,B.societe.toUpperCase()+" - Ratios",
    ["Indicateur",...fy,"Appréciation"],lignes,styles,new Set(),
    [3.5,...A.map(()=>0.85),1.45],8,"Seuils indicatifs ; à apprécier au regard du secteur d'activité.");
  rpCadreComment(sl,9.35,2.0,3.45,4.7);
  rpPied(sl,mention,page);
}

/* ---------- RAPPORT DD ---------- */
function construireDD(pptx){
  const B=rpBase();
  const {A,v,a1,a0,ca1,fy}=B;
  const mention=B.societe+" - Due diligence financière - "+B.dateTxt+" - Confidentiel";
  let page=1;
  rpGarde(pptx,B.societe,"Due diligence financière — Rapport provisoire",
    "Exercices "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt,B.cabinet);
  rpPreambule(pptx,B,mention,++page);
  /* exec summary */
  rpSection(pptx,1,"Executive summary",["Synthèse des constats et chiffres clés"],mention,++page);
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
  rpGraphBarres(sl,7.55,3.15,5.25,3.55,"Évolution CA · EBITDA · Résultat net ("+rpLib()+")",fy,[
    {name:"CA",values:A.map(a=>rq(v.CA[a]))},
    {name:"EBITDA",values:A.map(a=>rq(v.EBITDA[a]))},
    {name:"Résultat net",values:A.map(a=>rq(v.RESULTAT_NET[a]))}],{fmt:"#,##0"});
  rpPied(sl,mention,++page);
  /* business overview */
  rpSection(pptx,2,"Business overview",["Présentation de la société","Structure organisationnelle"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Business overview","Présentation de la société",
    ["Historique et actionnariat","Activités et offre","Organisation et effectifs",
     "Marché et positionnement","Faits marquants de la période"],mention,++page);
  /* performances historiques */
  rpSection(pptx,3,"Analyse financière",
    ["Compte de résultat","Marge et structure de coûts","Situation nette","BFR et délais","Flux de trésorerie","Ratios clés"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Due diligence financière");
  rpTitre(sl,"Compte de résultat");
  rpAssertion(sl,B.societe+" réalise un chiffre d'affaires de "+rpFmt(ca1)+" "+rpLib()+" en "+fy[fy.length-1]+(tcam!==null?" (TCAM "+rpPct(tcam)+")":"")+".");
  const pl=rpLignesFin(v,["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","OPEX",
    "CHARGES_PERSONNEL","EBITDA","DA","EBIT","RESULTAT_FIN","RESULTAT_HAO","IMPOTS","RESULTAT_NET"],
    A,RP_LIBS,{CA:"titre",MARGE_BRUTE:"sous_total",EBITDA:"sous_total",EBIT:"sous_total",
    RESULTAT_NET:"sous_total"});
  rpTable(sl,0.55,1.95,6.55,B.societe.toUpperCase()+" - Compte de résultat",pl.entetes,pl.lignes,pl.styles,
    pl.colsDelta,pl.largeurs,8,"Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  rpGraphLignes(sl,7.4,1.95,5.4,3.0,"Taux de marge (% du CA)",fy,[
    {name:"Marge brute",values:A.map(a=>rpPctN(v.MARGE_BRUTE[a],v.CA[a]))},
    {name:"Marge EBITDA",values:A.map(a=>rpPctN(v.EBITDA[a],v.CA[a]))},
    {name:"Marge nette",values:A.map(a=>rpPctN(v.RESULTAT_NET[a],v.CA[a]))}]);
  rpCadreComment(sl,7.4,5.2,5.4,1.65);
  rpPied(sl,mention,++page);
  /* marge et structure de coûts */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Analyse financière");
  rpTitre(sl,"Marge et structure des coûts");
  rpAssertion(sl,"La marge brute ressort à "+rpPctCA(v.MARGE_BRUTE[a1],ca1)+" du CA en "+fy[fy.length-1]+
    " ; la structure de coûts est dominée par "+((-v.COUTS_DIRECTS[a1])>=(-v.OPEX[a1])?"les coûts directs":"les frais généraux")+".");
  rpGraphAnneau(sl,0.55,1.95,5.9,3.7,"Répartition des charges "+fy[fy.length-1],
    ["Coûts directs","Frais généraux","Charges de personnel","Amort. & prov.","Impôts & taxes"],
    [-v.COUTS_DIRECTS[a1],-v.OPEX[a1],-v.CHARGES_PERSONNEL[a1],-v.DA[a1],-(v.IMPOTS?v.IMPOTS[a1]:0)].map(x=>Math.max(0,rq(x))),
    ["172554","224289","FA6706","9CA3AF","B45309"]);
  rpGraphBarres(sl,6.9,1.95,5.9,3.7,"Marge brute et EBITDA ("+rpLib()+")",fy,[
    {name:"Marge brute",values:A.map(a=>rq(v.MARGE_BRUTE[a]))},
    {name:"EBITDA",values:A.map(a=>rq(v.EBITDA[a]))}],{fmt:"#,##0"});
  rpCadreComment(sl,0.55,5.9,12.25,1.0);
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
  rpTable(sl,0.55,1.95,7.0,B.societe.toUpperCase()+" - Actif net",bs.entetes,bs.lignes,bs.styles,
    bs.colsDelta,bs.largeurs,8,"Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  const dso=ca1?Math.round(v.CLIENTS[a1]*360/(ca1*1.18)):0;
  rpGraphAnneau(sl,7.85,1.95,4.95,3.4,"Structure de l'actif "+fy[fy.length-1],
    ["Actif immobilisé","Stocks","Créances clients","Autres créances","Trésorerie"],
    [v.ACTIFS_IMMOBILISES[a1],v.STOCKS[a1],v.CLIENTS[a1],v.AUTRES_CREANCES[a1],Math.max(0,v.TRESORERIE_NETTE[a1])].map(x=>Math.max(0,rq(x))),
    ["172554","224289","FA6706","9CA3AF","16904E"]);
  rpCadreComment(sl,7.85,5.35,4.95,1.5);
  rpPied(sl,mention,++page);
  /* BFR et délais */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Analyse financière");
  rpTitre(sl,"Besoin en fonds de roulement et délais");
  const bfrJ=a=>v.CA[a]?Math.round(v.BFR[a]*360/v.CA[a]):null;
  const dpo=(-v.COUTS_DIRECTS[a1]-v.OPEX[a1])>0?Math.round(-v.FOURNISSEURS[a1]*360/((-v.COUTS_DIRECTS[a1]-v.OPEX[a1])*1.18)):0;
  const dio=(-v.COUTS_DIRECTS[a1])>0?Math.round(v.STOCKS[a1]*360/((-v.COUTS_DIRECTS[a1])*1.18)):0;
  rpAssertion(sl,"Le BFR représente "+(bfrJ(a1)||0)+" jours de CA en "+fy[fy.length-1]+" ; DSO ≈ "+dso+" j, DPO ≈ "+dpo+" j, rotation stocks ≈ "+dio+" j.");
  rpCartes(sl,[
    ["BFR "+fy[fy.length-1],rpFmt(v.BFR[a1])+" "+rpLib(),(bfrJ(a1)||0)+" jours de CA",null,"neutre","wallet","172554"],
    ["Délai clients (DSO)",dso+" j","créances clients",null,"neutre","file","224289"],
    ["Délai fournisseurs (DPO)",dpo+" j","dettes fournisseurs",null,"neutre","coins","FA6706"],
    ["Rotation stocks (DIO)",dio+" j","stocks",null,"neutre","chart","16904E"]]);
  rpGraphBarres(sl,0.55,3.35,6.1,2.45,"BFR en jours de CA",fy,[{name:"BFR (jours)",values:A.map(a=>bfrJ(a)),color:"172554"}],{fmt:"#,##0"});
  rpGraphBarres(sl,7.0,3.35,5.8,2.45,"BFR en valeur ("+rpLib()+")",fy,[{name:"BFR",values:A.map(a=>rq(v.BFR[a])),color:"224289"}],{fmt:"#,##0"});
  rpCadreComment(sl,0.55,5.95,12.25,0.95);
  rpPied(sl,mention,++page);
  /* cash flows */
  if(A.length>1){
    sl=pptx.addSlide();
    rpEnTete(sl,B.societe,"Due diligence financière");
    rpTitre(sl,"Analyse des flux de trésorerie");
    rpAssertion(sl,"Le tableau de flux est reconstruit par variations bilancielles et se réconcilie exactement avec la trésorerie du bilan.");
    const defs=[["FA","Capacité d'autofinancement (CAFG)","detail"],
      ["VAR_CREANCES","Variation des créances","detail"],["FC","Variation des stocks","detail"],
      ["FE","Variation des dettes d'exploitation","detail"],["ZB","Flux opérationnels","sous_total"],
      ["ACQUIS_IMMO","Acquisitions d'immobilisations","detail"],["CESSION_IMMO","Cessions d'immobilisations","detail"],
      ["ZC","Flux d'investissement","sous_total"],["ZFIN","Flux de financement","sous_total"],
      ["ZF","Variation nette de trésorerie","sous_total"],
      ["OUVERTURE","Trésorerie d'ouverture","detail"],["CLOTURE","Trésorerie de clôture","sous_total"]];
    const lignes=defs.map(([c,lib])=>[lib,...A.slice(1).map(a=>rpFmt(ETATS.tft[a][c]))]);
    rpTable(sl,0.55,1.95,6.9,B.societe.toUpperCase()+" - TFT",
      [rpLib(),...A.slice(1).map(a=>"FY"+String(a).slice(-2))],lignes,defs.map(d=>d[2]),
      new Set(),[3.2,...Array(A.length-1).fill(1.15)],8.5,
      "Source : reconstruction depuis les balances");
    rpGraphBarres(sl,7.6,1.95,5.2,3.35,"Flux par nature ("+rpLib()+")",A.slice(1).map(a=>"FY"+String(a).slice(-2)),[
      {name:"Opérationnels",values:A.slice(1).map(a=>rq(ETATS.tft[a].ZB))},
      {name:"Investissement",values:A.slice(1).map(a=>rq(ETATS.tft[a].ZC))},
      {name:"Financement",values:A.slice(1).map(a=>rq(ETATS.tft[a].ZFIN))}],{fmt:"#,##0"});
    rpCadreComment(sl,7.6,5.5,5.2,1.35);
    rpPied(sl,mention,++page);
  }
  rpSlideRatios(pptx,B,mention,++page);
  rpSection(pptx,4,"Annexes",["Glossaire","Lexique financier"],mention,++page);
  rpGlossaire(pptx,B,mention,++page);
  rpLexique(pptx,B,mention,++page);
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
    "Historique "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt,B.cabinet);
  rpPreambule(pptx,B,mention,++page,
    "Le présent rapport présente le business plan de "+B.societe+" sur la période "+ap[0]+" à "+ap[ap.length-1]+", construit à partir de l'historique "+fy[0]+"–"+fy[fy.length-1]+". Il constitue un support de discussion préalable aux échanges avec le management.",
    "Les projections sont établies à partir des balances historiques et d'hypothèses paramétrées dans l'application (croissance du CA, marges, BFR, investissements, financement). Le bilan prévisionnel est bouclé par la trésorerie ; toutes les hypothèses sont modifiables.");
  rpSection(pptx,1,"Note de synthèse",["Résumé exécutif et trajectoire"],mention,++page);
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
  rpGraphBarres(sl,7.65,3.15,5.15,3.55,"Trajectoire CA · EBITDA · RN ("+rpLib()+")",[fy[fy.length-1],...fyp],[
    {name:"CA",values:[rq(v.CA[a1]),...ap.map(a=>rq(proj.pl.CA[a]))]},
    {name:"EBITDA",values:[rq(v.EBITDA[a1]),...ap.map(a=>rq(proj.pl.EBITDA[a]))]},
    {name:"Résultat net",values:[rq(v.RESULTAT_NET[a1]),...ap.map(a=>rq(proj.pl.RN[a]))]}],{fmt:"#,##0",showValue:false});
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
  rpAssertion(sl,"Les valeurs par défaut sont dérivées de l'historique "+fy[0]+" – "+fy[fy.length-1]+".");
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
  rpCadreComment(sl,8.35,1.95,4.45,4.9);
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
  rpGraphLignes(sl,0.55,5.05,7.4,1.8,"Trajectoire CA · EBITDA · Résultat net ("+rpLib()+")",[...fy,...fyp],[
    {name:"CA",values:[...A.map(a=>rq(v.CA[a])),...ap.map(a=>rq(proj.pl.CA[a]))]},
    {name:"EBITDA",values:[...A.map(a=>rq(v.EBITDA[a])),...ap.map(a=>rq(proj.pl.EBITDA[a]))]},
    {name:"Résultat net",values:[...A.map(a=>rq(v.RESULTAT_NET[a])),...ap.map(a=>rq(proj.pl.RN[a]))]}],{fmt:"#,##0",showValue:false});
  rpCadreComment(sl,8.15,5.05,4.65,1.8);
  rpPied(sl,mention,++page);
  /* bilan & trésorerie prévisionnels */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Projections financières");
  rpTitre(sl,"Bilan et trésorerie prévisionnels");
  rpAssertion(sl,"La trésorerie nette évolue de "+rpFmt(v.TRESORERIE_NETTE[a1])+" "+rpLib()+" ("+fy[fy.length-1]+") à "+rpFmt(proj.bs.TRESO_NETTE[ap[ap.length-1]])+" "+rpLib()+" ("+fyp[fyp.length-1]+").");
  const bsP=[["Immobilisations nettes",...ap.map(a=>rpFmt(proj.bs.IMMO_NET[a]))],
    ["Besoin en fonds de roulement",...ap.map(a=>rpFmt(proj.bs.BFR[a]))],
    ["Capitaux propres",...ap.map(a=>rpFmt(proj.bs.CP[a]))],
    ["Dettes financières",...ap.map(a=>rpFmt(proj.bs.DETTE[a]))],
    ["Trésorerie nette",...ap.map(a=>rpFmt(proj.bs.TRESO_NETTE[a]))]];
  rpTable(sl,0.55,1.95,7.0,B.societe.toUpperCase()+" - Bilan prévisionnel",[rpLib(),...fyp],bsP,
    ["sous_total","sous_total","titre","detail","sous_total"],new Set(),[3.0,...ap.map(()=>1.0)],8,"Source : projections Findalyx Advisory");
  rpGraphLignes(sl,7.85,1.95,4.95,3.4,"Trésorerie nette & BFR ("+rpLib()+")",fyp,[
    {name:"Trésorerie nette",values:ap.map(a=>rq(proj.bs.TRESO_NETTE[a]))},
    {name:"BFR",values:ap.map(a=>rq(proj.bs.BFR[a]))}],{fmt:"#,##0",showValue:false});
  rpCadreComment(sl,7.85,5.35,4.95,1.5);
  rpPied(sl,mention,++page);
  rpSection(pptx,5,"Annexes",["Glossaire","Lexique financier"],mention,++page);
  rpGlossaire(pptx,B,mention,++page);
  rpLexique(pptx,B,mention,++page);
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
    "Historique "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt,B.cabinet);
  rpPreambule(pptx,B,mention,++page,
    "Le présent rapport présente l'évaluation financière des fonds propres de "+B.societe+" au 31/12/"+a1+", à partir des projections issues du business plan. Il constitue un support de discussion préalable aux échanges avec le management.",
    "L'évaluation combine une actualisation des flux de trésorerie disponibles (DCF, valeur terminale de Gordon) et une approche par multiples d'EBITDA. Les flux et le coût du capital sont paramétrés dans l'application et modifiables.");
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
  rpGraphBarres(sl,7.65,3.15,5.15,2.4,"Fourchette — fonds propres ("+rpLib()+")",
    ["Bas","DCF","Multiples","Haut"],[{name:"Fonds propres",values:[rq(val.eqMin),rq(val.equityDcf),rq(val.equityMult),rq(val.eqMax)],color:"224289"}],{fmt:"#,##0"});
  rpCadreComment(sl,7.65,5.7,5.15,1.15);
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
  rpGraphBarres(sl,0.55,5.15,7.4,1.65,"FCFF actualisés ("+rpLib()+")",fyp,
    [{name:"FCFF actualisés",values:ap.map(a=>rq(val.pv[a])),color:"16904E"}],{fmt:"#,##0",showValue:false});
  rpCadreComment(sl,8.15,5.15,4.65,1.65);
  rpPied(sl,mention,++page);
  rpSection(pptx,2,"Risques",["Risques majeurs et couverture"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Risques","Risques majeurs et couverture",
    ["Risques de marché et de concurrence","Risques opérationnels",
     "Risques financiers (change, taux, liquidité)","Risques juridiques et fiscaux"],mention,++page);
  rpSection(pptx,3,"Annexes",["Glossaire","Lexique financier"],mention,++page);
  rpGlossaire(pptx,B,mention,++page);
  rpLexique(pptx,B,mention,++page);
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
