import {Scene} from 'three'

export default class Room extends Scene {
    constructor(user) {
        super();
        this.user = user;
    }
    
    update(delta, renderer, camera) {
        const { user } = this;
        user.update(delta);
        // vr render
        user.head.visible = false;
        renderer.render(this, this.user.camera);
        user.head.visible = true;
        // desktop render
        if (camera) {
            renderer.renderNonVR(this, camera);
        }
    }
    
    detach() {
        // clean-up here and remove room-specific items
    }
}