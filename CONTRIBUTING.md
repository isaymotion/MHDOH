# Contributing

Content lives in `data/*.json`. The code only renders it.

## Rules for content
1. **Every item needs a citation.** `cite` is a list of section ids from `data/sections.json`
   (for example `ra-s13`, `a25-annex-e`). The validator rejects unknown ids.
2. **Cite the source, not memory.** Check wording against the official text. Where a scan or
   database copy is unclear, say so in the section note instead of guessing.
3. **No unverified phone numbers.** Do not hardcode hotline numbers. Point to the official
   National Center for Mental Health site instead.
4. **English only.** Plain language, short sentences.
5. **Quiz questions** need exactly 4 options, one correct `answer` index (0 to 3), and an `explain` line.
6. **Scenarios** need exactly one `correct` option per step, with feedback on every option.

## Workflow
```
node scripts/validate-content.mjs     # must print "Content OK"
python3 -m http.server 8099           # then open http://localhost:8099
python3 tests/smoke.py                # optional browser test (needs Playwright)
```
When you change any cached file, bump `CACHE` in `sw.js` and add a line to `CHANGELOG.md`.

## Review
Summaries and answers should be checked by someone qualified (a lawyer, or a DOH or LGU mental
health programme officer) before the app is used for formal training.
