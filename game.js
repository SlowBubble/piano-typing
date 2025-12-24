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
let doReMiMode = false;
let songIdx = 0;
let challengeMode = false;

function getConfigFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  const params = {};
  hash.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) params[k] = v;
  });
  return params;
}

function setConfigToHash() {
  const params = [];
  if (doReMiMode) params.push('doReMi=1');
  if (challengeMode) params.push('challenge=1');
  if (songIdx > 0) params.push('songIdx=' + songIdx);
  window.location.hash = params.join('&');
}

function runGame() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Create finger display canvas
  const fingerCanvas = document.createElement('canvas');
  fingerCanvas.width = 600; // 50% bigger (was 400)
  fingerCanvas.height = 180; // 50% bigger (was 120)
  fingerCanvas.style.position = 'fixed';
  fingerCanvas.style.bottom = '20px';
  fingerCanvas.style.left = '50%';
  fingerCanvas.style.transform = 'translateX(-50%)';
  fingerCanvas.style.zIndex = '1000';
  fingerCanvas.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  fingerCanvas.style.border = '2px solid #333';
  fingerCanvas.style.borderRadius = '10px';
  document.body.appendChild(fingerCanvas);
  const fingerCtx = fingerCanvas.getContext('2d');

  let keyIdx = 0;
  let flatKeys = [];
  let gameOver = false;
  let showConfetti = false;
  let sectionIdx = 0;
  let waitingForSpace = true;
  let keyPressed = false; // Track if current key has been pressed
  let anyKeyDown = false; // Track if any key is physically held down
  let demoHandPosition = null; // Track the demo's final hand position
  let songCompleted = false; // Flag to track when song is completed
  let demoInProgress = false; // Flag to track when demo is playing

  function flattenKeys(song, sectionIdx) {
    // Returns array of {row, col, key, fingering} for the current section
    const arr = [];
    const section = song.keys[sectionIdx];
    
    // Calculate the starting row index in the fingering array
    let fingeringRowOffset = 0;
    for (let i = 0; i < sectionIdx; i++) {
      fingeringRowOffset += song.keys[i].length;
    }
    
    section.forEach((row, rIdx) => {
      row.split(' ').forEach((k, cIdx) => {
        if (k !== '_') {
          let fingering = null;
          // Get fingering if available - use correct row index
          const fingeringRowIdx = fingeringRowOffset + rIdx;
          if (song.fingering && song.fingering[fingeringRowIdx]) {
            const fingeringRow = song.fingering[fingeringRowIdx].split(' ');
            if (fingeringRow[cIdx] && fingeringRow[cIdx] !== '_') {
              fingering = fingeringRow[cIdx];
            }
          }
          arr.push({ row: rIdx, col: cIdx, key: k, fingering: fingering });
        }
      });
    });
    return arr;
  }

  // Function to get column position for a key
  function getKeyColumn(key) {
    const keyColumns = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, 
      '6': 5, '7': 6, '8': 7, '9': 8, '0': 9
    };
    return keyColumns[key] !== undefined ? keyColumns[key] : -1;
  }

  function renderFingers() {
    fingerCtx.clearRect(0, 0, fingerCanvas.width, fingerCanvas.height);
    
    console.log('renderFingers called - keyIdx:', keyIdx, 'flatKeys.length:', flatKeys.length, 'waitingForSpace:', waitingForSpace, 'gameOver:', gameOver, 'songCompleted:', songCompleted);
    
    // Only show fingers if current song has fingering data and we're not waiting for space
    const song = songs[songIdx];
    if (!song.fingering || waitingForSpace || gameOver || songCompleted) {
      console.log('Early return: no fingering, waiting for space, game over, or song completed');
      return;
    }

    // Don't show anything if we've reached the end of the song
    if (keyIdx >= flatKeys.length) {
      console.log('Early return: reached end of song');
      return;
    }

    // Get current fingering - show hand but control highlighting based on key state
    let currentFingering = null;
    let currentKey = null;
    let showHighlighting = true;
    
    if (flatKeys[keyIdx] && flatKeys[keyIdx].fingering) {
      currentFingering = parseInt(flatKeys[keyIdx].fingering);
      currentKey = flatKeys[keyIdx].key;
      // Remove highlighting when any key is down or when correct key was pressed
      showHighlighting = !anyKeyDown && !keyPressed;
    }

    // Draw keyboard columns (1,2,3,4,5,6,7,8,9,0)
    const columnWidth = 50;
    const startX = 50;
    const columnY = 20;
    
    fingerCtx.strokeStyle = '#ccc';
    fingerCtx.lineWidth = 1;
    fingerCtx.fillStyle = '#666';
    fingerCtx.font = '16px Arial';
    fingerCtx.textAlign = 'center';
    
    for (let i = 0; i < 10; i++) {
      const x = startX + i * columnWidth;
      const label = i === 9 ? '0' : (i + 1).toString();
      
      // Draw column separator line (dividing numbers and extending down) - 60% length
      if (i > 0) {
        const lineStart = 0; // Start from top to divide numbers
        const lineEnd = columnY + 20 + (fingerCanvas.height - 40) * 0.6; // 60% length from original start
        fingerCtx.beginPath();
        fingerCtx.moveTo(x, lineStart);
        fingerCtx.lineTo(x, lineEnd);
        fingerCtx.stroke();
      }
      
      // Draw column label at the top
      fingerCtx.fillText(label, x + columnWidth/2, 15);
    }

    // Draw horizontal line to cap off the column separators
    const capY = columnY + 20 + (fingerCanvas.height - 40) * 0.6;
    fingerCtx.beginPath();
    fingerCtx.moveTo(startX + columnWidth, capY); // Start after first column
    fingerCtx.lineTo(startX + 9 * columnWidth, capY); // End before last column
    fingerCtx.stroke();

    // Draw black rectangles like piano black keys between adjacent keys
    // Skip between 3,4 and 7,8 (like E-F and B-C on piano)
    fingerCtx.fillStyle = '#333';
    const blackKeyPositions = [1, 2, 4, 5, 6, 8, 9]; // After keys 1,2,4,5,6,8,9
    
    // Calculate where black keys should end (above the tallest finger)
    const handCenterY = fingerCanvas.height - 20;
    const tallestFingerHeight = 105; // Middle finger height
    const blackKeyBottom = Math.max(30, handCenterY - tallestFingerHeight - 10); // 10px gap above fingers, minimum 30px
    
    blackKeyPositions.forEach(pos => {
      const blackKeyX = startX + pos * columnWidth - 10;
      fingerCtx.fillRect(blackKeyX, 0, 20, blackKeyBottom);
    });

    // Draw the hand if we have fingering data
    const shouldDrawHand = (currentKey && currentFingering);
    
    if (shouldDrawHand) {
      // Calculate hand position based on current key
      let handCenterX = fingerCanvas.width / 2; // Default center
      
      if (currentKey && currentFingering) {
        // Calculate position based on current key
        const keyColumn = getKeyColumn(currentKey);
        if (keyColumn !== -1) {
          const targetColumnX = startX + keyColumn * columnWidth + columnWidth/2;
          // Position hand so the highlighted finger aligns with the target column
          const fingerOffsets = [-105, -52.5, -18, 18, 52.5]; // Relative to hand center
          const highlightedFingerOffset = fingerOffsets[currentFingering - 1];
          handCenterX = targetColumnX - highlightedFingerOffset;
          console.log('Calculated position for key', currentKey, 'finger', currentFingering, ':', handCenterX);
        }
      }
      
      const handCenterY = fingerCanvas.height - 20; // Position fingers at bottom

      // Helper function to draw rounded rectangle
      function drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      }

      // Finger positions and sizes (50% bigger) - thumb is much shorter
      const fingers = [
        { x: handCenterX - 105, y: handCenterY, width: 27, height: 45, angle: -0.3 }, // Thumb (1) - much shorter (was 60)
        { x: handCenterX - 52.5, y: handCenterY, width: 24, height: 90, angle: 0 },   // Index (2) - 50% bigger
        { x: handCenterX - 18, y: handCenterY, width: 24, height: 105, angle: 0 },    // Middle (3) - 50% bigger
        { x: handCenterX + 18, y: handCenterY, width: 24, height: 90, angle: 0 },     // Ring (4) - 50% bigger
        { x: handCenterX + 52.5, y: handCenterY, width: 21, height: 82.5, angle: 0 } // Pinky (5) - 50% bigger
      ];

      for (let i = 0; i < 5; i++) {
        const finger = fingers[i];
        const fingerNum = i + 1;
        const isHighlighted = showHighlighting && (currentFingering === fingerNum);
        
        fingerCtx.save();
        fingerCtx.translate(finger.x, finger.y);
        fingerCtx.rotate(finger.angle);
        
        // Draw finger
        fingerCtx.fillStyle = isHighlighted ? '#ff6b6b' : '#f4c2a1';
        drawRoundedRect(fingerCtx, -finger.width/2, -finger.height, finger.width, finger.height, 8);
        fingerCtx.fill();
        
        // Draw finger border
        fingerCtx.strokeStyle = isHighlighted ? '#d63031' : '#d4a574';
        fingerCtx.lineWidth = 2;
        drawRoundedRect(fingerCtx, -finger.width/2, -finger.height, finger.width, finger.height, 8);
        fingerCtx.stroke();
        
        // Draw fingertip
        fingerCtx.fillStyle = isHighlighted ? '#ff5252' : '#e8b896';
        fingerCtx.beginPath();
        fingerCtx.ellipse(0, -finger.height + 12, finger.width/2 - 3, 12, 0, 0, 2 * Math.PI); // 50% bigger
        fingerCtx.fill();
        
        fingerCtx.restore();
      }
    }
  }

  function renderPressSpace() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Press space', 40, 80);
    // Show upcoming song name
    ctx.font = '36px Arial';
    ctx.fillStyle = 'gray';
    ctx.fillText(songs[songIdx].name, 40, 140);
  }

  async function startSong() {
    waitingForSpace = false;
    keyIdx = 0;
    keyPressed = false; // Reset key pressed state
    anyKeyDown = false; // Reset any key down state
    pressedKeys = {}; // Reset pressed keys tracking
    demoHandPosition = null; // Reset demo hand position
    songCompleted = false; // Reset song completed flag
    demoInProgress = false; // Reset demo flag
    flatKeys = flattenKeys(songs[songIdx], sectionIdx);
    // Only render the "Press space" screen until replay is finished
    renderPressSpace();
    const utter1 = new window.SpeechSynthesisUtterance('Listen to this!');
    window.speechSynthesis.cancel();
    await new Promise(resolve => {
      utter1.onend = _ => {
        setTimeout(() => resolve(), 700);
      }
      utter1.onerror = resolve;
      window.speechSynthesis.speak(utter1);
    });
    demoInProgress = true; // Demo starting
    const finalHandPosition = await replay(songs[songIdx], {doReMiMode: doReMiMode, fingerCtx: fingerCtx, fingerCanvas: fingerCanvas, flatKeys: flatKeys});
    demoInProgress = false; // Demo finished
    demoHandPosition = finalHandPosition; // Store the demo's final hand position
    console.log('Demo finished, final hand position:', finalHandPosition);
    console.log('First user note - keyIdx:', keyIdx, 'flatKeys[0]:', flatKeys[0]);
    
    // Render the main canvas with the song keys AND the first note fingering
    render();
    
    const utter2 = new window.SpeechSynthesisUtterance('Can you play it?');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter2);
    // Event listener is already set up globally
  }

  // Add navigation buttons and challenge/DoReMi checkboxes
  function addNavButtons() {
    // Remove if already present
    let prevBtn = document.getElementById('prevSongBtn');
    let nextBtn = document.getElementById('nextSongBtn');
    let challengeBox = document.getElementById('challengeCheckbox');
    let challengeLabel = document.getElementById('challengeLabel');
    let doReMiBox = document.getElementById('doReMiCheckbox');
    let doReMiLabel = document.getElementById('doReMiLabel');
    if (prevBtn) prevBtn.remove();
    if (nextBtn) nextBtn.remove();
    if (challengeBox) challengeBox.remove();
    if (challengeLabel) challengeLabel.remove();
    if (doReMiBox) doReMiBox.remove();
    if (doReMiLabel) doReMiLabel.remove();

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

    challengeBox = document.createElement('input');
    challengeBox.type = 'checkbox';
    challengeBox.id = 'challengeCheckbox';
    challengeBox.style.position = 'fixed';
    challengeBox.style.top = '70px';
    challengeBox.style.right = '40px';
    challengeBox.style.zIndex = 1000;
    challengeBox.style.transform = 'scale(1.5)';
    challengeBox.checked = challengeMode;

    challengeLabel = document.createElement('label');
    challengeLabel.id = 'challengeLabel';
    challengeLabel.htmlFor = 'challengeCheckbox';
    challengeLabel.textContent = 'Challenge';
    challengeLabel.style.position = 'fixed';
    challengeLabel.style.top = '70px';
    challengeLabel.style.right = '80px';
    challengeLabel.style.zIndex = 1000;
    challengeLabel.style.fontSize = '24px';

    doReMiBox = document.createElement('input');
    doReMiBox.type = 'checkbox';
    doReMiBox.id = 'doReMiCheckbox';
    doReMiBox.style.position = 'fixed';
    doReMiBox.style.top = '110px';
    doReMiBox.style.right = '40px';
    doReMiBox.style.zIndex = 1000;
    doReMiBox.style.transform = 'scale(1.5)';
    doReMiBox.checked = doReMiMode;

    doReMiLabel = document.createElement('label');
    doReMiLabel.id = 'doReMiLabel';
    doReMiLabel.htmlFor = 'doReMiCheckbox';
    doReMiLabel.textContent = 'Do Re Mi';
    doReMiLabel.style.position = 'fixed';
    doReMiLabel.style.top = '110px';
    doReMiLabel.style.right = '80px';
    doReMiLabel.style.zIndex = 1000;
    doReMiLabel.style.fontSize = '24px';

    prevBtn.onclick = () => {
      if (songIdx > 0) {
        songIdx--;
        sectionIdx = 0;
        keyIdx = 0;
        waitingForSpace = true;
        challengeMode = challengeBox.checked;
        doReMiMode = doReMiBox.checked;
        setConfigToHash();
        render();
        // Event listener is already set up globally
      }
    };
    nextBtn.onclick = () => {
      if (songIdx < songs.length - 1) {
        songIdx++;
        sectionIdx = 0;
        keyIdx = 0;
        waitingForSpace = true;
        challengeMode = challengeBox.checked;
        doReMiMode = doReMiBox.checked;
        setConfigToHash();
        render();
        // Event listener is already set up globally
      }
    };
    challengeBox.onchange = () => {
      challengeMode = challengeBox.checked;
      setConfigToHash();
      render();
    };
    doReMiBox.onchange = () => {
      doReMiMode = doReMiBox.checked;
      setConfigToHash();
      render();
    };

    document.body.appendChild(prevBtn);
    document.body.appendChild(nextBtn);
    document.body.appendChild(challengeBox);
    document.body.appendChild(challengeLabel);
    document.body.appendChild(doReMiBox);
    document.body.appendChild(doReMiLabel);
  }

  function render() {
    console.log('render() called - waitingForSpace:', waitingForSpace, 'demoHandPosition:', demoHandPosition);
    addNavButtons();
    if (waitingForSpace) {
      renderPressSpace();
      renderFingers();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameOver) {
      ctx.font = '80px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText('Game Over', 400, 300);
      renderFingers();
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
        let played = false;
        if (!gameOver && flatKeys[keyIdx] && flatKeys[keyIdx].row === rIdx && flatKeys[keyIdx].col === cIdx) {
          highlight = true;
          console.log('Highlighting key at row:', rIdx, 'col:', cIdx, 'key:', k, 'keyIdx:', keyIdx);
        }
        // In challenge mode, only show keys that have been played or are currently highlighted
        if (challengeMode) {
          // Find the index of this key in flatKeys
          const idx = flatKeys.findIndex(obj => obj.row === rIdx && obj.col === cIdx);
          played = idx > -1 && idx < keyIdx;
          if (k !== '_' && played) {
            ctx.fillStyle = 'black';
            ctx.fillText(k, x, y);
          } else if (k === '_' && played) {
            ctx.fillStyle = 'gray';
            ctx.fillText('_', x, y);
          } else {
            // Don't render unplayed keys
          }
        } else {
          if (k !== '_') {
            ctx.fillStyle = highlight ? 'red' : 'black';
            ctx.fillText(k, x, y);
          } else {
            ctx.fillStyle = 'gray';
            ctx.fillText('_', x, y);
          }
        }
        x += 120;
      });
    });

    if (showConfetti) {
      ctx.font = '120px serif';
      ctx.fillStyle = 'orange';
      ctx.fillText('🎉 🎉 🎉 🎉', 180, 210 + (song.keys[sectionIdx] || song.keys[song.keys.length - 1]).length * 96);
    }
    
    // Render fingers
    renderFingers();
  }

  function nextSectionOrSong() {
    showConfetti = false;
    const song = songs[songIdx];
    sectionIdx++;
    if (sectionIdx >= song.keys.length) {
      // Song completed - set flag and hide fingers immediately
      songCompleted = true;
      fingerCtx.clearRect(0, 0, fingerCanvas.width, fingerCanvas.height);
      
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
            'What',
            'This is such',
            'That is such',
          ]
            const adjectives = [
            'a beautiful',
            'a splendid',
            'a stunning',
            'a powerful',
            'an inspiring',
            'a moving',
            'a touching',
            'a brilliant',
            'a captivating',
            'an elegant',
            'a graceful',
            'a majestic',
            'a soulful',
            'an enchanting',
            'a delightful',
            'an expressive',
            'a vivid',
            'a charming',
            'a heartfelt',
            'an amazing',
            'an awesome',
            'a masterful',
            'a surreal',
            'an impressive',
            'an exquisite',
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
        songCompleted = false; // Reset for next song
        if (songIdx >= songs.length) {
          gameOver = true;
          render();
          return;
        }
        waitingForSpace = true;
        render();
        // Event listener is already set up globally
      }, 5000);
      return;
    }
    // Move to next section immediately (no confetti, no wait)
    keyIdx = 0;
    keyPressed = false; // Reset key pressed state for new section
    songCompleted = false; // Reset for new section
    flatKeys = flattenKeys(songs[songIdx], sectionIdx);
    render();
    // Event listener is already set up globally
  }

  let pressedKeys = {};
  let isUttering = false;

  function handleKey(e) {
    if (gameOver) return;
    if (isUttering) return;
    if (pressedKeys[e.code]) return; // Ignore repeat while held
    pressedKeys[e.code] = true;
    anyKeyDown = true; // Mark that a key is down
    
    if (!flatKeys[keyIdx]) return;
    const correctKey = flatKeys[keyIdx].key;
    // Use Do Re Mi mode if checked
    const speakKey = doReMiMode ? simplifyCharToDoReMi(correctKey) : simplifyCharTo123(correctKey);
    if (e.key === correctKey) {
      // Mark key as pressed but don't advance yet
      keyPressed = true;
      // Render to remove highlighting but keep hand in same position (only if not during demo)
      if (!demoInProgress) {
        renderFingers();
      }
      
      // Utter the key out loud
      if (typeof window.speechSynthesis !== "undefined") {
        const utter = new window.SpeechSynthesisUtterance(speakKey);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
      if (typeof simpleKeyboard !== "undefined" && simpleKeyboard.turnOn) {
        simpleKeyboard.turnOn();
      }
    }
  }

  function handleKeyUp(e) {
    pressedKeys[e.code] = false;
    // Check if any keys are still pressed
    anyKeyDown = Object.values(pressedKeys).some(pressed => pressed);
    
    // If the correct key was pressed and is now released, advance to next key
    if (keyPressed && flatKeys[keyIdx] && e.key === flatKeys[keyIdx].key) {
      console.log('Advancing from keyIdx:', keyIdx, 'to:', keyIdx + 1, 'flatKeys.length:', flatKeys.length);
      // Clear demo hand position once user starts playing
      if (keyIdx === 0) {
        demoHandPosition = null;
      }
      
      keyIdx++;
      if (keyIdx >= flatKeys.length) {
        // Section complete
        nextSectionOrSong();
        return;
      }
      // Reset keyPressed for next key
      keyPressed = false;
      console.log('New keyIdx:', keyIdx, 'next key:', flatKeys[keyIdx] ? flatKeys[keyIdx].key : 'none');
      
      // Force a render to update the main canvas highlighting
      render();
    }
    
    // Re-render to update hand position and highlighting
    if (!waitingForSpace && !gameOver && !demoInProgress) {
      renderFingers();
    }
  }

  function handleAllKeyDown(e) {
    anyKeyDown = true;
    // Re-render to update hand highlighting when any key is pressed, but not during demo
    if (!waitingForSpace && !gameOver && !demoInProgress) {
      renderFingers();
    }
    
    // Handle space key when waiting
    if (waitingForSpace && (e.code === 'Space' || e.key === ' ')) {
      startSong();
      return;
    }
    
    // Handle game keys when playing
    if (!waitingForSpace) {
      handleKey(e);
    }
  }

  // Start first song, first section
  sectionIdx = 0;
  keyIdx = 0;
  waitingForSpace = true;
  render();
  window.addEventListener('keydown', handleAllKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

// Read config from URL hash
(function initFromHash() {
  const params = getConfigFromHash();
  doReMiMode = params.doReMi === '1';
  challengeMode = params.challenge === '1';
  if (params.songIdx && !isNaN(params.songIdx)) {
    songIdx = Math.max(0, Math.min(songs.length - 1, parseInt(params.songIdx, 10)));
  }
})();

runGame();

