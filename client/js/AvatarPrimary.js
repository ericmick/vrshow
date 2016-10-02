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
    constructor(onMenu) {
        super(true);

        this.controllers = [
            new ViveController(0),
            new ViveController(1)
        ];

        this.controllers.forEach((c)=> {
            this.add(c);

            c.addEventListener('menudown', () => {
                if(typeof onMenu === 'function') {
                    onMenu();
                }
            });
        });

        this.pose = null;

        // Place head above the floor
        //this.translateY(defaultUserHeight);
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
            this.head.position.fromArray(this.pose.position);
        }

        if(this.pose && this.pose.orientation) {
            this.head.quaternion.fromArray(this.pose.orientation);
        } else {
            this.head.quaternion.set(0,0,0,1);
        }

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
                if(axes[1] > 0.5){
                    this.moveForward(0.01);
                } else if(axes[1] < -0.5){
                    this.moveBackward(0.01);
                }

                if(axes[0] > 0.5){
                    this.turnRight(0.02);
                } else if(axes[0] < -0.5){
                    this.turnLeft(0.02);
                }
            }
        });
    }

    moveBackward(distance) {
        const v = new THREE.Vector3(0, 0, distance);
        v.applyQuaternion(this.quaternion);
        this.position.add(v);
        this.updateMatrix();
    }

    moveForward(distance) {
        this.moveBackward(-distance);
    }

    turnLeft(angle) {
        const axis = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        this.quaternion.multiply(q);
        this.updateMatrix();
    }

    turnRight(angle) {
        this.turnLeft(-angle);
    }
}

// Distance from the users eyes to the floor in meters. Used when
// the VRDisplay doesn't provide stageParameters.
const defaultUserHeight = 0.5;