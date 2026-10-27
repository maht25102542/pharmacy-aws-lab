---
name: record-usecase-video
description: Record a narrated click-through video of a Console Lab use case (real menu clicks in the simulator, Thai voice, service-logo checklist with ticks) and publish it into the artifact. Use when asked to make/redo a use-case video, add a video for a new lab, or record an error-case video.
---

# Record a Console Lab use-case video

Drives `tools/console-lab/index.html` in headless Chrome over CDP, captures frames, adds Thai TTS narration, encodes mp4 + webm + mp4(Opus), and the artifact page plays it. Existing scripts: `tools/console-lab/record/uc1.js … uc7.js` (copy the closest one as a template).

## Video standard (user requirement, every video)
- Thai male voice `th-TH-NiwatNeural`, rate -15%, pitch -3Hz (user picked sample D; female was "robotic").
- Bottom checklist chips with real AWS service logos; green tick + big green toast per finished service; blue toast (logo + name + one-line explanation, spoken) when each service starts.
- Real clicks only for the main path; things not worth clicking (VPC, SG, ECR, RDS...) are pre-built by `buildXxx("<kind>-base")` and shown briefly, with the caption saying so.
- Every main video ends with a cost scene before the final success caption: `await L.costScene("<COSTD key>", "<spoken summary>")` (big card with monthly/4-hour estimate, cost drivers, Budget + destroy reminder; data from `src/mod/61-cost-data.js`, same as the 💰 card in the use-case page). New lab → add a `COSTD.uc` entry, run `node tools/console-lab/gen-cost-md.js`.
- Final frame must show success with all chips ticked and the site opened in the Browser tab.

- **Every video (main AND error-case) must ship a `<name>.chapters.json`** (written automatically by `L.encode`; the player shows it as the "ขั้นตอนในวิดีโอ / คลิกเพื่อข้ามไปดู" side panel). Publish it with the video (same suffix: `usecaseN-<x>.chapters.json`). A video without chapters is considered unfinished.
- **No hidden setup**: do not start from `buildXxx("...-base")` for things the learner must create. Create them with real clicks (`L.fill/choose/card`). The only things allowed to be pre-loaded silently are prerequisites from another lab (e.g. ECS from use case 2, aws CLI creds) and the caption/voice must say so.
- Prefilled form fields still get clicked/typed on camera (`fill`/`choose`), never just shown.

## Steps
1. Pick the lab base state: `buildStatic/buildSingle/buildApr/buildSls/buildCd/buildGha/buildEcs("<kind>-base")` (see `src/mod/*-lab.js`). Run it via `L.ev(...)` at the start.
2. Probe forms before scripting: write a throwaway script that clicks to the page and prints `document.body.innerText` + input list. Form widgets: text fields with samples are `— เลือกตัวอย่าง —` dropdowns (pick "ไม่ระบุ" then type into `main input[placeholder]`); selects are custom `.csel` (use `L.pickBtn(currentButtonText, optionText)`); checkboxes are `label.opt input`; radio cards need tag `main .rcard`.
3. Write `record/ucN.js` using `lib.js`: `plan([[label, svcKey|emoji]])`, `intro(i,title,desc,say)`, `tick(i,msg,say)`, `cap(text, say)`, `click/pick/pickBtn/type/hold`, `encode(out.mp4)`. Wrap flaky picks in `step(name, fn)` (3 retries). Services menu: open the category first (`svc(name, "Containers"|"Database"|"Developer Tools"|"Security, Identity, & Compliance"|"Compute"|"Networking & Content Delivery")`).
4. Run in background and watch the log: `(node ucN.js > /tmp/.../ucN.log; pkill -f "user-data-dir=/tmp/claude-1000/recpro[f]-"; echo finished >> log) &`. Delete the old log first (a stale `finished` fooled a monitor before). Never `pkill` a pattern that matches your own shell (use the `[f]` trick).
5. Verify: extract the last frame and a middle frame with ffmpeg, look at them (chips all ticked, site opened). Check `Duration` and that the mp4 has an audio stream.
6. Wire it: add `video: "videos/usecaseN-<x>.mp4"` to the UC object in `src/ui-usecase.js`. Use a NEW suffix letter whenever the file content changes (browser cache served an old silent file once). `node build.js && node test.js` must print exactly `ok` before commit/publish.
7. Publish with `Artifact` (one publish accepts max 64 MB of files — publish in two batches when updating many videos) (same url `https://claude.ai/artifact/XCkT2FwrBvVGruwYR6xCV6`), passing `files` mapping `videos/usecaseN-<x>.mp4|.webm|-opus.mp4` from the local files; set old suffix files to `null`. Commit with gitmoji + Co-Authored-By.

## Gotchas learned
- edge-tts randomly rejects some Thai+Latin strings: `lib.js` spells English terms in Thai (`PHON` map), appends "." and retries up to 10x, splits text as fallback. Add new English terms to `PHON` if one is read badly.
- Narration must not overlap: `say()` pads the previous frame until the earlier sentence ends.
- The artifact server has no HTTP Range support: the player fetches the whole file as a blob (else seeking is dead). Player tries webm (VP9+Opus) → mp4(H.264+Opus) → mp4(H.264+AAC) because VS Code/Electron cannot decode AAC.
- Player controls: centered SVG buttons (back5 / play-pause / fwd5), double-click right/left half = ±5 s, native volume only. No extra controls outside the player.
- `file://` loads of `index.html` need `<meta charset="utf-8">` (already first line of `src/template.html`).
- Kill leaked Chrome (`recprof`) after each run; recorder uses random port + per-pid profile.
- edge-tts is installed in a scratchpad venv; set `REC_VENV`/`EDGE_TTS`/`FFMPEG` env vars (see top of `record/lib.js`) on another machine. Generated `frames/`, `audio/`, `list.txt` are git-ignored.
- Sites shown in the Browser tab render inside `wbWin` (fake browser chrome) so the last frame looks like a real page.
