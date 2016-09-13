/**
 * THREE.js Vive controller class based on:
 *  https://github.com/mrdoob/three.js/blob/dev/examples/js/ViveController.js
 */
import { Object3D, Matrix4 } from 'three';

const ButtomMap = {
    thumbpad: 0,
    trigger: 1,
    grips: 2,
    menu: 3
};

export default class ViveController extends Object3D {
    constructor(id) {
        super();

        this.matrixAutoUpdate = false;
        this.standingMatrix = new Matrix4();
        this.gamepad = findGamepad(id);

        // Controller buttons
        this.axes = [ 0, 0 ];
        this.isPressed = [false, false, false, false];

        // Create button getters
        ButtomMap.forEach((val, key) => {
            this[`is${capitalize(key)}Pressed`] = () => this.isPressed[val];
        });
    }

    update() {
        const gamepad = this.gamepad = findGamepad(id);

        if(gamepad && gamepad.pose) {
            //  Position and orientation.
            const pose = gamepad.pose;

            this.position.fromArray(pose.position);
            this.quaternion.fromArray(pose.orientation);
            this.matrix.compose(this.position, this.quaternion, this.scale );
            this.matrix.multiplyMatrices(this.standingMatrix, this.matrix);
            this.matrixWorldNeedsUpdate = true;
            this.visible = true;

            //  Thumbpad touch surface
            const axes = this.axes;
            if(axes[0] !== gamepad.axes[0] || axes[1] !== gamepad.axes[1]) {
                axes[0] = gamepad.axes[0]; //  X axis: -1 = Left, +1 = Right.
                axes[1] = gamepad.axes[1]; //  Y axis: -1 = Bottom, +1 = Top.
                this.dispatchEvent({ type: 'axischanged', axes: axes });
            }

            // Buttons
            ButtomMap.forEach((val, key) => {
                const gamepadPressed = gamepad.buttons[val].pressed;
                if(this.isPressed[key] !== gamepadPressed) {
                    this.isPressed[key] = gamepadPressed;
                    const type = key + (gamepadPressed ? 'down' : 'up');
                    this.event.dispatchEvent({type});
                }
            });
        } else {
            this.visible = false;
        }
    }

    getAxes() {
        return this.axes;
    }
}

function findGamepad(id) {
    // Iterate across gamepads to find
    //  Vive Controllers
    const gamepads = navigator.getGamepads();
    for(let i=0, j=0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if(gamepad.id === 'OpenVR Gamepad') {
            if(j === id) {
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