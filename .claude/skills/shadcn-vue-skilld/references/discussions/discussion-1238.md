---
number: 1238
title: I need some details about forms
category: Q&A
created: 2025-05-11
url: "https://github.com/unovue/shadcn-vue/discussions/1238"
upvotes: 1
comments: 1
answered: true
---

# I need some details about forms

I just started to use shadcn-vue, it I great but also a major shift from what I was used to with other libraries (primevue, quasar).

The major problem I have now is with forms.

### `<form>` or `<Form>`?

The example for the `Form` component  uses `Form` but the example for `Checkbox`  uses `form`.  I used `form` and it works but this is a bit weird when there is `Form` available.

### `value`, `handleChange`, ...

Consider this code

```vue
<FormField 
  v-slot="{ value, handleChange }" 
  name="languageIds" 
  type="checkbox" 
  :unchecked-value="false" 
  v-for="lang in allLanguages" 
  :key="lang.id" 
  :value="lang.id"
>
```

It works but where d...

---

## Accepted Answer

As this is based on `vee-validate` you should check their docs as well. Regarding `value` and `handleChange`, it is something `FormField` provides using VueJs slots.