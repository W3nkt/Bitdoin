-- FreeMind Books — imported page 4 cover images.
-- Idempotent; restricted to exact FreeMind Publishing title matches.

UPDATE public.books AS b
SET cover_image_url = covers.cover_image_url, updated_at = now()
FROM (
  VALUES
    ('สำเร็จนอกกรอบ', 'https://freemindbook.com/wp-content/uploads/2024/09/สำเร็จนอกกรอบ-ปกหน้า.jpg'),
    ('สินค้า เปลี่ยนชีวิต', 'https://freemindbook.com/wp-content/uploads/2022/03/Cover-สินค้า-เปลี่ยนชีวิต-2.jpg'),
    ('สุขภาพดี อายุ 100 ปี คุณก็มีได้', 'https://freemindbook.com/wp-content/uploads/2018/10/web-book-84.png'),
    ('สุขใจในลานธรรม', 'https://freemindbook.com/wp-content/uploads/2023/11/สุขในในลานธรรม2-800x800.png'),
    ('หนังสือ 10X productivity ชีวิตดีขึ้นทุกด้านด้วยศาสตร์การจัดการข้อมูลและเวลา', 'https://freemindbook.com/wp-content/uploads/2025/10/10x-หน้า.jpg'),
    ('หนังสือ ก้าวแรกครั้งที่ร้อย : ล้มแล้ว (ไง) ลุกขึ้นใหม่ (สิวะ) – บาร์จเฉยๆ', 'https://freemindbook.com/wp-content/uploads/2025/10/ก้าวแรกฯ-หน้า.jpg'),
    ('หนังสือ ช่างแม่งเถอะ ดิว วีรวัฒน์ วลัยเสถียร', 'https://freemindbook.com/wp-content/uploads/2026/03/ปกหน้า-ปกหลัง-3.png'),
    ('หนังสือ ชุดใกล้หมอชะลอวัย กับหมอแอมป์', 'https://freemindbook.com/wp-content/uploads/2021/12/สไลด์7.jpg'),
    ('หนังสือ สูตรโกง คนตัวเล็ก โดย แน็ค-ศิวกร', 'https://freemindbook.com/wp-content/uploads/2026/03/ปกหน้า.png'),
    ('หนังสือเตรียมสอบ : ผ่านฉลุยตะลุย TU-GET ฉบับปรับปรุงใหม่', 'https://freemindbook.com/wp-content/uploads/2020/10/ปกหน้า.png'),
    ('หลอดเลือดหัวใจ รู้ไว้! ก่อนจะสาย', 'https://freemindbook.com/wp-content/uploads/2021/04/web-03.jpg'),
    ('หิ่งห้อยปีกบางกับการเดินทางของน้ำใส', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-73-525x800.png'),
    ('อัจฉริยะบนทางสีขาว (ฉบับปรับปรุงใหม่)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-48-525x800.png'),
    ('อัญมณีที่ล้ำค่า (The Golden Jewel)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-61-525x800.png'),
    ('อัศจรรย์แห่งที่นี่เดี๋ยวนี้', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-60.png'),
    ('อาณาจักรขยะหรรษา', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book-83-525x800.png'),
    ('อิสรภาพ : กล้าที่จะเป็นตัวของตัวเอง (Freedom)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-22-525x800.png'),
    ('ฮวงจุ้ย ชะตาฟ้า คนลิขิต (หนังสือมีตำหนิ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-54-525x800.png'),
    ('ฮวงจุ้ย ทำเลทอง2 เจาะลึกทำเลทองกรุงเทพ', 'https://freemindbook.com/wp-content/uploads/2020/02/web-book-95-525x800.png'),
    ('ฮวงจุ้ยทำเลทอง (หนังสือมีตำหนิ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-74.png'),
    ('เคล็ดลับชะลอวัย ห่างไกลโรค', 'https://freemindbook.com/wp-content/uploads/2021/10/เคล็ดลับชะลอวัย-ห่างไกลโรค-web-525x800.png'),
    ('เงินทอง โคตรง่าย', 'https://freemindbook.com/wp-content/uploads/2025/01/เงินทอง-หน้า.jpg'),
    ('เชาวน์ปัญญา : การตอบสนองอย่างสร้างสรรค์กับปัจจุบันขณะ (Intelligence)', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book97.jpg'),
    ('เชื่อใจ : โอบกอดชีวิตและปล่อยให้ชีวิตเป็นไป (Trust )', 'https://freemindbook.com/wp-content/uploads/2020/03/web-book-97.jpg')
) AS covers(title, cover_image_url)
WHERE b.title = covers.title
  AND b.publisher = 'FreeMind Publishing'
  AND b.cover_image_url IS DISTINCT FROM covers.cover_image_url;
