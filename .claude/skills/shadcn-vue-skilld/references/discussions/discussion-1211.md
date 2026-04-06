---
number: 1211
title: checkbox icon is not centered when checked
category: Q&A
created: 2025-04-26
url: "https://github.com/unovue/shadcn-vue/discussions/1211"
upvotes: 1
comments: 1
answered: true
---

# checkbox icon is not centered when checked

I used the checkbox directly, but the icon was not centered. 



---

## Accepted Answer

```css
.lucide {
  width: 24px;
  height: 24px;
  stroke-width: 2px;
}
```
It turned out that I modified the global icon.