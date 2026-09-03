-- Bulk lesson-pool seed: Productivity direction.
-- Adds original, evergreen productivity lessons so the pool has 50+
-- published lessons before launch; the weekly content-forge job adds on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'LESSON', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$time-block-your-calendar$$,
    $$Time-block your calendar for real focus$$,
    $$ແບ່ງເວລາໃນປະຕິທິນເພື່ອຈົດຈໍ່ຢ່າງແທ້ຈິງ$$,
    $$Give each important task a specific slot on your calendar instead of a vague to-do list.$$,
    $$ໃຫ້ແຕ່ລະວຽກສຳຄັນມີຊ່ວງເວລາສະເພາະໃນປະຕິທິນ ແທນທີ່ຈະເປັນລາຍການທີ່ບໍ່ຊັດເຈນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Turn tasks into calendar blocks$$, 'body', $$Instead of "work on report" on a to-do list, schedule "9:00–10:30 write report draft" directly on your calendar.$$),
      jsonb_build_object('heading', $$Leave buffer between blocks$$, 'body', $$Tasks almost always take longer than expected — a 10 to 15 minute gap between blocks absorbs overruns without wrecking your whole day.$$),
      jsonb_build_object('heading', $$Protect the block like a real meeting$$, 'body', $$Treat a focus block with the same seriousness as a meeting with your boss — don't casually cancel it for small requests.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປ່ຽນວຽກເປັນຊ່ວງເວລາໃນປະຕິທິນ$$, 'body', $$ແທນທີ່ "ເຮັດບົດລາຍງານ" ໃນລາຍການວຽກ ໃຫ້ວາງ "9:00–10:30 ຂຽນຮ່າງບົດລາຍງານ" ໂດຍກົງໃນປະຕິທິນ.$$),
      jsonb_build_object('heading', $$ເວັ້ນຊ່ອງຫວ່າງລະຫວ່າງແຕ່ລະຊ່ວງ$$, 'body', $$ວຽກມັກໃຊ້ເວລາດົນກວ່າຄາດ — ຊ່ອງຫວ່າງ 10-15 ນາທີລະຫວ່າງແຕ່ລະຊ່ວງຊ່ວຍຮັບເວລາທີ່ເກີນໂດຍບໍ່ເສຍທັງມື້.$$),
      jsonb_build_object('heading', $$ປົກປ້ອງຊ່ວງເວລາຄືກັບການນັດໝາຍຈິງ$$, 'body', $$ຖືຊ່ວງເວລາຈົດຈໍ່ຄືກັບການນັດພົບຫົວໜ້າ — ຢ່າຍົກເລີກງ່າຍໆເພື່ອຄຳຂໍນ້ອຍໆ.$$)
    ),
    array[$$Schedule specific tasks into calendar time blocks$$, $$Leave buffer time between blocks for overruns$$, $$Protect focus blocks as seriously as a real meeting$$],
    array[$$ວາງວຽກສະເພາະລົງໃນຊ່ວງເວລາປະຕິທິນ$$, $$ເວັ້ນຊ່ອງຫວ່າງລະຫວ່າງຊ່ວງເວລາສຳລັບເວລາທີ່ເກີນ$$, $$ປົກປ້ອງຊ່ວງເວລາຈົດຈໍ່ຄືກັບການນັດພົບຈິງ$$],
    5, false, 20
  ),
  (
    $$pomodoro-technique-basics$$,
    $$The Pomodoro technique: focused sprints and real breaks$$,
    $$ເທັກນິກ Pomodoro: ຊ່ວງຈົດຈໍ່ສັ້ນໆ ພ້ອມພັກຈິງ$$,
    $$Work in 25-minute focused sprints followed by a short break to sustain attention over a long day.$$,
    $$ເຮັດວຽກເປັນຊ່ວງ 25 ນາທີ ຕິດຕາມດ້ວຍການພັກສັ້ນ ເພື່ອຮັກສາຄວາມຈົດຈໍ່ຕະຫຼອດມື້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a real 25-minute timer$$, 'body', $$Pick one task, start a timer for 25 minutes, and work on nothing else until it rings — no checking messages in between.$$),
      jsonb_build_object('heading', $$Take the break seriously too$$, 'body', $$A 5-minute break — stand up, stretch, look away from the screen — is part of the method, not optional slack time.$$),
      jsonb_build_object('heading', $$Take a longer break after four rounds$$, 'body', $$After four pomodoros, take a 15 to 30 minute longer break — this rhythm prevents the fatigue that ruins the afternoon.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງໂມງຈັບເວລາ 25 ນາທີແທ້ໆ$$, 'body', $$ເລືອກໜຶ່ງວຽກ, ຕັ້ງໂມງ 25 ນາທີ ແລະ ເຮັດແຕ່ອັນນັ້ນຈົນໂມງດັງ — ບໍ່ເບິ່ງຂໍ້ຄວາມລະຫວ່າງນັ້ນ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມສຳຄັນກັບການພັກເໝືອນກັນ$$, 'body', $$ການພັກ 5 ນາທີ — ລຸກຢືນ, ຢືດຕົວ, ເບິ່ງອອກຈາກໜ້າຈໍ — ເປັນສ່ວນໜຶ່ງຂອງວິທີການ ບໍ່ແມ່ນເວລາຫວ່າງທີ່ເລືອກໄດ້.$$),
      jsonb_build_object('heading', $$ພັກຍາວຂຶ້ນຫຼັງສີ່ຊ່ວງ$$, 'body', $$ຫຼັງສີ່ຊ່ວງ Pomodoro ໃຫ້ພັກຍາວ 15-30 ນາທີ — ຈັງຫວະນີ້ປ້ອງກັນຄວາມອິດເມື່ອຍທີ່ທຳລາຍຕອນບ່າຍ.$$)
    ),
    array[$$Work in focused 25-minute sprints on one task only$$, $$Treat the 5-minute break as part of the method$$, $$Take a longer break every four rounds$$],
    array[$$ເຮັດວຽກເປັນຊ່ວງ 25 ນາທີແບບຈົດຈໍ່ກັບໜຶ່ງວຽກ$$, $$ຖືວ່າການພັກ 5 ນາທີເປັນສ່ວນໜຶ່ງຂອງວິທີການ$$, $$ພັກຍາວຂຶ້ນທຸກສີ່ຊ່ວງ$$],
    4, false, 21
  ),
  (
    $$eat-the-frog-hardest-task-first$$,
    $$"Eat the frog": tackle your hardest task first$$,
    $$"ກິນກົບກ່ອນ": ຈັດການວຽກທີ່ຍາກທີ່ສຸດກ່ອນ$$,
    $$Doing your most dreaded task first frees the rest of the day from its shadow.$$,
    $$ເຮັດວຽກທີ່ໜັກໃຈທີ່ສຸດກ່ອນ ຊ່ວຍໃຫ້ສ່ວນທີ່ເຫຼືອຂອງມື້ບໍ່ຖືກກົດດັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify your "frog" the night before$$, 'body', $$Name the one task you're most tempted to avoid tomorrow — that's your frog, and it usually matters most.$$),
      jsonb_build_object('heading', $$Do it before checking messages$$, 'body', $$Start your frog before opening email or chat apps — once the inbox opens, the day's agenda quietly shifts to other people's priorities.$$),
      jsonb_build_object('heading', $$Feel the relief and use it$$, 'body', $$The relief after finishing your hardest task creates real momentum — notice it and let it carry you into the next task.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາ "ກົບ" ຂອງທ່ານຄືນກ່ອນ$$, 'body', $$ລະບຸໜຶ່ງວຽກທີ່ຢາກຫຼີກລ້ຽງທີ່ສຸດມື້ອື່ນ — ນັ້ນຄືກົບຂອງທ່ານ ແລະ ມັກສຳຄັນທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ເຮັດກ່ອນເບິ່ງຂໍ້ຄວາມ$$, 'body', $$ເລີ່ມກົບຂອງທ່ານກ່ອນເປີດອີເມວ ຫຼືແອັບແຊັດ — ເມື່ອກ່ອງຂໍ້ຄວາມເປີດແລ້ວ ວຽກປະຈຳວັນມັກປ່ຽນໄປຕາມຄວາມສຳຄັນຂອງຄົນອື່ນ.$$),
      jsonb_build_object('heading', $$ຮູ້ສຶກໂລ່ງໃຈ ແລະ ໃຊ້ມັນ$$, 'body', $$ຄວາມໂລ່ງໃຈຫຼັງເຮັດວຽກຍາກສຳເລັດ ສ້າງແຮງຂັບເຄື່ອນຈິງ — ສັງເກດມັນ ແລະ ໃຫ້ມັນນຳໄປສູ່ວຽກຕໍ່ໄປ.$$)
    ),
    array[$$Identify your hardest, most-avoided task the night before$$, $$Start on it before opening email or chat$$, $$Use the relief and momentum to carry into the next task$$],
    array[$$ຫາວຽກທີ່ຍາກ ແລະ ຫຼີກລ້ຽງທີ່ສຸດຄືນກ່ອນ$$, $$ເລີ່ມມັນກ່ອນເປີດອີເມວ ຫຼືແຊັດ$$, $$ໃຊ້ຄວາມໂລ່ງໃຈ ແລະ ແຮງຂັບເຄື່ອນນຳໄປວຽກຕໍ່ໄປ$$],
    4, false, 22
  ),
  (
    $$batch-similar-tasks-together$$,
    $$Batch similar tasks together to save mental energy$$,
    $$ຈັດກຸ່ມວຽກທີ່ຄ້າຍກັນເພື່ອປະຢັດພະລັງງານສະໝອງ$$,
    $$Switching between different types of work has a hidden cost — group similar tasks to reduce it.$$,
    $$ການສະຫຼັບປະເພດວຽກມີຄ່າໃຊ້ຈ່າຍທີ່ເບິ່ງບໍ່ເຫັນ — ຈັດກຸ່ມວຽກຄ້າຍກັນເພື່ອຫຼຸດມັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Group by type of thinking$$, 'body', $$Do all your calls together, all your writing together, all your admin together — each switch between types costs focus to rebuild.$$),
      jsonb_build_object('heading', $$Set a fixed batch time daily$$, 'body', $$Pick a consistent time each day for a recurring batch, like replying to messages only at 11am and 4pm, instead of constantly.$$),
      jsonb_build_object('heading', $$Group errands and calls outside work too$$, 'body', $$Apply the same idea to daily life — run all your errands in one trip instead of several separate short trips through the week.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈັດກຸ່ມຕາມປະເພດການຄິດ$$, 'body', $$ໂທລະສັບທັງໝົດພ້ອມກັນ, ຂຽນທັງໝົດພ້ອມກັນ, ວຽກທຸລະການທັງໝົດພ້ອມກັນ — ການສະຫຼັບແຕ່ລະປະເພດເສຍຄວາມຈົດຈໍ່ໃນການສ້າງໃໝ່.$$),
      jsonb_build_object('heading', $$ຕັ້ງເວລາຈັດກຸ່ມທີ່ແນ່ນອນທຸກມື້$$, 'body', $$ເລືອກເວລາທີ່ແນ່ນອນທຸກມື້ສຳລັບການຈັດກຸ່ມ ເຊັ່ນ ຕອບຂໍ້ຄວາມແຕ່ຕອນ 11 ໂມງ ແລະ 4 ໂມງ ແທນທີ່ຈະຕອບຕະຫຼອດ.$$),
      jsonb_build_object('heading', $$ຈັດກຸ່ມທຸລະ ແລະ ໂທລະສັບນອກວຽກເໝືອນກັນ$$, 'body', $$ໃຊ້ແນວຄິດດຽວກັນກັບຊີວິດປະຈຳວັນ — ເຮັດທຸລະທັງໝົດໃນຄັ້ງດຽວ ແທນທີ່ຈະແຍກອອກຫຼາຍຄັ້ງຕະຫຼອດອາທິດ.$$)
    ),
    array[$$Group tasks that use the same kind of thinking$$, $$Set fixed daily times for recurring batches like messages$$, $$Apply batching to errands and calls outside of work too$$],
    array[$$ຈັດກຸ່ມວຽກທີ່ໃຊ້ການຄິດແບບດຽວກັນ$$, $$ຕັ້ງເວລາປະຈຳວັນທີ່ແນ່ນອນສຳລັບການຈັດກຸ່ມ ເຊັ່ນ ຂໍ້ຄວາມ$$, $$ໃຊ້ການຈັດກຸ່ມກັບທຸລະ ແລະ ໂທລະສັບນອກວຽກເໝືອນກັນ$$],
    4, false, 23
  ),
  (
    $$weekly-review-ritual$$,
    $$Build a weekly review ritual$$,
    $$ສ້າງພິທີກຳທົບທວນປະຈຳອາທິດ$$,
    $$A short weekly review keeps small tasks from piling into overwhelming chaos.$$,
    $$ການທົບທວນສັ້ນໆປະຈຳອາທິດ ຊ່ວຍບໍ່ໃຫ້ວຽກນ້ອຍໆສະສົມເປັນຄວາມສັບສົນໃຫຍ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick a fixed weekly slot$$, 'body', $$Friday afternoon or Sunday evening — choose a consistent 20 to 30 minute slot that becomes automatic over time.$$),
      jsonb_build_object('heading', $$Review three simple lists$$, 'body', $$What got done, what's still open, and what's coming next week — three short lists give a clear picture without overthinking.$$),
      jsonb_build_object('heading', $$End with next week's top 3$$, 'body', $$Close the review by naming your top three priorities for next week, so Monday starts with direction instead of scrambling.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກຊ່ວງເວລາປະຈຳອາທິດທີ່ແນ່ນອນ$$, 'body', $$ບ່າຍວັນສຸກ ຫຼືແລງວັນອາທິດ — ເລືອກຊ່ວງ 20-30 ນາທີທີ່ແນ່ນອນ ຈົນກາຍເປັນອັດຕະໂນມັດ.$$),
      jsonb_build_object('heading', $$ທົບທວນສາມລາຍການງ່າຍໆ$$, 'body', $$ຫຍັງສຳເລັດແລ້ວ, ຫຍັງຍັງຄ້າງ ແລະ ຫຍັງກຳລັງມາອາທິດໜ້າ — ສາມລາຍການສັ້ນໆໃຫ້ພາບຊັດເຈນໂດຍບໍ່ຕ້ອງຄິດຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຈົບດ້ວຍ 3 ວຽກສຳຄັນອາທິດໜ້າ$$, 'body', $$ຈົບການທົບທວນດ້ວຍການລະບຸ 3 ວຽກສຳຄັນທີ່ສຸດອາທິດໜ້າ ເພື່ອໃຫ້ວັນຈັນເລີ່ມມີທິດທາງ ບໍ່ແມ່ນສັບສົນ.$$)
    ),
    array[$$Pick a fixed 20-30 minute weekly review slot$$, $$Review what's done, still open, and coming up$$, $$End by naming next week's top three priorities$$],
    array[$$ເລືອກຊ່ວງທົບທວນປະຈຳອາທິດ 20-30 ນາທີທີ່ແນ່ນອນ$$, $$ທົບທວນສິ່ງທີ່ສຳເລັດ, ຍັງຄ້າງ ແລະ ກຳລັງມາ$$, $$ຈົບດ້ວຍການລະບຸ 3 ວຽກສຳຄັນອາທິດໜ້າ$$],
    5, false, 24
  ),
  (
    $$eisenhower-matrix-urgent-vs-important$$,
    $$Use the Eisenhower matrix: urgent vs. important$$,
    $$ໃຊ້ Eisenhower Matrix: ດ່ວນ ທຽບກັບ ສຳຄັນ$$,
    $$Sort tasks into four boxes to see what deserves your attention now versus what can wait or be dropped.$$,
    $$ຈັດວຽກເປັນສີ່ຊ່ອງ ເພື່ອເຫັນວ່າຫຍັງຄວນເອົາໃຈໃສ່ຕອນນີ້ ແລະ ຫຍັງລໍຖ້າ ຫຼືປະໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Draw the four boxes$$, 'body', $$Urgent+important (do now), important but not urgent (schedule), urgent but not important (delegate), neither (drop).$$),
      jsonb_build_object('heading', $$Watch the "important but not urgent" box$$, 'body', $$This box — health, learning, relationships, planning — gets neglected most easily since it never screams for attention, but matters most long-term.$$),
      jsonb_build_object('heading', $$Sort your list once a week$$, 'body', $$Spend five minutes weekly placing your current tasks into these four boxes — it clarifies what's actually worth your time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ແຕ້ມສີ່ຊ່ອງ$$, 'body', $$ດ່ວນ+ສຳຄັນ (ເຮັດເລີຍ), ສຳຄັນແຕ່ບໍ່ດ່ວນ (ວາງແຜນ), ດ່ວນແຕ່ບໍ່ສຳຄັນ (ມອບໝາຍ), ບໍ່ດ່ວນບໍ່ສຳຄັນ (ປະຖິ້ມ).$$),
      jsonb_build_object('heading', $$ຈັບຕາຊ່ອງ "ສຳຄັນແຕ່ບໍ່ດ່ວນ"$$, 'body', $$ຊ່ອງນີ້ — ສຸຂະພາບ, ການຮຽນຮູ້, ຄວາມສຳພັນ, ການວາງແຜນ — ຖືກລະເລີຍງ່າຍທີ່ສຸດເພາະບໍ່ໄດ້ຮ້ອງຂໍຄວາມສົນໃຈ ແຕ່ສຳຄັນທີ່ສຸດໃນໄລຍະຍາວ.$$),
      jsonb_build_object('heading', $$ຈັດລາຍການທຸກອາທິດ$$, 'body', $$ໃຊ້ 5 ນາທີທຸກອາທິດຈັດວຽກປັດຈຸບັນເຂົ້າສີ່ຊ່ອງນີ້ — ຊ່ວຍໃຫ້ຊັດເຈນວ່າຫຍັງຄຸ້ມຄ່າເວລາຂອງທ່ານແທ້.$$)
    ),
    array[$$Sort tasks into urgent/important, schedule, delegate, or drop$$, $$Guard time for "important but not urgent" work like planning$$, $$Sort your task list into the matrix once a week$$],
    array[$$ຈັດວຽກເປັນ ດ່ວນ+ສຳຄັນ, ວາງແຜນ, ມອບໝາຍ ຫຼືປະຖິ້ມ$$, $$ຮັກສາເວລາໃຫ້ວຽກ "ສຳຄັນແຕ່ບໍ່ດ່ວນ" ເຊັ່ນການວາງແຜນ$$, $$ຈັດລາຍການວຽກເຂົ້າ matrix ທຸກອາທິດ$$],
    5, false, 25
  ),
  (
    $$reduce-decision-fatigue-with-routines$$,
    $$Reduce decision fatigue with simple routines$$,
    $$ຫຼຸດຄວາມອິດເມື່ອຍໃນການຕັດສິນໃຈດ້ວຍກິດຈະວັດງ່າຍໆ$$,
    $$Every small decision uses mental energy — routines remove decisions you don't need to make fresh each day.$$,
    $$ທຸກການຕັດສິນໃຈນ້ອຍໆໃຊ້ພະລັງງານສະໝອງ — ກິດຈະວັດຊ່ວຍລົບການຕັດສິນໃຈທີ່ບໍ່ຈຳເປັນຕ້ອງຄິດໃໝ່ທຸກມື້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Automate small daily choices$$, 'body', $$A fixed breakfast, a repeated outfit rotation, a set morning sequence — removing these tiny decisions saves energy for real ones.$$),
      jsonb_build_object('heading', $$Make important decisions early$$, 'body', $$Decision quality tends to drop later in the day as fatigue builds — schedule your most important choices for the morning.$$),
      jsonb_build_object('heading', $$Write default rules for common situations$$, 'body', $$"I always decline weekday evening meetings" removes the need to weigh the same trade-off repeatedly every time it comes up.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຮັດການເລືອກນ້ອຍໆປະຈຳວັນໃຫ້ອັດຕະໂນມັດ$$, 'body', $$ອາຫານເຊົ້າແບບຄົງທີ່, ຊຸດເສື້ອຜ້າໝູນວຽນ, ລຳດັບຕອນເຊົ້າທີ່ຄົງທີ່ — ການລົບການຕັດສິນໃຈນ້ອຍໆນີ້ ຮັກສາພະລັງງານໄວ້ໃຫ້ການຕັດສິນໃຈຈິງ.$$),
      jsonb_build_object('heading', $$ຕັດສິນໃຈເລື່ອງສຳຄັນຕອນເຊົ້າ$$, 'body', $$ຄຸນນະພາບການຕັດສິນໃຈມັກຫຼຸດລົງຕອນທ້າຍມື້ຍ້ອນຄວາມອິດເມື່ອຍສະສົມ — ວາງແຜນການຕັດສິນໃຈສຳຄັນທີ່ສຸດໄວ້ຕອນເຊົ້າ.$$),
      jsonb_build_object('heading', $$ຂຽນກົດເລີ່ມຕົ້ນສຳລັບສະຖານະການທົ່ວໄປ$$, 'body', $$"ຂ້ອຍປະຕິເສດການນັດຕອນແລງວັນທຳການສະເໝີ" ລົບຄວາມຈຳເປັນທີ່ຕ້ອງຊັ່ງນ້ຳໜັກເລື່ອງດຽວກັນຊ້ຳໆທຸກຄັ້ງທີ່ເກີດຂຶ້ນ.$$)
    ),
    array[$$Automate small daily choices to save mental energy$$, $$Schedule your most important decisions for the morning$$, $$Write default rules to avoid repeating the same trade-off$$],
    array[$$ເຮັດການເລືອກນ້ອຍໆປະຈຳວັນໃຫ້ອັດຕະໂນມັດ$$, $$ວາງແຜນການຕັດສິນໃຈສຳຄັນທີ່ສຸດໄວ້ຕອນເຊົ້າ$$, $$ຂຽນກົດເລີ່ມຕົ້ນເພື່ອບໍ່ຕ້ອງຊັ່ງນ້ຳໜັກເລື່ອງດຽວກັນຊ້ຳໆ$$],
    4, false, 26
  ),
  (
    $$single-tasking-vs-multitasking-myths$$,
    $$Why single-tasking beats multitasking$$,
    $$ເປັນຫຍັງການເຮັດເທື່ອລະຢ່າງດີກວ່າການເຮັດຫຼາຍຢ່າງພ້ອມກັນ$$,
    $$The brain doesn't truly do two focused tasks at once — it switches rapidly, and each switch has a cost.$$,
    $$ສະໝອງບໍ່ໄດ້ເຮັດສອງວຽກທີ່ຕ້ອງຈົດຈໍ່ພ້ອມກັນແທ້ — ມັນສະຫຼັບໄວໆ ແລະ ແຕ່ລະຄັ້ງມີຄ່າໃຊ້ຈ່າຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"Multitasking" is really rapid switching$$, 'body', $$What feels like doing two things at once is actually your attention jumping back and forth, losing a little quality and speed each time.$$),
      jsonb_build_object('heading', $$Some pairings are safe, most aren't$$, 'body', $$Walking while listening to a podcast is fine because walking needs little conscious thought — but writing while in a meeting rarely works well for either.$$),
      jsonb_build_object('heading', $$Close other tabs for deep work$$, 'body', $$For anything requiring real thought, close unrelated tabs and apps first — the option to switch is itself a distraction, even unused.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"Multitasking" ຄືການສະຫຼັບໄວ$$, 'body', $$ສິ່ງທີ່ຮູ້ສຶກຄືເຮັດສອງຢ່າງພ້ອມກັນ ຄືຄວາມສົນໃຈກະໂດດໄປມາ ເສຍຄຸນນະພາບ ແລະ ຄວາມໄວໜ້ອຍໜຶ່ງທຸກຄັ້ງ.$$),
      jsonb_build_object('heading', $$ບາງຄູ່ປອດໄພ ສ່ວນຫຼາຍບໍ່ປອດໄພ$$, 'body', $$ຍ່າງໄປພ້ອມຟັງພອດແຄສໂອເຄ ເພາະການຍ່າງໃຊ້ຄວາມຄິດໜ້ອຍ — ແຕ່ຂຽນໄປພ້ອມເຂົ້າຮ່ວມກອງປະຊຸມ ມັກເຮັດໄດ້ບໍ່ດີທັງສອງຢ່າງ.$$),
      jsonb_build_object('heading', $$ປິດແທັບອື່ນສຳລັບວຽກທີ່ຕ້ອງຄິດເລິກ$$, 'body', $$ສຳລັບວຽກທີ່ຕ້ອງໃຊ້ຄວາມຄິດຈິງ ໃຫ້ປິດແທັບ ແລະ ແອັບທີ່ບໍ່ກ່ຽວຂ້ອງກ່ອນ — ທາງເລືອກທີ່ຈະສະຫຼັບເອງກໍ່ເປັນສິ່ງລົບກວນ ແມ່ນແຕ່ບໍ່ໄດ້ໃຊ້.$$)
    ),
    array[$$"Multitasking" is really rapid, costly switching$$, $$Only pair tasks when one needs little conscious thought$$, $$Close unrelated tabs and apps before deep work$$],
    array[$$"Multitasking" ຄືການສະຫຼັບໄວທີ່ມີຄ່າໃຊ້ຈ່າຍ$$, $$ຈັບຄູ່ວຽກໄດ້ພຽງເມື່ອອັນໜຶ່ງໃຊ້ຄວາມຄິດໜ້ອຍ$$, $$ປິດແທັບ ແລະ ແອັບທີ່ບໍ່ກ່ຽວຂ້ອງກ່ອນວຽກທີ່ຕ້ອງຄິດເລິກ$$],
    4, false, 27
  ),
  (
    $$daily-top-3-priority-list$$,
    $$Set a daily top-3 priority list$$,
    $$ຕັ້ງລາຍການ 3 ວຽກສຳຄັນປະຈຳວັນ$$,
    $$A long to-do list creates anxiety — three clear priorities create focus.$$,
    $$ລາຍການວຽກທີ່ຍາວສ້າງຄວາມກັງວົນ — ສາມວຽກສຳຄັນທີ່ຊັດເຈນສ້າງຄວາມຈົດຈໍ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Choose exactly three$$, 'body', $$Not five, not ten — three forces real prioritization and is realistically achievable most days.$$),
      jsonb_build_object('heading', $$Write them the night before$$, 'body', $$Deciding your three priorities the evening before means you start the morning with direction, not blank-page paralysis.$$),
      jsonb_build_object('heading', $$Everything else is optional bonus$$, 'body', $$Anything beyond your top three that gets done is a bonus — this reframes an incomplete long list as a successful short one.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກພຽງສາມ$$, 'body', $$ບໍ່ແມ່ນຫ້າ ບໍ່ແມ່ນສິບ — ສາມບັງຄັບໃຫ້ຈັດລຳດັບຄວາມສຳຄັນຈິງ ແລະ ເຮັດໄດ້ຈິງໃນສ່ວນຫຼາຍຂອງມື້.$$),
      jsonb_build_object('heading', $$ຂຽນຄືນກ່ອນຫນ້າ$$, 'body', $$ຕັດສິນໃຈສາມວຽກສຳຄັນຄືນກ່ອນໜ້າ ໝາຍຄວາມວ່າເລີ່ມຕອນເຊົ້າດ້ວຍທິດທາງ ບໍ່ແມ່ນຄວາມສັບສົນຈາກໜ້າຫວ່າງ.$$),
      jsonb_build_object('heading', $$ນອກເໜືອສາມອັນເປັນຂໍ້ພິເສດ$$, 'body', $$ສິ່ງໃດທີ່ເຮັດໄດ້ນອກເໜືອຈາກສາມອັນຫຼັກເປັນຂໍ້ພິເສດ — ນີ້ປ່ຽນລາຍການຍາວທີ່ບໍ່ຄົບ ໃຫ້ເປັນລາຍການສັ້ນທີ່ສຳເລັດ.$$)
    ),
    array[$$Limit your daily priority list to exactly three items$$, $$Write your top three the night before$$, $$Treat anything beyond the three as a bonus$$],
    array[$$ຈຳກັດລາຍການສຳຄັນປະຈຳວັນໃຫ້ພຽງສາມອັນ$$, $$ຂຽນສາມອັນຫຼັກຄືນກ່ອນໜ້າ$$, $$ຖືວ່າສິ່ງໃດນອກເໜືອສາມອັນເປັນຂໍ້ພິເສດ$$],
    3, false, 28
  ),
  (
    $$use-a-not-to-do-list$$,
    $$Use a "not-to-do" list$$,
    $$ໃຊ້ລາຍການ "ສິ່ງທີ່ບໍ່ຄວນເຮັດ"$$,
    $$Naming the habits and requests you'll actively avoid protects your time as much as any to-do list.$$,
    $$ການລະບຸນິໄສ ແລະ ຄຳຂໍທີ່ຈະຫຼີກລ້ຽງຢ່າງຕັ້ງໃຈ ປົກປ້ອງເວລາໄດ້ພໍໆກັບລາຍການວຽກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List your known time-wasters$$, 'body', $$Be specific: "checking phone within 30 minutes of waking" or "saying yes to same-day meeting requests" — name your actual patterns.$$),
      jsonb_build_object('heading', $$Put it somewhere visible$$, 'body', $$A not-to-do list only works if you see it in the moment of temptation — keep it on your desk or phone lock screen.$$),
      jsonb_build_object('heading', $$Review and update it monthly$$, 'body', $$As one bad habit fades, a new one might appear — revisit the list monthly to keep it relevant to your current struggles.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸສິ່ງທີ່ເສຍເວລາທີ່ຮູ້ຢູ່ແລ້ວ$$, 'body', $$ໃຫ້ສະເພາະ: "ເບິ່ງໂທລະສັບພາຍໃນ 30 ນາທີຫຼັງຕື່ນ" ຫຼື "ຕົກລົງນັດພົບໃນວັນດຽວກັນ" — ລະບຸຮູບແບບແທ້ຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ວາງໄວ້ບ່ອນທີ່ເຫັນໄດ້ງ່າຍ$$, 'body', $$ລາຍການ "ບໍ່ຄວນເຮັດ" ໄດ້ຜົນເມື່ອເຫັນມັນຕອນຢາກເຮັດ — ວາງໄວ້ໂຕະ ຫຼືໜ້າຈໍລັອກໂທລະສັບ.$$),
      jsonb_build_object('heading', $$ທົບທວນ ແລະ ອັບເດດທຸກເດືອນ$$, 'body', $$ເມື່ອນິໄສບໍ່ດີໜຶ່ງຫາຍໄປ ອາດມີອັນໃໝ່ເກີດຂຶ້ນ — ທົບທວນລາຍການທຸກເດືອນເພື່ອໃຫ້ກົງກັບບັນຫາປັດຈຸບັນ.$$)
    ),
    array[$$Name specific time-wasting patterns, not vague ones$$, $$Keep the list somewhere visible in the moment of temptation$$, $$Review and update it monthly$$],
    array[$$ລະບຸຮູບແບບເສຍເວລາສະເພາະ ບໍ່ແມ່ນທົ່ວໄປ$$, $$ວາງລາຍການໄວ້ບ່ອນທີ່ເຫັນຕອນຢາກເຮັດ$$, $$ທົບທວນ ແລະ ອັບເດດທຸກເດືອນ$$],
    3, false, 29
  ),
  (
    $$manage-email-inbox-efficiently$$,
    $$Manage your email inbox efficiently$$,
    $$ຈັດການອີເມວໃນກ່ອງຂໍ້ຄວາມຢ່າງມີປະສິດທິພາບ$$,
    $$Checking email less often, and handling each message once, cuts hours of wasted re-reading.$$,
    $$ເບິ່ງອີເມວໃຫ້ໜ້ອຍລົງ ແລະ ຈັດການແຕ່ລະຂໍ້ຄວາມຄັ້ງດຽວ ຫຼຸດຊົ່ວໂມງທີ່ເສຍໄປກັບການອ່ານຄືນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check at set times, not constantly$$, 'body', $$Two or three fixed check-in times a day handles nearly everything urgent, without the constant background pull of notifications.$$),
      jsonb_build_object('heading', $$Touch it once$$, 'body', $$When you open an email, decide immediately: reply now, schedule a reply time, delegate, or delete — avoid reading it three times before acting.$$),
      jsonb_build_object('heading', $$Unsubscribe aggressively$$, 'body', $$Spend ten minutes unsubscribing from newsletters you never read — this permanently reduces daily inbox volume.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເບິ່ງຕາມເວລາທີ່ກຳນົດ ບໍ່ແມ່ນຕະຫຼອດ$$, 'body', $$ສອງ ຫຼືສາມເທື່ອຕໍ່ວັນທີ່ກຳນົດແນ່ນອນ ຈັດການເລື່ອງດ່ວນເກືອບໝົດ ໂດຍບໍ່ຕ້ອງຖືກແຈ້ງເຕືອນລົບກວນຕະຫຼອດ.$$),
      jsonb_build_object('heading', $$ແຕະຄັ້ງດຽວ$$, 'body', $$ເມື່ອເປີດອີເມວ ໃຫ້ຕັດສິນໃຈທັນທີ: ຕອບເລີຍ, ກຳນົດເວລາຕອບ, ມອບໝາຍ ຫຼືລຶບ — ຫຼີກລ້ຽງການອ່ານສາມຄັ້ງກ່ອນຈັດການ.$$),
      jsonb_build_object('heading', $$ຍົກເລີກຮັບຂ່າວສານແບບແຂງແຮງ$$, 'body', $$ໃຊ້ 10 ນາທີຍົກເລີກຈົດໝາຍຂ່າວທີ່ບໍ່ເຄີຍອ່ານ — ຊ່ວຍຫຼຸດຈຳນວນອີເມວປະຈຳວັນຢ່າງຖາວອນ.$$)
    ),
    array[$$Check email at fixed times, not constantly$$, $$Decide and act the first time you open a message$$, $$Unsubscribe from newsletters you never actually read$$],
    array[$$ເບິ່ງອີເມວຕາມເວລາທີ່ກຳນົດ ບໍ່ແມ່ນຕະຫຼອດ$$, $$ຕັດສິນໃຈ ແລະ ຈັດການໃນຄັ້ງທຳອິດທີ່ເປີດ$$, $$ຍົກເລີກຈົດໝາຍຂ່າວທີ່ບໍ່ເຄີຍອ່ານແທ້$$],
    4, false, 30
  ),
  (
    $$say-no-without-guilt$$,
    $$Say no to requests without guilt$$,
    $$ປະຕິເສດຄຳຂໍໂດຍບໍ່ຮູ້ສຶກຜິດ$$,
    $$Every yes to one thing is a no to something else — protect your time with a clear, kind refusal.$$,
    $$ທຸກຄຳຕົກລົງຕໍ່ອັນໜຶ່ງ ຄືການປະຕິເສດອັນອື່ນ — ປົກປ້ອງເວລາດ້ວຍການປະຕິເສດທີ່ຊັດເຈນ ແລະ ສຸພາບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use a simple, kind template$$, 'body', $$"Thanks for thinking of me — I can't take this on right now, but I hope it goes well" declines clearly without over-explaining.$$),
      jsonb_build_object('heading', $$Don't answer immediately$$, 'body', $$"Let me check and get back to you" buys time to actually weigh the request against your real priorities before committing.$$),
      jsonb_build_object('heading', $$Remember saying no protects your yeses$$, 'body', $$Every no to a low-priority request preserves your energy for the commitments that actually matter to you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ແບບຟອມງ່າຍ ແລະ ສຸພາບ$$, 'body', $$"ຂອບໃຈທີ່ນຶກເຖິງຂ້ອຍ — ຕອນນີ້ຮັບບໍ່ໄດ້ ແຕ່ຫວັງວ່າຈະໄປໄດ້ດີ" ປະຕິເສດຢ່າງຊັດເຈນໂດຍບໍ່ຕ້ອງອະທິບາຍຫຼາຍ.$$),
      jsonb_build_object('heading', $$ບໍ່ຕ້ອງຕອບທັນທີ$$, 'body', $$"ໃຫ້ຂ້ອຍກວດເບິ່ງກ່ອນແລ້ວຈະຕອບ" ໃຫ້ເວລາຊັ່ງນ້ຳໜັກຄຳຂໍກັບຄວາມສຳຄັນຈິງກ່ອນຕົກລົງ.$$),
      jsonb_build_object('heading', $$ຈື່ວ່າການປະຕິເສດປົກປ້ອງການຕົກລົງທີ່ສຳຄັນ$$, 'body', $$ທຸກການປະຕິເສດຄຳຂໍທີ່ບໍ່ສຳຄັນ ຮັກສາພະລັງງານໄວ້ໃຫ້ຄຳໝັ້ນສັນຍາທີ່ສຳຄັນຕໍ່ທ່ານແທ້ໆ.$$)
    ),
    array[$$Use a short, kind template to decline clearly$$, $$Buy time before committing to a new request$$, $$Remember every no protects your real priorities$$],
    array[$$ໃຊ້ແບບຟອມສັ້ນ ແລະ ສຸພາບເພື່ອປະຕິເສດຢ່າງຊັດເຈນ$$, $$ຊື້ເວລາກ່ອນຕົກລົງຮັບຄຳຂໍໃໝ່$$, $$ຈື່ວ່າທຸກການປະຕິເສດປົກປ້ອງຄວາມສຳຄັນທີ່ແທ້ຈິງ$$],
    4, false, 31
  ),
  (
    $$break-big-projects-into-small-steps$$,
    $$Break big projects into small, startable steps$$,
    $$ແບ່ງໂຄງການໃຫຍ່ເປັນຂັ້ນຕອນນ້ອຍທີ່ເລີ່ມໄດ້ງ່າຍ$$,
    $$A vague, huge task creates avoidance — a specific five-minute next step gets started.$$,
    $$ວຽກໃຫຍ່ທີ່ບໍ່ຊັດເຈນສ້າງການຫຼີກລ້ຽງ — ຂັ້ນຕອນຕໍ່ໄປ 5 ນາທີທີ່ຊັດເຈນເຮັດໃຫ້ເລີ່ມໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Find the very next physical action$$, 'body', $$Not "plan the event" but "open a blank document and list five possible venues" — concrete and startable within minutes.$$),
      jsonb_build_object('heading', $$Aim for steps under 30 minutes$$, 'body', $$If a step feels bigger than 30 minutes, break it again — smaller pieces are easier to fit into a busy schedule.$$),
      jsonb_build_object('heading', $$Track visible progress$$, 'body', $$Check off small steps as you go — seeing progress accumulate keeps a long project from feeling stuck or endless.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາການກະທຳຕໍ່ໄປທີ່ຈັບຕ້ອງໄດ້$$, 'body', $$ບໍ່ແມ່ນ "ວາງແຜນງານ" ແຕ່ແມ່ນ "ເປີດເອກະສານເປົ່າ ແລະ ຂຽນລາຍຊື່ 5 ສະຖານທີ່" — ຈັບຕ້ອງໄດ້ ແລະ ເລີ່ມພາຍໃນສອງສາມນາທີ.$$),
      jsonb_build_object('heading', $$ຕັ້ງເປົ້າຂັ້ນຕອນບໍ່ເກີນ 30 ນາທີ$$, 'body', $$ຖ້າຂັ້ນຕອນໃດຮູ້ສຶກໃຫຍ່ກວ່າ 30 ນາທີ ໃຫ້ແບ່ງອີກ — ຊິ້ນສ່ວນນ້ອຍໆເໝາະກັບຕາຕະລາງທີ່ຫຍຸ້ງກວ່າ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມຄວາມຄືບໜ້າທີ່ເຫັນໄດ້$$, 'body', $$ຕິກຂັ້ນຕອນນ້ອຍໆເມື່ອສຳເລັດ — ການເຫັນຄວາມຄືບໜ້າສະສົມ ຊ່ວຍໃຫ້ໂຄງການຍາວບໍ່ຮູ້ສຶກຕິດຂັດ ຫຼືບໍ່ມີທີ່ສິ້ນສຸດ.$$)
    ),
    array[$$Find the very next concrete, physical action$$, $$Break steps down until each is under 30 minutes$$, $$Track visible progress to stay motivated on long projects$$],
    array[$$ຫາການກະທຳຕໍ່ໄປທີ່ຈັບຕ້ອງໄດ້ຈິງ$$, $$ແບ່ງຂັ້ນຕອນຈົນແຕ່ລະອັນບໍ່ເກີນ 30 ນາທີ$$, $$ຕິດຕາມຄວາມຄືບໜ້າທີ່ເຫັນໄດ້ເພື່ອຮັກສາແຮງຈູງໃຈ$$],
    4, false, 32
  ),
  (
    $$build-a-morning-routine-that-sticks$$,
    $$Build a morning routine that actually sticks$$,
    $$ສ້າງກິດຈະວັດຕອນເຊົ້າທີ່ຄົງຢູ່ໄດ້ຈິງ$$,
    $$Start with one small anchor habit rather than an ambitious full routine you'll abandon in a week.$$,
    $$ເລີ່ມດ້ວຍນິໄສຫຼັກນ້ອຍໆອັນດຽວ ແທນທີ່ຈະເປັນກິດຈະວັດເຕັມທີ່ທະເຍີທະຍານທີ່ຈະປະຖິ້ມພາຍໃນອາທິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with one anchor habit$$, 'body', $$Drink a glass of water, or write three lines in a journal — one small, reliable action that anchors the rest of the routine over time.$$),
      jsonb_build_object('heading', $$Prepare the night before$$, 'body', $$Lay out clothes, prep breakfast items, or set your workspace up the evening before to remove morning friction.$$),
      jsonb_build_object('heading', $$Expect and allow imperfect days$$, 'body', $$Missing a day doesn't break the routine — what matters is returning to it the next day without treating the miss as failure.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍນິໄສຫຼັກອັນດຽວ$$, 'body', $$ດື່ມນ້ຳໜຶ່ງແກ້ວ ຫຼືຂຽນບັນທຶກ 3 ແຖວ — ການກະທຳນ້ອຍໆທີ່ໜ້າເຊື່ອຖື ເປັນຫຼັກໃຫ້ກິດຈະວັດອື່ນຕໍ່ຍອດໄປຕາມເວລາ.$$),
      jsonb_build_object('heading', $$ກຽມພ້ອມຄືນກ່ອນໜ້າ$$, 'body', $$ວາງເສື້ອຜ້າ, ກຽມອາຫານເຊົ້າ ຫຼືຈັດໂຕະເຮັດວຽກໄວ້ຄືນກ່ອນໜ້າ ເພື່ອລົບຄວາມຫຍຸ້ງຍາກຕອນເຊົ້າ.$$),
      jsonb_build_object('heading', $$ຍອມຮັບມື້ທີ່ບໍ່ສົມບູນແບບ$$, 'body', $$ການພາດໜຶ່ງມື້ບໍ່ໄດ້ທຳລາຍກິດຈະວັດ — ສິ່ງສຳຄັນຄືການກັບມາເຮັດຄືນມື້ຕໍ່ໄປ ໂດຍບໍ່ຖືວ່າການພາດເປັນຄວາມລົ້ມເຫຼວ.$$)
    ),
    array[$$Start with one small, reliable anchor habit$$, $$Prepare the night before to reduce morning friction$$, $$Missing a day doesn't break the routine — just return to it$$],
    array[$$ເລີ່ມດ້ວຍນິໄສຫຼັກນ້ອຍ ແລະ ໜ້າເຊື່ອຖືອັນດຽວ$$, $$ກຽມພ້ອມຄືນກ່ອນໜ້າເພື່ອລົບຄວາມຫຍຸ້ງຍາກຕອນເຊົ້າ$$, $$ການພາດໜຶ່ງມື້ບໍ່ທຳລາຍກິດຈະວັດ — ພຽງແຕ່ກັບມາເຮັດຄືນ$$],
    4, false, 33
  ),
  (
    $$build-an-evening-wind-down-routine$$,
    $$Build an evening wind-down routine$$,
    $$ສ້າງກິດຈະວັດຜ່ອນຄາຍຕອນແລງ$$,
    $$A consistent wind-down signals your brain that the workday is truly over, improving both rest and next-day focus.$$,
    $$ກິດຈະວັດຜ່ອນຄາຍທີ່ຄົງທີ່ ບອກສະໝອງວ່າມື້ເຮັດວຽກຈົບແທ້ ຊ່ວຍທັງການພັກຜ່ອນ ແລະ ຄວາມຈົດຈໍ່ມື້ຕໍ່ໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a clear work cutoff$$, 'body', $$Close your laptop and work apps at a fixed time — an open laptop keeps inviting "just one more thing."$$),
      jsonb_build_object('heading', $$Write tomorrow's plan before you stop$$, 'body', $$Jotting down tomorrow's top priority before closing out lets your mind actually let go of work thoughts for the evening.$$),
      jsonb_build_object('heading', $$Keep screens dim before bed$$, 'body', $$Bright screens close to bedtime interfere with sleep quality, which directly affects tomorrow's focus and energy.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງເວລາຢຸດວຽກທີ່ຊັດເຈນ$$, 'body', $$ປິດແລັບທັອບ ແລະ ແອັບວຽກຕາມເວລາທີ່ກຳນົດ — ແລັບທັອບທີ່ເປີດຄ້າງໄວ້ ມັກຊວນໃຫ້ "ເຮັດອີກໜ້ອຍໜຶ່ງ".$$),
      jsonb_build_object('heading', $$ຂຽນແຜນມື້ອື່ນກ່ອນຢຸດ$$, 'body', $$ຂຽນວຽກສຳຄັນທີ່ສຸດມື້ອື່ນກ່ອນປິດວຽກ ຊ່ວຍໃຫ້ຫົວໃຈປ່ອຍວາງຄວາມຄິດເລື່ອງວຽກໄດ້ຕອນແລງ.$$),
      jsonb_build_object('heading', $$ຫຼຸດແສງໜ້າຈໍກ່ອນນອນ$$, 'body', $$ໜ້າຈໍທີ່ສະຫວ່າງໃກ້ເວລານອນ ລົບກວນຄຸນນະພາບການນອນ ເຊິ່ງກະທົບຄວາມຈົດຈໍ່ ແລະ ພະລັງງານມື້ຕໍ່ໄປໂດຍກົງ.$$)
    ),
    array[$$Close work apps at a clear, fixed cutoff time$$, $$Write tomorrow's top priority before you stop for the day$$, $$Dim screens before bed to protect sleep quality$$],
    array[$$ປິດແອັບວຽກຕາມເວລາຢຸດທີ່ຊັດເຈນ$$, $$ຂຽນວຽກສຳຄັນທີ່ສຸດມື້ອື່ນກ່ອນຢຸດ$$, $$ຫຼຸດແສງໜ້າຈໍກ່ອນນອນເພື່ອປົກປ້ອງຄຸນນະພາບການນອນ$$],
    4, false, 34
  ),
  (
    $$track-your-time-to-find-leaks$$,
    $$Track your time for a week to find hidden leaks$$,
    $$ຕິດຕາມເວລາໜຶ່ງອາທິດເພື່ອຫາຈຸດເສຍເວລາທີ່ເຊື່ອງຢູ່$$,
    $$Most people are surprised by where their time actually goes once they measure it honestly.$$,
    $$ຄົນສ່ວນຫຼາຍແປກໃຈເມື່ອເຫັນວ່າເວລາຂອງຕົນໄປໃສແທ້ໆເມື່ອວັດແທກຢ່າງຊື່ສັດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Log activities in rough blocks$$, 'body', $$Every hour or two, jot down what you actually did — no need for perfect precision, just an honest rough log.$$),
      jsonb_build_object('heading', $$Look for the surprises$$, 'body', $$After a week, review the log and find what took more time than you expected — that's usually where the real opportunity is.$$),
      jsonb_build_object('heading', $$Change one thing based on the data$$, 'body', $$Don't overhaul everything — pick the single biggest leak found and address just that one thing next week.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກກິດຈະກຳເປັນຊ່ວງໆ$$, 'body', $$ທຸກໜຶ່ງ ຫຼືສອງຊົ່ວໂມງ ຂຽນສິ່ງທີ່ເຮັດແທ້ — ບໍ່ຕ້ອງແມ່ນຍຳ 100% ພຽງແຕ່ບັນທຶກຢ່າງຊື່ສັດ.$$),
      jsonb_build_object('heading', $$ຊອກຫາສິ່ງທີ່ໜ້າແປກໃຈ$$, 'body', $$ຫຼັງໜຶ່ງອາທິດ ທົບທວນບັນທຶກ ແລະ ຊອກຫາສິ່ງທີ່ໃຊ້ເວລາຫຼາຍກວ່າຄາດ — ນັ້ນມັກເປັນໂອກາດແທ້ຈິງ.$$),
      jsonb_build_object('heading', $$ປ່ຽນໜຶ່ງສິ່ງຕາມຂໍ້ມູນ$$, 'body', $$ບໍ່ຕ້ອງປ່ຽນທຸກຢ່າງ — ເລືອກຈຸດເສຍເວລາໃຫຍ່ທີ່ສຸດທີ່ພົບ ແລະ ແກ້ໄຂພຽງອັນນັ້ນອາທິດໜ້າ.$$)
    ),
    array[$$Log your activities honestly in rough blocks for a week$$, $$Look for where time went that surprised you$$, $$Change just one thing based on what the data shows$$],
    array[$$ບັນທຶກກິດຈະກຳຢ່າງຊື່ສັດເປັນຊ່ວງໆຕະຫຼອດອາທິດ$$, $$ຊອກຫາຈຸດທີ່ໃຊ້ເວລາໜ້າແປກໃຈ$$, $$ປ່ຽນພຽງໜຶ່ງສິ່ງຕາມຂໍ້ມູນທີ່ພົບ$$],
    4, false, 35
  ),
  (
    $$use-deadlines-parkinsons-law$$,
    $$Use deadlines to create urgency (Parkinson's Law)$$,
    $$ໃຊ້ກຳນົດເວລາສ້າງຄວາມຮີບດ່ວນ (Parkinson's Law)$$,
    $$Work expands to fill the time available — a shorter, real deadline often produces the same quality faster.$$,
    $$ວຽກຂະຫຍາຍໄປຕາມເວລາທີ່ມີ — ກຳນົດເວລາທີ່ສັ້ນລົງ ແລະ ຈິງ ມັກໃຫ້ຜົນງານຄຸນນະພາບເທົ່າເດີມແຕ່ໄວກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a shorter deadline than feels comfortable$$, 'body', $$If a task feels like it needs a week, try giving it three days — the tighter window often cuts unnecessary polishing.$$),
      jsonb_build_object('heading', $$Make the deadline real, not private$$, 'body', $$Tell someone else the deadline, or schedule a review meeting at that time — a deadline only you know is easy to quietly slide.$$),
      jsonb_build_object('heading', $$Watch for the trade-off$$, 'body', $$Shorter deadlines work for well-understood tasks — genuinely complex or high-stakes work still needs realistic time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງກຳນົດເວລາສັ້ນກວ່າທີ່ຮູ້ສຶກສະບາຍ$$, 'body', $$ຖ້າວຽກຮູ້ສຶກຄືຕ້ອງໃຊ້ໜຶ່ງອາທິດ ລອງໃຫ້ພຽງສາມມື້ — ຊ່ວງທີ່ແໜ້ນຂຶ້ນມັກຕັດການປັບແຕ່ງທີ່ບໍ່ຈຳເປັນ.$$),
      jsonb_build_object('heading', $$ເຮັດໃຫ້ກຳນົດເວລາເປັນຈິງ ບໍ່ແມ່ນຄວາມລັບ$$, 'body', $$ບອກຄົນອື່ນກ່ຽວກັບກຳນົດເວລາ ຫຼືນັດກອງປະຊຸມທົບທວນຕອນນັ້ນ — ກຳນົດເວລາທີ່ມີແຕ່ທ່ານຮູ້ ງ່າຍທີ່ຈະເລື່ອນອອກ.$$),
      jsonb_build_object('heading', $$ລະວັງຂໍ້ແລກປ່ຽນ$$, 'body', $$ກຳນົດເວລາສັ້ນເໝາະກັບວຽກທີ່ເຂົ້າໃຈດີແລ້ວ — ວຽກທີ່ຊັບຊ້ອນ ຫຼືສ່ຽງສູງແທ້ໆຍັງຕ້ອງການເວລາທີ່ເໝາະສົມ.$$)
    ),
    array[$$Try a shorter deadline than feels comfortable$$, $$Make deadlines real by telling someone else$$, $$Complex, high-stakes work still needs realistic time$$],
    array[$$ລອງກຳນົດເວລາສັ້ນກວ່າທີ່ຮູ້ສຶກສະບາຍ$$, $$ເຮັດໃຫ້ກຳນົດເວລາເປັນຈິງໂດຍບອກຄົນອື່ນ$$, $$ວຽກທີ່ຊັບຊ້ອນ ຫຼືສ່ຽງສູງຍັງຕ້ອງການເວລາທີ່ເໝາະສົມ$$],
    4, false, 36
  ),
  (
    $$design-a-distraction-free-workspace$$,
    $$Design a distraction-free workspace$$,
    $$ອອກແບບໂຕະເຮັດວຽກທີ່ບໍ່ມີສິ່ງລົບກວນ$$,
    $$Your environment shapes your focus more than willpower does — design it to make focus the easy default.$$,
    $$ສະພາບແວດລ້ອມກຳນົດຄວາມຈົດຈໍ່ຫຼາຍກວ່າຄວາມຕັ້ງໃຈ — ອອກແບບໃຫ້ຄວາມຈົດຈໍ່ເປັນທາງເລືອກງ່າຍທີ່ສຸດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Remove the phone from arm's reach$$, 'body', $$A phone visible on the desk pulls attention even when silent — put it in another room during focus blocks.$$),
      jsonb_build_object('heading', $$Signal "do not disturb" clearly$$, 'body', $$Headphones on, a closed door, or a simple sign tells others you're in focus mode without needing to explain each time.$$),
      jsonb_build_object('heading', $$Keep only the current task visible$$, 'body', $$Clear other papers, tabs, and materials unrelated to the task at hand — visual clutter is its own form of distraction.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເອົາໂທລະສັບອອກຈາກໄລຍະມື$$, 'body', $$ໂທລະສັບທີ່ເຫັນຢູ່ໂຕະ ດຶງຄວາມສົນໃຈແມ່ນແຕ່ຕອນປິດສຽງ — ເອົາໄປໄວ້ຫ້ອງອື່ນຕອນຊ່ວງຈົດຈໍ່.$$),
      jsonb_build_object('heading', $$ສົ່ງສັນຍານ "ຢ່າລົບກວນ" ໃຫ້ຊັດເຈນ$$, 'body', $$ໃສ່ຫູຟັງ, ປິດປະຕູ ຫຼືປ້າຍງ່າຍໆ ບອກຄົນອື່ນວ່າກຳລັງຈົດຈໍ່ ໂດຍບໍ່ຕ້ອງອະທິບາຍທຸກຄັ້ງ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເຫັນແຕ່ວຽກປັດຈຸບັນ$$, 'body', $$ເກັບເອກະສານ, ແທັບ ແລະ ວັດຖຸອື່ນທີ່ບໍ່ກ່ຽວກັບວຽກປັດຈຸບັນອອກໄປ — ຄວາມສັບສົນທາງສາຍຕາເອງກໍ່ເປັນສິ່ງລົບກວນ.$$)
    ),
    array[$$Move your phone out of arm's reach during focus time$$, $$Use a clear signal to show you're not to be disturbed$$, $$Keep only what's relevant to the current task visible$$],
    array[$$ຍ້າຍໂທລະສັບອອກຈາກໄລຍະມືຕອນຈົດຈໍ່$$, $$ໃຊ້ສັນຍານຊັດເຈນບອກວ່າຢ່າລົບກວນ$$, $$ໃຫ້ເຫັນແຕ່ສິ່ງທີ່ກ່ຽວຂ້ອງກັບວຽກປັດຈຸບັນ$$],
    4, false, 37
  ),
  (
    $$take-effective-breaks$$,
    $$Take effective breaks that actually restore focus$$,
    $$ພັກຜ່ອນຢ່າງມີປະສິດທິພາບເພື່ອຟື້ນຟູຄວາມຈົດຈໍ່ແທ້ໆ$$,
    $$Not all breaks are equal — some restore energy, others just delay the same tiredness.$$,
    $$ບໍ່ແມ່ນທຸກການພັກເທົ່າກັນ — ບາງອັນຟື້ນຟູພະລັງງານ ບາງອັນພຽງແຕ່ຍືດຄວາມເມື່ອຍອອກໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Move your body$$, 'body', $$A short walk or stretch restores focus far better than scrolling a phone, which keeps the same kind of attention engaged.$$),
      jsonb_build_object('heading', $$Get away from the screen$$, 'body', $$Looking at something 20 feet away for 20 seconds every 20 minutes rests your eyes and gives your mind a real reset.$$),
      jsonb_build_object('heading', $$Match break length to work length$$, 'body', $$Short work sprints need only short breaks; longer, harder blocks of deep work deserve a proportionally longer recovery break.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂະຫຍັບຮ່າງກາຍ$$, 'body', $$ການຍ່າງສັ້ນໆ ຫຼືຢືດຕົວ ຟື້ນຟູຄວາມຈົດຈໍ່ໄດ້ດີກວ່າການເລື່ອນໂທລະສັບ ເຊິ່ງຍັງໃຊ້ຄວາມສົນໃຈແບບດຽວກັນຢູ່.$$),
      jsonb_build_object('heading', $$ອອກຫ່າງຈາກໜ້າຈໍ$$, 'body', $$ເບິ່ງສິ່ງທີ່ຢູ່ໄກປະມານ 6 ແມັດ ເປັນເວລາ 20 ວິນາທີ ທຸກ 20 ນາທີ ພັກຕາ ແລະ ໃຫ້ຫົວໃຈໄດ້ຣີເຊັດແທ້.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມຍາວການພັກກົງກັບຄວາມຍາວການເຮັດວຽກ$$, 'body', $$ຊ່ວງເຮັດວຽກສັ້ນຕ້ອງການພັກສັ້ນ; ຊ່ວງວຽກເລິກທີ່ຍາວ ແລະ ໜັກກວ່າ ຄວນມີການພັກຟື້ນທີ່ຍາວຂຶ້ນຕາມສັດສ່ວນ.$$)
    ),
    array[$$Move your body instead of scrolling during breaks$$, $$Look far away from the screen every 20 minutes$$, $$Match break length proportionally to work length$$],
    array[$$ຂະຫຍັບຮ່າງກາຍແທນການເລື່ອນໂທລະສັບຕອນພັກ$$, $$ເບິ່ງໄກຈາກໜ້າຈໍທຸກ 20 ນາທີ$$, $$ໃຫ້ຄວາມຍາວການພັກກົງກັບຄວາມຍາວການເຮັດວຽກ$$],
    3, false, 38
  ),
  (
    $$delegate-tasks-effectively$$,
    $$Delegate tasks effectively instead of doing everything yourself$$,
    $$ມອບໝາຍວຽກຢ່າງມີປະສິດທິພາບ ແທນທີ່ຈະເຮັດເອງທຸກຢ່າງ$$,
    $$Good delegation gives context and outcome, then trusts the person to find their own path there.$$,
    $$ການມອບໝາຍທີ່ດີໃຫ້ບໍລິບົດ ແລະ ຜົນລັບ ແລ້ວເຊື່ອໃຈໃຫ້ຄົນນັ້ນຫາທາງໄປເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give the outcome, not just steps$$, 'body', $$Explain what success looks like and why it matters, rather than dictating every single step — this builds capability, not just compliance.$$),
      jsonb_build_object('heading', $$Match the task to the person's level$$, 'body', $$Give more autonomy to someone experienced, and more structure and check-ins to someone newer to the task.$$),
      jsonb_build_object('heading', $$Resist taking it back at the first bump$$, 'body', $$Let the person work through small problems themselves — taking a task back at the first sign of struggle defeats the purpose of delegating.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຜົນລັບ ບໍ່ແມ່ນແຕ່ຂັ້ນຕອນ$$, 'body', $$ອະທິບາຍວ່າຄວາມສຳເລັດເປັນແນວໃດ ແລະ ເປັນຫຍັງສຳຄັນ ແທນທີ່ຈະສັ່ງທຸກຂັ້ນຕອນ — ນີ້ສ້າງຄວາມສາມາດ ບໍ່ແມ່ນແຕ່ການເຊື່ອຟັງ.$$),
      jsonb_build_object('heading', $$ໃຫ້ວຽກກົງກັບລະດັບຄົນ$$, 'body', $$ໃຫ້ອິດສະຫຼະຫຼາຍຂຶ້ນກັບຄົນທີ່ມີປະສົບການ ແລະ ໃຫ້ໂຄງສ້າງ ແລະ ຕິດຕາມຫຼາຍຂຶ້ນກັບຄົນທີ່ຍັງໃໝ່ຕໍ່ວຽກນັ້ນ.$$),
      jsonb_build_object('heading', $$ຢ່າຮີບເອົາຄືນຕັ້ງແຕ່ບັນຫາທຳອິດ$$, 'body', $$ໃຫ້ຄົນນັ້ນແກ້ບັນຫານ້ອຍໆເອງ — ການເອົາວຽກຄືນທັນທີເມື່ອເຫັນຄວາມຫຍຸ້ງຍາກ ທຳລາຍຈຸດປະສົງຂອງການມອບໝາຍ.$$)
    ),
    array[$$Give the desired outcome, not a rigid step-by-step script$$, $$Match the amount of structure to the person's experience$$, $$Let them work through small problems instead of taking it back$$],
    array[$$ໃຫ້ຜົນລັບທີ່ຕ້ອງການ ບໍ່ແມ່ນຂັ້ນຕອນທີ່ຕາຍຕົວ$$, $$ໃຫ້ໂຄງສ້າງກົງກັບປະສົບການຂອງຄົນ$$, $$ໃຫ້ເຂົາແກ້ບັນຫານ້ອຍໆເອງແທນການເອົາຄືນ$$],
    5, false, 39
  ),
  (
    $$use-templates-for-repetitive-work$$,
    $$Use templates to speed up repetitive work$$,
    $$ໃຊ້ແບບຟອມເພື່ອເຮັດວຽກທີ່ຊ້ຳໆໄດ້ໄວຂຶ້ນ$$,
    $$If you've written something similar twice, the third time deserves a reusable template.$$,
    $$ຖ້າໄດ້ຂຽນສິ່ງທີ່ຄ້າຍກັນສອງຄັ້ງແລ້ວ ຄັ້ງທີ່ສາມຄວນມີແບບຟອມທີ່ໃຊ້ຊ້ຳໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Save your best version as the template$$, 'body', $$The next time you write a strong version of a recurring document, save a cleaned-up copy specifically as a reusable template.$$),
      jsonb_build_object('heading', $$Mark the parts that always change$$, 'body', $$Use clear placeholders like [CLIENT NAME] or [DATE] so filling in a template is fast and hard to mess up.$$),
      jsonb_build_object('heading', $$Keep templates in one findable place$$, 'body', $$A folder or note titled "Templates" that you actually remember to check saves far more time than scattered old files.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກສະບັບທີ່ດີທີ່ສຸດເປັນແບບຟອມ$$, 'body', $$ຄັ້ງຕໍ່ໄປທີ່ຂຽນເອກະສານທີ່ຊ້ຳໆໄດ້ດີ ໃຫ້ບັນທຶກສະບັບທີ່ຈັດລຽບຮ້ອຍໄວ້ເປັນແບບຟອມທີ່ໃຊ້ຊ້ຳໄດ້.$$),
      jsonb_build_object('heading', $$ໝາຍສ່ວນທີ່ປ່ຽນແປງທຸກຄັ້ງ$$, 'body', $$ໃຊ້ຕົວແທນທີ່ຊັດເຈນເຊັ່ນ [ຊື່ລູກຄ້າ] ຫຼື [ວັນທີ] ເພື່ອໃຫ້ຕື່ມແບບຟອມໄດ້ໄວ ແລະ ຜິດພາດຍາກ.$$),
      jsonb_build_object('heading', $$ເກັບແບບຟອມໄວ້ບ່ອນດຽວທີ່ຫາງ່າຍ$$, 'body', $$ໂຟນເດີ ຫຼືບັນທຶກຊື່ "ແບບຟອມ" ທີ່ຈື່ໄດ້ວ່າຈະໄປເບິ່ງ ປະຢັດເວລາໄດ້ຫຼາຍກວ່າໄຟລ໌ເກົ່າທີ່ກະຈັດກະຈາຍ.$$)
    ),
    array[$$Save your strongest version of recurring work as a template$$, $$Mark the parts that always change with clear placeholders$$, $$Keep all templates in one place you'll remember to check$$],
    array[$$ບັນທຶກສະບັບທີ່ດີທີ່ສຸດຂອງວຽກທີ່ຊ້ຳໆເປັນແບບຟອມ$$, $$ໝາຍສ່ວນທີ່ປ່ຽນແປງທຸກຄັ້ງດ້ວຍຕົວແທນຊັດເຈນ$$, $$ເກັບແບບຟອມທັງໝົດໄວ້ບ່ອນດຽວທີ່ຈື່ໄດ້$$],
    3, false, 40
  ),
  (
    $$handle-interruptions-gracefully$$,
    $$Handle interruptions gracefully without losing your thread$$,
    $$ຮັບມືການລົບກວນຢ່າງມີສະຕິ ໂດຍບໍ່ເສຍຄວາມຄິດ$$,
    $$A quick note of where you were makes it much easier to resume after an interruption.$$,
    $$ບັນທຶກສັ້ນໆວ່າຢູ່ຈຸດໃດ ຊ່ວຍໃຫ້ກັບຄືນມາເຮັດຕໍ່ໄດ້ງ່າຍຂຶ້ນຫຼັງຖືກລົບກວນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Jot down your exact next step first$$, 'body', $$Before addressing the interruption, write one line about exactly what you were about to do — this is the bridge back to focus.$$),
      jsonb_build_object('heading', $$Triage before reacting$$, 'body', $$Ask "does this need my attention right this second?" — most interruptions can wait for your next natural break.$$),
      jsonb_build_object('heading', $$Batch small interruptions when possible$$, 'body', $$For non-urgent questions from colleagues, suggest a set check-in time instead of responding to each one the instant it arrives.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນຂັ້ນຕອນຕໍ່ໄປແທ້ໆກ່ອນ$$, 'body', $$ກ່ອນຈັດການສິ່ງລົບກວນ ໃຫ້ຂຽນໜຶ່ງແຖວວ່າກຳລັງຈະເຮັດຫຍັງແທ້ — ນີ້ຄືຂົວທີ່ພາກັບຄືນສູ່ຄວາມຈົດຈໍ່.$$),
      jsonb_build_object('heading', $$ຄັດແຍກກ່ອນຕອບໂຕ້$$, 'body', $$ຖາມວ່າ "ອັນນີ້ຕ້ອງການຄວາມສົນໃຈຂ້ອຍທັນທີແທ້ບໍ່?" — ການລົບກວນສ່ວນຫຼາຍລໍຖ້າໄດ້ຮອດການພັກຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ຈັດກຸ່ມການລົບກວນນ້ອຍໆເມື່ອເປັນໄປໄດ້$$, 'body', $$ສຳລັບຄຳຖາມທີ່ບໍ່ດ່ວນຈາກເພື່ອນຮ່ວມງານ ໃຫ້ສະເໜີເວລານັດພົບແທນການຕອບທັນທີທຸກຄັ້ງທີ່ມາ.$$)
    ),
    array[$$Note your exact next step before addressing an interruption$$, $$Ask whether it truly needs attention right now$$, $$Batch non-urgent interruptions into a set check-in time$$],
    array[$$ບັນທຶກຂັ້ນຕອນຕໍ່ໄປແທ້ໆກ່ອນຈັດການສິ່ງລົບກວນ$$, $$ຖາມວ່າແທ້ຈິງແລ້ວຕ້ອງການຄວາມສົນໃຈຕອນນີ້ບໍ່$$, $$ຈັດກຸ່ມການລົບກວນທີ່ບໍ່ດ່ວນເປັນເວລານັດພົບ$$],
    4, false, 41
  ),
  (
    $$set-smart-goals$$,
    $$Set SMART goals you can actually track$$,
    $$ຕັ້ງເປົ້າໝາຍ SMART ທີ່ຕິດຕາມໄດ້ຈິງ$$,
    $$A goal that's specific and measurable is far easier to act on than a vague hope.$$,
    $$ເປົ້າໝາຍທີ່ສະເພາະ ແລະ ວັດແທກໄດ້ ລົງມືເຮັດງ່າຍກວ່າຄວາມຫວັງທີ່ບໍ່ຊັດເຈນຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Make it Specific and Measurable$$, 'body', $$"Get fit" becomes "run 5km three times a week" — a number and a clear action you can check off.$$),
      jsonb_build_object('heading', $$Check it's Achievable and Relevant$$, 'body', $$Set a goal that stretches you but is realistically possible given your actual time and resources, and connects to what you truly care about.$$),
      jsonb_build_object('heading', $$Add a Time-bound deadline$$, 'body', $$"By the end of this month" turns an open-ended intention into something with real momentum and a checkpoint.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ສະເພາະ ແລະ ວັດແທກໄດ້$$, 'body', $$"ອອກກຳລັງກາຍ" ປ່ຽນເປັນ "ແລ່ນ 5 ກິໂລ 3 ຄັ້ງຕໍ່ອາທິດ" — ຕົວເລກ ແລະ ການກະທຳຊັດເຈນທີ່ຕິກໄດ້.$$),
      jsonb_build_object('heading', $$ກວດວ່າເຮັດໄດ້ ແລະ ກ່ຽວຂ້ອງ$$, 'body', $$ຕັ້ງເປົ້າໝາຍທີ່ທ້າທາຍແຕ່ເປັນໄປໄດ້ຈິງຕາມເວລາ ແລະ ຊັບພະຍາກອນທີ່ມີ ແລະ ເຊື່ອມກັບສິ່ງທີ່ທ່ານໃສ່ໃຈແທ້.$$),
      jsonb_build_object('heading', $$ເພີ່ມກຳນົດເວລາ$$, 'body', $$"ພາຍໃນທ້າຍເດືອນນີ້" ປ່ຽນຄວາມຕັ້ງໃຈທີ່ບໍ່ມີກຳນົດ ໃຫ້ມີແຮງຂັບເຄື່ອນ ແລະ ຈຸດກວດຄວາມຄືບໜ້າຈິງ.$$)
    ),
    array[$$Make goals specific with a clear, measurable number$$, $$Check the goal is realistically achievable and relevant to you$$, $$Add a real deadline to create momentum$$],
    array[$$ໃຫ້ເປົ້າໝາຍສະເພາະດ້ວຍຕົວເລກທີ່ວັດແທກໄດ້$$, $$ກວດວ່າເປົ້າໝາຍເຮັດໄດ້ຈິງ ແລະ ກ່ຽວຂ້ອງກັບທ່ານ$$, $$ເພີ່ມກຳນົດເວລາຈິງເພື່ອສ້າງແຮງຂັບເຄື່ອນ$$],
    4, false, 42
  ),
  (
    $$overcome-procrastination-five-minute-rule$$,
    $$Overcome procrastination with the five-minute rule$$,
    $$ເອົາຊະນະການລໍຊັກຊ້າດ້ວຍກົດ 5 ນາທີ$$,
    $$Commit to just five minutes on a dreaded task — starting is usually the hardest part.$$,
    $$ໝັ້ນສັນຍາເຮັດພຽງ 5 ນາທີກັບວຽກທີ່ໜັກໃຈ — ການເລີ່ມມັກເປັນສ່ວນທີ່ຍາກທີ່ສຸດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Promise only five minutes$$, 'body', $$Tell yourself you can stop after five minutes, no guilt — this small promise is much easier to keep than "finish the whole thing."$$),
      jsonb_build_object('heading', $$Notice momentum usually kicks in$$, 'body', $$Once started, the mental barrier that caused avoidance often disappears, and continuing becomes easier than the five minutes were.$$),
      jsonb_build_object('heading', $$It's fine if you truly stop after five$$, 'body', $$Sometimes five minutes really is all you get done — that's still real progress, and progress compounds over days.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັນຍາພຽງ 5 ນາທີ$$, 'body', $$ບອກຕົນເອງວ່າຫຼັງ 5 ນາທີຢຸດໄດ້ ບໍ່ຮູ້ສຶກຜິດ — ຄຳສັນຍານ້ອຍໆນີ້ຮັກສາໄດ້ງ່າຍກວ່າ "ເຮັດໃຫ້ຈົບທັງໝົດ."$$),
      jsonb_build_object('heading', $$ສັງເກດວ່າແຮງຂັບເຄື່ອນມັກເກີດຂຶ້ນ$$, 'body', $$ເມື່ອເລີ່ມແລ້ວ ອຸປະສັກທາງໃຈທີ່ເຮັດໃຫ້ຫຼີກລ້ຽງມັກຫາຍໄປ ແລະ ການສືບຕໍ່ງ່າຍກວ່າ 5 ນາທີທຳອິດ.$$),
      jsonb_build_object('heading', $$ຢຸດຫຼັງ 5 ນາທີກໍ່ໂອເຄ$$, 'body', $$ບາງຄັ້ງ 5 ນາທີເປັນທັງໝົດທີ່ເຮັດໄດ້ — ນັ້ນຍັງເປັນຄວາມຄືບໜ້າຈິງ ແລະ ຄວາມຄືບໜ້າສະສົມໄດ້ຕາມມື້.$$)
    ),
    array[$$Promise yourself just five minutes on the dreaded task$$, $$Notice that momentum often carries you past that point$$, $$It's fine if five minutes is genuinely all you do that day$$],
    array[$$ສັນຍາຕົນເອງພຽງ 5 ນາທີກັບວຽກທີ່ໜັກໃຈ$$, $$ສັງເກດວ່າແຮງຂັບເຄື່ອນມັກພາໄປໄກກວ່າຈຸດນັ້ນ$$, $$ຖ້າ 5 ນາທີເປັນທັງໝົດທີ່ເຮັດໄດ້ມື້ນັ້ນກໍ່ໂອເຄ$$],
    3, false, 43
  ),
  (
    $$build-momentum-with-small-wins$$,
    $$Build momentum with small, visible wins$$,
    $$ສ້າງແຮງຂັບເຄື່ອນດ້ວຍໄຊຊະນະນ້ອຍໆທີ່ເຫັນໄດ້$$,
    $$Completing small tasks first creates a sense of forward motion that carries into harder work.$$,
    $$ການເຮັດວຽກນ້ອຍໆໃຫ້ສຳເລັດກ່ອນ ສ້າງຄວາມຮູ້ສຶກກ້າວໜ້າທີ່ນຳໄປສູ່ວຽກທີ່ຍາກກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with one truly easy task$$, 'body', $$On a slow or overwhelming day, do one quick, easy task first just to feel the click of "done" before tackling harder things.$$),
      jsonb_build_object('heading', $$Make completion visible$$, 'body', $$Crossing an item off a physical or digital list gives a small, real satisfaction that compounds throughout the day.$$),
      jsonb_build_object('heading', $$Stack wins toward the hard task$$, 'body', $$Order your day so two or three small wins lead directly into your biggest task, using the momentum you've already built.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍວຽກງ່າຍແທ້ໆອັນໜຶ່ງ$$, 'body', $$ໃນມື້ທີ່ຊ້າ ຫຼືຮູ້ສຶກໜັກໃຈ ໃຫ້ເຮັດວຽກງ່າຍ ແລະ ໄວອັນໜຶ່ງກ່ອນ ເພື່ອຮູ້ສຶກ "ສຳເລັດ" ກ່ອນລົງມືວຽກທີ່ຍາກກວ່າ.$$),
      jsonb_build_object('heading', $$ເຮັດໃຫ້ຄວາມສຳເລັດເຫັນໄດ້$$, 'body', $$ການຂີດຂ້າລາຍການອອກຈາກລາຍການແທ້ ຫຼືດິຈິຕອນ ໃຫ້ຄວາມພໍໃຈນ້ອຍໆທີ່ສະສົມຕະຫຼອດມື້.$$),
      jsonb_build_object('heading', $$ຊ້ອນໄຊຊະນະໄປສູ່ວຽກຍາກ$$, 'body', $$ຈັດລຳດັບມື້ໃຫ້ໄຊຊະນະນ້ອຍ 2-3 ອັນນຳໄປສູ່ວຽກໃຫຍ່ທີ່ສຸດ ໂດຍໃຊ້ແຮງຂັບເຄື່ອນທີ່ສ້າງໄວ້ແລ້ວ.$$)
    ),
    array[$$Start slow days with one truly easy, quick task$$, $$Make completion visible by crossing items off a list$$, $$Order small wins to build momentum into the hardest task$$],
    array[$$ເລີ່ມມື້ທີ່ຊ້າດ້ວຍວຽກງ່າຍ ແລະ ໄວອັນໜຶ່ງ$$, $$ເຮັດໃຫ້ຄວາມສຳເລັດເຫັນໄດ້ດ້ວຍການຂີດຂ້າອອກຈາກລາຍການ$$, $$ຈັດລຳດັບໄຊຊະນະນ້ອຍໆເພື່ອສ້າງແຮງໄປສູ່ວຽກທີ່ຍາກທີ່ສຸດ$$],
    3, false, 44
  ),
  (
    $$build-a-second-brain-note-system$$,
    $$Build a "second brain" note system for tasks and ideas$$,
    $$ສ້າງລະບົບບັນທຶກ "ສະໝອງທີສອງ" ສຳລັບວຽກ ແລະ ແນວຄິດ$$,
    $$Writing tasks and ideas down frees your mind from holding them, so you can focus on the task at hand.$$,
    $$ການຂຽນວຽກ ແລະ ແນວຄິດລົງ ປົດປ່ອຍຫົວໃຈຈາກການຈື່ ເພື່ອຈົດຈໍ່ກັບວຽກຕົງໜ້າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Capture everything in one inbox$$, 'body', $$Any random task or idea goes into one single trusted place first — a notes app or notebook — not scattered across sticky notes and memory.$$),
      jsonb_build_object('heading', $$Sort it during your weekly review$$, 'body', $$Once a week, move captured items into proper categories or your task list — the inbox is a landing zone, not a permanent home.$$),
      jsonb_build_object('heading', $$Trust the system so your mind can let go$$, 'body', $$Once you trust that nothing gets lost, your mind stops quietly rehearsing tasks in the background — that mental quiet is the real payoff.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກທຸກຢ່າງໃນກ່ອງດຽວ$$, 'body', $$ວຽກ ຫຼືແນວຄິດໃດກໍ່ຕາມ ໃຫ້ໃສ່ບ່ອນດຽວທີ່ໜ້າເຊື່ອຖືກ່ອນ — ແອັບບັນທຶກ ຫຼືປຶ້ມ — ບໍ່ແມ່ນກະຈັດກະຈາຍໃນເຈ້ຍໜຽວ ຫຼືຄວາມຈຳ.$$),
      jsonb_build_object('heading', $$ຈັດລະບຽບໃນການທົບທວນປະຈຳອາທິດ$$, 'body', $$ອາທິດລະຄັ້ງ ໃຫ້ຍ້າຍລາຍການທີ່ບັນທຶກໄວ້ໄປໝວດໝູ່ ຫຼືລາຍການວຽກທີ່ຖືກຕ້ອງ — ກ່ອງບັນທຶກເປັນຈຸດພັກຊົ່ວຄາວ ບໍ່ແມ່ນບ້ານຖາວອນ.$$),
      jsonb_build_object('heading', $$ໄວ້ວາງໃຈລະບົບເພື່ອໃຫ້ຫົວໃຈປ່ອຍວາງ$$, 'body', $$ເມື່ອເຊື່ອວ່າບໍ່ມີຫຍັງເສຍໄປ ຫົວໃຈຈະຢຸດຄິດເຖິງວຽກຊ້ຳໆໃນໃຈ — ຄວາມງຽບທາງໃຈນີ້ຄືຜົນປະໂຫຍດແທ້ຈິງ.$$)
    ),
    array[$$Capture every task and idea in one trusted inbox$$, $$Sort captured items into proper places weekly$$, $$Trust the system so your mind can stop holding onto tasks$$],
    array[$$ບັນທຶກທຸກວຽກ ແລະ ແນວຄິດໃນກ່ອງດຽວທີ່ໜ້າເຊື່ອຖື$$, $$ຈັດລະບຽບລາຍການທີ່ບັນທຶກໄວ້ທຸກອາທິດ$$, $$ໄວ້ວາງໃຈລະບົບເພື່ອໃຫ້ຫົວໃຈຢຸດຄິດເຖິງວຽກຄ້າງ$$],
    5, false, 45
  ),
  (
    $$manage-energy-not-just-time$$,
    $$Manage your energy, not just your time$$,
    $$ຈັດການພະລັງງານ ບໍ່ແມ່ນແຕ່ເວລາ$$,
    $$The same hour can be highly productive or nearly useless depending on your energy level.$$,
    $$ຊົ່ວໂມງດຽວກັນອາດມີປະສິດທິພາບສູງ ຫຼືເກືອບບໍ່ມີປະໂຫຍດ ຂຶ້ນກັບລະດັບພະລັງງານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Notice your natural energy pattern$$, 'body', $$Track for a few days when you feel sharpest and when you feel foggiest — most people have a fairly consistent daily pattern.$$),
      jsonb_build_object('heading', $$Match task difficulty to energy level$$, 'body', $$Save your hardest, most creative work for peak energy hours, and use low-energy periods for simple, routine tasks.$$),
      jsonb_build_object('heading', $$Protect real recovery, not just rest$$, 'body', $$Sleep, movement, and time away from screens rebuild energy — passive scrolling during downtime often doesn't.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັງເກດຮູບແບບພະລັງງານທຳມະຊາດ$$, 'body', $$ຕິດຕາມສອງສາມມື້ວ່າຮູ້ສຶກແຈ່ມໃສ ແລະ ໝົວທີ່ສຸດເມື່ອໃດ — ຄົນສ່ວນຫຼາຍມີຮູບແບບປະຈຳວັນທີ່ຄ່ອນຂ້າງຄົງທີ່.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມຍາກຂອງວຽກກົງກັບລະດັບພະລັງງານ$$, 'body', $$ເກັບວຽກທີ່ຍາກ ແລະ ຕ້ອງໃຊ້ຄວາມຄິດສ້າງສັນທີ່ສຸດໄວ້ຊົ່ວໂມງພະລັງງານສູງສຸດ ແລະ ໃຊ້ຊ່ວງພະລັງງານຕ່ຳສຳລັບວຽກງ່າຍ.$$),
      jsonb_build_object('heading', $$ປົກປ້ອງການຟື້ນຟູແທ້ ບໍ່ແມ່ນແຕ່ການພັກ$$, 'body', $$ການນອນ, ການເຄື່ອນໄຫວ ແລະ ເວລາຫ່າງຈາກໜ້າຈໍ ຟື້ນຟູພະລັງງານ — ການເລື່ອນໂທລະສັບແບບບໍ່ຕັ້ງໃຈຕອນພັກ ມັກບໍ່ຟື້ນຟູແທ້.$$)
    ),
    array[$$Track when your energy is naturally highest and lowest$$, $$Match your hardest tasks to your peak energy hours$$, $$Protect real recovery activities, not just passive rest$$],
    array[$$ຕິດຕາມວ່າພະລັງງານສູງ ແລະ ຕ່ຳສຸດເມື່ອໃດ$$, $$ໃຫ້ວຽກທີ່ຍາກທີ່ສຸດກົງກັບຊົ່ວໂມງພະລັງງານສູງສຸດ$$, $$ປົກປ້ອງກິດຈະກຳຟື້ນຟູແທ້ ບໍ່ແມ່ນແຕ່ການພັກແບບບໍ່ຕັ້ງໃຈ$$],
    5, false, 46
  ),
  (
    $$avoid-multitasking-during-meetings$$,
    $$Avoid multitasking during meetings$$,
    $$ຫຼີກລ້ຽງການເຮັດຫຼາຍຢ່າງພ້ອມກັນໃນກອງປະຊຸມ$$,
    $$Splitting attention in a meeting makes it run longer and produces worse decisions for everyone.$$,
    $$ການແບ່ງຄວາມສົນໃຈໃນກອງປະຊຸມ ເຮັດໃຫ້ໃຊ້ເວລາດົນຂຶ້ນ ແລະ ໄດ້ການຕັດສິນໃຈທີ່ບໍ່ດີສຳລັບທຸກຄົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Close unrelated tabs before joining$$, 'body', $$Close email and chat windows before a meeting starts — their notifications are the biggest pull toward divided attention.$$),
      jsonb_build_object('heading', $$If you must multitask, say so$$, 'body', $$If you genuinely need to handle something urgent, tell the group honestly rather than silently splitting attention and missing context.$$),
      jsonb_build_object('heading', $$Take notes to stay engaged$$, 'body', $$Actively taking notes keeps your attention on the discussion and gives you something useful to review afterward.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປິດແທັບທີ່ບໍ່ກ່ຽວຂ້ອງກ່ອນເຂົ້າຮ່ວມ$$, 'body', $$ປິດອີເມວ ແລະ ໜ້າຕ່າງແຊັດກ່ອນກອງປະຊຸມເລີ່ມ — ການແຈ້ງເຕືອນຂອງພວກມັນເປັນສິ່ງດຶງດູດຄວາມສົນໃຈໃຫ້ແບ່ງແຍກຫຼາຍທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ຖ້າຕ້ອງເຮັດຫຼາຍຢ່າງແທ້ ໃຫ້ບອກ$$, 'body', $$ຖ້າຕ້ອງຈັດການເລື່ອງດ່ວນແທ້ ໃຫ້ບອກກຸ່ມຢ່າງຊື່ສັດ ແທນທີ່ຈະແບ່ງຄວາມສົນໃຈແບບງຽບໆ ແລະ ພາດບໍລິບົດ.$$),
      jsonb_build_object('heading', $$ຈົດບັນທຶກເພື່ອຮັກສາການມີສ່ວນຮ່ວມ$$, 'body', $$ການຈົດບັນທຶກຢ່າງຕັ້ງໃຈ ຮັກສາຄວາມສົນໃຈໄວ້ກັບການສົນທະນາ ແລະ ໃຫ້ສິ່ງທີ່ເປັນປະໂຫຍດໄວ້ທົບທວນພາຍຫຼັງ.$$)
    ),
    array[$$Close unrelated tabs and notifications before meetings$$, $$Say so honestly if you truly must multitask$$, $$Take notes to stay actively engaged in the discussion$$],
    array[$$ປິດແທັບ ແລະ ການແຈ້ງເຕືອນທີ່ບໍ່ກ່ຽວຂ້ອງກ່ອນກອງປະຊຸມ$$, $$ບອກຢ່າງຊື່ສັດຖ້າຕ້ອງເຮັດຫຼາຍຢ່າງແທ້$$, $$ຈົດບັນທຶກເພື່ອຮັກສາການມີສ່ວນຮ່ວມຢ່າງຕັ້ງໃຈ$$],
    3, false, 47
  ),
  (
    $$automate-repetitive-digital-tasks$$,
    $$Automate repetitive digital tasks$$,
    $$ເຮັດໃຫ້ວຽກດິຈິຕອນທີ່ຊ້ຳໆເປັນອັດຕະໂນມັດ$$,
    $$Time spent setting up a simple automation once often pays back within a few weeks.$$,
    $$ເວລາທີ່ໃຊ້ຕັ້ງຄ່າອັດຕະໂນມັດງ່າຍໆຄັ້ງດຽວ ມັກຄຸ້ມຄ່າພາຍໃນສອງສາມອາທິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Spot the repeated three-click pattern$$, 'body', $$Notice tasks you do the same way, in the same order, multiple times a week — these are the best automation candidates.$$),
      jsonb_build_object('heading', $$Start with simple built-in tools$$, 'body', $$Email filters, calendar auto-scheduling, and phone shortcuts often already exist in apps you already use — no coding needed.$$),
      jsonb_build_object('heading', $$Check automations still work periodically$$, 'body', $$Apps update and rules can break silently — glance at your automations every couple of months to confirm they're still doing what you expect.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊອກຫາຮູບແບບການຄລິກຊ້ຳ$$, 'body', $$ສັງເກດວຽກທີ່ເຮັດແບບດຽວກັນ, ລຳດັບດຽວກັນ ຫຼາຍຄັ້ງຕໍ່ອາທິດ — ນີ້ຄືຕົວແທນທີ່ດີທີ່ສຸດສຳລັບການເຮັດອັດຕະໂນມັດ.$$),
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍເຄື່ອງມືມີໃນຕົວງ່າຍໆ$$, 'body', $$ຕົວກອງອີເມວ, ການນັດໝາຍອັດຕະໂນມັດ ແລະ ທາງລັດໂທລະສັບ ມັກມີຢູ່ແລ້ວໃນແອັບທີ່ໃຊ້ຢູ່ — ບໍ່ຕ້ອງຂຽນໂຄ້ດ.$$),
      jsonb_build_object('heading', $$ກວດເບິ່ງວ່າອັດຕະໂນມັດຍັງເຮັດວຽກເປັນລະຍະ$$, 'body', $$ແອັບອັບເດດ ແລະ ກົດອາດເສຍໄປແບບງຽບໆ — ກວດເບິ່ງອັດຕະໂນມັດຂອງທ່ານທຸກສອງສາມເດືອນ ເພື່ອຢືນຢັນວ່າຍັງເຮັດວຽກຕາມທີ່ຄາດ.$$)
    ),
    array[$$Spot tasks you repeat the same way multiple times a week$$, $$Start with simple built-in tools before anything complex$$, $$Check periodically that automations still work correctly$$],
    array[$$ຊອກຫາວຽກທີ່ເຮັດແບບດຽວກັນຫຼາຍຄັ້ງຕໍ່ອາທິດ$$, $$ເລີ່ມດ້ວຍເຄື່ອງມືມີໃນຕົວກ່ອນສິ່ງທີ່ຊັບຊ້ອນ$$, $$ກວດເປັນລະຍະວ່າອັດຕະໂນມັດຍັງເຮັດວຽກຖືກຕ້ອງ$$],
    4, false, 48
  ),
  (
    $$set-boundaries-with-notifications$$,
    $$Set firm boundaries with phone notifications$$,
    $$ຕັ້ງຂອບເຂດທີ່ໜັກແໜ້ນກັບການແຈ້ງເຕືອນໂທລະສັບ$$,
    $$Most notifications are not actually urgent — turning most of them off protects long stretches of focus.$$,
    $$ການແຈ້ງເຕືອນສ່ວນຫຼາຍບໍ່ໄດ້ດ່ວນແທ້ — ການປິດສ່ວນຫຼາຍປົກປ້ອງຊ່ວງເວລາຈົດຈໍ່ຍາວໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Audit what actually deserves a ping$$, 'body', $$Go through your notification settings and turn off everything except messages from real people — most app alerts can wait.$$),
      jsonb_build_object('heading', $$Use scheduled do-not-disturb$$, 'body', $$Set automatic quiet hours for focus blocks and sleep — a schedule you set once protects you without needing daily willpower.$$),
      jsonb_build_object('heading', $$Let people know how to reach you urgently$$, 'body', $$Tell close contacts a way to reach you for a true emergency, so turning off notifications doesn't create real anxiety.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດວ່າຫຍັງຄວນມີສຽງແຈ້ງເຕືອນແທ້$$, 'body', $$ກວດການຕັ້ງຄ່າແຈ້ງເຕືອນ ແລະ ປິດທຸກຢ່າງນອກຈາກຂໍ້ຄວາມຈາກຄົນຈິງ — ການແຈ້ງເຕືອນຈາກແອັບສ່ວນຫຼາຍລໍຖ້າໄດ້.$$),
      jsonb_build_object('heading', $$ໃຊ້ໂໝດຢ່າລົບກວນຕາມກຳນົດເວລາ$$, 'body', $$ຕັ້ງຊົ່ວໂມງງຽບອັດຕະໂນມັດສຳລັບການຈົດຈໍ່ ແລະ ການນອນ — ຕາຕະລາງທີ່ຕັ້ງຄັ້ງດຽວ ປົກປ້ອງໄດ້ໂດຍບໍ່ຕ້ອງໃຊ້ຄວາມຕັ້ງໃຈທຸກມື້.$$),
      jsonb_build_object('heading', $$ບອກຄົນໃກ້ຊິດວິທີຕິດຕໍ່ດ່ວນ$$, 'body', $$ບອກຄົນສະໜິດວິທີຕິດຕໍ່ໃນກໍລະນີສຸກເສີນແທ້ ເພື່ອບໍ່ໃຫ້ການປິດແຈ້ງເຕືອນສ້າງຄວາມກັງວົນຈິງ.$$)
    ),
    array[$$Turn off notifications for everything but real people$$, $$Set automatic quiet hours instead of relying on willpower$$, $$Give close contacts a way to reach you for true emergencies$$],
    array[$$ປິດການແຈ້ງເຕືອນທຸກຢ່າງນອກຈາກຂໍ້ຄວາມຈາກຄົນຈິງ$$, $$ຕັ້ງຊົ່ວໂມງງຽບອັດຕະໂນມັດ ແທນການເພິ່ງຄວາມຕັ້ງໃຈ$$, $$ບອກຄົນສະໜິດວິທີຕິດຕໍ່ໃນກໍລະນີສຸກເສີນແທ້$$],
    3, false, 49
  ),
  (
    $$use-the-80-20-rule$$,
    $$Use the 80/20 rule to find what actually matters$$,
    $$ໃຊ້ກົດ 80/20 ເພື່ອຫາສິ່ງທີ່ສຳຄັນແທ້ຈິງ$$,
    $$Roughly 20% of your efforts usually produce 80% of your results — find that 20%.$$,
    $$ປະມານ 20% ຂອງຄວາມພະຍາຍາມ ມັກສ້າງ 80% ຂອງຜົນລັບ — ຊອກຫາ 20% ນັ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask which efforts drove the biggest results$$, 'body', $$Look back at last month's wins and ask what specific actions actually caused them — usually it's a small handful of activities.$$),
      jsonb_build_object('heading', $$Do more of the vital few$$, 'body', $$Once you spot your highest-leverage activities, deliberately spend more time on them and less on everything else.$$),
      jsonb_build_object('heading', $$Question the trivial many$$, 'body', $$For the low-impact 80% of activities, ask if you can cut, simplify, or delegate them instead of doing them at full effort.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມວ່າຄວາມພະຍາຍາມໃດສ້າງຜົນລັບໃຫຍ່ທີ່ສຸດ$$, 'body', $$ເບິ່ງຄືນຄວາມສຳເລັດເດືອນທີ່ຜ່ານມາ ແລະ ຖາມວ່າການກະທຳໃດແທ້ໆທີ່ເປັນສາເຫດ — ປົກກະຕິແລ້ວມີພຽງບໍ່ຫຼາຍກິດຈະກຳ.$$),
      jsonb_build_object('heading', $$ເຮັດ "ໜ້ອຍແຕ່ສຳຄັນ" ໃຫ້ຫຼາຍຂຶ້ນ$$, 'body', $$ເມື່ອຊອກຫາກິດຈະກຳທີ່ໃຫ້ຜົນຫຼາຍທີ່ສຸດ ໃຫ້ໃຊ້ເວລາກັບມັນຫຼາຍຂຶ້ນ ແລະ ໜ້ອຍລົງກັບອັນອື່ນຢ່າງຕັ້ງໃຈ.$$),
      jsonb_build_object('heading', $$ຕັ້ງຄຳຖາມ "ຫຼາຍແຕ່ບໍ່ສຳຄັນ"$$, 'body', $$ສຳລັບ 80% ຂອງກິດຈະກຳທີ່ໃຫ້ຜົນໜ້ອຍ ໃຫ້ຖາມວ່າຕັດ, ເຮັດໃຫ້ງ່າຍ ຫຼືມອບໝາຍໄດ້ບໍ່ ແທນທີ່ຈະໃສ່ຄວາມພະຍາຍາມເຕັມທີ່.$$)
    ),
    array[$$Identify which few actions drove most of your results$$, $$Deliberately spend more time on your highest-leverage work$$, $$Cut, simplify, or delegate the low-impact majority$$],
    array[$$ຊອກຫາການກະທຳໜ້ອຍໆທີ່ສ້າງຜົນລັບສ່ວນຫຼາຍ$$, $$ໃສ່ເວລາຫຼາຍຂຶ້ນກັບວຽກທີ່ໃຫ້ຜົນສູງທີ່ສຸດ$$, $$ຕັດ, ເຮັດໃຫ້ງ່າຍ ຫຼືມອບໝາຍວຽກທີ່ໃຫ້ຜົນໜ້ອຍ$$],
    4, false, 50
  ),
  (
    $$create-accountability-with-a-partner$$,
    $$Create accountability with a partner or public commitment$$,
    $$ສ້າງຄວາມຮັບຜິດຊອບດ້ວຍຄູ່ ຫຼືການປະກາດຕໍ່ສາທາລະນະ$$,
    $$Telling someone else your goal makes it much harder to quietly let it slide.$$,
    $$ການບອກເປົ້າໝາຍໃຫ້ຄົນອື່ນຮູ້ ເຮັດໃຫ້ຍາກທີ່ຈະປ່ອຍປະລະງັບໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Find one accountability partner$$, 'body', $$A friend, colleague, or study partner with a similar goal works well — you check in on each other on a regular schedule.$$),
      jsonb_build_object('heading', $$Set a short, regular check-in$$, 'body', $$A five-minute weekly message about progress is enough — the point is consistency, not a long formal report.$$),
      jsonb_build_object('heading', $$Make the goal specific enough to check$$, 'body', $$"I'll finish chapter 3" is checkable; "I'll work on my book" is not — vague goals make accountability meaningless.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາຄູ່ຮັບຜິດຊອບໜຶ່ງຄົນ$$, 'body', $$ໝູ່, ເພື່ອນຮ່ວມງານ ຫຼືຄູ່ຮຽນທີ່ມີເປົ້າໝາຍຄ້າຍກັນ ໃຊ້ໄດ້ດີ — ຕິດຕາມກັນຕາມກຳນົດເວລາປົກກະຕິ.$$),
      jsonb_build_object('heading', $$ຕັ້ງການຕິດຕາມສັ້ນ ແລະ ປົກກະຕິ$$, 'body', $$ຂໍ້ຄວາມ 5 ນາທີທຸກອາທິດກ່ຽວກັບຄວາມຄືບໜ້າກໍ່ພຽງພໍ — ຈຸດສຳຄັນຄືຄວາມສະໝ່ຳສະເໝີ ບໍ່ແມ່ນລາຍງານທາງການທີ່ຍາວ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເປົ້າໝາຍສະເພາະພໍທີ່ຈະກວດໄດ້$$, 'body', $$"ຈະຂຽນບົດທີ 3 ໃຫ້ຈົບ" ກວດໄດ້; "ຈະຂຽນປຶ້ມ" ກວດບໍ່ໄດ້ — ເປົ້າໝາຍທີ່ບໍ່ຊັດເຈນເຮັດໃຫ້ຄວາມຮັບຜິດຊອບບໍ່ມີຄວາມໝາຍ.$$)
    ),
    array[$$Find one accountability partner with a similar goal$$, $$Keep check-ins short but on a regular schedule$$, $$Make the goal specific enough that progress can be checked$$],
    array[$$ຫາຄູ່ຮັບຜິດຊອບໜຶ່ງຄົນທີ່ມີເປົ້າໝາຍຄ້າຍກັນ$$, $$ຮັກສາການຕິດຕາມໃຫ້ສັ້ນແຕ່ປົກກະຕິ$$, $$ໃຫ້ເປົ້າໝາຍສະເພາະພໍທີ່ຈະກວດຄວາມຄືບໜ້າໄດ້$$],
    4, false, 51
  ),
  (
    $$beat-perfectionism$$,
    $$Recognize and beat perfectionism that stalls progress$$,
    $$ຮັບຮູ້ ແລະ ເອົາຊະນະຄວາມສົມບູນແບບທີ່ເຮັດໃຫ້ຢຸດຊະງັກ$$,
    $$Perfectionism often disguises itself as high standards while actually preventing anything from shipping.$$,
    $$ຄວາມສົມບູນແບບມັກປອມຕົວເປັນມາດຕະຖານສູງ ທັງທີ່ຈິງແລ້ວເຮັດໃຫ້ບໍ່ມີຫຍັງສຳເລັດອອກມາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Define "good enough" before starting$$, 'body', $$Decide the minimum acceptable quality before you begin, so you have a clear line to stop at instead of endless refining.$$),
      jsonb_build_object('heading', $$Set a time limit on refinement$$, 'body', $$Give polishing a fixed time box — when it's up, ship what you have, even if part of you wants one more pass.$$),
      jsonb_build_object('heading', $$Remember done beats perfect for most things$$, 'body', $$A finished, shared piece of work that gets real feedback teaches you more than a perfect one that never leaves your desk.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຳນົດ "ດີພຽງພໍ" ກ່ອນເລີ່ມ$$, 'body', $$ຕັດສິນໃຈຄຸນນະພາບຂັ້ນຕ່ຳທີ່ຮັບໄດ້ກ່ອນເລີ່ມ ເພື່ອມີເສັ້ນຊັດເຈນທີ່ຈະຢຸດ ແທນທີ່ຈະປັບແຕ່ງບໍ່ຢຸດ.$$),
      jsonb_build_object('heading', $$ຕັ້ງເວລາຈຳກັດການປັບແຕ່ງ$$, 'body', $$ໃຫ້ການປັບແຕ່ງມີເວລາຈຳກັດແນ່ນອນ — ເມື່ອໝົດເວລາ ໃຫ້ສົ່ງອອກສິ່ງທີ່ມີ ເຖິງແມ່ນວ່າສ່ວນໜຶ່ງຢາກແກ້ອີກ.$$),
      jsonb_build_object('heading', $$ຈື່ວ່າ "ສຳເລັດ" ດີກວ່າ "ສົມບູນແບບ" ສ່ວນຫຼາຍ$$, 'body', $$ຜົນງານທີ່ສຳເລັດ ແລະ ແບ່ງປັນອອກໄປ ໄດ້ຮັບຄຳຄິດເຫັນຈິງ ສອນທ່ານໄດ້ຫຼາຍກວ່າຜົນງານສົມບູນແບບທີ່ບໍ່ເຄີຍອອກຈາກໂຕະ.$$)
    ),
    array[$$Define "good enough" before you start a task$$, $$Set a time limit on refinement instead of unlimited polishing$$, $$A finished, shared piece of work usually beats a perfect one$$],
    array[$$ກຳນົດ "ດີພຽງພໍ" ກ່ອນເລີ່ມວຽກ$$, $$ຕັ້ງເວລາຈຳກັດການປັບແຕ່ງ ແທນທີ່ຈະບໍ່ຈຳກັດ$$, $$ຜົນງານທີ່ສຳເລັດ ແລະ ແບ່ງປັນ ມັກດີກວ່າຜົນງານສົມບູນແບບ$$],
    4, false, 52
  ),
  (
    $$use-checklists-for-recurring-processes$$,
    $$Use checklists for recurring processes$$,
    $$ໃຊ້ Checklist ສຳລັບຂະບວນການທີ່ຊ້ຳໆ$$,
    $$A written checklist catches small mistakes that memory alone tends to miss under pressure.$$,
    $$Checklist ທີ່ຂຽນໄວ້ ຈັບຄວາມຜິດພາດນ້ອຍໆທີ່ຄວາມຈຳຢ່າງດຽວມັກພາດພາຍໃຕ້ຄວາມກົດດັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write it after doing the task twice$$, 'body', $$After the second time you do a multi-step process, write down every step you actually took — that's your first checklist draft.$$),
      jsonb_build_object('heading', $$Keep steps checkable, not vague$$, 'body', $$"Attach the invoice PDF" is checkable; "handle billing" is not — write steps specific enough to tick off with confidence.$$),
      jsonb_build_object('heading', $$Update it when a mistake happens$$, 'body', $$Every time something goes wrong in a recurring process, add a step to the checklist so that specific mistake can't repeat.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນຫຼັງເຮັດວຽກນັ້ນສອງຄັ້ງ$$, 'body', $$ຫຼັງເຮັດຂະບວນການຫຼາຍຂັ້ນຕອນຄັ້ງທີ່ສອງ ໃຫ້ຂຽນທຸກຂັ້ນຕອນທີ່ເຮັດແທ້ — ນັ້ນຄືຮ່າງ checklist ທຳອິດ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຂັ້ນຕອນຕິກໄດ້ ບໍ່ແມ່ນທົ່ວໄປ$$, 'body', $$"ແນບໄຟລ໌ PDF ໃບແຈ້ງໜີ້" ຕິກໄດ້; "ຈັດການເລື່ອງເງິນ" ຕິກບໍ່ໄດ້ — ຂຽນຂັ້ນຕອນສະເພາະພໍທີ່ຈະຕິກໄດ້ຢ່າງໝັ້ນໃຈ.$$),
      jsonb_build_object('heading', $$ອັບເດດເມື່ອເກີດຄວາມຜິດພາດ$$, 'body', $$ທຸກຄັ້ງທີ່ມີບາງຢ່າງຜິດພາດໃນຂະບວນການທີ່ຊ້ຳໆ ໃຫ້ເພີ່ມຂັ້ນຕອນໃສ່ checklist ເພື່ອບໍ່ໃຫ້ຄວາມຜິດພາດນັ້ນເກີດຄືນ.$$)
    ),
    array[$$Write your first checklist after doing a task twice$$, $$Keep each step specific enough to actually check off$$, $$Add a step whenever a mistake happens, to prevent repeats$$],
    array[$$ຂຽນ checklist ທຳອິດຫຼັງເຮັດວຽກນັ້ນສອງຄັ້ງ$$, $$ໃຫ້ແຕ່ລະຂັ້ນຕອນສະເພາະພໍທີ່ຈະຕິກໄດ້ຈິງ$$, $$ເພີ່ມຂັ້ນຕອນທຸກຄັ້ງທີ່ຜິດພາດ ເພື່ອບໍ່ໃຫ້ເກີດຄືນ$$],
    4, false, 53
  ),
  (
    $$know-your-chronotype$$,
    $$Know your chronotype: work with your natural energy rhythm$$,
    $$ຮູ້ຈັກ Chronotype ຂອງທ່ານ: ເຮັດວຽກຕາມຈັງຫວະພະລັງງານທຳມະຊາດ$$,
    $$Not everyone peaks in the morning — fighting your natural rhythm wastes energy that working with it could save.$$,
    $$ບໍ່ແມ່ນທຸກຄົນທີ່ມີພະລັງງານສູງສຸດຕອນເຊົ້າ — ການຝືນຈັງຫວະທຳມະຊາດເສຍພະລັງງານທີ່ການເຮັດວຽກຕາມມັນຈະປະຢັດໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify morning, midday, or evening type$$, 'body', $$Some people think clearest early morning, others hit their stride in late afternoon or evening — notice your honest pattern.$$),
      jsonb_build_object('heading', $$Don't force a schedule that fights your type$$, 'body', $$If you're not a morning person, scheduling your hardest thinking at 6am will just produce frustration, not results.$$),
      jsonb_build_object('heading', $$Negotiate flexibility where possible$$, 'body', $$Where your schedule allows some flexibility, shift your hardest work to when you're naturally sharpest.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸປະເພດເຊົ້າ, ກາງເວັນ ຫຼືແລງ$$, 'body', $$ບາງຄົນຄິດແຈ່ມໃສທີ່ສຸດເຊົ້າຕົ້ນ, ບາງຄົນມີພະລັງງານທີ່ສຸດຕອນບ່າຍ ຫຼືແລງ — ສັງເກດຮູບແບບແທ້ຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ຢ່າຝືນຕາຕະລາງທີ່ຂັດກັບປະເພດຂອງທ່ານ$$, 'body', $$ຖ້າບໍ່ແມ່ນຄົນເຊົ້າ ການວາງແຜນວຽກທີ່ຍາກທີ່ສຸດຕອນ 6 ໂມງເຊົ້າ ຈະໄດ້ພຽງຄວາມອຶດອັດ ບໍ່ແມ່ນຜົນລັບ.$$),
      jsonb_build_object('heading', $$ເຈລະຈາຄວາມຍືດຫຍຸ່ນເມື່ອເປັນໄປໄດ້$$, 'body', $$ບ່ອນທີ່ຕາຕະລາງອະນຸຍາດໃຫ້ຍືດຫຍຸ່ນໄດ້ ໃຫ້ຍ້າຍວຽກທີ່ຍາກທີ່ສຸດໄປຊ່ວງທີ່ແຈ່ມໃສທຳມະຊາດທີ່ສຸດ.$$)
    ),
    array[$$Identify whether you're a morning, midday, or evening type$$, $$Don't force hard thinking into hours that fight your type$$, $$Shift your hardest work to your naturally sharpest hours$$],
    array[$$ລະບຸວ່າທ່ານເປັນປະເພດເຊົ້າ, ກາງເວັນ ຫຼືແລງ$$, $$ຢ່າຝືນຄິດເລື່ອງຍາກໃນຊົ່ວໂມງທີ່ຂັດກັບປະເພດ$$, $$ຍ້າຍວຽກທີ່ຍາກໄປຊ່ວງທີ່ແຈ່ມໃສທຳມະຊາດທີ່ສຸດ$$],
    4, false, 54
  ),
  (
    $$clear-your-workspace-at-end-of-day$$,
    $$Clear your workspace at the end of each day$$,
    $$ເກັບໂຕະເຮັດວຽກໃຫ້ສະອາດທ້າຍວັນ$$,
    $$A five-minute tidy-up gives tomorrow's you a calmer, faster start.$$,
    $$ການເກັບກວາດ 5 ນາທີ ໃຫ້ຕົນເອງມື້ອື່ນເລີ່ມຕົ້ນຢ່າງສະຫງົບ ແລະ ໄວກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Spend five minutes before you leave$$, 'body', $$Put away papers, close unnecessary tabs, and clear stray items — a small investment that changes how tomorrow morning feels.$$),
      jsonb_build_object('heading', $$Leave tomorrow's first task visible$$, 'body', $$Set out or write down the one thing you'll start with tomorrow, so there's no guessing when you sit back down.$$),
      jsonb_build_object('heading', $$Treat it as closing a mental loop$$, 'body', $$A tidy desk signals to your brain that today's work is genuinely finished, helping you actually disconnect in the evening.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ 5 ນາທີກ່ອນອອກຈາກໂຕະ$$, 'body', $$ເກັບເອກະສານ, ປິດແທັບທີ່ບໍ່ຈຳເປັນ ແລະ ເກັບຂອງກະຈັດກະຈາຍ — ການລົງທຶນນ້ອຍໆທີ່ປ່ຽນຄວາມຮູ້ສຶກຕອນເຊົ້າມື້ອື່ນ.$$),
      jsonb_build_object('heading', $$ໃຫ້ວຽກທຳອິດມື້ອື່ນເຫັນໄດ້ຊັດ$$, 'body', $$ວາງ ຫຼືຂຽນວຽກອັນດຽວທີ່ຈະເລີ່ມມື້ອື່ນ ເພື່ອບໍ່ຕ້ອງເດົາເມື່ອນັ່ງລົງໂຕະຄືນ.$$),
      jsonb_build_object('heading', $$ຖືວ່າເປັນການປິດວົງຈອນຄວາມຄິດ$$, 'body', $$ໂຕະທີ່ສະອາດ ບອກສະໝອງວ່າວຽກມື້ນີ້ຈົບແທ້ ຊ່ວຍໃຫ້ຕັດຂາດຈາກວຽກໄດ້ຈິງຕອນແລງ.$$)
    ),
    array[$$Spend five minutes tidying before you leave your desk$$, $$Leave tomorrow's first task clearly visible$$, $$Use a tidy desk as a signal that today's work is done$$],
    array[$$ໃຊ້ 5 ນາທີເກັບກວາດກ່ອນອອກຈາກໂຕະ$$, $$ໃຫ້ວຽກທຳອິດມື້ອື່ນເຫັນໄດ້ຊັດເຈນ$$, $$ໃຊ້ໂຕະທີ່ສະອາດເປັນສັນຍານວ່າວຽກມື້ນີ້ຈົບແລ້ວ$$],
    3, false, 55
  ),
  (
    $$reduce-context-switching-costs$$,
    $$Reduce the hidden cost of context switching$$,
    $$ຫຼຸດຄ່າໃຊ້ຈ່າຍທີ່ເບິ່ງບໍ່ເຫັນຂອງການສະຫຼັບບໍລິບົດ$$,
    $$Every switch between unrelated tasks costs a few minutes of lost focus you don't get back.$$,
    $$ທຸກການສະຫຼັບລະຫວ່າງວຽກທີ່ບໍ່ກ່ຽວຂ້ອງກັນ ເສຍຄວາມຈົດຈໍ່ສອງສາມນາທີທີ່ບໍ່ໄດ້ຄືນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Group similar-context tasks together$$, 'body', $$Doing all your writing tasks in one block, then all your calls, avoids paying the switching cost repeatedly through the day.$$),
      jsonb_build_object('heading', $$Finish, don't just pause, before switching$$, 'body', $$Where possible, reach a natural stopping point before switching tasks — jumping mid-thought makes the switching cost even higher.$$),
      jsonb_build_object('heading', $$Give yourself a moment to re-focus$$, 'body', $$After switching, take 30 seconds to reorient before diving in — rushing straight in often means redoing work minutes later.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈັດກຸ່ມວຽກທີ່ບໍລິບົດຄ້າຍກັນໄວ້ນຳກັນ$$, 'body', $$ເຮັດວຽກຂຽນທັງໝົດໃນຊ່ວງດຽວ ແລ້ວໂທລະສັບທັງໝົດ ຫຼີກລ້ຽງການເສຍຄ່າສະຫຼັບຊ້ຳໆຕະຫຼອດມື້.$$),
      jsonb_build_object('heading', $$ເຮັດໃຫ້ຈົບ ບໍ່ແມ່ນແຕ່ຢຸດ ກ່ອນສະຫຼັບ$$, 'body', $$ຖ້າເປັນໄປໄດ້ ໃຫ້ຮອດຈຸດຢຸດພັກທຳມະຊາດກ່ອນສະຫຼັບວຽກ — ການກະໂດດອອກກາງຄວາມຄິດ ເຮັດໃຫ້ຄ່າສະຫຼັບສູງຂຶ້ນອີກ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເວລາຕົນເອງກັບມາຈົດຈໍ່$$, 'body', $$ຫຼັງສະຫຼັບແລ້ວ ໃຫ້ເວລາ 30 ວິນາທີປັບຄວາມຄິດກ່ອນເລີ່ມ — ການຮີບເຮັດເລີຍມັກເຮັດໃຫ້ຕ້ອງເຮັດຄືນພາຍຫຼັງ.$$)
    ),
    array[$$Group tasks with similar context to reduce switching$$, $$Reach a natural stopping point before switching tasks$$, $$Take a moment to reorient after every switch$$],
    array[$$ຈັດກຸ່ມວຽກທີ່ບໍລິບົດຄ້າຍກັນເພື່ອຫຼຸດການສະຫຼັບ$$, $$ຮອດຈຸດຢຸດພັກທຳມະຊາດກ່ອນສະຫຼັບວຽກ$$, $$ໃຫ້ເວລາປັບຄວາມຄິດຫຼັງສະຫຼັບທຸກຄັ້ງ$$],
    4, false, 56
  ),
  (
    $$use-visual-progress-tracking$$,
    $$Use visual progress tracking to stay motivated$$,
    $$ໃຊ້ການຕິດຕາມຄວາມຄືບໜ້າແບບເຫັນໄດ້ເພື່ອຮັກສາແຮງຈູງໃຈ$$,
    $$A kanban board or habit tracker turns invisible progress into something you can actually see grow.$$,
    $$ກະດານ Kanban ຫຼືເຄື່ອງຕິດຕາມນິໄສ ປ່ຽນຄວາມຄືບໜ້າທີ່ເບິ່ງບໍ່ເຫັນ ໃຫ້ເປັນສິ່ງທີ່ເຫັນການເຕີບໂຕໄດ້ຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use simple columns: to-do, doing, done$$, 'body', $$A basic kanban board — three columns on paper or an app — makes what's in progress and what's finished obvious at a glance.$$),
      jsonb_build_object('heading', $$Mark streaks for daily habits$$, 'body', $$A simple calendar with an X on each day you complete a habit builds a visible chain you won't want to break.$$),
      jsonb_build_object('heading', $$Review the visual weekly, not constantly$$, 'body', $$Glance at your board or tracker once a week to feel the progress — checking it obsessively can become its own distraction.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ຄໍລຳງ່າຍໆ: ຈະເຮັດ, ກຳລັງເຮັດ, ສຳເລັດ$$, 'body', $$ກະດານ Kanban ພື້ນຖານ — ສາມຄໍລຳໃນເຈ້ຍ ຫຼືແອັບ — ເຮັດໃຫ້ເຫັນວຽກທີ່ກຳລັງເຮັດ ແລະ ສຳເລັດແລ້ວໄດ້ຊັດເຈນທັນທີ.$$),
      jsonb_build_object('heading', $$ໝາຍວັນຕໍ່ເນື່ອງສຳລັບນິໄສປະຈຳວັນ$$, 'body', $$ປະຕິທິນງ່າຍໆທີ່ໝາຍ X ທຸກມື້ທີ່ເຮັດນິໄສສຳເລັດ ສ້າງຫ່ວງໂສ້ທີ່ເຫັນໄດ້ ເຊິ່ງທ່ານຈະບໍ່ຢາກໃຫ້ຂາດ.$$),
      jsonb_build_object('heading', $$ທົບທວນພາບລວມທຸກອາທິດ ບໍ່ແມ່ນຕະຫຼອດ$$, 'body', $$ເບິ່ງກະດານ ຫຼືເຄື່ອງຕິດຕາມອາທິດລະຄັ້ງ ເພື່ອຮູ້ສຶກເຖິງຄວາມຄືບໜ້າ — ການເບິ່ງເລື້ອຍເກີນໄປອາດກາຍເປັນສິ່ງລົບກວນເອງ.$$)
    ),
    array[$$Use a simple to-do, doing, done board for visibility$$, $$Mark daily streaks to build a chain you won't want to break$$, $$Review your visual tracker weekly, not obsessively$$],
    array[$$ໃຊ້ກະດານງ່າຍໆ ຈະເຮັດ-ກຳລັງເຮັດ-ສຳເລັດ ເພື່ອຄວາມຊັດເຈນ$$, $$ໝາຍວັນຕໍ່ເນື່ອງເພື່ອສ້າງຫ່ວງໂສ້ທີ່ບໍ່ຢາກໃຫ້ຂາດ$$, $$ທົບທວນເຄື່ອງຕິດຕາມທຸກອາທິດ ບໍ່ແມ່ນຫຼາຍເກີນໄປ$$],
    4, false, 57
  ),
  (
    $$warren-buffetts-two-list-strategy$$,
    $$Use the two-list strategy to protect your real priorities$$,
    $$ໃຊ້ກົນລະຍຸດສອງລາຍການເພື່ອປົກປ້ອງຄວາມສຳຄັນທີ່ແທ້ຈິງ$$,
    $$List your top goals, then treat everything else as something to actively avoid, not just deprioritize.$$,
    $$ຂຽນເປົ້າໝາຍສຳຄັນທີ່ສຸດ ແລ້ວຖືວ່າສິ່ງອື່ນເປັນສິ່ງທີ່ຄວນຫຼີກລ້ຽງ ບໍ່ແມ່ນແຕ່ຫຼຸດຄວາມສຳຄັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write your top 25 goals$$, 'body', $$List everything you'd like to achieve, career and personal — a big, honest brain dump without editing yourself yet.$$),
      jsonb_build_object('heading', $$Circle your top 5$$, 'body', $$From that list, circle only the five that matter most — these become your primary focus list.$$),
      jsonb_build_object('heading', $$Actively avoid the other 20$$, 'body', $$The remaining 20 aren't a someday list — they're an avoid-at-all-costs list until the top 5 are handled, since they quietly compete for the same time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນ 25 ເປົ້າໝາຍອັນດັບຕົ້ນ$$, 'body', $$ຂຽນທຸກຢ່າງທີ່ຢາກເຮັດໃຫ້ສຳເລັດ ທັງອາຊີບ ແລະ ສ່ວນຕົວ — ຂຽນອອກມາຢ່າງຊື່ສັດໂດຍບໍ່ຕ້ອງແກ້ໄຂກ່ອນ.$$),
      jsonb_build_object('heading', $$ວົງມົນ 5 ອັນດັບຕົ້ນ$$, 'body', $$ຈາກລາຍການນັ້ນ ວົງມົນພຽງ 5 ອັນທີ່ສຳຄັນທີ່ສຸດ — ນີ້ຄືລາຍການຈຸດສຸມຫຼັກ.$$),
      jsonb_build_object('heading', $$ຫຼີກລ້ຽງ 20 ອັນທີ່ເຫຼືອຢ່າງຕັ້ງໃຈ$$, 'body', $$20 ອັນທີ່ເຫຼືອບໍ່ແມ່ນລາຍການ "ຄ່ອຍເຮັດ" — ແຕ່ເປັນລາຍການທີ່ຄວນຫຼີກລ້ຽງຈົນກວ່າ 5 ອັນຫຼັກຈະສຳເລັດ ເພາະພວກມັນແຂ່ງເວລາດຽວກັນແບບງຽບໆ.$$)
    ),
    array[$$Write out all your goals honestly without editing yet$$, $$Circle only your top five as your real focus$$, $$Treat the rest as an actively avoid list, not a someday list$$],
    array[$$ຂຽນເປົ້າໝາຍທັງໝົດຢ່າງຊື່ສັດໂດຍບໍ່ຕ້ອງແກ້ໄຂກ່ອນ$$, $$ວົງມົນພຽງ 5 ອັນເປັນຈຸດສຸມແທ້$$, $$ຖືວ່າສ່ວນທີ່ເຫຼືອເປັນລາຍການຫຼີກລ້ຽງ ບໍ່ແມ່ນຄ່ອຍເຮັດ$$],
    5, false, 58
  ),
  (
    $$practice-single-handling$$,
    $$Practice single-handling: finish before starting the next$$,
    $$ຝຶກ Single-Handling: ເຮັດໃຫ້ຈົບກ່ອນເລີ່ມອັນຕໍ່ໄປ$$,
    $$Starting many things at once feels productive but often means nothing actually gets finished.$$,
    $$ການເລີ່ມຫຼາຍຢ່າງພ້ອມກັນຮູ້ສຶກຄືມີປະສິດທິພາບ ແຕ່ມັກເຮັດໃຫ້ບໍ່ມີຫຍັງສຳເລັດແທ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick up a task once, finish it$$, 'body', $$Once you start something, commit to finishing that piece before opening a new one — resist the urge to "just start" the next idea.$$),
      jsonb_build_object('heading', $$Write down new ideas instead of chasing them$$, 'body', $$When a new idea interrupts your current task, jot it in a list for later instead of jumping to it right away.$$),
      jsonb_build_object('heading', $$Notice the relief of an actual finish$$, 'body', $$A truly completed task feels different from a pile of half-started ones — that clean finish is worth protecting.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈັບວຽກຄັ້ງດຽວ ເຮັດໃຫ້ຈົບ$$, 'body', $$ເມື່ອເລີ່ມສິ່ງໃດແລ້ວ ໃຫ້ຕັ້ງໃຈເຮັດໃຫ້ຈົບກ່ອນເປີດອັນໃໝ່ — ຕ້ານຄວາມຢາກ "ລອງເລີ່ມ" ແນວຄິດຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ຂຽນແນວຄິດໃໝ່ໄວ້ແທນການໄລ່ຕາມ$$, 'body', $$ເມື່ອແນວຄິດໃໝ່ມາລົບກວນວຽກປັດຈຸບັນ ໃຫ້ຂຽນໄວ້ໃນລາຍການສຳລັບພາຍຫຼັງ ແທນທີ່ຈະກະໂດດໄປເຮັດທັນທີ.$$),
      jsonb_build_object('heading', $$ສັງເກດຄວາມໂລ່ງໃຈຂອງການເຮັດຈົບແທ້ໆ$$, 'body', $$ວຽກທີ່ສຳເລັດແທ້ໆ ໃຫ້ຄວາມຮູ້ສຶກຕ່າງຈາກກອງວຽກທີ່ເລີ່ມແຕ່ບໍ່ຈົບ — ຄວາມສຳເລັດທີ່ສະອາດນັ້ນຄຸ້ມຄ່າທີ່ຈະປົກປ້ອງ.$$)
    ),
    array[$$Commit to finishing what you start before beginning something new$$, $$Write down new ideas instead of chasing them immediately$$, $$Notice how different a true finish feels from many half-starts$$],
    array[$$ຕັ້ງໃຈເຮັດສິ່ງທີ່ເລີ່ມແລ້ວໃຫ້ຈົບກ່ອນເລີ່ມອັນໃໝ່$$, $$ຂຽນແນວຄິດໃໝ່ໄວ້ແທນການໄລ່ຕາມທັນທີ$$, $$ສັງເກດວ່າການເຮັດຈົບແທ້ຕ່າງຈາກກອງວຽກເລີ່ມແຕ່ບໍ່ຈົບແນວໃດ$$],
    4, false, 59
  ),
  (
    $$use-commute-and-waiting-time-well$$,
    $$Use commute and waiting time productively$$,
    $$ໃຊ້ເວລາເດີນທາງ ແລະ ເວລາລໍຖ້າໃຫ້ເປັນປະໂຫຍດ$$,
    $$Small pockets of otherwise-wasted time add up to real learning or planning over weeks.$$,
    $$ຊ່ວງເວລານ້ອຍໆທີ່ປົກກະຕິເສຍໄປ ສະສົມເປັນການຮຽນຮູ້ ຫຼືການວາງແຜນຈິງໄດ້ຕະຫຼອດອາທິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Match the activity to the setting$$, 'body', $$A podcast or audiobook fits a commute; a quick planning review fits a waiting room — pick something that suits the situation.$$),
      jsonb_build_object('heading', $$Keep a short "waiting time" list ready$$, 'body', $$Have a few quick options ready to go — a language app, a reading list, a note to review — so you're not deciding in the moment.$$),
      jsonb_build_object('heading', $$Allow genuine rest too$$, 'body', $$Not every spare moment needs to be productive — sometimes staring out the window is exactly the recovery you need.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ກິດຈະກຳກົງກັບສະຖານະການ$$, 'body', $$ພອດແຄສ ຫຼືປຶ້ມສຽງເໝາະກັບການເດີນທາງ; ການທົບທວນແຜນໄວໆເໝາະກັບຫ້ອງລໍຖ້າ — ເລືອກສິ່ງທີ່ເໝາະກັບສະຖານະການ.$$),
      jsonb_build_object('heading', $$ກຽມລາຍການ "ເວລາລໍຖ້າ" ໄວ້ພ້ອມ$$, 'body', $$ກຽມທາງເລືອກໄວໆສອງສາມອັນ — ແອັບຮຽນພາສາ, ລາຍການອ່ານ, ບັນທຶກທົບທວນ — ເພື່ອບໍ່ຕ້ອງຕັດສິນໃຈຕອນນັ້ນ.$$),
      jsonb_build_object('heading', $$ອະນຸຍາດການພັກຜ່ອນແທ້ໆເໝືອນກັນ$$, 'body', $$ບໍ່ແມ່ນທຸກຊ່ວງເວລາຫວ່າງຕ້ອງມີປະໂຫຍດ — ບາງຄັ້ງການເບິ່ງອອກປ່ອງຢ້ຽມກໍ່ຄືການພັກຜ່ອນທີ່ຕ້ອງການແທ້ໆ.$$)
    ),
    array[$$Match the activity to the setting — podcast for commute, review for waiting$$, $$Keep a short list of ready options for waiting time$$, $$Allow genuine rest, not everything has to be productive$$],
    array[$$ໃຫ້ກິດຈະກຳກົງກັບສະຖານະການ — ພອດແຄສສຳລັບເດີນທາງ$$, $$ກຽມລາຍການທາງເລືອກສັ້ນໆສຳລັບເວລາລໍຖ້າ$$, $$ອະນຸຍາດການພັກຜ່ອນແທ້ໆ ບໍ່ຕ້ອງມີປະໂຫຍດທຸກຢ່າງ$$],
    3, false, 60
  ),
  (
    $$avoid-the-planning-fallacy$$,
    $$Avoid the planning fallacy: build in buffer time$$,
    $$ຫຼີກລ້ຽງຄວາມຜິດພາດໃນການວາງແຜນ: ເພີ່ມເວລາສຳຮອງ$$,
    $$Most people consistently underestimate how long tasks take — plan for that pattern instead of fighting it.$$,
    $$ຄົນສ່ວນຫຼາຍປະເມີນເວລາທີ່ວຽກໃຊ້ຕ່ຳກວ່າຄວາມເປັນຈິງສະໝ່ຳສະເໝີ — ວາງແຜນຮັບຮູ້ຮູບແບບນີ້ ແທນທີ່ຈະຝືນມັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Look at how past estimates actually went$$, 'body', $$Check your last few similar tasks — most people find they consistently underestimate by a predictable amount.$$),
      jsonb_build_object('heading', $$Add a fixed buffer percentage$$, 'body', $$If a task feels like two hours, plan for three — a consistent 30-50% buffer absorbs the typical underestimate.$$),
      jsonb_build_object('heading', $$Break the task down for a more honest estimate$$, 'body', $$Estimating each small step separately, then adding them up, is usually more accurate than guessing the whole task at once.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເບິ່ງວ່າການປະເມີນທີ່ຜ່ານມາເປັນແນວໃດແທ້$$, 'body', $$ກວດວຽກທີ່ຄ້າຍກັນທີ່ຜ່ານມາ — ຄົນສ່ວນຫຼາຍພົບວ່າຕົນເອງປະເມີນຕ່ຳກວ່າຄວາມຈິງເປັນປະຈຳໃນອັດຕາທີ່ຄາດເດົາໄດ້.$$),
      jsonb_build_object('heading', $$ເພີ່ມອັດຕາສ່ວນສຳຮອງທີ່ແນ່ນອນ$$, 'body', $$ຖ້າວຽກຮູ້ສຶກຄື 2 ຊົ່ວໂມງ ໃຫ້ວາງແຜນ 3 ຊົ່ວໂມງ — ອັດຕາສ່ວນສຳຮອງ 30-50% ຮັບຮູ້ຄວາມຜິດພາດການປະເມີນທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ແບ່ງວຽກເພື່ອປະເມີນຢ່າງຊື່ສັດກວ່າ$$, 'body', $$ການປະເມີນແຕ່ລະຂັ້ນຕອນນ້ອຍແຍກກັນ ແລ້ວລວມກັນ ມັກແມ່ນຍຳກວ່າການເດົາທັງວຽກຄັ້ງດຽວ.$$)
    ),
    array[$$Look at how your past time estimates actually turned out$$, $$Add a consistent buffer percentage to every estimate$$, $$Break tasks into small steps for a more honest total$$],
    array[$$ເບິ່ງວ່າການປະເມີນເວລາທີ່ຜ່ານມາເປັນແນວໃດແທ້$$, $$ເພີ່ມອັດຕາສ່ວນສຳຮອງທີ່ແນ່ນອນທຸກການປະເມີນ$$, $$ແບ່ງວຽກເປັນຂັ້ນຕອນນ້ອຍເພື່ອລວມເວລາໄດ້ຊື່ສັດກວ່າ$$],
    4, false, 61
  ),
  (
    $$celebrate-completed-tasks$$,
    $$Celebrate completed tasks to build the habit loop$$,
    $$ສະເຫຼີມສະຫຼອງວຽກທີ່ສຳເລັດເພື່ອສ້າງວົງຈອນນິໄສ$$,
    $$A brief moment of acknowledgment after finishing something reinforces the habit of finishing things.$$,
    $$ຊ່ວງເວລາສັ້ນໆຂອງການຮັບຮູ້ຫຼັງເຮັດວຽກສຳເລັດ ເສີມສ້າງນິໄສການເຮັດວຽກໃຫ້ຈົບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pause and notice, don't just move on$$, 'body', $$Before jumping to the next task, take five seconds to actually notice you finished something — this small pause matters more than it seems.$$),
      jsonb_build_object('heading', $$Use a small, consistent reward$$, 'body', $$A short walk, a favorite drink, or a few minutes of something enjoyable after finishing a hard task builds a positive loop.$$),
      jsonb_build_object('heading', $$Tell someone when it matters$$, 'body', $$Sharing a real accomplishment with someone who cares adds social reinforcement that a private tick mark alone doesn't give.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢຸດ ແລະ ສັງເກດ ບໍ່ແມ່ນແຕ່ຂ້າມໄປ$$, 'body', $$ກ່ອນກະໂດດໄປວຽກຕໍ່ໄປ ໃຫ້ໃຊ້ 5 ວິນາທີສັງເກດວ່າໄດ້ເຮັດບາງຢ່າງສຳເລັດແທ້ — ການຢຸດນ້ອຍໆນີ້ສຳຄັນກວ່າທີ່ຄິດ.$$),
      jsonb_build_object('heading', $$ໃຊ້ລາງວັນນ້ອຍ ແລະ ສະໝ່ຳສະເໝີ$$, 'body', $$ການຍ່າງສັ້ນໆ, ເຄື່ອງດື່ມທີ່ມັກ ຫຼືສອງສາມນາທີກັບສິ່ງທີ່ມ່ວນ ຫຼັງເຮັດວຽກຍາກສຳເລັດ ສ້າງວົງຈອນທາງບວກ.$$),
      jsonb_build_object('heading', $$ບອກຄົນອື່ນເມື່ອສຳຄັນ$$, 'body', $$ການແບ່ງປັນຄວາມສຳເລັດຈິງກັບຄົນທີ່ໃສ່ໃຈ ເພີ່ມການເສີມສ້າງທາງສັງຄົມທີ່ການຕິກສ່ວນຕົວຢ່າງດຽວໃຫ້ບໍ່ໄດ້.$$)
    ),
    array[$$Pause for a moment to actually notice you finished something$$, $$Use a small, consistent reward after hard tasks$$, $$Share real accomplishments with someone who cares$$],
    array[$$ຢຸດສັກໜ້ອຍເພື່ອສັງເກດວ່າໄດ້ເຮັດວຽກສຳເລັດແທ້$$, $$ໃຊ້ລາງວັນນ້ອຍ ແລະ ສະໝ່ຳສະເໝີຫຼັງວຽກຍາກ$$, $$ແບ່ງປັນຄວາມສຳເລັດຈິງກັບຄົນທີ່ໃສ່ໃຈ$$],
    3, false, 62
  ),
  (
    $$build-a-personal-productivity-system$$,
    $$Build a personal productivity system that actually fits you$$,
    $$ສ້າງລະບົບປະສິດທິພາບສ່ວນຕົວທີ່ເໝາະກັບທ່ານແທ້ໆ$$,
    $$The best system is the one you'll actually keep using — not the most popular app or method.$$,
    $$ລະບົບທີ່ດີທີ່ສຸດຄືອັນທີ່ທ່ານໃຊ້ຕໍ່ໄດ້ຈິງ — ບໍ່ແມ່ນແອັບ ຫຼືວິທີການທີ່ນິຍົມທີ່ສຸດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start simple, add only when needed$$, 'body', $$A basic list on paper is a real system if you use it — add complexity only when you feel a specific, real limitation.$$),
      jsonb_build_object('heading', $$Borrow ideas, don't copy wholesale$$, 'body', $$Take the pieces of Pomodoro, kanban, or SMART goals that solve your actual problems — you don't need to adopt any method entirely.$$),
      jsonb_build_object('heading', $$Review and adjust every few months$$, 'body', $$Your needs change as your work changes — revisit your system periodically instead of assuming it should stay fixed forever.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມງ່າຍ ເພີ່ມສະເພາະເມື່ອຈຳເປັນ$$, 'body', $$ລາຍການພື້ນຖານໃນເຈ້ຍກໍ່ເປັນລະບົບແທ້ ຖ້າໃຊ້ຈິງ — ເພີ່ມຄວາມຊັບຊ້ອນສະເພາະເມື່ອຮູ້ສຶກມີຂໍ້ຈຳກັດຈິງ.$$),
      jsonb_build_object('heading', $$ຢືມແນວຄິດ ບໍ່ຕ້ອງລອກທັງໝົດ$$, 'body', $$ເອົາສ່ວນຂອງ Pomodoro, Kanban ຫຼື SMART ທີ່ແກ້ບັນຫາຈິງຂອງທ່ານ — ບໍ່ຈຳເປັນຕ້ອງໃຊ້ວິທີການໃດເຕັມຮູບແບບ.$$),
      jsonb_build_object('heading', $$ທົບທວນ ແລະ ປັບທຸກສອງສາມເດືອນ$$, 'body', $$ຄວາມຕ້ອງການປ່ຽນໄປຕາມວຽກ — ທົບທວນລະບົບເປັນລະຍະ ແທນທີ່ຈະຄິດວ່າມັນຄວນຄົງທີ່ຕະຫຼອດໄປ.$$)
    ),
    array[$$Start with the simplest system you'll actually use$$, $$Borrow useful pieces of methods instead of adopting one wholesale$$, $$Review and adjust your system every few months$$],
    array[$$ເລີ່ມດ້ວຍລະບົບງ່າຍທີ່ສຸດທີ່ໃຊ້ໄດ້ຈິງ$$, $$ຢືມສ່ວນທີ່ເປັນປະໂຫຍດຈາກຫຼາຍວິທີ ບໍ່ຕ້ອງໃຊ້ອັນດຽວທັງໝົດ$$, $$ທົບທວນ ແລະ ປັບລະບົບຂອງທ່ານທຸກສອງສາມເດືອນ$$],
    4, false, 63
  ),
  (
    $$review-your-tools-and-apps-quarterly$$,
    $$Review the tools and apps you rely on every few months$$,
    $$ທົບທວນເຄື່ອງມື ແລະ ແອັບທີ່ໃຊ້ທຸກສອງສາມເດືອນ$$,
    $$Tools that once saved time can quietly become clutter — a periodic check keeps your toolkit lean.$$,
    $$ເຄື່ອງມືທີ່ເຄີຍປະຢັດເວລາ ອາດກາຍເປັນຄວາມສັບສົນແບບງຽບໆ — ການກວດເປັນລະຍະຮັກສາເຄື່ອງມືໃຫ້ກະທັດຮັດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List everything you actively use$$, 'body', $$Write out every app, subscription, and tool you touch in a normal week — you'll likely find a few you'd forgotten about.$$),
      jsonb_build_object('heading', $$Cut what no longer earns its place$$, 'body', $$If a tool hasn't genuinely helped in the last month, cancel or delete it — fewer tools means less mental overhead switching between them.$$),
      jsonb_build_object('heading', $$Only add a new tool with intention$$, 'body', $$Before adopting something new, name the specific problem it solves — this prevents slowly accumulating tools that overlap.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນທຸກຢ່າງທີ່ໃຊ້ຈິງ$$, 'body', $$ຂຽນທຸກແອັບ, ການສະໝັກສະມາຊິກ ແລະ ເຄື່ອງມືທີ່ໃຊ້ໃນອາທິດປົກກະຕິ — ອາດພົບບາງອັນທີ່ລືມໄປແລ້ວ.$$),
      jsonb_build_object('heading', $$ຕັດອອກສິ່ງທີ່ບໍ່ຄຸ້ມຄ່າອີກຕໍ່ໄປ$$, 'body', $$ຖ້າເຄື່ອງມືໃດບໍ່ໄດ້ຊ່ວຍແທ້ໃນເດືອນທີ່ຜ່ານມາ ໃຫ້ຍົກເລີກ ຫຼືລຶບ — ເຄື່ອງມືໜ້ອຍລົງໝາຍຄວາມວ່າພາລະທາງໃຈໃນການສະຫຼັບໜ້ອຍລົງ.$$),
      jsonb_build_object('heading', $$ເພີ່ມເຄື່ອງມືໃໝ່ດ້ວຍຄວາມຕັ້ງໃຈເທົ່ານັ້ນ$$, 'body', $$ກ່ອນຮັບເອົາເຄື່ອງມືໃໝ່ ໃຫ້ລະບຸບັນຫາສະເພາະທີ່ມັນແກ້ — ນີ້ປ້ອງກັນການສະສົມເຄື່ອງມືທີ່ຊ້ຳຊ້ອນກັນເທື່ອລະໜ້ອຍ.$$)
    ),
    array[$$List everything you actually use in a normal week$$, $$Cut tools that haven't genuinely helped recently$$, $$Only adopt a new tool for a specific, named problem$$],
    array[$$ຂຽນທຸກຢ່າງທີ່ໃຊ້ຈິງໃນອາທິດປົກກະຕິ$$, $$ຕັດເຄື່ອງມືທີ່ບໍ່ໄດ້ຊ່ວຍແທ້ໃນໄລຍະຫຼັງ$$, $$ຮັບເຄື່ອງມືໃໝ່ສະເພາະສຳລັບບັນຫາທີ່ລະບຸໄດ້ຊັດເຈນ$$],
    4, false, 64
  ),
  (
    $$use-a-project-kickoff-checklist$$,
    $$Use a project kickoff checklist to avoid early confusion$$,
    $$ໃຊ້ Checklist ເລີ່ມຕົ້ນໂຄງການເພື່ອຫຼີກລ້ຽງຄວາມສັບສົນຕັ້ງແຕ່ຕົ້ນ$$,
    $$A few clarifying questions at the start save far more time than fixing confusion halfway through.$$,
    $$ຄຳຖາມທີ່ຊັດເຈນສອງສາມຂໍ້ຕອນເລີ່ມຕົ້ນ ປະຢັດເວລາໄດ້ຫຼາຍກວ່າການແກ້ຄວາມສັບສົນກາງທາງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Clarify the real goal first$$, 'body', $$Ask what success looks like and who decides — starting work before this is clear almost always causes rework later.$$),
      jsonb_build_object('heading', $$Confirm deadline and resources$$, 'body', $$Know the real deadline and what budget, people, or tools you actually have before committing to a plan.$$),
      jsonb_build_object('heading', $$Identify who needs to be kept in the loop$$, 'body', $$Name the people who need updates along the way — deciding this early avoids surprising stakeholders at the end.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊັດເຈນເປົ້າໝາຍຈິງກ່ອນ$$, 'body', $$ຖາມວ່າຄວາມສຳເລັດເປັນແນວໃດ ແລະ ໃຜເປັນຜູ້ຕັດສິນ — ການເລີ່ມວຽກກ່ອນຊັດເຈນເລື່ອງນີ້ ມັກເຮັດໃຫ້ຕ້ອງເຮັດຄືນພາຍຫຼັງ.$$),
      jsonb_build_object('heading', $$ຢືນຢັນກຳນົດເວລາ ແລະ ຊັບພະຍາກອນ$$, 'body', $$ຮູ້ກຳນົດເວລາຈິງ ແລະ ງົບປະມານ, ຄົນ ຫຼືເຄື່ອງມືທີ່ມີແທ້ ກ່ອນຕົກລົງແຜນ.$$),
      jsonb_build_object('heading', $$ລະບຸໃຜຕ້ອງໄດ້ຮັບການອັບເດດ$$, 'body', $$ລະບຸຄົນທີ່ຕ້ອງໄດ້ຮັບການອັບເດດຕະຫຼອດທາງ — ການຕັດສິນໃຈນີ້ແຕ່ຕົ້ນ ຫຼີກລ້ຽງການເຮັດໃຫ້ຜູ້ກ່ຽວຂ້ອງແປກໃຈຕອນທ້າຍ.$$)
    ),
    array[$$Clarify what success looks like before starting work$$, $$Confirm the real deadline and available resources upfront$$, $$Identify who needs updates along the way from the start$$],
    array[$$ຊັດເຈນຄວາມສຳເລັດກ່ອນເລີ່ມລົງມືວຽກ$$, $$ຢືນຢັນກຳນົດເວລາ ແລະ ຊັບພະຍາກອນທີ່ມີແທ້ຕັ້ງແຕ່ຕົ້ນ$$, $$ລະບຸຄົນທີ່ຕ້ອງໄດ້ຮັບການອັບເດດຕັ້ງແຕ່ຕົ້ນ$$],
    4, false, 65
  ),
  (
    $$keep-a-done-list-not-just-a-to-do-list$$,
    $$Keep a "done" list, not just a to-do list$$,
    $$ຮັກສາລາຍການ "ສຳເລັດແລ້ວ" ບໍ່ແມ່ນແຕ່ລາຍການວຽກ$$,
    $$A running record of what you've finished counters the feeling that you never get anything done.$$,
    $$ບັນທຶກຕໍ່ເນື່ອງຂອງສິ່ງທີ່ເຮັດສຳເລັດແລ້ວ ຕ້ານຄວາມຮູ້ສຶກວ່າບໍ່ເຄີຍເຮັດຫຍັງສຳເລັດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Add to it as you finish, not from memory$$, 'body', $$Note each completed task the moment you finish it — trying to recall a week's accomplishments from memory alone loses most of them.$$),
      jsonb_build_object('heading', $$Review it on hard days$$, 'body', $$On a day that feels unproductive, scan your done list — real evidence of past progress fights the feeling of standing still.$$),
      jsonb_build_object('heading', $$Use it when writing reviews or updates$$, 'body', $$A done list makes writing a performance review, status update, or resume update far faster since the material is already gathered.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກທັນທີທີ່ສຳເລັດ ບໍ່ແມ່ນຄິດຄືນຫຼັງ$$, 'body', $$ບັນທຶກແຕ່ລະວຽກທັນທີທີ່ສຳເລັດ — ການພະຍາຍາມຄິດຄືນຄວາມສຳເລັດຂອງອາທິດຈາກຄວາມຈຳຢ່າງດຽວ ເສຍໄປສ່ວນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ທົບທວນໃນມື້ທີ່ໜັກໃຈ$$, 'body', $$ໃນມື້ທີ່ຮູ້ສຶກບໍ່ມີປະສິດທິພາບ ໃຫ້ເບິ່ງລາຍການສຳເລັດ — ຫຼັກຖານຈິງຂອງຄວາມຄືບໜ້າຕໍ່ສູ້ຄວາມຮູ້ສຶກຢຸດຢູ່ກັບທີ່.$$),
      jsonb_build_object('heading', $$ໃຊ້ຕອນຂຽນລາຍງານ ຫຼືອັບເດດ$$, 'body', $$ລາຍການສຳເລັດເຮັດໃຫ້ຂຽນລາຍງານຜົນງານ, ອັບເດດສະຖານະ ຫຼືອັບເດດ CV ໄວຂຶ້ນຫຼາຍ ເພາະຂໍ້ມູນຖືກລວບລວມໄວ້ແລ້ວ.$$)
    ),
    array[$$Log each finished task the moment you complete it$$, $$Review the done list on days that feel unproductive$$, $$Use it as ready material when writing reviews or updates$$],
    array[$$ບັນທຶກແຕ່ລະວຽກທັນທີທີ່ສຳເລັດ$$, $$ທົບທວນລາຍການສຳເລັດໃນມື້ທີ່ຮູ້ສຶກບໍ່ມີປະສິດທິພາບ$$, $$ໃຊ້ເປັນຂໍ້ມູນພ້ອມໃຊ້ຕອນຂຽນລາຍງານ ຫຼືອັບເດດ$$],
    3, false, 66
  ),
  (
    $$protect-deep-work-from-meetings$$,
    $$Protect deep work time from meeting overload$$,
    $$ປົກປ້ອງເວລາວຽກເລິກຈາກກອງປະຊຸມທີ່ຫຼາຍເກີນໄປ$$,
    $$Meetings scattered through the day fragment focus — cluster them to protect long, uninterrupted blocks.$$,
    $$ກອງປະຊຸມທີ່ກະຈາຍຕະຫຼອດມື້ ທຳລາຍຄວາມຈົດຈໍ່ — ລວມກຸ່ມມັນເພື່ອປົກປ້ອງຊ່ວງເວລາຍາວທີ່ບໍ່ຖືກລົບກວນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Cluster meetings into set days or hours$$, 'body', $$Ask to schedule meetings within a specific window, like afternoons only, leaving mornings free for focused work.$$),
      jsonb_build_object('heading', $$Question meetings without a clear agenda$$, 'body', $$It's reasonable to ask what a meeting is for before accepting — many can be replaced by a short written update.$$),
      jsonb_build_object('heading', $$Block focus time on your calendar first$$, 'body', $$Put your deep-work blocks on the calendar before meetings get scheduled around them — an empty calendar invites meetings to fill it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລວມກອງປະຊຸມໄວ້ໃນມື້ ຫຼືຊົ່ວໂມງທີ່ກຳນົດ$$, 'body', $$ຂໍໃຫ້ນັດກອງປະຊຸມພາຍໃນຊ່ວງທີ່ກຳນົດ ເຊັ່ນ ຕອນບ່າຍເທົ່ານັ້ນ ປ່ອຍໃຫ້ຕອນເຊົ້າວ່າງສຳລັບວຽກຈົດຈໍ່.$$),
      jsonb_build_object('heading', $$ຕັ້ງຄຳຖາມກອງປະຊຸມທີ່ບໍ່ມີວາລະຊັດເຈນ$$, 'body', $$ເປັນເລື່ອງສົມເຫດສົມຜົນທີ່ຈະຖາມວ່າກອງປະຊຸມມີໄວ້ເພື່ອຫຍັງກ່ອນຕົກລົງ — ຫຼາຍອັນສາມາດແທນດ້ວຍອັບເດດຂຽນສັ້ນໆໄດ້.$$),
      jsonb_build_object('heading', $$ຈອງເວລາຈົດຈໍ່ໃນປະຕິທິນກ່ອນ$$, 'body', $$ວາງຊ່ວງເວລາວຽກເລິກໃສ່ປະຕິທິນກ່ອນທີ່ກອງປະຊຸມຈະຖືກນັດຮອບໆມັນ — ປະຕິທິນທີ່ວ່າງເປົ່າຊວນໃຫ້ກອງປະຊຸມເຕັມມັນ.$$)
    ),
    array[$$Cluster meetings into set days or hours when possible$$, $$Question meetings that don't have a clear agenda$$, $$Block deep-work time on your calendar before meetings fill it$$],
    array[$$ລວມກອງປະຊຸມໄວ້ໃນມື້ ຫຼືຊົ່ວໂມງທີ່ກຳນົດເມື່ອເປັນໄປໄດ້$$, $$ຕັ້ງຄຳຖາມກອງປະຊຸມທີ່ບໍ່ມີວາລະຊັດເຈນ$$, $$ຈອງເວລາວຽກເລິກໃນປະຕິທິນກ່ອນທີ່ກອງປະຊຸມຈະເຕັມມັນ$$],
    4, false, 67
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'productivity'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
