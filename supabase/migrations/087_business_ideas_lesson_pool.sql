-- Bulk lesson-pool seed: Business ideas direction.
-- Adds original, evergreen small-business lessons so the pool has 50+
-- published lessons before launch; the weekly content-forge job adds on top.

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'BUSINESS_IDEA', v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    $$validate-demand-before-building-anything$$,
    $$Validate real demand before building anything$$,
    $$ພິສູດຄວາມຕ້ອງການຈິງກ່ອນສ້າງຫຍັງ$$,
    $$Talk to potential customers before spending money — their reactions tell you more than any assumption.$$,
    $$ລົມກັບລູກຄ້າທີ່ອາດເປັນໄປໄດ້ກ່ອນໃຊ້ເງິນ — ປະຕິກິລິຍາຂອງເຂົາບອກໄດ້ຫຼາຍກວ່າການສົມມຸດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Talk to ten potential customers first$$, 'body', $$Before building anything, describe your idea to ten people who'd actually buy it and listen carefully to their real reactions.$$),
      jsonb_build_object('heading', $$Watch for real commitment, not polite interest$$, 'body', $$"That sounds nice" means little — asking someone to pre-order or put down a deposit reveals whether the interest is real.$$),
      jsonb_build_object('heading', $$Be willing to hear "no"$$, 'body', $$If most people aren't genuinely excited, that's valuable information now — far cheaper to learn before spending money than after.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລົມກັບລູກຄ້າທີ່ອາດເປັນໄປໄດ້ 10 ຄົນກ່ອນ$$, 'body', $$ກ່ອນສ້າງຫຍັງ ອະທິບາຍແນວຄິດໃຫ້ 10 ຄົນທີ່ຈະຊື້ແທ້ ແລະ ຟັງປະຕິກິລິຍາຈິງຂອງເຂົາຢ່າງລະມັດລະວັງ.$$),
      jsonb_build_object('heading', $$ຈັບຕາຄວາມຕັ້ງໃຈຈິງ ບໍ່ແມ່ນຄວາມສົນໃຈແບບສຸພາບ$$, 'body', $$"ຟັງດີເນາະ" ບໍ່ໄດ້ໝາຍຄວາມຫຍັງຫຼາຍ — ການຂໍໃຫ້ສັ່ງຈອງລ່ວງໜ້າ ຫຼືວາງເງິນມັດຈຳ ເປີດເຜີຍວ່າຄວາມສົນໃຈຈິງ ຫຼືບໍ່.$$),
      jsonb_build_object('heading', $$ພ້ອມທີ່ຈະໄດ້ຍິນ "ບໍ່"$$, 'body', $$ຖ້າຄົນສ່ວນຫຼາຍບໍ່ຕື່ນເຕັ້ນແທ້ ນັ້ນເປັນຂໍ້ມູນທີ່ມີຄຸນຄ່າຕອນນີ້ — ຮຽນຮູ້ກ່ອນໃຊ້ເງິນ ຖືກກວ່າຫຼັງໃຊ້ໄປແລ້ວຫຼາຍ.$$)
    ),
    array[$$Talk to ten real potential customers before building anything$$, $$Watch for real commitment, not just polite interest$$, $$Be genuinely willing to hear "no" before spending money$$],
    array[$$ລົມກັບລູກຄ້າທີ່ອາດເປັນໄປໄດ້ 10 ຄົນກ່ອນສ້າງຫຍັງ$$, $$ຈັບຕາຄວາມຕັ້ງໃຈຈິງ ບໍ່ແມ່ນຄວາມສົນໃຈແບບສຸພາບ$$, $$ພ້ອມທີ່ຈະໄດ້ຍິນ "ບໍ່" ກ່ອນໃຊ້ເງິນ$$],
    5, false, 20
  ),
  (
    $$write-a-simple-one-page-business-plan$$,
    $$Write a simple one-page business plan$$,
    $$ຂຽນແຜນທຸລະກິດໜຶ່ງໜ້າແບບງ່າຍ$$,
    $$A short, clear plan you'll actually use beats a long document that sits unread.$$,
    $$ແຜນສັ້ນ ແລະ ຊັດເຈນທີ່ໃຊ້ໄດ້ຈິງ ດີກວ່າເອກະສານຍາວທີ່ບໍ່ໄດ້ອ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Answer five core questions$$, 'body', $$Who is the customer, what problem do you solve, how do you make money, what will it cost to start, and how will people find you?$$),
      jsonb_build_object('heading', $$Keep it to one page$$, 'body', $$If you can't explain your business in one page, the idea likely needs more clarity before you invest time and money.$$),
      jsonb_build_object('heading', $$Revisit and update it monthly$$, 'body', $$Treat the plan as a living document — update it as you learn from real customers, not something written once and forgotten.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕອບຫ້າຄຳຖາມຫຼັກ$$, 'body', $$ລູກຄ້າແມ່ນໃຜ, ແກ້ບັນຫາຫຍັງ, ຫາລາຍໄດ້ແນວໃດ, ຕ້ອງໃຊ້ເງິນເທົ່າໃດເລີ່ມຕົ້ນ ແລະ ຄົນຈະຮູ້ຈັກທ່ານແນວໃດ?$$),
      jsonb_build_object('heading', $$ຮັກສາໃຫ້ບໍ່ເກີນໜຶ່ງໜ້າ$$, 'body', $$ຖ້າອະທິບາຍທຸລະກິດໃນໜຶ່ງໜ້າບໍ່ໄດ້ ແນວຄິດອາດຕ້ອງການຄວາມຊັດເຈນເພີ່ມກ່ອນລົງທຶນເວລາ ແລະ ເງິນ.$$),
      jsonb_build_object('heading', $$ທົບທວນ ແລະ ອັບເດດທຸກເດືອນ$$, 'body', $$ຖືວ່າແຜນເປັນເອກະສານທີ່ມີຊີວິດ — ອັບເດດຕາມສິ່ງທີ່ຮຽນຮູ້ຈາກລູກຄ້າຈິງ ບໍ່ແມ່ນຂຽນຄັ້ງດຽວແລ້ວລືມ.$$)
    ),
    array[$$Answer who, what problem, how you make money, cost, and reach$$, $$Keep the entire plan to one clear page$$, $$Revisit and update the plan monthly as you learn$$],
    array[$$ຕອບວ່າໃຜ, ບັນຫາຫຍັງ, ຫາລາຍໄດ້ແນວໃດ, ຕົ້ນທຶນ ແລະ ການເຂົ້າເຖິງ$$, $$ຮັກສາແຜນທັງໝົດໃຫ້ບໍ່ເກີນໜຶ່ງໜ້າ$$, $$ທົບທວນ ແລະ ອັບເດດແຜນທຸກເດືອນຕາມສິ່ງທີ່ຮຽນຮູ້$$],
    5, false, 21
  ),
  (
    $$price-your-product-or-service-correctly$$,
    $$Price your product or service correctly$$,
    $$ຕັ້ງລາຄາສິນຄ້າ ຫຼືບໍລິການໃຫ້ຖືກຕ້ອງ$$,
    $$Price based on the value you provide and your real costs, not just guesswork or copying a competitor.$$,
    $$ຕັ້ງລາຄາອີງໃສ່ຄຸນຄ່າທີ່ໃຫ້ ແລະ ຕົ້ນທຶນຈິງ ບໍ່ແມ່ນແຕ່ການເດົາ ຫຼືລອກຄູ່ແຂ່ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Calculate your true cost first$$, 'body', $$Include materials, your time, and overhead — many new business owners forget to value their own labor when pricing.$$),
      jsonb_build_object('heading', $$Check what customers are actually willing to pay$$, 'body', $$Look at comparable options and ask a few real customers what price would feel fair — this grounds the number in reality.$$),
      jsonb_build_object('heading', $$Don't compete on price alone$$, 'body', $$Being the cheapest is hard to sustain — competing on quality, service, or a specific niche is usually more viable long-term.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄິດໄລ່ຕົ້ນທຶນຈິງກ່ອນ$$, 'body', $$ລວມວັດຖຸດິບ, ເວລາຂອງທ່ານ ແລະ ຄ່າໃຊ້ຈ່າຍທົ່ວໄປ — ຜູ້ເລີ່ມທຸລະກິດໃໝ່ຫຼາຍຄົນລືມໃສ່ຄ່າແຮງງານຂອງຕົນເອງຕອນຕັ້ງລາຄາ.$$),
      jsonb_build_object('heading', $$ກວດວ່າລູກຄ້າຍອມຈ່າຍເທົ່າໃດແທ້$$, 'body', $$ເບິ່ງທາງເລືອກທີ່ຄ້າຍກັນ ແລະ ຖາມລູກຄ້າຈິງສອງສາມຄົນວ່າລາຄາໃດຮູ້ສຶກຍຸດຕິທຳ — ນີ້ອີງຕົວເລກໃສ່ຄວາມເປັນຈິງ.$$),
      jsonb_build_object('heading', $$ຢ່າແຂ່ງດ້ວຍລາຄາຢ່າງດຽວ$$, 'body', $$ການເປັນຜູ້ຖືກທີ່ສຸດຮັກສາໄດ້ຍາກ — ການແຂ່ງດ້ວຍຄຸນນະພາບ, ການບໍລິການ ຫຼືກຸ່ມສະເພາະ ມັກຍືນຍົງກວ່າໃນໄລຍະຍາວ.$$)
    ),
    array[$$Calculate your true cost, including your own time$$, $$Check what customers are realistically willing to pay$$, $$Compete on value, not just on being the cheapest$$],
    array[$$ຄິດໄລ່ຕົ້ນທຶນຈິງ ລວມທັງເວລາຂອງທ່ານເອງ$$, $$ກວດວ່າລູກຄ້າຍອມຈ່າຍເທົ່າໃດແທ້ຢ່າງເປັນຈິງ$$, $$ແຂ່ງດ້ວຍຄຸນຄ່າ ບໍ່ແມ່ນແຕ່ການເປັນຜູ້ຖືກທີ່ສຸດ$$],
    5, false, 22
  ),
  (
    $$find-your-first-paying-customer$$,
    $$Find your first paying customer$$,
    $$ຊອກຫາລູກຄ້າຄົນທຳອິດທີ່ຈ່າຍເງິນຈິງ$$,
    $$Your existing network is usually the fastest path to a real first sale.$$,
    $$ເຄືອຂ່າຍທີ່ມີຢູ່ແລ້ວ ມັກເປັນເສັ້ນທາງໄວທີ່ສຸດໄປສູ່ການຂາຍຈິງຄັ້ງທຳອິດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with people who already trust you$$, 'body', $$Friends, family, and past colleagues are often more willing to give a new business a genuine try than strangers.$$),
      jsonb_build_object('heading', $$Offer a genuine, honest first-customer deal$$, 'body', $$A fair discount for being early feels honest — just be clear it's a real product, not a favor you're asking them to pretend to like.$$),
      jsonb_build_object('heading', $$Treat the first sale as a learning opportunity$$, 'body', $$Ask detailed questions about their experience — your first customer teaches you more than any amount of planning alone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມຈາກຄົນທີ່ໄວ້ໃຈທ່ານຢູ່ແລ້ວ$$, 'body', $$ໝູ່, ຄອບຄົວ ແລະ ອະດີດເພື່ອນຮ່ວມງານ ມັກເຕັມໃຈລອງທຸລະກິດໃໝ່ແທ້ຫຼາຍກວ່າຄົນແປກໜ້າ.$$),
      jsonb_build_object('heading', $$ສະເໜີຂໍ້ສະເໜີລູກຄ້າຄົນທຳອິດຢ່າງຈິງໃຈ$$, 'body', $$ສ່ວນຫຼຸດຍຸຕິທຳສຳລັບການເປັນລູກຄ້າຕົ້ນໆຮູ້ສຶກຊື່ສັດ — ພຽງແຕ່ບອກໃຫ້ຊັດວ່າເປັນຜະລິດຕະພັນຈິງ ບໍ່ແມ່ນຄວາມຊ່ວຍເຫຼືອທີ່ຂໍໃຫ້ຊົມ.$$),
      jsonb_build_object('heading', $$ຖືວ່າການຂາຍຄັ້ງທຳອິດເປັນໂອກາດຮຽນຮູ້$$, 'body', $$ຖາມລາຍລະອຽດກ່ຽວກັບປະສົບການຂອງເຂົາ — ລູກຄ້າຄົນທຳອິດສອນທ່ານໄດ້ຫຼາຍກວ່າການວາງແຜນຢ່າງດຽວ.$$)
    ),
    array[$$Start with people who already trust you$$, $$Offer an honest, fair first-customer deal$$, $$Treat the first sale as a real learning opportunity$$],
    array[$$ເລີ່ມຈາກຄົນທີ່ໄວ້ໃຈທ່ານຢູ່ແລ້ວ$$, $$ສະເໜີຂໍ້ສະເໜີລູກຄ້າຄົນທຳອິດຢ່າງຊື່ສັດ$$, $$ຖືວ່າການຂາຍຄັ້ງທຳອິດເປັນໂອກາດຮຽນຮູ້ຈິງ$$],
    4, false, 23
  ),
  (
    $$build-a-minimum-viable-product$$,
    $$Build a minimum viable product before the full version$$,
    $$ສ້າງຜະລິດຕະພັນຂັ້ນຕ່ຳທີ່ໃຊ້ໄດ້ກ່ອນສະບັບເຕັມ$$,
    $$Build the smallest version that solves the core problem, then improve based on real use.$$,
    $$ສ້າງສະບັບນ້ອຍທີ່ສຸດທີ່ແກ້ບັນຫາຫຼັກໄດ້ ແລ້ວປັບປຸງຕາມການໃຊ້ງານຈິງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Identify the one core problem to solve$$, 'body', $$Strip away every feature except the one that solves the customer's main pain point — everything else can wait.$$),
      jsonb_build_object('heading', $$Ship something imperfect but real$$, 'body', $$A simple, working version in customers' hands teaches more than months of polishing something nobody has tried yet.$$),
      jsonb_build_object('heading', $$Use real feedback to decide what's next$$, 'body', $$Let actual customer reactions, not your own assumptions, guide which features to build next.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລະບຸບັນຫາຫຼັກໜຶ່ງອັນທີ່ຈະແກ້$$, 'body', $$ຕັດທຸກຄຸນສົມບັດອອກ ນອກຈາກອັນທີ່ແກ້ບັນຫາຫຼັກຂອງລູກຄ້າ — ອັນອື່ນລໍໄດ້.$$),
      jsonb_build_object('heading', $$ປ່ອຍອອກໄປທັງທີ່ຍັງບໍ່ສົມບູນແຕ່ໃຊ້ໄດ້ຈິງ$$, 'body', $$ສະບັບງ່າຍທີ່ໃຊ້ໄດ້ຈິງໃນມືລູກຄ້າ ສອນໄດ້ຫຼາຍກວ່າການປັບແຕ່ງເປັນເດືອນທີ່ຍັງບໍ່ມີໃຜລອງ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຄຳຄິດເຫັນຈິງຕັດສິນວ່າຈະເຮັດຫຍັງຕໍ່$$, 'body', $$ໃຫ້ປະຕິກິລິຍາລູກຄ້າຈິງ ບໍ່ແມ່ນການສົມມຸດຂອງທ່ານເອງ ນຳທາງວ່າຈະສ້າງຄຸນສົມບັດໃດຕໍ່ໄປ.$$)
    ),
    array[$$Strip the product to the one core problem it solves$$, $$Ship an imperfect, real version instead of endless polishing$$, $$Let real customer feedback guide what to build next$$],
    array[$$ຕັດຜະລິດຕະພັນໃຫ້ເຫຼືອບັນຫາຫຼັກໜຶ່ງອັນທີ່ແກ້$$, $$ປ່ອຍສະບັບທີ່ໃຊ້ໄດ້ຈິງ ແທນການປັບແຕ່ງບໍ່ຢຸດ$$, $$ໃຫ້ຄຳຄິດເຫັນລູກຄ້າຈິງນຳທາງວ່າຈະສ້າງຫຍັງຕໍ່ໄປ$$],
    5, false, 24
  ),
  (
    $$understand-your-break-even-point$$,
    $$Understand your business's break-even point$$,
    $$ເຂົ້າໃຈຈຸດຄຸ້ມທຶນຂອງທຸລະກິດ$$,
    $$Knowing exactly how many sales you need to cover costs removes guesswork from your goals.$$,
    $$ການຮູ້ວ່າຕ້ອງຂາຍເທົ່າໃດເພື່ອຄຸ້ມທຶນ ລົບການເດົາອອກຈາກເປົ້າໝາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Separate fixed and variable costs$$, 'body', $$Rent and equipment are fixed regardless of sales volume; materials per item are variable — knowing both is necessary for the calculation.$$),
      jsonb_build_object('heading', $$Calculate the simple formula$$, 'body', $$Divide your fixed costs by the profit you make per unit sold — that's roughly how many units you need to sell to break even.$$),
      jsonb_build_object('heading', $$Use it to set realistic goals$$, 'body', $$Knowing your break-even number turns a vague hope of "doing well" into a specific, trackable monthly target.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ແຍກຄ່າໃຊ້ຈ່າຍຄົງທີ່ ແລະ ຜັນແປ$$, 'body', $$ຄ່າເຊົ່າ ແລະ ອຸປະກອນຄົງທີ່ບໍ່ຂຶ້ນກັບຍອດຂາຍ; ວັດຖຸດິບຕໍ່ຊິ້ນຜັນແປ — ຮູ້ທັງສອງຈຳເປັນສຳລັບການຄິດໄລ່.$$),
      jsonb_build_object('heading', $$ຄິດໄລ່ສູດງ່າຍໆ$$, 'body', $$ຫານຄ່າໃຊ້ຈ່າຍຄົງທີ່ດ້ວຍກຳໄລຕໍ່ໜ່ວຍທີ່ຂາຍໄດ້ — ນັ້ນຄືປະມານຈຳນວນທີ່ຕ້ອງຂາຍເພື່ອຄຸ້ມທຶນ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຕັ້ງເປົ້າໝາຍທີ່ເປັນຈິງ$$, 'body', $$ການຮູ້ຕົວເລກຈຸດຄຸ້ມທຶນ ປ່ຽນຄວາມຫວັງທົ່ວໄປວ່າ "ຈະໄປໄດ້ດີ" ໃຫ້ເປັນເປົ້າໝາຍປະຈຳເດືອນທີ່ຕິດຕາມໄດ້.$$)
    ),
    array[$$Separate your fixed costs from variable per-unit costs$$, $$Calculate roughly how many units you need to sell to break even$$, $$Use the break-even number as a concrete monthly goal$$],
    array[$$ແຍກຄ່າໃຊ້ຈ່າຍຄົງທີ່ ອອກຈາກຄ່າໃຊ້ຈ່າຍຜັນແປຕໍ່ໜ່ວຍ$$, $$ຄິດໄລ່ປະມານຈຳນວນທີ່ຕ້ອງຂາຍເພື່ອຄຸ້ມທຶນ$$, $$ໃຊ້ຕົວເລກຈຸດຄຸ້ມທຶນເປັນເປົ້າໝາຍປະຈຳເດືອນທີ່ຈັບຕ້ອງໄດ້$$],
    5, false, 25
  ),
  (
    $$manage-cash-flow-as-a-small-business$$,
    $$Manage cash flow as a small business$$,
    $$ຈັດການກະແສເງິນສົດໃນຖານະທຸລະກິດນ້ອຍ$$,
    $$A profitable business can still fail from running out of cash at the wrong moment.$$,
    $$ທຸລະກິດທີ່ມີກຳໄລ ຍັງອາດລົ້ມເຫຼວໄດ້ ຖ້າເງິນສົດໝົດໃນຈັງຫວະທີ່ບໍ່ດີ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Track cash in and out weekly$$, 'body', $$A simple weekly check of what's coming in versus going out catches problems early, before they become a crisis.$$),
      jsonb_build_object('heading', $$Keep a cash buffer$$, 'body', $$Set aside enough to cover one to two months of expenses — this cushion protects you from a single slow month or late payment.$$),
      jsonb_build_object('heading', $$Chase late payments promptly$$, 'body', $$Follow up on overdue invoices quickly and politely — cash tied up in unpaid bills doesn't help your business run.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕິດຕາມເງິນເຂົ້າ-ອອກທຸກອາທິດ$$, 'body', $$ການກວດງ່າຍໆທຸກອາທິດວ່າເງິນເຂົ້າ ແລະ ອອກເທົ່າໃດ ຈັບບັນຫາໄດ້ໄວ ກ່ອນມັນກາຍເປັນວິກິດ.$$),
      jsonb_build_object('heading', $$ຮັກສາເງິນສະຫງວນ$$, 'body', $$ເກັບໄວ້ພຽງພໍສຳລັບ 1-2 ເດືອນຂອງຄ່າໃຊ້ຈ່າຍ — ນີ້ປົກປ້ອງທ່ານຈາກເດືອນທີ່ຂາຍຊ້າ ຫຼືການຈ່າຍທີ່ຊັກຊ້າ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມການຈ່າຍທີ່ຊັກຊ້າໄວ$$, 'body', $$ຕິດຕາມໃບແຈ້ງໜີ້ທີ່ຄ້າງໄວ ແລະ ສຸພາບ — ເງິນທີ່ຕິດຢູ່ໃນໜີ້ທີ່ຍັງບໍ່ຈ່າຍ ບໍ່ຊ່ວຍໃຫ້ທຸລະກິດດຳເນີນໄດ້.$$)
    ),
    array[$$Track cash coming in and going out on a weekly basis$$, $$Keep a buffer covering one to two months of expenses$$, $$Follow up on overdue payments promptly and politely$$],
    array[$$ຕິດຕາມເງິນເຂົ້າ ແລະ ອອກເປັນປະຈຳທຸກອາທິດ$$, $$ຮັກສາເງິນສະຫງວນສຳລັບ 1-2 ເດືອນຂອງຄ່າໃຊ້ຈ່າຍ$$, $$ຕິດຕາມການຈ່າຍທີ່ຄ້າງໄວ ແລະ ສຸພາບ$$],
    5, false, 26
  ),
  (
    $$build-a-simple-brand-identity-on-a-budget$$,
    $$Build a simple brand identity on a tight budget$$,
    $$ສ້າງອັດຕະລັກສະນະແບຣນງ່າຍໆດ້ວຍງົບປະມານຈຳກັດ$$,
    $$Consistency across a few simple elements matters more than an expensive design.$$,
    $$ຄວາມສະໝ່ຳສະເໝີໃນອົງປະກອບງ່າຍໆສອງສາມອັນ ສຳຄັນກວ່າການອອກແບບລາຄາແພງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Pick one name, one color, one font$$, 'body', $$Simple consistency across your logo, packaging, and social media builds recognition faster than an inconsistent, ever-changing look.$$),
      jsonb_build_object('heading', $$Use free or low-cost design tools$$, 'body', $$Simple design apps offer free templates good enough to look professional without hiring a designer at the start.$$),
      jsonb_build_object('heading', $$Let the brand reflect a real promise$$, 'body', $$Your brand should communicate what customers can actually count on from you — reliability, quality, warmth — not just look nice.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລືອກໜຶ່ງຊື່, ໜຶ່ງສີ, ໜຶ່ງຕົວອັກສອນ$$, 'body', $$ຄວາມສະໝ່ຳສະເໝີງ່າຍໆໃນໂລໂກ້, ບັນຈຸພັນ ແລະ ໂຊຊຽວມີເດຍ ສ້າງການຈື່ຈຳໄດ້ໄວກວ່າຮູບແບບທີ່ປ່ຽນໄປມາ.$$),
      jsonb_build_object('heading', $$ໃຊ້ເຄື່ອງມືອອກແບບຟຣີ ຫຼືລາຄາຖືກ$$, 'body', $$ແອັບອອກແບບງ່າຍໆມີແບບຟອມຟຣີທີ່ດີພໍໃຫ້ເບິ່ງເປັນມືອາຊີບ ໂດຍບໍ່ຕ້ອງຈ້າງນັກອອກແບບຕັ້ງແຕ່ຕົ້ນ.$$),
      jsonb_build_object('heading', $$ໃຫ້ແບຣນສະທ້ອນຄຳໝັ້ນສັນຍາຈິງ$$, 'body', $$ແບຣນຄວນສື່ສານສິ່ງທີ່ລູກຄ້າວາງໃຈໄດ້ຈາກທ່ານແທ້ — ຄວາມໜ້າເຊື່ອຖື, ຄຸນນະພາບ, ຄວາມອົບອຸ່ນ — ບໍ່ແມ່ນແຕ່ສວຍງາມ.$$)
    ),
    array[$$Keep one consistent name, color, and font everywhere$$, $$Use free or low-cost tools instead of hiring a designer early$$, $$Let your brand communicate a real, honest promise$$],
    array[$$ຮັກສາໜຶ່ງຊື່, ສີ ແລະ ຕົວອັກສອນໃຫ້ສະໝ່ຳສະເໝີ$$, $$ໃຊ້ເຄື່ອງມືຟຣີ ຫຼືລາຄາຖືກ ແທນການຈ້າງນັກອອກແບບແຕ່ຕົ້ນ$$, $$ໃຫ້ແບຣນສື່ສານຄຳໝັ້ນສັນຍາທີ່ຈິງ ແລະ ຊື່ສັດ$$],
    4, false, 27
  ),
  (
    $$sell-on-social-media-effectively$$,
    $$Sell on social media effectively$$,
    $$ຂາຍເທິງໂຊຊຽວມີເດຍຢ່າງມີປະສິດທິພາບ$$,
    $$Consistent, genuine posts that show real value outperform occasional hard-sell posts.$$,
    $$ໂພສທີ່ສະໝ່ຳສະເໝີ ແລະ ຈິງໃຈ ສະແດງຄຸນຄ່າຈິງ ໄດ້ຜົນດີກວ່າໂພສຂາຍໜັກໆເປັນຄັ້ງຄາວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Post consistently, not just when selling$$, 'body', $$Share how products are made, behind-the-scenes moments, and useful tips — this builds a following that trusts you, not just an audience waiting for a sale.$$),
      jsonb_build_object('heading', $$Show real customers using your product$$, 'body', $$Photos or short videos of actual satisfied customers are more convincing than professional-looking product shots alone.$$),
      jsonb_build_object('heading', $$Reply to every comment and message$$, 'body', $$Fast, genuine responses build trust and often directly convert interest into a sale — silence loses customers quietly.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໂພສສະໝ່ຳສະເໝີ ບໍ່ແມ່ນແຕ່ຕອນຂາຍ$$, 'body', $$ແບ່ງປັນວິທີເຮັດຜະລິດຕະພັນ, ຊ່ວງເວລາເບື້ອງຫຼັງ ແລະ ຄຳແນະນຳທີ່ເປັນປະໂຫຍດ — ສ້າງຜູ້ຕິດຕາມທີ່ໄວ້ໃຈ ບໍ່ແມ່ນແຕ່ຄົນລໍຖ້າໂປຣໂມຊັນ.$$),
      jsonb_build_object('heading', $$ສະແດງລູກຄ້າຈິງໃຊ້ຜະລິດຕະພັນ$$, 'body', $$ຮູບ ຫຼືວິດີໂອສັ້ນຂອງລູກຄ້າຈິງທີ່ພໍໃຈ ໜ້າເຊື່ອຖືກວ່າຮູບຜະລິດຕະພັນທີ່ຖ່າຍແບບມືອາຊີບຢ່າງດຽວ.$$),
      jsonb_build_object('heading', $$ຕອບທຸກຄອມເມັນ ແລະ ຂໍ້ຄວາມ$$, 'body', $$ການຕອບໄວ ແລະ ຈິງໃຈ ສ້າງຄວາມໄວ້ໃຈ ແລະ ມັກປ່ຽນຄວາມສົນໃຈເປັນການຂາຍໂດຍກົງ — ຄວາມງຽບເສຍລູກຄ້າແບບງຽບໆ.$$)
    ),
    array[$$Post consistently with genuine content, not just sales pitches$$, $$Show real customers using your product$$, $$Reply to every comment and message quickly$$],
    array[$$ໂພສສະໝ່ຳສະເໝີດ້ວຍເນື້ອຫາຈິງໃຈ ບໍ່ແມ່ນແຕ່ໂຄສະນາຂາຍ$$, $$ສະແດງລູກຄ້າຈິງໃຊ້ຜະລິດຕະພັນ$$, $$ຕອບທຸກຄອມເມັນ ແລະ ຂໍ້ຄວາມໄວ$$],
    4, false, 28
  ),
  (
    $$handle-a-difficult-customer$$,
    $$Handle your first difficult customer well$$,
    $$ຮັບມືລູກຄ້າທີ່ຍາກຄົນທຳອິດໄດ້ດີ$$,
    $$How you handle a complaint often matters more to your reputation than the mistake itself.$$,
    $$ວິທີຮັບມືຄຳຕຳນິ ມັກສຳຄັນຕໍ່ຊື່ສຽງຫຼາຍກວ່າຄວາມຜິດພາດເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Listen fully before responding$$, 'body', $$Let the customer finish explaining their frustration before you defend or explain — feeling heard often defuses anger on its own.$$),
      jsonb_build_object('heading', $$Apologize for the experience, then fix it$$, 'body', $$"I'm sorry this happened" plus a concrete fix works better than defending your process or explaining why it wasn't your fault.$$),
      jsonb_build_object('heading', $$Follow up after resolving it$$, 'body', $$A short check-in after the fix shows genuine care and can turn a complaint into a loyal, forgiving customer.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຟັງໃຫ້ຈົບກ່ອນຕອບໂຕ້$$, 'body', $$ໃຫ້ລູກຄ້າອະທິບາຍຄວາມອຶດອັດຈົນຈົບ ກ່ອນປ້ອງກັນ ຫຼືອະທິບາຍ — ຄວາມຮູ້ສຶກຖືກຟັງ ມັກຄ່ອຍໆລົບຄວາມໃຈຮ້າຍໄດ້ເອງ.$$),
      jsonb_build_object('heading', $$ຂໍໂທດຕໍ່ປະສົບການ ແລ້ວແກ້ໄຂ$$, 'body', $$"ຂໍໂທດທີ່ເກີດເລື່ອງນີ້ຂຶ້ນ" ບວກການແກ້ໄຂຈັບຕ້ອງໄດ້ ໄດ້ຜົນດີກວ່າການປ້ອງກັນຂະບວນການ ຫຼືອະທິບາຍວ່າບໍ່ແມ່ນຄວາມຜິດຂອງທ່ານ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມຫຼັງແກ້ໄຂແລ້ວ$$, 'body', $$ການຕິດຕາມສັ້ນໆຫຼັງແກ້ໄຂແລ້ວ ສະແດງຄວາມໃສ່ໃຈແທ້ ແລະ ອາດປ່ຽນຄຳຕຳນິໃຫ້ເປັນລູກຄ້າທີ່ພັກດີ.$$)
    ),
    array[$$Listen fully before responding or defending yourself$$, $$Apologize for the experience, then offer a concrete fix$$, $$Follow up after resolving to show genuine care$$],
    array[$$ຟັງໃຫ້ຈົບກ່ອນຕອບໂຕ້ ຫຼືປ້ອງກັນຕົນເອງ$$, $$ຂໍໂທດຕໍ່ປະສົບການ ແລ້ວສະເໜີການແກ້ໄຂຈັບຕ້ອງໄດ້$$, $$ຕິດຕາມຫຼັງແກ້ໄຂເພື່ອສະແດງຄວາມໃສ່ໃຈແທ້$$],
    4, false, 29
  ),
  (
    $$build-a-simple-website-cheaply$$,
    $$Build a simple website or online presence cheaply$$,
    $$ສ້າງເວັບໄຊ ຫຼືຕົວຕົນອອນລາຍງ່າຍໆດ້ວຍລາຄາຖືກ$$,
    $$A simple, working page beats no online presence, and often beats an expensive one you never finish.$$,
    $$ໜ້າເວັບງ່າຍໆທີ່ໃຊ້ໄດ້ ດີກວ່າບໍ່ມີຕົວຕົນອອນລາຍ ແລະ ມັກດີກວ່າອັນລາຄາແພງທີ່ບໍ່ເຄີຍເຮັດຈົບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with the essentials only$$, 'body', $$What you sell, how to contact you, and how to pay — a page with just these covers most small business needs at first.$$),
      jsonb_build_object('heading', $$Use free or low-cost builder tools$$, 'body', $$Many simple website builders offer free tiers good enough for a first version — no need to hire a developer to start.$$),
      jsonb_build_object('heading', $$A social media page can be your first website$$, 'body', $$For many small businesses, a well-maintained social media profile with clear contact info works as a perfectly good first storefront.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍສິ່ງຈຳເປັນເທົ່ານັ້ນ$$, 'body', $$ຂາຍຫຍັງ, ຕິດຕໍ່ແນວໃດ ແລະ ຈ່າຍເງິນແນວໃດ — ໜ້າທີ່ມີພຽງແຕ່ນີ້ ຄອບຄຸມຄວາມຕ້ອງການທຸລະກິດນ້ອຍສ່ວນຫຼາຍໃນຕອນເລີ່ມ.$$),
      jsonb_build_object('heading', $$ໃຊ້ເຄື່ອງມືສ້າງເວັບຟຣີ ຫຼືລາຄາຖືກ$$, 'body', $$ເຄື່ອງມືສ້າງເວັບງ່າຍໆຫຼາຍອັນມີລະດັບຟຣີທີ່ດີພໍສຳລັບສະບັບທຳອິດ — ບໍ່ຕ້ອງຈ້າງນັກພັດທະນາຕັ້ງແຕ່ຕົ້ນ.$$),
      jsonb_build_object('heading', $$ໜ້າໂຊຊຽວມີເດຍເປັນເວັບໄຊທຳອິດໄດ້$$, 'body', $$ສຳລັບທຸລະກິດນ້ອຍຫຼາຍອັນ ໂປຣໄຟລ໌ໂຊຊຽວມີເດຍທີ່ດູແລດີ ພ້ອມຂໍ້ມູນຕິດຕໍ່ຊັດເຈນ ໃຊ້ເປັນຮ້ານທຳອິດທີ່ດີໄດ້.$$)
    ),
    array[$$Start with just what you sell, contact, and payment info$$, $$Use free or low-cost website builder tools to start$$, $$A well-maintained social media page can be your first website$$],
    array[$$ເລີ່ມດ້ວຍຂາຍຫຍັງ, ຕິດຕໍ່ ແລະ ຂໍ້ມູນຈ່າຍເງິນເທົ່ານັ້ນ$$, $$ໃຊ້ເຄື່ອງມືສ້າງເວັບຟຣີ ຫຼືລາຄາຖືກເພື່ອເລີ່ມ$$, $$ໜ້າໂຊຊຽວມີເດຍທີ່ດູແລດີ ເປັນເວັບໄຊທຳອິດໄດ້$$],
    4, false, 30
  ),
  (
    $$understand-your-target-customer-deeply$$,
    $$Understand your target customer deeply$$,
    $$ເຂົ້າໃຈລູກຄ້າເປົ້າໝາຍຢ່າງເລິກເຊິ່ງ$$,
    $$Knowing one customer in real detail beats a vague sense of "everyone" as your market.$$,
    $$ຮູ້ຈັກລູກຄ້າໜຶ່ງຄົນຢ່າງລະອຽດຈິງ ດີກວ່າຄວາມຮູ້ສຶກທົ່ວໄປວ່າ "ທຸກຄົນ" ຄືຕະຫຼາດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Describe one specific real person$$, 'body', $$Their age, daily routine, and specific frustration your product solves — a vivid single example beats a vague broad description.$$),
      jsonb_build_object('heading', $$Talk to them regularly, not just once$$, 'body', $$Customer needs shift over time — keep checking in rather than relying on research done once at the very start.$$),
      jsonb_build_object('heading', $$Let this understanding guide every decision$$, 'body', $$Product features, pricing, and marketing language should all trace back to what you know this specific customer actually needs.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອະທິບາຍຄົນຈິງໜຶ່ງຄົນສະເພາະ$$, 'body', $$ອາຍຸ, ກິດຈະວັດປະຈຳວັນ ແລະ ຄວາມອຶດອັດສະເພາະທີ່ຜະລິດຕະພັນທ່ານແກ້ໄດ້ — ຕົວຢ່າງດຽວທີ່ຊັດເຈນ ດີກວ່າຄຳອະທິບາຍກວ້າງໆ.$$),
      jsonb_build_object('heading', $$ລົມກັບເຂົາເປັນປົກກະຕິ ບໍ່ແມ່ນຄັ້ງດຽວ$$, 'body', $$ຄວາມຕ້ອງການລູກຄ້າປ່ຽນແປງຕາມເວລາ — ຕິດຕາມຢ່າງຕໍ່ເນື່ອງ ແທນທີ່ຈະອີງໃສ່ການຄົ້ນຄວ້າຄັ້ງດຽວຕອນເລີ່ມ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມເຂົ້າໃຈນີ້ນຳທາງທຸກການຕັດສິນໃຈ$$, 'body', $$ຄຸນສົມບັດ, ລາຄາ ແລະ ພາສາການຕະຫຼາດ ຄວນຍ້ອນກັບໄປຫາສິ່ງທີ່ຮູ້ວ່າລູກຄ້າສະເພາະນີ້ຕ້ອງການແທ້.$$)
    ),
    array[$$Describe one specific real customer in vivid detail$$, $$Talk to customers regularly, not just once at the start$$, $$Let your understanding of them guide every business decision$$],
    array[$$ອະທິບາຍລູກຄ້າຈິງໜຶ່ງຄົນຢ່າງລະອຽດຊັດເຈນ$$, $$ລົມກັບລູກຄ້າເປັນປົກກະຕິ ບໍ່ແມ່ນຄັ້ງດຽວຕອນເລີ່ມ$$, $$ໃຫ້ຄວາມເຂົ້າໃຈນີ້ນຳທາງທຸກການຕັດສິນໃຈທຸລະກິດ$$],
    5, false, 31
  ),
  (
    $$bootstrap-a-business-without-outside-investment$$,
    $$Bootstrap a business without outside investment$$,
    $$ສ້າງທຸລະກິດດ້ວຍທຶນຕົນເອງໂດຍບໍ່ຕ້ອງມີການລົງທຶນນອກ$$,
    $$Starting small and reinvesting early profit is slower but keeps you in full control.$$,
    $$ການເລີ່ມນ້ອຍ ແລະ ນຳກຳໄລຕົ້ນມາລົງທຶນຄືນ ຊ້າກວ່າແຕ່ຮັກສາການຄວບຄຸມເຕັມທີ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with what you already have$$, 'body', $$Use existing skills, equipment, and space before spending on anything new — many businesses start smaller than owners initially plan.$$),
      jsonb_build_object('heading', $$Reinvest profit before drawing income$$, 'body', $$In the early months, put earnings back into the business rather than treating it as personal income right away.$$),
      jsonb_build_object('heading', $$Grow at the pace real revenue allows$$, 'body', $$Without outside funding, growth is naturally paced by actual sales — this discipline often builds a more resilient business.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍສິ່ງທີ່ມີຢູ່ແລ້ວ$$, 'body', $$ໃຊ້ທັກສະ, ອຸປະກອນ ແລະ ພື້ນທີ່ທີ່ມີຢູ່ກ່ອນໃຊ້ຈ່າຍກັບຂອງໃໝ່ — ທຸລະກິດຫຼາຍອັນເລີ່ມນ້ອຍກວ່າທີ່ເຈົ້າຂອງວາງແຜນໄວ້ຕອນຕົ້ນ.$$),
      jsonb_build_object('heading', $$ນຳກຳໄລລົງທຶນຄືນກ່ອນຖອນລາຍໄດ້ສ່ວນຕົວ$$, 'body', $$ໃນເດືອນທຳອິດ ນຳລາຍໄດ້ກັບຄືນສູ່ທຸລະກິດ ແທນທີ່ຈະຖືວ່າເປັນລາຍໄດ້ສ່ວນຕົວທັນທີ.$$),
      jsonb_build_object('heading', $$ເຕີບໂຕຕາມຈັງຫວະທີ່ລາຍໄດ້ຈິງອະນຸຍາດ$$, 'body', $$ໂດຍບໍ່ມີທຶນນອກ ການເຕີບໂຕຈະຖືກກຳນົດຈັງຫວະຕາມຍອດຂາຍຈິງ — ລະບຽບວິໄນນີ້ ມັກສ້າງທຸລະກິດທີ່ແຂງແກ່ນກວ່າ.$$)
    ),
    array[$$Start with the skills, equipment, and space you already have$$, $$Reinvest early profit before drawing personal income$$, $$Let real revenue set the natural pace of growth$$],
    array[$$ເລີ່ມດ້ວຍທັກສະ, ອຸປະກອນ ແລະ ພື້ນທີ່ທີ່ມີຢູ່ແລ້ວ$$, $$ນຳກຳໄລຕົ້ນລົງທຶນຄືນກ່ອນຖອນລາຍໄດ້ສ່ວນຕົວ$$, $$ໃຫ້ລາຍໄດ້ຈິງກຳນົດຈັງຫວະການເຕີບໂຕ$$],
    5, false, 32
  ),
  (
    $$build-a-small-supplier-network-you-can-trust$$,
    $$Build a small supplier network you can trust$$,
    $$ສ້າງເຄືອຂ່າຍຜູ້ສະໜອງນ້ອຍທີ່ໄວ້ໃຈໄດ້$$,
    $$Reliable suppliers protect you from the stress of last-minute shortages and quality issues.$$,
    $$ຜູ້ສະໜອງທີ່ໜ້າເຊື່ອຖື ປົກປ້ອງທ່ານຈາກຄວາມກົດດັນຂອງການຂາດແຄນນາທີສຸດທ້າຍ ແລະ ບັນຫາຄຸນນະພາບ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Start with a small trial order$$, 'body', $$Test quality, reliability, and communication with a small order before committing to a large or long-term arrangement.$$),
      jsonb_build_object('heading', $$Keep a backup option for anything critical$$, 'body', $$Relying on a single supplier for something essential is risky — have at least one alternative you could turn to.$$),
      jsonb_build_object('heading', $$Build the relationship, not just the transaction$$, 'body', $$Paying on time and communicating clearly earns goodwill that can help you during shortages or when you need a favor.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເລີ່ມດ້ວຍການສັ່ງທົດລອງນ້ອຍ$$, 'body', $$ທົດສອບຄຸນນະພາບ, ຄວາມໜ້າເຊື່ອຖື ແລະ ການສື່ສານດ້ວຍການສັ່ງນ້ອຍ ກ່ອນຕົກລົງແບບໃຫຍ່ ຫຼືໄລຍະຍາວ.$$),
      jsonb_build_object('heading', $$ມີທາງເລືອກສຳຮອງສຳລັບສິ່ງສຳຄັນ$$, 'body', $$ການເພິ່ງພາຜູ້ສະໜອງລາຍດຽວສຳລັບສິ່ງສຳຄັນມີຄວາມສ່ຽງ — ມີທາງເລືອກສຳຮອງຢ່າງໜ້ອຍໜຶ່ງອັນ.$$),
      jsonb_build_object('heading', $$ສ້າງຄວາມສຳພັນ ບໍ່ແມ່ນແຕ່ການຊື້ຂາຍ$$, 'body', $$ການຈ່າຍຕາມກຳນົດ ແລະ ສື່ສານຊັດເຈນ ສ້າງຄວາມສຳພັນທີ່ດີ ເຊິ່ງຊ່ວຍໄດ້ຕອນຂາດແຄນ ຫຼືຕ້ອງການຄວາມຊ່ວຍເຫຼືອ.$$)
    ),
    array[$$Test a supplier with a small trial order before committing$$, $$Keep a backup option for anything essential to your business$$, $$Build a real relationship, not just a transaction, with suppliers$$],
    array[$$ທົດສອບຜູ້ສະໜອງດ້ວຍການສັ່ງນ້ອຍກ່ອນຕົກລົງແທ້$$, $$ມີທາງເລືອກສຳຮອງສຳລັບສິ່ງທີ່ຈຳເປັນຕໍ່ທຸລະກິດ$$, $$ສ້າງຄວາມສຳພັນທີ່ດີກັບຜູ້ສະໜອງ ບໍ່ແມ່ນແຕ່ການຊື້ຂາຍ$$],
    4, false, 33
  ),
  (
    $$handle-competition-without-a-price-war$$,
    $$Handle competition without starting a price war$$,
    $$ຮັບມືການແຂ່ງຂັນໂດຍບໍ່ຕ້ອງເລີ່ມສົງຄາມລາຄາ$$,
    $$Competing on service, quality, or a specific niche is more sustainable than racing to the bottom on price.$$,
    $$ການແຂ່ງດ້ວຍການບໍລິການ, ຄຸນນະພາບ ຫຼືກຸ່ມສະເພາະ ຍືນຍົງກວ່າການແຂ່ງລາຄາລົງເລື້ອຍໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Find what you can offer that they can't$$, 'body', $$Faster delivery, more personal service, or a specific specialty are advantages a bigger, cheaper competitor may not match.$$),
      jsonb_build_object('heading', $$Resist matching every price cut$$, 'body', $$Chasing a competitor's every discount erodes your margins fast — compete on value instead of reacting to every price move.$$),
      jsonb_build_object('heading', $$Focus energy on your loyal customers$$, 'body', $$Serving your existing customers exceptionally well often pays off more than fighting for every price-sensitive shopper.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາສິ່ງທີ່ທ່ານໃຫ້ໄດ້ແຕ່ເຂົາໃຫ້ບໍ່ໄດ້$$, 'body', $$ການສົ່ງໄວກວ່າ, ການບໍລິການເປັນກັນເອງກວ່າ ຫຼືຄວາມຊ່ຽວຊານສະເພາະ ເປັນຂໍ້ໄດ້ປຽບທີ່ຄູ່ແຂ່ງໃຫຍ່ ແລະ ຖືກກວ່າອາດໃຫ້ບໍ່ໄດ້.$$),
      jsonb_build_object('heading', $$ຕ້ານການແຂ່ງລາຄາທຸກຄັ້ງ$$, 'body', $$ການໄລ່ຕາມສ່ວນຫຼຸດຂອງຄູ່ແຂ່ງທຸກຄັ້ງ ກັດກຳໄລໄວ — ແຂ່ງດ້ວຍຄຸນຄ່າ ແທນການຕອບໂຕ້ທຸກການເຄື່ອນໄຫວລາຄາ.$$),
      jsonb_build_object('heading', $$ໃສ່ພະລັງງານໃສ່ລູກຄ້າທີ່ພັກດີ$$, 'body', $$ການບໍລິການລູກຄ້າທີ່ມີຢູ່ແລ້ວໃຫ້ດີເລີດ ມັກໄດ້ຜົນຫຼາຍກວ່າການແຂ່ງແຍ່ງລູກຄ້າທີ່ໃສ່ໃຈລາຄາທຸກຄົນ.$$)
    ),
    array[$$Find what you offer that bigger competitors can't match$$, $$Resist matching every competitor price cut$$, $$Focus energy on serving loyal customers exceptionally well$$],
    array[$$ຫາສິ່ງທີ່ທ່ານໃຫ້ໄດ້ແຕ່ຄູ່ແຂ່ງໃຫຍ່ໃຫ້ບໍ່ໄດ້$$, $$ຕ້ານການແຂ່ງລາຄາທຸກຄັ້ງທີ່ຄູ່ແຂ່ງຫຼຸດ$$, $$ໃສ່ພະລັງງານໃສ່ການບໍລິການລູກຄ້າທີ່ພັກດີໃຫ້ດີເລີດ$$],
    4, false, 34
  ),
  (
    $$build-repeat-customers-through-good-service$$,
    $$Build repeat customers through consistently good service$$,
    $$ສ້າງລູກຄ້າກັບຄືນດ້ວຍການບໍລິການທີ່ດີສະໝ່ຳສະເໝີ$$,
    $$A returning customer costs far less to keep than a new one costs to find.$$,
    $$ລູກຄ້າທີ່ກັບຄືນ ມີຄ່າໃຊ້ຈ່າຍໃນການຮັກສານ້ອຍກວ່າການຫາລູກຄ້າໃໝ່ຫຼາຍ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Make every interaction reliable$$, 'body', $$Consistent quality and timing, even in small things, builds the trust that brings someone back for a second purchase.$$),
      jsonb_build_object('heading', $$Remember details about returning customers$$, 'body', $$A small personal touch — remembering a name or a past order — makes customers feel genuinely valued, not just processed.$$),
      jsonb_build_object('heading', $$Ask for the repeat business directly$$, 'body', $$A simple "come back and see us again" or a small incentive for a next visit reminds customers you'd love to see them again.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ທຸກການພົວພັນໜ້າເຊື່ອຖື$$, 'body', $$ຄຸນນະພາບ ແລະ ເວລາທີ່ສະໝ່ຳສະເໝີ ແມ່ນແຕ່ໃນເລື່ອງນ້ອຍ ສ້າງຄວາມໄວ້ໃຈທີ່ພາລູກຄ້າກັບຄືນມາຊື້ຄັ້ງທີສອງ.$$),
      jsonb_build_object('heading', $$ຈື່ລາຍລະອຽດຂອງລູກຄ້າທີ່ກັບຄືນ$$, 'body', $$ການສຳຜັດສ່ວນຕົວນ້ອຍໆ — ຈື່ຊື່ ຫຼືຄຳສັ່ງທີ່ຜ່ານມາ — ເຮັດໃຫ້ລູກຄ້າຮູ້ສຶກມີຄຸນຄ່າແທ້ ບໍ່ແມ່ນແຕ່ຖືກປະມວນຜົນ.$$),
      jsonb_build_object('heading', $$ຂໍໃຫ້ກັບຄືນມາໂດຍກົງ$$, 'body', $$ຄຳງ່າຍໆ "ກັບມາອີກເນາະ" ຫຼືສິ່ງຈູງໃຈນ້ອຍສຳລັບເທື່ອໜ້າ ເຕືອນລູກຄ້າວ່າຢາກໃຫ້ກັບມາອີກ.$$)
    ),
    array[$$Make every customer interaction consistently reliable$$, $$Remember small details about returning customers$$, $$Directly invite customers to come back again$$],
    array[$$ໃຫ້ທຸກການພົວພັນລູກຄ້າໜ້າເຊື່ອຖືສະໝ່ຳສະເໝີ$$, $$ຈື່ລາຍລະອຽດນ້ອຍໆຂອງລູກຄ້າທີ່ກັບຄືນ$$, $$ຊວນລູກຄ້າກັບຄືນມາອີກໂດຍກົງ$$],
    4, false, 35
  ),
  (
    $$use-word-of-mouth-marketing-effectively$$,
    $$Use word-of-mouth marketing effectively$$,
    $$ໃຊ້ການຕະຫຼາດແບບປາກຕໍ່ປາກຢ່າງມີປະສິດທິພາບ$$,
    $$The best marketing is often an existing customer telling a friend, so give them a real reason to.$$,
    $$ການຕະຫຼາດທີ່ດີທີ່ສຸດມັກເປັນລູກຄ້າເກົ່າບອກຕໍ່ໝູ່ — ໃຫ້ເຫດຜົນຈິງໃຫ້ເຂົາເຮັດແບບນັ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Give people something worth talking about$$, 'body', $$An experience that genuinely exceeds expectations naturally gets mentioned — average service rarely does.$$),
      jsonb_build_object('heading', $$Make referring easy$$, 'body', $$A simple referral discount or a shareable link removes friction from a customer who's already willing to recommend you.$$),
      jsonb_build_object('heading', $$Thank people who refer others$$, 'body', $$Acknowledging a referral, even with a simple thank-you, encourages that customer to keep recommending you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ຄົນມີສິ່ງທີ່ຄຸ້ມຄ່າຈະເລົ່າ$$, 'body', $$ປະສົບການທີ່ເກີນຄາດແທ້ ມັກຖືກເລົ່າຕໍ່ໂດຍທຳມະຊາດ — ການບໍລິການທົ່ວໄປບໍ່ຄ່ອຍຖືກເລົ່າຕໍ່.$$),
      jsonb_build_object('heading', $$ເຮັດໃຫ້ການແນະນຳງ່າຍ$$, 'body', $$ສ່ວນຫຼຸດແນະນຳງ່າຍໆ ຫຼືລິ້ງແບ່ງປັນ ລົບອຸປະສັກອອກຈາກລູກຄ້າທີ່ຍິນດີແນະນຳຢູ່ແລ້ວ.$$),
      jsonb_build_object('heading', $$ຂອບໃຈຄົນທີ່ແນະນຳຄົນອື່ນ$$, 'body', $$ການຮັບຮູ້ການແນະນຳ ແມ່ນແຕ່ດ້ວຍຄຳຂອບໃຈງ່າຍໆ ກະຕຸ້ນໃຫ້ລູກຄ້ານັ້ນສືບຕໍ່ແນະນຳທ່ານ.$$)
    ),
    array[$$Give customers a genuinely exceptional experience worth sharing$$, $$Make referring your business simple and easy$$, $$Thank customers who refer others to encourage more$$],
    array[$$ໃຫ້ປະສົບການທີ່ເກີນຄາດແທ້ ຄຸ້ມຄ່າຈະແບ່ງປັນ$$, $$ເຮັດໃຫ້ການແນະນຳທຸລະກິດຂອງທ່ານງ່າຍ$$, $$ຂອບໃຈລູກຄ້າທີ່ແນະນຳຄົນອື່ນເພື່ອກະຕຸ້ນໃຫ້ຫຼາຍຂຶ້ນ$$],
    4, false, 36
  ),
  (
    $$understand-basic-bookkeeping-for-small-business$$,
    $$Understand basic bookkeeping for a small business$$,
    $$ເຂົ້າໃຈການບັນຊີພື້ນຖານສຳລັບທຸລະກິດນ້ອຍ$$,
    $$Simple, consistent record-keeping prevents surprises and supports every other business decision.$$,
    $$ການບັນທຶກທີ່ງ່າຍ ແລະ ສະໝ່ຳສະເໝີ ປ້ອງກັນຄວາມແປກໃຈ ແລະ ສະໜັບສະໜູນທຸກການຕັດສິນໃຈອື່ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Record every transaction, no matter how small$$, 'body', $$A simple spreadsheet noting every sale and expense, even tiny ones, gives you an accurate picture over time.$$),
      jsonb_build_object('heading', $$Set a fixed time to update records$$, 'body', $$Fifteen minutes every week keeps your books current — waiting months to catch up makes the task overwhelming and error-prone.$$),
      jsonb_build_object('heading', $$Know your basic numbers cold$$, 'body', $$Total revenue, total costs, and profit for the month should be numbers you can state without needing to dig through files.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ບັນທຶກທຸກທຸລະກຳ ບໍ່ວ່ານ້ອຍປານໃດ$$, 'body', $$ສະເປຣດຊີດງ່າຍໆທີ່ບັນທຶກທຸກການຂາຍ ແລະ ຄ່າໃຊ້ຈ່າຍ ແມ່ນແຕ່ອັນນ້ອຍ ໃຫ້ພາບທີ່ຖືກຕ້ອງໄປຕາມເວລາ.$$),
      jsonb_build_object('heading', $$ຕັ້ງເວລາຄົງທີ່ອັບເດດບັນທຶກ$$, 'body', $$15 ນາທີທຸກອາທິດ ຮັກສາບັນຊີໃຫ້ທັນສະໄໝ — ການລໍຫຼາຍເດືອນຄ່ອຍໄລ່ຕາມ ເຮັດໃຫ້ວຽກໜັກ ແລະ ຜິດພາດງ່າຍ.$$),
      jsonb_build_object('heading', $$ຮູ້ຕົວເລກພື້ນຖານໃຫ້ຄ່ອງ$$, 'body', $$ລາຍໄດ້ລວມ, ຄ່າໃຊ້ຈ່າຍລວມ ແລະ ກຳໄລຂອງເດືອນ ຄວນເປັນຕົວເລກທີ່ບອກໄດ້ໂດຍບໍ່ຕ້ອງຄົ້ນຫາເອກະສານ.$$)
    ),
    array[$$Record every transaction, even small ones, consistently$$, $$Set a fixed weekly time to update your books$$, $$Know your monthly revenue, costs, and profit without digging$$],
    array[$$ບັນທຶກທຸກທຸລະກຳຢ່າງສະໝ່ຳສະເໝີ ບໍ່ວ່ານ້ອຍປານໃດ$$, $$ຕັ້ງເວລາຄົງທີ່ປະຈຳອາທິດອັບເດດບັນຊີ$$, $$ຮູ້ລາຍໄດ້, ຄ່າໃຊ້ຈ່າຍ ແລະ ກຳໄລເດືອນໂດຍບໍ່ຕ້ອງຄົ້ນຫາ$$],
    5, false, 37
  ),
  (
    $$decide-when-to-hire-your-first-employee$$,
    $$Decide when it's time to hire your first employee$$,
    $$ຕັດສິນໃຈວ່າຮອດເວລາຈ້າງພະນັກງານຄົນທຳອິດ$$,
    $$Hire when specific, recurring work is consistently more than you can handle, not just when you feel busy.$$,
    $$ຈ້າງເມື່ອວຽກສະເພາະ ແລະ ຊ້ຳໆ ຫຼາຍກວ່າທີ່ຈັດການໄດ້ຢ່າງສະໝ່ຳສະເໝີ ບໍ່ແມ່ນແຕ່ຮູ້ສຶກຫຍຸ້ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Track what's actually falling through the cracks$$, 'body', $$Note specific tasks or opportunities you're missing due to lack of time — this tells you exactly what role to hire for.$$),
      jsonb_build_object('heading', $$Confirm the revenue can support the cost$$, 'body', $$Calculate whether the extra sales or time saved from hiring will realistically cover the salary before committing.$$),
      jsonb_build_object('heading', $$Consider part-time or contract first$$, 'body', $$A part-time or contract hire lets you test whether the extra help truly solves the problem before a bigger commitment.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕິດຕາມສິ່ງທີ່ຫຼຸດຫາຍໄປແທ້$$, 'body', $$ບັນທຶກວຽກ ຫຼືໂອກາດສະເພາະທີ່ພາດໄປຍ້ອນຂາດເວລາ — ບອກໄດ້ຢ່າງແທ້ຈິງວ່າຈະຈ້າງບົດບາດໃດ.$$),
      jsonb_build_object('heading', $$ຢືນຢັນລາຍໄດ້ຮອງຮັບຄ່າໃຊ້ຈ່າຍໄດ້$$, 'body', $$ຄິດໄລ່ວ່າຍອດຂາຍເພີ່ມ ຫຼືເວລາທີ່ປະຢັດໄດ້ຈາກການຈ້າງ ຈະຄຸ້ມຄ່າຈ້າງແທ້ບໍ່ ກ່ອນຕົກລົງ.$$),
      jsonb_build_object('heading', $$ພິຈາລະນາຈ້າງນອກເວລາ ຫຼືສັນຍາຈ້າງກ່ອນ$$, 'body', $$ການຈ້າງນອກເວລາ ຫຼືສັນຍາຈ້າງ ໃຫ້ທົດສອບວ່າຄວາມຊ່ວຍເຫຼືອນັ້ນແກ້ບັນຫາໄດ້ແທ້ບໍ່ ກ່ອນຕົກລົງໃຫຍ່.$$)
    ),
    array[$$Track specific tasks and opportunities you're missing$$, $$Confirm the extra revenue can realistically cover the cost$$, $$Consider a part-time or contract hire to test it first$$],
    array[$$ຕິດຕາມວຽກ ແລະ ໂອກາດສະເພາະທີ່ພາດໄປ$$, $$ຢືນຢັນວ່າລາຍໄດ້ເພີ່ມຄຸ້ມຄ່າຈ້າງແທ້ກ່ອນຕົກລົງ$$, $$ພິຈາລະນາຈ້າງນອກເວລາ ຫຼືສັນຍາຈ້າງເພື່ອທົດສອບກ່ອນ$$],
    5, false, 38
  ),
  (
    $$test-a-price-increase-carefully$$,
    $$Test a price increase carefully$$,
    $$ທົດສອບການຂຶ້ນລາຄາຢ່າງລະມັດລະວັງ$$,
    $$A well-communicated, gradual increase usually loses fewer customers than owners fear.$$,
    $$ການຂຶ້ນລາຄາທີ່ສື່ສານດີ ແລະ ຄ່ອຍເປັນຄ່ອຍໄປ ມັກເສຍລູກຄ້າໜ້ອຍກວ່າທີ່ເຈົ້າຂອງກັງວົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Raise prices gradually, not drastically$$, 'body', $$A small, incremental increase is easier for customers to accept than a sudden large jump that feels unfair.$$),
      jsonb_build_object('heading', $$Communicate the reason honestly$$, 'body', $$A brief, honest note about rising costs or added value helps loyal customers understand and accept the change.$$),
      jsonb_build_object('heading', $$Watch the actual response, not just fear it$$, 'body', $$Track sales and feedback closely after the change — real data tells you more than anxiety about what might happen.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຶ້ນລາຄາເທື່ອລະໜ້ອຍ ບໍ່ແມ່ນຫຼາຍທັນທີ$$, 'body', $$ການເພີ່ມທີລະໜ້ອຍ ລູກຄ້າຍອມຮັບໄດ້ງ່າຍກວ່າການເພີ່ມກະທັນຫັນຫຼາຍທີ່ຮູ້ສຶກບໍ່ຍຸຕິທຳ.$$),
      jsonb_build_object('heading', $$ສື່ສານເຫດຜົນຢ່າງຊື່ສັດ$$, 'body', $$ຄຳອະທິບາຍສັ້ນ ແລະ ຊື່ສັດກ່ຽວກັບຕົ້ນທຶນທີ່ເພີ່ມຂຶ້ນ ຫຼືຄຸນຄ່າທີ່ເພີ່ມ ຊ່ວຍໃຫ້ລູກຄ້າພັກດີເຂົ້າໃຈ ແລະ ຍອມຮັບ.$$),
      jsonb_build_object('heading', $$ຈັບຕາການຕອບຮັບຈິງ ບໍ່ແມ່ນແຕ່ຄວາມກັງວົນ$$, 'body', $$ຕິດຕາມຍອດຂາຍ ແລະ ຄຳຄິດເຫັນຢ່າງໃກ້ຊິດຫຼັງປ່ຽນ — ຂໍ້ມູນຈິງບອກໄດ້ຫຼາຍກວ່າຄວາມກັງວົນວ່າຈະເກີດຫຍັງ.$$)
    ),
    array[$$Raise prices gradually rather than in one large jump$$, $$Communicate the honest reason behind the increase$$, $$Track real sales data after the change, not just anxiety$$],
    array[$$ຂຶ້ນລາຄາເທື່ອລະໜ້ອຍ ແທນການເພີ່ມຫຼາຍທັນທີ$$, $$ສື່ສານເຫດຜົນທີ່ຊື່ສັດເບື້ອງຫຼັງການຂຶ້ນລາຄາ$$, $$ຕິດຕາມຂໍ້ມູນຍອດຂາຍຈິງຫຼັງປ່ຽນ ບໍ່ແມ່ນແຕ່ຄວາມກັງວົນ$$],
    4, false, 39
  ),
  (
    $$build-a-simple-loyalty-program$$,
    $$Build a simple loyalty program that customers actually use$$,
    $$ສ້າງໂຄງການສະສົມແຕ້ມງ່າຍໆທີ່ລູກຄ້າໃຊ້ຈິງ$$,
    $$A simple, clear reward is more effective than a complicated points system nobody understands.$$,
    $$ລາງວັນທີ່ງ່າຍ ແລະ ຊັດເຈນ ໄດ້ຜົນດີກວ່າລະບົບຄະແນນສະລັບຊັບຊ້ອນທີ່ບໍ່ມີໃຜເຂົ້າໃຈ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Keep the rule dead simple$$, 'body', $$"Buy 9, get the 10th free" is instantly understood — complex tiers and point conversions often confuse customers into ignoring the program.$$),
      jsonb_build_object('heading', $$Make progress visible$$, 'body', $$A physical stamp card or a simple digital tracker lets customers see how close they are, which keeps them coming back.$$),
      jsonb_build_object('heading', $$Make sure the reward is genuinely worth it$$, 'body', $$A reward too small to matter won't motivate anyone — calculate the cost carefully so it's meaningful but still profitable for you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ກົດງ່າຍທີ່ສຸດ$$, 'body', $$"ຊື້ 9 ໄດ້ 10 ຟຣີ" ເຂົ້າໃຈໄດ້ທັນທີ — ລະດັບ ແລະ ການແປງຄະແນນທີ່ຊັບຊ້ອນ ມັກເຮັດໃຫ້ລູກຄ້າສັບສົນ ແລະ ເມີນເສີຍ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຄວາມຄືບໜ້າເຫັນໄດ້$$, 'body', $$ບັດປະທັບຕາຈິງ ຫຼືເຄື່ອງຕິດຕາມດິຈິຕອນງ່າຍໆ ໃຫ້ລູກຄ້າເຫັນວ່າໃກ້ຮອດເປົ້າໝາຍປານໃດ ເຊິ່ງກະຕຸ້ນໃຫ້ກັບຄືນມາ.$$),
      jsonb_build_object('heading', $$ໃຫ້ລາງວັນຄຸ້ມຄ່າແທ້$$, 'body', $$ລາງວັນທີ່ນ້ອຍເກີນໄປບໍ່ຈູງໃຈໃຜ — ຄິດໄລ່ຄ່າໃຊ້ຈ່າຍຢ່າງລະມັດລະວັງໃຫ້ມີຄວາມໝາຍແຕ່ຍັງມີກຳໄລສຳລັບທ່ານ.$$)
    ),
    array[$$Keep the loyalty rule simple and instantly understood$$, $$Make customer progress toward the reward visible$$, $$Ensure the reward is genuinely worth it for customers$$],
    array[$$ໃຫ້ກົດການສະສົມແຕ້ມງ່າຍ ແລະ ເຂົ້າໃຈໄດ້ທັນທີ$$, $$ໃຫ້ຄວາມຄືບໜ້າຂອງລູກຄ້າໄປສູ່ລາງວັນເຫັນໄດ້$$, $$ໃຫ້ລາງວັນຄຸ້ມຄ່າແທ້ສຳລັບລູກຄ້າ$$],
    4, false, 40
  ),
  (
    $$handle-a-slow-sales-month$$,
    $$Handle a slow sales month without panicking$$,
    $$ຮັບມືເດືອນທີ່ຂາຍຊ້າໂດຍບໍ່ຕົກໃຈ$$,
    $$A single slow month is normal — respond with a plan, not a drastic overreaction.$$,
    $$ໜຶ່ງເດືອນທີ່ຂາຍຊ້າເປັນເລື່ອງທຳມະດາ — ຕອບໂຕ້ດ້ວຍແຜນ ບໍ່ແມ່ນປະຕິກິລິຍາທີ່ຮຸນແຮງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check if it's a pattern or a one-off$$, 'body', $$Compare against the same month in previous years — some slowness is seasonal and predictable, not a sign of real trouble.$$),
      jsonb_build_object('heading', $$Use the slow time productively$$, 'body', $$A quiet period is a good time to catch up on bookkeeping, reach out to past customers, or improve your process.$$),
      jsonb_build_object('heading', $$Avoid drastic reactions to one bad month$$, 'body', $$Resist making major pricing or business model changes based on a single slow month — wait for a clearer pattern first.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດວ່າເປັນຮູບແບບ ຫຼືເປັນຄັ້ງດຽວ$$, 'body', $$ປຽບທຽບກັບເດືອນດຽວກັນປີກ່ອນ — ຄວາມຊ້າບາງຢ່າງເປັນຕາມລະດູການ ແລະ ຄາດການໄດ້ ບໍ່ແມ່ນສັນຍານບັນຫາຈິງ.$$),
      jsonb_build_object('heading', $$ໃຊ້ຊ່ວງເວລາງຽບໃຫ້ເປັນປະໂຫຍດ$$, 'body', $$ຊ່ວງງຽບເປັນເວລາທີ່ດີໃນການໄລ່ຕາມບັນຊີ, ຕິດຕໍ່ລູກຄ້າເກົ່າ ຫຼືປັບປຸງຂະບວນການ.$$),
      jsonb_build_object('heading', $$ຫຼີກລ້ຽງປະຕິກິລິຍາຮຸນແຮງຕໍ່ໜຶ່ງເດືອນທີ່ບໍ່ດີ$$, 'body', $$ຕ້ານການປ່ຽນລາຄາ ຫຼືຮູບແບບທຸລະກິດໃຫຍ່ ອີງໃສ່ພຽງໜຶ່ງເດືອນທີ່ຊ້າ — ລໍໃຫ້ເຫັນຮູບແບບທີ່ຊັດເຈນກ່ອນ.$$)
    ),
    array[$$Check whether it's a seasonal pattern or a real one-off$$, $$Use quiet periods productively for tasks you've delayed$$, $$Avoid drastic changes based on just one slow month$$],
    array[$$ກວດວ່າເປັນຮູບແບບຕາມລະດູການ ຫຼືເປັນຄັ້ງດຽວແທ້$$, $$ໃຊ້ຊ່ວງງຽບໃຫ້ເປັນປະໂຫຍດກັບວຽກທີ່ຄ້າງໄວ້$$, $$ຫຼີກລ້ຽງການປ່ຽນແປງໃຫຍ່ອີງໃສ່ພຽງໜຶ່ງເດືອນທີ່ຊ້າ$$],
    4, false, 41
  ),
  (
    $$separate-personal-and-business-finances$$,
    $$Separate your personal and business finances early$$,
    $$ແຍກການເງິນສ່ວນຕົວ ແລະ ທຸລະກິດແຕ່ໄວ$$,
    $$Mixed finances make it nearly impossible to know if your business is actually profitable.$$,
    $$ການເງິນທີ່ປົນກັນ ເຮັດໃຫ້ຮູ້ບໍ່ໄດ້ວ່າທຸລະກິດມີກຳໄລແທ້ບໍ່.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Open a separate account, even a simple one$$, 'body', $$A dedicated account for business income and expenses, even without formal registration, makes tracking dramatically clearer.$$),
      jsonb_build_object('heading', $$Pay yourself a set amount, not whatever's left$$, 'body', $$Decide a regular personal draw rather than taking money whenever needed — this keeps the business's cash position clear.$$),
      jsonb_build_object('heading', $$Never use business funds for personal emergencies casually$$, 'body', $$If you must borrow from the business for a personal need, track it as a real loan you plan to repay, not free money.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເປີດບັນຊີແຍກ ແມ່ນແຕ່ແບບງ່າຍ$$, 'body', $$ບັນຊີສະເພາະສຳລັບລາຍໄດ້ ແລະ ຄ່າໃຊ້ຈ່າຍທຸລະກິດ ເຖິງແມ່ນບໍ່ໄດ້ຈົດທະບຽນທາງການ ເຮັດໃຫ້ຕິດຕາມໄດ້ຊັດເຈນຂຶ້ນຫຼາຍ.$$),
      jsonb_build_object('heading', $$ຈ່າຍຕົນເອງຈຳນວນທີ່ກຳນົດ ບໍ່ແມ່ນສ່ວນທີ່ເຫຼືອ$$, 'body', $$ຕັດສິນໃຈຈຳນວນຖອນເປັນປົກກະຕິ ແທນການເອົາເງິນເມື່ອຕ້ອງການ — ຮັກສາສະຖານະເງິນສົດຂອງທຸລະກິດໃຫ້ຊັດເຈນ.$$),
      jsonb_build_object('heading', $$ຢ່າໃຊ້ເງິນທຸລະກິດສຳລັບເລື່ອງສ່ວນຕົວແບບບໍ່ຄິດ$$, 'body', $$ຖ້າຕ້ອງຢືມຈາກທຸລະກິດສຳລັບຄວາມຕ້ອງການສ່ວນຕົວ ໃຫ້ບັນທຶກເປັນເງິນກູ້ຈິງທີ່ວາງແຜນໃຊ້ຄືນ ບໍ່ແມ່ນເງິນຟຣີ.$$)
    ),
    array[$$Open a separate account for business, even without formal registration$$, $$Pay yourself a set regular amount, not whatever's left over$$, $$Track any personal use of business funds as a real loan$$],
    array[$$ເປີດບັນຊີແຍກສຳລັບທຸລະກິດ ເຖິງແມ່ນບໍ່ໄດ້ຈົດທະບຽນທາງການ$$, $$ຈ່າຍຕົນເອງຈຳນວນປົກກະຕິທີ່ກຳນົດ ບໍ່ແມ່ນສ່ວນທີ່ເຫຼືອ$$, $$ບັນທຶກການໃຊ້ເງິນທຸລະກິດເພື່ອສ່ວນຕົວເປັນເງິນກູ້ຈິງ$$],
    4, false, 42
  ),
  (
    $$build-a-side-business-while-keeping-a-day-job$$,
    $$Build a side business while keeping your day job$$,
    $$ສ້າງທຸລະກິດເສີມໄປພ້ອມກັບຮັກສາວຽກປະຈຳ$$,
    $$A day job's steady income lets you take real time to validate a side business before going all in.$$,
    $$ລາຍໄດ້ຄົງທີ່ຈາກວຽກປະຈຳ ໃຫ້ເວລາພິສູດທຸລະກິດເສີມກ່ອນລົງເຕັມຕົວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Protect specific, dedicated time$$, 'body', $$A few consistent hours a week — early mornings or weekends — moves a side business forward more reliably than "whenever I have time."$$),
      jsonb_build_object('heading', $$Respect your employer's rules and time$$, 'body', $$Check your employment contract for conflict-of-interest clauses, and never work on the side business during paid work hours.$$),
      jsonb_build_object('heading', $$Set a clear signal for when to go full-time$$, 'body', $$Decide in advance what income level or workload would justify leaving the day job, rather than deciding emotionally in the moment.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປົກປ້ອງເວລາສະເພາະ ແລະ ອຸທິດ$$, 'body', $$ຊົ່ວໂມງທີ່ຄົງທີ່ຈຳນວນໜ້ອຍຕໍ່ອາທິດ — ເຊົ້າໆ ຫຼືທ້າຍອາທິດ — ພາທຸລະກິດເສີມກ້າວໜ້າໄດ້ໜ້າເຊື່ອຖືກວ່າ "ເມື່ອມີເວລາ."$$),
      jsonb_build_object('heading', $$ເຄົາລົບກົດ ແລະ ເວລາຂອງນາຍຈ້າງ$$, 'body', $$ກວດສັນຍາຈ້າງງານຫາຂໍ້ຄວາມຂັດແຍ່ງຜົນປະໂຫຍດ ແລະ ຢ່າເຮັດທຸລະກິດເສີມໃນຊົ່ວໂມງເຮັດວຽກທີ່ໄດ້ຮັບຄ່າຈ້າງ.$$),
      jsonb_build_object('heading', $$ຕັ້ງສັນຍານຊັດເຈນວ່າເມື່ອໃດຈະລົງເຕັມຕົວ$$, 'body', $$ຕັດສິນລ່ວງໜ້າວ່າລາຍໄດ້ ຫຼືວຽກລະດັບໃດຈະສົມເຫດສົມຜົນທີ່ຈະອອກຈາກວຽກປະຈຳ ແທນການຕັດສິນຕາມອາລົມຕອນນັ້ນ.$$)
    ),
    array[$$Protect a few specific, dedicated hours each week$$, $$Respect your employer's rules and never use paid work time$$, $$Decide in advance the clear signal for going full-time$$],
    array[$$ປົກປ້ອງຊົ່ວໂມງສະເພາະຈຳນວນໜ້ອຍທຸກອາທິດ$$, $$ເຄົາລົບກົດຂອງນາຍຈ້າງ ແລະ ບໍ່ໃຊ້ເວລາເຮັດວຽກທີ່ໄດ້ຄ່າຈ້າງ$$, $$ຕັດສິນລ່ວງໜ້າສັນຍານຊັດເຈນວ່າເມື່ອໃດຈະລົງເຕັມຕົວ$$],
    4, false, 43
  ),
  (
    $$understand-basic-contracts-before-signing$$,
    $$Understand basic contracts before signing anything$$,
    $$ເຂົ້າໃຈສັນຍາພື້ນຖານກ່ອນເຊັນຫຍັງກໍ່ຕາມ$$,
    $$Reading every term carefully protects you far more than trusting a friendly conversation alone.$$,
    $$ການອ່ານທຸກເງື່ອນໄຂຢ່າງລະອຽດ ປົກປ້ອງທ່ານໄດ້ຫຼາຍກວ່າການເຊື່ອຄຳລົມທີ່ເປັນມິດຢ່າງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Read every clause, not just the summary$$, 'body', $$Payment terms, cancellation conditions, and liability clauses matter — don't sign based only on a verbal summary of the deal.$$),
      jsonb_build_object('heading', $$Get important agreements in writing$$, 'body', $$A verbal handshake deal is hard to enforce if something goes wrong — even a simple written summary protects both sides.$$),
      jsonb_build_object('heading', $$Ask for clarification before signing$$, 'body', $$It's completely normal to ask what a confusing clause means, or to request a term be adjusted before you agree.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ອ່ານທຸກຂໍ້ ບໍ່ແມ່ນແຕ່ຄຳສະຫຼຸບ$$, 'body', $$ເງື່ອນໄຂການຈ່າຍ, ການຍົກເລີກ ແລະ ຄວາມຮັບຜິດຊອບສຳຄັນ — ຢ່າເຊັນອີງໃສ່ພຽງຄຳສະຫຼຸບປາກເປົ່າຂອງຂໍ້ຕົກລົງ.$$),
      jsonb_build_object('heading', $$ໃຫ້ຂໍ້ຕົກລົງສຳຄັນເປັນລາຍລັກອັກສອນ$$, 'body', $$ຂໍ້ຕົກລົງດ້ວຍປາກເປົ່າຢືນຢັນຍາກ ຖ້າມີບັນຫາ — ແມ່ນແຕ່ສະຫຼຸບຂຽນງ່າຍໆ ປົກປ້ອງທັງສອງຝ່າຍ.$$),
      jsonb_build_object('heading', $$ຂໍຄວາມຊັດເຈນກ່ອນເຊັນ$$, 'body', $$ເປັນເລື່ອງທຳມະດາທີ່ຈະຖາມວ່າຂໍ້ທີ່ບໍ່ຊັດເຈນໝາຍຄວາມວ່າຫຍັງ ຫຼືຂໍປັບເງື່ອນໄຂກ່ອນຕົກລົງ.$$)
    ),
    array[$$Read every clause carefully, not just a verbal summary$$, $$Get important agreements in writing, even a simple summary$$, $$Ask for clarification on anything confusing before signing$$],
    array[$$ອ່ານທຸກຂໍ້ຢ່າງລະອຽດ ບໍ່ແມ່ນແຕ່ຄຳສະຫຼຸບປາກເປົ່າ$$, $$ໃຫ້ຂໍ້ຕົກລົງສຳຄັນເປັນລາຍລັກອັກສອນ ແມ່ນແຕ່ສະຫຼຸບງ່າຍ$$, $$ຂໍຄວາມຊັດເຈນຕໍ່ສິ່ງທີ່ບໍ່ຊັດເຈນກ່ອນເຊັນ$$],
    5, false, 44
  ),
  (
    $$find-a-business-partner-or-decide-not-to$$,
    $$Find a business partner, or decide you don't need one$$,
    $$ຫາຄູ່ຮ່ວມທຸລະກິດ ຫຼືຕັດສິນໃຈວ່າບໍ່ຈຳເປັນ$$,
    $$A good partnership fills real gaps in skills or resources — not just loneliness in starting alone.$$,
    $$ຄູ່ຮ່ວມທຸລະກິດທີ່ດີ ອຸດຊ່ອງຫວ່າງທັກສະ ຫຼືຊັບພະຍາກອນຈິງ — ບໍ່ແມ່ນແຕ່ຄວາມຮູ້ສຶກເລີ່ມຄົນດຽວແລ້ວໂດດດ່ຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Look for complementary skills, not a copy of yourself$$, 'body', $$A partner who's strong where you're weak — sales versus operations, for example — adds more real value than someone identical to you.$$),
      jsonb_build_object('heading', $$Agree on roles and equity in writing early$$, 'body', $$Discuss ownership split, decision-making, and what happens if someone wants to leave — before problems arise, not after.$$),
      jsonb_build_object('heading', $$It's fine to stay solo$$, 'body', $$Many successful small businesses are run by one person — a partner should solve a real problem, not just feel like the expected path.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາທັກສະທີ່ເສີມກັນ ບໍ່ແມ່ນຄົນຄ້າຍທ່ານ$$, 'body', $$ຄູ່ຮ່ວມທີ່ເກັ່ງໃນສິ່ງທີ່ທ່ານອ່ອນ — ຂາຍທຽບກັບການດຳເນີນງານ — ເພີ່ມຄຸນຄ່າຫຼາຍກວ່າຄົນທີ່ຄ້າຍທ່ານທຸກຢ່າງ.$$),
      jsonb_build_object('heading', $$ຕົກລົງບົດບາດ ແລະ ຫຸ້ນເປັນລາຍລັກອັກສອນແຕ່ໄວ$$, 'body', $$ລົມເລື່ອງການແບ່ງຄວາມເປັນເຈົ້າຂອງ, ການຕັດສິນໃຈ ແລະ ຈະເປັນແນວໃດຖ້າມີຄົນຢາກອອກ — ກ່ອນມີບັນຫາ ບໍ່ແມ່ນຫຼັງ.$$),
      jsonb_build_object('heading', $$ຢູ່ຄົນດຽວກໍ່ໂອເຄ$$, 'body', $$ທຸລະກິດນ້ອຍທີ່ສຳເລັດຫຼາຍອັນຄົນດຽວດຳເນີນ — ຄູ່ຮ່ວມຄວນແກ້ບັນຫາຈິງ ບໍ່ແມ່ນແຕ່ຮູ້ສຶກຄືເສັ້ນທາງທີ່ຄາດຫວັງ.$$)
    ),
    array[$$Look for a partner with complementary skills, not a copy of you$$, $$Agree on roles and equity in writing before problems arise$$, $$It's completely fine to stay solo if that works better$$],
    array[$$ຫາຄູ່ຮ່ວມທີ່ມີທັກສະເສີມກັນ ບໍ່ແມ່ນຄົນຄ້າຍທ່ານ$$, $$ຕົກລົງບົດບາດ ແລະ ຫຸ້ນເປັນລາຍລັກອັກສອນກ່ອນມີບັນຫາ$$, $$ຢູ່ຄົນດຽວກໍ່ໂອເຄ ຖ້າມັນເໝາະສົມກວ່າ$$],
    5, false, 45
  ),
  (
    $$learn-from-a-failed-product-or-feature$$,
    $$Learn from a failed product or feature$$,
    $$ຮຽນຮູ້ຈາກຜະລິດຕະພັນ ຫຼືຄຸນສົມບັດທີ່ບໍ່ສຳເລັດ$$,
    $$A specific reason for failure teaches far more than a vague sense that "it didn't work."$$,
    $$ເຫດຜົນສະເພາະຂອງຄວາມລົ້ມເຫຼວ ສອນໄດ້ຫຼາຍກວ່າຄວາມຮູ້ສຶກທົ່ວໄປວ່າ "ມັນບໍ່ໄດ້ຜົນ."$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Diagnose the specific reason$$, 'body', $$Was it the price, the marketing, the timing, or the product itself? A vague sense of failure teaches nothing — specificity does.$$),
      jsonb_build_object('heading', $$Separate the idea from the execution$$, 'body', $$Sometimes a good idea simply had poor timing or pricing, not a flawed core concept — this distinction guides whether to retry or drop it.$$),
      jsonb_build_object('heading', $$Cut losses without excessive regret$$, 'body', $$Stop investing more time or money in something that clearly isn't working — a quick, clear-eyed exit preserves resources for the next attempt.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ວິນິດໄສເຫດຜົນສະເພາະ$$, 'body', $$ແມ່ນລາຄາ, ການຕະຫຼາດ, ຈັງຫວະເວລາ ຫຼືຕົວຜະລິດຕະພັນເອງ? ຄວາມຮູ້ສຶກລົ້ມເຫຼວທົ່ວໄປບໍ່ໄດ້ສອນຫຍັງ — ຄວາມສະເພາະສອນໄດ້.$$),
      jsonb_build_object('heading', $$ແຍກແນວຄິດອອກຈາກການປະຕິບັດ$$, 'body', $$ບາງຄັ້ງແນວຄິດດີແຕ່ຈັງຫວະ ຫຼືລາຄາບໍ່ຖືກ ບໍ່ແມ່ນແນວຄິດຫຼັກຜິດພາດ — ຄວາມແຕກຕ່າງນີ້ນຳທາງວ່າຈະລອງໃໝ່ ຫຼືປະຖິ້ມ.$$),
      jsonb_build_object('heading', $$ຢຸດການເສຍໂດຍບໍ່ເສຍໃຈເກີນໄປ$$, 'body', $$ຢຸດລົງທຶນເວລາ ຫຼືເງິນເພີ່ມກັບສິ່ງທີ່ຊັດເຈນວ່າບໍ່ໄດ້ຜົນ — ການອອກໄວ ແລະ ຊັດເຈນ ຮັກສາຊັບພະຍາກອນໄວ້ສຳລັບຄັ້ງຕໍ່ໄປ.$$)
    ),
    array[$$Diagnose the specific reason something failed$$, $$Separate whether the core idea or just the execution was flawed$$, $$Cut losses quickly without excessive regret$$],
    array[$$ວິນິດໄສເຫດຜົນສະເພາະທີ່ເຮັດໃຫ້ບໍ່ສຳເລັດ$$, $$ແຍກວ່າແນວຄິດຫຼັກ ຫຼືການປະຕິບັດເທົ່ານັ້ນທີ່ຜິດພາດ$$, $$ຢຸດການເສຍໄວໂດຍບໍ່ເສຍໃຈເກີນໄປ$$],
    4, false, 46
  ),
  (
    $$turn-a-hobby-into-a-small-income-stream$$,
    $$Turn a hobby into a small income stream$$,
    $$ປ່ຽນງານອະດິເລກໃຫ້ເປັນແຫຼ່ງລາຍໄດ້ນ້ອຍ$$,
    $$Start small and test demand before turning something you love into a source of pressure.$$,
    $$ເລີ່ມນ້ອຍ ແລະ ທົດສອບຄວາມຕ້ອງການ ກ່ອນປ່ຽນສິ່ງທີ່ຮັກໃຫ້ກາຍເປັນຄວາມກົດດັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Sell to your existing circle first$$, 'body', $$Offer your hobby-made items to friends and their networks before investing in a bigger setup — this tests real demand cheaply.$$),
      jsonb_build_object('heading', $$Keep pricing fair to your time$$, 'body', $$Hobbyists often underprice out of modesty — calculate your time honestly so the side income doesn't become unpaid labor.$$),
      jsonb_build_object('heading', $$Protect the joy that started it$$, 'body', $$Watch for the moment a hobby starts feeling like pure obligation — it's fine to keep it small on purpose to protect why you loved it.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂາຍໃຫ້ວົງໝູ່ທີ່ມີຢູ່ແລ້ວກ່ອນ$$, 'body', $$ສະເໜີສິ່ງທີ່ເຮັດຈາກງານອະດິເລກໃຫ້ໝູ່ ແລະ ເຄືອຂ່າຍຂອງເຂົາກ່ອນລົງທຶນໃນການຕັ້ງທ່າໃຫຍ່ — ທົດສອບຄວາມຕ້ອງການຈິງແບບປະຢັດ.$$),
      jsonb_build_object('heading', $$ຕັ້ງລາຄາໃຫ້ຍຸດຕິທຳຕໍ່ເວລາຂອງທ່ານ$$, 'body', $$ຄົນເຮັດງານອະດິເລກມັກຕັ້ງລາຄາຕ່ຳເກີນໄປຍ້ອນຄວາມຖ່ອມຕົນ — ຄິດໄລ່ເວລາຢ່າງຊື່ສັດ ເພື່ອບໍ່ໃຫ້ລາຍໄດ້ເສີມກາຍເປັນແຮງງານບໍ່ໄດ້ຄ່າ.$$),
      jsonb_build_object('heading', $$ປົກປ້ອງຄວາມສຸກທີ່ເລີ່ມມາ$$, 'body', $$ສັງເກດຈຸດທີ່ງານອະດິເລກເລີ່ມຮູ້ສຶກເປັນພັນທະລ້ວນໆ — ຮັກສາໃຫ້ນ້ອຍໂດຍຕັ້ງໃຈກໍ່ໄດ້ ເພື່ອປົກປ້ອງເຫດຜົນທີ່ຮັກມັນ.$$)
    ),
    array[$$Sell to your existing circle first to test real demand$$, $$Price fairly for your time, not out of modesty$$, $$Watch for when it stops feeling joyful and protect that$$],
    array[$$ຂາຍໃຫ້ວົງໝູ່ທີ່ມີຢູ່ແລ້ວກ່ອນເພື່ອທົດສອບຄວາມຕ້ອງການ$$, $$ຕັ້ງລາຄາຢ່າງຍຸດຕິທຳຕໍ່ເວລາ ບໍ່ແມ່ນຍ້ອນຄວາມຖ່ອມຕົນ$$, $$ສັງເກດຈຸດທີ່ບໍ່ມ່ວນອີກຕໍ່ໄປ ແລະ ປົກປ້ອງມັນ$$],
    4, false, 47
  ),
  (
    $$handle-seasonal-demand-changes$$,
    $$Handle seasonal demand changes in your business$$,
    $$ຮັບມືການປ່ຽນແປງຄວາມຕ້ອງການຕາມລະດູການ$$,
    $$Plan for predictable ups and downs in advance instead of reacting to them each time.$$,
    $$ວາງແຜນລ່ວງໜ້າສຳລັບຂຶ້ນລົງທີ່ຄາດການໄດ້ ແທນທີ່ຈະຕອບໂຕ້ທຸກຄັ້ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Map your own seasonal pattern$$, 'body', $$Look at past sales data or observe closely if you're new — most businesses have a predictable slow and busy season.$$),
      jsonb_build_object('heading', $$Save during busy season for the slow one$$, 'body', $$Set aside extra profit during peak months specifically to cover the predictable slower period, rather than spending it all.$$),
      jsonb_build_object('heading', $$Plan a slow-season offer$$, 'body', $$A special promotion or complementary product during your slow season can help smooth out revenue across the year.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮ່າງແຜນທີ່ຮູບແບບລະດູການຂອງທ່ານເອງ$$, 'body', $$ເບິ່ງຂໍ້ມູນຍອດຂາຍທີ່ຜ່ານມາ ຫຼືສັງເກດຢ່າງໃກ້ຊິດຖ້າຫາກໃໝ່ — ທຸລະກິດສ່ວນຫຼາຍມີລະດູຊ້າ ແລະ ຫຍຸ້ງທີ່ຄາດການໄດ້.$$),
      jsonb_build_object('heading', $$ອອມໄວ້ໃນລະດູຫຍຸ້ງເພື່ອລະດູຊ້າ$$, 'body', $$ເກັບກຳໄລພິເສດໄວ້ໃນເດືອນທີ່ຫຍຸ້ງ ເພື່ອຮອງຮັບຊ່ວງຊ້າທີ່ຄາດການໄດ້ ແທນທີ່ຈະໃຊ້ໝົດ.$$),
      jsonb_build_object('heading', $$ວາງແຜນຂໍ້ສະເໜີສຳລັບລະດູຊ້າ$$, 'body', $$ໂປຣໂມຊັນພິເສດ ຫຼືຜະລິດຕະພັນເສີມໃນລະດູຊ້າ ຊ່ວຍໃຫ້ລາຍໄດ້ສະໝ່ຳສະເໝີຂຶ້ນຕະຫຼອດປີ.$$)
    ),
    array[$$Map out your business's predictable seasonal pattern$$, $$Save extra profit during busy months for the slow season$$, $$Plan a specific offer to smooth out slow-season revenue$$],
    array[$$ຮ່າງແຜນທີ່ຮູບແບບລະດູການທີ່ຄາດການໄດ້ຂອງທຸລະກິດ$$, $$ອອມກຳໄລພິເສດໃນເດືອນຫຍຸ້ງໄວ້ສຳລັບລະດູຊ້າ$$, $$ວາງແຜນຂໍ້ສະເໜີສະເພາະເພື່ອໃຫ້ລາຍໄດ້ສະໝ່ຳສະເໝີ$$],
    4, false, 48
  ),
  (
    $$negotiate-with-suppliers-for-better-terms$$,
    $$Negotiate with suppliers for better terms$$,
    $$ຕໍ່ລອງກັບຜູ້ສະໜອງເພື່ອເງື່ອນໄຂທີ່ດີກວ່າ$$,
    $$Most suppliers expect negotiation, especially once you've built a track record with them.$$,
    $$ຜູ້ສະໜອງສ່ວນຫຼາຍຄາດຫວັງການຕໍ່ລອງ ໂດຍສະເພາະເມື່ອສ້າງປະຫວັດຮ່ວມກັນແລ້ວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Build a track record first$$, 'body', $$A history of reliable, on-time payments gives you real leverage to ask for better pricing or terms later.$$),
      jsonb_build_object('heading', $$Ask about volume discounts$$, 'body', $$Even a modest, growing order size may qualify for a better rate — a simple question can reveal pricing tiers you didn't know existed.$$),
      jsonb_build_object('heading', $$Negotiate payment timing too$$, 'body', $$Longer payment terms can help your cash flow just as much as a lower price — it's worth asking about both.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ສ້າງປະຫວັດກ່ອນ$$, 'body', $$ປະຫວັດການຈ່າຍທີ່ໜ້າເຊື່ອຖື ແລະ ຕາມກຳນົດ ໃຫ້ອຳນາຈຕໍ່ລອງຈິງເພື່ອຂໍລາຄາ ຫຼືເງື່ອນໄຂທີ່ດີກວ່າພາຍຫຼັງ.$$),
      jsonb_build_object('heading', $$ຖາມກ່ຽວກັບສ່ວນຫຼຸດຕາມປະລິມານ$$, 'body', $$ແມ່ນແຕ່ຂະໜາດການສັ່ງທີ່ພໍປານກາງ ແລະ ເພີ່ມຂຶ້ນ ອາດມີສິດຮັບອັດຕາທີ່ດີກວ່າ — ຄຳຖາມງ່າຍໆອາດເປີດເຜີຍລະດັບລາຄາທີ່ບໍ່ຮູ້ມາກ່ອນ.$$),
      jsonb_build_object('heading', $$ຕໍ່ລອງເລື່ອງເວລາຈ່າຍເໝືອນກັນ$$, 'body', $$ເງື່ອນໄຂການຈ່າຍທີ່ຍາວຂຶ້ນ ຊ່ວຍກະແສເງິນສົດໄດ້ພໍໆກັບລາຄາທີ່ຕ່ຳກວ່າ — ຄວນຖາມທັງສອງຢ່າງ.$$)
    ),
    array[$$Build a reliable payment track record before negotiating$$, $$Ask directly about volume discounts as your orders grow$$, $$Negotiate payment timing, not just the price itself$$],
    array[$$ສ້າງປະຫວັດການຈ່າຍທີ່ໜ້າເຊື່ອຖືກ່ອນຕໍ່ລອງ$$, $$ຖາມໂດຍກົງກ່ຽວກັບສ່ວນຫຼຸດຕາມປະລິມານທີ່ເພີ່ມຂຶ້ນ$$, $$ຕໍ່ລອງເລື່ອງເວລາຈ່າຍ ບໍ່ແມ່ນແຕ່ລາຄາຢ່າງດຽວ$$],
    4, false, 49
  ),
  (
    $$understand-business-license-and-permit-basics$$,
    $$Understand the basics of business licenses and permits$$,
    $$ເຂົ້າໃຈພື້ນຖານໃບອະນຸຍາດ ແລະ ໃບຢັ້ງຢືນທຸລະກິດ$$,
    $$Requirements vary by location and business type — check with the official local authority directly.$$,
    $$ຄວາມຕ້ອງການແຕກຕ່າງກັນຕາມສະຖານທີ່ ແລະ ປະເພດທຸລະກິດ — ກວດກັບໜ່ວຍງານທ້ອງຖິ່ນທາງການໂດຍກົງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Check requirements before you launch$$, 'body', $$Different business types — food, retail, services — often have different registration and permit rules; confirm yours early.$$),
      jsonb_build_object('heading', $$Ask the official local office directly$$, 'body', $$Rather than relying on secondhand information, visit or call your local business registration office for accurate, current requirements.$$),
      jsonb_build_object('heading', $$Keep documents current and accessible$$, 'body', $$Store your registration and permits somewhere easy to find — you may need to show them at unexpected moments.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ກວດຄວາມຕ້ອງການກ່ອນເປີດຕົວ$$, 'body', $$ປະເພດທຸລະກິດຕ່າງກັນ — ອາຫານ, ຂາຍຍ່ອຍ, ບໍລິການ — ມັກມີກົດການຈົດທະບຽນ ແລະ ໃບອະນຸຍາດຕ່າງກັນ; ຢືນຢັນຂອງທ່ານແຕ່ໄວ.$$),
      jsonb_build_object('heading', $$ຖາມໜ່ວຍງານທ້ອງຖິ່ນທາງການໂດຍກົງ$$, 'body', $$ແທນທີ່ຈະອີງໃສ່ຂໍ້ມູນທີສອງມື ໄປ ຫຼືໂທຫາຫ້ອງການຈົດທະບຽນທຸລະກິດທ້ອງຖິ່ນເພື່ອຮູ້ຄວາມຕ້ອງການທີ່ຖືກຕ້ອງ ແລະ ທັນສະໄໝ.$$),
      jsonb_build_object('heading', $$ຮັກສາເອກະສານໃຫ້ທັນສະໄໝ ແລະ ຫາງ່າຍ$$, 'body', $$ເກັບໃບຈົດທະບຽນ ແລະ ໃບອະນຸຍາດໄວ້ບ່ອນທີ່ຫາງ່າຍ — ອາດຕ້ອງສະແດງໃນຊ່ວງເວລາທີ່ບໍ່ຄາດຄິດ.$$)
    ),
    array[$$Check the specific requirements for your business type early$$, $$Ask the official local office directly for accurate rules$$, $$Keep registration and permit documents current and accessible$$],
    array[$$ກວດຄວາມຕ້ອງການສະເພາະຂອງປະເພດທຸລະກິດແຕ່ໄວ$$, $$ຖາມໜ່ວຍງານທ້ອງຖິ່ນທາງການໂດຍກົງເພື່ອກົດທີ່ຖືກຕ້ອງ$$, $$ຮັກສາເອກະສານຈົດທະບຽນ ແລະ ໃບອະນຸຍາດໃຫ້ທັນສະໄໝ ແລະ ຫາງ່າຍ$$],
    4, false, 50
  ),
  (
    $$create-simple-effective-packaging$$,
    $$Create simple, effective packaging on a budget$$,
    $$ສ້າງບັນຈຸພັນທີ່ງ່າຍ ແລະ ໄດ້ຜົນດ້ວຍງົບຈຳກັດ$$,
    $$Packaging that protects the product and looks intentional builds trust before a customer even uses it.$$,
    $$ບັນຈຸພັນທີ່ປົກປ້ອງຜະລິດຕະພັນ ແລະ ເບິ່ງຕັ້ງໃຈ ສ້າງຄວາມໄວ້ໃຈກ່ອນລູກຄ້າຈະໃຊ້ຊ້ຳ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Protect the product first$$, 'body', $$A damaged item on arrival destroys trust instantly, regardless of how good the product itself is — function comes before style.$$),
      jsonb_build_object('heading', $$Keep the design simple and consistent$$, 'body', $$A clean, consistent look across all packaging reinforces your brand more than an expensive one-off design.$$),
      jsonb_build_object('heading', $$Add a small personal touch$$, 'body', $$A handwritten thank-you note or a small sticker costs little but makes the unboxing experience feel genuinely cared for.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປົກປ້ອງຜະລິດຕະພັນກ່ອນ$$, 'body', $$ເຄື່ອງທີ່ເສຍຫາຍຕອນຮອດ ທຳລາຍຄວາມໄວ້ໃຈທັນທີ ບໍ່ວ່າຜະລິດຕະພັນຈະດີພຽງໃດ — ໜ້າທີ່ໃຊ້ງານມາກ່ອນຄວາມສວຍງາມ.$$),
      jsonb_build_object('heading', $$ໃຫ້ການອອກແບບງ່າຍ ແລະ ສະໝ່ຳສະເໝີ$$, 'body', $$ຮູບແບບທີ່ສະອາດ ແລະ ສະໝ່ຳສະເໝີໃນທຸກບັນຈຸພັນ ເສີມສ້າງແບຣນຫຼາຍກວ່າການອອກແບບຄັ້ງດຽວທີ່ລາຄາແພງ.$$),
      jsonb_build_object('heading', $$ເພີ່ມການສຳຜັດສ່ວນຕົວນ້ອຍໆ$$, 'body', $$ຄຳຂອບໃຈຂຽນມືອ ຫຼືສະຕິກເກີນ້ອຍ ໃຊ້ຈ່າຍໜ້ອຍ ແຕ່ເຮັດໃຫ້ປະສົບການເປີດແພັກຮູ້ສຶກໄດ້ຮັບການໃສ່ໃຈແທ້.$$)
    ),
    array[$$Prioritize protecting the product over fancy design$$, $$Keep packaging design simple and consistent across orders$$, $$Add a small personal touch like a handwritten note$$],
    array[$$ໃຫ້ຄວາມສຳຄັນກັບການປົກປ້ອງຜະລິດຕະພັນກ່ອນຄວາມສວຍງາມ$$, $$ໃຫ້ການອອກແບບບັນຈຸພັນງ່າຍ ແລະ ສະໝ່ຳສະເໝີ$$, $$ເພີ່ມການສຳຜັດສ່ວນຕົວນ້ອຍໆ ເຊັ່ນ ຄຳຂອບໃຈຂຽນມືອ$$],
    3, false, 51
  ),
  (
    $$build-a-customer-contact-list$$,
    $$Build an email or messaging list of customers$$,
    $$ສ້າງລາຍຊື່ອີເມວ ຫຼືຂໍ້ຄວາມຂອງລູກຄ້າ$$,
    $$A direct contact list is an asset you own, unlike a social media following that can change with the platform.$$,
    $$ລາຍຊື່ຕິດຕໍ່ໂດຍກົງ ເປັນຊັບສິນທີ່ທ່ານເປັນເຈົ້າຂອງ ຕ່າງຈາກຜູ້ຕິດຕາມໂຊຊຽວມີເດຍທີ່ປ່ຽນໄປຕາມແພລດຟອມ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Collect contacts naturally at every sale$$, 'body', $$Ask for a phone number or email at checkout in a low-pressure way — most happy customers are glad to stay in touch.$$),
      jsonb_build_object('heading', $$Send only genuinely useful messages$$, 'body', $$Share real updates, useful tips, or honest promotions — not constant noise that makes people want to unsubscribe.$$),
      jsonb_build_object('heading', $$Respect privacy and give an easy opt-out$$, 'body', $$Never share contact information with others, and always make it simple for someone to stop hearing from you if they choose.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເກັບຂໍ້ມູນຕິດຕໍ່ຢ່າງທຳມະຊາດທຸກການຂາຍ$$, 'body', $$ຂໍເບີໂທ ຫຼືອີເມວຕອນຈ່າຍເງິນແບບບໍ່ກົດດັນ — ລູກຄ້າທີ່ພໍໃຈສ່ວນຫຼາຍຍິນດີຮັກສາການຕິດຕໍ່.$$),
      jsonb_build_object('heading', $$ສົ່ງແຕ່ຂໍ້ຄວາມທີ່ເປັນປະໂຫຍດແທ້$$, 'body', $$ແບ່ງປັນອັບເດດຈິງ, ຄຳແນະນຳທີ່ເປັນປະໂຫຍດ ຫຼືໂປຣໂມຊັນທີ່ຊື່ສັດ — ບໍ່ແມ່ນສຽງລົບກວນຕະຫຼອດທີ່ເຮັດໃຫ້ຄົນຢາກຍົກເລີກ.$$),
      jsonb_build_object('heading', $$ເຄົາລົບຄວາມເປັນສ່ວນຕົວ ແລະ ໃຫ້ຍົກເລີກງ່າຍ$$, 'body', $$ຢ່າແບ່ງປັນຂໍ້ມູນຕິດຕໍ່ໃຫ້ຄົນອື່ນ ແລະ ໃຫ້ຍົກເລີກການຕິດຕໍ່ໄດ້ງ່າຍສະເໝີຖ້າຕ້ອງການ.$$)
    ),
    array[$$Collect contact info naturally at the point of sale$$, $$Only send genuinely useful messages, not constant noise$$, $$Respect privacy and always offer an easy opt-out$$],
    array[$$ເກັບຂໍ້ມູນຕິດຕໍ່ຢ່າງທຳມະຊາດຕອນຈຳໜ່າຍ$$, $$ສົ່ງແຕ່ຂໍ້ຄວາມທີ່ເປັນປະໂຫຍດແທ້ ບໍ່ແມ່ນສຽງລົບກວນ$$, $$ເຄົາລົບຄວາມເປັນສ່ວນຕົວ ແລະ ໃຫ້ຍົກເລີກໄດ້ງ່າຍສະເໝີ$$],
    4, false, 52
  ),
  (
    $$use-customer-feedback-to-improve-your-product$$,
    $$Use customer feedback to improve your product$$,
    $$ໃຊ້ຄຳຄິດເຫັນລູກຄ້າປັບປຸງຜະລິດຕະພັນ$$,
    $$Actively asking for feedback surfaces problems you'd otherwise only discover through lost customers.$$,
    $$ການຖາມຄຳຄິດເຫັນຢ່າງຕັ້ງໃຈ ເປີດເຜີຍບັນຫາທີ່ບໍ່ດັ່ງນັ້ນຈະຮູ້ພຽງເມື່ອເສຍລູກຄ້າ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Ask specific, not vague, questions$$, 'body', $$"What almost stopped you from buying?" gets more useful answers than a general "how did we do?"$$),
      jsonb_build_object('heading', $$Look for patterns across multiple customers$$, 'body', $$One complaint might be an outlier, but three people mentioning the same issue is a real signal worth acting on.$$),
      jsonb_build_object('heading', $$Close the loop with customers$$, 'body', $$Telling someone their feedback led to a real change makes them feel heard and often turns them into an even more loyal customer.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຖາມຄຳຖາມສະເພາະ ບໍ່ແມ່ນທົ່ວໄປ$$, 'body', $$"ຫຍັງເກືອບເຮັດໃຫ້ບໍ່ຊື້" ໄດ້ຄຳຕອບທີ່ເປັນປະໂຫຍດຫຼາຍກວ່າ "ພວກເຮົາເປັນແນວໃດແດ່" ທົ່ວໄປ.$$),
      jsonb_build_object('heading', $$ຊອກຫາຮູບແບບຈາກລູກຄ້າຫຼາຍຄົນ$$, 'body', $$ຄຳຕຳນິໜຶ່ງອາດເປັນຂໍ້ຍົກເວັ້ນ ແຕ່ 3 ຄົນເວົ້າເລື່ອງດຽວກັນ ເປັນສັນຍານຈິງທີ່ຄວນລົງມືແກ້.$$),
      jsonb_build_object('heading', $$ຕອບກັບຄືນຫາລູກຄ້າ$$, 'body', $$ການບອກລູກຄ້າວ່າຄຳຄິດເຫັນນຳໄປສູ່ການປ່ຽນແປງຈິງ ເຮັດໃຫ້ເຂົາຮູ້ສຶກຖືກຮັບຟັງ ແລະ ມັກກາຍເປັນລູກຄ້າທີ່ພັກດີຂຶ້ນອີກ.$$)
    ),
    array[$$Ask specific questions instead of vague general ones$$, $$Look for patterns across multiple customers, not one complaint$$, $$Close the loop by telling customers their feedback mattered$$],
    array[$$ຖາມຄຳຖາມສະເພາະ ແທນຄຳຖາມທົ່ວໄປທີ່ບໍ່ຊັດເຈນ$$, $$ຊອກຫາຮູບແບບຈາກລູກຄ້າຫຼາຍຄົນ ບໍ່ແມ່ນຄຳຕຳນິດຽວ$$, $$ຕອບກັບຄືນຫາລູກຄ້າວ່າຄຳຄິດເຫັນຂອງເຂົາສຳຄັນ$$],
    4, false, 53
  ),
  (
    $$avoid-common-small-business-mistakes$$,
    $$Avoid common mistakes new small business owners make$$,
    $$ຫຼີກລ້ຽງຄວາມຜິດພາດທົ່ວໄປຂອງເຈົ້າຂອງທຸລະກິດນ້ອຍໜ້າໃໝ່$$,
    $$A few predictable mistakes account for a large share of early small business struggles.$$,
    $$ຄວາມຜິດພາດທີ່ຄາດການໄດ້ບໍ່ຫຼາຍອັນ ເປັນສາເຫດຫຼັກຂອງຄວາມຫຍຸ້ງຍາກໃນຊ່ວງຕົ້ນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Don't underprice out of fear$$, 'body', $$New owners often price too low, worried no one will buy — this can make a business unsustainable even with strong sales.$$),
      jsonb_build_object('heading', $$Don't try to serve every possible customer$$, 'body', $$Trying to please everyone often means pleasing no one especially well — a clear, specific focus usually performs better.$$),
      jsonb_build_object('heading', $$Don't neglect the numbers$$, 'body', $$Avoiding your finances because they feel stressful only makes real problems harder to catch early — face them regularly instead.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຢ່າຕັ້ງລາຄາຕ່ຳເກີນໄປຍ້ອນຄວາມຢ້ານ$$, 'body', $$ເຈົ້າຂອງໃໝ່ມັກຕັ້ງລາຄາຕ່ຳເກີນໄປ ຍ້ອນຢ້ານວ່າຈະບໍ່ມີໃຜຊື້ — ນີ້ອາດເຮັດໃຫ້ທຸລະກິດຢູ່ບໍ່ໄດ້ ເຖິງແມ່ນຂາຍດີ.$$),
      jsonb_build_object('heading', $$ຢ່າພະຍາຍາມບໍລິການລູກຄ້າທຸກຄົນ$$, 'body', $$ການພະຍາຍາມພໍໃຈທຸກຄົນ ມັກໝາຍຄວາມວ່າບໍ່ພໍໃຈໃຜເປັນພິເສດ — ຈຸດສຸມທີ່ຊັດເຈນ ແລະ ສະເພາະ ມັກໄດ້ຜົນດີກວ່າ.$$),
      jsonb_build_object('heading', $$ຢ່າລະເລີຍຕົວເລກ$$, 'body', $$ການຫຼີກລ້ຽງການເງິນເພາະຮູ້ສຶກກົດດັນ ເຮັດໃຫ້ບັນຫາຈິງຈັບໄດ້ຍາກຂຶ້ນ — ໃຫ້ປະເຊີນມັນເປັນປົກກະຕິແທນ.$$)
    ),
    array[$$Don't underprice out of fear that no one will buy$$, $$Focus on a specific customer instead of trying to please everyone$$, $$Face your finances regularly instead of avoiding them$$],
    array[$$ຢ່າຕັ້ງລາຄາຕ່ຳເກີນໄປຍ້ອນຢ້ານວ່າຈະບໍ່ມີໃຜຊື້$$, $$ສຸມໃສ່ລູກຄ້າສະເພາະ ແທນການພະຍາຍາມພໍໃຈທຸກຄົນ$$, $$ປະເຊີນການເງິນເປັນປົກກະຕິ ແທນການຫຼີກລ້ຽງ$$],
    4, false, 54
  ),
  (
    $$plan-for-slow-sustainable-growth$$,
    $$Plan for slow, sustainable growth over quick expansion$$,
    $$ວາງແຜນການເຕີບໂຕແບບຊ້າ ແລະ ຍືນຍົງ ແທນການຂະຫຍາຍໄວ$$,
    $$Growing faster than your systems and cash flow can support often creates more problems than it solves.$$,
    $$ການເຕີບໂຕໄວກວ່າທີ່ລະບົບ ແລະ ກະແສເງິນສົດຮອງຮັບໄດ້ ມັກສ້າງບັນຫາຫຼາຍກວ່າແກ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Grow one solid capability at a time$$, 'body', $$Expand into a new product, market, or team size only once the current one is running smoothly, not all at once.$$),
      jsonb_build_object('heading', $$Watch quality as you scale$$, 'body', $$Growing sales while service quality slips can quietly damage your reputation faster than slow growth ever would.$$),
      jsonb_build_object('heading', $$Fund growth from real profit when possible$$, 'body', $$Expanding using cash the business has actually earned is safer than taking on debt for growth that isn't yet proven.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເຕີບໂຕທີລະຄວາມສາມາດທີ່ໝັ້ນຄົງ$$, 'body', $$ຂະຫຍາຍໄປສູ່ຜະລິດຕະພັນ, ຕະຫຼາດ ຫຼືຂະໜາດທີມໃໝ່ ພຽງເມື່ອອັນປັດຈຸບັນດຳເນີນລຽບຮ້ອຍແລ້ວ ບໍ່ແມ່ນພ້ອມກັນທັງໝົດ.$$),
      jsonb_build_object('heading', $$ຈັບຕາຄຸນນະພາບຕອນຂະຫຍາຍ$$, 'body', $$ຍອດຂາຍທີ່ເພີ່ມຂຶ້ນຂະນະຄຸນນະພາບການບໍລິການຫຼຸດລົງ ອາດທຳລາຍຊື່ສຽງໄວກວ່າການເຕີບໂຕຊ້າ.$$),
      jsonb_build_object('heading', $$ໃຊ້ກຳໄລຈິງເປັນທຶນຂະຫຍາຍເມື່ອເປັນໄປໄດ້$$, 'body', $$ການຂະຫຍາຍໂດຍໃຊ້ເງິນທີ່ທຸລະກິດຫາໄດ້ຈິງ ປອດໄພກວ່າການກູ້ຢືມສຳລັບການເຕີບໂຕທີ່ຍັງບໍ່ໄດ້ພິສູດ.$$)
    ),
    array[$$Expand one solid capability at a time, not everything at once$$, $$Watch that quality doesn't slip as you scale up$$, $$Fund growth from real profit rather than debt when possible$$],
    array[$$ຂະຫຍາຍທີລະຄວາມສາມາດ ບໍ່ແມ່ນທຸກຢ່າງພ້ອມກັນ$$, $$ຈັບຕາບໍ່ໃຫ້ຄຸນນະພາບຫຼຸດລົງຕອນຂະຫຍາຍ$$, $$ໃຊ້ກຳໄລຈິງເປັນທຶນຂະຫຍາຍ ແທນການກູ້ຢືມເມື່ອເປັນໄປໄດ້$$],
    4, false, 55
  ),
  (
    $$build-a-simple-inventory-system$$,
    $$Build a simple inventory system that prevents surprises$$,
    $$ສ້າງລະບົບສາງງ່າຍໆທີ່ປ້ອງກັນຄວາມແປກໃຈ$$,
    $$Knowing exactly what you have prevents both running out and over-ordering.$$,
    $$ການຮູ້ຢ່າງແທ້ຈິງວ່າມີຫຍັງຢູ່ ປ້ອງກັນທັງການໝົດສະຕ໊ອກ ແລະ ການສັ່ງເກີນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Count and record regularly$$, 'body', $$A consistent weekly or monthly count, even a simple manual one, keeps your records accurate and trustworthy.$$),
      jsonb_build_object('heading', $$Set a reorder point for each item$$, 'body', $$Know the specific quantity that triggers a new order, so you never notice you're out only after a customer asks.$$),
      jsonb_build_object('heading', $$Track what actually sells versus what sits$$, 'body', $$Slow-moving stock ties up cash — regularly review what's not selling and adjust future orders accordingly.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ນັບ ແລະ ບັນທຶກເປັນປົກກະຕິ$$, 'body', $$ການນັບປະຈຳອາທິດ ຫຼືເດືອນ ແມ່ນແຕ່ແບບມືອງ່າຍໆ ຮັກສາບັນທຶກໃຫ້ຖືກຕ້ອງ ແລະ ໜ້າເຊື່ອຖື.$$),
      jsonb_build_object('heading', $$ຕັ້ງຈຸດສັ່ງຊື້ຄືນສຳລັບແຕ່ລະລາຍການ$$, 'body', $$ຮູ້ຈຳນວນສະເພາະທີ່ຕ້ອງສັ່ງໃໝ່ ເພື່ອບໍ່ໃຫ້ຮູ້ຕົວວ່າໝົດພຽງຕອນລູກຄ້າຖາມ.$$),
      jsonb_build_object('heading', $$ຕິດຕາມສິ່ງທີ່ຂາຍໄດ້ຈິງ ທຽບກັບສິ່ງທີ່ຄ້າງ$$, 'body', $$ສິນຄ້າທີ່ຂາຍຊ້າ ຜູກເງິນສົດໄວ້ — ທົບທວນເປັນປົກກະຕິວ່າຫຍັງບໍ່ຂາຍ ແລະ ປັບການສັ່ງໃນອະນາຄົດຕາມນັ້ນ.$$)
    ),
    array[$$Count and record inventory on a regular schedule$$, $$Set a specific reorder point for each item$$, $$Track what actually sells and adjust future orders accordingly$$],
    array[$$ນັບ ແລະ ບັນທຶກສາງຕາມຕາຕະລາງທີ່ແນ່ນອນ$$, $$ຕັ້ງຈຸດສັ່ງຊື້ຄືນສະເພາະສຳລັບແຕ່ລະລາຍການ$$, $$ຕິດຕາມສິ່ງທີ່ຂາຍໄດ້ຈິງ ແລະ ປັບການສັ່ງໃນອະນາຄົດ$$],
    4, false, 56
  ),
  (
    $$understand-markup-vs-margin$$,
    $$Understand the difference between markup and margin$$,
    $$ເຂົ້າໃຈຄວາມແຕກຕ່າງລະຫວ່າງ Markup ແລະ Margin$$,
    $$Confusing the two is a common pricing mistake that quietly erodes real profit.$$,
    $$ການສັບສົນລະຫວ່າງສອງອັນນີ້ ເປັນຄວາມຜິດພາດການຕັ້ງລາຄາທົ່ວໄປທີ່ກັດກຳໄລແທ້ໆແບບງຽບໆ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Markup is based on cost$$, 'body', $$A 50% markup on a 10,000 kip item means adding 5,000 kip, pricing it at 15,000 kip — markup is a percentage of what you paid.$$),
      jsonb_build_object('heading', $$Margin is based on the selling price$$, 'body', $$That same 15,000 kip price with a 10,000 kip cost gives a 33% margin — margin is profit as a percentage of what the customer pays.$$),
      jsonb_build_object('heading', $$Know which one you're actually planning around$$, 'body', $$Confusing the two when setting prices can leave your business with far less profit than you thought you were targeting.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$Markup ອີງໃສ່ຕົ້ນທຶນ$$, 'body', $$Markup 50% ຂອງເຄື່ອງ 10,000 ກີບ ໝາຍຄວາມວ່າເພີ່ມ 5,000 ກີບ ຕັ້ງລາຄາ 15,000 ກີບ — markup ຄືອັດຕາສ່ວນຂອງສິ່ງທີ່ຈ່າຍໄປ.$$),
      jsonb_build_object('heading', $$Margin ອີງໃສ່ລາຄາຂາຍ$$, 'body', $$ລາຄາ 15,000 ກີບດຽວກັນ ທີ່ຕົ້ນທຶນ 10,000 ກີບ ໃຫ້ margin 33% — margin ຄືກຳໄລເປັນອັດຕາສ່ວນຂອງສິ່ງທີ່ລູກຄ້າຈ່າຍ.$$),
      jsonb_build_object('heading', $$ຮູ້ວ່າກຳລັງວາງແຜນອີງໃສ່ອັນໃດແທ້$$, 'body', $$ການສັບສົນລະຫວ່າງສອງອັນຕອນຕັ້ງລາຄາ ອາດເຮັດໃຫ້ທຸລະກິດມີກຳໄລໜ້ອຍກວ່າທີ່ຄິດວ່າຕັ້ງເປົ້າໄວ້ຫຼາຍ.$$)
    ),
    array[$$Markup is a percentage added to your cost$$, $$Margin is profit as a percentage of the selling price$$, $$Know clearly which one you're using when setting prices$$],
    array[$$Markup ຄືອັດຕາສ່ວນທີ່ເພີ່ມໃສ່ຕົ້ນທຶນ$$, $$Margin ຄືກຳໄລເປັນອັດຕາສ່ວນຂອງລາຄາຂາຍ$$, $$ຮູ້ຢ່າງຊັດເຈນວ່າກຳລັງໃຊ້ອັນໃດຕອນຕັ້ງລາຄາ$$],
    5, false, 57
  ),
  (
    $$sell-to-a-niche-market-effectively$$,
    $$Sell to a niche market effectively$$,
    $$ຂາຍໃຫ້ຕະຫຼາດສະເພາະກຸ່ມຢ່າງມີປະສິດທິພາບ$$,
    $$A smaller, well-served niche often beats competing broadly against everyone.$$,
    $$ກຸ່ມສະເພາະນ້ອຍທີ່ບໍລິການດີ ມັກດີກວ່າການແຂ່ງຂັນກວ້າງກັບທຸກຄົນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Become the obvious choice for one group$$, 'body', $$Serving one specific type of customer exceptionally well makes you the clear, trusted choice for exactly them.$$),
      jsonb_build_object('heading', $$Speak their specific language$$, 'body', $$Use the exact terms and concerns your niche customer actually uses — generic marketing language doesn't resonate the same way.$$),
      jsonb_build_object('heading', $$Expand outward only after mastering the niche$$, 'body', $$Once you've truly won a specific niche, expanding to adjacent markets becomes much easier than trying to serve everyone from the start.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເປັນທາງເລືອກທີ່ຊັດເຈນສຳລັບກຸ່ມໜຶ່ງ$$, 'body', $$ການບໍລິການລູກຄ້າສະເພາະປະເພດໜຶ່ງໃຫ້ດີເລີດ ເຮັດໃຫ້ທ່ານເປັນທາງເລືອກທີ່ຊັດເຈນ ແລະ ໜ້າເຊື່ອຖືສຳລັບກຸ່ມນັ້ນແທ້.$$),
      jsonb_build_object('heading', $$ໃຊ້ພາສາສະເພາະຂອງເຂົາ$$, 'body', $$ໃຊ້ຄຳສັບ ແລະ ຄວາມກັງວົນທີ່ລູກຄ້າກຸ່ມສະເພາະໃຊ້ຈິງ — ພາສາການຕະຫຼາດທົ່ວໄປບໍ່ໄດ້ຜົນເທົ່າ.$$),
      jsonb_build_object('heading', $$ຂະຫຍາຍອອກຫຼັງເກັ່ງກຸ່ມສະເພາະນັ້ນແລ້ວ$$, 'body', $$ເມື່ອຊະນະໃຈກຸ່ມສະເພາະໄດ້ແທ້ ການຂະຫຍາຍໄປຕະຫຼາດໃກ້ຄຽງງ່າຍກວ່າການພະຍາຍາມບໍລິການທຸກຄົນຕັ້ງແຕ່ຕົ້ນຫຼາຍ.$$)
    ),
    array[$$Serve one specific customer type exceptionally well$$, $$Speak the specific language your niche customer uses$$, $$Expand to nearby markets only after mastering your niche$$],
    array[$$ບໍລິການລູກຄ້າປະເພດສະເພາະໜຶ່ງໃຫ້ດີເລີດ$$, $$ໃຊ້ພາສາສະເພາະທີ່ລູກຄ້າກຸ່ມນັ້ນໃຊ້ຈິງ$$, $$ຂະຫຍາຍໄປຕະຫຼາດໃກ້ຄຽງຫຼັງເກັ່ງກຸ່ມສະເພາະນັ້ນແລ້ວ$$],
    4, false, 58
  ),
  (
    $$build-partnerships-with-other-small-businesses$$,
    $$Build partnerships with other small businesses$$,
    $$ສ້າງຄວາມຮ່ວມມືກັບທຸລະກິດນ້ອຍອື່ນໆ$$,
    $$Nearby businesses with a shared customer base can help each other grow without competing.$$,
    $$ທຸລະກິດໃກ້ຄຽງທີ່ມີກຸ່ມລູກຄ້າຄ້າຍກັນ ຊ່ວຍກັນເຕີບໂຕໄດ້ໂດຍບໍ່ຕ້ອງແຂ່ງຂັນກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Find businesses with the same customer, different product$$, 'body', $$A bakery and a coffee shop, or a tailor and a photographer, can refer customers to each other without ever competing.$$),
      jsonb_build_object('heading', $$Propose something specific and mutual$$, 'body', $$"Would you display my flyers if I display yours?" is easier to say yes to than a vague offer to "collaborate sometime."$$),
      jsonb_build_object('heading', $$Start small and build trust over time$$, 'body', $$A simple first collaboration that goes well naturally leads to bigger joint efforts later.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫາທຸລະກິດທີ່ມີລູກຄ້າຄືກັນ ແຕ່ຜະລິດຕະພັນຕ່າງກັນ$$, 'body', $$ຮ້ານເຂົ້າໜົມ ແລະ ຮ້ານກາເຟ ຫຼືຮ້ານຕັດເສື້ອ ແລະ ຊ່າງພາບ ສາມາດແນະນຳລູກຄ້າໃຫ້ກັນໄດ້ໂດຍບໍ່ຕ້ອງແຂ່ງຂັນເລີຍ.$$),
      jsonb_build_object('heading', $$ສະເໜີສິ່ງທີ່ສະເພາະ ແລະ ໄດ້ຮັບປະໂຫຍດທັງສອງຝ່າຍ$$, 'body', $$"ວາງໃບປິວຂ້ອຍໄດ້ບໍ່ ຖ້າຂ້ອຍວາງໃຫ້ເຈົ້າ" ຕົກລົງງ່າຍກວ່າການສະເໜີແບບບໍ່ຊັດເຈນວ່າ "ຮ່ວມມືກັນສັກມື້."$$),
      jsonb_build_object('heading', $$ເລີ່ມນ້ອຍ ແລະ ສ້າງຄວາມໄວ້ໃຈຕາມເວລາ$$, 'body', $$ການຮ່ວມມືທຳອິດແບບງ່າຍທີ່ໄປໄດ້ດີ ນຳໄປສູ່ຄວາມພະຍາຍາມຮ່ວມກັນທີ່ໃຫຍ່ຂຶ້ນພາຍຫຼັງແບບທຳມະຊາດ.$$)
    ),
    array[$$Find nearby businesses with the same customer, different product$$, $$Propose something specific and mutually beneficial$$, $$Start with a small collaboration and build trust over time$$],
    array[$$ຫາທຸລະກິດໃກ້ຄຽງທີ່ມີລູກຄ້າຄືກັນ ແຕ່ຜະລິດຕະພັນຕ່າງກັນ$$, $$ສະເໜີສິ່ງທີ່ສະເພາະ ແລະ ໄດ້ຮັບປະໂຫຍດທັງສອງຝ່າຍ$$, $$ເລີ່ມການຮ່ວມມືນ້ອຍ ແລະ ສ້າງຄວາມໄວ້ໃຈຕາມເວລາ$$],
    4, false, 59
  ),
  (
    $$handle-a-business-setback-without-giving-up$$,
    $$Handle a business setback without giving up$$,
    $$ຮັບມືອຸປະສັກທຸລະກິດໂດຍບໍ່ຍອມແພ້$$,
    $$Most successful business owners faced a serious setback before things worked — the response matters more than the setback itself.$$,
    $$ເຈົ້າຂອງທຸລະກິດທີ່ສຳເລັດສ່ວນຫຼາຍ ເຄີຍພົບອຸປະສັກໜັກກ່ອນຈະໄປໄດ້ດີ — ການຕອບໂຕ້ສຳຄັນກວ່າອຸປະສັກເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Separate the emotional reaction from the decision$$, 'body', $$Give yourself time to feel the disappointment, but wait until you're calmer to make any major decision about next steps.$$),
      jsonb_build_object('heading', $$Identify what's actually recoverable$$, 'body', $$List what's genuinely lost versus what can still be salvaged or rebuilt — setbacks often feel bigger than they actually are at first.$$),
      jsonb_build_object('heading', $$Talk to someone who's been through it$$, 'body', $$Another business owner who's faced a similar setback can offer both perspective and practical advice you wouldn't find alone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ແຍກປະຕິກິລິຍາທາງອາລົມອອກຈາກການຕັດສິນໃຈ$$, 'body', $$ໃຫ້ຕົນເອງມີເວລາຮູ້ສຶກຜິດຫວັງ ແຕ່ລໍຈົນສະຫງົບກວ່ານີ້ກ່ອນຕັດສິນໃຈໃຫຍ່ກ່ຽວກັບຂັ້ນຕອນຕໍ່ໄປ.$$),
      jsonb_build_object('heading', $$ລະບຸສິ່ງທີ່ຍັງກູ້ຄືນໄດ້ແທ້$$, 'body', $$ຂຽນວ່າຫຍັງເສຍໄປແທ້ ທຽບກັບຫຍັງຍັງກູ້ ຫຼືສ້າງຄືນໄດ້ — ອຸປະສັກມັກຮູ້ສຶກໃຫຍ່ກວ່າຄວາມເປັນຈິງໃນຕອນທຳອິດ.$$),
      jsonb_build_object('heading', $$ລົມກັບຄົນທີ່ເຄີຍຜ່ານມາ$$, 'body', $$ເຈົ້າຂອງທຸລະກິດອື່ນທີ່ເຄີຍພົບອຸປະສັກຄ້າຍກັນ ໃຫ້ທັງມຸມມອງ ແລະ ຄຳແນະນຳພາກປະຕິບັດທີ່ຫາຄົນດຽວບໍ່ໄດ້.$$)
    ),
    array[$$Give yourself time before making major decisions after a setback$$, $$Identify what's genuinely lost versus still recoverable$$, $$Talk to another business owner who's faced something similar$$],
    array[$$ໃຫ້ເວລາຕົນເອງກ່ອນຕັດສິນໃຈໃຫຍ່ຫຼັງອຸປະສັກ$$, $$ລະບຸສິ່ງທີ່ເສຍໄປແທ້ ທຽບກັບຍັງກູ້ຄືນໄດ້$$, $$ລົມກັບເຈົ້າຂອງທຸລະກິດອື່ນທີ່ເຄີຍພົບຄ້າຍກັນ$$],
    4, false, 60
  ),
  (
    $$know-when-to-pivot-your-business-idea$$,
    $$Know when it's time to pivot your business idea$$,
    $$ຮູ້ວ່າຮອດເວລາປັບປ່ຽນແນວຄິດທຸລະກິດແທ້ບໍ່$$,
    $$Consistent signals over time, not one bad week, should guide a decision to change direction.$$,
    $$ສັນຍານທີ່ຄົງທີ່ຕາມເວລາ ບໍ່ແມ່ນອາທິດດຽວທີ່ບໍ່ດີ ຄວນນຳທາງການຕັດສິນໃຈປ່ຽນທິດທາງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Watch for a consistent lack of traction$$, 'body', $$Months of genuine effort with flat or declining results, despite trying reasonable fixes, is a real signal worth heeding.$$),
      jsonb_build_object('heading', $$Distinguish pivoting from quitting$$, 'body', $$A pivot keeps what's working — your customer relationships, brand, or skills — while changing the specific offer.$$),
      jsonb_build_object('heading', $$Test the new direction cheaply first$$, 'body', $$Before fully committing to a pivot, test the new idea with the same low-cost validation methods you'd use for any new business.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຈັບຕາການບໍ່ມີແຮງຂັບເຄື່ອນທີ່ຄົງທີ່$$, 'body', $$ຫຼາຍເດືອນຂອງຄວາມພະຍາຍາມແທ້ ໂດຍຜົນລັບຄົງທີ່ ຫຼືຫຼຸດລົງ ເຖິງແມ່ນລອງແກ້ໄຂແລ້ວ ເປັນສັນຍານຈິງທີ່ຄວນໃສ່ໃຈ.$$),
      jsonb_build_object('heading', $$ແຍກການປັບປ່ຽນອອກຈາກການເລີກ$$, 'body', $$ການປັບປ່ຽນ ຮັກສາສິ່ງທີ່ໄດ້ຜົນ — ຄວາມສຳພັນລູກຄ້າ, ແບຣນ ຫຼືທັກສະ — ໂດຍປ່ຽນສິ່ງທີ່ສະເໜີສະເພາະ.$$),
      jsonb_build_object('heading', $$ທົດສອບທິດທາງໃໝ່ແບບປະຢັດກ່ອນ$$, 'body', $$ກ່ອນຕົກລົງປັບປ່ຽນເຕັມທີ່ ໃຫ້ທົດສອບແນວຄິດໃໝ່ດ້ວຍວິທີພິສູດຄວາມຕ້ອງການແບບປະຢັດ ຄືກັບທຸລະກິດໃໝ່ໃດໜຶ່ງ.$$)
    ),
    array[$$Watch for months of flat results despite genuine effort$$, $$A pivot keeps what's working while changing the specific offer$$, $$Test the new direction cheaply before fully committing$$],
    array[$$ຈັບຕາຫຼາຍເດືອນຂອງຜົນລັບຄົງທີ່ ເຖິງແມ່ນພະຍາຍາມແທ້$$, $$ການປັບປ່ຽນຮັກສາສິ່ງທີ່ໄດ້ຜົນ ພ້ອມປ່ຽນສິ່ງທີ່ສະເໜີ$$, $$ທົດສອບທິດທາງໃໝ່ແບບປະຢັດກ່ອນຕົກລົງເຕັມທີ່$$],
    4, false, 61
  ),
  (
    $$build-a-simple-customer-service-process$$,
    $$Build a simple, consistent customer service process$$,
    $$ສ້າງຂະບວນການບໍລິການລູກຄ້າທີ່ງ່າຍ ແລະ ສະໝ່ຳສະເໝີ$$,
    $$A consistent process ensures every customer gets a good experience, not just the ones you happen to handle personally.$$,
    $$ຂະບວນການທີ່ສະໝ່ຳສະເໝີ ຮັບປະກັນວ່າທຸກລູກຄ້າໄດ້ຮັບປະສົບການທີ່ດີ ບໍ່ແມ່ນແຕ່ຄົນທີ່ທ່ານຈັດການເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Write down your standard responses$$, 'body', $$Common questions and complaints deserve a thought-out, consistent answer prepared in advance, not improvised each time.$$),
      jsonb_build_object('heading', $$Set a clear response time goal$$, 'body', $$Decide how quickly you'll respond to messages — say, within 24 hours — and hold yourself to it consistently.$$),
      jsonb_build_object('heading', $$Train anyone who helps you the same way$$, 'body', $$If someone else answers customers for you, share your process so the experience stays consistent no matter who responds.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຂຽນຄຳຕອບມາດຕະຖານໄວ້$$, 'body', $$ຄຳຖາມ ແລະ ຄຳຕຳນິທົ່ວໄປ ຄວນມີຄຳຕອບທີ່ຄິດໄວ້ລ່ວງໜ້າ ແລະ ສະໝ່ຳສະເໝີ ບໍ່ແມ່ນຄິດສົດແຕ່ລະຄັ້ງ.$$),
      jsonb_build_object('heading', $$ຕັ້ງເປົ້າໝາຍເວລາຕອບທີ່ຊັດເຈນ$$, 'body', $$ຕັດສິນວ່າຈະຕອບຂໍ້ຄວາມໄວປານໃດ — ເຊັ່ນ ພາຍໃນ 24 ຊົ່ວໂມງ — ແລະ ຮັກສາໃຫ້ໄດ້ຢ່າງສະໝ່ຳສະເໝີ.$$),
      jsonb_build_object('heading', $$ຝຶກຄົນທີ່ຊ່ວຍທ່ານແບບດຽວກັນ$$, 'body', $$ຖ້າມີຄົນອື່ນຕອບລູກຄ້າແທນທ່ານ ໃຫ້ແບ່ງປັນຂະບວນການ ເພື່ອໃຫ້ປະສົບການສະໝ່ຳສະເໝີ ບໍ່ວ່າໃຜເປັນຄົນຕອບ.$$)
    ),
    array[$$Prepare thought-out standard responses in advance$$, $$Set and hold yourself to a clear response time goal$$, $$Train anyone who helps you to follow the same process$$],
    array[$$ກຽມຄຳຕອບມາດຕະຖານທີ່ຄິດໄວ້ລ່ວງໜ້າ$$, $$ຕັ້ງ ແລະ ຮັກສາເປົ້າໝາຍເວລາຕອບທີ່ຊັດເຈນ$$, $$ຝຶກຄົນທີ່ຊ່ວຍທ່ານໃຫ້ປະຕິບັດຕາມຂະບວນການດຽວກັນ$$],
    4, false, 62
  ),
  (
    $$reinvest-profits-wisely-in-early-stages$$,
    $$Reinvest profits wisely in the early stages$$,
    $$ນຳກຳໄລລົງທຶນຄືນຢ່າງສະຫຼາດໃນຊ່ວງຕົ້ນ$$,
    $$Where you reinvest early profit shapes your business's trajectory more than the profit amount itself.$$,
    $$ບ່ອນທີ່ນຳກຳໄລຕົ້ນລົງທຶນຄືນ ກຳນົດທິດທາງທຸລະກິດຫຼາຍກວ່າຈຳນວນກຳໄລເອງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Fund your biggest bottleneck first$$, 'body', $$Identify what's most limiting growth right now — inventory, marketing, or a tool — and reinvest there before anything else.$$),
      jsonb_build_object('heading', $$Keep a portion as a safety buffer$$, 'body', $$Don't reinvest every kip — some profit should stay as cash cushion for unexpected costs or a slow month.$$),
      jsonb_build_object('heading', $$Measure the return before reinvesting more$$, 'body', $$Track whether previous reinvestments actually paid off before pouring more money into the same area.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ໃຫ້ທຶນຈຸດຄໍ່ຂວດໃຫຍ່ທີ່ສຸດກ່ອນ$$, 'body', $$ລະບຸສິ່ງທີ່ຈຳກັດການເຕີບໂຕທີ່ສຸດຕອນນີ້ — ສາງ, ການຕະຫຼາດ ຫຼືເຄື່ອງມື — ແລະ ລົງທຶນຄືນຢູ່ນັ້ນກ່ອນອື່ນ.$$),
      jsonb_build_object('heading', $$ຮັກສາສ່ວນໜຶ່ງເປັນເງິນສະຫງວນ$$, 'body', $$ຢ່ານຳກຳໄລທຸກກີບໄປລົງທຶນຄືນ — ກຳໄລບາງສ່ວນຄວນເປັນເງິນສະຫງວນສຳລັບຄ່າໃຊ້ຈ່າຍທີ່ບໍ່ຄາດຄິດ ຫຼືເດືອນທີ່ຊ້າ.$$),
      jsonb_build_object('heading', $$ວັດແທກຜົນຕອບແທນກ່ອນລົງທຶນຄືນເພີ່ມ$$, 'body', $$ຕິດຕາມວ່າການລົງທຶນຄືນທີ່ຜ່ານມາໄດ້ຜົນຈິງບໍ່ ກ່ອນທຸ້ມເງິນເພີ່ມໃສ່ພື້ນທີ່ດຽວກັນ.$$)
    ),
    array[$$Fund your biggest current growth bottleneck first$$, $$Keep a portion of profit as a safety buffer, not all reinvested$$, $$Measure whether past reinvestments paid off before repeating$$],
    array[$$ໃຫ້ທຶນຈຸດຄໍ່ຂວດການເຕີບໂຕໃຫຍ່ທີ່ສຸດຕອນນີ້ກ່ອນ$$, $$ຮັກສາກຳໄລບາງສ່ວນເປັນເງິນສະຫງວນ ບໍ່ແມ່ນລົງທຶນຄືນທັງໝົດ$$, $$ວັດແທກວ່າການລົງທຶນຄືນທີ່ຜ່ານມາໄດ້ຜົນກ່ອນເຮັດຊ້ຳ$$],
    4, false, 63
  ),
  (
    $$build-a-simple-return-refund-policy$$,
    $$Build a simple, fair return and refund policy$$,
    $$ສ້າງນະໂຍບາຍການສົ່ງຄືນ ແລະ ຄືນເງິນທີ່ງ່າຍ ແລະ ຍຸຕິທຳ$$,
    $$A clear policy set before problems arise protects both you and your customers from confusion later.$$,
    $$ນະໂຍບາຍທີ່ຊັດເຈນ ຕັ້ງໄວ້ກ່ອນເກີດບັນຫາ ປົກປ້ອງທັງທ່ານ ແລະ ລູກຄ້າຈາກຄວາມສັບສົນພາຍຫຼັງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Decide the rules before you need them$$, 'body', $$Set your return window, condition requirements, and refund method in advance, not improvised in the middle of a frustrated customer conversation.$$),
      jsonb_build_object('heading', $$State it clearly before the sale$$, 'body', $$Displaying the policy upfront builds trust and prevents disputes — surprises after a purchase damage relationships.$$),
      jsonb_build_object('heading', $$Be a little generous when it's close$$, 'body', $$For borderline cases, erring toward the customer often costs less than the reputational damage of being seen as rigid.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຕັດສິນກົດກ່ອນຕ້ອງການໃຊ້$$, 'body', $$ຕັ້ງໄລຍະສົ່ງຄືນ, ເງື່ອນໄຂ ແລະ ວິທີຄືນເງິນລ່ວງໜ້າ ບໍ່ແມ່ນຄິດສົດກາງການລົມກັບລູກຄ້າທີ່ອຶດອັດ.$$),
      jsonb_build_object('heading', $$ບອກໃຫ້ຊັດເຈນກ່ອນຂາຍ$$, 'body', $$ການສະແດງນະໂຍບາຍລ່ວງໜ້າ ສ້າງຄວາມໄວ້ໃຈ ແລະ ປ້ອງກັນຂໍ້ຂັດແຍ່ງ — ຄວາມແປກໃຈຫຼັງຊື້ ທຳລາຍຄວາມສຳພັນ.$$),
      jsonb_build_object('heading', $$ໃຈກວ້າງໜ້ອຍໜຶ່ງໃນກໍລະນີກ້ຳກຶ່ງ$$, 'body', $$ສຳລັບກໍລະນີກ້ຳກຶ່ງ ການເອນອ່ຽງໄປຫາລູກຄ້າ ມັກເສຍໜ້ອຍກວ່າຄວາມເສຍຫາຍທາງຊື່ສຽງຈາກການຖືກເບິ່ງວ່າແຂງກະດ້າງ.$$)
    ),
    array[$$Decide the return and refund rules before you need them$$, $$Display the policy clearly before the sale happens$$, $$Lean generous on borderline cases to protect your reputation$$],
    array[$$ຕັດສິນກົດການສົ່ງຄືນ ແລະ ຄືນເງິນກ່ອນຕ້ອງການໃຊ້$$, $$ສະແດງນະໂຍບາຍໃຫ້ຊັດເຈນກ່ອນການຂາຍ$$, $$ເອນອ່ຽງໃຈກວ້າງໃນກໍລະນີກ້ຳກຶ່ງເພື່ອປົກປ້ອງຊື່ສຽງ$$],
    4, false, 64
  ),
  (
    $$build-a-short-elevator-pitch-for-your-business$$,
    $$Build a short elevator pitch for your business$$,
    $$ສ້າງບົດແນະນຳທຸລະກິດສັ້ນທີ່ໃຊ້ໄດ້ໄວ$$,
    $$A clear 15-second explanation opens doors that a confused, rambling description closes.$$,
    $$ຄຳອະທິບາຍ 15 ວິນາທີທີ່ຊັດເຈນ ເປີດປະຕູທີ່ຄຳອະທິບາຍສັບສົນ ແລະ ຍາວປິດໄວ້.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Cover who, what, and why it matters$$, 'body', $$"I help [who] do [what] so they can [benefit]" is a simple, reliable structure that works in almost any situation.$$),
      jsonb_build_object('heading', $$Practice until it feels natural$$, 'body', $$Say it aloud enough times that it comes out smoothly, not memorized and robotic — natural delivery matters as much as the words.$$),
      jsonb_build_object('heading', $$Have a slightly different version for different audiences$$, 'body', $$Adjust the wording for an investor, a customer, or a new acquaintance — the core stays the same, but the emphasis shifts.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄອບຄຸມ ໃຜ, ຫຍັງ ແລະ ເປັນຫຍັງສຳຄັນ$$, 'body', $$"ຂ້ອຍຊ່ວຍ [ໃຜ] ເຮັດ [ຫຍັງ] ເພື່ອໃຫ້ [ຜົນປະໂຫຍດ]" ເປັນໂຄງສ້າງງ່າຍ ແລະ ໜ້າເຊື່ອຖືທີ່ໃຊ້ໄດ້ເກືອບທຸກສະຖານະການ.$$),
      jsonb_build_object('heading', $$ຝຶກຈົນຮູ້ສຶກເປັນທຳມະຊາດ$$, 'body', $$ເວົ້າອອກສຽງຫຼາຍພໍໃຫ້ອອກມາລຽບງ່າຍ ບໍ່ແມ່ນທ່ອງຈຳແບບແຂງ — ການເວົ້າແບບທຳມະຊາດສຳຄັນພໍໆກັບຄຳເວົ້າ.$$),
      jsonb_build_object('heading', $$ມີສະບັບແຕກຕ່າງເລັກນ້ອຍສຳລັບຜູ້ຟັງຕ່າງກັນ$$, 'body', $$ປັບຄຳເວົ້າສຳລັບນັກລົງທຶນ, ລູກຄ້າ ຫຼືຄົນຮູ້ຈັກໃໝ່ — ໃຈຄວາມຫຼັກຄືກັນ ແຕ່ຈຸດເນັ້ນປ່ຽນໄປ.$$)
    ),
    array[$$Use a simple who, what, why structure for your pitch$$, $$Practice aloud until the delivery feels natural$$, $$Adjust emphasis slightly for different audiences$$],
    array[$$ໃຊ້ໂຄງສ້າງງ່າຍ ໃຜ, ຫຍັງ, ເປັນຫຍັງ ສຳລັບບົດແນະນຳ$$, $$ຝຶກອອກສຽງຈົນການເວົ້າຮູ້ສຶກເປັນທຳມະຊາດ$$, $$ປັບຈຸດເນັ້ນເລັກນ້ອຍສຳລັບຜູ້ຟັງຕ່າງກັນ$$],
    4, false, 65
  ),
  (
    $$test-multiple-small-ideas-before-committing$$,
    $$Test multiple small ideas before committing to one$$,
    $$ທົດສອບແນວຄິດນ້ອຍຫຼາຍອັນ ກ່ອນຕັດສິນໃຈເລືອກອັນດຽວ$$,
    $$Cheap, parallel tests reveal which idea has real traction before you invest heavily in any one of them.$$,
    $$ການທົດສອບແບບປະຢັດຫຼາຍອັນພ້ອມກັນ ເປີດເຜີຍວ່າແນວຄິດໃດມີແຮງຂັບເຄື່ອນຈິງ ກ່ອນລົງທຶນໜັກກັບອັນໃດອັນໜຶ່ງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Run small, low-cost tests in parallel$$, 'body', $$A simple post, a small batch, or a short trial for two or three ideas costs little and reveals real signal quickly.$$),
      jsonb_build_object('heading', $$Compare real reactions, not your own preference$$, 'body', $$Let actual customer interest — inquiries, orders, engagement — decide, rather than which idea you personally like best.$$),
      jsonb_build_object('heading', $$Commit fully once you have a clear signal$$, 'body', $$Once one idea clearly outperforms the others, focus your full energy there rather than continuing to spread thin.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ທົດສອບນ້ອຍ ແລະ ປະຢັດພ້ອມກັນ$$, 'body', $$ໂພສງ່າຍໆ, ຊຸດນ້ອຍ ຫຼືການທົດລອງສັ້ນສຳລັບ 2-3 ແນວຄິດ ໃຊ້ຈ່າຍໜ້ອຍ ແລະ ເປີດເຜີຍສັນຍານຈິງໄດ້ໄວ.$$),
      jsonb_build_object('heading', $$ປຽບທຽບປະຕິກິລິຍາຈິງ ບໍ່ແມ່ນຄວາມມັກສ່ວນຕົວ$$, 'body', $$ໃຫ້ຄວາມສົນໃຈລູກຄ້າຈິງ — ຄຳຖາມ, ຄຳສັ່ງຊື້, ການມີສ່ວນຮ່ວມ — ຕັດສິນໃຈ ບໍ່ແມ່ນແນວຄິດທີ່ຕົນເອງມັກທີ່ສຸດ.$$),
      jsonb_build_object('heading', $$ລົງທຶນເຕັມທີ່ເມື່ອມີສັນຍານຊັດເຈນ$$, 'body', $$ເມື່ອແນວຄິດໃດອັນໜຶ່ງໂດດເດັ່ນຢ່າງຊັດເຈນ ໃຫ້ສຸມພະລັງງານເຕັມທີ່ບ່ອນນັ້ນ ແທນທີ່ຈະສືບຕໍ່ແບ່ງບາງ.$$)
    ),
    array[$$Run small, low-cost tests of a few ideas in parallel$$, $$Let real customer reactions decide, not personal preference$$, $$Commit fully to the idea once you have a clear signal$$],
    array[$$ທົດສອບແນວຄິດສອງສາມອັນແບບນ້ອຍ ແລະ ປະຢັດພ້ອມກັນ$$, $$ໃຫ້ປະຕິກິລິຍາລູກຄ້າຈິງຕັດສິນໃຈ ບໍ່ແມ່ນຄວາມມັກສ່ວນຕົວ$$, $$ລົງທຶນເຕັມທີ່ກັບແນວຄິດເມື່ອມີສັນຍານຊັດເຈນ$$],
    4, false, 66
  ),
  (
    $$understand-customer-lifetime-value$$,
    $$Understand customer lifetime value, not just one sale$$,
    $$ເຂົ້າໃຈມູນຄ່າລູກຄ້າຕະຫຼອດຊີວິດ ບໍ່ແມ່ນແຕ່ການຂາຍຄັ້ງດຽວ$$,
    $$A customer worth many purchases over years justifies more effort to keep than the first sale alone suggests.$$,
    $$ລູກຄ້າທີ່ມີຄຸນຄ່າຫຼາຍການຊື້ຕະຫຼອດຫຼາຍປີ ຄຸ້ມຄ່າຄວາມພະຍາຍາມຫຼາຍກວ່າການຂາຍຄັ້ງທຳອິດຢ່າງດຽວ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Estimate total value, not just first purchase$$, 'body', $$A customer who buys monthly for two years is worth far more than the size of any single transaction suggests.$$),
      jsonb_build_object('heading', $$This changes how much you can spend to win them$$, 'body', $$Knowing lifetime value tells you how much is reasonable to spend on marketing or a discount to acquire one loyal customer.$$),
      jsonb_build_object('heading', $$Invest accordingly in retention$$, 'body', $$Once you see the real long-term value, spending a little extra on service or follow-up to keep a customer often pays off many times over.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ປະມານມູນຄ່າລວມ ບໍ່ແມ່ນແຕ່ການຊື້ຄັ້ງທຳອິດ$$, 'body', $$ລູກຄ້າທີ່ຊື້ທຸກເດືອນເປັນເວລາ 2 ປີ ມີຄຸນຄ່າຫຼາຍກວ່າຂະໜາດການຊື້ຄັ້ງດຽວຫຼາຍ.$$),
      jsonb_build_object('heading', $$ນີ້ປ່ຽນວ່າໃຊ້ຈ່າຍໄດ້ເທົ່າໃດເພື່ອດຶງດູດເຂົາ$$, 'body', $$ການຮູ້ມູນຄ່າຕະຫຼອດຊີວິດ ບອກວ່າໃຊ້ຈ່າຍທາງການຕະຫຼາດ ຫຼືສ່ວນຫຼຸດເທົ່າໃດຈຶ່ງສົມເຫດສົມຜົນ ເພື່ອດຶງດູດລູກຄ້າພັກດີໜຶ່ງຄົນ.$$),
      jsonb_build_object('heading', $$ລົງທຶນຕາມນັ້ນໃນການຮັກສາລູກຄ້າ$$, 'body', $$ເມື່ອເຫັນມູນຄ່າໄລຍະຍາວແທ້ ການໃຊ້ຈ່າຍເພີ່ມໜ້ອຍໜຶ່ງກັບການບໍລິການ ຫຼືການຕິດຕາມເພື່ອຮັກສາລູກຄ້າ ມັກຄຸ້ມຄ່າຫຼາຍເທົ່າ.$$)
    ),
    array[$$Estimate a customer's total value over time, not just one sale$$, $$Use that number to decide reasonable acquisition spending$$, $$Invest in retention once you see the real long-term value$$],
    array[$$ປະມານມູນຄ່າລູກຄ້າຕະຫຼອດເວລາ ບໍ່ແມ່ນແຕ່ການຂາຍຄັ້ງດຽວ$$, $$ໃຊ້ຕົວເລກນັ້ນຕັດສິນການໃຊ້ຈ່າຍດຶງດູດລູກຄ້າທີ່ສົມເຫດສົມຜົນ$$, $$ລົງທຶນໃນການຮັກສາລູກຄ້າເມື່ອເຫັນມູນຄ່າໄລຍະຍາວແທ້$$],
    4, false, 67
  ),
  (
    $$avoid-over-diversifying-too-early$$,
    $$Avoid over-diversifying too early in your business$$,
    $$ຫຼີກລ້ຽງການແຕກຫຼາຍສາຍທຸລະກິດໄວເກີນໄປ$$,
    $$Adding too many products or services before mastering one often dilutes quality and focus.$$,
    $$ການເພີ່ມຜະລິດຕະພັນ ຫຼືບໍລິການຫຼາຍເກີນໄປ ກ່ອນເກັ່ງອັນດຽວ ມັກເຮັດໃຫ້ຄຸນນະພາບ ແລະ ຈຸດສຸມຈາງລົງ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Master one offer before adding another$$, 'body', $$Get your core product truly excellent and reliably profitable before spreading attention across new lines.$$),
      jsonb_build_object('heading', $$Watch for signs you're spreading too thin$$, 'body', $$Slower response times, inconsistent quality, or constant scrambling are signs you've added too much too soon.$$),
      jsonb_build_object('heading', $$Add new offers based on real customer requests$$, 'body', $$Let genuine, repeated customer demand guide expansion, rather than adding things because they seem interesting to you.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ເກັ່ງອັນດຽວກ່ອນເພີ່ມອັນອື່ນ$$, 'body', $$ໃຫ້ຜະລິດຕະພັນຫຼັກຂອງທ່ານດີເລີດ ແລະ ມີກຳໄລແທ້ ກ່ອນແບ່ງຄວາມສົນໃຈໄປສາຍໃໝ່.$$),
      jsonb_build_object('heading', $$ຈັບຕາສັນຍານວ່າແບ່ງບາງເກີນໄປ$$, 'body', $$ການຕອບຊ້າລົງ, ຄຸນນະພາບບໍ່ຄົງທີ່ ຫຼືຄວາມວຸ້ນວາຍຕະຫຼອດ ເປັນສັນຍານວ່າເພີ່ມຫຼາຍເກີນໄວ.$$),
      jsonb_build_object('heading', $$ເພີ່ມສິ່ງໃໝ່ຕາມຄຳຂໍລູກຄ້າຈິງ$$, 'body', $$ໃຫ້ຄວາມຕ້ອງການລູກຄ້າຈິງ ແລະ ຊ້ຳໆ ນຳທາງການຂະຫຍາຍ ແທນທີ່ຈະເພີ່ມເພາະຮູ້ສຶກໜ້າສົນໃຈຕໍ່ຕົນເອງ.$$)
    ),
    array[$$Master your core offer before adding new product lines$$, $$Watch for signs you're spreading attention too thin$$, $$Let real, repeated customer requests guide expansion$$],
    array[$$ເກັ່ງຜະລິດຕະພັນຫຼັກກ່ອນເພີ່ມສາຍໃໝ່$$, $$ຈັບຕາສັນຍານວ່າກຳລັງແບ່ງຄວາມສົນໃຈບາງເກີນໄປ$$, $$ໃຫ້ຄຳຂໍລູກຄ້າຈິງ ແລະ ຊ້ຳໆນຳທາງການຂະຫຍາຍ$$],
    4, false, 68
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, is_preview, sort_order
)
where premium_learning_categories.slug = 'business-ideas'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';
