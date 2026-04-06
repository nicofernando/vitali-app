---
number: 1048
title: "[Bug]: cli @1.0.0 throw error `An invalid components.json file was found`  in project initialized with old version @0.11"
type: bug
state: closed
created: 2025-02-21
url: "https://github.com/unovue/shadcn-vue/issues/1048"
reactions: 10
comments: 31
labels: "[bug]"
---

# [Bug]: cli @1.0.0 throw error `An invalid components.json file was found`  in project initialized with old version @0.11

### Reproduction

attachement file

### Describe the bug

shadcn-vue-version-error.zip



pnpm dlx shacn-vue@latest init will also throw the error.

### System Info

```bash
System:
    OS: Windows 10 10.0.19045
    CPU: (16) x64 AMD Ryzen 7 7840H with Radeon 780M Graphics    
    Memory: 14.75 GB / 30.69 GB
  Binaries:
    Node: 22.10.0 - D:\Program Files\nodejs\node.EXE
    npm: 10.9.0 - D:\Program Files\nodejs\npm.CMD
    pnpm: 9.12.3 - D:\Program Files\nodejs\pnpm.CMD
  Browsers:
    Edge: Chromium (127.0.2651.74)
    Internet Explorer: 11.0.19041.4355
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests