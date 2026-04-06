---
number: 1281
title: How to set a select options in Shadcn-vue AutoForm with Zod schema?
category: Q&A
created: 2025-05-30
url: "https://github.com/unovue/shadcn-vue/discussions/1281"
upvotes: 1
comments: 1
answered: true
---

# How to set a select options in Shadcn-vue AutoForm with Zod schema?

I'm using ShadCN Vue with `AutoForm` and `zod` for schema validation. I'm trying to dynamically populate the `select` options for a field named `accounts` using an array of account objects.

My code:
...

---

## Accepted Answer

Thanks to Navid Abedini and from the  ShadCN Vue docs, I found it:

### 1. Single-Select “enum” Solution

Navid Abedini pointed out (and it works) that AutoForm’s default `<select>` support is tied to Zod’s `z.enum(...)`. In other words, if your schema uses `z.enum([...])` for that field, AutoForm will automatically render a `<select>` with those enum values:

...