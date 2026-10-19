-- Book Intake batch A: naiin-sourced rows for cover-photo books (Thai print/paperback editions).
-- Run manually in the Supabase SQL editor. Rows are is_active = false (pending
-- until a bookstore price is submitted and an admin publishes them).
--
-- SKIPPED: The Communication Book 44 วิธีสื่อสารอย่างชาญฉลาด
-- (https://www.naiin.com/product/detail/698788, ISBN 9786161888954) is already
-- published in public.books (is_active = true); isbn is unique, so no insert here.

-- Source: https://www.naiin.com/product/detail/509973
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786162874017',
  'THINKING, FAST AND SLOW คิด, เร็วและช้า',
  'Daniel Kahneman (แดเนียล คาฮ์นะมัน)',
  'วีเลิร์น (WeLearn)',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p><strong>THINKING, FAST AND SLOW คิด, เร็วและช้า</strong></p><p>&ldquo;ลุ่มลึกและแยบคาย&nbsp;ถ้าโคเปอร์นิคัสย้ายโลกออกจากศูนย์กลางจักรวาล และดาร์วินผลักมนุษย์ตกจากยอดเขาทางชีววิทยา...คาห์เนแมนได้แสดงให้เห็นว่า&nbsp;เราไม่ใช่สิ่งมีชีวิตที่เต็มไปด้วยเหตุผลอย่างที่ตัวเองคิด&rdquo; &ndash; The Economist</p><p>&ldquo;มีหนังสือดี ๆ มากมายที่พูดถึงความมีเหตุผลและความไร้เหตุผลของมนุษย์ แต่มีเล่มนี้เพียงเล่มเดียวเท่านั้นที่นับเป็นผลงานชิ้นเอก แต่ละหน้าอัดแน่นไปด้วยองค์ความรู้ที่ยอดเยี่ยม และน่าดึงดูดใจที่สุดเกี่ยวกับสมองของมนุษย์&rdquo;&nbsp;&ndash; The Financial Times&nbsp;</p><p>หนังสือเล่มนี้จะพาคุณไปสำรวจ&nbsp;"การคิดสองแบบ" นั่นคือ&nbsp;การคิดเร็วและการคิดช้า ซึ่งทำหน้าที่กำหนดการตัดสินใจและพฤติกรรมทั้งหมดของมนุษย์เรา ผ่านมุมมองเฉียบคมของนักจิตวิทยาเจ้าของรางวัลโนเบล และนักคิดที่ลุ่มลึกที่สุดแห่งยุค</p><p>แดเนียล คาห์เนแมน</p>$desc$,
  808,
  '2020-08-19',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202008/509973/1000234486_front_XXXL.jpg?v=1786088170',
  false
);

-- Source: https://www.naiin.com/product/detail/684434
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786169098485',
  'The Intelligent Investor คัมภีร์การลงทุน',
  'Benjamin Graham (เบนจามิน เกรแฮม)',
  'ซีเอ็ดยูเคชั่น/se-ed',
  'Thai',
  (select id from public.categories where slug = 'business'),
  $desc$<p>&nbsp;&nbsp;&nbsp;&nbsp; หนังสือ The Intelligent Investor คัมภีร์การลงทุนแบบเน้นคุณค่า ซึ่งเป็นหนังสือการลงทุนที่ขายดีตลอดกาลเล่มนี้ เขียนโดย "เบนจามิน เกรแฮม" ผู้ได้รับการยกย่องว่าเป็นบิดาแห่งการลงทุนแบบเน้นคุณค่า อีกทั้งยังเป็นหนังสือที่ "วอร์เรน บัฟเฟตต์" นักลงทุนที่รวยที่สุดในโลก ยกย่องว่าเป็นหนังสือการลงทุนที่ดีที่สุดอีกด้วย หนังสือฉบับครบรอบ 75 ปีนี้ ได้รับการปรับปรุงใหม่ โดย "เจสัน ซไวจ์" นักเขียนระดับแนวหน้าของ "Wall Street Journal" ได้เขียนความคิดเห็นเพิ่มเติมประกอบเนื้อหาแต่ละบทของเบนจามิน เกรแฮมขึ้นมาใหม่ทั้งหมด ซึ่งจะทำให้ผู้อ่านเข้าใจแนวคิดของ "เกรแฮม" กระจ่างชัดขึ้น และยังได้เห็นการนำแนวคิดดังกล่าวไปใช้กับการลงทุนในยุคปัจจุบันด้วย The Intelligent Investor คัมภีร์การลงทุนแบบเน้นคุณค่า จะเป็นหนังสือการลงทุนเล่มสำคัญที่สุดในชีวิตการเป็นนักลงทุนของคุณ!</p>$desc$,
  792,
  '2025-09-17',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202509/684434/1000285101_front_XXXL.jpg?v=1758245885',
  false
);

-- Source: https://www.naiin.com/product/detail/704130
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786161890612',
  'The Decision Book 50 วิธีตัดสินใจอย่างชาญฉลาด',
  'Mikael Krogerus และ Roman Tschappeler',
  'อมรินทร์ How to',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p><strong>The International Bestseller</strong></p><p><strong>ต้นกำเนิดซีรีส์ How-to ในตำนาน แปลมาแล้ว 20 ภาษา และมียอดขายกว่า 1 ล้านเล่มทั่วโลก</strong></p><p><strong>จัดระเบียบสมองให้มองขาดทุกสถานการณ์ด้วยสุดยอดอาวุธลับทางความคิดที่เหล่า CEO และนักกลยุทธ์ชั้นนำทั่วโลกเลือกใช้</strong></p><p><strong>ฉบับปรับปรุงใหม่ล่าสุด<br /><br /></strong></p><p>จากจุดเริ่มต้นของซีรีส์ในตำนานที่สร้างปรากฏการณ์ไปทั่วโลก สู่ "คัมภีร์" ที่นักอ่านสาย How-to และจิตวิทยาพัฒนาตนเองต้องมีติดตัว</p><p>ในวันที่โลกหมุนเร็วและเต็มไปด้วยทางเลือกมากมาย สิ่งที่แยก "คนเก่ง" ออกจาก "คนทั่วไป" ไม่ใช่เพียงแค่ความรู้ แต่คือกระบวนการคิดที่เป็นระบบและการตัดสินใจที่แม่นยำ</p><p>The Decision Book 50 วิธีตัดสินใจอย่างชาญฉลาด โดย Mikael Krogerus และ Roman Tsch&auml;ppeler คือหนังสือเล่มแรกที่ปูรากฐานการคิดเชิงกลยุทธ์ให้กับนักอ่านมาแล้วหลายล้านคน ด้วยการย่อยทฤษฎีระดับโลกที่ดูเหมือนยาก ให้กลายเป็น 50 โมเดลการคิดที่เรียบง่าย ทรงพลัง และนำไปใช้ได้จริงผ่านแผนภาพที่เข้าใจง่ายที่สุด</p><p>ไม่ว่าคุณจะต้องการ...<br />- จัดลำดับความสำคัญของงานให้มีประสิทธิภาพสูงสุด<br />- วิเคราะห์ปัญหาที่ซับซ้อนเพื่อหาทางออกที่ถูกต้อง <br />- ทำความเข้าใจความต้องการของตัวเองและผู้อื่นให้ลึกซึ้งยิ่งขึ้น</p><p>หนังสือเล่มนี้จะช่วยคุณจัดระเบียบความวุ่นวายในสมองให้กลายเป็นโครงสร้างที่ชัดเจน พร้อมรับมือกับทุกความท้าทายในชีวิต<br /><br /><br /></p><p><strong>&nbsp;</strong></p>$desc$,
  252,
  '2026-06-05',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202605/704130/1000291156_front_XXXL.jpg?v=1780545128',
  false
);

-- Source: https://www.naiin.com/product/detail/551104
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786162875410',
  'GIVE AND TAKE พลังแห่งการให้ และรับ',
  'Adam Grant (อดัม แกรนต์)',
  'วีเลิร์น (WeLearn)',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p><strong>GIVE AND TAKE&nbsp; พลังแห่งการให้ และรับ</strong></p><p>เมื่อพฤติกรรมทางสังคมที่เรียบง่ายที่สุด<br />และอยู่คู่กับอารยธรรมมนุษย์มานาน<br />ถูกส่องกล้องโดยนักเศรษฐศาสตร์พฤติกรรม<br />บางสิ่งที่ซุกซ่อนอยู่ก็ถูกค้นพบอย่างคาดไม่ถึง</p><p>พลังแห่งการให้... และรับ<br />ไม่ใช่แค่ "ผู้รับ" เท่านั้นที่ได้ประโยชน์<br />แต่ "ผู้ให้" ก็ได้รับประโยชน์เช่นกัน<br />แถมยังได้มากกว่าในทุกๆ ด้าน<br />และเมื่อยิ่งให้ ก็ยิ่งประสบความสำเร็จมากขึ้นด้วย</p>$desc$,
  400,
  '2022-06-30',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202206/551104/1000250063_front_XXXL.jpg?v=1725911974',
  false
);
