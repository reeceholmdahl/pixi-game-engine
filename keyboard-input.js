// Array of active keys
const activeKeys = [];

// Object containing members representing which keys have just been pressed
const pressedKeys = {};

// Array of released keys; not active
const releasedKeys = [];

/**
 * Gets keys down
 * @returns {Array<Boolean>} Returns active key array
 */
export function getKeysDown() {
    return activeKeys;
}

/**
 * Gets keys pressed
 * @returns {Object} Returns pseudo-array, object, that contains which keys have just been pressed
 */
export function getKeysPressed() {
  return pressedKeys;
}

/**
 * If key is down, alternative to array method
 * @param {String} key The key to check if down
 * @returns {Boolean} Returns the state of the key
 */
export function isKeyDown(key) {
  return activeKeys[key] || false;
}

/**
 * If key has just been pressed, alternative to array method
 * @param {String} key The key to check if just pressed
 * @returns {Boolean} Returns whether or not the key was just pressed
 */
export function isKeyPressed(key) {
  if (releasedKeys[key] == undefined) releasedKeys[key] = true;
  const keyState = releasedKeys[key] && isKeyDown(key);
  if (keyState) releasedKeys[key] = false;
  return keyState;
}

/**
 * Adds a key to the active key array, and appends a getter to the pressed keys object running the @see isKeyPressed method on access
 * @param {KeyboardEvent} event The keyboard event referenced
 */
function addKey(event) {
  if (activeKeys[event.key] == undefined) {
    Object.defineProperty(pressedKeys, event.key, {
      get() {
        return isKeyPressed(event.key);
      },
    });
  }
  activeKeys[event.key] = true;
}

/**
 * Removes a key from the active key array, and adds a key to the released key array
 * @param {KeyboardEvent} event The keyboard event referenced
 */
function removeKey(event) {
  activeKeys[event.key] = false;
  releasedKeys[event.key] = true;
}

// Add key event listeners to DOM
window.addEventListener('keydown', addKey);
window.addEventListener('keyup', removeKey);