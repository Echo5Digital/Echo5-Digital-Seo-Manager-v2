<template>
  <Teleport to="body" v-if="show">
    <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

// Close on escape key
watch(() => props.show, (isShown) => {
  if (isShown) {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        emit('close')
      }
    }
    window.addEventListener('keydown', handleEscape)
    
    onUnmounted(() => {
      window.removeEventListener('keydown', handleEscape)
    })
  }
})
</script>
