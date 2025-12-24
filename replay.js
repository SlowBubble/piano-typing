const charToNoteNum = {
  '`': 59,      // 47+12
  1: 60,        // 48+12
  'q': 61,
  2: 62,
  'w': 63,
  3: 64,
  4: 65,
  'r': 66,
  5: 67,
  't': 68,
  6: 69,
  'y': 70,
  7: 71,
  8: 72,
  'i': 73,
  9: 74,
  'o': 75,
  0: 76,
  '-': 77,
  '[': 78,
  '=': 79,
  // Extended lower notes
  Tab: 58,
  a: 57,
  z: 56,
  s: 55,
  x: 54,
  d: 53,
  f: 52,
  v: 51,
  g: 50,
  b: 49,
  h: 48,
  j: 47,
  m: 46,
  k: 45,
  ',': 44,
  l: 43,
  '.': 42,
  ';': 41,
  "'": 40,
}


/*
Given an item from songs, play each note
- use charToNoteNum
- $(window).trigger('keyboardDown', {
  time: new Date().getTime(),
  noteNumber: noteNumber,
  channel: 0,
  velocity: 120,
  });
  - When triggering the next keyboardDown, remember to trigger keyboardUp for the previous note
  - Each note should last 400ms
  - don't trigger anything for '-', but should still have the same duration as a note
  - If song.swing > 0, then use noteDurMs * song.swing for the even notes' duration.
  Change:
  - Utter the character the same time we play the note.
  */
 function replay(song, opts = {}) {
  const noteDurMs = song.noteDurMs || 500;
  const doReMiMode = opts.doReMiMode || false;
  const fingerCtx = opts.fingerCtx;
  const fingerCanvas = opts.fingerCanvas;
  const flatKeys = opts.flatKeys;

  // Helper function to draw rounded rectangle (same as in game.js)
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

  // Function to get column position for a key
  function getKeyColumn(key) {
    const keyColumns = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, 
      '6': 5, '7': 6, '8': 7, '9': 8, '0': 9
    };
    return keyColumns[key] !== undefined ? keyColumns[key] : -1;
  }

  // Function to render fingers during demo
  function renderDemoFingers(currentFingering, currentIdx, previousHandPosition) {
    if (!fingerCtx || !fingerCanvas || !song.fingering) {
      return null;
    }

    fingerCtx.clearRect(0, 0, fingerCanvas.width, fingerCanvas.height);

    // Get current key
    let currentKey = null;
    if (flatKeys && flatKeys[currentIdx]) {
      currentKey = flatKeys[currentIdx].key;
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

    // Calculate hand position based on current key
    let handCenterX = previousHandPosition || (fingerCanvas.width / 2); // Use previous position or default center
    if (currentKey && currentFingering) {
      const keyColumn = getKeyColumn(currentKey);
      if (keyColumn !== -1) {
        const targetColumnX = startX + keyColumn * columnWidth + columnWidth/2;
        // Position hand so the highlighted finger aligns with the target column
        const fingerOffsets = [-105, -52.5, -18, 18, 52.5]; // Relative to hand center
        const highlightedFingerOffset = fingerOffsets[currentFingering - 1];
        handCenterX = targetColumnX - highlightedFingerOffset;
      }
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
      const isHighlighted = currentFingering === fingerNum;
      
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
    
    // Return the hand center position for this frame
    return handCenterX;
  }

  // Helper to flatten a section array into a sequence of notes (including '_')
  function flattenSections(sections) {
    const notes = [];
    let keySections = Array.isArray(sections[0]) ? sections : [sections];
    keySections.forEach(section => {
      section.forEach(row => {
        row.split(' ').forEach(k => {
          if (k !== '') notes.push(k);
        });
      });
    });
    return notes;
  }

  // Get main melody notes
  const notes = flattenSections(song.keys);

  // Get comping notes (if any)
  const compingNotes = song.comping ? flattenSections(song.comping) : null;

  // Determine the max length for parallel playback
  const maxLen = Math.max(notes.length, compingNotes ? compingNotes.length : 0);

  return new Promise(resolve => {
    let idx = 0;
    let prevNoteNumber = null;
    let prevCompingNoteNumber = null;
    let lastHandPosition = fingerCanvas ? fingerCanvas.width / 2 : 300; // Default center
    function playNext() {
      console.log('playNext called - idx:', idx, 'maxLen:', maxLen);
      if (idx >= maxLen) {
        console.log('Demo ending - releasing notes and clearing canvas');
        // Release last notes if any
        if (prevNoteNumber !== null) {
          $(window).trigger('keyboardUp', {
            time: new Date().getTime(),
            noteNumber: prevNoteNumber,
            channel: 0,
            velocity: 120,
          });
        }
        if (prevCompingNoteNumber !== null) {
          $(window).trigger('keyboardUp', {
            time: new Date().getTime(),
            noteNumber: prevCompingNoteNumber,
            channel: 0,
            velocity: 120,
          });
        }
        // DON'T clear finger highlighting at the end - let game.js handle it
        console.log('Demo finished, returning lastHandPosition:', lastHandPosition);
        resolve(lastHandPosition);
        return;
      }

      // Show finger highlighting for current note
      if (flatKeys && flatKeys[idx] && flatKeys[idx].fingering) {
        const currentFingering = parseInt(flatKeys[idx].fingering);
        console.log('Demo note', idx, '- key:', flatKeys[idx].key, 'fingering:', currentFingering);
        const handPosition = renderDemoFingers(currentFingering, idx, lastHandPosition);
        if (handPosition !== null) {
          lastHandPosition = handPosition;
          console.log('Demo hand position updated to:', lastHandPosition);
        }
      } else {
        console.log('Demo note', idx, '- no fingering data, preserving position:', lastHandPosition);
        // Render with no highlighting but preserve hand position
        const handPosition = renderDemoFingers(null, idx, lastHandPosition);
        if (handPosition !== null) {
          lastHandPosition = handPosition;
        }
      }

      // Main melody
      const noteChar = notes[idx] || '_';
      let dur = noteDurMs;
      if (song.swing && idx % 2 === 1) {
        dur = noteDurMs * song.swing;
      }
      // Comping
      const compingChar = compingNotes ? (compingNotes[idx] || '_') : '_';

      // Play main melody note
      if (noteChar !== '_') {
        const noteNumber = charToNoteNum[noteChar];
        if (typeof noteNumber !== "undefined") {
          // Utter the character at the same time
          if (typeof window.speechSynthesis !== "undefined") {
            const speakKey = doReMiMode ? simplifyCharToDoReMi(noteChar) : simplifyCharTo123(noteChar);
            const utter = new window.SpeechSynthesisUtterance(speakKey);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
          }
          window.setTimeout(_ => {
            if (prevNoteNumber !== null) {
              $(window).trigger('keyboardUp', {
                time: new Date().getTime(),
                noteNumber: prevNoteNumber,
                channel: 0,
                velocity: 80,
              });
            }
            $(window).trigger('keyboardDown', {
              time: new Date().getTime(),
              noteNumber: noteNumber,
              channel: 0,
              velocity: 80,
            });
            prevNoteNumber = noteNumber;
          }, 90);
        }
      }

      // Play comping note
      if (compingChar !== '_') {
        const compingNoteNumber = charToNoteNum[compingChar];
        if (typeof compingNoteNumber !== "undefined") {
          window.setTimeout(_ => {
            if (prevCompingNoteNumber !== null) {
              $(window).trigger('keyboardUp', {
                time: new Date().getTime(),
                noteNumber: prevCompingNoteNumber,
                channel: 0,
                velocity: 80,
              });
            }
            $(window).trigger('keyboardDown', {
              time: new Date().getTime(),
              noteNumber: compingNoteNumber,
              channel: 0,
              velocity: 60,
            });
            prevCompingNoteNumber = compingNoteNumber;
          }, 90);
        }
      }

      idx++;
      setTimeout(playNext, dur);
    }
    playNext();
  });
}
