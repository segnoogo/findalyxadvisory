# Findalyx Advisory

Application autonome de conseil financier — **due diligence, business plan et valorisation**
selon la méthode Transaction Services (SYSCOHADA / zone OHADA).

100 % hors-ligne, en **un seul fichier HTML** : toutes les bibliothèques sont embarquées et
aucune donnée ne quitte le navigateur (stockage local). Charte Findalyx (navy `#172554`,
orange `#FA6706`).

## Ce que fait l'application

Import de balances (3 / 4 / 6 / 8 colonnes, détection automatique de structure) → mapping
SYSCOHADA → états financiers (P&L analytique, bilan actif net, TFT réconcilié) → EBITDA ajusté
& BFR normatif → ratios & score de santé → business plan 3–10 ans (3 scénarios) → valorisation
(CAPM/WACC, DCF + sensibilité, multiples, ANR, football field).

Livrables générés dans le navigateur : databook Excel 13 onglets à formules, classeur états +
BP à formules vivantes, PDF A4 paysage, 3 rapports PowerPoint (DD / BP / Valo).

## Structure du dépôt

```
findalyx-advisory/
├── src/                    Code source éditable — ON TRAVAILLE ICI
│   ├── tete.html           en-tête HTML + toute la CSS (charte, mise en page, responsive)
│   ├── libs.js             bibliothèques tierces embarquées (SheetJS, PptxGenJS, jsPDF…)
│   ├── moteur.js           moteur de calcul (parsing, mapping, états, projections, valo)
│   ├── logo.js             logos en base64
│   ├── licence.js          licences ECDSA hors-ligne (clé publique de vérification uniquement)
│   ├── bp.js bpui.js bpxl.js   business plan : logique / interface / export Excel
│   ├── databook.js         databook due diligence 13 onglets à formules
│   ├── rapports.js         3 rapports PowerPoint (DD / BP / Valo)
│   ├── pdf.js              export PDF
│   ├── etatsxl.js          export Excel des états
│   ├── ui.js               interface principale
│   ├── pied.html           pied de page
│   └── assembler.sh        régénère ../index.html
├── index.html              ⚠️ GÉNÉRÉ — servi par GitHub Pages, ne pas éditer à la main
├── sw.js                   service worker (mode hors-ligne / PWA)
├── manifest.webmanifest    manifeste PWA
├── icon-192.png / icon-512.png   icônes PWA
├── CNAME                   domaine GitHub Pages (advisory.findalyx.com)
└── referentiel/            référentiel comptable SYSCOHADA + nomenclature databook
```

## Build

`index.html` est **généré** à partir des modules de `src/`. Après toute modification d'un
module, régénérer le fichier :

```bash
bash src/assembler.sh
```

Le script concatène les modules et réécrit `index.html` à la racine. **Ne jamais éditer
`index.html` à la main** : il serait écrasé au prochain assemblage. Pour tester en local,
ouvrir `index.html` dans un navigateur (double-clic).

## Déploiement

Le dépôt est servi par **GitHub Pages** depuis la racine → `advisory.findalyx.com` (voir
`CNAME`). Après un `git push`, forcer le rechargement (Ctrl+F5) pour contourner le cache du
service worker.

## Notes importantes

- **Aucune donnée client** dans ce dépôt (cf. `.gitignore`) : balances et livrables réels
  restent hors dépôt.
- **Licences** : la clé de signature privée reste hors-ligne sur le poste de l'éditeur ; le
  code client ne contient que la clé publique. Le back-office (console + fonctions Supabase)
  est un projet séparé.
