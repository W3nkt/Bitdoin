-- Book Intake batch C: naiin-sourced rows for cover-photo books (Thai print editions).
-- Run manually in the Supabase SQL editor. Rows are is_active = false (pending
-- until a bookstore price is submitted and an admin publishes them).
--
-- Not included (see agent report):
--   * The ONE Thing / กฎแห่งสิ่งเดียว (ISBN 9786162877476): already published in the live
--     catalog and already queued in generated/20260823-1250-three-success-books.sql.
--   * NETFLIX กฎที่นี่คือไม่มีกฎ (No Rules Rules): no listing found on naiin.com.
--
-- publication_date = naiin "SellDate" (date released on naiin), same convention as
-- generated/20261019-1330-diary-of-a-ceo-same-as-ever-naiin.sql.

-- Source: https://www.naiin.com/product/detail/682139
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786160853700',
  'รู้ทันสันดานมนุษย์',
  'ROBERT GREENE',
  'เชนจ์พลัส/Change+',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>คู่มืออ่านเกมอำนาจ การควบคุมคน และจิตวิทยาด้านมืด<br />สำหรับ &ldquo;เอาตัวรอด&rdquo; และ &ldquo;อยู่เหนือคน&rdquo;<br /><br />&nbsp;&nbsp;&nbsp; โดย&nbsp;Robert Greene&nbsp;ผู้เขียนหนังสือขายดีระดับโลก&nbsp;The&nbsp;48&nbsp;Laws of Power&nbsp;หนึ่งในนักเขียนแนววิเคราะห์พฤติกรรมมนุษย์ฝีมือจัดจ้านที่สุดในยุคปัจจุบัน<br />เราทุกคนไม่ว่าจะเป็นใคร ต่างก็ตกอยู่ภายใต้อำนาจของกฎ 18 ประการของธรรมชาติมนุษย์<br />หนังสือเล่มนี้จะไล่เรียงกฎทั้ง 18 ประการทีละข้อ พร้อมยกตัวอย่างคนดังชื่อกระฉ่อนโลกที่ตกอยู่ภายใต้อำนาจกฎข้อนั้น ๆ เช่น ควีนเอลิซาเบทที่ 1,&nbsp;เหมา เจ๋อตง,&nbsp;โคโค่ ชาเนล,&nbsp;พระเจ้าหลุยห์ที่ 16 ฯลฯ&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br />&nbsp;&nbsp;&nbsp;&nbsp;พร้อมบอกวิธีเอาตัวรอดและวิธีใช้ประโยชน์จากกฎแต่ละข้ออย่างละเอียดยิบ<br />การรู้ว่ากฎทั้ง 18 ประการมีอะไรบ้างและฝึกฝนจนเชี่ยวชาญจะทำให้เราจะรู้เท่าทันตัวเอง รู้เท่าทันคนอื่น ปกป้องตัวเองจากเล่ห์เหลี่ยม จนถึงขั้นโน้มน้าวใจ หรือบงการคนได้<br />หนังสือเล่มนี้เป็นคู่มือเล่นเกมชีวิต ถ้าเราเชี่ยวชาญศาสตร์ในหนังสือเล่มนี้ เราก็จะเป็นผู้ชนะเกมชีวิต<br />ไม่อยากตกเป็นเหยื่อของใคร ไม่อยากโดนโลกใบนี้กลืนกินโดยไม่รู้ตัว ต้องอ่านหนังสือเล่มนี้</p>$desc$,
  728,
  '2025-09-27',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202508/682139/1000284515_front_XXXL.jpg?v=1759117865',
  false
);

-- Source: https://www.naiin.com/product/detail/561894
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786169405177',
  'The 4-Hour Workweek ทำน้อย---แต่รวยมาก (ฉบับปรับปรุง)',
  'Timothy Ferriss (ทิม เฟอร์ริส)',
  'O2',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p><strong>The 4-Hour Workweek ทำน้อย---แต่รวยมาก (ฉบับปรับปรุง)</strong></p><p>ลืมความคิดเก่าๆ เรื่องการวางแผนเกษียณ และการรอทำความฝันทุกอย่าง<br />เมื่อได้หยุดพักหลังเกษียณไปได้เลย เพราะคุณสามารถทำทุกอย่างที่อยาก<br />ทำได้ตั้งแต่วันนี้ ไม่ว่าจะเป็นการเดินทางท่องเที่ยวรอบโลก การมีรายได้ 6<br />หลักต่อเดือนจากธุรกิจที่คุณไม่ต้องเสียเวลาดูแลหรือเพียงแค่การได้มีเวลา<br />ใช้ชีวิตมากขึ้นและทำงานน้อยลง หนังสือเล่มนี้จะเป็นพิมพ์เขียวที่สอนให้<br />คุณสามารถออกแบบชีวิตที่ต้องการด้วยวิธีการที่ทำได้จริง อาทิเช่น</p><ul><li>วิธีการสร้างระบบทำเงินอัตโนมัติที่เหมาะกับความสามารถของคุณ<br />(โดยใช้เวลาทำงานเพียงแค่ 4 ชั่วโมงต่อสัปดาห์)</li><li>วิธีการเปลี่ยนรูปแบบการทำงานระยะยาวให้เหนื่อยน้อยลงและมี<br />เวลาเกษียณแบบย่อยๆ บ่อยเท่าที่คุณต้องการ</li><li>วิธีกลายเป็นผู้เชี่ยวชาญภายใน 3 สัปดาห์ และเริ่มธุรกิจทำเงินของตัวเอง</li><li>วิธีการหนีจากที่ทำงานไปเที่ยวรอบโลกโดยที่ไม่ถูกไล่ออก</li></ul><p>ทุกวิธีการที่รวบรวมไว้ในหนังสือเล่มนี้ จะช่วยให้คุณง้างโซ่ตรวนที่ล่ามคุณไว้กับ<br />นิยายการทำงานแบบเดิมๆ และปลดปล่อยคุณให้โบยบินไปสู่การเป็น "เศรษฐี<br />แนวใหม่" ที่มีอิสรภาพทั้งด้านการเงิน เวลา และความสุขในแบบที่คุณเป็นคนเลือก</p>$desc$,
  488,
  '2022-10-11',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202209/561894/1000254997_front_XXXL.jpg?v=1725917576',
  false
);

-- Source: https://www.naiin.com/product/detail/601738
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '9786168329290',
  'CLEAR THINKING คิดให้เฉียบคม',
  'Shane Parrish',
  'O2',
  'Thai',
  (select id from public.categories where slug = 'education'),
  $desc$<p>&nbsp; ในชีวิตนี้เรามักรู้สึกเสียใจกับสิ่งที่ได้ทำไปแล้วและสิ่งที่ไม่ได้ทำ แต่สิ่งที่น่าเสียใจมากที่สุดก็คือการที่เราเลือกทำบางอย่างเพราะถูกบงการชีวิตอยู่โดยไม่รู้ตัวหลายครั้งสถานการณ์บีบบังคับให้เราตัดสินใจ สังคมกระตุ้นให้เราต้องทำตามกระแส และหลายครั้งอารมณ์ตามสัญชาตญาณก็ผลักให้เราทำสิ่งที่ต้องเสียใจภายหลังนี่คือสิ่งที่ Shane Parrish อดีตหน่วยข่าวกรองผู้ต้องทำงานกับการตัดสินใจที่สำคัญในทุกๆ วันได้ตระหนักถึงจะเป็นอย่างไรหากเราสามารถสร้างกระบวนการคิดและตัดสินใจได้อย่างยอดเยี่ยม และเมื่อเจอกับสถานการณ์ที่ต้องตัดสินใจก็สามารถนำระบบนั้นมาใช้ได้ทันทีเราจะมีสติไม่ตัดสินใจตามอารมณ์หรือตามสถานการณ์บังคับ เราจะคิดทบทวนการตัดสินใจได้อย่างรอบคอบและอาจมองเห็นตัวเลือกอื่นที่มองไม่เห็นในตอนแรกการตัดสินใจที่ดีต้องสอดคล้องกับเป้าหมายในระยะยาวและสิ่งที่เราให้คุณค่า&nbsp;ซึ่งนี่คือสิ่งที่จะทำให้เราอิ่มเอมใจในชีวิตได้อย่างแท้จริงหนังสือเล่มนีจะช่วยคุณลับกระบวนการคิดให้เฉียบคม และทำให้การตัดสินใจในทุกๆ วันของคุณเป็นโอกาสสู่ชีวิตที่คุณต้องการอย่างแท้จริง</p>$desc$,
  296,
  '2024-01-25',
  'https://storage.naiin.com/system/application/bookstore/resource/product/202401/601738/1000268649_front_XXXL.jpg?v=1725903270',
  false
);
