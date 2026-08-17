// ─── STATE MACHINE ──────────────────────────────────────────
// Game states and transition management (Section 3 of spec).
// ─────────────────────────────────────────────────────────────

export const STATES = {
  MENU:          'MENU',
  PLAYING:       'PLAYING',
  PAUSED:        'PAUSED',
  MOON_APPROACH: 'MOON_APPROACH',
  MOON_STOLEN:   'MOON_STOLEN',
  ESCAPE:        'ESCAPE',
  GAME_OVER:     'GAME_OVER',
};

class StateMachine {
  constructor() {
    this.currentState = STATES.MENU;
    this.previousState = null;
    this.enterCallbacks = new Map();
    this.exitCallbacks = new Map();
    this.anyCallbacks = [];
  }

  get current() {
    return this.currentState;
  }

  is(state) {
    return this.currentState === state;
  }

  isAny(...states) {
    return states.includes(this.currentState);
  }

  onEnter(state, callback) {
    if (!this.enterCallbacks.has(state)) {
      this.enterCallbacks.set(state, []);
    }
    this.enterCallbacks.get(state).push(callback);
  }

  onExit(state, callback) {
    if (!this.exitCallbacks.has(state)) {
      this.exitCallbacks.set(state, []);
    }
    this.exitCallbacks.get(state).push(callback);
  }

  onAny(callback) {
    this.anyCallbacks.push(callback);
  }

  transition(newState, payload = {}) {
    if (this.currentState === newState) return;

    const oldState = this.currentState;
    this.previousState = oldState;

    // Exit old state
    const exitCbs = this.exitCallbacks.get(oldState);
    if (exitCbs) {
      for (const cb of exitCbs) cb(newState, payload);
    }

    this.currentState = newState;

    // Enter new state
    const enterCbs = this.enterCallbacks.get(newState);
    if (enterCbs) {
      for (const cb of enterCbs) cb(oldState, payload);
    }

    // Global listeners
    for (const cb of this.anyCallbacks) {
      cb(oldState, newState, payload);
    }
  }

  forceState(state, payload = {}) {
    this.currentState = state;
    const enterCbs = this.enterCallbacks.get(state);
    if (enterCbs) {
      for (const cb of enterCbs) cb(this.previousState, payload);
    }
  }
}

export const stateMachine = new StateMachine();
