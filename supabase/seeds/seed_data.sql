-- ============================================================
-- Pwen Books — Demo Seed Data
-- Run this in the Supabase SQL Editor AFTER the migration.
-- ============================================================

-- ─── Bookstores ───────────────────────────────────────────────────────────────

INSERT INTO public.bookstores (id, name, contact_name, phone, whatsapp, address, notes, is_active) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'ຮ້ານໜັງສື ດາວຄຳ',
    'ທ. ສົມສຸກ ວົງຄຳ',
    '+856 20 5511 0001',
    '+85620551100011',
    'ຖ. ສາມແສນໄທ, ວຽງຈັນ',
    'ຮ້ານໜັງສືເກົ່າ ຕັ້ງຢູ່ໃຈກາງ, ຊ່ຽວຊານໜັງສືລາວ',
    true
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'ຮ້ານໜັງສື ສຸດສະໄໝ',
    'ທ. ວິໄລ ພົມມາ',
    '+856 20 5522 0002',
    '+85620552200022',
    'ຖ. ລ້ານຊ້າງ, ວຽງຈັນ',
    'ຊ່ຽວຊານໜັງສືຕ່າງປະເທດ ແລະ ໜັງສືສຶກສາ',
    true
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'ຮ້ານໜັງສື ໂລກ',
    'ນ. ຈັນທະລາ ສຸ',
    '+856 20 5533 0003',
    '+85620553300033',
    'ຕະຫຼາດ ດົງໜອກ, ວຽງຈັນ',
    'ຮ້ານໃຫຍ່ ມີໜັງສືຫຼາຍຫົວ ທັງ English ແລະ Lao',
    true
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'ຮ້ານໜັງສື ລາວ-ໄທ',
    'ທ. ບຸນຖ້ວນ ຄຳ',
    '+856 20 5544 0004',
    '+85620554400044',
    'ໂຊນ 3, ວຽງຈັນ',
    'ຊ່ຽວຊານໜັງສືລາວ ແລະ ໄທ ລາຄາດີ',
    true
  );

-- ─── Books ────────────────────────────────────────────────────────────────────

INSERT INTO public.books (id, isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active) VALUES

-- ── Fiction ──────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000001',
  '9780062315007',
  'The Alchemist',
  'Paulo Coelho',
  'HarperOne',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'fiction'),
  'A philosophical novel following a young Andalusian shepherd named Santiago who yearns to travel in search of a worldly treasure. A global phenomenon with over 65 million copies sold.',
  197,
  '1988-01-01',
  'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
  true
),
(
  'a1000000-0000-0000-0000-000000000002',
  '9780451524935',
  '1984',
  'George Orwell',
  'Signet Classic',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'fiction'),
  'A dystopian masterpiece set in a totalitarian future. Winston Smith secretly begins to question the all-controlling Party. One of the most important books of the 20th century.',
  328,
  '1949-06-08',
  'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',
  true
),
(
  'a1000000-0000-0000-0000-000000000003',
  NULL,
  'ດອກໄມ້ຕ້ານລົມຝົນ',
  'ບຸນເຮືອງ ສົມຈິດ',
  'ສຳນັກພິມລາວ',
  'Lao',
  (SELECT id FROM public.categories WHERE slug = 'fiction'),
  'ນວນິຍາຍທີ່ເລົ່າເລື່ອງຂອງໜຸ່ມສາວລາວ ທີ່ຕໍ່ສູ້ກັບຊີວິດ ຄວາມຝັນ ແລະ ຄວາມຮັກ ໃນສັງຄົມລາວທີ່ປ່ຽນແປງ. ຜູ້ຂຽນສ່ອງ​ໃຫ້​ເຫັນ​ຄຸນຄ່າ​ທາງ​ວັດທະນາທຳ​ລາວ.',
  285,
  '2022-03-15',
  'https://picsum.photos/seed/laofic01/300/450',
  true
),

-- ── Business ──────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000004',
  '9781612680194',
  'Rich Dad Poor Dad',
  'Robert T. Kiyosaki',
  'Plata Publishing',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'business'),
  'The #1 Personal Finance book of all time. Kiyosaki shares what the rich teach their kids about money that the poor and middle class do not — challenging conventional wisdom about money.',
  336,
  '1997-04-01',
  'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg',
  true
),
(
  'a1000000-0000-0000-0000-000000000005',
  '9781585424337',
  'Think and Grow Rich',
  'Napoleon Hill',
  'TarcherPerigee',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'business'),
  'A landmark bestseller born from Hill''s research studying successful men and women. Outlines 13 principles for achieving financial success — one of the best-selling books of all time.',
  320,
  '1937-03-26',
  'https://covers.openlibrary.org/b/isbn/9781585424337-L.jpg',
  true
),
(
  'a1000000-0000-0000-0000-000000000006',
  NULL,
  'ທຸລະກິດ ສຳລັບຄົນລາວ',
  'ພຸດທະສອນ ໄຊຍະວົງ',
  'ສຳນັກພິມ ວຽງຈັນ',
  'Lao',
  (SELECT id FROM public.categories WHERE slug = 'business'),
  'ຄູ່ມືທຸລະກິດ ສຳລັບຜູ້ປະກອບການລາວ ຕັ້ງແຕ່ການວາງແຜນ ການຫາທຶນ ຈົນເຖິງການຂະຫຍາຍຕົວ. ອ່ານງ່າຍ ໃຊ້ໄດ້ຈິງ.',
  210,
  '2023-01-10',
  'https://picsum.photos/seed/laobiz01/300/450',
  true
),

-- ── Science ───────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000007',
  '9780553380163',
  'A Brief History of Time',
  'Stephen Hawking',
  'Bantam Books',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'science'),
  'A landmark in science writing. Hawking explores the nature of time, the Big Bang, black holes, and the ultimate fate of the universe in a way accessible to every reader.',
  212,
  '1988-04-01',
  'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg',
  true
),
(
  'a1000000-0000-0000-0000-000000000008',
  '9780062316097',
  'Sapiens: A Brief History of Humankind',
  'Yuval Noah Harari',
  'Harper',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'science'),
  'A provocative and wide-ranging history of humankind. How did Homo sapiens come to dominate the world? Harari explores biology, history, and human culture in a gripping narrative.',
  464,
  '2011-01-01',
  'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',
  true
),

-- ── Children ──────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000009',
  NULL,
  'ນິທານລາວ 5 ນາທີ',
  'ທີ່ລວບລວມ ໂດຍ ສຳນັກພິມ ດາວຄຳ',
  'ສຳນັກພິມ ດາວຄຳ',
  'Lao',
  (SELECT id FROM public.categories WHERE slug = 'children'),
  'ລວມນິທານລາວດັ້ງເດີມ ສຳລັບເດັກນ້ອຍ ທີ່ອ່ານໄດ້ໃນ 5 ນາທີ. ມີຮູບປະກອບສີສັນງາມ ແລະ ສອນຄຸນທຳ. ເໝາະສຳລັບກ່ອນນອນ.',
  128,
  '2021-06-01',
  'https://picsum.photos/seed/laokids01/300/450',
  true
),
(
  'a1000000-0000-0000-0000-000000000010',
  '9780399226908',
  'The Very Hungry Caterpillar',
  'Eric Carle',
  'Philomel Books',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'children'),
  'A beloved classic celebrating over 50 years in print. A tiny caterpillar eats through a variety of foods before forming a cocoon and emerging as a butterfly. Perfect for young readers.',
  26,
  '1969-06-03',
  'https://covers.openlibrary.org/b/isbn/9780399226908-L.jpg',
  true
),

-- ── History ───────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000011',
  NULL,
  'ປະຫວັດລາວ ໂບຮານ',
  'ຮສ. ດຣ. ມາໄລທອງ ສີທີຮາດ',
  'ສຳນັກພິມ ມະຫາວິທະຍາໄລ ແຫ່ງຊາດ',
  'Lao',
  (SELECT id FROM public.categories WHERE slug = 'history'),
  'ປຶ້ມທີ່ບັນທຶກປະຫວັດສາດລາວ ຕັ້ງແຕ່ຍຸກໂບຮານ ຈົນເຖິງສະໄໝໃໝ່. ອ້າງອີງເອກະສານຊັ້ນຕົ້ນ ເໝາະສຳລັບນັກສຶກສາ ແລະ ຜູ້ທີ່ສົນໃຈ.',
  480,
  '2019-11-20',
  'https://picsum.photos/seed/laohist01/300/450',
  true
),
(
  'a1000000-0000-0000-0000-000000000012',
  '9780393354324',
  'Guns, Germs, and Steel',
  'Jared Diamond',
  'W. W. Norton',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'history'),
  'Winner of the Pulitzer Prize. A brilliant account of why some civilizations came to dominate others. Diamond explores how geography and environment shaped global history.',
  480,
  '1997-03-01',
  'https://covers.openlibrary.org/b/isbn/9780393354324-L.jpg',
  true
),

-- ── Biography ─────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000013',
  NULL,
  'ຊີວິດຂ້ອຍ: ຄວາມຝັນ ແລະ ຄວາມຈິງ',
  'ຄຳທອງ ວົງສາ',
  'ສຳນັກພິມ ທ້ອງຖິ່ນ',
  'Lao',
  (SELECT id FROM public.categories WHERE slug = 'biography'),
  'ບົດບັນທຶກຊີວິດທີ່ຫ້າວຫານ ຂອງນັກທຸລະກິດຊັ້ນນຳລາວ ທີ່ສ້າງຕົນ ຈາກສູນ ຈົນກາຍເປັນຜູ້ປະສົບຜົນສຳເລັດ. ບົດຮຽນທີ່ທຸກຄົນສາມາດນຳໃຊ້ໄດ້.',
  312,
  '2023-05-15',
  'https://picsum.photos/seed/laobio01/300/450',
  true
),
(
  'a1000000-0000-0000-0000-000000000014',
  '9781451648539',
  'Steve Jobs',
  'Walter Isaacson',
  'Simon & Schuster',
  'English',
  (SELECT id FROM public.categories WHERE slug = 'biography'),
  'The exclusive biography of Apple''s co-founder. Based on over 40 interviews with Jobs. An intimate portrait of the creative entrepreneur who changed six industries.',
  656,
  '2011-10-24',
  'https://covers.openlibrary.org/b/isbn/9781451648539-L.jpg',
  true
),

-- ── Education ─────────────────────────────────────────────────────────────────
(
  'a1000000-0000-0000-0000-000000000015',
  NULL,
  'ຄູ່ມືຮຽນພາສາອັງກິດ ດ້ວຍຕົນເອງ',
  'ອາຈານ ສີທອງ ຄຳວົງ',
  'ສຳນັກພິມ ການສຶກສາ',
  'Lao',
  (SELECT id FROM public.categories WHERE slug = 'education'),
  'ຄູ່ມືຮຽນພາສາອັງກິດ ສຳລັບຄົນລາວ ທີ່ຕ້ອງການຮຽນດ້ວຍຕົນເອງ. ມີຕົວຢ່າງ, ຄຳສັບ, ການອອກສຽງ ແລະ ແບບຝຶກຫັດ.',
  350,
  '2022-08-01',
  'https://picsum.photos/seed/laoedu01/300/450',
  true
);

-- ─── Book Prices ──────────────────────────────────────────────────────────────
-- final_price is auto-computed by trigger; we also provide explicit values

INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, last_checked_at) VALUES

-- The Alchemist
('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 120000, 8.0,  129600, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 115000, 7.0,  123050, 'AVAILABLE', now()),

-- 1984
('a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 95000,  8.0,  102600, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 98000,  7.0,  104860, 'LOW_STOCK', now()),

-- ດອກໄມ້ຕ້ານລົມຝົນ
('a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 45000,  5.0,  47250,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 42000,  6.0,  44520,  'AVAILABLE', now()),

-- Rich Dad Poor Dad
('a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 130000, 10.0, 143000, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 140000, 10.0, 154000, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 135000, 8.0,  145800, 'LOW_STOCK', now()),

-- Think and Grow Rich
('a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002', 110000, 10.0, 121000, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 115000, 10.0, 126500, 'AVAILABLE', now()),

-- ທຸລະກິດ ສຳລັບຄົນລາວ
('a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 55000,  10.0, 60500,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000004', 52000,  10.0, 57200,  'AVAILABLE', now()),

-- A Brief History of Time
('a1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 150000, 8.0,  162000, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000003', 145000, 7.0,  155150, 'AVAILABLE', now()),

-- Sapiens
('a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 160000, 8.0,  172800, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 155000, 8.0,  167400, 'AVAILABLE', now()),

-- ນິທານລາວ 5 ນາທີ
('a1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000001', 30000,  10.0, 33000,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000004', 28000,  10.0, 30800,  'AVAILABLE', now()),

-- The Very Hungry Caterpillar
('a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 65000,  10.0, 71500,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000003', 68000,  10.0, 74800,  'LOW_STOCK', now()),

-- ປະຫວັດລາວ ໂບຮານ
('a1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000001', 70000,  5.0,  73500,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000004', 68000,  6.0,  72080,  'LOW_STOCK', now()),

-- Guns, Germs, and Steel
('a1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000002', 180000, 8.0,  194400, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000003', 175000, 8.0,  189000, 'AVAILABLE', now()),

-- ຊີວິດຂ້ອຍ
('a1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000001', 60000,  5.0,  63000,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000004', 58000,  6.0,  61480,  'AVAILABLE', now()),

-- Steve Jobs
('a1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000002', 170000, 8.0,  183600, 'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000003', 165000, 8.0,  178200, 'AVAILABLE', now()),

-- ຄູ່ມືຮຽນພາສາອັງກິດ
('a1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000001', 40000,  5.0,  42000,  'AVAILABLE', now()),
('a1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000004', 38000,  6.0,  40280,  'AVAILABLE', now());

-- ─── Margin Rules ─────────────────────────────────────────────────────────────

INSERT INTO public.margin_rules (name, bookstore_id, category_id, min_price, max_price, margin_percent, priority, is_active) VALUES
  -- Bookstore rule: Soudsamay (Store 2) charges 8% for all its books
  ('ສຸດສະໄໝ — ອັດຕາມາດຕາຖານ', 'b1000000-0000-0000-0000-000000000002', NULL, NULL, NULL, 8.0, 10, true),

  -- Category rule: Business books = 10%
  ('ໝວດທຸລະກິດ 10%', NULL, (SELECT id FROM public.categories WHERE slug = 'business'), NULL, NULL, 10.0, 20, true),

  -- Category rule: Children books = 10%
  ('ໝວດໜັງສືເດັກ 10%', NULL, (SELECT id FROM public.categories WHERE slug = 'children'), NULL, NULL, 10.0, 20, true),

  -- Price-range rule: books over 150,000 LAK = 12% (premium import)
  ('ໜັງສືລາຄາສູງ (>150k LAK) 12%', NULL, NULL, 150000, NULL, 12.0, 30, true);

-- ─── Demo Users ───────────────────────────────────────────────────────────────
-- Inserted directly into public.users for display in admin panel.
-- These are NOT linked to auth.users — for demo purposes only.

INSERT INTO public.users (id, name, phone, email, role, language, currency) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'ທ. ສົມສຸກ ວົງໄຊ',  '+856 20 9911 2233', 'somsook@demo.pwen.la', 'CUSTOMER', 'lo', 'LAK'),
  ('c1000000-0000-0000-0000-000000000002', 'ນ. ມາລີ ດາວວົງ',    '+856 20 9922 3344', 'malee@demo.pwen.la',   'CUSTOMER', 'lo', 'LAK');

-- ─── Demo Orders ──────────────────────────────────────────────────────────────

-- ── Order 1: PROCESSING — payment verified, awaiting bookstore pickup ─────────
INSERT INTO public.orders (
  id, order_number, customer_id, status, payment_status,
  subtotal_amount, total_amount, currency,
  customer_name, customer_phone, delivery_address, notes, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'PB-2024-0001',
  'c1000000-0000-0000-0000-000000000001',
  'PROCESSING', 'VERIFIED',
  272600, 272600, 'LAK',
  'ທ. ສົມສຸກ ວົງໄຊ', '+856 20 9911 2233',
  'ບ້ານ ໂນນສະຫວ່າງ, ຖ. ທ່ານລ, ໜ່ວຍ 15, ວຽງຈັນ',
  'ກະລຸນາໂທຫາກ່ອນສົ່ງ ຂ້ອຍຢູ່ບ່ອນເຮັດວຽກ',
  now() - interval '2 days'
);

INSERT INTO public.order_items (order_id, book_id, bookstore_id, quantity, bookstore_price, margin_percent, final_price, fulfillment_status) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 1, 120000, 8.0,  129600, 'PROCESSING'),
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 1, 130000, 10.0, 143000, 'PROCESSING');

INSERT INTO public.payments (
  order_id, user_id, method, amount, currency,
  verification_status, ai_confidence_score, ai_extracted_data,
  transaction_reference, sender_name, bank_name, transferred_at, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'QR_PAYMENT', 272600, 'LAK',
  'VERIFIED', 96.50,
  '{"amount": 272600, "date": "2024-01-15", "sender": "ສົມສຸກ ວົງໄຊ", "bank": "BCEL", "transaction_id": "TXN20240115001"}',
  'TXN20240115001', 'ສົມສຸກ ວົງໄຊ', 'BCEL',
  now() - interval '2 days' + interval '30 minutes',
  now() - interval '2 days' + interval '25 minutes'
);

-- ── Order 2: PAYMENT_REVIEW — AI low confidence, needs manual verification ────
INSERT INTO public.orders (
  id, order_number, customer_id, status, payment_status,
  subtotal_amount, total_amount, currency,
  customer_name, customer_phone, delivery_address, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000002',
  'PB-2024-0002',
  'c1000000-0000-0000-0000-000000000002',
  'PAYMENT_REVIEW', 'REQUIRES_REVIEW',
  345600, 345600, 'LAK',
  'ນ. ມາລີ ດາວວົງ', '+856 20 9922 3344',
  'ບ້ານ ຫາດດ່ານ, ຖ. ລ້ານຊ້າງ, ວຽງຈັນ',
  now() - interval '5 hours'
);

INSERT INTO public.order_items (order_id, book_id, bookstore_id, quantity, bookstore_price, margin_percent, final_price, fulfillment_status) VALUES
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 2, 160000, 8.0, 172800, 'PROCESSING');

INSERT INTO public.payments (
  order_id, user_id, method, amount, currency,
  verification_status, ai_confidence_score, ai_extracted_data,
  sender_name, bank_name, transferred_at, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000002',
  'BANK_TRANSFER', 345600, 'LAK',
  'REQUIRES_REVIEW', 72.30,
  '{"amount": 350000, "date": "2024-01-16", "sender": "ມ. ດາວວົງ", "bank": "LDB", "confidence_issues": ["amount_mismatch_5k", "name_partial_match"]}',
  'ມ. ດາວວົງ', 'LDB',
  now() - interval '4 hours',
  now() - interval '5 hours'
);

-- ── Order 3: SHIPPED — payment verified, in transit with tracking ──────────────
INSERT INTO public.orders (
  id, order_number, customer_id, status, payment_status,
  subtotal_amount, total_amount, currency,
  customer_name, customer_phone, delivery_address, notes, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000003',
  'PB-2024-0003',
  'c1000000-0000-0000-0000-000000000001',
  'SHIPPED', 'VERIFIED',
  106280, 106280, 'LAK',
  'ທ. ສົມສຸກ ວົງໄຊ', '+856 20 9911 2233',
  'ບ້ານ ໂນນສະຫວ່າງ, ຖ. ທ່ານລ, ໜ່ວຍ 15, ວຽງຈັນ',
  'ສ່ງໄດ້ທຸກມື້ ເວລາ 9 ໂມງ - 5 ໂມງແລງ',
  now() - interval '5 days'
);

INSERT INTO public.order_items (order_id, book_id, bookstore_id, quantity, bookstore_price, margin_percent, final_price, fulfillment_status) VALUES
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000001', 2, 30000, 10.0, 33000,  'SHIPPED'),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000004', 1, 38000, 6.0,  40280,  'SHIPPED');

INSERT INTO public.payments (
  order_id, user_id, method, amount, currency,
  verification_status, ai_confidence_score, ai_extracted_data,
  transaction_reference, sender_name, bank_name, transferred_at, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  'QR_PAYMENT', 106280, 'LAK',
  'VERIFIED', 98.10,
  '{"amount": 106280, "date": "2024-01-12", "sender": "ສົມສຸກ ວົງໄຊ", "bank": "BCEL", "transaction_id": "TXN20240112003"}',
  'TXN20240112003', 'ສົມສຸກ ວົງໄຊ', 'BCEL',
  now() - interval '5 days' + interval '20 minutes',
  now() - interval '5 days' + interval '15 minutes'
);

INSERT INTO public.deliveries (order_id, courier, tracking_number, status, shipped_at, estimated_delivery_at, notes) VALUES
  (
    'd1000000-0000-0000-0000-000000000003',
    'Unitel Logistics',
    'UTL-2024-88821',
    'SHIPPED',
    now() - interval '3 days',
    now() + interval '1 day',
    'ຈັດສົ່ງໃນໂມງທຳການ 09:00–17:00 ຈ-ສ'
  );

-- ── Order 4: PENDING_PAYMENT — just placed, waiting for receipt upload ─────────
INSERT INTO public.orders (
  id, order_number, customer_id, status, payment_status,
  subtotal_amount, total_amount, currency,
  customer_name, customer_phone, delivery_address, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000004',
  'PB-2024-0004',
  'c1000000-0000-0000-0000-000000000002',
  'PENDING_PAYMENT', 'PENDING',
  183600, 183600, 'LAK',
  'ນ. ມາລີ ດາວວົງ', '+856 20 9922 3344',
  'ບ້ານ ຫາດດ່ານ, ຖ. ລ້ານຊ້າງ, ວຽງຈັນ',
  now() - interval '1 hour'
);

INSERT INTO public.order_items (order_id, book_id, bookstore_id, quantity, bookstore_price, margin_percent, final_price, fulfillment_status) VALUES
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000002', 1, 170000, 8.0, 183600, 'PROCESSING');

-- ── Order 5: DELIVERED — completed order ──────────────────────────────────────
INSERT INTO public.orders (
  id, order_number, customer_id, status, payment_status,
  subtotal_amount, total_amount, currency,
  customer_name, customer_phone, delivery_address, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000005',
  'PB-2024-0005',
  'c1000000-0000-0000-0000-000000000001',
  'DELIVERED', 'VERIFIED',
  102600, 102600, 'LAK',
  'ທ. ສົມສຸກ ວົງໄຊ', '+856 20 9911 2233',
  'ບ້ານ ໂນນສະຫວ່າງ, ວຽງຈັນ',
  now() - interval '10 days'
);

INSERT INTO public.order_items (order_id, book_id, bookstore_id, quantity, bookstore_price, margin_percent, final_price, fulfillment_status) VALUES
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 1, 95000, 8.0, 102600, 'DELIVERED');

INSERT INTO public.payments (
  order_id, user_id, method, amount, currency,
  verification_status, ai_confidence_score, ai_extracted_data,
  transaction_reference, sender_name, bank_name, transferred_at, created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000005',
  'c1000000-0000-0000-0000-000000000001',
  'QR_PAYMENT', 102600, 'LAK',
  'VERIFIED', 99.00,
  '{"amount": 102600, "date": "2024-01-08", "sender": "ສົມສຸກ ວົງໄຊ", "bank": "BCEL", "transaction_id": "TXN20240108005"}',
  'TXN20240108005', 'ສົມສຸກ ວົງໄຊ', 'BCEL',
  now() - interval '10 days' + interval '15 minutes',
  now() - interval '10 days' + interval '10 minutes'
);

INSERT INTO public.deliveries (order_id, courier, tracking_number, status, shipped_at, delivered_at, estimated_delivery_at) VALUES
  (
    'd1000000-0000-0000-0000-000000000005',
    'Anousith Express',
    'ANS-2024-55512',
    'DELIVERED',
    now() - interval '8 days',
    now() - interval '6 days',
    now() - interval '7 days'
  );

-- ─── Recommendations (for future use / analytics) ─────────────────────────────

INSERT INTO public.recommendations (book_id, type, score, metadata) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'featured', 95.0, '{"reason":"global_bestseller"}'),
  ('a1000000-0000-0000-0000-000000000004', 'featured', 93.0, '{"reason":"popular_business"}'),
  ('a1000000-0000-0000-0000-000000000008', 'featured', 92.0, '{"reason":"staff_pick"}'),
  ('a1000000-0000-0000-0000-000000000012', 'featured', 90.0, '{"reason":"award_winner"}'),
  ('a1000000-0000-0000-0000-000000000014', 'featured', 89.0, '{"reason":"bestseller"}'),
  ('a1000000-0000-0000-0000-000000000007', 'featured', 88.0, '{"reason":"classic_science"}'),
  ('a1000000-0000-0000-0000-000000000003', 'featured', 87.0, '{"reason":"local_author"}'),
  ('a1000000-0000-0000-0000-000000000009', 'featured', 85.0, '{"reason":"popular_lao"}'),
  ('a1000000-0000-0000-0000-000000000002', 'trending', 94.0, '{"reason":"high_views"}'),
  ('a1000000-0000-0000-0000-000000000005', 'trending', 91.0, '{"reason":"high_sales"}'),
  ('a1000000-0000-0000-0000-000000000006', 'trending', 89.0, '{"reason":"new_local"}'),
  ('a1000000-0000-0000-0000-000000000010', 'trending', 88.0, '{"reason":"seasonal"}'),
  ('a1000000-0000-0000-0000-000000000011', 'trending', 87.0, '{"reason":"academic_season"}'),
  ('a1000000-0000-0000-0000-000000000013', 'trending', 86.0, '{"reason":"local_author"}'),
  ('a1000000-0000-0000-0000-000000000015', 'trending', 85.0, '{"reason":"high_demand"}');
