<script setup lang="ts">
import type { CollapsibleTriggerProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { CollapsibleTrigger, useForwardProps } from 'reka-ui'

const props = defineProps<CollapsibleTriggerProps>()
const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CollapsibleTrigger
    data-slot="collapsible-trigger"
    v-bind="forwardedProps"
  >
    <slot />
  </CollapsibleTrigger>
</template>
