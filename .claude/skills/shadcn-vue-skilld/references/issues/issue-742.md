---
number: 742
title: "[Feature]: Update Components to Vue 3.5 Reactive Props Destructure"
type: question
state: open
created: 2024-08-30
url: "https://github.com/unovue/shadcn-vue/issues/742"
reactions: 6
comments: 6
labels: "[enhancement, help wanted]"
---

# [Feature]: Update Components to Vue 3.5 Reactive Props Destructure

### Describe the feature

```diff
<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { AccordionItem, type AccordionItemProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'

- const props = defineProps<AccordionItemProps & { class?: HTMLAttributes['class'] }>()
+ const { class: className, ...props } = defineProps<AccordionItemProps & { class?: HTMLAttributes['class'] }>()

- const delegatedProps = computed(() => {
-  const { class: _, ...delegated } = props
- return delegated
- })


- const forwardedProps = useForwardProps(delegatedProps)
+ const forwardedProps = useForwardProps(props)
</script>

<template>
  <AccordionItem
    v-bind="forwardedProps"
-    :class="cn('border-b', props.class)"
+    :class="cn('border-b', className)"
  >
    <slot />
  </AccordionItem>
</template>
```

### Additional information

- [ ] I intend to submit a PR for this feature.
- [ ] I have already implemented and/or tested this feature.