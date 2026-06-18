-- FreeMind Books — imported page 3 cover images.
-- Idempotent; restricted to exact FreeMind Publishing title matches.

UPDATE public.books AS b
SET cover_image_url = covers.cover_image_url, updated_at = now()
FROM (
  VALUES
    ('ผ่านฉลุย ตะลุย TOEIC ฉบับปรับปรุงใหม่', 'https://freemindbook.com/wp-content/uploads/2021/01/Toeic-ปกหน้า.jpg'),
    ('ผ่านฉลุย ตะลุย ภาษาอังกฤษ สอบเข้า ม.4', 'https://freemindbook.com/wp-content/uploads/2023/09/Cover-ภาษาอังกฤษ-ม.4.jpg'),
    ('ผ่านฉลุย ตะลุยภาษาไทย ป.6 (ฉบับเตรียมสอบ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-32-525x800.png'),
    ('ผ่านฉลุย ตะลุยภาษาไทย ม.3 (ฉบับเตรียมสอบ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-31.png'),
    ('ผ่านฉลุย ตะลุยภาษาไทย ม.ปลาย (คู่มือเตรียมสอบเข้าศึกษาต่อระดับอุดมศึกษา)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-30-525x800.png'),
    ('ผ่านฉลุย ตะลุยศัพท์ TOEIC', 'https://freemindbook.com/wp-content/uploads/2019/04/web-book90.jpg'),
    ('พลังสร้างสรรค์ : ของกำนัลแด่ผู้ฉีกกรอบ (Creativity)(หนังสือมีตำหนิ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-18-525x800.png'),
    ('พลเมืองดี : การสร้างสังคมแห่งการตื่นรู้ (ปกใหม่)', 'https://freemindbook.com/wp-content/uploads/2019/06/พลเมืองดี-หน้า.jpg'),
    ('ภูมิแพ้แก้ได้', 'https://freemindbook.com/wp-content/uploads/2020/10/Untitled-1-01.jpg'),
    ('มหันตภัยโลกร้อน ฉบับเยาวชน', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-55-525x800.png'),
    ('มหัศจรรย์พลังแห่งสี', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-75-525x800.png'),
    ('ยิ่งเสี่ยง ยิ่งไม่พลาด', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-12-525x800.png'),
    ('ยืดเส้นวันละท่า บอกลาความอ้วน (1 Day 1 Pose)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-38-525x800.png'),
    ('วิ่งเท้าเปล่าเปลี่ยนชีวิต (Barefoot Running)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-63-525x800.png'),
    ('วิทยาศาสตร์ ม.1 เล่ม 1', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-37.png'),
    ('วิทยาศาสตร์ ม.1 เล่ม 2', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-35.png'),
    ('วิทยาศาสตร์ ม.2 เล่ม 1 (ฉบับปรับปรุงใหม่)', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book-77.png'),
    ('วิทยาศาสตร์ ม.2 เล่ม 2', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-34.png'),
    ('วิทยาศาสตร์ ม.3 เล่ม 2', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-33.png'),
    ('วุฒิภาวะ : ยอมรับในสิ่งที่ท่านเป็น (Maturity)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-25-525x800.png'),
    ('สนิทใจ : สุดทางแห่งความหวาดระแวง (Intimacy)(หนังสือมีตำหนิ)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-23-525x800.png'),
    ('สร้างชีวิตมหัศจรรย์ด้วยน้ำนมแม่ (หนังสือมีตำหนิเล็กน้อย)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-03.png'),
    ('สอนลูกรักให้รู้เท่าทันอันตรายรอบด้าน', 'https://freemindbook.com/wp-content/uploads/2018/02/web-book-96.png'),
    ('สันติสุขทุกลมหายใจ (Peace is Every Breath)', 'https://freemindbook.com/wp-content/uploads/2018/09/web-book-16-525x800.png')
) AS covers(title, cover_image_url)
WHERE b.title = covers.title
  AND b.publisher = 'FreeMind Publishing'
  AND b.cover_image_url IS DISTINCT FROM covers.cover_image_url;
