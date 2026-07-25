-- Six new AI Skills lessons, researched from current published guidance:
-- Anthropic's official prompting guide (claude.com/blog/best-practices-for-prompt-engineering),
-- UNESCO's AI-in-education guidance (unesco.org/en/digital-education/artificial-intelligence),
-- and widely-shared academic-integrity guidance on disclosing AI use (e.g. Cornell CTI).
-- Covers general prompting technique plus lessons aimed specifically at students and teachers.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, source_url, source_verified_at,
  is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'LESSON', v.source_url,
  case when v.source_url is not null then now() else null end,
  v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    'give-ai-clear-instructions',
    'Give AI clear, structured instructions',
    'ໃຫ້ຄຳສັ່ງ AI ຢ່າງຊັດເຈນ ແລະ ເປັນລະບົບ',
    'The single biggest lever for better AI answers is how clearly you ask.',
    'ປັດໄຈໃຫຍ່ທີ່ສຸດທີ່ເຮັດໃຫ້ AI ຕອບໄດ້ດີກວ່າ ຄືຄວາມຊັດເຈນຂອງຄຳຖາມທ່ານ.',
    jsonb_build_array(
      jsonb_build_object('heading', $$State exactly what you want$$, 'body', $$AI does not read your mind or know your unstated norms. Write instructions as if talking to a capable new team member who has no context on your goals, style, or standards.$$),
      jsonb_build_object('heading', $$Separate instructions from context$$, 'body', $$Put the actual task first, then background information, using a clear break — a blank line, a heading, or quotation marks — so AI doesn't confuse what you're asking for with what you're describing.$$),
      jsonb_build_object('heading', $$Show one good example$$, 'body', $$A single well-chosen example of the output you want, known as few-shot prompting, often improves results more than a longer written explanation.$$),
      jsonb_build_object('heading', $$Explain why it matters$$, 'body', $$Telling AI the purpose behind a request — who will read it, what decision it supports — helps it choose the right tone, length, and level of detail.$$),
      jsonb_build_object('heading', $$Ask, check, refine$$, 'body', $$Treat the first answer as a draft. Ask the AI to explain its reasoning or flag anything it's unsure about, then revise your prompt based on what came back.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຢ່າງຊັດເຈນວ່າຢາກໄດ້ຫຍັງ$$, 'body', $$AI ບໍ່ໄດ້ອ່ານໃຈ ຫຼື ຮູ້ມາດຕະຖານທີ່ທ່ານບໍ່ໄດ້ບອກ. ຂຽນຄຳສັ່ງຄືກັບກຳລັງເວົ້າກັບເພື່ອນຮ່ວມງານໃໝ່ທີ່ມີຄວາມສາມາດ ແຕ່ບໍ່ຮູ້ເປົ້າໝາຍ ຫຼື ແບບແຜນຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ແຍກຄຳສັ່ງອອກຈາກຂໍ້ມູນປະກອບ$$, 'body', $$ວາງໜ້າວຽກຫຼັກກ່ອນ ແລ້ວຕາມດ້ວຍຂໍ້ມູນພື້ນຖານ ໂດຍໃຊ້ການແບ່ງທີ່ຊັດເຈນ ເຊັ່ນ ແຖວຫວ່າງ, ຫົວຂໍ້ ຫຼື ເຄື່ອງໝາຍວົງຢືມ ເພື່ອບໍ່ໃຫ້ AI ສັບສົນລະຫວ່າງສິ່ງທີ່ຖາມ ແລະ ສິ່ງທີ່ອະທິບາຍ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຕົວຢ່າງໜຶ່ງອັນທີ່ດີ$$, 'body', $$ຕົວຢ່າງດຽວທີ່ເລືອກມາຢ່າງດີຂອງຜົນລັບທີ່ຢາກໄດ້ (few-shot prompting) ມັກຊ່ວຍໄດ້ດີກວ່າຄຳອະທິບາຍທີ່ຍາວ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍວ່າເປັນຫຍັງມັນສຳຄັນ$$, 'body', $$ບອກຈຸດປະສົງເບື້ອງຫຼັງຄຳຂໍ — ໃຜຈະອ່ານ, ໃຊ້ໃນການຕັດສິນໃຈຫຍັງ — ຊ່ວຍໃຫ້ AI ເລືອກນ້ຳສຽງ, ຄວາມຍາວ ແລະ ລາຍລະອຽດທີ່ເໝາະສົມ.$$),
      jsonb_build_object('heading', $$ຖາມ, ກວດ, ປັບປຸງ$$, 'body', $$ຖືວ່າຄຳຕອບທຳອິດເປັນຮ່າງ. ໃຫ້ AI ອະທິບາຍເຫດຜົນ ຫຼື ຊີ້ຈຸດທີ່ບໍ່ແນ່ໃຈ ແລ້ວປັບຄຳສັ່ງຕາມຄຳຕອບທີ່ໄດ້ຮັບ.$$)
    ),
    array[$$Be explicit instead of assuming AI will infer your intent$$, $$Separate what you're asking from background context$$, $$One clear example often beats a long explanation$$],
    array[$$ບອກຢ່າງຊັດເຈນ ແທນທີ່ຈະຄາດຫວັງໃຫ້ AI ເດົາໃຈ$$, $$ແຍກສິ່ງທີ່ຖາມອອກຈາກຂໍ້ມູນປະກອບ$$, $$ຕົວຢ່າງດຽວທີ່ຊັດເຈນ ມັກດີກວ່າຄຳອະທິບາຍທີ່ຍາວ$$],
    7, $$https://claude.com/blog/best-practices-for-prompt-engineering$$, true, 2
  ),
  (
    'plan-a-lesson-with-ai',
    'Plan a lesson with AI in four layers',
    'ວາງແຜນບົດຮຽນກັບ AI ໃນສີ່ຊັ້ນ',
    'A layered prompt turns a generic lesson plan into one that fits your real classroom.',
    'ຄຳສັ່ງແບບເປັນຊັ້ນ ຊ່ວຍປ່ຽນແຜນການສອນທົ່ວໄປ ໃຫ້ເໝາະກັບຫ້ອງຮຽນຈິງຂອງທ່ານ.',
    jsonb_build_array(
      jsonb_build_object('heading', $$Layer 1 — what you are teaching$$, 'body', $$Start with the specific learning objective, not just the subject name — "adding fractions with unlike denominators," not just "math."$$),
      jsonb_build_object('heading', $$Layer 2 — who your students are$$, 'body', $$Describe grade level, prior knowledge, and any specific needs, such as mixed-level students, large class size, or limited materials.$$),
      jsonb_build_object('heading', $$Layer 3 — the constraints of your class$$, 'body', $$State class length, group size, and available resources so the plan fits your actual classroom instead of an idealized one.$$),
      jsonb_build_object('heading', $$Layer 4 — what a good outcome looks like$$, 'body', $$Tell AI how you will check understanding, such as an exit question or short practice set, so the plan ends with a way to know if it worked.$$),
      jsonb_build_object('heading', $$Review before you teach it$$, 'body', $$AI-generated plans can include factual errors or a pace that doesn't match your students. Read every activity and example yourself before using it in class.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊັ້ນທີ 1 — ກຳລັງສອນຫຍັງ$$, 'body', $$ເລີ່ມຈາກເປົ້າໝາຍການຮຽນຮູ້ທີ່ຊັດເຈນ ບໍ່ແມ່ນແຕ່ຊື່ວິຊາ — "ບວກເສດສ່ວນທີ່ຕົວສ່ວນບໍ່ເທົ່າກັນ" ບໍ່ແມ່ນແຕ່ "ຄະນິດສາດ."$$),
      jsonb_build_object('heading', $$ຊັ້ນທີ 2 — ນັກຮຽນຂອງທ່ານເປັນໃຜ$$, 'body', $$ອະທິບາຍລະດັບຊັ້ນ, ຄວາມຮູ້ພື້ນຖານ ແລະ ຄວາມຕ້ອງການສະເພາະ ເຊັ່ນ ນັກຮຽນຫຼາຍລະດັບ, ຫ້ອງໃຫຍ່ ຫຼື ອຸປະກອນຈຳກັດ.$$),
      jsonb_build_object('heading', $$ຊັ້ນທີ 3 — ຂໍ້ຈຳກັດຂອງຫ້ອງຮຽນ$$, 'body', $$ບອກເວລາຮຽນ, ຂະໜາດກຸ່ມ ແລະ ອຸປະກອນທີ່ມີ ເພື່ອໃຫ້ແຜນເໝາະກັບຫ້ອງຮຽນຈິງ ບໍ່ແມ່ນຫ້ອງໃນອຸດົມຄະຕິ.$$),
      jsonb_build_object('heading', $$ຊັ້ນທີ 4 — ຜົນລັບທີ່ດີເປັນແນວໃດ$$, 'body', $$ບອກ AI ວ່າທ່ານຈະກວດຄວາມເຂົ້າໃຈແນວໃດ ເຊັ່ນ ຄຳຖາມທ້າຍຊົ່ວໂມງ ຫຼື ແບບຝຶກຫັດສັ້ນໆ ເພື່ອໃຫ້ແຜນມີວິທີວັດຜົນ.$$),
      jsonb_build_object('heading', $$ກວດກ່ອນນຳໄປສອນ$$, 'body', $$ແຜນທີ່ AI ສ້າງອາດມີຄວາມຜິດພາດ ຫຼື ຈັງຫວະທີ່ບໍ່ເໝາະກັບນັກຮຽນ. ອ່ານທຸກກິດຈະກຳ ແລະ ຕົວຢ່າງເອງກ່ອນນຳໃຊ້ໃນຫ້ອງຮຽນ.$$)
    ),
    array[$$Build prompts in layers: topic, students, constraints, success check$$, $$A generated plan is a starting draft, not a finished lesson$$, $$Always verify content accuracy before teaching it$$],
    array[$$ສ້າງຄຳສັ່ງເປັນຊັ້ນ: ຫົວຂໍ້, ນັກຮຽນ, ຂໍ້ຈຳກັດ, ວິທີວັດຜົນ$$, $$ແຜນທີ່ໄດ້ຈາກ AI ເປັນພຽງຮ່າງເລີ່ມຕົ້ນ ບໍ່ແມ່ນແຜນສຳເລັດ$$, $$ກວດຄວາມຖືກຕ້ອງຂອງເນື້ອຫາທຸກຄັ້ງກ່ອນນຳໄປສອນ$$],
    7, null, false, 3
  ),
  (
    'study-with-ai-not-instead-of-studying',
    'Use AI to study, not to skip studying',
    'ໃຊ້ AI ເພື່ອຮຽນ ບໍ່ແມ່ນເພື່ອຫຼີກລ້ຽງການຮຽນ',
    'The same tool that can shortcut your homework can also make you genuinely better at remembering it.',
    'ເຄື່ອງມືດຽວກັນທີ່ອາດຍໍ້ວຽກບ້ານໄດ້ ກໍ່ສາມາດຊ່ວຍໃຫ້ທ່ານຈື່ຈຳໄດ້ດີຂຶ້ນແທ້ໆ.',
    jsonb_build_array(
      jsonb_build_object('heading', $$The copy-paste trap$$, 'body', $$Asking AI for a finished answer and submitting it feels productive, but it skips the mental work that actually builds understanding and memory.$$),
      jsonb_build_object('heading', $$Ask AI to quiz you$$, 'body', $$Have AI generate practice questions from your notes or textbook chapter, then answer them yourself before checking. This uses retrieval practice, one of the most effective ways to remember material.$$),
      jsonb_build_object('heading', $$Explain it back$$, 'body', $$After AI explains a concept, try explaining it back in your own words. If you get stuck, that's exactly the part you still need to study.$$),
      jsonb_build_object('heading', $$Ask for a simpler explanation first$$, 'body', $$If a topic is confusing, ask AI to explain it as if you were two years younger, then work back up to the full complexity.$$),
      jsonb_build_object('heading', $$Use AI to check your work, not produce it$$, 'body', $$Do the problem yourself first, then ask AI to check your answer and explain any mistake, so you learn from every wrong attempt.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກັບດັກກອບ-ວາງ$$, 'body', $$ການຂໍຄຳຕອບສຳເລັດຮູບຈາກ AI ແລ້ວສົ່ງເລີຍ ຮູ້ສຶກຄືມີຜົນງານ ແຕ່ຂ້າມການຄິດທີ່ແທ້ຈິງ ທີ່ຊ່ວຍສ້າງຄວາມເຂົ້າໃຈ ແລະ ຄວາມຈື່ຈຳ.$$),
      jsonb_build_object('heading', $$ໃຫ້ AI ອອກຂໍ້ສອບໃຫ້ທ່ານ$$, 'body', $$ໃຫ້ AI ສ້າງຄຳຖາມຝຶກຫັດຈາກບົດຫຍໍ້ ຫຼື ບົດຮຽນຂອງທ່ານ ແລ້ວຕອບເອງກ່ອນກວດ. ວິທີນີ້ໃຊ້ "retrieval practice" ເຊິ່ງເປັນວິທີຈື່ຈຳທີ່ໄດ້ຜົນທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍກັບຄືນ$$, 'body', $$ຫຼັງ AI ອະທິບາຍແນວຄິດ ໃຫ້ລອງອະທິບາຍກັບຄືນດ້ວຍຄຳເວົ້າຂອງທ່ານເອງ. ຖ້າຕິດຂັດ ນັ້ນຄືສ່ວນທີ່ທ່ານຍັງຕ້ອງຮຽນເພີ່ມ.$$),
      jsonb_build_object('heading', $$ຂໍຄຳອະທິບາຍແບບງ່າຍກ່ອນ$$, 'body', $$ຖ້າຫົວຂໍ້ຍາກ ໃຫ້ຂໍ AI ອະທິບາຍຄືກັບເວົ້າກັບເດັກນ້ອຍກວ່າສອງປີ ແລ້ວຄ່ອຍໆເພີ່ມຄວາມຊັບຊ້ອນຂຶ້ນ.$$),
      jsonb_build_object('heading', $$ໃຊ້ AI ກວດວຽກ ບໍ່ແມ່ນເຮັດວຽກແທນ$$, 'body', $$ເຮັດໂຈດເອງກ່ອນ ແລ້ວໃຫ້ AI ກວດຄຳຕອບ ແລະ ອະທິບາຍຈຸດຜິດ ເພື່ອໃຫ້ທ່ານຮຽນຮູ້ຈາກທຸກຄັ້ງທີ່ຜິດ.$$)
    ),
    array[$$Retrieval practice (quizzing yourself) builds memory better than re-reading$$, $$Explaining a concept in your own words reveals what you don't understand yet$$, $$Do the work first, then use AI to check it$$],
    array[$$ການທົດສອບຄວາມຈື່ຈຳ (retrieval practice) ຊ່ວຍຈື່ຈຳໄດ້ດີກວ່າການອ່ານຄືນ$$, $$ການອະທິບາຍດ້ວຍຄຳຂອງຕົນເອງ ເຮັດໃຫ້ເຫັນຈຸດທີ່ຍັງບໍ່ເຂົ້າໃຈ$$, $$ເຮັດວຽກເອງກ່ອນ ແລ້ວຈຶ່ງໃຫ້ AI ຊ່ວຍກວດ$$],
    6, null, true, 4
  ),
  (
    'get-writing-feedback-from-ai',
    'Get real feedback on your writing from AI',
    'ຂໍຄຳຄິດເຫັນຕໍ່ການຂຽນຈາກ AI ຢ່າງແທ້ຈິງ',
    'Ask for critique that sharpens your ideas, not a replacement draft written in another voice.',
    'ຂໍຄຳຕິຊົມທີ່ຊ່ວຍລັບຄວາມຄິດ ບໍ່ແມ່ນຮ່າງໃໝ່ທີ່ຂຽນແທນທ່ານ.',
    jsonb_build_array(
      jsonb_build_object('heading', $$Don't ask AI to write it for you$$, 'body', $$Feedback helps you improve; a rewrite only replaces your work with someone else's. Ask for critique on your draft, not a replacement.$$),
      jsonb_build_object('heading', $$Ask for specific, structured feedback$$, 'body', $$Request feedback on particular things: is the main idea clear, does each paragraph support it, are there grammar issues. Vague requests like "is this good?" get vague answers.$$),
      jsonb_build_object('heading', $$Ask what's missing, not just what's wrong$$, 'body', $$A good prompt asks AI to point out weak evidence, unclear transitions, or ideas you haven't fully developed — not only spelling and grammar.$$),
      jsonb_build_object('heading', $$Revise, then compare$$, 'body', $$Rewrite the flagged sections yourself, then ask AI to check whether the revision actually fixed the issue.$$),
      jsonb_build_object('heading', $$Keep your own voice$$, 'body', $$Use AI's suggestions to sharpen your ideas, not to replace your wording throughout. Writing that reads like nobody in particular loses the value of being yours.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢ່າໃຫ້ AI ຂຽນແທນທ່ານ$$, 'body', $$ຄຳຕິຊົມຊ່ວຍໃຫ້ທ່ານດີຂຶ້ນ ແຕ່ການຂຽນໃໝ່ໝົດ ພຽງແຕ່ປ່ຽນວຽກຂອງທ່ານເປັນຂອງຄົນອື່ນ. ຂໍຄຳຕິຊົມຕໍ່ຮ່າງເດີມ ບໍ່ແມ່ນຮ່າງໃໝ່.$$),
      jsonb_build_object('heading', $$ຂໍຄຳຕິຊົມທີ່ຊັດເຈນ ແລະ ເປັນລະບົບ$$, 'body', $$ຂໍຄຳຕິຊົມສະເພາະຈຸດ ເຊັ່ນ ແນວຄິດຫຼັກຊັດເຈນບໍ, ແຕ່ລະຫຍໍ້ໜ້າສະໜັບສະໜູນແນວຄິດຫຼັກບໍ, ມີບັນຫາໄວຍາກອນບໍ — ຄຳຖາມທົ່ວໄປແບບ "ດີບໍ?" ຈະໄດ້ຄຳຕອບທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ຖາມວ່າຂາດຫຍັງ ບໍ່ແມ່ນແຕ່ຜິດຫຍັງ$$, 'body', $$ຄຳສັ່ງທີ່ດີ ຄວນຂໍໃຫ້ AI ຊີ້ຈຸດອ່ອນຂອງຫຼັກຖານ, ການເຊື່ອມຕໍ່ທີ່ບໍ່ຊັດເຈນ ຫຼື ແນວຄິດທີ່ຍັງພັດທະນາບໍ່ພໍ — ບໍ່ແມ່ນແຕ່ການສະກົດ ຫຼື ໄວຍາກອນ.$$),
      jsonb_build_object('heading', $$ແກ້ໄຂເອງ ແລ້ວປຽບທຽບ$$, 'body', $$ຂຽນສ່ວນທີ່ຖືກຊີ້ໃໝ່ດ້ວຍຕົນເອງ ແລ້ວໃຫ້ AI ກວດວ່າການແກ້ໄຂນັ້ນແກ້ບັນຫາໄດ້ແທ້ບໍ.$$),
      jsonb_build_object('heading', $$ຮັກສານ້ຳສຽງຂອງຕົນເອງ$$, 'body', $$ໃຊ້ຄຳແນະນຳຂອງ AI ເພື່ອລັບຄວາມຄິດ ບໍ່ແມ່ນປ່ຽນຖ້ອຍຄຳທັງໝົດ. ບົດຂຽນທີ່ອ່ານຄືບໍ່ແມ່ນຂອງໃຜເລີຍ ຈະເສຍຄຸນຄ່າຂອງຄວາມເປັນເຈົ້າຂອງ.$$)
    ),
    array[$$Ask for critique on your own draft, not a replacement draft$$, $$Request feedback on specific elements: clarity, structure, evidence$$, $$Revise it yourself so the final writing stays your own$$],
    array[$$ຂໍຄຳຕິຊົມຕໍ່ຮ່າງຂອງທ່ານເອງ ບໍ່ແມ່ນຮ່າງໃໝ່$$, $$ຂໍຄຳຕິຊົມສະເພາະຈຸດ: ຄວາມຊັດເຈນ, ໂຄງສ້າງ, ຫຼັກຖານ$$, $$ແກ້ໄຂດ້ວຍຕົນເອງ ເພື່ອໃຫ້ບົດຂຽນສຸດທ້າຍຍັງເປັນຂອງທ່ານ$$],
    6, null, false, 5
  ),
  (
    'practice-language-with-ai',
    'Practice a language with an AI conversation partner',
    'ຝຶກພາສາກັບ AI ຄູ່ສົນທະນາ',
    'A patient conversation partner that is always available, corrects you gently, and never gets tired of practice.',
    'ຄູ່ສົນທະນາທີ່ອົດທົນ, ພ້ອມໃຫ້ບໍລິການສະເໝີ, ແກ້ໄຂຢ່າງນຸ້ມນວນ ແລະ ບໍ່ເມື່ອຍກັບການຝຶກຊ້ຳໆ.',
    jsonb_build_array(
      jsonb_build_object('heading', $$Set the scene$$, 'body', $$Tell AI the situation you want to practice — ordering food, a job interview, introducing yourself — so the conversation stays realistic and useful.$$),
      jsonb_build_object('heading', $$Ask for corrections as you go$$, 'body', $$Request that AI point out mistakes in grammar or word choice after each reply, so you learn in the moment rather than repeating an error.$$),
      jsonb_build_object('heading', $$Push for natural phrasing$$, 'body', $$Ask how a native speaker would actually say the same sentence — textbook-correct phrasing and natural everyday phrasing are often different.$$),
      jsonb_build_object('heading', $$Practice listening too$$, 'body', $$If your tool supports voice, use it to practice speaking and listening, not just typing; reading and speaking build different skills.$$),
      jsonb_build_object('heading', $$Keep sessions short and frequent$$, 'body', $$Ten focused minutes of conversation practice most days builds fluency faster than one long session per week.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຳນົດສະຖານະການ$$, 'body', $$ບອກ AI ວ່າຢາກຝຶກສະຖານະການໃດ — ສັ່ງອາຫານ, ສຳພາດວຽກ, ແນະນຳຕົນເອງ — ເພື່ອໃຫ້ການສົນທະນາໃກ້ຄວາມຈິງ ແລະ ເປັນປະໂຫຍດ.$$),
      jsonb_build_object('heading', $$ຂໍໃຫ້ແກ້ໄຂລະຫວ່າງສົນທະນາ$$, 'body', $$ຂໍໃຫ້ AI ຊີ້ຂໍ້ຜິດພາດດ້ານໄວຍາກອນ ຫຼື ຄຳສັບຫຼັງແຕ່ລະຄຳຕອບ ເພື່ອຮຽນຮູ້ທັນທີ ແທນທີ່ຈະເຮັດຜິດຊ້ຳ.$$),
      jsonb_build_object('heading', $$ຂໍປະໂຫຍກທຳມະຊາດ$$, 'body', $$ຖາມວ່າເຈົ້າຂອງພາສາຈະເວົ້າແນວໃດແທ້ໆ — ປະໂຫຍກທີ່ຖືກຕາມແບບຮຽນ ແລະ ປະໂຫຍກທຳມະຊາດປະຈຳວັນ ມັກຕ່າງກັນ.$$),
      jsonb_build_object('heading', $$ຝຶກຟັງນຳ$$, 'body', $$ຖ້າເຄື່ອງມືຮອງຮັບສຽງ ໃຫ້ໃຊ້ຝຶກເວົ້າ ແລະ ຟັງ ບໍ່ແມ່ນແຕ່ພິມ — ການອ່ານ ແລະ ການເວົ້າສ້າງທັກສະທີ່ຕ່າງກັນ.$$),
      jsonb_build_object('heading', $$ຝຶກສັ້ນແຕ່ເລື້ອຍໆ$$, 'body', $$ການສົນທະນາຈົດຈໍ່ 10 ນາທີເກືອບທຸກມື້ ຊ່ວຍໃຫ້ຄ່ອງແຄ້ວໄວກວ່າການຝຶກຄັ້ງດຽວທີ່ຍາວໃນໜຶ່ງອາທິດ.$$)
    ),
    array[$$Practice specific real-life situations, not random small talk$$, $$Ask for corrections and natural phrasing, not just translations$$, $$Short, frequent practice beats occasional long sessions$$],
    array[$$ຝຶກສະຖານະການຈິງສະເພາະ ບໍ່ແມ່ນເວົ້າຫຼິ້ນທົ່ວໄປ$$, $$ຂໍການແກ້ໄຂ ແລະ ປະໂຫຍກທຳມະຊາດ ບໍ່ແມ່ນແຕ່ການແປ$$, $$ຝຶກສັ້ນແຕ່ເລື້ອຍໆ ດີກວ່າຝຶກດົນໆບາງຄັ້ງ$$],
    6, null, false, 6
  ),
  (
    'use-ai-honestly-at-school',
    'Use AI honestly and responsibly at school',
    'ໃຊ້ AI ຢ່າງຊື່ສັດ ແລະ ມີຄວາມຮັບຜິດຊອບໃນໂຮງຮຽນ',
    'AI can genuinely help you learn — but only if you stay honest about how you used it.',
    'AI ຊ່ວຍໃຫ້ຮຽນໄດ້ດີຂຶ້ນແທ້ — ແຕ່ຕ້ອງຊື່ສັດວ່າໃຊ້ມັນແນວໃດ.',
    jsonb_build_array(
      jsonb_build_object('heading', $$Know your school's actual policy$$, 'body', $$Rules vary widely between schools and even between classes. Check what your teacher or institution allows before assuming AI use is fine.$$),
      jsonb_build_object('heading', $$Disclose meaningful AI help$$, 'body', $$If AI helped generate significant wording or ideas in your work, say so. Presenting AI-generated content as entirely your own is a form of misrepresentation.$$),
      jsonb_build_object('heading', $$Support versus substitution$$, 'body', $$Using AI to check your understanding or brainstorm ideas is different from having it produce the final work you submit under your own name.$$),
      jsonb_build_object('heading', $$AI can be confidently wrong$$, 'body', $$AI-generated facts, citations, and even calculations can look correct while being wrong. Verify anything important against a reliable source before relying on it.$$),
      jsonb_build_object('heading', $$Build the skill, not just the output$$, 'body', $$The point of most schoolwork is the skill you build while doing it. Using AI to skip that process quietly costs you the very thing school is meant to build.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ນະໂຍບາຍຈິງຂອງໂຮງຮຽນ$$, 'body', $$ກົດລະບຽບແຕກຕ່າງກັນຫຼາຍລະຫວ່າງໂຮງຮຽນ ແລະ ແມ່ນແຕ່ລະຫວ່າງແຕ່ລະຫ້ອງ. ກວດວ່າຄູ ຫຼື ໂຮງຮຽນອະນຸຍາດຫຍັງແດ່ ກ່ອນຄິດວ່າໃຊ້ AI ໄດ້ໂດຍທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ບອກຢ່າງເປີດເຜີຍເມື່ອໃຊ້ AI ຢ່າງມີນັຍສຳຄັນ$$, 'body', $$ຖ້າ AI ຊ່ວຍສ້າງຖ້ອຍຄຳ ຫຼື ແນວຄິດສ່ວນສຳຄັນຂອງວຽກ ໃຫ້ບອກ. ການນຳສະເໜີເນື້ອຫາຈາກ AI ວ່າເປັນຂອງຕົນເອງທັງໝົດ ຖືເປັນການບອກຄວາມຈິງບໍ່ຄົບຖ້ວນ.$$),
      jsonb_build_object('heading', $$ຄວາມແຕກຕ່າງລະຫວ່າງການຊ່ວຍ ແລະ ການແທນທີ່$$, 'body', $$ການໃຊ້ AI ເພື່ອກວດຄວາມເຂົ້າໃຈ ຫຼື ລະດົມແນວຄິດ ແຕກຕ່າງຈາກການໃຫ້ມັນສ້າງວຽກສຸດທ້າຍທີ່ທ່ານສົ່ງພາຍໃຕ້ຊື່ຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$AI ອາດຜິດແບບໜ້າເຊື່ອ$$, 'body', $$ຂໍ້ມູນ, ການອ້າງອີງ ຫຼືແມ່ນແຕ່ການຄິດໄລ່ຈາກ AI ອາດເບິ່ງຄືຖືກຕ້ອງ ແຕ່ຜິດແທ້. ກວດສອບສິ່ງສຳຄັນຈາກແຫຼ່ງທີ່ໜ້າເຊື່ອຖືກ່ອນນຳໃຊ້.$$),
      jsonb_build_object('heading', $$ສ້າງທັກສະ ບໍ່ແມ່ນແຕ່ຜົນງານ$$, 'body', $$ຈຸດປະສົງຂອງວຽກໂຮງຮຽນສ່ວນຫຼາຍ ຄືທັກສະທີ່ທ່ານສ້າງລະຫວ່າງເຮັດ. ການໃຊ້ AI ຂ້າມຂະບວນການນັ້ນ ເຮັດໃຫ້ທ່ານເສຍສິ່ງທີ່ໂຮງຮຽນຕ້ອງການສ້າງແທ້ໆ.$$)
    ),
    array[$$Follow your specific school or teacher's AI policy, not general assumptions$$, $$Disclose meaningful AI contribution to your work$$, $$Verify AI-generated facts before trusting them$$],
    array[$$ປະຕິບັດຕາມນະໂຍບາຍ AI ຂອງໂຮງຮຽນ ຫຼື ຄູສະເພາະ ບໍ່ແມ່ນການຄາດເດົາທົ່ວໄປ$$, $$ບອກຢ່າງເປີດເຜີຍເມື່ອ AI ຊ່ວຍວຽກຢ່າງມີນັຍສຳຄັນ$$, $$ກວດສອບຂໍ້ມູນຈາກ AI ກ່ອນເຊື່ອ$$],
    7, $$https://www.unesco.org/en/digital-education/artificial-intelligence$$, true, 7
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, source_url, is_preview, sort_order
)
where premium_learning_categories.slug = 'ai-skills'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  source_url = excluded.source_url, status = 'PUBLISHED';
