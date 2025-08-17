## Fiverr Copilot — Deployment Guide

### Quick start: run with Docker (no build needed)

```bash
docker pull jonayed320/fiverr-copilot:latest
docker run -d --name fiverr-copilot -p 8080:80 --restart unless-stopped jonayed320/fiverr-copilot:latest
```

- Open http://localhost:8080
- Stop and remove later:

```bash
docker rm -f fiverr-copilot
```

### Using the deploy.sh automation

Location: `production/deploy.sh`

#### Linux / macOS

```bash
cd app
chmod +x production/deploy.sh

# Deploy (build and push both :<tag> and :latest)
production/deploy.sh deploy   # uses DEFAULT_DOCKERHUB_USER or $DOCKERHUB_USER
# Or specify user/tag explicitly
production/deploy.sh deploy jonayed320 v1.0.0

# Run container locally (defaults: tag=latest, port=8080)
production/deploy.sh run
# Custom port
production/deploy.sh run "" latest 9090

# Stop container
production/deploy.sh stop
```

#### Windows

- Use Git Bash or WSL to run the `.sh` script:

```bash
cd app
chmod +x production/deploy.sh # only needed once in Git Bash/WSL
production/deploy.sh deploy jonayed320 v1.0.0
production/deploy.sh run
```

- Alternatively, run Docker directly from PowerShell (no script):

```powershell
docker pull jonayed320/fiverr-copilot:latest
docker run -d --name fiverr-copilot -p 8080:80 --restart unless-stopped jonayed320/fiverr-copilot:latest
```

### Configure your Docker Hub username

`production/deploy.sh` resolves the username in this order:
1) CLI argument
2) `$DOCKERHUB_USER` environment variable
3) `DEFAULT_DOCKERHUB_USER` set inside the script

Set once and forget:

```bash
export DOCKERHUB_USER=jonayed320  # add to your shell profile for persistence
```

Or edit inside the script:

```bash
# production/deploy.sh
DEFAULT_DOCKERHUB_USER="jonayed320"
```

### Other useful commands

- Build only:

```bash
production/deploy.sh build [user] [tag]
```

- Push only:

```bash
production/deploy.sh push [user] [tag]
```

- Multi-arch publish (amd64 + arm64):

```bash
production/deploy.sh publish [user] [tag]
```

### Directory layout

- `production/Dockerfile` — multi-stage build (Node → Nginx)
- `production/nginx.conf` — SPA routing + static caching
- `production/deploy.sh` — build/push/run/stop automation
- `.dockerignore` — trims build context

### Requirements

- Docker Engine / Docker Desktop
- Docker Hub account (for pushing images). Use an access token for `docker login` when possible.
