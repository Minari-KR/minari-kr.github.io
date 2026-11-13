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
      gameFrame.title = game.title;
      gameFrame.src = play.href; // play.href, not game.play: it may have been rewritten to the local server
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
  li.append(thumb, body);
  return li;
}

grid.append(...window.GAMES.map(card));

// Unity web builds cannot load from file:// — point to the local server instead.
if (location.protocol === 'file:') {
  const note = document.createElement('p');
  note.className = 'notice';
  note.textContent = '게임은 파일로 직접 열면 실행되지 않습니다. 폴더의 「갤러리열기.bat」을 더블클릭해 열어 주세요.';
  document.querySelector('.top').append(note);
  for (const a of grid.querySelectorAll('a[href^="games/"]')) a.href = `http://localhost:8080/${a.getAttribute('href')}`;
}

// Warm the browser cache with each local web build while the visitor browses,
// so pressing 플레이 loads from disk instead of the network.
function prefetchBuilds() {
  for (const game of window.GAMES) {
    const m = /^games\/([\w-]+)\/index\.html$/.exec(game.play);
    if (!m) continue;
    const base = `games/${m[1]}/Build/${m[1]}`;
    for (const f of ['loader.js', 'framework.js', 'wasm', 'data']) { // uncompressed build names
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `${base}.${f}`;
      document.head.append(link);
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
