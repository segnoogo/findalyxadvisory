# Manifeste de `libs.js`

`src/libs.js` (~2,9 Mo) est la **concaténation des bibliothèques tierces minifiées**
embarquées dans l'application. C'est le seul code tiers du projet ; il est versionné
tel quel pour garantir un build **déterministe et 100 % hors-ligne** (aucun `npm install`,
aucun CDN). Ce fichier documente ce qu'il contient et comment le mettre à jour.

## Contenu

| Bibliothèque | Version | Rôle dans l'app | Licence | Source |
|---|---|---|---|---|
| **SheetJS (xlsx)** | à confirmer¹ | Lecture des balances (xlsx/xls/csv) et génération des classeurs Excel | Apache-2.0 | https://sheetjs.com |
| **Chart.js** | 4.4.1 | Graphiques (CA/EBITDA/RN, BFR/trésorerie, projections) | MIT | https://www.chartjs.org |
| **PptxGenJS** | 4.0.1 | Génération des 3 rapports PowerPoint (DD / BP / Valo) | MIT | https://gitbrent.github.io/PptxGenJS |
| **jsPDF** | 2.5.2 | Génération des exports PDF | MIT | https://github.com/parallax/jsPDF |
| **jspdf-autotable** | à confirmer¹ | Tableaux dans les PDF (plugin jsPDF) | MIT | https://github.com/simonbengtsson/jsPDF-AutoTable |
| **JSZip** | 3.10.1 | Compression (dépendance de SheetJS / PptxGenJS pour les fichiers Office) | MIT / GPLv3 | https://stuk.github.io/jszip |
| **color** | 0.3.2 | Manipulation de couleurs (dépendance interne) | MIT | — |

¹ *Version non lisible directement dans le blob minifié. Pour la relever : ouvrir la
console du navigateur et taper `XLSX.version` (SheetJS) ; la version d'autoTable figure
dans le bandeau de licence en tête de sa section dans `libs.js`.*

## Mettre à jour une bibliothèque

`libs.js` n'est pas généré par un gestionnaire de paquets : c'est un assemblage manuel
de fichiers `*.min.js`. Pour mettre à jour (ex. correctif de sécurité SheetJS) :

1. Télécharger le `*.min.js` officiel de la nouvelle version (source ci-dessus).
2. Remplacer, **dans `libs.js`**, la section correspondante (repérable par son bandeau
   de licence `/*! … */`) par le nouveau contenu — en conservant l'ordre des libs.
3. Reconstruire : `bash src/assembler.sh`.
4. **Relancer les tests** (`npm test`) et vérifier à la main les exports qui dépendent de
   la lib mise à jour : Excel (SheetJS), PowerPoint (PptxGenJS), PDF (jsPDF/autoTable).

## Pourquoi embarquer plutôt que via npm/CDN ?

- **Hors-ligne** : l'app doit fonctionner sans réseau (contexte OHADA/terrain).
- **Déterminisme** : le build ne dépend d'aucun registre externe ni d'une résolution de
  versions — il sera reproductible à l'identique dans 5 ans (cf. test « poste vierge »).
- Contrepartie assumée : la mise à jour est manuelle — d'où ce manifeste.
