---
number: 1118
title: How should I bind up NuxtLink with Button?
category: Q&A
created: 2025-03-21
url: "https://github.com/unovue/shadcn-vue/discussions/1118"
upvotes: 1
comments: 1
answered: true
---

# How should I bind up NuxtLink with Button?

I think this is an issue with Nuxt but I don't know how should I achieve this. I have some buttons, and links to redirect users, but seems like the `NuxtLink` will have the styles and more like a real element, which will actually bring a Button with NuxtLink into two elements:
The outter `NuxtLink`:

The inner `Button`:

```vue
      <NuxtLinkLocale :to="item.link" class="rounded-full">
        <Button
          class="my-2 rounded-full font-semibold text-2xl px-12 py-6 justify-center items-center relative"
          :disabled="item.disabled"
          variant="ghost"
        >
          {{ t(item.name_key) }}

          <Icon
            v-if="item.isExternal"
            icon="lucide:external-link"
            class="w-6 h-6 absolute right-4 top-1/2 -translate-y-1/2"
          />
        </Button>
      </NuxtLinkLocale>
```...

---

## Accepted Answer

> This should be true that I finally still choose to keep the two nested components, the outside one is Nuxt Link, and the inner one is the button, which works fine but looks weird especially when for a11y or the tab select, where user can select two nested buttons.
> 
> Not to compare but Next.js should not have this issue, where I think they might render the Link component in a special way.

If you are wrapping a Button with `NuxtLink` you should use the `custom` prop on nuxtlink to prevent it from rendering an `a` tag around its contents.