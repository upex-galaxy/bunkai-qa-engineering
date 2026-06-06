# Comments for BK-16

[View in Jira](https://jira.upexgalaxy.com/browse/BK-16)

---

### Ely - 5/19/2026, 9:54:38 PM

1. 🧱 Architect Annotation

1. 

- ****DB****: no new tables. Reuses `user*stories.description` and `acceptance*criteria.description` fields.
- ****Server-side sanitizer****: `sanitize-html` configured with an allowlist — `h1-h4, p, ul, ol, li, strong, em, code, pre, blockquote, table, thead, tbody, tr, th, td, a, hr, br`. Allowed `a` attributes: `href` (schemes `http|https|mailto`), `target` (force `_blank`), `rel` (force `noopener noreferrer`). All inline event handlers, `style`, `iframe`, `object`, `script`, `embed` stripped.
- ****Client renderer****: `react-markdown` + `remark-gfm` (tables, task lists) + `rehype-sanitize` (defense in depth). Code blocks render through a thin wrapper that adds `className="language-<lang>"` (no syntax highlighter in MVP — leaves the hook for Phase 2).
- ****Editor component****: textarea + toolbar (Bold, Italic, Code, Link, UL, OL, H2, H3). Toolbar wraps selection with Markdown syntax; keyboard shortcuts `Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+K` (link prompt). Live preview panel toggleable via icon.
- ****Size cap****: shared with FR-007 — 50KB UTF-8 bytes. Client uses `new Blob([value]).size` for warning at 90% and hard stop at 100% before submit.
- ****Defense in depth****: sanitize on save AND on render. Two layers guards against future migration that might persist legacy unsanitized content.

1. 

- Upstream: ****BK-14***** "User Story CRUD" (consumes the editor for `description`). *****BK-15**** "Acceptance Criterion CRUD" (same component reused).
- Downstream: ****BK-17**** "Jira import" persists Markdown converted from ADF — must flow through the same sanitizer on save.
- External: `react-markdown`, `remark-gfm`, `rehype-sanitize`, `sanitize-html` (already candidate dependencies; check bun.lock and pin versions).

1. 

- [ ] Editor component renders in both User Story and AC forms
- [ ] Sanitizer middleware applied to both user*stories and acceptance*criteria save paths
- [ ] Unit tests for sanitizer: drops <script>, drops onclick, rewrites <a> target/rel, allows tables, strips disallowed schemes (`javascript:`)
- [ ] Unit tests for renderer: code blocks get `language-*` class, links open with noopener, headings render as h1-h4
- [ ] Snapshot test for editor toolbar wrapping logic (selection -> `****selection****`)
- [ ] XSS regression test from the OWASP Markdown XSS cheat-sheet (curated subset)
- [ ] `bun run lint` + `bun run typecheck` pass
- [ ] Manual smoke: paste a known-malicious markdown blob, confirm preview renders inert
- [ ] PR description cross-references each AC by Gherkin scenario name

1. 

- PRD: `.context/PRD/mvp-scope.md` § EPIC-BK-003 / US 3.4
- SRS: `.context/SRS/functional-specs.md` § FR-007 (description cap reused)
- Business map: `.context/business/business-data-map.md` § content rendering
- Frontend design tokens: `DESIGN.md` § editor & code block styles

---

### Facu Barea - 6/1/2026, 12:09:02 AM

# 🧪 QA Shift-Left Review — [https://jira.upexgalaxy.com/browse/BK-16#icft=BK-16](https://jira.upexgalaxy.com/browse/BK-16#icft=BK-16) Completed

## What QA did before you code

This story went through a full ***Shift-Left QA analysis*** before reaching your hands. Here's what was produced so there are no surprises at QA time.

## Risk Assessment

***Risk score: 13/HIGH*** — driven by:

- New feature with security requirements (XSS sanitization, two-layer defense)
- Explicit ACs covering injection vectors (scripts, unsafe links, event handlers)
- Multi-component surface (sanitize-html + react-markdown + rehype-sanitize)
- User-facing with immediate business impact (content consumed by downstream AI agents)

***Story Points assigned: 8***

## Acceptance Test Plan

A full ATP is attached to this story (field: 🧪 Acceptance Test Plan). It contains:

- 5 refined ACs with exact test data (what to paste, what to expect)
- 9 test outlines ready to execute once the feature is deployed to staging
- 6 extended edge cases to consider during implementation

## The 9 Test Cases QA will run

| TC  | Description  | Priority  |
| --- | --- | --- |
| ---  | ---  | ---  |
| TC-01  | Render heading + bullet list in live preview  | Critical  |
| TC-02  | Persist Markdown formatting after save + reopen  | Critical  |
| TC-03  | Render Markdown table in preview and after save  | High  |
| TC-04  | Strip script tags on save  | Critical  |
| TC-05  | Remove javascript: links, preserve mailto:  | Critical  |
| TC-06  | Reject body exceeding 50 KB with error message  | High  |
| TC-07  | Warn user at 90% size threshold  | Medium  |
| TC-08  | Preserve inline code and code blocks after sanitization  | High  |
| TC-09  | Strip inline event handlers (onclick, onmouseover)  | Critical  |

## Open Questions for Dev

These ambiguities were found during the QA analysis. Please address them before or during implementation:

1. ***Empty description save*** — is a zero-length body permitted or rejected with a validation message?
2. ***AC5 error copy*** — exact UI text for the 50 KB rejection message (story says "description exceeds the maximum size" — confirm this is the final copy)
3. ***AC4 edge: data: and vbscript: URIs*** — confirm these are also stripped (not just javascript:slight_smile:, per the sanitize-html allowlist
4. ***AC3 multi-vector*** — confirm behavior when multiple script tags appear in one paste (all must be stripped)
5. ***Toolbar shortcuts*** — Ctrl+B / Ctrl+I / Ctrl+K behavior: do they wrap the selected text or insert at cursor?
6. ***Empty save of upstream forms*** — [https://jira.upexgalaxy.com/browse/BK-14#icft=BK-14](https://jira.upexgalaxy.com/browse/BK-14#icft=BK-14) (US CRUD) and [https://jira.upexgalaxy.com/browse/BK-15#icft=BK-15](https://jira.upexgalaxy.com/browse/BK-15#icft=BK-15) (AC CRUD) are the surfaces that mount this editor. Confirm both forms pass the description through the same sanitizer path

## Definition of Done reminder

Per the architect annotation, QA will verify:

- Sanitizer middleware applied to both user*stories and acceptance*criteria save paths
- Defense in depth: content cleaned on save AND on render
- No executable script, iframe, event handler, or unsafe link scheme survives in the DOM
- 50 KB hard cap enforced client-side (warn at 90%, block at 100%)
- All allowlisted tags (h1-h4, p, ul, ol, li, code, pre, blockquote, table, a, etc.) survive sanitization intact

Good luck — the ATP has everything you need. Ping QA if any of the open questions above are blockers.

---

### Ely - 6/4/2026, 10:52:08 PM

## Ready For QA — BK-16 (Markdown editor, write & preview safely)

Merged to staging and deployed. Ready for testing on staging.

### Links

- PR: https://github.com/upex-galaxy/upex-bunkai-tms/pull/12 (merged)
- Staging: https://staging-upexbunkai.vercel.app — deploy READY
- Merge commit: 97ba126

### What shipped

- A Markdown editor (toolbar: Bold/Italic/Code/Link/lists/H2/H3, Cmd-Ctrl+B/I/K shortcuts, inline link input, toggleable live preview) replaces the plain textarea on the module description, in both the create-module and rename-module forms.
- Safe rendering: the preview (and any future read-only display) runs through react-markdown + rehype-sanitize with no raw-HTML execution; links are restricted to http/https/mailto.
- Content is sanitized on save AND on render (defense in depth).

### Where to test it

Open a project, create or rename a module, and use the description editor. The 50 KB limit applies to the future User Story / Acceptance Criterion descriptions; the module description keeps its 500-character limit.

### Suggested QA focus

- Type "## Steps" + a bullet list → toggle Preview → heading + list render; save, reopen (rename) → formatting persists.
- Write a Markdown table → Preview shows a table.
- Paste a description containing a script snippet → save → the stored/rendered content has no executable script, surrounding text intact.
- Paste a mailto link and a javascript link → save → the mailto works, the javascript link is gone.
- Toolbar: select text, click Bold → wraps in **; Link → inline URL input inserts [text](url).

### Notes / carry-forward

- This story delivers the reusable editor + sanitizer + renderer; the real consumers are BK-14 (User Story CRUD) and BK-15 (Acceptance Criterion CRUD), which reuse the same components with the 50 KB cap.
- The 50 KB "exceeds maximum size" message is implemented but dormant on the module mount (the 500-char rule supersedes it); it activates when BK-14/15 mount the editor in byte-cap mode, where a submit-disable + server 50 KB guard will also be added.
- Security review: no render-exploitable XSS found (every vector rendered through the real pipeline).

---


_Synced from Jira by sync-jira-issues_
