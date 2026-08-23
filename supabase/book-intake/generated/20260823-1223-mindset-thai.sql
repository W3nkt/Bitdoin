begin;

insert into public.books (
  isbn,
  title,
  author,
  publisher,
  language,
  category_id,
  description,
  pages,
  publication_date,
  cover_image_url,
  is_active
)
values (
  '9786162872655',
  'ใช้ความคิดเอาชนะโชคชะตา (Mindset)',
  'Carol S. Dweck',
  'วีเลิร์น (WE LEARN)',
  'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  'หนังสือจิตวิทยาว่าด้วยกรอบคิดแบบตายตัวและกรอบคิดแบบเติบโต อธิบายว่าความเชื่อเกี่ยวกับความสามารถของตนเองส่งผลต่อการเรียนรู้ การรับมือกับความล้มเหลว และการพัฒนาศักยภาพ แปลโดย พรรณี ชูจิรวงศ์',
  360,
  '2018-03-01',
  null,
  false
)
on conflict (isbn) do nothing;

select
  id,
  isbn,
  title,
  author,
  publisher,
  language,
  category_id,
  pages,
  publication_date,
  cover_image_url,
  is_active
from public.books
where isbn = '9786162872655';

commit;
