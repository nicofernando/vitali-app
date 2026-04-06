---
number: 883
title: "[?]: v0.11 broke support for non-tailwind users (UnoCSS)"
type: bug
state: closed
created: 2024-11-11
url: "https://github.com/unovue/shadcn-vue/issues/883"
reactions: 12
comments: 4
labels: "[bug]"
---

# [?]: v0.11 broke support for non-tailwind users (UnoCSS)

### Reproduction

https://github.com/NamesMT/starter-fullstack

### Describe the bug

Non-tailwind engines are no longer usable because latest `shadcn-nuxt` enforces `installModule('@nuxtjs/tailwindcss')`

Reproduce: update `shadcn-nuxt` in the linked reproduce repo.


### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests

---

## Top Comments

**@zernonia** [maintainer]:

The latest release for `shadcn-nuxt` has removed the auto installation for `color-mode` and `tailwindcss` module, thus this should no longer be an issue 

**@LuckyHookin** (+1):

Me too, currently I can only avoid this problem by patching shadcn-nuxt.

**@SwartZCoding** (+1):

Hello guys ! I confirm this issue happen when you use 0.11.2+ version. We cannot use anymore unocss dues to  ERROR  Could not load @nuxtjs/tailwindcss. Is it installed? when we pnpm i.
