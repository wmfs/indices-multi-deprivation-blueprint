module.exports = function (row, idx, importLog) {
  const lsoaCode2011 = findLsoaCode(row)
  const indexOfMultipleDeprivationDecile = findDecile(row)

  const invalidProperties = []

  if (lsoaCode2011 === undefined) {
    invalidProperties.push('LSOA code')
  }

  if (indexOfMultipleDeprivationDecile === undefined) {
    invalidProperties.push('Decile')
  }

  if (invalidProperties.length === 0) {
    importLog.totalRows++
    importLog.rows.push({ lsoaCode2011, indexOfMultipleDeprivationDecile })
  } else {
    importLog.totalRejected++
    importLog.rejected.push({ idx, invalidProperties })
  }
}

function findLsoaCode (row) {
  // Column A
  const csvKey = 'LSOA code (2011)'
  const value = row[csvKey]
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
}

function findDecile (row) {
  // Column G
  const csvKey = 'Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)'
  const value = row[csvKey]
  if (!isNaN(parseInt(value))) {
    return value
  }
}
