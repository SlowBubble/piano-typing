
function simplifyCharTo123(char) {
  if (char === '7') {
    return 'Sev';
  }
  if (char === '8') {
    return '1';
  }
  if (char === '9') {
    return '2';
  }
  if (char === '0') {
    return '3';
  }
  if (char === '-') {
    return '4';
  }
  if (char === '=') {
    return '5';
  }
  if (char === '`') {
    return 'Sev';
  }
  return char;
}

function simplifyCharToDoReMi(char) {
  if (char === '1') return 'Doe';
  if (char === '2') return 'Ray';
  if (char === '3') return 'Mi';
  if (char === '4') return 'Fa';
  if (char === '5') return 'So';
  if (char === '6') return 'La';
  if (char === '7') return 'Ti';
  if (char === '8') return 'Doe';
  if (char === '9') return 'Ray';
  if (char === '0') return 'Mi';
  if (char === '-') return 'Fa';
  if (char === '=') return 'So';
}
