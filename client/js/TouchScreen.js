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
            this.touches[touch.identifier] = {
                screenY: touch.screenY
            };
        }
    }

    touchmove(event) {
        for(const touch of event.changedTouches) {
            console.log('touchmove', touch.identifier, touch.screenY, this.touches[touch.identifier], this.touches[touch.identifier].screenY);
            this.deltaY += touch.screenY - this.touches[touch.identifier].screenY;
            this.touches[touch.identifier] = {
                screenY: touch.screenY
            };
        }
    }

    touchend(event) {
        for(const touch of event.changedTouches) {
            delete this.touches[touch.identifier];
        }
    }

    consumeDeltaY() {
        const deltaY = this.deltaY;
        this.deltaY = 0;
        return deltaY;
    }
}