-- Book Intake queue
-- One insert per book, sourced from bookstore product pages.
-- Add new INSERT statements below as books are collected; run the whole
-- file manually in the Supabase SQL editor once all books are added.
-- New books are inserted with is_active = false (matches Book Intake page
-- default) so they stay pending until a bookstore price is submitted and
-- the admin publishes them from /admin/book-intake.

-- Source: https://www.naiin.com/product/detail/533411
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786161844899',
  'ใช้คลื่นพลังบวกดึงดูดพลังสุข Good Vibes, Good Life',
  'Vex King (เว็กซ์ คิงส์)',
  'อมรินทร์ How to',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp;&nbsp;&nbsp; #เตนล์อ่าน<br />&nbsp;<br />&nbsp;&nbsp;&nbsp; ความลับของการบรรลุในสิ่งยิ่งใหญ่คือการเข้าใจ กฎแห่งแรงสั่นสะเทือนที่กล่าวว่าทุกอย่างในจักรวาลล้วนเกิดจากแรงสั่นสะเทือนทุกแรงสั่นสะเทือนที่มีความถี่ตรงกันสามารถดึงดูดกันได้ อย่าเผลอไผลไปตามสมองที่ติดนิสัยชอบผลักไสโชคและสิ่งดีๆด้วยพลังลบยิ่งคุณส่งคลื่นพลังบวกออกสู่ภายนอก จักรวาลจะยิ่งสะท้อนคลื่นความสุขกลับมาเท่าทวีคูณ ทุกคำพูด อารมณ์ และการกระทำของคุณเปลี่ยนชีวิตคุณได้ทันที</p><p>&nbsp;&nbsp; เว็กซ์ คิงส์ ผู้ได้รับการยกย่องว่าเป็นผู้นำทางจิตวิญญาณแก่คนรุ่นใหม่จะเปลี่ยนคลื่นความถี่ทางอารมณ์ของคุณให้ตรงกับพลังงานบวกทั้งหลาย เพื่อดึงดูดความสุขและความสำเร็จอย่างที่คุณอาจไม่เคยคิดฝัน</p><p>&nbsp;&nbsp;&nbsp;&nbsp; เราจะเรียนรู้วิธีรักตัวเองอย่างแท้จริงได้อย่างไร จะเปลี่ยนอารมณ์ลบไปเป็นด้านบวกได้อย่างไร แล้วการมองหาความสุขที่ยั่งยืนนั้นเป็นไปได้จริงไหม เว็กซ์ คิง อินฟลูเอนเซอร์ จะตอบคำถามเกี่ยวกับการใช้ชีวิตที่คนส่วนใหญ่สงสัย นำเสนอในภาษาที่อ่านง่าย ย่อยเป็นหัวข้อสั้นๆ มีภาพประกอบและแทรก Quote เป็นแรงบันดาลใจ&nbsp;</p><p>- ฝึกฝนการดูแลตัวเอง เอาชนะพลังงานในแง่ลบ และยึดความสุขของตัวเองเป็นที่ตั้ง แคร์สายตาคน อื่นให้น้อยลง <br />- ฝึกฝนให้ตัวเองมีนิสัยเชิงบวก เช่น การฝึกสติและสมาธิ <br />- เปลี่ยนมุมมอง เปิดรับโอกาสใหม่ ๆ เข้ามาในชีวิต <br />- ทำเป้าหมายให้ชัดเจน ด้วยการทดลองซ้ำ ๆ&nbsp; <br />- เอาชนะความกลัว&nbsp; <br />- มองหาเป้าหมายที่สูงกว่าเดิม เเละกลายเป็นฝ่ายชี้นำคนอื่นบ้าง</p><p>&nbsp;</p><p>&nbsp;</p>$desc$,
  232,
  '2021-09-29',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202109/533411/1000243428_front_XXXL.jpg?v=1762827492',
  false
);

-- Source: https://www.naiin.com/product/detail/559576
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786164440456',
  'อย่าให้ความอาย(หรือความเกรงใจ)ทำลายชีวิต',
  'โจวเหวยลี่',
  'บีมีเดีย/Bee Media',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p><strong>อย่าให้ความอาย(หรือความเกรงใจ)ทำลายชีวิต</strong></p><p><strong>&nbsp;</strong> ผ่านไปเกือบทศวรรษ นับจากที่หนังสือเล่มนี้ถูกตีพิมพ์ฉบับภาษาไทยครั้งแรกในปีพ.ศ. 2556 อย่างไรก็ดีเมื่อความเหลื่อมล้ำยังคงถ่างกว้างขึ้นเรื่อยๆ หนังสือเล่มนี้จึงมาถูกที่ถูกเวลาสำหรับสังคมไทย</p><p>&ldquo;ราคาของความเหลื่อมล้ำ&rdquo; พูดถึงความเหลื่อมล้ำซึ่งเป็นทั้งสาเหตุและผลพวงของระบบการเมืองที่ล้มเหลว และส่งผลต่อเนื่องทำให้ระบบเศรษฐกิจไร้เสถียรภาพ ซึ่งย้อนกลับไปซ้ำเติมเพิ่มความเหลื่อมล้ำยิ่งขึ้นไปอีก จนกลายเป็นวงจรอุบาทว์</p><p>อย่างที่เห็นได้ชัดในช่วง 2-3 ปีมานี้ โควิด-19 อันเป็นทั้งวิกฤตสาธารณสุขและวิกฤตเศรษฐกิจในขณะเดียวกัน เผยให้เห็นความเลวร้ายของความเหลื่อมล้ำระดับสูงทางเศรษฐกิจ-สังคม-การเมืองชนิดสุดขั้วในหลายสังคมรวมทั้งไทย ผ่านรูปธรรมของผลกระทบจากความเหลื่อมล้ำในการเข้าถึงวัคซีน-ยา-การรักษาพยาบาล ที่แต่ละคนประสบไม่เท่ากัน</p><p>โจเซฟ สติกลิตซ์ นักเศรษฐศาสตร์เจ้าของรางวัลโนเบล นำข้อมูลหลักฐานและความคิดมากมายมาเสนอในหนังสือเล่มนี้ว่า ความเหลื่อมล้ำระดับสูงมี &ldquo;ราคา&rdquo; มหาศาลที่สังคมและเศรษฐกิจต้องจ่าย และรัฐกับสังคมจะต้องจัดการกับปัญหานี้อย่างเร่งด่วนก่อนสายเกินแก้</p>$desc$,
  584,
  '2022-09-12',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202209/559576/1000253823_front_XXXL.jpg?v=1725916212',
  false
);

-- Source: https://www.naiin.com/product/detail/508699
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786160838257',
  'ATOMIC HABITS เพราะชีวิตดีได้กว่าที่เป็น',
  'James Clear (เจมส์ เคลียร์)',
  'เชนจ์พลัส/Change+',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp; จากหนังสือขายดีระดับโลกที่มียอดขายหลายล้านเล่ม แปลไปแล้วกว่า 40 ภาษา การันตีความดีงามโดย&nbsp;"New York Times Bestseller"&nbsp;นี่คือหนังสือเกี่ยวกับการเปลี่ยนแปลงนิสัย โดยใช้หลักการทางวิทยาศาสตร์มาอ้างอิงว่าการเปลี่ยนแปลงเล็กๆ ที่เล็กมากๆ จะนำไปสู่การเปลี่ยนแปลงที่ใหญ่ขึ้นได้อย่างไร ซึ่งหลักการนี้สามารถประยุกต์ใช้ได้กับทุกเรื่อง เช่น การทำงาน การเงิน ความสัมพันธ์ระหว่างบุคคล สุขภาพ ความคิดสร้างสรรค์ ไม่ว่าเป้าหมายของเราคืออะไรก็ตาม หนังสือเล่มนี้จะช่วยเปลี่ยนแปลงนิสัยและคงนิสัยดีๆ ไว้ได้นานเท่านาน</p><p>&nbsp; หากคุณพยายามเปลี่ยนแปลงตัวเองแต่ไม่สำเร็จสักที หนังสือเล่มนี้ช่วยคุณได้! ด้วยการพัฒนาตัวเองให้ดีขึ้นเพียงวันละ 1% ไม่ว่าเป้าหมายในชีวิตของคุณคืออะไร คุณทำสำเร็จได้อย่างแน่นอน!</p>$desc$,
  328,
  '2020-08-10',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202007/508699/1000233967_front_XXXL.jpg?v=1778559492',
  false
);

-- Source: https://www.naiin.com/product/detail/569559
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786164343177',
  'The Mountain is You ก้าวข้ามภูผาในใจคุณ',
  'บริอานนา วีสต์',
  'แอร์โรว์ มัลติมีเดีย',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp;&nbsp; หนังสือเล่มนี้คือสัญญาณเตือนที่มาจุดประกายให้เกิดความหวังขึ้น ท่ามกลางความลำบากยากเข็ญ มันจะเชื้อเชิญคุณให้ลุกขึ้นมาโละกฎเกณฑ์ เกี่ยวกับตัวตนที่ถูกสอนมาทิ้งไปให้หมด ในขณะที่คุณจะปลุกวีรบุรุษในใจให้ตื่นขึ้นมา&nbsp; แล้วใช้สติปัญญาเลือกเรื่องเล่าขานขึ้นมาใหม่สักเรื่องหนึ่ง&nbsp; จนก่อร่างสร้างชีวิตที่คุณปรารถนาและคู่ควรกับคุณขึ้นมาได้ในที่สุด&nbsp;&nbsp;&nbsp; สิ่งที่บริอานนานำเสนอคือการเล่นแร่แปรธาตุทางความคิดเกี่ยวกับเครื่องมือ ที่นำไปใช้ได้จริงและการเปลี่ยนแปลงทางจิตวิญญาณอันลึกซึ้ง&nbsp; ซึ่งจะนำมาซึ่งความกล้าหาญและความกระจ่างแจ้งที่จำเป็นต้องมี&nbsp; หากอยากปีนข้ามภูผาในใจคุณไปให้ได้ และที่สำคัญที่สุดก็คือ&nbsp; มันจะทำให้คุณจดจำได้อย่างไม่มีวันลืมเลือนเลยว่า&nbsp; ที่คุณฟันฝ่ามาถึงจุดนี้ก็เพราะอยากจะเป็นคนแบบใด&nbsp;&nbsp;&nbsp; นี่คือสุดยอดคู่มือการค้นหาสำหรับผู้ที่กล้าพอจะเผชิญหน้า กับจุดมุ่งหมายที่แท้จริงของตัวเอง และยึดพลังอำนาจของตนกลับคืนมา</p>$desc$,
  256,
  '2023-01-10',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202301/569559/1000257961_front_XXXL.jpg?v=1725923596',
  false
);

-- Source: https://www.naiin.com/product/detail/642038
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786161877026',
  'ทฤษฎีปล่อยเขา (The Let Them Theory)',
  'เมล รอบบินส์ (Mel Robbins)',
  'อมรินทร์ How to',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp;&nbsp;หนังสือแนะนำแนวทางการดำเนินชีวิตที่เน้นการปล่อยวางจากการพยายามควบคุมพฤติกรรมและความคิดของผู้อื่น โดยการใช้หลักการ "Let Them" เพื่อยอมรับตัวตนของผู้อื่น และ "Let Me" เพื่อมุ่งเน้นพัฒนาตนเอง หลักการนี้ช่วยลดการสูญเสียพลังงานไปกับสิ่งที่ควบคุมไม่ได้ และหันมาสนใจการเติบโตและพัฒนาตนเองแทน พร้อมยกตัวอย่างการนำไปปรับใช้ในด้านต่าง ๆ ของชีวิต ไม่ว่าจะเป็นการทำงาน ความสัมพันธ์ หรือการเลี้ยงดูบุตร เพื่อให้ผู้อ่านค้นพบเส้นทางสู่ความสงบสุขและความสมดุลในชีวิต</p>$desc$,
  432,
  '2025-03-27',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202503/642038/1000280794_front_XXXL.jpg?v=1765437910',
  false
);

-- Source: https://www.naiin.com/product/detail/695456
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786168329979',
  'กฎเหล็กแห่งอำนาจ (The Laws of Power)',
  'Brian Tracy (ไบรอัน เทรซี่)',
  'O2',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ไบรอัน เทรซี่ นักเขียน นักพูด และที่ปรึกษาชื่อดังได้อุทิศชีวิตให้กับการศึกษาความสำเร็จและพัฒนาการของมนุษย์ และใช้ชีวิตให้เราเห็นว่านี่คือสิ่งที่เขาพร่ำบอกมาตลอด ในหนังสือเล่มนี้คุณจะได้เรียนรู้เกี่ยวกับหลักการแห่งความสำเร็จของผู้ยิ่งใหญ่ทุกคน ไบรอันเรียกกฎเหล่านี้ว่า &ldquo;กฎแห่งจักรวาล&rdquo; เพราะมันใช้ได้กับทุกคน ทุกที่ ทุกเวลา รวมถึงคุณด้วย ไม่เคยมีมาก่อนที่กฎเหล่านี้จะถูกนำมารวมกันเป็นเครื่องมือสำคัญในการสอน ไม่เคยมีมาก่อนที่ข้อมูลทั้งหมดนี้จะถูกนำมารวมกันเพื่อมอบสูตรสำเร็จที่รับประกันความสำเร็จให้กับคุณ ไบรอันได้อธิบายกฎเหล่านี้ไว้อย่างชัดเจนและเรียบง่าย พร้อมอธิบายวิธีการนำไปใช้ เพื่อให้คุณบรรลุเป้าหมายที่อาจดูเหมือนไกลเกินเอื้อม ดังนั้นนี่อาจเป็นหนังสือที่สำคัญที่สุดที่คุณเคยอ่าน</p>$desc$,
  320,
  '2026-02-19',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202602/695456/1000288656_front_XXXL.jpg?v=1770345668',
  false
);

-- Source: https://www.naiin.com/product/detail/543042
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786160842551',
  'อิคิไก THE LITTLE BOOK IKIGAI',
  'Ken Mogi (เคน โมงิ)',
  'เชนจ์พลัส/Change+',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p><strong>อิคิไก THE LITTLE BOOK IKIGAI</strong></p><p>เรียนรู้อิคิไกในความหมายที่แท้จริง ผ่านมุมมองและความคิดของ<br />นักประสาทวิทยาศาสตร์ชาวญี่ปุ่น&nbsp;เคน โมงิ&nbsp;ผู้นำแนวคิดอิคิไกมา<br />วิเคราะห์และถ่ายทอดออกมาได้อย่างมีสีสัน ผ่านเรื่องราวหลากหลาย<br />ในประวัติศาสตร์อันยาวนานของญี่ปุ่น เรื่อยมาจนถึงวัฒนธรรมร่วมสมัย<br />ที่เราคุ้นเคย พร้อมกับกรณีศึกษาในวิถีชีวิต งานฝีมือ และไอเดียธุรกิจ<br />ที่น่าสนใจ เหมาะสำหรับคนหนุ่มสาวที่กำลังตั้งคำถามถึงการมีชีวิตที่ดี<br />และการงานที่มีความหมาย เพื่อเราจะได้ตื่นขึ้นทุกเช้าพร้อมกับความหวัง<br />และแรงพลัง ในการขับเคลื่อนชีวิตและสังคมไปในทางที่เราใฝ่ฝัน</p><p>&nbsp;</p><p>&nbsp;</p>$desc$,
  270,
  '2022-03-30',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202203/543042/1000247061_front_XXXL.jpg?v=1725905328',
  false
);
