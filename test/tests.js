/* eslint-env mocha */

'use strict'

const chai = require('chai')
const expect = chai.expect
const path = require('path')
const tymly = require('@wmfs/tymly')
const process = require('process')
const runUpload = require('../functions/refresh-data-upload')()
const runImport = require('../functions/refresh-data-import')()

describe('IMD tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let bootedServices
  let tymlyService
  let client
  let imdModel
  let importLogModel
  let uploadResult

  const uploadEvent = {
    body: {
      upload: {
        serverFilename: path.join(__dirname, 'fixtures', 'imd.csv'),
        clientFilename: path.join(__dirname, 'fixtures', 'imd.csv')
      }
    },
    importDirectory: path.join(__dirname, 'fixtures', 'output')
  }

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('startup tymly', async () => {
    const tymlyServices = await tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-test-helpers/plugins/mock-solr-plugin'),
          require.resolve('@wmfs/tymly-test-helpers/plugins/mock-rest-client-plugin'),
          require.resolve('@wmfs/tymly-test-helpers/plugins/mock-os-places-plugin'),
          require.resolve('@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin'),
          require.resolve('@wmfs/tymly-cardscript-plugin'),
          path.join(__dirname, '../../../plugins/tymly-cardscript-plugin'),
          require.resolve('@wmfs/tymly-pg-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      }
    )

    bootedServices = tymlyServices
    tymlyService = tymlyServices.tymly
    client = tymlyServices.storage.client
    imdModel = tymlyServices.storage.models.dclg_imd
    importLogModel = tymlyServices.storage.models.dclg_importLog
  })

  it('should run the state machine to upload the CSV file', async () => {
    uploadResult = await runUpload(uploadEvent)

    expect(uploadResult.totalRows).to.eql(8)
    expect(uploadResult.uploadWarning).to.eql('8 rows to be uploaded but 2 rows were rejected (see below).')
    expect(uploadResult.totalRejected).to.eql(2)

    expect(uploadResult.rejected[0].idx).to.eql(6)
    expect(uploadResult.rejected[0].rejectionReasons).to.eql(['LSOA code (2011) is not provided.'])

    expect(uploadResult.rejected[1].idx).to.eql(10)
    expect(uploadResult.rejected[1].rejectionReasons).to.eql(['Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs) must be an integer.'])
  })

  it('should run the state machine to import the uploaded data', async () => {
    await runImport(uploadResult, { bootedServices }, {})
  })

  it('should check the imported data log', async () => {
    const rows = await importLogModel.find({})

    expect(rows.length).to.eql(1)

    expect(rows[0].totalRowsInserted).to.eql(8)
    expect(rows[0].totalRowsRejected).to.eql(2)
    expect(rows[0].totalRows).to.eql(8)
  })

  it('should check the imported data', async () => {
    const rows = await imdModel.find({ orderBy: ['lsoaCode2011'] })

    expect(rows.length).to.eql(8)

    expect(rows[0].lsoaCode2011).to.eql('E01000003')
    expect(rows[0].indexOfMultipleDeprivationDecile).to.eql(5)

    expect(rows[7].lsoaCode2011).to.eql('E01033768')
    expect(rows[7].indexOfMultipleDeprivationDecile).to.eql(1)
  })

  after('clean up the tables', async () => {
    await client.query('DROP SCHEMA tymly CASCADE;')
    await client.query('DROP SCHEMA dclg CASCADE;')
  })

  after('shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
