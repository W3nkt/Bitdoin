-- ============================================================
-- Bitdoin — Reading Quotes Seed (bilingual)
-- Each row has text (English) + text_lo (Lao translation).
-- Both carousels show the same quotes; language toggle switches
-- the displayed text — no quote is hidden from any user.
--
-- Run AFTER 003_add_quote_translations.sql.
-- Safe to re-run: clears table first.
-- ============================================================

DELETE FROM public.quotes;

INSERT INTO public.quotes
  (text, text_lo, author, source, language, category, display_date, sort_weight)
VALUES

-- ── Reading & Books ───────────────────────────────────────────────────────────
(
  'A reader lives a thousand lives before he dies. The man who never reads lives only one.',
  'ຜູ້ທີ່ອ່ານໜັງສື ດຳລົງຊີວິດໄດ້ຫຼາຍພັນຊີວິດກ່ອນທີ່ລາວຈະຕາຍ. ຜູ້ທີ່ບໍ່ເຄີຍອ່ານ ດຳລົງຊີວິດໄດ້ແຕ່ຊີວິດດຽວ.',
  'George R.R. Martin', 'A Dance with Dragons', 'English', 'reading', NULL, 10
),
(
  'Books are a uniquely portable magic.',
  'ໜັງສື ຄືຄາຖາທີ່ພົກພາໄດ້ ທີ່ບໍ່ມີສິ່ງໃດທຽບທ່ຽນ.',
  'Stephen King', 'On Writing', 'English', 'reading', NULL, 9
),
(
  'A room without books is like a body without a soul.',
  'ຫ້ອງທີ່ບໍ່ມີໜັງສື ຄືກັບຮ່າງກາຍທີ່ບໍ່ມີວິນຍານ.',
  'Marcus Tullius Cicero', NULL, 'English', 'reading', NULL, 9
),
(
  'There is no friend as loyal as a book.',
  'ບໍ່ມີໝູ່ໃດສັດຊື່ເທົ່າໜັງສື.',
  'Ernest Hemingway', NULL, 'English', 'reading', NULL, 8
),
(
  'I have always imagined that Paradise will be a kind of library.',
  'ຂ້ອຍຈິນຕະນາການສະເໝີວ່າ ສະຫວັນ ຈະເປັນຫ້ອງສະໝຸດປະເພດໜຶ່ງ.',
  'Jorge Luis Borges', NULL, 'English', 'reading', NULL, 8
),
(
  'The more that you read, the more things you will know. The more that you learn, the more places you''ll go.',
  'ຍິ່ງທ່ານອ່ານຫຼາຍ ທ່ານຍິ່ງຮູ້ຫຼາຍ. ຍິ່ງທ່ານຮຽນຫຼາຍ ທ່ານຍິ່ງໄປໄດ້ໄກ.',
  'Dr. Seuss', 'I Can Read With My Eyes Shut!', 'English', 'reading', NULL, 8
),
(
  'A book is a dream that you hold in your hands.',
  'ໜັງສື ຄືຄວາມຝັນທີ່ທ່ານຖືໄວ້ໃນມື.',
  'Neil Gaiman', NULL, 'English', 'reading', NULL, 8
),
(
  'Reading is to the mind what exercise is to the body.',
  'ການອ່ານ ຕໍ່ຈິດໃຈ ດັ່ງການອອກກຳລັງກາຍ ຕໍ່ຮ່າງກາຍ.',
  'Joseph Addison', NULL, 'English', 'reading', NULL, 7
),
(
  'Think before you speak. Read before you think.',
  'ຄິດກ່ອນເວົ້າ. ອ່ານກ່ອນຄິດ.',
  'Fran Lebowitz', NULL, 'English', 'reading', NULL, 7
),
(
  'Books give a soul to the universe, wings to the mind, flight to the imagination, and life to everything.',
  'ໜັງສື ມອບວິນຍານໃຫ້ຈັກກະວານ, ປີກໃຫ້ຈິດໃຈ, ການບິນໃຫ້ຈິນຕະນາການ ແລະ ຊີວິດໃຫ້ທຸກສິ່ງ.',
  'Plato', NULL, 'English', 'reading', NULL, 7
),
(
  'So many books, so little time.',
  'ໜັງສືຫຼາຍໜ້ວຍ, ເວລາກໍ່ໜ້ອຍ.',
  'Frank Zappa', NULL, 'English', 'reading', NULL, 7
),
(
  'It is what you read when you don''t have to that determines what you will be when you can''t help it.',
  'ສິ່ງທີ່ທ່ານອ່ານໃນເວລາທີ່ທ່ານບໍ່ຈຳເປັນ ຄືສິ່ງທີ່ກຳນົດວ່າທ່ານຈະກາຍເປັນໃຜໃນທີ່ສຸດ.',
  'Oscar Wilde', NULL, 'English', 'reading', NULL, 6
),
(
  'Not all readers are leaders, but all leaders are readers.',
  'ບໍ່ແມ່ນນັກອ່ານທຸກຄົນທີ່ເປັນຜູ້ນຳ, ແຕ່ຜູ້ນຳທຸກຄົນແມ່ນນັກອ່ານ.',
  'Harry S. Truman', NULL, 'English', 'reading', NULL, 6
),
(
  'Today a reader, tomorrow a leader.',
  'ມື້ນີ້ຜູ້ອ່ານ, ມື້ອື່ນຜູ້ນຳ.',
  'Margaret Fuller', NULL, 'English', 'reading', NULL, 6
),
(
  'Books are mirrors of the soul.',
  'ໜັງສື ຄືກະຈົກຂອງວິນຍານ.',
  'Virginia Woolf', 'Between the Acts', 'English', 'reading', NULL, 6
),
(
  'The world belongs to those who read.',
  'ໂລກເປັນຂອງຜູ້ທີ່ອ່ານ.',
  'Rick Holland', NULL, 'English', 'reading', NULL, 6
),
(
  'A good book is an event in my life.',
  'ໜັງສືດີ ຄືເຫດການໃນຊີວິດຂ້ອຍ.',
  'Stendhal', NULL, 'English', 'reading', NULL, 5
),
(
  'If you don''t like to read, you haven''t found the right book.',
  'ຖ້າທ່ານບໍ່ຊອບອ່ານ, ທ່ານຍັງບໍ່ໄດ້ພົບໜັງສືທີ່ຖືກໃຈ.',
  'J.K. Rowling', NULL, 'English', 'reading', NULL, 5
),
(
  'One must always be careful of books, and what is inside them, for words have the power to change us.',
  'ຕ້ອງລະວັງໜັງສືສະເໝີ ເພາະຄຳໃນໜັງສືມີອຳນາດປ່ຽນແປງພວກເຮົາ.',
  'Cassandra Clare', 'Clockwork Angel', 'English', 'reading', NULL, 5
),

-- ── Education & Knowledge ─────────────────────────────────────────────────────
(
  'An investment in knowledge pays the best interest.',
  'ການລົງທຶນໃນຄວາມຮູ້ ໃຫ້ຜົນຕອບແທນດີທີ່ສຸດ.',
  'Benjamin Franklin', NULL, 'English', 'education', NULL, 9
),
(
  'Education is the most powerful weapon which you can use to change the world.',
  'ການສຶກສາ ຄືອາວຸດທີ່ທາດທານຄ້ອງທີ່ສຸດທີ່ທ່ານສາມາດໃຊ້ປ່ຽນແປງໂລກ.',
  'Nelson Mandela', NULL, 'English', 'education', NULL, 9
),
(
  'The beautiful thing about learning is that no one can take it away from you.',
  'ສິ່ງທີ່ງາມທີ່ສຸດຂອງການຮຽນຮູ້ ຄືບໍ່ມີໃຜເອົາໄປຈາກທ່ານໄດ້.',
  'B.B. King', NULL, 'English', 'education', NULL, 8
),
(
  'Knowledge is power.',
  'ຄວາມຮູ້ ຄືອຳນາດ.',
  'Francis Bacon', NULL, 'English', 'education', NULL, 7
),
(
  'Live as if you were to die tomorrow. Learn as if you were to live forever.',
  'ດຳລົງຊີວິດຄືກັບທ່ານຈະຕາຍມື້ອື່ນ. ຮຽນຮູ້ຄືກັບທ່ານຈະຢູ່ຕະຫຼອດໄປ.',
  'Mahatma Gandhi', NULL, 'English', 'education', NULL, 8
),

-- ── Motivation ────────────────────────────────────────────────────────────────
(
  'The secret of getting ahead is getting started.',
  'ຄວາມລັບຂອງການກ້າວໄປຂ້າງໜ້າ ຄືການເລີ່ມຕົ້ນ.',
  'Mark Twain', NULL, 'English', 'motivation', NULL, 8
),
(
  'Success is not final; failure is not fatal: it is the courage to continue that counts.',
  'ຄວາມສຳເລັດບໍ່ຖາວອນ, ຄວາມລົ້ມເຫຼວບໍ່ຕາຍຕົວ. ສິ່ງທີ່ສຳຄັນ ຄືຄວາມກ້າຮັດທຽດຕໍ່ໄປ.',
  'Winston Churchill', NULL, 'English', 'motivation', NULL, 8
),
(
  'The only way to do great work is to love what you do.',
  'ວິທີດຽວທີ່ຈະເຮັດວຽກທີ່ຍິ່ງໃຫຍ່ ຄືຮັກສິ່ງທີ່ທ່ານເຮັດ.',
  'Steve Jobs', NULL, 'English', 'motivation', NULL, 7
),

-- ── Lao Proverbs (text = English translation, text_lo = original Lao) ─────────
(
  'Learning has no lower limit, teaching has no upper limit — anyone can learn, anyone can teach.',
  'ການຮຽນ ບໍ່ມີຕ່ຳ, ການສອນ ບໍ່ມີສູງ — ໃຜຮຽນໄດ້, ໃຜສອນໄດ້.',
  'Lao Proverb', NULL, 'Lao', 'lao_culture', NULL, 10
),
(
  'A book is the best friend, always ready to share knowledge at any time.',
  'ປຶ້ມ ຄື ໝູ່ທີ່ດີທີ່ສຸດ ທີ່ພ້ອມໃຫ້ຄວາມຮູ້ທຸກເວລາ.',
  'Lao Proverb', NULL, 'Lao', 'lao_culture', NULL, 9
),
(
  'Those who study will know more; those who know more will live well.',
  'ຄົນທີ່ຮຽນ ຈະຮູ້ຫຼາຍ, ຄົນທີ່ຮູ້ຫຼາຍ ຈະດຳລົງຊີວິດໄດ້ດີ.',
  'Lao Proverb', NULL, 'Lao', 'lao_culture', NULL, 9
),
(
  'Glancing at one page of a book is better than sitting idle without knowledge.',
  'ຫຼ່ຽວປຶ້ມໜຶ່ງໜ້າ ດີກວ່ານັ່ງຄິດໂດຍບໍ່ຮູ້ຫຍັງ.',
  'Lao Proverb', NULL, 'Lao', 'lao_culture', NULL, 8
),
(
  'Books are the path to the wide world — those who read can go far.',
  'ໜັງສື ຄື ທາງສູ່ໂລກກວ້າງ — ຜູ້ອ່ານ ຈະໄປໄດ້ໄກ.',
  'Lao Proverb', NULL, 'Lao', 'lao_culture', NULL, 8
),
(
  'Giving knowledge is better than giving gold — gold runs out, knowledge endures.',
  'ໃຫ້ຄວາມຮູ້ ດີກວ່າໃຫ້ຄຳ — ຄຳໝົດ, ຄວາມຮູ້ຍັງຄົງ.',
  'Lao Proverb', NULL, 'Lao', 'lao_culture', NULL, 8
),

-- ── Special Days ──────────────────────────────────────────────────────────────
-- Lao New Year — Pi Mai Lao (April 13–14)
(
  'Happy Lao New Year! May knowledge blossom in every heart, just as fresh waters bring new life.',
  'ສະ​ບາຍ​ດີ ປີ​ໃໝ່ລາວ! ຂໍ​ໃຫ້​ຄວາມ​ຮູ້​ຜະ​ລິ​ໃນ​ທຸກ​ດວງ​ໃຈ ດັ່ງ​ນ້ຳ​ໃໝ່​ທີ່​ນຳ​ຊີ​ວິດ​ໃໝ່​ມາ.',
  'Bitdoin', NULL, 'English', 'special', '04-13', 20
),
(
  'New Year, new opportunity — start a new book today.',
  'ປີ​ໃໝ່ ໂອ​ກາດ​ໃໝ່ — ເລີ່​ມ​ອ່ານ​ໜັງ​ສື​ໃໝ່​ໄດ້​ເລີຍ​ມື້​ນີ້.',
  'Bitdoin', NULL, 'English', 'special', '04-14', 20
),

-- Lao National Day (December 2)
(
  'Knowledge is the foundation of a free and prosperous nation. Happy Lao National Day!',
  'ຄວາມ​ຮູ້ ຄື​ຮາກ​ຖານ​ຂອງ​ຊາດ​ທີ່​ເສລີ ​ແລະ ຈະ​ເລີນ​ຮຸ່ງ​ເຮືອງ. ຂໍ​ສຸກ​ສັນ​ວັນ​ຊາດ​ລາວ!',
  'Bitdoin', NULL, 'English', 'special', '12-02', 20
),

-- World Book Day (April 23)
(
  'On World Book Day, remember: every book you open is a door to a new world.',
  'ວັນ​ໜັງ​ສື​ໂລກ — ໜັງ​ສື​ທຸກ​ຫົວ​ທີ່​ທ່ານ​ເປີດ ຄື​ປະ​ຕູ​ສູ່​ໂລກ​ໃໝ່.',
  'Bitdoin', NULL, 'English', 'special', '04-23', 20
),

-- International Children''s Day (June 1)
(
  'Give a child a book and you give them the world. Happy Children''s Day!',
  'ມອບ​ໜັງ​ສື​ໃຫ້​ເດັກ​ໜຶ່ງ​ຄົນ ທ່ານ​ໄດ້​ມອບ​ໂລກ​ທັງ​ໃບ​ໃຫ້​ລາວ. ວັນ​ເດັກ​ສາກົນ ສຸກ​ສັນ!',
  'Bitdoin', NULL, 'English', 'special', '06-01', 20
),

-- International Women''s Day (March 8)
(
  'A woman with a book is unstoppable. Happy International Women''s Day!',
  'ແມ່​ຍິງ​ທີ່​ຖື​ໜັງ​ສື​ໄວ້​ໃນ​ມື ບໍ່​ມີ​ຫຍັງ​ຢຸດ​ລາວ​ໄດ້. ວັນ​ສາກົນ​ແມ່​ຍິງ ສຸກ​ສັນ!',
  'Bitdoin', NULL, 'English', 'special', '03-08', 20
),

-- New Year (January 1)
(
  'New year, new books, new adventures waiting between the pages.',
  'ປີ​ໃໝ່ ໜັງ​ສື​ໃໝ່ — ການ​ຜະ​ຈົນ​ໃໝ່​ລໍ​ຖ້າ​ຢູ່​ລະ​ຫວ່າງ​ໜ້າ.',
  'Bitdoin', NULL, 'English', 'special', '01-01', 20
);
