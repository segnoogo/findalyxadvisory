// Declarations pour l'outillage uniquement (VS Code / tsc) — NON livre dans l'app.
// Les modules de src/ partagent un seul scope global (concatenes par assembler.sh) ;
// ce fichier decrit les globales qu'un module utilise mais qui sont definies ailleurs.

/** Unite d'affichage courante (FCFA / K / M), definie par l'UI (ui.js). */
declare var CONF_UNITE: { f: number; dec: number; suf: string } | undefined;

/** Present uniquement sous Node (execution des tests) ; absent dans le navigateur. */
declare var module: { exports: any } | undefined;
