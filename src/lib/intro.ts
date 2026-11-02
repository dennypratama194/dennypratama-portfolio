/** Run before first paint, without requiring a dynamic public layout. */
const DAY = 864e5;
export const INTRO_SEEN_SCRIPT = `try{var t=+localStorage.getItem('dp-intro');if(t&&Date.now()-t<${DAY})document.documentElement.classList.add('intro-seen')}catch(e){}setTimeout(function(){var s=document.querySelector('.site');if(s&&!s.classList.contains('ld-go'))document.documentElement.classList.add('ld-stuck')},8000)`;
export const INTRO_NOSCRIPT_CSS = '.ld{display:none!important}html .site.has-intro{--d0:0s}html .site.has-intro *{animation-play-state:running!important}';

