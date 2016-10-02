/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import { Object3D, OBJLoader } from 'three';

export default class Avatar extends Object3D {
    constructor(isPrimary) {
        super();

        this.userId = null;
        this.color = new THREE.Color(Math.random() * 0xffffff);

        this.head = new Object3D();
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
            obj.rotateY(-Math.PI / 2);
            obj.position.x = -18.4 * scale;
            obj.position.z = 1.8 * scale;
            obj.scale.set(scale, scale, scale);
            this.head.add(obj);
        });
    }

    toBlob(buffer) {
        buffer = buffer || new ArrayBuffer(this.getBlobByteLength());
        if (buffer.byteLength != this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        let i, offset = 0;
        const dataView = new DataView(buffer, 0);

        // Body
        for (i = 0; i < 16; i++) {
            dataView.setFloat32(offset, this.matrix.elements[i]);
            offset += 4;
        }

        // Head
        for (i = 0; i < 16; i++) {
            dataView.setFloat32(offset, this.head.matrix.elements[i]);
            offset += 4;
        }

        // Color
        dataView.setUint8(offset++, this.color.r * 255);
        dataView.setUint8(offset++, this.color.g * 255);
        dataView.setUint8(offset++, this.color.b * 255);

        return buffer;
    }

    fromBlob(buffer) {
        if (!buffer || buffer.byteLength != this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        var i, offset = 0;
        const dataView = new DataView(buffer, 0);

        // Body
        for (i = 0; i < 16; i++) {
            this.matrix.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }

        // Head
        for (i = 0; i < 16; i++) {
            this.head.matrix.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }

        // Color
        this.color.r = dataView.getUint8(offset++) / 255;
        this.color.g = dataView.getUint8(offset++) / 255;
        this.color.b = dataView.getUint8(offset++) / 255;

        this.matrixWorldNeedsUpdate = true;
    }

    getBlobByteLength() {
        // The expected array buffer size to use
        return 2*(16 * 4) + 3;
    }
}
