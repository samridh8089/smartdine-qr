// Built-in subtle SVG texture patterns for QR cards (Marble, Wood, Dark Texture, Emerald Pattern, Paper)

export const TEXTURE_PATTERNS: Record<string, string> = {
  none: '',
  
  marble: `url("data:image/svg+xml,%3Csvg width='180' height='180' viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q 45 10 90 40 T 180 20 M0 90 Q 60 70 120 110 T 180 80 M0 150 Q 30 130 90 160 T 180 140' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='1.5' stroke-linecap='round' stroke-dasharray='40,15,60,20'/%3E%3Cpath d='M20 0 Q 70 50 40 100 T 80 180 M110 0 Q 140 60 110 120 T 150 180' fill='none' stroke='rgba(0,0,0,0.04)' stroke-width='1.2'/%3E%3C/svg%3E")`,

  wood: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 15 Q 30 18 60 14 T 120 16 M0 35 Q 40 32 80 37 T 120 34 M0 55 Q 30 58 60 54 T 120 56 M0 75 Q 50 72 90 77 T 120 74 M0 95 Q 30 98 70 94 T 120 96 M0 115 Q 40 112 80 117 T 120 114' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1.2'/%3E%3Ccircle cx='60' cy='55' r='6' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/svg%3E")`,

  dark_texture: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.04' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,

  emerald_pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%23ffffff' stroke-width='0.75' stroke-opacity='0.12' fill='none'%3E%3Cpolygon points='30,5 55,30 30,55 5,30'/%3E%3Cpolygon points='30,15 45,30 30,45 15,30'/%3E%3Ccircle cx='30' cy='30' r='3' fill='%23ffffff' fill-opacity='0.12'/%3E%3C/g%3E%3C/svg%3E")`,

  paper: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`
};
