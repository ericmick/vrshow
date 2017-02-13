import * as THREE from 'three';
import * as THREEx from 'threeX';
import { Object3D, Matrix4, Vector3 } from 'three';
import Room from '../Room';
import VirtualCamera from '../VirtualCamera';
import SpaceMap from '../SpaceMap';

export default class Lobby extends Room {
    constructor(user) {
        super(user);
        this.grabMap = new SpaceMap();
        this.holding = [];
    }

    initialize() {
        // Create camera box
        this.monitor = new VirtualCamera(1, 512, 16/9);
        this.monitor.position.set(0, 2, -5);
        this.monitor.rotateY(Math.PI);
        this.add(this.monitor);
        
        this.grabMap.add(this.monitor);

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
        this.grabMap.add(iso);

        // Sky
        const sunSphere = new THREEx.DayNight.SunSphere();
        this.add(sunSphere.object3d);

        const sunLight = new THREEx.DayNight.SunLight();
        this.add(sunLight.object3d);

        const skydom  = new THREEx.DayNight.Skydom();
        this.add(skydom.object3d);

        const starField = new THREEx.DayNight.StarField();
        this.add(starField.object3d);

        window.updateSunAngle = this.updateSunAngle = (theta) => {
            sunSphere.update(theta);
            sunLight.update(theta);
            skydom.update(theta);
            starField.update(theta);
        };

        this.updateSunAngle(-Math.PI/2);
           
        this.user.controllers.forEach((c, i) => {
            c.addEventListener('gripsdown', (event) => this.grab(event, i));
        });

        // Show distant terrain
        this.generateTerrain();
    }

    grab(event, controllerNum) {
        let object = this.holding[controllerNum];
        let controller = this.user.controllers[controllerNum];
        if(!object) {
            object = this.grabMap.getNearestObject(new Vector3().setFromMatrixPosition(controller.matrixWorld));
            this.holding.forEach((o, i) => {
                if (object == o) {
                    delete this.holding[i];
                }
            });
            this.holding[controllerNum] = object;
            object.applyMatrix(object.parent.matrixWorld);
            object.applyMatrix(new Matrix4().getInverse(this.user.controllers[controllerNum].matrixWorld));
            this.user.controllers[controllerNum].add(object);
        } else {
            delete this.holding[controllerNum];
            this.user.controllers[controllerNum].remove(object);
            this.add(object);
            object.applyMatrix(this.user.controllers[controllerNum].matrixWorld);
            object.applyMatrix(new Matrix4().getInverse(this.matrixWorld));
        }
        object.updateMatrixWorld(true);
    }

    moveHandyCamUpAndAwayFromController(handyCam) {
        handyCam.translateZ(-0.06);
        handyCam.translateY(0.07);
    }

    update(delta, renderer) {
        this.iso.rotation.x += delta * 1;
        this.iso.rotation.y += delta * 0.5;
        
        const isCameraMode = location.hash === '#camera';
        if(isCameraMode) {
            super.update(delta, renderer, this.monitor.camera);
        } else {
            this.monitor.render(this, renderer);
            super.update(delta, renderer);
        }
    }

    generateTerrain() {
        const planeWidth = 512,
            planeHeight = 512;
        const loader = new THREE.TextureLoader();
        const seed = 'tony';

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, planeWidth-1, planeHeight-1);
        const material = new THREE.MeshPhongMaterial({
            map: loader.load(`/api/texture/${seed}`),
            displacementMap: loader.load(`/api/map/${seed}`),
            displacementScale: 40,
            displacementBias: 0,
            color: 0xFFFFFF
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotateX(-Math.PI/2);
        mesh.position.set(0,-30,0);

        this.add(mesh);
    }
    
    detach() {
        this.holding.forEach((object, i) => {
            this.user.controllers[i].remove(object);
        });
        super.detach();
    }
}
