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

  /* nemici */
  wolfA:      [ 96, 102, 122],
  wolfB:      [ 68,  74,  94],
  wolfBelly:  [190, 194, 208],
  wolfEye:    [255, 196,  84],
  fang:       [250, 250, 250],
  bearA:      [ 92,  62,  46],
  bearB:      [ 62,  40,  30],
  bearBelly:  [138, 100,  74],
  bearEye:    [ 30,  24,  20],
  bearClaw:   [244, 240, 230],

  /* abitanti (varianti di vestiario) */
  npcShirtA:  [214, 122,  96],
  npcShirtB:  [126, 190, 128],
  npcShirtC:  [176, 148, 216],
  npcShirtD:  [232, 196, 108],
  npcHairA:   [ 60,  44,  36],
  npcHairB:   [172, 118,  56],
  npcHairC:   [216, 204, 186],
  npcSkinA:   [244, 194, 152],
  npcSkinB:   [206, 152, 110],
  npcSkinC:   [156, 108,  74],

  /* villaggio (fase 2) */
  fence:      [178, 134,  86],
  fenceDark:  [146, 106,  66],
  soil:       [122,  86,  58],
  crop:       [130, 196,  86],
  cropRipe:   [226, 190,  92],
  roofWood:   [166, 104,  74],
  roofWoodD:  [138,  82,  58],
  canvasTan:  [214, 196, 162],
  waterA:     [ 92, 168, 216],
  waterB:     [ 66, 138, 190],

  /* Fase 3: paese */
  ironOre:    [206, 138,  86],
  ironOreD:   [168,  98,  62],
  ironBar:    [178, 186, 202],
  cobble:     [156, 152, 148],
  cobbleD:    [128, 124, 122],
  cobbleL:    [182, 178, 172],
  millSail:   [232, 226, 208],
  millWood:   [156, 112,  74],
  forge:      [ 74,  70,  78],
  forgeHot:   [255, 138,  56],
  bridgeWood: [172, 126,  82],
  bridgeDark: [136,  96,  62],

  /* Fase 4: città */
  asphalt:    [ 88,  90,  98],
  asphaltD:   [ 72,  74,  82],
  asphaltL:   [106, 108, 116],
  roadLine:   [238, 232, 214],
  marble:     [230, 226, 218],
  marbleD:    [198, 192, 182],
  brickA:     [186, 106,  86],
  brickB:     [162,  88,  72],
  glassA:     [138, 202, 226],
  glassB:     [ 96, 170, 204],
  shopRed:    [212,  84,  76],
  shopBlue:   [ 76, 132, 204],
  shopGreen:  [ 88, 176, 118],
  awning:     [242, 240, 236],
  gold:       [246, 202,  74],
  goldD:      [206, 158,  40],
  goldVein:   [252, 216, 108],
  neonWarm:   [255, 232, 180],
  medical:    [232,  86,  86],
  parkGrass:  [126, 200,  96],
  hedge:      [ 74, 148,  84],

  /* Fase 5: metropoli */
  towerA:     [126, 148, 176],
  towerB:     [102, 122, 150],
  towerGlass: [116, 186, 216],
  towerGlassD:[ 84, 150, 184],
  towerWhite: [222, 228, 236],
  steel:      [166, 174, 186],
  steelD:     [128, 136, 150],
  carRed:     [214,  74,  70],
  carBlue:    [ 68, 128, 214],
  carYellow:  [246, 196,  70],
  carWhite:   [232, 236, 242],
  carDark:    [ 58,  62,  74],
  carGlass:   [ 96, 148, 176],
  tramGreen:  [ 72, 160, 122],
  tramCream:  [238, 232, 214],
  rail:       [148, 152, 160],
  sleeper:    [ 96,  88,  80],
  lightRed:   [255,  86,  76],
  lightAmber: [255, 186,  60],
  lightGreen: [ 96, 226, 128],
  smoke:      [186, 190, 198],
  runway:     [ 62,  64,  72],

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
