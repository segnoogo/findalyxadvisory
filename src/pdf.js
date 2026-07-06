/* ============ Export PDF : états, ratios, BP, valorisation ============ */
const PDF_NAVY=[23,37,84], PDF_GRIS=[107,114,128], PDF_FOND=[247,249,252], PDF_DELTA=[61,84,134];

function pdfEntete(doc,titre,page){
  doc.setFontSize(13);doc.setTextColor(...PDF_NAVY);doc.setFont("helvetica","bold");
  doc.text(DOSSIER.societe,14,14);
  doc.setFontSize(10);doc.setTextColor(...PDF_GRIS);doc.setFont("helvetica","normal");
  doc.text(titre,14,20);
  doc.setDrawColor(...PDF_NAVY);doc.setLineWidth(0.5);doc.line(14,23,283,23);
}
function pdfPied(doc,page){
  doc.setFontSize(8);doc.setTextColor(...PDF_GRIS);doc.setFont("helvetica","normal");
  doc.text(DOSSIER.societe+" — états financiers et analyse · Findalyx Advisory",14,202);
  doc.text("Page "+page,283,202,{align:"right"});
}
function pdfTable(doc,head,body,stylesLignes,debutY){
  doc.autoTable({
    head:[head],body,startY:debutY||27,margin:{left:14,right:14},rowPageBreak:"avoid",
    theme:"plain",
    styles:{font:"helvetica",fontSize:8,cellPadding:1.6,halign:"right",textColor:[40,40,40]},
    headStyles:{fillColor:PDF_NAVY,textColor:[255,255,255],fontStyle:"bold",halign:"right"},
    columnStyles:{0:{halign:"left",cellWidth:75}},
    didParseCell:d=>{
      if(d.section==="head"&&d.column.index===0)d.cell.styles.halign="left";
      if(d.section==="head"&&String(d.cell.raw).startsWith("Var."))d.cell.styles.fillColor=PDF_DELTA;
      if(d.section==="body"){
        const st=stylesLignes[d.row.index];
        if(st==="total"){d.cell.styles.fontStyle="bold";d.cell.styles.textColor=PDF_NAVY;d.cell.styles.fillColor=PDF_FOND;}
        if(st==="pct"){d.cell.styles.fontStyle="italic";d.cell.styles.textColor=PDF_GRIS;}
        if(st==="sec"){d.cell.styles.fontStyle="bolditalic";d.cell.styles.textColor=PDF_NAVY;d.cell.styles.fillColor=PDF_FOND;}
        if(st==="titre")d.cell.styles.fontStyle="bold";
      }
    }
  });
}
function construirePDF(doc){
  const A=ETATS.annees,v=ETATS.v,n=A.length,a1=A[n-1];
  const u=uni();
  const fys=A.map(a=>"FY"+String(a).slice(-2));
  const deltas=A.slice(1).map((a,i)=>"Var. "+String(A[i]).slice(-2)+"-"+String(a).slice(-2));
  const cagrCol=n>2?["CAGR"]:[];
  let page=1;

  /* ---- garde ---- */
  doc.setFillColor(...PDF_NAVY);doc.rect(0,95,297,115,"F");
  doc.setFillColor(250,103,6);doc.rect(16,108,32,1.2,"F");
  if(LOGO_FINDALYX_CLAIR)try{doc.addImage(LOGO_FINDALYX_CLAIR,"PNG",16,14,42,12.5);}catch(e){}
  if(DOSSIER.logo)try{doc.addImage(DOSSIER.logo,"PNG",250,14,32,32);}catch(e){}
  doc.setTextColor(...PDF_GRIS);doc.setFontSize(11);doc.setFont("helvetica","bold");
  doc.text(new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}).toUpperCase(),16,80);
  doc.setTextColor(255,255,255);doc.setFontSize(30);
  doc.text(DOSSIER.societe,16,126);
  doc.setFontSize(15);doc.setFont("helvetica","normal");doc.setTextColor(202,220,252);
  doc.text("États financiers et analyse — exercices "+fys.join(" · "),16,138);
  doc.setFontSize(10.5);doc.setTextColor(159,176,214);
  doc.text("Montants en "+u.lib+"  ·  préparé par Findalyx Advisory  ·  strictement confidentiel",16,147);
  const I=(DOSSIER.infos||{});
  const idBits=[I.secteur,I.formeJuridique,I.creation?"créée en "+I.creation:null,I.adresse].filter(Boolean);
  if(idBits.length){doc.setFontSize(10);doc.setTextColor(202,220,252);
    doc.text(idBits.join("  ·  "),16,156);}

  /* ---- helper : lignes des états ---- */
  const varRow=vals=>{
    const dv=A.slice(1).map((a,i)=>vals[i]?fpct(vals[i+1]/vals[i]-1):"-");
    const cg=n>2?[(vals[0]&&vals[n-1]&&(vals[0]>0)===(vals[n-1]>0))?fpct(Math.pow(Math.abs(vals[n-1])/Math.abs(vals[0]),1/(n-1))-1):"na"]:[];
    return [...dv,...cg];
  };
  const etatBody=defs=>{
    const body=[],st=[];
    defs.forEach(d=>{
      if(d.detail)return;   /* vue synthétique — comme l'app par défaut (pas de sur-longueur) */
      if(d.type==="pct"){
        body.push(["% "+d.lib+" / CA",...A.map(a=>v.CA[a]?Math.round(v[d.code][a]/v.CA[a]*100)+"%":"-"),...A.slice(1).map(()=>""),...(n>2?[""]:[])]);
        st.push("pct");return;
      }
      const vals=A.map(a=>v[d.code][a]);
      if(vals.every(x=>Math.abs(x)<0.5)&&!d.toujours)return;
      body.push([d.lib,...vals.map(fmt),...varRow(vals)]);
      st.push(d.st||"");
    });
    return [body,st];
  };
  const head=[u.lib,...fys,...deltas,...cagrCol];

  /* ---- P&L ---- */
  doc.addPage("a4","landscape");
  pdfEntete(doc,"Compte de résultat analytique — "+u.lib);
  let [b,s]=etatBody(DEF_PL);pdfTable(doc,head,b,s);
  {/* ratios du compte de résultat, sous le P&L */
    const rdef=[["Marge brute / CA","MARGE_BRUTE","CA",1],["Marge d'EBITDA","EBITDA","CA",1],
      ["Marge d'exploitation (EBIT)","EBIT","CA",1],["Marge nette","RESULTAT_NET","CA",1],
      ["Frais généraux (overhead) / CA","FRAIS_GENERAUX","CA",-1],["Charges de personnel / CA","CHARGES_PERSONNEL","CA",-1],
      ["Taux d'impôt effectif","IS","RESULTAT_AVANT_IMPOT",-1]];
    const bR=[["Ratios du compte de résultat",...fys.map(()=>""),...deltas.map(()=>""),...cagrCol.map(()=>"")]],sR=["sec"];
    rdef.forEach(([lib,num,den,sg])=>{
      const m=A.map(a=>v[den][a]?sg*v[num][a]/v[den][a]*100:null);
      const cells=m.map(x=>x==null?"-":(Math.round(x*10)/10).toString().replace(".",",")+" %");
      const dl=A.slice(1).map((a,i)=>{const d=(m[i]!=null&&m[i+1]!=null)?Math.round((m[i+1]-m[i])*100):null;return d==null?"-":(d>0?"+":"")+d+" pb";});
      bR.push([lib,...cells,...dl,...cagrCol.map(()=>"")]);sR.push("pct");
    });
    pdfTable(doc,head,bR,sR,doc.lastAutoTable.finalY+6);
  }
  pdfPied(doc,++page);
  /* ---- Bilan ---- */
  doc.addPage("a4","landscape");
  pdfEntete(doc,"Bilan — présentation actif net — "+u.lib);
  [b,s]=etatBody(DEF_BS);pdfTable(doc,head,b,s);pdfPied(doc,++page);
  /* ---- TFT ---- */
  if(n>1){
    doc.addPage("a4","landscape");
    pdfEntete(doc,"Tableau des flux de trésorerie — modèle officiel SYSCOHADA — "+u.lib);
    const cols=A.slice(1);
    const bT=[],sT=[];
    TFT_DEF.forEach(([code,lib,stl])=>{
      if(!code){bT.push([lib,...cols.map(()=>"")]);sT.push("sec");return;}
      bT.push([lib,...cols.map(a=>fmt(ETATS.tft[a][code]))]);sT.push(stl||"");
    });
    pdfTable(doc,[u.lib,...cols.map(a=>"FY"+String(a).slice(-2))],bT,sT);pdfPied(doc,++page);
  }
  /* ---- Ratios ---- */
  doc.addPage("a4","landscape");
  pdfEntete(doc,"Ratios financiers");
  const R=calculerRatios(ETATS);
  const cats={rentabilite:"Rentabilité",liquidite:"Liquidité & BFR",endettement:"Structure & endettement"};
  const bR=[],sR=[];
  Object.entries(cats).forEach(([cat,titre])=>{
    bR.push([titre,...A.map(()=>"")]);sR.push("sec");
    R.ratios.filter(r=>r.cat===cat).forEach(r=>{
      bR.push([r.lab,...A.map(a=>{
        const x=r.vals[a];
        if(x===null||x===undefined)return "-";
        return (r.unit==="x"?x.toFixed(2)+"x":r.unit==="j"?Math.round(x)+" j":Math.round(x)+"%");
      })]);sR.push("");
    });
  });
  pdfTable(doc,["Ratio",...fys],bR,sR);pdfPied(doc,++page);
  /* ---- Business plan (si hypothèses en place) ---- */
  if(typeof projeterBP==="function"){
    const H=assurerBP(),P=projeterBP(ETATS,H),V=valoriserBP(ETATS,H,P);
    const AP=P.annees;
    doc.addPage("a4","landscape");
    pdfEntete(doc,"Business plan — scénario "+P.scenario+" — "+u.lib);
    const hd2=[u.lib,"FY"+String(a1).slice(-2),...AP.map(a=>"FY"+String(a).slice(-2)+"p")];
    const lB=[["Chiffre d'affaires",v.CA[a1],a=>P.pl.CA[a],"titre"],
      ["Marge brute",v.MARGE_BRUTE[a1],a=>P.pl.MARGE_BRUTE[a],"total"],
      ["EBITDA",v.EBITDA[a1],a=>P.pl.EBITDA[a],"total"],
      ["Résultat net",v.RESULTAT_NET[a1],a=>P.pl.RN[a],"total"],
      ["Free cash flow",null,a=>P.tft[a].FCF,""],
      ["Trésorerie nette",v.TRESORERIE_NETTE[a1],a=>P.bs.TRESO[a],"total"],
      ["Dette financière",-v.DETTES_FINANCIERES[a1],a=>P.bs.DETTE[a],""]];
    pdfTable(doc,hd2,lB.map(([lib,h,f])=>[lib,h===null?"-":fmt(h),...AP.map(a=>fmt(f(a)))]),lB.map(x=>x[3]));
    doc.setFontSize(8.5);doc.setTextColor(...PDF_GRIS);
    doc.text("Hypothèses clés : croissance CA "+H.caCroiss.map(x=>Math.round(x*100)+"%").join(" / ")
      +" · coûts directs "+Math.round(H.coutsDirects_pct*100)+"% CA · DSO "+Math.round(H.dso)
      +" j · WACC "+(V.wacc*100).toFixed(1)+"% · g "+(V.g*100).toFixed(1)+"%",14,doc.lastAutoTable.finalY+8);
    pdfPied(doc,++page);
    /* ---- Valorisation ---- */
    doc.addPage("a4","landscape");
    pdfEntete(doc,"Valorisation — synthèse des méthodes — "+u.lib);
    const bV=V.methodes.map(m=>[m.lib,fmt(m.min),fmt(m.central),fmt(m.max)]);
    bV.push(["Fourchette retenue",fmt(V.fourchette.min),fmt(V.fourchette.retenue),fmt(V.fourchette.max)]);
    pdfTable(doc,["Méthode","Bas","Central","Haut"],bV,[...V.methodes.map(()=>""),"total"]);
    doc.setFontSize(8.5);doc.setTextColor(...PDF_GRIS);
    doc.text("DCF : WACC "+(V.wacc*100).toFixed(2)+"% (ke "+(V.ke*100).toFixed(2)+"%, kd "+(V.kd*100).toFixed(2)
      +"%) · g "+(V.g*100).toFixed(1)+"% · dette nette "+fmt(V.detteNette)+" "+u.suf
      +" · EBITDA de référence "+fmt(V.ebitdaRef)+" "+u.suf,14,doc.lastAutoTable.finalY+8);
    pdfPied(doc,++page);
  }
  /* ---- Commentaires ---- */
  const C=genererCommentaires(ETATS);
  const noms={pl:"Compte de résultat",bs:"Bilan",tft:"Flux de trésorerie"};
  doc.addPage("a4","landscape");
  pdfEntete(doc,"Commentaires de l'analyste (projet à enrichir)");
  const bC=[],sC=[];
  for(const k of ["pl","bs","tft"]){
    if(!(C[k]||[]).length)continue;
    bC.push([noms[k],""]);sC.push("sec");
    C[k].forEach(c=>{bC.push([c.t,c.x]);sC.push("");});
    const note=(DOSSIER.notes||{})[k];
    if(note){bC.push(["Notes de l'analyste",note]);sC.push("pct");}
  }
  doc.autoTable({head:[["Thème","Commentaire"]],body:bC,startY:27,margin:{left:14,right:14},
    theme:"plain",styles:{font:"helvetica",fontSize:8.5,cellPadding:1.8,halign:"left",textColor:[40,40,40]},
    headStyles:{fillColor:PDF_NAVY,textColor:[255,255,255],fontStyle:"bold"},
    columnStyles:{0:{cellWidth:55,fontStyle:"bold"}},
    didParseCell:d=>{if(d.section==="body"&&sC[d.row.index]==="sec"){
      d.cell.styles.fillColor=PDF_FOND;d.cell.styles.textColor=PDF_NAVY;d.cell.styles.fontStyle="bold";}}});
  pdfPied(doc,++page);
}
function exporterPDF(){
  if(!ETATS){toast("Importez d'abord des balances");return;}
  if(typeof window==="undefined"||!window.jspdf){toast("Bibliothèque PDF non chargée");return;}
  toast("Génération du PDF…");
  const doc=new window.jspdf.jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  construirePDF(doc);
  doc.save("Etats_analyse_"+DOSSIER.societe.replace(/\W+/g,"_")+".pdf");
  toast("PDF téléchargé");
}
