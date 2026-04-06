---
number: 34
title: I know it's crazy, maybe `UnoCSS` support? 
type: other
state: open
created: 2023-09-08
url: "https://github.com/unovue/shadcn-vue/issues/34"
reactions: 30
comments: 34
---

# I know it's crazy, maybe `UnoCSS` support? 



---

## Top Comments

**@Dunqing** [maintainer] (+5):

I'm interested in this, but maybe I need more time to do this.

**@JessicaSachs** (+8):

I wrote up some steps in my Discord for someone looking for something to work on, but I'm not sure if he's got interest or bandwidth to work on it. I figured I'd post it publicly.

### Actual
The examples inside of the radix-vue documentation don't work because of lack of support for a lot of the more complex TailwindCSS `/` for opacity, `group-hover-data` or as UnoCSS would do `group:hover:data-`.

1. There's examples in the Accordion that I want to work with `unocss.config.js` files, not just `tailwind.config.js` files, si...

**@zouhangwithsweet** (+5):

Yeah. I am working on `unocss-preset-shadcn` to support vue-shadcn. Just test `button` & `accordion`. It works well.
Check: https://github.com/fisand/unocss-preset-shadcn/blob/main/vue-shadcn/App.vue. And I will test all components in the near future.