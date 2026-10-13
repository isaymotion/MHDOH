# MH Policy Trainer

A study app for three Philippine mental health policy documents:

- **RA 11036**, the Mental Health Act (2018)
- **DOH AO 2016-0039**, Revised Operational Framework for a Comprehensive National Mental Health Program
- **DOH AO 2025-0028**, National Policy Framework for Community-Based Mental Health Services

> **Educational use only.** This app is not legal advice and is not an official DOH product.
> Always check a provision against the official text before relying on it.

## Features
- **Learn:** four short modules (one per document, plus a comparison module)
- **Section explorer:** search 78 summarized provisions; filter by document, topic and agency
- **Quiz:** 60 multiple-choice questions with explanations and sources; weak-spot review
- **Flashcards:** 32 cards with five-box spaced repetition (Leitner)
- **Scenarios:** three branching practice cases (emergency restraint, confidentiality, an LGU starting CBMH)
- **Learning paths** for seven roles
- **Tools:** LGU readiness checklist, action plan builder (Annex D outline, export to Markdown), side-by-side comparison
- **Glossary** and a **progress dashboard** (stored in your browser only)
- Light and dark mode, working Back and Forward buttons, offline use, installable on phones and desktops
- English only. No tracking, no accounts, no server.

## Run locally
It is a static site. Serve the folder over HTTP (opening `index.html` directly will not load the data files):

```
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to GitHub Pages
1. Push this folder to a GitHub repository (default branch `main`).
2. In the repository, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow publishes the site on every push to `main`.

All paths are relative, so it works under `https://<user>.github.io/<repo>/`.

## App icon
The app expects your icon at `assets/MH-Act-Icon.png`. Then run:

```
pip install pillow
python3 scripts/make_icons.py
```

This writes `icons/icon-192.png`, `icon-512.png` and `icon-maskable-512.png`. Until you add the file, a plain
placeholder icon is used. After changing icons, bump `CACHE` in `sw.js`.

## Content
```
data/meta.json         documents, topics, agencies, disclaimer
data/sections.json     78 summarized provisions (every other file cites these ids)
data/lessons.json      modules and lessons
data/questions.json    quiz bank
data/flashcards.json   flashcards
data/scenarios.json    practice scenarios
data/paths.json        role-based paths
data/checklist.json    readiness checklist and action plan outline
data/comparison.json   side-by-side table
data/glossary.json     glossary
```
Run `node scripts/validate-content.mjs` to check that every citation resolves.

## Known limits and caveats
- Summaries were written from a legal-database copy of RA 11036 and machine-read scans of the two orders.
  Some scan characters were garbled. Dates and annex layouts, in particular, should be checked
  (the AO 2025-0028 date appears to read December 22, 2025; the AO 2016-0039 date line is partly illegible).
- AO 2025-0028 sub-part letters inside Part VII are partly inferred, so citations use section names.
- Quiz answers and summaries have not been reviewed by a lawyer or programme expert.
- No crisis hotline numbers are hardcoded, because they were not verified. See the National Center for Mental Health site.

## Licence
MIT for the code and original text. See `LICENSE`.
