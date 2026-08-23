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
if ($sql -notmatch '(?is)update\s+public\.books\s+set\s+') { $errors.Add('SQL must update public.books.') }
if ($sql -notmatch '(?is)cover_image_url\s*=\s*''https://[^'']+''') { $errors.Add('Repair must set an HTTPS cover URL.') }
if ($sql -notmatch '(?is)description\s*=\s*\$[a-z_]*\$.+\$[a-z_]*\$') { $errors.Add('Repair must set a dollar-quoted description.') }
if ($sql -notmatch '(?is)where\s+isbn\s*=\s*''\d{13}''') { $errors.Add('Repair must target one ISBN-13.') }
if ($sql -notmatch '(?is)select\s+.+cover_image_url.+description.+from\s+public\.books') { $errors.Add('SQL must verify cover and description.') }

$forbidden = @(
    '(?is)\bdelete\s+from\b',
    '(?is)\bdrop\s+(table|schema|database)\b',
    '(?is)\btruncate\b',
    '(?is)\balter\s+table\b',
    '(?is)\binsert\s+into\b',
    '(?is)\bis_active\s*=',
    '(?is)\b(bookstore_price|final_price|category_id|title|author|publisher|language|pages|publication_date)\s*='
)

foreach ($pattern in $forbidden) {
    if ($sql -match $pattern) { $errors.Add("Forbidden SQL matched: $pattern") }
}

if ($errors.Count -gt 0) {
    foreach ($message in $errors) { Write-Error $message }
    exit 1
}

Write-Output "Validated book repair SQL: $resolvedPath"
