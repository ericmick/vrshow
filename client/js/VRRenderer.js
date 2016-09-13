/**
 * THREE js based renderer calls for WebVR, based off of
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/effects/VREffect.js
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/VRControls.js
 *
 *  WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 */

import { Vector3, Matrix4, Quaternion } from 'three';
import EyeCamera from './EyeCamera';

export default class VRRenderer {
    constructor(renderer, onVrAvailableChange, onError) {
        this.renderer = renderer;
        this.onVrAvailableChange = onVrAvailableChange;
        this.onError = onError;
        this.isPresenting = false;
        this.vrDisplay = undefined;

        // Save these values from non-vr renderer
        //  for vr present changes
        this.pixelRatio = renderer.getPixelRatio();
        this.rendererSize = renderer.getSize();
        this.rendererUpdateStyle = false;
        this.canvas = renderer.domElement;
        this.frameData = !!window.VRFrameData ? new VRFrameData() : undefined;

        this.leftEye = new EyeCamera(EyeCamera.TYPE.LEFT);
        this.rightEye = new EyeCamera(EyeCamera.TYPE.RIGHT);
        /*
            Vectors and Matrices used for VR rendering
         */
        this.posePosition = new Vector3();
        this.poseOrientation = new Quaternion();
        this.headMatrix = new Matrix4();
        this.standingMatrix = new Matrix4();

        // Size of play area
        this.areaSize = { x: 0, z: 0 };

        /*
            Initialize
         */
        if(typeof this.onVrAvailableChange === 'function') {
            this.onVrAvailableChange(false, false);
        }
        this.updateVrDisplay();
        this.addListeners();
    }

    updateVrDisplay() {
        const hadVr = !!this.vrDisplay;
        const informChange = (display) => {
            const hasVr = !!display;
            if(hadVr !== hasVr && typeof this.onVrAvailableChange === 'function') {
                this.onVrAvailableChange(hasVr);
            }

            this.vrDisplay = hasVr ? display : undefined;
        };

        if(navigator.getVRDisplays) {
            navigator.getVRDisplays().then((displays) => {
                if (displays.length > 0) {
                    informChange(displays[0]);
                } else {
                    informChange();
                    this.onError('No VR display was found.');
                }
            }).catch(() => informChange());
        } else {
            informChange();
            this.error('Your browser does not support WebVR.');
        }
    }

    addListeners() {
        window.addEventListener('vrdisplaypresentchange', () => this.onVrPresentChange(), false);
        window.addEventListener('onvrdisplayconnect', () => this.updateVrDisplay(), false);
        window.addEventListener('onvrdisplaydisconnect', () => this.updateVrDisplay(), false);
    }

    error(msg) {
        if(typeof this.onError === 'function') {
            this.onError(msg);
        }
    }

    setSize(width, height, updateStyle) {
        if(this.isPresenting) {
            const eyeParamsL = this.leftEye.getEyeParams(this.vrDisplay);
            this.renderer.setPixelRatio(1);
            this.renderer.setSize(eyeParamsL.renderWidth * 2, eyeParamsL.renderHeight, false);
        } else {
            this.rendererSize = { width: width, height: height };
            this.rendererUpdateStyle = updateStyle;
            this.renderer.setPixelRatio(this.pixelRatio);
            this.renderer.setSize(width, height, this.rendererUpdateStyle);
        }
    }

    onVrPresentChange() {
        const wasPresenting = this.isPresenting;
        this.isPresenting = this.vrDisplay && this.vrDisplay.isPresenting;

        if(typeof this.onVrAvailableChange === 'function' && wasPresenting != this.isPresenting) {
            this.onVrAvailableChange(this.vrDisplay !== undefined, this.isPresenting);
        }

        if(this.isPresenting) {
            const layers = this.vrDisplay.getLayers();
            if(layers.length > 0) {
                this.leftEye.setBounds(layers[0].leftBounds);
                this.rightEye.setBounds(layers[0].rightBounds);
            }

            if(!wasPresenting) {
                this.setSize();
            }
        } else if(wasPresenting) {
            this.renderer.setPixelRatio(this.pixelRatio);
            this.renderer.setSize(this.rendererSize.width, this.rendererSize.height, this.rendererUpdateStyle);
        }
    }

    setPresenting(willPresent) {
        return new Promise((resolve, reject) => {
            if(!this.vrDisplay) {
                reject(new Error('No VR hardware.'));
            } else if(this.isPresenting === willPresent) {
                // In desired mode
                resolve();
            } else if(willPresent) {
                // Request present mode
                resolve(this.vrDisplay.requestPresent([{ source: this.canvas }]));
            } else {
                // Exit present mode
                resolve(this.vrDisplay.exitPresent());
            }
        })
    }

    requestAnimationFrame(cb) {
        const funcToCall = this.vrDisplay && this.isPresenting ? this.vrDisplay.requestAnimationFrame : window.requestAnimationFrame;
        //return funcToCall(cb);

        return window.requestAnimationFrame(cb);
    }

    render(scene, camera) {
        if(this.vrDisplay && this.isPresenting) {

            const {
                vrDisplay,
                renderer,
                frameData,
                posePosition,
                poseOrientation,
                headMatrix
            } = this;

            if(renderer.autoClear) {
                renderer.clear();
            }
            camera.updateMatrixWorld();
            vrDisplay.depthNear = camera.near;
            vrDisplay.depthFar = camera.far;

            vrDisplay.getFrameData(frameData);

            // Update positions
            // Compute the matrix for the position of the head based on the pose
            if(frameData.pose.orientation) {
                poseOrientation.fromArray(frameData.pose.orientation);
                headMatrix.makeRotationFromQuaternion(poseOrientation);
                camera.quaternion.fromArray(frameData.pose.orientation);
            } else {
                headMatrix.identity();
            }

            if(frameData.pose.position) {
                posePosition.fromArray(frameData.pose.position);
                headMatrix.setPosition(posePosition);
                camera.position.fromArray(frameData.pose.position);
            }

            if(false &&this.vrDisplay.stageParameters) {
                this.standingMatrix.fromArray(this.vrDisplay.stageParameters.sittingToStandingTransform);
                this.areaSize.x = this.vrDisplay.stageParameters.sizeX;
                this.areaSize.z = this.vrDisplay.stageParameters.sizeZ;
                camera.applyMatrix(this.standingMatrix);
            } else {
                posePosition.setY(posePosition.y + defaultUserHeight);
            }



            // Render Eyes
            this.renderer.setScissorTest(true);
            this.leftEye.render(scene, camera, renderer, vrDisplay, frameData, headMatrix);
            this.rightEye.render(scene, camera, renderer, vrDisplay, frameData, headMatrix);
            this.renderer.setScissorTest(false);

            scene.autoUpdate = true;

            this.vrDisplay.submitFrame();
        } else {
            // Non-VR render
            this.renderer.render(scene, camera);
        }
    }

    updateCameraLocation() {

    }

    resetPose() {
        if(this.vrDisplay) {
            return this.vrDisplay.resetPose();
        }
    }

    getStandingMatrix() {
        return this.standingMatrix;
    }
}

// Distance from the users eyes to the floor in meters. Used when
// the VRDisplay doesn't provide stageParameters.
const defaultUserHeight = 1.6;