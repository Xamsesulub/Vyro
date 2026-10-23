# Third-party artwork

## Current VYRO artwork

The current runner and wordmark in `src/theme/runnerMark.json` are custom vector
paths redrawn from the VYRO logo supplied by the project owner on 23 October 2026.
`src/components/Brand.tsx` renders them in React Native; `scripts/generate-brand.cjs`
produces the SVG, app, splash and browser assets. This artwork replaces the former
Tabler Run pictogram. Native launcher backgrounds are opaque white, with the
platform applying its own mask; the wordmark and in-app symbol have no baked shadow.

## Historical artwork — Tabler Icons Run

Earlier builds used [Tabler Icons Run](https://tabler.io/icons/icon/run).
Its attribution is retained here for those historical versions; current brand
assets no longer contain that geometry.

Source: https://github.com/tabler/tabler-icons/blob/a4ce1404bc6d24d3c365afe7b258d6bf6f48d62d/icons/outline/run.svg

License:

```text
MIT License

Copyright (c) 2020-2026 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
