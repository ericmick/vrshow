/**
 * Class to represent a person in VR.
 */
import * as THREE from 'three';
import * as THREEx from 'threeX';
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

        // Floor box
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(18.5, 36, 18.5, 20, 20, 20),
            new THREE.MeshLambertMaterial({ color: 0x707070 })
        );
        floor.receiveShadow = true;
        floor.position.set(0, -18, 0);
        this.add(floor);

        // Lighting
        let light = new THREE.HemisphereLight(0xffffff, 0x080820, .2);
        this.add(light);

        light = new THREE.AmbientLight(0xffffff, .2);
        this.add(light);

        light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(0, 3, 0);
        light.castShadow = true;
        this.add(light);

        const iso = this.iso = new THREE.Mesh(
            new THREE.IcosahedronGeometry(.3),
            new THREE.MeshLambertMaterial({ color: 0x553344 })
        );
        iso.position.set(2, 1.5, -2);
        iso.castShadow = true;
        this.add(iso);

        // Sky
        const sunSphere = new THREEx.DayNight.SunSphere();
        this.add(sunSphere.object3d);

        const sunLight = new THREEx.DayNight.SunLight();
        this.add(sunLight.object3d);

        const skydom  = new THREEx.DayNight.Skydom();
        this.add(skydom.object3d);

        const starField   = new THREEx.DayNight.StarField();
        this.add(starField.object3d);

        window.updateSunAngle = this.updateSunAngle = (theta) => {
            sunSphere.update(theta);
            sunLight.update(theta);
            skydom.update(theta);
            starField.update(theta);
        };

        this.updateSunAngle(-Math.PI/2);

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

        this.iso.rotation.x += delta * 1;
        this.iso.rotation.y += delta * 0.5;

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
