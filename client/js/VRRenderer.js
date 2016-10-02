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
    constructor(avatar, renderer, onVrAvailableChange, onError) {
        this.avatar = avatar;
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

        // Cameras for HMD rendering
        this.leftEye = new EyeCamera(EyeCamera.TYPE.LEFT);
        this.rightEye = new EyeCamera(EyeCamera.TYPE.RIGHT);

        // Size of play area
        this.areaSize = { x: 0, z: 0 };
        this.standingMatrix = new Matrix4();

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
        }).catch((reason) => this.error(reason))
    }

    requestAnimationFrame(cb) {
        // TODO: vrDisplay.requestAnimationFrame does not seem to be working yet
        // const funcToCall = this.vrDisplay && this.isPresenting ? this.vrDisplay.requestAnimationFrame : window.requestAnimationFrame;
        // return funcToCall(cb);

        return window.requestAnimationFrame(cb);
    }

    render(scene, camera) {
        if(this.vrDisplay && this.isPresenting) {

            const {
                vrDisplay,
                renderer,
                frameData
            } = this;

            if(renderer.autoClear) {
                renderer.clear();
            }

            vrDisplay.depthNear = camera.near;
            vrDisplay.depthFar = camera.far;

            vrDisplay.getFrameData(frameData);
            this.avatar.updatePose(frameData.pose);

            // Update camera from avatar
            this.updateCameraLocation(camera);

            // TODO: Handle standing matrix
            if(this.vrDisplay.stageParameters) {
                this.standingMatrix.fromArray(this.vrDisplay.stageParameters.sittingToStandingTransform);
                this.areaSize.x = this.vrDisplay.stageParameters.sizeX;
                this.areaSize.z = this.vrDisplay.stageParameters.sizeZ;
                this.avatar.applyMatrix(this.standingMatrix);
            }

            // Render Eyes
            this.renderer.setScissorTest(true);
            this.leftEye.render(scene, camera, renderer, vrDisplay, frameData);
            this.rightEye.render(scene, camera, renderer, vrDisplay, frameData);
            this.renderer.setScissorTest(false);

            scene.autoUpdate = true;

            this.vrDisplay.submitFrame();
        } else {
            // Non-VR render
            this.avatar.updatePose();
            this.updateCameraLocation(camera);
            this.renderer.render(scene, camera);
        }
    }

    updateCameraLocation(camera) {
        // Lock camera to avatar head
        camera.position.copy(this.avatar.getWorldPosition());
        camera.quaternion.copy(this.avatar.getWorldQuaternion());
        camera.updateMatrixWorld();
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