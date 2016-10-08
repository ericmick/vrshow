export default class Peer {
    constructor(name, context = window) {
        this.name = name;
        this.element = context.document.createElement('a');
    }
    
    triggerEvent(type, detail) {
        var event = new CustomEvent(type, {detail: detail});
        this.element.dispatchEvent(event);
    }
    
    addEventListener(...args) {
        return this.element.addEventListener.apply(this.element, args);
    }
    
    removeEventListener(...args) {
        return this.element.removeEventListener.apply(this.element, args);
    }
}