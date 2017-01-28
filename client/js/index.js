import * as THREE from 'three';
import {PerspectiveCamera} from 'three'
import VRRenderer from './VRRenderer';
import AvatarPrimary from './AvatarPrimary';
import RoomManager from './RoomManager';

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const $controlDiv = document.getElementById('browser-controls');
const $error = $controlDiv.querySelector('#error-container');
const $vrToggle = $controlDiv.querySelector('#vr-toggle');

function showError(msg) {
    $error.innerHTML = msg;
    $error.style.display = !!msg ? 'inline' : 'none';
}

function toggleVrMode(isVr) {
    $controlDiv.classList.toggle('vr-mode', isVr);
}

function toggleLoadingMask(isLoading) {
    $controlDiv.classList.toggle('loading', isLoading);
}

const user = new AvatarPrimary();
const renderer = new VRRenderer(user, window);
const roomManager = new RoomManager(user);

// Setup camera that displays in the browser
const browserCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
browserCamera.visible = false;
user.head.add(browserCamera);
user.camera = browserCamera;

function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    browserCamera.aspect = width/height;
    browserCamera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
window.addEventListener("resize", onResize, false);
onResize();

// Connect UI to renderer
$vrToggle.onclick = () => {
    renderer.setPresenting(true);
};

renderer.addEventListener('onstartpresenting', () => toggleVrMode(true));
renderer.addEventListener('onstoppresenting', () => toggleVrMode(false));
renderer.addEventListener('onerror', (e) => showError(e.message));

const clock = new THREE.Clock();
function renderLoop() {
    stats.begin();

    const delta = clock.getDelta();

    roomManager.update(delta, renderer);

    stats.end();
    renderer.requestAnimationFrame(renderLoop);
}

const loadRoom = () => {
    const hash = document.location.hash.replace(/^#/, '');

    return roomManager.changeRooms(null, hash || 'vestibule').then(() => {
        toggleLoadingMask(false);
    });
}

window.addEventListener("hashchange", loadRoom);

// Enter initial room
loadRoom().then(() => {
    // Start rendering
    renderLoop();
});


// debug stuff
Object.assign(window, {
    user,
    renderer,
    roomManager
});