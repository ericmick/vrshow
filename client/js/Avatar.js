/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import { Object3D } from 'three';
import ViveController from './ViveController';

export default class Avatar extends Object3D {
    constructor(scene) {
        super();

        this.userId = null;

        this.matrixAutoUpdate = false;

        this.controllers = scene ? [
            new ViveController(0),
            new ViveController(1)
        ]: [];

        this.controllers.forEach((c)=> {
            scene.add(c);
        });

        // only pass scene if main avatar is main user
        //  otherwise show a torus
        var geometry = new THREE.TorusGeometry(0.05, 0.003);
        var material =  new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
        var torus = new THREE.Mesh(geometry, material);
        torus.position.z = -0.07;
        this.add(torus);

        if(scene) {
            scene.add(this);
            torus.opacity = 0.5;
        }
        
        // These represent transformations based on user input
        // *not* from the VR pose, i.e. keyboard events, touch
        // events, teleportation, interactions with the virtual world.
        this.userPosition = new THREE.Vector3();
        this.userOrientation = new THREE.Quaternion();


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

    toBlob(buffer) {
        buffer = buffer || new ArrayBuffer(this.getBlobByteLength());
        if(buffer.byteLength != this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        let i, offset = 0;
        const dataView = new DataView(buffer, 0);

        for(i=0; i<16; i++) {
            dataView.setFloat32(offset, this.matrix.elements[i]);
            offset += 4;
        }

        return buffer;
    }

    fromBlob(buffer) {
        if(!buffer || buffer.byteLength != this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        var i, offset = 0;
        const dataView = new DataView(buffer, 0);

        for(i=0; i<16; i++) {
            this.matrix.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }

        this.matrixWorldNeedsUpdate = true;
    }

    getBlobByteLength() {
        // The expected array buffer size to use
        return 16*4;
    }
    
    moveBackward(distance) {
        const v = new THREE.Vector3(0, 0, distance);
        v.applyQuaternion(this.userOrientation);
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
const defaultUserHeight = 1.6;