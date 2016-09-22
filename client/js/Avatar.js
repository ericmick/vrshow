/**
 * Class to represent a person in VR.
 */

import { Object3D, Matrix4 } from 'three';
import ViveController from './ViveController';

export default class Avatar extends Object3D {
    constructor(scene) {
        super();

        this.headMatrix = new Matrix4();
        this.standingMatrix = new Matrix4();
        this.isPresenting = () => false;

        this.controllers = [
            new ViveController(0),
            new ViveController(1)
        ];

        this.controllers.forEach((c)=> {
            c.standingMatrix = this.standingMatrix;
            scene.add(c);
        });
    }

    update() {
        if(this.isPresenting()) {
            this.controllers.forEach((c)=> {
                c.standingMatrix = this.standingMatrix;
                c.update();
            });
        }
    }
}