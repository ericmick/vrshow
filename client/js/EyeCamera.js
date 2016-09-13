/**
 * Class to represent an eye in VR.
 */

import { Vector3, Matrix4, PerspectiveCamera } from 'three';

export default class EyeCamera {
    constructor(eyeType) {

        this.type = eyeType;
        this.translation = new Vector3();

        this.bounds = getDefaultBounds(eyeType);

        this.camera = new PerspectiveCamera();
        this.camera.layers.enable(1);

        this.headToEyeMatrix= new Matrix4();

        // Constants for this Eye
        this.ProjectionMatrix = `${this.type}ProjectionMatrix`;
        this.ViewMatrix = `${this.type}ViewMatrix`;
    }

    setBounds(bounds) {
        this.bounds = bounds || this.bounds;
    }

    getEyeParams(vrDisplay) {
        return vrDisplay.getEyeParameters(this.type);
    }

    render(scene, monoCamera, renderer, vrDisplay, frameData, headMatrix) {
        if(vrDisplay) {
            const eyeParams = this.getEyeParams(vrDisplay);
            this.translation.fromArray(eyeParams.offset);

            const size = renderer.getSize();

            const renderRect = {
                x: Math.round(size.width * this.bounds[0]),
                y: Math.round(size.height * this.bounds[1]),
                width: Math.round(size.width * this.bounds[2]),
                height: Math.round(size.height * this.bounds[3])
            };

            const { camera, headToEyeMatrix } = this;
            monoCamera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);

            camera.projectionMatrix.elements = frameData[this.ProjectionMatrix];

            // Take the view matricies and multiply them by the head matrix, which
            // leaves only the head-to-eye transform.
            headToEyeMatrix.fromArray(frameData[this.ViewMatrix]);
            headToEyeMatrix.premultiply(headMatrix);
            headToEyeMatrix.getInverse(headToEyeMatrix);

            camera.updateMatrix();
            camera.applyMatrix(headToEyeMatrix);

            // Render eye view
            renderer.setViewport(renderRect.x, renderRect.y, renderRect.width, renderRect.height);
            renderer.setScissor(renderRect.x, renderRect.y, renderRect.width, renderRect.height);
            renderer.render(scene, camera);
        }
    }
}

EyeCamera.TYPE = {
    LEFT: 'left',
    RIGHT: 'right'
};

const defaultLeftBounds = [ 0.0, 0.0, 0.5, 1.0 ];
const defaultRightBounds = [ 0.5, 0.0, 0.5, 1.0 ];

function getDefaultBounds(eyeType) {
    if(eyeType === 'right') {
        return defaultRightBounds;
    } else {
        return defaultLeftBounds;
    }
}