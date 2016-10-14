import * as THREE from 'three';
import { Scene, WebGLRenderer, PerspectiveCamera} from 'three'
import VRRenderer from './VRRenderer';
import Avatar from './Avatar';
import AvatarPrimary from './AvatarPrimary';
import Peering from './Peering';
import Keyboard from './Keyboard';
import TouchScreen from './TouchScreen';
import Replay from './Replay';

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

const user = new AvatarPrimary(() => vrRenderer.resetPose());
const userBuffer = new ArrayBuffer(user.getBufferByteLength());
const otherAvatars = [];
scene.add(user);
// Indicate the color of your avatar
$colorIndicator.style.backgroundColor = `#${user.color.getHexString()}`;
const peering = window.peering = new Peering((peer) => {
    const somebody = new Avatar();
    otherAvatars.push(somebody);
    scene.add(somebody);
    const readFromBuffer = (buffer) => {
        somebody.fromBuffer(buffer);
        if(peer.audio) {
            peer.audio.setPosition(
                new THREE.Vector3().setFromMatrixPosition(somebody.head.matrixWorld)
            );
        }
    }
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
        scene.remove(somebody);
        peer.removeEventListener('message', messageHandler);
    });
});

const replay = new Replay(peering);

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
        new THREE.BoxGeometry( 18, 18, 18, 20, 20, 20 ),
        new THREE.MeshBasicMaterial( { color: 0x40AB40, wireframe: true } )
    );
    room.rotateY(Math.PI/4);
    scene.add(room);

    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add(light);
    
    light = new THREE.AmbientLight(0x505050);
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
        object.userData.velocity.x = Math.random() - 0.5;
        object.userData.velocity.y = Math.random() - 0.5;
        object.userData.velocity.z = Math.random() - 0.5;
        room.add( object );
    }
}

function render() {
    vrRenderer.requestAnimationFrame(render);
    const delta = clock.getDelta();
    const limit = room.geometry.parameters.width / 2;

    for ( let i = 0; i < room.children.length; i ++ ) {
        let cube = room.children[ i ];
        if ( cube.geometry instanceof THREE.BoxGeometry === false ) continue;
        // cube.position.add( cube.userData.velocity );
        if ( cube.position.x < - limit || cube.position.x > limit ) {
            cube.position.x = THREE.Math.clamp( cube.position.x, - limit, limit );
            cube.userData.velocity.x = - cube.userData.velocity.x;
        }
        if ( cube.position.y < - limit || cube.position.y > limit ) {
            cube.position.y = THREE.Math.clamp( cube.position.y, - limit, limit );
            cube.userData.velocity.y = - cube.userData.velocity.y;
        }
        if ( cube.position.z < - limit || cube.position.z > limit ) {
            cube.position.z = THREE.Math.clamp( cube.position.z, - limit, limit );
            cube.userData.velocity.z = - cube.userData.velocity.z;
        }
        cube.position.x += cube.userData.velocity.x * delta;
        cube.position.y += cube.userData.velocity.y * delta;
        cube.position.z += cube.userData.velocity.z * delta;
        cube.rotation.x += cube.userData.velocity.x * delta;
        cube.rotation.y += cube.userData.velocity.y * delta;
        cube.rotation.z += cube.userData.velocity.z * delta;
    }
    
    for (const avatar of otherAvatars) {
        avatar.update(delta);
    }

    if (keyboard.isPressed('w') || keyboard.isPressed('W')) {
        user.moveForward(delta);
    }
    if (keyboard.isPressed('a') || keyboard.isPressed('A')) {
        user.turnLeft(delta);
    }
    if (keyboard.isPressed('s') || keyboard.isPressed('S')) {
        user.moveBackward(delta);
    }
    if (keyboard.isPressed('d') || keyboard.isPressed('D')) {
        user.turnRight(delta);
    }
    user.moveForward(touchScreen.consumeDeltaY() * 0.01);
    user.update(delta);
    vrRenderer.render(scene, camera);

    user.toBuffer(userBuffer);
    peering.send(userBuffer);
}

init();
render();

// debug stuff
Object.assign(window, {
    user,
    vrRenderer,
    peering,
    scene,
    touchScreen,
    replay
});
