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
    constructor() {
        super(true);

        this.controllers = [
            new ViveController(0),
            new ViveController(1)
        ];

        this.controllers.forEach((c)=> {
            this.add(c);
        });

        // These represent transformations based on user input
        // *not* from the VR pose, i.e. keyboard events, touch
        // events, teleportation, interactions with the virtual world.
        this.userPosition = new Vector3();
        this.userOrientation = new Quaternion();

        this.pose = null;

        // Place head above the floor
        this.translateY(defaultUserHeight);
    }

    // Pose may be undefined
    updatePose(pose) {
        if (pose) {
            // save pose to use when updating based on
            // userPosition or userOrientation
            this.pose = pose;
        }

        // Position may be false if tracking currently
        // unavailable or null if not supported as
        // in Cardboard
        if(this.pose && this.pose.position) {
            this.position.fromArray(this.pose.position);
            this.position.add(this.userPosition);
        } else {
            this.position.copy(this.userPosition);
        }

        if(this.pose && this.pose.orientation) {
            this.quaternion.fromArray(this.pose.orientation);
            this.quaternion.multiply(this.userOrientation);
        } else {
            this.quaternion.copy(this.userOrientation);
        }

        this.updateMatrix();
        this.updateMatrixWorld();

        // TODO: Pose also has velocity and acceleration
        // which we want to save for sharing:
        //   https://w3c.github.io/webvr/#interface-vrpose
    }

    update() {
        this.controllers.forEach((c)=> {
            c.update();
            if(c.isThumbpadPressed()) {
                let axes = c.getAxes();
                if(axes[1] > 0){
                    this.moveForward(0.01);
                } else {
                    this.moveBackward(0.01);
                }
            }
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
        this.updatePose();
    }

    moveForward(distance) {
        this.moveBackward(-distance);
    }

    turnLeft(angle) {
        const axis = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        this.userOrientation.multiply(q);
        this.updatePose();
    }

    turnRight(angle) {
        this.turnLeft(-angle);
    }
}

// Distance from the users eyes to the floor in meters. Used when
// the VRDisplay doesn't provide stageParameters.
const defaultUserHeight = 0.5;