//Creates as many headers as possible form the available name and units
module.exports = function({ units, name }) {
  let headers = [];
  if (name) {
    //Get values inside parenthesis, usually units or similar, ofter one per sample value
    let parts = name.match(/.*\((.+?)\).*/);
    if (parts && parts.length) {
      //Remove parenthesis
      name = name.replace(/\((.+?)\)/, '').trim();
      //Take every value inside parenthesis
      parts = parts[1].split(',').map(p => p.trim());
      //Add every part to the name
      headers = parts.map(p => `${name} (${p})`);
      //Or just use the name if no parenthesis
    } else headers.push(name);
  }

  let unitsHeaders = [];
  if (units) {
    if (Array.isArray(units)) {
      //Save units as string array
      units.forEach((u, i) => {
        unitsHeaders.push(` [${u}]`);
      });
      //Or single value string
    } else unitsHeaders[0] = (unitsHeaders[0] || '') + ` [${units}]`;
  }

  //Loop through all the names and units
  for (let i = 0; i < Math.max(headers.length, unitsHeaders.length); i++) {
    //Repeat elements if not enough iterations
    headers[i] = (headers[i] || headers[0] || '') + (unitsHeaders[i] || unitsHeaders[0] || '');
  }

  return headers;
};
