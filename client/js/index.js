import * as THREE from 'three';
import { Scene, WebGLRenderer, PerspectiveCamera} from 'three'
import VRRenderer from './VRRenderer';
import Avatar from './Avatar';
import AvatarPrimary from './AvatarPrimary';
import Peering from './Peering';
import Keyboard from './Keyboard';
import TouchScreen from './TouchScreen';

const $error = document.getElementById("error-container");
const $vrToggle = document.getElementById("vr-toggle");
const $resetPose = document.getElementById("reset-pose");
const $colorIndicator = document.getElementById("color-indicator");

function showError(msg) {
    $error.innerHTML = msg;
    $error.style.display = !!msg ? 'inline' : 'none';
}

function updateButtons(supportsVr, isPresenting) {
    $vrToggle.style.display = supportsVr ? 'inline-block' : 'none';
    $vrToggle.innerHTML = isPresenting ? 'EXIT VR' : 'ENTER VR';

    $resetPose.style.display = supportsVr && isPresenting ? 'inline-block' : 'none';
}

const scene = new Scene();
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xCCCCCC);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = true;
document.body.appendChild(renderer.domElement);

const user = new AvatarPrimary();
scene.add(user);
// Indicate the color of your avatar
$colorIndicator.style.backgroundColor = `#${user.color.getHexString()}`;
const peering = window.peering = new Peering((peer) => {
    const somebody = new Avatar();
    scene.add(somebody);

    peer.dataChannel.addEventListener('message', (event) => {
        somebody.fromBlob(event.data);
        if (somebody.position && user.position && peer.audio) {
            const audioPosition = new THREE.Vector3();
            audioPosition.subVectors(somebody.position, user.position);
            if (user.quaternion) {
                audioPosition.applyQuaternion(user.quaternion);
            }
            peer.audio.setPosition(audioPosition);
        }
    });
    peer.dataChannel.addEventListener('close', (event) => {
        // remove avatar from scene
        scene.remove(somebody);
    });
});

setInterval(() => {
    peering.send(user.toBlob());
}, 60);


const vrRenderer = new VRRenderer(user, renderer, onVrChange, showError);
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const clock = new THREE.Clock();

function onResize () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    vrRenderer.setSize(width, height);
}
window.addEventListener("resize", onResize, false);
onResize();

function onVrChange(hasVr, isPresenting) {
    updateButtons(hasVr, isPresenting);
}
$vrToggle.onclick = () => {
    vrRenderer.setPresenting(!vrRenderer.isPresenting);
};
$resetPose.onclick = () => {
    vrRenderer.resetPose();
};

const keyboard = new Keyboard();
const touchScreen = new TouchScreen();

let room;
function init() {

    room = new THREE.Mesh(
        new THREE.BoxGeometry( 6, 6, 6, 8, 8, 8 ),
        new THREE.MeshBasicMaterial( { color: 0x404040, wireframe: true } )
    );
    scene.add(room);

    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add(light);

    var geometry = new THREE.BoxGeometry( 0.15, 0.15, 0.15 );
    for ( var i = 0; i < 50; i ++ ) {
        var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = Math.random() * 4 - 2;
        object.position.y = Math.random() * 4 - 2;
        object.position.z = Math.random() * 4 - 2;
        object.rotation.x = Math.random() * 2 * Math.PI;
        object.rotation.y = Math.random() * 2 * Math.PI;
        object.rotation.z = Math.random() * 2 * Math.PI;
        object.scale.x = Math.random() + 0.5;
        object.scale.y = Math.random() + 0.5;
        object.scale.z = Math.random() + 0.5;
        object.userData.velocity = new THREE.Vector3();
        object.userData.velocity.x = Math.random() * 0.01 - 0.005;
        object.userData.velocity.y = Math.random() * 0.01 - 0.005;
        object.userData.velocity.z = Math.random() * 0.01 - 0.005;
        room.add( object );
    }
}

function render() {
    vrRenderer.requestAnimationFrame(render);
    const delta = clock.getDelta() * 60;

    for ( var i = 0; i < room.children.length; i ++ ) {
        var cube = room.children[ i ];
        if ( cube.geometry instanceof THREE.BoxGeometry === false ) continue;
        // cube.position.add( cube.userData.velocity );
        if ( cube.position.x < - 3 || cube.position.x > 3 ) {
            cube.position.x = THREE.Math.clamp( cube.position.x, - 3, 3 );
            cube.userData.velocity.x = - cube.userData.velocity.x;
        }
        if ( cube.position.y < - 3 || cube.position.y > 3 ) {
            cube.position.y = THREE.Math.clamp( cube.position.y, - 3, 3 );
            cube.userData.velocity.y = - cube.userData.velocity.y;
        }
        if ( cube.position.z < - 3 || cube.position.z > 3 ) {
            cube.position.z = THREE.Math.clamp( cube.position.z, - 3, 3 );
            cube.userData.velocity.z = - cube.userData.velocity.z;
        }
        cube.position.x += cube.userData.velocity.x * delta;
        cube.position.y += cube.userData.velocity.y * delta;
        cube.position.z += cube.userData.velocity.z * delta;
        cube.rotation.x += cube.userData.velocity.x * delta;
        cube.rotation.y += cube.userData.velocity.y * delta;
        cube.rotation.z += cube.userData.velocity.z * delta;
    }

    if (keyboard.isPressed('w')) {
        user.moveForward(delta * 0.01);
    }
    if (keyboard.isPressed('a')) {
        user.turnLeft(delta * 0.02);
    }
    if (keyboard.isPressed('s')) {
        user.moveBackward(delta * 0.01);
    }
    if (keyboard.isPressed('d')) {
        user.turnRight(delta * 0.02);
    }
    user.moveForward(touchScreen.consumeDeltaY() * 0.005);
    user.update();
    vrRenderer.render(scene, camera);
}

init();
render();

// debug stuff
Object.assign(window, {
    user,
    vrRenderer,
    peering,
    scene,
    touchScreen
});
