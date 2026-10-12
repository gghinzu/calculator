// Pixel-art icons for the background, drawn as text pixel maps.
// "." is transparent; letters a–d are colour slots that a scene fills with
// the current theme's sprite colours in a random order, so the same icon
// looks different from one page load to the next.

export type ColourSlot = 'a' | 'b' | 'c' | 'd'

export const SPRITES = {
  heart: [
    '.aa.aa.',
    'adaaaaa',
    'aaaaaaa',
    '.aaaaa.',
    '..aaa..',
    '...a...',
  ],
  star: [
    '...a...',
    '..aaa..',
    'aaabaaa',
    '.aaaaa.',
    '.aa.aa.',
    'a.....a',
  ],
  cloud: [
    '...aaa....',
    '.aaaaaa.a.',
    'aaaaaaaaaa',
    '.aaaaaaaa.',
  ],
  tulip: [
    '.a.a.a.',
    '.aaaaa.',
    '.aaaaa.',
    '..aaa..',
    '...b...',
    'b..b..b',
    '.b.b.b.',
    '..bbb..',
  ],
  envelope: [
    'aaaaaaaaa',
    'abaaaaaba',
    'aabaaabaa',
    'aaabcbaaa',
    'aaaaaaaaa',
    'aaaaaaaaa',
  ],
  teacup: [
    '..d.d....',
    '...d.....',
    'aaaaaaa..',
    'abbbbbaaa',
    'abbbbba.a',
    'aaaaaaaaa',
    '.aaaaa...',
    'ccccccc..',
  ],
  disc: [
    '..aaa..',
    '.abbba.',
    'abbcbba',
    'abc.cba',
    'abbcbba',
    '.abbba.',
    '..aaa..',
  ],
  gameboy: [
    'aaaaaaa',
    'abbbbba',
    'abcccba',
    'abcccba',
    'abbbbba',
    'aaaaaaa',
    'adaaaaa',
    'dddaaca',
    'adaacaa',
    'aaaaaaa',
  ],
  calculator: [
    'aaaaaaa',
    'abbbbba',
    'abbbbba',
    'aaaaaaa',
    'acacada',
    'aaaaaaa',
    'acacada',
    'aaaaaaa',
  ],
  gift: [
    '.c.....c.',
    '..c...c..',
    '...ccc...',
    'aaaacaaaa',
    'aaaacaaaa',
    '.bbbcbbb.',
    '.bbbcbbb.',
    '.bbbcbbb.',
  ],
  cat: [
    'a.......a',
    'aa.....aa',
    'aaaaaaaaa',
    'aacaaacaa',
    'aaaaaaaaa',
    'aaaadaaaa',
    '.aaaaaaa.',
  ],
  book: [
    'aaaaaaaa.',
    'abbbbbbad',
    'abbcbbbad',
    'abcccbbad',
    'abbcbbbad',
    'aaaaaaaad',
    '.dddddddd',
  ],
  mushroom: [
    '..aaaaa..',
    '.aabaaba.',
    'aaaaaaaaa',
    'abaaabaaa',
    'aaaaaaaaa',
    '...ccc...',
    '...ccc...',
    '..ccccc..',
  ],
  clock: [
    '..aaaaa..',
    '.abbbbba.',
    'abbbcbbba',
    'abbbcbbba',
    'abbbccbba',
    'abbbbbbba',
    '.abbbbba.',
    '..aaaaa..',
  ],
} satisfies Record<string, string[]>

export type SpriteName = keyof typeof SPRITES

export const SPRITE_NAMES = Object.keys(SPRITES) as SpriteName[]

/** Tiny twinkling star used for sparkles. */
export const SPARKLE = ['..a..', '.aaa.', 'aaaaa', '.aaa.', '..a..']
