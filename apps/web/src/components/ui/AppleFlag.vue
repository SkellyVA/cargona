<template>
  <span class="inline-flex items-center justify-center shrink-0 align-middle select-none" :style="{ width: sizePx, height: sizePx }">
    <img
      v-if="appleEmojiUrl && !hasError"
      :src="appleEmojiUrl"
      :alt="countryCode"
      class="w-full h-full object-contain"
      loading="lazy"
      @error="hasError = true"
    />
    <span v-else class="text-sm leading-none">{{ getFlagEmoji(countryCode) }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    countryCode: string;
    size?: number | string;
  }>(),
  {
    size: 20,
  }
);

const hasError = ref(false);

const sizePx = computed(() => {
  return typeof props.size === 'number' ? `${props.size}px` : props.size;
});

// Карта стран к Apple Emoji Unicode кодпоинтам (с поддержкой любых ISO-кодов)
const appleEmojiMap: Record<string, string> = {
  CN: '🇨🇳',
  TR: '🇹🇷',
  AE: '🇦🇪',
  US: '🇺🇸',
  DE: '🇩🇪',
  TJ: '🇹🇯',
  RU: '🇷🇺',
  UZ: '🇺🇿',
  KG: '🇰🇬',
  KZ: '🇰🇿',
  KR: '🇰🇷',
  GB: '🇬🇧',
  FR: '🇫🇷',
  IT: '🇮🇹',
  PL: '🇵🇱',
  JP: '🇯🇵',
  IN: '🇮🇳',
};

function getFlagEmoji(countryCode: string): string {
  const code = (countryCode || '').toUpperCase().trim();
  if (appleEmojiMap[code]) return appleEmojiMap[code];
  if (code.length === 2 && code >= 'AA' && code <= 'ZZ') {
    const first = 0x1f1e6 + (code.charCodeAt(0) - 65);
    const second = 0x1f1e6 + (code.charCodeAt(1) - 65);
    return String.fromCodePoint(first, second);
  }
  return '🌐';
}

const appleEmojiUrl = computed(() => {
  if (hasError.value) return null;
  const emoji = getFlagEmoji(props.countryCode);
  // Elk CDN provides authentic Apple Emoji style rendering
  return `https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple`;
});
</script>
