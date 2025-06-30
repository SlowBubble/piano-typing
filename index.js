
var pedalOn = false;
var volumeRange = 120;


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
simpleKeyboard = {
  channel: 0,
  velocity: 120,
  shift: 0,
  hasPedal: true,
  turnOn: () => {
    this.velocity = 120;
  },
  turnOff: () => {
    this.velocity = 0;
  },
  connectKeyToKeyboard: () => {
    var self = this;
    var downKeys = {};

    $(window).on('keydown.keyboard', function(evt) {
      if (typeof event !== 'undefined') {
        var d = event.srcElement || event.target;

        var inInputField = (d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE')) 
                 || d.tagName.toUpperCase() === 'TEXTAREA';
      }
      
      if (inInputField) return ;

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
          channel: self.channel,
          velocity: self.velocity,
          pedalOn: pedalOn,
          userTriggered: true,
        });
      }

      // prevent backspace from navigating back in the browser
      if (evt.which === 8 || evt.which === 32) {
        evt.preventDefault();
      }
    });

    $(window).on('keyup.keyboard', function(evt) {
      var keyCode = fixKeyCode(evt.keyCode);

      delete downKeys[keyCode];

      var noteNumber = convertKeyCodeToNote(keyCode);

      if (typeof noteNumber !== "undefined") {
        $(window).trigger('keyboardUp', {
          time: new Date().getTime(),
          keyCode: keyCode,
          noteNumber: noteNumber,
          channel: self.channel,
          velocity: self.velocity,
          pedalOn: pedalOn,
          userTriggered: true,
        });
      }
    });
  },

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

noteNumberToAoeui = function(noteNumber) {
    var conversion = {
      41: 'j',  
      42: 'k',
      43: 'u',
      45: '3',
      47: '`',
      48: '1',
      49: '2',
      50: "'",
      51: ',',
      52: 'a',
      53: ';',
      54: 'q',
      55: 'o',
      56: 'e',
      57: '.',
      58: 'p',
      59: '4',
      60: '5',
      61: '6',
      62: 'y',
      63: 'f',
      64: 'i',
      65: 'x',
      66: 'b',
      67: 'i',
      68: 'h',
      69: 'g',
      70: 'c',
      71: '8',
      72: '9',
      73: '0',
      74: 'r',
      75: 'l',
      76: 'n',
      77: 'v',
      78: 'z',
      79: 's',
      80: '-',
      81: '/',
      82: '=',
      83: ']',
      84: 'del',
      86:  '\\',
      88: '[',
      89: 'm',
      90: 'w',
      91: 't',
      93: '7',
    }
  var ret = conversion[noteNumber];
  if (!ret) ret = noteNumber.toString();

  return ret;
}

noteToName = function(noteNumber, alphabet) {
  noteNumber = (noteNumber - 60) % 12;

  if (noteNumber < 0) {
    noteNumber += 12;
  }

  if (alphabet) {
    if (1) {
      var conversion = {
        0: 'C',
        1: 'C\u266F',
        2: 'D',
        3: 'D\u266F',
        4: 'E',
        5: 'F',
        6: 'F\u266F',
        7: 'G',
        8: 'G\u266F',
        9: 'A',
        10: 'A\u266F',
        11: 'B',
      };
    } else {
      var conversion = {
        0: 'C',
        1: 'D\u266D',
        2: 'D',
        3: 'E\u266D',
        4: 'E',
        5: 'F',
        6: 'G\u266D',
        7: 'G',
        8: 'A\u266D',
        9: 'A',
        10: 'B\u266D',
        11: 'B',
      };
    }


  } else {
    var conversion = {
      0: 'DO',
      1: 'DI',
      2: 'RE',
      3: 'RI',
      4: 'MI',
      5: 'FA',
      6: 'FI',
      7: 'SO',
      8: 'SI',
      9: 'LA',
      10: 'LI',
      11: 'TI',
    };
  }

  return conversion[noteNumber];
}


keyCodeToNote = {
  192: 47, // 1
  49: 48, // 1
  50: 50,
  51: 52,
  52: 53,
  53: 55,
  54: 57,
  55: 59,
  56: 60,
  57: 62,
  48: 64,
  189: 65,
  187: 67,
  8: 69, // backspace
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