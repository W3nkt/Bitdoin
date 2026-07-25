-- Publishes researched, multi-section practical summaries for well-known
-- books already in the Bitdoin bookstore catalog (matched by book_id, linked
-- in 057). Catalog titles not covered here remain as draft stubs, ready for
-- an admin to research and publish through the Learning content admin page.

-- Atomic Habits — James Clear
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 9,
  summary_en = $$An original practical overview of building better systems through small, repeatable actions.$$,
  summary_lo = $$ສະຫຼຸບແນວຄິດຕົ້ນສະບັບເພື່ອສ້າງລະບົບທີ່ດີ ດ້ວຍການກະທຳນ້ອຍໆທີ່ເຮັດຊ້ຳໄດ້.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Focus on systems, not goals$$, 'body', $$Goals set a direction, but the daily system you follow is what actually produces results. Two people can share the same goal; the one with a better system wins consistently.$$),
    jsonb_build_object('heading', $$The four laws of behavior change$$, 'body', $$Make good habits obvious, attractive, easy, and satisfying — and make bad habits invisible, unattractive, difficult, and unsatisfying. These four laws are a practical checklist for redesigning any routine.$$),
    jsonb_build_object('heading', $$Make it easy: start absurdly small$$, 'body', $$Reduce friction until the habit takes less than two minutes to start, such as "read one page" or "put on running shoes." Motivation fades, but a habit that is easy to start survives low-willpower days.$$),
    jsonb_build_object('heading', $$Habit stacking and environment design$$, 'body', $$Attach a new habit to an existing one ("After I pour my coffee, I will write one to-do item") and shape your surroundings so good choices are the path of least resistance.$$),
    jsonb_build_object('heading', $$Vote for the identity you want$$, 'body', $$Every repetition is a small vote for the type of person you wish to become. Track completions, not just outcomes, and let your identity — "I am someone who shows up" — reinforce the behavior.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ສຸມໃສ່ລະບົບ ບໍ່ແມ່ນເປົ້າໝາຍ$$, 'body', $$ເປົ້າໝາຍກຳນົດທິດທາງ ແຕ່ລະບົບປະຈຳວັນທີ່ທ່ານເຮັດຕ່າງຫາກທີ່ສ້າງຜົນລັບ. ສອງຄົນອາດມີເປົ້າໝາຍດຽວກັນ ແຕ່ຄົນທີ່ມີລະບົບດີກວ່າຈະຊະນະຢ່າງສະໝ່ຳສະເໝີ.$$),
    jsonb_build_object('heading', $$ກົດ 4 ຂໍ້ຂອງການປ່ຽນພຶດຕິກຳ$$, 'body', $$ເຮັດໃຫ້ນິໄສດີເຫັນໄດ້ຊັດ, ໜ້າສົນໃຈ, ງ່າຍ ແລະ ພໍໃຈ — ແລະ ເຮັດໃຫ້ນິໄສບໍ່ດີເບິ່ງບໍ່ເຫັນ, ບໍ່ໜ້າສົນໃຈ, ຍາກ ແລະ ບໍ່ພໍໃຈ. ນີ້ແມ່ນລາຍການກວດສອບໃນການອອກແບບພຶດຕິກຳໃໝ່.$$),
    jsonb_build_object('heading', $$ເຮັດໃຫ້ງ່າຍ: ເລີ່ມນ້ອຍທີ່ສຸດ$$, 'body', $$ຫຼຸດອຸປະສັກຈົນນິໄສໃຊ້ເວລາເລີ່ມໜ້ອຍກວ່າສອງນາທີ ເຊັ່ນ "ອ່ານໜຶ່ງໜ້າ" ຫຼື "ໃສ່ເກີບແລ່ນ." ແຮງຈູງໃຈບໍ່ຄົງທີ່ ແຕ່ນິໄສທີ່ເລີ່ມງ່າຍຈະຢູ່ລອດໃນມື້ທີ່ບໍ່ມີແຮງ.$$),
    jsonb_build_object('heading', $$ຮວມນິໄສ ແລະ ອອກແບບສິ່ງແວດລ້ອມ$$, 'body', $$ຕິດນິໄສໃໝ່ກັບນິໄສເກົ່າ ("ຫຼັງຈາກຕົ້ມກາເຟ ຂ້ອຍຈະຂຽນວຽກໜຶ່ງຢ່າງ") ແລະ ຈັດສິ່ງແວດລ້ອມໃຫ້ທາງເລືອກທີ່ດີເປັນທາງທີ່ງ່າຍທີ່ສຸດ.$$),
    jsonb_build_object('heading', $$ອອກສຽງໂຫວດໃຫ້ຕົວຕົນທີ່ຢາກເປັນ$$, 'body', $$ທຸກຄັ້ງທີ່ເຮັດຊ້ຳແມ່ນຄະແນນສຽງນ້ອຍໆໃຫ້ຄົນທີ່ທ່ານຢາກເປັນ. ຕິດຕາມການເຮັດຊ້ຳ ບໍ່ແມ່ນແຕ່ຜົນລັບ ແລະ ໃຫ້ຕົວຕົນ "ຂ້ອຍເປັນຄົນທີ່ເຮັດຢ່າງຕໍ່ເນື່ອງ" ຊ່ວຍເສີມພຶດຕິກຳ.$$)
  ),
  key_takeaways_en = array[$$Small daily systems compound into large results$$, $$Design your environment to make good choices easy$$, $$Habits shape identity, and identity reinforces habits$$],
  key_takeaways_lo = array[$$ລະບົບນ້ອຍໆປະຈຳວັນສະສົມເປັນຜົນລັບໃຫຍ່$$, $$ອອກແບບສິ່ງແວດລ້ອມໃຫ້ທາງເລືອກທີ່ດີເຮັດງ່າຍ$$, $$ນິໄສສ້າງຕົວຕົນ ແລະ ຕົວຕົນເສີມນິໄສ$$]
where book_id = '7b6dd1f3-e5e4-4b21-b5a8-1c4eecc3c18f';

-- The Psychology of Money — Morgan Housel (two catalog editions)
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 9,
  summary_en = $$Doing well with money is a soft skill about behavior, not a hard science about what you know.$$,
  summary_lo = $$ຄວາມສຳເລັດດ້ານການເງິນແມ່ນທັກສະດ້ານພຶດຕິກຳ ບໍ່ແມ່ນຄວາມຮູ້ທາງວິຊາການລ້ວນໆ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Behavior beats knowledge$$, 'body', $$Financial success is less about what you know and more about how you behave with money over time — patience and discipline beat raw intelligence.$$),
    jsonb_build_object('heading', $$Respect luck and risk$$, 'body', $$Extreme outcomes, both good and bad, are shaped by luck and risk more than skill. Be humble about others' failures and cautious about crediting your own success entirely to skill.$$),
    jsonb_build_object('heading', $$Compounding rewards patience$$, 'body', $$Modest, consistent returns held for a very long time outperform spectacular short bursts. Time in the market, not perfect timing, is the real engine of wealth.$$),
    jsonb_build_object('heading', $$Save for freedom, not a reason$$, 'body', $$Saving money buys optionality and control over your own time — the ability to wait, choose, and change direction — which Housel argues is the highest form of wealth.$$),
    jsonb_build_object('heading', $$Leave room for error$$, 'body', $$Plan your finances assuming you will sometimes be wrong. A margin of safety keeps you in the game long enough for compounding to do its work.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ພຶດຕິກຳສຳຄັນກວ່າຄວາມຮູ້$$, 'body', $$ຄວາມສຳເລັດດ້ານການເງິນບໍ່ໄດ້ຂຶ້ນກັບຄວາມຮູ້ຢ່າງດຽວ ແຕ່ຂຶ້ນກັບພຶດຕິກຳຕໍ່ເງິນໃນໄລຍະຍາວ — ຄວາມອົດທົນ ແລະ ວິໄນຊະນະຄວາມສະຫຼາດ.$$),
    jsonb_build_object('heading', $$ເຄົາລົບໂຊກ ແລະ ຄວາມສ່ຽງ$$, 'body', $$ຜົນລັບສຸດຂີດ ທັງດີ ແລະ ບໍ່ດີ ຖືກກຳນົດໂດຍໂຊກ ແລະ ຄວາມສ່ຽງຫຼາຍກວ່າຝີມື. ຢ່າຕັດສິນຄວາມລົ້ມເຫຼວຂອງຄົນອື່ນງ່າຍໆ ແລະ ຢ່າໃຫ້ເຄຣດິດຄວາມສຳເລັດຕົນເອງໝົດກັບຝີມືຢ່າງດຽວ.$$),
    jsonb_build_object('heading', $$ດອກເບ້ຍທົບຕົ້ນຕ້ອງການຄວາມອົດທົນ$$, 'body', $$ຜົນຕອບແທນນ້ອຍໆແຕ່ສະໝ່ຳສະເໝີໃນໄລຍະຍາວ ຊະນະຜົນຕອບແທນສູງແຕ່ໄລຍະສັ້ນ. ເວລາທີ່ຢູ່ໃນຕະຫຼາດ ບໍ່ແມ່ນການຈັບຈັງຫວະທີ່ສົມບູນແບບ ຄືກົນໄກທີ່ແທ້ຈິງຂອງຄວາມຮັ່ງມີ.$$),
    jsonb_build_object('heading', $$ອອມເພື່ອອິດສະຫຼະ ບໍ່ແມ່ນເພື່ອເຫດຜົນດຽວ$$, 'body', $$ການອອມເງິນຊື້ທາງເລືອກ ແລະ ການຄວບຄຸມເວລາຂອງຕົນເອງ — ຄວາມສາມາດລໍຖ້າ, ເລືອກ ແລະ ປ່ຽນທິດທາງໄດ້ — ເຊິ່ງຖືວ່າເປັນຄວາມຮັ່ງມີສູງສຸດ.$$),
    jsonb_build_object('heading', $$ເຜື່ອຊ່ອງຫວ່າງໄວ້ສຳລັບຄວາມຜິດພາດ$$, 'body', $$ວາງແຜນການເງິນໂດຍສົມມຸດວ່າບາງຄັ້ງທ່ານຈະຜິດພາດ. ຊ່ອງຫວ່າງຄວາມປອດໄພຊ່ວຍໃຫ້ທ່ານຢູ່ໃນເກມໄດ້ດົນພໍໃຫ້ດອກເບ້ຍທົບຕົ້ນເຮັດວຽກ.$$)
  ),
  key_takeaways_en = array[$$Managing money is about behavior, not intelligence$$, $$Give compounding a long, uninterrupted runway$$, $$Save for optionality, and keep a margin of safety$$],
  key_takeaways_lo = array[$$ການຈັດການເງິນຂຶ້ນກັບພຶດຕິກຳ ບໍ່ແມ່ນສະຕິປັນຍາ$$, $$ໃຫ້ດອກເບ້ຍທົບຕົ້ນມີເວລາເຮັດວຽກຢ່າງຕໍ່ເນື່ອງ$$, $$ອອມເພື່ອທາງເລືອກ ແລະ ຮັກສາຊ່ອງຫວ່າງຄວາມປອດໄພ$$]
where book_id in ('1973dcdf-a04a-41ea-a626-1462b37b8e1c', '0e8c4061-3a87-4ff7-99cd-2b907743cab1');

-- Rich Dad Poor Dad — Robert Kiyosaki
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 8,
  summary_en = $$A personal-finance classic that reframes wealth around assets, liabilities, and financial literacy.$$,
  summary_lo = $$ປຶ້ມການເງິນຄລາສສິກ ທີ່ອະທິບາຍຄວາມຮັ່ງມີຜ່ານຊັບສິນ, ໜີ້ສິນ ແລະ ຄວາມຮູ້ດ້ານການເງິນ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Assets put money in your pocket$$, 'body', $$An asset generates income; a liability takes money out. Kiyosaki argues many things people call "assets," like an oversized house, are actually liabilities.$$),
    jsonb_build_object('heading', $$The rich acquire assets first$$, 'body', $$Instead of increasing lifestyle spending as income rises, direct new income toward buying or building income-producing assets first.$$),
    jsonb_build_object('heading', $$Work to learn, not only to earn$$, 'body', $$Choose experiences and skills — sales, accounting, investing — that build long-term financial capability, even when the immediate paycheck is smaller.$$),
    jsonb_build_object('heading', $$Mind your own business$$, 'body', $$Keep building a personal asset column outside of your job title: a side income stream, investments, or a small enterprise that belongs to you.$$),
    jsonb_build_object('heading', $$Financial literacy is trainable$$, 'body', $$Reading a balance sheet and understanding cash flow is a learnable skill, not an innate talent, and Kiyosaki frames it as the real long-term edge.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ຊັບສິນເຮັດໃຫ້ເງິນເຂົ້າກະເປົ໋າ$$, 'body', $$ຊັບສິນສ້າງລາຍຮັບ; ໜີ້ສິນເຮັດໃຫ້ເງິນອອກ. Kiyosaki ຊີ້ວ່າສິ່ງທີ່ຫຼາຍຄົນເອີ້ນວ່າ "ຊັບສິນ" ເຊັ່ນເຮືອນຫຼັງໃຫຍ່ ແທ້ຈິງແລ້ວອາດເປັນໜີ້ສິນ.$$),
    jsonb_build_object('heading', $$ຄົນຮັ່ງມີຊື້ຊັບສິນກ່ອນ$$, 'body', $$ແທນທີ່ຈະເພີ່ມລາຍຈ່າຍເມື່ອລາຍຮັບເພີ່ມຂຶ້ນ ໃຫ້ນຳລາຍຮັບໃໝ່ໄປຊື້ ຫຼື ສ້າງຊັບສິນທີ່ສ້າງລາຍຮັບກ່ອນ.$$),
    jsonb_build_object('heading', $$ເຮັດວຽກເພື່ອຮຽນຮູ້ ບໍ່ແມ່ນເພື່ອເງິນຢ່າງດຽວ$$, 'body', $$ເລືອກປະສົບການ ແລະ ທັກສະ ເຊັ່ນການຂາຍ, ບັນຊີ, ການລົງທຶນ ທີ່ສ້າງຄວາມສາມາດດ້ານການເງິນໃນໄລຍະຍາວ ເຖິງແມ່ນເງິນເດືອນຈະໜ້ອຍກວ່າ.$$),
    jsonb_build_object('heading', $$ດູແລທຸລະກິດຂອງຕົນເອງ$$, 'body', $$ສ້າງຄໍລໍາຊັບສິນສ່ວນຕົວຢ່າງຕໍ່ເນື່ອງ ນອກເໜືອຈາກຕຳແໜ່ງງານ: ລາຍຮັບເສີມ, ການລົງທຶນ ຫຼື ທຸລະກິດນ້ອຍໆທີ່ເປັນຂອງທ່ານເອງ.$$),
    jsonb_build_object('heading', $$ຄວາມຮູ້ດ້ານການເງິນຝຶກໄດ້$$, 'body', $$ການອ່ານງົບດຸ່ນດ່ຽງ ແລະ ເຂົ້າໃຈກະແສເງິນສົດແມ່ນທັກສະທີ່ຝຶກໄດ້ ບໍ່ແມ່ນພອນສະຫວັນ ແລະ ນີ້ຄືຄວາມໄດ້ປຽບໃນໄລຍະຍາວ.$$)
  ),
  key_takeaways_en = array[$$Know the real difference between an asset and a liability$$, $$Buy income-producing assets before upgrading your lifestyle$$, $$Treat financial literacy as a skill you can train$$],
  key_takeaways_lo = array[$$ຮູ້ຄວາມແຕກຕ່າງທີ່ແທ້ຈິງລະຫວ່າງຊັບສິນ ແລະ ໜີ້ສິນ$$, $$ຊື້ຊັບສິນທີ່ສ້າງລາຍຮັບກ່ອນຍົກລະດັບການໃຊ້ຊີວິດ$$, $$ຖືວ່າຄວາມຮູ້ດ້ານການເງິນເປັນທັກສະທີ່ຝຶກໄດ້$$]
where book_id = 'e9f97c27-8a81-439c-9756-925d0de2eabe';

-- Rich Dad's Cashflow Quadrant — Robert Kiyosaki (Lao edition, "money's four sides")
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 8,
  summary_en = $$Explains four fundamentally different ways people earn income, and why moving toward ownership changes your relationship with time.$$,
  summary_lo = $$ອະທິບາຍສີ່ວິທີພື້ນຖານທີ່ຄົນຫາລາຍໄດ້ ແລະ ເປັນຫຍັງການເປັນເຈົ້າຂອງລະບົບຈຶ່ງປ່ຽນຄວາມສຳພັນກັບເວລາຂອງທ່ານ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Four ways to earn$$, 'body', $$Employees (E) and the self-employed (S) trade personal time for money; business owners (B) build systems that work without them, and investors (I) put money to work in other systems.$$),
    jsonb_build_object('heading', $$Same income, different freedom$$, 'body', $$Two people earning the same income can have very different amounts of time freedom, depending on which quadrant produces that income.$$),
    jsonb_build_object('heading', $$Moving right requires new skills$$, 'body', $$Shifting from E or S toward B or I means learning to build systems, delegate, and tolerate more uncertainty in exchange for scale.$$),
    jsonb_build_object('heading', $$Start small, own the system$$, 'body', $$A business does not need to be large to count in the B quadrant — it needs to be able to run and generate income without your constant, personal presence.$$),
    jsonb_build_object('heading', $$Let money work as an investor$$, 'body', $$Redirect surplus cash flow into investments so that capital, not only labor, becomes a source of income.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ສີ່ວິທີໃນການຫາລາຍໄດ້$$, 'body', $$ພະນັກງານ (E) ແລະ ຄົນເຮັດອາຊີບອິດສະຫຼະ (S) ແລກເວລາສ່ວນຕົວກັບເງິນ; ເຈົ້າຂອງທຸລະກິດ (B) ສ້າງລະບົບທີ່ເຮັດວຽກໄດ້ໂດຍບໍ່ຕ້ອງມີພວກເຂົາ ແລະ ນັກລົງທຶນ (I) ໃຫ້ເງິນເຮັດວຽກໃນລະບົບອື່ນ.$$),
    jsonb_build_object('heading', $$ລາຍໄດ້ເທົ່າກັນ ແຕ່ອິດສະຫຼະຕ່າງກັນ$$, 'body', $$ສອງຄົນທີ່ມີລາຍໄດ້ເທົ່າກັນ ອາດມີອິດສະຫຼະດ້ານເວລາຕ່າງກັນຫຼາຍ ຂຶ້ນກັບວ່າລາຍໄດ້ນັ້ນມາຈາກຈະຕຸລັດໃດ.$$),
    jsonb_build_object('heading', $$ການຍ້າຍໄປທາງຂວາຕ້ອງການທັກສະໃໝ່$$, 'body', $$ການປ່ຽນຈາກ E ຫຼື S ໄປສູ່ B ຫຼື I ໝາຍເຖິງການຮຽນຮູ້ສ້າງລະບົບ, ມອບໝາຍວຽກ ແລະ ຍອມຮັບຄວາມບໍ່ແນ່ນອນເພື່ອແລກກັບການຂະຫຍາຍຕົວ.$$),
    jsonb_build_object('heading', $$ເລີ່ມນ້ອຍ ແຕ່ເປັນເຈົ້າຂອງລະບົບ$$, 'body', $$ທຸລະກິດບໍ່ຈຳເປັນຕ້ອງໃຫຍ່ຈຶ່ງນັບເປັນ B — ມັນພຽງແຕ່ຕ້ອງເຮັດວຽກ ແລະ ສ້າງລາຍໄດ້ໄດ້ໂດຍບໍ່ຕ້ອງມີທ່ານຢູ່ຕະຫຼອດເວລາ.$$),
    jsonb_build_object('heading', $$ໃຫ້ເງິນເຮັດວຽກແທນໃນຖານະນັກລົງທຶນ$$, 'body', $$ນຳກະແສເງິນສົດສ່ວນເກີນໄປລົງທຶນ ເພື່ອໃຫ້ທຶນ ບໍ່ແມ່ນແຮງງານຢ່າງດຽວ ກາຍເປັນແຫຼ່ງລາຍໄດ້.$$)
  ),
  key_takeaways_en = array[$$Know which quadrant your income actually comes from$$, $$Ownership and systems create time freedom that a job cannot$$, $$Move toward B and I gradually as skills and capital allow$$],
  key_takeaways_lo = array[$$ຮູ້ວ່າລາຍໄດ້ຂອງທ່ານມາຈາກຈະຕຸລັດໃດແທ້ໆ$$, $$ການເປັນເຈົ້າຂອງລະບົບສ້າງອິດສະຫຼະທີ່ວຽກປະຈຳໃຫ້ບໍ່ໄດ້$$, $$ຄ່ອຍໆຍ້າຍໄປສູ່ B ແລະ I ຕາມທັກສະ ແລະ ທຶນທີ່ມີ$$]
where book_id = '51715700-a81d-48d9-8710-b10adf7ce8cd';

-- Think and Grow Rich — Napoleon Hill
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 9,
  summary_en = $$A foundational success classic built around definite purpose, persistence, and organized planning.$$,
  summary_lo = $$ປຶ້ມຄລາສສິກແຫ່ງຄວາມສຳເລັດ ທີ່ສ້າງຂຶ້ນຈາກເປົ້າໝາຍທີ່ຊັດເຈນ, ຄວາມພາກພຽນ ແລະ ແຜນທີ່ເປັນລະບົບ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Start with a definite purpose$$, 'body', $$Vague wishes rarely produce results. Hill argues for writing a specific goal, a deadline, and the price you are willing to pay for it.$$),
    jsonb_build_object('heading', $$Turn desire into a plan$$, 'body', $$A strong desire only becomes achievement when backed by an organized plan and daily action, not wishful thinking alone.$$),
    jsonb_build_object('heading', $$Build a mastermind group$$, 'body', $$Progress accelerates when you surround yourself with people whose knowledge, contacts, or encouragement complement your own.$$),
    jsonb_build_object('heading', $$Treat setbacks as temporary$$, 'body', $$Hill argues that many people quit right before a breakthrough; persistence through temporary defeat is what separates those who eventually succeed.$$),
    jsonb_build_object('heading', $$Feed your mind on purpose$$, 'body', $$Repeated, focused attention on the goal keeps daily decisions aligned with it, instead of drifting toward distraction.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ເລີ່ມດ້ວຍເປົ້າໝາຍທີ່ຊັດເຈນ$$, 'body', $$ຄວາມປາຖະໜາທີ່ບໍ່ຊັດເຈນມັກບໍ່ໃຫ້ຜົນລັບ. Hill ແນະນຳໃຫ້ຂຽນເປົ້າໝາຍທີ່ຊັດເຈນ, ກຳນົດເວລາ ແລະ ລາຄາທີ່ທ່ານພ້ອມຈ່າຍເພື່ອມັນ.$$),
    jsonb_build_object('heading', $$ປ່ຽນຄວາມປາຖະໜາເປັນແຜນ$$, 'body', $$ຄວາມປາຖະໜາອັນແຮງກ້າຈະກາຍເປັນຄວາມສຳເລັດໄດ້ ກໍ່ຕໍ່ເມື່ອມີແຜນທີ່ເປັນລະບົບ ແລະ ການລົງມືເຮັດປະຈຳວັນຮອງຮັບ.$$),
    jsonb_build_object('heading', $$ສ້າງກຸ່ມ Mastermind$$, 'body', $$ຄວາມຄືບໜ້າຈະໄວຂຶ້ນ ເມື່ອທ່ານຢູ່ອ້ອມຮອບຄົນທີ່ມີຄວາມຮູ້, ຄວາມສຳພັນ ຫຼື ກຳລັງໃຈທີ່ຊ່ວຍເສີມທ່ານ.$$),
    jsonb_build_object('heading', $$ຖືວ່າຄວາມລົ້ມເຫຼວເປັນສິ່ງຊົ່ວຄາວ$$, 'body', $$Hill ຊີ້ວ່າຫຼາຍຄົນເລີກກ່ອນຈະສຳເລັດ. ຄວາມພາກພຽນຜ່ານຄວາມລົ້ມເຫຼວຊົ່ວຄາວ ຄືສິ່ງທີ່ແຍກຄົນສຳເລັດອອກຈາກຄົນອື່ນ.$$),
    jsonb_build_object('heading', $$ລ້ຽງດູຄວາມຄິດຢ່າງມີຈຸດປະສົງ$$, 'body', $$ການໃສ່ໃຈເປົ້າໝາຍຊ້ຳໆຢ່າງຈົດຈໍ່ ຊ່ວຍໃຫ້ການຕັດສິນໃຈປະຈຳວັນສອດຄ່ອງກັບເປົ້າໝາຍ ແທນທີ່ຈະຫຼົງໄປກັບສິ່ງລົບກວນ.$$)
  ),
  key_takeaways_en = array[$$Write a specific goal, deadline, and plan$$, $$Surround yourself with people who complement your gaps$$, $$Persistence through setbacks precedes most breakthroughs$$],
  key_takeaways_lo = array[$$ຂຽນເປົ້າໝາຍ, ກຳນົດເວລາ ແລະ ແຜນທີ່ຊັດເຈນ$$, $$ຢູ່ອ້ອມຮອບຄົນທີ່ຊ່ວຍເສີມຈຸດອ່ອນຂອງທ່ານ$$, $$ຄວາມພາກພຽນຜ່ານຄວາມລົ້ມເຫຼວ ມັກມາກ່ອນຄວາມສຳເລັດ$$]
where book_id = '2fcc3349-17e4-4718-b840-84f96f1f36e0';

-- Sapiens: A Brief History of Humankind — Yuval Noah Harari
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 10,
  summary_en = $$A sweeping look at how shared stories, farming, money, and empire shaped the human species.$$,
  summary_lo = $$ມຸມມອງກວ້າງກ່ຽວກັບວິທີທີ່ເລື່ອງເລົ່າຮ່ວມ, ການກະສິກຳ, ເງິນຕາ ແລະ ອານາຈັກ ສ້າງມະນຸດຊາດ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Shared stories enable cooperation$$, 'body', $$Harari argues humans dominate not through individual strength but through the ability to believe in and organize around shared fictions like money, nations, and laws.$$),
    jsonb_build_object('heading', $$The agricultural trade-off$$, 'body', $$Farming supported larger populations but often meant harder labor and worse diets for the average person — a reminder that progress and individual well-being are not the same thing.$$),
    jsonb_build_object('heading', $$Three unifying forces$$, 'body', $$Money, empires, and universal religions gradually connected separate human groups into a single, interacting world over thousands of years.$$),
    jsonb_build_object('heading', $$Science paired with capital$$, 'body', $$Modern science advanced quickly once it admitted ignorance and partnered with capital and state power willing to fund exploration and discovery.$$),
    jsonb_build_object('heading', $$Progress is not the same as happiness$$, 'body', $$Harari challenges readers to separate a society's material advancement from whether individual lives actually feel better as a result.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ເລື່ອງເລົ່າຮ່ວມກັນສ້າງຄວາມຮ່ວມມື$$, 'body', $$Harari ຊີ້ວ່າມະນຸດຄອບຄອງໂລກ ບໍ່ແມ່ນຍ້ອນຄວາມແຂງແຮງສ່ວນຕົວ ແຕ່ຍ້ອນຄວາມສາມາດເຊື່ອ ແລະ ຈັດຕັ້ງອ້ອມຮອບເລື່ອງເລົ່າຮ່ວມ ເຊັ່ນ ເງິນ, ຊາດ ແລະ ກົດໝາຍ.$$),
    jsonb_build_object('heading', $$ການແລກປ່ຽນຂອງການກະສິກຳ$$, 'body', $$ການປູກຝັງຮອງຮັບປະຊາກອນທີ່ຫຼາຍຂຶ້ນ ແຕ່ມັກໝາຍເຖິງແຮງງານໜັກຂຶ້ນ ແລະ ອາຫານທີ່ແຍ່ລົງສຳລັບຄົນທົ່ວໄປ — ຄວາມກ້າວໜ້າ ແລະ ຄວາມເປັນຢູ່ທີ່ດີບໍ່ແມ່ນສິ່ງດຽວກັນ.$$),
    jsonb_build_object('heading', $$ສາມພະລັງແຫ່ງການລວມ$$, 'body', $$ເງິນ, ອານາຈັກ ແລະ ສາສະໜາສາກົນ ຄ່ອຍໆເຊື່ອມກຸ່ມມະນຸດທີ່ແຍກກັນ ໃຫ້ກາຍເປັນໂລກດຽວທີ່ພົວພັນກັນຕະຫຼອດຫຼາຍພັນປີ.$$),
    jsonb_build_object('heading', $$ວິທະຍາສາດຮ່ວມກັບທຶນ$$, 'body', $$ວິທະຍາສາດສະໄໝໃໝ່ກ້າວໜ້າໄວຂຶ້ນ ເມື່ອຍອມຮັບຄວາມບໍ່ຮູ້ ແລະ ຈັບມືກັບທຶນ ແລະ ອຳນາດລັດທີ່ພ້ອມສະໜັບສະໜູນການສຳຫຼວດ.$$),
    jsonb_build_object('heading', $$ຄວາມກ້າວໜ້າບໍ່ແມ່ນຄວາມສຸກ$$, 'body', $$Harari ທ້າທາຍໃຫ້ຜູ້ອ່ານແຍກຄວາມກ້າວໜ້າດ້ານວັດຖຸຂອງສັງຄົມ ອອກຈາກຄຳຖາມວ່າຊີວິດຄົນແຕ່ລະຄົນດີຂຶ້ນແທ້ບໍ.$$)
  ),
  key_takeaways_en = array[$$Shared beliefs, not strength, let humans cooperate at scale$$, $$Progress and individual well-being are not automatically the same$$, $$Question whether advancement is actually improving daily life$$],
  key_takeaways_lo = array[$$ຄວາມເຊື່ອຮ່ວມກັນ ບໍ່ແມ່ນຄວາມແຂງແຮງ ເຮັດໃຫ້ມະນຸດຮ່ວມມືກັນໄດ້ໃນຂະໜາດໃຫຍ່$$, $$ຄວາມກ້າວໜ້າ ແລະ ຄວາມເປັນຢູ່ທີ່ດີບໍ່ໄດ້ໄປນຳກັນສະເໝີ$$, $$ຕັ້ງຄຳຖາມວ່າຄວາມກ້າວໜ້າເຮັດໃຫ້ຊີວິດປະຈຳວັນດີຂຶ້ນແທ້ບໍ$$]
where book_id = 'e57892c1-1004-4ad3-a180-997655421f7e';

-- How to Win Friends and Influence People — Dale Carnegie
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 8,
  summary_en = $$Timeless, practical rules for building trust, easing conflict, and influencing people without manipulation.$$,
  summary_lo = $$ກົດປະຕິບັດທີ່ໃຊ້ໄດ້ຕະຫຼອດການ ສຳລັບການສ້າງຄວາມໄວ້ວາງໃຈ ແລະ ຊັກຈູງຄົນໂດຍບໍ່ຫຼອກລວງ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Avoid criticism and blame$$, 'body', $$Criticism rarely changes behavior and usually creates resentment; it puts people on the defensive instead of open to change.$$),
    jsonb_build_object('heading', $$Give honest appreciation$$, 'body', $$Sincere recognition of specific, real strengths motivates people far more than flattery or silence.$$),
    jsonb_build_object('heading', $$Talk in terms of their interests$$, 'body', $$People act on their own motives, not yours — frame requests around what genuinely matters to the other person.$$),
    jsonb_build_object('heading', $$Let people save face and feel heard$$, 'body', $$Listen fully, admit your own mistakes quickly, and let others arrive at conclusions rather than forcing your opinion on them.$$),
    jsonb_build_object('heading', $$Small courtesies compound$$, 'body', $$Remembering names, smiling, and showing genuine interest in others build the trust that makes later requests and influence possible.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ຫຼີກລ້ຽງການຕິຕຽນ ແລະ ໂທດ$$, 'body', $$ການຕິຕຽນມັກບໍ່ປ່ຽນພຶດຕິກຳ ແລະ ມັກສ້າງຄວາມບໍ່ພໍໃຈ — ມັນເຮັດໃຫ້ຄົນຕັ້ງຮັບ ແທນທີ່ຈະເປີດໃຈຮັບການປ່ຽນແປງ.$$),
    jsonb_build_object('heading', $$ໃຫ້ຄຳຊົມທີ່ຈິງໃຈ$$, 'body', $$ການຍອມຮັບຈຸດແຂງທີ່ແທ້ຈິງ ແລະ ຊັດເຈນ ກະຕຸ້ນຄົນໄດ້ດີກວ່າຄຳຍໍທີ່ບໍ່ຈິງ ຫຼື ການນິ້ງງຽບ.$$),
    jsonb_build_object('heading', $$ເວົ້າຕາມສິ່ງທີ່ຄົນອື່ນສົນໃຈ$$, 'body', $$ຄົນເຮັດຕາມແຮງຈູງໃຈຂອງຕົນເອງ ບໍ່ແມ່ນຂອງທ່ານ — ວາງຄຳຂໍໃຫ້ກ່ຽວຂ້ອງກັບສິ່ງທີ່ອີກຝ່າຍໃສ່ໃຈແທ້ໆ.$$),
    jsonb_build_object('heading', $$ໃຫ້ຄົນຮັກສາໜ້າ ແລະ ຮູ້ສຶກວ່າຖືກຮັບຟັງ$$, 'body', $$ຮັບຟັງຢ່າງເຕັມທີ່, ຍອມຮັບຄວາມຜິດຂອງຕົນເອງໄວ ແລະ ໃຫ້ຄົນອື່ນສະຫຼຸບເອງ ແທນທີ່ຈະຍັດເຍຍດຄວາມຄິດຂອງທ່ານ.$$),
    jsonb_build_object('heading', $$ຄວາມສຸພາບນ້ອຍໆສະສົມໄດ້$$, 'body', $$ການຈື່ຊື່, ຍິ້ມ ແລະ ສົນໃຈຄົນອື່ນຢ່າງແທ້ຈິງ ສ້າງຄວາມໄວ້ວາງໃຈ ທີ່ເຮັດໃຫ້ການຂໍຮ້ອງ ຫຼື ຊັກຈູງໃນພາຍຫຼັງເປັນໄປໄດ້.$$)
  ),
  key_takeaways_en = array[$$Replace criticism with honest, specific appreciation$$, $$Frame requests around the other person's real interests$$, $$Small, consistent courtesies build lasting influence$$],
  key_takeaways_lo = array[$$ປ່ຽນການຕິຕຽນເປັນຄຳຊົມທີ່ຈິງໃຈ ແລະ ຊັດເຈນ$$, $$ວາງຄຳຂໍໃຫ້ກ່ຽວຂ້ອງກັບຄວາມສົນໃຈຂອງອີກຝ່າຍ$$, $$ຄວາມສຸພາບນ້ອຍໆທີ່ສະໝ່ຳສະເໝີສ້າງອິດທິພົນທີ່ຍືນຍາວ$$]
where book_id = '58b835a1-9b0b-4fab-b304-bd2eb818888a';

-- Eat That Frog! — Brian Tracy
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 7,
  summary_en = $$Twenty-one practical ways to stop procrastinating and get more of what matters done.$$,
  summary_lo = $$21 ວິທີປະຕິບັດເພື່ອເລີກຜັດວັນ ແລະ ເຮັດວຽກທີ່ສຳຄັນໃຫ້ສຳເລັດຫຼາຍຂຶ້ນ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Eat the ugliest frog first$$, 'body', $$Do your single most important, most likely-to-be-avoided task first thing in the day, before checking messages or smaller work.$$),
    jsonb_build_object('heading', $$Apply the 80/20 rule$$, 'body', $$A small number of tasks produce most of your results — identify and protect time for that critical 20% before anything else.$$),
    jsonb_build_object('heading', $$Prioritize with ABCDE$$, 'body', $$Rank tasks A (serious consequences) through E (no consequences), and refuse to touch a B task until every A task is done.$$),
    jsonb_build_object('heading', $$Plan the night before$$, 'body', $$Deciding tomorrow's top task the evening before removes decision fatigue and lets you start immediately with focus.$$),
    jsonb_build_object('heading', $$Single-handle until done$$, 'body', $$Once you start an important task, stay with it without interruption; task-switching is one of the biggest hidden productivity killers.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ກິນກົບທີ່ໜ້າກຽດທີ່ສຸດກ່ອນ$$, 'body', $$ເຮັດວຽກທີ່ສຳຄັນທີ່ສຸດ ແລະ ມັກຖືກຫຼີກລ້ຽງທີ່ສຸດກ່ອນໃນຕອນເຊົ້າ ກ່ອນເບິ່ງຂໍ້ຄວາມ ຫຼື ວຽກນ້ອຍໆ.$$),
    jsonb_build_object('heading', $$ໃຊ້ກົດ 80/20$$, 'body', $$ວຽກສ່ວນນ້ອຍສ້າງຜົນລັບສ່ວນໃຫຍ່ — ຊອກຫາ ແລະ ປົກປ້ອງເວລາໃຫ້ 20% ທີ່ສຳຄັນນັ້ນກ່ອນສິ່ງອື່ນ.$$),
    jsonb_build_object('heading', $$ຈັດລຳດັບຄວາມສຳຄັນດ້ວຍ ABCDE$$, 'body', $$ຈັດອັນດັບວຽກ A (ຜົນສະທ້ອນຮ້າຍແຮງ) ຫາ E (ບໍ່ມີຜົນສະທ້ອນ) ແລະ ຫ້າມແຕະວຽກ B ຈົນກວ່າວຽກ A ຈະສຳເລັດໝົດ.$$),
    jsonb_build_object('heading', $$ວາງແຜນຄືນກ່ອນ$$, 'body', $$ຕັດສິນໃຈວຽກສຳຄັນຂອງມື້ອື່ນຕັ້ງແຕ່ຕອນແລງ ຊ່ວຍຫຼຸດຄວາມເມື່ອຍລ້າໃນການຕັດສິນໃຈ ແລະ ໃຫ້ເລີ່ມວຽກໄດ້ທັນທີ.$$),
    jsonb_build_object('heading', $$ຈັບວຽກດຽວຈົນສຳເລັດ$$, 'body', $$ເມື່ອເລີ່ມວຽກສຳຄັນແລ້ວ ໃຫ້ຈົດຈໍ່ໂດຍບໍ່ຢຸດ — ການສະຫຼັບວຽກແມ່ນໜຶ່ງໃນຕົວທຳລາຍປະສິດທິພາບທີ່ໃຫຍ່ທີ່ສຸດ.$$)
  ),
  key_takeaways_en = array[$$Do the hardest important task first, before distractions$$, $$Protect time for the 20% of work that matters most$$, $$Decide tomorrow's priority the night before$$],
  key_takeaways_lo = array[$$ເຮັດວຽກສຳຄັນທີ່ຍາກທີ່ສຸດກ່ອນ ກ່ອນສິ່ງລົບກວນ$$, $$ປົກປ້ອງເວລາໃຫ້ 20% ຂອງວຽກທີ່ສຳຄັນທີ່ສຸດ$$, $$ຕັດສິນໃຈວຽກອັນດັບໜຶ່ງຂອງມື້ອື່ນຕັ້ງແຕ່ຕອນແລງ$$]
where book_id = '3169593c-8fae-475c-ba39-88f8b8c44e60';

-- The Millionaire Fastlane — M.J. DeMarco
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 9,
  summary_en = $$A challenge to the slow, job-and-retirement wealth script, in favor of building scalable systems.$$,
  summary_lo = $$ທ້າທາຍແນວຄິດຄວາມຮັ່ງມີແບບຊ້າໆຜ່ານວຽກປະຈຳ ດ້ວຍການສ້າງລະບົບທີ່ຂະຫຍາຍໄດ້.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Question the Slowlane script$$, 'body', $$Trading 40 years of a job for retirement savings depends entirely on someone else's system and a distant, uncertain payoff.$$),
    jsonb_build_object('heading', $$Own a system, not just a job$$, 'body', $$Lasting wealth comes from owning or building a business or asset that produces income, not only from a paycheck.$$),
    jsonb_build_object('heading', $$Score your idea with CENTS$$, 'body', $$Evaluate a business idea on Control, Entry barrier, Need it fills, Time freedom it creates, and Scale potential before committing.$$),
    jsonb_build_object('heading', $$Solve a real problem at scale$$, 'body', $$The fastest wealth builders serve many people's real needs, rather than a narrow hobby market with little demand.$$),
    jsonb_build_object('heading', $$Wealth is a process, not an event$$, 'body', $$Consistent execution over months and years compounds into wealth; there is no single lucky break that replaces the process.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ຕັ້ງຄຳຖາມກັບແນວທາງຊ້າ$$, 'body', $$ການແລກ 40 ປີຂອງວຽກປະຈຳກັບເງິນບຳນານ ຂຶ້ນກັບລະບົບຂອງຄົນອື່ນທັງໝົດ ແລະ ຜົນຕອບແທນທີ່ບໍ່ແນ່ນອນໃນອະນາຄົດໄກ.$$),
    jsonb_build_object('heading', $$ເປັນເຈົ້າຂອງລະບົບ ບໍ່ແມ່ນແຕ່ວຽກ$$, 'body', $$ຄວາມຮັ່ງມີທີ່ຍືນຍາວມາຈາກການເປັນເຈົ້າຂອງ ຫຼື ສ້າງທຸລະກິດ ຫຼື ຊັບສິນທີ່ສ້າງລາຍໄດ້ ບໍ່ແມ່ນແຕ່ເງິນເດືອນ.$$),
    jsonb_build_object('heading', $$ໃຫ້ຄະແນນແນວຄິດດ້ວຍ CENTS$$, 'body', $$ປະເມີນແນວຄິດທຸລະກິດຈາກ ການຄວບຄຸມ, ອຸປະສັກໃນການເລີ່ມ, ຄວາມຕ້ອງການທີ່ແກ້ໄດ້, ອິດສະຫຼະດ້ານເວລາ ແລະ ໂອກາດຂະຫຍາຍຕົວ.$$),
    jsonb_build_object('heading', $$ແກ້ບັນຫາຈິງໃນຂະໜາດໃຫຍ່$$, 'body', $$ຄົນທີ່ສ້າງຄວາມຮັ່ງມີໄດ້ໄວທີ່ສຸດ ມັກຮັບໃຊ້ຄວາມຕ້ອງການຈິງຂອງຄົນຫຼາຍ ບໍ່ແມ່ນຕະຫຼາດງານອະດິເລກນ້ອຍໆ.$$),
    jsonb_build_object('heading', $$ຄວາມຮັ່ງມີເປັນຂະບວນການ ບໍ່ແມ່ນເຫດການ$$, 'body', $$ການລົງມືເຮັດຢ່າງຕໍ່ເນື່ອງເປັນເດືອນເປັນປີ ສະສົມເປັນຄວາມຮັ່ງມີ — ບໍ່ມີໂຊກຄັ້ງດຽວທີ່ແທນຂະບວນການໄດ້.$$)
  ),
  key_takeaways_en = array[$$A paycheck alone rarely builds lasting wealth$$, $$Evaluate business ideas honestly before committing time$$, $$Consistent execution, not luck, compounds into wealth$$],
  key_takeaways_lo = array[$$ເງິນເດືອນຢ່າງດຽວ ບໍ່ຄ່ອຍສ້າງຄວາມຮັ່ງມີທີ່ຍືນຍາວ$$, $$ປະເມີນແນວຄິດທຸລະກິດຢ່າງຊື່ສັດກ່ອນລົງແຮງ$$, $$ການລົງມືເຮັດຢ່າງຕໍ່ເນື່ອງ ບໍ່ແມ່ນໂຊກ ສະສົມເປັນຄວາມຮັ່ງມີ$$]
where book_id = '1944ac9b-5ab6-4108-87bd-7422b0feac79';

-- The Bitcoin Standard — Saifedean Ammous
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 10,
  summary_en = $$A history of money that argues for "hard," hard-to-inflate money and examines Bitcoin through that lens.$$,
  summary_lo = $$ປະຫວັດສາດຂອງເງິນ ທີ່ໂຕ້ແຍ້ງເລື່ອງເງິນທີ່ "ແຂງ" ຍາກຕໍ່ການພິມເພີ່ມ ແລະ ວິເຄາະ Bitcoin ຜ່ານມຸມມອງນີ້.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$What makes money "hard"$$, 'body', $$Good money is costly to produce and hard to inflate; historically, gold won out over other commodities because its supply grows very slowly.$$),
    jsonb_build_object('heading', $$Easy money changes behavior$$, 'body', $$When a money's supply can be inflated easily, savers are punished and people shift toward short-term spending instead of long-term planning.$$),
    jsonb_build_object('heading', $$A brief history of monetary media$$, 'body', $$From cattle and seashells to gold and government-issued paper, each medium of exchange won or lost dominance based on scarcity and how easily it moved across time and space.$$),
    jsonb_build_object('heading', $$Bitcoin's core design$$, 'body', $$A fixed 21-million supply, decentralized issuance, and no central authority make Bitcoin, in Ammous's argument, the hardest money yet engineered.$$),
    jsonb_build_object('heading', $$Separating money from the state$$, 'body', $$The book argues that money historically controlled by governments has been repeatedly debased, and proposes market-chosen, apolitical money as an alternative.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ຫຍັງເຮັດໃຫ້ເງິນ "ແຂງ"$$, 'body', $$ເງິນທີ່ດີຕ້ອງໃຊ້ຕົ້ນທຶນສູງໃນການຜະລິດ ແລະ ຍາກຕໍ່ການພິມເພີ່ມ — ໃນປະຫວັດສາດ ຄຳໄດ້ຮັບຄວາມນິຍົມກວ່າສິນຄ້າອື່ນ ຍ້ອນປະລິມານເພີ່ມຂຶ້ນຊ້າຫຼາຍ.$$),
    jsonb_build_object('heading', $$ເງິນທີ່ພິມງ່າຍປ່ຽນພຶດຕິກຳ$$, 'body', $$ເມື່ອປະລິມານເງິນຖືກເພີ່ມໄດ້ງ່າຍ ຄົນອອມຈະຖືກລົງໂທດ ແລະ ຄົນຈະຫັນໄປໃຊ້ຈ່າຍໄລຍະສັ້ນ ແທນການວາງແຜນໄລຍະຍາວ.$$),
    jsonb_build_object('heading', $$ປະຫວັດຫຍໍ້ຂອງສື່ກາງເງິນຕາ$$, 'body', $$ຈາກງົວ ແລະ ຫອຍ ຫາ ຄຳ ແລະ ເງິນເຈ້ຍລັດ ແຕ່ລະສື່ກາງໄດ້ ຫຼື ເສຍຄວາມນິຍົມຂຶ້ນກັບຄວາມຫາຍາກ ແລະ ຄວາມສະດວກໃນການເຄື່ອນຍ້າຍ.$$),
    jsonb_build_object('heading', $$ໂຄງສ້າງຫຼັກຂອງ Bitcoin$$, 'body', $$ປະລິມານຄົງທີ່ 21 ລ້ານ, ການອອກເງິນແບບກະຈາຍອຳນາດ ແລະ ບໍ່ມີອຳນາດກາງ ເຮັດໃຫ້ Bitcoin ຕາມທັດສະນະຂອງ Ammous ເປັນເງິນທີ່ແຂງທີ່ສຸດເທົ່າທີ່ເຄີຍອອກແບບມາ.$$),
    jsonb_build_object('heading', $$ແຍກເງິນອອກຈາກລັດ$$, 'body', $$ປຶ້ມໂຕ້ແຍ້ງວ່າເງິນທີ່ລັດຄວບຄຸມມາໃນປະຫວັດສາດ ຖືກເຮັດໃຫ້ອ່ອນຄ່າຊ້ຳແລ້ວຊ້ຳອີກ ແລະ ສະເໜີເງິນທີ່ຕະຫຼາດເລືອກເອງ ເປັນທາງເລືອກ.$$)
  ),
  key_takeaways_en = array[$$A money's difficulty to inflate shapes long-term behavior$$, $$History shows scarcity, not government decree, wins trust over time$$, $$Understand Bitcoin's fixed supply before forming an opinion on it$$],
  key_takeaways_lo = array[$$ຄວາມຍາກໃນການພິມເງິນເພີ່ມ ກຳນົດພຶດຕິກຳໄລຍະຍາວ$$, $$ປະຫວັດສາດສະແດງວ່າຄວາມຫາຍາກ ບໍ່ແມ່ນຄຳສັ່ງລັດ ຊະນະຄວາມເຊື່ອໃຈ$$, $$ເຂົ້າໃຈປະລິມານຄົງທີ່ຂອງ Bitcoin ກ່ອນຕັດສິນ$$]
where book_id = '6a9b881f-0a1a-40a3-8e3f-ee1b18b6832e';

-- The Little Book of Ikigai — Ken Mogi
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 7,
  summary_en = $$Five everyday pillars, drawn from Japanese culture, for finding a personal reason for being.$$,
  summary_lo = $$ຫ້າຫຼັກປະຈຳວັນ ຈາກວັດທະນະທຳຍີ່ປຸ່ນ ສຳລັບການຄົ້ນຫາເຫດຜົນໃນການມີຊີວິດຂອງຕົນເອງ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Ikigai is broader than a career$$, 'body', $$Mogi argues true ikigai is a personal sense of what makes life worth living, which can be found in ordinary routines, not only in grand professional purpose.$$),
    jsonb_build_object('heading', $$Start small$$, 'body', $$Mastery and meaning usually begin with tiny, unglamorous first steps repeated with care, like a craftsman's early practice.$$),
    jsonb_build_object('heading', $$Accept yourself fully$$, 'body', $$Progress comes easier once you stop resisting your current abilities and circumstances and work honestly from where you actually are.$$),
    jsonb_build_object('heading', $$Seek harmony, not disruption$$, 'body', $$Sustainable satisfaction often comes from fitting well with others and your environment rather than constant self-promotion.$$),
    jsonb_build_object('heading', $$Savor the here and now$$, 'body', $$Noticing small pleasures in the present moment — a meal, a walk, a conversation — is itself a core source of ikigai.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$Ikigai ກວ້າງກວ່າອາຊີບ$$, 'body', $$Mogi ຊີ້ວ່າ ikigai ທີ່ແທ້ຈິງ ຄືຄວາມຮູ້ສຶກສ່ວນຕົວວ່າຫຍັງເຮັດໃຫ້ຊີວິດມີຄ່າ ເຊິ່ງພົບໄດ້ໃນກິດຈະວັດປະຈຳວັນ ບໍ່ແມ່ນແຕ່ໃນເປົ້າໝາຍອາຊີບໃຫຍ່.$$),
    jsonb_build_object('heading', $$ເລີ່ມນ້ອຍ$$, 'body', $$ຄວາມຊຳນານ ແລະ ຄວາມໝາຍ ມັກເລີ່ມຈາກບາດກ້າວນ້ອຍໆທີ່ບໍ່ໂດດເດັ່ນ ແຕ່ເຮັດຊ້ຳດ້ວຍຄວາມໃສ່ໃຈ ຄືຊ່າງຝີມືທີ່ຝຶກຝົນໃນຕອນຕົ້ນ.$$),
    jsonb_build_object('heading', $$ຍອມຮັບຕົນເອງຢ່າງເຕັມທີ່$$, 'body', $$ຄວາມຄືບໜ້າຈະງ່າຍຂຶ້ນ ເມື່ອທ່ານເລີກຕໍ່ຕ້ານຄວາມສາມາດ ແລະ ສະຖານະການປັດຈຸບັນ ແລ້ວເລີ່ມເຮັດວຽກຈາກຈຸດທີ່ທ່ານຢູ່ແທ້ໆ.$$),
    jsonb_build_object('heading', $$ຊອກຫາຄວາມກົມກຽວ ບໍ່ແມ່ນຄວາມແຕກແຍກ$$, 'body', $$ຄວາມພໍໃຈທີ່ຍືນຍາວ ມັກມາຈາກການເຂົ້າກັນໄດ້ດີກັບຄົນອື່ນ ແລະ ສິ່ງແວດລ້ອມ ບໍ່ແມ່ນການໂຄສະນາຕົນເອງຕະຫຼອດເວລາ.$$),
    jsonb_build_object('heading', $$ດື່ມດ່ຳກັບປັດຈຸບັນ$$, 'body', $$ການສັງເກດຄວາມສຸກນ້ອຍໆໃນປັດຈຸບັນ — ອາຫານ, ການຍ່າງ, ການສົນທະນາ — ຄືແຫຼ່ງທີ່ມາຫຼັກຂອງ ikigai ເອງ.$$)
  ),
  key_takeaways_en = array[$$Meaning is often found in small, repeated routines$$, $$Accepting where you are now makes progress easier$$, $$Small present-moment pleasures are a real source of purpose$$],
  key_takeaways_lo = array[$$ຄວາມໝາຍມັກພົບໃນກິດຈະວັດນ້ອຍໆທີ່ເຮັດຊ້ຳ$$, $$ການຍອມຮັບຈຸດທີ່ທ່ານຢູ່ ຊ່ວຍໃຫ້ຄວາມຄືບໜ້າງ່າຍຂຶ້ນ$$, $$ຄວາມສຸກນ້ອຍໆໃນປັດຈຸບັນ ຄືແຫຼ່ງຄວາມໝາຍທີ່ແທ້ຈິງ$$]
where book_id = '6bd0c325-bfd3-4678-976f-7b2a6d36f4b4';

-- The Magic of Thinking Big — David J. Schwartz
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 8,
  summary_en = $$A classic argument that belief, not just ability, sets the ceiling on what you attempt and achieve.$$,
  summary_lo = $$ປຶ້ມຄລາສສິກທີ່ໂຕ້ແຍ້ງວ່າ ຄວາມເຊື່ອ ບໍ່ແມ່ນແຕ່ຄວາມສາມາດ ເປັນຕົວກຳນົດເພດານຂອງສິ່ງທີ່ທ່ານກ້າລອງ ແລະ ບັນລຸໄດ້.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Belief sets the ceiling$$, 'body', $$Schwartz argues you rarely achieve more than you believe is possible, so raising your belief is the first step to raising your results.$$),
    jsonb_build_object('heading', $$Cure "excusitis"$$, 'body', $$Common excuses about health, intelligence, age, or luck are treated as a disease that talks people out of trying — diagnose and challenge your own excuses directly.$$),
    jsonb_build_object('heading', $$Think in solutions, not obstacles$$, 'body', $$Ask "how can this be done" instead of listing reasons it cannot, and act on ideas quickly rather than waiting for perfect conditions.$$),
    jsonb_build_object('heading', $$Manage your environment$$, 'body', $$The people and surroundings you choose shape your ambitions; deliberately spend time with people who expect more of you.$$),
    jsonb_build_object('heading', $$Use setbacks as data$$, 'body', $$Treat failure as useful feedback about what to adjust, not proof that you should stop trying.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ຄວາມເຊື່ອກຳນົດເພດານ$$, 'body', $$Schwartz ຊີ້ວ່າທ່ານມັກບໍ່ບັນລຸໄດ້ຫຼາຍກວ່າສິ່ງທີ່ທ່ານເຊື່ອວ່າເປັນໄປໄດ້ — ການຍົກລະດັບຄວາມເຊື່ອຄືບາດກ້າວທຳອິດ.$$),
    jsonb_build_object('heading', $$ຮັກສາ "ໂລກຂໍ້ອ້າງ"$$, 'body', $$ຂໍ້ອ້າງທົ່ວໄປເລື່ອງສຸຂະພາບ, ສະຕິປັນຍາ, ອາຍຸ ຫຼື ໂຊກ ຖືກຖືວ່າເປັນພະຍາດທີ່ເຮັດໃຫ້ຄົນເລີກລອງ — ວິນິດໄສ ແລະ ທ້າທາຍຂໍ້ອ້າງຂອງທ່ານເອງ.$$),
    jsonb_build_object('heading', $$ຄິດແບບທາງອອກ ບໍ່ແມ່ນອຸປະສັກ$$, 'body', $$ຖາມວ່າ "ຈະເຮັດແນວໃດໃຫ້ໄດ້" ແທນທີ່ຈະລິດເຫດຜົນວ່າເປັນຫຍັງບໍ່ໄດ້ ແລະ ລົງມືເຮັດໄວ ແທນທີ່ຈະລໍຖ້າສະພາບທີ່ສົມບູນແບບ.$$),
    jsonb_build_object('heading', $$ຈັດການສິ່ງແວດລ້ອມຂອງທ່ານ$$, 'body', $$ຄົນ ແລະ ສິ່ງແວດລ້ອມທີ່ທ່ານເລືອກ ກຳນົດຄວາມທະເຍີທະຍານຂອງທ່ານ — ຕັ້ງໃຈໃຊ້ເວລາກັບຄົນທີ່ຄາດຫວັງໃນຕົວທ່ານຫຼາຍຂຶ້ນ.$$),
    jsonb_build_object('heading', $$ໃຊ້ຄວາມລົ້ມເຫຼວເປັນຂໍ້ມູນ$$, 'body', $$ຖືວ່າຄວາມລົ້ມເຫຼວເປັນຂໍ້ມູນທີ່ເປັນປະໂຫຍດວ່າຄວນປັບຫຍັງ ບໍ່ແມ່ນຫຼັກຖານວ່າຄວນເລີກ.$$)
  ),
  key_takeaways_en = array[$$What you believe possible limits what you attempt$$, $$Name and challenge your own excuses honestly$$, $$Choose surroundings that expect more of you$$],
  key_takeaways_lo = array[$$ສິ່ງທີ່ທ່ານເຊື່ອວ່າເປັນໄປໄດ້ ຈຳກັດສິ່ງທີ່ທ່ານກ້າລອງ$$, $$ຊີ້ຊັດ ແລະ ທ້າທາຍຂໍ້ອ້າງຂອງຕົນເອງຢ່າງຊື່ສັດ$$, $$ເລືອກສິ່ງແວດລ້ອມທີ່ຄາດຫວັງໃນຕົວທ່ານຫຼາຍຂຶ້ນ$$]
where book_id = 'c8fcdbfc-9efa-4946-af8a-dbbc0a12cbcb';

-- Elon Musk: Tesla, SpaceX, and the Quest for a Fantastic Future — Ashlee Vance (two catalog editions)
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 11,
  summary_en = $$A biography tracing Musk's path from early internet startups to reshaping cars and rockets.$$,
  summary_lo = $$ຊີວະປະຫວັດທີ່ຕິດຕາມເສັ້ນທາງຂອງ Musk ຈາກສະຕາດອັບອິນເຕີເນັດ ຫາການປ່ຽນວົງການລົດ ແລະ ຈະຫຼວດ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$An unconventional early path$$, 'body', $$Musk emigrated from South Africa to Canada then the US, and built and sold early internet companies — Zip2, and the company that became PayPal — before turning to rockets and cars.$$),
    jsonb_build_object('heading', $$Betting personal fortune on hard industries$$, 'body', $$After the PayPal sale, Musk funded SpaceX and Tesla himself, entering aerospace and automotive manufacturing — industries known for high capital needs and frequent failure.$$),
    jsonb_build_object('heading', $$First-principles thinking$$, 'body', $$Vance describes Musk's habit of breaking problems down to basic physics and cost fundamentals instead of accepting "how the industry has always done it."$$),
    jsonb_build_object('heading', $$The brink of collapse in 2008$$, 'body', $$Both SpaceX and Tesla nearly ran out of money in the same year; Vance documents how narrow, high-stakes decisions kept both companies alive.$$),
    jsonb_build_object('heading', $$Mission before comfort$$, 'body', $$The biography frames Musk's demanding schedule and management style as driven by explicit long-term goals — sustainable energy and making humanity multiplanetary — rather than short-term profit alone.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ເສັ້ນທາງເລີ່ມຕົ້ນທີ່ບໍ່ທຳມະດາ$$, 'body', $$Musk ຍົກຍ້າຍຈາກອາຟຣິກາໃຕ້ໄປການາດາ ແລ້ວໄປສະຫະລັດ ແລະ ສ້າງ ພ້ອມຂາຍບໍລິສັດອິນເຕີເນັດຕົ້ນ — Zip2 ແລະ ບໍລິສັດທີ່ກາຍເປັນ PayPal — ກ່ອນຫັນໄປສູ່ຈະຫຼວດ ແລະ ລົດ.$$),
    jsonb_build_object('heading', $$ລົງທຶນຊັບສົມບັດສ່ວນຕົວໃນອຸດສາຫະກຳຍາກ$$, 'body', $$ຫຼັງຂາຍ PayPal, Musk ໃຊ້ທຶນສ່ວນຕົວກໍ່ຕັ້ງ SpaceX ແລະ Tesla ເຂົ້າສູ່ອຸດສາຫະກຳການບິນ ແລະ ຍານພາຫະນະ ທີ່ຕ້ອງການທຶນສູງ ແລະ ມີຄວາມລົ້ມເຫຼວເລື້ອຍໆ.$$),
    jsonb_build_object('heading', $$ການຄິດແບບຫຼັກການພື້ນຖານ$$, 'body', $$Vance ອະທິບາຍນິໄສຂອງ Musk ໃນການແຍກບັນຫາລົງເຖິງຟີຊິກ ແລະ ຕົ້ນທຶນພື້ນຖານ ແທນທີ່ຈະຍອມຮັບ "ວິທີທີ່ອຸດສາຫະກຳເຄີຍເຮັດມາ."$$),
    jsonb_build_object('heading', $$ຈຸດໃກ້ລົ້ມລະລາຍໃນປີ 2008$$, 'body', $$ທັງ SpaceX ແລະ Tesla ເກືອບໝົດເງິນໃນປີດຽວກັນ; Vance ບັນທຶກວິທີທີ່ການຕັດສິນໃຈເສັ້ນຄີບໆ ຊ່ວຍໃຫ້ທັງສອງບໍລິສັດຢູ່ລອດ.$$),
    jsonb_build_object('heading', $$ພາລະກິດກ່ອນຄວາມສະບາຍ$$, 'body', $$ຊີວະປະຫວັດວາງກອບການເຮັດວຽກໜັກ ແລະ ຮູບແບບການບໍລິຫານຂອງ Musk ວ່າຖືກຂັບເຄື່ອນໂດຍເປົ້າໝາຍໄລຍະຍາວ — ພະລັງງານຍືນຍົງ ແລະ ການເຮັດໃຫ້ມະນຸດຢູ່ໄດ້ຫຼາຍດາວ — ບໍ່ແມ່ນກຳໄລໄລຍະສັ້ນຢ່າງດຽວ.$$)
  ),
  key_takeaways_en = array[$$Deep technical fluency, not delegation alone, drove key decisions$$, $$Near-failure and long-term mission can coexist in a founder's story$$, $$Long-term conviction can justify very high near-term risk$$],
  key_takeaways_lo = array[$$ຄວາມຮູ້ດ້ານວິຊາການທີ່ເລິກເຊິ່ງ ບໍ່ແມ່ນແຕ່ການມອບໝາຍວຽກ ຂັບເຄື່ອນການຕັດສິນໃຈສຳຄັນ$$, $$ຈຸດເກືອບລົ້ມເຫຼວ ແລະ ພາລະກິດໄລຍະຍາວ ຢູ່ນຳກັນໄດ້ໃນເລື່ອງລາວຜູ້ກໍ່ຕັ້ງ$$, $$ຄວາມເຊື່ອໝັ້ນໄລຍະຍາວ ອາດອະທິບາຍຄວາມສ່ຽງສູງໃນໄລຍະໃກ້ໄດ້$$]
where book_id in ('255be173-29f9-43e1-8793-aaed91da7033', '1edfa8ad-9f85-452f-a3b3-cddb3b1eb081');

-- Broken Money — Lyn Alden
update public.premium_lessons set
  status = 'PUBLISHED', published_at = coalesce(published_at, now()), estimated_minutes = 10,
  summary_en = $$A history of monetary technology that argues today's fiat system has structural flaws worth understanding.$$,
  summary_lo = $$ປະຫວັດສາດເຕັກໂນໂລຢີການເງິນ ທີ່ໂຕ້ແຍ້ງວ່າລະບົບເງິນຕາປັດຈຸບັນມີຈຸດອ່ອນທາງໂຄງສ້າງທີ່ຄວນເຂົ້າໃຈ.$$,
  content_en = jsonb_build_array(
    jsonb_build_object('heading', $$Money is a technology, and it evolves$$, 'body', $$Alden traces money from early collectibles and metals to today's electronic fiat, showing that monetary systems are engineered tools, not fixed laws of nature.$$),
    jsonb_build_object('heading', $$The fiat era's structural strain$$, 'body', $$The book documents how, since 1971, large structural deficits and expanding debt create recurring pressure toward currency depreciation.$$),
    jsonb_build_object('heading', $$Savers are pushed into risk$$, 'body', $$When cash and bonds lose purchasing power over time, ordinary savers are structurally nudged into stocks, real estate, or speculation just to preserve wealth.$$),
    jsonb_build_object('heading', $$Energy and money are linked$$, 'body', $$Alden connects the availability of cheap energy to monetary expansion and argues future monetary design will need to reckon with energy constraints.$$),
    jsonb_build_object('heading', $$New technology reopens old questions$$, 'body', $$Digital, programmable, and decentralized monetary tools re-raise historical questions about who controls money and how sound it can be.$$)
  ),
  content_lo = jsonb_build_array(
    jsonb_build_object('heading', $$ເງິນເປັນເຕັກໂນໂລຢີ ແລະ ມັນວິວັດທະນາການ$$, 'body', $$Alden ຕິດຕາມເງິນຈາກສິ່ງເກັບສະສົມ ແລະ ໂລຫະຍຸກຕົ້ນ ຫາລະບົບເງິນເຈ້ຍເອເລັກໂຕຣນິກປັດຈຸບັນ ສະແດງໃຫ້ເຫັນວ່າລະບົບເງິນຕາເປັນເຄື່ອງມືທີ່ຖືກອອກແບບ ບໍ່ແມ່ນກົດທຳມະຊາດ.$$),
    jsonb_build_object('heading', $$ຄວາມກົດດັນທາງໂຄງສ້າງຂອງຍຸກເງິນເຈ້ຍ$$, 'body', $$ປຶ້ມບັນທຶກວ່າ ຕັ້ງແຕ່ປີ 1971 ການຂາດດຸນທາງໂຄງສ້າງທີ່ໃຫຍ່ ແລະ ໜີ້ສິນທີ່ຂະຫຍາຍຕົວ ສ້າງຄວາມກົດດັນຊ້ຳໆໃຫ້ເງິນຕົກຄ່າ.$$),
    jsonb_build_object('heading', $$ຄົນອອມຖືກຜັກດັນສູ່ຄວາມສ່ຽງ$$, 'body', $$ເມື່ອເງິນສົດ ແລະ ພັນທະບັດເສຍກຳລັງຊື້ຕາມເວລາ ຄົນອອມທົ່ວໄປຖືກຜັກດັນໃຫ້ໄປສູ່ຮຸ້ນ, ອະສັງຫາລິມະຊັບ ຫຼື ການເກັງກຳໄລ ພຽງເພື່ອຮັກສາຄວາມຮັ່ງມີ.$$),
    jsonb_build_object('heading', $$ພະລັງງານ ແລະ ເງິນເຊື່ອມໂຍງກັນ$$, 'body', $$Alden ເຊື່ອມໂຍງພະລັງງານລາຄາຖືກເຂົ້າກັບການຂະຫຍາຍຕົວຂອງເງິນຕາ ແລະ ໂຕ້ແຍ້ງວ່າການອອກແບບເງິນຕາໃນອະນາຄົດຕ້ອງຄຳນຶງເຖິງຂໍ້ຈຳກັດພະລັງງານ.$$),
    jsonb_build_object('heading', $$ເຕັກໂນໂລຢີໃໝ່ເປີດຄຳຖາມເກົ່າຄືນ$$, 'body', $$ເຄື່ອງມືການເງິນແບບດິຈິຕອນ, ຕັ້ງໂປຣແກຣມໄດ້ ແລະ ກະຈາຍອຳນາດ ນຳຄຳຖາມປະຫວັດສາດຄືນມາ ວ່າໃຜຄວບຄຸມເງິນ ແລະ ເງິນນັ້ນແຂງພຽງໃດ.$$)
  ),
  key_takeaways_en = array[$$Monetary systems are designed tools, not natural constants$$, $$Structural deficits create ongoing pressure toward currency depreciation$$, $$Understand why savers are pushed toward riskier assets over time$$],
  key_takeaways_lo = array[$$ລະບົບເງິນຕາເປັນເຄື່ອງມືທີ່ຖືກອອກແບບ ບໍ່ແມ່ນຄ່າຄົງທີ່ທຳມະຊາດ$$, $$ການຂາດດຸນທາງໂຄງສ້າງສ້າງຄວາມກົດດັນຢ່າງຕໍ່ເນື່ອງໃຫ້ເງິນຕົກຄ່າ$$, $$ເຂົ້າໃຈວ່າເປັນຫຍັງຄົນອອມຖືກຜັກດັນສູ່ຊັບສິນສ່ຽງຫຼາຍຂຶ້ນຕາມເວລາ$$]
where book_id = 'f87483d4-ee14-4014-83f7-ee2bdd286e8a';
