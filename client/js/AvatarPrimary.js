/**
 * Class to represent the current user. This class
 * adds control logic on top of the normal Avatar
 * class. There is only meant to be one instance of
 * this class active at a time.
 */
import { Vector3, Quaternion, OBJLoader } from 'three';
import Avatar from './Avatar';
import ViveController from './ViveController';

export default class AvatarPrimary extends Avatar {
    constructor(scene) {
        super();

        // Hide you own glasess
        this.visible = false;

        scene.add(this);

        this.controllers = scene ? [
            new ViveController(0),
            new ViveController(1)
        ]: [];

        this.controllers.forEach((c)=> {
            scene.add(c);
        });

        // These represent transformations based on user input
        // *not* from the VR pose, i.e. keyboard events, touch
        // events, teleportation, interactions with the virtual world.
        this.userPosition = new Vector3();
        this.userOrientation = new Quaternion();


        // Place head above the floor
        // this.position.setY(defaultUserHeight);
    }

    // Pose may be undefined when not in VR
    updatePose(pose) {

        // Position may be false if tracking currently
        // unavailable or null if not supported as
        // in Cardboard
        if(pose && pose.position) {
            this.position.fromArray(pose.position);
            this.position.add(this.userPosition);
        } else {
            this.position.copy(this.userPosition);
            this.position.y += defaultUserHeight;
        }

        if(pose && pose.orientation) {
            this.quaternion.fromArray(pose.orientation);
            this.quaternion.multiply(this.userOrientation);
        } else {
            this.quaternion.copy(this.userOrientation);
        }

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

    moveBackward(distance) {
        const v = new THREE.Vector3(0, 0, distance);
        if(this.quaternion) {
            // this.quaternion includes pose and userOrientation
            v.applyQuaternion(this.quaternion);
        } else {
            v.applyQuaternion(this.userOrientation);
        }
        this.userPosition.add(v);
    }

    moveForward(distance) {
        this.moveBackward(-distance);
    }

    turnLeft(angle) {
        const axis = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        this.userOrientation.multiply(q);
    }

    turnRight(angle) {
        this.turnLeft(-angle);
    }
}

// Distance from the users eyes to the floor in meters. Used when
// the VRDisplay doesn't provide stageParameters.
const defaultUserHeight = 0.5;