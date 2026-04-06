---
number: 1210
title: how to adjust select components size?
category: Q&A
created: 2025-04-25
url: "https://github.com/unovue/shadcn-vue/discussions/1210"
upvotes: 1
comments: 2
answered: true
---

# how to adjust select components size?

I would like to ask, how can I reduce the selection box, like the red one in the picture?



---

## Accepted Answer

has data-size options:
```js
<SelectTrigger data-size="sm"></SelectTrigger>
```