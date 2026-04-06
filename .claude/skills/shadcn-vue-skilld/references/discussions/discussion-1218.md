---
number: 1218
title: Tailwind 3 for new projects
category: Q&A
created: 2025-04-28
url: "https://github.com/unovue/shadcn-vue/discussions/1218"
upvotes: 1
comments: 1
answered: true
---

# Tailwind 3 for new projects

Is there a way to still use tailwind 3 for new projects?

---

## Accepted Answer

Thank you for the replay!

The question should be how to start a new shadcn-vue project using tailwind 3.  I was little confused since the shadcn-vue documentation states:

> Note: this is non-breaking. Your existing apps with Tailwind v3 will still work. When you add new components, they'll still be in v3 until you upgrade. Only new projects start with Tailwind v4.


### Solution

In other place in documentation I found this:

> Note: The following guide is for Tailwind v4. If you are using Tailwind v3, use shadcn-vue@1.0.3.

I conclude, the tailwind 3 components can still be used by

e.g.
`npx shadcn-vue@1.0.3 add button`


Thanks!