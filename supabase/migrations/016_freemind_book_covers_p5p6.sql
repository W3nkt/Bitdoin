-- FreeMind Books — imported pages 5 and 6 cover images.
-- Idempotent; restricted to exact FreeMind Publishing title matches.

UPDATE public.books AS b
SET cover_image_url = covers.cover_image_url, updated_at = now()
FROM (
  VALUES
    ('เซน : หนทางอันย้อนแย้ง (Zen : The Path of Paradox)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-58.png'),
    ('เด็กชายน้ำของ…ตามหาสวรรค์', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-64-525x800.png'),
    ('เด็ดเดี่ยว : เบิกบานกับการมีชีวิตอย่างอันตราย (Courage)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-17-525x800.png'),
    ('เต๋า : วิถีที่ไร้เส้นทาง (Tao : The Pathless Path)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-14-525x800.png'),
    ('เบิกบานยินดี : ความสุขที่ไม่ต้องแสวงหา (Joy)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-21-525x800.png'),
    ('เปลี่ยนหุ่นว้าย ให้กลายเป็นว้าว', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-39-525x800.png'),
    ('เปิดความคิด ชีวิตอัจฉริยะ', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-56-525x800.png'),
    ('เมตตาอาทร : กลิ่นหอมยามรักผลิบาน (Compassion)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-19-525x800.png'),
    ('เรารักษ์ธรรมชาติ เรื่อง น้ำ', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-47.png'),
    ('เวลานี้ที่เป็นสุข (ปกใหม่)', 'https://freemindbook.com/wp-content/uploads/2019/09/เวลานี้-หน้า.jpg'),
    ('เส้นปกติของชีวิต', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-80-525x800.png'),
    ('เสือน้อยผู้รักษาสัญญา', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-50-525x800.png'),
    ('แก้เบาหวาน ด้วยรหัสเซอร์เคเดียน', 'https://freemindbook.com/wp-content/uploads/2022/03/แก้เบาหวาน.jpg'),
    ('แท้จริงแล้ว มนุษย์เป็นสัตว์กินพืช', 'https://freemindbook.com/wp-content/uploads/2021/08/Cover-แท้จริง.jpg'),
    ('แนวทางสู่ความสุข (ฉบับปรับปรุง)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-40-525x800.png'),
    ('แล้วภูมิแพ้ จะแพ้เรา!', 'https://freemindbook.com/wp-content/uploads/2022/11/แล้วภูมิแพ้-จะแพ้เรา.jpg'),
    ('แอปพลิเคชันบันดาลใจ (Appspriration) (หนังสือมีตำหนิ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-62.png'),
    ('โยคะสำหรับนักวิ่ง : Yoga for Runners', 'https://freemindbook.com/wp-content/uploads/2019/03/web-book-86-525x800.png'),
    ('โรงเรียนทำเอง Home-made School', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-57.png'),
    ('ใครๆ ก็สุขได้', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book-81-525x800.png'),
    ('ใครอยากผอม จงเลิกจำกัดแคลอรีซะ!', 'https://freemindbook.com/wp-content/uploads/2024/03/ใครอยากผอม-หน้า.jpg'),
    ('ใจเปล่าเล่าเปลือย', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book-82-525x800.png'),
    ('ใช้อาหารรักษาโรค', 'https://freemindbook.com/wp-content/uploads/2024/11/without-shadow.jpg'),
    ('ไอน์สไตน์ถาม พระพุทธเจ้าตอบ', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-71.png'),
    ('ผ่านฉลุย ตะลุยคณิตศาสตร์ ม.ปลาย (พื้นฐาน)', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book-90.png'),
    ('กินดี อยู่นาน คือของขวัญชีวิต', 'https://freemindbook.com/wp-content/uploads/2019/12/web-book-93.jpg')
) AS covers(title, cover_image_url)
WHERE b.title = covers.title
  AND b.publisher = 'FreeMind Publishing'
  AND b.cover_image_url IS DISTINCT FROM covers.cover_image_url;
