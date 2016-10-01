export default class Keyboard {
    constructor(context = window) {
        this.context = context;
        this.pressedKeys = {};
        this.eventListeners = {
            'keydown': (e) => this.keydown(e),
            'keyup': (e) => this.keyup(e)
        };
        for(const eventType in this.eventListeners) {
            this.context.addEventListener(eventType, this.eventListeners[eventType]);
        }
    }
  
    keydown(event) {
        this.pressedKeys[event.key] = event;
    }
  
    keyup(event) {
        delete this.pressedKeys[event.key];
    }
  
    /*
     * returns boolean: whether the key is depressed now
     * key: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
     */
    isPressed(key) {
        return !!this.pressedKeys[key];
    }
  
    detach() {
        for(const eventType in this.eventListeners) {
            this.context.removeEventListener(eventType, this.eventListeners[eventType]);
        }
    }
}