-- ============================================================
-- FreeMind Books — Page 2 (items 25–48)
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

  -- 25. ชีวิตสมาร์ต ฉลาดออมเงิน  (฿50, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ชีวิตสมาร์ต ฉลาดออมเงิน', 'FreeMind Publishing', 'Thai', v_business,
    'ຄຳແນະນຳການອອມເງິນຢ່າງສະຫຼາດ ດ້ວຍເຕັກນິກການຈັດການການເງິນ ທີ່ຊ່ວຍສ້າງຄວາມໝັ້ນຄົງໃນໄລຍະຍາວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'OUT_OF_STOCK', 'THB 50');

  -- 26. ชีวิตสมาร์ต ฉลาดใช้เงิน  (฿50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ชีวิตสมาร์ต ฉลาดใช้เงิน', 'FreeMind Publishing', 'Thai', v_business,
    'ຄຳແນະນຳການໃຊ້ເງິນຢ່າງສະຫຼາດ ວາງແຜນງົບປະມານ ແລະ ຄຸ້ມຄອງລາຍຈ່າຍ ເພື່ອຊີວິດທາງດ້ານການເງິນທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 27. ชุดเสริมภูมิลูกรักให้แข็งแรง (3 เล่ม)  (฿695)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ชุดเสริมภูมิลูกรักให้แข็งแรง (3 เล่ม) (ส่งฟรี)', 'FreeMind Publishing', 'Thai', v_children,
    'ຊຸດໜັງສື 3 ເຫຼັ້ມ ສຳລັບພໍ່ແມ່ ທີ່ໃຫ້ຄຳແນະນຳດ້ານໂພຊະນາການ ສ້າງພູມຕ້ານທານ ແລະ ດູແລສຸຂະພາບລູກນ້ອຍ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 472600.00, 10.0, 519860.00, 'AVAILABLE', 'THB 695');

  -- 28. ด้วยรักบันดาล นิทานสีขาว รวมนิทานสร้างสุข  (฿50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ด้วยรักบันดาล นิทานสีขาว รวมนิทานสร้างสุข', 'FreeMind Publishing', 'Thai', v_children,
    'ລວມນິທານສ້າງສຸກ ທີ່ສອນຄຸນຄ່າຂອງຄວາມຮັກ ຄວາມດີ ແລະ ຄວາມສຸກ ສຳລັບເດັກນ້ອຍ ແລະ ຄອບຄົວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 29. ดีต่อใจ  (฿25, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ดีต่อใจ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ໜັງສືທີ່ບໍາລຸງຈິດໃຈ ດ້ວຍຄຳຄິດ ຄຳສອນ ແລະ ແຮງບັນດານໃຈ ທີ່ຊ່ວຍໃຫ້ຈິດໃຈສະຫງົບ ແລະ ຮູ້ສຶກດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 17000.00, 10.0, 18700.00, 'OUT_OF_STOCK', 'THB 25');

  -- 30. ดีไซน์รัก BEING IN LOVE  (฿217, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ดีไซน์รัก BEING IN LOVE', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ການຄົ້ນຫາຄວາມຮັກທີ່ແທ້ຈິງ ດ້ວຍການເຂົ້າໃຈຕົນເອງ ແລະ ຄູ່ຮັກ ເພື່ອສ້າງຄວາມສຳພັນທີ່ດີ ແລະ ຍືນຍົງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 147560.00, 10.0, 162316.00, 'OUT_OF_STOCK', 'THB 217');

  -- 31. ตีโจทย์แตก : ข้อสอบ GRAMMAR  (฿93)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ตีโจทย์แตก :ข้อสอบ GRAMMAR', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືຝຶກທັກສະ GRAMMAR ພາສາອັງກິດ ພ້ອມເຕັກນິກການແກ້ໂຈດ ແລະ ຕົວຢ່າງຂໍ້ສອບ ສຳລັບຜູ້ຮຽນທຸກລະດັບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 63240.00, 10.0, 69564.00, 'AVAILABLE', 'THB 93');

  -- 32. ตื่นรู้ : กุญแจสู่ชีวิตที่สมดุล (Awareness)  (฿196, OUT OF STOCK)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('ตื่นรู้ : กุญแจสู่ชีวิตที่สมดุล (Awareness)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ໄຂກຸນແຈສູ່ຊີວິດທີ່ສົມດຸນ ຜ່ານການຕື່ນຮູ້ ສະຕິ ແລະ ການດຳລົງຊີວິດໃນຄວາມເປັນປັດຈຸບັນ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 133280.00, 10.0, 146608.00, 'OUT_OF_STOCK', 'THB 196');

  -- 33. ถอดรหัสชีวิต โลก และธรรม  (฿50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ถอดรหัสชีวิต โลก และธรรม', 'FreeMind Publishing', 'Thai', v_religion,
    'ການຖອດລະຫັດຄວາມຈິງຂອງຊີວິດ ໂລກ ແລະ ທຳ ເພື່ອໃຫ້ຜູ້ອ່ານເຂົ້າໃຈຄວາມໝາຍ ແລະ ຈຸດປະສົງຂອງການດຳລົງຊີວິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 34. นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 1 (ฉบับปรับปรุงใหม่)  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 1 (ฉบับปรับปรุงใหม่)', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານສີຂາວ ຊຸດທີ 1 ສຳລັບພັດທະນາຊີວິດ ຊ່ວຍໃຫ້ເດັກນ້ອຍ ແລະ ຜູ້ໃຫຍ່ ຮຽນຮູ້ຄຸນຄ່າດ້ານຊີວິດ ຈາກນິທານ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 35. นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 3  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 3', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານສີຂາວ ຊຸດທີ 3 ສຳລັບພັດທະນາຊີວິດ ລວມນິທານທີ່ສ້າງຄຸນຄ່າ ທັດສະນະ ແລະ ຄວາມຄິດທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 36. นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 4  (฿100)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม4', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານສີຂາວ ຊຸດທີ 4 ສຳລັບພັດທະນາຊີວິດ ລວມນິທານທີ່ສ້າງຄຸນຄ່າ ທັດສະນະ ແລະ ຄວາມຄິດທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 68000.00, 10.0, 74800.00, 'AVAILABLE', 'THB 100');

  -- 37. นิทานสีขาวชุดพัฒนาชีวิต รวมนิทานคัดสรร  (฿50)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('นิทานสีขาวชุดพัฒนาชีวิต รวมนิทานคัดสรร', 'FreeMind Publishing', 'Thai', v_children,
    'ລວມນິທານຄັດສັນ ຈາກຊຸດນິທານສີຂາວພັດທະນາຊີວິດ ທີ່ດີທີ່ສຸດ ສຳລັບທຸກຊ່ວງໄວ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 34000.00, 10.0, 37400.00, 'AVAILABLE', 'THB 50');

  -- 38. บั๊ดกับช็อกโกแลตแสนอร่อย  (฿70)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('บั๊ดกับช็อกโกแลตแสนอร่อย', 'FreeMind Publishing', 'Thai', v_children,
    'ນິທານເດັກນ້ອຍ ຕິດຕາມການຜະຈົນໄພຂອງ "ບັ໋ດ" ກັບຊ໋ອກໂກແລດ ທີ່ສ້າງຄວາມປິຕິ ແລະ ສອນຄຸນຄ່າດ້ານຊີວິດ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 47600.00, 10.0, 52360.00, 'AVAILABLE', 'THB 70');

  -- 39. ปรับจิต เปลี่ยนใจ  (฿20, OUT OF STOCK)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ปรับจิต เปลี่ยนใจ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳດ້ານຈິດໃຈ ທີ່ຊ່ວຍໃຫ້ປັບທັດສະນະຄະຕິ ຄວາມຄິດ ແລະ ຄວາມຮູ້ສຶກ ເພື່ອຊີວິດທີ່ດີ ແລະ ມີຄວາມສຸກ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 13600.00, 10.0, 14960.00, 'OUT_OF_STOCK', 'THB 20');

  -- 40. ปลดล็อก "อารมณ์" กับหมอเวช  (฿234)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ปลดล็อก "อารมณ์" กับหมอเวช', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ການຈັດການອາລົມ ກັບໝໍ ທີ່ຊ່ວຍໃຫ້ເຂົ້າໃຈ ຄວບຄຸມ ແລະ ໃຊ້ອາລົມຢ່າງສ້າງສັນ ເພື່ອສຸຂະພາບຈິດ ທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 159120.00, 10.0, 175032.00, 'AVAILABLE', 'THB 234');

  -- 41. ปล่อย : พลังแห่งการให้อภัยซ่อนอยู่ในความโกรธ  (฿226)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ปล่อย : พลังแห่งการให้อภัยซ่อนอยู่ในความโกรธ', 'FreeMind Publishing', 'Thai', v_religion,
    'ພະລັງແຫ່ງການໃຫ້ອໄພ ທີ່ຊ່ອນຢູ່ໃນຄວາມໂກດ ເພື່ອນຳໄປສູ່ອິດສະລະພາບທາງຈິດໃຈ ແລະ ຄວາມສະຫງົບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 153680.00, 10.0, 169048.00, 'AVAILABLE', 'THB 226');

  -- 42. ป้องกันลูกป่วย ด้วยอาหารสุขภาพ  (฿266)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ป้องกันลูกป่วย ด้วยอาหารสุขภาพ', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ຄຳແນະນຳດ້ານໂພຊະນາການ ເພື່ອປ້ອງກັນເດັກນ້ອຍຈາກການເຈັບປ່ວຍ ດ້ວຍອາຫານສຸຂະພາບ ທີ່ພໍ່ແມ່ຈັດການໄດ້ງ່າຍ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 180880.00, 10.0, 198968.00, 'AVAILABLE', 'THB 266');

  -- 43. ปัญญาญาณ : การรู้ที่อยู่นอกเหตุเหนือผล (Intuition)  (฿209)
  INSERT INTO public.books (title, author, publisher, language, category_id, description, is_active)
  VALUES ('ปัญญาญาณ : การรู้ที่อยู่นอกเหตุเหนือผล (Intuition)', 'OSHO', 'FreeMind Publishing', 'Thai', v_religion,
    'ໜັງສືໂດຍ OSHO ທີ່ຄົ້ນຫາສັນຊາດຕະຍານ ຄວາມຮູ້ ທີ່ຢູ່ນອກເໜືອການຄິດ ແລະ ເຫດຜົນ ສູ່ຄວາມເຂົ້າໃຈທີ່ເລິກຊຶ້ງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 142120.00, 10.0, 156332.00, 'AVAILABLE', 'THB 209');

  -- 44. ปาฏิหาริย์แห่งการรักตัวเอง  (฿209)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ปาฏิหาริย์แห่งการรักตัวเอง', 'FreeMind Publishing', 'Thai', v_nonfic,
    'ປາດຕິຫານຂອງການຮັກຕົນເອງ ທີ່ຊ່ວຍໃຫ້ຄົ້ນພົບຄຸນຄ່າ ຂໍ້ດີ ແລະ ຄວາມສາມາດຂອງຕົນ ເພື່ອສ້າງຊີວິດທີ່ດີ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 142120.00, 10.0, 156332.00, 'AVAILABLE', 'THB 209');

  -- 45. ผ่านฉลุย ตะลุย CU-TEP  (฿236)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุย CU-TEP', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ CU-TEP ທົດສອບພາສາອັງກິດ ຈຸລາລົງກອນ ລວມເຕັກນິກ ຕົວຢ່າງຂໍ້ສອບ ແລະ ແນວທາງເພື່ອໄດ້ຄະແນນສູງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 160480.00, 10.0, 176528.00, 'AVAILABLE', 'THB 236');

  -- 46. ผ่านฉลุย ตะลุย GAT ภาษาอังกฤษ  (฿118)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุย GAT ภาษาอังกฤษ', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ GAT ພາສາອັງກິດ ລວມເຕັກນິກ ກົນລະຍຸດ ແລະ ຂໍ້ສອບຈຳລອງ ສຳລັບນັກຮຽນ ມ. ປາຍ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 80240.00, 10.0, 88264.00, 'AVAILABLE', 'THB 118');

  -- 47. ผ่านฉลุย ตะลุย TOEFL ITP  (฿252)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุย TOEFL ITP', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ TOEFL ITP ລວມເນື້ອຫາຄົບຖ້ວນ ເຕັກນິກ ແລະ ຂໍ້ສອບຈຳລອງ ເພື່ອໄດ້ຄະແນນ TOEFL ITP ສູງ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 171360.00, 10.0, 188496.00, 'AVAILABLE', 'THB 252');

  -- 48. ผ่านฉลุย ตะลุย TOEIC (ฉบับเก่า)  (฿120)
  INSERT INTO public.books (title, publisher, language, category_id, description, is_active)
  VALUES ('ผ่านฉลุย ตะลุย TOEIC (ฉบับเก่า)', 'FreeMind Publishing', 'Thai', v_education,
    'ຄູ່ມືກຽມສອບ TOEIC ສະບັບເກົ່າ ລວມເຕັກນິກ ແລະ ຂໍ້ສອບ Listening ແລະ Reading ສຳລັບທຸກລະດັບ', true)
  RETURNING id INTO b;
  INSERT INTO public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, final_price, availability, notes)
  VALUES (b, v_bs, 81600.00, 10.0, 89760.00, 'AVAILABLE', 'THB 120');

END;
$$;
