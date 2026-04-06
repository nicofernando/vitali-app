---
number: 1168
title: Disable auto-import in Nuxt
category: Q&A
created: 2025-04-09
url: "https://github.com/unovue/shadcn-vue/discussions/1168"
upvotes: 1
comments: 2
answered: false
---

# Disable auto-import in Nuxt

Is there a way to disable auto-imports in the nuxt version of shadcn? I find that having Nuxt track all the components during development is really slowing the dev server down.

---

## Top Comments

**@sadeghbarati** [maintainer]:

Don't use `shadcn-nuxt` module and also update nuxt.config

```ts
export default defineNuxtConfig({
  imports: {
    autoImport: false,
    scan: false,
  }
})
```

**@mathieumagalhaes**:

You're looking for the `components` option in the nuxt.config file.
This is a feature handled automatically by Nuxt and isn't related to shadcn-vue, or its nuxt plugin counterpart.