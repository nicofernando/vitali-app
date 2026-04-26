<script setup lang="ts">
import type { CollapsibleTriggerProps } from 'reka-ui'
import { CollapsibleTrigger, useForwardProps } from 'reka-ui'

const props = defineProps<CollapsibleTriggerProps>()
const forwardedProps = useForwardProps(props)
</script>

<template>
  <CollapsibleTrigger
    data-slot="collapsible-trigger"
    v-bind="forwardedProps"
  >
    <slot />
  </CollapsibleTrigger>
</template>
