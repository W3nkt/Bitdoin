-- ============================================================
-- FreeMind Books — Pages 5-6 (items 97-123, skip duplicate #115)
-- ============================================================

DO $$
DECLARE
  v_bs        uuid;
  v_religion  uuid;
  v_nonfic    uuid;
  v_education uuid;
  v_children  uuid;
  b           uuid;
BEGIN
  SELECT id INTO v_bs        FROM public.bookstores WHERE name = 'FreeMind Publishing' LIMIT 1;
  SELECT id INTO v_religion  FROM public.categories WHERE slug = 'religion';
  SELECT id INTO v_nonfic    FROM public.categories WHERE slug = 'non-fiction';
  SELECT id INTO v_education FROM public.categories WHERE slug = 'education';
  SELECT id INTO v_children  FROM public.categories WHERE slug = 'children';

  -- 97. เซน : หนทางอันย้อนแย้ง (Zen)  (THB 192, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เซน : หนทางอันย้อนแย้ง (Zen : The Path of Paradox)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາທາງສາຍເຊັ່ນ ດ້ວຍສະຕິ ແລະຄວາມເຂົ້າໃຈທາງຊີວິດຢ່າງເລິກເຊິ່ງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 130560.00, 10.0, 143616.00, 'OUT_OF_STOCK', 'THB 192');

  -- 98. เด็กชายน้ำของ…ตามหาสวรรค์  (THB 50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เด็กชายน้ำของ…ตามหาสวรรค์', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານເດັກຊາຍທີ່ອອກຕາມຫາສວຣຄ໌ ດ້ວຍໃຈທີ່ບໍ່ຍ່ອທ້ ແລະຄວາມຝັນທີ່ຍິ່ງໃຫຍ່', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 99. เด็ดเดี่ยว : เบิกบานกับการมีชีวิตอย่างอันตราย (Courage)  (THB 200)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เด็ดเดี่ยว : เบิกบานกับการมีชีวิตอย่างอันตราย (Courage)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ນໍາໃຫ້ກ້າ ດ້ວຍຄວາມກ້ານທີ່ຊ່ວຍໃຫ້ດໍາລົງຊີວິດໂດຍບໍ່ຢ້ານ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 136000.00, 10.0, 149600.00, 'AVAILABLE', 'THB 200');

  -- 100. เต๋า : วิถีที่ไร้เส้นทาง (Tao : The Pathless Path)  (THB 180)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เต๋า : วิถีที่ไร้เส้นทาง (Tao : The Pathless Path)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ວ່ານດ້ວຍເຕ໋ານ ວິຖີທີ່ໄຮ້ເສ້ນທາງ ດ້ວຍຄວາມເຂົ້າໃຈຢ່າງເລິກ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 122400.00, 10.0, 134640.00, 'AVAILABLE', 'THB 180');

  -- 101. เบิกบานยินดี : ความสุขที่ไม่ต้องแสวงหา (Joy)  (THB 188)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เบิกบานยินดี : ความสุขที่ไม่ต้องแสวงหา (Joy)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຊວນເບິກບານຍິນດີ ດ້ວຍຄວາມສຸກທີ່ບໍ່ຕ້ອງຊອກຫາ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 127840.00, 10.0, 140624.00, 'AVAILABLE', 'THB 188');

  -- 102. เปลี่ยนหุ่นว้าย ให้กลายเป็นว้าว  (THB 125, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เปลี่ยนหุ่นว้าย ให้กลายเป็นว้าว', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄູ່ມືຫຼຸດນໍ້າໜັກ ແລະປ່ຽນຮ່າງກາຍດ້ວຍວິທີທີ່ມີຫຼັກການ ໄດ້ຜົນທາງວິທະຍາສາດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 85000.00, 10.0, 93500.00, 'OUT_OF_STOCK', 'THB 125');

  -- 103. เปิดความคิด ชีวิตอัจฉริยะ  (THB 70, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เปิดความคิด ชีวิตอัจฉริยะ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ການເປີດຄວາມຄິດດ້ວຍວິທີທີ່ສ້າງສັນ ເພື່ອຊີວິດທີ່ສົມບູນ ແລະໜ້າສົນໃຈ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'OUT_OF_STOCK', 'THB 70');

  -- 104. เมตตาอาทร : กลิ่นหอมยามรักผลิบาน (Compassion)  (THB 196, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เมตตาอาทร : กลิ่นหอมยามรักผลิบาน (Compassion)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາເມດຕາ ຄວາມເຫັນໃຈ ດ້ວຍຄວາມຮັກ ແລະຄວາມອ່ອນໂຍນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 133280.00, 10.0, 146608.00, 'OUT_OF_STOCK', 'THB 196');

  -- 105. เรารักษ์ธรรมชาติ เรื่อง น้ำ  (THB 100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เรารักษ์ธรรมชาติ เรื่อง น้ำ', 'FreeMind Publishing', 'Thai', v_children,
    'ໜັງສືສໍາລັບເດັກນ້ອຍທີ່ສອນຄຸນຄ່າຂອງນໍ້າ ແລະການຮັກສາທໍາມະຊາດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 106. เวลานี้ที่เป็นสุข (ปกใหม่)  (THB 183)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เวลานี้ที่เป็นสุข (ปกใหม่)', 'FreeMind Publishing', 'Thai', v_religion,
    'ການຄົ້ນພົບຄວາມສຸກໃນຊ່ວງເວລານີ້ ດ້ວຍສະຕິ ແລະຄວາມຮ່ວງໃຈ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 124440.00, 10.0, 136884.00, 'AVAILABLE', 'THB 183');

  -- 107. เส้นปกติของชีวิต  (THB 50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เส้นปกติของชีวิต', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ການຄົ້ນຫາຄວາມໝາຍຂອງຊ່ວງປົກຕິຂອງຊີວິດ ດ້ວຍທັດສະນະທີ່ສ້າງສັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 108. เสือน้อยผู้รักษาสัญญา  (THB 70)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เสือน้อยผู้รักษาสัญญา', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານເສືອນ້ອຍທີ່ຮັກສາສັນຍາ ສອນຄຸນຄ່າຂອງການຮັກສາຄໍາໝັ້ນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'AVAILABLE', 'THB 70');

  -- 109. แก้เบาหวาน ด้วยรหัสเซอร์เคเดียน  (THB 298)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('แก้เบาหวาน ด้วยรหัสเซอร์เคเดียน', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄູ່ມືແກ້ໂຣກເບົາຫວານດ້ວຍຫຼັກ circadian code ຈັງຫວະຊີວິດ ແລະໂພຊະນາການ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 202640.00, 10.0, 222904.00, 'AVAILABLE', 'THB 298');

  -- 110. แท้จริงแล้ว มนุษย์เป็นสัตว์กินพืช  (THB 50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('แท้จริงแล้ว มนุษย์เป็นสัตว์กินพืช', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄວາມຈິງທາງວິທະຍາສາດທີ່ວ່ານດ້ວຍມະນຸດຜູ້ກິນພືດ ແລະຜົນດີຂອງອາຫານພືດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 111. แนวทางสู่ความสุข (ฉบับปรับปรุง)  (THB 50, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('แนวทางสู่ความสุข (ฉบับปรับปรุง)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ແນວທາງສູ່ຄວາມສຸກ ສະບັບປັບປຸງໃໝ່ ທີ່ຊ່ວຍໃຫ້ຊີວິດດີຂຶ້ນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'OUT_OF_STOCK', 'THB 50');

  -- 112. แล้วภูมิแพ้ จะแพ้เรา!  (THB 213)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('แล้วภูมิแพ้ จะแพ้เรา!', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄູ່ມືແກ້ໄຂ ແລະຈັດການໂຣກພູມແພ້ ດ້ວຍວິທີທີ່ໄດ້ຜົນຈິງ ໄດ້ຮັບການພິສູດໂດຍແພດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 144840.00, 10.0, 159324.00, 'AVAILABLE', 'THB 213');

  -- 113. แอปพลิเคชันบันดาลใจ (Appspriration)  (THB 30)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('แอปพลิเคชันบันดาลใจ (Appspriration) (หนังสือมีตำหนิ)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ການນໍາໃຊ້ແອັບທີ່ດີ ເພື່ອສ້າງແຮງບັນດານໃຈ ແລະພັດທະນາຕົນເອງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 20400.00, 10.0, 22440.00, 'AVAILABLE', 'THB 30');

  -- 114. โยคะสำหรับนักวิ่ง : Yoga for Runners  (THB 150)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('โยคะสำหรับนักวิ่ง : Yoga for Runners', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄູ່ມືໂຍຄະສໍາລັບນັກວິ່ງ ທີ່ຊ່ວຍຍືດເສ້ນກ້ານເນື້ອ ປ້ອງກັນການບາດເຈັບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 102000.00, 10.0, 112200.00, 'AVAILABLE', 'THB 150');

  -- 116. โรงเรียนทำเอง Home-made School  (THB 100, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('โรงเรียนทำเอง Home-made School', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືການສຶກສາທີ່ບ້ານ ສໍາລັບພໍ່ແມ່ທີ່ຕ້ອງການສອນລູກດ້ວຍຕົນເອງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'OUT_OF_STOCK', 'THB 100');

  -- 117. ใครๆ ก็สุขได้  (THB 30, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ใครๆ ก็สุขได้', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄວາມສຸກເປັນສິ່ງທີ່ທຸກຄົນສາມາດຄົ້ນພົບໄດ້ ດ້ວຍວິທີງ່າຍໆໃນຊີວິດປະຈໍາວັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 20400.00, 10.0, 22440.00, 'OUT_OF_STOCK', 'THB 30');

  -- 118. ใครอยากผอม จงเลิกจำกัดแคลอรีซะ!  (THB 209, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ใครอยากผอม จงเลิกจำกัดแคลอรีซะ!', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ວິທີລົດນໍ້າໜັກທີ່ບໍ່ຕ້ອງຈໍາກັດແຄລໍຣີ ດ້ວຍຄວາມຮູ້ດ້ານການເຜາໂພລານ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 142120.00, 10.0, 156332.00, 'OUT_OF_STOCK', 'THB 209');

  -- 119. ใจเปล่าเล่าเปลือย  (THB 50, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ใจเปล่าเล่าเปลือย', 'FreeMind Publishing', 'Thai', v_religion,
    'ການຄົ້ນຫາຄວາມຈິງຂອງຈິດໃຈ ດ້ວຍຄວາມເປີດເຜີຍຕົນເອງຢ່າງບໍ່ຈິກຕົນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'OUT_OF_STOCK', 'THB 50');

  -- 120. ใช้อาหารรักษาโรค  (THB 399)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ใช้อาหารรักษาโรค', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄູ່ມືການໃຊ້ອາຫານເພື່ອຮັກສາໂຣກ ດ້ວຍໂພຊະນາການທີ່ຖືກຕ້ອງ ຮຽນຮູ້ຈາກວິທະຍາສາດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 271320.00, 10.0, 298452.00, 'AVAILABLE', 'THB 399');

  -- 121. ไอน์สไตน์ถาม พระพุทธเจ้าตอบ  (THB 80)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ไอน์สไตน์ถาม พระพุทธเจ้าตอบ', 'FreeMind Publishing', 'Thai', v_religion,
    'ການສົນທະນາລະຫວ່າງວິທະຍາສາດຂອງ Einstein ແລະຄໍາສອນຂອງສາດສະດາ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 54400.00, 10.0, 59840.00, 'AVAILABLE', 'THB 80');

  -- 122. ผ่านฉลุย ตะลุยคณิตศาสตร์ ม.ปลาย (พื้นฐาน)  (THB 336)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุยคณิตศาสตร์ ม.ปลาย (พื้นฐาน)', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບຄະນິດສາດລະດັບ ມ ປາຍ ພື້ນຖານ ລວມເນື້ອຫາທີ່ໃຊ້ໃນການສອບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 228480.00, 10.0, 251328.00, 'AVAILABLE', 'THB 336');

  -- 123. กินดี อยู่นาน คือของขวัญชีวิต  (THB 251)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('กินดี อยู่นาน คือของขวัญชีวิต', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄູ່ມືການກິນດີ ຢູ່ນານ ດ້ວຍໂພຊະນາການທີ່ດີ ແລະວິຖີຊີວິດທີ່ເໝາະສົມ ເພື່ອສຸຂະພາບທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 170680.00, 10.0, 187748.00, 'AVAILABLE', 'THB 251');

END;
$$;
