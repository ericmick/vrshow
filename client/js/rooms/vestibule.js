import * as THREE from 'three';
import Room from '../Room';

export default class Lobby extends Room {
    constructor(user) {
        super(user);
    }

    initialize() {
        // Floor box
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(18.5, 36, 18.5, 20, 20, 20),
            new THREE.MeshLambertMaterial({ color: 0x707070 })
        );
        floor.position.set(0, -18, 0);
        this.add(floor);

        // Lighting
        let light = new THREE.HemisphereLight(0xffffff, 0x080820, .2);
        this.add(light);

        light = new THREE.AmbientLight(0xffffff, .2);
        this.add(light);

        const iso = this.iso = new THREE.Mesh(
            new THREE.IcosahedronGeometry(.3),
            new THREE.MeshLambertMaterial({ color: 0x553344 })
        );
        iso.position.set(2, 1.5, -2);
        iso.castShadow = true;
        this.add(iso);
    }

    update(delta, renderer) {
        this.iso.rotation.x += delta * 1;
        this.iso.rotation.y += delta * 0.5;
        
        super.update(delta, renderer);
    }
}
