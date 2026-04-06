---
number: 1236
title: Installed component differs from the one in source code
category: Q&A
created: 2025-05-09
url: "https://github.com/unovue/shadcn-vue/discussions/1236"
upvotes: 1
comments: 1
answered: true
---

# Installed component differs from the one in source code

Hi. I'm trying to understand why a component installed via npm is different than what is in the source file on GitHub?

For example, installing the `Command` component using `npx shadcn-vue@latest add command`.

The classes are different, ie. the installed one has `py-3` which is a lot, while the one from source has `py-1.5`.

style: New York

**Installed:**
```
<ListboxItem
    v-if="isRender"
    v-bind="forwarded"
    :id="id"
    ref="itemRef"
    data-slot="command-item"
    :class="cn(`data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-3 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`, props.class)"
    @select="() => {
      filterState.search = ''
    }"
  >
    <slot />
  </ListboxItem>
```...

---

## Accepted Answer

Ok I just realized the default versions code is in  the `v4` folder.