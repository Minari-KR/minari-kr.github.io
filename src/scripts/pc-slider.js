// PC portfolio slider: one slide at a time. Without this script the slides stay a scrollable row.
// The fade is CSS only (and off under prefers-reduced-motion there), so no motion API is needed here.
(() => {
  const slider = document.querySelector('[data-pc-slider]');
  const slides = slider ? [...slider.querySelectorAll('.pc-slide')] : [];
  if (slides.length < 2) return;
  const details = [...document.querySelectorAll('[data-pc-details] .pc-detail')]; // summaries, one per slide, same order
  const make = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text ?? '' });
  const arrow = (className, glyph, label) => {
    const button = make('button', `pc-arrow ${className}`, glyph);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    return button;
  };
  const prev = arrow('pc-prev', '', '이전 프로젝트'); // the chevron is drawn in CSS
  const next = arrow('pc-next', '', '다음 프로젝트');
  const dots = make('div', 'pc-dots');
  const status = make('p', 'pc-sr'); // read out on change; the dots are decorative
  dots.setAttribute('aria-hidden', 'true');
  status.setAttribute('aria-live', 'polite');
  slides.forEach(() => dots.append(document.createElement('span')));
  slider.append(prev, next);
  slider.after(dots, status);

  let index = 0;
  const show = to => {
    const focusInside = slides[index].contains(document.activeElement);
    index = (to + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-current', i === index);
      slide.inert = i !== index;
      dots.children[i].classList.toggle('is-current', i === index);
      if (details[i]) { details[i].classList.toggle('is-current', i === index); details[i].inert = i !== index; }
    });
    status.textContent = `프로젝트 ${index + 1}/${slides.length}`;
    if (focusInside) next.focus(); // the focused link just became inert
  };
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  slider.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
  });
  const ready = [slider, document.querySelector('[data-pc-details]')];
  ready.forEach(el => el.classList.add('is-ready', 'is-init')); // is-init: no 200ms fade while the first state is applied
  show(0);
  void slides[0].offsetWidth; // flush styles so the init state lands without a transition
  ready.forEach(el => el.classList.remove('is-init'));
})();
