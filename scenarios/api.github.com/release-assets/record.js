module.exports = releaseAssets

const fs = require('fs')
const pathResolve = require('path').resolve

const urlTemplate = require('url-template')

const env = require('../../../lib/env')
const getTemporaryRepository = require('../../../lib/temporary-repository')

async function releaseAssets (state) {
  let error
  // create a temporary repository
  const temporaryRepository = getTemporaryRepository({
    request: state.request,
    token: env.FIXTURES_USER_A_TOKEN_FULL_ACCESS,
    org: 'octokit-fixture-org',
    name: 'release-assets'
  })

  await temporaryRepository.create()

  try {
    // https://developer.github.com/v3/repos/contents/#create-a-file
    // (this request gets ignored, we need an existing commit before creating a release)
    const {data: {commit: {sha}}} = await state.request({
      method: 'put',
      url: `/repos/octokit-fixture-org/${temporaryRepository.name}/contents/README.md`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`,
        'X-Octokit-Fixture-Ignore': 'true'
      },
      data: {
        message: 'initial commit',
        content: Buffer.from('# create-status').toString('base64')
      }
    })

    // https://developer.github.com/v3/repos/releases/#create-a-release
    // (this request gets ignored, it will create our test release)
    const {data: {id: releaseId, upload_url}} = await state.request({
      method: 'post',
      url: `/repos/octokit-fixture-org/${temporaryRepository.name}/releases`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`,
        'X-Octokit-Fixture-Ignore': 'true'
      },
      data: {
        tag_name: 'v1.0.0',
        name: 'Version 1.0.0',
        body: 'Initial release',
        target_commitish: sha
      }
    })

    // https://developer.github.com/v3/repos/releases/#upload-a-release-asset
    // upload attachment to release URL returned by create release request
    const FILE_NAME = 'test-upload.txt'
    const filePath = pathResolve(__dirname, FILE_NAME)
    const url = urlTemplate.parse(upload_url).expand({
      name: FILE_NAME,
      label: 'test'
    })
    const size = fs.statSync(filePath).size
    await state.request({
      method: 'post',
      url: url,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`,
        'Content-Type': 'text/plain',
        'Content-Length': size
      },
      data: fs.createReadStream(filePath)
    })

    // https://developer.github.com/v3/repos/releases/#list-assets-for-a-release
    // list assets for release
    const {data: [{id: assetId}]} = await state.request({
      method: 'get',
      url: `/repos/octokit-fixture-org/${temporaryRepository.name}/releases/${releaseId}/assets`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`
      }
    })

    // https://developer.github.com/v3/repos/releases/#get-a-single-release-asset
    // get single release asset
    await state.request({
      method: 'get',
      url: `/repos/octokit-fixture-org/${temporaryRepository.name}/releases/assets/${assetId}`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`
      }
    })

    // https://developer.github.com/v3/repos/releases/#get-a-single-release-asset
    // Edit name / label of release asset
    await state.request({
      method: 'patch',
      url: `/repos/octokit-fixture-org/${temporaryRepository.name}/releases/assets/${assetId}`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`
      },
      data: {
        label: 'new label'
      }
    })

    // https://developer.github.com/v3/repos/releases/#delete-a-release-asset
    // delete a release asset
    await state.request({
      method: 'delete',
      url: `/repos/octokit-fixture-org/${temporaryRepository.name}/releases/assets/${assetId}`,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${env.FIXTURES_USER_A_TOKEN_FULL_ACCESS}`
      }
    })
  } catch (_error) {
    error = _error
  }

  // await temporaryRepository.delete()

  if (error) {
    return Promise.reject(error)
  }
}
