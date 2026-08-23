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
  '9786161888954',
  'The Communication Book: 44 วิธีสื่อสารอย่างชาญฉลาด',
  'Mikael Krogerus และ Roman Tschäppeler',
  'Amarin How-To',
  'Thai',
  '5a339538-6307-407d-88ba-d29749a4a98b',
  'รวม 44 แนวคิดและทฤษฎีด้านการสื่อสารที่นำไปใช้ได้จริง ครอบคลุมการพูด การฟัง การตั้งคำถาม การนำเสนอ การเจรจา ความสัมพันธ์ และการสื่อสารในที่ทำงาน พร้อมแผนภาพและคำอธิบายแบบกระชับ แปลโดย อัครวัฒน์ พรหมมินทร์',
  280,
  '2026-05-09',
  'https://books.google.com/books/content?id=1NsS0gEACAAJ&printsec=frontcover&img=1&zoom=2&source=gbs_api',
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
where isbn = '9786161888954';

commit;
