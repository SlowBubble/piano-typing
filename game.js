/*
Basic rule:
- Render the song in a canvas
  - The name on top left
  - Followed by each row of the keys (stripping out the "-")
- Highlight the first key
- When the user press the correct key on the keyboard (matching the highlighted key), move to the next key to highlight.
- When the user complete a song, display a row of confetti emojis, and wait 2 seconds and move on to the next song and repeat the steps above
- After reaching the end of the song list, render "Game Over".
More rules:
- Make sure if the key is pressed down, multiple keydown events will only trigger once
Changes:
- If the correct key is pressed, call simpleKeyboard.turnOn();
- If the incorrect key is pressed, utter `Press ${correctKey}` and call simpleKeyboard.turnOff();
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
  let waitingForSpace = true;

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

  function renderPressSpace() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Press space', 40, 80);
  }

  async function startSong() {
    waitingForSpace = false;
    keyIdx = 0;
    flatKeys = flattenKeys(songs[songIdx], sectionIdx);
    render();
    const utter1 = new window.SpeechSynthesisUtterance('Listen to this!');
    window.speechSynthesis.cancel();
    await new Promise(resolve => {
      utter1.onend = _ => {
        setTimeout(() => resolve(), 700);
      }
      utter1.onerror = resolve;
      window.speechSynthesis.speak(utter1);
    });
    await replay(songs[songIdx]);
    const utter2 = new window.SpeechSynthesisUtterance('Can you play it?');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter2);
    window.addEventListener('keydown', handleKey);
  }

  // Add navigation buttons
  function addNavButtons() {
    // Remove if already present
    let prevBtn = document.getElementById('prevSongBtn');
    let nextBtn = document.getElementById('nextSongBtn');
    if (prevBtn) prevBtn.remove();
    if (nextBtn) nextBtn.remove();

    prevBtn = document.createElement('button');
    prevBtn.id = 'prevSongBtn';
    prevBtn.textContent = '⟨ Prev Song';
    prevBtn.style.position = 'fixed';
    prevBtn.style.top = '20px';
    prevBtn.style.right = '180px';
    prevBtn.style.zIndex = 1000;
    prevBtn.style.fontSize = '24px';

    nextBtn = document.createElement('button');
    nextBtn.id = 'nextSongBtn';
    nextBtn.textContent = 'Next Song ⟩';
    nextBtn.style.position = 'fixed';
    nextBtn.style.top = '20px';
    nextBtn.style.right = '40px';
    nextBtn.style.zIndex = 1000;
    nextBtn.style.fontSize = '24px';

    prevBtn.onclick = () => {
      if (songIdx > 0) {
        songIdx--;
        sectionIdx = 0;
        keyIdx = 0;
        waitingForSpace = true;
        render();
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keydown', handleSpace);
        window.addEventListener('keydown', handleSpace);
      }
    };
    nextBtn.onclick = () => {
      if (songIdx < songs.length - 1) {
        songIdx++;
        sectionIdx = 0;
        keyIdx = 0;
        waitingForSpace = true;
        render();
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keydown', handleSpace);
        window.addEventListener('keydown', handleSpace);
      }
    };

    document.body.appendChild(prevBtn);
    document.body.appendChild(nextBtn);
  }

  function render() {
    addNavButtons();
    if (waitingForSpace) {
      renderPressSpace();
      return;
    }
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
      row.split(' ').filter(k => k !== '').forEach((k, cIdx) => {
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
      setTimeout(() => {
        showConfetti = true;
        render();
      }, 1000);
      setTimeout(() => {
        // Utter praise for the song
        if (typeof window.speechSynthesis !== "undefined") {
          const title = song.name.replace(/\s*\(.*?\)\s*$/, '');
          const exclamations = [
          'Bless my soul! ',
          'Bless my beard! ',
          'Bless my eye brows! ',
          'God bless the next generation! ',
          'Amazing effort! ',
          'What an effort! ',
          'I cannot commend you enough for your dedication! ',
          'No words can do justice to your work ethic! ',
          'Hard work really works! ',
          'Persistent practice really pays! ',
          'Practice really makes possible! ',
          'Mamma Mia! ',
          'Ay caramba! ',
          'Jesus! ',
          'Jesus Christ! ',
          'Oh, snap! ',
          'My god! ',
          'Holy Moly! ',
          'Woo Hoo! ',
          'Am I in a dream? ',
          'Is this real? ',
          'This is surreal! ',
          'Are my eyes fooling me? ',
          'How did you do that? ',
          'Did you hear my jaw dropping! ',
          'I am speechless! ',
          'I do not know what to say! ',
          'That is so cool! ',
          'Brilliant achievement! ',
          'Astounding feat! ',
          'Fabulous job! ',
          'Fantastic work! ',
          'Oh my god! ',
          'Oh my lord! ',
          'My goodness! ',
          'Goodness gracious! ',
          'Well done! ',
          'Way to go! ',
          'Awesome work! ',
          'Great job! ',
        ];
          const intros = [
            'What a',
            'This is such a',
            'That is such a',
          ]
          const adjectives = [
            'beautiful',
            'stunning',
            'powerful',
            'moving',
            'inspiring',
            'touching',
            'brilliant',
            'captivating',
            'elegant',
            'graceful',
            'majestic',
            'soulful',
            'enchanting',
            'delightful',
            'radiant',
            'expressive',
            'vivid',
            'charming',
            'heartfelt',
            'flamboyant',
            'uplifting',
            'surreal',
            'joyful',
            'impressive',
            'exquisite',
          ];
          const nouns = [
            'rendition',
            'rendition',
            'rendition',
            'performance',
            'performance',
            'performance',
            'interpretation',
            'interpretation',
            'arrangement',
            'delivery',
            'delivery',
            'delivery',
            'take',
          ];

          // pick randomly from adjectives, nouns and verbs
          function pickRandom(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
          }
          const exclamation = pickRandom(exclamations);
          const intro = pickRandom(intros);
          const adj = pickRandom(adjectives);
          const noun = pickRandom(nouns);
          const praise = `${exclamation} ${intro} ${adj} ${noun} of ${title}!`;
          const utter = new window.SpeechSynthesisUtterance(praise);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      }, 1500);
      setTimeout(() => {
        showConfetti = false;
        render();
      }, 5000);
      setTimeout(() => {
        // Move to next song
        songIdx++;
        sectionIdx = 0;
        if (songIdx >= songs.length) {
          gameOver = true;
          render();
          return;
        }
        waitingForSpace = true;
        render();
        window.addEventListener('keydown', handleSpace);
      }, 5000);
      return;
    }
    // Move to next section immediately (no confetti, no wait)
    keyIdx = 0;
    flatKeys = flattenKeys(songs[songIdx], sectionIdx);
    render();
    window.addEventListener('keydown', handleKey);
  }

  let pressedKeys = {};
  let isUttering = false;

  function handleKey(e) {
    if (gameOver) return;
    if (isUttering) return;
    if (pressedKeys[e.code]) return; // Ignore repeat while held
    pressedKeys[e.code] = true;
    if (!flatKeys[keyIdx]) return;
    const correctKey = flatKeys[keyIdx].key;
    if (e.key === correctKey) {
      if (typeof simpleKeyboard !== "undefined" && simpleKeyboard.turnOn) {
        simpleKeyboard.turnOn();
      }
      keyIdx++;
      if (keyIdx >= flatKeys.length) {
        // Section complete
        window.removeEventListener('keydown', handleKey);
        nextSectionOrSong();
        return;
      }
      render();
    } else if (!e.ctrlKey && !e.metaKey) {
      if (typeof simpleKeyboard !== "undefined" && simpleKeyboard.turnOff) {
        simpleKeyboard.turnOff();
      }
      if (typeof window.speechSynthesis !== "undefined") {
        isUttering = true;
        const utter = new window.SpeechSynthesisUtterance(`Press ${correctKey}`);
        window.speechSynthesis.cancel();
        utter.onend = () => {
          isUttering = false;
          simpleKeyboard.turnOn();
        };
        utter.onerror = () => {
          isUttering = false;
          simpleKeyboard.turnOn();
        };
        window.speechSynthesis.speak(utter);
      }
    }
  }

  function handleKeyUp(e) {
    pressedKeys[e.code] = false;
  }

  function handleSpace(e) {
    if (e.code === 'Space' || e.key === ' ') {
      window.removeEventListener('keydown', handleSpace);
      startSong();
    }
  }

  // Start first song, first section
  sectionIdx = 0;
  keyIdx = 0;
  waitingForSpace = true;
  render();
  window.addEventListener('keydown', handleSpace);
  window.addEventListener('keyup', handleKeyUp);
}



runGame();
