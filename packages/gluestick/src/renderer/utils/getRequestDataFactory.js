function getNestedDataFromProperties(container, properties) {
  return properties.reduce((output, key) => {
    return {
      ...output,
      [key]: container[key],
    };
  }, {});
}

module.exports = function getRequestDataFactory(request) {
  return data => {
    return Object.keys(data).reduce(
      (output, key) => ({
        ...output,
        [key]: getNestedDataFromProperties(request[key], data[key]),
      }),
      {},
    );
  };
};
