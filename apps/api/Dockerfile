FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build
EXPOSE 4175
CMD ["bun", "run", "start:prod"]
