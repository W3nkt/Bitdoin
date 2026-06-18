-- ============================================================
-- FreeMind Books — Page 2 cover images
--
-- Cover URLs were matched against the publisher's indexed
-- product pages. This migration is idempotent and only updates
-- matching FreeMind Publishing records from page 2.
-- ============================================================

UPDATE public.books AS b
SET
  cover_image_url = covers.cover_image_url,
  updated_at = now()
FROM (
  VALUES
    (
      'ชีวิตสมาร์ต ฉลาดออมเงิน',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-07.png'
    ),
    (
      'ชีวิตสมาร์ต ฉลาดใช้เงิน',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-05.png'
    ),
    (
      'ชุดเสริมภูมิลูกรักให้แข็งแรง (3 เล่ม) (ส่งฟรี)',
      'https://freemindbook.com/wp-content/uploads/2021/07/Post-หมวดแม่และเด็ก-01.jpg'
    ),
    (
      'ด้วยรักบันดาล นิทานสีขาว รวมนิทานสร้างสุข',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-41-525x800.png'
    ),
    (
      'ดีต่อใจ',
      'https://freemindbook.com/wp-content/uploads/2022/08/ดีต่อใจ.jpg'
    ),
    (
      'ดีไซน์รัก BEING IN LOVE',
      'https://freemindbook.com/wp-content/uploads/2021/04/web-02.jpg'
    ),
    (
      'ตีโจทย์แตก :ข้อสอบ GRAMMAR',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-28-525x800.png'
    ),
    (
      'ตื่นรู้ : กุญแจสู่ชีวิตที่สมดุล (Awareness)',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-20-525x800.png'
    ),
    (
      'ถอดรหัสชีวิต โลก และธรรม',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-59-525x800.png'
    ),
    (
      'นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 1 (ฉบับปรับปรุงใหม่)',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-45-525x800.png'
    ),
    (
      'นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม 3',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-43-525x800.png'
    ),
    (
      'นิทานสีขาว ชุดนิทานพัฒนาชีวิต เล่ม4',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-42-525x800.png'
    ),
    (
      'นิทานสีขาวชุดพัฒนาชีวิต รวมนิทานคัดสรร',
      'https://freemindbook.com/wp-content/uploads/2020/03/web-book87.jpg'
    ),
    (
      'บั๊ดกับช็อกโกแลตแสนอร่อย',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-49-525x800.png'
    ),
    (
      'ปรับจิต เปลี่ยนใจ',
      'https://freemindbook.com/wp-content/uploads/2022/01/รูปภาพ4-525x800.jpg'
    ),
    (
      'ปลดล็อก "อารมณ์" กับหมอเวช',
      'https://freemindbook.com/wp-content/uploads/2025/03/CoverWeb.png'
    ),
    (
      'ปล่อย : พลังแห่งการให้อภัยซ่อนอยู่ในความโกรธ',
      'https://freemindbook.com/wp-content/uploads/2024/02/ปล่อย-หน้า.jpg'
    ),
    (
      'ป้องกันลูกป่วย ด้วยอาหารสุขภาพ',
      'https://freemindbook.com/wp-content/uploads/2018/02/web-book-91-525x800.png'
    ),
    (
      'ปัญญาญาณ : การรู้ที่อยู่นอกเหตุเหนือผล (Intuition)',
      'https://freemindbook.com/wp-content/uploads/2018/02/web-book98.jpg'
    ),
    (
      'ปาฏิหาริย์แห่งการรักตัวเอง',
      'https://freemindbook.com/wp-content/uploads/2023/09/Cover-ปาฏิหาริย์แห่งการรักตัวเอง.jpg'
    ),
    (
      'ผ่านฉลุย ตะลุย CU-TEP',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-94.png'
    ),
    (
      'ผ่านฉลุย ตะลุย GAT ภาษาอังกฤษ',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-29-525x800.png'
    ),
    (
      'ผ่านฉลุย ตะลุย TOEFL ITP',
      'https://freemindbook.com/wp-content/uploads/2022/07/TOEFL.jpg'
    ),
    (
      'ผ่านฉลุย ตะลุย TOEIC (ฉบับเก่า)',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-27.png'
    )
) AS covers(title, cover_image_url)
WHERE b.title = covers.title
  AND b.publisher = 'FreeMind Publishing'
  AND b.cover_image_url IS DISTINCT FROM covers.cover_image_url;
