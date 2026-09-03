-- Bulk lesson-pool seed: Career advice direction.
-- Adds original, evergreen career-guidance lessons so the pool has 50+
-- published lessons before launch; the weekly content-forge job adds on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'CAREER', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$write-a-resume-that-gets-noticed$$,
    $$Write a resume that actually gets noticed$$,
    $$ຂຽນ CV ທີ່ໄດ້ຮັບຄວາມສົນໃຈແທ້ໆ$$,
    $$Lead with results, not just duties, and tailor every application to the specific role.$$,
    $$ເລີ່ມດ້ວຍຜົນງານ ບໍ່ແມ່ນແຕ່ໜ້າທີ່ ແລະ ປັບໃຫ້ເໝາະກັບແຕ່ລະຕຳແໜ່ງທີ່ສະໝັກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Lead with results, not duties$$, 'body', $$"Increased sign-ups by 20%" is far stronger than "responsible for marketing" — quantify impact wherever you honestly can.$$),
      jsonb_build_object('heading', $$Tailor it to each specific role$$, 'body', $$Read the job posting and mirror its key terms in your resume — a generic resume sent everywhere gets noticed nowhere.$$),
      jsonb_build_object('heading', $$Keep it scannable$$, 'body', $$Recruiters often skim for six seconds first — clear headings, consistent formatting, and no dense paragraphs help you survive that scan.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍຜົນງານ ບໍ່ແມ່ນໜ້າທີ່$$, 'body', $$"ເພີ່ມຍອດສະໝັກ 20%" ໜັກແໜ້ນກວ່າ "ຮັບຜິດຊອບການຕະຫຼາດ" ຫຼາຍ — ໃສ່ຕົວເລກຜົນກະທົບເມື່ອເປັນຄວາມຈິງ.$$),
      jsonb_build_object('heading', $$ປັບໃຫ້ເໝາະກັບແຕ່ລະຕຳແໜ່ງ$$, 'body', $$ອ່ານປະກາດຮັບສະໝັກ ແລະ ໃຊ້ຄຳສັບສຳຄັນດຽວກັນໃນ CV — CV ທົ່ວໄປທີ່ສົ່ງທຸກບ່ອນ ມັກບໍ່ໄດ້ຮັບຄວາມສົນໃຈຢູ່ໃສເລີຍ.$$),
      jsonb_build_object('heading', $$ໃຫ້ອ່ານຜ່ານໄດ້ໄວ$$, 'body', $$ຜູ້ຄັດເລືອກມັກເບິ່ງຜ່ານພຽງ 6 ວິນາທີກ່ອນ — ຫົວຂໍ້ຊັດເຈນ, ຮູບແບບສະໝ່ຳສະເໝີ ແລະ ບໍ່ມີຫຍໍ້ໜ້າໜາແໜ້ນ ຊ່ວຍໃຫ້ຜ່ານການເບິ່ງນັ້ນໄດ້.$$)
    ),
    array[$$Lead with quantified results, not just job duties$$, $$Tailor your resume's key terms to each specific posting$$, $$Format for a quick six-second scan$$],
    array[$$ເລີ່ມດ້ວຍຜົນງານທີ່ມີຕົວເລກ ບໍ່ແມ່ນແຕ່ໜ້າທີ່$$, $$ປັບຄຳສັບສຳຄັນຂອງ CV ໃຫ້ກົງກັບແຕ່ລະປະກາດ$$, $$ຈັດຮູບແບບໃຫ້ອ່ານຜ່ານໄດ້ໄວພາຍໃນ 6 ວິນາທີ$$],
    6, false, 20
  ),
  (
    $$research-a-company-before-an-interview$$,
    $$Research a company thoroughly before an interview$$,
    $$ຄົ້ນຄວ້າບໍລິສັດຢ່າງລະອຽດກ່ອນສຳພາດ$$,
    $$Good research turns generic interview answers into specific, convincing ones.$$,
    $$ການຄົ້ນຄວ້າທີ່ດີ ປ່ຽນຄຳຕອບສຳພາດທົ່ວໄປ ໃຫ້ເປັນຄຳຕອບສະເພາະ ແລະ ໜ້າເຊື່ອຖື.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Learn what they actually do and for whom$$, 'body', $$Understand their products, customers, and recent news — being able to speak specifically about their business shows real interest.$$),
      jsonb_build_object('heading', $$Understand the role's real challenges$$, 'body', $$Read the job posting closely for the problems this role is meant to solve — connect your experience directly to those specific challenges.$$),
      jsonb_build_object('heading', $$Prepare two informed questions$$, 'body', $$Questions like "how does this role fit into your plans for X" show you've done real homework, not just skimmed the homepage.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ວ່າພວກເຂົາເຮັດຫຍັງ ແລະ ໃຫ້ໃຜ$$, 'body', $$ເຂົ້າໃຈຜະລິດຕະພັນ, ລູກຄ້າ ແລະ ຂ່າວຫຼ້າສຸດຂອງພວກເຂົາ — ການເວົ້າໄດ້ສະເພາະກ່ຽວກັບທຸລະກິດພວກເຂົາ ສະແດງຄວາມສົນໃຈແທ້.$$),
      jsonb_build_object('heading', $$ເຂົ້າໃຈສິ່ງທ້າທາຍຈິງຂອງຕຳແໜ່ງ$$, 'body', $$ອ່ານປະກາດຮັບສະໝັກຢ່າງລະອຽດເພື່ອຫາບັນຫາທີ່ຕຳແໜ່ງນີ້ຕ້ອງແກ້ — ເຊື່ອມປະສົບການຂອງທ່ານກັບສິ່ງທ້າທາຍນັ້ນໂດຍກົງ.$$),
      jsonb_build_object('heading', $$ກຽມສອງຄຳຖາມທີ່ມີຂໍ້ມູນ$$, 'body', $$ຄຳຖາມເຊັ່ນ "ຕຳແໜ່ງນີ້ເໝາະກັບແຜນ X ຂອງບໍລິສັດແນວໃດ" ສະແດງວ່າຄົ້ນຄວ້າແທ້ ບໍ່ແມ່ນແຕ່ອ່ານໜ້າຫຼັກເວັບ.$$)
    ),
    array[$$Learn the company's products, customers, and recent news$$, $$Connect your experience to the role's specific challenges$$, $$Prepare two well-informed questions to ask them$$],
    array[$$ຮູ້ຜະລິດຕະພັນ, ລູກຄ້າ ແລະ ຂ່າວຫຼ້າສຸດຂອງບໍລິສັດ$$, $$ເຊື່ອມປະສົບການກັບສິ່ງທ້າທາຍສະເພາະຂອງຕຳແໜ່ງ$$, $$ກຽມສອງຄຳຖາມທີ່ມີຂໍ້ມູນໄວ້ຖາມພວກເຂົາ$$],
    5, false, 21
  ),
  (
    $$negotiate-your-starting-salary$$,
    $$Negotiate your starting salary with confidence$$,
    $$ຕໍ່ລອງເງິນເດືອນເລີ່ມຕົ້ນຢ່າງໝັ້ນໃຈ$$,
    $$Most employers expect negotiation — asking rarely costs you the offer.$$,
    $$ນາຍຈ້າງສ່ວນຫຼາຍຄາດຫວັງການຕໍ່ລອງ — ການຂໍມັກບໍ່ເສຍໂອກາດຮັບຂໍ້ສະເໜີ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Research the real market range first$$, 'body', $$Know the typical range for this role, location, and experience level before any number gets discussed, so you have a fact-based anchor.$$),
      jsonb_build_object('heading', $$Let them name a number first if possible$$, 'body', $$If asked your expectation, it's fine to say "I'd love to hear the budgeted range for this role first" before committing to a figure.$$),
      jsonb_build_object('heading', $$Negotiate calmly and specifically$$, 'body', $$"Based on my research and experience, I was hoping for closer to [number]" is direct without being confrontational.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄົ້ນຄວ້າຊ່ວງລາຄາຕະຫຼາດຈິງກ່ອນ$$, 'body', $$ຮູ້ຊ່ວງທົ່ວໄປສຳລັບຕຳແໜ່ງ, ສະຖານທີ່ ແລະ ລະດັບປະສົບການນີ້ ກ່ອນເລີ່ມສົນທະນາຕົວເລກ ເພື່ອມີຈຸດອ້າງອີງທີ່ອີງຫຼັກຖານ.$$),
      jsonb_build_object('heading', $$ໃຫ້ພວກເຂົາບອກຕົວເລກກ່ອນຖ້າເປັນໄປໄດ້$$, 'body', $$ຖ້າຖືກຖາມຄວາມຄາດຫວັງ ສາມາດເວົ້າວ່າ "ຢາກຮູ້ຊ່ວງງົບປະມານທີ່ຕັ້ງໄວ້ສຳລັບຕຳແໜ່ງນີ້ກ່ອນ" ໄດ້ ກ່ອນຈະໃຫ້ຕົວເລກ.$$),
      jsonb_build_object('heading', $$ຕໍ່ລອງຢ່າງສະຫງົບ ແລະ ສະເພາະ$$, 'body', $$"ອີງຕາມການຄົ້ນຄວ້າ ແລະ ປະສົບການ ຂ້ອຍຫວັງໄດ້ໃກ້ [ຕົວເລກ]" ກົງໄປກົງມາໂດຍບໍ່ຂັດແຍ້ງ.$$)
    ),
    array[$$Research the real market range before any number is discussed$$, $$Try to let the employer name a figure first$$, $$State your ask calmly, backed by research and experience$$],
    array[$$ຄົ້ນຄວ້າຊ່ວງຕະຫຼາດຈິງກ່ອນເລີ່ມສົນທະນາຕົວເລກ$$, $$ພະຍາຍາມໃຫ້ນາຍຈ້າງບອກຕົວເລກກ່ອນ$$, $$ບອກຄວາມຕ້ອງການຢ່າງສະຫງົບ ອີງໃສ່ການຄົ້ນຄວ້າ ແລະ ປະສົບການ$$],
    6, false, 22
  ),
  (
    $$build-a-professional-network-from-scratch$$,
    $$Build a professional network from scratch$$,
    $$ສ້າງເຄືອຂ່າຍວິຊາຊີບຈາກສູນ$$,
    $$Networking is really just building genuine relationships before you need anything from them.$$,
    $$ການສ້າງເຄືອຂ່າຍ ຄືການສ້າງຄວາມສຳພັນທີ່ຈິງໃຈ ກ່ອນທີ່ຈະຕ້ອງການສິ່ງໃດຈາກມັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with people you already know$$, 'body', $$Former classmates, past coworkers, and family friends are your easiest first connections — reconnect before reaching out to strangers.$$),
      jsonb_build_object('heading', $$Offer something before you ask$$, 'body', $$Share a useful article, make an introduction, or congratulate an achievement — giving first makes future asks feel natural.$$),
      jsonb_build_object('heading', $$Keep in touch consistently, not just when needed$$, 'body', $$A short check-in message every few months keeps a relationship alive — reaching out only when job hunting feels transactional.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມຈາກຄົນທີ່ຮູ້ຈັກຢູ່ແລ້ວ$$, 'body', $$ໝູ່ຮ່ວມຫ້ອງເກົ່າ, ເພື່ອນຮ່ວມງານເກົ່າ ແລະ ໝູ່ຄອບຄົວ ເປັນການເຊື່ອມຕໍ່ທຳອິດທີ່ງ່າຍທີ່ສຸດ — ຕິດຕໍ່ຄືນກ່ອນຫາຄົນແປກໜ້າ.$$),
      jsonb_build_object('heading', $$ໃຫ້ບາງຢ່າງກ່ອນຈະຂໍ$$, 'body', $$ແບ່ງປັນບົດຄວາມທີ່ເປັນປະໂຫຍດ, ແນະນຳຄົນ ຫຼືສະແດງຄວາມຍິນດີກັບຄວາມສຳເລັດ — ການໃຫ້ກ່ອນ ເຮັດໃຫ້ການຂໍໃນອະນາຄົດຮູ້ສຶກທຳມະຊາດ.$$),
      jsonb_build_object('heading', $$ຮັກສາການຕິດຕໍ່ຢ່າງສະໝ່ຳສະເໝີ ບໍ່ແມ່ນແຕ່ຕອນຕ້ອງການ$$, 'body', $$ຂໍ້ຄວາມທັກທາຍສັ້ນໆທຸກສອງສາມເດືອນ ຮັກສາຄວາມສຳພັນໄວ້ — ການຕິດຕໍ່ພຽງຕອນຫາວຽກ ຮູ້ສຶກເໝືອນມີຜົນປະໂຫຍດແອບແຝງ.$$)
    ),
    array[$$Start with people you already know before strangers$$, $$Offer something useful before you ask for anything$$, $$Check in consistently, not only when you need something$$],
    array[$$ເລີ່ມຈາກຄົນທີ່ຮູ້ຈັກຢູ່ແລ້ວກ່ອນຄົນແປກໜ້າ$$, $$ໃຫ້ບາງຢ່າງທີ່ເປັນປະໂຫຍດກ່ອນຈະຂໍ$$, $$ຕິດຕໍ່ຢ່າງສະໝ່ຳສະເໝີ ບໍ່ແມ່ນແຕ່ຕອນຕ້ອງການ$$],
    5, false, 23
  ),
  (
    $$ask-for-a-raise-with-evidence$$,
    $$Ask for a raise backed by real evidence$$,
    $$ຂໍຂຶ້ນເງິນເດືອນໂດຍອີງໃສ່ຫຼັກຖານຈິງ$$,
    $$A specific list of contributions makes the conversation about facts, not feelings.$$,
    $$ລາຍການຜົນງານທີ່ສະເພາະ ເຮັດໃຫ້ການສົນທະນາອີງໃສ່ຂໍ້ເທັດຈິງ ບໍ່ແມ່ນຄວາມຮູ້ສຶກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Track contributions as they happen$$, 'body', $$Keep a running list of wins and added responsibilities throughout the year, not just right before the conversation.$$),
      jsonb_build_object('heading', $$Research the market rate for your role$$, 'body', $$Know what similar roles pay elsewhere so your ask is grounded in market data, not just personal need.$$),
      jsonb_build_object('heading', $$Ask directly, then stay quiet$$, 'body', $$State your ask clearly — "Based on these contributions, I'd like to discuss a raise to [amount]" — then let them respond without filling the silence.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກຜົນງານທັນທີທີ່ເກີດຂຶ້ນ$$, 'body', $$ຮັກສາລາຍການຄວາມສຳເລັດ ແລະ ໜ້າທີ່ທີ່ເພີ່ມຂຶ້ນຕະຫຼອດປີ ບໍ່ແມ່ນແຕ່ຕອນໃກ້ຈະສົນທະນາ.$$),
      jsonb_build_object('heading', $$ຄົ້ນຄວ້າອັດຕາຕະຫຼາດສຳລັບຕຳແໜ່ງຂອງທ່ານ$$, 'body', $$ຮູ້ວ່າຕຳແໜ່ງຄ້າຍກັນຢູ່ບ່ອນອື່ນຈ່າຍເທົ່າໃດ ເພື່ອໃຫ້ຄຳຂໍອີງໃສ່ຂໍ້ມູນຕະຫຼາດ ບໍ່ແມ່ນແຕ່ຄວາມຈຳເປັນສ່ວນຕົວ.$$),
      jsonb_build_object('heading', $$ຂໍໂດຍກົງ ແລ້ວງຽບລໍຖ້າ$$, 'body', $$ບອກຄຳຂໍໃຫ້ຊັດເຈນ — "ອີງຕາມຜົນງານເຫຼົ່ານີ້ ຢາກປຶກສາການຂຶ້ນເງິນເດືອນເປັນ [ຈຳນວນ]" — ແລ້ວໃຫ້ເຂົາຕອບໂດຍບໍ່ຕ້ອງເຕັມຄວາມງຽບ.$$)
    ),
    array[$$Track your contributions throughout the year, not just before asking$$, $$Ground your ask in real market rate data$$, $$State the ask clearly, then let the silence sit$$],
    array[$$ບັນທຶກຜົນງານຕະຫຼອດປີ ບໍ່ແມ່ນແຕ່ຕອນຈະຂໍ$$, $$ອີງຄຳຂໍໃສ່ຂໍ້ມູນອັດຕາຕະຫຼາດຈິງ$$, $$ບອກຄຳຂໍໃຫ້ຊັດເຈນ ແລ້ວປ່ອຍໃຫ້ຄວາມງຽບຢູ່$$],
    5, false, 24
  ),
  (
    $$choose-between-two-job-offers$$,
    $$Choose wisely between two job offers$$,
    $$ເລືອກຢ່າງສະຫຼາດລະຫວ່າງສອງຂໍ້ສະເໜີວຽກ$$,
    $$Look beyond salary alone — growth, culture, and stability all shape long-term satisfaction.$$,
    $$ເບິ່ງໃຫ້ຫຼາຍກວ່າເງິນເດືອນຢ່າງດຽວ — ການເຕີບໂຕ, ວັດທະນະທຳ ແລະ ຄວາມໝັ້ນຄົງ ລ້ວນກຳນົດຄວາມພໍໃຈໄລຍະຍາວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List your true decision criteria first$$, 'body', $$Before comparing offers, write what actually matters to you — growth, work-life balance, mission, pay — in your own priority order.$$),
      jsonb_build_object('heading', $$Look at the full compensation picture$$, 'body', $$Compare benefits, bonuses, and growth trajectory, not just the base salary number on the offer letter.$$),
      jsonb_build_object('heading', $$Talk to someone already on the team$$, 'body', $$If possible, ask to speak with a future teammate before deciding — culture questions get more honest answers from peers than from recruiters.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸເງື່ອນໄຂການຕັດສິນໃຈຈິງກ່ອນ$$, 'body', $$ກ່ອນປຽບທຽບຂໍ້ສະເໜີ ໃຫ້ຂຽນສິ່ງທີ່ສຳຄັນຕໍ່ທ່ານແທ້ — ການເຕີບໂຕ, ຄວາມສົມດຸນຊີວິດ-ວຽກ, ພາລະກິດ, ເງິນເດືອນ — ຕາມລຳດັບຄວາມສຳຄັນຂອງທ່ານເອງ.$$),
      jsonb_build_object('heading', $$ເບິ່ງພາບລວມຄ່າຕອບແທນທັງໝົດ$$, 'body', $$ປຽບທຽບສະຫວັດດີການ, ໂບນັດ ແລະ ເສັ້ນທາງເຕີບໂຕ ບໍ່ແມ່ນແຕ່ຕົວເລກເງິນເດືອນພື້ນຖານໃນຈົດໝາຍສະເໜີ.$$),
      jsonb_build_object('heading', $$ລົມກັບຄົນທີ່ຢູ່ໃນທີມແລ້ວ$$, 'body', $$ຖ້າເປັນໄປໄດ້ ຂໍລົມກັບເພື່ອນຮ່ວມທີມໃນອະນາຄົດກ່ອນຕັດສິນໃຈ — ຄຳຖາມກ່ຽວກັບວັດທະນະທຳໄດ້ຄຳຕອບຈິງໃຈກວ່າຈາກເພື່ອນຮ່ວມງານ ຫຼາຍກວ່າຈາກຜູ້ຄັດເລືອກ.$$)
    ),
    array[$$List your true decision criteria before comparing$$, $$Look at total compensation, not just base salary$$, $$Talk to a future teammate for an honest culture read$$],
    array[$$ລະບຸເງື່ອນໄຂການຕັດສິນໃຈຈິງກ່ອນປຽບທຽບ$$, $$ເບິ່ງຄ່າຕອບແທນລວມ ບໍ່ແມ່ນແຕ່ເງິນເດືອນພື້ນຖານ$$, $$ລົມກັບເພື່ອນຮ່ວມທີມໃນອະນາຄົດເພື່ອຮູ້ວັດທະນະທຳຈິງ$$],
    5, false, 25
  ),
  (
    $$handle-a-career-change-at-any-age$$,
    $$Handle a career change confidently at any age$$,
    $$ປ່ຽນສາຍອາຊີບຢ່າງໝັ້ນໃຈໃນທຸກອາຍຸ$$,
    $$A career change is a story about transferable strengths, not a story about starting over.$$,
    $$ການປ່ຽນສາຍອາຊີບ ຄືເລື່ອງລາວຂອງຈຸດແຂງທີ່ໂອນຍ້າຍໄດ້ ບໍ່ແມ່ນເລື່ອງເລີ່ມໃໝ່ຈາກສູນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify your transferable skills$$, 'body', $$Project management, communication, and problem-solving transfer across most fields — name the specific ones you bring.$$),
      jsonb_build_object('heading', $$Bridge the gap with a small project$$, 'body', $$A course, freelance project, or volunteer role in the new field gives you real, recent evidence to point to in interviews.$$),
      jsonb_build_object('heading', $$Own the story instead of apologizing for it$$, 'body', $$Explain why you're changing paths with confidence and connection to your new goal — hesitation about your own decision undermines it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸທັກສະທີ່ໂອນຍ້າຍໄດ້$$, 'body', $$ການບໍລິຫານໂຄງການ, ການສື່ສານ ແລະ ການແກ້ບັນຫາ ໂອນຍ້າຍໄດ້ໃນເກືອບທຸກສາຍງານ — ລະບຸອັນສະເພາະທີ່ທ່ານມີ.$$),
      jsonb_build_object('heading', $$ຂ້າມຊ່ອງຫວ່າງດ້ວຍໂຄງການນ້ອຍ$$, 'body', $$ຫຼັກສູດ, ໂຄງການຟຣີແລນ ຫຼືວຽກອາສາໃນສາຍໃໝ່ ໃຫ້ຫຼັກຖານຈິງ ແລະ ໃໝ່ທີ່ຊີ້ໃຫ້ເຫັນໄດ້ໃນການສຳພາດ.$$),
      jsonb_build_object('heading', $$ຮັບເປັນເຈົ້າຂອງເລື່ອງລາວ ບໍ່ແມ່ນຂໍໂທດ$$, 'body', $$ອະທິບາຍເຫດຜົນປ່ຽນສາຍງານຢ່າງໝັ້ນໃຈ ແລະ ເຊື່ອມກັບເປົ້າໝາຍໃໝ່ — ຄວາມລັງເລກ່ຽວກັບການຕັດສິນໃຈຂອງຕົນເອງ ບັ່ນທອນມັນເອງ.$$)
    ),
    array[$$Identify and name your specific transferable skills$$, $$Bridge the gap with a small real project in the new field$$, $$Explain the change with confidence, not apology$$],
    array[$$ລະບຸທັກສະທີ່ໂອນຍ້າຍໄດ້ຂອງທ່ານໃຫ້ຊັດເຈນ$$, $$ຂ້າມຊ່ອງຫວ່າງດ້ວຍໂຄງການນ້ອຍໃນສາຍໃໝ່$$, $$ອະທິບາຍການປ່ຽນສາຍງານຢ່າງໝັ້ນໃຈ ບໍ່ແມ່ນຂໍໂທດ$$],
    5, false, 26
  ),
  (
    $$build-a-personal-brand-on-linkedin$$,
    $$Build a professional online presence step by step$$,
    $$ສ້າງຕົວຕົນອອນລາຍວິຊາຊີບເທື່ອລະຂັ້ນຕອນ$$,
    $$A clear, consistent professional profile helps the right opportunities find you.$$,
    $$ໂປຣໄຟລ໌ວິຊາຊີບທີ່ຊັດເຈນ ແລະ ສະໝ່ຳສະເໝີ ຊ່ວຍໃຫ້ໂອກາດທີ່ເໝາະສົມຫາທ່ານພົບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write a headline that's specific$$, 'body', $$"Marketing coordinator helping small brands grow through social media" tells far more than just "Marketing Coordinator."$$),
      jsonb_build_object('heading', $$Share what you're learning, not just what you've done$$, 'body', $$A short post about a skill you're building shows growth mindset and keeps your profile active between job searches.$$),
      jsonb_build_object('heading', $$Keep your profile consistent with your resume$$, 'body', $$Titles, dates, and descriptions should match across your resume and online profile — inconsistency raises unnecessary questions.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນຫົວຂໍ້ທີ່ສະເພາະ$$, 'body', $$"ຜູ້ປະສານງານການຕະຫຼາດ ຊ່ວຍແບຣນນ້ອຍເຕີບໂຕຜ່ານໂຊຊຽວມີເດຍ" ບອກໄດ້ຫຼາຍກວ່າ "ຜູ້ປະສານງານການຕະຫຼາດ" ຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ແບ່ງປັນສິ່ງທີ່ກຳລັງຮຽນ ບໍ່ແມ່ນແຕ່ສິ່ງທີ່ເຮັດແລ້ວ$$, 'body', $$ໂພສສັ້ນໆກ່ຽວກັບທັກສະທີ່ກຳລັງພັດທະນາ ສະແດງແນວຄິດການເຕີບໂຕ ແລະ ຮັກສາໂປຣໄຟລ໌ໃຫ້ມີການເຄື່ອນໄຫວລະຫວ່າງຫາວຽກ.$$),
      jsonb_build_object('heading', $$ໃຫ້ໂປຣໄຟລ໌ກົງກັບ CV$$, 'body', $$ຕຳແໜ່ງ, ວັນທີ ແລະ ຄຳອະທິບາຍຄວນກົງກັນລະຫວ່າງ CV ແລະ ໂປຣໄຟລ໌ອອນລາຍ — ຄວາມບໍ່ກົງກັນສ້າງຄຳຖາມທີ່ບໍ່ຈຳເປັນ.$$)
    ),
    array[$$Write a specific headline, not just a job title$$, $$Share what you're learning to show growth$$, $$Keep your online profile consistent with your resume$$],
    array[$$ຂຽນຫົວຂໍ້ທີ່ສະເພາະ ບໍ່ແມ່ນແຕ່ຊື່ຕຳແໜ່ງ$$, $$ແບ່ງປັນສິ່ງທີ່ກຳລັງຮຽນເພື່ອສະແດງການເຕີບໂຕ$$, $$ໃຫ້ໂປຣໄຟລ໌ອອນລາຍກົງກັບ CV$$],
    5, false, 27
  ),
  (
    $$get-a-mentor-and-make-the-most-of-it$$,
    $$Get a mentor and make the most of the relationship$$,
    $$ຫາທີ່ປຶກສາ ແລະ ໃຊ້ຄວາມສຳພັນນັ້ນໃຫ້ຄຸ້ມຄ່າ$$,
    $$A good mentorship works best with a specific ask and respect for the mentor's time.$$,
    $$ຄວາມສຳພັນທີ່ປຶກສາທີ່ດີ ໄດ້ຜົນດີທີ່ສຸດເມື່ອມີຄຳຂໍສະເພາະ ແລະ ເຄົາລົບເວລາຂອງທີ່ປຶກສາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for something specific$$, 'body', $$"Could I ask you three questions about how you got into this field?" is easier to say yes to than a vague "be my mentor."$$),
      jsonb_build_object('heading', $$Come prepared to each conversation$$, 'body', $$Bring specific questions and a short update on your progress — this respects their time and makes each session more valuable.$$),
      jsonb_build_object('heading', $$Follow up on their advice$$, 'body', $$Report back on what you tried and what happened — mentors stay engaged when they see their advice actually being used.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍສິ່ງທີ່ສະເພາະ$$, 'body', $$"ຂໍຖາມ 3 ຄຳຖາມກ່ຽວກັບການເຂົ້າສາຍງານນີ້ໄດ້ບໍ່" ຕົກລົງງ່າຍກວ່າ "ຂໍໃຫ້ເປັນທີ່ປຶກສາໃຫ້ແດ່" ທີ່ບໍ່ຊັດເຈນ.$$),
      jsonb_build_object('heading', $$ກຽມພ້ອມທຸກຄັ້ງກ່ອນລົມ$$, 'body', $$ກຽມຄຳຖາມສະເພາະ ແລະ ອັບເດດຄວາມຄືບໜ້າສັ້ນໆ — ນີ້ເຄົາລົບເວລາຂອງເຂົາ ແລະ ເຮັດໃຫ້ແຕ່ລະຄັ້ງມີຄຸນຄ່າຫຼາຍຂຶ້ນ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມຄຳແນະນຳຂອງເຂົາ$$, 'body', $$ລາຍງານກັບຄືນວ່າໄດ້ລອງເຮັດຫຍັງ ແລະ ຜົນເປັນແນວໃດ — ທີ່ປຶກສາຍັງໃສ່ໃຈເມື່ອເຫັນຄຳແນະນຳຖືກນຳໄປໃຊ້ຈິງ.$$)
    ),
    array[$$Ask for something specific rather than a vague mentorship$$, $$Come prepared with questions to every conversation$$, $$Follow up to show their advice is actually being used$$],
    array[$$ຂໍສິ່ງທີ່ສະເພາະ ແທນການຂໍເປັນທີ່ປຶກສາແບບບໍ່ຊັດເຈນ$$, $$ກຽມຄຳຖາມພ້ອມທຸກຄັ້ງກ່ອນລົມ$$, $$ຕິດຕາມເພື່ອສະແດງວ່າຄຳແນະນຳຖືກນຳໄປໃຊ້ຈິງ$$],
    4, false, 28
  ),
  (
    $$recover-from-being-laid-off$$,
    $$Recover and move forward after being laid off$$,
    $$ຟື້ນຕົວ ແລະ ກ້າວຕໍ່ໄປຫຼັງຖືກໃຫ້ອອກຈາກວຽກ$$,
    $$A layoff reflects business decisions, not your worth — a clear plan helps you move forward faster.$$,
    $$ການໃຫ້ອອກຈາກວຽກ ສະທ້ອນການຕັດສິນໃຈທຸລະກິດ ບໍ່ແມ່ນຄຸນຄ່າຂອງທ່ານ — ແຜນທີ່ຊັດເຈນຊ່ວຍໃຫ້ກ້າວຕໍ່ໄປໄວຂຶ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give yourself a short, real recovery period$$, 'body', $$A few days to process the news honestly is healthy — then set a date to begin actively moving forward again.$$),
      jsonb_build_object('heading', $$Update your materials before applying widely$$, 'body', $$Refresh your resume and profile with your most recent achievements before sending out applications, rather than rushing with outdated ones.$$),
      jsonb_build_object('heading', $$Lean on your network honestly$$, 'body', $$Tell trusted contacts you're looking, specifically and without shame — most opportunities come through people, not cold applications alone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ເວລາຟື້ນຕົວສັ້ນໆແທ້ໆ$$, 'body', $$ສອງສາມມື້ຮັບຮູ້ຄວາມຮູ້ສຶກຢ່າງຊື່ສັດແມ່ນເລື່ອງດີ — ແລ້ວກຳນົດວັນເລີ່ມກ້າວໄປຂ້າງໜ້າຢ່າງຈິງຈັງອີກຄັ້ງ.$$),
      jsonb_build_object('heading', $$ອັບເດດເອກະສານກ່ອນສະໝັກຢ່າງກວ້າງຂວາງ$$, 'body', $$ອັບເດດ CV ແລະ ໂປຣໄຟລ໌ດ້ວຍຜົນງານຫຼ້າສຸດ ກ່ອນສົ່ງໃບສະໝັກ ແທນທີ່ຈະຮີບໃຊ້ສະບັບເກົ່າ.$$),
      jsonb_build_object('heading', $$ອາໄສເຄືອຂ່າຍຢ່າງຊື່ສັດ$$, 'body', $$ບອກຄົນທີ່ໄວ້ໃຈວ່າກຳລັງຫາວຽກຢ່າງສະເພາະ ໂດຍບໍ່ຕ້ອງອາຍ — ໂອກາດສ່ວນຫຼາຍມາຈາກຄົນ ບໍ່ແມ່ນແຕ່ການສະໝັກແບບເຢັນຊາ.$$)
    ),
    array[$$Allow a short, honest recovery period before pushing forward$$, $$Update your resume and profile before applying widely$$, $$Tell your network specifically that you're looking$$],
    array[$$ໃຫ້ເວລາຟື້ນຕົວສັ້ນ ແລະ ຊື່ສັດກ່ອນຮີບກ້າວຕໍ່$$, $$ອັບເດດ CV ແລະ ໂປຣໄຟລ໌ກ່ອນສະໝັກຢ່າງກວ້າງຂວາງ$$, $$ບອກເຄືອຂ່າຍຢ່າງສະເພາະວ່າກຳລັງຫາວຽກ$$],
    5, false, 29
  ),
  (
    $$decide-job-vs-further-studies$$,
    $$Decide between taking a job and further studies$$,
    $$ຕັດສິນໃຈລະຫວ່າງເຮັດວຽກ ແລະ ຮຽນຕໍ່$$,
    $$The right choice depends on your specific goals, finances, and field — not a universal rule.$$,
    $$ທາງເລືອກທີ່ຖືກຕ້ອງຂຶ້ນກັບເປົ້າໝາຍ, ການເງິນ ແລະ ສາຍງານສະເພາະຂອງທ່ານ — ບໍ່ມີກົດທົ່ວໄປສະເໝີ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check if the field truly requires the degree$$, 'body', $$Some fields need a specific credential to even be considered; others value real experience and a portfolio far more.$$),
      jsonb_build_object('heading', $$Weigh the real cost against the real gain$$, 'body', $$Compare tuition and lost income against the salary and opportunity increase the degree realistically provides in your field.$$),
      jsonb_build_object('heading', $$Consider a hybrid path$$, 'body', $$Part-time study while working, or a short certificate instead of a full degree, can capture much of the benefit with less risk.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດວ່າສາຍງານຕ້ອງການໃບປະກາດແທ້ບໍ່$$, 'body', $$ບາງສາຍງານຕ້ອງການໃບປະກາດສະເພາະເພື່ອຖືກພິຈາລະນາ; ບາງສາຍງານໃຫ້ຄຸນຄ່າກັບປະສົບການຈິງ ແລະ ຜົນງານຫຼາຍກວ່າ.$$),
      jsonb_build_object('heading', $$ຊັ່ງນ້ຳໜັກຄ່າໃຊ້ຈ່າຍຈິງກັບຜົນໄດ້ຈິງ$$, 'body', $$ປຽບທຽບຄ່າຮຽນ ແລະ ລາຍໄດ້ທີ່ເສຍໄປ ກັບເງິນເດືອນ ແລະ ໂອກາດທີ່ໃບປະກາດໃຫ້ໄດ້ຈິງໃນສາຍງານຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ພິຈາລະນາທາງປະສົມ$$, 'body', $$ຮຽນນອກເວລາໄປພ້ອມກັບເຮັດວຽກ ຫຼືໃບຢັ້ງຢືນສັ້ນແທນໃບປະລິນຍາເຕັມ ອາດໄດ້ຜົນປະໂຫຍດຫຼາຍໂດຍຄວາມສ່ຽງໜ້ອຍກວ່າ.$$)
    ),
    array[$$Check whether your specific field truly requires the degree$$, $$Weigh the real cost against the real career gain$$, $$Consider a hybrid path like part-time study or a certificate$$],
    array[$$ກວດວ່າສາຍງານຂອງທ່ານຕ້ອງການໃບປະກາດແທ້ບໍ່$$, $$ຊັ່ງນ້ຳໜັກຄ່າໃຊ້ຈ່າຍຈິງກັບຜົນປະໂຫຍດອາຊີບຈິງ$$, $$ພິຈາລະນາທາງປະສົມ ເຊັ່ນ ຮຽນນອກເວລາ ຫຼືໃບຢັ້ງຢືນສັ້ນ$$],
    5, false, 30
  ),
  (
    $$prepare-for-a-panel-interview$$,
    $$Prepare for a panel interview with multiple people$$,
    $$ກຽມພ້ອມສຳລັບການສຳພາດແບບຫຼາຍຄົນ$$,
    $$Address the whole panel, but remember each person may be evaluating something different.$$,
    $$ເວົ້າກັບທຸກຄົນໃນທີມ ແຕ່ຈື່ໄວ້ວ່າແຕ່ລະຄົນອາດປະເມີນຄົນລະດ້ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Learn who's on the panel beforehand$$, 'body', $$If possible, find out each panelist's role — a technical lead and an HR manager likely care about different things.$$),
      jsonb_build_object('heading', $$Make eye contact with everyone$$, 'body', $$When answering, briefly look at each panelist, not just the person who asked — this shows awareness of the whole room.$$),
      jsonb_build_object('heading', $$Ask each panelist's name and role early$$, 'body', $$Getting names right shows attention to detail, and knowing roles helps you tailor which parts of your answer matter to whom.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ວ່າໃຜຢູ່ໃນທີມສຳພາດກ່ອນ$$, 'body', $$ຖ້າເປັນໄປໄດ້ ຫາຮູ້ບົດບາດຂອງແຕ່ລະຄົນ — ຫົວໜ້າດ້ານເຕັກນິກ ແລະ ຜູ້ຈັດການ HR ອາດໃສ່ໃຈຄົນລະດ້ານ.$$),
      jsonb_build_object('heading', $$ສາຍຕາໃຫ້ທົ່ວທຸກຄົນ$$, 'body', $$ຕອນຕອບ ໃຫ້ເບິ່ງແຕ່ລະຄົນສັ້ນໆ ບໍ່ແມ່ນແຕ່ຄົນທີ່ຖາມ — ນີ້ສະແດງຄວາມຮັບຮູ້ຕໍ່ທັງຫ້ອງ.$$),
      jsonb_build_object('heading', $$ຖາມຊື່ ແລະ ບົດບາດແຕ່ລະຄົນແຕ່ຕົ້ນ$$, 'body', $$ການຈື່ຊື່ໄດ້ຖືກຕ້ອງ ສະແດງຄວາມໃສ່ໃຈໃນລາຍລະອຽດ ແລະ ການຮູ້ບົດບາດຊ່ວຍປັບຄຳຕອບໃຫ້ເໝາະກັບແຕ່ລະຄົນ.$$)
    ),
    array[$$Find out each panelist's role beforehand if you can$$, $$Make eye contact with everyone, not just who asked$$, $$Learn names and roles early in the conversation$$],
    array[$$ຫາຮູ້ບົດບາດຂອງແຕ່ລະຄົນກ່ອນຖ້າເປັນໄປໄດ້$$, $$ສາຍຕາໃຫ້ທົ່ວທຸກຄົນ ບໍ່ແມ່ນແຕ່ຄົນຖາມ$$, $$ຈື່ຊື່ ແລະ ບົດບາດແຕ່ຕົ້ນການສົນທະນາ$$],
    4, false, 31
  ),
  (
    $$handle-expected-salary-question$$,
    $$Handle "what's your expected salary" gracefully$$,
    $$ຮັບມືຄຳຖາມ "ຄາດຫວັງເງິນເດືອນເທົ່າໃດ" ຢ່າງມີໄຫວພິບ$$,
    $$Answering with a researched range protects you from anchoring too low or too high.$$,
    $$ຕອບດ້ວຍຊ່ວງທີ່ຄົ້ນຄວ້າມາແລ້ວ ປົກປ້ອງທ່ານຈາກການໃຫ້ຕົວເລກຕ່ຳ ຫຼືສູງເກີນໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Come with a researched range ready$$, 'body', $$Know the market range for this role before the interview, so you're never guessing under pressure in the moment.$$),
      jsonb_build_object('heading', $$Give a range, not a single number$$, 'body', $$"Based on my research, I'm looking at something in the [X to Y] range" leaves room to negotiate in either direction.$$),
      jsonb_build_object('heading', $$It's fine to redirect if asked too early$$, 'body', $$"I'd like to learn more about the role first before discussing numbers" is a reasonable, professional response if asked very early.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຽມຊ່ວງທີ່ຄົ້ນຄວ້າມາແລ້ວ$$, 'body', $$ຮູ້ຊ່ວງຕະຫຼາດສຳລັບຕຳແໜ່ງນີ້ກ່ອນສຳພາດ ເພື່ອບໍ່ຕ້ອງເດົາພາຍໃຕ້ຄວາມກົດດັນຕອນນັ້ນ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຊ່ວງ ບໍ່ແມ່ນຕົວເລກດຽວ$$, 'body', $$"ອີງຕາມການຄົ້ນຄວ້າ ຂ້ອຍຄາດຫວັງຢູ່ໃນຊ່ວງ [X ຫາ Y]" ໃຫ້ພື້ນທີ່ຕໍ່ລອງທັງສອງທິດທາງ.$$),
      jsonb_build_object('heading', $$ຫັນຄຳຖາມກໍ່ໄດ້ຖ້າຖືກຖາມໄວເກີນໄປ$$, 'body', $$"ຢາກຮູ້ກ່ຽວກັບຕຳແໜ່ງເພີ່ມກ່ອນຄ່ອຍລົມເລື່ອງຕົວເລກ" ເປັນຄຳຕອບທີ່ສົມເຫດສົມຜົນ ແລະ ເປັນມືອາຊີບ ຖ້າຖືກຖາມໄວເກີນໄປ.$$)
    ),
    array[$$Research a realistic range before the interview$$, $$Answer with a range, not a single fixed number$$, $$It's fine to redirect the question if asked very early$$],
    array[$$ຄົ້ນຄວ້າຊ່ວງທີ່ສົມເຫດສົມຜົນກ່ອນສຳພາດ$$, $$ຕອບດ້ວຍຊ່ວງ ບໍ່ແມ່ນຕົວເລກດຽວ$$, $$ຫັນຄຳຖາມກໍ່ໄດ້ຖ້າຖືກຖາມໄວເກີນໄປ$$],
    4, false, 32
  ),
  (
    $$write-a-professional-resignation-letter$$,
    $$Write a professional resignation letter$$,
    $$ຂຽນໜັງສືລາອອກຢ່າງເປັນມືອາຊີບ$$,
    $$Keep it short, positive, and clear on your last working day.$$,
    $$ໃຫ້ສັ້ນ, ໃນທາງບວກ ແລະ ຊັດເຈນເລື່ອງວັນເຮັດວຽກສຸດທ້າຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State the facts clearly upfront$$, 'body', $$Your intent to resign and your last working day should be in the first two sentences — no need to bury the news.$$),
      jsonb_build_object('heading', $$Keep the tone positive and brief$$, 'body', $$A short thank-you for the opportunity is enough — a resignation letter is not the place for detailed complaints.$$),
      jsonb_build_object('heading', $$Offer to help with the transition$$, 'body', $$Mentioning willingness to help train a replacement or document your work leaves a strong final impression.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຂໍ້ເທັດຈິງໃຫ້ຊັດເຈນແຕ່ຕົ້ນ$$, 'body', $$ຄວາມຕັ້ງໃຈລາອອກ ແລະ ວັນເຮັດວຽກສຸດທ້າຍ ຄວນຢູ່ໃນສອງປະໂຫຍກທຳອິດ — ບໍ່ຕ້ອງເຊື່ອງຂ່າວ.$$),
      jsonb_build_object('heading', $$ຮັກສານ້ຳສຽງໃນທາງບວກ ແລະ ສັ້ນ$$, 'body', $$ຄຳຂອບໃຈສັ້ນໆສຳລັບໂອກາດກໍ່ພຽງພໍ — ໜັງສືລາອອກບໍ່ແມ່ນບ່ອນລະບາຍຄຳຕຳນິລາຍລະອຽດ.$$),
      jsonb_build_object('heading', $$ສະເໜີຊ່ວຍການສົ່ງມອບ$$, 'body', $$ການບອກຄວາມເຕັມໃຈຊ່ວຍຝຶກຄົນແທນ ຫຼືບັນທຶກເອກະສານວຽກ ໃຫ້ຄວາມປະທັບໃຈສຸດທ້າຍທີ່ດີ.$$)
    ),
    array[$$State your resignation and last day clearly upfront$$, $$Keep the tone positive and brief, not a complaint list$$, $$Offer to help with a smooth transition$$],
    array[$$ບອກການລາອອກ ແລະ ວັນສຸດທ້າຍໃຫ້ຊັດເຈນແຕ່ຕົ້ນ$$, $$ຮັກສານ້ຳສຽງໃນທາງບວກ ແລະ ສັ້ນ ບໍ່ແມ່ນລາຍການຕຳນິ$$, $$ສະເໜີຊ່ວຍໃຫ້ການສົ່ງມອບລຽບງ່າຍ$$],
    4, false, 33
  ),
  (
    $$handle-imposter-syndrome-at-work$$,
    $$Handle imposter syndrome at work$$,
    $$ຮັບມືກັບຄວາມຮູ້ສຶກບໍ່ສົມຄວນຢູ່ບ່ອນເຮັດວຽກ$$,
    $$Feeling like a fraud despite real evidence of competence is common — and manageable with a few habits.$$,
    $$ຄວາມຮູ້ສຶກຄືບໍ່ສົມຄວນ ທັງທີ່ມີຫຼັກຖານຄວາມສາມາດຈິງ ເປັນເລື່ອງທົ່ວໄປ — ແລະ ຈັດການໄດ້ດ້ວຍນິໄສບາງອັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Keep a record of real evidence$$, 'body', $$Save positive feedback, completed projects, and specific wins — when doubt hits, you have concrete facts to counter the feeling.$$),
      jsonb_build_object('heading', $$Talk to someone you trust about it$$, 'body', $$Most people who look confident have felt this too — a honest conversation often reveals you're far from alone.$$),
      jsonb_build_object('heading', $$Separate feeling unsure from being unqualified$$, 'body', $$Not knowing everything is normal at any level — it's a sign of a real, growing role, not proof you don't belong.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກຫຼັກຖານຈິງ$$, 'body', $$ເກັບຄຳຄິດເຫັນທາງບວກ, ໂຄງການທີ່ສຳເລັດ ແລະ ຄວາມສຳເລັດສະເພາະ — ເມື່ອຄວາມສົງໄສເກີດຂຶ້ນ ທ່ານມີຂໍ້ເທັດຈິງໄວ້ໂຕ້ຄວາມຮູ້ສຶກນັ້ນ.$$),
      jsonb_build_object('heading', $$ລົມກັບຄົນທີ່ໄວ້ໃຈກ່ຽວກັບເລື່ອງນີ້$$, 'body', $$ຄົນສ່ວນຫຼາຍທີ່ເບິ່ງໝັ້ນໃຈ ກໍ່ເຄີຍຮູ້ສຶກແບບນີ້ — ການລົມຢ່າງຈິງໃຈ ມັກເປີດເຜີຍວ່າທ່ານບໍ່ໄດ້ຢູ່ຄົນດຽວ.$$),
      jsonb_build_object('heading', $$ແຍກຄວາມບໍ່ແນ່ໃຈອອກຈາກຄວາມບໍ່ພຽງພໍ$$, 'body', $$ການບໍ່ຮູ້ທຸກຢ່າງເປັນເລື່ອງທຳມະດາໃນທຸກລະດັບ — ເປັນສັນຍານຂອງບົດບາດທີ່ກຳລັງເຕີບໂຕ ບໍ່ແມ່ນຫຼັກຖານວ່າບໍ່ສົມຄວນຢູ່.$$)
    ),
    array[$$Keep a record of concrete evidence of your competence$$, $$Talk about it honestly — most people feel this too$$, $$Not knowing everything is normal, not proof you're unqualified$$],
    array[$$ບັນທຶກຫຼັກຖານຈິງຂອງຄວາມສາມາດ$$, $$ລົມຢ່າງຈິງໃຈ — ຄົນສ່ວນຫຼາຍກໍ່ຮູ້ສຶກແບບນີ້$$, $$ການບໍ່ຮູ້ທຸກຢ່າງເປັນເລື່ອງທຳມະດາ ບໍ່ແມ່ນຫຼັກຖານວ່າບໍ່ພຽງພໍ$$],
    5, false, 34
  ),
  (
    $$set-career-goals-for-next-five-years$$,
    $$Set clear career goals for the next five years$$,
    $$ຕັ້ງເປົ້າໝາຍອາຊີບທີ່ຊັດເຈນສຳລັບ 5 ປີຂ້າງໜ້າ$$,
    $$A rough long-term direction still guides better decisions than having no direction at all.$$,
    $$ທິດທາງໄລຍະຍາວແບບຄ່າວໆ ຍັງນຳທາງການຕັດສິນໃຈໄດ້ດີກວ່າບໍ່ມີທິດທາງເລີຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Picture your role, not just your title$$, 'body', $$Describe what you'd actually be doing day-to-day in five years — the work itself matters more than the job title alone.$$),
      jsonb_build_object('heading', $$Work backward to this year$$, 'body', $$From your five-year picture, identify what skill or experience you need by next year, then this quarter, to stay on track.$$),
      jsonb_build_object('heading', $$Revisit the goal yearly, not never$$, 'body', $$Your five-year picture will likely change as you learn more — review and adjust it once a year rather than setting it in stone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈິນຕະນາການບົດບາດ ບໍ່ແມ່ນແຕ່ຊື່ຕຳແໜ່ງ$$, 'body', $$ອະທິບາຍວ່າຈະເຮັດຫຍັງແທ້ໆປະຈຳວັນໃນ 5 ປີ — ວຽກແທ້ໆສຳຄັນກວ່າຊື່ຕຳແໜ່ງຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ຄິດຍ້ອນກັບມາຫາປີນີ້$$, 'body', $$ຈາກພາບ 5 ປີ ໃຫ້ລະບຸທັກສະ ຫຼືປະສົບການທີ່ຕ້ອງມີພາຍໃນປີໜ້າ, ແລ້ວໄຕມາດນີ້ ເພື່ອຮັກສາທິດທາງ.$$),
      jsonb_build_object('heading', $$ທົບທວນເປົ້າໝາຍທຸກປີ ບໍ່ແມ່ນບໍ່ເຄີຍ$$, 'body', $$ພາບ 5 ປີຂອງທ່ານມັກປ່ຽນເມື່ອຮຽນຮູ້ຫຼາຍຂຶ້ນ — ທົບທວນ ແລະ ປັບປີລະຄັ້ງ ແທນທີ່ຈະຕັ້ງໄວ້ຕາຍຕົວ.$$)
    ),
    array[$$Picture the actual work you'd be doing, not just a title$$, $$Work backward to identify what you need this year$$, $$Revisit and adjust the goal once a year$$],
    array[$$ຈິນຕະນາການວຽກແທ້ໆທີ່ຈະເຮັດ ບໍ່ແມ່ນແຕ່ຊື່ຕຳແໜ່ງ$$, $$ຄິດຍ້ອນກັບເພື່ອລະບຸສິ່ງທີ່ຕ້ອງການປີນີ້$$, $$ທົບທວນ ແລະ ປັບເປົ້າໝາຍປີລະຄັ້ງ$$],
    4, false, 35
  ),
  (
    $$navigate-office-politics-professionally$$,
    $$Navigate office politics without losing your integrity$$,
    $$ຮັບມືການເມືອງໃນອອຟຟິດໂດຍບໍ່ເສຍຄວາມຊື່ສັດ$$,
    $$Stay aware of relationships and influence without compromising your honesty or values.$$,
    $$ຮັບຮູ້ຄວາມສຳພັນ ແລະ ອິດທິພົນ ໂດຍບໍ່ຕ້ອງເສຍຄວາມຊື່ສັດ ຫຼືຄຸນຄ່າຂອງທ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Build relationships broadly, not just upward$$, 'body', $$Genuine, respectful relationships with peers and support staff matter as much as relationships with your boss.$$),
      jsonb_build_object('heading', $$Stay out of gossip about others$$, 'body', $$Declining to participate in complaints about absent colleagues protects your reputation as someone people can trust.$$),
      jsonb_build_object('heading', $$Address conflict directly and privately$$, 'body', $$Speaking directly with someone you disagree with, rather than complaining behind their back, resolves issues and builds real trust.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສ້າງຄວາມສຳພັນຢ່າງກວ້າງຂວາງ ບໍ່ແມ່ນແຕ່ຂຶ້ນເທິງ$$, 'body', $$ຄວາມສຳພັນທີ່ຈິງໃຈ ແລະ ເຄົາລົບກັບເພື່ອນຮ່ວມງານ ແລະ ພະນັກງານສະໜັບສະໜູນ ສຳຄັນເທົ່າກັບຄວາມສຳພັນກັບຫົວໜ້າ.$$),
      jsonb_build_object('heading', $$ຫຼີກລ້ຽງການນິນທາຄົນອື່ນ$$, 'body', $$ການປະຕິເສດເຂົ້າຮ່ວມການຕຳນິຄົນທີ່ບໍ່ຢູ່ ປົກປ້ອງຊື່ສຽງຂອງທ່ານໃນຖານະຄົນທີ່ໄວ້ໃຈໄດ້.$$),
      jsonb_build_object('heading', $$ແກ້ຄວາມຂັດແຍ້ງໂດຍກົງ ແລະ ເປັນສ່ວນຕົວ$$, 'body', $$ການລົມໂດຍກົງກັບຄົນທີ່ບໍ່ເຫັນດີນຳ ແທນທີ່ຈະຕຳນິລັບຫຼັງ ແກ້ບັນຫາ ແລະ ສ້າງຄວາມໄວ້ໃຈແທ້ຈິງ.$$)
    ),
    array[$$Build genuine relationships broadly, not just with your boss$$, $$Decline to participate in gossip about absent colleagues$$, $$Address disagreements directly and privately$$],
    array[$$ສ້າງຄວາມສຳພັນຢ່າງກວ້າງຂວາງ ບໍ່ແມ່ນແຕ່ກັບຫົວໜ້າ$$, $$ຫຼີກລ້ຽງການເຂົ້າຮ່ວມນິນທາຄົນທີ່ບໍ່ຢູ່$$, $$ແກ້ຄວາມຂັດແຍ້ງໂດຍກົງ ແລະ ເປັນສ່ວນຕົວ$$],
    5, false, 36
  ),
  (
    $$ask-thoughtful-questions-in-an-interview$$,
    $$Ask thoughtful questions in an interview$$,
    $$ຖາມຄຳຖາມທີ່ມີຄວາມຄິດໃນການສຳພາດ$$,
    $$The questions you ask reveal as much about you as the answers you give.$$,
    $$ຄຳຖາມທີ່ຖາມ ເປີດເຜີຍກ່ຽວກັບທ່ານພໍໆກັບຄຳຕອບທີ່ໃຫ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask about success, not just duties$$, 'body', $$"What does success look like in this role after six months?" reveals expectations that a job description alone doesn't.$$),
      jsonb_build_object('heading', $$Ask about the team's real challenges$$, 'body', $$"What's the biggest challenge the team is facing right now?" shows genuine interest and reveals what you'd actually be walking into.$$),
      jsonb_build_object('heading', $$Avoid questions answered on their website$$, 'body', $$Basic facts you could have found in five minutes of research signal you didn't prepare — save your questions for real insight.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມກ່ຽວກັບຄວາມສຳເລັດ ບໍ່ແມ່ນແຕ່ໜ້າທີ່$$, 'body', $$"ຄວາມສຳເລັດຂອງຕຳແໜ່ງນີ້ຫຼັງ 6 ເດືອນເປັນແນວໃດ" ເປີດເຜີຍຄວາມຄາດຫວັງທີ່ລາຍລະອຽດຕຳແໜ່ງບໍ່ໄດ້ບອກ.$$),
      jsonb_build_object('heading', $$ຖາມກ່ຽວກັບສິ່ງທ້າທາຍຈິງຂອງທີມ$$, 'body', $$"ສິ່ງທ້າທາຍໃຫຍ່ທີ່ສຸດຂອງທີມຕອນນີ້ແມ່ນຫຍັງ" ສະແດງຄວາມສົນໃຈແທ້ ແລະ ເປີດເຜີຍວ່າຈະເຂົ້າໄປພົບຫຍັງແທ້.$$),
      jsonb_build_object('heading', $$ຫຼີກລ້ຽງຄຳຖາມທີ່ຕອບໄດ້ຢູ່ເວັບໄຊ$$, 'body', $$ຂໍ້ເທັດຈິງພື້ນຖານທີ່ຫາໄດ້ພາຍໃນ 5 ນາທີ ສະແດງວ່າບໍ່ໄດ້ກຽມ — ເກັບຄຳຖາມໄວ້ສຳລັບຄວາມເຂົ້າໃຈຈິງ.$$)
    ),
    array[$$Ask what success looks like, not just what the duties are$$, $$Ask about the team's real current challenges$$, $$Avoid questions already answered on their website$$],
    array[$$ຖາມວ່າຄວາມສຳເລັດເປັນແນວໃດ ບໍ່ແມ່ນແຕ່ໜ້າທີ່$$, $$ຖາມກ່ຽວກັບສິ່ງທ້າທາຍຈິງຂອງທີມຕອນນີ້$$, $$ຫຼີກລ້ຽງຄຳຖາມທີ່ຕອບໄດ້ຢູ່ເວັບໄຊແລ້ວ$$],
    4, false, 37
  ),
  (
    $$build-a-habit-of-continuous-learning$$,
    $$Build a habit of continuous learning for your career$$,
    $$ສ້າງນິໄສການຮຽນຮູ້ຢ່າງຕໍ່ເນື່ອງເພື່ອອາຊີບ$$,
    $$A small, consistent learning habit compounds into real expertise over years.$$,
    $$ນິໄສການຮຽນຮູ້ນ້ອຍ ແລະ ສະໝ່ຳສະເໝີ ສະສົມເປັນຄວາມຊ່ຽວຊານຈິງໃນຫຼາຍປີ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick one skill at a time$$, 'body', $$Trying to learn everything at once leads to learning nothing well — choose one relevant skill and go deep on it for a few months.$$),
      jsonb_build_object('heading', $$Set a small, regular time budget$$, 'body', $$Even 20 minutes a day, protected consistently, beats an occasional weekend binge that doesn't stick.$$),
      jsonb_build_object('heading', $$Apply what you learn right away$$, 'body', $$Use a new skill on a small real task within days of learning it — application locks in learning far better than passive study alone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກທັກສະດຽວຕໍ່ຄັ້ງ$$, 'body', $$ການພະຍາຍາມຮຽນທຸກຢ່າງພ້ອມກັນ ນຳໄປສູ່ການບໍ່ຮຽນຫຍັງໄດ້ດີເລີຍ — ເລືອກທັກສະທີ່ກ່ຽວຂ້ອງອັນດຽວ ແລະ ເລິກລົງໄປສອງສາມເດືອນ.$$),
      jsonb_build_object('heading', $$ຕັ້ງງົບເວລານ້ອຍ ແລະ ປົກກະຕິ$$, 'body', $$ແມ່ນແຕ່ 20 ນາທີຕໍ່ວັນ ທີ່ປົກປ້ອງໄດ້ສະໝ່ຳສະເໝີ ດີກວ່າການອັດຢ່າງໜັກໃນວັນພັກທີ່ບໍ່ຄົງຢູ່.$$),
      jsonb_build_object('heading', $$ນຳໄປໃຊ້ທັນທີທີ່ຮຽນຮູ້$$, 'body', $$ນຳທັກສະໃໝ່ໄປໃຊ້ກັບວຽກນ້ອຍຈິງພາຍໃນສອງສາມມື້ຫຼັງຮຽນຮູ້ — ການນຳໄປໃຊ້ ຝັງຄວາມຮູ້ໄດ້ດີກວ່າການອ່ານຢ່າງດຽວ.$$)
    ),
    array[$$Focus on one relevant skill at a time$$, $$Protect a small, regular time budget for learning$$, $$Apply what you learn to a real task within days$$],
    array[$$ສຸມໃສ່ທັກສະທີ່ກ່ຽວຂ້ອງອັນດຽວຕໍ່ຄັ້ງ$$, $$ປົກປ້ອງງົບເວລານ້ອຍ ແລະ ປົກກະຕິສຳລັບການຮຽນຮູ້$$, $$ນຳສິ່ງທີ່ຮຽນຮູ້ໄປໃຊ້ກັບວຽກຈິງພາຍໃນສອງສາມມື້$$],
    4, false, 38
  ),
  (
    $$individual-contributor-vs-management-paths$$,
    $$Understand individual contributor vs. management paths$$,
    $$ເຂົ້າໃຈເສັ້ນທາງຜູ້ຊ່ຽວຊານ ທຽບກັບ ເສັ້ນທາງບໍລິຫານ$$,
    $$Growing your career doesn't have to mean managing people — both paths can lead to real seniority.$$,
    $$ການເຕີບໂຕໃນອາຊີບ ບໍ່ຈຳເປັນຕ້ອງໝາຍເຖິງການບໍລິຫານຄົນ — ທັງສອງເສັ້ນທາງນຳໄປສູ່ຕຳແໜ່ງອາວຸໂສໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Know what each path actually involves$$, 'body', $$Management centers on people, priorities, and coordination; individual contributor tracks center on deepening technical or specialist skill.$$),
      jsonb_build_object('heading', $$Be honest about what energizes you$$, 'body', $$Notice whether coaching others or solving hands-on problems yourself feels more satisfying — that's a real signal, not a small preference.$$),
      jsonb_build_object('heading', $$Neither path is a fallback$$, 'body', $$A strong individual contributor track is not a consolation prize — many organizations reward deep expertise as highly as leadership.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ວ່າແຕ່ລະເສັ້ນທາງກ່ຽວຂ້ອງກັບຫຍັງແທ້$$, 'body', $$ການບໍລິຫານສຸມໃສ່ຄົນ, ຄວາມສຳຄັນ ແລະ ການປະສານງານ; ເສັ້ນທາງຜູ້ຊ່ຽວຊານສຸມໃສ່ການເລິກລົງທັກສະເຕັກນິກ ຫຼືສະເພາະດ້ານ.$$),
      jsonb_build_object('heading', $$ຊື່ສັດກັບຕົນເອງວ່າຫຍັງໃຫ້ພະລັງງານ$$, 'body', $$ສັງເກດວ່າການໂຄ້ຊຄົນອື່ນ ຫຼືການແກ້ບັນຫາດ້ວຍຕົນເອງ ໃຫ້ຄວາມພໍໃຈຫຼາຍກວ່າ — ນັ້ນເປັນສັນຍານແທ້ ບໍ່ແມ່ນຄວາມມັກນ້ອຍໆ.$$),
      jsonb_build_object('heading', $$ບໍ່ມີເສັ້ນທາງໃດເປັນທາງເລືອກສຳຮອງ$$, 'body', $$ເສັ້ນທາງຜູ້ຊ່ຽວຊານທີ່ເຂັ້ມແຂງ ບໍ່ແມ່ນລາງວັນປອບໃຈ — ຫຼາຍອົງກອນໃຫ້ລາງວັນຄວາມຊ່ຽວຊານເລິກເທົ່າກັບການເປັນຜູ້ນຳ.$$)
    ),
    array[$$Know what management and IC paths actually involve day-to-day$$, $$Be honest about which type of work truly energizes you$$, $$Neither path is a fallback — both can lead to real seniority$$],
    array[$$ຮູ້ວ່າເສັ້ນທາງບໍລິຫານ ແລະ ຜູ້ຊ່ຽວຊານກ່ຽວຂ້ອງກັບຫຍັງແທ້$$, $$ຊື່ສັດວ່າວຽກແບບໃດໃຫ້ພະລັງງານທ່ານແທ້$$, $$ບໍ່ມີເສັ້ນທາງໃດເປັນທາງສຳຮອງ — ທັງສອງນຳໄປສູ່ຕຳແໜ່ງອາວຸໂສໄດ້$$],
    5, false, 39
  ),
  (
    $$prepare-for-a-video-interview$$,
    $$Prepare for a video interview like a pro$$,
    $$ກຽມພ້ອມສຳລັບການສຳພາດທາງວິດີໂອຢ່າງມືອາຊີບ$$,
    $$Technical setup and body language both need extra attention on video compared to in person.$$,
    $$ການຕັ້ງຄ່າເຕັກນິກ ແລະ ພາສາກາຍ ຕ້ອງການຄວາມໃສ່ໃຈເພີ່ມຕອນວິດີໂອ ທຽບກັບຕໍ່ໜ້າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Test your setup ahead of time$$, 'body', $$Check camera, microphone, lighting, and internet connection at least an hour before, not right as the interview starts.$$),
      jsonb_build_object('heading', $$Look at the camera, not the screen$$, 'body', $$Looking into the camera lens rather than the person's image on screen creates the feeling of real eye contact for them.$$),
      jsonb_build_object('heading', $$Prepare your background and surroundings$$, 'body', $$A quiet, tidy, well-lit space free of interruptions signals professionalism just as much as a physical office would.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ທົດສອບການຕັ້ງຄ່າລ່ວງໜ້າ$$, 'body', $$ກວດກ້ອງ, ໄມໂຄຣໂຟນ, ແສງ ແລະ ອິນເຕີເນັດ ຢ່າງໜ້ອຍໜຶ່ງຊົ່ວໂມງກ່ອນ ບໍ່ແມ່ນຕອນສຳພາດຈະເລີ່ມ.$$),
      jsonb_build_object('heading', $$ເບິ່ງກ້ອງ ບໍ່ແມ່ນໜ້າຈໍ$$, 'body', $$ການເບິ່ງເລນກ້ອງ ແທນທີ່ຈະເບິ່ງຮູບຄົນເທິງໜ້າຈໍ ສ້າງຄວາມຮູ້ສຶກສາຍຕາຈົນຕາແທ້ໆສຳລັບອີກຝ່າຍ.$$),
      jsonb_build_object('heading', $$ກຽມພື້ນຫຼັງ ແລະ ສະພາບແວດລ້ອມ$$, 'body', $$ພື້ນທີ່ງຽບ, ສະອາດ, ແສງດີ ແລະ ບໍ່ຖືກລົບກວນ ສະແດງຄວາມເປັນມືອາຊີບພໍໆກັບຫ້ອງການຈິງ.$$)
    ),
    array[$$Test your camera, mic, and connection well ahead of time$$, $$Look into the camera lens, not the screen, for eye contact$$, $$Prepare a quiet, tidy, well-lit background$$],
    array[$$ທົດສອບກ້ອງ, ໄມ ແລະ ອິນເຕີເນັດລ່ວງໜ້າ$$, $$ເບິ່ງເລນກ້ອງ ບໍ່ແມ່ນໜ້າຈໍ ເພື່ອສາຍຕາຈົນຕາ$$, $$ກຽມພື້ນທີ່ງຽບ, ສະອາດ ແລະ ແສງດີ$$],
    4, false, 40
  ),
  (
    $$handle-a-difficult-boss$$,
    $$Handle a difficult boss professionally$$,
    $$ຮັບມືກັບຫົວໜ້າທີ່ຍາກຢ່າງເປັນມືອາຊີບ$$,
    $$Understanding what drives their behavior helps you respond strategically instead of just reacting.$$,
    $$ການເຂົ້າໃຈສິ່ງທີ່ຢູ່ເບື້ອງຫຼັງພຶດຕິກຳຂອງເຂົາ ຊ່ວຍໃຫ້ຕອບໂຕ້ຢ່າງມີກົນລະຍຸດ ບໍ່ແມ່ນພຽງແຕ່ຕອບໂຕ້ຕາມຄວາມຮູ້ສຶກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify the specific pattern$$, 'body', $$Is it micromanaging, unclear expectations, or poor communication? Naming the specific issue helps you respond to the real problem.$$),
      jsonb_build_object('heading', $$Over-communicate to close gaps$$, 'body', $$If unclear expectations are the issue, send short written summaries after conversations to confirm what you both agreed to.$$),
      jsonb_build_object('heading', $$Know when to escalate$$, 'body', $$For behavior that crosses into unfair or harmful treatment, document specifics and involve HR or a trusted senior colleague.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸຮູບແບບສະເພາະ$$, 'body', $$ແມ່ນການຄວບຄຸມລາຍລະອຽດ, ຄວາມຄາດຫວັງທີ່ບໍ່ຊັດເຈນ ຫຼືການສື່ສານທີ່ບໍ່ດີບໍ່? ການລະບຸບັນຫາສະເພາະ ຊ່ວຍໃຫ້ຕອບໂຕ້ບັນຫາຈິງໄດ້.$$),
      jsonb_build_object('heading', $$ສື່ສານໃຫ້ຫຼາຍຂຶ້ນເພື່ອອຸດຊ່ອງຫວ່າງ$$, 'body', $$ຖ້າຄວາມຄາດຫວັງບໍ່ຊັດເຈນເປັນບັນຫາ ໃຫ້ສົ່ງສະຫຼຸບຂຽນສັ້ນໆຫຼັງການລົມ ເພື່ອຢືນຢັນສິ່ງທີ່ຕົກລົງກັນ.$$),
      jsonb_build_object('heading', $$ຮູ້ວ່າເມື່ອໃດຄວນຍົກລະດັບ$$, 'body', $$ສຳລັບພຶດຕິກຳທີ່ບໍ່ຍຸຕິທຳ ຫຼືເປັນອັນຕະລາຍ ໃຫ້ບັນທຶກລາຍລະອຽດ ແລະ ແຈ້ງ HR ຫຼືເພື່ອນຮ່ວມງານອາວຸໂສທີ່ໄວ້ໃຈໄດ້.$$)
    ),
    array[$$Identify the specific pattern behind the difficulty$$, $$Over-communicate in writing to close expectation gaps$$, $$Know when to document and escalate serious behavior$$],
    array[$$ລະບຸຮູບແບບສະເພາະທີ່ຢູ່ເບື້ອງຫຼັງຄວາມຍາກ$$, $$ສື່ສານທາງຂຽນໃຫ້ຫຼາຍຂຶ້ນເພື່ອອຸດຊ່ອງຫວ່າງ$$, $$ຮູ້ວ່າເມື່ອໃດຄວນບັນທຶກ ແລະ ຍົກລະດັບບັນຫາຮ້າຍແຮງ$$],
    5, false, 41
  ),
  (
    $$find-your-first-job-with-no-experience$$,
    $$Find your first job with little or no experience$$,
    $$ຫາວຽກທຳອິດເມື່ອຍັງບໍ່ມີປະສົບການ$$,
    $$Frame school projects, volunteer work, and personal initiative as real, relevant evidence.$$,
    $$ນຳສະເໜີໂຄງການໃນໂຮງຮຽນ, ວຽກອາສາ ແລະ ຄວາມລິເລີ່ມສ່ວນຕົວ ເປັນຫຼັກຖານທີ່ກ່ຽວຂ້ອງແທ້ຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Reframe what counts as experience$$, 'body', $$A class project, a club you organized, or a small freelance task all demonstrate real, transferable skills to an employer.$$),
      jsonb_build_object('heading', $$Target entry-level roles specifically$$, 'body', $$Search for postings that explicitly welcome beginners rather than applying broadly to roles requiring years of experience.$$),
      jsonb_build_object('heading', $$Build one small proof-of-skill project$$, 'body', $$A simple, real example of your work — a website, a writing sample, a small analysis — speaks louder than a resume alone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປັບມຸມມອງວ່າຫຍັງນັບເປັນປະສົບການ$$, 'body', $$ໂຄງການໃນຫ້ອງຮຽນ, ຊົມຮົມທີ່ຈັດຕັ້ງ ຫຼືວຽກຟຣີແລນນ້ອຍ ລ້ວນສະແດງທັກສະທີ່ໂອນຍ້າຍໄດ້ຈິງໃຫ້ນາຍຈ້າງເຫັນ.$$),
      jsonb_build_object('heading', $$ເລັງຕຳແໜ່ງລະດັບເລີ່ມຕົ້ນໂດຍສະເພາະ$$, 'body', $$ຄົ້ນຫາປະກາດທີ່ຍິນດີຮັບຜູ້ເລີ່ມຕົ້ນຢ່າງຈະແຈ້ງ ແທນທີ່ຈະສະໝັກກວ້າງໆໃນຕຳແໜ່ງທີ່ຕ້ອງການປະສົບການຫຼາຍປີ.$$),
      jsonb_build_object('heading', $$ສ້າງໜຶ່ງໂຄງການພິສູດທັກສະ$$, 'body', $$ຕົວຢ່າງວຽກຈິງງ່າຍໆ — ເວັບໄຊ, ຕົວຢ່າງການຂຽນ, ການວິເຄາະນ້ອຍ — ເວົ້າໄດ້ຫຼາຍກວ່າ CV ຢ່າງດຽວ.$$)
    ),
    array[$$Reframe school and volunteer work as real experience$$, $$Target entry-level postings that explicitly welcome beginners$$, $$Build one small project that proves your skill$$],
    array[$$ປັບມຸມມອງໃຫ້ວຽກໂຮງຮຽນ ແລະ ວຽກອາສາເປັນປະສົບການແທ້$$, $$ເລັງປະກາດລະດັບເລີ່ມຕົ້ນທີ່ຍິນດີຮັບຜູ້ໃໝ່$$, $$ສ້າງໜຶ່ງໂຄງການນ້ອຍທີ່ພິສູດທັກສະ$$],
    5, false, 42
  ),
  (
    $$build-confidence-in-public-speaking-for-career$$,
    $$Build public speaking confidence for career growth$$,
    $$ສ້າງຄວາມໝັ້ນໃຈໃນການເວົ້າຕໍ່ໜ້າຄົນ ເພື່ອການເຕີບໂຕໃນອາຊີບ$$,
    $$Visibility in meetings and presentations often opens doors that quiet excellent work alone doesn't.$$,
    $$ການເຫັນຕົວໃນກອງປະຊຸມ ແລະ ການນຳສະເໜີ ມັກເປີດປະຕູທີ່ວຽກງຽບໆເຖິງແມ່ນດີ ກໍ່ບໍ່ໄດ້ເປີດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start speaking up in small settings$$, 'body', $$Share one idea in a small team meeting before attempting a large presentation — build the habit gradually.$$),
      jsonb_build_object('heading', $$Prepare your opening line word for word$$, 'body', $$Memorizing just the first sentence removes the hardest part — the rest tends to flow once you're past the opening.$$),
      jsonb_build_object('heading', $$Focus on the message, not the nerves$$, 'body', $$Redirect attention to whether your point is clear and useful to the audience, rather than monitoring your own anxiety.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມເວົ້າໃນກຸ່ມນ້ອຍກ່ອນ$$, 'body', $$ແບ່ງປັນໜຶ່ງແນວຄິດໃນກອງປະຊຸມທີມນ້ອຍ ກ່ອນລອງນຳສະເໜີໃນກຸ່ມໃຫຍ່ — ສ້າງນິໄສເທື່ອລະໜ້ອຍ.$$),
      jsonb_build_object('heading', $$ກຽມປະໂຫຍກເປີດຄຳຕໍ່ຄຳ$$, 'body', $$ການທ່ອງພຽງແຕ່ປະໂຫຍກທຳອິດ ລົບສ່ວນທີ່ຍາກທີ່ສຸດອອກໄປ — ສ່ວນທີ່ເຫຼືອມັກໄຫຼໄດ້ເອງຫຼັງຜ່ານການເປີດແລ້ວ.$$),
      jsonb_build_object('heading', $$ສຸມໃສ່ຂໍ້ຄວາມ ບໍ່ແມ່ນຄວາມກັງວົນ$$, 'body', $$ຫັນຄວາມສົນໃຈໄປວ່າຈຸດຂອງທ່ານຊັດເຈນ ແລະ ເປັນປະໂຫຍດຕໍ່ຜູ້ຟັງບໍ່ ແທນທີ່ຈະສັງເກດຄວາມກັງວົນຂອງຕົນເອງ.$$)
    ),
    array[$$Start speaking up in small, low-pressure settings first$$, $$Memorize your opening line to get past the hardest part$$, $$Focus on the message's clarity, not your own nerves$$],
    array[$$ເລີ່ມເວົ້າໃນກຸ່ມນ້ອຍ ແລະ ບໍ່ກົດດັນກ່ອນ$$, $$ທ່ອງປະໂຫຍກເປີດເພື່ອຜ່ານສ່ວນທີ່ຍາກທີ່ສຸດ$$, $$ສຸມໃສ່ຄວາມຊັດເຈນຂອງຂໍ້ຄວາມ ບໍ່ແມ່ນຄວາມກັງວົນ$$],
    5, false, 43
  ),
  (
    $$read-a-job-posting-for-hidden-requirements$$,
    $$Read a job posting for hidden requirements$$,
    $$ອ່ານປະກາດຮັບສະໝັກເພື່ອຫາຄວາມຕ້ອງການທີ່ເຊື່ອງຢູ່$$,
    $$The language of a posting often reveals more about the role than the bullet points alone.$$,
    $$ພາສາໃນປະກາດຮັບສະໝັກ ມັກເປີດເຜີຍກ່ຽວກັບຕຳແໜ່ງຫຼາຍກວ່າຈຸດລາຍການຢ່າງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Notice repeated words$$, 'body', $$If "fast-paced" or "independently" appears multiple times, the role likely has real time pressure and limited hand-holding.$$),
      jsonb_build_object('heading', $$Separate must-haves from nice-to-haves$$, 'body', $$Requirements phrased as "required" differ meaningfully from a long "preferred" list — don't rule yourself out over the second group.$$),
      jsonb_build_object('heading', $$Read between the lines on culture clues$$, 'body', $$Phrases about "wearing many hats" or "like a family" hint at company culture and workload — decide if that fits what you're looking for.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັງເກດຄຳທີ່ຊ້ຳ$$, 'body', $$ຖ້າ "ໄວ" ຫຼື "ເຮັດເອງໄດ້" ປາກົດຫຼາຍຄັ້ງ ຕຳແໜ່ງນັ້ນອາດມີຄວາມກົດດັນເລື່ອງເວລາຈິງ ແລະ ການຊ່ວຍເຫຼືອຈຳກັດ.$$),
      jsonb_build_object('heading', $$ແຍກ "ຕ້ອງມີ" ຈາກ "ດີກວ່າຖ້າມີ"$$, 'body', $$ຄວາມຕ້ອງການທີ່ຂຽນວ່າ "ຈຳເປັນ" ຕ່າງຈາກລາຍການ "ດີກວ່າຖ້າມີ" ທີ່ຍາວ — ຢ່າຕັດຕົນເອງອອກຍ້ອນລາຍການທີສອງ.$$),
      jsonb_build_object('heading', $$ອ່ານລະຫວ່າງແຖວເລື່ອງວັດທະນະທຳ$$, 'body', $$ຄຳເວົ້າເຊັ່ນ "ໃສ່ຫຼາຍໝວກ" ຫຼື "ຄືຄອບຄົວ" ບອກໃບ້ວັດທະນະທຳ ແລະ ວຽກ — ຕັດສິນໃຈວ່າເໝາະກັບສິ່ງທີ່ຫາຢູ່ບໍ່.$$)
    ),
    array[$$Notice words that repeat — they signal real priorities$$, $$Separate required from merely preferred qualifications$$, $$Read culture clues in phrases like "wearing many hats"$$],
    array[$$ສັງເກດຄຳທີ່ຊ້ຳ — ບອກຄວາມສຳຄັນຈິງ$$, $$ແຍກຄຸນສົມບັດທີ່ຈຳເປັນ ຈາກທີ່ດີກວ່າຖ້າມີ$$, $$ອ່ານໃບ້ວັດທະນະທຳຈາກຄຳເວົ້າເຊັ່ນ "ໃສ່ຫຼາຍໝວກ"$$],
    4, false, 44
  ),
  (
    $$ask-for-a-letter-of-recommendation$$,
    $$Ask for a letter of recommendation the right way$$,
    $$ຂໍໜັງສືຮັບຮອງຢ່າງຖືກຕ້ອງ$$,
    $$Give the person context and time — a rushed, vague request usually produces a weak letter.$$,
    $$ໃຫ້ບໍລິບົດ ແລະ ເວລາແກ່ຄົນນັ້ນ — ຄຳຂໍທີ່ຮີບຮ້ອນ ແລະ ບໍ່ຊັດເຈນ ມັກໄດ້ໜັງສືທີ່ອ່ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask someone who knows your work well$$, 'body', $$A specific supervisor or professor who can speak to real examples is far more valuable than a bigger name who barely knows you.$$),
      jsonb_build_object('heading', $$Give plenty of notice and context$$, 'body', $$Ask at least two weeks ahead, and remind them of specific projects or achievements they could mention.$$),
      jsonb_build_object('heading', $$Make it easy to say yes$$, 'body', $$Offer a draft outline of points, or a copy of your resume, so writing the letter takes them less effort.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍຄົນທີ່ຮູ້ຈັກວຽກຂອງທ່ານດີ$$, 'body', $$ຫົວໜ້າ ຫຼືອາຈານທີ່ສາມາດເວົ້າເຖິງຕົວຢ່າງຈິງ ມີຄຸນຄ່າຫຼາຍກວ່າຄົນທີ່ມີຊື່ໃຫຍ່ແຕ່ບໍ່ຮູ້ຈັກທ່ານດີ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເວລາ ແລະ ບໍລິບົດພຽງພໍ$$, 'body', $$ຂໍລ່ວງໜ້າຢ່າງໜ້ອຍ 2 ອາທິດ ແລະ ເຕືອນເຂົາເຖິງໂຄງການ ຫຼືຄວາມສຳເລັດສະເພາະທີ່ອາດເວົ້າເຖິງ.$$),
      jsonb_build_object('heading', $$ເຮັດໃຫ້ຕົກລົງງ່າຍ$$, 'body', $$ສະເໜີໂຄງຮ່າງຈຸດສຳຄັນ ຫຼືສຳເນົາ CV ເພື່ອໃຫ້ການຂຽນໜັງສືໃຊ້ຄວາມພະຍາຍາມໜ້ອຍລົງ.$$)
    ),
    array[$$Ask someone who genuinely knows your work well$$, $$Give at least two weeks' notice with helpful context$$, $$Offer a draft outline or resume to make it easier for them$$],
    array[$$ຂໍຄົນທີ່ຮູ້ຈັກວຽກຂອງທ່ານດີແທ້$$, $$ໃຫ້ເວລາຢ່າງໜ້ອຍ 2 ອາທິດ ພ້ອມບໍລິບົດທີ່ເປັນປະໂຫຍດ$$, $$ສະເໜີໂຄງຮ່າງ ຫຼື CV ເພື່ອຊ່ວຍໃຫ້ງ່າຍຂຶ້ນ$$],
    4, false, 45
  ),
  (
    $$build-resilience-after-career-setbacks$$,
    $$Build resilience after career setbacks$$,
    $$ສ້າງຄວາມແຂງແກ່ນຫຼັງອຸປະສັກໃນອາຊີບ$$,
    $$A rejection or failed project is information, not a verdict on your future.$$,
    $$ການຖືກປະຕິເສດ ຫຼືໂຄງການລົ້ມເຫຼວ ເປັນຂໍ້ມູນ ບໍ່ແມ່ນຄຳຕັດສິນອະນາຄົດຂອງທ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Separate the event from your identity$$, 'body', $$"This project didn't work" is very different from "I am a failure" — keep the setback specific and bounded.$$),
      jsonb_build_object('heading', $$Extract one honest lesson$$, 'body', $$Ask what specifically you'd do differently next time — one concrete lesson turns a setback into real, usable growth.$$),
      jsonb_build_object('heading', $$Give yourself a real timeline to move on$$, 'body', $$Allow yourself to feel disappointed for a set, limited time, then deliberately shift attention to the next step forward.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ແຍກເຫດການອອກຈາກຕົວຕົນ$$, 'body', $$"ໂຄງການນີ້ບໍ່ສຳເລັດ" ຕ່າງຈາກ "ຂ້ອຍລົ້ມເຫຼວ" ຫຼາຍ — ໃຫ້ອຸປະສັກຄົງຢູ່ສະເພາະ ແລະ ຈຳກັດຂອບເຂດ.$$),
      jsonb_build_object('heading', $$ດຶງບົດຮຽນຈິງໜຶ່ງອັນ$$, 'body', $$ຖາມວ່າຄັ້ງໜ້າຈະເຮັດຫຍັງແຕກຕ່າງອອກໄປແທ້ — ບົດຮຽນທີ່ຈັບຕ້ອງໄດ້ໜຶ່ງອັນ ປ່ຽນອຸປະສັກໃຫ້ເປັນການເຕີບໂຕແທ້.$$),
      jsonb_build_object('heading', $$ໃຫ້ຕົນເອງມີໄລຍະເວລາທີ່ຊັດເຈນເພື່ອກ້າວຕໍ່$$, 'body', $$ອະນຸຍາດໃຫ້ຕົນເອງຮູ້ສຶກຜິດຫວັງໃນໄລຍະເວລາທີ່ຈຳກັດ ແລ້ວຕັ້ງໃຈຫັນຄວາມສົນໃຈໄປສູ່ຂັ້ນຕອນຕໍ່ໄປ.$$)
    ),
    array[$$Separate the specific setback from your overall identity$$, $$Extract one concrete, honest lesson from what happened$$, $$Give yourself a real, limited timeline before moving on$$],
    array[$$ແຍກອຸປະສັກສະເພາະອອກຈາກຕົວຕົນໂດຍລວມ$$, $$ດຶງບົດຮຽນຈິງໜຶ່ງອັນທີ່ຈັບຕ້ອງໄດ້ຈາກສິ່ງທີ່ເກີດຂຶ້ນ$$, $$ໃຫ້ໄລຍະເວລາທີ່ຈຳກັດແທ້ກ່ອນກ້າວຕໍ່ໄປ$$],
    4, false, 46
  ),
  (
    $$decide-when-its-time-to-change-jobs$$,
    $$Decide when it's really time to change jobs$$,
    $$ຕັດສິນໃຈວ່າຮອດເວລາປ່ຽນວຽກແທ້ບໍ່$$,
    $$A bad week is different from a bad pattern — look at trends, not a single moment.$$,
    $$ອາທິດທີ່ບໍ່ດີ ຕ່າງຈາກຮູບແບບທີ່ບໍ່ດີ — ເບິ່ງແນວໂນ້ມ ບໍ່ແມ່ນຊ່ວງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Look for a pattern, not one bad day$$, 'body', $$A single frustrating week doesn't mean much — a consistent pattern of dread or stagnation over months does.$$),
      jsonb_build_object('heading', $$Check if the problem is fixable where you are$$, 'body', $$Sometimes a direct conversation about role, workload, or growth can resolve the issue without needing to leave.$$),
      jsonb_build_object('heading', $$Weigh growth stagnation seriously$$, 'body', $$If you've stopped learning and see no path to grow, that's often a stronger signal to leave than dissatisfaction alone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາຮູບແບບ ບໍ່ແມ່ນວັນດຽວ$$, 'body', $$ອາທິດທີ່ອຶດອັດຄັ້ງດຽວ ບໍ່ໄດ້ໝາຍຄວາມຫຍັງຫຼາຍ — ຮູບແບບຄວາມກົດດັນ ຫຼືຄວາມຢຸດຊະງັກທີ່ຄົງທີ່ຫຼາຍເດືອນ ໝາຍຄວາມຫຼາຍກວ່າ.$$),
      jsonb_build_object('heading', $$ກວດວ່າແກ້ໄຂໄດ້ບ່ອນເກົ່າບໍ່$$, 'body', $$ບາງຄັ້ງການລົມກົງໆເລື່ອງບົດບາດ, ວຽກ ຫຼືການເຕີບໂຕ ອາດແກ້ບັນຫາໄດ້ໂດຍບໍ່ຕ້ອງອອກ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມສຳຄັນກັບການຢຸດຊະງັກການເຕີບໂຕ$$, 'body', $$ຖ້າຢຸດຮຽນຮູ້ ແລະ ບໍ່ເຫັນທາງເຕີບໂຕ ນັ້ນມັກເປັນສັນຍານໃຫ້ອອກທີ່ໜັກແໜ້ນກວ່າຄວາມບໍ່ພໍໃຈຢ່າງດຽວ.$$)
    ),
    array[$$Look for a consistent pattern, not a single bad day$$, $$Check whether the problem could be fixed where you are$$, $$Take growth stagnation as a serious signal to leave$$],
    array[$$ຫາຮູບແບບຄົງທີ່ ບໍ່ແມ່ນວັນດຽວ$$, $$ກວດວ່າບັນຫາແກ້ໄດ້ບ່ອນເກົ່າບໍ່$$, $$ໃຫ້ຄວາມສຳຄັນກັບການຢຸດຊະງັກການເຕີບໂຕເປັນສັນຍານໜັກແໜ້ນ$$],
    4, false, 47
  ),
  (
    $$understand-your-rights-as-an-employee$$,
    $$Understand your basic rights and protections as an employee$$,
    $$ເຂົ້າໃຈສິດ ແລະ ການປົກປ້ອງພື້ນຖານໃນຖານະລູກຈ້າງ$$,
    $$Knowing what's actually written in your contract and local labor rules protects you before problems arise.$$,
    $$ການຮູ້ວ່າສັນຍາ ແລະ ກົດໝາຍແຮງງານທ້ອງຖິ່ນລະບຸຫຍັງແທ້ ປົກປ້ອງທ່ານກ່ອນເກີດບັນຫາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Read your contract fully before signing$$, 'body', $$Understand your working hours, leave policy, and termination terms in writing, not just what was said verbally.$$),
      jsonb_build_object('heading', $$Know where to find official local labor rules$$, 'body', $$Local labor ministries or official government sites publish the actual rules on minimum wage, overtime, and leave — check the primary source.$$),
      jsonb_build_object('heading', $$Keep your own records$$, 'body', $$Save copies of your contract, pay slips, and important written communications — your own records are your best protection.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອ່ານສັນຍາໃຫ້ຄົບກ່ອນເຊັນ$$, 'body', $$ເຂົ້າໃຈຊົ່ວໂມງເຮັດວຽກ, ນະໂຍບາຍວັນພັກ ແລະ ເງື່ອນໄຂການສິ້ນສຸດວຽກເປັນລາຍລັກອັກສອນ ບໍ່ແມ່ນແຕ່ຄຳເວົ້າ.$$),
      jsonb_build_object('heading', $$ຮູ້ວ່າຫາກົດແຮງງານທາງການໄດ້ຢູ່ໃສ$$, 'body', $$ກະຊວງແຮງງານ ຫຼືເວັບໄຊລັດຖະບານທາງການ ເຜີຍແຜ່ກົດຈິງກ່ຽວກັບຄ່າແຮງຂັ້ນຕ່ຳ, ໂອທີ ແລະ ວັນພັກ — ກວດຈາກແຫຼ່ງຕົ້ນສະບັບ.$$),
      jsonb_build_object('heading', $$ເກັບບັນທຶກຂອງທ່ານເອງ$$, 'body', $$ເກັບສຳເນົາສັນຍາ, ໃບເງິນເດືອນ ແລະ ຂໍ້ຄວາມສຳຄັນ — ບັນທຶກຂອງທ່ານເອງເປັນການປົກປ້ອງທີ່ດີທີ່ສຸດ.$$)
    ),
    array[$$Read your full contract in writing before signing$$, $$Check official local labor rules directly from the source$$, $$Keep your own copies of contracts and pay records$$],
    array[$$ອ່ານສັນຍາເຕັມເປັນລາຍລັກອັກສອນກ່ອນເຊັນ$$, $$ກວດກົດແຮງງານທາງການໂດຍກົງຈາກແຫຼ່ງຕົ້ນສະບັບ$$, $$ເກັບສຳເນົາສັນຍາ ແລະ ບັນທຶກເງິນເດືອນຂອງທ່ານເອງ$$],
    5, false, 48
  ),
  (
    $$prepare-a-30-60-90-day-plan$$,
    $$Prepare a 30-60-90 day plan for a new job$$,
    $$ກຽມແຜນ 30-60-90 ວັນສຳລັບວຽກໃໝ່$$,
    $$A phased plan shows new employers you think strategically from day one.$$,
    $$ແຜນເປັນຂັ້ນຕອນ ສະແດງໃຫ້ນາຍຈ້າງໃໝ່ເຫັນວ່າທ່ານຄິດຢ່າງມີກົນລະຍຸດຕັ້ງແຕ່ມື້ທຳອິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$First 30 days: learn$$, 'body', $$Focus on understanding people, processes, and expectations — resist the urge to make big changes before you understand the full picture.$$),
      jsonb_build_object('heading', $$Days 31-60: contribute$$, 'body', $$Start taking on real tasks and offering ideas, now grounded in the context you built in the first month.$$),
      jsonb_build_object('heading', $$Days 61-90: show measurable impact$$, 'body', $$Aim to deliver one visible result by day 90 that demonstrates you're already adding real value.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$30 ວັນທຳອິດ: ຮຽນຮູ້$$, 'body', $$ສຸມໃສ່ການເຂົ້າໃຈຄົນ, ຂະບວນການ ແລະ ຄວາມຄາດຫວັງ — ຕ້ານຄວາມຢາກປ່ຽນແປງໃຫຍ່ກ່ອນເຂົ້າໃຈພາບລວມ.$$),
      jsonb_build_object('heading', $$ວັນ 31-60: ປະກອບສ່ວນ$$, 'body', $$ເລີ່ມຮັບວຽກຈິງ ແລະ ສະເໜີແນວຄິດ ໂດຍອີງໃສ່ບໍລິບົດທີ່ສ້າງໄວ້ໃນເດືອນທຳອິດ.$$),
      jsonb_build_object('heading', $$ວັນ 61-90: ສະແດງຜົນກະທົບທີ່ວັດແທກໄດ້$$, 'body', $$ຕັ້ງເປົ້າໃຫ້ຜົນລັບທີ່ເຫັນໄດ້ໜຶ່ງອັນພາຍໃນວັນທີ 90 ເພື່ອສະແດງວ່າກຳລັງເພີ່ມຄຸນຄ່າແທ້ຈິງ.$$)
    ),
    array[$$Focus the first 30 days on genuinely learning the context$$, $$Start contributing real work and ideas in days 31-60$$, $$Aim for one visible, measurable result by day 90$$],
    array[$$ສຸມ 30 ວັນທຳອິດໃສ່ການຮຽນຮູ້ບໍລິບົດແທ້$$, $$ເລີ່ມປະກອບສ່ວນວຽກ ແລະ ແນວຄິດຈິງໃນວັນ 31-60$$, $$ຕັ້ງເປົ້າຜົນລັບທີ່ເຫັນໄດ້ ແລະ ວັດແທກໄດ້ພາຍໃນວັນທີ 90$$],
    5, false, 49
  ),
  (
    $$build-cross-cultural-communication-skills$$,
    $$Build cross-cultural communication skills for global teams$$,
    $$ສ້າງທັກສະການສື່ສານຂ້າມວັດທະນະທຳສຳລັບທີມນານາຊາດ$$,
    $$What counts as polite, direct, or professional varies across cultures — awareness prevents real misunderstandings.$$,
    $$ສິ່ງທີ່ນັບວ່າສຸພາບ, ກົງໄປກົງມາ ຫຼືເປັນມືອາຊີບ ຕ່າງກັນຕາມວັດທະນະທຳ — ຄວາມຮັບຮູ້ນີ້ປ້ອງກັນຄວາມເຂົ້າໃຈຜິດຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Notice differences in directness$$, 'body', $$Some cultures value very direct feedback, others prefer softer, indirect phrasing — adjust your delivery to your audience.$$),
      jsonb_build_object('heading', $$Ask rather than assume$$, 'body', $$When unsure how something will land, a simple "how would you prefer I raise this?" avoids unintentional offense.$$),
      jsonb_build_object('heading', $$Give extra clarity in writing across time zones$$, 'body', $$Async written communication loses tone easily — be extra explicit about intent and urgency when working across time zones.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັງເກດຄວາມແຕກຕ່າງໃນຄວາມກົງໄປກົງມາ$$, 'body', $$ບາງວັດທະນະທຳໃຫ້ຄຸນຄ່າກັບຄຳຄິດເຫັນທີ່ກົງໄປກົງມາຫຼາຍ, ບາງອັນມັກຄຳເວົ້າອ້ອມແອ້ມກວ່າ — ປັບການສື່ສານໃຫ້ເໝາະກັບຜູ້ຟັງ.$$),
      jsonb_build_object('heading', $$ຖາມແທນການສົມມຸດ$$, 'body', $$ເມື່ອບໍ່ແນ່ໃຈວ່າຈະຮັບຮູ້ແນວໃດ ຄຳຖາມງ່າຍໆ "ຢາກໃຫ້ຂ້ອຍເລົ່າເລື່ອງນີ້ແນວໃດ" ຫຼີກລ້ຽງການເຮັດໃຫ້ຂຸ່ນເຄືອງໂດຍບໍ່ຕັ້ງໃຈ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມຊັດເຈນເພີ່ມໃນການຂຽນຂ້າມເຂດເວລາ$$, 'body', $$ການສື່ສານທາງຂຽນແບບບໍ່ພ້ອມກັນ ເສຍນ້ຳສຽງໄດ້ງ່າຍ — ໃຫ້ຊັດເຈນເພີ່ມກ່ຽວກັບຈຸດປະສົງ ແລະ ຄວາມດ່ວນເມື່ອເຮັດວຽກຂ້າມເຂດເວລາ.$$)
    ),
    array[$$Notice cultural differences in how direct feedback is given$$, $$Ask how someone prefers to receive something rather than assuming$$, $$Be extra explicit in writing when working across time zones$$],
    array[$$ສັງເກດຄວາມແຕກຕ່າງທາງວັດທະນະທຳໃນການໃຫ້ຄຳຄິດເຫັນ$$, $$ຖາມແທນການສົມມຸດວ່າຄົນຢາກຮັບຮູ້ແນວໃດ$$, $$ໃຫ້ຄວາມຊັດເຈນເພີ່ມໃນການຂຽນເມື່ອເຮັດວຽກຂ້າມເຂດເວລາ$$],
    5, false, 50
  ),
  (
    $$turn-an-internship-into-a-full-time-offer$$,
    $$Turn an internship into a full-time offer$$,
    $$ປ່ຽນການຝຶກງານໃຫ້ເປັນຂໍ້ສະເໜີວຽກເຕັມເວລາ$$,
    $$Treat every internship task as an audition, and make your interest in staying explicit.$$,
    $$ຖືວ່າທຸກວຽກຝຶກງານເປັນການທົດສອບ ແລະ ບອກຄວາມສົນໃຈຢາກຢູ່ຕໍ່ຢ່າງຈະແຈ້ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Treat every task as an audition$$, 'body', $$Even small, routine tasks are being watched — consistent reliability on the boring stuff builds real trust.$$),
      jsonb_build_object('heading', $$Say directly that you're interested in staying$$, 'body', $$Don't assume it's obvious — tell your manager clearly, partway through, that you'd love to continue if there's an opportunity.$$),
      jsonb_build_object('heading', $$Ask for feedback partway through$$, 'body', $$Requesting a mid-point check-in gives you time to adjust before the final evaluation, rather than finding out too late.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖືວ່າທຸກວຽກເປັນການທົດສອບ$$, 'body', $$ແມ່ນແຕ່ວຽກນ້ອຍ ແລະ ຊ້ຳໆ ກໍ່ຖືກສັງເກດ — ຄວາມໜ້າເຊື່ອຖືສະໝ່ຳສະເໝີໃນວຽກທຳມະດາ ສ້າງຄວາມໄວ້ໃຈແທ້ຈິງ.$$),
      jsonb_build_object('heading', $$ບອກໂດຍກົງວ່າສົນໃຈຢູ່ຕໍ່$$, 'body', $$ຢ່າສົມມຸດວ່າມັນຊັດເຈນຢູ່ແລ້ວ — ບອກຫົວໜ້າຢ່າງຊັດເຈນກາງໄລຍະການຝຶກງານ ວ່າຢາກຢູ່ຕໍ່ຖ້າມີໂອກາດ.$$),
      jsonb_build_object('heading', $$ຂໍຄຳຄິດເຫັນກາງໄລຍະ$$, 'body', $$ການຂໍປະເມີນກາງໄລຍະ ໃຫ້ເວລາປັບປຸງກ່ອນການປະເມີນສຸດທ້າຍ ແທນທີ່ຈະຮູ້ຊ້າເກີນໄປ.$$)
    ),
    array[$$Treat every task, even small ones, as an audition$$, $$Directly tell your manager you'd like to stay on$$, $$Ask for feedback partway through to adjust in time$$],
    array[$$ຖືວ່າທຸກວຽກ ແມ່ນແຕ່ອັນນ້ອຍ ເປັນການທົດສອບ$$, $$ບອກຫົວໜ້າໂດຍກົງວ່າຢາກຢູ່ຕໍ່$$, $$ຂໍຄຳຄິດເຫັນກາງໄລຍະເພື່ອປັບປຸງທັນເວລາ$$],
    4, false, 51
  ),
  (
    $$handle-competing-job-offers-gracefully$$,
    $$Handle competing job offers gracefully$$,
    $$ຮັບມືຫຼາຍຂໍ້ສະເໜີວຽກພ້ອມກັນຢ່າງມີໄຫວພິບ$$,
    $$Being honest and organized with multiple employers protects your reputation on all sides.$$,
    $$ຄວາມຊື່ສັດ ແລະ ເປັນລະບຽບກັບຫຼາຍນາຍຈ້າງ ປົກປ້ອງຊື່ສຽງຂອງທ່ານທຸກຝ່າຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for reasonable extra time$$, 'body', $$"I have another process nearly finished — could I have until [date] to decide?" is a normal, professional request.$$),
      jsonb_build_object('heading', $$Don't reveal specific numbers between employers$$, 'body', $$You can mention you have another offer without disclosing the exact figure — this keeps your negotiating position sound.$$),
      jsonb_build_object('heading', $$Decline the others promptly and kindly$$, 'body', $$Once you decide, tell the other employers quickly and graciously — you may cross paths with them again in the future.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍເວລາເພີ່ມທີ່ສົມເຫດສົມຜົນ$$, 'body', $$"ຂ້ອຍມີຂະບວນການອື່ນທີ່ໃກ້ຈົບ — ຂໍເວລາເຖິງ [ວັນທີ] ເພື່ອຕັດສິນໃຈໄດ້ບໍ່" ເປັນຄຳຂໍທຳມະດາ ແລະ ເປັນມືອາຊີບ.$$),
      jsonb_build_object('heading', $$ຢ່າເປີດເຜີຍຕົວເລກສະເພາະລະຫວ່າງນາຍຈ້າງ$$, 'body', $$ສາມາດເວົ້າວ່າມີຂໍ້ສະເໜີອື່ນໄດ້ ໂດຍບໍ່ຕ້ອງບອກຕົວເລກແທ້ — ຮັກສາຈຸດຢືນການຕໍ່ລອງໃຫ້ໝັ້ນຄົງ.$$),
      jsonb_build_object('heading', $$ປະຕິເສດອັນອື່ນຢ່າງໄວ ແລະ ສຸພາບ$$, 'body', $$ເມື່ອຕັດສິນໃຈແລ້ວ ໃຫ້ບອກນາຍຈ້າງອື່ນໄວ ແລະ ດ້ວຍຄວາມສຸພາບ — ອາດພົບກັນອີກໃນອະນາຄົດ.$$)
    ),
    array[$$Ask for reasonable extra decision time honestly$$, $$Don't disclose exact figures between competing employers$$, $$Decline other offers promptly and graciously$$],
    array[$$ຂໍເວລາຕັດສິນໃຈເພີ່ມຢ່າງຊື່ສັດ$$, $$ຢ່າເປີດເຜີຍຕົວເລກແທ້ລະຫວ່າງນາຍຈ້າງທີ່ແຂ່ງຂັນກັນ$$, $$ປະຕິເສດຂໍ້ສະເໜີອື່ນຢ່າງໄວ ແລະ ສຸພາບ$$],
    4, false, 52
  ),
  (
    $$build-a-career-while-working-remotely$$,
    $$Build a strong career while working remotely$$,
    $$ສ້າງອາຊີບທີ່ເຂັ້ມແຂງເຖິງເຮັດວຽກທາງໄກ$$,
    $$Visibility takes extra effort remotely — you have to make your work and growth known deliberately.$$,
    $$ການເປັນທີ່ຮັບຮູ້ຕ້ອງໃຊ້ຄວາມພະຍາຍາມເພີ່ມເມື່ອເຮັດວຽກທາງໄກ — ຕ້ອງເຮັດໃຫ້ວຽກ ແລະ ການເຕີບໂຕເປັນທີ່ຮູ້ຢ່າງຕັ້ງໃຈ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Over-communicate your progress$$, 'body', $$Share short, regular updates on what you're working on — remote managers can't see your effort unless you make it visible.$$),
      jsonb_build_object('heading', $$Turn camera on for important meetings$$, 'body', $$Being visible on video during key discussions builds presence and rapport that pure chat messages don't provide.$$),
      jsonb_build_object('heading', $$Schedule regular one-on-ones$$, 'body', $$Don't wait for your manager to initiate — proactively request regular check-ins to discuss progress and growth.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສື່ສານຄວາມຄືບໜ້າໃຫ້ຫຼາຍຂຶ້ນ$$, 'body', $$ແບ່ງປັນອັບເດດສັ້ນ ແລະ ປົກກະຕິກ່ຽວກັບສິ່ງທີ່ກຳລັງເຮັດ — ຫົວໜ້າທາງໄກເບິ່ງບໍ່ເຫັນຄວາມພະຍາຍາມ ນອກຈາກທ່ານເຮັດໃຫ້ເຫັນ.$$),
      jsonb_build_object('heading', $$ເປີດກ້ອງໃນກອງປະຊຸມສຳຄັນ$$, 'body', $$ການເຫັນຕົວທາງວິດີໂອໃນການສົນທະນາສຳຄັນ ສ້າງການມີຕົວຕົນ ແລະ ຄວາມສະໜິດທີ່ຂໍ້ຄວາມແຊັດຢ່າງດຽວໃຫ້ບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ນັດການລົມສ່ວນຕົວປົກກະຕິ$$, 'body', $$ຢ່າລໍຖ້າໃຫ້ຫົວໜ້າເລີ່ມ — ຮ້ອງຂໍການລົມສ່ວນຕົວປົກກະຕິເອງ ເພື່ອປຶກສາຄວາມຄືບໜ້າ ແລະ ການເຕີບໂຕ.$$)
    ),
    array[$$Share short, regular updates to make your work visible$$, $$Turn your camera on for important video meetings$$, $$Proactively schedule regular one-on-ones with your manager$$],
    array[$$ແບ່ງປັນອັບເດດສັ້ນ ແລະ ປົກກະຕິເພື່ອໃຫ້ວຽກເປັນທີ່ຮັບຮູ້$$, $$ເປີດກ້ອງໃນກອງປະຊຸມວິດີໂອທີ່ສຳຄັນ$$, $$ຮ້ອງຂໍການລົມສ່ວນຕົວກັບຫົວໜ້າຢ່າງປົກກະຕິດ້ວຍຕົນເອງ$$],
    5, false, 53
  ),
  (
    $$learn-from-a-performance-review$$,
    $$Get the most out of a performance review$$,
    $$ໄດ້ຮັບປະໂຫຍດສູງສຸດຈາກການປະເມີນຜົນງານ$$,
    $$A review is most useful when you come with your own reflection, not just waiting to be told.$$,
    $$ການປະເມີນເປັນປະໂຫຍດທີ່ສຸດເມື່ອທ່ານມາພ້ອມການສະທ້ອນຂອງຕົນເອງ ບໍ່ແມ່ນລໍຖ້າໃຫ້ບອກຢ່າງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Prepare your own self-assessment first$$, 'body', $$List your own wins and growth areas before the meeting — this shapes a more balanced, two-way conversation.$$),
      jsonb_build_object('heading', $$Ask for specific examples, not vague labels$$, 'body', $$If feedback feels general, ask "could you give me an example of when that happened?" to make it actionable.$$),
      jsonb_build_object('heading', $$Leave with a written action plan$$, 'body', $$Summarize two or three specific things you'll work on before the review ends, so growth areas turn into real next steps.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຽມການປະເມີນຕົນເອງກ່ອນ$$, 'body', $$ຂຽນຄວາມສຳເລັດ ແລະ ດ້ານທີ່ຕ້ອງພັດທະນາຂອງຕົນເອງກ່ອນການປະຊຸມ — ນີ້ສ້າງການສົນທະນາທີ່ສົມດຸນ ແລະ ສອງທາງກວ່າ.$$),
      jsonb_build_object('heading', $$ຂໍຕົວຢ່າງສະເພາະ ບໍ່ແມ່ນປ້າຍທົ່ວໄປ$$, 'body', $$ຖ້າຄຳຄິດເຫັນຮູ້ສຶກທົ່ວໄປ ໃຫ້ຖາມ "ຂໍຕົວຢ່າງເວລາທີ່ມັນເກີດຂຶ້ນໄດ້ບໍ່" ເພື່ອໃຫ້ນຳໄປປະຕິບັດໄດ້.$$),
      jsonb_build_object('heading', $$ອອກໄປພ້ອມແຜນປະຕິບັດທີ່ຂຽນໄວ້$$, 'body', $$ສະຫຼຸບ 2-3 ສິ່ງສະເພາະທີ່ຈະປັບປຸງກ່ອນຈົບການປະຊຸມ ເພື່ອໃຫ້ດ້ານທີ່ຕ້ອງພັດທະນາກາຍເປັນຂັ້ນຕອນຕໍ່ໄປແທ້.$$)
    ),
    array[$$Prepare your own honest self-assessment beforehand$$, $$Ask for specific examples behind general feedback$$, $$Leave with a written, specific action plan$$],
    array[$$ກຽມການປະເມີນຕົນເອງຢ່າງຊື່ສັດກ່ອນ$$, $$ຂໍຕົວຢ່າງສະເພາະທີ່ຢູ່ເບື້ອງຫຼັງຄຳຄິດເຫັນທົ່ວໄປ$$, $$ອອກໄປພ້ອມແຜນປະຕິບັດສະເພາະທີ່ຂຽນໄວ້$$],
    5, false, 54
  ),
  (
    $$set-boundaries-between-work-and-personal-life$$,
    $$Set clear boundaries between work and personal life$$,
    $$ຕັ້ງຂອບເຂດທີ່ຊັດເຈນລະຫວ່າງວຽກ ແລະ ຊີວິດສ່ວນຕົວ$$,
    $$Boundaries you state clearly and hold consistently are respected far more than ones you only imply.$$,
    $$ຂອບເຂດທີ່ບອກຢ່າງຊັດເຈນ ແລະ ຮັກສາຢ່າງສະໝ່ຳສະເໝີ ໄດ້ຮັບການເຄົາລົບຫຼາຍກວ່າອັນທີ່ພຽງແຕ່ບອກເປັນນັຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State the boundary plainly$$, 'body', $$"I'm offline after 7pm on weekdays" is clearer and easier to respect than hoping people will just notice a pattern.$$),
      jsonb_build_object('heading', $$Hold it consistently yourself first$$, 'body', $$If you reply to messages at midnight, others will expect the same — your own consistency sets the real standard.$$),
      jsonb_build_object('heading', $$Revisit boundaries as life changes$$, 'body', $$What worked before a promotion or a new life stage might need adjusting — boundaries aren't set once and forgotten.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຂອບເຂດຢ່າງກົງໄປກົງມາ$$, 'body', $$"ຂ້ອຍອອຟລາຍຫຼັງ 7 ໂມງແລງໃນວັນທຳການ" ຊັດເຈນ ແລະ ເຄົາລົບງ່າຍກວ່າຫວັງໃຫ້ຄົນສັງເກດຮູບແບບເອງ.$$),
      jsonb_build_object('heading', $$ຮັກສາໄວ້ຢ່າງສະໝ່ຳສະເໝີດ້ວຍຕົນເອງກ່ອນ$$, 'body', $$ຖ້າຕອບຂໍ້ຄວາມຕອນທ່ຽງຄືນ ຄົນອື່ນຈະຄາດຫວັງແບບດຽວກັນ — ຄວາມສະໝ່ຳສະເໝີຂອງທ່ານເອງຕັ້ງມາດຕະຖານແທ້.$$),
      jsonb_build_object('heading', $$ທົບທວນຂອບເຂດເມື່ອຊີວິດປ່ຽນແປງ$$, 'body', $$ສິ່ງທີ່ໄດ້ຜົນກ່ອນການເລື່ອນຕຳແໜ່ງ ຫຼືຊ່ວງຊີວິດໃໝ່ ອາດຕ້ອງປັບ — ຂອບເຂດບໍ່ໄດ້ຕັ້ງຄັ້ງດຽວແລ້ວລືມ.$$)
    ),
    array[$$State your boundary plainly instead of implying it$$, $$Hold the boundary consistently yourself to set the standard$$, $$Revisit and adjust boundaries as your life changes$$],
    array[$$ບອກຂອບເຂດຢ່າງກົງໄປກົງມາ ແທນການບອກເປັນນັຍ$$, $$ຮັກສາຂອບເຂດຢ່າງສະໝ່ຳສະເໝີດ້ວຍຕົນເອງເພື່ອຕັ້ງມາດຕະຖານ$$, $$ທົບທວນ ແລະ ປັບຂອບເຂດເມື່ອຊີວິດປ່ຽນແປງ$$],
    4, false, 55
  ),
  (
    $$find-the-right-mentor-community$$,
    $$Find the right career community or mentor group$$,
    $$ຫາຊຸມຊົນອາຊີບ ຫຼືກຸ່ມທີ່ປຶກສາທີ່ເໝາະສົມ$$,
    $$A group of peers facing similar challenges can offer support a single mentor can't provide alone.$$,
    $$ກຸ່ມເພື່ອນຮ່ວມທາງທີ່ພົບສິ່ງທ້າທາຍຄ້າຍກັນ ໃຫ້ການສະໜັບສະໜູນທີ່ທີ່ປຶກສາຄົນດຽວໃຫ້ບໍ່ໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Look for active, specific communities$$, 'body', $$A group focused on your exact field or career stage, with real ongoing activity, is more useful than a broad, quiet one.$$),
      jsonb_build_object('heading', $$Participate before expecting help$$, 'body', $$Answer others' questions and share your own experience first — active members get more genuine support back.$$),
      jsonb_build_object('heading', $$Build a few real relationships, not just a feed$$, 'body', $$Message individual members directly rather than only passively reading posts — real relationships form one conversation at a time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊອກຫາຊຸມຊົນທີ່ມີການເຄື່ອນໄຫວ ແລະ ສະເພາະ$$, 'body', $$ກຸ່ມທີ່ສຸມໃສ່ສາຍງານ ຫຼືຊ່ວງອາຊີບຂອງທ່ານແທ້ໆ ພ້ອມການເຄື່ອນໄຫວຈິງ ເປັນປະໂຫຍດຫຼາຍກວ່າກຸ່ມກວ້າງທີ່ງຽບ.$$),
      jsonb_build_object('heading', $$ມີສ່ວນຮ່ວມກ່ອນຄາດຫວັງຄວາມຊ່ວຍເຫຼືອ$$, 'body', $$ຕອບຄຳຖາມຄົນອື່ນ ແລະ ແບ່ງປັນປະສົບການຂອງທ່ານກ່ອນ — ສະມາຊິກທີ່ມີສ່ວນຮ່ວມ ໄດ້ຮັບການສະໜັບສະໜູນຈິງໃຈກັບຄືນຫຼາຍກວ່າ.$$),
      jsonb_build_object('heading', $$ສ້າງຄວາມສຳພັນຈິງບາງອັນ ບໍ່ແມ່ນແຕ່ອ່ານຟີດ$$, 'body', $$ສົ່ງຂໍ້ຄວາມຫາສະມາຊິກເປັນລາຍບຸກຄົນ ແທນທີ່ຈະອ່ານໂພສຢ່າງດຽວ — ຄວາມສຳພັນຈິງເກີດຂຶ້ນເທື່ອລະການສົນທະນາ.$$)
    ),
    array[$$Look for an active community specific to your field$$, $$Participate and give before expecting support back$$, $$Message individuals directly to build real relationships$$],
    array[$$ຊອກຫາຊຸມຊົນທີ່ມີການເຄື່ອນໄຫວ ແລະ ສະເພາະສາຍງານ$$, $$ມີສ່ວນຮ່ວມ ແລະ ໃຫ້ກ່ອນຄາດຫວັງການສະໜັບສະໜູນ$$, $$ສົ່ງຂໍ້ຄວາມຫາລາຍບຸກຄົນເພື່ອສ້າງຄວາມສຳພັນຈິງ$$],
    4, false, 56
  ),
  (
    $$freelancing-vs-full-time-tradeoffs$$,
    $$Understand freelancing vs. full-time employment trade-offs$$,
    $$ເຂົ້າໃຈຂໍ້ແລກປ່ຽນລະຫວ່າງການເປັນຟຣີແລນ ແລະ ພະນັກງານເຕັມເວລາ$$,
    $$Freedom and flexibility come with income variability and extra responsibilities most jobs handle for you.$$,
    $$ອິດສະຫຼະ ແລະ ຄວາມຍືດຫຍຸ່ນ ມາພ້ອມກັບລາຍໄດ້ທີ່ບໍ່ຄົງທີ່ ແລະ ໜ້າທີ່ພິເສດທີ່ວຽກປະຈຳຈັດການໃຫ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Weigh income stability honestly$$, 'body', $$Freelance income can be unpredictable month to month — be honest about how much financial uncertainty you can handle.$$),
      jsonb_build_object('heading', $$Account for the hidden extra work$$, 'body', $$Freelancing means also handling your own taxes, invoicing, and finding clients — real work beyond the core craft.$$),
      jsonb_build_object('heading', $$Consider a gradual transition$$, 'body', $$Building freelance clients on the side before leaving a full-time job reduces the risk of the transition significantly.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊັ່ງນ້ຳໜັກຄວາມໝັ້ນຄົງລາຍໄດ້ຢ່າງຊື່ສັດ$$, 'body', $$ລາຍໄດ້ຟຣີແລນອາດບໍ່ແນ່ນອນແຕ່ລະເດືອນ — ຊື່ສັດວ່າຮັບຄວາມບໍ່ແນ່ນອນທາງການເງິນໄດ້ຫຼາຍປານໃດ.$$),
      jsonb_build_object('heading', $$ຄິດໄລ່ວຽກເພີ່ມທີ່ເບິ່ງບໍ່ເຫັນ$$, 'body', $$ການເປັນຟຣີແລນໝາຍເຖິງການຈັດການພາສີ, ໃບແຈ້ງໜີ້ ແລະ ຫາລູກຄ້າເອງ — ວຽກຈິງນອກເໜືອທັກສະຫຼັກ.$$),
      jsonb_build_object('heading', $$ພິຈາລະນາການປ່ຽນຜ່ານແບບຄ່ອຍເປັນຄ່ອຍໄປ$$, 'body', $$ສ້າງລູກຄ້າຟຣີແລນຄຽງຄູ່ກັບວຽກເຕັມເວລາກ່ອນອອກ ຫຼຸດຄວາມສ່ຽງຂອງການປ່ຽນຜ່ານໄດ້ຫຼາຍ.$$)
    ),
    array[$$Be honest about how much income variability you can handle$$, $$Freelancing includes real hidden work like taxes and invoicing$$, $$Consider building clients gradually before going full freelance$$],
    array[$$ຊື່ສັດວ່າຮັບຄວາມບໍ່ແນ່ນອນຂອງລາຍໄດ້ໄດ້ຫຼາຍປານໃດ$$, $$ຟຣີແລນມີວຽກເບິ່ງບໍ່ເຫັນຈິງ ເຊັ່ນ ພາສີ ແລະ ໃບແຈ້ງໜີ້$$, $$ພິຈາລະນາສ້າງລູກຄ້າຄ່ອຍເປັນຄ່ອຍໄປກ່ອນອອກເຕັມຕົວ$$],
    5, false, 57
  ),
  (
    $$prepare-for-tricky-interview-questions$$,
    $$Prepare answers for common tricky interview questions$$,
    $$ກຽມຄຳຕອບສຳລັບຄຳຖາມສຳພາດທີ່ຍາກ$$,
    $$Questions about weaknesses or gaps go smoother when you've genuinely thought them through beforehand.$$,
    $$ຄຳຖາມກ່ຽວກັບຈຸດອ່ອນ ຫຼືຊ່ວງຫວ່າງ ຜ່ານໄປໄດ້ດີກວ່າເມື່ອຄິດຮອບຄອບໄວ້ກ່ອນແທ້ໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Have a real, honest weakness ready$$, 'body', $$Pick a genuine area you're actively improving, and briefly describe the concrete steps you're taking on it.$$),
      jsonb_build_object('heading', $$Explain employment gaps factually$$, 'body', $$A brief, honest reason — caregiving, study, health, a tough job market — stated plainly is better than an awkward dodge.$$),
      jsonb_build_object('heading', $$Practice out loud, not just in your head$$, 'body', $$Saying tricky answers aloud a few times removes the awkward hesitation that shows up when you've only rehearsed silently.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຽມຈຸດອ່ອນທີ່ຈິງ ແລະ ຊື່ສັດໄວ້$$, 'body', $$ເລືອກຈຸດອ່ອນທີ່ກຳລັງພັດທະນາຢູ່ຈິງ ແລະ ອະທິບາຍຂັ້ນຕອນທີ່ກຳລັງເຮັດແບບສັ້ນໆ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍຊ່ວງຫວ່າງການເຮັດວຽກຕາມຄວາມຈິງ$$, 'body', $$ເຫດຜົນສັ້ນ ແລະ ຊື່ສັດ — ດູແລຄອບຄົວ, ຮຽນຕໍ່, ສຸຂະພາບ, ຕະຫຼາດແຮງງານຍາກ — ບອກຢ່າງກົງໄປກົງມາ ດີກວ່າການເວົ້າຫຼົບຫຼີກ.$$),
      jsonb_build_object('heading', $$ຝຶກອອກສຽງ ບໍ່ແມ່ນແຕ່ໃນຫົວ$$, 'body', $$ເວົ້າຄຳຕອບທີ່ຍາກອອກສຽງສອງສາມຄັ້ງ ລົບຄວາມລັງເລທີ່ປາກົດເມື່ອຝຶກແຕ່ໃນຫົວຢ່າງດຽວ.$$)
    ),
    array[$$Prepare a genuine weakness with concrete improvement steps$$, $$Explain employment gaps briefly and factually$$, $$Practice tricky answers out loud, not just mentally$$],
    array[$$ກຽມຈຸດອ່ອນທີ່ຈິງພ້ອມຂັ້ນຕອນປັບປຸງທີ່ຈັບຕ້ອງໄດ້$$, $$ອະທິບາຍຊ່ວງຫວ່າງການເຮັດວຽກແບບສັ້ນ ແລະ ຕາມຄວາມຈິງ$$, $$ຝຶກຄຳຕອບທີ່ຍາກອອກສຽງ ບໍ່ແມ່ນແຕ່ໃນຫົວ$$],
    5, false, 58
  ),
  (
    $$build-credibility-as-a-new-team-member$$,
    $$Build credibility as a new team member$$,
    $$ສ້າງຄວາມໜ້າເຊື່ອຖືໃນຖານະສະມາຊິກໃໝ່ຂອງທີມ$$,
    $$Trust is built through small, consistent reliability before it's built through big ideas.$$,
    $$ຄວາມໄວ້ໃຈສ້າງຂຶ້ນຈາກຄວາມໜ້າເຊື່ອຖືນ້ອຍໆທີ່ສະໝ່ຳສະເໝີ ກ່ອນສ້າງຈາກແນວຄິດໃຫຍ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Deliver small commitments reliably first$$, 'body', $$Show up on time, meet small deadlines, and follow through exactly as promised — this builds trust faster than big ambitious ideas early on.$$),
      jsonb_build_object('heading', $$Ask good questions before proposing changes$$, 'body', $$Understand why things are done a certain way before suggesting they change — questions build respect; premature criticism doesn't.$$),
      jsonb_build_object('heading', $$Give credit generously$$, 'body', $$Publicly acknowledging teammates' contributions early builds goodwill that pays off throughout your time on the team.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຮັດຄຳໝັ້ນສັນຍານ້ອຍໆໃຫ້ໄດ້ຈິງກ່ອນ$$, 'body', $$ມາຮອດຕາມເວລາ, ຮັກສາກຳນົດເວລານ້ອຍ ແລະ ເຮັດຕາມທີ່ສັນຍາແທ້ — ສ້າງຄວາມໄວ້ໃຈໄວກວ່າແນວຄິດໃຫຍ່ໆໃນຕອນຕົ້ນ.$$),
      jsonb_build_object('heading', $$ຖາມຄຳຖາມທີ່ດີກ່ອນສະເໜີການປ່ຽນແປງ$$, 'body', $$ເຂົ້າໃຈວ່າເປັນຫຍັງເຮັດແບບນັ້ນກ່ອນສະເໜີໃຫ້ປ່ຽນ — ຄຳຖາມສ້າງຄວາມເຄົາລົບ; ການວິຈານໄວເກີນໄປບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ໃຫ້ເຄຣດິດຢ່າງເຕັມໃຈ$$, 'body', $$ການຮັບຮູ້ຜົນງານຂອງເພື່ອນຮ່ວມທີມຢ່າງເປີດເຜີຍແຕ່ຕົ້ນ ສ້າງຄວາມສຳພັນທີ່ດີທີ່ໄດ້ຜົນຕະຫຼອດເວລາຢູ່ໃນທີມ.$$)
    ),
    array[$$Reliably deliver on small commitments before proposing big ideas$$, $$Ask questions to understand before suggesting changes$$, $$Give teammates credit for their contributions generously$$],
    array[$$ເຮັດຄຳໝັ້ນສັນຍານ້ອຍໃຫ້ໄດ້ຈິງກ່ອນສະເໜີແນວຄິດໃຫຍ່$$, $$ຖາມເພື່ອເຂົ້າໃຈກ່ອນສະເໜີການປ່ຽນແປງ$$, $$ໃຫ້ເຄຣດິດເພື່ອນຮ່ວມທີມຢ່າງເຕັມໃຈ$$],
    4, false, 59
  ),
  (
    $$plan-a-career-pivot-into-a-growing-field$$,
    $$Plan a career pivot into a growing field like tech$$,
    $$ວາງແຜນປ່ຽນສາຍອາຊີບໄປສາຍທີ່ກຳລັງເຕີບໂຕເຊັ່ນເທັກໂນໂລຊີ$$,
    $$A successful pivot usually starts small and part-time before it becomes your main focus.$$,
    $$ການປ່ຽນສາຍທີ່ສຳເລັດ ມັກເລີ່ມນ້ອຍ ແລະ ນອກເວລາ ກ່ອນຈະກາຍເປັນຈຸດສຸມຫຼັກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Test the field before fully committing$$, 'body', $$Take an introductory course or small project first to confirm you actually enjoy the day-to-day work, not just the idea of it.$$),
      jsonb_build_object('heading', $$Build in public as you learn$$, 'body', $$Share your learning progress and small projects openly — this creates a visible track record before you even apply anywhere.$$),
      jsonb_build_object('heading', $$Target roles that value your old field too$$, 'body', $$Look for roles that combine the new skill with your existing background — these are often easier entry points than starting from zero.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ທົດລອງສາຍງານກ່ອນຕັດສິນໃຈເຕັມທີ່$$, 'body', $$ລອງຮຽນຫຼັກສູດເບື້ອງຕົ້ນ ຫຼືໂຄງການນ້ອຍກ່ອນ ເພື່ອຢືນຢັນວ່າມ່ວນກັບວຽກປະຈຳວັນຈິງ ບໍ່ແມ່ນແຕ່ຄິດວ່າມ່ວນ.$$),
      jsonb_build_object('heading', $$ສ້າງແບບເປີດເຜີຍໃນຂະນະຮຽນຮູ້$$, 'body', $$ແບ່ງປັນຄວາມຄືບໜ້າການຮຽນ ແລະ ໂຄງການນ້ອຍຢ່າງເປີດເຜີຍ — ສ້າງປະຫວັດທີ່ເຫັນໄດ້ກ່ອນຈະສະໝັກວຽກຢູ່ໃສເລີຍ.$$),
      jsonb_build_object('heading', $$ເລັງຕຳແໜ່ງທີ່ໃຫ້ຄຸນຄ່າກັບສາຍງານເກົ່າເໝືອນກັນ$$, 'body', $$ຊອກຫາຕຳແໜ່ງທີ່ປະສົມທັກສະໃໝ່ກັບພື້ນຖານເດີມຂອງທ່ານ — ມັກເປັນຈຸດເລີ່ມທີ່ງ່າຍກວ່າການເລີ່ມຈາກສູນ.$$)
    ),
    array[$$Test the new field with a small project before fully committing$$, $$Share your learning progress publicly as you go$$, $$Target roles that value both your new and existing skills$$],
    array[$$ທົດລອງສາຍງານໃໝ່ດ້ວຍໂຄງການນ້ອຍກ່ອນຕັດສິນໃຈເຕັມທີ່$$, $$ແບ່ງປັນຄວາມຄືບໜ້າການຮຽນຢ່າງເປີດເຜີຍໄປພ້ອມກັນ$$, $$ເລັງຕຳແໜ່ງທີ່ໃຫ້ຄຸນຄ່າກັບທັກສະໃໝ່ ແລະ ພື້ນຖານເດີມ$$],
    5, false, 60
  ),
  (
    $$handle-networking-events-without-anxiety$$,
    $$Handle networking events without anxiety$$,
    $$ຮັບມືງານສ້າງເຄືອຂ່າຍໂດຍບໍ່ຕ້ອງກັງວົນ$$,
    $$A few prepared openers and a manageable goal make a crowded room far less intimidating.$$,
    $$ຄຳເປີດທີ່ກຽມໄວ້ ແລະ ເປົ້າໝາຍທີ່ເຮັດໄດ້ຈິງ ເຮັດໃຫ້ຫ້ອງທີ່ແອອັດໜ້າຢ້ານໜ້ອຍລົງຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a small, specific goal$$, 'body', $$"Have three real conversations" is far less overwhelming than "network effectively" — a concrete, small target is achievable.$$),
      jsonb_build_object('heading', $$Prepare two easy opening questions$$, 'body', $$"What brings you here tonight?" works almost anywhere and takes the pressure off thinking of something clever on the spot.$$),
      jsonb_build_object('heading', $$It's fine to exit a conversation politely$$, 'body', $$"It was great meeting you — I'm going to say hi to a few more people" is a normal, accepted way to move on.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັ້ງເປົ້າໝາຍນ້ອຍ ແລະ ສະເພາະ$$, 'body', $$"ລົມແທ້ 3 ຄັ້ງ" ໜ້າຢ້ານໜ້ອຍກວ່າ "ສ້າງເຄືອຂ່າຍໃຫ້ໄດ້ຜົນ" ຫຼາຍ — ເປົ້າໝາຍນ້ອຍ ແລະ ຈັບຕ້ອງໄດ້ ເຮັດໄດ້ຈິງ.$$),
      jsonb_build_object('heading', $$ກຽມສອງຄຳຖາມເປີດງ່າຍໆ$$, 'body', $$"ຫຍັງພາທ່ານມາງານນີ້" ໃຊ້ໄດ້ເກືອບທຸກບ່ອນ ແລະ ຫຼຸດຄວາມກົດດັນທີ່ຕ້ອງຄິດຫາຄຳສະຫຼາດຕອນນັ້ນ.$$),
      jsonb_build_object('heading', $$ອອກຈາກການລົມຢ່າງສຸພາບໄດ້$$, 'body', $$"ດີໃຈທີ່ໄດ້ຮູ້ຈັກ — ຂ້ອຍຈະໄປທັກທາຍຄົນອື່ນອີກແດ່" ເປັນວິທີກ້າວອອກທີ່ທຳມະດາ ແລະ ຍອມຮັບໄດ້.$$)
    ),
    array[$$Set a small, specific goal instead of "network effectively"$$, $$Prepare two easy opening questions to reduce pressure$$, $$It's normal to politely exit a conversation and move on$$],
    array[$$ຕັ້ງເປົ້າໝາຍນ້ອຍ ແລະ ສະເພາະ ແທນ "ສ້າງເຄືອຂ່າຍໃຫ້ໄດ້ຜົນ"$$, $$ກຽມສອງຄຳຖາມເປີດງ່າຍເພື່ອຫຼຸດຄວາມກົດດັນ$$, $$ການອອກຈາກການລົມຢ່າງສຸພາບເປັນເລື່ອງທຳມະດາ$$],
    4, false, 61
  ),
  (
    $$ask-for-flexible-work-arrangements$$,
    $$Ask for flexible work arrangements professionally$$,
    $$ຂໍການເຮັດວຽກແບບຍືດຫຍຸ່ນຢ່າງເປັນມືອາຊີບ$$,
    $$Frame the request around outcomes and trust, backed by a clear plan for how it will work.$$,
    $$ນຳສະເໜີຄຳຂໍໂດຍອີງໃສ່ຜົນລັບ ແລະ ຄວາມໄວ້ໃຈ ພ້ອມແຜນທີ່ຊັດເຈນວ່າຈະໄດ້ຜົນແນວໃດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Lead with how it benefits the work$$, 'body', $$Frame the request around continued or improved output, not just personal convenience — this makes it easier to say yes to.$$),
      jsonb_build_object('heading', $$Propose a specific trial period$$, 'body', $$"Could we try this for one month and reassess?" lowers the perceived risk for your manager to say yes.$$),
      jsonb_build_object('heading', $$Address availability concerns upfront$$, 'body', $$Proactively explain how you'll stay reachable for key meetings or urgent needs, addressing the objection before it's raised.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍວ່າມັນເປັນປະໂຫຍດຕໍ່ວຽກແນວໃດ$$, 'body', $$ນຳສະເໜີໂດຍອີງໃສ່ຜົນງານທີ່ຄົງທີ່ ຫຼືດີຂຶ້ນ ບໍ່ແມ່ນແຕ່ຄວາມສະດວກສ່ວນຕົວ — ເຮັດໃຫ້ຕົກລົງງ່າຍຂຶ້ນ.$$),
      jsonb_build_object('heading', $$ສະເໜີໄລຍະທົດລອງສະເພາະ$$, 'body', $$"ລອງເຮັດແບບນີ້ 1 ເດືອນແລ້ວປະເມີນຄືນໄດ້ບໍ່" ຫຼຸດຄວາມສ່ຽງທີ່ຫົວໜ້າຮູ້ສຶກໃນການຕົກລົງເຫັນດີ.$$),
      jsonb_build_object('heading', $$ຈັດການຄວາມກັງວົນເລື່ອງການເຂົ້າເຖິງແຕ່ຕົ້ນ$$, 'body', $$ອະທິບາຍລ່ວງໜ້າວ່າຈະຕິດຕໍ່ໄດ້ແນວໃດສຳລັບກອງປະຊຸມສຳຄັນ ຫຼືເລື່ອງດ່ວນ ເພື່ອຕອບຂໍ້ກັງວົນກ່ອນຖືກຍົກຂຶ້ນ.$$)
    ),
    array[$$Frame the request around work output, not just convenience$$, $$Propose a specific, low-risk trial period$$, $$Proactively address availability concerns upfront$$],
    array[$$ນຳສະເໜີໂດຍອີງໃສ່ຜົນງານ ບໍ່ແມ່ນແຕ່ຄວາມສະດວກ$$, $$ສະເໜີໄລຍະທົດລອງສະເພາະທີ່ຄວາມສ່ຽງຕ່ຳ$$, $$ຈັດການຄວາມກັງວົນເລື່ອງການເຂົ້າເຖິງລ່ວງໜ້າ$$],
    4, false, 62
  ),
  (
    $$build-a-case-for-promotion$$,
    $$Build a clear case for your own promotion$$,
    $$ສ້າງເຫດຜົນທີ່ຊັດເຈນສຳລັບການເລື່ອນຕຳແໜ່ງຂອງທ່ານເອງ$$,
    $$Waiting to be noticed rarely works as well as documenting your case yourself.$$,
    $$ການລໍຖ້າໃຫ້ຄົນອື່ນສັງເກດ ມັກໄດ້ຜົນບໍ່ດີເທົ່າກັບການບັນທຶກເຫດຜົນຂອງທ່ານເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Understand what the next level actually requires$$, 'body', $$Ask your manager directly what skills and scope of work define the next title, rather than guessing.$$),
      jsonb_build_object('heading', $$Document evidence you're already operating there$$, 'body', $$Keep specific examples showing you're already doing next-level work, not just hoping to be given the chance.$$),
      jsonb_build_object('heading', $$Have the direct conversation$$, 'body', $$Bring your documented case to your manager and ask directly about the timeline and path to promotion.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຂົ້າໃຈວ່າລະດັບຕໍ່ໄປຕ້ອງການຫຍັງແທ້$$, 'body', $$ຖາມຫົວໜ້າໂດຍກົງວ່າທັກສະ ແລະ ຂອບເຂດວຽກໃດກຳນົດຕຳແໜ່ງຕໍ່ໄປ ແທນທີ່ຈະເດົາເອງ.$$),
      jsonb_build_object('heading', $$ບັນທຶກຫຼັກຖານວ່າກຳລັງເຮັດລະດັບນັ້ນຢູ່ແລ້ວ$$, 'body', $$ເກັບຕົວຢ່າງສະເພາະທີ່ສະແດງວ່າກຳລັງເຮັດວຽກລະດັບຕໍ່ໄປຢູ່ແລ້ວ ບໍ່ແມ່ນແຕ່ຫວັງວ່າຈະໄດ້ໂອກາດ.$$),
      jsonb_build_object('heading', $$ລົມກັນໂດຍກົງ$$, 'body', $$ນຳຫຼັກຖານທີ່ບັນທຶກໄວ້ໄປລົມກັບຫົວໜ້າ ແລະ ຖາມໂດຍກົງກ່ຽວກັບກຳນົດເວລາ ແລະ ເສັ້ນທາງໄປສູ່ການເລື່ອນຕຳແໜ່ງ.$$)
    ),
    array[$$Ask your manager directly what the next level requires$$, $$Document specific evidence you're already operating there$$, $$Bring the case to a direct conversation about timeline$$],
    array[$$ຖາມຫົວໜ້າໂດຍກົງວ່າລະດັບຕໍ່ໄປຕ້ອງການຫຍັງ$$, $$ບັນທຶກຫຼັກຖານສະເພາະວ່າກຳລັງເຮັດລະດັບນັ້ນຢູ່ແລ້ວ$$, $$ນຳເຫດຜົນໄປລົມໂດຍກົງເລື່ອງກຳນົດເວລາ$$],
    5, false, 63
  ),
  (
    $$prepare-a-portfolio-for-creative-technical-roles$$,
    $$Prepare a portfolio for creative or technical roles$$,
    $$ກຽມແຟ້ມຜົນງານສຳລັບຕຳແໜ່ງງານດ້ານສ້າງສັນ ຫຼືເຕັກນິກ$$,
    $$A focused portfolio of your best work beats a large collection of average pieces.$$,
    $$ແຟ້ມຜົນງານທີ່ສຸມໃສ່ຜົນງານດີທີ່ສຸດ ດີກວ່າການເກັບຜົນງານທົ່ວໄປຈຳນວນຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Show your five to seven strongest pieces$$, 'body', $$Curate ruthlessly — a smaller collection of genuinely strong work makes a better impression than everything you've ever made.$$),
      jsonb_build_object('heading', $$Explain your process, not just the result$$, 'body', $$A short note on the problem, your approach, and the outcome shows how you think, which matters as much as the final piece.$$),
      jsonb_build_object('heading', $$Tailor the order to the role$$, 'body', $$Lead with the piece most relevant to the specific job you're applying for, not necessarily your personal favorite.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສະແດງ 5-7 ຜົນງານທີ່ດີທີ່ສຸດ$$, 'body', $$ຄັດເລືອກຢ່າງເຂັ້ມງວດ — ຜົນງານທີ່ດີແທ້ໆຈຳນວນໜ້ອຍ ໃຫ້ຄວາມປະທັບໃຈດີກວ່າທຸກອັນທີ່ເຄີຍເຮັດ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍຂະບວນການ ບໍ່ແມ່ນແຕ່ຜົນລັບ$$, 'body', $$ບັນທຶກສັ້ນໆກ່ຽວກັບບັນຫາ, ວິທີແກ້ ແລະ ຜົນລັບ ສະແດງວິທີຄິດຂອງທ່ານ ເຊິ່ງສຳຄັນເທົ່າກັບຜົນງານສຸດທ້າຍ.$$),
      jsonb_build_object('heading', $$ປັບລຳດັບໃຫ້ເໝາະກັບຕຳແໜ່ງ$$, 'body', $$ນຳສະເໜີຜົນງານທີ່ກ່ຽວຂ້ອງກັບຕຳແໜ່ງທີ່ສະໝັກທີ່ສຸດກ່ອນ ບໍ່ຈຳເປັນຕ້ອງເປັນອັນທີ່ມັກທີ່ສຸດ.$$)
    ),
    array[$$Curate five to seven genuinely strong pieces, not everything$$, $$Explain your process and thinking, not just the final result$$, $$Lead with the piece most relevant to the specific role$$],
    array[$$ຄັດເລືອກ 5-7 ຜົນງານທີ່ດີແທ້ໆ ບໍ່ແມ່ນທັງໝົດ$$, $$ອະທິບາຍຂະບວນການ ແລະ ວິທີຄິດ ບໍ່ແມ່ນແຕ່ຜົນລັບ$$, $$ນຳສະເໜີຜົນງານທີ່ກ່ຽວຂ້ອງກັບຕຳແໜ່ງທີ່ສຸດກ່ອນ$$],
    5, false, 64
  ),
  (
    $$write-a-cover-letter-that-complements-your-resume$$,
    $$Write a cover letter that complements, not repeats, your resume$$,
    $$ຂຽນຈົດໝາຍສະໝັກງານທີ່ເສີມ CV ບໍ່ແມ່ນຄັດລອກຄືນ$$,
    $$The cover letter's job is to explain the story behind your resume, not restate it.$$,
    $$ໜ້າທີ່ຂອງຈົດໝາຍສະໝັກງານຄືອະທິບາຍເລື່ອງລາວເບື້ອງຫຼັງ CV ບໍ່ແມ່ນເວົ້າຄືນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Tell the connecting story$$, 'body', $$Explain why your specific path led you to want this exact role — the "why" that a list of jobs on a resume can't show.$$),
      jsonb_build_object('heading', $$Pick one story, not a summary of everything$$, 'body', $$One specific, well-told example of relevant work is more convincing than a compressed summary of your whole resume.$$),
      jsonb_build_object('heading', $$Keep it under one page$$, 'body', $$Three to four short paragraphs is plenty — a long cover letter often signals you don't know what matters most.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລົ່າເລື່ອງລາວທີ່ເຊື່ອມໂຍງ$$, 'body', $$ອະທິບາຍວ່າເສັ້ນທາງສະເພາະຂອງທ່ານພາມາຢາກໄດ້ຕຳແໜ່ງນີ້ແທ້ໆແນວໃດ — "ເປັນຫຍັງ" ທີ່ລາຍການວຽກໃນ CV ບອກບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ເລືອກໜຶ່ງເລື່ອງລາວ ບໍ່ແມ່ນສະຫຼຸບທຸກຢ່າງ$$, 'body', $$ຕົວຢ່າງໜຶ່ງອັນທີ່ສະເພາະ ແລະ ເລົ່າໄດ້ດີ ໜ້າເຊື່ອຖືກວ່າການສະຫຼຸບ CV ທັງໝົດແບບຫຍໍ້.$$),
      jsonb_build_object('heading', $$ຮັກສາໃຫ້ບໍ່ເກີນໜຶ່ງໜ້າ$$, 'body', $$ສາມຫາສີ່ຫຍໍ້ໜ້າສັ້ນໆກໍ່ພຽງພໍ — ຈົດໝາຍທີ່ຍາວມັກສະແດງວ່າບໍ່ຮູ້ວ່າຫຍັງສຳຄັນທີ່ສຸດ.$$)
    ),
    array[$$Tell the story of why this specific role, not a resume repeat$$, $$Pick one strong example instead of summarizing everything$$, $$Keep the letter to three or four short paragraphs$$],
    array[$$ເລົ່າເລື່ອງລາວວ່າເປັນຫຍັງຢາກໄດ້ຕຳແໜ່ງນີ້ ບໍ່ແມ່ນເວົ້າ CV ຄືນ$$, $$ເລືອກໜຶ່ງຕົວຢ່າງທີ່ໜັກແໜ້ນ ແທນການສະຫຼຸບທຸກຢ່າງ$$, $$ຮັກສາຈົດໝາຍໃຫ້ບໍ່ເກີນສາມຫາສີ່ຫຍໍ້ໜ້າ$$],
    5, false, 65
  ),
  (
    $$choose-the-right-industry-for-you$$,
    $$Choose the right industry for you, not just a hot one$$,
    $$ເລືອກສາຍງານທີ່ເໝາະກັບທ່ານ ບໍ່ແມ່ນແຕ່ສາຍທີ່ກຳລັງນິຍົມ$$,
    $$A trending industry that doesn't fit your values or working style rarely leads to lasting satisfaction.$$,
    $$ສາຍງານທີ່ກຳລັງນິຍົມແຕ່ບໍ່ເໝາະກັບຄຸນຄ່າ ຫຼືວິທີເຮັດວຽກຂອງທ່ານ ມັກບໍ່ນຳໄປສູ່ຄວາມພໍໃຈໄລຍະຍາວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name what you actually value in work$$, 'body', $$Stability, creativity, helping people directly, fast growth — knowing your true priorities narrows industries fast.$$),
      jsonb_build_object('heading', $$Talk to people actually working in it$$, 'body', $$A short informational chat with someone in the field reveals the real daily texture that articles and rankings don't show.$$),
      jsonb_build_object('heading', $$Don't chase trends alone$$, 'body', $$A currently hot industry can cool, and a steady one can offer real long-term growth — look at genuine fit over hype.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸສິ່ງທີ່ໃຫ້ຄຸນຄ່າໃນວຽກແທ້$$, 'body', $$ຄວາມໝັ້ນຄົງ, ຄວາມສ້າງສັນ, ການຊ່ວຍຄົນໂດຍກົງ, ການເຕີບໂຕໄວ — ການຮູ້ຄວາມສຳຄັນຈິງຂອງທ່ານ ຊ່ວຍແຄບສາຍງານໄດ້ໄວ.$$),
      jsonb_build_object('heading', $$ລົມກັບຄົນທີ່ເຮັດວຽກໃນສາຍນັ້ນຈິງ$$, 'body', $$ການລົມສັ້ນໆກັບຄົນໃນສາຍງານນັ້ນ ເປີດເຜີຍຄວາມຈິງປະຈຳວັນທີ່ບົດຄວາມ ຫຼືອັນດັບບໍ່ໄດ້ສະແດງ.$$),
      jsonb_build_object('heading', $$ຢ່າໄລ່ຕາມກະແສຢ່າງດຽວ$$, 'body', $$ສາຍງານທີ່ນິຍົມຕອນນີ້ອາດເຢັນລົງ ແລະ ສາຍທີ່ໝັ້ນຄົງອາດໃຫ້ການເຕີບໂຕໄລຍະຍາວທີ່ແທ້ຈິງ — ເບິ່ງຄວາມເໝາະສົມແທ້ ບໍ່ແມ່ນແຕ່ກະແສ.$$)
    ),
    array[$$Name what you truly value in work before choosing an industry$$, $$Talk to real people already working in it$$, $$Look at genuine long-term fit, not just current hype$$],
    array[$$ລະບຸສິ່ງທີ່ໃຫ້ຄຸນຄ່າໃນວຽກແທ້ກ່ອນເລືອກສາຍງານ$$, $$ລົມກັບຄົນທີ່ເຮັດວຽກໃນສາຍນັ້ນຈິງ$$, $$ເບິ່ງຄວາມເໝາະສົມໄລຍະຍາວແທ້ ບໍ່ແມ່ນແຕ່ກະແສ$$],
    4, false, 66
  ),
  (
    $$handle-a-counteroffer-from-your-employer$$,
    $$Handle a counteroffer from your current employer$$,
    $$ຮັບມືຂໍ້ສະເໜີສະກັດຈາກນາຍຈ້າງປັດຈຸບັນ$$,
    $$Think past the immediate raise to whether the original reasons for leaving still stand.$$,
    $$ຄິດເລີຍໄປກວ່າການຂຶ້ນເງິນເດືອນທັນທີ ໄປເບິ່ງວ່າເຫດຜົນເດີມທີ່ຢາກອອກຍັງຄົງຢູ່ບໍ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask why the raise wasn't offered before$$, 'body', $$If you were worth more, why did it take a resignation to see it? The answer often reveals something important about the culture.$$),
      jsonb_build_object('heading', $$Separate money from the real reasons for leaving$$, 'body', $$If you were also leaving for growth, culture, or a bad manager, a bigger paycheck alone won't fix those underlying issues.$$),
      jsonb_build_object('heading', $$Remember the new offer is still there$$, 'body', $$Weigh the counteroffer against the genuine opportunity you already accepted, not just against staying with nothing.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມວ່າເປັນຫຍັງບໍ່ໄດ້ຂຶ້ນມາກ່ອນ$$, 'body', $$ຖ້າທ່ານມີຄຸນຄ່າຫຼາຍກວ່ານີ້ ເປັນຫຍັງຕ້ອງລາອອກກ່ອນຈຶ່ງເຫັນ? ຄຳຕອບມັກເປີດເຜີຍບາງຢ່າງສຳຄັນກ່ຽວກັບວັດທະນະທຳ.$$),
      jsonb_build_object('heading', $$ແຍກເລື່ອງເງິນອອກຈາກເຫດຜົນອອກຈິງ$$, 'body', $$ຖ້າອອກຍ້ອນການເຕີບໂຕ, ວັດທະນະທຳ ຫຼືຫົວໜ້າທີ່ບໍ່ດີເໝືອນກັນ ເງິນເດືອນທີ່ຫຼາຍຂຶ້ນຢ່າງດຽວ ແກ້ບັນຫາເຫຼົ່ານັ້ນບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ຈື່ໄວ້ວ່າຂໍ້ສະເໜີໃໝ່ຍັງຢູ່$$, 'body', $$ຊັ່ງນ້ຳໜັກຂໍ້ສະເໜີສະກັດກັບໂອກາດແທ້ໆທີ່ຮັບໄວ້ແລ້ວ ບໍ່ແມ່ນແຕ່ທຽບກັບການຢູ່ຕໍ່ໂດຍບໍ່ມີຫຍັງ.$$)
    ),
    array[$$Ask why the raise wasn't offered before you resigned$$, $$Separate the money from your original reasons for leaving$$, $$Weigh the counteroffer against the real new opportunity$$],
    array[$$ຖາມວ່າເປັນຫຍັງບໍ່ໄດ້ຂຶ້ນເງິນເດືອນກ່ອນລາອອກ$$, $$ແຍກເລື່ອງເງິນອອກຈາກເຫດຜົນອອກຈິງ$$, $$ຊັ່ງນ້ຳໜັກຂໍ້ສະເໜີສະກັດກັບໂອກາດໃໝ່ແທ້ໆ$$],
    4, false, 67
  ),
  (
    $$use-the-star-method-for-behavioral-questions$$,
    $$Use the STAR method for behavioral interview questions$$,
    $$ໃຊ້ວິທີ STAR ສຳລັບຄຳຖາມສຳພາດແບບພຶດຕິກຳ$$,
    $$Situation, Task, Action, Result gives a structured, complete answer to "tell me about a time..." questions.$$,
    $$ສະຖານະການ, ໜ້າວຽກ, ການກະທຳ, ຜົນລັບ ໃຫ້ຄຳຕອບທີ່ເປັນລະບົບ ແລະ ຄົບຖ້ວນສຳລັບຄຳຖາມ "ເລົ່າຄັ້ງທີ່..."$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set the Situation and Task briefly$$, 'body', $$Give just enough context to understand the challenge — a few sentences, not a long backstory.$$),
      jsonb_build_object('heading', $$Focus most of your answer on your Action$$, 'body', $$Describe specifically what YOU did, using "I" not "we" — interviewers want to know your individual contribution.$$),
      jsonb_build_object('heading', $$End with a measurable Result$$, 'body', $$Close with what happened, ideally with a number or clear outcome — this is the part that makes the story convincing.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກສະຖານະການ ແລະ ໜ້າວຽກສັ້ນໆ$$, 'body', $$ໃຫ້ບໍລິບົດພຽງພໍທີ່ຈະເຂົ້າໃຈສິ່ງທ້າທາຍ — ສອງສາມປະໂຫຍກ ບໍ່ແມ່ນເລື່ອງລາວທີ່ຍາວ.$$),
      jsonb_build_object('heading', $$ສຸມສ່ວນໃຫຍ່ໃສ່ການກະທຳຂອງທ່ານ$$, 'body', $$ອະທິບາຍສະເພາະວ່າ "ຂ້ອຍ" ເຮັດຫຍັງ ບໍ່ແມ່ນ "ພວກເຮົາ" — ຜູ້ສຳພາດຢາກຮູ້ການປະກອບສ່ວນຂອງທ່ານແທ້ໆ.$$),
      jsonb_build_object('heading', $$ຈົບດ້ວຍຜົນລັບທີ່ວັດແທກໄດ້$$, 'body', $$ຈົບດ້ວຍສິ່ງທີ່ເກີດຂຶ້ນ ດີທີ່ສຸດຄືມີຕົວເລກ ຫຼືຜົນລັບທີ່ຊັດເຈນ — ນີ້ຄືສ່ວນທີ່ເຮັດໃຫ້ເລື່ອງລາວໜ້າເຊື່ອຖື.$$)
    ),
    array[$$Keep Situation and Task brief, just enough context$$, $$Focus most of the answer on your specific individual Action$$, $$End with a measurable, concrete Result$$],
    array[$$ໃຫ້ສະຖານະການ ແລະ ໜ້າວຽກສັ້ນ ພຽງພໍເປັນບໍລິບົດ$$, $$ສຸມສ່ວນໃຫຍ່ໃສ່ການກະທຳສະເພາະຂອງທ່ານເອງ$$, $$ຈົບດ້ວຍຜົນລັບທີ່ວັດແທກໄດ້ ແລະ ຊັດເຈນ$$],
    5, false, 68
  ),
  (
    $$handle-being-overlooked-for-a-promotion$$,
    $$Handle being overlooked for a promotion gracefully$$,
    $$ຮັບມືການຖືກຂ້າມການເລື່ອນຕຳແໜ່ງຢ່າງມີໄຫວພິບ$$,
    $$A calm, direct conversation gets you further than visible frustration.$$,
    $$ການລົມຢ່າງສະຫງົບ ແລະ ກົງໄປກົງມາ ພາທ່ານໄປໄກກວ່າຄວາມອຶດອັດທີ່ເຫັນໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Process the disappointment before reacting$$, 'body', $$Give yourself a day or two before any conversation — responding while visibly upset rarely helps your case.$$),
      jsonb_build_object('heading', $$Ask specifically what was missing$$, 'body', $$"What would it take for me to be ready next time?" gets more useful information than a general complaint.$$),
      jsonb_build_object('heading', $$Decide your own timeline for reassessing$$, 'body', $$Set a personal checkpoint — if the same pattern repeats without a clear path forward, that's useful information too.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮັບຮູ້ຄວາມຜິດຫວັງກ່ອນຕອບໂຕ້$$, 'body', $$ໃຫ້ຕົນເອງໜຶ່ງຫຼືສອງມື້ກ່ອນລົມ — ການຕອບໂຕ້ຂະນະຍັງອຶດອັດ ມັກບໍ່ຊ່ວຍສະຖານະການຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ຖາມສະເພາະວ່າຂາດຫຍັງ$$, 'body', $$"ຕ້ອງເຮັດຫຍັງເພີ່ມເພື່ອພ້ອມໃນຄັ້ງຕໍ່ໄປ" ໄດ້ຂໍ້ມູນທີ່ເປັນປະໂຫຍດຫຼາຍກວ່າການຕຳນິທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ຕັດສິນໃຈໄລຍະເວລາຂອງທ່ານເອງເພື່ອປະເມີນຄືນ$$, 'body', $$ຕັ້ງຈຸດກວດສ່ວນຕົວ — ຖ້າຮູບແບບດຽວກັນເກີດຂຶ້ນຄືນໂດຍບໍ່ມີເສັ້ນທາງຊັດເຈນ ນັ້ນກໍ່ເປັນຂໍ້ມູນທີ່ເປັນປະໂຫຍດເໝືອນກັນ.$$)
    ),
    array[$$Give yourself time to process before any conversation$$, $$Ask specifically what's needed to be ready next time$$, $$Set your own timeline to reassess if the pattern repeats$$],
    array[$$ໃຫ້ເວລາຮັບຮູ້ຄວາມຮູ້ສຶກກ່ອນລົມ$$, $$ຖາມສະເພາະວ່າຕ້ອງການຫຍັງເພື່ອພ້ອມໃນຄັ້ງຕໍ່ໄປ$$, $$ຕັ້ງໄລຍະເວລາຂອງທ່ານເອງເພື່ອປະເມີນຄືນຖ້າຮູບແບບເກີດຄືນ$$],
    4, false, 69
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'career'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
