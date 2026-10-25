Schooling school catalogue
=========================

`moes-secondary-schools-2025-2026.json` retains the selected records and provenance
from the official MoES EMIS report (period 19, school year 2025–2026), retrieved
25 October 2026. The report defaults to one district; the importer posts empty
province/district filters to obtain the nationwide list of 12,474 records.

Only type **7** (upper secondary, 29 schools) and **8** (complete secondary,
751 schools) are included. Both serve the Grades 10–12 supported by Schooling.
Type 6 (lower secondary only), primary schools and preschools are excluded.
All 780 records map to existing province and district options in the app.
Meun uses MoES code `1013`, mapped explicitly to the app's `10-11`.
School and village code prefixes are not used to infer a district.

Coordinates come from the official LESMIS map entity API, joined by exact MoES
school ID and checked against the report's district ID and secondary school type.
The API's `point` is `[latitude, longitude]`. We retain WGS84 decimal degrees to
six decimal places, with 774 pairs and six missing pairs left null. Coordinates
are not geocoded from names or substituted with village/district centres.
The source URLs and SHA-256 hashes are recorded in the snapshot. Coordinate
provenance is also stored alongside each located school in the database.

Official Lao names are kept. No English names, romanisations or public/private
ownership classifications are inferred from the report's educational types.

Regenerate the snapshot and migration from the live sources with:

```powershell
node scripts/import-academic-schools.mjs
```

To reproduce the captured import without additional source requests:

```powershell
node scripts/import-academic-schools.mjs path/to/report.html path/to/lesmis-entities.json
```

Apply migrations 126 and 127 with the normal Supabase migration workflow. The
school insert uses stable UUIDs derived from the official school ID and never
overwrites admin edits, merged records or archives. Future source updates should
use a new reviewed migration rather than rewriting an applied migration.
