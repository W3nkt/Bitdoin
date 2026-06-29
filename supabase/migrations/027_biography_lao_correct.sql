-- ============================================================
-- Migration 027: Correct Lao translations for all 15 biographies
-- Fixes migration 025 which had wrong title_en values in WHERE clauses.
-- Uses tags[1] = 'slug' so results are slug-based, not title-based.
-- Uses clean content from 025 (bios 1-7) and 026 (bios 8-15).
-- ============================================================

-- ── 1. Elon Musk ──────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$ອີລອນ ມັສ ແມ່ນຜູ້ກໍ່ຕັ້ງ Tesla, SpaceX ແລະ X — ຊາຍຜູ້ທ້າທາຍກົດລະບຽບ ແລະ ຝັນໃຫຍ່ຂ້ຳຄົນ. ຈາກ Pretoria ສູ່ວົງໂຄຈອນ, ຊີວິດຂອງລາວສິດສອນວ່າ: ຄວາມລົ້ມເຫຼວຄືບາດກ້າວ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

ອີລອນ ມັສ ເກີດໃນປີ 1971 ຢູ່ Pretoria, ອາຟຣິກາໃຕ້. ໃນໄວເດັກ, ລາວຖືກຄ້ຳໄລ່ ແລະ ຮູ້ສຶກໂດດດ່ຽວ. ກ່ອນອາຍຸ 10 ປີ, ລາວຫຼົງໃຫຼໃນໜັງສືວິທະຍາສາດ ແລະ ຄອມພິວເຕີ. ອາຍຸ 12 ປີ, ລາວຂຽນເກມ "Blastar" ດ້ວຍຕົວເອງ ແລະ ຂາຍໄດ້ $500.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1995**: ຕັ້ງ Zip2 — ຂາຍໃຫ້ Compaq ໄດ້ $307 ລ້ານ
- **1999**: ຕັ້ງ X.com ທີ່ຕໍ່ມາກາຍເປັນ PayPal — ຂາຍໃຫ້ eBay $1.5 ຕື້
- **2002**: ຕັ້ງ SpaceX ດ້ວຍເງິນ $100 ລ້ານ ເພື່ອໄປດາວ Mars
- **2004**: ນຳການລົງທຶນໃນ Tesla Motors
- **2008**: ທັງ Tesla ແລະ SpaceX ໃກ້ລົ້ມ — ແຕ່ລາວສູ້ຕໍ່ ທັງສອງລອດ
- **2012**: Tesla Model S ກາຍເປັນລົດໄຟຟ້າທີ່ດີທີ່ສຸດໃນໂລກ
- **2015**: SpaceX ລ້ອງຈວດ Falcon 9 ສຳເລັດ ແລະ ລົງຈອດໄດ້
- **2022**: ຊື້ Twitter ໃນລາຄາ $44 ຕື້ ປ່ຽນຊື່ X

## ຫຼັກການສຳຄັນ

**ຄິດໃຫຍ່ – ລົງມືທໍາ**: ມັສ ບໍ່ໄດ້ຕາມຕະຫຼາດ — ລາວສ້າງຕະຫຼາດໃໝ່. ລາວເລີ່ມຈາກ "ອາດຈະເປັນໄປໄດ້" ບໍ່ແມ່ນ "ອາດຈະລ້ຳ".

**ຮຽນຮູ້ຈາກຄວາມລົ້ມເຫຼວ**: SpaceX ລົ້ມ 3 ຄັ້ງ ກ່ອນສຳເລັດ. ທຸກຄັ້ງທີ່ລົ້ມ ລາວວິເຄາະ ແລະ ທົດລອງໃໝ່.

**ຮ່ວມຫມົດ**: ລາວລົງທຶນຊັບສົມບັດສ່ວນຕົວທັງໝົດ ໃນໂຄງການຕ່າງໆ — ບໍ່ແມ່ນຄົນອື່ນ.

## ມໍລະດົກ

ອີລອນ ມັສ ພິສູດໃຫ້ໂລກເຫັນວ່າ ມະນຸດຄົນດຽວ ສາມາດປ່ຽນທິດທາງຂອງ ອຸດສາຫະກຳໄຟຟ້າ, ອາວະກາດ ແລະ ອິນເຕີເນັດ ໃນເວລາດຽວກັນ. ລາວເປັນສັນຍາລັກຂອງຄົນທີ່ "ໝາກ" ຫຼາຍກວ່ານິຍາມຂອງ "ຄວາມເປັນໄປໄດ້".

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ເມື່ອສິ່ງໃດສຳຄັນພຽງພໍ, ທ່ານຈະເຮັດມັນ ເຖິງແມ່ນໂອກາດຈະບໍ່ຢູ່ຂ້າງທ່ານ."$$
WHERE tags[1] = 'elon-musk' AND type = 'biography';

-- ── 2. Steve Jobs ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Steve Jobs ຮ່ວມກໍ່ຕັ້ງ Apple ໃນໂຮງຈອດລົດ ແລະ ປ່ຽນວິທີທີ່ໂລກໃຊ້ຄອມ, ດົນຕີ ແລະ ໂທລະສັບ. ຄຳສອນສຸດທ້າຍຂອງລາວ: "ຈົ່ງຍັງຫິວ. ຈົ່ງຍັງໂງ່."$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Steve Jobs ເກີດໃນປີ 1955 ຢູ່ San Francisco ແລະ ຖືກໃຫ້ຮັບລ້ຽງ. ເຂົາອອກຈາກ Reed College ຫຼັງ 1 ພາກຮຽນ ເພາະບໍ່ຢາກໃຫ້ພໍ່ແມ່ໃຊ້ເງິນ — ແຕ່ຍັງຕາມຮຽນ calligraphy ທີ່ຊ່ວຍຮູບຮ່າງ font ຄອມ Macintosh ໃນໄວຕໍ່ມາ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1976**: ຮ່ວມຕັ້ງ Apple ໃນໂຮງຈອດລົດ ກັບ Steve Wozniak
- **1984**: ເປີດ Macintosh — ຄອມ GUI ທໍາອິດສຳລັບ mass market
- **1985**: ຖືກໄລ່ອອກຈາກ Apple ໂດຍ board ຂອງຕົນເອງ
- **1986**: ຊື້ Pixar $5 ລ້ານ — ຕໍ່ມາຂາຍ Disney ໄດ້ $7.4 ຕື້
- **1997**: ກັບຄືນ Apple; ຊ່ວຍໃຫ້ Apple ບໍ່ລົ້ມ
- **2001**: ເປີດ iPod ແລະ iTunes — ປ່ຽນອຸດສາຫະກຳດົນຕີ
- **2007**: ເປີດ iPhone — ປ່ຽນໂລກໂທລະສັບ
- **2010**: ເປີດ iPad — ປ່ຽນຮູບແບບ tablet

## ຫຼັກການສຳຄັນ

**ການອອກແບບ ≠ ລວດລາຍ**: Jobs ເຊື່ອວ່າການອອກແບບດີຄືປະສົບການຜູ້ໃຊ້ທີ່ດີ — ບໍ່ແມ່ນແຕ່ຮູບຮ່າງ.

**ຈຸດສຳລາຍ ≠ ຈຸດສິ້ນສຸດ**: ການຖືກໄລ່ຈາກ Apple ສ້າງ Jobs ໃຫ້ດີກວ່າເກົ່າ ເຊິ່ງທໍາໃຫ້ Apple ດີຂຶ້ນ ເມື່ອລາວກັບ.

**ໝາຍ 1,000 ເພງ ໃນ Pocket**: ວິສັຍທັດທີ່ຊັດ ທໍາໃຫ້ຜົນໄດ້ຮັບທີ່ຊັດ.

## ມໍລະດົກ

Jobs ເສຍຊີວິດໃນປີ 2011 ດ້ວຍອາຍຸ 56 ປີ, ແຕ່ Apple ທີ່ລາວສ້າງ ກາຍເປັນບໍລິສັດທໍາອິດທີ່ມີມູນຄ່າ $3 ລ້ານລ້ານ. ທຸກ iPhone ທີ່ທ່ານໃຊ້ ຄືຕອນໜຶ່ງຂອງ DNA ຂອງ Jobs.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຈົ່ງຍັງຫິວ. ຈົ່ງຍັງໂງ່."$$
WHERE tags[1] = 'steve-jobs' AND type = 'biography';

-- ── 3. Bill Gates ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Bill Gates ສ້າງ Microsoft ຈາກຫ້ອງ ກາຍເປັນຄົນຮັ່ງທີ່ສຸດໃນໂລກ ແລ້ວໃຫ້ຄວາມຮັ່ງສ່ວນໃຫຍ່ ເພື່ອການກຸສົນ. ລາວສົມຜົນຊີວິດດ້ວຍ "ຊອຟແວ + ກຸສົນ".$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Bill Gates ເກີດໃນ Seattle ປີ 1955. ອາຍຸ 13 ປີ ລາວຊ້ຳຊ່ອງໃນຫ້ອງຄອມຂອງໂຮງຮຽນ ທຸກໂອກາດ. ລາວແລະ Paul Allen ທົດສອບ ແລະ ຂຽນໂຄດໃນຫ້ອງ ຈົນໂຮງຮຽນຕ້ອງຫ້າມ. ລາວເຂົ້າ Harvard ແຕ່ຕັດສິນໃຈອອກ ເພາະເຫັນໂອກາດທີ່ Microsoft.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1975**: ຕັ້ງ Microsoft ກັບ Paul Allen
- **1980**: ໃຫ້ IBM ໃຊ້ MS-DOS — ຂໍ້ຕົກລົງທີ່ປ່ຽນ PC ໃຫ້ເປັນ mass market
- **1986**: Microsoft IPO; Gates ເປັນ billionaire ອາຍຸ 31 ປີ
- **1995**: Windows 95 ກາຍເປັນ OS ທີ່ຄົນໃຊ້ຫຼາຍທີ່ສຸດໃນໂລກ
- **2000**: ຕັ້ງ Gates Foundation ກັບ Melinda
- **2020**: Gates Foundation ຊ່ວຍ $300 ລ້ານ ສູ້ COVID-19

## ຫຼັກການສຳຄັນ

**ຮຽນຮູ້ຕໍ່ເນື່ອງ**: Gates ອ່ານ 50 ໜັງສື/ປີ. ລາວເຊື່ອວ່າການຢຸດຮຽນ ຄືການຢຸດຂະຫຍາຍ.

**ຄຳນຶງເຖິງຜູ້ໃຊ້**: Microsoft ສ້າງ software ທີ່ "ຄົນທົ່ວໄປ" ໃຊ້ໄດ້ — ບໍ່ແມ່ນສະເພາະ geek.

**ຈ່າຍຄືນສູ່ສັງຄົມ**: ຫຼັງຈາກສ້າງຄວາມຮັ່ງ, ລາວຊ່ຽວຊານໃນການໃຊ້ຄວາມຮັ່ງ ເພື່ອສຸຂະພາບ ແລະ ການສຶກສາໃນໂລກທີ 3.

## ມໍລະດົກ

Microsoft ຍັງຄົງເປັນໜຶ່ງໃນ 5 ບໍລິສັດ tech ທີ່ໃຫຍ່ທີ່ສຸດ. Gates Foundation ຊ່ວຍຂ້ຳ Polio ໃນ Africa ແລະ ຊ່ວຍໂຄງການວັກຊີນໃນ 40+ ປະເທດ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ການສະຫຼອງຄວາມສຳເລັດນັ້ນດີ, ແຕ່ສຳຄັນກວ່ານັ້ນ ຄືການຮຽນຮູ້ຈາກຄວາມລົ້ມເຫຼວ."$$
WHERE tags[1] = 'bill-gates' AND type = 'biography';

-- ── 4. Jeff Bezos ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Jeff Bezos ອອກຈາກ Wall Street ເພື່ອຂາຍໜັງສືຈາກໂຮງຈອດລົດ — ກາຍເປັນ Amazon ທີ່ຂາຍທຸກສິ່ງ ແລະ ສ້າງ cloud ທີ່ຄ້ຳ internet ສ່ວນໃຫຍ່ຂອງໂລກ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Jeff Bezos ເກີດໃນ Albuquerque ປີ 1964. ພໍ່ຕຽວຂອງລາວຍ້າຍຄອບຄົວຈາກ Cuba ດ້ວຍ $250. ໃນໄວ teenager ລາວຝັນຢາກເປັນນັກ astronaut. ຮຽນຈົບ Princeton (CS ແລະ EE), ໄດ້ Senior VP ຢູ່ hedge fund — ແຕ່ຕັດສິນໃຈຂັບລົດຂ້າມ USA ເພື່ອຕັ້ງ Amazon ໃນ 1994.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1994**: ອອກ Wall Street; ຂາຍໜັງສືຈາກໂຮງຈອດລົດ Seattle
- **1997**: Amazon IPO; Bezos ຂຽນ letter ຕໍ່ shareholders ທຸກປີ
- **2005**: ເປີດ Amazon Prime — loyalty flywheel
- **2006**: ເປີດ AWS — cloud platform ທີ່ຕ່ອນຕໍ Netflix, Airbnb ແລະ 1M+ ບໍລິສັດ
- **2007**: ເປີດ Kindle — ປ່ຽນການອ່ານໜັງສື
- **2013**: ຊື້ Washington Post $250 ລ້ານ
- **2021**: ຂຶ້ນ Blue Origin ໄປຊາຍແດນອາວະກາດ

## ຫຼັກການສຳຄັນ

**Customer Obsession ທໍາອິດ**: Amazon ຮຽນຮູ້ທຸກຢ່າງຈາກ data ຂອງລູກຄ້າ — ບໍ່ຄາດເດົາ.

**ຄິດຍາວ**: Bezos ເວົ້າວ່າຄຳຕອບທີ່ດີຮຽກຮ້ອງ frame ທີ່ຍາວ. ລາວຕັດສິນໃຈໂດຍໃຊ້ "regret minimization framework".

**ທົດລອງທຸກສິ່ງ**: Amazon ລົ້ມ Fire Phone, ແຕ່ຮຽນຮູ້ ແລ້ວສ້າງ Echo/Alexa ທີ່ປ່ຽນ smart home.

## ມໍລະດົກ

Amazon ຈ້າງ 1.5+ ລ້ານຄົນ. AWS ຄ້ຳ internet ຂອງໂລກ. Blue Origin ສ້າງ infrastructure ອາວະກາດ commercial ສຳລັບ generation ຕໍ່ໄປ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຖ້າທ່ານບໍ່ຫ້ຽວແຂ່ງ, ທ່ານຈະໃຫ້ຄຶ້ທົດລອງໄວເກີນໄປ."$$
WHERE tags[1] = 'jeff-bezos' AND type = 'biography';

-- ── 5. Warren Buffett ─────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Warren Buffett ເລີ່ມຊື້ຫຸ້ນ ອາຍຸ 11 ປີ ແລະ ກາຍເປັນ "Oracle of Omaha" — ນັກລົງທຶນທີ່ໃຫ້ຜົນຕອບແທນ 20%+/ປີ ເປັນເວລາ 60+ ປີ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Warren Buffett ເກີດໃນ Omaha ປີ 1930. ອາຍຸ 6 ປີ ລາວຊື້ Coca-Cola ຊ່ອງ ແລ້ວຂາຍ. ອາຍຸ 11 ຊື້ຫຸ້ນ. ອາຍຸ 13 ຍື່ນ tax return ດ້ວຍຕົວເອງ — ໂດຍ deduct ຈັກຍານ. ອາຍຸ 17 ລາວມີ equity ຫຼາຍກວ່າຄູສອນຂອງລາວ. ລາວຮຽນ Graham ທີ Columbia — ຊຶ່ງສ້າງ philosophy ການລົງທຶນ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1956**: ຕັ້ງ Buffett Partnership; return 23.8%/ປີ ໃນ 13 ປີ
- **1965**: ຄຸ້ມຄອງ Berkshire Hathaway
- **1988**: ຊື້ Coca-Cola $1 ຕື້ — ຍັງຖືໄວ້ຈົນປັດຈຸບັນ
- **2006**: ໃຫ້ $31 ຕື້ ກັບ Gates Foundation — ໃຫຍ່ທີ່ສຸດໃນປະຫວັດ
- **2016**: ລົງທຶນ $1 ຕື້+ ໃນ Apple — ກາຍເປັນ holding ໃຫຍ່ສຸດ
- **2024**: ຍັງ active ອາຍຸ 93 ປີ

## ຫຼັກການສຳຄັນ

**ລົງທຶນໃນສິ່ງທີ່ເຂົ້າໃຈ**: Buffett ບໍ່ຊື້ tech ທີ່ລາວບໍ່ຮູ້ — ເຄີຍບໍ່ຊື້ internet ໃນຍຸກ 90s.

**ຄວາມອົດທົນຄືກຸນແຈ**: ລາວໃຊ້ compound interest ແລະ ຖືໄວ້ຍາວ. "ຕະຫຼາດຈ່າຍໃຫ້ຄົນອົດທົນ."

**ດໍາລົງຊີວິດລຽບງ່າຍ**: ຢູ່ Omaha ຮ້ານດຽວ, ກິນ McDonald's ທຸກໂມງ — ຄວາມຮັ່ງບໍ່ປ່ຽນ habits.

## ມໍລະດົກ

Buffett ໃຫ້ 99% ຂອງຊັບ ເພື່ອການກຸສົນ. ລາວພິສູດວ່າ discipline ແລະ ຄວາມອົດທົນ — ບໍ່ແມ່ນ greed ຫຼື speculation — ຄືເສດທາງທີ່ຍາວທີ່ສຸດ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ການລົງທຶນທີ່ສຳຄັນທີ່ສຸດທີ່ທ່ານສາມາດເຮັດໄດ້ ແມ່ນການລົງທຶນໃນຕົວທ່ານເອງ."$$
WHERE tags[1] = 'warren-buffett' AND type = 'biography';

-- ── 6. Mark Zuckerberg ────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Mark Zuckerberg ສ້າງ Facebook ຈາກຫ້ອງ Harvard ອາຍຸ 19 — ກາຍເປັນ Meta ທີ່ເຊື່ອມ 3+ ຕື້ ຄົນ ຜ່ານ Facebook, Instagram, WhatsApp ແລະ Threads.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Mark Zuckerberg ເກີດໃນ White Plains, New York ປີ 1984. ພໍ່ລາວສອນ coding ຈາກ Atari BASIC. ອາຍຸ 15 ລາວສ້າງ Synapse — AI music player — ທີ Microsoft ຢາກຊື້. ລາວເຂົ້າ Harvard ດ້ານ Comp Science ແຕ່ສ້າງ Facemash ໂດຍ hack data ໂຮງຮຽນ — ໃກ້ຖືກໄລ່.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **2004**: ເປີດ TheFacebook.com ຈາກ Harvard dorm
- **2004**: ອອກ Harvard; ຍ້າຍໄປ Palo Alto
- **2008**: ກ້າວຜ່ານ MySpace ເປັນ social network ໃຫຍ່ທີ່ສຸດໃນໂລກ
- **2012**: IPO $16 ຕື້; ຊື້ Instagram $1 ຕື້
- **2014**: ຊື້ WhatsApp $19 ຕື້
- **2016**: ຊື້ Oculus VR $2 ຕື້
- **2021**: ປ່ຽນຊື່ Facebook ເປັນ Meta

## ຫຼັກການສຳຄັນ

**Move Fast and Break Things**: Zuckerberg ສ້າງ culture ທີ່ release ໄວ ທົດລອງໄວ — ແລ້ວ iterate.

**ຄວາມຮ່ວງຜ່ານ Long-term**: ທຸກຄຳວິຈານຕໍ່ Meta ຈາກສາທາລະນະ ເຂົາໃຊ້ເວລາໄປກັບ mission — ເຊື່ອມໂລກ.

**ລົງທຶນໃນ next wave**: Zuckerberg ລົງ VR/AR $30 ຕື້+/ປີ — ກ່ອນ VR ກ້າວ mainstream.

## ມໍລະດົກ

Facebook/Meta ກາຍເປັນ digital town square ສຳລັບ 3+ ຕື້ ຄົນ. ລາວຮ່ວມກັບ Priscilla Chan ໃຫ້ 99% ຂອງ shares ຂອງກອງທຶນ Chan Zuckerberg Initiative.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຄວາມສ່ຽງທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ ຄືການບໍ່ຮ່ຽງເທີ່ງເລີຍ."$$
WHERE tags[1] = 'mark-zuckerberg' AND type = 'biography';

-- ── 7. Jack Ma ────────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Jack Ma ຖືກປະຕິເສດ 30+ ຄັ້ງ — ລວມ KFC — ກ່ອນຕັ້ງ Alibaba ຈາກຫ້ອງ ກັບ 17 ໝູ່ ກາຍເປັນ e-commerce ໃຫຍ່ທີ່ສຸດຂອງຈີນ ແລະ ໜຶ່ງໃນ IPO ໃຫຍ່ທີ່ສຸດໃນປະຫວັດສາດ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Jack Ma ຊື່ຈີນ Ma Yun ເກີດໃນ Hangzhou ປີ 1964. ຄອບຄົວຍາກຈົນ. ອາຍຸ 12 ລາວປ່ຽນຊື່ "Jack" ແລະ ຮ່ຽວໄກ້ດ ທ່ອງທ່ຽວຟຣີ ເພື່ອຝຶກພາສາອັງກິດ. ລາວສອບໂຕ້ວິທະຍາໄລຊ້ຳ 2 ຄັ້ງ ກ່ອນໄດ້ເຂົ້າ. ຮຽນຈົບ ສະໝັກ 30+ ວຽກ ຖືກ reject ທຸກຢ່າງ — Harvard ປະຕິເສດ 10 ຄັ້ງ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1995**: ເຫັນ internet ຄັ້ງທໍາອິດ Seattle — ຊອກ "beer China" ໄດ້ 0 results
- **1995**: ຕັ້ງ China Yellow Pages — web service ທໍາອິດ
- **1999**: ຕັ້ງ Alibaba.com ກັບ 17 ໝູ່ ດ້ວຍ $60,000
- **2003**: ເປີດ Taobao — ທໍາລາຍ eBay China ດ້ວຍ free listings
- **2004**: ຕັ້ງ Alipay — ແກ້ trust problem ໃນ online shopping ຈີນ
- **2008**: ລ້ວງ Alibaba Cloud (ຄ້າຍ AWS ຂອງຈີນ)
- **2014**: Alibaba IPO: $25 ຕື້ — ໃຫຍ່ທີ່ສຸດໃນ NYSE ຕອນນັ້ນ

## ຫຼັກການສຳຄັນ

**ໃຊ້ Weakness ເປັນ Strength**: Jack Ma ບໍ່ຮູ້ code ເລີຍ — ລາວໃຊ້ people skills ໃນການ recruit ແລະ inspire.

**ຮ່ວງຫຼາຍ, ຖອຍໜ້ອຍ**: ລາວຖືກ reject Harvard 10 ຄັ້ງ, ຖືກ reject KFC, ຖືກ reject ທຸກຢ່າງ — ແຕ່ຕໍ່ສູ້ຕໍ່ທຸກຄັ້ງ.

**ຄ້ານ conventional wisdom**: ເມື່ອທຸກຄົນຄິດວ່າ internet ຈີນຈະລົ້ມ, Ma ເຊື່ອ ແລ້ວສ້າງ.

## ມໍລະດົກ

Jack Ma ສ້າງ Alibaba ecosystem — Taobao, Alipay, Ant Group, Alibaba Cloud — ທີ່ process $1+ ລ້ານລ້ານ/ປີ. ລາວສ້ອງທ່ຽວເສດຖະກິດ digital ຂອງຈີນດ້ວຍຕົວລາວ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຢ່າໃຫ້ຄຶ້. ມື້ນີ້ຍາກ, ມື້ອື່ນຈະຍາກກວ່ານີ້, ແຕ່ວັນຕໍ່ໄປຈາກນັ້ນຈະສົດໃສ."$$
WHERE tags[1] = 'jack-ma' AND type = 'biography';

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
WHERE tags[1] = 'oprah-winfrey' AND type = 'biography';

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
WHERE tags[1] = 'richard-branson' AND type = 'biography';

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
WHERE tags[1] = 'larry-page' AND type = 'biography';

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

**ຢູ່ກັບພາກສ່ວນພາກພື້ນ**: Walton ເດີນທາງໄປຮ້ານທຸກໆ ດ່ວນ ຮູ້ຈັກຊື່ພາກສ່ວນທຸກຄົນ.

**ຊອກ idea ຈາກທຸກທາງ**: ລາວເດີນທາງໄປຮ້ານຄູ່ແຂ່ງທຸກທີ່ທີ່ລາວໄປ ເພື່ອຮຽນຮູ້.

## ມໍລະດົກ

Walmart ມີ 10,000+ ຮ້ານ ໃນ 19 ປະເທດ ຍັງຄົງເປັນ retailer ທີ່ໃຫຍ່ທີ່ສຸດໃນໂລກ ດ້ວຍລາຍໄດ້ $650 ຕື້+/ປີ. ມໍລະດົກຂອງ Walton ສ້ອງທ່ຽວ modern retail ທັງໂລກ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຄວາມຄາດຫວັງທີ່ສູງ ແມ່ນກຸນແຈຂອງທຸກສິ່ງ."$$
WHERE tags[1] = 'sam-walton' AND type = 'biography';

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
WHERE tags[1] = 'howard-schultz' AND type = 'biography';

-- ── 13. Ray Dalio ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Ray Dalio ຕັ້ງ Bridgewater Associates ຈາກຫ້ອງ New York ກາຍເປັນ hedge fund ທີ່ໃຫຍ່ທີ່ສຸດໃນໂລກ — ໂດຍສ້າງ "radical transparency" ທີ່ສ່ຽວການສົດສາຍດ້ວຍ data.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Ray Dalio ເກີດໃນ Queens, New York ປີ 1949. ພໍ່ເປັນ jazz musician. ອາຍຸ 12 Dalio caddy ນໍາ bag golf ໃຫ້ Wall Street legends. ລາວຊື້ຫຸ້ນທໍາອິດ $6 ໄດ້ $18. ຮຽນຈົບ Harvard MBA ແລ້ວຕັ້ງ Bridgewater ຈາກຫ້ອງ ປີ 1975.

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
WHERE tags[1] = 'ray-dalio' AND type = 'biography';

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

**ຈ່າຍສຳລັບ talent**: "10 mediocre ຄົນ ຮາກກວ່າ 1 brilliant ຄົນ."

## ມໍລະດົກ

Netflix ປ່ຽນ entertainment ໂດຍທໍານໍາ "binge-watching", original content ໂດຍ algorithm ແລະໃຫ້ອໍານາດຜູ້ຊົມ. ສ່ວນ Blockbuster ຊຶ່ງປະຕິເສດ Netflix ໃນ 2000 ລົ້ມລະລາຍໃນ 2010.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຮັກສາວັດທະນະທໍາການສ້າງສັນ ຫຼືຄົນອື່ນຈະທໍາລາຍທ່ານ ດຽວກັນກັບທີ່ທ່ານທໍາລາຍຄົນອື່ນ."$$
WHERE tags[1] = 'reed-hastings' AND type = 'biography';

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
WHERE tags[1] = 'indra-nooyi' AND type = 'biography';
