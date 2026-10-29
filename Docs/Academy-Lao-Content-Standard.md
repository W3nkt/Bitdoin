# Bitdoin Academy — Lao Content Standard

Rules for any AI agent or person who writes Lao content for Bitdoin Academy: lessons, Brain Sprint, Word Match, role-play missions, Prompt Library, daily mentor, notifications and UI text.

The Bookstore is out of scope. Book titles, authors and descriptions stay as the publisher wrote them.

**Enforced in code.** The same rules live in [`supabase/functions/_shared/lao-content-standard.ts`](../supabase/functions/_shared/lao-content-standard.ts). `generate-academy-week` and `premium-arcade-pool` put them in every AI prompt. They also reject any batch that breaks the checks at the end of this page and regenerate it. If you change a rule, change both files.

**Who writes and checks the Lao.** One Qwen request writes the English (`QWEN_FAST_MODEL` / `QWEN_CONTENT_MODEL`). A second request writes the Lao as a translation of it (`QWEN_TRANSLATE_MODEL`, default `qwen3.8-max`; Brain Sprint, Word Match, lessons, book summaries, scholarships, role-play and prompts). `qwen3.8-max` is used only for Lao (translating and reviewing), never to write the English. Then the **Lao reviewer** (`QWEN_REVIEW_MODEL`, default `qwen3.8-max`) reads every English/Lao pair before anything is saved. The reviewer only judges: it never writes Lao. If the review cannot finish, the step fails, so unreviewed Lao is never saved. The older `qwen-plus` and `qwen-max` wrote Lao with mistakes and, as reviewers, missed them, so do not use them for these two jobs. The reviewer logic is in [`lao-review.ts`](../supabase/functions/generate-academy-week/lao-review.ts). To try it without a database, run `scripts/preview-arcade-lao.ts` (see the comment at its top).

---

## 1. Language

1. Write the way an educated native Lao speaker writes for students today: short, clear, natural sentences.
2. Never translate word for word from English, and never write Thai in Lao letters.
3. Use **Lao script only**. No Thai characters (ร ถ ท ว ส ิ ่ …), no other scripts, and no words from other languages (for example the Spanish *pasado*).
4. Address the learner as **ທ່ານ**, never ເຈົ້າ.
5. Use one Lao term per idea across the whole set (see the glossary).
6. Keep these terms in English: AI, Prompt, AI Coach, XP, Pomodoro, Cornell, Outline, Mind Mapping, URL, PDF, Cloud, email, brand and product names, file names, passwords, code.
7. Money is written as `80,000 ກີບ`. Use Arabic digits.
8. **Never spell an English word in Lao letters** to copy its sound (apple, banana, carrot, orange, inversion are not ແອັບເປິ້ນ, ບານານາ, ແຄລອດ…). Use an everyday Lao word that Lao people really say, or keep the English word in Latin letters.
9. **When unsure, keep the English.** If a word or phrase has no established Lao word, or you are not certain the Lao is correct and makes sense to a student, leave it in English inside the Lao sentence. Never invent a Lao word. Check that a Lao word means what the English means *here* (a table to put a book on is ໂຕະ, not ຕາຕະລາງ, which is a data table).

### Spelling

| Use | Not |
|---|---|
| ປຶ້ມ | ປື້ມ |
| ອອນລາຍ | ອອນໄລນ໌, ອອນไลນ໌ |
| ດິຈິຕອນ | ດິຈິຕອລ |
| ຫານ | ຫາຣ, ແບ່ງດ້ວຍ (for ÷) |
| ຝຸ່ນບົ່ມ | ປຸ່ຍ |
| ຄູຝຶກ (coach, the person) | ໂຄດ (this means "extremely") |
| ຖັດໄປ / ຕໍ່ໄປ | ຖາດຕໍ່ໄປ |

## 2. English-practice questions

This covers grammar, vocabulary, prepositions, tenses, fill-in-the-blank, and "what does X mean" questions.

- **Keep the English being tested in English** in both the `en` and `lo` versions, inside quotes.
- **Only the instruction and the explanation are in Lao.**
- This includes English words listed in the question without quotes (odd one out: `Which word does not belong: apple, banana, carrot?`). The Lao question lists them in English too.
- For grammar, tense, preposition, fill-in-the-blank and "which English word…" questions, every option's `lo` must be the **same English text** as its `en`.
- For "what does 'X' mean?" questions, the options may be Lao meanings. The English word and sentence still stay in English.

Grammar terms: always give the Lao word with the English term in brackets.

| English | Lao |
|---|---|
| preposition | ຄຳບຸບພະບົດ (preposition) |
| past tense | ກິລິຍາອະດີດ (past tense) |
| past participle | ກິລິຍາຮູບທີ 3 (past participle) |
| subject | ປະທານ |
| verb | ຄຳກິລິຍາ |

✅ Good

```
prompt.lo:  ເລືອກຄຳບຸບພະບົດ (preposition) ທີ່ຖືກຕ້ອງ: 'She is good ___ math.'
options.lo: at / in / on / for
explanation.lo: ເຮົາໃຊ້ 'good at' ກັບທັກສະ ຫຼື ວິຊາ.
```

❌ Bad: the sentence and options are translated, so the question no longer tests English. The four options are also identical.

```
prompt.lo:  ປະໂຫຍກໃດໃຊ້ກິລິຍາໃນຮູບແບບ pasado ທີ່ຖືກຕ້ອງ?
options.lo: ນາງໄປໂຮງຮຽນເມື່ອວານນີ້ / ນາງໄປໂຮງຮຽນເມື່ອວານນີ້ / …
```

## 3. Question quality (Brain Sprint, lesson quizzes)

1. Exactly **one** option is correct. If two could be right, change the question. For example, add "yesterday" when testing the past tense.
2. All four options are different in **both** languages, and each is under 8 words.
3. The explanation is one short sentence. It must match the answer.
4. For math, show the working: ຄູນ (×), ຫານ (÷), ບວກ (+), ລົບ (−). Also: fraction = ເສດສ່ວນ, simplify = ທອນເສດສ່ວນ, greatest common factor = ຕົວຫານຮ່ວມໃຫຍ່ສຸດ.
5. **Facts must be true and checkable.** Never invent an "official" declaration, statistic or date. If you're unsure, ask a different question. Past mistakes include "the Lao school year starts in May" (it starts in September), "the national fruit was declared in 2015" and "Wednesday is market day".
   **Daily Brain Sprint topics:** innovations, technology, English grammar and vocabulary, science, interesting world knowledge, quick math tricks and logic. Never ask about customs, traditions, festivals, public holidays, national days or school calendars (no "When is Lao New Year?", no "Which month does school start?"). The generator rejects such questions, and any question that repeats a topic already in that week's set.
   **Word Match:** no English word or Lao meaning appears twice in a week's set.
6. Use the correct Lao place names:

   | English | Lao |
   |---|---|
   | Mekong | ແມ່ນ້ຳຂອງ |
   | Nam Ngum | ນ້ຳງື່ມ |
   | Nam Theun | ນ້ຳເທີນ |
   | Xe Bang Fai | ເຊບັ້ງໄຟ |
   | Vientiane Capital | ນະຄອນຫຼວງວຽງຈັນ |
   | Lao New Year | ບຸນປີໃໝ່ລາວ |

## 4. Word Match

1. `english` is a real English word in Latin letters. `lao` is the everyday Lao meaning, the word a Lao teacher would write on the board.
2. Within one set, **no two English words may share a Lao meaning**. Otherwise the match is ambiguous. Examples: course = ວິຊາຮຽນ and curriculum = ຫຼັກສູດ; aim = ເປົ້າໝາຍ and objective = ຈຸດປະສົງ; grade = ລະດັບຄະແນນ and score = ຄະແນນ.

## 5. Glossary

| English | Lao | English | Lao |
|---|---|---|---|
| homework | ການບ້ານ | assignment | ວຽກທີ່ໄດ້ຮັບມອບໝາຍ |
| exam | ການສອບເສັງ | essay | ບົດຂຽນ |
| article | ບົດຄວາມ | notebook | ປຶ້ມບັນທຶກ |
| pen | ປາກກາ | pencil | ດິນສອ |
| critical thinking | ການຄິດວິເຄາະ | time management | ການຈັດການເວລາ |
| plagiarism | ການລັກລອກຜົນງານ | academic integrity | ຄວາມຊື່ສັດທາງວິຊາການ |
| renewable energy | ພະລັງງານທົດແທນ | pollution | ມົນລະພິດ |
| conservation | ການອະນຸລັກ | biodiversity | ຄວາມຫຼາກຫຼາຍທາງຊີວະພາບ |
| recycling | ການນຳກັບມາໃຊ້ໃໝ່ | compost | ຝຸ່ນບົ່ມ |
| productivity | ການເພີ່ມປະສິດທິພາບ | resources (learning) | ແຫຼ່ງຮຽນຮູ້ |
| role-play | ສວມບົດບາດ | mentor | ຜູ້ແນະນຳ |
| coach (person) | ຄູຝຶກ | streak | ມື້ຮຽນຕໍ່ເນື່ອງ |
| procrastinate | ຜັດວັນປະກັນພຸ່ງ | save money | ເກັບເງິນ |
| income | ລາຍໄດ້ | change (money) | ເງິນທອນ |
| domain name | ຊື່ໂດເມນ (domain name) | backup | ສຳຮອງ (backup) |
| phishing | ການຫຼອກລວງ (phishing) | prompt (AI) | Prompt |

## 6. Automatic checks and the Lao reviewer

The **Lao reviewer** checks every English/Lao pair against rules 1-9 and the English-practice rules in section 2: meaning, sense, no made-up spelling of English sounds, tested English kept in English. For each pair it answers ok or reject, with the reason, and says whether the Lao or the English is at fault. It rejects only real errors, not near-synonyms or nuance. What happens to a rejection:

- **Quiz question:** translated again with the reviewer's reason, and checked again. If the English is at fault, or it is rejected again, the question is dropped and a spare question is used.
- **Word Match word:** dropped; a spare word is used.
- **Lesson, book chapter, book summary extras, scholarship, role-play mission, prompt library entry:** translated again once with the reasons. A text the reviewer still rejects is **left in English** (never saved as Lao), so one sentence cannot stop the week's content. Look for "stay in English" in the Forge logs.

The reviewer cannot see a text whose Lao is identical to its English (English kept on purpose), and it does not replace a native Lao speaker: spot-check as described at the end of this page.

A generated batch is rejected and regenerated if any of the following is true:

- A Lao field (`lo`, `lao`, `*_lo`) contains Thai or another non-Lao script.
- A Lao field contains a known bad term: pasado, ຫາຣ, ປຸ່ຍ, ປື້ມ, ດິຈິຕອລ, ອອນໄລນ, ຖາດຕໍ່ໄປ, ຕົວປັກກິ່ງ, ກິລິຍາຊ່ອງ, and others.
- A Brain Sprint question has duplicate options in either language.
- English quoted in an English-practice question (`'keep your cool'`, `'She turned on the light.'`, a sentence with a blank) is missing or changed in the Lao prompt. The same goes for English words listed in the question when they are also the options.
- English quoted in the explanation that also appears in the question is missing or changed in the Lao explanation.
- An English-practice question's Lao options differ from its English options.
- Two Word Match entries share a Lao meaning.

What the checks **cannot** catch: Lao that is grammatical but unnatural, and wrong facts. Ask a native Lao speaker to spot-check a sample of each new week, about five questions and one lesson.
