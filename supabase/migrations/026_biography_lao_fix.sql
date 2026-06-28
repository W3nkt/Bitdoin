-- ============================================================
-- Migration 026: Fix broken Lao content_lo for biographies 8-15
-- Previous migration had spacing corruption in Lao characters
-- ============================================================

-- ── 8. Oprah Winfrey ──────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Oprah Winfrey ຈາກ Mississippi ທຸກຍາກ ກາຍເປັນຜູ້ຍ່ງທໍາລ້ານຜິວດໍາທໍາອິດ — ດ້ວຍ talk show, ໜັງສື club ແລະ ກໍາລັງຂອງ "ຄໍາເວົ້າ" ທີ່ປ່ຽນຊີວິດຄົນນັບລ້ານ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Oprah Winfrey ເກີດໃນ 1954 ໃນ Mississippi ທ່າມກາງຄວາມທຸກຍາກ. ໃນໄວເຍົາ ລາວໄດ້ຮັບຄວາມຫຍຸ້ງຍາກຫຼາຍ. ລາວຟື້ນດ້ວຍໜັງສື. ລາວໄດ້ທຶນໄປ Tennessee State University ແລ້ວຄົ້ນຫາຕົວເອງໃນ media.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1973**: ເປັນຜູ້ຍ່ງ TV ທໍາອິດ ທີ Nashville ອາຍຸ 19 ປີ
- **1984**: ຮັບ AM Chicago talk show — ຂຶ້ນ #1 ໃນ 1 ເດືອນ
- **1985**: ສ້າງ Harpo Productions — ບໍລິສັດຂອງຕົນເອງ
- **1986**: Oprah Winfrey Show ອອກ national
- **1994**: Oprah Book Club ທໍາໃຫ້ໜັງສືສ່ຽວ overnight
- **2003**: ເປັນ billionaire ຜິວດໍາທໍາອິດຂອງ USA
- **2011**: ເປີດ OWN — Oprah Winfrey Network

## ຫຼັກການສຳຄັນ

**ຄວາມຈິງໃຈ**: Oprah ເວົ້ານ້ຳຕາ, ຮ່ວງ, ຟື້ນໃນໜ້າ camera — ຄົນເຊື່ອລາວເພາະລາວ "ຈິງ".

**ຕອບຄຳຖາມທີ່ສຳຄັນ**: ລາວຊ່ວຍຜູ້ຊົມຄົ້ນຫາ "ຄວາມຈິງ" ໃນຊີວິດຂອງຕົນ — ສ້າງການເຊື່ອມໂຍງທີ່ເລິກ.

**ໃຫ້ຄືນສູ່ສັງຄົມ**: Oprah ໃຫ້ທຶນການສຶກສາ, ສ້າງໂຮງຮຽນໃນ Africa ແລະໃຊ້ platform ຊ່ວຍຄົນ.

## ມໍລະດົກ

Oprah Winfrey Show ແລ່ນ 25 ປີ. ລາວຊ່ວຍໃຫ້ຜູ້ຂຽນໜັງສືຫຼາຍຄົນກາຍເປັນ bestseller ໃນທັນທີ. ລາວຮ້ອນ #1 ໃນ Forbes "100 Most Powerful Women" ຫຼາຍຄັ້ງ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຈົ່ງປ່ຽນບາດແຜຂອງທ່ານໃຫ້ກາຍເປັນສະຕິປັນຍາ."$$
WHERE title_en = 'Oprah Winfrey: From Poverty to Global Influence' AND type = 'biography';

-- ── 9. Richard Branson ────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Richard Branson ອອກຈາກໂຮງຮຽນດ້ວຍ dyslexia ໃນໄວ 16 ປີ — ຕັ້ງ Virgin Group ທີ່ມີ 400+ ບໍລິສັດ ຈາກສາຍການບິນຫາອາວະກາດ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Richard Branson ເກີດໃນ London ປີ 1950. ລາວຮຽນຫຍຸ້ງຍາກດ້ວຍ dyslexia ຈົນຄູບໍ່ຮູ້ຈະຈັດວາງລາວຢ່າງໃດ. ອາຍຸ 15 ລາວອອກໂຮງຮຽນແລ້ວຕັ້ງວາລະສານ "Student". ກ່ອນ 20 ລາວຮູ້ວ່າລາວເກ່ງ "ໃນທຸລະກິດ ບໍ່ແມ່ນໃນຫ້ອງຮຽນ".

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1970**: ຕັ້ງ Virgin ຂາຍໂປ້ດທາງໄປສະນີ
- **1971**: ເປີດຮ້ານ Virgin Records Oxford Street
- **1984**: ຕັ້ງ Virgin Atlantic Airways
- **1992**: ຂາຍ Virgin Records ໃຫ້ EMI $1 ຕື້
- **2004**: ຕັ້ງ Virgin Galactic ເພື່ອ space tourism
- **2021**: ບິນໄປຊາຍແດນອາວະກາດດ້ວຍ VSS Unity

## ຫຼັກການສຳຄັນ

**ກ້ອງທົດລອງ**: Branson ທົດລອງທຸລະກິດໃໝ່ດ້ວຍຄວາມກ້ອງ — ຈາກດົນຕີ, ການບິນ ຮອດອາວະກາດ.

**ຄົນທໍາອິດ**: ລາວເຊື່ອວ່າພາກສ່ວນທໍາອິດ ແມ່ນພາກສ່ວນສຳຄັນທີ່ສຸດ — ດ້ວຍຄົນທີ່ມີຄວາມສຸກຈະດູແລລູກຄ້າດີ.

**Brand ຄືທຸກຢ່າງ**: Virgin ເຂົ້າທຸກຕະຫຼາດດ້ວຍ culture "fun + quality" ທີ່ຊ່ວຍໃຫ້ຄົນໄວ້ໃຈ.

## ມໍລະດົກ

Virgin Group ດໍາເນີນທຸລະກິດໃນ 35+ ປະເທດ. Branson ສ້ອງທ່ຽວ culture ວ່າ "ຄົນທີ່ຮ່ວງເຮັດວຽກດີກວ່ຄົນທີ່ບໍ່ຮ່ວງ" — ໃນຫ້ອງທໍາງານ ແລະ ໃນຊີວິດ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ໂອກາດທາງທຸລະກິດຄ້າຍກັນກັບລົດເມ — ສະເໝີມີຄັນໃໝ່ຕໍ່ໄປ."$$
WHERE title_en = 'Richard Branson: The Adventurer Who Built an Empire' AND type = 'biography';

-- ── 10. Larry Page ────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Larry Page ພັດທະນາ PageRank ໃນ Stanford ແລ້ວຮ່ວມກໍ່ຕັ້ງ Google ທີ່ກາຍເປັນ search engine ໃຫຍ່ທີ່ສຸດ — ຕໍ່ມາສ້າງ Alphabet ທີ່ຄ້ຳ AI, self-driving car ແລະ internet ຂອງໂລກ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Larry Page ເກີດໃນ East Lansing, Michigan ປີ 1973. ພໍ່ແມ່ທັງສອງເຮັດວຽກດ້ານ computer science. ອາຍຸ 6 ລາວໃຊ້ຄອມທໍາອິດ. ລາວຮຽນ Comp Science ທີ Michigan ແລ້ວໄປ PhD Stanford ທີ່ລາວໄດ້ພົບ Sergey Brin.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1995**: ພົບ Brin; ເລີ່ມທົດລອງລະບົບ ranking web
- **1996**: ພັດທະນາ PageRank — ສູດຄິດໄລ່ຄວາມສຳຄັນຂອງ webpage
- **1998**: ຕັ້ງ Google ຈາກ garage ໃນ Menlo Park
- **2004**: Google IPO; ມູນຄ່າ $23 ຕື້
- **2006**: ຊື້ YouTube $1.65 ຕື້
- **2011**: ກັບຄືນເປັນ CEO
- **2015**: ຕັ້ງ Alphabet holding company

## ຫຼັກການສຳຄັນ

**10X ບໍ່ແມ່ນ 10%**: Page ຕ້ອງການ improvement 10 ເທົ່າ — ບໍ່ແມ່ນ incremental. ນີ້ຄື DNA ຂອງ Google.

**Moonshot thinking**: Alphabet ອະນຸຍາດໂຄງການ "moonshot" ເຊັ່ນ Waymo, DeepMind, Calico ໂດຍບໍ່ໃຫ້ business ຕົ້ນຕໍກີດຂວາງ.

**ຮຽນຮູ້ຢ່າງລວດໄວ**: Google ທົດລອງຜ່ານ "small bets" ຫຼາຍໆ ອັນ ແລ້ວ scale ຢ່າງໄວທີ່ໄດ້ຜົນ.

## ມໍລະດົກ

Google search ປະມວນຜົນ 8.5 ຕື້ searches/ວັນ. DeepMind ສ້າງ AlphaFold ທີ່ແກ້ protein folding — "ຄ້ນຫາຫຼາຍທີ່ສຸດໃນ biology ໃນ 50 ປີ". Waymo ນໍາ self-driving cars ສູ່ຖະໜົນ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ສະເໝີທໍາງານໜັກໃນສິ່ງທີ່ໜ້າຕື່ນເຕ້ນ ເຖິງວ່ານຶ່ງຄາດ."$$
WHERE title_en = 'Larry Page: The Architect of the Information Age' AND type = 'biography';

-- ── 11. Sam Walton ────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Sam Walton ເປີດ Walmart ດ້ວຍວິໄສທັດດຽວ: ຂາຍສິ່ງທີ່ດີທີ່ສຸດໃນລາຄາຕໍ່ໍທີ່ສຸດ. ລາວກາຍເປັນຄົນຮັ່ງທີ່ສຸດໃນໂລກໂດຍຂາຍສິນຄ້າລາຄາຖືກ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Sam Walton ເກີດໃນ Oklahoma ປີ 1918 ທ່າມກາງ Great Depression. ລາວຮຽນຈົບ University of Missouri ແລ້ວໄດ້ເງິນກູ້ $20,000 ຈາກພໍ່ຕຽວ ເພື່ອຊື້ franchise ຮ້ານ Ben Franklin. ລາວທໍາໃຫ້ຮ້ານຂາຍດີທີ່ສຸດໃນ Arkansas ໃນໄລຍະເວລາໜ້ອຍ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1945**: ເປີດ Ben Franklin franchise ທໍາອິດ
- **1962**: ເປີດ Walmart ທໍາອິດ ທີ Rogers, Arkansas
- **1970**: ຂຶ້ນໄປ 32 ຮ້ານ; ລົງທຶນສາທາລະນະ IPO
- **1983**: ຕັ້ງ Sam's Club — wholesale membership
- **1985**: Forbes ໃຫ້ລາວ "ຄົນຮັ່ງທີ່ສຸດໃນ USA"
- **1992**: ລາວເສຍຊີວິດ; Walmart ມີ 1,900+ ຮ້ານ

## ຫຼັກການສຳຄັນ

**ລາຄາຕໍ່ໍທຸກວັນ (EDLP)**: ບໍ່ໃຊ້ sale/promotion ເລ້ຍ — ຮັກສາລາຄາຖືກຕະຫຼອດ. ນີ້ສ້າງຄວາມໄວ້ໃຈ.

**ຢູ່ກັບພາກສ່ວນພາກພື້ນ**: Walton ເດີນທາງໄປຮ້ານທຸກໆ ດ່ວນ ຮູ້ຈັກຊື່ພາກສ່ວນ ທຸກຄົນ.

**ຊອກ idea ຈາກທຸກທາງ**: ລາວເດີນທາງໄປຮ້ານຄູ່ແຂ່ງທຸກທີ່ທີ່ລາວໄປ ເພື່ອຮຽນຮູ້.

## ມໍລະດົກ

Walmart ມີ 10,000+ ຮ້ານ ໃນ 19 ປະເທດ ຍັງຄົງເປັນ retailer ທີ່ໃຫຍ່ທີ່ສຸດໃນໂລກ ດ້ວຍລາຍໄດ້ $650 ຕື້+/ປີ. ມໍລະດົກຂອງ Walton ສ້ອງທ່ຽວ modern retail ທັງໂລກ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຄວາມຄາດຫວັງທີ່ສູງ ແມ່ນກຸນແຈຂອງທຸກສິ່ງ."$$
WHERE title_en = 'Sam Walton: The Man Who Made Shopping Affordable for Everyone' AND type = 'biography';

-- ── 12. Howard Schultz ────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Howard Schultz ຈາກ Brooklyn housing project ຊື້ Starbucks $3.8 ລ້ານ ແລ້ວສ້າງ "ສະຖານທີ່ທີ່ສາມ" ລະຫວ່າງບ້ານແລະທີ່ເຮັດວຽກ ດ້ວຍກາເຟ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Howard Schultz ເກີດໃນ Brooklyn public housing ປີ 1953. ພໍ່ລາວເຈັບໃນທີ່ເຮັດວຽກ — ບໍ່ມີ insurance, ບໍ່ມີ sick pay. ນີ້ທໍາໃຫ້ Schultz ໃຝ່ຝັນວ່າຈະສ້າງບໍລິສັດທີ່ "ດູແລພາກສ່ວນ" ຈິງໆ. ລາວໄດ້ທຶນ football ໄປ Northern Michigan University.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1982**: ເຂົ້າ Starbucks (4 ສາຂາ) ເປັນ director marketing
- **1983**: ໄປ Milan ພົບ espresso bar culture — vision ຊັດຂຶ້ນ
- **1987**: ຊື້ Starbucks ຈາກຜູ້ກໍ່ຕັ້ງ $3.8 ລ້ານ
- **1992**: Starbucks IPO; 140 ສາຂາ
- **2008**: ກັບຄືນ CEO ໃນໄລຍະເສດຖະກິດຖົດຖອຍ; ຝຶກ barista ໃໝ່ທຸກຄົນ
- **2023**: Starbucks ມີ 36,000+ ສາຂາ ໃນ 80+ ປະເທດ

## ຫຼັກການສຳຄັນ

**ປະສົບການຄືສິນຄ້າ**: Starbucks ບໍ່ໄດ້ຂາຍກາເຟ — ລາວຂາຍປະສົບການທີ່ໄດ້ໃນຮ້ານ.

**ພາກສ່ວນທໍາອິດ**: Starbucks ໃຫ້ health insurance ກັບ part-time ພາກສ່ວນ — ລາວເຊື່ອວ່າຖ້າດູແລພາກສ່ວນດີ, ພາກສ່ວນຈະດູແລລູກຄ້າດີ.

**ກ້ອງຮັບຄໍາວິຈານ**: ໃນ 2008 ລາວກັບຄືນ CEO ແລ້ວປ່ຽນ Starbucks ໂດຍການລົງທຶນໃນ quality ຫຼາຍກວ່າ.

## ມໍລະດົກ

Starbucks ສ້ອງທ່ຽວ "ritual ກາເຟ" ໃຫ້ກາຍເປັນຂອງທຳມະດາທົ່ວໂລກ. Schultz ພິສູດວ່າ culture ທີ່ດີສ້າງ brand ທີ່ຍາວ — ດ້ວຍ 36,000+ ສາຂາ ຍັງຂຶ້ນຕໍ່ໄປ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ໃນຊີວິດ, ທ່ານສາມາດໂທດຫຼາຍຄົນ ຫຼືທ່ານສາມາດລຸກຂຶ້ນແລະຮັບຜິດຊອບຕໍ່ຕົວເອງ."$$
WHERE title_en = 'Howard Schultz: Turning Coffee Into a Cultural Experience' AND type = 'biography';

-- ── 13. Ray Dalio ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Ray Dalio ຕັ້ງ Bridgewater Associates ຈາກຫ້ອງ New York ກາຍເປັນ hedge fund ທີ່ໃຫຍ່ທີ່ສຸດໃນໂລກ — ໂດຍສ້າງ "radical transparency" ທີ່ສ່ຽວການສົດສາຍດ້ວຍ data.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Ray Dalio ເກີດໃນ Queens, New York ປີ 1949. ພໍ່ເປັນ jazz musician. ອາຍຸ 12 Dalio caddy ໂດຍນໍາ bag golf ໃຫ້ Wall Street legends. ລາວຊື້ຫຸ້ນທໍາອິດ $6 ໄດ້ $18. ຮຽນຈົບ Harvard MBA ແລ້ວຕັ້ງ Bridgewater ຈາກຫ້ອງ ປີ 1975.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1975**: ຕັ້ງ Bridgewater Associates ຈາກຫ້ອງ New York
- **1982**: ທໍານາຍຜິດ — ໃກ້ລົ້ມ, ຕ້ອງຂາຍ furniture — ຮຽນຮູ້ໄດ້ຫຼາຍທີ່ສຸດ
- **1991**: ພັດທະນາ "All Weather" portfolio ທີ່ຕໍ່ສູ້ທຸກສະພາບຕະຫຼາດ
- **2008**: Bridgewater return +9.5% ໃນ crisis ທີ່ທຸກຄົນຂາດທຶນ
- **2010**: Bridgewater: hedge fund ໃຫຍ່ທີ່ສຸດ $80 ຕື້
- **2017**: ຕີພິມ "Principles" — bestseller ທົ່ວໂລກ

## ຫຼັກການສຳຄັນ

**Radical Transparency**: ທຸກການປະຊຸມ record, ທຸກຄໍາວິຈານ open. ຄວາມຈິງກ່ອນຄວາມສະບາຍ.

**Pain + Reflection = Progress**: ທຸກຄວາມລົ້ມເຫຼວມີ "ຫຼັກສູດ" ຖ້າທ່ານຢຸດຮຽນຈາກມັນ.

**Believability-weighted**: ຟັງຄົນທີ່ "credible" ໃນຫົວຂໍ້ນັ້ນ — ບໍ່ແມ່ນ majority ທຸກຄົນ.

## ມໍລະດົກ

Bridgewater Pure Alpha ຕ່ວຮວຍ $65 ຕື້ ໃຫ້ນັກລົງທຶນໃນ 40 ປີ — ດີກວ່າທຸກ hedge fund ໃດໃນປະຫວັດສາດ. "Principles" ກາຍເປັນ management handbook ທີ່ຖືກນໍາໃຊ້ຢ່າງກວ້າງທີ່ສຸດ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຄວາມເຈັບປວດ + ການສະທ້ອນ = ຄວາມກ້າວໜ້າ."$$
WHERE title_en = 'Ray Dalio: Principles for an Extraordinary Life' AND type = 'biography';

-- ── 14. Reed Hastings ─────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Reed Hastings ສ້າງ Netflix ຈາກ DVD ທາງໄປສະນີ ສູ່ streaming ທີ່ປ່ຽນວິທີໂລກດູໜັງ — ດ້ວຍຄໍ ໃຫ້ລູກຄ້າດູຄໍລວດດຽວ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Reed Hastings ເກີດໃນ Boston ປີ 1960. ຮຽນ mathematics ທີ Bowdoin, ແລ້ວເຂົ້າ Peace Corps ສອນຄະນິດທີ Swaziland 2 ປີ. ກັບມາຮຽນ Stanford CS. ຕັ້ງ Pure Atria software ຂາຍໄດ້ $700 ລ້ານ. ໃນ 1997 ລາວໄດ້ fine $40 ຈາກ Blockbuster ສຳລັບ DVD ຊ້ານ — ນີ້ທໍາໃຫ້ລາວສ້າງ Netflix.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1997**: ຕັ້ງ Netflix — DVD-by-mail ບໍ່ມີ late fee
- **2000**: ສະເໜີຂາຍ Netflix $50 ລ້ານ ໃຫ້ Blockbuster — ຖືກປະຕິເສດ
- **2007**: ເປີດ streaming — ການເດີມພັນທີ່ກໍານົດ Netflix
- **2010**: Blockbuster ລົ້ມລະລາຍ; Netflix streaming ຂຶ້ນ
- **2013**: House of Cards — original content ທໍາອິດ; ສ້າງ binge-watching
- **2022**: Netflix ມີ 220M+ subscribers 190 ປະເທດ
- **2023**: ອອກ CEO

## ຫຼັກການສຳຄັນ

**Freedom and Responsibility**: ໃຫ້ພາກສ່ວນ freedom ສູງສຸດ ແຕ່ຮຽກຮ້ອງ results ສູງສຸດ. ບໍ່ຄຸ້ມຄອງດ້ວຍ rules — ຄຸ້ມຄອງດ້ວຍ judgment.

**ທໍາລາຍຕົວເອງກ່ອນ**: Netflix ກ້ວນຈາກ DVD ສູ່ streaming ກ່ອນຄູ່ແຂ່ງທໍາ — ເຖິງວ່ານັ້ນຈະທໍາລາຍ revenue DVD ເກົ່າ.

**ຈ່າຍສໍາລັບ talent**: "10 mediocre ຄົນ ຮາກກວ່າ 1 brilliant ຄົນ."

## ມໍລະດົກ

Netflix ປ່ຽນ entertainment ໂດຍທໍານໍາ "binge-watching", original content ໂດຍ algorithm ແລະໃຫ້ອໍານາດຜູ້ຊົມ. ສ່ວນ Blockbuster ຊຶ່ງປະຕິເສດ Netflix ໃນ 2000 ລົ້ມລະລາຍໃນ 2010.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຮັກສາວັດທະນະທໍາການສ້າງສັນ ຫຼືຄົນອື່ນຈະທໍາລາຍທ່ານ ດຽວກັນກັບທີ່ທ່ານທໍາລາຍຄົນອື່ນ."$$
WHERE title_en = 'Reed Hastings: Disrupting Entertainment with Netflix' AND type = 'biography';

-- ── 15. Indra Nooyi ───────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Indra Nooyi ຈາກ Chennai ດ້ວຍ $50 ໃນກະເປ໋ົາ ກາຍເປັນ CEO ຂອງ PepsiCo — ຜູ້ຍິງຊາດອິນເດຍທໍາອິດທີ່ນໍາ Fortune 50 — ສ້າງລາຍໄດ້ຈາກ $35B ສູ່ $63B.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Indra Nooyi ເກີດໃນ Chennai ປີ 1955 ໃນຄອບຄົວ conservative. ນາງຮຽນດີຫຼາຍແຕ່ຖືກຄາດຫວັງວ່ານາງຈະແຕ່ງງານກ່ອນ. ນາງຮຽນ MBA ທີ IIM Calcutta ແລ້ວໄດ້ໄປ Yale ດ້ວຍ $50 ໃນກະເປ໋ົາ. ນາງເຮັດວຽກ overnight ທີ reception desk ຂອງ Yale ເພື່ອຊໍາລະຄ່າຮຽນ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1980**: ຈົບ Yale; ເຂົ້າ BCG strategy consulting
- **1994**: ເຂົ້າ PepsiCo ເປັນ SVP Corporate Strategy
- **1997**: ນໍາໂຄງການ spinoff Yum Brands (KFC, Pizza Hut, Taco Bell)
- **2000**: ໄດ້ CFO PepsiCo
- **2006**: ໄດ້ CEO — ຜູ້ຍິງ Indo-American ທໍາອິດ Fortune 50
- **2010**: PepsiCo ຊື້ Pepsi Bottlers $7.8 ຕື້ — vertical integration
- **2018**: ອອກ CEO ຫຼັງ 12 ປີ; ລາຍໄດ້ $35B → $63B

## ຫຼັກການສຳຄັນ

**Performance with Purpose**: Nooyi ນໍາ PepsiCo ໃນທິດທາງ "ສຸຂະພາບດີກວ່າ" — ເພີ່ມສິນຄ້າທີ່ດີຕໍ່ສຸຂະພາບ ໃນຂະນະທີ່ຮັກສາລາຍໄດ້.

**Assume Positive Intent**: ນາງສອນທີມວ່າໃຫ້ສະເໝີຄິດໃນທາງດີຕໍ່ກັນ — ສ້າງ culture trust ໃນອົງກາ.

**ຂຽນຫາພໍ່ແມ່ຂອງພາກສ່ວນ**: Nooyi ຂຽນຈົດໝາຍສ່ວນຕົວຫາພໍ່ແມ່ຂອງຜູ້ບໍລິຫານລະດັບສູງ ເພື່ອຂໍຂອບໃຈ — ສ້າງ loyalty ທີ່ເລິກ.

## ມໍລະດົກ

Nooyi ສ້ອງທ່ຽວຄວາມຈິງທີ່ວ່າຄົນທີ່ອອກຈາກປະເທດດ້ວຍບໍ່ມີຫຍັງ ສາມາດໄດ້ role CEO ຂອງ Fortune 50. ລາວສ້ອງທ່ຽວໃຫ້ຜູ້ຍິງ, immigrant ແລະຄົນ minority ໃນທຸກໂລກ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ໃດທີ່ຄົນອື່ນເວົ້າ ຫຼື ເຮັດ, ໃຫ້ຄິດວ່ານໍາໃຈດີ."$$
WHERE title_en = 'Indra Nooyi: Leading PepsiCo with Purpose' AND type = 'biography';
