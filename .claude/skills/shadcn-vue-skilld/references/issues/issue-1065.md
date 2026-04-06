---
number: 1065
title: "[Feature]: Add option CLI to skip overwriting the `utils` file"
type: other
state: open
created: 2025-02-26
url: "https://github.com/unovue/shadcn-vue/issues/1065"
reactions: 9
comments: 0
---

# [Feature]: Add option CLI to skip overwriting the `utils` file

### Describe the feature

### Description
Currently, the CLI tool has an -o (or --overwrite) option that allows overwriting files. In my case, I haven't installed the `@tanstack/vue-table` package, which is required for the utils file.





### Feature Request
I would like to request a new option, such as `--skip-utils` or similar, that would allow the user to skip the `utils` file during the file generation or update process. This would help users who don't have the required dependencies for that file and want to avoid errors or unnecessary overwrites.

### Additional information

- [ ] I intend to submit a PR for this feature.
- [ ] I have already implemented and/or tested this feature.