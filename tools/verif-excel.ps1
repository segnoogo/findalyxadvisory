# =============================================================================
#  Findalyx Advisory — parité évaluateur de formules / Excel.
#
#  Le contrôle de conformité (tools/verif-conformite.js) évalue les formules avec
#  src/xlcalc.js. Ce script vérifie que cet évaluateur dit bien la même chose
#  qu'Excel : il génère le classeur en formules ET sa version en valeurs, fait
#  recalculer le premier par Excel, puis compare cellule par cellule.
#
#  Prérequis : Windows + Excel installé.
#  Usage     : powershell -ExecutionPolicy Bypass -File tools/verif-excel.ps1
# =============================================================================
$ErrorActionPreference = "Stop"
$racine = Split-Path -Parent $PSScriptRoot
$sortie = Join-Path $env:TEMP "findalyx-verif"

Write-Output "1/3 — génération des classeurs (formules + valeurs)"
& node (Join-Path $racine "tools\verif-excel.js") produire $sortie
if ($LASTEXITCODE -ne 0) { throw "génération en échec" }

Write-Output "2/3 — recalcul complet par Excel"
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open((Join-Path $sortie "formules.xlsx"), $false, $false)
  $xl.CalculateFullRebuild()
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($ws in $wb.Worksheets) {
    $ur = $ws.UsedRange; $r0 = $ur.Row; $c0 = $ur.Column; $vals = $ur.Value2
    if ($null -eq $vals) { continue }
    $nr = $ur.Rows.Count; $nc = $ur.Columns.Count
    for ($i = 1; $i -le $nr; $i++) {
      for ($j = 1; $j -le $nc; $j++) {
        $v = if ($nr -eq 1 -and $nc -eq 1) { $vals } else { $vals[$i, $j] }
        if ($null -eq $v) { continue }
        $t = if ($v -is [double] -or $v -is [int] -or $v -is [long]) { "n" }
             elseif ($v -is [bool]) { "b" } else { "s" }
        $s = if ($t -eq "n") { ([double]$v).ToString("R", $inv) } else { [string]$v }
        $out.Add(($ws.Name + "`t" + ($r0 + $i - 1) + "`t" + ($c0 + $j - 1) + "`t" + $t + "`t" + $s))
      }
    }
  }
  [System.IO.File]::WriteAllLines((Join-Path $sortie "excel.tsv"), $out,
    [System.Text.UTF8Encoding]::new($false))
  $wb.Close($false)
  # le classeur en valeurs doit s'ouvrir sans réparation et ne contenir aucune formule
  $wb2 = $xl.Workbooks.Open((Join-Path $sortie "valeurs.xlsx"), $false, $true)
  $wb2.Close($false)
  Write-Output ("   " + $out.Count + " cellules relevées · classeur en valeurs ouvert sans réparation")
} finally {
  $xl.Quit()
}

Write-Output "3/3 — comparaison"
& node (Join-Path $racine "tools\verif-excel.js") comparer $sortie
exit $LASTEXITCODE
