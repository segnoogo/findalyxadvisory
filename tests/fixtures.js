/* =========================================================================
   Données SYNTHÉTIQUES pour les tests — « SOCIÉTÉ TEST SARL », société fictive.
   AUCUNE donnée client réelle. 2 exercices, chacun équilibré (le compte banque 52
   est calculé pour boucler la balance à 0).
   ========================================================================= */

/**
 * Construit les comptes d'un exercice et ajoute automatiquement la banque (52)
 * pour que la balance soit équilibrée (somme des soldes nets = 0).
 * @param {{compte:string, libelle:string, net:number}[]} lignesSansBanque
 * @returns {{compte:string, libelle:string, net:number}[]}
 */
function exercice(lignesSansBanque){
  const somme = lignesSansBanque.reduce((t,l)=>t+l.net, 0);
  return lignesSansBanque.concat([{compte:'52', libelle:'Banque', net:-somme}]);
}

const A2023 = exercice([
  {compte:'101', libelle:'Capital social',              net:-50000},
  {compte:'110', libelle:'Réserves',                    net:-6000},
  {compte:'16',  libelle:'Emprunts',                    net:-35000},
  {compte:'241', libelle:'Matériel',                    net:72000},
  {compte:'281', libelle:'Amortissements matériel',     net:-13000},
  {compte:'311', libelle:'Stocks marchandises',         net:12000},
  {compte:'411', libelle:'Clients',                     net:20000},
  {compte:'401', libelle:'Fournisseurs',                net:-14000},
  {compte:'441', libelle:'État, impôts',                net:-4000},
  {compte:'421', libelle:'Personnel',                   net:-3500},
  {compte:'601', libelle:'Achats de marchandises',      net:52000},
  {compte:'661', libelle:'Charges de personnel',        net:26000},
  {compte:'622', libelle:'Locations',                   net:8500},
  {compte:'681', libelle:'Dotations aux amortissements',net:7000},
  {compte:'671', libelle:'Frais financiers',            net:3200},
  {compte:'701', libelle:'Ventes de marchandises',      net:-112000},
]);

const A2024 = exercice([
  {compte:'101', libelle:'Capital social',              net:-50000},
  {compte:'110', libelle:'Réserves',                    net:-10000},
  {compte:'16',  libelle:'Emprunts',                    net:-30000},
  {compte:'241', libelle:'Matériel',                    net:80000},
  {compte:'281', libelle:'Amortissements matériel',     net:-20000},
  {compte:'311', libelle:'Stocks marchandises',         net:15000},
  {compte:'411', libelle:'Clients',                     net:25000},
  {compte:'401', libelle:'Fournisseurs',                net:-18000},
  {compte:'441', libelle:'État, impôts',                net:-5000},
  {compte:'421', libelle:'Personnel',                   net:-4000},
  {compte:'601', libelle:'Achats de marchandises',      net:60000},
  {compte:'661', libelle:'Charges de personnel',        net:30000},
  {compte:'622', libelle:'Locations',                   net:10000},
  {compte:'681', libelle:'Dotations aux amortissements',net:8000},
  {compte:'671', libelle:'Frais financiers',            net:3000},
  {compte:'701', libelle:'Ventes de marchandises',      net:-130000},
]);

/** Balances multi-exercices prêtes pour construireTbagr(). */
const balances = [
  {annee:2023, comptes:A2023},
  {annee:2024, comptes:A2024},
];

/* Matrice « tableur » pour tester l'ingestion (lireBalance) : 2 colonnes
   débit/crédit, avec un SOUS-TOTAL (compte 40 = 401 + 402) qui doit être
   exclu automatiquement. La balance est équilibrée (débit = crédit = 257 000). */
const matrice = [
  ['Balance générale — SOCIÉTÉ TEST SARL', '', '', ''],
  ['Compte', 'Libellé', 'Solde débit', 'Solde crédit'],
  ['101', 'Capital social',               '',     50000],
  ['241', 'Matériel',                     80000,  ''],
  ['281', 'Amortissements matériel',      '',     20000],
  ['311', 'Stocks marchandises',          15000,  ''],
  ['40',  'Total fournisseurs',           '',     18000],
  ['401', 'Fournisseur A',                '',     10000],
  ['402', 'Fournisseur B',                '',     8000],
  ['411', 'Clients',                      25000,  ''],
  ['52',  'Banque',                       26000,  ''],
  ['601', 'Achats de marchandises',       60000,  ''],
  ['701', 'Ventes de marchandises',       '',     130000],
  ['661', 'Charges de personnel',         30000,  ''],
  ['16',  'Emprunts',                     '',     30000],
  ['441', 'État, impôts',                 '',     5000],
  ['421', 'Personnel',                    '',     4000],
  ['622', 'Locations',                    10000,  ''],
  ['681', 'Dotations aux amortissements', 8000,   ''],
  ['671', 'Frais financiers',             3000,   ''],
];

module.exports = { balances, matrice };
