# Legacy reference: Legend Card Manager v2.1.15

`Legend_Card_Manager_v2.1.15.html` is the last version of the original single-file, offline Legend Card Manager. It was built through many chat iterations by someone who does not write code.

**It is a design and behavior reference, not application code.**

- Use it to see screens, Turkish labels, colors, the game vocabulary, and the game rules as they worked in practice.
- Do not port its code. It renders HTML strings from global mutable state and stores data in IndexedDB. The new app is built differently; see `docs/conventions.md`.
- Do not edit it. Keep it byte-for-byte as delivered (SHA-256 `add3bd5718a588b9043d30c95660f3239a1255998c468b7f3d0328bd49118fdc`).
- It is not part of the application build.

The rules it implements are written down in `docs/domain.md` ("Rules observed in legacy v2.1.15").

To look at it, open the file directly in a browser. It runs fully offline, but it starts empty, because its data lives in the IndexedDB storage of whatever browser you open it in.
