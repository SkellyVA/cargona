<template>
  <div class="space-y-6 max-w-full min-w-0 overflow-x-hidden">
    <!-- Хедер раздела с табами переключения (Филиалы ПВЗ / Международные склады) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">{{ t('branches.title') }}</h1>
        <p class="text-xs text-text-tertiary mt-0.5">{{ t('branches.subtitle') }}</p>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
        <!-- Табы переключения -->
        <div class="flex items-center gap-1.5 p-1 bg-[#181B23] border border-white/[0.08] rounded-2xl w-full sm:w-auto justify-around">
          <button
            type="button"
            @click="activeViewTab = 'BRANCHES'"
            class="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            :class="activeViewTab === 'BRANCHES' ? 'bg-accent-blue text-white shadow-glow-blue' : 'text-text-secondary hover:text-white'"
          >
            <Store class="w-4 h-4" />
            <span>{{ t('branches.branchesTab') }}</span>
            <span class="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] font-mono">{{ store.branches.length }}</span>
          </button>

          <button
            type="button"
            @click="activeViewTab = 'WAREHOUSES'"
            class="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            :class="activeViewTab === 'WAREHOUSES' ? 'bg-accent-blue text-white shadow-glow-blue' : 'text-text-secondary hover:text-white'"
          >
            <Globe class="w-4 h-4" />
            <span>{{ t('branches.warehousesTab') }}</span>
            <span class="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] font-mono">{{ store.originWarehouses.length }}</span>
          </button>
        </div>

        <!-- Кнопка добавления -->
        <button
          v-if="activeViewTab === 'BRANCHES'"
          @click="showCreateBranchModal = true"
          class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition cursor-pointer w-full sm:w-auto whitespace-nowrap"
        >
          <Plus class="w-4 h-4" />
          <span>{{ t('branches.addBranchBtn') }}</span>
        </button>

        <button
          v-else
          @click="showCreateWarehouseModal = true"
          class="flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs shadow-glow-blue transition cursor-pointer w-full sm:w-auto whitespace-nowrap"
        >
          <Plus class="w-4 h-4" />
          <span>{{ t('branches.addWarehouseBtn') }}</span>
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

    <!-- ТАБ 1: Список филиалов / ПВЗ -->
    <div v-if="activeViewTab === 'BRANCHES'" class="space-y-4 sm:space-y-6">
      <div v-if="store.branches.length === 0" class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-card">
        <div class="w-16 h-16 rounded-3xl bg-accent-blue/15 border border-accent-blue/30 text-accent-cyan flex items-center justify-center mx-auto">
          <Store class="w-8 h-8" />
        </div>
        <div class="space-y-1 max-w-sm mx-auto">
          <h3 class="text-base sm:text-lg font-bold text-white">Пункты выдачи не добавлены</h3>
          <p class="text-xs text-text-tertiary">
            Добавьте филиалы ПВЗ в вашем городе, чтобы распределять грузы по полкам и выдавать их клиентам.
          </p>
        </div>
        <button
          @click="showAddBranchModal = true"
          class="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue inline-flex items-center gap-2 transition cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Создать первый ПВЗ</span>
        </button>
      </div>

      <div
        v-for="branch in store.branches"
        :key="branch.id"
        class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4 sm:space-y-5 hover:border-white/[0.12] transition"
      >
        <!-- Шапка карточки ПВЗ -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start sm:items-center gap-3">
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#181B23] border border-white/[0.08] flex items-center justify-center text-accent-cyan shrink-0">
              <Store class="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm sm:text-base font-bold text-white truncate">{{ branch.name }}</span>
                <span class="w-2.5 h-2.5 rounded-full bg-accent-emerald inline-block shrink-0" title="Онлайн"></span>
              </div>
              <div class="text-xs text-text-secondary mt-0.5 truncate">{{ branch.city }} • {{ branch.address }} • {{ branch.phone }}</div>
            </div>
          </div>

          <!-- Касса и действия -->
          <div class="flex items-center gap-2.5 sm:gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0">
            <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl px-3.5 py-1.5 sm:py-2 text-right">
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">Касса</div>
              <div class="text-sm sm:text-base font-bold font-mono text-white mt-0.5">{{ store.formatMoney(branch.cashBalanceUSD) }}</div>
            </div>

            <button
              @click="collectCash(branch)"
              class="flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-text-secondary hover:text-white transition cursor-pointer"
              title="Инкассация"
            >
              <Banknote class="w-4 h-4" />
              <span>Инкассировать</span>
            </button>
          </div>
        </div>

        <!-- Ячейки и стеллажи хранения этого ПВЗ -->
        <div class="bg-[#181B23]/60 border border-white/[0.04] rounded-2xl p-4 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex items-center gap-2">
              <Box class="w-4 h-4 text-accent-cyan shrink-0" />
              <span class="font-bold text-white text-xs">Адресный склад (Стеллажи и Полки)</span>
              <span class="text-text-tertiary text-[11px] shrink-0">({{ branch.cells.length }} ячеек)</span>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                @click="openPrintShelfModal(branch)"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-text-secondary hover:text-white transition cursor-pointer whitespace-nowrap"
              >
                <Printer class="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                <span>Печать ШК</span>
              </button>

              <button
                @click="openAddCellModal(branch)"
                class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-blue/20 hover:bg-accent-blue/30 text-[11px] font-bold text-accent-cyan transition cursor-pointer whitespace-nowrap"
              >
                <Plus class="w-3.5 h-3.5 shrink-0" />
                <span>Добавить полку</span>
              </button>
            </div>
          </div>

          <!-- Сетка полок (Клик по ячейке показывает находящиеся в ней товары) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
            <div
              v-for="cell in branch.cells"
              :key="cell.id"
              @click="openCellContents(branch, cell)"
              class="bg-[#13151B] border border-white/[0.06] rounded-xl p-2.5 text-center space-y-1 hover:border-accent-cyan/60 hover:bg-white/[0.04] transition cursor-pointer group select-none relative"
              title="Нажмите, чтобы посмотреть товары на этой полке"
            >
              <div class="text-[10px] text-text-tertiary font-mono flex items-center justify-between">
                <span>{{ cell.rack }}</span>
                <button
                  type="button"
                  @click.stop="printSpecificCell(branch, cell)"
                  class="p-1 rounded hover:bg-white/[0.1] text-accent-cyan opacity-0 group-hover:opacity-100 transition"
                  title="Быстрая печать ШК ячейки"
                >
                  <Printer class="w-3 h-3" />
                </button>
              </div>
              <div class="text-xs font-mono font-black text-accent-cyan">{{ cell.shelf }}</div>
              <div class="text-[10px]" :class="cellPackagesCount(branch, cell) > 0 ? 'text-white font-bold' : 'text-text-secondary'">
                {{ cellPackagesCount(branch, cell) }} {{ cellPackagesCount(branch, cell) === 1 ? 'посылка' : 'посылок' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ТАБ 2: Международные склады отправления -->
    <div v-else class="space-y-6">
      <div v-if="store.originWarehouses.length === 0" class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-card">
        <div class="w-16 h-16 rounded-3xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan flex items-center justify-center mx-auto">
          <Globe class="w-8 h-8" />
        </div>
        <div class="space-y-1 max-w-sm mx-auto">
          <h3 class="text-base sm:text-lg font-bold text-white">Международные склады не добавлены</h3>
          <p class="text-xs text-text-tertiary">
            Добавьте склады консолидации в Китае (Иу/Гуанчжоу), Турции или других странах для приема грузов.
          </p>
        </div>
        <button
          @click="showAddWarehouseModal = true"
          class="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue inline-flex items-center gap-2 transition cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Добавить склад консолидации</span>
        </button>
      </div>

      <div
        v-for="wh in store.originWarehouses"
        :key="wh.id"
        class="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card space-y-4 sm:space-y-5 hover:border-white/[0.12] transition"
      >
        <!-- Шапка карточки склада -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex items-start gap-3 sm:gap-4 min-w-0">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#181B23] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-inner overflow-hidden p-2">
              <AppleFlag :countryCode="wh.countryCode" :size="32" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm sm:text-base font-bold text-white truncate">{{ wh.name || `Склад ${wh.city} (${wh.country})` }}</span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 shrink-0"
                  :class="wh.isActive ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30' : 'bg-white/10 text-text-tertiary border border-white/10'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="wh.isActive ? 'bg-accent-emerald animate-pulse' : 'bg-text-tertiary'"></span>
                  <span>{{ wh.isActive ? 'Принимает' : 'Пауза' }}</span>
                </span>
                <span class="px-2 py-0.5 rounded-md bg-[#181B23] border border-white/[0.08] font-mono text-[10px] text-text-tertiary shrink-0">
                  ISO: {{ wh.countryCode }}
                </span>
              </div>

              <div class="text-xs text-text-secondary mt-1 truncate">
                <span class="text-white font-medium">Получатель:</span> {{ wh.receiverName }} • <span class="text-white font-medium">Тел:</span> {{ wh.phone }}
              </div>
              <div class="text-xs text-text-tertiary mt-0.5 font-mono truncate">
                {{ wh.address }}
              </div>
              <div class="text-[11px] text-accent-cyan mt-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0"></span>
                <span class="truncate">{{ wh.instructions }}</span>
              </div>
            </div>
          </div>

          <!-- Метрики и действия склада -->
          <div class="flex items-center gap-2 sm:gap-2.5 self-end sm:self-auto shrink-0 flex-wrap w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0">
            <div class="bg-[#181B23] border border-white/[0.06] rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-right">
              <div class="text-[10px] text-text-tertiary uppercase font-semibold">На складе</div>
              <div class="text-sm sm:text-base font-bold font-mono text-accent-cyan mt-0.5">
                {{ whPackagesCount(wh) }} шт.
              </div>
            </div>

            <router-link
              :to="`/o/${slug}/wms`"
              class="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 border border-accent-cyan/30 text-xs font-bold text-accent-cyan transition cursor-pointer"
              title="Перейти в WMS для приемки"
            >
              <PackagePlus class="w-4 h-4" />
              <span>Приемка</span>
            </router-link>

            <button
              @click="openEditWarehouseModal(wh)"
              class="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-text-secondary hover:text-white transition cursor-pointer"
              title="Редактировать склад"
            >
              <Pencil class="w-4 h-4 text-accent-cyan" />
            </button>

            <button
              @click="confirmDeleteWarehouse(wh)"
              class="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.06] text-text-secondary hover:text-rose-400 transition cursor-pointer"
              title="Удалить склад"
            >
              <Trash2 class="w-4 h-4 text-rose-400" />
            </button>

            <button
              @click="store.toggleOriginWarehouse(wh.id)"
              class="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-text-secondary hover:text-white transition cursor-pointer"
              :title="wh.isActive ? 'Приостановить склад' : 'Активировать склад'"
            >
              <Power class="w-4 h-4" :class="wh.isActive ? 'text-accent-emerald' : 'text-text-tertiary'" />
            </button>
          </div>
        </div>

        <!-- Ячейки и паллеты адресного хранения на складе -->
        <div class="bg-[#181B23]/60 border border-white/[0.04] rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Box class="w-4 h-4 text-accent-cyan" />
              <span class="font-bold text-white text-xs">Адресный склад (Зоны сортировки и Паллеты)</span>
              <span class="text-text-tertiary text-[11px]">({{ wh.cells?.length || 0 }} зон/паллет)</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="openPrintShelfModal(wh)"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-text-secondary hover:text-white transition cursor-pointer"
              >
                <Printer class="w-3.5 h-3.5 text-accent-cyan" />
                <span>Печать ШК паллет</span>
              </button>

              <button
                @click="openAddCellModal(wh)"
                class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-blue/20 hover:bg-accent-blue/30 text-[11px] font-bold text-accent-cyan transition cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Добавить паллет</span>
              </button>
            </div>
          </div>

          <!-- Сетка паллет / зон сортировки склада -->
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
            <div
              v-for="cell in (wh.cells || [])"
              :key="cell.id"
              @click="openCellContents(wh, cell)"
              class="bg-[#13151B] border border-white/[0.06] rounded-xl p-2.5 text-center space-y-1 hover:border-accent-cyan/60 hover:bg-white/[0.04] transition cursor-pointer group select-none relative"
              title="Нажмите, чтобы посмотреть посылки на этом паллете"
            >
              <div class="text-[10px] text-text-tertiary font-mono flex items-center justify-between">
                <span>{{ cell.rack }}</span>
                <button
                  type="button"
                  @click.stop="printSpecificCell(wh, cell)"
                  class="p-1 rounded hover:bg-white/[0.1] text-accent-cyan opacity-0 group-hover:opacity-100 transition"
                  title="Печать ШК паллета"
                >
                  <Printer class="w-3 h-3" />
                </button>
              </div>
              <div class="text-xs font-mono font-black text-accent-cyan">{{ cell.shelf }}</div>
              <div class="text-[10px]" :class="cellPackagesCount(wh, cell) > 0 ? 'text-white font-bold' : 'text-text-secondary'">
                {{ cellPackagesCount(wh, cell) }} {{ cellPackagesCount(wh, cell) === 1 ? 'посылка' : 'посылок' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно: Добавить Склад -->
    <AppModal v-model="showCreateWarehouseModal" title="Новый международный склад">
      <div class="space-y-4 text-xs">
        <!-- Быстрые пресеты популярных стран -->
        <div>
          <label class="text-text-secondary mb-2 block font-semibold">Быстрый выбор страны:</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in countryPresets"
              :key="preset.code"
              type="button"
              @click="selectCountryPreset('new', preset)"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5"
              :class="newWarehouse.countryCode === preset.code
                ? 'bg-accent-blue/20 border-accent-cyan text-white shadow-glow-blue'
                : 'bg-[#181B23] border-white/[0.08] text-text-secondary hover:text-white hover:border-white/20'"
            >
              <AppleFlag :countryCode="preset.code" :size="16" />
              <span>{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Название склада в системе</label>
          <input
            v-model="newWarehouse.name"
            placeholder="Например: Центральный хаб Иу / Склад Гуанчжоу"
            class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Страна склада</label>
            <input
              v-model="newWarehouse.country"
              placeholder="Китай, Турция, Италия..."
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">ISO код страны (2 буквы)</label>
            <div class="flex items-center gap-2">
              <input
                v-model="newWarehouse.countryCode"
                placeholder="CN"
                maxlength="2"
                @input="newWarehouse.countryCode = newWarehouse.countryCode.toUpperCase()"
                class="flex-1 h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase font-bold"
              />
              <div class="w-10 h-10 rounded-xl bg-[#181B23] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-inner p-1.5" title="Официальный флаг">
                <AppleFlag :countryCode="newWarehouse.countryCode" :size="24" />
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Город / Логистический хаб</label>
            <input
              v-model="newWarehouse.city"
              placeholder="Иу / Стамбул / Дубай"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Почтовый индекс (Zip Code)</label>
            <input
              v-model="newWarehouse.zipCode"
              placeholder="322000"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Адрес склада (на языке страны)</label>
          <input
            v-model="newWarehouse.address"
            placeholder="Адрес склада для маркетплейсов (1688, Taobao, Trendyol, Amazon...)"
            class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Получатель (Consignee Name)</label>
            <input
              v-model="newWarehouse.receiverName"
              placeholder="Cargona Warehouse Hub"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Телефон склада</label>
            <input
              v-model="newWarehouse.phone"
              placeholder="+86 138 0000 0000"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Инструкция для клиентов</label>
          <input
            v-model="newWarehouse.instructions"
            placeholder="Например: Указывать код клиента в поле Имя получателя"
            class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreateWarehouseModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="createWarehouse"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
        >
          Открыть склад
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Редактировать склад -->
    <AppModal v-model="showEditWarehouseModal" title="Параметры склада">
      <div v-if="editingWarehouse" class="space-y-4 text-xs">
        <!-- Быстрые пресеты популярных стран -->
        <div>
          <label class="text-text-secondary mb-2 block font-semibold">Быстрый выбор страны:</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in countryPresets"
              :key="preset.code"
              type="button"
              @click="selectCountryPreset('edit', preset)"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5"
              :class="editingWarehouse.countryCode === preset.code
                ? 'bg-accent-blue/20 border-accent-cyan text-white shadow-glow-blue'
                : 'bg-[#181B23] border-white/[0.08] text-text-secondary hover:text-white hover:border-white/20'"
            >
              <AppleFlag :countryCode="preset.code" :size="16" />
              <span>{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Название склада в системе</label>
          <input
            v-model="editingWarehouse.name"
            placeholder="Название склада"
            class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Страна склада</label>
            <input
              v-model="editingWarehouse.country"
              placeholder="Страна"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">ISO код страны (2 буквы)</label>
            <div class="flex items-center gap-2">
              <input
                v-model="editingWarehouse.countryCode"
                placeholder="CN"
                maxlength="2"
                @input="editingWarehouse.countryCode = editingWarehouse.countryCode.toUpperCase()"
                class="flex-1 h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase font-bold"
              />
              <div class="w-10 h-10 rounded-xl bg-[#181B23] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-inner p-1.5">
                <AppleFlag :countryCode="editingWarehouse.countryCode" :size="24" />
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Город / Хаб</label>
            <input
              v-model="editingWarehouse.city"
              placeholder="Город"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label class="text-text-secondary mb-1 block">Почтовый индекс (Zip Code)</label>
            <input
              v-model="editingWarehouse.zipCode"
              placeholder="Почтовый индекс"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Адрес склада</label>
          <input
            v-model="editingWarehouse.address"
            placeholder="Адрес склада"
            class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono text-xs"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-text-secondary mb-1 block">Получатель (Consignee Name)</label>
            <input
              v-model="editingWarehouse.receiverName"
              placeholder="Имя получателя"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label class="text-text-secondary mb-1 block">Телефон склада</label>
            <input
              v-model="editingWarehouse.phone"
              placeholder="Телефон"
              class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Инструкция для клиентов</label>
          <input
            v-model="editingWarehouse.instructions"
            placeholder="Инструкция для клиентов"
            class="w-full h-10 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <button
            @click="confirmDeleteWarehouse(editingWarehouse)"
            class="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Удалить склад</span>
          </button>

          <div class="flex items-center gap-2">
            <button
              @click="showEditWarehouseModal = false"
              class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              @click="saveEditedWarehouse"
              class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </div>
      </template>
    </AppModal>
    <AppModal v-model="showCreateBranchModal" title="Новый пункт выдачи">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Название филиала</label>
          <input
            v-model="newBranch.name"
            placeholder="ПВЗ Душанбе Центр"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Город</label>
          <input
            v-model="newBranch.city"
            placeholder="Душанбе"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Адрес</label>
          <input
            v-model="newBranch.address"
            placeholder="ул. Айни 45"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Телефон точки</label>
          <input
            v-model="newBranch.phone"
            placeholder="+992 90 000 0001"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreateBranchModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="createBranch"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Создать филиал
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Добавить ячейку / полку -->
    <AppModal v-model="showAddCellModal" title="Добавить полку хранения">
      <div class="space-y-3.5 text-xs">
        <div>
          <label class="text-text-secondary mb-1 block">Стеллаж</label>
          <input
            v-model="newCell.rack"
            placeholder="Стеллаж 3"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono"
          />
        </div>

        <div>
          <label class="text-text-secondary mb-1 block">Полка / Ячейка</label>
          <input
            v-model="newCell.shelf"
            placeholder="Полка Д-01"
            class="w-full h-10 px-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white focus:border-accent-cyan focus:outline-none font-mono uppercase font-bold"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showAddCellModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition"
        >
          Отмена
        </button>
        <button
          @click="saveNewCell"
          class="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition"
        >
          Добавить полку
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Выбор ячеек филиала для печати ШК -->
    <AppModal v-model="showBranchCellsPrintModal" :title="`Печать ШК ячеек: ${activeBranchForPrint?.name || 'ПВЗ'}`">
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div class="text-[10px] text-text-tertiary font-semibold uppercase">Филиал ПВЗ</div>
            <div class="font-bold text-white text-sm mt-0.5">{{ activeBranchForPrint?.name }}</div>
            <div class="text-[11px] text-text-secondary mt-0.5">{{ activeBranchForPrint?.city }}, {{ activeBranchForPrint?.address }}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-text-tertiary font-semibold uppercase">Всего ячеек</div>
            <div class="font-mono font-bold text-accent-cyan text-sm mt-0.5">{{ activeBranchForPrint?.cells?.length || 0 }} шт.</div>
          </div>
        </div>

        <!-- Кнопка быстрой пакетной печати всех ячеек филиала -->
        <button
          type="button"
          @click="printAllBranchCells(activeBranchForPrint)"
          class="w-full py-3 rounded-2xl bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-cyan/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer shadow-glow-cyan"
        >
          <Printer class="w-4 h-4 text-accent-cyan" />
          <span>Печать ВСЕХ ячеек филиала ({{ activeBranchForPrint?.cells?.length }} шт. на термопринтер)</span>
        </button>

        <div class="pt-2 border-t border-white/[0.06]">
          <div class="text-text-secondary font-semibold mb-2">Или выберите конкретную ячейку для печати:</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            <button
              v-for="cell in (activeBranchForPrint?.cells || [])"
              :key="cell.id"
              type="button"
              @click="printSpecificCell(activeBranchForPrint, cell)"
              class="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-left transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div class="text-[10px] text-text-tertiary font-mono">{{ cell.rack }}</div>
                <div class="font-bold text-xs font-mono text-white mt-0.5 group-hover:text-accent-cyan transition">{{ cell.shelf }}</div>
              </div>
              <div class="mt-2 flex items-center justify-between text-[10px] font-mono text-text-tertiary">
                <span>{{ cell.barcode }}</span>
                <Printer class="w-3.5 h-3.5 text-accent-cyan" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showBranchCellsPrintModal = false"
          class="px-4 py-2.5 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Закрыть
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно: Содержимое ячейки хранения (Список товаров на полке) -->
    <AppModal v-model="showCellContentsModal" :title="`Ячейка: ${activeCellForDetails?.shelf || ''} (${activeBranchForDetails?.name || ''})`">
      <div class="space-y-4 text-xs">
        <!-- Шапка ячейки -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Адресная ячейка</div>
            <div class="font-mono font-bold text-accent-cyan text-base mt-0.5">{{ activeCellForDetails?.shelf }}</div>
            <div class="text-[11px] text-text-secondary">{{ activeCellForDetails?.rack }} • ШК: {{ activeCellForDetails?.barcode }}</div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="printSpecificCell(activeBranchForDetails, activeCellForDetails)"
              class="px-3 py-2 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-cyan font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>Печать ШК</span>
            </button>
          </div>
        </div>

        <!-- Список товаров в этой ячейке -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-semibold text-text-tertiary">
            <span>Посылки на этой полке:</span>
            <span class="font-mono text-white">{{ activeCellPackages.length }} шт.</span>
          </div>

          <div v-if="activeCellPackages.length > 0" class="max-h-60 overflow-y-auto space-y-2 pr-1">
            <div
              v-for="pkg in activeCellPackages"
              :key="pkg.id"
              class="p-3 rounded-xl bg-[#181B23] border border-white/[0.06] flex items-center justify-between"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-white">{{ pkg.trackingNumber }}</span>
                  <span class="px-2 py-0.5 rounded-md bg-accent-cyan/15 text-accent-cyan font-mono font-bold text-[10px]">
                    {{ pkg.customerCargoCode }}
                  </span>
                </div>
                <div class="text-[11px] text-text-secondary mt-0.5">
                  {{ pkg.description }} • {{ pkg.weightKg }} кг
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="text-right">
                  <div class="font-mono font-bold text-white">{{ store.formatMoney(pkg.costUSD) }}</div>
                  <div class="text-[10px] text-emerald-400 font-semibold mt-0.5">
                    {{ pkg.status === 'READY_FOR_PICKUP' ? 'В ПВЗ' : pkg.status }}
                  </div>
                </div>

                <button
                  type="button"
                  @click="printPackageSticker(pkg)"
                  class="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white transition cursor-pointer"
                  title="Печать этикетки посылки"
                >
                  <Printer class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="p-8 text-center text-text-tertiary bg-white/[0.02] border border-dashed border-white/[0.06] rounded-2xl">
            В данной ячейке сейчас нет размещенных посылок.
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showCellContentsModal = false"
          class="px-5 py-2.5 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Закрыть
        </button>
      </template>
    </AppModal>

    <!-- Модальное окно печати штрихкодов полок -->
    <BarcodePrintModal
      v-model="showPrintModal"
      :pkg="activeShelfPrintData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Store, Plus, Printer, Banknote, Box, X, Globe, PackagePlus, Power, Pencil, Trash2 } from 'lucide-vue-next';
import AppModal from '../components/ui/AppModal.vue';
import AppleFlag from '../components/ui/AppleFlag.vue';
import BarcodePrintModal from '../components/BarcodePrintModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const route = useRoute();
const store = useCargoStore();
const { t } = useI18n();

const slug = computed(() => (route.params.slug as string) || store.activeTenantSlug || store.tenants[0]?.slug || '');
const activeViewTab = ref<'BRANCHES' | 'WAREHOUSES'>('BRANCHES');

const showCreateBranchModal = ref(false);
const showCreateWarehouseModal = ref(false);
const showEditWarehouseModal = ref(false);
const editingWarehouse = ref<any>(null);
const showAddCellModal = ref(false);
const showPrintModal = ref(false);
const showBranchCellsPrintModal = ref(false);
const showCellContentsModal = ref(false);
const toastMessage = ref('');
const activeBranchForCell = ref<any>(null);
const activeBranchForPrint = ref<any>(null);
const activeBranchForDetails = ref<any>(null);
const activeCellForDetails = ref<any>(null);
const activeShelfPrintData = ref<any>(null);

const countryPresets = [
  { name: 'Китай', code: 'CN' },
  { name: 'Турция', code: 'TR' },
  { name: 'ОАЭ', code: 'AE' },
  { name: 'США', code: 'US' },
  { name: 'Россия', code: 'RU' },
  { name: 'Казахстан', code: 'KZ' },
  { name: 'Узбекистан', code: 'UZ' },
  { name: 'Германия', code: 'DE' },
  { name: 'Польша', code: 'PL' },
  { name: 'Италия', code: 'IT' },
];

function selectCountryPreset(target: 'new' | 'edit', preset: { name: string; code: string }) {
  if (target === 'new') {
    newWarehouse.value.country = preset.name;
    newWarehouse.value.countryCode = preset.code;
    if (!newWarehouse.value.name || newWarehouse.value.name.startsWith('Склад ')) {
      newWarehouse.value.name = `Склад ${preset.name}`;
    }
  } else if (editingWarehouse.value) {
    editingWarehouse.value.country = preset.name;
    editingWarehouse.value.countryCode = preset.code;
  }
}

const activeCellPackages = computed(() => {
  if (!activeCellForDetails.value) return [];
  const bId = activeBranchForDetails.value?.id;
  return store.packages.filter(
    (p) =>
      p.shelfLocation &&
      p.shelfLocation === activeCellForDetails.value.shelf &&
      p.status !== 'RELEASED' &&
      p.status !== 'RETURNED' &&
      (p.branchId === bId ||
        (bId === 'wh-cn' && p.branchId === 'b-origin') ||
        (bId === 'b-origin' && p.branchId === 'wh-cn') ||
        !p.branchId)
  );
});

function cellPackagesCount(branch: any, cell: any): number {
  return store.packages.filter(
    (p) =>
      p.shelfLocation &&
      p.shelfLocation === cell.shelf &&
      p.status !== 'RELEASED' &&
      p.status !== 'RETURNED' &&
      (p.branchId === branch.id ||
        (branch.id === 'wh-cn' && p.branchId === 'b-origin') ||
        (branch.id === 'b-origin' && p.branchId === 'wh-cn') ||
        !p.branchId)
  ).length;
}

function whPackagesCount(wh: any): number {
  return store.packages.filter(
    (p) =>
      (p.branchId === wh.id || (wh.id === 'wh-cn' && p.branchId === 'b-origin')) &&
      p.status === 'RECEIVED_AT_ORIGIN'
  ).length;
}

const newWarehouse = ref({
  name: '',
  country: 'Китай',
  countryCode: 'CN',
  city: '',
  address: '',
  receiverName: '',
  phone: '',
  zipCode: '',
  instructions: '',
});

function createWarehouse() {
  const code = (newWarehouse.value.countryCode || 'CN').toUpperCase().trim();
  const country = newWarehouse.value.country?.trim() || 'Международный';
  const city = newWarehouse.value.city?.trim() || 'Главный хаб';
  const name = newWarehouse.value.name?.trim() || `Склад ${city} (${country})`;

  store.addOriginWarehouse({
    name,
    country,
    countryCode: code,
    city,
    address: newWarehouse.value.address?.trim() || 'Логистический комплекс, терминал 1',
    receiverName: newWarehouse.value.receiverName?.trim() || 'CARGONA Hub',
    phone: newWarehouse.value.phone?.trim() || '+000 000 0000',
    zipCode: newWarehouse.value.zipCode?.trim() || '00000',
    instructions: newWarehouse.value.instructions?.trim() || 'Указывать код клиента при заказе',
    isActive: true,
  });

  showCreateWarehouseModal.value = false;
  toastMessage.value = `Международный склад «${name}» успешно открыт!`;
  newWarehouse.value = {
    name: '',
    country: 'Китай',
    countryCode: 'CN',
    city: '',
    address: '',
    receiverName: '',
    phone: '',
    zipCode: '',
    instructions: '',
  };
}

function openEditWarehouseModal(wh: any) {
  editingWarehouse.value = {
    id: wh.id,
    name: wh.name || `Склад ${wh.city} (${wh.country})`,
    country: wh.country,
    countryCode: wh.countryCode,
    city: wh.city,
    address: wh.address,
    receiverName: wh.receiverName,
    phone: wh.phone,
    zipCode: wh.zipCode,
    instructions: wh.instructions,
    isActive: wh.isActive,
  };
  showEditWarehouseModal.value = true;
}

function saveEditedWarehouse() {
  if (!editingWarehouse.value) return;
  const code = (editingWarehouse.value.countryCode || 'CN').toUpperCase().trim();
  store.updateOriginWarehouse(editingWarehouse.value.id, {
    name: editingWarehouse.value.name,
    country: editingWarehouse.value.country,
    countryCode: code,
    city: editingWarehouse.value.city,
    address: editingWarehouse.value.address,
    receiverName: editingWarehouse.value.receiverName,
    phone: editingWarehouse.value.phone,
    zipCode: editingWarehouse.value.zipCode,
    instructions: editingWarehouse.value.instructions,
  });
  showEditWarehouseModal.value = false;
  toastMessage.value = `Склад «${editingWarehouse.value.name}» успешно обновлен`;
  editingWarehouse.value = null;
}

function confirmDeleteWarehouse(wh: any) {
  if (!wh) return;
  const name = wh.name || wh.city || 'Склад';
  if (confirm(`Вы уверены, что хотите удалить международный склад «${name}»?`)) {
    store.deleteOriginWarehouse(wh.id);
    if (showEditWarehouseModal.value) {
      showEditWarehouseModal.value = false;
      editingWarehouse.value = null;
    }
    toastMessage.value = `Склад «${name}» удален из системы`;
  }
}

function openCellContents(branch: any, cell: any) {
  activeBranchForDetails.value = branch;
  activeCellForDetails.value = cell;
  showCellContentsModal.value = true;
}

function printPackageSticker(pkg: any) {
  activeShelfPrintData.value = {
    isCell: false,
    trackingNumber: pkg.trackingNumber,
    customerCargoCode: pkg.customerCargoCode,
    weightKg: pkg.weightKg,
    shelfLocation: pkg.shelfLocation,
  };
  showPrintModal.value = true;
}

const newBranch = ref({
  name: '',
  city: '',
  address: '',
  phone: '',
});

const newCell = ref({
  rack: 'Стеллаж 1',
  shelf: 'Полка Д-01',
});

function createBranch() {
  if (!newBranch.value.name) return;
  store.addBranch({
    name: newBranch.value.name,
    city: newBranch.value.city || 'Душанбе',
    address: newBranch.value.address || 'ул. Айни',
    phone: newBranch.value.phone || '+992 90 000 0000',
    cashBalanceUSD: 0,
    cells: [
      { id: store.nextSeqId('c', store.branches.flatMap(b => b.cells || [])), rack: 'Стеллаж 1', shelf: 'Полка А-01', barcode: 'CELL-S1-A01', packageCount: 0 },
      { id: store.nextSeqId('c', [...store.branches.flatMap(b => b.cells || []), { id: 'c-001' }]), rack: 'Стеллаж 1', shelf: 'Полка А-02', barcode: 'CELL-S1-A02', packageCount: 0 },
    ],
  });
  newBranch.value = { name: '', city: '', address: '', phone: '' };
  showCreateBranchModal.value = false;
  toastMessage.value = 'Филиал ПВЗ успешно добавлен со стартовыми полками хранения';
}

function collectCash(branch: any) {
  const sum = store.collectBranchCash(branch.id);
  toastMessage.value = `Инкассация: ${store.formatMoney(sum)} изъято из кассы ${branch.name}. Запись внесена в аудит.`;
}

function openAddCellModal(branch: any) {
  activeBranchForCell.value = branch;
  showAddCellModal.value = true;
}

function saveNewCell() {
  if (!activeBranchForCell.value || !newCell.value.shelf) return;
  store.addBranchCell(activeBranchForCell.value.id, newCell.value.rack, newCell.value.shelf);
  showAddCellModal.value = false;
  toastMessage.value = `Ячейка ${newCell.value.shelf} добавлена в ${activeBranchForCell.value.name}`;
}

function openPrintShelfModal(branch: any) {
  activeBranchForPrint.value = branch;
  showBranchCellsPrintModal.value = true;
}

function printSpecificCell(branch: any, cell: any) {
  activeShelfPrintData.value = {
    isCell: true,
    branchName: branch.name,
    rack: cell.rack,
    shelfLocation: cell.shelf,
    trackingNumber: cell.barcode,
    customerCargoCode: branch.name,
    weightKg: 0,
  };
  showPrintModal.value = true;
}

function printAllBranchCells(branch: any) {
  if (!branch || !branch.cells || branch.cells.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=500,height=600');
  if (!printWindow) {
    window.print();
    return;
  }

  const currentDate = new Date().toLocaleDateString('ru-RU');
  const labelsHtml = branch.cells
    .map(
      (cell: any) => `
      <div class="cell-label">
        <div class="header">
          <span class="branch">${branch.name}</span>
          <span class="rack">${cell.rack}</span>
        </div>
        <div class="title">Ячейка хранения</div>
        <div class="shelf">${cell.shelf}</div>
        <div class="barcode">
          <svg width="190" height="42" viewBox="0 0 190 42">
            <rect x="0" y="0" width="190" height="42" fill="white" />
            <g fill="black">
              <rect x="10" y="2" width="3" height="28" />
              <rect x="15" y="2" width="2" height="28" />
              <rect x="20" y="2" width="4" height="28" />
              <rect x="27" y="2" width="1" height="28" />
              <rect x="31" y="2" width="3" height="28" />
              <rect x="37" y="2" width="4" height="28" />
              <rect x="44" y="2" width="2" height="28" />
              <rect x="49" y="2" width="5" height="28" />
              <rect x="57" y="2" width="2" height="28" />
              <rect x="62" y="2" width="3" height="28" />
              <rect x="68" y="2" width="4" height="28" />
              <rect x="75" y="2" width="1" height="28" />
              <rect x="79" y="2" width="3" height="28" />
              <rect x="85" y="2" width="5" height="28" />
              <rect x="93" y="2" width="2" height="28" />
              <rect x="98" y="2" width="4" height="28" />
              <rect x="105" y="2" width="2" height="28" />
              <rect x="110" y="2" width="3" height="28" />
              <rect x="116" y="2" width="1" height="28" />
              <rect x="120" y="2" width="4" height="28" />
              <rect x="127" y="2" width="2" height="28" />
              <rect x="132" y="2" width="5" height="28" />
              <rect x="140" y="2" width="3" height="28" />
              <rect x="146" y="2" width="2" height="28" />
              <rect x="151" y="2" width="4" height="28" />
              <rect x="158" y="2" width="2" height="28" />
              <rect x="163" y="2" width="3" height="28" />
              <rect x="169" y="2" width="2" height="28" />
              <rect x="174" y="2" width="4" height="28" />
            </g>
            <text x="95" y="38" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="black">
              ${cell.barcode}
            </text>
          </svg>
        </div>
        <div class="footer">
          <span>Cargona WMS</span>
          <span>${currentDate}</span>
        </div>
      </div>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Штрихкоды ячеек: ${branch.name}</title>
        <style>
          @page { size: 58mm 40mm; margin: 2mm; }
          body { font-family: monospace, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
          .cell-label { width: 54mm; height: 36mm; padding: 3mm; border: 1px dashed #ccc; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
          .header { display: flex; justify-content: space-between; font-size: 8px; border-bottom: 1px solid #000; padding-bottom: 2px; }
          .branch { font-weight: bold; }
          .title { font-size: 7px; text-transform: uppercase; color: #444; margin-top: 2px; }
          .shelf { font-size: 16px; font-weight: 900; }
          .barcode svg { width: 100%; height: auto; }
          .footer { display: flex; justify-content: space-between; font-size: 7px; border-top: 1px solid #aaa; padding-top: 2px; color: #666; }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
</script>
