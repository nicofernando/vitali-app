---
number: 1213
title: How to Change the Ring Color Variable in shadcn-vue?
category: Q&A
created: 2025-04-26
url: "https://github.com/unovue/shadcn-vue/discussions/1213"
upvotes: 1
comments: 2
answered: true
---

# How to Change the Ring Color Variable in shadcn-vue?

I'm working on an application and I want to customize the ring color used throughout my app.



How can I change the default focused ring color variable so that all components will be affected?

I do not want to go into every component and change it manually!

btw I use tailwindcss v3.4.1


---

## Accepted Answer

I get it! To globally change the ring color, you can override the `--ring` variable in your main CSS file.

Here’s how I did it:
```css
/* --ring: 0 0% 3.9%; */
--ring: 180 39% 52%;
```

The value `180 39% 52%` represents the following HSL (Hue, Saturation, Lightness) color model `hsl(180, 39%, 52%)`