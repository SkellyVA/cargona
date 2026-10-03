<template>
  <section v-if="store.isOwner" class="bg-surface border border-surface-border rounded-2xl p-5 space-y-4">
    <h3 class="text-base font-bold text-white">Рассылка через бота</h3>
    <p class="text-xs text-text-secondary">Сообщения отправляются в личные чаты клиентов, которые уже открывали бота. Выбор ПВЗ учитывает ПВЗ в профиле клиента.</p>
    <AppDropdown v-model="branchId" :options="branchOptions" class="w-full" />
    <label for="broadcast-text" class="block text-xs text-text-secondary">Текст сообщения</label>
    <textarea id="broadcast-text" v-model="text" rows="5" maxlength="4096" :disabled="busy || job?.status === 'RUNNING'" class="w-full p-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent-cyan" />
    <p v-if="error" role="alert" class="text-xs text-accent-coral">{{ error }}</p>
    <button type="button" :disabled="busy || !text.trim() || job?.status === 'RUNNING'" @click="prepare" class="px-4 py-2.5 rounded-xl bg-accent-blue text-white text-xs font-bold cursor-pointer disabled:opacity-50">Подготовить рассылку</button>
    <div v-if="job" class="text-xs text-text-secondary space-y-2">
      <p>{{ job.status === 'RUNNING' ? 'Отправка…' : job.status === 'COMPLETED' ? 'Рассылка завершена' : 'Рассылка прервана' }}</p>
      <p>Получателей: {{ job.total }} · Отправлено: {{ job.sent }} · Ошибок: {{ job.failed }} · Пропущено: {{ job.skipped }}</p>
      <p v-for="item in job.errors" :key="item.chatId" class="text-accent-coral">{{ item.chatId }}: {{ item.error }}</p>
    </div>
    <AppModal v-model="confirmOpen" title="Подтвердить рассылку">
      <p class="text-sm text-white">Получателей: {{ recipientCount }} · {{ audienceLabel }}</p>
      <p class="text-xs text-text-secondary mt-2">Без доступного чата или повторы: {{ skipped }}</p>
      <p class="whitespace-pre-wrap break-words mt-4 p-3 rounded-xl bg-[#181B23] text-sm text-white">{{ draftText }}</p>
      <template #footer>
        <button type="button" :disabled="busy" @click="confirmOpen = false" class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary text-xs">Отмена</button>
        <button type="button" :disabled="busy || !recipientCount" @click="send" class="px-4 py-2 rounded-xl bg-accent-blue text-white text-xs disabled:opacity-50">{{ busy ? 'Запуск…' : 'Отправить рассылку' }}</button>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCargoStore } from '../stores/useCargoStore';
import AppDropdown from './ui/AppDropdown.vue';
import AppModal from './ui/AppModal.vue';
const store = useCargoStore();
const branchId = ref<string | number>('');
const branchOptions = computed(() => [{ value: '', label: 'Все клиенты' }, ...store.branches.map(b => ({ value: b.id, label: b.name }))]);
const text = ref('');
const busy = ref(false);
const error = ref('');
const confirmOpen = ref(false);
const recipientCount = ref(0);
const skipped = ref(0);
const draftText = ref('');
const draftBranch = ref('');
const audienceLabel = ref('');
const job = ref<any>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
let jobSlug = '';
async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}
async function prepare() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    jobSlug = store.activeTenantSlug;
    draftText.value = text.value.trim(); draftBranch.value = String(branchId.value);
    const data = await request(`/api/o/${encodeURIComponent(jobSlug)}/broadcasts/preview?branchId=${encodeURIComponent(draftBranch.value)}`);
    recipientCount.value = data.recipientCount; skipped.value = data.skipped;
    audienceLabel.value = branchOptions.value.find(b => b.value === branchId.value)?.label || 'Все клиенты';
    confirmOpen.value = true;
  } catch (err) { error.value = err instanceof Error ? err.message : 'Ошибка подготовки'; }
  finally { busy.value = false; }
}
async function poll() {
  try {
    job.value = await request(`/api/o/${encodeURIComponent(jobSlug)}/broadcasts/${job.value.id}`);
    if (!disposed && job.value.status === 'RUNNING') timer = setTimeout(poll, 3000);
  } catch (err) { error.value = err instanceof Error ? err.message : 'Ошибка получения результата'; }
}
async function send() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    job.value = await request(`/api/o/${encodeURIComponent(jobSlug)}/broadcasts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: draftText.value, branchId: draftBranch.value || undefined }) });
    confirmOpen.value = false;
    await poll();
  } catch (err) { error.value = err instanceof Error ? err.message : 'Ошибка запуска'; }
  finally { busy.value = false; }
}
onUnmounted(() => { disposed = true; if (timer) clearTimeout(timer); });
onMounted(async () => {
  if (!store.isOwner) return;
  jobSlug = store.activeTenantSlug;
  try {
    const jobs = await request(`/api/o/${encodeURIComponent(jobSlug)}/broadcasts`);
    job.value = jobs[0] || null;
    if (job.value?.status === 'RUNNING') await poll();
  } catch (err) { error.value = err instanceof Error ? err.message : 'Ошибка загрузки рассылок'; }
});
</script>
