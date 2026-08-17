// ─── STATE MACHINE ──────────────────────────────────────────
// Single-source-of-truth for game state. All transitions go
// through stateMachine.transition() — never scattered if-checks.
// ─────────────────────────────────────────────────────────────

export const STATES = {
  MENU:           'MENU',
  TUTORIAL_HINT:  'TUTORIAL_HINT',
  PLAYING:        'PLAYING',
  PAUSED:         'PAUSED',
  MOON_APPROACH:  'MOON_APPROACH',
  MOON_STOLEN:    'MOON_STOLEN',
  ESCAPE:         'ESCAPE',
  GAME_OVER:      'GAME_OVER',
};

// Valid transitions map: state → [allowed next states]
const VALID_TRANSITIONS = {
  [STATES.MENU]:          [STATES.PLAYING, STATES.TUTORIAL_HINT],
  [STATES.TUTORIAL_HINT]: [STATES.PLAYING],
  [STATES.PLAYING]:       [STATES.PAUSED, STATES.MOON_APPROACH, STATES.GAME_OVER],
  [STATES.PAUSED]:        [STATES.PLAYING, STATES.ESCAPE, STATES.MENU],
  [STATES.MOON_APPROACH]: [STATES.MOON_STOLEN, STATES.GAME_OVER],
  [STATES.MOON_STOLEN]:   [STATES.ESCAPE],
  [STATES.ESCAPE]:        [STATES.PAUSED, STATES.GAME_OVER],
  [STATES.GAME_OVER]:     [STATES.MENU, STATES.PLAYING, STATES.TUTORIAL_HINT],
};

class StateMachine {
  constructor() {
    this.current = STATES.MENU;
    this.previous = null;
    this.listeners = {};        // { state: [callbacks] }
    this.exitListeners = {};    // { state: [callbacks] }
    this.anyListeners = [];     // called on every transition
    this.payload = null;
  }

  /** Register a callback for when we enter a specific state */
  onEnter(state, callback) {
    if (!this.listeners[state]) this.listeners[state] = [];
    this.listeners[state].push(callback);
  }

  /** Register a callback for when we exit a specific state */
  onExit(state, callback) {
    if (!this.exitListeners[state]) this.exitListeners[state] = [];
    this.exitListeners[state].push(callback);
  }

  /** Register a callback for any state transition */
  onAny(callback) {
    this.anyListeners.push(callback);
  }

  /** Transition to a new state with optional payload */
  transition(newState, payload = null) {
    const allowed = VALID_TRANSITIONS[this.current];
    if (!allowed || !allowed.includes(newState)) {
      console.warn(`[StateMachine] Invalid transition: ${this.current} → ${newState}`);
      return false;
    }

    const oldState = this.current;

    // Fire exit listeners for the old state
    if (this.exitListeners[oldState]) {
      this.exitListeners[oldState].forEach(cb => cb(newState, payload));
    }

    this.previous = oldState;
    this.current = newState;
    this.payload = payload;

    // Fire enter listeners for the new state
    if (this.listeners[newState]) {
      this.listeners[newState].forEach(cb => cb(oldState, payload));
    }

    // Fire any-transition listeners
    this.anyListeners.forEach(cb => cb(newState, oldState, payload));

    return true;
  }

  /** Check if we're in a specific state */
  is(state) {
    return this.current === state;
  }

  /** Check if we're in any of the given states */
  isAny(...states) {
    return states.includes(this.current);
  }

  /** Force-set state (for restart — bypasses validation) */
  forceState(state, payload = null) {
    const oldState = this.current;
    if (this.exitListeners[oldState]) {
      this.exitListeners[oldState].forEach(cb => cb(state, payload));
    }
    this.previous = oldState;
    this.current = state;
    this.payload = payload;
    if (this.listeners[state]) {
      this.listeners[state].forEach(cb => cb(oldState, payload));
    }
    this.anyListeners.forEach(cb => cb(state, oldState, payload));
  }
}

export const stateMachine = new StateMachine();
