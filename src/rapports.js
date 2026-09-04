/* =========================================================================
   Findalyx Advisory — génération des rapports PowerPoint dans le navigateur
   (PptxGenJS). Style "banque d'affaires" validé : filet bleu nuit, en-tête
   société/CONFIDENTIEL, assertion italique, tableaux denses, OBSERVATIONS,
   cartes façon application, garde et contacts partiellement sombres.
   ========================================================================= */
const RP={NAVY:"172554",BLEU:"224289",ORANGE:"FA6706",PALE:"E9EFF7",
  G_TITRE:"1F2937",G_TXT:"6B7280",G_CLAIR:"9CA3AF",FILET:"D8DCE3",BLANC:"FFFFFF",
  /* Teinte d'accent des documents de VENTE (teaser). L'ocre tient mieux que l'orange
     sur le marine et ne se confond pas avec les aplats de données des graphiques.
     Utilisée par les primitives de composition rpOeil / rpCarte / rpKPI. */
  OCRE:"BF8F30",VERT:"2E8B5E",CIEL:"3E6E9E",BANDE:"EEF3F8",BANDE2:"F7FAFC",PALE2:"A9C0D8"};
/* Titres en SERIF, corps et chiffres en sans : combinaison des présentations de référence
   (proposition Coris Holding). Georgia est installé d'office sous Windows et macOS — un
   caractère non installé chez le lecteur serait remplacé et casserait la mise en page.
   Repasser toute la charte en Arial = remettre RP_TITRE à "Arial". */
const RP_TITRE="Georgia";
const RP_TINTES={"172554":"E8ECF5","224289":"E5EBF6","FA6706":"FEEBDD","16904E":"E4F3EA"};

const rpU=()=>(typeof CONF_UNITE!=="undefined"&&CONF_UNITE)?CONF_UNITE:{f:1,dec:0,lib:"K"+"FCFA"};
const rpLib=()=>rpU().lib;
/* symbole de saisie (F pour le franc CFA, sinon € / $) — utilisé pour les prix unitaires */
const rpSym=()=>{const D=(typeof dev==="function")?dev():null;return D?(D.sym==="FCFA"?"F":D.sym):"F";};
function rpFmt(v){if(v===null||v===undefined)return "-";
  const u=rpU(),x=v*u.f;
  if(Math.abs(x)<(u.dec?0.05:0.5))return "-";
  const s=Math.abs(x).toLocaleString("fr-FR",{minimumFractionDigits:u.dec,maximumFractionDigits:u.dec}).replace(/[\u202f\u00a0]/g," ");
  return x<0?`(${s})`:s;}
function rpPct(v){if(v===null||!isFinite(v))return "-";if(Math.abs(v)>9.99)return "n.s.";
  /* espace avant le % (typographie française), comme dans les blocs de ratios */
  const s=Math.round(Math.abs(v*100))+" %";return v<0?`(${s})`:s;}
/* Échelle propre aux graphiques : les montants sont stockés en KFCFA. Les étiquettes de
   graphique doivent rester courtes quelle que soit l'unité d'affichage du dossier (F/K/M) :
   on choisit ici l'unité qui donne 3 ou 4 caractères (KFCFA, MFCFA, MdFCFA) et le titre du
   graphique porte l'unité retenue. */
/* etiquettes d'echelle dans la DEVISE du dossier : un deck en euros ne peut pas
   graduer ses axes en « MFCFA ». Le milliard n'existe pas dans la table d'unites,
   on le compose (MdFCFA / Md€ / Md$). */
function rpDevU(k){
  const D=(typeof dev==="function")?dev():null;
  if(!D) return k==="Md"?"MdFCFA":(k+"FCFA");
  if(k==="Md") return (D.sym==="FCFA")?"MdFCFA":("Md"+D.sym);
  return D.unites[k].lib;
}
function rpEch(vals){
  let mx=0;(vals||[]).forEach(v=>{v=Math.abs(+v||0);if(isFinite(v)&&v>mx)mx=v;});
  if(mx>=1e6)return {f:1e-6,dec:mx>=1e7?1:2,lib:rpDevU("Md")};
  if(mx>=1e3)return {f:1e-3,dec:mx>=1e4?1:2,lib:rpDevU("M")};
  return {f:1,dec:0,lib:rpDevU("K")};
}
function rpFmtE(v,e){if(v===null||v===undefined||!isFinite(v))return "";
  const x=v*e.f;
  const s=Math.abs(x).toLocaleString("fr-FR",{minimumFractionDigits:e.dec,maximumFractionDigits:e.dec}).replace(/[  ]/g," ");
  return x<0?`(${s})`:s;}
function rpTitreEch(titre,e){
  /* on retire l'ancienne unite du titre, quelle que soit la devise du dossier :
     par retraits de chaines successifs plutot que par une regex construite a la volee
     (le symbole $ du dollar et les parentheses seraient a echapper). */
  let t=String(titre||"");
  ["MdFCFA","MFCFA","KFCFA","FCFA",rpDevU("Md"),rpDevU("M"),rpDevU("K")].forEach(function(u){
    if(!u)return;
    t=t.split("("+u+")").join(" ").split(u).join(" ");
  });
  t=t.replace(/\(\s*\)/g," ").replace(/\s+/g," ").trim();
  return (t?t+" ":"")+"("+e.lib+")";}

/* ---------- éléments de page ---------- */
function rpEnTete(sl, societe, section){
  sl.addShape("rect",{x:0.55,y:0.42,w:12.23,h:0.02,fill:{color:RP.NAVY}});
  sl.addText((societe+" — "+section).toUpperCase(),{x:0.55,y:0.5,w:8.6,h:0.28,
    fontSize:9,bold:true,color:RP.G_TXT,charSpacing:2,fontFace:"Arial"});
  sl.addText("STRICTEMENT CONFIDENTIEL",{x:9.4,y:0.5,w:3.38,h:0.28,align:"right",
    fontSize:9,bold:true,color:RP.G_CLAIR,charSpacing:2,fontFace:"Arial"});
}
/* Titre de page : serif, avec le filet orange court dessous — signature reprise des
   présentations de référence (l'accent sous le titre, pas dans le titre). */
function rpTitre(sl,txt){
  sl.addText(txt,{x:0.55,y:0.9,w:12.2,h:0.45,fontSize:18,bold:true,color:RP.NAVY,fontFace:RP_TITRE});
  sl.addShape("rect",{x:0.55,y:1.42,w:0.72,h:0.045,fill:{color:RP.ORANGE}});
}
/* Pastille d'information (coin haut droit) : unité des montants, périmètre, mention courte.
   Le lecteur n'a plus à chercher l'unité dans l'en-tête d'un tableau. */
function rpChip(sl,txt,x,y,w){
  w=w||Math.max(1.5,0.085*String(txt).length+0.3);
  x=(x==null)?(12.78-w):x; y=(y==null)?0.86:y;
  sl.addShape("roundRect",{x:x,y:y,w:w,h:0.28,rectRadius:0.14,fill:{color:RP.PALE}});
  sl.addText(txt,{x:x,y:y,w:w,h:0.28,align:"center",valign:"middle",fontSize:8.5,bold:true,
    color:RP.BLEU,fontFace:"Arial"});
  return x;
}
/* Découpe un message en fragments pour mettre en valeur les chiffres clés (les références
   colorent le mot porteur du titre ; ici c'est le montant qui compte). */
function rpRuns(msg,cles,taille){
  const base={fontSize:taille,bold:true,color:RP.NAVY,fontFace:RP_TITRE};
  const acc={fontSize:taille,bold:true,color:RP.ORANGE,fontFace:RP_TITRE};
  let reste=String(msg||""), runs=[];
  const C=(cles||[]).filter(c=>c&&String(c).length>1);
  if(!C.length) return [{text:reste,options:base}];
  /* on avance dans la chaîne en cherchant la première clé restante */
  let garde=0;
  while(reste&&garde++<40){
    let pos=-1,cle=null;
    C.forEach(c=>{const i=reste.indexOf(c);if(i>=0&&(pos<0||i<pos)){pos=i;cle=c;}});
    if(pos<0){runs.push({text:reste,options:base});break;}
    if(pos>0)runs.push({text:reste.slice(0,pos),options:base});
    runs.push({text:cle,options:acc});
    reste=reste.slice(pos+cle.length);
  }
  return runs;
}
/* TITRE-MESSAGE (« action title ») : convention des banques d'affaires et des cabinets de
   conseil — le titre porte la CONCLUSION de la page, pas son sujet ; le sujet devient un
   surtitre discret. On doit pouvoir lire la suite des titres et comprendre le dossier sans
   ouvrir un seul tableau. Renvoie l'ordonnée où le contenu peut commencer.
   `msg` vide ⇒ on retombe sur un titre de sujet classique (rétro-compatible). */
function rpTitreMsg(sl,sujet,msg,cles){
  if(!msg){rpTitre(sl,sujet);return 1.62;}
  /* surtitre précédé d'un court filet orange (dispositif des présentations de référence) */
  sl.addShape("rect",{x:0.55,y:0.9,w:0.28,h:0.045,fill:{color:RP.ORANGE}});
  sl.addText(String(sujet).toUpperCase(),{x:0.95,y:0.79,w:11.83,h:0.22,fontSize:8.5,bold:true,
    color:RP.BLEU,charSpacing:1.5,fontFace:"Arial"});
  const nl=String(msg).length>92?2:1, fs=nl>1?14:15.5;
  sl.addText(rpRuns(msg,cles,fs),{x:0.55,y:1.02,w:12.2,h:nl>1?0.66:0.42,
    fontFace:RP_TITRE,valign:"top"});
  return nl>1?1.76:1.56;
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
/* PAGE DE GARDE — sobre, sur fond blanc. Une couverture n'est pas une affiche : un aplat de
   couleur pleine page alourdit le document, se voit à l'impression et vieillit mal. La structure
   tient donc à la typographie et à deux filets, dans la même grille que les pages intérieures
   (marge 0,55" · largeur utile 12,23" · filet bleu nuit en tête).
   `reperes` (optionnel) : repères QUALITATIFS — secteur, implantation. Jamais de chiffres : la
   couverture annonce le document, elle ne le résume pas. */
function rpGarde(pptx, societe, titreR, sousTitre, dateTxt, cabinet, reperes){
  const sl=pptx.addSlide();
  const XP=8.05;                       /* la page reste blanche à gauche : deux tiers / un tiers */
  sl.addShape("rect",{x:XP,y:0,w:13.333-XP,h:7.5,fill:{color:RP.NAVY}});
  sl.addShape("rect",{x:XP-0.06,y:0,w:0.06,h:7.5,fill:{color:RP.ORANGE}});
  /* marque géométrique du panneau : cercle ouvert + trois barres — sobre, sans image */
  sl.addShape("ellipse",{x:XP+0.95,y:1.25,w:3.5,h:3.5,fill:{type:"none"},line:{color:"2C3E6B",width:1.25}});
  [[0.55,1.05],[1.15,1.55],[1.75,0.75]].forEach((b,i)=>
    sl.addShape("rect",{x:XP+1.75+i*0.62,y:4.3-b[1],w:0.42,h:b[1],
      fill:{color:i===1?RP.ORANGE:"31549B"}}));
  {const _lg=logoCab();sl.addImage(_lg?{data:_lg.data,x:0.55,y:0.5,h:0.44,w:0.44*_lg.ratio}
    :{data:LOGO_FINDALYX_CLAIR,x:0.55,y:0.5,h:0.44,w:0.44*4.45});}
  sl.addText("STRICTEMENT CONFIDENTIEL",{x:XP+0.5,y:0.56,w:4.28,h:0.3,align:"right",
    fontSize:9,bold:true,color:"7E90BF",charSpacing:2,fontFace:"Arial"});
  /* bloc de titre : filet orange, type de document, société en serif, sous-titre */
  sl.addShape("rect",{x:0.55,y:2.45,w:1.5,h:0.05,fill:{color:RP.ORANGE}});
  sl.addText(String(titreR).toUpperCase(),{x:0.55,y:2.68,w:7.0,h:0.3,fontSize:10.5,bold:true,
    color:RP.BLEU,charSpacing:2.5,fontFace:"Arial"});
  sl.addText(societe,{x:0.55,y:3.06,w:7.2,h:1.5,fontSize:36,bold:true,color:RP.NAVY,
    fontFace:RP_TITRE,valign:"top"});
  if(sousTitre) sl.addText(sousTitre,{x:0.55,y:4.62,w:7.0,h:0.4,fontSize:13,color:RP.G_TXT,fontFace:"Arial"});
  /* repères qualitatifs : une ligne par repère, filet court devant — pas de chiffres */
  const R=(reperes||[]).map(t=>String(t||"").trim()).filter(Boolean).slice(0,3);
  R.forEach((t,i)=>{
    const y=5.15+i*0.3;
    sl.addShape("rect",{x:0.57,y:y+0.11,w:0.18,h:0.025,fill:{color:RP.G_CLAIR}});
    sl.addText(t,{x:0.87,y:y,w:6.7,h:0.28,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  });
  sl.addShape("rect",{x:0.55,y:6.42,w:7.0,h:0.015,fill:{color:RP.FILET}});
  sl.addText(String(dateTxt).toUpperCase(),{x:0.55,y:6.6,w:7.0,h:0.3,fontSize:10.5,bold:true,
    color:RP.NAVY,charSpacing:2,fontFace:"Arial"});
  /* panneau : destinataire du document et signature du conseil */
  sl.addText("PRÉPARÉ PAR",{x:XP+0.5,y:5.5,w:4.28,h:0.24,align:"right",fontSize:8.5,bold:true,
    color:"7E90BF",charSpacing:1.5,fontFace:"Arial"});
  sl.addText(cabinet,{x:XP+0.5,y:5.74,w:4.28,h:0.4,align:"right",fontSize:16,bold:true,
    color:RP.BLANC,fontFace:RP_TITRE});
  sl.addShape("rect",{x:12.28,y:6.24,w:0.5,h:0.03,fill:{color:RP.ORANGE}});
  sl.addText("Projet — support de discussion",{x:XP+0.5,y:6.42,w:4.28,h:0.3,align:"right",
    fontSize:9.5,italic:true,color:"9FB0D6",fontFace:"Arial"});
  if(typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.logo)
    sl.addImage({data:DOSSIER.logo,x:XP+1.85,y:0.95,w:1.7,h:1.7,sizing:{type:"contain",w:1.7,h:1.7}});
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
      fontSize:15,bold:true,color:RP.ORANGE,fontFace:RP_TITRE});
    sl.addText(s.titre,{x:1.5,y:y,w:9.3,h:hL,valign:"middle",fontSize:14,bold:true,
      color:RP.NAVY,fontFace:RP_TITRE});
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
    bold:true,color:RP.PALE,fontFace:RP_TITRE});
  sl.addText(titreS,{x:0.62,y:3.3,w:10.5,h:0.7,fontSize:28,bold:true,color:RP.NAVY,fontFace:RP_TITRE});
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
  if(bande){ sl.addShape("rect",{x:x,y:y-0.24,w:0.045,h:0.18,fill:{color:RP.BLEU}});
    sl.addText(bande,{x:x+0.14,y:y-0.26,w:w-0.14,h:0.22,fontSize:9,bold:true,
      color:RP.BLEU,charSpacing:1,fontFace:"Arial"}); }
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
      /* opts.fond : teinte par cellule — sert aux cartes de chaleur (grille de sensibilité) */
      const chaud=(typeof opts.fond==="function")?opts.fond(i,j):null;
      const teinte=chaud||((st==="groupe")?RP.PALE:((colsDelta&&colsDelta.has(j))?RP.PALE
        :(st==="total")?F_ST:RP.BLANC));
      /* opts.alignG : colonnes de TEXTE à laisser alignées à gauche (descriptions, commentaires) —
         une phrase alignée à droite se lit mal */
      const gauche=!j||(opts.alignG&&opts.alignG.indexOf(j)>=0);
      const o={fontSize:taille,align:gauche?"left":(opts.centre?"center":"right"),valign:"middle",
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
    sl.addShape("rect",{x:x,y:y+0.04,w:0.05,h:0.2,fill:{color:RP.BLEU}});
    sl.addText(r,{x:x+0.16,y:y-0.01,w:cw-0.16,h:0.28,fontSize:11.5,bold:true,color:RP.NAVY,fontFace:RP_TITRE});
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
/* PAGE DE CONTACTS — même grille et même charte que les pages de contenu (elle était restée sur
   un ancien modèle : bandeau plein, titre sans-serif, une seule carte et un paragraphe perdu).
   Trois blocs : le cabinet (carte bleu nuit, domaines d'intervention), l'interlocuteur (carte
   blanche, coordonnées) et le rappel de confidentialité. */
function rpContacts(pptx, cabinet, mention, page){
  const sl=pptx.addSlide();
  const cab=(typeof chargerCabinet==="function")?chargerCabinet():{};
  /* en-tête au nom de la SOCIÉTÉ, comme toutes les autres pages du document */
  rpEnTete(sl,(typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.societe)||cabinet,"Contacts");
  rpTitreMsg(sl,"Contacts","Vos interlocuteurs restent à votre disposition pour toute question relative à ce document.");
  /* carte du cabinet */
  const xA=0.55, wA=6.0, yC=1.95, hC=3.35;
  sl.addShape("rect",{x:xA,y:yC,w:wA,h:hC,fill:{color:RP.NAVY}});
  sl.addShape("rect",{x:xA+0.4,y:yC+0.45,w:1.1,h:0.045,fill:{color:RP.ORANGE}});
  sl.addText(cabinet,{x:xA+0.4,y:yC+0.66,w:wA-0.8,h:0.5,fontSize:21,bold:true,color:RP.BLANC,fontFace:RP_TITRE});
  sl.addText("Conseil financier — espace OHADA",{x:xA+0.4,y:yC+1.18,w:wA-0.8,h:0.3,fontSize:11,
    italic:true,color:"9FB0D6",fontFace:"Arial"});
  ["Due diligence et revue financière","Business plans et modélisation",
   "Évaluation d'entreprises","Formation et accompagnement"].forEach((t,i)=>{
    sl.addShape("rect",{x:xA+0.42,y:yC+1.72+i*0.34,w:0.07,h:0.07,fill:{color:RP.ORANGE}});
    sl.addText(t,{x:xA+0.62,y:yC+1.62+i*0.34,w:wA-1.1,h:0.3,fontSize:10.5,color:"CADCFC",fontFace:"Arial"});
  });
  {const _lg=logoCab();sl.addImage(_lg?{data:_lg.data,x:xA+wA-1.7,y:yC+hC-0.75,h:0.4,w:0.4*_lg.ratio}
    :{data:LOGO_FINDALYX,x:xA+wA-1.9,y:yC+hC-0.75,h:0.4,w:0.4*4.45});}
  /* carte de l'interlocuteur */
  const xB=6.78, wB=6.0;
  sl.addShape("rect",{x:xB,y:yC,w:wB,h:0.05,fill:{color:RP.ORANGE}});
  sl.addShape("rect",{x:xB,y:yC+0.05,w:wB,h:hC-0.05,fill:{color:RP.BLANC},line:{color:RP.FILET,width:1}});
  let yI=rpTeaserBloc(sl,xB+0.4,yC+0.42,wB-0.8,"Votre interlocuteur");
  sl.addText(cab.analyste||cabinet||"Analyste",{x:xB+0.4,y:yI+0.04,w:wB-0.8,h:0.42,fontSize:19,
    bold:true,color:RP.NAVY,fontFace:RP_TITRE});
  sl.addText(cab.analyste?("Financial Advisory — "+cabinet):"Conseil financier",
    {x:xB+0.4,y:yI+0.5,w:wB-0.8,h:0.3,fontSize:10.5,color:RP.G_TXT,fontFace:"Arial"});
  sl.addShape("rect",{x:xB+0.4,y:yI+0.88,w:wB-0.8,h:0.012,fill:{color:RP.FILET}});
  const coord=[["Courriel",cab.email],["Téléphone",cab.telephone],["Adresse",cab.adresse]].filter(c=>c[1]);
  coord.forEach((c,i)=>{
      const y=yI+1.02+i*0.42;
      sl.addText(String(c[0]).toUpperCase(),{x:xB+0.4,y:y,w:1.5,h:0.24,fontSize:8,bold:true,
        color:RP.G_CLAIR,charSpacing:1.2,fontFace:"Arial"});
      sl.addText(String(c[1]),{x:xB+1.95,y:y-0.03,w:wB-2.4,h:0.3,fontSize:11,
        color:(i===0?RP.BLEU:RP.G_TITRE),fontFace:"Arial"});
    });
  /* carte vide = paramètres du cabinet non renseignés : on le dit plutôt que de laisser un blanc */
  if(!coord.length) sl.addText("Coordonnées à renseigner dans les paramètres du cabinet (Accueil › Cabinet).",
    {x:xB+0.4,y:yI+1.06,w:wB-0.8,h:0.5,fontSize:10,italic:true,color:RP.G_CLAIR,fontFace:"Arial",valign:"top"});
  /* rappel de confidentialité, pleine largeur */
  const yD=yC+hC+0.3;
  sl.addShape("rect",{x:0.55,y:yD,w:12.23,h:0.9,fill:{color:"FBFCFE"},line:{color:RP.FILET,width:1}});
  sl.addShape("rect",{x:0.55,y:yD,w:0.05,h:0.9,fill:{color:RP.BLEU}});
  sl.addText("Ce document est confidentiel. Il a été préparé pour ses seuls destinataires et ne peut être "
    +"reproduit ni communiqué à un tiers sans autorisation écrite. Les projections qu'il contient reposent "
    +"sur des hypothèses susceptibles de ne pas se réaliser.",
    {x:0.85,y:yD+0.12,w:11.7,h:0.68,fontSize:10,italic:true,color:RP.G_TXT,fontFace:"Arial",valign:"top"});
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
  sl.addShape("rect",{x:x,y:y+0.04,w:0.045,h:0.18,fill:{color:RP.BLEU}});
  sl.addText("COMMENTAIRES",{x:x+0.14,y:y,w:w-0.14,h:0.26,fontSize:9,bold:true,color:RP.BLEU,charSpacing:2,fontFace:"Arial"});
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
    sl.addText(bl[0],{x:0.82,y:y,w:11.7,h:0.3,fontSize:13.5,bold:true,color:RP.NAVY,fontFace:RP_TITRE});
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
  const mk=sub=>sub.map(g=>[{text:g[0],options:{bold:true,color:RP.NAVY,fontSize:9.5,fontFace:RP_TITRE,valign:"middle"}},
    {text:g[1],options:{color:RP.G_TITRE,fontSize:9,fontFace:"Arial",valign:"middle"}}]);
  /* deux colonnes de définitions, filet fin sous chaque entrée */
  [[0.55,G.slice(0,mid)],[6.95,G.slice(mid)]].forEach(([x,sub])=>{
    sub.forEach((g,i)=>sl.addShape("rect",{x:x,y:2.02+(i+1)*0.34-0.01,w:6.0,h:0.008,fill:{color:"EEF1F6"}}));
    sl.addTable(mk(sub),{x:x,y:2.0,w:6.0,colW:[1.55,4.45],border:{type:"none"},rowH:0.34,margin:0.02});
  });
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
  L.forEach((l,i)=>{
    if(i) sl.addShape("rect",{x:0.55,y:y-0.14,w:12.23,h:0.008,fill:{color:"EEF1F6"}});
    sl.addText(l[0],{x:0.6,y:y,w:12.2,h:0.3,fontSize:12.5,bold:true,color:RP.NAVY,fontFace:RP_TITRE});
    sl.addText(l[1],{x:0.6,y:y+0.31,w:12.2,h:0.5,fontSize:10.5,color:"333333",fontFace:"Arial",valign:"top"});
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
  const eT=opts.total?rpEch(tot):null;
  labels.forEach((lab,i)=>{
    let yTop=base;
    series.forEach((s,j)=>{ const val=Math.max(0,s.values[i]||0), sh=val/mx*ph;
      if(sh>0.012){ yTop-=sh; sl.addShape("rect",{x:px+i*gW+off,y:yTop,w:bW,h:sh,fill:{color:s.color||RP_PAL[j%RP_PAL.length]}}); } });
    /* total au-dessus de la pile : sans lui, le lecteur ne peut pas chiffrer la colonne */
    if(opts.total&&tot[i]) sl.addText(rpFmtE(tot[i],eT),{x:px+i*gW,y:yTop-0.2,w:gW,h:0.18,
      align:"center",valign:"bottom",fontSize:7.5,bold:true,color:RP.NAVY,fontFace:"Arial"});
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

/* WATERFALL (bridge) — exhibit standard pour expliquer une VARIATION : passage de l'EBITDA de la
   première à la dernière année du plan, génération de trésorerie sur l'horizon. Le lecteur voit
   d'un coup ce qui crée et ce qui consomme, là où un tableau lui demande de faire les
   soustractions lui-même.
   items = [{lib, val, type}] · type "borne" = colonne pleine depuis zéro (point de départ ou
   d'arrivée), sinon colonne flottante posée sur le cumul courant. */
function rpWaterfall(sl,x,y,w,h,titre,items,note){
  const n=(items||[]).length; if(!n) return y+h;
  let cum=0;
  const seg=items.map(it=>{
    const borne=(it.type==="borne"), d=+it.val||0;
    const a=borne?0:cum, b=borne?d:cum+d;
    cum=b;
    return {lib:it.lib,val:d,bas:Math.min(a,b),haut:Math.max(a,b),borne:borne,pos:d>=0,fin:b};
  });
  const bornes=seg.reduce((t,s)=>t.concat([s.bas,s.haut]),[0]);
  const e=rpEch(seg.map(s=>s.borne?s.haut:s.val).concat(bornes));
  sl.addText([{text:titre,options:{color:RP.BLEU,bold:true,fontSize:10}},
              {text:"   ("+e.lib+")",options:{color:RP.G_CLAIR,fontSize:9,italic:true}}],
    {x:x,y:y,w:w,h:0.26,fontFace:"Arial",charSpacing:0.5});
  const px=x+0.12, py=y+0.44, pw=w-0.24, ph=Math.max(1.2,h-0.44-(note?0.66:0.44));
  const mn=Math.min.apply(null,bornes), mx=Math.max.apply(null,bornes), amp=(mx-mn)||1;
  const eti=0.18, hp=ph-eti*2, yv=v=>py+eti+hp*(mx-v)/amp;
  sl.addShape("rect",{x:px,y:yv(0),w:pw,h:0.008,fill:{color:RP.G_CLAIR}});
  const gW=pw/n, bW=Math.min(1.05,gW*0.62);
  seg.forEach((s,i)=>{
    const bx=px+i*gW+(gW-bW)/2, y1=yv(s.haut), y2=yv(s.bas);
    const coul=s.borne?RP.NAVY:(s.pos?"2E5AAC":"9E3A38");
    sl.addShape("rect",{x:bx,y:y1,w:bW,h:Math.max(0.02,y2-y1),fill:{color:coul}});
    /* une borne garde son signe (un EBITDA de départ négatif s'affiche « (12,6) ») ; un delta
       porte son sens de variation */
    const txt=s.borne?rpFmtE(s.val,e):((s.pos?"+":"−")+rpFmtE(Math.abs(s.val),e));
    const au=s.borne?(s.val>=0):s.pos;
    sl.addText(txt,{x:bx-0.35,y:au?y1-eti:y2,w:bW+0.7,h:eti,align:"center",valign:au?"bottom":"top",
      fontSize:7.5,bold:s.borne,color:s.borne?RP.NAVY:(s.pos?RP.G_TXT:"9E3A38"),fontFace:"Arial"});
    /* connecteur : le niveau de cumul se prolonge jusqu'à la colonne suivante */
    if(i<n-1&&!seg[i+1].borne)
      sl.addShape("rect",{x:bx+bW,y:yv(s.fin),w:gW-bW,h:0.006,fill:{color:"C9D2E0"}});
    sl.addText(s.lib,{x:px+i*gW-0.08,y:py+ph+0.03,w:gW+0.16,h:0.38,align:"center",valign:"top",
      fontSize:7.5,color:s.borne?RP.NAVY:RP.G_TXT,bold:s.borne,fontFace:"Arial"});
  });
  if(note) sl.addText(note,{x:x,y:y+h-0.34,w:w,h:0.32,fontSize:7.5,italic:true,color:RP.G_CLAIR,
    fontFace:"Arial",valign:"top"});
  return y+h;
}
/* COLONNES + SEUIL : une série de colonnes et une ligne de référence horizontale (norme de
   covenant, CA critique constant…). Sert à montrer une marge de sécurité. */
function rpColonnesNorme(sl,x,y,w,h,titre,labels,valeurs,norme,libNorme,opts){
  opts=opts||{};
  const e=opts.pct?null:rpEch(valeurs.concat([norme]));
  const fmt=v=>opts.pct?(Math.round(v*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:2})+(opts.suf||"×"):rpFmtE(v,e);
  sl.addText([{text:titre,options:{color:RP.BLEU,bold:true,fontSize:10}}].concat(
      opts.pct?[]:[{text:"   ("+e.lib+")",options:{color:RP.G_CLAIR,fontSize:9,italic:true}}]),
    {x:x,y:y,w:w,h:0.26,fontFace:"Arial",charSpacing:0.5});
  const px=x+0.12, py=y+0.44, pw=w-0.24, ph=Math.max(1,h-0.44-0.42);
  const vals=valeurs.map(v=>+v||0);
  let mx=Math.max.apply(null,vals.concat([norme])), mn=Math.min.apply(null,vals.concat([norme,0]));
  const amp=(mx-mn)||1, eti=0.18, hp=ph-eti, yv=v=>py+eti+hp*(mx-v)/amp;
  const gW=pw/vals.length, bW=Math.min(0.95,gW*0.5);
  sl.addShape("rect",{x:px,y:yv(0),w:pw,h:0.008,fill:{color:RP.G_CLAIR}});
  vals.forEach((v,i)=>{
    const bx=px+i*gW+(gW-bW)/2, ok=opts.min?(v>=norme):(v<=norme);
    const y1=Math.min(yv(v),yv(0)), y2=Math.max(yv(v),yv(0));
    sl.addShape("rect",{x:bx,y:y1,w:bW,h:Math.max(0.02,y2-y1),fill:{color:ok?"2E5AAC":"9E3A38"}});
    sl.addText(fmt(v),{x:bx-0.3,y:(v>=0?y1-eti:y2),w:bW+0.6,h:eti,align:"center",
      valign:v>=0?"bottom":"top",fontSize:7.5,color:RP.G_TXT,fontFace:"Arial"});
    sl.addText(labels[i],{x:px+i*gW,y:py+ph+0.03,w:gW,h:0.2,align:"center",fontSize:8,
      color:RP.G_TXT,fontFace:"Arial"});
  });
  sl.addShape("line",{x:px,y:yv(norme),w:pw,h:0,line:{color:RP.ORANGE,width:1.25,dashType:"dash"}});
  /* étiquette de la norme au-dessus du trait, à gauche : à droite elle tombe sur la dernière colonne */
  sl.addText(libNorme+" "+fmt(norme),{x:px,y:yv(norme)-0.23,w:2.4,h:0.22,
    fontSize:7.5,bold:true,color:RP.ORANGE,fontFace:"Arial"});
  return y+h;
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

/* =========================================================================
   PAGES D'EXHIBIT PARTAGÉES — utilisées par le rapport de business plan ET par le
   mémorandum d'information. Chaque page porte un graphique qui démontre son titre ;
   les valeurs sont des différences ou des cumuls d'agrégats DÉJÀ publiés par le moteur,
   jamais un recalcul parallèle : un bridge ne peut pas contredire son tableau.
   C = {B, mm, proj, ap, aF, fyp, mention, sec} · renvoie le numéro de page atteint.
   ========================================================================= */
/* construction du chiffre d'affaires : par ligne de revenus (modèle) ou trajectoire et marges */
function rpPageCA(pptx,C,page){
  const {B,mm,proj,ap,aF,fyp,mention}=C, v=(typeof ETATS!=="undefined"&&ETATS)?ETATS.v:{};
  const a1=(typeof ETATS!=="undefined"&&ETATS&&ETATS.annees.length)?ETATS.annees[ETATS.annees.length-1]:null;
  const caF=proj.pl.CA[aF], caD1=proj.pl.CA[ap[0]];
  const tcam=(caD1>0&&caF>0&&ap.length>1)?Math.pow(caF/caD1,1/(ap.length-1))-1:null;
  const sl=pptx.addSlide();
  rpEnTete(sl,B.societe,C.sec);
  if(C.chip) rpChip(sl,C.chip);
  const det=Object.keys(proj.pl.CA_DETAIL||{}).map(k=>proj.pl.CA_DETAIL[k])
    .filter(L=>ap.some(a=>Math.abs(L.vals[a]||0)>0.5))
    .sort((p,q)=>(q.vals[aF]||0)-(p.vals[aF]||0));
  /* nom court pour la légende : « Master 1 (MPCCA, MPMP, MPMS, E-MBA) » devient « Master 1 » —
     le libellé complet reste dans le tableau. Au-delà de 5 lignes, le reste est agrégé. */
  const court=L=>rpCoupe(String(L.lib).split(/[(–—:]/)[0].trim()||L.lib,22);
  const gr=det.slice(0,5).map((L,i)=>({name:court(L),values:ap.map(a=>L.vals[a]||0),color:RP_PAL[i%RP_PAL.length]}));
  if(det.length>5) gr.push({name:"Autres lignes",values:ap.map(a=>det.slice(5).reduce((t,L)=>t+(L.vals[a]||0),0)),color:"9CA3AF"});
  const top=det[0], partTop=(top&&caF)?(top.vals[aF]||0)/caF:null;
  const yCA=rpTitreMsg(sl,"Construction du chiffre d'affaires",
    det.length
      ?("Le chiffre d'affaires passe de "+rpMsgFmt(caD1)+" à "+rpMsgFmt(caF)+" ; « "+court(top)
        +" » en représente "+rpPct(partTop)+" en "+fyp[fyp.length-1]+".")
      :("Le chiffre d'affaires passe de "+rpMsgFmt(caD1)+" à "+rpMsgFmt(caF)+" sur l'horizon du plan"
        +(tcam!==null?(", soit "+rpPct(tcam)+" par an"):"")+"."));
  if(det.length){
    rpColonnesEmpilees(sl,0.55,yCA+0.16,7.55,3.9,"("+rpLib()+")",fyp,gr,{total:true});
    const rowsCA=det.map(L=>[L.lib,rpFmt(L.vals[ap[0]]),rpFmt(L.vals[aF]),
      caF?rpPct((L.vals[aF]||0)/caF):"-"]);
    rowsCA.push(["Chiffre d'affaires total",rpFmt(caD1),rpFmt(caF),"100%"]);
    rpTable(sl,8.35,yCA+0.2,4.43,"Poids des lignes de revenus",
      [rpLib(),fyp[0],fyp[fyp.length-1],"% "+fyp[fyp.length-1]],rowsCA,
      rowsCA.map((r,i)=>i===rowsCA.length-1?"total":"detail"),new Set(),[3.1,0.8,0.8,0.8],7.5,
      "Source : inducteurs de volumes et de prix du modèle.",0.28);
  } else {
    /* sans détail par ligne (business plan bâti sur un historique), on montre la trajectoire et
       la structure de marge — la page reste un exhibit, pas un demi-graphique perdu */
    rpColonnes(sl,0.55,yCA+0.16,7.55,3.9,"("+rpLib()+")",fyp,
      [{name:"Chiffre d'affaires",values:ap.map(a=>proj.pl.CA[a]),color:"172554"},
       {name:"Marge brute",values:ap.map(a=>proj.pl.MARGE_BRUTE[a]),color:"2E5AAC"},
       {name:"EBITDA",values:ap.map(a=>proj.pl.EBITDA[a]),color:"FA6706"}]);
    const rowsT=[
      ["Chiffre d'affaires",...ap.map(a=>rpFmt(proj.pl.CA[a]))],
      ["Croissance",...ap.map((a,k)=>k?(proj.pl.CA[ap[k-1]]?rpPct(proj.pl.CA[a]/proj.pl.CA[ap[k-1]]-1):"-")
        :((!mm&&a1&&v.CA&&v.CA[a1])?rpPct(proj.pl.CA[a]/v.CA[a1]-1):"-"))],
      ["Taux de marge brute",...ap.map(a=>proj.pl.CA[a]?rpPct(proj.pl.MARGE_BRUTE[a]/proj.pl.CA[a]):"-")],
      ["Marge d'EBITDA",...ap.map(a=>proj.pl.CA[a]?rpPct(proj.pl.EBITDA[a]/proj.pl.CA[a]):"-")]];
    rpTable(sl,8.35,yCA+0.2,4.43,"Trajectoire et marges",[rpLib(),...fyp],rowsT,
      ["total","pct","pct","pct"],new Set(),[1.9,...ap.map(()=>0.72)],8,
      (mm?"":"Croissance de la première année calculée sur le dernier exercice réel."),0.28);
  }
  rpCommentReste(sl,0.55,yCA+4.2,12.23);
  rpPied(sl,mention,++page);
  return page;
}
/* bridge d'EBITDA : ce qui crée et ce qui consomme entre la première et la dernière année */
function rpPageBridge(pptx,C,page){
  const {B,proj,ap,aF,fyp,mention}=C;
  const sl=pptx.addSlide();
  rpEnTete(sl,B.societe,C.sec);
  if(C.chip) rpChip(sl,C.chip);
  const p1=ap[0], d=cle=>(proj.pl[cle]?((proj.pl[cle][aF]||0)-(proj.pl[cle][p1]||0)):0);
  const eb1=proj.pl.EBITDA[p1];
  const items=[{lib:"EBITDA "+fyp[0],val:eb1,type:"borne"},
    {lib:"Chiffre d'affaires",val:d("CA")},
    {lib:"Coûts directs",val:d("ACHATS")},
    {lib:"Autres produits",val:d("AUTRES_PRODUITS")},
    {lib:"Charges de personnel",val:d("CHARGES_PERSONNEL")},
    {lib:"Autres frais généraux",val:d("OPEX_TOTAL")}]
    .filter(it=>it.type==="borne"||Math.abs(it.val)>0.5);
  items.push({lib:"EBITDA "+fyp[fyp.length-1],val:proj.pl.EBITDA[aF],type:"borne"});
  /* même échelle que le graphique (cf. page de trésorerie) */
  const eBr=rpEch(items.map(it=>it.val));
  const fmBr=x=>rpFmtE(x,eBr)+" "+eBr.lib;
  const yBr=rpTitreMsg(sl,"Passage de l'EBITDA "+fyp[0]+" à "+fyp[fyp.length-1],
    "L'EBITDA gagne "+fmBr(proj.pl.EBITDA[aF]-eb1)+" : la croissance du chiffre d'affaires en apporte "
    +fmBr(d("CA"))+", les coûts directs et les charges fixes en consomment "
    +fmBr(Math.abs(d("ACHATS")+d("CHARGES_PERSONNEL")+d("OPEX_TOTAL")))+".");
  rpWaterfall(sl,0.55,yBr+0.2,12.23,3.75,"Bridge d'EBITDA",items,
    "Écart entre la première et la dernière année du plan. Bleu : contribution positive · rouge : consommation. La somme des colonnes reconstitue l'EBITDA de fin de plan.");
  rpCommentReste(sl,0.55,yBr+4.15,12.23);
  rpPied(sl,mention,++page);
  return page;
}
/* génération de trésorerie : cumul de l'horizon, bouclé sur les agrégats du tableau de flux */
function rpPageTreso(pptx,C,page){
  const {B,proj,ap,aF,fyp,mention}=C;
  const sl=pptx.addSlide();
  rpEnTete(sl,B.societe,C.sec);
  if(C.chip) rpChip(sl,C.chip);
  const som=f=>ap.reduce((t,a)=>t+(f(proj.tft[a])||0),0);
  const ouv=proj.tft[ap[0]].OUVERTURE||0, clo=proj.tft[aF].CLOTURE||0;
  const cfl=[{lib:"Trésorerie d'ouverture",val:ouv,type:"borne"},
    {lib:"Capacité d'autofinancement",val:som(t=>t.FA)},
    {lib:"Variation du BFR",val:som(t=>t.ZB-t.FA)},
    {lib:"Investissements",val:som(t=>t.ZC)},
    {lib:"Capital et subventions",val:som(t=>(t.FK||0)+(t.FL||0))},
    {lib:"Dette et comptes courants",val:som(t=>(t.EMPRUNT||0)+(t.REMBOURS||0)+(t.CCA_TIR||0)+(t.CCA_REMB||0))},
    {lib:"Dividendes",val:som(t=>t.FN||0)}]
    .filter(it=>it.type==="borne"||Math.abs(it.val)>0.5);
  cfl.push({lib:"Trésorerie de clôture",val:clo,type:"borne"});
  /* le message adopte l'échelle du GRAPHIQUE (le graphique s'échelonne seul pour rester lisible) :
     annoncer « 53 834 KFCFA » sous un graphique gradué en MFCFA rendait la page incompréhensible */
  const eCf=rpEch(cfl.map(it=>it.val).concat([clo]));
  const fmCf=x=>rpFmtE(x,eCf)+" "+eCf.lib;
  const yCf=rpTitreMsg(sl,"Génération de trésorerie sur l'horizon du plan",
    "Sur l'ensemble du plan, l'exploitation nette des investissements dégage "+fmCf(som(t=>t.ZB+t.ZC))
    +" ; la trésorerie de clôture s'établit à "+fmCf(clo)+".",[fmCf(clo)]);
  rpWaterfall(sl,0.55,yCf+0.2,12.23,3.75,"Cumul "+fyp[0]+" – "+fyp[fyp.length-1],cfl,
    "Cumul des flux du tableau de trésorerie sur l'horizon. Bleu : ressources · rouge : emplois.");
  rpCommentReste(sl,0.55,yCf+4.15,12.23);
  rpPied(sl,mention,++page);
  return page;
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
     mm?("scénario "+proj.scenario):(hyp.caMode==="volumePrix"?"volumes × prix":("croissance "+rpPct(hyp.caCroiss[0])+"/an")),null,"neutre","chart","224289"],
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
      :("Les hypothèses sont calées sur l'historique "+fy[0]+" – "+fy[fy.length-1]+" : "
        +(hyp.caMode==="volumePrix"
          ?("le chiffre d'affaires est reconstruit à partir de "+((hyp.revenus||[]).length||1)+" ligne"+((((hyp.revenus||[]).length||1)>1)?"s":"")+" de revenus en volumes × prix")
          :("croissance du chiffre d'affaires de "+rpPct(hyp.caCroiss[0])+" la première année"))
        +" et coûts directs à "+Math.round(hyp.coutsDirects_pct*100)+" % du chiffre d'affaires."));
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
      if(m==="unit")return nb0((+cl.val||0))+" "+rpSym()+" par unité de volume";
      const q=(function(){try{return volInducteurs(cl.rows,0,{revenus:hyp.revenus,fCA:1});}catch(e){return 0;}})();
      const t=(cl.prix&&+cl.prix.val)||0;
      return (q?(nb0(q)+" × "):"")+nb0(t)+" "+rpSym()+((cl.prix&&cl.prix.unit)?(" "+cl.prix.unit.replace(/^(FCFA|EUR|USD|€|\$)\/?/,"/ ")):"");};
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
  gH("Activité et marges",(hyp.caMode==="volumePrix"
    ? (hyp.revenus||[]).map(function(Lg){
        var vg=(Lg.volProj&&Lg.volProj.mode==="annuel")?"par année":pcH((Lg.volProj&&+Lg.volProj.croiss)||0)+"/an";
        var pg=(Lg.prixProj&&Lg.prixProj.mode==="annuel")?"par année":pcH((Lg.prixProj&&+Lg.prixProj.croiss)||0)+"/an";
        return [(Lg.name||"Ligne de revenus"),"volume "+vg+" · prix "+pg];
      })
    : [["Croissance du CA par année",hyp.caCroiss.map(pcH).join(" ; ")]]).concat([
    ["Coûts directs (% du CA)",pcH(hyp.coutsDirects_pct)],
    ["Croissance des charges de personnel",pcH(hyp.personnel_croiss)+"/an"],
    ["Taux d'IS effectif",pcH(hyp.is_taux)]]));
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
  rpSection(pptx,S+4,"Projections financières",
    ["Construction du chiffre d'affaires","Compte de résultat, bilan et trésorerie","Passage de l'EBITDA et génération de trésorerie"],mention,++page);
  const aF=ap[ap.length-1];
  const CTX={B:B,mm:mm,proj:proj,ap:ap,aF:aF,fyp:fyp,mention:mention,sec:"Projections financières"};
  page=rpPageCA(pptx,CTX,page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Projections financières");
  const bascEb=rpBascule(ap,a=>proj.pl.EBITDA[a]);
  const yPL=rpTitreMsg(sl,"Compte de résultat prévisionnel",
    (bascEb&&bascEb!==ap[0])
      ?("L'EBITDA devient positif en "+libFY(bascEb,true)+" et atteint "+rpMsgFmt(ebF)
        +(mgEbF!==null?(", soit "+Math.round(mgEbF*100)+" % du chiffre d'affaires"):"")+" en "+fyp[fyp.length-1]+".")
      :("L'EBITDA progresse jusqu'à "+rpMsgFmt(ebF)
        +(mgEbF!==null?(", soit "+Math.round(mgEbF*100)+" % du chiffre d'affaires"):"")+", en "+fyp[fyp.length-1]+"."),[rpMsgFmt(ebF)]);
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
  page=rpPageBridge(pptx,CTX,page);
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
  page=rpPageTreso(pptx,CTX,page);
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
  const finS=rpTable(sl,0.55,yPM+0.2,7.35,B.societe.toUpperCase()+" - Seuil de rentabilité",
    [rpLib(),...fyp],srRows,["titre","detail","detail","sous_total","detail","detail","detail"],
    new Set(),[3.3,...ap.map(()=>0.86)],8.5,
    "Point mort où le résultat d'exploitation s'annule : coûts directs = charges variables ; frais généraux, personnel et dotations = charges fixes.",0.3);
  /* le croisement CA / CA critique se voit, il ne se déduit pas d'un tableau de sept lignes */
  rpColonnes(sl,7.85,yPM+0.24,4.93,3.1,"("+rpLib()+")",fyp,
    [{name:"Chiffre d'affaires",values:ap.map(a=>sr(a).ca),color:"172554"},
     {name:"CA critique",values:ap.map(a=>sr(a).seuil),color:"FA6706"}]);
  rpCommentReste(sl,0.55,Math.max(finS,yPM+3.5)+0.18,12.23);
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
  /* marge de sécurité du covenant le mieux documenté : un ratio se lit contre sa norme, pas seul */
  { const CV=[{lib:"Dette nette / EBITDA",f:a=>cov(a).lev,n:3.5,min:false},
              {lib:"DSCR",f:a=>cov(a).dscr,n:1.2,min:true},
              {lib:"Liquidité générale",f:a=>cov(a).liq,n:1,min:true},
              {lib:"Gearing",f:a=>cov(a).gear,n:1.5,min:false}]
      .map(c=>Object.assign({},c,{vals:ap.map(c.f),n2:ap.filter(a=>c.f(a)!=null).length}))
      .filter(c=>c.n2>=Math.max(2,Math.ceil(ap.length/2)))
      .sort((p,q)=>q.n2-p.n2)[0];
    if(CV) rpColonnesNorme(sl,0.55,finC+0.3,6.6,2.5,CV.lib+" — trajectoire et norme",
      fyp.filter((f,i)=>CV.vals[i]!=null),CV.vals.filter(x=>x!=null),CV.n,
      (CV.min?"Plancher ":"Plafond ")+"usuel",{pct:true,min:CV.min});
    rpCommentReste(sl,CV?7.35:0.55,finC+0.3,CV?5.43:12.23);
  }
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
      +(nEc?(" ; "+nEc+" méthode"+(nEc>1?"s écartées":" écartée")):"")+".",[rpMsgFmt(val.fourchette.retenue)]); }
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
      [2.1,...axes.col.map(()=>1.2)],9.5,"Chaque cellule = valeur des fonds propres (EV actualisée − dette nette + ajustements du pont). Ligne et colonne centrales = hypothèses retenues ; l'intensité du fond suit la valeur.",0.3,
      /* carte de chaleur : la grille se lit d'un coup d'œil au lieu de 25 nombres gris */
      {centre:true,fond:(i,j)=>{
        if(!j) return null;
        const pl=(val.sensi||[]).reduce((t,l)=>t.concat(l.filter(x=>isFinite(x))),[]);
        if(pl.length<2) return null;
        const lo=Math.min.apply(null,pl), hi=Math.max.apply(null,pl), x=(val.sensi[i]||[])[j-1];
        if(!isFinite(x)||hi<=lo) return null;
        return ["F4F7FC","E7EEF8","D8E4F4","C7D8EF","B3CBEA"][Math.min(4,Math.floor((x-lo)/(hi-lo)*5))];
      }});
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
/* ---------- prose et schémas de la partie « société » ----------
   La fiche d'identité est une suite de champs ; un mémorandum demande des PHRASES. On compose
   donc une amorce rédigée à partir des champs structurés (secteur, ville, création, effectifs),
   puis les fragments de la description deviennent des puces. */
function rpAnnee(txt){const m=String(txt||"").match(/\b(19|20)\d{2}\b/);return m?m[0]:null;}
function rpListeFr(txt){
  const p=String(txt||"").split(/\s*[·;]\s*/).map(s=>s.trim()).filter(Boolean);
  if(!p.length) return "";
  if(p.length===1) return p[0];
  return p.slice(0,-1).join(", ")+" et "+p[p.length-1];
}
function rpProse(B,I){
  I=I||{};
  const soc=B.societe;
  const sect=String(I.secteur||(typeof DOSSIER!=="undefined"&&DOSSIER&&DOSSIER.secteur)||"").trim();
  const ville=String(I.adresse||"").split(",")[0].trim();
  const an=rpAnnee(I.creation);
  let lead=soc+(sect?(" exerce dans "+(/^[aeiouéèêAEIOU]/.test(sect)?"l'":"le secteur ")
    +sect.charAt(0).toLowerCase()+sect.slice(1)):" exerce son activité")
    +(ville?(" à "+ville):"")+".";
  const eff=rpListeFr(rpAnonTxt(I.effectif));
  if(an||eff) lead+=" "+(an?("Créée en "+an+", elle"):"Elle")+(eff?(" compte "+eff+"."):" poursuit son développement.");
  /* fragments de la description → puces (le texte de l'analyste n'est pas réécrit, il est structuré) */
  const brut=rpAnonTxt([I.description,I.services].filter(Boolean).join(" "));
  const puces=brut.split(/(?:\.\s+|\.$)/).map(s=>s.trim()).filter(s=>s.length>12)
    .map(s=>rpCoupe(s,190).replace(/[.;]?$/,"."));
  return {lead:lead,puces:puces};
}
/* SCHÉMA D'ACTIONNARIAT : « Nom 55 % · Nom 20 % » devient un organigramme — une répartition de
   capital se lit en un coup d'œil, pas dans une cellule de tableau. */
function rpActionnaires(txt){
  return String(txt||"").split(/\s*[·;,]\s*/).map(s=>s.trim()).filter(Boolean).map(s=>{
    const m=s.match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return {nom:rpCoupe(s.replace(/\s*\(?-?\d+(?:[.,]\d+)?\s*%\)?\s*/,"").trim(),28),
            pct:m?parseFloat(m[1].replace(",",".")):null};
  }).filter(a=>a.nom);
}
function rpSchemaCapital(sl,x,y,w,h,societe,acts,note){
  const A=(acts||[]).slice(0,5);
  if(!A.length) return y;
  const n=A.length, gap=0.16, bw=Math.min(2.5,(w-gap*(n-1))/n), tot=n*bw+gap*(n-1);
  const x0=x+(w-tot)/2, hb=0.62, yb=y+0.24;
  const somme=A.reduce((t,a)=>t+(a.pct||0),0);
  A.forEach((a,i)=>{
    const bx=x0+i*(bw+gap);
    sl.addShape("rect",{x:bx,y:yb,w:bw,h:hb,fill:{color:RP.BLANC},line:{color:"C3D0E6",width:1}});
    sl.addText(a.nom,{x:bx+0.06,y:yb+0.04,w:bw-0.12,h:0.34,fontSize:8.5,color:RP.G_TITRE,
      fontFace:"Arial",valign:"top"});
    sl.addText(a.pct!=null?(String(a.pct).replace(".",",")+" %"):"n.d.",
      {x:bx+0.06,y:yb+0.36,w:bw-0.12,h:0.24,fontSize:11,bold:true,color:RP.BLEU,fontFace:"Arial"});
    /* descente vers la barre de collecte — en TRAITS : un rectangle fin se rend avec un contour
       et l'organigramme paraît fait de petites boîtes */
    sl.addShape("line",{x:bx+bw/2,y:yb+hb,w:0,h:0.26,line:{color:"9DB0CE",width:1}});
  });
  const yBar=yb+hb+0.26;
  sl.addShape("line",{x:x0+bw/2,y:yBar,w:tot-bw,h:0,line:{color:"9DB0CE",width:1}});
  sl.addShape("line",{x:x+w/2,y:yBar,w:0,h:0.3,line:{color:"9DB0CE",width:1}});
  const wS=Math.min(5.6,w*0.62), yS=yBar+0.3;
  sl.addShape("rect",{x:x+(w-wS)/2,y:yS,w:wS,h:0.62,fill:{color:RP.NAVY}});
  sl.addText(societe,{x:x+(w-wS)/2+0.1,y:yS,w:wS-0.2,h:0.62,align:"center",valign:"middle",
    fontSize:12,bold:true,color:RP.BLANC,fontFace:"Arial"});
  const nt=(note||"")+((somme&&Math.abs(somme-100)>0.5)?(" Total des parts identifiées : "
    +String(Math.round(somme*10)/10).replace(".",",")+" %."):"");
  if(nt.trim()) sl.addText(nt.trim(),{x:x,y:yS+0.7,w:w,h:0.3,fontSize:7.5,italic:true,
    color:RP.G_CLAIR,fontFace:"Arial",valign:"top"});
  return yS+0.66+(nt.trim()?0.34:0);
}
/* Points forts de l'investissement, dérivés des chiffres du plan puis complétés par la fiche
   d'identité. Partagés par le teaser et le mémorandum d'information. */
function rpPointsForts(proj,ap,I){
  I=I||{};
  const aF=ap[ap.length-1], a1=ap[0];
  const caF=proj.pl.CA[aF], ca1=proj.pl.CA[a1], ebF=proj.pl.EBITDA[aF];
  const mg=caF?ebF/caF:null;
  const tcam=(ca1>0&&caF>0&&ap.length>1)?Math.pow(caF/ca1,1/(ap.length-1))-1:null;
  const basc=rpBascule(ap,a=>proj.pl.EBITDA[a]);
  const trF=proj.bs.TRESO_NETTE[aF], dtF=proj.bs.DETTE[aF];
  return [
    (tcam!==null&&caF>ca1)?("Chiffre d'affaires porté de "+rpMsgFmt(ca1)+" à "+rpMsgFmt(caF)
      +" sur le plan d'affaires, soit "+rpPct(tcam)+" par an."):null,
    (mg!==null&&ebF>0)?("Marge d'EBITDA de "+rpPct(mg)+" en "+libFY(aF,true)
      +((basc&&basc!==a1)?(", après un point d'inflexion atteint en "+libFY(basc,true)):"")+"."):null,
    (trF>0&&!dtF)?("Structure financière sans dette bancaire à terme, trésorerie de clôture de "+rpMsgFmt(trF)+"."):null,
    I.effectif?rpCoupe("Organisation en place : "+rpAnonTxt(I.effectif),135):null,
    I.marche?rpCoupe(rpAnonTxt(I.marche).split(". ")[0]+".",135):null,
    I.creation?("Activité exercée depuis "+I.creation+"."):null
  ].filter(Boolean);
}
/* intitulé de bloc précédé d'un petit repère vertical (dispositif des références : le lecteur
   distingue un intitulé de bloc d'un titre de page sans changer de corps) */
function rpTeaserBloc(sl,x,y,w,titre){
  sl.addShape("rect",{x:x,y:y+0.02,w:0.045,h:0.18,fill:{color:RP.BLEU}});
  sl.addText(String(titre).toUpperCase(),{x:x+0.14,y:y,w:w-0.14,h:0.22,fontSize:8.5,bold:true,
    color:RP.BLEU,charSpacing:1.5,fontFace:"Arial"});
  return y+0.26;
}
/* CARTES NUMÉROTÉES : filet d'accent en tête, numéro fantôme, titre, texte. Reprend la grille
   de cartes des présentations de référence — sert aux pages qualitatives (étapes, axes, risques). */
function rpCartesNum(sl,x,y,w,h,items,opts){
  opts=opts||{};
  const n=items.length; if(!n) return y;
  const gap=0.22, cw=(w-gap*(n-1))/n;
  items.forEach((it,i)=>{
    const cx=x+i*(cw+gap);
    sl.addShape("rect",{x:cx,y:y,w:cw,h:0.05,fill:{color:i%2?RP.ORANGE:RP.NAVY}});
    sl.addShape("rect",{x:cx,y:y+0.05,w:cw,h:h-0.05,fill:{color:RP.BLANC},line:{color:RP.FILET,width:1}});
    sl.addText(String(i+1).padStart(2,"0"),{x:cx+cw-0.85,y:y+0.14,w:0.72,h:0.5,align:"right",
      fontSize:26,bold:true,color:RP.PALE,fontFace:RP_TITRE});
    sl.addText(it[0],{x:cx+0.2,y:y+0.2,w:cw-1.0,h:0.34,fontSize:11.5,bold:true,color:RP.NAVY,
      fontFace:RP_TITRE,valign:"top"});
    sl.addShape("rect",{x:cx+0.2,y:y+0.6,w:cw-0.4,h:0.012,fill:{color:RP.FILET}});
    if(it[1]) sl.addText(it[1],{x:cx+0.2,y:y+0.68,w:cw-0.4,h:Math.max(0.3,h-0.78),fontSize:9.5,
      color:"333333",fontFace:"Arial",valign:"top"});
  });
  return y+h;
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

/* =========================================================================
   COMPOSITION « DOCUMENT DE VENTE » — primitives marine / ocre.
   Le teaser n'est pas un rapport : il vend. D'où des cartes à filet (jamais
   d'ombre portée), un rail d'indicateurs, un anneau à valeur centrale et un
   quadrant à réticule, plutôt que la grille dense des rapports d'analyse.
   RÈGLE : chaque page a sa PROPRE composition. Répéter la même grille trois
   fois donne un gabarit, pas un document — c'est la remarque de Salif du
   2026-09-04. Ces primitives sont génériques : elles ne lisent aucune donnée,
   elles posent des formes ; ce sont les construire*() qui les alimentent.
   ========================================================================= */
/* Chiffre d'AFFICHE : un titre ne porte jamais neuf chiffres. On choisit l'échelle
   (K / M / Md) qui tient en trois à cinq signes et on rend le libellé d'unité
   correspondant, dans la devise du dossier — indépendamment de l'unité d'affichage
   retenue pour les tableaux, qui elle peut légitimement rester en francs. */
function rpGrand(v){
  if(v===null||v===undefined||!isFinite(v)) return {txt:"—",unite:""};
  const a=Math.abs(v);                       /* base interne : milliers d'unités monétaires */
  let d=1,k="K";
  if(a>=1e6){d=1e6;k="Md";} else if(a>=1e3){d=1e3;k="M";}
  const x=v/d, dec=(Math.abs(x)<10?1:0);
  const s=Math.abs(x).toLocaleString("fr-FR",{minimumFractionDigits:dec,maximumFractionDigits:dec})
    .replace(/[  ]/g," ");
  return {txt:(x<0?"("+s+")":s),unite:rpDevU(k)};
}
function rpOeil(sl,x,y,txt,coul){
  coul=coul||RP.OCRE;
  sl.addShape("rect",{x:x,y:y+0.055,w:0.115,h:0.115,fill:{color:coul}});
  sl.addText(String(txt||"").toUpperCase(),{x:x+0.26,y:y,w:9.0,h:0.24,
    fontSize:8.5,bold:true,color:coul,charSpacing:1.8,fontFace:"Arial"});
}
/* carte à filet. `fond` seul = carte pleine (le filet prend la couleur du fond,
   PptxGenJS n'ayant pas de « pas de trait » fiable sur roundRect). */
function rpCarte(sl,x,y,w,h,o){
  o=o||{};
  const plein=!!o.fond;
  sl.addShape("roundRect",{x:x,y:y,w:w,h:h,rectRadius:0.03,
    fill:{color:o.fond||RP.BLANC},
    line:{color:plein?o.fond:(o.filet||RP.FILET),width:1}});
  if(o.titre) sl.addText(String(o.titre).toUpperCase(),{x:x+0.30,y:y+0.20,w:w-0.60,h:0.24,
    fontSize:8.3,bold:true,color:o.titreCoul||RP.OCRE,charSpacing:1.6,fontFace:"Arial"});
  return {x:x+0.30,w:w-0.60,y:y+0.52};
}
/* indicateur du rail. `plein` = carte marine pleine : à réserver à UN seul
   indicateur par page, celui qui porte l'argument. */
function rpKPI(sl,x,y,w,h,o){
  const plein=!!o.plein;
  const cLab=plein?RP.PALE2:RP.OCRE, cVal=plein?RP.BLANC:(o.couleur||RP.NAVY),
        cTxt=plein?RP.PALE2:"333333", cFond=plein?RP.NAVY:RP.BLANC;
  sl.addShape("roundRect",{x:x,y:y,w:w,h:h,rectRadius:0.03,
    fill:{color:cFond},line:{color:plein?RP.NAVY:RP.FILET,width:1}});
  if(o.label) sl.addText(String(o.label).toUpperCase(),{x:x+0.34,y:y+0.24,w:w-0.68,h:0.24,
    fontSize:8.3,bold:true,color:cLab,charSpacing:1.6,fontFace:"Arial"});
  const runs=[{text:String(o.valeur),options:{fontSize:o.taille||25,bold:true,color:cVal,fontFace:"Arial"}}];
  if(o.unite) runs.push({text:" "+o.unite,options:{fontSize:9.5,bold:true,color:cLab,fontFace:"Arial"}});
  sl.addText(runs,{x:x+0.34,y:y+0.54,w:w-0.68,h:0.50,valign:"middle"});
  if(o.desc) sl.addText(o.desc,{x:x+0.34,y:y+1.06,w:w-0.68,h:Math.max(0.24,h-1.16),
    fontSize:8.7,color:cTxt,fontFace:"Arial",valign:"top"});
}
/* quadrant 2 × 2 séparé par un réticule — quatre mesures de même rang */
function rpQuadrant(sl,x,y,w,h,items){
  sl.addShape("rect",{x:x+w/2,y:y+0.20,w:0.008,h:h-0.40,fill:{color:RP.FILET}});
  sl.addShape("rect",{x:x+0.10,y:y+h/2,w:w-0.20,h:0.008,fill:{color:RP.FILET}});
  items.slice(0,4).forEach((it,i)=>{
    const qx=x+0.24+(w/2)*(i%2), qy=y+0.28+(h/2)*Math.floor(i/2), qw=w/2-0.44;
    sl.addText(it.label,{x:qx,y:qy,w:qw,h:0.24,fontSize:8.7,bold:true,color:RP.NAVY,fontFace:"Arial"});
    sl.addText(String(it.valeur),{x:qx,y:qy+0.28,w:qw,h:0.44,fontSize:it.taille||19,bold:true,
      color:it.couleur||RP.NAVY,fontFace:"Arial"});
    if(it.desc) sl.addText(it.desc,{x:qx,y:qy+0.76,w:qw,h:0.48,fontSize:8.3,color:RP.G_TXT,
      fontFace:"Arial",valign:"top"});
  });
}
/* anneau à valeur centrale + légende posée à la main (pastille, intitulé, poids).
   La légende native de PptxGenJS ne permet pas d'afficher le poids en gras sous
   l'intitulé, et son placement automatique déborde des cartes étroites. */
function rpAnneauCentre(sl,x,y,w,h,o){
  const D=Math.min(w*0.54,h);
  const pc1=v=>(v*100).toFixed(1).replace(".",",")+" %";
  sl.addChart("doughnut",[{name:o.titre||"part",labels:o.labels,values:o.values}],{
    x:x,y:y,w:D,h:D,holeSize:64,chartColors:o.colors,
    showLegend:false,showValue:false,showPercent:false,showTitle:false,
    dataBorder:{pt:1.5,color:RP.BLANC}});
  sl.addText(String(o.centre),{x:x,y:y+D/2-0.32,w:D,h:0.36,align:"center",
    fontSize:18,bold:true,color:RP.NAVY,fontFace:"Arial"});
  if(o.sousCentre) sl.addText(o.sousCentre,{x:x,y:y+D/2+0.04,w:D,h:0.24,align:"center",
    fontSize:8.5,color:RP.G_TXT,fontFace:"Arial"});
  /* La légende tient dans une colonne étroite : l'intitulé peut passer sur deux
     lignes, le pas la suit. Au-delà de quatre postes elle sortirait de la carte —
     c'est à l'appelant de regrouper le reliquat sous « Autres ». */
  const tot=o.values.reduce((s,v)=>s+Math.abs(v),0)||1;
  const lx=x+D+0.28, lw=Math.max(0.9,w-D-0.34), pas=0.60;
  let ly=y+Math.max(0,(D-o.labels.length*pas)/2)+0.06;
  o.labels.forEach((lab,i)=>{
    sl.addShape("rect",{x:lx,y:ly+0.04,w:0.13,h:0.13,fill:{color:o.colors[i]}});
    sl.addText(lab,{x:lx+0.22,y:ly-0.02,w:lw-0.22,h:0.28,fontSize:8,color:"333333",
      fontFace:"Arial",valign:"top"});
    sl.addText(pc1(Math.abs(o.values[i])/tot),{x:lx+0.22,y:ly+0.26,w:lw-0.22,h:0.26,
      fontSize:10.5,bold:true,color:o.colors[i],fontFace:"Arial"});
    ly+=pas;
  });
}
/* tableau à bandes alternées : les agrégats (`fort`) prennent la bande soutenue,
   une ligne sur deux la bande claire. Renvoie l'ordonnée de sortie. */
function rpTableBandee(sl,x,y,w,labw,entetes,lignes){
  const n=Math.max(1,entetes.length), col=(w-labw)/n;
  entetes.forEach((e,i)=>sl.addText(e,{x:x+labw+i*col,y:y,w:col-0.10,h:0.24,align:"right",
    fontSize:8.7,bold:true,color:RP.NAVY,fontFace:"Arial"}));
  sl.addShape("rect",{x:x,y:y+0.28,w:w,h:0.014,fill:{color:RP.NAVY}});
  let ry=y+0.44;
  lignes.forEach((L,k)=>{
    if(L.fort||k%2===0) sl.addShape("rect",{x:x,y:ry-0.045,w:w,h:0.335,
      fill:{color:L.fort?RP.BANDE:RP.BANDE2}});
    sl.addText(L.lib,{x:x+0.14,y:ry+0.05,w:labw-0.24,h:0.26,fontSize:9,
      bold:!!L.fort,color:L.fort?RP.NAVY:"333333",fontFace:"Arial"});
    (L.vals||[]).forEach((val,i)=>sl.addText(val,{x:x+labw+i*col,y:ry+0.05,w:col-0.16,h:0.26,
      align:"right",fontSize:9,bold:!!L.fort,color:L.fort?RP.NAVY:"333333",fontFace:"Arial"}));
    ry+=0.335;
  });
  return ry;
}
/* pied de page sobre des documents de vente : mention à gauche, folio à droite */
function rpPiedVente(sl,mention,page,total){
  sl.addText(mention,{x:0.55,y:7.03,w:8.6,h:0.24,fontSize:8,color:RP.G_CLAIR,fontFace:"Arial"});
  sl.addText(page+" / "+(total||3),{x:9.75,y:7.03,w:3.03,h:0.24,align:"right",
    fontSize:8,color:RP.G_CLAIR,fontFace:"Arial"});
}
function construireTeaser(pptx){
  const {hyp,proj,val}=rpProj();
  const B=rpBase();
  const I=rpInfos(), T=rpTeaserConf(), anon=!!T.anonyme;
  const nom=rpNomTeaser();
  const ap=proj.annees, aF=ap[ap.length-1], a1p=ap[0];
  const fyp=ap.map(a=>libFY(a,true)), fy1=fyp[0], fyF=fyp[fyp.length-1];
  const cab=(typeof chargerCabinet==="function")?chargerCabinet():{};
  const mention=nom+" — Teaser confidentiel — "+B.dateTxt;
  RP_MENTION=mention;
  const U=rpLib();
  const ca=a=>proj.pl.CA[a], eb=a=>proj.pl.EBITDA[a], rn=a=>proj.pl.RN[a];
  const caF=ca(aF), ebF=eb(aF), mgF=caF?ebF/caF:null, ca1=ca(a1p), eb1=eb(a1p);
  const tcam=(ca1>0&&caF>0&&ap.length>1)?Math.pow(caF/ca1,1/(ap.length-1))-1:null;
  const mult=(ca1>0&&caF>0)?caF/ca1:null;
  const bascEb=rpBascule(ap,a=>proj.pl.EBITDA[a]);
  const ville=String(I.adresse||"").split(",")[0].trim();
  const secteur=I.secteur||DOSSIER.secteur||"";
  const vOk=!!(val&&isFinite(val.equityDcf)&&val.equityDcf!==0);
  /* Fourchette de valeur : eqMin/eqMax couvrent les MÉTHODES retenues. Quand le DCF
     est seul applicable (EBITDA de référence négatif, pas d'actif net), les deux
     bornes se confondent et « de X à X » n'a aucun sens — on bascule alors sur
     l'amplitude de sensibilité du DCF, et à défaut on n'annonce pas de fourchette. */
  const FRCH=(function(){
    if(!vOk) return null;
    const seuil=Math.abs(val.equityDcf)*0.005;
    let lo=val.eqMin, hi=val.eqMax;
    if(!(isFinite(lo)&&isFinite(hi))||Math.abs(hi-lo)<=seuil){
      const d=(val.methodes||[]).filter(m=>m.id==="dcf")[0];
      if(!(d&&isFinite(d.min)&&isFinite(d.max))) return null;
      lo=d.min; hi=d.max;
    }
    return Math.abs(hi-lo)<=seuil?null:{lo:lo,hi:hi};
  })();
  const nb=ap.length;
  const enLettres={2:"deux",3:"trois",4:"quatre",5:"cinq",6:"six",7:"sept",8:"huit",9:"neuf",10:"dix"}[nb]||String(nb);

  /* =======================================================================
     PAGE 1 — L'OPPORTUNITÉ.  Composition « énoncé + rail » : l'argument est
     porté par le texte à gauche, les trois cartes à droite le chiffrent. Une
     seule carte est pleine — celle qui porte la raison d'acheter.
     ======================================================================= */
  let sl=pptx.addSlide();
  rpOeil(sl,0.55,0.44,"L'opportunité"+(anon?" — profil anonyme":""));
  sl.addText(nom,{x:0.55,y:0.74,w:7.10,h:1.00,fontSize:nom.length>28?24:30,bold:true,
    color:RP.NAVY,fontFace:RP_TITRE,valign:"top"});
  sl.addShape("rect",{x:0.55,y:1.94,w:1.25,h:0.030,fill:{color:RP.OCRE}});

  const accroche=(tcam!==null)
    ? "Un chiffre d'affaires porté à "+rpMsgFmt(caF)+" en "+fyF+", soit "+rpPct(tcam)+" par an sur le plan."
    : "Un chiffre d'affaires porté à "+rpMsgFmt(caF)+" en "+fyF+".";
  sl.addText(accroche,{x:0.55,y:2.18,w:6.90,h:0.72,fontSize:15,bold:true,color:RP.CIEL,
    fontFace:"Arial",valign:"top"});

  const PRt=rpProse(B,I);
  sl.addText(rpCoupe(PRt.lead+(PRt.puces.length?(" "+PRt.puces[0]):""),400),
    {x:0.55,y:3.06,w:6.90,h:0.92,fontSize:10,color:"333333",fontFace:"Arial",valign:"top"});

  const ident=[
    ["Activité",rpCoupe(secteur||"—",58)],
    ["Implantation",rpCoupe([ville,I.pays].filter(Boolean).join(", ")||"—",58)],
    ["Horizon du plan",fy1+" – "+fyF],
    ["Documentation","Mémorandum d'information remis après signature d'un accord de confidentialité"]
  ];
  let ry=4.30;
  ident.forEach(([lab,v0])=>{
    sl.addShape("rect",{x:0.55,y:ry,w:6.90,h:0.008,fill:{color:"E8ECF1"}});
    sl.addText(lab,{x:0.55,y:ry+0.14,w:1.55,h:0.26,fontSize:9,bold:true,color:RP.NAVY,fontFace:"Arial"});
    sl.addText(v0,{x:2.20,y:ry+0.14,w:5.25,h:0.34,fontSize:9,color:"333333",fontFace:"Arial",valign:"top"});
    ry+=0.46;
  });

  const RX=8.05, RW=12.78-8.05;
  const gCA=rpGrand(caF), gCA1=rpGrand(ca1), gEB=rpGrand(ebF);
  const gEQ=vOk?rpGrand(val.equityDcf):null;
  const cartes1=[
    {label:"Le chiffre d'affaires",valeur:gCA.txt,unite:gCA.unite,
     desc:"En "+fyF+", contre "+gCA1.txt+" "+gCA1.unite+" la première année du plan."},
    (tcam!==null
      ? {label:"La croissance",valeur:rpPct(tcam),plein:true,
         desc:"Par an sur "+enLettres+" exercices. C'est le moteur du dossier."}
      : {label:"L'EBITDA",valeur:gEB.txt,unite:gEB.unite,plein:true,
         desc:"En "+fyF+(mgF!==null?(", soit "+rpPct(mgF)+" du chiffre d'affaires."):".")}),
    (vOk
      ? {label:"La valorisation",valeur:gEQ.txt,unite:gEQ.unite,couleur:RP.VERT,
         desc:"Fonds propres"+(FRCH?(", fourchette de "+rpGrand(FRCH.lo).txt+" à "
           +rpGrand(FRCH.hi).txt+" "+rpGrand(FRCH.hi).unite):"")+"."}
      : {label:"La rentabilité",valeur:(mgF!==null?rpPct(mgF):"—"),couleur:RP.VERT,
         desc:"De marge d'EBITDA en "+fyF+(bascEb?(" ; l'équilibre est atteint dès "+libFY(bascEb,true)+"."):".")})
  ];
  let cy=1.44;
  cartes1.forEach(c=>{rpKPI(sl,RX,cy,RW,1.62,c);cy+=1.78;});
  rpPiedVente(sl,mention,1);

  /* =======================================================================
     PAGE 2 — LE PLAN.  Composition « tableau bandé + anneau » : la trajectoire
     à gauche, d'où vient le revenu à droite. Rien à voir avec la page 1.
     ======================================================================= */
  sl=pptx.addSlide();
  rpOeil(sl,0.55,0.44,"Le plan d'affaires");
  sl.addText("Les projections sur "+enLettres+" ans",{x:0.55,y:0.70,w:8.0,h:0.46,
    fontSize:26,bold:true,color:RP.NAVY,fontFace:RP_TITRE});
  sl.addText("Trajectoire "+fy1+" – "+fyF+(mult!==null?("  ·  chiffre d'affaires multiplié par "+mult.toFixed(1).replace(".",",")):""),
    {x:0.55,y:1.22,w:7.60,h:0.32,fontSize:10,color:RP.G_TXT,fontFace:"Arial"});

  const croiss=(a,k)=>k?(ca(ap[k-1])?rpPct(ca(a)/ca(ap[k-1])-1):"-"):"-";
  const lignes2=[
    {lib:"Chiffre d'affaires",vals:ap.map(a=>rpFmt(ca(a))),fort:true},
    {lib:"Croissance",vals:ap.map(croiss)},
    {lib:"EBITDA",vals:ap.map(a=>rpFmt(eb(a))),fort:true},
    {lib:"Marge d'EBITDA",vals:ap.map(a=>ca(a)?rpPct(eb(a)/ca(a)):"-")},
    {lib:"Résultat net",vals:ap.map(a=>rpFmt(rn(a))),fort:true},
    {lib:"Trésorerie de clôture",vals:ap.map(a=>rpFmt(proj.bs.TRESO_NETTE[a]))}
  ];
  const yT=rpTableBandee(sl,0.55,1.76,7.60,2.30,fyp,lignes2);
  sl.addText("En "+U+". "+(bascEb?("L'EBITDA devient positif dès "+libFY(bascEb,true)+"."):"")
    +" Projections établies par la direction.",
    {x:0.55,y:yT+0.12,w:7.60,h:0.30,fontSize:8.3,italic:true,color:RP.G_TXT,fontFace:"Arial",valign:"top"});

  /* la moitié basse de la colonne resterait vide sous un tableau de cinq ou six
     lignes : on y pose l'argumentaire, qui a sa place dans un document de vente. */
  const forts=rpPointsForts(proj,ap,I).slice(0,3);
  if(forts.length){
    rpCarte(sl,0.55,yT+0.56,7.60,Math.max(0.9,6.68-(yT+0.56)),{titre:"Points forts"});
    let py=yT+1.09;
    forts.forEach(t0=>{
      const t=String(t0).replace(/\s*$/,"").replace(/([^.…!?])$/,"$1.");
      sl.addShape("rect",{x:0.87,y:py+0.09,w:0.075,h:0.075,fill:{color:RP.OCRE}});
      sl.addText(rpCoupe(t,190),{x:1.07,y:py-0.02,w:6.78,h:0.42,fontSize:9.2,color:"333333",
        fontFace:"Arial",valign:"top"});
      py+=0.42;
    });
  }

  /* d'où vient le revenu : détail par ligne de produits, sinon repli sur la trajectoire */
  const DX=8.55, DW=12.78-8.55;
  const detObj=proj.pl.CA_DETAIL||{};
  const det=Object.keys(detObj).map(k=>({lib:detObj[k].lib||k,v:+(detObj[k].vals||{})[aF]||0}))
    .filter(d=>d.v>0).sort((a,b)=>b.v-a.v);
  rpCarte(sl,DX,1.44,DW,3.16,{titre:det.length>=2?("D'où vient le revenu en "+fyF):("La trajectoire ("+U+")")});
  if(det.length>=2){
    /* quatre postes au maximum : au-delà, la légende sort de la carte et les
       parts deviennent des filets illisibles. Le reliquat passe sous « Autres ». */
    const top=det.slice(0,3);
    const reste=det.slice(3).reduce((s,d)=>s+d.v,0);
    if(reste>0) top.push({lib:"Autres",v:reste});
    /* teintes franchement distinctes : deux bleus voisins deviennent illisibles
       une fois réduits à une pastille de légende de 3 mm */
    const COUL=[RP.NAVY,RP.CIEL,RP.OCRE,RP.VERT,RP.G_CLAIR];
    rpAnneauCentre(sl,DX+0.20,1.92,DW-0.40,2.34,{
      labels:top.map(d=>rpCoupe(d.lib,18)),values:top.map(d=>d.v),
      colors:COUL.slice(0,top.length),centre:gCA.txt,sousCentre:gCA.unite});
  }else{
    rpColonnes(sl,DX+0.24,1.86,DW-0.48,2.50,"",fyp,[
      {name:"CA",values:ap.map(ca),color:RP.NAVY},
      {name:"EBITDA",values:ap.map(eb),color:RP.OCRE}]);
  }

  let fy=4.78;
  [ (mult!==null?{big:"× "+mult.toFixed(1).replace(".",","),lab:"le chiffre d'affaires sur le plan",
      sub:"de "+gCA1.txt+" à "+gCA.txt+" "+gCA.unite,coul:RP.NAVY}:null),
    (mgF!==null?{big:rpPct(mgF),lab:"de marge d'EBITDA en "+fyF,
      sub:(bascEb?("équilibre atteint dès "+libFY(bascEb,true)):"sur le dernier exercice du plan"),coul:RP.VERT}:null)
  ].filter(Boolean).forEach(f=>{
    sl.addText(f.big,{x:DX,y:fy,w:1.85,h:0.44,fontSize:23,bold:true,color:f.coul,fontFace:"Arial"});
    sl.addText(f.lab,{x:DX+1.95,y:fy+0.04,w:DW-1.95,h:0.26,fontSize:9,bold:true,color:RP.NAVY,fontFace:"Arial"});
    sl.addText(f.sub,{x:DX+1.95,y:fy+0.28,w:DW-1.95,h:0.26,fontSize:8.5,color:RP.G_TXT,fontFace:"Arial"});
    sl.addShape("rect",{x:DX,y:fy+0.62,w:DW,h:0.008,fill:{color:RP.FILET}});
    fy+=0.86;
  });
  rpPiedVente(sl,mention,2);

  /* =======================================================================
     PAGE 3 — LA VALORISATION (ou L'OPÉRATION si le dossier n'en porte pas).
     Composition « carte pleine + quadrant » : la valeur en grand à gauche,
     quatre repères de même rang à droite. L'avertissement tient en une ligne
     de pied de page — un teaser vend, il n'empile pas les réserves.
     ======================================================================= */
  sl=pptx.addSlide();
  rpOeil(sl,0.55,0.44,vOk?"La valorisation":"L'opération");
  sl.addText(vOk?"Ce que valent les fonds propres":"Modalités envisagées",
    {x:0.55,y:0.70,w:8.0,h:0.46,fontSize:26,bold:true,color:RP.NAVY,fontFace:RP_TITRE});

  const HX=0.55, HW=6.20;
  if(vOk){
    rpCarte(sl,HX,1.36,HW,1.66,{fond:RP.NAVY});
    sl.addText("VALEUR DES FONDS PROPRES",{x:HX+0.40,y:1.60,w:HW-0.80,h:0.24,
      fontSize:8.3,bold:true,color:RP.PALE2,charSpacing:1.6,fontFace:"Arial"});
    sl.addText([{text:gEQ.txt,options:{fontSize:34,bold:true,color:RP.BLANC,fontFace:"Arial"}},
                {text:" "+gEQ.unite,options:{fontSize:12,bold:true,color:RP.OCRE,fontFace:"Arial"}}],
      {x:HX+0.40,y:1.94,w:HW-0.80,h:0.58,valign:"middle"});
    sl.addText("Flux de trésorerie actualisés au coût du capital de "+rpPct(val.wacc)+".",
      {x:HX+0.40,y:2.56,w:HW-0.80,h:0.30,fontSize:9,color:RP.PALE2,fontFace:"Arial"});

    rpCarte(sl,HX,3.16,HW,2.42,{titre:"La construction de la valeur"});
    const pont=[
      {lib:"Flux actualisés du plan",v:val.sommePv},
      {lib:"Valeur terminale actualisée",v:val.vtPv},
      {lib:"Valeur d'entreprise",v:val.ev,fort:1},
      {lib:(val.dateValo==="ouverture"?"Dette nette à l'ouverture":"Dette nette au dernier exercice"),v:-val.detteNette},
      {lib:"Valeur des fonds propres",v:val.equityDcf,fort:2}
    ];
    let by=3.76;
    pont.forEach(L=>{
      if(L.fort) sl.addShape("rect",{x:HX+0.24,y:by-0.04,w:HW-0.48,h:0.32,fill:{color:RP.BANDE}});
      sl.addText(L.lib,{x:HX+0.34,y:by+0.03,w:HW-2.80,h:0.28,fontSize:9,bold:!!L.fort,
        color:L.fort?RP.NAVY:"333333",fontFace:"Arial"});
      sl.addText(rpFmt(L.v),{x:HX+HW-2.40,y:by,w:2.06,h:0.30,align:"right",
        fontSize:L.fort===2?11.5:9.5,bold:!!L.fort,
        color:L.fort===2?RP.OCRE:(L.fort?RP.NAVY:"333333"),fontFace:"Arial"});
      by+=0.36;
    });
  }else{
    rpCarte(sl,HX,1.36,HW,4.22,{titre:"Le périmètre"});
    sl.addText(rpCoupe(rpAnonTxt(I.contexteMission)
      ||"Cession de titres — périmètre, calendrier et modalités à préciser avec les conseils du vendeur.",520),
      {x:HX+0.30,y:1.90,w:HW-0.60,h:3.50,fontSize:10,color:"333333",fontFace:"Arial",valign:"top"});
  }

  const QX=HX+HW+0.42, QW=12.78-QX;
  rpQuadrant(sl,QX,1.36,QW,3.30,[
    (vOk?{label:"Le coût du capital",valeur:rpPct(val.wacc),
          desc:"Retenu pour l'actualisation des flux du plan."}
        :{label:"Le chiffre d'affaires",valeur:gCA.txt+" "+gCA.unite,taille:17,
          desc:"Sur le dernier exercice du plan, en "+fyF+"."}),
    (vOk&&FRCH
        ?{label:"La fourchette",valeur:rpGrand(FRCH.lo).txt+" – "+rpGrand(FRCH.hi).txt,couleur:RP.CIEL,taille:17,
          desc:"En "+rpGrand(FRCH.hi).unite+", selon les paramètres retenus."}
        :{label:"L'EBITDA",valeur:gEB.txt+" "+gEB.unite,couleur:RP.CIEL,taille:17,
          desc:(mgF!==null?("Soit "+rpPct(mgF)+" du chiffre d'affaires en "+fyF+"."):"Sur le dernier exercice du plan.")}),
    {label:"La croissance",valeur:(tcam!==null?rpPct(tcam):"—"),couleur:RP.OCRE,
     desc:"Par an sur les "+enLettres+" exercices du plan."},
    {label:"La rentabilité",valeur:(mgF!==null?rpPct(mgF):"—"),couleur:RP.VERT,
     desc:"De marge d'EBITDA en "+fyF+"."}
  ]);

  rpCarte(sl,QX,4.86,QW,0.72,{fond:RP.BANDE});
  sl.addText("CE QUI EST CÉDÉ",{x:QX+0.30,y:5.00,w:2.40,h:0.24,fontSize:8.3,bold:true,
    color:RP.OCRE,charSpacing:1.6,fontFace:"Arial"});
  sl.addText(rpCoupe(rpAnonTxt(T.perimetre||I.contexteMission)||"Le capital de la société, son actif d'exploitation et ses contrats en cours.",100),
    {x:QX+0.30,y:5.22,w:QW-0.60,h:0.28,fontSize:9,color:"333333",fontFace:"Arial"});

  rpCarte(sl,0.55,5.76,12.23,1.02,{filet:RP.OCRE});
  sl.addText("PROCHAINE ÉTAPE",{x:0.91,y:5.96,w:6.0,h:0.24,fontSize:8.3,bold:true,
    color:RP.OCRE,charSpacing:1.6,fontFace:"Arial"});
  sl.addText("Manifestation d'intérêt auprès de "+(B.cabinet||"Findalyx Advisory")
    +(cab.analyste?(" — "+cab.analyste):"")+(cab.email?("  ·  "+cab.email):"")
    +(cab.telephone?("  ·  "+cab.telephone):"")
    +". Le mémorandum d'information et les données détaillées sont communiqués après signature d'un accord de confidentialité.",
    {x:0.91,y:6.24,w:11.51,h:0.32,fontSize:9.5,color:"333333",fontFace:"Arial",valign:"top"});

  /* l'avertissement d'usage tient en une ligne : il protège le cédant sans peser sur la vente */
  rpPiedVente(sl,"Document indicatif et confidentiel ; ne constitue ni une offre ni un engagement. "
    +"Projections fournies par la direction, non auditées.",3);
}

/* =========================================================================
   MÉMORANDUM D'INFORMATION (IM / CIM) — le document de vente, remis APRÈS signature d'un
   accord de confidentialité. Ordre des sections conforme à la pratique de marché : résumé
   exécutif, société, offre, marché, performance financière, croissance, risques, opération.
   Il ne contient PAS la valorisation : on ne remet pas son propre DCF à l'acquéreur (celle-ci
   reste dans le rapport « Business plan + Valorisation », à usage interne et bancaire).
   Les pages narratives sont des cadres à compléter, préremplis depuis la fiche d'identité.
   ========================================================================= */
function construireIM(pptx){
  const {hyp,proj}=rpProj();
  const mm=rpModele();
  const B=rpBase();
  const {A,v,a1,fy}=B;
  const I=rpInfos();
  const ap=proj.annees, aF=ap[ap.length-1], a1p=ap[0];
  const fyp=ap.map(a=>libFY(a,true));
  const cab=(typeof chargerCabinet==="function")?chargerCabinet():{};
  const mention=B.societe+" - Mémorandum d'information - "+B.dateTxt+" - Confidentiel";
  RP_MENTION=mention;
  const CTX={B:B,mm:mm,proj:proj,ap:ap,aF:aF,fyp:fyp,mention:mention,sec:"Performance financière"};
  const caF=proj.pl.CA[aF], ca1=proj.pl.CA[a1p], ebF=proj.pl.EBITDA[aF];
  const mgF=caF?ebF/caF:null;
  const tcam=(ca1>0&&caF>0&&ap.length>1)?Math.pow(caF/ca1,1/(ap.length-1))-1:null;
  const hist=(!mm&&A.length)?A:[];
  let page=2;   /* page 2 : sommaire */
  let sl;
  rpGarde(pptx,B.societe,"Mémorandum d'information",
    "Opportunité de cession",B.dateTxt,B.cabinet,
    /* repères qualitatifs seulement : la couverture ne porte aucun chiffre du plan */
    [rpCoupe(I.secteur||DOSSIER.secteur,44),
     rpCoupe([String(I.adresse||"").split(",")[0].trim(),I.pays].filter(Boolean).join(", "),34),
     "Plan "+fyp[0]+" – "+fyp[fyp.length-1]]);
  if(RP_SOM_FIX) rpSommaire(pptx,B.societe,RP_SOM_FIX,mention);
  /* ---------- avertissement : une page entière, comme dans tout mémorandum ---------- */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Avertissement");
  rpTitre(sl,"Avertissement et conditions d'utilisation");
  { const blocs=[
      ["Objet du document","Le présent mémorandum d'information a été préparé par "+(B.cabinet||"Findalyx Advisory")
        +" à la demande des actionnaires de "+B.societe+" dans le cadre d'un projet de cession. Il est remis à un nombre restreint de destinataires, à seule fin d'apprécier leur intérêt pour l'opération envisagée."],
      ["Confidentialité","Sa remise est subordonnée à un engagement de confidentialité. Toute reproduction, diffusion ou communication à un tiers, totale ou partielle, est interdite sans autorisation écrite préalable des actionnaires et de leur conseil."],
      ["Nature des informations","Les informations, y compris les projections, proviennent de la direction de la société. Elles n'ont fait l'objet ni d'un audit ni d'une revue limitée au sens des normes d'exercice professionnel, et ne sont pas exhaustives. Les projections reposent sur des hypothèses susceptibles de ne pas se réaliser."],
      ["Absence d'engagement","Ce document ne constitue ni une offre, ni une sollicitation d'offre, ni un engagement de vendre. Chaque destinataire doit conduire ses propres vérifications et s'entourer de ses propres conseils. Ni la société, ni ses actionnaires, ni leur conseil n'assument de responsabilité au titre de l'usage qui en serait fait."]];
    let y=1.75;
    blocs.forEach(bl=>{
      sl.addText(bl[0],{x:0.55,y:y,w:12.23,h:0.28,fontSize:12,bold:true,color:RP.NAVY,fontFace:"Arial"});
      sl.addText(bl[1],{x:0.55,y:y+0.3,w:12.23,h:0.82,fontSize:10,color:"333333",fontFace:"Arial",valign:"top"});
      y+=1.24;
    });
    rpPied(sl,mention,++page);
  }
  /* ---------- 1. Résumé exécutif ---------- */
  rpSection(pptx,1,"Résumé exécutif",["L'opportunité en un coup d'œil","Chiffres clés et trajectoire"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Résumé exécutif");
  rpTitreMsg(sl,"L'opportunité en un coup d'œil",
    B.societe+" — "+rpCoupe(I.secteur||DOSSIER.secteur||"activité",40)
    +(I.adresse?(" à "+String(I.adresse).split(",")[0].trim()):"")
    +" — vise "+rpMsgFmt(caF)+" de chiffre d'affaires et "+rpMsgFmt(ebF)+" d'EBITDA en "+fyp[fyp.length-1]+".",
    [rpMsgFmt(caF),rpMsgFmt(ebF)]);
  rpCartes(sl,[
    ["Chiffre d'affaires "+fyp[fyp.length-1],rpFmt(caF)+" "+rpLib(),tcam!==null?(rpPct(tcam)+" par an"):"",null,"neutre","chart","224289"],
    ["EBITDA "+fyp[fyp.length-1],rpFmt(ebF)+" "+rpLib(),mgF!==null?(rpPct(mgF)+" du chiffre d'affaires"):"",null,"neutre","coins","FA6706"],
    ["Résultat net cumulé",rpFmt(ap.reduce((s,a)=>s+proj.pl.RN[a],0))+" "+rpLib(),"sur l'horizon du plan",null,"neutre","file","172554"],
    ["Trésorerie "+fyp[fyp.length-1],rpFmt(proj.bs.TRESO_NETTE[aF])+" "+rpLib(),
      proj.bs.DETTE[aF]?("dette "+rpFmt(proj.bs.DETTE[aF])+" "+rpLib()):"sans dette bancaire",null,"neutre","wallet","16904E"],
  ],1.72);
  { const forts=rpPointsForts(proj,ap,I).slice(0,5);
    const yF=rpTeaserBloc(sl,0.55,3.15,7.3,"Points forts de l'investissement");
    const bas=rpTeaserPuces(sl,0.55,yF,7.3,forts,0.52);
    /* même amorce rédigée que la page société, complétée du premier fragment de description */
    const PR=rpProse(B,I);
    const desc=rpCoupe(PR.lead+(PR.puces.length?(" "+PR.puces[0]):""),470);
    const yD=rpTeaserBloc(sl,8.1,3.15,4.68,"Présentation");
    sl.addText(desc,{x:8.1,y:yD,w:4.68,h:2.6,fontSize:9.5,color:"333333",fontFace:"Arial",valign:"top"});
    rpCommentReste(sl,0.55,Math.max(bas+0.12,5.95),12.23);
  }
  rpPied(sl,mention,++page);
  /* chiffres clés et trajectoire */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Résumé exécutif");
  { const cols=hist.concat(ap);
    const gv=(a,cle)=>{
      if(hist.indexOf(a)>=0) return v[{CA:"CA",EBITDA:"EBITDA",RN:"RESULTAT_NET",MARGE_BRUTE:"MARGE_BRUTE"}[cle]][a];
      return cle==="RN"?proj.pl.RN[a]:proj.pl[cle][a];
    };
    const yT=rpTitreMsg(sl,"Chiffres clés et trajectoire",
      "Le plan "+fyp[0]+" – "+fyp[fyp.length-1]+" repose sur "+rpPct(tcam)+" de croissance annuelle moyenne"
      +(mgF!==null?(" et porte la marge d'EBITDA à "+rpPct(mgF)):"")+".");
    const lig=[
      ["Chiffre d'affaires",...cols.map(a=>rpFmt(gv(a,"CA")))],
      ["Croissance",...cols.map((a,k)=>k?(gv(cols[k-1],"CA")?rpPct(gv(a,"CA")/gv(cols[k-1],"CA")-1):"-"):"-")],
      ["Marge brute",...cols.map(a=>rpFmt(gv(a,"MARGE_BRUTE")))],
      ["EBITDA",...cols.map(a=>rpFmt(gv(a,"EBITDA")))],
      ["Marge d'EBITDA",...cols.map(a=>gv(a,"CA")?rpPct(gv(a,"EBITDA")/gv(a,"CA")):"-")],
      ["Résultat net",...cols.map(a=>rpFmt(gv(a,"RN")))]];
    const finK=rpTable(sl,0.55,yT+0.2,7.35,B.societe.toUpperCase()+" - Chiffres clés",
      [rpLib()].concat(hist.map(a=>libFY(a)+" (réel)"),fyp.map(f=>f+"p")),lig,
      ["total","pct","detail","total","pct","detail"],
      hist.length?new Set(hist.map((a,k)=>1+k)):new Set(),
      [2.5,...cols.map(()=>0.8)],8.5,
      "p : prévisionnel"+(hist.length?" · colonnes bleutées : exercices réels":"")+".",0.3);
    rpColonnes(sl,7.9,yT+0.24,4.88,3.1,"("+rpLib()+")",fyp,
      [{name:"CA",values:ap.map(a=>proj.pl.CA[a]),color:"172554"},
       {name:"EBITDA",values:ap.map(a=>proj.pl.EBITDA[a]),color:"FA6706"}]);
    rpCommentReste(sl,0.55,Math.max(finK,yT+3.5)+0.18,12.23);
  }
  rpPied(sl,mention,++page);
  /* ---------- 2. Société, gouvernance et organisation ---------- */
  rpSection(pptx,2,"Société et organisation",
    ["Présentation et actionnariat","Gouvernance, installations et historique","Organisation et moyens"],mention,++page);
  /* présentation rédigée + fiche d'identité resserrée + schéma de capital */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Société et organisation");
  { const P=rpProse(B,I);
    const yP=rpTitreMsg(sl,"Présentation et actionnariat",P.lead);
    const yB=rpTeaserBloc(sl,0.55,yP+0.18,7.3,"Activité et organisation");
    rpTeaserPuces(sl,0.55,yB,7.3,P.puces.slice(0,3).map(t=>rpCoupe(t,155)),0.58);
    /* fiche d'identité : cinq repères, valeurs COURTES sur une ligne. Les effectifs et l'année de
       création sont déjà dans la phrase d'amorce ; le détail (arrêtés, bail, adresse complète)
       appartient aux cadres rédigés, pas à un tableau. */
    const fiche=[["Forme juridique",rpCoupe(I.formeJuridique,46)],
      ["Création",rpAnnee(I.creation)||rpCoupe(I.creation,46)],
      ["Secteur",rpCoupe(I.secteur||DOSSIER.secteur,46)],
      ["Implantation",rpCoupe(String(I.adresse||"").split(",")[0],46)],
      ["Dirigeant",rpCoupe(I.dirigeant,46)]].filter(([,x])=>x&&String(x).trim());
    if(fiche.length) rpTable(sl,8.1,yP+0.2,4.68,"Repères",["Rubrique","Information"],fiche,
      fiche.map(()=>"detail"),new Set(),[1.6,3.1],8.5,null,0.3,{alignG:[1]});
    const acts=rpActionnaires(I.actionnariat);
    if(acts.length){
      rpTeaserBloc(sl,0.55,4.14,12.23,"Répartition du capital");
      rpSchemaCapital(sl,0.55,4.32,12.23,2.1,B.societe,acts,
        "Source : déclarations des actionnaires ; répartition à confirmer par les statuts et le registre des titres.");
    } else rpCadreComment(sl,0.55,4.24,12.23,2.3);
  }
  rpPied(sl,mention,++page);
  rpPlaceholder(pptx,B.societe,"Société et organisation","Gouvernance, installations et historique",
    ["Structure juridique et gouvernance","Implantation et installations",
     "Historique et faits marquants","Autorisations, agréments et conformité"],mention,++page);
  /* organisation : le détail du personnel du modèle alimente la page quand il existe */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Société et organisation");
  { const pers=Object.keys(proj.pl.PERS_DETAIL||{}).map(k=>proj.pl.PERS_DETAIL[k])
      .filter(P=>Math.abs(P.vals[a1p]||0)>0.5)
      .sort((p,q)=>Math.abs(q.vals[a1p]||0)-Math.abs(p.vals[a1p]||0));
    const yO=rpTitreMsg(sl,"Organisation et moyens",
      rpCoupe(rpAnonTxt(I.effectif)||("Les charges de personnel représentent "
        +rpPct(proj.pl.CA[a1p]?Math.abs(proj.pl.CHARGES_PERSONNEL[a1p]/proj.pl.CA[a1p]):0)
        +" du chiffre d'affaires la première année du plan."),150));
    if(pers.length){
      const rows=pers.map(P=>[P.lib,rpFmt(-(P.vals[a1p]||0)),rpFmt(-(P.vals[aF]||0))]);
      rows.push(["Total charges de personnel",rpFmt(-(proj.pl.CHARGES_PERSONNEL[a1p]||0)),rpFmt(-(proj.pl.CHARGES_PERSONNEL[aF]||0))]);
      rpTable(sl,0.55,yO+0.2,6.6,B.societe.toUpperCase()+" - Postes et charges de personnel",
        [rpLib(),fyp[0],fyp[fyp.length-1]],rows,
        rows.map((r,i)=>i===rows.length-1?"total":"detail"),new Set(),[3.4,1.1,1.1],8.5,
        "Coût annuel par poste (effectif × salaire mensuel × 12), avant retraitements.",0.3);
      rpCadreComment(sl,7.35,yO+0.2,5.43,4.4);
    } else {
      rpCadreComment(sl,0.55,yO+0.3,12.23,4.4);
    }
  }
  rpPied(sl,mention,++page);
  /* ---------- 3. Offre et modèle économique ---------- */
  rpSection(pptx,3,"Offre et modèle économique",["Offre, volumes et tarification","Clientèle et différenciation"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Offre et modèle économique");
  { const lignes=(mm?(hyp.revenus||[]):[]);
    const nb0=x=>Math.round(x).toLocaleString("fr-FR").replace(/ | /g," ");
    const volAn=(L,i)=>{try{return volInducteurs((L.rows||[]).filter(r=>String(r.unit||"").indexOf("%")<0&&!r.refLigne),i,{revenus:hyp.revenus,fCA:1});}catch(e){return 0;}};
    const uniteL=L=>{const r=(L.rows||[]).find(r=>String(r.unit||"").indexOf("%")<0&&r.unit);return r?r.unit:"";};
    const det=proj.pl.CA_DETAIL||{};
    const cle=Object.keys(det);
    const yOf=rpTitreMsg(sl,"Offre, volumes et tarification",
      lignes.length?("L'offre compte "+lignes.length+" ligne"+(lignes.length>1?"s":"")+" ; les volumes passent de "
        +nb0(lignes.reduce((t,L)=>t+volAn(L,0),0))+" à "+nb0(lignes.reduce((t,L)=>t+volAn(L,(hyp.nb||5)-1),0))
        +" unités sur l'horizon du plan."):"");
    if(lignes.length){
      const rows=lignes.map((L,i)=>{
        const k=cle[i], vals=k?det[k].vals:null;
        return [L.name||("Ligne "+(i+1)),rpCoupe(uniteL(L)||"unités",12),
          nb0(volAn(L,0)),nb0(volAn(L,(hyp.nb||5)-1)),
          nb0((L.prix&&+L.prix.val)||0)+" F",
          vals?rpFmt(vals[aF]):"-"];
      });
      rows.push(["Total","","","","",rpFmt(caF)]);
      const finOf=rpTable(sl,0.55,yOf+0.2,12.23,B.societe.toUpperCase()+" - Offre, volumes et prix unitaires",
        ["Ligne d'offre","Unité","Volume "+fyp[0],"Volume "+fyp[fyp.length-1],"Prix unitaire","CA "+fyp[fyp.length-1]+" ("+rpLib()+")"],
        rows,rows.map((r,i)=>i===rows.length-1?"total":"detail"),new Set(),[4.3,1.2,1.4,1.4,1.5,1.6],9,
        "Volumes et prix issus des inducteurs du modèle ; le prix unitaire est celui de la première année (avant indexation).",0.3,
        {alignG:[1]});
      rpCommentReste(sl,0.55,finOf+0.2,12.23);
    } else {
      rpCadreComment(sl,0.55,yOf+0.3,12.23,4.4);
    }
  }
  rpPied(sl,mention,++page);
  rpPlaceholder(pptx,B.societe,"Offre et modèle économique","Clientèle, canaux et différenciation",
    ["Clientèle et segments servis","Canaux de commercialisation","Facteurs de différenciation",
     "Récurrence et fidélisation"],mention,++page);
  /* ---------- 4. Marché ---------- */
  rpSection(pptx,4,"Marché et positionnement",["Marché, dynamique et concurrence"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Marché et positionnement","Marché, dynamique et concurrence",
    ["Marché et positionnement","Taille du marché et croissance","Concurrence et acteurs clés",
     "Réglementation et barrières à l'entrée"],mention,++page);
  /* ---------- 5. Performance financière ---------- */
  rpSection(pptx,5,"Performance financière",
    ["Construction du chiffre d'affaires","Compte de résultat et rentabilité","Trésorerie et structure financière"],mention,++page);
  CTX.chip="Projections de la direction — non auditées";
  page=rpPageCA(pptx,CTX,page);
  /* compte de résultat de synthèse (le détail complet est dans le business plan) */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Performance financière");
  { const cols=hist.concat(ap);
    const hM={CA:"CA",ACHATS:"COUTS_DIRECTS",MARGE_BRUTE:"MARGE_BRUTE",AUTRES_PRODUITS:"AUTRES_PROD",
      OPEX_TOTAL:"FRAIS_GENERAUX",CHARGES_PERSONNEL:"CHARGES_PERSONNEL",EBITDA:"EBITDA",DA:"DA",EBIT:"EBIT",RN:"RESULTAT_NET"};
    const g=(c,a)=>(hist.indexOf(a)>=0)?(v[hM[c]]?v[hM[c]][a]:null):(proj.pl[c]?proj.pl[c][a]:null);
    const fg=a=>(hist.indexOf(a)>=0)?v.FRAIS_GENERAUX[a]:((proj.pl.OPEX_TOTAL[a]||0)+(proj.pl.CHARGES_PERSONNEL[a]||0));
    const lig=[
      ["Chiffre d'affaires",...cols.map(a=>rpFmt(g("CA",a)))],
      ["Coûts directs",...cols.map(a=>rpFmt(g("ACHATS",a)))],
      ["Marge brute",...cols.map(a=>rpFmt(g("MARGE_BRUTE",a)))],
      ["Taux de marge brute",...cols.map(a=>g("CA",a)?rpPct(g("MARGE_BRUTE",a)/g("CA",a)):"-")],
      ["Autres produits",...cols.map(a=>rpFmt(g("AUTRES_PRODUITS",a)))],
      ["Frais généraux et personnel",...cols.map(a=>rpFmt(fg(a)))],
      ["EBITDA",...cols.map(a=>rpFmt(g("EBITDA",a)))],
      ["Marge d'EBITDA",...cols.map(a=>g("CA",a)?rpPct(g("EBITDA",a)/g("CA",a)):"-")],
      ["Dotations aux amortissements",...cols.map(a=>rpFmt(g("DA",a)))],
      ["EBIT",...cols.map(a=>rpFmt(g("EBIT",a)))],
      ["Résultat net",...cols.map(a=>rpFmt(g("RN",a)))]];
    const yPl=rpTitreMsg(sl,"Compte de résultat et rentabilité",
      "La marge brute se maintient autour de "+rpPct(proj.pl.CA[aF]?proj.pl.MARGE_BRUTE[aF]/proj.pl.CA[aF]:0)
      +" et l'EBITDA atteint "+rpMsgFmt(ebF)+" en "+fyp[fyp.length-1]+".");
    const finPl=rpTable(sl,0.55,yPl+0.2,12.23,B.societe.toUpperCase()+" - Compte de résultat de synthèse",
      [rpLib()].concat(hist.map(a=>libFY(a)+" (réel)"),fyp.map(f=>f+"p")),lig,
      ["total","detail","sous_total","pct","detail","detail","total","pct","detail","sous_total","total"],
      hist.length?new Set(hist.map((a,k)=>1+k)):new Set(),
      [3.6,...cols.map(()=>1.0)],9,
      "Compte de résultat détaillé, ratios et hypothèses : voir le business plan. p : prévisionnel.",0.3);
    rpCommentReste(sl,0.55,finPl+0.18,12.23);
  }
  rpPied(sl,mention,++page);
  page=rpPageBridge(pptx,CTX,page);
  page=rpPageTreso(pptx,CTX,page);
  /* bilan et structure financière */
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Performance financière");
  { const yBs=rpTitreMsg(sl,"Trésorerie et structure financière",
      "Les capitaux propres atteignent "+rpMsgFmt(proj.bs.CP[aF])+" en "+fyp[fyp.length-1]
      +(proj.bs.DETTE[aF]?(" pour une dette financière de "+rpMsgFmt(proj.bs.DETTE[aF])+"."):" et la société est sans dette bancaire à terme."));
    const lig=[
      ["Immobilisations nettes",...ap.map(a=>rpFmt(proj.bs.IMMO_NET[a]))],
      ["Besoin en fonds de roulement",...ap.map(a=>rpFmt(proj.bs.BFR[a]))],
      ["Trésorerie nette",...ap.map(a=>rpFmt(proj.bs.TRESO_NETTE[a]))],
      ["Capitaux propres",...ap.map(a=>rpFmt(proj.bs.CP[a]))],
      ["Dettes financières",...ap.map(a=>rpFmt(proj.bs.DETTE[a]))],
      ["BFR en jours de chiffre d'affaires",...ap.map(a=>proj.pl.CA[a]?(Math.round(proj.bs.BFR[a]*360/proj.pl.CA[a])+" j"):"-")]];
    const finBs=rpTable(sl,0.55,yBs+0.2,7.35,B.societe.toUpperCase()+" - Grandes masses du bilan",
      [rpLib(),...fyp],lig,["detail","sous_total","total","total","detail","pct"],
      new Set(),[3.3,...ap.map(()=>0.86)],8.5,"Bilan prévisionnel bouclé par la trésorerie.",0.3);
    rpColonnes(sl,7.9,yBs+0.24,4.88,3.1,"("+rpLib()+")",fyp,
      [{name:"Capitaux propres",values:ap.map(a=>proj.bs.CP[a]),color:"172554"},
       {name:"Trésorerie nette",values:ap.map(a=>proj.bs.TRESO_NETTE[a]),color:"16904E"},
       {name:"Dette",values:ap.map(a=>proj.bs.DETTE[a]),color:"9E3A38"}]);
    rpCommentReste(sl,0.55,Math.max(finBs,yBs+3.5)+0.18,12.23);
  }
  rpPied(sl,mention,++page);
  /* ---------- 6. Plan de croissance ---------- */
  rpSection(pptx,6,"Plan de croissance",["Axes de développement et investissements"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Plan de croissance");
  { const cap=(mm?(hyp.capex||[]):[]).filter(c=>+c.montant>0);
    const capTot=cap.reduce((t,c)=>t+(+c.montant||0),0)/1000;
    const yG=rpTitreMsg(sl,"Axes de développement et investissements",
      cap.length?("Le plan prévoit "+rpMsgFmt(capTot)+" d'investissements sur l'horizon, dont "
        +rpCoupe(cap[0].name||"le poste principal",40)+" pour "+rpMsgFmt((+cap[0].montant||0)/1000)+".")
        :"Les axes de développement et le programme d'investissement sont à préciser avec la direction.");
    if(cap.length){
      const rows=cap.map(c=>[c.name||"Investissement",rpFmt((+c.montant||0)/1000),
        (c.annee||1)+"",(c.duree||5)+" ans"]);
      rows.push(["Total des investissements",rpFmt(capTot),"",""]);
      rpTable(sl,0.55,yG+0.2,6.6,B.societe.toUpperCase()+" - Programme d'investissement",
        ["Poste","Montant ("+rpLib()+")","Année","Amortissement"],rows,
        rows.map((r,i)=>i===rows.length-1?"total":"detail"),new Set(),[3.0,1.3,0.8,1.2],8.5,
        "Année 1 = première année du plan.",0.3);
      rpCadreComment(sl,7.35,yG+0.2,5.43,4.3);
    } else rpCadreComment(sl,0.55,yG+0.3,12.23,4.3);
  }
  rpPied(sl,mention,++page);
  /* ---------- 7. Risques ---------- */
  rpSection(pptx,7,"Risques et atténuation",["Risques majeurs et facteurs d'atténuation"],mention,++page);
  rpPlaceholder(pptx,B.societe,"Risques et atténuation","Risques majeurs et facteurs d'atténuation",
    ["Risques de marché et de concurrence","Risques opérationnels et humains",
     "Risques financiers et de liquidité","Risques juridiques, fiscaux et réglementaires"],mention,++page);
  /* ---------- 8. Structure de l'opération ---------- */
  rpSection(pptx,8,"Structure de l'opération",["Périmètre, calendrier et prochaines étapes"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Structure de l'opération");
  { const yS=rpTitreMsg(sl,"Périmètre, calendrier et prochaines étapes",
      "Les actionnaires de "+B.societe+" étudient la cession de leurs titres ; le périmètre et le calendrier restent à arrêter avec les candidats retenus.");
    const rows=[
      ["Nature de l'opération","Cession de titres (à confirmer : totalité ou majorité du capital)"],
      ["Vendeurs",rpCoupe(I.actionnariat||"Actionnaires actuels",140)],
      ["Motifs de la cession",rpCoupe(I.contexteMission||"À préciser avec les actionnaires",120)],
      ["Accompagnement","Transition assurée par l'équipe de direction, durée à convenir"],
      ["Calendrier indicatif","Marques d'intérêt, puis offres indicatives et phase d'exclusivité — calendrier à arrêter"],
      ["Conseil du vendeur",(B.cabinet||"Findalyx Advisory")+(cab.analyste?(" — "+cab.analyste):"")]];
    const finS=rpTable(sl,0.55,yS+0.2,6.6,B.societe.toUpperCase()+" - Cadre de l'opération",
      ["Élément","Description"],rows,rows.map(()=>"detail"),new Set(),[1.9,4.7],8.5,
      "Éléments indicatifs, sans engagement des actionnaires ni de leur conseil.",0.32,{alignG:[1]});
    /* PÉRIMÈTRE : deux colonnes « dans / hors », comme dans les notes d'opération — une ligne de
       tableau « activité et actifs d'exploitation » ne dit pas ce que l'acquéreur achète. Les
       éléments sont déduits du dossier et restent à valider. */
    const loc=/lou|bail|location/i.test([I.description,I.adresse].join(" "));
    const cca=(proj.bs.CCA&&proj.bs.CCA[a1p])?Math.abs(proj.bs.CCA[a1p]):0;
    const dtt=proj.bs.DETTE[a1p]||0;
    const dans=["Titres de la société et actifs d'exploitation",
      "Clientèle, contrats et carnet de commandes en cours",
      "Personnel en place et savoir-faire",
      (I.secteur&&/enseign|form|santé/i.test(I.secteur))?"Agréments et autorisations d'exercer":"Marque, licences et autorisations",
      "Équipements, aménagements et système d'information"];
    const hors=[loc?"Immobilier d'exploitation : locaux pris à bail — cession du bail à confirmer"
      :"Immobilier d'exploitation : régime de détention à confirmer",
      cca>0.5?("Comptes courants d'associés ("+rpMsgFmt(cca)+") : remboursement ou reclassement à convenir")
        :"Comptes courants d'associés : néant à la date du plan",
      dtt>0.5?("Dettes financières ("+rpMsgFmt(dtt)+") : reprise ou remboursement au closing")
        :"Dettes financières : néant à la date du plan",
      "Trésorerie excédentaire et dette nette : mécanisme d'ajustement de prix au closing",
      "Litiges et passifs éventuels : couverts par la garantie d'actif et de passif"];
    const xP=7.35, wP=5.43, wC=(wP-0.2)/2;
    rpTeaserBloc(sl,xP,yS+0.2,wP,"Périmètre envisagé");
    [["Dans le périmètre",dans,"16904E",xP],["Hors périmètre ou à confirmer",hors,"B45309",xP+wC+0.2]]
      .forEach(([t,items,coul,x0])=>{
        sl.addShape("rect",{x:x0,y:yS+0.48,w:wC,h:0.3,fill:{color:coul}});
        sl.addText(t,{x:x0+0.1,y:yS+0.48,w:wC-0.2,h:0.3,valign:"middle",fontSize:8.5,bold:true,
          color:RP.BLANC,fontFace:"Arial"});
        sl.addShape("rect",{x:x0,y:yS+0.78,w:wC,h:2.62,fill:{color:"FBFCFE"},line:{color:RP.FILET,width:1}});
        let yy=yS+0.86;
        items.slice(0,5).forEach(t2=>{
          sl.addShape("rect",{x:x0+0.12,y:yy+0.08,w:0.06,h:0.06,fill:{color:coul}});
          sl.addText(t2,{x:x0+0.26,y:yy,w:wC-0.38,h:0.5,fontSize:8,color:"333333",fontFace:"Arial",valign:"top"});
          yy+=0.5;
        });
      });
    sl.addText("Périmètre indicatif, à arrêter dans le protocole de cession.",
      {x:xP,y:yS+3.44,w:wP,h:0.24,fontSize:7.5,italic:true,color:RP.G_CLAIR,fontFace:"Arial"});
    /* les trois étapes prennent toute la largeur sous les deux blocs : dans une colonne de
       2 pouces, les intitulés passaient sur deux lignes et les cartes débordaient du pied */
    const yN=rpTeaserBloc(sl,0.55,5.52,12.23,"Prochaines étapes");
    rpCartesNum(sl,0.55,yN+0.02,12.23,1.24,[
      ["Marque d'intérêt","Écrite, auprès de "+(B.cabinet||"Findalyx Advisory")
        +(cab.email?(" — "+cab.email):"")+"."],
      ["Accès aux données","Questions-réponses et salle de données (data room)."],
      ["Offre indicative","Rencontre avec la direction, puis offre remise par écrit."]]);
  }
  rpPied(sl,mention,++page);
  /* ---------- annexes ---------- */
  rpSection(pptx,9,"Annexes",["Hypothèses clés du plan","Glossaire"],mention,++page);
  sl=pptx.addSlide();
  rpEnTete(sl,B.societe,"Annexes");
  { const b=(mm?(hyp.bfr||{}):hyp)||{};
    const pc=x=>(x*100).toFixed(1).replace(".0","").replace(".",",")+" %";
    const Pf=mm?proj.financement:null;
    const rows=[
      ["Horizon du plan",fyp[0]+" – "+fyp[fyp.length-1]+" ("+ap.length+" ans)"],
      ["Croissance annuelle moyenne du chiffre d'affaires",tcam!==null?rpPct(tcam):"n.s."],
      ["Marge d'EBITDA en fin de plan",mgF!==null?rpPct(mgF):"n.s."],
      ["Inflation des charges",pc(mm?(hyp.inflation||0.03):(hyp.inflation||0.03))],
      ["Délais clients / stocks / fournisseurs",Math.round(b.dso||hyp.dso||0)+" / "+Math.round(b.dio||hyp.dio||0)+" / "+Math.round(b.dpo||hyp.dpo||0)+" jours"],
      ["Taux d'impôt sur les sociétés",pc(hyp.is_taux||0.3)],
      (Pf?["Financement du montage",rpFmt(Pf.sources)+" "+rpLib()+" (capital "+rpFmt(Pf.capital)+", dette "+rpFmt(Pf.detteAvecIDC||Pf.dette)+")"]:null),
      ["Bouclage du bilan","Trésorerie (variable d'équilibre) ; aucun besoin non couvert sur l'horizon"]
    ].filter(Boolean);
    const finH=rpTable(sl,0.55,1.75,12.23,B.societe.toUpperCase()+" - Hypothèses clés",
      ["Hypothèse","Valeur"],rows,rows.map(()=>"detail"),new Set(),[5.4,6.8],9.5,
      "Hypothèses détaillées (inducteurs, coûts, financement, échéancier de dette) : business plan et classeur Excel.",0.32);
    rpCommentReste(sl,0.55,finH+0.2,12.23);
  }
  rpPied(sl,mention,++page);
  rpGlossaire(pptx,B,mention,++page);
  rpContacts(pptx,B.cabinet,mention,++page);
  return page;
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
    else if(type==="im")construireIM(p);
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
  const noms={dd:"Rapport_DD_",bp:"Rapport_BP_",valo:"Rapport_VALO_",bpvalo:"Rapport_BP_Valo_",
    teaser:"Teaser_",im:"Memorandum_information_"};
  await pptx.writeFile({fileName:noms[type]+String(type==="teaser"?rpNomTeaser():DOSSIER.societe).replace(/\W+/g,"_")+".pptx"});
  toast("Rapport téléchargé");
}
