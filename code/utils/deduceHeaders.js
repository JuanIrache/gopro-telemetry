//Creates as many headers as possible form the available name and units, inn and out create combinations
module.exports = function({ units, name }, { inn, out } = {}) {
  let parts;
  if (name) {
    //Get values inside parenthesis, usually units or similar, ofter one per sample value
    parts = name.match(/.*\((.+?)\).*/);
    if (parts && parts.length) {
      //Remove parenthesis
      name = name
        .replace(/\((.+?)\)/, '')
        .trim()
        .replace('  ', ' ');
      //Take every value inside parenthesis
      parts = parts[1].split(',').map(p => p.trim());
    } else parts = [];
  }

  let unitsHeaders = [];
  if (units) {
    //Save units as string array
    if (Array.isArray(units)) unitsHeaders = units;
    //Or single value string
    else unitsHeaders[0] = units;
  }

  //Put name here in case we don't loop
  let headers = [name];

  if (inn == null || out == null) {
    //Loop through all the names and units
    for (let i = 0; i < Math.max(parts.length, unitsHeaders.length); i++) {
      //Repeat elements if not enough iterations
      let part = parts[i] || parts[0] ? `(${parts[i] || parts[0]})` : '';
      let unit =
        unitsHeaders[i] || unitsHeaders[0]
          ? `[${unitsHeaders[i] || unitsHeaders[0]}]`
          : '';
      //And merge
      headers[i] = [name, part, unit].filter(e => e.length).join(' ');
    }
  } else {
    //Repeat elements if not enough iterations
    let part = parts.slice(inn, out).length
      ? `(${parts.slice(inn, out).join(',')})`
      : '';
    let unit = unitsHeaders.slice(inn, out).length
      ? `[${unitsHeaders.slice(inn, out).join(',')}]`
      : '';
    //And merge
    headers = [name, part, unit].filter(e => e.length).join(' ');
  }

  return headers;
};
