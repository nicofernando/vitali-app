---
number: 652
title: "[Feature]: Adding charts page to website"
type: feature
state: closed
created: 2024-07-08
url: "https://github.com/unovue/shadcn-vue/issues/652"
reactions: 14
comments: 8
labels: "[enhancement]"
---

# [Feature]: Adding charts page to website

### Describe the feature

With the new release of `shadcn/ui` and it's `charts` page, we would need a new `charts` page and new chart samples.

This shouldn't be a time consuming task, as we have the base components.

### Additional information

- [X] I intend to submit a PR for this feature.
- [ ] I have already implemented and/or tested this feature.

---

## Top Comments

**@zernonia** [maintainer] (+2):

Yo @Saeid-Za .. not sure how far along with your PR. As `shadcn` has released the official Chart I'm planning to update the chart component, especially the Base Chart to reflect the similar API as in the original. 


**@Furukuku** (+2):

> > :show-x-axis="true"
> > :show-y-axis="true"
> > :xFormatter="(tick: any) => tick"
> 
> did you ever figure this out?

I've found the issue:

This is the provided css from shadcn-vue charts:
```
@layer base {
  :root {
    /* ... */
    --vis-tooltip-background-color: none !important;
    --vis-tooltip-border-color: none !important;
    --vis-tooltip-text-color: none !important;
    --vis-tooltip-shadow-color: none !important;
    --vis-tooltip-backdrop-filter: none !important;
    --vis-tooltip-padding: none !important;

...

**@Kokleng-Dev** (+1):

1+,
I copy paste from shadcn-vue example website and it doen't show x axis and y axis. i don't know why?

<img width="827" alt="Screenshot 2025-01-03 at 1 17 59 in the morning" src="https://github.com/user-attachments/assets/f95fe5e8-484f-4c2b-9bfa-59d9ea546336" />


...