const grid = document.getElementById('grid');
const player = document.getElementById('player');
const video = player.querySelector('video');
const gameDialog = document.getElementById('game');
const gameFrame = gameDialog.querySelector('iframe');
const version = new URL(document.currentScript.src).searchParams.get('v'); // set at deploy (check.yml)

const isMp4 = (src) => /\.mp4($|\?)/i.test(src);
const isExternal = (src) => /^https:\/\//i.test(src);

// --- Popups ---------------------------------------------------------------------------------------------------

// Back closes an open popup instead of leaving the site (on a phone the popup is the whole screen).
let backCloses = false;
function show(dialog) {
  dialog.showModal();
  history.pushState(null, '');
  backCloses = true;
}
addEventListener('popstate', () => {
  backCloses = false;
  for (const d of [player, gameDialog]) if (d.open) d.close();
  setFrame('about:blank'); // Forward must not bring a closed game back to life behind the page
});

// location.replace keeps the frame's pages out of browser history: with a plain .src, Back after closing
// reloaded the closed game inside the hidden frame, sound included.
function setFrame(src) {
  gameFrame.contentWindow.location.replace(new URL(src, location.href).href);
}

// One frame shows games, documents and the workflow picture.
function openFrame(title, src) {
  gameFrame.title = title;
  setFrame(src);
  show(gameDialog);
}

// Close: × button, a click outside, Back, or Esc (built into <dialog>).
for (const d of [player, gameDialog]) {
  d.querySelector('.close').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => {
    if (backCloses) { backCloses = false; history.back(); } // drop the entry show() added
  });
}
player.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); });
gameDialog.addEventListener('close', () => setFrame('about:blank')); // stop the game and its sound
gameFrame.addEventListener('load', () => gameFrame.focus()); // keys go to the game right away

// --- Cards ----------------------------------------------------------------------------------------------------

function button(label, cls, href, name) {
  const b = document.createElement('a');
  b.className = `btn ${cls}`;
  b.textContent = label;
  b.href = href;
  b.setAttribute('aria-label', name);
  return b;
}

function newTab(a) {
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', `${a.getAttribute('aria-label')} (새 탭)`);
}

function onClick(a, run) {
  a.addEventListener('click', (e) => { e.preventDefault(); run(); });
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
    const play = button('플레이', 'primary', game.play, `${game.title} 플레이`);
    onClick(play, () => {
      prefetchStop.abort(); // give the whole connection to this game
      openFrame(game.title, game.play);
    });
    actions.append(play);
  }
  if (game.video) {
    const vid = button('영상', 'ghost', game.video, `${game.title} 영상`);
    if (isMp4(game.video)) {
      onClick(vid, () => {
        video.src = game.video;
        video.volume = 0.4; // same default as the games (volume.js)
        show(player);
        video.play().catch(() => {});
      });
    } else if (isExternal(game.video)) newTab(vid);
    actions.append(vid);
  }
  body.append(genre, title, actions);

  if (game.links?.length) { // documents: site pages (docs/...) open in the popup, https links in a new tab
    const docs = document.createElement('div');
    docs.className = 'actions docs';
    for (const { label, url } of game.links) {
      const a = button(label, 'ghost', url, `${game.title} ${label}`);
      if (isExternal(url)) newTab(a);
      else if (/^docs\/[\w./-]+\.html$/.test(url)) {
        // same ?v= as this script, so an updated doc is never stale
        onClick(a, () => openFrame(`${game.title} ${label}`, version ? `${url}?v=${version}` : url));
      } else continue;
      docs.append(a);
    }
    body.append(docs);
  }
  li.append(thumb, body);
  return li;
}

grid.append(...window.GAMES.map(card));

// The workflow picture opens full size in the same popup (its words are small on a phone).
const workflow = document.querySelector('.workflow-link');
onClick(workflow, () => openFrame('AI Workflow', workflow.getAttribute('href')));

// Unity web builds cannot load from file:// — send the visitor to the published site.
if (location.protocol === 'file:') {
  const note = document.createElement('p');
  note.className = 'notice';
  note.textContent = '게임은 파일로 직접 열면 실행되지 않습니다. https://minari-kr.github.io/ 에서 열어 주세요.';
  document.querySelector('main').prepend(note);
}

// --- Prefetch -------------------------------------------------------------------------------------------------

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
if (!skipPrefetch) addEventListener('load', prefetchBuilds);
