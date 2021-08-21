# Module - Download lambda artifacts

This module is optional and provides an option to download via Terraform the Lambda artifacts from GitHub.

## Usages

```
module "lambdas" {
  source = "<source location>"
  lambdas = [
    {
      name = "webhook"
      tag  = "v0.11.0"
    },
    {
      name = "runners"
      tag  = "v0.11.0"
    },
    {
      name = "runner-binaries-syncer"
      tag  = "v0.11.0"
    }
  ]
}
```

<!--- BEGIN_TF_DOCS --->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| null | n/a |

## Modules

No Modules.

## Resources

| Name |
|------|
| [null_resource](https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource) |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| lambdas | Name and tag for lambdas to download. | <pre>list(object({<br>    name = string<br>    tag  = string<br>  }))</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| files | n/a |
<!--- END_TF_DOCS --->