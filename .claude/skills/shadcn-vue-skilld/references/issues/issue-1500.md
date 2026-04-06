---
number: 1500
title: "[Bug]: TypeScript syntax error when installing sidebar component in JavaScript project"
type: bug
state: open
created: 2025-10-21
url: "https://github.com/unovue/shadcn-vue/issues/1500"
reactions: 4
comments: 4
labels: "[bug, detypes]"
---

# [Bug]: TypeScript syntax error when installing sidebar component in JavaScript project

### Reproduction

npm create vite@latest my-project

### Describe the bug

I'm trying to install the shadcn-vue sidebar component in a pure JavaScript project. Although I've set "typescript": false in my components.json , the installation still fails with the following error:

```
[@vue/compiler-sfc] Failed to resolve import source ".". 

ui/sidebar/Sidebar.vue                                              
12 |  })                                                            
13 |                                                                
14 |  const props = withDefaults(defineProps<SidebarProps>(), {     
   |                                         ^^^^^^^^^^^^           
15 |    side: "left",                                               
16 |    variant: "sidebar",
```
The error is ...