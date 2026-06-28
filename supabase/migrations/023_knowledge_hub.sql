-- ── 023_knowledge_hub.sql ───────────────────────────────────────────────────
-- Knowledge Hub: tables, RLS, and seed data

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en    TEXT        NOT NULL,
  name_lo    TEXT        NOT NULL,
  slug       TEXT        UNIQUE NOT NULL,
  icon       TEXT        NOT NULL DEFAULT '📖',
  color      TEXT        NOT NULL DEFAULT 'blue',
  sort_order INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID        REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL DEFAULT 'article'
                           CHECK (type IN ('article', 'quote', 'tip', 'blog')),
  title_en     TEXT        NOT NULL,
  title_lo     TEXT,
  content_en   TEXT        NOT NULL,
  content_lo   TEXT,
  excerpt_en   TEXT,
  excerpt_lo   TEXT,
  author       TEXT        NOT NULL DEFAULT 'Bitdoin Team',
  source       TEXT,
  image_url    TEXT,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured  BOOLEAN     NOT NULL DEFAULT FALSE,
  views        INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS knowledge_posts_category_idx    ON knowledge_posts(category_id);
CREATE INDEX IF NOT EXISTS knowledge_posts_type_idx        ON knowledge_posts(type);
CREATE INDEX IF NOT EXISTS knowledge_posts_published_idx   ON knowledge_posts(is_published);
CREATE INDEX IF NOT EXISTS knowledge_posts_featured_idx    ON knowledge_posts(is_featured);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_posts      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_categories_public_read"
  ON knowledge_categories FOR SELECT USING (true);

CREATE POLICY "knowledge_posts_public_read"
  ON knowledge_posts FOR SELECT
  USING (is_published = true);

CREATE POLICY "knowledge_categories_staff_all"
  ON knowledge_categories FOR ALL
  USING (public.get_user_role() IN ('ADMIN', 'OPERATIONS', 'FINANCE'));

CREATE POLICY "knowledge_posts_staff_all"
  ON knowledge_posts FOR ALL
  USING (public.get_user_role() IN ('ADMIN', 'OPERATIONS', 'FINANCE'));

-- ── Trigger: updated_at ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_knowledge_posts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_posts_updated_at
  BEFORE UPDATE ON knowledge_posts
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_posts_updated_at();

-- ── RPC: increment views ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_knowledge_views(post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE knowledge_posts SET views = views + 1 WHERE id = post_id;
END;
$$;

-- ── Seed: Categories ──────────────────────────────────────────────────────────

INSERT INTO knowledge_categories (name_en, name_lo, slug, icon, color, sort_order) VALUES
  ('Motivation',      'ແຮງຈູງໃຈ',         'motivation',      '🔥', 'amber',  1),
  ('Education',       'ການສຶກສາ',          'education',       '📚', 'blue',   2),
  ('Life Wisdom',     'ປັດຍາຊີວິດ',        'life-wisdom',     '💡', 'purple', 3),
  ('Study Skills',    'ທັກສະການຮຽນ',       'study-skills',    '✏️', 'green',  4),
  ('Career & Future', 'ອາຊີບ & ອານາຄົດ',   'career',          '🚀', 'indigo', 5),
  ('World Knowledge', 'ຄວາມຮູ້ໂລກ',        'world-knowledge', '🌍', 'teal',   6)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: Quotes ─────────────────────────────────────────────────────────────

INSERT INTO knowledge_posts
  (category_id, type, title_en, title_lo, content_en, content_lo, author, tags, is_published, is_featured)
VALUES

-- Motivation quotes
((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'Live as if you were to die tomorrow',
 'ດຳລົງຊີວິດຄືກັບວ່າທ່ານຈະຕາຍໃນມື້ອື່ນ',
 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
 'ດຳລົງຊີວິດຄືກັບວ່າທ່ານຈະຕາຍໃນມື້ອື່ນ. ຮຽນຮູ້ຄືກັບວ່າທ່ານຈະມີຊີວິດຢູ່ຕະຫຼອດໄປ.',
 'Mahatma Gandhi', ARRAY['motivation','life','learning'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'Believe you can and you''re halfway there',
 'ເຊື່ອວ່າທ່ານສາມາດ ແລະ ທ່ານໄດ້ຢູ່ເຄິ່ງທາງແລ້ວ',
 'Believe you can and you''re halfway there.',
 'ເຊື່ອວ່າທ່ານສາມາດ ແລະ ທ່ານໄດ້ຢູ່ເຄິ່ງທາງແລ້ວ.',
 'Theodore Roosevelt', ARRAY['motivation','confidence'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'The secret of getting ahead is getting started',
 'ຄວາມລັບຂອງການກ້າວໄປຂ້າງໜ້າຄືການເລີ່ມຕົ້ນ',
 'The secret of getting ahead is getting started.',
 'ຄວາມລັບຂອງການກ້າວໄປຂ້າງໜ້າຄືການເລີ່ມຕົ້ນ.',
 'Mark Twain', ARRAY['motivation','action'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'It does not matter how slowly you go',
 'ບໍ່ສໍາຄັນວ່າທ່ານຈະຊ້າສໍ່ໃດ',
 'It does not matter how slowly you go as long as you do not stop.',
 'ບໍ່ສໍາຄັນວ່າທ່ານຈະຊ້າສໍ່ໃດ ຕາບໃດທີ່ທ່ານບໍ່ຢຸດ.',
 'Confucius', ARRAY['motivation','perseverance'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'Success is not final; failure is not fatal',
 'ຄວາມສຳເລັດບໍ່ແມ່ນຕາຍຕົວ; ຄວາມລົ້ມເຫຼວບໍ່ແມ່ນສິ່ງຕາຍ',
 'Success is not final; failure is not fatal. It is the courage to continue that counts.',
 'ຄວາມສຳເລັດບໍ່ແມ່ນຕາຍຕົວ; ຄວາມລົ້ມເຫຼວບໍ່ແມ່ນສິ່ງຕາຍ. ຄວາມກ້າທີ່ຈະສືບຕໍ່ຕ່າງຫາກທີ່ສຳຄັນ.',
 'Winston Churchill', ARRAY['motivation','resilience'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'Don''t watch the clock; do what it does. Keep going.',
 'ຢ່າເບິ່ງໂມງ; ເຮັດໃນສິ່ງທີ່ໂມງເຮັດ. ສືບຕໍ່ໄປ.',
 'Don''t watch the clock; do what it does. Keep going.',
 'ຢ່າເບິ່ງໂມງ; ເຮັດໃນສິ່ງທີ່ໂມງເຮັດ. ສືບຕໍ່ໄປ.',
 'Sam Levenson', ARRAY['motivation','perseverance'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'The future belongs to those who believe in their dreams',
 'ອານາຄົດເປັນຂອງຜູ້ທີ່ເຊື່ອໃນຄວາມງາມຂອງຝັນ',
 'The future belongs to those who believe in the beauty of their dreams.',
 'ອານາຄົດເປັນຂອງຜູ້ທີ່ເຊື່ອໃນຄວາມງາມຂອງຝັນຂອງພວກເຂົາ.',
 'Eleanor Roosevelt', ARRAY['motivation','dreams'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'quote',
 'You miss 100% of the shots you don''t take',
 'ທ່ານພາດ 100% ຂອງໂອກາດທີ່ທ່ານບໍ່ພະຍາຍາມ',
 'You miss 100% of the shots you don''t take.',
 'ທ່ານພາດ 100% ຂອງໂອກາດທີ່ທ່ານບໍ່ພະຍາຍາມ.',
 'Wayne Gretzky', ARRAY['motivation','action'], TRUE, FALSE),

-- Education quotes
((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'Education is the most powerful weapon to change the world',
 'ການສຶກສາຄືອາວຸດທີ່ທ້ອງທີ່ສຸດທີ່ທ່ານສາມາດໃຊ້ປ່ຽນແປງໂລກ',
 'Education is the most powerful weapon which you can use to change the world.',
 'ການສຶກສາຄືອາວຸດທີ່ທ້ອງທີ່ສຸດທີ່ທ່ານສາມາດໃຊ້ປ່ຽນແປງໂລກ.',
 'Nelson Mandela', ARRAY['education','change'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'An investment in knowledge pays the best interest',
 'ການລົງທຶນໃນຄວາມຮູ້ໃຫ້ດອກຜົນທີ່ດີທີ່ສຸດ',
 'An investment in knowledge pays the best interest.',
 'ການລົງທຶນໃນຄວາມຮູ້ໃຫ້ດອກຜົນທີ່ດີທີ່ສຸດ.',
 'Benjamin Franklin', ARRAY['education','investment'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'The beautiful thing about learning is that no one can take it away',
 'ສິ່ງທີ່ງາມກ່ຽວກັບການຮຽນຮູ້ຄືບໍ່ມີໃຜເອົາມັນໄປຈາກທ່ານໄດ້',
 'The beautiful thing about learning is that no one can take it away from you.',
 'ສິ່ງທີ່ງາມກ່ຽວກັບການຮຽນຮູ້ຄືບໍ່ມີໃຜເອົາມັນໄປຈາກທ່ານໄດ້.',
 'B.B. King', ARRAY['education','learning'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'Tell me and I forget; teach me and I remember; involve me and I learn',
 'ບອກຂ້ອຍ — ຂ້ອຍລືມ; ສອນຂ້ອຍ — ຂ້ອຍຈຳ; ມີສ່ວນຮ່ວມ — ຂ້ອຍຮຽນ',
 'Tell me and I forget. Teach me and I remember. Involve me and I learn.',
 'ບອກຂ້ອຍ — ຂ້ອຍລືມ. ສອນຂ້ອຍ — ຂ້ອຍຈຳ. ມີສ່ວນຮ່ວມ — ຂ້ອຍຮຽນ.',
 'Benjamin Franklin', ARRAY['education','learning'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'Reading is to the mind what exercise is to the body',
 'ການອ່ານຕໍ່ຈິດໃຈຄືກັບການອອກກຳລັງກາຍຕໍ່ຮ່າງກາຍ',
 'Reading is to the mind what exercise is to the body.',
 'ການອ່ານຕໍ່ຈິດໃຈຄືກັບການອອກກຳລັງກາຍຕໍ່ຮ່າງກາຍ.',
 'Joseph Addison', ARRAY['reading','education'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'The more that you read, the more places you''ll go',
 'ຍິ່ງທ່ານອ່ານຫຼາຍ ທ່ານຍິ່ງໄປໄດ້ຫຼາຍ',
 'The more that you read, the more things you will know. The more that you learn, the more places you''ll go.',
 'ຍິ່ງທ່ານອ່ານຫຼາຍ ທ່ານຍິ່ງຮູ້ຫຼາຍ. ຍິ່ງທ່ານຮຽນຮູ້ຫຼາຍ ທ່ານຍິ່ງໄປໄດ້ຫຼາຍ.',
 'Dr. Seuss', ARRAY['reading','education','knowledge'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='education'), 'quote',
 'Education is not preparation for life; education is life itself',
 'ການສຶກສາບໍ່ແມ່ນການກຽມຕົວສຳລັບຊີວິດ; ການສຶກສາຄືຊີວິດ',
 'Education is not preparation for life; education is life itself.',
 'ການສຶກສາບໍ່ແມ່ນການກຽມຕົວສຳລັບຊີວິດ; ການສຶກສາຄືຊີວິດ.',
 'John Dewey', ARRAY['education','life'], TRUE, FALSE),

-- Life Wisdom quotes
((SELECT id FROM knowledge_categories WHERE slug='life-wisdom'), 'quote',
 'In the middle of every difficulty lies opportunity',
 'ໃນທ່າມກາງທຸກຄວາມຍາກລຳບາກ ມີໂອກາດຢູ່',
 'In the middle of every difficulty lies opportunity.',
 'ໃນທ່າມກາງທຸກຄວາມຍາກລຳບາກ ມີໂອກາດຢູ່.',
 'Albert Einstein', ARRAY['wisdom','opportunity'], TRUE, TRUE),

((SELECT id FROM knowledge_categories WHERE slug='life-wisdom'), 'quote',
 'Your time is limited, don''t waste it living someone else''s life',
 'ເວລາຂອງທ່ານມີຈຳກັດ ຢ່າເສຍມັນໄປກັບການດຳລົງຊີວິດຂອງຄົນອື່ນ',
 'Your time is limited, don''t waste it living someone else''s life.',
 'ເວລາຂອງທ່ານມີຈຳກັດ ຢ່າເສຍມັນໄປກັບການດຳລົງຊີວິດຂອງຄົນອື່ນ.',
 'Steve Jobs', ARRAY['wisdom','time','authenticity'], TRUE, FALSE),

((SELECT id FROM knowledge_categories WHERE slug='life-wisdom'), 'quote',
 'The mind is not a vessel to be filled, but a fire to be kindled',
 'ຈິດໃຈບໍ່ແມ່ນພາຊະນະທີ່ຕ້ອງຕື່ມ ແຕ່ເປັນໄຟທີ່ຕ້ອງລຸດ',
 'The mind is not a vessel to be filled, but a fire to be kindled.',
 'ຈິດໃຈບໍ່ແມ່ນພາຊະນະທີ່ຕ້ອງຕື່ມ ແຕ່ເປັນໄຟທີ່ຕ້ອງລຸດ.',
 'Plutarch', ARRAY['wisdom','learning','curiosity'], TRUE, FALSE),

-- World Knowledge
((SELECT id FROM knowledge_categories WHERE slug='world-knowledge'), 'quote',
 'Knowledge is power. Information is liberating.',
 'ຄວາມຮູ້ຄືພະລັງ. ຂໍ້ມູນຂ່າວສານຊ່ວຍໃຫ້ເສລີ.',
 'Knowledge is power. Information is liberating. Education is the premise of progress, in every family and in every society.',
 'ຄວາມຮູ້ຄືພະລັງ. ຂໍ້ມູນຂ່າວສານຊ່ວຍໃຫ້ເສລີ. ການສຶກສາຄືພື້ນຖານຂອງຄວາມກ້າວໜ້າ.',
 'Kofi Annan', ARRAY['knowledge','information','education'], TRUE, TRUE),

-- Career
((SELECT id FROM knowledge_categories WHERE slug='career'), 'quote',
 'The only way to do great work is to love what you do',
 'ວິທີດຽວທີ່ຈະເຮັດວຽກທີ່ຍິ່ງໃຫຍ່ຄືການຮັກສິ່ງທີ່ທ່ານເຮັດ',
 'The only way to do great work is to love what you do.',
 'ວິທີດຽວທີ່ຈະເຮັດວຽກທີ່ຍິ່ງໃຫຍ່ຄືການຮັກສິ່ງທີ່ທ່ານເຮັດ.',
 'Steve Jobs', ARRAY['career','passion'], TRUE, TRUE);

-- ── Seed: Articles & Tips ─────────────────────────────────────────────────────

INSERT INTO knowledge_posts
  (category_id, type, title_en, title_lo, content_en, content_lo, excerpt_en, excerpt_lo, author, tags, is_published, is_featured)
VALUES

-- Study Skills: How to Study Smarter
((SELECT id FROM knowledge_categories WHERE slug='study-skills'), 'article',
 'How to Study Smarter, Not Harder',
 'ວິທີຮຽນຢ່າງສະຫຼາດ ບໍ່ແມ່ນຢ່າງໜັກ',
 E'Many students believe that studying more hours automatically leads to better grades. But research tells a different story — it''s not how long you study, but HOW you study that matters most.\n\n## 1. Use the Pomodoro Technique\nStudy for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15–30 minute break. This rhythm keeps your brain fresh and focused without burning out.\n\n## 2. Active Recall\nInstead of re-reading your notes, close your book and try to recall what you just learned from memory. Testing yourself forces your brain to retrieve information — this process is called "retrieval practice" and it dramatically strengthens long-term memory.\n\n## 3. Spaced Repetition\nDon''t cram everything the night before! Spread your studying over several days. Revisit material after 1 day, then 3 days, then a week. Your brain consolidates information during sleep, so spacing your study sessions gives it time to solidify.\n\n## 4. Teach What You Learn\nExplaining concepts to someone else (or even talking through them out loud alone) reveals gaps in your understanding. If you can''t explain it simply, you don''t understand it well enough yet.\n\n## 5. Create Mind Maps\nFor complex topics, draw a visual map connecting key concepts. Seeing relationships between ideas helps your brain organize information more effectively than linear notes.\n\n## 6. Use Multiple Senses\nWrite notes by hand (not just typing). Read aloud. Draw diagrams. The more senses you involve, the stronger the memory trace.\n\n## 7. Minimize Distractions\nPut your phone in another room. Use website blockers during study sessions. A distraction-free environment can double your learning efficiency.\n\n## Final Thought\nSmart studying is about quality, not quantity. Apply these techniques consistently and you will see results improve — often dramatically. The students who do best are not always the most talented; they are the most strategic.',
 E'ນັກຮຽນຫຼາຍຄົນຄິດວ່າການຮຽນຫຼາຍຊົ່ວໂມງຈະໄດ້ຄະແນນດີ. ແຕ່ການຄົ້ນຄ້ວາຊີ້ໃຫ້ເຫັນວ່າ ສຳຄັນກວ່ານັ້ນຄືວິທີທີ່ທ່ານຮຽນ.\n\n## 1. ເຕັກນິກ Pomodoro\nຮຽນ 25 ນາທີ ພັກ 5 ນາທີ. ຫຼັງ 4 ຮອບ ພັກ 15-30 ນາທີ. ວິທີນີ້ຊ່ວຍໃຫ້ສະໝອງສົດຊື່ນ.\n\n## 2. ການຈຳແບບ Active\nຫຼັງຈາກອ່ານ ໃຫ້ປິດໜັງສືແລ້ວລອງຈຳໃຈ. ການທົດສອບຕົນເອງຊ່ວຍເສີມສ້າງຄວາມຊົງຈຳໄລຍະຍາວ.\n\n## 3. ການທົບທວນຄືນຢ່າງເປັນລະບົບ\nຢ່າທ່ອງຄືນຄືນດຽວ! ທົບທວນຫຼັງ 1 ວັນ 3 ວັນ ຈາກນັ້ນ 1 ອາທິດ. ສະໝອງລວບລວມຂໍ້ມູນລະຫວ່າງການນອນ.\n\n## 4. ສອນສິ່ງທີ່ຮຽນ\nການອະທິບາຍໃຫ້ຄົນອື່ນຊ່ວຍເຜີຍໃຫ້ເຫັນຈຸດທີ່ຍັງເຂົ້າໃຈບໍ່ດີ.\n\n## 5. ຫຼຸດຜ່ອນສິ່ງລົບກວນ\nໃສ່ໂທລະສັບໃນຫ້ອງອື່ນ. ສະພາບແວດລ້ອມທີ່ບໍ່ມີການລົບກວນຈະເພີ່ມປະສິດທິພາບ.\n\nການຮຽນຢ່າງສະຫຼາດແມ່ນກ່ຽວກັບຄຸນນະພາບ ບໍ່ແມ່ນປະລິມານ.',
 'Learn proven techniques that help you retain more, stress less, and actually enjoy studying.',
 'ຮຽນຮູ້ເຕັກນິກທີ່ຖືກພິສູດທີ່ຊ່ວຍໃຫ້ທ່ານຈຳໄດ້ຫຼາຍ ລຸດຄວາມກົດດັນ ແລະ ມ່ວນກັບການຮຽນ.',
 'Bitdoin Team', ARRAY['study','productivity','tips'], TRUE, TRUE),

-- Education: Power of Reading
((SELECT id FROM knowledge_categories WHERE slug='education'), 'article',
 'The Power of Reading: Why Books Change Lives',
 'ພະລັງຂອງການອ່ານ: ເປັນຫຍັງໜັງສືຈຶ່ງປ່ຽນຊີວິດ',
 E'In a world of short videos and instant news, reading a full book feels like a superpower. And it truly is.\n\n## Books Build Vocabulary and Critical Thinking\nEvery book you read exposes you to thousands of new words and complex ideas. Unlike scrolling social media, reading requires active thinking — you must process, question, and form your own opinions.\n\n## Books Are Time Machines\nA book written 2,000 years ago gives you direct access to the greatest minds in human history. Marcus Aurelius, Confucius, Benjamin Franklin — their wisdom is yours for the reading. No other technology offers this.\n\n## Books Develop Empathy\nFiction especially helps you see the world through different eyes. Research by Dr. David Comer Kidd (Science, 2013) shows that people who read literary fiction score higher on empathy and social cognition tests.\n\n## The Compound Effect of Reading\nBill Gates reads 50 books per year. Warren Buffett reads 500 pages per day. If you read just one book per month, in 10 years you will have read 120 books — more than most people read in a lifetime. Knowledge compounds like interest.\n\n## Reading Reduces Stress\nA study by the University of Sussex found that reading for just 6 minutes can reduce stress levels by up to 68% — more effective than listening to music or going for a walk.\n\n## How to Build a Reading Habit\n1. Start with short books or topics you already enjoy\n2. Read for 20 minutes before bed instead of scrolling\n3. Keep a book visible on your desk as a reminder\n4. Set a modest goal: 1 book per month\n5. Join a book club for accountability\n\n## Remember\nEvery expert was once a beginner who picked up a book. Every leader was once a student who chose to keep reading. The library — and the bookstore — are the most democratic institutions in the world: the same knowledge available to everyone.\n\nThe best time to start reading is now.',
 E'ໃນໂລກທີ່ເຕັມໄປດ້ວຍວິດີໂອສັ້ນ ການອ່ານໜັງສືທັງເຫຼັ້ມຄືຄວາມສາມາດພິເສດ.\n\n## ໜັງສືສ້າງຄຳສັບ ແລະ ການຄິດວິເຄາະ\nທຸກໜັງສືທີ່ທ່ານອ່ານ ເຮັດໃຫ້ທ່ານສຳຜັດກັບຄຳສັບໃໝ່ຫຼາຍພັນຄຳ ແລະ ແນວຄິດທີ່ຊັບຊ້ອນ.\n\n## ໜັງສືຄືເຄື່ອງເດີນທາງທ່ອງເວລາ\nໜັງສືທີ່ຂຽນເມື່ອ 2,000 ປີກ່ອນ ຊ່ວຍໃຫ້ທ່ານເຂົ້າເຖິງຈິດໃຈທີ່ຍິ່ງໃຫຍ່ທີ່ສຸດໃນປະຫວັດສາດ.\n\n## ສ້າງນິໄສການອ່ານ\n1. ເລີ່ມດ້ວຍໜັງສືສັ້ນ ຫຼື ຫົວຂໍ້ທີ່ທ່ານສົນໃຈ\n2. ອ່ານ 20 ນາທີ ກ່ອນນອນ\n3. ຕັ້ງເປົ້າ 1 ເຫຼັ້ມຕໍ່ເດືອນ\n\nເວລາທີ່ດີທີ່ສຸດເພື່ອເລີ່ມອ່ານຄືດຽວນີ້.',
 'In the age of TikTok and short videos, reading a full book is a superpower. Here''s why it is your greatest investment.',
 'ໃນຍຸກ TikTok ແລະ ວິດີໂອສັ້ນ ການອ່ານໜັງສືທັງເຫຼັ້ມຄືຄວາມສາມາດພິເສດ.',
 'Bitdoin Team', ARRAY['reading','education','books'], TRUE, TRUE),

-- Motivation: Growth Mindset
((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'article',
 'Growth Mindset: The Key to Unlocking Your Potential',
 'ຄວາມຄິດແບບ Growth Mindset: ກຸນແຈໄຂທ່ານ',
 E'In 1988, psychologist Carol Dweck discovered something remarkable: the way you think about your own abilities has a profound effect on your success.\n\n## Fixed vs. Growth Mindset\n\nA FIXED MINDSET believes: "I''m either smart or I''m not. Talent is born, not made. If I fail, it means I''m not good enough."\n\nA GROWTH MINDSET believes: "My abilities can be developed through dedication and hard work. Failure is feedback. Challenges make me stronger."\n\n## Why Growth Mindset Matters for Students\n\nStudents with a growth mindset:\n- Embrace challenges instead of avoiding them\n- See failure as feedback, not proof of inability\n- Put in more effort because they believe effort leads to mastery\n- Learn from criticism rather than feeling threatened by it\n- Find inspiration in others'' success instead of feeling envious\n\n## How to Develop a Growth Mindset\n\n1. Change "I can''t" to "I can''t YET" — adding the word "yet" shifts your perspective from failure to progress in progress\n2. Celebrate effort, not just results — praise yourself for working hard, not only for getting top grades\n3. Learn from every mistake — ask "What can I learn from this?" instead of "Why did this happen to me?"\n4. Surround yourself with growth-minded people — attitudes are contagious\n5. View challenges as opportunities — the harder it is, the more you are growing\n\n## The Science Behind It\n\nBrain scans from Dweck''s lab show that students with a growth mindset have more activity in areas of the brain associated with learning when they make mistakes — as if their brain is saying "interesting, let me figure this out."\n\nResearch on neuroplasticity confirms the brain physically grows and changes when you learn new things. Every time you struggle and persist, you are literally building new neural connections.\n\nYou are not stuck. You are just not there yet.',
 E'ນັກຈິດຕະວິທະຍາ Carol Dweck ຄົ້ນພົບວ່າ ວິທີທີ່ທ່ານຄິດກ່ຽວກັບຄວາມສາມາດ ສ່ງຜົນຢ່າງເລິກເຊິ່ງຕໍ່ຄວາມສຳເລັດ.\n\n## Fixed vs Growth Mindset\nFixed: "ຂ້ອຍສະຫຼາດ ຫຼື ບໍ່ສະຫຼາດ"\nGrowth: "ຄວາມສາມາດຂອງຂ້ອຍພັດທະນາໄດ້"\n\n## ວິທີພັດທະນາ Growth Mindset\n1. ປ່ຽນ "ຂ້ອຍເຮັດບໍ່ໄດ້" ເປັນ "ຂ້ອຍຍັງເຮັດບໍ່ໄດ້"\n2. ສ້ອງຊົມຄວາມພາກພຽນ ບໍ່ແມ່ນຜົນໄດ້ຮັບ\n3. ຮຽນຮູ້ຈາກທຸກຄວາມຜິດພາດ\n4. ຢູ່ໃກ້ຄົນທີ່ຄິດແບບ Growth\n5. ເບິ່ງສິ່ງທ້າທາຍເປັນໂອກາດ\n\nທ່ານບໍ່ໄດ້ຕິດຢູ່. ທ່ານພຽງແຕ່ຍັງບໍ່ໄດ້ຮອດ.',
 'Discover the science-backed mindset shift that separates high achievers from those who give up.',
 'ຄົ້ນພົບການປ່ຽນຄວາມຄິດທີ່ໄດ້ຮັບການສະໜັບສະໜຸນທາງວິທະຍາສາດ ທີ່ແຍກຄົນສຳເລັດຈາກຄົນຍອມແພ້.',
 'Bitdoin Team', ARRAY['mindset','psychology','growth'], TRUE, TRUE),

-- Study Skills: Time Management
((SELECT id FROM knowledge_categories WHERE slug='study-skills'), 'article',
 'Effective Time Management for Students',
 'ການຈັດການເວລາຢ່າງມີປະສິດທິພາບສຳລັບນັກຮຽນ',
 E'Time is the great equalizer — everyone gets exactly 24 hours per day, whether you are a student in Vientiane or a CEO in New York. The difference between students who excel and those who struggle often comes down to how they use those hours.\n\n## The 4 Most Common Time Management Mistakes\n\n1. No clear priorities — doing urgent but unimportant tasks first\n2. Procrastination — waiting until the last minute to start assignments\n3. Multitasking — trying to study while watching TV or texting (your brain can''t actually do both)\n4. No planning — not knowing what needs to be done each day\n\n## Practical Strategies That Work\n\n### Weekly Planning (The Sunday Method)\nEvery Sunday, spend 20 minutes planning your week. List all assignments due, tests coming up, and personal commitments. Then block specific times for studying each subject.\n\n### The Two-Minute Rule\nIf something takes less than 2 minutes — reply to that message, file that paper, send that email — do it now. Don''t add it to a list and let it accumulate.\n\n### Time Blocking\nSchedule specific subjects at specific times: "Monday 7–8 PM: Math homework. Tuesday 6–7 PM: English reading." Treat these blocks like fixed appointments.\n\n### Eat the Frog\nStart each day with your hardest or most dreaded task. Once it''s done, everything else feels manageable, and you have momentum.\n\n## Digital Tools That Help Students\n- Google Calendar — for scheduling and reminders\n- Notion — for notes, planning, and project tracking\n- Todoist — for daily task lists with priorities\n- Forest app — blocks phone distractions during study sessions\n\n## The Real Goal\nTime management is not about doing MORE. It is about doing the RIGHT things at the RIGHT time. One focused hour beats three distracted hours every time.',
 E'ທຸກຄົນໄດ້ 24 ຊົ່ວໂມງຕໍ່ວັນ. ຄວາມແຕກຕ່າງລະຫວ່າງນັກຮຽນທີ່ດີເລີດ ແລະ ຜູ້ທີ່ຕໍ່ສູ້ ມັກຂຶ້ນຢູ່ກັບວິທີທີ່ພວກເຂົາໃຊ້ຊົ່ວໂມງເຫຼົ່ານັ້ນ.\n\n## ກົນລະຍຸດທີ່ໄດ້ຜົນ\n- ວາງແຜນທຸກໆວັນອາທິດ\n- ກົດ 2 ນາທີ: ຖ້າໃຊ້ໜ້ອຍກວ່າ 2 ນາທີ ເຮັດດຽວນີ້\n- Time Blocking: ກຳນົດເວລາທ່ອງລ່ວງໜ້າ\n- ເຮັດວຽກທີ່ໜ້ານໍ້າໃຈທີ່ສຸດກ່ອນ\n\n## ເຄື່ອງມືດິຈິທັນ\nGoogle Calendar, Notion, Todoist, Forest App\n\nການຈັດການເວລາໝາຍເຖິງການເຮັດສິ່ງທີ່ຖືກຕ້ອງໃນເວລາທີ່ຖືກຕ້ອງ.',
 'Master your 24 hours: proven strategies to plan, prioritize, and eliminate procrastination.',
 'ຄວບຄຸມ 24 ຊົ່ວໂມງ: ກົນລະຍຸດທີ່ຖືກພິສູດ ເພື່ອວາງແຜນ ຈັດລຳດັບຄວາມສຳຄັນ ແລະ ຂ້າການຜັດຜ່ອນ.',
 'Bitdoin Team', ARRAY['time-management','productivity','planning'], TRUE, FALSE),

-- Life Wisdom: Goal Setting
((SELECT id FROM knowledge_categories WHERE slug='life-wisdom'), 'article',
 'How to Set Goals and Actually Achieve Them',
 'ວິທີຕັ້ງເປົ້າໝາຍ ແລະ ບັນລຸໄດ້ຈິງ',
 E'Most people set goals. Very few actually achieve them. The difference is not willpower — it is strategy.\n\n## Why Goals Fail\nVague goals fail. "I want to get better at math" is not a goal — it is a wish. Goals fail when they are:\n- Not specific enough\n- Not written down\n- Too big with no smaller steps defined\n- Not reviewed regularly\n\n## The SMART Goal Framework\nEvery effective goal should be:\n- Specific: "I will score 80% or above on my next math exam"\n- Measurable: Track progress with numbers\n- Achievable: Challenging but realistic given your current level\n- Relevant: Connected to something that genuinely matters to you\n- Time-bound: "By December 31st"\n\n## The Power of Writing Goals Down\nResearch by Dr. Gail Matthews (Dominican University) showed that people who write their goals down are 42% more likely to achieve them compared to those who do not.\n\n## Break Big Goals into Daily Actions\n1. Set a yearly goal\n2. Break it into monthly milestones\n3. Break milestones into weekly tasks\n4. Break weekly tasks into daily actions\n\nExample:\nGoal: Read 12 books this year\nMonthly: 1 book per month\nWeekly: ~3 chapters per week\nDaily: 20 minutes of reading per day\n\n## Accountability Partners\nTell someone your goal. Better yet, find a partner with the same goal. Studies show you are 65% more likely to achieve a goal if you commit to someone else.\n\nSet the goal. Write it down. Take one step today.',
 E'ຄົນສ່ວນໃຫຍ່ຕັ້ງເປົ້າໝາຍ. ໜ້ອຍຄົນທີ່ສຳເລັດ. ຄວາມແຕກຕ່າງບໍ່ແມ່ນຄວາມໃຈ — ແຕ່ເປັນກົນລະຍຸດ.\n\n## ກອບ SMART\n- Specific: ສະເພາະ\n- Measurable: ວັດແທກໄດ້\n- Achievable: ເຮັດໄດ້\n- Relevant: ກ່ຽວຂ້ອງ\n- Time-bound: ມີກຳນົດເວລາ\n\n## ພະລັງຂອງການຂຽນ\nຜູ້ທີ່ຂຽນເປົ້າໝາຍ ສຳເລັດຫຼາຍກວ່າ 42%. ຂຽນເປົ້າໝາຍ. ເຮັດໜຶ່ງຂັ້ນຕອນໃນວັນນີ້.',
 'A practical guide to setting SMART goals and building daily habits that guarantee steady progress.',
 'ຄູ່ມືການຕັ້ງເປົ້າໝາຍ SMART ແລະ ການສ້າງນິໄສປະຈຳວັນ.',
 'Bitdoin Team', ARRAY['goals','planning','success'], TRUE, FALSE),

-- World Knowledge: Digital Literacy
((SELECT id FROM knowledge_categories WHERE slug='world-knowledge'), 'article',
 'Digital Literacy: Essential Skills for the Modern Student',
 'ຕ້ານດິຈິທັນ: ທັກສະທີ່ຈຳເປັນສຳລັບນັກຮຽນຍຸກໃໝ່',
 E'We live in the information age. Billions of facts are available at our fingertips — but this abundance has a dark side: misinformation, digital addiction, and privacy risks.\n\nDigital literacy is the ability to find, evaluate, create, and communicate information using digital technology effectively and safely.\n\n## Core Digital Literacy Skills\n\n### 1. Evaluating Online Information\nNot everything online is true. Before sharing any information, ask:\n- Who wrote this? What are their credentials?\n- When was this published? Is it recent enough to be relevant?\n- What is the source? (.gov, .edu, or established media outlet?)\n- Is this presented as opinion or fact?\n- Does it cite other credible sources?\n\n### 2. Protecting Your Privacy Online\n- Use strong, unique passwords for each account (use a password manager)\n- Enable two-factor authentication wherever possible\n- Be thoughtful about what personal information you share on social media\n- Read app privacy settings\n- Never click suspicious links — verify first\n\n### 3. Being a Responsible Digital Citizen\n- Think before you post — the internet has a very long memory\n- Treat others respectfully online, even in disagreements\n- Report harmful content rather than ignoring it\n- Give credit when sharing others'' work\n\n### 4. Using AI Tools Ethically\nAI tools like ChatGPT and Gemini are powerful study aids:\n- Do not submit AI-generated work as your own — this is academic dishonesty\n- Use AI to understand concepts, not to avoid learning\n- Always fact-check AI responses — they can and do make errors\n\n## The Most Important Digital Skill\nCritical thinking. In a world of infinite information, the ability to evaluate sources, identify bias, and think clearly is more valuable than any technical skill.\n\nBe smart online. Your digital footprint follows you for a very long time.',
 E'ພວກເຮົາດຳລົງຊີວິດຢູ່ໃນຍຸກຂໍ້ມູນຂ່າວສານ. ຕ້ານດິຈິທັນຄືຄວາມສາມາດໃນການຊອກຫາ ປະເມີນ ສ້າງ ແລະ ສື່ສານຂໍ້ມູນຢ່າງມີປະສິດທິພາບ.\n\n## ທັກສະຫຼັກ\n1. ປະເມີນຂໍ້ມູນອອນລາຍ: ໃຜຂຽນ? ເມື່ອໃດ? ແຫຼ່ງຂໍ້ມູນໜ້າເຊື່ອຖືບໍ?\n2. ປ້ອງກັນຄວາມສ່ວນຕົວ: ລະຫັດຜ່ານທີ່ແຂງແຮງ ແລະ ການຢັ້ງຢືນ 2 ຊັ້ນ\n3. ເປັນພົນລະເມືອງດິຈິທັນທີ່ດີ\n4. ໃຊ້ AI ຢ່າງມີຈັນຍາບັນ\n\nທັກສະດິຈິທັນສຳຄັນທີ່ສຸດຄືການຄິດວິເຄາະ.',
 'In the age of fake news and AI, digital literacy is no longer optional — it is a survival skill.',
 'ໃນຍຸກຂ່າວປອມ ແລະ AI ຕ້ານດິຈິທັນບໍ່ແມ່ນທາງເລືອກ — ມັນຄືທັກສະທີ່ຈຳເປັນ.',
 'Bitdoin Team', ARRAY['digital','technology','skills'], TRUE, FALSE),

-- Career: Finding Your Passion
((SELECT id FROM knowledge_categories WHERE slug='career'), 'article',
 'Finding Your Direction: A Guide for Young People in Laos',
 'ຄົ້ນຫາທິດທາງ: ຄູ່ມືສຳລັບໄວໜຸ່ມລາວ',
 E'Many young people in Laos face the same question: "What should I do with my life?" There is no single perfect answer, but there is a process for finding your direction.\n\n## The Passion Myth\nPop culture tells us to "follow your passion" as if passion is something you find buried under rocks. In reality, passion often develops AFTER you start getting good at something — not before.\n\nCaltech professor Scott Adams (creator of Dilbert) puts it well: "Be so good they can''t ignore you." Master skills first; passion follows.\n\n## Four Questions to Explore What Matters to You\n1. What activities make you lose track of time?\n2. What topics do you read about without anyone asking you to?\n3. What problems in the world make you angry or sad?\n4. What would you do if money was not a concern?\n\n## Opportunities in Laos (2025 and Beyond)\nLaos is developing quickly. Growing sectors include:\n- Technology (software development, digital marketing, e-commerce, AI)\n- Tourism, hospitality, and sustainable travel\n- Agriculture and agritech\n- Education and teacher training\n- Healthcare and public health\n- Entrepreneurship and small business\n- Finance and banking\n\n## The Portfolio Approach\nYou do not have to commit to one path forever. Instead, build a portfolio of skills that open doors in many careers:\n- Strong English (and ideally one other language like Thai, Chinese, or Korean)\n- Digital skills: Excel, basic design, data analysis\n- Communication skills: writing, presenting, listening\n- A track record of delivering results\n\nThese skills compound. A young person with digital skills, strong English, and reliable work habits will have opportunities in almost any field.\n\n## Experiment Freely in Your 20s\nTry things. Volunteer. Take extra courses. Talk to people in jobs that interest you. You cannot think your way to a direction — you have to experience it.\n\nYour direction is not something you find — it is something you build, one decision at a time.',
 E'ໄວໜຸ່ມລາວຫຼາຍຄົນຖາມຕົວເອງ: "ຂ້ອຍຄວນເຮັດຫຍັງກັບຊີວິດ?" ຄວາມຮັກມັກຖືກຄົ້ນພົບຫຼັງຈາກທ່ານດີໃນບາງສິ່ງ.\n\n## 4 ຄຳຖາມ\n1. ກິດຈະກຳໃດທີ່ເຮັດໃຫ້ທ່ານລືມເວລາ?\n2. ຫົວຂໍ້ໃດທີ່ທ່ານອ່ານດ້ວຍຕົນເອງ?\n3. ບັນຫາໃດໃນໂລກທີ່ເຮັດໃຫ້ທ່ານໂກດ?\n4. ທ່ານຈະເຮັດຫຍັງຖ້າເງິນບໍ່ໃຊ່ບັນຫາ?\n\n## ໂອກາດໃນລາວ\n- ເທັກໂນໂລຈີ ແລະ ດິຈິທັນ\n- ການທ່ອງທ່ຽວ\n- ການກະເສດ\n- ການສຶກສາ\n- ສາທາລະນະສຸກ\n- ທຸລະກິດ\n\nທິດທາງຂອງທ່ານບໍ່ແມ່ນສິ່ງທີ່ທ່ານຄົ້ນຫາ — ມັນຄືສິ່ງທີ່ທ່ານສ້າງ.',
 'Feeling lost about your future? This guide helps young people in Laos explore their strengths and find their path.',
 'ສັບສົນກ່ຽວກັບອານາຄົດ? ຄູ່ມືນີ້ຊ່ວຍໄວໜຸ່ມລາວຄົ້ນຫາຈຸດແຂງ ແລະ ຊອກຫາທິດທາງ.',
 'Bitdoin Team', ARRAY['career','passion','laos','youth'], TRUE, TRUE),

-- Life Wisdom: Emotional Intelligence
((SELECT id FROM knowledge_categories WHERE slug='life-wisdom'), 'article',
 'Emotional Intelligence: Why EQ Matters More Than IQ',
 'ສະຕິປັນຍາດ້ານອາລົມ: ເປັນຫຍັງ EQ ສຳຄັນກວ່າ IQ',
 E'You might be brilliant academically, but if you cannot manage your emotions or connect with others, intelligence alone will not take you very far. This is the core insight of Emotional Intelligence (EQ).\n\n## What Is Emotional Intelligence?\nPsychologist Daniel Goleman defines EQ as the ability to:\n1. Recognize your own emotions (self-awareness)\n2. Manage your emotions well (self-regulation)\n3. Stay internally motivated (intrinsic motivation)\n4. Understand others'' emotions (empathy)\n5. Manage relationships skillfully (social skills)\n\n## Why EQ Matters for Students\n- Students with high EQ handle exam stress significantly better\n- They build deeper friendships and experience fewer conflicts\n- They communicate more effectively with teachers and classmates\n- They recover from disappointment and setbacks faster\n- They are more effective in team projects\n\n## How to Develop Your EQ\n\n### Keep a Daily Emotion Journal\nAt the end of each day, spend 5 minutes writing:\n- What strong emotions did I feel today?\n- What triggered them?\n- How did I respond? Was it helpful or harmful?\n\nThis simple practice builds the self-awareness muscle.\n\n### Pause Before You React\nWhen you feel a strong emotion — anger, jealousy, anxiety — take 3 slow deep breaths before responding. The space between feeling and action is where EQ lives.\n\n### Practice Genuine Empathy\nWhen you disagree with someone, try to truly understand their perspective first. Ask yourself: "Why might they think or feel this way?" This does not mean you must agree — it means you understand.\n\n### Learn from Difficult People\nEvery person who frustrates you is an EQ training opportunity. Instead of reacting, observe. What can you learn about yourself from how you respond?\n\n## The Good News\nUnlike IQ, which is largely fixed, EQ can be meaningfully developed at any age with practice. Start today.\n\nIn the long run, how you handle yourself and others matters as much as how smart you are.',
 E'ທ່ານອາດຈະສະຫຼາດ ແຕ່ຖ້າທ່ານຄຸ້ມຄອງອາລົມ ຫຼື ເຊື່ອມຕໍ່ກັບຄົນອື່ນບໍ່ໄດ້ ຄວາມສະຫຼາດຢ່າງດຽວຈະພາທ່ານໄດ້ໄກ.\n\n## 5 ອົງປະກອບຂອງ EQ\n1. ຮູ້ຈັກອາລົມຕົວເອງ\n2. ຄຸ້ມຄອງອາລົມ\n3. ມີແຮງຈູງໃຈ\n4. ເຂົ້າໃຈຄົນອື່ນ\n5. ຈັດການຄວາມສຳພັນ\n\n## ວິທີພັດທະນາ EQ\n- ຂຽນບັນທຶກອາລົມ\n- ຢຸດກ່ອນຕອບໂຕ້\n- ຝຶກຄວາມເຫັນໃຈ\n\nEQ ພັດທະນາໄດ້ດ້ວຍການຝຶກ.',
 'Studies show that emotional intelligence predicts success better than IQ. Here is how to build yours.',
 'ການຄົ້ນຄ້ວາຊີ້ວ່າ EQ ທຳນາຍຄວາມສຳເລັດດີກວ່າ IQ. ວິທີພັດທະນາ EQ ຂອງທ່ານ.',
 'Bitdoin Team', ARRAY['emotional-intelligence','psychology','success'], TRUE, FALSE),

-- World Knowledge: Critical Thinking
((SELECT id FROM knowledge_categories WHERE slug='world-knowledge'), 'article',
 'Critical Thinking: The Most Valuable Skill of the 21st Century',
 'ການຄິດວິເຄາະ: ທັກສະທີ່ມີຄ່າທີ່ສຸດຂອງສັດຕະວັດທີ 21',
 E'Machines can now write essays, generate images, compose music, and even pass medical licensing exams. What can humans do that machines cannot? Think critically.\n\n## What Is Critical Thinking?\nCritical thinking is the disciplined ability to:\n- Analyze information objectively and without bias\n- Identify hidden assumptions and logical gaps\n- Evaluate evidence carefully before accepting a claim\n- Consider multiple perspectives on complex issues\n- Draw well-reasoned, defensible conclusions\n\n## The Misinformation Challenge\nSocial media algorithms are designed to show you content you already agree with — creating echo chambers where your existing beliefs are constantly reinforced. Research by MIT found that false news stories spread 6 times faster on Twitter than true ones. Critical thinking is your defense.\n\n## How to Think More Critically\n\n### Question Everything (Respectfully)\nDo not accept information simply because it comes from an authority figure. Ask:\n- What is the evidence for this claim?\n- What is the quality of that evidence?\n- Are there alternative explanations?\n- What would change my mind on this?\n\n### The Steel Man Technique\nBefore arguing against an idea, first make the STRONGEST possible case FOR it. If you cannot articulate the opposing view fairly and accurately, you do not understand it well enough to disagree effectively.\n\n### Seek Disconfirming Evidence\nMost people naturally look for evidence that confirms what they already believe (confirmation bias). Critical thinkers deliberately seek evidence that might challenge their beliefs.\n\n### Learn Logical Fallacies\nCommon reasoning errors — ad hominem attacks, straw man arguments, false dilemmas, appeals to authority — are easier to spot once you know their names.\n\n## Critical Thinking in Daily Life\n- Evaluating news articles and social media claims\n- Making important financial and career decisions\n- Navigating complex relationships\n- Understanding political and social issues\n\nThe world needs people who ask "why?" and "how do you know?" more than people who simply follow instructions.',
 E'ໃນໂລກທີ່ AI ຂຽນ essay ຜ່ານການສອບເສັງໄດ້ ຄວາມໄດ້ປຽບຂອງມະນຸດຄືການຄິດວິເຄາະ.\n\n## ການຄິດວິເຄາະຄືຫຍັງ?\n- ວິເຄາະຂໍ້ມູນ\n- ລະບຸຂໍ້ສົມມຸດ\n- ພິຈາລະນາຫຼາຍທັດສະນະ\n\n## ວິທີຄິດວິເຄາະ\n- ຖາມທຸກຢ່າງ\n- ຮຽນຮູ້ຈຸດໃຈກາງຂອງຝ່າຍຕ່ງ\n- ຊອກຫາຫຼັກຖານທີ່ຂັດແຍ້ງ\n- ຮຽນຮູ້ logical fallacies\n\nໂລກຕ້ອງການຄົນທີ່ຖາມ "ເປັນຫຍັງ?" ຫຼາຍກວ່ຄົນທີ່ພຽງຕາມ.',
 'In the age of AI and fake news, critical thinking is humanity''s competitive advantage.',
 'ໃນຍຸກ AI ແລະ ຂ່າວປອມ ການຄິດວິເຄາະຄືຄວາມໄດ້ປຽບຂອງມະນຸດ.',
 'Bitdoin Team', ARRAY['critical-thinking','education','21st-century'], TRUE, FALSE),

-- Motivation: 7 Daily Habits (Tip)
((SELECT id FROM knowledge_categories WHERE slug='motivation'), 'tip',
 '7 Daily Habits of Highly Successful Students',
 '7 ນິໄສປະຈຳວັນຂອງນັກຮຽນທີ່ສຳເລັດ',
 E'Success in school — and in life — is rarely about dramatic moments of genius. It is about small habits repeated every single day.\n\n## The 7 Habits\n\n1. Wake up at the same time every day\nYour body thrives on routine. A consistent wake-up time regulates your sleep cycle and gives you more usable, focused hours.\n\n2. Move your body in the morning\nEven 10 minutes of walking, stretching, or light exercise jumpstarts your brain. Physical activity increases blood flow to the prefrontal cortex — the brain region responsible for focus and decision-making.\n\n3. Review your top 3 priorities\nSpend 5 minutes each morning writing down the 3 most important things you need to accomplish today. Not 10 — just 3.\n\n4. Study with full, undivided focus\nOne hour of deep, phone-free study is worth more than three hours of half-distracted studying. Quality over quantity.\n\n5. Read something non-school related daily\nReading broadly — history, science, biographies, fiction — builds background knowledge that makes all subjects easier to understand and connect.\n\n6. Reflect before sleeping\nSpend 5 minutes reviewing: What did I learn today? What confused me? What will I prioritize tomorrow? This review consolidates memories.\n\n7. Protect your sleep (8 hours for teenagers)\nSleep is when your brain consolidates memories and processes everything you learned. Pulling all-nighters literally makes you perform worse on exams. Sleep is not laziness — it is performance optimization.\n\n## Start with Just One\nDo not try to adopt all 7 habits at once. Pick one. Do it every day for 21 days until it becomes automatic. Then add the next.',
 E'ຄວາມສຳເລັດໃນໂຮງຮຽນ ແລະ ໃນຊີວິດ ລ້ວນຢູ່ທີ່ນິໄສນ້ອຍທີ່ທໍາຊ້ຳທຸກວັນ.\n\n## 7 ນິໄສ\n1. ຕື່ນໃນເວລາດຽວກັນທຸກວັນ\n2. ຂາຍຢ່ອນຕອນເຊົ້າ 10 ນາທີ\n3. ຂຽນ 3 ສິ່ງສຳຄັນສຸດຂອງວັນ\n4. ຮຽນດ້ວຍຄວາມສຸດ ບໍ່ມີໂທລະສັບ\n5. ອ່ານສິ່ງນອກໂຮງຮຽນ\n6. ສະທ້ອນ 5 ນາທີ ກ່ອນນອນ\n7. ນອນ 8 ຊົ່ວໂມງ\n\nເລີ່ມດ້ວຍ 1 ນິໄສ ເຮັດ 21 ວັນ ຈາກນັ້ນເພີ່ມໂດຍ.',
 'Seven small daily habits that compound into extraordinary academic and personal results over time.',
 '7 ນິໄສນ້ອຍປະຈຳວັນທີ່ສ້າງຜົນໄດ້ຮັບທາງວິຊາການ ແລະ ສ່ວນຕົວທີ່ຍິ່ງໃຫຍ່.',
 'Bitdoin Team', ARRAY['habits','routine','success'], TRUE, TRUE),

-- Study Skills: Memory Science (Tip)
((SELECT id FROM knowledge_categories WHERE slug='study-skills'), 'tip',
 'The Science of Memory: How to Remember What You Study',
 'ວິທະຍາສາດຂອງຄວາມຊົງຈຳ: ວິທີຈຳສິ່ງທີ່ທ່ານຮຽນ',
 E'Why do you forget 70% of what you learned within 24 hours? And more importantly — what can you do about it?\n\n## The Forgetting Curve\nIn 1885, psychologist Hermann Ebbinghaus discovered that memory decays predictably over time. Without review, you forget:\n- 40% within 20 minutes\n- 70% within 24 hours\n- 90% within one week\n\nBut there is good news: reviewing material at the right intervals dramatically slows this curve.\n\n## The 5 Best Evidence-Based Memory Techniques\n\n1. Spaced Repetition\nReview material at increasing intervals: same day, then next day, then 3 days later, then a week, then a month. Apps like Anki automate this for you.\n\n2. Active Recall\nTest yourself without looking at your notes. This "retrieval practice" is far more effective than re-reading. Use flashcards, practice problems, or simply close your book and write down everything you remember.\n\n3. The Feynman Technique\nStep 1: Choose a concept. Step 2: Explain it in simple language as if teaching a child. Step 3: Identify gaps where your explanation breaks down. Step 4: Go back and fill those gaps.\n\n4. Interleaving\nInstead of studying one topic for 3 hours, mix subjects: 45 min Math, 45 min English, 45 min History. This feels harder but produces significantly better long-term retention.\n\n5. Sleep-Based Consolidation\nSleep is not wasted study time — it is when your brain consolidates memories from short-term to long-term storage. Study, then sleep. Your brain does the rest.\n\n## The Bottom Line\nMemory is not fixed. It is a skill you can improve. Use these techniques consistently and you will be amazed at how much you can retain.',
 E'ເປັນຫຍັງທ່ານຈຶ່ງລືມ 70% ຂອງສິ່ງທີ່ຮຽນພາຍໃນ 24 ຊົ່ວໂມງ? ວິທະຍາສາດຊ່ວຍໄດ້.\n\n## The Forgetting Curve\nຜູ້ຄົ້ນຄ້ວາ Ebbinghaus ສ້າງ Forgetting Curve ທີ່ສະແດງວ່າຄວາມຊົງຈຳຫາຍຢ່າງໄວ ຖ້າບໍ່ທົບທວນ.\n\n## 5 ເຕັກນິກທີ່ດີທີ່ສຸດ\n1. Spaced Repetition: ທົບທວນໃນໄລຍະຫ່າງທີ່ເພີ່ມຂຶ້ນ\n2. Active Recall: ທົດສອບຕົນເອງ ຢ່າເບິ່ງບົດບັນທຶກ\n3. Feynman Technique: ອະທິບາຍຄືການສອນເດັກ\n4. Interleaving: ຜັດສະລັບວິຊາ\n5. ນອນໃຫ້ພໍ: ສະໝອງລວບລວມຄວາມຊົງຈຳລະຫວ່າງນອນ\n\nຄວາມຊົງຈຳບໍ່ໄດ້ຕິດຕົວ. ມັນຄືທັກສະທີ່ຝຶກໄດ້.',
 'Understand the science behind forgetting — and the proven techniques that make knowledge stick.',
 'ເຂົ້າໃຈວິທະຍາສາດຂອງການລືມ ແລະ ເຕັກນິກທີ່ພິສູດແລ້ວວ່າຊ່ວຍໃຫ້ຈຳໄດ້ນານ.',
 'Bitdoin Team', ARRAY['memory','study','science'], TRUE, FALSE);
