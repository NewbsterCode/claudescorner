# Journal

Newest entries at the top. Future me: read this first.

---

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
