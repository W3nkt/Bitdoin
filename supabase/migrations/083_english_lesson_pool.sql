-- Bulk lesson-pool seed: English direction.
-- Adds original, evergreen practical-English lessons so the pool has 50+
-- published lessons before launch; the weekly content-forge job adds on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'LESSON', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$order-food-confidently-in-english$$,
    $$Order food confidently in English$$,
    $$ສັ່ງອາຫານເປັນພາສາອັງກິດຢ່າງໝັ້ນໃຈ$$,
    $$A few reliable phrases cover almost every ordering situation, from cafes to restaurants.$$,
    $$ປະໂຫຍກທີ່ໃຊ້ໄດ້ຈິງພຽງບໍ່ຫຼາຍຄອບຄຸມການສັ່ງອາຫານເກືອບທຸກສະຖານະການ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with a simple opener$$, 'body', $$"Can I get..." or "I'd like..." followed by the item works in almost any restaurant, casual or formal.$$),
      jsonb_build_object('heading', $$Handle questions back from staff$$, 'body', $$Expect "for here or to go?" and "anything else?" — practice answering these two questions until they're automatic.$$),
      jsonb_build_object('heading', $$Ask about the menu without embarrassment$$, 'body', $$"What do you recommend?" and "What's in this?" are completely normal questions — staff expect and welcome them.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍປະໂຫຍກງ່າຍໆ$$, 'body', $$"Can I get..." ຫຼື "I'd like..." ຕາມດ້ວຍລາຍການອາຫານ ໃຊ້ໄດ້ໃນເກືອບທຸກຮ້ານ ບໍ່ວ່າທາງການ ຫຼືບໍ່ທາງການ.$$),
      jsonb_build_object('heading', $$ຮັບມືຄຳຖາມຈາກພະນັກງານ$$, 'body', $$ຄາດຫວັງ "for here or to go?" ແລະ "anything else?" — ຝຶກຕອບສອງຄຳຖາມນີ້ຈົນເປັນອັດຕະໂນມັດ.$$),
      jsonb_build_object('heading', $$ຖາມກ່ຽວກັບເມນູໂດຍບໍ່ຕ້ອງອາຍ$$, 'body', $$"What do you recommend?" ແລະ "What's in this?" ເປັນຄຳຖາມທຳມະດາ — ພະນັກງານຄາດຫວັງ ແລະ ຍິນດີຕອບ.$$)
    ),
    array[$$"Can I get..." works in almost any ordering situation$$, $$Practice answering "for here or to go?"$$, $$Asking for a recommendation is always welcome$$],
    array[$$"Can I get..." ໃຊ້ໄດ້ໃນເກືອບທຸກສະຖານະການສັ່ງອາຫານ$$, $$ຝຶກຕອບ "for here or to go?"$$, $$ການຂໍຄຳແນະນຳເປັນສິ່ງທີ່ຍິນດີສະເໝີ$$],
    4, false, 20
  ),
  (
    $$ask-for-directions-and-understand-answers$$,
    $$Ask for directions and understand the answer$$,
    $$ຖາມທາງ ແລະ ເຂົ້າໃຈຄຳຕອບ$$,
    $$Knowing direction words in advance helps you actually understand the answer, not just ask the question.$$,
    $$ຮູ້ຄຳສັບທິດທາງລ່ວງໜ້າຊ່ວຍໃຫ້ເຂົ້າໃຈຄຳຕອບແທ້ໆ ບໍ່ແມ່ນແຕ່ຖາມໄດ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask clearly and politely$$, 'body', $$"Excuse me, how do I get to...?" or "Is this the way to...?" are clear, polite ways to start.$$),
      jsonb_build_object('heading', $$Learn the key direction words$$, 'body', $$Left, right, straight ahead, across from, next to, on the corner — these few words cover most directions you'll receive.$$),
      jsonb_build_object('heading', $$Confirm if you're unsure$$, 'body', $$Repeat back what you heard: "So left at the light, then straight?" This confirms understanding without needing to ask again from scratch.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມຢ່າງຊັດເຈນ ແລະ ສຸພາບ$$, 'body', $$"Excuse me, how do I get to...?" ຫຼື "Is this the way to...?" ເປັນວິທີເລີ່ມທີ່ຊັດເຈນ ແລະ ສຸພາບ.$$),
      jsonb_build_object('heading', $$ຮຽນຄຳສັບທິດທາງສຳຄັນ$$, 'body', $$ຊ້າຍ, ຂວາ, ຊື່ໄປ, ກົງກັນຂ້າມກັບ, ຕິດກັບ, ຢູ່ແຈ — ຄຳສັບໜ້ອຍໆເຫຼົ່ານີ້ຄອບຄຸມທິດທາງສ່ວນຫຼາຍທີ່ຈະໄດ້ຮັບ.$$),
      jsonb_build_object('heading', $$ຢືນຢັນຄືນຖ້າບໍ່ແນ່ໃຈ$$, 'body', $$ເວົ້າຄືນສິ່ງທີ່ໄດ້ຍິນ: "So left at the light, then straight?" ນີ້ຊ່ວຍຢືນຢັນຄວາມເຂົ້າໃຈໂດຍບໍ່ຕ້ອງຖາມໃໝ່.$$)
    ),
    array[$$Use a clear, polite opener when asking directions$$, $$Learn core direction words like left, right, and across from$$, $$Repeat back the directions to confirm you understood$$],
    array[$$ໃຊ້ຄຳເລີ່ມທີ່ຊັດເຈນ ແລະ ສຸພາບເມື່ອຖາມທາງ$$, $$ຮຽນຄຳສັບທິດທາງພື້ນຖານ ເຊັ່ນ ຊ້າຍ, ຂວາ, ກົງກັນຂ້າມ$$, $$ເວົ້າຄືນທິດທາງເພື່ອຢືນຢັນຄວາມເຂົ້າໃຈ$$],
    4, false, 21
  ),
  (
    $$small-talk-at-a-new-job$$,
    $$Make small talk at a new job$$,
    $$ລົມທົ່ວໄປໃນວຽກໃໝ່$$,
    $$A few light, safe topics help you connect with new coworkers without pressure.$$,
    $$ຫົວຂໍ້ເບົາໆ ແລະ ປອດໄພຊ່ວຍໃຫ້ເຊື່ອມຕໍ່ກັບເພື່ອນຮ່ວມງານໃໝ່ໂດຍບໍ່ກົດດັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Keep it light and safe$$, 'body', $$Weekend plans, the commute, the weather, or a shared task are safe first-week topics. Avoid salary, politics, or personal problems.$$),
      jsonb_build_object('heading', $$Use easy follow-up questions$$, 'body', $$"How long have you worked here?" or "What do you usually do for lunch?" are simple, natural ways to keep a chat going.$$),
      jsonb_build_object('heading', $$It's fine to keep it short$$, 'body', $$Small talk doesn't need to last long. A friendly greeting and a short exchange is enough — you don't have to fill every silence.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຫົວຂໍ້ເບົາ ແລະ ປອດໄພ$$, 'body', $$ແຜນທ້າຍອາທິດ, ການເດີນທາງໄປວຽກ, ອາກາດ ຫຼືວຽກທີ່ຮ່ວມກັນ ເປັນຫົວຂໍ້ປອດໄພໃນອາທິດທຳອິດ. ຫຼີກລ້ຽງເງິນເດືອນ, ການເມືອງ ຫຼືບັນຫາສ່ວນຕົວ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຄຳຖາມຕໍ່ງ່າຍໆ$$, 'body', $$"How long have you worked here?" ຫຼື "What do you usually do for lunch?" ເປັນວິທີງ່າຍ ແລະ ທຳມະຊາດເພື່ອສືບຕໍ່ການລົມ.$$),
      jsonb_build_object('heading', $$ສັ້ນໆກໍ່ໄດ້$$, 'body', $$ການລົມທົ່ວໄປບໍ່ຈຳເປັນຕ້ອງຍາວ. ການທັກທາຍທີ່ເປັນມິດ ແລະ ການແລກປ່ຽນສັ້ນໆກໍ່ພຽງພໍ — ບໍ່ຕ້ອງເຕັມທຸກຄວາມງຽບ.$$)
    ),
    array[$$Stick to light, safe topics in the first weeks$$, $$Use simple follow-up questions to keep it natural$$, $$A short, friendly exchange is enough — no pressure to fill silence$$],
    array[$$ໃຊ້ຫົວຂໍ້ເບົາ ແລະ ປອດໄພໃນອາທິດທຳອິດ$$, $$ໃຊ້ຄຳຖາມຕໍ່ງ່າຍໆເພື່ອໃຫ້ທຳມະຊາດ$$, $$ການລົມສັ້ນໆທີ່ເປັນມິດກໍ່ພຽງພໍ ບໍ່ຕ້ອງກົດດັນ$$],
    4, false, 22
  ),
  (
    $$use-numbers-prices-dates-correctly$$,
    $$Use English numbers, prices, and dates correctly$$,
    $$ໃຊ້ຕົວເລກ, ລາຄາ ແລະ ວັນທີເປັນພາສາອັງກິດໃຫ້ຖືກຕ້ອງ$$,
    $$Numbers are said differently than they're read silently — practice saying them out loud.$$,
    $$ຕົວເລກເວົ້າອອກສຽງຕ່າງຈາກອ່ານໃນໃຈ — ຝຶກເວົ້າອອກສຽງໃຫ້ຄຸ້ນເຄີຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Practice prices out loud$$, 'body', $$$4.50 is "four fifty" or "four dollars fifty," not "four point five zero." Say prices from receipts out loud daily to build the habit.$$),
      jsonb_build_object('heading', $$Learn the two ways to say dates$$, 'body', $$"March 5th" can be said "March fifth" or "the fifth of March" — both are correct, so recognize either when you hear it.$$),
      jsonb_build_object('heading', $$Watch out for big numbers$$, 'body', $$"Thousand," "million," and comma placement often trip up learners. Practice reading large numbers from real prices or statistics aloud.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຝຶກເວົ້າລາຄາອອກສຽງ$$, 'body', $$$4.50 ເວົ້າວ່າ "four fifty" ຫຼື "four dollars fifty" ບໍ່ແມ່ນ "four point five zero." ຝຶກເວົ້າລາຄາຈາກໃບບິນອອກສຽງທຸກມື້.$$),
      jsonb_build_object('heading', $$ຮຽນສອງວິທີເວົ້າວັນທີ$$, 'body', $$"March 5th" ເວົ້າໄດ້ວ່າ "March fifth" ຫຼື "the fifth of March" — ທັງສອງຖືກຕ້ອງ ໃຫ້ຈື່ໄດ້ທັງສອງແບບ.$$),
      jsonb_build_object('heading', $$ລະວັງຕົວເລກຫຼັກໃຫຍ່$$, 'body', $$"Thousand," "million" ແລະ ຕຳແໜ່ງເຄື່ອງໝາຍຈຸດມັກເຮັດໃຫ້ຜູ້ຮຽນສັບສົນ. ຝຶກອ່ານຕົວເລກຫຼັກໃຫຍ່ຈາກລາຄາ ຫຼືສະຖິຕິຈິງອອກສຽງ.$$)
    ),
    array[$$Practice saying prices out loud, not just reading them$$, $$Recognize both common ways to say a date$$, $$Drill large numbers since they're easy to mix up$$],
    array[$$ຝຶກເວົ້າລາຄາອອກສຽງ ບໍ່ແມ່ນແຕ່ອ່ານ$$, $$ຈື່ທັງສອງວິທີເວົ້າວັນທີທົ່ວໄປ$$, $$ຝຶກຕົວເລກຫຼັກໃຫຍ່ເພາະສັບສົນງ່າຍ$$],
    5, false, 23
  ),
  (
    $$write-a-polite-request-email$$,
    $$Write a polite email requesting something$$,
    $$ຂຽນອີເມວຂໍຮ້ອງຢ່າງສຸພາບ$$,
    $$A clear request email has a friendly opener, the specific ask, and a polite close.$$,
    $$ອີເມວຂໍຮ້ອງທີ່ດີມີການເປີດທີ່ເປັນມິດ, ຄຳຂໍທີ່ຊັດເຈນ ແລະ ການປິດທ້າຍທີ່ສຸພາບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Open with a brief greeting$$, 'body', $$"Hi [Name], I hope you're doing well" is a safe, warm opener that works for most professional requests.$$),
      jsonb_build_object('heading', $$State the request clearly$$, 'body', $$"I'm writing to ask if..." or "Could you please..." followed by exactly what you need, with any relevant deadline.$$),
      jsonb_build_object('heading', $$Close with thanks and your name$$, 'body', $$"Thank you for your time" or "I appreciate your help" before your name closes the email politely and professionally.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເປີດດ້ວຍການທັກທາຍສັ້ນໆ$$, 'body', $$"Hi [Name], I hope you're doing well" ເປັນຄຳເປີດທີ່ປອດໄພ ແລະ ອົບອຸ່ນ ໃຊ້ໄດ້ກັບການຂໍຮ້ອງທາງວຽກສ່ວນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ບອກຄຳຂໍໃຫ້ຊັດເຈນ$$, 'body', $$"I'm writing to ask if..." ຫຼື "Could you please..." ຕາມດ້ວຍສິ່ງທີ່ຕ້ອງການແທ້ໆ ພ້ອມກຳນົດເວລາທີ່ກ່ຽວຂ້ອງ.$$),
      jsonb_build_object('heading', $$ປິດທ້າຍດ້ວຍຄຳຂອບໃຈ ແລະ ຊື່$$, 'body', $$"Thank you for your time" ຫຼື "I appreciate your help" ກ່ອນລົງຊື່ ປິດອີເມວຢ່າງສຸພາບ ແລະ ເປັນມືອາຊີບ.$$)
    ),
    array[$$Open with a brief, warm greeting$$, $$State exactly what you're asking for$$, $$Close with thanks before your name$$],
    array[$$ເປີດດ້ວຍການທັກທາຍສັ້ນ ແລະ ອົບອຸ່ນ$$, $$ບອກສິ່ງທີ່ຂໍຮ້ອງໃຫ້ຊັດເຈນ$$, $$ປິດທ້າຍດ້ວຍຄຳຂອບໃຈກ່ອນລົງຊື່$$],
    5, false, 24
  ),
  (
    $$apologize-and-explain-a-mistake$$,
    $$Apologize and explain a mistake in English$$,
    $$ຂໍໂທດ ແລະ ອະທິບາຍຄວາມຜິດພາດເປັນພາສາອັງກິດ$$,
    $$A good apology is short, direct, and followed by what you'll do differently.$$,
    $$ຄຳຂໍໂທດທີ່ດີແມ່ນສັ້ນ, ກົງໄປກົງມາ ແລະ ຕາມດ້ວຍສິ່ງທີ່ຈະປ່ຽນແປງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Say sorry directly first$$, 'body', $$"I'm sorry for..." or "I apologize for..." stated plainly, before any explanation, shows you're taking responsibility.$$),
      jsonb_build_object('heading', $$Explain briefly, don't over-justify$$, 'body', $$One short sentence of context is enough. A long list of excuses can make the apology feel less sincere.$$),
      jsonb_build_object('heading', $$End with what you'll do next$$, 'body', $$"I'll make sure to..." shows the apology comes with a real fix, which matters more than the words themselves.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເວົ້າຂໍໂທດໂດຍກົງກ່ອນ$$, 'body', $$"I'm sorry for..." ຫຼື "I apologize for..." ເວົ້າໂດຍກົງກ່ອນອະທິບາຍ ສະແດງວ່າທ່ານຮັບຜິດຊອບ.$$),
      jsonb_build_object('heading', $$ອະທິບາຍສັ້ນໆ ບໍ່ອ້າງເຫດຜົນຫຼາຍເກີນໄປ$$, 'body', $$ບໍລິບົດສັ້ນໆໜຶ່ງປະໂຫຍກກໍ່ພຽງພໍ. ລາຍການຂໍ້ອ້າງທີ່ຍາວອາດເຮັດໃຫ້ຄຳຂໍໂທດຟັງບໍ່ຈິງໃຈ.$$),
      jsonb_build_object('heading', $$ຈົບດ້ວຍສິ່ງທີ່ຈະເຮັດຕໍ່ໄປ$$, 'body', $$"I'll make sure to..." ສະແດງວ່າຄຳຂໍໂທດມາພ້ອມການແກ້ໄຂຈິງ ເຊິ່ງສຳຄັນກວ່າຄຳເວົ້າເອງ.$$)
    ),
    array[$$Say sorry directly before explaining$$, $$Keep the explanation brief, not a list of excuses$$, $$End with a concrete plan to do better$$],
    array[$$ເວົ້າຂໍໂທດໂດຍກົງກ່ອນອະທິບາຍ$$, $$ອະທິບາຍສັ້ນໆ ບໍ່ອ້າງເຫດຜົນຫຼາຍ$$, $$ຈົບດ້ວຍແຜນທີ່ຈະປັບປຸງແທ້ໆ$$],
    4, false, 25
  ),
  (
    $$common-phrasal-verbs-daily-life$$,
    $$Understand and use common phrasal verbs$$,
    $$ເຂົ້າໃຈ ແລະ ໃຊ້ Phrasal Verb ທີ່ພົບເລື້ອຍ$$,
    $$Phrasal verbs like "look for" and "give up" are everywhere in spoken English — learn them in small groups.$$,
    $$Phrasal verb ເຊັ່ນ "look for" ແລະ "give up" ພົບເລື້ອຍໃນພາສາເວົ້າ — ຮຽນເປັນກຸ່ມນ້ອຍໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Learn them as whole chunks$$, 'body', $$"Look for" (search) means something different from "look" plus "for" separately. Memorize the whole phrase and its meaning together.$$),
      jsonb_build_object('heading', $$Group by daily situations$$, 'body', $$Learn "wake up," "get dressed," "go out," and "come back" together as a morning-routine group, rather than a random list.$$),
      jsonb_build_object('heading', $$Use one in a sentence about your own day$$, 'body', $$"I gave up coffee last month" is more memorable than the definition alone. Make one true sentence for each new phrasal verb.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮຽນເປັນຄຳສັບຄູ່$$, 'body', $$"Look for" (ຄົ້ນຫາ) ມີຄວາມໝາຍຕ່າງຈາກ "look" ບວກ "for" ແຍກກັນ. ຈື່ໝົດປະໂຫຍກ ແລະ ຄວາມໝາຍພ້ອມກັນ.$$),
      jsonb_build_object('heading', $$ຈັດກຸ່ມຕາມສະຖານະການປະຈຳວັນ$$, 'body', $$ຮຽນ "wake up," "get dressed," "go out" ແລະ "come back" ເປັນກຸ່ມກິດຈະວັດຕອນເຊົ້າ ແທນທີ່ຈະຮຽນແບບສຸ່ມ.$$),
      jsonb_build_object('heading', $$ໃຊ້ໃນປະໂຫຍກກ່ຽວກັບຊີວິດຕົນເອງ$$, 'body', $$"I gave up coffee last month" ຈື່ໄດ້ດີກວ່າຄຳນິຍາມຢ່າງດຽວ. ແຕ່ງໜຶ່ງປະໂຫຍກຈິງສຳລັບແຕ່ລະ phrasal verb ໃໝ່.$$)
    ),
    array[$$Learn phrasal verbs as whole chunks, not word by word$$, $$Group them by everyday situations to remember faster$$, $$Make a true sentence with each new one you learn$$],
    array[$$ຮຽນ phrasal verb ເປັນຄຳສັບຄູ່ ບໍ່ແມ່ນທີລະຄຳ$$, $$ຈັດກຸ່ມຕາມສະຖານະການປະຈຳວັນເພື່ອຈື່ໄວ$$, $$ແຕ່ງປະໂຫຍກຈິງສຳລັບແຕ່ລະຄຳໃໝ່$$],
    5, false, 26
  ),
  (
    $$practice-pronunciation-of-tricky-sounds$$,
    $$Practice pronunciation of tricky English sounds$$,
    $$ຝຶກອອກສຽງພະຍັນຊະນະພາສາອັງກິດທີ່ຍາກ$$,
    $$A few sounds like "th" and "r" cause most confusion — targeted practice fixes them faster than general speaking.$$,
    $$ສຽງບາງອັນເຊັ່ນ "th" ແລະ "r" ເຮັດໃຫ້ສັບສົນທີ່ສຸດ — ການຝຶກກົງເປົ້າແກ້ໄດ້ໄວກວ່າການເວົ້າທົ່ວໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify your two hardest sounds$$, 'body', $$Record yourself reading a short paragraph, then listen back and note which two sounds feel or sound the most different from your language.$$),
      jsonb_build_object('heading', $$Watch mouth shape, not just listen$$, 'body', $$For sounds like "th," watching a video of the tongue and lip position often helps more than audio alone.$$),
      jsonb_build_object('heading', $$Practice minimal pairs daily$$, 'body', $$Words that differ by one sound, like "ship" and "sheep," train your ear and mouth together in just a few minutes a day.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາສອງສຽງທີ່ຍາກທີ່ສຸດຂອງທ່ານ$$, 'body', $$ອັດສຽງຕົນເອງອ່ານຫຍໍ້ໜ້າສັ້ນໆ ແລ້ວຟັງຄືນ ສັງເກດວ່າສອງສຽງໃດຮູ້ສຶກ ຫຼືຟັງແຕກຕ່າງຈາກພາສາຂອງທ່ານທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ເບິ່ງຮູບປາກ ບໍ່ແມ່ນແຕ່ຟັງ$$, 'body', $$ສຳລັບສຽງເຊັ່ນ "th" ການເບິ່ງວິດີໂອຕຳແໜ່ງລີ້ນ ແລະ ຮີມສົບ ມັກຊ່ວຍໄດ້ດີກວ່າຟັງສຽງຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ຝຶກຄູ່ຄຳທີ່ຕ່າງກັນນ້ອຍໆທຸກມື້$$, 'body', $$ຄຳທີ່ຕ່າງກັນພຽງໜຶ່ງສຽງ ເຊັ່ນ "ship" ແລະ "sheep" ຝຶກຫູ ແລະ ປາກໄປພ້ອມກັນພາຍໃນສອງສາມນາທີຕໍ່ວັນ.$$)
    ),
    array[$$Record yourself to find your two hardest sounds$$, $$Watch mouth position, not just listen to audio$$, $$Practice minimal pairs a few minutes daily$$],
    array[$$ອັດສຽງຕົນເອງເພື່ອຫາສອງສຽງທີ່ຍາກທີ່ສຸດ$$, $$ເບິ່ງຕຳແໜ່ງປາກ ບໍ່ແມ່ນແຕ່ຟັງສຽງ$$, $$ຝຶກຄູ່ຄຳຄ້າຍກັນສອງສາມນາທີທຸກມື້$$],
    5, false, 27
  ),
  (
    $$talk-about-your-daily-routine$$,
    $$Talk about your daily routine in English$$,
    $$ເລົ່າກິດຈະວັດປະຈຳວັນເປັນພາສາອັງກິດ$$,
    $$Routine talk is a common small-talk and interview topic — practice it as one flowing story.$$,
    $$ການເລົ່າກິດຈະວັດເປັນຫົວຂໍ້ລົມທົ່ວໄປ ແລະ ສຳພາດທົ່ວໄປ — ຝຶກເລົ່າເປັນເລື່ອງຕໍ່ເນື່ອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use simple present tense$$, 'body', $$"I wake up at 6, I have breakfast, then I go to work" — routines use simple present, not past or continuous.$$),
      jsonb_build_object('heading', $$Connect steps with time words$$, 'body', $$"First," "then," "after that," and "finally" turn a list of actions into a smooth, connected story.$$),
      jsonb_build_object('heading', $$Practice a 30-second version$$, 'body', $$Time yourself telling your routine in under 30 seconds — the length most small-talk and interview answers actually need.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ Simple Present Tense$$, 'body', $$"I wake up at 6, I have breakfast, then I go to work" — ກິດຈະວັດໃຊ້ simple present ບໍ່ແມ່ນອະດີດ ຫຼືກຳລັງດຳເນີນ.$$),
      jsonb_build_object('heading', $$ເຊື່ອມຂັ້ນຕອນດ້ວຍຄຳບອກເວລາ$$, 'body', $$"First," "then," "after that" ແລະ "finally" ປ່ຽນລາຍການກິດຈະກຳໃຫ້ເປັນເລື່ອງທີ່ຕໍ່ເນື່ອງກັນລຽບງ່າຍ.$$),
      jsonb_build_object('heading', $$ຝຶກສະບັບ 30 ວິນາທີ$$, 'body', $$ຈັບເວລາຕົນເອງເລົ່າກິດຈະວັດພາຍໃນ 30 ວິນາທີ — ຄວາມຍາວທີ່ການລົມທົ່ວໄປ ແລະ ການສຳພາດຕ້ອງການແທ້ໆ.$$)
    ),
    array[$$Use simple present tense for routines$$, $$Connect steps with words like first, then, finally$$, $$Practice a short 30-second version for interviews$$],
    array[$$ໃຊ້ simple present tense ສຳລັບກິດຈະວັດ$$, $$ເຊື່ອມຂັ້ນຕອນດ້ວຍ first, then, finally$$, $$ຝຶກສະບັບສັ້ນ 30 ວິນາທີສຳລັບການສຳພາດ$$],
    4, false, 28
  ),
  (
    $$give-your-opinion-politely$$,
    $$Give your opinion politely in a discussion$$,
    $$ໃຫ້ຄວາມຄິດເຫັນຢ່າງສຸພາບໃນການສົນທະນາ$$,
    $$Soft opening phrases let you disagree or share a view without sounding harsh.$$,
    $$ປະໂຫຍກເປີດແບບອ່ອນໂຍນຊ່ວຍໃຫ້ໂຕ້ແຍ້ງ ຫຼືແບ່ງປັນຄວາມຄິດເຫັນໂດຍບໍ່ຟັງແຂງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use a soft opener$$, 'body', $$"I think...", "In my opinion...", or "From my perspective..." all signal a personal view rather than a fact, which invites discussion.$$),
      jsonb_build_object('heading', $$Acknowledge before disagreeing$$, 'body', $$"That's a good point, but..." softens disagreement and shows you listened, which usually keeps the discussion friendly.$$),
      jsonb_build_object('heading', $$Back it up with a short reason$$, 'body', $$"...because" plus one clear reason makes your opinion easier to take seriously than an unsupported statement.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ຄຳເປີດແບບອ່ອນໂຍນ$$, 'body', $$"I think...", "In my opinion..." ຫຼື "From my perspective..." ສະແດງວ່າເປັນຄວາມຄິດເຫັນສ່ວນຕົວ ບໍ່ແມ່ນຂໍ້ເທັດຈິງ ເຊິ່ງເປີດໂອກາດໃຫ້ສົນທະນາ.$$),
      jsonb_build_object('heading', $$ຮັບຮູ້ກ່ອນໂຕ້ແຍ້ງ$$, 'body', $$"That's a good point, but..." ເຮັດໃຫ້ການໂຕ້ແຍ້ງອ່ອນລົງ ແລະ ສະແດງວ່າທ່ານຟັງແທ້ ເຊິ່ງມັກຮັກສາການສົນທະນາໃຫ້ເປັນມິດ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເຫດຜົນສັ້ນໆສະໜັບສະໜູນ$$, 'body', $$"...because" ບວກເຫດຜົນສັ້ນໆໜຶ່ງອັນ ເຮັດໃຫ້ຄວາມຄິດເຫັນຂອງທ່ານໜ້າເຊື່ອຖືກວ່າຄຳເວົ້າທີ່ບໍ່ມີເຫດຜົນ.$$)
    ),
    array[$$Use a soft opener to signal it's your personal view$$, $$Acknowledge the other view before disagreeing$$, $$Support your opinion with one clear reason$$],
    array[$$ໃຊ້ຄຳເປີດອ່ອນໂຍນສະແດງວ່າເປັນຄວາມຄິດເຫັນສ່ວນຕົວ$$, $$ຮັບຮູ້ອີກຝ່າຍກ່ອນໂຕ້ແຍ້ງ$$, $$ສະໜັບສະໜູນຄວາມຄິດເຫັນດ້ວຍເຫດຜົນສັ້ນໆ$$],
    4, false, 29
  ),
  (
    $$answer-tell-me-about-yourself$$,
    $$Answer "Tell me about yourself" in an interview$$,
    $$ຕອບຄຳຖາມ "ເລົ່າກ່ຽວກັບຕົນເອງ" ໃນການສຳພາດ$$,
    $$A strong answer follows present, past, future — not your whole life story.$$,
    $$ຄຳຕອບທີ່ດີເປັນລຳດັບ ປັດຈຸບັນ, ອະດີດ, ອະນາຄົດ — ບໍ່ແມ່ນເລົ່າຊີວິດທັງໝົດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with now$$, 'body', $$Begin with your current role or studies: "Currently, I'm..." This anchors the interviewer immediately in relevant context.$$),
      jsonb_build_object('heading', $$Add relevant past experience$$, 'body', $$"Before that, I..." — pick only the one or two past experiences most relevant to this specific job.$$),
      jsonb_build_object('heading', $$End with why you're here$$, 'body', $$"That's why I'm excited about this role..." connects your story directly to the job, ending on forward momentum.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍປັດຈຸບັນ$$, 'body', $$ເລີ່ມດ້ວຍວຽກ ຫຼືການຮຽນປັດຈຸບັນ: "Currently, I'm..." ນີ້ຊ່ວຍໃຫ້ຜູ້ສຳພາດເຂົ້າໃຈບໍລິບົດທັນທີ.$$),
      jsonb_build_object('heading', $$ເພີ່ມປະສົບການອະດີດທີ່ກ່ຽວຂ້ອງ$$, 'body', $$"Before that, I..." — ເລືອກແຕ່ 1-2 ປະສົບການອະດີດທີ່ກ່ຽວຂ້ອງກັບຕຳແໜ່ງງານນີ້ຫຼາຍທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ຈົບດ້ວຍເຫດຜົນທີ່ມາສະໝັກ$$, 'body', $$"That's why I'm excited about this role..." ເຊື່ອມເລື່ອງລາວກັບຕຳແໜ່ງງານໂດຍກົງ ຈົບດ້ວຍທ່າທີກ້າວໄປຂ້າງໜ້າ.$$)
    ),
    array[$$Structure the answer as present, past, then future$$, $$Choose only experience relevant to this specific job$$, $$End by connecting your story to why you want this role$$],
    array[$$ຈັດຄຳຕອບເປັນ ປັດຈຸບັນ, ອະດີດ ແລ້ວອະນາຄົດ$$, $$ເລືອກແຕ່ປະສົບການທີ່ກ່ຽວຂ້ອງກັບຕຳແໜ່ງນີ້$$, $$ຈົບໂດຍເຊື່ອມເລື່ອງລາວກັບເຫດຜົນສະໝັກງານ$$],
    5, false, 30
  ),
  (
    $$use-polite-requests-could-you-would-you-mind$$,
    $$Use polite requests: could you, would you mind$$,
    $$ໃຊ້ຄຳຂໍຮ້ອງແບບສຸພາບ: could you, would you mind$$,
    $$Softer request phrases make you sound polished, especially in professional English.$$,
    $$ປະໂຫຍກຂໍຮ້ອງທີ່ອ່ອນໂຍນເຮັດໃຫ້ຟັງເປັນມືອາຊີບ ໂດຍສະເພາະໃນພາສາອັງກິດທາງວຽກ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"Could you" is your everyday default$$, 'body', $$"Could you send me the file?" is polite and natural for almost any workplace request, replacing the blunter "Send me the file."$$),
      jsonb_build_object('heading', $$"Would you mind" for extra politeness$$, 'body', $$"Would you mind closing the window?" is even softer — remember the answer "no" means yes, they'll do it, which confuses many learners.$$),
      jsonb_build_object('heading', $$Match formality to the situation$$, 'body', $$Use "would you mind" with a boss or stranger, and simpler "can you" with close friends — matching formality to context sounds natural.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"Could you" ໃຊ້ໄດ້ທົ່ວໄປ$$, 'body', $$"Could you send me the file?" ສຸພາບ ແລະ ທຳມະຊາດສຳລັບການຂໍຮ້ອງທາງວຽກເກືອບທຸກຢ່າງ ແທນທີ່ "Send me the file." ທີ່ຟັງແຂງກວ່າ.$$),
      jsonb_build_object('heading', $$"Would you mind" ສຸພາບຂຶ້ນອີກ$$, 'body', $$"Would you mind closing the window?" ອ່ອນໂຍນຂຶ້ນອີກ — ຈື່ໄວ້ວ່າຄຳຕອບ "no" ໝາຍຄວາມວ່າຕົກລົງຈະເຮັດໃຫ້ ເຊິ່ງເຮັດໃຫ້ຜູ້ຮຽນຫຼາຍຄົນສັບສົນ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມສຸພາບກົງກັບສະຖານະການ$$, 'body', $$ໃຊ້ "would you mind" ກັບຫົວໜ້າ ຫຼືຄົນແປກໜ້າ ແລະ "can you" ແບບງ່າຍກັບໝູ່ສະໜິດ — ການໃຫ້ຄວາມສຸພາບກົງກັບບໍລິບົດຟັງເປັນທຳມະຊາດ.$$)
    ),
    array[$$"Could you" works as a polite everyday default$$, $$"No" after "would you mind" actually means yes$$, $$Match the level of politeness to who you're speaking to$$],
    array[$$"Could you" ໃຊ້ໄດ້ທົ່ວໄປແບບສຸພາບ$$, $$"No" ຫຼັງ "would you mind" ໝາຍຄວາມວ່າຕົກລົງ$$, $$ໃຫ້ຄວາມສຸພາບກົງກັບຄົນທີ່ເວົ້ານຳ$$],
    4, false, 31
  ),
  (
    $$understand-fast-speakers-shadowing$$,
    $$Understand fast native speakers with the shadowing technique$$,
    $$ເຂົ້າໃຈເຈົ້າຂອງພາສາທີ່ເວົ້າໄວດ້ວຍເທັກນິກ Shadowing$$,
    $$Shadowing — repeating audio a split second behind the speaker — trains your ear for real speed and rhythm.$$,
    $$Shadowing — ເວົ້າຕາມສຽງພຽງແຕ່ຊ້າກວ່າໜ້ອຍໜຶ່ງ — ຝຶກຫູໃຫ້ຄຸ້ນຈັງຫວະ ແລະ ຄວາມໄວແທ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick short, clear audio$$, 'body', $$Choose a 30-second clip with a transcript, like a short podcast segment or interview answer, at a natural conversational speed.$$),
      jsonb_build_object('heading', $$Repeat right behind the speaker$$, 'body', $$Play the audio and speak along a half-second behind, copying rhythm and stress, not just the words themselves.$$),
      jsonb_build_object('heading', $$Repeat the same clip several times$$, 'body', $$Shadow the same short clip five to ten times until it feels smooth — repetition on one clip beats moving to new audio too fast.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກສຽງສັ້ນ ແລະ ຊັດເຈນ$$, 'body', $$ເລືອກຄລິບ 30 ວິນາທີທີ່ມີບົດເວົ້າ ເຊັ່ນ ພອດແຄສສັ້ນ ຫຼືຄຳຕອບໃນການສຳພາດ ດ້ວຍຄວາມໄວການລົມທຳມະຊາດ.$$),
      jsonb_build_object('heading', $$ເວົ້າຕາມທັນທີຫຼັງສຽງ$$, 'body', $$ເປີດສຽງ ແລະ ເວົ້າຕາມຊ້າກວ່າເຄິ່ງວິນາທີ ຄັດລອກຈັງຫວະ ແລະ ການເນັ້ນສຽງ ບໍ່ແມ່ນແຕ່ຄຳສັບ.$$),
      jsonb_build_object('heading', $$ຄລິບດຽວກັນເຮັດຊ້ຳຫຼາຍຄັ້ງ$$, 'body', $$Shadow ຄລິບດຽວກັນ 5-10 ຄັ້ງຈົນຮູ້ສຶກລຽບງ່າຍ — ການເຮັດຊ້ຳຄລິບດຽວດີກວ່າປ່ຽນສຽງໃໝ່ໄວເກີນໄປ.$$)
    ),
    array[$$Choose short audio clips with a transcript$$, $$Speak along right behind the speaker, matching rhythm$$, $$Repeat the same short clip several times before moving on$$],
    array[$$ເລືອກຄລິບສຽງສັ້ນທີ່ມີບົດເວົ້າ$$, $$ເວົ້າຕາມທັນທີຫຼັງສຽງ ຄັດລອກຈັງຫວະ$$, $$ເຮັດຊ້ຳຄລິບດຽວກັນຫຼາຍຄັ້ງກ່ອນປ່ຽນ$$],
    6, false, 32
  ),
  (
    $$write-clear-text-messages$$,
    $$Write a short, clear text message in English$$,
    $$ຂຽນຂໍ້ຄວາມສັ້ນ ແລະ ຊັດເຈນເປັນພາສາອັງກິດ$$,
    $$Texting has its own casual rules — shorter sentences, clear intent, no need for full formality.$$,
    $$ການສົ່ງຂໍ້ຄວາມມີກົດລະບຽບບໍ່ທາງການຂອງຕົນເອງ — ປະໂຫຍກສັ້ນ, ຄວາມໝາຍຊັດເຈນ ບໍ່ຕ້ອງທາງການເຕັມທີ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Say the point in the first line$$, 'body', $$"Running 10 min late, sorry!" gets to the point immediately — texts don't need a formal greeting first.$$),
      jsonb_build_object('heading', $$Common short forms are fine$$, 'body', $$"Thx," "omw" (on my way), and "np" (no problem) are normal in casual texting with friends, but avoid them in work messages.$$),
      jsonb_build_object('heading', $$Match tone to the relationship$$, 'body', $$Texting a boss stays closer to full sentences and correct grammar; texting a close friend can be much more relaxed.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກໃຈຄວາມແຖວທຳອິດ$$, 'body', $$"Running 10 min late, sorry!" ບອກໃຈຄວາມທັນທີ — ຂໍ້ຄວາມບໍ່ຕ້ອງມີການທັກທາຍທາງການກ່ອນ.$$),
      jsonb_build_object('heading', $$ຄຳຫຍໍ້ໃຊ້ໄດ້$$, 'body', $$"Thx," "omw" (on my way) ແລະ "np" (no problem) ໃຊ້ໄດ້ທຳມະດາໃນຂໍ້ຄວາມກັບໝູ່ ແຕ່ຫຼີກລ້ຽງໃນຂໍ້ຄວາມທາງວຽກ.$$),
      jsonb_build_object('heading', $$ໃຫ້ນ້ຳສຽງກົງກັບຄວາມສຳພັນ$$, 'body', $$ຂໍ້ຄວາມຫາຫົວໜ້າຄວນໃກ້ຄຽງປະໂຫຍກເຕັມ ແລະ ໄວຍະກອນຖືກຕ້ອງ; ຂໍ້ຄວາມຫາໝູ່ສະໜິດຜ່ອນຄາຍໄດ້ຫຼາຍກວ່າ.$$)
    ),
    array[$$Lead with the point, skip the formal greeting$$, $$Common short forms are fine for casual texts$$, $$Match your tone to how close the relationship is$$],
    array[$$ບອກໃຈຄວາມກ່ອນ ບໍ່ຕ້ອງທັກທາຍທາງການ$$, $$ຄຳຫຍໍ້ໃຊ້ໄດ້ໃນຂໍ້ຄວາມບໍ່ທາງການ$$, $$ໃຫ້ນ້ຳສຽງກົງກັບຄວາມສະໜິດຂອງຄວາມສຳພັນ$$],
    3, false, 33
  ),
  (
    $$handle-a-phone-call-in-english$$,
    $$Use English on the phone: taking a call$$,
    $$ໃຊ້ພາສາອັງກິດທາງໂທລະສັບ: ຮັບສາຍ$$,
    $$Phone calls remove facial expressions, so clear set phrases matter even more than in person.$$,
    $$ໂທລະສັບບໍ່ມີສີໜ້າໃຫ້ເຫັນ ສະນັ້ນປະໂຫຍກທີ່ຊັດເຈນສຳຄັນຫຼາຍກວ່າການລົມຕໍ່ໜ້າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Open and identify yourself$$, 'body', $$"Hello, this is [Name] speaking" is a clean, standard way to answer a work or formal call.$$),
      jsonb_build_object('heading', $$Ask them to repeat without embarrassment$$, 'body', $$"Sorry, could you say that again?" or "Could you speak a bit slower, please?" are completely normal phone requests.$$),
      jsonb_build_object('heading', $$Close the call clearly$$, 'body', $$"Thanks for calling, have a good day" or "I'll follow up by email" gives a clear, polite ending signal.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເປີດສາຍ ແລະ ບອກຊື່ຕົນເອງ$$, 'body', $$"Hello, this is [Name] speaking" ເປັນວິທີຮັບສາຍທາງວຽກ ຫຼືທາງການທີ່ຊັດເຈນ ແລະ ມາດຕະຖານ.$$),
      jsonb_build_object('heading', $$ຂໍໃຫ້ເວົ້າຄືນໂດຍບໍ່ຕ້ອງອາຍ$$, 'body', $$"Sorry, could you say that again?" ຫຼື "Could you speak a bit slower, please?" ເປັນຄຳຂໍທາງໂທລະສັບທີ່ທຳມະດາຫຼາຍ.$$),
      jsonb_build_object('heading', $$ປິດສາຍໃຫ້ຊັດເຈນ$$, 'body', $$"Thanks for calling, have a good day" ຫຼື "I'll follow up by email" ໃຫ້ສັນຍານປິດການສົນທະນາຢ່າງຊັດເຈນ ແລະ ສຸພາບ.$$)
    ),
    array[$$Answer with a clear self-identification$$, $$It's normal to ask someone to repeat or slow down$$, $$Close the call with a clear, polite signal$$],
    array[$$ຮັບສາຍດ້ວຍການບອກຊື່ຕົນເອງໃຫ້ຊັດເຈນ$$, $$ການຂໍໃຫ້ເວົ້າຄືນ ຫຼືຊ້າລົງແມ່ນເລື່ອງທຳມະດາ$$, $$ປິດສາຍດ້ວຍສັນຍານທີ່ຊັດເຈນ ແລະ ສຸພາບ$$],
    4, false, 34
  ),
  (
    $$describe-your-job-or-studies$$,
    $$Describe your job or studies to a stranger$$,
    $$ອະທິບາຍວຽກ ຫຼືການຮຽນຂອງທ່ານໃຫ້ຄົນແປກໜ້າຟັງ$$,
    $$A clear one-line description beats a long, technical explanation for first meetings.$$,
    $$ຄຳອະທິບາຍໜຶ່ງແຖວທີ່ຊັດເຈນ ດີກວ່າຄຳອະທິບາຍວິຊາການທີ່ຍາວ ສຳລັບການພົບກັນຄັ້ງທຳອິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start broad, then specific$$, 'body', $$"I work in marketing — specifically, I manage social media for a clothing brand" moves from general to specific in one breath.$$),
      jsonb_build_object('heading', $$Skip the jargon with strangers$$, 'body', $$Explain what you actually do in plain terms rather than internal job titles or technical terms only your industry understands.$$),
      jsonb_build_object('heading', $$Add one relatable detail$$, 'body', $$One small, human detail — "I love it because..." — makes the description memorable instead of a flat job title.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມກວ້າງ ແລ້ວແຄບລົງ$$, 'body', $$"I work in marketing — specifically, I manage social media for a clothing brand" ໄປຈາກທົ່ວໄປສູ່ສະເພາະໃນລົມຫາຍໃຈດຽວ.$$),
      jsonb_build_object('heading', $$ຫຼີກລ້ຽງຄຳສັບວິຊາການກັບຄົນແປກໜ້າ$$, 'body', $$ອະທິບາຍສິ່ງທີ່ເຮັດແທ້ໆດ້ວຍພາສາງ່າຍ ແທນທີ່ຈະໃຊ້ຊື່ຕຳແໜ່ງພາຍໃນ ຫຼືຄຳສັບວິຊາການທີ່ມີແຕ່ຄົນໃນສາຍງານເຂົ້າໃຈ.$$),
      jsonb_build_object('heading', $$ເພີ່ມລາຍລະອຽດທີ່ເຂົ້າໃຈງ່າຍໜຶ່ງອັນ$$, 'body', $$ລາຍລະອຽດນ້ອຍໆທີ່ເປັນມະນຸດ — "I love it because..." — ເຮັດໃຫ້ຄຳອະທິບາຍຈື່ໄດ້ ແທນທີ່ຈະເປັນແຕ່ຊື່ຕຳແໜ່ງ.$$)
    ),
    array[$$Move from general to specific in one line$$, $$Skip jargon strangers won't understand$$, $$Add one human detail to make it memorable$$],
    array[$$ໄປຈາກທົ່ວໄປສູ່ສະເພາະໃນປະໂຫຍກດຽວ$$, $$ຫຼີກລ້ຽງຄຳສັບວິຊາການທີ່ຄົນແປກໜ້າບໍ່ເຂົ້າໃຈ$$, $$ເພີ່ມລາຍລະອຽດທີ່ເປັນມະນຸດເພື່ອໃຫ້ຈື່ໄດ້$$],
    4, false, 35
  ),
  (
    $$handle-a-misunderstanding-could-you-repeat$$,
    $$Handle a misunderstanding: "Could you repeat that?"$$,
    $$ຮັບມືຄວາມເຂົ້າໃຈຜິດ: "Could you repeat that?"$$,
    $$Asking for repetition is a normal, expected part of conversation — not a sign of weakness.$$,
    $$ການຂໍໃຫ້ເວົ້າຄືນເປັນເລື່ອງທຳມະດາ ແລະ ຄາດຫວັງໄດ້ໃນການສົນທະນາ — ບໍ່ແມ່ນສັນຍານຄວາມອ່ອນແອ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Have three go-to phrases ready$$, 'body', $$"Sorry, could you repeat that?", "Could you say that in a different way?", and "What does [word] mean?" cover most situations.$$),
      jsonb_build_object('heading', $$Show what you did understand$$, 'body', $$"I got the first part, but could you repeat after '...'?" helps the other person know exactly where to pick up.$$),
      jsonb_build_object('heading', $$Stay calm, it happens to everyone$$, 'body', $$Even native speakers regularly mishear each other. Treat it as a normal part of conversation, not something to feel embarrassed about.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກຽມສາມປະໂຫຍກໄວ້ໃຊ້$$, 'body', $$"Sorry, could you repeat that?", "Could you say that in a different way?" ແລະ "What does [word] mean?" ຄອບຄຸມສະຖານະການສ່ວນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ສະແດງສ່ວນທີ່ເຂົ້າໃຈແລ້ວ$$, 'body', $$"I got the first part, but could you repeat after '...'?" ຊ່ວຍໃຫ້ອີກຝ່າຍຮູ້ວ່າຄວນເລີ່ມເວົ້າຄືນຈາກໃສ.$$),
      jsonb_build_object('heading', $$ໃຈເຢັນ ເປັນເລື່ອງທຳມະດາ$$, 'body', $$ແມ່ນແຕ່ເຈົ້າຂອງພາສາກໍ່ຟັງຜິດກັນເປັນປົກກະຕິ. ຖືວ່າເປັນສ່ວນທຳມະດາຂອງການສົນທະນາ ບໍ່ຕ້ອງອາຍ.$$)
    ),
    array[$$Keep three go-to repetition phrases ready$$, $$Show what part you understood to help them respond$$, $$Mishearing is normal even for native speakers$$],
    array[$$ກຽມສາມປະໂຫຍກຂໍໃຫ້ເວົ້າຄືນໄວ້ໃຊ້$$, $$ສະແດງສ່ວນທີ່ເຂົ້າໃຈແລ້ວເພື່ອຊ່ວຍອີກຝ່າຍຕອບ$$, $$ການຟັງຜິດເປັນເລື່ອງທຳມະດາແມ່ນແຕ່ເຈົ້າຂອງພາສາ$$],
    3, false, 36
  ),
  (
    $$common-confusing-word-pairs$$,
    $$Common confusing word pairs in English$$,
    $$ຄູ່ຄຳສັບພາສາອັງກິດທີ່ມັກສັບສົນ$$,
    $$A handful of word pairs cause most confusion — learn them with one memorable example each.$$,
    $$ຄູ່ຄຳສັບໜ້ອຍໆເຮັດໃຫ້ສັບສົນທີ່ສຸດ — ຮຽນດ້ວຍຕົວຢ່າງທີ່ຈື່ໄດ້ໜຶ່ງອັນຕໍ່ຄູ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Affect vs. effect$$, 'body', $$"Affect" is usually a verb ("the rain affects my mood"), "effect" is usually a noun ("the effect was clear"). Remember: Affect = Action.$$),
      jsonb_build_object('heading', $$Its vs. it's$$, 'body', $$"It's" always means "it is" or "it has." "Its" shows possession, like "his" or "her." If you can say "it is," use the apostrophe.$$),
      jsonb_build_object('heading', $$Then vs. than$$, 'body', $$"Then" relates to time or sequence ("first this, then that"). "Than" is for comparisons ("bigger than that").$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$Affect ທຽບ Effect$$, 'body', $$"Affect" ປົກກະຕິເປັນຄຳກິລິຍາ ("the rain affects my mood"), "effect" ປົກກະຕິເປັນຄຳນາມ ("the effect was clear"). ຈື່ວ່າ Affect = Action.$$),
      jsonb_build_object('heading', $$Its ທຽບ It's$$, 'body', $$"It's" ໝາຍວ່າ "it is" ຫຼື "it has" ສະເໝີ. "Its" ສະແດງຄວາມເປັນເຈົ້າຂອງ ຄືກັບ "his" ຫຼື "her". ຖ້າເວົ້າ "it is" ໄດ້ ໃຫ້ໃສ່ apostrophe.$$),
      jsonb_build_object('heading', $$Then ທຽບ Than$$, 'body', $$"Then" ກ່ຽວກັບເວລາ ຫຼືລຳດັບ ("first this, then that"). "Than" ໃຊ້ສຳລັບການປຽບທຽບ ("bigger than that").$$)
    ),
    array[$$Affect is usually the verb, effect the noun$$, $$"It's" always expands to "it is" or "it has"$$, $$"Than" is for comparisons, "then" is for sequence$$],
    array[$$Affect ປົກກະຕິເປັນຄຳກິລິຍາ, Effect ເປັນຄຳນາມ$$, $$"It's" ໝາຍວ່າ "it is" ຫຼື "it has" ສະເໝີ$$, $$"Than" ໃຊ້ປຽບທຽບ, "then" ໃຊ້ບອກລຳດັບ$$],
    4, false, 37
  ),
  (
    $$talk-about-future-plans-going-to-will$$,
    $$Talk about future plans: "going to" vs "will"$$,
    $$ເວົ້າກ່ຽວກັບແຜນອະນາຄົດ: "going to" ທຽບ "will"$$,
    $$"Going to" is for decided plans, "will" is for on-the-spot decisions or predictions.$$,
    $$"Going to" ໃຊ້ກັບແຜນທີ່ຕັດສິນໃຈແລ້ວ, "will" ໃຊ້ກັບການຕັດສິນໃຈກະທັນຫັນ ຫຼືການຄາດຄະເນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use "going to" for existing plans$$, 'body', $$"I'm going to visit my family this weekend" — the plan already existed before you spoke.$$),
      jsonb_build_object('heading', $$Use "will" for instant decisions$$, 'body', $$"I'll get the door!" — the decision happens in the moment, right when you speak, not planned beforehand.$$),
      jsonb_build_object('heading', $$Use "will" for predictions$$, 'body', $$"It will probably rain later" — a prediction based on general belief, not a scheduled plan.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ "going to" ສຳລັບແຜນທີ່ມີຢູ່ແລ້ວ$$, 'body', $$"I'm going to visit my family this weekend" — ແຜນມີຢູ່ແລ້ວກ່ອນເວົ້າ.$$),
      jsonb_build_object('heading', $$ໃຊ້ "will" ສຳລັບການຕັດສິນໃຈທັນທີ$$, 'body', $$"I'll get the door!" — ການຕັດສິນໃຈເກີດຂຶ້ນທັນທີຕອນເວົ້າ ບໍ່ໄດ້ວາງແຜນລ່ວງໜ້າ.$$),
      jsonb_build_object('heading', $$ໃຊ້ "will" ສຳລັບການຄາດຄະເນ$$, 'body', $$"It will probably rain later" — ການຄາດຄະເນຈາກຄວາມເຊື່ອທົ່ວໄປ ບໍ່ແມ່ນແຜນທີ່ກຳນົດໄວ້.$$)
    ),
    array[$$"Going to" signals a plan made before now$$, $$"Will" signals an instant, in-the-moment decision$$, $$"Will" also works for general predictions$$],
    array[$$"Going to" ບອກແຜນທີ່ຕັດສິນໃຈກ່ອນໜ້ານີ້$$, $$"Will" ບອກການຕັດສິນໃຈກະທັນຫັນທັນທີ$$, $$"Will" ໃຊ້ໄດ້ກັບການຄາດຄະເນທົ່ວໄປເໝືອນກັນ$$],
    4, false, 38
  ),
  (
    $$talk-about-past-experiences-present-perfect$$,
    $$Talk about past experiences using the present perfect$$,
    $$ເລົ່າປະສົບການອະດີດດ້ວຍ Present Perfect$$,
    $$Use present perfect for life experience without a specific time — "I have visited" not "I visited yesterday."$$,
    $$ໃຊ້ Present Perfect ສຳລັບປະສົບການຊີວິດທີ່ບໍ່ລະບຸເວລາ — "I have visited" ບໍ່ແມ່ນ "I visited yesterday."$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$No specific time = present perfect$$, 'body', $$"I have been to Vietnam" describes life experience with no fixed time. Add a specific time and it switches to simple past.$$),
      jsonb_build_object('heading', $$Ask experience questions naturally$$, 'body', $$"Have you ever tried...?" is the standard way to ask about someone's life experience in English.$$),
      jsonb_build_object('heading', $$Switch to simple past for the details$$, 'body', $$Once you name a specific time, switch tense: "I've been to Vietnam. I went there in 2019." This pattern is very common.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບໍ່ລະບຸເວລາ = Present Perfect$$, 'body', $$"I have been to Vietnam" ອະທິບາຍປະສົບການຊີວິດໂດຍບໍ່ລະບຸເວລາ. ຖ້າເພີ່ມເວລາສະເພາະ ຈະປ່ຽນເປັນ simple past.$$),
      jsonb_build_object('heading', $$ຖາມຄຳຖາມປະສົບການແບບທຳມະຊາດ$$, 'body', $$"Have you ever tried...?" ເປັນວິທີມາດຕະຖານໃນການຖາມປະສົບການຊີວິດຂອງຄົນອື່ນເປັນພາສາອັງກິດ.$$),
      jsonb_build_object('heading', $$ປ່ຽນເປັນ Simple Past ເມື່ອໃຫ້ລາຍລະອຽດ$$, 'body', $$ເມື່ອລະບຸເວລາສະເພາະ ໃຫ້ປ່ຽນ tense: "I've been to Vietnam. I went there in 2019." ຮູບແບບນີ້ພົບເລື້ອຍຫຼາຍ.$$)
    ),
    array[$$Use present perfect for experience with no fixed time$$, $$"Have you ever...?" is the standard experience question$$, $$Switch to simple past once you add a specific time$$],
    array[$$ໃຊ້ present perfect ສຳລັບປະສົບການທີ່ບໍ່ລະບຸເວລາ$$, $$"Have you ever...?" ເປັນຄຳຖາມປະສົບການມາດຕະຖານ$$, $$ປ່ຽນເປັນ simple past ເມື່ອລະບຸເວລາສະເພາະ$$],
    5, false, 39
  ),
  (
    $$use-comparatives-and-superlatives$$,
    $$Use comparatives and superlatives naturally$$,
    $$ໃຊ້ Comparative ແລະ Superlative ຢ່າງທຳມະຊາດ$$,
    $$Short words add "-er/-est," longer words use "more/most" — a simple rule with a few exceptions to memorize.$$,
    $$ຄຳສັບສັ້ນເພີ່ມ "-er/-est," ຄຳຍາວໃຊ້ "more/most" — ກົດງ່າຍໆທີ່ມີຂໍ້ຍົກເວັ້ນຄວນຈື່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$One-syllable words take -er/-est$$, 'body', $$"Fast" becomes "faster" and "fastest." This rule covers most short, common adjectives.$$),
      jsonb_build_object('heading', $$Longer words take more/most$$, 'body', $$"Expensive" becomes "more expensive" and "most expensive" — not "expensiver." This applies to most three-syllable-plus words.$$),
      jsonb_build_object('heading', $$Memorize the common exceptions$$, 'body', $$"Good" → "better" → "best," and "bad" → "worse" → "worst" don't follow the normal pattern — learn these irregular ones by heart.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄຳສັບພະຍາງດຽວໃສ່ -er/-est$$, 'body', $$"Fast" ກາຍເປັນ "faster" ແລະ "fastest." ກົດນີ້ຄອບຄຸມຄຳຄຸນນາມສັ້ນ ແລະ ພົບເລື້ອຍສ່ວນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຄຳສັບຍາວໃຊ້ more/most$$, 'body', $$"Expensive" ກາຍເປັນ "more expensive" ແລະ "most expensive" — ບໍ່ແມ່ນ "expensiver." ໃຊ້ກັບຄຳສ່ວນຫຼາຍທີ່ມີສາມພະຍາງຂຶ້ນໄປ.$$),
      jsonb_build_object('heading', $$ຈື່ຂໍ້ຍົກເວັ້ນທົ່ວໄປ$$, 'body', $$"Good" → "better" → "best," ແລະ "bad" → "worse" → "worst" ບໍ່ຕາມກົດປົກກະຕິ — ຈື່ຄຳຍົກເວັ້ນເຫຼົ່ານີ້ໃຫ້ຄ່ອງ.$$)
    ),
    array[$$Short words take -er/-est endings$$, $$Longer words use more/most instead$$, $$Memorize irregular ones like good-better-best$$],
    array[$$ຄຳສັບສັ້ນໃສ່ -er/-est$$, $$ຄຳສັບຍາວໃຊ້ more/most ແທນ$$, $$ຈື່ຄຳຍົກເວັ້ນເຊັ່ນ good-better-best$$],
    4, false, 40
  ),
  (
    $$give-clear-instructions-in-english$$,
    $$Give clear instructions in English$$,
    $$ໃຫ້ຄຳແນະນຳເປັນພາສາອັງກິດຢ່າງຊັດເຈນ$$,
    $$Short imperative sentences in order are easier to follow than one long complex sentence.$$,
    $$ປະໂຫຍກຄຳສັ່ງສັ້ນໆຕາມລຳດັບ ຕິດຕາມງ່າຍກວ່າປະໂຫຍກຍາວທີ່ຊັບຊ້ອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Use simple command form$$, 'body', $$"Open the app. Tap settings. Select language." — short commands, one action each, are much easier to follow than a long sentence.$$),
      jsonb_build_object('heading', $$Number the steps out loud$$, 'body', $$"First... second... finally..." helps the listener track where they are, especially in spoken instructions.$$),
      jsonb_build_object('heading', $$Check understanding before moving on$$, 'body', $$"Does that make sense so far?" between steps catches confusion early instead of at the very end.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຊ້ຮູບແບບຄຳສັ່ງງ່າຍ$$, 'body', $$"Open the app. Tap settings. Select language." — ຄຳສັ່ງສັ້ນ ໜຶ່ງການກະທຳຕໍ່ປະໂຫຍກ ຕິດຕາມງ່າຍກວ່າປະໂຫຍກຍາວ.$$),
      jsonb_build_object('heading', $$ນັບຂັ້ນຕອນອອກສຽງ$$, 'body', $$"First... second... finally..." ຊ່ວຍໃຫ້ຜູ້ຟັງຮູ້ວ່າຢູ່ຂັ້ນຕອນໃດ ໂດຍສະເພາະຄຳແນະນຳແບບເວົ້າ.$$),
      jsonb_build_object('heading', $$ກວດຄວາມເຂົ້າໃຈກ່ອນໄປຕໍ່$$, 'body', $$"Does that make sense so far?" ລະຫວ່າງແຕ່ລະຂັ້ນຕອນ ຈັບຄວາມສັບສົນໄດ້ໄວ ບໍ່ແມ່ນຕອນທ້າຍສຸດ.$$)
    ),
    array[$$Use short command sentences, one action each$$, $$Number steps out loud so listeners can track them$$, $$Check understanding between steps, not just at the end$$],
    array[$$ໃຊ້ຄຳສັ່ງສັ້ນ ໜຶ່ງການກະທຳຕໍ່ປະໂຫຍກ$$, $$ນັບຂັ້ນຕອນອອກສຽງເພື່ອໃຫ້ຕິດຕາມໄດ້$$, $$ກວດຄວາມເຂົ້າໃຈລະຫວ່າງຂັ້ນຕອນ ບໍ່ແມ່ນຕອນທ້າຍ$$],
    4, false, 41
  ),
  (
    $$express-disagreement-politely$$,
    $$Express disagreement politely in English$$,
    $$ສະແດງຄວາມບໍ່ເຫັນດີເປັນພາສາອັງກິດຢ່າງສຸພາບ$$,
    $$You can disagree firmly and still sound respectful with the right phrases.$$,
    $$ທ່ານສາມາດບໍ່ເຫັນດີຢ່າງໜັກແໜ້ນ ແລະ ຍັງຟັງເປັນມິດໄດ້ດ້ວຍປະໂຫຍກທີ່ຖືກຕ້ອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Soften with "I see it differently"$$, 'body', $$"I see it a bit differently" or "I'm not sure I agree" disagree clearly without sounding like an attack.$$),
      jsonb_build_object('heading', $$Give your reason right after$$, 'body', $$"...because [reason]" turns a disagreement from personal into logical — people respond better to reasoning than a flat "no."$$),
      jsonb_build_object('heading', $$Invite the other view back$$, 'body', $$"What do you think about that?" keeps the conversation open instead of ending it with a closed statement.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອ່ອນລົງດ້ວຍ "I see it differently"$$, 'body', $$"I see it a bit differently" ຫຼື "I'm not sure I agree" ບໍ່ເຫັນດີຢ່າງຊັດເຈນໂດຍບໍ່ຟັງຄືການໂຈມຕີ.$$),
      jsonb_build_object('heading', $$ໃຫ້ເຫດຜົນທັນທີຫຼັງຈາກນັ້ນ$$, 'body', $$"...because [reason]" ປ່ຽນການບໍ່ເຫັນດີຈາກສ່ວນຕົວເປັນມີເຫດຜົນ — ຄົນຕອບຮັບເຫດຜົນໄດ້ດີກວ່າຄຳວ່າ "ບໍ່" ຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ເປີດໂອກາດໃຫ້ອີກຝ່າຍຕອບ$$, 'body', $$"What do you think about that?" ຮັກສາການສົນທະນາໃຫ້ເປີດ ແທນທີ່ຈະປິດດ້ວຍຄຳເວົ້າທີ່ຕັດອອກ.$$)
    ),
    array[$$Soften disagreement with phrases like "I see it differently"$$, $$Follow disagreement with a clear reason$$, $$Invite a response to keep the discussion open$$],
    array[$$ອ່ອນການບໍ່ເຫັນດີດ້ວຍ "I see it differently"$$, $$ຕາມດ້ວຍເຫດຜົນທີ່ຊັດເຈນ$$, $$ເປີດໂອກາດໃຫ້ອີກຝ່າຍຕອບເພື່ອສືບຕໍ່ການສົນທະນາ$$],
    4, false, 42
  ),
  (
    $$practice-listening-with-songs-and-podcasts$$,
    $$Practice listening with songs and podcasts$$,
    $$ຝຶກຟັງດ້ວຍເພງ ແລະ ພອດແຄສ$$,
    $$Enjoyable audio you actually want to listen to builds the habit better than boring textbook drills.$$,
    $$ສຽງທີ່ມ່ວນ ແລະ ຢາກຟັງແທ້ ສ້າງນິໄສໄດ້ດີກວ່າແບບຝຶກຫັດປຶ້ມທີ່ໜ້າເບື່ອ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick content slightly above your level$$, 'body', $$You should understand most of it but still learn new words — content that's too easy or too hard both stall progress.$$),
      jsonb_build_object('heading', $$Listen twice — once free, once with lyrics or transcript$$, 'body', $$First listen for the general idea, then listen again with the text in front of you to catch what you missed.$$),
      jsonb_build_object('heading', $$Collect a few new phrases each time$$, 'body', $$Write down two or three new words or phrases per session instead of trying to catch every single word — small, steady gains add up.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກເນື້ອຫາທີ່ຍາກກວ່າລະດັບໜ້ອຍໜຶ່ງ$$, 'body', $$ຄວນເຂົ້າໃຈສ່ວນຫຼາຍແຕ່ຍັງໄດ້ຮຽນຄຳໃໝ່ — ເນື້ອຫາທີ່ງ່າຍ ຫຼືຍາກເກີນໄປເຮັດໃຫ້ຄວາມກ້າວໜ້າຢຸດຊະງັກ.$$),
      jsonb_build_object('heading', $$ຟັງສອງຄັ້ງ — ຄັ້ງທຳອິດເປົ່າ ຄັ້ງທີສອງມີບົດ$$, 'body', $$ຟັງຄັ້ງທຳອິດເພື່ອຈັບໃຈຄວາມທົ່ວໄປ ແລ້ວຟັງອີກຄັ້ງພ້ອມບົດເວົ້າຢູ່ຕໍ່ໜ້າເພື່ອຈັບສ່ວນທີ່ພາດ.$$),
      jsonb_build_object('heading', $$ເກັບຄຳໃໝ່ສອງສາມຄຳຕໍ່ຄັ້ງ$$, 'body', $$ຂຽນຄຳ ຫຼືປະໂຫຍກໃໝ່ 2-3 ອັນຕໍ່ຄັ້ງ ແທນທີ່ຈະພະຍາຍາມຈັບທຸກຄຳ — ຄວາມກ້າວໜ້ານ້ອຍໆສະໝ່ຳສະເໝີສະສົມໄດ້.$$)
    ),
    array[$$Pick content slightly above your current level$$, $$Listen once freely, then once with text in front of you$$, $$Collect just a few new phrases each session$$],
    array[$$ເລືອກເນື້ອຫາທີ່ຍາກກວ່າລະດັບປັດຈຸບັນໜ້ອຍໜຶ່ງ$$, $$ຟັງເປົ່າກ່ອນ ແລ້ວຟັງອີກຄັ້ງພ້ອມບົດເວົ້າ$$, $$ເກັບຄຳໃໝ່ພຽງສອງສາມຄຳຕໍ່ຄັ້ງ$$],
    5, false, 43
  ),
  (
    $$build-vocabulary-with-word-families$$,
    $$Build vocabulary faster with word families$$,
    $$ສ້າງຄັງຄຳສັບໄວຂຶ້ນດ້ວຍ Word Family$$,
    $$Learning one word's noun, verb, and adjective forms together multiplies your vocabulary efficiently.$$,
    $$ຮຽນຄຳນາມ, ຄຳກິລິຍາ ແລະ ຄຳຄຸນນາມຂອງຄຳດຽວກັນພ້ອມກັນ ຊ່ວຍເພີ່ມຄັງຄຳສັບໄດ້ໄວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Learn all forms of one root$$, 'body', $$"Decide" (verb), "decision" (noun), "decisive" (adjective) — learning the family at once triples your usable vocabulary from one word.$$),
      jsonb_build_object('heading', $$Notice common endings$$, 'body', $$"-tion" often marks a noun, "-ly" often marks an adverb, "-ful" often marks an adjective. Spotting these patterns speeds up recognition.$$),
      jsonb_build_object('heading', $$Use each form in one sentence$$, 'body', $$Write one sentence using the verb, one using the noun, and one using the adjective form to lock in how each is actually used.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮຽນທຸກຮູບແບບຂອງຮາກຄຳດຽວ$$, 'body', $$"Decide" (ຄຳກິລິຍາ), "decision" (ຄຳນາມ), "decisive" (ຄຳຄຸນນາມ) — ຮຽນທັງກຸ່ມພ້ອມກັນເພີ່ມຄັງຄຳສັບໃຊ້ໄດ້ 3 ເທົ່າຈາກຄຳດຽວ.$$),
      jsonb_build_object('heading', $$ສັງເກດຄຳລົງທ້າຍທົ່ວໄປ$$, 'body', $$"-tion" ມັກເປັນຄຳນາມ, "-ly" ມັກເປັນຄຳວິເສດ, "-ful" ມັກເປັນຄຳຄຸນນາມ. ການສັງເກດຮູບແບບເຫຼົ່ານີ້ຊ່ວຍຈຳແນກໄດ້ໄວຂຶ້ນ.$$),
      jsonb_build_object('heading', $$ໃຊ້ແຕ່ລະຮູບແບບໃນປະໂຫຍກ$$, 'body', $$ຂຽນໜຶ່ງປະໂຫຍກໃຊ້ຄຳກິລິຍາ, ໜຶ່ງໃຊ້ຄຳນາມ ແລະ ໜຶ່ງໃຊ້ຄຳຄຸນນາມ ເພື່ອຈື່ວິທີໃຊ້ແທ້ຂອງແຕ່ລະຮູບແບບ.$$)
    ),
    array[$$Learn a word's noun, verb, and adjective forms together$$, $$Notice common endings that signal word type$$, $$Write one sentence for each form to lock it in$$],
    array[$$ຮຽນຄຳນາມ, ຄຳກິລິຍາ ແລະ ຄຳຄຸນນາມຂອງຄຳດຽວກັນພ້ອມກັນ$$, $$ສັງເກດຄຳລົງທ້າຍທົ່ວໄປທີ່ບອກປະເພດຄຳ$$, $$ຂຽນປະໂຫຍກສຳລັບແຕ່ລະຮູບແບບເພື່ອຈື່ໃຫ້ແໜ້ນ$$],
    4, false, 44
  ),
  (
    $$use-english-at-the-airport$$,
    $$Use English at the airport and on a plane$$,
    $$ໃຊ້ພາສາອັງກິດຢູ່ສະໜາມບິນ ແລະ ເທິງເຮືອບິນ$$,
    $$A handful of set phrases cover check-in, security, boarding, and in-flight requests.$$,
    $$ປະໂຫຍກທີ່ໃຊ້ໄດ້ຈິງພຽງບໍ່ຫຼາຍຄອບຄຸມການເຊັກອິນ, ຄວາມປອດໄພ, ຂຶ້ນເຮືອບິນ ແລະ ການຂໍໃນຖ້ຽວບິນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check-in and security phrases$$, 'body', $$"I'd like to check in for flight..." and "Do I need to remove my shoes?" cover the most common early-airport interactions.$$),
      jsonb_build_object('heading', $$Boarding and seating$$, 'body', $$"Which gate is this flight?" and "Excuse me, I think that's my seat" handle the boarding process smoothly.$$),
      jsonb_build_object('heading', $$In-flight requests$$, 'body', $$"Could I have some water, please?" and "Is the seat next to me taken?" are the most useful phrases once you're seated.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປະໂຫຍກເຊັກອິນ ແລະ ຄວາມປອດໄພ$$, 'body', $$"I'd like to check in for flight..." ແລະ "Do I need to remove my shoes?" ຄອບຄຸມການພົວພັນຕົ້ນໆທີ່ສະໜາມບິນທີ່ພົບເລື້ອຍ.$$),
      jsonb_build_object('heading', $$ຂຶ້ນເຮືອບິນ ແລະ ບ່ອນນັ່ງ$$, 'body', $$"Which gate is this flight?" ແລະ "Excuse me, I think that's my seat" ຈັດການຂະບວນການຂຶ້ນເຮືອບິນໄດ້ລຽບງ່າຍ.$$),
      jsonb_build_object('heading', $$ການຂໍໃນຖ້ຽວບິນ$$, 'body', $$"Could I have some water, please?" ແລະ "Is the seat next to me taken?" ເປັນປະໂຫຍກທີ່ເປັນປະໂຫຍດທີ່ສຸດເມື່ອນັ່ງແລ້ວ.$$)
    ),
    array[$$Learn set phrases for check-in and security$$, $$Practice boarding and seating phrases$$, $$Keep two or three in-flight request phrases ready$$],
    array[$$ຮຽນປະໂຫຍກມາດຕະຖານສຳລັບເຊັກອິນ ແລະ ຄວາມປອດໄພ$$, $$ຝຶກປະໂຫຍກຂຶ້ນເຮືອບິນ ແລະ ບ່ອນນັ່ງ$$, $$ກຽມສອງສາມປະໂຫຍກຂໍໃນຖ້ຽວບິນໄວ້ໃຊ້$$],
    5, false, 45
  ),
  (
    $$negotiate-price-when-shopping$$,
    $$Negotiate a price when shopping in English$$,
    $$ຕໍ່ລາຄາເມື່ອຊື້ເຄື່ອງເປັນພາສາອັງກິດ$$,
    $$Polite, indirect phrases work better than a blunt demand for a lower price.$$,
    $$ປະໂຫຍກສຸພາບ ແລະ ອ້ອມແອ້ມໄດ້ຜົນດີກວ່າການຂໍລົດລາຄາແບບກົງໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask if there's flexibility$$, 'body', $$"Is this price negotiable?" or "Is that your best price?" politely opens the door without demanding a discount.$$),
      jsonb_build_object('heading', $$Offer a specific counter$$, 'body', $$"Would you take [amount]?" gives a concrete number to respond to, which moves the conversation forward faster than a vague ask.$$),
      jsonb_build_object('heading', $$Be ready to walk away politely$$, 'body', $$"I'll think about it, thank you" lets you leave the conversation without pressure on either side.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມວ່າມີຄວາມຍືດຫຍຸ່ນບໍ່$$, 'body', $$"Is this price negotiable?" ຫຼື "Is that your best price?" ເປີດໂອກາດຢ່າງສຸພາບໂດຍບໍ່ຮຽກຮ້ອງສ່ວນຫຼຸດ.$$),
      jsonb_build_object('heading', $$ສະເໜີຕົວເລກຄືນ$$, 'body', $$"Would you take [amount]?" ໃຫ້ຕົວເລກຊັດເຈນໃຫ້ຕອບ ເຊິ່ງເຮັດໃຫ້ການສົນທະນາໄວຂຶ້ນກວ່າຄຳຂໍທີ່ບໍ່ຊັດເຈນ.$$),
      jsonb_build_object('heading', $$ພ້ອມຍ່າງອອກຢ່າງສຸພາບ$$, 'body', $$"I'll think about it, thank you" ຊ່ວຍໃຫ້ອອກຈາກການສົນທະນາໄດ້ໂດຍບໍ່ກົດດັນຝ່າຍໃດ.$$)
    ),
    array[$$Ask politely if the price is negotiable$$, $$Offer a specific counter-amount$$, $$Be ready to walk away politely if needed$$],
    array[$$ຖາມຢ່າງສຸພາບວ່າລາຄາຕໍ່ໄດ້ບໍ່$$, $$ສະເໜີຕົວເລກທີ່ຊັດເຈນຄືນ$$, $$ພ້ອມຍ່າງອອກຢ່າງສຸພາບຖ້າຈຳເປັນ$$],
    4, false, 46
  ),
  (
    $$write-a-short-cover-letter$$,
    $$Write a short, effective cover letter$$,
    $$ຂຽນຈົດໝາຍສະໝັກງານສັ້ນ ແລະ ໄດ້ຜົນ$$,
    $$A cover letter answers one question: why you, for this specific job, right now.$$,
    $$ຈົດໝາຍສະໝັກງານຕອບຄຳຖາມດຽວ: ເປັນຫຍັງຄວນເລືອກທ່ານ ສຳລັບຕຳແໜ່ງນີ້ ຕອນນີ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Open by naming the role$$, 'body', $$"I'm writing to apply for [position]" states your purpose in the very first line — no need for a long introduction.$$),
      jsonb_build_object('heading', $$Connect one experience to one requirement$$, 'body', $$Pick the single strongest match between your background and the job posting, and explain it in two or three sentences.$$),
      jsonb_build_object('heading', $$Close with clear enthusiasm$$, 'body', $$"I'd welcome the chance to discuss how I can contribute" ends on a confident, forward-looking note.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເປີດດ້ວຍການລະບຸຕຳແໜ່ງ$$, 'body', $$"I'm writing to apply for [position]" ບອກຈຸດປະສົງໃນປະໂຫຍກທຳອິດເລີຍ — ບໍ່ຕ້ອງແນະນຳຍາວ.$$),
      jsonb_build_object('heading', $$ເຊື່ອມປະສົບການໜຶ່ງກັບຄວາມຕ້ອງການໜຶ່ງ$$, 'body', $$ເລືອກຄວາມກົງກັນທີ່ໜັກແໜ້ນທີ່ສຸດລະຫວ່າງພື້ນຖານຂອງທ່ານ ແລະ ປະກາດຮັບສະໝັກ ແລ້ວອະທິບາຍໃນ 2-3 ປະໂຫຍກ.$$),
      jsonb_build_object('heading', $$ປິດທ້າຍດ້ວຍຄວາມກະຕືລືລົ້ນທີ່ຊັດເຈນ$$, 'body', $$"I'd welcome the chance to discuss how I can contribute" ຈົບດ້ວຍທ່າທີໝັ້ນໃຈ ແລະ ມຸ່ງໄປຂ້າງໜ້າ.$$)
    ),
    array[$$Name the specific role in your opening line$$, $$Connect your strongest experience to one job requirement$$, $$Close with a confident, forward-looking line$$],
    array[$$ລະບຸຕຳແໜ່ງງານໃນປະໂຫຍກເປີດ$$, $$ເຊື່ອມປະສົບການທີ່ໜັກແໜ້ນທີ່ສຸດກັບຄວາມຕ້ອງການໜຶ່ງ$$, $$ປິດທ້າຍດ້ວຍປະໂຫຍກທີ່ໝັ້ນໃຈ ແລະ ມຸ່ງໄປຂ້າງໜ້າ$$],
    5, false, 47
  ),
  (
    $$common-idioms-for-daily-life$$,
    $$Common idioms for daily life, explained simply$$,
    $$ສຳນວນທົ່ວໄປໃນຊີວິດປະຈຳວັນ ອະທິບາຍແບບງ່າຍ$$,
    $$Idioms don't translate word for word — learn the meaning and situation together.$$,
    $$ສຳນວນແປຄຳຕໍ່ຄຳບໍ່ໄດ້ — ຮຽນຄວາມໝາຍ ແລະ ສະຖານະການໄປພ້ອມກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"Break the ice"$$, 'body', $$Means to say or do something to relax people in an awkward first meeting: "He told a joke to break the ice."$$),
      jsonb_build_object('heading', $$"Piece of cake"$$, 'body', $$Means something very easy: "Don't worry, the test was a piece of cake." It has nothing to do with actual cake.$$),
      jsonb_build_object('heading', $$Learn a few at a time, in context$$, 'body', $$Pick three idioms a week from something you're reading or watching, and write the situation where you heard it, not just a definition.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"Break the ice"$$, 'body', $$ໝາຍເຖິງການເວົ້າ ຫຼືເຮັດບາງຢ່າງເພື່ອຜ່ອນຄາຍບັນຍາກາດອຶດອັດຕອນພົບກັນຄັ້ງທຳອິດ: "He told a joke to break the ice."$$),
      jsonb_build_object('heading', $$"Piece of cake"$$, 'body', $$ໝາຍເຖິງສິ່ງທີ່ງ່າຍຫຼາຍ: "Don't worry, the test was a piece of cake." ບໍ່ກ່ຽວຫຍັງກັບເຂົ້າໜົມແທ້.$$),
      jsonb_build_object('heading', $$ຮຽນເທື່ອລະໜ້ອຍ ໃນບໍລິບົດ$$, 'body', $$ເລືອກ 3 ສຳນວນຕໍ່ອາທິດຈາກສິ່ງທີ່ອ່ານ ຫຼືເບິ່ງ ແລະ ຂຽນສະຖານະການທີ່ໄດ້ຍິນ ບໍ່ແມ່ນແຕ່ຄຳນິຍາມ.$$)
    ),
    array[$$Idioms carry meaning beyond the literal words$$, $$"Piece of cake" simply means very easy$$, $$Learn a few idioms a week in real context$$],
    array[$$ສຳນວນມີຄວາມໝາຍນອກເໜືອຄຳແປກົງໆ$$, $$"Piece of cake" ໝາຍເຖິງງ່າຍຫຼາຍ$$, $$ຮຽນສຳນວນສອງສາມອັນຕໍ່ອາທິດໃນບໍລິບົດຈິງ$$],
    4, false, 48
  ),
  (
    $$talk-about-the-weather-small-talk$$,
    $$Talk about the weather as a small-talk starter$$,
    $$ເວົ້າກ່ຽວກັບອາກາດເປັນຫົວຂໍ້ເລີ່ມການລົມ$$,
    $$Weather talk is a safe, universal opener that almost never causes offense.$$,
    $$ການລົມເລື່ອງອາກາດເປັນຫົວຂໍ້ເລີ່ມທີ່ປອດໄພ ແລະ ໃຊ້ໄດ້ທົ່ວໄປ ບໍ່ເຄີຍເຮັດໃຫ້ໃຜຂຸ່ນເຄືອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Simple observation openers$$, 'body', $$"It's so hot today, isn't it?" or "Looks like rain later" are easy, low-pressure ways to start a conversation with anyone.$$),
      jsonb_build_object('heading', $$Use it as a bridge to more$$, 'body', $$Weather talk usually leads naturally into a real conversation — "Yeah, terrible for my commute" opens the door to more.$$),
      jsonb_build_object('heading', $$"Isn't it?" tag questions invite a reply$$, 'body', $$Adding "isn't it?" or "right?" at the end of a statement invites the other person to respond, keeping the exchange two-way.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄຳເປີດແບບສັງເກດງ່າຍໆ$$, 'body', $$"It's so hot today, isn't it?" ຫຼື "Looks like rain later" ເປັນວິທີເລີ່ມການລົມກັບໃຜກໍ່ໄດ້ ແບບງ່າຍ ແລະ ບໍ່ກົດດັນ.$$),
      jsonb_build_object('heading', $$ໃຊ້ເປັນຂົວເຊື່ອມໄປສູ່ຫົວຂໍ້ອື່ນ$$, 'body', $$ການລົມເລື່ອງອາກາດມັກນຳໄປສູ່ການສົນທະນາຈິງແບບທຳມະຊາດ — "Yeah, terrible for my commute" ເປີດປະຕູໄປສູ່ຫົວຂໍ້ອື່ນ.$$),
      jsonb_build_object('heading', $$ຄຳຖາມ Tag "Isn't it?" ຊວນໃຫ້ຕອບ$$, 'body', $$ການເພີ່ມ "isn't it?" ຫຼື "right?" ທ້າຍປະໂຫຍກ ຊວນໃຫ້ອີກຝ່າຍຕອບ ຮັກສາການແລກປ່ຽນໃຫ້ເປັນສອງທາງ.$$)
    ),
    array[$$Weather observations are a safe universal opener$$, $$They naturally bridge into deeper conversation$$, $$Tag questions like "isn't it?" invite a reply$$],
    array[$$ການສັງເກດອາກາດເປັນຄຳເປີດທີ່ປອດໄພ ແລະ ໃຊ້ໄດ້ທົ່ວໄປ$$, $$ນຳໄປສູ່ການສົນທະນາທີ່ເລິກກວ່າແບບທຳມະຊາດ$$, $$ຄຳຖາມ tag ເຊັ່ນ "isn't it?" ຊວນໃຫ້ຕອບ$$],
    3, false, 49
  ),
  (
    $$ask-clarifying-questions-in-a-meeting$$,
    $$Ask clarifying questions in a meeting$$,
    $$ຖາມຄຳຖາມເພື່ອຄວາມຊັດເຈນໃນກອງປະຊຸມ$$,
    $$Asking a good clarifying question makes you look engaged, not confused.$$,
    $$ການຖາມຄຳຖາມເພື່ອຄວາມຊັດເຈນທີ່ດີ ເຮັດໃຫ້ເບິ່ງມີສ່ວນຮ່ວມ ບໍ່ແມ່ນສັບສົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask before agreeing$$, 'body', $$"Just to make sure I understand — are we saying...?" confirms before commitment, which prevents costly misunderstandings later.$$),
      jsonb_build_object('heading', $$Ask for the reason behind a decision$$, 'body', $$"Could you help me understand why we're going with this approach?" is a professional, non-confrontational way to probe reasoning.$$),
      jsonb_build_object('heading', $$Summarize to confirm your own understanding$$, 'body', $$"So to summarize, we'll do X by Friday, is that right?" ends the discussion with a shared, confirmed understanding.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມກ່ອນຕົກລົງເຫັນດີ$$, 'body', $$"Just to make sure I understand — are we saying...?" ຢືນຢັນກ່ອນຕົກລົງ ເຊິ່ງປ້ອງກັນຄວາມເຂົ້າໃຈຜິດທີ່ຄ່າໃຊ້ຈ່າຍສູງພາຍຫຼັງ.$$),
      jsonb_build_object('heading', $$ຖາມເຫດຜົນເບື້ອງຫຼັງການຕັດສິນໃຈ$$, 'body', $$"Could you help me understand why we're going with this approach?" ເປັນວິທີເປັນມືອາຊີບ ແລະ ບໍ່ຂັດແຍ້ງໃນການສືບຫາເຫດຜົນ.$$),
      jsonb_build_object('heading', $$ສະຫຼຸບເພື່ອຢືນຢັນຄວາມເຂົ້າໃຈ$$, 'body', $$"So to summarize, we'll do X by Friday, is that right?" ຈົບການສົນທະນາດ້ວຍຄວາມເຂົ້າໃຈຮ່ວມກັນທີ່ຢືນຢັນແລ້ວ.$$)
    ),
    array[$$Ask a clarifying question before agreeing to something$$, $$It's professional to ask for the reasoning behind a decision$$, $$Summarize at the end to confirm shared understanding$$],
    array[$$ຖາມເພື່ອຄວາມຊັດເຈນກ່ອນຕົກລົງເຫັນດີ$$, $$ການຖາມເຫດຜົນເບື້ອງຫຼັງການຕັດສິນໃຈເປັນເລື່ອງເປັນມືອາຊີບ$$, $$ສະຫຼຸບທ້າຍເພື່ອຢືນຢັນຄວາມເຂົ້າໃຈຮ່ວມກັນ$$],
    4, false, 50
  ),
  (
    $$use-conditional-sentences$$,
    $$Use conditional sentences: if I were, if it rains$$,
    $$ໃຊ້ປະໂຫຍກເງື່ອນໄຂ: if I were, if it rains$$,
    $$Different "if" structures signal how likely or real a situation is.$$,
    $$ໂຄງສ້າງ "if" ທີ່ຕ່າງກັນ ບອກວ່າສະຖານະການໜ້າຈະເປັນໄປໄດ້ ຫຼືເປັນຈິງແທ້ໆປານໃດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Real possibility: if + present, will + verb$$, 'body', $$"If it rains, we'll stay home" describes a real, likely future possibility using simple present in the if-clause.$$),
      jsonb_build_object('heading', $$Unreal present: if + past, would + verb$$, 'body', $$"If I were rich, I would travel more" imagines something not true now — note "were," not "was," for all subjects here.$$),
      jsonb_build_object('heading', $$Past regret: if + past perfect, would have$$, 'body', $$"If I had studied, I would have passed" talks about a past that can't be changed — a common pattern for regrets.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄວາມເປັນໄປໄດ້ຈິງ: if + present, will + verb$$, 'body', $$"If it rains, we'll stay home" ອະທິບາຍຄວາມເປັນໄປໄດ້ໃນອະນາຄົດທີ່ແທ້ຈິງ ໂດຍໃຊ້ simple present ໃນປະໂຫຍກ if.$$),
      jsonb_build_object('heading', $$ບໍ່ຈິງໃນປັດຈຸບັນ: if + past, would + verb$$, 'body', $$"If I were rich, I would travel more" ຈິນຕະນາການສິ່ງທີ່ບໍ່ຈິງໃນປັດຈຸບັນ — ໃຊ້ "were" ບໍ່ແມ່ນ "was" ກັບທຸກຄຳນາມໃນນີ້.$$),
      jsonb_build_object('heading', $$ຄວາມເສຍໃຈໃນອະດີດ: if + past perfect, would have$$, 'body', $$"If I had studied, I would have passed" ເວົ້າກ່ຽວກັບອະດີດທີ່ປ່ຽນບໍ່ໄດ້ — ຮູບແບບທົ່ວໄປສຳລັບຄວາມເສຍໃຈ.$$)
    ),
    array[$$"If it rains" describes a real, likely future situation$$, $$"If I were" describes something imaginary, not true now$$, $$"If I had" describes an unchangeable past regret$$],
    array[$$"If it rains" ອະທິບາຍສະຖານະການອະນາຄົດທີ່ເປັນໄປໄດ້ຈິງ$$, $$"If I were" ອະທິບາຍສິ່ງທີ່ຈິນຕະນາການ ບໍ່ຈິງຕອນນີ້$$, $$"If I had" ອະທິບາຍຄວາມເສຍໃຈໃນອະດີດທີ່ປ່ຽນບໍ່ໄດ້$$],
    5, false, 51
  ),
  (
    $$practice-reading-english-news-headlines$$,
    $$Practice reading English news headlines$$,
    $$ຝຶກອ່ານຫົວຂ່າວພາສາອັງກິດ$$,
    $$Headlines use a special shortened grammar — learn the pattern and they become much easier to read.$$,
    $$ຫົວຂ່າວໃຊ້ໄວຍະກອນແບບຫຍໍ້ພິເສດ — ຮຽນຮູບແບບແລ້ວອ່ານງ່າຍຂຶ້ນຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Headlines often drop small words$$, 'body', $$"Company Announces New Product" drops "a" and uses present tense even for past events — this is normal headline style, not an error.$$),
      jsonb_build_object('heading', $$Read the first paragraph for the real tense$$, 'body', $$The article's first sentence usually clarifies the actual timing that the headline simplified away.$$),
      jsonb_build_object('heading', $$Build a habit of five headlines a day$$, 'body', $$Skim five headlines daily from a real news site without reading the full article — pattern recognition builds up quickly this way.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫົວຂ່າວມັກຕັດຄຳສັບນ້ອຍໆອອກ$$, 'body', $$"Company Announces New Product" ຕັດ "a" ອອກ ແລະ ໃຊ້ present tense ແມ່ນແຕ່ກັບເຫດການທີ່ຜ່ານມາແລ້ວ — ນີ້ເປັນຮູບແບບຫົວຂ່າວປົກກະຕິ ບໍ່ແມ່ນຄວາມຜິດພາດ.$$),
      jsonb_build_object('heading', $$ອ່ານຫຍໍ້ໜ້າທຳອິດເພື່ອຮູ້ Tense ແທ້ຈິງ$$, 'body', $$ປະໂຫຍກທຳອິດຂອງບົດຄວາມມັກອະທິບາຍເວລາແທ້ຈິງທີ່ຫົວຂ່າວຫຍໍ້ອອກໄປ.$$),
      jsonb_build_object('heading', $$ສ້າງນິໄສອ່ານ 5 ຫົວຂ່າວຕໍ່ວັນ$$, 'body', $$ອ່ານຜ່ານ 5 ຫົວຂ່າວທຸກມື້ຈາກເວັບຂ່າວຈິງ ໂດຍບໍ່ຕ້ອງອ່ານບົດຄວາມເຕັມ — ການຈຳແນກຮູບແບບຈະດີຂຶ້ນໄວດ້ວຍວິທີນີ້.$$)
    ),
    array[$$Headlines drop small words and use simplified tense$$, $$The first paragraph reveals the real timing$$, $$Skim five headlines daily to build pattern recognition$$],
    array[$$ຫົວຂ່າວຕັດຄຳສັບນ້ອຍ ແລະ ໃຊ້ tense ແບບຫຍໍ້$$, $$ຫຍໍ້ໜ້າທຳອິດເປີດເຜີຍເວລາແທ້ຈິງ$$, $$ອ່ານຜ່ານ 5 ຫົວຂ່າວທຸກມື້ເພື່ອສ້າງການຈຳແນກຮູບແບບ$$],
    4, false, 52
  ),
  (
    $$talk-about-hobbies-and-interests$$,
    $$Talk about your hobbies and interests$$,
    $$ເລົ່າກ່ຽວກັບຄວາມມ່ວນ ແລະ ຄວາມສົນໃຈຂອງທ່ານ$$,
    $$Go beyond naming the hobby — explain why you enjoy it for a more memorable conversation.$$,
    $$ບໍ່ພຽງແຕ່ບອກຊື່ຄວາມມ່ວນ — ອະທິບາຍວ່າເປັນຫຍັງມ່ວນ ເພື່ອການສົນທະນາທີ່ຈື່ໄດ້ຫຼາຍກວ່າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name it, then explain why$$, 'body', $$"I love cooking because it helps me relax after work" is far more interesting than just "I like cooking."$$),
      jsonb_build_object('heading', $$Ask a follow-up back$$, 'body', $$"What about you, do you have any hobbies?" keeps the conversation balanced instead of only talking about yourself.$$),
      jsonb_build_object('heading', $$Use frequency words naturally$$, 'body', $$"I usually go running on weekends" or "I rarely have time to paint" — frequency words add useful detail to any hobby talk.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກຊື່ ແລ້ວອະທິບາຍເຫດຜົນ$$, 'body', $$"I love cooking because it helps me relax after work" ໜ້າສົນໃຈກວ່າ "I like cooking" ຢ່າງດຽວຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຖາມຄືນອີກຝ່າຍ$$, 'body', $$"What about you, do you have any hobbies?" ຮັກສາການສົນທະນາໃຫ້ສົມດຸນ ບໍ່ແມ່ນເວົ້າແຕ່ເລື່ອງຕົນເອງ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຄຳບອກຄວາມຖີ່ຢ່າງທຳມະຊາດ$$, 'body', $$"I usually go running on weekends" ຫຼື "I rarely have time to paint" — ຄຳບອກຄວາມຖີ່ເພີ່ມລາຍລະອຽດທີ່ເປັນປະໂຫຍດ.$$)
    ),
    array[$$Explain why you enjoy a hobby, not just what it is$$, $$Ask a follow-up question to balance the conversation$$, $$Use frequency words for natural extra detail$$],
    array[$$ອະທິບາຍເຫດຜົນທີ່ມ່ວນ ບໍ່ແມ່ນແຕ່ຊື່ຄວາມມ່ວນ$$, $$ຖາມຄືນເພື່ອຄວາມສົມດຸນຂອງການສົນທະນາ$$, $$ໃຊ້ຄຳບອກຄວາມຖີ່ເພື່ອລາຍລະອຽດເພີ່ມແບບທຳມະຊາດ$$],
    3, false, 53
  ),
  (
    $$use-used-to-and-would-for-past-habits$$,
    $$Use "used to" and "would" for past habits$$,
    $$ໃຊ້ "used to" ແລະ "would" ສຳລັບນິໄສໃນອະດີດ$$,
    $$Both describe repeated past actions, but only one works for past states.$$,
    $$ທັງສອງອະທິບາຍການກະທຳຊ້ຳໃນອະດີດ ແຕ່ອັນດຽວທີ່ໃຊ້ໄດ້ກັບສະຖານະໃນອະດີດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"Used to" works for habits and states$$, 'body', $$"I used to live in Vientiane" and "I used to play football" both work — "used to" covers both states and actions.$$),
      jsonb_build_object('heading', $$"Would" only works for repeated actions$$, 'body', $$"I would play football every weekend" works, but "I would live in Vientiane" does not — "would" needs a repeated action, not a state.$$),
      jsonb_build_object('heading', $$Both signal "not anymore"$$, 'body', $$Both phrases imply the habit or state is finished now — for a habit that's still ongoing, use simple present instead.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"Used to" ໃຊ້ໄດ້ທັງນິໄສ ແລະ ສະຖານະ$$, 'body', $$"I used to live in Vientiane" ແລະ "I used to play football" ໃຊ້ໄດ້ທັງສອງ — "used to" ຄອບຄຸມທັງສະຖານະ ແລະ ການກະທຳ.$$),
      jsonb_build_object('heading', $$"Would" ໃຊ້ໄດ້ແຕ່ກັບການກະທຳຊ້ຳ$$, 'body', $$"I would play football every weekend" ໃຊ້ໄດ້ ແຕ່ "I would live in Vientiane" ໃຊ້ບໍ່ໄດ້ — "would" ຕ້ອງການການກະທຳຊ້ຳ ບໍ່ແມ່ນສະຖານະ.$$),
      jsonb_build_object('heading', $$ທັງສອງບອກວ່າ "ບໍ່ອີກແລ້ວ"$$, 'body', $$ທັງສອງປະໂຫຍກສະແດງວ່ານິໄສ ຫຼືສະຖານະນັ້ນຈົບແລ້ວ — ສຳລັບນິໄສທີ່ຍັງດຳເນີນຢູ່ ໃຫ້ໃຊ້ simple present ແທນ.$$)
    ),
    array[$$"Used to" works for both past states and actions$$, $$"Would" only works for repeated past actions$$, $$Both imply the habit is finished now, not ongoing$$],
    array[$$"Used to" ໃຊ້ໄດ້ທັງສະຖານະ ແລະ ການກະທຳໃນອະດີດ$$, $$"Would" ໃຊ້ໄດ້ແຕ່ກັບການກະທຳຊ້ຳໃນອະດີດ$$, $$ທັງສອງບອກວ່ານິໄສນັ້ນຈົບແລ້ວ ບໍ່ແມ່ນຍັງດຳເນີນຢູ່$$],
    4, false, 54
  ),
  (
    $$understand-common-english-abbreviations$$,
    $$Understand common English abbreviations: ASAP, FYI, ETA$$,
    $$ເຂົ້າໃຈຄຳຫຍໍ້ພາສາອັງກິດທົ່ວໄປ: ASAP, FYI, ETA$$,
    $$Workplace messages are full of abbreviations — learning the common ones prevents confusion.$$,
    $$ຂໍ້ຄວາມທາງວຽກເຕັມໄປດ້ວຍຄຳຫຍໍ້ — ການຮຽນຄຳທົ່ວໄປຊ່ວຍປ້ອງກັນຄວາມສັບສົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Work essentials$$, 'body', $$ASAP (as soon as possible), FYI (for your information), and ETA (estimated time of arrival) appear constantly in work messages.$$),
      jsonb_build_object('heading', $$Scheduling ones$$, 'body', $$RSVP (please respond), TBD (to be determined), and OOO (out of office) show up often in calendars and emails.$$),
      jsonb_build_object('heading', $$Use them, don't overuse them$$, 'body', $$These are useful in casual or internal messages, but spell things out in formal writing to a client or someone outside your team.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄຳຫຍໍ້ຈຳເປັນທາງວຽກ$$, 'body', $$ASAP (ໄວທີ່ສຸດເທົ່າທີ່ຈະໄວໄດ້), FYI (ແຈ້ງໃຫ້ຮູ້) ແລະ ETA (ເວລາຄາດວ່າຈະຮອດ) ພົບເລື້ອຍໃນຂໍ້ຄວາມທາງວຽກ.$$),
      jsonb_build_object('heading', $$ຄຳຫຍໍ້ກ່ຽວກັບການນັດໝາຍ$$, 'body', $$RSVP (ກະລຸນາຕອບຮັບ), TBD (ຍັງບໍ່ກຳນົດ) ແລະ OOO (ບໍ່ຢູ່ອອຟຟິດ) ພົບເລື້ອຍໃນປະຕິທິນ ແລະ ອີເມວ.$$),
      jsonb_build_object('heading', $$ໃຊ້ໄດ້ ແຕ່ບໍ່ຄວນໃຊ້ຫຼາຍເກີນໄປ$$, 'body', $$ຄຳຫຍໍ້ເຫຼົ່ານີ້ໃຊ້ໄດ້ໃນຂໍ້ຄວາມບໍ່ທາງການ ຫຼືພາຍໃນທີມ ແຕ່ຄວນຂຽນເຕັມໃນເອກະສານທາງການເຖິງລູກຄ້າ ຫຼືຄົນນອກທີມ.$$)
    ),
    array[$$Learn ASAP, FYI, and ETA — the most common ones$$, $$RSVP, TBD, and OOO appear often in scheduling$$, $$Spell things out fully in formal writing instead$$],
    array[$$ຮຽນ ASAP, FYI ແລະ ETA — ຄຳຫຍໍ້ທົ່ວໄປທີ່ສຸດ$$, $$RSVP, TBD ແລະ OOO ພົບເລື້ອຍໃນການນັດໝາຍ$$, $$ຂຽນເຕັມໃນເອກະສານທາງການແທນການໃຊ້ຄຳຫຍໍ້$$],
    3, false, 55
  ),
  (
    $$handle-a-customer-service-call$$,
    $$Handle a customer service call in English$$,
    $$ຮັບມືການໂທຫາຝ່າຍບໍລິການລູກຄ້າເປັນພາສາອັງກິດ$$,
    $$State your issue clearly first, then answer their verification questions patiently.$$,
    $$ບອກບັນຫາໃຫ້ຊັດເຈນກ່ອນ ແລ້ວຕອບຄຳຖາມຢືນຢັນຕົວຕົນຢ່າງອົດທົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$State the issue in one sentence$$, 'body', $$"I'm calling because my order hasn't arrived" gets straight to the point, which most agents appreciate right away.$$),
      jsonb_build_object('heading', $$Have your details ready$$, 'body', $$Order numbers, account names, and dates are usually needed early in the call — have them written down before you dial.$$),
      jsonb_build_object('heading', $$Ask for next steps clearly$$, 'body', $$"What happens next?" and "When can I expect a resolution?" make sure you leave the call knowing exactly what to expect.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກບັນຫາໃນໜຶ່ງປະໂຫຍກ$$, 'body', $$"I'm calling because my order hasn't arrived" ບອກໃຈຄວາມທັນທີ ເຊິ່ງພະນັກງານສ່ວນຫຼາຍມັກທັນທີ.$$),
      jsonb_build_object('heading', $$ກຽມລາຍລະອຽດໄວ້ໃຫ້ພ້ອມ$$, 'body', $$ເລກຄຳສັ່ງຊື້, ຊື່ບັນຊີ ແລະ ວັນທີ ມັກຕ້ອງການແຕ່ຕົ້ນການໂທ — ຂຽນໄວ້ພ້ອມກ່ອນໂທ.$$),
      jsonb_build_object('heading', $$ຖາມຂັ້ນຕອນຕໍ່ໄປໃຫ້ຊັດເຈນ$$, 'body', $$"What happens next?" ແລະ "When can I expect a resolution?" ຊ່ວຍໃຫ້ຮູ້ຊັດເຈນວ່າຈະເກີດຫຍັງຕໍ່ໄປກ່ອນວາງສາຍ.$$)
    ),
    array[$$State your issue clearly in one sentence upfront$$, $$Have order numbers and details ready before calling$$, $$Ask clearly what happens next before ending the call$$],
    array[$$ບອກບັນຫາຊັດເຈນໃນໜຶ່ງປະໂຫຍກຕັ້ງແຕ່ຕົ້ນ$$, $$ກຽມເລກຄຳສັ່ງຊື້ ແລະ ລາຍລະອຽດກ່ອນໂທ$$, $$ຖາມຂັ້ນຕອນຕໍ່ໄປໃຫ້ຊັດເຈນກ່ອນວາງສາຍ$$],
    4, false, 56
  ),
  (
    $$polite-disagreement-in-writing$$,
    $$Use polite disagreement in professional writing$$,
    $$ໃຊ້ການບໍ່ເຫັນດີຢ່າງສຸພາບໃນການຂຽນທາງວຽກ$$,
    $$Written disagreement needs extra softening since tone of voice can't help soften it.$$,
    $$ການບໍ່ເຫັນດີແບບຂຽນຕ້ອງອ່ອນລົງກວ່າເວົ້າ ເພາະບໍ່ມີນ້ຳສຽງຊ່ວຍປັບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start by acknowledging their point$$, 'body', $$"I appreciate this perspective, and I'd like to offer another angle" opens disagreement without sounding dismissive.$$),
      jsonb_build_object('heading', $$Use questions instead of flat statements$$, 'body', $$"Have we considered...?" reads softer in writing than "This is wrong because...", even when making the same point.$$),
      jsonb_build_object('heading', $$Reread before sending$$, 'body', $$Written words carry no tone of voice, so what felt fine in your head can read harsh on screen — reread once before you hit send.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍການຮັບຮູ້ຄວາມຄິດເຫັນເຂົາ$$, 'body', $$"I appreciate this perspective, and I'd like to offer another angle" ເປີດການບໍ່ເຫັນດີໂດຍບໍ່ຟັງຄືການປະຕິເສດ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຄຳຖາມແທນປະໂຫຍກທີ່ຕັດອອກ$$, 'body', $$"Have we considered...?" ອ່ານອ່ອນໂຍນກວ່າ "This is wrong because..." ແມ່ນແຕ່ຈະສື່ຄວາມໝາຍດຽວກັນ.$$),
      jsonb_build_object('heading', $$ອ່ານທົບທວນກ່ອນສົ່ງ$$, 'body', $$ຂໍ້ຄວາມທີ່ຂຽນບໍ່ມີນ້ຳສຽງ ສະນັ້ນສິ່ງທີ່ຮູ້ສຶກໂອເຄໃນຫົວ ອາດອ່ານແຂງເທິງໜ້າຈໍ — ອ່ານທົບທວນກ່ອນກົດສົ່ງ.$$)
    ),
    array[$$Acknowledge their point before disagreeing in writing$$, $$Use questions instead of flat, blunt statements$$, $$Reread your message once before sending it$$],
    array[$$ຮັບຮູ້ຄວາມຄິດເຫັນເຂົາກ່ອນບໍ່ເຫັນດີໃນການຂຽນ$$, $$ໃຊ້ຄຳຖາມແທນປະໂຫຍກທີ່ຕັດອອກກົງໆ$$, $$ອ່ານທົບທວນຂໍ້ຄວາມກ່ອນສົ່ງ$$],
    4, false, 57
  ),
  (
    $$describe-symptoms-to-a-doctor$$,
    $$Describe symptoms to a doctor in English$$,
    $$ອະທິບາຍອາການເຈັບປ່ວຍໃຫ້ໝໍຟັງເປັນພາສາອັງກິດ$$,
    $$Clear, specific symptom language helps you get accurate care faster.$$,
    $$ພາສາອະທິບາຍອາການທີ່ຊັດເຈນ ແລະ ສະເພາະ ຊ່ວຍໃຫ້ໄດ້ຮັບການດູແລທີ່ຖືກຕ້ອງໄວຂຶ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name the symptom and location$$, 'body', $$"I have a sharp pain in my lower back" is far more useful to a doctor than "I don't feel good."$$),
      jsonb_build_object('heading', $$Give the timeline$$, 'body', $$"It started three days ago and has gotten worse" tells the doctor how the symptom has changed over time, which matters for diagnosis.$$),
      jsonb_build_object('heading', $$Use a 1-to-10 scale for pain$$, 'body', $$"It's about a 7 out of 10" gives the doctor a quick, standard way to gauge severity without needing more description.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບອກອາການ ແລະ ຕຳແໜ່ງ$$, 'body', $$"I have a sharp pain in my lower back" ເປັນປະໂຫຍດຕໍ່ໝໍຫຼາຍກວ່າ "I don't feel good."$$),
      jsonb_build_object('heading', $$ບອກໄລຍະເວລາ$$, 'body', $$"It started three days ago and has gotten worse" ບອກໝໍວ່າອາການປ່ຽນແປງແນວໃດຕາມເວລາ ເຊິ່ງສຳຄັນຕໍ່ການວິນິດໄສ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຄະແນນ 1 ຫາ 10 ສຳລັບຄວາມເຈັບ$$, 'body', $$"It's about a 7 out of 10" ໃຫ້ໝໍວິທີວັດແທກຄວາມຮຸນແຮງແບບໄວ ແລະ ມາດຕະຖານໂດຍບໍ່ຕ້ອງອະທິບາຍເພີ່ມ.$$)
    ),
    array[$$Name the specific symptom and its exact location$$, $$Give a clear timeline of how it's changed$$, $$Use a 1-to-10 scale to describe pain quickly$$],
    array[$$ບອກອາການສະເພາະ ແລະ ຕຳແໜ່ງທີ່ແນ່ນອນ$$, $$ບອກໄລຍະເວລາທີ່ອາການປ່ຽນແປງຢ່າງຊັດເຈນ$$, $$ໃຊ້ຄະແນນ 1 ຫາ 10 ເພື່ອອະທິບາຍຄວາມເຈັບໄວ$$],
    4, false, 58
  ),
  (
    $$use-articles-a-an-the-correctly$$,
    $$Use articles a, an, and the correctly$$,
    $$ໃຊ້ Article a, an ແລະ the ໃຫ້ຖືກຕ້ອງ$$,
    $$"A/an" introduces something new, "the" refers to something already known to both speakers.$$,
    $$"A/an" ແນະນຳສິ່ງໃໝ່, "the" ອ້າງເຖິງສິ່ງທີ່ທັງສອງຝ່າຍຮູ້ຢູ່ແລ້ວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"A/an" for the first mention$$, 'body', $$"I saw a dog" introduces a dog for the first time — the listener doesn't know which dog yet.$$),
      jsonb_build_object('heading', $$"The" for something already known$$, 'body', $$"The dog was barking" refers back to that same specific dog both people now know about.$$),
      jsonb_build_object('heading', $$"An" before vowel sounds$$, 'body', $$Use "an" before a vowel sound, not just a vowel letter: "an hour" (silent h) but "a university" (sounds like "you").$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"A/an" ສຳລັບການກ່າວເຖິງຄັ້ງທຳອິດ$$, 'body', $$"I saw a dog" ແນະນຳໝາໂຕໜຶ່ງເປັນຄັ້ງທຳອິດ — ຜູ້ຟັງຍັງບໍ່ຮູ້ວ່າໝາໂຕໃດ.$$),
      jsonb_build_object('heading', $$"The" ສຳລັບສິ່ງທີ່ຮູ້ຢູ່ແລ້ວ$$, 'body', $$"The dog was barking" ອ້າງກັບໄປຫາໝາໂຕດຽວກັນທີ່ທັງສອງຄົນຮູ້ແລ້ວ.$$),
      jsonb_build_object('heading', $$"An" ໃຊ້ກັບສຽງສະຫຼະ$$, 'body', $$ໃຊ້ "an" ໜ້າສຽງສະຫຼະ ບໍ່ແມ່ນແຕ່ຕົວອັກສອນສະຫຼະ: "an hour" (h ບໍ່ອອກສຽງ) ແຕ່ "a university" (ອອກສຽງຄື "you").$$)
    ),
    array[$$Use "a/an" for the first mention of something$$, $$Use "the" for something already known to both people$$, $$"An" depends on the sound, not just the letter$$],
    array[$$ໃຊ້ "a/an" ສຳລັບການກ່າວເຖິງຄັ້ງທຳອິດ$$, $$ໃຊ້ "the" ສຳລັບສິ່ງທີ່ທັງສອງຝ່າຍຮູ້ຢູ່ແລ້ວ$$, $$"An" ຂຶ້ນກັບສຽງ ບໍ່ແມ່ນແຕ່ຕົວອັກສອນ$$],
    4, false, 59
  ),
  (
    $$common-prepositions-of-time-and-place$$,
    $$Common prepositions of time and place$$,
    $$ຄຳບຸບປະບົດເວລາ ແລະ ສະຖານທີ່ທົ່ວໄປ$$,
    $$"In, on, at" follow patterns — big-to-small for place, broad-to-specific for time.$$,
    $$"In, on, at" ຕາມຮູບແບບ — ໃຫຍ່ຫານ້ອຍສຳລັບສະຖານທີ່, ກວ້າງຫາສະເພາະສຳລັບເວລາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"In" for larger areas and months/years$$, 'body', $$"In Laos," "in the room," "in July," "in 2024" — use "in" for bigger spaces and longer time periods.$$),
      jsonb_build_object('heading', $$"On" for surfaces and specific days$$, 'body', $$"On the table," "on the street," "on Monday," "on July 5th" — use "on" for surfaces and exact days or dates.$$),
      jsonb_build_object('heading', $$"At" for exact points$$, 'body', $$"At the door," "at 5 o'clock," "at noon" — use "at" for a precise point in space or time, the most specific of the three.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"In" ສຳລັບພື້ນທີ່ໃຫຍ່ ແລະ ເດືອນ/ປີ$$, 'body', $$"In Laos," "in the room," "in July," "in 2024" — ໃຊ້ "in" ສຳລັບພື້ນທີ່ໃຫຍ່ ແລະ ໄລຍະເວລາທີ່ຍາວກວ່າ.$$),
      jsonb_build_object('heading', $$"On" ສຳລັບໜ້າພື້ນ ແລະ ວັນສະເພາະ$$, 'body', $$"On the table," "on the street," "on Monday," "on July 5th" — ໃຊ້ "on" ສຳລັບໜ້າພື້ນ ແລະ ວັນ ຫຼືວັນທີສະເພາະ.$$),
      jsonb_build_object('heading', $$"At" ສຳລັບຈຸດແນ່ນອນ$$, 'body', $$"At the door," "at 5 o'clock," "at noon" — ໃຊ້ "at" ສຳລັບຈຸດແນ່ນອນທັງພື້ນທີ່ ແລະ ເວລາ ສະເພາະທີ່ສຸດໃນສາມຄຳ.$$)
    ),
    array[$$"In" is for larger areas and longer time spans$$, $$"On" is for surfaces and specific days or dates$$, $$"At" is for an exact point in space or time$$],
    array[$$"In" ໃຊ້ກັບພື້ນທີ່ໃຫຍ່ ແລະ ໄລຍະເວລາຍາວ$$, $$"On" ໃຊ້ກັບໜ້າພື້ນ ແລະ ວັນ ຫຼືວັນທີສະເພາະ$$, $$"At" ໃຊ້ກັບຈຸດແນ່ນອນທັງພື້ນທີ່ ແລະ ເວລາ$$],
    4, false, 60
  ),
  (
    $$speak-without-translating-in-your-head$$,
    $$Practice speaking without translating in your head$$,
    $$ຝຶກເວົ້າໂດຍບໍ່ຕ້ອງແປໃນຫົວກ່ອນ$$,
    $$Thinking directly in short English phrases, without a translation step, makes speech faster and more natural.$$,
    $$ຄິດເປັນປະໂຫຍກອັງກິດສັ້ນໆໂດຍກົງ ໂດຍບໍ່ຜ່ານຂັ້ນຕອນແປ ເຮັດໃຫ້ເວົ້າໄວ ແລະ ທຳມະຊາດຂຶ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with fixed daily phrases$$, 'body', $$Attach English phrases directly to actions — say "I'm hungry" when you feel hungry, skipping the translation step entirely for common feelings.$$),
      jsonb_build_object('heading', $$Narrate simple actions silently$$, 'body', $$As you do everyday tasks, silently describe them in English: "I'm making coffee." This builds direct thinking without pressure to speak aloud.$$),
      jsonb_build_object('heading', $$Accept slower speech at first$$, 'body', $$Direct thinking feels slower initially than translating a sentence you already know. Speed comes naturally with repeated practice.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍປະໂຫຍກປະຈຳວັນຄົງທີ່$$, 'body', $$ຕິດປະໂຫຍກອັງກິດເຂົ້າກັບການກະທຳໂດຍກົງ — ເວົ້າ "I'm hungry" ເມື່ອຮູ້ສຶກຫິວ ຂ້າມຂັ້ນຕອນແປອອກໄປທັງໝົດສຳລັບຄວາມຮູ້ສຶກທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ບັນຍາຍການກະທຳງ່າຍໆໃນໃຈ$$, 'body', $$ຂະນະເຮັດວຽກປະຈຳວັນ ໃຫ້ບັນຍາຍໃນໃຈເປັນອັງກິດ: "I'm making coffee." ນີ້ສ້າງການຄິດໂດຍກົງໂດຍບໍ່ກົດດັນຕ້ອງເວົ້າອອກສຽງ.$$),
      jsonb_build_object('heading', $$ຍອມຮັບການເວົ້າຊ້າໃນຕອນທຳອິດ$$, 'body', $$ການຄິດໂດຍກົງຮູ້ສຶກຊ້າກວ່າການແປປະໂຫຍກທີ່ຮູ້ຢູ່ແລ້ວໃນຕອນທຳອິດ. ຄວາມໄວຈະມາເອງດ້ວຍການຝຶກຊ້ຳ.$$)
    ),
    array[$$Attach English phrases directly to common feelings and actions$$, $$Silently narrate simple daily tasks in English$$, $$Expect to feel slower at first — speed builds with practice$$],
    array[$$ຕິດປະໂຫຍກອັງກິດເຂົ້າກັບຄວາມຮູ້ສຶກ ແລະ ການກະທຳໂດຍກົງ$$, $$ບັນຍາຍວຽກປະຈຳວັນງ່າຍໆເປັນອັງກິດໃນໃຈ$$, $$ຍອມຮັບຄວາມຊ້າໃນຕອນທຳອິດ ຄວາມໄວຈະມາເອງດ້ວຍການຝຶກ$$],
    4, false, 61
  ),
  (
    $$write-a-thank-you-note$$,
    $$Write a genuine thank-you note in English$$,
    $$ຂຽນຄຳຂອບໃຈທີ່ຈິງໃຈເປັນພາສາອັງກິດ$$,
    $$Naming the specific thing you're grateful for makes a thank-you note feel real, not generic.$$,
    $$ການລະບຸສິ່ງສະເພາະທີ່ຂອບໃຈ ເຮັດໃຫ້ຄຳຂອບໃຈຮູ້ສຶກຈິງໃຈ ບໍ່ແມ່ນທົ່ວໄປ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name the specific thing$$, 'body', $$"Thank you for helping me prepare for the interview" is more meaningful than a plain "thank you for everything."$$),
      jsonb_build_object('heading', $$Mention the real impact$$, 'body', $$"It made a huge difference in how confident I felt" shows the effect, not just the act, which lands more warmly.$$),
      jsonb_build_object('heading', $$Close warmly and briefly$$, 'body', $$"Thanks again, it really meant a lot" is a short, warm closing that doesn't overstay its welcome.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸສິ່ງສະເພາະ$$, 'body', $$"Thank you for helping me prepare for the interview" ມີຄວາມໝາຍຫຼາຍກວ່າ "thank you for everything" ທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ບອກຜົນກະທົບຈິງ$$, 'body', $$"It made a huge difference in how confident I felt" ສະແດງຜົນກະທົບ ບໍ່ແມ່ນແຕ່ການກະທຳ ເຊິ່ງອົບອຸ່ນກວ່າ.$$),
      jsonb_build_object('heading', $$ປິດທ້າຍອົບອຸ່ນ ແລະ ສັ້ນ$$, 'body', $$"Thanks again, it really meant a lot" ເປັນການປິດທ້າຍສັ້ນ ແລະ ອົບອຸ່ນ ບໍ່ຍາວເກີນໄປ.$$)
    ),
    array[$$Name the specific thing you're thankful for$$, $$Mention the real impact it had on you$$, $$Keep the closing warm but brief$$],
    array[$$ລະບຸສິ່ງສະເພາະທີ່ຂອບໃຈ$$, $$ບອກຜົນກະທົບຈິງທີ່ໄດ້ຮັບ$$, $$ຮັກສາການປິດທ້າຍໃຫ້ອົບອຸ່ນແຕ່ສັ້ນ$$],
    3, false, 62
  ),
  (
    $$banking-and-prices-vocabulary$$,
    $$Essential English vocabulary for banking and prices$$,
    $$ຄຳສັບພາສາອັງກິດຈຳເປັນສຳລັບທະນາຄານ ແລະ ລາຄາ$$,
    $$A small, practical vocabulary set covers most banking and shopping conversations.$$,
    $$ຄັງຄຳສັບພາກປະຕິບັດນ້ອຍໆ ຄອບຄຸມການສົນທະນາທະນາຄານ ແລະ ຊື້ເຄື່ອງສ່ວນຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Banking basics$$, 'body', $$"Deposit," "withdraw," "balance," and "transfer" are the core words for most bank counter or app interactions.$$),
      jsonb_build_object('heading', $$Price and discount words$$, 'body', $$"Discount," "on sale," "receipt," and "refund" cover most everyday shopping situations you'll run into.$$),
      jsonb_build_object('heading', $$Practice with real receipts$$, 'body', $$Read an actual receipt or bank statement in English if you have one, matching the vocabulary to something concrete you already understand.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄຳສັບພື້ນຖານທະນາຄານ$$, 'body', $$"Deposit," "withdraw," "balance" ແລະ "transfer" ເປັນຄຳສັບຫຼັກສຳລັບການພົວພັນທະນາຄານ ຫຼືແອັບສ່ວນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຄຳສັບລາຄາ ແລະ ສ່ວນຫຼຸດ$$, 'body', $$"Discount," "on sale," "receipt" ແລະ "refund" ຄອບຄຸມສະຖານະການຊື້ເຄື່ອງປະຈຳວັນສ່ວນຫຼາຍທີ່ຈະພົບ.$$),
      jsonb_build_object('heading', $$ຝຶກກັບໃບບິນຈິງ$$, 'body', $$ອ່ານໃບບິນ ຫຼືໃບແຈ້ງຍອດທະນາຄານເປັນອັງກິດຖ້າມີ ຈັບຄູ່ຄຳສັບກັບສິ່ງທີ່ຈັບຕ້ອງໄດ້ ແລະ ເຂົ້າໃຈຢູ່ແລ້ວ.$$)
    ),
    array[$$Learn deposit, withdraw, balance, and transfer first$$, $$Discount, on sale, receipt, and refund cover shopping$$, $$Practice vocabulary against a real receipt or statement$$],
    array[$$ຮຽນ deposit, withdraw, balance ແລະ transfer ກ່ອນ$$, $$Discount, on sale, receipt ແລະ refund ຄອບຄຸມການຊື້ເຄື່ອງ$$, $$ຝຶກຄຳສັບກັບໃບບິນ ຫຼືໃບແຈ້ງຍອດຈິງ$$],
    4, false, 63
  ),
  (
    $$modal-verbs-for-possibility$$,
    $$Use modal verbs for possibility: might, could, may$$,
    $$ໃຊ້ Modal Verb ສຳລັບຄວາມເປັນໄປໄດ້: might, could, may$$,
    $$These three words let you express different levels of certainty about the future or a guess.$$,
    $$ສາມຄຳນີ້ຊ່ວຍສະແດງລະດັບຄວາມແນ່ໃຈທີ່ຕ່າງກັນກ່ຽວກັບອະນາຄົດ ຫຼືການເດົາ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$"Might" and "may" for uncertain possibility$$, 'body', $$"It might rain later" and "it may rain later" both express genuine uncertainty — roughly a 50/50 guess.$$),
      jsonb_build_object('heading', $$"Could" for a real possibility$$, 'body', $$"This could be a problem" points to a genuine possibility worth considering, often used to raise a concern gently.$$),
      jsonb_build_object('heading', $$None of these are strong promises$$, 'body', $$All three are softer than "will." Use them when you genuinely don't know, not when you're actually certain.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$"Might" ແລະ "may" ສຳລັບຄວາມເປັນໄປໄດ້ບໍ່ແນ່ນອນ$$, 'body', $$"It might rain later" ແລະ "it may rain later" ທັງສອງສະແດງຄວາມບໍ່ແນ່ນອນຈິງ — ປະມານ 50/50.$$),
      jsonb_build_object('heading', $$"Could" ສຳລັບຄວາມເປັນໄປໄດ້ຈິງ$$, 'body', $$"This could be a problem" ຊີ້ໃຫ້ເຫັນຄວາມເປັນໄປໄດ້ຈິງທີ່ຄວນພິຈາລະນາ ມັກໃຊ້ຍົກປະເດັນຢ່າງອ່ອນໂຍນ.$$),
      jsonb_build_object('heading', $$ບໍ່ແມ່ນຄຳສັນຍາທີ່ໜັກແໜ້ນ$$, 'body', $$ທັງສາມຄຳອ່ອນກວ່າ "will." ໃຊ້ເມື່ອບໍ່ຮູ້ແທ້ ບໍ່ແມ່ນເມື່ອຮູ້ແນ່ນອນແລ້ວ.$$)
    ),
    array[$$"Might" and "may" express genuine 50/50 uncertainty$$, $$"Could" points to a real possibility worth noting$$, $$All three are softer than a certain "will"$$],
    array[$$"Might" ແລະ "may" ສະແດງຄວາມບໍ່ແນ່ນອນຈິງ 50/50$$, $$"Could" ຊີ້ຄວາມເປັນໄປໄດ້ຈິງທີ່ຄວນສັງເກດ$$, $$ທັງສາມຄຳອ່ອນກວ່າ "will" ທີ່ແນ່ນອນ$$],
    4, false, 64
  ),
  (
    $$introduce-someone-else-in-english$$,
    $$Introduce someone else in English$$,
    $$ແນະນຳຄົນອື່ນເປັນພາສາອັງກິດ$$,
    $$A good introduction gives a name, a connection, and one shared reason they should talk.$$,
    $$ການແນະນຳທີ່ດີໃຫ້ຊື່, ຄວາມກ່ຽວຂ້ອງ ແລະ ເຫດຜົນທີ່ຄວນລົມກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Name and connection first$$, 'body', $$"This is Somchai, my colleague from the design team" gives both a name and context in one clean sentence.$$),
      jsonb_build_object('heading', $$Add why they might connect$$, 'body', $$"You two both worked on the same project last year" gives them an easy topic to start their own conversation.$$),
      jsonb_build_object('heading', $$Let them take over$$, 'body', $$After the introduction, step back — "I'll let you two chat" naturally hands the conversation to them.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊື່ ແລະ ຄວາມກ່ຽວຂ້ອງກ່ອນ$$, 'body', $$"This is Somchai, my colleague from the design team" ໃຫ້ທັງຊື່ ແລະ ບໍລິບົດໃນປະໂຫຍກດຽວທີ່ຊັດເຈນ.$$),
      jsonb_build_object('heading', $$ເພີ່ມເຫດຜົນທີ່ອາດເຊື່ອມຕໍ່ກັນ$$, 'body', $$"You two both worked on the same project last year" ໃຫ້ຫົວຂໍ້ງ່າຍໆເພື່ອເລີ່ມການສົນທະນາເອງ.$$),
      jsonb_build_object('heading', $$ໃຫ້ພວກເຂົາລົມກັນເອງ$$, 'body', $$ຫຼັງແນະນຳແລ້ວ ໃຫ້ຖອຍອອກ — "I'll let you two chat" ມອບການສົນທະນາໃຫ້ພວກເຂົາຢ່າງທຳມະຊາດ.$$)
    ),
    array[$$Give the name and connection in one clean sentence$$, $$Add a shared reason they might want to talk$$, $$Step back and let them continue the conversation$$],
    array[$$ໃຫ້ຊື່ ແລະ ຄວາມກ່ຽວຂ້ອງໃນປະໂຫຍກດຽວ$$, $$ເພີ່ມເຫດຜົນຮ່ວມທີ່ອາດຢາກລົມກັນ$$, $$ຖອຍອອກ ແລະ ໃຫ້ພວກເຂົາລົມກັນຕໍ່$$],
    3, false, 65
  ),
  (
    $$write-a-job-interview-follow-up-email$$,
    $$Write a job interview follow-up email$$,
    $$ຂຽນອີເມວຕິດຕາມຫຼັງການສຳພາດງານ$$,
    $$A short thank-you email sent within a day shows professionalism and keeps you top of mind.$$,
    $$ອີເມວຂອບໃຈສັ້ນໆສົ່ງພາຍໃນໜຶ່ງມື້ ສະແດງຄວາມເປັນມືອາຊີບ ແລະ ຮັກສາຊື່ຂອງທ່ານໄວ້ໃນໃຈ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Send it within 24 hours$$, 'body', $$Timing matters — a thank-you note sent the same day or next day feels attentive; a week later feels like an afterthought.$$),
      jsonb_build_object('heading', $$Reference something specific$$, 'body', $$"I especially enjoyed discussing..." mentioning a real moment from the interview shows genuine engagement, not a template.$$),
      jsonb_build_object('heading', $$Reaffirm your interest briefly$$, 'body', $$"I'm very excited about the opportunity to join the team" closes with clear, confident enthusiasm.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສົ່ງພາຍໃນ 24 ຊົ່ວໂມງ$$, 'body', $$ເວລາສຳຄັນ — ຄຳຂອບໃຈທີ່ສົ່ງມື້ດຽວກັນ ຫຼືມື້ຖັດໄປ ຮູ້ສຶກໃສ່ໃຈ; ຫຼັງອາທິດໜຶ່ງຮູ້ສຶກຄືຄິດພາຍຫຼັງ.$$),
      jsonb_build_object('heading', $$ອ້າງອີງບາງສິ່ງສະເພາະ$$, 'body', $$"I especially enjoyed discussing..." ການກ່າວເຖິງຊ່ວງເວລາຈິງໃນການສຳພາດ ສະແດງຄວາມສົນໃຈແທ້ ບໍ່ແມ່ນແບບຟອມ.$$),
      jsonb_build_object('heading', $$ຢືນຢັນຄວາມສົນໃຈສັ້ນໆ$$, 'body', $$"I'm very excited about the opportunity to join the team" ປິດທ້າຍດ້ວຍຄວາມກະຕືລືລົ້ນທີ່ຊັດເຈນ ແລະ ໝັ້ນໃຈ.$$)
    ),
    array[$$Send the follow-up within 24 hours of the interview$$, $$Reference a specific moment to show genuine engagement$$, $$Close by briefly reaffirming your interest$$],
    array[$$ສົ່ງອີເມວຕິດຕາມພາຍໃນ 24 ຊົ່ວໂມງຫຼັງສຳພາດ$$, $$ອ້າງອີງຊ່ວງເວລາສະເພາະເພື່ອສະແດງຄວາມສົນໃຈແທ້$$, $$ປິດທ້າຍດ້ວຍການຢືນຢັນຄວາມສົນໃຈສັ້ນໆ$$],
    4, false, 66
  ),
  (
    $$build-confidence-speaking-without-fear$$,
    $$Build confidence speaking without fear of mistakes$$,
    $$ສ້າງຄວາມໝັ້ນໃຈໃນການເວົ້າໂດຍບໍ່ຢ້ານຜິດພາດ$$,
    $$Mistakes are a normal, necessary part of learning — native speakers make them too.$$,
    $$ຄວາມຜິດພາດເປັນສ່ວນປົກກະຕິ ແລະ ຈຳເປັນຂອງການຮຽນຮູ້ — ເຈົ້າຂອງພາສາເອງກໍ່ຜິດພາດເໝືອນກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Reframe mistakes as data, not failure$$, 'body', $$Each mistake shows exactly what to practice next — treat it as useful information, not evidence you're bad at English.$$),
      jsonb_build_object('heading', $$Focus on the message, not perfection$$, 'body', $$Getting the meaning across matters far more than perfect grammar in real conversation — people are listening for what you mean.$$),
      jsonb_build_object('heading', $$Practice in low-stakes situations first$$, 'body', $$Speak with supportive friends, online language partners, or even alone before high-pressure situations like interviews.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫັນມຸມມອງຄວາມຜິດພາດເປັນຂໍ້ມູນ ບໍ່ແມ່ນຄວາມລົ້ມເຫຼວ$$, 'body', $$ແຕ່ລະຄວາມຜິດພາດຊີ້ບອກສິ່ງທີ່ຄວນຝຶກຕໍ່ໄປ — ຖືວ່າເປັນຂໍ້ມູນທີ່ເປັນປະໂຫຍດ ບໍ່ແມ່ນຫຼັກຖານວ່າອັງກິດບໍ່ດີ.$$),
      jsonb_build_object('heading', $$ສຸມໃສ່ຄວາມໝາຍ ບໍ່ແມ່ນຄວາມສົມບູນແບບ$$, 'body', $$ການສື່ຄວາມໝາຍໃຫ້ເຂົ້າໃຈສຳຄັນກວ່າໄວຍະກອນທີ່ສົມບູນແບບໃນການສົນທະນາຈິງ — ຄົນຟັງເພື່ອຮູ້ຄວາມໝາຍທ່ານ.$$),
      jsonb_build_object('heading', $$ຝຶກໃນສະຖານະການທີ່ບໍ່ກົດດັນກ່ອນ$$, 'body', $$ເວົ້າກັບໝູ່ທີ່ສະໜັບສະໜູນ, ຄູ່ຝຶກພາສາອອນລາຍ ຫຼືແມ່ນແຕ່ຄົນດຽວ ກ່ອນສະຖານະການທີ່ກົດດັນສູງເຊັ່ນການສຳພາດ.$$)
    ),
    array[$$Treat mistakes as useful information, not failure$$, $$Focus on getting your message across, not perfection$$, $$Practice in low-pressure situations before high-stakes ones$$],
    array[$$ຖືວ່າຄວາມຜິດພາດເປັນຂໍ້ມູນທີ່ເປັນປະໂຫຍດ ບໍ່ແມ່ນຄວາມລົ້ມເຫຼວ$$, $$ສຸມໃສ່ການສື່ຄວາມໝາຍ ບໍ່ແມ່ນຄວາມສົມບູນແບບ$$, $$ຝຶກໃນສະຖານະການທີ່ບໍ່ກົດດັນກ່ອນສະຖານະການສຳຄັນ$$],
    4, false, 67
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'english'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
