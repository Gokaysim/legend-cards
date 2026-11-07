# Legacy reference: Legend Card Manager

This folder holds two builds of the original single-file, offline Legend Card Manager. It was built through many chat iterations by someone who does not write code.

| File                               | Status                | SHA-256                                                            |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `Legend_Card_Manager_v2.2.8.html`  | **current reference** | `b44408ac3e302a8ed2fe0948c3ebcbf5ee5ceef5f13c2dee588820ebc8859e6e` |
| `Legend_Card_Manager_v2.1.15.html` | earlier version       | `add3bd5718a588b9043d30c95660f3239a1255998c468b7f3d0328bd49118fdc` |

**v2.2.8 is the design and behavior reference.** When the two versions differ, follow v2.2.8. v2.1.15 is kept only as history, for example to see what changed between the versions.

**These files are references, not application code.**

- Use them to see screens, Turkish labels, colors, the game vocabulary, and the game rules as they worked in practice.
- Do not port their code. They render HTML strings from global mutable state and store data in IndexedDB. The new app is built differently; see `docs/conventions.md`.
- Do not edit them. Keep both byte-for-byte as delivered, matching the checksums above.
- They are not part of the application build.

The rules v2.2.8 implements are written down in `docs/domain.md` ("Rules observed in legacy v2.2.8"). That document also lists what changed since v2.1.15.

To look at a file, open it directly in a browser. It runs fully offline, but it starts empty, because its data lives in the IndexedDB storage of whatever browser you open it in.
