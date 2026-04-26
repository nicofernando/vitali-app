<script setup lang="ts">
import type { CollapsibleContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { CollapsibleContent, useForwardProps } from 'reka-ui'

const props = defineProps<CollapsibleContentProps>()
const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CollapsibleContent
    data-slot="collapsible-content"
    class="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up"
    v-bind="forwardedProps"
  >
    <slot />
  </CollapsibleContent>
</template>
