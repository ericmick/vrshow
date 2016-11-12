/**
 * Class to represent the current user. This class
 * adds control logic on top of the normal Avatar
 * class. There is only meant to be one instance of
 * this class active at a time.
 */
import { Vector3, Quaternion, OBJLoader } from 'three';
import Avatar from './Avatar';
import Audio from './Audio';
import ViveController from './ViveController';
import Keyboard from './Keyboard';
import TouchScreen from './TouchScreen';

export default class AvatarPrimary extends Avatar {
    constructor(onMenu) {
        super(true, new THREE.Color(Math.random() * 0xffffff));

        this.visible = true;

        // Default user above the ground
        this.position.set(0, 1.5, 0);
        this.updateMatrix();

        this.controllers.forEach((c)=> {
            c.addEventListener('menudown', () => {
                if(typeof onMenu === 'function') {
                    onMenu();
                }
            });
        });

        this.keyboard = new Keyboard();
        this.touchScreen = new TouchScreen();

        this.pose = null;
        this.linearVelocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();

        // Place head above the floor
        //this.translateY(defaultUserHeight);
        
        this.audio = new Audio(true);
    }

    // Pose may be undefined
    updatePose(pose) {
        this.pose = pose;

        // Position may be false if tracking currently
        // unavailable or null if not supported as
        // in Cardboard
        if(pose && pose.position) {
            this.head.position.fromArray(pose.position);
        }

        if(pose && pose.orientation) {
            this.head.quaternion.fromArray(pose.orientation);
        }
        
        if(pose && pose.linearVelocity) {
            this.linearVelocity.fromArray(pose.linearVelocity);
        }
        
        if(pose && this.pose.angularVelocity) {
            this.angularVelocity.fromArray(pose.angularVelocity);
        }

        this.head.updateMatrix();
        this.head.updateMatrixWorld(true);
        Audio.setListener(this.head.matrixWorld);
    }

    update(delta) {
        this.controllers.forEach((c) => {
            c.update();
            if(c.isThumbpadPressed()) {
                let axes = c.getAxes();
                if(axes[1] > 0.5){
                    this.moveForward(delta);
                } else if(axes[1] < -0.5){
                    this.moveBackward(delta);
                }

                if(axes[0] > 0.5){
                    this.turnRight(delta);
                } else if(axes[0] < -0.5){
                    this.turnLeft(delta);
                }
            }
        });

        const { keyboard, touchScreen } = this;

        if (keyboard.isPressed('w') || keyboard.isPressed('W')) {
            this.moveForward(delta);
        }
        if (keyboard.isPressed('a') || keyboard.isPressed('A')) {
            this.turnLeft(delta);
        }
        if (keyboard.isPressed('s') || keyboard.isPressed('S')) {
            this.moveBackward(delta);
        }
        if (keyboard.isPressed('d') || keyboard.isPressed('D')) {
            this.turnRight(delta);
        }
        this.moveForward(touchScreen.consumeDeltaY() * 0.01);

        if (this.audio) {
            this.mouth.scale.setY(this.audio.getLevel() + 0.02);
            this.mouth.updateMatrixWorld();
            this.audio.setPosition(
                new THREE.Vector3().setFromMatrixPosition(this.head.matrixWorld)
            );
        }
    }

    moveBackward(distance) {
        const v = new Vector3(0, 0, distance);

        // Move along look direction
        const q = new Quaternion().setFromRotationMatrix(this.head.matrixWorld);
        v.applyQuaternion(q);

        this.position.add(v);
        this.updateMatrix();

        if(this.pose && this.pose.linearVelocity) {
            this.linearVelocity.fromArray(this.pose.linearVelocity);
            this.linearVelocity.add(v);
        } else {
            this.linearVelocity.copy(v);
        }

        this.head.updateMatrixWorld(true);
        Audio.setListener(this.head.matrixWorld);
    }

    moveForward(distance) {
        this.moveBackward(-distance);
    }

    turnLeft(angle) {
        const axis = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);

        this.matrix.decompose(this.position, this.quaternion, this.scale)

        this.quaternion.multiply(q);
        this.updateMatrix();

        this.head.updateMatrixWorld(true);
        Audio.setListener(this.head.matrixWorld);
    }

    turnRight(angle) {
        this.turnLeft(-angle);
    }
}