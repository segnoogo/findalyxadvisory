#!/usr/bin/env node
/* =========================================================================
   Findalyx Advisory — génération headless du teaser, pour contrôler la
   composition sans passer par le navigateur.

   Le deck de vente est le seul livrable dont le défaut est purement visuel :
   un bloc qui déborde ou un texte qui chevauche ne casse aucun calcul et ne
   sera donc attrapé par aucun test de valeurs. On génère ici le fichier pour
   de vrai, on le convertit en images (PowerPoint COM ou LibreOffice) et on
   regarde.

   Usage : node tools/verif-teaser.js [--sortie=chemin.pptx] [--modele|--historique]
   ========================================================================= */
const fs=require("fs"), path=require("path");
const RACINE=path.join(__dirname,".."), SRC=path.join(RACINE,"src");
const charge=f=>fs.readFileSync(path.join(SRC,f),"utf8");
let PptxGenJS;
try{ PptxGenJS=require(path.join(RACINE,"node_modules","pptxgenjs")); }
catch(e){ console.error("pptxgenjs introuvable : npm install pptxgenjs --no-save"); process.exit(2); }

const ARGS=process.argv.slice(2);
const SORTIE=(ARGS.filter(a=>a.indexOf("--sortie=")===0)[0]||"").split("=")[1]
  ||path.join(RACINE,"Teaser_verif.pptx");
const HISTO=ARGS.indexOf("--historique")>=0;

/* ---------- chargement de l'application dans le réalm hôte ----------
   Même technique que tools/verif-conformite.js : new Function plutôt que vm,
   pour que les objets passés à PptxGenJS appartiennent au réalm hôte. */
function chargerApp(){
  const el=()=>({click(){},set href(v){},set download(v){},style:{},appendChild(){},
    setAttribute(){},getContext:()=>null,textContent:"",innerHTML:""});
  const doc={createElement:el,getElementById:el,querySelector:el,querySelectorAll:()=>[],
    addEventListener(){},head:{appendChild(){}},body:{appendChild(){}}};
  const PNG1="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"+
    "AAAADUlEQVR42mP8z8AAAwAB/AF+dbbLAAAAAElFTkSuQmCC";
  const corps=
    "var licDemarrer=function(){},licControler=function(){return true},LIC_ETAT=null,"+
    "licJoursRestants=function(){return null},licAjouterSociete=function(){return Promise.resolve({ok:true})},"+
    "licRetirerSociete=function(){},licSyncSocietes=function(){},licOpSociete=function(){return Promise.resolve({})};\n"+
    "var PNG1='"+PNG1+"';\n"+
    "var LOGO_FINDALYX=PNG1,LOGO_FINDALYX_BLANC=PNG1,LOGO_FINDALYX_CLAIR=PNG1;\n"+
    "var module=undefined;\n"+
    charge("moteur.js")+"\n"+charge("bp.js")+"\n"+charge("xlcalc.js")+"\n"+
    charge("databook.js")+"\n"+charge("ui.js")+"\n"+charge("bpui.js")+"\n"+
    charge("bpxl.js")+"\n"+charge("etatsxl.js")+"\n"+charge("rapports.js")+"\n"+
    "return {G:function(n){return eval(n);},set:function(n,v){eval(n+'=v');},"+
    "pose:function(d){DOSSIER=d;uni();try{recalculer();}catch(e){}}};";
  const run=new Function("PptxGenJS","localStorage","document","URL","Blob","navigator",
    "window","console","toast","alert","confirm","requestAnimationFrame","fetch",corps);
  return run(PptxGenJS,{getItem:()=>null,setItem(){},removeItem(){}},doc,
    {createObjectURL:()=>"blob:x",revokeObjectURL(){}},class{constructor(){}},
    {userAgent:"node"},{},console,function(){},function(){},function(){return true;},
    function(f){if(f)f();},function(){return Promise.reject(new Error("hors ligne"));});
}

/* ---------- dossier d'essai : un projet sans historique (cas ESPIM) ---------- */
const MODELE={
  nb:5, anneeDepart:2026, is_taux:0.30, imf_taux:0.005, inflation:0.03,
  revenus:[
    {name:"Niveau moyen — BEP",rows:[{op:"x",name:"Effectif",val:22,unit:"élèves",g:38}],
     prix:{val:230000,unit:"FCFA"},cout:{m:"pct",val:39}},
    {name:"Niveau moyen — BAC PRO",rows:[{op:"x",name:"Effectif",val:17,unit:"élèves",g:42}],
     prix:{val:280000,unit:"FCFA"},cout:{m:"pct",val:36}},
    {name:"Licence 1 à 3",rows:[{op:"x",name:"Effectif",val:37,unit:"étudiants",g:35}],
     prix:{val:565000,unit:"FCFA"},cout:{m:"pct",val:32}},
    {name:"Master 1 et 2",rows:[{op:"x",name:"Effectif",val:16,unit:"étudiants",g:47}],
     prix:{val:675000,unit:"FCFA"},cout:{m:"pct",val:30}}
  ],
  chargesFixes:[{name:"Loyer des locaux",montant:15000000,g:0},
                {name:"Charges de personnel",montant:10860000,g:3},
                {name:"Autres frais généraux",montant:7400000,g:3}],
  capex:[{montant:19630000,duree:6,annee:0},{montant:5000000,duree:5,annee:2}],
  financement:{capital:10000000,apports:19597500,emprunt:{montant:0,taux:0.08,duree:5}},
  bfr:{dso:45,dio:0,dpo:30}
};

const app=chargerApp();
const dossier={
  societe:"ESPIM (SAFE SAS)", sansHistorique:true, modele:MODELE,
  devise:"XOF", unite:"F", secteur:"Enseignement supérieur privé",
  infos:{secteur:"Enseignement supérieur et technique privé",adresse:"Niamey, Niger",pays:"Niger",
    activite:"Établissement d'enseignement supérieur privé, du BEP au Master 2 (dont E-MBA), "+
      "implanté à Niamey dans un immeuble R+2 pris à bail.",
    contexteMission:"Cession du capital de la société propriétaire de l'établissement."},
  teaser:{}
};
app.pose(dossier);

const pptx=new PptxGenJS();
pptx.defineLayout({name:"LARGE",width:13.333,height:7.5});
pptx.layout="LARGE";
app.G("construireTeaser")(pptx);

pptx.writeFile({fileName:SORTIE}).then(()=>{
  const t=fs.statSync(SORTIE);
  console.log("teaser généré : "+SORTIE+"  ("+Math.round(t.size/1024)+" Ko)");
}).catch(e=>{ console.error("échec :",e&&e.message||e); process.exit(1); });
