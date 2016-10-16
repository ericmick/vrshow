/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import { Object3D, OBJLoader } from 'three';
import ViveController from './ViveController';

export default class Avatar extends Object3D {
    constructor(isPrimary, color) {
        super();
        
        this.color = color || 0x000000;
        
        this.userId = null;

        this.controllers = [
            new ViveController(0),
            new ViveController(1)
        ];
        
        this.controllers.forEach((c) => {
            this.add(c);
        });

        this.head = new Object3D();
        this.head.matrixAutoUpdate = false;
        
        const geometry = new THREE.PlaneGeometry(0.1, 0.1, 2, 2);
        const material = new THREE.MeshPhongMaterial({color: 0x000000});
        this.mouth = new THREE.Mesh(geometry, material);
        this.mouth.rotation.set(0, Math.PI, 0);
        this.mouth.position.set(0, -.15, -.05);
        this.head.add(this.mouth);

        this.add(this.head);

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

    toBuffer(buffer, offset = 0) {
        if (buffer.byteLength < offset + this.getBufferByteLength()) {
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
        
        offset = this.controllers[0].toBuffer(buffer, offset);
        offset = this.controllers[1].toBuffer(buffer, offset);

        return offset;
    }

    fromBuffer(buffer, offset = 0) {
        if (!buffer || buffer.byteLength + offset < this.getBufferByteLength()) {
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
        
        offset = this.controllers[0].fromBuffer(buffer, offset);
        offset = this.controllers[1].fromBuffer(buffer, offset);

        this.updateMatrixWorld(true);
        this.head.updateMatrixWorld(true);
        this.glasses && this.glasses.updateMatrixWorld(true);
        
        return offset;
    }

    getBufferByteLength() {
        // The expected array buffer size to use
        return 2*(16 * 4) + 2*(3 * 4) + 3 +
            this.controllers[0].getBufferByteLength() * 2;
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
        
        if (this.audio) {
            this.mouth.scale.setY(this.audio.getLevel() + 0.02);
            this.mouth.updateMatrixWorld();
            this.audio.setPosition(
                new THREE.Vector3().setFromMatrixPosition(this.head.matrixWorld)
            );
        }
    }
}
