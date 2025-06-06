import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.5.0.1/index.js';
import { browser } from 'k6/browser';
import { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js';
import { Counter, Trend } from 'k6/metrics';
import tempo from 'https://jslib.k6.io/http-instrumentation-tempo/1.0.1/index.js';
import { DEFAULT_HEADERS, DEFAULT_TIMEOUT, LOCAL_URL } from '../utils/constants.js';
import { CONSTANT_RATE_TEST, SMOKE_TEST, SPIKE_TEST } from '../utils/scenarios.js';
import { check } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js';
import { generateUserDelay } from '../utils/frontTestUtils.js';
import { HomePage } from '../pages/homepage.js';

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

const ingredientsCounter = new Counter('ingredients_counter')
const pizzaCounter = new Counter('pizza_counter')
const userActionTime = new Trend('user_action_time', true)

export const options = {
    thresholds: {
        http_req_duration: ['p(95) < 200', 'p(99) < 500'],
        http_req_failed: ['rate<0.01']
    },
    scenarios: {
        smoke_scenario: {
            ...SMOKE_TEST,
            exec: 'backendTest'
        },
        constant_search: {
            ...CONSTANT_RATE_TEST,
            startTime: SMOKE_TEST.duration,
            exec: 'backendTest'
        },
        spiked_search: {
            ...SPIKE_TEST,
            startTime: SMOKE_TEST.duration,
            exec: 'backendTest'
        },
        frontend_scenario: {
            ...SMOKE_TEST,
            duration: '30s',
            exec: 'frontendTest',
            options: {
                browser: {
                    type: 'chromium',
                }
            }
        }
    }
}

export function backendTest() {
    describe('Get pizza suggestion', () => {
        describe('Should get a random pizza suggestion with default requirements', () => {

            const randomPizzaRequirements = JSON.stringify({
                maxCaloriesPerSlice: 1000,
                mustBeVegetarian: false,
                excludedIngredients: [],
                excludedTools: [],
                maxNumberOfToppings: 5,
                minNumberOfToppings: 2,
                customName: ""
            })

            const response = session.post(`/pizza`, randomPizzaRequirements, {
                tags: {
                    filterType: 'default'
                }
            })
            expect(response.status, 'response status').to.equal(200)

            pizzaCounter.add(1)

            const body = response.json()
            const ingredients = body.pizza.ingredients
            ingredients.forEach(ingredient => {
                ingredientsCounter.add(1, {
                    ingredientName : ingredient.name,
                })
            })
        })

        describe('Should get a pizza suggest with custom filters', () => {
            const filteredPizzaRequirements = {
                maxCaloriesPerSlice: 500,
                mustBeVegetarian: false,
                excludedIngredients: [],
                excludedTools: [
                    "Scissors"
                ],
                maxNumberOfToppings: 7,
                minNumberOfToppings: 1,
                customName: ""
            }

            const response = session.post(`/pizza`, JSON.stringify(filteredPizzaRequirements), {
                tags: {
                    filterType: 'custom'
                }
            })
            expect(response.status, 'response status').to.equal(200)

            expect(response.json().calories, 'calories').to.be.at.most(filteredPizzaRequirements.maxCaloriesPerSlice)
            
            expect(response.json().pizza.tool, 'tool used').to.not.contain.oneOf(filteredPizzaRequirements.excludedTools)

            expect(response.json().pizza.ingredients, 'ingredients').to.have.lengthOf.at.least(filteredPizzaRequirements.minNumberOfToppings)
            expect(response.json().pizza.ingredients, 'ingredients').to.have.lengthOf.at.most(filteredPizzaRequirements.maxNumberOfToppings)

            pizzaCounter.add(1)

            const ingredients = response.json().pizza.ingredients
            ingredients.forEach(ingredient => {
                ingredientsCounter.add(1, {
                    ingredientName : ingredient.name,
                })
            })

        })
    })
}

export async function frontendTest() {
    describe('Get pizza suggestion in the browser with POM', async () => {
        const page = await browser.newPage()
        const homePage = new HomePage(page)

        try {
            await homePage.goto()
            await page.evaluate(() => window.performance.mark('action-start'))

            const title = await homePage.getPageHeader()
            expect(title, 'page header').to.equal('Looking to break out of your pizza routine?')

            await generateUserDelay(page)

            await homePage.generateNewRecomendation()

            const recomendation = await homePage.getRecomendationDetails()
            expect(recomendation, 'pizza recomendation').to.be.a('string').and.not.be.empty
            
            await page.evaluate(() => window.performance.mark('action-finish'))

            const currentUserActionTime = await generateCurrentUserActionTime(page)
            userActionTime.add(currentUserActionTime)

        } finally {
            page.close()
        }
    })
}

/**
 * 
 * @param {import("k6/browser").Page} page 
 */
async function generateCurrentUserActionTime(page) {
    await page.evaluate(() => window.performance.measure('current-user-action-time', 'action-start', 'action-finish'))

    const currentUserActionTime = await page.evaluate(() => window.performance.getEntriesByName('current-user-action-time')[0].duration)
    return currentUserActionTime
}