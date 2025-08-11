var pedalOn = false;
var volumeRange = 120;

class SimpleKeyboard {
  constructor() {
    this.channel = 0;
    this.velocity = 120;
  }
  turnOn() {
    this.velocity = 120;
  }
  turnOff() {
    this.velocity = 0;
  }
  connectKeyToKeyboard() {
    var downKeys = {};

    $(window).on('keydown.keyboard', evt => {
      if (typeof event !== 'undefined') {
        var d = event.srcElement || event.target;

        var inInputField = (d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE')) 
                 || d.tagName.toUpperCase() === 'TEXTAREA';
      }
      
      if (inInputField) return ;

      // prevent backspace, tab, or space from navigating back in the browser
      if (evt.which === 8 || evt.which === 9 || evt.which === 32) {
        evt.preventDefault();
      }

      var keyCode = fixKeyCode(evt.keyCode);
      if (downKeys[keyCode] === true) {
        return ;
      } else {
        downKeys[keyCode] = true;
      }

      var noteNumber = convertKeyCodeToNote(keyCode);

      if (typeof noteNumber !== "undefined") {
        $(window).trigger('keyboardDown', {
          time: new Date().getTime(),
          keyCode: keyCode,
          noteNumber: noteNumber,
          channel: this.channel,
          velocity: this.velocity,
          pedalOn: pedalOn,
          userTriggered: true,
        });
      }

    });

    $(window).on('keyup.keyboard', (evt) => {
      var keyCode = fixKeyCode(evt.keyCode);

      delete downKeys[keyCode];

      var noteNumber = convertKeyCodeToNote(keyCode);

      if (typeof noteNumber !== "undefined") {
        $(window).trigger('keyboardUp', {
          time: new Date().getTime(),
          keyCode: keyCode,
          noteNumber: noteNumber,
          channel: this.channel,
          velocity: this.velocity,
          pedalOn: pedalOn,
          userTriggered: true,
        });
      }
    });
  }
}

const simpleKeyboard = new SimpleKeyboard;

window.onload = function () {
	MIDI.loadPlugin({
		soundfontUrl: "lib/midi.js/soundfont/",
		instrument: "acoustic_grand_piano",
		onprogress: function(state, progress) {
			console.log(state, progress);
		},
		onsuccess: function() {
            console.log('Piano is loaded.');
            loadSound();
            simpleKeyboard.connectKeyToKeyboard();
		}
	});
};

IS_IOS = navigator.userAgent.match(/(iPhone|iPad|webOs|Android)/i);

loadSound = function() {
    $(window).off('keyboardDown.sound');
      $(window).on('keyboardDown.sound', function(evt, data) {
          if (typeof data.noteNumber !== 'undefined') {
            data.channel = data.channel || DEFAULT_CHANNEL;
            MIDI.noteOn(data.channel, data.noteNumber, damp(data.velocity, data.noteNumber, volumeRange));
          }
      });

      $(window).off('keyboardUp.sound');
      $(window).on('keyboardUp.sound', function(evt, data) {
          if (typeof data.noteNumber !== 'undefined' && !data.pedalOn) {
            data.channel = data.channel || DEFAULT_CHANNEL;
            MIDI.noteOff(data.channel, data.noteNumber);
          }
      });
    }
function damp(velocity, note, volumeRange) {
  return velocity * volumeRange / 100;
}


////// helpers
function fixKeyCode(keyCode) {
  // firefox incompatibility
  if (keyCode === 59) {
    keyCode = 186;
  } else if (keyCode === 61) {
    keyCode = 187;
  } else if (keyCode === 173) {
    keyCode = 189;
  }

  return keyCode
}

function convertKeyCodeToNote(keyCode) {
  return keyCodeToNote[keyCode];
}

// Map keyCode to note using hardcoded numbers (not referencing charToNoteNum)
keyCodeToNote = {
  192: 59,   // `
  49: 60,    // 1
  81: 61,    // q
  50: 62,    // 2
  87: 63,    // w
  51: 64,    // 3
  52: 65,    // 4
  82: 66,    // r
  53: 67,    // 5
  84: 68,    // t
  54: 69,    // 6
  89: 70,    // y
  55: 71,    // 7
  56: 72,    // 8
  73: 73,    // i
  57: 74,    // 9
  79: 75,    // o
  48: 76,    // 0
  189: 77,   // -
  219: 78,   // [
  187: 79,   // =
  9: 58,     // Tab
  65: 57,    // a
  90: 56,    // z
  83: 55,    // s
  88: 54,    // x
  68: 53,    // d
  70: 52,    // f
  86: 51,    // v
  71: 50,    // g
  66: 49,    // b
  72: 48,    // h
  74: 47,    // j
  77: 46,    // m
  75: 45,    // k
  188: 44,   // ,
  76: 43,    // l
  190: 42,   // .
  186: 41,   // ;
  222: 40,   // '
};

noteToKeyCode = {};

for (prop in keyCodeToNote) {
  noteToKeyCode[keyCodeToNote[prop]] = parseInt(prop);
}

convertNoteToKeyCode = function(noteNumber) {
  var keyCode = noteToKeyCode[noteNumber];

  if (!keyCode) {
    while (noteNumber > 84) {
      noteNumber -= 12;
    } 
    while (noteNumber < 47) {
      noteNumber += 12;
    }
    keyCode = noteToKeyCode[noteNumber];
  }

  return keyCode;
}

var DEFAULT_CHANNEL = 0;
var DRUM_CHANNEL = 9;