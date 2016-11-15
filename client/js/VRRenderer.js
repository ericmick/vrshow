/**
 * THREE js based renderer calls for WebVR, based off of
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/effects/VREffect.js
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/VRControls.js
 *
 *  WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 */
import { Matrix4, WebGLRenderer } from 'three';
import EyeCamera from './EyeCamera';

export default class VRRenderer {
    constructor(avatar, window, onVrAvailableChange, onError) {
        const renderer = this.renderer = new WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0xCCCCCC);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.autoClear = true;

        this.avatar = avatar;
        this.onVrAvailableChange = onVrAvailableChange;
        this.onError = onError;
        this.isPresenting = false;
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

        /*
            Initialize
         */
        if(typeof this.onVrAvailableChange === 'function') {
            this.onVrAvailableChange(false, false);
        }

        this.updateVrDisplay();
        this.addListeners(window);
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

    addListeners(window) {
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
                resolve(this.vrDisplay.requestPresent([{ source: this.renderer.domElement }]));
            } else {
                // Exit present mode
                resolve(this.vrDisplay.exitPresent());
            }
        }).catch((reason) => this.error(reason))
    }

    requestAnimationFrame(cb) {
        if(this.vrDisplay && this.isPresenting && this.vrDisplay.requestAnimationFrame) {
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

        if(vrDisplay && this.isPresenting && !renderTarget) {

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