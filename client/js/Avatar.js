/**
 * Class to represent a person in VR.
 */

import { Object3D } from 'three';
import ViveController from './ViveController';

export default class Avatar extends Object3D {
    constructor(scene) {
        super();

        this.userId = null;

        this.controllers = [
            new ViveController(0),
            new ViveController(1)
        ];

        this.controllers.forEach((c)=> {
            scene.add(c);
        });

        // Place head above the floor
        // this.position.setY(defaultUserHeight);
    }

    updatePose(pose) {
        this.position.fromArray(pose.position);
        this.quaternion.fromArray(pose.orientation);
        this.updateMatrix();

        // TODO: Pose also has velocity and acceleration
        // which we want to save for sharing:
        //   https://w3c.github.io/webvr/#interface-vrpose
    }

    update() {
        this.controllers.forEach((c)=> {
            c.update();
        });
    }
}

// Distance from the users eyes to the floor in meters. Used when
// the VRDisplay doesn't provide stageParameters.
const defaultUserHeight = 1.6;