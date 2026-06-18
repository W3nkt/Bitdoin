-- ============================================================
-- FreeMind Books — Page 3 (items 49–72)
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

  -- 49. ผ่านฉลุย ตะลุย TOEIC ฉบับปรับปรุงใหม่  (฿228)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุย TOEIC ฉบับปรับปรุงใหม่', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ TOEIC ສະບັບປັບປຸງໃໝ່ ຮອງຮັບຮູບແບບຂໍ້ສອບລ່າສຸດ ລວມຂໍ້ສອບ Listening ແລະ Reading ຄົບຖ້ວນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 155040.00, 10.0, 170544.00, 'AVAILABLE', 'THB 228');

  -- 50. ผ่านฉลุย ตะลุย ภาษาอังกฤษ สอบเข้า ม.4  (฿236)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุย ภาษาอังกฤษ สอบเข้า ม.4', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບພາສາອັງກິດ ສຳລັບສອບເຂົ້າ ມ. 4 ລວມຂໍ້ສອບ ແລະ ເຕັກນິກ ສຳລັບນັກຮຽນ ມ. 3 ທຸກຄົນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 160480.00, 10.0, 176528.00, 'AVAILABLE', 'THB 236');

  -- 51. ผ่านฉลุย ตะลุยภาษาไทย ป.6 (ฉบับเตรียมสอบ)  (฿93)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุยภาษาไทย ป.6 (ฉบับเตรียมสอบ)', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບພາສາໄທ ລະດັບ ປ. 6 ລວມເນື້ອຫາ ຄຳສັບ ໄວຍາກອນ ແລະ ຕົວຢ່າງຂໍ້ສອບ ເໝາະສຳລັບນັກຮຽນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 63240.00, 10.0, 69564.00, 'AVAILABLE', 'THB 93');

  -- 52. ผ่านฉลุย ตะลุยภาษาไทย ม.3 (ฉบับเตรียมสอบ)  (฿113)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุยภาษาไทย ม.3 (ฉบับเตรียมสอบ)', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບພາສາໄທ ລະດັບ ມ. 3 ລວມເນື້ອຫາ ຕົວຢ່າງ ແລະ ເຕັກນິກ ສຳລັບຜູ້ກຽມສອບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 76840.00, 10.0, 84524.00, 'AVAILABLE', 'THB 113');

  -- 53. ผ่านฉลุย ตะลุยภาษาไทย ม.ปลาย  (฿133)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุยภาษาไทย ม.ปลาย (คู่มือเตรียมสอบเข้าศึกษาต่อระดับอุดมศึกษา)', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບພາສາໄທ ລະດັບ ມ. ປາຍ ສຳລັບສອບເຂົ້າມະຫາວິທະຍາໄລ ລວມເນື້ອຫາ ຕົວຢ່າງ ແລະ ເຕັກນິກ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 90440.00, 10.0, 99484.00, 'AVAILABLE', 'THB 133');

  -- 54. ผ่านฉลุย ตะลุยศัพท์ TOEIC  (฿236)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุยศัพท์ TOEIC', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືຝຶກຄຳສັບ TOEIC ທີ່ຈຳເປັນ ລວມຄຳສັບ ສຳນວນ ແລະ ການໃຊ້ຕາມ context ທີ່ໃຊ້ງານໄດ້ຈິງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 160480.00, 10.0, 176528.00, 'AVAILABLE', 'THB 236');

  -- 55. พลังสร้างสรรค์ : ของกำนัลแด่ผู้ฉีกกรอบ (Creativity)  (฿188, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('พลังสร้างสรรค์ : ของกำนัลแด่ผู้ฉีกกรอบ (Creativity)(หนังสือมีตำหนิ)', 'OSHO', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາພະລັງສ້າງສັນ ຂອງຂວັນສຳລັບຜູ້ທີ່ກ້າຄິດນອກກ໋ອບ ແລະ ທຳລາຍຂໍ້ຈຳກັດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 127840.00, 10.0, 140624.00, 'OUT_OF_STOCK', 'THB 188');

  -- 56. พลเมืองดี : การสร้างสังคมแห่งการตื่นรู้ (ปกใหม่)  (฿183)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('พลเมืองดี : การสร้างสังคมแห่งการตื่นรู้ (ปกใหม่)', 'FreeMind Publishing', 'Thai', v_religion,
    'ການສ້າງພົນລະເມືອງດີ ແລະ ສັງຄົມແຫ່ງການຕື່ນຮູ້ ດ້ວຍການພັດທະນາຈິດສຳນຶກ ຄວາມຮັກຊາດ ແລະ ຄວາມຮັບຜິດຊອບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 124440.00, 10.0, 136884.00, 'AVAILABLE', 'THB 183');

  -- 57. ภูมิแพ้แก้ได้  (฿213)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ภูมิแพ้แก้ได้', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳດ້ານການຮັກສາ ແລະ ດູແລໂຣກພູມແພ້ ດ້ວຍໂພຊະນາການ ວິທີດຳລົງຊີວິດ ແລະ ການປ້ອງກັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 144840.00, 10.0, 159324.00, 'AVAILABLE', 'THB 213');

  -- 58. มหันตภัยโลกร้อน ฉบับเยาวชน  (฿20)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('มหันตภัยโลกร้อน ฉบับเยาวชน', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ໜັງສືສຳລັບເຍົາວຊົນ ທີ່ສ້າງຈິດສຳນຶກດ້ານສິ່ງແວດລ້ອມ ອະທິບາຍໄພຈາກໂລກຮ້ອນ ແລະ ວິທີຊ່ວຍປ້ອງກັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 13600.00, 10.0, 14960.00, 'AVAILABLE', 'THB 20');

  -- 59. มหัศจรรย์พลังแห่งสี  (฿50, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('มหัศจรรย์พลังแห่งสี', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄວາມມະຫັດສະຈັນຂອງພະລັງສີ ທີ່ສົ່ງຜົນຕໍ່ຈິດໃຈ ອາລົມ ແລະ ຊີວິດ ເຈາະເລິກ color psychology ໃນຊີວິດປະຈຳວັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'OUT_OF_STOCK', 'THB 50');

  -- 60. ยิ่งเสี่ยง ยิ่งไม่พลาด  (฿90, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ยิ่งเสี่ยง ยิ่งไม่พลาด', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ແນວຄິດການຮ່ວມຮ່ອງ ທີ່ສອນໃຫ້ຮ້ຽນຮູ້ ຈາກຄວາມສ່ຽງ ດ້ວຍຄວາມຄິດທີ່ຄຳນວນ ເພື່ອຊີວິດທີ່ສຳເລັດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 61200.00, 10.0, 67320.00, 'OUT_OF_STOCK', 'THB 90');

  -- 61. ยืดเส้นวันละท่า บอกลาความอ้วน  (฿113, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ยืดเส้นวันละท่า บอกลาความอ้วน (1 Day 1 Pose)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ທ່າຍືດເສັ້ນ 1 ທ່າຕໍ່ວັນ ທີ່ຊ່ວຍລົດນ້ຳໜັກ ປ້ອງກັນໂຣກ ແລະ ສ້າງສຸຂະພາບ ດ້ວຍຂັ້ນຕອນງ່າຍ ທີ່ທຸກຄົນເຮັດໄດ້', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 76840.00, 10.0, 84524.00, 'OUT_OF_STOCK', 'THB 113');

  -- 62. วิ่งเท้าเปล่าเปลี่ยนชีวิต (Barefoot Running)  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('วิ่งเท้าเปล่าเปลี่ยนชีวิต (Barefoot Running)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳການວິ່ງເທົ້າເປົ່າ ທີ່ຊ່ວຍຜູກພັນກັບທຳມະຊາດ ເສີມສ້າງສຸຂະພາບ ແລະ ປ່ຽນຊີວິດ ຢ່າງງ່າຍ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 63. วิทยาศาสตร์ ม.1 เล่ม 1  (฿89, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('วิทยาศาสตร์ ม.1 เล่ม 1', 'FreeMind Publishing', 'Thai', v_education,
    'ໜັງສືວິທະຍາສາດ ລະດັບ ມ. 1 ເຫຼັ້ມ 1 ລວມເນື້ອຫາ ທິດສະດີ ແລະ ກິດຈະກຳ ຕາມຫຼັກສູດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'OUT_OF_STOCK', 'THB 89');

  -- 64. วิทยาศาสตร์ ม.1 เล่ม 2  (฿89, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('วิทยาศาสตร์ ม.1 เล่ม 2', 'FreeMind Publishing', 'Thai', v_education,
    'ໜັງສືວິທະຍາສາດ ລະດັບ ມ. 1 ເຫຼັ້ມ 2 ລວມເນື້ອຫາ ທິດສະດີ ແລະ ກິດຈະກຳ ຕາມຫຼັກສູດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'OUT_OF_STOCK', 'THB 89');

  -- 65. วิทยาศาสตร์ ม.2 เล่ม 1 (ฉบับปรับปรุงใหม่)  (฿89)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('วิทยาศาสตร์ ม.2 เล่ม 1 (ฉบับปรับปรุงใหม่)', 'FreeMind Publishing', 'Thai', v_education,
    'ໜັງສືວິທະຍາສາດ ລະດັບ ມ. 2 ເຫຼັ້ມ 1 ສະບັບປັບປຸງໃໝ່ ລວມເນື້ອຫາ ທິດສະດີ ຕາມຫຼັກສູດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'AVAILABLE', 'THB 89');

  -- 66. วิทยาศาสตร์ ม.2 เล่ม 2  (฿89)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('วิทยาศาสตร์ ม.2 เล่ม 2', 'FreeMind Publishing', 'Thai', v_education,
    'ໜັງສືວິທະຍາສາດ ລະດັບ ມ. 2 ເຫຼັ້ມ 2 ລວມເນື້ອຫາ ທິດສະດີ ແລະ ກິດຈະກຳ ຕາມຫຼັກສູດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'AVAILABLE', 'THB 89');

  -- 67. วิทยาศาสตร์ ม.3 เล่ม 2  (฿89)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('วิทยาศาสตร์ ม.3 เล่ม 2', 'FreeMind Publishing', 'Thai', v_education,
    'ໜັງສືວິທະຍາສາດ ລະດັບ ມ. 3 ເຫຼັ້ມ 2 ລວມເນື້ອຫາ ທິດສະດີ ແລະ ກິດຈະກຳ ຕາມຫຼັກສູດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 60520.00, 10.0, 66572.00, 'AVAILABLE', 'THB 89');

  -- 68. วุฒิภาวะ : ยอมรับในสิ่งที่ท่านเป็น (Maturity)  (฿200, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('วุฒิภาวะ : ยอมรับในสิ่งที่ท่านเป็น (Maturity)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ນຳໃຫ້ຮູ້ຈັກຍອມຮັບໃນສ່ິງທີ່ຕົວເຮົາເປັນ ດ້ວຍຄວາມໂຕ ຕົນ ແລະ ຄວາມຮັກຊີວິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 136000.00, 10.0, 149600.00, 'OUT_OF_STOCK', 'THB 200');

  -- 69. สนิทใจ : สุดทางแห่งความหวาดระแวง (Intimacy)  (฿188, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('สนิทใจ : สุดทางแห่งความหวาดระแวง (Intimacy)(หนังสือมีตำหนิ)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາຄວາມໃກ້ຊິດ ແລະ ຄວາມໄວ້ວາງໃຈ ທີ່ຊ່ວຍກ້າວຜ່ານຄວາມຫວາດຢ້ານ ສູ່ຄວາມສຳພັນທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 127840.00, 10.0, 140624.00, 'OUT_OF_STOCK', 'THB 188');

  -- 70. สร้างชีวิตมหัศจรรย์ด้วยน้ำนมแม่  (฿200)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('สร้างชีวิตมหัศจรรย์ด้วยน้ำนมแม่ (หนังสือมีตำหนิเล็กน้อย)', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳດ້ານການລ້ຽງລູກດ້ວຍນ້ຳນົມແມ່ ທີ່ສ້າງຊີວິດທີ່ດີ ພັດທະນາການ ແລະ ສຸຂະພາບໃຫ້ລູກ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 136000.00, 10.0, 149600.00, 'AVAILABLE', 'THB 200');

  -- 71. สอนลูกรักให้รู้เท่าทันอันตรายรอบด้าน  (฿251)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('สอนลูกรักให้รู้เท่าทันอันตรายรอบด้าน', 'FreeMind Publishing', 'Thai', v_children,
    'ຄູ່ມືສອນລູກ ໃຫ້ຮູ້ຈັກ ແລະ ປ້ອງກັນ ອັນຕາລາຍຮອບດ້ານ ດ້ວຍຄວາມເຂົ້າໃຈ ທີ່ເໝາະສົມກັບໄວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 170680.00, 10.0, 187748.00, 'AVAILABLE', 'THB 251');

  -- 72. สันติสุขทุกลมหายใจ (Peace is Every Breath)  (฿158, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('สันติสุขทุกลมหายใจ (Peace is Every Breath)', 'Thich Nhat Hanh', 'FreeMind Publishing', 'Thai', v_religion,
    'ຄຳສອນຂອງ Thich Nhat Hanh ທີ່ນຳສັນຕິສຸກ ແລະ ສະຕິ ໃນທຸກລົມຫາຍໃຈ ດຳລົງຊີວິດດ້ວຍຄວາມງ່ຽບ ແລະ ຄວນຈິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 107440.00, 10.0, 118184.00, 'OUT_OF_STOCK', 'THB 158');

END;
$$;
