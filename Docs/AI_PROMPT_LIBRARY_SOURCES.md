# AI Prompt Library research notes

Reviewed 2026-09-02. The product stores a source URL per prompt, but prompt text is rewritten and tested before publication unless its license explicitly permits reuse.

## High-volume sources

- YouMind OpenLab, `awesome-gpt-image-2`: 2,000+ image prompts with previews and multilingual metadata. Licensed CC BY 4.0, so imports must retain attribution, link the license, and mark adaptations. https://github.com/YouMind-OpenLab/awesome-gpt-image-2
- `awesome-chatgpt-prompts`: broad role-based prompt taxonomy covering learning, work, writing, planning, and daily life. Use as a taxonomy/research reference unless a prompt's reuse rights are confirmed. https://github.com/systems-explained/awesome-chatgpt-prompts
- `ai-image-prompts-library`: useful taxonomy for exploded views, knolling, image transformations, and structured visual prompts. No clear license was visible during review, so do not bulk-copy. https://github.com/sivolko/ai-image-prompts-library
- `gpt-image-2-prompt-gallery`: examples for exploded technical diagrams and seamless 360° panoramas. Use as research inspiration and retain source provenance. https://github.com/0aicoder0/gpt-image-2-prompt-gallery
- `ai-image-prompts`: prompt-plus-example-output gallery with a clean folder-per-prompt model. No clear license was visible during review, so use its information architecture rather than copying content. https://github.com/fattain-naime/ai-image-prompts
- BigScience PromptSource: established prompt repository and templating model; useful for contribution and quality-control structure. https://github.com/bigscience-workshop/promptsource

## Social/video discovery

- YouTube daily-life prompt roundups were reviewed for recurring needs such as day planning, simplifying difficult text, saving money, and study help.
- LinkedIn prompt roundups were reviewed for workplace patterns including meeting actions, email follow-up, prioritization, gap analysis, and procrastination support.
- TikTok results are volatile and often inaccessible without an authenticated client. Treat TikTok as a discovery channel only; independently rewrite, test, and provenance-check every candidate.

## Intake rules

1. Verify license and attribution requirements before importing verbatim content or example media.
2. Prefer an original, model-neutral template with editable placeholders.
3. Store English and natural Lao versions, tags, category, source URL, and a representative example output.
4. Test for useful output, factual-risk warnings, unsafe instructions, prompt injection, and duplicated content.
5. Never import private data, proprietary system prompts, jailbreaks, impersonation scams, or prompts presenting medical/legal/financial output as professional advice.
6. Publish in deterministic order; the database RPC exposes only five additional prompts per recorded active day.
