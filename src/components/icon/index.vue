<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  name: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}>(), {
  size: 18,
  strokeWidth: 1.8
});

/** 内置图标（24x24 viewBox，线条风格） */
const ICONS: Record<string, string[]> = {
  search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'M21 21l-4.6-4.6'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  history: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3.2 2'],
  settings: [
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z',
    'M19.2 14.6a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.47V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.97H3a1.9 1.9 0 1 1 0-3.8h.1A1.6 1.6 0 0 0 4.56 9.2a1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.76.32h.07a1.6 1.6 0 0 0 .97-1.47V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.76v.07a1.6 1.6 0 0 0 1.47.97H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.47.97z'
  ],
  'book-open': ['M2 3.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z', 'M22 3.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  forward: ['M5 12h14', 'M12 5l7 7-7 7'],
  up: ['M12 19V5', 'M5 12l7-7 7 7'],
  down: ['M12 5v14', 'M5 12l7 7 7-7'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  minimize: ['M5 12h14'],
  maximize: ['M6 6h12v12H6z'],
  restore: ['M8 9h10v10H8z', 'M6 15V6h9'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'],
  check: ['M20 6L9 17l-5-5'],
  'check-circle': ['M22 11.1V12a10 10 0 1 1-5.9-9.1', 'M22 4L12 14.01l-3-3'],
  'close-circle': ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M15 9l-6 6', 'M9 9l6 6'],
  warning: ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  folder: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  sun: [
    'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
    'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.5 1.5', 'M18.3 18.3l1.5 1.5',
    'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.5-1.5', 'M18.3 5.7l1.5-1.5'
  ],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  fullscreen: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
  compress: ['M8 3v3a2 2 0 0 1-2 2H3', 'M21 8h-3a2 2 0 0 1-2-2V3', 'M3 16h3a2 2 0 0 1 2 2v3', 'M16 21v-3a2 2 0 0 1 2-2h3'],
  more: ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  droplet: ['M12 2.7l5.2 5.2a7.3 7.3 0 1 1-10.4 0z'],
  play: ['M7 4.5l12 7.5-12 7.5z'],
  pause: ['M8 5v14', 'M16 5v14'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  type: ['M4 7V5h16v2', 'M12 5v14', 'M9 19h6']
};

const paths = computed(() => ICONS[props.name] || []);
const size = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
</script>

<template>
  <svg class="rc-icon" :style="{ width: size, height: size, color }" viewBox="0 0 24 24" fill="none" :stroke-width="strokeWidth" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<style scoped lang="scss">
.rc-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
