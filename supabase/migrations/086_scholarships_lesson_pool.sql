-- Bulk lesson-pool seed: Scholarships direction.
-- Adds original, evergreen application-guidance lessons so the pool has 50+
-- published lessons before launch; the weekly content-forge job adds on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'SCHOLARSHIP', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$write-a-compelling-scholarship-essay$$,
    $$Write a scholarship essay that stands out$$,
    $$ຂຽນບົດຄວາມສະໝັກທຶນທີ່ໂດດເດັ່ນ$$,
    $$A specific, honest story beats a generic list of achievements every time.$$,
    $$ເລື່ອງລາວທີ່ສະເພາະ ແລະ ຈິງໃຈ ດີກວ່າລາຍການຄວາມສຳເລັດທົ່ວໄປສະເໝີ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Open with a specific moment$$, 'body', $$Start with one real scene — a conversation, a realization, a challenge — rather than a broad statement like "I have always loved learning."$$),
      jsonb_build_object('heading', $$Show growth, not just achievement$$, 'body', $$Committees want to see how you think and change, not just a list of awards — connect the story to what you learned about yourself.$$),
      jsonb_build_object('heading', $$End by connecting to your future goal$$, 'body', $$Close by linking your story directly to why this scholarship matters for the specific path you want to take next.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເປີດດ້ວຍຊ່ວງເວລາທີ່ສະເພາະ$$, 'body', $$ເລີ່ມດ້ວຍເຫດການຈິງໜຶ່ງອັນ — ການສົນທະນາ, ຄວາມຮູ້ສຶກຮູ້ຕົວ, ສິ່ງທ້າທາຍ — ແທນທີ່ຈະເລີ່ມແບບກວ້າງໆ ເຊັ່ນ "ຂ້ອຍຮັກການຮຽນຮູ້ມາຕະຫຼອດ."$$),
      jsonb_build_object('heading', $$ສະແດງການເຕີບໂຕ ບໍ່ແມ່ນແຕ່ຄວາມສຳເລັດ$$, 'body', $$ຄະນະກຳມະການຢາກເຫັນວິທີຄິດ ແລະ ການປ່ຽນແປງຂອງທ່ານ ບໍ່ແມ່ນແຕ່ລາຍການລາງວັນ — ເຊື່ອມເລື່ອງລາວກັບສິ່ງທີ່ຮຽນຮູ້ກ່ຽວກັບຕົນເອງ.$$),
      jsonb_build_object('heading', $$ຈົບໂດຍເຊື່ອມກັບເປົ້າໝາຍອະນາຄົດ$$, 'body', $$ຈົບໂດຍເຊື່ອມເລື່ອງລາວກັບເຫດຜົນທີ່ທຶນນີ້ສຳຄັນຕໍ່ເສັ້ນທາງສະເພາະທີ່ຢາກກ້າວຕໍ່ໄປ.$$)
    ),
    array[$$Open with one specific, real moment, not a broad statement$$, $$Show how you grew or changed, not just what you achieved$$, $$Connect your story clearly to your future goal$$],
    array[$$ເປີດດ້ວຍເຫດການຈິງໜຶ່ງອັນ ບໍ່ແມ່ນຄຳເວົ້າກວ້າງໆ$$, $$ສະແດງການເຕີບໂຕ ຫຼືການປ່ຽນແປງ ບໍ່ແມ່ນແຕ່ຄວາມສຳເລັດ$$, $$ເຊື່ອມເລື່ອງລາວກັບເປົ້າໝາຍອະນາຄົດຢ່າງຊັດເຈນ$$],
    6, false, 20
  ),
  (
    $$find-scholarships-matching-your-background$$,
    $$Find scholarships that match your specific background$$,
    $$ຊອກຫາທຶນທີ່ກົງກັບພື້ນຖານສະເພາະຂອງທ່ານ$$,
    $$The best-matched scholarships are often smaller and less competitive than the famous ones.$$,
    $$ທຶນທີ່ເໝາະສົມທີ່ສຸດ ມັກນ້ອຍກວ່າ ແລະ ແຂ່ງຂັນໜ້ອຍກວ່າທຶນທີ່ມີຊື່ສຽງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List everything unique about you$$, 'body', $$Your field of study, hometown, hobbies, family background, and community involvement can all match specific scholarship criteria.$$),
      jsonb_build_object('heading', $$Check with your school first$$, 'body', $$Your school's guidance office or financial aid office often knows about smaller, local scholarships that aren't widely advertised online.$$),
      jsonb_build_object('heading', $$Search less-competitive niche categories$$, 'body', $$Scholarships tied to a specific hobby, essay topic, or unusual background often have far fewer applicants than general ones.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນທຸກຢ່າງທີ່ເປັນເອກະລັກຂອງທ່ານ$$, 'body', $$ສາຂາຮຽນ, ບ້ານເກີດ, ງານອະດິເລກ, ພື້ນຖານຄອບຄົວ ແລະ ການມີສ່ວນຮ່ວມໃນຊຸມຊົນ ລ້ວນອາດກົງກັບເງື່ອນໄຂທຶນສະເພາະ.$$),
      jsonb_build_object('heading', $$ກວດກັບໂຮງຮຽນກ່ອນ$$, 'body', $$ຫ້ອງແນະແນວ ຫຼືຫ້ອງທຶນການສຶກສາຂອງໂຮງຮຽນ ມັກຮູ້ຈັກທຶນນ້ອຍໆໃນທ້ອງຖິ່ນທີ່ບໍ່ໄດ້ໂຄສະນາກວ້າງອອນລາຍ.$$),
      jsonb_build_object('heading', $$ຄົ້ນຫາໝວດສະເພາະທີ່ແຂ່ງຂັນໜ້ອຍ$$, 'body', $$ທຶນທີ່ຜູກກັບງານອະດິເລກສະເພາະ, ຫົວຂໍ້ບົດຄວາມ ຫຼືພື້ນຖານທີ່ບໍ່ທົ່ວໄປ ມັກມີຜູ້ສະໝັກໜ້ອຍກວ່າທຶນທົ່ວໄປຫຼາຍ.$$)
    ),
    array[$$List everything unique about your background and interests$$, $$Ask your school about smaller, local scholarships first$$, $$Search niche categories, which often have less competition$$],
    array[$$ຂຽນທຸກຢ່າງທີ່ເປັນເອກະລັກຂອງພື້ນຖານ ແລະ ຄວາມສົນໃຈ$$, $$ຖາມໂຮງຮຽນກ່ຽວກັບທຶນນ້ອຍໃນທ້ອງຖິ່ນກ່ອນ$$, $$ຄົ້ນຫາໝວດສະເພາະທີ່ມັກແຂ່ງຂັນໜ້ອຍກວ່າ$$],
    5, false, 21
  ),
  (
    $$build-a-strong-academic-reference-network$$,
    $$Build a strong network of academic references early$$,
    $$ສ້າງເຄືອຂ່າຍຜູ້ຮັບຮອງທາງວິຊາການທີ່ເຂັ້ມແຂງແຕ່ໄວ$$,
    $$Strong recommendation letters come from teachers who genuinely know your work, built over time.$$,
    $$ໜັງສືຮັບຮອງທີ່ດີ ມາຈາກຄູທີ່ຮູ້ຈັກຜົນງານທ່ານແທ້ ເຊິ່ງສ້າງຂຶ້ນຕາມເວລາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Engage genuinely in class, not just before deadlines$$, 'body', $$Ask questions, participate, and turn in strong work consistently — this is what makes a teacher remember you well later.$$),
      jsonb_build_object('heading', $$Pick two or three teachers to know well$$, 'body', $$You don't need every teacher to know you — build a genuine relationship with two or three across different subjects.$$),
      jsonb_build_object('heading', $$Ask well before you need the letter$$, 'body', $$Give a teacher at least a month's notice, plus a summary of your goals and achievements to make writing the letter easier.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ມີສ່ວນຮ່ວມແທ້ໃນຫ້ອງຮຽນ ບໍ່ແມ່ນແຕ່ໃກ້ກຳນົດເວລາ$$, 'body', $$ຖາມຄຳຖາມ, ມີສ່ວນຮ່ວມ ແລະ ສົ່ງວຽກທີ່ດີສະໝ່ຳສະເໝີ — ນີ້ຄືສິ່ງທີ່ເຮັດໃຫ້ຄູຈື່ທ່ານໄດ້ດີພາຍຫຼັງ.$$),
      jsonb_build_object('heading', $$ເລືອກສອງສາມຄູທີ່ຈະຮູ້ຈັກກັນດີ$$, 'body', $$ບໍ່ຈຳເປັນໃຫ້ທຸກຄູຮູ້ຈັກທ່ານ — ສ້າງຄວາມສຳພັນຈິງກັບສອງສາມຄົນຈາກຫຼາຍວິຊາ.$$),
      jsonb_build_object('heading', $$ຂໍລ່ວງໜ້າກ່ອນຕ້ອງການໜັງສືແທ້$$, 'body', $$ໃຫ້ຄູຢ່າງໜ້ອຍໜຶ່ງເດືອນ ພ້ອມສະຫຼຸບເປົ້າໝາຍ ແລະ ຄວາມສຳເລັດ ເພື່ອຊ່ວຍໃຫ້ຂຽນໜັງສືງ່າຍຂຶ້ນ.$$)
    ),
    array[$$Engage genuinely in class throughout the year, not just at deadlines$$, $$Build real relationships with two or three teachers$$, $$Ask for a letter at least a month before you need it$$],
    array[$$ມີສ່ວນຮ່ວມແທ້ຕະຫຼອດປີ ບໍ່ແມ່ນແຕ່ໃກ້ກຳນົດເວລາ$$, $$ສ້າງຄວາມສຳພັນຈິງກັບສອງສາມຄູ$$, $$ຂໍໜັງສືຢ່າງໜ້ອຍໜຶ່ງເດືອນກ່ອນຕ້ອງການແທ້$$],
    5, false, 22
  ),
  (
    $$understand-types-of-scholarships$$,
    $$Understand the different types of scholarships available$$,
    $$ເຂົ້າໃຈປະເພດທຶນການສຶກສາທີ່ມີຢູ່$$,
    $$Knowing the category helps you target your application and essay to what actually matters for that type.$$,
    $$ການຮູ້ປະເພດ ຊ່ວຍໃຫ້ເລັງໃບສະໝັກ ແລະ ບົດຄວາມໃຫ້ກົງກັບສິ່ງທີ່ສຳຄັນຕໍ່ປະເພດນັ້ນແທ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Merit-based vs. need-based$$, 'body', $$Merit-based scholarships reward achievement — grades, talent, leadership. Need-based ones focus on financial circumstances, so honesty about your situation matters most there.$$),
      jsonb_build_object('heading', $$Field-specific scholarships$$, 'body', $$Some scholarships only fund a specific major or career path — read the fine print to confirm you actually qualify before applying.$$),
      jsonb_build_object('heading', $$Renewable vs. one-time$$, 'body', $$A renewable scholarship continues for multiple years if you maintain certain conditions; a one-time award is a single payment — know which you're applying for.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອີງຄວາມສາມາດ ທຽບກັບ ອີງຄວາມຈຳເປັນ$$, 'body', $$ທຶນອີງຄວາມສາມາດໃຫ້ລາງວັນຄວາມສຳເລັດ — ຄະແນນ, ພອນສະຫວັນ, ຄວາມເປັນຜູ້ນຳ. ທຶນອີງຄວາມຈຳເປັນສຸມໃສ່ສະຖານະການເງິນ ສະນັ້ນຄວາມຊື່ສັດກ່ຽວກັບສະຖານະການສຳຄັນທີ່ສຸດຢູ່ນັ້ນ.$$),
      jsonb_build_object('heading', $$ທຶນສະເພາະສາຂາ$$, 'body', $$ບາງທຶນສະໜັບສະໜູນສະເພາະສາຂາ ຫຼືເສັ້ນທາງອາຊີບໃດໜຶ່ງ — ອ່ານລາຍລະອຽດໃຫ້ຄົບເພື່ອຢືນຢັນວ່າມີສິດແທ້ກ່ອນສະໝັກ.$$),
      jsonb_build_object('heading', $$ຕໍ່ໄດ້ ທຽບກັບ ຄັ້ງດຽວ$$, 'body', $$ທຶນທີ່ຕໍ່ໄດ້ ຈະສືບຕໍ່ຫຼາຍປີຖ້າຮັກສາເງື່ອນໄຂໄດ້; ທຶນຄັ້ງດຽວແມ່ນຈ່າຍຄັ້ງດຽວ — ຮູ້ວ່າກຳລັງສະໝັກອັນໃດ.$$)
    ),
    array[$$Merit-based rewards achievement; need-based focuses on finances$$, $$Field-specific scholarships require you to actually qualify$$, $$Know whether a scholarship is renewable or a one-time award$$],
    array[$$ອີງຄວາມສາມາດໃຫ້ລາງວັນຄວາມສຳເລັດ; ອີງຄວາມຈຳເປັນສຸມໃສ່ການເງິນ$$, $$ທຶນສະເພາະສາຂາຕ້ອງການໃຫ້ທ່ານມີສິດແທ້$$, $$ຮູ້ວ່າທຶນຕໍ່ໄດ້ ຫຼືເປັນລາງວັນຄັ້ງດຽວ$$],
    5, false, 23
  ),
  (
    $$prepare-for-a-scholarship-interview$$,
    $$Prepare for a scholarship interview$$,
    $$ກຽມພ້ອມສຳລັບການສຳພາດທຶນການສຶກສາ$$,
    $$Committees want to see the same person who wrote the essay, speaking naturally about their goals.$$,
    $$ຄະນະກຳມະການຢາກເຫັນຄົນດຽວກັບຜູ້ຂຽນບົດຄວາມ ເວົ້າກ່ຽວກັບເປົ້າໝາຍຢ່າງທຳມະຊາດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Reread your own application first$$, 'body', $$Review your essay and forms before the interview — committees often ask directly about something you wrote.$$),
      jsonb_build_object('heading', $$Practice explaining your goals out loud$$, 'body', $$Say your future plans and why this scholarship matters in your own words a few times before the real interview.$$),
      jsonb_build_object('heading', $$Prepare one thoughtful question to ask back$$, 'body', $$Asking about the scholarship community or past recipients shows genuine interest beyond just receiving the money.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອ່ານໃບສະໝັກຂອງທ່ານເອງກ່ອນ$$, 'body', $$ທົບທວນບົດຄວາມ ແລະ ແບບຟອມກ່ອນສຳພາດ — ຄະນະກຳມະການມັກຖາມກ່ຽວກັບສິ່ງທີ່ຂຽນໄວ້ໂດຍກົງ.$$),
      jsonb_build_object('heading', $$ຝຶກອະທິບາຍເປົ້າໝາຍອອກສຽງ$$, 'body', $$ເວົ້າແຜນອະນາຄົດ ແລະ ເຫດຜົນທີ່ທຶນນີ້ສຳຄັນ ດ້ວຍຄຳເວົ້າຂອງທ່ານເອງສອງສາມຄັ້ງກ່ອນສຳພາດຈິງ.$$),
      jsonb_build_object('heading', $$ກຽມໜຶ່ງຄຳຖາມທີ່ມີຄວາມຄິດຖາມກັບຄືນ$$, 'body', $$ຖາມກ່ຽວກັບຊຸມຊົນຜູ້ຮັບທຶນ ຫຼືຜູ້ຮັບທຶນທີ່ຜ່ານມາ ສະແດງຄວາມສົນໃຈແທ້ຈິງນອກເໜືອຈາກການໄດ້ຮັບເງິນ.$$)
    ),
    array[$$Reread your own essay and forms before the interview$$, $$Practice explaining your goals aloud in your own words$$, $$Prepare one thoughtful question to ask them$$],
    array[$$ອ່ານບົດຄວາມ ແລະ ແບບຟອມຂອງທ່ານກ່ອນສຳພາດ$$, $$ຝຶກອະທິບາຍເປົ້າໝາຍອອກສຽງດ້ວຍຄຳເວົ້າຂອງທ່ານເອງ$$, $$ກຽມໜຶ່ງຄຳຖາມທີ່ມີຄວາມຄິດຖາມກັບຄືນ$$],
    5, false, 24
  ),
  (
    $$write-a-personal-statement-that-stands-out$$,
    $$Write a personal statement that stands out$$,
    $$ຂຽນຄຳຖະແຫຼງສ່ວນຕົວທີ່ໂດດເດັ່ນ$$,
    $$A personal statement works best when it reveals how you think, not just what you've done.$$,
    $$ຄຳຖະແຫຼງສ່ວນຕົວທີ່ດີທີ່ສຸດ ເປີດເຜີຍວິທີຄິດຂອງທ່ານ ບໍ່ແມ່ນແຕ່ສິ່ງທີ່ເຮັດແລ້ວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Answer the real question being asked$$, 'body', $$Read the prompt carefully and address it directly — a beautifully written statement that misses the actual question won't score well.$$),
      jsonb_build_object('heading', $$Use specific details over general claims$$, 'body', $$"I organized a fundraiser that brought in 2 million kip for flood relief" is far stronger than "I am a leader."$$),
      jsonb_build_object('heading', $$Write like yourself, not like a formal essay$$, 'body', $$A natural, genuine voice is more memorable to a reader who's read hundreds of overly formal statements that all sound the same.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕອບຄຳຖາມທີ່ຖືກຖາມແທ້$$, 'body', $$ອ່ານໂຈດຢ່າງລະອຽດ ແລະ ຕອບໂດຍກົງ — ຄຳຖະແຫຼງທີ່ຂຽນສວຍງາມແຕ່ບໍ່ຕອບຄຳຖາມແທ້ ຈະບໍ່ໄດ້ຄະແນນດີ.$$),
      jsonb_build_object('heading', $$ໃຊ້ລາຍລະອຽດສະເພາະ ບໍ່ແມ່ນຄຳກ່າວອ້າງທົ່ວໄປ$$, 'body', $$"ຂ້ອຍຈັດງານລະດົມທຶນທີ່ໄດ້ 2 ລ້ານກີບເພື່ອຊ່ວຍນ້ຳຖ້ວມ" ໜັກແໜ້ນກວ່າ "ຂ້ອຍເປັນຜູ້ນຳ" ຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຂຽນແບບຕົນເອງ ບໍ່ແມ່ນແບບບົດຄວາມທາງການ$$, 'body', $$ສຽງທີ່ເປັນທຳມະຊາດ ແລະ ຈິງໃຈ ຈື່ໄດ້ດີກວ່າສຳລັບຜູ້ອ່ານທີ່ອ່ານຄຳຖະແຫຼງທາງການເກີນໄປຫຼາຍຮ້ອຍອັນທີ່ຟັງຄືກັນໝົດ.$$)
    ),
    array[$$Directly answer the actual prompt being asked$$, $$Use specific details instead of general claims$$, $$Write in your natural voice, not an overly formal one$$],
    array[$$ຕອບໂຈດທີ່ຖືກຖາມແທ້ໂດຍກົງ$$, $$ໃຊ້ລາຍລະອຽດສະເພາະ ແທນຄຳກ່າວອ້າງທົ່ວໄປ$$, $$ຂຽນດ້ວຍສຽງທຳມະຊາດ ບໍ່ແມ່ນທາງການເກີນໄປ$$],
    6, false, 25
  ),
  (
    $$track-scholarship-deadlines-without-missing-any$$,
    $$Track scholarship deadlines without missing any$$,
    $$ຕິດຕາມກຳນົດເວລາທຶນການສຶກສາໂດຍບໍ່ພາດອັນໃດ$$,
    $$A simple, visible tracking system prevents the heartbreak of missing a great opportunity.$$,
    $$ລະບົບຕິດຕາມທີ່ງ່າຍ ແລະ ເຫັນໄດ້ ປ້ອງກັນຄວາມເສຍໃຈຈາກການພາດໂອກາດດີໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Build one master list$$, 'body', $$Put every scholarship you're considering into one spreadsheet or note with deadline, requirements, and status — not scattered across memory.$$),
      jsonb_build_object('heading', $$Set reminders two weeks before, not the day of$$, 'body', $$A two-week buffer gives time to fix problems, gather a missing document, or ask for help if something goes wrong.$$),
      jsonb_build_object('heading', $$Note early-decision and rolling deadlines separately$$, 'body', $$Some scholarships award funds on a first-come basis — flag these to apply as early as possible rather than waiting until the last day.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສ້າງລາຍການຫຼັກໜຶ່ງອັນ$$, 'body', $$ໃສ່ທຶນທຸກອັນທີ່ກຳລັງພິຈາລະນາລົງໃນສະເປຣດຊີດ ຫຼືບັນທຶກດຽວ ພ້ອມກຳນົດເວລາ, ຄວາມຕ້ອງການ ແລະ ສະຖານະ — ບໍ່ແມ່ນກະຈັດກະຈາຍໃນຄວາມຈຳ.$$),
      jsonb_build_object('heading', $$ຕັ້ງເຕືອນ 2 ອາທິດກ່ອນ ບໍ່ແມ່ນມື້ນັ້ນ$$, 'body', $$ຊ່ອງເວລາ 2 ອາທິດ ໃຫ້ເວລາແກ້ບັນຫາ, ຫາເອກະສານທີ່ຂາດ ຫຼືຂໍຄວາມຊ່ວຍເຫຼືອຖ້າມີບັນຫາ.$$),
      jsonb_build_object('heading', $$ໝາຍທຶນທີ່ຮັບສະໝັກແບບຕໍ່ເນື່ອງແຍກໄວ້$$, 'body', $$ບາງທຶນໃຫ້ລາງວັນຕາມລຳດັບການສະໝັກ — ໝາຍໄວ້ເພື່ອສະໝັກໄວທີ່ສຸດເທົ່າທີ່ຈະໄວໄດ້ ແທນທີ່ຈະລໍຈົນວັນສຸດທ້າຍ.$$)
    ),
    array[$$Build one master list with every deadline and requirement$$, $$Set reminders two weeks ahead, not on the deadline day$$, $$Flag rolling-deadline scholarships to apply early$$],
    array[$$ສ້າງລາຍການຫຼັກທີ່ມີກຳນົດເວລາ ແລະ ຄວາມຕ້ອງການທັງໝົດ$$, $$ຕັ້ງເຕືອນ 2 ອາທິດກ່ອນ ບໍ່ແມ່ນມື້ກຳນົດເວລາ$$, $$ໝາຍທຶນທີ່ຮັບຕໍ່ເນື່ອງໄວ້ເພື່ອສະໝັກໄວ$$],
    4, false, 26
  ),
  (
    $$build-a-resume-for-scholarship-applications$$,
    $$Build a resume specifically for scholarship applications$$,
    $$ສ້າງ CV ສະເພາະສຳລັບການສະໝັກທຶນການສຶກສາ$$,
    $$A student scholarship resume highlights different things than a job resume — activities, service, and potential.$$,
    $$CV ສະໝັກທຶນຂອງນັກຮຽນ ເນັ້ນສິ່ງທີ່ຕ່າງຈາກ CV ສະໝັກງານ — ກິດຈະກຳ, ການບໍລິການ ແລະ ທ່າແຮງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Lead with academics and activities$$, 'body', $$GPA, relevant coursework, clubs, and volunteer work matter more here than formal work experience for most student applicants.$$),
      jsonb_build_object('heading', $$Quantify your involvement$$, 'body', $$"Led a team of 12 volunteers for 6 months" tells more than just listing "volunteer coordinator."$$),
      jsonb_build_object('heading', $$Keep it to one clean page$$, 'body', $$For most scholarship applications, one well-organized page is plenty — quality of entries matters more than length.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍວິຊາການ ແລະ ກິດຈະກຳ$$, 'body', $$GPA, ວິຊາທີ່ກ່ຽວຂ້ອງ, ຊົມຮົມ ແລະ ວຽກອາສາ ສຳຄັນກວ່າປະສົບການເຮັດວຽກທາງການ ສຳລັບຜູ້ສະໝັກເປັນນັກຮຽນສ່ວນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ໃສ່ຕົວເລກຂອງການມີສ່ວນຮ່ວມ$$, 'body', $$"ນຳທີມອາສາ 12 ຄົນເປັນເວລາ 6 ເດືອນ" ບອກໄດ້ຫຼາຍກວ່າການລະບຸແຕ່ "ຜູ້ປະສານງານອາສາສະໝັກ."$$),
      jsonb_build_object('heading', $$ຮັກສາໃຫ້ບໍ່ເກີນໜຶ່ງໜ້າ$$, 'body', $$ສຳລັບການສະໝັກທຶນສ່ວນຫຼາຍ ໜຶ່ງໜ້າທີ່ຈັດລຽບຮ້ອຍກໍ່ພຽງພໍ — ຄຸນນະພາບຂອງລາຍການສຳຄັນກວ່າຄວາມຍາວ.$$)
    ),
    array[$$Lead with academics, clubs, and volunteer work$$, $$Quantify your involvement with real numbers$$, $$Keep the resume to one clean, well-organized page$$],
    array[$$ເລີ່ມດ້ວຍວິຊາການ, ຊົມຮົມ ແລະ ວຽກອາສາ$$, $$ໃສ່ຕົວເລກຂອງການມີສ່ວນຮ່ວມ$$, $$ຮັກສາໃຫ້ບໍ່ເກີນໜຶ່ງໜ້າທີ່ຈັດລຽບຮ້ອຍ$$],
    4, false, 27
  ),
  (
    $$ask-a-teacher-for-a-strong-recommendation$$,
    $$Ask a teacher for a strong, specific recommendation letter$$,
    $$ຂໍໜັງສືຮັບຮອງທີ່ໜັກແໜ້ນ ແລະ ສະເພາະຈາກຄູ$$,
    $$A generic letter helps little — give the teacher material to make it specific and vivid.$$,
    $$ໜັງສືທົ່ວໄປຊ່ວຍໄດ້ໜ້ອຍ — ໃຫ້ຂໍ້ມູນຄູເພື່ອຂຽນໃຫ້ສະເພາະ ແລະ ຊັດເຈນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Provide a brag sheet$$, 'body', $$Give the teacher a short summary of your achievements, goals, and even specific classroom moments they might remember and mention.$$),
      jsonb_build_object('heading', $$Explain what the scholarship is looking for$$, 'body', $$Tell the teacher the specific qualities the scholarship values, so they can highlight the most relevant parts of your work.$$),
      jsonb_build_object('heading', $$Thank them regardless of the outcome$$, 'body', $$A short thank-you note after they write the letter, and again if you win, keeps the relationship warm for future needs.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ໃບສະຫຼຸບຄວາມສຳເລັດ$$, 'body', $$ໃຫ້ຄູສະຫຼຸບສັ້ນໆຂອງຄວາມສຳເລັດ, ເປົ້າໝາຍ ແລະ ແມ່ນແຕ່ຊ່ວງເວລາໃນຫ້ອງຮຽນທີ່ອາດຈື່ ແລະ ກ່າວເຖິງໄດ້.$$),
      jsonb_build_object('heading', $$ອະທິບາຍວ່າທຶນນີ້ຫາຫຍັງ$$, 'body', $$ບອກຄູວ່າທຶນນີ້ໃຫ້ຄຸນຄ່າກັບຄຸນສົມບັດອັນໃດ ເພື່ອໃຫ້ເນັ້ນສ່ວນທີ່ກ່ຽວຂ້ອງທີ່ສຸດຂອງວຽກທ່ານ.$$),
      jsonb_build_object('heading', $$ຂອບໃຈເຂົາໂດຍບໍ່ຂຶ້ນກັບຜົນ$$, 'body', $$ຄຳຂອບໃຈສັ້ນໆຫຼັງຂຽນໜັງສືແລ້ວ ແລະ ອີກຄັ້ງຖ້າໄດ້ຮັບທຶນ ຮັກສາຄວາມສຳພັນໃຫ້ອົບອຸ່ນສຳລັບຄວາມຕ້ອງການໃນອະນາຄົດ.$$)
    ),
    array[$$Give the teacher a brag sheet of your achievements and goals$$, $$Explain what qualities the specific scholarship values$$, $$Send a thank-you note regardless of the outcome$$],
    array[$$ໃຫ້ຄູໃບສະຫຼຸບຄວາມສຳເລັດ ແລະ ເປົ້າໝາຍ$$, $$ອະທິບາຍວ່າທຶນນີ້ໃຫ້ຄຸນຄ່າກັບຫຍັງ$$, $$ສົ່ງຄຳຂອບໃຈໂດຍບໍ່ຂຶ້ນກັບຜົນ$$],
    4, false, 28
  ),
  (
    $$understand-what-committees-look-for$$,
    $$Understand what scholarship committees actually look for$$,
    $$ເຂົ້າໃຈວ່າຄະນະກຳມະການທຶນຫາຫຍັງແທ້ໆ$$,
    $$Beyond the stated criteria, committees are looking for authenticity and a clear sense of purpose.$$,
    $$ນອກເໜືອຈາກເງື່ອນໄຂທີ່ລະບຸ ຄະນະກຳມະການຫາຄວາມຈິງໃຈ ແລະ ຈຸດປະສົງທີ່ຊັດເຈນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$They read the stated criteria first$$, 'body', $$Committees genuinely check the published criteria before subjective judgment — meeting the basic requirements matters most.$$),
      jsonb_build_object('heading', $$They notice consistency across your application$$, 'body', $$Your essay, recommendations, and activities should tell a coherent story — a mismatch raises quiet doubts.$$),
      jsonb_build_object('heading', $$They value clear purpose over impressive vocabulary$$, 'body', $$A simple, honest explanation of your goals reads better than fancy language that hides what you actually mean.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອ່ານເງື່ອນໄຂທີ່ລະບຸກ່ອນ$$, 'body', $$ຄະນະກຳມະການກວດເງື່ອນໄຂທີ່ປະກາດໄວ້ແທ້ໆກ່ອນຕັດສິນຕາມຄວາມຄິດເຫັນ — ການກົງກັບຄວາມຕ້ອງການພື້ນຖານສຳຄັນທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ສັງເກດຄວາມສອດຄ່ອງທົ່ວໃບສະໝັກ$$, 'body', $$ບົດຄວາມ, ຈົດໝາຍຮັບຮອງ ແລະ ກິດຈະກຳຄວນເລົ່າເລື່ອງລາວທີ່ສອດຄ່ອງກັນ — ຄວາມບໍ່ກົງກັນສ້າງຄວາມສົງໄສງຽບໆ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄຸນຄ່າກັບຈຸດປະສົງທີ່ຊັດເຈນ ບໍ່ແມ່ນຄຳສັບໜ້າປະທັບໃຈ$$, 'body', $$ຄຳອະທິບາຍເປົ້າໝາຍທີ່ງ່າຍ ແລະ ຈິງໃຈ ອ່ານໄດ້ດີກວ່າພາສາທີ່ຫຼູຫຼາແຕ່ເຊື່ອງຄວາມໝາຍທີ່ແທ້ຈິງ.$$)
    ),
    array[$$Meet the stated criteria before worrying about anything else$$, $$Keep your essay, letters, and activities telling one coherent story$$, $$Value clear, honest purpose over impressive vocabulary$$],
    array[$$ກົງກັບເງື່ອນໄຂທີ່ລະບຸກ່ອນກັງວົນເລື່ອງອື່ນ$$, $$ໃຫ້ບົດຄວາມ, ຈົດໝາຍ ແລະ ກິດຈະກຳເລົ່າເລື່ອງດຽວກັນ$$, $$ໃຫ້ຄຸນຄ່າກັບຈຸດປະສົງທີ່ຊັດເຈນ ແລະ ຈິງໃຈ ຫຼາຍກວ່າຄຳສັບຫຼູຫຼາ$$],
    5, false, 29
  ),
  (
    $$write-about-overcoming-a-challenge$$,
    $$Write about overcoming a challenge convincingly$$,
    $$ຂຽນກ່ຽວກັບການເອົາຊະນະສິ່ງທ້າທາຍຢ່າງໜ້າເຊື່ອຖື$$,
    $$Focus more on your response to a challenge than on the challenge itself.$$,
    $$ສຸມໃສ່ວິທີຕອບໂຕ້ຕໍ່ສິ່ງທ້າທາຍ ຫຼາຍກວ່າຕົວສິ່ງທ້າທາຍເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Keep the challenge description brief$$, 'body', $$A few sentences of context is enough — the essay should be mostly about what you did next, not a long account of the hardship.$$),
      jsonb_build_object('heading', $$Show the specific actions you took$$, 'body', $$Name concretely what you did to respond — sought help, changed your approach, built a new skill — not just that you "stayed strong."$$),
      jsonb_build_object('heading', $$Connect it to who you are now$$, 'body', $$End by explaining how that experience shapes how you approach challenges or goals today — this is the real payoff of the story.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຄຳອະທິບາຍສິ່ງທ້າທາຍສັ້ນ$$, 'body', $$ບໍລິບົດສອງສາມປະໂຫຍກກໍ່ພຽງພໍ — ບົດຄວາມຄວນເນັ້ນວ່າເຮັດຫຍັງຕໍ່ໄປ ບໍ່ແມ່ນເລົ່າຄວາມຫຍຸ້ງຍາກຍາວໆ.$$),
      jsonb_build_object('heading', $$ສະແດງການກະທຳສະເພາະທີ່ເຮັດ$$, 'body', $$ບອກຢ່າງຈັບຕ້ອງໄດ້ວ່າເຮັດຫຍັງເພື່ອຕອບໂຕ້ — ຫາຄວາມຊ່ວຍເຫຼືອ, ປ່ຽນວິທີການ, ສ້າງທັກສະໃໝ່ — ບໍ່ແມ່ນແຕ່ "ເຂັ້ມແຂງ."$$),
      jsonb_build_object('heading', $$ເຊື່ອມກັບຕົວຕົນປັດຈຸບັນ$$, 'body', $$ຈົບໂດຍອະທິບາຍວ່າປະສົບການນັ້ນສ້າງວິທີຮັບມືກັບສິ່ງທ້າທາຍ ຫຼືເປົ້າໝາຍປັດຈຸບັນແນວໃດ — ນີ້ຄືຈຸດສຳຄັນຂອງເລື່ອງລາວ.$$)
    ),
    array[$$Keep the description of the challenge itself brief$$, $$Show the specific concrete actions you took to respond$$, $$Connect the experience to who you are and value today$$],
    array[$$ໃຫ້ຄຳອະທິບາຍສິ່ງທ້າທາຍເອງສັ້ນ$$, $$ສະແດງການກະທຳສະເພາະທີ່ເຮັດເພື່ອຕອບໂຕ້$$, $$ເຊື່ອມປະສົບການກັບຄຸນຄ່າ ແລະ ຕົວຕົນປັດຈຸບັນ$$],
    5, false, 30
  ),
  (
    $$avoid-common-scholarship-mistakes$$,
    $$Avoid common scholarship application mistakes$$,
    $$ຫຼີກລ້ຽງຄວາມຜິດພາດທົ່ວໄປໃນການສະໝັກທຶນ$$,
    $$Simple, avoidable errors disqualify strong candidates more often than weak essays do.$$,
    $$ຄວາມຜິດພາດງ່າຍໆທີ່ຫຼີກລ້ຽງໄດ້ ຕັດສິດຜູ້ສະໝັກທີ່ດີອອກຫຼາຍກວ່າບົດຄວາມທີ່ອ່ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Follow the format instructions exactly$$, 'body', $$Word limits, font requirements, and file formats matter — an essay that ignores them can be disqualified before it's even read.$$),
      jsonb_build_object('heading', $$Never reuse an essay without adapting it$$, 'body', $$Copying an essay from one application to another without changing details specific to each prompt is an easy, obvious mistake to spot.$$),
      jsonb_build_object('heading', $$Proofread with fresh eyes$$, 'body', $$Read the final version aloud, or have someone else read it, before submitting — typos and errors quietly signal carelessness.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປະຕິບັດຕາມຄຳແນະນຳຮູບແບບຢ່າງແທ້ຈິງ$$, 'body', $$ຂອບເຂດຄຳ, ຮູບແບບຕົວອັກສອນ ແລະ ຮູບແບບໄຟລ໌ສຳຄັນ — ບົດຄວາມທີ່ບໍ່ປະຕິບັດຕາມ ອາດຖືກຕັດອອກກ່ອນຈະຖືກອ່ານດ້ວຍຊ້ຳ.$$),
      jsonb_build_object('heading', $$ຢ່ານຳບົດຄວາມມາໃຊ້ຄືນໂດຍບໍ່ປັບ$$, 'body', $$ການຄັດລອກບົດຄວາມຈາກໃບສະໝັກໜຶ່ງໄປອີກໃບໂດຍບໍ່ປັບລາຍລະອຽດໃຫ້ກົງກັບໂຈດແຕ່ລະອັນ ເປັນຄວາມຜິດພາດທີ່ຈັບໄດ້ງ່າຍ.$$),
      jsonb_build_object('heading', $$ອ່ານທົບທວນດ້ວຍສາຍຕາໃໝ່$$, 'body', $$ອ່ານສະບັບສຸດທ້າຍອອກສຽງ ຫຼືໃຫ້ຄົນອື່ນອ່ານ ກ່ອນສົ່ງ — ຄຳຜິດ ແລະ ຂໍ້ຜິດພາດສົ່ງສັນຍານຄວາມບໍ່ລະມັດລະວັງແບບງຽບໆ.$$)
    ),
    array[$$Follow word limits and format instructions exactly$$, $$Never reuse an essay without adapting it to each prompt$$, $$Proofread with fresh eyes before submitting$$],
    array[$$ປະຕິບັດຕາມຂອບເຂດຄຳ ແລະ ຮູບແບບຢ່າງແທ້ຈິງ$$, $$ຢ່ານຳບົດຄວາມມາໃຊ້ຄືນໂດຍບໍ່ປັບໃຫ້ກົງກັບແຕ່ລະໂຈດ$$, $$ອ່ານທົບທວນດ້ວຍສາຍຕາໃໝ່ກ່ອນສົ່ງ$$],
    4, false, 31
  ),
  (
    $$apply-to-multiple-scholarships-efficiently$$,
    $$Apply to multiple scholarships efficiently$$,
    $$ສະໝັກຫຼາຍທຶນຢ່າງມີປະສິດທິພາບ$$,
    $$A well-organized core essay you can adapt saves enormous time across applications.$$,
    $$ບົດຄວາມຫຼັກທີ່ຈັດລຽບຮ້ອຍ ແລະ ປັບໄດ້ ປະຢັດເວລາໄດ້ຫຼາຍໃນຫຼາຍໃບສະໝັກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write one strong core essay first$$, 'body', $$Draft one well-developed essay about your background and goals that can be trimmed or adapted for different specific prompts.$$),
      jsonb_build_object('heading', $$Batch similar-type applications together$$, 'body', $$Work on a group of scholarships with similar prompts in the same sitting — this keeps your relevant details fresh in mind.$$),
      jsonb_build_object('heading', $$Still customize every submission$$, 'body', $$Even with a reused core, always adjust the opening and closing to speak directly to that specific scholarship's values.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນບົດຄວາມຫຼັກທີ່ດີກ່ອນ$$, 'body', $$ຮ່າງບົດຄວາມທີ່ພັດທະນາດີໜຶ່ງອັນກ່ຽວກັບພື້ນຖານ ແລະ ເປົ້າໝາຍ ທີ່ຫຍໍ້ ຫຼືປັບໄດ້ສຳລັບໂຈດຕ່າງໆ.$$),
      jsonb_build_object('heading', $$ຈັດກຸ່ມໃບສະໝັກທີ່ຄ້າຍກັນນຳກັນ$$, 'body', $$ເຮັດວຽກກັບກຸ່ມທຶນທີ່ໂຈດຄ້າຍກັນໃນຄາວດຽວກັນ — ຊ່ວຍໃຫ້ລາຍລະອຽດທີ່ກ່ຽວຂ້ອງຍັງສົດຢູ່ໃນຫົວ.$$),
      jsonb_build_object('heading', $$ຍັງປັບແຕ່ງທຸກໃບທີ່ສົ່ງ$$, 'body', $$ແມ່ນແຕ່ໃຊ້ບົດຄວາມຫຼັກຄືນ ໃຫ້ປັບສ່ວນເປີດ ແລະ ປິດໃຫ້ເວົ້າກົງກັບຄຸນຄ່າຂອງທຶນນັ້ນສະເໝີ.$$)
    ),
    array[$$Write one strong core essay you can adapt for different prompts$$, $$Batch applications with similar prompts together$$, $$Always customize the opening and closing for each submission$$],
    array[$$ຂຽນບົດຄວາມຫຼັກທີ່ດີໜຶ່ງອັນທີ່ປັບໄດ້ຫຼາຍໂຈດ$$, $$ຈັດກຸ່ມໃບສະໝັກທີ່ໂຈດຄ້າຍກັນນຳກັນ$$, $$ປັບແຕ່ງສ່ວນເປີດ ແລະ ປິດສະເໝີສຳລັບແຕ່ລະໃບ$$],
    4, false, 32
  ),
  (
    $$understand-financial-aid-vs-scholarships-vs-loans$$,
    $$Understand financial aid vs. scholarships vs. loans$$,
    $$ເຂົ້າໃຈຄວາມແຕກຕ່າງລະຫວ່າງທຶນຊ່ວຍເຫຼືອ, ທຶນການສຶກສາ ແລະ ເງິນກູ້$$,
    $$Knowing which type of funding you're looking at changes how you should evaluate and apply for it.$$,
    $$ການຮູ້ປະເພດການສະໜັບສະໜູນທາງການເງິນ ປ່ຽນວິທີປະເມີນ ແລະ ສະໝັກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Scholarships and grants don't need repayment$$, 'body', $$This is money you don't pay back — it's the most valuable type of funding to prioritize applying for first.$$),
      jsonb_build_object('heading', $$Loans must be repaid, usually with interest$$, 'body', $$Understand the repayment terms and interest rate fully before accepting any loan — this is real, long-term financial commitment.$$),
      jsonb_build_object('heading', $$Ask your school's financial aid office for a full picture$$, 'body', $$They can explain exactly what combination of aid you're eligible for, which is clearer than piecing it together yourself.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ທຶນການສຶກສາ ແລະ ເງິນຊ່ວຍເຫຼືອ ບໍ່ຕ້ອງໃຊ້ຄືນ$$, 'body', $$ນີ້ຄືເງິນທີ່ບໍ່ຕ້ອງໃຊ້ຄືນ — ເປັນປະເພດການສະໜັບສະໜູນທີ່ມີຄຸນຄ່າທີ່ສຸດທີ່ຄວນສະໝັກກ່ອນ.$$),
      jsonb_build_object('heading', $$ເງິນກູ້ຕ້ອງໃຊ້ຄືນ ປົກກະຕິມີດອກເບ້ຍ$$, 'body', $$ເຂົ້າໃຈເງື່ອນໄຂການໃຊ້ຄືນ ແລະ ອັດຕາດອກເບ້ຍໃຫ້ຄົບກ່ອນຮັບເງິນກູ້ — ນີ້ຄືພັນທະທາງການເງິນໄລຍະຍາວແທ້.$$),
      jsonb_build_object('heading', $$ຖາມຫ້ອງທຶນຂອງໂຮງຮຽນເພື່ອຮູ້ພາບລວມ$$, 'body', $$ພວກເຂົາອະທິບາຍໄດ້ວ່າມີສິດຮັບການສະໜັບສະໜູນປະສົມແບບໃດ ເຊິ່ງຊັດເຈນກວ່າການປະກອບເອງ.$$)
    ),
    array[$$Prioritize scholarships and grants since they don't need repayment$$, $$Fully understand loan repayment terms before accepting one$$, $$Ask your school's financial aid office for the full picture$$],
    array[$$ໃຫ້ຄວາມສຳຄັນກັບທຶນ ແລະ ເງິນຊ່ວຍເຫຼືອທີ່ບໍ່ຕ້ອງໃຊ້ຄືນກ່ອນ$$, $$ເຂົ້າໃຈເງື່ອນໄຂການໃຊ້ຄືນເງິນກູ້ໃຫ້ຄົບກ່ອນຮັບ$$, $$ຖາມຫ້ອງທຶນຂອງໂຮງຮຽນເພື່ອຮູ້ພາບລວມ$$],
    4, false, 33
  ),
  (
    $$prepare-required-documents-in-advance$$,
    $$Prepare required documents well in advance$$,
    $$ກຽມເອກະສານທີ່ຕ້ອງການລ່ວງໜ້າ$$,
    $$Transcripts and official documents often take longer to obtain than applicants expect.$$,
    $$ໃບຄະແນນ ແລະ ເອກະສານທາງການ ມັກໃຊ້ເວລາຫາໄດ້ດົນກວ່າຜູ້ສະໝັກຄາດໄວ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Make a checklist of common requirements$$, 'body', $$Transcripts, ID copies, proof of enrollment, and financial documents are needed by almost every scholarship — gather them once.$$),
      jsonb_build_object('heading', $$Request official transcripts early$$, 'body', $$School offices can take one to two weeks to process transcript requests — order them well before any deadline.$$),
      jsonb_build_object('heading', $$Keep digital copies organized$$, 'body', $$Scan and save everything in one clearly labeled folder so you can attach documents quickly for each new application.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຮັດ Checklist ຂອງເອກະສານທົ່ວໄປ$$, 'body', $$ໃບຄະແນນ, ສຳເນົາບັດປະຈຳຕົວ, ໃບຢັ້ງຢືນການເປັນນັກຮຽນ ແລະ ເອກະສານການເງິນ ຈຳເປັນສຳລັບເກືອບທຸກທຶນ — ລວບລວມໄວ້ຄັ້ງດຽວ.$$),
      jsonb_build_object('heading', $$ຂໍໃບຄະແນນທາງການແຕ່ໄວ$$, 'body', $$ຫ້ອງການໂຮງຮຽນອາດໃຊ້ 1-2 ອາທິດປະມວນຄຳຂໍໃບຄະແນນ — ຂໍລ່ວງໜ້າກ່ອນກຳນົດເວລາໃດໆ.$$),
      jsonb_build_object('heading', $$ຈັດເກັບສຳເນົາດິຈິຕອນເປັນລະບຽບ$$, 'body', $$ສະແກນ ແລະ ບັນທຶກທຸກຢ່າງໄວ້ໃນໂຟນເດີດຽວທີ່ຕິດປ້າຍຊັດເຈນ ເພື່ອແນບເອກະສານໄດ້ໄວສຳລັບແຕ່ລະໃບສະໝັກ.$$)
    ),
    array[$$Make a checklist of documents most scholarships require$$, $$Request official transcripts well before any deadline$$, $$Keep organized digital copies for quick reuse$$],
    array[$$ເຮັດ Checklist ຂອງເອກະສານທີ່ທຶນສ່ວນຫຼາຍຕ້ອງການ$$, $$ຂໍໃບຄະແນນທາງການລ່ວງໜ້າກ່ອນກຳນົດເວລາໃດໆ$$, $$ຈັດເກັບສຳເນົາດິຈິຕອນເປັນລະບຽບເພື່ອໃຊ້ຄືນໄດ້ໄວ$$],
    3, false, 34
  ),
  (
    $$write-a-scholarship-essay-about-your-goals$$,
    $$Write a scholarship essay about your future goals$$,
    $$ຂຽນບົດຄວາມທຶນການສຶກສາກ່ຽວກັບເປົ້າໝາຍອະນາຄົດ$$,
    $$Specific, realistic plans are more convincing than broad statements about wanting to "make a difference."$$,
    $$ແຜນທີ່ສະເພາະ ແລະ ເປັນໄປໄດ້ຈິງ ໜ້າເຊື່ອຖືກວ່າຄຳເວົ້າກວ້າງໆກ່ຽວກັບການ "ສ້າງການປ່ຽນແປງ."$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name a specific path, not just a dream$$, 'body', $$"I want to become a public health nurse in rural clinics" is more convincing than "I want to help people."$$),
      jsonb_build_object('heading', $$Explain the connecting steps$$, 'body', $$Show how this specific scholarship and program fit into the path toward that goal, not just that the goal sounds good.$$),
      jsonb_build_object('heading', $$Acknowledge that plans can evolve$$, 'body', $$It's fine to note your path may adjust as you learn more — this shows maturity, not indecision, as long as the core direction is clear.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸເສັ້ນທາງສະເພາະ ບໍ່ແມ່ນແຕ່ຄວາມຝັນ$$, 'body', $$"ຢາກເປັນພະຍາບານສາທາລະນະສຸກໃນຄລີນິກຊົນນະບົດ" ໜ້າເຊື່ອຖືກວ່າ "ຢາກຊ່ວຍຄົນ."$$),
      jsonb_build_object('heading', $$ອະທິບາຍຂັ້ນຕອນທີ່ເຊື່ອມກັນ$$, 'body', $$ສະແດງວ່າທຶນ ແລະ ຫຼັກສູດນີ້ ເໝາະກັບເສັ້ນທາງໄປສູ່ເປົ້າໝາຍນັ້ນແນວໃດ ບໍ່ແມ່ນແຕ່ເປົ້າໝາຍທີ່ຟັງດີ.$$),
      jsonb_build_object('heading', $$ຮັບຮູ້ວ່າແຜນປ່ຽນແປງໄດ້$$, 'body', $$ບອກໄດ້ວ່າເສັ້ນທາງອາດປັບໄປຕາມການຮຽນຮູ້ — ນີ້ສະແດງຄວາມເປັນຜູ້ໃຫຍ່ ບໍ່ແມ່ນຄວາມລັງເລ ຕາບໃດທີ່ທິດທາງຫຼັກຍັງຊັດເຈນ.$$)
    ),
    array[$$Name a specific career path, not just a broad dream$$, $$Show how this scholarship connects to that specific path$$, $$It's fine to acknowledge plans may evolve over time$$],
    array[$$ລະບຸເສັ້ນທາງອາຊີບສະເພາະ ບໍ່ແມ່ນແຕ່ຄວາມຝັນກວ້າງໆ$$, $$ສະແດງວ່າທຶນນີ້ເຊື່ອມກັບເສັ້ນທາງນັ້ນແນວໃດ$$, $$ຮັບຮູ້ໄດ້ວ່າແຜນອາດປ່ຽນແປງໄປຕາມເວລາ$$],
    5, false, 35
  ),
  (
    $$handle-a-scholarship-rejection-and-try-again$$,
    $$Handle a scholarship rejection and try again$$,
    $$ຮັບມືການຖືກປະຕິເສດທຶນ ແລະ ລອງໃໝ່$$,
    $$Most scholarship winners applied to many and were rejected from most — persistence matters more than any single result.$$,
    $$ຜູ້ໄດ້ຮັບທຶນສ່ວນຫຼາຍສະໝັກຫຼາຍອັນ ແລະ ຖືກປະຕິເສດຈາກສ່ວນຫຼາຍ — ຄວາມພະຍາຍາມຕໍ່ເນື່ອງສຳຄັນກວ່າຜົນຄັ້ງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Remember competition, not just quality, decides$$, 'body', $$A strong application can lose simply because another was slightly better matched — rejection isn't always about weakness.$$),
      jsonb_build_object('heading', $$Request feedback if it's offered$$, 'body', $$Some scholarship programs will share why an application wasn't selected — this is valuable, specific information for next time.$$),
      jsonb_build_object('heading', $$Apply to the next one quickly$$, 'body', $$Keep momentum by submitting another application soon after — a long pause after a rejection is harder to restart from.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈື່ວ່າການແຂ່ງຂັນ ບໍ່ແມ່ນແຕ່ຄຸນນະພາບ ຕັດສິນ$$, 'body', $$ໃບສະໝັກທີ່ດີອາດແພ້ພຽງເພາະອີກໃບກົງກັນກວ່າໜ້ອຍໜຶ່ງ — ການຖືກປະຕິເສດບໍ່ໄດ້ໝາຍເຖິງຄວາມອ່ອນແອສະເໝີ.$$),
      jsonb_build_object('heading', $$ຂໍຄຳຄິດເຫັນຖ້າມີໃຫ້$$, 'body', $$ບາງໂຄງການທຶນຈະບອກເຫດຜົນທີ່ບໍ່ໄດ້ຮັບເລືອກ — ນີ້ຄືຂໍ້ມູນສະເພາະທີ່ມີຄຸນຄ່າສຳລັບຄັ້ງຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ສະໝັກອັນຕໍ່ໄປໄວ$$, 'body', $$ຮັກສາແຮງຂັບເຄື່ອນໂດຍສົ່ງໃບສະໝັກອີກອັນໄວໆ — ການຢຸດພັກດົນຫຼັງຖືກປະຕິເສດ ຈະເລີ່ມຄືນຍາກກວ່າ.$$)
    ),
    array[$$Remember rejection often reflects competition, not weakness$$, $$Request feedback when scholarship programs offer it$$, $$Apply to the next one soon to keep momentum going$$],
    array[$$ຈື່ວ່າການປະຕິເສດມັກສະທ້ອນການແຂ່ງຂັນ ບໍ່ແມ່ນຄວາມອ່ອນແອ$$, $$ຂໍຄຳຄິດເຫັນເມື່ອໂຄງການທຶນມີໃຫ້$$, $$ສະໝັກອັນຕໍ່ໄປໄວເພື່ອຮັກສາແຮງຂັບເຄື່ອນ$$],
    4, false, 36
  ),
  (
    $$find-local-community-scholarships$$,
    $$Find local and community scholarships that are often overlooked$$,
    $$ຊອກຫາທຶນທ້ອງຖິ່ນ ແລະ ຊຸມຊົນທີ່ມັກຖືກມອງຂ້າມ$$,
    $$Small local scholarships get far fewer applicants than national ones, raising your real chances.$$,
    $$ທຶນທ້ອງຖິ່ນນ້ອຍໆ ມີຜູ້ສະໝັກໜ້ອຍກວ່າທຶນລະດັບຊາດຫຼາຍ ເພີ່ມໂອກາດແທ້ຈິງຂອງທ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask local organizations directly$$, 'body', $$Community groups, religious organizations, and local businesses sometimes offer small scholarships that aren't listed on big scholarship websites.$$),
      jsonb_build_object('heading', $$Check with your parents' or family's employers$$, 'body', $$Some companies offer scholarships specifically for employees' children — a question to a parent's HR department can uncover this.$$),
      jsonb_build_object('heading', $$Fewer applicants means a better real chance$$, 'body', $$A small local scholarship with 20 applicants gives far better odds than a national one with 20,000 — apply to both types.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມອົງກອນທ້ອງຖິ່ນໂດຍກົງ$$, 'body', $$ກຸ່ມຊຸມຊົນ, ອົງກອນສາສະໜາ ແລະ ທຸລະກິດທ້ອງຖິ່ນ ບາງຄັ້ງໃຫ້ທຶນນ້ອຍທີ່ບໍ່ໄດ້ລົງໃນເວັບໄຊທຶນໃຫຍ່.$$),
      jsonb_build_object('heading', $$ກວດກັບບໍລິສັດຂອງພໍ່ແມ່ ຫຼືຄອບຄົວ$$, 'body', $$ບາງບໍລິສັດໃຫ້ທຶນສະເພາະສຳລັບລູກຂອງພະນັກງານ — ຄຳຖາມກັບຝ່າຍ HR ຂອງພໍ່ແມ່ອາດພົບໂອກາດນີ້.$$),
      jsonb_build_object('heading', $$ຜູ້ສະໝັກໜ້ອຍ ໝາຍເຖິງໂອກາດແທ້ຈິງທີ່ດີກວ່າ$$, 'body', $$ທຶນທ້ອງຖິ່ນນ້ອຍທີ່ມີຜູ້ສະໝັກ 20 ຄົນ ໃຫ້ໂອກາດດີກວ່າທຶນລະດັບຊາດທີ່ມີ 20,000 ຄົນຫຼາຍ — ສະໝັກທັງສອງແບບ.$$)
    ),
    array[$$Ask local community organizations directly about scholarships$$, $$Check whether a parent's employer offers one$$, $$Small local scholarships often give much better real odds$$],
    array[$$ຖາມອົງກອນຊຸມຊົນທ້ອງຖິ່ນໂດຍກົງກ່ຽວກັບທຶນ$$, $$ກວດວ່າບໍລິສັດຂອງພໍ່ແມ່ມີທຶນໃຫ້ບໍ່$$, $$ທຶນທ້ອງຖິ່ນນ້ອຍມັກໃຫ້ໂອກາດແທ້ຈິງທີ່ດີກວ່າ$$],
    4, false, 37
  ),
  (
    $$understand-eligibility-criteria-carefully$$,
    $$Read scholarship eligibility criteria carefully before applying$$,
    $$ອ່ານເງື່ອນໄຂການມີສິດຂອງທຶນຢ່າງລະອຽດກ່ອນສະໝັກ$$,
    $$Applying to scholarships you don't qualify for wastes time you could spend on ones you actually can win.$$,
    $$ການສະໝັກທຶນທີ່ບໍ່ມີສິດ ເສຍເວລາທີ່ຄວນໃຊ້ກັບທຶນທີ່ໄດ້ຮັບໄດ້ຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check every requirement, not just the obvious ones$$, 'body', $$GPA minimums are easy to spot — residency, field of study, and age requirements are easy to miss but just as disqualifying.$$),
      jsonb_build_object('heading', $$Contact the provider if genuinely unclear$$, 'body', $$A short, polite email asking to clarify one specific requirement is normal and better than guessing wrong.$$),
      jsonb_build_object('heading', $$Never misrepresent your situation$$, 'body', $$Stretching the truth about eligibility to qualify can disqualify you later and damage your reputation with the provider.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດທຸກເງື່ອນໄຂ ບໍ່ແມ່ນແຕ່ອັນທີ່ເຫັນງ່າຍ$$, 'body', $$GPA ຂັ້ນຕ່ຳເຫັນງ່າຍ — ເງື່ອນໄຂທີ່ຢູ່ອາໄສ, ສາຂາຮຽນ ແລະ ອາຍຸ ພາດງ່າຍແຕ່ຕັດສິດເໝືອນກັນ.$$),
      jsonb_build_object('heading', $$ຕິດຕໍ່ຜູ້ໃຫ້ທຶນຖ້າບໍ່ຊັດເຈນແທ້$$, 'body', $$ອີເມວສັ້ນ ແລະ ສຸພາບ ຖາມເພື່ອຄວາມຊັດເຈນໃນເງື່ອນໄຂໜຶ່ງອັນ ເປັນເລື່ອງທຳມະດາ ແລະ ດີກວ່າການເດົາຜິດ.$$),
      jsonb_build_object('heading', $$ຢ່າບອກຂໍ້ມູນຜິດຄວາມຈິງ$$, 'body', $$ການບິດເບືອນຄວາມຈິງເພື່ອໃຫ້ມີສິດ ອາດຕັດສິດພາຍຫຼັງ ແລະ ທຳລາຍຊື່ສຽງກັບຜູ້ໃຫ້ທຶນ.$$)
    ),
    array[$$Check every eligibility requirement, not just the obvious ones$$, $$Contact the provider directly if something is genuinely unclear$$, $$Never misrepresent your situation to qualify$$],
    array[$$ກວດທຸກເງື່ອນໄຂ ບໍ່ແມ່ນແຕ່ອັນທີ່ເຫັນງ່າຍ$$, $$ຕິດຕໍ່ຜູ້ໃຫ້ທຶນໂດຍກົງຖ້າບໍ່ຊັດເຈນແທ້$$, $$ຢ່າບອກຂໍ້ມູນຜິດຄວາມຈິງເພື່ອໃຫ້ມີສິດ$$],
    4, false, 38
  ),
  (
    $$build-an-extracurricular-record$$,
    $$Build an extracurricular record that supports applications$$,
    $$ສ້າງປະຫວັດກິດຈະກຳນອກຫຼັກສູດທີ່ສະໜັບສະໜູນການສະໝັກ$$,
    $$Depth in a few activities impresses committees more than a long, shallow list.$$,
    $$ຄວາມເລິກໃນກິດຈະກຳສອງສາມອັນ ໃຫ້ຄວາມປະທັບໃຈຄະນະກຳມະການຫຼາຍກວ່າລາຍການຍາວແຕ່ຕື້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Choose depth over breadth$$, 'body', $$Two years of real commitment and growth in one club impresses more than one semester each in ten different activities.$$),
      jsonb_build_object('heading', $$Seek leadership roles over time$$, 'body', $$Starting as a member and growing into an organizer or leader tells a stronger story than staying passive throughout.$$),
      jsonb_build_object('heading', $$Track your impact along the way$$, 'body', $$Note numbers and outcomes as you go — funds raised, people helped, events organized — so you have real detail when writing later.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກຄວາມເລິກ ບໍ່ແມ່ນຄວາມກວ້າງ$$, 'body', $$ສອງປີຂອງຄວາມມຸ່ງໝັ້ນ ແລະ ການເຕີບໂຕໃນຊົມຮົມດຽວ ໃຫ້ຄວາມປະທັບໃຈຫຼາຍກວ່າໜຶ່ງພາກຮຽນຕໍ່ອັນໃນສິບກິດຈະກຳ.$$),
      jsonb_build_object('heading', $$ຊອກຫາບົດບາດຜູ້ນຳຕາມເວລາ$$, 'body', $$ເລີ່ມເປັນສະມາຊິກ ແລ້ວເຕີບໂຕເປັນຜູ້ຈັດ ຫຼືຜູ້ນຳ ເລົ່າເລື່ອງລາວທີ່ໜັກແໜ້ນກວ່າການເປັນສະມາຊິກທົ່ວໄປຕະຫຼອດ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມຜົນກະທົບໄປພ້ອມກັນ$$, 'body', $$ບັນທຶກຕົວເລກ ແລະ ຜົນລັບໄປພ້ອມກັນ — ເງິນທີ່ລະດົມໄດ້, ຄົນທີ່ຊ່ວຍ, ງານທີ່ຈັດ — ເພື່ອມີລາຍລະອຽດຈິງຕອນຂຽນພາຍຫຼັງ.$$)
    ),
    array[$$Choose depth in a few activities over breadth in many$$, $$Seek to grow into leadership roles over time$$, $$Track your impact and numbers as you go$$],
    array[$$ເລືອກຄວາມເລິກໃນກິດຈະກຳສອງສາມອັນ ບໍ່ແມ່ນຄວາມກວ້າງ$$, $$ຊອກຫາການເຕີບໂຕເປັນຜູ້ນຳຕາມເວລາ$$, $$ຕິດຕາມຜົນກະທົບ ແລະ ຕົວເລກໄປພ້ອມກັນ$$],
    4, false, 39
  ),
  (
    $$get-a-recommendation-letter-from-an-employer$$,
    $$Get a strong recommendation letter from an employer$$,
    $$ໄດ້ຮັບໜັງສືຮັບຮອງທີ່ດີຈາກນາຍຈ້າງ$$,
    $$A work supervisor can speak to reliability and real-world skills that a teacher might not observe.$$,
    $$ຫົວໜ້າວຽກ ສາມາດເວົ້າເຖິງຄວາມໜ້າເຊື່ອຖື ແລະ ທັກສະໂລກຈິງ ທີ່ຄູອາດບໍ່ໄດ້ເຫັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Choose a supervisor who saw you grow$$, 'body', $$Pick someone who watched you take on more responsibility over time, not just your very first manager on day one.$$),
      jsonb_build_object('heading', $$Remind them of specific moments$$, 'body', $$Mention a project or situation you handled well — this gives them concrete material instead of a vague general endorsement.$$),
      jsonb_build_object('heading', $$Explain why you need it for a scholarship$$, 'body', $$A workplace recommendation letter may need slight framing for an academic context — explain what the scholarship is evaluating.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກຫົວໜ້າທີ່ເຫັນທ່ານເຕີບໂຕ$$, 'body', $$ເລືອກຄົນທີ່ເຫັນທ່ານຮັບຜິດຊອບຫຼາຍຂຶ້ນຕາມເວລາ ບໍ່ແມ່ນແຕ່ຫົວໜ້າຄົນທຳອິດໃນມື້ທຳອິດ.$$),
      jsonb_build_object('heading', $$ເຕືອນເຂົາເຖິງຊ່ວງເວລາສະເພາະ$$, 'body', $$ກ່າວເຖິງໂຄງການ ຫຼືສະຖານະການທີ່ຈັດການໄດ້ດີ — ໃຫ້ຂໍ້ມູນທີ່ຈັບຕ້ອງໄດ້ ແທນຄຳຮັບຮອງທົ່ວໄປທີ່ບໍ່ຊັດເຈນ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍວ່າຕ້ອງການໄວ້ເພື່ອທຶນ$$, 'body', $$ໜັງສືຮັບຮອງທາງວຽກ ອາດຕ້ອງປັບໃຫ້ເໝາະກັບບໍລິບົດການສຶກສາໜ້ອຍໜຶ່ງ — ອະທິບາຍວ່າທຶນນີ້ປະເມີນຫຍັງ.$$)
    ),
    array[$$Choose a supervisor who watched you take on more over time$$, $$Remind them of specific projects or moments to reference$$, $$Explain the academic context so the letter fits the scholarship$$],
    array[$$ເລືອກຫົວໜ້າທີ່ເຫັນທ່ານຮັບຜິດຊອບຫຼາຍຂຶ້ນຕາມເວລາ$$, $$ເຕືອນເຂົາເຖິງໂຄງການ ຫຼືຊ່ວງເວລາສະເພາະ$$, $$ອະທິບາຍບໍລິບົດການສຶກສາເພື່ອໃຫ້ໜັງສືກົງກັບທຶນ$$],
    4, false, 40
  ),
  (
    $$write-about-your-community-impact$$,
    $$Write about your community impact convincingly$$,
    $$ຂຽນກ່ຽວກັບຜົນກະທົບຕໍ່ຊຸມຊົນຢ່າງໜ້າເຊື່ອຖື$$,
    $$Committees want to see real, specific effects on real people, not just participation.$$,
    $$ຄະນະກຳມະການຢາກເຫັນຜົນກະທົບຈິງ ແລະ ສະເພາະຕໍ່ຄົນຈິງ ບໍ່ແມ່ນແຕ່ການເຂົ້າຮ່ວມ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name who was actually affected$$, 'body', $$"Twelve elderly residents received weekly grocery help" is far more concrete than "I volunteered in my community."$$),
      jsonb_build_object('heading', $$Describe your specific role$$, 'body', $$Explain what you personally organized, led, or contributed — not just that you were part of a larger group effort.$$),
      jsonb_build_object('heading', $$Mention what you'd do differently$$, 'body', $$A brief note on what you'd improve shows real reflection, which reads as more mature than a purely celebratory account.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກວ່າໃຜໄດ້ຮັບຜົນກະທົບແທ້$$, 'body', $$"ຜູ້ສູງອາຍຸ 12 ຄົນໄດ້ຮັບການຊ່ວຍຊື້ເຄື່ອງທຸກອາທິດ" ຈັບຕ້ອງໄດ້ຫຼາຍກວ່າ "ຂ້ອຍອາສາໃນຊຸມຊົນ."$$),
      jsonb_build_object('heading', $$ອະທິບາຍບົດບາດສະເພາະຂອງທ່ານ$$, 'body', $$ອະທິບາຍວ່າທ່ານຈັດ, ນຳ ຫຼືປະກອບສ່ວນຫຍັງແທ້ ບໍ່ແມ່ນແຕ່ວ່າເປັນສ່ວນໜຶ່ງຂອງກຸ່ມ.$$),
      jsonb_build_object('heading', $$ກ່າວເຖິງສິ່ງທີ່ຈະປັບປຸງ$$, 'body', $$ຄຳສັ້ນໆກ່ຽວກັບສິ່ງທີ່ຈະປັບປຸງ ສະແດງການສະທ້ອນຈິງ ເຊິ່ງອ່ານໄດ້ເປັນຜູ້ໃຫຍ່ກວ່າການເລົ່າແຕ່ດ້ານດີ.$$)
    ),
    array[$$Name specifically who was affected by your work$$, $$Describe your own specific role, not just group membership$$, $$Mention what you'd improve to show real reflection$$],
    array[$$ບອກສະເພາະວ່າໃຜໄດ້ຮັບຜົນກະທົບຈາກວຽກຂອງທ່ານ$$, $$ອະທິບາຍບົດບາດສະເພາະຂອງທ່ານ ບໍ່ແມ່ນແຕ່ການເປັນສະມາຊິກ$$, $$ກ່າວເຖິງສິ່ງທີ່ຈະປັບປຸງເພື່ອສະແດງການສະທ້ອນຈິງ$$],
    5, false, 41
  ),
  (
    $$prepare-a-video-application-or-pitch$$,
    $$Prepare a video application or pitch for a scholarship$$,
    $$ກຽມວິດີໂອສະໝັກ ຫຼືການນຳສະເໜີສຳລັບທຶນການສຶກສາ$$,
    $$A short, well-rehearsed video communicates energy that text alone can't show.$$,
    $$ວິດີໂອສັ້ນ ແລະ ຝຶກຊ້ອມມາດີ ສື່ພະລັງທີ່ຂໍ້ຄວາມຢ່າງດຽວສະແດງບໍ່ໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Script the key points, don't memorize word for word$$, 'body', $$Know your main points cold, but let the exact wording come naturally — a memorized script often sounds stiff on camera.$$),
      jsonb_build_object('heading', $$Record in good, simple conditions$$, 'body', $$Quiet background, decent lighting, and a stable camera matter more than fancy equipment or editing.$$),
      jsonb_build_object('heading', $$Respect the time limit exactly$$, 'body', $$If asked for two minutes, deliver close to two minutes — going significantly over or under signals poor preparation.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນຈຸດສຳຄັນ ບໍ່ຕ້ອງທ່ອງຄຳຕໍ່ຄຳ$$, 'body', $$ຮູ້ຈຸດຫຼັກຢ່າງແທ້ຈິງ ແຕ່ໃຫ້ຄຳເວົ້າອອກມາທຳມະຊາດ — ບົດທ່ອງຈຳມັກຟັງແຂງເທິງກ້ອງ.$$),
      jsonb_build_object('heading', $$ບັນທຶກໃນສະພາບແວດລ້ອມທີ່ດີ ແລະ ງ່າຍ$$, 'body', $$ພື້ນຫຼັງງຽບ, ແສງພໍໃຊ້ ແລະ ກ້ອງໝັ້ນຄົງ ສຳຄັນກວ່າອຸປະກອນ ຫຼືການຕັດຕໍ່ທີ່ຫຼູຫຼາ.$$),
      jsonb_build_object('heading', $$ເຄົາລົບຂອບເຂດເວລາຢ່າງແທ້ຈິງ$$, 'body', $$ຖ້າຂໍ 2 ນາທີ ໃຫ້ໃກ້ 2 ນາທີ — ຍາວ ຫຼືສັ້ນເກີນໄປ ສົ່ງສັນຍານການກຽມທີ່ບໍ່ດີ.$$)
    ),
    array[$$Know your key points but avoid memorizing word for word$$, $$Record in a quiet, well-lit, stable setup$$, $$Respect the requested time limit exactly$$],
    array[$$ຮູ້ຈຸດຫຼັກແຕ່ບໍ່ຕ້ອງທ່ອງຄຳຕໍ່ຄຳ$$, $$ບັນທຶກໃນສະພາບແວດລ້ອມທີ່ງຽບ, ແສງດີ ແລະ ໝັ້ນຄົງ$$, $$ເຄົາລົບຂອບເຂດເວລາທີ່ຂໍຢ່າງແທ້ຈິງ$$],
    4, false, 42
  ),
  (
    $$manage-scholarship-funds-responsibly$$,
    $$Manage scholarship funds responsibly once awarded$$,
    $$ຈັດການເງິນທຶນຢ່າງມີຄວາມຮັບຜິດຊອບເມື່ອໄດ້ຮັບແລ້ວ$$,
    $$Understanding exactly what the money covers and any conditions prevents problems down the road.$$,
    $$ການເຂົ້າໃຈວ່າເງິນຄອບຄຸມຫຍັງ ແລະ ເງື່ອນໄຂໃດ ປ້ອງກັນບັນຫາໃນອະນາຄົດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Know exactly what it covers$$, 'body', $$Some scholarships pay tuition only, others include living costs — understand the exact scope before planning your budget around it.$$),
      jsonb_build_object('heading', $$Track any ongoing requirements$$, 'body', $$Renewable scholarships often require a minimum GPA or enrollment status — know these conditions so you don't lose funding unexpectedly.$$),
      jsonb_build_object('heading', $$Keep records for taxes or reporting$$, 'body', $$Save award letters and payment records — some situations require you to report scholarship income accurately.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ວ່າຄອບຄຸມຫຍັງແທ້$$, 'body', $$ບາງທຶນຈ່າຍແຕ່ຄ່າຮຽນ, ບາງອັນລວມຄ່າຄອງຊີບ — ເຂົ້າໃຈຂອບເຂດແທ້ ກ່ອນວາງແຜນງົບປະມານຕາມມັນ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມເງື່ອນໄຂຕໍ່ເນື່ອງ$$, 'body', $$ທຶນທີ່ຕໍ່ໄດ້ ມັກຕ້ອງການ GPA ຂັ້ນຕ່ຳ ຫຼືສະຖານະການລົງທະບຽນ — ຮູ້ເງື່ອນໄຂເຫຼົ່ານີ້ ເພື່ອບໍ່ໃຫ້ເສຍທຶນໂດຍບໍ່ຄາດຄິດ.$$),
      jsonb_build_object('heading', $$ເກັບບັນທຶກສຳລັບພາສີ ຫຼືການລາຍງານ$$, 'body', $$ເກັບຈົດໝາຍໃຫ້ທຶນ ແລະ ບັນທຶກການຈ່າຍເງິນ — ບາງສະຖານະການຕ້ອງລາຍງານລາຍໄດ້ຈາກທຶນຢ່າງຖືກຕ້ອງ.$$)
    ),
    array[$$Know exactly what expenses the scholarship covers$$, $$Track any GPA or enrollment requirements to keep it$$, $$Keep records of award letters for taxes or reporting$$],
    array[$$ຮູ້ວ່າທຶນຄອບຄຸມຄ່າໃຊ້ຈ່າຍໃດແທ້$$, $$ຕິດຕາມເງື່ອນໄຂ GPA ຫຼືການລົງທະບຽນເພື່ອຮັກສາທຶນ$$, $$ເກັບບັນທຶກຈົດໝາຍໃຫ້ທຶນສຳລັບພາສີ ຫຼືການລາຍງານ$$],
    4, false, 43
  ),
  (
    $$balance-scholarship-applications-with-schoolwork$$,
    $$Balance scholarship applications with schoolwork$$,
    $$ຮັກສາຄວາມສົມດຸນລະຫວ່າງການສະໝັກທຶນ ແລະ ວຽກຮຽນ$$,
    $$Treat applications as scheduled tasks, not something squeezed in whenever there's spare time.$$,
    $$ຖືວ່າໃບສະໝັກເປັນວຽກທີ່ວາງແຜນໄວ້ ບໍ່ແມ່ນສິ່ງທີ່ຍັດໃສ່ໃນເວລາຫວ່າງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Schedule specific application time blocks$$, 'body', $$Treat working on applications like a class — put dedicated time on your calendar rather than hoping to find free moments.$$),
      jsonb_build_object('heading', $$Prioritize by deadline and fit$$, 'body', $$Work on the applications with the nearest deadline and the best match to your background first, not just whatever feels easiest.$$),
      jsonb_build_object('heading', $$Don't let it hurt your grades$$, 'body', $$Your current academic performance still matters for future opportunities — protect study time even during a busy application season.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວາງແຜນຊ່ວງເວລາສະໝັກທຶນສະເພາະ$$, 'body', $$ຖືວ່າການເຮັດໃບສະໝັກຄືກັບວິຊາຮຽນ — ວາງເວລາສະເພາະໃນປະຕິທິນ ແທນທີ່ຈະຫວັງຫາເວລາຫວ່າງ.$$),
      jsonb_build_object('heading', $$ຈັດລຳດັບຕາມກຳນົດເວລາ ແລະ ຄວາມກົງກັນ$$, 'body', $$ເຮັດໃບສະໝັກທີ່ໃກ້ກຳນົດເວລາ ແລະ ກົງກັບພື້ນຖານທ່ານທີ່ສຸດກ່ອນ ບໍ່ແມ່ນອັນທີ່ຮູ້ສຶກງ່າຍທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ຢ່າໃຫ້ກະທົບຄະແນນ$$, 'body', $$ຜົນການຮຽນປັດຈຸບັນຍັງສຳຄັນຕໍ່ໂອກາດອະນາຄົດ — ປົກປ້ອງເວລາຮຽນເຖິງແມ່ນຊ່ວງສະໝັກທຶນຫຍຸ້ງ.$$)
    ),
    array[$$Schedule dedicated time blocks for applications$$, $$Prioritize by deadline and how well you match, not ease$$, $$Protect your study time even during busy application season$$],
    array[$$ວາງແຜນຊ່ວງເວລາສະເພາະສຳລັບການສະໝັກທຶນ$$, $$ຈັດລຳດັບຕາມກຳນົດເວລາ ແລະ ຄວາມກົງກັນ ບໍ່ແມ່ນຄວາມງ່າຍ$$, $$ປົກປ້ອງເວລາຮຽນເຖິງແມ່ນຊ່ວງສະໝັກທຶນຫຍຸ້ງ$$],
    4, false, 44
  ),
  (
    $$find-scholarships-for-specific-fields-of-study$$,
    $$Find scholarships for specific fields of study$$,
    $$ຊອກຫາທຶນສຳລັບສາຂາຮຽນສະເພາະ$$,
    $$Professional associations and industry groups in your field often fund scholarships few students know about.$$,
    $$ສະມາຄົມວິຊາຊີບ ແລະ ກຸ່ມອຸດສາຫະກຳໃນສາຍງານຂອງທ່ານ ມັກໃຫ້ທຶນທີ່ນັກຮຽນສ່ວນຫຼາຍບໍ່ຮູ້ຈັກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Search professional associations in your field$$, 'body', $$Engineering societies, medical associations, and arts organizations often fund scholarships specifically for future professionals.$$),
      jsonb_build_object('heading', $$Ask professors about field-specific funding$$, 'body', $$Faculty often know about smaller, specialized scholarships within their discipline that aren't widely advertised.$$),
      jsonb_build_object('heading', $$Check companies that hire in your field$$, 'body', $$Many companies fund scholarships in fields where they recruit, sometimes with an internship or job connection attached.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄົ້ນຫາສະມາຄົມວິຊາຊີບໃນສາຍງານທ່ານ$$, 'body', $$ສະມາຄົມວິສະວະກຳ, ການແພດ ແລະ ອົງກອນສິລະປະ ມັກໃຫ້ທຶນສະເພາະສຳລັບຜູ້ຈະເປັນວິຊາຊີບໃນອະນາຄົດ.$$),
      jsonb_build_object('heading', $$ຖາມອາຈານກ່ຽວກັບທຶນສະເພາະສາຂາ$$, 'body', $$ອາຈານມັກຮູ້ຈັກທຶນນ້ອຍ ແລະ ສະເພາະໃນສາຂາຂອງເຂົາ ທີ່ບໍ່ໄດ້ໂຄສະນາກວ້າງ.$$),
      jsonb_build_object('heading', $$ກວດບໍລິສັດທີ່ຮັບສະໝັກງານໃນສາຍງານທ່ານ$$, 'body', $$ບໍລິສັດຫຼາຍແຫ່ງໃຫ້ທຶນໃນສາຍງານທີ່ເຂົາຮັບສະໝັກ ບາງຄັ້ງມາພ້ອມການຝຶກງານ ຫຼືການເຊື່ອມຕໍ່ວຽກ.$$)
    ),
    array[$$Search professional associations specific to your field$$, $$Ask professors about specialized, less-known funding$$, $$Check whether companies in your field fund scholarships$$],
    array[$$ຄົ້ນຫາສະມາຄົມວິຊາຊີບສະເພາະສາຍງານທ່ານ$$, $$ຖາມອາຈານກ່ຽວກັບທຶນສະເພາະທີ່ບໍ່ຄ່ອຍມີຄົນຮູ້$$, $$ກວດວ່າບໍລິສັດໃນສາຍງານທ່ານໃຫ້ທຶນບໍ່$$],
    4, false, 45
  ),
  (
    $$find-scholarships-for-underrepresented-groups$$,
    $$Find scholarships supporting underrepresented students$$,
    $$ຊອກຫາທຶນທີ່ສະໜັບສະໜູນນັກຮຽນກຸ່ມທີ່ຍັງມີໜ້ອຍ$$,
    $$Many organizations fund scholarships aimed at increasing access for specific groups — search directly for your situation.$$,
    $$ອົງກອນຫຼາຍແຫ່ງໃຫ້ທຶນເພື່ອເພີ່ມການເຂົ້າເຖິງສຳລັບກຸ່ມສະເພາະ — ຄົ້ນຫາໂດຍກົງຕາມສະຖານະການຂອງທ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Search by your specific identity or situation$$, 'body', $$Scholarships exist for first-generation students, women in STEM, students with disabilities, and many other specific groups — search directly.$$),
      jsonb_build_object('heading', $$Check with relevant advocacy organizations$$, 'body', $$Organizations that support a specific community often maintain updated scholarship lists for their members.$$),
      jsonb_build_object('heading', $$Write your story with pride, not apology$$, 'body', $$Describe your background as a source of strength and perspective, not something to explain away or minimize.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄົ້ນຫາຕາມຕົວຕົນ ຫຼືສະຖານະການສະເພາະ$$, 'body', $$ມີທຶນສຳລັບນັກຮຽນຮຸ່ນທຳອິດໃນຄອບຄົວທີ່ຮຽນສູງ, ແມ່ຍິງໃນສາຍ STEM, ນັກຮຽນທີ່ມີຄວາມພິການ ແລະ ອີກຫຼາຍກຸ່ມສະເພາະ — ຄົ້ນຫາໂດຍກົງ.$$),
      jsonb_build_object('heading', $$ກວດກັບອົງກອນສະໜັບສະໜູນທີ່ກ່ຽວຂ້ອງ$$, 'body', $$ອົງກອນທີ່ສະໜັບສະໜູນຊຸມຊົນສະເພາະ ມັກຮັກສາລາຍການທຶນອັບເດດສຳລັບສະມາຊິກ.$$),
      jsonb_build_object('heading', $$ຂຽນເລື່ອງລາວດ້ວຍຄວາມພາກພູມໃຈ ບໍ່ແມ່ນຂໍໂທດ$$, 'body', $$ອະທິບາຍພື້ນຖານຂອງທ່ານເປັນແຫຼ່ງຄວາມເຂັ້ມແຂງ ແລະ ມຸມມອງ ບໍ່ແມ່ນສິ່ງທີ່ຕ້ອງອະທິບາຍແກ້ ຫຼືເຮັດໃຫ້ນ້ອຍລົງ.$$)
    ),
    array[$$Search directly by your specific identity or situation$$, $$Check with organizations that support your community$$, $$Write about your background with pride, not apology$$],
    array[$$ຄົ້ນຫາໂດຍກົງຕາມຕົວຕົນ ຫຼືສະຖານະການສະເພາະ$$, $$ກວດກັບອົງກອນທີ່ສະໜັບສະໜູນຊຸມຊົນຂອງທ່ານ$$, $$ຂຽນກ່ຽວກັບພື້ນຖານດ້ວຍຄວາມພາກພູມໃຈ ບໍ່ແມ່ນຂໍໂທດ$$],
    4, false, 46
  ),
  (
    $$understand-study-abroad-scholarship-requirements$$,
    $$Understand study-abroad scholarship requirements$$,
    $$ເຂົ້າໃຈເງື່ອນໄຂຂອງທຶນຮຽນຕໍ່ຕ່າງປະເທດ$$,
    $$Study-abroad scholarships often add language, visa, and return-service requirements beyond a normal application.$$,
    $$ທຶນຮຽນຕໍ່ຕ່າງປະເທດ ມັກມີເງື່ອນໄຂພາສາ, ວີຊາ ແລະ ພັນທະກັບຄືນ ນອກເໜືອຈາກໃບສະໝັກປົກກະຕິ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check language proficiency requirements early$$, 'body', $$Many programs require a specific test score — knowing this early gives you time to prepare or retake the test if needed.$$),
      jsonb_build_object('heading', $$Understand visa and travel logistics$$, 'body', $$Some scholarships require you to arrange your own visa — factor in processing time when planning your application timeline.$$),
      jsonb_build_object('heading', $$Read any return-service obligation carefully$$, 'body', $$Some scholarships require you to work in your home country for a set period after graduating — understand this commitment fully before accepting.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດເງື່ອນໄຂພາສາແຕ່ໄວ$$, 'body', $$ຫຼາຍໂຄງການຕ້ອງການຄະແນນທົດສອບສະເພາະ — ຮູ້ແຕ່ໄວໃຫ້ເວລາກຽມ ຫຼືສອບຄືນຖ້າຈຳເປັນ.$$),
      jsonb_build_object('heading', $$ເຂົ້າໃຈເລື່ອງວີຊາ ແລະ ການເດີນທາງ$$, 'body', $$ບາງທຶນຕ້ອງການໃຫ້ຈັດການວີຊາເອງ — ຄິດໄລ່ເວລາປະມວນຜົນເຂົ້າໃນຕາຕະລາງການສະໝັກ.$$),
      jsonb_build_object('heading', $$ອ່ານພັນທະການກັບຄືນຢ່າງລະອຽດ$$, 'body', $$ບາງທຶນຕ້ອງການໃຫ້ກັບມາເຮັດວຽກໃນປະເທດຕົນເອງໄລຍະໜຶ່ງຫຼັງຮຽນຈົບ — ເຂົ້າໃຈພັນທະນີ້ໃຫ້ຄົບກ່ອນຮັບ.$$)
    ),
    array[$$Check language test requirements early to have time to prepare$$, $$Understand visa logistics and processing time$$, $$Fully read any return-service obligation before accepting$$],
    array[$$ກວດເງື່ອນໄຂພາສາແຕ່ໄວເພື່ອມີເວລາກຽມ$$, $$ເຂົ້າໃຈເລື່ອງວີຊາ ແລະ ເວລາປະມວນຜົນ$$, $$ອ່ານພັນທະການກັບຄືນໃຫ້ຄົບກ່ອນຮັບ$$],
    5, false, 47
  ),
  (
    $$write-a-why-this-program-essay$$,
    $$Write a strong "why this program" essay$$,
    $$ຂຽນບົດຄວາມ "ເປັນຫຍັງເລືອກຫຼັກສູດນີ້" ທີ່ໜັກແໜ້ນ$$,
    $$Specific details about the program show you've done real research, not just applied everywhere.$$,
    $$ລາຍລະອຽດສະເພາະກ່ຽວກັບຫຼັກສູດ ສະແດງວ່າຄົ້ນຄວ້າແທ້ ບໍ່ແມ່ນແຕ່ສະໝັກທົ່ວໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name specific features of the program$$, 'body', $$Mention a particular course, professor, research area, or opportunity unique to this program, not generic praise.$$),
      jsonb_build_object('heading', $$Connect it to your specific goals$$, 'body', $$Explain exactly how this program's specific strengths move you toward your particular career or academic goal.$$),
      jsonb_build_object('heading', $$Avoid language that could apply anywhere$$, 'body', $$If your essay could be submitted unchanged to a different school, it needs more specific detail about this particular one.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸລັກສະນະສະເພາະຂອງຫຼັກສູດ$$, 'body', $$ກ່າວເຖິງວິຊາສະເພາະ, ອາຈານ, ຂົງເຂດການຄົ້ນຄວ້າ ຫຼືໂອກາດທີ່ເປັນເອກະລັກຂອງຫຼັກສູດນີ້ ບໍ່ແມ່ນຄຳຊົມທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ເຊື່ອມກັບເປົ້າໝາຍສະເພາະຂອງທ່ານ$$, 'body', $$ອະທິບາຍວ່າຈຸດແຂງສະເພາະຂອງຫຼັກສູດນີ້ ພາທ່ານໄປສູ່ເປົ້າໝາຍອາຊີບ ຫຼືການສຶກສາສະເພາະແນວໃດ.$$),
      jsonb_build_object('heading', $$ຫຼີກລ້ຽງພາສາທີ່ໃຊ້ໄດ້ກັບບ່ອນໃດກໍ່ໄດ້$$, 'body', $$ຖ້າບົດຄວາມສາມາດສົ່ງໃຫ້ໂຮງຮຽນອື່ນໄດ້ໂດຍບໍ່ປ່ຽນ ນັ້ນໝາຍວ່າຕ້ອງການລາຍລະອຽດສະເພາະກ່ຽວກັບບ່ອນນີ້ຫຼາຍຂຶ້ນ.$$)
    ),
    array[$$Name specific features unique to this particular program$$, $$Connect those specific strengths to your specific goals$$, $$Avoid generic language that could apply to any school$$],
    array[$$ລະບຸລັກສະນະສະເພາະທີ່ເປັນເອກະລັກຂອງຫຼັກສູດນີ້$$, $$ເຊື່ອມຈຸດແຂງສະເພາະນັ້ນກັບເປົ້າໝາຍສະເພາະຂອງທ່ານ$$, $$ຫຼີກລ້ຽງພາສາທົ່ວໄປທີ່ໃຊ້ໄດ້ກັບໂຮງຮຽນໃດກໍ່ໄດ້$$],
    5, false, 48
  ),
  (
    $$build-a-portfolio-for-arts-creative-scholarships$$,
    $$Build a portfolio for arts and creative scholarships$$,
    $$ສ້າງແຟ້ມຜົນງານສຳລັບທຶນສາຍສິລະປະ ແລະ ສ້າງສັນ$$,
    $$A focused, well-presented portfolio matters more than sheer volume of work.$$,
    $$ແຟ້ມຜົນງານທີ່ສຸມ ແລະ ນຳສະເໜີດີ ສຳຄັນກວ່າຈຳນວນຜົນງານທີ່ຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Show range within your strongest style$$, 'body', $$Include variety that still reflects a clear artistic voice — a scattered mix of unrelated styles can look unfocused.$$),
      jsonb_build_object('heading', $$Present work professionally$$, 'body', $$Clean, well-lit photos of physical work and properly formatted digital files show respect for the reviewer's time.$$),
      jsonb_build_object('heading', $$Include a short artist statement$$, 'body', $$A brief note on your influences and intentions helps reviewers understand the thinking behind the work, not just the finished piece.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສະແດງຄວາມຫຼາກຫຼາຍພາຍໃນແບບທີ່ໜັກແໜ້ນທີ່ສຸດ$$, 'body', $$ໃສ່ຄວາມຫຼາກຫຼາຍທີ່ຍັງສະທ້ອນສຽງສິລະປະທີ່ຊັດເຈນ — ການປະສົມແບບທີ່ບໍ່ກ່ຽວຂ້ອງກັນ ອາດເບິ່ງບໍ່ມີຈຸດສຸມ.$$),
      jsonb_build_object('heading', $$ນຳສະເໜີຜົນງານຢ່າງເປັນມືອາຊີບ$$, 'body', $$ຮູບຖ່າຍທີ່ສະອາດ, ແສງດີຂອງຜົນງານທາງກາຍະພາບ ແລະ ໄຟລ໌ດິຈິຕອນທີ່ຈັດຮູບແບບຖືກຕ້ອງ ສະແດງຄວາມເຄົາລົບເວລາຂອງຜູ້ກວດ.$$),
      jsonb_build_object('heading', $$ໃສ່ຄຳຖະແຫຼງສິນລະປິນສັ້ນໆ$$, 'body', $$ບັນທຶກສັ້ນໆກ່ຽວກັບແຮງບັນດານໃຈ ແລະ ຈຸດປະສົງ ຊ່ວຍໃຫ້ຜູ້ກວດເຂົ້າໃຈຄວາມຄິດເບື້ອງຫຼັງຜົນງານ ບໍ່ແມ່ນແຕ່ຜົນງານທີ່ສຳເລັດ.$$)
    ),
    array[$$Show range within a clear, consistent artistic voice$$, $$Present work with clean photos and proper formatting$$, $$Include a short artist statement explaining your intentions$$],
    array[$$ສະແດງຄວາມຫຼາກຫຼາຍພາຍໃນສຽງສິລະປະທີ່ຊັດເຈນ$$, $$ນຳສະເໜີຜົນງານດ້ວຍຮູບຖ່າຍທີ່ສະອາດ ແລະ ຮູບແບບຖືກຕ້ອງ$$, $$ໃສ່ຄຳຖະແຫຼງສິນລະປິນສັ້ນອະທິບາຍຈຸດປະສົງ$$],
    5, false, 49
  ),
  (
    $$verify-a-scholarship-is-legitimate$$,
    $$Verify a scholarship is legitimate before applying$$,
    $$ກວດສອບວ່າທຶນເປັນຂອງແທ້ກ່ອນສະໝັກ$$,
    $$A real scholarship never asks you to pay to apply or to win.$$,
    $$ທຶນການສຶກສາທີ່ແທ້ຈິງ ບໍ່ເຄີຍຂໍໃຫ້ຈ່າຍເງິນເພື່ອສະໝັກ ຫຼືເພື່ອຮັບລາງວັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Never pay a fee to apply or claim a prize$$, 'body', $$Legitimate scholarships don't charge application fees or ask for payment to "release" your winnings — this is a classic scam sign.$$),
      jsonb_build_object('heading', $$Check for a real, verifiable organization$$, 'body', $$Search for the organization's official website, contact information, and past winners — a vague or newly created page is a warning sign.$$),
      jsonb_build_object('heading', $$Be wary of unsolicited "you've won" messages$$, 'body', $$You can't win a scholarship you never applied for — treat any surprise winning notification with immediate suspicion.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢ່າຈ່າຍຄ່າທຳນຽມເພື່ອສະໝັກ ຫຼືຮັບລາງວັນ$$, 'body', $$ທຶນທີ່ແທ້ຈິງບໍ່ເກັບຄ່າທຳນຽມການສະໝັກ ຫຼືຂໍໃຫ້ຈ່າຍເງິນເພື່ອ "ປົດປ່ອຍ" ລາງວັນ — ນີ້ຄືສັນຍານການຫຼອກລວງແບບຄລາສສິກ.$$),
      jsonb_build_object('heading', $$ກວດອົງກອນທີ່ມີຢູ່ຈິງ ແລະ ກວດໄດ້$$, 'body', $$ຄົ້ນຫາເວັບໄຊທາງການ, ຂໍ້ມູນຕິດຕໍ່ ແລະ ຜູ້ໄດ້ຮັບທຶນທີ່ຜ່ານມາຂອງອົງກອນ — ໜ້າເວັບທີ່ບໍ່ຊັດເຈນ ຫຼືສ້າງໃໝ່ ເປັນສັນຍານເຕືອນ.$$),
      jsonb_build_object('heading', $$ລະວັງຂໍ້ຄວາມ "ທ່ານໄດ້ຮັບລາງວັນ" ທີ່ບໍ່ໄດ້ຮ້ອງຂໍ$$, 'body', $$ທ່ານໄດ້ຮັບທຶນທີ່ບໍ່ເຄີຍສະໝັກບໍ່ໄດ້ — ໃຫ້ສົງໄສທັນທີກັບຂໍ້ຄວາມແຈ້ງໄດ້ຮັບລາງວັນທີ່ບໍ່ຄາດຄິດ.$$)
    ),
    array[$$Never pay a fee to apply or to claim a scholarship prize$$, $$Verify the organization has a real, checkable presence$$, $$Treat unsolicited "you've won" messages with suspicion$$],
    array[$$ຢ່າຈ່າຍຄ່າທຳນຽມເພື່ອສະໝັກ ຫຼືຮັບລາງວັນທຶນ$$, $$ກວດວ່າອົງກອນມີຕົວຕົນຈິງ ແລະ ກວດໄດ້$$, $$ສົງໄສຂໍ້ຄວາມ "ໄດ້ຮັບລາງວັນ" ທີ່ບໍ່ໄດ້ຮ້ອງຂໍ$$],
    4, false, 50
  ),
  (
    $$ask-for-a-fee-waiver-on-applications$$,
    $$Ask for a fee waiver on applications when eligible$$,
    $$ຂໍຍົກເວັ້ນຄ່າທຳນຽມການສະໝັກເມື່ອມີສິດ$$,
    $$Many programs offer waivers for financial hardship — you just have to ask.$$,
    $$ຫຼາຍໂຄງການໃຫ້ການຍົກເວັ້ນສຳລັບຄວາມຫຍຸ້ງຍາກທາງການເງິນ — ພຽງແຕ່ຕ້ອງຖາມ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check the program's website first$$, 'body', $$Many application systems have a built-in fee waiver request option — look for it before assuming you must pay.$$),
      jsonb_build_object('heading', $$Ask your school counselor for help$$, 'body', $$Guidance counselors often know the process for requesting waivers and can sometimes submit the request on your behalf.$$),
      jsonb_build_object('heading', $$State your situation plainly and honestly$$, 'body', $$A short, honest explanation of financial hardship is normal and expected — there's no need to over-explain or feel embarrassed.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດເວັບໄຊໂຄງການກ່ອນ$$, 'body', $$ລະບົບການສະໝັກຫຼາຍອັນມີຕົວເລືອກຂໍຍົກເວັ້ນຄ່າທຳນຽມໃນຕົວ — ຊອກຫາກ່ອນສົມມຸດວ່າຕ້ອງຈ່າຍ.$$),
      jsonb_build_object('heading', $$ຂໍຄວາມຊ່ວຍເຫຼືອຈາກອາຈານແນະແນວ$$, 'body', $$ອາຈານແນະແນວມັກຮູ້ຂະບວນການຂໍຍົກເວັ້ນ ແລະ ບາງຄັ້ງສາມາດສົ່ງຄຳຂໍແທນທ່ານໄດ້.$$),
      jsonb_build_object('heading', $$ບອກສະຖານະການຢ່າງກົງໄປກົງມາ ແລະ ຊື່ສັດ$$, 'body', $$ຄຳອະທິບາຍສັ້ນ ແລະ ຊື່ສັດກ່ຽວກັບຄວາມຫຍຸ້ງຍາກທາງການເງິນ ເປັນເລື່ອງທຳມະດາ ແລະ ຄາດຫວັງໄດ້ — ບໍ່ຈຳເປັນຕ້ອງອະທິບາຍຫຼາຍ ຫຼືອາຍ.$$)
    ),
    array[$$Check the application system for a built-in waiver option$$, $$Ask your school counselor for help with the process$$, $$State your financial situation plainly without over-explaining$$],
    array[$$ກວດລະບົບການສະໝັກຫາຕົວເລືອກຂໍຍົກເວັ້ນໃນຕົວ$$, $$ຂໍຄວາມຊ່ວຍເຫຼືອຈາກອາຈານແນະແນວ$$, $$ບອກສະຖານະການການເງິນຢ່າງກົງໄປກົງມາໂດຍບໍ່ອະທິບາຍຫຼາຍ$$],
    3, false, 51
  ),
  (
    $$write-concisely-under-word-limits$$,
    $$Write concisely within strict word limits$$,
    $$ຂຽນສະບັບຫຍໍ້ພາຍໃນຂອບເຂດຄຳທີ່ເຂັ້ມງວດ$$,
    $$Cutting to the exact limit forces clarity that often makes an essay stronger, not weaker.$$,
    $$ການຕັດໃຫ້ພໍດີຂອບເຂດ ບັງຄັບໃຫ້ຂຽນຊັດເຈນຂຶ້ນ ບໍ່ແມ່ນອ່ອນລົງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write over first, then cut$$, 'body', $$Draft freely without worrying about the limit, then edit down — it's easier to cut a full draft than to write a perfectly short one from scratch.$$),
      jsonb_build_object('heading', $$Cut words that add nothing$$, 'body', $$"In my opinion, I believe that" can almost always become just the point itself — remove filler phrases first.$$),
      jsonb_build_object('heading', $$Protect your strongest sentence$$, 'body', $$If cutting gets hard, identify the one sentence that matters most and build everything else around keeping it intact.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນເກີນກ່ອນ ແລ້ວຄ່ອຍຕັດ$$, 'body', $$ຮ່າງອອກມາເສລີໂດຍບໍ່ກັງວົນຂອບເຂດກ່ອນ ແລ້ວແກ້ໄຂຫຼຸດ — ຕັດຮ່າງເຕັມງ່າຍກວ່າການພະຍາຍາມຂຽນສັ້ນພໍດີແຕ່ຕົ້ນ.$$),
      jsonb_build_object('heading', $$ຕັດຄຳທີ່ບໍ່ໄດ້ເພີ່ມຫຍັງ$$, 'body', $$"ໃນຄວາມຄິດເຫັນຂອງຂ້ອຍ, ຂ້ອຍເຊື່ອວ່າ" ສາມາດຫຍໍ້ເປັນຈຸດຫຼັກໄດ້ເລີຍ — ຕັດປະໂຫຍກຕື່ມທີ່ບໍ່ຈຳເປັນອອກກ່ອນ.$$),
      jsonb_build_object('heading', $$ປົກປ້ອງປະໂຫຍກທີ່ໜັກແໜ້ນທີ່ສຸດ$$, 'body', $$ຖ້າຕັດຍາກ ໃຫ້ຫາປະໂຫຍກທີ່ສຳຄັນທີ່ສຸດໜຶ່ງອັນ ແລະ ສ້າງທຸກຢ່າງອື່ນອ້ອມຮອບເພື່ອຮັກສາມັນໄວ້.$$)
    ),
    array[$$Write a full draft first, then edit it down to the limit$$, $$Cut filler phrases that don't add real meaning$$, $$Identify and protect your single strongest sentence$$],
    array[$$ຂຽນຮ່າງເຕັມກ່ອນ ແລ້ວແກ້ໄຂໃຫ້ພໍດີຂອບເຂດ$$, $$ຕັດປະໂຫຍກຕື່ມທີ່ບໍ່ໄດ້ເພີ່ມຄວາມໝາຍ$$, $$ຫາ ແລະ ປົກປ້ອງປະໂຫຍກທີ່ໜັກແໜ້ນທີ່ສຸດ$$],
    4, false, 52
  ),
  (
    $$get-feedback-on-your-essay-before-submitting$$,
    $$Get feedback on your essay before submitting$$,
    $$ຂໍຄຳຄິດເຫັນຕໍ່ບົດຄວາມກ່ອນສົ່ງ$$,
    $$A fresh reader catches confusing parts and typos you've become blind to after many rereads.$$,
    $$ຜູ້ອ່ານໃໝ່ ຈັບຈຸດສັບສົນ ແລະ ຄຳຜິດ ທີ່ທ່ານມອງບໍ່ເຫັນອີກຫຼັງອ່ານຊ້ຳຫຼາຍຄັ້ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask someone who doesn't know your full story$$, 'body', $$A reader unfamiliar with the details will catch parts that are unclear to someone who wasn't there — this is more useful than a friend who already knows everything.$$),
      jsonb_build_object('heading', $$Ask specific questions, not just "is this good"$$, 'body', $$"Is my main point clear by the second paragraph?" gets more useful feedback than a vague request for general opinions.$$),
      jsonb_build_object('heading', $$Keep the final voice your own$$, 'body', $$Use feedback to clarify and fix errors, but make sure the final essay still sounds like you, not like your editor.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍຄົນທີ່ບໍ່ຮູ້ເລື່ອງລາວທັງໝົດຂອງທ່ານ$$, 'body', $$ຜູ້ອ່ານທີ່ບໍ່ຄຸ້ນລາຍລະອຽດ ຈະຈັບສ່ວນທີ່ບໍ່ຊັດເຈນສຳລັບຄົນທີ່ບໍ່ໄດ້ຢູ່ໃນເຫດການ — ເປັນປະໂຫຍດຫຼາຍກວ່າໝູ່ທີ່ຮູ້ທຸກຢ່າງແລ້ວ.$$),
      jsonb_build_object('heading', $$ຖາມຄຳຖາມສະເພາະ ບໍ່ແມ່ນແຕ່ "ດີບໍ່"$$, 'body', $$"ຈຸດຫຼັກຂອງຂ້ອຍຊັດເຈນຮອດຫຍໍ້ໜ້າທີສອງບໍ່" ໄດ້ຄຳຄິດເຫັນທີ່ເປັນປະໂຫຍດຫຼາຍກວ່າການຂໍຄວາມຄິດເຫັນທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ຮັກສາສຽງສຸດທ້າຍໃຫ້ເປັນຂອງທ່ານ$$, 'body', $$ໃຊ້ຄຳຄິດເຫັນເພື່ອຊັດເຈນ ແລະ ແກ້ຄວາມຜິດ ແຕ່ໃຫ້ບົດຄວາມສຸດທ້າຍຍັງຟັງເປັນສຽງທ່ານ ບໍ່ແມ່ນສຽງຜູ້ແກ້ໄຂ.$$)
    ),
    array[$$Ask someone unfamiliar with the full story to read it$$, $$Ask specific questions rather than a vague "is this good"$$, $$Keep the final essay sounding like your own voice$$],
    array[$$ຂໍຄົນທີ່ບໍ່ຄຸ້ນເລື່ອງລາວທັງໝົດອ່ານໃຫ້$$, $$ຖາມຄຳຖາມສະເພາະ ແທນການຖາມທົ່ວໄປວ່າ "ດີບໍ່"$$, $$ຮັກສາບົດຄວາມສຸດທ້າຍໃຫ້ຟັງເປັນສຽງຂອງທ່ານເອງ$$],
    4, false, 53
  ),
  (
    $$explain-financial-need-clearly-and-honestly$$,
    $$Explain financial need clearly and honestly$$,
    $$ອະທິບາຍຄວາມຈຳເປັນທາງການເງິນຢ່າງຊັດເຈນ ແລະ ຊື່ສັດ$$,
    $$Facts and specifics build more trust than emotional appeals alone.$$,
    $$ຂໍ້ເທັດຈິງ ແລະ ລາຍລະອຽດສະເພາະ ສ້າງຄວາມໄວ້ໃຈໄດ້ຫຼາຍກວ່າການອຸທອນທາງອາລົມຢ່າງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State the facts plainly$$, 'body', $$Household income, number of dependents, or specific circumstances stated factually are more persuasive than dramatic language.$$),
      jsonb_build_object('heading', $$Explain the impact, not just the numbers$$, 'body', $$Connect the financial situation to what it actually means for your education — working extra hours, limited resources, real trade-offs.$$),
      jsonb_build_object('heading', $$Stay factual and dignified$$, 'body', $$You don't need to exaggerate hardship — a clear, honest, dignified account is more convincing than an overly dramatic one.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຂໍ້ເທັດຈິງຢ່າງກົງໄປກົງມາ$$, 'body', $$ລາຍໄດ້ຄອບຄົວ, ຈຳນວນຄົນທີ່ຕ້ອງດູແລ ຫຼືສະຖານະການສະເພາະທີ່ບອກຕາມຄວາມຈິງ ໜ້າເຊື່ອຖືກວ່າພາສາທີ່ໜັກທາງອາລົມ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍຜົນກະທົບ ບໍ່ແມ່ນແຕ່ຕົວເລກ$$, 'body', $$ເຊື່ອມສະຖານະການການເງິນກັບຄວາມໝາຍແທ້ຕໍ່ການສຶກສາ — ເຮັດວຽກເພີ່ມ, ຊັບພະຍາກອນຈຳກັດ, ການແລກປ່ຽນຈິງ.$$),
      jsonb_build_object('heading', $$ຮັກສາຄວາມເປັນຂໍ້ເທັດຈິງ ແລະ ກຽດຕິຍົດ$$, 'body', $$ບໍ່ຈຳເປັນຕ້ອງເວົ້າເກີນຄວາມຈິງ — ບົດເລົ່າທີ່ຊັດເຈນ, ຊື່ສັດ ແລະ ມີກຽດ ໜ້າເຊື່ອຖືກວ່າແບບເກີນຈິງ.$$)
    ),
    array[$$State the financial facts plainly, not dramatically$$, $$Explain what the situation actually means for your education$$, $$Keep the account factual and dignified, not exaggerated$$],
    array[$$ບອກຂໍ້ເທັດຈິງທາງການເງິນຢ່າງກົງໄປກົງມາ$$, $$ອະທິບາຍວ່າສະຖານະການໝາຍຄວາມແນວໃດຕໍ່ການສຶກສາຈິງ$$, $$ຮັກສາການເລົ່າໃຫ້ເປັນຂໍ້ເທັດຈິງ ແລະ ມີກຽດ$$],
    4, false, 54
  ),
  (
    $$highlight-leadership-experience-in-applications$$,
    $$Highlight leadership experience in your applications$$,
    $$ເນັ້ນປະສົບການເປັນຜູ້ນຳໃນໃບສະໝັກ$$,
    $$Leadership doesn't require a title — initiative and responsibility count just as much.$$,
    $$ຄວາມເປັນຜູ້ນຳບໍ່ຈຳເປັນຕ້ອງມີຕຳແໜ່ງ — ຄວາມລິເລີ່ມ ແລະ ຄວາມຮັບຜິດຊອບກໍ່ນັບເໝືອນກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Recognize informal leadership too$$, 'body', $$Organizing a study group, mediating a conflict, or taking charge of a group project all count as real leadership.$$),
      jsonb_build_object('heading', $$Describe the challenge you navigated$$, 'body', $$Real leadership stories usually involve solving a problem or motivating others — describe that specific moment.$$),
      jsonb_build_object('heading', $$Show the outcome you influenced$$, 'body', $$Explain what changed because of your leadership — a completed project, a resolved conflict, a stronger team.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮັບຮູ້ຄວາມເປັນຜູ້ນຳແບບບໍ່ທາງການເໝືອນກັນ$$, 'body', $$ການຈັດກຸ່ມຮຽນ, ໄກ່ເກ່ຍຄວາມຂັດແຍ້ງ ຫຼືນຳໂຄງການກຸ່ມ ລ້ວນນັບເປັນຄວາມເປັນຜູ້ນຳຈິງ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍສິ່ງທ້າທາຍທີ່ຜ່ານມາໄດ້$$, 'body', $$ເລື່ອງລາວຄວາມເປັນຜູ້ນຳຈິງ ມັກກ່ຽວກັບການແກ້ບັນຫາ ຫຼືກະຕຸ້ນຄົນອື່ນ — ອະທິບາຍຊ່ວງເວລານັ້ນສະເພາະ.$$),
      jsonb_build_object('heading', $$ສະແດງຜົນລັບທີ່ມີອິດທິພົນ$$, 'body', $$ອະທິບາຍວ່າຫຍັງປ່ຽນແປງຍ້ອນຄວາມເປັນຜູ້ນຳຂອງທ່ານ — ໂຄງການທີ່ສຳເລັດ, ຄວາມຂັດແຍ້ງທີ່ແກ້ໄດ້, ທີມທີ່ເຂັ້ມແຂງຂຶ້ນ.$$)
    ),
    array[$$Informal leadership like organizing or mediating counts too$$, $$Describe the specific challenge you helped navigate$$, $$Show the concrete outcome your leadership influenced$$],
    array[$$ຄວາມເປັນຜູ້ນຳແບບບໍ່ທາງການ ເຊັ່ນ ຈັດການ ຫຼືໄກ່ເກ່ຍ ກໍ່ນັບ$$, $$ອະທິບາຍສິ່ງທ້າທາຍສະເພາະທີ່ຊ່ວຍຜ່ານໄປໄດ້$$, $$ສະແດງຜົນລັບຈັບຕ້ອງໄດ້ທີ່ຄວາມເປັນຜູ້ນຳມີອິດທິພົນ$$],
    4, false, 55
  ),
  (
    $$understand-what-gpa-and-test-scores-matter-for$$,
    $$Understand what GPA and test scores really matter for$$,
    $$ເຂົ້າໃຈວ່າ GPA ແລະ ຄະແນນທົດສອບສຳຄັນສຳລັບຫຍັງແທ້$$,
    $$Numbers usually open the door, but the essay and story usually decide who walks through it.$$,
    $$ຕົວເລກມັກເປີດປະຕູ ແຕ່ບົດຄວາມ ແລະ ເລື່ອງລາວມັກເປັນຜູ້ຕັດສິນວ່າໃຜຈະຜ່ານໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Understand they're often a first filter$$, 'body', $$Many scholarships use a minimum GPA or score just to narrow the applicant pool — clearing it doesn't guarantee winning.$$),
      jsonb_build_object('heading', $$Don't let a lower number stop you from applying$$, 'body', $$If you meet the stated minimum, apply — a strong essay and story can outweigh not being the absolute top scorer.$$),
      jsonb_build_object('heading', $$Invest energy where it matters most$$, 'body', $$Once you meet the baseline requirement, your time is often better spent perfecting the essay than chasing a slightly higher score.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຂົ້າໃຈວ່າມັກເປັນຕົວກອງແທ້ອັນທຳອິດ$$, 'body', $$ຫຼາຍທຶນໃຊ້ GPA ຫຼືຄະແນນຂັ້ນຕ່ຳພຽງເພື່ອກອງຜູ້ສະໝັກ — ຜ່ານມັນບໍ່ໄດ້ຮັບປະກັນວ່າຈະໄດ້ຮັບທຶນ.$$),
      jsonb_build_object('heading', $$ຢ່າໃຫ້ຕົວເລກຕ່ຳກວ່າຢຸດການສະໝັກ$$, 'body', $$ຖ້າກົງກັບຂັ້ນຕ່ຳທີ່ລະບຸໄວ້ ໃຫ້ສະໝັກ — ບົດຄວາມ ແລະ ເລື່ອງລາວທີ່ດີ ອາດຫຼາຍກວ່າການບໍ່ໄດ້ຄະແນນສູງສຸດ.$$),
      jsonb_build_object('heading', $$ໃສ່ພະລັງງານໃນບ່ອນທີ່ສຳຄັນທີ່ສຸດ$$, 'body', $$ເມື່ອກົງກັບຂໍ້ກຳນົດພື້ນຖານແລ້ວ ເວລາຂອງທ່ານມັກໃຊ້ໄດ້ດີກວ່າກັບການປັບບົດຄວາມໃຫ້ດີ ຫຼາຍກວ່າໄລ່ຄະແນນສູງຂຶ້ນອີກ.$$)
    ),
    array[$$GPA and scores are often just a first filter, not the deciding factor$$, $$Apply if you meet the stated minimum, even if not top-scoring$$, $$Invest extra effort into the essay once you clear the baseline$$],
    array[$$GPA ແລະ ຄະແນນມັກເປັນຕົວກອງທຳອິດ ບໍ່ແມ່ນຕົວຕັດສິນ$$, $$ສະໝັກຖ້າກົງກັບຂັ້ນຕ່ຳ ເຖິງແມ່ນບໍ່ໄດ້ຄະແນນສູງສຸດ$$, $$ໃສ່ຄວາມພະຍາຍາມເພີ່ມກັບບົດຄວາມເມື່ອກົງກັບຂໍ້ກຳນົດພື້ນຖານແລ້ວ$$],
    4, false, 56
  ),
  (
    $$write-a-thank-you-note-to-a-scholarship-donor$$,
    $$Write a genuine thank-you note to a scholarship donor$$,
    $$ຂຽນຄຳຂອບໃຈທີ່ຈິງໃຈໃຫ້ຜູ້ໃຫ້ທຶນ$$,
    $$A thoughtful thank-you strengthens your reputation and can open future doors.$$,
    $$ຄຳຂອບໃຈທີ່ຕັ້ງໃຈ ເສີມສ້າງຊື່ສຽງຂອງທ່ານ ແລະ ອາດເປີດປະຕູໃນອະນາຄົດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Send it promptly$$, 'body', $$Write and send the note within a couple of weeks of receiving the award, while the gratitude and details are still fresh.$$),
      jsonb_build_object('heading', $$Explain the specific impact$$, 'body', $$Tell them exactly what the scholarship allows you to do — which classes, which goals, which worries it removes.$$),
      jsonb_build_object('heading', $$Consider a brief future update$$, 'body', $$If appropriate, offer to share progress later — donors often appreciate knowing the long-term impact of their gift.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສົ່ງໃຫ້ໄວ$$, 'body', $$ຂຽນ ແລະ ສົ່ງພາຍໃນສອງສາມອາທິດຫຼັງໄດ້ຮັບທຶນ ໃນຂະນະທີ່ຄວາມຮູ້ສຶກຂອບໃຈ ແລະ ລາຍລະອຽດຍັງສົດຢູ່.$$),
      jsonb_build_object('heading', $$ອະທິບາຍຜົນກະທົບສະເພາະ$$, 'body', $$ບອກເຂົາຢ່າງຊັດເຈນວ່າທຶນນີ້ຊ່ວຍໃຫ້ເຮັດຫຍັງໄດ້ — ວິຊາໃດ, ເປົ້າໝາຍໃດ, ຄວາມກັງວົນໃດທີ່ຫາຍໄປ.$$),
      jsonb_build_object('heading', $$ພິຈາລະນາອັບເດດໃນອະນາຄົດ$$, 'body', $$ຖ້າເໝາະສົມ ສະເໜີແບ່ງປັນຄວາມຄືບໜ້າພາຍຫຼັງ — ຜູ້ໃຫ້ທຶນມັກຍິນດີຮູ້ຜົນກະທົບໄລຍະຍາວຂອງການໃຫ້ຂອງເຂົາ.$$)
    ),
    array[$$Send the thank-you note promptly, within a couple of weeks$$, $$Explain the specific, concrete impact of the scholarship$$, $$Consider offering a brief future update on your progress$$],
    array[$$ສົ່ງຄຳຂອບໃຈໄວ ພາຍໃນສອງສາມອາທິດ$$, $$ອະທິບາຍຜົນກະທົບສະເພາະ ແລະ ຈັບຕ້ອງໄດ້ຂອງທຶນ$$, $$ພິຈາລະນາສະເໜີອັບເດດຄວາມຄືບໜ້າໃນອະນາຄົດ$$],
    3, false, 57
  ),
  (
    $$reapply-to-a-scholarship-you-didnt-win-before$$,
    $$Reapply to a scholarship you didn't win before$$,
    $$ສະໝັກທຶນທີ່ບໍ່ໄດ້ຮັບຄືນອີກຄັ້ງ$$,
    $$Many scholarships allow reapplication, and you're a stronger applicant now than you were before.$$,
    $$ທຶນຫຼາຍອັນອະນຸຍາດໃຫ້ສະໝັກຄືນໄດ້ ແລະ ທ່ານແຂງແກ່ນຂຶ້ນກວ່າຄັ້ງກ່ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Confirm reapplication is allowed$$, 'body', $$Check the rules — most scholarships welcome new applications each cycle, but some have restrictions worth knowing.$$),
      jsonb_build_object('heading', $$Update the essay with what's genuinely new$$, 'body', $$Add real new achievements and growth since last time — don't just resubmit the identical essay unchanged.$$),
      jsonb_build_object('heading', $$Apply your growth from the first attempt$$, 'body', $$Use any feedback or self-reflection from the previous round to make this version genuinely stronger, not just resubmitted.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢືນຢັນວ່າສະໝັກຄືນໄດ້$$, 'body', $$ກວດກົດລະບຽບ — ທຶນສ່ວນຫຼາຍຍິນດີຮັບໃບສະໝັກໃໝ່ທຸກຮອບ ແຕ່ບາງອັນມີຂໍ້ຈຳກັດທີ່ຄວນຮູ້.$$),
      jsonb_build_object('heading', $$ອັບເດດບົດຄວາມດ້ວຍສິ່ງທີ່ໃໝ່ແທ້ໆ$$, 'body', $$ເພີ່ມຄວາມສຳເລັດ ແລະ ການເຕີບໂຕໃໝ່ຈິງນັບແຕ່ຄັ້ງກ່ອນ — ຢ່າສົ່ງບົດຄວາມດຽວກັນຄືນໂດຍບໍ່ປ່ຽນຫຍັງ.$$),
      jsonb_build_object('heading', $$ນຳການເຕີບໂຕຈາກຄັ້ງທຳອິດມາໃຊ້$$, 'body', $$ໃຊ້ຄຳຄິດເຫັນ ຫຼືການສະທ້ອນຕົນເອງຈາກຮອບກ່ອນ ເພື່ອເຮັດໃຫ້ສະບັບນີ້ໜັກແໜ້ນຂຶ້ນແທ້ ບໍ່ແມ່ນແຕ່ສົ່ງຄືນ.$$)
    ),
    array[$$Confirm the scholarship allows and welcomes reapplication$$, $$Update the essay with genuinely new achievements and growth$$, $$Apply lessons from the first attempt to make this one stronger$$],
    array[$$ຢືນຢັນວ່າທຶນອະນຸຍາດ ແລະ ຍິນດີຮັບການສະໝັກຄືນ$$, $$ອັບເດດບົດຄວາມດ້ວຍຄວາມສຳເລັດ ແລະ ການເຕີບໂຕໃໝ່ແທ້$$, $$ນຳບົດຮຽນຈາກຄັ້ງທຳອິດມາເຮັດໃຫ້ຄັ້ງນີ້ໜັກແໜ້ນຂຶ້ນ$$],
    4, false, 58
  ),
  (
    $$find-employer-sponsored-scholarships$$,
    $$Find employer or company-sponsored scholarships$$,
    $$ຊອກຫາທຶນທີ່ອຸປະຖຳໂດຍນາຍຈ້າງ ຫຼືບໍລິສັດ$$,
    $$Companies in fields they recruit from often fund scholarships with fewer applicants than public ones.$$,
    $$ບໍລິສັດໃນສາຍງານທີ່ເຂົາຮັບສະໝັກ ມັກໃຫ້ທຶນທີ່ມີຜູ້ສະໝັກໜ້ອຍກວ່າທຶນສາທາລະນະ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check large employers in your intended field$$, 'body', $$Many corporations fund scholarships as part of workforce development — search their websites' community or careers sections.$$),
      jsonb_build_object('heading', $$Ask about a parent's or relative's workplace$$, 'body', $$Many companies offer scholarships specifically for children of employees — a simple question to HR can reveal this benefit.$$),
      jsonb_build_object('heading', $$Some come with a job connection$$, 'body', $$Employer scholarships sometimes lead to internships or job offers — factor this potential path into your decision on where to apply.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດນາຍຈ້າງໃຫຍ່ໃນສາຍງານທີ່ຈະໄປ$$, 'body', $$ບໍລິສັດຫຼາຍແຫ່ງໃຫ້ທຶນເປັນສ່ວນໜຶ່ງຂອງການພັດທະນາກຳລັງແຮງງານ — ຄົ້ນຫາໃນສ່ວນຊຸມຊົນ ຫຼືອາຊີບຂອງເວັບໄຊເຂົາ.$$),
      jsonb_build_object('heading', $$ຖາມກ່ຽວກັບບ່ອນເຮັດວຽກຂອງພໍ່ແມ່ ຫຼືຍາດພີ່ນ້ອງ$$, 'body', $$ບໍລິສັດຫຼາຍແຫ່ງໃຫ້ທຶນສະເພາະສຳລັບລູກຂອງພະນັກງານ — ຄຳຖາມງ່າຍໆກັບ HR ອາດເປີດເຜີຍສະຫວັດດີການນີ້.$$),
      jsonb_build_object('heading', $$ບາງອັນມາພ້ອມການເຊື່ອມຕໍ່ວຽກ$$, 'body', $$ທຶນຈາກນາຍຈ້າງບາງອັນນຳໄປສູ່ການຝຶກງານ ຫຼືຂໍ້ສະເໜີວຽກ — ຄິດເຖິງເສັ້ນທາງນີ້ຕອນຕັດສິນໃຈວ່າຈະສະໝັກໃສ.$$)
    ),
    array[$$Check large employers in your intended field for scholarships$$, $$Ask if a parent's or relative's workplace offers one$$, $$Consider that some come with a future job connection$$],
    array[$$ກວດນາຍຈ້າງໃຫຍ່ໃນສາຍງານທີ່ຈະໄປວ່າມີທຶນບໍ່$$, $$ຖາມວ່າບ່ອນເຮັດວຽກຂອງພໍ່ແມ່ ຫຼືຍາດພີ່ນ້ອງມີທຶນໃຫ້ບໍ່$$, $$ພິຈາລະນາວ່າບາງອັນມາພ້ອມການເຊື່ອມຕໍ່ວຽກໃນອະນາຄົດ$$],
    4, false, 59
  ),
  (
    $$prepare-a-compelling-about-me-section$$,
    $$Prepare a compelling "about me" section$$,
    $$ກຽມສ່ວນ "ກ່ຽວກັບຕົນເອງ" ທີ່ໜ້າສົນໃຈ$$,
    $$A short bio should give a clear sense of who you are beyond grades and titles.$$,
    $$ຊີວະປະຫວັດສັ້ນ ຄວນໃຫ້ຄວາມຮູ້ສຶກຊັດເຈນວ່າທ່ານແມ່ນໃຜ ນອກເໜືອຈາກຄະແນນ ແລະ ຕຳແໜ່ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Balance achievement with personality$$, 'body', $$Mention one genuine interest or quirk alongside your accomplishments — this makes you memorable among many similar applicants.$$),
      jsonb_build_object('heading', $$Write in third person if requested, first if not$$, 'body', $$Follow the specific format asked for — a program bio and a personal essay often expect different points of view.$$),
      jsonb_build_object('heading', $$Keep it current and specific$$, 'body', $$Update the bio for each cycle rather than reusing an old one — outdated details signal a lack of attention to the application.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສົມດຸນຄວາມສຳເລັດກັບບຸກຄະລິກກະພາບ$$, 'body', $$ກ່າວເຖິງຄວາມສົນໃຈ ຫຼືລັກສະນະສະເພາະໜຶ່ງອັນຄຽງຄູ່ຄວາມສຳເລັດ — ເຮັດໃຫ້ຈື່ໄດ້ໃນບັນດາຜູ້ສະໝັກທີ່ຄ້າຍກັນຫຼາຍຄົນ.$$),
      jsonb_build_object('heading', $$ຂຽນບຸລຸດທີ 3 ຖ້າຂໍ, ບຸລຸດທີ 1 ຖ້າບໍ່ໄດ້ຂໍ$$, 'body', $$ປະຕິບັດຕາມຮູບແບບທີ່ຂໍໄວ້ — ຊີວະປະຫວັດຂອງໂຄງການ ແລະ ບົດຄວາມສ່ວນຕົວ ມັກຄາດຫວັງມຸມມອງທີ່ຕ່າງກັນ.$$),
      jsonb_build_object('heading', $$ໃຫ້ທັນສະໄໝ ແລະ ສະເພາະ$$, 'body', $$ອັບເດດຊີວະປະຫວັດທຸກຮອບ ແທນທີ່ຈະໃຊ້ອັນເກົ່າຄືນ — ລາຍລະອຽດທີ່ລ້າສະໄໝ ສົ່ງສັນຍານຄວາມບໍ່ໃສ່ໃຈໃນໃບສະໝັກ.$$)
    ),
    array[$$Balance achievements with a genuine personal detail$$, $$Follow the specific point-of-view format requested$$, $$Keep the bio current and updated for each application$$],
    array[$$ສົມດຸນຄວາມສຳເລັດກັບລາຍລະອຽດສ່ວນຕົວທີ່ຈິງໃຈ$$, $$ປະຕິບັດຕາມມຸມມອງ ແລະ ຮູບແບບທີ່ຂໍໄວ້ສະເພາະ$$, $$ອັບເດດຊີວະປະຫວັດໃຫ້ທັນສະໄໝສຳລັບແຕ່ລະໃບສະໝັກ$$],
    3, false, 60
  ),
  (
    $$use-ai-responsibly-in-scholarship-essays$$,
    $$Avoid plagiarism and use AI responsibly in essays$$,
    $$ຫຼີກລ້ຽງການລອກຄຳ ແລະ ໃຊ້ AI ຢ່າງມີຄວາມຮັບຜິດຊອບໃນບົດຄວາມ$$,
    $$Committees want your authentic voice — AI can help polish, but the ideas and story must be genuinely yours.$$,
    $$ຄະນະກຳມະການຢາກໄດ້ສຽງແທ້ຂອງທ່ານ — AI ຊ່ວຍປັບແຕ່ງໄດ້ ແຕ່ແນວຄິດ ແລະ ເລື່ອງລາວຕ້ອງເປັນຂອງທ່ານແທ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Never copy from an example essay online$$, 'body', $$Sample essays are for inspiration on structure only — copying phrases or stories is easily detected and disqualifying.$$),
      jsonb_build_object('heading', $$Use AI to polish, not to invent your story$$, 'body', $$AI can help with grammar and clarity, but the experiences and reflections must be genuinely your own, not generated.$$),
      jsonb_build_object('heading', $$Follow the specific program's AI policy$$, 'body', $$Some scholarships now explicitly state rules about AI use — read and follow them exactly rather than assuming.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢ່າຄັດລອກຈາກບົດຄວາມຕົວຢ່າງອອນລາຍ$$, 'body', $$ບົດຄວາມຕົວຢ່າງມີໄວ້ໃຫ້ແຮງບັນດານໃຈເລື່ອງໂຄງສ້າງເທົ່ານັ້ນ — ການລອກຄຳ ຫຼືເລື່ອງລາວ ຈັບໄດ້ງ່າຍ ແລະ ຕັດສິດໄດ້.$$),
      jsonb_build_object('heading', $$ໃຊ້ AI ປັບແຕ່ງ ບໍ່ແມ່ນສ້າງເລື່ອງລາວແທນ$$, 'body', $$AI ຊ່ວຍໄວຍະກອນ ແລະ ຄວາມຊັດເຈນໄດ້ ແຕ່ປະສົບການ ແລະ ການສະທ້ອນຕ້ອງເປັນຂອງທ່ານແທ້ ບໍ່ແມ່ນສ້າງຂຶ້ນ.$$),
      jsonb_build_object('heading', $$ປະຕິບັດຕາມນະໂຍບາຍ AI ຂອງໂຄງການສະເພາະ$$, 'body', $$ບາງທຶນປະກາດກົດລະບຽບກ່ຽວກັບການໃຊ້ AI ຢ່າງຈະແຈ້ງ — ອ່ານ ແລະ ປະຕິບັດຕາມແທ້ ບໍ່ແມ່ນສົມມຸດເອົາ.$$)
    ),
    array[$$Never copy phrases or stories from sample essays online$$, $$Use AI only to polish writing, not to invent your experiences$$, $$Read and follow each program's specific AI usage policy$$],
    array[$$ຢ່າຄັດລອກຄຳ ຫຼືເລື່ອງລາວຈາກບົດຄວາມຕົວຢ່າງອອນລາຍ$$, $$ໃຊ້ AI ພຽງເພື່ອປັບແຕ່ງການຂຽນ ບໍ່ແມ່ນສ້າງປະສົບການ$$, $$ອ່ານ ແລະ ປະຕິບັດຕາມນະໂຍບາຍ AI ຂອງແຕ່ລະໂຄງການ$$],
    4, false, 61
  ),
  (
    $$build-resilience-through-a-long-application-season$$,
    $$Build resilience through a long scholarship application season$$,
    $$ສ້າງຄວາມແຂງແກ່ນຕະຫຼອດລະດູການສະໝັກທຶນທີ່ຍາວນານ$$,
    $$Applying to many scholarships over months is a marathon — pace yourself to avoid burning out early.$$,
    $$ການສະໝັກທຶນຫຼາຍອັນຕະຫຼອດຫຼາຍເດືອນ ຄືການແລ່ນມາຣາທອນ — ຈັດຈັງຫວະບໍ່ໃຫ້ໝົດແຮງໄວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Spread applications across the season$$, 'body', $$Don't try to complete everything in one exhausting week — a steady pace of a few applications weekly is more sustainable.$$),
      jsonb_build_object('heading', $$Celebrate submissions, not just wins$$, 'body', $$Every completed application is a real accomplishment worth acknowledging, regardless of the eventual outcome.$$),
      jsonb_build_object('heading', $$Take real breaks between rounds$$, 'body', $$A short rest after a batch of applications prevents the fatigue that leads to sloppy work on the next round.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກະຈາຍໃບສະໝັກຕະຫຼອດລະດູການ$$, 'body', $$ຢ່າພະຍາຍາມເຮັດທຸກຢ່າງໃນອາທິດດຽວທີ່ອິດເມື່ອຍ — ຈັງຫວະທີ່ໝັ້ນຄົງຂອງສອງສາມໃບຕໍ່ອາທິດ ຍືນຍົງກວ່າ.$$),
      jsonb_build_object('heading', $$ສະເຫຼີມສະຫຼອງການສົ່ງ ບໍ່ແມ່ນແຕ່ການໄດ້ຮັບ$$, 'body', $$ທຸກໃບສະໝັກທີ່ສຳເລັດ ເປັນຄວາມສຳເລັດຈິງທີ່ຄວນຮັບຮູ້ ບໍ່ຂຶ້ນກັບຜົນສຸດທ້າຍ.$$),
      jsonb_build_object('heading', $$ພັກຜ່ອນແທ້ລະຫວ່າງແຕ່ລະຮອບ$$, 'body', $$ການພັກສັ້ນໆຫຼັງສົ່ງໃບສະໝັກເປັນຊຸດ ປ້ອງກັນຄວາມອິດເມື່ອຍທີ່ນຳໄປສູ່ວຽກທີ່ບໍ່ຮອບຄອບໃນຮອບຕໍ່ໄປ.$$)
    ),
    array[$$Spread applications across the season instead of rushing all at once$$, $$Celebrate every completed submission, not just eventual wins$$, $$Take real breaks between batches to avoid burnout$$],
    array[$$ກະຈາຍໃບສະໝັກຕະຫຼອດລະດູການ ແທນການຮີບເຮັດຄັ້ງດຽວ$$, $$ສະເຫຼີມສະຫຼອງທຸກໃບທີ່ສົ່ງ ບໍ່ແມ່ນແຕ່ຜົນທີ່ໄດ້ຮັບ$$, $$ພັກຜ່ອນແທ້ລະຫວ່າງແຕ່ລະຊຸດເພື່ອປ້ອງກັນຄວາມໝົດແຮງ$$],
    3, false, 62
  ),
  (
    $$combine-multiple-smaller-scholarships-into-a-plan$$,
    $$Combine multiple smaller scholarships into a full funding plan$$,
    $$ປະສົມທຶນນ້ອຍຫຼາຍອັນເປັນແຜນທຶນທີ່ຄົບຖ້ວນ$$,
    $$Several small awards together can cover as much as one large scholarship, with better odds overall.$$,
    $$ລາງວັນນ້ອຍຫຼາຍອັນລວມກັນ ອາດຄອບຄຸມໄດ້ເທົ່າກັບທຶນໃຫຍ່ອັນດຽວ ໂດຍມີໂອກາດລວມທີ່ດີກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Calculate your real funding gap first$$, 'body', $$Know the exact amount you need to cover, then work backward to figure out how many smaller awards would close that gap.$$),
      jsonb_build_object('heading', $$Apply broadly, not just to the biggest prizes$$, 'body', $$Ten applications for $200-500 awards often have better combined odds than one application for a single large scholarship.$$),
      jsonb_build_object('heading', $$Track total progress toward your goal$$, 'body', $$Keep a running total of secured funding so you can see concretely how close you are to fully covering your costs.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄິດໄລ່ຊ່ອງຫວ່າງທຶນຈິງກ່ອນ$$, 'body', $$ຮູ້ຈຳນວນທີ່ຕ້ອງການຄອບຄຸມແທ້ ແລ້ວຄິດຍ້ອນກັບວ່າຕ້ອງການລາງວັນນ້ອຍຈັກອັນເພື່ອອຸດຊ່ອງຫວ່າງນັ້ນ.$$),
      jsonb_build_object('heading', $$ສະໝັກຢ່າງກວ້າງຂວາງ ບໍ່ແມ່ນແຕ່ລາງວັນໃຫຍ່ທີ່ສຸດ$$, 'body', $$ໃບສະໝັກ 10 ອັນສຳລັບລາງວັນ 200-500 ໂດລາ ມັກມີໂອກາດລວມດີກວ່າໃບສະໝັກອັນດຽວສຳລັບທຶນໃຫຍ່ອັນດຽວ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມຄວາມຄືບໜ້າລວມໄປສູ່ເປົ້າໝາຍ$$, 'body', $$ບັນທຶກຍອດລວມທຶນທີ່ໄດ້ຮັບແລ້ວ ເພື່ອເຫັນຢ່າງຈັບຕ້ອງໄດ້ວ່າໃກ້ຄອບຄຸມຄ່າໃຊ້ຈ່າຍທັງໝົດປານໃດ.$$)
    ),
    array[$$Calculate the exact funding gap you need to close$$, $$Apply broadly to smaller awards, not just big prizes$$, $$Track your running total toward the full funding goal$$],
    array[$$ຄິດໄລ່ຊ່ອງຫວ່າງທຶນທີ່ຕ້ອງອຸດແທ້$$, $$ສະໝັກຢ່າງກວ້າງຂວາງກັບລາງວັນນ້ອຍ ບໍ່ແມ່ນແຕ່ລາງວັນໃຫຍ່$$, $$ຕິດຕາມຍອດລວມໄປສູ່ເປົ້າໝາຍທຶນເຕັມຈຳນວນ$$],
    4, false, 63
  ),
  (
    $$prepare-for-a-scholarship-fair-or-expo$$,
    $$Prepare for a scholarship fair or expo$$,
    $$ກຽມພ້ອມສຳລັບງານວາງສະແດງທຶນການສຶກສາ$$,
    $$A little preparation turns a crowded, overwhelming fair into a genuinely useful visit.$$,
    $$ການກຽມພ້ອມເລັກໜ້ອຍ ປ່ຽນງານທີ່ແອອັດ ແລະ ໜ້າອຶດອັດ ໃຫ້ເປັນການໄປຢ້ຽມຢາມທີ່ເປັນປະໂຫຍດແທ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Research which booths matter to you$$, 'body', $$Check the list of attending organizations beforehand and identify the handful most relevant to your field or situation.$$),
      jsonb_build_object('heading', $$Prepare a short self-introduction$$, 'body', $$Have a 15-second summary of who you are and what you're looking for ready, so conversations start smoothly.$$),
      jsonb_build_object('heading', $$Bring questions and take notes$$, 'body', $$Ask specific questions about eligibility and deadlines, and note answers immediately — details blur quickly after visiting many booths.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄົ້ນຄວ້າວ່າບູດໃດສຳຄັນຕໍ່ທ່ານ$$, 'body', $$ກວດລາຍຊື່ອົງກອນທີ່ຈະເຂົ້າຮ່ວມລ່ວງໜ້າ ແລະ ລະບຸບູດສອງສາມແຫ່ງທີ່ກ່ຽວຂ້ອງກັບສາຍງານ ຫຼືສະຖານະການທ່ານທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ກຽມການແນະນຳຕົນເອງສັ້ນໆ$$, 'body', $$ກຽມສະຫຼຸບ 15 ວິນາທີກ່ຽວກັບຕົນເອງ ແລະ ສິ່ງທີ່ຫາ ເພື່ອໃຫ້ການລົມເລີ່ມໄດ້ລຽບງ່າຍ.$$),
      jsonb_build_object('heading', $$ນຳຄຳຖາມໄປ ແລະ ຈົດບັນທຶກ$$, 'body', $$ຖາມຄຳຖາມສະເພາະກ່ຽວກັບສິດ ແລະ ກຳນົດເວລາ ແລະ ຈົດຄຳຕອບທັນທີ — ລາຍລະອຽດເລືອນລາງໄວຫຼັງໄປຫຼາຍບູດ.$$)
    ),
    array[$$Research and target the handful of booths most relevant to you$$, $$Prepare a short self-introduction for smooth conversations$$, $$Bring specific questions and take notes on the spot$$],
    array[$$ຄົ້ນຄວ້າ ແລະ ເລັງບູດສອງສາມແຫ່ງທີ່ກ່ຽວຂ້ອງກັບທ່ານທີ່ສຸດ$$, $$ກຽມການແນະນຳຕົນເອງສັ້ນເພື່ອໃຫ້ການລົມລຽບງ່າຍ$$, $$ນຳຄຳຖາມສະເພາະໄປ ແລະ ຈົດບັນທຶກທັນທີ$$],
    4, false, 64
  ),
  (
    $$handle-a-scholarship-panel-with-donors$$,
    $$Handle a scholarship interview panel that includes donors$$,
    $$ຮັບມືທີມສຳພາດທຶນທີ່ມີຜູ້ໃຫ້ທຶນຮ່ວມນຳ$$,
    $$Donors often care most about seeing their contribution's real, human impact.$$,
    $$ຜູ້ໃຫ້ທຶນມັກໃສ່ໃຈທີ່ສຸດກັບການເຫັນຜົນກະທົບແທ້ຈິງ ແລະ ເປັນມະນຸດຂອງການບໍລິຈາກຂອງເຂົາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Speak genuinely about what the funding means$$, 'body', $$Donors respond to honest, specific stories about impact more than polished corporate-sounding language.$$),
      jsonb_build_object('heading', $$Thank them directly and specifically$$, 'body', $$Acknowledging the donor's generosity in the room, not just in a later thank-you note, leaves a strong impression.$$),
      jsonb_build_object('heading', $$Answer questions about your plans with specifics$$, 'body', $$Donors often ask what you'll do with the education — answer with concrete plans, not vague future intentions.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເວົ້າຢ່າງຈິງໃຈກ່ຽວກັບຄວາມໝາຍຂອງທຶນ$$, 'body', $$ຜູ້ໃຫ້ທຶນຕອບຮັບເລື່ອງລາວທີ່ຊື່ສັດ ແລະ ສະເພາະກ່ຽວກັບຜົນກະທົບ ຫຼາຍກວ່າພາສາທີ່ຂັດເກີ້ງແບບບໍລິສັດ.$$),
      jsonb_build_object('heading', $$ຂອບໃຈເຂົາໂດຍກົງ ແລະ ສະເພາະ$$, 'body', $$ການຮັບຮູ້ຄວາມໃຈບຸນຂອງຜູ້ໃຫ້ທຶນຕໍ່ໜ້າ ບໍ່ແມ່ນແຕ່ໃນຄຳຂອບໃຈພາຍຫຼັງ ໃຫ້ຄວາມປະທັບໃຈທີ່ດີ.$$),
      jsonb_build_object('heading', $$ຕອບຄຳຖາມແຜນຂອງທ່ານດ້ວຍລາຍລະອຽດສະເພາະ$$, 'body', $$ຜູ້ໃຫ້ທຶນມັກຖາມວ່າຈະໃຊ້ການສຶກສານີ້ເຮັດຫຍັງ — ຕອບດ້ວຍແຜນທີ່ຊັດເຈນ ບໍ່ແມ່ນຄວາມຕັ້ງໃຈທີ່ບໍ່ຊັດເຈນ.$$)
    ),
    array[$$Speak genuinely about impact rather than polished corporate language$$, $$Thank donors directly and specifically in the room$$, $$Answer questions about your plans with concrete specifics$$],
    array[$$ເວົ້າຢ່າງຈິງໃຈກ່ຽວກັບຜົນກະທົບ ບໍ່ແມ່ນພາສາຂັດເກີ້ງ$$, $$ຂອບໃຈຜູ້ໃຫ້ທຶນໂດຍກົງ ແລະ ສະເພາະຕໍ່ໜ້າ$$, $$ຕອບຄຳຖາມແຜນຂອງທ່ານດ້ວຍລາຍລະອຽດທີ່ຊັດເຈນ$$],
    4, false, 65
  ),
  (
    $$understand-tax-awareness-for-scholarship-money$$,
    $$Build basic awareness of tax rules around scholarship money$$,
    $$ສ້າງຄວາມຮັບຮູ້ພື້ນຖານກ່ຽວກັບກົດພາສີສຳລັບເງິນທຶນ$$,
    $$Rules vary by country and situation — know enough to ask the right questions at the right time.$$,
    $$ກົດລະບຽບແຕກຕ່າງກັນຕາມປະເທດ ແລະ ສະຖານະການ — ຮູ້ພຽງພໍທີ່ຈະຖາມຄຳຖາມທີ່ຖືກຕ້ອງໃນເວລາທີ່ຖືກຕ້ອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Know that rules differ by country and use$$, 'body', $$Whether scholarship money is taxable often depends on your country and whether it covers tuition versus living expenses — don't assume one rule fits all.$$),
      jsonb_build_object('heading', $$Keep documentation regardless$$, 'body', $$Save award letters and statements even if you're unsure of tax status — having records ready makes any future question easy to answer.$$),
      jsonb_build_object('heading', $$Ask a knowledgeable adult or advisor$$, 'body', $$For significant amounts, a parent, school counselor, or tax professional can give guidance specific to your actual situation.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ວ່າກົດແຕກຕ່າງກັນຕາມປະເທດ ແລະ ການໃຊ້$$, 'body', $$ເງິນທຶນຕ້ອງເສຍພາສີບໍ່ ຂຶ້ນກັບປະເທດ ແລະ ວ່າຄອບຄຸມຄ່າຮຽນ ຫຼືຄ່າຄອງຊີບ — ຢ່າສົມມຸດວ່າກົດດຽວໃຊ້ໄດ້ທຸກກໍລະນີ.$$),
      jsonb_build_object('heading', $$ເກັບເອກະສານໄວ້ບໍ່ວ່າແນວໃດ$$, 'body', $$ເກັບຈົດໝາຍໃຫ້ທຶນ ແລະ ໃບແຈ້ງຍອດ ເຖິງແມ່ນບໍ່ແນ່ໃຈເລື່ອງພາສີ — ການມີບັນທຶກພ້ອມ ຊ່ວຍໃຫ້ຕອບຄຳຖາມໃນອະນາຄົດໄດ້ງ່າຍ.$$),
      jsonb_build_object('heading', $$ຖາມຜູ້ໃຫຍ່ ຫຼືທີ່ປຶກສາທີ່ມີຄວາມຮູ້$$, 'body', $$ສຳລັບຈຳນວນເງິນທີ່ສຳຄັນ ພໍ່ແມ່, ອາຈານແນະແນວ ຫຼືຜູ້ຊ່ຽວຊານພາສີ ໃຫ້ຄຳແນະນຳສະເພາະຕໍ່ສະຖານະການຈິງຂອງທ່ານໄດ້.$$)
    ),
    array[$$Know that tax rules vary by country and how the money is used$$, $$Keep documentation of all scholarship awards regardless$$, $$Ask a knowledgeable adult or advisor for significant amounts$$],
    array[$$ຮູ້ວ່າກົດພາສີແຕກຕ່າງກັນຕາມປະເທດ ແລະ ການໃຊ້ເງິນ$$, $$ເກັບເອກະສານທຶນທັງໝົດໄວ້ບໍ່ວ່າແນວໃດ$$, $$ຖາມຜູ້ໃຫຍ່ ຫຼືທີ່ປຶກສາທີ່ມີຄວາມຮູ້ສຳລັບຈຳນວນທີ່ສຳຄັນ$$],
    4, false, 66
  ),
  (
    $$start-a-scholarship-search-early$$,
    $$Start your scholarship search earlier than feels necessary$$,
    $$ເລີ່ມຄົ້ນຫາທຶນການສຶກສາໄວກວ່າທີ່ຮູ້ສຶກວ່າຈຳເປັນ$$,
    $$Many strong scholarships have deadlines a full year before funds are needed — early searchers see far more options.$$,
    $$ທຶນທີ່ດີຫຼາຍອັນມີກຳນົດເວລາໜຶ່ງປີກ່ອນຕ້ອງການເງິນແທ້ — ຜູ້ຄົ້ນຫາໄວ ເຫັນທາງເລືອກຫຼາຍກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Begin searching a full year ahead$$, 'body', $$Many scholarships for a given school year open applications the year before — starting early catches these that late searchers miss entirely.$$),
      jsonb_build_object('heading', $$Build materials once, reuse for a year$$, 'body', $$An early start means your essays, resume, and recommendation letters are ready well before any deadline pressure hits.$$),
      jsonb_build_object('heading', $$Early searching reduces last-minute stress$$, 'body', $$Spreading the work over many months, instead of cramming before a deadline, produces stronger applications overall.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມຄົ້ນຫາລ່ວງໜ້າໜຶ່ງປີເຕັມ$$, 'body', $$ທຶນຫຼາຍອັນສຳລັບປີການສຶກສາໃດໜຶ່ງ ເປີດຮັບສະໝັກປີກ່ອນໜ້ານັ້ນ — ການເລີ່ມໄວ ຈັບໂອກາດເຫຼົ່ານີ້ທີ່ຄົນຄົ້ນຫາຊ້າພາດໄປໝົດ.$$),
      jsonb_build_object('heading', $$ສ້າງເອກະສານຄັ້ງດຽວ ໃຊ້ໄດ້ຕະຫຼອດປີ$$, 'body', $$ການເລີ່ມໄວໝາຍຄວາມວ່າ ບົດຄວາມ, CV ແລະ ຈົດໝາຍຮັບຮອງ ພ້ອມກ່ອນຄວາມກົດດັນຈາກກຳນົດເວລາໃດໆ.$$),
      jsonb_build_object('heading', $$ການຄົ້ນຫາໄວຫຼຸດຄວາມກົດດັນນາທີສຸດທ້າຍ$$, 'body', $$ການກະຈາຍວຽກຕະຫຼອດຫຼາຍເດືອນ ແທນທີ່ຈະອັດກ່ອນກຳນົດເວລາ ໃຫ້ໃບສະໝັກທີ່ດີກວ່າໂດຍລວມ.$$)
    ),
    array[$$Begin your search a full year ahead of when you need funds$$, $$Build reusable materials early, before deadline pressure hits$$, $$Spreading the work out produces stronger applications$$],
    array[$$ເລີ່ມຄົ້ນຫາລ່ວງໜ້າໜຶ່ງປີກ່ອນຕ້ອງການເງິນແທ້$$, $$ສ້າງເອກະສານທີ່ໃຊ້ຊ້ຳໄດ້ແຕ່ໄວ ກ່ອນຄວາມກົດດັນມາຮອດ$$, $$ການກະຈາຍວຽກອອກໃຫ້ໃບສະໝັກທີ່ດີກວ່າ$$],
    3, false, 67
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'scholarships'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
