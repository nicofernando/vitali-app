<script setup lang="ts">
import { AlertDialogAction } from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <AlertDialogAction
    v-bind="$attrs"
    :class="cn('inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', $attrs.class as string)"
  >
    <slot />
  </AlertDialogAction>
</template>
