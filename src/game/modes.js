// Game modes and the bot roster used to fill arenas.

export const MODES = [
  {
    id: 'brawl',
    label: 'Brawl',
    blurb: 'First to 3 round wins. Weapons rain from the sky — grab the best one.',
    wins: 3,
  },
  {
    id: 'sudden',
    label: 'Sudden Death',
    blurb: 'One hit kills. Five rounds, no second chances.',
    wins: 5,
  },
  {
    id: 'boss',
    label: 'Boss Hunt',
    blurb: 'A bot starts giant with double health. Beat them and take the crown.',
    wins: 3,
  },
  {
    id: 'survival',
    label: 'Survival',
    blurb: 'Endless waves, one more bot every round. How far can you get?',
    wins: 1,
  },
];

export const BOT_POOL = [
  { name: 'Rex', personality: 'rusher' },
  { name: 'Nova', personality: 'sniper' },
  { name: 'Kilo', personality: 'brute' },
  { name: 'Vex', personality: 'hunter' },
  { name: 'Juno', personality: 'rusher' },
  { name: 'Ash', personality: 'sniper' },
  { name: 'Mace', personality: 'brute' },
  { name: 'Iris', personality: 'hunter' },
];

export const BOT_COLORS = ['#ff5d73', '#6fe8ff', '#ffd166', '#c9a7ff', '#8ef0c0', '#ff8a5c', '#f4f1e8'];

export function getMode(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}