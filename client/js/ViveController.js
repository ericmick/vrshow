/**
 * THREE.js Vive controller class based on:
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/ViveController.js
 */
import { Object3D, Matrix4, OBJLoader, TextureLoader } from 'three';

const ButtomMap = {
    thumbpad: 0,
    trigger: 1,
    grips: 2,
    menu: 3
};

const VIVE_CONTROLLER_MODEL_DIR = 'models/vive-controller/';

export default class ViveController extends Object3D {
    constructor(controllerNum) {
        super();

        this.controllerNum = controllerNum;
        this.matrixAutoUpdate = false;
        this.gamepad = null;

        // Controller buttons
        this.axes = [ 0, 0 ];
        this.isPressed = [false, false, false, false];

        // Create button getters
        for(let key in ButtomMap) {
            const val = ButtomMap[key];
            this[`is${capitalize(key)}Pressed`] = () => this.isPressed[val];
        }

        const loader = new OBJLoader();
        loader.setPath(VIVE_CONTROLLER_MODEL_DIR);
        loader.load('vr_controller_vive_1_5.obj', (obj) => {
            const loader = new TextureLoader();
            loader.setPath(VIVE_CONTROLLER_MODEL_DIR);
            const controller = obj.children[0];
            controller.material.map = loader.load('onepointfive_texture.png');
            controller.material.specularMap = loader.load('onepointfive_spec.png');
            this.add(obj);
        });
    }

    update() {
        const gamepad = this.gamepad = findGamepad(this.controllerNum);

        if(gamepad && gamepad.pose) {
            //  Position and orientation.
            const pose = gamepad.pose;
            pose.position && this.position.fromArray(pose.position);
            pose.orientation && this.quaternion.fromArray(pose.orientation);
            this.matrix.compose(this.position, this.quaternion, this.scale);
            this.matrixWorldNeedsUpdate = true;
            this.updateMatrixWorld();
            this.visible = true;

            //  Thumbpad touch surface
            const axes = this.axes;
            if(axes[0] !== gamepad.axes[0] || axes[1] !== gamepad.axes[1]) {
                axes[0] = gamepad.axes[0]; //  X axis: -1 = Left, +1 = Right.
                axes[1] = gamepad.axes[1]; //  Y axis: -1 = Bottom, +1 = Top.
                this.dispatchEvent({ type: 'axischanged', axes: axes });
            }

            // Buttons
            for(let key in ButtomMap) {
                const val = ButtomMap[key];
                const gamepadPressed = gamepad.buttons[val].pressed;
                if(this.isPressed[val] !== gamepadPressed) {
                    this.isPressed[val] = gamepadPressed;
                    const type = key + (gamepadPressed ? 'down' : 'up');
                    this.dispatchEvent({type});
                }
            }
        } else {
            this.visible = false;
        }
    }

    getAxes() {
        return this.axes;
    }
}

function findGamepad(controllerNum) {
    // Iterate across gamepads to find
    //  Vive Controllers
    const gamepads = navigator.getGamepads();
    for(let i=0, j=0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if(gamepad && gamepad.id === 'OpenVR Gamepad') {
            if(j === controllerNum) {
                return gamepad;
            } else {
                j++;
            }
        }
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}