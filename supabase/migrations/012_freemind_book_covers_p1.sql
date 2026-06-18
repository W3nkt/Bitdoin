-- ============================================================
-- FreeMind Books — Page 1 cover images
--
-- Cover URLs were matched against the publisher's indexed
-- product pages. This migration is idempotent and only updates
-- matching FreeMind Publishing records from page 1.
--
-- Note: both imported editions of "The Goal" use the same
-- verified Thai-edition cover because no separate indexed cover
-- was available for the "(ฉบับปรับปรุงใหม่)" record.
-- ============================================================

UPDATE public.books AS b
SET
  cover_image_url = covers.cover_image_url,
  updated_at = now()
FROM (
  VALUES
    (
      '100 สูตรน้ำดีท็อกซ์',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-13-525x800.png'
    ),
    (
      'ABOVE AVERAGE วิธีปลดล็อกศักยภาพ และกลายเป็นคนเหนือ ''ค่าเฉลี่ย''',
      'https://freemindbook.com/wp-content/uploads/2023/10/ABOVE-AVERAGE.jpg'
    ),
    (
      'How to be เศรษฐีพอเพียง',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-11-525x800.png'
    ),
    (
      'เคล็ดลับการตลาดที่ทำให้ "ขายดี" จนผลิตไม่ทัน',
      'https://freemindbook.com/wp-content/uploads/2024/03/SOLD-OUT-หน้า.png'
    ),
    (
      'TGAT1 การสื่อสารภาษาอังกฤษ',
      'https://freemindbook.com/wp-content/uploads/2023/12/TGAT1-หน้า.jpg'
    ),
    (
      'The Goal : กระบวนการเพื่อการปรับปรุงที่ไม่หยุดยั้ง',
      'https://freemindbook.com/wp-content/uploads/2019/06/web-book-89-525x800.png'
    ),
    (
      'The Goal : กระบวนการเพื่อการปรับปรุงที่ไม่หยุดยั้ง (ฉบับปรับปรุงใหม่)',
      'https://freemindbook.com/wp-content/uploads/2019/06/web-book-89-525x800.png'
    ),
    (
      'The Right Leader Way of 8s for Timeless Leader',
      'https://freemindbook.com/wp-content/uploads/2026/03/สไลด์1.png'
    ),
    (
      'กระต่ายน้อยจอมเกี่ยงงาน',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-52-525x800.png'
    ),
    (
      'กลับบ้านที่แท้จริง (ปกใหม่)',
      'https://freemindbook.com/wp-content/uploads/2019/04/กลับบ้าน-หน้า.jpg'
    ),
    (
      'กลัว : หัวใจของปัญญาญาณเพื่อผ่านพ้นพายุ (Fear)',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-15-525x800.png'
    ),
    (
      'การจัดการการท่องเที่ยวและการพัฒนาชุมชนการท่องเที่ยวภายใต้พลวัตโลก',
      'https://freemindbook.com/wp-content/uploads/2021/03/พลวัติ-01.jpg'
    ),
    (
      'การตลาดแบบผู้ประกอบการ (Entrepreneurial Marketing)',
      'https://freemindbook.com/wp-content/uploads/2025/08/การตลาด-หน้า.jpg'
    ),
    (
      'ขจัดไขมันพอกตับด้วยเคล็ดลับที่ง่ายเกินคาด',
      'https://freemindbook.com/wp-content/uploads/2018/10/ปกไขมันพอกตับ-10102018-03.png'
    ),
    (
      'ขยับวันละนิด พิชิตปัญหาสุขภาพ',
      'https://freemindbook.com/wp-content/uploads/2018/02/web-book10.jpg'
    ),
    (
      'คมเขี้ยว Startup',
      'https://freemindbook.com/wp-content/uploads/2023/03/คมเขี้ยว-3.jpg'
    ),
    (
      'ความสุข : ความรุ่งเรืองที่แท้จริงเพียงหนึ่งเดียว (Happiness)',
      'https://freemindbook.com/wp-content/uploads/2023/02/ความสุข-พื้นผ้า.jpg'
    ),
    (
      'ความสุข is here',
      'https://freemindbook.com/wp-content/uploads/2023/09/ความสุข-is-here-new.jpg'
    ),
    (
      'ความสุข is here เรียกเหมียวๆเดี๋ยวก็มา',
      'https://freemindbook.com/wp-content/uploads/2019/04/web-book88.jpg'
    ),
    (
      'ความเงียบ',
      'https://freemindbook.com/wp-content/uploads/2018/10/web-book-85-525x800.png'
    ),
    (
      'คัมภีร์สุขภาพดี',
      'https://freemindbook.com/wp-content/uploads/2023/11/คัมภีร์.jpg'
    ),
    (
      'คิดรอบบ้าน',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-76.png'
    ),
    (
      'คุณธรรมนำความรู้ (ฉบับปรับปรุงใหม่)',
      'https://freemindbook.com/wp-content/uploads/2018/09/web-book-70.png'
    ),
    (
      'คุรุวิพากษ์คุรุ',
      'https://freemindbook.com/wp-content/uploads/2022/09/Cover-คุรุวิพากษ์คุรุ-1.jpg'
    )
) AS covers(title, cover_image_url)
WHERE b.title = covers.title
  AND b.publisher = 'FreeMind Publishing'
  AND b.cover_image_url IS DISTINCT FROM covers.cover_image_url;
