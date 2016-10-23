import * as THREE from 'three';
import {PerspectiveCamera} from 'three'
import VRRenderer from './VRRenderer';
import AvatarPrimary from './AvatarPrimary';
import RoomManager from './RoomManager';

const $error = document.getElementById("error-container");
const $vrToggle = document.getElementById("vr-toggle");
const $resetPose = document.getElementById("reset-pose");
const $colorIndicator = document.getElementById("color-indicator");
const $newRoom = document.getElementById("new-room");

const isCameraMode = location.hash === '#camera';

const stats = new Stats();
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

const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.visible = false;

const user = new AvatarPrimary(() => renderer.resetPose());
user.head.add(camera);

const renderer = new VRRenderer(user, window, onVrChange, showError);
document.body.appendChild(renderer.renderer.domElement);

const roomManager = new RoomManager(user);

$newRoom.onclick =() =>{
    roomManager.toggleRooms();
};

// Indicate the color of your avatar
$colorIndicator.style.backgroundColor = `#${user.color.getHexString()}`;

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

    roomManager.update(delta, renderer);

    const currentScene = roomManager.currentScene;
    if(isCameraMode && currentScene.getSceneCamera()) {
        renderer.render(currentScene, currentScene.getSceneCamera());
    } else {
        user.update(delta);

        user.head.visible = false;
        renderer.render(currentScene, camera);
        user.head.visible = true;
    }

    stats.end();
    renderer.requestAnimationFrame(renderLoop);
}

// Enter initial room
roomManager.changeRooms(null, 'lobby').then(() => {
    document.getElementById('loading').style.display = 'none';

    if(isCameraMode) {
        document.body.className = "camera-mode";

        user.visible = false;
        roomManager.currentScene.remove(user);

        // Mover user to scene camera so audio is right
        roomManager.currentScene.getSceneCamera().add(user);
    }

    // Start rendering
    renderLoop();
});

// debug stuff
Object.assign(window, {
    user,
    renderer
});