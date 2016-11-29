import { Vector3 } from 'three'

//TODO: octree
export default class SpaceMap {
    constructor() {
        this.root = {
            objects: []
        };
    }
    
    add(object) {
        this.root.objects.push(object);
        return {
            remove: () => {
                return this.root.objects.splice(this.root.objects.indexOf(object), 1);
            },
            update: () => {
                //TODO: reposition in octree
            }
        };
    }
    
    getNearestObject(position) {
        let minDistance = Number.MAX_VALUE;
        let result;
        this.root.objects.forEach((object) => {
            let distance = position.distanceTo(new Vector3().setFromMatrixPosition(object.matrixWorld));
            if (distance <= minDistance) {
                result = object;
                minDistance = distance;
            }
        });
        return result;
    }
}