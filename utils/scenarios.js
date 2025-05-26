export const CONSTANT_RATE_TEST = {
    executor: 'constant-arrival-rate',
    duration: '1m',
    rate: 2,
    timeUnit: '1s',
    preAllocatedVUs: 2,
    maxVUs: 5,
}

export const SPIKE_TEST = {
    executor: 'ramping-arrival-rate',
    startRate: 0,
    timeUnit: '1m',
    preAllocatedVUs: 5,
    maxVUs: 8,
    stages: [
        { target: 360, duration: '1m' },
        { target: 0, duration: '30s' },
    ],
}

export const SMOKE_TEST = {
    executor: 'constant-vus',
    vus: 1,
    duration: '10s',
}