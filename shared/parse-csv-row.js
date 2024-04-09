module.exports = function (row, idx, importLog) {
  const rejectionReasons = []

  const lsoaCode2011 = findLsoaCode(row, rejectionReasons)
  const indexOfMultipleDeprivationDecile = findDecile(row, rejectionReasons)

  if (rejectionReasons.length === 0) {
    importLog.totalRows++
    importLog.rows.push({ lsoaCode2011, indexOfMultipleDeprivationDecile })
  } else {
    importLog.totalRejected++
    importLog.rejected.push({ idx, rejectionReasons })
  }
}

function findLsoaCode (row, rejectionReasons) {
  // Column A
  const csvKey = 'LSOA code (2011)'
  const value = row[csvKey]

  if (value === undefined || value === null) {
    rejectionReasons.push(`${csvKey} is not provided.`)
    return
  }

  if (typeof value !== 'string') {
    rejectionReasons.push(`${csvKey} must be a text value.`)
    return
  }

  if (value.trim().length < 1) {
    rejectionReasons.push(`${csvKey} is not provided.`)
    return
  }

  return value
}

function findDecile (row, rejectionReasons) {
  // Column G
  const csvKey = 'Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)'
  const value = row[csvKey]

  if (value === undefined || value === null) {
    rejectionReasons.push(`${csvKey} is not provided.`)
    return
  }

  if (isNaN(parseInt(value))) {
    rejectionReasons.push(`${csvKey} must be an integer.`)
    return
  }

  return value
}
