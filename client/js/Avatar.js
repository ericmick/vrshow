/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import { Object3D, OBJLoader } from 'three';

export default class Avatar extends Object3D {
    constructor(hideGlasses) {
        super();

        this.userId = null;

        this.matrixAutoUpdate = false;

        this.color = new THREE.Color(Math.random() * 0xffffff);

        const loader = new OBJLoader();
        loader.load('models/glasses.obj', (obj) => {
            let glasses = obj.children[0];
            glasses.material.color = this.color;

            let scale = 0.07;
            obj.rotateY(-Math.PI / 2);
            obj.position.x = -18.4 * scale;
            obj.position.z = 1.8 * scale;
            obj.scale.set(scale, scale, scale);
            this.add(obj);

            if(hideGlasses) {
                obj.visible = false;
            }
            this.glasses = obj;
        });

        // Place head above the floor
        // this.position.setY(defaultUserHeight);
    }

    toBlob(buffer) {
        buffer = buffer || new ArrayBuffer(this.getBlobByteLength());
        if (buffer.byteLength != this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        let i, offset = 0;
        const dataView = new DataView(buffer, 0);

        for (i = 0; i < 16; i++) {
            dataView.setFloat32(offset, this.matrix.elements[i]);
            offset += 4;
        }

        dataView.setUint8(offset, this.color.r * 255);
        offset++;
        dataView.setUint8(offset, this.color.g * 255);
        offset++;
        dataView.setUint8(offset, this.color.b * 255);


        return buffer;
    }

    fromBlob(buffer) {
        if (!buffer || buffer.byteLength != this.getBlobByteLength()) {
            throw new Error('Blob serialization error.')
        }

        var i, offset = 0;
        const dataView = new DataView(buffer, 0);

        for (i = 0; i < 16; i++) {
            this.matrix.elements[i] = dataView.getFloat32(offset);
            offset += 4;
        }

        // update properties after manual matrix change
        this.position.setFromMatrixPosition(this.matrix);
        this.quaternion.setFromRotationMatrix(this.matrix);

        this.color.r = dataView.getUint8(offset) / 255;
        offset++;
        this.color.g = dataView.getUint8(offset) / 255;
        offset++;
        this.color.b = dataView.getUint8(offset) / 255;

        this.matrixWorldNeedsUpdate = true;
    }

    getBlobByteLength() {
        // The expected array buffer size to use
        return 16 * 4 + 3;
    }
}
