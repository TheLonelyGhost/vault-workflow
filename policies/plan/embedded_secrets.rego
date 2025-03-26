package plan
import rego.v1

deny_list := [
  "vault_generic_secret",
  "vault_kv_secret",
  "vault_kv_secret_v2",
]

warning_list := [
  "vault_generic_endpoint",
]

# check_resources(resources, monitored_resources) if {
#   resources[_].type in monitored_resources
#   # startswith(resources[_].type, disallowed_resources[_])
# }

deny contains msg if {
  # check_resources(input.resource_changes, deny_list)
  # banned := concat(", ", deny_list)
  some resource in input.resource_changes
  resource.type in deny_list
  msg := sprintf("Terraform plan will change one of the following prohibited resource type: %v", resource.type)
}

warn contains msg if {
  # check_resources(input.resource_changes, warning_list)
  # dangerous := concat(", ", warning_list)
  # msg := sprintf("Terraform plan will change one or more of the following restricted resources: %v", [dangerous])
  some resource in input.resource_changes
  resource.type in warning_list
  msg := sprintf("Terraform plan will change one of the following dangerous resource type: %v", resource.type)
}
