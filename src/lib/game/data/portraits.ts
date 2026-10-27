/**
 * v1.2 «Ремастер портретов» — AI-арт (painterly, GDD 04: «тёмный силуэт + акцент фракции»).
 * Карта: имя спикера диалога → PNG 256×256 в /public/images/portraits/.
 * Генерация: scripts/gen-portraits.ts (идемпотентный батч).
 *
 * Объектные спикеры (Доска объявлений, Древний Алтарь, Древняя плита, Осколочный барьер,
 * Сигнальный рог, Семя Разлома) и '???' намеренно остаются процедурным SVG из Фазы 5.
 */
export const PORTRAIT_IMG: Record<string, string> = {
  // Хеймхолл (хаб)
  Бьорн: '/images/portraits/bjorn.png',
  Грим: '/images/portraits/grim.png',
  Дорн: '/images/portraits/dorn.png',
  Ирма: '/images/portraits/irma.png',
  Селена: '/images/portraits/selena.png',
  Кайя: '/images/portraits/kaya.png',
  Торвальд: '/images/portraits/thorvald.png',
  Альра: '/images/portraits/alra.png',
  // Гранитная Долина
  Хран: '/images/portraits/khran.png',
  Кассия: '/images/portraits/kassia.png',
  Брок: '/images/portraits/brok.png',
  Йорв: '/images/portraits/yorv.png',
  Лиара: '/images/portraits/liara.png',
  Финн: '/images/portraits/finn.png',
  'Мастер Ямы': '/images/portraits/pit_master.png',
  // Стылое Пределье
  Эйнар: '/images/portraits/einar.png',
  Ингрид: '/images/portraits/ingrid.png',
  // Багровая Мара
  'Командор Мейра': '/images/portraits/meira.png',
  'Досент Хольт': '/images/portraits/dozent_holt.png',
  // Спорные Земли
  Ульва: '/images/portraits/ulva.png',
  Пруша: '/images/portraits/prusha.png',
  Тарбен: '/images/portraits/tarben.png',
  'Гхарз Кровавый Пёс': '/images/portraits/gharz.png',
  // Внешний Рубеж (Фаза 6.5)
  Ашер: '/images/portraits/asher.png',
  // Финал
  'Пожиратель Эха': '/images/portraits/devourer.png',
}
