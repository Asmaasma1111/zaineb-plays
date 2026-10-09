/* زوزو — the baby camel mascot. Original SVG drawing, no external assets.
   Mascot.svg(state) -> markup. States: idle | happy | clap | tilt | sleep | wave */
(function () {
  const SAND = '#F3C98B', SAND_D = '#E0AD66', SAND_L = '#FAE1B6', INK = '#4A3A2A', PINK = '#FFB3A7', WHITE = '#FFFFFF';
  function svg(state, opts) {
    state = state || 'idle';
    opts = opts || {};
    const size = opts.size || 220;
    const eyesOpen = state !== 'sleep';
    const mouth = state === 'sleep' ? 'M92 106 Q100 110 108 106'
                : (state === 'tilt' ? 'M92 108 Q100 104 108 108'
                : (state === 'happy' || state === 'clap' ? 'M86 102 Q100 118 114 102 Z' : 'M90 104 Q100 112 110 104'));
    const eyes = eyesOpen
      ? `<g class="m-eyes">
           <circle cx="86" cy="78" r="8.5" fill="${WHITE}"/><circle cx="114" cy="78" r="8.5" fill="${WHITE}"/>
           <g class="m-pupils"><circle cx="87" cy="79" r="4.6" fill="${INK}"/><circle cx="115" cy="79" r="4.6" fill="${INK}"/>
           <circle cx="89" cy="77" r="1.6" fill="${WHITE}"/><circle cx="117" cy="77" r="1.6" fill="${WHITE}"/></g>
           <g class="m-lids"><rect x="76" y="66" width="22" height="12" rx="6" fill="${SAND}"/><rect x="102" y="66" width="22" height="12" rx="6" fill="${SAND}"/></g>
         </g>`
      : `<g class="m-eyes"><path d="M78 80 Q86 86 94 80" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
           <path d="M106 80 Q114 86 122 80" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    const brows = state === 'tilt'
      ? `<path d="M78 64 L94 68" stroke="${SAND_D}" stroke-width="3" stroke-linecap="round"/><path d="M106 66 L122 60" stroke="${SAND_D}" stroke-width="3" stroke-linecap="round"/>` : '';
    const zzz = state === 'sleep'
      ? `<g class="m-zzz" font-family="Baloo Bhaijaan 2, sans-serif" font-weight="800" fill="#6FA8DC">
           <text x="140" y="56" font-size="22">z</text><text x="156" y="38" font-size="28">z</text><text x="174" y="16" font-size="34">z</text></g>` : '';
    return `
<svg class="mascot m-${state}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="زوزو">
  <g class="m-body-g">
    <ellipse cx="136" cy="108" rx="22" ry="18" fill="${SAND_D}"/>
    <g class="m-leg-back"><rect x="60" y="150" width="15" height="30" rx="7.5" fill="${SAND_D}"/><rect x="125" y="150" width="15" height="30" rx="7.5" fill="${SAND_D}"/>
      <ellipse cx="67.5" cy="180" rx="8" ry="4" fill="${INK}" opacity=".35"/><ellipse cx="132.5" cy="180" rx="8" ry="4" fill="${INK}" opacity=".35"/></g>
    <path d="M150 128 q14 -4 12 12 q-2 10 -10 8" stroke="${SAND_D}" stroke-width="5" fill="none" stroke-linecap="round" class="m-tail"/>
    <ellipse cx="100" cy="138" rx="54" ry="40" fill="${SAND}"/>
    <ellipse cx="100" cy="150" rx="30" ry="22" fill="${SAND_L}"/>
    <g class="m-leg-front"><rect x="78" y="156" width="15" height="28" rx="7.5" fill="${SAND}"/><rect x="107" y="156" width="15" height="28" rx="7.5" fill="${SAND}"/>
      <ellipse cx="85.5" cy="184" rx="8" ry="4" fill="${INK}" opacity=".35"/><ellipse cx="114.5" cy="184" rx="8" ry="4" fill="${INK}" opacity=".35"/></g>
    <g class="m-arm m-arm-l"><rect x="48" y="118" width="14" height="34" rx="7" fill="${SAND}"/></g>
    <g class="m-arm m-arm-r"><rect x="138" y="118" width="14" height="34" rx="7" fill="${SAND}"/></g>
  </g>
  <g class="m-head">
    <ellipse cx="66" cy="60" rx="10" ry="13" fill="${SAND}" transform="rotate(-20 66 60)"/><ellipse cx="66" cy="61" rx="5" ry="7" fill="${PINK}" transform="rotate(-20 66 60)"/>
    <ellipse cx="134" cy="60" rx="10" ry="13" fill="${SAND}" transform="rotate(20 134 60)"/><ellipse cx="134" cy="61" rx="5" ry="7" fill="${PINK}" transform="rotate(20 134 60)"/>
    <ellipse cx="100" cy="82" rx="38" ry="34" fill="${SAND}"/>
    <circle cx="92" cy="48" r="7" fill="${SAND_D}"/><circle cx="102" cy="44" r="8" fill="${SAND_D}"/><circle cx="111" cy="49" r="6.5" fill="${SAND_D}"/>
    <ellipse cx="100" cy="100" rx="20" ry="13" fill="${SAND_L}"/>
    <ellipse cx="92" cy="97" rx="2.6" ry="1.8" fill="${INK}" opacity=".7"/><ellipse cx="108" cy="97" rx="2.6" ry="1.8" fill="${INK}" opacity=".7"/>
    <path class="m-mouth" d="${mouth}" stroke="${INK}" stroke-width="3" fill="${state === 'happy' || state === 'clap' ? '#D96C5F' : 'none'}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="70" cy="94" r="6.5" fill="${PINK}" opacity=".75"/><circle cx="130" cy="94" r="6.5" fill="${PINK}" opacity=".75"/>
    ${brows}${eyes}
  </g>
  ${zzz}
</svg>`;
  }
  window.Mascot = { svg };
})();
