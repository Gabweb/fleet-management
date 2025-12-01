#!/bin/bash

# Check if there is at least one argument
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 method [params] [jq_options]"
  exit 1
fi

# Store the first argument in a vaKriable
arg1="$1"

# Set default values
DEFAULT_PARAMS="{}"
DEFAULT_JQ_OPTIONS="."
arg2="${2:-$DEFAULT_PARAMS}"
arg3="${3:-$DEFAULT_JQ_OPTIONS}"

echo $arg1 $arg2

curl --location "http://localhost:7011/rpc/$arg1" \
    --silent \
    --header 'Content-Type: application/json' \
    --data $arg2 | jq $arg3