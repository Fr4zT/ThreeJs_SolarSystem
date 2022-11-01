import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import {GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/loaders/GLTFLoader.js';

import { joinRoom } from 'https://cdn.skypack.dev/trystero';

let renderer, camera, scene;
let bloomComposer, bloomPass;
let controls;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let players = [];
let joinTime;
let isFirst = false;
const config = { appId: 'fraz_solarSystem' };
let room;

let planetFollowing = null;

const loader = new GLTFLoader();

function init() {
    const canvas = document.getElementById("threeCanvas");

    scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera = new THREE.PerspectiveCamera(39.6, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(1800, 0, 1800);
    camera.lookAt(0, 0, 0);

    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .5, 0.3, .8);
    bloomComposer = new EffectComposer(renderer);
    const renderScene = new RenderPass(scene, camera);
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    buildSolarSystem();

    controls = new OrbitControls(camera, renderer.domElement);

    console.log(planetCenters.length);
    room = joinRoom(config, 'publicRoom');
    joinTime = Math.floor(Date.now() / 1000);
    room.onPeerJoin(peerId => {
        if (isFirst) {
            let planetsRotations = [];
            for (let i = 0; i < planetCenters.length; i++) {
                planetsRotations.push(planetCenters[i].center.rotation.y);
            }
            sendSolarSystemData([planetsRotations]);
        }
        if (room.getPeers().length == 1) {
            sendFirstPlayerCheck(joinTime);
        }
        const playerGeomerty = new THREE.BoxGeometry(5, 5, 5, 1, 1, 1);
        const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const playerMesh = new THREE.Mesh(playerGeomerty, playerMaterial);
        let playerObject = new THREE.Object3D();
        scene.add(playerObject);
        players[peerId] = playerObject;
        loader.load(
            'Models/ufo.glb',
            function ( gltf ) {
                playerObject.add(gltf.scene);
            },
        );
    })

    room.onPeerLeave(peerId => {
        scene.remove(players[peerId]);
    })

    onWindowResize();
}

let planetCenters = [];

function buildSolarSystem() {
    const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
    scene.add(light);

    const sunLight = new THREE.PointLight(0xffffff, .8, 0, 2);
    scene.add(sunLight);

    const sunGeometry = new THREE.SphereGeometry(1, 32, 16);
    const sunMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);

    sun.scale.set(50, 50, 50);
    scene.add(sun);

    let startDistance = 100;

    addPlanet(startDistance, 1, "mercury.jpg", 47, "mercury", 7, 0);
    addPlanet(startDistance + 20, 2.4, "venus.jpg", 35, "venus", 3, 177);
    addPlanet(startDistance + 40, 2.6, "earth.jpg", 30, "earth", 0, 23.5);
    addPlanet(startDistance + 60, 1.3, "mars.jpg", 24, "mars", 1.8, 25);
    addPlanet(startDistance + 120, 28.6, "jupiter.jpg", 13, "jupiter", 1.3, 3);
    addPlanet(startDistance + 210, 23.8, "saturn.jpg", 9.5, "saturn", 2.4, 27);
    addPlanet(startDistance + 280, 10.4, "uranus.jpg", 7, "uranus", 0.7, 98);
    addPlanet(startDistance + 330, 10, "neptune.jpg", 5, "neptune", 1.7, 29.5);

    showPlanetInfo("");
}

function addPlanet(zPosition, scale, textureUrl, orbitalSpeed, planetName, orbitAngle, planetAngle) {
    const planetGeometry = new THREE.SphereGeometry(1, 32, 16);
    const texture = new THREE.TextureLoader().load("textures/" + textureUrl);
    const planetMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);

    const center = new THREE.Object3D();
    scene.add(center);
    center.add(planet);
    planet.position.set(0, 0, zPosition);
    planet.scale.set(scale, scale, scale);
    planet.rotation.x = THREE.MathUtils.degToRad(planetAngle);

    center.rotation.y = THREE.MathUtils.randFloat(0, THREE.MathUtils.degToRad(360));
    center.rotation.x = THREE.MathUtils.degToRad(orbitAngle);
    planetCenters.push({ center: center, orbitalSpeed: orbitalSpeed, planet: planet, name: planetName });
}

function animate() {
    sendCameraPos([camera.position, camera.rotation]);
    for (let i = 0; i < planetCenters.length; i++) {
        planetCenters[i].center.rotation.y += planetCenters[i].orbitalSpeed * 0.0001;
    }
    if (planetFollowing != null)
    {
        let worldPos = new THREE.Vector3();
        planetFollowing.getWorldPosition(worldPos);
        controls.target = worldPos;
        controls.update();
    }
    render();
    requestAnimationFrame(animate);
}

function render() {
    bloomComposer.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onPointerDown(event) {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);


    let clickedPlanetCount = 0;
    if (intersects.length > 0) {
        for (let p = 0; p < planetCenters.length; p++) {
            if (intersects[0].object == planetCenters[p].planet) {
                console.log(planetCenters[p].planet.position);
                showPlanetInfo(planetCenters[p].name);
                clickedPlanetCount++;
                planetFollowing = planetCenters[p].planet;
            }
        }
    }

    if (intersects.length == 0 || clickedPlanetCount == 0) {
        showPlanetInfo("");
    }

}

function showPlanetInfo(planetName) {
    for (let i = 0; i < planetCenters.length; i++) {
        if (planetCenters[i].name == planetName) {
            document.getElementById(planetCenters[i].name).style.display = "block";
        } else {
            document.getElementById(planetCenters[i].name).style.display = "none";
        }
    }
}


init();

const [sendCameraPos, getCameraPos] = room.makeAction('playerMove');
const [sendFirstPlayerCheck, getFirstPlayerCheck] = room.makeAction('firstCheck');
const [sendSolarSystemData, getFirstPlayerData] = room.makeAction('sendSolar');

animate();

window.addEventListener('resize', onWindowResize, false);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerDown);

getCameraPos(([playerPosition, playerRotation], peerId) => {
    players[peerId].position.set(playerPosition.x, playerPosition.y, playerPosition.z);
});

getFirstPlayerCheck((peerJoinTime, peerId) => {
    console.log(peerJoinTime);
    if (peerJoinTime > joinTime) {
        isFirst = true;
        console.log("You are the first: " + room.getPeers().length);
        let planetsRotations = [];
        for (let i = 0; i < planetCenters.length; i++) {
            planetsRotations.push(planetCenters[i].center.rotation.y);
        }
        sendSolarSystemData(planetsRotations);
    }
});

getFirstPlayerData((solarSystemData, peerId) => {
    console.log("receivingData");
    for (let i = 0; i < planetCenters.length; i++) {
        planetCenters[i].center.rotation.y = solarSystemData[i];
    }
});

