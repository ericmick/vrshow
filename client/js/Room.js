import {Scene} from 'three'

export default class Room extends Scene {
    constructor(user) {
        super();
        this.user = user;
    }
    
    update(delta, renderer) {
        const { user } = this;
        user.update(delta);
        user.head.visible = false;
        renderer.render(this, user.camera);
        user.head.visible = true;
    }
}