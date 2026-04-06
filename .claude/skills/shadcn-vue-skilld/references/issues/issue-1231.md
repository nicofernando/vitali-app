---
number: 1231
title: "[Bug]: Command and Combobox doesn't work inside of dialog."
type: bug
state: open
created: 2025-05-05
url: "https://github.com/unovue/shadcn-vue/issues/1231"
reactions: 7
comments: 9
labels: "[bug, upstream]"
---

# [Bug]: Command and Combobox doesn't work inside of dialog.

### Reproduction

  <template>     <div class="mx-auto flex items-center justify-center">         <Combobox v-model="value" by="label">             <ComboboxAnchor as-child>                 <ComboboxTrigger as-child>                     <Button variant="outline" class="justify-between">                         {{ value?.label ?? 'Select framework' }}                          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />                     </Button>                 </ComboboxTrigger>             </ComboboxAnchor>              <ComboboxList>                 <div class="relative w-full max-w-sm items-center">                     <Co...