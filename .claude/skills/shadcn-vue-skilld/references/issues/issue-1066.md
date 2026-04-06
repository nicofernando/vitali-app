---
number: 1066
title: "[Bug]: closing a dialog makes the app non-interactive"
type: bug
state: open
created: 2025-02-26
url: "https://github.com/unovue/shadcn-vue/issues/1066"
reactions: 6
comments: 8
labels: "[bug]"
---

# [Bug]: closing a dialog makes the app non-interactive

### Reproduction

open a dialog the close it (by clicking outside or on <DialogClose />)

### Describe the bug

the problem happens when the you close the dialog. after that nothing works (like links and buttons etc) and it need a full page reload

i've noticed that the dialog is now using 'reka-ui' instead of 'radix-ui' which was used before. 
i changed my dialog folder to older one that was still using 'radix-ui' and it fixed the problem

### System Info

```bash
chrome
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests