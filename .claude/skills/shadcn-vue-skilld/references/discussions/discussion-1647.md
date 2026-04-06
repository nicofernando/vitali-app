---
number: 1647
title: Custom registry server
category: Q&A
created: 2026-01-05
url: "https://github.com/unovue/shadcn-vue/discussions/1647"
upvotes: 1
comments: 0
answered: false
---

# Custom registry server

Hello,

I'm trying to setup my own registry server. 
I've got blocks that includes various .ts  and .vue files.   

When I use the following example it doesn't install nothing

```
{
  "$schema": "https://shadcn-vue.com/schema/registry-item.json",
  "name": "banner",
  "type": "registry:ui",
  "dependencies": ["lucide-vue-next"],
  "files": [
    {
      "path": "banner/Hello.vue",
      "type": "registry:component",
      "target": "src/components/ui-shadcnvueforge/banner/Hello.vue"
    }
  ]
}
```

If I add  "content": "<template>...</template>" it install the component but 
install it into on root in components/ui-shadcnvueforge/banner/Hello.vue  instead of  src/components/ui-shadcnvueforge/banner/Hello.vue

Moreover what is the goal of "path" attribute ?
To b...