/* =========================================================================
   Findalyx Advisory — évaluateur du sous-ensemble de formules Excel employé par
   l'export « Modèle ». ExcelJS ne calcule rien : pour livrer un classeur EN
   VALEURS, chaque formule est évaluée ici puis remplacée par son résultat.

   Périmètre = ce que l'export produit réellement, et rien de plus : opérateurs
   + - * / ^ & et comparaisons, références et plages (inter-feuilles incluses),
   arithmétique matricielle (SUMPRODUCT sur des plages), et les fonctions IF,
   IFERROR, AND, OR, NOT, MAX, MIN, SUM, SUMPRODUCT, SUMIF, AVERAGE, INDEX,
   VLOOKUP, ROUND, ROUNDUP, ROUNDDOWN, ABS, SIGN, COLUMN, ROW. Toute formule hors périmètre LÈVE :
   un export qui échoue vaut mieux qu'un classeur silencieusement faux.
   ========================================================================= */

function xlcColNum(s){let n=0;s=String(s).toUpperCase();for(let i=0;i<s.length;i++)n=n*26+(s.charCodeAt(i)-64);return n;}
function xlcErr(e){return {xlerr:e};}
function xlcEstErr(v){return !!(v&&typeof v==="object"&&v.xlerr);}
function xlcMat(m){return {xlmat:m};}
function xlcEstMat(v){return !!(v&&typeof v==="object"&&v.xlmat);}
function xlcPlat(v){return xlcEstMat(v)?[].concat.apply([],v.xlmat):[v];}

/* ---------- analyse lexicale ---------- */
function xlcLex(src){
  const t=[];let i=0;const s=String(src).replace(/^=/,"");
  const estL=c=>/[A-Za-z_À-ɏ]/.test(c);
  while(i<s.length){
    const c=s[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='"'){let j=i+1,v="";
      for(;;){ if(j>=s.length) throw new Error("chaîne non fermée : "+src);
        if(s[j]==='"'){ if(s[j+1]==='"'){v+='"';j+=2;continue;} j++;break; } v+=s[j++]; }
      t.push({k:"str",v:v});i=j;continue;}
    if(c==="'"){/* nom de feuille protégé */
      let j=i+1,v="";
      for(;;){ if(j>=s.length) throw new Error("nom de feuille non fermé : "+src);
        if(s[j]==="'"){ if(s[j+1]==="'"){v+="'";j+=2;continue;} j++;break; } v+=s[j++]; }
      while(j<s.length&&/\s/.test(s[j]))j++;
      if(s[j]!=="!") throw new Error("nom de feuille sans « ! » : "+src);
      t.push({k:"feuille",v:v});i=j+1;continue;}
    if(/[0-9]/.test(c)||(c==="."&&/[0-9]/.test(s[i+1]||""))){
      const m=/^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/.exec(s.slice(i));
      t.push({k:"num",v:parseFloat(m[0])});i+=m[0].length;continue;}
    if(c==="$"||estL(c)){
      /* référence de cellule, nom de feuille nu, mot-clé ou fonction */
      const ref=/^\$?([A-Za-z]{1,3})\$?([0-9]+)(?![\wÀ-ɏ.])/.exec(s.slice(i));
      if(ref){const raw=ref[0];t.push({k:"ref",col:xlcColNum(ref[1]),row:parseInt(ref[2],10),raw:raw});i+=raw.length;continue;}
      const mot=/^[A-Za-z_À-ɏ][\wÀ-ɏ.]*/.exec(s.slice(i));
      if(!mot) throw new Error("jeton inattendu « "+c+" » : "+src);
      let j=i+mot[0].length;while(j<s.length&&/\s/.test(s[j]))j++;
      if(s[j]==="!"){t.push({k:"feuille",v:mot[0]});i=j+1;continue;}
      if(s[j]==="("){t.push({k:"fn",v:mot[0].toUpperCase()});i=j+1;continue;}
      const M=mot[0].toUpperCase();
      if(M==="TRUE"||M==="FALSE"){t.push({k:"bool",v:M==="TRUE"});i+=mot[0].length;continue;}
      throw new Error("nom non pris en charge « "+mot[0]+" » : "+src);
    }
    const op2=s.substr(i,2);
    if(op2==="<="||op2===">="||op2==="<>"){t.push({k:"op",v:op2});i+=2;continue;}
    if("+-*/^&=<>(),:%".indexOf(c)>=0){t.push({k:"op",v:c});i++;continue;}
    throw new Error("caractère inattendu « "+c+" » : "+src);
  }
  return t;
}

/* ---------- analyse syntaxique (précédence croissante) ---------- */
const XLC_NIV=[["=","<>","<",">","<=",">="],["&"],["+","-"],["*","/"],["^"]];
function xlcParse(src){
  const t=xlcLex(src);let i=0;
  const voir=()=>t[i];
  const estOp=v=>t[i]&&t[i].k==="op"&&t[i].v===v;
  const prendre=v=>{if(!estOp(v))throw new Error("« "+v+" » attendu : "+src);i++;};
  function refApres(feuille){
    const a=t[i];if(!a||a.k!=="ref")throw new Error("référence attendue : "+src);i++;
    if(estOp(":")){i++;let f2=feuille;
      if(t[i]&&t[i].k==="feuille"){f2=t[i].v;i++;}
      const b=t[i];if(!b||b.k!=="ref")throw new Error("fin de plage attendue : "+src);i++;
      return {k:"plage",feuille:feuille,r1:Math.min(a.row,b.row),c1:Math.min(a.col,b.col),
        r2:Math.max(a.row,b.row),c2:Math.max(a.col,b.col)};}
    return {k:"ref",feuille:feuille,row:a.row,col:a.col};
  }
  function primaire(){
    const a=voir();
    if(!a)throw new Error("formule incomplète : "+src);
    if(a.k==="num"||a.k==="str"||a.k==="bool"){i++;return {k:"lit",v:a.v};}
    if(a.k==="feuille"){i++;return refApres(a.v);}
    if(a.k==="ref")return refApres(null);
    if(a.k==="fn"){i++;const args=[];
      if(!estOp(")")){for(;;){args.push(expr(0));if(estOp(",")){i++;continue;}break;}}
      prendre(")");return {k:"fn",nom:a.v,args:args};}
    if(estOp("(")){i++;const e=expr(0);prendre(")");return e;}
    if(estOp("-")){i++;return {k:"neg",a:unaire()};}
    if(estOp("+")){i++;return unaire();}
    throw new Error("expression attendue : "+src);
  }
  function unaire(){
    if(estOp("-")){i++;return {k:"neg",a:unaire()};}
    if(estOp("+")){i++;return unaire();}
    let a=primaire();
    while(estOp("%")){i++;a={k:"pct",a:a};}
    return a;
  }
  function expr(niv){
    if(niv>=XLC_NIV.length)return unaire();
    let a=expr(niv+1);
    for(;;){
      const o=voir();
      if(!o||o.k!=="op"||XLC_NIV[niv].indexOf(o.v)<0)return a;
      i++;
      /* ^ est associatif à droite, les autres à gauche */
      const b=(o.v==="^")?expr(niv):expr(niv+1);
      a={k:"bin",op:o.v,a:a,b:b};
      if(o.v==="^")return a;
    }
  }
  const e=expr(0);
  if(i<t.length)throw new Error("fin de formule inattendue : "+src);
  return e;
}

/* ---------- évaluation ---------- */
function xlcNombre(v){
  if(v===null||v===undefined||v==="")return 0;
  if(typeof v==="number")return v;
  if(typeof v==="boolean")return v?1:0;
  if(v instanceof Date)return v.getTime();
  if(typeof v==="string"){const x=parseFloat(v.replace(",","."));if(isNaN(x))throw xlcErr("#VALUE!");return x;}
  throw xlcErr("#VALUE!");
}
function xlcTexte(v){return (v===null||v===undefined)?"":(typeof v==="string"?v:String(v));}
function xlcVrai(v){if(typeof v==="boolean")return v;if(typeof v==="number")return v!==0;
  if(v===null||v===undefined||v==="")return false;throw xlcErr("#VALUE!");}

function xlcMoteur(wb){
  const memo=new Map(), pile=new Set();
  const feuille=nom=>{const ws=wb.getWorksheet(nom);if(!ws)throw new Error("feuille introuvable : "+nom);return ws;};
  /* valeur brute d'une cellule : littéral, ou formule évaluée récursivement */
  function cellule(nomF,row,col){
    const cle=nomF+"!"+row+":"+col;
    if(memo.has(cle))return memo.get(cle);
    if(pile.has(cle))throw new Error("référence circulaire en "+cle);
    const c=feuille(nomF).getCell(row,col);
    let v=c.value;
    if(v&&typeof v==="object"){
      if(v.sharedFormula!==undefined)throw new Error("formule partagée non prise en charge ("+cle+")");
      if(v.formula!==undefined){
        pile.add(cle);
        try{ v=evaluer(xlcParse(v.formula),{f:nomF,row:row,col:col}); }
        catch(e){ if(xlcEstErr(e)) v=e; else { pile.delete(cle); throw e; } }
        pile.delete(cle);
      }
      else if(v.richText) v=v.richText.map(x=>x.text).join("");
      else if(v.error!==undefined) v=xlcErr(v.error);
      else if(v.text!==undefined) v=v.text;                 /* hyperlien */
      else if(v.result!==undefined) v=v.result;
    }
    if(xlcEstMat(v))v=xlcPlat(v)[0];
    memo.set(cle,v);
    return v;
  }
  function matPlage(n,ctx){
    const nomF=n.feuille||ctx.f, m=[];
    for(let r=n.r1;r<=n.r2;r++){const l=[];for(let c=n.c1;c<=n.c2;c++)l.push(cellule(nomF,r,c));m.push(l);}
    return xlcMat(m);
  }
  /* arithmétique élément par élément : SUMPRODUCT(plage/(1+w)^(COLUMN(plage)-2)) */
  function binaire(op,a,b){
    if(xlcEstErr(a))return a; if(xlcEstErr(b))return b;
    if(xlcEstMat(a)||xlcEstMat(b)){
      const ma=xlcEstMat(a)?a.xlmat:null, mb=xlcEstMat(b)?b.xlmat:null;
      const nr=Math.max(ma?ma.length:1,mb?mb.length:1);
      const nc=Math.max(ma?ma[0].length:1,mb?mb[0].length:1);
      const at=(m,r,c)=>m?m[m.length===1?0:r][m[0].length===1?0:c]:null;
      const out=[];
      for(let r=0;r<nr;r++){const l=[];
        for(let c=0;c<nc;c++)l.push(binaire(op,ma?at(ma,r,c):a,mb?at(mb,r,c):b));
        out.push(l);}
      return xlcMat(out);
    }
    if(op==="&")return xlcTexte(a)+xlcTexte(b);
    if(op==="="||op==="<>"){
      const eg=(typeof a==="string"||typeof b==="string")
        ? xlcTexte(a).toUpperCase()===xlcTexte(b).toUpperCase()
        : xlcNombre(a)===xlcNombre(b);
      return op==="="?eg:!eg;
    }
    if(op==="<"||op===">"||op==="<="||op===">="){
      const x=xlcNombre(a),y=xlcNombre(b);
      return op==="<"?x<y:op===">"?x>y:op==="<="?x<=y:x>=y;
    }
    const x=xlcNombre(a),y=xlcNombre(b);
    if(op==="+"||op==="-"){
      const z=(op==="+")?x+y:x-y, m=Math.max(Math.abs(x),Math.abs(y));
      /* Excel ramène à zéro une somme dont le résultat n'est plus que du bruit de virgule
         flottante : sans cela les lignes de contrôle « = 0 » afficheraient 3,5e-15 */
      return (z!==0&&m>0&&Math.abs(z)<m*1e-12)?0:z;
    }
    if(op==="*")return x*y;
    if(op==="/")return y===0?xlcErr("#DIV/0!"):x/y;
    if(op==="^"){const z=Math.pow(x,y);return isFinite(z)?z:xlcErr("#NUM!");}
    throw new Error("opérateur non pris en charge : "+op);
  }
  const nums=args=>{const o=[];args.forEach(a=>xlcPlat(a).forEach(v=>{
    if(xlcEstErr(v))throw v;
    if(typeof v==="number")o.push(v);
    else if(typeof v==="boolean")o.push(v?1:0);   /* littéral booléen : compté comme dans Excel */
  }));return o;};
  const arrondi=(v,n,f)=>{const p=Math.pow(10,n||0);const x=xlcNombre(v);return f(Math.abs(x)*p)/p*(x<0?-1:1);};

  function fonction(nom,args,ctx){
    /* fonctions à évaluation paresseuse ou à arguments non évalués */
    if(nom==="IF"){
      const c=evaluer(args[0],ctx); if(xlcEstErr(c))return c;
      return xlcVrai(c)?evaluer(args[1],ctx):(args.length>2?evaluer(args[2],ctx):false);
    }
    if(nom==="IFERROR"){
      let v; try{ v=evaluer(args[0],ctx); }catch(e){ if(!xlcEstErr(e))throw e; v=e; }
      return xlcEstErr(v)?evaluer(args[1],ctx):v;
    }
    if(nom==="COLUMN"||nom==="ROW"){
      if(!args.length)return nom==="COLUMN"?ctx.col:ctx.row;
      const n=args[0];
      if(n.k==="ref")return nom==="COLUMN"?n.col:n.row;
      if(n.k==="plage"){const m=[];
        if(nom==="COLUMN"){const l=[];for(let c=n.c1;c<=n.c2;c++)l.push(c);m.push(l);}
        else for(let r=n.r1;r<=n.r2;r++)m.push([r]);
        return xlcMat(m);}
      throw new Error(nom+"() attend une référence");
    }
    const a=args.map(x=>evaluer(x,ctx));
    for(let k=0;k<a.length;k++) if(xlcEstErr(a[k])&&nom!=="ISERROR") return a[k];
    switch(nom){
      case "SUM":return nums(a).reduce((s,x)=>s+x,0);
      case "MAX":{const n2=nums(a);return n2.length?Math.max.apply(null,n2):0;}
      case "MIN":{const n2=nums(a);return n2.length?Math.min.apply(null,n2):0;}
      case "ABS":return Math.abs(xlcNombre(a[0]));
      case "SIGN":{const x=xlcNombre(a[0]);return x>0?1:(x<0?-1:0);}
      case "ROUND":return arrondi(a[0],xlcNombre(a[1]),Math.round);
      case "ROUNDUP":return arrondi(a[0],xlcNombre(a[1]),Math.ceil);
      case "ROUNDDOWN":return arrondi(a[0],xlcNombre(a[1]),Math.floor);
      case "AND":return nums(a).every(x=>x!==0)&&nums(a).length>0;
      case "OR":return nums(a).some(x=>x!==0);
      case "NOT":return !xlcVrai(a[0]);
      case "AVERAGE":{const n2=nums(a);return n2.length?n2.reduce((s,x)=>s+x,0)/n2.length:xlcErr("#DIV/0!");}
      case "SUMIF":{
        /* SUMIF(plage ; critère ; [plage_somme]) — critère exact ou comparaison (>=, <>, …).
           Les jokers * et ? ne sont pas pris en charge : mieux vaut lever que sommer à faux. */
        const pl=xlcPlat(a[0]), sm=(a.length>2?xlcPlat(a[2]):pl);
        let cr=a[1], op="=";
        if(typeof cr==="string"){const m=/^(<=|>=|<>|<|>|=)?\s*(.*)$/.exec(cr.trim());
          op=m[1]||"="; cr=m[2];
          if(/[*?]/.test(cr))throw new Error("SUMIF() avec joker non pris en charge");
          const num=parseFloat(String(cr).replace(",",".")); if(!isNaN(num)&&String(cr).trim()!=="")cr=num;}
        const test=v=>{
          if(op==="="||op==="<>"){
            const eg=(typeof cr==="string"||typeof v==="string")
              ? xlcTexte(v).toUpperCase()===xlcTexte(cr).toUpperCase() : xlcNombre(v)===xlcNombre(cr);
            return op==="="?eg:!eg;}
          const x=xlcNombre(v),y=xlcNombre(cr);
          return op==="<"?x<y:op===">"?x>y:op==="<="?x<=y:x>=y;};
        let s=0;
        for(let k=0;k<pl.length;k++){const v=pl[k];
          if(xlcEstErr(v))throw v;
          if(test(v)){const w=sm[k]; if(xlcEstErr(w))throw w; if(typeof w==="number")s+=w;}}
        return s;}
      case "SUMPRODUCT":{
        const t=a.map(x=>xlcPlat(x).map(v=>{if(xlcEstErr(v))throw v;return typeof v==="number"?v:0;}));
        const n2=Math.max.apply(null,t.map(x=>x.length));
        let s=0;
        for(let k=0;k<n2;k++){let p=1;for(let j=0;j<t.length;j++)p*=(t[j].length===1?t[j][0]:(t[j][k]||0));s+=p;}
        return s;}
      case "INDEX":{
        const m=xlcEstMat(a[0])?a[0].xlmat:[[a[0]]];
        let r=a.length>1?Math.round(xlcNombre(a[1])):1, c=a.length>2?Math.round(xlcNombre(a[2])):null;
        if(c===null){ if(m.length===1){c=r;r=1;} else if(m[0].length===1){c=1;} else throw new Error("INDEX() sans n° de colonne sur une matrice"); }
        if(r<1||c<1||r>m.length||c>m[0].length)return xlcErr("#REF!");
        return m[r-1][c-1];}
      case "VLOOKUP":{
        const m=xlcEstMat(a[1])?a[1].xlmat:[[a[1]]];
        const ci=Math.round(xlcNombre(a[2]));
        if(a.length>3&&xlcVrai(a[3]))throw new Error("VLOOKUP() approché non pris en charge");
        const cle=a[0], txt=typeof cle==="string";
        for(let r=0;r<m.length;r++){
          const v=m[r][0];
          const eg=txt?xlcTexte(v).toUpperCase()===xlcTexte(cle).toUpperCase():xlcNombre(v)===xlcNombre(cle);
          if(eg)return (ci<1||ci>m[r].length)?xlcErr("#REF!"):m[r][ci-1];
        }
        return xlcErr("#N/A");}
    }
    throw new Error("fonction non prise en charge : "+nom+"()");
  }
  function evaluer(n,ctx){
    switch(n.k){
      case "lit":return n.v;
      case "ref":return cellule(n.feuille||ctx.f,n.row,n.col);
      case "plage":return matPlage(n,ctx);
      case "neg":{const v=evaluer(n.a,ctx);return xlcEstErr(v)?v:binaire("*",v,-1);}
      case "pct":{const v=evaluer(n.a,ctx);return xlcEstErr(v)?v:binaire("/",v,100);}
      case "bin":return binaire(n.op,evaluer(n.a,ctx),evaluer(n.b,ctx));
      case "fn":return fonction(n.nom,n.args,ctx);
    }
    throw new Error("nœud inconnu : "+n.k);
  }
  return {cellule:cellule};
}

/* Remplace toutes les formules du classeur par leur résultat. Renvoie le compte et les
   éventuels problèmes ; l'appelant décide d'abandonner l'export ou non. */
function xlValoriser(wb){
  const mot=xlcMoteur(wb), cibles=[], soucis=[];
  wb.eachSheet(ws=>{
    ws.eachRow({includeEmpty:false},row=>{
      row.eachCell({includeEmpty:false},c=>{
        const v=c.value;
        if(v&&typeof v==="object"&&(v.formula!==undefined||v.sharedFormula!==undefined))
          cibles.push({ws:ws,cell:c,row:c.row,col:c.col});
      });
    });
  });
  /* on calcule TOUT avant d'écrire : l'évaluation lit le classeur d'origine */
  const res=cibles.map(t=>{
    try{ return mot.cellule(t.ws.name,t.row,t.col); }
    catch(e){ soucis.push("["+t.ws.name+"] "+t.cell.address+" : "+((e&&e.message)||e)); return null; }
  });
  cibles.forEach((t,k)=>{
    const v=res[k];
    t.cell.value=xlcEstErr(v)?{error:v.xlerr}:(v===undefined?null:v);
  });
  /* les listes déroulantes (unité, scénario) ne pilotent plus rien sans formules : on les retire
     pour ne pas laisser croire à un classeur paramétrable */
  let listes=0;
  wb.eachSheet(ws=>{
    const dv=ws.dataValidations;
    if(!dv||!dv.model)return;
    /* la clé doit DISPARAÎTRE du modèle : la mettre à null ou undefined ferait écrire une
       validation « any » dans le XML (ExcelJS sérialise toutes les clés présentes) */
    Object.keys(dv.model).forEach(adr=>{if(dv.model[adr])listes++;delete dv.model[adr];});
  });
  return {formules:cibles.length,listes:listes,soucis:soucis};
}
