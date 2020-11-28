// Array of active keys
var activeKeys = [];

// Export function returning active key array
export function getActiveKeys() {
    return activeKeys;
}

// Add key to the active key array
function addKey(e) {
  activeKeys[e.key] = true;
}

// Remove key to the active key array
function removeKey(e) {
  activeKeys[e.key] = false;
}

// Add key listeners to DOM
window.addEventListener('keydown', addKey);
window.addEventListener('keyup', removeKey);