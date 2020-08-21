const breathe = require('./utils/breathe');

module.exports = async interpretedArr => {
  //Merge samples in interpreted obj
  const interpreted = interpretedArr[0];
  for (let i = 1; i < interpretedArr.length; i++) {
    for (const device in interpretedArr[i]) {
      if (!interpreted[device]) {
        interpreted[device] = interpretedArr[i][device];
      } else {
        for (const stream in interpretedArr[i][device].streams) {
          if (interpretedArr[i][device].streams[stream]) {
            await breathe();
            if (!interpreted[device].streams[stream]) {
              interpreted[device].streams[stream] =
                interpretedArr[i][device].streams[stream];
            } else if (interpretedArr[i][device].streams[stream].samples) {
              if (!interpreted[device].streams[stream].samples) {
                interpreted[device].streams[stream].samples = [];
              }
              interpretedArr[i][device].streams[stream].samples.forEach(s => {
                interpreted[device].streams[stream].samples.push(s);
              });
            }
          }
        }
      }
    }
  }
  return interpreted;
};
