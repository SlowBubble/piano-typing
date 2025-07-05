const charToNoteNum = {
  '`': 47+ 12,
  1: 48+ 12,
  2: 50+ 12,
  3: 52+ 12,
  4: 53+ 12,
  5: 55+ 12,
  6: 57+ 12,
  7: 59+ 12,
  8: 60+ 12,
  9: 62+ 12,
  0: 64+ 12,
  '-': 65+12,
  '=': 67 + 12,
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
  // Flatten all keys into a sequence of notes (including '-') for timing
  const notes = [];
  // Support both old and new song format (list of string or list of list of string)
  let keySections = Array.isArray(song.keys[0]) ? song.keys : [song.keys];
  keySections.forEach(section => {
    section.forEach(row => {
      row.split(' ').forEach(k => {
        if (k !== '') notes.push(k);
      });
    });
  });

  return new Promise(resolve => {
    let idx = 0;
    let prevNoteNumber = null;
    function playNext() {
      if (idx >= notes.length) {
        // Release last note if any
        if (prevNoteNumber !== null) {
          $(window).trigger('keyboardUp', {
            time: new Date().getTime(),
            noteNumber: prevNoteNumber,
            channel: 0,
            velocity: 120,
          });
        }
        resolve();
        return;
      }
      const noteChar = notes[idx];
      // Determine duration for this note
      let dur = noteDurMs;
      if (song.swing && idx % 2 === 1) {
        dur = noteDurMs * song.swing;
      }
      if (noteChar === '_') {
        idx++;
        setTimeout(playNext, dur);
        if (idx === notes.length) {
          setTimeout(resolve, dur);
        }
        return;
      }
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
      idx++;
      setTimeout(playNext, dur);
    }
    playNext();
  });
}
