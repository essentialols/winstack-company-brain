# Triggerware server for Railway (sketch — verify the installer supports linux/amd64).
# Railway: new service, build context = repo root, Dockerfile path = apps/pipeline/triggerware/Dockerfile.
# The pipeline connects over Railway private networking: TRIGGERWARE_URL=<service>.railway.internal:5221
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates bash \
  && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://tw2-releases.s3.us-east-2.amazonaws.com/install.sh | sh \
  && curl -fsSL https://tw2-releases.s3.us-east-2.amazonaws.com/cli/install.sh | sh
ENV PATH="/root/.local/bin:/usr/local/bin:${PATH}"
EXPOSE 5221
# `triggerware start` may daemonize; if so, swap for the foreground form shown by `triggerware help`.
CMD ["sh", "-c", "triggerware start && tail -f /dev/null"]
