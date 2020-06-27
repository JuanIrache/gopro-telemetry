const promisify = require('./utils/promisify');

module.exports = async interpretedArr => {
  //Merge samples in interpreted obj
  const interpreted = interpretedArr[0];
  for (let i = 1; i < interpretedArr.length; i++) {
    for (const device in interpretedArr[i]) {
      await promisify(async () => {
        if (!interpreted[device]) {
          interpreted[device] = interpretedArr[i][device];
        } else {
          for (const stream in interpretedArr[i][device].streams) {
            await promisify(() => {
              if (!interpreted[device].streams[stream]) {
                interpreted[device].streams[stream] =
                  interpretedArr[i][device].streams[stream];
              } else {
                if (!interpreted[device].streams[stream].samples) {
                  interpreted[device].streams[stream].samples = [];
                }
                interpreted[device].streams[stream].samples.push(
                  ...interpretedArr[i][device].streams[stream].samples
                );
              }
            });
          }
        }
      });
    }
  }
  return interpreted;
};
