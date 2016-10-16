/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import { Object3D, Scene } from 'three';

export default class Lobby extends Scene {
    constructor() {
        super();
    }

    initialize() {
        this.sceneCamera = new THREE.PerspectiveCamera(80, 16/9, 0.1, 1000);
        this.renderTarget = new THREE.WebGLRenderTarget( 512, 512, { format: THREE.RGBFormat } );

        // Create camera box
        const monitorGeometry = new THREE.BoxGeometry(16/9, 1, 16/9);
        this.monitor = new THREE.Mesh(monitorGeometry, new THREE.MeshBasicMaterial({
            map: this.renderTarget.texture
        }));
        this.monitor.add(this.sceneCamera);
        this.monitor.position.set(0,2,-5);
        this.monitor.rotateY(Math.PI);
        this.add(this.monitor);

        // Matrix room
        const room = new THREE.Mesh(
            new THREE.BoxGeometry( 18, 18, 18, 20, 20, 20 ),
            new THREE.MeshBasicMaterial({ color: 0x40AB40, wireframe: true })
        );
        this.add(room);

        // Floor box
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(18.5, 36, 18.5, 20, 20, 20),
            new THREE.MeshLambertMaterial({ color: 0x707070 })
        );
        floor.position.set(0, -18, 0);
        this.add(floor);

        // Lighting
        let light;
        this.add(new THREE.HemisphereLight(0xbbbbff, 0x080808, .2));
        this.add(new THREE.AmbientLight(0x101010)); // soft white light

        light = new THREE.DirectionalLight(0x886677);
        light.position.set(.5, 1, .5).normalize();
        this.add(light);

        light = new THREE.PointLight(0xffffff, 0.5, 20);
        light.position.set(0, 7, 0);
        this.add(light);

        // Show distant terrain
        return this.generateTerrain();
    }

    update(delta, renderer) {
        let {
            renderTarget,
            sceneCamera,
            monitor
        } = this;

        monitor.visible = false;
        renderer.render(this, sceneCamera, renderTarget, true);
        monitor.visible = true;
    }

    getSceneCamera() {
        return this.sceneCamera;
    }

    generateTerrain() {
        const planeWidth = 256,
            planeHeight = 256;
        const loader = new THREE.TextureLoader();
        const seed = 'tony';

        return Promise.all([
            new Promise((resolve) => {
                loader.load(`/api/map/${seed}`, resolve);
            }),
            new Promise((resolve) => {
                loader.load(`/api/texture/${seed}`, resolve);
            })
        ]).then((textures) => {
            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 512-1, 512-1);
            const material = new THREE.MeshPhongMaterial({
                map: textures[1],
                displacementMap: textures[0],
                displacementScale: 40,
                displacementBias: 0,
                color: 0xcccccc
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotateX(-Math.PI/2);
            mesh.position.set(0,-30,0);

            this.add(mesh);
        })
    }
}
