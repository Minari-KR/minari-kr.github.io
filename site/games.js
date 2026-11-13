// Game list. Add one object per game; order here = order on the page.
// thumb: picture in thumbs/ (16:9 is best)
// play:  a game folder's index.html (e.g. 'games/my-game/index.html') or an https link; '' hides the button
// video: an .mp4 in videos/ (plays in a popup) or an https link (opens a new tab); '' hides the button
// links: optional [{ label, url }] document buttons (https, new tab), e.g. a design doc on GitHub
window.GAMES = [
  {
    title: 'Chicken Fire',
    genre: '아레나 생존',
    thumb: 'thumbs/chicken-fire.webp',
    play: 'games/chicken-fire/index.html',
    video: '',
  },
  {
    title: 'ERZZ',
    genre: '3인칭 액션',
    thumb: 'thumbs/erzz.webp',
    play: 'games/erzz/index.html',
    video: '',
  },
  {
    title: '쭉쭉냥 : 고양이 퍼즐',
    genre: '퍼즐',
    thumb: 'thumbs/zzukzzuk-nyang.webp',
    play: 'games/zzukzzuk-nyang/index.html',
    video: '',
    links: [
      { label: '기획서', url: 'https://github.com/Minari-KR/minari-kr.github.io/blob/main/docs/zzukzzuk-nyang/game-design.md' },
      { label: '리소스 문서', url: 'https://github.com/Minari-KR/minari-kr.github.io/raw/main/docs/zzukzzuk-nyang/zzukzzuk-nyang-resources.xlsx' },
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
