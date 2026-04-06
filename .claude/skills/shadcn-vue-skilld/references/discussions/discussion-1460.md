---
number: 1460
title: Getting error when installing Sidebar component
category: Q&A
created: 2025-10-08
url: "https://github.com/unovue/shadcn-vue/discussions/1460"
upvotes: 2
comments: 2
answered: false
---

# Getting error when installing Sidebar component

Hey everyone,

When I run `npx shadcn-vue@latest add sidebar`

I'm getting this error:

```
Something went wrong. Please check the error below for more details.
If the problem persists, please open an issue on GitHub.         

[@vue/compiler-sfc] Failed to resolve import source ".".           

ui/sidebar/Sidebar.vue
12 |  })
13 |  
14 |  const props = withDefaults(defineProps<SidebarProps>(), {
   |                                         ^^^^^^^^^^^^
15 |    side: "left",
16 |    variant: "sidebar",
```

This is what my components.json looks like:

```
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "typescript": false,
  "tailwind": {
    "config": "",
    "css": "src/assets/style.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib"
  },
  "iconLibrary": "lucide"
}
```...

---

## Top Comments

**@gespinha**:

After further examination the problem is happening when installing javascript version of the Sidecar component with `"typescript": false`

- v3 typescript: WORKS
- **v3 javascript: FAILS**
- v4 typescript: WORKS
- **v4 javascript: FAILS**

**@gespinha**:

Logged this as a bug #1463 