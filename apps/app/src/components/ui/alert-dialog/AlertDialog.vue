<script setup lang="ts">
import { AlertDialogRoot } from 'reka-ui'

const props = defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <AlertDialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <slot />
  </AlertDialogRoot>
</template>
