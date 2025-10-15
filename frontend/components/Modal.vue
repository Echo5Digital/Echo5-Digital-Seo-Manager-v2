<template>
  <Teleport to="body" v-if="show">
    <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <!-- Modal Header -->
          <div v-if="$slots.title" class="bg-white px-6 pt-5 pb-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900" id="modal-title">
                <slot name="title" />
              </h3>
              <button @click="$emit('close')" type="button" class="text-gray-400 hover:text-gray-500">
                <XMarkIcon class="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <!-- Modal Content -->
          <div class="bg-white px-6 py-4">
            <slot name="content">
              <slot />
            </slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'
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
