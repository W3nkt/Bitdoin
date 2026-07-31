-- Six new Money-lessons entries distilling verified, publicly documented money
-- habits and decisions from well-known entrepreneurs: Jim Rohn, Robert Kiyosaki,
-- Jack Ma, Bill Gates, Mark Zuckerberg, and Elon Musk. Facts were checked
-- against reputable reporting before writing; the well-known "11 Rules of Life"
-- text sometimes attributed to Bill Gates was deliberately excluded because it
-- is a documented misattribution (it originates with Charles J. Sykes).

insert into public.premium_lessons (
  category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, source_url, source_verified_at,
  is_preview, status, published_at, sort_order
)
select id, v.slug, v.title_en, v.title_lo, v.summary_en, v.summary_lo, v.content_en, v.content_lo,
  v.key_takeaways_en, v.key_takeaways_lo, v.estimated_minutes, 'LESSON', v.source_url,
  case when v.source_url is not null then now() else null end,
  v.is_preview, 'PUBLISHED', now(), v.sort_order
from public.premium_learning_categories, lateral (values
  (
    'jim-rohn-profits-not-wages',
    'Jim Rohn: chase profits, not just wages',
    'Jim Rohn: ໄລ່ຫາກຳໄລ ບໍ່ແມ່ນແຕ່ຄ່າຈ້າງ',
    $$A mentor's core lesson: a wage funds your life, but something you build or own is what can fund your future.$$,
    $$ບົດຮຽນຫຼັກດ້ານການເງິນຈາກອາຈານຂອງ Rohn: ຄ່າຈ້າງລ້ຽງຊີວິດປະຈຳວັນ ແຕ່ສິ່ງທີ່ທ່ານສ້າງ ຫຼື ເປັນເຈົ້າຂອງຕ່າງຫາກ ທີ່ຈະສ້າງອະນາຄົດ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Wages make a living, profits make a fortune$$, 'body', $$Rohn often repeated advice his own mentor gave him: wages pay for today, but profits — the value you build and own — are what create real wealth over time. A fixed wage caps your income at the hours you can work. Owning something of value — a skill you sell directly, a small side business, a product — lets your effort compound beyond the hours you put in.$$),
      jsonb_build_object('heading', $$Invest in yourself before anything else$$, 'body', $$Rohn's most repeated idea was that formal education gets you a job, but continuing to teach yourself — reading, practicing a skill, studying people who are ahead of you — is what actually raises your earning ceiling over a lifetime. Treat learning as a recurring expense you budget for, not a one-time step you finish at graduation.$$),
      jsonb_build_object('heading', $$Manage small amounts before asking for large ones$$, 'body', $$Rohn argued that discipline with money is a habit you prove on a small scale first. If part-time income or a small allowance disappears without a trace each month, a bigger income will disappear the same way, just faster. Track where your money actually goes for one month before deciding you need to earn more.$$),
      jsonb_build_object('heading', $$Your circle shapes your habits$$, 'body', $$Rohn is widely known for the idea that we tend to become like the people we spend the most time with — including their spending habits, risk tolerance, and beliefs about money. If your closest circle treats debt casually or never discusses saving, it takes deliberate effort to build different habits. Seek out at least one person whose money discipline you respect, and pay attention to how they actually behave, not just what they say.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຄ່າຈ້າງລ້ຽງຊີວິດ, ກຳໄລສ້າງຄວາມຮັ່ງມີ$$, 'body', $$Rohn ມັກເລົ່າຄຳແນະນຳທີ່ອາຈານຂອງລາວເອງເຄີຍບອກ: ຄ່າຈ້າງຈ່າຍໃຫ້ມື້ນີ້ ແຕ່ກຳໄລ — ມູນຄ່າທີ່ທ່ານສ້າງ ແລະ ເປັນເຈົ້າຂອງ — ຕ່າງຫາກທີ່ສ້າງຄວາມຮັ່ງມີແທ້ໆໃນໄລຍະຍາວ. ຄ່າຈ້າງທີ່ຄົງທີ່ຈຳກັດລາຍໄດ້ຂອງທ່ານໄວ້ເທົ່າກັບຊົ່ວໂມງທີ່ທ່ານເຮັດວຽກໄດ້. ແຕ່ການເປັນເຈົ້າຂອງບາງສິ່ງທີ່ມີມູນຄ່າ — ທັກສະທີ່ທ່ານຂາຍໄດ້ໂດຍກົງ, ທຸລະກິດນ້ອຍໆ ຫຼື ຜະລິດຕະພັນ — ຊ່ວຍໃຫ້ຄວາມພະຍາຍາມຂອງທ່ານເຕີບໂຕໄດ້ເກີນກວ່າຈຳນວນຊົ່ວໂມງທີ່ລົງແຮງໄປ.$$),
      jsonb_build_object('heading', $$ລົງທຶນໃສ່ຕົນເອງກ່ອນສິ່ງອື່ນ$$, 'body', $$ແນວຄິດທີ່ Rohn ເວົ້າເລື້ອຍທີ່ສຸດ ຄື ການສຶກສາໃນລະບົບຊ່ວຍໃຫ້ໄດ້ວຽກ ແຕ່ການສືບຕໍ່ສອນຕົນເອງ — ອ່ານປຶ້ມ, ຝຶກທັກສະ, ສຶກສາຄົນທີ່ກ້າວໜ້າກວ່າທ່ານ — ຕ່າງຫາກທີ່ຍົກລະດັບເພດານລາຍໄດ້ຕະຫຼອດຊີວິດ. ໃຫ້ຖືວ່າການຮຽນຮູ້ແມ່ນລາຍຈ່າຍທີ່ຕ້ອງມີຢູ່ສະເໝີ ບໍ່ແມ່ນຂັ້ນຕອນດຽວທີ່ຈົບລົງເມື່ອຮຽນຈົບ.$$),
      jsonb_build_object('heading', $$ບໍລິຫານເງິນຈຳນວນນ້ອຍໃຫ້ໄດ້ກ່ອນຂໍຈຳນວນໃຫຍ່$$, 'body', $$Rohn ໂຕ້ແຍ້ງວ່າວິໄນທາງການເງິນ ແມ່ນນິໄສທີ່ຕ້ອງພິສູດຈາກຂະໜາດນ້ອຍກ່ອນ. ຖ້າລາຍໄດ້ພາທ໌ໄທມ໌ ຫຼື ເງິນຈຳນວນນ້ອຍໆຫາຍໄປໂດຍບໍ່ຮູ້ຮ່ອງຮອຍທຸກເດືອນ ລາຍໄດ້ທີ່ໃຫຍ່ຂຶ້ນກໍ່ຈະຫາຍໄປແບບດຽວກັນ ພຽງແຕ່ໄວກວ່າ. ຕິດຕາມວ່າເງິນຂອງທ່ານໄປໃສແທ້ໆເປັນເວລາໜຶ່ງເດືອນ ກ່ອນຕັດສິນໃຈວ່າຕ້ອງຫາເງິນເພີ່ມ.$$),
      jsonb_build_object('heading', $$ຄົນອ້ອມຂ້າງກຳນົດນິໄສຂອງທ່ານ$$, 'body', $$Rohn ເປັນທີ່ຮູ້ຈັກກັບແນວຄິດວ່າ ເຮົາມັກກາຍເປັນຄືກັບຄົນທີ່ເຮົາໃຊ້ເວລາຢູ່ນຳຫຼາຍທີ່ສຸດ — ລວມທັງນິໄສການໃຊ້ຈ່າຍ, ຄວາມກ້າສ່ຽງ ແລະ ຄວາມເຊື່ອກ່ຽວກັບເງິນຂອງເຂົາເຈົ້າ. ຖ້າຄົນອ້ອມຂ້າງທ່ານປະຕິບັດຕໍ່ໜີ້ສິນແບບບໍ່ຈິງຈັງ ຫຼື ບໍ່ເຄີຍລົມກ່ຽວກັບການອອມ ຕ້ອງໃຊ້ຄວາມພະຍາຍາມຕັ້ງໃຈເພື່ອສ້າງນິໄສທີ່ຕ່າງອອກໄປ. ຊອກຫາຢ່າງໜ້ອຍໜຶ່ງຄົນທີ່ທ່ານນັບຖືວິໄນທາງການເງິນຂອງເຂົາ ແລະ ສັງເກດວ່າເຂົາປະຕິບັດແທ້ໆແນວໃດ ບໍ່ແມ່ນແຕ່ຟັງຄຳເວົ້າ.$$)
    ),
    array[$$A wage is capped by your hours; something you build or own is not$$, $$Keep learning — it is the asset behind every raise and opportunity$$, $$Prove you can manage small money before expecting to manage more$$],
    array[$$ຄ່າຈ້າງຖືກຈຳກັດດ້ວຍຊົ່ວໂມງເຮັດວຽກ ແຕ່ສິ່ງທີ່ທ່ານສ້າງ ຫຼື ເປັນເຈົ້າຂອງບໍ່ຖືກຈຳກັດ$$, $$ຮຽນຮູ້ຢ່າງຕໍ່ເນື່ອງ — ມັນຄືຊັບສິນເບື້ອງຫຼັງທຸກການຂຶ້ນເງິນເດືອນ ແລະ ໂອກາດ$$, $$ພິສູດວ່າບໍລິຫານເງິນນ້ອຍໄດ້ ກ່ອນຄາດຫວັງບໍລິຫານເງິນຫຼາຍ$$],
    7, $$https://www.jimrohn.com/wisdom/quotes/profits-better-than-wages$$, true, 2
  ),
  (
    'kiyosaki-assets-vs-liabilities',
    'Robert Kiyosaki: know the difference between an asset and a liability',
    'Robert Kiyosaki: ຮູ້ຄວາມແຕກຕ່າງລະຫວ່າງຊັບສິນ ແລະ ໜີ້ສິນ',
    $$The core idea behind Rich Dad Poor Dad, in practice: sort every purchase by whether it puts money in your pocket or takes it out.$$,
    $$ແນວຄິດຫຼັກຂອງປຶ້ມ Rich Dad Poor Dad ໃນທາງປະຕິບັດ: ຈັດປະເພດທຸກການຊື້ວ່າມັນເອົາເງິນເຂົ້າ ຫຼື ອອກຈາກກະເປົາຂອງທ່ານ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$An asset puts money in your pocket; a liability takes it out$$, 'body', $$Kiyosaki's central definition is simple on paper and uncomfortable in practice: an asset is something that puts money in your pocket whether or not you keep working, and a liability is something that takes money out of your pocket every month. Many purchases that look like signs of success — a bigger house payment, a newer car — are liabilities by this definition, because they cost money to hold rather than generate it.$$),
      jsonb_build_object('heading', $$Pay yourself first, then cover the rest$$, 'body', $$Rather than paying every bill and spending on wants first, then saving whatever happens to be left, Kiyosaki argues for setting aside savings or investment money the moment income arrives, before other spending decisions get the chance to consume it.$$),
      jsonb_build_object('heading', $$Financial literacy is a skill, not a personality trait$$, 'body', $$Kiyosaki's repeated argument is that school teaches people how to work for money, but rarely teaches how money itself works — reading a basic income statement, understanding what makes something an asset, or knowing the difference between good and bad debt. He treats this as a learnable skill, not something only certain people are naturally good at.$$),
      jsonb_build_object('heading', $$Apply the ideas, but respect the risk$$, 'body', $$Kiyosaki's later advice — including using debt to acquire income-generating assets like rental property — assumes real capital, market knowledge, and tolerance for risk that a beginner usually does not yet have. Start with the asset-versus-liability habit on a small scale before taking on debt-funded strategies; the sorting habit is useful immediately, the leverage strategies are not for everyone.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຊັບສິນເອົາເງິນເຂົ້າກະເປົາ; ໜີ້ສິນເອົາເງິນອອກ$$, 'body', $$ນິຍາມຫຼັກຂອງ Kiyosaki ງ່າຍໃນທາງທິດສະດີ ແຕ່ບໍ່ສະບາຍໃນທາງປະຕິບັດ: ຊັບສິນ ຄື ສິ່ງທີ່ເອົາເງິນເຂົ້າກະເປົາຂອງທ່ານ ບໍ່ວ່າທ່ານຈະເຮັດວຽກຢູ່ ຫຼື ບໍ່ ແລະ ໜີ້ສິນ ຄື ສິ່ງທີ່ເອົາເງິນອອກຈາກກະເປົາຂອງທ່ານທຸກເດືອນ. ການຊື້ຫຼາຍຢ່າງທີ່ເບິ່ງຄືສັນຍານຂອງຄວາມສຳເລັດ — ຄ່າຜ່ອນເຮືອນທີ່ໃຫຍ່ຂຶ້ນ, ລົດຄັນໃໝ່ — ຕາມນິຍາມນີ້ ຄືໜີ້ສິນ ເພາະມັນເສຍຄ່າໃນການຮັກສາໄວ້ ບໍ່ແມ່ນສ້າງລາຍໄດ້.$$),
      jsonb_build_object('heading', $$ຈ່າຍໃຫ້ຕົນເອງກ່ອນ ແລ້ວຈຶ່ງຈັດການສ່ວນທີ່ເຫຼືອ$$, 'body', $$ແທນທີ່ຈະຈ່າຍທຸກໃບບິນ ແລະ ໃຊ້ຈ່າຍຕາມຄວາມຢາກກ່ອນ ແລ້ວອອມສ່ວນທີ່ເຫຼືອ (ຖ້າມີ) Kiyosaki ໂຕ້ແຍ້ງໃຫ້ກັນເງິນອອມ ຫຼື ເງິນລົງທຶນໄວ້ທັນທີທີ່ລາຍໄດ້ເຂົ້າມາ ກ່ອນທີ່ການຕັດສິນໃຈໃຊ້ຈ່າຍອື່ນຈະມີໂອກາດກືນມັນໄປ.$$),
      jsonb_build_object('heading', $$ຄວາມຮູ້ດ້ານການເງິນເປັນທັກສະ ບໍ່ແມ່ນນິໄສປະຈຳຕົວ$$, 'body', $$Kiyosaki ໂຕ້ແຍ້ງຊ້ຳໆວ່າ ໂຮງຮຽນສອນໃຫ້ຄົນເຮັດວຽກເພື່ອເງິນ ແຕ່ບໍ່ຄ່ອຍສອນວ່າເງິນເຮັດວຽກແນວໃດ — ການອ່ານງົບການເງິນພື້ນຖານ, ຄວາມເຂົ້າໃຈວ່າຫຍັງເປັນຊັບສິນ ຫຼື ຄວາມແຕກຕ່າງລະຫວ່າງໜີ້ສິນທີ່ດີ ແລະ ບໍ່ດີ. ລາວຖືວ່ານີ້ແມ່ນທັກສະທີ່ຮຽນຮູ້ໄດ້ ບໍ່ແມ່ນສິ່ງທີ່ບາງຄົນເກັ່ງມາແຕ່ກຳເນີດ.$$),
      jsonb_build_object('heading', $$ນຳໃຊ້ແນວຄິດ ແຕ່ເຄົາລົບຄວາມສ່ຽງ$$, 'body', $$ຄຳແນະນຳຕໍ່ມາຂອງ Kiyosaki — ລວມທັງການໃຊ້ໜີ້ສິນເພື່ອຊື້ຊັບສິນທີ່ສ້າງລາຍໄດ້ ເຊັ່ນ ອະສັງຫາລິມະຊັບໃຫ້ເຊົ່າ — ສົມມຸດວ່າມີທຶນ, ຄວາມຮູ້ດ້ານຕະຫຼາດ ແລະ ຄວາມທົນທານຕໍ່ຄວາມສ່ຽງທີ່ຄົນເລີ່ມຕົ້ນສ່ວນຫຼາຍຍັງບໍ່ມີ. ເລີ່ມຈາກນິໄສການແຍກຊັບສິນ-ໜີ້ສິນໃນຂະໜາດນ້ອຍກ່ອນ ກ່ອນຈະນຳໃຊ້ຍຸດທະສາດທີ່ອີງໃສ່ໜີ້ສິນ; ນິໄສການແຍກປະເພດເປັນປະໂຫຍດໄດ້ທັນທີ ແຕ່ຍຸດທະສາດແບບໃຊ້ໜີ້ສິນຄ້ຳປະກັນ ບໍ່ເໝາະສົມກັບທຸກຄົນ.$$)
    ),
    array[$$An asset puts money in your pocket; a liability takes money out — sort your own purchases honestly$$, $$Set aside savings the moment income arrives, before spending decisions use it up$$, $$Financial literacy is a skill you build through practice, not a trait you're born with$$],
    array[$$ຊັບສິນເອົາເງິນເຂົ້າກະເປົາ; ໜີ້ສິນເອົາເງິນອອກ — ຈັດປະເພດການຊື້ຂອງທ່ານຢ່າງຊື່ສັດ$$, $$ກັນເງິນອອມໄວ້ທັນທີທີ່ລາຍໄດ້ເຂົ້າມາ ກ່ອນການໃຊ້ຈ່າຍຈະກືນມັນໄປ$$, $$ຄວາມຮູ້ດ້ານການເງິນເປັນທັກສະທີ່ສ້າງໄດ້ດ້ວຍການຝຶກຝົນ ບໍ່ແມ່ນລັກສະນະທີ່ຕິດຕົວມາແຕ່ເກີດ$$],
    7, $$https://www.richdad.com$$, false, 3
  ),
  (
    'jack-ma-customers-first-persistence',
    'Jack Ma: build value for others first, treat rejection as normal',
    'Jack Ma: ສ້າງມູນຄ່າໃຫ້ຄົນອື່ນກ່ອນ ຖືການຖືກປະຕິເສດເປັນເລື່ອງທຳມະດາ',
    $$Before Alibaba, Jack Ma collected years of rejections. His money philosophy starts with who you serve, not what you earn.$$,
    $$ກ່ອນມາເປັນ Alibaba, Jack Ma ຖືກປະຕິເສດຫຼາຍປີ. ປັດຊະຍາການເງິນຂອງລາວເລີ່ມຈາກ 'ຮັບໃຊ້ໃຜ' ບໍ່ແມ່ນ 'ຫາໄດ້ເທົ່າໃດ'.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Customers first, employees second, shareholders third$$, 'body', $$In a letter to investors ahead of Alibaba's IPO, Ma spelled out the company's order of priorities explicitly: customers first, employees second, shareholders third. His reasoning, given in interviews, was direct — if the customer is genuinely served well, the business does well, and the people who invested in it do well too. Applied personally, the lesson is to build real value for whoever is paying you before optimizing for your own payout; the payout follows the value, not the other way around.$$),
      jsonb_build_object('heading', $$Rejection is data, not a verdict$$, 'body', $$Before Alibaba, Ma was rejected from dozens of jobs, including a well-known rejection from a local KFC where every other applicant from the same batch of candidates was hired except him. He continued applying and building anyway. For anyone trying to build an income stream — a side business, a client base, a new skill — early rejection is closer to the normal cost of starting than proof the idea is wrong.$$),
      jsonb_build_object('heading', $$Real businesses take years, not weeks$$, 'body', $$Alibaba operated for years before it became reliably profitable, absorbing losses while it built out its platform and user base. Ma's public statements consistently frame this as expected, not a warning sign. Anyone building a real income source — as opposed to chasing a quick win — should budget years of patience, not weeks, before judging whether it is working.$$),
      jsonb_build_object('heading', $$Keep learning; do not just complain$$, 'body', $$A consistent thread across Ma's public talks is that setbacks are treated as material to learn from and adjust to, rather than as a reason to stop or blame external circumstances. Applied to money specifically: when a plan, a job search, or a small business does not work the first time, the more useful next step is usually to study what happened and adjust than to simply repeat it and hope for a different result.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລູກຄ້າກ່ອນ, ພະນັກງານທີສອງ, ຜູ້ຖືຮຸ້ນທີສາມ$$, 'body', $$ໃນຈົດໝາຍເຖິງນັກລົງທຶນກ່ອນ Alibaba ຈະເຂົ້າຕະຫຼາດຫຼັກຊັບ Ma ໄດ້ລະບຸລຳດັບຄວາມສຳຄັນຂອງບໍລິສັດຢ່າງຊັດເຈນ: ລູກຄ້າກ່ອນ, ພະນັກງານທີສອງ, ຜູ້ຖືຮຸ້ນທີສາມ. ເຫດຜົນທີ່ລາວໃຫ້ໄວ້ໃນການສຳພາດແມ່ນກົງໄປກົງມາ — ຖ້າລູກຄ້າໄດ້ຮັບການບໍລິການທີ່ດີແທ້ໆ ທຸລະກິດກໍ່ຈະດີ ແລະ ຄົນທີ່ລົງທຶນໃນນັ້ນກໍ່ຈະໄດ້ຮັບຜົນດີນຳ. ນຳໃຊ້ໃນລະດັບບຸກຄົນ ບົດຮຽນຄື ໃຫ້ສ້າງມູນຄ່າແທ້ໆໃຫ້ຄົນທີ່ຈ່າຍເງິນໃຫ້ທ່ານກ່ອນ ຈະຄິດເລື່ອງຜົນຕອບແທນຂອງຕົນເອງ; ຜົນຕອບແທນຈະຕາມມູນຄ່າມາ ບໍ່ແມ່ນກັບກັນ.$$),
      jsonb_build_object('heading', $$ການຖືກປະຕິເສດແມ່ນຂໍ້ມູນ ບໍ່ແມ່ນຄຳຕັດສິນ$$, 'body', $$ກ່ອນ Alibaba, Ma ຖືກປະຕິເສດຈາກວຽກຫຼາຍສິບບ່ອນ ລວມທັງເລື່ອງທີ່ຮູ້ຈັກກັນດີ ຄືການສະໝັກວຽກຮ້ານ KFC ໃນທ້ອງຖິ່ນ ຊຶ່ງທຸກຄົນທີ່ສະໝັກໃນຊຸດດຽວກັນຖືກຮັບ ຍົກເວັ້ນລາວ. ລາວກໍ່ຍັງສືບຕໍ່ສະໝັກ ແລະ ສ້າງຕໍ່ໄປ. ສຳລັບໃຜກໍ່ຕາມທີ່ພະຍາຍາມສ້າງແຫຼ່ງລາຍໄດ້ — ທຸລະກິດຂ້າງ, ຖານລູກຄ້າ, ຫຼື ທັກສະໃໝ່ — ການຖືກປະຕິເສດໃນຊ່ວງຕົ້ນ ໃກ້ຄຽງກັບຄ່າໃຊ້ຈ່າຍປົກກະຕິຂອງການເລີ່ມຕົ້ນ ຫຼາຍກວ່າຈະເປັນຫຼັກຖານວ່າແນວຄິດຜິດ.$$),
      jsonb_build_object('heading', $$ທຸລະກິດແທ້ໆໃຊ້ເວລາເປັນປີ ບໍ່ແມ່ນອາທິດ$$, 'body', $$Alibaba ດຳເນີນງານຫຼາຍປີກ່ອນຈະມີກຳໄລຢ່າງໝັ້ນຄົງ ໂດຍຮັບເອົາການຂາດທຶນໄວ້ ໃນຂະນະທີ່ສ້າງແພລດຟອມ ແລະ ຖານຜູ້ໃຊ້. ຄຳເວົ້າຂອງ Ma ຕໍ່ສາທາລະນະ ໄດ້ອະທິບາຍເລື່ອງນີ້ວ່າເປັນສິ່ງທີ່ຄາດໄວ້ແລ້ວ ບໍ່ແມ່ນສັນຍານອັນຕະລາຍ. ໃຜກໍ່ຕາມທີ່ສ້າງແຫຼ່ງລາຍໄດ້ແທ້ໆ — ບໍ່ແມ່ນໄລ່ຫາຄວາມສຳເລັດໄວໆ — ຄວນຈັດສັນຄວາມອົດທົນເປັນປີ ບໍ່ແມ່ນອາທິດ ກ່ອນຕັດສິນວ່າມັນໄດ້ຜົນຫຼືບໍ່.$$),
      jsonb_build_object('heading', $$ຮຽນຮູ້ຕໍ່ໄປ; ຢ່າພຽງແຕ່ຈົ່ມ$$, 'body', $$ຫົວຂໍ້ໜຶ່ງທີ່ພົບເລື້ອຍໆໃນການເວົ້າຕໍ່ສາທາລະນະຂອງ Ma ຄື ອຸປະສັກຖືກນຳມາເປັນບົດຮຽນເພື່ອປັບຕົວ ບໍ່ແມ່ນເຫດຜົນທີ່ຈະຢຸດ ຫຼື ໂທດສະຖານະການພາຍນອກ. ນຳໃຊ້ກັບເລື່ອງເງິນໂດຍສະເພາະ: ເມື່ອແຜນການ, ການຊອກຫາວຽກ ຫຼື ທຸລະກິດນ້ອຍບໍ່ໄດ້ຜົນໃນຄັ້ງທຳອິດ ຂັ້ນຕອນຕໍ່ໄປທີ່ເປັນປະໂຫຍດກວ່າ ມັກຈະແມ່ນການສຶກສາວ່າເກີດຫຍັງຂຶ້ນ ແລະ ປັບປຸງ ບໍ່ແມ່ນເຮັດຊ້ຳແບບເກົ່າ ແລ້ວຫວັງຜົນທີ່ຕ່າງອອກໄປ.$$)
    ),
    array[$$Build genuine value for whoever pays you first — the income follows the value$$, $$Treat early rejection as the normal cost of starting, not a verdict$$, $$Give a real income plan years of patience before judging it, not weeks$$],
    array[$$ສ້າງມູນຄ່າແທ້ໆໃຫ້ຄົນທີ່ຈ່າຍເງິນໃຫ້ທ່ານກ່ອນ — ລາຍໄດ້ຈະຕາມມູນຄ່າມາ$$, $$ຖືການຖືກປະຕິເສດຊ່ວງຕົ້ນເປັນຄ່າໃຊ້ຈ່າຍປົກກະຕິຂອງການເລີ່ມຕົ້ນ ບໍ່ແມ່ນຄຳຕັດສິນ$$, $$ໃຫ້ຄວາມອົດທົນເປັນປີແກ່ແຜນລາຍໄດ້ແທ້ໆ ກ່ອນຕັດສິນວ່າມັນໄດ້ຜົນ$$],
    6, $$https://finance.yahoo.com/news/10-times-jack-ma-said-133239879.html$$, false, 4
  ),
  (
    'bill-gates-reinvest-and-give-back',
    'Bill Gates: reinvest first, then give back on purpose',
    'Bill Gates: ລົງທຶນຄືນກ່ອນ ແລ້ວຈຶ່ງໃຫ້ຄືນຢ່າງມີເປົ້າໝາຍ',
    $$Long before the Giving Pledge, Gates kept Microsoft frugal and reinvested profits for two decades. Both habits scale down to a personal budget.$$,
    $$ດົນນານກ່ອນ Giving Pledge, Gates ຮັກສາ Microsoft ໃຫ້ປະຢັດ ແລະ ລົງທຶນກຳໄລຄືນເປັນເວລາສອງທົດສະວັດ. ທັງສອງນິໄສນຳໃຊ້ໄດ້ກັບງົບປະມານສ່ວນຕົວເຊັ່ນກັນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Keep a safety runway before you need it$$, 'body', $$Gates has said that even in Microsoft's early growing years, he wanted enough cash in the bank to cover a full year of payroll even if no new revenue came in at all — and stuck to that discipline for most of the company's history. The personal version: build a reserve that could cover essential costs for months, not just weeks, before treating extra income as spare cash.$$),
      jsonb_build_object('heading', $$Reinvest before you reward yourself$$, 'body', $$Microsoft did not pay its shareholders a dividend for roughly its first two decades as a public company, choosing instead to plow profits back into research, development, and acquisitions while the business was still growing fast. The lesson scales down directly: early income from a new skill or side effort is often more valuable reinvested — in tools, training, or the business itself — than spent on lifestyle upgrades.$$),
      jsonb_build_object('heading', $$Stay frugal past the point you need to$$, 'body', $$Reports from people who knew him describe Gates wearing an inexpensive watch and waiting until Microsoft's success was well established before buying his first Porsche — modest personal spending habits that persisted well past the point they were financially necessary. Lifestyle spending that grows in step with every raise leaves nothing left over to reinvest or save.$$),
      jsonb_build_object('heading', $$Decide what you'll give back before you're forced to decide$$, 'body', $$In 2010, Gates and Warren Buffett launched the Giving Pledge, publicly committing to give away the majority of their wealth rather than pass it down or spend it — a decision made deliberately, years before most of that wealth existed. Applied at any income level: deciding in advance what portion of future income you'll set aside or give away is easier to actually follow through on than deciding only after the money has already arrived.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຮັກສາທຶນສະສົມໄວ້ກ່ອນທີ່ຈະຕ້ອງການມັນ$$, 'body', $$Gates ເຄີຍເວົ້າວ່າ ແມ່ນແຕ່ໃນຊ່ວງເຕີບໂຕໄວຂອງ Microsoft ລາວຢາກມີເງິນສົດພຽງພໍໃນທະນາຄານ ເພື່ອຈ່າຍເງິນເດືອນພະນັກງານໄດ້ໜຶ່ງປີເຕັມ ແມ່ນວ່າຈະບໍ່ມີລາຍຮັບເຂົ້າມາເລີຍ — ແລະ ຮັກສາວິໄນນີ້ໄວ້ຕະຫຼອດປະຫວັດສ່ວນໃຫຍ່ຂອງບໍລິສັດ. ໃນລະດັບບຸກຄົນ: ສ້າງທຶນສະສົມທີ່ຄຸ້ມຄ່າໃຊ້ຈ່າຍຈຳເປັນໄດ້ເປັນເດືອນ ບໍ່ແມ່ນແຕ່ອາທິດ ກ່ອນຈະຖືວ່າລາຍໄດ້ພິເສດເປັນເງິນສ່ວນເກີນ.$$),
      jsonb_build_object('heading', $$ລົງທຶນຄືນກ່ອນໃຫ້ລາງວັນຕົນເອງ$$, 'body', $$Microsoft ບໍ່ໄດ້ຈ່າຍເງິນປັນຜົນໃຫ້ຜູ້ຖືຮຸ້ນເປັນເວລາປະມານສອງທົດສະວັດທຳອິດຫຼັງເຂົ້າຕະຫຼາດຫຼັກຊັບ ໂດຍເລືອກລົງທຶນກຳໄລຄືນສູ່ການຄົ້ນຄວ້າ, ພັດທະນາ ແລະ ການຊື້ກິດຈະການ ໃນຂະນະທີ່ທຸລະກິດຍັງເຕີບໂຕໄວ. ບົດຮຽນນຳໃຊ້ໄດ້ໂດຍກົງ: ລາຍໄດ້ຕົ້ນໆຈາກທັກສະໃໝ່ ຫຼື ວຽກເສີມ ມັກມີຄຸນຄ່າຫຼາຍກວ່າຖ້າລົງທຶນຄືນ — ໃສ່ເຄື່ອງມື, ການຝຶກອົບຮົມ ຫຼື ທຸລະກິດເອງ — ຫຼາຍກວ່າໃຊ້ຍົກລະດັບຄວາມເປັນຢູ່.$$),
      jsonb_build_object('heading', $$ຮັກສາຄວາມປະຢັດແມ່ນວ່າຈະບໍ່ຈຳເປັນແລ້ວກໍ່ຕາມ$$, 'body', $$ຄົນທີ່ຮູ້ຈັກ Gates ເລົ່າວ່າ ລາວໃສ່ໂມງທີ່ລາຄາບໍ່ແພງ ແລະ ລໍຖ້າຈົນ Microsoft ປະສົບຄວາມສຳເລັດຢ່າງແທ້ຈິງກ່ອນຈະຊື້ລົດ Porsche ຄັນທຳອິດ — ນິໄສການໃຊ້ຈ່າຍສ່ວນຕົວແບບປະຢັດທີ່ຄົງຢູ່ດົນກວ່າຈຸດທີ່ຈຳເປັນທາງການເງິນ. ການໃຊ້ຈ່າຍທີ່ເພີ່ມຂຶ້ນທຸກຄັ້ງທີ່ໄດ້ຂຶ້ນເງິນເດືອນ ຈະບໍ່ເຫຼືອຫຍັງໄວ້ລົງທຶນ ຫຼື ອອມ.$$),
      jsonb_build_object('heading', $$ຕັດສິນໃຈວ່າຈະໃຫ້ຄືນເທົ່າໃດ ກ່ອນຖືກບັງຄັບໃຫ້ຕັດສິນໃຈ$$, 'body', $$ໃນປີ 2010, Gates ແລະ Warren Buffett ໄດ້ເປີດຕົວ Giving Pledge, ໃຫ້ຄຳໝັ້ນສັນຍາຕໍ່ສາທາລະນະວ່າຈະໃຫ້ຊັບສົມບັດສ່ວນໃຫຍ່ຂອງເຂົາເຈົ້າ ແທນທີ່ຈະສົ່ງຕໍ່ ຫຼື ໃຊ້ຈ່າຍ — ການຕັດສິນໃຈທີ່ເຮັດຢ່າງຕັ້ງໃຈ ຫຼາຍປີກ່ອນຊັບສົມບັດສ່ວນໃຫຍ່ນັ້ນຈະເກີດຂຶ້ນນຳຊ້ຳ. ນຳໃຊ້ໄດ້ໃນທຸກລະດັບລາຍໄດ້: ການຕັດສິນໃຈລ່ວງໜ້າວ່າຈະກັນ ຫຼື ໃຫ້ຄືນເທົ່າໃດຂອງລາຍໄດ້ໃນອະນາຄົດ ງ່າຍທີ່ຈະປະຕິບັດຕາມແທ້ໆ ຫຼາຍກວ່າການຕັດສິນໃຈຫຼັງເງິນມາເຖິງແລ້ວ.$$)
    ),
    array[$$Keep a reserve that covers real costs for months, not weeks, before spending extra income freely$$, $$Reinvest early profits into growth before upgrading your lifestyle$$, $$Decide your saving and giving targets in advance, before the money is already spent$$],
    array[$$ຮັກສາທຶນສະສົມທີ່ຄຸ້ມຄ່າໃຊ້ຈ່າຍຈິງໄດ້ເປັນເດືອນ ກ່ອນໃຊ້ຈ່າຍລາຍໄດ້ພິເສດຢ່າງອິດສະຫຼະ$$, $$ລົງທຶນກຳໄລຕົ້ນໆຄືນສູ່ການເຕີບໂຕ ກ່ອນຍົກລະດັບຄວາມເປັນຢູ່$$, $$ຕັດສິນໃຈເປົ້າໝາຍການອອມ ແລະ ການໃຫ້ຄືນລ່ວງໜ້າ ກ່ອນເງິນຈະຖືກໃຊ້ໝົດໄປແລ້ວ$$],
    7, $$https://www.givingpledge.org/pledger/bill-gates/$$, false, 5
  ),
  (
    'zuckerberg-reduce-decisions-reinvest',
    'Mark Zuckerberg: cut small decisions, protect long-term control',
    'Mark Zuckerberg: ຕັດການຕັດສິນໃຈນ້ອຍໆ, ປົກປ້ອງການຄວບຄຸມໄລຍະຍາວ',
    $$The same grey t-shirt every day was never about fashion — it was about saving decision-making energy for what actually matters, including money.$$,
    $$ເສື້ອຢືດສີເທົາໂຕເກົ່າທຸກມື້ ບໍ່ເຄີຍກ່ຽວກັບແຟຊັ່ນ — ແຕ່ແມ່ນການປະຫຍັດພະລັງໃນການຕັດສິນໃຈໄວ້ໃຊ້ກັບເລື່ອງທີ່ສຳຄັນ ລວມທັງເລື່ອງເງິນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$Reduce decision fatigue on small things$$, 'body', $$Zuckerberg has explained his habit of wearing similar outfits — usually a grey t-shirt and jeans — as a deliberate way to reduce the number of small daily decisions he has to make, preserving mental energy for decisions that actually matter. The same principle applies to money: automating savings transfers, bill payments, and a fixed monthly budget removes dozens of small daily willpower tests, leaving more discipline available for the decisions that are actually large.$$),
      jsonb_build_object('heading', $$Practical over flashy, most of the time$$, 'body', $$Despite extraordinary wealth, Zuckerberg has been seen driving modest, practical cars for daily use — a Honda Fit, an Acura, a manual Volkswagen — alongside occasional larger purchases. The pattern illustrates a habit worth copying at any income level: keep everyday spending built around function, and treat rare larger purchases as a deliberate, separate decision rather than a default upgrade to daily life.$$),
      jsonb_build_object('heading', $$Protect control of what you're building$$, 'body', $$Facebook's ownership and voting structure was set up to let Zuckerberg keep decision-making control even as outside investors bought in, specifically so the company could make long-term product decisions without being forced into short-term moves purely to satisfy quarterly investor pressure. The transferable lesson for anyone building a side business or small company: giving up ownership or control too cheaply for quick cash can cost far more control over your own future decisions than the cash was worth.$$),
      jsonb_build_object('heading', $$Plan to give the majority away$$, 'body', $$In 2015, Zuckerberg and Priscilla Chan pledged to give away 99% of their Facebook shares over their lifetimes through the Chan Zuckerberg Initiative — a target set publicly, early, and independent of how large the fortune eventually became. As with Gates's Giving Pledge, the practical lesson is the same regardless of the amount involved: naming a giving target in advance makes it far more likely to actually happen.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ຫຼຸດຄວາມເມື່ອຍລ້າຈາກການຕັດສິນໃຈນ້ອຍໆ$$, 'body', $$Zuckerberg ໄດ້ອະທິບາຍນິໄສການໃສ່ເສື້ອຜ້າຄ້າຍຄືກັນ — ປົກກະຕິແມ່ນເສື້ອຢືດສີເທົາ ແລະ ໂສ້ງຢີນ — ວ່າແມ່ນວິທີຕັ້ງໃຈຫຼຸດຈຳນວນການຕັດສິນໃຈນ້ອຍໆປະຈຳວັນ ເພື່ອຮັກສາພະລັງສະໝອງໄວ້ໃຊ້ກັບການຕັດສິນໃຈທີ່ສຳຄັນແທ້ໆ. ຫຼັກການດຽວກັນນຳໃຊ້ໄດ້ກັບເລື່ອງເງິນ: ການໂອນເງິນອອມ, ຈ່າຍໃບບິນ ແລະ ງົບປະມານປະຈຳເດືອນແບບອັດຕະໂນມັດ ຊ່ວຍລົບລ້າງການທົດສອບຄວາມຕັ້ງໃຈນ້ອຍໆຫຼາຍສິບຄັ້ງຕໍ່ວັນ ເຮັດໃຫ້ມີວິໄນເຫຼືອໄວ້ໃຊ້ກັບການຕັດສິນໃຈໃຫຍ່ໆແທ້ໆ.$$),
      jsonb_build_object('heading', $$ໃຊ້ງານໄດ້ຈິງ ດີກວ່າໂອ້ອວດ ໃນສ່ວນຫຼາຍ$$, 'body', $$ເຖິງແມ່ນຈະຮັ່ງມີຢ່າງມະຫາສານ Zuckerberg ຖືກເຫັນຂັບລົດທີ່ໃຊ້ງານໄດ້ຈິງ ແລະ ທຳມະດາ ໃນຊີວິດປະຈຳວັນ — Honda Fit, Acura, Volkswagen ເກຍໂຕ — ຄຽງຄູ່ກັບການຊື້ຂອງລາຄາແພງບາງຄັ້ງຄາວ. ຮູບແບບນີ້ສະທ້ອນນິໄສທີ່ຄວນຄ່າແກ່ການເອົາແບບຢ່າງ ໃນທຸກລະດັບລາຍໄດ້: ໃຫ້ການໃຊ້ຈ່າຍປະຈຳວັນອີງໃສ່ປະໂຫຍດການໃຊ້ງານ ແລະ ຖືການຊື້ຂອງລາຄາແພງທີ່ໜ້ອຍຄັ້ງ ເປັນການຕັດສິນໃຈແຍກຕ່າງຫາກທີ່ຕັ້ງໃຈ ບໍ່ແມ່ນການຍົກລະດັບຄວາມເປັນຢູ່ປະຈຳວັນໂດຍອັດຕະໂນມັດ.$$),
      jsonb_build_object('heading', $$ປົກປ້ອງການຄວບຄຸມສິ່ງທີ່ທ່ານກຳລັງສ້າງ$$, 'body', $$ໂຄງສ້າງການເປັນເຈົ້າຂອງ ແລະ ສິດອອກສຽງຂອງ Facebook ຖືກອອກແບບໃຫ້ Zuckerberg ຮັກສາອຳນາດຕັດສິນໃຈໄວ້ ແມ່ນວ່ານັກລົງທຶນພາຍນອກຈະເຂົ້າມາຮ່ວມທຶນ ໂດຍສະເພາະເພື່ອໃຫ້ບໍລິສັດຕັດສິນໃຈກ່ຽວກັບຜະລິດຕະພັນໃນໄລຍະຍາວໄດ້ ໂດຍບໍ່ຖືກບັງຄັບໃຫ້ເຄື່ອນໄຫວແບບໄລຍະສັ້ນພຽງເພື່ອເອົາໃຈຄວາມກົດດັນຂອງນັກລົງທຶນລາຍໄຕມາດ. ບົດຮຽນທີ່ນຳໄປໃຊ້ໄດ້ສຳລັບໃຜກໍ່ຕາມທີ່ສ້າງທຸລະກິດຂ້າງ ຫຼື ບໍລິສັດນ້ອຍ: ການປ່ອຍການເປັນເຈົ້າຂອງ ຫຼື ການຄວບຄຸມໄປແບບຖືກເກີນໄປເພື່ອເງິນສົດໄວ ອາດເສຍການຄວບຄຸມອະນາຄົດຂອງຕົນເອງຫຼາຍກວ່າຄ່າຂອງເງິນສົດນັ້ນ.$$),
      jsonb_build_object('heading', $$ວາງແຜນໃຫ້ຊັບສົມບັດສ່ວນໃຫຍ່$$, 'body', $$ໃນປີ 2015, Zuckerberg ແລະ Priscilla Chan ໄດ້ໃຫ້ຄຳໝັ້ນສັນຍາທີ່ຈະໃຫ້ຮຸ້ນ Facebook ຮ້ອຍລະ 99 ຕະຫຼອດຊີວິດຂອງເຂົາເຈົ້າ ຜ່ານ Chan Zuckerberg Initiative — ເປົ້າໝາຍທີ່ຕັ້ງໄວ້ຕໍ່ສາທາລະນະ ແຕ່ຫົວທີ ແລະ ບໍ່ຂຶ້ນກັບວ່າຊັບສົມບັດຈະໃຫຍ່ຂຶ້ນເທົ່າໃດ. ຄືກັນກັບ Giving Pledge ຂອງ Gates ບົດຮຽນທາງປະຕິບັດແມ່ນຄືກັນບໍ່ວ່າຈຳນວນເງິນຈະຫຼາຍປານໃດ: ການກຳນົດເປົ້າໝາຍການໃຫ້ຄືນລ່ວງໜ້າ ເຮັດໃຫ້ມັນເກີດຂຶ້ນຈິງໄດ້ງ່າຍຂຶ້ນຫຼາຍ.$$)
    ),
    array[$$Automate routine money decisions so willpower is saved for the decisions that matter$$, $$Keep everyday spending functional; treat rare big purchases as a separate, deliberate decision$$, $$Do not trade away control of what you're building too cheaply for short-term cash$$],
    array[$$ໃຊ້ລະບົບອັດຕະໂນມັດກັບການຕັດສິນໃຈເງິນປະຈຳວັນ ເພື່ອຮັກສາວິໄນໄວ້ໃຊ້ກັບເລື່ອງສຳຄັນ$$, $$ໃຫ້ການໃຊ້ຈ່າຍປະຈຳວັນອີງໃສ່ປະໂຫຍດການໃຊ້ງານ; ຖືການຊື້ຂອງແພງທີ່ໜ້ອຍຄັ້ງເປັນການຕັດສິນໃຈແຍກຕ່າງຫາກ$$, $$ຢ່າແລກການຄວບຄຸມສິ່ງທີ່ທ່ານກຳລັງສ້າງ ເພື່ອເງິນສົດໄວແບບຖືກເກີນໄປ$$],
    6, $$https://www.gobankingrates.com/saving-money/savings-advice/frugal-habits-of-mark-zuckerberg/$$, false, 6
  ),
  (
    'elon-musk-reinvest-and-risk',
    'Elon Musk: reinvest everything, and expect to fail before it works',
    'Elon Musk: ລົງທຶນຄືນທຸກຢ່າງ ແລະ ຄາດຫວັງຄວາມລົ້ມເຫຼວກ່ອນຈະສຳເລັດ',
    $$Musk put his entire PayPal fortune back into SpaceX and Tesla and nearly lost both in the same year. The lesson is powerful — and it comes with a warning.$$,
    $$Musk ເອົາຊັບສົມບັດທັງໝົດຈາກ PayPal ລົງທຶນຄືນໃສ່ SpaceX ແລະ Tesla ແລະ ເກືອບເສຍທັງສອງບໍລິສັດໃນປີດຽວກັນ. ບົດຮຽນນີ້ມີພະລັງ — ແລະ ມາພ້ອມກັບຄຳເຕືອນ.$$,
    jsonb_build_array(
      jsonb_build_object('heading', $$He reinvested his first fortune completely$$, 'body', $$When eBay bought PayPal in 2002, Musk's share was roughly $175-180 million. Rather than banking it or slowing down, he put the large majority of it into founding and funding SpaceX, Tesla, and SolarCity over the following years — redeploying one win directly into the next set of goals instead of treating it as money to keep.$$),
      jsonb_build_object('heading', $$2008 was nearly the end of both companies$$, 'body', $$By late 2008, SpaceX had already failed three rocket launches in a row and Tesla was burning cash faster than it could raise it, in the middle of a global financial crisis. Musk put the last of his personal cash into Tesla's financing round, which closed hours before payroll would have bounced, while personally borrowing money from friends to cover his own rent. Both companies came close to running out of money in the same year.$$),
      jsonb_build_object('heading', $$One result, after three failures, changed everything$$, 'body', $$SpaceX's fourth Falcon 1 launch — its last realistic shot before running out of money entirely — succeeded where the first three had failed, which led directly to a NASA contract worth roughly $1.6 billion that stabilized the company. The pattern is a reminder that some outcomes only show up after several failed attempts, and stopping right before the successful one is indistinguishable, in the moment, from stopping because something genuinely does not work.$$),
      jsonb_build_object('heading', $$This is an extreme case, not a template$$, 'body', $$Musk's approach — putting essentially all personal capital behind one set of goals with no separate safety net — is exactly the kind of concentrated risk that most personal finance guidance, including other lessons in this section, warns against. It worked because of an unusual combination of capital, timing, and outcomes that will not repeat for most people. The transferable part is the willingness to redeploy earned money toward a real goal instead of just spending it; the all-in concentration is not advice most people should copy.$$)
    ),
    jsonb_build_array(
      jsonb_build_object('heading', $$ລາວລົງທຶນຄືນຊັບສົມບັດກ້ອນທຳອິດທັງໝົດ$$, 'body', $$ເມື່ອ eBay ຊື້ PayPal ໃນປີ 2002 ສ່ວນແບ່ງຂອງ Musk ມີມູນຄ່າປະມານ 175-180 ລ້ານໂດລາ. ແທນທີ່ຈະເກັບໄວ້ໃນທະນາຄານ ຫຼື ຊ້າລົງ ລາວເອົາເງິນສ່ວນໃຫຍ່ນັ້ນລົງທຶນກໍ່ຕັ້ງ ແລະ ໃຫ້ທຶນແກ່ SpaceX, Tesla ແລະ SolarCity ໃນປີຕໍ່ໆມາ — ນຳຄວາມສຳເລັດຄັ້ງໜຶ່ງໄປລົງທຶນຄືນສູ່ເປົ້າໝາຍຊຸດຕໍ່ໄປໂດຍກົງ ແທນທີ່ຈະຖືວ່າມັນເປັນເງິນທີ່ຕ້ອງເກັບໄວ້.$$),
      jsonb_build_object('heading', $$ປີ 2008 ເກືອບແມ່ນຈຸດຈົບຂອງທັງສອງບໍລິສັດ$$, 'body', $$ຮອດທ້າຍປີ 2008 SpaceX ໄດ້ປ່ອຍຈະຫຼວດລົ້ມເຫຼວມາແລ້ວສາມຄັ້ງຕິດຕໍ່ກັນ ແລະ Tesla ກຳລັງໃຊ້ເງິນສົດໄວກວ່າທີ່ຫາທຶນໄດ້ ທ່າມກາງວິກິດການເງິນໂລກ. Musk ເອົາເງິນສົດສ່ວນຕົວສຸດທ້າຍລົງໃນຮອບການລະດົມທຶນຂອງ Tesla ຊຶ່ງປິດຮອບພຽງບໍ່ຈັກຊົ່ວໂມງກ່ອນເງິນເດືອນຈະບໍ່ພຽງພໍ ໃນຂະນະທີ່ລາວເອງຕ້ອງຢືມເງິນຈາກໝູ່ເພື່ອນເພື່ອຈ່າຍຄ່າເຊົ່າ. ທັງສອງບໍລິສັດເກືອບໝົດເງິນໃນປີດຽວກັນ.$$),
      jsonb_build_object('heading', $$ຜົນລັບໜຶ່ງ ຫຼັງຄວາມລົ້ມເຫຼວສາມຄັ້ງ ປ່ຽນທຸກຢ່າງ$$, 'body', $$ການປ່ອຍຈະຫຼວດ Falcon 1 ຄັ້ງທີສີ່ຂອງ SpaceX — ໂອກາດສຸດທ້າຍທີ່ເປັນໄປໄດ້ກ່ອນເງິນຈະໝົດ — ສຳເລັດຫຼັງຈາກສາມຄັ້ງທຳອິດລົ້ມເຫຼວ ຊຶ່ງນຳໄປສູ່ສັນຍາກັບ NASA ມູນຄ່າປະມານ 1.6 ພັນລ້ານໂດລາ ທີ່ຊ່ວຍໃຫ້ບໍລິສັດໝັ້ນຄົງ. ຮູບແບບນີ້ເປັນເຄື່ອງເຕືອນວ່າ ຜົນລັບບາງອັນປາກົດຂຶ້ນຫຼັງຄວາມພະຍາຍາມທີ່ລົ້ມເຫຼວຫຼາຍຄັ້ງເທົ່ານັ້ນ ແລະ ການຢຸດພຽງກ່ອນຄັ້ງທີ່ຈະສຳເລັດ ບໍ່ສາມາດແຍກອອກໄດ້ໃນຂະນະນັ້ນ ຈາກການຢຸດເພາະສິ່ງນັ້ນບໍ່ໄດ້ຜົນແທ້ໆ.$$),
      jsonb_build_object('heading', $$ນີ້ແມ່ນກໍລະນີສຸດຂີດ ບໍ່ແມ່ນຕົວແບບໃຫ້ເຮັດຕາມ$$, 'body', $$ວິທີການຂອງ Musk — ການເອົາທຶນສ່ວນຕົວເກືອບທັງໝົດລົງໃສ່ເປົ້າໝາຍຊຸດດຽວ ໂດຍບໍ່ມີທຶນສະສົມສຳຮອງແຍກຕ່າງຫາກ — ແມ່ນຄວາມສ່ຽງແບບກະຈຸກຕົວທີ່ຄຳແນະນຳການເງິນສ່ວນຕົວສ່ວນຫຼາຍ ລວມທັງບົດຮຽນອື່ນໃນພາກນີ້ ເຕືອນບໍ່ໃຫ້ເຮັດ. ມັນໄດ້ຜົນເພາະການປະສົມປະສານທີ່ບໍ່ທຳມະດາຂອງທຶນ, ຈັງຫວະເວລາ ແລະ ຜົນລັບ ທີ່ຈະບໍ່ເກີດຂຶ້ນຄືນສຳລັບຄົນສ່ວນໃຫຍ່. ສ່ວນທີ່ນຳໄປໃຊ້ໄດ້ຄື ຄວາມເຕັມໃຈທີ່ຈະນຳເງິນທີ່ຫາໄດ້ໄປລົງທຶນຄືນສູ່ເປົ້າໝາຍແທ້ໆ ແທນທີ່ຈະໃຊ້ຈ່າຍມັນໄປ; ສ່ວນການທຸ້ມທຶນທັງໝົດແບບກະຈຸກຕົວ ບໍ່ແມ່ນຄຳແນະນຳທີ່ຄົນສ່ວນໃຫຍ່ຄວນເຮັດຕາມ.$$)
    ),
    array[$$Redeploying a win into the next goal, instead of just spending it, is how one success can fund the next$$, $$Betting all your capital on one goal is extreme risk — keep a safety net Musk did not have$$, $$Some results only appear after repeated failed attempts; failing three times is not proof to stop$$],
    array[$$ນຳຄວາມສຳເລັດໄປລົງທຶນຄືນສູ່ເປົ້າໝາຍຕໍ່ໄປ ແທນທີ່ຈະໃຊ້ຈ່າຍມັນ ຄືວິທີໃຫ້ຄວາມສຳເລັດໜຶ່ງໜູນອີກອັນໜຶ່ງ$$, $$ການທຸ້ມທຶນທັງໝົດໃສ່ເປົ້າໝາຍດຽວແມ່ນຄວາມສ່ຽງສຸດຂີດ — ຮັກສາທຶນສະສົມສຳຮອງທີ່ Musk ບໍ່ມີ$$, $$ຜົນລັບບາງອັນປາກົດຫຼັງຄວາມພະຍາຍາມທີ່ລົ້ມເຫຼວຫຼາຍຄັ້ງເທົ່ານັ້ນ — ລົ້ມເຫຼວສາມຄັ້ງ ບໍ່ແມ່ນຫຼັກຖານໃຫ້ຢຸດ$$],
    7, $$https://www.cbsnews.com/news/billionaire-elon-musk-on-2008-the-worst-year-of-my-life/$$, false, 7
  )
) as v(
  slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
  key_takeaways_en, key_takeaways_lo, estimated_minutes, source_url, is_preview, sort_order
)
where premium_learning_categories.slug = 'money'
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  source_url = excluded.source_url, status = 'PUBLISHED';
