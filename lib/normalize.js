module.exports = normalize

const env = require('./env')
const headers = require('./headers')

function normalize (fixture) {
  // fixture.rawHeaders is an array in the form of ['key1', 'value1', 'key2', 'value2']
  // But the order of these can change, e.g. between local tests and CI on Travis.
  // That’s why we turn them into an object before storing the fixtures and turn
  // them back into an array before loading
  fixture.headers = headers.toObject(fixture.rawHeaders)
  delete fixture.rawHeaders

  // set all dates to Universe 2017 Keynote time
  setIfExists(fixture.response, 'created_at', '2017-10-10T16:00:00Z')
  setIfExists(fixture.response, 'updated_at', '2017-10-10T16:00:00Z')
  setIfExists(fixture.response, 'pushed_at', '2017-10-10T16:00:00Z')
  setIfExists(fixture.headers, 'date', 'Tue, 10 Oct 2017 16:00:00 GMT')
  setIfExists(fixture.headers, 'last-modified', 'Tue, 10 Oct 2017 16:00:00 GMT')
  setIfExists(fixture.headers, 'x-ratelimit-reset', '1507651200000')

  // set all counts to 42
  setIfExists(fixture.response, 'forks', 42)
  setIfExists(fixture.response, 'forks_count', 42)
  setIfExists(fixture.response, 'open_issues_count', 42)
  setIfExists(fixture.response, 'open_issues', 42)
  setIfExists(fixture.response, 'network_count', 42)
  setIfExists(fixture.response, 'stargazers_count', 42)
  setIfExists(fixture.response, 'subscribers_count', 42)
  setIfExists(fixture.response, 'watchers', 42)
  setIfExists(fixture.response, 'watchers_count', 42)

  // Set remaining rate limit to 59 for unauthenticated accounts and
  // to 4999 to authenticated accounts
  const rateLimitRemaining = parseInt(fixture.headers['x-ratelimit-limit'], 10)
  setIfExists(fixture.headers, 'x-ratelimit-remaining', String(rateLimitRemaining - 1))

  // zerofy random stuff
  setIfExists(fixture.headers, 'etag', '"00000000000000000000000000000000"')
  setIfExists(fixture.headers, 'x-runtime-rack', '0.000000')
  setIfExists(fixture.headers, 'x-github-request-id', '0000:00000:0000000:0000000:00000000')

  // zerofy auth token (if present)
  if (fixture.reqheaders.authorization) {
    fixture.reqheaders.authorization = fixture.reqheaders.authorization.replace(/^token \w{40}$/, 'token 0000000000000000000000000000000000000000')
  } else {
    // otherwise add authorization to "badheaders" to help with matching the
    // right fixture to the right request
    fixture.badheaders = ['authorization']
  }

  // workaround for https://github.com/gr2m/octokit-fixtures/issues/3
  if (env.FIXTURES_PROXY) {
    fixture.scope = 'https://api.github.com:443'
    fixture.reqheaders.host = 'api.github.com'
    delete fixture.headers['x-powered-by']
  }

  // leave out headers that tend to change on different environments
  delete fixture.headers['accept-ranges']
  delete fixture.headers.region
  delete fixture.headers.server
  delete fixture.headers.vary

  // update content length
  fixture.headers['content-length'] = String(JSON.stringify(fixture.response).length)

  return fixture
}

function setIfExists (object, key, value) {
  if (key in object) {
    object[key] = value
  }
}