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

        this.controllers = scene ? [
            new ViveController(0),
            new ViveController(1)
        ]: [];

        this.controllers.forEach((c)=> {
            scene.add(c);
        });

        if(!scene) {
            // only pass scene if main avatar is main user
            //  otherwise show a torus
            var geometry = new THREE.TorusGeometry(10, 3, 16, 100);
            var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            var torus = new THREE.Mesh(geometry, material);
            this.add(torus);
        }

        // Place head above the floor
        // this.position.setY(defaultUserHeight);
    }

    updatePose(pose) {

        // Position may be false if tracking currently
        // unavailable or null if not supported as
        // in Cardboard
        if(pose.position) {
            this.position.fromArray(pose.position);
        }

        if(pose.orientation) {
            this.quaternion.fromArray(pose.orientation);
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
            dataView.setFloat32(offset, this.matrixWorld.elements[i]);
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
            this.matrixWorld.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }
    }

    getBlobByteLength() {
        // The expected array buffer size to use
        return 16*4;
    }
}

// Distance from the users eyes to the floor in meters. Used when
// the VRDisplay doesn't provide stageParameters.
const defaultUserHeight = 1.6;