-- Bulk lesson-pool seed: Money lessons direction.
-- Adds original, evergreen everyday-finance lessons (each with a concrete
-- worked example) so the pool has 50+ published lessons before launch;
-- the weekly content-forge job continues to add on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'LESSON', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$track-every-expense-for-one-week$$,
    $$Track every expense for one week$$,
    $$ບັນທຶກລາຍຈ່າຍທຸກຢ່າງເປັນເວລາໜຶ່ງອາທິດ$$,
    $$Most people are surprised by where their money actually goes once they write it all down.$$,
    $$ຄົນສ່ວນຫຼາຍແປກໃຈເມື່ອເຫັນວ່າເງິນຂອງຕົນໄປໃສແທ້ໆເມື່ອຂຽນທຸກຢ່າງອອກມາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write down every single kip spent$$, 'body', $$For seven days, note every purchase — even a 5,000 LAK coffee or a 10,000 LAK snack. Small purchases add up faster than people expect.$$),
      jsonb_build_object('heading', $$Example: a week's small purchases$$, 'body', $$Coffee 5,000 LAK x 5 days = 25,000 LAK. Snacks 10,000 LAK x 4 days = 40,000 LAK. That's 65,000 LAK gone before any "real" spending — seeing this total is the point of the exercise.$$),
      jsonb_build_object('heading', $$Review it at the end of the week$$, 'body', $$Sort the list into categories and notice the one you'd most like to reduce next week — one honest look is more useful than a perfect app.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກທຸກກີບທີ່ໃຊ້ຈ່າຍ$$, 'body', $$ເປັນເວລາ 7 ວັນ ໃຫ້ບັນທຶກທຸກການຊື້ — ແມ່ນແຕ່ກາເຟ 5,000 ກີບ ຫຼືເຄື່ອງກິນຫຼິ້ນ 10,000 ກີບ. ລາຍຈ່າຍນ້ອຍສະສົມໄວກວ່າທີ່ຄາດ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ລາຍຈ່າຍນ້ອຍໃນໜຶ່ງອາທິດ$$, 'body', $$ກາເຟ 5,000 ກີບ x 5 ວັນ = 25,000 ກີບ. ເຄື່ອງກິນຫຼິ້ນ 10,000 ກີບ x 4 ວັນ = 40,000 ກີບ. ລວມ 65,000 ກີບ ໝົດໄປກ່ອນລາຍຈ່າຍ "ແທ້ໆ" ອື່ນ — ການເຫັນຕົວເລກລວມນີ້ຄືຈຸດປະສົງຂອງແບບຝຶກຫັດນີ້.$$),
      jsonb_build_object('heading', $$ທົບທວນທ້າຍອາທິດ$$, 'body', $$ຈັດລາຍການເປັນໝວດໝູ່ ແລະ ສັງເກດໝວດທີ່ຢາກຫຼຸດອາທິດໜ້າ — ການເບິ່ງຢ່າງຊື່ສັດຄັ້ງດຽວ ເປັນປະໂຫຍດຫຼາຍກວ່າແອັບທີ່ສົມບູນແບບ.$$)
    ),
    array[$$Write down every purchase, even small ones, for a week$$, $$Small daily purchases add up faster than expected$$, $$Review the total by category to find one thing to cut$$],
    array[$$ບັນທຶກທຸກການຊື້ ແມ່ນແຕ່ອັນນ້ອຍ ເປັນເວລາໜຶ່ງອາທິດ$$, $$ລາຍຈ່າຍນ້ອຍປະຈຳວັນສະສົມໄວກວ່າທີ່ຄາດ$$, $$ທົບທວນຍອດລວມຕາມໝວດເພື່ອຫາສິ່ງໜຶ່ງທີ່ຈະຫຼຸດ$$],
    4, false, 20
  ),
  (
    $$understand-needs-vs-wants$$,
    $$Understand the difference between needs and wants$$,
    $$ເຂົ້າໃຈຄວາມແຕກຕ່າງລະຫວ່າງຄວາມຈຳເປັນ ແລະ ຄວາມຢາກໄດ້$$,
    $$A simple question before every purchase prevents most regretted spending.$$,
    $$ຄຳຖາມງ່າຍໆກ່ອນການຊື້ທຸກຄັ້ງ ປ້ອງກັນການໃຊ້ຈ່າຍທີ່ເສຍໃຈພາຍຫຼັງສ່ວນຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask "would I survive without this today?"$$, 'body', $$Rice, rent, and transport to work are needs. A new phone case when the old one still works is a want — neither is wrong, but naming it clearly helps.$$),
      jsonb_build_object('heading', $$Example: a 200,000 LAK decision$$, 'body', $$A pair of shoes at 200,000 LAK when your current pair has holes is a need. The same shoes when your closet already has five pairs is a want worth pausing on.$$),
      jsonb_build_object('heading', $$Wants aren't forbidden, just planned$$, 'body', $$Once a need is covered, budget a specific amount for wants on purpose — this removes guilt and keeps spending intentional.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມ "ບໍ່ມີອັນນີ້ຈະຢູ່ໄດ້ບໍ່ມື້ນີ້?"$$, 'body', $$ເຂົ້າ, ຄ່າເຊົ່າ ແລະ ຄ່າໂດຍສານໄປວຽກ ຄືຄວາມຈຳເປັນ. ເຄສໂທລະສັບໃໝ່ທັງທີ່ອັນເກົ່າຍັງໃຊ້ໄດ້ ຄືຄວາມຢາກໄດ້ — ບໍ່ມີອັນໃດຜິດ ແຕ່ການລະບຸໃຫ້ຊັດຊ່ວຍໄດ້.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ການຕັດສິນໃຈ 200,000 ກີບ$$, 'body', $$ເກີບຄູ່ໃໝ່ລາຄາ 200,000 ກີບ ຕອນຄູ່ເກົ່າຂາດແລ້ວ ຄືຄວາມຈຳເປັນ. ເກີບແບບດຽວກັນຕອນຕູ້ມີແລ້ວ 5 ຄູ່ ຄືຄວາມຢາກໄດ້ທີ່ຄວນຢຸດຄິດກ່ອນ.$$),
      jsonb_build_object('heading', $$ຄວາມຢາກໄດ້ບໍ່ໄດ້ຫ້າມ ພຽງແຕ່ຕ້ອງວາງແຜນ$$, 'body', $$ເມື່ອຄວາມຈຳເປັນຄອບຄຸມແລ້ວ ໃຫ້ຕັ້ງງົບຈຳນວນໜຶ່ງສຳລັບຄວາມຢາກໄດ້ໂດຍຕັ້ງໃຈ — ນີ້ລົບຄວາມຮູ້ສຶກຜິດ ແລະ ຮັກສາການໃຊ້ຈ່າຍໃຫ້ມີຈຸດປະສົງ.$$)
    ),
    array[$$Ask whether you'd survive without it today$$, $$Pause on wants, especially bigger purchases$$, $$Budget a specific amount for wants instead of feeling guilty$$],
    array[$$ຖາມວ່າບໍ່ມີອັນນີ້ຈະຢູ່ໄດ້ບໍ່ມື້ນີ້$$, $$ຢຸດຄິດກ່ອນຄວາມຢາກໄດ້ ໂດຍສະເພາະການຊື້ໃຫຍ່$$, $$ຕັ້ງງົບສະເພາະສຳລັບຄວາມຢາກໄດ້ ແທນການຮູ້ສຶກຜິດ$$],
    4, false, 21
  ),
  (
    $$build-an-emergency-fund-step-by-step$$,
    $$Build an emergency fund step by step$$,
    $$ສ້າງເງິນສະສົມສຸກເສີນທີລະຂັ້ນຕອນ$$,
    $$Start with a small, specific target rather than an overwhelming abstract goal.$$,
    $$ເລີ່ມດ້ວຍເປົ້າໝາຍນ້ອຍ ແລະ ສະເພາະ ແທນເປົ້າໝາຍໃຫຍ່ທີ່ບໍ່ຊັດເຈນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with a small first milestone$$, 'body', $$Instead of aiming for months of expenses right away, target 500,000 LAK first — enough to cover a small unexpected repair or medical visit.$$),
      jsonb_build_object('heading', $$Example: saving toward the first milestone$$, 'body', $$Saving 25,000 LAK a week reaches 500,000 LAK in 20 weeks — about five months. Adjust the weekly amount to whatever is realistic for your income.$$),
      jsonb_build_object('heading', $$Keep it separate and hard to touch$$, 'body', $$A different account or a physical envelope kept out of daily reach makes it less likely to get spent on non-emergencies.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍເປົ້າໝາຍທຳອິດນ້ອຍ$$, 'body', $$ແທນທີ່ຈະຕັ້ງເປົ້າຄ່າໃຊ້ຈ່າຍຫຼາຍເດືອນທັນທີ ໃຫ້ເລັງ 500,000 ກີບກ່ອນ — ພຽງພໍສຳລັບການສ້ອມແປງນ້ອຍ ຫຼືໄປຫາໝໍທີ່ບໍ່ຄາດຄິດ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ອອມໄປສູ່ເປົ້າໝາຍທຳອິດ$$, 'body', $$ອອມ 25,000 ກີບຕໍ່ອາທິດ ຈະຮອດ 500,000 ກີບໃນ 20 ອາທິດ — ປະມານ 5 ເດືອນ. ປັບຈຳນວນຕໍ່ອາທິດຕາມລາຍໄດ້ຈິງຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ແຍກອອກ ແລະ ບໍ່ໃຫ້ແຕະງ່າຍ$$, 'body', $$ບັນຊີແຍກ ຫຼືຊອງເງິນທີ່ບໍ່ໄດ້ຢູ່ໃນມືປະຈຳວັນ ຫຼຸດໂອກາດທີ່ຈະຖືກໃຊ້ໃນເລື່ອງທີ່ບໍ່ແມ່ນສຸກເສີນ.$$)
    ),
    array[$$Start with a small first milestone like 500,000 LAK$$, $$Break it into a realistic weekly savings amount$$, $$Keep the fund in a separate, hard-to-touch place$$],
    array[$$ເລີ່ມດ້ວຍເປົ້າໝາຍທຳອິດນ້ອຍ ເຊັ່ນ 500,000 ກີບ$$, $$ແບ່ງເປັນຈຳນວນອອມຕໍ່ອາທິດທີ່ເຮັດໄດ້ຈິງ$$, $$ເກັບເງິນສະສົມໄວ້ບ່ອນແຍກທີ່ບໍ່ໃຫ້ແຕະງ່າຍ$$],
    5, false, 22
  ),
  (
    $$avoid-impulse-buying-with-24-hour-rule$$,
    $$Avoid impulse buying with a 24-hour rule$$,
    $$ຫຼີກລ້ຽງການຊື້ຕາມໃຈດ້ວຍກົດລໍ 24 ຊົ່ວໂມງ$$,
    $$Waiting one day before a non-essential purchase filters out most regretted spending.$$,
    $$ການລໍໜຶ່ງມື້ກ່ອນຊື້ຂອງທີ່ບໍ່ຈຳເປັນ ກັ່ນຕອງລາຍຈ່າຍທີ່ເສຍໃຈພາຍຫຼັງອອກໄດ້ສ່ວນຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a simple personal rule$$, 'body', $$For anything over a set amount that isn't a need, wait 24 hours before buying — the urge often fades on its own.$$),
      jsonb_build_object('heading', $$Example: a 300,000 LAK jacket$$, 'body', $$See a jacket for 300,000 LAK while browsing. Write it down, close the app, and revisit tomorrow — if you still want it and can afford it, buy it then.$$),
      jsonb_build_object('heading', $$Notice how often you don't go back$$, 'body', $$Keep a simple tally of how many times you decided not to buy after waiting — seeing the count builds confidence in the habit.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງກົດງ່າຍໆສ່ວນຕົວ$$, 'body', $$ສຳລັບອັນທີ່ເກີນຈຳນວນທີ່ກຳນົດ ແລະ ບໍ່ແມ່ນຄວາມຈຳເປັນ ໃຫ້ລໍ 24 ຊົ່ວໂມງກ່ອນຊື້ — ຄວາມຢາກໄດ້ມັກຈາງໄປເອງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ເສື້ອແຈັກເກັດ 300,000 ກີບ$$, 'body', $$ເຫັນເສື້ອແຈັກເກັດລາຄາ 300,000 ກີບຕອນເລື່ອນເບິ່ງ. ຈົດໄວ້, ປິດແອັບ ແລ້ວກັບມາເບິ່ງມື້ອື່ນ — ຖ້າຍັງຢາກໄດ້ ແລະ ຈ່າຍໄດ້ ຄ່ອຍຊື້ຕອນນັ້ນ.$$),
      jsonb_build_object('heading', $$ສັງເກດວ່າມັກບໍ່ກັບໄປຊື້ເລື້ອຍປານໃດ$$, 'body', $$ນັບຈຳນວນຄັ້ງທີ່ຕັດສິນໃຈບໍ່ຊື້ຫຼັງລໍແລ້ວ — ການເຫັນຕົວເລກນີ້ສ້າງຄວາມໝັ້ນໃຈໃນນິໄສ.$$)
    ),
    array[$$Wait 24 hours before any non-essential purchase over a set amount$$, $$Write it down and revisit the decision the next day$$, $$Track how often you decide not to buy after waiting$$],
    array[$$ລໍ 24 ຊົ່ວໂມງກ່ອນຊື້ອັນທີ່ບໍ່ຈຳເປັນເກີນຈຳນວນທີ່ກຳນົດ$$, $$ຈົດໄວ້ ແລະ ກັບມາຕັດສິນໃຈມື້ອື່ນ$$, $$ນັບຈຳນວນຄັ້ງທີ່ຕັດສິນໃຈບໍ່ຊື້ຫຼັງລໍແລ້ວ$$],
    3, false, 23
  ),
  (
    $$understand-compound-interest-with-an-example$$,
    $$Understand compound interest with a real example$$,
    $$ເຂົ້າໃຈດອກເບ້ຍທົບຕົ້ນດ້ວຍຕົວຢ່າງຈິງ$$,
    $$Money that earns interest on its own interest grows far faster than most people expect.$$,
    $$ເງິນທີ່ໄດ້ດອກເບ້ຍຈາກດອກເບ້ຍຂອງມັນເອງ ເຕີບໂຕໄວກວ່າທີ່ຄົນສ່ວນຫຼາຍຄາດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Simple interest vs compound interest$$, 'body', $$Simple interest pays only on your original amount each year. Compound interest pays on your original amount plus all interest already earned.$$),
      jsonb_build_object('heading', $$Example: 1,000,000 LAK at 5% a year$$, 'body', $$Year 1: 1,050,000 LAK. Year 2: 1,102,500 LAK (5% of the new total, not just the original). After 10 years, it's about 1,628,900 LAK — more than simple interest would give.$$),
      jsonb_build_object('heading', $$Time matters more than the amount$$, 'body', $$Starting small but early often beats starting large but late — compound growth needs time to build momentum.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ດອກເບ້ຍທຳມະດາ ທຽບກັບດອກເບ້ຍທົບຕົ້ນ$$, 'body', $$ດອກເບ້ຍທຳມະດາຈ່າຍແຕ່ຈາກຈຳນວນຕົ້ນທຸກປີ. ດອກເບ້ຍທົບຕົ້ນຈ່າຍຈາກຈຳນວນຕົ້ນບວກກັບດອກເບ້ຍທັງໝົດທີ່ໄດ້ຮັບໄປແລ້ວ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: 1,000,000 ກີບ ດອກເບ້ຍ 5% ຕໍ່ປີ$$, 'body', $$ປີທີ 1: 1,050,000 ກີບ. ປີທີ 2: 1,102,500 ກີບ (5% ຂອງຍອດໃໝ່ ບໍ່ແມ່ນແຕ່ຈຳນວນຕົ້ນ). ຫຼັງ 10 ປີ ຈະໄດ້ປະມານ 1,628,900 ກີບ — ຫຼາຍກວ່າດອກເບ້ຍທຳມະດາໃຫ້.$$),
      jsonb_build_object('heading', $$ເວລາສຳຄັນກວ່າຈຳນວນ$$, 'body', $$ເລີ່ມນ້ອຍແຕ່ໄວ ມັກດີກວ່າເລີ່ມຫຼາຍແຕ່ຊ້າ — ການເຕີບໂຕແບບທົບຕົ້ນຕ້ອງການເວລາເພື່ອສ້າງແຮງຂັບເຄື່ອນ.$$)
    ),
    array[$$Compound interest pays on interest already earned, not just the original$$, $$1,000,000 LAK at 5% grows to about 1,628,900 LAK in 10 years$$, $$Starting early matters more than starting with a large amount$$],
    array[$$ດອກເບ້ຍທົບຕົ້ນຈ່າຍຈາກດອກເບ້ຍທີ່ໄດ້ຮັບແລ້ວ ບໍ່ແມ່ນແຕ່ຕົ້ນ$$, $$1,000,000 ກີບທີ່ 5% ເຕີບໂຕເປັນປະມານ 1,628,900 ກີບໃນ 10 ປີ$$, $$ການເລີ່ມໄວສຳຄັນກວ່າການເລີ່ມດ້ວຍຈຳນວນຫຼາຍ$$],
    5, false, 24
  ),
  (
    $$set-a-savings-goal-with-a-deadline$$,
    $$Set a savings goal with a real deadline$$,
    $$ຕັ້ງເປົ້າໝາຍອອມເງິນພ້ອມກຳນົດເວລາຈິງ$$,
    $$A specific target and date turns "I should save more" into a plan you can actually follow.$$,
    $$ເປົ້າໝາຍ ແລະ ວັນທີສະເພາະ ປ່ຽນ "ຄວນອອມຫຼາຍຂຶ້ນ" ໃຫ້ເປັນແຜນທີ່ເຮັດໄດ້ຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name the goal and the number$$, 'body', $$"A new phone" is vague. "A 2,000,000 LAK phone by December" is a plan you can actually work toward.$$),
      jsonb_build_object('heading', $$Example: breaking down the target$$, 'body', $$2,000,000 LAK over 8 months means saving 250,000 LAK a month, or about 8,300 LAK a day — a much less intimidating number to focus on.$$),
      jsonb_build_object('heading', $$Track progress somewhere visible$$, 'body', $$A simple chart or jar you can see daily keeps the goal real, instead of an abstract number you forget about.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງຊື່ເປົ້າໝາຍ ແລະ ຕົວເລກ$$, 'body', $$"ໂທລະສັບໃໝ່" ບໍ່ຊັດເຈນ. "ໂທລະສັບ 2,000,000 ກີບພາຍໃນເດືອນທັນວາ" ຄືແຜນທີ່ເຮັດໄດ້ຈິງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ແບ່ງເປົ້າໝາຍອອກ$$, 'body', $$2,000,000 ກີບໃນ 8 ເດືອນ ໝາຍຄວາມວ່າອອມ 250,000 ກີບຕໍ່ເດືອນ ຫຼືປະມານ 8,300 ກີບຕໍ່ວັນ — ຕົວເລກທີ່ໜ້າຢ້ານໜ້ອຍລົງຫຼາຍທີ່ຈະສຸມໃສ່.$$),
      jsonb_build_object('heading', $$ຕິດຕາມຄວາມຄືບໜ້າໃນບ່ອນທີ່ເຫັນໄດ້$$, 'body', $$ຕາຕະລາງ ຫຼືກະປ໋ອງທີ່ເຫັນໄດ້ທຸກມື້ ຮັກສາເປົ້າໝາຍໃຫ້ຮູ້ສຶກຈິງ ແທນທີ່ຈະເປັນຕົວເລກທີ່ລືມໄປ.$$)
    ),
    array[$$Name a specific goal amount and deadline, not a vague wish$$, $$Break the total down into a monthly or daily amount$$, $$Track progress somewhere you'll actually see it$$],
    array[$$ຕັ້ງຊື່ເປົ້າໝາຍ ແລະ ກຳນົດເວລາທີ່ຊັດເຈນ ບໍ່ແມ່ນຄວາມຫວັງທົ່ວໄປ$$, $$ແບ່ງຍອດລວມເປັນຈຳນວນຕໍ່ເດືອນ ຫຼືຕໍ່ວັນ$$, $$ຕິດຕາມຄວາມຄືບໜ້າໃນບ່ອນທີ່ຈະເຫັນໄດ້ຈິງ$$],
    4, false, 25
  ),
  (
    $$avoid-common-debt-traps$$,
    $$Avoid common debt traps$$,
    $$ຫຼີກລ້ຽງບັນຫາໜີ້ສິນທົ່ວໄປ$$,
    $$Debt that grows faster than you can repay it usually starts with a small, ordinary decision.$$,
    $$ໜີ້ສິນທີ່ເຕີບໂຕໄວກວ່າທີ່ຈະໃຊ້ຄືນໄດ້ ມັກເລີ່ມຈາກການຕັດສິນໃຈນ້ອຍໆທຳມະດາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Watch for minimum-payment traps$$, 'body', $$Paying only the minimum on a debt with high interest can mean the balance barely shrinks, even while you pay every month.$$),
      jsonb_build_object('heading', $$Example: borrowing to cover borrowing$$, 'body', $$Taking a new small loan to pay an old one is a common trap — if you find yourself doing this, it's time to pause and get help with a plan.$$),
      jsonb_build_object('heading', $$Read every loan term before agreeing$$, 'body', $$Understand the total interest, fees, and penalty terms fully — a loan that seems easy today can compound into a much bigger burden.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະວັງກັບດັກການຈ່າຍຂັ້ນຕ່ຳ$$, 'body', $$ການຈ່າຍພຽງຂັ້ນຕ່ຳໃນໜີ້ທີ່ດອກເບ້ຍສູງ ອາດເຮັດໃຫ້ຍອດຄ້າງບໍ່ຄ່ອຍຫຼຸດ ເຖິງແມ່ນຈ່າຍທຸກເດືອນ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ກູ້ໃໝ່ເພື່ອຈ່າຍໜີ້ເກົ່າ$$, 'body', $$ການກູ້ໃໝ່ນ້ອຍໆເພື່ອຈ່າຍໜີ້ເກົ່າ ເປັນກັບດັກທົ່ວໄປ — ຖ້າພົບວ່າຕົນເອງເຮັດແບບນີ້ ຮອດເວລາຢຸດ ແລະ ຫາຄວາມຊ່ວຍເຫຼືອວາງແຜນ.$$),
      jsonb_build_object('heading', $$ອ່ານທຸກເງື່ອນໄຂເງິນກູ້ກ່ອນຕົກລົງ$$, 'body', $$ເຂົ້າໃຈດອກເບ້ຍລວມ, ຄ່າທຳນຽມ ແລະ ເງື່ອນໄຂການປັບໃໝໃຫ້ຄົບ — ເງິນກູ້ທີ່ເບິ່ງງ່າຍມື້ນີ້ ອາດທົບຕົ້ນເປັນພາລະໃຫຍ່ຂຶ້ນ.$$)
    ),
    array[$$Watch for minimum payments that barely reduce the balance$$, $$Never borrow new debt just to pay off old debt$$, $$Read every loan term fully before agreeing$$],
    array[$$ລະວັງການຈ່າຍຂັ້ນຕ່ຳທີ່ບໍ່ຄ່ອຍຫຼຸດຍອດຄ້າງ$$, $$ຢ່າກູ້ໃໝ່ພຽງເພື່ອຈ່າຍໜີ້ເກົ່າ$$, $$ອ່ານທຸກເງື່ອນໄຂເງິນກູ້ໃຫ້ຄົບກ່ອນຕົກລົງ$$],
    5, false, 26
  ),
  (
    $$understand-interest-rates-on-loans$$,
    $$Understand interest rates on loans before borrowing$$,
    $$ເຂົ້າໃຈອັດຕາດອກເບ້ຍເງິນກູ້ກ່ອນຢືມ$$,
    $$The interest rate determines how much a loan actually costs beyond the amount borrowed.$$,
    $$ອັດຕາດອກເບ້ຍກຳນົດວ່າເງິນກູ້ຄ່າໃຊ້ຈ່າຍແທ້ຈິງເທົ່າໃດ ນອກເໜືອຈາກຈຳນວນທີ່ຢືມ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for the annual rate clearly$$, 'body', $$Some lenders quote a monthly rate that sounds small but is large when converted to a yearly figure — always ask for the annual percentage.$$),
      jsonb_build_object('heading', $$Example: 2% a month adds up fast$$, 'body', $$2% a month sounds small but equals roughly 24-27% a year with compounding — on a 1,000,000 LAK loan, that's a real, significant cost.$$),
      jsonb_build_object('heading', $$Compare before choosing a lender$$, 'body', $$Checking rates from more than one source before borrowing can save a meaningful amount over the life of the loan.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມອັດຕາຕໍ່ປີໃຫ້ຊັດເຈນ$$, 'body', $$ຜູ້ໃຫ້ກູ້ບາງລາຍບອກອັດຕາຕໍ່ເດືອນທີ່ຟັງເບິ່ງນ້ອຍ ແຕ່ໃຫຍ່ເມື່ອປ່ຽນເປັນຕໍ່ປີ — ໃຫ້ຖາມອັດຕາຕໍ່ປີສະເໝີ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: 2% ຕໍ່ເດືອນ ສະສົມໄວ$$, 'body', $$2% ຕໍ່ເດືອນ ຟັງເບິ່ງນ້ອຍ ແຕ່ເທົ່າກັບປະມານ 24-27% ຕໍ່ປີເມື່ອທົບຕົ້ນ — ໃນເງິນກູ້ 1,000,000 ກີບ ນັ້ນເປັນຄ່າໃຊ້ຈ່າຍທີ່ສຳຄັນຈິງ.$$),
      jsonb_build_object('heading', $$ປຽບທຽບກ່ອນເລືອກຜູ້ໃຫ້ກູ້$$, 'body', $$ການກວດອັດຕາຈາກຫຼາຍແຫຼ່ງກ່ອນຢືມ ອາດປະຢັດໄດ້ຈຳນວນທີ່ສຳຄັນຕະຫຼອດອາຍຸເງິນກູ້.$$)
    ),
    array[$$Always ask for the annual interest rate, not just monthly$$, $$A small-sounding monthly rate can mean a large yearly cost$$, $$Compare rates from more than one lender before borrowing$$],
    array[$$ຖາມອັດຕາດອກເບ້ຍຕໍ່ປີສະເໝີ ບໍ່ແມ່ນແຕ່ຕໍ່ເດືອນ$$, $$ອັດຕາຕໍ່ເດືອນທີ່ຟັງນ້ອຍ ອາດໝາຍເຖິງຄ່າໃຊ້ຈ່າຍຕໍ່ປີທີ່ໃຫຍ່$$, $$ປຽບທຽບອັດຕາຈາກຫຼາຍແຫຼ່ງກ່ອນຢືມ$$],
    5, false, 27
  ),
  (
    $$use-the-50-30-20-budgeting-rule$$,
    $$Use the 50/30/20 budgeting rule$$,
    $$ໃຊ້ກົດງົບປະມານ 50/30/20$$,
    $$A simple three-way split gives structure without needing to track every category in detail.$$,
    $$ການແບ່ງສາມສ່ວນງ່າຍໆ ໃຫ້ໂຄງສ້າງໂດຍບໍ່ຕ້ອງຕິດຕາມທຸກໝວດຢ່າງລະອຽດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$The three buckets$$, 'body', $$50% of income for needs (rent, food, transport), 30% for wants (entertainment, eating out), and 20% for savings and debt repayment.$$),
      jsonb_build_object('heading', $$Example: on a 3,000,000 LAK monthly income$$, 'body', $$Needs: 1,500,000 LAK. Wants: 900,000 LAK. Savings/debt: 600,000 LAK. Use these as a starting guide, then adjust the percentages to fit your real life.$$),
      jsonb_build_object('heading', $$Adjust the ratio to your real situation$$, 'body', $$If needs take up more than 50% of your income, that's useful information — it may point to where a bigger change is needed.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສາມສ່ວນຫຼັກ$$, 'body', $$50% ຂອງລາຍໄດ້ສຳລັບຄວາມຈຳເປັນ (ຄ່າເຊົ່າ, ອາຫານ, ການເດີນທາງ), 30% ສຳລັບຄວາມຢາກໄດ້ (ບັນເທີງ, ກິນນອກ) ແລະ 20% ສຳລັບເງິນອອມ ແລະ ຈ່າຍໜີ້.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ລາຍໄດ້ 3,000,000 ກີບຕໍ່ເດືອນ$$, 'body', $$ຄວາມຈຳເປັນ: 1,500,000 ກີບ. ຄວາມຢາກໄດ້: 900,000 ກີບ. ອອມ/ຈ່າຍໜີ້: 600,000 ກີບ. ໃຊ້ນີ້ເປັນຄູ່ມືເລີ່ມຕົ້ນ ແລ້ວປັບອັດຕາສ່ວນຕາມຊີວິດຈິງ.$$),
      jsonb_build_object('heading', $$ປັບອັດຕາສ່ວນຕາມສະຖານະການຈິງ$$, 'body', $$ຖ້າຄວາມຈຳເປັນກິນເກີນ 50% ຂອງລາຍໄດ້ ນັ້ນເປັນຂໍ້ມູນທີ່ເປັນປະໂຫຍດ — ອາດຊີ້ໃຫ້ເຫັນວ່າຕ້ອງການການປ່ຽນແປງໃຫຍ່ຢູ່ໃສ.$$)
    ),
    array[$$Split income roughly 50% needs, 30% wants, 20% savings$$, $$On 3,000,000 LAK, that's 1.5M / 900K / 600K as a starting guide$$, $$Adjust the ratio if it doesn't fit your real situation$$],
    array[$$ແບ່ງລາຍໄດ້ປະມານ 50% ຈຳເປັນ, 30% ຢາກໄດ້, 20% ອອມ$$, $$ໃນ 3,000,000 ກີບ ຄື 1.5 ລ້ານ / 900 ພັນ / 600 ພັນເປັນຄູ່ມືເລີ່ມຕົ້ນ$$, $$ປັບອັດຕາສ່ວນຖ້າບໍ່ເໝາະກັບສະຖານະການຈິງ$$],
    4, false, 28
  ),
  (
    $$save-automatically-before-spending$$,
    $$Save automatically before you start spending$$,
    $$ອອມອັດຕະໂນມັດກ່ອນເລີ່ມໃຊ້ຈ່າຍ$$,
    $$Moving savings out first removes the willpower needed to save from whatever's left over.$$,
    $$ການຍ້າຍເງິນອອມອອກກ່ອນ ລົບຄວາມຈຳເປັນທີ່ຕ້ອງໃຊ້ຄວາມຕັ້ງໃຈອອມຈາກສ່ວນທີ່ເຫຼືອ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Move savings on payday, not at month's end$$, 'body', $$Transfer a fixed amount to savings the moment income arrives, before any spending happens — waiting until the end rarely leaves anything.$$),
      jsonb_build_object('heading', $$Example: 10% off the top$$, 'body', $$On a 2,500,000 LAK salary, move 250,000 LAK to savings first, then plan the remaining 2,250,000 LAK for everything else.$$),
      jsonb_build_object('heading', $$Automate it if possible$$, 'body', $$A standing transfer or a habit done the same day every payday removes the need to remember or decide each time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຍ້າຍເງິນອອມມື້ຮັບເງິນເດືອນ ບໍ່ແມ່ນທ້າຍເດືອນ$$, 'body', $$ໂອນຈຳນວນຄົງທີ່ໄປອອມທັນທີທີ່ໄດ້ຮັບລາຍໄດ້ ກ່ອນເລີ່ມໃຊ້ຈ່າຍ — ການລໍຈົນທ້າຍເດືອນ ມັກບໍ່ເຫຼືອຫຍັງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ຫັກ 10% ອອກກ່ອນ$$, 'body', $$ໃນເງິນເດືອນ 2,500,000 ກີບ ຍ້າຍ 250,000 ກີບໄປອອມກ່ອນ ແລ້ວວາງແຜນ 2,250,000 ກີບທີ່ເຫຼືອສຳລັບທຸກຢ່າງອື່ນ.$$),
      jsonb_build_object('heading', $$ຕັ້ງອັດຕະໂນມັດຖ້າເປັນໄປໄດ້$$, 'body', $$ການໂອນອັດຕະໂນມັດ ຫຼືນິໄສທີ່ເຮັດວັນດຽວກັນທຸກຄັ້ງທີ່ຮັບເງິນເດືອນ ລົບຄວາມຈຳເປັນຕ້ອງຈື່ ຫຼືຕັດສິນໃຈທຸກຄັ້ງ.$$)
    ),
    array[$$Move a fixed savings amount the moment income arrives$$, $$On 2,500,000 LAK, saving 10% means 250,000 LAK off the top$$, $$Automate the transfer so it doesn't rely on willpower$$],
    array[$$ຍ້າຍຈຳນວນອອມຄົງທີ່ທັນທີທີ່ໄດ້ຮັບລາຍໄດ້$$, $$ໃນ 2,500,000 ກີບ ອອມ 10% ຄື 250,000 ກີບອອກກ່ອນ$$, $$ຕັ້ງການໂອນອັດຕະໂນມັດ ບໍ່ໃຫ້ອີງໃສ່ຄວາມຕັ້ງໃຈ$$],
    4, false, 29
  ),
  (
    $$understand-good-debt-vs-bad-debt$$,
    $$Understand the difference between good debt and bad debt$$,
    $$ເຂົ້າໃຈຄວາມແຕກຕ່າງລະຫວ່າງໜີ້ດີ ແລະ ໜີ້ບໍ່ດີ$$,
    $$Debt that builds future value is different from debt that only funds spending that's already gone.$$,
    $$ໜີ້ທີ່ສ້າງມູນຄ່າອະນາຄົດ ຕ່າງຈາກໜີ້ທີ່ພຽງແຕ່ໃຊ້ຈ່າຍໄປແລ້ວໝົດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Good debt tends to build value$$, 'body', $$A loan for education, a work tool, or a small business that generates income can pay for itself over time.$$),
      jsonb_build_object('heading', $$Bad debt funds spending that's already gone$$, 'body', $$Borrowing for a vacation, a party, or everyday consumables leaves you paying interest on something with no lasting value.$$),
      jsonb_build_object('heading', $$Example: two 2,000,000 LAK loans$$, 'body', $$A 2,000,000 LAK loan for a sewing machine that earns 300,000 LAK a month pays for itself in under a year. The same amount borrowed for a party leaves only the debt.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໜີ້ດີມັກສ້າງມູນຄ່າ$$, 'body', $$ເງິນກູ້ເພື່ອການສຶກສາ, ເຄື່ອງມືເຮັດວຽກ ຫຼືທຸລະກິດນ້ອຍທີ່ສ້າງລາຍໄດ້ ອາດຄືນທຶນຕົນເອງໄດ້ຕາມເວລາ.$$),
      jsonb_build_object('heading', $$ໜີ້ບໍ່ດີໃຊ້ຈ່າຍໃນສິ່ງທີ່ໝົດໄປແລ້ວ$$, 'body', $$ການກູ້ໄປທ່ຽວ, ງານລ້ຽງ ຫຼືເຄື່ອງໃຊ້ປະຈຳວັນ ເຮັດໃຫ້ຈ່າຍດອກເບ້ຍໃນສິ່ງທີ່ບໍ່ມີມູນຄ່າຄົງຢູ່.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ສອງເງິນກູ້ 2,000,000 ກີບ$$, 'body', $$ເງິນກູ້ 2,000,000 ກີບສຳລັບຈັກຫຍິບເຄື່ອງທີ່ຫາລາຍໄດ້ 300,000 ກີບຕໍ່ເດືອນ ຄືນທຶນພາຍໃນໜ້ອຍກວ່າໜຶ່ງປີ. ຈຳນວນດຽວກັນທີ່ກູ້ໄປງານລ້ຽງ ເຫຼືອແຕ່ໜີ້.$$)
    ),
    array[$$Good debt builds future value that can pay for itself$$, $$Bad debt funds spending that leaves nothing behind$$, $$Ask what value a loan will build before taking it$$],
    array[$$ໜີ້ດີສ້າງມູນຄ່າອະນາຄົດທີ່ຄືນທຶນຕົນເອງໄດ້$$, $$ໜີ້ບໍ່ດີໃຊ້ຈ່າຍໃນສິ່ງທີ່ບໍ່ເຫຼືອຫຍັງ$$, $$ຖາມວ່າເງິນກູ້ຈະສ້າງມູນຄ່າຫຍັງກ່ອນຢືມ$$],
    4, false, 30
  ),
  (
    $$negotiate-a-bill-down$$,
    $$Negotiate a bill or expense down$$,
    $$ຕໍ່ລອງໃບບິນ ຫຼືຄ່າໃຊ້ຈ່າຍໃຫ້ຫຼຸດລົງ$$,
    $$Many recurring bills have more flexibility than people assume — asking costs nothing.$$,
    $$ໃບບິນທີ່ຈ່າຍປະຈຳຫຼາຍອັນ ມີຄວາມຍືດຫຍຸ່ນຫຼາຍກວ່າທີ່ຄົນສົມມຸດ — ການຖາມບໍ່ເສຍຫຍັງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask directly if there's a better rate$$, 'body', $$A simple "is there a promotion or better plan available?" to an internet or phone provider sometimes reveals real savings.$$),
      jsonb_build_object('heading', $$Example: a small monthly saving adds up$$, 'body', $$Saving just 20,000 LAK a month on a phone or internet plan is 240,000 LAK a year — enough for a real emergency fund contribution.$$),
      jsonb_build_object('heading', $$Compare providers before renewing$$, 'body', $$Checking what a competitor offers before a contract renews gives you real leverage, even if you end up staying with the same provider.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມໂດຍກົງວ່າມີອັດຕາທີ່ດີກວ່າບໍ່$$, 'body', $$ຄຳຖາມງ່າຍໆ "ມີໂປຣໂມຊັນ ຫຼືແພັກທີ່ດີກວ່າບໍ່" ຕໍ່ຜູ້ໃຫ້ບໍລິການອິນເຕີເນັດ ຫຼືໂທລະສັບ ບາງຄັ້ງເປີດເຜີຍການປະຢັດຈິງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ການປະຢັດນ້ອຍຕໍ່ເດືອນສະສົມ$$, 'body', $$ການປະຢັດພຽງ 20,000 ກີບຕໍ່ເດືອນຈາກແພັກໂທລະສັບ ຫຼືອິນເຕີເນັດ ເທົ່າກັບ 240,000 ກີບຕໍ່ປີ — ພຽງພໍສຳລັບເງິນສະສົມສຸກເສີນຈິງ.$$),
      jsonb_build_object('heading', $$ປຽບທຽບຜູ້ໃຫ້ບໍລິການກ່ອນຕໍ່ສັນຍາ$$, 'body', $$ການກວດວ່າຄູ່ແຂ່ງສະເໜີຫຍັງກ່ອນສັນຍາຕໍ່ ໃຫ້ອຳນາຈຕໍ່ລອງຈິງ ເຖິງແມ່ນຈະຢູ່ກັບຜູ້ໃຫ້ບໍລິການເດີມ.$$)
    ),
    array[$$Ask providers directly if a better rate or plan is available$$, $$Even small monthly savings add up meaningfully over a year$$, $$Compare other providers before a contract renews$$],
    array[$$ຖາມຜູ້ໃຫ້ບໍລິການໂດຍກົງວ່າມີອັດຕາ ຫຼືແພັກທີ່ດີກວ່າບໍ່$$, $$ການປະຢັດນ້ອຍຕໍ່ເດືອນ ສະສົມມີຄວາມໝາຍຕະຫຼອດປີ$$, $$ປຽບທຽບຜູ້ໃຫ້ບໍລິການອື່ນກ່ອນສັນຍາຕໍ່$$],
    3, false, 31
  ),
  (
    $$plan-for-irregular-income$$,
    $$Plan a budget for irregular or seasonal income$$,
    $$ວາງແຜນງົບປະມານສຳລັບລາຍໄດ້ທີ່ບໍ່ຄົງທີ່ ຫຼືຕາມລະດູການ$$,
    $$Budget on your lowest expected month, and treat anything extra as bonus savings.$$,
    $$ວາງງົບປະມານຕາມເດືອນທີ່ຄາດວ່າຈະໄດ້ໜ້ອຍທີ່ສຸດ ແລະ ຖືວ່າສ່ວນເກີນເປັນເງິນອອມພິເສດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Base your budget on a low-income month$$, 'body', $$Look at your lowest few months from the past year and build your essential budget around that number, not your best month.$$),
      jsonb_build_object('heading', $$Example: buffering across seasons$$, 'body', $$In a high month earning 4,000,000 LAK, cover the budget of 2,000,000 LAK and save the remaining 2,000,000 LAK toward a slow month ahead.$$),
      jsonb_build_object('heading', $$Build a bigger buffer than a fixed earner needs$$, 'body', $$Irregular income usually needs a larger emergency fund — aim for more months of coverage than someone with steady pay.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອີງງົບປະມານໃສ່ເດືອນລາຍໄດ້ຕ່ຳ$$, 'body', $$ເບິ່ງເດືອນທີ່ໄດ້ໜ້ອຍທີ່ສຸດຈາກປີກ່ອນ ແລະ ສ້າງງົບຈຳເປັນອີງໃສ່ຕົວເລກນັ້ນ ບໍ່ແມ່ນເດືອນທີ່ດີທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ສະສົມສຳຮອງຂ້າມລະດູການ$$, 'body', $$ໃນເດືອນທີ່ໄດ້ດີ 4,000,000 ກີບ ໃຫ້ໃຊ້ຕາມງົບ 2,000,000 ກີບ ແລະ ອອມ 2,000,000 ກີບທີ່ເຫຼືອໄວ້ສຳລັບເດືອນຊ້າຂ້າງໜ້າ.$$),
      jsonb_build_object('heading', $$ສ້າງເງິນສະຫງວນຫຼາຍກວ່າຄົນລາຍໄດ້ຄົງທີ່$$, 'body', $$ລາຍໄດ້ບໍ່ຄົງທີ່ ປົກກະຕິຕ້ອງການເງິນສະສົມສຸກເສີນຫຼາຍກວ່າ — ເລັງໃຫ້ຄອບຄຸມຫຼາຍເດືອນກວ່າຄົນທີ່ໄດ້ເງິນເດືອນຄົງທີ່.$$)
    ),
    array[$$Build your budget around a low-income month, not your best$$, $$Save the extra from high-earning months for slow ones ahead$$, $$Keep a larger emergency buffer than a fixed-salary earner would$$],
    array[$$ສ້າງງົບປະມານອີງໃສ່ເດືອນລາຍໄດ້ຕ່ຳ ບໍ່ແມ່ນເດືອນທີ່ດີທີ່ສຸດ$$, $$ອອມສ່ວນເກີນຈາກເດືອນທີ່ໄດ້ດີໄວ້ສຳລັບເດືອນຊ້າຂ້າງໜ້າ$$, $$ຮັກສາເງິນສະຫງວນຫຼາຍກວ່າຄົນລາຍໄດ້ຄົງທີ່$$],
    4, false, 32
  ),
  (
    $$avoid-lifestyle-inflation$$,
    $$Avoid lifestyle inflation as your income grows$$,
    $$ຫຼີກລ້ຽງການໃຊ້ຈ່າຍເພີ່ມຂຶ້ນຕາມລາຍໄດ້$$,
    $$Spending that grows exactly as fast as income leaves you no better off despite earning more.$$,
    $$ການໃຊ້ຈ່າຍທີ່ເພີ່ມໄວເທົ່າລາຍໄດ້ ເຮັດໃຫ້ບໍ່ດີຂຶ້ນເລີຍ ເຖິງແມ່ນລາຍໄດ້ເພີ່ມຂຶ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Notice the pattern when a raise arrives$$, 'body', $$A pay increase often quietly gets absorbed by a nicer apartment, more eating out, or new habits, leaving savings unchanged.$$),
      jsonb_build_object('heading', $$Example: save half of every raise$$, 'body', $$If your salary increases by 500,000 LAK, put 250,000 LAK toward savings and let the rest fund lifestyle improvements — you still enjoy the raise while building wealth.$$),
      jsonb_build_object('heading', $$Keep a few fixed costs deliberately modest$$, 'body', $$Housing and transport costs that stay controlled, even as income rises, protect your ability to save no matter how much you earn.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັງເກດຮູບແບບຕອນເງິນເດືອນຂຶ້ນ$$, 'body', $$ເງິນເດືອນທີ່ຂຶ້ນ ມັກຖືກໃຊ້ໝົດແບບງຽບໆກັບຫ້ອງເຊົ່າທີ່ດີກວ່າ, ກິນນອກຫຼາຍຂຶ້ນ ຫຼືນິໄສໃໝ່ ໂດຍເງິນອອມບໍ່ປ່ຽນແປງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ອອມເຄິ່ງໜຶ່ງຂອງທຸກການຂຶ້ນເງິນເດືອນ$$, 'body', $$ຖ້າເງິນເດືອນຂຶ້ນ 500,000 ກີບ ໃຫ້ໃສ່ 250,000 ກີບໄປອອມ ແລະ ໃຫ້ສ່ວນທີ່ເຫຼືອປັບປຸງຊີວິດ — ຍັງເພິດເພີນກັບການຂຶ້ນເງິນເດືອນ ພ້ອມສ້າງຄວາມໝັ້ນຄົງ.$$),
      jsonb_build_object('heading', $$ຮັກສາຄ່າໃຊ້ຈ່າຍຄົງທີ່ບາງອັນໃຫ້ພໍປານກາງໂດຍຕັ້ງໃຈ$$, 'body', $$ຄ່າທີ່ຢູ່ອາໄສ ແລະ ການເດີນທາງທີ່ຄວບຄຸມໄດ້ ເຖິງແມ່ນລາຍໄດ້ເພີ່ມ ປົກປ້ອງຄວາມສາມາດອອມໄດ້ ບໍ່ວ່າຫາໄດ້ເທົ່າໃດ.$$)
    ),
    array[$$Notice when spending quietly absorbs every raise$$, $$Save at least half of any raise before adjusting lifestyle$$, $$Keep major fixed costs deliberately modest as income grows$$],
    array[$$ສັງເກດເມື່ອການໃຊ້ຈ່າຍກືນທຸກການຂຶ້ນເງິນເດືອນແບບງຽບໆ$$, $$ອອມຢ່າງໜ້ອຍເຄິ່ງໜຶ່ງຂອງທຸກການຂຶ້ນເງິນເດືອນກ່ອນປັບຊີວິດ$$, $$ຮັກສາຄ່າໃຊ້ຈ່າຍຄົງທີ່ຫຼັກໃຫ້ພໍປານກາງໂດຍຕັ້ງໃຈເມື່ອລາຍໄດ້ເພີ່ມ$$],
    4, false, 33
  ),
  (
    $$understand-inflations-effect-on-savings$$,
    $$Understand inflation's effect on your savings$$,
    $$ເຂົ້າໃຈຜົນກະທົບຂອງເງິນເຟີ້ຕໍ່ເງິນອອມ$$,
    $$Cash that just sits still loses real value over time as prices rise.$$,
    $$ເງິນສົດທີ່ພຽງແຕ່ນອນຢູ່ ເສຍມູນຄ່າແທ້ຈິງໄປຕາມເວລາເມື່ອລາຄາເພີ່ມຂຶ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Prices rise even when your savings don't grow$$, 'body', $$If inflation is 5% a year, something costing 100,000 LAK today costs about 105,000 LAK next year — your money buys less if it isn't also growing.$$),
      jsonb_build_object('heading', $$Example: cash under the mattress vs. growing savings$$, 'body', $$1,000,000 LAK kept as pure cash for 10 years at 5% inflation buys roughly what 610,000 LAK buys today — a real, meaningful loss.$$),
      jsonb_build_object('heading', $$This is why growth-earning savings matter$$, 'body', $$Keeping some savings in an account or option that earns interest helps your money at least keep pace with rising prices.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລາຄາເພີ່ມແມ່ນແຕ່ຕອນເງິນອອມບໍ່ເຕີບໂຕ$$, 'body', $$ຖ້າເງິນເຟີ້ 5% ຕໍ່ປີ ສິ່ງທີ່ລາຄາ 100,000 ກີບມື້ນີ້ ຈະລາຄາປະມານ 105,000 ກີບປີໜ້າ — ເງິນຂອງທ່ານຊື້ໄດ້ໜ້ອຍລົງ ຖ້າບໍ່ໄດ້ເຕີບໂຕເໝືອນກັນ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ເງິນສົດເກັບໄວ້ ທຽບກັບເງິນອອມທີ່ເຕີບໂຕ$$, 'body', $$1,000,000 ກີບທີ່ເກັບເປັນເງິນສົດ 10 ປີ ທີ່ເງິນເຟີ້ 5% ຈະຊື້ໄດ້ປະມານເທົ່າ 610,000 ກີບມື້ນີ້ — ຄວາມສູນເສຍທີ່ຈິງ ແລະ ມີຄວາມໝາຍ.$$),
      jsonb_build_object('heading', $$ນີ້ຄືເຫດຜົນທີ່ເງິນອອມທີ່ເຕີບໂຕສຳຄັນ$$, 'body', $$ການເກັບເງິນອອມສ່ວນໜຶ່ງໄວ້ໃນບັນຊີ ຫຼືທາງເລືອກທີ່ໄດ້ດອກເບ້ຍ ຊ່ວຍໃຫ້ເງິນຢ່າງໜ້ອຍທັນລາຄາທີ່ເພີ່ມຂຶ້ນ.$$)
    ),
    array[$$Prices rise over time even if your cash stays the same$$, $$Pure cash held for years loses real buying power to inflation$$, $$Growth-earning savings help your money keep pace with prices$$],
    array[$$ລາຄາເພີ່ມຂຶ້ນຕາມເວລາ ເຖິງແມ່ນເງິນສົດຂອງທ່ານຄົງທີ່$$, $$ເງິນສົດລ້ວນທີ່ເກັບໄວ້ຫຼາຍປີ ເສຍອຳນາຈຊື້ແທ້ຈິງໃຫ້ເງິນເຟີ້$$, $$ເງິນອອມທີ່ເຕີບໂຕ ຊ່ວຍໃຫ້ເງິນທັນລາຄາທີ່ເພີ່ມຂຶ້ນ$$],
    5, false, 34
  ),
  (
    $$save-for-a-big-purchase-without-a-loan$$,
    $$Save for a big purchase without taking a loan$$,
    $$ອອມເງິນສຳລັບການຊື້ໃຫຍ່ໂດຍບໍ່ຕ້ອງກູ້$$,
    $$Paying in cash avoids interest entirely, but requires a clear plan and patience.$$,
    $$ການຈ່າຍດ້ວຍເງິນສົດ ຫຼີກລ້ຽງດອກເບ້ຍທັງໝົດ ແຕ່ຕ້ອງການແຜນທີ່ຊັດເຈນ ແລະ ຄວາມອົດທົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Calculate the loan's hidden cost first$$, 'body', $$A 5,000,000 LAK motorbike financed at high interest might actually cost 6,000,000 LAK or more by the time it's paid off — see this number before deciding.$$),
      jsonb_build_object('heading', $$Set a realistic savings timeline$$, 'body', $$Saving 500,000 LAK a month reaches 5,000,000 LAK in 10 months — slower than a loan, but with no interest paid at all.$$),
      jsonb_build_object('heading', $$Weigh urgency against the interest cost$$, 'body', $$Sometimes a loan makes sense if the need is truly urgent — the point is making that trade-off consciously, not by default.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄິດໄລ່ຄ່າໃຊ້ຈ່າຍທີ່ເຊື່ອງໄວ້ຂອງເງິນກູ້ກ່ອນ$$, 'body', $$ລົດຈັກ 5,000,000 ກີບທີ່ຜ່ອນດ້ວຍດອກເບ້ຍສູງ ອາດລາຄາລວມ 6,000,000 ກີບ ຫຼືຫຼາຍກວ່ານັ້ນຕອນຜ່ອນຈົບ — ເບິ່ງຕົວເລກນີ້ກ່ອນຕັດສິນໃຈ.$$),
      jsonb_build_object('heading', $$ຕັ້ງໄລຍະເວລາອອມທີ່ເປັນຈິງ$$, 'body', $$ອອມ 500,000 ກີບຕໍ່ເດືອນ ຈະຮອດ 5,000,000 ກີບໃນ 10 ເດືອນ — ຊ້າກວ່າເງິນກູ້ ແຕ່ບໍ່ຕ້ອງຈ່າຍດອກເບ້ຍເລີຍ.$$),
      jsonb_build_object('heading', $$ຊັ່ງນ້ຳໜັກຄວາມຮີບດ່ວນກັບຄ່າໃຊ້ຈ່າຍດອກເບ້ຍ$$, 'body', $$ບາງຄັ້ງເງິນກູ້ສົມເຫດສົມຜົນຖ້າຄວາມຕ້ອງການດ່ວນແທ້ — ຈຸດສຳຄັນຄືການຊັ່ງນ້ຳໜັກນີ້ຢ່າງຕັ້ງໃຈ ບໍ່ແມ່ນເລືອກໂດຍປະລິຍາຍ.$$)
    ),
    array[$$Calculate the loan's total interest cost before deciding$$, $$Set a realistic monthly savings timeline as the alternative$$, $$Weigh true urgency against the interest cost consciously$$],
    array[$$ຄິດໄລ່ຄ່າໃຊ້ຈ່າຍດອກເບ້ຍລວມຂອງເງິນກູ້ກ່ອນຕັດສິນໃຈ$$, $$ຕັ້ງໄລຍະເວລາອອມຕໍ່ເດືອນທີ່ເປັນຈິງແທນທາງເລືອກ$$, $$ຊັ່ງນ້ຳໜັກຄວາມຮີບດ່ວນຈິງກັບຄ່າໃຊ້ຈ່າຍດອກເບ້ຍຢ່າງຕັ້ງໃຈ$$],
    5, false, 35
  ),
  (
    $$build-a-simple-net-worth-statement$$,
    $$Build a simple net worth statement$$,
    $$ສ້າງໃບແຈ້ງມູນຄ່າສຸດທິແບບງ່າຍ$$,
    $$Knowing what you own minus what you owe gives a clearer financial picture than income alone.$$,
    $$ການຮູ້ວ່າມີຫຍັງ ຫັກລົບໜີ້ທີ່ຕິດ ໃຫ້ພາບການເງິນທີ່ຊັດເຈນກວ່າລາຍໄດ້ຢ່າງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List everything you own$$, 'body', $$Savings, valuable items, and anything owed to you — add these up for your total assets.$$),
      jsonb_build_object('heading', $$List everything you owe$$, 'body', $$Loans, unpaid bills, and money borrowed from others — add these up for your total liabilities.$$),
      jsonb_build_object('heading', $$Example: a simple calculation$$, 'body', $$Assets of 8,000,000 LAK minus liabilities of 3,000,000 LAK equals a net worth of 5,000,000 LAK — recheck this number every few months to see real progress.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນທຸກຢ່າງທີ່ເປັນເຈົ້າຂອງ$$, 'body', $$ເງິນອອມ, ຂອງມີຄ່າ ແລະ ສິ່ງທີ່ຄົນອື່ນຄ້າງທ່ານ — ລວມທັງໝົດເປັນຊັບສິນລວມ.$$),
      jsonb_build_object('heading', $$ຂຽນທຸກຢ່າງທີ່ຕິດໜີ້$$, 'body', $$ເງິນກູ້, ໃບບິນທີ່ຍັງບໍ່ຈ່າຍ ແລະ ເງິນທີ່ຢືມຄົນອື່ນ — ລວມທັງໝົດເປັນໜີ້ສິນລວມ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ການຄິດໄລ່ງ່າຍໆ$$, 'body', $$ຊັບສິນ 8,000,000 ກີບ ຫັກໜີ້ສິນ 3,000,000 ກີບ ເທົ່າກັບມູນຄ່າສຸດທິ 5,000,000 ກີບ — ກວດຄືນຕົວເລກນີ້ທຸກສອງສາມເດືອນເພື່ອເຫັນຄວາມຄືບໜ້າຈິງ.$$)
    ),
    array[$$List everything you own to get your total assets$$, $$List everything you owe to get your total liabilities$$, $$Assets minus liabilities equals your net worth — track it over time$$],
    array[$$ຂຽນທຸກຢ່າງທີ່ເປັນເຈົ້າຂອງເປັນຊັບສິນລວມ$$, $$ຂຽນທຸກຢ່າງທີ່ຕິດໜີ້ເປັນໜີ້ສິນລວມ$$, $$ຊັບສິນຫັກໜີ້ສິນເທົ່າກັບມູນຄ່າສຸດທິ — ຕິດຕາມມັນຕາມເວລາ$$],
    5, false, 36
  ),
  (
    $$build-a-sinking-fund-for-annual-expenses$$,
    $$Build a sinking fund for predictable annual expenses$$,
    $$ສ້າງເງິນສະສົມສຳລັບຄ່າໃຊ້ຈ່າຍປະຈຳປີທີ່ຄາດການໄດ້$$,
    $$Saving a little every month for expenses you know are coming prevents a painful lump-sum surprise.$$,
    $$ການອອມນ້ອຍໆທຸກເດືອນສຳລັບຄ່າໃຊ້ຈ່າຍທີ່ຮູ້ວ່າຈະມາ ປ້ອງກັນຄວາມແປກໃຈກ້ອນໃຫຍ່ທີ່ເຈັບປວດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify predictable yearly costs$$, 'body', $$School fees, holiday gifts, vehicle registration, or an annual festival expense are known well in advance — plan for them.$$),
      jsonb_build_object('heading', $$Example: spreading a 1,200,000 LAK cost$$, 'body', $$A yearly school fee of 1,200,000 LAK becomes just 100,000 LAK a month set aside — far less painful than finding it all at once.$$),
      jsonb_build_object('heading', $$Keep it separate from your emergency fund$$, 'body', $$This money has a known purpose and timeline, so treat it differently from savings meant for true, unexpected emergencies.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸຄ່າໃຊ້ຈ່າຍປະຈຳປີທີ່ຄາດການໄດ້$$, 'body', $$ຄ່າຮຽນ, ຂອງຂວັນວັນພັກ, ຄ່າຈົດທະບຽນລົດ ຫຼືຄ່າໃຊ້ຈ່າຍງານບຸນປະຈຳປີ ຮູ້ໄດ້ລ່ວງໜ້າ — ວາງແຜນໄວ້.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ແບ່ງຄ່າໃຊ້ຈ່າຍ 1,200,000 ກີບ$$, 'body', $$ຄ່າຮຽນປະຈຳປີ 1,200,000 ກີບ ກາຍເປັນພຽງ 100,000 ກີບຕໍ່ເດືອນທີ່ເກັບໄວ້ — ເຈັບໜ້ອຍກວ່າການຫາທັງໝົດພ້ອມກັນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ແຍກອອກຈາກເງິນສະສົມສຸກເສີນ$$, 'body', $$ເງິນນີ້ມີຈຸດປະສົງ ແລະ ເວລາທີ່ຮູ້ແລ້ວ ໃຫ້ຖືກຕ່າງຈາກເງິນອອມສຳລັບເຫດສຸກເສີນທີ່ບໍ່ຄາດຄິດແທ້.$$)
    ),
    array[$$Identify predictable yearly costs well in advance$$, $$Spread the total into a small monthly amount set aside$$, $$Keep this fund separate from your true emergency fund$$],
    array[$$ລະບຸຄ່າໃຊ້ຈ່າຍປະຈຳປີທີ່ຄາດການໄດ້ລ່ວງໜ້າ$$, $$ແບ່ງຍອດລວມເປັນຈຳນວນນ້ອຍທີ່ເກັບໄວ້ທຸກເດືອນ$$, $$ແຍກເງິນນີ້ອອກຈາກເງິນສະສົມສຸກເສີນແທ້$$],
    4, false, 37
  ),
  (
    $$avoid-predatory-lending$$,
    $$Avoid predatory lending and unfair loan terms$$,
    $$ຫຼີກລ້ຽງເງິນກູ້ນອກລະບົບທີ່ບໍ່ເປັນທຳ$$,
    $$Extremely easy, fast loans often come with terms designed to trap borrowers in debt.$$,
    $$ເງິນກູ້ທີ່ໄດ້ງ່າຍ ແລະ ໄວຫຼາຍ ມັກມີເງື່ອນໄຂທີ່ອອກແບບໃຫ້ຕິດໜີ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Watch for red flags$$, 'body', $$No credit check, extremely high fees, pressure to sign immediately, or unclear terms are warning signs of an unfair lender.$$),
      jsonb_build_object('heading', $$Compare with formal, regulated options first$$, 'body', $$A local savings group or a registered financial institution, even if slower, is usually far safer than an unregistered lender.$$),
      jsonb_build_object('heading', $$Get any terms in writing before agreeing$$, 'body', $$A legitimate lender will clearly document interest, fees, and repayment terms — refuse anything based only on a verbal promise.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈັບຕາສັນຍານເຕືອນ$$, 'body', $$ບໍ່ກວດປະຫວັດ, ຄ່າທຳນຽມສູງຫຼາຍ, ກົດດັນໃຫ້ເຊັນທັນທີ ຫຼືເງື່ອນໄຂບໍ່ຊັດເຈນ ເປັນສັນຍານເຕືອນຂອງຜູ້ໃຫ້ກູ້ທີ່ບໍ່ເປັນທຳ.$$),
      jsonb_build_object('heading', $$ປຽບທຽບກັບທາງເລືອກທາງການ ແລະ ຄວບຄຸມກ່ອນ$$, 'body', $$ກຸ່ມອອມທ້ອງຖິ່ນ ຫຼືສະຖາບັນການເງິນທີ່ຈົດທະບຽນ ເຖິງແມ່ນຊ້າກວ່າ ມັກປອດໄພກວ່າຜູ້ໃຫ້ກູ້ທີ່ບໍ່ໄດ້ຈົດທະບຽນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເງື່ອນໄຂເປັນລາຍລັກອັກສອນກ່ອນຕົກລົງ$$, 'body', $$ຜູ້ໃຫ້ກູ້ທີ່ແທ້ຈິງຈະບັນທຶກດອກເບ້ຍ, ຄ່າທຳນຽມ ແລະ ເງື່ອນໄຂການຈ່າຍຄືນຢ່າງຊັດເຈນ — ປະຕິເສດອັນທີ່ອີງແຕ່ຄຳສັນຍາປາກເປົ່າ.$$)
    ),
    array[$$Watch for red flags like no checks or pressure to sign fast$$, $$Compare with formal, regulated lending options first$$, $$Get all loan terms in writing before agreeing to anything$$],
    array[$$ຈັບຕາສັນຍານເຕືອນເຊັ່ນ ບໍ່ກວດປະຫວັດ ຫຼືກົດດັນເຊັນໄວ$$, $$ປຽບທຽບກັບທາງເລືອກກູ້ຢືມທາງການ ແລະ ຄວບຄຸມກ່ອນ$$, $$ໃຫ້ເງື່ອນໄຂເງິນກູ້ທັງໝົດເປັນລາຍລັກອັກສອນກ່ອນຕົກລົງ$$],
    4, false, 38
  ),
  (
    $$understand-insurance-basics$$,
    $$Understand why insurance matters, even on a tight budget$$,
    $$ເຂົ້າໃຈວ່າປະກັນໄພສຳຄັນແນວໃດ ເຖິງແມ່ນງົບຈຳກັດ$$,
    $$Insurance trades a small, predictable cost for protection against a rare but devastating one.$$,
    $$ປະກັນໄພແລກຄ່າໃຊ້ຈ່າຍນ້ອຍທີ່ຄາດການໄດ້ ກັບການປົກປ້ອງຈາກເຫດການທີ່ຫາຍາກແຕ່ຮ້າຍແຮງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$The basic trade-off$$, 'body', $$Paying a small regular amount protects you from a huge, unpredictable cost — a health emergency or accident can cost far more than years of premiums.$$),
      jsonb_build_object('heading', $$Example: comparing the two scenarios$$, 'body', $$Health coverage costing 100,000 LAK a month totals 1,200,000 LAK a year — small compared to an unexpected hospital bill that could reach many millions.$$),
      jsonb_build_object('heading', $$Start with what protects you most$$, 'body', $$If budget is tight, prioritize coverage for the biggest possible risk to your income and health first, before less critical options.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ການແລກປ່ຽນພື້ນຖານ$$, 'body', $$ການຈ່າຍຈຳນວນນ້ອຍປົກກະຕິ ປົກປ້ອງຈາກຄ່າໃຊ້ຈ່າຍໃຫຍ່ທີ່ຄາດການບໍ່ໄດ້ — ເຫດສຸກເສີນທາງສຸຂະພາບ ຫຼືອຸບັດຕິເຫດ ອາດລາຄາແພງກວ່າຄ່າປະກັນຫຼາຍປີ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ປຽບທຽບສອງສະຖານະການ$$, 'body', $$ປະກັນສຸຂະພາບລາຄາ 100,000 ກີບຕໍ່ເດືອນ ລວມ 1,200,000 ກີບຕໍ່ປີ — ນ້ອຍທຽບກັບຄ່າໂຮງໝໍທີ່ບໍ່ຄາດຄິດເຊິ່ງອາດຮອດຫຼາຍລ້ານ.$$),
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍສິ່ງທີ່ປົກປ້ອງທ່ານທີ່ສຸດ$$, 'body', $$ຖ້າງົບຈຳກັດ ໃຫ້ຈັດລຳດັບຄວາມສຳຄັນຂອງການປົກປ້ອງຄວາມສ່ຽງໃຫຍ່ທີ່ສຸດຕໍ່ລາຍໄດ້ ແລະ ສຸຂະພາບກ່ອນ ຄ່ອຍໄປທາງເລືອກທີ່ສຳຄັນໜ້ອຍກວ່າ.$$)
    ),
    array[$$Insurance trades a small regular cost for protection from a huge one$$, $$Compare the yearly premium against the potential emergency cost$$, $$Prioritize coverage for your biggest possible risk first$$],
    array[$$ປະກັນໄພແລກຄ່າໃຊ້ຈ່າຍນ້ອຍປົກກະຕິກັບການປົກປ້ອງຈາກຄ່າໃຊ້ຈ່າຍໃຫຍ່$$, $$ປຽບທຽບຄ່າປະກັນຕໍ່ປີກັບຄ່າໃຊ້ຈ່າຍສຸກເສີນທີ່ອາດເກີດຂຶ້ນ$$, $$ຈັດລຳດັບຄວາມສຳຄັນຂອງການປົກປ້ອງຄວາມສ່ຽງໃຫຍ່ທີ່ສຸດກ່ອນ$$],
    5, false, 39
  ),
  (
    $$save-for-childrens-education-early$$,
    $$Save for children's education early$$,
    $$ອອມເງິນສຳລັບການສຶກສາລູກແຕ່ໄວ$$,
    $$Starting years ahead turns a large future cost into small, manageable monthly amounts.$$,
    $$ການເລີ່ມລ່ວງໜ້າຫຼາຍປີ ປ່ຽນຄ່າໃຊ້ຈ່າຍໃຫຍ່ອະນາຄົດ ໃຫ້ເປັນຈຳນວນນ້ອຍຕໍ່ເດືອນທີ່ຈັດການໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Estimate the future cost roughly$$, 'body', $$Even a rough estimate of university or vocational costs years from now gives you a real target to plan around today.$$),
      jsonb_build_object('heading', $$Example: starting 10 years ahead$$, 'body', $$Saving 150,000 LAK a month for 10 years builds up to 18,000,000 LAK before interest — starting five years later would need nearly double the monthly amount for the same total.$$),
      jsonb_build_object('heading', $$Keep it in a dedicated account$$, 'body', $$A separate account specifically for education keeps this savings from quietly being absorbed into everyday spending.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປະມານຄ່າໃຊ້ຈ່າຍອະນາຄົດແບບຄ່າວໆ$$, 'body', $$ແມ່ນແຕ່ການປະມານຄ່າໃຊ້ຈ່າຍມະຫາວິທະຍາໄລ ຫຼືສາຍອາຊີວະໃນອະນາຄົດ ໃຫ້ເປົ້າໝາຍຈິງເພື່ອວາງແຜນມື້ນີ້.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ເລີ່ມລ່ວງໜ້າ 10 ປີ$$, 'body', $$ອອມ 150,000 ກີບຕໍ່ເດືອນເປັນເວລາ 10 ປີ ໄດ້ 18,000,000 ກີບກ່ອນດອກເບ້ຍ — ຖ້າເລີ່ມຊ້າກວ່າ 5 ປີ ຕ້ອງການເກືອບສອງເທົ່າຕໍ່ເດືອນເພື່ອໄດ້ຍອດເທົ່າກັນ.$$),
      jsonb_build_object('heading', $$ເກັບໄວ້ໃນບັນຊີສະເພາະ$$, 'body', $$ບັນຊີແຍກສະເພາະສຳລັບການສຶກສາ ຮັກສາເງິນອອມນີ້ບໍ່ໃຫ້ຖືກໃຊ້ໄປໃນລາຍຈ່າຍປະຈຳວັນແບບງຽບໆ.$$)
    ),
    array[$$Estimate the future education cost even roughly$$, $$Starting years earlier requires a much smaller monthly amount$$, $$Keep education savings in a dedicated, separate account$$],
    array[$$ປະມານຄ່າໃຊ້ຈ່າຍການສຶກສາອະນາຄົດ ເຖິງແມ່ນແບບຄ່າວໆ$$, $$ການເລີ່ມໄວກວ່າຫຼາຍປີ ຕ້ອງການຈຳນວນຕໍ່ເດືອນໜ້ອຍກວ່າຫຼາຍ$$, $$ເກັບເງິນອອມການສຶກສາໄວ້ໃນບັນຊີແຍກສະເພາະ$$],
    5, false, 40
  ),
  (
    $$build-multiple-income-streams$$,
    $$Build multiple small income streams over time$$,
    $$ສ້າງແຫຼ່ງລາຍໄດ້ນ້ອຍຫຼາຍອັນຕາມເວລາ$$,
    $$Relying on a single income source is riskier than having a few smaller, diversified ones.$$,
    $$ການເພິ່ງພາລາຍໄດ້ແຫຼ່ງດຽວ ມີຄວາມສ່ຽງກວ່າການມີແຫຼ່ງນ້ອຍຫຼາຍອັນທີ່ຫຼາກຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with what you already have$$, 'body', $$A skill you already use at your main job — cooking, sewing, tutoring — is often the easiest starting point for a second income.$$),
      jsonb_build_object('heading', $$Example: a modest second stream$$, 'body', $$Even an extra 300,000 LAK a month from a side activity is 3,600,000 LAK a year — real money that a single job alone doesn't provide.$$),
      jsonb_build_object('heading', $$Protect your main income first$$, 'body', $$A side stream should never risk your primary job or main source of stability — build it around your main income, not against it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍສິ່ງທີ່ມີຢູ່ແລ້ວ$$, 'body', $$ທັກສະທີ່ໃຊ້ຢູ່ແລ້ວກັບວຽກຫຼັກ — ເຮັດອາຫານ, ຫຍິບເຄື່ອງ, ສອນພິເສດ — ມັກເປັນຈຸດເລີ່ມທີ່ງ່າຍທີ່ສຸດສຳລັບລາຍໄດ້ທີສອງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ແຫຼ່ງລາຍໄດ້ທີສອງພໍປານກາງ$$, 'body', $$ແມ່ນແຕ່ 300,000 ກີບເພີ່ມຕໍ່ເດືອນຈາກກິດຈະກຳເສີມ ເທົ່າກັບ 3,600,000 ກີບຕໍ່ປີ — ເງິນຈິງທີ່ວຽກດຽວໃຫ້ບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ປົກປ້ອງລາຍໄດ້ຫຼັກກ່ອນ$$, 'body', $$ແຫຼ່ງເສີມບໍ່ຄວນສ່ຽງຕໍ່ວຽກຫຼັກ ຫຼືຄວາມໝັ້ນຄົງຫຼັກຂອງທ່ານ — ສ້າງມັນອ້ອມຮອບລາຍໄດ້ຫຼັກ ບໍ່ແມ່ນຂັດແຍ່ງກັບມັນ.$$)
    ),
    array[$$Start a second income stream using a skill you already have$$, $$Even a modest side income adds up meaningfully over a year$$, $$Protect your main job and stability first$$],
    array[$$ເລີ່ມແຫຼ່ງລາຍໄດ້ທີສອງດ້ວຍທັກສະທີ່ມີຢູ່ແລ້ວ$$, $$ລາຍໄດ້ເສີມພໍປານກາງ ສະສົມມີຄວາມໝາຍຕະຫຼອດປີ$$, $$ປົກປ້ອງວຽກຫຼັກ ແລະ ຄວາມໝັ້ນຄົງກ່ອນ$$],
    4, false, 41
  ),
  (
    $$understand-opportunity-cost-with-a-money-example$$,
    $$Understand opportunity cost with a real money example$$,
    $$ເຂົ້າໃຈຕົ້ນທຶນໂອກາດດ້ວຍຕົວຢ່າງເງິນຈິງ$$,
    $$Every kip spent on one thing is a kip that can't be spent or saved elsewhere.$$,
    $$ທຸກກີບທີ່ໃຊ້ໄປກັບອັນໜຶ່ງ ຄືກີບທີ່ໃຊ້ ຫຼືອອມບ່ອນອື່ນບໍ່ໄດ້ອີກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$The choice you don't see$$, 'body', $$Buying something isn't just spending money — it's also giving up whatever else that same money could have done.$$),
      jsonb_build_object('heading', $$Example: a smartphone vs. a small investment$$, 'body', $$A 3,000,000 LAK phone upgrade is also 3,000,000 LAK that isn't going toward an emergency fund, a course, or a small business idea.$$),
      jsonb_build_object('heading', $$Use it as a decision check, not guilt$$, 'body', $$Asking "what else could this do?" isn't about never spending — it's about spending with clear eyes on what you're trading away.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ທາງເລືອກທີ່ບໍ່ເຫັນ$$, 'body', $$ການຊື້ບໍ່ແມ່ນແຕ່ການໃຊ້ເງິນ — ແຕ່ຍັງເປັນການປະຖິ້ມສິ່ງອື່ນທີ່ເງິນຈຳນວນດຽວກັນນັ້ນສາມາດເຮັດໄດ້.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ໂທລະສັບ ທຽບກັບການລົງທຶນນ້ອຍ$$, 'body', $$ການອັບເກຣດໂທລະສັບ 3,000,000 ກີບ ກໍ່ຄື 3,000,000 ກີບທີ່ບໍ່ໄດ້ໄປສູ່ເງິນສະສົມສຸກເສີນ, ຫຼັກສູດ ຫຼືແນວຄິດທຸລະກິດນ້ອຍ.$$),
      jsonb_build_object('heading', $$ໃຊ້ເປັນການກວດການຕັດສິນໃຈ ບໍ່ແມ່ນຄວາມຮູ້ສຶກຜິດ$$, 'body', $$ການຖາມ "ອັນອື່ນມັນເຮັດຫຍັງໄດ້ອີກ" ບໍ່ແມ່ນຫ້າມໃຊ້ຈ່າຍ — ແຕ່ຄືການໃຊ້ຈ່າຍໂດຍເຫັນຊັດເຈນວ່າກຳລັງແລກຫຍັງໄປ.$$)
    ),
    array[$$Every purchase also means giving up what else that money could do$$, $$Name the specific alternative before a large purchase$$, $$Use this as a clear-eyed check, not a source of guilt$$],
    array[$$ທຸກການຊື້ ກໍ່ໝາຍເຖິງການປະຖິ້ມສິ່ງອື່ນທີ່ເງິນນັ້ນເຮັດໄດ້$$, $$ລະບຸທາງເລືອກສະເພາະກ່ອນການຊື້ໃຫຍ່$$, $$ໃຊ້ນີ້ເປັນການກວດທີ່ຊັດເຈນ ບໍ່ແມ່ນຄວາມຮູ້ສຶກຜິດ$$],
    4, false, 42
  ),
  (
    $$plan-for-retirement-even-when-young$$,
    $$Plan for retirement even when you're young$$,
    $$ວາງແຜນເກສຽນເຖິງແມ່ນຍັງໜຸ່ມ$$,
    $$Starting decades early means small monthly amounts can grow into something substantial.$$,
    $$ການເລີ່ມລ່ວງໜ້າຫຼາຍສິບປີ ໝາຍຄວາມວ່າຈຳນວນນ້ອຍຕໍ່ເດືອນ ສາມາດເຕີບໂຕເປັນຈຳນວນໃຫຍ່ໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Time is the biggest advantage you have$$, 'body', $$Money saved in your 20s has decades to grow through compound interest — the same amount saved in your 40s has far less time.$$),
      jsonb_build_object('heading', $$Example: starting at 25 vs. 35$$, 'body', $$Saving 200,000 LAK a month from age 25 to 60, at modest growth, ends with significantly more than starting the same amount at 35 — the ten-year head start matters enormously.$$),
      jsonb_build_object('heading', $$Even a small amount now is worth starting$$, 'body', $$You don't need a large sum to begin — starting with whatever is realistic today matters more than waiting for a "better time."$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເວລາຄືຂໍ້ໄດ້ປຽບໃຫຍ່ທີ່ສຸດທີ່ມີ$$, 'body', $$ເງິນທີ່ອອມຕອນອາຍຸ 20 ມີເວລາຫຼາຍສິບປີໃຫ້ເຕີບໂຕດ້ວຍດອກເບ້ຍທົບຕົ້ນ — ຈຳນວນດຽວກັນທີ່ອອມຕອນອາຍຸ 40 ມີເວລານ້ອຍກວ່າຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ເລີ່ມອາຍຸ 25 ທຽບກັບ 35$$, 'body', $$ອອມ 200,000 ກີບຕໍ່ເດືອນຈາກອາຍຸ 25 ຫາ 60 ດ້ວຍການເຕີບໂຕພໍປານກາງ ຈົບດ້ວຍຈຳນວນຫຼາຍກວ່າການເລີ່ມຈຳນວນດຽວກັນຕອນອາຍຸ 35 ຫຼາຍ — ການເລີ່ມກ່ອນ 10 ປີສຳຄັນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ແມ່ນແຕ່ຈຳນວນນ້ອຍຕອນນີ້ກໍ່ຄຸ້ມຄ່າທີ່ຈະເລີ່ມ$$, 'body', $$ບໍ່ຈຳເປັນຕ້ອງມີຈຳນວນຫຼາຍເພື່ອເລີ່ມ — ການເລີ່ມດ້ວຍສິ່ງທີ່ເປັນຈິງໄດ້ມື້ນີ້ ສຳຄັນກວ່າການລໍ "ເວລາທີ່ດີກວ່າ."$$)
    ),
    array[$$Time is your biggest advantage for retirement savings$$, $$Starting a decade earlier makes a huge difference in the end total$$, $$Start with whatever small amount is realistic today$$],
    array[$$ເວລາຄືຂໍ້ໄດ້ປຽບໃຫຍ່ທີ່ສຸດສຳລັບເງິນອອມເກສຽນ$$, $$ການເລີ່ມກ່ອນໜຶ່ງທົດສະວັດ ສ້າງຄວາມແຕກຕ່າງໃຫຍ່ໃນທ້າຍທີ່ສຸດ$$, $$ເລີ່ມດ້ວຍຈຳນວນນ້ອຍທີ່ເປັນຈິງໄດ້ມື້ນີ້$$],
    5, false, 43
  ),
  (
    $$avoid-co-signing-loans-carelessly$$,
    $$Avoid co-signing loans carelessly$$,
    $$ຫຼີກລ້ຽງການຄ້ຳປະກັນເງິນກູ້ແບບບໍ່ລະມັດລະວັງ$$,
    $$Co-signing makes you fully responsible for someone else's debt if they can't pay.$$,
    $$ການຄ້ຳປະກັນ ເຮັດໃຫ້ທ່ານຮັບຜິດຊອບໜີ້ຄົນອື່ນເຕັມທີ່ ຖ້າເຂົາຈ່າຍບໍ່ໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Understand what co-signing really means$$, 'body', $$If the borrower misses payments, the lender can and will come to you for the full amount — this is a real, legal obligation, not a favor with no risk.$$),
      jsonb_build_object('heading', $$Example: a 5,000,000 LAK risk$$, 'body', $$Co-signing a 5,000,000 LAK loan means you could owe that full amount if the borrower disappears or can't pay — ask yourself honestly if you could cover it.$$),
      jsonb_build_object('heading', $$Only co-sign what you could afford to lose$$, 'body', $$If you can't comfortably absorb the full amount yourself, it's reasonable to decline, even for someone you care about.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຂົ້າໃຈວ່າການຄ້ຳປະກັນໝາຍຄວາມວ່າແທ້ໆ$$, 'body', $$ຖ້າຜູ້ກູ້ຈ່າຍພາດ ຜູ້ໃຫ້ກູ້ສາມາດ ແລະ ຈະມາຫາທ່ານເພື່ອຈຳນວນເຕັມ — ນີ້ຄືພັນທະທາງກົດໝາຍຈິງ ບໍ່ແມ່ນຄວາມຊ່ວຍເຫຼືອທີ່ບໍ່ມີຄວາມສ່ຽງ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ຄວາມສ່ຽງ 5,000,000 ກີບ$$, 'body', $$ການຄ້ຳປະກັນເງິນກູ້ 5,000,000 ກີບ ໝາຍຄວາມວ່າທ່ານອາດຕິດໜີ້ຈຳນວນເຕັມນັ້ນ ຖ້າຜູ້ກູ້ຫາຍໄປ ຫຼືຈ່າຍບໍ່ໄດ້ — ຖາມຕົນເອງຢ່າງຊື່ສັດວ່າຈ່າຍໄດ້ບໍ່.$$),
      jsonb_build_object('heading', $$ຄ້ຳປະກັນສະເພາະສິ່ງທີ່ຮັບໄດ້ຖ້າເສຍ$$, 'body', $$ຖ້າຮັບຈຳນວນເຕັມດ້ວຍຕົນເອງບໍ່ໄດ້ ເປັນເລື່ອງສົມເຫດສົມຜົນທີ່ຈະປະຕິເສດ ເຖິງແມ່ນເປັນຄົນທີ່ຫ່ວງໃຍ.$$)
    ),
    array[$$Co-signing makes you legally responsible for the full loan amount$$, $$Ask honestly whether you could actually cover the debt yourself$$, $$Only co-sign an amount you could genuinely afford to lose$$],
    array[$$ການຄ້ຳປະກັນເຮັດໃຫ້ຮັບຜິດຊອບທາງກົດໝາຍຕໍ່ຈຳນວນເຕັມ$$, $$ຖາມຢ່າງຊື່ສັດວ່າຈະຈ່າຍໜີ້ນັ້ນດ້ວຍຕົນເອງໄດ້ບໍ່$$, $$ຄ້ຳປະກັນສະເພາະຈຳນວນທີ່ຮັບໄດ້ຢ່າງແທ້ຈິງຖ້າເສຍ$$],
    4, false, 44
  ),
  (
    $$use-digital-payments-and-mobile-money-safely$$,
    $$Use digital payments and mobile money safely$$,
    $$ໃຊ້ການຈ່າຍເງິນດິຈິຕອນ ແລະ ມືຖືເງິນຢ່າງປອດໄພ$$,
    $$Convenient mobile payments still need the same caution as handling cash.$$,
    $$ການຈ່າຍເງິນຜ່ານມືຖືທີ່ສະດວກ ຍັງຕ້ອງການຄວາມລະມັດລະວັງເທົ່າກັບການຖືເງິນສົດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Never share your PIN or OTP with anyone$$, 'body', $$No legitimate bank or service will ever ask for your PIN or one-time code over the phone — treat any such request as a scam.$$),
      jsonb_build_object('heading', $$Double-check before confirming a transfer$$, 'body', $$Verify the recipient's name and the amount carefully before pressing confirm — mobile money transfers are usually difficult or impossible to reverse.$$),
      jsonb_build_object('heading', $$Check your transaction history regularly$$, 'body', $$A quick weekly glance at your mobile money history catches unauthorized charges early, before they add up.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢ່າແບ່ງປັນ PIN ຫຼື OTP ໃຫ້ໃຜ$$, 'body', $$ບໍ່ມີທະນາຄານ ຫຼືບໍລິການທີ່ແທ້ຈິງຈະຂໍ PIN ຫຼືລະຫັດຄັ້ງດຽວທາງໂທລະສັບ — ຖືວ່າຄຳຂໍແບບນີ້ເປັນການຫຼອກລວງ.$$),
      jsonb_build_object('heading', $$ກວດຄືນກ່ອນຢືນຢັນການໂອນ$$, 'body', $$ກວດຊື່ຜູ້ຮັບ ແລະ ຈຳນວນຢ່າງລະມັດລະວັງກ່ອນກົດຢືນຢັນ — ການໂອນເງິນຜ່ານມືຖື ປົກກະຕິແລ້ວກັບຄືນຍາກ ຫຼືເປັນໄປບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ກວດປະຫວັດທຸລະກຳເປັນປົກກະຕິ$$, 'body', $$ການເບິ່ງປະຫວັດມືຖືເງິນຢ່າງໄວທຸກອາທິດ ຈັບການເອີ້ນເກັບເງິນທີ່ບໍ່ໄດ້ອະນຸຍາດໄດ້ໄວ ກ່ອນມັນສະສົມ.$$)
    ),
    array[$$Never share your PIN or one-time code with anyone$$, $$Double-check recipient and amount before confirming a transfer$$, $$Check your transaction history regularly for unauthorized charges$$],
    array[$$ຢ່າແບ່ງປັນ PIN ຫຼືລະຫັດຄັ້ງດຽວໃຫ້ໃຜ$$, $$ກວດຜູ້ຮັບ ແລະ ຈຳນວນຢ່າງລະມັດລະວັງກ່ອນຢືນຢັນການໂອນ$$, $$ກວດປະຫວັດທຸລະກຳເປັນປົກກະຕິຫາການເອີ້ນເກັບເງິນທີ່ບໍ່ໄດ້ອະນຸຍາດ$$],
    4, false, 45
  ),
  (
    $$review-bank-statements-regularly$$,
    $$Build a habit of reviewing your bank statements$$,
    $$ສ້າງນິໄສທົບທວນໃບແຈ້ງຍອດທະນາຄານ$$,
    $$Regular review catches errors, fraud, and forgotten subscriptions early.$$,
    $$ການທົບທວນເປັນປົກກະຕິ ຈັບຄວາມຜິດພາດ, ການສໍ້ໂກງ ແລະ ການສະໝັກສະມາຊິກທີ່ລືມໄດ້ໄວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a monthly check-in$$, 'body', $$Ten minutes once a month to scan every line of your statement is enough to catch most issues before they become serious.$$),
      jsonb_build_object('heading', $$Look for charges you don't recognize$$, 'body', $$A small, unfamiliar recurring charge is easy to miss but can quietly cost significant money over a year.$$),
      jsonb_build_object('heading', $$Use the review to check your budget too$$, 'body', $$While reviewing, compare actual spending against your planned budget — this turns one habit into two useful checks at once.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງການກວດປະຈຳເດືອນ$$, 'body', $$10 ນາທີເດືອນລະຄັ້ງ ເພື່ອກວດທຸກແຖວໃນໃບແຈ້ງຍອດ ພຽງພໍທີ່ຈະຈັບບັນຫາສ່ວນຫຼາຍກ່ອນມັນຮ້າຍແຮງຂຶ້ນ.$$),
      jsonb_build_object('heading', $$ຊອກຫາການເອີ້ນເກັບເງິນທີ່ບໍ່ຮູ້ຈັກ$$, 'body', $$ການເອີ້ນເກັບເງິນຊ້ຳນ້ອຍທີ່ບໍ່ຄຸ້ນເຄີຍ ພາດງ່າຍ ແຕ່ອາດເສຍເງິນຈຳນວນສຳຄັນແບບງຽບໆຕະຫຼອດປີ.$$),
      jsonb_build_object('heading', $$ໃຊ້ການທົບທວນເພື່ອກວດງົບປະມານເໝືອນກັນ$$, 'body', $$ຕອນທົບທວນ ໃຫ້ປຽບທຽບການໃຊ້ຈ່າຍຈິງກັບງົບທີ່ວາງແຜນໄວ້ — ນີ້ປ່ຽນນິໄສດຽວໃຫ້ເປັນການກວດທີ່ເປັນປະໂຫຍດສອງຢ່າງພ້ອມກັນ.$$)
    ),
    array[$$Set a monthly ten-minute check-in on your statements$$, $$Look for small, unfamiliar recurring charges$$, $$Compare actual spending against your budget during the review$$],
    array[$$ຕັ້ງການກວດ 10 ນາທີເດືອນລະຄັ້ງ$$, $$ຊອກຫາການເອີ້ນເກັບເງິນຊ້ຳນ້ອຍທີ່ບໍ່ຄຸ້ນເຄີຍ$$, $$ປຽບທຽບການໃຊ້ຈ່າຍຈິງກັບງົບປະມານຕອນທົບທວນ$$],
    3, false, 46
  ),
  (
    $$recognize-get-rich-quick-scheme-risks$$,
    $$Recognize the risks of get-rich-quick schemes$$,
    $$ຈຳແນກຄວາມສ່ຽງຂອງແຜນການລວຍໄວ$$,
    $$Promises of guaranteed, unusually high returns are the clearest warning sign of a scam.$$,
    $$ຄຳສັນຍາຜົນຕອບແທນສູງຜິດປົກກະຕິແບບຮັບປະກັນ ເປັນສັນຍານເຕືອນທີ່ຊັດເຈນທີ່ສຸດຂອງການຫຼອກລວງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$No legitimate investment guarantees high returns$$, 'body', $$Real investments always carry risk — anyone promising guaranteed large profits with no risk is very likely running a scam.$$),
      jsonb_build_object('heading', $$Watch for pressure to recruit others$$, 'body', $$Schemes that pay you mainly for bringing in new investors, rather than from a real product or service, are a classic pyramid structure.$$),
      jsonb_build_object('heading', $$Example: the math doesn't work$$, 'body', $$A scheme promising to double 1,000,000 LAK in a week has no honest business model that could realistically produce that return.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ການລົງທຶນທີ່ແທ້ຈິງບໍ່ຮັບປະກັນຜົນຕອບແທນສູງ$$, 'body', $$ການລົງທຶນຈິງມີຄວາມສ່ຽງສະເໝີ — ຄົນທີ່ສັນຍາກຳໄລສູງແບບຮັບປະກັນ ໂດຍບໍ່ມີຄວາມສ່ຽງ ມີແນວໂນ້ມສູງວ່າແມ່ນການຫຼອກລວງ.$$),
      jsonb_build_object('heading', $$ລະວັງການກົດດັນໃຫ້ຊັກຊວນຄົນອື່ນ$$, 'body', $$ແຜນການທີ່ຈ່າຍທ່ານຫຼັກໆຈາກການດຶງນັກລົງທຶນໃໝ່ ບໍ່ແມ່ນຈາກຜະລິດຕະພັນ ຫຼືບໍລິການຈິງ ຄືໂຄງສ້າງແບບພິລະມິດຄລາສສິກ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ຕົວເລກບໍ່ສົມເຫດສົມຜົນ$$, 'body', $$ແຜນການທີ່ສັນຍາຈະເພີ່ມ 1,000,000 ກີບເປັນສອງເທົ່າພາຍໃນອາທິດ ບໍ່ມີຮູບແບບທຸລະກິດທີ່ຊື່ສັດໃດຈະສ້າງຜົນຕອບແທນນັ້ນໄດ້ຈິງ.$$)
    ),
    array[$$No legitimate investment guarantees high returns with no risk$$, $$Be wary of schemes that pay mainly for recruiting others$$, $$Question any return that's mathematically too good to be real$$],
    array[$$ການລົງທຶນທີ່ແທ້ຈິງບໍ່ຮັບປະກັນຜົນຕອບແທນສູງໂດຍບໍ່ມີຄວາມສ່ຽງ$$, $$ລະວັງແຜນການທີ່ຈ່າຍຫຼັກໆຈາກການຊັກຊວນຄົນອື່ນ$$, $$ຕັ້ງຄຳຖາມຜົນຕອບແທນທີ່ດີເກີນຄວາມເປັນຈິງທາງຄະນິດສາດ$$],
    4, false, 47
  ),
  (
    $$save-on-groceries-without-sacrificing-quality$$,
    $$Save on groceries without sacrificing quality$$,
    $$ປະຢັດຄ່າອາຫານໂດຍບໍ່ເສຍຄຸນນະພາບ$$,
    $$A little planning turns grocery shopping from a leak into a controlled, predictable expense.$$,
    $$ການວາງແຜນເລັກນ້ອຍ ປ່ຽນການຊື້ອາຫານຈາກຈຸດເສຍເງິນ ໃຫ້ເປັນຄ່າໃຊ້ຈ່າຍທີ່ຄວບຄຸມ ແລະ ຄາດການໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Plan meals before you shop$$, 'body', $$A short list based on planned meals for the week prevents the random extra items that quietly inflate the bill.$$),
      jsonb_build_object('heading', $$Example: the impact of a shopping list$$, 'body', $$Shoppers with a written list often spend 15-20% less than those browsing without one — on a 500,000 LAK monthly grocery budget, that's 75,000-100,000 LAK saved.$$),
      jsonb_build_object('heading', $$Buy staples in appropriate bulk$$, 'body', $$Rice, oil, and other non-perishables are often cheaper per unit in larger quantities — buy what you'll actually use before it spoils.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວາງແຜນອາຫານກ່ອນໄປຊື້$$, 'body', $$ລາຍການສັ້ນໆອີງໃສ່ອາຫານທີ່ວາງແຜນໄວ້ຕະຫຼອດອາທິດ ປ້ອງກັນເຄື່ອງພິເສດແບບສຸ່ມທີ່ເຮັດໃຫ້ບິນເພີ່ມແບບງຽບໆ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ຜົນຂອງລາຍການຊື້ເຄື່ອງ$$, 'body', $$ຄົນທີ່ມີລາຍການຂຽນໄວ້ ມັກໃຊ້ຈ່າຍໜ້ອຍກວ່າ 15-20% ທຽບກັບຄົນທີ່ເລື່ອນເບິ່ງໂດຍບໍ່ມີລາຍການ — ໃນງົບອາຫານ 500,000 ກີບຕໍ່ເດືອນ ນັ້ນປະຢັດໄດ້ 75,000-100,000 ກີບ.$$),
      jsonb_build_object('heading', $$ຊື້ອາຫານພື້ນຖານເປັນຈຳນວນທີ່ເໝາະສົມ$$, 'body', $$ເຂົ້າ, ນ້ຳມັນ ແລະ ອາຫານທີ່ບໍ່ເສຍງ່າຍ ມັກຖືກກວ່າຕໍ່ໜ່ວຍເມື່ອຊື້ຈຳນວນຫຼາຍ — ຊື້ພຽງເທົ່າທີ່ຈະໃຊ້ໄດ້ກ່ອນເສຍ.$$)
    ),
    array[$$Plan meals and make a list before shopping$$, $$A written list can save 15-20% on the grocery bill$$, $$Buy non-perishable staples in bulk when it's genuinely cheaper$$],
    array[$$ວາງແຜນອາຫານ ແລະ ຂຽນລາຍການກ່ອນໄປຊື້$$, $$ລາຍການທີ່ຂຽນໄວ້ ອາດປະຢັດໄດ້ 15-20% ຂອງບິນອາຫານ$$, $$ຊື້ອາຫານທີ່ບໍ່ເສຍງ່າຍເປັນຈຳນວນຫຼາຍເມື່ອຖືກກວ່າແທ້$$],
    4, false, 48
  ),
  (
    $$build-a-debt-payoff-plan$$,
    $$Build a debt payoff plan: snowball vs. avalanche$$,
    $$ສ້າງແຜນຈ່າຍໜີ້ໝົດ: ວິທີ Snowball ທຽບກັບ Avalanche$$,
    $$Two proven methods trade motivation for mathematical efficiency — pick the one you'll actually stick with.$$,
    $$ສອງວິທີທີ່ພິສູດແລ້ວ ແລກແຮງຈູງໃຈກັບປະສິດທິພາບທາງຄະນິດສາດ — ເລືອກອັນທີ່ຈະເຮັດຕໍ່ໄດ້ຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Snowball: smallest debt first$$, 'body', $$Pay off the smallest balance first while making minimum payments on the rest — quick wins build motivation to keep going.$$),
      jsonb_build_object('heading', $$Avalanche: highest interest first$$, 'body', $$Pay off the debt with the highest interest rate first — this saves the most money overall, though the first win may take longer to feel.$$),
      jsonb_build_object('heading', $$Example: choosing between three debts$$, 'body', $$A 200,000 LAK debt, a 500,000 LAK debt at high interest, and a 1,000,000 LAK debt — snowball tackles the 200,000 LAK first; avalanche tackles whichever has the highest rate.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$Snowball: ໜີ້ນ້ອຍທີ່ສຸດກ່ອນ$$, 'body', $$ຈ່າຍໜີ້ຍອດນ້ອຍທີ່ສຸດໃຫ້ໝົດກ່ອນ ຂະນະຈ່າຍຂັ້ນຕ່ຳໃນສ່ວນທີ່ເຫຼືອ — ໄຊຊະນະໄວໆສ້າງແຮງຈູງໃຈໃຫ້ສືບຕໍ່.$$),
      jsonb_build_object('heading', $$Avalanche: ດອກເບ້ຍສູງທີ່ສຸດກ່ອນ$$, 'body', $$ຈ່າຍໜີ້ທີ່ດອກເບ້ຍສູງທີ່ສຸດກ່ອນ — ປະຢັດເງິນລວມໄດ້ຫຼາຍທີ່ສຸດ ເຖິງແມ່ນໄຊຊະນະທຳອິດອາດຮູ້ສຶກໃຊ້ເວລາດົນກວ່າ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ເລືອກລະຫວ່າງສາມໜີ້$$, 'body', $$ໜີ້ 200,000 ກີບ, ໜີ້ 500,000 ກີບດອກເບ້ຍສູງ ແລະ ໜີ້ 1,000,000 ກີບ — Snowball ຈັດການ 200,000 ກີບກ່ອນ; Avalanche ຈັດການອັນທີ່ດອກເບ້ຍສູງທີ່ສຸດກ່ອນ.$$)
    ),
    array[$$Snowball pays smallest debts first for quick motivation$$, $$Avalanche pays highest-interest debt first to save the most money$$, $$Choose whichever method you'll actually stick with consistently$$],
    array[$$Snowball ຈ່າຍໜີ້ນ້ອຍທີ່ສຸດກ່ອນເພື່ອແຮງຈູງໃຈໄວ$$, $$Avalanche ຈ່າຍໜີ້ດອກເບ້ຍສູງທີ່ສຸດກ່ອນເພື່ອປະຢັດເງິນຫຼາຍທີ່ສຸດ$$, $$ເລືອກວິທີທີ່ຈະເຮັດຕໍ່ໄດ້ຢ່າງສະໝ່ຳສະເໝີແທ້$$],
    5, false, 49
  ),
  (
    $$currency-exchange-basics-for-travelers$$,
    $$Understand currency exchange basics for travelers$$,
    $$ເຂົ້າໃຈພື້ນຖານການແລກປ່ຽນເງິນຕາສຳລັບນັກທ່ອງທ່ຽວ$$,
    $$Exchange rates and fees vary widely between providers — a little checking saves real money.$$,
    $$ອັດຕາແລກປ່ຽນ ແລະ ຄ່າທຳນຽມແຕກຕ່າງກັນຫຼາຍລະຫວ່າງຜູ້ໃຫ້ບໍລິການ — ການກວດເລັກນ້ອຍປະຢັດເງິນໄດ້ຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Compare rates before exchanging$$, 'body', $$Airport counters and hotels often offer worse rates than banks or licensed exchange shops in town — check more than one option.$$),
      jsonb_build_object('heading', $$Example: the hidden cost of convenience$$, 'body', $$Exchanging 1,000,000 LAK worth of currency at a poor rate might cost 30,000-50,000 LAK more than at a fair one — small on paper, but real money.$$),
      jsonb_build_object('heading', $$Watch for hidden fees, not just the rate$$, 'body', $$Some providers advertise a good rate but add a separate service fee — ask for the total cost, not just the exchange rate itself.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປຽບທຽບອັດຕາກ່ອນແລກ$$, 'body', $$ຈຸດແລກເງິນທີ່ສະໜາມບິນ ແລະ ໂຮງແຮມ ມັກໃຫ້ອັດຕາທີ່ບໍ່ດີເທົ່າທະນາຄານ ຫຼືຮ້ານແລກເງິນທີ່ມີໃບອະນຸຍາດໃນຕົວເມືອງ — ກວດຫຼາຍກວ່າໜຶ່ງບ່ອນ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ຄ່າໃຊ້ຈ່າຍເຊື່ອງໄວ້ຂອງຄວາມສະດວກ$$, 'body', $$ການແລກເງິນມູນຄ່າ 1,000,000 ກີບທີ່ອັດຕາບໍ່ດີ ອາດເສຍຫຼາຍກວ່າອັດຕາທີ່ຍຸຕິທຳ 30,000-50,000 ກີບ — ນ້ອຍໃນເຈ້ຍ ແຕ່ເປັນເງິນຈິງ.$$),
      jsonb_build_object('heading', $$ລະວັງຄ່າທຳນຽມເຊື່ອງໄວ້ ບໍ່ແມ່ນແຕ່ອັດຕາ$$, 'body', $$ຜູ້ໃຫ້ບໍລິການບາງລາຍໂຄສະນາອັດຕາດີ ແຕ່ເພີ່ມຄ່າບໍລິການແຍກ — ຖາມຄ່າໃຊ້ຈ່າຍລວມ ບໍ່ແມ່ນແຕ່ອັດຕາແລກປ່ຽນເອງ.$$)
    ),
    array[$$Compare exchange rates at more than one location$$, $$A poor rate can cost real money even on a modest amount$$, $$Ask about the total cost including any hidden service fees$$],
    array[$$ປຽບທຽບອັດຕາແລກປ່ຽນຫຼາຍກວ່າໜຶ່ງບ່ອນ$$, $$ອັດຕາທີ່ບໍ່ດີ ອາດເສຍເງິນຈິງ ເຖິງແມ່ນຈຳນວນພໍປານກາງ$$, $$ຖາມຄ່າໃຊ້ຈ່າຍລວມ ລວມທັງຄ່າບໍລິການທີ່ເຊື່ອງໄວ້$$],
    4, false, 50
  ),
  (
    $$teach-kids-about-money-early$$,
    $$Teach kids about money early$$,
    $$ສອນລູກເລື່ອງເງິນຕັ້ງແຕ່ໄວ$$,
    $$Simple, age-appropriate money lessons build habits that last a lifetime.$$,
    $$ບົດຮຽນເລື່ອງເງິນທີ່ງ່າຍ ແລະ ເໝາະກັບໄວ ສ້າງນິໄສທີ່ຄົງຢູ່ຕະຫຼອດຊີວິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use small, real amounts$$, 'body', $$Giving a child a small weekly amount to manage themselves — even 5,000 LAK — teaches real decisions better than lectures alone.$$),
      jsonb_build_object('heading', $$Show the three buckets simply$$, 'body', $$Spend, save, and share — three jars or envelopes a child can see makes the concept of dividing money concrete and visual.$$),
      jsonb_build_object('heading', $$Let them make small mistakes safely$$, 'body', $$Spending their own small amount poorly once teaches a lesson far better than being told "no" every time — let the stakes stay low.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ຈຳນວນນ້ອຍທີ່ຈິງ$$, 'body', $$ໃຫ້ລູກຈຳນວນນ້ອຍປະຈຳອາທິດຈັດການເອງ — ແມ່ນແຕ່ 5,000 ກີບ — ສອນການຕັດສິນໃຈຈິງໄດ້ດີກວ່າການເວົ້າສອນຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ສະແດງສາມສ່ວນແບບງ່າຍ$$, 'body', $$ໃຊ້, ອອມ ແລະ ແບ່ງປັນ — ສາມກະປ໋ອງ ຫຼືຊອງທີ່ລູກເຫັນໄດ້ ເຮັດໃຫ້ແນວຄິດການແບ່ງເງິນຈັບຕ້ອງໄດ້ ແລະ ເຫັນພາບ.$$),
      jsonb_build_object('heading', $$ໃຫ້ລູກຜິດພາດນ້ອຍໆຢ່າງປອດໄພ$$, 'body', $$ການໃຊ້ເງິນຂອງຕົນເອງຜິດພາດຄັ້ງໜຶ່ງ ສອນໄດ້ດີກວ່າການຖືກຫ້າມທຸກຄັ້ງ — ໃຫ້ຄວາມສ່ຽງຍັງຕ່ຳຢູ່.$$)
    ),
    array[$$Give children a small real amount to manage themselves$$, $$Use spend, save, share buckets to make it visual$$, $$Let small mistakes happen safely to build real learning$$],
    array[$$ໃຫ້ລູກຈຳນວນນ້ອຍທີ່ຈິງໃຫ້ຈັດການເອງ$$, $$ໃຊ້ຫຼັກ ໃຊ້-ອອມ-ແບ່ງປັນ ເພື່ອໃຫ້ເຫັນພາບ$$, $$ໃຫ້ຜິດພາດນ້ອຍໆຢ່າງປອດໄພເພື່ອສ້າງການຮຽນຮູ້ຈິງ$$],
    4, false, 51
  ),
  (
    $$understand-simple-low-risk-investing-basics$$,
    $$Understand simple, low-risk investing basics$$,
    $$ເຂົ້າໃຈພື້ນຖານການລົງທຶນຄວາມສ່ຽງຕ່ຳແບບງ່າຍ$$,
    $$Investing doesn't have to be complicated or risky to start building long-term value.$$,
    $$ການລົງທຶນບໍ່ຈຳເປັນຕ້ອງຊັບຊ້ອນ ຫຼືສ່ຽງເພື່ອເລີ່ມສ້າງມູນຄ່າໄລຍະຍາວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Understand risk and return go together$$, 'body', $$Higher potential returns generally come with higher risk of loss — anything promising both high return and total safety should raise suspicion.$$),
      jsonb_build_object('heading', $$Only invest money you won't need soon$$, 'body', $$Never invest your emergency fund or money needed for near-term expenses — investing works best with money you can leave untouched for years.$$),
      jsonb_build_object('heading', $$Start small and learn as you go$$, 'body', $$Beginning with a small, comfortable amount lets you learn how investing feels emotionally before committing larger sums.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຂົ້າໃຈວ່າຄວາມສ່ຽງ ແລະ ຜົນຕອບແທນໄປນຳກັນ$$, 'body', $$ຜົນຕອບແທນທີ່ອາດສູງ ໂດຍທົ່ວໄປມາພ້ອມຄວາມສ່ຽງເສຍທີ່ສູງ — ອັນທີ່ສັນຍາທັງຜົນຕອບແທນສູງ ແລະ ປອດໄພເຕັມທີ່ ຄວນສົງໄສ.$$),
      jsonb_build_object('heading', $$ລົງທຶນສະເພາະເງິນທີ່ບໍ່ຕ້ອງການໄວໆນີ້$$, 'body', $$ຢ່າລົງທຶນເງິນສະສົມສຸກເສີນ ຫຼືເງິນທີ່ຕ້ອງໃຊ້ໄວໆນີ້ — ການລົງທຶນໄດ້ຜົນດີທີ່ສຸດກັບເງິນທີ່ປະໄວ້ໄດ້ຫຼາຍປີໂດຍບໍ່ແຕະ.$$),
      jsonb_build_object('heading', $$ເລີ່ມນ້ອຍ ແລະ ຮຽນຮູ້ໄປພ້ອມ$$, 'body', $$ການເລີ່ມດ້ວຍຈຳນວນນ້ອຍທີ່ສະບາຍໃຈ ໃຫ້ຮຽນຮູ້ຄວາມຮູ້ສຶກຂອງການລົງທຶນ ກ່ອນລົງທຶນຈຳນວນຫຼາຍຂຶ້ນ.$$)
    ),
    array[$$Understand that higher returns generally mean higher risk$$, $$Only invest money you genuinely won't need for years$$, $$Start small and learn how investing feels before committing more$$],
    array[$$ເຂົ້າໃຈວ່າຜົນຕອບແທນສູງກວ່າ ໂດຍທົ່ວໄປໝາຍເຖິງຄວາມສ່ຽງສູງກວ່າ$$, $$ລົງທຶນສະເພາະເງິນທີ່ບໍ່ຕ້ອງການແທ້ໆເປັນເວລາຫຼາຍປີ$$, $$ເລີ່ມນ້ອຍ ແລະ ຮຽນຮູ້ຄວາມຮູ້ສຶກກ່ອນລົງທຶນຫຼາຍຂຶ້ນ$$],
    5, false, 52
  ),
  (
    $$avoid-financial-stress-through-planning$$,
    $$Reduce financial stress through simple planning$$,
    $$ຫຼຸດຄວາມກັງວົນທາງການເງິນດ້ວຍການວາງແຜນງ່າຍໆ$$,
    $$Much financial anxiety comes from uncertainty, not the numbers themselves — a plan replaces vague worry with clarity.$$,
    $$ຄວາມກັງວົນທາງການເງິນສ່ວນຫຼາຍ ມາຈາກຄວາມບໍ່ແນ່ນອນ ບໍ່ແມ່ນຕົວເລກເອງ — ແຜນປ່ຽນຄວາມກັງວົນທົ່ວໄປໃຫ້ເປັນຄວາມຊັດເຈນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name the specific worry$$, 'body', $$Vague dread about money feels heavier than a specific number — write down exactly what you're worried about and the real amount involved.$$),
      jsonb_build_object('heading', $$Make one small plan for it$$, 'body', $$Even a rough, imperfect plan for a specific worry reduces its weight far more than continuing to avoid thinking about it.$$),
      jsonb_build_object('heading', $$Revisit the plan instead of the worry$$, 'body', $$When the anxious thought returns, redirect to checking your plan's progress instead of spiraling into the same open-ended fear.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸຄວາມກັງວົນສະເພາະ$$, 'body', $$ຄວາມກັງວົນທົ່ວໄປກ່ຽວກັບເງິນ ຮູ້ສຶກໜັກກວ່າຕົວເລກສະເພາະ — ຂຽນອອກມາຢ່າງແທ້ຈິງວ່າກັງວົນຫຍັງ ແລະ ຈຳນວນຈິງທີ່ກ່ຽວຂ້ອງ.$$),
      jsonb_build_object('heading', $$ສ້າງແຜນນ້ອຍໜຶ່ງອັນ$$, 'body', $$ແມ່ນແຕ່ແຜນຄ່າວໆສຳລັບຄວາມກັງວົນສະເພາະ ຫຼຸດນ້ຳໜັກຂອງມັນໄດ້ຫຼາຍກວ່າການສືບຕໍ່ຫຼີກລ້ຽງບໍ່ຄິດເຖິງມັນ.$$),
      jsonb_build_object('heading', $$ທົບທວນແຜນ ແທນຄວາມກັງວົນ$$, 'body', $$ເມື່ອຄວາມຄິດກັງວົນກັບມາ ໃຫ້ຫັນໄປກວດຄວາມຄືບໜ້າຂອງແຜນ ແທນທີ່ຈະຈົມກັບຄວາມຢ້ານທີ່ບໍ່ມີທີ່ສິ້ນສຸດອັນເກົ່າ.$$)
    ),
    array[$$Name the specific worry and the real number behind it$$, $$Make even a rough plan to reduce its emotional weight$$, $$Redirect to checking the plan instead of repeating the worry$$],
    array[$$ລະບຸຄວາມກັງວົນສະເພາະ ແລະ ຕົວເລກຈິງທີ່ຢູ່ເບື້ອງຫຼັງ$$, $$ສ້າງແຜນເຖິງແມ່ນຄ່າວໆເພື່ອຫຼຸດນ້ຳໜັກທາງໃຈ$$, $$ຫັນໄປກວດແຜນ ແທນການວົນຄິດຄວາມກັງວົນຊ້ຳ$$],
    4, false, 53
  ),
  (
    $$watch-how-subscriptions-add-up$$,
    $$Watch how small subscriptions add up over time$$,
    $$ຈັບຕາວ່າການສະໝັກສະມາຊິກນ້ອຍໆສະສົມແນວໃດ$$,
    $$Several small recurring charges together can quietly cost more than one obvious big expense.$$,
    $$ຄ່າສະໝັກນ້ອຍໆຫຼາຍອັນລວມກັນ ອາດເສຍຫຼາຍກວ່າລາຍຈ່າຍໃຫຍ່ອັນດຽວທີ່ເຫັນໄດ້ຊັດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List every recurring subscription$$, 'body', $$Streaming, apps, memberships — write out everything charged automatically each month, since these are easy to forget about individually.$$),
      jsonb_build_object('heading', $$Example: small charges adding up$$, 'body', $$Three subscriptions at 30,000 LAK, 50,000 LAK, and 40,000 LAK each month total 120,000 LAK — 1,440,000 LAK a year, easy to miss without listing them.$$),
      jsonb_build_object('heading', $$Cancel what you don't actually use$$, 'body', $$For each subscription, ask honestly when you last used it — canceling the unused ones is an easy, immediate saving.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນທຸກການສະໝັກສະມາຊິກທີ່ຊ້ຳ$$, 'body', $$ສະຕຣີມມິງ, ແອັບ, ສະມາຊິກ — ຂຽນທຸກອັນທີ່ຖືກເອີ້ນເກັບເງິນອັດຕະໂນມັດທຸກເດືອນ ເພາະລືມແຕ່ລະອັນໄດ້ງ່າຍ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ຄ່າໃຊ້ຈ່າຍນ້ອຍສະສົມ$$, 'body', $$ສາມການສະໝັກທີ່ 30,000, 50,000 ແລະ 40,000 ກີບຕໍ່ເດືອນ ລວມ 120,000 ກີບ — 1,440,000 ກີບຕໍ່ປີ ພາດງ່າຍຖ້າບໍ່ໄດ້ຂຽນລາຍການ.$$),
      jsonb_build_object('heading', $$ຍົກເລີກສິ່ງທີ່ບໍ່ໄດ້ໃຊ້ຈິງ$$, 'body', $$ສຳລັບແຕ່ລະການສະໝັກ ໃຫ້ຖາມຢ່າງຊື່ສັດວ່າໃຊ້ຄັ້ງສຸດທ້າຍເມື່ອໃດ — ຍົກເລີກອັນທີ່ບໍ່ໄດ້ໃຊ້ ເປັນການປະຢັດງ່າຍ ແລະ ໄວ.$$)
    ),
    array[$$List every recurring subscription to see the full picture$$, $$Small monthly charges add up to a significant yearly total$$, $$Cancel subscriptions you can honestly say you don't use$$],
    array[$$ຂຽນທຸກການສະໝັກສະມາຊິກທີ່ຊ້ຳເພື່ອເຫັນພາບລວມ$$, $$ຄ່າໃຊ້ຈ່າຍນ້ອຍຕໍ່ເດືອນ ສະສົມເປັນຍອດປະຈຳປີທີ່ສຳຄັນ$$, $$ຍົກເລີກການສະໝັກທີ່ບອກໄດ້ຢ່າງຊື່ສັດວ່າບໍ່ໄດ້ໃຊ້$$],
    3, false, 54
  ),
  (
    $$build-a-comparison-shopping-habit$$,
    $$Build a comparison shopping habit$$,
    $$ສ້າງນິໄສປຽບທຽບລາຄາກ່ອນຊື້$$,
    $$A few minutes checking prices before a purchase can save meaningfully over time.$$,
    $$ສອງສາມນາທີກວດລາຄາກ່ອນຊື້ ອາດປະຢັດໄດ້ຢ່າງມີຄວາມໝາຍຕາມເວລາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check at least two sources for bigger purchases$$, 'body', $$For anything above a set amount, compare at least two shops or sellers before buying — prices for the same item can vary more than expected.$$),
      jsonb_build_object('heading', $$Don't let comparison become procrastination$$, 'body', $$Set a time limit on comparing — spending hours to save 5,000 LAK isn't worth it; the habit should be quick and proportional.$$),
      jsonb_build_object('heading', $$Factor in quality, not just the lowest price$$, 'body', $$The cheapest option isn't always the best value — weigh durability and reliability alongside price for lasting purchases.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດຢ່າງໜ້ອຍສອງແຫຼ່ງສຳລັບການຊື້ໃຫຍ່$$, 'body', $$ສຳລັບອັນທີ່ເກີນຈຳນວນທີ່ກຳນົດ ໃຫ້ປຽບທຽບຢ່າງໜ້ອຍສອງຮ້ານ ຫຼືຜູ້ຂາຍກ່ອນຊື້ — ລາຄາເຄື່ອງດຽວກັນອາດຕ່າງກັນຫຼາຍກວ່າທີ່ຄາດ.$$),
      jsonb_build_object('heading', $$ຢ່າໃຫ້ການປຽບທຽບກາຍເປັນການລໍຊັກຊ້າ$$, 'body', $$ຕັ້ງເວລາຈຳກັດການປຽບທຽບ — ໃຊ້ຫຼາຍຊົ່ວໂມງເພື່ອປະຢັດ 5,000 ກີບ ບໍ່ຄຸ້ມຄ່າ; ນິໄສນີ້ຄວນໄວ ແລະ ໄດ້ສັດສ່ວນ.$$),
      jsonb_build_object('heading', $$ຄິດເຖິງຄຸນນະພາບ ບໍ່ແມ່ນແຕ່ລາຄາຕ່ຳສຸດ$$, 'body', $$ທາງເລືອກຖືກທີ່ສຸດ ບໍ່ໄດ້ຄຸ້ມຄ່າສະເໝີ — ຊັ່ງນ້ຳໜັກຄວາມທົນທານ ແລະ ຄວາມໜ້າເຊື່ອຖືພ້ອມກັບລາຄາສຳລັບການຊື້ໃຊ້ຍາວ.$$)
    ),
    array[$$Compare at least two sources for larger purchases$$, $$Keep comparison quick and proportional to the amount saved$$, $$Weigh quality and durability, not just the lowest price$$],
    array[$$ປຽບທຽບຢ່າງໜ້ອຍສອງແຫຼ່ງສຳລັບການຊື້ໃຫຍ່$$, $$ໃຫ້ການປຽບທຽບໄວ ແລະ ໄດ້ສັດສ່ວນກັບເງິນທີ່ປະຢັດໄດ້$$, $$ຊັ່ງນ້ຳໜັກຄຸນນະພາບ ບໍ່ແມ່ນແຕ່ລາຄາຕ່ຳສຸດ$$],
    3, false, 55
  ),
  (
    $$plan-a-big-event-on-a-budget$$,
    $$Plan a wedding or big event on a budget$$,
    $$ວາງແຜນງານແຕ່ງງານ ຫຼືງານໃຫຍ່ພາຍໃນງົບປະມານ$$,
    $$Setting a total budget before planning details prevents costs from quietly spiraling.$$,
    $$ການຕັ້ງງົບປະມານລວມກ່ອນວາງແຜນລາຍລະອຽດ ປ້ອງກັນຄ່າໃຊ້ຈ່າຍບໍ່ໃຫ້ເພີ່ມແບບງຽບໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set the total budget first$$, 'body', $$Decide the maximum you're willing to spend before booking anything — this number should guide every decision that follows.$$),
      jsonb_build_object('heading', $$Example: allocating a fixed total$$, 'body', $$A 20,000,000 LAK total budget might split as 8,000,000 LAK for venue and food, 5,000,000 LAK for attire, and the rest across smaller items — decide the split before spending starts.$$),
      jsonb_build_object('heading', $$Build in a buffer for surprises$$, 'body', $$Set aside 10-15% of the total budget for unexpected costs — events almost always have at least one expense nobody planned for.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງງົບປະມານລວມກ່ອນ$$, 'body', $$ຕັດສິນຈຳນວນສູງສຸດທີ່ຍິນດີໃຊ້ຈ່າຍ ກ່ອນຈອງຫຍັງ — ຕົວເລກນີ້ຄວນນຳທາງທຸກການຕັດສິນໃຈຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ຕົວຢ່າງ: ແບ່ງງົບລວມທີ່ກຳນົດ$$, 'body', $$ງົບລວມ 20,000,000 ກີບ ອາດແບ່ງເປັນ 8,000,000 ກີບສະຖານທີ່ ແລະ ອາຫານ, 5,000,000 ກີບເຄື່ອງນຸ່ງຫົ່ມ ແລະ ສ່ວນທີ່ເຫຼືອສຳລັບລາຍການນ້ອຍ — ຕັດສິນການແບ່ງກ່ອນເລີ່ມໃຊ້ຈ່າຍ.$$),
      jsonb_build_object('heading', $$ເກັບເງິນສະຫງວນສຳລັບເລື່ອງບໍ່ຄາດຄິດ$$, 'body', $$ເກັບ 10-15% ຂອງງົບລວມໄວ້ສຳລັບຄ່າໃຊ້ຈ່າຍທີ່ບໍ່ຄາດຄິດ — ງານໃຫຍ່ມັກມີຄ່າໃຊ້ຈ່າຍຢ່າງໜ້ອຍໜຶ່ງອັນທີ່ບໍ່ມີໃຜວາງແຜນໄວ້.$$)
    ),
    array[$$Set the total budget before booking anything$$, $$Allocate the total across categories before spending starts$$, $$Build in a 10-15% buffer for unexpected costs$$],
    array[$$ຕັ້ງງົບປະມານລວມກ່ອນຈອງຫຍັງ$$, $$ແບ່ງງົບລວມຕາມໝວດກ່ອນເລີ່ມໃຊ້ຈ່າຍ$$, $$ເກັບເງິນສະຫງວນ 10-15% ສຳລັບເລື່ອງບໍ່ຄາດຄິດ$$],
    4, false, 56
  ),
  (
    $$understand-rainy-day-vs-emergency-fund$$,
    $$Understand the difference between a rainy day fund and an emergency fund$$,
    $$ເຂົ້າໃຈຄວາມແຕກຕ່າງລະຫວ່າງເງິນສະສົມຍາມຝົນຕົກ ແລະ ເງິນສະສົມສຸກເສີນ$$,
    $$Two different savings pools serve two different kinds of financial surprises.$$,
    $$ເງິນອອມສອງແຫຼ່ງທີ່ຕ່າງກັນ ຮັບໃຊ້ຄວາມແປກໃຈທາງການເງິນສອງແບບທີ່ຕ່າງກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Rainy day fund: small, frequent surprises$$, 'body', $$A flat tire, a small appliance repair, an unplanned guest — a few hundred thousand kip covers these regular small surprises.$$),
      jsonb_build_object('heading', $$Emergency fund: large, rare disruptions$$, 'body', $$Job loss, a serious illness, a major accident — this fund should cover several months of essential expenses, held separately and untouched otherwise.$$),
      jsonb_build_object('heading', $$Build both, in order$$, 'body', $$Start with a small rainy day fund first, then work toward the larger emergency fund — this order keeps small surprises from forcing you into the bigger fund.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເງິນຍາມຝົນຕົກ: ຄວາມແປກໃຈນ້ອຍ ແລະ ເລື້ອຍ$$, 'body', $$ຢາງແປ, ການສ້ອມແປງເຄື່ອງໃຊ້ນ້ອຍ, ແຂກມາໂດຍບໍ່ໄດ້ນັດ — ສອງສາມແສນກີບຄອບຄຸມຄວາມແປກໃຈນ້ອຍໆເຫຼົ່ານີ້.$$),
      jsonb_build_object('heading', $$ເງິນສຸກເສີນ: ການລົບກວນໃຫຍ່ ແລະ ຫາຍາກ$$, 'body', $$ຕົກວຽກ, ເຈັບປ່ວຍໜັກ, ອຸບັດຕິເຫດໃຫຍ່ — ເງິນນີ້ຄວນຄອບຄຸມຄ່າໃຊ້ຈ່າຍຈຳເປັນຫຼາຍເດືອນ ເກັບແຍກ ແລະ ບໍ່ແຕະນອກຈາກນັ້ນ.$$),
      jsonb_build_object('heading', $$ສ້າງທັງສອງຕາມລຳດັບ$$, 'body', $$ເລີ່ມດ້ວຍເງິນຍາມຝົນຕົກນ້ອຍກ່ອນ ແລ້ວຄ່ອຍສ້າງເງິນສຸກເສີນທີ່ໃຫຍ່ກວ່າ — ລຳດັບນີ້ປ້ອງກັນບໍ່ໃຫ້ຄວາມແປກໃຈນ້ອຍບັງຄັບໃຫ້ໃຊ້ເງິນສຸກເສີນໃຫຍ່.$$)
    ),
    array[$$A rainy day fund covers small, frequent surprises$$, $$An emergency fund covers rare but major disruptions$$, $$Build the small rainy day fund first, then the larger one$$],
    array[$$ເງິນຍາມຝົນຕົກຄອບຄຸມຄວາມແປກໃຈນ້ອຍ ແລະ ເລື້ອຍ$$, $$ເງິນສຸກເສີນຄອບຄຸມການລົບກວນໃຫຍ່ແຕ່ຫາຍາກ$$, $$ສ້າງເງິນຍາມຝົນຕົກນ້ອຍກ່ອນ ແລ້ວຄ່ອຍສ້າງອັນໃຫຍ່ກວ່າ$$],
    4, false, 57
  ),
  (
    $$avoid-keeping-all-cash-at-home$$,
    $$Avoid keeping all your savings as cash at home$$,
    $$ຫຼີກລ້ຽງການເກັບເງິນອອມທັງໝົດເປັນເງິນສົດຢູ່ເຮືອນ$$,
    $$Cash at home is vulnerable to loss, theft, and losing value to inflation with no growth at all.$$,
    $$ເງິນສົດຢູ່ເຮືອນ ສ່ຽງຕໍ່ການເສຍ, ການລັກ ແລະ ເສຍມູນຄ່າໃຫ້ເງິນເຟີ້ໂດຍບໍ່ມີການເຕີບໂຕເລີຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Understand the real risks$$, 'body', $$Fire, theft, or simply misplacing it can wipe out cash savings instantly, with no way to recover it — a bank or savings group offers real protection.$$),
      jsonb_build_object('heading', $$Keep only what you need for near-term use$$, 'body', $$A small amount of cash on hand for daily needs is reasonable — the bulk of savings is safer in a formal account.$$),
      jsonb_build_object('heading', $$Even a basic account protects and can grow it$$, 'body', $$A savings account, even with modest interest, both protects against physical loss and lets your money grow slightly over time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຂົ້າໃຈຄວາມສ່ຽງແທ້ຈິງ$$, 'body', $$ໄຟໄໝ້, ການລັກ ຫຼືພຽງແຕ່ວາງເຄື່ອນທີ່ ອາດເຮັດໃຫ້ເງິນສົດທີ່ອອມໄວ້ຫາຍໄປທັນທີ ໂດຍບໍ່ມີທາງກູ້ຄືນ — ທະນາຄານ ຫຼືກຸ່ມອອມໃຫ້ການປົກປ້ອງທີ່ແທ້ຈິງ.$$),
      jsonb_build_object('heading', $$ເກັບພຽງເທົ່າທີ່ຕ້ອງການໃຊ້ໄວໆນີ້$$, 'body', $$ເງິນສົດຈຳນວນນ້ອຍໄວ້ໃຊ້ປະຈຳວັນເປັນເລື່ອງສົມເຫດສົມຜົນ — ເງິນອອມສ່ວນໃຫຍ່ປອດໄພກວ່າໃນບັນຊີທາງການ.$$),
      jsonb_build_object('heading', $$ແມ່ນແຕ່ບັນຊີພື້ນຖານ ກໍ່ປົກປ້ອງ ແລະ ຊ່ວຍໃຫ້ເຕີບໂຕ$$, 'body', $$ບັນຊີອອມ ເຖິງແມ່ນດອກເບ້ຍພໍປານກາງ ທັງປົກປ້ອງຈາກການເສຍທາງກາຍະພາບ ແລະ ໃຫ້ເງິນເຕີບໂຕເລັກນ້ອຍຕາມເວລາ.$$)
    ),
    array[$$Cash at home can be lost to fire, theft, or misplacement$$, $$Keep only what you need for near-term daily use in cash$$, $$A basic savings account protects money and lets it grow$$],
    array[$$ເງິນສົດຢູ່ເຮືອນ ອາດເສຍໄປຍ້ອນໄຟໄໝ້, ການລັກ ຫຼືວາງເຄື່ອນທີ່$$, $$ເກັບເປັນເງິນສົດພຽງເທົ່າທີ່ຕ້ອງການໃຊ້ໄວໆນີ້$$, $$ບັນຊີອອມພື້ນຖານ ປົກປ້ອງເງິນ ແລະ ໃຫ້ມັນເຕີບໂຕໄດ້$$],
    4, false, 58
  ),
  (
    $$send-money-and-remittances-safely$$,
    $$Send money and remittances safely$$,
    $$ສົ່ງເງິນ ແລະ ເງິນໂອນຈາກຕ່າງແດນຢ່າງປອດໄພ$$,
    $$Compare fees and use trusted channels — money sent across distance has more room for costly mistakes.$$,
    $$ປຽບທຽບຄ່າທຳນຽມ ແລະ ໃຊ້ຊ່ອງທາງທີ່ໜ້າເຊື່ອຖື — ເງິນທີ່ສົ່ງໄກ ມີໂອກາດຜິດພາດທີ່ເສຍຄ່າໃຊ້ຈ່າຍຫຼາຍກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Compare transfer fees before choosing a service$$, 'body', $$Fees and exchange rates vary significantly between money transfer services — a quick comparison can save a meaningful amount.$$),
      jsonb_build_object('heading', $$Double-check recipient details every time$$, 'body', $$Verify the account number or name carefully before sending — international and cross-border transfers are often very difficult to reverse.$$),
      jsonb_build_object('heading', $$Use licensed, trusted providers only$$, 'body', $$Stick to banks or officially licensed transfer services, even if a slightly cheaper unofficial option exists — the safety is worth the difference.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປຽບທຽບຄ່າທຳນຽມການໂອນກ່ອນເລືອກບໍລິການ$$, 'body', $$ຄ່າທຳນຽມ ແລະ ອັດຕາແລກປ່ຽນແຕກຕ່າງກັນຫຼາຍລະຫວ່າງບໍລິການໂອນເງິນ — ການປຽບທຽບໄວໆອາດປະຢັດໄດ້ຈຳນວນທີ່ມີຄວາມໝາຍ.$$),
      jsonb_build_object('heading', $$ກວດຂໍ້ມູນຜູ້ຮັບຄືນທຸກຄັ້ງ$$, 'body', $$ກວດເລກບັນຊີ ຫຼືຊື່ຢ່າງລະມັດລະວັງກ່ອນສົ່ງ — ການໂອນຂ້າມປະເທດ ມັກກັບຄືນຍາກຫຼາຍ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຜູ້ໃຫ້ບໍລິການທີ່ມີໃບອະນຸຍາດ ແລະ ໜ້າເຊື່ອຖືເທົ່ານັ້ນ$$, 'body', $$ໃຊ້ທະນາຄານ ຫຼືບໍລິການໂອນເງິນທີ່ມີໃບອະນຸຍາດທາງການ ເຖິງແມ່ນມີທາງເລືອກນອກລະບົບທີ່ຖືກກວ່າໜ້ອຍໜຶ່ງ — ຄວາມປອດໄພຄຸ້ມຄ່າກັບຄວາມແຕກຕ່າງນັ້ນ.$$)
    ),
    array[$$Compare fees and rates across transfer services first$$, $$Double-check recipient details carefully before sending$$, $$Use only licensed, trusted providers, even if slightly pricier$$],
    array[$$ປຽບທຽບຄ່າທຳນຽມ ແລະ ອັດຕາລະຫວ່າງບໍລິການໂອນກ່ອນ$$, $$ກວດຂໍ້ມູນຜູ້ຮັບຢ່າງລະມັດລະວັງກ່ອນສົ່ງ$$, $$ໃຊ້ຜູ້ໃຫ້ບໍລິການທີ່ມີໃບອະນຸຍາດ ແລະ ໜ້າເຊື່ອຖືເທົ່ານັ້ນ$$],
    4, false, 59
  ),
  (
    $$set-financial-goals-for-different-time-horizons$$,
    $$Set financial goals for different time horizons$$,
    $$ຕັ້ງເປົ້າໝາຍການເງິນສຳລັບໄລຍະເວລາທີ່ຕ່າງກັນ$$,
    $$Short, medium, and long-term goals each need a different plan and place to save.$$,
    $$ເປົ້າໝາຍໄລຍະສັ້ນ, ກາງ ແລະ ຍາວ ແຕ່ລະອັນຕ້ອງການແຜນ ແລະ ບ່ອນອອມທີ່ຕ່າງກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Short-term: within a year$$, 'body', $$A phone, a festival, or a small trip — save in an easily accessible account since you'll need this money soon.$$),
      jsonb_build_object('heading', $$Medium-term: one to five years$$, 'body', $$A motorbike, a wedding, or further study — this money can sit a little longer, potentially in something that earns modest growth.$$),
      jsonb_build_object('heading', $$Long-term: five years and beyond$$, 'body', $$Retirement or a child's future education — this money has the most time to grow and can handle a longer-term savings approach.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໄລຍະສັ້ນ: ພາຍໃນໜຶ່ງປີ$$, 'body', $$ໂທລະສັບ, ງານບຸນ ຫຼືການທ່ຽວນ້ອຍ — ອອມໄວ້ໃນບັນຊີທີ່ເຂົ້າເຖິງງ່າຍ ເພາະຈະຕ້ອງການເງິນນີ້ໄວໆນີ້.$$),
      jsonb_build_object('heading', $$ໄລຍະກາງ: 1-5 ປີ$$, 'body', $$ລົດຈັກ, ງານແຕ່ງງານ ຫຼືການຮຽນຕໍ່ — ເງິນນີ້ຢູ່ໄດ້ດົນຂຶ້ນໜ້ອຍໜຶ່ງ ອາດຢູ່ໃນສິ່ງທີ່ໃຫ້ການເຕີບໂຕພໍປານກາງ.$$),
      jsonb_build_object('heading', $$ໄລຍະຍາວ: 5 ປີຂຶ້ນໄປ$$, 'body', $$ເງິນເກສຽນ ຫຼືການສຶກສາລູກໃນອະນາຄົດ — ເງິນນີ້ມີເວລາເຕີບໂຕຫຼາຍທີ່ສຸດ ແລະ ຮັບວິທີອອມໄລຍະຍາວໄດ້.$$)
    ),
    array[$$Short-term goals need easily accessible savings$$, $$Medium-term goals can sit slightly longer with modest growth$$, $$Long-term goals have the most time to grow substantially$$],
    array[$$ເປົ້າໝາຍໄລຍະສັ້ນຕ້ອງການເງິນອອມທີ່ເຂົ້າເຖິງງ່າຍ$$, $$ເປົ້າໝາຍໄລຍະກາງ ຢູ່ໄດ້ດົນຂຶ້ນນ້ອຍໜຶ່ງດ້ວຍການເຕີບໂຕພໍປານກາງ$$, $$ເປົ້າໝາຍໄລຍະຍາວ ມີເວລາເຕີບໂຕຫຼາຍທີ່ສຸດ$$],
    4, false, 60
  ),
  (
    $$understand-the-psychology-of-spending-triggers$$,
    $$Understand the psychology of your spending triggers$$,
    $$ເຂົ້າໃຈຈິດວິທະຍາຂອງສິ່ງກະຕຸ້ນການໃຊ້ຈ່າຍ$$,
    $$Emotional states, not just needs, often drive purchases — knowing your triggers helps you catch them.$$,
    $$ສະພາບອາລົມ ບໍ່ແມ່ນແຕ່ຄວາມຈຳເປັນ ມັກກະຕຸ້ນການຊື້ — ການຮູ້ຈັກສິ່ງກະຕຸ້ນຊ່ວຍໃຫ້ຈັບໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Notice the feeling before the purchase$$, 'body', $$Stress, boredom, sadness, or even celebration can each trigger spending — pause and name the feeling before buying something unplanned.$$),
      jsonb_build_object('heading', $$Find a non-spending response to the same feeling$$, 'body', $$A walk, a call to a friend, or music can address the same emotional need that shopping was trying to fill, without the cost.$$),
      jsonb_build_object('heading', $$Track your triggers over a month$$, 'body', $$Noting what you were feeling before each unplanned purchase reveals a pattern you can then plan around specifically.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັງເກດຄວາມຮູ້ສຶກກ່ອນການຊື້$$, 'body', $$ຄວາມກົດດັນ, ຄວາມເບື່ອ, ຄວາມເສົ້າ ຫຼືແມ່ນແຕ່ການສະເຫຼີມສະຫຼອງ ລ້ວນກະຕຸ້ນການໃຊ້ຈ່າຍໄດ້ — ຢຸດ ແລະ ຕັ້ງຊື່ຄວາມຮູ້ສຶກກ່ອນຊື້ສິ່ງທີ່ບໍ່ໄດ້ວາງແຜນ.$$),
      jsonb_build_object('heading', $$ຫາວິທີຕອບໂຕ້ຄວາມຮູ້ສຶກໂດຍບໍ່ໃຊ້ຈ່າຍ$$, 'body', $$ການຍ່າງ, ໂທຫາໝູ່ ຫຼືເພງ ອາດຕອບຄວາມຕ້ອງການທາງອາລົມດຽວກັນທີ່ການຊື້ເຄື່ອງພະຍາຍາມແກ້ໄຂ ໂດຍບໍ່ເສຍຄ່າໃຊ້ຈ່າຍ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມສິ່ງກະຕຸ້ນຕະຫຼອດໜຶ່ງເດືອນ$$, 'body', $$ບັນທຶກຄວາມຮູ້ສຶກກ່ອນການຊື້ທີ່ບໍ່ໄດ້ວາງແຜນແຕ່ລະຄັ້ງ ເປີດເຜີຍຮູບແບບທີ່ວາງແຜນຮັບມືໄດ້ສະເພາະ.$$)
    ),
    array[$$Notice the emotional feeling before an unplanned purchase$$, $$Find a non-spending way to address the same feeling$$, $$Track triggers over a month to find your real pattern$$],
    array[$$ສັງເກດຄວາມຮູ້ສຶກກ່ອນການຊື້ທີ່ບໍ່ໄດ້ວາງແຜນ$$, $$ຫາວິທີຕອບໂຕ້ຄວາມຮູ້ສຶກດຽວກັນໂດຍບໍ່ໃຊ້ຈ່າຍ$$, $$ຕິດຕາມສິ່ງກະຕຸ້ນຕະຫຼອດໜຶ່ງເດືອນເພື່ອຫາຮູບແບບຈິງ$$],
    4, false, 61
  ),
  (
    $$understand-microfinance-and-village-savings-groups$$,
    $$Understand microfinance and village savings groups$$,
    $$ເຂົ້າໃຈໄມໂຄຣຟິນານ ແລະ ກຸ່ມອອມເງິນໝູ່ບ້ານ$$,
    $$Community savings groups can be a practical, accessible way to save and borrow small amounts.$$,
    $$ກຸ່ມອອມເງິນຊຸມຊົນ ອາດເປັນວິທີທີ່ໃຊ້ໄດ້ຈິງ ແລະ ເຂົ້າເຖິງໄດ້ໃນການອອມ ແລະ ຢືມຈຳນວນນ້ອຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$How a savings group typically works$$, 'body', $$Members contribute a fixed amount regularly into a shared pool, which members can then borrow from on agreed terms.$$),
      jsonb_build_object('heading', $$Understand the group's rules clearly$$, 'body', $$Know the contribution amount, interest terms, and what happens if a member can't pay before joining any group.$$),
      jsonb_build_object('heading', $$Choose a group with trusted, transparent leadership$$, 'body', $$A well-run group keeps clear, shared records — ask to see how contributions and loans are tracked before joining.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຸ່ມອອມທົ່ວໄປເຮັດວຽກແນວໃດ$$, 'body', $$ສະມາຊິກສົ່ງເງິນຈຳນວນຄົງທີ່ເປັນປົກກະຕິເຂົ້າກອງທຶນຮ່ວມ ເຊິ່ງສະມາຊິກສາມາດຢືມໄດ້ຕາມເງື່ອນໄຂທີ່ຕົກລົງກັນ.$$),
      jsonb_build_object('heading', $$ເຂົ້າໃຈກົດຂອງກຸ່ມໃຫ້ຊັດເຈນ$$, 'body', $$ຮູ້ຈຳນວນທີ່ຕ້ອງສົ່ງ, ເງື່ອນໄຂດອກເບ້ຍ ແລະ ຈະເປັນແນວໃດຖ້າສະມາຊິກຈ່າຍບໍ່ໄດ້ ກ່ອນເຂົ້າຮ່ວມກຸ່ມໃດ.$$),
      jsonb_build_object('heading', $$ເລືອກກຸ່ມທີ່ມີຜູ້ນຳໜ້າເຊື່ອຖື ແລະ ໂປ່ງໃສ$$, 'body', $$ກຸ່ມທີ່ບໍລິຫານດີ ຮັກສາບັນທຶກທີ່ຊັດເຈນ ແລະ ແບ່ງປັນ — ຂໍເບິ່ງວິທີບັນທຶກເງິນສົ່ງ ແລະ ເງິນກູ້ກ່ອນເຂົ້າຮ່ວມ.$$)
    ),
    array[$$Understand how contributions and borrowing work in the group$$, $$Know the rules and terms clearly before joining$$, $$Choose a group with trusted, transparent record-keeping$$],
    array[$$ເຂົ້າໃຈວ່າການສົ່ງເງິນ ແລະ ການຢືມໃນກຸ່ມເຮັດວຽກແນວໃດ$$, $$ຮູ້ກົດ ແລະ ເງື່ອນໄຂໃຫ້ຊັດເຈນກ່ອນເຂົ້າຮ່ວມ$$, $$ເລືອກກຸ່ມທີ່ບັນທຶກຂໍ້ມູນຢ່າງໜ້າເຊື່ອຖື ແລະ ໂປ່ງໃສ$$],
    4, false, 62
  ),
  (
    $$review-and-adjust-your-budget-monthly$$,
    $$Review and adjust your budget every month$$,
    $$ທົບທວນ ແລະ ປັບງົບປະມານທຸກເດືອນ$$,
    $$A budget is a living plan that needs regular adjustment, not a document written once and forgotten.$$,
    $$ງົບປະມານເປັນແຜນທີ່ມີຊີວິດ ຕ້ອງການການປັບເປັນປົກກະຕິ ບໍ່ແມ່ນເອກະສານທີ່ຂຽນຄັ້ງດຽວແລ້ວລືມ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Compare planned versus actual spending$$, 'body', $$At month's end, check each category against what you actually spent — the gaps tell you exactly where to adjust next month.$$),
      jsonb_build_object('heading', $$Adjust categories based on real life$$, 'body', $$If transport always costs more than planned, raise that category and lower another — a budget that fights reality gets abandoned.$$),
      jsonb_build_object('heading', $$Celebrate what went well too$$, 'body', $$Notice categories where you stayed under budget or hit a savings goal — recognizing wins keeps the monthly habit feeling worthwhile.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປຽບທຽບແຜນ ທຽບກັບການໃຊ້ຈ່າຍຈິງ$$, 'body', $$ທ້າຍເດືອນ ໃຫ້ກວດແຕ່ລະໝວດທຽບກັບສິ່ງທີ່ໃຊ້ຈ່າຍຈິງ — ຊ່ອງຫວ່າງບອກໄດ້ວ່າຄວນປັບຢູ່ໃສເດືອນໜ້າ.$$),
      jsonb_build_object('heading', $$ປັບໝວດຕາມຊີວິດຈິງ$$, 'body', $$ຖ້າຄ່າເດີນທາງໃຊ້ຫຼາຍກວ່າແຜນສະເໝີ ໃຫ້ເພີ່ມໝວດນັ້ນ ແລະ ຫຼຸດອັນອື່ນ — ງົບປະມານທີ່ຝືນຄວາມເປັນຈິງ ມັກຖືກປະຖິ້ມ.$$),
      jsonb_build_object('heading', $$ສະເຫຼີມສະຫຼອງສິ່ງທີ່ໄປໄດ້ດີເໝືອນກັນ$$, 'body', $$ສັງເກດໝວດທີ່ໃຊ້ຈ່າຍໜ້ອຍກວ່າງົບ ຫຼືບັນລຸເປົ້າໝາຍອອມ — ການຮັບຮູ້ໄຊຊະນະ ຮັກສານິໄສປະຈຳເດືອນໃຫ້ຮູ້ສຶກຄຸ້ມຄ່າ.$$)
    ),
    array[$$Compare planned versus actual spending at month's end$$, $$Adjust budget categories to match real life, not fight it$$, $$Notice and celebrate the categories that went well$$],
    array[$$ປຽບທຽບແຜນ ທຽບກັບການໃຊ້ຈ່າຍຈິງທ້າຍເດືອນ$$, $$ປັບໝວດງົບປະມານໃຫ້ກົງກັບຊີວິດຈິງ ບໍ່ແມ່ນຝືນມັນ$$, $$ສັງເກດ ແລະ ສະເຫຼີມສະຫຼອງໝວດທີ່ໄປໄດ້ດີ$$],
    4, false, 63
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'money'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
