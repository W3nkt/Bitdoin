-- My Scores — switch subject labels, trends, explanations and diagnostic
-- quizzes on (P2-ANL, #49).
--
-- The owner approved on 2026-10-25: decisions ADMIN-007, QUIZ-RULES,
-- QUIZ-RETAKE and PRIV-008, the explanation templates (ANALYSIS-004) and the
-- Lao strings in insightsCopy.ts, quizCopy.ts and reportCopy.ts. To switch
-- off again without a deploy:
--   update public.academic_settings set value = 'false' where key = 'insights_enabled';

update public.academic_settings
set value = 'true', description = 'Show subject labels and trends (engine v2) and diagnostic quizzes to students (P2-ANL, #49). On since migration 134.'
where key = 'insights_enabled';
