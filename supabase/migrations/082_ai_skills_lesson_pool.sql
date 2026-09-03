-- Bulk lesson-pool seed: AI skills direction.
-- Adds 43 original, evergreen lessons so the pool has 50+ published lessons
-- before launch; the weekly content-forge job continues to add on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'LESSON', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$understand-what-ai-actually-does$$,
    $$Understand what AI actually does$$,
    $$ເຂົ້າໃຈວ່າ AI ເຮັດວຽກແນວໃດແທ້ໆ$$,
    $$AI predicts likely next words from patterns in data — it doesn't truly "know" things the way a person does.$$,
    $$AI ຄາດເດົາຄຳຕໍ່ໄປຈາກຮູບແບບໃນຂໍ້ມູນ — ມັນບໍ່ໄດ້ "ຮູ້" ແບບຄົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$A very capable prediction engine$$, 'body', $$A language model was trained on huge amounts of text and learned to predict what word is likely to come next. That is why it can write fluently, but fluent does not always mean correct.$$),
      jsonb_build_object('heading', $$No memory of truth, only patterns$$, 'body', $$AI does not check facts against reality unless it searches the web. It reproduces patterns it has seen, so confident-sounding answers can still be wrong.$$),
      jsonb_build_object('heading', $$Use it as a fast collaborator$$, 'body', $$Treat AI as a fast, tireless collaborator that drafts and suggests — not a final authority. You stay responsible for checking and deciding.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຄື່ອງຄາດເດົາທີ່ມີຄວາມສາມາດສູງ$$, 'body', $$ໂມເດວພາສາຖືກຝຶກຈາກຂໍ້ຄວາມຈຳນວນມະຫາສານ ແລະ ຮຽນຮູ້ທີ່ຈະຄາດເດົາຄຳຕໍ່ໄປ. ນັ້ນຄືເຫດຜົນທີ່ມັນຂຽນໄດ້ຄ່ອງແຄ້ວ ແຕ່ຄ່ອງແຄ້ວບໍ່ໄດ້ໝາຍຄວາມວ່າຖືກຕ້ອງສະເໝີ.$$),
      jsonb_build_object('heading', $$ບໍ່ມີຄວາມຊົງຈຳຄວາມຈິງ ມີແຕ່ຮູບແບບ$$, 'body', $$AI ບໍ່ໄດ້ກວດຂໍ້ເທັດຈິງກັບໂລກຈິງ ນອກຈາກມັນຄົ້ນຫາເວັບ. ມັນພຽງແຕ່ຜະລິດຮູບແບບທີ່ເຄີຍເຫັນ ສະນັ້ນຄຳຕອບທີ່ຟັງເບິ່ງໝັ້ນໃຈກໍ່ອາດຜິດໄດ້.$$),
      jsonb_build_object('heading', $$ໃຊ້ມັນເປັນເພື່ອນຮ່ວມງານທີ່ໄວ$$, 'body', $$ຖືວ່າ AI ເປັນເພື່ອນຮ່ວມງານທີ່ໄວ ແລະ ບໍ່ອິດເມື່ອຍ ທີ່ຮ່າງ ແລະ ແນະນຳ — ບໍ່ແມ່ນຜູ້ຕັດສິນສຸດທ້າຍ. ທ່ານຍັງຕ້ອງຮັບຜິດຊອບກວດ ແລະ ຕັດສິນໃຈເອງ.$$)
    ),
    array[$$AI predicts likely text, it doesn't verify truth$$, $$Confident tone does not guarantee accuracy$$, $$Use AI as a fast draft partner, not the final word$$],
    array[$$AI ຄາດເດົາຂໍ້ຄວາມ ບໍ່ໄດ້ພິສູດຄວາມຈິງ$$, $$ນ້ຳສຽງໝັ້ນໃຈບໍ່ໄດ້ຢືນຢັນຄວາມຖືກຕ້ອງ$$, $$ໃຊ້ AI ເປັນຄູ່ຮ່າງທີ່ໄວ ບໍ່ແມ່ນຄຳຕັດສິນສຸດທ້າຍ$$],
    5, false, 20
  ),
  (
    $$spot-ai-hallucinations$$,
    $$Spot AI hallucinations before they cause harm$$,
    $$ຈັບຜິດ AI ທີ່ "ຫຼອນ" ກ່ອນມັນສ້າງຄວາມເສຍຫາຍ$$,
    $$AI can invent facts, sources, or numbers that sound real. Learn the warning signs before you trust or share them.$$,
    $$AI ອາດສ້າງຂໍ້ເທັດຈິງ, ແຫຼ່ງອ້າງອີງ ຫຼື ຕົວເລກທີ່ຟັງເບິ່ງຄືຈິງ. ຮຽນຮູ້ສັນຍານເຕືອນກ່ອນເຊື່ອ ຫຼື ແບ່ງປັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$What a hallucination looks like$$, 'body', $$AI may cite a study that doesn't exist, misquote a date, or invent a statistic with total confidence. It rarely says "I'm not sure" unless asked to.$$),
      jsonb_build_object('heading', $$Ask for the source, then check it$$, 'body', $$When AI states a specific fact, name, or number, ask where it came from. If it cannot point to a real, checkable source, treat the claim as unverified.$$),
      jsonb_build_object('heading', $$Higher risk for specifics, lower for general ideas$$, 'body', $$Hallucination risk is highest for precise dates, names, statistics, and citations, and lowest for general explanations or brainstorming. Double-check accordingly.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອາການ "ຫຼອນ" ຂອງ AI ເປັນແນວໃດ$$, 'body', $$AI ອາດອ້າງອີງການສຶກສາທີ່ບໍ່ມີຢູ່ຈິງ, ບອກວັນທີຜິດ ຫຼື ສ້າງສະຖິຕິຂຶ້ນມາດ້ວຍຄວາມໝັ້ນໃຈເຕັມທີ່. ມັນຈະບໍ່ເວົ້າວ່າ "ບໍ່ແນ່ໃຈ" ຖ້າບໍ່ໄດ້ຖືກຖາມ.$$),
      jsonb_build_object('heading', $$ຖາມຫາແຫຼ່ງອ້າງອີງ ແລ້ວກວດເບິ່ງ$$, 'body', $$ເມື່ອ AI ບອກຂໍ້ເທັດຈິງ, ຊື່ ຫຼື ຕົວເລກສະເພາະ ໃຫ້ຖາມວ່າມາຈາກໃສ. ຖ້າມັນຊີ້ບໍ່ໄດ້ໄປຫາແຫຼ່ງທີ່ກວດໄດ້ຈິງ ໃຫ້ຖືວ່າຍັງບໍ່ໄດ້ພິສູດ.$$),
      jsonb_build_object('heading', $$ຄວາມສ່ຽງສູງສຳລັບລາຍລະອຽດ, ຕ່ຳສຳລັບແນວຄິດທົ່ວໄປ$$, 'body', $$ຄວາມສ່ຽງ "ຫຼອນ" ສູງທີ່ສຸດສຳລັບວັນທີ, ຊື່, ສະຖິຕິ ແລະ ການອ້າງອີງທີ່ແມ່ນຍຳ ແລະ ຕ່ຳສຸດສຳລັບການອະທິບາຍທົ່ວໄປ ຫຼື ການລະດົມແນວຄິດ. ກວດສອບໃຫ້ເໝາະສົມ.$$)
    ),
    array[$$AI can state false facts with full confidence$$, $$Always ask for a checkable source on specific claims$$, $$Precise details need more verification than general ideas$$],
    array[$$AI ອາດເວົ້າຂໍ້ເທັດຈິງທີ່ບໍ່ຈິງດ້ວຍຄວາມໝັ້ນໃຈ$$, $$ໃຫ້ຖາມຫາແຫຼ່ງອ້າງອີງທີ່ກວດໄດ້ສະເໝີ$$, $$ລາຍລະອຽດແມ່ນຍຳຕ້ອງກວດສອບຫຼາຍກວ່າແນວຄິດທົ່ວໄປ$$],
    6, false, 21
  ),
  (
    $$summarize-long-documents-with-ai$$,
    $$Use AI to summarize long documents effectively$$,
    $$ໃຊ້ AI ສະຫຼຸບເອກະສານຍາວໆຢ່າງມີປະສິດທິພາບ$$,
    $$A good summary prompt asks for structure and length, not just "summarize this."$$,
    $$ຄຳສັ່ງສະຫຼຸບທີ່ດີຕ້ອງລະບຸໂຄງສ້າງ ແລະ ຄວາມຍາວ ບໍ່ແມ່ນພຽງແຕ່ "ຊ່ວຍສະຫຼຸບໃຫ້ແດ່."$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Paste the text, not just a description$$, 'body', $$AI summarizes best when it can read the actual document. Paste the full text or key sections rather than describing what the document is about.$$),
      jsonb_build_object('heading', $$Ask for a specific format$$, 'body', $$Request exactly what you need: a three-bullet summary, a one-paragraph overview, or a table of key points with page numbers.$$),
      jsonb_build_object('heading', $$Verify anything you will act on$$, 'body', $$For a contract, medical text, or legal document, a summary is a starting point only. Read the original before making a decision based on it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວາງຂໍ້ຄວາມຈິງ ບໍ່ແມ່ນແຕ່ຄຳອະທິບາຍ$$, 'body', $$AI ສະຫຼຸບໄດ້ດີທີ່ສຸດເມື່ອອ່ານເອກະສານຈິງ. ວາງຂໍ້ຄວາມເຕັມ ຫຼື ສ່ວນສຳຄັນ ແທນທີ່ຈະອະທິບາຍວ່າເອກະສານກ່ຽວກັບຫຍັງ.$$),
      jsonb_build_object('heading', $$ຂໍຮູບແບບສະເພາະ$$, 'body', $$ຂໍໃນສິ່ງທີ່ຕ້ອງການແທ້ໆ: ສະຫຼຸບ 3 ຂໍ້, ຫຍໍ້ 1 ຫຍໍ້ໜ້າ ຫຼື ຕາຕະລາງຈຸດສຳຄັນພ້ອມເລກໜ້າ.$$),
      jsonb_build_object('heading', $$ກວດຄືນທຸກສິ່ງທີ່ຈະນຳໄປໃຊ້ຕັດສິນໃຈ$$, 'body', $$ສຳລັບສັນຍາ, ເອກະສານການແພດ ຫຼື ກົດໝາຍ ການສະຫຼຸບເປັນພຽງຈຸດເລີ່ມຕົ້ນ. ອ່ານຕົ້ນສະບັບກ່ອນຕັດສິນໃຈຕາມມັນ.$$)
    ),
    array[$$Paste the real text for the most accurate summary$$, $$Specify the exact format you want$$, $$Verify important documents against the original$$],
    array[$$ວາງຂໍ້ຄວາມຈິງເພື່ອສະຫຼຸບໄດ້ແມ່ນຍຳກວ່າ$$, $$ລະບຸຮູບແບບທີ່ຕ້ອງການໃຫ້ຊັດເຈນ$$, $$ກວດເອກະສານສຳຄັນກັບຕົ້ນສະບັບ$$],
    5, false, 22
  ),
  (
    $$brainstorm-with-ai-keep-your-voice$$,
    $$Brainstorm with AI without losing your own voice$$,
    $$ລະດົມແນວຄິດກັບ AI ໂດຍບໍ່ເສຍສຽງຂອງຕົນເອງ$$,
    $$Use AI to widen your options, then choose and rewrite in your own words.$$,
    $$ໃຊ້ AI ເພື່ອຂະຫຍາຍທາງເລືອກ ແລ້ວເລືອກ ແລະ ຂຽນຄືນດ້ວຍຄຳເວົ້າຂອງຕົນເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for many options, not one answer$$, 'body', $$Request ten quick ideas instead of one polished answer. Volume at low effort helps you see the range before committing to a direction.$$),
      jsonb_build_object('heading', $$Pick, combine, and personalize$$, 'body', $$Choose the two or three ideas that fit you best, combine parts of each, and add a detail only you would know — a real memory, name, or local reference.$$),
      jsonb_build_object('heading', $$Rewrite the final version yourself$$, 'body', $$Once you settle on a direction, write or heavily rephrase the final version in your own words so the result actually sounds like you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍຫຼາຍທາງເລືອກ ບໍ່ແມ່ນຄຳຕອບດຽວ$$, 'body', $$ຂໍແນວຄິດໄວໆ 10 ຂໍ້ ແທນທີ່ຈະຂໍຄຳຕອບດຽວທີ່ຂັດເກີ້ງ. ຈຳນວນຫຼາຍຊ່ວຍໃຫ້ເຫັນຂອບເຂດກ່ອນຕັດສິນໃຈເລືອກທິດທາງ.$$),
      jsonb_build_object('heading', $$ເລືອກ, ປະສົມ ແລະ ເຮັດໃຫ້ເປັນຂອງຕົນເອງ$$, 'body', $$ເລືອກ 2-3 ແນວຄິດທີ່ເໝາະກັບທ່ານທີ່ສຸດ, ປະສົມສ່ວນຂອງແຕ່ລະອັນ ແລະ ເພີ່ມລາຍລະອຽດທີ່ມີແຕ່ທ່ານຮູ້ — ຄວາມຊົງຈຳ, ຊື່ ຫຼື ຂໍ້ມູນທ້ອງຖິ່ນຈິງ.$$),
      jsonb_build_object('heading', $$ຂຽນສະບັບສຸດທ້າຍດ້ວຍຕົນເອງ$$, 'body', $$ເມື່ອຕັດສິນໃຈທິດທາງແລ້ວ ໃຫ້ຂຽນ ຫຼື ປັບຄຳເວົ້າສະບັບສຸດທ້າຍດ້ວຍຕົນເອງ ເພື່ອໃຫ້ຜົນງານຟັງເປັນສຽງຂອງທ່ານແທ້ໆ.$$)
    ),
    array[$$Ask for volume first, quality second$$, $$Combine ideas and add a personal detail$$, $$Always rewrite the final version in your own words$$],
    array[$$ຂໍຈຳນວນກ່ອນ ຄຸນນະພາບຄ່ອຍວ່າ$$, $$ປະສົມແນວຄິດ ແລະ ເພີ່ມລາຍລະອຽດສ່ວນຕົວ$$, $$ຂຽນສະບັບສຸດທ້າຍດ້ວຍຄຳເວົ້າຂອງຕົນເອງສະເໝີ$$],
    5, false, 23
  ),
  (
    $$turn-notes-into-a-study-guide-with-ai$$,
    $$Turn messy notes into a study guide with AI$$,
    $$ປ່ຽນບັນທຶກທີ່ສັບສົນເປັນຄູ່ມືການຮຽນດ້ວຍ AI$$,
    $$Paste raw notes and ask AI to organize them into headings, definitions, and a short quiz.$$,
    $$ວາງບັນທຶກດິບ ແລະ ຂໍໃຫ້ AI ຈັດເປັນຫົວຂໍ້, ຄຳນິຍາມ ແລະ ແບບທົດສອບສັ້ນໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Paste, don't retype$$, 'body', $$Copy your raw class notes, even if messy, directly into the chat. AI can find structure in disorganized text faster than you can retype it neatly.$$),
      jsonb_build_object('heading', $$Ask for three specific outputs$$, 'body', $$Request headings with bullet points, a short glossary of key terms, and five self-test questions — all from the same notes, in one request.$$),
      jsonb_build_object('heading', $$Test yourself before trusting the guide$$, 'body', $$Try answering the generated questions without looking. If you struggle, that reveals exactly which part of the guide needs more review.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວາງໂດຍກົງ ບໍ່ຕ້ອງພິມໃໝ່$$, 'body', $$ຄັດລອກບັນທຶກໃນຫ້ອງຮຽນ ເຖິງແມ່ນວ່າສັບສົນ ວາງເຂົ້າໄປໂດຍກົງ. AI ຊອກຫາໂຄງສ້າງໃນຂໍ້ຄວາມທີ່ບໍ່ເປັນລະບຽບໄດ້ໄວກວ່າທ່ານພິມໃໝ່.$$),
      jsonb_build_object('heading', $$ຂໍຜົນລັບ 3 ຢ່າງສະເພາະ$$, 'body', $$ຂໍຫົວຂໍ້ພ້ອມຈຸດ, ຄຳສັບສຳຄັນສັ້ນໆ ແລະ ຄຳຖາມທົດສອບຕົນເອງ 5 ຂໍ້ — ທັງໝົດຈາກບັນທຶກດຽວກັນ, ໃນຄຳຂໍດຽວ.$$),
      jsonb_build_object('heading', $$ທົດສອບຕົນເອງກ່ອນເຊື່ອຄູ່ມື$$, 'body', $$ລອງຕອບຄຳຖາມທີ່ສ້າງຂຶ້ນໂດຍບໍ່ເບິ່ງ. ຖ້າຕິດຂັດ ນັ້ນຊີ້ໃຫ້ເຫັນສ່ວນທີ່ຕ້ອງທົບທວນເພີ່ມ.$$)
    ),
    array[$$Paste raw notes instead of retyping them$$, $$Ask for headings, glossary, and quiz in one go$$, $$Self-test to find your real gaps$$],
    array[$$ວາງບັນທຶກດິບ ແທນທີ່ຈະພິມໃໝ່$$, $$ຂໍຫົວຂໍ້, ຄຳສັບ ແລະ ແບບທົດສອບໃນຄັ້ງດຽວ$$, $$ທົດສອບຕົນເອງເພື່ອຫາຈຸດອ່ອນຈິງ$$],
    6, false, 24
  ),
  (
    $$rehearse-a-hard-conversation-with-ai$$,
    $$Rehearse a difficult conversation with AI first$$,
    $$ຝຶກຊ້ອມການສົນທະນາທີ່ຍາກກັບ AI ກ່ອນ$$,
    $$Ask AI to role-play the other person so you can practice your words before the real conversation.$$,
    $$ຂໍໃຫ້ AI ສະແດງບົດບາດເປັນອີກຝ່າຍ ເພື່ອໃຫ້ທ່ານຝຶກຄຳເວົ້າກ່ອນສົນທະນາຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Describe the real situation$$, 'body', $$Explain who you're talking to, the relationship, and what outcome you want, such as asking a manager for a raise or telling a friend something hard.$$),
      jsonb_build_object('heading', $$Let AI play the difficult role$$, 'body', $$Ask AI to respond the way the other person realistically might, including pushback, so you can practice staying calm and clear under resistance.$$),
      jsonb_build_object('heading', $$Review the practice afterward$$, 'body', $$After the practice round, ask AI what worked and what to say differently. Real conversations still have surprises, but you'll enter calmer and clearer.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອະທິບາຍສະຖານະການຈິງ$$, 'body', $$ອະທິບາຍວ່າກຳລັງລົມກັບໃຜ, ຄວາມສຳພັນເປັນແນວໃດ ແລະ ຢາກໄດ້ຜົນລັບຫຍັງ ເຊັ່ນ ຂໍຂຶ້ນເງິນເດືອນຈາກຫົວໜ້າ ຫຼື ບອກເລື່ອງຍາກກັບໝູ່.$$),
      jsonb_build_object('heading', $$ໃຫ້ AI ສະແດງບົດບາດຝ່າຍທີ່ຍາກ$$, 'body', $$ຂໍໃຫ້ AI ຕອບແບບອີກຝ່າຍອາດຕອບຈິງ ລວມທັງການໂຕ້ແຍ້ງ ເພື່ອທ່ານໄດ້ຝຶກເວົ້າໃຫ້ສະຫງົບ ແລະ ຊັດເຈນເມື່ອຖືກຄ້ານ.$$),
      jsonb_build_object('heading', $$ທົບທວນຫຼັງຝຶກ$$, 'body', $$ຫຼັງຝຶກແລ້ວ ຖາມ AI ວ່າຫຍັງໄດ້ຜົນ ແລະ ຄວນເວົ້າແນວໃດແທນ. ການສົນທະນາຈິງຍັງມີສິ່ງທີ່ຄາດບໍ່ເຖິງ ແຕ່ທ່ານຈະເຂົ້າໄປແບບສະຫງົບ ແລະ ຊັດເຈນກວ່າ.$$)
    ),
    array[$$Give AI the real context and desired outcome$$, $$Practice against realistic pushback, not an easy version$$, $$Debrief the practice to sharpen your approach$$],
    array[$$ໃຫ້ AI ຮູ້ບໍລິບົດຈິງ ແລະ ຜົນທີ່ຕ້ອງການ$$, $$ຝຶກຮັບມືກັບການໂຕ້ແຍ້ງຈິງ ບໍ່ແມ່ນແບບງ່າຍ$$, $$ທົບທວນຫຼັງຝຶກເພື່ອປັບວິທີການ$$],
    6, false, 25
  ),
  (
    $$translate-with-ai-and-check-it$$,
    $$Use AI to translate text and check the translation$$,
    $$ໃຊ້ AI ແປພາສາ ແລະ ກວດຄວາມຖືກຕ້ອງ$$,
    $$AI translation is usually good but can miss tone, idioms, or context — always check anything important.$$,
    $$ການແປຂອງ AI ມັກຈະດີ ແຕ່ອາດພາດນ້ຳສຽງ, ສຳນວນ ຫຼື ບໍລິບົດ — ໃຫ້ກວດທຸກຢ່າງທີ່ສຳຄັນສະເໝີ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give context, not just text$$, 'body', $$Tell AI who the audience is and the tone needed — formal letter, casual chat, or business email — since the same sentence translates differently by context.$$),
      jsonb_build_object('heading', $$Ask for a back-translation$$, 'body', $$For anything important, ask AI to translate the result back into the original language, then compare the two versions for meaning drift.$$),
      jsonb_build_object('heading', $$Have a native speaker confirm the important ones$$, 'body', $$For contracts, medical instructions, or official documents, have a fluent human speaker review the translation before you rely on it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ບໍລິບົດ ບໍ່ແມ່ນແຕ່ຂໍ້ຄວາມ$$, 'body', $$ບອກ AI ວ່າຜູ້ອ່ານແມ່ນໃຜ ແລະ ຕ້ອງການນ້ຳສຽງແບບໃດ — ຈົດໝາຍທາງການ, ສົນທະນາທົ່ວໄປ ຫຼື ອີເມວທຸລະກິດ ເພາະປະໂຫຍກດຽວກັນແປຕ່າງກັນຕາມບໍລິບົດ.$$),
      jsonb_build_object('heading', $$ຂໍໃຫ້ແປກັບຄືນ$$, 'body', $$ສຳລັບເລື່ອງສຳຄັນ ໃຫ້ AI ແປຜົນລັບກັບຄືນເປັນພາສາຕົ້ນສະບັບ ແລ້ວປຽບທຽບສອງສະບັບເບິ່ງວ່າຄວາມໝາຍປ່ຽນໄປບໍ່.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄົນທີ່ຮູ້ພາສາແທ້ໆຢືນຢັນເລື່ອງສຳຄັນ$$, 'body', $$ສຳລັບສັນຍາ, ຄຳແນະນຳທາງການແພດ ຫຼື ເອກະສານທາງການ ໃຫ້ຄົນທີ່ຄ່ອງແຄ້ວພາສານັ້ນກວດກ່ອນນຳໄປໃຊ້ຈິງ.$$)
    ),
    array[$$Context and tone change how a sentence should translate$$, $$Back-translation reveals meaning drift$$, $$Get human confirmation for important documents$$],
    array[$$ບໍລິບົດ ແລະ ນ້ຳສຽງປ່ຽນວິທີການແປ$$, $$ການແປກັບຄືນຊ່ວຍເຫັນຄວາມໝາຍທີ່ປ່ຽນໄປ$$, $$ໃຫ້ຄົນຢືນຢັນເອກະສານສຳຄັນ$$],
    5, false, 26
  ),
  (
    $$build-a-personal-prompt-library$$,
    $$Build a personal library of prompts you reuse$$,
    $$ສ້າງຄັງຄຳສັ່ງ AI ສ່ວນຕົວທີ່ໃຊ້ຊ້ຳໄດ້$$,
    $$Save your best prompts as templates with blanks to fill in, so you stop rewriting from scratch.$$,
    $$ບັນທຶກຄຳສັ່ງທີ່ດີທີ່ສຸດເປັນແບບຟອມທີ່ມີຊ່ອງຫວ່າງ ເພື່ອບໍ່ຕ້ອງຂຽນໃໝ່ທຸກຄັ້ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Notice what you retype often$$, 'body', $$Watch for tasks you repeat — weekly emails, quiz generation, feedback requests. Those are prime candidates for a saved template.$$),
      jsonb_build_object('heading', $$Turn it into a fill-in-the-blank template$$, 'body', $$Replace the changing details with brackets, like [TOPIC] or [AUDIENCE], and keep a short note file or app of these templates for quick reuse.$$),
      jsonb_build_object('heading', $$Refine templates over time$$, 'body', $$When a prompt gives an especially good result, update your saved version. Your library gets more useful the more you use it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສັງເກດສິ່ງທີ່ພິມຊ້ຳເລື້ອຍໆ$$, 'body', $$ສັງເກດວຽກທີ່ເຮັດຊ້ຳ — ອີເມວປະຈຳອາທິດ, ສ້າງແບບທົດສອບ, ຂໍຄຳຄິດເຫັນ. ເຫຼົ່ານີ້ເໝາະທີ່ຈະບັນທຶກເປັນແບບຟອມ.$$),
      jsonb_build_object('heading', $$ປ່ຽນເປັນແບບຟອມມີຊ່ອງຫວ່າງ$$, 'body', $$ປ່ຽນລາຍລະອຽດທີ່ປ່ຽນແປງເປັນວົງເລັບ ເຊັ່ນ [ຫົວຂໍ້] ຫຼື [ຜູ້ຮັບ] ແລະ ເກັບໄວ້ໃນບັນທຶກ ຫຼື ແອັບເພື່ອນຳກັບມາໃຊ້ໄວ.$$),
      jsonb_build_object('heading', $$ປັບປຸງແບບຟອມໄປເລື່ອຍໆ$$, 'body', $$ເມື່ອຄຳສັ່ງໃດໃຫ້ຜົນດີເປັນພິເສດ ໃຫ້ອັບເດດສະບັບທີ່ບັນທຶກໄວ້. ຄັງຄຳສັ່ງຈະມີປະໂຫຍດຂຶ້ນເລື້ອຍໆຕາມການໃຊ້ງານ.$$)
    ),
    array[$$Repeated tasks are worth turning into templates$$, $$Use brackets for the parts that change$$, $$Keep improving templates as you learn what works$$],
    array[$$ວຽກທີ່ເຮັດຊ້ຳຄວນເຮັດເປັນແບບຟອມ$$, $$ໃຊ້ວົງເລັບສຳລັບສ່ວນທີ່ປ່ຽນແປງ$$, $$ປັບປຸງແບບຟອມຕໍ່ໄປຕາມສິ່ງທີ່ໄດ້ຜົນ$$],
    5, false, 27
  ),
  (
    $$debug-code-step-by-step-with-ai$$,
    $$Use AI to debug simple code step by step$$,
    $$ໃຊ້ AI ແກ້ບັນຫາໂຄ້ດເທື່ອລະຂັ້ນຕອນ$$,
    $$Paste the error message and the smallest piece of code that causes it — not your whole project.$$,
    $$ວາງຂໍ້ຄວາມ error ແລະ ໂຄ້ດສ່ວນນ້ອຍທີ່ສຸດທີ່ເຮັດໃຫ້ເກີດບັນຫາ — ບໍ່ແມ່ນທັງໂປຣເຈັກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Share the exact error and minimal code$$, 'body', $$Paste the full error message plus only the lines needed to reproduce it. A small, focused example gets a faster and more accurate fix.$$),
      jsonb_build_object('heading', $$Ask it to explain, not just fix$$, 'body', $$Request an explanation of why the error happened, not just corrected code, so you learn the pattern and can catch it yourself next time.$$),
      jsonb_build_object('heading', $$Test the fix before trusting it$$, 'body', $$Run the suggested fix yourself and check the actual output. AI-suggested code can still contain mistakes, especially in complex projects.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ແບ່ງປັນ error ແທ້ ແລະ ໂຄ້ດຂັ້ນຕ່ຳ$$, 'body', $$ວາງຂໍ້ຄວາມ error ເຕັມ ພ້ອມແຕ່ແຖວທີ່ຈຳເປັນເພື່ອຈຳລອງບັນຫາ. ຕົວຢ່າງນ້ອຍ ແລະ ຊັດເຈນຈະໄດ້ຄຳຕອບໄວ ແລະ ຖືກຕ້ອງກວ່າ.$$),
      jsonb_build_object('heading', $$ຂໍໃຫ້ອະທິບາຍ ບໍ່ແມ່ນແຕ່ແກ້$$, 'body', $$ຂໍຄຳອະທິບາຍວ່າເປັນຫຍັງເກີດ error ບໍ່ແມ່ນແຕ່ໂຄ້ດທີ່ແກ້ແລ້ວ ເພື່ອທ່ານຮຽນຮູ້ຮູບແບບ ແລະ ຈັບໄດ້ເອງໃນຄັ້ງຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ທົດສອບການແກ້ໄຂກ່ອນເຊື່ອ$$, 'body', $$ລອງແລ່ນໂຄ້ດທີ່ AI ແນະນຳດ້ວຍຕົນເອງ ແລະ ກວດຜົນລັບຈິງ. ໂຄ້ດທີ່ AI ແນະນຳຍັງອາດມີຂໍ້ຜິດພາດ ໂດຍສະເພາະໃນໂປຣເຈັກທີ່ຊັບຊ້ອນ.$$)
    ),
    array[$$Share the exact error and minimal reproducible code$$, $$Ask for an explanation to learn, not just a fix$$, $$Always test the suggested fix yourself$$],
    array[$$ແບ່ງປັນ error ແທ້ ແລະ ໂຄ້ດຂັ້ນຕ່ຳທີ່ຈຳລອງໄດ້$$, $$ຂໍຄຳອະທິບາຍເພື່ອຮຽນຮູ້ ບໍ່ແມ່ນແຕ່ຄຳຕອບ$$, $$ທົດສອບການແກ້ໄຂດ້ວຍຕົນເອງສະເໝີ$$],
    6, false, 28
  ),
  (
    $$plan-a-trip-on-a-budget-with-ai$$,
    $$Use AI to plan a trip within a real budget$$,
    $$ໃຊ້ AI ວາງແຜນທ່ຽວພາຍໃນງົບປະມານຈິງ$$,
    $$Give AI your dates, budget, and priorities so it plans around real constraints, not a generic itinerary.$$,
    $$ບອກ AI ວັນທີ, ງົບປະມານ ແລະ ຄວາມສຳຄັນຂອງທ່ານ ເພື່ອໃຫ້ວາງແຜນຕາມຂໍ້ຈຳກັດຈິງ ບໍ່ແມ່ນແຜນທົ່ວໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State your real constraints upfront$$, 'body', $$Give exact dates, total budget, number of travelers, and must-do priorities. A vague request produces a generic list that doesn't fit your trip.$$),
      jsonb_build_object('heading', $$Ask for a day-by-day cost breakdown$$, 'body', $$Request a daily plan with estimated costs for transport, food, and activities so you can see whether the plan actually fits your budget.$$),
      jsonb_build_object('heading', $$Verify prices and opening hours yourself$$, 'body', $$Ticket prices, hours, and availability change often and AI may be out of date. Confirm the key details on an official site before you book.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຂໍ້ຈຳກັດຈິງກ່ອນ$$, 'body', $$ບອກວັນທີແທ້, ງົບປະມານທັງໝົດ, ຈຳນວນຄົນ ແລະ ສິ່ງທີ່ຕ້ອງເຮັດ. ຄຳຂໍທີ່ບໍ່ຊັດເຈນຈະໄດ້ລາຍການທົ່ວໄປທີ່ບໍ່ເໝາະກັບການທ່ຽວຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ຂໍລາຍລະອຽດຄ່າໃຊ້ຈ່າຍລາຍວັນ$$, 'body', $$ຂໍແຜນລາຍວັນພ້ອມຄ່າໃຊ້ຈ່າຍປະມານການສຳລັບການເດີນທາງ, ອາຫານ ແລະ ກິດຈະກຳ ເພື່ອເບິ່ງວ່າແຜນເໝາະກັບງົບປະມານແທ້ບໍ່.$$),
      jsonb_build_object('heading', $$ກວດລາຄາ ແລະ ເວລາເປີດເອງ$$, 'body', $$ລາຄາປີ້, ເວລາເປີດ ແລະ ຄິວປ່ຽນເລື້ອຍໆ ແລະ AI ອາດຂໍ້ມູນເກົ່າ. ກວດລາຍລະອຽດສຳຄັນຈາກເວັບໄຊທາງການກ່ອນຈອງ.$$)
    ),
    array[$$Give exact dates, budget, and priorities upfront$$, $$Ask for a day-by-day cost breakdown$$, $$Confirm prices and hours from official sources$$],
    array[$$ບອກວັນທີ, ງົບປະມານ ແລະ ຄວາມສຳຄັນໃຫ້ຊັດເຈນ$$, $$ຂໍລາຍລະອຽດຄ່າໃຊ້ຈ່າຍລາຍວັນ$$, $$ກວດລາຄາ ແລະ ເວລາຈາກແຫຼ່ງທາງການ$$],
    6, false, 29
  ),
  (
    $$build-a-realistic-study-schedule-with-ai$$,
    $$Use AI to build a study schedule you'll actually follow$$,
    $$ໃຊ້ AI ສ້າງຕາຕະລາງຮຽນທີ່ເຮັດໄດ້ຈິງ$$,
    $$Give AI your real available hours and exam dates so the schedule fits your life, not an ideal student's.$$,
    $$ບອກ AI ຊົ່ວໂມງທີ່ວ່າງຈິງ ແລະ ວັນສອບເສັງ ເພື່ອໃຫ້ຕາຕະລາງເໝາະກັບຊີວິດຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List real hours, not ideal hours$$, 'body', $$Tell AI your actual free time slots around school, work, and rest — not the number of hours you wish you had.$$),
      jsonb_build_object('heading', $$Ask for spaced review, not cramming$$, 'body', $$Request that each topic gets revisited a few days apart rather than studied once. Spaced repetition helps memory more than one long session.$$),
      jsonb_build_object('heading', $$Review and adjust weekly$$, 'body', $$At the end of each week, tell AI what you actually completed so it can adjust the remaining plan instead of leaving you further behind.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຊົ່ວໂມງຈິງ ບໍ່ແມ່ນຊົ່ວໂມງໃນອຸດົມຄະຕິ$$, 'body', $$ບອກ AI ຊ່ວງເວລາວ່າງແທ້ໆ ນອກເໜືອຈາກໂຮງຮຽນ, ວຽກ ແລະ ການພັກຜ່ອນ — ບໍ່ແມ່ນຈຳນວນຊົ່ວໂມງທີ່ຢາກມີ.$$),
      jsonb_build_object('heading', $$ຂໍການທົບທວນແບບຫ່າງໆ ບໍ່ແມ່ນອັດແໜ້ນ$$, 'body', $$ຂໍໃຫ້ແຕ່ລະຫົວຂໍ້ຖືກທົບທວນຫຼາຍຄັ້ງໃນຊ່ວງເວລາຫ່າງກັນ ແທນທີ່ຈະຮຽນຄັ້ງດຽວ. ການທົບທວນແບບຫ່າງໆຊ່ວຍຄວາມຈຳໄດ້ດີກວ່າການຮຽນຍາວຄັ້ງດຽວ.$$),
      jsonb_build_object('heading', $$ທົບທວນ ແລະ ປັບແຜນທຸກອາທິດ$$, 'body', $$ທ້າຍອາທິດ ບອກ AI ວ່າເຮັດຫຍັງສຳເລັດແທ້ ເພື່ອໃຫ້ມັນປັບແຜນທີ່ເຫຼືອ ແທນທີ່ຈະປ່ອຍໃຫ້ທ່ານຊ້າຂຶ້ນເລື້ອຍໆ.$$)
    ),
    array[$$Base the schedule on real available hours$$, $$Ask for spaced review across days, not cramming$$, $$Adjust the plan weekly based on real progress$$],
    array[$$ອີງຕາຕະລາງໃສ່ຊົ່ວໂມງວ່າງຈິງ$$, $$ຂໍການທົບທວນແບບຫ່າງໆ ບໍ່ແມ່ນອັດແໜ້ນ$$, $$ປັບແຜນທຸກອາທິດຕາມຄວາມຄືບໜ້າຈິງ$$],
    5, false, 30
  ),
  (
    $$practice-interview-questions-with-ai$$,
    $$Use AI to practice interview questions$$,
    $$ໃຊ້ AI ຝຶກຕອບຄຳຖາມສຳພາດ$$,
    $$Ask AI to interview you one question at a time and give direct feedback on each answer.$$,
    $$ໃຫ້ AI ສຳພາດທ່ານເທື່ອລະຄຳຖາມ ແລະ ໃຫ້ຄຳຄິດເຫັນກົງໆຕໍ່ແຕ່ລະຄຳຕອບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give the real job and your background$$, 'body', $$Paste the job description and a short summary of your experience so questions match the actual role, not a generic interview.$$),
      jsonb_build_object('heading', $$Answer out loud, then get feedback$$, 'body', $$Say your answer as you would in the real interview, then ask AI what was strong, what was vague, and how to trim a long answer.$$),
      jsonb_build_object('heading', $$Practice the hard questions most$$, 'body', $$Focus repeat rounds on the two or three questions that feel hardest — salary, weaknesses, gaps in your history — rather than the easy ones.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຕຳແໜ່ງງານຈິງ ແລະ ພື້ນຖານຂອງທ່ານ$$, 'body', $$ວາງລາຍລະອຽດຕຳແໜ່ງງານ ແລະ ສະຫຼຸບປະສົບການສັ້ນໆ ເພື່ອໃຫ້ຄຳຖາມກົງກັບຕຳແໜ່ງຈິງ ບໍ່ແມ່ນການສຳພາດທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ຕອບອອກສຽງ ແລ້ວຂໍຄຳຄິດເຫັນ$$, 'body', $$ຕອບອອກສຽງຄືກັບສຳພາດຈິງ ແລ້ວຖາມ AI ວ່າສ່ວນໃດແຂງແຮງ, ສ່ວນໃດບໍ່ຊັດເຈນ ແລະ ຈະຫຍໍ້ຄຳຕອບທີ່ຍາວແນວໃດ.$$),
      jsonb_build_object('heading', $$ຝຶກຄຳຖາມທີ່ຍາກທີ່ສຸດເລື້ອຍໆ$$, 'body', $$ໃຫ້ຄວາມສຳຄັນກັບ 2-3 ຄຳຖາມທີ່ຮູ້ສຶກຍາກທີ່ສຸດ — ເງິນເດືອນ, ຈຸດອ່ອນ, ຊ່ວງຫວ່າງໃນປະຫວັດ — ຫຼາຍກວ່າຄຳຖາມງ່າຍ.$$)
    ),
    array[$$Use the real job description for relevant questions$$, $$Answer aloud, then request specific feedback$$, $$Spend extra practice on the hardest questions$$],
    array[$$ໃຊ້ລາຍລະອຽດຕຳແໜ່ງງານຈິງເພື່ອຄຳຖາມທີ່ກ່ຽວຂ້ອງ$$, $$ຕອບອອກສຽງ ແລ້ວຂໍຄຳຄິດເຫັນສະເພາະ$$, $$ໃຫ້ເວລາຝຶກຄຳຖາມທີ່ຍາກທີ່ສຸດເພີ່ມ$$],
    6, false, 31
  ),
  (
    $$explain-hard-concepts-with-analogies$$,
    $$Ask AI to explain hard concepts using analogies$$,
    $$ໃຫ້ AI ອະທິບາຍເລື່ອງຍາກໂດຍໃຊ້ການປຽບທຽບ$$,
    $$A good analogy connects new information to something you already understand well.$$,
    $$ການປຽບທຽບທີ່ດີເຊື່ອມຂໍ້ມູນໃໝ່ກັບສິ່ງທີ່ທ່ານເຂົ້າໃຈດີແລ້ວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name something you already know$$, 'body', $$Tell AI a topic you understand well — cooking, football, farming — and ask it to explain the hard concept using that world.$$),
      jsonb_build_object('heading', $$Ask for the limits of the analogy$$, 'body', $$Every analogy breaks down somewhere. Ask AI where the comparison stops being accurate so you don't build a wrong mental model.$$),
      jsonb_build_object('heading', $$Explain it back in your own analogy$$, 'body', $$Try creating your own analogy for the concept and ask AI to check whether it still holds. Teaching it back is the strongest test of real understanding.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກສິ່ງທີ່ທ່ານຮູ້ຢູ່ແລ້ວ$$, 'body', $$ບອກ AI ເລື່ອງທີ່ທ່ານເຂົ້າໃຈດີ — ການເຮັດອາຫານ, ບານເຕະ, ການເຮັດກະສິກຳ — ແລ້ວຂໍໃຫ້ອະທິບາຍເລື່ອງຍາກໂດຍໃຊ້ໂລກນັ້ນ.$$),
      jsonb_build_object('heading', $$ຖາມຂອບເຂດຂອງການປຽບທຽບ$$, 'body', $$ທຸກການປຽບທຽບມີຈຸດທີ່ບໍ່ກົງກັນ. ຖາມ AI ວ່າການປຽບທຽບເລີ່ມບໍ່ຖືກຕ້ອງຈຸດໃດ ເພື່ອບໍ່ໃຫ້ເຂົ້າໃຈຜິດ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍຄືນດ້ວຍການປຽບທຽບຂອງທ່ານເອງ$$, 'body', $$ລອງສ້າງການປຽບທຽບຂອງທ່ານເອງສຳລັບແນວຄິດນັ້ນ ແລ້ວໃຫ້ AI ກວດວ່າຍັງຖືກຢູ່ບໍ່. ການອະທິບາຍຄືນເປັນການທົດສອບຄວາມເຂົ້າໃຈທີ່ດີທີ່ສຸດ.$$)
    ),
    array[$$Anchor new ideas to something you already know$$, $$Ask where the analogy stops being accurate$$, $$Explaining it back yourself confirms real understanding$$],
    array[$$ຜູກແນວຄິດໃໝ່ກັບສິ່ງທີ່ຮູ້ຢູ່ແລ້ວ$$, $$ຖາມວ່າການປຽບທຽບເລີ່ມບໍ່ຖືກຕ້ອງຈຸດໃດ$$, $$ອະທິບາຍຄືນດ້ວຍຕົນເອງເພື່ອຢືນຢັນຄວາມເຂົ້າໃຈ$$],
    5, false, 32
  ),
  (
    $$check-your-cv-clarity-with-ai$$,
    $$Use AI to check your CV for clarity, not to fake it$$,
    $$ໃຊ້ AI ກວດ CV ໃຫ້ຊັດເຈນ ບໍ່ແມ່ນສ້າງຂໍ້ມູນປອມ$$,
    $$Ask AI to sharpen how you describe real achievements — never to invent experience you don't have.$$,
    $$ຂໍໃຫ້ AI ຊ່ວຍອະທິບາຍຜົນງານຈິງໃຫ້ຄົມກວ່າ — ຢ່າໃຫ້ສ້າງປະສົບການປອມ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give it your real accomplishments$$, 'body', $$List what you actually did and any real numbers or outcomes. AI can sharpen the wording, but the substance must be true.$$),
      jsonb_build_object('heading', $$Ask for action verbs and impact$$, 'body', $$Request stronger action verbs and a clear result for each line, such as "organized" becoming "led a 5-person team that increased sign-ups by 20%."$$),
      jsonb_build_object('heading', $$Check length and honesty last$$, 'body', $$Ask AI to flag anything that sounds exaggerated or vague, and to trim the document to a length appropriate for your experience level.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຜົນງານຈິງຂອງທ່ານ$$, 'body', $$ຂຽນສິ່ງທີ່ທ່ານເຮັດແທ້ ແລະ ຕົວເລກ ຫຼື ຜົນລັບຈິງ. AI ຊ່ວຍປັບຄຳເວົ້າໄດ້ ແຕ່ເນື້ອຫາຕ້ອງເປັນຄວາມຈິງ.$$),
      jsonb_build_object('heading', $$ຂໍຄຳກິລິຍາທີ່ໜັກແໜ້ນ ແລະ ຜົນກະທົບ$$, 'body', $$ຂໍຄຳກິລິຍາທີ່ໜັກແໜ້ນຂຶ້ນ ແລະ ຜົນລັບຊັດເຈນໃນແຕ່ລະແຖວ ເຊັ່ນ "ຈັດການ" ປ່ຽນເປັນ "ນຳທີມ 5 ຄົນທີ່ເພີ່ມຍອດສະໝັກ 20%."$$),
      jsonb_build_object('heading', $$ກວດຄວາມຍາວ ແລະ ຄວາມຈິງໃນຕອນສຸດທ້າຍ$$, 'body', $$ໃຫ້ AI ຊີ້ຈຸດທີ່ຟັງເກີນຄວາມຈິງ ຫຼື ບໍ່ຊັດເຈນ ແລະ ຫຍໍ້ເອກະສານໃຫ້ເໝາະກັບລະດັບປະສົບການຂອງທ່ານ.$$)
    ),
    array[$$Only feed AI accomplishments that are actually true$$, $$Ask for strong action verbs with measurable impact$$, $$Check for exaggeration before you send it out$$],
    array[$$ໃຫ້ AI ຮູ້ແຕ່ຜົນງານທີ່ເປັນຄວາມຈິງ$$, $$ຂໍຄຳກິລິຍາທີ່ໜັກແໜ້ນພ້ອມຜົນກະທົບທີ່ວັດແທກໄດ້$$, $$ກວດຂໍ້ຄວາມທີ່ເກີນຄວາມຈິງກ່ອນສົ່ງ$$],
    6, false, 33
  ),
  (
    $$generate-practice-quiz-from-notes$$,
    $$Use AI to generate practice quiz questions from your notes$$,
    $$ໃຊ້ AI ສ້າງຄຳຖາມທົດສອບຈາກບັນທຶກຂອງທ່ານ$$,
    $$Testing yourself with questions beats rereading — AI can generate a fresh quiz from your own material in seconds.$$,
    $$ການທົດສອບຕົນເອງດ້ວຍຄຳຖາມໄດ້ຜົນດີກວ່າການອ່ານຄືນ — AI ສ້າງແບບທົດສອບຈາກບັນທຶກຂອງທ່ານໄດ້ໄວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for mixed question types$$, 'body', $$Request a mix of multiple-choice, short-answer, and one "explain in your own words" question so you're tested at different levels of understanding.$$),
      jsonb_build_object('heading', $$Answer before checking$$, 'body', $$Write your answer first, without looking at your notes, then compare against the source material — not against AI's answer key alone.$$),
      jsonb_build_object('heading', $$Ask for harder follow-ups on weak spots$$, 'body', $$For any question you got wrong, ask AI for two more questions on that exact sub-topic until it feels solid.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍຄຳຖາມຫຼາຍຮູບແບບປະສົມກັນ$$, 'body', $$ຂໍປະສົມແບບຫຼາຍທາງເລືອກ, ຄຳຕອບສັ້ນ ແລະ ຄຳຖາມ "ອະທິບາຍດ້ວຍຄຳເວົ້າຂອງທ່ານເອງ" ເພື່ອທົດສອບຄວາມເຂົ້າໃຈຫຼາຍລະດັບ.$$),
      jsonb_build_object('heading', $$ຕອບກ່ອນກວດ$$, 'body', $$ຂຽນຄຳຕອບກ່ອນ ໂດຍບໍ່ເບິ່ງບັນທຶກ ແລ້ວປຽບທຽບກັບເນື້ອຫາຕົ້ນສະບັບ — ບໍ່ແມ່ນແຕ່ຄຳຕອບຂອງ AI ຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ຂໍຄຳຖາມຍາກຂຶ້ນສຳລັບຈຸດອ່ອນ$$, 'body', $$ສຳລັບຄຳຖາມທີ່ຕອບຜິດ ໃຫ້ຂໍ AI ສ້າງຄຳຖາມເພີ່ມອີກ 2 ຂໍ້ໃນຫົວຂໍ້ຍ່ອຍນັ້ນ ຈົນຮູ້ສຶກໝັ້ນໃຈ.$$)
    ),
    array[$$Mix question types to test different depths$$, $$Answer before checking, not while looking at notes$$, $$Drill weak spots with targeted follow-up questions$$],
    array[$$ປະສົມແບບຄຳຖາມເພື່ອທົດສອບຄວາມເຂົ້າໃຈຫຼາຍລະດັບ$$, $$ຕອບກ່ອນກວດ ບໍ່ແມ່ນຕອບໄປພ້ອມເບິ່ງບັນທຶກ$$, $$ຝຶກຈຸດອ່ອນດ້ວຍຄຳຖາມເພີ່ມທີ່ກົງເປົ້າ$$],
    5, false, 34
  ),
  (
    $$research-responsibly-with-ai$$,
    $$Use AI for research responsibly: verify and cite$$,
    $$ໃຊ້ AI ຄົ້ນຄວ້າຢ່າງມີຄວາມຮັບຜິດຊອບ: ກວດສອບ ແລະ ອ້າງອີງ$$,
    $$AI is a good starting point for research, but the sources it names still need to be found and read directly.$$,
    $$AI ເປັນຈຸດເລີ່ມຕົ້ນທີ່ດີໃນການຄົ້ນຄວ້າ ແຕ່ແຫຼ່ງອ້າງອີງທີ່ມັນອອກຊື່ຍັງຕ້ອງຄົ້ນຫາ ແລະ ອ່ານເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use AI to map the topic first$$, 'body', $$Ask AI for the main sub-topics, key terms, and open questions in a field before diving into deep reading. This builds a mental map faster.$$),
      jsonb_build_object('heading', $$Find and read the actual sources$$, 'body', $$When AI names a study, report, or expert, search for it yourself and read the primary source before citing it in your own work.$$),
      jsonb_build_object('heading', $$Never cite AI as the source$$, 'body', $$AI output is a summary tool, not a citable authority. Cite the original study, article, or dataset it points you toward instead.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ AI ວາງແຜນຫົວຂໍ້ກ່ອນ$$, 'body', $$ຂໍ AI ບອກຫົວຂໍ້ຍ່ອຍຫຼັກ, ຄຳສັບສຳຄັນ ແລະ ຄຳຖາມທີ່ຍັງເປີດຢູ່ໃນສາຂານັ້ນ ກ່ອນອ່ານເລິກ. ຊ່ວຍສ້າງແຜນທີ່ຄວາມຄິດໄດ້ໄວ.$$),
      jsonb_build_object('heading', $$ຄົ້ນຫາ ແລະ ອ່ານແຫຼ່ງອ້າງອີງຈິງ$$, 'body', $$ເມື່ອ AI ອອກຊື່ການສຶກສາ, ບົດລາຍງານ ຫຼື ຜູ້ຊ່ຽວຊານ ໃຫ້ຄົ້ນຫາ ແລະ ອ່ານແຫຼ່ງຕົ້ນສະບັບເອງກ່ອນອ້າງອີງໃນວຽກຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ຢ່າອ້າງອີງ AI ເປັນແຫຼ່ງຂໍ້ມູນ$$, 'body', $$ຜົນລັບຈາກ AI ເປັນເຄື່ອງມືສະຫຼຸບ ບໍ່ແມ່ນແຫຼ່ງອ້າງອີງທີ່ໜ້າເຊື່ອຖື. ໃຫ້ອ້າງອີງການສຶກສາ, ບົດຄວາມ ຫຼືຂໍ້ມູນຕົ້ນສະບັບແທນ.$$)
    ),
    array[$$Use AI to map a topic, not as the final source$$, $$Find and read the primary sources it points to$$, $$Cite the original source, never the AI conversation$$],
    array[$$ໃຊ້ AI ວາງແຜນຫົວຂໍ້ ບໍ່ແມ່ນແຫຼ່ງອ້າງອີງສຸດທ້າຍ$$, $$ຄົ້ນຫາ ແລະ ອ່ານແຫຼ່ງຕົ້ນສະບັບທີ່ມັນຊີ້ໄປ$$, $$ອ້າງອີງແຫຼ່ງຕົ້ນສະບັບ ບໍ່ແມ່ນການສົນທະນາກັບ AI$$],
    6, false, 35
  ),
  (
    $$understand-ai-knowledge-cutoff$$,
    $$Understand AI's knowledge cutoff and why it matters$$,
    $$ເຂົ້າໃຈຂອບເຂດຄວາມຮູ້ຂອງ AI ວ່າສຳຄັນແນວໃດ$$,
    $$Most AI models learned from data up to a certain date and won't know about anything more recent unless it can search.$$,
    $$ໂມເດວ AI ສ່ວນຫຼາຍຮຽນຮູ້ຈາກຂໍ້ມູນຮອດວັນທີໃດໜຶ່ງ ແລະ ຈະບໍ່ຮູ້ເລື່ອງໃໝ່ກວ່ານັ້ນ ນອກຈາກມັນຄົ້ນຫາເວັບໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask AI what its cutoff is$$, 'body', $$Before relying on it for current events, prices, or recent news, ask AI directly what its knowledge cutoff date is.$$),
      jsonb_build_object('heading', $$Use search-enabled tools for current events$$, 'body', $$For anything time-sensitive — news, prices, sports scores — use an AI tool that can actually search the live web, not just its training data.$$),
      jsonb_build_object('heading', $$Double-check dates and version numbers$$, 'body', $$Software versions, prices, and leadership positions change constantly. Verify these against a current source rather than trusting AI's memory.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມ AI ວ່າຂອບເຂດຄວາມຮູ້ຮອດເມື່ອໃດ$$, 'body', $$ກ່ອນເຊື່ອຖືມັນສຳລັບຂ່າວປັດຈຸບັນ, ລາຄາ ຫຼືເຫດການໃໝ່ ໃຫ້ຖາມ AI ໂດຍກົງວ່າຂອບເຂດຄວາມຮູ້ຂອງມັນຮອດວັນທີໃດ.$$),
      jsonb_build_object('heading', $$ໃຊ້ເຄື່ອງມືທີ່ຄົ້ນຫາເວັບໄດ້ສຳລັບເລື່ອງປັດຈຸບັນ$$, 'body', $$ສຳລັບເລື່ອງທີ່ອິງເວລາ — ຂ່າວ, ລາຄາ, ຜົນກິລາ — ໃຫ້ໃຊ້ AI ທີ່ຄົ້ນຫາເວັບໄດ້ຈິງ ບໍ່ແມ່ນແຕ່ຂໍ້ມູນທີ່ຝຶກມາ.$$),
      jsonb_build_object('heading', $$ກວດວັນທີ ແລະ ເລກເວີຊັນຄືນ$$, 'body', $$ເວີຊັນຊອບແວ, ລາຄາ ແລະ ຕຳແໜ່ງຜູ້ນຳປ່ຽນແປງເລື້ອຍໆ. ກວດຄືນຈາກແຫຼ່ງປັດຈຸບັນ ແທນທີ່ຈະເຊື່ອຄວາມຈຳຂອງ AI.$$)
    ),
    array[$$Ask AI directly what its knowledge cutoff is$$, $$Use a search-enabled tool for time-sensitive facts$$, $$Verify dates, prices, and versions from current sources$$],
    array[$$ຖາມ AI ໂດຍກົງເລື່ອງຂອບເຂດຄວາມຮູ້$$, $$ໃຊ້ເຄື່ອງມືທີ່ຄົ້ນຫາເວັບໄດ້ສຳລັບຂໍ້ມູນທີ່ອິງເວລາ$$, $$ກວດວັນທີ, ລາຄາ ແລະ ເວີຊັນຈາກແຫຼ່ງປັດຈຸບັນ$$],
    5, false, 36
  ),
  (
    $$use-persona-prompts-effectively$$,
    $$Use persona prompts to get more useful answers$$,
    $$ໃຊ້ຄຳສັ່ງແບບກຳນົດບົດບາດເພື່ອຄຳຕອບທີ່ເປັນປະໂຫຍດກວ່າ$$,
    $$Asking AI to "act as" a specific expert shapes the vocabulary, depth, and focus of its answer.$$,
    $$ການຂໍໃຫ້ AI "ສະແດງບົດບາດເປັນ" ຜູ້ຊ່ຽວຊານສະເພາະ ຊ່ວຍປັບຄຳສັບ, ຄວາມເລິກ ແລະ ຈຸດສຸມຂອງຄຳຕອບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick a persona that fits the task$$, 'body', $$"Act as a patient high school tutor" gives a different answer than "act as a strict exam grader." Choose the persona that matches what you need.$$),
      jsonb_build_object('heading', $$Combine persona with audience$$, 'body', $$Add who the output is for: "explain this as a nurse would to a worried parent" narrows tone, vocabulary, and level of detail even further.$$),
      jsonb_build_object('heading', $$Remember the persona doesn't add real credentials$$, 'body', $$"Act as a doctor" makes AI write like a doctor, but does not make it one. Treat medical, legal, or financial personas as style guides, not real advice.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກບົດບາດທີ່ເໝາະກັບວຽກ$$, 'body', $$"ສະແດງບົດບາດເປັນຄູສອນທີ່ໃຈເຢັນ" ໃຫ້ຄຳຕອບຕ່າງຈາກ "ສະແດງບົດບາດເປັນຜູ້ກວດຂໍ້ສອບທີ່ເຂັ້ມງວດ" ເລືອກໃຫ້ເໝາະກັບສິ່ງທີ່ຕ້ອງການ.$$),
      jsonb_build_object('heading', $$ປະສົມບົດບາດກັບຜູ້ຮັບ$$, 'body', $$ເພີ່ມວ່າຜົນລັບແມ່ນສຳລັບໃຜ: "ອະທິບາຍແບບພະຍາບານເວົ້າກັບພໍ່ແມ່ທີ່ກັງວົນ" ຈຳກັດນ້ຳສຽງ, ຄຳສັບ ແລະ ລະດັບລາຍລະອຽດໃຫ້ແຄບລົງອີກ.$$),
      jsonb_build_object('heading', $$ຈື່ໄວ້ວ່າບົດບາດບໍ່ໄດ້ໃຫ້ຄຸນວຸດທິຈິງ$$, 'body', $$"ສະແດງບົດບາດເປັນທ່ານໝໍ" ເຮັດໃຫ້ AI ຂຽນຄືທ່ານໝໍ ແຕ່ບໍ່ໄດ້ເຮັດໃຫ້ມັນເປັນທ່ານໝໍແທ້. ຖືວ່າບົດບາດດ້ານການແພດ, ກົດໝາຍ ຫຼືການເງິນເປັນພຽງແບບແຜນການຂຽນ ບໍ່ແມ່ນຄຳແນະນຳຈິງ.$$)
    ),
    array[$$Choose a persona that matches your actual need$$, $$Add the audience for even more tailored output$$, $$A persona changes style, not real expertise or credentials$$],
    array[$$ເລືອກບົດບາດທີ່ກົງກັບຄວາມຕ້ອງການຈິງ$$, $$ເພີ່ມຜູ້ຮັບເພື່ອຜົນລັບທີ່ເໝາະສົມກວ່າ$$, $$ບົດບາດປ່ຽນແຕ່ຮູບແບບການຂຽນ ບໍ່ແມ່ນຄວາມຊ່ຽວຊານຈິງ$$],
    5, false, 37
  ),
  (
    $$iterate-a-prompt-that-misses$$,
    $$Iterate a prompt when the first answer misses the mark$$,
    $$ປັບປຸງຄຳສັ່ງເມື່ອຄຳຕອບທຳອິດບໍ່ຕົງເປົ້າ$$,
    $$A weak first answer usually means the prompt was missing information, not that AI "can't do it."$$,
    $$ຄຳຕອບທຳອິດທີ່ອ່ອນ ມັກໝາຍຄວາມວ່າຄຳສັ່ງຂາດຂໍ້ມູນ ບໍ່ແມ່ນວ່າ AI "ເຮັດບໍ່ໄດ້."$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name exactly what's wrong$$, 'body', $$Instead of just saying "try again," say precisely what's missing: too long, too formal, missing an example, or wrong audience.$$),
      jsonb_build_object('heading', $$Add the missing constraint$$, 'body', $$If the tone was off, state the tone directly. If the length was wrong, give a word or sentence count. Specific constraints fix specific problems.$$),
      jsonb_build_object('heading', $$Keep the good parts, revise the rest$$, 'body', $$Tell AI what to keep from the previous answer and only ask it to change the specific part that didn't work, instead of starting over.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຈຸດຜິດພາດຢ່າງແທ້ຈິງ$$, 'body', $$ແທນທີ່ຈະບອກແຕ່ວ່າ "ລອງໃໝ່" ໃຫ້ບອກຈຸດແທ້ໆ: ຍາວເກີນ, ທາງການເກີນ, ຂາດຕົວຢ່າງ ຫຼືຜິດຜູ້ຮັບ.$$),
      jsonb_build_object('heading', $$ເພີ່ມຂໍ້ຈຳກັດທີ່ຂາດຫາຍ$$, 'body', $$ຖ້ານ້ຳສຽງບໍ່ຖືກ ໃຫ້ບອກນ້ຳສຽງໂດຍກົງ. ຖ້າຄວາມຍາວບໍ່ຖືກ ໃຫ້ບອກຈຳນວນຄຳ ຫຼືປະໂຫຍກ. ຂໍ້ຈຳກັດສະເພາະແກ້ບັນຫາສະເພາະ.$$),
      jsonb_build_object('heading', $$ຮັກສາສ່ວນທີ່ດີ ແກ້ໄຂແຕ່ສ່ວນທີ່ເຫຼືອ$$, 'body', $$ບອກ AI ວ່າຈະຮັກສາສ່ວນໃດຈາກຄຳຕອບກ່ອນ ແລະ ຂໍໃຫ້ປ່ຽນສະເພາະສ່ວນທີ່ບໍ່ໄດ້ຜົນ ແທນທີ່ຈະເລີ່ມໃໝ່ທັງໝົດ.$$)
    ),
    array[$$Name exactly what was wrong with the first answer$$, $$Add the specific constraint that was missing$$, $$Ask to revise only the weak part, not everything$$],
    array[$$ບອກຈຸດຜິດພາດຂອງຄຳຕອບທຳອິດຢ່າງແທ້ຈິງ$$, $$ເພີ່ມຂໍ້ຈຳກັດສະເພາະທີ່ຂາດຫາຍ$$, $$ຂໍໃຫ້ແກ້ໄຂແຕ່ສ່ວນທີ່ອ່ອນ ບໍ່ແມ່ນທັງໝົດ$$],
    4, false, 38
  ),
  (
    $$simplify-jargon-with-ai$$,
    $$Use AI to simplify technical jargon into plain language$$,
    $$ໃຊ້ AI ປ່ຽນຄຳສັບວິຊາການໃຫ້ເປັນພາສາງ່າຍ$$,
    $$Ask for a specific reading level and a real-world comparison to make dense text approachable.$$,
    $$ຂໍລະດັບການອ່ານສະເພາະ ແລະ ການປຽບທຽບກັບໂລກຈິງ ເພື່ອໃຫ້ຂໍ້ຄວາມທີ່ໜັກເຂົ້າໃຈງ່າຍຂຶ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set a target reading level$$, 'body', $$Ask AI to rewrite the text for a specific level, like "explain to a 12-year-old" or "explain to a colleague outside this field."$$),
      jsonb_build_object('heading', $$Ask it to keep the meaning intact$$, 'body', $$Simplification can accidentally drop important nuance. Ask AI to flag anything it had to simplify that changes the precise meaning.$$),
      jsonb_build_object('heading', $$Compare both versions side by side$$, 'body', $$Keep the original and simplified text next to each other so you can confirm nothing important was lost in translation to plain language.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຳນົດລະດັບການອ່ານເປົ້າໝາຍ$$, 'body', $$ຂໍ AI ຂຽນຄືນສຳລັບລະດັບສະເພາະ ເຊັ່ນ "ອະທິບາຍໃຫ້ເດັກ 12 ປີເຂົ້າໃຈ" ຫຼື "ອະທິບາຍໃຫ້ເພື່ອນຮ່ວມງານທີ່ບໍ່ຢູ່ໃນສາຍນີ້ເຂົ້າໃຈ."$$),
      jsonb_build_object('heading', $$ຂໍໃຫ້ຮັກສາຄວາມໝາຍໃຫ້ຄົບ$$, 'body', $$ການເຮັດໃຫ້ງ່າຍອາດເຮັດໃຫ້ຂາດລາຍລະອຽດສຳຄັນໂດຍບໍ່ຕັ້ງໃຈ. ໃຫ້ AI ຊີ້ບອກສ່ວນທີ່ຕ້ອງເຮັດໃຫ້ງ່າຍຈົນປ່ຽນຄວາມໝາຍແທ້.$$),
      jsonb_build_object('heading', $$ປຽບທຽບສອງສະບັບຄຽງກັນ$$, 'body', $$ຮັກສາຂໍ້ຄວາມຕົ້ນສະບັບ ແລະ ສະບັບງ່າຍໄວ້ຄຽງກັນ ເພື່ອຢືນຢັນວ່າບໍ່ມີສ່ວນສຳຄັນເສຍໄປໃນການປ່ຽນເປັນພາສາງ່າຍ.$$)
    ),
    array[$$Ask AI to target a specific reading level$$, $$Have it flag any nuance lost in simplifying$$, $$Compare both versions before trusting the simple one$$],
    array[$$ຂໍ AI ໃຫ້ຕັ້ງເປົ້າລະດັບການອ່ານສະເພາະ$$, $$ໃຫ້ຊີ້ບອກລາຍລະອຽດທີ່ເສຍໄປຕອນເຮັດໃຫ້ງ່າຍ$$, $$ປຽບທຽບສອງສະບັບກ່ອນເຊື່ອສະບັບງ່າຍ$$],
    5, false, 39
  ),
  (
    $$protect-privacy-with-ai-tools$$,
    $$Protect your privacy when using AI tools$$,
    $$ປົກປ້ອງຄວາມເປັນສ່ວນຕົວເມື່ອໃຊ້ AI$$,
    $$Treat anything you type into a public AI tool as potentially stored — avoid pasting sensitive personal data.$$,
    $$ຖືວ່າທຸກຢ່າງທີ່ພິມໃສ່ AI ສາທາລະນະອາດຖືກເກັບໄວ້ — ຫຼີກລ້ຽງການວາງຂໍ້ມູນສ່ວນຕົວທີ່ລະອຽດອ່ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Know what counts as sensitive$$, 'body', $$ID numbers, passwords, full financial details, medical records, and other people's private information should not be pasted into a general AI chat.$$),
      jsonb_build_object('heading', $$Redact before you paste$$, 'body', $$Replace names, ID numbers, and account details with placeholders like [NAME] before sharing a document, then fill in the real details yourself after.$$),
      jsonb_build_object('heading', $$Check the tool's data policy$$, 'body', $$Different AI tools have different rules about whether your chats are used for training. Check the settings, especially for anything work-related.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮູ້ວ່າຫຍັງຄືຂໍ້ມູນລະອຽດອ່ອນ$$, 'body', $$ເລກບັດປະຈຳຕົວ, ລະຫັດຜ່ານ, ລາຍລະອຽດການເງິນເຕັມ, ບັນທຶກທາງການແພດ ແລະ ຂໍ້ມູນສ່ວນຕົວຂອງຄົນອື່ນ ບໍ່ຄວນວາງໃສ່ AI ທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ລຶບຂໍ້ມູນລະອຽດອ່ອນກ່ອນວາງ$$, 'body', $$ປ່ຽນຊື່, ເລກບັດ ແລະ ລາຍລະອຽດບັນຊີເປັນ [ຊື່] ກ່ອນແບ່ງປັນເອກະສານ ແລ້ວຄ່ອຍໃສ່ລາຍລະອຽດຈິງດ້ວຍຕົນເອງພາຍຫຼັງ.$$),
      jsonb_build_object('heading', $$ກວດນະໂຍບາຍຂໍ້ມູນຂອງເຄື່ອງມື$$, 'body', $$ເຄື່ອງມື AI ແຕ່ລະອັນມີກົດລະບຽບຕ່າງກັນວ່າຈະນຳການສົນທະນາໄປຝຶກໂມເດວບໍ່. ກວດການຕັ້ງຄ່າ ໂດຍສະເພາະສຳລັບເລື່ອງວຽກ.$$)
    ),
    array[$$Never paste IDs, passwords, or medical records into AI chat$$, $$Redact sensitive details before sharing a document$$, $$Check whether your chats are used for training$$],
    array[$$ຢ່າວາງເລກບັດ, ລະຫັດຜ່ານ ຫຼືບັນທຶກການແພດໃສ່ AI$$, $$ລຶບຂໍ້ມູນລະອຽດອ່ອນກ່ອນແບ່ງປັນເອກະສານ$$, $$ກວດວ່າການສົນທະນາຖືກນຳໄປຝຶກໂມເດວບໍ່$$],
    5, false, 40
  ),
  (
    $$sketch-a-budget-plan-with-ai$$,
    $$Use AI to sketch a personal budget plan$$,
    $$ໃຊ້ AI ຊ່ວຍຮ່າງແຜນງົບປະມານສ່ວນຕົວ$$,
    $$AI can help organize your income and expenses into categories — you still make the final money decisions.$$,
    $$AI ຊ່ວຍຈັດລາຍຮັບ ແລະ ລາຍຈ່າຍເປັນໝວດໝູ່ໄດ້ — ແຕ່ທ່ານຍັງເປັນຜູ້ຕັດສິນໃຈເລື່ອງເງິນສຸດທ້າຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give real numbers, even rough ones$$, 'body', $$Share your actual monthly income and a rough list of expenses. Even estimates give AI enough to suggest a workable structure.$$),
      jsonb_build_object('heading', $$Ask for categories, not investment advice$$, 'body', $$Use AI to sort spending into needs, wants, and savings, and to spot categories that seem unusually high — not to pick specific investments.$$),
      jsonb_build_object('heading', $$Treat it as a draft, not financial advice$$, 'body', $$A budget plan from AI is a helpful starting structure, not licensed financial advice. For major decisions, confirm with a qualified professional.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຕົວເລກຈິງ ເຖິງແມ່ນປະມານການ$$, 'body', $$ແບ່ງປັນລາຍຮັບຈິງຕໍ່ເດືອນ ແລະ ລາຍການລາຍຈ່າຍປະມານການ. ແມ່ນແຕ່ຕົວເລກປະມານກໍ່ພຽງພໍໃຫ້ AI ແນະນຳໂຄງສ້າງທີ່ໃຊ້ໄດ້.$$),
      jsonb_build_object('heading', $$ຂໍໝວດໝູ່ ບໍ່ແມ່ນຄຳແນະນຳການລົງທຶນ$$, 'body', $$ໃຊ້ AI ຈັດລາຍຈ່າຍເປັນຄວາມຈຳເປັນ, ຄວາມຢາກໄດ້ ແລະ ເງິນອອມ ແລະ ຊີ້ໝວດທີ່ສູງຜິດປົກກະຕິ — ບໍ່ແມ່ນເລືອກການລົງທຶນສະເພາະ.$$),
      jsonb_build_object('heading', $$ຖືວ່າເປັນຮ່າງ ບໍ່ແມ່ນຄຳແນະນຳການເງິນ$$, 'body', $$ແຜນງົບປະມານຈາກ AI ເປັນໂຄງສ້າງເລີ່ມຕົ້ນທີ່ເປັນປະໂຫຍດ ບໍ່ແມ່ນຄຳແນະນຳການເງິນທີ່ມີໃບອະນຸຍາດ. ສຳລັບການຕັດສິນໃຈໃຫຍ່ ໃຫ້ຢືນຢັນກັບຜູ້ຊ່ຽວຊານ.$$)
    ),
    array[$$Share real or estimated numbers for a useful plan$$, $$Use AI to categorize spending, not to pick investments$$, $$Treat any budget draft as a starting point, not final advice$$],
    array[$$ແບ່ງປັນຕົວເລກຈິງ ຫຼືປະມານການເພື່ອແຜນທີ່ໃຊ້ໄດ້$$, $$ໃຊ້ AI ຈັດໝວດລາຍຈ່າຍ ບໍ່ແມ່ນເລືອກການລົງທຶນ$$, $$ຖືວ່າແຜນງົບປະມານເປັນຈຸດເລີ່ມຕົ້ນ ບໍ່ແມ່ນຄຳແນະນຳສຸດທ້າຍ$$],
    6, false, 41
  ),
  (
    $$practice-public-speaking-scripts-with-ai$$,
    $$Use AI to practice a public speaking script$$,
    $$ໃຊ້ AI ຝຶກບົດເວົ້າສຳລັບການປາໄສ$$,
    $$Draft the structure with AI, then rehearse it aloud until it sounds natural coming from you.$$,
    $$ຮ່າງໂຄງສ້າງກັບ AI ແລ້ວຝຶກເວົ້າອອກສຽງຈົນຟັງເປັນທຳມະຊາດຈາກທ່ານເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Draft a clear structure first$$, 'body', $$Ask for an opening hook, three main points, and a closing call to action, sized to your actual time limit.$$),
      jsonb_build_object('heading', $$Read it aloud and cut what's awkward$$, 'body', $$Written text often sounds stiff when spoken. Read the draft aloud and ask AI to rephrase any sentence that trips up your tongue.$$),
      jsonb_build_object('heading', $$Practice without the script eventually$$, 'body', $$Move from reading the script to speaking from bullet points only. AI-written scripts should guide your ideas, not be memorized word for word.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮ່າງໂຄງສ້າງທີ່ຊັດເຈນກ່ອນ$$, 'body', $$ຂໍການເປີດທີ່ດຶງດູດ, 3 ຈຸດຫຼັກ ແລະ ການປິດທ້າຍທີ່ຊັກຊວນ ໃຫ້ພໍດີກັບເວລາຈຳກັດຈິງ.$$),
      jsonb_build_object('heading', $$ອ່ານອອກສຽງ ແລະ ຕັດສ່ວນທີ່ຟັງບໍ່ເປັນທຳມະຊາດ$$, 'body', $$ຂໍ້ຄວາມທີ່ຂຽນມັກຟັງແຂງເມື່ອເວົ້າ. ອ່ານຮ່າງອອກສຽງ ແລະ ຂໍ AI ປັບປະໂຫຍກໃດທີ່ເວົ້າຍາກ.$$),
      jsonb_build_object('heading', $$ຝຶກໂດຍບໍ່ອິງບົດເວົ້າໃນທີ່ສຸດ$$, 'body', $$ຄ່ອຍໆປ່ຽນຈາກອ່ານບົດເວົ້າ ໄປເປັນເວົ້າຈາກຈຸດສຳຄັນເທົ່ານັ້ນ. ບົດເວົ້າຈາກ AI ຄວນນຳທາງແນວຄິດ ບໍ່ແມ່ນທ່ອງຈຳຄຳຕໍ່ຄຳ.$$)
    ),
    array[$$Draft a clear structure sized to your time limit$$, $$Read aloud and smooth out awkward phrasing$$, $$Practice from bullet points instead of memorizing the script$$],
    array[$$ຮ່າງໂຄງສ້າງທີ່ຊັດເຈນໃຫ້ພໍດີກັບເວລາ$$, $$ອ່ານອອກສຽງ ແລະ ປັບຄຳທີ່ຟັງບໍ່ເປັນທຳມະຊາດ$$, $$ຝຶກຈາກຈຸດສຳຄັນ ແທນທີ່ຈະທ່ອງຈຳບົດເວົ້າ$$],
    5, false, 42
  ),
  (
    $$compare-options-with-ai-table$$,
    $$Use AI to compare options in a pros-and-cons table$$,
    $$ໃຊ້ AI ປຽບທຽບທາງເລືອກໃນຕາຕະລາງຂໍ້ດີ-ຂໍ້ເສຍ$$,
    $$A structured comparison table makes trade-offs visible instead of vague gut feelings.$$,
    $$ຕາຕະລາງປຽບທຽບທີ່ເປັນລະບົບເຮັດໃຫ້ເຫັນຂໍ້ແລກປ່ຽນຊັດເຈນ ແທນທີ່ຈະເປັນຄວາມຮູ້ສຶກລວມໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List your real criteria first$$, 'body', $$Before asking for a comparison, name what actually matters to you — cost, time, risk, enjoyment — so the table reflects your priorities, not generic ones.$$),
      jsonb_build_object('heading', $$Ask for a scored table$$, 'body', $$Request a table with each option scored against each criterion, so trade-offs are visible at a glance rather than buried in paragraphs.$$),
      jsonb_build_object('heading', $$The table informs you, it doesn't decide for you$$, 'body', $$Use the table to see the trade-offs clearly, but make the final call yourself based on what matters most to you right now.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸເງື່ອນໄຂຈິງຂອງທ່ານກ່ອນ$$, 'body', $$ກ່ອນຂໍການປຽບທຽບ ໃຫ້ບອກສິ່ງທີ່ສຳຄັນຕໍ່ທ່ານແທ້ໆ — ຄ່າໃຊ້ຈ່າຍ, ເວລາ, ຄວາມສ່ຽງ, ຄວາມມ່ວນ — ເພື່ອໃຫ້ຕາຕະລາງສະທ້ອນຄວາມສຳຄັນຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ຂໍຕາຕະລາງທີ່ໃຫ້ຄະແນນ$$, 'body', $$ຂໍຕາຕະລາງທີ່ໃຫ້ຄະແນນແຕ່ລະທາງເລືອກຕາມແຕ່ລະເງື່ອນໄຂ ເພື່ອໃຫ້ເຫັນຂໍ້ແລກປ່ຽນຊັດເຈນ ແທນທີ່ຈະຝັງໃນຫຍໍ້ໜ້າ.$$),
      jsonb_build_object('heading', $$ຕາຕະລາງໃຫ້ຂໍ້ມູນ ບໍ່ໄດ້ຕັດສິນໃຈແທນທ່ານ$$, 'body', $$ໃຊ້ຕາຕະລາງເພື່ອເຫັນຂໍ້ແລກປ່ຽນຊັດເຈນ ແຕ່ຕັດສິນໃຈສຸດທ້າຍດ້ວຍຕົນເອງຕາມສິ່ງທີ່ສຳຄັນທີ່ສຸດຕອນນີ້.$$)
    ),
    array[$$Name your real criteria before comparing$$, $$A scored table shows trade-offs at a glance$$, $$Use it to inform, not replace, your own judgment$$],
    array[$$ລະບຸເງື່ອນໄຂຈິງກ່ອນເລີ່ມປຽບທຽບ$$, $$ຕາຕະລາງໃຫ້ຄະແນນເຮັດໃຫ້ເຫັນຂໍ້ແລກປ່ຽນໄວ$$, $$ໃຊ້ເປັນຂໍ້ມູນປະກອບ ບໍ່ແທນການຕັດສິນໃຈຂອງທ່ານ$$],
    5, false, 43
  ),
  (
    $$turn-a-rough-idea-into-an-outline$$,
    $$Use AI to turn a rough idea into a structured outline$$,
    $$ໃຊ້ AI ປ່ຽນແນວຄິດຫຍາບໆເປັນໂຄງຮ່າງທີ່ເປັນລະບົບ$$,
    $$Describe the messy idea in your head and ask AI for a logical structure to build from.$$,
    $$ອະທິບາຍແນວຄິດທີ່ຍັງສັບສົນໃນຫົວ ແລະ ຂໍ AI ຈັດເປັນໂຄງຮ່າງທີ່ມີເຫດຜົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Talk through the idea freely$$, 'body', $$Write out your idea in whatever order it comes to mind — AI is good at finding structure in unstructured thinking.$$),
      jsonb_build_object('heading', $$Ask for a logical grouping$$, 'body', $$Request that similar points be grouped under clear headings, with a suggested order that builds one idea on the next.$$),
      jsonb_build_object('heading', $$Fill in the outline with your own detail$$, 'body', $$Use the AI-suggested structure as scaffolding, then fill in the actual content and examples yourself so it stays authentically yours.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລົ່າແນວຄິດອອກມາຢ່າງເສລີ$$, 'body', $$ຂຽນແນວຄິດອອກມາຕາມລຳດັບທີ່ນຶກອອກ — AI ເກັ່ງໃນການຈັດລະບຽບຄວາມຄິດທີ່ຍັງບໍ່ເປັນລະບຽບ.$$),
      jsonb_build_object('heading', $$ຂໍການຈັດກຸ່ມທີ່ມີເຫດຜົນ$$, 'body', $$ຂໍໃຫ້ຈຸດທີ່ຄ້າຍກັນຖືກຈັດກຸ່ມພາຍໃຕ້ຫົວຂໍ້ທີ່ຊັດເຈນ ພ້ອມລຳດັບທີ່ແນວຄິດໜຶ່ງຕໍ່ຍອດອີກອັນ.$$),
      jsonb_build_object('heading', $$ຕື່ມລາຍລະອຽດຂອງທ່ານເອງໃສ່ໂຄງຮ່າງ$$, 'body', $$ໃຊ້ໂຄງຮ່າງທີ່ AI ແນະນຳເປັນໂຄງກະດູກ ແລ້ວຕື່ມເນື້ອຫາ ແລະ ຕົວຢ່າງຈິງດ້ວຍຕົນເອງ ເພື່ອໃຫ້ຍັງເປັນຂອງທ່ານແທ້ໆ.$$)
    ),
    array[$$Write out the idea freely before organizing it$$, $$Ask AI to group related points under clear headings$$, $$Fill the outline with your own content and examples$$],
    array[$$ຂຽນແນວຄິດອອກມາຢ່າງເສລີກ່ອນຈັດລະບຽບ$$, $$ຂໍ AI ຈັດກຸ່ມຈຸດທີ່ກ່ຽວຂ້ອງພາຍໃຕ້ຫົວຂໍ້ຊັດເຈນ$$, $$ຕື່ມເນື້ອຫາ ແລະ ຕົວຢ່າງຂອງທ່ານເອງໃສ່ໂຄງຮ່າງ$$],
    5, false, 44
  ),
  (
    $$proofread-without-losing-your-style$$,
    $$Proofread with AI without losing your own style$$,
    $$ກວດແກ້ຂໍ້ຄວາມກັບ AI ໂດຍບໍ່ເສຍລັກສະນະການຂຽນຂອງທ່ານ$$,
    $$Ask for corrections only, not a full rewrite, so your natural voice survives the edit.$$,
    $$ຂໍໃຫ້ແກ້ແຕ່ຂໍ້ຜິດພາດ ບໍ່ແມ່ນຂຽນໃໝ່ທັງໝົດ ເພື່ອຮັກສາສຽງທຳມະຊາດຂອງທ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for the minimal fix$$, 'body', $$Say explicitly: "fix only grammar and spelling, keep my sentence structure and word choice." Otherwise AI often rewrites more than needed.$$),
      jsonb_build_object('heading', $$Compare before and after$$, 'body', $$Look at what actually changed. If your original phrasing and personality got smoothed away, ask AI to restore your original wording where it was already correct.$$),
      jsonb_build_object('heading', $$Use it as a second pair of eyes$$, 'body', $$The most reliable use of AI proofreading is catching typos and small grammar slips you missed — not deciding your voice for you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍການແກ້ໄຂຂັ້ນຕ່ຳ$$, 'body', $$ບອກຢ່າງຈະແຈ້ງວ່າ "ແກ້ແຕ່ໄວຍະກອນ ແລະ ການສະກົດ, ຮັກສາໂຄງສ້າງປະໂຫຍກ ແລະ ຄຳສັບຂອງຂ້ອຍ." ບໍ່ດັ່ງນັ້ນ AI ມັກຂຽນໃໝ່ຫຼາຍກວ່າທີ່ຕ້ອງການ.$$),
      jsonb_build_object('heading', $$ປຽບທຽບກ່ອນ ແລະ ຫຼັງ$$, 'body', $$ເບິ່ງວ່າຫຍັງປ່ຽນໄປແທ້. ຖ້າຄຳເວົ້າ ແລະ ລັກສະນະຂອງທ່ານຖືກລຶບອອກ ໃຫ້ຂໍ AI ຄືນຄຳເວົ້າເດີມໃນສ່ວນທີ່ຖືກຢູ່ແລ້ວ.$$),
      jsonb_build_object('heading', $$ໃຊ້ເປັນຄູ່ຕາທີສອງ$$, 'body', $$ການໃຊ້ AI ກວດແກ້ທີ່ໜ້າເຊື່ອຖືທີ່ສຸດ ຄືການຈັບຄຳຜິດ ແລະ ໄວຍະກອນນ້ອຍໆທີ່ທ່ານພາດ — ບໍ່ແມ່ນໃຫ້ມັນຕັດສິນສຽງຂອງທ່ານແທນ.$$)
    ),
    array[$$Explicitly ask for minimal, not full, rewrites$$, $$Compare before and after to protect your voice$$, $$Use AI mainly to catch typos and small slips$$],
    array[$$ຂໍການແກ້ໄຂຂັ້ນຕ່ຳ ບໍ່ແມ່ນຂຽນໃໝ່ທັງໝົດ$$, $$ປຽບທຽບກ່ອນ-ຫຼັງເພື່ອຮັກສາສຽງຂອງທ່ານ$$, $$ໃຊ້ AI ຫຼັກໆເພື່ອຈັບຄຳຜິດ ແລະ ຂໍ້ຜິດພາດນ້ອຍໆ$$],
    4, false, 45
  ),
  (
    $$use-ai-image-generation-responsibly$$,
    $$Use AI image generation responsibly$$,
    $$ໃຊ້ການສ້າງຮູບພາບດ້ວຍ AI ຢ່າງມີຄວາມຮັບຜິດຊອບ$$,
    $$Be clear about what's AI-generated, and never use it to depict a real person doing something they didn't do.$$,
    $$ບອກໃຫ້ຊັດເຈນວ່າອັນໃດສ້າງໂດຍ AI ແລະ ຢ່ານຳໄປໃຊ້ສະແດງຄົນຈິງເຮັດສິ່ງທີ່ບໍ່ໄດ້ເຮັດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Describe the image precisely$$, 'body', $$Include subject, setting, lighting, and style in your prompt. Vague prompts produce generic results; specific ones produce useful ones.$$),
      jsonb_build_object('heading', $$Never fake a real person's likeness$$, 'body', $$Do not generate images that depict a real, identifiable person saying or doing something they never did — this can spread misinformation and cause real harm.$$),
      jsonb_build_object('heading', $$Label AI-generated images when sharing$$, 'body', $$When you share an AI-generated image publicly, especially anything realistic, label it as AI-generated so viewers aren't misled.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອະທິບາຍຮູບພາບໃຫ້ຊັດເຈນ$$, 'body', $$ໃສ່ຫົວຂໍ້, ສະຖານທີ່, ແສງ ແລະ ແບບໃນຄຳສັ່ງ. ຄຳສັ່ງທີ່ບໍ່ຊັດເຈນໄດ້ຜົນລັບທົ່ວໄປ ຄຳສັ່ງທີ່ຊັດເຈນໄດ້ຜົນລັບທີ່ເປັນປະໂຫຍດ.$$),
      jsonb_build_object('heading', $$ຢ່າສ້າງໜ້າຕາຄົນຈິງປອມ$$, 'body', $$ຢ່າສ້າງຮູບພາບທີ່ສະແດງຄົນຈິງທີ່ລະບຸຕົວຕົນໄດ້ ເວົ້າ ຫຼືເຮັດສິ່ງທີ່ບໍ່ໄດ້ເຮັດແທ້ — ອາດແຜ່ຂໍ້ມູນທີ່ຜິດ ແລະ ສ້າງຄວາມເສຍຫາຍຈິງ.$$),
      jsonb_build_object('heading', $$ຕິດປ້າຍວ່າເປັນຮູບ AI ເມື່ອແບ່ງປັນ$$, 'body', $$ເມື່ອແບ່ງປັນຮູບພາບທີ່ສ້າງໂດຍ AI ຕໍ່ສາທາລະນະ ໂດຍສະເພາະຮູບທີ່ເບິ່ງຄືຈິງ ໃຫ້ຕິດປ້າຍວ່າສ້າງໂດຍ AI ເພື່ອບໍ່ໃຫ້ຜູ້ຊົມເຂົ້າໃຈຜິດ.$$)
    ),
    array[$$Specific prompts produce far more useful images$$, $$Never depict a real identifiable person doing something they didn't$$, $$Label realistic AI-generated images when you share them$$],
    array[$$ຄຳສັ່ງທີ່ຊັດເຈນໃຫ້ຮູບພາບທີ່ເປັນປະໂຫຍດກວ່າ$$, $$ຢ່າສະແດງຄົນຈິງເຮັດສິ່ງທີ່ບໍ່ໄດ້ເຮັດ$$, $$ຕິດປ້າຍຮູບ AI ທີ່ເບິ່ງຄືຈິງເມື່ອແບ່ງປັນ$$],
    5, false, 46
  ),
  (
    $$recognize-ai-bias-in-answers$$,
    $$Recognize AI bias and check for one-sided answers$$,
    $$ຈັບອະຄະຕິຂອງ AI ແລະ ກວດຄຳຕອບທີ່ເບິ່ງດ້ານດຽວ$$,
    $$AI reflects patterns in its training data, which can include skewed or one-sided perspectives on sensitive topics.$$,
    $$AI ສະທ້ອນຮູບແບບຈາກຂໍ້ມູນຝຶກ ເຊິ່ງອາດມີມຸມມອງທີ່ບໍ່ສົມດຸນຕໍ່ຫົວຂໍ້ລະອຽດອ່ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for multiple perspectives$$, 'body', $$On debated topics, explicitly ask AI to lay out the strongest version of more than one viewpoint instead of settling on a single answer.$$),
      jsonb_build_object('heading', $$Notice what's missing, not just what's said$$, 'body', $$A biased answer often shows up as an absence — one group, region, or argument left out. Ask what perspective might be missing.$$),
      jsonb_build_object('heading', $$Cross-check with a different source$$, 'body', $$For important or sensitive topics, compare AI's answer against a source from a different origin or perspective before forming your final view.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍຫຼາຍມຸມມອງ$$, 'body', $$ສຳລັບຫົວຂໍ້ທີ່ຍັງມີການໂຕ້ແຍ້ງ ໃຫ້ຂໍ AI ອະທິບາຍມຸມມອງທີ່ໜັກແໜ້ນທີ່ສຸດຫຼາຍກວ່າໜຶ່ງ ແທນທີ່ຈະຕັດສິນຄຳຕອບດຽວ.$$),
      jsonb_build_object('heading', $$ສັງເກດສິ່ງທີ່ຂາດຫາຍ ບໍ່ແມ່ນແຕ່ສິ່ງທີ່ເວົ້າ$$, 'body', $$ຄຳຕອບທີ່ອະຄະຕິມັກສະແດງອອກເປັນການຂາດຫາຍ — ກຸ່ມ, ພາກພື້ນ ຫຼືເຫດຜົນໃດອັນໜຶ່ງບໍ່ຖືກເວົ້າເຖິງ. ຖາມວ່າມຸມມອງໃດອາດຂາດຫາຍໄປ.$$),
      jsonb_build_object('heading', $$ກວດຄືນກັບແຫຼ່ງອື່ນ$$, 'body', $$ສຳລັບຫົວຂໍ້ສຳຄັນ ຫຼືລະອຽດອ່ອນ ໃຫ້ປຽບທຽບຄຳຕອບຂອງ AI ກັບແຫຼ່ງອື່ນທີ່ມີທີ່ມາ ຫຼືມຸມມອງຕ່າງກັນ ກ່ອນສະຫຼຸບຄວາມຄິດເຫັນຂອງທ່ານເອງ.$$)
    ),
    array[$$Ask AI to present more than one strong perspective$$, $$Notice what viewpoint might be missing from an answer$$, $$Cross-check sensitive topics against a different source$$],
    array[$$ຂໍ AI ອະທິບາຍຫຼາຍກວ່າໜຶ່ງມຸມມອງທີ່ໜັກແໜ້ນ$$, $$ສັງເກດມຸມມອງໃດອາດຂາດຫາຍໄປຈາກຄຳຕອບ$$, $$ກວດຄືນຫົວຂໍ້ລະອຽດອ່ອນກັບແຫຼ່ງອື່ນ$$],
    6, false, 47
  ),
  (
    $$create-flashcards-from-a-textbook-chapter$$,
    $$Use AI to create flashcards from a textbook chapter$$,
    $$ໃຊ້ AI ສ້າງບັດຄຳສັບຈາກບົດຮຽນໃນປຶ້ມແບບຮຽນ$$,
    $$Turn a dense chapter into question-and-answer pairs sized for quick daily review.$$,
    $$ປ່ຽນບົດຮຽນທີ່ໜັກເປັນຄູ່ຄຳຖາມ-ຄຳຕອບຂະໜາດພໍດີສຳລັບທົບທວນປະຈຳວັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Feed in the chapter, not a summary of it$$, 'body', $$Paste the actual chapter text or a photo transcription so AI pulls flashcard content from the real source, not a vague description.$$),
      jsonb_build_object('heading', $$Ask for short front-and-back pairs$$, 'body', $$Request one clear question per card with a short, specific answer — long answers defeat the purpose of a quick-review flashcard.$$),
      jsonb_build_object('heading', $$Review daily in small batches$$, 'body', $$Ten to fifteen cards reviewed daily beats fifty cards reviewed once. Ask AI to split a large set into smaller daily batches.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃສ່ບົດຮຽນຈິງ ບໍ່ແມ່ນຄຳສະຫຼຸບ$$, 'body', $$ວາງຂໍ້ຄວາມບົດຮຽນຈິງ ຫຼືຖອດຈາກຮູບ ເພື່ອໃຫ້ AI ດຶງເນື້ອຫາບັດຄຳສັບຈາກແຫຼ່ງຈິງ ບໍ່ແມ່ນຄຳອະທິບາຍທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ຂໍຄູ່ໜ້າ-ຫຼັງແບບສັ້ນ$$, 'body', $$ຂໍໜຶ່ງຄຳຖາມທີ່ຊັດເຈນຕໍ່ບັດ ພ້ອມຄຳຕອບສັ້ນ ແລະ ສະເພາະ — ຄຳຕອບຍາວເຮັດໃຫ້ບັດຄຳສັບໃຊ້ທົບທວນໄວບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ທົບທວນເປັນຊຸດນ້ອຍທຸກວັນ$$, 'body', $$ບັດ 10-15 ໃບທົບທວນທຸກວັນ ໄດ້ຜົນດີກວ່າ 50 ໃບທົບທວນຄັ້ງດຽວ. ຂໍ AI ແບ່ງຊຸດໃຫຍ່ເປັນຊຸດນ້ອຍປະຈຳວັນ.$$)
    ),
    array[$$Feed the real chapter text, not a vague description$$, $$Keep answers short and specific per card$$, $$Review small batches daily instead of one large batch$$],
    array[$$ໃສ່ຂໍ້ຄວາມບົດຮຽນຈິງ ບໍ່ແມ່ນຄຳອະທິບາຍທົ່ວໄປ$$, $$ຮັກສາຄຳຕອບໃຫ້ສັ້ນ ແລະ ສະເພາະຕໍ່ບັດ$$, $$ທົບທວນເປັນຊຸດນ້ອຍທຸກວັນ ແທນທີ່ຈະຄັ້ງດຽວ$$],
    5, false, 48
  ),
  (
    $$draft-emails-and-adjust-tone-with-ai$$,
    $$Use AI to draft emails and adjust tone precisely$$,
    $$ໃຊ້ AI ຮ່າງອີເມວ ແລະ ປັບນ້ຳສຽງໃຫ້ພໍດີ$$,
    $$Name the exact tone you want — warm, firm, apologetic — instead of leaving it to guesswork.$$,
    $$ບອກນ້ຳສຽງທີ່ຕ້ອງການໃຫ້ຊັດເຈນ — ອົບອຸ່ນ, ໜັກແໜ້ນ, ຂໍໂທດ — ແທນທີ່ຈະໃຫ້ AI ເດົາເອົາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State the goal and the relationship$$, 'body', $$Tell AI what you want the reader to do after reading, and how formal your relationship with them is, before drafting.$$),
      jsonb_build_object('heading', $$Request tone by name$$, 'body', $$Ask specifically for "warm but professional," "firm but polite," or "apologetic but confident" rather than a vague "make it sound good."$$),
      jsonb_build_object('heading', $$Trim it down before sending$$, 'body', $$AI drafts often run long. Cut anything that doesn't serve the main request, and read it once more as the recipient would.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກເປົ້າໝາຍ ແລະ ຄວາມສຳພັນ$$, 'body', $$ບອກ AI ວ່າຢາກໃຫ້ຜູ້ອ່ານເຮັດຫຍັງຫຼັງອ່ານ ແລະ ຄວາມສຳພັນກັບເຂົາເປັນທາງການປານໃດ ກ່ອນຮ່າງອີເມວ.$$),
      jsonb_build_object('heading', $$ຂໍນ້ຳສຽງໂດຍລະບຸຊື່$$, 'body', $$ຂໍສະເພາະວ່າ "ອົບອຸ່ນແຕ່ເປັນມືອາຊີບ," "ໜັກແໜ້ນແຕ່ສຸພາບ" ຫຼື "ຂໍໂທດແຕ່ໝັ້ນໃຈ" ແທນທີ່ຈະບອກແຕ່ວ່າ "ໃຫ້ຟັງດີ."$$),
      jsonb_build_object('heading', $$ຫຍໍ້ໃຫ້ສັ້ນກ່ອນສົ່ງ$$, 'body', $$ຮ່າງຈາກ AI ມັກຍາວເກີນ. ຕັດສ່ວນທີ່ບໍ່ຊ່ວຍຄຳຂໍຫຼັກອອກ ແລະ ອ່ານອີກຄັ້ງໃນມຸມມອງຂອງຜູ້ຮັບ.$$)
    ),
    array[$$State the goal and relationship before drafting$$, $$Name the exact tone you want, not "sound good"$$, $$Trim the draft and reread as the recipient would$$],
    array[$$ບອກເປົ້າໝາຍ ແລະ ຄວາມສຳພັນກ່ອນຮ່າງ$$, $$ລະບຸນ້ຳສຽງທີ່ຕ້ອງການໂດຍກົງ$$, $$ຫຍໍ້ຮ່າງ ແລະ ອ່ານອີກຄັ້ງໃນມຸມມອງຜູ້ຮັບ$$],
    4, false, 49
  ),
  (
    $$use-ai-for-accessibility-needs$$,
    $$Use AI tools to support accessibility needs$$,
    $$ໃຊ້ເຄື່ອງມື AI ຊ່ວຍຄວາມສາມາດເຂົ້າເຖິງ$$,
    $$Voice input, text-to-speech, and simplification features can remove real barriers for many learners.$$,
    $$ການປ້ອນສຽງ, ອ່ານອອກສຽງ ແລະ ຄຸນສົມບັດເຮັດໃຫ້ງ່າຍ ຊ່ວຍລົບອຸປະສັກຈິງສຳລັບຜູ້ຮຽນຫຼາຍຄົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Speak instead of type when that's easier$$, 'body', $$Many AI tools accept voice input, which can help if typing is slow, tiring, or difficult for you.$$),
      jsonb_build_object('heading', $$Use text-to-speech to listen instead of read$$, 'body', $$Ask AI to format long text for a text-to-speech reader, or use a tool that reads its own answers aloud.$$),
      jsonb_build_object('heading', $$Ask for a simpler version whenever needed$$, 'body', $$If a response is too dense, ask directly for shorter sentences, bigger structure, or fewer ideas per paragraph — a reasonable request at any time.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເວົ້າແທນການພິມເມື່ອງ່າຍກວ່າ$$, 'body', $$ເຄື່ອງມື AI ຫຼາຍອັນຮັບການປ້ອນສຽງໄດ້ ເຊິ່ງຊ່ວຍໄດ້ຖ້າການພິມຊ້າ, ເມື່ອຍ ຫຼືຍາກສຳລັບທ່ານ.$$),
      jsonb_build_object('heading', $$ໃຊ້ການອ່ານອອກສຽງແທນການອ່ານດ້ວຍຕາ$$, 'body', $$ຂໍ AI ຈັດຮູບແບບຂໍ້ຄວາມຍາວສຳລັບເຄື່ອງອ່ານອອກສຽງ ຫຼືໃຊ້ເຄື່ອງມືທີ່ອ່ານຄຳຕອບອອກສຽງເອງ.$$),
      jsonb_build_object('heading', $$ຂໍສະບັບທີ່ງ່າຍກວ່າເມື່ອຕ້ອງການ$$, 'body', $$ຖ້າຄຳຕອບໜັກເກີນໄປ ໃຫ້ຂໍໂດຍກົງໃຫ້ປະໂຫຍກສັ້ນລົງ, ໂຄງສ້າງໃຫຍ່ຂຶ້ນ ຫຼືແນວຄິດໜ້ອຍລົງຕໍ່ຫຍໍ້ໜ້າ — ເປັນຄຳຂໍທີ່ສົມເຫດສົມຜົນສະເໝີ.$$)
    ),
    array[$$Voice input can replace typing when that's easier$$, $$Text-to-speech turns AI answers into audio$$, $$You can always ask for a simpler version$$],
    array[$$ການປ້ອນສຽງແທນທີ່ການພິມໄດ້ເມື່ອງ່າຍກວ່າ$$, $$ການອ່ານອອກສຽງປ່ຽນຄຳຕອບ AI ເປັນສຽງ$$, $$ທ່ານສາມາດຂໍສະບັບທີ່ງ່າຍກວ່າໄດ້ສະເໝີ$$],
    4, false, 50
  ),
  (
    $$practice-negotiation-scenarios-with-ai$$,
    $$Use AI to practice negotiation scenarios$$,
    $$ໃຊ້ AI ຝຶກສະຖານະການເຈລະຈາ$$,
    $$Rehearse a price or terms negotiation against an AI that pushes back realistically.$$,
    $$ຝຶກເຈລະຈາລາຄາ ຫຼືເງື່ອນໄຂກັບ AI ທີ່ໂຕ້ແຍ້ງແບບຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Set the real stakes$$, 'body', $$Describe what you're negotiating — salary, rent, a sale price — and your actual minimum acceptable outcome before you begin.$$),
      jsonb_build_object('heading', $$Ask AI to hold firm$$, 'body', $$Instruct AI to play a tough but realistic counterpart who doesn't cave immediately, so you practice handling actual resistance.$$),
      jsonb_build_object('heading', $$Practice your walk-away line$$, 'body', $$Rehearse calmly stating your limit and being willing to walk away — this is often the hardest part of any real negotiation.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຳນົດຜົນປະໂຫຍດຈິງ$$, 'body', $$ອະທິບາຍວ່າກຳລັງເຈລະຈາຫຍັງ — ເງິນເດືອນ, ຄ່າເຊົ່າ, ລາຄາຂາຍ — ແລະ ຜົນຂັ້ນຕ່ຳທີ່ຮັບໄດ້ຈິງກ່ອນເລີ່ມ.$$),
      jsonb_build_object('heading', $$ບອກ AI ໃຫ້ຢືນຢັດ$$, 'body', $$ບອກ AI ໃຫ້ສະແດງບົດບາດຄູ່ເຈລະຈາທີ່ແໜ້ນແຕ່ຈິງ ບໍ່ຍອມງ່າຍ ເພື່ອທ່ານໄດ້ຝຶກຮັບມືກັບການຕ້ານທານແທ້.$$),
      jsonb_build_object('heading', $$ຝຶກປະໂຫຍກ "ຍອມຖອຍ"$$, 'body', $$ຝຶກເວົ້າຂອບເຂດຂອງທ່ານຢ່າງສະຫງົບ ແລະ ພ້ອມຍອມຖອຍ — ນີ້ມັກເປັນສ່ວນທີ່ຍາກທີ່ສຸດຂອງການເຈລະຈາຈິງ.$$)
    ),
    array[$$Set your real stakes and minimum outcome first$$, $$Practice against realistic resistance, not an easy AI$$, $$Rehearse being willing to walk away$$],
    array[$$ກຳນົດຜົນປະໂຫຍດຈິງ ແລະ ຂັ້ນຕ່ຳກ່ອນເລີ່ມ$$, $$ຝຶກຮັບມືກັບການຕ້ານທານແທ້ ບໍ່ແມ່ນ AI ທີ່ຍອມງ່າຍ$$, $$ຝຶກຄວາມກ້າຍອມຖອຍ$$],
    6, false, 51
  ),
  (
    $$ai-chat-vs-search-engine$$,
    $$Know when to use AI chat versus a search engine$$,
    $$ຮູ້ວ່າຄວນໃຊ້ AI ຫຼືເຄື່ອງມືຄົ້ນຫາເມື່ອໃດ$$,
    $$Each tool has a different strength — reasoning and drafting versus fresh, sourced facts.$$,
    $$ແຕ່ລະເຄື່ອງມືມີຈຸດແຂງຕ່າງກັນ — ການໃຫ້ເຫດຜົນ ແລະ ຮ່າງ ທຽບກັບຂໍ້ເທັດຈິງໃໝ່ທີ່ມີແຫຼ່ງອ້າງອີງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use AI chat for reasoning and drafting$$, 'body', $$Explaining, comparing, drafting, and brainstorming are where a chat-based AI shines — it can reason through your specific situation.$$),
      jsonb_build_object('heading', $$Use a search engine for fresh, sourced facts$$, 'body', $$For today's news, current prices, or anything you need a direct, checkable source for, a search engine with visible links is usually more reliable.$$),
      jsonb_build_object('heading', $$Combine them when it matters$$, 'body', $$Search first for current facts, then bring what you found to AI to help you understand, summarize, or apply it to your situation.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ AI ສຳລັບການໃຫ້ເຫດຜົນ ແລະ ຮ່າງ$$, 'body', $$ການອະທິບາຍ, ປຽບທຽບ, ຮ່າງ ແລະ ລະດົມແນວຄິດ ແມ່ນຈຸດແຂງຂອງ AI ແບບສົນທະນາ — ມັນໃຫ້ເຫດຜົນຕາມສະຖານະການສະເພາະຂອງທ່ານໄດ້.$$),
      jsonb_build_object('heading', $$ໃຊ້ເຄື່ອງມືຄົ້ນຫາສຳລັບຂໍ້ເທັດຈິງໃໝ່ທີ່ມີແຫຼ່ງ$$, 'body', $$ສຳລັບຂ່າວມື້ນີ້, ລາຄາປັດຈຸບັນ ຫຼືສິ່ງທີ່ຕ້ອງການແຫຼ່ງອ້າງອີງທີ່ກວດໄດ້ໂດຍກົງ ເຄື່ອງມືຄົ້ນຫາທີ່ມີລິ້ງໃຫ້ເຫັນມັກໜ້າເຊື່ອຖືກວ່າ.$$),
      jsonb_build_object('heading', $$ໃຊ້ທັງສອງຮ່ວມກັນເມື່ອສຳຄັນ$$, 'body', $$ຄົ້ນຫາຂໍ້ເທັດຈິງປັດຈຸບັນກ່ອນ ແລ້ວນຳສິ່ງທີ່ພົບໄປໃຫ້ AI ຊ່ວຍເຂົ້າໃຈ, ສະຫຼຸບ ຫຼືນຳໄປໃຊ້ກັບສະຖານະການຂອງທ່ານ.$$)
    ),
    array[$$AI chat is strongest at reasoning and drafting$$, $$Search engines are stronger for fresh, sourced facts$$, $$Combine both for time-sensitive, important decisions$$],
    array[$$AI ແຂງແຮງທີ່ສຸດໃນການໃຫ້ເຫດຜົນ ແລະ ຮ່າງ$$, $$ເຄື່ອງມືຄົ້ນຫາແຂງແຮງກວ່າສຳລັບຂໍ້ເທັດຈິງໃໝ່$$, $$ໃຊ້ທັງສອງຮ່ວມກັນສຳລັບການຕັດສິນໃຈສຳຄັນທີ່ອິງເວລາ$$],
    4, false, 52
  ),
  (
    $$use-first-ai-draft-as-a-starting-point$$,
    $$Treat the first AI draft as a starting point, not the end$$,
    $$ຖືວ່າຮ່າງທຳອິດຈາກ AI ເປັນຈຸດເລີ່ມຕົ້ນ ບໍ່ແມ່ນຈຸດຈົບ$$,
    $$Use AI to break through a blank page fast, then reshape the result until it's genuinely yours.$$,
    $$ໃຊ້ AI ຊ່ວຍຂ້າມໜ້າຫວ່າງໄດ້ໄວ ແລ້ວປັບຜົນລັບຈົນເປັນຂອງທ່ານແທ້ໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Let AI break the blank-page freeze$$, 'body', $$Starting from nothing is hard. Ask AI for a rough first version so you have something concrete to react to and improve.$$),
      jsonb_build_object('heading', $$React instead of accepting$$, 'body', $$Read the draft critically — what's missing, what's wrong for your situation, what sounds nothing like you. Editing is often easier than starting cold.$$),
      jsonb_build_object('heading', $$Rebuild the parts that matter most$$, 'body', $$Rewrite the opening, the conclusion, and any personal or high-stakes section yourself. Let AI's draft handle only the routine middle parts.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ AI ຊ່ວຍຂ້າມຄວາມຕິດຂັດຈາກໜ້າຫວ່າງ$$, 'body', $$ການເລີ່ມຈາກສູນເປົ່າແມ່ນຍາກ. ຂໍ AI ຮ່າງສະບັບຫຍາບໆກ່ອນ ເພື່ອທ່ານມີສິ່ງທີ່ຈັບຕ້ອງໄດ້ໃຫ້ຕອບໂຕ້ ແລະ ປັບປຸງ.$$),
      jsonb_build_object('heading', $$ຕອບໂຕ້ ບໍ່ແມ່ນຮັບເອົາເລີຍ$$, 'body', $$ອ່ານຮ່າງຢ່າງມີວິຈານະ — ຫຍັງຂາດ, ຫຍັງບໍ່ຖືກກັບສະຖານະການຂອງທ່ານ, ຫຍັງບໍ່ຄືສຽງຂອງທ່ານເລີຍ. ການແກ້ໄຂມັກງ່າຍກວ່າການເລີ່ມຈາກສູນ.$$),
      jsonb_build_object('heading', $$ສ້າງໃໝ່ສ່ວນທີ່ສຳຄັນທີ່ສຸດດ້ວຍຕົນເອງ$$, 'body', $$ຂຽນຄືນສ່ວນເປີດ, ສ່ວນສະຫຼຸບ ແລະ ສ່ວນສ່ວນຕົວ ຫຼືສ່ຽງສູງດ້ວຍຕົນເອງ. ໃຫ້ຮ່າງຈາກ AI ຮັບຜິດຊອບພຽງສ່ວນກາງທົ່ວໄປ.$$)
    ),
    array[$$Use AI to overcome the blank-page freeze$$, $$Read critically and edit rather than accept as-is$$, $$Rewrite the highest-stakes parts yourself$$],
    array[$$ໃຊ້ AI ຊ່ວຍຂ້າມຄວາມຕິດຂັດຈາກໜ້າຫວ່າງ$$, $$ອ່ານຢ່າງມີວິຈານະ ແລະ ແກ້ໄຂ ບໍ່ແມ່ນຮັບເອົາເລີຍ$$, $$ຂຽນຄືນສ່ວນທີ່ສ່ຽງສູງທີ່ສຸດດ້ວຍຕົນເອງ$$],
    5, false, 53
  ),
  (
    $$fact-check-a-claim-with-ai-help$$,
    $$Use AI to help fact-check a claim you read online$$,
    $$ໃຊ້ AI ຊ່ວຍກວດຄວາມຈິງຂອງຂໍ້ອ້າງທີ່ອ່ານພົບອອນລາຍ$$,
    $$Ask AI to lay out what's known, disputed, and unverified — then confirm with an independent source.$$,
    $$ຂໍໃຫ້ AI ແຍກສິ່ງທີ່ຮູ້ແລ້ວ, ຍັງໂຕ້ແຍ້ງ ແລະ ຍັງບໍ່ພິສູດ — ແລ້ວຢືນຢັນກັບແຫຼ່ງອິດສະຫຼະ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Paste the exact claim$$, 'body', $$Give AI the exact wording of the claim, not your memory of it. Precise wording changes whether a claim is true, exaggerated, or false.$$),
      jsonb_build_object('heading', $$Ask what's confirmed versus disputed$$, 'body', $$Request a breakdown of which parts are well-established, which are disputed among experts, and which are simply unverified.$$),
      jsonb_build_object('heading', $$Confirm with an independent source before sharing$$, 'body', $$Before resharing a claim, check it against a reputable, independent source. This one habit does more to stop misinformation than anything else.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວາງຂໍ້ອ້າງແທ້ໆ$$, 'body', $$ໃຫ້ AI ຄຳເວົ້າແທ້ຂອງຂໍ້ອ້າງ ບໍ່ແມ່ນຄວາມຈຳຂອງທ່ານ. ຄຳເວົ້າທີ່ແມ່ນຍຳປ່ຽນວ່າຂໍ້ອ້າງນັ້ນຈິງ, ເກີນຄວາມຈິງ ຫຼືປອມ.$$),
      jsonb_build_object('heading', $$ຖາມສ່ວນທີ່ຢືນຢັນແລ້ວ ທຽບກັບຍັງໂຕ້ແຍ້ງ$$, 'body', $$ຂໍໃຫ້ແຍກວ່າສ່ວນໃດຢືນຢັນແລ້ວ, ສ່ວນໃດຍັງມີການໂຕ້ແຍ້ງລະຫວ່າງຜູ້ຊ່ຽວຊານ ແລະ ສ່ວນໃດຍັງບໍ່ໄດ້ພິສູດ.$$),
      jsonb_build_object('heading', $$ຢືນຢັນກັບແຫຼ່ງອິດສະຫຼະກ່ອນແບ່ງປັນ$$, 'body', $$ກ່ອນແບ່ງປັນຂໍ້ອ້າງຕໍ່ ໃຫ້ກວດກັບແຫຼ່ງທີ່ໜ້າເຊື່ອຖື ແລະ ອິດສະຫຼະ. ນິໄສດຽວນີ້ຊ່ວຍຢຸດຂໍ້ມູນຜິດໄດ້ດີກວ່າສິ່ງອື່ນໃດ.$$)
    ),
    array[$$Give AI the exact wording of the claim$$, $$Ask it to separate confirmed from disputed parts$$, $$Always confirm with an independent source before sharing$$],
    array[$$ໃຫ້ AI ຄຳເວົ້າແທ້ຂອງຂໍ້ອ້າງ$$, $$ຂໍໃຫ້ແຍກສ່ວນທີ່ຢືນຢັນແລ້ວກັບຍັງໂຕ້ແຍ້ງ$$, $$ຢືນຢັນກັບແຫຼ່ງອິດສະຫຼະກ່ອນແບ່ງປັນສະເໝີ$$],
    5, false, 54
  ),
  (
    $$learn-a-new-skill-faster-with-ai$$,
    $$Use AI to learn a new skill faster$$,
    $$ໃຊ້ AI ຮຽນທັກສະໃໝ່ໄດ້ໄວຂຶ້ນ$$,
    $$Ask AI to break a skill into the smallest useful first step, then build a short feedback loop.$$,
    $$ຂໍໃຫ້ AI ແບ່ງທັກສະເປັນຂັ້ນຕອນທຳອິດທີ່ນ້ອຍທີ່ສຸດແຕ່ເປັນປະໂຫຍດ ແລ້ວສ້າງວົງຮອບຄຳຄິດເຫັນສັ້ນໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Find the smallest useful first step$$, 'body', $$Ask AI "what is the one smallest thing I could practice today" rather than a full curriculum. Momentum beats a perfect plan you never start.$$),
      jsonb_build_object('heading', $$Practice, then bring back what happened$$, 'body', $$After practicing, tell AI specifically what went wrong or felt hard, and ask for the next smallest adjustment — not a whole new plan.$$),
      jsonb_build_object('heading', $$Track progress in plain language$$, 'body', $$Keep a short running note of what you tried and learned each week. Ask AI to help you spot patterns in what's actually working.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊອກຂັ້ນຕອນທຳອິດທີ່ນ້ອຍທີ່ສຸດແຕ່ເປັນປະໂຫຍດ$$, 'body', $$ຖາມ AI ວ່າ "ສິ່ງນ້ອຍທີ່ສຸດອັນດຽວທີ່ຄວນຝຶກມື້ນີ້ແມ່ນຫຍັງ" ແທນທີ່ຈະຂໍຫຼັກສູດເຕັມ. ແຮງຂັບເຄື່ອນດີກວ່າແຜນສົມບູນທີ່ບໍ່ເຄີຍເລີ່ມ.$$),
      jsonb_build_object('heading', $$ຝຶກ ແລ້ວນຳສິ່ງທີ່ເກີດຂຶ້ນກັບມາ$$, 'body', $$ຫຼັງຝຶກແລ້ວ ບອກ AI ຢ່າງສະເພາະວ່າຫຍັງຜິດ ຫຼືຮູ້ສຶກຍາກ ແລະ ຂໍການປັບປຸງນ້ອຍໆຄັ້ງຕໍ່ໄປ — ບໍ່ແມ່ນແຜນໃໝ່ທັງໝົດ.$$),
      jsonb_build_object('heading', $$ບັນທຶກຄວາມຄືບໜ້າດ້ວຍພາສາງ່າຍ$$, 'body', $$ບັນທຶກສັ້ນໆສິ່ງທີ່ລອງ ແລະ ຮຽນຮູ້ແຕ່ລະອາທິດ. ຂໍ AI ຊ່ວຍຊອກຮູບແບບຂອງສິ່ງທີ່ໄດ້ຜົນຈິງ.$$)
    ),
    array[$$Find the smallest useful first step, not a full plan$$, $$Bring specific results back for the next small adjustment$$, $$Keep a short log to spot what's actually working$$],
    array[$$ຊອກຂັ້ນຕອນທຳອິດທີ່ນ້ອຍທີ່ສຸດ ບໍ່ແມ່ນແຜນເຕັມ$$, $$ນຳຜົນສະເພາະກັບມາເພື່ອປັບປຸງນ້ອຍໆຄັ້ງຕໍ່ໄປ$$, $$ບັນທຶກສັ້ນໆເພື່ອຊອກສິ່ງທີ່ໄດ້ຜົນຈິງ$$],
    5, false, 55
  ),
  (
    $$organize-a-group-project-with-ai$$,
    $$Use AI to organize a group project plan$$,
    $$ໃຊ້ AI ຈັດແຜນໂຄງການກຸ່ມ$$,
    $$Turn a group's scattered ideas into clear roles, milestones, and deadlines everyone can see.$$,
    $$ປ່ຽນແນວຄິດກະຈັດກະຈາຍຂອງກຸ່ມເປັນບົດບາດ, ເປົ້າໝາຍ ແລະ ກຳນົດເວລາທີ່ທຸກຄົນເຫັນຊັດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$List members, skills, and the deadline$$, 'body', $$Give AI who's on the team, what each person is good at, and the real final deadline before asking for a plan.$$),
      jsonb_build_object('heading', $$Ask for milestones with owners$$, 'body', $$Request a table of milestones, each with a named owner and a date, so accountability is clear instead of assumed.$$),
      jsonb_build_object('heading', $$Share the plan and revisit it$$, 'body', $$Send the plan to the whole group for changes before locking it in, and check progress against it partway through, not only at the end.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸສະມາຊິກ, ທັກສະ ແລະ ກຳນົດເວລາ$$, 'body', $$ບອກ AI ວ່າໃຜຢູ່ໃນທີມ, ແຕ່ລະຄົນຖະນັດຫຍັງ ແລະ ກຳນົດເວລາສຸດທ້າຍຈິງ ກ່ອນຂໍແຜນ.$$),
      jsonb_build_object('heading', $$ຂໍເປົ້າໝາຍພ້ອມຜູ້ຮັບຜິດຊອບ$$, 'body', $$ຂໍຕາຕະລາງເປົ້າໝາຍ ພ້ອມຜູ້ຮັບຜິດຊອບ ແລະ ວັນທີ ເພື່ອໃຫ້ຄວາມຮັບຜິດຊອບຊັດເຈນ ບໍ່ແມ່ນການຄາດເດົາ.$$),
      jsonb_build_object('heading', $$ແບ່ງປັນແຜນ ແລະ ທົບທວນຄືນ$$, 'body', $$ສົ່ງແຜນໃຫ້ທັງກຸ່ມແກ້ໄຂກ່ອນລ໋ອກ ແລະ ກວດຄວາມຄືບໜ້າກາງທາງ ບໍ່ແມ່ນແຕ່ຕອນທ້າຍ.$$)
    ),
    array[$$Give AI real team, skills, and deadline details$$, $$Ask for milestones with a named owner for each$$, $$Share the plan for input and revisit it mid-project$$],
    array[$$ໃຫ້ AI ຮູ້ທີມ, ທັກສະ ແລະ ກຳນົດເວລາຈິງ$$, $$ຂໍເປົ້າໝາຍພ້ອມຜູ້ຮັບຜິດຊອບແຕ່ລະຄົນ$$, $$ແບ່ງປັນແຜນ ແລະ ທົບທວນຄືນກາງທາງ$$],
    5, false, 56
  ),
  (
    $$set-healthy-boundaries-with-ai$$,
    $$Set healthy boundaries with AI to avoid over-reliance$$,
    $$ຕັ້ງຂອບເຂດທີ່ດີກັບ AI ເພື່ອບໍ່ໃຫ້ເພິ່ງພາເກີນໄປ$$,
    $$Notice when you reach for AI before trying to think it through yourself first.$$,
    $$ສັງເກດເມື່ອທ່ານໃຊ້ AI ກ່ອນທີ່ຈະລອງຄິດເອງກ່ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Try first, then check$$, 'body', $$For anything you're supposed to be learning, attempt it yourself first and use AI to check or improve your attempt — not to skip it.$$),
      jsonb_build_object('heading', $$Notice tasks you can no longer do without it$$, 'body', $$If a basic skill you used to do easily now feels impossible without AI, that's a sign to deliberately practice it unaided again.$$),
      jsonb_build_object('heading', $$Keep some thinking fully your own$$, 'body', $$Set aside decisions and creative work you deliberately do without AI, to keep your own judgment and voice sharp.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລອງກ່ອນ ຄ່ອຍກວດ$$, 'body', $$ສຳລັບສິ່ງທີ່ຄວນຮຽນຮູ້ ໃຫ້ລອງເຮັດເອງກ່ອນ ແລ້ວໃຊ້ AI ກວດ ຫຼືປັບປຸງສິ່ງທີ່ລອງ — ບໍ່ແມ່ນຂ້າມມັນໄປ.$$),
      jsonb_build_object('heading', $$ສັງເກດວຽກທີ່ເຮັດເອງບໍ່ໄດ້ອີກແລ້ວ$$, 'body', $$ຖ້າທັກສະພື້ນຖານທີ່ເຄີຍເຮັດງ່າຍ ດຽວນີ້ຮູ້ສຶກເຮັດບໍ່ໄດ້ຖ້າບໍ່ມີ AI ນັ້ນເປັນສັນຍານໃຫ້ຝຶກເຮັດເອງອີກຄັ້ງໂດຍຕັ້ງໃຈ.$$),
      jsonb_build_object('heading', $$ຮັກສາການຄິດບາງສ່ວນໃຫ້ເປັນຂອງທ່ານແທ້ໆ$$, 'body', $$ຈັດແຍກການຕັດສິນໃຈ ແລະ ວຽກສ້າງສັນທີ່ຕັ້ງໃຈເຮັດໂດຍບໍ່ໃຊ້ AI ເພື່ອຮັກສາການຕັດສິນໃຈ ແລະ ສຽງຂອງທ່ານໃຫ້ຄົມຢູ່.$$)
    ),
    array[$$Try tasks yourself before turning to AI$$, $$Notice skills that now feel impossible without it$$, $$Keep some decisions and creative work fully your own$$],
    array[$$ລອງເຮັດເອງກ່ອນທີ່ຈະໃຊ້ AI$$, $$ສັງເກດທັກສະທີ່ຮູ້ສຶກເຮັດບໍ່ໄດ້ຖ້າບໍ່ມີ AI$$, $$ຮັກສາການຕັດສິນໃຈ ແລະ ວຽກສ້າງສັນບາງສ່ວນໃຫ້ເປັນຂອງທ່ານແທ້$$],
    5, false, 57
  ),
  (
    $$turn-data-into-a-simple-table-with-ai$$,
    $$Use AI to turn messy data into a simple table$$,
    $$ໃຊ້ AI ປ່ຽນຂໍ້ມູນທີ່ສັບສົນເປັນຕາຕະລາງງ່າຍໆ$$,
    $$Paste raw numbers or notes and ask for a clean table with clear column headings.$$,
    $$ວາງຕົວເລກ ຫຼືບັນທຶກດິບ ແລ້ວຂໍຕາຕະລາງທີ່ສະອາດພ້ອມຫົວຄໍລຳຊັດເຈນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Paste the raw data as-is$$, 'body', $$Copy numbers, lists, or notes exactly as you have them — don't waste time pre-organizing before asking AI to structure it.$$),
      jsonb_build_object('heading', $$Specify columns and sort order$$, 'body', $$Tell AI exactly which columns you need and how to sort them, such as by date, by amount, or alphabetically.$$),
      jsonb_build_object('heading', $$Spot-check a few numbers$$, 'body', $$Pick two or three values in the finished table and verify them against your original data — AI can occasionally miscount or misplace a figure.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວາງຂໍ້ມູນດິບຕາມທີ່ມີ$$, 'body', $$ຄັດລອກຕົວເລກ, ລາຍການ ຫຼືບັນທຶກຕາມທີ່ມີແທ້ — ບໍ່ຕ້ອງເສຍເວລາຈັດລະບຽບກ່ອນຂໍໃຫ້ AI ຈັດໂຄງສ້າງ.$$),
      jsonb_build_object('heading', $$ລະບຸຄໍລຳ ແລະ ລຳດັບການຈັດ$$, 'body', $$ບອກ AI ວ່າຕ້ອງການຄໍລຳໃດ ແລະ ຈັດລຳດັບແນວໃດ ເຊັ່ນ ຕາມວັນທີ, ຕາມຈຳນວນ ຫຼືຕາມຕົວອັກສອນ.$$),
      jsonb_build_object('heading', $$ສຸ່ມກວດຄືນສອງສາມຄ່າ$$, 'body', $$ເລືອກ 2-3 ຄ່າໃນຕາຕະລາງທີ່ສຳເລັດ ແລ້ວກວດຄືນກັບຂໍ້ມູນຕົ້ນສະບັບ — AI ອາດນັບຜິດ ຫຼືວາງຕົວເລກຜິດບ່ອນເປັນບາງຄັ້ງ.$$)
    ),
    array[$$Paste raw data instead of pre-organizing it first$$, $$Specify exact columns and sort order you need$$, $$Spot-check a few values against the original data$$],
    array[$$ວາງຂໍ້ມູນດິບ ບໍ່ຕ້ອງຈັດລະບຽບກ່ອນ$$, $$ລະບຸຄໍລຳ ແລະ ລຳດັບການຈັດທີ່ຕ້ອງການ$$, $$ສຸ່ມກວດຄືນຄ່າຈາກຂໍ້ມູນຕົ້ນສະບັບ$$],
    4, false, 58
  ),
  (
    $$write-clear-instructions-to-delegate-work$$,
    $$Use AI to write clear instructions when delegating work$$,
    $$ໃຊ້ AI ຂຽນຄຳສັ່ງທີ່ຊັດເຈນເມື່ອມອບໝາຍວຽກ$$,
    $$Instructions that would confuse a new teammate will confuse AI too — clarity helps both.$$,
    $$ຄຳສັ່ງທີ່ເຮັດໃຫ້ເພື່ອນຮ່ວມງານໃໝ່ສັບສົນ ກໍ່ຈະເຮັດໃຫ້ AI ສັບສົນເໝືອນກັນ — ຄວາມຊັດເຈນຊ່ວຍທັງສອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State the goal before the steps$$, 'body', $$Explain what success looks like first, then the steps. A clear goal lets the person, or AI, fill small gaps sensibly.$$),
      jsonb_build_object('heading', $$Draft it, then have AI find gaps$$, 'body', $$Write your instructions, then ask AI what's ambiguous or missing from an outsider's point of view before sending them.$$),
      jsonb_build_object('heading', $$Include what "done" looks like$$, 'body', $$End with a concrete description of the finished result, so the person doing the work can check their own progress against it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກເປົ້າໝາຍກ່ອນຂັ້ນຕອນ$$, 'body', $$ອະທິບາຍວ່າຄວາມສຳເລັດເປັນແນວໃດກ່ອນ ແລ້ວຄ່ອຍບອກຂັ້ນຕອນ. ເປົ້າໝາຍທີ່ຊັດເຈນຊ່ວຍໃຫ້ຄົນ ຫຼື AI ຕື່ມຊ່ອງຫວ່າງນ້ອຍໆໄດ້ຢ່າງສົມເຫດສົມຜົນ.$$),
      jsonb_build_object('heading', $$ຮ່າງກ່ອນ ແລ້ວໃຫ້ AI ຊອກຫາຊ່ອງຫວ່າງ$$, 'body', $$ຂຽນຄຳສັ່ງກ່ອນ ແລ້ວຖາມ AI ວ່າຫຍັງບໍ່ຊັດເຈນ ຫຼືຂາດຫາຍໃນມຸມມອງຄົນນອກ ກ່ອນສົ່ງອອກໄປ.$$),
      jsonb_build_object('heading', $$ໃສ່ວ່າ "ສຳເລັດ" ໜ້າຕາເປັນແນວໃດ$$, 'body', $$ຈົບດ້ວຍຄຳອະທິບາຍທີ່ຈັບຕ້ອງໄດ້ຂອງຜົນສຳເລັດ ເພື່ອຄົນເຮັດວຽກກວດຄວາມຄືບໜ້າຂອງຕົນເອງໄດ້.$$)
    ),
    array[$$State the goal before listing the steps$$, $$Ask AI to spot ambiguity from an outsider's view$$, $$End with a clear description of what "done" looks like$$],
    array[$$ບອກເປົ້າໝາຍກ່ອນລາຍລະອຽດຂັ້ນຕອນ$$, $$ຂໍ AI ຊອກຫາຈຸດບໍ່ຊັດເຈນຈາກມຸມມອງຄົນນອກ$$, $$ຈົບດ້ວຍຄຳອະທິບາຍຊັດເຈນຂອງຜົນສຳເລັດ$$],
    5, false, 59
  ),
  (
    $$use-ai-for-creative-writing-prompts$$,
    $$Use AI for creative writing prompts and story starters$$,
    $$ໃຊ້ AI ສ້າງແຮງບັນດານໃຈ ແລະ ຈຸດເລີ່ມນິທານ$$,
    $$Let AI spark ideas when you're stuck, then take the story somewhere it wouldn't have gone.$$,
    $$ໃຫ້ AI ຈຸດປະກາຍແນວຄິດເມື່ອຄິດບໍ່ອອກ ແລ້ວພານິທານໄປໃນທິດທາງທີ່ AI ຄິດບໍ່ເຖິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask for a spark, not a finished story$$, 'body', $$Request a single vivid image, an odd character trait, or a strange first line — small sparks are easier to build on than a full plot.$$),
      jsonb_build_object('heading', $$Push it somewhere unexpected$$, 'body', $$Take the AI-generated starting point and deliberately steer it away from the most obvious next step — that's usually where originality lives.$$),
      jsonb_build_object('heading', $$Keep the finished draft in your own voice$$, 'body', $$Use AI for the spark and unstuck moments, but write the actual scenes and dialogue yourself so the finished piece is genuinely yours.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂໍປະກາຍໄຟ ບໍ່ແມ່ນນິທານທີ່ສຳເລັດແລ້ວ$$, 'body', $$ຂໍພາບໜຶ່ງທີ່ຊັດເຈນ, ລັກສະນະຕົວລະຄອນແປກໆ ຫຼືປະໂຫຍກທຳອິດທີ່ແປກ — ປະກາຍໄຟນ້ອຍໆຕໍ່ຍອດງ່າຍກວ່າໂຄງເລື່ອງເຕັມ.$$),
      jsonb_build_object('heading', $$ພາໄປໃນທິດທາງທີ່ບໍ່ຄາດຄິດ$$, 'body', $$ຮັບເອົາຈຸດເລີ່ມຈາກ AI ແລ້ວຕັ້ງໃຈບັງຄັບໃຫ້ໄປໃນທິດທາງທີ່ບໍ່ແມ່ນຂັ້ນຕອນຕໍ່ໄປທີ່ຄາດງ່າຍ — ນັ້ນມັກເປັນບ່ອນທີ່ຄວາມແປກໃໝ່ຢູ່.$$),
      jsonb_build_object('heading', $$ຮັກສາຮ່າງສຸດທ້າຍໃນສຽງຂອງທ່ານເອງ$$, 'body', $$ໃຊ້ AI ສຳລັບປະກາຍໄຟ ແລະ ຊ່ວຍເມື່ອຄິດຕິດຂັດ ແຕ່ຂຽນສາກ ແລະ ບົດສົນທະນາຈິງດ້ວຍຕົນເອງ ເພື່ອໃຫ້ຜົນງານເປັນຂອງທ່ານແທ້ໆ.$$)
    ),
    array[$$Ask for a small spark, not a finished plot$$, $$Push the idea away from the obvious direction$$, $$Write the actual scenes yourself, in your own voice$$],
    array[$$ຂໍປະກາຍໄຟນ້ອຍໆ ບໍ່ແມ່ນໂຄງເລື່ອງທີ່ສຳເລັດ$$, $$ພາແນວຄິດອອກຈາກທິດທາງທີ່ຄາດງ່າຍ$$, $$ຂຽນສາກຈິງດ້ວຍຕົນເອງໃນສຽງຂອງທ່ານ$$],
    5, false, 60
  ),
  (
    $$final-consistency-check-before-publishing$$,
    $$Use AI for a final consistency check before publishing$$,
    $$ໃຊ້ AI ກວດຄວາມສອດຄ່ອງຄັ້ງສຸດທ້າຍກ່ອນເຜີຍແຜ່$$,
    $$Before sending or posting, ask AI to check names, numbers, and tone stay consistent throughout.$$,
    $$ກ່ອນສົ່ງ ຫຼືເຜີຍແຜ່ ໃຫ້ AI ກວດວ່າຊື່, ຕົວເລກ ແລະ ນ້ຳສຽງສອດຄ່ອງກັນຕະຫຼອດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check names and numbers match throughout$$, 'body', $$Ask AI to scan the full document for a name spelled two ways or a number that changes partway through — easy mistakes to miss on your own.$$),
      jsonb_build_object('heading', $$Check tone stays even$$, 'body', $$Long documents written over several sessions can drift in formality. Ask AI to flag any section that suddenly sounds too casual or too stiff.$$),
      jsonb_build_object('heading', $$Do one last read yourself$$, 'body', $$After AI's check, read it once more yourself — the final judgment on what's ready to publish should stay with you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດຊື່ ແລະ ຕົວເລກໃຫ້ກົງກັນຕະຫຼອດ$$, 'body', $$ຂໍ AI ກວດເອກະສານທັງໝົດຫາຊື່ທີ່ສະກົດສອງແບບ ຫຼືຕົວເລກທີ່ປ່ຽນໄປລະຫວ່າງທາງ — ຄວາມຜິດພາດທີ່ພາດງ່າຍເມື່ອກວດເອງ.$$),
      jsonb_build_object('heading', $$ກວດນ້ຳສຽງໃຫ້ສະໝ່ຳສະເໝີ$$, 'body', $$ເອກະສານຍາວທີ່ຂຽນຫຼາຍຄັ້ງອາດມີຄວາມເປັນທາງການບໍ່ຄົງທີ່. ຂໍ AI ຊີ້ບອກສ່ວນທີ່ຟັງທຳມະດາ ຫຼືແຂງເກີນໄປແບບກະທັນຫັນ.$$),
      jsonb_build_object('heading', $$ອ່ານຄັ້ງສຸດທ້າຍດ້ວຍຕົນເອງ$$, 'body', $$ຫຼັງ AI ກວດແລ້ວ ໃຫ້ອ່ານອີກຄັ້ງດ້ວຍຕົນເອງ — ການຕັດສິນສຸດທ້າຍວ່າພ້ອມເຜີຍແຜ່ບໍ່ຄວນຢູ່ນອກເໜືອທ່ານ.$$)
    ),
    array[$$Ask AI to check names and numbers stay consistent$$, $$Have it flag sudden shifts in tone$$, $$Always do one final read yourself before publishing$$],
    array[$$ຂໍ AI ກວດຊື່ ແລະ ຕົວເລກໃຫ້ກົງກັນ$$, $$ໃຫ້ຊີ້ບອກນ້ຳສຽງທີ່ປ່ຽນແປງກະທັນຫັນ$$, $$ອ່ານຄັ້ງສຸດທ້າຍດ້ວຍຕົນເອງກ່ອນເຜີຍແຜ່ສະເໝີ$$],
    4, false, 61
  ),
  (
    $$learn-software-shortcuts-faster-with-ai$$,
    $$Use AI to learn software shortcuts and workflows faster$$,
    $$ໃຊ້ AI ຮຽນຮູ້ທາງລັດ ແລະ ວິທີເຮັດວຽກໃນໂປຣແກຣມໄດ້ໄວຂຶ້ນ$$,
    $$Describe the repetitive click-heavy task and ask AI for the faster way to do it.$$,
    $$ອະທິບາຍວຽກທີ່ຄລິກເລື້ອຍໆ ແລ້ວຂໍ AI ບອກວິທີເຮັດທີ່ໄວກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Describe the repeated action$$, 'body', $$Tell AI exactly what you do over and over in an app — formatting text, moving files, switching tabs — and which software you're using.$$),
      jsonb_build_object('heading', $$Ask for the shortcut and the reasoning$$, 'body', $$Request the exact keyboard shortcut or menu path, plus why it's faster, so you remember it instead of looking it up again next time.$$),
      jsonb_build_object('heading', $$Practice it three times right away$$, 'body', $$Use the new shortcut immediately, three times in a row, while it's fresh. That's usually enough for it to stick in muscle memory.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອະທິບາຍວຽກທີ່ເຮັດຊ້ຳ$$, 'body', $$ບອກ AI ຢ່າງຊັດເຈນວ່າທ່ານເຮັດຫຍັງຊ້ຳໆໃນແອັບ — ຈັດຮູບແບບຂໍ້ຄວາມ, ຍ້າຍໄຟລ໌, ສະຫຼັບແທັບ — ແລະ ໃຊ້ໂປຣແກຣມໃດ.$$),
      jsonb_build_object('heading', $$ຂໍທາງລັດ ພ້ອມເຫດຜົນ$$, 'body', $$ຂໍປຸ່ມລັດ ຫຼືເສັ້ນທາງເມນູທີ່ແນ່ນອນ ພ້ອມເຫດຜົນວ່າໄວກວ່າແນວໃດ ເພື່ອຈື່ໄດ້ແທນທີ່ຈະຄົ້ນຫາອີກໃນຄັ້ງຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ຝຶກໃຊ້ 3 ຄັ້ງທັນທີ$$, 'body', $$ໃຊ້ທາງລັດໃໝ່ທັນທີ 3 ຄັ້ງຕິດຕໍ່ກັນ ໃນຂະນະທີ່ຍັງຈື່ໄດ້ດີ. ປົກກະຕິແລ້ວພຽງພໍໃຫ້ຈື່ໄດ້ຢູ່ໃນນິໄສ.$$)
    ),
    array[$$Describe the exact repeated action and software$$, $$Ask for both the shortcut and why it's faster$$, $$Practice a new shortcut three times right away$$],
    array[$$ອະທິບາຍວຽກທີ່ເຮັດຊ້ຳ ແລະ ໂປຣແກຣມໃຫ້ຊັດເຈນ$$, $$ຂໍທັງທາງລັດ ແລະ ເຫດຜົນວ່າໄວກວ່າແນວໃດ$$, $$ຝຶກໃຊ້ທາງລັດໃໝ່ 3 ຄັ້ງທັນທີ$$],
    4, false, 62
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'ai-skills'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
