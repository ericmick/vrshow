/**
 * Class to represent an eye in VR.
 */

import { Matrix4, Camera } from 'three';

export default class EyeCamera extends Camera {
    constructor(eyeType) {
        super();

        this.viewMatrix = new Matrix4();
        this.type = eyeType;
        this.bounds = getDefaultBounds(eyeType);
        this.layers.enable(1);

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

    getRenderRect(size, frameData) {
        this.projectionMatrix.elements = frameData[this.ProjectionMatrix];

        return {
            x: Math.round(size.width * this.bounds[0]),
            y: Math.round(size.height * this.bounds[1]),
            width: Math.round(size.width * this.bounds[2]),
            height: Math.round(size.height * this.bounds[3])
        };
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