// /about/ page: the top-games pack caption. Without this script the play times stay visible as text under each pack.
(() => {
  const lcd = document.querySelector('[data-top-games]');
  const caption = lcd?.querySelector('[data-top-caption]');
  if (!caption) return;
  const packs = [...lcd.querySelectorAll('.pack')];
  const line = text => Object.assign(document.createElement('span'), { className: 'caption-line', textContent: text });
  // A pressed pack shows its play time and genre in the LCD caption; pressing it again clears the caption.
  const show = pack => {
    packs.forEach(item => {
      item.setAttribute('aria-pressed', String(item === pack));
      item.classList.toggle('is-selected', item === pack);
    });
    caption.replaceChildren(...(pack ? [line(pack.dataset.title), line(`${pack.dataset.hours} · ${pack.dataset.genre}`)] : [line('팩을 눌러 보세요')]));
  };
  packs.forEach(pack => pack.addEventListener('click', () => show(pack.getAttribute('aria-pressed') === 'true' ? null : pack)));
  lcd.classList.add('is-ready');
  caption.hidden = false;
  show(null);
})();
