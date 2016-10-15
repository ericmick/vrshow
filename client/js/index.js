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
    otherAvatars.push(somebody);
    scene.add(somebody);
    const readFromBuffer = (buffer) => {
        somebody.fromBuffer(buffer);
        if(peer.audio) {
            peer.audio.setPosition(
                new THREE.Vector3().setFromMatrixPosition(somebody.head.matrixWorld)
            );
        }
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
    renderTarget = new THREE.WebGLRenderTarget( 512, 512, { format: THREE.RGBFormat } );

    var monitorGeometry = new THREE.BoxGeometry(16/9, 1, 16/9);
    monitor = new THREE.Mesh( monitorGeometry, new THREE.MeshBasicMaterial({
        map: renderTarget.texture
    }));
    monitor.add(sceneCamera);
    var cameraLight = new THREE.PointLight(0xffffff, 0.5, 20);
    monitor.add(cameraLight);
    monitor.position.set(0,2,-5);
    monitor.rotateY(Math.PI);
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

    var geometry = new THREE.BoxGeometry( 0.15, 0.15, 0.15 );
    for ( var i = 0; i < 50; i ++ ) {
        var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        object.position.x = Math.random() * 4 - 2;
        object.position.y = Math.random() * 2;
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
    
    document.getElementById('loading').style.display = 'none';
}

function renderScene() {
    renderer.requestAnimationFrame(renderScene);
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
        if ( cube.position.y <  .1 || cube.position.y > limit ) {
            cube.position.y = THREE.Math.clamp( cube.position.y, .1, limit );
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

    user.update(delta);

    monitor.visible = false;
    user.head.visible = true;
    renderer.render(scene, sceneCamera, renderTarget, true);
    monitor.visible = true;
    user.head.visible = false;
    renderer.render(scene, camera);

    user.toBuffer(userBuffer);
    peering.send(userBuffer);
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
