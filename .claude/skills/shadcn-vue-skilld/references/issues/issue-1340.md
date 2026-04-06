---
number: 1340
title: "[Feature]: nuxt 4 support"
type: other
state: closed
created: 2025-07-20
url: "https://github.com/unovue/shadcn-vue/issues/1340"
reactions: 33
comments: 17
---

# [Feature]: nuxt 4 support

### Describe the feature

Hello nice people of shadcn-vue!

Since release of nuxt 4 

https://nuxt.com/blog/v4#better-typescript-experience

proccess of creating typescript configuration is changed. Installation now failing and modules wont auto-import.

any chance of nuxt 4 support?

### Additional information

- [ ] I intend to submit a PR for this feature.
- [ ] I have already implemented and/or tested this feature.

---

## Top Comments

**@Prains** (+24):

> Most likely the same issue. Here you can see the output from the init command.
> 
> ❯ npx shadcn-vue@latest init
>  Preflight checks.
>  Verifying framework. Found Nuxt.
>  Validating Tailwind CSS config. Found v4.
>  Validating import alias.
>                                                                                                                                                                                                                                                                                                                                                              ...

**@damvik** (+9):

Most likely the same issue. Here you can see the output from the init command.

```bash
❯ npx shadcn-vue@latest init
✔ Preflight checks.
✔ Verifying framework. Found Nuxt.
✔ Validating Tailwind CSS config. Found v4.
✖ Validating import alias.
                                                                                                                                                                                                                                                                                                                                                               5:35:45 PM
No import alias found in your tsconfig.json file.                                                                                                                                                                                                                                                                                                              5:35:45 PM
Visit https://shadcn-vue.com/docs/installation/nuxt to learn how to set an import alias.
```...

**@Fanreza** (+7):

Im extends the Nuxt tsconfig since its already have path configuration

```json
{
	// https://nuxt.com/docs/guide/concepts/typescript
	"files": [],
	"extends": "./.nuxt/tsconfig.json",
	"references": [
		{
			"path": "./.nuxt/tsconfig.app.json"
		},
		{
			"path": "./.nuxt/tsconfig.server.json"
		},
		{
			"path": "./.nuxt/tsconfig.shared.json"
		},
		{
			"path": "./.nuxt/tsconfig.node.json"
		}
	]
}

```