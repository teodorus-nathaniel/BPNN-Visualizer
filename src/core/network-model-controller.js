import generateModel from '../utilities/generate-model';

const layerInputContainer = document.getElementById('layer-input-container');
const layerCountInput = document.getElementById('layer-count-input');

let layers = [ 3, 2, 10, 2 ];

export default function initModelController (stage){
  let network;
  const resetModel = () => {
    stage.removeChildren();
    network = generateModel(stage, layers);
  };

  function updateLayer (value, idx){
    if (layers[idx] === value) return;
    layers[idx] = value;
    resetModel();
  }

  function initNeuronInputListener (){
    Array.from(layerInputContainer.children).forEach((input, idx) => {
      input.addEventListener('change', function (){
        updateLayer(+this.value, idx);
      });
    });
  }

  resetModel();
  initNeuronInputListener();

  layerCountInput.addEventListener('change', function (){
    const layerCount = +this.value;
    if (layers.length < layerCount) {
      for (let i = 0; i < layerCount - layers.length; i++) layers.push(3);
    } else if (layers.length > layerCount) {
      layers = layers.slice(0, layerCount);
    } else return;

    layerInputContainer.innerHTML = Array.from({ length: layerCount }).reduce(
      (acc, _, idx) =>
        acc +
        `<input type="text" placeholder="neuron for layer ${idx + 1}...">`,
      ''
    );

    resetModel();
    initNeuronInputListener();
  });
}
