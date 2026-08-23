begin;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786167882017',
  'ปรัชญาชีวิต ศาสตร์แห่งความสำเร็จ',
  'นโปเลียน ฮิลล์; แปลโดย ปสงค์อาสา',
  'เดอะเกรทไฟน์อาร์ท',
  'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $desc$<h2>รายละเอียด : ปรัชญาชีวิต ศาสตร์แห่งความสำเร็จ</h2>
<p>หลักปรัชญาแห่งความสำเร็จ 16 ประการที่นโปเลียน ฮิลล์เรียบเรียงจากการศึกษาชีวิตและแนวคิดของบุคคลผู้ประสบความสำเร็จ ถ่ายทอดเป็นแนวทางฝึกความคิด บุคลิกภาพ และการลงมือทำ เพื่อให้ผู้อ่านกำหนดเป้าหมายและสร้างความสำเร็จด้วยตนเอง</p>
<h2>สารบัญ</h2>
<ol><li>จิตรวม</li><li>เป้าหมายสำคัญที่แน่นอน</li><li>ความเชื่อมั่นในตนเอง</li><li>นิสัยประหยัด</li><li>ความริเริ่มและความเป็นผู้นำ</li><li>จินตนาการ</li><li>ความกระตือรือร้น</li><li>การควบคุมตนเอง</li><li>นิสัยทำงานเกินเงินเดือน</li><li>บุคลิกภาพที่ดึงดูดใจ</li><li>ความคิดที่ถูกต้อง</li><li>ความตั้งใจจดจ่อ</li><li>ความร่วมมือ</li><li>การใช้ประโยชน์จากความล้มเหลว</li><li>ความใจกว้าง</li><li>กฎทองคำ</li></ol>$desc$,
  752,
  '2014-01-01',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786167882017.jpg',
  false
)
on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9781585426898',
  'The Law of Success: The Master Wealth-Builder''s Complete and Original Lesson Plan for Achieving Your Dreams',
  'Napoleon Hill',
  'Tarcher',
  'English',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $desc$<h2>Description</h2>
<p>Napoleon Hill's complete success course presents fifteen principles for turning a definite purpose into practical achievement. Originally developed as a multi-volume lesson plan, it examines confidence, initiative, imagination, enthusiasm, self-control, cooperation, learning from failure, and the habit of doing more than expected.</p>
<p>This complete edition brings the original lessons together as a systematic program for applying Hill's philosophy to work, wealth building, leadership, and personal goals.</p>$desc$,
  640,
  '2008-12-26',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9781585426898.jpg',
  false
)
on conflict (isbn) do nothing;

insert into public.books (
  isbn, title, author, publisher, language, category_id,
  description, pages, publication_date, cover_image_url, is_active
)
values (
  '9786162877476',
  'The ONE Thing กฎแห่ง "สิ่งเดียว"',
  'Gary Keller และ Jay Papasan; แปลโดย นาถกมล บุญรอดพาณิชย์',
  'วีเลิร์น',
  'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  $desc$<h2>รายละเอียด : The ONE Thing กฎแห่ง “สิ่งเดียว”</h2>
<p><strong>เลิก “ทำให้น้อยลง” แล้วหันมาค้นหา “สิ่งเดียว” ที่ให้ผลลัพธ์ดีกว่าการทำทุกสิ่งที่เหลือรวมกัน</strong></p>
<p>พบกับแนวคิดบริหารเวลาที่เรียบง่ายและทรงพลังจนได้รับการยอมรับไปทั่วโลก มันไม่ใช่แค่การ “ทำน้อยลง” แต่เป็นการค้นหา “สิ่งเดียว” ที่ทำแล้วให้ผลลัพธ์ดีกว่าการทำทุกสิ่งที่เหลือรวมกัน นี่คือกฎที่นำไปปรับใช้ได้กับทุกด้านของชีวิต ตั้งแต่การทำงาน การเรียน ธุรกิจ ไปจนถึงความสัมพันธ์</p>
<p>คุณจะมีเวลามากขึ้น ทำผลงานได้ดีขึ้น และประสบความสำเร็จในแบบที่ไม่เคยทำได้มาก่อน อะไรคือสิ่งเดียวที่ถ้าคุณทำในวันนี้ สัปดาห์นี้ เดือนนี้ ปีนี้ หรือชีวิตนี้ แล้วการทำสิ่งที่เหลือจะไม่มีความจำเป็นอีกต่อไป และคุณจะหา “สิ่งเดียว” นั้นเจอได้อย่างไร หนังสือเล่มนี้ชวนคุณค้นหาคำตอบดังกล่าว</p>$desc$,
  240,
  '2025-07-24',
  'https://bzyvzftnfuuxcseuqrnj.supabase.co/storage/v1/object/public/books/covers/9786162877476.jpg',
  false
)
on conflict (isbn) do nothing;

select id, isbn, title, author, cover_image_url, is_active
from public.books
where isbn in ('9786167882017', '9781585426898', '9786162877476')
order by isbn;

commit;
