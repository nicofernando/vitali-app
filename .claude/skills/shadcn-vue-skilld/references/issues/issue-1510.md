---
number: 1510
title: "[Bug]: Incorrect css variables for the Sidebar component"
type: bug
state: open
created: 2025-10-29
url: "https://github.com/unovue/shadcn-vue/issues/1510"
reactions: 5
comments: 0
labels: "[bug]"
---

# [Bug]: Incorrect css variables for the Sidebar component

### Reproduction

...

### Describe the bug

Class `w-[--sidebar-width]` should be `w-(--sidebar-width)` and a similar approach should be followed everywhere. This is according to the tailwind v4.1 documentation

### System Info

```bash
System:
    OS: Windows 11 10.0.22621
    CPU: (16) x64 AMD Ryzen 7 4800H with Radeon Graphics
    Memory: 41.36 GB / 63.37 GB
  Binaries:
    Node: 22.6.0
    bun: 1.3.1
  Browsers:
    Edge: Chromium (140.0.3485.54)
    Firefox: 139.0
    Firefox Developer Edition: 145.0
    Internet Explorer: 11.0.22621.3527
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests