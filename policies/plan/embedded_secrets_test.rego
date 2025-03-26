package plan
import rego.v1

empty(value) if {
	count(value) == 0
}

no_violations if {
	count(deny) == 0
}

no_warnings if {
  count(warn) == 0
}

test_blank_input if {
  no_warnings with input as {}
  no_violations with input as {}
}

test_unrelated_vault_resource if {
  cfg := {
		"resource_changes": [
      {
        "address": "vault_auth_backend.aws",
        "mode": "managed",
        "type": "vault_auth_backend",
        "name": "aws",
        "provider_name": "vault",
      },
    ]
  }
	count(warn) == 0 with input as cfg
	count(deny) == 0 with input as cfg
}

test_raw_endpoints if {
  cfg := {
		"resource_changes": [
      {
        "address": "vault_generic_endpoint.aws",
        "mode": "managed",
        "type": "vault_generic_endpoint",
        "name": "aws",
        "provider_name": "vault",
      },
    ]
  }
	not no_warnings with input as cfg
	no_violations with input as cfg
}

test_kv_secrets_setting if {
  cfg := {
		"resource_changes": [
      {
        "address": "vault_kv_secret.fizz",
        "mode": "managed",
        "type": "vault_kv_secret",
        "name": "fizz",
        "provider_name": "vault",
      },
    ]
  }
	no_warnings with input as cfg
	not no_violations with input as cfg
}

test_kv_secrets_backend if {
  cfg := {
		"resource_changes": [
      {
        "address": "vault_kv_secret_backend_v2.fizz",
        "mode": "managed",
        "type": "vault_kv_secret_backend_v2",
        "name": "fizz",
        "provider_name": "vault",
      },
    ]
  }
	no_warnings with input as cfg
	no_violations with input as cfg
}
