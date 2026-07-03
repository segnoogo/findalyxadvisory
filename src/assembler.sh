#!/bin/bash
# Assemble les modules source de src/ en ../index.html (fichier servi par GitHub Pages).
# NE JAMAIS editer ../index.html a la main : il est regenere ici a chaque build.
set -e
cd "$(dirname "$0")"
OUT="../index.html"

cat tete.html libs.js > "$OUT"
echo "</script><script>" >> "$OUT"
cat moteur.js >> "$OUT"
echo "</script><script>" >> "$OUT"
cat logo.js licence.js bp.js databook.js rapports.js pdf.js ui.js bpui.js bpxl.js etatsxl.js >> "$OUT"
cat pied.html >> "$OUT"

echo "OK - index.html regenere ($(wc -c < "$OUT" | tr -d ' ') octets)."
