<script setup lang="ts">
import type { CollapsibleContentProps } from 'reka-ui'
import { CollapsibleContent, useForwardProps } from 'reka-ui'

const props = defineProps<CollapsibleContentProps>()
const forwardedProps = useForwardProps(props)
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
