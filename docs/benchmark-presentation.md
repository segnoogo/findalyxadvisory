# Benchmark — comment les banques d'affaires et les cabinets présentent un BP / une valo

Relevé de pratiques (août 2026) utilisé pour redéfinir la grammaire des rapports PowerPoint de
l'application. Sources en fin de note.

## 1. Ce qui distingue un document de banque d'affaires

| Règle observée | Application chez nous |
|---|---|
| **Un message par page, énoncé dans le titre** (« action title » : une phrase complète qui dit la conclusion, pas le sujet). On doit pouvoir lire la suite des titres et comprendre le dossier sans ouvrir un graphique. | `rpTitreMsg` : sujet en surtitre, message calculé depuis les chiffres du dossier (bascule de l'EBITDA, année du point mort, fourchette de valeur…). |
| **Sommaire paginé** en tête de document. | `rpSommaire`, page 2, construit en deux passes. |
| **Le corps prouve le titre** : données, analyse, recommandation — pas de paragraphe qui explique la page. | Tableaux + cadre de commentaires réservé à l'analyste. |
| **Source citée sous chaque exhibit** (Capital IQ, FactSet, comptes sociaux…). | Note de source sous chaque tableau, mention en pied de page. |
| **Grille et conventions constantes** : mêmes marges, mêmes largeurs de colonnes, mêmes formats de nombres, mêmes couleurs d'un bout à l'autre. | Marges 0,55" / largeur utile 12,23", `rpTable` centralise tous les styles. |
| **Football field** pour synthétiser une valorisation : barres flottantes min–max par méthode sur un axe commun ; l'information utile n'est pas une barre, c'est la **zone de recoupement**. | `rpFootball` (losange = valeur centrale, zone bleutée = recoupement, trait = valeur retenue). |

## 2. Structure type d'un dossier de cession

1. **Teaser / blind profile** — 1 à 2 pages, anonyme, diffusé sans NDA.
2. **CIM / mémorandum d'information** — le dossier complet, après NDA.
3. **Management presentation** — la même matière, présentée par la direction.

Notre rapport « Business plan + Valorisation » joue le rôle du CIM ; le teaser était le maillon
manquant, d'où son ajout.

## 3. Contenu d'un teaser (consensus des sources)

- secteur et géographie (pas d'adresse précise) ;
- description générale de l'activité ;
- points forts de l'investissement (croissance, marges, récurrence, position) ;
- résumé financier : historique **et** prévisionnel (CA, EBITDA, marge) ;
- rationnel et modalités envisagées de l'opération ;
- prochaines étapes, contact du conseil, mention NDA ;
- **pas de valorisation** : le prix ne se négocie pas dans un teaser ;
- rien qui permette d'identifier la société (client cité, implantation unique, effectif exact).

## 4. Sources

- Mergers & Inquisitions — *Investment Banking Pitch Books: Structure, Samples & Templates*
  <https://mergersandinquisitions.com/investment-banking-pitch-books/>
- IMAP — *CIM vs. Teaser: What Goes In Each and Why It Matters*
  <https://www.imap.com/en/insights/2026/CIM-vs-Teaser-What-Goes-In-Each-and-Why-It-Matters~cv>
- Corporate Finance Institute — *Investment Teaser Template*
  <https://corporatefinanceinstitute.com/resources/valuation/investment-teaser-template/>
- InvestmentBank.com — *Blind Profiles: A Few Considerations*
  <https://investmentbank.com/insights/blind-profiles>
- Wall Street Prep — *Investment Banking Pitchbook | Format + Examples*
  <https://www.wallstreetprep.com/knowledge/investment-banking-pitchbook/>
- Wall Street Prep — *Football Field Valuation Chart*
  <https://www.wallstreetprep.com/knowledge/football-field-valuation-real-example-excel-template/>
- FE Training — *Football Field Analysis*
  <https://www.fe.training/free-resources/valuation/football-field-analysis/>
- Slideworks — *How to Write Action Titles Like McKinsey*
  <https://slideworks.io/resources/how-to-write-action-titles-like-mckinsey>
- PPT PowerTools — *The anatomy of a consulting slide*
  <https://pptpowertools.com/the-anatomy-of-a-consulting-slide/>
