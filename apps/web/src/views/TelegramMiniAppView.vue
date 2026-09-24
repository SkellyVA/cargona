<template>
  <div class="min-h-screen bg-[#0B0C10] text-white p-4 max-w-md mx-auto flex flex-col justify-between select-none">
    <!-- ЭКРАН 1: АВТОРИЗАЦИЯ / РЕГИСТРАЦИЯ (Если не вошел) -->
    <div v-if="!isRegistered" class="space-y-5 pt-4 flex-1">
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/30 to-accent-cyan/20 border border-accent-cyan/40 p-2 shadow-glow-blue mb-1">
          <svg class="w-full h-full text-accent-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 12v10" />
          </svg>
        </div>
        <h2 class="text-2xl font-black text-white tracking-tight">{{ tenantName }}</h2>
        <p class="text-xs text-text-tertiary max-w-xs mx-auto">
          Личный кабинет клиента: трекинг посылок, персональный QR-код и адрес склада в Китае
        </p>
      </div>

      <!-- Apple-style Segmented Control: Регистрация / Вход -->
      <div class="flex items-center p-1 rounded-2xl bg-[#161922] border border-white/[0.08] shadow-inner">
        <button
          type="button"
          @click="switchAuthTab('register')"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          :class="authTab === 'register' ? 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-md' : 'text-text-tertiary hover:text-white'"
        >
          <UserPlus class="w-3.5 h-3.5" />
          <span>Регистрация</span>
        </button>
        <button
          type="button"
          @click="switchAuthTab('login')"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          :class="authTab === 'login' ? 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-md' : 'text-text-tertiary hover:text-white'"
        >
          <LogIn class="w-3.5 h-3.5" />
          <span>Вход по Cargo ID</span>
        </button>
      </div>

      <!-- ФОРМА 1: РЕГИСТРАЦИЯ НОВОГО КЛИЕНТА -->
      <form v-if="authTab === 'register'" @submit.prevent="handleRegister" class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">Ваше имя и фамилия</label>
          <div class="relative">
            <User class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              v-model="regForm.fullName"
              required
              placeholder="Алишер Валиев"
              class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary focus:border-accent-cyan focus:outline-none transition"
            />
          </div>
        </div>

        <!-- Кастомный ввод телефона с Apple-флагом страны (Без нативного HTML select) -->
        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">Номер телефона</label>
          <div class="flex items-center gap-2">
            <!-- Кнопка выбора страны со стильным Apple-флагом -->
            <button
              type="button"
              @click="showCountryModal = true"
              class="h-11 px-3 rounded-xl bg-[#181B23] hover:bg-[#202430] border border-white/[0.08] hover:border-accent-cyan/50 text-white text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm active:scale-95"
            >
              <AppleFlag :country-code="selectedCountry.code" :size="20" />
              <span class="font-mono font-bold text-white text-xs">{{ selectedCountry.dial }}</span>
              <ChevronDown class="w-3 h-3 text-text-tertiary opacity-70" />
            </button>

            <!-- Поле ввода номера -->
            <div class="relative flex-1">
              <input
                v-model="regPhoneNational"
                type="tel"
                inputmode="numeric"
                required
                :placeholder="selectedCountry.format"
                class="w-full h-11 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary font-mono focus:border-accent-cyan focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        <!-- Кастомный выбор ПВЗ (Без нативного select) -->
        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">Удобный пункт выдачи (ПВЗ)</label>
          <button
            type="button"
            @click="showBranchModal = true"
            class="w-full h-11 px-3.5 rounded-xl bg-[#181B23] hover:bg-[#202430] border border-white/[0.08] hover:border-accent-cyan/40 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <MapPin class="w-4 h-4 text-accent-cyan shrink-0" />
              <span class="text-xs text-white truncate font-medium">
                {{ selectedRegBranchName }}
              </span>
            </div>
            <ChevronDown class="w-4 h-4 text-text-tertiary shrink-0 opacity-70" />
          </button>
        </div>

        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">Telegram Username (опционально)</label>
          <div class="relative">
            <Send class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              v-model="regForm.telegramUsername"
              placeholder="@username"
              class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary font-mono focus:border-accent-cyan focus:outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          class="w-full h-12 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-95 text-white font-bold text-xs shadow-glow-blue flex items-center justify-center gap-2 transition active:scale-[0.99] mt-2 cursor-pointer"
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>Получить карго-код и адрес склада</span>
        </button>
      </form>

      <!-- ФОРМА 2: ВХОД В АККАУНТ ПО CARGO ID И ПОСЛЕДНИМ 4 ЦИФРАМ НОМЕРА -->
      <div v-else class="bg-surface border border-surface-border rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <!-- Шаг 1: Ввод Карго ID -->
        <div>
          <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">Ваш Cargo ID / Код клиента</label>
          <div class="relative">
            <KeyRound class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              v-model="loginCargoIdInput"
              :disabled="loginStep === 'phone'"
              @keyup.enter="loginStep === 'id' ? handleCheckCargoId() : handleLoginSubmit()"
              placeholder="Например: CRG-001 или 001"
              class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary font-mono font-bold uppercase focus:border-accent-cyan focus:outline-none transition disabled:opacity-60"
            />
          </div>
          <div class="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
            <span>Префикс организации:</span>
            <span class="font-mono text-accent-cyan font-bold">{{ store.tenant?.codePrefix || store.settings.codePrefix || 'CARGO' }}</span>
          </div>
        </div>

        <!-- Шаг 2: Плавное появление поля 4 цифр номера телефона (Transition) -->
        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2 max-h-0 overflow-hidden"
          enter-to-class="opacity-100 translate-y-0 max-h-96"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 max-h-96"
          leave-to-class="opacity-0 -translate-y-2 max-h-0 overflow-hidden"
        >
          <div v-if="loginStep === 'phone'" class="space-y-4 pt-1 border-t border-white/[0.06]">
            <div class="p-3 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-start gap-2.5">
              <ShieldCheck class="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
              <div class="text-[11px] text-text-secondary leading-relaxed">
                Аккаунт найден: <strong class="text-white">{{ matchedLoginCustomer?.fullName }}</strong> ({{ matchedLoginCustomer?.cargoCode }}).
                <br />Подтвердите номер: <span class="font-mono text-accent-cyan">{{ getMaskedPhone(matchedLoginCustomer?.phone) }}</span>
              </div>
            </div>

            <div>
              <label class="text-[11px] font-semibold text-text-tertiary uppercase block mb-1.5">
                Последние 4 цифры вашего номера телефона
              </label>
              <div class="relative">
                <Phone class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  v-model="loginPhoneLast4"
                  type="tel"
                  inputmode="numeric"
                  maxlength="4"
                  autofocus
                  @keyup.enter="handleLoginSubmit"
                  placeholder="••••"
                  class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-base tracking-widest font-mono font-bold placeholder:text-text-tertiary focus:border-accent-cyan focus:outline-none transition text-center"
                />
              </div>
            </div>
          </div>
        </transition>

        <!-- Ошибка валидации -->
        <div v-if="loginError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ loginError }}</span>
        </div>

        <!-- Кнопки действий входа -->
        <div class="space-y-2 pt-1">
          <button
            v-if="loginStep === 'id'"
            type="button"
            @click="handleCheckCargoId"
            class="w-full h-12 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-95 text-white font-bold text-xs shadow-glow-blue flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
          >
            <span>Продолжить</span>
            <ChevronDown class="w-4 h-4 rotate-[-90deg]" />
          </button>

          <div v-else class="flex items-center gap-2">
            <button
              type="button"
              @click="resetLogin"
              class="h-12 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Назад
            </button>
            <button
              type="button"
              @click="handleLoginSubmit"
              class="flex-1 h-12 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-95 text-white font-bold text-xs shadow-glow-blue flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <ShieldCheck class="w-4 h-4" />
              <span>Войти в аккаунт</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ЭКРАН 2: ЛИЧНЫЙ КАБИНЕТ ЗАРЕГИСТРИРОВАННОГО КЛИЕНТА -->
    <div v-else class="space-y-4 flex-1 pt-2">
      <!-- Уведомление / Toast -->
      <div
        v-if="miniAppToast"
        class="p-3.5 rounded-2xl bg-accent-emerald/15 border border-accent-emerald/30 text-accent-emerald text-xs flex items-center justify-between shadow-lg"
      >
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 shrink-0" />
          <span>{{ miniAppToast }}</span>
        </div>
        <button @click="miniAppToast = ''" class="text-accent-emerald/70 hover:text-accent-emerald font-bold text-sm">×</button>
      </div>

      <!-- Шапка Mini App -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue/30 to-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center p-1.5 shadow-sm">
            <svg class="w-full h-full text-accent-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 12v10" />
            </svg>
          </div>
          <span class="text-base font-bold text-white tracking-tight">{{ tenantName }}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <LanguageSwitcher />
          <span class="text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl bg-white/[0.06] text-accent-cyan border border-white/[0.08]">
            {{ activeCustomer.cargoCode }}
          </span>
          <button
            @click="handleLogout"
            title="Сменить аккаунт / Выйти"
            class="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-text-tertiary hover:text-red-400 border border-white/[0.06] flex items-center justify-center transition cursor-pointer"
          >
            <LogOut class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- ВЫБОР ПВЗ НАЗНАЧЕНИЯ -->
      <div class="bg-surface border border-surface-border hover:border-accent-cyan/30 rounded-2xl p-3 shadow-card transition">
        <div class="flex items-center justify-between gap-3">
          <div
            @click="showBranchModal = true"
            class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <div class="w-8 h-8 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan flex items-center justify-center shrink-0">
              <MapPin class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <div class="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span>Пункт выдачи (ПВЗ)</span>
                <span class="w-1.5 h-1.5 rounded-full bg-accent-emerald"></span>
              </div>
              <div class="text-xs font-bold text-white truncate mt-0.5">
                {{ currentCustomerBranch?.name }}
              </div>
              <div class="text-[11px] text-text-secondary truncate">
                {{ currentCustomerBranch?.address }}
              </div>
            </div>
          </div>

          <button
            @click="showBranchModal = true"
            class="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-accent-cyan border border-white/[0.08] text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <span>Выбрать</span>
            <ChevronDown class="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      <!-- ГЛАВНАЯ КАРТОЧКА КЛИЕНТА -->
      <div class="relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-white/[0.08] shadow-card bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#0E2A47] via-[#12151E] to-[#13151B]">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs text-text-tertiary font-medium">{{ t('miniapp.cargoCode') }}:</div>
            <div class="text-3xl font-black text-white tracking-wider font-mono mt-0.5">{{ activeCustomer.cargoCode }}</div>
            <div class="text-xs text-text-secondary mt-1">{{ activeCustomer.fullName }}</div>
          </div>

          <div class="flex flex-col items-end gap-2 shrink-0">
            <!-- Кнопка для отображения QR-кода -->
            <button
              @click="openQrModal"
              class="px-3.5 py-2 rounded-2xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/35 hover:border-accent-cyan/60 text-accent-cyan font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <QrCode class="w-4 h-4" />
              <span>QR-код</span>
            </button>

            <div class="text-right mt-0.5">
              <div class="text-[10px] text-text-tertiary">{{ t('miniapp.toPay') }}:</div>
              <div class="text-base font-bold text-white font-mono">{{ store.formatMoney(activeCustomer.debtUSD || 0) }}</div>
              <div class="text-[10px] text-accent-cyan">{{ clientPackages.length }} {{ t('miniapp.packagesCount') }}</div>
            </div>
          </div>
        </div>

        <!-- Выбор страны склада для копирования адреса -->
        <div class="mt-4 pt-3.5 border-t border-white/[0.08] space-y-2.5">
          <div class="text-[11px] font-semibold text-text-tertiary flex items-center justify-between">
            <span>{{ t('miniapp.warehouseAddresses') }}</span>
            <span class="text-accent-cyan font-mono text-[10px]">{{ currentWarehouse?.country }}</span>
          </div>

          <!-- Табы стран -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              v-for="wh in activeWarehouses"
              :key="wh.id"
              @click="selectedWarehouseId = wh.id"
              class="py-1.5 px-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              :class="selectedWarehouseId === wh.id ? 'bg-accent-blue text-white shadow-sm' : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08]'"
            >
              <AppleFlag :countryCode="wh.countryCode" :size="16" />
              <span class="text-[11px]">{{ wh.country }}</span>
            </button>
          </div>

          <!-- Карточка активного склада -->
          <div v-if="currentWarehouse" class="p-3 rounded-xl bg-black/20 border border-white/[0.06] text-left space-y-1.5">
            <div class="flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-1.5 font-bold text-white">
                <AppleFlag :countryCode="currentWarehouse.countryCode" :size="15" />
                <span>{{ currentWarehouse.city }} ({{ currentWarehouse.country }})</span>
              </div>
              <span class="text-[10px] text-accent-cyan font-mono">{{ currentWarehouse.phone }}</span>
            </div>
            <div class="text-[10px] text-text-secondary font-mono leading-relaxed line-clamp-2">
              {{ formatWarehouseAddress(currentWarehouse) }}
            </div>
            <div v-if="currentWarehouse.instructions" class="text-[9px] text-text-tertiary">
              {{ currentWarehouse.instructions }}
            </div>
          </div>

          <!-- Кнопка в 1 клик: Скопировать адрес активного склада -->
          <button
            @click="copyAddress"
            class="w-full py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <Copy class="w-4 h-4 text-accent-cyan" />
            <span>{{ copyStatusOverride || copyButtonText }}</span>
          </button>
        </div>
      </div>

      <!-- ВЫКУП ТОВАРОВ И ТАРИФЫ -->
      <div class="bg-surface border border-surface-border rounded-3xl p-4 shadow-card space-y-3.5">
        <!-- Выкуп и заказ товаров -->
        <a
          :href="managerTelegramLink"
          target="_blank"
          rel="noopener noreferrer"
          class="p-3.5 rounded-2xl bg-gradient-to-r from-accent-blue/20 to-accent-cyan/10 border border-accent-cyan/25 hover:border-accent-cyan/45 transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center border border-accent-cyan/35 group-hover:scale-105 transition shrink-0">
              <MessageSquare class="w-5 h-5" />
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Заказ и выкуп товаров</span>
              </div>
              <div class="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                <span>Написать менеджеру:</span>
                <span class="text-accent-cyan font-mono font-medium">{{ displayManagerUsername }}</span>
              </div>
            </div>
          </div>
          <ExternalLink class="w-4 h-4 text-accent-cyan/70 group-hover:text-accent-cyan group-hover:translate-x-0.5 transition shrink-0" />
        </a>

        <div class="border-t border-white/[0.06]"></div>

        <!-- Тарифы доставки -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs px-0.5">
            <div class="flex items-center gap-2 text-text-secondary">
              <Truck class="w-4 h-4 text-accent-cyan shrink-0" />
              <span class="font-semibold text-[11px]">Тарифы доставки</span>
            </div>
            <span class="text-[10px] text-text-tertiary font-mono">за 1 кг</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <!-- Авто доставка -->
            <div class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06] space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <div class="flex items-center gap-1.5 text-text-secondary text-[11px]">
                  <Truck class="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                  <span>Авто</span>
                </div>
                <span class="text-[10px] text-text-tertiary font-mono">~10-14 дн</span>
              </div>
              <div class="text-sm font-bold text-accent-cyan font-mono">
                {{ store.deliveryRates.formattedAuto }}
              </div>
            </div>

            <!-- Авиа доставка -->
            <div class="p-3 rounded-2xl bg-[#181B23] border border-white/[0.06] space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <div class="flex items-center gap-1.5 text-text-secondary text-[11px]">
                  <Plane class="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Авиа</span>
                </div>
                <span class="text-[10px] text-text-tertiary font-mono">~3-5 дн</span>
              </div>
              <div class="text-sm font-bold text-sky-300 font-mono">
                {{ store.deliveryRates.formattedAir }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- МОИ ДОСТАВКИ (ФОРМА ДОБАВЛЕНИЯ ТРЕКА + СПИСОК ПОСЫЛОК) -->
      <div class="bg-surface border border-surface-border rounded-3xl p-4 shadow-card flex items-center gap-2">
        <input
          v-model="newTrack"
          :placeholder="t('miniapp.addTrackPlaceholder')"
          class="flex-1 h-11 px-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary font-mono focus:border-accent-blue focus:outline-none"
        />
        <button
          @click="addTrack"
          class="h-11 px-4 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-bold text-xs shadow-glow-blue transition shrink-0 cursor-pointer"
        >
          {{ t('miniapp.addTrackBtn') }}
        </button>
      </div>

      <!-- Список посылок со статусами -->
      <div class="space-y-3">
        <div class="text-xs font-semibold text-text-tertiary px-1 uppercase tracking-wider">{{ t('miniapp.myDeliveries') }}</div>

        <div
          v-if="clientPackages.length === 0"
          class="p-6 rounded-2xl bg-surface border border-surface-border text-center text-xs text-text-tertiary"
        >
          У вас пока нет активных посылок. Внесите трек-номер выше или укажите ваш карго-код ({{ activeCustomer.cargoCode }}) при покупке.
        </div>

        <div
          v-for="pkg in clientPackages"
          :key="pkg.id"
          class="p-4 rounded-2xl bg-surface border border-surface-border shadow-card space-y-3"
        >
          <!-- Основная строка посылки -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-3 min-w-0">
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                :class="pkg.status === 'READY_FOR_PICKUP'
                  ? 'bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : pkg.status === 'RELEASED'
                  ? 'bg-white/[0.05] border-white/[0.08] text-text-tertiary'
                  : 'bg-accent-blue/15 border-accent-blue/30 text-accent-cyan'"
              >
                <Package class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-white font-mono truncate">{{ pkg.trackingNumber }}</div>
                <div class="text-[11px] text-text-secondary mt-0.5 truncate">{{ pkg.description || 'Посылка' }} • {{ pkg.weightKg }} {{ t('common.kg') }}</div>
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="text-xs font-bold text-white font-mono">{{ store.formatMoney(pkg.costUSD) }}</div>
              <div
                class="text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-md inline-block"
                :class="pkg.status === 'READY_FOR_PICKUP'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : pkg.status === 'RELEASED'
                  ? 'bg-white/[0.05] text-text-tertiary'
                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'"
              >
                {{ pkg.status === 'READY_FOR_PICKUP' ? t('miniapp.inPvzPickup') : pkg.status === 'RELEASED' ? 'Выдан' : t('miniapp.inTransitStatus') }}
              </div>
            </div>
          </div>

          <!-- Блок 1: Если посылка ГОТОВА К ВЫДАЧЕ В ПВЗ -->
          <div v-if="pkg.status === 'READY_FOR_PICKUP'" class="space-y-2 pt-2 border-t border-white/[0.06]">
            <!-- Плашка ячейки и таймер бесплатного хранения -->
            <div class="flex items-center justify-between text-[11px] flex-wrap gap-1">
              <div class="flex items-center gap-1.5 text-accent-cyan font-mono">
                <span class="px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">Ячейка: {{ pkg.shelfLocation || 'ПВЗ' }}</span>
              </div>
              <div class="flex items-center gap-1 text-amber-300 font-medium">
                <Clock class="w-3 h-3 text-amber-400" />
                <span>Бесплатное хранение: {{ store.settings.freeStorageDays || 3 }} дн.</span>
              </div>
            </div>

            <!-- Кнопка быстрой оплаты -->
            <div class="flex items-center gap-2 pt-1">
              <button
                v-if="!pkg.isPaidOnline"
                @click="openPaymentModal(pkg)"
                class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-emerald to-teal-500 hover:opacity-95 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
              >
                <CreditCard class="w-3.5 h-3.5" />
                <span>Оплатить ({{ store.formatMoney(pkg.costUSD) }})</span>
              </button>
              <div
                v-else
                class="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>Оплачено онлайн</span>
              </div>

              <button
                @click="openQrModal"
                class="py-2.5 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-accent-cyan border border-white/[0.08] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <QrCode class="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
            </div>
          </div>

          <!-- Блок 2: Если посылка В ПУТИ / НА СКЛАДЕ -->
          <div v-else-if="pkg.status === 'IN_TRANSIT' || pkg.status === 'RECEIVED_AT_ORIGIN' || pkg.status === 'CUSTOMS'" class="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <div class="text-[11px] text-text-tertiary flex items-center gap-1">
              <span>ПВЗ назначения:</span>
              <b class="text-white">{{ currentCustomerBranch?.name || 'ПВЗ' }}</b>
            </div>

            <button
              @click="toggleNotification(pkg)"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer"
              :class="pkg.notifiedReady
                ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan'
                : 'bg-white/[0.04] border-white/[0.08] text-text-secondary hover:text-white'"
            >
              <Bell class="w-3 h-3" :class="{ 'fill-accent-cyan': pkg.notifiedReady }" />
              <span>{{ pkg.notifiedReady ? 'Уведомление включено' : 'Уведомить по прибытии' }}</span>
            </button>
          </div>

          <!-- Блок 3: Если посылка ВЫДАНА (Отзыв + Фото выдачи) -->
          <div v-else-if="pkg.status === 'RELEASED'" class="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <!-- Фото посылки при выдаче (если есть) -->
              <button
                v-if="pkg.handoverPhoto || pkg.photos?.[0]"
                @click="openPhotoPreview(pkg.handoverPhoto || pkg.photos?.[0] || '')"
                class="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-accent-cyan border border-white/[0.08] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Camera class="w-3 h-3" />
                <span>Фото выдачи</span>
              </button>
              <span v-else class="text-[11px] text-text-tertiary">Успешно получено</span>
            </div>

            <!-- Отзыв -->
            <div>
              <div v-if="pkg.reviewRating" class="flex items-center gap-1 text-amber-300 font-bold text-xs">
                <Star class="w-3.5 h-3.5 fill-amber-300" />
                <span>{{ pkg.reviewRating }}/5</span>
              </div>
              <button
                v-else
                @click="openReviewModal(pkg)"
                class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Star class="w-3 h-3" />
                <span>Оставить отзыв</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО: QR-КОД ДЛЯ ВЫДАЧИ НА ПВЗ -->
    <AppModal v-model="showQrModal" title="QR-код получения">
      <div class="text-center space-y-4 py-1">
        <div class="text-xs text-text-secondary">
          Покажите этот QR-код оператору при получении посылок
        </div>

        <!-- Белая контрастная подложка под QR -->
        <div class="p-3.5 bg-white rounded-3xl shadow-2xl inline-flex items-center justify-center mx-auto">
          <canvas ref="qrModalCanvasRef" class="w-48 h-48"></canvas>
        </div>

        <div class="space-y-0.5">
          <div class="text-xl font-black font-mono tracking-widest text-accent-cyan">
            {{ activeCustomer.cargoCode }}
          </div>
          <div class="text-xs font-medium text-white">
            {{ activeCustomer.fullName }}
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-black/30 border border-white/[0.08] text-xs space-y-1 text-left">
          <div class="flex items-center justify-between text-text-tertiary text-[10px]">
            <span>Пункт выдачи (ПВЗ):</span>
            <span class="text-accent-cyan font-mono">{{ currentCustomerBranch?.city }}</span>
          </div>
          <div class="text-white font-semibold">
            {{ currentCustomerBranch?.name }}
          </div>
          <div class="text-[11px] text-text-secondary">
            {{ currentCustomerBranch?.address }}
          </div>
        </div>

        <div class="text-[10px] text-text-tertiary font-mono">
          {{ t('miniapp.qrAutoUpdate') }}
        </div>
      </div>
    </AppModal>

    <!-- МОДАЛЬНОЕ ОКНО: КАСТОМНЫЙ APPLE-STYLE ВЫБОР СТРАНЫ НОМЕРА ТЕЛЕФОНА -->
    <AppModal v-model="showCountryModal" title="Код страны номера телефона">
      <div class="space-y-3 py-1">
        <!-- Поиск страны -->
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            v-model="countrySearch"
            placeholder="Поиск по стране или коду (+992, +7...)"
            class="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs placeholder:text-text-tertiary focus:border-accent-cyan focus:outline-none transition"
          />
        </div>

        <!-- Список стран в стиле Apple / iOS -->
        <div class="max-h-[320px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
          <div
            v-for="c in filteredCountries"
            :key="c.code"
            @click="selectCountry(c)"
            class="p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between group active:scale-[0.99]"
            :class="selectedCountry.code === c.code ? 'bg-accent-cyan/10 border-accent-cyan/50 text-white shadow-sm' : 'bg-[#181B23] border-white/[0.06] hover:border-white/[0.2] text-text-secondary hover:text-white'"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 shadow-inner">
                <AppleFlag :country-code="c.code" :size="22" />
              </div>
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{{ c.name }}</span>
                  <span class="text-[10px] font-normal text-text-tertiary">({{ c.code }})</span>
                </div>
                <div class="text-[10px] text-text-tertiary mt-0.5">
                  Пример: {{ c.dial }} {{ c.format }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-accent-cyan">{{ c.dial }}</span>
              <div
                v-if="selectedCountry.code === c.code"
                class="w-5 h-5 rounded-full bg-accent-cyan text-black flex items-center justify-center shrink-0 font-bold"
              >
                <Check class="w-3 h-3 stroke-[3]" />
              </div>
            </div>
          </div>

          <div v-if="filteredCountries.length === 0" class="p-6 text-center text-xs text-text-tertiary">
            Ничего не найдено по запросу «{{ countrySearch }}»
          </div>
        </div>
      </div>
    </AppModal>

    <!-- МОДАЛЬНОЕ ОКНО: КАСТОМНЫЙ ВЫБОР ПУНКТА ВЫДАЧИ (ПВЗ) -->
    <AppModal v-model="showBranchModal" title="Выбор пункта выдачи (ПВЗ)">
      <div class="space-y-2.5 py-1">
        <div class="text-xs text-text-secondary mb-2">
          Выберите удобный филиал для доставки ваших товаров:
        </div>

        <div
          v-for="b in store.branches"
          :key="b.id"
          @click="selectBranch(b.id)"
          class="p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between group"
          :class="currentBranchSelectedId === b.id ? 'bg-accent-cyan/10 border-accent-cyan text-white shadow-sm' : 'bg-[#181B23] border-white/[0.08] hover:border-white/[0.2] text-text-secondary hover:text-white'"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
              :class="currentBranchSelectedId === b.id ? 'bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan' : 'bg-white/[0.04] border-white/[0.08] text-text-tertiary'"
            >
              <MapPin class="w-4 h-4" />
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{{ b.name }}</span>
                <span class="text-[10px] font-normal text-text-tertiary">({{ b.city }})</span>
              </div>
              <div class="text-[11px] text-text-secondary mt-0.5">
                {{ b.address }}
              </div>
              <div class="text-[10px] text-text-tertiary font-mono mt-0.5">
                {{ b.phone }}
              </div>
            </div>
          </div>

          <div
            v-if="currentBranchSelectedId === b.id"
            class="w-6 h-6 rounded-full bg-accent-cyan text-black flex items-center justify-center shrink-0 font-bold"
          >
            <Check class="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>
      </div>
    </AppModal>

    <!-- МОДАЛЬНОЕ ОКНО: ОТЗЫВ О ЗАКАЗЕ -->
    <AppModal v-model="showReviewModal" title="Оставить отзыв о сервисе">
      <div class="space-y-4 py-1 text-xs">
        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Посылка</div>
            <div class="font-mono font-bold text-white text-sm mt-0.5">{{ selectedReviewPkg?.trackingNumber }}</div>
            <div class="text-[11px] text-text-secondary">{{ selectedReviewPkg?.description }}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-text-tertiary uppercase font-semibold">Сумма</div>
            <div class="font-mono font-bold text-accent-cyan text-sm mt-0.5">{{ store.formatMoney(selectedReviewPkg?.costUSD || 0) }}</div>
          </div>
        </div>

        <div>
          <label class="text-text-secondary block mb-2 font-medium">Ваша оценка скорости и качества доставки:</label>
          <div class="flex items-center justify-center gap-3 py-2">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              @click="reviewRating = star"
              class="p-2.5 rounded-2xl transition hover:scale-110 cursor-pointer"
              :class="star <= reviewRating ? 'text-amber-400 bg-amber-400/15 border border-amber-400/30' : 'text-text-tertiary bg-white/[0.04] border border-white/[0.06]'"
            >
              <Star class="w-6 h-6" :class="{ 'fill-amber-400': star <= reviewRating }" />
            </button>
          </div>
        </div>

        <div>
          <label class="text-text-secondary block mb-1 font-medium">Комментарий (опционально):</label>
          <textarea
            v-model="reviewComment"
            rows="3"
            placeholder="Всё пришло целым и очень быстро! Спасибо персоналу ПВЗ."
            class="w-full p-3 rounded-xl bg-[#181B23] border border-white/[0.08] text-white text-xs focus:border-accent-cyan focus:outline-none placeholder:text-text-tertiary"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <button
          @click="showReviewModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="submitReview"
          class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer flex items-center gap-1.5"
        >
          <CheckCircle2 class="w-4 h-4 stroke-[2.5]" />
          <span>Отправить отзыв</span>
        </button>
      </template>
    </AppModal>

    <!-- МОДАЛЬНОЕ ОКНО: ОПЛАТА ПОСЫЛКИ ОНЛАЙН -->
    <AppModal v-model="showPaymentModal" title="Оплата доставки посылки">
      <div class="space-y-4 py-1 text-xs">
        <div class="p-4 rounded-2xl bg-gradient-to-br from-accent-emerald/20 to-teal-500/10 border border-accent-emerald/30 text-left space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-text-secondary uppercase font-semibold">Сумма к оплате</span>
            <span class="font-mono text-xs text-accent-cyan font-bold">{{ selectedPaymentPkg?.trackingNumber }}</span>
          </div>
          <div class="text-2xl font-black text-white font-mono">
            {{ store.formatMoney(selectedPaymentPkg?.costUSD || 0) }}
          </div>
          <div class="text-[11px] text-text-tertiary">
            Вес: {{ selectedPaymentPkg?.weightKg }} кг • ПВЗ: {{ currentCustomerBranch?.name || 'ПВЗ' }}
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-text-secondary block font-medium">Способ оплаты:</label>
          <div class="grid grid-cols-2 gap-2">
            <div
              @click="payMethod = 'CARD'"
              class="p-3 rounded-2xl border transition cursor-pointer text-left space-y-1"
              :class="payMethod === 'CARD' ? 'bg-accent-emerald/15 border-accent-emerald text-white' : 'bg-[#181B23] border-white/[0.08] text-text-secondary'"
            >
              <div class="flex items-center justify-between">
                <CreditCard class="w-4 h-4 text-accent-emerald" />
                <Check v-if="payMethod === 'CARD'" class="w-3.5 h-3.5 text-accent-emerald" />
              </div>
              <div class="font-bold text-xs text-white">Банковская карта</div>
              <div class="text-[10px] text-text-tertiary">Корти Милли / Visa</div>
            </div>

            <div
              @click="payMethod = 'CASH'"
              class="p-3 rounded-2xl border transition cursor-pointer text-left space-y-1"
              :class="payMethod === 'CASH' ? 'bg-accent-emerald/15 border-accent-emerald text-white' : 'bg-[#181B23] border-white/[0.08] text-text-secondary'"
            >
              <div class="flex items-center justify-between">
                <QrCode class="w-4 h-4 text-accent-cyan" />
                <Check v-if="payMethod === 'CASH'" class="w-3.5 h-3.5 text-accent-cyan" />
              </div>
              <div class="font-bold text-xs text-white">Наличными в ПВЗ</div>
              <div class="text-[10px] text-text-tertiary">При получении по QR</div>
            </div>
          </div>
        </div>

        <div v-if="payMethod === 'CARD'" class="p-3 rounded-xl bg-black/30 border border-white/[0.06] text-[11px] text-text-secondary leading-relaxed space-y-1">
          <div class="flex items-center gap-1.5"><CreditCard class="w-3.5 h-3.5 text-accent-emerald shrink-0" /><span>Номер карты для перевода:</span> <b class="text-white font-mono">9992 0012 3456 7890</b></div>
          <div>Получатель: <b class="text-white">{{ tenantName }}</b></div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showPaymentModal = false"
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-text-secondary hover:text-white font-medium text-xs transition cursor-pointer"
        >
          Отмена
        </button>
        <button
          @click="confirmPaymentSubmit"
          class="px-5 py-2.5 rounded-xl bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold text-xs shadow-glow-emerald transition cursor-pointer flex items-center gap-1.5"
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>Подтвердить оплату</span>
        </button>
      </template>
    </AppModal>

    <!-- МОДАЛЬНОЕ ОКНО: ПРОСМОТР ФОТО ВЫДАЧИ -->
    <AppModal v-model="showPhotoModal" title="Фото фиксации при выдаче">
      <div class="py-2 text-center space-y-3">
        <img :src="photoModalUrl" alt="Handover Proof" class="w-full max-h-[360px] object-contain rounded-2xl border border-white/[0.1] mx-auto bg-black" />
        <div class="text-xs text-text-tertiary">
          Фото сделано сотрудником филиала в момент передачи посылки клиенту
        </div>
      </div>
      <template #footer>
        <button
          @click="showPhotoModal = false"
          class="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-xs transition cursor-pointer"
        >
          Закрыть
        </button>
      </template>
    </AppModal>

    <!-- Футер: Powered by Cargona -->
    <footer class="mt-8 mb-3 flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition">
      <div class="flex items-center gap-1.5 text-[11px] text-text-tertiary">
        <span>Powered by</span>
        <a
          href="https://t.me/cargonaorg"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold text-white tracking-wide hover:text-accent-cyan hover:underline transition inline-flex items-center gap-0.5"
        >
          Cargona
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import QRCode from 'qrcode';
import {
  Copy,
  Package,
  User,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Truck,
  Plane,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  QrCode,
  Check,
  UserPlus,
  LogIn,
  Search,
  KeyRound,
  ShieldCheck,
  LogOut,
  AlertCircle,
  Star,
  Bell,
  CreditCard,
  Clock,
  Camera,
} from 'lucide-vue-next';
import AppleFlag from '../components/ui/AppleFlag.vue';
import LanguageSwitcher from '../components/ui/LanguageSwitcher.vue';
import AppModal from '../components/ui/AppModal.vue';
import { useCargoStore } from '../stores/useCargoStore';
import { useI18n } from '../locales';

const route = useRoute();
const store = useCargoStore();
const { t } = useI18n();

const miniAppToast = ref('');
const showReviewModal = ref(false);
const selectedReviewPkg = ref<any>(null);
const reviewRating = ref(5);
const reviewComment = ref('');

const showPaymentModal = ref(false);
const selectedPaymentPkg = ref<any>(null);
const payMethod = ref<'CARD' | 'CASH'>('CARD');

const showPhotoModal = ref(false);
const photoModalUrl = ref('');

function toggleNotification(pkg: any) {
  const nextState = !pkg.notifiedReady;
  store.toggleNotifyWhenReady(pkg.id, nextState);
  miniAppToast.value = nextState
    ? `Уведомление включено для трека ${pkg.trackingNumber}. Бот пришлет сообщение, как только посылка прибудет в ПВЗ.`
    : `Уведомление для трека ${pkg.trackingNumber} отключено.`;
}

function openReviewModal(pkg: any) {
  selectedReviewPkg.value = pkg;
  reviewRating.value = pkg.reviewRating || 5;
  reviewComment.value = pkg.reviewComment || '';
  showReviewModal.value = true;
}

function submitReview() {
  if (!selectedReviewPkg.value) return;
  store.submitPackageReview(selectedReviewPkg.value.id, reviewRating.value, reviewComment.value);
  showReviewModal.value = false;
  miniAppToast.value = 'Спасибо за ваш отзыв! Он поможет улучшить качество нашего сервиса.';
}

function openPaymentModal(pkg: any) {
  selectedPaymentPkg.value = pkg;
  payMethod.value = 'CARD';
  showPaymentModal.value = true;
}

function confirmPaymentSubmit() {
  if (!selectedPaymentPkg.value) return;
  if (payMethod.value === 'CARD') {
    store.payPackageOnline(selectedPaymentPkg.value.id);
    miniAppToast.value = `Оплата ${selectedPaymentPkg.value.trackingNumber} успешно подтверждена! Ждем вас в ПВЗ.`;
  } else {
    miniAppToast.value = `Заказ ${selectedPaymentPkg.value.trackingNumber} готов к оплате наличными в ПВЗ.`;
  }
  showPaymentModal.value = false;
}

function openPhotoPreview(url: string) {
  if (!url) return;
  photoModalUrl.value = url;
  showPhotoModal.value = true;
}

const serverTenant = ref<{ name: string; slug: string; codePrefix: string; managerUsername?: string } | null>(null);

const tenantName = computed(() => {
  if (serverTenant.value?.name) return serverTenant.value.name;
  if (store.tenant?.name) return store.tenant.name;
  if (store.settings.companyName) return store.settings.companyName;
  const slug = (route.params.slug as string) || store.activeTenantSlug;
  if (slug && slug !== 'app') return slug.toUpperCase();
  return store.tenants[0]?.name || '';
});

const tenantCodePrefix = computed(() => {
  return serverTenant.value?.codePrefix || store.tenant?.codePrefix || store.settings.codePrefix || ((route.params.slug as string) ? (route.params.slug as string).substring(0, 3).toUpperCase() : 'CRG');
});

const displayManagerUsername = computed(() => {
  const u = serverTenant.value?.managerUsername?.trim() || store.settings.managerUsername?.trim() || '';
  if (!u) return '';
  return u.startsWith('@') ? u : `@${u}`;
});

const managerTelegramLink = computed(() => {
  const clean = displayManagerUsername.value.replace(/^@/, '');
  return `https://t.me/${clean}`;
});

const activeWarehouses = computed(() => {
  if (store.originWarehouses && store.originWarehouses.length > 0) {
    return store.originWarehouses.filter((w) => w.isActive);
  }
  return [
    {
      id: 'wh-cn-default',
      name: 'Склад в Иу (Китай)',
      country: 'Китай',
      countryCode: 'CN',
      city: 'Иу (Yiwu)',
      address: '浙江省金华市义乌市稠江街道北苑工业区288号 (Yiwu Warehouse)',
      phone: '+86 138 0000 0000',
      isActive: true,
      workingHours: '09:00 - 21:00',
      instructions: 'Указывайте ваш карго-код в графе получателя и в адресе',
    },
  ];
});

const selectedWarehouseId = ref<string>(store.originWarehouses[0]?.id || 'wh-cn-default');

const currentWarehouse = computed(() => {
  return activeWarehouses.value.find((w) => w.id === selectedWarehouseId.value) || activeWarehouses.value[0];
});

function formatWarehouseAddress(wh: any) {
  if (!wh) return '';
  const code = activeCustomer.value?.cargoCode || `${store.tenant?.codePrefix || store.settings.codePrefix || 'CRG'}-001`;
  const name = activeCustomer.value?.fullName || 'Клиент';
  if (wh.countryCode === 'CN') {
    return `收件人: ${name} (${code})\n电话: ${wh.phone}\n地址: ${wh.address} (${code})`;
  }
  if (wh.countryCode === 'TR') {
    return `Alıcı: ${name} (${code})\nTel: ${wh.phone}\nAdres: ${wh.address}\nPosta Kodu: ${wh.zipCode || '34000'}`;
  }
  if (wh.countryCode === 'US') {
    return `Full Name: ${name} (${code})\nAddress: ${wh.address}\nCity: ${wh.city}, State: DE, ZIP: ${wh.zipCode || '19801'}\nPhone: ${wh.phone}`;
  }
  return `Recipient: ${name} (${code})\nAddress: ${wh.address}, ${wh.city}\nPhone: ${wh.phone}`;
}

const copyButtonText = computed(() => {
  const cName = currentWarehouse.value?.country || 'склада';
  return `Скопировать адрес (${cName})`;
});
const copyStatusOverride = ref<string | null>(null);

const newTrack = ref('');
const showQrModal = ref(false);
const showBranchModal = ref(false);
const qrModalCanvasRef = ref<HTMLCanvasElement | null>(null);

// === СПИСОК СТРАН С APPLE-ФЛАГАМИ ДЛЯ ВЫБОРА НОМЕРА ===
interface CountryDial {
  code: string;
  name: string;
  dial: string;
  format: string;
  digitsLength: number;
}

const COUNTRIES: CountryDial[] = [
  { code: 'TJ', name: 'Таджикистан', dial: '+992', format: '90 000 1122', digitsLength: 9 },
  { code: 'UZ', name: 'Узбекистан', dial: '+998', format: '90 123 4567', digitsLength: 9 },
  { code: 'RU', name: 'Россия', dial: '+7', format: '999 123 4567', digitsLength: 10 },
  { code: 'KZ', name: 'Казахстан', dial: '+7', format: '777 123 4567', digitsLength: 10 },
  { code: 'KG', name: 'Кыргызстан', dial: '+996', format: '555 123 456', digitsLength: 9 },
  { code: 'CN', name: 'Китай (China)', dial: '+86', format: '138 0000 0000', digitsLength: 11 },
  { code: 'TR', name: 'Турция', dial: '+90', format: '532 000 0000', digitsLength: 10 },
  { code: 'AE', name: 'ОАЭ (Dubai)', dial: '+971', format: '50 000 0000', digitsLength: 9 },
  { code: 'BY', name: 'Беларусь', dial: '+375', format: '29 000 0000', digitsLength: 9 },
  { code: 'AM', name: 'Армения', dial: '+374', format: '91 00 0000', digitsLength: 8 },
  { code: 'AZ', name: 'Азербайджан', dial: '+994', format: '50 000 0000', digitsLength: 9 },
  { code: 'GE', name: 'Грузия', dial: '+995', format: '599 00 0000', digitsLength: 9 },
  { code: 'US', name: 'США / Канада', dial: '+1', format: '202 555 0123', digitsLength: 10 },
  { code: 'DE', name: 'Германия', dial: '+49', format: '151 2345 6789', digitsLength: 10 },
];

const selectedCountry = ref<CountryDial>(COUNTRIES[0]); // Default +992 TJ
const showCountryModal = ref(false);
const countrySearch = ref('');
const regPhoneNational = ref('');

const filteredCountries = computed(() => {
  const q = countrySearch.value.toLowerCase().trim();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.code.toLowerCase().includes(q)
  );
});

function selectCountry(country: CountryDial) {
  selectedCountry.value = country;
  showCountryModal.value = false;
  countrySearch.value = '';
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
  }
}

// === АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ===
const authTab = ref<'register' | 'login'>('register');
const isRegistered = ref(false);

function switchAuthTab(tab: 'register' | 'login') {
  authTab.value = tab;
  loginError.value = '';
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
  }
}

// Вход по Cargo ID
const loginCargoIdInput = ref('');
const loginPhoneLast4 = ref('');
const loginStep = ref<'id' | 'phone'>('id');
const loginError = ref('');
const matchedLoginCustomer = ref<any>(null);

function handleCheckCargoId() {
  loginError.value = '';
  const rawInput = loginCargoIdInput.value.trim().toUpperCase();
  if (!rawInput) {
    loginError.value = 'Введите ваш Карго ID';
    return;
  }

  // Поиск клиента по карго-коду или порядковому номеру
  const found = store.customers.find((c) => {
    if (!c.cargoCode) return false;
    const cCode = c.cargoCode.toUpperCase();
    if (cCode === rawInput) return true;
    const numPart = cCode.replace(/^\D+/, '');
    const rawNumPart = rawInput.replace(/^\D+/, '');
    return numPart && rawNumPart && (numPart === rawNumPart || parseInt(numPart, 10) === parseInt(rawNumPart, 10));
  });

  if (!found) {
    loginError.value = `Карго ID «${rawInput}» не найден. Проверьте правильность или зарегистрируйтесь.`;
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
    return;
  }

  matchedLoginCustomer.value = found;
  loginStep.value = 'phone';
  loginPhoneLast4.value = '';
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('medium');
  }
}

function handleLoginSubmit() {
  loginError.value = '';
  if (!matchedLoginCustomer.value) return;

  const inputDigits = loginPhoneLast4.value.replace(/\D/g, '').trim();
  if (inputDigits.length < 4) {
    loginError.value = 'Введите 4 последние цифры номера телефона';
    return;
  }

  const custPhoneDigits = (matchedLoginCustomer.value.phone || '').replace(/\D/g, '');
  const custLast4 = custPhoneDigits.slice(-4);

  if (custLast4 !== inputDigits) {
    loginError.value = 'Неверные 4 цифры номера телефона. Попробуйте снова.';
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
    return;
  }

  // Успешный вход в систему!
  activeCustomer.value = matchedLoginCustomer.value;
  isRegistered.value = true;
  const slugParam = (route.params.slug as string) || store.activeTenantSlug || store.tenant?.slug || store.tenants[0]?.slug || '';
  if (typeof window !== 'undefined' && slugParam) {
    localStorage.setItem(`cargona_client_cargo_code_${slugParam}`, matchedLoginCustomer.value.cargoCode);
  }

  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
}

function resetLogin() {
  loginStep.value = 'id';
  matchedLoginCustomer.value = null;
  loginPhoneLast4.value = '';
  loginError.value = '';
}

function handleLogout() {
  const slugParam = (route.params.slug as string) || store.activeTenantSlug || store.tenant?.slug || store.tenants[0]?.slug || '';
  if (typeof window !== 'undefined' && slugParam) {
    localStorage.removeItem(`cargona_client_cargo_code_${slugParam}`);
  }
  isRegistered.value = false;
  authTab.value = 'login';
  resetLogin();
}

function getMaskedPhone(phone?: string): string {
  if (!phone) return '+••• •• •• ••••';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const prefix = phone.split(' ')[0] || '+•••';
  return `${prefix} ••• •• ${digits.slice(-4)}`;
}

// Профиль клиента
const activeCustomer = ref<any>({
  id: 'c-temp',
  cargoCode: `${store.tenant?.codePrefix || store.settings.codePrefix || 'CRG'}-001`,
  fullName: 'Новый клиент',
  phone: '+992 90 000 0000',
  debtUSD: 0,
  preferredBranchId: store.branches[0]?.id || 'b-001',
});

// Форма регистрации нового пользователя
const regForm = ref({
  fullName: '',
  branchId: store.branches[0]?.id || '',
  telegramUsername: '',
  telegramUserId: null as number | null,
});

const selectedRegBranchName = computed(() => {
  const b = store.branches.find((item) => item.id === regForm.value.branchId) || store.branches[0];
  return b ? `${b.city} — ${b.name} (${b.address})` : 'Главный офис (Душанбе)';
});

const currentBranchSelectedId = computed(() => {
  if (!isRegistered.value) {
    return regForm.value.branchId || store.branches[0]?.id || 'b-001';
  }
  return activeCustomer.value?.preferredBranchId || store.branches[0]?.id || 'b-001';
});

// Текущий выбранный ПВЗ клиента
const currentCustomerBranch = computed(() => {
  const branchId = activeCustomer.value?.preferredBranchId || store.branches[0]?.id || 'b-001';
  return store.branches.find((b) => b.id === branchId) || store.branches[0] || {
    id: 'b-default',
    name: 'Главный пункт выдачи',
    address: 'Уточняется',
    city: 'Душанбе',
  };
});

function selectBranch(branchId: string) {
  if (!isRegistered.value) {
    regForm.value.branchId = branchId;
    showBranchModal.value = false;
    return;
  }
  if (!activeCustomer.value) return;
  activeCustomer.value.preferredBranchId = branchId;
  store.setCustomerPreferredBranch(activeCustomer.value.cargoCode, branchId);
  showBranchModal.value = false;
  if (showQrModal.value) {
    drawModalQr();
  }
}

const clientPackages = computed(() => {
  if (!activeCustomer.value?.cargoCode) return [];
  return store.packages.filter((p) => p.customerCargoCode === activeCustomer.value.cargoCode);
});

async function openQrModal() {
  showQrModal.value = true;
  await nextTick();
  drawModalQr();
}

async function drawModalQr() {
  await nextTick();
  if (qrModalCanvasRef.value && activeCustomer.value) {
    const orgPrefix = (store.tenant?.codePrefix || store.settings.codePrefix || 'cargo').toLowerCase();
    const branchId = activeCustomer.value.preferredBranchId || 'b-001';
    const payload = `cargona://pickup?t=${orgPrefix}&c=${activeCustomer.value.cargoCode}&b=${branchId}&token=sec_${Date.now()}`;
    await QRCode.toCanvas(qrModalCanvasRef.value, payload, {
      width: 192,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }
}

async function fetchTenantInfo(slug: string) {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug || cleanSlug === 'app') return;
  try {
    const res = await fetch(`/api/app/${cleanSlug}/me`);
    if (res.ok) {
      const data = await res.json();
      if (data.tenant) {
        serverTenant.value = data.tenant;
        store.settings.companyName = data.tenant.name;
        store.settings.codePrefix = data.tenant.codePrefix;
        
        let existingTenant = store.tenants.find((t) => t.slug.toLowerCase() === data.tenant.slug.toLowerCase());
        if (!existingTenant) {
          existingTenant = {
            id: `tenant-${data.tenant.slug}`,
            name: data.tenant.name,
            slug: data.tenant.slug,
            codePrefix: data.tenant.codePrefix,
            ownerEmail: '',
            ownerPassword: '',
            baseCurrency: 'USD',
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          store.tenants.push(existingTenant);
        } else {
          existingTenant.name = data.tenant.name;
          existingTenant.codePrefix = data.tenant.codePrefix;
        }
        store.setTenantSlug(data.tenant.slug);
      }
    }
  } catch (e) {
    console.warn('MiniApp tenant fetch error:', e);
  }
}

onMounted(() => {
  // 1. Sync tenant slug from URL
  const slugParam = (route.params.slug as string) || store.activeTenantSlug || store.tenant?.slug || store.tenants[0]?.slug || 'test';
  if (slugParam) {
    store.setTenantSlug(slugParam);
    fetchTenantInfo(slugParam);
  }

  // Check saved customer in localStorage
  if (typeof window !== 'undefined' && slugParam) {
    const savedCode = localStorage.getItem(`cargona_client_cargo_code_${slugParam}`);
    if (savedCode) {
      const found = store.customers.find((c) => c.cargoCode.toUpperCase() === savedCode.toUpperCase());
      if (found) {
        activeCustomer.value = found;
        isRegistered.value = true;
      }
    }
  }

  // 2. Telegram WebApp Integration
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp;
    try {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#0B0C10');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#0B0C10');
    } catch (e) {}

    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
      // Look up customer by telegram user ID or username
      const existing = store.customers.find((c) =>
        (c.telegramUserId && c.telegramUserId === tgUser.id) ||
        (c.telegramUsername && tgUser.username && c.telegramUsername.toLowerCase().replace('@', '') === tgUser.username.toLowerCase())
      );

      if (existing) {
        activeCustomer.value = existing;
        isRegistered.value = true;
        if (slugParam) localStorage.setItem(`cargona_client_cargo_code_${slugParam}`, existing.cargoCode);
      } else if (!isRegistered.value) {
        // Prepare registration form for new client
        const fullName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim();
        regForm.value.fullName = fullName || '';
        regForm.value.telegramUsername = tgUser.username ? `@${tgUser.username}` : '';
        regForm.value.telegramUserId = tgUser.id;
        regForm.value.branchId = store.branches[0]?.id || '';
        isRegistered.value = false;
      }
    }
  }
});

watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug && typeof newSlug === 'string') {
      fetchTenantInfo(newSlug);
    }
  }
);

function handleRegister() {
  if (!regForm.value.fullName || !regPhoneNational.value) return;

  const fullPhone = `${selectedCountry.value.dial} ${regPhoneNational.value}`.trim();
  const slugParam = (route.params.slug as string) || store.activeTenantSlug || store.tenant?.slug || store.tenants[0]?.slug || '';
  const prefix = store.tenant?.codePrefix || store.settings.codePrefix || (slugParam ? slugParam.substring(0, 3).toUpperCase() : 'CRG');
  const newCargoCode = store.nextCargoCode(prefix);

  const newCust = {
    cargoCode: newCargoCode,
    fullName: regForm.value.fullName.trim(),
    phone: fullPhone,
    telegramUsername: regForm.value.telegramUsername.replace('@', '').trim(),
    telegramUserId: regForm.value.telegramUserId || null,
    preferredBranchId: regForm.value.branchId || store.branches[0]?.id || 'b-001',
    notes: 'Зарегистрирован через Telegram Mini App',
  };

  store.addCustomer(newCust);

  activeCustomer.value = {
    id: store.nextSeqId('c', store.customers),
    cargoCode: newCargoCode,
    fullName: newCust.fullName,
    phone: newCust.phone,
    debtUSD: 0,
    preferredBranchId: newCust.preferredBranchId,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(`cargona_client_cargo_code_${slugParam}`, newCargoCode);
  }

  isRegistered.value = true;

  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
}

function copyAddress() {
  if (!currentWarehouse.value) return;
  const addressString = formatWarehouseAddress(currentWarehouse.value);
  navigator.clipboard.writeText(addressString);
  copyStatusOverride.value = `Адрес (${currentWarehouse.value.country}) скопирован!`;

  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }

  setTimeout(() => {
    copyStatusOverride.value = null;
  }, 2500);
}

function addTrack() {
  if (!newTrack.value.trim()) return;
  const originName = currentWarehouse.value?.country || 'склад';
  store.addPackage({
    trackingNumber: newTrack.value.trim(),
    customerCargoCode: activeCustomer.value.cargoCode,
    description: `Ожидается на складе (${originName})`,
    weightKg: 0,
    costUSD: 0,
    shelfLocation: '',
    branchId: activeCustomer.value.preferredBranchId || 'b-001',
    status: 'RECEIVED_AT_ORIGIN',
  });
  newTrack.value = '';

  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
}
</script>
