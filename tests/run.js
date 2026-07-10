/* =========================================================================
   Tests golden-master du moteur (src/moteur.js) — données SYNTHÉTIQUES.
   Exécution :  node tests/run.js     (aucune dépendance)
   Ces tests encodent les garanties « au franc près » du moteur : mapping,
   bilan équilibré (Actif net = Capitaux propres), TFT réconcilié, bilan
   prévisionnel bouclé, cohérence de la valorisation. Un développeur qui
   modifie le moteur les relance pour vérifier qu'il n'a rien cassé.
   ========================================================================= */
const M = require('../src/moteur.js');
const BP = require('../src/bp.js');
const { balances, matrice } = require('./fixtures.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error('  ✗ ' + msg); } };
const near = (a, b, eps, msg) =>
  ok(a != null && Math.abs(a - b) <= eps, `${msg} — attendu ${b}, obtenu ${a}`);

console.log('== 1. Ingestion (lireBalance) ==');
const lu = M.lireBalance(matrice);
ok(lu.controle.nb === 17, `17 comptes après exclusion des sous-totaux (obtenu ${lu.controle.nb})`);
ok(lu.controle.sousTotauxExclus >= 1, `au moins 1 sous-total exclu (obtenu ${lu.controle.sousTotauxExclus})`);
near(lu.controle.ecart, 0, 0.5, 'balance équilibrée (écart débit − crédit)');

console.log('== 2. États financiers : golden values + invariants ==');
const tbagr = M.appliquerMapping(M.construireTbagr(balances), {});
const etats = M.calculerEtats(tbagr);
const v = etats.v;

// Valeurs de référence (en K), exercice 2024
near(v.CA[2024],           130,  0.001, 'CA 2024');
near(v.MARGE_BRUTE[2024],   70,  0.001, 'Marge brute 2024');
near(v.EBITDA[2024],        30,  0.001, 'EBITDA 2024');
near(v.EBIT[2024],          22,  0.001, 'EBIT 2024');
near(v.RESULTAT_NET[2024],  19,  0.001, 'Résultat net 2024');
// Exercice 2023
near(v.CA[2023],           112,  0.001, 'CA 2023');
near(v.EBITDA[2023],        25.5,0.001, 'EBITDA 2023');
near(v.RESULTAT_NET[2023],  15.3,0.001, 'Résultat net 2023');

// INVARIANT 1 — bilan équilibré : Actif net = Capitaux propres, chaque exercice
etats.annees.forEach(a =>
  near(v.ACTIF_NET[a], v.CAPITAUX_PROPRES[a], 0.001, `Bilan équilibré ${a} (Actif net = Capitaux propres)`));

// INVARIANT 2 — TFT réconcilié : clôture du TFT = trésorerie nette du bilan
for (let i = 1; i < etats.annees.length; i++) {
  const a = etats.annees[i];
  near(etats.tft[a].ZG, v.TRESORERIE_NETTE[a], 0.001, `TFT réconcilié ${a} (ZG = trésorerie de clôture)`);
}

console.log('== 3. Ratios ==');
const r = M.calculerRatios(etats);
ok(r.ratios.length === 16, `16 ratios (obtenu ${r.ratios.length})`);
ok(r.score >= 0 && r.score <= 100, `score de santé dans [0, 100] (obtenu ${r.score})`);
const mEbitda = r.ratios.find(x => x.k === 'margeEbitda').vals[2024];
near(mEbitda, 30 / 130 * 100, 0.01, 'ratio marge EBITDA 2024 (≈ 23,08 %)');

console.log('== 4. Projections (bilan prévisionnel bouclé) ==');
const hyp = M.hypothesesParDefaut(etats);
const proj = M.projeter(etats, hyp, 5);
ok(proj.annees.length === 5, `5 années projetées (obtenu ${proj.annees.length})`);
proj.annees.forEach(a => {
  const actif  = proj.bs.IMMO_NET[a] + proj.bs.BFR[a] + proj.bs.TRESO_NETTE[a];
  const passif = proj.bs.CP[a] + proj.bs.PROVISIONS[a] + proj.bs.DETTES_FIN[a];
  near(actif, passif, 0.001, `Bilan prévisionnel bouclé ${a} (actif = passif)`);
});

console.log('== 5. Valorisation ==');
const valo = M.valoriser(proj, hyp, etats);
ok(isFinite(valo.ev), `valeur d'entreprise (EV) finie (obtenu ${Math.round(valo.ev)} K)`);
near(valo.equityDcf, valo.ev - valo.detteNette, 0.001, 'Equity DCF = EV − dette nette');
ok(valo.eqMin <= valo.equityDcf + 1e-6 && valo.equityDcf <= valo.eqMax + 1e-6,
   `valeur centrale dans la fourchette [${Math.round(valo.eqMin)}, ${Math.round(valo.eqMax)}]`);

console.log('== 6. Scores (3 modèles) ==');
const sc = M.calculerScores(etats);
ok(sc.notation.global >= 0 && sc.notation.global <= 100, `Notation dans [0,100] (obtenu ${sc.notation.global})`);
ok(['A','B','C','D','E'].includes(sc.notation.grade), `Notation : grade A-E valide (${sc.notation.grade})`);
ok(isFinite(sc.altman.z), `Altman : Z fini (${sc.altman.z})`);
ok(['AAA','AA','A','BBB','BB','B','CCC','D'].includes(sc.altman.grade), `Altman : grade AAA-D valide (${sc.altman.grade})`);
ok(['A','B','C','D','E'].includes(sc.bceao.cote) && sc.bceao.nOk >= 0 && sc.bceao.nOk <= 4, `BCEAO : cote A-E et nOk 0-4 (${sc.bceao.cote}, ${sc.bceao.nOk}/4)`);

console.log('== 7. Agrégats benchmark (contribution anonymisée) ==');
const agb = M.agregatsBenchmark(etats);
ok(Object.keys(agb).length === 16, `16 champs d'agrégats (obtenu ${Object.keys(agb).length})`);
near(agb.ca, v.CA[etats.annees[etats.annees.length - 1]], 0.001, 'agrégat ca = CA de l\'état');
ok(agb.dettes_financieres >= 0 && agb.dettes_fournisseurs >= 0, 'dettes exprimées en magnitude positive');

console.log('== 8. Moteur VIVANT bp.js (business plan bouclé + valorisation) ==');
const Hbp = BP.hypothesesBP(etats);
const Pbp = BP.projeterBP(etats, Hbp);
ok(Pbp.annees.length === (Hbp.nb || 5), `${Hbp.nb || 5} années projetées (obtenu ${Pbp.annees.length})`);
// INVARIANT 3 — bilan prévisionnel bouclé : l'écart de bouclage du TFT ≈ 0 chaque année
Pbp.annees.forEach(a => near(Pbp.tft[a].ECART, 0, 0.01, `BP bouclé ${a} (ECART TFT ≈ 0)`));
// INVARIANT 4 — TFT prévisionnel réconcilié : clôture (ZG) = trésorerie nette du bilan
Pbp.annees.forEach(a => near(Pbp.tft[a].ZG, Pbp.bs.TRESO[a], 0.01, `TFT prévisionnel ${a} (ZG = trésorerie de clôture)`));
// impôt minimum forfaitaire : l'impôt payé est au moins l'IMF (part du CA), chaque année
Pbp.annees.forEach(a => ok(Pbp.pl.IS[a] <= -((Hbp.imf_taux || 0) * Pbp.pl.CA[a]) + 1e-6, `impôt ≥ IMF ${a} (IS ${Math.round(Pbp.pl.IS[a])})`));
const valBp = BP.valoriserBP(etats, Hbp, Pbp);
ok(isFinite(valBp.wacc) && valBp.wacc > 0 && valBp.wacc < 1, `WACC dans ]0,1[ (obtenu ${(valBp.wacc * 100).toFixed(1)} %)`);
ok(valBp.ke >= valBp.kd, `coût des fonds propres ≥ coût de la dette après IS (${(valBp.ke * 100).toFixed(1)} % ≥ ${(valBp.kd * 100).toFixed(1)} %)`);
// mode Gordon (défaut) : le centre de la matrice de sensibilité = la valeur DCF centrale
near(valBp.sensi[2][2], valBp.equityDcf, 0.5, 'sensibilité centrale = equity DCF (mode Gordon)');
near(valBp.vt, valBp.vtGordon, 0.001, 'valeur terminale = Gordon par défaut');
// valeur retenue dans la fourchette pondérée
ok(valBp.fourchette.min <= valBp.fourchette.retenue + 1e-6 && valBp.fourchette.retenue <= valBp.fourchette.max + 1e-6,
   `valeur retenue dans la fourchette [${Math.round(valBp.fourchette.min)}, ${Math.round(valBp.fourchette.max)}]`);
// mode exit-multiple : VT = multiple de sortie × EBITDA terminal
const Hex = BP.hypothesesBP(etats); Hex.valo.tvMode = 'exit';
const valEx = BP.valoriserBP(etats, Hex, BP.projeterBP(etats, Hex));
near(valEx.vt, valEx.vtExit, 0.001, 'valeur terminale = multiple de sortie en mode exit');
near(valEx.vtExit, Hex.valo.exitMultiple * valEx.ebitdaTerm, 0.001, 'VT exit = multiple × EBITDA terminal');
// pont EV→FP : provisions R&C pré-remplies (négatif) quand il en existe
ok(Array.isArray(Hbp.valo.bridge), 'le pont EV→FP est un tableau');
const provRC = -(v.PROVISIONS_RC[etats.annees[etats.annees.length - 1]] || 0);
if (provRC > 0.5) ok(Hbp.valo.bridge.some(b => /provision/i.test(b.lib) && b.montant < 0), 'pont pré-rempli avec les provisions R&C (montant négatif)');
else ok(true, 'pas de provisions R&C à pré-remplir dans la fixture');

console.log('== 9. Moteur MODÈLE (BP sans historique, projeterModele) ==');
const modele = {
  nb:5, anneeDepart:2025, is_taux:0.30, imf_taux:0.005, inflation:0.03,
  revenus:[
    {rows:[{op:'x',name:'Quantité',val:100000,unit:'u/an',g:5}], prix:{val:1000,unit:'FCFA',g:2}, cout:{m:'pct',val:40}},
    {rows:[{op:'x',name:'Capacité',val:5000,unit:'u/an'},{op:'x',name:'Utilisation',val:80,unit:'%'}], prix:{val:2000,g:3}, cout:{m:'unit',val:900}}
  ],
  chargesFixes:[{name:'Charges fixes',montant:30000000,g:3}],
  capex:[{montant:200000000,duree:5,annee:0}],
  financement:{capital:100000000,apports:0,emprunt:{montant:150000000,taux:0.08,duree:5}},
  bfr:{dso:30,dio:45,dpo:30}
};
const Pm = BP.projeterModele(modele);
ok(BP.volInducteurs(modele.revenus[1].rows,0) === 5000*0.8, 'volInducteurs : chaîne × avec unité % traitée en ratio');
near(Pm.pl.CA[2025], 100000*1000 + 5000*0.8*2000, 0.001, 'CA modèle an 1 = Σ (volume × prix) par ligne');
// INVARIANT 5 — bilan modèle bouclé : ECART du TFT ≈ 0 chaque année
Pm.annees.forEach(a => near(Pm.tft[a].ECART, 0, 0.01, `BP modèle bouclé ${a} (ECART TFT ≈ 0)`));
near(Pm.ouverture.treso, 100000000 + 150000000 - 200000000, 0.001, 'trésorerie d\'ouverture = capital + emprunt − CAPEX initial');
ok(Math.abs((Pm.ouverture.immoNet + Pm.ouverture.bfr + Pm.ouverture.treso) - (Pm.ouverture.cp + Pm.ouverture.dette)) < 0.001, 'bilan d\'ouverture équilibré (actif = passif)');
ok(Pm.annees.every(a => Pm.pl.IS[a] <= -(modele.imf_taux * Pm.pl.CA[a]) + 1e-6), 'impôt minimum forfaitaire appliqué chaque année (modèle)');

console.log(`\n${fail ? '❌ ÉCHEC' : '✅ SUCCÈS'} — ${pass} assertions passées, ${fail} échec(s).`);
process.exit(fail ? 1 : 0);
