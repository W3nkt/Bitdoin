-- ============================================================
-- Migration 025: Lao translations for all 15 biography posts
-- excerpt_lo + content_lo for each person
-- Names kept in English; content translated to Lao
-- ============================================================

-- ── 1. Elon Musk ─────────────────────────────────────────────────────────────
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
WHERE title_en = 'Elon Musk: The Man Who Bets Everything on the Future' AND type = 'biography';

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

**ຈຸດສຳລາຍ ≠ ຈຸດສິ້ນສຸດ**: ການຖືກໄລ່ຈາກ Apple ສ້າງ Jobs ໃຫ້ດີກວ່າເກົ່າ ເຊິ່ງທຳໃຫ້ Apple ດີຂຶ້ນ ເມື່ອລາວກັບ.

**ໝາຍ 1,000 ເພງ ໃນ Pocket**: ວິສັຍທັດທີ່ຊັດ ທໍາໃຫ້ຜົນໄດ້ຮັບທີ່ຊັດ.

## ມໍລະດົກ

Jobs ເສຍຊີວິດໃນປີ 2011 ດ້ວຍອາຍຸ 56 ປີ, ແຕ່ Apple ທີ່ລາວສ້າງ ກາຍເປັນບໍລິສັດທໍາອິດທີ່ມີມູນຄ່າ $3 ລ້ານລ້ານ. ທຸກ iPhone ທີ່ທ່ານໃຊ້ ຄືຕອນໜຶ່ງຂອງ DNA ຂອງ Jobs.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຈົ່ງຍັງຫິວ. ຈົ່ງຍັງໂງ່."$$
WHERE title_en = 'Steve Jobs: The Perfectionist Who Reinvented Industries' AND type = 'biography';

-- ── 3. Bill Gates ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Bill Gates ສ້າງ Microsoft ຈາກຫ້ອງໂດຍໄດ້ ກາຍເປັນຄົນຮັ່ງທີ່ສຸດໃນໂລກ ແລ້ວໃຫ້ຄວາມຮັ່ງສ່ວນໃຫຍ່ ເພື່ອການກຸສົນ. ລາວສົມຜົນຊີວິດດ້ວຍ "ຊອຟແວ + ກຸສົນ".$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Bill Gates ເກີດໃນ Seattle ປີ 1955. ອາຍຸ 13 ປີ ລາວຊ້ຳຊ່ອງໃນຫ້ອງຄອມ ຂອງໂຮງຮຽນ ທຸກໂອກາດ. ລາວແລະ Paul Allen ທົດສອບ ແລະ ຂຽນໂຄດໃນຫ້ອງ ຈົນໂຮງຮຽນຕ້ອງຫ້າມ. ລາວເຂົ້າ Harvard ແຕ່ຕັດສິນໃຈອອກ ເພາະເຫັນໂອກາດທີ່ Microsoft.

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

**ຈ່າຍຄືນສູ່ສັງຄົມ**: ຫຼັງຈາກສ້າງຄວາມຮັ່ງ, ລາວຊ່ຽວຊານ ໃນການໃຊ້ຄວາມຮັ່ງ ເພື່ອສຸຂະພາບ ແລະ ການສຶກສາໃນ ໂລກທີ 3.

## ມໍລະດົກ

Microsoft ຍັງຄົງເປັນໜຶ່ງໃນ 5 ບໍລິສັດ tech ທີ່ໃຫຍ່ທີ່ສຸດ. Gates Foundation ຊ່ວຍ ຂ້ຳ Polio ໃນ Africa ແລະ ຊ່ວຍ ໂຄງການວັກຊີນ ໃນ 40+ ປະເທດ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ການສະຫຼອງຄວາມສຳເລັດນັ້ນດີ, ແຕ່ສຳຄັນກວ່ານັ້ນ ຄືການຮຽນຮູ້ຈາກຄວາມລົ້ມເຫຼວ."$$
WHERE title_en = 'Bill Gates: The Architect of the Digital Age' AND type = 'biography';

-- ── 4. Jeff Bezos ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Jeff Bezos ອອກຈາກ Wall Street ເພື່ອຂາຍໜັງສືຈາກໂຮງຈອດລົດ — ກາຍເປັນ Amazon ທີ່ຂາຍທຸກສິ່ງ ແລະ ສ້າງ cloud ທີ່ຄ້ຳ internet ສ່ວນໃຫຍ່ຂອງໂລກ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Jeff Bezos ເກີດໃນ Albuquerque ປີ 1964. ພໍ່ຕຽວຂອງລາວ ຍ້າຍຄອບຄົວຈາກ Cuba ດ້ວຍ $250. ໃນໄວ teenager ລາວຝັນຢາກເປັນນັກ astronaut. ຮຽນຈົບ Princeton (CS ແລະ EE), ໄດ້ Senior VP ຢູ່ hedge fund — ແຕ່ຕັດສິນໃຈຂັບລົດຂ້າມ USA ເພື່ອຕັ້ງ Amazon ໃນ 1994.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1994**: ອອກ Wall Street; ຂາຍໜັງສືຈາກໂຮງຈອດລົດ Seattle
- **1997**: Amazon IPO; Bezos ອ່ານ letter ຕໍ່ shareholders ທຸກປີ
- **2005**: ເປີດ Amazon Prime — loyalty flywheel
- **2006**: ເປີດ AWS — cloud platform ທີ່ຕ່ອນຕໍ່ Netflix, Airbnb ແລະ ອີກ 1M+ ບໍລິສັດ
- **2007**: ເປີດ Kindle — ປ່ຽນການອ່ານໜັງສື
- **2013**: ຊື້ Washington Post $250 ລ້ານ
- **2021**: ຂຶ້ນ Blue Origin ໄປຊາຍແດນ ອາວະກາດ

## ຫຼັກການສຳຄັນ

**Customer Obsession ທໍາອິດ**: Amazon ຮຽນຮູ້ທຸກຢ່າງ ຈາກ data ຂອງລູກຄ້າ — ບໍ່ ຄາດເດົາ.

**ຄິດຍາວ**: Bezos ເວົ້າວ່າ ຄຳຕອບທີ່ດີ ຮຽກຮ້ອງ frame ທີ່ຍາວ. ລາວ ຕັດສິນໃຈ ໂດຍໃຊ້ "regret minimization framework".

**ທົດລອງ ທຸກສິ່ງ**: Amazon ລ່ົ້ມ Fire Phone, ແຕ່ຮຽນຮູ້ ແລ້ວສ້າງ Echo/Alexa ທີ່ປ່ຽນ smart home.

## ມໍລະດົກ

Amazon ຈ້າງ 1.5+ ລ້ານຄົນ. AWS ຄ້ຳ internet ຂອງໂລກ. Blue Origin ສ້າງ infrastructure ອາວະກາດ commercial ສຳລັບ generation ຕໍ່ໄປ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຖ້າທ່ານບໍ່ຫ້ຽວແຂ່ງ, ທ່ານຈະໃຫ້ຄຶ້ທົດລອງໄວເກີນໄປ."$$
WHERE title_en = 'Jeff Bezos: From a Garage to the Stars' AND type = 'biography';

-- ── 5. Warren Buffett ─────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Warren Buffett ເລີ່ມຊື້ຫຸ້ນ ອາຍຸ 11 ປີ ແລະ ກາຍເປັນ "Oracle of Omaha" — ນັກລົງທຶນທີ່ຍາວທີ່ສຸດ ໃຫ້ຜົນຕອບແທນ 20%+/ປີ ເປັນເວລາ 60+ ປີ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Warren Buffett ເກີດໃນ Omaha ປີ 1930. ອາຍຸ 6 ປີ ລາວຊື້ Coca-Cola ຊ່ອງ ແລ້ວຂາຍ. ອາຍຸ 11 ຊື້ຫຸ້ນ. ອາຍຸ 13 ຍື່ນ tax return ດ້ວຍຕົວເອງ — ໂດຍ deduct ຈັກຍານ. ອາຍຸ 17 ລາວ ມີ equity ຫຼາຍກວ່າ ຄູສອນ ຂອງລາວ. ລາວຮຽນ Graham ທີ Columbia — ຊຶ່ງສ້າງ philosophy ການລົງທຶນ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1956**: ຕັ້ງ Buffett Partnership; return 23.8%/ປີ ໃນ 13 ປີ
- **1965**: ຄຸ້ມຄອງ Berkshire Hathaway
- **1988**: ຊື້ Coca-Cola $1 ຕື້ — ຍັງຖືໄວ້ຈົນປັດຈຸບັນ
- **2006**: ໃຫ້ $31 ຕື້ ກັບ Gates Foundation — ໃຫຍ່ທີ່ສຸດໃນປະຫວັດ
- **2016**: ລົງທຶນ $1 ຕື້+ ໃນ Apple — ກາຍເປັນ holding ໃຫຍ່ສຸດ
- **2024**: ຍັງ active ອາຍຸ 93 ປີ

## ຫຼັກການສຳຄັນ

**ລົງທຶນໃນສິ່ງທີ່ເຂົ້າໃຈ**: Buffett ບໍ່ຊື້ tech ທີ່ລາວບໍ່ຮູ້ — ເຄີຍບໍ່ຊື້ internet ໃນຍຸກ 90s.

**ຄວາມອົດທົນຄືກຸນແຈ**: ລາວໃຊ້ compound interest ແລະ ຖືໄວ້ຍາວ. "ຕະຫຼາດ ຈ່າຍ ໃຫ້ ຄົນອົດທົນ."

**ດໍາລົງຊີວິດລຽບງ່າຍ**: ຢູ່ Omaha ຮ້ານດຽວ, ກິນ McDonald's ທຸກໂມງ — ຄວາມຮັ່ງ ບໍ່ປ່ຽນ habits.

## ມໍລະດົກ

Buffett ໃຫ້ 99% ຂອງຊັບ ເພື່ອການກຸສົນ. ລາວພິສູດ ວ່າ discipline ແລະ ຄວາມອົດທົນ — ບໍ່ແມ່ນ greed ຫຼື speculation — ຄືເສດທາງທີ່ຍາວທີ່ສຸດ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ການລົງທຶນທີ່ສຳຄັນທີ່ສຸດທີ່ທ່ານສາມາດເຮັດໄດ້ ແມ່ນການລົງທຶນໃນຕົວທ່ານເອງ."$$
WHERE title_en = 'Warren Buffett: The Oracle of Omaha' AND type = 'biography';

-- ── 6. Mark Zuckerberg ────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Mark Zuckerberg ສ້າງ Facebook ຈາກຫ້ອງ Harvard ອາຍຸ 19 — ກາຍເປັນ Meta ທີ່ເຊື່ອມ 3+ ຕື້ ຄົນ ຜ່ານ Facebook, Instagram, WhatsApp ແລະ Threads.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Mark Zuckerberg ເກີດໃນ White Plains, New York ປີ 1984. ພໍ່ລາວ ສອນ coding ຈາກ Atari BASIC. ອາຍຸ 15 ລາວສ້າງ Synapse — AI music player — ທີ Microsoft ຢາກຊື້. ລາວເຂົ້າ Harvard ດ້ານ Comp Science ແຕ່ ລາວສ້າງ Facemash ໂດຍໂດຍ hack data ໂຮງຮຽນ — ໃກ້ຖືກໄລ່.

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

**ຄວາມຮ່ວງຜ່ານ Long-term**: ທຸກ ຄຳວິຈານ ຕໍ່ Meta ຈາກ ສາທາລະນະ ເຂົາໃຊ້ ເວລາ ໄປກັບ mission — ເຊື່ອມໂລກ.

**ລົງທຶນໃນ next wave**: Zuckerberg ລົງ VR/AR $30 ຕື້+/ປີ — ກ່ອນ VR ກ້າວ mainstream.

## ມໍລະດົກ

Facebook/Meta ກາຍເປັນ digital town square ສຳລັບ 3+ ຕື້ ຄົນ. ລາວ ຮ່ວມກັບ Priscilla Chan ໃຫ້ 99% ຂອງ shares ຂອງ ກອງທຶນ Chan Zuckerberg Initiative.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຄວາມສ່ຽງທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ ຄືການບໍ່ຮ່ຽງເທີ່ງເລີຍ."$$
WHERE title_en = 'Mark Zuckerberg: Connecting the World' AND type = 'biography';

-- ── 7. Jack Ma ────────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Jack Ma ຖືກປະຕິເສດ 30+ ຄັ້ງ — ລວມ KFC — ກ່ອນຕັ້ງ Alibaba ຈາກຫ້ອງ ກັບ 17 ໝູ່ ກາຍເປັນ e-commerce ໃຫຍ່ທີ່ສຸດຂອງຈີນ ແລະ ໜຶ່ງໃນ IPO ໃຫຍ່ທີ່ສຸດໃນປະຫວັດສາດ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Jack Ma ຊື່ຈີນ Ma Yun ເກີດໃນ Hangzhou ປີ 1964. ຄອບຄົວຍາກຈົນ. ອາຍຸ 12 ລາວປ່ຽນຊື່ "Jack" ແລະ ຮ່ຽວໄກ້ດ ທ່ອງທ່ຽວ ຟຣີ ເພື່ອຝຶກພາສາອັງກິດ. ລາວ ສອບໂຕ້ ວິທະຍາໄລ ຊ້ຳ 2 ຄັ້ງ ກ່ອນໄດ້ເຂົ້າ. ຮຽນຈົບ ສະໝັກ 30+ ວຽກ ຖືກ reject ທຸກຢ່າງ — Harvard ປະຕິເສດ 10 ຄັ້ງ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1995**: ເຫັນ internet ຄັ້ງທໍາອິດ Seattle — ຊອກ "beer China" ໄດ້ 0 results
- **1995**: ຕັ້ງ China Yellow Pages — web service ທໍາອິດ
- **1999**: ຕັ້ງ Alibaba.com ກັບ 17 ໝູ່ ດ້ວຍ $60,000
- **2003**: ເປີດ Taobao — ທໍາລາຍ eBay China ດ້ວຍ free listings
- **2004**: ຕັ້ງ Alipay — ແກ້ trust problem ໃນ online shopping ຈີນ
- **2008**: ລ້ວງ Alibaba Cloud (ຄ້າຍ AWS ຂອງ ຈີນ)
- **2014**: Alibaba IPO: $25 ຕື້ — ໃຫຍ່ທີ່ສຸດໃນ NYSE ຕອນນັ້ນ

## ຫຼັກການສຳຄັນ

**ໃຊ້ Weakness ເປັນ Strength**: Jack Ma ບໍ່ຮູ້ code ເລີຍ — ລາວ ໃຊ້ people skills ໃນ ການ recruit ແລະ inspire.

**ຮ່ວງຫຼາຍ, ຖອຍໜ້ອຍ**: ລາວ ຖືກ reject Harvard 10 ຄັ້ງ, ຖືກ reject KFC, ຖືກ reject ທຸກຢ່າງ — ແຕ່ ຕໍ່ສູ້ຕໍ່ທຸກຄັ້ງ.

**ຄ້ານ conventional wisdom**: ເມື່ອທຸກຄົນ ຄິດວ່າ internet ຈີນ ຈະ ລ້ຳ, Ma ເຊື່ອ ແລ້ວ ສ້າງ.

## ມໍລະດົກ

Jack Ma ສ້າງ Alibaba ecosystem — Taobao, Alipay, Ant Group, Alibaba Cloud — ທີ່ process $1+ ລ້ານລ້ານ/ປີ. ລາວ ສ້ອງທ່ຽວ ເສດຖະກິດ digital ຂອງຈີນ ດ້ວຍຕົວລາວ.

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຢ່າໃຫ້ຄຶ້. ມື້ນີ້ຍາກ, ມື້ອື່ນຈະຍາກກວ່ານີ້, ແຕ່ວັນຕໍ່ໄປຈາກນັ້ນຈະສົດໃສ."$$
WHERE title_en = 'Jack Ma: The Teacher Who Disrupted Global Commerce' AND type = 'biography';

-- ── 8. Oprah Winfrey ──────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Oprah Winfrey ຈາກ Mississippi ທຸກຍາກ ກາຍເປັນ ຜູ້ຍ່ງ ທໍາລ້ານ ຜິວດໍາ ທໍາອິດ — ດ້ວຍ talk show, ໜັງສື club ແລະ ກໍາລັງຂອງ "ຄໍາເວົ້າ" ທີ່ ປ່ຽນຊີວິດ ຄົນນັບລ້ານ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Oprah Winfrey ເກີດໃນ 1954 ໃນ Mississippi ທ່າມກາງ ຄວາມທຸກຍາກ. ເຍົາໄວ, ລາວ ໄດ້ຮັບ ຄວາມທຸກ ຫຼາຍ. ລາວ ຟື້ນ ດ້ວຍ ໜັງສື. ລາວ ໄດ້ ທຶນ ວ.ທ. ທີ Tennessee State University ແລ້ວ ຈົ່ງ ຄົ້ນຫາ ຕົວ ຂອງ ລາວ ໃນ media.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1973**: ເປັນ ຜູ້ຍ່ງ TV ທໍາອິດ ທີ Nashville ອາຍຸ 19 ປີ
- **1984**: ຮັບ AM Chicago talk show — ຂຶ້ນ #1 ໃນ 1 ເດືອນ
- **1985**: ສ້າງ Harpo Productions — ບໍລິສັດ ຕົນເອງ
- **1986**: Oprah Winfrey Show ອອກ national
- **1994**: Oprah Book Club ທໍາໃຫ້ ໜັງສື ສ່ຽວ overnight — ຜູ້ຂຽນ ກາຍ bestseller ທັນທີ
- **2003**: ເປັນ billionaire ຜິວດໍາ ທໍາອິດ ຂອງ USA
- **2011**: ເປີດ OWN — Oprah Winfrey Network

## ຫຼັກການສຳຄັນ

**Authenticity**: Oprah ເວົ້ານ້ຳຕາ, ຮ່ວງ, ຟື້ນ ໃນໜ້າ camera — ຄົນ ເຊື່ອ ລາວ ເພາະ ລາວ "ຈິງ".

**"Aha! Moment"**: ລາວ ຮ່ວງ ຄົ້ນຫາ "ຄວາມຈິງ" ໃນ ທຸກ ການ ສົນທະນາ — ສ້າງ ການ ເຊື່ອມ ລະຫວ່າງ guest ແລະ ຜູ້ ຊົມ.

**ໃຫ້ ຄືນ**: Oprah ໃຫ້ ທຶນ ການ ສຶກສາ, ສ້າງ ໂຮງຮຽນ ທີ Africa ແລະ ໃຊ້ platform ຊ່ວຍ ຄົນ.

## ມໍລະດົກ

Oprah Winfrey Show ແລ່ນ 25 ປີ. ລາວ ສ້າງ 1M+ millionaires ຜ່ານ Oprah Book Club ໂດຍ ຫຼາຍ ຜູ້ ຂຽນ ຂາຍ ໄດ້ ຫຼາຍ ລ້ານ ສະບັບ. ລາວ ຮ້ອນ ທີ 1 ໃນ Forbes "100 Most Powerful Women".

**ບົດຮຽນທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດ**: "ຈົ່ງປ່ຽນ ບາດ ແຜ ຂອງ ທ່ານ ໃຫ້ກາຍ ເປັນ ສະຕິ ປັນຍາ."$$
WHERE title_en = 'Oprah Winfrey: From Poverty to Global Influence' AND type = 'biography';

-- ── 9. Richard Branson ────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Richard Branson ອອກ ຈາກ ໂຮງຮຽນ ດ້ວຍ dyslexia ໃນ ໄວ 16 ປີ — ຕັ້ງ Virgin Group ທີ່ ມີ 400+ ບໍລິສັດ ໃນ ທຸກ ຂົງ ເຂດ ຈາກ ສາຍ ການ ບິນ ຫາ ດ້ານ ອາວະກາດ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Richard Branson ເກີດ ໃນ London ປີ 1950. ລາວ ຮຽນ ຫຍຸ້ງຍາກ ດ້ວຍ dyslexia ຈົນ ຄູ ບໍ່ ຮູ້ ຈະ ສາຍ ລາວ ໄດ້ ຫຼື ໃຫ້ ລາວ ສຳ ເລັດ. ອາຍຸ 15 ລາວ ອອກ ໂຮງ ຮຽນ ແລ້ວ ຕັ້ງ ວາລະ ສານ "Student". ກ່ອນ 20 ລາວ ຮູ້ ວ່າ ລາວ ຮ່ວງ "ໃນ ທຸລະ ກິດ ບໍ່ ແມ່ນ ໃນ ຫ້ອງ ຮຽນ".

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1970**: ຕັ້ງ Virgin ຂາຍ ໂປ້ດ ທາງ ໄປ ສະ ນີ
- **1971**: ເປີດ ຮ້ານ Virgin Records Oxford Street
- **1984**: ຕັ້ງ Virgin Atlantic Airways
- **1992**: ຂາຍ Virgin Records ໃຫ້ EMI $1 ຕື້
- **2004**: ຕັ້ງ Virgin Galactic ເພື່ອ space tourism
- **2021**: ບິນ ໄປ ຊາຍ ແດນ ອາວະ ກາດ ດ້ວຍ VSS Unity — ກ່ອນ Bezos ໂດຍ 9 ວັນ

## ຫຼັກການສຳຄັນ

**Screw It, Let's Do It**: ນີ້ ຄື ຫຼັກ ຄຳ ຂວັນ ຂອງ Branson — ທົດລອງ ທຸລະ ກິດ ໃໝ່ ດ້ວຍ ຄວາມ ກ້ອງ.

**People First**: ລາວ ເຊື່ອ ໃນ "ຮ້ກ ພ ນ ກ ງານ ທ ຳ ອ ດ ລ ກ ຄ ້ າ ຕ າ ມ" — ພ ນ ກ ງານ ທ ີ ່ ມ ີ ຄ ວ າ ມ ສ ຸ ຂ ຈ ະ ດ ູ ແ ລ ລ ກ ຄ ້ າ ດ ີ.

**Brand ຄ ື ກ ໍ ລ ວ ມ ທ ຸ ກ ຢ ່ າ ງ**: Virgin ເ ຂ ້ າ ທ ຸ ກ ຕ ະ ຫ ຼ າ ດ — ດ ້ ວ ຍ culture ທ ີ ່ "fun + quality".

## ມ ໍ ລ ະ ດ ົ ກ

Virgin Group ຍ ັ ງ ດ ໍ າ ເ ນ ີ ນ ທ ຸ ລ ະ ກ ິ ດ ໃ ນ 35+ ປ ະ ເ ທ ດ. Branson ສ ້ ອ ງ ທ ່ ຽ ວ ແ ນ ວ ຄ ິ ດ ວ ່ າ "ຄ ົ ນ ທ ີ ່ ຫ ຼ ິ ້ ນ ນ ໍ າ ໄ ດ ້ ທ ໍ າ ວ ຽ ກ ທ ີ ່ ດ ີ ກ ວ ່ າ ຄ ົ ນ ທ ີ ່ ບ ໍ ່ ຫ ຼ ິ ້ ນ".

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ໂ ອ ກ າ ດ ທ າ ງ ທ ຸ ລ ະ ກ ິ ດ ຄ ້ າ ຍ ກ ັ ນ ກ ັ ບ ລ ົ ດ ເ ມ — ສ ະ ເ ໝ ີ ມ ີ ຄ ັ ນ ໃ ໝ ່ ຕ ໍ ່ ໄ ປ."$$
WHERE title_en = 'Richard Branson: The Adventurer Who Built an Empire' AND type = 'biography';

-- ── 10. Larry Page ────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Larry Page ພ ັ ດ ທ ະ ນ າ PageRank ໃ ນ Stanford ແ ລ ້ ວ ຮ ່ ວ ມ ກ ໍ ່ ຕ ັ ້ ງ Google ທ ີ ່ ກ າ ຍ ເ ປ ັ ນ search engine ທ ີ ່ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ ໃ ນ ໂ ລ ກ ແ ລ ະ ຕ ໍ ່ ມ າ ສ ້ າ ງ Alphabet ທ ີ ່ ຄ ້ ຳ ທ ຸ ກ ສ ິ ່ ງ ຕ ັ ້ ງ ແ ຕ ່ AI ຫ າ self-driving car.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Larry Page ເກີດ ໃນ East Lansing, Michigan ປີ 1973. ພໍ່ ແມ່ ທັງ ສອງ ຄົນ ເຮັດ ວຽກ ໃນ computer science. ອາຍຸ 6 ລາວ ໃຊ້ ຄອມ ຄັ້ງ ທໍາ ອິດ. ລາວ ຮຽນ Comp Science ທີ Michigan ແລ້ວ ໄປ PhD ທີ Stanford ທີ່ ລາວ ພົບ Sergey Brin.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1995**: ພົບ Brin; ເລີ່ມ ທ ົ ດ ລ ອ ງ ລ ະ ບ ົ ບ ranking web
- **1996**: ພັດ ທ ະ ນ າ PageRank ສ ູ ດ ຄ ິ ດ ໄ ລ ່ ຄ ວ າ ມ ສ ຳ ຄ ັ ນ ຂ ອ ງ webpage
- **1998**: ຕ ັ ້ ງ Google ໃ ນ Susan Wojcicki's garage ທ ີ Menlo Park
- **2001**: ຮ ັ ບ ສ ະ ໝ ັ ກ Eric Schmidt ເ ປ ັ ນ CEO ໃ ຫ ້ ໃ ຫ ຍ ່ ຂ ຶ ້ ນ
- **2004**: Google IPO $23 ຕ ື ້
- **2006**: ຊ ື ້ YouTube $1.65 ຕ ື ້
- **2011**: ກ ັ ບ ຄ ື ນ ເ ປ ັ ນ CEO
- **2015**: ຕ ັ ້ ງ Alphabet holding company

## ຫ ຼ ັ ກ ການ ສ ຳ ຄ ັ ນ

**10X ບ ໍ ່ ແ ມ ່ ນ 10%**: Page ຕ ້ ອ ງ ການ improvement 10 ເ ທ ົ ່ າ — ບ ໍ ່ ແ ມ ່ ນ incremental. ນ ີ ້ ຄ ື DNA ຂ ອ ງ Google.

**ຮ ວ ມ ພ ້ ອ ມ ໄ ດ ້ ທ ຸ ກ ຢ ່ າ ງ**: Alphabet structure ອ ະ ນ ຸ ຍ າ ດ "moonshot projects" — Waymo, DeepMind, Calico — ໂ ດ ຍ ບ ໍ ່ ໃ ຫ ້ ໂ ຄ ງ ການ ທ ີ ່ ສ ໍ າ ຄ ັ ນ ຂ ັ ດ ຂ ວ າ ງ.

## ມ ໍ ລ ະ ດ ົ ກ

Google search ປ ະ ມ ວ ນ ຜ ົ ນ 8.5 ຕ ື ້ search/ວ ັ ນ. DeepMind ສ ້ ານ AlphaFold ທ ີ ່ ແ ກ ້ protein folding — "ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ ໃ ນ biology" ໃ ນ 50 ປ ີ.

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ສ ະ ເ ໝ ີ ທ ໍ າ ງ ານ ໜ ັ ກ ໃ ນ ສ ິ ່ ງ ທ ີ ່ ໜ ້ າ ຕ ື ່ ນ ເ ຕ ້ ນ ເ ຖ ິ ງ ວ ່ າ ນ ຶ ່ ງ ຄ າ ດ."$$
WHERE title_en = 'Larry Page: The Architect of the Information Age' AND type = 'biography';

-- ── 11. Sam Walton ────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Sam Walton ເປີດ Walmart ດ ້ ວ ຍ ວ ິ ໄ ສ ທ ັ ດ ດ ຽ ວ: ຂ າ ຍ ສ ິ ່ ງ ທ ີ ່ ດ ີ ທ ີ ່ ສ ຸ ດ ໃ ນ ລ າ ຄ າ ຕ ໍ ່ ໍ ທ ີ ່ ສ ຸ ດ. ລ າ ວ ກ າ ຍ ເ ປ ັ ນ ຄ ົ ນ ຮ ັ ່ ງ ທ ີ ່ ສ ຸ ດ ໃ ນ ໂ ລ ກ ໂ ດ ຍ ຂ າ ຍ ສ ິ ນ ຄ ້ າ ລ າ ຄ າ ຖ ື ກ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Sam Walton ເ ກ ີ ດ ໃ ນ Oklahoma ປ ີ 1918 ທ ່ າ ມ ກ ລ າ ງ Great Depression. ລ າ ວ ຮ ຽ ນ ຈ ົ ບ University of Missouri ແ ລ ໄ ດ ້ ເ ງ ິ ນ ກ ູ ້ $20,000 ຈ າ ກ ພ ໍ ່ ຕ ຽ ວ ເ ພ ື ່ ອ ຊ ື ້ franchise ຮ ້ ານ Ben Franklin. ລ າ ວ ທ ໍ າ ໃ ຫ ້ ຮ ້ ານ ທ ີ ່ ຂ າ ຍ ດ ີ ທ ີ ່ ສ ຸ ດ ໃ ນ Arkansas ໃ ນ ເ ວ ລ າ ຫ ຼ າ ຍ ປ ີ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1945**: ເ ປ ີ ດ Ben Franklin franchise ທ ໍ າ ອ ິ ດ
- **1962**: ເ ປ ີ ດ Walmart ທ ໍ າ ອ ິ ດ ທ ີ Rogers, Arkansas
- **1970**: ຂ ຶ ້ ນ ໄ ປ 32 ຮ ້ ານ; ລ ົ ງ ທ ຶ ນ ສ າ ທ າ ລ ະ ນ ະ IPO
- **1983**: ຕ ັ ້ ງ Sam's Club — wholesale membership
- **1985**: Forbes ໃ ຫ ້ ລ າ ວ "ຄ ົ ນ ຮ ັ ່ ງ ທ ີ ່ ສ ຸ ດ ໃ ນ USA"
- **1992**: ລ າ ວ ເ ສ ຍ ຊ ີ ວ ິ ດ ໂ ດ ຍ Walmart ມ ີ 1,900+ ຮ ້ ານ

## ຫ ຼ ັ ກ ການ ສ ຳ ຄ ັ ນ

**ລ າ ຄ າ ຕ ໍ ່ ໍ ທ ຸ ກ ວ ັ ນ – EDLP**: ບ ໍ ່ ໃ ຊ ້ sale/promotion ເ ລ ົ ່ ອ ຍ ໆ — ຮ ັ ກ ສ າ ລ າ ຄ າ ຖ ື ກ ຕ ະ ຫ ຼ ອ ດ. ນ ີ ້ ສ ້ ້ າ ງ ຄ ວ າ ມ ໄ ວ ້ ວ າ ງ ໃ ຈ.

**ຢ ູ ່ ກ ັ ບ ພ ນ ກ ງ ານ**: Walton ເ ດ ີ ນ ທ າ ງ ໄ ປ ຮ ້ ານ ທ ຸ ກ ໆ ດ ່ ວ ນ ຮ ູ ້ ຊ ື ່ ພ ນ ກ ງ ານ ທ ຸ ກ ຄ ົ ນ.

**ຊ ອ ກ idea ທ ຸ ກ ຢ ່ າ ງ**: ລ າ ວ ເ ດ ີ ນ ທ າ ງ ໄ ປ ຮ ້ ານ ຄ ູ ່ ແ ຂ ່ ງ ທ ຸ ກ ທ ີ ່ ທ ີ ່ ລ າ ວ ໄ ປ.

## ມ ໍ ລ ະ ດ ົ ກ

Walmart ໂ ດ ຍ ມ ີ 10,000+ ຮ ້ ານ ໃ ນ 19 ປ ະ ເ ທ ດ ຍ ັ ງ ຄ ົ ງ ເ ປ ັ ນ retailer ທ ີ ່ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ ໃ ນ ໂ ລ ກ ດ ້ ວ ຍ ລ າ ຍ ໄ ດ ້ $650 ຕ ື ້ +/ປ ີ.

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ຄ ວ າ ມ ຄ າ ດ ຫ ວ ັ ງ ທ ີ ່ ສ ູ ງ ແ ມ ່ ນ ກ ຸ ນ ແ ຈ ຂ ອ ງ ທ ຸ ກ ສ ິ ່ ງ."$$
WHERE title_en = 'Sam Walton: The Man Who Made Shopping Affordable for Everyone' AND type = 'biography';

-- ── 12. Howard Schultz ────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Howard Schultz ຈ າ ກ Brooklyn housing project ຊ ື ້ Starbucks $3.8 ລ ້ ານ ແ ລ ້ ວ ສ ້ າ ງ "ສ ະ ຖ ານ ທ ີ ່ ທ ີ ່ ສ າ ມ" ລ ະ ຫ ວ ່ າ ງ ບ ້ ານ ແ ລ ະ ທ ີ ່ ເ ຮ ັ ດ ວ ຽ ກ ດ ້ ວ ຍ ກ ຊ ານ ກ າ ເ ຟ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Howard Schultz ເ ກ ີ ດ ໃ ນ Brooklyn public housing ປ ີ 1953. ພ ໍ ່ ລ າ ວ ເ ຈ ັ ບ ໃ ນ ທ ີ ່ ເ ຮ ັ ດ ວ ຽ ກ — ບ ໍ ່ ມ ີ insurance, ບ ໍ ່ ມ ີ sick pay. ນ ີ ້ ທ ໍ າ ໃ ຫ ້ Schultz ໃ ຝ ່ ຝ ັ ນ ວ ່ າ ຈ ະ ສ ້ າ ງ ບ ໍ ລ ິ ສ ັ ດ ທ ີ ່ "ດ ູ ແ ລ ພ ນ ກ ງ ານ" ຈ ິ ງ ໆ. ລ າ ວ ໄ ດ ້ ທ ຶ ນ football ໄ ປ Northern Michigan University.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1982**: ເ ຂ ົ ້ າ Starbucks (4 ສ າ ຂ າ) ເ ປ ັ ນ director marketing
- **1983**: ໄ ປ Milan ພ ົ ບ espresso bar culture — vision ຊ ັ ດ ຂ ຶ ້ ນ
- **1987**: ຊ ື ້ Starbucks ຈ າ ກ ຜ ູ ້ ກ ໍ ່ ຕ ັ ້ ງ $3.8 ລ ້ ານ
- **1992**: Starbucks IPO; 140 ສ າ ຂ າ
- **2008**: ກ ັ ບ ເ ປ ັ ນ CEO ໃ ນ ໄ ລ ຍ ະ ເ ສ ດ ຖ ະ ກ ິ ດ ຖ ົ ດ ຖ ອ ຍ; ຝ ຶ ກ barista ໃ ໝ ່ ທ ຸ ກ ຄ ົ ນ
- **2023**: Starbucks ມ ີ 36,000+ ສ າ ຂ າ ໃ ນ 80+ ປ ະ ເ ທ ດ

## ຫ ຼ ັ ກ ການ ສ ຳ ຄ ັ ນ

**ປ ະ ສ ົ ບ ກ ານ ຄ ື ສ ິ ນ ຄ ້ າ**: Starbucks ບ ໍ ່ ໄ ດ ້ ຂ າ ຍ ກ າ ເ ຟ — ລ າ ວ ຂ າ ຍ ປ ະ ສ ົ ບ ກ ານ ທ ີ ່ ໄ ດ ້ ໃ ນ ຮ ້ ານ.

**ພ ນ ກ ງ າ ນ ຄ ື ຂ ້ ອ ຍ ທ ໍ າ ອ ິ ດ**: Starbucks ໃ ຫ ້ health insurance ກ ັ ບ part-time ພ ນ ກ ງ ານ — ຍ ຸ ດ ທ ີ ່ "ໂ ລ ກ" ທ ົ ດ ໂ ສ ດ.

**ກ ້ ອ ງ ຮ ັ ບ ຄ ໍ າ ວ ິ ຈ ານ**: ໃ ນ 2008, ລ າ ວ ໄ ດ ້ ຕ ໍ ່ ສ ູ ້ ດ ້ ວ ຍ ຄ ໍ າ ວ ິ ຈ ານ ໂ ຄ ງ ການ "expensive coffee" — ດ ້ ວ ຍ ກ ານ ພ ິ ສ ູ ດ quality.

## ມ ໍ ລ ະ ດ ົ ກ

Starbucks ສ ້ ້ າ ງ ຄ ໍ າ ສ ່ ຽ ງ "ການ ຊ ື ້ ກ າ ເ ຟ" ໃ ຫ ້ ກ າ ຍ ເ ປ ັ ນ ritual ສ ໍ າ ຄ ັ ນ ທ ົ ່ ວ ໂ ລ ກ. Schultz ພ ິ ສ ູ ດ ວ ່ າ culture ທ ີ ່ ດ ີ ສ ້ ້ າ ງ brand ທ ີ ່ ຍ າ ວ.

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ໃ ນ ຊ ີ ວ ິ ດ, ທ ່ ານ ສ າ ມ າ ດ ໂ ທ ດ ຫ ຼ າ ຍ ຄ ົ ນ ຫ ຼ ື ທ ່ ານ ສ າ ມ າ ດ ລ ຸ ກ ຂ ຶ ້ ນ ແ ລ ະ ຮ ັ ບ ຜ ິ ດ ຊ ອ ບ ຕ ໍ ່ ຕ ົ ວ ເ ອ ງ."$$
WHERE title_en = 'Howard Schultz: Turning Coffee Into a Cultural Experience' AND type = 'biography';

-- ── 13. Ray Dalio ─────────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Ray Dalio ຕ ັ ້ ງ Bridgewater Associates ຈ າ ກ ຫ ້ ອ ງ New York ກ າ ຍ ເ ປ ັ ນ hedge fund ທ ີ ່ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ ໃ ນ ໂ ລ ກ — ໂ ດ ຍ ສ ້ ້ າ ງ ວ ັ ດ ທ ະ ນ ະ ທ ໍ າ "radical transparency" ທ ີ ່ ສ ່ ຽ ວ ການ ສ ົ ດ ສ າ ຍ ດ ້ ວ ຍ data.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Ray Dalio ເ ກ ີ ດ ໃ ນ Queens, New York ປ ີ 1949. ພ ໍ ່ ເ ປ ັ ນ musician ລ ຶ ງ. ອ າ ຍ ຸ 12 Dalio caddy ໂ ດ ຍ ນ ໍ າ ຖ ົ ງ golf ໃ ຫ ້ Wall Street legends. ລ າ ວ ຊ ື ້ ຫ ຸ ້ ນ ທ ໍ າ ອ ິ ດ $6 ໄ ດ ້ $18. ຮ ຽ ນ ຈ ົ ບ Harvard MBA ແ ລ ້ ວ ຕ ັ ້ ງ Bridgewater ຈ າ ກ ຫ ້ ອ ງ ປ ີ 1975.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1975**: ຕ ັ ້ ງ Bridgewater Associates ຈ າ ກ ຫ ້ ອ ງ New York
- **1982**: ທ ໍ າ ນ າ ຍ ຜ ິ ດ — ໃ ກ ້ ລ ົ ້ ມ, ຕ ້ ອ ງ ຂ າ ຍ furniture — ຮ ຽ ນ ຮ ູ ້ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ
- **1991**: ພ ັ ດ ທ ະ ນ າ "All Weather" portfolio ທ ີ ່ ຕ ໍ ່ ສ ູ ້ ທ ຸ ກ ສ ະ ພ າ ບ ຕ ະ ຫ ຼ າ ດ
- **2008**: Bridgewater return +9.5% ໃ ນ ຕ ອ ນ crisis ທ ີ ່ ທ ຸ ກ ຄ ົ ນ ຂ າ ດ ທ ຶ ນ
- **2010**: Bridgewater: hedge fund ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ $80 ຕ ື ້
- **2017**: ຕ ີ ພ ິ ມ "Principles" — bestseller ທ ົ ່ ວ ໂ ລ ກ

## ຫ ຼ ັ ກ ການ ສ ຳ ຄ ັ ນ

**Radical Transparency**: ທ ຸ ກ ການ ປ ະ ຊ ຸ ມ record, ທ ຸ ກ ຄ ໍ າ ວ ິ ຈ ານ ກ ່ ຽ ວ ກ ັ ນ open. ຄ ວ າ ມ ຈ ິ ງ ກ ່ ອ ນ ຄ ວ າ ມ ສ ະ ບ າ ຍ.

**Pain + Reflection = Progress**: ທ ຸ ກ ຄ ວ າ ມ ລ ້ ົ ມ ເ ຫ ຼ ວ ມ ີ "ຫ ຼ ັ ກ ສ ູ ດ" ຖ ້ າ ທ ່ ານ ຢ ຸ ດ ຮ ຽ ນ ຈ າ ກ ມ ັ ນ.

**Believability-weighted Decisions**: ຟ ັ ງ ຄ ົ ນ ທ ີ ່ "credible ທ ີ ່ ສ ຸ ດ" ໃ ນ ຫ ົ ວ ຂ ້ ອ ນ ນ ້ ັ ນ — ບ ໍ ່ ແ ມ ່ ນ majority.

## ມ ໍ ລ ະ ດ ົ ກ

Bridgewater Pure Alpha ຕ ່ ວ ຮ ວ ຍ $65 ຕ ື ້ ໃ ຫ ້ ນ ັ ກ ລ ົ ງ ທ ຶ ນ ໃ ນ 40 ປ ີ — ດ ີ ກ ວ ່ າ ທ ຸ ກ hedge fund ໃ ດ ໃ ນ ປ ະ ຫ ວ ັ ດ ສ າ ດ. "Principles" ກ າ ຍ ເ ປ ັ ນ ບ ັ ນ ທ ຶ ກ management ທ ີ ່ ຖ ື ກ ນ ໍ າ ໃ ຊ ້ ຢ ່ າ ງ ກ ວ ້ າ ງ ທ ີ ່ ສ ຸ ດ.

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ຄ ວ າ ມ ເ ຈ ັ ບ ປ ວ ດ + ການ ສ ະ ທ ້ ອ ນ = ຄ ວ າ ມ ກ ້ າ ວ ໜ ້ າ."$$
WHERE title_en = 'Ray Dalio: Principles for an Extraordinary Life' AND type = 'biography';

-- ── 14. Reed Hastings ─────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Reed Hastings ສ ້ ້ າ ງ Netflix ຈ າ ກ DVD ທາງ ໄ ປ ສ ະ ນ ີ ກ ້ ວ ນ ສ ູ ່ streaming ທ ີ ່ ປ ່ ຽ ນ ວ ິ ທ ີ ທ ີ ່ ໂ ລ ກ ດ ູ ໜ ັ ງ — ດ ້ ວ ຍ ຄ ໍ ກ ໃ ຫ ້ ລ ູ ກ ຄ ້ າ ດ ູ ຄ ໍ ລ ວ ດ ດ ຽ ວ.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Reed Hastings ເ ກ ີ ດ ໃ ນ Boston ປ ີ 1960. ຮ ຽ ນ mathematics ທ ີ Bowdoin, ແ ລ ້ ວ ເ ຂ ້ ານ Peace Corps ສ ອ ນ ຄ ະ ນ ິ ດ ທ ີ Swaziland 2 ປ ີ. ກ ັ ບ ມ າ ຮ ຽ ນ Stanford CS. ຕ ັ ້ ງ Pure Atria software ຂ າ ຍ ໄ ດ ້ $700 ລ ້ ານ. ໃ ນ ປ ີ 1997 ລ າ ວ ໄ ດ ້ fine $40 ຈ າ ກ Blockbuster ສ ຳ ລ ັ ບ DVD ຊ ້ ານ — ນ ີ ້ ທ ໍ າ ໃ ຫ ້ ລ າ ວ ສ ້ ້ າ ງ Netflix.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1997**: ຕ ັ ້ ງ Netflix: DVD-by-mail ບ ໍ ່ ມ ີ late fee
- **2000**: ສ ະ ເ ໜ ີ ຂ າ ຍ Netflix $50 ລ ້ ານ ໃ ຫ ້ Blockbuster — ຖ ື ກ ປ ະ ຕ ິ ເ ສ ດ
- **2007**: ເ ປ ີ ດ streaming — ກ ້ ອ ຍ ທ ານ ທ ີ ່ ກ ໍ ານ ົ ດ Netflix
- **2010**: Blockbuster ລ ົ ້ ມ ລ ະ ລ າ ຍ; Netflix streaming ຂ ຶ ້ ນ
- **2013**: House of Cards — original content ທ ໍ າ ອ ິ ດ ທ ີ ່ ສ ົ ດ ໃ ສ
- **2022**: Netflix ມ ີ 220M+ subscribers 190 ປ ະ ເ ທ ດ
- **2023**: ອ ອ ກ CEO; ສ ້ ອ ງ ມ ໍ ລ ະ ດ ົ ກ

## ຫ ຼ ັ ກ ການ ສ ຳ ຄ ັ ນ

**Freedom and Responsibility**: Netflix culture handbook — ໃ ຫ ້ ພ ນ ກ ງ ານ freedom ສ ູ ງ ສ ຸ ດ ແ ຕ ່ ຮ ຽ ກ ຮ ້ ອ ງ responsibility ສ ູ ງ ສ ຸ ດ.

**ປ ່ ຽ ນ ຕ ົ ວ ເ ອ ງ ຢ ່ າ ງ ຕ ໍ ່ ເ ນ ື ່ ອ ງ**: Netflix ທ ໍ າ ລ າ ຍ model DVD ຂ ອ ງ ຕ ົ ວ ເ ອ ງ ດ ້ ວ ຍ streaming ກ່ ອ ນ ຄ ູ ່ ແ ຂ ່ ງ ທ ໍ າ.

**ຈ ່ າ ຍ ສ ູ ງ ສ ຸ ດ ສ ໍ າ ລ ັ ບ talent ດ ີ ສ ຸ ດ**: "10 mediocre employees ຮ າ ກ ກ ວ ່ າ 1 brilliant employee."

## ມ ໍ ລ ະ ດ ົ ກ

Netflix ປ ່ ຽ ນ entertainment ໂ ດ ຍ ທ ໍ ານ ຳ "binge-watching", original content ໂ ດ ຍ algorithm ແ ລ ະ ໃ ຫ ້ ອ ໍ າ ນ າ ດ ຜ ູ ້ ຊ ົ ມ ໃ ນ ການ ເ ລ ື ອ ກ ຄ ວ ານ ດ ູ.

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ຮ ັ ກ ສ າ ວ ັ ດ ທ ະ ນ ະ ທ ໍ າ ການ ສ ້ ້ າ ງ ສ ັ ນ ຫ ຼ ື ຄ ົ ນ ອ ື ່ ນ ຈ ະ ທ ໍ າ ລ າ ຍ ທ ່ ານ ດ ຽ ວ ກ ັ ນ ກ ັ ບ ທ ີ ່ ທ ່ ານ ທ ໍ າ ລ າ ຍ ຄ ົ ນ ອ ື ່ ນ."$$
WHERE title_en = 'Reed Hastings: Disrupting Entertainment with Netflix' AND type = 'biography';

-- ── 15. Indra Nooyi ───────────────────────────────────────────────────────────
UPDATE knowledge_posts SET
  excerpt_lo = $$Indra Nooyi ຈ າ ກ Chennai ດ ້ ວ ຍ $50 ໃ ນ ກ ະ ເ ປ ົ ້ າ ກ າ ຍ ເ ປ ັ ນ CEO ຂ ອ ງ PepsiCo — ຜ ູ ້ ຍ ິ ງ ຊ າ ດ ອ ິ ນ ເ ດ ຍ ທ ໍ າ ອ ິ ດ ທ ີ ່ ນ ໍ າ Fortune 50 — ສ ້ ້ າ ງ ລ າ ຍ ໄ ດ ້ ຈ າ ກ $35B ສ ູ ່ $63B.$$,
  content_lo = $$## ຊີວິດໃນໄວໜຸ່ມ

Indra Nooyi ເ ກ ີ ດ ໃ ນ Chennai ປ ີ 1955 ໃ ນ ຄ ອ ບ ຄ ົ ວ conservative. ນ າ ງ ຮ ຽ ນ ດ ີ ຫ ຼ າ ຍ ແ ຕ ່ ຖ ື ກ ຄ າ ດ ຫ ວ ັ ງ ວ່ ານ າ ງ ຈ ະ ແ ຕ ່ ງ ງ ານ ກ ່ ອ ນ. ລ າ ວ ຮ ຽ ນ MBA ທ ີ IIM Calcutta ແ ລ ້ ວ ໄ ດ ້ ໄ ປ Yale ດ ້ ວ ຍ $50 ໃ ນ ກ ະ ເ ປ ົ ້ າ. ລ າ ວ ເ ຮ ັ ດ ວ ຽ ກ overnight ທ ີ reception desk ຂ ອ ງ Yale ເ ພ ື ່ ອ ຊ ໍ າ ລ ະ ຄ ່ າ ຮ ຽ ນ.

## ເສັ້ນທາງສູ່ຄວາມສຳເລັດ

- **1980**: ຈ ົ ບ Yale; ເ ຂ ້ ານ BCG strategy consulting
- **1994**: ເ ຂ ້ ານ PepsiCo ເ ປ ັ ນ SVP Corporate Strategy
- **1997**: ນ ໍ າ ໂ ຄ ງ ການ spinoff Yum Brands (KFC, Pizza Hut, Taco Bell)
- **2000**: ໄ ດ ້ ຕ ໍ າ ໜ ່ ວ ຍ CFO ຂ ອ ງ PepsiCo
- **2006**: ໄ ດ ້ CEO — ຜ ູ ້ ຍ ິ ງ ອ ິ ນ ເ ດ ຍ - ອ າ ເ ມ ລ ິ ກ າ ທ ໍ າ ອ ິ ດ ນ ໍ າ Fortune 50
- **2010**: PepsiCo ຊ ື ້ Pepsi Bottlers $7.8 ຕ ື ້ — vertical integration
- **2018**: ອ ອ ກ CEO ຫ ຼ ັ ງ 12 ປ ີ; ລ າ ຍ ໄ ດ ້ ຈ າ ກ $35B ສ ູ ່ $63B

## ຫ ຼ ັ ກ ການ ສ ຳ ຄ ັ ນ

**Performance with Purpose**: Nooyi ນ ໍ າ ພ າ PepsiCo ໃ ນ ທ ິ ດ ທ າ ງ "ສ ຸ ຂ ະ ພ າ ບ ດ ີ ກ ວ ່ າ" — ເ ພ ິ ່ ມ ສ ິ ນ ຄ ້ າ ທ ີ ່ ດ ີ ຕ ໍ ່ ສ ຸ ຂ ະ ພ າ ບ.

**Assume Positive Intent**: ນ າ ງ ສ ອ ນ ທ ີ ມ ງ ານ ວ ່ າ ໃ ຫ ້ ສ ະ ເ ໝ ີ ຄ ິ ດ ໃ ນ ທ າ ງ ດ ີ ຕ ໍ ່ ກ ັ ນ — ກ ໍ ່ ໃ ຫ ້ ເ ກ ີ ດ culture trust ໃ ນ ອ ງ ກ ານ.

**ຂ ຽ ນ ຫ າ ພ ໍ ່ ແ ມ ່ ຂ ອ ງ ພ ນ ກ ງ ານ**: Nooyi ຂ ຽ ນ ຈ ດ ໝ າ ຍ ສ ່ ວ ນ ຕ ົ ວ ຫ າ ພ ໍ ່ ແ ມ ່ ຂ ອ ງ ຜ ູ ້ ບ ໍ ລ ິ ຫ ານ ລ ະ ດ ັ ບ ສ ູ ງ ເ ພ ື ່ ອ ຂ ໍ ຂ ອ ບ ໃ ຈ.

## ມ ໍ ລ ະ ດ ົ ກ

Nooyi ສ ້ ້ ອ ງ ທ ່ ຽ ວ ຄ ວ າ ມ ຈ ິ ງ ທ ີ ່ ວ ່ າ ຄ ົ ນ ທ ີ ່ ອ ອ ກ ຈ າ ກ ປ ະ ເ ທ ດ ດ ້ ວ ຍ ບ ໍ ່ ມ ີ ຫ ຍ ັ ງ ສ າ ມ າ ດ ໄ ດ ້ role CEO ຂ ອ ງ Fortune 50. ລ າ ວ ສ ້ ້ ອ ງ ທ ່ ຽ ວ ໃ ຫ ້ ຜ ູ ້ ຍ ິ ງ, immigrant ແ ລ ະ ຄ ົ ນ minority ໃ ນ ທ ຸ ກ ໂ ລ ກ.

**ບ ົ ດ ຮ ຽ ນ ທ ີ ່ ຍ ິ ່ ງ ໃ ຫ ຍ ່ ທ ີ ່ ສ ຸ ດ**: "ໃ ດ ທ ີ ່ ຄ ົ ນ ອ ື ່ ນ ເ ວ ົ ້ າ ຫ ຼ ື ເ ຮ ັ ດ, ໃ ຫ ້ ຄ ິ ດ ວ ່ ານ ໍ າ ໃ ຈ ດ ີ."$$
WHERE title_en = 'Indra Nooyi: Leading PepsiCo with Purpose' AND type = 'biography';
