---
number: 1457
title: Can't download the correct version of a component
category: Q&A
created: 2025-10-07
url: "https://github.com/unovue/shadcn-vue/discussions/1457"
upvotes: 1
comments: 1
answered: true
---

# Can't download the correct version of a component

Hey,

When I run `npx shadcn-vue@latest add sonner` on my project, I get this component:

...

---

## Accepted Answer

**@sadeghbarati** [maintainer]:

> but if I want v4 I'd have this: "style": "new-york-v4"

No keep it as-is --> `new-york`

shadcn-vue CLI `FALLBACK_STYLE` is `new-york-v4`



```ts
function resolveStyleFromConfig(config: Partial<Config> | Config) {
  if (!config.style) {
    return FALLBACK_STYLE
  }

  // Check if we should use new-york-v4 for Tailwind v4.
  // We assume that if tailwind.config is empty, we're using Tailwind v4.
  if (config.style === "new-york" && config.tailwind?.config === "") {
    return FALLBACK_STYLE
  }

  return config.style
}
```

based on the code 

- if there is no `style` in `components.json` file, fallback to `new-york-v4`

- if the style value is `new-york` and `tailwind['config']` is empty, also fallback to `new-york-v4`

- if style value is `new-york` but `tailwind['config']` is **NOT** empty pick `new-york` **v3** registry

- if style value is `default`, pick the `default` **v3** registry


---

Keep that in mind...