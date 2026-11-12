(() => {
  let playing; // the card link whose iframe is showing

  document.addEventListener('click', event => {
    const link = event.target.closest('a.work-video');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const { youtube, start } = link.dataset;
    if (!/^[A-Za-z0-9_-]{11}$/.test(youtube ?? '') || (start !== undefined && !/^\d+$/.test(start))) return;
    event.preventDefault();
    if (playing) playing.frame.replaceWith(playing.link);
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&playsinline=1&rel=0${start === undefined ? '' : `&start=${start}`}`;
    frame.title = link.getAttribute('aria-label').replace(/ 재생$/, '');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    // The pages send no-referrer, and YouTube's player refuses to play (error 153) without a referrer.
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.className = 'work-media work-frame';
    link.replaceWith(frame);
    playing = { link, frame };
    frame.focus();
  });
})();
