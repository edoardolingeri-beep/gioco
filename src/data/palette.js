/**
 * palette.js — Palette colori del gioco (stile cartoon saturo).
 * Tutti i colori sono array [r,g,b] perché il baker li ombreggia moltiplicando.
 */

export const PAL = {
  /* natura */
  grass:      [116, 194, 92],
  grassDark:  [ 92, 170, 74],
  grassLight: [146, 214, 112],
  dirt:       [166, 126,  82],
  dirtDark:   [138, 102,  64],
  sand:       [225, 203, 142],

  bark:       [124,  88,  60],
  barkDark:   [ 96,  66,  44],
  barkLight:  [152, 112,  76],
  wood:       [190, 142,  88],
  woodEnd:    [222, 186, 132],

  leafA:      [ 78, 176,  92],
  leafB:      [ 62, 156,  84],
  leafC:      [104, 196, 106],
  leafPine:   [ 54, 134,  86],
  bush:       [ 88, 178,  96],

  stone:      [150, 156, 168],
  stoneDark:  [122, 128, 142],
  stoneLight: [178, 184, 196],

  /* personaggio */
  skin:       [244, 194, 152],
  skinDark:   [214, 160, 120],
  hair:       [ 92,  62,  44],
  shirt:      [ 74, 148, 226],
  shirtAlt:   [ 60, 124, 200],
  pants:      [ 62,  74, 106],
  boot:       [ 74,  54,  44],
  bootUp:     [122,  92,  62],
  belt:       [ 96,  70,  50],

  /* attrezzi */
  handle:     [150, 108,  70],
  ironA:      [186, 194, 208],
  ironB:      [154, 162, 178],
  steelA:     [214, 224, 238],
  steelB:     [176, 188, 206],

  /* costruzioni */
  plank:      [198, 152,  98],
  plankDark:  [166, 122,  76],
  roofRed:    [206,  96,  84],
  roofRedD:   [176,  74,  66],
  strawA:     [226, 190, 108],
  strawB:     [200, 162,  86],
  cloth:      [232, 226, 208],
  clothRed:   [214, 100,  92],
  clothBlue:  [ 92, 150, 214],

  /* varie */
  coin:       [255, 206,  84],
  coinDark:   [230, 168,  50],
  ghost:      [124, 200, 255],
  flowerA:    [255, 226, 120],
  flowerB:    [246, 140, 180],
  flowerC:    [186, 156, 246],
  white:      [255, 255, 255],
};

/** Colori CSS pronti per HUD e particelle. */
export const CSS = {
  wood: '#c99055',
  stone: '#a8adbb',
  coin: '#ffce54',
  good: '#6ee7a0',
  bad: '#ff7a6b',
};
