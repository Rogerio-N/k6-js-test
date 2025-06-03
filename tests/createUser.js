import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'
import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.5.0.1/index.js'
import { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js'
import tempo from 'https://jslib.k6.io/http-instrumentation-tempo/1.0.1/index.js'
import { DEFAULT_HEADERS, DEFAULT_TIMEOUT, LOCAL_URL } from '../utils/constants.js'
import { CONSTANT_RATE_TEST, SMOKE_TEST, SPIKE_TEST } from '../utils/scenarios.js'
import http from 'k6/http'

const baseURL = __ENV.BASE_URL || LOCAL_URL

tempo.instrumentHTTP({
  propagator: 'w3c',
})

const session = new Httpx({
    baseURL: baseURL+'/api',
    headers: {
        ...DEFAULT_HEADERS
    },
    timeout: DEFAULT_TIMEOUT
})

export const options = {
    thresholds: {
        http_req_duration: ['p(95) < 300', 'p(99) < 500'],
        http_req_failed: ['rate<0.01']
    },
    scenarios: {
        smoke_scenario: {
            ...SMOKE_TEST
        },
        constant_search: {
            ...CONSTANT_RATE_TEST,
            startTime: SMOKE_TEST.duration
        },
        spiked_search: {
            ...SPIKE_TEST,
            startTime: SMOKE_TEST.duration
        }
    }
}

export default function () {
    describe('Create user', () => {
        describe('Should create a new user and be able to log in', () => {

            const newUserPayload = {
                username: randomString(16),
                password: randomString(16)
            }

            const createUserResponse = session.post('/users', JSON.stringify(newUserPayload), {
                tags: {
                    request_name: 'create_user'
                }
            })

            expect(createUserResponse.status, 'Create user response status').to.equal(201)

            const loginResponse = session.post('/users/token/login', JSON.stringify(newUserPayload), {
                tags: {
                    request_name: 'login_user'
                }
            })

            expect(loginResponse.status, 'Login response status').to.equal(200)
            expect(loginResponse.json().token, 'Login Token').to.be.a('string').and.not.empty
        })

        describe('Should fail to create a user with an existing username', () => {
            const existingUserPayload = {
                username: 'synthetics_multihttp_example',
                password: randomString(16)
            }

            const createUserResponse = session.post('/users', JSON.stringify(existingUserPayload), {
                responseCallback: http.expectedStatuses(400),
                tags: {
                    request_name: 'create_existing_user'
                }
            })

            expect(createUserResponse.status, 'Create existing user response status').to.equal(400)
            expect(createUserResponse.json().error, 'Error message').to.include('username already taken')
        })
    })
}