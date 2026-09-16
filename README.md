#Distributed Notification/Event Processing System

## 1. Overview

This project is a distributed notification and event processing system built with Node.js, Express.js, MongoDB, Redis, and BullMQ.

The system accepts notification requests through a REST API, stores notification data in MongoDB, and places processing jobs into a Redis-backed BullMQ queue. Dedicated worker processes consume these jobs and process them asynchronously.

The system is designed with reliability and fault tolerance in mind. It includes automatic retries with exponential backoff, a dead-letter queue (DLQ) for permanently failed jobs, idempotency protection against duplicate requests, per-client rate limiting, structured logging, health checks, metrics, graceful shutdown, and Docker Compose-based deployment.

The project was built to understand how real-world backend systems handle asynchronous processing, failures, retries, distributed workers, queues, and service dependencies rather than functioning as a simple CRUD application.

## 2. Problem Statement

Traditional notification APIs often perform the entire notification-processing operation during the API request itself. This can make the API slower, tightly couple request handling with processing, and make the system harder to recover when a notification service fails.

This project addresses that problem by separating **request acceptance** from **notification processing**.

When a client submits a notification, the API validates and stores the request, then places a lightweight job into a message queue. A separate worker processes the job asynchronously. If processing fails, BullMQ automatically retries the job using exponential backoff. Jobs that continue to fail after all retry attempts are moved to a dead-letter queue for later inspection or recovery.

The system also needs to handle practical backend concerns such as duplicate requests, excessive requests from a client, service failures, multiple workers, monitoring, and controlled shutdowns.

The goal is therefore to build a small but realistic distributed backend system that demonstrates how asynchronous processing and reliability mechanisms can be implemented together.

## 3. Features

- REST API for creating and monitoring notifications
- MongoDB persistence using Mongoose
- Redis-backed BullMQ job queue
- Separate worker process for asynchronous notification processing
- Configurable worker concurrency
- Automatic job retries
- Exponential backoff between retry attempts
- Dead-letter queue (DLQ) for permanently failed jobs
- Idempotency keys to prevent duplicate notification creation
- MongoDB unique-index protection for concurrent duplicate requests
- Per-client rate limiting
- Structured application logging
- Centralized Express error handling
- Redis and MongoDB dependency health checks
- Runtime metrics for processed jobs, failed jobs, retries, queue depth, and DLQ depth
- Graceful shutdown for API and worker processes
- Docker containerization
- Docker Compose orchestration for API, workers, Redis, and MongoDB
- Persistent Docker volumes for Redis and MongoDB data
- Failure and recovery testing for Redis, workers, retries, and DLQ behavior

## 4. Architecture

The system follows an asynchronous event-processing architecture:

```text
Client
  │
  ▼
Express REST API
  │
  ├──────────────► MongoDB
  │                 │
  │                 └── Source of truth
  │
  └──────────────► BullMQ
                    │
                    ▼
                  Redis
                    │
                    ▼
              Worker Process
                    │
              ┌─────┴─────┐
              │           │
          Success       Failure
              │           │
              ▼           ▼
           Metrics      Retry
                          │
                    Attempts exhausted
                          │
                          ▼
                         DLQ
```

### Main Components

**API Server**

Receives notification requests, validates idempotency keys, applies rate limiting, stores notifications in MongoDB, and creates BullMQ jobs.

**MongoDB**

Stores the notification records and acts as the primary source of truth for notification data.

**Redis**

Provides the infrastructure used by BullMQ and also stores runtime metrics and rate-limiting counters.

**BullMQ**

Provides reliable job queueing, retry handling, exponential backoff, and job management on top of Redis.

**Worker**

Runs separately from the API server and consumes notification jobs asynchronously. Multiple workers can process jobs concurrently.

**Dead-Letter Queue**

Stores jobs that continue to fail after all configured retry attempts, allowing them to be inspected or reprocessed later.

### Docker Architecture

The system is containerized using Docker Compose with four services:

```text
┌──────────────────────────────────────┐
│          Docker Compose              │
│                                      │
│  ┌───────┐  ┌────────┐  ┌────────┐  │
│  │  API  │  │ Worker │  │ Redis  │  │
│  └───┬───┘  └───┬────┘  └────────┘  │
│      │          │                    │
│      └──────────┼────────────────────┤
│                 │                    │
│             ┌───▼────┐               │
│             │ MongoDB│               │
│             └────────┘               │
└──────────────────────────────────────┘
```

Docker Compose provides service-to-service networking, while named volumes provide persistent storage for MongoDB and Redis data.

## 5. Tech Stack

| Technology         | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| **Node.js**        | Backend runtime                                              |
| **Express.js**     | REST API and middleware                                      |
| **MongoDB**        | Persistent notification storage                              |
| **Mongoose**       | MongoDB ODM and schema modeling                              |
| **Redis**          | Queue infrastructure, counters, and rate-limiting data       |
| **BullMQ**         | Asynchronous job queue, retries, backoff, and job management |
| **Docker**         | Application containerization                                 |
| **Docker Compose** | Multi-service orchestration                                  |
| **JavaScript**     | Application development                                      |
| **dotenv**         | Environment configuration                                    |

## 6. Project Structure

```text
NotificationSystem/
│
├── src/
│   ├── app.js
│   ├── worker.js
│   │
│   ├── config/
│   │   └── redis.js
│   │
│   ├── db/
│   │   └── db.js
│   │
│   ├── metrices/
│   │   └── metrices.js
│   │
│   ├── middleware/
│   │   ├── asynchandler.js
│   │   ├── error.middleware.js
│   │   └── ratelimiter.js
│   │
│   ├── models/
│   │   └── notification.model.js
│   │
│   ├── queue/
│   │   ├── notification.dlq.js
│   │   └── notification.queue.js
│   │
│   ├── routes/
│   │   ├── health.route.js
│   │   ├── metrices.routes.js
│   │   └── notification.route.js
│   │
│   └── utils/
│       └── logger.js
│
├── server.js
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .dockerignore
├── .gitignore
└── README.md
```
### Directory Responsibilities

- **`config/`** — External service configuration such as Redis.
- **`db/`** — MongoDB connection setup.
- **`models/`** — Mongoose data models.
- **`routes/`** — HTTP API endpoints.
- **`middleware/`** — Rate limiting, asynchronous error handling, and centralized error handling.
- **`queue/`** — BullMQ notification queue and dead-letter queue.
- **`metrices/`** — Runtime metrics collection and retrieval.
- **`utils/`** — Shared utilities such as structured logging.
- **`worker.js`** — Separate background worker responsible for processing queued notifications.
- **`app.js`** — Express application configuration and route registration.
- **`server.js`** - Application entry point; loads environment configuration, connects dependencies, starts the Express server, and handles graceful shutdown.

## 7. How the System Works

The system separates notification creation from notification processing.

1. **Client sends a notification request**
   - The client sends a `POST /notifications` request to the Express API.
   - An `Idempotency-Key` is required to prevent duplicate notification creation.

2. **API validates and stores the notification**
   - The API checks the rate limit for the client.
   - The notification is stored in MongoDB.
   - MongoDB acts as the source of truth for notification data.

3. **API creates a queue job**
   - After successful database creation, the API adds a lightweight job to the `notifications` BullMQ queue.
   - The job contains the notification ID and the data required by the worker.

4. **Redis stores the queue**
   - BullMQ uses Redis to store and manage queued jobs.
   - The API does not wait for the worker to finish processing before responding to the client.

5. **Worker processes the job**
   - A separate worker process consumes jobs from the queue.
   - Workers use concurrency of `3`, allowing multiple notifications to be processed simultaneously.

6. **Successful processing**
   - When processing succeeds, the job is completed.
   - Processing metrics are updated.

7. **Failed processing**
   - If processing fails, BullMQ retries the job.
   - The project uses `3` attempts with exponential backoff.

8. **Dead-letter queue**
   - If all retry attempts fail, the job is moved to the dead-letter queue (DLQ).
   - The failed job remains available for inspection instead of being silently lost.

9. **Monitoring and health checks**
   - `/metrics` exposes processed jobs, failed jobs, retry count, queue depth, and DLQ depth.
   - `/health/dependencies` reports MongoDB and Redis health.

10. **Graceful shutdown**
    - When the API or worker receives `SIGINT` or `SIGTERM`, it closes its active connections cleanly before exiting.

## 8. Reliability & Fault Tolerance

### 8. Reliability & Fault Tolerance

The system is designed to continue operating safely when individual components fail.

#### Retries with Exponential Backoff

Failed jobs are automatically retried up to 3 times. Exponential backoff increases the delay between retry attempts, reducing the pressure on a temporarily failing dependency.

#### Dead-Letter Queue

Jobs that fail after all retry attempts are moved to a separate DLQ. This prevents permanently failing jobs from being repeatedly processed and allows them to be inspected or handled later.

#### Worker Failure Recovery

The API and worker are separate processes. If the worker is unavailable, jobs remain in Redis and can be processed when the worker becomes available again.

#### Redis Failure Handling

The Redis client listens for runtime connection errors so that unexpected Redis failures do not cause the Node.js process to terminate because of an unhandled EventEmitter error.

#### Idempotency

The `Idempotency-Key` prevents duplicate notification creation. A unique MongoDB index provides an additional layer of protection against concurrent requests using the same key.

#### Rate Limiting

Requests are limited per client using Redis. This prevents a single client from continuously submitting requests and overwhelming the system.

#### Graceful Shutdown

The API closes Redis and MongoDB connections during shutdown, while workers close their BullMQ worker connections. This reduces the possibility of leaving active resources or partially handled work behind.

#### Failure Testing

The system was tested by intentionally stopping Redis, stopping the worker, forcing job failures, testing retries and DLQ behavior, and restarting services to verify recovery.

## 9. Idempotency

The notification API uses an `Idempotency-Key` to prevent the same request from creating multiple notification records.

The client must provide the key in the request header:

```http
Idempotency-Key: unique-request-id
```

When a request arrives:

1. The API checks whether the idempotency key already exists in MongoDB.
2. If it exists, the existing notification is returned instead of creating another notification.
3. If it does not exist, a new notification is created and queued for processing.
4. The `idempotencyKey` field has a unique MongoDB index.
5. A duplicate-key error (`11000`) is handled to protect against concurrent requests attempting to create the same notification simultaneously.

This provides protection at both the application level and database level.

The concurrency test verified that multiple simultaneous requests using the same idempotency key resulted in only one notification document being created.

## 10. Rate Limiting

The API implements per-client rate limiting using Redis.

Each client is identified using its `clientId`. Redis maintains a request counter for each client within a fixed time window.

Current configuration:

- **Limit:** 5 requests
- **Window:** 60 seconds
- **Storage:** Redis
- **Scope:** Per client

When a client sends a request:

1. The API increments the client's Redis counter.
2. A 60-second expiration is applied to the counter.
3. Requests within the limit are accepted.
4. Once the client exceeds 5 requests within the window, the API returns HTTP `429 Too Many Requests`.

The rate limiter was tested at the boundary: the first 5 requests were accepted and the 6th request was rejected with `429`.

Using Redis allows the rate-limit state to be shared between API instances rather than keeping the counter only in a single Node.js process.

## 11. Metrics & Observability

The system provides basic runtime metrics and structured logs to make the behavior of the distributed components easier to observe and debug.

#### Metrics

The `/metrics` endpoint exposes:

- `processedJobs` — number of successfully processed jobs
- `failedJobs` — number of jobs that exhausted their retry attempts
- `retryCount` — number of retry attempts
- `queueDepth` — number of jobs currently waiting in the notification queue
- `dlqDepth` — number of jobs currently present in the dead-letter queue

Metrics counters are stored in Redis.

Example:

```json
{
  "metrics": {
    "processedJobs": 13,
    "failedJobs": 3,
    "retryCount": 6,
    "queueDepth": 0,
    "dlqDepth": 3
  }
}
```

#### Health Checks

The `/health/dependencies` endpoint checks the availability of:

- MongoDB
- Redis

It returns HTTP `200` when both dependencies are healthy and HTTP `503` when a dependency is unavailable.

#### Structured Logging

The project uses a small structured logging utility that records:

- Log level
- Timestamp
- Message
- Relevant context such as process ID, job ID, retry count, and error information

This makes it easier to trace jobs across the API and worker processes and investigate failures.

#### Verification

Metrics were verified during normal processing, worker downtime, worker recovery, and failure/retry/DLQ testing. Queue depth increased when the worker was stopped and returned to zero after the worker resumed processing.

## 12. Docker & Deployment

The application is containerized using Docker and deployed locally using Docker Compose.

The system runs as four services:

- **API** — Express REST API
- **Worker** — BullMQ background worker
- **Redis** — queue, rate-limit state, and metrics storage
- **MongoDB** — persistent notification data

Docker Compose also uses named volumes for Redis and MongoDB so that container recreation does not automatically remove stored data.

#### Service Communication

Containers communicate using Docker Compose service names instead of `localhost`.

For example:

```text
API/Worker → redis:6379
API/Worker → mongo:27017
```

Inside a container, `localhost` refers to that container itself. Therefore, using `redis` and `mongo` as hostnames allows the services to communicate through the Docker Compose network.

#### Build and Start

Build the application image:

```bash
docker build -t notification-system .
```

Start the complete system:

```bash
docker compose up -d
```

Stop the services:

```bash
docker compose down
```

After changing application code, rebuild the image before starting the services again:

```bash
docker build -t notification-system .
docker compose up -d
```

The Docker setup was also tested through clean Compose shutdown and restart while retaining the named data volumes.

## 13. Failure Testing

The system was tested under several failure scenarios to verify that its reliability mechanisms work in practice.

| Scenario                       | Expected Behavior                                  | Result |
| ------------------------------ | -------------------------------------------------- | ------ |
| Redis stopped                  | API reports Redis errors without crashing          | PASS   |
| Worker stopped                 | New jobs remain in the BullMQ queue                | PASS   |
| Worker restarted               | Queued jobs are processed                          | PASS   |
| Job processing failure         | Job is retried automatically                       | PASS   |
| All retry attempts fail        | Job is moved to the DLQ                            | PASS   |
| Duplicate idempotency key      | Duplicate notification is not created              | PASS   |
| Concurrent duplicate requests  | MongoDB unique index prevents duplicates           | PASS   |
| Rate-limit boundary            | 6th request within the window returns `429`        | PASS   |
| Metrics during worker downtime | Queue depth increases                              | PASS   |
| Metrics after worker recovery  | Queue depth returns to `0`                         | PASS   |
| Docker clean restart           | All services start and dependencies become healthy | PASS   |

The failure tests were performed by intentionally stopping services and introducing controlled job failures rather than assuming that the reliability mechanisms worked.

The retry/DLQ test confirmed that a failed job was attempted three times, retried with exponential backoff, and then moved to the dead-letter queue.

The Redis failure test also exposed an important runtime issue: the Node.js Redis client needed an `error` event listener because later connection errors are emitted as EventEmitter events and are not handled by the initial `connect()` Promise alone.

After the fixes, the system recovered successfully from the tested failures.

## 14. API Endpoints

#### Create Notification

```http
POST /notifications
```

Creates a notification in MongoDB and adds a corresponding job to the BullMQ queue.

**Required header:**

```http
Idempotency-Key: unique-request-id
```

**Example request body:**

```json
{
  "type": "email",
  "clientId": "client-123",
  "recipient": "user@example.com",
  "message": "Hello from the notification system"
}
```

#### Metrics

```http
GET /metrics
```

Returns runtime processing metrics including processed jobs, failed jobs, retry count, queue depth, and DLQ depth.

#### Dependency Health

```http
GET /health/dependencies
```

Checks the health of MongoDB and Redis.

Returns `200` when dependencies are healthy and `503` when a dependency is unavailable.

#### Response Codes

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| `201`  | Notification created successfully                     |
| `200`  | Existing notification returned for an idempotency key |
| `400`  | Required request information is missing               |
| `429`  | Client exceeded the rate limit                        |
| `500`  | Internal server error                                 |
| `503`  | Required dependency is unhealthy                      |

## 15. How to Run

#### Prerequisites

Make sure the following are installed:

- Node.js
- Docker Desktop
- Git

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd NotificationSystem
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Build the Docker Image

```bash
docker build -t notification-system .
```

#### 4. Start the Services

```bash
docker compose up -d
```

This starts:

- API
- Worker
- Redis
- MongoDB

#### 5. Verify the Services

Check running containers:

```bash
docker compose ps
```

Check dependency health:

```http
GET /health/dependencies
```

The API should report MongoDB and Redis as healthy.

#### 6. Test the API

Send a `POST /notifications` request with an `Idempotency-Key` header and notification data.

The API stores the notification in MongoDB and adds the processing job to BullMQ.

#### 7. Check Metrics

```http
GET /metrics
```

This can be used to verify queue processing, retries, failures, and DLQ activity.

#### 8. Stop the System

```bash
docker compose down
```

Named volumes are retained, so MongoDB and Redis data are not removed by a normal Compose shutdown.

To remove the containers and their associated volumes:

```bash
docker compose down -v
```

## 16. What I Learned

Building this project helped me understand how backend systems behave beyond basic REST APIs and database operations.

Key concepts and lessons learned:

- **Asynchronous processing:** Separating API request handling from background processing using BullMQ and Redis.
- **Message queues:** Understanding how jobs are created, stored, consumed, retried, and completed.
- **Worker architecture:** Running background processing independently from the API.
- **Concurrency:** Processing multiple jobs simultaneously using BullMQ worker concurrency.
- **Reliability:** Designing for failures instead of assuming that external services will always be available.
- **Retries and backoff:** Using exponential backoff to handle temporary processing failures.
- **Dead-letter queues:** Preserving permanently failed jobs for inspection instead of losing them.
- **Idempotency:** Preventing duplicate operations, including handling concurrent requests using database-level uniqueness.
- **Rate limiting:** Using Redis to control request frequency on a per-client basis.
- **Observability:** Tracking queue depth, processed jobs, retries, failures, and DLQ contents.
- **Health checks:** Monitoring the availability of critical dependencies.
- **Graceful shutdown:** Closing database, Redis, and worker connections before process termination.
- **Docker:** Understanding images, containers, volumes, Compose services, and container networking.
- **Service discovery:** Learning why `localhost` inside a container is different from the host machine and why Compose service names are used for communication.
- **Debugging distributed systems:** Using logs, Redis commands, Docker logs, metrics, and controlled failure tests to identify problems.
- **Runtime error handling:** Understanding the difference between handling a Promise rejection and handling an EventEmitter `error` event.

The project also reinforced an important engineering principle: reliability features should be tested through actual failure scenarios rather than only verified by reading the code.

## 17. Future Improvements

The current system demonstrates the core concepts of asynchronous processing and reliability. Possible improvements for a more production-oriented version include:

- Integrate real email, SMS, or push notification providers instead of simulated processing.
- Add authentication and authorization for API clients.
- Store notification status transitions in MongoDB so clients can track delivery state.
- Add an API endpoint for retrieving notification status.
- Add request validation using a dedicated validation library.
- Improve rate limiting with configurable limits and multiple time windows.
- Add Redis-based distributed locking where required.
- Add automated tests for routes, workers, queues, and failure scenarios.
- Add integration and end-to-end test suites.
- Replace the basic metrics implementation with Prometheus-compatible metrics.
- Add Grafana dashboards for system monitoring.
- Add centralized log aggregation.
- Add Docker health checks for all application services.
- Improve Docker image size and security using a production-oriented multi-stage build.
- Add CI/CD using GitHub Actions.
- Add horizontal API and worker scaling.
- Add notification priority and scheduled delivery.
- Add retry policies configurable per notification type or client.
- Add a mechanism to safely replay selected DLQ jobs.
- Add persistent notification delivery history and audit logs.
