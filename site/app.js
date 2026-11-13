const grid = document.getElementById('grid');
const player = document.getElementById('player');
const video = player.querySelector('video');
const gameDialog = document.getElementById('game');
const gameFrame = gameDialog.querySelector('iframe');

const isMp4 = (src) => /\.mp4($|\?)/i.test(src);
const isExternal = (src) => /^https:\/\//i.test(src);

function button(label, cls) {
  const b = document.createElement('a');
  b.className = `btn ${cls}`;
  b.textContent = label;
  return b;
}

function card(game) {
  const li = document.createElement('li');
  li.className = 'card';

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if (game.thumb) {
    const img = document.createElement('img');
    img.src = game.thumb;
    img.alt = '';
    img.loading = 'lazy';
    thumb.append(img);
  }

  const body = document.createElement('div');
  body.className = 'body';
  const genre = document.createElement('p');
  genre.className = 'genre';
  genre.textContent = game.genre || '';
  const title = document.createElement('h2');
  title.textContent = game.title;
  const actions = document.createElement('div');
  actions.className = 'actions';

  if (game.play) {
    const play = button('플레이', 'primary');
    play.href = game.play;
    play.setAttribute('aria-label', `${game.title} 플레이`);
    play.addEventListener('click', (e) => {
      e.preventDefault();
      prefetchStop.abort(); // give the whole connection to this game
      gameFrame.title = game.title;
      gameFrame.src = game.play;
      gameDialog.showModal();
    });
    actions.append(play);
  }
  if (game.video) {
    const vid = button('영상', 'ghost');
    vid.href = game.video;
    vid.setAttribute('aria-label', `${game.title} 영상`);
    if (isMp4(game.video)) {
      vid.addEventListener('click', (e) => {
        e.preventDefault();
        video.src = game.video;
        video.volume = 0.4; // same default as the games (volume.js)
        player.showModal();
        video.play().catch(() => {});
      });
    } else if (isExternal(game.video)) {
      vid.target = '_blank';
      vid.rel = 'noopener noreferrer';
    }
    actions.append(vid);
  }

  body.append(genre, title, actions);
  if (game.links?.length) { // documents (design doc, resource list): https links, new tab
    const docs = document.createElement('div');
    docs.className = 'actions docs';
    for (const { label, url } of game.links) {
      if (!isExternal(url)) continue;
      const a = button(label, 'ghost');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', `${game.title} ${label} (새 탭)`);
      docs.append(a);
    }
    body.append(docs);
  }
  li.append(thumb, body);
  return li;
}

grid.append(...window.GAMES.map(card));

// Unity web builds cannot load from file:// — send the visitor to the published site.
if (location.protocol === 'file:') {
  const note = document.createElement('p');
  note.className = 'notice';
  note.textContent = '게임은 파일로 직접 열면 실행되지 않습니다. https://minari-kr.github.io/ 에서 열어 주세요.';
  document.querySelector('.top').append(note);
}

// Warm the browser cache with each web build while the visitor browses, so pressing 플레이 loads
// from disk. One file at a time, in list order, and it stops as soon as a game is opened:
// downloading everything at once made the clicked game share the connection (15 s+ on a first visit).
const prefetchStop = new AbortController();
async function prefetchBuilds() {
  for (const game of window.GAMES) {
    const m = /^games\/([\w-]+)\/index\.html$/.exec(game.play);
    if (!m) continue;
    for (const f of ['loader.js', 'framework.js', 'wasm', 'data']) { // uncompressed build names
      try {
        const res = await fetch(`games/${m[1]}/Build/${m[1]}.${f}`, { signal: prefetchStop.signal, priority: 'low' });
        const reader = res.body.getReader();
        while (!(await reader.read()).done); // read to the end so the browser caches it, without keeping it in memory
      } catch {
        return; // stopped, or offline: the game simply loads when opened
      }
    }
  }
}
// ~200 MB in total: skip on phones/tablets and data-saver connections.
const skipPrefetch = navigator.connection?.saveData || matchMedia('(pointer: coarse)').matches;
if (skipPrefetch) { /* games load on demand */ }
else if ('requestIdleCallback' in window) requestIdleCallback(prefetchBuilds);
else addEventListener('load', prefetchBuilds);

// Close the popup: × button, a click outside the video, or Esc (built into <dialog>).
for (const d of [player, gameDialog]) {
  d.querySelector('.close').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
}
player.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); });
gameFrame.addEventListener('load', () => gameFrame.focus()); // keys go to the game right away
gameDialog.addEventListener('close', () => { gameFrame.src = 'about:blank'; }); // stop the game and its sound
