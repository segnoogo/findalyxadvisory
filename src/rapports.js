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
/* Échelle propre aux graphiques : les montants sont stockés en KFCFA. Les étiquettes de
   graphique doivent rester courtes quelle que soit l'unité d'affichage du dossier (F/K/M) :
   on choisit ici l'unité qui donne 3 ou 4 caractères (KFCFA, MFCFA, MdFCFA) et le titre du
   graphique porte l'unité retenue. */
function rpEch(vals){
  let mx=0;(vals||[]).forEach(v=>{v=Math.abs(+v||0);if(isFinite(v)&&v>mx)mx=v;});
  if(mx>=1e6)return {f:1e-6,dec:mx>=1e7?1:2,lib:"MdFCFA"};
  if(mx>=1e3)return {f:1e-3,dec:mx>=1e4?1:2,lib:"MFCFA"};
  return {f:1,dec:0,lib:"KFCFA"};
}
function rpFmtE(v,e){if(v===null||v===undefined||!isFinite(v))return "";
  const x=v*e.f;
  const s=Math.abs(x).toLocaleString("fr-FR",{minimumFractionDigits:e.dec,maximumFractionDigits:e.dec}).replace(/[  ]/g," ");
  return x<0?`(${s})`:s;}
function rpTitreEch(titre,e){
  const t=String(titre||"").replace(/\(?\s*(?:Md|M|K|F)FCFA\s*\)?/g,"").replace(/\s+/g," ").trim();
  return (t?t+" ":"")+"("+e.lib+")";}

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
/* TITRE-MESSAGE (« action title ») : convention des banques d'affaires et des cabinets de
   conseil — le titre porte la CONCLUSION de la page, pas son sujet ; le sujet devient un
   surtitre discret. On doit pouvoir lire la suite des titres et comprendre le dossier sans
   ouvrir un seul tableau. Renvoie l'ordonnée où le contenu peut commencer.
   `msg` vide ⇒ on retombe sur un titre de sujet classique (rétro-compatible). */
function rpTitreMsg(sl,sujet,msg){
  if(!msg){rpTitre(sl,sujet);return 1.6;}
  sl.addText(String(sujet).toUpperCase(),{x:0.55,y:0.83,w:12.2,h:0.2,fontSize:8.5,bold:true,
    color:RP.BLEU,charSpacing:1.5,fontFace:"Arial"});
  const nl=String(msg).length>95?2:1;
  sl.addText(msg,{x:0.55,y:1.02,w:12.2,h:nl>1?0.62:0.4,fontSize:nl>1?14:15.5,bold:true,
    color:RP.NAVY,fontFace:"Arial",valign:"top"});
  return nl>1?1.72:1.55;
}
function rpAssertion(sl,txt){}  /* accroche auto retirée (Salif) — l'analyste écrit dans le cadre Commentaires */
/* --- fabrique de messages : formulations courtes, tirées des chiffres du dossier --- */
function rpMsgFmt(x){return rpFmt(x)+" "+rpLib();}
const rpAn=(a)=>(typeof libFY==="function")?libFY(a,true):String(a);
/* première année où une série devient (et reste) positive ; null sinon */
function rpBascule(annees,f){
  for(let i=0;i<annees.length;i++){
    if(f(annees[i])>0&&annees.slice(i).every(a=>f(a)>0)) return annees[i];
  }
  return null;
}
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
/* SOMMAIRE paginé, comme au début de tout pitchbook.
   Les pages des sections ne sont connues qu'une fois le rapport construit, et l'ordre des
   diapositives de PptxGenJS n'est pas modifiable après coup (les relations pointent sur le
   fichier créé). Le rapport est donc construit DEUX fois : une passe à blanc qui relève la page
   de chaque section (RP_SOM), puis la passe réelle qui compose le sommaire en page 2 (RP_SOM_FIX).
   Les compteurs de page réservent la page 2 dès le départ : la pagination est juste dans les
   deux passes. */
let RP_SOM=null, RP_SOM_FIX=null, RP_MENTION="";
function rpSommaire(pptx,societe,sections,mention){
  if(!sections||sections.length<2) return null;
  const sl=pptx.addSlide();
  rpEnTete(sl,societe,"Sommaire");
  rpTitre(sl,"Sommaire");
  const n=sections.length, hL=Math.max(0.5,Math.min(0.72,(6.3-1.7)/n));
  let y=1.7;
  sections.forEach(s=>{
    sl.addText(String(s.numero).padStart(2,"0"),{x:0.6,y:y,w:0.8,h:hL,valign:"middle",
      fontSize:14,bold:true,color:RP.ORANGE,fontFace:"Arial"});
    sl.addText(s.titre,{x:1.5,y:y,w:9.3,h:hL,valign:"middle",fontSize:13.5,bold:true,
      color:RP.NAVY,fontFace:"Arial"});
    sl.addText(String(s.page),{x:11.0,y:y,w:1.78,h:hL,align:"right",valign:"middle",
      fontSize:12,color:RP.G_TXT,fontFace:"Arial"});
    sl.addShape("rect",{x:0.6,y:y+hL-0.02,w:12.18,h:0.008,fill:{color:RP.FILET}});
    y+=hL;
  });
  rpPied(sl,mention,2);
  return sl;
}
function rpSection(pptx, numero, titreS, sousSections, mention, page){
  if(RP_SOM) RP_SOM.push({numero:numero,titre:titreS,page:page});
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
/* Un tableau = bandeau de titre, en-tête de colonnes, lignes typées par `styles`, note de source.
   Règles de présentation (tenir la même grille partout, c'est ce qui rend un tableau lisible) :
   - texte centré verticalement : sans cela une colonne teintée paraît déborder d'un cran sous la
     dernière ligne, et les libellés flottent en haut de leur cellule ;
   - paliers de lecture : filet fin AU-DESSUS des sous-totaux (« somme de ce qui précède »), fond
     très pâle réservé aux lignes conclusives (`total`), filet de fermeture sous la dernière ligne
     — sans quoi une colonne teintée semble flotter hors du tableau ;
   - `groupe` = intertitre de section à l'intérieur du tableau (bandeau clair, sans chiffres).
   opts : {compact} retire les lignes de DÉTAIL entièrement vides — un mur de tirets n'informe pas
   (réservé aux états financiers : ailleurs chaque ligne compte, même à zéro) ; {enteteClair}
   en-tête pâle au lieu du bandeau navy, pour un bloc de ratios accolé au tableau du dessus ;
   {centre} centre les cellules chiffrées (matrices de sensibilité).
   Renvoie l'ordonnée de bas de bloc (tableau + note), pour poser la suite sans blanc mort. */
const RP_ST_TOTAL={titre:1,sous_total:1,total:1};
const rpCelVide=v=>{const s=String(v==null?"":v).trim();return s===""||s==="-"||s==="–";};
/* Retrait des lignes de détail sans information. Exposé séparément car la hauteur de ligne se
   calcule sur le nombre de lignes RÉELLEMENT rendues, avant composition du tableau. */
function rpFiltrer(lignes,styles){
  const L=[],S=[];
  lignes.forEach((lg,i)=>{
    const st=styles[i];
    /* un ratio « n.s. » sur toute la période ne dit rien de plus qu'une ligne absente */
    const vide=lg.length>1&&lg.slice(1).every(c=>rpCelVide(c)||(st==="pct"&&String(c).trim()==="n.s."));
    if((st==="detail"||st==="pct")&&vide) return;
    L.push(lg);S.push(st);
  });
  for(let i=L.length-1;i>=0;i--)   /* intertitre devenu orphelin après filtrage */
    if(S[i]==="groupe"&&(i===L.length-1||S[i+1]==="groupe")){L.splice(i,1);S.splice(i,1);}
  return {L,S};
}
function rpTable(sl, x, y, w, bande, entetes, lignes, styles, colsDelta, largeurs, taille, source, rowH, opts){
  opts=opts||{};
  taille=taille||8.5;rowH=rowH||0.24;
  if(bande) sl.addText(bande,{x:x,y:y-0.26,w:w,h:0.22,fontSize:9.5,bold:true,
    color:RP.BLEU,charSpacing:1,fontFace:"Arial"});
  const fl=opts.compact?rpFiltrer(lignes,styles):{L:lignes,S:styles};
  const L=fl.L,S=fl.S;
  const tot=largeurs.reduce((a,b)=>a+b,0);
  const colW=largeurs.map(l=>w*l/tot);
  const F_ST="F6F8FB";                  /* sous-total : même fond que dans l'application */
  const rows=[];
  rows.push(entetes.map((h,j)=>({text:String(h||" "),options:{
    fill:{color:opts.enteteClair?RP.PALE:RP.NAVY},color:opts.enteteClair?RP.BLEU:RP.BLANC,
    bold:true,fontSize:taille,align:j?"right":"left",valign:"middle",fontFace:"Arial",
    charSpacing:opts.enteteClair?1:0}})));
  const NUL={type:"none"}, FIL={type:"solid",color:RP.FILET,pt:0.75};
  L.forEach((lg,i)=>{
    const st=S[i];
    const haut=(st==="sous_total"||st==="total")&&i>0&&S[i-1]!=="groupe";
    const bas=(i===L.length-1);          /* filet de fermeture du tableau */
    rows.push(lg.map((v,j)=>{
      const teinte=(st==="groupe")?RP.PALE:((colsDelta&&colsDelta.has(j))?RP.PALE
        :(st==="total")?F_ST:RP.BLANC);
      const o={fontSize:taille,align:j?(opts.centre?"center":"right"):"left",valign:"middle",
        fontFace:"Arial",fill:{color:teinte},color:RP.G_TITRE};
      if(RP_ST_TOTAL[st]){o.bold=true;o.color=RP.NAVY;}
      if(st==="groupe"){o.bold=true;o.color=RP.BLEU;o.fontSize=Math.max(7,taille-0.5);o.charSpacing=1;}
      if(st==="pct"){o.italic=true;o.color=RP.G_CLAIR;}
      if(haut||bas) o.border=[haut?FIL:NUL,NUL,bas?FIL:NUL,NUL];
      return {text:(j===0&&(st==="detail"||st==="pct")?"  ":"")+String((v===null||v===undefined||v==="")?" ":v),options:o};
    }));
  });
  sl.addTable(rows,{x:x,y:y,w:w,colW:colW,border:{type:"none"},rowH:rowH,margin:0.03});
  const fin=y+rowH*(L.length+1);
  if(!source) return fin;
  /* hauteur réelle de la note (≈17 caractères par pouce en 8 pt) : sans cela une note longue
     passe sous le bloc suivant */
  const nl=Math.max(1,Math.ceil(String(source).length/Math.max(20,w*17)));
  sl.addText(source,{x:x,y:fin+0.06,w:w,h:0.15*nl+0.08,fontSize:8,italic:true,
    color:RP.G_CLAIR,fontFace:"Arial",valign:"top"});
  return fin+0.16+0.15*nl;
}
/* Cadre de commentaires occupant TOUTE la hauteur restante sous le contenu : un tableau court ne
   laisse plus une bande blanche au milieu de la diapositive. */
function rpCommentReste(sl,x,y,w,yBas){
  /* plafonné : un cadre vide de plus de 2,6" occuperait la moitié de la page */
  const h=Math.min(2.6,Math.max(0.9,(yBas||6.72)-y));
  rpCadreComment(sl,x,y,w,h);
  return y+h;
}
function rpCartes(sl, items, y){
  y=y||1.85;
  const x0=0.55,W=12.23,gap=0.2,n=items.length;
  const w=(W-gap*(n-1))/n,h=1.16;
  const couls=["224289","FA6706","172554","16904E"];
  items.forEach((it,i)=>{
    const [lab,val,sub,pilule,ton]=it;
    const coul=it[6]||couls[i%4];
    const xx=x0+i*(w+gap);
    sl.addShape("rect",{x:xx,y:y,w:w,h:0.36,fill:{color:coul}});
    sl.addText(lab,{x:xx+0.14,y:y,w:w-0.28,h:0.36,valign:"middle",fontSize:9,bold:true,color:RP.BLANC,fontFace:"Arial"});
    sl.addShape("rect",{x:xx,y:y+0.36,w:w,h:h-0.36,fill:{color:"F2F5FA"},line:{color:"E4E8F0",width:1}});
    sl.addText(val,{x:xx+0.14,y:y+0.42,w:w-0.28,h:0.42,valign:"middle",fontSize:18,bold:true,color:RP.NAVY,fontFace:"Arial"});
    const runs=[];
    if(pilule){ const pref={up:"▲ ",down:"▼ ",neutre:""}[ton||"neutre"], col={up:"0F6B3C",down:"A3271B",neutre:"6B7280"}[ton||"neutre"];
      runs.push({text:pref+pilule+(sub?"   ":""),options:{color:col,bold:true,fontSize:8.5}}); }
    if(sub) runs.push({text:sub,options:{color:RP.G_CLAIR,fontSize:8.5}});
    if(runs.length) sl.addText(runs,{x:xx+0.14,y:y+0.86,w:w-0.28,h:0.24,fontFace:"Arial",valign:"top"});
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
/* Diapositive de rubriques : chaque rubrique occupe un CADRE dimensionné pour remplir la
   hauteur utile — renseigné, il contient le texte du dossier ; vide, il offre à l'analyste
   une zone d'écriture visible plutôt qu'un titre suivi de blanc.
   opts.fiche : n'affiche la fiche d'identité (tableau clé/valeur) que sur la page où elle a
   du sens — elle était jusqu'ici répétée en gras sur toutes les diapositives de rubriques. */
function rpPlaceholder(pptx, societe, section, titreS, rubriques, mention, page, opts){
  opts=opts||{};
  const sl=pptx.addSlide();
  rpEnTete(sl,societe,section); rpTitre(sl,titreS);
  const I=rpInfos();
  const yTop=1.58, yMax=6.9;
  let xG=0.55, wG=12.23;
  if(opts.fiche){
    /* fiche d'identité en tableau à gauche (lisible), rubriques à droite */
    const ficheL=[["Secteur",I.secteur],["Forme juridique",I.formeJuridique],
      ["Création",I.creation],["Effectifs",I.effectif],["Dirigeant",I.dirigeant],
      ["Actionnariat",I.actionnariat],["Implantation",I.adresse]]
      .filter(([,v])=>v&&String(v).trim());
    if(ficheL.length){
      rpTable(sl,0.55,yTop+0.28,5.25,societe.toUpperCase()+" - Fiche d'identité",
        ["Rubrique","Information"],ficheL,ficheL.map(()=>"detail"),new Set(),[1.75,3.5],8.5);
      xG=6.15; wG=6.63;
    }
  }
  /* cadres : hauteur répartie sur la colonne disponible, deux par ligne si la place le permet */
  const n=rubriques.length;
  const deuxCol=(wG>8&&n>2);
  const cw=deuxCol?(wG-0.28)/2:wG;
  const nl=deuxCol?Math.ceil(n/2):n;
  const ch=Math.max(0.95,(yMax-yTop-(nl-1)*0.22)/nl);
  rubriques.forEach((r,i)=>{
    const li=deuxCol?Math.floor(i/2):i, ci=deuxCol?(i%2):0;
    const x=xG+ci*(cw+0.28), y=yTop+li*(ch+0.22);
    const txt=rpTexteRubrique(r,I);
    sl.addText(r,{x:x,y:y,w:cw,h:0.26,fontSize:11,bold:true,color:RP.BLEU,fontFace:"Arial"});
    sl.addShape("roundRect",{x:x,y:y+0.3,w:cw,h:ch-0.3,rectRadius:0.02,
      fill:{color:txt?"FFFFFF":"FBFCFE"},line:{color:RP.FILET,width:1}});
    /* police ajustée à la place réelle du cadre : un texte long se réduit au lieu de déborder */
    const hTxt=ch-0.5, cpl=Math.max(24,Math.floor((cw-0.3)*16.5)), nlTxt=Math.max(1,Math.ceil(String(txt||"").length/cpl));
    const dispo=Math.max(1,Math.floor(hTxt/0.175));
    const fs=txt?(nlTxt>dispo?Math.max(7.5,Math.round(10*dispo/nlTxt*2)/2):10):9;
    sl.addText(txt||"À compléter",{x:x+0.14,y:y+0.4,w:cw-0.28,h:hTxt,fontSize:fs,
      italic:!txt,color:txt?"333333":RP.G_CLAIR,fontFace:"Arial",valign:"top"});
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
  const fy=annees.map(a=>libFY(a));
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
  FRAIS_GENERAUX:"Frais généraux",RAO:"Résultat des activités ordinaires",RESULTAT_AVANT_IMPOT:"Résultat avant impôt",
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
  const fy=A.map(a=>libFY(a));
  const dateTxt=new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  return {A,v,a1,a0,ca1,fy,dateTxt,societe:DOSSIER.societe,cabinet:cabinetExport()||"Findalyx Advisory"};
}
/* accès unifié à la projection pour les rapports : dossier avec historique (projeterBP) OU
   modèle sans balance (projeterModele). En mode modèle, aligne ETATS sur l'ETATS synthétique
   et renvoie hyp=M (le modèle). Les rapports masquent les colonnes « historique » via rpModele(). */
function rpModele(){return !!(DOSSIER&&DOSSIER.sansHistorique);}
function rpProj(){
  if(rpModele()){
    var M=assurerModele();
    var proj=projeterModele(M);
    ETATS=etatsFromModele(proj);
    var val=null; try{val=valoriserBP(ETATS,{is_taux:M.is_taux,valo:M.valo},proj);}catch(e){}
    return {hyp:M,proj:proj,val:val};
  }
  var hyp=assurerBP(),proj=projeterBP(ETATS,hyp),val=valoriserBP(ETATS,hyp,proj);
  return {hyp:hyp,proj:proj,val:val};
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
  rpTable(sl,0.55,1.65,8.5,B.societe.toUpperCase()+" - Ratios",
    ["Indicateur",...fy,"Appréciation"],lignes,styles,new Set(),
    [3.5,...A.map(()=>0.85),1.45],8,"Seuils indicatifs ; à apprécier au regard du secteur d'activité.");
  rpCadreComment(sl,9.35,1.65,3.45,5.05);
  rpPied(sl,mention,page);
}

/* ---------- design & graphiques "cabinet" ---------- */
const RP_PAL=["172554","2E5AAC","8FAADC","9E3A38","4E7C3A","B08D2A"];
function rpAssertionBox(sl,txt){}  /* accroche auto retirée (Salif) */
function rpBandeau(sl,x,y,w,titre,num){
  if(num!=null){
    sl.addShape("rect",{x:x,y:y,w:0.52,h:0.3,fill:{color:RP.BLEU}});
    sl.addText(String(num),{x:x,y:y,w:0.52,h:0.3,align:"center",valign:"middle",fontSize:11,bold:true,color:RP.BLANC,fontFace:"Arial"});
  }
  const bx=x+(num!=null?0.52:0);
  sl.addShape("rect",{x:bx,y:y,w:w-(num!=null?0.52:0),h:0.3,fill:{color:RP.NAVY}});
  sl.addText(titre,{x:bx+0.15,y:y,w:w-(num!=null?0.67:0.15),h:0.3,valign:"middle",fontSize:10.5,bold:true,color:RP.BLANC,fontFace:"Arial"});
}
/* graphique colonnes dessiné à la main (formes) — contrôle total, rendu net */
function rpColonnes(sl,x,y,w,h,titre,labels,series,opts){
  opts=opts||{};
  const m=series.length;
  const tous=[];series.forEach(s=>(s.values||[]).forEach(v=>tous.push(+v||0)));
  const e=rpEch(tous);                               /* unité des étiquettes, indépendante de l'affichage */
  const runs=[];
  series.forEach((s,j)=>{ if(j)runs.push({text:"   ·   ",options:{color:RP.G_CLAIR,fontSize:10}});
    runs.push({text:s.name,options:{color:s.color||RP_PAL[j%RP_PAL.length],bold:true,fontSize:10}}); });
  runs.push({text:"   "+rpTitreEch(titre,e),options:{color:RP.G_CLAIR,fontSize:9,italic:true}});
  sl.addText(runs,{x:x,y:y,w:w,h:0.26,fontFace:"Arial"});
  const px=x+0.12, py=y+0.42, pw=w-0.24, ph=h-0.42-0.26, n=labels.length;
  /* échelle signée : un plan en J (pertes de démarrage) doit montrer ses barres négatives */
  let mx=0,mn=0; tous.forEach(v=>{if(v>mx)mx=v;if(v<mn)mn=v;}); if(mx<=0&&mn>=0)mx=1;
  const gW=pw/n, pad=gW*0.18, bW=(gW-2*pad)/m;
  const eti=0.16, aff=opts.showVal!==false;
  const et=v=>{const s=rpFmtE(Math.abs(v),e);return s?((v<0?"-":"")+s):"";};   /* signe court : les étiquettes doivent tenir dans la largeur d'une barre */
  const fs=Math.max(5.5,Math.min(7.5,bW*26));         /* corps adapté à la largeur des barres */
  /* si plusieurs barres d'un même groupe portent une étiquette du même côté de l'axe, on décale
     une ligne sur deux : sinon les valeurs proches se superposent (cas EBITDA/RN négatifs) */
  const cptp=labels.map((_,i)=>series.filter(s=>(+s.values[i]||0)>0).length);
  const cptn=labels.map((_,i)=>series.filter(s=>(+s.values[i]||0)<0).length);
  const dec=aff&&bW<0.34&&m>1, hi=Math.max(...cptp), lo=Math.max(...cptn);
  const rT=(hi>0?1:0)+((dec&&hi>1)?1:0), rB=(lo>0?1:0)+((dec&&lo>1)?1:0);
  const amp=(mx-mn)||1, hp=ph-eti*rT-eti*rB, zero=py+eti*rT+hp*(mx/amp);
  sl.addShape("line",{x:px,y:zero,w:pw,h:0,line:{color:RP.G_CLAIR,width:1}});
  labels.forEach((lab,i)=>{
    const gx=px+i*gW+pad;let rp=0,rn=0;
    series.forEach((s,j)=>{
      const val=+s.values[i]||0, bh=Math.abs(val)/amp*hp, bx=gx+j*bW, by=val<0?zero:zero-bh;
      if(bh>0.004) sl.addShape("rect",{x:bx+bW*0.1,y:by,w:bW*0.8,h:Math.max(0.015,bh),fill:{color:s.color||RP_PAL[j%RP_PAL.length]}});
      if(aff&&et(val)){
        const off=dec?((val<0?rn++:rp++)%2)*eti:0;
        sl.addText(et(val),{x:bx-0.3,y:val<0?by+bh+off:by-eti-off,w:bW+0.6,h:eti,
          align:"center",valign:val<0?"top":"bottom",fontSize:fs,color:val<0?"9E3A38":RP.G_TXT,fontFace:"Arial"});
      }
    });
    sl.addText(lab,{x:px+i*gW,y:py+ph+0.03,w:gW,h:0.2,align:"center",fontSize:8,color:RP.G_TXT,fontFace:"Arial"});
  });
}

/* colonnes empilées (structures multi-périodes) */
function rpColonnesEmpilees(sl,x,y,w,h,titre,labels,series,opts){
  opts=opts||{};
  const runs=[];
  series.forEach((s,j)=>{ if(j)runs.push({text:"   ·   ",options:{color:RP.G_CLAIR,fontSize:9}});
    runs.push({text:s.name,options:{color:s.color||RP_PAL[j%RP_PAL.length],bold:true,fontSize:9}}); });
  if(titre)runs.push({text:"   "+titre,options:{color:RP.G_CLAIR,fontSize:8.5,italic:true}});
  sl.addText(runs,{x:x,y:y,w:w,h:0.26,fontFace:"Arial"});
  const px=x+0.12, py=y+0.42, pw=w-0.24, ph=h-0.42-0.26, base=py+ph, n=labels.length;
  const tot=labels.map((_,i)=>series.reduce((t,s)=>t+Math.max(0,s.values[i]||0),0));
  const mx=Math.max(...tot,1);
  sl.addShape("line",{x:px,y:base,w:pw,h:0,line:{color:RP.G_CLAIR,width:1}});
  const gW=pw/n, bW=Math.min(0.9,gW*0.55), off=(gW-bW)/2;
  labels.forEach((lab,i)=>{
    let yTop=base;
    series.forEach((s,j)=>{ const val=Math.max(0,s.values[i]||0), sh=val/mx*ph;
      if(sh>0.012){ yTop-=sh; sl.addShape("rect",{x:px+i*gW+off,y:yTop,w:bW,h:sh,fill:{color:s.color||RP_PAL[j%RP_PAL.length]}}); } });
    sl.addText(lab,{x:px+i*gW,y:base+0.04,w:gW,h:0.2,align:"center",fontSize:8,color:RP.G_TXT,fontFace:"Arial"});
  });
}
/* barre de structure 100% (mix d'une période) + légende */
function rpBarreStructure(sl,x,y,w,titre,items){
  if(titre) sl.addText(titre,{x:x,y:y,w:w,h:0.24,fontSize:10,bold:true,color:RP.BLEU,charSpacing:1,fontFace:"Arial"});
  const by=y+0.34, bh=0.46, tot=items.reduce((t,it)=>t+Math.max(0,it.value),0)||1; let cx=x;
  items.forEach((it,j)=>{ const seg=Math.max(0,it.value)/tot*w, pct=Math.round(it.value/tot*100);
    sl.addShape("rect",{x:cx,y:by,w:Math.max(0.01,seg),h:bh,fill:{color:it.color||RP_PAL[j%RP_PAL.length]}});
    if(seg>0.42) sl.addText(pct+"%",{x:cx,y:by,w:seg,h:bh,align:"center",valign:"middle",fontSize:9,bold:true,color:RP.BLANC,fontFace:"Arial"});
    cx+=seg; });
  let ly=by+bh+0.14, lx=x;
  items.forEach((it,j)=>{ const tw=0.062*it.name.length+0.1;
    if(lx+0.17+tw>x+w){lx=x;ly+=0.24;}
    sl.addShape("rect",{x:lx,y:ly+0.02,w:0.12,h:0.12,fill:{color:it.color||RP_PAL[j%RP_PAL.length]}});
    sl.addText(it.name,{x:lx+0.16,y:ly-0.02,w:tw,h:0.2,fontSize:8,color:RP.G_TXT,fontFace:"Arial"}); lx+=0.17+tw+0.14; });
}
/* barres horizontales (fourchette, classements) */
function rpBarresH(sl,x,y,w,h,titre,labels,values,opts){
  opts=opts||{};
  const e=rpEch(values);
  sl.addText(rpTitreEch(titre,e),{x:x,y:y,w:w,h:0.24,fontSize:10,bold:true,color:RP.BLEU,charSpacing:1,fontFace:"Arial"});
  const px=x+2.0, py=y+0.38, pw=w-2.0-0.9, n=labels.length, rh=(h-0.38)/n;
  const mx=Math.max(...values.map(v=>Math.max(0,v||0)),1);
  labels.forEach((lab,i)=>{ const cy=py+i*rh, bw=Math.max(0,values[i]||0)/mx*pw, bh=Math.min(0.34,rh*0.6);
    sl.addText(lab,{x:x,y:cy,w:1.9,h:rh,valign:"middle",fontSize:9,color:RP.G_TITRE,fontFace:"Arial"});
    sl.addShape("rect",{x:px,y:cy+(rh-bh)/2,w:Math.max(0.02,bw),h:bh,fill:{color:(opts.colors&&opts.colors[i])||RP.BLEU}});
    sl.addText(rpFmtE(values[i],e),{x:px+bw+0.06,y:cy,w:1.0,h:rh,valign:"middle",fontSize:9,bold:true,color:RP.NAVY,fontFace:"Arial"}); });
}

/* FOOTBALL FIELD — standard des banques d'affaires pour synthétiser une valorisation :
   une barre flottante min–max par méthode sur un AXE COMMUN, la zone où les méthodes se
   recoupent (l'information la plus utile de la page) et la valeur retenue en repère vertical.
   Remplace un histogramme de valeurs centrales, qui ne montre ni fourchette ni recoupement. */
function rpFootball(sl,x,y,w,h,titre,methodes,retenue,note){
  const M=(methodes||[]).filter(m=>m&&isFinite(m.min)&&isFinite(m.max));
  if(!M.length) return y+h;
  const e=rpEch(M.reduce((t,m)=>t.concat([m.min,m.max]),[retenue]));
  rpTitreG(sl,rpTitreEch(titre,e),x,y,w);
  const lw=Math.min(2.3,w*0.28), py=y+0.36, pw=w-lw-0.2, px=x+lw;
  const hAxe=0.34, ph=Math.max(0.6,h-0.36-hAxe), rh=ph/M.length;
  let lo=Math.min.apply(null,M.map(m=>m.min).concat([retenue])),
      hi=Math.max.apply(null,M.map(m=>m.max).concat([retenue]));
  if(!(hi>lo)){hi=lo+Math.max(1,Math.abs(lo)*0.2);}
  const marge=(hi-lo)*0.12; lo-=marge; hi+=marge;
  const sx=v=>px+(Math.min(hi,Math.max(lo,v))-lo)/(hi-lo)*pw;
  /* zone de recoupement des fourchettes */
  const ovLo=Math.max.apply(null,M.map(m=>m.min)), ovHi=Math.min.apply(null,M.map(m=>m.max));
  if(M.length>1&&ovHi>ovLo)
    sl.addShape("rect",{x:sx(ovLo),y:py-0.04,w:Math.max(0.03,sx(ovHi)-sx(ovLo)),h:ph+0.08,
      fill:{color:"EEF3FA"},line:{color:"DCE6F4",width:0.5}});
  const COUL=["172554","224289","2E5AAC","5B7FC7","8FAADC"];
  M.forEach((m,i)=>{
    const cy=py+i*rh, bh=Math.min(0.3,rh*0.52), by=cy+(rh-bh)/2;
    sl.addText(m.lib,{x:x,y:cy,w:lw-0.1,h:rh,valign:"middle",fontSize:8.5,color:RP.G_TITRE,fontFace:"Arial"});
    const x1=sx(m.min),x2=sx(m.max), plat=(x2-x1)<0.06;
    sl.addShape("rect",{x:x1,y:by,w:Math.max(0.05,x2-x1),h:bh,fill:{color:COUL[i%COUL.length]}});
    /* valeur centrale : losange, repère habituel des football fields (un simple trait blanc
       coupe la barre en deux et se lit comme deux fourchettes distinctes) */
    if(!plat&&isFinite(m.central)&&m.central>m.min&&m.central<m.max)
      sl.addShape("diamond",{x:sx(m.central)-0.06,y:by+bh/2-0.06,w:0.12,h:0.12,
        fill:{color:RP.BLANC},line:{color:COUL[i%COUL.length],width:0.75}});
    const et={fontSize:7.5,color:RP.G_TXT,fontFace:"Arial",valign:"middle"};
    if(!plat) sl.addText(rpFmtE(m.min,e),Object.assign({x:x1-0.72,y:by,w:0.68,h:bh,align:"right"},et));
    sl.addText(rpFmtE(m.max,e),Object.assign({x:x2+0.06,y:by,w:0.72,h:bh,align:"left"},et));
  });
  /* valeur retenue : repère vertical + étiquette */
  if(isFinite(retenue)){
    const rx=sx(retenue);
    sl.addShape("line",{x:rx,y:py-0.1,w:0,h:ph+0.14,line:{color:RP.ORANGE,width:1.25,dashType:"dash"}});
    sl.addText("Retenue "+rpFmtE(retenue,e),{x:Math.min(rx+0.05,x+w-1.5),y:py-0.34,w:1.5,h:0.22,
      fontSize:7.5,bold:true,color:RP.ORANGE,fontFace:"Arial"});
  }
  /* axe commun */
  const ay=py+ph+0.04;
  sl.addShape("rect",{x:px,y:ay,w:pw,h:0.01,fill:{color:RP.FILET}});
  for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;
    sl.addShape("rect",{x:px+pw*k/4,y:ay,w:0.008,h:0.05,fill:{color:RP.FILET}});
    sl.addText(rpFmtE(v,e),{x:px+pw*k/4-0.4,y:ay+0.06,w:0.8,h:0.2,align:"center",
      fontSize:7.5,color:RP.G_CLAIR,fontFace:"Arial"});}
  if(note) sl.addText(note,{x:x,y:ay+0.28,w:w,h:0.3,fontSize:7.5,italic:true,color:RP.G_CLAIR,
    fontFace:"Arial",valign:"top"});
  return ay+(note?0.6:0.3);
}

/* ---------- RAPPORT DD ---------- */
function construireDD(pptx){
  const B=rpBase();
  const {A,v,a1,a0,ca1,fy}=B;
  const mention=B.societe+" - Due diligence financière - "+B.dateTxt+" - Confidentiel"; RP_MENTION=mention;
  let page=2;   /* page 2 réservée au sommaire */
  rpGarde(pptx,B.societe,"Due diligence financière — Rapport provisoire",
    "Exercices "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()+"",B.dateTxt,B.cabinet);
  if(RP_SOM_FIX) rpSommaire(pptx,B.societe,RP_SOM_FIX,mention);
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
    ["Chiffre d'affaires "+fy[fy.length-1],rpFmt(ca1)+" "+rpLib(),
     tcam!==null?"TCAM "+rpPct(tcam):"",pca,tca,"chart","224289"],
    ["EBITDA "+fy[fy.length-1],rpFmt(v.EBITDA[a1])+" "+rpLib(),
     ca1?Math.round(v.EBITDA[a1]/ca1*100)+"% du CA":"",peb,teb,"coins","FA6706"],
    ["Résultat net "+fy[fy.length-1],rpFmt(v.RESULTAT_NET[a1])+" "+rpLib(),
     ca1?Math.round(v.RESULTAT_NET[a1]/ca1*100)+"% du CA":"",prn,trn,"file","172554"],
    ["Trésorerie nette",rpFmt(v.TRESORERIE_NETTE[a1])+" "+rpLib(),
     v.TRESORERIE_NETTE[a1]<0?"position négative":"",null,"neutre","wallet","16904E"],
  ]);
  const syn=rpLignesFin(v,["CA","MARGE_BRUTE","EBITDA","RESULTAT_NET","BFR","TRESORERIE_NETTE",
    "CAPITAUX_PROPRES"],A,RP_LIBS,{CA:"titre",EBITDA:"sous_total",RESULTAT_NET:"sous_total",
    CAPITAUX_PROPRES:"sous_total"});
  rpTable(sl,0.55,3.35,6.9,B.societe.toUpperCase()+" - Synthèse",syn.entetes,syn.lignes,
    syn.styles,syn.colsDelta,syn.largeurs,8.5,
    "Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  rpColonnes(sl,7.55,3.35,5.25,2.15,"("+rpLib()+")",fy,[
    {name:"CA",values:A.map(a=>v.CA[a]),color:"172554"},
    {name:"EBITDA",values:A.map(a=>v.EBITDA[a]),color:"2E5AAC"},
    {name:"Résultat net",values:A.map(a=>v.RESULTAT_NET[a]),color:"8FAADC"}]);
  rpCadreComment(sl,7.55,5.6,5.25,1.25);
  rpPied(sl,mention,++page);
  /* business overview */
  rpSection(pptx,2,"Business overview",["Présentation de la société","Structure organisationnelle"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Business overview","Présentation de la société",
    ["Historique et actionnariat","Activités et offre","Organisation et effectifs",
     "Marché et positionnement","Faits marquants de la période"],mention,++page,{fiche:true});
  rpPlaceholder(pptx,B.societe,"Business overview","Structure organisationnelle",
    ["Organigramme et instances de gouvernance","Équipe dirigeante et management",
     "Structure du groupe, filiales et participations","Effectifs par fonction et implantations"],mention,++page);
  /* performances historiques */
  rpSection(pptx,3,"Analyse financière",
    ["Compte de résultat","Situation nette","BFR et délais","Flux de trésorerie","Ratios clés"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Due diligence financière");
  rpTitre(sl,"Compte de résultat");
  rpAssertionBox(sl,B.societe+" réalise un chiffre d'affaires de "+rpFmt(ca1)+" "+rpLib()+" en "+fy[fy.length-1]+(tcam!==null?" (TCAM "+rpPct(tcam)+")":"")+".");
  const pl=rpLignesFin(v,["CA","COUTS_DIRECTS","MARGE_BRUTE","AUTRES_PROD","FRAIS_GENERAUX",
    "EBITDA","DA","EBIT","RESULTAT_FIN","RAO","RESULTAT_HAO","RESULTAT_AVANT_IMPOT","IMPOTS","RESULTAT_NET"],
    A,RP_LIBS,{CA:"titre",COUTS_DIRECTS:"sous_total",MARGE_BRUTE:"sous_total",FRAIS_GENERAUX:"sous_total",
    EBITDA:"sous_total",EBIT:"sous_total",RESULTAT_FIN:"sous_total",RAO:"sous_total",RESULTAT_HAO:"sous_total",
    RESULTAT_AVANT_IMPOT:"sous_total",RESULTAT_NET:"sous_total",pctApres:new Set(["MARGE_BRUTE","EBITDA","RESULTAT_NET"])});
  rpTable(sl,0.55,1.65,6.55,B.societe.toUpperCase()+" - Compte de résultat",pl.entetes,pl.lignes,pl.styles,
    pl.colsDelta,pl.largeurs,8,"Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  rpColonnes(sl,7.4,1.65,5.4,3.05,"("+rpLib()+")",fy,[
    {name:"CA",values:A.map(a=>v.CA[a]),color:"172554"},
    {name:"EBITDA",values:A.map(a=>v.EBITDA[a]),color:"2E5AAC"},
    {name:"Résultat net",values:A.map(a=>v.RESULTAT_NET[a]),color:"8FAADC"}]);
  rpCadreComment(sl,7.4,4.85,5.4,1.95);
  rpPied(sl,mention,++page);
  /* situation nette */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Due diligence financière");
  rpTitre(sl,"Situation nette historique");
  rpAssertionBox(sl,"L'actif net s'établit à "+rpFmt(v.ACTIF_NET[a1])+" "+rpLib()+" à fin "+fy[fy.length-1]+", strictement égal aux capitaux propres reconstitués.");
  const bs=rpLignesFin(v,["ACTIFS_IMMOBILISES","STOCKS","CLIENTS","AUTRES_CREANCES","FOURNISSEURS",
    "DETTES_FISCALES","DETTES_SOCIALES","AUTRES_DETTES","BFR","TRESORERIE_NETTE","PROVISIONS_RC",
    "DETTES_FINANCIERES","ACTIF_NET","CAPITAUX_PROPRES"],A,RP_LIBS,
    {ACTIFS_IMMOBILISES:"sous_total",BFR:"sous_total",TRESORERIE_NETTE:"sous_total",
     ACTIF_NET:"titre",CAPITAUX_PROPRES:"titre"});
  rpTable(sl,0.55,1.65,7.0,B.societe.toUpperCase()+" - Actif net",bs.entetes,bs.lignes,bs.styles,
    bs.colsDelta,bs.largeurs,8,"Source : balances générales "+fy[0]+" - "+fy[fy.length-1]);
  const dso=ca1?Math.round(v.CLIENTS[a1]*360/(ca1*1.18)):0;
  rpCadreComment(sl,7.85,1.65,4.95,5.2);
  rpPied(sl,mention,++page);
  /* BFR et délais */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Analyse financière");
  rpTitre(sl,"Besoin en fonds de roulement et délais");
  const bfrJ=a=>v.CA[a]?Math.round(v.BFR[a]*360/v.CA[a]):null;
  const dpo=(-v.COUTS_DIRECTS[a1]-v.OPEX[a1])>0?Math.round(-v.FOURNISSEURS[a1]*360/((-v.COUTS_DIRECTS[a1]-v.OPEX[a1])*1.18)):0;
  const dio=(-v.COUTS_DIRECTS[a1])>0?Math.round(v.STOCKS[a1]*360/((-v.COUTS_DIRECTS[a1])*1.18)):0;
  rpAssertionBox(sl,"Le BFR représente "+(bfrJ(a1)||0)+" jours de CA en "+fy[fy.length-1]+" ; DSO ≈ "+dso+" j, DPO ≈ "+dpo+" j, rotation stocks ≈ "+dio+" j.");
  rpCartes(sl,[
    ["BFR "+fy[fy.length-1],rpFmt(v.BFR[a1])+" "+rpLib(),(bfrJ(a1)||0)+" jours de CA",null,"neutre","wallet","172554"],
    ["Délai clients (DSO)",dso+" j","créances clients",null,"neutre","file","224289"],
    ["Délai fournisseurs (DPO)",dpo+" j","dettes fournisseurs",null,"neutre","coins","FA6706"],
    ["Rotation stocks (DIO)",dio+" j","stocks",null,"neutre","chart","16904E"]]);
  rpColonnes(sl,0.55,3.4,6.0,3.25,"BFR ("+rpLib()+")",fy,[{name:"BFR",values:A.map(a=>v.BFR[a]),color:"172554"}]);
  rpCadreComment(sl,6.75,3.4,6.05,3.25);
  rpPied(sl,mention,++page);
  /* cash flows */
  if(A.length>1){
    sl=pptx.addSlide();
    rpEnTete(sl,B.societe,"Due diligence financière");
    rpTitre(sl,"Analyse des flux de trésorerie");
    rpAssertionBox(sl,"Le tableau de flux est reconstruit par variations bilancielles et se réconcilie exactement avec la trésorerie du bilan.");
    const defs=[["ZA","Trésorerie nette à l'ouverture","sous_total"],
      [null,"Activités opérationnelles","titre"],
      ["FA","Capacité d'autofinancement globale (CAFG)","detail"],
      ["VAR_CREANCES","Variation des créances","detail"],["FC","Variation des stocks","detail"],
      ["FE","Variation des dettes d'exploitation","detail"],["ZB","Flux des activités opérationnelles","sous_total"],
      [null,"Activités d'investissement","titre"],
      ["ACQUIS_IMMO","Acquisitions d'immobilisations","detail"],["CESSION_IMMO","Cessions d'immobilisations","detail"],
      ["ZC","Flux des activités d'investissement","sous_total"],
      [null,"Activités de financement","titre"],
      ["FK","Augmentation de capital","detail"],["FL","Subvention d'investissement","detail"],
      ["FN","Dividendes versés","detail"],["EMPRUNT","Emprunts nouveaux","detail"],
      ["REMBOURS","Remboursement d'emprunts","detail"],["ZFIN","Flux des activités de financement","sous_total"],
      ["ZF","Variation de la trésorerie nette de la période","sous_total"],
      ["ZG","Trésorerie nette à la clôture","sous_total"]];
    const lignes=defs.map(([c,lib])=>[lib,...A.slice(1).map(a=>c?rpFmt(ETATS.tft[a][c]):"")]);
    rpTable(sl,0.55,1.65,6.9,B.societe.toUpperCase()+" - TFT",
      [rpLib(),...A.slice(1).map(a=>libFY(a))],lignes,defs.map(d=>d[2]),
      new Set(),[3.2,...Array(A.length-1).fill(1.15)],8.5,
      "Source : reconstruction depuis les balances");
    rpCadreComment(sl,7.6,1.65,5.2,5.2);
    rpPied(sl,mention,++page);
  }
  rpSlideRatios(pptx,B,mention,++page);
  /* ---------- 4. Notation et qualité des résultats ---------- */
  rpSection(pptx,4,"Notation et qualité des résultats",["Notation et scores de crédit","Qualité des résultats (QoE)"],mention,++page);
  const sc=calculerScores(ETATS);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Notation et scores");
  rpTitre(sl,"Notation et scores de crédit");
  rpCartes(sl,[
    ["Notation Findalyx",sc.notation.grade,sc.notation.mention+" · "+sc.notation.global+"/100",null,"neutre","chart","172554"],
    ["Altman Z-Score",sc.altman.grade,"Z = "+sc.altman.z+" · zone "+sc.altman.zone,null,"neutre","coins","224289"],
    ["Cotation BCEAO",sc.bceao.cote,sc.bceao.mention+" · "+sc.bceao.nOk+"/4",null,"neutre","file","FA6706"],
  ],1.7);
  const d2=x=>(Math.round(x*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:2});
  const tNot=[
    ["Profitabilité (30 %)",Math.round(sc.notation.prof)+" / 100"],
    ["Liquidité (30 %)",Math.round(sc.notation.liq)+" / 100"],
    ["Solvabilité (40 %)",Math.round(sc.notation.solv)+" / 100"],
    ["Note globale",sc.notation.global+" / 100"]];
  rpTable(sl,0.55,3.4,4.0,B.societe.toUpperCase()+" - Notation Findalyx",["Dimension","Note"],tNot,
    ["detail","detail","detail","sous_total"],new Set(),[2.7,1.2],8.5);
  const tAlt=[...sc.altman.comp.map(c=>[c.k,d2(c.v)]),["Z-Score","= "+sc.altman.z],["Zone de risque",sc.altman.zone]];
  rpTable(sl,4.75,3.4,4.35,B.societe.toUpperCase()+" - Altman Z\" (marchés émergents)",["Composante","Valeur"],tAlt,
    ["detail","detail","detail","detail","sous_total","detail"],new Set(),[3.0,1.2],8);
  const uB=(x,u)=>u==="%"?Math.round(x)+" %":(Math.round(x*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:2})+"×";
  const tBc=sc.bceao.crit.map(c=>[c.lib,uB(c.val,c.unite),c.seuil]);
  rpTable(sl,9.2,3.4,3.6,B.societe.toUpperCase()+" - BCEAO ("+sc.bceao.nOk+"/4 critères)",["Critère","Valeur","Norme"],tBc,
    ["detail","detail","detail","detail"],new Set([2]),[1.9,0.75,1.05],7.5);
  rpCadreComment(sl,0.55,5.75,12.25,1.1);
  rpPied(sl,mention,++page);
  /* qualité des résultats : isole les autres produits de l'EBITDA (factuel, sans interprétation) */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Qualité des résultats");
  rpTitre(sl,"Qualité des résultats (Quality of Earnings)");
  const qoe=[
    ["EBITDA reporté",...A.map(a=>rpFmt(v.EBITDA[a]))],
    ["(−) Autres produits (à examiner : récurrents ?)",...A.map(a=>rpFmt(v.AUTRES_PROD[a]))],
    ["= EBITDA d'exploitation courant",...A.map(a=>rpFmt(v.EBITDA[a]-(v.AUTRES_PROD[a]||0)))],
    ["Marge EBITDA reporté / CA",...A.map(a=>v.CA[a]?Math.round(v.EBITDA[a]/v.CA[a]*100)+" %":"-")],
    ["Marge EBITDA courant / CA",...A.map(a=>v.CA[a]?Math.round((v.EBITDA[a]-(v.AUTRES_PROD[a]||0))/v.CA[a]*100)+" %":"-")]];
  rpTable(sl,0.55,1.7,9.2,B.societe.toUpperCase()+" - Décomposition de l'EBITDA",[rpLib(),...fy],qoe,
    ["sous_total","detail","sous_total","detail","detail"],new Set(),[4.8,...A.map(()=>0.9)],9,
    "Isole la part de l'EBITDA provenant des autres produits (subventions, produits divers), à apprécier pour la récurrence. Retraitements détaillés dans l'application et le databook.");
  rpCadreComment(sl,0.55,4.65,12.25,1.95);
  rpPied(sl,mention,++page);
  /* ---------- 5. Annexes ---------- */
  rpSection(pptx,5,"Annexes",["Glossaire","Lexique financier"],mention,++page);
  rpGlossaire(pptx,B,mention,++page);
  rpLexique(pptx,B,mention,++page);
  rpContacts(pptx,B.cabinet,mention,++page);
}

/* ---------- RAPPORT BP ---------- */
function construireBP(pptx,opts){
  opts=opts||{};
  const {hyp,proj,val}=rpProj();   /* aligne ETATS (synthétique en mode modèle) avant rpBase */
  const mm=rpModele();
  const B=rpBase();
  const {A,v,a1,fy}=B;
  const ap=proj.annees;
  const fyp=ap.map(a=>libFY(a,true));
  /* formats et ratios communs aux états financiers et à la section covenants (mêmes formules
     que l'application) — déclarés ici car les sections de ratios des trois états les utilisent */
  /* négatifs entre parenthèses comme les montants : un tableau qui mélange « (12,6) » et
     « -42 % » se lit deux fois */
  const negP=(s,x)=>x<0?"("+s+")":s;
  const pctR=x=>(x==null||!isFinite(x))?"n.s.":negP(Math.round(Math.abs(x)*100)+" %",x);
  const jrR=x=>(x==null||!isFinite(x))?"n.s.":negP(Math.round(Math.abs(x))+" j",x);
  const mltR=x=>(x==null||!isFinite(x))?"n.s.":negP((Math.round(Math.abs(x)*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:2})+"×",x);
  const moisR=x=>(x==null||!isFinite(x))?"n.s.":negP((Math.round(Math.abs(x)*10)/10).toLocaleString("fr-FR",{maximumFractionDigits:1})+" mois",x);
  const rt=(num,den)=>(den&&isFinite(num/den))?num/den:null;
  /* TCAM de la période affichée (même calcul que l'application). Cellule VIDE quand le taux n'a
     pas de sens (bornes de signes opposés, base nulle) : une colonne de « n.s. » est du bruit ;
     la note du tableau dit à quelle condition le taux est calculé. */
  const tcamR=vals=>{const s=(typeof cagrCell==="function")?cagrCell(vals,rpPct):"";
    return (s==="n.s."?"":s);};
  /* colonne TCAM affichée seulement si elle porte vraiment de l'information : sur un tableau de
     flux, deux taux calculables sur quinze lignes ne valent pas une colonne */
  const tcamUtile=lg=>lg.filter(r=>String(r[r.length-1]||"").trim()).length>=Math.max(3,Math.ceil(lg.length/4));
  /* TVA du modèle : le DSO s'apprécie sur le CA facturé — HT si l'activité est exonérée */
  const tvaR=(hyp&&hyp.tvaExonere)?0:((hyp&&hyp.tva!=null)?+hyp.tva:0.18);
  const rhFit=n=>Math.min(0.24,4.95/(n+1));           /* hauteur de ligne : tient sous le pied de page */
  /* état + bloc de ratios accolé : hauteur de ligne commune aux deux tableaux (colonnes calées),
     calculée pour que l'ensemble — en-têtes, intervalle et note comprises — tienne sur la page
     à partir de l'ordonnée réellement disponible sous le titre-message */
  const rhDuo=(n,yTop)=>Math.min(0.24,Math.max(0.12,(6.45-(yTop||1.6)-0.5)/Math.max(1,n)));
  const trAct=a=>(proj.bs.TRESO_ACTIVE[a]!==undefined?proj.bs.TRESO_ACTIVE[a]:Math.max(0,proj.bs.TRESO[a]));
  const actifT=a=>proj.bs.IMMO_NET[a]+proj.bs.STOCKS[a]+proj.bs.CLIENTS[a]+proj.bs.AUTRES_CREANCES[a]+trAct(a);
  const cov=a=>{
    const service=(proj.dette[a].remboursement||0)+(proj.dette[a].interets||0)+(proj.dette[a].interetsCT||0);
    const cfads=proj.pl.EBITDA[a]+proj.pl.IS[a]+(proj.tft[a]?proj.tft[a].DBFR:0);
    const detteFin=proj.bs.DETTE[a]+((proj.bs.CCA&&proj.bs.CCA[a])||0)+(proj.bs.LIGNE_CT[a]||0);
    const detteNette=detteFin-trAct(a);
    const acCirc=proj.bs.STOCKS[a]+proj.bs.CLIENTS[a]+proj.bs.AUTRES_CREANCES[a]+trAct(a);
    const paCirc=-(proj.bs.FOURNISSEURS[a]+proj.bs.DETTES_FISC_SOC[a]+proj.bs.AUTRES_DETTES[a])+(proj.bs.LIGNE_CT[a]||0);
    /* un EBITDA proche de zéro rend les multiples non significatifs (levier à 70×) et un CFADS
       négatif ne « couvre » rien : on affiche n.s. plutôt qu'un multiple trompeur */
    const ebMat=proj.pl.EBITDA[a]>0.02*Math.abs(proj.pl.CA[a]||0);
    const lev=ebMat?detteNette/proj.pl.EBITDA[a]:null;
    return {dscr:(service>0.5&&cfads>0)?cfads/service:null, lev:(lev!=null&&Math.abs(lev)<=20)?lev:null,
      gear:proj.bs.CP[a]>0?detteFin/proj.bs.CP[a]:null, couv:proj.pl.FRAIS_FIN[a]<0&&ebMat?proj.pl.EBITDA[a]/-proj.pl.FRAIS_FIN[a]:null,
      liq:paCirc>0?acCirc/paCirc:null};};
  const mention=opts.mention||(B.societe+" - Business plan "+ap[0]+"-"+ap[ap.length-1]+" - "+B.dateTxt+" - Confidentiel"); RP_MENTION=mention;
  const S=opts.secBase||0; let page=opts.page||(opts.combine?1:2);   /* hors rapport combiné : page 2 = sommaire */
  if(!opts.combine){
    rpGarde(pptx,B.societe,"Rapport provisoire de Business Plan "+ap[0]+" – "+ap[ap.length-1],
      (mm?"Business plan — projet  |  Montants en "+rpLib():"Historique "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()),B.dateTxt,B.cabinet);
    if(RP_SOM_FIX) rpSommaire(pptx,B.societe,RP_SOM_FIX,mention);
    rpPreambule(pptx,B,mention,++page,
      "Le présent rapport présente le business plan de "+B.societe+" sur la période "+ap[0]+" à "+ap[ap.length-1]+", "+(mm?"construit à partir d'un modèle piloté par inducteurs (sans historique comptable)":"construit à partir de l'historique "+fy[0]+"–"+fy[fy.length-1])+". Il constitue un support de discussion préalable aux échanges avec le management.",
      (mm?"Les projections sont établies à partir d'inducteurs d'activité (volumes × prix), de coûts, de charges, d'investissements et d'un montage de financement paramétrés dans l'application. Le bilan prévisionnel est bouclé par la trésorerie ; toutes les hypothèses sont modifiables.":"Les projections sont établies à partir des balances historiques et d'hypothèses paramétrées dans l'application (croissance du CA, marges, BFR, investissements, financement). Le bilan prévisionnel est bouclé par la trésorerie ; toutes les hypothèses sont modifiables."));
  }
  rpSection(pptx,S+1,"Note de synthèse",["Résumé exécutif et trajectoire"],mention,++page);
  let sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Note de synthèse");
  /* titres-messages : la conclusion de la page dans le titre (convention des banques
     d'affaires) — la suite des titres doit se lire comme le raisonnement du dossier */
  const caD=proj.pl.CA[ap[0]], caF=proj.pl.CA[ap[ap.length-1]], ebF=proj.pl.EBITDA[ap[ap.length-1]];
  const tcamCA=(caD>0&&caF>0&&ap.length>1)?Math.pow(caF/caD,1/(ap.length-1))-1:null;
  const mgEbF=caF?ebF/caF:null;
  rpTitreMsg(sl,"Résumé exécutif","Le plan porte le chiffre d'affaires à "+rpMsgFmt(caF)
    +(tcamCA!==null?(" ("+rpPct(tcamCA)+" par an)"):"")+" et l'EBITDA à "+rpMsgFmt(ebF)
    +(mgEbF!==null?(", soit "+Math.round(mgEbF*100)+" % du chiffre d'affaires"):"")+" en "+fyp[fyp.length-1]+".");
  rpAssertion(sl,"Avec les hypothèses retenues, le chiffre d'affaires atteint "+
    rpFmt(proj.pl.CA[ap[ap.length-1]])+" "+rpLib()+" en "+fyp[fyp.length-1]+
    " et le résultat net "+rpFmt(proj.pl.RN[ap[ap.length-1]])+" "+rpLib()+".");
  rpCartes(sl,[
    ["CA "+fyp[fyp.length-1],rpFmt(proj.pl.CA[ap[ap.length-1]])+" "+rpLib(),
     mm?("scénario "+proj.scenario):("croissance "+rpPct(hyp.caCroiss[0])+"/an"),null,"neutre","chart","224289"],
    ["EBITDA "+fyp[fyp.length-1],rpFmt(proj.pl.EBITDA[ap[ap.length-1]])+" "+rpLib(),
     proj.pl.CA[ap[ap.length-1]]?Math.round(proj.pl.EBITDA[ap[ap.length-1]]/proj.pl.CA[ap[ap.length-1]]*100)+"% du CA":"",
     null,"neutre","coins","FA6706"],
    ["Résultat net cumulé",rpFmt(ap.reduce((s,a)=>s+proj.pl.RN[a],0))+" "+rpLib(),"sur l'horizon du plan",
     null,"neutre","file","172554"],
    ["Trésorerie fin "+fyp[fyp.length-1],rpFmt(proj.bs.TRESO_NETTE[ap[ap.length-1]])+" "+rpLib(),
     proj.bs.TRESO_NETTE[ap[ap.length-1]]<0?"position négative":"",null,
     proj.bs.TRESO_NETTE[ap[ap.length-1]]<0?"down":"up","wallet","16904E"],
  ]);
  const trj=["CA","EBITDA","RN"].map(c=>{
    const lib={CA:"Chiffre d'affaires",EBITDA:"EBITDA",RN:"Résultat net"}[c];
    const ch={CA:"CA",EBITDA:"EBITDA",RN:"RESULTAT_NET"}[c];
    return mm?[lib,...ap.map(a=>rpFmt(proj.pl[c][a]))]:[lib,rpFmt(v[ch][a1]),...ap.map(a=>rpFmt(proj.pl[c][a]))];
  });
  trj.push(mm?["Trésorerie nette",...ap.map(a=>rpFmt(proj.bs.TRESO_NETTE[a]))]:["Trésorerie nette",rpFmt(v.TRESORERIE_NETTE[a1]),...ap.map(a=>rpFmt(proj.bs.TRESO_NETTE[a]))]);
  const finTr=rpTable(sl,0.55,3.35,6.9,B.societe.toUpperCase()+" - Trajectoire",
    mm?[rpLib(),...fyp]:[rpLib(),fy[fy.length-1]+" (réel)",...fyp],trj,
    ["titre","total","sous_total","sous_total"],new Set(),
    [2.6,...Array((mm?0:1)+ap.length).fill(1.15)],9,
    "Source : projections Findalyx Advisory (hypothèses modifiables dans l'application)",0.28);
  rpColonnes(sl,7.65,3.35,5.15,2.1,"("+rpLib()+")",mm?[...fyp]:[fy[fy.length-1],...fyp],[
    {name:"CA",values:mm?ap.map(a=>proj.pl.CA[a]):[v.CA[a1],...ap.map(a=>proj.pl.CA[a])],color:"172554"},
    {name:"EBITDA",values:mm?ap.map(a=>proj.pl.EBITDA[a]):[v.EBITDA[a1],...ap.map(a=>proj.pl.EBITDA[a])],color:"2E5AAC"},
    {name:"RN",values:mm?ap.map(a=>proj.pl.RN[a]):[v.RESULTAT_NET[a1],...ap.map(a=>proj.pl.RN[a])],color:"8FAADC"}]);
  /* le cadre de commentaires prend la place restée vide SOUS le tableau (colonne de gauche) :
     le graphique ferme la colonne de droite */
  rpCommentReste(sl,0.55,finTr+0.2,6.9);
  rpPied(sl,mention,++page);
  /* rapport combiné : la synthèse de VALEUR s'insère ici, dans la même section « Note de
     synthèse » que le résumé du plan — un seul document, pas deux rapports accolés. */
  if(typeof opts.apresSynthese==="function") page=opts.apresSynthese(page);
  rpSection(pptx,S+2,"Présentation du projet et étude de marché",
    ["Structure du projet","Étude de marché"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Présentation du projet","Projet, structure et motivations",
    ["Description du projet et du promoteur","Structure juridique et actionnariat",
     "Motivations et objectifs du financement","Points d'attention"],mention,++page,{fiche:true});
  rpPlaceholder(pptx,B.societe,"Étude de marché","Étude de marché et positionnement",
    ["Marché et positionnement","Taille du marché et dynamique de croissance",
     "Concurrence et acteurs clés","Clientèle cible, canaux et différenciation"],mention,++page);
  /* hypothèses */
  rpSection(pptx,S+3,"Hypothèses",["Hypothèses opérationnelles et financières"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Hypothèses");
  rpTitreMsg(sl,"Hypothèses opérationnelles et financières",
    mm?("Le plan est construit à partir de "+((hyp.revenus||[]).length||1)+" ligne"+(((hyp.revenus||[]).length||1)>1?"s":"")+" de revenus (volumes × prix), d'une inflation de "
        +Math.round((hyp.inflation||0.03)*100)+" % et d'un financement de "+rpMsgFmt(proj.financement.sources)+".")
      :("Les hypothèses sont calées sur l'historique "+fy[0]+" – "+fy[fy.length-1]+" : croissance du chiffre d'affaires de "
        +rpPct(hyp.caCroiss[0])+" la première année et coûts directs à "+Math.round(hyp.coutsDirects_pct*100)+" % du chiffre d'affaires."));
  const lignesH=[],stylesH=[],notesH=[];
  const pcH=x=>(x*100).toFixed(1).replace(".0","").replace(".",",")+" %";   /* décimale française */
  const gH=(t,items)=>{lignesH.push([t,""]);stylesH.push("groupe");
    items.filter(Boolean).forEach(([l,x])=>{lignesH.push([l,x]);stylesH.push("detail");});};
  /* montant nul = ligne absente : « Primes liées au capital — MFCFA » n'apprend rien au lecteur */
  const mtH=x=>rpFmt(x)+" "+rpLib();
  const nzH=(l,x)=>(Math.abs(+x||0)>0.5)?[l,mtH(x)]:null;
  if(mm){
    const Pf=proj.financement, b=hyp.bfr||{};
    /* volumes et prix RÉELS plutôt que « volume × prix » : le lecteur doit voir les hypothèses,
       pas la mécanique. Ex. « 22 → 80 élèves · 230 000 F ». */
    const nb0=x=>Math.round(x).toLocaleString("fr-FR").replace(/ | /g," ");
    const volAn=(L,i)=>{try{return volInducteurs((L.rows||[]).filter(r=>String(r.unit||"").indexOf("%")<0&&!r.refLigne),i,{revenus:hyp.revenus,fCA:1});}catch(e){return 0;}};
    const uniteL=L=>{const r=(L.rows||[]).find(r=>String(r.unit||"").indexOf("%")<0&&r.unit);return r?(" "+r.unit):"";};
    const descRev=L=>{const N=(hyp.nb||5)-1, v0=volAn(L,0), vN=volAn(L,N);
      const p=(L.prix&&+L.prix.val)||0, g=(L.prix&&+L.prix.g)||0;
      return (v0?(nb0(v0)+(vN&&Math.abs(vN-v0)>0.5?(" → "+nb0(vN)):"")+uniteL(L)+" · "):"")+nb0(p)+" F"+(g?(" +"+g+" %/an"):"");};
    gH("Activité — volumes et prix unitaires",(hyp.revenus||[]).map(L=>[L.name||"Ligne de revenus",descRev(L)]));
    const descCout=cl=>{const m=cl.m||"ind";
      if(m==="pct")return (cl.pct||0)+" % du CA "+((cl.scope&&cl.scope!=="all")?"(d'une ligne)":"(total)");
      if(m==="unit")return nb0((+cl.val||0))+" F par unité de volume";
      const q=(function(){try{return volInducteurs(cl.rows,0,{revenus:hyp.revenus,fCA:1});}catch(e){return 0;}})();
      const t=(cl.prix&&+cl.prix.val)||0;
      return (q?(nb0(q)+" × "):"")+nb0(t)+" F"+((cl.prix&&cl.prix.unit)?(" "+cl.prix.unit.replace(/^FCFA\/?/,"/ ")):"");};
    if((hyp.coutsDirects||[]).length) gH("Coûts directs — quantités et taux",(hyp.coutsDirects||[]).map(cl=>[cl.name||"Coût direct",descCout(cl)]));
    gH("Coûts, charges & BFR",[
      ["Inflation des coûts unitaires",pcH(hyp.inflation||0.03)],
      ["Délais clients / stocks / fournisseurs",Math.round(b.dso||0)+" / "+Math.round(b.dio||0)+" / "+Math.round(b.dpo||0)+" j"],
      ["Taux d'IS",pcH(hyp.is_taux||0.30)]]);
    gH("Investissement & financement",[
      (Pf.dureeConstruction?["Durée de construction",Pf.dureeConstruction+" an(s)"]:null),
      ["Investissements (jusqu'à la mise en service)",mtH(Pf.capexFinance)],
      ["Financement — capital social",mtH(Pf.capital)],
      nzH("Financement — primes liées au capital",Pf.primes),
      (Math.abs(+Pf.cca||0)>0.5?["Financement — comptes courants d'associés",mtH(Pf.cca)+(Pf.ccaTaux?(" à "+pcH(Pf.ccaTaux)):"")]:null),
      nzH("Financement — dette bancaire",Pf.dette),
      nzH("Intérêts de construction capitalisés (IDC)",Pf.idc)]);
    /* situation d'ouverture : chiffres dans le tableau, réserves en note sous le tableau
       (un texte long dans une cellule s'enroule et fait déborder la diapositive) */
    { const O=Pf.ouverture||{};
      if(O.actif||O.passif){ gH("Situation d'ouverture (déclarée, non auditée)",[
        ["Trésorerie disponible",rpFmt(O.treso||0)+" "+rpLib()],
        ["Créances antérieures retenues",rpFmt(O.creances||0)+" "+rpLib()+((O.creancesBrut>O.creances)?(" / "+rpFmt(O.creancesBrut)+" facturés"):"")],
        ["… part jugée recouvrable",pcH(O.tauxRecouv||1)],
        ["Dettes d'ouverture (fournisseurs, fiscales, sociales)",rpFmt(O.dettes||0)+" "+rpLib()],
        ["Situation nette apportée",rpFmt(O.net||0)+" "+rpLib()]]);
        notesH.push("Situation d'ouverture : éléments déclarés par la direction, non audités et non exhaustifs ; l'écart éventuel relève d'une garantie d'actif et de passif ou d'un ajustement de prix au closing."
          +((O.actif&&!O.passif)?" Un actif d'ouverture est renseigné sans aucun passif : situation asymétrique, à justifier auprès de l'acquéreur.":""));
      }
    }
    if(planCheval()){ gH("Périodicité",[["Exercices présentés","années académiques"],["Millésime affiché","année d'ouverture de l'exercice"]]);
      notesH.push(MENTION_CHEVAL); }
    gH("Coût du capital",[
      ["WACC",val?pcH(val.wacc):"n.s."],
      ["Croissance à l'infini (g)",pcH((hyp.valo&&hyp.valo.g)||0.03)]]);
  } else {
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
    ["WACC",pcH(val.wacc)],
    ["Croissance à l'infini (g)",pcH(hyp.valo.g)]]);
  }
  /* PAGINATION : le tableau des hypothèses dépasse la hauteur utile dès ~21 lignes
     (rowH 0,24" à partir de y=1,6"). On le découpe en pages, sans jamais laisser un
     en-tête de groupe orphelin en bas de page. */
  /* hauteur utile : de y=1,6" au pied (~6,95") pour des lignes de 0,24" → 22 lignes rendues.
     Une valeur longue s'enroule : on compte son nombre de lignes réelles (~26 car. par ligne
     dans une colonne de 1,4"), et on ne laisse jamais un en-tête de groupe seul en bas de page. */
  const MAXL=21, hauteur=([lib,val])=>Math.max(1,Math.ceil(String(val||"").length/30),Math.ceil(String(lib||"").length/64));
  const hTot=lignesH.reduce((s,lg)=>s+hauteur(lg),0);
  /* pages équilibrées : hauteur cible = total ÷ nombre de pages nécessaires, plafonnée par MAXL
     (évite une dernière page presque vide), et jamais d'en-tête de groupe orphelin en fin de page */
  const cible=Math.min(MAXL,Math.ceil(hTot/Math.max(1,Math.ceil(hTot/MAXL)))+1);
  const pages=[];
  { let cur={l:[],s:[]}, h=0;
    for(let i=0;i<lignesH.length;i++){
      const hl=hauteur(lignesH[i]);
      const orphelin=(stylesH[i]==="sous_total"&&h+hl>=cible);
      if(cur.l.length&&(h+hl>cible||orphelin)){pages.push(cur);cur={l:[],s:[]};h=0;}
      cur.l.push(lignesH[i]);cur.s.push(stylesH[i]);h+=hl;
    }
    if(cur.l.length)pages.push(cur);
  }
  pages.forEach((pg,pi)=>{
    if(pi>0){ sl=pptx.addSlide(); rpEnTete(sl,B.societe,"Hypothèses");
      rpTitre(sl,"Hypothèses opérationnelles et financières (suite)"); }
    /* tableau resserré (le libellé et sa valeur ne sont plus séparés par 3 pouces de blanc) et
       cadre de commentaires élargi d'autant */
    rpTable(sl,0.55,1.6,6.9,B.societe.toUpperCase()+" - Hypothèses"+(pages.length>1?(" ("+(pi+1)+"/"+pages.length+")"):""),
      ["Hypothèse","Valeur"],pg.l,pg.s,new Set(),[4.6,2.0],8.5);
    /* réserves méthodologiques : sous le cadre de commentaires, sur la dernière page */
    if(pi===pages.length-1&&notesH.length)
      sl.addText(notesH.join(" "),{x:7.65,y:6.05,w:5.13,h:0.85,fontSize:7.5,italic:true,
        color:RP.G_CLAIR,fontFace:"Arial",valign:"top"});
    rpCadreComment(sl,7.65,1.6,5.13,(pi===pages.length-1&&notesH.length)?4.3:5.25);
    rpPied(sl,mention,++page);
  });
  /* projections */
  rpSection(pptx,S+4,"Projections financières",["Compte de résultat","Bilan et trésorerie"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Projections financières");
  const bascEb=rpBascule(ap,a=>proj.pl.EBITDA[a]);
  const yPL=rpTitreMsg(sl,"Compte de résultat prévisionnel",
    (bascEb&&bascEb!==ap[0])
      ?("L'EBITDA devient positif en "+libFY(bascEb,true)+" et atteint "+rpMsgFmt(ebF)
        +(mgEbF!==null?(", soit "+Math.round(mgEbF*100)+" % du chiffre d'affaires"):"")+" en "+fyp[fyp.length-1]+".")
      :("L'EBITDA progresse jusqu'à "+rpMsgFmt(ebF)
        +(mgEbF!==null?(", soit "+Math.round(mgEbF*100)+" % du chiffre d'affaires"):"")+", en "+fyp[fyp.length-1]+"."));
  proj.pl.FRAIS_GENERAUX={}; ap.forEach(a=>{proj.pl.FRAIS_GENERAUX[a]=(proj.pl.OPEX_TOTAL[a]||0)+(proj.pl.CHARGES_PERSONNEL[a]||0);});
  const codesP=[["CA","Chiffre d'affaires","titre"],["ACHATS","Coûts directs","sous_total"],
    ["MARGE_BRUTE","Marge brute","sous_total"],["AUTRES_PRODUITS","Autres produits","detail"],
    ["FRAIS_GENERAUX","Frais généraux","sous_total"],
    ["EBITDA","EBITDA","total"],["DOTATIONS","Dotations et reprises","detail"],
    ["EBIT","EBIT","sous_total"],["RESULTAT_FIN","Résultat financier","detail"],
    ["EBT","Résultat avant impôt","sous_total"],["IS","Impôt sur les sociétés","detail"],["RN","Résultat net","total"]];
  const histM={CA:"CA",ACHATS:"COUTS_DIRECTS",MARGE_BRUTE:"MARGE_BRUTE",AUTRES_PRODUITS:"AUTRES_PROD",
    FRAIS_GENERAUX:"FRAIS_GENERAUX",EBITDA:"EBITDA",DOTATIONS:"DA",EBIT:"EBIT",
    RESULTAT_FIN:"RESULTAT_FIN",EBT:"RESULTAT_AVANT_IMPOT",IS:"IMPOTS",RN:"RESULTAT_NET"};
  /* section de ratios intégrée au compte de résultat (structure d'exploitation en % du CA) */
  const cols=mm?ap:[...A,...ap];
  const gPL=(c,a)=>{const src=(!mm&&A.indexOf(a)>=0)?v[histM[c]]:proj.pl[c];return src?src[a]:null;};
  const lignesBP=codesP.map(([c,lib])=>{const vals=cols.map(a=>gPL(c,a));return [lib,...vals.map(rpFmt),tcamR(vals)];});
  const ratPL=[
    ["Croissance du chiffre d'affaires",...cols.map((a,k)=>{const p=k?gPL("CA",cols[k-1]):null;return p?pctR(gPL("CA",a)/p-1):"n.s.";})],
    ["Taux de marge brute",...cols.map(a=>pctR(rt(gPL("MARGE_BRUTE",a),gPL("CA",a))))],
    ["Frais généraux et personnel / CA",...cols.map(a=>pctR(rt(-gPL("FRAIS_GENERAUX",a),gPL("CA",a))))],
    ["Marge d'EBITDA",...cols.map(a=>pctR(rt(gPL("EBITDA",a),gPL("CA",a))))],
    ["Marge d'exploitation (EBIT)",...cols.map(a=>pctR(rt(gPL("EBIT",a),gPL("CA",a))))],
    ["Marge nette",...cols.map(a=>pctR(rt(gPL("RN",a),gPL("CA",a))))]];
  /* Le bloc de ratios est un tableau DISTINCT posé sous l'état, calé sur les mêmes colonnes
     (même x, mêmes largeurs) : les exercices tombent dans le même axe et l'on ne mélange plus
     dans une seule grille des montants (en-tête « MFCFA ») et des pourcentages. */
  const tcP=tcamUtile(lignesBP), coupeP=r=>tcP?r:r.slice(0,-1);
  const nCP=(mm?0:A.length)+ap.length;
  /* colonne de libellés élargie quand les exercices sont nombreux (historique + projections) :
     sinon « Frais généraux et personnel / CA » passe sur deux lignes */
  const largP=[nCP>6?3.2:2.6,...Array(nCP).fill(nCP>6?0.92:1.05),...(tcP?[nCP>6?0.92:1.0]:[])];
  const setHP=mm?new Set():new Set(Array.from({length:A.length},(_,k)=>1+k));
  const rhP=rhDuo(rpFiltrer(lignesBP,codesP.map(x=>x[2])).L.length+ratPL.length+2,yPL);
  const finP=rpTable(sl,0.55,yPL+0.1,7.9,B.societe.toUpperCase()+" - P&L prévisionnel",
    (mm?[rpLib(),...fyp]:[rpLib(),...fy,...fyp]).concat(tcP?["TCAM"]:[]),
    lignesBP.map(coupeP),codesP.map(x=>x[2]),setHP,largP,8,null,rhP,{compact:true});
  rpTable(sl,0.55,finP+0.14,7.9,null,
    ["Ratios d'exploitation",...Array(nCP+(tcP?1:0)).fill("")],
    ratPL.map(r=>coupeP(r.concat(""))),ratPL.map(()=>"pct"),setHP,largP,8,
    (mm?"Projections issues du modèle d'inducteurs ; bilan bouclé par la trésorerie."
       :"Colonnes bleutées : historique reconstitué ; autres : projections.")
    +(tcP?" TCAM calculé lorsque les deux bornes du plan sont de même signe.":""),
    rhP,{enteteClair:true,compact:true});
  rpCadreComment(sl,8.65,yPL+0.1,4.15,6.6-yPL);
  rpPied(sl,mention,++page);
  /* bilan & trésorerie prévisionnels */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Projections financières");
  const bascTr=rpBascule(ap,a=>proj.bs.TRESO_NETTE[a]);
  const yBS=rpTitreMsg(sl,"Bilan et trésorerie prévisionnels",
    "Les capitaux propres atteignent "+rpMsgFmt(proj.bs.CP[ap[ap.length-1]])+" en "+fyp[fyp.length-1]
    +((bascTr&&bascTr!==ap[0])?(" et la trésorerie nette redevient positive en "+libFY(bascTr,true)+".")
      :(bascTr?" ; la trésorerie nette reste positive sur tout l'horizon.":" ; la trésorerie nette reste négative sur l'horizon du plan.")));
  /* intertitres « Emplois / Ressources » : le lecteur voit d'un coup l'actif économique d'un côté,
     son financement de l'autre — sans quoi la liste des grandes masses paraît sans ordre */
  const bsD=[["Emplois — actif économique",null,"groupe"],
    ["Immobilisations nettes",a=>proj.bs.IMMO_NET[a],"sous_total"],
    ["Stocks",a=>proj.bs.STOCKS[a],"detail"],
    ["Créances clients",a=>proj.bs.CLIENTS[a],"detail"],
    ["Autres créances",a=>proj.bs.AUTRES_CREANCES[a],"detail"],
    ["Dettes fournisseurs",a=>proj.bs.FOURNISSEURS[a],"detail"],
    ["Dettes fiscales et sociales",a=>proj.bs.DETTES_FISC_SOC[a],"detail"],
    ["Autres dettes",a=>proj.bs.AUTRES_DETTES[a],"detail"],
    ["Besoin en fonds de roulement",a=>proj.bs.BFR[a],"sous_total"],
    ["Trésorerie nette",a=>proj.bs.TRESO_NETTE[a],"sous_total"],
    ["Ressources — financement",null,"groupe"],
    ["Capitaux propres",a=>proj.bs.CP[a],"total"],
    ["Comptes courants d'associés",a=>(proj.bs.CCA&&proj.bs.CCA[a])||0,"detail"],
    ["Dettes financières",a=>proj.bs.DETTE[a],"sous_total"],
    ["Provisions pour risques et charges",a=>proj.bs.PROVISIONS[a],"detail"]];
  const bsP=bsD.map(([lib,f])=>{if(!f)return [lib,...ap.map(()=>""),""];
    const vals=ap.map(f);return [lib,...vals.map(rpFmt),tcamR(vals)];});
  /* section de ratios intégrée au bilan (structure financière et rotation) */
  const ratBS=[
    ["Besoin en fonds de roulement (jours de CA)",...ap.map(a=>jrR(rt(proj.bs.BFR[a]*360,proj.pl.CA[a])))],
    ["Délai de règlement clients (DSO)",...ap.map(a=>jrR(rt(proj.bs.CLIENTS[a]*360,proj.pl.CA[a]*(1+tvaR))))],
    ["Autonomie financière (capitaux propres / total bilan)",...ap.map(a=>pctR(rt(proj.bs.CP[a],actifT(a))))],
    /* le gearing intègre le découvert (compris dans la trésorerie nette du bilan) : le préciser,
       sinon le lecteur compare le ratio à une ligne « Dettes financières » à zéro */
    ["Gearing (dette et découvert / capitaux propres)",...ap.map(a=>mltR(cov(a).gear))],
    ["Dette nette / EBITDA",...ap.map(a=>mltR(cov(a).lev))],
    ["Rentabilité des capitaux propres (ROE)",...ap.map(a=>pctR(rt(proj.pl.RN[a],proj.bs.CP[a])))]];
  const tcB=tcamUtile(bsP), coupeB=r=>tcB?r:r.slice(0,-1);
  const largB=[3.4,...ap.map(()=>0.86),...(tcB?[0.95]:[])];
  const rhB=rhDuo(rpFiltrer(bsP,bsD.map(d=>d[2])).L.length+ratBS.length+2,yBS);
  const finB=rpTable(sl,0.55,yBS+0.1,7.9,B.societe.toUpperCase()+" - Bilan prévisionnel (grandes masses)",
    [rpLib(),...fyp].concat(tcB?["TCAM"]:[]),bsP.map(coupeB),bsD.map(d=>d[2]),
    new Set(),largB,8,null,rhB,{compact:true});
  rpTable(sl,0.55,finB+0.14,7.9,null,
    ["Ratios de structure financière",...Array(ap.length+(tcB?1:0)).fill("")],
    ratBS.map(r=>coupeB(r.concat(""))),ratBS.map(()=>"pct"),new Set(),largB,8,
    "Source : projections Findalyx Advisory. Les lignes nulles sur toute la période ne sont pas reprises.",
    rhB,{enteteClair:true,compact:true});
  rpCadreComment(sl,8.65,yBS+0.1,4.15,6.6-yBS);
  rpPied(sl,mention,++page);
  /* TFT prévisionnel */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Projections financières");
  const bascOp=rpBascule(ap,a=>proj.tft[a].ZB);
  const yTF=rpTitreMsg(sl,"Tableau des flux de trésorerie prévisionnel",
    ((bascOp&&bascOp!==ap[0])?("Les flux d'exploitation deviennent positifs en "+libFY(bascOp,true)+" ; l"):"L")
    +"a trésorerie de clôture atteint "+rpMsgFmt(proj.tft[ap[ap.length-1]].CLOTURE)+" en "+fyp[fyp.length-1]+".");
  /* Trois blocs (exploitation / investissement / financement) comme dans l'application : un flux
     de financement ne doit pas apparaître sans ses composantes — l'augmentation de capital, la
     subvention et les comptes courants manquaient, le sous-total semblait sorti de nulle part. */
  const tftD=[["Activités opérationnelles",null,"groupe"],
    ["Capacité d'autofinancement (CAFG)","FA","detail"],
    ["Variation des créances","VAR_CREANCES","detail"],
    ["Variation des stocks","FC","detail"],
    ["Variation des dettes d'exploitation","FE","detail"],
    ["Flux opérationnels","ZB","sous_total"],
    ["Activités d'investissement",null,"groupe"],
    ["Acquisitions d'immobilisations","ACQUIS_IMMO","detail"],
    ["Cessions d'immobilisations","CESSION_IMMO","detail"],
    ["Flux d'investissement","ZC","sous_total"],
    ["Activités de financement",null,"groupe"],
    ["Augmentation de capital","FK","detail"],
    ["Subvention d'investissement","FL","detail"],
    ["Comptes courants d'associés (net)",t=>(t.CCA_TIR||0)+(t.CCA_REMB||0),"detail"],
    ["Nouveaux emprunts","EMPRUNT","detail"],
    ["Remboursements d'emprunts","REMBOURS","detail"],
    ["Dividendes versés","FN","detail"],
    ["Flux de financement","ZFIN","sous_total"],
    ["Variation nette de trésorerie","ZF","sous_total"],
    ["Trésorerie d'ouverture","OUVERTURE","detail"],
    ["Trésorerie de clôture","CLOTURE","total"]];
  const tfV=(a,k)=>{const t=proj.tft[a]||{};return (typeof k==="function")?k(t):(t[k]||0);};
  const tftL=tftD.map(d=>{if(!d[1])return [d[0],...ap.map(()=>""),""];
    const vals=ap.map(a=>tfV(a,d[1]));return [d[0],...vals.map(rpFmt),tcamR(vals)];});
  /* section de ratios intégrée au tableau de flux (conversion en trésorerie et service de la dette) */
  const chExp=a=>-((proj.pl.ACHATS[a]||0)+(proj.pl.OPEX_TOTAL[a]||0)+(proj.pl.CHARGES_PERSONNEL[a]||0));
  const conv=a=>{const c=rt(proj.tft[a].ZB,proj.pl.EBITDA[a]);
    return (proj.pl.EBITDA[a]>0.02*Math.abs(proj.pl.CA[a]||0)&&c!=null&&Math.abs(c)<=3)?c:null;};
  const ratTF=[
    ["Conversion de l'EBITDA en trésorerie",...ap.map(a=>pctR(conv(a)))],
    ["Investissements / chiffre d'affaires",...ap.map(a=>pctR(rt(-proj.tft[a].ACQUIS_IMMO,proj.pl.CA[a])))],
    ["Flux de trésorerie disponible (exploitation − investissement)",...ap.map(a=>rpFmt(proj.tft[a].ZB+proj.tft[a].ZC))],
    ["Couverture du service de la dette (DSCR)",...ap.map(a=>mltR(cov(a).dscr))],
    ["Trésorerie de clôture (mois de charges d'exploitation)",...ap.map(a=>{const t=proj.tft[a].CLOTURE;
      return t>0?moisR(rt(t*12,chExp(a))):"n.s.";})]];
  const stTF=tftD.map(d=>d[2]);
  const tcT=tcamUtile(tftL), coupeT=r=>tcT?r:r.slice(0,-1);
  const largT=[3.4,...ap.map(()=>0.86),...(tcT?[0.95]:[])];
  const rhT=rhDuo(rpFiltrer(tftL,stTF).L.length+ratTF.length+2,yTF);
  const finT=rpTable(sl,0.55,yTF+0.1,7.9,B.societe.toUpperCase()+" - TFT prévisionnel",
    [rpLib(),...fyp].concat(tcT?["TCAM"]:[]),tftL.map(coupeT),stTF,
    new Set(),largT,8,null,rhT,{compact:true});
  rpTable(sl,0.55,finT+0.14,7.9,null,
    ["Ratios de flux",...Array(ap.length+(tcT?1:0)).fill("")],
    ratTF.map(r=>coupeT(r.concat(""))),ratTF.map(()=>"pct"),new Set(),largT,8,
    "Source : projections Findalyx Advisory (bilan bouclé par la trésorerie). Les lignes nulles sur toute la période ne sont pas reprises.",
    rhT,{enteteClair:true,compact:true});
  rpCadreComment(sl,8.65,yTF+0.1,4.15,6.6-yTF);
  rpPied(sl,mention,++page);
  /* ---------- 5. Analyse & covenants ---------- */
  rpSection(pptx,S+5,"Analyse & covenants",["Seuil de rentabilité","Ratios prévisionnels et covenants bancaires"],mention,++page);
  /* seuil de rentabilité (point mort d'exploitation, EBIT = 0) — mêmes formules que l'application */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Analyse & covenants");
  const sr=a=>{const ca=proj.pl.CA[a],taux=ca?proj.pl.MARGE_BRUTE[a]/ca:0;
    const fixes=-((proj.pl.AUTRES_PROD[a]||0)+(proj.pl.OPEX_TOTAL[a]||0)+(proj.pl.CHARGES_PERSONNEL[a]||0)+(proj.pl.DA[a]||0));
    const seuil=taux?fixes/taux:0;
    return {ca,taux,fixes,seuil,pm:ca?seuil/ca*360:NaN,marge:ca?(ca-seuil)/ca:NaN,levier:proj.pl.EBIT[a]?proj.pl.MARGE_BRUTE[a]/proj.pl.EBIT[a]:NaN};};
  const srRows=[
    ["Chiffre d'affaires",...ap.map(a=>rpFmt(sr(a).ca))],
    ["Taux de marge sur coûts variables",...ap.map(a=>pctR(sr(a).taux))],
    ["Charges fixes (nettes des autres produits)",...ap.map(a=>rpFmt(sr(a).fixes))],
    ["Seuil de rentabilité (CA critique)",...ap.map(a=>rpFmt(sr(a).seuil))],
    ["Point mort (jours de CA)",...ap.map(a=>jrR(sr(a).pm))],
    ["Marge de sécurité",...ap.map(a=>pctR(sr(a).marge))],
    ["Levier opérationnel",...ap.map(a=>mltR(sr(a).levier))]];
  const anPM=ap.filter(a=>sr(a).marge>0)[0];
  const yPM=rpTitreMsg(sl,"Seuil de rentabilité (point mort d'exploitation)",
    anPM?("Le point mort est franchi en "+libFY(anPM,true)+", avec une marge de sécurité de "
          +Math.round(sr(ap[ap.length-1]).marge*100)+" % en fin de plan.")
        :"Le seuil de rentabilité n'est pas atteint sur l'horizon du plan : le chiffre d'affaires reste inférieur au CA critique.");
  /* tableau sur toute la largeur utile, cadre de commentaires juste dessous : un tableau court
     posé à gauche laissait une bande blanche au milieu de la page */
  const finS=rpTable(sl,0.55,yPM+0.2,12.23,B.societe.toUpperCase()+" - Seuil de rentabilité",
    [rpLib(),...fyp],srRows,["titre","detail","detail","sous_total","detail","detail","detail"],
    new Set(),[4.6,...ap.map(()=>1.2)],9,
    "Point mort où le résultat d'exploitation s'annule : coûts directs = charges variables ; frais généraux, personnel et dotations = charges fixes.");
  rpCommentReste(sl,0.55,finS+0.18,12.23);
  rpPied(sl,mention,++page);
  /* ratios prévisionnels & covenants bancaires — mêmes formules que l'application */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Analyse & covenants");
  const detteMax=Math.max.apply(null,ap.map(a=>proj.bs.DETTE[a]+(proj.bs.LIGNE_CT[a]||0)));
  const levs=ap.map(a=>cov(a).lev).filter(x=>x!=null), dscrs=ap.map(a=>cov(a).dscr).filter(x=>x!=null);
  const yCv=rpTitreMsg(sl,"Ratios prévisionnels et covenants bancaires",
    detteMax<0.5
      ?"Le plan ne mobilise aucune dette bancaire : les covenants usuels ne sont pas testés, la liquidité générale reste le seul indicateur suivi."
      :("Sur l'horizon, le levier culmine à "+mltR(Math.max.apply(null,levs.concat([0])))
        +(dscrs.length?(" et le DSCR ressort au minimum à "+mltR(Math.min.apply(null,dscrs))):"")+"."));
  const covRows=[
    ["DSCR — couverture du service de la dette","≥ 1,2×",...ap.map(a=>mltR(cov(a).dscr))],
    ["Dette nette / EBITDA","≤ 3,5×",...ap.map(a=>mltR(cov(a).lev))],
    ["Gearing (dette fin. / capitaux propres)","≤ 1,5×",...ap.map(a=>mltR(cov(a).gear))],
    ["Couverture des intérêts (EBITDA / frais fin.)","≥ 3×",...ap.map(a=>mltR(cov(a).couv))],
    ["Liquidité générale","≥ 1×",...ap.map(a=>mltR(cov(a).liq))]];
  const finC=rpTable(sl,0.55,yCv+0.2,12.23,B.societe.toUpperCase()+" - Ratios prévisionnels et covenants bancaires",
    ["Covenant","Norme usuelle",...fyp],covRows,covRows.map(()=>"detail"),
    new Set([1]),[5.0,1.5,...ap.map(()=>1.05)],9,
    "CFADS = EBITDA − impôt − variation du BFR ; service de la dette = remboursements + intérêts (dette et découvert). Normes = seuils bancaires usuels, à comparer aux valeurs projetées.");
  rpCommentReste(sl,0.55,finC+0.18,12.23);
  rpPied(sl,mention,++page);
  /* ---------- 6. Annexes ---------- */
  if(!opts.combine){
    rpSection(pptx,S+6,"Annexes",["Glossaire","Lexique financier"],mention,++page);
    rpGlossaire(pptx,B,mention,++page);
    rpLexique(pptx,B,mention,++page);
    rpContacts(pptx,B.cabinet,mention,++page);
  }
  return page;
}

/* ---------- RAPPORT VALO ---------- */
function construireValo(pptx,opts){
  opts=opts||{};
  const {hyp,proj,val}=rpProj();   /* aligne ETATS (synthétique en mode modèle) avant rpBase */
  const mm=rpModele();
  const B=rpBase();
  const {A,v,a1,fy}=B;
  const Vh=hyp.valo;
  const ap=proj.annees;
  const fyp=ap.map(a=>libFY(a,true));
  const mention=opts.mention||(B.societe+" - Évaluation financière au 31/12/"+a1+" - Confidentiel"); RP_MENTION=mention;
  const S=opts.secBase||0; let page=opts.page||(opts.combine?1:2);   /* hors rapport combiné : page 2 = sommaire */
  /* méthodes retenues = les plus utilisées : DCF, comparables, transactions, actif net */
  const ORD=["dcf","comp","trans","anr"], COURT={dcf:"DCF",comp:"Comparables",trans:"Transactions",anr:"Actif net"};
  const mKey={}; (val.methodes||[]).forEach(m=>{mKey[m.id]=m;});
  const mCles=ORD.map(id=>mKey[id]).filter(Boolean);
  const gordon=val.tvMode!=="exit";
  const tvTxt=(gordon?"Gordon, g "+rpPct(val.g):"multiple de sortie "+(Vh.exitMultiple||0).toFixed(1)+"× EBITDA")+(Vh.midYear?" ; actualisation mi-année":"");
  const pct1=x=>isFinite(x)?(x*100).toFixed(1).replace(".",",")+" %":"-";   /* taux à une décimale (build-up, axes de sensibilité) */
  if(!opts.combine){
    rpGarde(pptx,B.societe,mm?"Rapport provisoire d'évaluation financière":"Rapport provisoire d'évaluation financière au 31/12/"+a1,
      (mm?"Business plan — projet  |  Montants en "+rpLib():"Historique "+fy[0]+" – "+fy[fy.length-1]+"  |  Montants en "+rpLib()),B.dateTxt,B.cabinet);
    if(RP_SOM_FIX) rpSommaire(pptx,B.societe,RP_SOM_FIX,mention);
    rpPreambule(pptx,B,mention,++page,
      "Le présent rapport présente l'évaluation financière des fonds propres de "+B.societe+(mm?"":" au 31/12/"+a1)+", à partir des projections issues du business plan. Il constitue un support de discussion préalable aux échanges avec le management.",
      "L'évaluation combine l'actualisation des flux de trésorerie disponibles (DCF, valeur terminale de "+tvTxt+"), les multiples de marché (comparables et transactions) et l'actif net. Les flux et le coût du capital sont paramétrés dans l'application et modifiables.");
  }
  /* ---------- 1. Synthèse multi-méthodes ----------
     En rapport combiné (BP + Valo), cette synthèse ne forme PAS une seconde section
     « Note de synthèse » : elle est rendue dans la section 1 du document, juste après le
     résumé du plan (opts.sansSection), pour un rapport réellement fusionné. */
  let sl;
  if(!opts.sansSynthese){
  if(!opts.sansSection) rpSection(pptx,S+1,"Note de synthèse",["Synthèse multi-méthodes"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Note de synthèse");
  { const ret=(val.methodes||[]).filter(m=>m.applicable!==false);
    const nEc=(val.methodes||[]).length-ret.length;
    /* fourchette = bornes des méthodes RETENUES (celles du football field), pas la fourchette
       pondérée qui se réduit à un point dès qu'une seule méthode est applicable */
    const bMin=ret.length?Math.min.apply(null,ret.map(m=>m.min)):val.fourchette.min;
    const bMax=ret.length?Math.max.apply(null,ret.map(m=>m.max)):val.fourchette.max;
    rpTitreMsg(sl,opts.sansSection?"Synthèse de valeur — fonds propres":("Synthèse d'évaluation des fonds propres"+(mm?"":" au 31/12/"+a1)),
      "La valeur des fonds propres ressort à "+rpMsgFmt(val.fourchette.retenue)+" ("
      +rpFmt(bMin)+" – "+rpFmt(bMax)+"), "
      +(ret.length>1?("sur la base de "+ret.length+" méthodes concordantes")
        :("une seule méthode étant applicable"))
      +(nEc?(" ; "+nEc+" méthode"+(nEc>1?"s écartées":" écartée")):"")+"."); }
  /* une méthode écartée par le moteur n'affiche pas de montant : « n.a. » et le motif */
  const carte=(m,def)=>(m&&m.applicable===false)?"n.a.":(rpFmt((m&&m.central)!==undefined?m.central:def)+" "+rpLib());
  const sousC=(m,txt)=>(m&&m.applicable===false)?(m.motif||"méthode écartée"):txt;
  rpCartes(sl,[
    ["Fonds propres — DCF",rpFmt(val.equityDcf)+" "+rpLib(),"WACC "+rpPct(val.wacc),null,"neutre","coins","FA6706"],
    ["Comparables (central)",carte(mKey.comp,val.equityMult),sousC(mKey.comp,val.multiple.toFixed(1)+"× EBITDA"),null,"neutre","chart","224289"],
    ["Actif net",carte(mKey.anr,val.anrBase),sousC(mKey.anr,"approche patrimoniale"),null,"neutre","file","172554"],
    ["Valeur retenue",rpFmt(val.fourchette.retenue)+" "+rpLib(),"moyenne des méthodes applicables",null,"neutre","wallet","16904E"],
  ],1.7);
  /* le motif de l'écartement va en note : dans la cellule, il ferait passer la ligne sur deux
     hauteurs et le tableau déborderait sur sa propre source */
  const synth=mCles.map(m=>(m.applicable===false)
    ?[m.lib+" — écartée","n.a.","n.a.","n.a."]
    :[m.lib,rpFmt(m.min),rpFmt(m.central),rpFmt(m.max)]);
  const ecartees=mCles.filter(m=>m.applicable===false);
  const noteSynth="Source : valorisation multi-méthodes Findalyx Advisory."
    +(ecartees.length?" Écartée(s) de la valeur retenue : "+ecartees.map(m=>COURT[m.id]+" ("+(m.motif||"")+")").join(" · ")+" ; poids redistribué.":"");
  synth.push(["Valeur retenue (pondérée)",rpFmt(val.fourchette.min),rpFmt(val.fourchette.retenue),rpFmt(val.fourchette.max)]);
  const finV=rpTable(sl,0.55,3.35,6.6,B.societe.toUpperCase()+" - Fourchettes de valeur par méthode",
    [rpLib(),"Bas","Central","Haut"],synth,[...mCles.map(()=>"detail"),"total"],
    new Set([2]),[3.4,1.2,1.2,1.2],9.5,noteSynth,0.3);
  /* football field : la fourchette de CHAQUE méthode sur un axe commun, la zone de recoupement
     et la valeur retenue en repère — c'est la page que le lecteur regarde en premier */
  const mFF=mCles.filter(m=>m.applicable!==false).map(m=>({lib:COURT[m.id],min:m.min,central:m.central,max:m.max}));
  { const ovL=mFF.length>1&&Math.min.apply(null,mFF.map(m=>m.max))>Math.max.apply(null,mFF.map(m=>m.min));
    rpFootball(sl,7.35,3.09,5.43,2.9,"Fourchettes par méthode",mFF,val.fourchette.retenue,
      (ovL?"Zone bleutée : plage sur laquelle toutes les méthodes retenues se recoupent. "
        :(mFF.length>1?"Les méthodes retenues ne se recoupent pas sur une plage commune. "
                      :"Une seule méthode applicable. "))
      +"Losange : valeur centrale · trait orange : valeur retenue."); }
  rpCommentReste(sl,0.55,finV+0.16,6.6);
  rpPied(sl,mention,++page);
  if(opts.synthSeule) return page;   /* rapport combiné : la suite est rendue plus loin */
  }
  /* ---------- 2. DCF : coût du capital, flux, passage aux fonds propres ---------- */
  const sousDcf=["Coût du capital et flux actualisés","Analyse de sensibilité"];
  rpSection(pptx,S+2,"Approche par les flux (DCF)",sousDcf,mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Approche par les flux (DCF)");
  const yW0=rpTitreMsg(sl,"Coût du capital et actualisation des flux",
    "Un coût du capital de "+rpPct(val.wacc)+" ramène les flux du plan et la valeur terminale à "
    +rpMsgFmt(val.ev)+" de valeur d'entreprise, soit "+rpMsgFmt(val.equityDcf)+" de fonds propres.");
  const wacc=[
    ["Taux sans risque (rf)",pct1(Vh.rf)],
    ["Prime de marché × β ("+(Vh.beta||1).toFixed(2).replace(".",",")+")",pct1((Vh.beta||1)*Vh.primeMarche)],
    ["Prime de risque spécifique (pays, taille, illiquidité)",pct1(val.primeSpe)],
    ["= Coût des fonds propres (ke)",pct1(val.ke)],
    ["Coût de la dette après impôt (kd)",pct1(val.kd)],
    ["Poids de la dette dans le financement",pct1(Vh.poidsDette)],
    ["= Coût moyen pondéré du capital (WACC)",pct1(val.wacc)]];
  const finW=rpTable(sl,0.55,yW0+0.3,5.7,B.societe.toUpperCase()+" - Coût du capital (build-up)",
    ["Composante","Taux"],wacc,wacc.map(r=>/^=/.test(r[0])?"total":"detail"),
    new Set(),[4.4,1.3],9,null,0.28);
  const fcf=[["FCFF",...ap.map(a=>rpFmt(val.fcff[a]))],
             ["FCFF actualisés",...ap.map(a=>rpFmt(val.pv[a]))]];
  const finF=rpTable(sl,6.5,yW0+0.3,6.28,"Flux de trésorerie disponibles (FCFF)",
    [rpLib(),...fyp],fcf,["detail","sous_total"],new Set(),
    [1.8,...Array(ap.length).fill(0.9)],9,null,0.28);
  const brg=[["Somme des FCFF actualisés",rpFmt(val.sommePv)],
    ["Valeur terminale actualisée ("+tvTxt+")",rpFmt(val.vtPv)],
    ["= Valeur d'entreprise (EV)",rpFmt(val.ev)],
    [(val.dateValo==="ouverture"?"(−) Dette nette à la date de valorisation (situation d'ouverture)":"(−) Dette nette au 31/12/"+a1),rpFmt(-val.detteNette)],
    (Math.abs(val.bridgeAjust)>0.5?["(±) Ajustements du pont (provisions, etc.)",rpFmt(val.bridgeAjust)]:null),
    ["= Valeur des fonds propres (DCF)",rpFmt(val.equityDcf)]].filter(Boolean);
  const finB2=rpTable(sl,6.5,finF+0.55,6.28,"Passage valeur d'entreprise → fonds propres",
    [rpLib(),"Valeur"],brg,brg.map(r=>/^=/.test(r[0])?"total":"detail"),
    new Set(),[4.4,1.9],9,null,0.28);
  /* cadre sous les DEUX colonnes : le bas de page restait vide à droite */
  rpCommentReste(sl,0.55,Math.max(finW,finB2)+0.3,12.23);
  rpPied(sl,mention,++page);
  /* sensibilité : WACC × pilote de la valeur terminale (g en Gordon, multiple de sortie en exit) */
  {
    sl=pptx.addSlide();
    rpEnTete(sl,B.societe,"Approche par les flux (DCF)");
    let ySe0=1.6;
    { const pl=(val.sensi||[]).reduce((t,l)=>t.concat(l.filter(x=>isFinite(x))),[]);
      ySe0=rpTitreMsg(sl,"Sensibilité de la valeur des fonds propres",pl.length
        ?("La valeur des fonds propres reste comprise entre "+rpFmt(Math.min.apply(null,pl))+" et "
          +rpMsgFmt(Math.max.apply(null,pl))+" pour ±100 pb de WACC et "+(gordon?"±100 pb de croissance perpétuelle":"±1× de multiple de sortie")+".")
        :""); }
    const axes=val.sensiAxes||{wacc:[-0.01,-0.005,0,0.005,0.01].map(d=>val.wacc+d),colType:"g",col:[-0.01,-0.005,0,0.005,0.01].map(d=>val.g+d)};
    const colLbl=x=>axes.colType==="multiple"?(Math.round(x*10)/10)+"×":pct1(x);
    const entS=[gordon?"WACC \\ g":"WACC \\ mult.",...axes.col.map(colLbl)];
    const rowsS=(val.sensi||[]).map((ligne,i)=>[pct1(axes.wacc[i]),...ligne.map(x=>rpFmt(x))]);
    const finSe=rpTable(sl,0.55,ySe0+0.35,12.23,B.societe.toUpperCase()+" - Valeur des fonds propres selon le WACC et "+(gordon?"la croissance perpétuelle g":"le multiple de sortie"),
      entS,rowsS,rowsS.map((r,i)=>i===2?"sous_total":"detail"),new Set([3]),
      [2.1,...axes.col.map(()=>1.2)],9.5,"Chaque cellule = valeur des fonds propres (EV actualisée − dette nette + ajustements du pont). Ligne et colonne centrales = hypothèses retenues.",0.3,{centre:true});
    rpCommentReste(sl,0.55,finSe+0.18,12.23);
    rpPied(sl,mention,++page);
  }
  /* ---------- 3. Multiples de marché & actif net ---------- */
  rpSection(pptx,S+3,"Approches de marché et patrimoniale",["Comparables, transactions et actif net"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Approches de marché et patrimoniale");
  let yMu0=1.6;
  { const okM=(mKey.comp&&mKey.comp.applicable!==false), okA=(mKey.anr&&mKey.anr.applicable!==false);
    yMu0=rpTitreMsg(sl,"Multiples de marché et actif net",okM
      ?("Les multiples de marché situent les fonds propres entre "+rpFmt(mKey.comp.min)+" et "
        +rpMsgFmt(mKey.trans?mKey.trans.max:mKey.comp.max)
        +(okA?(", l'actif net réévalué à "+rpMsgFmt(mKey.anr.central)):"")+".")
      :("Les approches analogiques ne sont pas applicables : "+((mKey.comp&&mKey.comp.motif)||"EBITDA de référence non significatif")
        +(okA?(" ; l'actif net réévalué ressort à "+rpMsgFmt(mKey.anr.central)):", et l'actif net n'est pas documenté")+".")); }
  const mc=Vh.multiplesComparables, mt=Vh.multiplesTransactions;
  const na=m=>(m&&m.applicable===false)?"n.a.":null;
  const fm=(m,k)=>na(m)||rpFmt(m&&m[k]);
  const xR=x=>(Math.round((+x||0)*10)/10).toLocaleString("fr-FR",{minimumFractionDigits:1})+"×";
  const tMult=[
    [(val.dateValo==="ouverture"?"EBITDA de référence (1re année du plan)":"EBITDA de référence "+fy[fy.length-1]),rpFmt(val.ebitdaRef),"",""],
    ["Comparables — EV/EBITDA",xR(mc.min),xR(mc.central),xR(mc.max)],
    ["→ fonds propres induits",fm(mKey.comp,"min"),fm(mKey.comp,"central"),fm(mKey.comp,"max")],
    ["Transactions — EV/EBITDA",xR(mt.min),xR(mt.central),xR(mt.max)],
    ["→ fonds propres induits",fm(mKey.trans,"min"),fm(mKey.trans,"central"),fm(mKey.trans,"max")]];
  const finM=rpTable(sl,0.55,yMu0+0.3,8.2,B.societe.toUpperCase()+" - Multiples d'EBITDA et fonds propres induits",
    ["Paramètre","Bas","Central","Haut"],tMult,["titre","detail","sous_total","detail","sous_total"],
    new Set([2]),[3.9,1.2,1.2,1.2],9,
    "Fonds propres = multiple × EBITDA de référence − dette nette + ajustements du pont."
    +((mKey.comp&&mKey.comp.applicable===false)?" Méthodes écartées de la valeur retenue : "+(mKey.comp.motif||"EBITDA de référence non significatif")+".":""),0.3);
  const anrB=(val.anrBase!==undefined)?val.anrBase:v.CAPITAUX_PROPRES[a1];
  const anrC=mKey.anr?mKey.anr.central:anrB;
  /* libellés courts : dans une colonne de 2,6" un libellé long passe sur deux lignes et décale
     tout le tableau par rapport à celui d'à côté */
  const tAnr=[
    [(val.dateValo==="ouverture"?"Situation nette d'ouverture":"Actif net comptable "+fy[fy.length-1]),rpFmt(anrB)],
    ["Retraitements de réévaluation",rpFmt(anrC-anrB)],
    ["= Actif net réévalué (ANR)",na(mKey.anr)||rpFmt(anrC)]];
  const finA=rpTable(sl,8.98,yMu0+0.3,3.8,"Approche patrimoniale (ANR)",
    [rpLib(),"Valeur"],tAnr,["detail","detail","sous_total"],new Set(),[2.6,1.2],9,
    (mKey.anr&&mKey.anr.applicable===false)?("Écartée de la valeur retenue : "+(mKey.anr.motif||"")+"."):null,0.3);
  rpCommentReste(sl,0.55,Math.max(finM,finA)+0.18,12.23);
  rpPied(sl,mention,++page);
  /* ---------- 4. Risques ---------- */
  rpSection(pptx,S+4,"Risques",["Risques majeurs et couverture"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Risques","Risques majeurs et couverture",
    ["Risques de marché et de concurrence","Risques opérationnels",
     "Risques financiers (change, taux, liquidité)","Risques juridiques et fiscaux"],mention,++page);
  /* ---------- 5. Annexes (autonome uniquement) ---------- */
  if(!opts.combine){
    rpSection(pptx,S+5,"Annexes",["Glossaire","Lexique financier"],mention,++page);
    rpGlossaire(pptx,B,mention,++page);
    rpLexique(pptx,B,mention,++page);
    rpContacts(pptx,B.cabinet,mention,++page);
  }
  return page;
}

/* ---------- RAPPORT COMBINÉ BP + VALO ---------- */
function construireBPValo(pptx){
  const {hyp,proj}=rpProj();   /* aligne ETATS (synthétique en mode modèle) avant rpBase */
  const mm=rpModele();
  const B=rpBase();
  const {a1,fy}=B;
  const ap=proj.annees;
  const mention=B.societe+" - Business plan & évaluation financière - "+B.dateTxt+" - Confidentiel"; RP_MENTION=mention;
  rpGarde(pptx,B.societe,"Business Plan & Évaluation financière",
    (mm?"Business plan — projet "+ap[0]+" – "+ap[ap.length-1]+"  |  Montants en "+rpLib():"Business plan "+ap[0]+" – "+ap[ap.length-1]+" · évaluation au 31/12/"+a1+"  |  Montants en "+rpLib()),B.dateTxt,B.cabinet);
  if(RP_SOM_FIX) rpSommaire(pptx,B.societe,RP_SOM_FIX,mention);
  let page=2;   /* page 2 : sommaire */
  rpPreambule(pptx,B,mention,++page,
    "Le présent document réunit le business plan de "+B.societe+" ("+ap[0]+" – "+ap[ap.length-1]+") et l'évaluation financière des fonds propres qui en découle. Il constitue un support de discussion préalable aux échanges avec le management, les investisseurs ou les partenaires financiers.",
    "La première partie présente les hypothèses et les projections (compte de résultat, bilan, trésorerie, seuil de rentabilité et covenants) ; la seconde en déduit la valeur des fonds propres par actualisation des flux (DCF), multiples de marché et actif net. Toutes les hypothèses sont paramétrées dans l'application et modifiables.");
  /* RAPPORT FUSIONNÉ (et non deux rapports accolés) :
     section 1 « Note de synthèse » = résumé du plan PUIS synthèse de valeur ;
     sections 2 à 5 = projet, hypothèses, projections, analyse ;
     sections 6 à 8 = valorisation (DCF, marché & patrimoniale, risques) ; section 9 = annexes.
     La synthèse de valorisation est injectée dans la section 1 via le hook apresSynthese ;
     construireValo est ensuite appelé sans sa propre section de synthèse. */
  page=construireBP(pptx,{combine:true,page:page,secBase:0,mention:mention,
    apresSynthese:p=>construireValo(pptx,{combine:true,page:p,secBase:0,mention:mention,
      sansSection:true,synthSeule:true})});
  page=construireValo(pptx,{combine:true,page:page,secBase:4,mention:mention,sansSynthese:true});
  rpSection(pptx,9,"Annexes",["Glossaire","Lexique financier"],mention,++page);
  rpGlossaire(pptx,B,mention,++page);
  rpLexique(pptx,B,mention,++page);
  rpContacts(pptx,B.cabinet,mention,++page);
}

/* =========================================================================
   TEASER (blind profile) — premier document d'un processus de cession, diffusé AVANT
   tout accord de confidentialité, donc court (1 à 2 pages) et, au choix, anonyme :
   nom de code, secteur et géographie, description générale, points forts, chiffres clés,
   modalités envisagées, contact. Pas de valorisation : le prix ne se négocie pas dans un
   teaser. Sections retenues d'après la pratique de marché (CFI, IMAP, Axial).
   ========================================================================= */
function rpTeaserConf(){return (typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.teaser)||{};}
function rpNomTeaser(){const T=rpTeaserConf();
  return T.anonyme?(T.code||"Projet confidentiel")
    :((typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.societe)||"");}
/* anonymisation des textes saisis par l'analyste : le nom de la société (et son sigle) ne doit
   pas subsister dans un document diffusé sous nom de code */
const RP_FORMES="SAS|SASU|SARL|SUARL|SA|SNC|SCI|GIE|EURL|SPA|LTD";
function rpAnonTxt(txt){
  const T=rpTeaserConf(); if(!T.anonyme||!txt) return txt||"";
  const soc=(typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.societe)||"";
  if(!soc) return String(txt);
  let s=String(txt);
  /* le nom complet d'abord, puis chaque mot significatif. L'élision (« l'ESPIM ») et la forme
     juridique accolée (« SAFE SAS ») doivent disparaître AVEC le nom, sinon il reste des
     « l'la Société SAS » dans le document diffusé. */
  const mots=[soc].concat(soc.split(/[\s(),.]+/).filter(m=>m.length>2
    &&!new RegExp("^("+RP_FORMES+")$","i").test(m)));
  mots.forEach(m=>{
    const e=m.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    /* fin de motif : lookahead plutôt que \b — un nom qui se termine par une parenthèse
       (« ESPIM (SAFE SAS) ») n'a pas de frontière de mot après lui. Pas de lookbehind :
       tous les navigateurs cibles ne le supportent pas. */
    s=s.replace(new RegExp("\\b(?:l['’]|d['’])?"+e+"(?:\\s+(?:"+RP_FORMES+"))?(?![\\wÀ-ÿ])","gi"),"la Société");
  });
  return s.replace(/(?:\bla Société\b[\s,()]*){2,}/gi,"la Société ")
          .replace(/\s{2,}/g," ")
          .replace(/(^|[.!?]\s+)la Société/g,"$1La Société").trim();
}
/* Un teaser tient sur une page : tout texte repris de la fiche d'identité doit être BORNÉ,
   sinon il déborde sur le bloc suivant (une description libre peut faire 40 lignes). */
function rpCoupe(txt,max){
  const s=String(txt||"").replace(/\s+/g," ").trim();
  if(s.length<=max) return s;
  const c=s.slice(0,max);
  return c.slice(0,Math.max(c.lastIndexOf(". ")+1,c.lastIndexOf(" ")))
    .replace(/[,;:]$/,"")+(/\.$/.test(c.trim())?"":" …");
}
function rpTeaserBloc(sl,x,y,w,titre){
  sl.addText(String(titre).toUpperCase(),{x:x,y:y,w:w,h:0.22,fontSize:8.5,bold:true,
    color:RP.BLEU,charSpacing:1.5,fontFace:"Arial"});
  return y+0.26;
}
function rpTeaserPuces(sl,x,y,w,items,h){
  let yy=y;
  items.forEach(t0=>{
    const t=String(t0).replace(/\s*$/,"").replace(/([^.…!?])$/,"$1.");
    sl.addShape("rect",{x:x+0.02,y:yy+0.09,w:0.07,h:0.07,fill:{color:RP.ORANGE}});
    sl.addText(t,{x:x+0.2,y:yy,w:w-0.2,h:h,fontSize:9.5,color:"333333",fontFace:"Arial",valign:"top"});
    yy+=h;
  });
  return yy;
}
function construireTeaser(pptx){
  const {hyp,proj}=rpProj();
  const mm=rpModele();
  const B=rpBase();
  const I=rpInfos(), T=rpTeaserConf(), anon=!!T.anonyme;
  const nom=rpNomTeaser();
  const ap=proj.annees, aF=ap[ap.length-1], a1p=ap[0];
  const fyp=ap.map(a=>libFY(a,true));
  const A=B.A, v=B.v, a1=B.a1;
  const cab=(typeof chargerCabinet==="function")?chargerCabinet():{};
  const mention=nom+" - Teaser confidentiel - "+B.dateTxt;
  RP_MENTION=mention;
  const caF=proj.pl.CA[aF], ebF=proj.pl.EBITDA[aF], mgF=caF?ebF/caF:null;
  const ca1=proj.pl.CA[a1p], eb1=proj.pl.EBITDA[a1p];
  const tcam=(ca1>0&&caF>0&&ap.length>1)?Math.pow(caF/ca1,1/(ap.length-1))-1:null;
  const bascEb=rpBascule(ap,a=>proj.pl.EBITDA[a]);
  const ville=String(I.adresse||"").split(",")[0].trim();       /* la ville, pas l'adresse postale */
  const secteur=I.secteur||DOSSIER.secteur||"";
  const geo=[secteur,ville].filter(Boolean).join("  ·  ");

  /* ---------- page 1 : le one-pager. Ancrages FIXES : chaque bloc a son budget de hauteur,
     les textes de la fiche d'identité sont bornés (rpCoupe) — un teaser qui déborde sur une
     deuxième page n'est plus un teaser. ---------- */
  let sl=pptx.addSlide();
  sl.addShape("rect",{x:0,y:0,w:13.333,h:1.62,fill:{color:RP.NAVY}});
  sl.addShape("rect",{x:0.55,y:0.42,w:1.7,h:0.045,fill:{color:RP.ORANGE}});
  sl.addText("OPPORTUNITÉ D'INVESTISSEMENT"+(anon?" — PROFIL ANONYME":""),{x:0.55,y:0.2,w:8.6,h:0.24,
    fontSize:8.5,bold:true,color:"9FB0D6",charSpacing:1.5,fontFace:"Arial"});
  sl.addText(nom,{x:0.55,y:0.62,w:9.4,h:0.5,fontSize:26,bold:true,color:RP.BLANC,fontFace:"Arial"});
  sl.addText(geo,{x:0.55,y:1.16,w:9.4,h:0.3,fontSize:11.5,color:"CADCFC",fontFace:"Arial"});
  sl.addText("STRICTEMENT CONFIDENTIEL",{x:9.3,y:0.2,w:3.48,h:0.24,align:"right",
    fontSize:8.5,bold:true,color:"7E90BF",charSpacing:1.5,fontFace:"Arial"});
  {const _lg=logoCab();sl.addImage(_lg?{data:_lg.data,x:11.0,y:0.62,h:0.42,w:0.42*_lg.ratio}
    :{data:LOGO_FINDALYX,x:11.0,y:0.62,h:0.42,w:0.42*4.45});}

  /* colonne de gauche : présentation (5 lignes max) puis points forts (5 puces max) */
  const xL=0.55, wL=7.15;
  rpTeaserBloc(sl,xL,1.85,wL,"Présentation");
  const desc=rpCoupe(rpAnonTxt([I.description,I.services].filter(Boolean).join(" "))
    ||("Société du secteur "+(secteur||"—")+(ville?(", implantée à "+ville):"")+"."),430);
  sl.addText(desc,{x:xL,y:2.11,w:wL,h:0.95,fontSize:10,color:"333333",fontFace:"Arial",valign:"top"});
  rpTeaserBloc(sl,xL,3.16,wL,"Points forts");
  const forts=[
    (tcam!==null&&caF>ca1)?("Chiffre d'affaires porté de "+rpMsgFmt(ca1)+" à "+rpMsgFmt(caF)+" sur le plan d'affaires, soit "+rpPct(tcam)+" par an."):null,
    (mgF!==null&&ebF>0)?("Marge d'EBITDA de "+rpPct(mgF)+" en "+fyp[fyp.length-1]
      +(bascEb&&bascEb!==a1p?(", après un point d'inflexion atteint en "+libFY(bascEb,true)):"")+"."):null,
    (proj.bs.TRESO_NETTE[aF]>0&&!proj.bs.DETTE[aF])?("Structure financière sans dette bancaire à terme, trésorerie de clôture de "+rpMsgFmt(proj.bs.TRESO_NETTE[aF])+"."):null,
    I.effectif?rpCoupe("Organisation en place : "+rpAnonTxt(I.effectif),135):null,
    I.marche?rpCoupe(rpAnonTxt(I.marche).split(". ")[0]+".",135):null,
    I.creation?("Activité exercée depuis "+I.creation+"."):null
  ].filter(Boolean).slice(0,5);
  rpTeaserPuces(sl,xL,3.42,wL,forts,0.5);

  /* colonne de droite : chiffres clés (valeurs courtes, une ligne par cellule) + trajectoire */
  const xR=8.1, wR=4.68;
  rpTeaserBloc(sl,xR,1.85,wR,"Chiffres clés");
  const cles=[
    ["Chiffre d'affaires "+fyp[fyp.length-1],rpMsgFmt(caF)],
    ["EBITDA "+fyp[fyp.length-1],rpMsgFmt(ebF)+(mgF!==null?(" · "+rpPct(mgF)+" du CA"):"")],
    (tcam!==null?["Croissance annuelle moyenne",rpPct(tcam)]:null),
    ["Secteur",rpCoupe(secteur||"—",34)],
    ["Implantation",rpCoupe([ville,I.pays].filter(Boolean).join(", ")||"—",34)],
    ["Horizon du plan",fyp[0]+" – "+fyp[fyp.length-1]]
  ].filter(Boolean);
  rpTable(sl,xR,2.11,wR,null,["Indicateur","Valeur"],cles,
    cles.map((r,i)=>i<2?"total":"detail"),new Set(),[2.4,2.2],9,null,0.3);
  /* rpColonnes pose déjà sa propre légende : pas de second intitulé « Trajectoire » par-dessus */
  rpColonnes(sl,xR,4.16,wR,1.85,"Trajectoire ("+rpLib()+")",fyp,[
    {name:"CA",values:ap.map(a=>proj.pl.CA[a]),color:"172554"},
    {name:"EBITDA",values:ap.map(a=>proj.pl.EBITDA[a]),color:"FA6706"}]);

  /* bandeau bas : modalités, prochaines étapes */
  const yB=6.12;
  sl.addShape("rect",{x:0.55,y:yB-0.12,w:12.23,h:0.012,fill:{color:RP.FILET}});
  const modal=rpCoupe(rpAnonTxt(I.contexteMission)||"Cession de titres — périmètre, calendrier et modalités à préciser avec les conseils du vendeur.",300);
  sl.addText("MODALITÉS ENVISAGÉES",{x:0.55,y:yB,w:5.9,h:0.2,fontSize:8,bold:true,color:RP.BLEU,charSpacing:1.5,fontFace:"Arial"});
  sl.addText(modal,{x:0.55,y:yB+0.22,w:5.9,h:0.62,fontSize:8.5,color:"333333",fontFace:"Arial",valign:"top"});
  sl.addText("PROCHAINES ÉTAPES",{x:6.75,y:yB,w:6.03,h:0.2,fontSize:8,bold:true,color:RP.BLEU,charSpacing:1.5,fontFace:"Arial"});
  sl.addText("Manifestation d'intérêt auprès de "+(B.cabinet||"Findalyx Advisory")
    +(cab.analyste?(" — "+cab.analyste):"")+(cab.email?(" · "+cab.email):"")+(cab.telephone?(" · "+cab.telephone):"")
    +". L'accès au mémorandum d'information et aux données détaillées est conditionné à la signature d'un accord de confidentialité (NDA).",
    {x:6.75,y:yB+0.22,w:6.03,h:0.6,fontSize:9,color:"333333",fontFace:"Arial",valign:"top"});
  rpPied(sl,mention,1);

  /* ---------- page 2 : résumé financier ---------- */
  sl=pptx.addSlide();
  rpEnTete(sl,nom,"Teaser");
  const y0=rpTitreMsg(sl,"Résumé financier",
    "Le plan porte le chiffre d'affaires à "+rpMsgFmt(caF)+" et l'EBITDA à "+rpMsgFmt(ebF)
    +(mgF!==null?(", soit "+rpPct(mgF)+" du chiffre d'affaires"):"")+" en "+fyp[fyp.length-1]+".");
  const hist=(!mm&&A.length)?A:[];
  const cols=hist.concat(ap);
  const gv=(a,cle)=>{
    if(hist.indexOf(a)>=0) return v[{CA:"CA",EBITDA:"EBITDA",RN:"RESULTAT_NET"}[cle]||cle][a];
    return cle==="RN"?proj.pl.RN[a]:proj.pl[cle][a];
  };
  const lig=[
    ["Chiffre d'affaires",...cols.map(a=>rpFmt(gv(a,"CA")))],
    ["Croissance",...cols.map((a,k)=>k?(gv(cols[k-1],"CA")?rpPct(gv(a,"CA")/gv(cols[k-1],"CA")-1):"-"):"-")],
    ["EBITDA",...cols.map(a=>rpFmt(gv(a,"EBITDA")))],
    ["Marge d'EBITDA",...cols.map(a=>gv(a,"CA")?rpPct(gv(a,"EBITDA")/gv(a,"CA")):"-")],
    ["Résultat net",...cols.map(a=>rpFmt(gv(a,"RN")))],
    ["Trésorerie de clôture",...cols.map(a=>hist.indexOf(a)>=0?rpFmt(v.TRESORERIE_NETTE[a]):rpFmt(proj.bs.TRESO_NETTE[a]))]
  ];
  const finT=rpTable(sl,0.55,y0+0.28,12.23,nom.toUpperCase()+" - Résumé financier",
    [rpLib()].concat(hist.map(a=>libFY(a)+" (réel)"),fyp.map(f=>f+"p")),lig,
    ["total","pct","total","pct","detail","detail"],
    hist.length?new Set(hist.map((a,k)=>1+k)):new Set(),
    [3.4,...cols.map(()=>1.1)],9.5,
    "p : prévisionnel — projections du plan d'affaires établies par la direction avec "+(B.cabinet||"Findalyx Advisory")
    +(hist.length?" ; colonnes bleutées : données historiques.":"."),0.3);
  /* marché / positionnement, si renseigné */
  let yM=finT+0.3;
  if(I.marche){
    yM=rpTeaserBloc(sl,0.55,yM,7.2,"Marché et positionnement");
    sl.addText(rpAnonTxt(I.marche),{x:0.55,y:yM,w:7.2,h:1.5,fontSize:9.5,color:"333333",fontFace:"Arial",valign:"top"});
  }
  const xC=I.marche?8.15:0.55, wC=I.marche?4.63:12.23;
  let yC=rpTeaserBloc(sl,xC,finT+0.3,wC,"Avertissement");
  sl.addText("Ce document est remis à titre strictement confidentiel et indicatif. Il ne constitue "
    +"ni une offre, ni une sollicitation, ni un engagement de vente. Les informations et projections "
    +"qu'il contient sont fournies par la direction et n'ont pas fait l'objet d'un audit indépendant : "
    +"elles doivent être confirmées dans le cadre des travaux de revue préalable. Toute diffusion, "
    +"reproduction ou communication à un tiers est interdite sans autorisation écrite.",
    {x:xC,y:yC,w:wC,h:1.5,fontSize:8.5,italic:true,color:RP.G_TXT,fontFace:"Arial",valign:"top"});
  rpPied(sl,mention,2);
}

/* ---------- point d'entrée ---------- */
async function genererRapport(type){
  if(!ETATS && !(DOSSIER&&DOSSIER.sansHistorique)){toast("Importez d'abord des balances");return;}
  if(typeof PptxGenJS==="undefined"){toast("Bibliothèque PowerPoint non chargée (connexion requise)");return;}
  toast("Génération du rapport en cours…");
  const nouveau=()=>{const p=new PptxGenJS();p.defineLayout({name:"LARGE",width:13.333,height:7.5});
    p.layout="LARGE";return p;};
  const construire=p=>{
    if(type==="dd")construireDD(p);
    else if(type==="bp")construireBP(p);
    else if(type==="bpvalo")construireBPValo(p);
    else if(type==="teaser")construireTeaser(p);
    else construireValo(p);
  };
  /* passe à blanc : relève la page de chaque section pour composer un sommaire paginé
     (aucun fichier n'est écrit ; seule la structure est parcourue) */
  RP_SOM=null;RP_SOM_FIX=null;
  if(type!=="teaser"){
    try{ RP_SOM=[]; construire(nouveau()); RP_SOM_FIX=RP_SOM.slice(); }
    catch(e){ RP_SOM_FIX=null; }
    finally{ RP_SOM=null; }
  }
  const pptx=nouveau();
  try{ construire(pptx); } finally { RP_SOM_FIX=null; }
  const noms={dd:"Rapport_DD_",bp:"Rapport_BP_",valo:"Rapport_VALO_",bpvalo:"Rapport_BP_Valo_",teaser:"Teaser_"};
  await pptx.writeFile({fileName:noms[type]+String(type==="teaser"?rpNomTeaser():DOSSIER.societe).replace(/\W+/g,"_")+".pptx"});
  toast("Rapport téléchargé");
}
