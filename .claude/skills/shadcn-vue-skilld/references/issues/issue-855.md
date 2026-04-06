---
number: 855
title: "[Feature]: One-Click JavaScript Initialization Option Pls!!"
type: other
state: open
created: 2024-11-01
url: "https://github.com/unovue/shadcn-vue/issues/855"
reactions: 6
comments: 0
---

# [Feature]: One-Click JavaScript Initialization Option Pls!!

### Describe the feature

Hi  

Thanks for all the great work on this project! I’ve encountered a bit of friction when setting up with JavaScript instead of TypeScript and wanted to propose a potential improvement.

Currently, when using **Vite** or **Nuxt** with `npx shadcn-vue@latest init`, JavaScript users have to:
1. Manually configure and convert the setup from TypeScript to JavaScript (renaming files, removing `tsconfig.json`, and stripping type annotations).
2. Only then can they proceed with `npx shadcn-vue@latest init`.

### Feature Suggestion
Would it be possible to add an option for **JavaScript-only initialization** directly in the `npx shadcn-vue@latest init` command? This could work with a flag like `--js`, which would:
- Set up the project with JavaScript files instead of TypeScript.
- Automatically handle the Vite or Nuxt initialization without requiring users to manually convert TypeScript files to JavaScript.

This option would make the process more straightforward for JavaScript users, allowing them to get started without manual conversion steps and reducing potential configuration errors.

Thanks for considering this improvement! Looking forward to any thoughts on making this setup more JavaScript-friendly.



### Additional information

- [ ] I intend to submit a PR for this feature.
- [ ] I have already implemented and/or tested this feature.