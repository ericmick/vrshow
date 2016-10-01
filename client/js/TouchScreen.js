export default class TouchScreen {
    constructor(context = window) {
        this.context = context;
        this.touches = {};
        this.deltaY = 0;
        this.eventListeners = {
            'touchstart': (e) => this.touchstart(e),
            'touchmove': (e) => this.touchmove(e),
            'touchend': (e) => this.touchend(e),
            'touchcancel': (e) => this.touchend(e) // whatever
        };
        for(const eventType in this.eventListeners) {
            this.context.addEventListener(eventType, this.eventListeners[eventType]);
        }
    }

    touchstart(event) {
        for(const touch of event.changedTouches) {
            touches[touch.identifier] = Object.assign({}, touch);
        }
    }

    touchmove(event) {
        for(const touch of event.changedTouches) {
            deltaY += touch.screenY - this.touches[touch.identifier].screenY;
            touches[touch.identifier] = Object.assign({}, touch);
        }
    }

    touchend(event) {
        for(const touch of event.changedTouches) {
            delete touches[touch.identifier];
        }
    }

    consumeDeltaY() {
        const deltaY = this.deltaY;
        this.deltaY = 0;
        return deltaY;
    }
}