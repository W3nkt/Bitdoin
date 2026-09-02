-- Turn the weekly prompt feed into an evergreen, provenance-aware library.
-- Prompt bodies are only returned through the gated RPC: five per active day.

alter table public.premium_prompt_library alter column run_id drop not null;
alter table public.premium_prompt_library
  add column if not exists example_output_en text,
  add column if not exists example_output_lo text,
  add column if not exists source_url text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_evergreen boolean not null default false;

create index if not exists premium_prompt_library_evergreen_idx
  on public.premium_prompt_library (is_evergreen desc, week_start, sort_order);
create index if not exists premium_prompt_library_tags_idx
  on public.premium_prompt_library using gin (tags);

drop policy if exists "prompt_library_member_read" on public.premium_prompt_library;
revoke select on public.premium_prompt_library from authenticated;

create or replace function public.get_unlocked_prompt_library()
returns setof public.premium_prompt_library
language sql
security definer
stable
set search_path = public
as $$
  select p.*
  from public.premium_prompt_library p
  where p.week_start <= timezone('Asia/Vientiane', now())::date
    and (
      public.has_active_premium_subscription()
      or public.get_user_role() = 'ADMIN'
    )
  order by p.is_evergreen desc, p.week_start, p.sort_order, p.id
  limit case
    when public.get_user_role() = 'ADMIN' then 1000000
    else greatest(
      5,
      5 * (select count(*)::integer from public.premium_active_days d where d.user_id = auth.uid())
    )
  end;
$$;

revoke all on function public.get_unlocked_prompt_library() from public;
grant execute on function public.get_unlocked_prompt_library() to authenticated;

insert into public.premium_prompt_library
  (run_id, week_start, slug, category, title_en, title_lo, description_en, description_lo,
   prompt_en, prompt_lo, example_output_en, example_output_lo, source_url, tags, is_evergreen, sort_order)
values
  (null, '2026-01-01', 'explain-simply', 'Daily life', 'Explain anything simply', 'ອະທິບາຍທຸກຢ່າງແບບງ່າຍ',
   'Turn confusing information into a clear explanation and a practical next step.', 'ປ່ຽນຂໍ້ມູນທີ່ສັບສົນໃຫ້ເປັນຄຳອະທິບາຍທີ່ຊັດເຈນ ແລະ ຂັ້ນຕອນຕໍ່ໄປ.',
   'Explain [TOPIC OR PASTED TEXT] in plain language for a beginner. Use one analogy, define unavoidable technical words, and finish with three practical takeaways. Flag anything uncertain.',
   'ອະທິບາຍ [ຫົວຂໍ້ ຫຼື ຂໍ້ຄວາມ] ເປັນພາສາງ່າຍໆສຳລັບຜູ້ເລີ່ມຕົ້ນ. ໃຊ້ການປຽບທຽບ 1 ຢ່າງ, ອະທິບາຍຄຳສັບວິຊາການທີ່ຈຳເປັນ ແລະ ສະຫຼຸບ 3 ຂໍ້ທີ່ນຳໄປໃຊ້ໄດ້. ບອກຈຸດທີ່ບໍ່ແນ່ນອນ.',
   'Simple explanation → analogy → 3 actions → uncertainty note.', 'ຄຳອະທິບາຍງ່າຍໆ → ການປຽບທຽບ → 3 ຂັ້ນຕອນ → ໝາຍເຫດຄວາມບໍ່ແນ່ນອນ.',
   'https://www.youtube.com/watch?v=Lv5h-scLvt0', array['explain','learning','daily'], true, 1),
  (null, '2026-01-01', 'plan-my-day', 'Productivity', 'Plan my day without overwhelm', 'ວາງແຜນມື້ນີ້ແບບບໍ່ໃຫ້ໜັກໃຈ',
   'Convert a messy task list into a realistic schedule.', 'ປ່ຽນລາຍການວຽກທີ່ສັບສົນເປັນຕາຕະລາງທີ່ເຮັດໄດ້ຈິງ.',
   'Here are my tasks, deadlines, fixed appointments, and energy level: [DETAILS]. Build a realistic plan with time blocks, one top priority, short breaks, and a small fallback plan if I fall behind.',
   'ນີ້ແມ່ນວຽກ, ກຳນົດເວລາ, ນັດໝາຍ ແລະ ລະດັບພະລັງງານຂອງຂ້ອຍ: [ລາຍລະອຽດ]. ສ້າງແຜນທີ່ເຮັດໄດ້ຈິງໂດຍແບ່ງເວລາ, ກຳນົດ 1 ວຽກສຳຄັນ, ມີເວລາພັກສັ້ນໆ ແລະ ແຜນສຳຮອງຖ້າວຽກຊ້າ.',
   '08:30 priority task; 10:00 break; 10:15 admin; fallback: move optional task.', '08:30 ວຽກສຳຄັນ; 10:00 ພັກ; 10:15 ວຽກທົ່ວໄປ; ແຜນສຳຮອງ: ຍ້າຍວຽກທີ່ບໍ່ຮີບດ່ວນ.',
   'https://www.youtube.com/watch?v=_joPSZtz2OI', array['planning','focus','daily'], true, 2),
  (null, '2026-01-01', 'decision-matrix', 'Decisions', 'Make a difficult decision', 'ຊ່ວຍຕັດສິນໃຈເລື່ອງທີ່ຍາກ',
   'Compare options using your real priorities instead of generic advice.', 'ປຽບທຽບທາງເລືອກໂດຍໃຊ້ຄວາມສຳຄັນທີ່ແທ້ຈິງຂອງທ່ານ.',
   'Help me decide between [OPTION A] and [OPTION B]. First ask up to five essential questions. Then create a weighted decision table using my priorities, identify hidden risks, and recommend a reversible next step.',
   'ຊ່ວຍຂ້ອຍເລືອກລະຫວ່າງ [ທາງເລືອກ A] ແລະ [ທາງເລືອກ B]. ຖາມຄຳຖາມສຳຄັນບໍ່ເກີນ 5 ຂໍ້ກ່ອນ. ຈາກນັ້ນສ້າງຕາຕະລາງໃຫ້ຄະແນນຕາມຄວາມສຳຄັນ, ຊີ້ຄວາມສ່ຽງທີ່ເຊື່ອງຢູ່ ແລະ ແນະນຳຂັ້ນຕອນທີ່ຍ້ອນກັບໄດ້.',
   'Weighted comparison table plus a low-risk experiment.', 'ຕາຕະລາງປຽບທຽບທີ່ມີນ້ຳໜັກຄະແນນ ພ້ອມການທົດລອງຄວາມສ່ຽງຕ່ຳ.',
   'https://www.linkedin.com/pulse/25-ai-prompt-hacks-work-make-you-more-productive-alex-velinov-hpsrf', array['decision','analysis'], true, 3),
  (null, '2026-01-01', 'study-coach', 'Study', 'Active-recall study coach', 'ຄູຝຶກການຮຽນແບບທົບທວນຄວາມຈຳ',
   'Learn by answering, not passively rereading.', 'ຮຽນໂດຍການຕອບຄຳຖາມ ບໍ່ແມ່ນພຽງແຕ່ອ່ານຄືນ.',
   'Teach me [TOPIC] with active recall. Ask one question at a time, wait for my answer, correct misconceptions briefly, and adapt the next question to my level. End with a five-item review.',
   'ສອນ [ຫົວຂໍ້] ໃຫ້ຂ້ອຍດ້ວຍການທົບທວນຄວາມຈຳ. ຖາມເທື່ອລະໜຶ່ງຄຳຖາມ, ລໍຖ້າຄຳຕອບ, ແກ້ຄວາມເຂົ້າໃຈຜິດຢ່າງສັ້ນໆ ແລະ ປັບຄຳຖາມຕໍ່ໄປຕາມລະດັບຂອງຂ້ອຍ. ຈົບດ້ວຍ 5 ຂໍ້ທົບທວນ.',
   'Question → learner answer → correction → harder/easier next question.', 'ຄຳຖາມ → ຄຳຕອບຜູ້ຮຽນ → ແກ້ໄຂ → ຄຳຖາມທີ່ຍາກ/ງ່າຍຂຶ້ນ.',
   'https://github.com/systems-explained/awesome-chatgpt-prompts', array['study','recall','tutor'], true, 4),
  (null, '2026-01-01', 'email-rewrite', 'Work', 'Rewrite a clear professional email', 'ຂຽນອີເມວວິຊາຊີບໃຫ້ຊັດເຈນ',
   'Make an email concise, polite, and action-oriented.', 'ເຮັດໃຫ້ອີເມວສັ້ນ, ສຸພາບ ແລະ ມີຂັ້ນຕອນຊັດເຈນ.',
   'Rewrite this email for [AUDIENCE]. Keep my meaning, use a warm professional tone, put the requested action and deadline clearly, and keep it under 150 words: [DRAFT]',
   'ຂຽນອີເມວນີ້ຄືນໃໝ່ສຳລັບ [ຜູ້ຮັບ]. ຮັກສາຄວາມໝາຍເດີມ, ໃຊ້ນ້ຳສຽງອົບອຸ່ນແບບວິຊາຊີບ, ລະບຸສິ່ງທີ່ຕ້ອງການ ແລະ ກຳນົດເວລາໃຫ້ຊັດເຈນ, ບໍ່ເກີນ 150 ຄຳ: [ຮ່າງ]',
   'Subject + short context + clear request + deadline + courteous close.', 'ຫົວຂໍ້ + ບໍລິບົດສັ້ນໆ + ຄຳຂໍຊັດເຈນ + ກຳນົດເວລາ + ຄຳລົງທ້າຍສຸພາບ.',
   'https://www.linkedin.com/posts/sameer-aslam-2a9aa0193_you-can-use-these-13-daily-productivity-prompts-activity-7491123010607730689-1tKM', array['email','work','writing'], true, 5),
  (null, '2026-01-01', 'exploded-view', 'AI images', 'Exploded-view product diagram', 'ຮູບແຍກຊິ້ນສ່ວນຜະລິດຕະພັນ',
   'Reveal a product’s components in a clean technical composition.', 'ສະແດງຊິ້ນສ່ວນຂອງຜະລິດຕະພັນໃນຮູບແບບເຕັກນິກທີ່ສະອາດ.',
   'Create a precise exploded-view illustration of [OBJECT]. Separate every major component along one clear axis, preserve correct assembly order and scale, use a clean neutral background, soft studio lighting, crisp material detail, and optional numbered callouts. No duplicated or floating unrelated parts.',
   'ສ້າງຮູບແບບແຍກຊິ້ນສ່ວນທີ່ແມ່ນຍຳຂອງ [ວັດຖຸ]. ແຍກທຸກຊິ້ນສ່ວນຫຼັກຕາມແກນດຽວທີ່ຊັດເຈນ, ຮັກສາລຳດັບການປະກອບ ແລະ ຂະໜາດໃຫ້ຖືກຕ້ອງ, ໃຊ້ພື້ນຫຼັງກາງ, ແສງສະຕູດິໂອອ່ອນໆ, ລາຍລະອຽດວັດສະດຸຄົມຊັດ ແລະ ປ້າຍໝາຍເລກຖ້າຕ້ອງການ. ບໍ່ໃຫ້ມີຊິ້ນສ່ວນຊ້ຳ ຫຼື ບໍ່ກ່ຽວຂ້ອງ.',
   'A watch separated into case, crystal, hands, dial, movement, crown, and strap in assembly order.', 'ໂມງທີ່ແຍກເປັນຕົວເຮືອນ, ແວ່ນ, ເຂັມ, ໜ້າປັດ, ກົນໄກ, ເມັດປັບ ແລະ ສາຍຕາມລຳດັບ.',
   'https://github.com/sivolko/ai-image-prompts-library', array['image','exploded','product','3d'], true, 6),
  (null, '2026-01-01', '360-panorama', 'AI images', '360-degree panorama', 'ພາໂນຣາມາ 360 ອົງສາ',
   'Generate a seamless immersive environment for a 360° viewer.', 'ສ້າງສະຖານທີ່ຮອບທິດທາງສຳລັບເບິ່ງແບບ 360°.',
   'Create a seamless 2:1 equirectangular 360-degree panorama of [PLACE/SCENE], camera at natural eye height, consistent lighting and horizon, rich detail in every direction, clean zenith and nadir, no seams, no duplicated objects, and no text.',
   'ສ້າງຮູບພາໂນຣາມາ 360 ອົງສາແບບ equirectangular ອັດຕາ 2:1 ຂອງ [ສະຖານທີ່/ສາກ], ກ້ອງຢູ່ລະດັບສາຍຕາທຳມະຊາດ, ແສງ ແລະ ເສັ້ນຂອບຟ້າສອດຄ່ອງ, ມີລາຍລະອຽດທຸກທິດ, ບໍ່ມີຮອຍຕໍ່, ວັດຖຸຊ້ຳ ຫຼື ຕົວໜັງສື.',
   'A seamless jungle clearing that wraps naturally from left edge to right edge.', 'ປ່າໂລ່ງທີ່ຕໍ່ກັນໄດ້ຢ່າງທຳມະຊາດຈາກຂອບຊ້າຍຫາຂອບຂວາ.',
   'https://github.com/0aicoder0/gpt-image-2-prompt-gallery', array['image','360','panorama','vr'], true, 7),
  (null, '2026-01-01', 'research-brief', 'Research', 'Evidence-first research brief', 'ສະຫຼຸບການຄົ້ນຄວ້າໂດຍເນັ້ນຫຼັກຖານ',
   'Separate verified facts, disagreement, and open questions.', 'ແຍກຂໍ້ເທັດຈິງ, ຄວາມເຫັນທີ່ຕ່າງກັນ ແລະ ຄຳຖາມທີ່ຍັງເປີດຢູ່.',
   'Research [QUESTION]. Prefer current primary sources. Give me: a short answer, key evidence with dates and links, credible disagreements, missing information, and a confidence level. Do not invent citations.',
   'ຄົ້ນຄວ້າ [ຄຳຖາມ]. ໃຫ້ເນັ້ນແຫຼ່ງຂໍ້ມູນປະຖົມທີ່ໃໝ່. ໃຫ້ຄຳຕອບສັ້ນ, ຫຼັກຖານສຳຄັນພ້ອມວັນທີ ແລະ ລິ້ງ, ຄວາມເຫັນຕ່າງທີ່ໜ້າເຊື່ອຖື, ຂໍ້ມູນທີ່ຍັງຂາດ ແລະ ລະດັບຄວາມໝັ້ນໃຈ. ຫ້າມສ້າງແຫຼ່ງອ້າງອີງຂຶ້ນເອງ.',
   'Answer → dated evidence → disagreements → gaps → confidence.', 'ຄຳຕອບ → ຫຼັກຖານພ້ອມວັນທີ → ຄວາມເຫັນຕ່າງ → ຂໍ້ມູນຂາດ → ຄວາມໝັ້ນໃຈ.',
   'https://github.com/bigscience-workshop/promptsource', array['research','sources','analysis'], true, 8),
  (null, '2026-01-01', 'meeting-actions', 'Work', 'Turn notes into action items', 'ປ່ຽນບັນທຶກເປັນວຽກທີ່ຕ້ອງເຮັດ',
   'Extract decisions, owners, deadlines, and unresolved questions.', 'ສະກັດການຕັດສິນໃຈ, ຜູ້ຮັບຜິດຊອບ, ກຳນົດເວລາ ແລະ ຄຳຖາມທີ່ຍັງຄ້າງ.',
   'Convert these meeting notes into: (1) decisions made, (2) action items in a table with owner and due date, (3) unresolved questions, and (4) a five-sentence follow-up email. Write “unassigned” or “no date” instead of guessing: [NOTES]',
   'ປ່ຽນບັນທຶກການປະຊຸມນີ້ເປັນ: (1) ການຕັດສິນໃຈ, (2) ຕາຕະລາງວຽກພ້ອມຜູ້ຮັບຜິດຊອບ ແລະ ວັນຄົບກຳນົດ, (3) ຄຳຖາມທີ່ຍັງຄ້າງ ແລະ (4) ອີເມວຕິດຕາມ 5 ປະໂຫຍກ. ຂຽນ “ຍັງບໍ່ມີຜູ້ຮັບຜິດຊອບ” ຫຼື “ບໍ່ມີວັນທີ” ແທນການຄາດເດົາ: [ບັນທຶກ]',
   'Decision list, action table, open questions, concise follow-up.', 'ລາຍການຕັດສິນໃຈ, ຕາຕະລາງວຽກ, ຄຳຖາມຄ້າງ, ຂໍ້ຄວາມຕິດຕາມ.',
   'https://www.linkedin.com/posts/sameer-aslam-2a9aa0193_you-can-use-these-13-daily-productivity-prompts-activity-7491123010607730689-1tKM', array['meeting','work','actions'], true, 9),
  (null, '2026-01-01', 'weekly-reset', 'Wellbeing', 'Weekly reflection and reset', 'ທົບທວນ ແລະ ເລີ່ມອາທິດໃໝ່',
   'Review the week without judgment and choose a small improvement.', 'ທົບທວນອາທິດໂດຍບໍ່ຕັດສິນຕົນເອງ ແລະ ເລືອກສິ່ງນ້ອຍໆເພື່ອປັບປຸງ.',
   'Guide me through a weekly reset. Ask me one question at a time about wins, energy drains, unfinished tasks, relationships, and next week’s priorities. Then suggest one thing to stop, start, and continue.',
   'ນຳພາຂ້ອຍທົບທວນອາທິດ. ຖາມເທື່ອລະໜຶ່ງຄຳຖາມກ່ຽວກັບສິ່ງທີ່ສຳເລັດ, ສິ່ງທີ່ໃຊ້ພະລັງງານ, ວຽກທີ່ຍັງບໍ່ຈົບ, ຄວາມສຳພັນ ແລະ ສິ່ງສຳຄັນໃນອາທິດໜ້າ. ຈາກນັ້ນແນະນຳ 1 ສິ່ງທີ່ຄວນຢຸດ, ເລີ່ມ ແລະ ສືບຕໍ່.',
   'Stop: late scrolling. Start: 10-minute planning. Continue: daily walk.', 'ຢຸດ: ເລື່ອນໂທລະສັບຕອນເດິກ. ເລີ່ມ: ວາງແຜນ 10 ນາທີ. ສືບຕໍ່: ຍ່າງປະຈຳວັນ.',
   'https://www.linkedin.com/pulse/5-ai-prompts-actually-help-procrastination-from-someone-samuel-wong-bxzcc', array['reflection','weekly','wellbeing'], true, 10)
on conflict (week_start, slug) do update set
  category = excluded.category,
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  description_en = excluded.description_en, description_lo = excluded.description_lo,
  prompt_en = excluded.prompt_en, prompt_lo = excluded.prompt_lo,
  example_output_en = excluded.example_output_en, example_output_lo = excluded.example_output_lo,
  source_url = excluded.source_url, tags = excluded.tags, is_evergreen = excluded.is_evergreen,
  sort_order = excluded.sort_order;
