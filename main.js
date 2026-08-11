import './style.css'
import * as  THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
const hudElm = document.getElementById('hud');
const levelElm = document.getElementById('level');
const menuElm = document.getElementById('menu');
const startBt = document.getElementById('start-button');

let mode = 'menu';
const state = {
  level: 1,
}
let playnow = false;
let view,playcamera,render;
function updateHUD() {
  levelElm.textContent = `Level: ${state.level}`;
}
function initgame(){
  if(playnow) return;
  playnow = true;
  view = new THREE.Scene();
  playcamera = new THREE.PerspectiveCamera(
    50, window.innerWidth / window.innerHeight, 0.1, 100
  );
  playcamera.position.set(0,2.2, 2.4);
  playcamera.lookAt(0,0.6,0);
  render = new THREE.WebGLRenderer({antialias: true, alpha: true});
  render.setSize(window.innerWidth, window.innerHeight);
  render.setPixelRatio(Math.min(window.devicePixelRatio,2));
  render.domElement.id = 'game-canvas';
  document.body.appendChild(render.domElement);
  view.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.5));
  const lihgt = new THREE.DirectionalLight(0xffffff, 1.5);
  lihgt.position.set(3,5,2);
  view.add(lihgt);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color: 0xffffff})
  );
  cube.position.set(0,0.6,0);
  view.add(cube);
  animate()
}
function animate(){
  requestAnimationFrame(animate);
  render.render(view,playcamera);
}
window.addEventListener('resize', () =>{
  if (!render) return;
  playcamera.aspect = window.innerWidth / window.innerHeight;
  playcamera.updateProjectionMatrix();
  render.setSize(window.innerWidth, window.innerHeight);
});

function setMode(newMode) {
  mode = newMode;
  menuElm.classList.toggle('hidden', mode !== 'menu');
  hudElm.classList.toggle('hidden', mode !== 'playing');
  updateHUD();
  if (mode === 'playing') initgame();
}
startBt.addEventListener('click', () => setMode('playing')); 
setMode('menu');