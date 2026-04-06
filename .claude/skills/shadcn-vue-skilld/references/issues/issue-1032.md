---
number: 1032
title: "[Bug]: Select Dropdown is extremely slow"
type: bug
state: open
created: 2025-02-06
url: "https://github.com/unovue/shadcn-vue/issues/1032"
reactions: 14
comments: 4
labels: "[bug]"
---

# [Bug]: Select Dropdown is extremely slow

### Reproduction

https://stackblitz.com/edit/dmthremm-v1auafop?file=src%2FApp.vue

### Describe the bug

Our use case is a timezone selector. This has 418 timezones are per current IANA zone list, but makes the entire page very laggy (in our app, this dropdown in the example causes input lag, in stackblitz it is very slow to open/scroll, but does not cause input lag

### System Info

```bash
Stackblitz
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests

---

## Top Comments

**@mkeyy0**:

The same issue for me, any updates on this one? I'm not sure how the select component is implemented, but maybe it needed to be refactored with the listbox component to improve the performance? And also to have an option to use virtual scroll in the same way as with the combobox component? 

Or as an option, shadcn select can be refactored to use the Listbox component instead of Select from `reka-ui` what do you think?

**@MasterShu**:

I'm also experiencing similar performance issues when using the select component with large datasets (400 options in my case). 

**@atymic**:

Okay, looks like this issue also applies to the command box, in both reka-ui and radix.
Any suggestions on where to look or if you are open to fixing this? It's a bit of a dealbreaker.