#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./production/deploy.sh build   [dockerhub_user] [tag]
#   ./production/deploy.sh push    [dockerhub_user] [tag]
#   ./production/deploy.sh run     [dockerhub_user] [tag] [host_port]
#   ./production/deploy.sh publish [dockerhub_user] [tag]            # multi-arch push (amd64+arm64)
#   ./production/deploy.sh deploy  [dockerhub_user] [tag]            # build and push <tag> and latest
#   ./production/deploy.sh stop                                      # stop/remove running container
#
# dockerhub_user resolution order:
#   1) CLI arg
#   2) $DOCKERHUB_USER env var
#   3) DEFAULT_DOCKERHUB_USER in this script

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
APP_DIR="$ROOT_DIR"
PROD_DIR="$ROOT_DIR/production"
DOCKERFILE_PATH="$PROD_DIR/Dockerfile"

# Set your default Docker Hub username here (optional)
DEFAULT_DOCKERHUB_USER="jonayed320"

cmd=${1:-}
user=${2:-}
tag=${3:-latest}
port=${4:-8080}

resolve_user() {
  if [[ -n "${user}" ]]; then return; fi
  if [[ -n "${DOCKERHUB_USER:-}" ]]; then user="$DOCKERHUB_USER"; fi
  if [[ -z "${user}" ]]; then user="$DEFAULT_DOCKERHUB_USER"; fi
  if [[ -z "${user}" ]]; then
    echo "Docker Hub username not provided. Pass it as an argument, export DOCKERHUB_USER, or set DEFAULT_DOCKERHUB_USER inside this script." >&2
    exit 1
  fi
}

build_image() {
  resolve_user
  local image="$user/fiverr-copilot:$tag"
  echo "Building image: $image"
  docker build -t "$image" -f "$DOCKERFILE_PATH" "$APP_DIR"
}

push_image() {
  resolve_user
  local image="$user/fiverr-copilot:$tag"
  echo "Pushing image: $image"
  docker push "$image"
}

run_container() {
  resolve_user
  local image="$user/fiverr-copilot:$tag"
  echo "Running container on port $port"
  # Pull if the image is not present locally
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Image $image not found locally. Pulling..."
    docker pull "$image"
  fi
  # Remove existing container quietly if present
  docker rm -f fiverr-copilot >/dev/null 2>&1 || true
  docker run -d --name fiverr-copilot -p "$port":80 --restart unless-stopped "$image"
}

publish_multiarch() {
  resolve_user
  local image="$user/fiverr-copilot:$tag"
  echo "Publishing multi-arch image: $image"
  docker buildx create --name fiverrcopilotbuilder --use || true
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t "$image" -f "$DOCKERFILE_PATH" "$APP_DIR" --push
}

deploy_build_and_push() {
  resolve_user
  local image_ver="$user/fiverr-copilot:$tag"
  local image_latest="$user/fiverr-copilot:latest"
  echo "Building images: $image_ver and $image_latest"
  docker build -t "$image_ver" -t "$image_latest" -f "$DOCKERFILE_PATH" "$APP_DIR"
  echo "Pushing: $image_ver"
  docker push "$image_ver"
  echo "Pushing: $image_latest"
  docker push "$image_latest"
}

stop_container() {
  echo "Stopping container: fiverr-copilot"
  if docker rm -f fiverr-copilot >/dev/null 2>&1; then
    echo "Stopped."
  else
    echo "Container not running."
  fi
}

case "$cmd" in
  build)
    build_image ;;
  push)
    push_image ;;
  run)
    run_container ;;
  publish)
    publish_multiarch ;;
  deploy)
    deploy_build_and_push ;;
  stop)
    stop_container ;;
  *)
    echo "Unknown command: $cmd" >&2
    echo "Commands: build, push, run, publish, deploy, stop" >&2
    exit 1 ;;
esac

echo "Done."


