import * as THREE from 'three';
import MTLLoader from 'three-mtl-loader';
//import OBJLoader from 'three-obj-loader';
import Room from '../Room';

export default class PolyTest extends Room {
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
        let light = new THREE.HemisphereLight(0xffffff, 0x51930e, .2);
        this.add(light);

        light = new THREE.AmbientLight(0xffffff, .2);
        this.add(light);

        // test load a poly asset
        var scene = this;
        var id = '5vbJ5vildOq';
        var API_KEY = '** INSERT POLY API KEY **';
        var url = `https://poly.googleapis.com/v1/assets/${id}/?key=${API_KEY}`;

    	var request = new XMLHttpRequest();
    	request.open( 'GET', url, true );
    	request.addEventListener( 'load', function ( event ) {

    		var asset = JSON.parse( event.target.response );
            console.log(asset);

            var format;
            for ( var i = 0; i < asset.formats.length; i ++ ) {

                var formatx = asset.formats[ i ];

                if ( formatx.formatType === 'OBJ' ) format = formatx;

            }
    		if ( format !== undefined ) {

    			var urlOBJ = format.root.url;
    			var urlMTL = format.resources[ 0 ].url;

    			var mtlLoader = new MTLLoader();
                console.log(mtlLoader);
    			mtlLoader.load( urlMTL, function ( materials ) {

    				var objLoader = new THREE.OBJLoader();
    				objLoader.setMaterials( materials );
    				objLoader.load( urlOBJ, function ( object ) {

    					var box = new THREE.Box3();
    					box.setFromObject( object );

    					object.position.y = box.max.y;

    					scene.add( object );

    				} );

    			} );

    		}

    	} );
    	request.send( null );

        //this.loadAsset( '5vbJ5vildOq', this );
    }

    update(delta, renderer) {
        super.update(delta, renderer);
    }
}
