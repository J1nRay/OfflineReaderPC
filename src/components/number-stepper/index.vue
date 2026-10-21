<script lang="ts" setup>
import { computed } from 'vue';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  min: number;
  max: number;
  step?: number;
  /** 小数位数 */
  precision?: number;
  unit?: string;
  disabled?: boolean;
}>(), {
  step: 1,
  precision: 0,
  unit: '',
  disabled: false
});

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

const round = (value: number) => Number(value.toFixed(props.precision));
const clamp = (value: number) => Math.min(props.max, Math.max(props.min, round(value)));

const display = computed(() => round(props.modelValue).toFixed(props.precision));

const adjust = (delta: number) => emit('update:modelValue', clamp(props.modelValue + delta));

const onChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    input.value = display.value;
    return;
  }
  const next = clamp(value);
  input.value = next.toFixed(props.precision);
  emit('update:modelValue', next);
};

const onEnter = (e: KeyboardEvent) => (e.target as HTMLInputElement).blur();
</script>

<template>
  <div :class="['rc-stepper', disabled ? 'disabled' : '']">
    <button type="button" class="rc-stepper-btn" :disabled="disabled || modelValue <= min" @click="adjust(-step)">
      <Icon name="minus" :size="12" />
    </button>
    <input class="rc-stepper-input" type="number" :value="display" :min="min" :max="max" :step="step" :disabled="disabled" @change="onChange" @keydown.enter="onEnter" />
    <span v-if="unit" class="rc-stepper-unit">{{ unit }}</span>
    <button type="button" class="rc-stepper-btn" :disabled="disabled || modelValue >= max" @click="adjust(step)">
      <Icon name="plus" :size="12" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.rc-stepper {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 140px;
  height: 30px;
  overflow: hidden;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);

  &.disabled {
    opacity: 0.5;
  }
}

.rc-stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 100%;
  color: var(--rc-text-secondary);
  background-color: var(--rc-panel-2);
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    color: var(--rc-primary);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.rc-stepper-input {
  flex: 1;
  width: 0;
  min-width: 0;
  height: 100%;
  border: none;
  background-color: transparent;
  font-size: 12.5px;
  text-align: center;
  user-select: text;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    margin: 0;
    -webkit-appearance: none;
  }
  -moz-appearance: textfield;
}

.rc-stepper-unit {
  padding-right: 4px;
  font-size: 11.5px;
  color: var(--rc-text-secondary);
  white-space: nowrap;
}
</style>
