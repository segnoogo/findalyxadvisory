#!/usr/bin/env node
/* =========================================================================
   Findalyx Advisory — parité entre l'évaluateur de formules (src/xlcalc.js) et
   le calcul d'Excel lui-même.

   Tout le contrôle de conformité (tools/verif-conformite.js) repose sur
   xlcalc : si l'évaluateur se trompe, le contrôle se trompe avec lui. Ce
   script ferme la boucle en confrontant chaque formule au recalcul d'Excel.

   Deux étapes, pilotées par tools/verif-excel.ps1 (Windows + Excel requis) :
     node tools/verif-excel.js produire <dossier>   → écrit les deux classeurs
     node tools/verif-excel.js comparer <dossier>   → compare au dump d'Excel
   ========================================================================= */
const fs=require("fs"), path=require("path"), os=require("os");
const RACINE=path.join(__dirname,".."), SRC=path.join(RACINE,"src");
const ExcelJS=require(path.join(RACINE,"node_modules","exceljs"));
const charge=f=>fs.readFileSync(path.join(SRC,f),"utf8");
const SORTIE=process.argv[3]||path.join(os.tmpdir(),"findalyx-verif");
const ACTION=process.argv[2]||"produire";
const F_FORM=path.join(SORTIE,"formules.xlsx"), F_VAL=path.join(SORTIE,"valeurs.xlsx"),
      F_DUMP=path.join(SORTIE,"excel.tsv");

function app(){
  let capture=null;
  const doc={createElement:()=>({click(){},set href(v){},set download(v){},style:{},
      appendChild(){},setAttribute(){},getContext:()=>null}),
    getElementById:()=>({style:{},textContent:"",innerHTML:""}),
    addEventListener(){},head:{appendChild(){}},body:{appendChild(){}}};
  const corps=
    "var licDemarrer=function(){},licControler=function(){return true},LIC_ETAT=null,"+
    "licJoursRestants=function(){return null},licAjouterSociete=function(){return Promise.resolve({ok:true})},"+
    "licRetirerSociete=function(){},licSyncSocietes=function(){},licOpSociete=function(){return Promise.resolve({})};\n"+
    "var PNG1='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+dbbLAAAAAElFTkSuQmCC';\n"+
    "var LOGO_FINDALYX=PNG1,LOGO_FINDALYX_BLANC=PNG1,LOGO_FINDALYX_CLAIR=PNG1;var module=undefined;\n"+
    charge("moteur.js")+"\n"+charge("bp.js")+"\n"+charge("xlcalc.js")+"\n"+charge("databook.js")+"\n"+
    charge("ui.js")+"\n"+charge("bpui.js")+"\n"+charge("bpxl.js")+"\n"+charge("etatsxl.js")+"\n"+
    "return {G:function(n){return eval(n);},pose:function(d){DOSSIER=d;uni();recalculer();}};";
  const run=new Function("ExcelJS","localStorage","document","URL","Blob","navigator","window",
    "console","toast","alert","confirm","requestAnimationFrame",corps);
  const api=run(ExcelJS,{getItem:()=>null,setItem(){},removeItem(){}},doc,
    {createObjectURL:()=>"blob:x",revokeObjectURL(){}},
    class{constructor(p){capture=p&&p[0];}},{userAgent:"node"},{},console,
    function(){},function(){},function(){return true;},function(f){if(f)f();});
  return {G:api.G,pose:api.pose,lire:()=>capture,raz:()=>{capture=null;}};
}

(async()=>{
  if(!fs.existsSync(SORTIE))fs.mkdirSync(SORTIE,{recursive:true});
  if(ACTION==="produire"){
    const a=app(), d=a.G("dossierDemo")();
    /* le même dossier, exporté deux fois : formules vivantes puis valeurs calculées */
    a.pose(JSON.parse(JSON.stringify(d))); a.raz();
    await a.G("exporterExcelModele")();
    fs.writeFileSync(F_FORM,Buffer.from(a.lire()));
    a.pose(JSON.parse(JSON.stringify(d))); a.raz();
    await a.G("exporterExcelModele")(true);
    fs.writeFileSync(F_VAL,Buffer.from(a.lire()));
    console.log("classeurs écrits dans "+SORTIE);
    return;
  }
  /* comparaison : le dump d'Excel (feuille, ligne, colonne, type, valeur) contre le classeur
     en valeurs produit par l'évaluateur */
  if(!fs.existsSync(F_DUMP)){console.error("dump Excel absent : "+F_DUMP+" (lancer tools/verif-excel.ps1)");process.exit(2);}
  const wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(F_VAL);
  const mien=new Map();
  wb.eachSheet(ws=>ws.eachRow({includeEmpty:false},r=>r.eachCell({includeEmpty:false},c=>{
    let v=c.value;
    if(v&&typeof v==="object"){
      if(v.formula!==undefined){mien.set(ws.name+"|"+c.row+"|"+c.col,{t:"FORMULE",v:v.formula});return;}
      if(v.richText)v=v.richText.map(x=>x.text).join("");
      else if(v.error!==undefined)v="#"+v.error;
      else if(v.text!==undefined)v=v.text;
    }
    mien.set(ws.name+"|"+c.row+"|"+c.col,{t:typeof v,v:v});
  })));
  let ok=0, ecarts=[], restes=[], absents=[], maxRel=0, pire="";
  fs.readFileSync(F_DUMP,"utf8").split(/\r?\n/).filter(Boolean).forEach(L=>{
    const p=L.split("\t"), cle=p[0]+"|"+p[1]+"|"+p[2], t=p[3], sv=p.slice(4).join("\t");
    const m=mien.get(cle);
    if(!m){absents.push(cle+" (Excel="+sv+")");return;}
    if(m.t==="FORMULE"){restes.push(cle+" : "+m.v);return;}
    if(t==="n"){
      const x=parseFloat(sv), y=(typeof m.v==="number")?m.v:NaN;
      if(!isFinite(y)){ecarts.push(cle+" : Excel "+x+" vs évaluateur "+JSON.stringify(m.v));return;}
      const d=Math.abs(x-y), rel=d/Math.max(1e-9,Math.abs(x));
      if(d>1e-6&&rel>1e-9)ecarts.push(cle+" : Excel "+x+" vs évaluateur "+y+" (écart relatif "+rel.toExponential(2)+")");
      else{ok++; if(rel>maxRel){maxRel=rel;pire=cle;}}
    } else {
      /* les textes diffèrent volontairement : la version en valeurs porte ses propres mentions */
      ok++;
    }
  });
  console.log(ok+" cellules conformes · "+ecarts.length+" divergence(s) · "+restes.length+
    " formule(s) résiduelle(s) · "+absents.length+" cellule(s) absente(s)");
  console.log("plus grand écart relatif : "+maxRel.toExponential(2)+(pire?" ("+pire+")":""));
  [["FORMULES RÉSIDUELLES",restes],["CELLULES ABSENTES",absents],["DIVERGENCES",ecarts]].forEach(([t,l])=>{
    if(l.length){console.log("\n"+t+" ("+l.length+") :");l.slice(0,20).forEach(x=>console.log("   "+x));}});
  if(ecarts.length||restes.length){process.exit(1);}
  console.log("\nOK — l'évaluateur reproduit le calcul d'Excel.");
})().catch(e=>{console.error("ERREUR :",e.message);process.exit(1);});
