<script setup lang="ts">
import { AlertDialogTrigger } from 'reka-ui'
</script>

<template>
  <AlertDialogTrigger v-bind="$attrs">
    <slot />
  </AlertDialogTrigger>
</template>
