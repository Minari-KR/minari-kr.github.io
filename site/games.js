// Game list. Add one object per game; order here = order on the page.
// thumb: picture in thumbs/ (16:9 is best)
// play:  a game folder's index.html (e.g. 'games/my-game/index.html') or an https link; '' hides the button
// video: an .mp4 in videos/ (plays in a popup) or an https link (opens a new tab); '' hides the button
// links: optional [{ label, url }] buttons: a page or PDF under docs/ (.html, .pdf) opens in the popup, a YouTube link plays in the video popup,
//        any other https link opens a new tab
window.GAMES = [
  {
    title: '쭉쭉냥 : 고양이 퍼즐',
    genre: '퍼즐',
    thumb: 'thumbs/zzukzzuk-nyang.webp',
    play: 'games/zzukzzuk-nyang/index.html',
    video: '',
    links: [
      { label: '개발 기술서', url: 'docs/zzukzzuk-nyang/dev-tech.pdf' },
      { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.minari.zzukzzuknyang' },
      { label: '영상', url: 'https://www.youtube.com/watch?v=BGQOpXTESr8' },
    ],
  },
];
