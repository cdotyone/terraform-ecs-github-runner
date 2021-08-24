import { EC2, SSM } from 'aws-sdk';

export interface RunnerInfo {
  instanceId: string;
  launchTime?: Date;
  repo?: string;
  org?: string;
}

export interface ListRunnerFilters {
  runnerType?: 'Org' | 'Repo';
  runnerOwner?: string;
  environment?: string;
}

export interface RunnerInputParameters {
  runnerServiceConfig: string;
  environment: string;
  runnerType: 'Org' | 'Repo';
  runnerOwner: string;
  runnerLabels: string;
  runnerGroup: string;
  runnerToken: string;
  runnerUrl: string
}

export async function listRunners(filters: ListRunnerFilters | undefined = undefined): Promise<RunnerInfo[]> {
  const ec2 = new EC2();
  const ec2Filters = [
    { Name: 'tag:Application', Values: ['github-action-runner'] },
    { Name: 'instance-state-name', Values: ['running', 'pending'] },
  ];
  if (filters) {
    if (filters.environment !== undefined) {
      ec2Filters.push({ Name: 'tag:Environment', Values: [filters.environment] });
    }
    if (filters.runnerType && filters.runnerOwner) {
      ec2Filters.push({ Name: `tag:${filters.runnerType}`, Values: [filters.runnerOwner] });
    }
  }
  const runningInstances = await ec2.describeInstances({ Filters: ec2Filters }).promise();
  const runners: RunnerInfo[] = [];
  if (runningInstances.Reservations) {
    for (const r of runningInstances.Reservations) {
      if (r.Instances) {
        for (const i of r.Instances) {
          runners.push({
            instanceId: i.InstanceId as string,
            launchTime: i.LaunchTime,
            repo: i.Tags?.find((e) => e.Key === 'Repo')?.Value,
            org: i.Tags?.find((e) => e.Key === 'Org')?.Value,
          });
        }
      }
    }
  }
  return runners;
}

export async function terminateRunner(runner: RunnerInfo): Promise<void> {
  const ec2 = new EC2();
  await ec2
    .terminateInstances({
      InstanceIds: [runner.instanceId],
    })
    .promise();
  console.debug('Runner terminated.' + runner.instanceId);
}

export async function createRunner(runnerParameters: RunnerInputParameters, launchTemplateName: string): Promise<void> {
  console.debug('Runner configuration: ' + JSON.stringify(runnerParameters));

  const ssm = new SSM();
  await ssm
    .putParameter({
      Name: '/action_runners/'+runnerParameters.environment + '/github-token',
      Value: runnerParameters.runnerToken,
      Type: 'SecureString',
      Overwrite: true
    })
    .promise();

  if(runnerParameters.runnerGroup==="") runnerParameters.runnerGroup = "Default";

  await ssm
      .putParameter({
        Name: '/action_runners/'+runnerParameters.environment + '/github-group',
        Value: runnerParameters.runnerGroup,
        Type: 'SecureString',
        Overwrite: true
      })
      .promise();

  if(runnerParameters.runnerLabels==="") runnerParameters.runnerLabels = "node";
  await ssm
      .putParameter({
        Name: '/action_runners/'+runnerParameters.environment + '/github-labels',
        Value: runnerParameters.runnerLabels,
        Type: 'SecureString',
        Overwrite: true
      })
      .promise();

  await ssm
      .putParameter({
        Name: '/action_runners/'+runnerParameters.environment + '/github-url',
        Value: runnerParameters.runnerUrl,
        Type: 'SecureString',
        Overwrite: true
      })
      .promise();
}

function getInstanceParams(
  launchTemplateName: string,
  runnerParameters: RunnerInputParameters,
): EC2.RunInstancesRequest {
  return {
    MaxCount: 1,
    MinCount: 1,
    LaunchTemplate: {
      LaunchTemplateName: launchTemplateName,
      Version: '$Default',
    },
    SubnetId: getSubnet(),
    TagSpecifications: [
      {
        ResourceType: 'instance',
        Tags: [
          { Key: 'Application', Value: 'github-action-runner' },
          {
            Key: runnerParameters.runnerType,
            Value: runnerParameters.runnerOwner,
          },
        ],
      },
    ],
  };
}

function getSubnet(): string {
  const subnets = process.env.SUBNET_IDS.split(',');
  return subnets[Math.floor(Math.random() * subnets.length)];
}
