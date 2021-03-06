import { min, max, zeros } from 'mathjs';

function minData (arr){
  return min(arr, 0);
}
function maxData (arr){
  return max(arr, 0);
}
function minmaxScaler (number, min, max){
  return (number - min) / (max - min);
}

export function minmaxScale (dataNumber){
  let min = minData(dataNumber);
  let max = maxData(dataNumber);

  let newDataNumber = [];
  for (let i = 0; i < dataNumber.length; i++) {
    newDataNumber.push([]);
    for (let j = 0; j < dataNumber[i].length; j++) {
      newDataNumber[i][j] = minmaxScaler(dataNumber[i][j], min[j], max[j]);
    }
  }

  return newDataNumber;
}

export function oneHotEncode (target){
  const uniques = new Set(target);

  const mapper = {};
  uniques.forEach((val) => {
    if (!mapper[val]) {
      mapper[val] = { key: Object.values(mapper).length + 1, val };
    }
  });

  return {
    transform () {
      if (uniques.size <= 2) {
        return target.map((val) => [ mapper[val].key - 1 ]);
      }

      let newTarget = zeros([ target.length, uniques.size ]);
      target.forEach((val, idx) => (newTarget[idx][mapper[val].key - 1] = 1));

      return newTarget;
    },
    inverse_transform (data) {
      if (uniques.size <= 2) {
        return Object.values(mapper).find(({ key, val }) => key - 1 === data[0])
          .val;
      }

      const index = data.findIndex((el) => el === 1) + 1;
      const target = Object.values(mapper).find(({ key }) => key === index);
      return target ? target.val : 'None';
    },
    get_uniques_size () {
      return uniques.size;
    }
  };
}
