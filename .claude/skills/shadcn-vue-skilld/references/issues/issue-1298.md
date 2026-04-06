---
number: 1298
title: "[Bug]: Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module /node_modules/brace-expansion/index.js in a cycle. (from /node_modules/minimatch/dist/commonjs/index.js)"
type: bug
state: closed
created: 2025-06-12
url: "https://github.com/unovue/shadcn-vue/issues/1298"
reactions: 13
comments: 7
labels: "[bug]"
---

# [Bug]: Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module /node_modules/brace-expansion/index.js in a cycle. (from /node_modules/minimatch/dist/commonjs/index.js)

### Reproduction

npx shadcn-vue@latest init

### Describe the bug

Calling "npx shadcn-vue@latest init" gives the error. I resolved it by going back to 2.1.0

### System Info

```bash
System:
    OS: Linux 6.8 Ubuntu 22.04.5 LTS 22.04.5 LTS (Jammy Jellyfish)
    CPU: (8) x64 Intel(R) Core(TM) i5-1035G1 CPU @ 1.00GHz
    Memory: 4.46 GB / 23.24 GB
    Container: Yes
    Shell: 5.1.16 - /bin/bash
  Binaries:
    Node: 22.13.0 - ~/.nvm/versions/node/v22.13.0/bin/node
    Yarn: 1.22.22 - ~/.nvm/versions/node/v22.13.0/bin/yarn
    npm: 11.1.0 - ~/.nvm/versions/node/v22.13.0/bin/npm
    pnpm: 10.12.1 - ~/.nvm/versions/node/v22.13.0/bin/pnpm
  npmPackages:
    nuxt: ^3.17.5 => 3.17.5 
    shadcn-nuxt: ^2.1.0 => 2.2.0 
    vue: ^3.5.16 => 3.5.16
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests

---

## Top Comments

**@sadeghbarati** [maintainer] (+2):

<details><summary>Node v22.16.0</summary>
<p>



...

**@sadeghbarati** [maintainer]:

Hi All  

Can you guys test this, and see if the issue is gone?

```
npm i https://pkg.pr.new/shadcn-vue@1442
```


install it and then add the script to package.json like

```json
{
  "scripts": {
    "shadcn-vue": "shadcn-vue"
  }
}
```

and use it like

```
npm run shadcn-vue init/add/...
```

**@orenmizr**:

Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() E...
node v22.14.0

on trying to install table :/ worked around by using `pnpm dlx shadcn-vue@2.1.0 add 
table` 

does anyone what the effect of using 2.1.0 vs 2.2.0 in terms of output ? 