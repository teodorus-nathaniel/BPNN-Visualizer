import { getNextDimension, forEachElement } from '../utilities/array-utilities';
import BPNN from '../model/bpnn';
import { zeros, size } from 'mathjs';

let timeline;
let animationSpeed = 19;
let endAnimation = false;
let encoder;
let skipAnimation = 0;
let inputLength;
let lastWeight;

const currentEpochLabel = document.getElementById('current-epoch');
const dataIdxLabel = document.getElementById('data-idx');
const dataMaxLabel = document.getElementById('data-number');
const loadingModal = document.getElementById('loading-modal');
const currentErrorLabel = document.getElementById('curr-error');
const previousErrorLabel = document.getElementById('prev-error');

function forwardPass (weights){
  return new Promise((resolve) => {
    timeline = new gsap.timeline({ onComplete: resolve });
    gsap.to(timeline, { timeScale: animationSpeed });

    const nextNeuronCount = weights[0].length;
    for (let i = 0; i < nextNeuronCount; i++) {
      const weightsToNextNeuron = getNextDimension(weights, i);
      weightsToNextNeuron.forEach((weight) => weight.animateParticle(timeline));
    }
  });
}

function backwardPass (weights){
  return new Promise((resolve) => {
    timeline = new gsap.timeline({ onComplete: resolve });
    gsap.to(timeline, { timeScale: animationSpeed });

    const nextNeuronCount = weights[0].length;
    for (let i = 0; i < nextNeuronCount; i++) {
      const weightsToNextNeuron = getNextDimension(weights, i);
      weightsToNextNeuron.forEach((weight) =>
        weight.animateParticleReverse(timeline)
      );
    }
  });
}

function updateNeuronValues (neurons, neuronValues){
  return new Promise((resolve) => {
    timeline = new gsap.timeline({ onComplete: resolve });
    gsap.to(timeline, { timeScale: animationSpeed });

    neurons.forEach((neuron, i) => {
      neuron.value = neuronValues._data[i];
      neuron.renderComponent();
      neuron.showValue(timeline);
    });
  });
}

function checkStillLoading (){
  skipAnimation--;
  if (skipAnimation <= 0) {
    loadingModal.classList.add('hide');
  }
}

function updateNeuronOutputValues (neurons, neuronValues, target){
  return new Promise((resolve) => {
    timeline = new gsap.timeline({ onComplete: resolve });
    gsap.to(timeline, { timeScale: animationSpeed });

    let max = 0;
    for (let i = 1; i < neuronValues.size()[0]; i++) {
      if (neuronValues._data[i] > neuronValues._data[max]) {
        max = i;
      }
    }

    let maxTarget = 0;
    for (let i = 1; i < target.length; i++) {
      if (target[i] > target[maxTarget]) {
        maxTarget = i;
      }
    }

    neurons.forEach((neuron, i) => {
      neuron.value = neuronValues._data[i];
      neuron.renderComponent();
      neuron.showValue(
        timeline,
        `${neuron.value.toString().substr(0, 4)} | target: ${target[i]}`
      );
    });

    const predLabel = document.getElementById('pred');
    predLabel.classList.remove('true', 'false');

    if (encoder.get_uniques_size() > 2) {
      const prediction = zeros(size(target));
      prediction[max] = 1;
      const labelPred = encoder.inverse_transform(prediction);
      predLabel.textContent = labelPred;
      if (max === maxTarget) {
        predLabel.classList.add('true');
      } else {
        predLabel.classList.add('false');
      }
    } else {
      const prediction = [];
      prediction.push(neuronValues._data[0] > 0.5 ? 1 : 0);
      const labelPred = encoder.inverse_transform(prediction);
      predLabel.textContent = labelPred;
      if (prediction[0] === target[0]) {
        predLabel.classList.add('true');
      } else {
        predLabel.classList.add('false');
      }
    }
  });
}

function updateWeightValues (weights, newWeights){
  return new Promise((resolve) => {
    timeline = new gsap.timeline({ onComplete: resolve });
    gsap.to(timeline, { timeScale: animationSpeed });

    weights.forEach((weight, i) => {
      weight.forEach((w, j) => {
        w.updateValue(newWeights[i][j]);
        w.renderComponent();
        w.showValue(timeline);
      });
    });
  });
}

function updateWeightValuesNoAnim (weights, newWeights){
  weights.forEach((weight, i) => {
    weight.forEach((w, j) => {
      w.updateValue(newWeights[i][j]);
      w.renderComponent();
    });
  });
}

export function animationSpeedListener (){
  animationSpeed = this.value;
  if (timeline) {
    gsap.to(timeline, { timeScale: animationSpeed });
  }
}

export function startSkipAnimation (epoch){
  skipAnimation = epoch * inputLength;
  loadingModal.classList.remove('hide');
}

export function stopAnimation (){
  endAnimation = true;
  if (timeline) timeline.kill();
}

export function startAnimation (){
  endAnimation = false;
}

async function doLoading (network, newWeights, numLayers){
  checkStillLoading();
  for (let j = numLayers - 2; j >= 0; j--) {
    await updateWeightValuesNoAnim(network.weights[j], newWeights[j]);
  }
}

export default async function startBPNN (network, input, target, encoderParam){
  const numLayers = network.layers.length;
  encoder = encoderParam;

  const learningRate = document.getElementById('learning-rate-input').value;
  const activation = document.getElementById('activation-input').value;
  const epoch = document.getElementById('epoch-input').value;

  inputLength = input.length;

  const bpnnModel = new BPNN(
    network.layers,
    input,
    target,
    undefined,
    undefined,
    learningRate,
    activation
  );

  const bpnn = bpnnModel.train(epoch);

  let currentEpoch = 0;
  let res;
  let currentError = 0;
  do {
    if (endAnimation) {
      break;
    }

    if (skipAnimation === 0) {
      forEachElement(network.neurons, (neuron) => {
        neuron.resetValue();
      });
    }

    res = bpnn.next();
    const {
      neuronValues,
      newWeights,
      newBiases,
      error,
      target,
      epoch: epochFromModel,
      dataIndex,
      dataMax
    } = res.value;

    if (currentEpoch !== epochFromModel) {
      previousErrorLabel.textContent = (currentError / dataMax)
        .toString()
        .slice(0, 15);
      currentErrorLabel.textContent = 0;
      currentError = 0;
    }

    currentError += error;
    lastWeight = newWeights;

    currentEpoch = epochFromModel;
    currentEpochLabel.textContent = currentEpoch;
    dataIdxLabel.textContent = dataIndex;
    dataMaxLabel.textContent = dataMax;

    if (skipAnimation !== 0) {
      await doLoading(network, newWeights, numLayers);
      continue;
    }

    document.getElementById('target').textContent = encoder.inverse_transform(
      target
    );
    document.getElementById('pred').textContent = '';

    await new Promise((resolve) => {
      const timeline = gsap.timeline({ onComplete: resolve });

      gsap.to(timeline, { timeScale: animationSpeed });
      network.neurons[0].forEach((neuron, i) => {
        neuron.value = neuronValues[0]._data[i];
        neuron.renderComponent();
        neuron.showValue(timeline);
      });
    });

    if (skipAnimation !== 0) {
      await doLoading(network, newWeights, numLayers);
      continue;
    }
    if (endAnimation) {
      break;
    }

    for (let j = 0; j < numLayers - 1; j++) {
      await forwardPass(network.weights[j]);
      if (j !== numLayers - 2) {
        await updateNeuronValues(network.neurons[j + 1], neuronValues[j + 1]);
      } else {
        await updateNeuronOutputValues(
          network.neurons[j + 1],
          neuronValues[j + 1],
          target
        );
      }
    }

    currentErrorLabel.textContent = (currentError / dataIndex)
      .toString()
      .slice(0, 15);

    if (skipAnimation !== 0) {
      await doLoading(network, newWeights, numLayers);
      continue;
    }
    if (endAnimation) {
      break;
    }

    for (let j = numLayers - 2; j >= 0; j--) {
      await backwardPass(network.weights[j]);
      await updateWeightValues(network.weights[j], newWeights[j]);
    }
  } while (currentEpoch < epoch);

  if (currentEpoch == epoch) {
    alert('Training Done!');

    for (let j = numLayers - 2; j >= 0; j--) {
      await updateWeightValues(network.weights[j], lastWeight[j]);
    }
  }

  loadingModal.classList.add('hide');
  endAnimation = false;
  skipAnimation = 0;
}
