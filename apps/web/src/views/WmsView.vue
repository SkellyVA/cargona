<template>
  <div class="space-y-6 select-none">
    <!-- Шапка экрана WMS и переключение режимов (Выдача / Приемка) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ isPvzPath ? t('pvz.title') : t('wms.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">{{ isPvzPath ? t('pvz.subtitle') : t('wms.subtitle') }}</p>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
        <!-- Кастомный селектор активного ПВЗ или Склада -->
        <div class="relative inline-block text-left w-full sm:w-auto" ref="locationDropdownRef">
          <button
            type="button"
            @click="isLocationDropdownOpen = !isLocationDropdownOpen"
            class="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2.5 sm:py-2 rounded-2xl bg-[#181B23] border border-white/[0.08] hover:border-white/[0.18] transition text-xs font-bold text-white cursor-pointer select-none shadow-card"
          >
            <div class="flex items-center gap-2 min-w-0">
              <AppleFlag :countryCode="currentLocationFlag" :size="18" />
              <span class="text-text-tertiary font-normal">{{ isOriginWarehouse ? 'Склад:' : 'ПВЗ:' }}</span>
              <span class="text-white font-bold truncate max-w-[150px] sm:max-w-[200px]">{{ currentBranch?.name || 'Локация' }}</span>
            </div>
            <ChevronDown
              class="w-3.5 h-3.5 text-text-tertiary transition-transform duration-200 shrink-0"
              :class="{ 'rotate-180 text-accent-cyan': isLocationDropdownOpen }"
            />
          </button>

          <!-- Выпадающее меню с группами и Apple-флагами -->
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="isLocationDropdownOpen"
              class="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 w-full sm:w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#181B23] border border-white/[0.12] shadow-2xl p-2 focus:outline-none backdrop-blur-xl space-y-2 select-none"
            >
              <!-- Группа: Международные склады (только в WMS) -->
              <div v-if="!isPvzPath">
                <div class="text-[10px] uppercase font-bold text-accent-cyan tracking-wider px-2.5 py-1 flex items-center gap-1.5">
                  <Globe class="w-3 h-3" />
                  <span>Международные склады</span>
                </div>
                <div class="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  <button
                    v-for="wh in store.originWarehouses"
                    :key="wh.id"
                    type="button"
                    @click="selectLocation(wh.id)"
                    class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer"
                    :class="selectedBranchId === wh.id ? 'bg-accent-blue/20 text-white font-bold' : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <AppleFlag :countryCode="wh.countryCode" :size="16" />
                      <span class="truncate">{{ wh.name || (`Склад ${wh.city} (${wh.country})`) }}</span>
                    </div>
                    <span class="text-[10px] font-mono font-bold text-text-tertiary px-1.5 py-0.5 rounded bg-white/[0.04] shrink-0">
                      {{ wh.countryCode }}
                    </span>
                  </button>
                </div>
              </div>

              <!-- Группа: Филиалы ПВЗ (только в Выдаче ПВЗ) -->
              <div v-if="isPvzPath">
                <div class="text-[10px] uppercase font-bold text-accent-emerald tracking-wider px-2.5 py-1 flex items-center gap-1.5">
                  <Store class="w-3 h-3" />
                  <span>Филиалы ПВЗ</span>
                </div>
                <div class="space-y-0.5 mt-1 max-h-40 overflow-y-auto">
                  <button
                    v-for="b in store.branches"
                    :key="b.id"
                    type="button"
                    @click="selectLocation(b.id)"
                    class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer"
                    :class="selectedBranchId === b.id ? 'bg-accent-blue/20 text-white font-bold' : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <AppleFlag countryCode="TJ" :size="16" />
                      <span class="truncate">{{ b.name }}</span>
                    </div>
                    <span class="text-[10px] font-mono font-bold text-text-tertiary px-1.5 py-0.5 rounded bg-white/[0.04] shrink-0">
                      ПВЗ
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Табы режимов терминала (только для ПВЗ) -->
        <div v-if="isPvzPath" class="flex items-center gap-1.5 p-1 bg-[#181B23] border border-white/[0.08] rounded-2xl w-full sm:w-auto justify-around">
          <button
            type="button"
            @click="terminalMode = 'HANDOVER'"
            class="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            :class="terminalMode === 'HANDOVER' ? 'bg-accent-blue text-white shadow-glow-blue' : 'text-text-secondary hover:text-white'"
          >
            <UserCheck class="w-4 h-4" />
            <span>{{ t('dashboard.actionIssue') }}</span>
          </button>

          <button
            type="button"
            @click="terminalMode = 'INTAKE'"
            class="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            :class="terminalMode === 'INTAKE' ? 'bg-accent-blue text-white shadow-glow-blue' : 'text-text-secondary hover:text-white'"
          >
            <PackagePlus class="w-4 h-4" />
            <span>{{ t('wms.intakeFormTitle') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Уведомление об успешной операции -->
    <div
      v-if="successToast"
      class="bg-accent-emerald/10 border border-accent-emerald/30 rounded-2xl p-4 flex items-center justify-between text-accent-emerald"
    >
      <div class="flex items-center gap-3">
        <CheckCircle2 class="w-5 h-5 shrink-0" />
        <span class="text-xs sm:text-sm font-medium">{{ successToast }}</span>
      </div>
      <button @click="successToast = ''" class="text-accent-emerald/70 hover:text-accent-emerald cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- БЛОК СКАНИРОВАНИЯ (ОБЩИЙ ДЛЯ ОБОИХ РЕЖИМОВ) -->
    <div class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="relative flex-1">
          <ScanBarcode class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan" />
          <input
            v-model="scanInput"
            @keyup.enter="handleScan"
            ref="scanInputRef"
            :placeholder="terminalMode === 'HANDOVER' ? 'QR выдачи или карго-код...' : 'Трек-номер посылки (SF, ZTO, Amazon)...'"
            class="w-full h-12 sm:h-14 pl-12 pr-4 rounded-2xl bg-[#181B23] border border-white/[0.08] text-white placeholder:text-text-tertiary font-mono text-xs sm:text-sm focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 focus:outline-none transition"
          />
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <!-- Кнопка камеры смартфона -->
          <button
            @click="toggleCamera"
            class="h-12 sm:h-14 px-3.5 sm:px-4 rounded-2xl border transition flex items-center justify-center gap-1.5 shrink-0 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
            :class="isCameraActive ? 'bg-accent-coral/20 border-accent-coral/40 text-accent-coral' : 'bg-white/[0.05] hover:bg-white/[0.09] border-white/[0.08] text-white'"
            title="Камера"
          >
            <Camera class="w-5 h-5" />
            <span class="hidden sm:inline">{{ isCameraActive ? 'Стоп' : 'Камера' }}</span>
          </button>

          <!-- Кнопка поиска / обработки -->
          <button
            @click="handleScan"
            class="flex-1 sm:flex-initial h-12 sm:h-14 px-4 sm:px-6 rounded-2xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs sm:text-sm shadow-glow-blue flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
          >
            <Search class="w-4 h-4" />
            <span>{{ terminalMode === 'HANDOVER' ? 'Найти' : 'Принять ШК' }}</span>
          </button>

          <!-- Быстрые демо кнопки — только на десктопе -->
          <button
            v-if="terminalMode === 'HANDOVER'"
            @click="simulateClientQrScan"
            class="hidden sm:flex h-12 sm:h-14 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-medium text-text-secondary hover:text-white border border-white/[0.06] transition shrink-0 cursor-pointer items-center"
          >
            Тест QR
          </button>
          <button
            v-else
            @click="simulateIntakeScan"
            class="hidden sm:flex h-12 sm:h-14 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-medium text-text-secondary hover:text-white border border-white/[0.06] transition shrink-0 cursor-pointer items-center"
          >
            Тест ШК
          </button>
        </div>
      </div>

      <!-- Видеопоток камеры -->
      <div v-if="isCameraActive" class="pt-2">
        <div class="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-accent-cyan/40 bg-black shadow-[0_0_25px_rgba(6,182,212,0.15)]">
          <video
            ref="scannerVideoRef"
            class="w-full h-full object-cover rounded-2xl"
            playsinline
            autoplay
            muted
          ></video>
          <div class="absolute inset-0 pointer-events-none border-2 border-dashed border-accent-cyan/60 rounded-2xl m-8 animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- РЕЖИМ 1: ВЫДАЧА ТОВАРОВ КЛИЕНТУ (С ВЫБОРОМ ПОСЫЛОК И ВОЗВРАТОМ НА МЕСТЕ) -->
    <div v-if="terminalMode === 'HANDOVER'">
      <div v-if="activeHandover" class="bg-surface border border-accent-blue/40 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-card space-y-4 sm:space-y-6 relative overflow-hidden">
        <!-- Заголовок клиента -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex items-center gap-3 sm:gap-4">
            <div
              class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border"
              :class="activeHandover.readyPackages.length > 0 ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-cyan' : 'bg-accent-amber/20 border-accent-amber/40 text-accent-amber'"
            >
              <UserCheck class="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-base sm:text-xl font-bold text-white tracking-tight truncate">{{ activeHandover.customer?.fullName }}</span>
                <span class="px-2.5 py-0.5 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan font-mono font-bold text-xs shrink-0">
                  {{ activeHandover.customer?.cargoCode }}
                </span>
              </div>
              <div class="text-xs text-text-tertiary mt-1 flex items-center gap-2 flex-wrap">
                <span>{{ activeHandover.customer?.phone }}</span>
                <span>•</span>
                <span :class="activeHandover.readyPackages.length > 0 ? 'text-accent-emerald font-semibold' : 'text-accent-amber font-semibold'">
                  {{ activeHandover.readyPackages.length > 0 ? `Готово к выдаче в этом ПВЗ: ${activeHandover.readyPackages.length} шт` : 'В этом ПВЗ нет готовых товаров' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Финансовый блок выдачи с живым пересчетом -->
          <div
            v-if="activeHandover.readyPackages.length > 0"
            class="bg-[#181B23] border border-white/[0.08] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full sm:w-auto"
          >
            <div class="text-left sm:text-right">
              <div class="text-[10px] sm:text-[11px] text-text-tertiary uppercase font-semibold">К оплате (выбрано {{ selectedPackagesCount }} шт)</div>
              <div class="text-xl sm:text-2xl font-bold text-accent-cyan font-mono mt-0.5">
                {{ store.formatMoney(selectedTotalAmountUSD) }}
              </div>
            </div>

            <button
              @click="completeHandover"
              :disabled="selectedPackagesCount === 0"
              class="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-glow-blue flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Выдать ({{ selectedPackagesCount }})</span>
            </button>
          </div>
        </div>

        <!-- СЛУЧАЙ 1: В ТЕКУЩЕМ ПВЗ НЕТ ТОВАРОВ К ВЫДАЧЕ -->
        <div v-if="activeHandover.readyPackages.length === 0" class="space-y-4 pt-2">
          <!-- Предупреждающий баннер -->
          <div class="p-4 sm:p-5 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber space-y-2">
            <div class="flex items-center gap-2.5 font-bold text-sm">
              <AlertTriangle class="w-5 h-5 shrink-0" />
              <span>В данном филиале («{{ currentBranch?.name || 'ПВЗ' }}») нет готовых к выдаче товаров!</span>
            </div>
            <div class="text-xs text-text-secondary leading-relaxed">
              <span v-if="activeHandover.readyOtherBranches?.length > 0">
                У клиента есть товары, готовые к получению (<b class="text-white">{{ activeHandover.readyOtherBranches.length }} шт</b>), но они заказаны в другой пункт выдачи.
              </span>
              <span v-else-if="activeHandover.inTransitPkgs?.length > 0">
                Посылки клиента (<b class="text-white">{{ activeHandover.inTransitPkgs.length }} шт</b>) ещё не прибыли в ПВЗ и находятся в пути или на складе в Китае.
              </span>
              <span v-else>
                У клиента {{ activeHandover.customer?.cargoCode }} в данный момент нет активных посылок в системе.
              </span>
            </div>
          </div>

          <!-- Список посылок, готовых в других филиалах -->
          <div v-if="activeHandover.readyOtherBranches?.length > 0" class="space-y-2.5">
            <div class="text-xs font-semibold text-text-tertiary uppercase tracking-wider flex items-center justify-between">
              <span>Готовы в других филиалах ({{ activeHandover.readyOtherBranches.length }} шт):</span>
              <span class="text-[11px] text-accent-amber font-normal font-mono">Клиент пришел не в тот ПВЗ</span>
            </div>
            <div
              v-for="pkg in activeHandover.readyOtherBranches"
              :key="pkg.id"
              class="bg-[#181B23] border border-accent-amber/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-xl bg-accent-amber/15 text-accent-amber flex items-center justify-center shrink-0 border border-accent-amber/30">
                  <MapPin class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-sm font-bold text-white">{{ pkg.trackingNumber }}</span>
                    <span class="text-xs text-text-secondary">{{ pkg.weightKg }} кг</span>
                    <span class="text-xs font-mono text-accent-cyan">{{ store.formatMoney(pkg.costUSD) }}</span>
                  </div>
                  <div class="text-xs text-text-tertiary mt-0.5">{{ pkg.description }}</div>
                  <div class="text-xs text-accent-amber mt-1 flex items-center gap-1.5 font-medium">
                    <span>Находится в:</span>
                    <b class="text-white">{{ getBranchName(pkg.branchId) }}</b>
                    <span v-if="pkg.shelfLocation" class="text-text-tertiary font-mono">({{ pkg.shelfLocation }})</span>
                  </div>
                </div>
              </div>

              <button
                @click="switchToBranch(pkg.branchId)"
                class="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-accent-cyan border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-end md:self-auto shrink-0"
              >
                <span>Перейти в этот филиал</span>
              </button>
            </div>
          </div>

          <!-- Список посылок в пути -->
          <div v-if="activeHandover.inTransitPkgs?.length > 0" class="space-y-2.5">
            <div class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Посылки в пути / на складе ({{ activeHandover.inTransitPkgs.length }} шт):
            </div>
            <div
              v-for="pkg in activeHandover.inTransitPkgs"
              :key="pkg.id"
              class="bg-[#181B23] border border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-accent-blue/15 text-accent-cyan flex items-center justify-center shrink-0 border border-accent-blue/30">
                  <Box class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-bold text-white">{{ pkg.trackingNumber }}</span>
                    <span class="text-xs text-text-secondary">{{ pkg.weightKg }} кг</span>
                  </div>
                  <div class="text-xs text-text-tertiary">{{ pkg.description }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-bold text-accent-cyan font-mono">
                  {{ pkg.status === 'RECEIVED_AT_ORIGIN' ? 'На складе в Китае' : pkg.status === 'CUSTOMS' ? 'Таможня' : 'В пути' }}
                </div>
                <div class="text-[10px] text-text-tertiary mt-0.5">
                  Назначен ПВЗ: {{ getBranchName(pkg.branchId) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Кнопка сброса / закрытия -->
          <div class="pt-3 flex justify-end">
            <button
              @click="activeHandover = null"
              class="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Закрыть карточку клиента
            </button>
          </div>
        </div>

        <!-- СЛУЧАЙ 2: ЕСТЬ ТОВАРЫ К ВЫДАЧЕ В ЭТОМ ПВЗ -->
        <template v-else>
          <!-- Управление выбором (Чекбоксы и быстрые действия) -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-white/[0.06] gap-2">
            <div class="flex items-center gap-3">
              <AppCheckbox
                :modelValue="isAllSelected"
                @change="toggleSelectAll(!isAllSelected)"
                :label="`Выбрать все (${activeHandover.readyPackages.length})`"
              />
              <button
                type="button"
                v-if="selectedPackagesCount > 0"
                @click="toggleSelectAll(false)"
                class="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-text-tertiary transition cursor-pointer whitespace-nowrap"
              >
                Снять выбор
              </button>
            </div>

            <div class="text-[11px] text-text-tertiary hidden sm:block">
              Отметьте посылки для выдачи или оформите возврат
            </div>
          </div>

          <!-- Список посылок с чекбоксами выбора и кнопкой «Оформить возврат» -->
          <div class="space-y-2.5">
            <div
              v-for="pkg in activeHandover.readyPackages"
              :key="pkg.id"
              class="bg-[#181B23] border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition"
              :class="selectedPackageIds.includes(pkg.id) ? 'border-accent-cyan/40 bg-accent-blue/[0.04]' : 'border-white/[0.06] opacity-75'"
            >
              <div class="flex items-start gap-3.5">
                <!-- Чекбокс выбора для выдачи -->
                <AppCheckbox
                  :modelValue="selectedPackageIds.includes(pkg.id)"
                  @change="togglePackageSelection(pkg.id)"
                />

                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-bold text-white">{{ pkg.trackingNumber }}</span>
                    <span class="text-xs text-text-secondary">{{ pkg.weightKg }} кг</span>
                  </div>
                  <div class="text-xs text-text-tertiary">{{ pkg.description }}</div>
                </div>
              </div>

              <!-- Правая часть: Полка, стоимость и кнопка возврата на месте -->
              <div class="flex items-center gap-3 self-end md:self-auto">
                <!-- Крупная плашка ячейки / полки -->
                <div class="px-3.5 py-1.5 rounded-xl bg-accent-blue/20 border border-accent-blue/40 text-accent-cyan font-mono font-bold text-xs flex items-center gap-1.5">
                  <Box class="w-3.5 h-3.5 text-accent-cyan" />
                  <span>{{ pkg.shelfLocation || 'БЕЗ ПОЛКИ' }}</span>
                </div>

                <div class="text-sm font-bold text-white font-mono min-w-[70px] text-right">
                  {{ store.formatMoney(pkg.costUSD) }}
                </div>

                <!-- Кнопка оформления возврата товара прямо при выдаче -->
                <button
                  type="button"
                  @click="openHandoverReturnModal(pkg)"
                  class="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  title="Клиент отказался / брак: оформить возврат"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>Возврат</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Дополнительное уведомление, если есть посылки в других филиалах -->
          <div
            v-if="activeHandover.readyOtherBranches?.length > 0"
            class="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>Также у клиента есть {{ activeHandover.readyOtherBranches.length }} посылок в другом филиале</span>
            </div>
            <button
              @click="switchToBranch(activeHandover.readyOtherBranches[0].branchId)"
              class="text-accent-cyan underline hover:text-white font-medium cursor-pointer"
            >
              Посмотреть
            </button>
          </div>

          <!-- Итоговая кнопка подтверждения выдачи -->
          <div class="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="text-xs text-text-secondary">
              Выбрано к выдаче: <b class="text-white">{{ selectedPackagesCount }}</b> из {{ activeHandover.readyPackages.length }} шт.
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="activeHandover = null"
                class="px-5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-text-secondary hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                Отмена
              </button>

              <button
                @click="completeHandover"
                :disabled="selectedPackagesCount === 0"
                class="flex-1 sm:flex-initial px-6 sm:px-8 py-3.5 rounded-2xl bg-accent-emerald hover:bg-accent-emerald/90 disabled:opacity-50 text-white font-black text-sm shadow-glow-emerald flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 class="w-5 h-5" />
                <span>Выдать ({{ store.formatMoney(selectedTotalAmountUSD) }})</span>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Пустое состояние, если клиент еще не отсканирован -->
      <div v-else class="p-12 text-center border border-dashed border-white/[0.08] rounded-3xl space-y-2">
        <ScanBarcode class="w-10 h-10 text-accent-cyan/60 mx-auto" />
        <div class="text-white font-bold text-sm">Ожидание QR-кода клиента или ввода кода</div>
        <div class="text-xs text-text-tertiary max-w-sm mx-auto">
          Отсканируйте код из Telegram Mini App клиента или введите карго-код (например, {{ store.settings.codePrefix || 'CRG' }}-101), чтобы начать выдачу.
        </div>
      </div>
    </div>

    <!-- РЕЖИМ 2: ПРИЕМКА ТОВАРА (INTAKE & SORTING) -->
    <div v-else class="space-y-6">
      <!-- Карточка приемки отсканированного товара -->
      <div v-if="scannedIntakeItem" class="bg-surface border border-accent-cyan/40 rounded-3xl p-6 shadow-card space-y-5">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center font-bold">
              <Box class="w-5 h-5" />
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-2">
                <span>{{ isExistingIntake ? 'Посылка уже в системе (Обновление / Сортировка)' : 'Новая посылка (Первичная приемка)' }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold" :class="isExistingIntake ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'">
                  {{ isExistingIntake ? 'СУЩЕСТВУЮЩАЯ' : 'НОВАЯ' }}
                </span>
              </div>
              <div class="font-mono text-xs text-accent-cyan mt-0.5">{{ intakeForm.trackingNumber }}</div>
            </div>
          </div>

          <button
            @click="scannedIntakeItem = null"
            class="text-text-tertiary hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Форма параметров оприходования -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Карго-код клиента</label>
            <input
              v-model="intakeForm.customerCargoCode"
              :placeholder="`${store.settings.codePrefix || 'CRG'}-101`"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono uppercase font-bold focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Вес брутто (кг)</label>
            <input
              type="number"
              step="0.05"
              v-model.number="intakeForm.weightKg"
              placeholder="2.5"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Стоимость доставки ({{ store.activeCurrency }})</label>
            <input
              type="number"
              v-model.number="intakeForm.costLocal"
              placeholder="35"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Статус после приемки</label>
            <div class="grid grid-cols-2 gap-1 p-1 bg-[#181B23] border border-white/[0.08] rounded-xl h-10 items-center">
              <button
                type="button"
                @click="intakeForm.targetStatus = 'RECEIVED_AT_ORIGIN'"
                class="h-8 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="intakeForm.targetStatus === 'RECEIVED_AT_ORIGIN' ? 'bg-accent-blue text-white shadow-glow-blue' : 'text-text-secondary hover:text-white'"
              >
                <AppleFlag :countryCode="currentLocationFlag" :size="14" />
                <span>На складе</span>
              </button>
              <button
                type="button"
                @click="intakeForm.targetStatus = 'READY_FOR_PICKUP'"
                class="h-8 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="intakeForm.targetStatus === 'READY_FOR_PICKUP' ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-text-secondary hover:text-white'"
              >
                <AppleFlag countryCode="TJ" :size="14" />
                <span>В ПВЗ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Габариты Д x Ш x В и полка хранения -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-white/[0.06]">
          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Длина (см)</label>
            <input
              type="number"
              v-model.number="intakeForm.lengthCm"
              placeholder="30"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Ширина (см)</label>
            <input
              type="number"
              v-model.number="intakeForm.widthCm"
              placeholder="20"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-[11px] text-text-tertiary mb-1 block">Высота (см)</label>
            <input
              type="number"
              v-model.number="intakeForm.heightCm"
              placeholder="15"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[11px] text-text-tertiary">{{ isOriginWarehouse ? 'Паллет / Зона сортировки' : 'Полка / Ячейка' }}</label>
              <span class="text-[10px] text-accent-cyan font-mono">{{ currentBranchCells.length }} {{ isOriginWarehouse ? 'паллет/зон' : 'ячеек' }}</span>
            </div>
            <div class="space-y-1">
              <input
                v-model="intakeForm.shelfLocation"
                :placeholder="isOriginWarehouse ? 'Паллет CN-01' : 'Полка Б-14'"
                class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white font-mono font-bold uppercase focus:border-accent-cyan focus:outline-none"
              />
              <div v-if="currentBranchCells.length > 0" class="flex items-center gap-1 flex-wrap">
                <button
                  v-for="cell in currentBranchCells.slice(0, 4)"
                  :key="cell.id"
                  type="button"
                  @click="intakeForm.shelfLocation = cell.shelf"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-mono transition border cursor-pointer"
                  :class="intakeForm.shelfLocation === cell.shelf ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan font-bold' : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:text-white'"
                >
                  {{ cell.shelf }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div class="text-[11px] text-text-tertiary font-mono">
            Объем: <b class="text-accent-cyan">{{ intakeVolumeM3 }} м³</b> • Плотность: <b class="text-amber-300">{{ intakeDensity }} кг/м³</b>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="printIntakeBarcode"
              class="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>Печать ШК</span>
            </button>

            <button
              type="button"
              @click="saveIntakePackage"
              class="px-6 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold shadow-glow-blue flex items-center gap-1.5 transition cursor-pointer"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Оприходовать в {{ currentBranch?.name || 'локацию' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Журнал приемки и аудит текущего ПВЗ -->
      <div class="bg-surface border border-surface-border rounded-3xl p-6 shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
              <ScrollText class="w-4 h-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm">Приемка за смену: {{ currentBranch?.name || 'Локация' }}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                  {{ selectedBranchId }}
                </span>
              </div>
              <p class="text-[11px] text-text-tertiary mt-0.5">
                Изолированный журнал приемки и аудит для филиала {{ currentBranch?.name || 'Локация' }}
              </p>
            </div>
          </div>

          <!-- Переключатель: Принято за смену / Полный аудит филиала -->
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 p-1 bg-[#181B23] border border-white/[0.06] rounded-xl text-xs">
              <button
                type="button"
                @click="intakeViewTab = 'SHIFT'"
                class="px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                :class="intakeViewTab === 'SHIFT' ? 'bg-accent-blue text-white shadow-sm' : 'text-text-tertiary hover:text-white'"
              >
                Смена ({{ currentBranchIntakeHistory.length }})
              </button>
              <button
                type="button"
                @click="intakeViewTab = 'AUDIT'"
                class="px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                :class="intakeViewTab === 'AUDIT' ? 'bg-accent-blue text-white shadow-sm' : 'text-text-tertiary hover:text-white'"
              >
                Аудит ПВЗ ({{ currentBranchAudits.length }})
              </button>
            </div>
          </div>
        </div>

        <!-- Статистика смены конкретного ПВЗ -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06]">
            <div class="text-[10px] text-text-tertiary uppercase font-medium">Принято в этом ПВЗ</div>
            <div class="text-base font-bold text-white font-mono mt-0.5">{{ branchIntakeStats.count }} шт</div>
          </div>
          <div class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06]">
            <div class="text-[10px] text-text-tertiary uppercase font-medium">Вес смены ПВЗ</div>
            <div class="text-base font-bold text-accent-cyan font-mono mt-0.5">{{ branchIntakeStats.weight }} кг</div>
          </div>
          <div class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06]">
            <div class="text-[10px] text-text-tertiary uppercase font-medium">Стоимость выдачи</div>
            <div class="text-base font-bold text-accent-emerald font-mono mt-0.5">{{ store.formatMoney(branchIntakeStats.costUSD) }}</div>
          </div>
        </div>

        <!-- ТАБ 1: Принятые товары за смену в этом ПВЗ -->
        <div v-if="intakeViewTab === 'SHIFT'">
          <div v-if="currentBranchIntakeHistory.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-white/[0.06] text-text-tertiary font-semibold uppercase">
                  <th class="pb-2 px-2">Время</th>
                  <th class="pb-2 px-2">Трек-номер</th>
                  <th class="pb-2 px-2">Клиент</th>
                  <th class="pb-2 px-2">Вес</th>
                  <th class="pb-2 px-2">Ячейка</th>
                  <th class="pb-2 px-2">Сумма</th>
                  <th class="pb-2 px-2">Статус</th>
                  <th class="pb-2 px-2 text-right">Штрихкод</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/[0.04]">
                <tr v-for="item in currentBranchIntakeHistory" :key="item.id" class="hover:bg-white/[0.02] transition">
                  <td class="py-2.5 px-2 font-mono text-text-tertiary">{{ item.time }}</td>
                  <td class="py-2.5 px-2 font-mono font-bold text-white">{{ item.trackingNumber }}</td>
                  <td class="py-2.5 px-2 font-mono text-accent-cyan">{{ item.customerCargoCode }}</td>
                  <td class="py-2.5 px-2 font-mono text-text-secondary">{{ item.weightKg }} кг</td>
                  <td class="py-2.5 px-2 font-mono text-white">{{ item.shelfLocation || '—' }}</td>
                  <td class="py-2.5 px-2 font-mono font-bold text-white">{{ store.formatMoney(item.costUSD || (item.costLocal / (store.ratesToUSD[store.activeCurrency] || 1))) }}</td>
                  <td class="py-2.5 px-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold" :class="item.status === 'READY_FOR_PICKUP' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'">
                      {{ item.status === 'READY_FOR_PICKUP' ? 'В ПВЗ' : 'На складе' }}
                    </span>
                  </td>
                  <td class="py-2.5 px-2 text-right">
                    <button
                      @click="printDirectPkg(item)"
                      class="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white cursor-pointer"
                      title="Печать ШК"
                    >
                      <Printer class="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="p-8 text-center text-xs text-text-tertiary border border-dashed border-white/[0.06] rounded-2xl">
            В локации «{{ currentBranch?.name || 'Локация' }}» за текущую смену еще нет оприходованных посылок. Отсканируйте ШК для приемки.
          </div>
        </div>

        <!-- ТАБ 2: Аудит операций только для этого ПВЗ / Склада -->
        <div v-else>
          <div v-if="currentBranchAudits.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-white/[0.06] text-text-tertiary font-semibold uppercase">
                  <th class="pb-2 px-2">Время</th>
                  <th class="pb-2 px-2">Событие</th>
                  <th class="pb-2 px-2">Объект</th>
                  <th class="pb-2 px-2">Оператор</th>
                  <th class="pb-2 px-2">Детали операции</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/[0.04]">
                <tr v-for="log in currentBranchAudits" :key="log.id" class="hover:bg-white/[0.02] transition">
                  <td class="py-2.5 px-2 font-mono text-text-tertiary whitespace-nowrap">{{ log.time }}</td>
                  <td class="py-2.5 px-2 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-blue/15 text-accent-cyan border border-accent-blue/30">
                      {{ log.actionLabel }}
                    </span>
                  </td>
                  <td class="py-2.5 px-2 font-mono font-bold text-white whitespace-nowrap">{{ log.target }}</td>
                  <td class="py-2.5 px-2 font-mono text-text-tertiary whitespace-nowrap">{{ log.user }}</td>
                  <td class="py-2.5 px-2 text-text-secondary">{{ log.details }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-8 text-center text-xs text-text-tertiary border border-dashed border-white/[0.06] rounded-2xl">
            Для локации «{{ currentBranch?.name || 'Локация' }}» записей аудита пока нет.
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно оформления возврата на месте при выдаче -->
    <AppModal v-model="showHandoverReturnModal" title="Оформление возврата товара при выдаче">
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
          <div>
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Возвращаемая посылка</div>
            <div class="font-mono font-bold text-white text-sm mt-0.5">{{ returnTargetPkg?.trackingNumber }}</div>
            <div class="text-[11px] text-text-secondary">{{ returnTargetPkg?.description }} ({{ returnTargetPkg?.weightKg }} кг)</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Клиент</div>
            <div class="font-mono font-bold text-accent-cyan text-sm mt-0.5">{{ returnTargetPkg?.customerCargoCode }}</div>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Причина возврата товара</label>
          <select
            v-model="handoverReturnForm.reason"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-rose-400 focus:outline-none cursor-pointer"
          >
            <option value="Отказ клиента при осмотре">Отказ клиента при осмотре в ПВЗ</option>
            <option value="Брак / Производственный дефект">Брак / Производственный дефект</option>
            <option value="Не подошел размер / фасон">Не подошел размер / фасон</option>
            <option value="Ошибка продавца / Прислан не тот товар">Ошибка продавца / Прислан не тот товар</option>
            <option value="Повреждена упаковка / бой">Повреждена упаковка / бой</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Сумма возврата ({{ store.activeCurrency }})</label>
            <input
              type="number"
              v-model.number="handoverReturnForm.refundAmount"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-rose-400 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Трек обратной отправки</label>
            <input
              v-model="handoverReturnForm.returnTracking"
              placeholder="RET-0012"
              class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-rose-400 focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showHandoverReturnModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="confirmHandoverReturn"
          class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(225,29,72,0.4)] transition cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Подтвердить возврат</span>
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно печати штрихкода -->
    <BarcodePrintModal
      v-model="showPrintModal"
      :pkg="activePrintPkg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
} from '@zxing/library';
import {
  ScanBarcode,
  Search,
  UserCheck,
  Box,
  CheckCircle2,
  Camera,
  X,
  PackagePlus,
  RotateCcw,
  Printer,
  ScrollText,
  MapPin,
  ChevronDown,
  Globe,
  Store,
  AlertTriangle,
} from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppCheckbox from '../components/ui/AppCheckbox.vue';
import AppleFlag from '../components/ui/AppleFlag.vue';
import BarcodePrintModal from '../components/BarcodePrintModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const store = useCargoStore();
const route = useRoute();
const { t } = useI18n();

// Проверка начального режима на основе текущего пути (/pvz vs /wms)
const isPvzPath = computed(() => route.path.endsWith('/pvz') || route.query.mode === 'handover');

const terminalMode = ref<'HANDOVER' | 'INTAKE'>(
  route.path.endsWith('/pvz') || route.query.mode === 'handover' ? 'HANDOVER' : 'INTAKE'
);
const intakeViewTab = ref<'SHIFT' | 'AUDIT'>('SHIFT');
const scanInput = ref('');
const scanInputRef = ref<HTMLInputElement | null>(null);
const successToast = ref('');
const isCameraActive = ref(false);
const scannerVideoRef = ref<HTMLVideoElement | null>(null);

// Селектор рабочего ПВЗ или Склада
const selectedBranchId = ref<string>(
  route.path.endsWith('/pvz') || route.query.mode === 'handover'
    ? store.branches[0]?.id || 'b-1'
    : store.originWarehouses[0]?.id || 'wh-cn'
);
const isLocationDropdownOpen = ref(false);
const locationDropdownRef = ref<HTMLElement | null>(null);

function selectLocation(id: string) {
  selectedBranchId.value = id;
  isLocationDropdownOpen.value = false;
  onLocationChange();
}

const currentLocationFlag = computed(() => {
  const wh = store.originWarehouses.find(
    (w) => w.id === selectedBranchId.value || (w.id === 'wh-cn' && selectedBranchId.value === 'b-origin')
  );
  if (wh) return wh.countryCode || 'CN';
  return 'TJ';
});

const isOriginWarehouse = computed(() => {
  return (
    store.originWarehouses.some((w) => w.id === selectedBranchId.value) ||
    selectedBranchId.value === 'b-origin'
  );
});

function onLocationChange() {
  if (isOriginWarehouse.value) {
    terminalMode.value = 'INTAKE';
  }
}

function applyRouteMode() {
  const isPvzRoute = route.path.endsWith('/pvz') || route.query.mode === 'handover';
  if (isPvzRoute) {
    terminalMode.value = 'HANDOVER';
    // На странице выдачи ПВЗ должен быть выбран филиал ПВЗ
    if (isOriginWarehouse.value || !store.branches.some((b) => b.id === selectedBranchId.value)) {
      selectedBranchId.value = store.branches[0]?.id || 'b-1';
    }
  } else {
    terminalMode.value = 'INTAKE';
    // На странице Склад & WMS должен быть выбран международный склад
    if (!isOriginWarehouse.value || !store.originWarehouses.some((w) => w.id === selectedBranchId.value)) {
      selectedBranchId.value = store.originWarehouses[0]?.id || 'wh-cn';
    }
  }
}

watch(
  () => [route.path, route.query.mode],
  () => {
    applyRouteMode();
  },
  { immediate: true }
);

const currentBranch = computed(() => {
  const wh = store.originWarehouses.find(
    (w) => w.id === selectedBranchId.value || (w.id === 'wh-cn' && selectedBranchId.value === 'b-origin')
  );
  if (wh) {
    return {
      id: wh.id,
      name: wh.name || `Склад ${wh.city} (${wh.country})`,
      city: wh.city,
      address: wh.address,
      phone: wh.phone,
      isWarehouse: true,
      cells: wh.cells || [],
    };
  }
  const br = store.branches.find((b) => b.id === selectedBranchId.value) || store.branches[0];
  if (br) return br;
  return {
    id: 'none',
    name: 'Филиал не выбран',
    city: '',
    address: '',
    phone: '',
    isWarehouse: false,
    cells: [],
  };
});

const currentBranchCells = computed(() => {
  return currentBranch.value?.cells || [];
});

// Состояние выдачи
const activeHandover = ref<any>(null);
// NOTE: use a plain array (not Set) so Vue 3 reactivity tracks changes
const selectedPackageIds = ref<string[]>([]);

const isAllSelected = computed(() => {
  if (!activeHandover.value || activeHandover.value.readyPackages.length === 0) return false;
  return activeHandover.value.readyPackages.every((p: any) => selectedPackageIds.value.includes(p.id));
});

// Модальное окно возврата при выдаче
const showHandoverReturnModal = ref(false);
const returnTargetPkg = ref<any>(null);
const handoverReturnForm = ref({
  reason: 'Отказ клиента при осмотре',
  refundAmount: 0,
  returnTracking: '',
});

// Состояние приемки (Intake)
const scannedIntakeItem = ref<any>(null);
const isExistingIntake = ref(false);
const intakeForm = ref({
  trackingNumber: '',
  customerCargoCode: '',
  weightKg: 2.5,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 15,
  shelfLocation: '',
  costLocal: 35,
  targetStatus: 'READY_FOR_PICKUP' as 'RECEIVED_AT_ORIGIN' | 'READY_FOR_PICKUP',
});

const intakeVolumeM3 = computed(() => {
  const l = intakeForm.value.lengthCm || 0;
  const w = intakeForm.value.widthCm || 0;
  const h = intakeForm.value.heightCm || 0;
  return ((l * w * h) / 1000000).toFixed(4);
});

const intakeDensity = computed(() => {
  const vol = parseFloat(intakeVolumeM3.value);
  const wt = intakeForm.value.weightKg || 0;
  return vol > 0 ? (wt / vol).toFixed(0) : '0';
});

// Изолированные журналы приемки за смену для каждого ПВЗ и Склада
const branchIntakeHistories = ref<Record<string, any[]>>({});

// Текущий журнал приемки для выбранного ПВЗ или Склада
const currentBranchIntakeHistory = computed(() => {
  const list = branchIntakeHistories.value[selectedBranchId.value] || [];
  if (selectedBranchId.value === 'wh-cn' && branchIntakeHistories.value['b-origin']) {
    return [...list, ...branchIntakeHistories.value['b-origin']];
  }
  return list;
});

// Аудит операций конкретного выбранного ПВЗ или Склада
const currentBranchAudits = computed(() => {
  return store.auditLogs.filter((a) => {
    if (a.branchId === selectedBranchId.value) return true;
    if (
      (selectedBranchId.value === 'wh-cn' || selectedBranchId.value === 'b-origin') &&
      (a.branchId === 'wh-cn' || a.branchId === 'b-origin')
    ) {
      return true;
    }
    return false;
  });
});

// Статистика смены выбранного ПВЗ
const branchIntakeStats = computed(() => {
  const list = currentBranchIntakeHistory.value;
  const count = list.length;
  const weight = list.reduce((acc, item) => acc + (item.weightKg || 0), 0);
  const costUSD = list.reduce((acc, item) => acc + (item.costUSD || 0), 0);
  return {
    count,
    weight: weight.toFixed(2),
    costUSD,
  };
});

// Печать штрихкода
const showPrintModal = ref(false);
const activePrintPkg = ref<any>(null);

onMounted(() => {
  // Не вызываем программный фокус на мобильных устройствах, чтобы не поднимать виртуальную клавиатуру
  if (typeof window !== 'undefined' && window.innerWidth >= 1024 && !('ontouchstart' in window)) {
    scanInputRef.value?.focus();
  }
});

onUnmounted(() => {
  stopCamera();
});

function playChime(freq: number, type: OscillatorType = 'sine') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Audio context
  }
}

// Вычисляемые свойства для выдачи
const selectedPackages = computed(() => {
  if (!activeHandover.value) return [];
  return activeHandover.value.readyPackages.filter((p: any) => selectedPackageIds.value.includes(p.id));
});

const selectedPackagesCount = computed(() => selectedPackages.value.length);

const selectedTotalAmountUSD = computed(() => {
  return selectedPackages.value.reduce((sum: number, p: any) => sum + p.costUSD, 0);
});

function togglePackageSelection(pkgId: string) {
  const idx = selectedPackageIds.value.indexOf(pkgId);
  if (idx !== -1) {
    selectedPackageIds.value.splice(idx, 1);
  } else {
    selectedPackageIds.value.push(pkgId);
  }
}

function toggleSelectAll(select: boolean) {
  if (!activeHandover.value) return;
  if (select) {
    selectedPackageIds.value = activeHandover.value.readyPackages.map((p: any) => p.id);
  } else {
    selectedPackageIds.value = [];
  }
}

function openHandoverReturnModal(pkg: any) {
  returnTargetPkg.value = pkg;
  const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
  handoverReturnForm.value = {
    reason: 'Отказ клиента при осмотре',
    refundAmount: Math.round(pkg.costUSD * activeRate * 100) / 100,
    returnTracking: `RET-${pkg.trackingNumber}`,
  };
  showHandoverReturnModal.value = true;
}

function confirmHandoverReturn() {
  if (!returnTargetPkg.value) return;
  const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
  const refundUSD = handoverReturnForm.value.refundAmount / activeRate;

  store.processPackageReturn(
    returnTargetPkg.value.id,
    handoverReturnForm.value.reason,
    refundUSD,
    handoverReturnForm.value.returnTracking
  );

  // Удаляем из списка готовых к выдаче
  if (activeHandover.value) {
    activeHandover.value.readyPackages = activeHandover.value.readyPackages.filter(
      (p: any) => p.id !== returnTargetPkg.value.id
    );
    selectedPackageIds.value = selectedPackageIds.value.filter((id) => id !== returnTargetPkg.value.id);
  }

  showHandoverReturnModal.value = false;
  successToast.value = `Посылка ${returnTargetPkg.value.trackingNumber} переведена в возврат (${handoverReturnForm.value.reason})`;
  playChime(660);
}

function completeHandover() {
  if (selectedPackagesCount.value === 0) return;
  playChime(1046);
  const cargoCode = activeHandover.value?.customer?.cargoCode || store.customers[0]?.cargoCode || 'CARGO-1';
  const branchId = selectedBranchId.value || 'b-1';
  const idsToRelease = [...selectedPackageIds.value];

  const sumUSD = store.handoverClientPackages(cargoCode, branchId, idsToRelease);
  const curName = currentBranch.value?.name || 'ПВЗ';
  successToast.value = `Выдано ${idsToRelease.length} посылок клиенту ${cargoCode} в «${curName}». Сумма ${store.formatMoney(sumUSD)} внесена в кассу ПВЗ.`;
  activeHandover.value = null;
  selectedPackageIds.value = [];
}

// ПРИЕМКА ТОВАРА (INTAKE)
function handleScan() {
  const query = scanInput.value.trim();
  if (!query) return;

  if (terminalMode.value === 'HANDOVER') {
    handleHandoverScan(query);
  } else {
    handleIntakeScan(query);
  }
  scanInput.value = '';
}

function getBranchName(branchId: string) {
  if (!branchId) return 'ПВЗ';
  const b = store.branches.find((br) => br.id === branchId);
  if (b) return `${b.name} (${b.address})`;
  const wh = store.originWarehouses.find((w) => w.id === branchId);
  if (wh) return `Склад ${wh.city} (${wh.country})`;
  return branchId;
}

function switchToBranch(branchId: string) {
  selectedBranchId.value = branchId;
  if (activeHandover.value?.customer) {
    const custCode = activeHandover.value.customer.cargoCode;
    handleHandoverScan(custCode);
  }
}

function handleHandoverScan(query: string) {
  let targetCode = query.trim();
  if (targetCode.includes('c=')) {
    const matchCode = targetCode.match(/[?&]c=([^&]+)/i);
    if (matchCode) targetCode = decodeURIComponent(matchCode[1]);
  }

  const qUpper = targetCode.toUpperCase();

  // 1. Поиск по трек-номеру
  const matchPkg = store.packages.find((p) => p.trackingNumber.toUpperCase() === qUpper);
  if (matchPkg) {
    targetCode = matchPkg.customerCargoCode;
  }

  // 2. Поиск клиента по карго-коду или телефону
  const cust = store.customers.find(
    (c) => c.cargoCode.toUpperCase() === targetCode.toUpperCase() || c.phone.replace(/\s+/g, '') === targetCode.replace(/\s+/g, '')
  ) || store.customers.find((c) => c.cargoCode.toUpperCase().includes(targetCode.toUpperCase())) || store.customers[0];

  if (!cust) {
    playChime(350, 'sawtooth');
    successToast.value = `Клиент с кодом "${targetCode}" не найден в системе. Добавьте клиента в разделе «Клиенты».`;
    return;
  }

  const currentTerminalBranchId = selectedBranchId.value || 'b-1';
  const curName = currentBranch.value?.name || 'ПВЗ';
  const allCustPkgs = store.packages.filter(
    (p) => p.customerCargoCode.toUpperCase() === cust.cargoCode.toUpperCase()
  );

  // Готовые к выдаче именно в текущем ПВЗ
  const readyAtThisBranch = allCustPkgs.filter(
    (p) => p.status === 'READY_FOR_PICKUP' && (p.branchId === currentTerminalBranchId || (!p.branchId && currentTerminalBranchId === 'b-1'))
  );

  // Готовые к выдаче в других филиалах
  const readyOtherBranches = allCustPkgs.filter(
    (p) => p.status === 'READY_FOR_PICKUP' && p.branchId && p.branchId !== currentTerminalBranchId
  );

  // В пути / на складе в Китае
  const inTransitPkgs = allCustPkgs.filter(
    (p) => p.status === 'IN_TRANSIT' || p.status === 'RECEIVED_AT_ORIGIN' || p.status === 'CUSTOMS'
  );

  activeHandover.value = {
    verified: true,
    customer: cust,
    readyPackages: readyAtThisBranch,
    readyOtherBranches: readyOtherBranches,
    inTransitPkgs: inTransitPkgs,
    totalAmountUSD: readyAtThisBranch.reduce((s, p) => s + p.costUSD, 0),
  };
  selectedPackageIds.value = readyAtThisBranch.map((p) => p.id);

  if (readyAtThisBranch.length === 0) {
    playChime(350, 'sawtooth');
    if (readyOtherBranches.length > 0) {
      const otherNames = readyOtherBranches.map((p) => getBranchName(p.branchId)).join(', ');
      successToast.value = `Внимание: в «${curName}» нет товаров клиента ${cust.cargoCode}. Товар находится в: ${otherNames}`;
    } else if (inTransitPkgs.length > 0) {
      successToast.value = `В «${curName}» нет готовых товаров. Посылки клиента (${inTransitPkgs.length} шт) еще в пути.`;
    } else {
      successToast.value = `У клиента ${cust.cargoCode} нет готовых к выдаче товаров в данном ПВЗ.`;
    }
  } else {
    playChime(880);
    successToast.value = `Клиент ${cust.fullName} (${cust.cargoCode}): найдено ${readyAtThisBranch.length} посылок к выдаче в «${curName}».`;
  }
}

function handleIntakeScan(track: string) {
  let cleanTrack = track.trim();
  let clientCargoCode = '';

  // Если отсканирован QR-код клиента (cargona://pickup...)
  if (
    cleanTrack.toLowerCase().includes('cargona://') ||
    cleanTrack.toLowerCase().includes('pickup') ||
    cleanTrack.includes('c=')
  ) {
    const matchCode = cleanTrack.match(/[?&]c=([^&]+)/i);
    if (matchCode) {
      clientCargoCode = decodeURIComponent(matchCode[1]).toUpperCase();
    }

    // Если мы на странице выдачи ПВЗ, автоматически переключаем на выдачу клиенту
    if (isPvzPath.value) {
      terminalMode.value = 'HANDOVER';
      handleHandoverScan(clientCargoCode || cleanTrack);
      return;
    }
  }

  // Если отсканировали обычный трек-номер посылки
  const existing = !clientCargoCode
    ? store.packages.find((p) => p.trackingNumber.toUpperCase() === cleanTrack.toUpperCase())
    : null;
  isExistingIntake.value = !!existing;

  const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
  const costLocal = existing
    ? Math.round(existing.costUSD * activeRate * 100) / 100
    : Math.max(
        Math.round(store.settings.autoDeliveryRatePerKgUSD * (existing?.weightKg || 2.5) * activeRate * 100) / 100,
        Math.round(store.settings.minPackageCostUSD * activeRate * 100) / 100
      );

  const defaultShelf = currentBranchCells.value[0]?.shelf || (isOriginWarehouse.value ? 'Паллет CN-01' : 'Полка А-01');
  const customerCode =
    clientCargoCode ||
    existing?.customerCargoCode ||
    intakeForm.value.customerCargoCode ||
    store.customers[0]?.cargoCode ||
    `${store.settings.codePrefix || 'CRG'}-101`;
  const finalTrack = clientCargoCode ? (intakeForm.value.trackingNumber || '') : cleanTrack.toUpperCase();

  scannedIntakeItem.value = existing || { trackingNumber: finalTrack, customerCargoCode: customerCode };
  intakeForm.value = {
    trackingNumber: finalTrack,
    customerCargoCode: customerCode,
    weightKg: existing?.weightKg || 2.5,
    lengthCm: existing?.lengthCm || 30,
    widthCm: existing?.widthCm || 20,
    heightCm: existing?.heightCm || 15,
    shelfLocation: existing?.shelfLocation || defaultShelf,
    costLocal,
    targetStatus: isOriginWarehouse.value ? 'RECEIVED_AT_ORIGIN' : 'READY_FOR_PICKUP',
  };

  playChime(880);
  if (clientCargoCode) {
    successToast.value = `Клиент ${customerCode} идентифицирован. Теперь отсканируйте ШК с коробки посылки.`;
  }
}

function simulateClientQrScan() {
  const code = store.customers[0]?.cargoCode || `${store.settings.codePrefix || 'CRG'}-101`;
  handleHandoverScan(code);
}

function simulateIntakeScan() {
  const sampleTracks = ['SF9918234123', 'ZTO482910482', 'YT9928172635', 'CARGO-CN-991'];
  const randTrack = sampleTracks[Math.floor(Math.random() * sampleTracks.length)];
  handleIntakeScan(randTrack);
}

function saveIntakePackage() {
  if (!intakeForm.value.trackingNumber) return;
  const activeRate = store.ratesToUSD[store.activeCurrency] || 1;
  const costUSD = intakeForm.value.costLocal / activeRate;

  const savedPkg = store.intakePackage({
    trackingNumber: intakeForm.value.trackingNumber,
    customerCargoCode: intakeForm.value.customerCargoCode,
    weightKg: intakeForm.value.weightKg,
    lengthCm: intakeForm.value.lengthCm,
    widthCm: intakeForm.value.widthCm,
    heightCm: intakeForm.value.heightCm,
    costUSD,
    shelfLocation: intakeForm.value.shelfLocation,
    status: intakeForm.value.targetStatus,
    branchId: selectedBranchId.value,
  });

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  if (!branchIntakeHistories.value[selectedBranchId.value]) {
    branchIntakeHistories.value[selectedBranchId.value] = [];
  }
  branchIntakeHistories.value[selectedBranchId.value].unshift({
    ...savedPkg,
    time: timeStr,
    costLocal: intakeForm.value.costLocal,
    costUSD,
    branchId: selectedBranchId.value,
  });

  playChime(1046);
  const curName = currentBranch.value?.name || 'локация';
  successToast.value = isOriginWarehouse.value
    ? `Посылка ${savedPkg.trackingNumber} успешно принята на складе «${curName}» (Паллет/зона: ${savedPkg.shelfLocation})`
    : `Посылка ${savedPkg.trackingNumber} успешно оприходована в «${curName}» (Полка: ${savedPkg.shelfLocation})`;
  scannedIntakeItem.value = null;
}

function printIntakeBarcode() {
  activePrintPkg.value = {
    trackingNumber: intakeForm.value.trackingNumber,
    customerCargoCode: intakeForm.value.customerCargoCode,
    weightKg: intakeForm.value.weightKg,
    shelfLocation: intakeForm.value.shelfLocation,
  };
  showPrintModal.value = true;
}

function printDirectPkg(pkg: any) {
  activePrintPkg.value = pkg;
  showPrintModal.value = true;
}

async function toggleCamera() {
  if (isCameraActive.value) {
    await stopCamera();
  } else {
    isCameraActive.value = true;
    await nextTick();
    startCamera();
  }
}

let activeMediaStream: MediaStream | null = null;
let barcodeDetectorInstance: any = null;
let nativeScanTimer: any = null;
let zxingReader: MultiFormatReader | null = null;
let scanCanvas: HTMLCanvasElement | null = null;
let scanCtx: CanvasRenderingContext2D | null = null;
let isDecodingFrame = false;

function initZXingReader() {
  if (!zxingReader) {
    zxingReader = new MultiFormatReader();
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    zxingReader.setHints(hints);
  }
}

async function startCamera() {
  try {
    initZXingReader();

    if (!scanCanvas) {
      scanCanvas = document.createElement('canvas');
      scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    }

    activeMediaStream = stream;
    if (!scannerVideoRef.value || !activeMediaStream) return;

    scannerVideoRef.value.srcObject = activeMediaStream;
    scannerVideoRef.value.setAttribute('playsinline', 'true');
    await scannerVideoRef.value.play();

    // Инициализация BarcodeDetector если поддерживается нативно (iOS 17+ / Android)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        if (!barcodeDetectorInstance) {
          const supported = await (window as any).BarcodeDetector.getSupportedFormats();
          barcodeDetectorInstance = new (window as any).BarcodeDetector({
            formats: supported && supported.length > 0 ? supported : ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf'],
          });
        }
      } catch (e) {}
    }

    // Запуск активного цикла захвата и декодирования кадров
    isDecodingFrame = false;
    processScanLoop();
  } catch (err) {
    console.error('Camera start error', err);
    successToast.value = 'Не удалось запустить камеру. Проверьте доступ в настройках браузера.';
    isCameraActive.value = false;
  }
}

function processScanLoop() {
  if (!isCameraActive.value) return;

  const video = scannerVideoRef.value;
  if (!video || video.readyState < 2 || video.paused || video.ended || video.videoWidth === 0) {
    nativeScanTimer = requestAnimationFrame(processScanLoop);
    return;
  }

  if (isDecodingFrame) {
    nativeScanTimer = requestAnimationFrame(processScanLoop);
    return;
  }

  isDecodingFrame = true;

  try {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    if (!scanCanvas || !scanCtx) return;

    scanCanvas.width = vWidth;
    scanCanvas.height = vHeight;
    scanCtx.drawImage(video, 0, 0, vWidth, vHeight);

    // 1. Сначала проверяем нативным BarcodeDetector (быстрее всех)
    if (barcodeDetectorInstance) {
      barcodeDetectorInstance
        .detect(scanCanvas)
        .then((barcodes: any[]) => {
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            onBarcodeFound(barcodes[0].rawValue);
            return;
          }
          decodeCanvasWithZXing(scanCanvas!, scanCtx!);
        })
        .catch(() => {
          decodeCanvasWithZXing(scanCanvas!, scanCtx!);
        });
    } else {
      decodeCanvasWithZXing(scanCanvas, scanCtx);
    }
  } catch (e) {
    isDecodingFrame = false;
    if (isCameraActive.value) {
      nativeScanTimer = requestAnimationFrame(processScanLoop);
    }
  }
}

function decodeCanvasWithZXing(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const lumSource = new RGBLuminanceSource(imgData.data, canvas.width, canvas.height);

    // Вариант 1: GlobalHistogramBinarizer (лучший для экранов компьютеров и бликов)
    try {
      const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(lumSource));
      const res = zxingReader!.decodeWithState(bitmap);
      if (res && res.getText()) {
        onBarcodeFound(res.getText());
        return;
      }
    } catch (e) {}

    // Вариант 2: HybridBinarizer (лучший для напечатанных бумажных наклеек)
    try {
      const bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
      const res = zxingReader!.decodeWithState(bitmap);
      if (res && res.getText()) {
        onBarcodeFound(res.getText());
        return;
      }
    } catch (e) {}
  } catch (err) {
  } finally {
    isDecodingFrame = false;
    if (isCameraActive.value) {
      setTimeout(() => {
        if (isCameraActive.value) {
          nativeScanTimer = requestAnimationFrame(processScanLoop);
        }
      }, 40);
    }
  }
}

function onBarcodeFound(text: string) {
  if (!isCameraActive.value) return;
  scanInput.value = text;
  handleScan();
  stopCamera();
}

async function stopCamera() {
  if (nativeScanTimer) {
    cancelAnimationFrame(nativeScanTimer);
    nativeScanTimer = null;
  }
  isDecodingFrame = false;
  if (activeMediaStream) {
    try {
      activeMediaStream.getTracks().forEach((track) => track.stop());
    } catch (e) {}
    activeMediaStream = null;
  }
  if (scannerVideoRef.value) {
    try {
      scannerVideoRef.value.srcObject = null;
    } catch (e) {}
  }
  if (zxingReader) {
    try {
      zxingReader.reset();
    } catch (e) {}
  }
  isCameraActive.value = false;
}

onUnmounted(() => {
  stopCamera();
});
</script>
