import * as THREE from 'three';
import {PerspectiveCamera} from 'three'
import VRRenderer from './VRRenderer';
import Avatar from './Avatar';
import AvatarPrimary from './AvatarPrimary';
import Peering from './Peering';
import Replay from './Replay';

import Lobby from './rooms/lobby';

const $error = document.getElementById("error-container");
const $vrToggle = document.getElementById("vr-toggle");
const $resetPose = document.getElementById("reset-pose");
const $colorIndicator = document.getElementById("color-indicator");

const isCameraMode = location.hash === '#camera';

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
!isCameraMode && document.body.appendChild(stats.dom);

function showError(msg) {
    $error.innerHTML = msg;
    $error.style.display = !!msg ? 'inline' : 'none';
}

function updateButtons(supportsVr, isPresenting) {
    $vrToggle.style.display = supportsVr ? 'inline-block' : 'none';
    $vrToggle.innerHTML = isPresenting ? 'EXIT VR' : 'ENTER VR';

    $resetPose.style.display = supportsVr && isPresenting ? 'inline-block' : 'none';
}

let currentScene = new Lobby();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.visible = false;

const user = new AvatarPrimary(() => renderer.resetPose());
user.head.add(camera);

const renderer = new VRRenderer(user, window, onVrChange, showError);
document.body.appendChild(renderer.renderer.domElement);

const userBuffer = new ArrayBuffer(user.getBufferByteLength());
const otherAvatars = [];
currentScene.add(user);

// Indicate the color of your avatar
$colorIndicator.style.backgroundColor = `#${user.color.getHexString()}`;

const peering = new Peering((peer) => {
    const somebody = new Avatar();
    somebody.audio = peer.audio;
    otherAvatars.push(somebody);
    currentScene.add(somebody);
    const readFromBuffer = (buffer) => {
        somebody.fromBuffer(buffer);
    };
    const messageHandler = (event) => {
        if (event.detail.data.constructor.name == 'ArrayBuffer') {
            readFromBuffer(event.detail.data);
        } else {
            var fileReader = new FileReader();
            fileReader.onload = function() {
                readFromBuffer(this.result);
            };
            fileReader.readAsArrayBuffer(event.detail.data);
        }
    };
    peer.addEventListener('message', messageHandler);
    peer.addEventListener('close', (event) => {
        // remove avatar from scene
        otherAvatars.splice(otherAvatars.indexOf(somebody), 1);
        currentScene.remove(somebody);
        peer.removeEventListener('message', messageHandler);
    });
});

const replay = new Replay(peering);
const clock = new THREE.Clock();

function onResize () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
window.addEventListener("resize", onResize, false);
onResize();

function onVrChange(hasVr, isPresenting) {
    updateButtons(hasVr, isPresenting);
}
$vrToggle.onclick = () => {
    renderer.setPresenting(!renderer.isPresenting);
};
$resetPose.onclick = () => {
    renderer.resetPose();
};

function renderLoop() {
    stats.begin();

    const delta = clock.getDelta();

    for (const avatar of otherAvatars) {
        avatar.update(delta);
    }

    currentScene.update(delta, renderer);

    if(isCameraMode && currentScene.getSceneCamera()) {
        renderer.render(currentScene, currentScene.getSceneCamera());
    } else {
        user.update(delta);

        user.head.visible = false;
        renderer.render(currentScene, camera);
        user.head.visible = true;

        user.toBuffer(userBuffer);
        peering.send(userBuffer);
    }

    stats.end();
    renderer.requestAnimationFrame(renderLoop);
}

currentScene.initialize().then(() => {
    document.getElementById('loading').style.display = 'none';

    if(isCameraMode) {
        document.body.className = "camera-mode";

        user.visible = false;
        currentScene.remove(user);

        // Mover user to scene camera so audio is right
        currentScene.getSceneCamera().add(user);
    }

    renderLoop();
});

// debug stuff
Object.assign(window, {
    user,
    renderer,
    peering,
    replay
});
