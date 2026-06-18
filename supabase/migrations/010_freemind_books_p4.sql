-- ============================================================
-- FreeMind Books — Page 4 (items 73–96)
-- ============================================================

DO $$
DECLARE
  v_bs        uuid;
  v_business  uuid;
  v_religion  uuid;
  v_nonfic    uuid;
  v_education uuid;
  v_children  uuid;
  b           uuid;
BEGIN
  SELECT id INTO v_bs        FROM public.bookstores WHERE name = 'FreeMind Publishing' LIMIT 1;
  SELECT id INTO v_business  FROM public.categories WHERE slug = 'business';
  SELECT id INTO v_religion  FROM public.categories WHERE slug = 'religion';
  SELECT id INTO v_nonfic    FROM public.categories WHERE slug = 'non-fiction';
  SELECT id INTO v_education FROM public.categories WHERE slug = 'education';
  SELECT id INTO v_children  FROM public.categories WHERE slug = 'children';

  -- 73. สำเร็จนอกกรอบ  (฿210)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('สำเร็จนอกกรอบ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ແນວຄິດການສ້າງຄວາມສຳເລັດ ນອກກ້ອງຄວາມຄິດ ດ້ວຍການທ້ອງທ້ຽວ ແລະ ສ້າງເສັ້ນທາງຂອງຕົນເອງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 142800.00, 10.0, 157080.00, 'AVAILABLE', 'THB 210');

  -- 74. สินค้า เปลี่ยนชีวิต  (฿351, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('สินค้า เปลี่ยนชีวิต', 'FreeMind Publishing', 'Thai', v_business,
    'ໜັງສືທີ່ສ້າງຄວາມເຂົ້າໃຈ ວ່າສິນຄ້າດີ ສາມາດປ່ຽນຊີວິດ ດ້ວຍຫຼັກການດ້ານຜະລິດຕະພັນ ແລະ ການຕະຫຼາດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 238680.00, 10.0, 262548.00, 'OUT_OF_STOCK', 'THB 351');

  -- 75. สุขภาพดี อายุ 100 ปี คุณก็มีได้  (฿166, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('สุขภาพดี อายุ 100 ปี คุณก็มีได้', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳດ້ານສຸຂະພາບ ທີ່ຊ່ວຍໃຫ້ດຳລົງຊີວິດ ດ້ວຍສຸຂະພາບດີ ຈົນຮອດ 100 ປີ ດ້ວຍໂພຊະນາການ ແລະ ວິຖີຊີວິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 112880.00, 10.0, 124168.00, 'OUT_OF_STOCK', 'THB 166');

  -- 76. สุขใจในลานธรรม  (฿29)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('สุขใจในลานธรรม', 'FreeMind Publishing', 'Thai', v_religion,
    'ການຄົ້ນຫາຄວາມສຸກໃນລານທຳ ຜ່ານຄຳສອນ ການສວດມົນ ແລະ ການປະຕິບັດ ທີ່ຊ່ວຍໃຫ້ຈິດໃຈສະຫງົບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 19720.00, 10.0, 21692.00, 'AVAILABLE', 'THB 29');

  -- 77. หนังสือ 10X productivity  (฿293)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('หนังสือ 10X productivity ชีวิตดีขึ้นทุกด้านด้วยศาสตร์การจัดการข้อมูลและเวลา', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ເຕັກນິກ 10X ການເຮັດວຽກ ທີ່ຊ່ວຍໃຫ້ຊີວິດດີຂຶ້ນທຸກດ້ານ ດ້ວຍການຈັດການຂໍ້ມູນ ເວລາ ແລະ ຊັບພະຍາກອນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 199240.00, 10.0, 219164.00, 'AVAILABLE', 'THB 293');

  -- 78. หนังสือ ก้าวแรกครั้งที่ร้อย  (฿257)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('หนังสือ ก้าวแรกครั้งที่ร้อย : ล้มแล้ว (ไง) ลุกขึ้นใหม่ (สิวะ) – บาร์จเฉยๆ', 'บาร์จ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ເລື່ອງຂອງການລົ້ມ ແລ້ວ ລຸກຂຶ້ນໃໝ່ ທີ່ໃຫ້ຄວາມກ້າໃຈ ແລະ ໜ້ຳຈາກຄວາມລົ້ມເຫຼວ ດ້ວຍໃຈທີ່ເຂັ້ມແຂງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 174760.00, 10.0, 192236.00, 'AVAILABLE', 'THB 257');

  -- 79. หนังสือ ช่างแม่งเถอะ ดิว วีรวัฒน์ วลัยเสถียร  (฿293)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('หนังสือ ช่างแม่งเถอะ ดิว วีรวัฒน์ วลัยเสถียร', 'ดิว วีรวัฒน์ วลัยเสถียร', 'FreeMind Publishing', 'Thai', v_business,
    'ໜັງສືທີ່ສອນໃຫ້ວາງ ຄິດ ໃຫ້ໄດ້ ລົງມືທຳ ດ້ວຍຄວາມຈິງ ສຳລັບຄົນທີ່ຕ້ອງການຊີວິດທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 199240.00, 10.0, 219164.00, 'AVAILABLE', 'THB 293');

  -- 80. หนังสือ ชุดใกล้หมอชะลอวัย กับหมอแอมป์  (฿589, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('หนังสือ ชุดใกล้หมอชะลอวัย กับหมอแอมป์', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຊຸດໜັງສືດ້ານການຊໍ່ລ້ວ້ຍ ໂດຍໝໍ ທີ່ໃຫ້ຄວາມຮູ້ ດ້ານສຸຂະພາບ ການຊ້ວ້ຍໂຣກ ແລະ ການດູແລສຸຂະພາບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 400520.00, 10.0, 440572.00, 'OUT_OF_STOCK', 'THB 589');

  -- 81. หนังสือ สูตรโกง คนตัวเล็ก โดย แน็ค-ศิวกร  (฿347)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('หนังสือ สูตรโกง คนตัวเล็ก โดย แน็ค-ศิวกร', 'แน็ค-ศิวกร', 'FreeMind Publishing', 'Thai', v_business,
    'ສູດໂກ້ງ ສຳລັບຄົນຕົວເລັກ ທີ່ຕ້ອງການໃຫ່ ດ້ວຍກົນລະຍຸດ ການເຮັດວຽກ ແລະ ການສ້າງໂອກາດໃນໂລກທຸລະກິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 235960.00, 10.0, 259556.00, 'AVAILABLE', 'THB 347');

  -- 82. หนังสือเตรียมสอบ : ผ่านฉลุยตะลุย TU-GET  (฿250)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('หนังสือเตรียมสอบ : ผ่านฉลุยตะลุย TU-GET ฉบับปรับปรุงใหม่', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ TU-GET ສະບັບປັບປຸງໃໝ່ ລວມຂໍ້ສອບ ເຕັກນິກ ແລະ ກົນລະຍຸດ ເພື່ອໄດ້ຄະແນນ TU-GET ສູງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 170000.00, 10.0, 187000.00, 'AVAILABLE', 'THB 250');

  -- 83. หลอดเลือดหัวใจ รู้ไว้! ก่อนจะสาย  (฿192)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('หลอดเลือดหัวใจ รู้ไว้! ก่อนจะสาย', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄວາມຮູ້ດ້ານໂຣກຫຼອດເລືອດຫົວໃຈ ວິທີປ້ອງກັນ ແລະ ການດູແລ ກ່ອນທີ່ຈະສາຍ ສຳລັບທຸກຄົນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 130560.00, 10.0, 143616.00, 'AVAILABLE', 'THB 192');

  -- 84. หิ่งห้อยปีกบางกับการเดินทางของน้ำใส  (฿50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('หิ่งห้อยปีกบางกับการเดินทางของน้ำใส', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານເດັກນ້ອຍ ກ່ຽວກັບຫ່ິງຫ້ອຍ ແລະ ການເດີນທາງ ທີ່ສອນຄຸນຄ່າຂອງທຳມະຊາດ ແລະ ຄວາມສາມັກຄີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 85. อัจฉริยะบนทางสีขาว (ฉบับปรับปรุงใหม่)  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('อัจฉริยะบนทางสีขาว (ฉบับปรับปรุงใหม่)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ການຄົ້ນພົບ ແລະ ພັດທະນາ ສະຕິປັນຍາ ດ້ວຍຈິດໃຈ ທີ່ສ່ວາງ ແລະ ຄວາມຄິດ ທີ່ສ້າງສັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 86. อัญมณีที่ล้ำค่า (The Golden Jewel)  (฿70, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('อัญมณีที่ล้ำค่า (The Golden Jewel)', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານ The Golden Jewel ທີ່ສອນຄຸນຄ່າ ແລະ ຄວາມດີ ທີ່ຊ່ວຍໃນຕົວ ສຳລັບທຸກໄວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'OUT_OF_STOCK', 'THB 70');

  -- 87. อัศจรรย์แห่งที่นี่เดี๋ยวนี้  (฿90)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('อัศจรรย์แห่งที่นี่เดี๋ยวนี้', 'FreeMind Publishing', 'Thai', v_religion,
    'ການຄົ້ນຫາຄວາມອັດສະຈັນ ໃນທີ່ນີ້ ໃນຕອນນີ້ ດ້ວຍສະຕິ ແລະ ຄວາມຕື່ນຕົວ ທີ່ຊ່ວຍໃຫ້ຊີວິດມີຄວາມໝາຍ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 61200.00, 10.0, 67320.00, 'AVAILABLE', 'THB 90');

  -- 88. อาณาจักรขยะหรรษา  (฿50, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('อาณาจักรขยะหรรษา', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານ ແລະ ຄວາມຮູ້ ດ້ານການຈັດການຂີ້ຝຸ່ນ ສ້າງຈິດສຳນຶກ ດ້ານສິ່ງແວດລ້ອມ ສຳລັບເດັກ ແລະ ໄວໜຸ່ມ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'OUT_OF_STOCK', 'THB 50');

  -- 89. อิสรภาพ : กล้าที่จะเป็นตัวของตัวเอง (Freedom)  (฿212, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('อิสรภาพ : กล้าที่จะเป็นตัวของตัวเอง (Freedom)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ນຳໃຫ້ກ້າ ທີ່ຈະເປັນຕົວຂອງຕົວເອງ ດ້ວຍຄວາມອິດສະລະພາບ ທີ່ແທ້ຈິງ ທັງໃຈ ທັງຕົວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 144160.00, 10.0, 158576.00, 'OUT_OF_STOCK', 'THB 212');

  -- 90. ฮวงจุ้ย ชะตาฟ้า คนลิขิต  (฿89, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ฮวงจุ้ย ชะตาฟ้า คนลิขิต (หนังสือมีตำหนิ)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄວາມຮູ້ດ້ານຮ້ວງຈ້ຽ ໂຊ້ຊ້ຕ ແລະ ການລິຂິດຊີວິດ ດ້ວຍຕົນເອງ ໂດຍໃຊ້ຫຼັກ ຮ້ວງຈ້ຽ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'OUT_OF_STOCK', 'THB 89');

  -- 91. ฮวงจุ้ย ทำเลทอง2 เจาะลึกทำเลทองกรุงเทพ  (฿89)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ฮวงจุ้ย ทำเลทอง2 เจาะลึกทำเลทองกรุงเทพ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ເຈາະລຶກທຳເລທອງ ໃນກຸງເທ ດ້ວຍຫຼັກຮ້ວງຈ້ຽ ສຳລັບຜູ້ທີ່ຕ້ອງການ ລົງທຶນ ຫຼື ຊ່ຳໃຊ້ ທຳເລ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'AVAILABLE', 'THB 89');

  -- 92. ฮวงจุ้ยทำเลทอง  (฿89)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ฮวงจุ้ยทำเลทอง (หนังสือมีตำหนิ)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຫຼັກຮ້ວງຈ້ຽ ໃນການເລືອກທຳເລທີ່ດີ ສຳລັບທີ່ຢູ່ ແລະ ທຸລະກິດ ດ້ວຍຄວາມຮູ້ ດ້ານວິທີຊີວິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'AVAILABLE', 'THB 89');

  -- 93. เคล็ดลับชะลอวัย ห่างไกลโรค  (฿251)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เคล็ดลับชะลอวัย ห่างไกลโรค', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄໍ່ລັດ ຊ. ລ. ວ. ຍ ຫ່າງໄກໂຣກ ດ້ວຍ ວິທີດຳລົງຊີວິດ ໂພຊະນາການ ແລະ ກິດຈະກຳ ເໝາ ສຳລັບ ທຸກ ຊ່ວງ ໄວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 170680.00, 10.0, 187748.00, 'AVAILABLE', 'THB 251');

  -- 94. เงินทอง โคตรง่าย  (฿243)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('เงินทอง โคตรง่าย', 'FreeMind Publishing', 'Thai', v_business,
    'ຄວາມຮູ້ ດ້ານການ ຄຸ້ມຄອງ ແລະ ເພີ້ມ ເງີນ ດ້ວຍ ວິທີ ທີ່ ງ່າຍ ສຳລັບ ທຸກ ຄົນ ທີ່ ຕ້ອງ ການ ຄວາມໝ້ານຄົງ ທາງ ດ້ານ ການ ເງີນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 165240.00, 10.0, 181764.00, 'AVAILABLE', 'THB 243');

  -- 95. เชาวน์ปัญญา (Intelligence)  (฿209)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เชาวน์ปัญญา : การตอบสนองอย่างสร้างสรรค์กับปัจจุบันขณะ (Intelligence)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາສະຕິປັນຍາ ແລະ ການຕອບສະໜອງ ຕໍ່ປັດຈຸບັນ ດ້ວຍຄວາມສ່ວາງ ຂອງຈິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 142120.00, 10.0, 156332.00, 'AVAILABLE', 'THB 209');

  -- 96. เชื่อใจ (Trust)  (฿217)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('เชื่อใจ : โอบกอดชีวิตและปล่อยให้ชีวิตเป็นไป (Trust )', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ ນຳໃຫ້ ໂອ້ ກ. ອ. ດ ຊີວິດ ແລະ ປ່ອຍໃຫ້ ຊີວິດ ເປັນໄປ ດ້ວຍຄວາມ ໄວ້ ວາງ ໃຈ ແລະ ການ ຍອມ ຮັບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 147560.00, 10.0, 162316.00, 'AVAILABLE', 'THB 217');

END;
$$;
