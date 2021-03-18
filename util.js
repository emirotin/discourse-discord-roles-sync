const byKey = (o, key) => (key === undefined ? o : o[key]);

exports.indexBy = (arr, key) => {
  const m = new Map();
  arr.forEach((o) => {
    m.set(byKey(o, key), o);
  });
  return m;
};

exports.uniqueBy = (arr, key) => {
  return [...exports.indexBy(arr, key)];
};

exports.diff = ({ arr1, arr2, key1, key2 }) => {
  const cache2 = exports.indexBy(arr2, key2);
  return arr1.filter((el1) => !cache2.has(byKey(el1, key1)));
};

exports.symDiff = ({ arr1, arr2, key1, key2 }) => [
  exports.diff({ arr1, arr2, key1, key2 }),
  exports.diff({ arr2: arr1, arr1: arr2, key2: key1, key1: key2 }),
];
