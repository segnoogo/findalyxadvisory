/* ============================================================
   Licences Findalyx Advisory — même modèle que l'outil liasses :
   1) clé propriétaire ECDSA (hors-ligne, illimitée)
   2) code client vérifié en ligne (Supabase verifier-licence,
      anti-partage par appareil, quotas)
   3) cache de secours hors-ligne (7 jours) + anti-retour d'horloge
   ============================================================ */
var LIC_FN="https://dddrgmxkywjxxycfoiya.supabase.co/functions/v1/verifier-licence";
var LIC_KEY="sb_publishable_kCTukGId2HRQn7lqwZE-ug_DlCzCMiS";
var LIC_PUB="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE1xdYQdZixgK33N39Mlj8nsl/CH+1mivKFfHbFJv6L6k/4wYPsI6PSbJw+MjmYKivTF2xnqnS3jvTaB2JdtFggg==";
var LIC_GRACE=7;
var URL_SYSCO="https://sysco.findalyx.com";      /* app liasse fiscale */                       /* jours de secours hors-ligne */
var LIC_ETAT=null;                     /* {customer,exp,mode,maxSoc} une fois validé */

function _lb64(s){s=String(s).replace(/-/g,"+").replace(/_/g,"/");
  const b=atob(s),u=new Uint8Array(b.length);
  for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  return u.buffer;}
function _lToday(){const d=new Date(),p=x=>String(x).padStart(2,"0");
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());}
function _lDevice(){try{
  let d=localStorage.getItem("fx_device");
  if(!d){d="dev-"+Math.random().toString(36).slice(2)+"-"+Date.now().toString(36);
    localStorage.setItem("fx_device",d);}
  return d;}catch(e){return "dev-x";}}
function _lRollback(){try{
  const ls=localStorage.getItem("fx_lastseen"),t=_lToday();
  if(ls&&t<ls)return true;
  localStorage.setItem("fx_lastseen",(ls&&ls>t)?ls:t);}catch(e){}
  return false;}
function _lCacheGet(){try{return JSON.parse(localStorage.getItem("fxc_lic_cache")||"null");}catch(e){return null;}}
function _lCacheSet(code,d){try{localStorage.setItem("fxc_lic_cache",
  JSON.stringify({code,customer:d.client||"",exp:d.expire_le||"",
    maxSoc:d.max_societes||0,produit:d.produit||"conseil",vu:_lToday()}));}catch(e){}}

/* clé propriétaire : payload.signature ECDSA P-256 vérifiée hors-ligne */
async function licVerifProprietaire(lic){
  try{
    if(!lic||lic.indexOf(".")<0)return {ok:false};
    if(!window.crypto||!window.crypto.subtle)return {ok:false,nocrypto:true};
    const parts=lic.split(".");
    const payload=_lb64(parts[0]),sig=_lb64(parts[1]);
    const pub=await crypto.subtle.importKey("spki",_lb64(LIC_PUB),
      {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const valide=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,sig,payload);
    if(!valide)return {ok:false};
    const data=JSON.parse(new TextDecoder().decode(payload));
    return {ok:true,expired:_lToday()>String(data.exp),customer:data.c,exp:data.exp};
  }catch(e){return {ok:false};}
}
/* code client : vérification serveur (appareil + produit) */
async function licVerifEnLigne(code){
  try{
    const ctrl=("AbortController" in window)?new AbortController():null;
    const to=ctrl?setTimeout(()=>{try{ctrl.abort();}catch(e){}},12000):null;
    const r=await fetch(LIC_FN,{method:"POST",
      headers:{"Content-Type":"application/json","apikey":LIC_KEY,"Authorization":"Bearer "+LIC_KEY},
      body:JSON.stringify({cle:code,appareil:_lDevice(),produit:"conseil"}),
      signal:ctrl?ctrl.signal:undefined});
    if(to)clearTimeout(to);
    let d=null;try{d=await r.json();}catch(e){}
    return d?{net:true,data:d}:{net:false};
  }catch(e){return {net:false};}
}
/* orchestrateur */
async function licControler(code){
  code=String(code||"").replace(/\s+/g,"");
  if(!code)return {ok:false,kind:"activation"};
  if(code.indexOf(".")>=0){
    const ro=await licVerifProprietaire(code);
    if(ro.nocrypto)return {ok:false,kind:"nocrypto"};
    if(ro.ok&&!ro.expired){
      if(_lRollback())return {ok:false,kind:"offline"};
      return {ok:true,customer:ro.customer,exp:ro.exp,mode:"proprietaire"};
    }
    if(ro.ok&&ro.expired)return {ok:false,kind:"expired",exp:ro.exp,customer:ro.customer};
    return {ok:false,kind:"invalid"};
  }
  const on=await licVerifEnLigne(code);
  if(on.net){
    const d=on.data||{};
    if(d.ok===true){
      if(_lRollback())return {ok:false,kind:"offline"};
      _lCacheSet(code,d);
      return {ok:true,customer:d.client||"",exp:d.expire_le||"",
        maxSoc:d.max_societes||0,usedSoc:d.societes_utilisees||0,
        produit:d.produit||"conseil",mode:"online"};
    }
    const k=d.raison||"";
    if(k==="expire")return {ok:false,kind:"expired",exp:d.expire_le};
    if(k==="resilie")return {ok:false,kind:"revoked"};
    if(k==="trop_appareils")return {ok:false,kind:"toomany"};
    if(k==="produit")return {ok:false,kind:"produit"};
    return {ok:false,kind:"invalid"};
  }
  /* hors-ligne : cache de secours */
  const c=_lCacheGet();
  if(c&&c.code===code){
    const vu=Math.floor((new Date(_lToday())-new Date(c.vu))/86400000);
    if(!_lRollback()&&vu<=LIC_GRACE&&(!c.exp||_lToday()<=String(c.exp)))
      return {ok:true,customer:c.customer,exp:c.exp,maxSoc:c.maxSoc,produit:c.produit||"conseil",mode:"secours"};
  }
  return {ok:false,kind:"offline"};
}
/* écran d'activation */
function licEcran(r){
  r=r||{kind:"activation"};
  const T={activation:"Bienvenue",invalid:"Code invalide",expired:"Abonnement expiré",
    revoked:"Licence suspendue",toomany:"Trop d'appareils",offline:"Connexion requise",
    nocrypto:"Navigateur non compatible",produit:"Autre produit"};
  const M={
    activation:"Activez Findalyx Advisory avec votre code de licence.",
    invalid:"Ce code n'est pas valide. Vérifiez la saisie ou contactez Findalyx.",
    expired:"Cet abonnement a expiré"+(r.exp?" le "+r.exp:"")+". Saisissez un nouveau code pour le renouveler.",
    revoked:"Cette licence a été suspendue. Contactez Findalyx pour la réactiver.",
    toomany:"Cette licence est déjà utilisée sur le nombre maximum d'appareils autorisés.",
    offline:"Findalyx doit vérifier votre licence en ligne. Connectez-vous à internet puis réessayez.",
    nocrypto:"La clé propriétaire nécessite un navigateur récent (Chrome ou Edge).",
    produit:"Ce code correspond à un autre produit Findalyx (liasse fiscale). Contactez Findalyx pour une licence Conseil ou un bundle."};
  document.getElementById("app").innerHTML=`
  <div class="lgn" style="background-image:linear-gradient(135deg,rgba(237,241,248,.82),rgba(226,233,244,.9)),url('${LOGO_LOGIN_BG}');background-size:cover;background-position:center">
    <div class="lgn-carte">
      <div class="lgn-promo">
        <svg class="lgn-bg" viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#fff" aria-hidden="true">
          <circle cx="332" cy="76" r="46" stroke-width="15" opacity=".5" stroke-dasharray="150 130"/>
          <circle cx="332" cy="76" r="46" stroke-width="15" stroke="#FA6706" opacity=".85" stroke-dasharray="66 224"/>
          <rect x="26" y="150" width="150" height="86" rx="10" stroke-width="2" opacity=".45"/>
          <rect x="42" y="170" width="50" height="10" rx="3" fill="#fff" stroke="none" opacity=".55"/>
          <polyline points="42,214 64,206 86,212 108,195 130,203 152,186" stroke-width="2.5" opacity=".7"/>
          <path d="M22,360 70,330 118,344 166,300 214,318 262,286 310,304 358,268 378,278" stroke-width="2.5" opacity=".7"/>
          <path d="M22,360 70,330 118,344 166,300 214,318 262,286 310,304 358,268 378,278 378,430 22,430Z" fill="#fff" stroke="none" opacity=".07"/>
          <g stroke-width="9" opacity=".45">
            <line x1="48" y1="566" x2="48" y2="516"/><line x1="62" y1="566" x2="62" y2="488"/>
            <line x1="122" y1="566" x2="122" y2="500"/><line x1="136" y1="566" x2="136" y2="470"/>
            <line x1="196" y1="566" x2="196" y2="524"/><line x1="210" y1="566" x2="210" y2="446"/>
            <line x1="270" y1="566" x2="270" y2="482"/><line x1="284" y1="566" x2="284" y2="430"/>
            <line x1="344" y1="566" x2="344" y2="504"/><line x1="358" y1="566" x2="358" y2="420"/>
          </g>
          <line x1="22" y1="566" x2="378" y2="566" stroke-width="1.5" opacity=".3"/>
        </svg>
        <img src="${LOGO_FINDALYX_CLAIR}" class="lgn-logo" alt="Findalyx Advisory">
        <h3>L'analyse financière au standard cabinet.</h3>
        <p class="lgn-sub">Due diligence, business plans et évaluations d'entreprises — pensés pour l'espace OHADA / SYSCOHADA.</p>
        <ul class="lgn-feats">
          <li>Import de balances&nbsp;→ états financiers, ratios et notation automatiques</li>
          <li>Databook Excel en formules, rapports PowerPoint &amp; PDF prêts à livrer</li>
          <li>Business plans prévisionnels et valorisation (DCF &amp; multiples)</li>
          <li>100&nbsp;% hors-ligne — vos données restent sur votre poste</li>
        </ul>
        <div class="lgn-mark">FINDALYX</div>
      </div>
      <div class="lgn-form">
        <h2>${T[r.kind]||"Bienvenue"}</h2>
        <p class="mut">${M[r.kind]||M.activation}</p>
        <input id="licCode" class="sel" placeholder="Code d'activation Findalyx"
          style="width:100%;margin:14px 0" value="">
        <div class="row">
          <button class="btn primary" style="flex:1" onclick="licActiver()">Activer</button>
          ${r.kind==="offline"?'<button class="btn" onclick="licDemarrer()">Réessayer</button>':""}
        </div>
        <p class="mut" style="margin-top:14px;font-size:11.5px">Licence annuelle par appareil&nbsp;;
        la vérification ne transmet que le code et l'identifiant de l'appareil.<br>Contact&nbsp;: support@findalyx.com</p>
      </div>
    </div>
  </div>`;
  const e=document.getElementById("licCode");
  if(e)e.addEventListener("keydown",ev=>{if(ev.key==="Enter")licActiver();});
}
async function licActiver(){
  const code=(document.getElementById("licCode")||{}).value||"";
  const r=await licControler(code);
  if(r.ok){
    try{localStorage.setItem("fxc_licence",String(code).replace(/\s+/g,""));}catch(e){}
    LIC_ETAT=r;
    demarrerApp();
    toast("Licence activée — bienvenue"+(r.customer?" "+r.customer:"")+" !");
  }else licEcran(r);
}
async function licDemarrer(){
  let code="";try{code=localStorage.getItem("fxc_licence")||"";}catch(e){}
  const r=await licControler(code);
  if(r.ok){LIC_ETAT=r;demarrerApp();if(r.mode==="online")licSyncSocietes();}
  else licEcran(r);
}
function licChanger(){
  if(!confirm("Changer de code de licence ?"))return;
  try{localStorage.removeItem("fxc_licence");}catch(e){}
  location.reload();
}

/* ----- quota de sociétés côté serveur (mêmes opérations que l'outil liasses) ----- */
async function licOpSociete(op,params){
  let code="";try{code=localStorage.getItem("fxc_licence")||"";}catch(e){}
  if(!code||code.indexOf(".")>=0)return {net:false,proprietaire:code.indexOf(".")>=0};
  try{
    const r=await fetch(LIC_FN,{method:"POST",
      headers:{"Content-Type":"application/json","apikey":LIC_KEY,"Authorization":"Bearer "+LIC_KEY},
      body:JSON.stringify(Object.assign({cle:code,produit:"conseil",op},params||{}))});
    const d=await r.json();
    return {net:true,data:d};
  }catch(e){return {net:false};}
}
async function licAjouterSociete(id,libelle){
  const r=await licOpSociete("add",{societe_id:id,libelle});
  if(r.proprietaire)return {ok:true};
  if(r.net){
    const d=r.data||{};
    if(d.ok)return {ok:true,used:d.used,max:d.max};
    if(d.raison==="quota_societes")return {ok:false,used:d.used,max:d.max};
    return {ok:true};                 /* autre erreur serveur : ne pas bloquer le travail */
  }
  /* hors-ligne : contrôle local de secours */
  if(LIC_ETAT&&LIC_ETAT.maxSoc>0&&chargerDossiers().length>=LIC_ETAT.maxSoc)
    return {ok:false,used:chargerDossiers().length,max:LIC_ETAT.maxSoc};
  return {ok:true};
}
function licRetirerSociete(id){licOpSociete("remove",{societe_id:id});}
function licSyncSocietes(){
  try{
    const list=chargerDossiers().map(d=>({id:d.id,libelle:d.societe}));
    licOpSociete("sync",{list}).then(r=>{
      if(r.net&&r.data&&r.data.ok&&LIC_ETAT){LIC_ETAT.usedSoc=r.data.used;LIC_ETAT.maxSoc=r.data.max;}
    });
  }catch(e){}
}
