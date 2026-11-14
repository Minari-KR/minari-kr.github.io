// Slide deck pages (site/docs/<game>/deck.html). Wheel, touch, up/down and Space already page through CSS
// scroll snap (deck.css); this adds left/right keys, two buttons and the "3 / 13" count.
// It scrolls instead of following #links, so the popup's Back button still closes the popup in one press.
const slides = [...document.querySelectorAll('.slide')];
const index = () => Math.round(scrollY / innerHeight);   // every slide is one screen tall (buttons are hidden in phone card mode)
const go = (step) => slides[index() + step]?.scrollIntoView();

const nav = document.createElement('nav');
nav.className = 'deck-nav';
nav.setAttribute('aria-label', '슬라이드 넘기기');
nav.innerHTML = '<button type="button" aria-label="이전 슬라이드">‹</button><span></span><button type="button" aria-label="다음 슬라이드">›</button>';
const [prev, count, next] = nav.children;
prev.addEventListener('click', () => go(-1));
next.addEventListener('click', () => go(1));

function update() {
  const i = index();
  count.textContent = `${i + 1} / ${slides.length}`;
  prev.disabled = i === 0;
  next.disabled = i === slides.length - 1;
}
addEventListener('scroll', update, { passive: true });
addEventListener('resize', update);
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
});
document.body.append(nav);
update();
