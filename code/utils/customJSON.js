module.exports = {
  JSONStringify: obj =>
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? 'BigInt:' + value.toString() : value
    ),
  JSONParse: str =>
    JSON.parse(str, (key, value) =>
      typeof value === 'string' && /^BigInt:\d+/.test(value)
        ? BigInt(value.slice('BigInt:'.length))
        : value
    )
};
