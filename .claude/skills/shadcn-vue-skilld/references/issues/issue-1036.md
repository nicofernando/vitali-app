---
number: 1036
title: Installation docs out of step with Tailwind 4.0?
type: other
state: closed
created: 2025-02-12
url: "https://github.com/unovue/shadcn-vue/issues/1036"
reactions: 21
comments: 15
---

# Installation docs out of step with Tailwind 4.0?

Hello, and thank you for this awesome project!

I'm trying to use shadcn-vue but I'm running into some issues. Here's what I've tried so far:

- Create new Vue project with `pnpm create vue@latest`
- Follow Tailwind 4.0 installation docs (note: using the Vite plugin method, not PostCSS)
- Follow shadcn-vue installation docs

It's confusing me a bit that the shadcn-vue docs have me install Tailwind, but using different steps than the official Tailwind docs. For example, the Tailwind docs don't mention `autoprefixer`, but the shadcn-vue docs do. Also shadcn-vue says to install Tailwind as a dev dependency, while the Tailwind docs do not. I'm not sure which method I should be using to install Tailwind.

I would be happy to help with a PR to update the documentation to make it a bit more in sync with Tailwind, and friendlier for beginners!

---

## Top Comments

**@mhaib** (+4):

@whiteair Tailwind 4 is not yet supported, so the dependency needs to be downgraded to Tailwind 3 with `tailwindcss@3`


**@guhweb** (+3):

I did what @pushpan999 mentioned and got an overwhelming result! Here I'm running tailwindcss@4.0.1 together with shadcn (although it doesn't offer official support yet).

To convert the colors from hsl to oklch format, I used the website https://oklch.com/ and got the following results.

I took into account tailwind.config.js, which would be created in the tailwind@3 format, and I simply rewrote it to the new format accepted directly in style.css.

...

**@kakauandme** (+3):

Looks like Tailwind 4 is not supported yet.