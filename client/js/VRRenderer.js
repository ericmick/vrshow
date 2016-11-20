/**
 * THREE js based renderer calls for WebVR, based off of
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/effects/VREffect.js
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/VRControls.js
 *
 *  WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 */
import { Matrix4, WebGLRenderer, EventDispatcher } from 'three';
import EyeCamera from './EyeCamera';

const EVENTS = {
    VR_AVAILABLE: 'onvravailable',
    START_PRESENTING: 'onstartpresenting',
    STOP_Presenting: 'onstoppresenting',
    ERROR: 'onerror'
};

export default class VRRenderer extends EventDispatcher {
    constructor(avatar, window) {
        super();

        const renderer = this.renderer = new WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0xCCCCCC);
        renderer.autoClear = true;
        window.document.body.appendChild(renderer.domElement);

        this.avatar = avatar;
        this.vrDisplay = undefined;

        // Save these values from non-vr renderer
        //  for vr present changes
        this.pixelRatio = renderer.getPixelRatio();
        this.rendererSize = renderer.getSize();
        this.rendererUpdateStyle = false;
        this.frameData = !!window.VRFrameData ? new VRFrameData() : undefined;

        // Cameras for HMD rendering
        this.leftEye = new EyeCamera(EyeCamera.TYPE.LEFT);
        this.rightEye = new EyeCamera(EyeCamera.TYPE.RIGHT);

        // Attach eyes to head
        this.avatar.head.add(this.leftEye);
        this.avatar.head.add(this.rightEye);

        // Size of play area
        this.areaSize = { x: 0, z: 0 };
        this.standingMatrix = new Matrix4();

        // Enable shadows
        renderer.shadowMap.enabled = true;

        this.setupVrDisplay();
        this.addListeners(window);
    }

    isPresenting() {
        return this.vrDisplay && this.vrDisplay.isPresenting;
    }

    getVrDisplay() {
        if(!navigator.getVRDisplays) {
            return Promise.reject('Your browser does not support WebVR.');
        }

        return navigator.getVRDisplays().then((displays) => {
            return new Promise((resolve, reject) => {
                if (displays.length > 0) {
                    resolve(displays[0]);
                } else {
                    reject('No VR display was found.');
                }
            });
        });
    }

    setupVrDisplay() {
        this.getVrDisplay().then((display) => {
            this.vrDisplay = display;
            this.dispatchEvent({type: EVENTS.VR_AVAILABLE});


        }, () => {
            this.vrDisplay = undefined;
            // event?
        });
    }

    addListeners(window) {
        window.addEventListener('vrdisplaypresentchange', () => this.onVrPresentChange(), false);
        window.addEventListener('onvrdisplayconnect', () => this.setupVrDisplay(), false);
        window.addEventListener('onvrdisplaydisconnect', () => this.setupVrDisplay(), false);
    }

    error(msg) {
        this.dispatchEvent({
            type: EVENTS.ERROR,
            message: msg
        });
    }

    setSize(width, height, updateStyle) {
        if(this.isPresenting()) {
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
        const isPresenting = this.isPresenting();

        if(isPresenting) {
            this.dispatchEvent({type: EVENTS.START_PRESENTING});

            const layers = this.vrDisplay.getLayers();
            if(layers.length > 0) {
                this.leftEye.setBounds(layers[0].leftBounds);
                this.rightEye.setBounds(layers[0].rightBounds);

                const eyeParamsL = this.leftEye.getEyeParams(this.vrDisplay);
                this.renderer.setSize(eyeParamsL.renderWidth * 2, eyeParamsL.renderHeight, false);
                this.renderer.setPixelRatio(1);
            }
        } else {
            this.dispatchEvent({type: EVENTS.STOP_Presenting});
        }
    }

    setPresenting(willPresent) {
        const isPresenting = this.isPresenting();

        return new Promise((resolve, reject) => {
            if(!this.vrDisplay) {
                reject(new Error('No VR hardware.'));
            } else if(isPresenting === willPresent) {
                // In desired mode
                resolve();
            } else if(willPresent) {
                // Request present mode
                resolve(this.vrDisplay.requestPresent([{ source: this.renderer.domElement }]));
            } else {
                // Exit present mode
                resolve(this.vrDisplay.exitPresent());
            }
        }).catch((reason) => this.error(reason))
    }

    requestAnimationFrame(cb) {
        if(this.isPresenting() && this.vrDisplay.requestAnimationFrame) {
            return this.vrDisplay.requestAnimationFrame(cb);
        } else {
            return window.requestAnimationFrame(cb);
        }
    }

    render(scene, camera, renderTarget, forceClear) {
        const {
            vrDisplay,
            renderer,
            frameData
        } = this;

        if(this.isPresenting() && !renderTarget) {

            vrDisplay.depthNear = camera.near;
            vrDisplay.depthFar = camera.far;

            vrDisplay.getFrameData(frameData);
            this.avatar.updatePose(frameData.pose);

            // TODO: Handle standing matrix
            if(false && this.vrDisplay.stageParameters) {
                this.standingMatrix.fromArray(this.vrDisplay.stageParameters.sittingToStandingTransform);
                this.areaSize.x = this.vrDisplay.stageParameters.sizeX;
                this.areaSize.z = this.vrDisplay.stageParameters.sizeZ;
                this.avatar.applyMatrix(this.standingMatrix);
            }

            // Render Eyes
            renderer.setScissorTest(true);
            this.renderForEye(scene, this.leftEye);
            this.renderForEye(scene, this.rightEye);
            renderer.setScissorTest(false);

            scene.autoUpdate = true;

            this.vrDisplay.submitFrame();
        } else {
            const size = this.renderer.getSize();
            this.renderer.setViewport(0, 0, size.width, size.height);
            this.renderer.render(scene, camera, renderTarget, forceClear);
        }
    }
    
    renderNonVR(scene, camera, renderTarget, forceClear) {
        const size = this.renderer.getSize();
        this.renderer.setViewport(0, 0, size.width, size.height);
        this.renderer.render(scene, camera, renderTarget, forceClear);
    }

    renderForEye(scene, eye) {
        const renderRect = eye.getRenderRect(this.renderer.getSize(), this.frameData);
        this.renderer.setViewport(renderRect.x, renderRect.y, renderRect.width, renderRect.height);
        this.renderer.setScissor(renderRect.x, renderRect.y, renderRect.width, renderRect.height);
        this.renderer.render(scene, eye);
    }

    resetPose() {
        if(this.vrDisplay) {
            return this.vrDisplay.resetPose();
        }
    }
}