---
number: 1015
title: "[Bug]: broken installation instructions"
type: bug
state: closed
created: 2025-01-24
url: "https://github.com/unovue/shadcn-vue/issues/1015"
reactions: 14
comments: 2
labels: "[bug]"
---

# [Bug]: broken installation instructions

### Reproduction

try to follow the instructions: https://github.com/unovue/shadcn-vue/blob/dev/apps/www/src/content/docs/installation/vite.md last commit was e4fea78b3302d8480bb2e994d07b5fa4b3ff9004

### Describe the bug

in **Add Tailwind and its configuration**:

```
npm install -D tailwindcss autoprefixer

should be

npm install tailwindcss @tailwindcss/vite autoprefixer
```

```
import tailwind from 'tailwindcss'

should be

import tailwind from 'tailwindcss/vite'
```

**the css input file should use:**

```
@import "tailwindcss";
@config "../../tailwind.config.js"; /* IMPORTANT: modify accordingly */

instead of:

@tailwind base;
@tailwind components;
@tailwind utilities;
@config "../../tailwind.config.js";
```
this last one seems to be an external package fault.

upt to date information can be found here: https://tailwindcss.com/docs/installation/using-vite

considering vite is one of the most used tools, why dont setup an automated workflow to check if the installation instructions succed, instead of relying on user feedback ? I think it would be less expensive for everyone, i see a lot installation issues.

situations like these made me think about the complexity and fragility of these frameworks, there are so many dependencies and points of failure its frightening.

thank you for all the hard work.

### System Info

```bash
System:
    OS: Linux 6
    CPU: Intel
  Binaries:
    Node: 22.13.1 - ~/.local/share/mise/installs/node/22.13.1/bin/node
    npm: 10.9.2 - ~/.local/share/mise/installs/node/22.13.1/bin/npm
  npmPackages:
    @vueuse/core: ^12.5.0 => 12.5.0 
    radix-vue: ^1.9.12 => 1.9.12 
    vue: ^3.5.13 => 3.5.13
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests

---

## Top Comments

**@zernonia** [maintainer]:

Updated the docs to installation version 3 of tailwind instead of latest

**@rukshn**:

TailwindCSS is now on version 4 while Shadcn-vue is still on TailwindCSS 3. Therefore you should install TailwindCSS 3 using 

```bash
npm install -D tailwindcss@3
```