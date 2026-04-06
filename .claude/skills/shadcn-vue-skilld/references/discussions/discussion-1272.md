---
number: 1272
title: What is the recommended workflow for updating components after a new release?
category: Q&A
created: 2025-05-27
url: "https://github.com/unovue/shadcn-vue/discussions/1272"
upvotes: 1
comments: 1
answered: true
---

# What is the recommended workflow for updating components after a new release?

Hi! I’m using shadcn-vue in my project and I add components using the CLI (not by manual copy/paste).

When a new release or bug fix comes out, what’s the recommended process for updating the components I’ve already installed via the CLI?

-  Should I run the CLI again for each component I want to update?
-  Will the CLI overwrite my local changes or customizations?
-  What’s the safest workflow to keep everything up to date, especially if I’ve made some custom changes?

I’d appreciate any guidance or best practices for handling updates with the CLI.  

Thanks!

---

## Accepted Answer

**@sadeghbarati** [maintainer]:

First, set up Git in your project to enable access to the previous code history. This is important if you want to discard recent changes.

Keep in mind that using the CLI will overwrite your local changes. To avoid losing work, use `shadcn-vue` and the `diff` command to review differences and selectively apply updates.

You can use `diff` and copy the output into the AI chat to help apply the changes. Additionally, you can use `#fetch` in Copilot Chat to retrieve the latest registry updates for more accurate modifications.
