/*
Game rule:
- Render the song in a canvas
  - The name on top left
  - Followed by each row of the keys (stripping out the "-")
- Highlight the first key
- When the user press the correct key on the keyboard (matching the highlighted key), move to the next key to highlight.
- When the user complete a song, display a row of confetti emojis, and wait 2 seconds and move on to the next song and repeat the steps above
- After reaching the end of the song list, render "Game Over".
Change:
- Make sure if the key is pressed down, multiple keydown events will only trigger once
*/
function runGame() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let songIdx = 0;
  let keyIdx = 0;
  let flatKeys = [];
  let gameOver = false;
  let showConfetti = false;
  let sectionIdx = 0;

  function flattenKeys(song, sectionIdx) {
    // Returns array of {row, col, key} for the current section
    const arr = [];
    const section = song.keys[sectionIdx];
    section.forEach((row, rIdx) => {
      row.split(' ').forEach((k, cIdx) => {
        if (k !== '-') arr.push({ row: rIdx, col: cIdx, key: k });
      });
    });
    return arr;
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameOver) {
      ctx.font = '80px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText('Game Over', 400, 300);
      return;
    }
    const song = songs[songIdx];
    ctx.font = '48px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(song.name, 40, 80);

    ctx.font = '60px monospace';
    // Render only the current section
    let section = song.keys[sectionIdx];
    if (!section) {
      section = song.keys[song.keys.length - 1];
    }
    section.forEach((row, rIdx) => {
      let y = 240 + rIdx * 96;
      let x = 120;
      row.split(' ').forEach((k, cIdx) => {
        let highlight = false;
        if (!gameOver && flatKeys[keyIdx] && flatKeys[keyIdx].row === rIdx && flatKeys[keyIdx].col === cIdx) {
          highlight = true;
        }
        if (k !== '-') {
          ctx.fillStyle = highlight ? 'red' : 'black';
          ctx.fillText(k, x, y);
        } else {
          ctx.fillStyle = 'gray';
          ctx.fillText('-', x, y);
        }
        x += 120;
      });
    });

    if (showConfetti) {
      ctx.font = '120px serif';
      ctx.fillStyle = 'orange';
      ctx.fillText('🎉 🎉 🎉 🎉', 180, 210 + section.length * 96);
    }
  }

  function nextSectionOrSong() {
    showConfetti = false;
    const song = songs[songIdx];
    sectionIdx++;
    if (sectionIdx >= song.keys.length) {
      // Only show confetti and wait between songs
      showConfetti = true;
      render();
      setTimeout(() => {
        showConfetti = false;
        render();
      }, 1200);
      setTimeout(() => {
        // Move to next song
        songIdx++;
        sectionIdx = 0;
        if (songIdx >= songs.length) {
          gameOver = true;
          render();
          return;
        }
        keyIdx = 0;
        flatKeys = flattenKeys(songs[songIdx], sectionIdx);
        render();
        window.addEventListener('keydown', handleKey);
      }, 1500);
      return;
    }
    // Move to next section immediately (no confetti, no wait)
    keyIdx = 0;
    flatKeys = flattenKeys(songs[songIdx], sectionIdx);
    render();
    window.addEventListener('keydown', handleKey);
  }

  let pressedKeys = {};

  function handleKey(e) {
    if (gameOver) return;
    if (pressedKeys[e.code]) return; // Ignore repeat while held
    pressedKeys[e.code] = true;
    const song = songs[songIdx];
    if (!flatKeys[keyIdx]) return;
    if (e.key === flatKeys[keyIdx].key) {
      keyIdx++;
      if (keyIdx >= flatKeys.length) {
        // Section complete
        window.removeEventListener('keydown', handleKey);
        nextSectionOrSong();
        return;
      }
      render();
    }
  }

  function handleKeyUp(e) {
    pressedKeys[e.code] = false;
  }

  // Start first song, first section
  sectionIdx = 0;
  keyIdx = 0;
  flatKeys = flattenKeys(songs[songIdx], sectionIdx);
  render();
  window.addEventListener('keydown', handleKey);
  window.addEventListener('keyup', handleKeyUp);
}

const songs = [
  {
    name: 'Mary Had a Little Lamb (short)',
    keys: [
      [
        '3 2 1 2',
        '3 3 3 3',
        '2 2 3 2',
        '1 - - -',
      ],
    ],
  },
  {
    name: 'Twinkle Twinkle Little Star (short)',
    keys: [
      [
        '1 1 5 5',
        '6 6 5 -',
        '4 4 3 3',
        '2 2 1 -',
      ],
    ],
  },
  {
    name: 'Jingle Bells (short)',
    keys: [
      [
        '3 3 3 -',
        '3 3 3 -',
        '3 5 1 2',
        '3 - - -',
        '4 4 4 4',
        '4 3 3 3',
        '5 5 4 2',
        '1 - - -',
      ],
    ],
  },
  {
    name: 'Shall We Talk (short)',
    keys: [
      [
        '1 - 3 -',
        '5 - - 5',
        '6 7 8 6',
        '5 - - 5',
        '6 7 8 9',
        '8 5 3 1',
        '3 - - 2',
        '1 - - -',
      ],
    ],
  },
  {
    name: 'Mary Had a Little Lamb',
    keys: [
      [
        '3 2 1 2',
        '3 3 3 -',
        '2 2 2 -',
        '3 5 5 -',
      ],
      [
        '3 2 1 2',
        '3 3 3 3',
        '2 2 3 2',
        '1 - - -',
      ],
    ],
  },
  {
    name: 'Twinkle Twinkle Little Star',
    keys: [
      [
        '1 1 5 5',
        '6 6 5 -',
        '4 4 3 3',
        '2 2 1 -',
      ],
      [
        '5 5 4 4',
        '3 3 2 -',
        '5 5 4 4',
        '3 3 2 -',
      ],
      [
        '1 1 5 5',
        '6 6 5 -',
        '4 4 3 3',
        '2 2 1 -',
      ],
    ],
  },
  {
    name: 'Jingle Bells',
    keys: [
      [
        '3 3 3 -',
        '3 3 3 -',
        '3 5 1 2',
        '3 - - -',
        '4 4 4 4',
        '4 3 3 3',
        '3 2 2 3',
        '2 - 5 -',
      ],
      [
        '3 3 3 -',
        '3 3 3 -',
        '3 5 1 2',
        '3 - - -',
        '4 4 4 4',
        '4 3 3 3',
        '5 5 4 2',
        '1 - - -',
      ],
    ],
  },
];

runGame();
