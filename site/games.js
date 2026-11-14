// Game list. Add one object per game; order here = order on the page.
// thumb: picture in thumbs/ (16:9 is best)
// play:  a game folder's index.html (e.g. 'games/my-game/index.html') or an https link; '' hides the button
// video: an .mp4 in videos/ (plays in a popup) or an https link (opens a new tab); '' hides the button
// links: optional [{ label, url }] buttons: a page under docs/ (.html) opens in the popup, a YouTube link plays in the video popup,
//        any other https link opens a new tab
window.GAMES = [
  {
    title: 'Chicken Fire',
    genre: '타임어택 슈팅',
    thumb: 'thumbs/chicken-fire.webp',
    play: 'games/chicken-fire/index.html',
    video: '',
    links: [
      { label: '기획서', url: 'docs/chicken-fire/gdd.html' },
    ],
  },
  {
    title: '쭉쭉냥 : 고양이 퍼즐',
    genre: '퍼즐',
    thumb: 'thumbs/zzukzzuk-nyang.webp',
    play: 'games/zzukzzuk-nyang/index.html',
    video: '',
    links: [
      { label: '기획서', url: 'docs/zzukzzuk-nyang/deck.html' },
      { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.minari.zzukzzuknyang' },
      { label: '영상', url: 'https://www.youtube.com/watch?v=BGQOpXTESr8' },
    ],
  },
  {
    title: 'Rio Simulation',
    genre: '캐릭터 교류',
    thumb: 'thumbs/rio-idle.webp',
    play: 'games/rio-idle/index.html',
    video: '',
  },
];
