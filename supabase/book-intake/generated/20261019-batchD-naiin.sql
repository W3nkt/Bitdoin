-- Book Intake batch D: naiin-sourced rows for cover-photo books (Thai print editions).
-- Run manually in the Supabase SQL editor. Rows are is_active = false (pending
-- until a bookstore price is submitted and an admin publishes them).
--
-- NOTE: "Reasons to Stay Alive แด่ผู้แหลกสลาย" (ISBN 9786168221761, naiin 529811) was also
-- in this batch but is intentionally NOT included: it is already queued in
-- generated/20260823-1301-nine-business-and-self-development-books.sql and is already
-- live in public.books (id 469934ea-38bd-4d2e-aad1-59c67c4c8fdd). Inserting it again
-- would violate the unique isbn constraint.

-- Source: https://www.naiin.com/product/detail/522982
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786160841462',
  'FAKE : การเงินลวงโลก',
  'Robert T. Kiyosaki (โรเบิร์ต คิโยซากิ)',
  'ซีเอ็ดยูเคชั่น/se-ed',
  'Thai',
  (select id from public.categories where slug = 'business'),
  $desc$<p><strong>FAKE : การเงินลวงโลก</strong></p><p>โลกการเงินซับซ้อนและผันผวนมากขึ้นทุกวัน แถมยังถาโถมด้วยข้อมูลจากทุกทิศทาง จริงบ้าง เท็จบ้าง ทั้งถูกและผิด ปะปนจนไม่รู้อะไรเป็นอะไรทำให้ความสามารถในการแยกแยะว่า อะไร "จริง" อะไร "ลวง" มีผลต่อความสำเร็จทางการเงิน และความมั่งคั่งอย่างมาก</p><p>การเงินลวงโลก (FAKE) ผลงานใหม่ล่าสุดของโรเบิร์ต คิโยซากิ ผู้เขียนหนังสือขายดีตลอดกาลอย่าง "พ่อรวยสอนลูก" จะเป็นตัวช่วยสำคัญตัวช่วยหนึ่งได้เป็นอย่างดี เงินจอมปลอม, ครูจอมปลอม, ทรัพย์สินจอมปลอม นี่คือสามสิ่งที่อาจเป็นอุปสรรคสำคัญต่อความมั่งคั่ง หากคุณไม่เข้าใจมัน และในทางตรงกันข้ามก็อาจเป็นกลไกสู่ความมั่งคั่งอย่างรวดเร็ว ถ้าคุณรู้จักและเข้าใจมันอย่างแท้จริงมิใช่เพียงเปลือกนอก</p><p>การเงินลวงโลก (FAKE) คุณกำลังถูกใครหลอก หรือคุณนั่นแหละที่กำลังหลอกตัวเองว่ากำลังอยู่บนทิศทางที่ถูกต้อง และคุณจะหาวิธีเอาชนะบนโลกที่เต็มไปด้วย "คำลวง" ทางการเงินได้อย่างไร หาคำตอบได้ในหนังสือเล่มนี้</p><p>จักรพงษ์ เมษพันธุ์</p><ul><ul><li>ภาค 1 : เงินจอมปลอม</li><li>ภาค&nbsp;2 : ครูจอมปลอม</li><li>ภาค&nbsp;3 : ทรัพย์สินจอมปลอม</li></ul></ul>$desc$,
  592,
  '2021-04-07',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202103/522982/1000239882_front_XXXL.jpg?v=1725769273',
  false
);

-- Source: https://www.naiin.com/product/detail/628556
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786162877346',
  'จิตวิทยาต่อรอง จะต้องพูดและทำอะไรในการต่อรองที่แพ้ไม่ได้ (Never Split the Difference)',
  'Chris Voss, Tahl Raz (คริส วอสส์, ทาล ราซ)',
  'วีเลิร์น (WeLearn)',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp; “จะต่อรองอย่างไร ในสถานการณ์ที่แพ้ไม่ได้?”&nbsp;คงไม่มีใครให้คำตอบได้ดีไปกว่า Chris Voss อีกแล้ว&nbsp; เพราะเขาคืออดีตนักเจรจาช่วยเหลือตัวประกันมือหนึ่งของ FBI ผู้รับผิดชอบสถานการณ์ที่มีชีวิตคนเป็นเดิมพันมาแล้วนับครั้งไม่ถ้วน&nbsp;อะไรคือสิ่งที่ควรพูดและไม่ควรพูด อะไรคือสิ่งที่ควรทำและไม่ควรทำ&nbsp;หนังสือเล่มนี้จะมอบเทคนิคทางจิตวิทยาที่ใช้กันใน FBI พร้อมตัวอย่างจากประสบการณ์จริง <br />ที่จะช่วยให้คุณอ่านความคิดของคู่สนทนา เดินเกมนำหน้าความคิดของอีกฝ่าย และจบการต่อรองด้วยผลลัพธ์ที่น่าพอใจได้ทุกครั้ง ไม่ว่าคุณจะอยู่ในสถานการณ์ที่เป็นรองแค่ไหนก็ตาม&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p><p>• ใช้น้ำเสียงแบบดีเจวิทยุรอบดึก&nbsp;&nbsp;&nbsp;&nbsp; <br />• เลือกถามแต่สิ่งที่อีกฝ่ายจะตอบปฏิเสธ&nbsp;&nbsp;&nbsp;&nbsp; <br />• พูดตอกย้ำความคิดลบ ๆ ของฝ่ายตรงข้าม&nbsp;&nbsp;&nbsp;&nbsp; <br />• จงใจยื่นข้อเสนอที่สูงหรือต่ำแบบสุดโต่ง&nbsp;&nbsp;&nbsp;&nbsp; <br />• ค้นหา&nbsp; “หงส์ดำ”&nbsp; ในการเจรจาต่อรอง&nbsp;&nbsp;&nbsp;&nbsp; <br />• ใช้ข้อมูลที่ตรงข้ามกับความเป็นจริง&nbsp;&nbsp;</p>$desc$,
  336,
  '2024-11-07',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202411/628556/1000277222_front_XXXL.jpg?v=1762440387',
  false
);

-- Source: https://www.naiin.com/product/detail/585498
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786160460946',
  '7 อุปนิสัยสำหรับผู้มีประสิทธิผลสูง',
  'Stephen R. Covey(สตีเฟน อาร์ โควีย์)',
  'นานมีบุ๊คส์/nanmeebooks',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp;&nbsp;&nbsp; หลักของ 7 อุปนิสัยเป็นหลักสำคัญในการสร้างการเปลี่ยนแปลงเชิงบวกในชีวิตที่ลงลึกไปถึงแก่นแท้ภายในตัวตนของบุคคล หรือคุณลักษณะ (Character) อันเป็นรากฐานของความมีประสิทธิผลที่มากกว่าการฝึกทักษะ เป็นที่ยอมรับว่าเป็นหลักสากลที่อยู่เหนือกาลเวลา และอยู่เบื้องหลังคนประสบความสำเร็จหลายล้านคนทั่วโลกมากว่า 30 ปี</p>$desc$,
  616,
  '2023-09-07',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202307/585498/1000263246_front_XXXL.jpg?v=1725901826',
  false
);

-- Source: https://www.naiin.com/product/detail/687005
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786162877605',
  'วิธีพูดกับทุกคนในทุกสถานการณ์ ฉ. 20 ปี (How to Talk to Anyone)',
  'Leil Lowndes (ลีล โลว์เดส)',
  'วีเลิร์น (WeLearn)',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>92 กลเม็ดที่ช่วยให้คุณเปล่งประกายทุกครั้ง ไม่ว่าจะพูดคุยกับใคร ที่ไหน หรือเมื่อไหร่ก็ตาม&nbsp;</p><p>คุณเคยรู้สึกแปลกใจไหม ทำไมบางคนถึงดูประสบความสำเร็จไปเสียทุกเรื่อง <br />ไม่ว่าจะคุยกับใครก็มักเป็นจุดสนใจและสร้างความประทับใจได้เสมอ <br />แถมทุกอย่างในชีวิตก็ดูช่างราบรื่นง่ายดายไปเสียหมด&nbsp;</p><p>ความจริงแล้วพวกเขาไม่ได้เหนือไปกว่าคุณหรอก <br />พวกเขาแค่ล่วงรู้ความลับบางอย่างในการสื่อสาร <br />มันคือเคล็ดลับที่รู้กันในหมู่คนที่ประสบความสำเร็จ!&nbsp;</p><p>หนังสือเล่มนี้จะเปิดเผยเคล็ดลับเหล่านั้นด้วยภาษาที่อ่านสนุกเข้าใจง่าย <br />ซึ่งจะช่วยให้คุณเป็นต่อในทุกสถานการณ์ที่ต้องพูดคุยกับใครสักคน เช่น&nbsp;</p><p>- วิธีใช้เพียงแค่สายตาเพื่อทำให้ทุกคนรู้สึกว่าคุณฉลาดรอบรู้ <br />- วิธีทำให้คนที่เพิ่งเจอกันรู้สึกเหมือนเป็นเพื่อนเก่าแก่ตั้งแต่แรกพบ <br />- วิธีเรียนรู้ชีวิตของคู่สนทนาอย่างลับๆ <br />- จะทำความรู้จักคนที่คุณอยากรู้จักได้อย่างไร <br />- วิธีทำให้พวกเขายิ้มแก้มปริทุกครั้งที่เจอคุณ <br />- วิธีขอความช่วยเหลือ (และได้มันมา!) <br />- วิธีอ่านใจคนราวกับมีพลังจิต <br />- วิธีพูดที่ทำให้ทุกคนปฏิบัติต่อคุณราวกับแขกคนสำคัญ <br />- วิธีชมใครสักคน (โดยไม่ให้ฟังดูเหมือนกำลังประจบ) <br />- วิธีทำให้พวกเขาหายโกรธ (ด้วยการพูดไม่เกินสามประโยค) <br />- ทำอย่างไรให้มีเรื่องน่าสนใจมาพูดได้ตลอดเวลา <br />- วิธีแจ้งข่าวร้าย (โดยที่ทำให้เขาชอบคุณยิ่งขึ้นไปอีก) และอื่นๆ อีกมากมาย</p>$desc$,
  400,
  '2025-10-25',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202510/687005/1000286062_front_XXXL.jpg?v=1761731945',
  false
);
