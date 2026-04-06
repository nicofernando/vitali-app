---
number: 207
title: "[Bug]: [@vue/compiler-sfc] Failed to resolve extends base type. While adding button component"
type: bug
state: closed
created: 2023-12-11
url: "https://github.com/unovue/shadcn-vue/issues/207"
reactions: 13
comments: 39
labels: "[bug]"
---

# [Bug]: [@vue/compiler-sfc] Failed to resolve extends base type. While adding button component

### Environment

```bash
Developement/Production OS: MacOS 14.1.2
Node version: 20.9.0
Package manager: bun@1.0.15
Radix Vue version: latest
Shadcn Vue version: 0.1.0
Vue version: 3.3.10
Nuxt version: 3.8.2
Nuxt mode: universal
Nuxt target: server
CSS framework: tailwindcss@3.3.5
Client OS: MacOS 14.1.2
Browser: Firefox 120.0.1
```


### Link to minimal reproduction

https://github.com/hubcio2115/nuxt-chadcn

### Steps to reproduce

- add `components/ui` folder in `src` - because you cannot commit empty folders with git
- run `bun i`
- run `bunx schadcn-vue-@latest add button` 

### Describe the bug

I started a brand new project with `nuxti`, as per shadcn-vue instructions for js setup in the installation docs. Went through entire process and when I try to add `button` with the cli I get:
```bash
$ bunx shadcn-vue@latest add button
⠋ Installing components...[@vue/compiler-sfc] Failed to resolve extends base type.
If this previously worked in 3.2, you can instruct the compiler to ignore this extend by adding /* @v
ue-ignore */ before it, for example:

interface Props extends /* @vue-ignore */ Base {}

Note: both in 3.2 or with the ignore, the properties in the base type are treated as fallthrough attr
s at runtime.

anonymous.vue
4  |  import { cn } from '~/lib/utils'
5  |  
6  |  interface Props extends PrimitiveProps {
   |                          ^^^^^^^^^^^^^^
7  |    variant?: NonNullable<Parameters<typeof buttonVariants>[0]>['variant']
8  |    size?: NonNullable<Parameters<typeof buttonVariants>[0]>['size']

```

`button` folder gets added in `src/components/ui` but it doesn't get populated with the `button` component. It is specifically `button` component. When I tried to add `input`, `badge` and `alert` it worked just fine. When I tried to install `chadcn-vue` in a typescript nuxt project installing `button` works fine.

### Expected behavior

`chadcn-vue` Button component gets added to `src/components...