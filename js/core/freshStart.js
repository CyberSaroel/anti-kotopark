import { VERSION } from "./version.js";

/**
 * Одноразовый форс-сброс кэша прогресса/настроек для версии 1.4.0.
 *
 * Ранее эти данные жили под ключами "socio-cats:*", а миграция в модулях
 * происходила разово при чтении. Теперь (начиная с 1.4.0) хранилище
 * пишется под ключами "ak_*". Чтобы гарантированно выйти на чистые
 * дефолтные значения без остатков от прошлых промежуточных состояний,
 * здесь явно проставляются дефолты один раз под маркером.
 *
 * ⚠ Вызывать самым первым в js/app.js — до любого чтения прогресса,
 * настроек и статистики.
 *
 * Не трогаем: ключи "socio-cats:*" — это живые данные старой socio-cats
 * игры; а также ak_kings_total / ak_rockets / ak_total_moves /
 * ak_total_time_ms / ak_theme — они вне этого фикса.
 */
const FRESH_START_MARKER = "ak_fresh_start_1_4_0";

/** Явные дефолтные значения под новыми ("ak_*") ключами версии 1.4.0. */
const FRESH_DEFAULTS = [
  ["ak_completed", "[]"],
  ["ak_level_records", "{}"],
  ["ak_naming_style", "aushra"],
  ["ak_music_enabled", "true"],
  ["ak_sfx_enabled", "true"],
  ["ak_music_volume", "0.5"],
  ["ak_sfx_volume", "0.5"],
  ["ak_gs_total_moves", "0"],
  ["ak_gs_total_time_ms", "0"],
  ["ak_selected_theme", "anti-kotopark"],
  ["ak_selected_victory_sound", "1"],
  ["ak_selected_skin", "classic"],
  ["ak_version", VERSION]
];

/** Запустить разовый форс-сброс (идемпотентно по маркеру). */
export function runFreshStartOnce() {
  try {
    if (localStorage.getItem(FRESH_START_MARKER) !== null) return;
    for (const [key, value] of FRESH_DEFAULTS) {
      localStorage.setItem(key, value);
    }
    localStorage.setItem(FRESH_START_MARKER, "1");
  } catch (e) {
    // Игнорируем ошибки хранилища — данные игры не критичны для старта
  }
}
