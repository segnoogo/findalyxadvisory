# Architecture — Findalyx Advisory

Document d'entrée pour un développeur qui reprend le code. Il décrit **comment les
morceaux tiennent ensemble** ; le détail métier est dans `docs/` (interne) et le code.

## 1. Vue d'ensemble

Application **navigateur, 100 % hors-ligne, en un seul fichier**. Il n'y a pas de
serveur, pas de bundler, pas de framework : `index.html` est la **concaténation** de
modules source (`src/`) par un simple script shell (`src/assembler.sh`). On édite les
modules, on relance l'assembleur, on obtient `index.html`.

```
src/tete.html  +  src/*.js  +  src/pied.html   ──(assembler.sh)──►  index.html
```

L'état applicatif vit dans le `localStorage` du navigateur (dossiers, mapping,
hypothèses). Aucune donnée ne sort de la machine.

## 2. Chaîne de données (le cœur métier)

```
Balance (matrice de cellules)
   │  lireBalance()            détecte les colonnes, exclut les sous-totaux
   ▼
Comptes d'un exercice ──►  construireTbagr([balances])   agrégation multi-exercices (en K)
   │  appliquerMapping()       rattache chaque compte à une ligne de restitution
   ▼
TBAGR mappée
   │  calculerEtats()          P&L analytique + Bilan actif net + TFT officiel
   ▼
Etats { annees, v[CODE][annee], tft }
   ├─►  calculerRatios()                 16 ratios + score de santé
   ├─►  genererCommentaires()            projets de commentaires chiffrés
   └─►  hypothesesParDefaut() ─► projeter() ─► valoriser()   BP 5 ans + DCF/multiples
```

Tout ce bloc est dans **`src/moteur.js`** (moteur pur, sans DOM, typé et testé).
L'UI (`ui.js`) appelle ces fonctions dans `recalculer()` et stocke le résultat dans
la variable globale `ETATS`. Les modules d'export (databook, etatsxl, bpxl, pdf,
rapports) lisent `ETATS` et les hypothèses pour produire les livrables.

## 3. Le contrat de « scope global » (à lire absolument)

Les modules **ne sont pas des modules ES** : pas d'`import`/`export`. Ils sont
concaténés dans des balises `<script>` et **partagent un seul scope global**. En
conséquence :

- Une fonction définie dans `moteur.js` (ex. `calculerEtats`) est appelée directement
  depuis `ui.js` — c'est une globale.
- **L'ordre de chargement compte** et il est défini par `src/assembler.sh` :
  `tete.html → libs.js → moteur.js → logo.js → licence.js → bp.js → databook.js →
  rapports.js → pdf.js → ui.js → bpui.js → bpxl.js → etatsxl.js → pied.html`.
  Un module ne peut utiliser que ce qui est défini **avant** lui.
- Exemple de couplage par globale : `ui.js` fait `uni()` → `globalThis.CONF_UNITE = …`,
  et `moteur.js` (`genererCommentaires`) lit `CONF_UNITE` pour formater les montants.
  Ces globales « transverses » sont déclarées pour l'outillage dans `src/globals.d.ts`.
- `pied.html` amorce l'application (appel de `demarrerApp()` / `licDemarrer()`).

Corollaire : pour l'outillage (VS Code, `tsc`), tous les `src/*.js` forment **un seul
programme** (voir `jsconfig.json`), pas des fichiers indépendants.

## 4. Carte des modules

| Module | Rôle | Points d'entrée / globales notables |
|---|---|---|
| `tete.html` | Squelette HTML + **toute la CSS** (charte, mise en page, responsive, écran licence) | `#app`, `#toast` |
| `libs.js` | Bibliothèques tierces embarquées (voir `src/libs.manifest.md`) | `XLSX`, `Chart`, `PptxGenJS`, `jsPDF`, `JSZip` |
| `moteur.js` | **Moteur de calcul pur** (parsing → mapping → états → projections → valo) | `lireBalance`, `construireTbagr`, `appliquerMapping`, `calculerEtats`, `calculerRatios`, `hypothesesParDefaut`, `projeter`, `valoriser`, `genererCommentaires`, `LIGNES_PL/BS`, `RATIOS_META` |
| `logo.js` | Logos Findalyx en base64 | constantes de logo |
| `licence.js` | Licence ECDSA hors-ligne + vérif en ligne (Supabase), quota sociétés | `licDemarrer`, `licControler`, `licActiver`, `LIC_PUB` (clé **publique**) |
| `bp.js` | Couche **business plan interactive** (scénarios, OPEX détaillés) au-dessus du moteur | `hypothesesBP`, `projeterBP`, `valoriserBP` |
| `databook.js` | Databook DD Excel 13 onglets à formules | `genererDatabook`, `DB_PL`, `DB_BS` |
| `rapports.js` | 3 rapports PowerPoint (DD / BP / Valo) via PptxGenJS | générateurs de rapport |
| `pdf.js` | Export PDF (jsPDF) | générateur PDF |
| `ui.js` | **Interface principale** : état, navigation, vues, rendu, export Excel des états | `demarrerApp`, `recalculer`, `uni`→`CONF_UNITE`, `vue*()`, `ETATS`, `DOSSIER` |
| `bpui.js` | Interface du business plan (hypothèses, scénarios, valo) | `assurerBP`, `hBP`, `choisirScenario` |
| `bpxl.js` | Classeur BP à formules (Excel) | `construireFeuillesBP` |
| `etatsxl.js` | Classeur des états à formules (Excel) | `construireEtatsFormules` |
| `pied.html` | Fermeture + amorçage de l'app | — |

> `moteur.js` définit `projeter`/`valoriser` (référence, testée) ; `bp.js` en fournit
> une version enrichie pour l'UI (`projeterBP`/`valoriserBP`). Étendre les tests à
> `bp.js` est un bon prochain pas.

## 5. Types (JSDoc + vérification, sans build)

Le typage se fait **sans TypeScript à la compilation** : `moteur.js` porte `// @ts-check`
et des types **JSDoc** (`@typedef`, `@param`, `@returns`). On obtient la vérification et
l'autocomplétion dans VS Code sans rien installer, et le `.js` édité reste le `.js` livré.

- `jsconfig.json` : configure l'éditeur et le vérificateur (exclut `libs.js`).
- `src/globals.d.ts` : déclare les globales transverses (`CONF_UNITE`, `module`).
- Vérifier en ligne de commande : `npm run typecheck` (ou `npx -p typescript tsc -p jsconfig.json`).
  Résultat attendu : **0 erreur**.

Pour typer un autre module plus tard : ajouter `// @ts-check` en tête et annoter au fur
et à mesure (les `@typedef` du moteur sont réutilisables).

## 6. Tests

Golden-master, **données synthétiques uniquement** (`tests/fixtures.js` — société
fictive, jamais de balance client). Lancement : `npm test` (ou `node tests/run.js`),
aucune dépendance.

Ils encodent les garanties « au franc près » :
- ingestion (détection de colonnes, exclusion des sous-totaux, équilibre) ;
- valeurs de référence (CA/EBITDA/RN) ;
- **Actif net = Capitaux propres** (bilan équilibré) ;
- **TFT réconcilié** (clôture du TFT = trésorerie du bilan) ;
- **bilan prévisionnel bouclé** (actif = passif chaque année) ;
- cohérence de la valorisation (EV, fourchette, equity = EV − dette nette).

Un développeur relance `npm test` après toute modif du moteur.

### 6.1 Conformité des livrables (`npm run verif`)

Les tests ci-dessus valident le **moteur**. Mais les classeurs Excel exportés
**réimplémentent** ses calculs en formules, et le rapport PowerPoint en redérive
certains : un écart y est invisible à l'œil, le fichier restant cohérent en
interne, simplement faux. Plusieurs bugs de ce type ont été livrés avant que ce
contrôle n'existe (poids de la dette écrasé par un défaut, TVA absente du BFR
projeté, intérêts de l'année de tirage, séries non prolongées au-delà des années
saisies).

`tools/verif-conformite.js` compare donc **ligne à ligne, année par année**, ce
que produit chaque classeur à ce que produit le moteur, sur une quinzaine de
variantes de dossier (dette nulle, mi-année, multiple de sortie, construction,
situation d'ouverture, découvert, CCA amorti, dividendes, séries annuelles,
horizon à 7 ans…) construites depuis le dossier de démonstration intégré —
**aucune donnée client**. Les lignes chiffrées non couvertes sont listées : la
couverture doit rester explicite.

Les formules sont évaluées par `src/xlcalc.js` (évaluateur du sous-ensemble Excel
réellement produit). `npm run verif:excel` ferme la boucle : il fait recalculer
le classeur par **Excel lui-même** (COM, Windows) et compare les deux résultats
cellule par cellule.

Après toute modification d'un export (`ui.js`, `bpxl.js`, `etatsxl.js`,
`databook.js`) ou du moteur : `npm test && npm run verif`.

## 7. Conventions

- **Unités** : montants en **K** dans la TBAGR et les états ; **crédits en négatif**.
  L'affichage (FCFA / K / M) est géré par `CONF_UNITE` côté UI.
- **Signes** : P&L → produits +, charges − ; Bilan → signes naturels, capitaux propres
  affichés positifs. Négatifs entre parenthèses à l'affichage.
- **Langue** : le domaine est en français (noms de fonctions, variables, commentaires).

### 7.1 Grammaire des rapports PowerPoint

Conventions reprises des pitchbooks de banques d'affaires et des decks de conseil
(cf. `docs/benchmark-presentation.md`) :

- **Titre-message** (`rpTitreMsg(sl,sujet,message)`) : le titre porte la **conclusion** de la
  page, calculée depuis les chiffres du dossier ; le sujet devient un surtitre discret. On doit
  pouvoir lire la suite des titres et comprendre le dossier sans ouvrir un tableau. La fonction
  renvoie l'ordonnée où le contenu peut commencer — **toujours** l'utiliser pour poser le premier
  tableau, sinon un message sur deux lignes recouvre le bandeau du tableau.
- **Sommaire paginé** (`rpSommaire`) : l'ordre des diapositives de PptxGenJS n'est pas modifiable
  après création. Le rapport est donc construit **deux fois** : une passe à blanc qui relève la
  page de chaque section (`RP_SOM`), puis la passe réelle qui compose le sommaire en page 2
  (`RP_SOM_FIX`). Les compteurs de page réservent la page 2 dès le départ.
- **Football field** (`rpFootball`) : synthèse de valorisation — une barre flottante min–max par
  méthode sur un axe commun, losange sur la valeur centrale, zone de recoupement, repère de la
  valeur retenue. C'est la page que le lecteur regarde en premier.
- **Teaser** (`construireTeaser`) : 1 page + résumé financier, diffusable **avant** tout NDA,
  avec option de nom de code (`DOSSIER.teaser = {anonyme, code}`). Aucune valorisation. Tous les
  textes repris de la fiche d'identité sont bornés (`rpCoupe`) : un teaser ne déborde jamais.

### 7.2 Tableaux des rapports PowerPoint (`rpTable`)

Tous les tableaux du rapport passent par `rpTable(...)` : la mise en forme est **centralisée**,
il n'y a pas de style posé à la main dans les diapositives. Règles :

| `styles[i]` | Rendu | Emploi |
|---|---|---|
| `groupe` | bandeau pâle, bleu, sans chiffres | intertitre de section *dans* le tableau (TFT, bilan, hypothèses) |
| `titre` | gras bleu nuit | tête de bloc (CA, EBITDA de référence) |
| `sous_total` | gras bleu nuit + filet **au-dessus** | « somme de ce qui précède » |
| `total` | gras + fond très pâle + filet au-dessus | ligne conclusive (Résultat net, WACC, valeur retenue) |
| `detail` | libellé indenté | ligne courante |
| `pct` | italique gris | ratio |

- un filet ferme la **dernière ligne** de chaque tableau (sinon une colonne teintée semble flotter) ;
- `opts.compact` retire les lignes de *détail* vides (états financiers uniquement) ;
- `opts.enteteClair` donne un en-tête pâle : c'est ainsi qu'un **bloc de ratios** s'accole sous un
  état, avec les mêmes `largeurs` — les exercices tombent dans le même axe sans mélanger montants
  et pourcentages dans une seule grille ;
- `rpTable` renvoie le bas du bloc (tableau + note) : `rpCommentReste(...)` pose le cadre de
  commentaires juste dessous, ce qui évite les bandes blanches au milieu des pages ;
- négatifs **entre parenthèses** partout (montants, %, ×, jours) et décimale française.

## 8. Glossaire

- **TBAGR** : *trial balance* agrégée — une ligne par compte, une colonne par exercice.
- **Mapping / ligne de restitution** : rattachement d'un compte à une ligne des états
  (source unique de vérité ; toute correction recalcule les états).
- **P&L analytique** : CA → marge brute → EBITDA → EBIT → résultat net.
- **BFR** : besoin en fonds de roulement (exploitation + hors exploitation).
- **TFT** : tableau des flux de trésorerie (format officiel SYSCOHADA, réf. ZA…ZG).
- **DSO / DIO / DPO** : délais clients / stocks / fournisseurs (en jours).
- **WACC / FCFF / DCF** : coût moyen du capital / flux de trésorerie disponible /
  actualisation des flux.
- **Multiples / ANR / football field** : approches de valorisation complémentaires.
- **HAO** : hors activités ordinaires (SYSCOHADA).
