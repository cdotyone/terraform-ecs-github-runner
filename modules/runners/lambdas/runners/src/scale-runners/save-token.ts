import { SSM } from 'aws-sdk';
import { createOctoClient, createGithubAppAuth, createGithubInstallationAuth } from './gh-auth';

export interface ActionRequestMessage {
  id: number;
  eventType: 'check_run' | 'workflow_job';
  repositoryName: string;
  runnerOwner: string;
  installationId: number;
}

export const saveToken = async (): Promise<void> => {
  const runnerExtraLabels = process.env.RUNNER_EXTRA_LABELS || 'node';
  const runnerGroup = process.env.RUNNER_GROUP_NAME || 'Default';
  const environment = process.env.ENVIRONMENT;
  const runnerOwner = process.env.ORG_NAME as string;
  const kmsKeyId = process.env.KMS_KEY_ID;
  const ghesBaseUrl = process.env.GHES_URL;

  let ghesApiUrl = '';
  if (ghesBaseUrl) {
    ghesApiUrl = `${ghesBaseUrl}/api/v3`;
  }

  const ghAuth1 = await createGithubAppAuth(undefined, ghesApiUrl);
  const githubClient = await createOctoClient(ghAuth1.token, ghesApiUrl);
  const installationId = (
    await githubClient.apps.getOrgInstallation({
      org: runnerOwner,
    })
  ).data.id;

  const ghAuth = await createGithubInstallationAuth(installationId, ghesApiUrl);
  const githubInstallationClient = await createOctoClient(ghAuth.token, ghesApiUrl);

  // create token
  const registrationToken = await githubInstallationClient.actions.createRegistrationTokenForOrg({ org: runnerOwner });
  const token = registrationToken.data.token;

  let configBaseUrl = ghesBaseUrl ? ghesBaseUrl : 'https://github.com';
  configBaseUrl += '/' + runnerOwner;

  const ssm = new SSM();
  await ssm
    .putParameter({
      Name: '/actions_runner/' + environment + '/github-token',
      Value: token,
      Type: 'SecureString',
      Overwrite: true,
    })
    .promise();

  await ssm
    .putParameter({
      Name: '/actions_runner/' + environment + '/github-group',
      Value: runnerGroup,
      Type: 'SecureString',
      Overwrite: true,
    })
    .promise();

  await ssm
    .putParameter({
      Name: '/actions_runner/' + environment + '/github-labels',
      Value: runnerExtraLabels,
      Type: 'SecureString',
      Overwrite: true,
    })
    .promise();

  if (configBaseUrl === '' || configBaseUrl === null) configBaseUrl = 'https://github.com/' + runnerOwner;
  await ssm
    .putParameter({
      Name: '/actions_runner/' + environment + '/github-url',
      Value: configBaseUrl,
      Type: 'SecureString',
      Overwrite: true,
    })
    .promise();
};
