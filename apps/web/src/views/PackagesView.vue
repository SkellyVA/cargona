<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Шапка раздела -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('packages.title') }}</h1>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <div class="relative w-full sm:w-64">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            v-model="searchQuery"
            :placeholder="t('packages.searchPlaceholder')"
            class="w-full h-10 pl-10 pr-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-xs text-white placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan transition"
          />
        </div>

        <button
          @click="showCreatePackageModal = true"
          class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Plus class="w-4 h-4" />
          <span>{{ t('packages.addPackage') }}</span>
        </button>
      </div>
    </div>

    <!-- Уведомление -->
    <div
      v-if="toastMessage"
      class="bg-accent-emerald/10 border border-accent-emerald/30 rounded-2xl p-4 flex items-center justify-between text-accent-emerald text-xs font-medium"
    >
      <span>{{ toastMessage }}</span>
      <button @click="toastMessage = ''" class="text-accent-emerald/70 hover:text-accent-emerald cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Табы статусов -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4 sm:space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3 sm:pb-4">
        <div class="flex items-center gap-1.5 p-1 bg-[#181B23] border border-white/[0.06] rounded-2xl overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer"
            :class="activeTab === tab.id ? 'bg-surface text-white shadow-sm' : 'text-text-secondary hover:text-white'"
          >
            {{ tab.label }} ({{ tab.count }})
          </button>
        </div>

        <div class="text-xs font-mono text-text-tertiary hidden sm:block">
          {{ filteredPackages.length }} {{ t('common.pcs') }}
        </div>
      </div>

      <!-- 1. МОБИЛЬНЫЙ ВИД: Карточки посылок (для смартфонов) -->
      <div class="md:hidden space-y-3">
        <div
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="p-4 rounded-2xl bg-[#181B23] border border-white/[0.06] space-y-3 shadow-sm hover:border-white/[0.15] transition"
        >
          <!-- Верх карточки: Трек + Код клиента + Кнопка статуса -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-mono font-bold text-white text-sm tracking-wide truncate">{{ pkg.trackingNumber }}</div>
              <span class="inline-block mt-1 px-2 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-mono font-bold text-[11px]">
                {{ pkg.customerCargoCode || 'Без кода' }}
              </span>
            </div>

            <!-- Статус посылки с кликом для смены -->
            <button
              type="button"
              @click="openChangeStatus(pkg)"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition select-none hover:brightness-110 active:scale-95"
              :class="getStatusBadgeClass(pkg.status)"
            >
              <span class="relative flex h-2 w-2">
                <span v-if="pkg.status === 'IN_TRANSIT'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2" :class="getStatusDotClass(pkg.status)"></span>
              </span>
              <span>{{ getStatusLabel(pkg.status) }}</span>
            </button>
          </div>

          <!-- Описание и вес -->
          <div class="text-xs text-text-secondary flex items-center justify-between border-t border-white/[0.04] pt-2">
            <span class="truncate pr-2">{{ pkg.description || 'Груз' }}</span>
            <span class="font-mono text-white shrink-0 font-medium">{{ pkg.weightKg }} кг</span>
          </div>

          <!-- Низ карточки: Полка + Стоимость + Печать -->
          <div class="flex items-center justify-between border-t border-white/[0.04] pt-2.5">
            <button
              @click="openAssignShelf(pkg)"
              class="px-2.5 py-1.5 rounded-xl border font-mono text-[11px] transition flex items-center gap-1.5"
              :class="pkg.shelfLocation
                ? 'bg-accent-blue/15 text-accent-cyan border-accent-cyan/30'
                : 'bg-white/[0.03] text-text-tertiary border-white/[0.08]'"
            >
              <Warehouse class="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span>{{ pkg.shelfLocation || '+ Полка' }}</span>
            </button>

            <div class="flex items-center gap-3">
              <span class="font-mono font-bold text-white text-sm">
                {{ store.formatMoney(pkg.costUSD) }}
              </span>
              <button
                @click="printSticker(pkg)"
                class="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white transition"
                title="Печать этикетки"
              >
                <Printer class="w-4 h-4 text-accent-cyan" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredPackages.length === 0" class="py-12 text-center text-text-tertiary text-xs space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 text-accent-cyan flex items-center justify-center mx-auto">
            <Box class="w-6 h-6" />
          </div>
          <div class="text-xs font-bold text-white">В этой категории нет посылок</div>
          <p class="text-[11px] text-text-tertiary max-w-xs mx-auto">
            Примите первую посылку на складе через терминал WMS или добавьте посылку вручную.
          </p>
          <router-link
            :to="`/o/${slug}/wms`"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-cyan text-xs font-bold transition"
          >
            <PackagePlus class="w-3.5 h-3.5" />
            <span>Перейти в приемку WMS</span>
          </router-link>
        </div>
      </div>

      <!-- 2. ДЕСКТОПНЫЙ ВИД: Таблица посылок (для экранов от md и выше) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-white/[0.06] text-text-tertiary font-semibold uppercase tracking-wider">
              <th class="pb-3 px-3">{{ t('dashboard.trackingNumber') }}</th>
              <th class="pb-3 px-3">{{ t('dashboard.customer') }}</th>
              <th class="pb-3 px-3">{{ t('dashboard.weightAndPrice') }}</th>
              <th class="pb-3 px-3">{{ t('dashboard.shelf') }}</th>
              <th class="pb-3 px-3">{{ t('pvz.totalDebt') }}</th>
              <th class="pb-3 px-3">{{ t('common.status') }}</th>
              <th class="pb-3 px-3 text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr
              v-for="pkg in filteredPackages"
              :key="pkg.id"
              class="hover:bg-white/[0.02] transition"
            >
              <!-- Трек -->
              <td class="py-3.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                {{ pkg.trackingNumber }}
              </td>

              <!-- Клиент -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-mono font-bold">
                  {{ pkg.customerCargoCode || 'Без кода' }}
                </span>
              </td>

              <!-- Описание / Вес -->
              <td class="py-3.5 px-3 whitespace-nowrap text-text-secondary">
                <div>{{ pkg.description }}</div>
                <div class="text-[11px] text-text-tertiary font-mono">{{ pkg.weightKg }} кг</div>
              </td>

              <!-- Полка ПВЗ (Кликабельно для выбора ПВЗ и полки) -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <button
                  @click="openAssignShelf(pkg)"
                  class="px-2.5 py-1.5 rounded-xl border font-mono text-[11px] transition flex items-center gap-1.5 cursor-pointer"
                  :class="pkg.shelfLocation
                    ? 'bg-accent-blue/15 text-accent-cyan border-accent-cyan/30 hover:bg-accent-blue/25 hover:border-accent-cyan/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                    : 'bg-white/[0.03] text-text-tertiary border-white/[0.08] hover:border-white/20 hover:text-white'"
                >
                  <Warehouse class="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span v-if="pkg.shelfLocation" class="font-bold">{{ pkg.shelfLocation }}</span>
                  <span v-else class="font-normal text-[11px]">+ Назначить полку</span>
                </button>
              </td>

              <!-- Стоимость (с конвертацией в активную валюту) -->
              <td class="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-white">
                {{ store.formatMoney(pkg.costUSD) }}
              </td>

              <!-- Статус посылки с открытием модального окна по клику (БЕЗ случайных наведений) -->
              <td class="py-3.5 px-3 whitespace-nowrap">
                <button
                  type="button"
                  @click="openChangeStatus(pkg)"
                  class="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer select-none hover:brightness-110 active:scale-[0.98]"
                  :class="getStatusBadgeClass(pkg.status)"
                >
                  <!-- Индикаторная точка с анимацией -->
                  <span class="relative flex h-2 w-2">
                    <span
                      v-if="pkg.status === 'IN_TRANSIT'"
                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"
                    ></span>
                    <span
                      class="relative inline-flex rounded-full h-2 w-2"
                      :class="getStatusDotClass(pkg.status)"
                    ></span>
                  </span>
                  <span>{{ getStatusLabel(pkg.status) }}</span>
                </button>
              </td>

              <!-- Действия -->
              <td class="py-3.5 px-3 text-right whitespace-nowrap">
                <button
                  @click="printSticker(pkg)"
                  class="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white transition cursor-pointer"
                  title="Печать этикетки со штрихкодом"
                >
                  <Printer class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="filteredPackages.length === 0">
              <td colspan="7" class="py-12 text-center">
                <div class="space-y-3 max-w-sm mx-auto">
                  <div class="w-12 h-12 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 text-accent-cyan flex items-center justify-center mx-auto">
                    <Box class="w-6 h-6" />
                  </div>
                  <div class="text-xs font-bold text-white">В этой категории нет посылок</div>
                  <p class="text-[11px] text-text-tertiary">
                    Примите первую посылку на складе через терминал WMS или добавьте посылку вручную.
                  </p>
                  <router-link
                    :to="`/o/${slug}/wms`"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-cyan text-xs font-bold transition"
                  >
                    <PackagePlus class="w-3.5 h-3.5" />
                    <span>Перейти в приемку WMS</span>
                  </router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Модальное окно добавления посылки -->
    <AppModal v-model="showCreatePackageModal" title="Добавить посылку">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Трек-номер (Китай / ZTO / SF)</label>
          <input
            v-model="newPkg.trackingNumber"
            placeholder="SF9928182910"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Карго-код клиента</label>
          <input
            v-model="newPkg.customerCargoCode"
            :placeholder="`${store.settings.codePrefix}-101`"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase font-bold"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Филиал / ПВЗ назначения</label>
          <select
            v-model="newPkg.branchId"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none text-xs"
          >
            <option v-for="b in store.branches" :key="b.id" :value="b.id">{{ b.name }} ({{ b.city }})</option>
          </select>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Описание вложения</label>
          <input
            v-model="newPkg.description"
            placeholder="Одежда и обувь (1688)"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Вес брутто (кг)</label>
            <input
              type="number"
              step="0.01"
              v-model.number="newPkg.weightKg"
              placeholder="3.5"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Стоимость ({{ store.activeCurrency }})</label>
            <input
              type="number"
              v-model.number="newPkg.costTJS"
              placeholder="45"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <!-- Габариты Д x Ш x В (см) с живым расчетом объема, площади, плотности -->
        <div class="pt-2 border-t border-white/[0.06] space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-[11px] font-bold text-white uppercase tracking-wider">Габариты посылки (Д × Ш × В, см)</label>
            <span class="text-[10px] text-accent-cyan font-mono">Авторасчет WMS</span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] text-text-tertiary mb-0.5 block">Длина (см)</label>
              <input
                type="number"
                step="0.1"
                v-model.number="newPkg.lengthCm"
                placeholder="30"
                class="w-full h-9 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label class="text-[10px] text-text-tertiary mb-0.5 block">Ширина (см)</label>
              <input
                type="number"
                step="0.1"
                v-model.number="newPkg.widthCm"
                placeholder="20"
                class="w-full h-9 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label class="text-[10px] text-text-tertiary mb-0.5 block">Высота (см)</label>
              <input
                type="number"
                step="0.1"
                v-model.number="newPkg.heightCm"
                placeholder="15"
                class="w-full h-9 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs"
              />
            </div>
          </div>

          <!-- Живые рассчитанные WMS метрики -->
          <div class="grid grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-[#13151B] border border-white/[0.06] font-mono text-center">
            <div>
              <div class="text-[9px] text-text-tertiary">Объем:</div>
              <div class="text-[11px] font-bold text-accent-cyan">{{ calculatedMetrics.volumeM3 }} м³</div>
            </div>
            <div>
              <div class="text-[9px] text-text-tertiary">Площадь:</div>
              <div class="text-[11px] font-bold text-white">{{ calculatedMetrics.areaM2 }} м²</div>
            </div>
            <div>
              <div class="text-[9px] text-text-tertiary">Плотность:</div>
              <div class="text-[11px] font-bold text-amber-300">{{ calculatedMetrics.densityKgM3 }} кг/м³</div>
            </div>
            <div>
              <div class="text-[9px] text-text-tertiary">Объемн. вес:</div>
              <div class="text-[11px] font-bold text-sky-300">{{ calculatedMetrics.volumetricWeightKg }} кг</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreatePackageModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="createPackage"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Создать
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно назначения полки ПВЗ (Строго двухэтапный выбор: ПВЗ -> Полка) -->
    <AppModal v-model="showShelfModal" title="Назначение ячейки хранения в ПВЗ">
      <div class="space-y-5 text-xs">
        <!-- Информация о посылке -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div class="text-[11px] text-text-tertiary font-semibold uppercase">Посылка</div>
            <div class="font-mono font-bold text-white text-sm mt-0.5">{{ selectedPackage?.trackingNumber }}</div>
          </div>
          <div class="text-right">
            <div class="text-[11px] text-text-tertiary font-semibold uppercase">Код клиента</div>
            <div class="font-mono font-bold text-accent-cyan text-sm mt-0.5">{{ selectedPackage?.customerCargoCode || 'БЕЗ КОДА' }}</div>
          </div>
        </div>

        <!-- ЭТАП 1: Выбор филиала ПВЗ -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-white font-bold flex items-center gap-1.5 text-xs">
              <span class="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Шаг 1: Выберите филиал ПВЗ</span>
            </label>
            <span class="text-[11px] text-text-tertiary">Филиал получения</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              v-for="branch in store.branches"
              :key="branch.id"
              @click="selectBranchForShelf(branch.id)"
              class="p-3 rounded-2xl border transition cursor-pointer text-left flex flex-col justify-between"
              :class="modalSelectedBranchId === branch.id
                ? 'bg-accent-blue/20 border-accent-cyan shadow-glow-cyan text-white ring-1 ring-accent-cyan/50'
                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:bg-white/[0.05] hover:text-white'"
            >
              <div>
                <div class="font-bold text-xs flex items-center justify-between">
                  <span>{{ branch.name }}</span>
                  <Check v-if="modalSelectedBranchId === branch.id" class="w-4 h-4 text-accent-cyan" />
                </div>
                <div class="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
                  <MapPin class="w-3 h-3 text-accent-cyan shrink-0" />
                  <span>{{ branch.city }}, {{ branch.address }}</span>
                </div>
              </div>
              <div class="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-text-tertiary">
                {{ branch.cells.length }} ячеек в базе
              </div>
            </div>
          </div>
        </div>

        <!-- ЭТАП 2: Выбор полки в выбранном ПВЗ -->
        <div class="pt-3 border-t border-white/[0.06]">
          <div class="flex items-center justify-between mb-2.5">
            <label class="text-white font-bold flex items-center gap-1.5 text-xs">
              <span class="w-5 h-5 rounded-full bg-accent-cyan text-black flex items-center justify-center text-[10px] font-black">2</span>
              <span>Шаг 2: Выберите полку хранения в {{ currentModalBranch?.name || 'ПВЗ' }}</span>
            </label>
            <span class="text-[11px] font-mono text-accent-cyan">{{ modalBranchCells.length }} полок доступно</span>
          </div>

          <!-- Сетка полок выбранного ПВЗ -->
          <div v-if="modalBranchCells.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            <button
              v-for="cell in modalBranchCells"
              :key="cell.id"
              type="button"
              @click="targetShelf = cell.shelf"
              class="p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between"
              :class="targetShelf === cell.shelf
                ? 'bg-accent-cyan/25 border-accent-cyan text-white shadow-glow-cyan ring-1 ring-accent-cyan/50'
                : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:bg-white/[0.06] hover:text-white'"
            >
              <div>
                <div class="text-[10px] text-text-tertiary font-mono">{{ cell.rack }}</div>
                <div class="font-bold text-xs font-mono text-white mt-0.5">{{ cell.shelf }}</div>
              </div>
              <div class="mt-2 flex items-center justify-between text-[10px] font-mono text-text-tertiary">
                <span>{{ cell.packageCount || 0 }} шт.</span>
                <Check v-if="targetShelf === cell.shelf" class="w-3.5 h-3.5 text-accent-cyan" />
              </div>
            </button>
          </div>

          <div v-else class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-text-secondary text-xs">
            В этом филиале пока нет созданных ячеек. Вы можете ввести название вручную ниже:
          </div>

          <!-- Ручной ввод / кастомная полка -->
          <div class="mt-3 flex items-center gap-2">
            <input
              v-model="targetShelf"
              placeholder="Или введите название полки..."
              class="flex-1 h-9 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs"
            />
            <span class="text-[10px] text-text-tertiary whitespace-nowrap">Выбрано: <strong class="text-accent-cyan font-mono">{{ targetShelf }}</strong></span>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showShelfModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="confirmShelfAssignment"
          :disabled="!targetShelf"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Привязать к полке</span>
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Смена статуса посылки и оформление возврата товара (БЕЗ случайных наведений) -->
    <AppModal v-model="showStatusModal" title="Управление статусом посылки">
      <div class="space-y-4 text-xs">
        <!-- Краткая сводка по посылке -->
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div class="text-[10px] text-text-tertiary font-semibold uppercase">Посылка</div>
            <div class="font-mono font-bold text-white text-sm mt-0.5">{{ statusTargetPkg?.trackingNumber }}</div>
            <div class="text-[11px] text-text-secondary mt-0.5">{{ statusTargetPkg?.description }} ({{ statusTargetPkg?.weightKg }} кг)</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-text-tertiary font-semibold uppercase">Клиент</div>
            <div class="font-mono font-bold text-accent-cyan text-sm mt-0.5">{{ statusTargetPkg?.customerCargoCode || 'БЕЗ КОДА' }}</div>
            <div class="text-[11px] text-text-secondary mt-0.5">{{ store.formatMoney(statusTargetPkg?.costUSD || 0) }}</div>
          </div>
        </div>

        <!-- Выбор нового статуса (Карточки) -->
        <div>
          <label class="text-text-secondary font-semibold block mb-2">Выберите новый статус:</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="opt in statusCardOptions"
              :key="opt.value"
              type="button"
              @click="statusSelected = opt.value"
              class="p-3 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3"
              :class="statusSelected === opt.value
                ? (opt.value === 'RETURNED' ? 'bg-rose-500/15 border-rose-500 text-rose-300 ring-1 ring-rose-500/40' : 'bg-accent-blue/20 border-accent-cyan text-white ring-1 ring-accent-cyan/40')
                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:bg-white/[0.05] hover:text-white'"
            >
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border" :class="statusSelected === opt.value ? 'bg-accent-cyan/20 border-accent-cyan/40' : 'bg-white/[0.03] border-white/[0.06]'">
                <component :is="opt.icon" class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-xs flex items-center justify-between">
                  <span>{{ opt.label }}</span>
                  <Check v-if="statusSelected === opt.value" class="w-3.5 h-3.5 text-accent-cyan" />
                </div>
                <div class="text-[10px] text-text-tertiary mt-0.5 leading-tight">{{ opt.desc }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Дополнительная форма: Если выбран ВОЗВРАТ ТОВАРА -->
        <div v-if="statusSelected === 'RETURNED'" class="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
          <div class="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <RotateCcw class="w-4 h-4" />
            <span>Параметры возврата товара (Return Flow)</span>
          </div>

          <div>
            <label class="text-text-secondary text-[11px] mb-1 block">Причина возврата товара</label>
            <select
              v-model="returnForm.reason"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-rose-400 focus:outline-none cursor-pointer"
            >
              <option value="Брак / Производственный дефект">Брак / Производственный дефект</option>
              <option value="Не подошел размер / фасон">Не подошел размер / фасон</option>
              <option value="Отказ клиента до получения">Отказ клиента до получения</option>
              <option value="Ошибка продавца / Прислан не тот товар">Ошибка продавца / Прислан не тот товар</option>
              <option value="Повреждение при транспортировке">Повреждение при транспортировке</option>
              <option value="Другая причина">Другая причина</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-text-secondary text-[11px] mb-1 block">Сумма к возврату ({{ store.activeCurrency }})</label>
              <input
                type="number"
                step="0.01"
                v-model.number="returnForm.refundAmount"
                class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-rose-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label class="text-text-secondary text-[11px] mb-1 block">Трек обратной отправки</label>
              <input
                v-model="returnForm.returnTrackingNumber"
                placeholder="RET-SF-00912"
                class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-rose-400 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showStatusModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="saveStatusChange"
          class="px-5 py-2 rounded-xl font-bold text-xs shadow-glow-blue transition cursor-pointer flex items-center gap-1.5"
          :class="statusSelected === 'RETURNED' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-accent-blue hover:bg-accent-blue/90 text-white'"
        >
          <Check class="w-3.5 h-3.5" />
          <span>{{ statusSelected === 'RETURNED' ? 'Оформить возврат' : 'Сохранить статус' }}</span>
        </button>
      </template>
    </AppModal>

    <!-- Настоящее модальное окно термопечати штрихкода -->
    <BarcodePrintModal
      v-model="showPrintModal"
      :pkg="activePrintPkg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Search,
  Plus,
  Printer,
  X,
  Warehouse,
  MapPin,
  Check,
  RotateCcw,
  Truck,
  PackageCheck,
  ShoppingBag,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import BarcodePrintModal from '../components/BarcodePrintModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const { t } = useI18n();
const searchQuery = ref('');
const activeTab = ref<'ALL' | 'RECEIVED_AT_ORIGIN' | 'IN_TRANSIT' | 'READY_FOR_PICKUP' | 'RELEASED' | 'RETURNED'>('ALL');
const showCreatePackageModal = ref(false);
const showShelfModal = ref(false);
const showPrintModal = ref(false);
const showStatusModal = ref(false);
const toastMessage = ref('');
const selectedPackage = ref<any>(null);
const targetShelf = ref('Полка А-01');
const activePrintPkg = ref<any>(null);

// Переключение статуса и возврат
const statusTargetPkg = ref<any>(null);
const statusSelected = ref<string>('RECEIVED_AT_ORIGIN');
const returnForm = ref({
  reason: 'Брак / Производственный дефект',
  refundAmount: 0,
  returnTrackingNumber: '',
});

const statusCardOptions = [
  { value: 'RECEIVED_AT_ORIGIN', label: 'На складе отправки', desc: 'Принято на международном хабе', icon: Warehouse },
  { value: 'IN_TRANSIT', label: 'В пути (Логистика)', desc: 'Погружено в авто/авиа рейс', icon: Truck },
  { value: 'READY_FOR_PICKUP', label: 'В ПВЗ (Готов к выдаче)', desc: 'Размещено на полке ПВЗ', icon: PackageCheck },
  { value: 'RELEASED', label: 'Выдан клиенту', desc: 'Оплачено и передано клиенту', icon: ShoppingBag },
  { value: 'RETURNED', label: 'Возврат товара', desc: 'Отказ, брак или возврат на фабрику', icon: RotateCcw },
];

// Состояние двухэтапного выбора полки в ПВЗ (Шаг 1: ПВЗ -> Шаг 2: Полка)
const modalSelectedBranchId = ref<string>('b-1');
const currentModalBranch = computed(() => {
  return store.branches.find((b) => b.id === modalSelectedBranchId.value) || store.branches[0];
});
const modalBranchCells = computed(() => {
  return currentModalBranch.value?.cells || [];
});

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'RECEIVED_AT_ORIGIN':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
    case 'IN_TRANSIT':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.18)]';
    case 'READY_FOR_PICKUP':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]';
    case 'RELEASED':
      return 'bg-white/[0.04] text-text-tertiary border-white/[0.08] hover:bg-white/[0.08] hover:text-white';
    case 'RETURNED':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.25)]';
    default:
      return 'bg-white/[0.04] text-text-secondary border-white/[0.08]';
  }
}

function getStatusDotClass(status: string) {
  switch (status) {
    case 'RECEIVED_AT_ORIGIN':
      return 'bg-amber-400';
    case 'IN_TRANSIT':
      return 'bg-sky-400';
    case 'READY_FOR_PICKUP':
      return 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]';
    case 'RELEASED':
      return 'bg-text-tertiary';
    case 'RETURNED':
      return 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]';
    default:
      return 'bg-text-tertiary';
  }
}

function getStatusLabel(status: string) {
  const key = `statuses.${status}`;
  return t(key);
}

const newPkg = ref({
  trackingNumber: '',
  customerCargoCode: '',
  description: '',
  weightKg: 1.5,
  costTJS: 35,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 15,
  branchId: store.branches[0]?.id || 'b-1',
});

// Живой расчет WMS показателей объема и плотности
const calculatedMetrics = computed(() => {
  const l = newPkg.value.lengthCm || 0;
  const w = newPkg.value.widthCm || 0;
  const h = newPkg.value.heightCm || 0;
  const weight = newPkg.value.weightKg || 0;

  const volumeM3 = (l * w * h) / 1000000;
  const areaM2 = (l * w) / 10000;
  const densityKgM3 = volumeM3 > 0 ? weight / volumeM3 : 0;
  const volumetricWeightKg = (l * w * h) / 5000;

  return {
    volumeM3: volumeM3.toFixed(4),
    areaM2: areaM2.toFixed(3),
    densityKgM3: densityKgM3.toFixed(1),
    volumetricWeightKg: volumetricWeightKg.toFixed(2),
  };
});

const tabs = computed(() => [
  { id: 'ALL' as const, label: t('common.all'), count: store.packages.length },
  { id: 'READY_FOR_PICKUP' as const, label: t('statuses.READY_FOR_PICKUP'), count: store.packages.filter((p) => p.status === 'READY_FOR_PICKUP').length },
  { id: 'IN_TRANSIT' as const, label: t('statuses.IN_TRANSIT'), count: store.packages.filter((p) => p.status === 'IN_TRANSIT').length },
  { id: 'RECEIVED_AT_ORIGIN' as const, label: t('statuses.RECEIVED_AT_ORIGIN'), count: store.packages.filter((p) => p.status === 'RECEIVED_AT_ORIGIN').length },
  { id: 'RELEASED' as const, label: t('statuses.RELEASED'), count: store.packages.filter((p) => p.status === 'RELEASED').length },
  { id: 'RETURNED' as const, label: t('statuses.RETURNED'), count: store.packages.filter((p) => p.status === 'RETURNED').length },
]);

const filteredPackages = computed(() => {
  return store.packages.filter((p) => {
    const matchTab = activeTab.value === 'ALL' || p.status === activeTab.value;
    const q = searchQuery.value.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.trackingNumber.toLowerCase().includes(q) ||
      p.customerCargoCode.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);
    return matchTab && matchQuery;
  });
});

function openChangeStatus(pkg: any) {
  statusTargetPkg.value = pkg;
  statusSelected.value = pkg.status;
  const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
  returnForm.value = {
    reason: pkg.returnReason || 'Брак / Производственный дефект',
    refundAmount: Math.round((pkg.refundAmountUSD || pkg.costUSD || 0) * activeRate * 100) / 100,
    returnTrackingNumber: pkg.returnTrackingNumber || `RET-${pkg.trackingNumber}`,
  };
  showStatusModal.value = true;
}

function saveStatusChange() {
  if (!statusTargetPkg.value) return;

  if (statusSelected.value === 'RETURNED') {
    const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
    const refundUSD = returnForm.value.refundAmount / activeRate;
    store.processPackageReturn(
      statusTargetPkg.value.id,
      returnForm.value.reason,
      refundUSD,
      returnForm.value.returnTrackingNumber
    );
    toastMessage.value = `Посылка ${statusTargetPkg.value.trackingNumber} переведена в статус ВОЗВРАТ. Причина: ${returnForm.value.reason}`;
  } else {
    store.updatePackageStatus(statusTargetPkg.value.id, statusSelected.value as any);
    toastMessage.value = `Статус посылки ${statusTargetPkg.value.trackingNumber} обновлен на "${getStatusLabel(statusSelected.value)}"`;
  }

  showStatusModal.value = false;
}

function createPackage() {
  if (!newPkg.value.trackingNumber) return;
  const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
  const costUSD = newPkg.value.costTJS / activeRate;

  const l = newPkg.value.lengthCm || 0;
  const w = newPkg.value.widthCm || 0;
  const h = newPkg.value.heightCm || 0;
  const weight = newPkg.value.weightKg || 0;
  const volumeM3 = (l * w * h) / 1000000;
  const areaM2 = (l * w) / 10000;
  const densityKgM3 = volumeM3 > 0 ? weight / volumeM3 : 0;
  const volumetricWeightKg = (l * w * h) / 5000;

  store.addPackage({
    trackingNumber: newPkg.value.trackingNumber,
    customerCargoCode: newPkg.value.customerCargoCode.toUpperCase() || 'БЕЗ КОДА',
    description: newPkg.value.description || 'Товары народного потребления',
    weightKg: newPkg.value.weightKg,
    costUSD,
    lengthCm: l,
    widthCm: w,
    heightCm: h,
    volumeM3,
    areaM2,
    densityKgM3,
    volumetricWeightKg,
    shelfLocation: '',
    branchId: newPkg.value.branchId || store.branches[0]?.id || 'b-1',
    status: 'RECEIVED_AT_ORIGIN',
  });
  showCreatePackageModal.value = false;
  toastMessage.value = `Посылка ${newPkg.value.trackingNumber} зарегистрирована (V=${volumeM3.toFixed(3)} м³, ρ=${densityKgM3.toFixed(0)} кг/м³)`;
  newPkg.value = {
    trackingNumber: '',
    customerCargoCode: '',
    description: '',
    weightKg: 1.5,
    costTJS: 35,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 15,
    branchId: store.branches[0]?.id || 'b-1',
  };
}

function selectBranchForShelf(branchId: string) {
  modalSelectedBranchId.value = branchId;
  const branch = store.branches.find((b) => b.id === branchId);
  if (branch && branch.cells.length > 0) {
    const hasCell = branch.cells.some((c) => c.shelf === targetShelf.value);
    if (!hasCell) {
      targetShelf.value = branch.cells[0].shelf;
    }
  }
}

function openAssignShelf(pkg: any) {
  selectedPackage.value = pkg;
  modalSelectedBranchId.value = pkg.branchId || store.branches[0]?.id || 'b-1';
  const branch = store.branches.find((b) => b.id === modalSelectedBranchId.value);
  if (pkg.shelfLocation) {
    targetShelf.value = pkg.shelfLocation;
  } else if (branch && branch.cells.length > 0) {
    targetShelf.value = branch.cells[0].shelf;
  } else {
    targetShelf.value = 'Полка А-01';
  }
  showShelfModal.value = true;
}

function confirmShelfAssignment() {
  if (!selectedPackage.value || !targetShelf.value) return;
  store.assignShelf(selectedPackage.value.id, targetShelf.value, modalSelectedBranchId.value);
  showShelfModal.value = false;
  const branchName = currentModalBranch.value?.name || 'ПВЗ';
  toastMessage.value = `Посылка ${selectedPackage.value.trackingNumber} привязана к ячейке "${targetShelf.value}" (${branchName})`;
}

function printSticker(pkg: any) {
  activePrintPkg.value = pkg;
  showPrintModal.value = true;
}
</script>
