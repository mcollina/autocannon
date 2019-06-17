'use strict'

function deepCopy (obj) {
  if (typeof obj !== 'object' || obj === null || Buffer.isBuffer(obj)) {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (obj instanceof Array) {
    return obj.reduce((arr, item, i) => {
      const val = deepCopy(item)

      if (val !== undefined) {
        arr[i] = deepCopy(item)
      }

      return arr
    }, [])
  }

  if (obj instanceof Object) {
    return Object.keys(obj).reduce((newObj, key) => {
      const val = deepCopy(obj[key])

      if (val !== undefined) {
        newObj[key] = val
      }

      return newObj
    }, {})
  }
}

module.exports = deepCopy
