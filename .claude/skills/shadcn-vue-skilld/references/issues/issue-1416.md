---
number: 1416
title: "[Bug]: `shadcn-nuxt` resolving same components with same name"
type: bug
state: closed
created: 2025-09-15
url: "https://github.com/unovue/shadcn-vue/issues/1416"
reactions: 8
comments: 11
labels: "[bug]"
---

# [Bug]: `shadcn-nuxt` resolving same components with same name

### Reproduction

https://codesandbox.io/p/devbox/3847py

### Describe the bug

Two component files resolving to the same name Button:                                                                                 

 - E:/saas-test/app/components/ui/button/index.ts
 - E:/saas-test/app/components/ui/button/Button.vue

### System Info

```bash
-
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests

---

## Top Comments

**@sadeghbarati** [maintainer] (+10):

> wait what this project is about to be abandoned??? this can't be true :(

Nope, but it's hard to manage the UnoVue org alone, I mean the Zernonia, he is carrying the `reka` and new `charts` API to match the `recharts` API, and also working on the `v4-docs` branch


Related https://github.com/unovue/shadcn-vue/discussions/1370

**@sadeghbarati** [maintainer] (+8):

```
https://pkg.pr.new/shadcn-nuxt@1418
```

For now, use this link for `shadcn-nuxt`, remove shadcn-nuxt and add it again with the link above, also check this comment here

https://github.com/unovue/shadcn-vue/discussions/1370#discussioncomment-14401143

**@sadeghbarati** [maintainer] (+4):

Please try latest `shadcn-nuxt`