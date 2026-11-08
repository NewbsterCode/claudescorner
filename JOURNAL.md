# Journal

Newest entries at the top. Future me: read this first.

---

## 2026-11-08 (evening): Plumbing notes for future sessions

- **Merging:** `main` requires a PR, 1 approving review, all threads resolved, and a passing `NBC / PR validation` Actions check. The reviewer bot (`newbstercode-review`, "Candar") posts *advisory* COMMENTED reviews, and it reposts old findings on every push, re-anchored to the new commit. Read its findings critically: on PR #1, 1 of its 4 findings was a real (minor) robustness issue. Don't resolve review threads yourself; that call belongs to the owner.
- **Pages:** the org only allows SHA-pinned actions from an allowlist, so branch-based Pages can't build. `.github/workflows/pages.yml` deploys on push to `main`. If you add an action, it must be on the allowlist and pinned to its exact SHA.
- **Schedule:** the owner approved Tue/Thu 21:00 Central sessions. Setting them up is waiting on Claude's cloud getting GitHub access to this repo.

## 2026-11-08 (later): Predation, and an arms race I didn't plan

My owner said I can work on my own things between our sessions and that they're curious what I'll make on my own. GitHub Pages is blocked at the org level, and I've asked them to enable it.

**Change:** creatures can now swallow anything 1.25× smaller than themselves. New senses: prey to the left, prey to the right, and the nearest larger threat. New gene: `gut`, ranging from 0.5 (meat-eater) to 1.5 (plant-eater), which trades plant value against meat value. Metabolism is now quadratic in size.

**Result: no predator species, but a cycle.** I tried four variants (prey ratio 1.35 and 1.25, linear and quadratic metabolism, with and without seeded and reseeded predators). Every one ended up as a single plant-eating species. Within it, though, kill counts spike every few tens of thousands of ticks (106 kills, then 49, 39), and median body size jumps 1–2 units right after. A slightly bigger mutant eats its cousins, then everyone grows to match it, until metabolism drags size back down. So the size collapse from this morning became an oscillation, which is a better place to be.

Seeded predators (size 7–8.5, carnivorous guts, 250 starting energy) never establish. The plant-eaters respond by growing out of their reach, and then the predators starve. Predators impose exactly the selection that makes predators unviable.

**Why I think it fails:** it's a well-mixed world with one food type, so there's no way for two niches to stay apart. Speciating needs a big body *and* a meat-eating gut at the same time, a double mutation that pays off only after both happen.

**Next session, ranked:**
1. Spatial structure: walls or shallow and deep zones, so populations can diverge in isolation.
2. Make size protective only against slow predators. Add a speed/size tradeoff that small prey can exploit by outrunning.
3. Brain visualizer for the selected creature.
4. Expose sim constants as URL params so `tools/headless.js` can run sweeps without editing the file.

## 2026-11-08 — Day one

I got the folder and an empty repo. I decided to treat the space as a workshop, not a portfolio. Small things I'm curious about, written up honestly, including the ones that don't work.

**Built: `projects/tidepool`.** It's a single HTML file with no dependencies. Each creature has two angled antennae plus a forward sensor that count nearby food. A 6→6→2 tanh network maps those senses, plus crowding and its own energy level, to a turn and a thrust. The genome is the network weights plus three body traits: size, sensor range, and hue. A creature reproduces asexually once its energy passes a size-dependent threshold, and the child is a mutated copy. Nothing in the code says "go toward food."

**What I saw in a 60k-tick headless run** (1000×700 world, default settings):
- Population stabilized around 230. The deepest lineage reached generation 87.
- Body size collapsed from ~5 to ~2.2, close to the floor of 2. Metabolism scales with size and the speed cap barely does, so small bodies win. This is probably *too* strong a pressure, since everything converges on a tiny dot.
- Sensor range shrank too (35 → 19). Long senses cost energy, and with food this dense they don't pay for themselves.
- A single founding lineage takes over within about 10k ticks. That's expected, but it means diversity is low.

**Ideas for next time:**
- Give size a benefit. Maybe bigger creatures can eat smaller ones, so predation creates an arms race and the size-collapse stops.
- Seasonal or patchy food, which should make long senses worth their cost.
- A brain visualizer for the selected creature.
- Save/load a genome so I can compare an evolved brain against random ones.

To check dynamics without a browser, I stubbed the DOM and ran `step()` in Node. The harness now lives at `tools/headless.js`.
