/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')

describe('data import', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  const STATE_MACHINE_NAME = 'dclg_refreshFromCsvFile_1_0'

  let tymlyService
  let statebox
  let client

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('should startup tymly', async () => {
    const tymlyServices = await tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-pg-plugin'),
          path.resolve(__dirname, '../node_modules/@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      }
    )

    tymlyService = tymlyServices.tymly
    statebox = tymlyServices.statebox
    client = tymlyServices.storage.client
  })

  it('create and populate the dclg.imd table', async () => {
    const executionDescription = await statebox.startExecution(
      {
        sourceDir: path.resolve(__dirname, './fixtures/input')
      }, // input
      STATE_MACHINE_NAME, // state machine name
      {
        sendResponse: 'COMPLETE'
      } // options
    )

    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(executionDescription.currentStateName).to.eql('ImportingCsvFiles')
  })

  it('verify data in the table', async () => {
    const result = await client.query(
      'select lsoa_code_2011, lsoa_name_2011, local_authority_district_code_2013, local_authority_district_name_2013 ' +
      'index_of_multiple_deprivation_score, index_of_multiple_deprivation_rank, index_of_multiple_deprivation_decile, ' +
      'income_score, income_rank, income_decile, employment_score, employment_rank, employment_decile, ' +
      'education_skills_and_training_score, education_skills_and_training_rank, education_skills_and_training_decile, ' +
      'health_deprivation_and_disability_score, health_deprivation_and_disability_rank, health_deprivation_and_disability_decile, ' +
      'crime_score, crime_rank, crime_decile, barriers_to_housing_and_services_score, barriers_to_housing_and_services_rank, ' +
      'barriers_to_housing_and_services_decile, living_environment_score, living_environment_rank, living_environment_decile, ' +
      'income_deprivation_affecting_children_index_score, income_deprivation_affecting_children_index_rank, ' +
      'income_deprivation_affecting_children_index_decile, income_deprivation_affecting_older_people_score, ' +
      'income_deprivation_affecting_older_people_rank, income_deprivation_affecting_older_people_decile, ' +
      'children_and_young_people_subdomain_score, children_and_young_people_subdomain_rank, ' +
      'children_and_young_people_subdomain_decile, adult_skills_subdomain_score, adult_skills_subdomain_rank, ' +
      'adult_skills_subdomain_decile, geographical_barriers_subdomain_score, geographical_barriers_subdomain_rank, ' +
      'geographical_barriers_subdomain_decile, wider_barriers_subdomain_score, wider_barriers_subdomain_rank, ' +
      'wider_barriers_subdomain_decile, indoors_subdomain_score, indoors_subdomain_rank, indoors_subdomain_decile, ' +
      'outdoors_subdomain_score, outdoors_subdomain_rank, outdoors_subdomain_decile, total_population_mid_2012, ' +
      'dependent_children_aged_015_mid_2012, population_aged_1659_mid_2012, older_population_aged_60_and_over_mid_2012, ' +
      'working_age_population_185964 from dclg.imd order by lsoa_code_2011;'
    )

    expect(result.rowCount).to.eql(9)
    expect(result.rows[0].lsoa_code_2011).to.eql('1234567890')
    expect(result.rows[2].lsoa_code_2011).to.eql('1234567892')
    expect(result.rows[7].lsoa_code_2011).to.eql('1234567897')
  })

  it('clean up the table', async () => {
    const result = await client.query(
      'DELETE FROM dclg.imd WHERE lsoa_code_2011::text LIKE \'123456789%\';'
    )

    expect(result.rowCount).to.eql(9)
  })

  it('verify empty table', async () => {
    const result = await client.query(
      'select * from dclg.imd;'
    )

    expect(result.rows).to.eql([])
  })

  after('shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
