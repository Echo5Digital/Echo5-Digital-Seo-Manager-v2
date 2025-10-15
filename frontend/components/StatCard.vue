<template>
  <div class="card">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      <div :class="`text-3xl text-${color}-600`">
        {{ iconMap[icon] || '📊' }}
      </div>
    </div>
    
    <p :class="`text-3xl font-bold text-${color}-600`">
      {{ formattedValue }}
    </p>
    
    <p v-if="change" class="text-sm mt-2" :class="changeClass">
      {{ change > 0 ? '↑' : '↓' }} {{ Math.abs(change) }}%
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  value: {
    type: [Number, String],
    required: true,
  },
  icon: {
    type: String,
    default: 'chart',
  },
  color: {
    type: String,
    default: 'primary',
  },
  change: {
    type: Number,
    default: null,
  },
})

const iconMap = {
  users: '👥',
  clipboard: '📋',
  search: '🔍',
  chart: '📊',
  check: '✓',
  alert: '⚠️',
}

const formattedValue = computed(() => {
  if (typeof props.value === 'number' && props.value > 1000) {
    return (props.value / 1000).toFixed(1) + 'K'
  }
  return props.value
})

const changeClass = computed(() => {
  if (props.change > 0) return 'text-success-600'
  if (props.change < 0) return 'text-danger-600'
  return 'text-gray-600'
})
</script>
