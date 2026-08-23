begin;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786162877643', 'The Power of Habit พลังแห่งความเคยชิน',
  'Charles Duhigg; แปลโดย พรเลิศ อิฐฐ์ และ วิโรจน์ ภัทรทีปกร', 'วีเลิร์น', 'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $d$<h2>รายละเอียด : The Power of Habit พลังแห่งความเคยชิน</h2><p><strong>ทำไมคนเราถึง “ทำ” หรือ “ไม่ทำ” บางสิ่งจนเป็นอัตโนมัติ</strong></p><p>ในแต่ละวันเราทำสิ่งต่าง ๆ โดยแทบไม่ต้องคิด เพราะมันกลายเป็นความเคยชินไปแล้ว แต่ในความเคยชินนั้นมีพลังบางอย่างซ่อนอยู่ หนังสือเล่มนี้พาไปสำรวจว่านิสัยก่อตัวขึ้นได้อย่างไร ทำไมจึงเปลี่ยนแปลงได้ยาก และเราจะนำความเข้าใจนั้นมาใช้ให้เป็นประโยชน์กับชีวิตได้อย่างไร</p><p>เนื้อหาอธิบายผ่านงานวิจัยทางวิทยาศาสตร์และเรื่องราวจากหลากหลายวงการ ตั้งแต่กีฬา ธุรกิจ การแพทย์ จิตวิทยา ไปจนถึงเศรษฐศาสตร์พฤติกรรม เพื่อแสดงให้เห็นว่าเมื่อเข้าใจวงจรของนิสัย เราสามารถเปลี่ยนแปลงตัวเอง องค์กร และสังคมได้</p>$d$,
  376, '2025-03-10',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786162877643.jpg', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9780812981605', 'The Power of Habit: Why We Do What We Do in Life and Business',
  'Charles Duhigg', 'Random House Trade Paperbacks', 'English',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $d$<h2>Description</h2><p>This 10th anniversary edition explores the science behind why habits exist and how they can be changed. Charles Duhigg draws on research and stories from business, professional sports, medicine, psychology, and social movements to explain the habit loop of cue, routine, and reward.</p><p>The book shows how understanding keystone habits can help individuals become more productive, organizations reshape their cultures, and communities create lasting change. This edition includes a new afterword by the author.</p>$d$,
  379, '2023-01-01',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9780812981605.jpg', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786162871009', 'Zero to One หลักคิดสำหรับสตาร์ตอัพสู่การสร้างอนาคต',
  'Peter Thiel และ Blake Masters; แปลโดย วิญญู กิ่งหิรัญวัฒนา', 'วีเลิร์น', 'Thai',
  '9ab5d90a-12d8-4ed1-b997-21aa7883cffa',
  $d$<h2>รายละเอียด : Zero to One หลักคิดสำหรับสตาร์ตอัพสู่การสร้างอนาคต</h2><p>คนส่วนใหญ่สร้างธุรกิจด้วยการเลียนแบบและต่อยอดจากสิ่งที่มีอยู่ ซึ่งเป็นการก้าวจาก 1 ไปสู่จำนวนที่มากขึ้น แต่การสร้างคุณค่าใหม่ที่ไม่เคยมีใครทำมาก่อนคือการก้าวจาก 0 ไป 1</p><p>ปีเตอร์ ธีล ผู้ร่วมก่อตั้ง PayPal และนักลงทุนคนแรก ๆ ของ Facebook ถ่ายทอดหลักคิดในการสร้างบริษัทที่มีเอกลักษณ์ ค้นหาความลับที่คนอื่นมองไม่เห็น สร้างความได้เปรียบระยะยาว และหลีกเลี่ยงการแข่งขันแบบทำตามกัน เพื่อเปลี่ยนแนวคิดใหม่ให้กลายเป็นธุรกิจที่สร้างอนาคต</p><h2>สารบัญ</h2><ul><li>ความท้าทายแห่งอนาคต</li><li>ฉลองให้สุดเหวี่ยงเหมือนเป็นปี 1999</li><li>บริษัทที่มีความสุขล้วนแตกต่างกัน</li><li>อุดมการณ์ของการแข่งขัน</li><li>ความได้เปรียบของผู้มาทีหลังสุด</li><li>คุณไม่ใช่ลอตเตอรี่</li><li>ตามรอยเงินไป</li><li>ความลับ</li><li>รากฐาน</li><li>กลไกของมาเฟีย</li><li>คนกับคอมพิวเตอร์</li><li>โลกสีเขียว</li></ul>$d$,
  227, '2015-01-01',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786162871009.png', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9780753555200', 'Zero to One: Notes on Startups, or How to Build the Future',
  'Peter Thiel with Blake Masters', 'Virgin Books', 'English',
  '9ab5d90a-12d8-4ed1-b997-21aa7883cffa',
  $d$<h2>Description</h2><p>Doing what is already familiar takes the world from one to many; every genuinely new creation takes it from zero to one. Peter Thiel and Blake Masters examine how founders can build valuable companies by creating something new instead of merely copying existing successes.</p><p>Drawing on Thiel's experience founding PayPal and Palantir and investing in technology companies, the book discusses monopoly, competition, technology, startup foundations, sales, teams, and the importance of discovering valuable ideas that others have not yet recognized.</p>$d$,
  224, '2015-06-04',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9780753555200.jpg', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786168295380', 'การเริ่มต้นธุรกิจทำงานอย่างไร',
  null, 'วารา พับลิชชิ่ง', 'Thai',
  '9ab5d90a-12d8-4ed1-b997-21aa7883cffa',
  $d$<h2>รายละเอียด : การเริ่มต้นธุรกิจทำงานอย่างไร</h2><p>คู่มือสำหรับผู้ประกอบการใหม่ที่รวบรวมสิ่งสำคัญซึ่งควรรู้ก่อนเริ่มต้นและบริหารธุรกิจ ตั้งแต่การสำรวจความพร้อมและช่องว่างในตลาด การวางแผน การหาเงินทุน การวิจัยตลาด การสร้างแบรนด์ การทำตลาดออนไลน์ การวิเคราะห์ความเสี่ยง และการลดโอกาสขาดทุน</p><p>จากการปรับสมดุลบัญชีไปจนถึงการมองหาตลาดใหม่และการเอาตัวรอดจากวิกฤต เนื้อหากระชับและใช้ภาพประกอบช่วยอธิบาย เพื่อเปลี่ยนความคิดทางธุรกิจให้เป็นการลงทุนที่มีโอกาสประสบความสำเร็จและเติบโตอย่างยั่งยืน</p>$d$,
  null, '2022-02-12',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786168295380.jpg', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786162877964', '52 วิธีคิดให้ได้อย่างเฉียบคม (The Art of Thinking Clearly I)',
  'Rolf Dobelli; แปลโดย อรพิน ผลพนิชรัศมี', 'วีเลิร์น', 'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $d$<h2>รายละเอียด : 52 วิธีคิดให้ได้อย่างเฉียบคม</h2><p>รอล์ฟ โดเบลลี แนะนำ 52 วิธีที่จะช่วยปัดเป่าเมฆหมอกซึ่งบดบังความคิดและเป็นต้นเหตุของการตัดสินใจผิดพลาด เมื่อนำไปปรับใช้ ผู้อ่านจะมองสถานการณ์ได้ชัดขึ้นและตัดสินใจได้แม่นยำขึ้น</p><p>ตัวอย่างแนวคิดในเล่ม ได้แก่ “ฟ้าหลังฝน” ไม่มีอยู่จริง หาเวลาไปเยือนสุสานบ้าง อย่าไปไหนมาไหนกับคนหน้าตาดี ระวังเรื่องจริงเพราะมันอาจโกหกเรา จงผูกมิตรกับคนที่ไม่ชอบขี้หน้า เลิกฟังคำแนะนำจากผู้เชี่ยวชาญ และประสบการณ์ในอดีตอาจทำให้เราตัดสินใจแบบผิดพลาด</p>$d$,
  312, '2026-01-07',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786162877964.jpg', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786168221761', 'Reasons to Stay Alive แด่ผู้แหลกสลาย',
  'Matt Haig; แปลโดย ศิริกมล ตาน้อย', 'Bookscape', 'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $d$<h2>รายละเอียด : Reasons to Stay Alive แด่ผู้แหลกสลาย</h2><p>แมตต์ เฮกเคยทนทุกข์จากโรคซึมเศร้าและโรควิตกกังวล เขารวบรวมส่วนเสี้ยวแห่งคืนวันที่ต่อกรกับโรค ตั้งแต่สัญญาณเตือนในวัยเยาว์ ชั่วขณะที่ชีวิตอยู่ห่างความตายเพียงย่างก้าว จนถึงช่วงเวลาที่ค่อย ๆ หยัดยืน ก้าวข้ามความเจ็บปวด และกลับไปมีชีวิตอย่างแท้จริง</p><p>บันทึกความทรงจำเล่มนี้บอกเล่าประสบการณ์เหล่านั้นอย่างซื่อตรง สอดแทรกอารมณ์ขัน และถ่ายทอดความรู้สึกเบื้องลึกของผู้มีภาวะซึมเศร้า เพื่อเป็นเข็มทิศสำหรับผู้ที่ต้องการเข้าใจโรค เป็นเพื่อนในวันเศร้า และเป็นความหวังว่าแม้วันอันมืดมิดจะมาเยือน มันย่อมผ่านพ้นไปได้</p>$d$,
  320, '2021-07-01',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786168221761.png', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786164343672', 'Accounting 101 การบัญชี 101',
  'Michele Cagan; แปลโดย สวิณี แสงสิทธิชัย', 'แอร์โรว์ มัลติมีเดีย', 'Thai',
  '9ab5d90a-12d8-4ed1-b997-21aa7883cffa',
  $d$<h2>รายละเอียด : Accounting 101 การบัญชี 101</h2><p>หนังสือที่อธิบายว่าทำไมการบัญชีจึงเป็นศูนย์กลางของการดำเนินธุรกิจและเป็นกุญแจสำคัญในการจัดการการลงทุน มิเชล เคเกน ผู้สอบบัญชีรับอนุญาต แนะนำคำศัพท์พื้นฐานและทักษะที่จำเป็นด้วยภาษาที่เข้าใจง่าย</p><p>ผู้อ่านจะได้เรียนรู้ตั้งแต่หลักการบัญชีขั้นพื้นฐาน การคำนวณรายได้และกำไร การจัดทำงบดุล การระบุสินทรัพย์และหนี้สิน ไปจนถึงการคำนวณกระแสเงินสด พร้อมตัวอย่างที่ช่วยให้ผู้เริ่มต้นนำความรู้ไปใช้กับการเงินส่วนบุคคลหรือธุรกิจได้อย่างมีประสิทธิภาพ</p>$d$,
  288, '2024-01-01',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786164343672.jpg', false
) on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  null, 'พ่อรวยสอนปลุกอัจฉริยภาพทางการเงิน (Increase Your Financial IQ)',
  'Robert T. Kiyosaki; เรียบเรียงโดย จักรพงษ์ เมษพันธุ์ และ เกียรติศักดิ์ ลีลาวโรภาส',
  'ซีเอ็ดยูเคชั่น', 'Thai', '9ab5d90a-12d8-4ed1-b997-21aa7883cffa',
  $d$<h2>รายละเอียด : พ่อรวยสอนปลุกอัจฉริยภาพทางการเงิน</h2><p>หนังสือขยายแนวคิดเบื้องหลังชุดพ่อรวยสอนลูกว่า สิ่งที่จะช่วยให้เราสร้างความมั่งคั่งและอิสรภาพทางการเงินไม่ใช่เครื่องมือทางการเงินเพียงอย่างเดียว แต่คือความฉลาดทางการเงินและความสามารถในการจัดการปัญหาเรื่องเงิน</p><p>โรเบิร์ต ที. คิโยซากิอธิบายความฉลาดทางการเงินห้าด้าน ได้แก่ การหาเงินให้มากขึ้น การปกป้องเงิน การจัดงบประมาณ การใช้เงินให้เกิดพลังทวี และการพัฒนาข้อมูลความรู้ทางการเงิน เพื่อให้ผู้อ่านรับมือกับความเปลี่ยนแปลงทางเศรษฐกิจและวางอนาคตทางการเงินด้วยตนเอง</p><h2>สารบัญ</h2><ul><li>ความฉลาดทางการเงินคืออะไร</li><li>ความฉลาดทางการเงินทั้งห้าด้าน</li><li>การหาเงินให้มากขึ้น</li><li>การปกป้องเงิน</li><li>การจัดงบประมาณ</li><li>การใช้เงินให้เกิดพลังทวี</li><li>การพัฒนาข้อมูลทางการเงิน</li><li>ความซื่อตรงทางการเงิน</li><li>การพัฒนาอัจฉริยภาพทางการเงิน</li></ul>$d$,
  null, '2008-01-01',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/increase-financial-iq-th.png', false
);

select id, isbn, title, author, cover_image_url, is_active
from public.books
where isbn in (
  '9786162877643', '9780812981605', '9786162871009', '9780753555200',
  '9786168295380', '9786162877964', '9786168221761', '9786164343672'
)
or lower(title) = lower('พ่อรวยสอนปลุกอัจฉริยภาพทางการเงิน (Increase Your Financial IQ)')
order by title;

commit;
