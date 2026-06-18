-- ============================================================
-- FreeMind Books — Page 1 (items 1–24)
-- Price formula: THB sale price × 680 = bookstore_price (LAK)
-- Margin: 10% → final_price computed by trigger
-- ============================================================

DO $$
DECLARE
  v_bs        uuid;
  v_business  uuid;
  v_religion  uuid;
  v_nonfic    uuid;
  v_education uuid;
  v_children  uuid;
  v_travel    uuid;
  b           uuid;
BEGIN
  SELECT id INTO v_bs        FROM public.bookstores  WHERE name = 'FreeMind Publishing' LIMIT 1;
  SELECT id INTO v_business  FROM public.categories  WHERE slug = 'business';
  SELECT id INTO v_religion  FROM public.categories  WHERE slug = 'religion';
  SELECT id INTO v_nonfic    FROM public.categories  WHERE slug = 'non-fiction';
  SELECT id INTO v_education FROM public.categories  WHERE slug = 'education';
  SELECT id INTO v_children  FROM public.categories  WHERE slug = 'children';
  SELECT id INTO v_travel    FROM public.categories  WHERE slug = 'travel';

  -- 1. 100 สูตรน้ำดีท็อกซ์  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('100 สูตรน้ำดีท็อกซ์', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ລວບລວມ 100 ສູດນ້ຳດີທ໋ອກຊ໌ ສຳລັບດີທ໋ອກຊ໌ ຮ່າງກາຍ ຟື້ນຟູພະລັງງານ ແລະ ສ້າງສຸຂະພາບທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 2. ABOVE AVERAGE วิธีปลดล็อกศักยภาพ  (฿251)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ABOVE AVERAGE วิธีปลดล็อกศักยภาพ และกลายเป็นคนเหนือ ''ค่าเฉลี่ย''', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳການປົດລ໋ອກສ່ວນທີ່ດີທີ່ສຸດໃນຕົວທ່ານ ແລະ ກ້າວຂ້າມ "ຄ່າສະເລ່ຍ" ດ້ວຍແນວຄິດ ແລະ ວິທີທີ່ພິສູດແລ້ວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 170680.00, 10.0, 187748.00, 'AVAILABLE', 'THB 251');

  -- 3. How to be เศรษฐีพอเพียง  (฿50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('How to be เศรษฐีพอเพียง', 'FreeMind Publishing', 'Thai', v_business,
    'ຄຳແນະນຳການສ້າງຄວາມໝັ້ນຄົງທາງດ້ານການເງິນ ດ້ວຍການດຳລົງຊີວິດທີ່ພໍດີ ໂດຍບໍ່ຕ້ອງສ່ຽງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 4. เคล็ดลับการตลาดที่ทำให้ "ขายดี" จนผลิตไม่ทัน  (฿251, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เคล็ดลับการตลาดที่ทำให้ "ขายดี" จนผลิตไม่ทัน', 'FreeMind Publishing', 'Thai', v_business,
    'ຄຳລັດດ້ານການຕະຫຼາດທີ່ຊ່ວຍໃຫ້ສິນຄ້າຂາຍດີ ຈົນຜະລິດບໍ່ທັນ ດ້ວຍກົນລະຍຸດທີ່ໃຊ້ໄດ້ຈິງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 170680.00, 10.0, 187748.00, 'OUT_OF_STOCK', 'THB 251');

  -- 5. TGAT1 การสื่อสารภาษาอังกฤษ  (฿200, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('TGAT1 การสื่อสารภาษาอังกฤษ', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ TGAT1 ທັກສະການສື່ສານພາສາອັງກິດ ລວມແນວຂໍ້ສອບ ເຕັກນິກ ແລະ ກົນລະຍຸດເພື່ອໄດ້ຄະແນນສູງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 136000.00, 10.0, 149600.00, 'OUT_OF_STOCK', 'THB 200');

  -- 6. The Goal : กระบวนการเพื่อการปรับปรุงที่ไม่หยุดยั้ง  (฿450, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('The Goal : กระบวนการเพื่อการปรับปรุงที่ไม่หยุดยั้ง', 'Eliyahu M. Goldratt', 'FreeMind Publishing', 'Thai', v_business,
    'ໜັງສືຄລາສສິກດ້ານການຄຸ້ມຄອງການຜະລິດ ນຳສະເໜີຂະບວນການປັບປຸງຢ່າງຕໍ່ເນື່ອງ (Theory of Constraints) ທີ່ໄດ້ຮັບການຍອມຮັບທົ່ວໂລກ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 306000.00, 10.0, 336600.00, 'OUT_OF_STOCK', 'THB 450');

  -- 7. The Goal : กระบวนการเพื่อการปรับปรุงที่ไม่หยุดยั้ง (ฉบับปรับปรุงใหม่)  (฿475, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('The Goal : กระบวนการเพื่อการปรับปรุงที่ไม่หยุดยั้ง (ฉบับปรับปรุงใหม่)', 'Eliyahu M. Goldratt', 'FreeMind Publishing', 'Thai', v_business,
    'ສະບັບປັບປຸງໃໝ່ຂອງ The Goal ໜັງສືຄລາສສິກດ້ານການຄຸ້ມຄອງການຜະລິດ Theory of Constraints ທີ່ໄດ້ຮັບການຍອມຮັບທົ່ວໂລກ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 323000.00, 10.0, 355300.00, 'OUT_OF_STOCK', 'THB 475');

  -- 8. The Right Leader Way of 8s for Timeless Leader  (฿413)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('The Right Leader Way of 8s for Timeless Leader', 'FreeMind Publishing', 'Thai', v_business,
    'ຫຼັກການ 8 ຂໍ້ ສຳລັບຜູ້ນຳທີ່ຍືນຍົງ ທີ່ຊ່ວຍສ້າງຜູ້ນຳທີ່ດີ ມີວິໄສທັດ ແລະ ສ້າງຜົນກະທົບໃຫ້ຍາວນານ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 280840.00, 10.0, 308924.00, 'AVAILABLE', 'THB 413');

  -- 9. กระต่ายน้อยจอมเกี่ยงงาน  (฿70)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('กระต่ายน้อยจอมเกี่ยงงาน', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານສຳລັບເດັກນ້ອຍ ກ່ຽວກັບກະຕ່າຍໜ້ອຍທີ່ຮຽນຮູ້ຄວາມຮັບຜິດຊອບ ຄ່ານິຍົມຂອງການຮ່ວມມື ແລະ ຄວາມຂຍັນຫມັ່ນເພຍ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'AVAILABLE', 'THB 70');

  -- 10. กลับบ้านที่แท้จริง (ปกใหม่)  (฿200, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('กลับบ้านที่แท้จริง (ปกใหม่)', 'FreeMind Publishing', 'Thai', v_religion,
    'ຄຳສອນດ້ານສະຕິ ຈາກ Thich Nhat Hanh ທີ່ນຳພາໃຫ້ຄົ້ນພົບຄວາມສະຫງົບ ແລະ ຄວາມສຸກທີ່ແທ້ຈິງ ຢູ່ພາຍໃນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 136000.00, 10.0, 149600.00, 'OUT_OF_STOCK', 'THB 200');

  -- 11. กลัว : หัวใจของปัญญาญาณเพื่อผ่านพ้นพายุ (Fear)  (฿153)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('กลัว : หัวใจของปัญญาญาณเพื่อผ่านพ้นพายุ (Fear)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ເຈາະເລິກຄວາມຢ້ານ ຜ່ານຄວາມເຂົ້າໃຈ ແລະ ປັນຍາ ເພື່ອກ້າວຜ່ານຄວາມຫວາດຢ້ານ ສູ່ອິດສະລະພາບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 104040.00, 10.0, 114444.00, 'AVAILABLE', 'THB 153');

  -- 12. การจัดการการท่องเที่ยวและการพัฒนาชุมชนการท่องเที่ยวภายใต้พลวัตโลก  (฿590)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('การจัดการการท่องเที่ยวและการพัฒนาชุมชนการท่องเที่ยวภายใต้พลวัตโลก', 'FreeMind Publishing', 'Thai', v_travel,
    'ຕຳລາວິຊາການດ້ານການຈັດການທ່ອງທ່ຽວ ແລະ ການພັດທະນາຊຸມຊົນທ່ອງທ່ຽວ ພາຍໃຕ້ໂລກທີ່ປ່ຽນແປງຢ່າງໄວວາ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 401200.00, 10.0, 441320.00, 'AVAILABLE', 'THB 590');

  -- 13. การตลาดแบบผู้ประกอบการ (Entrepreneurial Marketing)  (฿495, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('การตลาดแบบผู้ประกอบการ (Entrepreneurial Marketing)', 'FreeMind Publishing', 'Thai', v_business,
    'ຄຳແນະນຳດ້ານການຕະຫຼາດສຳລັບຜູ້ປະກອບການ ທີ່ຊ່ວຍໃຫ້ທຸລະກິດຂະໜາດນ້ອຍ ສ້າງຕົວ ຂະຫຍາຍ ແລະ ແຂ່ງຂັນໃນຕະຫຼາດໄດ້', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 336600.00, 10.0, 370260.00, 'OUT_OF_STOCK', 'THB 495');

  -- 14. ขจัดไขมันพอกตับด้วยเคล็ดลับที่ง่ายเกินคาด  (฿176, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ขจัดไขมันพอกตับด้วยเคล็ดลับที่ง่ายเกินคาด', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳງ່າຍໆ ໃນການກຳຈັດໄຂມັນພອກຕັບ ດ້ວຍໂພຊະນາການ ແລະ ວິທີດຳລົງຊີວິດທີ່ດີ ທີ່ທຸກຄົນສາມາດປະຕິບັດໄດ້', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 119680.00, 10.0, 131648.00, 'OUT_OF_STOCK', 'THB 176');

  -- 15. ขยับวันละนิด พิชิตปัญหาสุขภาพ  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ขยับวันละนิด พิชิตปัญหาสุขภาพ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ທ່າອອກກຳລັງກາຍງ່າຍໆ ທີ່ເຮັດໄດ້ທຸກວັນ ເພື່ອແກ້ໄຂບັນຫາສຸຂະພາບ ໂດຍບໍ່ຕ້ອງໃຊ້ທຶນຫຼາຍ ຫຼື ອຸປະກອນພິເສດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 16. คมเขี้ยว Startup  (฿226)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('คมเขี้ยว Startup', 'FreeMind Publishing', 'Thai', v_business,
    'ຄຳແນະນຳ ແລະ ປະສົບການຈາກຜູ້ກໍ່ຕັ້ງ Startup ທີ່ຊ່ວຍຜູ້ປະກອບການໃໝ່ ຫຼີກລ່ຽງຄວາມຜິດພາດ ແລະ ສ້າງທຸລະກິດໃຫ້ສຳເລັດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 153680.00, 10.0, 169048.00, 'AVAILABLE', 'THB 226');

  -- 17. ความสุข : ความรุ่งเรืองที่แท้จริงเพียงหนึ่งเดียว (Happiness)  (฿209, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('ความสุข : ความรุ่งเรืองที่แท้จริงเพียงหนึ่งเดียว (Happiness)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາຄວາມສຸກທີ່ແທ້ຈິງ ຊ ຄວາມຮຸ່ງເຮືອງທີ່ບໍ່ຕ້ອງຊອກຫາຈາກສິ່ງພາຍນອກ ແຕ່ຢູ່ພາຍໃນຕົວເຮົາ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 142120.00, 10.0, 156332.00, 'OUT_OF_STOCK', 'THB 209');

  -- 18. ความสุข is here  (฿150)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ความสุข is here', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳການຄົ້ນພົບຄວາມສຸກໃນຊີວິດ ທ່າມກາງຄວາມຫຍຸ້ງຍາກ ດ້ວຍການປ່ຽນທັດສະນະຄະຕິ ແລະ ການຮັບຮູ້ຊີວິດໃໝ່', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 102000.00, 10.0, 112200.00, 'AVAILABLE', 'THB 150');

  -- 19. ความสุข is here เรียกเหมียวๆเดี๋ยวก็มา  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ความสุข is here เรียกเหมียวๆเดี๋ยวก็มา', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ໜັງສື companion ທີ່ຊ່ວຍດຶງດູດຄວາມສຸກ ດ້ວຍວິທີງ່າຍໆ ທີ່ສາມາດນຳໃຊ້ໃນຊີວິດປະຈຳວັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 20. ความเงียบ  (฿149)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('ความเงียบ', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຊວນຄົ້ນຫາຄວາມງຽບ ຄວາມສະຫງົບ ແລະ ຄວາມໝາຍທາງຈິດໃຈ ທີ່ຊ່ອນຢູ່ໃນຄວາມງຽບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 101320.00, 10.0, 111452.00, 'AVAILABLE', 'THB 149');

  -- 21. คัมภีร์สุขภาพดี  (฿495, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('คัมภีร์สุขภาพดี', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຕຳລາສຸຂະພາບດີ ທີ່ລວບລວມຄວາມຮູ້ດ້ານໂພຊະນາການ ການອອກກຳລັງກາຍ ແລະ ການດຳລົງຊີວິດ ເພື່ອສຸຂະພາບທີ່ດີໃນໄລຍະຍາວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 336600.00, 10.0, 370260.00, 'OUT_OF_STOCK', 'THB 495');

  -- 22. คิดรอบบ้าน  (฿70)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('คิดรอบบ้าน', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳດ້ານການຈັດການ ແລະ ດູແລບ້ານ ດ້ວຍຄວາມຄິດສ້າງສັນ ທີ່ຊ່ວຍໃຫ້ຊີວິດໃນເຮືອນສະດວກສະບາຍ ແລະ ໜ້າຢູ່ຂຶ້ນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'AVAILABLE', 'THB 70');

  -- 23. คุณธรรมนำความรู้ (ฉบับปรับปรุงใหม่)  (฿70)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('คุณธรรมนำความรู้ (ฉบับปรับปรุงใหม่)', 'FreeMind Publishing', 'Thai', v_religion,
    'ຫຼັກສູດຄຸນທຳນຳຄວາມຮູ້ ສະບັບປັບປຸງໃໝ່ ທີ່ສອນໃຫ້ຄຸນທຳ ຄວາມດີ ເປັນຮາກຖານຂອງຄວາມສຳເລັດທີ່ຍືນຍົງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'AVAILABLE', 'THB 70');

  -- 24. คุรุวิพากษ์คุรุ  (฿243)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('คุรุวิพากษ์คุรุ', 'FreeMind Publishing', 'Thai', v_education,
    'ການວິເຄາະ ແລະ ວິພາກວ່າດ້ວຍຄູ ໂດຍຄູ ເຈາະເລິກບົດບາດ ຄວາມທ້າທາຍ ແລະ ຄວາມໝາຍຂອງຄູ ໃນສັງຄົມໄທ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 165240.00, 10.0, 181764.00, 'AVAILABLE', 'THB 243');

END;
$$;
