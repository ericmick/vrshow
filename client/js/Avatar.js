/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import { Object3D, OBJLoader } from 'three';
import ViveController from './ViveController';

export default class Avatar extends Object3D {
    constructor(isPrimary) {
        super();

        this.userId = null;
        this.color = new THREE.Color(Math.random() * 0xffffff);

        this.controllers = [
            new ViveController(0),
            new ViveController(1)
        ];
        
        this.controllers.forEach((c) => {
            this.add(c);
        });

        this.head = new Object3D();
        this.head.matrixAutoUpdate = false;

        this.add(this.head);

        if(isPrimary) {
            // Hide head from self
            this.head.visible = false;
        }

        this.matrixAutoUpdate = false;

        const loader = new OBJLoader();
        loader.load('models/glasses.obj', (obj) => {
            let glasses = obj.children[0];
            glasses.material.color = this.color;

            let scale = 0.07;
            obj.matrixAutoUpdate = false;
            obj.rotateY(-Math.PI / 2);
            obj.position.x = -18.4 * scale;
            obj.position.z = 1.8 * scale;
            obj.scale.set(scale, scale, scale);
            obj.updateMatrix();
            this.head.add(obj);

            this.glasses = obj;
        });
        
        this.linearVelocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();
    }

    toBlob(buffer, offset = 0) {
        if (buffer.byteLength < offset + this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        const dataView = new DataView(buffer, 0);

        // Body
        for (let i = 0; i < 16; i++) {
            dataView.setFloat32(offset, this.matrix.elements[i]);
            offset += 4;
        }

        // Head
        for (let i = 0; i < 16; i++) {
            dataView.setFloat32(offset, this.head.matrix.elements[i]);
            offset += 4;
        }
        
        // Linear velocity
        for (let i = 0; i < 3; i++) {
            dataView.setFloat32(offset, this.linearVelocity.getComponent(i));
            offset += 4;
        }
        
        // Angular velocity
        for (let i = 0; i < 3; i++) {
            dataView.setFloat32(offset, this.angularVelocity.getComponent(i));
            offset += 4;
        }

        // Color
        dataView.setUint8(offset++, this.color.r * 255);
        dataView.setUint8(offset++, this.color.g * 255);
        dataView.setUint8(offset++, this.color.b * 255);
        
        offset = this.controllers[0].toBlob(buffer, offset);
        offset = this.controllers[1].toBlob(buffer, offset);

        return offset;
    }

    fromBlob(buffer, offset = 0) {
        if (!buffer || buffer.byteLength + offset < this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        const dataView = new DataView(buffer, 0);

        // Body
        for (let i = 0; i < 16; i++) {
            this.matrix.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }

        // Head
        for (let i = 0; i < 16; i++) {
            this.head.matrix.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }

        // Linear velocity
        this.linearVelocity = new THREE.Vector3();
        for (let i = 0; i < 3; i++) {
            this.linearVelocity.setComponent(i, dataView.getFloat32(offset));
            offset += 4;
        }
        
        // Angular velocity
        this.angularVelocity = new THREE.Vector3();
        for (let i = 0; i < 3; i++) {
            this.angularVelocity.setComponent(i, dataView.getFloat32(offset));
            offset += 4;
        }
        
        // Color
        this.color.r = dataView.getUint8(offset++) / 255;
        this.color.g = dataView.getUint8(offset++) / 255;
        this.color.b = dataView.getUint8(offset++) / 255;
        
        offset = this.controllers[0].fromBlob(buffer, offset);
        offset = this.controllers[1].fromBlob(buffer, offset);

        this.updateMatrixWorld(true);
        this.head.updateMatrixWorld(true);
        this.glasses && this.glasses.updateMatrixWorld(true);
        
        return offset;
    }

    getBlobByteLength() {
        // The expected array buffer size to use
        return 2*(16 * 4) + 2*(3 * 4) + 3 +
            this.controllers[0].getBlobByteLength() * 2;
    }
    
    update(delta) {
        for (let i = 0; i < scene.children.length; i++) {
            const d = new THREE.Vector3().addScaledVector(this.linearVelocity, delta);
            this.head.matrix.multiply(
                new THREE.Matrix4().makeTranslation(d.x, d.y, d.z)
            );
            this.head.updateMatrixWorld(true);
        }

        for (let i = 0; i < scene.children.length; i++) {
            const d = new THREE.Euler().setFromVector3(
                new THREE.Vector3().addScaledVector(this.angularVelocity, delta)
            );
            this.head.matrix.multiply(
                new THREE.Matrix4().makeRotationFromEuler(d.x, d.y, d.z)
            );
        }
    }
}
