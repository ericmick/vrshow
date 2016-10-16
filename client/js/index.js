import * as THREE from 'three';
import { Scene, PerspectiveCamera} from 'three'
import VRRenderer from './VRRenderer';
import Avatar from './Avatar';
import AvatarPrimary from './AvatarPrimary';
import Peering from './Peering';
import Replay from './Replay';

const $error = document.getElementById("error-container");
const $vrToggle = document.getElementById("vr-toggle");
const $resetPose = document.getElementById("reset-pose");
const $colorIndicator = document.getElementById("color-indicator");

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

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
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.visible = false;

const user = new AvatarPrimary(() => renderer.resetPose());
user.head.add(camera);

const renderer = new VRRenderer(user, window, onVrChange, showError);
document.body.appendChild(renderer.renderer.domElement);

const userBuffer = new ArrayBuffer(user.getBufferByteLength());
const otherAvatars = [];
scene.add(user);

// Indicate the color of your avatar
$colorIndicator.style.backgroundColor = `#${user.color.getHexString()}`;

const peering = new Peering((peer) => {
    const somebody = new Avatar();
    somebody.audio = peer.audio;
    otherAvatars.push(somebody);
    scene.add(somebody);
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
        scene.remove(somebody);
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

function generateWorld(scene) {
    const planeWidth = 256,
          planeHeight = 256;
    const loader = new THREE.TextureLoader();

    const seed = 'tony';
    const displacementMap = loader.load(`/api/map/${seed}`);
    const textureMap = loader.load(`/api/texture/${seed}`);
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 512-1, 512-1);
    const material = new THREE.MeshPhongMaterial({
        map: textureMap,
        displacementMap: displacementMap,
        displacementScale: 40,
        displacementBias: 0,
        color: 0xcccccc
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotateX(-Math.PI/2);
    mesh.position.set(0,-30,0);

    scene.add(mesh);
}

let room, renderTarget, sceneCamera, monitor;
function init() {

    sceneCamera = new THREE.PerspectiveCamera(80, 16/9, 0.1, 1000);
    sceneCamera.rotateY(Math.PI);
    sceneCamera.position.setZ(1);
    renderTarget = new THREE.WebGLRenderTarget( 512, 512, { format: THREE.RGBFormat } );

    var monitorGeometry = new THREE.BoxGeometry(1, 9/16, 1);
    monitor = new THREE.Mesh( monitorGeometry, new THREE.MeshBasicMaterial({
        map: renderTarget.texture
    }));
    monitor.add(sceneCamera);
    // TODO: investigate, Camera causing big performance hit
    // var cameraLight = new THREE.PointLight(0xffffff, 0.5, 20);
    // monitor.add(cameraLight);
    monitor.position.set(0,2,-5);
    scene.add(monitor);

    generateWorld(scene);

    room = new THREE.Mesh(
        new THREE.BoxGeometry( 18, 18, 18, 20, 20, 20 ),
        new THREE.MeshBasicMaterial( { color: 0x40AB40, wireframe: true } )
    );
    scene.add(room);
    
    var floor = new THREE.Mesh(
        new THREE.BoxGeometry(18.5, 36, 18.5, 20, 20, 20),
        new THREE.MeshLambertMaterial({ color: 0x707070 })
    );
    floor.position.set(0, -18, 0);
    scene.add(floor);

    var light = new THREE.HemisphereLight( 0xbbbbff, 0x080808, .2 );
    scene.add( light );

    light = new THREE.AmbientLight( 0x101010 ); // soft white light
    scene.add( light );

    light = new THREE.DirectionalLight( 0x886677 );
    light.position.set( .5, 1, .5 ).normalize();
    scene.add(light);
    
    light = new THREE.PointLight(0xffffff, 0.5, 20);
    light.position.set( 0, 7, 0 );
    scene.add(light);
    
    document.getElementById('loading').style.display = 'none';
}

function renderScene() {
    renderer.requestAnimationFrame(renderScene);
    stats.begin();

    const delta = clock.getDelta();
    
    for (const avatar of otherAvatars) {
        avatar.update(delta);
    }

    user.update(delta);

    monitor.visible = false;
    user.head.visible = true;
    renderer.render(scene, sceneCamera, renderTarget, true);
    monitor.visible = true;
    user.head.visible = false;

    renderer.render(scene, camera);

    user.toBuffer(userBuffer);
    peering.send(userBuffer);

    stats.end();
}

init();
renderScene();

// debug stuff
Object.assign(window, {
    user,
    renderer,
    peering,
    scene,
    replay
});
