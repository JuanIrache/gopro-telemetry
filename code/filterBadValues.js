module.exports = function (data) {
  if (data) {
    for (const k in data) {
      if (data[k].streams) {
        for (const kk in data[k].streams) {
          if (
            data[k].streams[kk].samples &&
            data[k].streams[kk].samples.length
          ) {
            const newArr = [];
            for (let i = data[k].streams[kk].samples.length - 1; i >= 0; i--) {
              if (data[k].streams[kk].samples[i].value != null) {
                newArr.push(data[k].streams[kk].samples[i]);
              }
            }
            data[k].streams[kk].samples = newArr;
          }
        }
      }
    }
  }
  return data;
};
