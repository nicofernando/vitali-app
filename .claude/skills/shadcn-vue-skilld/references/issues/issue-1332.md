---
number: 1332
title: "[Bug]: Error when Installing line-chart"
type: bug
state: closed
created: 2025-07-06
url: "https://github.com/unovue/shadcn-vue/issues/1332"
reactions: 10
comments: 5
labels: "[bug]"
---

# [Bug]: Error when Installing line-chart

### Reproduction

try to install npx shadcn-vue@latest add chart-line 

### Describe the bug

```
npx shadcn-vue@latest add chart-line 
⠧ Checking registry.                                                                                                                                8:09:04 PM

Something went wrong. Please check the error below for more details.                                                            8:09:04 PM
If the problem persists, please open an issue on GitHub.                                                                        8:09:04 PM
                                                                                                                                8:09:04 PM
Failed to fetch from https://shadcn-vue.com/r/styles/new-york-v4/chart-line.json.                                               8:09:04 PM
Unexpected token '<', "<!DOCTYPE "... is not valid JSON```
                                                         `

### System Info

```bash
System:
    OS: macOS 15.5
    CPU: (8) arm64 Apple M1
    Memory: 89.31 MB / 16.00 GB
    Shell: 5.9 - /bin/zsh
  Binaries:
    Node: 20.18.3 - ~/.nvm/versions/node/v20.18.3/bin/node
    Yarn: 1.22.11 - /opt/homebrew/bin/yarn
    npm: 10.8.2 - ~/.nvm/versions/node/v20.18.3/bin/npm
  Browsers:
    Chrome: 137.0.7151.120
    Safari: 18.5
  npmPackages:
    @vueuse/core: ^12.8.2 => 12.8.2 
    vue: ^3.5.13 => 3.5.17
```

### Contributes

- [ ] I am willing to submit a PR to fix this issue
- [ ] I am willing to submit a PR with failing tests

---

## Top Comments

**@sadeghbarati** [maintainer]:

Hi  

The Charts will not be part on TailwindCSS **v4** registry that is why latest `shadcn-vue@latest` CLI is not working 

Charts will be part of `shadcn-vue-extended` repository https://github.com/unovue/shadcn-vue/issues/1077
This may take time 


---

But if you really need the `Charts` you can use `shadcn-vue@radix` tag for adding Chart components which fetch TailwindCSS **v3** registry


```
npx shadcn-vue@radix add chart-line
```

**@DoniLite**:

Rigth i have the same bug with the `pnpm` shadcn-vue cli:

```
❯ pnpm dlx shadcn-vue@latest add chart-line
⠹ Checking registry.                                                                    2:18:51 PM

[2:18:51 PM] Something went wrong. Please check the error below for more details.
If the problem persists, please open an issue on GitHub.            2:18:51 PM
                                                                    2:18:51 PM
Failed to fetch from https://shadcn-vue.com/r/index.json.           2:18:51 PM
[GET] "https://shadcn-vue.com/r/index.json": <no response> fetch failed
                                                                    2:18:51 PM

...

**@furatamasensei**:

Same here.

```
pnpm dlx shadcn-vue@latest add chart-area

⠸ Checking registry.                                                                                                                                                                               1:58:37 PM

Something went wrong. Please check the error below for more details.                                                                                                           1:58:37 PM
If the problem persists, please open an issue on GitHub.                                                                                                                       1:58:37 PM
                                                                                                                                                                               1:58:37 PM
Failed to fetch from https://shadcn-vue.com/r/styles/new-york-v4/chart-area.json.                                                                                              1:58:37 PM
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```...