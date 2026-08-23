param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = 'Stop'
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$sql = Get-Content -Raw -LiteralPath $resolvedPath
$errors = [System.Collections.Generic.List[string]]::new()

if ($sql -notmatch '(?is)^\s*begin\s*;') { $errors.Add('SQL must start with BEGIN;') }
if ($sql -notmatch '(?is)commit\s*;\s*$') { $errors.Add('SQL must end with COMMIT;') }
if ($sql -notmatch '(?is)insert\s+into\s+public\.books\s*\(') { $errors.Add('SQL must insert into public.books with explicit columns.') }
if ($sql -notmatch '(?is)\bis_active\b') { $errors.Add('SQL must explicitly include is_active.') }
if ($sql -notmatch '(?is)\bfalse\b') { $errors.Add('Intake rows must set is_active to false.') }
if ($sql -notmatch '(?is)select\s+.+from\s+public\.books') { $errors.Add('SQL must include a verification SELECT.') }

$forbidden = @(
    '(?is)\bdelete\s+from\b',
    '(?is)\bdrop\s+(table|schema|database)\b',
    '(?is)\btruncate\b',
    '(?is)\balter\s+table\b',
    '(?is)\bupdate\s+public\.books\b',
    '(?is)\binsert\s+into\s+public\.book_prices\b',
    '(?is)\bis_active\s*=\s*true\b'
)

foreach ($pattern in $forbidden) {
    if ($sql -match $pattern) { $errors.Add("Forbidden SQL matched: $pattern") }
}

if ($errors.Count -gt 0) {
    foreach ($message in $errors) { Write-Error $message }
    exit 1
}

Write-Output "Validated intake SQL: $resolvedPath"
