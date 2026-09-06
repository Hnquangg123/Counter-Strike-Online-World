import type { Grade, Side, WeaponCategory } from './enums'

/**
 * Presentation metadata shared by the site and any consumer that wants to
 * render CSO grades and sides the way the game did.
 */
export const GRADE_META: Record<Grade, { label: string; color: string; order: number }> = {
  common: { label: 'Common', color: '#9AA0A8', order: 0 },
  rare: { label: 'Rare', color: '#3F8CFF', order: 1 },
  unique: { label: 'Unique', color: '#B36BFF', order: 2 },
  epic: { label: 'Epic', color: '#FFB13B', order: 3 },
  transcendent: { label: 'Transcendent', color: '#5CF2FF', order: 4 },
  unknown: { label: 'Unclassified', color: '#5C6470', order: -1 },
}

export const SIDE_META: Record<Side, { label: string; short: string; color: string }> = {
  ct: { label: 'Counter-Terrorist', short: 'CT', color: '#3F8CFF' },
  tr: { label: 'Terrorist', short: 'TR', color: '#F5A524' },
  zombie: { label: 'Zombie', short: 'Z', color: '#7CFF3F' },
  neutral: { label: 'Neutral', short: 'N', color: '#9AA0A8' },
}

export const WEAPON_CATEGORY_META: Record<WeaponCategory, { label: string; order: number }> = {
  pistol: { label: 'Pistols', order: 0 },
  shotgun: { label: 'Shotguns', order: 1 },
  'submachine-gun': { label: 'Submachine Guns', order: 2 },
  'assault-rifle': { label: 'Assault Rifles', order: 3 },
  'sniper-rifle': { label: 'Sniper Rifles', order: 4 },
  'machine-gun': { label: 'Machine Guns', order: 5 },
  melee: { label: 'Melee', order: 6 },
  grenade: { label: 'Grenades', order: 7 },
  equipment: { label: 'Equipment', order: 8 },
  special: { label: 'Special', order: 9 },
  zombie: { label: 'Zombie Arsenal', order: 10 },
}
