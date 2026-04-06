---
number: 357
title: "[Feature]: Support RTL in shadcn components"
type: feature
state: open
created: 2024-02-21
url: "https://github.com/unovue/shadcn-vue/issues/357"
reactions: 11
comments: 12
labels: "[enhancement]"
---

# [Feature]: Support RTL in shadcn components

### Describe the feature

It seems that components use left and right values from tailwindcss 
i would recommend using start and end so it supports RTL and LTR directions in projects

so instead of `pr-1` , `ml-2` ...
we use `pe-1`, `ms-2`
And so on 

also in components that have Chevron icons 
we should add `rtl:rotate-180` class so we make sure when we change direction arrow rotate

Tasks:
- [ ]  use ( `start-, end-` / `ps-, pe-` / `ms-, me- `/ ... ) instead of (`left-, right-` / `pl-, pr-` / `ml-, mr-` / ... )
- [ ]  add rotation transformation to chevrons that point to direction 
- [ ]  related bug https://github.com/radix-vue/radix-vue/issues/719


### Additional information

- [X] I intend to submit a PR for this feature.
- [ ] I have already implemented and/or tested this feature.